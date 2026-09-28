namespace YesLojistik.Core.Entities;

/// <summary>Kim, ne zaman, hangi kaydı oluşturdu / değiştirdi / sildi.</summary>
public class AuditLog
{
    public long Id { get; set; }
    public DateTime At { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    /// <summary>Created, Updated, Deleted</summary>
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int EntityId { get; set; }
    /// <summary>Kaydın okunur adı (plaka, fatura no, müşteri ünvanı...).</summary>
    public string? Label { get; set; }
    /// <summary>Değişen alanlar: "Durum: Planned → Loaded; Satış: 10000 → 12000"</summary>
    public string? Changes { get; set; }
}
