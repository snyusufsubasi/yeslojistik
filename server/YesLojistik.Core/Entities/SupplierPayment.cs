namespace YesLojistik.Core.Entities;

/// <summary>Tedarikçiye (taşeron, servis, istasyon) yapılan ödeme. Sefere bağlıysa önce o seferin borcunu kapatır.</summary>
public class SupplierPayment : BaseEntity
{
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    /// <summary>Sefere özel ön ödeme / avans.</summary>
    public int? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string? Description { get; set; }
}
