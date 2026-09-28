using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class ReportService(AppDbContext db, BalanceService balances)
{
    public async Task<List<MonthlySummaryRow>> MonthlyAsync(int year, CancellationToken ct = default)
    {
        var from = new DateOnly(year, 1, 1);
        var to = new DateOnly(year, 12, 31);

        var trips = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => t.LoadingDate.Month)
            .Select(g => new { Month = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice), Cost = g.Sum(t => t.VehicleCost) })
            .ToListAsync(ct);
        var invoiced = await db.Invoices.Where(i => i.Date >= from && i.Date <= to && i.Status == InvoiceStatus.Issued)
            .GroupBy(i => i.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(i => i.Total) }).ToListAsync(ct);
        var collected = await db.Payments.Where(p => p.Date >= from && p.Date <= to)
            .GroupBy(p => p.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(p => p.Amount) }).ToListAsync(ct);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to)
            .GroupBy(e => e.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);

        return Enumerable.Range(1, 12).Select(m =>
        {
            var t = trips.FirstOrDefault(x => x.Month == m);
            var exp = expenses.FirstOrDefault(x => x.Month == m)?.Sum ?? 0;
            var revenue = t?.Revenue ?? 0;
            var cost = t?.Cost ?? 0;
            return new MonthlySummaryRow(year, m, t?.Count ?? 0, revenue, cost,
                invoiced.FirstOrDefault(x => x.Month == m)?.Sum ?? 0, collected.FirstOrDefault(x => x.Month == m)?.Sum ?? 0,
                exp, revenue - cost - exp);
        }).ToList();
    }

    public async Task<List<TripProfitRow>> TripProfitAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await db.Trips.AsNoTracking()
            .Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id)
            .Select(t => new
            {
                t.Id, t.LoadingDate, Customer = t.Customer.Title, t.Vehicle.Plate, t.LoadingAddress, t.DeliveryAddress, t.Status,
                t.SalePrice, t.VehicleCost, Expenses = t.Expenses.Sum(e => (decimal?)e.Amount) ?? 0,
            }).ToListAsync(ct);
        return rows.Select(r => new TripProfitRow(r.Id, r.LoadingDate, r.Customer, r.Plate, $"{r.LoadingAddress} → {r.DeliveryAddress}",
            TripStatusRules.Label(r.Status), r.SalePrice, r.VehicleCost, r.Expenses, r.SalePrice - r.VehicleCost - r.Expenses)).ToList();
    }

    public async Task<List<VehicleReportRow>> VehiclesAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var vehicles = await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate).Select(v => new { v.Id, v.Plate, v.Type }).ToListAsync(ct);
        var trips = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => t.VehicleId)
            .Select(g => new { VehicleId = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice), Cost = g.Sum(t => t.VehicleCost) })
            .ToListAsync(ct);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.VehicleId != null)
            .GroupBy(e => e.VehicleId!.Value).Select(g => new { VehicleId = g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);

        return vehicles.Select(v =>
        {
            var t = trips.FirstOrDefault(x => x.VehicleId == v.Id);
            var e = expenses.FirstOrDefault(x => x.VehicleId == v.Id)?.Sum ?? 0;
            return new VehicleReportRow(v.Id, v.Plate, v.Type, t?.Count ?? 0, t?.Revenue ?? 0, t?.Cost ?? 0, e,
                (t?.Revenue ?? 0) - (t?.Cost ?? 0) - e);
        }).ToList();
    }

    public async Task<List<DriverReportRow>> DriversAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => new { t.DriverId, t.Driver.FullName })
            .Select(g => new
            {
                g.Key.DriverId, g.Key.FullName, Count = g.Count(), Delivered = g.Count(t => t.Status == TripStatus.Delivered),
                Revenue = g.Sum(t => t.SalePrice), Cost = g.Sum(t => t.VehicleCost),
                Expenses = g.Sum(t => t.Expenses.Sum(e => (decimal?)e.Amount) ?? 0),
            }).ToListAsync(ct);
        return rows.Select(r => new DriverReportRow(r.DriverId, r.FullName, r.Count, r.Delivered, r.Revenue, r.Cost, r.Expenses,
                r.Revenue - r.Cost - r.Expenses))
            .OrderByDescending(r => r.TripCount).ThenBy(r => r.Driver).ToList();
    }

    public async Task<List<CustomerAgingRow>> AgingAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var byCustomer = await balances.BalancesByCustomerAsync(null, ct);
        var ids = byCustomer.Select(g => g.Key).ToList();
        var titles = await db.Customers.AsNoTracking().Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Title, ct);

        return byCustomer
            .Select(g => (Key: (CustomerId: g.Key, Title: titles.GetValueOrDefault(g.Key, "?")), Buckets: PaymentAllocator.Age(g, today)))
            .Where(x => x.Buckets.Total > 0)
            .Select(x => new CustomerAgingRow(x.Key.CustomerId, x.Key.Title, x.Buckets.NotDue, x.Buckets.Days1To30,
                x.Buckets.Days31To60, x.Buckets.Days61To90, x.Buckets.Over90, x.Buckets.Total))
            .OrderByDescending(r => r.Total).ToList();
    }

    public async Task<List<ExpenseCategoryRow>> ExpenseCategoriesAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await db.Expenses.Where(e => e.Date >= from && e.Date <= to)
            .GroupBy(e => e.Category).Select(g => new { g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);
        return rows.OrderByDescending(r => r.Sum).Select(r => new ExpenseCategoryRow(r.Key.ToString(), r.Sum)).ToList();
    }
}
