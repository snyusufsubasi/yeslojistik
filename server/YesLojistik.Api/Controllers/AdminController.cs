using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>
/// Yedek, geri yükleme ve veri sayımı. Yöneticiler panelden, otomatik yedek (GitHub Actions) X-Backup-Token başlığıyla erişir.
/// </summary>
[ApiController]
[Route("api/admin")]
[AllowAnonymous]
public class AdminController(BackupService backups, AppDbContext db, IConfiguration config, MaintenanceState maintenance,
    IHostApplicationLifetime lifetime, ILogger<AdminController> log, GitHubOidcValidator oidc) : ControllerBase
{
    public const string TokenHeader = "X-Backup-Token";

    /// <summary>Yönetici oturumu ya da doğru yedek anahtarı. Anahtar ayarlı değilse (veya 32 karakterden kısaysa) anahtar yolu kapalıdır.</summary>
    private bool Authorized()
    {
        if (User.IsInRole(nameof(UserRole.Admin))) return true;
        var expected = config["Backup:Token"];
        if (string.IsNullOrEmpty(expected) || expected.Length < 32) return false;
        var given = Request.Headers[TokenHeader].ToString();
        return given.Length > 0 && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
    }

    private string Actor => User.Identity?.Name ?? (Request.Headers.ContainsKey(GitHubOidcValidator.Header) ? "otomatik yedek (GitHub)" : "otomatik yedek");

    /// <summary>Yedek indirme: yönetici, yedek anahtarı ya da GitHub Actions kimlik belgesi (yalnız ayarlı depo ve yedek iş akışı).</summary>
    private async Task<bool> BackupAuthorizedAsync(CancellationToken ct) =>
        Authorized() || await oidc.ValidateAsync(Request.Headers[GitHubOidcValidator.Header].ToString(), ct);

    [EnableRateLimiting("backup")]
    [HttpGet("backup")]
    public async Task Backup([FromQuery] bool files = true, CancellationToken ct = default)
    {
        if (!await BackupAuthorizedAsync(ct)) { Response.StatusCode = StatusCodes.Status401Unauthorized; return; }
        var name = $"yeslojistik-{Clock.Now:yyyyMMdd-HHmm}{(files ? "" : "-dosyasiz")}.dump";
        Response.ContentType = "application/octet-stream";
        Response.Headers.ContentDisposition = $"attachment; filename=\"{name}\"";
        await backups.DumpAsync(Response.Body, files, ct);
        db.AuditLogs.Add(new AuditLog { At = DateTime.UtcNow, UserName = Actor, Action = "Backup", EntityType = nameof(CompanySettings), EntityId = 1,
            Label = files ? "Tam yedek alındı" : "Dosyasız yedek alındı" });
        await db.SaveChangesAsync(CancellationToken.None);
        log.LogInformation("Yedek alındı ({Actor}, dosyalar: {Files}).", Actor, files);
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DataStats>> Stats(CancellationToken ct)
    {
        if (!await BackupAuthorizedAsync(ct)) return Unauthorized();
        return await backups.StatsAsync(ct);
    }

    /// <summary>
    /// Yedekten geri yükler. Yalnızca Backup:AllowRestore=true iken açıktır. Bitince uygulama kapanır; platform yeniden başlatır.
    /// </summary>
    [HttpPost("restore")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    public async Task<IActionResult> Restore(IFormFile file, [FromForm] string? confirm, CancellationToken ct)
    {
        if (!config.GetValue<bool>("Backup:AllowRestore")) return NotFound();
        if (!Authorized()) return Unauthorized();
        if (User.IsInRole(nameof(UserRole.Admin)) && confirm?.Trim().ToUpper(new System.Globalization.CultureInfo("tr-TR")) != "GERİ YÜKLE")
            throw new DomainException("Onaylamak için kutuya GERİ YÜKLE yazın.");
        if (file.Length == 0) throw new DomainException("Yedek dosyası boş.");

        var tmp = Path.Combine(Path.GetTempPath(), $"restore-{Guid.NewGuid():N}.dump");
        maintenance.Enable();
        try
        {
            await using (var fs = System.IO.File.Create(tmp)) await file.CopyToAsync(fs, ct);
            await backups.RestoreAsync(tmp, ct);
        }
        catch
        {
            maintenance.Disable();
            throw;
        }
        finally
        {
            System.IO.File.Delete(tmp);
        }
        log.LogWarning("Yedekten geri yükleme yapıldı ({Actor}); uygulama yeniden başlatılıyor.", Actor);
        // Yanıt gittikten sonra kapan: Render / Docker uygulamayı yeniden başlatır, açılışta migration'lar tamamlanır.
        // Testlerde kapatılır (Backup:RestartAfterRestore=false): aynı sunucuyu paylaşan sonraki testler kapanmış sunucuya düşmesin.
        if (config.GetValue("Backup:RestartAfterRestore", true))
            Response.OnCompleted(() => { _ = Task.Delay(1000).ContinueWith(_ => lifetime.StopApplication()); return Task.CompletedTask; });
        return Ok(new { restored = true });
    }
}
