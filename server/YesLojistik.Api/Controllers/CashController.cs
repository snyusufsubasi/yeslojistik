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

/// <summary>Kasa, banka, POS ve kredi kartı hesapları; bakiye hareketlerden hesaplanır.</summary>
[ApiController]
[Route("api/cash-accounts")]
public class CashAccountsController(AppDbContext db, CashService cash) : ControllerBase
{
    [Authorize(Policy = Policies.Accounting)]
    [HttpGet]
    public Task<List<CashAccountDto>> List(CancellationToken ct) => cash.AccountsAsync(ct);

    /// <summary>Seçim listeleri için (tüm ofis kullanıcıları).</summary>
    [HttpGet("lookup")]
    public Task<List<LookupItem>> Lookup(CancellationToken ct) => db.CashAccounts.AsNoTracking().Where(a => a.IsActive).OrderBy(a => a.Name)
        .Select(a => new LookupItem(a.Id, a.Name, a.Kind.ToString())).ToListAsync(ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpGet("{id:int}/movements")]
    public Task<List<CashMovementDto>> Movements(int id, CancellationToken ct) => cash.MovementsAsync(id, ct);

    private async Task<CashAccountDto> GetAsync(int id, CancellationToken ct) =>
        (await cash.AccountsAsync(ct)).FirstOrDefault(a => a.Id == id) ?? throw new NotFoundException("Hesap bulunamadı.");

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<CashAccountDto> Create(CashAccountSaveRequest req, CancellationToken ct)
    {
        var a = new CashAccount();
        Apply(a, req);
        db.CashAccounts.Add(a);
        await db.SaveChangesAsync(ct);
        return await GetAsync(a.Id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<CashAccountDto> Update(int id, CashAccountSaveRequest req, CancellationToken ct)
    {
        var a = await db.CashAccounts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Hesap bulunamadı.");
        Apply(a, req);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var a = await db.CashAccounts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Hesap bulunamadı.");
        var used = await db.Payments.AnyAsync(p => p.CashAccountId == id, ct) || await db.SupplierPayments.AnyAsync(p => p.CashAccountId == id, ct)
            || await db.Expenses.AnyAsync(e => e.CashAccountId == id, ct) || await db.DriverSettlements.AnyAsync(s => s.CashAccountId == id, ct)
            || await db.CashTransfers.AnyAsync(t => t.FromAccountId == id || t.ToAccountId == id, ct);
        if (used) throw new DomainException("Hareketi olan hesap silinemez; pasife alabilirsiniz.");
        a.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(CashAccount a, CashAccountSaveRequest r)
    {
        a.Name = r.Name.Trim();
        a.Kind = r.Kind;
        a.Iban = IbanValidator.Normalize(r.Iban);
        a.OpeningBalance = Money.Round(r.OpeningBalance);
        a.OpeningBalanceDate = r.OpeningBalanceDate;
        a.IsActive = r.IsActive;
    }
}

/// <summary>Hesaplar arası para aktarımı (virman).</summary>
[ApiController]
[Route("api/cash-transfers")]
[Authorize(Policy = Policies.Accounting)]
public class CashTransfersController(AppDbContext db) : ControllerBase
{
    private static readonly System.Linq.Expressions.Expression<Func<CashTransfer, CashTransferDto>> Projection = t =>
        new CashTransferDto(t.Id, t.FromAccountId, t.FromAccount.Name, t.ToAccountId, t.ToAccount.Name, t.Date, t.Amount, t.Note);

    [HttpGet]
    public Task<List<CashTransferDto>> List(CancellationToken ct) =>
        db.CashTransfers.AsNoTracking().OrderByDescending(t => t.Date).ThenByDescending(t => t.Id).Select(Projection).Take(500).ToListAsync(ct);

    [HttpPost]
    public async Task<CashTransferDto> Create(CashTransferSaveRequest r, CancellationToken ct)
    {
        if (r.FromAccountId == r.ToAccountId) throw new DomainException("Çıkış ve giriş hesabı aynı olamaz.");
        if (await db.CashAccounts.CountAsync(a => a.Id == r.FromAccountId || a.Id == r.ToAccountId, ct) != 2) throw new DomainException("Hesap bulunamadı.");
        var t = new CashTransfer { FromAccountId = r.FromAccountId, ToAccountId = r.ToAccountId, Date = r.Date, Amount = Money.Round(r.Amount),
            Note = CustomersController.NullIfEmpty(r.Note) };
        db.CashTransfers.Add(t);
        await db.SaveChangesAsync(ct);
        return await db.CashTransfers.AsNoTracking().Where(x => x.Id == t.Id).Select(Projection).FirstAsync(ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var t = await db.CashTransfers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Virman bulunamadı.");
        t.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
