using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = Policies.Admin)]
public class UsersController(AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens, ICurrentUser current) : ControllerBase
{
    [HttpGet]
    public async Task<List<UserDto>> List(CancellationToken ct) =>
        await db.Users.AsNoTracking().OrderBy(u => u.FullName)
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role, u.IsActive, u.CreatedAt, u.DriverId,
                u.Driver != null ? u.Driver.FullName : null, u.LockoutUntil > DateTime.UtcNow ? u.LockoutUntil : null, u.LastLoginAt, u.TotpEnabled)).ToListAsync(ct);

    /// <summary>Hatalı denemeler yüzünden kilitlenen hesabın kilidini açar.</summary>
    [HttpPost("{id:int}/unlock")]
    public async Task<IActionResult> Unlock(int id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        LoginGuard.Reset(user);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Telefonunu ve kurtarma kodlarını kaybeden kullanıcının iki adımlı doğrulamasını kapatır (kullanıcı yeniden kurabilir).</summary>
    [HttpPost("{id:int}/reset-2fa")]
    public async Task<IActionResult> ResetTwoFactor(int id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        if (!user.TotpEnabled) throw new DomainException("Bu kullanıcıda iki adımlı doğrulama zaten kapalı.");
        TwoFactorController.Clear(user);
        db.AuditLogs.Add(TwoFactorService.Audit(user, "TwoFactorDisabled", "İki adımlı doğrulama yönetici tarafından sıfırlandı", current.Name));
        await db.SaveChangesAsync(ct);
        await tokens.RevokeAllAsync(id, ct);
        return NoContent();
    }

    /// <summary>Kullanıcının tüm cihazlardaki oturumlarını kapatır.</summary>
    [HttpPost("{id:int}/sign-out")]
    public async Task<IActionResult> SignOutEverywhere(int id, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(u => u.Id == id, ct)) throw new NotFoundException("Kullanıcı bulunamadı.");
        await tokens.RevokeAllAsync(id, ct);
        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(UserSaveRequest req, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(req.Password)) throw new DomainException("Yeni kullanıcı için şifre zorunlu.");
        var user = new User();
        await ApplyAsync(user, req, ct);
        user.PasswordHash = hasher.HashPassword(user, req.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return ToDto(user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, UserSaveRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        if (id == current.Id && (req.Role != UserRole.Admin || !req.IsActive))
            throw new DomainException("Kendi yönetici yetkinizi kaldıramaz veya hesabınızı pasife alamazsınız.");
        var roleChanged = user.Role != req.Role;
        await ApplyAsync(user, req, ct);
        if (!string.IsNullOrEmpty(req.Password)) user.PasswordHash = hasher.HashPassword(user, req.Password);
        await db.SaveChangesAsync(ct);
        if (!user.IsActive || !string.IsNullOrEmpty(req.Password) || roleChanged) await tokens.RevokeAllAsync(user.Id, ct);
        return ToDto(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (id == current.Id) throw new DomainException("Kendi hesabınızı silemezsiniz.");
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        await tokens.RevokeAllAsync(id, ct);
        return NoContent();
    }

    private async Task ApplyAsync(User u, UserSaveRequest r, CancellationToken ct)
    {
        if (r.Role == UserRole.Driver)
        {
            if (!await db.Drivers.AnyAsync(d => d.Id == r.DriverId, ct)) throw new DomainException("Şoför bulunamadı.");
            if (await db.Users.AnyAsync(x => x.DriverId == r.DriverId && x.Id != u.Id, ct))
                throw new DomainException("Bu şoföre bağlı başka bir kullanıcı hesabı zaten var.");
        }
        u.DriverId = r.Role == UserRole.Driver ? r.DriverId : null;
        u.FullName = r.FullName.Trim();
        u.Email = r.Email.Trim().ToLowerInvariant();
        u.Role = r.Role;
        u.IsActive = r.IsActive;
    }

    private static UserDto ToDto(User u) => new(u.Id, u.FullName, u.Email, u.Role, u.IsActive, u.CreatedAt, u.DriverId);
}
