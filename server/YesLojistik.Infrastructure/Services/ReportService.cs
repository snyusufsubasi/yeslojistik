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
            .Select(g => new { Month = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice + t.Commission), Cost = g.Sum(t => t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge)),
                CarrierCost = g.Where(t => t.CarrierSupplierId != null).Sum(t => t.VehicleCost) })
            .ToListAsync(ct);
        var invoiced = await db.Invoices.Where(i => i.Date >= from && i.Date <= to && i.Status == InvoiceStatus.Issued)
            .GroupBy(i => i.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(i => i.Total) }).ToListAsync(ct);
        var collected = await db.Payments.Where(Payment.Counts).Where(p => p.Date >= from && p.Date <= to)
            .GroupBy(p => p.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(p => p.Amount) }).ToListAsync(ct);
        var carrierPaid = await db.SupplierPayments.Where(p => p.Date >= from && p.Date <= to)
            .GroupBy(p => p.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(p => p.Amount) }).ToListAsync(ct);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => e.Date.Month).Select(g => new { Month = g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);

        return Enumerable.Range(1, 12).Select(m =>
        {
            var t = trips.FirstOrDefault(x => x.Month == m);
            var exp = expenses.FirstOrDefault(x => x.Month == m)?.Sum ?? 0;
            var revenue = t?.Revenue ?? 0;
            var cost = t?.Cost ?? 0;
            return new MonthlySummaryRow(year, m, t?.Count ?? 0, revenue, cost,
                invoiced.FirstOrDefault(x => x.Month == m)?.Sum ?? 0, collected.FirstOrDefault(x => x.Month == m)?.Sum ?? 0,
                exp, revenue - cost - exp, t?.CarrierCost ?? 0, carrierPaid.FirstOrDefault(x => x.Month == m)?.Sum ?? 0);
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
                SalePrice = t.SalePrice + t.Commission, VehicleCost = t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge), Expenses = t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0,
            }).ToListAsync(ct);
        return rows.Select(r => new TripProfitRow(r.Id, r.LoadingDate, r.Customer, r.Plate, $"{r.LoadingAddress} → {r.DeliveryAddress}",
            TripStatusRules.Label(r.Status), r.SalePrice, r.VehicleCost, r.Expenses, r.SalePrice - r.VehicleCost - r.Expenses)).ToList();
    }

    public async Task<List<VehicleReportRow>> VehiclesAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var vehicles = await db.Vehicles.AsNoTracking().OrderBy(v => v.Plate).Select(v => new { v.Id, v.Plate, v.Type }).ToListAsync(ct);
        var trips = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => t.VehicleId)
            .Select(g => new { VehicleId = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice + t.Commission), Cost = g.Sum(t => t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge)) })
            .ToListAsync(ct);
        var expenses = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.VehicleId != null && e.ApprovalStatus == ApprovalStatus.Approved)
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
                Revenue = g.Sum(t => t.SalePrice + t.Commission), Cost = g.Sum(t => t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge)),
                Expenses = g.Sum(t => t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0),
            }).ToListAsync(ct);
        var paid = await db.Expenses
            .Where(e => e.DriverId != null && e.Date >= from && e.Date <= to
                && (e.Category == ExpenseCategory.DriverAdvance || e.Category == ExpenseCategory.DriverAllowance))
            .GroupBy(e => new { DriverId = e.DriverId!.Value, e.Driver!.FullName })
            .Select(g => new
            {
                g.Key.DriverId, g.Key.FullName,
                Advances = g.Where(e => e.Category == ExpenseCategory.DriverAdvance).Sum(e => (decimal?)e.Amount) ?? 0,
                Allowances = g.Where(e => e.Category == ExpenseCategory.DriverAllowance).Sum(e => (decimal?)e.Amount) ?? 0,
            }).ToListAsync(ct);
        var result = rows.Select(r =>
        {
            var p = paid.FirstOrDefault(x => x.DriverId == r.DriverId);
            return new DriverReportRow(r.DriverId, r.FullName, r.Count, r.Delivered, r.Revenue, r.Cost, r.Expenses,
                r.Revenue - r.Cost - r.Expenses, p?.Advances ?? 0, p?.Allowances ?? 0);
        }).ToList();
        // Dönemde seferi olmayan ama avans/harcırah verilen şoförler de listelenir.
        result.AddRange(paid.Where(p => rows.All(r => r.DriverId != p.DriverId))
            .Select(p => new DriverReportRow(p.DriverId, p.FullName, 0, 0, 0, 0, 0, 0, p.Advances, p.Allowances)));
        return result.OrderByDescending(r => r.TripCount).ThenBy(r => r.Driver).ToList();
    }

    public async Task<List<FuelReportRow>> FuelAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var fills = await db.Expenses.AsNoTracking()
            .Where(e => e.Category == ExpenseCategory.Fuel && e.VehicleId != null && e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .Select(e => new { VehicleId = e.VehicleId!.Value, e.Vehicle!.Plate, e.Amount, e.Liters, e.Odometer, e.Date, e.Id })
            .ToListAsync(ct);
        return fills.GroupBy(f => new { f.VehicleId, f.Plate }).Select(g =>
        {
            var liters = g.Sum(f => f.Liters ?? 0);
            var withLiters = g.Where(f => f.Liters > 0).ToList();
            decimal? price = withLiters.Count > 0 ? Math.Round(withLiters.Sum(f => f.Amount) / withLiters.Sum(f => f.Liters!.Value), 2) : null;
            var measured = g.Where(f => f.Odometer != null && f.Liters > 0).OrderBy(f => f.Odometer).ThenBy(f => f.Date).ThenBy(f => f.Id).ToList();
            int? km = null;
            decimal? per100 = null;
            if (measured.Count >= 2 && measured[^1].Odometer > measured[0].Odometer)
            {
                km = measured[^1].Odometer!.Value - measured[0].Odometer!.Value;
                per100 = Math.Round(measured.Skip(1).Sum(f => f.Liters!.Value) / km.Value * 100, 1);
            }
            return new FuelReportRow(g.Key.VehicleId, g.Key.Plate, g.Count(), liters, g.Sum(f => f.Amount), price, km, per100);
        }).OrderBy(r => r.Plate).ToList();
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
        var rows = await db.Expenses.Where(e => e.Date >= from && e.Date <= to && e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => e.Category).Select(g => new { g.Key, Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);
        return rows.OrderByDescending(r => r.Sum).Select(r => new ExpenseCategoryRow(r.Key.ToString(), r.Sum)).ToList();
    }

    public async Task<List<CustomerProfitRow>> CustomerProfitAsync(DateOnly from, DateOnly to, BalanceService balances, CancellationToken ct = default)
    {
        var rows = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => new { t.CustomerId, t.Customer.Title })
            .Select(g => new
            {
                g.Key.CustomerId, g.Key.Title, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice + t.Commission), VehicleCost = g.Sum(t => t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge)),
                Expenses = g.Sum(t => t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0),
            }).ToListAsync(ct);
        var open = (await balances.BalancesByCustomerAsync(rows.Select(r => r.CustomerId), ct));
        var days = Math.Max(1, to.DayNumber - from.DayNumber + 1);
        return rows.Select(r =>
        {
            var cost = r.VehicleCost + r.Expenses;
            var profit = r.Revenue - cost;
            var receivable = open[r.CustomerId].Sum(b => b.Remaining);
            // Yaklaşık tahsil süresi (DSO): açık alacak / (dönem cirosu KDV'li ≈ ×1,2 / gün)
            int? dso = r.Revenue > 0 ? (int)Math.Round(receivable / (r.Revenue * 1.2m / days)) : null;
            return new CustomerProfitRow(r.CustomerId, r.Title, r.Count, r.Revenue, cost, profit,
                r.Revenue > 0 ? Math.Round(profit / r.Revenue * 100, 1) : null, receivable, dso);
        }).OrderByDescending(r => r.Profit).ToList();
    }

    public async Task<List<RouteProfitRow>> RouteProfitAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await db.Trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to && t.Status != TripStatus.Cancelled)
            .GroupBy(t => new { t.LoadingCity, t.DeliveryCity })
            .Select(g => new
            {
                g.Key.LoadingCity, g.Key.DeliveryCity, Count = g.Count(), Revenue = g.Sum(t => t.SalePrice + t.Commission), VehicleCost = g.Sum(t => t.VehicleCost + t.DriverBonus + (t.ExtraChargeInvoiced ? 0 : t.ExtraCharge)),
                Expenses = g.Sum(t => t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0),
            }).ToListAsync(ct);
        return rows.Select(r =>
        {
            var cost = r.VehicleCost + r.Expenses;
            var profit = r.Revenue - cost;
            return new RouteProfitRow(r.LoadingCity ?? "İl girilmemiş", r.DeliveryCity ?? "İl girilmemiş", r.Count,
                Money.Round(r.Revenue / r.Count), Money.Round(cost / r.Count), profit, r.Revenue > 0 ? Math.Round(profit / r.Revenue * 100, 1) : null);
        }).OrderByDescending(r => r.TripCount).ThenByDescending(r => r.Profit).ToList();
    }
}
