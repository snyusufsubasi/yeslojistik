namespace YesLojistik.Core.Entities;

public class Driver : BaseEntity
{
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public string? NationalId { get; set; }
    public string? LicenseClass { get; set; }
    public DateOnly? LicenseExpiry { get; set; }
    public DateOnly? SrcExpiry { get; set; }
    public DateOnly? PsychotechnicExpiry { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Boşsa firmanın kendi şoförü; doluysa bu taşeronun şoförü (belge uyarılarına girmez).</summary>
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public string? LicenseNo { get; set; }
    public int? BirthYear { get; set; }
    public string? Address { get; set; }
    public bool IsForeign { get; set; }
    /// <summary>Şoförün genelde kullandığı plaka (taşeron şoförlerinde araç kaydı olmayabilir).</summary>
    public string? Plate { get; set; }
    public DriverRating? Rating { get; set; }
    public string? Note { get; set; }
    /// <summary>Pratikortam aynası: eski sistemdeki kimlik (VKN, ünvan, plaka, ad). Ayna senkronu kaydı bununla bulur.</summary>
    public string? LegacyKey { get; set; }
}
