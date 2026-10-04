using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace YesLojistik.Core.Licensing;

/// <summary>Lisans anahtarının içindeki bilgi (imzalı JSON).</summary>
public record LicensePayload
{
    public string Customer { get; init; } = "";
    /// <summary>Deneme, Baslangic, Standart, Profesyonel ya da Kurumsal.</summary>
    public string Plan { get; init; } = "";
    /// <summary>Etkin araç sınırı; 0 = sınırsız.</summary>
    public int VehicleLimit { get; init; }
    public string[] Features { get; init; } = [];
    public DateTimeOffset IssuedAt { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
    /// <summary>Doluysa anahtar yalnızca License:InstanceId ayarı aynı olan kurulumda geçer.</summary>
    public string? InstanceId { get; init; }
}

public static class LicensePlans
{
    public static readonly string[] All = ["Deneme", "Baslangic", "Standart", "Profesyonel", "Kurumsal"];
    public static bool IsValid(string plan) => All.Contains(plan, StringComparer.Ordinal);
}

public record LicenseParseResult(LicensePayload? Payload, string? Error)
{
    public bool Ok => Payload != null;
}

/// <summary>
/// Anahtar biçimi: base64url(yük).base64url(imza). Yük UTF-8 JSON; imza, yükün ham baytları üzerinde ECDSA P-256 / SHA-256
/// (IEEE P1363: r ve s, 32'şer bayt). Genel anahtar SubjectPublicKeyInfo (DER) biçiminde base64'tür. Ağ erişimi gerekmez.
/// Özel anahtar yalnız satıcıdadır (tools/license); bu sınıf imzalama için de kullanılabilir (testler kendi geçici anahtarını üretir).
/// </summary>
public static class LicenseToken
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static string Base64Url(byte[] data) => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static byte[] FromBase64Url(string s)
    {
        var b = s.Replace('-', '+').Replace('_', '/');
        b = b.PadRight(b.Length + (4 - b.Length % 4) % 4, '=');
        return Convert.FromBase64String(b);
    }

    /// <summary>Anahtar çifti üretir: (genel anahtar base64 SPKI, özel anahtar base64 PKCS#8).</summary>
    public static (string PublicKey, string PrivateKey) GenerateKeyPair()
    {
        using var ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        return (Convert.ToBase64String(ec.ExportSubjectPublicKeyInfo()), Convert.ToBase64String(ec.ExportPkcs8PrivateKey()));
    }

    public static string Sign(LicensePayload payload, string privateKeyPkcs8Base64)
    {
        using var ec = ECDsa.Create();
        ec.ImportPkcs8PrivateKey(Convert.FromBase64String(privateKeyPkcs8Base64), out _);
        var body = JsonSerializer.SerializeToUtf8Bytes(payload, Json);
        var sig = ec.SignData(body, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        return $"{Base64Url(body)}.{Base64Url(sig)}";
    }

    /// <summary>İmzayı ve alanları doğrular. Süre/araç sınırı burada değil, LicenseEvaluator'da değerlendirilir.</summary>
    public static LicenseParseResult Verify(string? token, string? publicKeyBase64)
    {
        token = token?.Trim();
        if (string.IsNullOrEmpty(token)) return new(null, "Anahtar boş.");
        const string badFormat = "Anahtar biçimi hatalı. Anahtarı eksiksiz yapıştırdığınızdan emin olun.";
        var parts = token.Split('.');
        if (parts.Length != 2) return new(null, badFormat);
        byte[] body, sig;
        try { body = FromBase64Url(parts[0]); sig = FromBase64Url(parts[1]); }
        catch (FormatException) { return new(null, badFormat); }

        bool valid;
        try
        {
            using var ec = ECDsa.Create();
            ec.ImportSubjectPublicKeyInfo(Convert.FromBase64String(publicKeyBase64 ?? ""), out _);
            valid = ec.VerifyData(body, sig, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }
        catch (Exception ex) when (ex is CryptographicException or FormatException or ArgumentException)
        {
            valid = false;
        }
        if (!valid) return new(null, "Anahtar doğrulanamadı (imza geçersiz). Anahtar değiştirilmiş ya da bu kuruluma ait olmayabilir.");

        LicensePayload? payload;
        try { payload = JsonSerializer.Deserialize<LicensePayload>(body, Json); }
        catch (JsonException) { payload = null; }
        if (payload == null || string.IsNullOrWhiteSpace(payload.Customer) || !LicensePlans.IsValid(payload.Plan) || payload.VehicleLimit < 0
            || payload.ExpiresAt <= payload.IssuedAt)
            return new(null, "Anahtarın içeriği geçersiz.");
        return new(payload, null);
    }
}
