using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Auth;

/// <summary>Hatalı giriş sayacı: 15 dakika içinde 5 hata hesabı 15 dakika kilitler; başarılı girişte sıfırlanır.</summary>
public static class LoginGuard
{
    public const int MaxFailed = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);

    /// <summary>Hatayı sayar. Hesap bu hatayla kilitlendiyse true döner.</summary>
    public static bool RegisterFailure(User user, DateTime now)
    {
        if (user.LastFailedLoginAt is { } last && now - last > Window) user.FailedLoginCount = 0;
        user.FailedLoginCount++;
        user.LastFailedLoginAt = now;
        if (user.FailedLoginCount < MaxFailed) return false;
        user.LockoutUntil = now.Add(LockDuration);
        user.FailedLoginCount = 0;
        return true;
    }

    public static bool IsLocked(User user, DateTime now) => user.LockoutUntil > now;

    public static void Reset(User user)
    {
        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
        user.LastFailedLoginAt = null;
    }
}

/// <summary>
/// İki adımlı doğrulama yardımcıları: anahtarın şifrelenmesi, kurtarma kodları ve giriş sırasındaki kısa ömürlü "meydan okuma" belirteci.
/// Şifreleme anahtarı TwoFactor:Key ayarından, yoksa Jwt:Key'den türetilir (Jwt:Key değişirse kayıtlı anahtarlar çözülemez;
/// kullanıcılar kurtarma koduyla girip yeniden kurar).
/// </summary>
public class TwoFactorService(IOptions<JwtOptions> jwt, IConfiguration config)
{
    public const string Issuer = "YES Lojistik";
    public static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(5);
    public const int RecoveryCodeCount = 10;
    private const string RecoveryAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private byte[] Derive(string purpose)
    {
        var ikm = config["TwoFactor:Key"];
        if (string.IsNullOrWhiteSpace(ikm)) ikm = jwt.Value.Key;
        return HKDF.DeriveKey(HashAlgorithmName.SHA256, Encoding.UTF8.GetBytes(ikm), 32, salt: null, info: Encoding.UTF8.GetBytes("yeslojistik/" + purpose));
    }

    // --- Anahtarın şifrelenmesi (AES-GCM) ---
    public string EncryptSecret(byte[] secret)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var cipher = new byte[secret.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(Derive("totp-secret"), 16);
        aes.Encrypt(nonce, secret, cipher, tag);
        return "v1." + Convert.ToBase64String([.. nonce, .. tag, .. cipher]);
    }

    public byte[]? DecryptSecret(string? stored)
    {
        if (string.IsNullOrEmpty(stored) || !stored.StartsWith("v1.", StringComparison.Ordinal)) return null;
        try
        {
            var raw = Convert.FromBase64String(stored[3..]);
            var plain = new byte[raw.Length - 28];
            using var aes = new AesGcm(Derive("totp-secret"), 16);
            aes.Decrypt(raw.AsSpan(0, 12), raw.AsSpan(28), raw.AsSpan(12, 16), plain);
            return plain;
        }
        catch (Exception e) when (e is CryptographicException or FormatException or ArgumentException)
        {
            return null;
        }
    }

    // --- Kurtarma kodları ---
    /// <summary>10 yeni kod üretir. Düz kodlar yalnızca bir kez gösterilir; kullanıcıda özetleri saklanır.</summary>
    public (List<string> Plain, string HashesJson) NewRecoveryCodes()
    {
        var plain = new List<string>();
        for (var i = 0; i < RecoveryCodeCount; i++)
        {
            var chars = new char[10];
            for (var j = 0; j < chars.Length; j++) chars[j] = RecoveryAlphabet[RandomNumberGenerator.GetInt32(RecoveryAlphabet.Length)];
            plain.Add(new string(chars, 0, 5) + "-" + new string(chars, 5, 5));
        }
        return (plain, JsonSerializer.Serialize(plain.Select(HashRecovery)));
    }

    private static string Normalize(string code) => new string(code.Where(char.IsAsciiLetterOrDigit).ToArray()).ToUpperInvariant();

    private string HashRecovery(string code) =>
        Convert.ToHexString(HMACSHA256.HashData(Derive("recovery-code"), Encoding.UTF8.GetBytes(Normalize(code))));

    public static int RecoveryCodesLeft(User user) =>
        string.IsNullOrEmpty(user.TotpRecoveryHashes) ? 0 : JsonSerializer.Deserialize<List<string>>(user.TotpRecoveryHashes)?.Count ?? 0;

    /// <summary>Kurtarma kodu doğruysa listeden siler (tek kullanımlık) ve true döner.</summary>
    public bool TryConsumeRecoveryCode(User user, string code)
    {
        if (string.IsNullOrEmpty(user.TotpRecoveryHashes)) return false;
        var normalized = Normalize(code);
        if (normalized.Length != 10) return false;
        var hashes = JsonSerializer.Deserialize<List<string>>(user.TotpRecoveryHashes) ?? [];
        var given = Encoding.ASCII.GetBytes(HashRecovery(normalized));
        string? hit = null;
        foreach (var h in hashes)
            if (CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(h), given)) hit = h;
        if (hit == null) return false;
        hashes.Remove(hit);
        user.TotpRecoveryHashes = JsonSerializer.Serialize(hashes);
        return true;
    }

    /// <summary>
    /// 6 haneli uygulama kodunu ya da kurtarma kodunu doğrular. Başarılıysa kullanıcı kaydındaki son adım / kurtarma listesi güncellenir
    /// (kaydetmek çağıranın işidir).
    /// </summary>
    public bool VerifyCodeOrRecovery(User user, string? code, DateTime now, out bool usedRecovery)
    {
        usedRecovery = false;
        if (string.IsNullOrWhiteSpace(code)) return false;
        var digits = new string(code.Where(char.IsAsciiDigit).ToArray());
        var looksLikeTotp = digits.Length == Totp.Digits && code.All(c => char.IsAsciiDigit(c) || c == ' ');
        if (looksLikeTotp)
        {
            var secret = DecryptSecret(user.TotpSecretEnc);
            if (secret == null) return false;
            var step = Totp.Verify(secret, digits, now, user.TotpLastStep);
            if (step == null) return false;
            user.TotpLastStep = step;
            return true;
        }
        usedRecovery = TryConsumeRecoveryCode(user, code);
        return usedRecovery;
    }

    // --- Giriş meydan okuma belirteci (oturum değildir) ---
    public string CreateChallenge(int userId, bool mobile, DateTime now)
    {
        var payload = $"{userId}.{(mobile ? 1 : 0)}.{new DateTimeOffset(now).ToUnixTimeSeconds() + (long)ChallengeLifetime.TotalSeconds}";
        var sig = HMACSHA256.HashData(Derive("challenge"), Encoding.UTF8.GetBytes(payload));
        return B64(Encoding.UTF8.GetBytes(payload)) + "." + B64(sig);
    }

    public (int UserId, bool Mobile)? ReadChallenge(string? token, DateTime now)
    {
        if (string.IsNullOrEmpty(token)) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;
        try
        {
            var payloadBytes = FromB64(parts[0]);
            var expected = HMACSHA256.HashData(Derive("challenge"), payloadBytes);
            if (!CryptographicOperations.FixedTimeEquals(expected, FromB64(parts[1]))) return null;
            var p = Encoding.UTF8.GetString(payloadBytes).Split('.');
            if (p.Length != 3 || !int.TryParse(p[0], out var uid) || !long.TryParse(p[2], out var exp)) return null;
            if (new DateTimeOffset(now).ToUnixTimeSeconds() > exp) return null;
            return (uid, p[1] == "1");
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static string B64(byte[] b) => Convert.ToBase64String(b).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static byte[] FromB64(string s)
    {
        var t = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(t.PadRight(t.Length + (4 - t.Length % 4) % 4, '='));
    }

    /// <summary>Denetim kaydı satırı (kullanıcı oturumu olmayan adımlarda da çalışsın diye adı elle verilir).</summary>
    public static AuditLog Audit(User user, string action, string label, string? actor = null) => new()
    {
        At = DateTime.UtcNow, UserId = user.Id, UserName = actor ?? user.FullName, Action = action,
        EntityType = nameof(User), EntityId = user.Id, Label = label.Length > 200 ? label[..200] : label,
    };
}
