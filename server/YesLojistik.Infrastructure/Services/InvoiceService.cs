using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class InvoiceService(AppDbContext db, BalanceService balances, EInvoice.EInvoiceService eInvoice)
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
        var query = await FilterAsync(q, ct);
        var (items, total, page, size) = await query
            .ApplySort(q.Sort, q.Desc, SortMap, "date")
            .Select(i => new { Invoice = i, i.Customer.Title })
            .PageAsync(q, ct, export ? QueryExtensions.ExportLimit : QueryExtensions.MaxPageSize);
        var bal = await balances.InvoiceBalancesAsync(items.Select(i => i.Invoice.CustomerId), ct);
        return new PagedResult<InvoiceDto>(items.Select(x => ToDto(x.Invoice, x.Title, bal, [])).ToList(), total, page, size);
    }

    /// <summary>
    /// Filtrenin tamamının toplamı (yalnızca sayfanın değil). Durum seçilmediyse tutarlar kesilmiş faturalardan toplanır;
    /// taslak ve iptaller kayıt sayısına girer ama tutara girmez.
    /// </summary>
    public async Task<InvoiceTotalsDto> TotalsAsync(InvoiceQuery q, CancellationToken ct = default)
    {
        var query = await FilterAsync(q, ct);
        var count = await query.CountAsync(ct);
        var counted = q.Status is null ? query.Where(i => i.Status == InvoiceStatus.Issued) : query;
        var rows = await counted.Select(i => new { i.Id, i.CustomerId, i.Subtotal, i.VatAmount, i.WithholdingAmount, i.Total }).ToListAsync(ct);
        var bal = await balances.InvoiceBalancesAsync(rows.Select(r => r.CustomerId).Distinct(), ct);
        return new InvoiceTotalsDto(count, rows.Sum(r => r.Subtotal), rows.Sum(r => r.VatAmount), rows.Sum(r => r.WithholdingAmount),
            rows.Sum(r => r.Total), rows.Sum(r => bal.TryGetValue(r.Id, out var b) ? b.Remaining : 0));
    }

    private async Task<IQueryable<Invoice>> FilterAsync(InvoiceQuery q, CancellationToken ct)
    {
        var query = db.Invoices.AsNoTracking().WhereIds(q.Ids);
        if (q.CustomerId is { } c) query = query.Where(i => i.CustomerId == c);
        if (q.Status is { } s) query = query.Where(i => i.Status == s);
        if (q.From is { } from) query = query.Where(i => i.Date >= from);
        if (q.To is { } to) query = query.Where(i => i.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(i => EF.Functions.ILike(i.InvoiceNo, like) || EF.Functions.ILike(i.Customer.Title, like));
        if (!string.IsNullOrWhiteSpace(q.TripNo))
        {
            // Sevkiyat no ekranda "No {eski no ?? sefer no}" diye görünür; pratikortam numaraları S öneksiz de yazılabilir.
            var no = q.TripNo.Trim().ToUpperInvariant();
            var withPrefix = no.StartsWith('S') ? no : "S" + no;
            var id = int.TryParse(no, out var n) ? n : 0;
            var tripIds = db.Trips.Where(t => t.ExternalRef != null
                    ? t.ExternalRef.ToUpper() == no || t.ExternalRef.ToUpper() == withPrefix
                    : t.Id == id)
                .Select(t => t.Id);
            query = query.Where(i => i.Trips.Any(t => tripIds.Contains(t.Id)) || i.Lines.Any(l => l.TripId != null && tripIds.Contains(l.TripId.Value)));
        }
        if (q.Unpaid == true)
        {
            var open = (await balances.InvoiceBalancesAsync(q.CustomerId is { } cid ? [cid] : null, ct))
                .Values.Where(b => b.Remaining > 0).Select(b => b.InvoiceId).ToList();
            query = query.Where(i => open.Contains(i.Id));
        }
        return query;
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
        if (trips.Any(t => t.IsLegacy)) throw new DomainException("Eski sistemden aktarılan seferler yeniden faturalanamaz (tutarları devir bakiyesinde).");
        if (trips.Any(t => t.Status == TripStatus.Cancelled)) throw new DomainException("İptal edilmiş sefer faturalanamaz.");
        if (trips.Select(t => t.SaleVatRate).Distinct().Skip(1).Any())
            throw new DomainException("Seçilen seferlerin KDV oranları farklı. Ayrı fatura kesin.");

        // Sahip olunan tip tek başına izlenmeden sorgulanamaz; müşteriyle birlikte okunur.
        var customer = await db.Customers.AsNoTracking().FirstAsync(c => c.Id == req.CustomerId, ct);
        var template = customer.InvoiceTemplate ?? new InvoiceTemplate();
        var lines = trips.Select(t => new InvoiceLine
        {
            TripId = t.Id,
            Description = LineDescription(t, template),
            Amount = t.SalePrice,
        }).ToList();
        // Müşteriye faturalanan sefer masrafları ayrı satır olur (eski paneldeki "masraf – faturalandır").
        lines.AddRange(trips.Where(t => t.ExtraChargeInvoiced && t.ExtraCharge > 0).Select(t => new InvoiceLine
        {
            TripId = t.Id,
            Description = Fit($"{Formatters.Date(t.LoadingDate)} {t.LoadingAddress} → {t.DeliveryAddress} ek masraf" + (t.ExtraChargeTitle is { } m ? $" ({m})" : "")),
            // Tutar KDV dahil girildiyse fatura satırına KDV hariç yazılır.
            Amount = t.ExtraChargeVatIncluded && req.VatRate > 0 ? Money.Round(t.ExtraCharge * 100 / (100 + req.VatRate)) : t.ExtraCharge,
        }));
        // Seferlerde "faturaya yansıt" işaretli notlar faturanın notuna eklenir.
        var tripNotes = template.TripFooterNotes
            ? trips.Where(t => t.ShowFooterNote && t.InvoiceFooterNote != null).Select(t => t.InvoiceFooterNote!).Distinct().ToList() : [];
        lines.AddRange((req.ExtraLines ?? []).Select(l => new InvoiceLine { Description = l.Description.Trim(), Amount = Money.Round(l.Amount) }));

        // Tevkifat boşsa (otomatik) tutara ve alıcının VKN/TCKN'sine göre belirlenir (docs/KDV-KURALLARI.md).
        var withholding = InvoiceCalculator.WithholdingFor(Money.Round(lines.Sum(l => Money.Round(l.Amount))), req.VatRate, req.WithholdingTenths, customer.TaxNumber);
        var totals = InvoiceCalculator.Calculate(lines.Select(l => l.Amount), req.VatRate, withholding);
        var invoice = new Invoice
        {
            InvoiceNo = await NextInvoiceNoAsync(ct),
            CustomerId = req.CustomerId,
            Date = req.Date,
            DueDate = req.DueDate ?? req.Date.AddDays(await db.Customers.Where(c => c.Id == req.CustomerId).Select(c => c.PaymentTermDays).FirstAsync(ct) ?? settings.DefaultPaymentTermDays),
            VatRate = req.VatRate,
            WithholdingTenths = withholding,
            VatExemptionCode = req.VatRate == 0 ? (string.IsNullOrWhiteSpace(req.VatExemptionCode) ? InvoiceCalculator.DefaultVatExemptionCode : req.VatExemptionCode.Trim()) : null,
            Subtotal = totals.Subtotal,
            VatAmount = totals.VatAmount,
            WithholdingAmount = totals.WithholdingAmount,
            Total = totals.Total,
            Status = req.AsDraft ? InvoiceStatus.Draft : InvoiceStatus.Issued,
            Notes = string.Join('\n', new[] { req.Notes?.Trim() }.Concat(tripNotes).Where(s => !string.IsNullOrWhiteSpace(s))) is { Length: > 0 } n ? n : null,
            Lines = lines,
        };
        if (invoice.Status == InvoiceStatus.Issued) await eInvoice.PrepareAsync(invoice, ct);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(ct);
        foreach (var t in trips) t.InvoiceId = invoice.Id;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await AutoSendAsync(invoice, ct);
        return await GetAsync(invoice.Id, ct);
    }

    private static string Fit(string s) => s.Length <= 300 ? s : s[..297] + "...";

    /// <summary>Fatura satırı açıklaması: müşterinin şablonunda işaretli sefer bilgileri + "nakliye bedeli".</summary>
    public static string LineDescription(Trip t, InvoiceTemplate x)
    {
        var parts = new List<string>();
        if (x.LineDate) parts.Add(Formatters.Date(t.LoadingDate));
        var route = (x.LineLoading, x.LineDelivery) switch
        {
            (true, true) => $"{t.LoadingAddress} → {t.DeliveryAddress}",
            (true, false) => t.LoadingAddress,
            (false, true) => t.DeliveryAddress,
            _ => null,
        };
        if (route != null) parts.Add(route);
        parts.Add("nakliye bedeli");
        var extra = new List<string>();
        if (x.LinePlate) extra.Add(t.Vehicle.Plate);
        if (x.LineVehicleType && !string.IsNullOrWhiteSpace(t.Vehicle.Type)) extra.Add(t.Vehicle.Type);
        if (x.LineCargo && t.CargoType != null) extra.Add(t.CargoType);
        if (x.LineDeliveryDocumentNo && t.DeliveryDocumentNo != null) extra.Add($"Teslim No: {t.DeliveryDocumentNo}");
        var text = string.Join(" ", parts) + (extra.Count > 0 ? $" ({string.Join(", ", extra)})" : "");
        if (t.CustomerReference is { } r) text += $" (Ref: {r})";
        if (x.LineDescription && !string.IsNullOrWhiteSpace(t.Description)) text += $" – {t.Description}";
        return Fit(text);
    }

    public async Task<InvoiceDto> IssueAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Status != InvoiceStatus.Draft) throw new DomainException("Yalnızca taslak faturalar kesilebilir.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        inv.Status = InvoiceStatus.Issued;
        await eInvoice.PrepareAsync(inv, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await AutoSendAsync(inv, ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Entegratör bağlıysa kesilen e-Fatura hemen gönderilir; hata faturayı geri almaz, durumu "Hata" olur.</summary>
    private async Task AutoSendAsync(Invoice inv, CancellationToken ct)
    {
        if (inv.Ettn != null && inv.EInvoiceStatus == EInvoiceStatus.Ready && eInvoice.Provider.CanSend)
            await eInvoice.SendAsync(inv.Id, ct);
    }

    /// <summary>Fatura silinmez, iptal edilir (numara boşluğu oluşmasın). Bağlı seferler serbest kalır.</summary>
    public async Task<InvoiceDto> CancelAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Trips).FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Status == InvoiceStatus.Cancelled) throw new DomainException("Fatura zaten iptal edilmiş.");
        if (await db.Payments.AnyAsync(p => p.InvoiceId == id, ct))
            throw new DomainException("Bu faturaya bağlı tahsilatlar var. Önce tahsilatların fatura bağlantısını kaldırın.");
        if (inv.Status == InvoiceStatus.Issued) await eInvoice.OnCancelAsync(inv, ct);
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
            BalanceService.PaymentStatus(i.Status, b), i.Notes, lines, i.Scenario, i.TypeCode, i.Ettn, i.EInvoiceNo, i.EInvoiceStatus,
            i.EInvoiceMessage, i.EInvoiceSentAt, i.WithholdingCode, i.VatExemptionCode);
    }
}
