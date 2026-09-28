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
}
