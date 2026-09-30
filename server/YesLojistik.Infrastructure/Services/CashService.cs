using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Kasa/banka hesapları, nakit akışı ve müşteri risk limiti. Hesap bakiyesi saklanmaz:
/// devir + tahsilatlar (çek/senet yalnızca tahsil edilince) + şoförden alınan + gelen virman
/// − tedarikçi ödemeleri (ciro hariç) − firmanın ödediği onaylı giderler − şoföre ödemeler − giden virman.
/// </summary>
public class CashService(AppDbContext db, BalanceService balances, PayableService payables)
{
    private record Move(int AccountId, DateOnly Date, string Kind, string Description, decimal In, decimal Out, string? Link);

    private async Task<List<Move>> MovesAsync(int? accountId, CancellationToken ct)
    {
        var moves = new List<Move>();
        var payments = await db.Payments.AsNoTracking().Where(p => p.CashAccountId != null && (accountId == null || p.CashAccountId == accountId))
            .Where(p => p.InstrumentStatus == null || p.InstrumentStatus == InstrumentStatus.Collected)
            .Select(p => new { p.CashAccountId, p.Date, p.Amount, p.Method, Customer = p.Customer.Title, p.CustomerId }).ToListAsync(ct);
        moves.AddRange(payments.Select(p => new Move(p.CashAccountId!.Value, p.Date, "Tahsilat", $"{p.Customer} · {CustomerAccountService.MethodLabel(p.Method)}",
            p.Amount, 0, $"/musteriler/{p.CustomerId}")));
        var supplierPayments = await db.SupplierPayments.AsNoTracking()
            .Where(p => p.CashAccountId != null && p.EndorsedFromPaymentId == null && (accountId == null || p.CashAccountId == accountId))
            .Select(p => new { p.CashAccountId, p.Date, p.Amount, Supplier = p.Supplier.Title, p.SupplierId }).ToListAsync(ct);
        moves.AddRange(supplierPayments.Select(p => new Move(p.CashAccountId!.Value, p.Date, "Tedarikçi ödemesi", p.Supplier, 0, p.Amount, $"/tedarikciler/{p.SupplierId}")));
        var expenses = await db.Expenses.AsNoTracking()
            .Where(e => e.CashAccountId != null && !e.IsOnCredit && e.PaidBy == ExpensePaidBy.Company && e.ApprovalStatus == ApprovalStatus.Approved
                && (accountId == null || e.CashAccountId == accountId))
            .Select(e => new { e.CashAccountId, e.Date, e.Amount, e.Category, e.Description, Plate = e.Vehicle != null ? e.Vehicle.Plate : null }).ToListAsync(ct);
        moves.AddRange(expenses.Select(e => new Move(e.CashAccountId!.Value, e.Date, "Gider",
            string.Join(" · ", new[] { DriverLedgerService.CategoryLabel(e.Category), e.Plate, e.Description }.Where(x => !string.IsNullOrWhiteSpace(x))), 0, e.Amount, "/giderler")));
        var settlements = await db.DriverSettlements.AsNoTracking().Where(s => s.CashAccountId != null && (accountId == null || s.CashAccountId == accountId))
            .Select(s => new { s.CashAccountId, s.Date, s.Amount, s.Direction, Driver = s.Driver.FullName }).ToListAsync(ct);
        moves.AddRange(settlements.Select(s => s.Direction == SettlementDirection.PaidToDriver
            ? new Move(s.CashAccountId!.Value, s.Date, "Şoföre ödeme", s.Driver, 0, s.Amount, "/soforler")
            : new Move(s.CashAccountId!.Value, s.Date, "Şoförden alınan", s.Driver, s.Amount, 0, "/soforler")));
        var transfers = await db.CashTransfers.AsNoTracking().Where(t => accountId == null || t.FromAccountId == accountId || t.ToAccountId == accountId)
            .Select(t => new { t.FromAccountId, t.ToAccountId, t.Date, t.Amount, t.Note, From = t.FromAccount.Name, To = t.ToAccount.Name }).ToListAsync(ct);
        foreach (var t in transfers)
        {
            moves.Add(new Move(t.FromAccountId, t.Date, "Virman", $"→ {t.To}{(t.Note != null ? $" · {t.Note}" : "")}", 0, t.Amount, null));
            moves.Add(new Move(t.ToAccountId, t.Date, "Virman", $"← {t.From}{(t.Note != null ? $" · {t.Note}" : "")}", t.Amount, 0, null));
        }
        return accountId is { } id ? moves.Where(m => m.AccountId == id).ToList() : moves;
    }

    public async Task<List<CashAccountDto>> AccountsAsync(CancellationToken ct = default)
    {
        var accounts = await db.CashAccounts.AsNoTracking().OrderByDescending(a => a.IsActive).ThenBy(a => a.Name).ToListAsync(ct);
        var moves = (await MovesAsync(null, ct)).GroupBy(m => m.AccountId).ToDictionary(g => g.Key, g => g.Sum(m => m.In - m.Out));
        return accounts.Select(a => new CashAccountDto(a.Id, a.Name, a.Kind, a.Iban, a.OpeningBalance, a.OpeningBalanceDate, a.IsActive,
            Money.Round(a.OpeningBalance + moves.GetValueOrDefault(a.Id)))).ToList();
    }

    public async Task<List<CashMovementDto>> MovementsAsync(int accountId, CancellationToken ct = default)
    {
        var a = await db.CashAccounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == accountId, ct) ?? throw new NotFoundException("Hesap bulunamadı.");
        var balance = a.OpeningBalance;
        var result = new List<CashMovementDto>();
        if (a.OpeningBalance != 0)
            result.Add(new CashMovementDto(a.OpeningBalanceDate ?? DateOnly.FromDateTime(a.CreatedAt), "Devir", "Açılış bakiyesi",
                a.OpeningBalance > 0 ? a.OpeningBalance : 0, a.OpeningBalance < 0 ? -a.OpeningBalance : 0, balance, null));
        foreach (var m in (await MovesAsync(accountId, ct)).OrderBy(m => m.Date).ThenByDescending(m => m.In))
        {
            balance += m.In - m.Out;
            result.Add(new CashMovementDto(m.Date, m.Kind, m.Description, m.In, m.Out, balance, m.Link));
        }
        return result;
    }

    /// <summary>
    /// Önümüzdeki 4 hafta: beklenen tahsilat (açık fatura kalanları vadesine göre + portföydeki/tahsildeki çek-senetler)
    /// ve beklenen ödeme (taşeron/tedarikçi borç kalemleri vadesine göre). Vadesi geçmiş olanlar ayrı dilimde.
    /// </summary>
    public async Task<CashFlowDto> CashFlowAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var buckets = new List<(string Label, DateOnly? From, DateOnly? To)> { ("Gecikmiş", null, today.AddDays(-1)) };
        for (var w = 0; w < 4; w++)
            buckets.Add(($"{Formatters.Date(today.AddDays(w * 7))[..5]} – {Formatters.Date(today.AddDays(w * 7 + 6))[..5]}", today.AddDays(w * 7), today.AddDays(w * 7 + 6)));
        int? Index(DateOnly d)
        {
            if (d < today) return 0;
            var w = (d.DayNumber - today.DayNumber) / 7;
            return w < 4 ? w + 1 : null;
        }

        var inv = new decimal[5]; var ins = new decimal[5]; var outs = new decimal[5];
        foreach (var b in (await balances.BalancesByCustomerAsync(null, ct)).SelectMany(g => g).Where(b => b.Remaining > 0))
            if (Index(b.DueDate) is { } i) inv[i] += b.Remaining;
        var instruments = await db.Payments.AsNoTracking()
            .Where(p => p.InstrumentStatus == InstrumentStatus.Portfolio || p.InstrumentStatus == InstrumentStatus.InCollection)
            .Select(p => new { Due = p.InstrumentDueDate ?? p.Date, p.Amount }).ToListAsync(ct);
        foreach (var p in instruments)
            if (Index(p.Due) is { } i) ins[i] += p.Amount;
        foreach (var item in (await payables.ItemsAsync(null, ct)).Where(x => x.Remaining > 0))
            if (Index(item.DueDate) is { } i) outs[i] += item.Remaining;

        var cash = (await AccountsAsync(ct)).Where(a => a.IsActive && a.Kind != CashAccountKind.CreditCard).Sum(a => a.Balance);
        var list = buckets.Select((b, i) => new CashFlowBucket(b.Label, b.From, b.To, Money.Round(inv[i]), Money.Round(ins[i]), Money.Round(outs[i]))).ToList();
        return new CashFlowDto(list, list.Sum(b => b.ExpectedIn + b.InstrumentsIn), list.Sum(b => b.ExpectedOut), cash);
    }

    /// <summary>Risk: açık bakiye + faturalanmamış teslim edilmiş seferler. Limit yoksa yalnızca kullanım döner.</summary>
    public async Task<CustomerRiskDto> RiskAsync(int customerId, int? excludeTripId = null, CancellationToken ct = default)
    {
        var c = await db.Customers.AsNoTracking().Where(x => x.Id == customerId).Select(x => new { x.Id, x.CreditLimit }).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Müşteri bulunamadı.");
        var open = (await balances.InvoiceBalancesAsync([customerId], ct)).Values.Sum(b => b.Remaining);
        var uninvoiced = await db.Trips.Where(t => !t.IsLegacy && t.CustomerId == customerId && t.InvoiceId == null && t.Id != (excludeTripId ?? 0)
                && (t.Status == TripStatus.Delivered || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad))
            .SumAsync(t => (decimal?)t.SalePrice, ct) ?? 0;
        var used = Money.Round(open + uninvoiced);
        return new CustomerRiskDto(c.Id, c.CreditLimit, Money.Round(open), Money.Round(uninvoiced), used, c.CreditLimit is { } l ? Money.Round(l - used) : null);
    }
}
