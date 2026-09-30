using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController(ImportService imports) : ControllerBase
{
    private static readonly Dictionary<string, string> Names = new()
    {
        ["suppliers"] = "tedarikci", ["customers"] = "musteri", ["drivers"] = "sofor", ["vehicles"] = "arac", ["trips"] = "sefer",
        ["job-requests"] = "is-talebi", ["invoices"] = "fatura", ["payments"] = "tahsilat", ["supplier-payments"] = "tedarikci-odeme",
        ["expenses"] = "gider", ["cash-accounts"] = "banka-hesabi", ["staff"] = "personel",
    };

    /// <summary>Para kayıtları muhasebe, operasyon kayıtları operasyon yetkisi ister; müşteri ve tedarikçi kartları tüm ofise açık.</summary>
    private bool Allowed(string entity) => entity switch
    {
        "customers" or "suppliers" or "expenses" => true,
        "invoices" or "payments" or "supplier-payments" or "cash-accounts" or "staff" => Policies.AccountingRoles.Any(User.IsInRole),
        _ => Policies.OperationsRoles.Any(User.IsInRole),
    };

    [HttpGet("{entity}/template")]
    public IActionResult Template(string entity)
    {
        if (!Names.TryGetValue(entity, out var name)) throw new NotFoundException("Bilinmeyen aktarım türü.");
        return new FileContentResult(ImportService.Template(entity), FileResults.Xlsx) { FileDownloadName = $"{name}-aktarim-sablonu.xlsx" };
    }

    [HttpPost("{entity}")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ImportResult>> Import(string entity, IFormFile file, [FromQuery] bool dryRun = true, CancellationToken ct = default)
    {
        if (!Names.ContainsKey(entity)) throw new NotFoundException("Bilinmeyen aktarım türü.");
        if (!Allowed(entity)) return Forbid();
        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        ms.Position = 0;
        return await imports.ImportAsync(entity, ms, dryRun, ct);
    }
}
