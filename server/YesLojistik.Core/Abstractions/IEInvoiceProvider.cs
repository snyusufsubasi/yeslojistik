using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Abstractions;

/// <summary>Sağlayıcının gönderim / sorgu sonucu. Number: entegratörün verdiği fatura numarası (varsa).</summary>
public record EInvoiceResult(EInvoiceStatus Status, string? Number = null, string? Message = null);

/// <summary>Alıcının e-Fatura mükellefiyeti (GİB kullanıcı listesi).</summary>
public record EInvoiceRecipient(bool IsEInvoiceUser, IReadOnlyList<string> Aliases, string? Title = null);

/// <summary>
/// GİB e-Fatura / e-Arşiv özel entegratörü. Sağlayıcı <c>EInvoice:Provider</c> ayarıyla seçilir:
/// <list type="bullet">
/// <item><c>FileExport</c> (varsayılan): UBL-TR XML üretilir, indirilip entegratör portalına ya da muhasebeciye verilir;
/// kullanıcı "Gönderildi" olarak işaretler.</item>
/// <item><c>Mock</c>: yalnızca geliştirme/test; gönderimi taklit eder.</item>
/// <item>Gerçek entegratör: sözleşme sonrası bu arayüzü uygulayan bir adaptör eklenir (docs/E-FATURA.md).</item>
/// </list>
/// API anahtarları yalnızca ortam değişkenlerinde tutulur.
/// </summary>
public interface IEInvoiceProvider
{
    /// <summary>Ayarlarda gösterilen ad ("Elle (XML indir)", "Test", "Entegratör adı").</summary>
    string Name { get; }
    /// <summary>Faturayı doğrudan gönderebilir mi? false ise XML elle yüklenir.</summary>
    bool CanSend { get; }
    bool SupportsStatus { get; }
    bool SupportsRecipientCheck { get; }

    Task<EInvoiceResult> SendAsync(Invoice invoice, string ublXml, CancellationToken ct = default);
    Task<EInvoiceResult> GetStatusAsync(Invoice invoice, CancellationToken ct = default);
    Task<EInvoiceResult> CancelAsync(Invoice invoice, string reason, CancellationToken ct = default);
    Task<EInvoiceRecipient?> CheckRecipientAsync(string taxNumber, CancellationToken ct = default);
}
