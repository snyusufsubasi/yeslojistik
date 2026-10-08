namespace YesLojistik.Core.Entities;

/// <summary>
/// Sevkiyat şablonu: sık tekrarlanan iş (aynı müşteri, güzergâh, yük, fiyat) bir isimle saklanır; yeni sevkiyat bundan başlatılır.
/// Tarih, durum ve belge numaraları şablonda tutulmaz.
/// </summary>
public class TripTemplate : BaseEntity
{
    public string Name { get; set; } = "";
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public int? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }

    public string? LoadingCity { get; set; }
    public string? LoadingDistrict { get; set; }
    public string LoadingAddress { get; set; } = "";
    public string? LoadingContact { get; set; }
    public string? DeliveryCity { get; set; }
    public string? DeliveryDistrict { get; set; }
    public string DeliveryAddress { get; set; } = "";
    public string? DeliveryContact { get; set; }

    public string? CargoType { get; set; }
    public decimal? CargoWeightKg { get; set; }
    public int? CargoQuantity { get; set; }
    public string? CargoUnit { get; set; }
    public string? TransportMode { get; set; }
    public string? TrailerType { get; set; }
    public decimal? SalePrice { get; set; }
    public decimal? VehicleCost { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Description { get; set; }

    /// <summary>Kaç kez kullanıldı ve en son ne zaman (listede sık kullanılan önce).</summary>
    public int UseCount { get; set; }
    public DateTime? LastUsedAt { get; set; }
}
