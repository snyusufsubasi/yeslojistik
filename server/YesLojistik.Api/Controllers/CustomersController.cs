using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController(AppDbContext db, CustomerAccountService accounts) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Customer, object?>>> SortMap = new()
    {
        ["title"] = c => c.Title,
        ["id"] = c => c.Id,
        ["balance"] = c => c.OpeningBalance + (c.Invoices.Where(i => i.Status == InvoiceStatus.Issued).Sum(i => (decimal?)i.Total) ?? 0)
            - (c.Payments.Sum(p => (decimal?)p.Amount) ?? 0),
    };

    [HttpGet]
    public async Task<PagedResult<CustomerDto>> List([FromQuery] ListQuery q, CancellationToken ct)
    {
        var query = db.Customers.AsNoTracking();
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(c => EF.Functions.ILike(c.Title, like) || EF.Functions.ILike(c.TaxNumber ?? "", like)
                || EF.Functions.ILike(c.Phone ?? "", like) || EF.Functions.ILike(c.Email ?? "", like));
        var (items, total, page, size) = await CustomerAccountService.Project(
            query.ApplySort(q.Sort, q.Desc, SortMap, "title", defaultDesc: false)).PageAsync(q, ct);
        return new PagedResult<CustomerDto>(items.Select(CustomerAccountService.WithNo).ToList(), total, page, size);
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup(CancellationToken ct) =>
        await db.Customers.AsNoTracking().OrderBy(c => c.Title).Select(c => new LookupItem(c.Id, c.Title, null)).ToListAsync(ct);

    [HttpGet("{id:int}")]
    public Task<CustomerSummaryDto> Get(int id, CancellationToken ct) => accounts.SummaryAsync(id, ct);

    [HttpGet("{id:int}/movements")]
    public Task<List<AccountMovementDto>> Movements(int id, CancellationToken ct) => accounts.MovementsAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<CustomerSummaryDto>> Create(CustomerSaveRequest req, CancellationToken ct)
    {
        var c = new Customer();
        Apply(c, req);
        db.Customers.Add(c);
        await db.SaveChangesAsync(ct);
        return await accounts.SummaryAsync(c.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerSummaryDto>> Update(int id, CustomerSaveRequest req, CancellationToken ct)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Müşteri bulunamadı.");
        Apply(c, req);
        await db.SaveChangesAsync(ct);
        return await accounts.SummaryAsync(id, ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Müşteri bulunamadı.");
        if (await db.Trips.AnyAsync(t => t.CustomerId == id, ct) || await db.Invoices.AnyAsync(i => i.CustomerId == id, ct)
            || await db.Payments.AnyAsync(p => p.CustomerId == id, ct))
            throw new DomainException("Seferi, faturası veya tahsilatı olan müşteri silinemez.");
        c.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Customer c, CustomerSaveRequest r)
    {
        c.Title = r.Title.Trim();
        c.TaxNumber = NullIfEmpty(r.TaxNumber);
        c.TaxOffice = NullIfEmpty(r.TaxOffice);
        c.Phone = Formatters.NormalizePhone(r.Phone);
        c.Email = NullIfEmpty(r.Email)?.ToLowerInvariant();
        c.Address = NullIfEmpty(r.Address);
        c.Notes = NullIfEmpty(r.Notes);
        c.OpeningBalance = Money.Round(r.OpeningBalance);
        c.OpeningBalanceDate = r.OpeningBalance > 0 ? r.OpeningBalanceDate : null;
    }

    internal static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
