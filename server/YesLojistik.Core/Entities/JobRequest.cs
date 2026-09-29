namespace YesLojistik.Core.Entities;

/// <summary>Eski paneldeki iş talebi: araç ve şoför atanmadan önce açılır.</summary>
public class JobRequest : BaseEntity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string LoadingAddress { get; set; } = "";
    public string DeliveryAddress { get; set; } = "";
    public string? DeliveryWindow { get; set; }
    public string? CargoType { get; set; }
    public decimal? CargoQuantity { get; set; }
    public string? VehicleType { get; set; }
    public decimal? SalePrice { get; set; }
    public decimal? CarrierPrice { get; set; }
    public decimal? Commission { get; set; }
    public decimal? DriverBonus { get; set; }
    public decimal? OtherExpense { get; set; }
    public bool CustomerPays { get; set; }
    public string? LoadingDocumentNo { get; set; }
    public string? WaybillNo { get; set; }
    public string? InvoiceFooterNote { get; set; }
    public string? Description { get; set; }
    public decimal? LoadingLatitude { get; set; }
    public decimal? LoadingLongitude { get; set; }
    public decimal? DeliveryLatitude { get; set; }
    public decimal? DeliveryLongitude { get; set; }
    public JobRequestStatus Status { get; set; } = JobRequestStatus.Pending;
    public Trip? Trip { get; set; }
}
