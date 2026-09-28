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
