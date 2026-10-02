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
        p.Trip != null ? p.Trip.LoadingAddress + " → " + p.Trip.DeliveryAddress : p.TripIds != null ? p.TripIds.Count + " sefer (toplu ödeme)" : null, p.Description,
        p.CashAccountId, p.CashAccount != null ? p.CashAccount.Name : null, p.EndorsedFromPaymentId, p.Amount < 0, p.TripIds);

    private IQueryable<SupplierPayment> Filter(SupplierPaymentQuery q)
    {
        var query = db.SupplierPayments.AsNoTracking().WhereIds(q.Ids);
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

    /// <summary>Filtrenin tamamının toplamı (yalnızca sayfanın değil). Tedarikçiden gelen iadeler eksi tutarla düşülür.</summary>
    [HttpGet("totals")]
    public async Task<PaymentTotalsDto> Totals([FromQuery] SupplierPaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(p => p.Amount).ToListAsync(ct);
        return new PaymentTotalsDto(rows.Count, rows.Sum(), -rows.Where(a => a < 0).Sum());
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] SupplierPaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        var t = await Totals(q, ct);
        var total = new SupplierPaymentDto(0, 0, "Toplam", default, t.Total, default, null, null, null);
        return FileResults.Excel(ExcelExporter.ExportWithTotal("Ödemeler", rows, total,
            new ExcelColumn<SupplierPaymentDto>("Tarih", p => p.Id == 0 ? null : p.Date, ExcelExporter.DateFormat),
            new("Tedarikçi", p => p.SupplierTitle),
            new("Sefer", p => p.TripLabel),
            new("Yöntem", p => p.Id == 0 ? null : CustomerAccountService.MethodLabel(p.Method)),
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
        if (p.EndorsedFromPaymentId != null) throw new DomainException("Bu ödeme bir çek/senet cirosundan geldi; Çek/Senet sayfasından yönetin.");
        await ApplyAsync(p, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await db.SupplierPayments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Ödeme bulunamadı.");
        if (p.EndorsedFromPaymentId != null) throw new DomainException("Bu ödeme bir çek/senet cirosundan geldi; Çek/Senet sayfasından ciroyu geri alın.");
        p.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Toplu ödeme önizlemesi: tedarikçi başına toplam ve ödemeye girmeyen seferler (nedeniyle). Kayıt yazmaz.</summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("bulk/preview")]
    public Task<BulkPaymentPreviewDto> BulkPreview(BulkTripRequest req, [FromServices] PayableService payables, CancellationToken ct) =>
        payables.BulkPreviewAsync(req.TripIds, ct);

    /// <summary>
    /// Seçilen taşeron seferleri için tedarikçi başına bir ödeme yazar; tutar her seferin kalan borcudur. Tek işlemde yazılır:
    /// ödenemeyecek bir sefer seçildiyse hiçbir ödeme yazılmaz.
    /// </summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("bulk")]
    public async Task<BulkSupplierPaymentResultDto> Bulk(BulkSupplierPaymentRequest req, [FromServices] PayableService payables, CancellationToken ct)
    {
        if (req.CashAccountId is { } acc && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct)) throw new DomainException("Hesap bulunamadı.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var preview = await payables.BulkPreviewAsync(req.TripIds, ct);
        if (preview.Skipped.Count > 0)
            throw new DomainException($"Seçilen seferlerden {preview.Skipped.Count} tanesi ödenemez ({preview.Skipped[0].Label}: {preview.Skipped[0].Reason}) " +
                "Bu seferleri seçimden çıkarıp tekrar deneyin; hiçbir ödeme kaydedilmedi.");
        if (preview.Suppliers.Count == 0) throw new DomainException("Seçilen seferlerde ödenecek borç yok.");

        var payments = preview.Suppliers.Select(s =>
        {
            var tripIds = s.Trips.Select(t => t.TripId).ToList();
            var refs = string.Join(", ", s.Trips.Select(t => t.Label.Split(" · ")[0]));
            var description = CustomersController.NullIfEmpty(req.Description) ?? $"Toplu ödeme: {refs}";
            return new SupplierPayment
            {
                SupplierId = s.SupplierId, Date = req.Date, Amount = Money.Round(s.Total), Method = req.Method, CashAccountId = req.CashAccountId,
                TripId = tripIds.Count == 1 ? tripIds[0] : null, TripIds = tripIds.Count > 1 ? tripIds : null,
                Description = description.Length > 500 ? description[..499] + "…" : description,
            };
        }).ToList();
        db.SupplierPayments.AddRange(payments);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var ids = payments.Select(p => p.Id).ToList();
        var dtos = await db.SupplierPayments.AsNoTracking().Where(p => ids.Contains(p.Id)).OrderBy(p => p.Supplier.Title).Select(Projection).ToListAsync(ct);
        return new BulkSupplierPaymentResultDto(dtos, dtos.Sum(p => p.Amount));
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
        // Toplu ödemenin sefer listesi yalnızca aynı tedarikçide ve sefer/iade seçilmediyse korunur.
        if (p.TripIds != null && (p.SupplierId != r.SupplierId || r.TripId != null || r.IsRefund)) p.TripIds = null;
        p.SupplierId = r.SupplierId;
        p.Date = r.Date;
        // Tedarikçiden gelen iade (eski paneldeki "Tedarikçiden Gelen EFT") eksi tutarla saklanır: borcu artırır, kasaya girer.
        if (r.IsRefund && r.TripId != null) throw new DomainException("İade sefere bağlanamaz.");
        p.Amount = r.IsRefund ? -Money.Round(r.Amount) : Money.Round(r.Amount);
        p.Method = r.Method;
        p.TripId = r.TripId;
        p.Description = CustomersController.NullIfEmpty(r.Description);
        if (r.CashAccountId is { } acc && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct)) throw new DomainException("Hesap bulunamadı.");
        p.CashAccountId = r.CashAccountId;
    }
}
