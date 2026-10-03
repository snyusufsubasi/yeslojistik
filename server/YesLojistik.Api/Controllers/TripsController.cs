using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/trips")]
public class TripsController(TripService trips) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<TripDto>> List([FromQuery] TripQuery q, CancellationToken ct) => trips.ListAsync(q, ct);

    [HttpGet("totals")]
    public Task<TripTotalsDto> Totals([FromQuery] TripQuery q, CancellationToken ct) => trips.TotalsAsync(q, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] TripQuery q, CancellationToken ct)
    {
        var rows = (await trips.ListAsync(q with { Page = 1, PageSize = QueryExtensions.ExportLimit }, ct, export: true)).Items;
        return FileResults.Excel(ExcelExporter.Export("Seferler", rows,
            new ExcelColumn<TripDto>("Yükleme Tarihi", t => t.LoadingDate, ExcelExporter.DateFormat),
            new("Teslim Tarihi", t => t.DeliveryDate, ExcelExporter.DateFormat),
            new("Müşteri", t => t.CustomerTitle),
            new("Yükleme", t => t.LoadingAddress),
            new("Teslimat", t => t.DeliveryAddress),
            new("Plaka", t => t.VehiclePlate),
            new("Şoför", t => t.DriverName),
            new("Durum", t => TripStatusRules.Label(t.Status)),
            new("Satış", t => t.SalePrice, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", t => t.VehicleCost, ExcelExporter.MoneyFormat),
            new("Ürün", t => t.CargoType),
            new("Açıklama", t => t.Description),
            new("Taşeron", t => t.CarrierSupplierTitle),
            new("Komisyon", t => t.Terms?.Commission ?? 0, ExcelExporter.MoneyFormat),
            new("Masraf", t => t.Terms?.ExtraCharge ?? 0, ExcelExporter.MoneyFormat),
            new("Prim", t => t.Terms?.DriverBonus ?? 0, ExcelExporter.MoneyFormat),
            new("Giderler", t => t.ExpenseTotal, ExcelExporter.MoneyFormat),
            new("Kâr", t => t.Profit, ExcelExporter.MoneyFormat),
            new("Fatura", t => t.InvoiceNo),
            new("Fatura Tarihi", t => t.InvoiceDate, ExcelExporter.DateFormat),
            new("Taşeron Fatura", t => t.CarrierInvoiceNo),
            new("Teslim Evrak No", t => t.Terms?.DeliveryDocumentNo),
            new("İrsaliye No", t => t.Terms?.WaybillNo),
            new("Grup", t => t.Terms?.CustomerGroup),
            new("Eski No", t => t.Terms?.ExternalRef),
            new("Kaydı Giren", t => t.CreatedBy)), "seferler");
    }


    /// <summary>Sevkiyat listesi PDF'i (müşteriye gönderilebilir): filtredeki seferler, tutar, KDV, tevkifat ve toplam.</summary>
    [HttpGet("pdf")]
    public async Task<IActionResult> ListPdf([FromQuery] TripQuery q, [FromServices] TripStatementService statements, [FromQuery] bool download,
        CancellationToken ct)
    {
        var (content, name) = await statements.ListPdfAsync(q, ct);
        return download ? File(content, "application/pdf", name) : File(content, "application/pdf");
    }

    /// <summary>İcmal: filtredeki seferlerin müşteri ve ay bazında özeti (JSON, PDF ya da Excel).</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] TripQuery q, [FromServices] TripStatementService statements, [FromQuery] string? format,
        [FromQuery] bool download, CancellationToken ct)
    {
        if (format == "pdf")
        {
            var (content, name) = await statements.SummaryPdfAsync(q, ct);
            return download ? File(content, "application/pdf", name) : File(content, "application/pdf");
        }
        var rows = TripStatementService.Summary(await statements.LinesAsync(q, ct));
        if (format != "xlsx") return Ok(rows);
        var total = new TripSummaryRow(0, "Toplam", 0, 0, rows.Sum(r => r.TripCount), rows.Sum(r => r.Subtotal), rows.Sum(r => r.VatAmount),
            rows.Sum(r => r.WithholdingAmount), rows.Sum(r => r.Total));
        return FileResults.Excel(ExcelExporter.ExportWithTotal("İcmal", rows, total,
            new ExcelColumn<TripSummaryRow>("Müşteri", r => r.Customer),
            new("Ay", r => r.Month == 0 ? null : ReportService.MonthLabel(r.Year, r.Month)),
            new("Sefer", r => r.TripCount),
            new("Matrah", r => r.Subtotal, ExcelExporter.MoneyFormat),
            new("KDV", r => r.VatAmount, ExcelExporter.MoneyFormat),
            new("Tevkifat", r => r.WithholdingAmount, ExcelExporter.MoneyFormat),
            new("Toplam", r => r.Total, ExcelExporter.MoneyFormat)), "icmal");
    }

    /// <summary>Yeni sefer formu önerileri: son sefer, kayıtlı adresler, sık yük cinsleri ve güzergâh fiyatı.</summary>
    [HttpGet("hints")]
    public Task<TripHintsDto> Hints([FromQuery] int? customerId, [FromQuery] string? loadingCity, [FromQuery] string? deliveryCity, CancellationToken ct) =>
        trips.HintsAsync(customerId, loadingCity, deliveryCity, ct);

    [HttpGet("{id:int}")]
    public Task<TripDto> Get(int id, CancellationToken ct) => trips.GetAsync(id, ct);

    /// <summary>Sevk belgesi (irsaliye) PDF'i; fiyat bilgisi içermez.</summary>
    [HttpGet("{id:int}/waybill")]
    public async Task<IActionResult> Waybill(int id, [FromServices] WaybillPdfGenerator pdf, [FromQuery] bool download, CancellationToken ct)
    {
        var (content, name) = await pdf.GenerateAsync(id, ct);
        return download ? File(content, "application/pdf", name) : File(content, "application/pdf");
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public Task<TripDto> Create(TripSaveRequest req, CancellationToken ct) => trips.CreateAsync(req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public Task<TripDto> Update(int id, TripSaveRequest req, CancellationToken ct) => trips.UpdateAsync(id, req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost("{id:int}/status")]
    public Task<TripDto> ChangeStatus(int id, TripStatusRequest req, CancellationToken ct) =>
        trips.ChangeStatusAsync(id, req.Status, Core.Entities.TripEventSource.Panel, null, req.Note, ct, req.ReceivedBy);

    /// <summary>Seçilen seferlerin teslim evrakını onaylar (eski paneldeki "Teslim Evrak Onayla", toplu).</summary>
    [Authorize(Policy = Policies.Operations)]
    [HttpPost("bulk/approve-delivery-documents")]
    public Task<BulkResultDto> ApproveDeliveryDocuments(BulkTripRequest req, CancellationToken ct) =>
        trips.ApproveDeliveryDocumentsAsync(req.TripIds, ct);

    /// <summary>Seçilen seferleri bir sonraki aşamaya geçirir (Yüklendi → Yolda → Teslim Edildi).</summary>
    [Authorize(Policy = Policies.Operations)]
    [HttpPost("bulk/advance-status")]
    public Task<BulkResultDto> AdvanceStatus(BulkTripRequest req, CancellationToken ct) => trips.AdvanceStatusAsync(req.TripIds, ct);

    /// <summary>Durum zaman çizelgesi (ne zaman yüklendi, yola çıktı, teslim edildi).</summary>
    [HttpGet("{id:int}/events")]
    public Task<List<TripEventDto>> Events(int id, CancellationToken ct) => trips.EventsAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await trips.DeleteAsync(id, ct);
        return NoContent();
    }
}
