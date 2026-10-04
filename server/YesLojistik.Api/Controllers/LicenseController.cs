using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Licensing;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record LicenseStatusDto(string State, string? Plan, string? Customer, int VehicleLimit, int VehicleCount, DateTimeOffset? ExpiresAt,
    int? DaysLeft, string[] Features, string? Message, string Source, bool ReadOnly, string? InstanceId, int GraceDays);

public record LicenseApplyRequest(string? Key);

[ApiController]
[Route("api/license")]
public class LicenseController(LicenseService license) : ControllerBase
{
    /// <summary>Herhangi bir giriş yapmış kullanıcı (banner için). Anahtarın kendisi hiçbir zaman döndürülmez.</summary>
    [Authorize]
    [HttpGet("status")]
    public async Task<LicenseStatusDto> Status(CancellationToken ct) => await BuildAsync(await license.CurrentAsync(ct), ct);

    [Authorize(Policy = Policies.Admin)]
    [HttpPost("apply")]
    public async Task<LicenseStatusDto> Apply(LicenseApplyRequest req, CancellationToken ct) =>
        await BuildAsync(await license.ApplyAsync(req.Key, ct), ct);

    private async Task<LicenseStatusDto> BuildAsync(LicenseInfo info, CancellationToken ct)
    {
        var p = info.Payload;
        return new LicenseStatusDto(info.State, p?.Plan, p?.Customer, info.VehicleLimit, await license.VehicleCountAsync(ct), p?.ExpiresAt,
            info.DaysLeft, p?.Features ?? [], info.Error, info.Source, info.ReadOnly, license.InstanceId, LicenseInfo.GraceDays);
    }
}
