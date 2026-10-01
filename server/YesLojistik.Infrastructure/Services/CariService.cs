using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Bütün müşterilerin ve tedarikçilerin cari özetini tek tabloda verir. Tutarlar cari ekranı ve ekstreyle aynı kurallarla hesaplanır.</summary>
public class CariService(AppDbContext db, BalanceService balances, PayableService payables)
{
    public async Task<List<CustomerCariRow>> CustomersAsync(CancellationToken ct = default)
    {
        var customers = await db.Customers.AsNoTracking()
            .Select(c => new { c.Id, c.Title, c.TaxNumber, c.Phone, c.OpeningBalance }).ToListAsync(ct);
        var invoiced = await db.Invoices.Where(i => i.Status == InvoiceStatus.Issued)
            .GroupBy(i => i.CustomerId).Select(g => new { g.Key, Sum = g.Sum(i => i.Total) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var collected = await db.Payments.Where(Payment.Counts)
            .GroupBy(p => p.CustomerId).Select(g => new { g.Key, Sum = g.Sum(p => p.Amount) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var uninvoiced = await db.Trips.Where(t => !t.IsLegacy && t.Status == TripStatus.Delivered && t.InvoiceId == null)
            .GroupBy(t => t.CustomerId).Select(g => new { g.Key, Count = g.Count(), Sum = g.Sum(t => t.SalePrice) })
            .ToDictionaryAsync(x => x.Key, ct);
        var overdue = (await balances.BalancesByCustomerAsync(null, ct))
            .ToDictionary(g => g.Key, g => g.Where(b => b.Remaining > 0 && b.DueDate < Clock.Today).Sum(b => b.Remaining));

        return customers.Select(c =>
        {
            var inv = invoiced.GetValueOrDefault(c.Id);
            var col = collected.GetValueOrDefault(c.Id);
            var un = uninvoiced.GetValueOrDefault(c.Id);
            return new CustomerCariRow(c.Id, c.Id.ToString("D5"), c.Title, c.TaxNumber, c.Phone, c.OpeningBalance, inv, col,
                c.OpeningBalance + inv - col, overdue.GetValueOrDefault(c.Id), un?.Count ?? 0, un?.Sum ?? 0);
        }).OrderByDescending(r => r.Balance).ThenBy(r => r.Title).ToList();
    }

    public async Task<List<SupplierCariRow>> SuppliersAsync(CancellationToken ct = default)
    {
        var suppliers = await db.Suppliers.AsNoTracking()
            .Select(s => new { s.Id, s.Title, s.TaxNumber, s.Phone, s.OpeningBalance }).ToListAsync(ct);
        var items = await payables.ItemsAsync(null, ct);
        var byKind = items.GroupBy(i => i.SupplierId).ToDictionary(g => g.Key, g => new
        {
            // Alınan faturalar, faturalanan seferlerin yerini alır: ikisi birlikte sefer borcudur.
            Trips = g.Where(i => i.Kind is PayableKind.Trip or PayableKind.Invoice).Sum(i => i.Total),
            Expenses = g.Where(i => i.Kind == PayableKind.Expense).Sum(i => i.Total),
            Overdue = g.Where(i => i.Remaining > 0 && i.DueDate < Clock.Today).Sum(i => i.Remaining),
        });
        var paid = await db.SupplierPayments.GroupBy(p => p.SupplierId).Select(g => new { g.Key, Sum = g.Sum(p => p.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var trips = await db.Trips.Where(t => t.CarrierSupplierId != null).GroupBy(t => t.CarrierSupplierId!.Value)
            .Select(g => new { g.Key, Count = g.Count(),
                Missing = g.Count(t => !t.IsLegacy && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null) })
            .ToDictionaryAsync(x => x.Key, ct);

        return suppliers.Select(s =>
        {
            var k = byKind.GetValueOrDefault(s.Id);
            var p = paid.GetValueOrDefault(s.Id);
            var t = trips.GetValueOrDefault(s.Id);
            var tripCost = k?.Trips ?? 0;
            var exp = k?.Expenses ?? 0;
            return new SupplierCariRow(s.Id, $"T{s.Id:D5}", s.Title, s.TaxNumber, s.Phone, s.OpeningBalance, tripCost, exp, p,
                s.OpeningBalance + tripCost + exp - p, k?.Overdue ?? 0, t?.Count ?? 0, t?.Missing ?? 0);
        }).OrderByDescending(r => r.Balance).ThenBy(r => r.Title).ToList();
    }
}
