namespace YesLojistik.Core.Entities;

/// <summary>
/// Tedarikçiden alınan fatura (taşeron nakliye faturası, servis, yakıt…). Bağlı seferler artık "fatura bekleyen sefer"
/// olarak değil, bu faturanın tutarıyla tedarikçi borcuna yazılır.
/// </summary>
public class PurchaseInvoice : BaseEntity
{
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public string InvoiceNo { get; set; } = "";
    public DateOnly Date { get; set; }
    public DateOnly? DueDate { get; set; }
    public PurchaseInvoiceKind Kind { get; set; } = PurchaseInvoiceKind.EInvoice;
    /// <summary>Matrah (KDV hariç).</summary>
    public decimal Subtotal { get; set; }
    public decimal VatAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    /// <summary>Ödenecek tutar: matrah + KDV − tevkifat.</summary>
    public decimal Total { get; set; }
    public string? Notes { get; set; }
    public bool IsCancelled { get; set; }
    public string? CancelReason { get; set; }
    /// <summary>Faturanın PDF/görüntüsü (dosya deposunda).</summary>
    public string? FilePath { get; set; }
    public string? FileContentType { get; set; }
    /// <summary>Başka sistemden aktarılan kaydın oradaki numarası.</summary>
    public string? ExternalRef { get; set; }

    public List<Trip> Trips { get; set; } = new();
}
