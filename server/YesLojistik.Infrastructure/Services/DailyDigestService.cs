using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Her sabah 08:00'den sonra bir kez, yöneticilere uyarı özetini (bakım, muayene, sigorta, şoför belgeleri,
/// vadesi geçen alacaklar) e-postayla gönderir. Uyarı yoksa e-posta atılmaz.
/// </summary>
public class DailyDigestService(AppDbContext db, AlertService alerts, IEmailSender email, IConfiguration config)
{
    public const int SendHour = 8;

    /// <returns>Gönderilen alıcı sayısı.</returns>
    public async Task<int> SendIfDueAsync(DateTime localNow, CancellationToken ct = default)
    {
        if (!email.IsConfigured || localNow.Hour < SendHour) return 0;
        var today = DateOnly.FromDateTime(localNow);
        // Aynı gün iki kez gönderilmesin: önce günü işaretle (birden fazla sunucu örneğinde de tek gönderim).
        var claimed = await db.CompanySettings
            .Where(s => s.DailyDigestEnabled && (s.LastDigestDate == null || s.LastDigestDate < today))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.LastDigestDate, today), ct);
        if (claimed == 0) return 0;

        var list = await alerts.GetAsync(ct);
        if (list.Count == 0) return 0;
        var recipients = await db.Users.AsNoTracking().Where(u => u.IsActive && u.Role == UserRole.Admin)
            .Select(u => u.Email).ToListAsync(ct);
        if (recipients.Count == 0) return 0;

        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var baseUrl = config["App:PublicUrl"]?.TrimEnd('/');
        var body = new StringBuilder();
        body.AppendLine($"Günaydın,\n\n{Formatters.Date(today)} itibarıyla dikkat edilmesi gereken {list.Count} konu var:\n");
        foreach (var group in list.GroupBy(a => a.Type switch
                 {
                     "receivable" => "Vadesi geçen alacaklar",
                     "maintenance" or "inspection" or "insurance" => "Araçlar",
                     _ => "Şoför belgeleri",
                 }).OrderBy(g => g.Key))
        {
            body.AppendLine(group.Key.ToUpper(new System.Globalization.CultureInfo("tr-TR")));
            foreach (var a in group) body.AppendLine($"  {(a.Severity == "danger" ? "!!" : "• ")} {a.Title}: {a.Message}");
            body.AppendLine();
        }
        if (!string.IsNullOrWhiteSpace(baseUrl)) body.AppendLine($"Panel: {baseUrl}\n");
        body.AppendLine("Bu e-postayı Ayarlar → Firma Bilgileri → \"Sabah uyarı özeti\" seçeneğinden kapatabilirsiniz.");

        foreach (var to in recipients)
            await email.SendAsync(new EmailMessage(to, $"{company.CompanyName} – günlük uyarı özeti ({list.Count})", body.ToString(), []), ct);
        return recipients.Count;
    }
}
