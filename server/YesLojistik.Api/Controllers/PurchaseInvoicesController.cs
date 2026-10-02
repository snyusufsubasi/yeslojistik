using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Tedarikçiden alınan faturalar (eski paneldeki "Alınan Faturalar" / "Manuel Fatura Ekle").</summary>
[ApiController]
[Route("api/purchase-invoices")]
public class PurchaseInvoicesController(PurchaseInvoiceService invoices) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<PurchaseInvoiceDto>> List([FromQuery] PurchaseInvoiceQuery q, CancellationToken ct) => invoices.ListAsync(q, ct);

    /// <summary>Filtrenin tamamının toplamı: matrah, KDV, tevkifat ve genel tutar.</summary>
    [HttpGet("totals")]
    public Task<PurchaseInvoiceTotalsDto> Totals([FromQuery] PurchaseInvoiceQuery q, CancellationToken ct) => invoices.TotalsAsync(q, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] PurchaseInvoiceQuery q, CancellationToken ct)
    {
        var rows = (await invoices.ListAsync(q with { Page = 1, PageSize = QueryExtensions.ExportLimit }, ct, export: true)).Items;
        var t = await invoices.TotalsAsync(q, ct);
        var total = new PurchaseInvoiceDto(0, 0, "Toplam", "", default, null, default, t.Subtotal, t.VatAmount, t.WithholdingAmount, t.Total,
            null, false, null, false, null, []);
        return FileResults.Excel(ExcelExporter.ExportWithTotal("Alınan Faturalar", rows, total,
            new ExcelColumn<PurchaseInvoiceDto>("Tarih", p => p.Id == 0 ? null : p.Date, ExcelExporter.DateFormat),
            new("Tedarikçi", p => p.SupplierTitle),
            new("Fatura No", p => p.InvoiceNo),
            new("Tür", p => p.Id == 0 ? null : KindLabel(p.Kind)),
            new("Matrah", p => p.Subtotal, ExcelExporter.MoneyFormat),
            new("KDV", p => p.VatAmount, ExcelExporter.MoneyFormat),
            new("Tevkifat", p => p.WithholdingAmount, ExcelExporter.MoneyFormat),
            new("Genel Tutar", p => p.Total, ExcelExporter.MoneyFormat),
            new("Seferler", p => string.Join(", ", p.Trips.Select(t => t.ExternalRef ?? t.TripId.ToString()))),
            new("Açıklama", p => p.Notes)), "alinan-faturalar");
    }

    public static string KindLabel(PurchaseInvoiceKind k) => k switch
    {
        PurchaseInvoiceKind.EInvoice => "e-Fatura", PurchaseInvoiceKind.EArchive => "e-Arşiv", PurchaseInvoiceKind.Paper => "Kâğıt", _ => "Fiş",
    };

    [HttpGet("{id:int}")]
    public Task<PurchaseInvoiceDto> Get(int id, CancellationToken ct) => invoices.GetAsync(id, ct);

    /// <summary>Tedarikçinin faturası gelmemiş seferleri; düzenlemede o faturanın kendi seferleri de listelenir.</summary>
    [HttpGet("uninvoiced-trips")]
    public Task<List<UninvoicedCarrierTripDto>> UninvoicedTrips([FromQuery] int supplierId, [FromQuery] int? invoiceId, CancellationToken ct) =>
        invoices.UninvoicedTripsAsync(supplierId, invoiceId, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public Task<PurchaseInvoiceDto> Create(PurchaseInvoiceSaveRequest req, CancellationToken ct) => invoices.CreateAsync(req, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public Task<PurchaseInvoiceDto> Update(int id, PurchaseInvoiceSaveRequest req, CancellationToken ct) => invoices.UpdateAsync(id, req, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/cancel")]
    public Task<PurchaseInvoiceDto> Cancel(int id, PurchaseInvoiceCancelRequest req, CancellationToken ct) => invoices.CancelAsync(id, req.Reason, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await invoices.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Faturanın PDF'i ya da görüntüsü (en fazla 10 MB). Varsa eskisinin yerine geçer.</summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/file")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<PurchaseInvoiceDto> UploadFile(int id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        await invoices.SaveFileAsync(id, stream, file.Length, ct);
        return await invoices.GetAsync(id, ct);
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> File(int id, CancellationToken ct)
    {
        var (content, type) = await invoices.OpenFileAsync(id, ct);
        return File(content, type);
    }
}
