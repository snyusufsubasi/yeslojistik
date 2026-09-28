using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/invoices")]
public class InvoicesController(InvoiceService invoices, InvoicePdfGenerator pdf, InvoiceMailer mailer) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<InvoiceDto>> List([FromQuery] InvoiceQuery q, CancellationToken ct) => invoices.ListAsync(q, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] InvoiceQuery q, CancellationToken ct)
    {
        var rows = (await invoices.ListAsync(q with { Page = 1, PageSize = QueryExtensions.MaxPageSize }, ct)).Items;
        return FileResults.Excel(ExcelExporter.Export("Faturalar", rows,
            new ExcelColumn<InvoiceDto>("Fatura No", i => i.InvoiceNo),
            new("Tarih", i => i.Date, ExcelExporter.DateFormat),
            new("Vade", i => i.DueDate, ExcelExporter.DateFormat),
            new("Müşteri", i => i.CustomerTitle),
            new("Ara Toplam", i => i.Subtotal, ExcelExporter.MoneyFormat),
            new("KDV", i => i.VatAmount, ExcelExporter.MoneyFormat),
            new("Tevkifat", i => i.WithholdingAmount, ExcelExporter.MoneyFormat),
            new("Toplam", i => i.Total, ExcelExporter.MoneyFormat),
            new("Tahsil Edilen", i => i.Paid, ExcelExporter.MoneyFormat),
            new("Kalan", i => i.Remaining, ExcelExporter.MoneyFormat),
            new("Durum", i => i.PaymentStatus)), "faturalar");
    }

    [HttpGet("{id:int}")]
    public Task<InvoiceDto> Get(int id, CancellationToken ct) => invoices.GetAsync(id, ct);

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> Pdf(int id, [FromQuery] bool download, CancellationToken ct)
    {
        var (content, name) = await pdf.GenerateAsync(id, ct);
        return download ? File(content, "application/pdf", name) : File(content, "application/pdf");
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public Task<InvoiceDto> Create(InvoiceCreateRequest req, CancellationToken ct) => invoices.CreateAsync(req, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/email")]
    public async Task<object> Email(int id, InvoiceEmailRequest req, CancellationToken ct) =>
        new { sentTo = await mailer.SendAsync(id, req.To, req.Message, ct) };

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/issue")]
    public Task<InvoiceDto> Issue(int id, CancellationToken ct) => invoices.IssueAsync(id, ct);

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/cancel")]
    public Task<InvoiceDto> Cancel(int id, CancellationToken ct) => invoices.CancelAsync(id, ct);
}
