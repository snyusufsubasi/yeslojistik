namespace YesLojistik.Core.Entities;

public class Expense : BaseEntity
{
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public int? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public int? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string? Description { get; set; }
    /// <summary>Şoför avansı / harcırahı ya da şoförün yaptığı harcama.</summary>
    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }
    /// <summary>Yakıt alımında litre.</summary>
    public decimal? Liters { get; set; }
    /// <summary>Yakıt alımı sırasında araç kilometresi (tüketim hesabı için).</summary>
    public int? Odometer { get; set; }
    /// <summary>Gideri yapan tedarikçi (servis, istasyon, taşeron).</summary>
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    /// <summary>Vadeli (henüz ödenmedi): tutar tedarikçiye borç yazılır.</summary>
    public bool IsOnCredit { get; set; }
    /// <summary>Fiş / fatura görseli (dosya deposundaki yol).</summary>
    public string? ReceiptPath { get; set; }
    public string? ReceiptContentType { get; set; }
}
