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
    /// <summary>Toplu ödemede (birden çok sefer) ödenen seferler: ödeme önce bunları sırayla kapatır, artanı en eski borca gider.</summary>
    public List<int>? TripIds { get; set; }
    public string? Description { get; set; }
    public int? CashAccountId { get; set; }
    public CashAccount? CashAccount { get; set; }
    /// <summary>Müşteriden alınan çek/senet ciro edilerek ödendiyse o tahsilat.</summary>
    public int? EndorsedFromPaymentId { get; set; }
}
