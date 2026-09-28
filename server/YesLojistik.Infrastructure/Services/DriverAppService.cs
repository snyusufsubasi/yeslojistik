using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Şoför mobil uygulamasının iş kuralları. Şoför yalnızca kendisine atanmış seferleri görür.</summary>
public class DriverAppService(AppDbContext db, TripService trips)
{
    /// <summary>Şoför yalnızca bir sonraki adıma geçebilir; geri alma ve iptal yalnızca ofisten yapılır.</summary>
    private static readonly Dictionary<TripStatus, TripStatus> Forward = new()
    {
        [TripStatus.Planned] = TripStatus.Loaded,
        [TripStatus.Loaded] = TripStatus.OnRoad,
        [TripStatus.OnRoad] = TripStatus.Delivered,
    };

    public async Task<List<DriverTripDto>> TripsAsync(int driverId, bool active, CancellationToken ct = default)
    {
        var query = db.Trips.AsNoTracking().Where(t => t.DriverId == driverId);
        query = active
            ? query.Where(t => t.Status == TripStatus.Planned || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad)
                .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id)
            : query.Where(t => t.Status == TripStatus.Delivered && t.LoadingDate >= Clock.Today.AddDays(-60))
                .OrderByDescending(t => t.LoadingDate).ThenByDescending(t => t.Id);
        return (await Project(query).Take(100).ToListAsync(ct)).Select(Map).ToList();
    }

    public async Task<DriverTripDto> GetAsync(int driverId, int tripId, CancellationToken ct = default)
    {
        var row = await Project(db.Trips.AsNoTracking().Where(t => t.Id == tripId && t.DriverId == driverId)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Sefer bulunamadı.");
        return Map(row);
    }

    public async Task<DriverTripDto> ChangeStatusAsync(int driverId, int tripId, TripStatus status, CancellationToken ct = default,
        DateTime? occurredAt = null, string? note = null)
    {
        await EnsureOwnAsync(driverId, tripId, ct);
        var current = await db.Trips.Where(t => t.Id == tripId).Select(t => t.Status).FirstAsync(ct);
        if (!Forward.TryGetValue(current, out var next) || next != status)
            throw new DomainException("Bu durum değişikliği yalnızca ofisten yapılabilir.");
        await trips.ChangeStatusAsync(tripId, status, TripEventSource.Driver, occurredAt, note, ct);
        return await GetAsync(driverId, tripId, ct);
    }

    public async Task EnsureOwnAsync(int driverId, int tripId, CancellationToken ct = default)
    {
        if (!await db.Trips.AnyAsync(t => t.Id == tripId && t.DriverId == driverId, ct)) throw new NotFoundException("Sefer bulunamadı.");
    }

    private record Row(Trip Trip, string Customer, string? Phone, string Plate, int Attachments);

    private static IQueryable<Row> Project(IQueryable<Trip> q) =>
        q.Select(t => new Row(t, t.Customer.Title, t.Customer.Phone, t.Vehicle.Plate, t.Attachments.Count));

    /// <summary>"12 palet mobilya, 8.500 kg"</summary>
    public static string? CargoText(Trip t)
    {
        var parts = new List<string>();
        var what = string.Join(" ", new[] { t.CargoQuantity is { } q ? $"{q} {t.CargoUnit}".Trim() : null, t.CargoType }.Where(x => !string.IsNullOrWhiteSpace(x)));
        if (what.Length > 0) parts.Add(what);
        if (t.CargoWeightKg is { } kg) parts.Add($"{kg.ToString("N0", Formatters.Tr)} kg");
        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    private static DriverTripDto Map(Row r) => new(r.Trip.Id, r.Customer, r.Phone, r.Trip.LoadingAddress, r.Trip.DeliveryAddress,
        r.Trip.LoadingDate, r.Trip.DeliveryDate, r.Trip.Description, r.Plate, r.Trip.Status,
        Forward.TryGetValue(r.Trip.Status, out var next) ? [next] : [], r.Attachments, r.Trip.CustomerReference, CargoText(r.Trip),
        r.Trip.TrailerPlate, r.Trip.LoadingCity, r.Trip.DeliveryCity, r.Trip.LoadingContact, r.Trip.DeliveryContact);
}
