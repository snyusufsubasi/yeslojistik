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

    /// <summary>Müşteriye gönderilen herkese açık takip linkinin anahtarı.</summary>
    public string? TrackingToken { get; set; }

    /// <summary>Müşterinin sipariş / yük numarası.</summary>
    public string? CustomerReference { get; set; }
    public string? CargoType { get; set; }
    public decimal? CargoWeightKg { get; set; }
    public int? CargoQuantity { get; set; }
    /// <summary>palet, koli, adet...</summary>
    public string? CargoUnit { get; set; }
    public string? TrailerPlate { get; set; }
    public string? LoadingCity { get; set; }
    public string? DeliveryCity { get; set; }
    /// <summary>Yüklemede / teslimde görüşülecek kişi (ad, telefon).</summary>
    public string? LoadingContact { get; set; }
    public string? DeliveryContact { get; set; }
    /// <summary>Kiralık araçta aracın sahibi (taşeron); araç maliyeti bu tedarikçiye borç yazılır.</summary>
    public int? CarrierSupplierId { get; set; }
    public Supplier? CarrierSupplier { get; set; }
    public string? CarrierInvoiceNo { get; set; }
    public DateOnly? CarrierInvoiceDate { get; set; }
    /// <summary>Teslim alan kişi ve teslim anı (şoför uygulamasından).</summary>
    public string? ReceivedBy { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public List<Expense> Expenses { get; set; } = new();
    public List<TripEvent> Events { get; set; } = new();
    public List<TripAttachment> Attachments { get; set; } = new();
}
