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
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role, u.IsActive, u.CreatedAt)).ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(UserSaveRequest req, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(req.Password)) throw new DomainException("Yeni kullanıcı için şifre zorunlu.");
        var user = new User();
        Apply(user, req);
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
        Apply(user, req);
        if (!string.IsNullOrEmpty(req.Password)) user.PasswordHash = hasher.HashPassword(user, req.Password);
        await db.SaveChangesAsync(ct);
        if (!user.IsActive || !string.IsNullOrEmpty(req.Password)) await tokens.RevokeAllAsync(user.Id, ct);
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

    private static void Apply(User u, UserSaveRequest r)
    {
        u.FullName = r.FullName.Trim();
        u.Email = r.Email.Trim().ToLowerInvariant();
        u.Role = r.Role;
        u.IsActive = r.IsActive;
    }

    private static UserDto ToDto(User u) => new(u.Id, u.FullName, u.Email, u.Role, u.IsActive, u.CreatedAt);
}
