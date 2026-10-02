using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class ReportService(AppDbContext db, BalanceService balances)
{
    public async Task<List<MonthlySummaryRow>> MonthlyAsync(int year, CancellationToken ct = default)
    {
        var from = new DateOnly(year, 1, 1);
        var to = new DateOnly(year, 12, 31);

        var trips = (await TripFigures.LoadAsync(db.Trips, from, to, ct)).ToLookup(t => t.Date.Month);
        var invoiced = await db.Invoices.Where(i => i.Date >= from && i.Date <= to && i.Status == InvoiceStatus.Issued)
            .GroupBy(i => i.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(i => i.Total) }).ToListAsync(ct);
        var collected = await db.Payments.Where(Payment.Counts).Where(p => p.Date >= from && p.Date <= to)
            .GroupBy(p => p.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(p => p.Amount) }).ToListAsync(ct);
        var carrierPaid = await db.SupplierPayments.Where(p => p.Date >= from && p.Date <= to)
            .GroupBy(p => p.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(p => p.Amount) }).ToListAsync(ct);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => e.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);

        return Enumerable.Range(1, 12).Select(m =>
        {
            var t = trips[m].Totals();
            // Aylık özette o ayın bütün onaylı giderleri (sefere bağlı olsun olmasın) düşülür.
            var exp = expenses.FirstOrDefault(x => x.Month == m)?.Sum ?? 0;
            return new MonthlySummaryRow(year, m, t.Count, t.Revenue, t.DirectCost,
                invoiced.FirstOrDefault(x => x.Month == m)?.Sum ?? 0, collected.FirstOrDefault(x => x.Month == m)?.Sum ?? 0,
                exp, TripProfit.Profit(t.Revenue, t.DirectCost, exp), trips[m].Where(x => x.HasCarrier).Sum(x => x.Money.VehicleCost),
                carrierPaid.FirstOrDefault(x => x.Month == m)?.Sum ?? 0);
        }).ToList();
    }

    public async Task<List<TripProfitRow>> TripProfitAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await TripFigures.LoadAsync(db.Trips, from, to, ct);
        return rows.Select(r => new TripProfitRow(r.Id, r.Date, r.Customer, r.Plate, $"{r.LoadingAddress} → {r.DeliveryAddress}",
            TripStatusRules.Label(r.Status), r.Money.Revenue, r.Money.DirectCost, r.Money.Expenses, r.Money.Profit)).ToList();
    }

    public async Task<List<VehicleReportRow>> VehiclesAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var vehicles = await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate).Select(v => new { v.Id, v.Plate, v.Type }).ToListAsync(ct);
        var trips = (await TripFigures.LoadAsync(db.Trips, from, to, ct)).ToLookup(t => t.VehicleId);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.VehicleId != null && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => e.VehicleId!.Value).Select(g => new { VehicleId = g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);

        return vehicles.Select(v =>
        {
            var t = trips[v.Id].Totals();
            // Araca yazılan bütün onaylı giderler (yakıt, bakım; sefere bağlı olsun olmasın) düşülür.
            var e = expenses.FirstOrDefault(x => x.VehicleId == v.Id)?.Sum ?? 0;
            return new VehicleReportRow(v.Id, v.Plate, v.Type, t.Count, t.Revenue, t.DirectCost, e, TripProfit.Profit(t.Revenue, t.DirectCost, e));
        }).ToList();
    }

    public async Task<List<DriverReportRow>> DriversAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = (await TripFigures.LoadAsync(db.Trips, from, to, ct))
            .GroupBy(t => (t.DriverId, FullName: t.Driver))
            .Select(g => new { g.Key.DriverId, g.Key.FullName, Delivered = g.Count(t => t.Status == TripStatus.Delivered), Totals = g.Totals() })
            .ToList();
        var paid = await db.Expenses
            .Where(e => e.DriverId != null && e.Date >= from && e.Date <= to
                && (e.Category == ExpenseCategory.DriverAdvance || e.Category == ExpenseCategory.DriverAllowance))
            .GroupBy(e => new { DriverId = e.DriverId!.Value, e.Driver!.FullName })
            .Select(g => new
            {
                g.Key.DriverId, g.Key.FullName,
                Advances = g.Where(e => e.Category == ExpenseCategory.DriverAdvance).Sum(e => (decimal?)e.Amount) ?? 0,
                Allowances = g.Where(e => e.Category == ExpenseCategory.DriverAllowance).Sum(e => (decimal?)e.Amount) ?? 0,
            }).ToListAsync(ct);
        var result = rows.Select(r =>
        {
            var p = paid.FirstOrDefault(x => x.DriverId == r.DriverId);
            return new DriverReportRow(r.DriverId, r.FullName, r.Totals.Count, r.Delivered, r.Totals.Revenue, r.Totals.DirectCost,
                r.Totals.Expenses, r.Totals.Profit, p?.Advances ?? 0, p?.Allowances ?? 0);
        }).ToList();
        // Dönemde seferi olmayan ama avans/harcırah verilen şoförler de listelenir.
        result.AddRange(paid.Where(p => rows.All(r => r.DriverId != p.DriverId))
            .Select(p => new DriverReportRow(p.DriverId, p.FullName, 0, 0, 0, 0, 0, 0, p.Advances, p.Allowances)));
        return result.OrderByDescending(r => r.TripCount).ThenBy(r => r.Driver).ToList();
    }

    public async Task<List<FuelReportRow>> FuelAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var fills = await db.Expenses.AsNoTracking()
            .Where(e => e.Category == ExpenseCategory.Fuel && e.VehicleId != null && e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .Select(e => new { VehicleId = e.VehicleId!.Value, e.Vehicle!.Plate, e.Amount, e.Liters, e.Odometer, e.Date, e.Id })
            .ToListAsync(ct);
        return fills.GroupBy(f => new { f.VehicleId, f.Plate }).Select(g =>
        {
            var liters = g.Sum(f => f.Liters ?? 0);
            var withLiters = g.Where(f => f.Liters > 0).ToList();
            decimal? price = withLiters.Count > 0 ? Math.Round(withLiters.Sum(f => f.Amount) / withLiters.Sum(f => f.Liters!.Value), 2) : null;
            var measured = g.Where(f => f.Odometer != null && f.Liters > 0).OrderBy(f => f.Odometer).ThenBy(f => f.Date).ThenBy(f => f.Id).ToList();
            int? km = null;
            decimal? per100 = null;
            if (measured.Count >= 2 && measured[^1].Odometer > measured[0].Odometer)
            {
                km = measured[^1].Odometer!.Value - measured[0].Odometer!.Value;
                per100 = Math.Round(measured.Skip(1).Sum(f => f.Liters!.Value) / km.Value * 100, 1);
            }
            return new FuelReportRow(g.Key.VehicleId, g.Key.Plate, g.Count(), liters, g.Sum(f => f.Amount), price, km, per100);
        }).OrderBy(r => r.Plate).ToList();
    }

    public async Task<List<CustomerAgingRow>> AgingAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var byCustomer = await balances.BalancesByCustomerAsync(null, ct);
        var ids = byCustomer.Select(g => g.Key).ToList();
        var titles = await db.Customers.AsNoTracking().Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Title, ct);

        return byCustomer
            .Select(g => (Key: (CustomerId: g.Key, Title: titles.GetValueOrDefault(g.Key, "?")), Buckets: PaymentAllocator.Age(g, today)))
            .Where(x => x.Buckets.Total > 0)
            .Select(x => new CustomerAgingRow(x.Key.CustomerId, x.Key.Title, x.Buckets.NotDue, x.Buckets.Days1To30,
                x.Buckets.Days31To60, x.Buckets.Days61To90, x.Buckets.Over90, x.Buckets.Total))
            .OrderByDescending(r => r.Total).ToList();
    }

    public async Task<List<ExpenseCategoryRow>> ExpenseCategoriesAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => e.Category).Select(g => new { g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);
        return rows.OrderByDescending(r => r.Sum).Select(r => new ExpenseCategoryRow(r.Key.ToString(), r.Sum)).ToList();
    }

    public async Task<List<CustomerProfitRow>> CustomerProfitAsync(DateOnly from, DateOnly to, BalanceService balances, CancellationToken ct = default)
    {
        var rows = (await TripFigures.LoadAsync(db.Trips, from, to, ct))
            .GroupBy(t => (t.CustomerId, Title: t.Customer))
            .Select(g => new { g.Key.CustomerId, g.Key.Title, Totals = g.Totals() })
            .ToList();
        var open = (await balances.BalancesByCustomerAsync(rows.Select(r => r.CustomerId), ct));
        var days = Math.Max(1, to.DayNumber - from.DayNumber + 1);
        return rows.Select(r =>
        {
            var t = r.Totals;
            var receivable = open[r.CustomerId].Sum(b => b.Remaining);
            // Yaklaşık tahsil süresi (DSO): açık alacak / (dönem cirosu KDV'li ≈ ×1,2 / gün)
            int? dso = t.Revenue > 0 ? (int)Math.Round(receivable / (t.Revenue * 1.2m / days)) : null;
            return new CustomerProfitRow(r.CustomerId, r.Title, t.Count, t.Revenue, t.DirectCost + t.Expenses, t.Profit,
                t.MarginPercent, receivable, dso);
        }).OrderByDescending(r => r.Profit).ToList();
    }

    public async Task<List<RouteProfitRow>> RouteProfitAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = (await TripFigures.LoadAsync(db.Trips, from, to, ct))
            .GroupBy(t => (t.LoadingCity, t.DeliveryCity))
            .Select(g => new { g.Key.LoadingCity, g.Key.DeliveryCity, Totals = g.Totals() })
            .ToList();
        return rows.Select(r =>
        {
            var t = r.Totals;
            return new RouteProfitRow(r.LoadingCity ?? "İl girilmemiş", r.DeliveryCity ?? "İl girilmemiş", t.Count,
                Money.Round(t.Revenue / t.Count), Money.Round((t.DirectCost + t.Expenses) / t.Count), t.Profit, t.MarginPercent);
        }).OrderByDescending(r => r.TripCount).ThenByDescending(r => r.Profit).ToList();
    }

    private static readonly string[] MonthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    public static string MonthLabel(int year, int month) => $"{MonthNames[month - 1]} {year}";

    /// <summary>
    /// Kazanç raporu: seferlerin satış, komisyon, maliyet, prim, ek masraf, sefer giderleri ve kârı; ay, müşteri, araç ya da şoför bazında.
    /// Sefere bağlı olmayan genel giderler (kira, maaş vb.) dahil değildir; onlar aylık özette düşülür.
    /// </summary>
    public async Task<List<ProfitReportRow>> ProfitAsync(DateOnly from, DateOnly to, ProfitGroupBy groupBy, CancellationToken ct = default,
        int? customerId = null, int? vehicleId = null, int? driverId = null)
    {
        var query = db.Trips.AsQueryable();
        if (customerId is { } c) query = query.Where(t => t.CustomerId == c);
        if (vehicleId is { } v) query = query.Where(t => t.VehicleId == v);
        if (driverId is { } d) query = query.Where(t => t.DriverId == d);
        var trips = await TripFigures.LoadAsync(query, from, to, ct);
        var groups = groupBy switch
        {
            ProfitGroupBy.Customer => trips.GroupBy(t => (Key: t.CustomerId.ToString(), Label: t.Customer)),
            ProfitGroupBy.Vehicle => trips.GroupBy(t => (Key: t.VehicleId.ToString(), Label: t.Plate)),
            ProfitGroupBy.Driver => trips.GroupBy(t => (Key: t.DriverId.ToString(), Label: t.Driver)),
            _ => trips.GroupBy(t => (Key: $"{t.Date.Year:D4}-{t.Date.Month:D2}", Label: MonthLabel(t.Date.Year, t.Date.Month))),
        };
        var rows = groups.Select(g =>
        {
            var t = g.Totals();
            return new ProfitReportRow(g.Key.Key, g.Key.Label, t.Count, t.Sale, t.Commission, t.VehicleCost, t.DriverBonus, t.ExtraCost,
                t.Expenses, t.Profit, t.MarginPercent);
        });
        return (groupBy == ProfitGroupBy.Month
            ? rows.OrderBy(r => r.Key, StringComparer.Ordinal)
            : rows.OrderByDescending(r => r.Profit).ThenBy(r => r.Label, StringComparer.Create(Formatters.Tr, false))).ToList();
    }
}
