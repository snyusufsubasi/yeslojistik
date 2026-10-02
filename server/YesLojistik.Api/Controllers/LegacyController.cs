using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Pratikortam aynası: durum, açma/kapama, yazım istisnaları ve anlık görüntü yükleme (zamanlanmış senkron kullanır).</summary>
[ApiController]
[Authorize]
[Route("api/legacy")]
public class LegacyController(LegacyMirrorService mirror) : ControllerBase
{
    [HttpGet("status")]
    public Task<MirrorStatusDto> Status(CancellationToken ct) => mirror.StatusAsync(ct);

    [Authorize(Policy = Policies.Admin)]
    [HttpPost("mode")]
    public async Task<MirrorStatusDto> Mode(MirrorModeRequest req, CancellationToken ct)
    {
        await mirror.SetModeAsync(req.Enabled, ct);
        return await mirror.StatusAsync(ct);
    }

    [Authorize(Policy = Policies.Admin)]
    [HttpPut("spelling")]
    public Task<Dictionary<string, string>> Spelling(Dictionary<string, string> map, CancellationToken ct) => mirror.SetSpellingAsync(map, ct);

    [Authorize(Policy = Policies.Admin)]
    [HttpPost("mirror")]
    [RequestSizeLimit(20_000_000)]
    public Task<MirrorResult> Mirror(MirrorSnapshot snapshot, [FromQuery] bool dryRun = false, [FromQuery] bool allowLargeRemoval = false,
        CancellationToken ct = default) =>
        mirror.ApplyAsync(snapshot, dryRun, allowLargeRemoval, User.Identity?.Name ?? "senkron", ct);
}
