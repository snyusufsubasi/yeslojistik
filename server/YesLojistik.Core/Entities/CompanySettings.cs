namespace YesLojistik.Core.Entities;

public class CompanySettings
{
    public int Id { get; set; } = 1;
    public string CompanyName { get; set; } = "YES LOJİSTİK";
    public string? Slogan { get; set; } = "Güvenle, Her Yere...";
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Iban { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? MersisNo { get; set; }
    public string? TradeRegistryNo { get; set; }
    public string? Website { get; set; }
    public string? LogoDataUrl { get; set; }
    public string InvoicePrefix { get; set; } = "F";
    public int NextInvoiceNumber { get; set; } = 1;
    public decimal DefaultVatRate { get; set; } = 20;
    public int DefaultWithholdingTenths { get; set; } = 2;
    public int DefaultPaymentTermDays { get; set; } = 30;
    /// <summary>Örnek (demo) veri yüklüyse true; "Demo verilerini temizle" ile false olur.</summary>
    public bool HasSampleData { get; set; }
    /// <summary>Her sabah yöneticilere uyarı özeti e-postası.</summary>
    public bool DailyDigestEnabled { get; set; }
    public DateOnly? LastDigestDate { get; set; }
    /// <summary>Demo veriler temizlendiyse zamanı; bir daha örnek veri yüklenmez.</summary>
    public DateTime? SampleDataClearedAt { get; set; }
    /// <summary>Son yedeğin (panelden ya da otomatik) alındığı an.</summary>
    public DateTime? LastBackupAt { get; set; }
    /// <summary>Şoför "Teslim Edildi" demeden önce en az bir fotoğraf / imza yüklemiş olmalı.</summary>
    public bool RequireDeliveryPhoto { get; set; }
    public bool RequireDeliverySignature { get; set; }
    /// <summary>e-Fatura açık: kesilen faturaya ETTN ve GİB numarası verilir, UBL-TR XML üretilir.</summary>
    public bool EInvoiceEnabled { get; set; }
    public string EInvoiceSeriesPrefix { get; set; } = "YES";
    public string EArchiveSeriesPrefix { get; set; } = "YEA";
    /// <summary>e-Fatura mükellefi alıcılar için varsayılan senaryo (Temel ya da Ticari).</summary>
    public EInvoiceScenario DefaultScenario { get; set; } = EInvoiceScenario.Temel;
    /// <summary>Gönderici birim (GB) etiketi, ör. urn:mail:defaultgb@firma.com</summary>
    public string? SenderAlias { get; set; }
    public DateTime UpdatedAt { get; set; }
}
