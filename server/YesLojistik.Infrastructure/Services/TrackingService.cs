using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Araç konumları, sefer rotası ve müşteriye açık takip linki.</summary>
public class TrackingService(AppDbContext db)
{
    /// <summary>Teslimden bu kadar gün sonra takip linki çalışmaz.</summary>
    public const int LinkValidDaysAfterDelivery = 7;
    public const int MaxPingsPerRequest = 500;

    /// <summary>
    /// Şoförün gönderdiği konumları kaydeder. Konum, şoförün aktif (yüklendi/yolda) seferinin aracına,
    /// aktif sefer yoksa şoförün varsayılan aracına yazılır. Hiçbiri yoksa kaydedilmez.
    /// </summary>
    public async Task<int> RecordAsync(int driverId, IReadOnlyList<LocationPing> pings, CancellationToken ct = default)
    {
        if (pings.Count == 0) return 0;
        if (pings.Count > MaxPingsPerRequest) throw new DomainException($"Tek seferde en fazla {MaxPingsPerRequest} konum gönderilebilir.");

        var active = await db.Trips.Where(t => t.DriverId == driverId && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad))
            // Birden fazla aktif sefer varsa: önce yoldaki, sonra en yeni sefer (VehiclesAsync ile aynı sıra).
            .OrderByDescending(t => t.Status == TripStatus.OnRoad).ThenByDescending(t => t.LoadingDate).ThenByDescending(t => t.Id)
            .Select(t => new { t.Id, t.VehicleId }).FirstOrDefaultAsync(ct);
        var vehicleId = active?.VehicleId
            ?? await db.Vehicles.Where(v => v.DefaultDriverId == driverId).Select(v => (int?)v.Id).FirstOrDefaultAsync(ct);
        if (vehicleId == null) return 0;

        var now = DateTime.UtcNow;
        var rows = pings
            .Select(p => new VehicleLocation
            {
                VehicleId = vehicleId.Value, DriverId = driverId, TripId = active?.Id,
                Latitude = p.Latitude, Longitude = p.Longitude, SpeedKmh = p.SpeedKmh, Heading = p.Heading, Accuracy = p.Accuracy,
                // Gelecekten veya çok eskiden gelen saatlere güvenme (telefon saati yanlış olabilir).
                RecordedAt = p.RecordedAt is { } r && r.ToUniversalTime() <= now.AddMinutes(5) && r.ToUniversalTime() > now.AddDays(-7)
                    ? r.ToUniversalTime() : now,
                CreatedAt = now,
            })
            .OrderBy(r => r.RecordedAt)
            .ToList();
        db.VehicleLocations.AddRange(rows);

        var latest = rows[^1];
        var vehicle = await db.Vehicles.FirstAsync(v => v.Id == vehicleId, ct);
        if (vehicle.LastLocationAt == null || latest.RecordedAt >= vehicle.LastLocationAt)
        {
            vehicle.LastLatitude = latest.Latitude;
            vehicle.LastLongitude = latest.Longitude;
            vehicle.LastSpeedKmh = latest.SpeedKmh;
            vehicle.LastLocationAt = latest.RecordedAt;
        }
        await db.SaveChangesAsync(ct);
        return rows.Count;
    }

    public async Task<List<VehicleLocationDto>> VehiclesAsync(CancellationToken ct = default)
    {
        var vehicles = await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate)
            .Select(v => new
            {
                v.Id, v.Plate, v.Type, v.Status, v.LastLatitude, v.LastLongitude, v.LastSpeedKmh, v.LastLocationAt,
                Trip = db.Trips.Where(t => t.VehicleId == v.Id && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad))
                    .OrderByDescending(t => t.Status == TripStatus.OnRoad).ThenByDescending(t => t.LoadingDate).ThenByDescending(t => t.Id)
                    .Select(t => new { t.Id, t.LoadingAddress, t.DeliveryAddress, t.Customer.Title, t.Driver.FullName }).FirstOrDefault(),
                DefaultDriver = v.DefaultDriver != null ? v.DefaultDriver.FullName : null,
            }).ToListAsync(ct);
        return vehicles.Select(v => new VehicleLocationDto(v.Id, v.Plate, v.Type, v.Status, v.LastLatitude, v.LastLongitude,
            v.LastSpeedKmh, v.LastLocationAt, v.Trip?.Id,
            v.Trip == null ? null : $"{v.Trip.Title}: {v.Trip.LoadingAddress} → {v.Trip.DeliveryAddress}",
            v.Trip?.FullName ?? v.DefaultDriver)).ToList();
    }

    public async Task<List<RoutePointDto>> RouteAsync(int tripId, CancellationToken ct = default)
    {
        if (!await db.Trips.AnyAsync(t => t.Id == tripId, ct)) throw new NotFoundException("Sefer bulunamadı.");
        return await db.VehicleLocations.AsNoTracking().Where(l => l.TripId == tripId).OrderBy(l => l.RecordedAt)
            .Select(l => new RoutePointDto(l.Latitude, l.Longitude, l.SpeedKmh, l.RecordedAt)).Take(5000).ToListAsync(ct);
    }

    public async Task<string> GetOrCreateTokenAsync(int tripId, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == tripId, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        if (trip.Status == TripStatus.Cancelled) throw new DomainException("İptal edilmiş sefer için takip linki oluşturulamaz.");
        if (trip.TrackingToken == null)
        {
            trip.TrackingToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18)).Replace('+', '-').Replace('/', '_');
            await db.SaveChangesAsync(ct);
        }
        return trip.TrackingToken;
    }

    public async Task<PublicTrackingDto?> PublicAsync(string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 40) return null;
        var t = await db.Trips.AsNoTracking().Where(x => x.TrackingToken == token)
            .Select(x => new
            {
                x.Status, x.LoadingAddress, x.DeliveryAddress, x.LoadingDate, x.DeliveryDate, Customer = x.Customer.Title,
                x.Vehicle.Plate, x.Vehicle.LastLatitude, x.Vehicle.LastLongitude, x.Vehicle.LastLocationAt,
            }).FirstOrDefaultAsync(ct);
        if (t == null || t.Status == TripStatus.Cancelled) return null;
        if (t.Status == TripStatus.Delivered && t.DeliveryDate is { } d && Clock.Today.DayNumber - d.DayNumber > LinkValidDaysAfterDelivery) return null;

        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        // Konum yalnızca araç bu sefer için yoldayken paylaşılır.
        var share = TripStatusRules.OccupiesVehicle(t.Status);
        return new PublicTrackingDto(company.CompanyName, company.Phone, t.Customer, t.LoadingAddress, t.DeliveryAddress,
            t.LoadingDate, t.DeliveryDate, t.Status, MaskPlate(t.Plate),
            share ? t.LastLatitude : null, share ? t.LastLongitude : null, share ? t.LastLocationAt : null);
    }

    public async Task<int> PurgeAsync(int retentionDays, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
        return await db.VehicleLocations.Where(l => l.RecordedAt < cutoff).ExecuteDeleteAsync(ct);
    }

    /// <summary>"34 VES 01" → "34 VES **"</summary>
    public static string MaskPlate(string plate)
    {
        var parts = plate.Split(' ');
        return parts.Length == 3 ? $"{parts[0]} {parts[1]} {new string('*', parts[2].Length)}" : plate;
    }
}
