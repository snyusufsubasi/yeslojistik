using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Infrastructure;

/// <summary>15 dakikada bir sabah uyarı özetinin gönderim zamanı gelip gelmediğine bakar.</summary>
public class DailyDigestWorker(IServiceScopeFactory scopes, ILogger<DailyDigestWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var sent = await scope.ServiceProvider.GetRequiredService<DailyDigestService>().SendIfDueAsync(Clock.Now, ct);
                if (sent > 0) logger.LogInformation("Sabah uyarı özeti {Count} yöneticiye gönderildi", sent);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Sabah uyarı özeti gönderilemedi");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }
}
