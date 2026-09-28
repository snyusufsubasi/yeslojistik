using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api")]
public class TrackingController(TrackingService tracking, IConfiguration config) : ControllerBase
{
    [HttpGet("tracking/vehicles")]
    public Task<List<VehicleLocationDto>> Vehicles(CancellationToken ct) => tracking.VehiclesAsync(ct);

    [HttpGet("trips/{id:int}/route")]
    public Task<List<RoutePointDto>> Route(int id, CancellationToken ct) => tracking.RouteAsync(id, ct);

    /// <summary>Müşteriye gönderilecek takip linkini oluşturur (varsa mevcut olanı döner).</summary>
    [HttpPost("trips/{id:int}/tracking-link")]
    public async Task<TrackingLinkDto> Link(int id, CancellationToken ct)
    {
        var token = await tracking.GetOrCreateTokenAsync(id, ct);
        var baseUrl = config["App:PublicUrl"]?.TrimEnd('/') ?? $"{Request.Scheme}://{Request.Host}";
        return new TrackingLinkDto(token, $"{baseUrl}/takip/{token}");
    }

    [AllowAnonymous]
    [EnableRateLimiting("public")]
    [HttpGet("public/track/{token}")]
    public async Task<ActionResult<PublicTrackingDto>> Public(string token, CancellationToken ct) =>
        await tracking.PublicAsync(token, ct) is { } dto ? dto : NotFound(new ProblemDetails { Status = 404, Title = "Takip linki geçersiz veya süresi dolmuş." });
}
