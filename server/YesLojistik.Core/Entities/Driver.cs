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
}
