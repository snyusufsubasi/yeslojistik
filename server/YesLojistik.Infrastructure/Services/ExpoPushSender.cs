using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Expo Push servisi üzerinden bildirim gönderir (ücretsiz, anahtar gerektirmez).</summary>
public class ExpoPushSender(HttpClient http, ILogger<ExpoPushSender> logger) : IPushSender
{
    public const string Endpoint = "https://exp.host/--/api/v2/push/send";

    public async Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct = default)
    {
        var invalid = new List<string>();
        foreach (var chunk in messages.Chunk(100))
        {
            try
            {
                var body = chunk.Select(m => new { to = m.Token, title = m.Title, body = m.Body, sound = "default", data = m.Data, channelId = "trips" });
                using var res = await http.PostAsJsonAsync(Endpoint, body, ct);
                if (!res.IsSuccessStatusCode)
                {
                    logger.LogWarning("Expo push isteği başarısız: {Status}", res.StatusCode);
                    continue;
                }
                using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array) continue;
                var i = 0;
                foreach (var ticket in data.EnumerateArray())
                {
                    if (ticket.TryGetProperty("status", out var st) && st.GetString() == "error"
                        && ticket.TryGetProperty("details", out var det) && det.TryGetProperty("error", out var err)
                        && err.GetString() == "DeviceNotRegistered" && i < chunk.Length)
                        invalid.Add(chunk[i].Token);
                    i++;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Expo push gönderilemedi");
            }
        }
        return invalid;
    }
}

public class NullPushSender : IPushSender
{
    public Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<string>>([]);
}
