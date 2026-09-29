namespace YesLojistik.Core.Entities;

public class Payment : BaseEntity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Description { get; set; }
    /// <summary>Paranın girdiği kasa/banka hesabı (isteğe bağlı).</summary>
    public int? CashAccountId { get; set; }
    public CashAccount? CashAccount { get; set; }

    // Çek / senet bilgileri (Method = Check ya da PromissoryNote)
    public string? InstrumentNo { get; set; }
    public string? Bank { get; set; }
    public DateOnly? InstrumentDueDate { get; set; }
    public InstrumentStatus? InstrumentStatus { get; set; }
    /// <summary>Ciro edildiyse oluşan tedarikçi ödemesi.</summary>
    public int? EndorsedSupplierPaymentId { get; set; }

    /// <summary>Karşılıksız ya da iade edilen çek/senet müşterinin bakiyesinden düşmez (sorgularda kullanılır).</summary>
    public static readonly System.Linq.Expressions.Expression<Func<Payment, bool>> Counts =
        p => p.InstrumentStatus == null || (p.InstrumentStatus != Entities.InstrumentStatus.Bounced && p.InstrumentStatus != Entities.InstrumentStatus.Returned);
}
