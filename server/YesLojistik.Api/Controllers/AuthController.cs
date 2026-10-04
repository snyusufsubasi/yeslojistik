using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens, IPasswordHasher<User> hasher, ICurrentUser current,
    IEmailSender email, IConfiguration config, ILogger<AuthController> log, TwoFactorService twoFactor) : ControllerBase
{
    public const int MaxFailedLogins = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Ortak giriş kontrolü: şifre, pasif hesap ve kilit. 15 dakika içinde 5 hatalı denemede hesap 15 dakika kilitlenir;
    /// başarılı girişte sayaç sıfırlanır. İki adımlı doğrulaması açık hesapta sayaç ve son giriş zamanı ikinci adım
    /// (/api/auth/2fa/verify) bitince güncellenir; böylece şifre bilen biri kod denemelerini sıfırlayamaz.
    /// </summary>
    private async Task<(User? User, ObjectResult? Error)> VerifyAsync(LoginRequest req, CancellationToken ct)
    {
        var mail = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == mail, ct);
        if (user == null)
            return (null, Problem(title: "E-posta veya şifre hatalı.", statusCode: StatusCodes.Status401Unauthorized));
        var now = DateTime.UtcNow;
        if (LoginGuard.IsLocked(user, now))
            return (null, Problem(title: "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin ya da yöneticinizden kilidi açmasını isteyin.",
                statusCode: StatusCodes.Status429TooManyRequests));
        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            if (LoginGuard.RegisterFailure(user, now))
            {
                db.AuditLogs.Add(TwoFactorService.Audit(user, "AccountLocked", "Hatalı şifre nedeniyle hesap 15 dakika kilitlendi", "sistem"));
                log.LogWarning("Hesap kilitlendi: kullanıcı {UserId}", user.Id);
            }
            await db.SaveChangesAsync(ct);
            return (null, Problem(title: "E-posta veya şifre hatalı.", statusCode: StatusCodes.Status401Unauthorized));
        }
        if (!user.IsActive)
            return (null, Problem(title: "Hesabınız pasif durumda. Yöneticinizle iletişime geçin.", statusCode: StatusCodes.Status403Forbidden));
        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, req.Password);
        if (!user.TotpEnabled)
        {
            LoginGuard.Reset(user);
            user.LastLoginAt = now;
        }
        await db.SaveChangesAsync(ct);
        return (user, null);
    }

    /// <summary>İki adımlı doğrulaması açık hesap için oturum yerine kısa ömürlü meydan okuma belirteci döner.</summary>
    private IActionResult TwoFactorChallenge(User user, bool mobile) =>
        Ok(new TwoFactorRequiredResponse(true, twoFactor.CreateChallenge(user.Id, mobile, DateTime.UtcNow)));

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        var (user, error) = await VerifyAsync(req, ct);
        if (user == null) return error!;
        if (user.TotpEnabled) return TwoFactorChallenge(user, mobile: false);
        await IssueAsync(user, ct);
        return Ok(ToDto(user));
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<CurrentUserDto>> Refresh(CancellationToken ct)
    {
        var token = Request.Cookies[TokenService.RefreshCookie];
        var user = token == null ? null : await tokens.ConsumeRefreshTokenAsync(token, ct);
        if (user == null)
        {
            TokenService.ClearCookies(HttpContext);
            return Problem(title: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.", statusCode: StatusCodes.Status401Unauthorized);
        }
        await IssueAsync(user, ct);
        return ToDto(user);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var token = Request.Cookies[TokenService.RefreshCookie];
        if (token != null) await tokens.RevokeAsync(token, ct);
        TokenService.ClearCookies(HttpContext);
        return NoContent();
    }

    /// <summary>Mobil uygulama girişi: token'ları cookie yerine gövdede döner.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("token")]
    public async Task<IActionResult> Token(LoginRequest req, CancellationToken ct)
    {
        var (user, error) = await VerifyAsync(req, ct);
        if (user == null) return error!;
        if (user.TotpEnabled) return TwoFactorChallenge(user, mobile: true);
        return Ok(await TokenResponseAsync(user, ct));
    }

    [AllowAnonymous]
    [HttpPost("token/refresh")]
    public async Task<ActionResult<TokenLoginResponse>> TokenRefresh(RefreshTokenRequest req, CancellationToken ct)
    {
        var user = await tokens.ConsumeRefreshTokenAsync(req.RefreshToken, ct);
        if (user == null) return Problem(title: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.", statusCode: StatusCodes.Status401Unauthorized);
        return await TokenResponseAsync(user, ct);
    }

    [AllowAnonymous]
    [HttpPost("token/revoke")]
    public async Task<IActionResult> TokenRevoke(RefreshTokenRequest req, CancellationToken ct)
    {
        await tokens.RevokeAsync(req.RefreshToken, ct);
        return NoContent();
    }

    private async Task<TokenLoginResponse> TokenResponseAsync(User user, CancellationToken ct) =>
        new(tokens.CreateAccessToken(user), await tokens.CreateRefreshTokenAsync(user, ct), tokens.AccessTokenExpiry(), ToDto(user));

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == current.Id, ct);
        if (user is not { IsActive: true }) return Unauthorized();
        return ToDto(user);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstAsync(u => u.Id == current.Id, ct);
        if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            return Problem(title: "Mevcut şifre hatalı.", statusCode: StatusCodes.Status400BadRequest);
        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        await db.SaveChangesAsync(ct);
        await tokens.RevokeAllAsync(user.Id, ct);
        await IssueAsync(user, ct);
        return NoContent();
    }

    /// <summary>
    /// "Şifremi unuttum": her durumda 200 döner (hesabın var olup olmadığı belli olmaz). Hesap varsa ve e-posta ayarlıysa
    /// 30 dakika geçerli, tek kullanımlık bağlantı gönderilir.
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("forgot-password")]
    public async Task<object> ForgotPassword(ForgotPasswordRequest req, CancellationToken ct)
    {
        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == mail && u.IsActive, ct);
        if (user != null && email.IsConfigured)
        {
            var raw = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            await db.PasswordResetTokens.Where(t => t.UserId == user.Id && t.UsedAt == null).ExecuteDeleteAsync(ct);
            db.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id, TokenHash = TokenService.Hash(raw), CreatedAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            });
            await db.SaveChangesAsync(ct);
            var configured = config["App:PublicUrl"];
            var baseUrl = string.IsNullOrWhiteSpace(configured) ? $"{Request.Scheme}://{Request.Host}" : configured.TrimEnd('/');
            var company = await db.CompanySettings.AsNoTracking().Select(c => c.CompanyName).FirstAsync(ct);
            await email.SendAsync(new EmailMessage(user.Email, $"{company} – şifre sıfırlama",
                $"Merhaba {user.FullName},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı 30 dakika içinde açın:\n\n{baseUrl}/sifre-sifirla?token={raw}\n\n" +
                "Bu isteği siz yapmadıysanız bu e-postayı yok sayın; şifreniz değişmez.", []), ct);
        }
        return new { emailEnabled = email.IsConfigured };
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req, CancellationToken ct)
    {
        var hash = TokenService.Hash(req.Token);
        var token = await db.PasswordResetTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token == null || token.UsedAt != null || token.ExpiresAt < DateTime.UtcNow || !token.User.IsActive)
            return Problem(title: "Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeniden \"Şifremi unuttum\" deyin.", statusCode: StatusCodes.Status400BadRequest);
        token.UsedAt = DateTime.UtcNow;
        token.User.PasswordHash = hasher.HashPassword(token.User, req.NewPassword);
        LoginGuard.Reset(token.User);
        await db.SaveChangesAsync(ct);
        await tokens.RevokeAllAsync(token.User.Id, ct);
        return NoContent();
    }

    private async Task IssueAsync(User user, CancellationToken ct)
    {
        var refresh = await tokens.CreateRefreshTokenAsync(user, ct);
        tokens.WriteCookies(HttpContext, tokens.CreateAccessToken(user), refresh);
    }

    private static CurrentUserDto ToDto(User u) => new(u.Id, u.FullName, u.Email, u.Role);
}
