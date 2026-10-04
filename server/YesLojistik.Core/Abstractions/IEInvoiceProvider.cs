using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Abstractions;

/// <summary>
/// Sağlayıcının gönderim / sorgu sonucu. Number: entegratörün verdiği fatura numarası (varsa).
/// ProviderRef: entegratörün kendi kayıt kimliği (durum sorgusu için gerekebilir; çoğu entegratörde ETTN yeter).
/// Şu an veritabanına yazılmaz; gerçek bir adaptör eklenirken Invoice'a alan açılır (docs/ENTEGRATOR-EKLEME.md).
/// </summary>
public record EInvoiceResult(EInvoiceStatus Status, string? Number = null, string? Message = null, string? ProviderRef = null);

public enum EInvoiceDocumentKind { Xml, Pdf }

/// <summary>Sağlayıcıdan indirilen belge (imzalı XML ya da PDF görünümü).</summary>
public record EInvoiceDocument(byte[] Content, string ContentType, string FileName);

/// <summary>Alıcının e-Fatura mükellefiyeti (GİB kullanıcı listesi).</summary>
public record EInvoiceRecipient(bool IsEInvoiceUser, IReadOnlyList<string> Aliases, string? Title = null);

/// <summary>
/// GİB e-Fatura / e-Arşiv özel entegratörü. Sağlayıcı <c>EInvoice:Provider</c> ayarıyla seçilir:
/// <list type="bullet">
/// <item><c>manual</c> (varsayılan; eski adıyla <c>FileExport</c>): UBL-TR XML üretilir, indirilip e-Fatura portalına ya da
/// muhasebeciye verilir; kullanıcı "Gönderildi" olarak işaretler (<c>ManualXmlProvider</c>).</item>
/// <item><c>Mock</c>: yalnızca geliştirme/test; gönderimi taklit eder.</item>
/// <item>Gerçek entegratör: sözleşme sonrası bu arayüzü uygulayan bir adaptör eklenir ve <c>EInvoiceProviders</c> kayıt
/// tablosuna bir satırla bağlanır (docs/ENTEGRATOR-EKLEME.md).</item>
/// </list>
/// API anahtarları yalnızca ortam değişkenlerinde tutulur.
/// </summary>
public interface IEInvoiceProvider
{
    /// <summary>Yapılandırmadaki kısa ad (<c>EInvoice:Provider</c>): "manual", "mock", entegratör adı.</summary>
    string Key { get; }
    /// <summary>Ayarlarda gösterilen ad ("Elle (XML indir)", "Test", "Entegratör adı").</summary>
    string Name { get; }
    /// <summary>Faturayı doğrudan gönderebilir mi? false ise XML elle yüklenir.</summary>
    bool CanSend { get; }
    bool SupportsStatus { get; }
    bool SupportsRecipientCheck { get; }
    /// <summary>İmzalı XML / PDF görünümü sağlayıcıdan indirilebiliyor mu?</summary>
    bool SupportsDownload => false;

    Task<EInvoiceResult> SendAsync(Invoice invoice, string ublXml, CancellationToken ct = default);
    Task<EInvoiceResult> GetStatusAsync(Invoice invoice, CancellationToken ct = default);
    Task<EInvoiceResult> CancelAsync(Invoice invoice, string reason, CancellationToken ct = default);
    Task<EInvoiceRecipient?> CheckRecipientAsync(string taxNumber, CancellationToken ct = default);
    /// <summary>Entegratörün ürettiği imzalı XML ya da PDF. Desteklemeyen sağlayıcıda null.</summary>
    Task<EInvoiceDocument?> DownloadAsync(Invoice invoice, EInvoiceDocumentKind kind, CancellationToken ct = default) =>
        Task.FromResult<EInvoiceDocument?>(null);
}
