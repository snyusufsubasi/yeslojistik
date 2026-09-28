namespace YesLojistik.Core.Entities;

public class Trip : BaseEntity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
    public int DriverId { get; set; }
    public Driver Driver { get; set; } = null!;

    public string LoadingAddress { get; set; } = "";
    public string DeliveryAddress { get; set; } = "";
    public DateOnly LoadingDate { get; set; }
    public DateOnly? DeliveryDate { get; set; }
    public string? Description { get; set; }

    public decimal VehicleCost { get; set; }
    public decimal SalePrice { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Planned;

    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public List<Expense> Expenses { get; set; } = new();
}
