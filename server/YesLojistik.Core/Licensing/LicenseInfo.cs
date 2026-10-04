namespace YesLojistik.Core.Licensing;

/// <summary>Lisans durumları. owner = anahtar yok (kendi kurulumumuz, sınırsız).</summary>
public static class LicenseStates
{
    public const string Owner = "owner";
    public const string Active = "active";
    public const string Grace = "grace";
    public const string Expired = "expired";
    public const string Invalid = "invalid";
}

/// <summary>Bir anının lisans durumu. <see cref="Has"/> özellik kapısıdır: <c>(await license.CurrentAsync()).Has("uetds")</c>.</summary>
public record LicenseInfo(string State, LicensePayload? Payload, string? Error, int? DaysLeft, string Source)
{
    /// <summary>Süre bittikten sonra yalnızca görüntüleme serbest kalan gün sayısı (bildirim için).</summary>
    public const int GraceDays = 7;

    public bool IsOwner => State == LicenseStates.Owner;

    /// <summary>Süre bitmiş (ek süre de geçmiş) ya da anahtar geçersiz: yazma işlemleri kapalı.</summary>
    public bool ReadOnly => State is LicenseStates.Expired or LicenseStates.Invalid;

    /// <summary>0 = sınırsız.</summary>
    public int VehicleLimit => IsOwner ? 0 : Payload?.VehicleLimit ?? 0;

    public bool Has(string feature) => State switch
    {
        LicenseStates.Owner => true,
        LicenseStates.Active or LicenseStates.Grace => Payload?.Features.Contains(feature, StringComparer.OrdinalIgnoreCase) ?? false,
        _ => false,
    };

    public static LicenseInfo Owner() => new(LicenseStates.Owner, null, null, null, "none");
}

public static class LicenseEvaluator
{
    /// <param name="key">Anahtar; boşsa sahip modu.</param>
    /// <param name="source">env ya da db (yalnızca bilgi için).</param>
    /// <param name="instanceId">Bu kurulumun License:InstanceId ayarı.</param>
    public static LicenseInfo Evaluate(string? key, string source, string? publicKey, string? instanceId, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(key)) return LicenseInfo.Owner();
        var parsed = LicenseToken.Verify(key, publicKey);
        if (!parsed.Ok) return new(LicenseStates.Invalid, null, parsed.Error, null, source);
        var p = parsed.Payload!;
        if (!string.IsNullOrWhiteSpace(p.InstanceId) && !string.Equals(p.InstanceId, instanceId?.Trim(), StringComparison.Ordinal))
            return new(LicenseStates.Invalid, null, "Bu anahtar başka bir kurulum için üretilmiş.", null, source);

        var remaining = p.ExpiresAt - now;
        var daysLeft = (int)Math.Ceiling(remaining.TotalDays);
        var state = remaining >= TimeSpan.Zero ? LicenseStates.Active
            : -remaining <= TimeSpan.FromDays(LicenseInfo.GraceDays) ? LicenseStates.Grace : LicenseStates.Expired;
        return new(state, p, null, daysLeft, source);
    }
}
