using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.EInvoice;

/// <summary>
/// Entegratör sözleşmesi yokken (<c>EInvoice:Provider=manual</c>): XML üretilir ve indirilir, e-Fatura portalına /
/// muhasebeciye elle verilir. Gönderim ve durum sorgusu yoktur; kullanıcı "Gönderildi olarak işaretle" der.
/// </summary>
public class ManualXmlProvider : IEInvoiceProvider
{
    public string Key => "manual";
    public string Name => "Elle (XML indir)";
    public bool CanSend => false;
    public bool SupportsStatus => false;
    public bool SupportsRecipientCheck => false;
    public Task<EInvoiceResult> SendAsync(Invoice invoice, string ublXml, CancellationToken ct = default) =>
        Task.FromResult(new EInvoiceResult(EInvoiceStatus.Ready, null, "XML'i indirip e-Fatura portalına yükleyin."));
    public Task<EInvoiceResult> GetStatusAsync(Invoice invoice, CancellationToken ct = default) =>
        Task.FromResult(new EInvoiceResult(invoice.EInvoiceStatus));
    public Task<EInvoiceResult> CancelAsync(Invoice invoice, string reason, CancellationToken ct = default) =>
        Task.FromResult(new EInvoiceResult(EInvoiceStatus.CancelRequested, null, "İptali entegratör portalından ya da GİB üzerinden yapın."));
    public Task<EInvoiceRecipient?> CheckRecipientAsync(string taxNumber, CancellationToken ct = default) => Task.FromResult<EInvoiceRecipient?>(null);
}

/// <summary>
/// Yalnızca geliştirme ve testler için sahte entegratör: gönderince "Gönderildi", her durum sorgusunda bir adım ilerler
/// (Gönderildi → Teslim edildi → Kabul; e-Arşivde Teslim edildi'de kalır). VKN'si 9 ile biten alıcı e-Fatura mükellefi sayılır.
/// </summary>
public class MockEInvoiceProvider : IEInvoiceProvider
{
    public string Key => "mock";
    public string Name => "Test (sahte entegratör)";
    public bool CanSend => true;
    public bool SupportsStatus => true;
    public bool SupportsRecipientCheck => true;

    public Task<EInvoiceResult> SendAsync(Invoice invoice, string ublXml, CancellationToken ct = default) =>
        Task.FromResult(ublXml.Contains(invoice.EInvoiceNo ?? "?")
            ? new EInvoiceResult(EInvoiceStatus.Sent, invoice.EInvoiceNo, "Test entegratörüne gönderildi.")
            : new EInvoiceResult(EInvoiceStatus.Failed, null, "XML fatura numarasını içermiyor."));

    public Task<EInvoiceResult> GetStatusAsync(Invoice invoice, CancellationToken ct = default) => Task.FromResult(invoice.EInvoiceStatus switch
    {
        EInvoiceStatus.Sent => new EInvoiceResult(EInvoiceStatus.Delivered, null, "Alıcıya ulaştı."),
        EInvoiceStatus.Delivered when invoice.Scenario == EInvoiceScenario.Ticari => new EInvoiceResult(EInvoiceStatus.Accepted, null, "Alıcı kabul etti."),
        var s => new EInvoiceResult(s),
    });

    public Task<EInvoiceResult> CancelAsync(Invoice invoice, string reason, CancellationToken ct = default) =>
        Task.FromResult(invoice.Scenario == EInvoiceScenario.EArsiv
            ? new EInvoiceResult(EInvoiceStatus.Cancelled, null, "e-Arşiv fatura iptal edildi.")
            : new EInvoiceResult(EInvoiceStatus.CancelRequested, null, "e-Fatura iptali için alıcının onayı gerekir."));

    public Task<EInvoiceRecipient?> CheckRecipientAsync(string taxNumber, CancellationToken ct = default) =>
        Task.FromResult<EInvoiceRecipient?>(taxNumber.EndsWith('9')
            ? new EInvoiceRecipient(true, [$"urn:mail:defaultpk@{taxNumber}.test"])
            : new EInvoiceRecipient(false, []));
}
