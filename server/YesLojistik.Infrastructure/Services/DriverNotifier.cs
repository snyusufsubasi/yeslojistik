using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Seferle ilgili değişiklikleri şoförün telefonuna bildirir. Bildirim hatası asıl işlemi bozmaz.</summary>
public class DriverNotifier(AppDbContext db, IPushSender push, ILogger<DriverNotifier> logger)
{
    public async Task NotifyAsync(int driverId, int? tripId, string title, string body, CancellationToken ct = default)
    {
        try
        {
            var tokens = await db.PushTokens.Where(p => p.User.DriverId == driverId && p.User.IsActive)
                .Select(p => p.Token).ToListAsync(ct);
            if (tokens.Count == 0) return;
            var data = new Dictionary<string, string>();
            if (tripId is { } id) data["tripId"] = id.ToString();
            var invalid = await push.SendAsync(tokens.Select(t => new PushMessage(t, title, body, data)).ToList(), ct);
            if (invalid.Count > 0) await db.PushTokens.Where(p => invalid.Contains(p.Token)).ExecuteDeleteAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Şoför bildirimi gönderilemedi");
        }
    }

    public static string Route(string from, string to, DateOnly date) => $"{Formatters.Date(date)} · {from} → {to}";
}
