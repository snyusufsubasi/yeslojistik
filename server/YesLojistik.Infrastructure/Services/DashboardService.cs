using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class DashboardService(AppDbContext db, BalanceService balances, TripService trips, InvoiceService invoices, PayableService payables)
{
    private async Task<SetupStatus> SetupAsync(int vehicleCount, CancellationToken ct)
    {
        var s = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        return new SetupStatus(
            !string.IsNullOrWhiteSpace(s.TaxNumber) && !string.IsNullOrWhiteSpace(s.Address),
            vehicleCount,
            await db.Drivers.CountAsync(ct),
            await db.Customers.CountAsync(ct),
            await db.Trips.CountAsync(ct),
            await db.Users.CountAsync(ct),
            s.HasSampleData,
            await db.Suppliers.CountAsync(ct),
            await db.Customers.SumAsync(c => (decimal?)c.OpeningBalance, ct) ?? 0,
            await db.Suppliers.SumAsync(x => (decimal?)x.OpeningBalance, ct) ?? 0,
            s.LastBackupAt,
            s.SampleDataClearedAt != null,
            !string.IsNullOrWhiteSpace(s.Iban) && !string.IsNullOrWhiteSpace(s.City));
    }

    public async Task<DashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var monthStart = Clock.MonthStart;
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var monthTrips = db.Trips.Where(t => t.LoadingDate >= monthStart && t.LoadingDate <= monthEnd && t.Status != TripStatus.Cancelled);
        var monthTripCount = await monthTrips.CountAsync(ct);
        var monthDelivered = await monthTrips.CountAsync(t => t.Status == TripStatus.Delivered, ct);
        var monthRevenue = await monthTrips.SumAsync(t => (decimal?)t.SalePrice, ct) ?? 0;
        var monthExpenses = (await db.Expenses.Where(e => e.Date >= monthStart && e.Date <= monthEnd && e.ApprovalStatus == ApprovalStatus.Approved).SumAsync(e => (decimal?)e.Amount, ct) ?? 0)
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
            .Select(Projections.Vehicle)
            .ToListAsync(ct);

        var trendStart = monthStart.AddMonths(-5);
        var tripTrend = await db.Trips.Where(t => t.LoadingDate >= trendStart && t.LoadingDate <= monthEnd && t.Status != TripStatus.Cancelled)
            .GroupBy(t => new { t.LoadingDate.Year, t.LoadingDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(t => t.SalePrice), Cost = g.Sum(t => t.VehicleCost) })
            .ToListAsync(ct);
        var expenseTrend = await db.Expenses.Where(e => e.Date >= trendStart && e.Date <= monthEnd && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => new { e.Date.Year, e.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Sum = g.Sum(e => e.Amount) })
            .ToListAsync(ct);
        var trend = Enumerable.Range(0, 6).Select(i =>
        {
            var m = trendStart.AddMonths(i);
            var t = tripTrend.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month);
            var e = expenseTrend.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month)?.Sum ?? 0;
            return new MonthTrendRow(m.Year, m.Month, t?.Revenue ?? 0, (t?.Cost ?? 0) + e);
        }).ToList();

        var payable = await payables.DashboardAsync(ct);
        var pending = await db.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Pending)
            .GroupBy(_ => 1).Select(g => new { Count = g.Count(), Total = g.Sum(e => e.Amount) }).FirstOrDefaultAsync(ct);
        var uninvoiced = await db.Trips.Where(t => !t.IsLegacy && t.Status == TripStatus.Delivered && t.InvoiceId == null)
            .GroupBy(_ => 1).Select(g => new { Count = g.Count(), Total = g.Sum(t => t.SalePrice) }).FirstOrDefaultAsync(ct);
        return new DashboardDto(monthTripCount, monthDelivered, activeCount, open.Count, open.Sum(b => b.Remaining),
            vehicles.Count, vehicles.Count(v => v.Status == VehicleStatus.OnRoad), plannedCount, monthRevenue, monthExpenses,
            todayTrips, recentInvoices, vehicles, trend, await SetupAsync(vehicles.Count, ct), payable.Total, payable.Overdue,
            pending?.Count ?? 0, pending?.Total ?? 0, uninvoiced?.Count ?? 0, uninvoiced?.Total ?? 0);
    }
}
