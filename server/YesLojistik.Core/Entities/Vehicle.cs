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
    public DateOnly? InspectionExpiry { get; set; }
    public DateOnly? InsuranceExpiry { get; set; }
    public VehicleStatus Status { get; set; } = VehicleStatus.Available;
    public double? LastLatitude { get; set; }
    public double? LastLongitude { get; set; }
    public double? LastSpeedKmh { get; set; }
    public DateTime? LastLocationAt { get; set; }
    public int? DefaultDriverId { get; set; }
    public Driver? DefaultDriver { get; set; }
}
