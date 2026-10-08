using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Planlama panosu: satırda araçlar, sütunda günler (varsayılan bugün + 6 gün). Görme yetkisi Sevkiyatlar ile aynı.</summary>
[ApiController]
[Route("api/planning")]
public class PlanningController(PlanningService planning) : ControllerBase
{
    [HttpGet]
    public Task<PlanningDto> Get([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct) =>
        planning.GetAsync(from, to, ct);

    /// <summary>Sevkiyatı (ya da bekleyen iş talebini) araca ve güne atar; zaman çizelgesine "Araç atandı" yazılır.</summary>
    [Authorize(Policy = Policies.Operations)]
    [HttpPost("assign")]
    public Task<PlanningAssignResultDto> Assign(PlanningAssignRequest req, CancellationToken ct) => planning.AssignAsync(req, ct);
}
