using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.EInvoice;

/// <summary>
/// e-Fatura / e-Arşiv iş kuralları: kesilen faturaya senaryo, tip, ETTN ve GİB numarası verir; UBL-TR XML üretir;
/// sağlayıcı gönderebiliyorsa gönderir; durum ve iptal akışını yönetir.
/// </summary>
public class EInvoiceService(AppDbContext db, IEInvoiceProvider provider, ILogger<EInvoiceService> log)
{
    public IEInvoiceProvider Provider => provider;

    /// <summary>Fatura kesilirken çağrılır (aynı transaction içinde). e-Fatura kapalıysa hiçbir şey yapmaz.</summary>
    public async Task PrepareAsync(Invoice invoice, CancellationToken ct = default)
    {
        var s = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        if (!s.EInvoiceEnabled || invoice.Ettn != null) return;
        var customer = await db.Customers.AsNoTracking().FirstAsync(c => c.Id == invoice.CustomerId, ct);
        invoice.Scenario = customer.IsEInvoiceUser ? s.DefaultScenario : EInvoiceScenario.EArsiv;
        invoice.TypeCode = invoice.WithholdingTenths > 0 ? EInvoiceTypeCode.Tevkifat : EInvoiceTypeCode.Satis;
        invoice.WithholdingCode = invoice.WithholdingTenths > 0 ? invoice.WithholdingCode ?? EInvoiceCodes.DefaultWithholdingCode : null;
        invoice.Ettn = Guid.NewGuid();
        var prefix = invoice.Scenario == EInvoiceScenario.EArsiv ? s.EArchiveSeriesPrefix : s.EInvoiceSeriesPrefix;
        invoice.EInvoiceNo = await NextNumberAsync(prefix, invoice.Date.Year, ct);
        invoice.EInvoiceStatus = EInvoiceStatus.Ready;
    }

    /// <summary>
    /// GİB biçiminde numara: seri (3 harf) + yıl + 9 haneli sıra. Satır kilitli UPSERT ile boşluksuz ve eşzamanlı güvenli;
    /// transaction geri alınırsa numara da geri alınır.
    /// </summary>
    public async Task<string> NextNumberAsync(string prefix, int year, CancellationToken ct = default)
    {
        var next = (await db.Database.SqlQuery<long>($"""
            INSERT INTO e_invoice_sequences (prefix, year, next) VALUES ({prefix}, {year}, 2)
            ON CONFLICT (prefix, year) DO UPDATE SET next = e_invoice_sequences.next + 1
            RETURNING next - 1 AS "Value"
            """).ToListAsync(ct)).Single();
        return $"{prefix}{year}{next:D9}";
    }

    public async Task<(Invoice Invoice, Customer Customer, CompanySettings Company)> LoadAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        var customer = await db.Customers.AsNoTracking().FirstAsync(c => c.Id == inv.CustomerId, ct);
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        return (inv, customer, company);
    }

    public async Task<(byte[] Xml, string FileName)> XmlAsync(int id, CancellationToken ct = default)
    {
        var (inv, customer, company) = await LoadAsync(id, ct);
        if (inv.Ettn == null) throw new DomainException("Bu fatura e-Fatura kapsamında kesilmedi (e-Fatura ayarı kapalıydı ya da fatura taslak).");
        var xml = UblInvoiceBuilder.Build(inv, customer, company);
        return (System.Text.Encoding.UTF8.GetBytes(xml), $"{inv.EInvoiceNo}.xml");
    }

    /// <summary>Sağlayıcı gönderebiliyorsa gönderir. Hata faturayı bozmaz; durum "Hata" olur ve mesaj yazılır.</summary>
    public async Task SendAsync(int id, CancellationToken ct = default)
    {
        var (inv, customer, company) = await LoadAsync(id, ct);
        if (inv.Ettn == null) throw new DomainException("Bu fatura e-Fatura kapsamında değil.");
        if (inv.Status != InvoiceStatus.Issued) throw new DomainException("Yalnızca kesilmiş faturalar gönderilebilir.");
        if (!provider.CanSend) throw new DomainException("Entegratör bağlantısı yok. XML'i indirip entegratör portalına yükleyin, sonra \"Gönderildi olarak işaretle\" deyin.");
        if (inv.EInvoiceStatus is not (EInvoiceStatus.Ready or EInvoiceStatus.Failed)) throw new DomainException("Fatura zaten gönderilmiş.");
        try
        {
            var r = await provider.SendAsync(inv, UblInvoiceBuilder.Build(inv, customer, company), ct);
            Apply(inv, r);
            inv.EInvoiceSentAt = r.Status is EInvoiceStatus.Failed ? null : DateTime.UtcNow;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "e-Fatura gönderilemedi: {InvoiceId}", id);
            inv.EInvoiceStatus = EInvoiceStatus.Failed;
            inv.EInvoiceMessage = "Entegratöre ulaşılamadı. Biraz sonra tekrar deneyin.";
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Elle akış: XML entegratör portalına yüklendikten sonra kullanıcı işaretler.</summary>
    public async Task MarkSentAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Ettn == null || inv.EInvoiceStatus is not (EInvoiceStatus.Ready or EInvoiceStatus.Failed))
            throw new DomainException("Yalnızca gönderilmeye hazır e-Faturalar işaretlenebilir.");
        inv.EInvoiceStatus = EInvoiceStatus.Sent;
        inv.EInvoiceSentAt = DateTime.UtcNow;
        inv.EInvoiceMessage = "Elle gönderildi olarak işaretlendi.";
        await db.SaveChangesAsync(ct);
    }

    public async Task RefreshStatusAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (!provider.SupportsStatus || inv.EInvoiceStatus is not (EInvoiceStatus.Sent or EInvoiceStatus.Delivered or EInvoiceStatus.CancelRequested)) return;
        Apply(inv, await provider.GetStatusAsync(inv, ct));
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Fatura iptal edilirken: e-Arşiv sağlayıcı üzerinden iptal edilebilir; e-Fatura elektronik iptal edilemez,
    /// "İptal talep edildi" olur (alıcı onayı / GİB portalı gerekir).
    /// </summary>
    public async Task OnCancelAsync(Invoice inv, CancellationToken ct = default)
    {
        if (inv.Ettn == null) return;
        if (inv.EInvoiceStatus is EInvoiceStatus.Ready or EInvoiceStatus.Failed)
        {
            inv.EInvoiceStatus = EInvoiceStatus.Cancelled;
            inv.EInvoiceMessage = "Gönderilmeden iptal edildi.";
            return;
        }
        Apply(inv, provider.CanSend
            ? await provider.CancelAsync(inv, "Fatura iptali", ct)
            : new EInvoiceResult(EInvoiceStatus.CancelRequested, null, inv.Scenario == EInvoiceScenario.EArsiv
                ? "e-Arşiv iptalini entegratör portalından yapın."
                : "e-Fatura iptali için alıcının onayı ya da GİB portalından iptal talebi gerekir."));
    }

    /// <summary>İptal talebi tamamlandı (alıcı onayladı / portalda iptal edildi).</summary>
    public async Task ConfirmCancelAsync(int id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.EInvoiceStatus != EInvoiceStatus.CancelRequested) throw new DomainException("Bu faturada bekleyen bir iptal talebi yok.");
        inv.EInvoiceStatus = EInvoiceStatus.Cancelled;
        inv.EInvoiceMessage = "İptal tamamlandı olarak işaretlendi.";
        await db.SaveChangesAsync(ct);
    }

    private static void Apply(Invoice inv, EInvoiceResult r)
    {
        inv.EInvoiceStatus = r.Status;
        if (!string.IsNullOrWhiteSpace(r.Number)) inv.EInvoiceNo = r.Number.Length > 16 ? r.Number[..16] : r.Number;
        if (r.Message != null) inv.EInvoiceMessage = r.Message.Length > 500 ? r.Message[..500] : r.Message;
    }
}
