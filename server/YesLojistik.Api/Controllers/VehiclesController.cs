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

public record VehicleQuery : ListQuery
{
    public VehicleStatus? Status { get; init; }
    public VehicleOwnership? Ownership { get; init; }
    public int? SupplierId { get; init; }
}

[ApiController]
[Route("api/vehicles")]
public class VehiclesController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Vehicle, object?>>> SortMap = new()
    {
        ["plate"] = v => v.Plate,
        ["type"] = v => v.Type,
        ["modelYear"] = v => v.ModelYear,
        ["km"] = v => v.Km,
        ["status"] = v => v.Status,
        ["nextMaintenanceDate"] = v => v.NextMaintenanceDate,
    };

    private static readonly Expression<Func<Vehicle, VehicleDto>> Projection = Projections.Vehicle;

    [HttpGet]
    public async Task<PagedResult<VehicleDto>> List([FromQuery] VehicleQuery q, CancellationToken ct)
    {
        var query = db.Vehicles.AsNoTracking();
        if (q.Status is { } s) query = query.Where(v => v.Status == s);
        if (q.Ownership is { } o) query = query.Where(v => v.Ownership == o);
        if (q.SupplierId is { } sup) query = query.Where(v => v.SupplierId == sup);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(v => EF.Functions.ILike(v.Plate, like) || EF.Functions.ILike(v.Type, like)
                || EF.Functions.ILike(v.Brand ?? "", like) || EF.Functions.ILike(v.Model ?? "", like));
        var (items, total, page, size) = await query.ApplySort(q.Sort, q.Desc, SortMap, "plate", defaultDesc: false)
            .Select(Projection).PageAsync(q, ct);
        return new PagedResult<VehicleDto>(items, total, page, size);
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup(CancellationToken ct) =>
        (await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate)
            .Select(v => new { v.Id, v.Plate, v.Type, v.Brand, v.Model, v.DefaultDriverId, Supplier = v.Supplier != null ? v.Supplier.Title : null }).ToListAsync(ct))
            .Select(v => new LookupItem(v.Id, $"{v.Plate} - {string.Join(" ", new[] { v.Brand ?? v.Type, v.Model }.Where(x => !string.IsNullOrEmpty(x)))}"
                + (v.Supplier != null ? $" (Kiralık: {v.Supplier})" : ""), v.DefaultDriverId?.ToString()))
            .ToList();

    [HttpGet("{id:int}")]
    public async Task<VehicleDto> Get(int id, CancellationToken ct) =>
        await db.Vehicles.AsNoTracking().Where(v => v.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Araç bulunamadı.");

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public async Task<VehicleDto> Create(VehicleSaveRequest req, CancellationToken ct)
    {
        var v = new Vehicle();
        await ApplyAsync(v, req, ct);
        db.Vehicles.Add(v);
        await db.SaveChangesAsync(ct);
        return await Get(v.Id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<VehicleDto> Update(int id, VehicleSaveRequest req, CancellationToken ct)
    {
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Araç bulunamadı.");
        if (req.Status != v.Status)
        {
            var busy = await db.Trips.AnyAsync(t => t.VehicleId == id && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad), ct);
            if (busy && req.Status != VehicleStatus.OnRoad)
                throw new DomainException("Araç aktif bir seferde. Durumunu değiştirmek için önce seferi tamamlayın.");
            if (!busy && req.Status == VehicleStatus.OnRoad)
                throw new DomainException("'Yolda' durumu seferlerden otomatik belirlenir.");
        }
        await ApplyAsync(v, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Araç bulunamadı.");
        if (await db.Trips.IgnoreQueryFilters().AnyAsync(t => t.VehicleId == id, ct))
            throw new DomainException("Seferlerde kullanılmış araç silinemez.");
        v.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(Vehicle v, VehicleSaveRequest r, CancellationToken ct)
    {
        if (r.DefaultDriverId is { } d && !await db.Drivers.AnyAsync(x => x.Id == d, ct)) throw new DomainException("Şoför bulunamadı.");
        if (r.Ownership == VehicleOwnership.Rented && (r.SupplierId is not { } sid || !await db.Suppliers.AnyAsync(x => x.Id == sid, ct)))
            throw new DomainException("Kiralık araç için araç sahibini (tedarikçi) seçin.");
        v.Plate = Formatters.NormalizePlate(r.Plate)!;
        v.Type = r.Type.Trim();
        v.Brand = CustomersController.NullIfEmpty(r.Brand);
        v.Model = CustomersController.NullIfEmpty(r.Model);
        v.ModelYear = r.ModelYear;
        v.Km = r.Km;
        v.LastMaintenanceDate = r.LastMaintenanceDate;
        v.NextMaintenanceDate = r.NextMaintenanceDate;
        v.InspectionExpiry = r.InspectionExpiry;
        v.InsuranceExpiry = r.InsuranceExpiry;
        v.Status = r.Status;
        v.DefaultDriverId = r.DefaultDriverId;
        v.Ownership = r.Ownership;
        v.SupplierId = r.Ownership == VehicleOwnership.Rented ? r.SupplierId : null;
        v.TrailerPlate = Formatters.NormalizePlate(r.TrailerPlate) ?? CustomersController.NullIfEmpty(r.TrailerPlate)?.ToUpper(Formatters.Tr);
    }
}
