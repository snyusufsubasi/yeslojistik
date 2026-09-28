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
public class AuthController(AppDbContext db, TokenService tokens, IPasswordHasher<User> hasher, ICurrentUser current) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<ActionResult<CurrentUserDto>> Login(LoginRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        var result = user == null ? PasswordVerificationResult.Failed : hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (user == null || result == PasswordVerificationResult.Failed)
            return Problem(title: "E-posta veya şifre hatalı.", statusCode: StatusCodes.Status401Unauthorized);
        if (!user.IsActive)
            return Problem(title: "Hesabınız pasif durumda. Yöneticinizle iletişime geçin.", statusCode: StatusCodes.Status403Forbidden);

        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, req.Password);
        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await IssueAsync(user, ct);
        return ToDto(user);
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
        if (token != null) await tokens.ConsumeRefreshTokenAsync(token, ct);
        TokenService.ClearCookies(HttpContext);
        return NoContent();
    }

    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == current.Id, ct);
        if (user is not { IsActive: true }) return Unauthorized();
        return ToDto(user);
    }

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

    private async Task IssueAsync(User user, CancellationToken ct)
    {
        var refresh = await tokens.CreateRefreshTokenAsync(user, ct);
        tokens.WriteCookies(HttpContext, tokens.CreateAccessToken(user), refresh);
    }

    private static CurrentUserDto ToDto(User u) => new(u.Id, u.FullName, u.Email, u.Role);
}
