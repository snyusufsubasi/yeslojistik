using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class DashboardService(AppDbContext db, BalanceService balances, TripService trips, InvoiceService invoices)
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var monthStart = Clock.MonthStart;
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var monthTrips = db.Trips.Where(t => t.LoadingDate >= monthStart && t.LoadingDate <= monthEnd && t.Status != TripStatus.Cancelled);
        var monthTripCount = await monthTrips.CountAsync(ct);
        var monthDelivered = await monthTrips.CountAsync(t => t.Status == TripStatus.Delivered, ct);
        var monthRevenue = await monthTrips.SumAsync(t => (decimal?)t.SalePrice, ct) ?? 0;
        var monthExpenses = (await db.Expenses.Where(e => e.Date >= monthStart && e.Date <= monthEnd).SumAsync(e => (decimal?)e.Amount, ct) ?? 0)
            + (await monthTrips.SumAsync(t => (decimal?)t.VehicleCost, ct) ?? 0);

        var activeCount = await db.Trips.CountAsync(t => t.Status == TripStatus.Planned || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad, ct);
        var plannedCount = await db.Trips.CountAsync(t => t.Status == TripStatus.Planned, ct);

        var open = (await balances.InvoiceBalancesAsync(null, ct)).Values.Where(b => b.Remaining > 0).ToList();

        // Bugünün seferleri: bugün yüklenen/teslim edilecek olanlar ve hâlâ yolda olanlar.
        var todayTrips = await trips.QueryAsync(db.Trips.AsNoTracking()
            .Where(t => t.LoadingDate == today || t.DeliveryDate == today || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad)
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id).Take(50), ct);

        var recentInvoices = (await invoices.ListAsync(new InvoiceQuery { PageSize = 5 }, ct)).Items;

        var vehicles = await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate)
            .Select(v => new VehicleDto(v.Id, v.Plate, v.Type, v.Brand, v.Model, v.ModelYear, v.Km, v.LastMaintenanceDate,
                v.NextMaintenanceDate, v.InspectionExpiry, v.InsuranceExpiry, v.Status, v.DefaultDriverId,
                v.DefaultDriver != null ? v.DefaultDriver.FullName : null))
            .ToListAsync(ct);

        return new DashboardDto(monthTripCount, monthDelivered, activeCount, open.Count, open.Sum(b => b.Remaining),
            vehicles.Count, vehicles.Count(v => v.Status == VehicleStatus.OnRoad), plannedCount, monthRevenue, monthExpenses,
            todayTrips, recentInvoices, vehicles);
    }
}
