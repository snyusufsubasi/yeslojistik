using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class InvoiceService(AppDbContext db, BalanceService balances, IEInvoiceProvider eInvoice)
{
    private static readonly Dictionary<string, Expression<Func<Invoice, object?>>> SortMap = new()
    {
        ["date"] = i => i.Date,
        ["dueDate"] = i => i.DueDate,
        ["invoiceNo"] = i => i.InvoiceNo,
        ["customer"] = i => i.Customer.Title,
        ["total"] = i => i.Total,
        ["status"] = i => i.Status,
    };

    public async Task<PagedResult<InvoiceDto>> ListAsync(InvoiceQuery q, CancellationToken ct = default, bool export = false)
    {
        var query = db.Invoices.AsNoTracking();
        if (q.CustomerId is { } c) query = query.Where(i => i.CustomerId == c);
        if (q.Status is { } s) query = query.Where(i => i.Status == s);
        if (q.From is { } from) query = query.Where(i => i.Date >= from);
        if (q.To is { } to) query = query.Where(i => i.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(i => EF.Functions.ILike(i.InvoiceNo, like) || EF.Functions.ILike(i.Customer.Title, like));
        if (q.Unpaid == true)
        {
            var open = (await balances.InvoiceBalancesAsync(q.CustomerId is { } cid ? [cid] : null, ct))
                .Values.Where(b => b.Remaining > 0).Select(b => b.InvoiceId).ToList();
            query = query.Where(i => open.Contains(i.Id));
        }

        var (items, total, page, size) = await query
            .ApplySort(q.Sort, q.Desc, SortMap, "date")
            .Select(i => new { Invoice = i, i.Customer.Title })
            .PageAsync(q, ct, export ? QueryExtensions.ExportLimit : QueryExtensions.MaxPageSize);
        var bal = await balances.InvoiceBalancesAsync(items.Select(i => i.Invoice.CustomerId), ct);
        return new PagedResult<InvoiceDto>(items.Select(x => ToDto(x.Invoice, x.Title, bal, [])).ToList(), total, page, size);
    }

    public async Task<InvoiceDto> GetAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.AsNoTracking().Include(i => i.Customer).Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        var bal = await balances.InvoiceBalancesAsync([inv.CustomerId], ct);
        return ToDto(inv, inv.Customer.Title, bal, inv.Lines.OrderBy(l => l.Id).Select(l => new InvoiceLineDto(l.Id, l.TripId, l.Description, l.Amount)).ToList());
    }

    public async Task<InvoiceDto> CreateAsync(InvoiceCreateRequest req, CancellationToken ct = default)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == req.CustomerId, ct)) throw new DomainException("Müşteri bulunamadı.");
        var settings = await db.CompanySettings.AsNoTracking().FirstAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var tripIds = req.TripIds.Distinct().ToList();
        var trips = await db.Trips.Include(t => t.Vehicle).Where(t => tripIds.Contains(t.Id)).OrderBy(t => t.LoadingDate).ToListAsync(ct);
        if (trips.Count != tripIds.Count) throw new DomainException("Seçilen seferlerden bazıları bulunamadı.");
        if (trips.Any(t => t.CustomerId != req.CustomerId)) throw new DomainException("Seçilen seferler faturadaki müşteriye ait değil.");
        if (trips.Any(t => t.InvoiceId != null)) throw new DomainException("Seçilen seferlerden bazıları zaten faturalanmış.");
        if (trips.Any(t => t.Status == TripStatus.Cancelled)) throw new DomainException("İptal edilmiş sefer faturalanamaz.");

        var lines = trips.Select(t => new InvoiceLine
        {
            TripId = t.Id,
            Description = $"{Formatters.Date(t.LoadingDate)} {t.LoadingAddress} → {t.DeliveryAddress} nakliye bedeli ({t.Vehicle.Plate})",
            Amount = t.SalePrice,
        }).ToList();
        lines.AddRange((req.ExtraLines ?? []).Select(l => new InvoiceLine { Description = l.Description.Trim(), Amount = Money.Round(l.Amount) }));

        var totals = InvoiceCalculator.Calculate(lines.Select(l => l.Amount), req.VatRate, req.WithholdingTenths);
        var invoice = new Invoice
        {
            InvoiceNo = await NextInvoiceNoAsync(ct),
            CustomerId = req.CustomerId,
            Date = req.Date,
            DueDate = req.DueDate ?? req.Date.AddDays(settings.DefaultPaymentTermDays),
            VatRate = req.VatRate,
            WithholdingTenths = req.WithholdingTenths,
            Subtotal = totals.Subtotal,
            VatAmount = totals.VatAmount,
            WithholdingAmount = totals.WithholdingAmount,
            Total = totals.Total,
            Status = req.AsDraft ? InvoiceStatus.Draft : InvoiceStatus.Issued,
            Notes = req.Notes?.Trim(),
            Lines = lines,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(ct);
        foreach (var t in trips) t.InvoiceId = invoice.Id;
        await db.SaveChangesAsync(ct);

        if (invoice.Status == InvoiceStatus.Issued && eInvoice.IsEnabled)
        {
            invoice.ExternalId = await eInvoice.SendAsync(invoice, ct);
            await db.SaveChangesAsync(ct);
        }
        await tx.CommitAsync(ct);
        return await GetAsync(invoice.Id, ct);
    }

    public async Task<InvoiceDto> IssueAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Status != InvoiceStatus.Draft) throw new DomainException("Yalnızca taslak faturalar kesilebilir.");
        inv.Status = InvoiceStatus.Issued;
        if (eInvoice.IsEnabled) inv.ExternalId = await eInvoice.SendAsync(inv, ct);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Fatura silinmez, iptal edilir (numara boşluğu oluşmasın). Bağlı seferler serbest kalır.</summary>
    public async Task<InvoiceDto> CancelAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Trips).FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Status == InvoiceStatus.Cancelled) throw new DomainException("Fatura zaten iptal edilmiş.");
        if (await db.Payments.AnyAsync(p => p.InvoiceId == id, ct))
            throw new DomainException("Bu faturaya bağlı tahsilatlar var. Önce tahsilatların fatura bağlantısını kaldırın.");
        if (inv.Status == InvoiceStatus.Issued && eInvoice.IsEnabled) await eInvoice.CancelAsync(inv, ct);
        inv.Status = InvoiceStatus.Cancelled;
        foreach (var t in inv.Trips) t.InvoiceId = null;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>
    /// Sıradaki fatura numarasını satır kilidiyle atomik olarak alır. Açık transaction geri alınırsa numara da geri alınır,
    /// böylece numara boşluğu oluşmaz.
    /// </summary>
    private async Task<string> NextInvoiceNoAsync(CancellationToken ct)
    {
        var row = (await db.Database.SqlQuery<NumberRow>($"""
            UPDATE company_settings SET next_invoice_number = next_invoice_number + 1
            WHERE id = 1 RETURNING invoice_prefix AS "Prefix", next_invoice_number - 1 AS "Number"
            """).ToListAsync(ct)).Single();
        return $"{row.Prefix}-{row.Number:D6}";
    }

    private record NumberRow(string Prefix, int Number);

    private static InvoiceDto ToDto(Invoice i, string customerTitle, IReadOnlyDictionary<int, InvoiceBalance> bal, IReadOnlyList<InvoiceLineDto> lines)
    {
        var b = i.Status == InvoiceStatus.Issued ? bal.GetValueOrDefault(i.Id) : null;
        var paid = b?.Paid ?? 0;
        var remaining = i.Status == InvoiceStatus.Issued ? b?.Remaining ?? i.Total : 0;
        return new InvoiceDto(i.Id, i.InvoiceNo, i.CustomerId, customerTitle, i.Date, i.DueDate, i.Subtotal, i.VatRate,
            i.VatAmount, i.WithholdingTenths, i.WithholdingAmount, i.Total, paid, remaining, i.Status,
            BalanceService.PaymentStatus(i.Status, b), i.Notes, lines);
    }
}

public class NullEInvoiceProvider : IEInvoiceProvider
{
    public bool IsEnabled => false;
    public Task<string?> SendAsync(Invoice invoice, CancellationToken ct = default) => Task.FromResult<string?>(null);
    public Task CancelAsync(Invoice invoice, CancellationToken ct = default) => Task.CompletedTask;
}
