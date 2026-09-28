using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>İşlem geçmişi: kim, ne zaman, neyi değiştirdi. Yalnızca yönetici.</summary>
[ApiController]
[Route("api/audit")]
[Authorize(Policy = Policies.Admin)]
public class AuditController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<AuditLogDto>> List([FromQuery] AuditQuery q, CancellationToken ct)
    {
        var query = db.AuditLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q.EntityType)) query = query.Where(a => a.EntityType == q.EntityType);
        if (q.EntityId is { } id) query = query.Where(a => a.EntityId == id);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(a => EF.Functions.ILike(a.Label ?? "", like) || EF.Functions.ILike(a.UserName ?? "", like)
                || EF.Functions.ILike(a.Changes ?? "", like));
        var (items, total, page, size) = await query.OrderByDescending(a => a.Id)
            .Select(a => new AuditLogDto(a.Id, a.At, a.UserName, a.Action, a.EntityType, a.EntityId, a.Label, a.Changes))
            .PageAsync(q, ct);
        return new PagedResult<AuditLogDto>(items, total, page, size);
    }
}
