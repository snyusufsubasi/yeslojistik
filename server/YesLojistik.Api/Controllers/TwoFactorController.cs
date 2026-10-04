using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

public record TwoFactorStatusDto(bool Available, bool Enabled, int RecoveryCodesLeft, DateTime? EnabledAt);
public record TwoFactorSetupDto(string Secret, string OtpAuthUri);
public record TwoFactorCodeRequest(string Code);
public record TwoFactorDisableRequest(string Password, string Code);
public record TwoFactorVerifyRequest(string ChallengeToken, string Code);
public record TwoFactorEnabledDto(List<string> RecoveryCodes);

/// <summary>
/// İki adımlı doğrulama (TOTP). Yalnızca ofis kullanıcıları açabilir; şoför rolü mobil uygulamayı aynı girişle kullandığı için dışarıda kalır.
/// Giriş: /api/auth/login (ya da /token) "twoFactorRequired" döner, sonra /api/auth/2fa/verify oturumu açar.
/// </summary>
[ApiController]
[Route("api/auth/2fa")]
public class TwoFactorController(AppDbContext db, TwoFactorService twoFactor, TokenService tokens, IPasswordHasher<User> hasher,
    ICurrentUser current, ILogger<TwoFactorController> log) : ControllerBase
{
    private async Task<User> MeAsync(CancellationToken ct) =>
        await db.Users.FirstOrDefaultAsync(u => u.Id == current.Id && u.IsActive, ct) ?? throw new NotFoundException("Kullanıcı bulunamadı.");

    private static void EnsureAllowed(User u)
    {
        if (u.Role == UserRole.Driver) throw new DomainException("Şoför hesaplarında iki adımlı doğrulama kullanılamaz.");
    }

    [HttpGet("status")]
    public async Task<TwoFactorStatusDto> Status(CancellationToken ct)
    {
        var u = await MeAsync(ct);
        return new TwoFactorStatusDto(u.Role != UserRole.Driver, u.TotpEnabled, u.TotpEnabled ? TwoFactorService.RecoveryCodesLeft(u) : 0, u.TotpEnabledAt);
    }

    /// <summary>Yeni anahtar üretir (henüz açık değildir; kod doğrulanınca açılır).</summary>
    [HttpPost("setup")]
    public async Task<TwoFactorSetupDto> Setup(CancellationToken ct)
    {
        var u = await MeAsync(ct);
        EnsureAllowed(u);
        if (u.TotpEnabled) throw new DomainException("İki adımlı doğrulama zaten açık. Yeniden kurmak için önce kapatın.");
        var secret = Totp.NewSecret();
        u.TotpSecretEnc = twoFactor.EncryptSecret(secret);
        u.TotpLastStep = null;
        await db.SaveChangesAsync(ct);
        var company = await db.CompanySettings.AsNoTracking().Select(c => c.CompanyName).FirstOrDefaultAsync(ct);
        var b32 = Totp.ToBase32(secret);
        return new TwoFactorSetupDto(b32, Totp.OtpAuthUri(string.IsNullOrWhiteSpace(company) ? TwoFactorService.Issuer : company, u.Email, b32));
    }

    /// <summary>Uygulamadaki kodu doğrular, iki adımlı doğrulamayı açar ve 10 kurtarma kodu verir (bir kez gösterilir).</summary>
    [HttpPost("enable")]
    public async Task<TwoFactorEnabledDto> Enable(TwoFactorCodeRequest req, CancellationToken ct)
    {
        var u = await MeAsync(ct);
        EnsureAllowed(u);
        if (u.TotpEnabled) throw new DomainException("İki adımlı doğrulama zaten açık.");
        var secret = twoFactor.DecryptSecret(u.TotpSecretEnc) ?? throw new DomainException("Önce kurulumu başlatın.");
        var step = Totp.Verify(secret, req.Code, DateTime.UtcNow);
        if (step == null) throw new DomainException("Kod hatalı ya da süresi dolmuş. Uygulamadaki güncel kodu girin.");
        var (plain, hashes) = twoFactor.NewRecoveryCodes();
        u.TotpEnabled = true;
        u.TotpEnabledAt = DateTime.UtcNow;
        u.TotpLastStep = step;
        u.TotpRecoveryHashes = hashes;
        db.AuditLogs.Add(TwoFactorService.Audit(u, "TwoFactorEnabled", "İki adımlı doğrulama açıldı"));
        await db.SaveChangesAsync(ct);
        return new TwoFactorEnabledDto(plain);
    }

    /// <summary>Kapatmak için şifre ve güncel kod (ya da kurtarma kodu) gerekir; hatalı denemeler hesabı kilitleyebilir.</summary>
    [HttpPost("disable")]
    public async Task<IActionResult> Disable(TwoFactorDisableRequest req, CancellationToken ct)
    {
        var u = await MeAsync(ct);
        if (!u.TotpEnabled) throw new DomainException("İki adımlı doğrulama zaten kapalı.");
        if (LoginGuard.IsLocked(u, DateTime.UtcNow))
            return Problem(title: "Çok fazla hatalı deneme yapıldı. Biraz sonra tekrar deneyin.", statusCode: StatusCodes.Status429TooManyRequests);
        var passwordOk = hasher.VerifyHashedPassword(u, u.PasswordHash, req.Password ?? "") != PasswordVerificationResult.Failed;
        var codeOk = twoFactor.VerifyCodeOrRecovery(u, req.Code, DateTime.UtcNow, out _);
        if (!passwordOk || !codeOk)
        {
            var locked = LoginGuard.RegisterFailure(u, DateTime.UtcNow);
            db.AuditLogs.Add(TwoFactorService.Audit(u, "LoginFailed", "İki adımlı doğrulama kapatılamadı: şifre ya da kod hatalı"));
            if (locked) db.AuditLogs.Add(TwoFactorService.Audit(u, "AccountLocked", "Hesap 15 dakika kilitlendi"));
            await db.SaveChangesAsync(ct);
            throw new DomainException("Şifre ya da kod hatalı.");
        }
        Clear(u);
        LoginGuard.Reset(u);
        db.AuditLogs.Add(TwoFactorService.Audit(u, "TwoFactorDisabled", "İki adımlı doğrulama kapatıldı"));
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Girişin ikinci adımı: meydan okuma belirteci + uygulama kodu (ya da kurtarma kodu). Doğruysa oturum açılır.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("verify")]
    public async Task<IActionResult> Verify(TwoFactorVerifyRequest req, CancellationToken ct)
    {
        const string expired = "Doğrulama süresi doldu. Lütfen şifrenizle yeniden giriş yapın.";
        var now = DateTime.UtcNow;
        var challenge = twoFactor.ReadChallenge(req.ChallengeToken, now);
        if (challenge == null) return Problem(title: expired, statusCode: StatusCodes.Status401Unauthorized);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == challenge.Value.UserId, ct);
        if (user is not { IsActive: true, TotpEnabled: true }) return Problem(title: expired, statusCode: StatusCodes.Status401Unauthorized);
        if (LoginGuard.IsLocked(user, now))
            return Problem(title: "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin ya da yöneticinizden yardım isteyin.",
                statusCode: StatusCodes.Status429TooManyRequests);

        if (!twoFactor.VerifyCodeOrRecovery(user, req.Code, now, out var usedRecovery))
        {
            var locked = LoginGuard.RegisterFailure(user, now);
            db.AuditLogs.Add(TwoFactorService.Audit(user, "LoginFailed", "Giriş: iki adımlı doğrulama kodu hatalı"));
            if (locked)
            {
                db.AuditLogs.Add(TwoFactorService.Audit(user, "AccountLocked", "Hesap 15 dakika kilitlendi"));
                log.LogWarning("Hesap kilitlendi (2FA): kullanıcı {UserId}", user.Id);
            }
            await db.SaveChangesAsync(ct);
            return Problem(title: "Kod hatalı ya da süresi dolmuş.", statusCode: StatusCodes.Status401Unauthorized);
        }

        LoginGuard.Reset(user);
        user.LastLoginAt = now;
        if (usedRecovery)
            db.AuditLogs.Add(TwoFactorService.Audit(user, "LoginRecovery",
                $"Kurtarma koduyla giriş yapıldı ({TwoFactorService.RecoveryCodesLeft(user)} kod kaldı)"));
        await db.SaveChangesAsync(ct);

        var dto = new CurrentUserDto(user.Id, user.FullName, user.Email, user.Role);
        if (challenge.Value.Mobile)
            return Ok(new TokenLoginResponse(tokens.CreateAccessToken(user), await tokens.CreateRefreshTokenAsync(user, ct), tokens.AccessTokenExpiry(), dto));
        tokens.WriteCookies(HttpContext, tokens.CreateAccessToken(user), await tokens.CreateRefreshTokenAsync(user, ct));
        return Ok(dto);
    }

    public static void Clear(User u)
    {
        u.TotpEnabled = false;
        u.TotpSecretEnc = null;
        u.TotpLastStep = null;
        u.TotpRecoveryHashes = null;
        u.TotpEnabledAt = null;
    }
}
