using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class InvoicePdfGenerator(AppDbContext db)
{
    private const string Navy = "#0B2A55";

    public async Task<(byte[] Content, string FileName)> GenerateAsync(int invoiceId, CancellationToken ct = default)
    {
        var inv = await db.Invoices.AsNoTracking().Include(i => i.Customer).Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var logo = PdfKit.DecodeLogo(company.LogoDataUrl);

        var pdf = Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(t => t.FontSize(10));

            page.Header().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    if (logo != null) col.Item().Height(50).AlignLeft().Image(logo).FitHeight();
                    col.Item().Text(company.CompanyName).FontSize(18).Bold().FontColor(Navy);
                    if (!string.IsNullOrWhiteSpace(company.Slogan)) col.Item().Text(company.Slogan).Italic().FontColor(Colors.Grey.Darken1);
                    if (!string.IsNullOrWhiteSpace(company.Address)) col.Item().Text(company.Address);
                    if (!string.IsNullOrWhiteSpace(company.Phone)) col.Item().Text($"Tel: {company.Phone}");
                    if (!string.IsNullOrWhiteSpace(company.Email)) col.Item().Text(company.Email);
                    if (!string.IsNullOrWhiteSpace(company.TaxNumber)) col.Item().Text($"{company.TaxOffice} V.D. — {company.TaxNumber}");
                });
                row.ConstantItem(200).Column(col =>
                {
                    col.Item().AlignRight().Text("FATURA").FontSize(22).Bold().FontColor(Navy);
                    col.Item().AlignRight().Text($"No: {inv.InvoiceNo}").Bold();
                    col.Item().AlignRight().Text($"Tarih: {Formatters.Date(inv.Date)}");
                    col.Item().AlignRight().Text($"Vade: {Formatters.Date(inv.DueDate)}");
                    if (inv.Status != InvoiceStatus.Issued)
                        col.Item().AlignRight().Text(inv.Status == InvoiceStatus.Draft ? "TASLAK" : "İPTAL EDİLDİ").Bold().FontColor(Colors.Red.Medium);
                });
            });

            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(12);
                col.Item().Background(Colors.Grey.Lighten4).Padding(10).Column(c =>
                {
                    c.Item().Text("SAYIN").FontSize(8).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(inv.Customer.Title).Bold();
                    if (!string.IsNullOrWhiteSpace(inv.Customer.Address)) c.Item().Text(inv.Customer.Address);
                    if (!string.IsNullOrWhiteSpace(inv.Customer.TaxNumber))
                        c.Item().Text($"{inv.Customer.TaxOffice} V.D. — {(inv.Customer.TaxNumber.Length == 11 ? "TCKN" : "VKN")}: {inv.Customer.TaxNumber}");
                });

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(30);
                        c.RelativeColumn();
                        c.ConstantColumn(100);
                    });
                    table.Header(h =>
                    {
                        foreach (var (text, right) in new[] { ("#", false), ("Açıklama", false), ("Tutar", true) })
                        {
                            var cell = h.Cell().Background(Navy).Padding(6);
                            (right ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                        }
                    });
                    var n = 1;
                    foreach (var line in inv.Lines.OrderBy(l => l.Id))
                    {
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(6).Text($"{n++}");
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(6).Text(line.Description);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight().Text(Formatters.Currency(line.Amount));
                    }
                });

                col.Item().AlignRight().Width(260).Column(t =>
                {
                    void Row(string label, decimal value, bool bold = false)
                    {
                        t.Item().Row(r =>
                        {
                            var l = r.RelativeItem().Padding(3).Text(label);
                            var v = r.ConstantItem(110).Padding(3).AlignRight().Text(Formatters.Currency(value));
                            if (bold) { l.Bold(); v.Bold(); }
                        });
                    }
                    Row("Ara Toplam", inv.Subtotal);
                    Row($"KDV (%{inv.VatRate:0.##})", inv.VatAmount);
                    if (inv.WithholdingTenths > 0) Row($"KDV Tevkifatı ({inv.WithholdingTenths}/10)", -inv.WithholdingAmount);
                    t.Item().LineHorizontal(1).LineColor(Navy);
                    Row("Ödenecek Tutar", inv.Total, bold: true);
                });

                if (!string.IsNullOrWhiteSpace(inv.Notes))
                    col.Item().Text(t => { t.Span("Not: ").Bold(); t.Span(inv.Notes); });
                if (!string.IsNullOrWhiteSpace(company.Iban))
                    col.Item().Text(t => { t.Span("IBAN: ").Bold(); t.Span(company.Iban); });
            });

            page.Footer().Column(col =>
            {
                col.Item().Text("Bu belge bilgilendirme amaçlıdır; resmi e-Fatura/e-Arşiv belgesi yerine geçmez.")
                    .FontSize(8).FontColor(Colors.Grey.Darken1);
                col.Item().AlignRight().Text(t =>
                {
                    t.DefaultTextStyle(s => s.FontSize(8).FontColor(Colors.Grey.Darken1));
                    t.Span("Sayfa "); t.CurrentPageNumber(); t.Span(" / "); t.TotalPages();
                });
            });
        })).GeneratePdf();

        return (pdf, $"{inv.InvoiceNo}.pdf");
    }
}
