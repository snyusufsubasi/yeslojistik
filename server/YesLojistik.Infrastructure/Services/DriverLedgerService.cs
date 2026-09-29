using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Şoför hesabı: verilen avanslar ve şoföre yapılan ödemeler bakiyeyi artırır; şoförün kendi cebinden yaptığı onaylı masraflar
/// ve şoförden geri alınan para azaltır. Bakiye pozitifse şoförün elinde firmaya ait para var, negatifse firma şoföre borçlu.
/// </summary>
public class DriverLedgerService(AppDbContext db)
{
    public async Task<DriverLedgerDto> LedgerAsync(int driverId, DateOnly? from = null, DateOnly? to = null, CancellationToken ct = default)
    {
        var driver = await db.Drivers.AsNoTracking().Where(d => d.Id == driverId).Select(d => new { d.Id, d.FullName }).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Şoför bulunamadı.");
        var expenses = await db.Expenses.AsNoTracking()
            .Where(e => e.DriverId == driverId && (e.Category == ExpenseCategory.DriverAdvance || e.PaidBy == ExpensePaidBy.Driver))
            .Select(e => new { e.Id, e.Date, e.Category, e.Amount, e.Description, e.PaidBy, e.ApprovalStatus, Plate = e.Vehicle != null ? e.Vehicle.Plate : null })
            .ToListAsync(ct);
        var settlements = await db.DriverSettlements.AsNoTracking().Where(s => s.DriverId == driverId).ToListAsync(ct);

        var rows = new List<(DateOnly Date, int Order, string Kind, string Desc, decimal Debit, decimal Credit, int? ExpenseId, int? SettlementId, ApprovalStatus? Status, bool Counts)>();
        foreach (var e in expenses)
        {
            var desc = string.Join(" · ", new[] { e.Plate, e.Description }.Where(x => !string.IsNullOrWhiteSpace(x)));
            if (e.Category == ExpenseCategory.DriverAdvance)
                rows.Add((e.Date, 0, "Avans", desc, e.Amount, 0, e.Id, null, null, e.ApprovalStatus == ApprovalStatus.Approved));
            else
                rows.Add((e.Date, 2, "Masraf: " + CategoryLabel(e.Category), desc, 0, e.Amount, e.Id, null, e.ApprovalStatus,
                    e.ApprovalStatus == ApprovalStatus.Approved));
        }
        foreach (var s in settlements)
            rows.Add(s.Direction == SettlementDirection.PaidToDriver
                ? (s.Date, 1, "Şoföre ödeme", s.Note ?? "", s.Amount, 0, null, s.Id, null, true)
                : (s.Date, 3, "Şoförden alınan", s.Note ?? "", 0, s.Amount, null, s.Id, null, true));

        var counted = rows.Where(r => r.Counts).ToList();
        var advances = counted.Where(r => r.Kind == "Avans").Sum(r => r.Debit);
        var paid = counted.Where(r => r.SettlementId != null).Sum(r => r.Debit);
        var driverExpenses = counted.Where(r => r.ExpenseId != null).Sum(r => r.Credit);
        var received = counted.Where(r => r.SettlementId != null).Sum(r => r.Credit);
        var pending = rows.Where(r => r.Status == ApprovalStatus.Pending).Sum(r => r.Credit);

        // Dönem filtresi: dönem öncesi hareketler "Devir" satırında toplanır.
        var ordered = rows.OrderBy(r => r.Date).ThenBy(r => r.Order).ThenBy(r => r.ExpenseId ?? r.SettlementId).ToList();
        var result = new List<DriverLedgerRow>();
        decimal balance = 0;
        if (from is { } f)
        {
            var before = ordered.Where(r => r.Date < f && r.Counts).ToList();
            balance = before.Sum(r => r.Debit - r.Credit);
            if (before.Count > 0) result.Add(new DriverLedgerRow(f, "Devir", "Dönem öncesi bakiye", 0, 0, balance, null, null));
            ordered = ordered.Where(r => r.Date >= f).ToList();
        }
        if (to is { } t) ordered = ordered.Where(r => r.Date <= t).ToList();
        foreach (var r in ordered)
        {
            if (r.Counts) balance += r.Debit - r.Credit;
            result.Add(new DriverLedgerRow(r.Date, r.Kind, r.Desc, r.Debit, r.Credit, balance, r.ExpenseId, r.SettlementId, r.Status));
        }
        return new DriverLedgerDto(driver.Id, driver.FullName, advances, paid, driverExpenses, received,
            Money.Round(advances + paid - driverExpenses - received), pending, result);
    }

    public static string CategoryLabel(ExpenseCategory c) => c switch
    {
        ExpenseCategory.Fuel => "Yakıt",
        ExpenseCategory.Maintenance => "Bakım",
        ExpenseCategory.Toll => "Otoyol/Köprü",
        ExpenseCategory.DriverAllowance => "Harcırah",
        ExpenseCategory.Tire => "Lastik",
        ExpenseCategory.Insurance => "Sigorta",
        ExpenseCategory.Tax => "Vergi",
        ExpenseCategory.DriverAdvance => "Avans",
        _ => "Diğer",
    };
}
