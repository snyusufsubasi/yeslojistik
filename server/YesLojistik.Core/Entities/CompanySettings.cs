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
    public string? LogoDataUrl { get; set; }
    public string InvoicePrefix { get; set; } = "F";
    public int NextInvoiceNumber { get; set; } = 1;
    public decimal DefaultVatRate { get; set; } = 20;
    public int DefaultWithholdingTenths { get; set; } = 2;
    public int DefaultPaymentTermDays { get; set; } = 30;
    /// <summary>Örnek (demo) veri yüklüyse true; "Demo verilerini temizle" ile false olur.</summary>
    public bool HasSampleData { get; set; }
    public DateTime UpdatedAt { get; set; }
}
