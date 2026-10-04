using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Core.Licensing;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Abonelik/lisans durumu. Anahtar ortam değişkeninden (License__Key) ya da CompanySettings.LicenseKey alanından okunur (ortam kazanır).
/// Anahtar yoksa "sahip modu": sınırsız, uyarısız (kendi kurulumumuz). Doğrulama çevrimdışıdır (ECDSA imzası).
/// Özellik kapısı: <c>(await license.CurrentAsync()).Has("uetds")</c>.
/// </summary>
public class LicenseService(AppDbContext db, IConfiguration config, TimeProvider time, ICurrentUser? currentUser = null)
{
    /// <summary>
    /// Yerleşik genel anahtar. Karşılığındaki özel anahtar atılmıştır: üretimde gerçek genel anahtar License:PublicKey ayarıyla
    /// verilir (ya da ilk sürümde bu sabit değiştirilir). Ayar yoksa hiçbir anahtar bununla doğrulanamaz.
    /// </summary>
    public const string BuiltInPublicKey =
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWleTaz7FKaUI+NRFs1SXOARS0w+7vwJDgMTY0zT1c3EbXD/TmPr+Wm525zlrR+lbixXdV8DWbtc25DWypMwPVQ==";

    private string PublicKey => config["License:PublicKey"] is { Length: > 0 } k ? k.Trim() : BuiltInPublicKey;
    private string? EnvKey => config["License:Key"] is { } k && !string.IsNullOrWhiteSpace(k) ? k.Trim() : null;
    public string? InstanceId => config["License:InstanceId"] is { Length: > 0 } i ? i.Trim() : null;

    public DateTimeOffset Now => time.GetUtcNow();

    public async Task<LicenseInfo> CurrentAsync(CancellationToken ct = default)
    {
        if (EnvKey is { } env) return LicenseEvaluator.Evaluate(env, "env", PublicKey, InstanceId, Now);
        var stored = await db.CompanySettings.AsNoTracking().Select(s => s.LicenseKey).FirstOrDefaultAsync(ct);
        return LicenseEvaluator.Evaluate(stored, "db", PublicKey, InstanceId, Now);
    }

    public Task<int> VehicleCountAsync(CancellationToken ct = default) => db.Vehicles.CountAsync(ct);

    public static string VehicleLimitMessage(int limit) => $"Paketinizdeki araç sınırına ulaştınız ({limit}). Paketi yükseltmek için bize ulaşın.";

    /// <summary>Kaç araç daha eklenebilir; null = sınırsız.</summary>
    public async Task<int?> RemainingVehiclesAsync(CancellationToken ct = default)
    {
        var info = await CurrentAsync(ct);
        if (info.VehicleLimit == 0) return null;
        return Math.Max(0, info.VehicleLimit - await VehicleCountAsync(ct));
    }

    /// <summary>Yeni araç eklemeden önce çağrılır; sınırı aşacaksa DomainException fırlatır. Sahip modunda hiçbir şey yapmaz.</summary>
    public async Task EnsureVehicleCapacityAsync(int adding = 1, CancellationToken ct = default)
    {
        var info = await CurrentAsync(ct);
        if (info.VehicleLimit == 0) return;
        if (await VehicleCountAsync(ct) + adding > info.VehicleLimit)
            throw new DomainException(VehicleLimitMessage(info.VehicleLimit));
    }

    /// <summary>Anahtarı doğrular ve saklar. Ortamdan gelen anahtar varsa değiştirilemez (ortam kazanır).</summary>
    public async Task<LicenseInfo> ApplyAsync(string? key, CancellationToken ct = default)
    {
        if (EnvKey != null)
            throw new DomainException("Bu kurulumun anahtarı sunucu ayarından (License__Key) geliyor. Yeni anahtarı oradan değiştirin.");
        key = key?.Trim();
        var parsed = LicenseToken.Verify(key, PublicKey);
        if (!parsed.Ok) throw new DomainException(parsed.Error!);
        var info = LicenseEvaluator.Evaluate(key, "db", PublicKey, InstanceId, Now);
        if (info.State == LicenseStates.Invalid) throw new DomainException(info.Error!);
        if (info.State is LicenseStates.Grace or LicenseStates.Expired)
            throw new DomainException("Bu anahtarın süresi dolmuş. Yenilenmiş anahtarı isteyin.");

        var settings = await db.CompanySettings.FirstAsync(ct);
        settings.LicenseKey = key;
        db.AuditLogs.Add(new AuditLog
        {
            At = DateTime.UtcNow, UserId = currentUser?.Id, UserName = currentUser?.Name ?? "sistem", Action = "License",
            EntityType = nameof(CompanySettings), EntityId = 1,
            Label = "Lisans anahtarı uygulandı",
            Changes = $"{info.Payload!.Customer}; paket: {info.Payload.Plan}; araç: {(info.Payload.VehicleLimit == 0 ? "sınırsız" : info.Payload.VehicleLimit)}; bitiş: {info.Payload.ExpiresAt:dd.MM.yyyy}",
        });
        await db.SaveChangesAsync(ct);
        return info;
    }
}
