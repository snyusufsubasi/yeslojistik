using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Müşteri kartında "durum e-postası" açıksa, sefer yüklendiğinde, yola çıktığında ve teslim edildiğinde
/// müşteriye takip linkiyle e-posta gönderir. Gönderim hatası sefer işlemini bozmaz.
/// </summary>
public class CustomerNotifier(AppDbContext db, IEmailSender email, TrackingService tracking, IConfiguration config,
    ILogger<CustomerNotifier> logger)
{
    public static string? Headline(TripStatus status) => status switch
    {
        TripStatus.Loaded => "Yükünüz araca yüklendi",
        TripStatus.OnRoad => "Yükünüz yola çıktı",
        TripStatus.Delivered => "Yükünüz teslim edildi",
        _ => null,
    };

    public async Task StatusChangedAsync(int tripId, TripStatus status, CancellationToken ct = default)
    {
        if (Headline(status) is not { } headline || !email.IsConfigured) return;
        try
        {
            var trip = await db.Trips.AsNoTracking().Where(t => t.Id == tripId)
                .Select(t => new { t.Customer.Title, t.Customer.Email, t.Customer.NotifyStatusByEmail, t.LoadingAddress, t.DeliveryAddress,
                    t.LoadingDate, t.DeliveryDate, t.Vehicle.Plate })
                .FirstOrDefaultAsync(ct);
            if (trip is not { NotifyStatusByEmail: true } || string.IsNullOrWhiteSpace(trip.Email)) return;

            var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
            var publicUrl = config["App:PublicUrl"];
            var link = string.IsNullOrWhiteSpace(publicUrl) || status == TripStatus.Delivered
                ? null
                : $"{publicUrl.TrimEnd('/')}/takip/{await tracking.GetOrCreateTokenAsync(tripId, ct)}";
            var body = $"""
                Sayın {trip.Title},

                {headline}.

                Güzergah : {trip.LoadingAddress} → {trip.DeliveryAddress}
                Yükleme  : {Formatters.Date(trip.LoadingDate)}{(trip.DeliveryDate is { } d && status == TripStatus.Delivered ? $"\nTeslim   : {Formatters.Date(d)}" : "")}
                Araç     : {TrackingService.MaskPlate(trip.Plate)}
                {(link is null ? "" : $"\nYükünüzü buradan takip edebilirsiniz: {link}\n")}
                Saygılarımızla,
                {company.CompanyName}{(string.IsNullOrWhiteSpace(company.Phone) ? "" : " · " + company.Phone)}
                """;
            await email.SendAsync(new EmailMessage(trip.Email, $"{company.CompanyName} – {headline}", body, [], company.Email), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Müşteri durum e-postası gönderilemedi (sefer {TripId})", tripId);
        }
    }
}
