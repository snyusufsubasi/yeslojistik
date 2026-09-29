namespace YesLojistik.Core.Entities;

public class Customer : BaseEntity
{
    public string Title { get; set; } = "";
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    /// <summary>Sefer durumu değişince müşteriye takip linkiyle e-posta gönderilsin mi?</summary>
    public bool NotifyStatusByEmail { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? ContactName { get; set; }
    /// <summary>GİB e-Fatura mükellefi mi? Değilse fatura e-Arşiv olarak kesilir.</summary>
    public bool IsEInvoiceUser { get; set; }
    /// <summary>e-Fatura posta kutusu (PK) etiketi.</summary>
    public string? EInvoiceAlias { get; set; }
    /// <summary>Müşteriye özel vade (gün); boşsa firma varsayılanı.</summary>
    public int? PaymentTermDays { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Sisteme geçişte devreden borç bakiyesi (devir). Cari bakiyeye ve alacak yaşlandırmaya dahildir.</summary>
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceDate { get; set; }
    /// <summary>Risk limiti: açık bakiye + faturalanmamış teslimler + yeni sefer bunu aşarsa uyarı verilir (kayıt engellenmez).</summary>
    public decimal? CreditLimit { get; set; }

    public List<Trip> Trips { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();

    public string CustomerNo => Id.ToString("D5");
}
