namespace YesLojistik.Core.Entities;

/// <summary>Şoför uygulamasının bildirim adresi (Expo push token).</summary>
public class PushToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = "";
    public string? Platform { get; set; }
    public DateTime UpdatedAt { get; set; }
}
