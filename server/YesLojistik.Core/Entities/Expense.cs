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
    public ExpensePaidBy PaidBy { get; set; } = ExpensePaidBy.Company;
    /// <summary>Şoförün girdiği masraf ofis onayına düşer.</summary>
    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.Approved;
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    /// <summary>Mobil uygulamanın çevrimdışı kuyruğundaki işlem kimliği; aynı istek iki kez gelirse tek kayıt oluşur.</summary>
    public Guid? ClientRequestId { get; set; }
    /// <summary>Firma ödediyse paranın çıktığı kasa/banka hesabı (isteğe bağlı).</summary>
    public int? CashAccountId { get; set; }
    public CashAccount? CashAccount { get; set; }
    /// <summary>Sabit ödemeden oluştuysa o kayıt (o ay ödendi mi sorusunun cevabı).</summary>
    public int? RecurringPaymentId { get; set; }
    public RecurringPayment? RecurringPayment { get; set; }
    /// <summary>Kullanıcının tanımladığı gider kategorisi (eski paneldeki "Kategori", ör. "Nakliye spot araçlar").</summary>
    public string? CategoryName { get; set; }
    /// <summary>Giderin adı (eski paneldeki "Gider"); açıklama ayrıca tutulur.</summary>
    public string? Title { get; set; }
    /// <summary>Dönemsel gider (kira, sigorta…): başlangıç ve bitiş.</summary>
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    // Yakıt ayrıntısı (eski paneldeki "Mazotlar").
    public string? FuelStation { get; set; }
    public string? FuelType { get; set; }
    public decimal? UnitPrice { get; set; }
    public int? PreviousOdometer { get; set; }
    public string? ExternalRef { get; set; }
}
