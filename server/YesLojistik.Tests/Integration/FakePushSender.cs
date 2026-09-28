using System.Collections.Concurrent;
using YesLojistik.Core.Abstractions;

namespace YesLojistik.Tests.Integration;

public class FakePushSender : IPushSender
{
    public ConcurrentQueue<PushMessage> Sent { get; } = new();

    public Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct = default)
    {
        foreach (var m in messages) Sent.Enqueue(m);
        // "ExponentPushToken[silinmis]" uygulaması silinmiş bir telefonu temsil eder.
        return Task.FromResult<IReadOnlyList<string>>(messages.Where(m => m.Token.Contains("silinmis")).Select(m => m.Token).ToList());
    }
}
