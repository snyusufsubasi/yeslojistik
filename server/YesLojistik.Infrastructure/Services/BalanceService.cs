using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Tahsilatların faturalara dağılımını ve cari bakiyeleri hesaplar. Bakiye saklanmaz, her seferinde hesaplanır.</summary>
public class BalanceService(AppDbContext db)
{
    /// <summary>Devir bakiyesi, faturalarla aynı dağıtıma bu sahte (negatif) fatura numarasıyla girer.</summary>
    public static int OpeningBalanceId(int customerId) => -customerId;

    /// <param name="customerIds">null ise tüm müşteriler.</param>
    public async Task<Dictionary<int, InvoiceBalance>> InvoiceBalancesAsync(IEnumerable<int>? customerIds = null, CancellationToken ct = default) =>
        (await BalancesByCustomerAsync(customerIds, ct)).SelectMany(g => g).ToDictionary(b => b.InvoiceId);

    /// <summary>Müşteri bazında fatura (ve devir) bakiyeleri. Devir satırının InvoiceId'si negatiftir.</summary>
    public async Task<ILookup<int, InvoiceBalance>> BalancesByCustomerAsync(IEnumerable<int>? customerIds = null, CancellationToken ct = default)
    {
        var ids = customerIds?.Distinct().ToList();
        var invQuery = db.Invoices.Where(i => i.Status == InvoiceStatus.Issued);
        var payQuery = db.Payments.Where(Payment.Counts);
        if (ids != null)
        {
            invQuery = invQuery.Where(i => ids.Contains(i.CustomerId));
            payQuery = payQuery.Where(p => ids.Contains(p.CustomerId));
        }

        var invoices = await invQuery.Select(i => new { i.CustomerId, Inv = new AllocInvoice(i.Id, i.Date, i.DueDate, i.Total) }).ToListAsync(ct);
        var openQuery = db.Customers.Where(c => c.OpeningBalance > 0);
        if (ids != null) openQuery = openQuery.Where(c => ids.Contains(c.Id));
        var openings = await openQuery.Select(c => new { c.Id, c.OpeningBalance, c.OpeningBalanceDate, c.CreatedAt }).ToListAsync(ct);
        invoices.AddRange(openings.Select(c =>
        {
            var d = c.OpeningBalanceDate ?? DateOnly.FromDateTime(c.CreatedAt);
            return new { CustomerId = c.Id, Inv = new AllocInvoice(OpeningBalanceId(c.Id), d, d, c.OpeningBalance) };
        }));
        var payments = await payQuery.Select(p => new { p.CustomerId, Pay = new AllocPayment(p.InvoiceId, p.Date, p.Amount) }).ToListAsync(ct);

        var paymentsByCustomer = payments.ToLookup(p => p.CustomerId, p => p.Pay);
        return invoices.GroupBy(i => i.CustomerId)
            .SelectMany(g => PaymentAllocator.Allocate(g.Select(x => x.Inv), paymentsByCustomer[g.Key]).Select(b => (g.Key, b)))
            .ToLookup(x => x.Key, x => x.b);
    }

    public static string PaymentStatus(InvoiceStatus status, InvoiceBalance? balance) => status switch
    {
        InvoiceStatus.Draft => "Taslak",
        InvoiceStatus.Cancelled => "İptal",
        _ when balance == null => "Açık",
        _ when balance.Remaining <= 0 => "Ödendi",
        _ when balance.Paid > 0 => "Kısmi Ödendi",
        _ when balance.DueDate < Clock.Today => "Vadesi Geçti",
        _ => "Açık",
    };
}
