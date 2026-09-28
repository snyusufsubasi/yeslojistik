using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Payment, object?>>> SortMap = new()
    {
        ["date"] = p => p.Date,
        ["amount"] = p => p.Amount,
        ["customer"] = p => p.Customer.Title,
        ["method"] = p => p.Method,
    };

    private static readonly Expression<Func<Payment, PaymentDto>> Projection = p => new PaymentDto(p.Id, p.CustomerId,
        p.Customer.Title, p.InvoiceId, p.Invoice != null ? p.Invoice.InvoiceNo : null, p.Date, p.Amount, p.Method, p.Description);

    private IQueryable<Payment> Filter(PaymentQuery q)
    {
        var query = db.Payments.AsNoTracking();
        if (q.CustomerId is { } c) query = query.Where(p => p.CustomerId == c);
        if (q.From is { } from) query = query.Where(p => p.Date >= from);
        if (q.To is { } to) query = query.Where(p => p.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(p => EF.Functions.ILike(p.Customer.Title, like) || EF.Functions.ILike(p.Description ?? "", like)
                || (p.Invoice != null && EF.Functions.ILike(p.Invoice.InvoiceNo, like)));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "date");
    }

    [HttpGet]
    public async Task<PagedResult<PaymentDto>> List([FromQuery] PaymentQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).Select(Projection).PageAsync(q, ct);
        return new PagedResult<PaymentDto>(items, total, page, size);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] PaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(5000).ToListAsync(ct);
        return FileResults.Excel(ExcelExporter.Export("Tahsilatlar", rows,
            new ExcelColumn<PaymentDto>("Tarih", p => p.Date, ExcelExporter.DateFormat),
            new("Müşteri", p => p.CustomerTitle),
            new("Fatura", p => p.InvoiceNo),
            new("Yöntem", p => CustomerAccountService.MethodLabel(p.Method)),
            new("Tutar", p => p.Amount, ExcelExporter.MoneyFormat),
            new("Açıklama", p => p.Description)), "tahsilatlar");
    }

    [HttpGet("{id:int}")]
    public async Task<PaymentDto> Get(int id, CancellationToken ct) =>
        await db.Payments.AsNoTracking().Where(p => p.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Tahsilat bulunamadı.");

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<PaymentDto> Create(PaymentSaveRequest req, CancellationToken ct)
    {
        var p = new Payment();
        await ApplyAsync(p, req, ct);
        db.Payments.Add(p);
        await db.SaveChangesAsync(ct);
        return await Get(p.Id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<PaymentDto> Update(int id, PaymentSaveRequest req, CancellationToken ct)
    {
        var p = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tahsilat bulunamadı.");
        await ApplyAsync(p, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tahsilat bulunamadı.");
        p.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(Payment p, PaymentSaveRequest r, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == r.CustomerId, ct)) throw new DomainException("Müşteri bulunamadı.");
        if (r.InvoiceId is { } invId)
        {
            var inv = await db.Invoices.Where(i => i.Id == invId).Select(i => new { i.CustomerId, i.Status }).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Fatura bulunamadı.");
            if (inv.CustomerId != r.CustomerId) throw new DomainException("Seçilen fatura bu müşteriye ait değil.");
            if (inv.Status != InvoiceStatus.Issued) throw new DomainException("Tahsilat yalnızca kesilmiş faturalara bağlanabilir.");
        }
        p.CustomerId = r.CustomerId;
        p.InvoiceId = r.InvoiceId;
        p.Date = r.Date;
        p.Amount = Money.Round(r.Amount);
        p.Method = r.Method;
        p.Description = CustomersController.NullIfEmpty(r.Description);
    }
}
