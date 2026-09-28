using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Fatura PDF'ini müşteriye e-postayla gönderir.</summary>
public class InvoiceMailer(AppDbContext db, InvoicePdfGenerator pdf, IEmailSender email)
{
    public async Task<string> SendAsync(int invoiceId, string? to, string? note, CancellationToken ct = default)
    {
        var inv = await db.Invoices.AsNoTracking().Include(i => i.Customer).FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw new NotFoundException("Fatura bulunamadı.");
        if (inv.Status != InvoiceStatus.Issued) throw new DomainException("Yalnızca kesilmiş faturalar gönderilebilir.");
        var recipient = string.IsNullOrWhiteSpace(to) ? inv.Customer.Email : to.Trim();
        if (string.IsNullOrWhiteSpace(recipient)) throw new DomainException("Müşterinin e-posta adresi yok. Alıcı adresini yazın.");

        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var (content, fileName) = await pdf.GenerateAsync(invoiceId, ct);
        var body = $"""
            Sayın {inv.Customer.Title},

            {Formatters.Date(inv.Date)} tarihli {inv.InvoiceNo} numaralı faturanız ektedir.
            Ödenecek tutar: {Formatters.Currency(inv.Total)} — Son ödeme tarihi: {Formatters.Date(inv.DueDate)}
            {(string.IsNullOrWhiteSpace(company.Iban) ? "" : $"IBAN: {company.Iban}")}
            {(string.IsNullOrWhiteSpace(note) ? "" : "\n" + note.Trim() + "\n")}
            Saygılarımızla,
            {company.CompanyName}{(string.IsNullOrWhiteSpace(company.Phone) ? "" : " · " + company.Phone)}
            """;
        await email.SendAsync(new EmailMessage(recipient, $"{company.CompanyName} – {inv.InvoiceNo} numaralı fatura", body,
            [new EmailAttachment(fileName, "application/pdf", content)], company.Email), ct);
        return recipient;
    }
}
