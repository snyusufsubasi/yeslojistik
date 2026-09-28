namespace YesLojistik.Core.Abstractions;

public record PushMessage(string Token, string Title, string Body, IReadOnlyDictionary<string, string>? Data = null);

/// <summary>Mobil bildirim gönderici (Expo Push). Hata fırlatmaz; gönderilemeyenleri loglar.</summary>
public interface IPushSender
{
    /// <returns>Artık geçersiz olan (uygulama silinmiş vb.) token'lar.</returns>
    Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct = default);
}
