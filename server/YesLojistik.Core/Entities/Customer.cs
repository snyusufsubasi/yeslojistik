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

    // e-Fatura için ayrıntılı adres (eski paneldeki alanlar).
    public string? Country { get; set; }
    public string? Neighborhood { get; set; }
    public string? Street { get; set; }
    public string? BuildingName { get; set; }
    public string? BuildingNo { get; set; }
    public string? DoorNo { get; set; }
    public string? PostalCode { get; set; }
    public string? Fax { get; set; }
    public string? Website { get; set; }
    /// <summary>Bu müşteriye kesilen faturanın satır ve not ayarları.</summary>
    public InvoiceTemplate InvoiceTemplate { get; set; } = new();
    public List<CustomerGroup> Groups { get; set; } = new();

    public List<Trip> Trips { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();

    public string CustomerNo => Id.ToString("D5");
}

/// <summary>Müşterinin fatura şablonu: fatura satırında hangi sefer bilgilerinin yazılacağı ve fatura notu.</summary>
public class InvoiceTemplate
{
    public bool LineDate { get; set; } = true;
    public bool LineLoading { get; set; } = true;
    public bool LineDelivery { get; set; } = true;
    public bool LinePlate { get; set; } = true;
    public bool LineVehicleType { get; set; }
    public bool LineDeliveryDocumentNo { get; set; }
    public bool LineCargo { get; set; }
    public bool LineDescription { get; set; }
    /// <summary>Seferlerdeki "faturaya yansıt" işaretli fatura altı notları faturaya eklensin.</summary>
    public bool TripFooterNotes { get; set; } = true;
    /// <summary>Her faturaya eklenen sabit açıklama.</summary>
    public string? Note { get; set; }
    public int? SaleNoteId { get; set; }
    public int? WithholdingNoteId { get; set; }
    /// <summary>e-Fatura senaryosu tercihi (boşsa firma varsayılanı).</summary>
    public EInvoiceScenario? Scenario { get; set; }
}

/// <summary>Müşterinin alt grubu / şantiyesi / projesi; seferde seçilir ve filtrelenir.</summary>
public class CustomerGroup : BaseEntity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string Name { get; set; } = "";
}

/// <summary>Faturaya eklenecek hazır not (banka hesabı / IBAN ve açıklama). Satış ve tevkifatlı faturalar için ayrı seçilir.</summary>
public class InvoiceNoteTemplate : BaseEntity
{
    public InvoiceNoteKind Kind { get; set; }
    public string Title { get; set; } = "";
    public string? AccountName { get; set; }
    public string? Iban { get; set; }
    public string? Text { get; set; }
}
