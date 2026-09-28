using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Infrastructure;

/// <summary>Günde bir kez, saklama süresini (varsayılan 90 gün) aşan konum kayıtlarını siler (KVKK: veri minimizasyonu).</summary>
public class LocationRetentionService(IServiceScopeFactory scopes, IConfiguration config, ILogger<LocationRetentionService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var days = config.GetValue("Tracking:RetentionDays", 90);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var deleted = await scope.ServiceProvider.GetRequiredService<TrackingService>().PurgeAsync(days, ct);
                if (deleted > 0) logger.LogInformation("{Count} eski konum kaydı silindi", deleted);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Konum temizliği başarısız");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }
}
