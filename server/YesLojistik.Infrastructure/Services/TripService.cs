using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class TripService(AppDbContext db, DriverNotifier notifier)
{
    private static readonly Dictionary<string, Expression<Func<Trip, object?>>> SortMap = new()
    {
        ["loadingDate"] = t => t.LoadingDate,
        ["deliveryDate"] = t => t.DeliveryDate,
        ["customer"] = t => t.Customer.Title,
        ["vehicle"] = t => t.Vehicle.Plate,
        ["driver"] = t => t.Driver.FullName,
        ["status"] = t => t.Status,
        ["salePrice"] = t => t.SalePrice,
        ["id"] = t => t.Id,
    };

    private record Row(Trip Trip, string CustomerTitle, string Plate, string VehicleType, string DriverName,
        decimal ExpenseTotal, string? InvoiceNo);

    private static readonly Expression<Func<Trip, Row>> Projection = t => new Row(
        t, t.Customer.Title, t.Vehicle.Plate, t.Vehicle.Type, t.Driver.FullName,
        t.Expenses.Sum(e => (decimal?)e.Amount) ?? 0, t.Invoice != null ? t.Invoice.InvoiceNo : null);

    private static TripDto ToDto(Row r)
    {
        var t = r.Trip;
        return new TripDto(t.Id, t.CustomerId, r.CustomerTitle, t.VehicleId, r.Plate, r.VehicleType, t.DriverId,
            r.DriverName, t.LoadingAddress, t.DeliveryAddress, t.LoadingDate, t.DeliveryDate, t.Description,
            t.VehicleCost, t.SalePrice, r.ExpenseTotal, t.SalePrice - t.VehicleCost - r.ExpenseTotal, t.Status,
            TripStatusRules.NextStatuses(t.Status), t.InvoiceId, r.InvoiceNo);
    }

    public IQueryable<Trip> Filter(TripQuery q)
    {
        var query = db.Trips.AsNoTracking();
        if (q.Status is { } s) query = query.Where(t => t.Status == s);
        if (q.CustomerId is { } c) query = query.Where(t => t.CustomerId == c);
        if (q.VehicleId is { } v) query = query.Where(t => t.VehicleId == v);
        if (q.DriverId is { } d) query = query.Where(t => t.DriverId == d);
        if (q.From is { } from) query = query.Where(t => t.LoadingDate >= from);
        if (q.To is { } to) query = query.Where(t => t.LoadingDate <= to);
        if (q.Invoiced is { } inv) query = inv ? query.Where(t => t.InvoiceId != null) : query.Where(t => t.InvoiceId == null);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(t => EF.Functions.ILike(t.Customer.Title, like) || EF.Functions.ILike(t.Vehicle.Plate, like)
                || EF.Functions.ILike(t.Driver.FullName, like) || EF.Functions.ILike(t.LoadingAddress, like)
                || EF.Functions.ILike(t.DeliveryAddress, like));
        return query;
    }

    public async Task<PagedResult<TripDto>> ListAsync(TripQuery q, CancellationToken ct = default)
    {
        var (rows, total, page, size) = await Filter(q)
            .ApplySort(q.Sort, q.Desc, SortMap, "loadingDate")
            .Select(Projection)
            .PageAsync(q, ct);
        return new PagedResult<TripDto>(rows.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<List<TripDto>> QueryAsync(IQueryable<Trip> query, CancellationToken ct = default) =>
        (await query.Select(Projection).ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<TripDto> GetAsync(int id, CancellationToken ct = default)
    {
        var row = await db.Trips.AsNoTracking().Where(t => t.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Sefer bulunamadı.");
        return ToDto(row);
    }

    public async Task<TripDto> CreateAsync(TripSaveRequest req, CancellationToken ct = default)
    {
        await ValidateReferencesAsync(req, ct);
        var trip = new Trip();
        Apply(trip, req);
        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);
        await notifier.NotifyAsync(trip.DriverId, trip.Id, "Yeni sefer atandı",
            DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate), ct);
        return await GetAsync(trip.Id, ct);
    }

    public async Task<TripDto> UpdateAsync(int id, TripSaveRequest req, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        await ValidateReferencesAsync(req, ct);
        if (trip.InvoiceId != null && (trip.CustomerId != req.CustomerId || trip.SalePrice != req.SalePrice))
            throw new DomainException("Faturalanmış seferin müşterisi veya satış fiyatı değiştirilemez. Önce faturayı iptal edin.");

        var oldVehicleId = trip.VehicleId;
        var oldDriverId = trip.DriverId;
        var oldRoute = (trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate);
        Apply(trip, req);
        if (oldVehicleId != trip.VehicleId && TripStatusRules.OccupiesVehicle(trip.Status))
        {
            await EnsureVehicleUsableAsync(trip.VehicleId, ct);
            await db.SaveChangesAsync(ct);
            await SyncVehicleStatusAsync(oldVehicleId, ct);
            await SyncVehicleStatusAsync(trip.VehicleId, ct);
        }
        await db.SaveChangesAsync(ct);

        var route = DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate);
        if (oldDriverId != trip.DriverId)
        {
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Yeni sefer atandı", route, ct);
            await notifier.NotifyAsync(oldDriverId, trip.Id, "Sefer başka şoföre aktarıldı", route, ct);
        }
        else if (oldRoute != (trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate))
        {
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Sefer bilgileri güncellendi", route, ct);
        }
        return await GetAsync(id, ct);
    }

    public async Task<TripDto> ChangeStatusAsync(int id, TripStatus status, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        if (!TripStatusRules.CanTransition(trip.Status, status))
            throw new DomainException($"Sefer '{TripStatusRules.Label(trip.Status)}' durumundan '{TripStatusRules.Label(status)}' durumuna geçemez.");
        if (status == TripStatus.Cancelled && trip.InvoiceId != null)
            throw new DomainException("Faturalanmış sefer iptal edilemez. Önce faturayı iptal edin.");
        if (TripStatusRules.OccupiesVehicle(status))
            await EnsureVehicleUsableAsync(trip.VehicleId, ct);

        trip.Status = status;
        if (status == TripStatus.Delivered) trip.DeliveryDate ??= Clock.Today;
        await db.SaveChangesAsync(ct);
        await SyncVehicleStatusAsync(trip.VehicleId, ct);
        await db.SaveChangesAsync(ct);
        if (status == TripStatus.Cancelled)
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Sefer iptal edildi",
                DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate), ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        if (trip.InvoiceId != null) throw new DomainException("Faturalanmış sefer silinemez. Önce faturayı iptal edin.");
        trip.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        await SyncVehicleStatusAsync(trip.VehicleId, ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Araç, yüklenmiş veya yoldaki bir seferde kullanılıyorsa "Yolda", değilse "Müsait" olur.
    /// "Bakımda" durumu elle yönetilir ve seferler tarafından değiştirilmez.
    /// </summary>
    private async Task SyncVehicleStatusAsync(int vehicleId, CancellationToken ct)
    {
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle == null || vehicle.Status == VehicleStatus.Maintenance) return;
        var busy = await db.Trips.AnyAsync(t => t.VehicleId == vehicleId
            && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad), ct);
        vehicle.Status = busy ? VehicleStatus.OnRoad : VehicleStatus.Available;
    }

    private async Task EnsureVehicleUsableAsync(int vehicleId, CancellationToken ct)
    {
        var status = await db.Vehicles.Where(v => v.Id == vehicleId).Select(v => (VehicleStatus?)v.Status).FirstOrDefaultAsync(ct);
        if (status == VehicleStatus.Maintenance)
            throw new DomainException("Araç bakımda. Seferi başlatmadan önce aracın durumunu değiştirin.");
    }

    private async Task ValidateReferencesAsync(TripSaveRequest req, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == req.CustomerId, ct)) throw new DomainException("Müşteri bulunamadı.");
        if (!await db.Vehicles.AnyAsync(v => v.Id == req.VehicleId, ct)) throw new DomainException("Araç bulunamadı.");
        var driverActive = await db.Drivers.Where(d => d.Id == req.DriverId).Select(d => (bool?)d.IsActive).FirstOrDefaultAsync(ct);
        if (driverActive == null) throw new DomainException("Şoför bulunamadı.");
        if (driverActive == false) throw new DomainException("Pasif durumdaki şoföre sefer atanamaz.");
    }

    private static void Apply(Trip t, TripSaveRequest r)
    {
        t.CustomerId = r.CustomerId;
        t.VehicleId = r.VehicleId;
        t.DriverId = r.DriverId;
        t.LoadingAddress = r.LoadingAddress.Trim();
        t.DeliveryAddress = r.DeliveryAddress.Trim();
        t.LoadingDate = r.LoadingDate;
        t.DeliveryDate = r.DeliveryDate;
        t.Description = r.Description?.Trim();
        t.VehicleCost = Money.Round(r.VehicleCost);
        t.SalePrice = Money.Round(r.SalePrice);
    }
}
