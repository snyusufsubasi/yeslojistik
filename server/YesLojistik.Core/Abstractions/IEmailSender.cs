namespace YesLojistik.Core.Abstractions;

public record EmailAttachment(string FileName, string ContentType, byte[] Content);

public record EmailMessage(string To, string Subject, string Body, IReadOnlyList<EmailAttachment> Attachments, string? ReplyTo = null);

public interface IEmailSender
{
    /// <summary>SMTP ayarları yapılmış mı? Yapılmamışsa arayüzde e-posta düğmesi gizlenir.</summary>
    bool IsConfigured { get; }
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
