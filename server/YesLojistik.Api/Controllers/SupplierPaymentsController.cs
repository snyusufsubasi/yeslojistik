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

/// <summary>Tedarikçilere (taşeron, servis, istasyon) yapılan ödemeler.</summary>
[ApiController]
[Route("api/supplier-payments")]
public class SupplierPaymentsController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<SupplierPayment, object?>>> SortMap = new()
    {
        ["date"] = p => p.Date,
        ["amount"] = p => p.Amount,
        ["supplier"] = p => p.Supplier.Title,
        ["method"] = p => p.Method,
    };

    private static readonly Expression<Func<SupplierPayment, SupplierPaymentDto>> Projection = p => new SupplierPaymentDto(p.Id, p.SupplierId,
        p.Supplier.Title, p.Date, p.Amount, p.Method, p.TripId,
        p.Trip != null ? p.Trip.LoadingAddress + " → " + p.Trip.DeliveryAddress : null, p.Description);

    private IQueryable<SupplierPayment> Filter(SupplierPaymentQuery q)
    {
        var query = db.SupplierPayments.AsNoTracking();
        if (q.SupplierId is { } s) query = query.Where(p => p.SupplierId == s);
        if (q.From is { } from) query = query.Where(p => p.Date >= from);
        if (q.To is { } to) query = query.Where(p => p.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(p => EF.Functions.ILike(p.Supplier.Title, like) || EF.Functions.ILike(p.Description ?? "", like));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "date");
    }

    [HttpGet]
    public async Task<PagedResult<SupplierPaymentDto>> List([FromQuery] SupplierPaymentQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).Select(Projection).PageAsync(q, ct);
        return new PagedResult<SupplierPaymentDto>(items, total, page, size);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] SupplierPaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        return FileResults.Excel(ExcelExporter.Export("Ödemeler", rows,
            new ExcelColumn<SupplierPaymentDto>("Tarih", p => p.Date, ExcelExporter.DateFormat),
            new("Tedarikçi", p => p.SupplierTitle),
            new("Sefer", p => p.TripLabel),
            new("Yöntem", p => CustomerAccountService.MethodLabel(p.Method)),
            new("Tutar", p => p.Amount, ExcelExporter.MoneyFormat),
            new("Açıklama", p => p.Description)), "odemeler");
    }

    [HttpGet("{id:int}")]
    public async Task<SupplierPaymentDto> Get(int id, CancellationToken ct) =>
        await db.SupplierPayments.AsNoTracking().Where(p => p.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Ödeme bulunamadı.");

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<SupplierPaymentDto> Create(SupplierPaymentSaveRequest req, CancellationToken ct)
    {
        var p = new SupplierPayment();
        await ApplyAsync(p, req, ct);
        db.SupplierPayments.Add(p);
        await db.SaveChangesAsync(ct);
        return await Get(p.Id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<SupplierPaymentDto> Update(int id, SupplierPaymentSaveRequest req, CancellationToken ct)
    {
        var p = await db.SupplierPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Ödeme bulunamadı.");
        await ApplyAsync(p, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await db.SupplierPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Ödeme bulunamadı.");
        p.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(SupplierPayment p, SupplierPaymentSaveRequest r, CancellationToken ct)
    {
        if (!await db.Suppliers.AnyAsync(s => s.Id == r.SupplierId, ct)) throw new DomainException("Tedarikçi bulunamadı.");
        if (r.TripId is { } tripId)
        {
            var carrier = await db.Trips.Where(t => t.Id == tripId).Select(t => new { t.CarrierSupplierId }).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Sefer bulunamadı.");
            if (carrier.CarrierSupplierId != r.SupplierId) throw new DomainException("Seçilen sefer bu tedarikçinin aracıyla yapılmamış.");
        }
        p.SupplierId = r.SupplierId;
        p.Date = r.Date;
        p.Amount = Money.Round(r.Amount);
        p.Method = r.Method;
        p.TripId = r.TripId;
        p.Description = CustomersController.NullIfEmpty(r.Description);
    }
}
