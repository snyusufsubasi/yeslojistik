using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Ofis kullanıcılarına (yönetici, operasyon, muhasebe) telefon bildirimi: şoför teslim etti, fotoğraf/masraf ekledi,
/// sabah özeti vb. Her kullanıcının tercihi (yoksa rol varsayılanı) dikkate alınır. Hata iş akışını bozmaz.
/// </summary>
public class StaffNotifier(AppDbContext db, IPushSender push, ILogger<StaffNotifier> logger)
{
    public static readonly Dictionary<NotificationType, string> Labels = new()
    {
        [NotificationType.TripDelivered] = "Sefer teslim edildi",
        [NotificationType.TripStatusChanged] = "Şoför sefer durumunu değiştirdi (yüklendi, yola çıktı)",
        [NotificationType.DriverPhotoUploaded] = "Şoför fotoğraf / belge yükledi",
        [NotificationType.DriverExpenseAdded] = "Şoför masraf girdi (onay bekliyor)",
        [NotificationType.InvoiceOverdue] = "Vadesi geçen alacaklar (sabah özeti)",
        [NotificationType.PayableDue] = "Vadesi geçen taşeron borçları (sabah özeti)",
        [NotificationType.DocumentExpiring] = "Araç / şoför belgesi süresi doluyor (sabah özeti)",
    };

    /// <summary>Bu türü almak isteyen aktif ofis kullanıcılarının kimlikleri.</summary>
    public async Task<List<int>> RecipientsAsync(NotificationType type, CancellationToken ct = default)
    {
        var users = await db.Users.AsNoTracking().Where(u => u.IsActive && u.Role != UserRole.Driver)
            .Select(u => new { u.Id, u.Role }).ToListAsync(ct);
        var prefs = await db.NotificationPreferences.AsNoTracking().Where(p => p.Type == type)
            .ToDictionaryAsync(p => p.UserId, p => p.Push, ct);
        return users.Where(u => prefs.TryGetValue(u.Id, out var on) ? on : NotificationPreference.Default(u.Role, type))
            .Select(u => u.Id).ToList();
    }

    public async Task NotifyAsync(NotificationType type, string title, string body, IDictionary<string, string>? data = null,
        CancellationToken ct = default)
    {
        try
        {
            var ids = await RecipientsAsync(type, ct);
            if (ids.Count == 0) return;
            var tokens = await db.PushTokens.Where(p => ids.Contains(p.UserId)).Select(p => p.Token).ToListAsync(ct);
            if (tokens.Count == 0) return;
            var payload = new Dictionary<string, string>(data ?? new Dictionary<string, string>()) { ["type"] = type.ToString() };
            var invalid = await push.SendAsync(tokens.Select(t => new PushMessage(t, title, body, payload)).ToList(), ct);
            if (invalid.Count > 0) await db.PushTokens.Where(p => invalid.Contains(p.Token)).ExecuteDeleteAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Ofis bildirimi gönderilemedi ({Type})", type);
        }
    }
}
