using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Personel listesi (eski paneldeki "Personeller"): maaş, avans, prim ve ay sonu kalan.</summary>
[ApiController]
[Route("api/staff")]
[Authorize(Policy = Policies.Accounting)]
public class StaffController(AppDbContext db) : ControllerBase
{
    /// <summary>"2026-09" gibi; boşsa bu ay.</summary>
    internal static (DateOnly From, DateOnly To) Month(string? month)
    {
        var start = month != null && DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var d) ? d : new DateOnly(Clock.Today.Year, Clock.Today.Month, 1);
        return (start, start.AddMonths(1).AddDays(-1));
    }

    [HttpGet]
    public async Task<List<StaffDto>> List([FromQuery] string? month, CancellationToken ct)
    {
        var (from, to) = Month(month);
        var staff = await db.Staff.AsNoTracking().OrderByDescending(s => s.IsActive).ThenBy(s => s.FullName).ToListAsync(ct);
        var sums = await db.StaffTransactions.Where(t => t.Date >= from && t.Date <= to)
            .GroupBy(t => new { t.StaffId, t.Kind }).Select(g => new { g.Key.StaffId, g.Key.Kind, Sum = g.Sum(t => t.Amount) }).ToListAsync(ct);
        return staff.Select(s => ToDto(s, from, to, sums.Where(x => x.StaffId == s.Id).ToDictionary(x => x.Kind, x => x.Sum))).ToList();
    }

    private static StaffDto ToDto(Staff s, DateOnly from, DateOnly to, Dictionary<StaffTransactionKind, decimal> sums)
    {
        // İşe başlamadan önceki aylar ve pasif personel için maaş tahakkuk etmez.
        var salary = s.IsActive && (s.StartDate == null || s.StartDate <= to) ? s.MonthlySalary : 0;
        var adv = sums.GetValueOrDefault(StaffTransactionKind.Advance);
        var bonus = sums.GetValueOrDefault(StaffTransactionKind.Bonus);
        var paid = sums.GetValueOrDefault(StaffTransactionKind.SalaryPayment);
        return new StaffDto(s.Id, s.FullName, s.NationalId, s.Phone, s.StartDate, s.MonthlySalary, s.Notes, s.IsActive,
            salary, adv, bonus, paid, Money.Round(salary + bonus - adv - paid));
    }

    [HttpPost]
    public async Task<StaffDto> Create(StaffSaveRequest req, CancellationToken ct)
    {
        var s = new Staff();
        Apply(s, req);
        db.Staff.Add(s);
        await db.SaveChangesAsync(ct);
        return (await List(null, ct)).Single(x => x.Id == s.Id);
    }

    [HttpPut("{id:int}")]
    public async Task<StaffDto> Update(int id, StaffSaveRequest req, CancellationToken ct)
    {
        var s = await db.Staff.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Personel bulunamadı.");
        Apply(s, req);
        await db.SaveChangesAsync(ct);
        return (await List(null, ct)).Single(x => x.Id == id);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var s = await db.Staff.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Personel bulunamadı.");
        if (await db.StaffTransactions.AnyAsync(t => t.StaffId == id, ct))
            throw new DomainException("Hareketi olan personel silinemez; “Çalışmıyor” olarak işaretleyebilirsiniz.");
        s.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:int}/transactions")]
    public async Task<List<StaffTransactionDto>> Transactions(int id, CancellationToken ct) =>
        await db.StaffTransactions.AsNoTracking().Where(t => t.StaffId == id).OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
            .Select(t => new StaffTransactionDto(t.Id, t.StaffId, t.Date, t.Kind, t.Amount, t.Note, t.CashAccountId,
                t.CashAccount != null ? t.CashAccount.Name : null))
            .ToListAsync(ct);

    [HttpPost("{id:int}/transactions")]
    public async Task<StaffTransactionDto> AddTransaction(int id, StaffTransactionSaveRequest req, CancellationToken ct)
    {
        if (!await db.Staff.AnyAsync(s => s.Id == id, ct)) throw new NotFoundException("Personel bulunamadı.");
        // Prim bir hak ediştir, kasadan para çıkmaz; hesap yalnız avans ve maaş ödemesinde işlenir.
        var account = req.Kind == StaffTransactionKind.Bonus ? null : req.CashAccountId;
        if (account != null && !await db.CashAccounts.AnyAsync(a => a.Id == account, ct)) throw new DomainException("Kasa/banka hesabı bulunamadı.");
        var t = new StaffTransaction { StaffId = id, Date = req.Date, Kind = req.Kind, Amount = Money.Round(req.Amount), Note = req.Note?.Trim(), CashAccountId = account };
        db.StaffTransactions.Add(t);
        await db.SaveChangesAsync(ct);
        return (await Transactions(id, ct)).Single(x => x.Id == t.Id);
    }

    [HttpDelete("transactions/{transactionId:int}")]
    public async Task<IActionResult> DeleteTransaction(int transactionId, CancellationToken ct)
    {
        var t = await db.StaffTransactions.FirstOrDefaultAsync(x => x.Id == transactionId, ct) ?? throw new NotFoundException("Kayıt bulunamadı.");
        t.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Staff s, StaffSaveRequest r)
    {
        s.FullName = r.FullName.Trim();
        s.NationalId = string.IsNullOrWhiteSpace(r.NationalId) ? null : r.NationalId.Trim();
        s.Phone = Formatters.NormalizePhone(r.Phone);
        s.StartDate = r.StartDate;
        s.MonthlySalary = Money.Round(r.MonthlySalary);
        s.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        s.IsActive = r.IsActive;
    }
}

/// <summary>Sabit ödemeler (eski paneldeki "Sabit Ödeme Listesi"): her ay tekrarlanan ödemeler ve o ay ödenip ödenmediği.</summary>
[ApiController]
[Route("api/recurring-payments")]
[Authorize(Policy = Policies.Accounting)]
public class RecurringPaymentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<RecurringPaymentDto>> List([FromQuery] string? month, CancellationToken ct)
    {
        var (from, to) = StaffController.Month(month);
        var items = await db.RecurringPayments.AsNoTracking().Include(r => r.CashAccount)
            .OrderByDescending(r => r.IsActive).ThenBy(r => r.DueDay).ThenBy(r => r.Title).ToListAsync(ct);
        var paid = await db.Expenses.AsNoTracking().Where(e => e.RecurringPaymentId != null)
            .Select(e => new { Id = e.RecurringPaymentId!.Value, e.Date, e.Amount }).ToListAsync(ct);
        return items.Select(r =>
        {
            var inMonth = paid.Where(p => p.Id == r.Id && p.Date >= from && p.Date <= to).ToList();
            var last = paid.Where(p => p.Id == r.Id).Select(p => (DateOnly?)p.Date).Max();
            return new RecurringPaymentDto(r.Id, r.Title, r.Detail, r.Amount, r.DueDay, r.Category, r.CashAccountId, r.CashAccount?.Name, r.IsActive,
                new DateOnly(from.Year, from.Month, r.DueDay), inMonth.Count > 0 ? inMonth.Max(p => p.Date) : null,
                inMonth.Count > 0 ? inMonth.Sum(p => p.Amount) : null, last);
        }).ToList();
    }

    [HttpPost]
    public async Task<RecurringPaymentDto> Create(RecurringPaymentSaveRequest req, CancellationToken ct)
    {
        var r = new RecurringPayment();
        Apply(r, req);
        db.RecurringPayments.Add(r);
        await db.SaveChangesAsync(ct);
        return (await List(null, ct)).Single(x => x.Id == r.Id);
    }

    [HttpPut("{id:int}")]
    public async Task<RecurringPaymentDto> Update(int id, RecurringPaymentSaveRequest req, CancellationToken ct)
    {
        var r = await db.RecurringPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Sabit ödeme bulunamadı.");
        Apply(r, req);
        await db.SaveChangesAsync(ct);
        return (await List(null, ct)).Single(x => x.Id == id);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var r = await db.RecurringPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Sabit ödeme bulunamadı.");
        r.IsDeleted = true; // geçmiş ödemeler gider olarak kalır
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>"Ödendi": o ay için gider kaydı açar (kasa/banka seçildiyse bakiyeden düşer).</summary>
    [HttpPost("{id:int}/pay")]
    public async Task<RecurringPaymentDto> Pay(int id, RecurringPayRequest req, CancellationToken ct)
    {
        var r = await db.RecurringPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Sabit ödeme bulunamadı.");
        var account = req.CashAccountId ?? r.CashAccountId;
        if (account != null && !await db.CashAccounts.AnyAsync(a => a.Id == account, ct)) throw new DomainException("Kasa/banka hesabı bulunamadı.");
        db.Expenses.Add(new Expense
        {
            Date = req.Date, Category = r.Category, Amount = Money.Round(req.Amount), Description = r.Title, RecurringPaymentId = r.Id,
            CashAccountId = account, PaidBy = ExpensePaidBy.Company, ApprovalStatus = ApprovalStatus.Approved,
        });
        await db.SaveChangesAsync(ct);
        return (await List($"{req.Date:yyyy-MM}", ct)).Single(x => x.Id == id);
    }

    private static void Apply(RecurringPayment r, RecurringPaymentSaveRequest q)
    {
        r.Title = q.Title.Trim();
        r.Detail = string.IsNullOrWhiteSpace(q.Detail) ? null : q.Detail.Trim();
        r.Amount = Money.Round(q.Amount);
        r.DueDay = q.DueDay;
        r.Category = q.Category;
        r.CashAccountId = q.CashAccountId;
        r.IsActive = q.IsActive;
    }
}
