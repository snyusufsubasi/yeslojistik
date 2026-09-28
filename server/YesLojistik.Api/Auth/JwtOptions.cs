namespace YesLojistik.Api.Auth;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "yeslojistik";
    public string Audience { get; set; } = "yeslojistik";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
    /// <summary>null ise istek HTTPS ise Secure cookie kullanılır.</summary>
    public bool? SecureCookies { get; set; }
}
