using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Abstractions;

/// <summary>
/// GİB e-Fatura / e-Arşiv özel entegratörü için genişleme noktası (v2).
/// v1'de <c>NullEInvoiceProvider</c> kullanılır: fatura yalnızca sistem içinde kaydedilir.
/// </summary>
public interface IEInvoiceProvider
{
    bool IsEnabled { get; }
    Task<string?> SendAsync(Invoice invoice, CancellationToken ct = default);
    Task CancelAsync(Invoice invoice, CancellationToken ct = default);
}
