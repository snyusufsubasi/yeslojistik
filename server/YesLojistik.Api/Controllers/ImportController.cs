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
        // Araç, şoför ve sefer aktarımı operasyon yetkisi ister; müşteri ve tedarikçi aktarımı tüm ofis kullanıcılarına açık.
        if (entity is not ("customers" or "suppliers") && !Policies.OperationsRoles.Any(User.IsInRole)) return Forbid();
        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        ms.Position = 0;
        return await imports.ImportAsync(entity, ms, dryRun, ct);
    }
}
