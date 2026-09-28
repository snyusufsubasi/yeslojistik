using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Gider kaydı: panel ve şoför uygulaması aynı kuralları kullanır.</summary>
public class ExpenseService(AppDbContext db)
{
    public async Task<int> CreateAsync(ExpenseSaveRequest req, CancellationToken ct = default)
    {
        var e = new Expense();
        await ApplyAsync(e, req, ct);
        db.Expenses.Add(e);
        await db.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateAsync(int id, ExpenseSaveRequest req, CancellationToken ct = default)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        await ApplyAsync(e, req, ct);
        await db.SaveChangesAsync(ct);
    }

    private async Task ApplyAsync(Expense e, ExpenseSaveRequest r, CancellationToken ct)
    {
        var vehicleId = r.VehicleId;
        var driverId = r.DriverId;
        if (r.TripId is { } tripId)
        {
            var trip = await db.Trips.Where(t => t.Id == tripId).Select(t => new { t.VehicleId, t.DriverId }).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Sefer bulunamadı.");
            vehicleId ??= trip.VehicleId;
            // Harcırah/avans sefere bağlıysa şoför seferden alınır.
            if (r.Category is ExpenseCategory.DriverAllowance or ExpenseCategory.DriverAdvance) driverId ??= trip.DriverId;
        }
        if (vehicleId is { } v && !await db.Vehicles.AnyAsync(x => x.Id == v, ct)) throw new DomainException("Araç bulunamadı.");
        if (driverId is { } d && !await db.Drivers.AnyAsync(x => x.Id == d, ct)) throw new DomainException("Şoför bulunamadı.");
        if (r.Category == ExpenseCategory.DriverAdvance && driverId is null)
            throw new DomainException("Avans için şoför seçin.");
        var isFuel = r.Category == ExpenseCategory.Fuel;
        if (isFuel && r.Odometer is { } odo && vehicleId is { } fuelVehicle)
        {
            // Girilen kilometre araç kartındakinden büyükse araç kilometresi güncellenir.
            var vehicle = await db.Vehicles.FirstAsync(x => x.Id == fuelVehicle, ct);
            if (odo > vehicle.Km) vehicle.Km = odo;
        }
        e.DriverId = driverId;
        e.Liters = isFuel && r.Liters is { } l ? Math.Round(l, 2) : null;
        e.Odometer = isFuel ? r.Odometer : null;
        e.Category = r.Category;
        e.Amount = Money.Round(r.Amount);
        e.Date = r.Date;
        e.VehicleId = vehicleId;
        e.TripId = r.TripId;
        e.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
    }
}
