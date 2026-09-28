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
    public DateTime UpdatedAt { get; set; }
}
