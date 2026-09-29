namespace YesLojistik.Core.Entities;

/// <summary>Şoförle mahsuplaşma: şoföre yapılan ödeme ya da şoförden geri alınan para.</summary>
public class DriverSettlement : BaseEntity
{
    public int DriverId { get; set; }
    public Driver Driver { get; set; } = null!;
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public SettlementDirection Direction { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.Cash;
    public string? Note { get; set; }
}
