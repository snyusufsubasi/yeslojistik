namespace YesLojistik.Core.Entities;

/// <summary>Şoför uygulamasından gelen konum kaydı. Eski kayıtlar belirli bir süre sonra silinir.</summary>
public class VehicleLocation
{
    public long Id { get; set; }
    public int VehicleId { get; set; }
    public int? DriverId { get; set; }
    public int? TripId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? SpeedKmh { get; set; }
    public double? Heading { get; set; }
    public double? Accuracy { get; set; }
    public DateTime RecordedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
