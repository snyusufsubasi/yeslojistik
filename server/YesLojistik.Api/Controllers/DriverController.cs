using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record DriverProfileDto(int DriverId, string FullName, string? Phone, string? VehiclePlate, string CompanyName, string? CompanyPhone);

/// <summary>Şoför mobil uygulamasının API'si. Yalnızca "Driver" rolündeki, bir şoföre bağlı kullanıcılar erişebilir.</summary>
[ApiController]
[Route("api/driver")]
[Authorize(Roles = nameof(UserRole.Driver))]
public class DriverController(AppDbContext db, ICurrentUser current, DriverAppService app, AttachmentService attachments,
    TrackingService tracking) : ControllerBase
{
    private async Task<int> DriverIdAsync(CancellationToken ct) =>
        await db.Users.Where(u => u.Id == current.Id && u.IsActive).Select(u => u.DriverId).FirstOrDefaultAsync(ct)
        ?? throw new DomainException("Hesabınız bir şoför kaydına bağlı değil. Yöneticinizle iletişime geçin.");

    [HttpGet("me")]
    public async Task<DriverProfileDto> Me(CancellationToken ct)
    {
        var driverId = await DriverIdAsync(ct);
        var d = await db.Drivers.AsNoTracking().FirstAsync(x => x.Id == driverId, ct);
        var plate = await db.Vehicles.Where(v => v.DefaultDriverId == driverId).Select(v => v.Plate).FirstOrDefaultAsync(ct);
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        return new DriverProfileDto(d.Id, d.FullName, d.Phone, plate, company.CompanyName, company.Phone);
    }

    [HttpGet("trips")]
    public async Task<List<DriverTripDto>> Trips([FromQuery] string scope = "active", CancellationToken ct = default) =>
        await app.TripsAsync(await DriverIdAsync(ct), scope != "history", ct);

    [HttpGet("trips/{id:int}")]
    public async Task<DriverTripDto> Trip(int id, CancellationToken ct) => await app.GetAsync(await DriverIdAsync(ct), id, ct);

    [HttpPost("trips/{id:int}/status")]
    public async Task<DriverTripDto> Status(int id, TripStatusRequest req, CancellationToken ct) =>
        await app.ChangeStatusAsync(await DriverIdAsync(ct), id, req.Status, ct, req.OccurredAt, req.Note);

    /// <summary>Şoförün bu sefer için girdiği masraflar.</summary>
    [HttpGet("trips/{id:int}/expenses")]
    public async Task<List<DriverExpenseDto>> Expenses(int id, CancellationToken ct)
    {
        var driverId = await DriverIdAsync(ct);
        await app.EnsureOwnAsync(driverId, id, ct);
        return await db.Expenses.AsNoTracking().Where(e => e.TripId == id && e.DriverId == driverId).OrderByDescending(e => e.Id)
            .Select(e => new DriverExpenseDto(e.Id, e.Category, e.Amount, e.Date, e.Liters, e.Odometer, e.Description)).ToListAsync(ct);
    }

    /// <summary>Yolda yapılan masraf: sefere, seferin aracına ve şoföre bağlanır. Yakıtta km aracın km'sini günceller.</summary>
    [HttpPost("trips/{id:int}/expenses")]
    public async Task<DriverExpenseDto> AddExpense(int id, DriverExpenseRequest req, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        var driverId = await DriverIdAsync(ct);
        await app.EnsureOwnAsync(driverId, id, ct);
        var expenseId = await expenses.CreateAsync(new ExpenseSaveRequest(req.Category, req.Amount, Clock.Today, null, id,
            string.IsNullOrWhiteSpace(req.Description) ? "Şoför girişi" : req.Description, driverId, req.Liters, req.Odometer), ct);
        return await db.Expenses.AsNoTracking().Where(e => e.Id == expenseId)
            .Select(e => new DriverExpenseDto(e.Id, e.Category, e.Amount, e.Date, e.Liters, e.Odometer, e.Description)).FirstAsync(ct);
    }

    [HttpGet("trips/{id:int}/attachments")]
    public async Task<List<AttachmentDto>> Attachments(int id, CancellationToken ct)
    {
        await app.EnsureOwnAsync(await DriverIdAsync(ct), id, ct);
        return await attachments.ListAsync(id, ct);
    }

    [HttpPost("trips/{id:int}/attachments")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<AttachmentDto> Upload(int id, IFormFile file, [FromForm] AttachmentKind kind = AttachmentKind.Photo,
        [FromForm] string? note = null, CancellationToken ct = default)
    {
        await app.EnsureOwnAsync(await DriverIdAsync(ct), id, ct);
        await using var stream = file.OpenReadStream();
        return await attachments.UploadAsync(id, stream, file.Length, file.FileName, kind, note, ct);
    }

    /// <summary>Telefonun bildirim adresini kaydeder (yeni sefer, iptal vb. bildirimleri için).</summary>
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPush(PushTokenRequest req, CancellationToken ct)
    {
        await DriverIdAsync(ct);
        if (string.IsNullOrWhiteSpace(req.Token) || req.Token.Length > 200 || !req.Token.StartsWith("ExponentPushToken["))
            throw new DomainException("Geçersiz bildirim adresi.");
        var existing = await db.PushTokens.FirstOrDefaultAsync(p => p.Token == req.Token, ct);
        if (existing == null) db.PushTokens.Add(existing = new PushToken { Token = req.Token });
        // Aynı telefon başka şoför hesabıyla kullanılıyorsa bildirimi yeni hesaba taşı.
        existing.UserId = current.Id!.Value;
        existing.Platform = req.Platform?.Length > 20 ? req.Platform[..20] : req.Platform;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("push-token")]
    public async Task<IActionResult> RemovePush([FromQuery] string token, CancellationToken ct)
    {
        await db.PushTokens.Where(p => p.Token == token && p.UserId == current.Id).ExecuteDeleteAsync(ct);
        return NoContent();
    }

    /// <summary>Konum gönderimi. Uygulama çevrimdışıyken biriktirdiği konumları toplu gönderebilir.</summary>
    [HttpPost("location")]
    public async Task<object> Location(List<LocationPing> pings, CancellationToken ct)
    {
        foreach (var p in pings)
            if (p.Latitude is < -90 or > 90 || p.Longitude is < -180 or > 180) throw new DomainException("Geçersiz konum.");
        return new { saved = await tracking.RecordAsync(await DriverIdAsync(ct), pings, ct) };
    }
}
