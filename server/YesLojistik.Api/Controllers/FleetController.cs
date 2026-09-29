using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Araç, şoför ve firma belgeleri (numara, bitiş tarihi, taranmış dosya).</summary>
[ApiController]
[Route("api/documents")]
public class DocumentsController(FleetService fleet) : ControllerBase
{
    [HttpGet]
    public Task<List<DocumentDto>> List([FromQuery] DocumentOwnerType? ownerType, [FromQuery] int? ownerId, CancellationToken ct) =>
        fleet.DocumentsAsync(ownerType, ownerId, ct);

    [HttpGet("{id:int}")]
    public Task<DocumentDto> Get(int id, CancellationToken ct) => fleet.DocumentAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public async Task<DocumentDto> Create(DocumentSaveRequest req, CancellationToken ct) =>
        await fleet.DocumentAsync(await fleet.SaveDocumentAsync(null, req, ct), ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<DocumentDto> Update(int id, DocumentSaveRequest req, CancellationToken ct) =>
        await fleet.DocumentAsync(await fleet.SaveDocumentAsync(id, req, ct), ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await fleet.DeleteDocumentAsync(id, ct);
        return NoContent();
    }

    /// <summary>Belgenin taranmış hali (JPEG, PNG, WEBP veya PDF, en fazla 10 MB). Varsa eskisinin yerine geçer.</summary>
    [Authorize(Policy = Policies.Operations)]
    [HttpPost("{id:int}/file")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<DocumentDto> Upload(int id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        await fleet.SaveDocumentFileAsync(id, stream, file.Length, ct);
        return await fleet.DocumentAsync(id, ct);
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> File(int id, CancellationToken ct)
    {
        var (content, type) = await fleet.OpenDocumentFileAsync(id, ct);
        return File(content, type);
    }
}

/// <summary>Araç bakım kayıtları.</summary>
[ApiController]
[Route("api/vehicles/{vehicleId:int}/maintenance")]
public class MaintenanceController(FleetService fleet) : ControllerBase
{
    [HttpGet]
    public Task<List<MaintenanceDto>> List(int vehicleId, CancellationToken ct) =>
        fleet.MaintenanceQuery(m => m.VehicleId == vehicleId).ToListAsync(ct);

    private async Task<MaintenanceDto> GetAsync(int id, CancellationToken ct) =>
        await fleet.MaintenanceQuery(m => m.Id == id).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Bakım kaydı bulunamadı.");

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public async Task<MaintenanceDto> Create(int vehicleId, MaintenanceSaveRequest req, CancellationToken ct) =>
        await GetAsync(await fleet.SaveMaintenanceAsync(vehicleId, null, req, ct), ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<MaintenanceDto> Update(int vehicleId, int id, MaintenanceSaveRequest req, CancellationToken ct) =>
        await GetAsync(await fleet.SaveMaintenanceAsync(vehicleId, id, req, ct), ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int vehicleId, int id, CancellationToken ct)
    {
        await fleet.DeleteMaintenanceAsync(vehicleId, id, ct);
        return NoContent();
    }
}

/// <summary>Şoför hesabı: şoföre yapılan ödemeler ve şoförden geri alınan para.</summary>
[ApiController]
[Route("api/driver-settlements")]
public class DriverSettlementsController(AppDbContext db) : ControllerBase
{
    private static readonly System.Linq.Expressions.Expression<Func<DriverSettlement, DriverSettlementDto>> Projection = s =>
        new DriverSettlementDto(s.Id, s.DriverId, s.Driver.FullName, s.Date, s.Amount, s.Direction, s.Method, s.Note);

    [HttpGet]
    public Task<List<DriverSettlementDto>> List([FromQuery] int? driverId, CancellationToken ct)
    {
        var q = db.DriverSettlements.AsNoTracking();
        if (driverId is { } d) q = q.Where(s => s.DriverId == d);
        return q.OrderByDescending(s => s.Date).ThenByDescending(s => s.Id).Select(Projection).Take(500).ToListAsync(ct);
    }

    private async Task<DriverSettlementDto> GetAsync(int id, CancellationToken ct) =>
        await db.DriverSettlements.AsNoTracking().Where(s => s.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Kayıt bulunamadı.");

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<DriverSettlementDto> Create(DriverSettlementSaveRequest req, CancellationToken ct)
    {
        var s = new DriverSettlement();
        await ApplyAsync(s, req, ct);
        db.DriverSettlements.Add(s);
        await db.SaveChangesAsync(ct);
        return await GetAsync(s.Id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<DriverSettlementDto> Update(int id, DriverSettlementSaveRequest req, CancellationToken ct)
    {
        var s = await db.DriverSettlements.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Kayıt bulunamadı.");
        await ApplyAsync(s, req, ct);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var s = await db.DriverSettlements.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Kayıt bulunamadı.");
        s.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(DriverSettlement s, DriverSettlementSaveRequest r, CancellationToken ct)
    {
        if (!await db.Drivers.AnyAsync(d => d.Id == r.DriverId, ct)) throw new DomainException("Şoför bulunamadı.");
        s.DriverId = r.DriverId;
        s.Date = r.Date;
        s.Amount = Money.Round(r.Amount);
        s.Direction = r.Direction;
        s.Method = r.Method;
        s.Note = CustomersController.NullIfEmpty(r.Note);
    }
}
