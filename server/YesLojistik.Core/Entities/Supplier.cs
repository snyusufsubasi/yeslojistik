namespace YesLojistik.Core.Entities;

/// <summary>Tedarikçi: taşeron / kiralık araç sahibi, servis, akaryakıt istasyonu vb. Firmanın borçlu olduğu taraf.</summary>
public class Supplier : BaseEntity
{
    public string Title { get; set; } = "";
    public SupplierKind Kind { get; set; } = SupplierKind.Carrier;
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Iban { get; set; }
    public string? ContactName { get; set; }
    /// <summary>Ödeme vadesi (gün). Taşeron borcunun vadesi = sefer/borç tarihi + bu süre.</summary>
    public int PaymentTermDays { get; set; } = 30;
    public string? Notes { get; set; }
    /// <summary>Sisteme geçişte devreden, firmanın bu tedarikçiye borcu.</summary>
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceDate { get; set; }
    public bool IsActive { get; set; } = true;

    public string SupplierNo => "T" + Id.ToString("D5");
}
