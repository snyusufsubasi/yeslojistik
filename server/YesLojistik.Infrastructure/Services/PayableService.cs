using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public enum PayableKind { Opening, Trip, Expense, Invoice }

/// <summary>Tedarikçiye borç kalemi ve (ödemeler dağıtıldıktan sonra) kalan tutarı.</summary>
public record PayableItem(int SupplierId, PayableKind Kind, int? TripId, int? ExpenseId, DateOnly Date, DateOnly DueDate, decimal Total,
    decimal Paid, decimal Remaining, string Reference, string Description, int? PurchaseInvoiceId = null);

/// <summary>
/// Tedarikçi (taşeron) borçları. Borç saklanmaz, hesaplanır (müşteri carisiyle aynı kural):
/// Borç = devir + faturası gelmemiş (yüklenmiş/yoldaki/teslim edilmiş) taşeron seferlerinin KDV dahil tutarı + alınan faturalar
/// + vadeli giderler; Alacak = ödemeler. "Faturadan düş" komisyonu seferin ya da bağlı olduğu faturanın borcundan düşülür.
/// Sefere bağlı ödeme önce o seferi (sefer faturalandıysa faturayı), kalanlar eskiden yeniye (FIFO) borçları kapatır.
/// </summary>
public class PayableService(AppDbContext db)
{
    /// <summary>Borç doğuran sefer durumları: planlanmış ve iptal edilmiş seferler borç doğurmaz.</summary>
    public static readonly TripStatus[] AccruingStatuses = [TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered];

    /// <summary>Alınan faturaların dağıtım anahtarı (seferlerle ve giderlerle çakışmasın).</summary>
    private const int InvoiceKeyBase = 1_000_000_000;

    public static string TripRef(int tripId) => $"S-{tripId:D6}";
    public static string PaymentRef(int id) => $"Ö-{id:D6}";

    private record TripRow(int Id, int SupplierId, DateOnly LoadingDate, DateOnly? DeliveryDate, decimal VehicleCost, decimal CostVatRate,
        int? CostWithholdingTenths, decimal Commission, CommissionStatus CommissionStatus, int? PurchaseInvoiceId, string LoadingAddress,
        string DeliveryAddress, string Plate, string? ExternalRef)
    {
        public decimal Deducted => CommissionStatus == CommissionStatus.DeductFromInvoice ? Commission : 0;
        public decimal Payable => Trip.CarrierPayable(VehicleCost, CostVatRate, CostWithholdingTenths) - Deducted;
    }

    private record InvoiceRow(int Id, int SupplierId, string InvoiceNo, DateOnly Date, DateOnly? DueDate, decimal Total, PurchaseInvoiceKind Kind);

    private async Task<List<TripRow>> TripsAsync(IReadOnlyCollection<int> ids, CancellationToken ct) =>
        await db.Trips.AsNoTracking().Where(t => !t.IsLegacy && t.CarrierSupplierId != null && ids.Contains(t.CarrierSupplierId.Value) && AccruingStatuses.Contains(t.Status))
            .Select(t => new TripRow(t.Id, t.CarrierSupplierId!.Value, t.LoadingDate, t.DeliveryDate, t.VehicleCost, t.CostVatRate, t.CostWithholdingTenths,
                t.Commission, t.CommissionStatus, t.PurchaseInvoiceId, t.LoadingAddress, t.DeliveryAddress, t.Vehicle.Plate, t.ExternalRef))
            .ToListAsync(ct);

    private async Task<List<InvoiceRow>> InvoicesAsync(IReadOnlyCollection<int> ids, CancellationToken ct) =>
        await db.PurchaseInvoices.AsNoTracking().Where(p => !p.IsCancelled && ids.Contains(p.SupplierId))
            .Select(p => new InvoiceRow(p.Id, p.SupplierId, p.InvoiceNo, p.Date, p.DueDate, p.Total, p.Kind)).ToListAsync(ct);

    /// <summary>Tedarikçi başına bakiye (firmanın ödemesi gereken; negatifse fazla ödeme).</summary>
    public async Task<Dictionary<int, decimal>> BalancesAsync(IEnumerable<int> supplierIds, CancellationToken ct = default)
    {
        var ids = supplierIds.Distinct().ToList();
        var openings = await db.Suppliers.Where(s => ids.Contains(s.Id)).Select(s => new { s.Id, s.OpeningBalance }).ToListAsync(ct);
        var trips = await TripsAsync(ids, ct);
        var invoices = await InvoicesAsync(ids, ct);
        var tripDebt = trips.GroupBy(t => t.SupplierId).ToDictionary(g => g.Key, g => g.Sum(t => t.PurchaseInvoiceId == null ? t.Payable : -t.Deducted));
        var invoiceDebt = invoices.GroupBy(p => p.SupplierId).ToDictionary(g => g.Key, g => g.Sum(p => p.Total));
        var expenses = (await db.Expenses.Where(e => e.IsOnCredit && e.SupplierId != null && ids.Contains(e.SupplierId.Value))
            .GroupBy(e => e.SupplierId!.Value).Select(g => new { Id = g.Key, Total = g.Sum(e => e.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Id, x => x.Total);
        var paid = (await db.SupplierPayments.Where(p => ids.Contains(p.SupplierId))
            .GroupBy(p => p.SupplierId).Select(g => new { Id = g.Key, Total = g.Sum(p => p.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Id, x => x.Total);
        return openings.ToDictionary(o => o.Id,
            o => o.OpeningBalance + tripDebt.GetValueOrDefault(o.Id) + invoiceDebt.GetValueOrDefault(o.Id) + expenses.GetValueOrDefault(o.Id)
                - paid.GetValueOrDefault(o.Id));
    }

    /// <summary>Borç kalemleri, ödemeler dağıtılmış olarak. <paramref name="supplierIds"/> null ise tüm tedarikçiler.</summary>
    public async Task<List<PayableItem>> ItemsAsync(IReadOnlyCollection<int>? supplierIds = null, CancellationToken ct = default)
    {
        var suppliers = db.Suppliers.AsQueryable();
        if (supplierIds != null) suppliers = suppliers.Where(s => supplierIds.Contains(s.Id));
        var terms = await suppliers.Select(s => new { s.Id, s.PaymentTermDays, s.OpeningBalance, s.OpeningBalanceDate, s.CreatedAt }).ToListAsync(ct);
        var ids = terms.Select(t => t.Id).ToList();

        var trips = await TripsAsync(ids, ct);
        var invoices = await InvoicesAsync(ids, ct);
        // Faturalanmış seferin "faturadan düş" komisyonu faturanın borcundan düşülür.
        var deductedByInvoice = trips.Where(t => t.PurchaseInvoiceId != null).GroupBy(t => t.PurchaseInvoiceId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Deducted));
        var tripInvoice = trips.Where(t => t.PurchaseInvoiceId != null).ToDictionary(t => t.Id, t => t.PurchaseInvoiceId!.Value);
        var expenses = await db.Expenses.Where(e => e.IsOnCredit && e.SupplierId != null && ids.Contains(e.SupplierId.Value))
            .Select(e => new { e.Id, SupplierId = e.SupplierId!.Value, e.Date, e.Amount, e.Category, e.Description }).ToListAsync(ct);
        var payments = await db.SupplierPayments.Where(p => ids.Contains(p.SupplierId))
            .Select(p => new { p.SupplierId, p.TripId, p.Date, p.Amount }).ToListAsync(ct);

        var result = new List<PayableItem>();
        foreach (var s in terms)
        {
            // Dağıtım anahtarı: devir 0, sefer +id, gider −id, alınan fatura InvoiceKeyBase + id.
            var items = new List<(int Key, PayableKind Kind, int? TripId, int? ExpenseId, int? InvoiceId, DateOnly Date, DateOnly? Due, decimal Total, string Ref, string Desc)>();
            if (s.OpeningBalance > 0)
                items.Add((0, PayableKind.Opening, null, null, null, s.OpeningBalanceDate ?? DateOnly.FromDateTime(s.CreatedAt), null, s.OpeningBalance, "DEVİR", "Açılış (devir) borcu"));
            items.AddRange(trips.Where(t => t.SupplierId == s.Id && t.PurchaseInvoiceId == null).Select(t => (t.Id, PayableKind.Trip, (int?)t.Id, (int?)null, (int?)null,
                t.DeliveryDate ?? t.LoadingDate, (DateOnly?)null, t.Payable, t.ExternalRef != null ? $"Sevkiyat No: {t.ExternalRef}" : TripRef(t.Id),
                $"{t.LoadingAddress} → {t.DeliveryAddress} ({t.Plate})")));
            items.AddRange(invoices.Where(p => p.SupplierId == s.Id).Select(p => (InvoiceKeyBase + p.Id, PayableKind.Invoice, (int?)null, (int?)null, (int?)p.Id,
                p.Date, p.DueDate, p.Total - deductedByInvoice.GetValueOrDefault(p.Id), p.InvoiceNo,
                deductedByInvoice.GetValueOrDefault(p.Id) > 0 ? $"Alış faturası (komisyon düşüldü: {Formatters.Currency(deductedByInvoice[p.Id])})" : "Alış faturası")));
            items.AddRange(expenses.Where(e => e.SupplierId == s.Id).Select(e => (-e.Id, PayableKind.Expense, (int?)null, (int?)e.Id, (int?)null, e.Date, (DateOnly?)null,
                e.Amount, $"G-{e.Id:D6}", e.Description ?? $"Vadeli gider")));

            var balances = PaymentAllocator.Allocate(
                    items.Select(i => new AllocInvoice(i.Key, i.Date, i.Due ?? i.Date.AddDays(s.PaymentTermDays), i.Total)),
                    payments.Where(p => p.SupplierId == s.Id).OrderBy(p => p.Date)
                        .Select(p => new AllocPayment(p.TripId is { } t && tripInvoice.TryGetValue(t, out var inv) ? InvoiceKeyBase + inv : p.TripId, p.Date, p.Amount)))
                .ToDictionary(b => b.InvoiceId);
            result.AddRange(items.Select(i =>
            {
                var b = balances[i.Key];
                return new PayableItem(s.Id, i.Kind, i.TripId, i.ExpenseId, i.Date, b.DueDate, i.Total, b.Paid, b.Remaining, i.Ref, i.Desc, i.InvoiceId);
            }));
        }
        return result;
    }

    public async Task<SupplierSummaryDto> SummaryAsync(SupplierDto supplier, CancellationToken ct = default)
    {
        var items = await ItemsAsync([supplier.Id], ct);
        var paid = await db.SupplierPayments.Where(p => p.SupplierId == supplier.Id).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var debit = items.Sum(i => i.Total);
        var overdue = items.Where(i => i.Remaining > 0 && i.DueDate < Clock.Today).Sum(i => i.Remaining);
        var tripCount = await db.Trips.CountAsync(t => t.CarrierSupplierId == supplier.Id, ct);
        var missing = await db.Trips.CountAsync(t => !t.IsLegacy && t.CarrierSupplierId == supplier.Id && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null, ct);
        return new SupplierSummaryDto(supplier with { Balance = debit - paid }, debit, paid, debit - paid, overdue, tripCount, missing);
    }

    /// <summary>Borç kalemleri ve ödemeler tarih sırasıyla, yürüyen bakiyeyle (pozitif = tedarikçinin alacağı).</summary>
    public async Task<List<AccountMovementDto>> MovementsAsync(int supplierId, CancellationToken ct = default)
    {
        if (!await db.Suppliers.AnyAsync(s => s.Id == supplierId, ct)) throw new NotFoundException("Tedarikçi bulunamadı.");
        var items = await ItemsAsync([supplierId], ct);
        var payments = await db.SupplierPayments.AsNoTracking().Where(p => p.SupplierId == supplierId)
            .Select(p => new { p.Id, p.Date, p.Amount, p.Method, p.Description, p.TripId, p.CreatedAt }).ToListAsync(ct);
        var today = Clock.Today;
        var rows = items.Select(i => (i.Date, Order: i.Kind == PayableKind.Opening ? 0 : 1, Type: i.Kind switch
            {
                PayableKind.Opening => "Devir", PayableKind.Trip => "Fatura bekleyen sefer", PayableKind.Invoice => "Alış faturası", _ => "Vadeli gider",
            }, i.Reference, Desc: (string?)i.Description, Debit: i.Total, Credit: 0m,
            Status: i.Remaining <= 0 ? "Ödendi" : i.Paid > 0 ? "Kısmi ödendi" : i.DueDate < today ? "Vadesi geçti" : $"Vade {Formatters.Date(i.DueDate)}"))
            .Concat(payments.Select(p => (p.Date, Order: 2, Type: p.Amount < 0 ? "Tedarikçiden iade" : "Ödeme", Reference: PaymentRef(p.Id),
                Desc: p.Description ?? (p.TripId is { } t ? $"{TripRef(t)} için ödeme" : null), Debit: p.Amount < 0 ? -p.Amount : 0m, Credit: Math.Max(p.Amount, 0),
                Status: CustomerAccountService.MethodLabel(p.Method))))
            .OrderBy(r => r.Date).ThenBy(r => r.Order);
        var running = 0m;
        return rows.Select(r =>
        {
            running += r.Debit - r.Credit;
            return new AccountMovementDto(r.Date, r.Type, r.Reference, r.Desc, r.Debit, r.Credit, running, r.Status);
        }).ToList();
    }

    public async Task<List<PayableAgingRow>> AgingAsync(CancellationToken ct = default)
    {
        var items = await ItemsAsync(null, ct);
        var names = await db.Suppliers.ToDictionaryAsync(s => s.Id, s => s.Title, ct);
        var today = Clock.Today;
        return items.GroupBy(i => i.SupplierId)
            .Select(g =>
            {
                var a = PaymentAllocator.Age(g.Select(i => new InvoiceBalance(0, i.DueDate, i.Total, i.Paid, i.Remaining)), today);
                return new PayableAgingRow(g.Key, names[g.Key], a.NotDue, a.Days1To30, a.Days31To60, a.Days61To90, a.Over90, a.Total);
            })
            .Where(r => r.Total > 0).OrderByDescending(r => r.Total).ToList();
    }

    public async Task<List<SupplierReportRow>> ReportAsync(CancellationToken ct = default)
    {
        var items = await ItemsAsync(null, ct);
        var paid = await db.SupplierPayments.GroupBy(p => p.SupplierId).Select(g => new { g.Key, Total = g.Sum(p => p.Amount) }).ToDictionaryAsync(x => x.Key, x => x.Total, ct);
        var suppliers = await db.Suppliers.OrderBy(s => s.Title).Select(s => new { s.Id, s.Title }).ToListAsync(ct);
        var byId = items.ToLookup(i => i.SupplierId);
        return suppliers.Select(s =>
        {
            var list = byId[s.Id].ToList();
            var p = paid.GetValueOrDefault(s.Id);
            return new SupplierReportRow(s.Id, s.Title, list.Count(i => i.Kind is PayableKind.Trip or PayableKind.Invoice), list.Where(i => i.Kind is PayableKind.Trip or PayableKind.Invoice).Sum(i => i.Total),
                list.Where(i => i.Kind == PayableKind.Expense).Sum(i => i.Total), p, list.Sum(i => i.Total) - p);
        }).Where(r => r.TripCount > 0 || r.CreditExpenses > 0 || r.Paid > 0 || r.Balance != 0).ToList();
    }

    /// <summary>Vadesi geçmiş taşeron borcu toplamı ve 15 günden uzun süredir faturası gelmeyen taşeron seferi sayısı.</summary>
    public async Task<(decimal Overdue, decimal Total, int MissingInvoices)> DashboardAsync(CancellationToken ct = default)
    {
        var items = await ItemsAsync(null, ct);
        var today = Clock.Today;
        var cutoff = today.AddDays(-15);
        var missing = await db.Trips.CountAsync(t => !t.IsLegacy && t.CarrierSupplierId != null && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null
            && (t.DeliveryDate ?? t.LoadingDate) < cutoff, ct);
        return (items.Where(i => i.Remaining > 0 && i.DueDate < today).Sum(i => i.Remaining), items.Sum(i => i.Remaining), missing);
    }

    public async Task<bool> IsReferencedAsync(int supplierId, CancellationToken ct = default) =>
        await db.Trips.IgnoreQueryFilters().AnyAsync(t => t.CarrierSupplierId == supplierId, ct)
        || await db.Vehicles.AnyAsync(v => v.SupplierId == supplierId, ct)
        || await db.Drivers.AnyAsync(d => d.SupplierId == supplierId, ct)
        || await db.Expenses.AnyAsync(e => e.SupplierId == supplierId, ct)
        || await db.SupplierPayments.AnyAsync(p => p.SupplierId == supplierId, ct)
        || await db.PurchaseInvoices.IgnoreQueryFilters().AnyAsync(p => p.SupplierId == supplierId, ct);
}
