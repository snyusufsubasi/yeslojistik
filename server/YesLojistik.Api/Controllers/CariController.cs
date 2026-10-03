using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Cari tabloları: bütün müşterilerin / tedarikçilerin bakiyesi tek listede.</summary>
[ApiController]
[Route("api/cari")]
[Authorize(Policy = Policies.Accounting)]
public class CariController(CariService cari) : ControllerBase
{
    [HttpGet("customers")]
    public Task<List<CustomerCariRow>> Customers(CancellationToken ct) => cari.CustomersAsync(ct);

    [HttpGet("suppliers")]
    public Task<List<SupplierCariRow>> Suppliers(CancellationToken ct) => cari.SuppliersAsync(ct);

    /// <summary>Müşteriler cari tablosu, ekrandaki süzgeç/arama/sıralamayla: format=pdf ya da Excel (varsayılan).</summary>
    [HttpGet("customers/export")]
    public async Task<IActionResult> ExportCustomers([FromQuery] CariExportQuery q, [FromQuery] string? format, [FromQuery] bool download, CancellationToken ct) =>
        Result(await cari.ExportCustomersAsync(q, format, ct), download);

    /// <summary>Tedarikçiler cari tablosu, ekrandaki süzgeç/arama/sıralamayla: format=pdf ya da Excel (varsayılan).</summary>
    [HttpGet("suppliers/export")]
    public async Task<IActionResult> ExportSuppliers([FromQuery] CariExportQuery q, [FromQuery] string? format, [FromQuery] bool download, CancellationToken ct) =>
        Result(await cari.ExportSuppliersAsync(q, format, ct), download);

    // PDF yeni sekmede açılır (download=true ise iner); Excel her zaman iner.
    private FileContentResult Result((byte[] Content, string FileName, string ContentType) f, bool download) =>
        f.ContentType == "application/pdf" && !download ? File(f.Content, f.ContentType) : File(f.Content, f.ContentType, f.FileName);
}
