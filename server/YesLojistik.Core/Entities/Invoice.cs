namespace YesLojistik.Core.Entities;

public class Invoice : BaseEntity
{
    public string InvoiceNo { get; set; } = "";
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public DateOnly Date { get; set; }
    public DateOnly DueDate { get; set; }

    public decimal Subtotal { get; set; }
    /// <summary>KDV oranı, yüzde olarak (ör. 20).</summary>
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    /// <summary>Tevkifat oranı, onda bir olarak (ör. 2 → 2/10). 0 = tevkifat yok.</summary>
    public int WithholdingTenths { get; set; }
    public decimal WithholdingAmount { get; set; }
    /// <summary>Müşterinin ödeyeceği tutar: Ara toplam + KDV − tevkifat.</summary>
    public decimal Total { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;
    public string? Notes { get; set; }
    public string? ExternalId { get; set; }

    // --- e-Fatura / e-Arşiv (UBL-TR) ---
    public EInvoiceScenario? Scenario { get; set; }
    public EInvoiceTypeCode? TypeCode { get; set; }
    /// <summary>Evrensel tekil fatura numarası (UUID); fatura kesilirken üretilir.</summary>
    public Guid? Ettn { get; set; }
    /// <summary>GİB biçiminde 16 karakter: seri (3) + yıl (4) + sıra (9), ör. YES2026000000001.</summary>
    public string? EInvoiceNo { get; set; }
    public EInvoiceStatus EInvoiceStatus { get; set; } = EInvoiceStatus.None;
    public string? EInvoiceMessage { get; set; }
    public DateTime? EInvoiceSentAt { get; set; }
    /// <summary>Tevkifat kodu (yük taşımacılığı: 624). Oran ve kod mali müşavirle teyit edilmeli.</summary>
    public string? WithholdingCode { get; set; }
    /// <summary>KDV %0 ise istisna kodu (ör. 301).</summary>
    public string? VatExemptionCode { get; set; }

    public List<InvoiceLine> Lines { get; set; } = new();
    public List<Trip> Trips { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();
}

public class InvoiceLine
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public int? TripId { get; set; }
    public string Description { get; set; } = "";
    public decimal Amount { get; set; }
}

/// <summary>GİB e-Fatura/e-Arşiv numara dizisi: seri öneki + yıl başına boşluksuz sıra.</summary>
public class EInvoiceSequence
{
    public int Id { get; set; }
    public string Prefix { get; set; } = "";
    public int Year { get; set; }
    public long Next { get; set; } = 1;
}
