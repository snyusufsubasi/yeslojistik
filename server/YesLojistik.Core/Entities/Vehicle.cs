namespace YesLojistik.Core.Entities;

public class Vehicle : BaseEntity
{
    public string Plate { get; set; } = "";
    public string Type { get; set; } = "";
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public int? ModelYear { get; set; }
    public int Km { get; set; }
    public DateOnly? LastMaintenanceDate { get; set; }
    public DateOnly? NextMaintenanceDate { get; set; }
    /// <summary>Sonraki bakım kilometresi; araç 1.000 km yaklaşınca uyarı verilir.</summary>
    public int? NextMaintenanceKm { get; set; }
    public DateOnly? InspectionExpiry { get; set; }
    public DateOnly? InsuranceExpiry { get; set; }
    public VehicleStatus Status { get; set; } = VehicleStatus.Available;
    public double? LastLatitude { get; set; }
    public double? LastLongitude { get; set; }
    public double? LastSpeedKmh { get; set; }
    public DateTime? LastLocationAt { get; set; }
    /// <summary>Özmal ya da kiralık (taşeron). Kiralıksa araç sahibi (tedarikçi) zorunludur.</summary>
    public VehicleOwnership Ownership { get; set; } = VehicleOwnership.Own;
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    /// <summary>Dorse plakası.</summary>
    public string? TrailerPlate { get; set; }
    public int? DefaultDriverId { get; set; }
    public Driver? DefaultDriver { get; set; }
}
