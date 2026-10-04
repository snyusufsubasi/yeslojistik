using System.Security.Cryptography;
using System.Text;

namespace YesLojistik.Core.Domain;

/// <summary>
/// Zaman tabanlı tek kullanımlık şifre (TOTP, RFC 6238; HMAC-SHA1, 6 hane, 30 sn). Google Authenticator, Microsoft Authenticator,
/// Authy vb. uygulamalarla uyumludur. Dış kütüphane kullanılmaz.
/// </summary>
public static class Totp
{
    public const int StepSeconds = 30;
    public const int Digits = 6;
    /// <summary>Saat farkına tolerans: önceki ve sonraki 30 sn'lik adım da kabul edilir.</summary>
    public const int Window = 1;

    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static byte[] NewSecret() => RandomNumberGenerator.GetBytes(20);

    public static long StepOf(DateTime utc) =>
        new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc)).ToUnixTimeSeconds() / StepSeconds;

    /// <summary>Verilen adım için kod (RFC 4226 dinamik kısaltma). algorithm: SHA1 (varsayılan), SHA256 ya da SHA512.</summary>
    public static string CodeFor(byte[] secret, long step, int digits = Digits, string algorithm = "SHA1")
    {
        var counter = new byte[8];
        for (var i = 7; i >= 0; i--) { counter[i] = (byte)(step & 0xff); step >>= 8; }
        var hash = algorithm switch
        {
            "SHA256" => HMACSHA256.HashData(secret, counter),
            "SHA512" => HMACSHA512.HashData(secret, counter),
            _ => HMACSHA1.HashData(secret, counter),
        };
        var offset = hash[^1] & 0x0f;
        var binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
        var mod = 1;
        for (var i = 0; i < digits; i++) mod *= 10;
        return (binary % mod).ToString().PadLeft(digits, '0');
    }

    /// <summary>
    /// Kodu doğrular (±<see cref="Window"/> adım). Doğruysa eşleşen adımı döner; <paramref name="lastUsedStep"/> ve öncesi
    /// reddedilir (aynı kodla ikinci giriş yapılamaz).
    /// </summary>
    public static long? Verify(byte[] secret, string? code, DateTime utcNow, long? lastUsedStep = null)
    {
        if (code is null) return null;
        var clean = new string(code.Where(char.IsAsciiDigit).ToArray());
        if (clean.Length != Digits) return null;
        var current = StepOf(utcNow);
        long? match = null;
        // Pencerenin tamamı her zaman denenir (süre farkı sızdırmaz).
        for (var d = -Window; d <= Window; d++)
        {
            var step = current + d;
            var ok = CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(CodeFor(secret, step)), Encoding.ASCII.GetBytes(clean));
            if (ok && (lastUsedStep is null || step > lastUsedStep)) match = step;
        }
        return match;
    }

    public static string ToBase32(byte[] data)
    {
        var sb = new StringBuilder((data.Length * 8 + 4) / 5);
        int buffer = 0, bits = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                sb.Append(Base32Alphabet[(buffer >> (bits - 5)) & 31]);
                bits -= 5;
            }
            buffer &= (1 << bits) - 1;
        }
        if (bits > 0) sb.Append(Base32Alphabet[(buffer << (5 - bits)) & 31]);
        return sb.ToString();
    }

    public static byte[] FromBase32(string text)
    {
        var clean = text.Replace(" ", "").Replace("-", "").TrimEnd('=').ToUpperInvariant();
        var bytes = new List<byte>();
        int buffer = 0, bits = 0;
        foreach (var ch in clean)
        {
            var v = Base32Alphabet.IndexOf(ch);
            if (v < 0) throw new FormatException("Geçersiz Base32 anahtarı.");
            buffer = (buffer << 5) | v;
            bits += 5;
            if (bits >= 8)
            {
                bytes.Add((byte)((buffer >> (bits - 8)) & 0xff));
                bits -= 8;
                buffer &= (1 << bits) - 1;
            }
        }
        return bytes.ToArray();
    }

    /// <summary>Doğrulayıcı uygulamaya QR ile verilen adres (otpauth://totp/...).</summary>
    public static string OtpAuthUri(string issuer, string account, string base32Secret) =>
        $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(account)}?secret={base32Secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits={Digits}&period={StepSeconds}";
}
