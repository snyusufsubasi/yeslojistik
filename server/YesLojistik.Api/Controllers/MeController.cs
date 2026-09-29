using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record NotificationPreferenceDto(NotificationType Type, string Label, bool Push);

/// <summary>Giriş yapmış kullanıcının kendi ayarları: telefon bildirim adresi ve bildirim tercihleri (web ve mobil).</summary>
[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(AppDbContext db, ICurrentUser current) : ControllerBase
{
    /// <summary>Telefonun bildirim adresini kaydeder. Aynı telefon başka hesapla kullanılırsa bildirim yeni hesaba taşınır.</summary>
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPush(PushTokenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || req.Token.Length > 200 || !req.Token.StartsWith("ExponentPushToken["))
            throw new DomainException("Geçersiz bildirim adresi.");
        var existing = await db.PushTokens.FirstOrDefaultAsync(p => p.Token == req.Token, ct);
        if (existing == null) db.PushTokens.Add(existing = new PushToken { Token = req.Token });
        existing.UserId = current.Id!.Value;
        existing.Platform = req.Platform?.Length > 20 ? req.Platform[..20] : req.Platform;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("push-token")]
    public async Task<IActionResult> RemovePush([FromQuery] string token, CancellationToken ct)
    {
        await db.PushTokens.Where(p => p.Token == token && p.UserId == current.Id).ExecuteDeleteAsync(ct);
        return NoContent();
    }

    /// <summary>Bildirim türleri ve kullanıcının tercihi (kayıt yoksa rolün varsayılanı). Şoförler için boş liste.</summary>
    [HttpGet("notification-preferences")]
    public async Task<List<NotificationPreferenceDto>> Preferences(CancellationToken ct)
    {
        var role = await db.Users.Where(u => u.Id == current.Id).Select(u => u.Role).FirstAsync(ct);
        if (role == UserRole.Driver) return [];
        var saved = await db.NotificationPreferences.AsNoTracking().Where(p => p.UserId == current.Id).ToDictionaryAsync(p => p.Type, p => p.Push, ct);
        return Enum.GetValues<NotificationType>()
            .Select(t => new NotificationPreferenceDto(t, StaffNotifier.Labels[t], saved.TryGetValue(t, out var on) ? on : NotificationPreference.Default(role, t)))
            .ToList();
    }

    public record PreferenceUpdate(NotificationType Type, bool Push);

    [HttpPut("notification-preferences")]
    public async Task<List<NotificationPreferenceDto>> SavePreferences(List<PreferenceUpdate> req, CancellationToken ct)
    {
        var userId = current.Id!.Value;
        var existing = await db.NotificationPreferences.Where(p => p.UserId == userId).ToListAsync(ct);
        foreach (var r in req.DistinctBy(r => r.Type))
        {
            var row = existing.FirstOrDefault(p => p.Type == r.Type);
            if (row == null) db.NotificationPreferences.Add(new NotificationPreference { UserId = userId, Type = r.Type, Push = r.Push });
            else row.Push = r.Push;
        }
        await db.SaveChangesAsync(ct);
        return await Preferences(ct);
    }
}
