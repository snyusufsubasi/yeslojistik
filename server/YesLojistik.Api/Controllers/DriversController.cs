using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record DriverQuery : ListQuery
{
    public bool? Active { get; init; }
}

[ApiController]
[Route("api/drivers")]
public class DriversController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Driver, object?>>> SortMap = new()
    {
        ["fullName"] = d => d.FullName,
        ["srcExpiry"] = d => d.SrcExpiry,
        ["licenseExpiry"] = d => d.LicenseExpiry,
        ["isActive"] = d => d.IsActive,
    };

    private static readonly Expression<Func<Driver, DriverDto>> Projection = d => new DriverDto(d.Id, d.FullName, d.Phone,
        d.NationalId, d.LicenseClass, d.LicenseExpiry, d.SrcExpiry, d.PsychotechnicExpiry, d.IsActive);

    [HttpGet]
    public async Task<PagedResult<DriverDto>> List([FromQuery] DriverQuery q, CancellationToken ct)
    {
        var query = db.Drivers.AsNoTracking();
        if (q.Active is { } a) query = query.Where(d => d.IsActive == a);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(d => EF.Functions.ILike(d.FullName, like) || EF.Functions.ILike(d.Phone ?? "", like));
        var (items, total, page, size) = await query.ApplySort(q.Sort, q.Desc, SortMap, "fullName", defaultDesc: false)
            .Select(Projection).PageAsync(q, ct);
        return new PagedResult<DriverDto>(items, total, page, size);
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup(CancellationToken ct) =>
        await db.Drivers.AsNoTracking().Where(d => d.IsActive).OrderBy(d => d.FullName)
            .Select(d => new LookupItem(d.Id, d.FullName, d.Phone)).ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<DriverDto> Get(int id, CancellationToken ct) =>
        await db.Drivers.AsNoTracking().Where(d => d.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Şoför bulunamadı.");

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public async Task<DriverDto> Create(DriverSaveRequest req, CancellationToken ct)
    {
        var d = new Driver();
        Apply(d, req);
        db.Drivers.Add(d);
        await db.SaveChangesAsync(ct);
        return await Get(d.Id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<DriverDto> Update(int id, DriverSaveRequest req, CancellationToken ct)
    {
        var d = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şoför bulunamadı.");
        Apply(d, req);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var d = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şoför bulunamadı.");
        if (await db.Trips.IgnoreQueryFilters().AnyAsync(t => t.DriverId == id, ct))
            throw new DomainException("Seferlerde görev almış şoför silinemez. Bunun yerine pasife alın.");
        d.IsDeleted = true;
        await db.Vehicles.Where(v => v.DefaultDriverId == id).ExecuteUpdateAsync(s => s.SetProperty(v => v.DefaultDriverId, (int?)null), ct);
        // Şoföre bağlı mobil uygulama hesabı varsa pasife al.
        await db.Users.Where(u => u.DriverId == id).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false).SetProperty(u => u.DriverId, (int?)null), ct);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Driver d, DriverSaveRequest r)
    {
        d.FullName = r.FullName.Trim();
        d.Phone = Formatters.NormalizePhone(r.Phone);
        d.NationalId = CustomersController.NullIfEmpty(r.NationalId);
        d.LicenseClass = CustomersController.NullIfEmpty(r.LicenseClass)?.ToUpperInvariant();
        d.LicenseExpiry = r.LicenseExpiry;
        d.SrcExpiry = r.SrcExpiry;
        d.PsychotechnicExpiry = r.PsychotechnicExpiry;
        d.IsActive = r.IsActive;
    }
}
