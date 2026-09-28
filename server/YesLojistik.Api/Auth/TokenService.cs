using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Auth;

public class TokenService(AppDbContext db, IOptions<JwtOptions> options)
{
    public const string AccessCookie = "yl_at";
    public const string RefreshCookie = "yl_rt";
    public const string RefreshCookiePath = "/api/auth";

    private readonly JwtOptions _opt = options.Value;

    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public string CreateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(_opt.Issuer, _opt.Audience, claims,
            expires: DateTime.UtcNow.AddMinutes(_opt.AccessTokenMinutes), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<string> CreateRefreshTokenAsync(User user, CancellationToken ct)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id, TokenHash = Hash(token), CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_opt.RefreshTokenDays),
        });
        // Süresi dolmuş eski token'ları temizle.
        await db.RefreshTokens.Where(t => t.UserId == user.Id && (t.ExpiresAt < DateTime.UtcNow || t.RevokedAt != null)).ExecuteDeleteAsync(ct);
        await db.SaveChangesAsync(ct);
        return token;
    }

    /// <summary>Refresh token'ı doğrular ve iptal eder (rotation). Geçerliyse kullanıcıyı döner.</summary>
    public async Task<User?> ConsumeRefreshTokenAsync(string token, CancellationToken ct)
    {
        var hash = Hash(token);
        var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored == null || stored.RevokedAt != null || stored.ExpiresAt < DateTime.UtcNow) return null;
        stored.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return stored.User is { IsActive: true, IsDeleted: false } ? stored.User : null;
    }

    public async Task RevokeAllAsync(int userId, CancellationToken ct) =>
        await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);

    public void WriteCookies(HttpContext http, string access, string refresh)
    {
        var secure = _opt.SecureCookies ?? http.Request.IsHttps;
        http.Response.Cookies.Append(AccessCookie, access, new CookieOptions
        {
            HttpOnly = true, Secure = secure, SameSite = SameSiteMode.Strict, Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(_opt.RefreshTokenDays),
        });
        http.Response.Cookies.Append(RefreshCookie, refresh, new CookieOptions
        {
            HttpOnly = true, Secure = secure, SameSite = SameSiteMode.Strict, Path = RefreshCookiePath,
            Expires = DateTimeOffset.UtcNow.AddDays(_opt.RefreshTokenDays),
        });
    }

    public static void ClearCookies(HttpContext http)
    {
        http.Response.Cookies.Delete(AccessCookie, new CookieOptions { Path = "/" });
        http.Response.Cookies.Delete(RefreshCookie, new CookieOptions { Path = RefreshCookiePath });
    }
}
