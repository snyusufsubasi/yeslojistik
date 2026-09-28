using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;

namespace YesLojistik.Infrastructure.Services;

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    /// <summary>Gönderen adresi, ör. "YES Lojistik &lt;fatura@yeslojistik.com&gt;"</summary>
    public string? From { get; set; }
}

public class SmtpEmailSender(SmtpOptions options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Host) && !string.IsNullOrWhiteSpace(options.From);

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (options is not { Host: { } host, From: { } from } || !IsConfigured) throw new DomainException("E-posta gönderimi ayarlanmamış (SMTP).");
        var mime = new MimeMessage();
        mime.From.Add(MailboxAddress.Parse(from));
        mime.To.Add(MailboxAddress.Parse(message.To));
        if (!string.IsNullOrWhiteSpace(message.ReplyTo)) mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));
        mime.Subject = message.Subject;
        var body = new BodyBuilder { TextBody = message.Body };
        foreach (var a in message.Attachments) body.Attachments.Add(a.FileName, a.Content, ContentType.Parse(a.ContentType));
        mime.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(host, options.Port, options.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable, ct);
            if (!string.IsNullOrEmpty(options.User)) await client.AuthenticateAsync(options.User, options.Password ?? "", ct);
            await client.SendAsync(mime, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "E-posta gönderilemedi");
            throw new DomainException("E-posta gönderilemedi. SMTP ayarlarını ve alıcı adresini kontrol edin.");
        }
    }
}
