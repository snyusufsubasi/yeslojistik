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
