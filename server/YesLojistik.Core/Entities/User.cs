namespace YesLojistik.Core.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    /// <summary>Şoför rolündeki kullanıcının bağlı olduğu şoför kaydı (mobil uygulama).</summary>
    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }
    /// <summary>Şoförün konum paylaşımına verdiği açık rızanın zamanı ve metin sürümü (KVKK). Boşsa rıza yok.</summary>
    public DateTime? LocationConsentAt { get; set; }
    public string? LocationConsentVersion { get; set; }
    /// <summary>Art arda hatalı giriş sayısı; 5'te hesap 15 dakika kilitlenir.</summary>
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutUntil { get; set; }
}

/// <summary>"Şifremi unuttum" bağlantısı: 30 dakika geçerli, tek kullanımlık; yalnızca özeti (hash) saklanır.</summary>
public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
}

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
