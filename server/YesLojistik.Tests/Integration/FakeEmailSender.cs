using System.Collections.Concurrent;
using YesLojistik.Core.Abstractions;

namespace YesLojistik.Tests.Integration;

public class FakeEmailSender : IEmailSender
{
    public bool IsConfigured => true;
    public ConcurrentQueue<EmailMessage> Sent { get; } = new();

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        Sent.Enqueue(message);
        return Task.CompletedTask;
    }
}
