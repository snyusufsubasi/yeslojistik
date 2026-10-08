using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Sevkiyat şablonları (sık tekrarlanan işler). Şablondan açılan form normal sevkiyat kaydıyla (POST /api/trips) kaydedilir.</summary>
[ApiController]
[Route("api/trip-templates")]
public class TripTemplatesController(TripTemplateService templates) : ControllerBase
{
    [HttpGet]
    public Task<List<TripTemplateDto>> List([FromQuery] int? customerId, CancellationToken ct) => templates.ListAsync(customerId, ct);

    [HttpGet("{id:int}")]
    public Task<TripTemplateDto> Get(int id, CancellationToken ct) => templates.GetAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public Task<TripTemplateDto> Create(TripTemplateSaveRequest req, CancellationToken ct) => templates.CreateAsync(req, ct);

    public record RenameRequest(string Name);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<TripTemplateDto> Rename(int id, RenameRequest req, CancellationToken ct)
    {
        await templates.RenameAsync(id, req.Name, ct);
        return await templates.GetAsync(id, ct);
    }

    /// <summary>Şablondan yeni sevkiyat formu açıldı: kullanım sayacı artar.</summary>
    [Authorize(Policy = Policies.Operations)]
    [HttpPost("{id:int}/use")]
    public Task<TripTemplateDto> Use(int id, CancellationToken ct) => templates.MarkUsedAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await templates.DeleteAsync(id, ct);
        return NoContent();
    }
}
