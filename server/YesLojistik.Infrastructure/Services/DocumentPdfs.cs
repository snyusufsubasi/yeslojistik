using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Belgelerde ortak firma başlığı ve alt bilgi.</summary>
internal static class PdfKit
{
    public const string Navy = "#0B2A55";

    public static void Header(IContainer container, CompanySettings company, string title, params string[] right)
    {
        var logo = DecodeLogo(company.LogoDataUrl);
        container.Row(row =>
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
            row.ConstantItem(220).Column(col =>
            {
                col.Item().AlignRight().Text(title).FontSize(20).Bold().FontColor(Navy);
                foreach (var line in right) col.Item().AlignRight().Text(line);
            });
        });
    }

    public static void Footer(IContainer container, string note) => container.Column(col =>
    {
        col.Item().Text(note).FontSize(8).FontColor(Colors.Grey.Darken1);
        col.Item().AlignRight().Text(t =>
        {
            t.DefaultTextStyle(s => s.FontSize(8).FontColor(Colors.Grey.Darken1));
            t.Span("Sayfa "); t.CurrentPageNumber(); t.Span(" / "); t.TotalPages();
        });
    });

    public static void Box(IContainer container, string caption, Action<ColumnDescriptor> content) =>
        container.Background(Colors.Grey.Lighten4).Padding(10).Column(c =>
        {
            c.Item().Text(caption).FontSize(8).FontColor(Colors.Grey.Darken1);
            content(c);
        });

    public static byte[]? DecodeLogo(string? dataUrl)
    {
        if (string.IsNullOrEmpty(dataUrl)) return null;
        var comma = dataUrl.IndexOf(',');
        if (comma < 0) return null;
        try { return Convert.FromBase64String(dataUrl[(comma + 1)..]); }
        catch (FormatException) { return null; }
    }
}

/// <summary>Sefer için sevk belgesi (irsaliye): fiyat içermez, araçta taşınır ve teslimde imzalatılır.</summary>
public class WaybillPdfGenerator(AppDbContext db)
{
    public static string WaybillNo(int tripId) => $"S-{tripId:D6}";

    public async Task<(byte[] Content, string FileName)> GenerateAsync(int tripId, CancellationToken ct = default)
    {
        var trip = await db.Trips.AsNoTracking().Include(t => t.Customer).Include(t => t.Vehicle).Include(t => t.Driver)
            .FirstOrDefaultAsync(t => t.Id == tripId, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var no = WaybillNo(trip.Id);

        var pdf = Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(t => t.FontSize(10));
            page.Header().Element(c => PdfKit.Header(c, company, "SEVK BELGESİ",
                $"No: {no}", $"Yükleme: {Formatters.Date(trip.LoadingDate)}",
                $"Düzenleme: {Formatters.Date(Clock.Today)}"));

            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(12);
                col.Item().Row(r =>
                {
                    r.Spacing(12);
                    r.RelativeItem().Element(c => PdfKit.Box(c, "GÖNDERİCİ / MÜŞTERİ", b =>
                    {
                        b.Item().Text(trip.Customer.Title).Bold();
                        if (!string.IsNullOrWhiteSpace(trip.Customer.Address)) b.Item().Text(trip.Customer.Address);
                        if (!string.IsNullOrWhiteSpace(trip.Customer.Phone)) b.Item().Text($"Tel: {trip.Customer.Phone}");
                        if (!string.IsNullOrWhiteSpace(trip.Customer.TaxNumber))
                            b.Item().Text($"{trip.Customer.TaxOffice} V.D. — {trip.Customer.TaxNumber}");
                    }));
                    r.RelativeItem().Element(c => PdfKit.Box(c, "TAŞIYICI", b =>
                    {
                        b.Item().Text(company.CompanyName).Bold();
                        b.Item().Text($"Araç plakası: {trip.Vehicle.Plate}" + (trip.TrailerPlate is { } tp ? $" · Dorse: {tp}" : ""));
                        b.Item().Text($"Araç: {string.Join(" ", new[] { trip.Vehicle.Type, trip.Vehicle.Brand, trip.Vehicle.Model }.Where(s => !string.IsNullOrWhiteSpace(s)))}");
                        b.Item().Text($"Şoför: {trip.Driver.FullName}");
                        if (!string.IsNullOrWhiteSpace(trip.Driver.NationalId)) b.Item().Text($"TCKN: {trip.Driver.NationalId}");
                        if (!string.IsNullOrWhiteSpace(trip.Driver.Phone)) b.Item().Text($"Tel: {trip.Driver.Phone}");
                    }));
                });

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c => { c.ConstantColumn(130); c.RelativeColumn(); });
                    void Row(string label, string? value)
                    {
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(6).Text(label).Bold();
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(6).Text(string.IsNullOrWhiteSpace(value) ? "—" : value);
                    }
                    if (trip.CustomerReference != null) Row("Müşteri ref. no", trip.CustomerReference);
                    Row("Yükleme adresi", string.Join(" / ", new[] { trip.LoadingCity, trip.LoadingAddress }.Where(s => !string.IsNullOrWhiteSpace(s))));
                    if (trip.LoadingContact != null) Row("Yüklemede yetkili", trip.LoadingContact);
                    Row("Teslimat adresi", string.Join(" / ", new[] { trip.DeliveryCity, trip.DeliveryAddress }.Where(s => !string.IsNullOrWhiteSpace(s))));
                    if (trip.DeliveryContact != null) Row("Teslimde yetkili", trip.DeliveryContact);
                    Row("Yükleme tarihi", Formatters.Date(trip.LoadingDate));
                    Row("Teslim tarihi", trip.DeliveryDate is { } d ? Formatters.Date(d) : null);
                    Row("Yük", DriverAppService.CargoText(trip));
                    Row("Açıklama", trip.Description);
                });

                col.Item().PaddingTop(24).Row(r =>
                {
                    r.Spacing(24);
                    foreach (var caption in new[] { "TESLİM EDEN (Şoför)", "TESLİM ALAN" })
                    {
                        r.RelativeItem().Border(0.75f).BorderColor(Colors.Grey.Medium).Padding(10).Column(c =>
                        {
                            c.Spacing(14);
                            c.Item().Text(caption).Bold().FontColor(PdfKit.Navy);
                            c.Item().Text("Ad Soyad: ..............................................");
                            c.Item().Text("Tarih / Saat: ..........................................");
                            c.Item().Text("İmza:");
                            c.Item().Height(40);
                        });
                    }
                });
                col.Item().Text("Yük eksiksiz ve hasarsız teslim alınmıştır. Hasar veya eksik varsa lütfen bu belgeye not düşünüz.")
                    .FontSize(9).FontColor(Colors.Grey.Darken2);
            });

            page.Footer().Element(c => PdfKit.Footer(c, "Bu belge taşıma bilgisi içindir; resmi e-İrsaliye belgesi yerine geçmez."));
        })).GeneratePdf();

        return (pdf, $"{no}.pdf");
    }
}

/// <summary>Müşteri hesap ekstresi: seçilen dönemdeki fatura ve tahsilatlar, devreden ve kapanış bakiyesiyle.</summary>
public class StatementPdfGenerator(AppDbContext db, CustomerAccountService accounts, IEmailSender email)
{
    public async Task<(byte[] Content, string FileName, Customer Customer, decimal Closing)> GenerateAsync(
        int customerId, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        if (from is { } f && to is { } t && f > t) throw new DomainException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new NotFoundException("Müşteri bulunamadı.");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var all = await accounts.MovementsAsync(customerId, ct);
        var before = all.Where(m => from is { } f0 && m.Date < f0).ToList();
        var opening = before.Count > 0 ? before[^1].RunningBalance : 0m;
        var rows = all.Where(m => (from is not { } f1 || m.Date >= f1) && (to is not { } t1 || m.Date <= t1)).ToList();
        var closing = rows.Count > 0 ? rows[^1].RunningBalance : opening;
        var period = (from, to) switch
        {
            (null, null) => "Tüm hareketler",
            ({ } a, null) => $"{Formatters.Date(a)} sonrası",
            (null, { } b) => $"{Formatters.Date(b)} tarihine kadar",
            ({ } a, { } b) => $"{Formatters.Date(a)} – {Formatters.Date(b)}",
        };

        var pdf = Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(x => x.FontSize(9.5f));
            page.Header().Element(c => PdfKit.Header(c, company, "HESAP EKSTRESİ",
                $"Dönem: {period}", $"Düzenleme: {Formatters.Date(Clock.Today)}", $"Cari No: {customer.CustomerNo}"));

            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(12);
                col.Item().Element(c => PdfKit.Box(c, "SAYIN", b =>
                {
                    b.Item().Text(customer.Title).Bold();
                    if (!string.IsNullOrWhiteSpace(customer.Address)) b.Item().Text(customer.Address);
                    if (!string.IsNullOrWhiteSpace(customer.TaxNumber)) b.Item().Text($"{customer.TaxOffice} V.D. — {customer.TaxNumber}");
                }));

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(62); c.ConstantColumn(58); c.ConstantColumn(66); c.RelativeColumn();
                        c.ConstantColumn(74); c.ConstantColumn(74); c.ConstantColumn(80);
                    });
                    table.Header(h =>
                    {
                        foreach (var (text, right) in new[] { ("Tarih", false), ("İşlem", false), ("Belge", false), ("Açıklama", false), ("Borç", true), ("Alacak", true), ("Bakiye", true) })
                        {
                            var cell = h.Cell().Background(PdfKit.Navy).Padding(5);
                            (right ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                        }
                    });
                    IContainer Cell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5);
                    if (from is not null)
                    {
                        table.Cell().ColumnSpan(6).Element(Cell).Text("Devreden bakiye").Italic();
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(opening)).Italic();
                    }
                    foreach (var m in rows)
                    {
                        table.Cell().Element(Cell).Text(Formatters.Date(m.Date));
                        table.Cell().Element(Cell).Text(m.Type);
                        table.Cell().Element(Cell).Text(m.Reference);
                        table.Cell().Element(Cell).Text(m.Description ?? "");
                        table.Cell().Element(Cell).AlignRight().Text(m.Debit > 0 ? Formatters.Currency(m.Debit) : "");
                        table.Cell().Element(Cell).AlignRight().Text(m.Credit > 0 ? Formatters.Currency(m.Credit) : "");
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(m.RunningBalance));
                    }
                    if (rows.Count == 0)
                        table.Cell().ColumnSpan(7).Element(Cell).AlignCenter().Text("Bu dönemde hareket yok.").FontColor(Colors.Grey.Darken1);
                });

                col.Item().AlignRight().Width(280).Column(tot =>
                {
                    void Row(string label, decimal value, bool bold = false)
                    {
                        tot.Item().Row(r =>
                        {
                            var l = r.RelativeItem().Padding(3).Text(label);
                            var v = r.ConstantItem(110).Padding(3).AlignRight().Text(Formatters.Currency(value));
                            if (bold) { l.Bold(); v.Bold(); }
                        });
                    }
                    if (from is not null) Row("Devreden bakiye", opening);
                    Row("Dönem borç toplamı", rows.Sum(r => r.Debit));
                    Row("Dönem alacak toplamı", rows.Sum(r => r.Credit));
                    tot.Item().LineHorizontal(1).LineColor(PdfKit.Navy);
                    Row(closing >= 0 ? "Bakiye (borcunuz)" : "Bakiye (alacağınız)", Math.Abs(closing), bold: true);
                });
                if (!string.IsNullOrWhiteSpace(company.Iban))
                    col.Item().Text(x => { x.Span("IBAN: ").Bold(); x.Span(company.Iban); });
                col.Item().Text("Mutabık olmadığınız kalemler için lütfen bizimle iletişime geçiniz.").FontSize(9).FontColor(Colors.Grey.Darken2);
            });

            page.Footer().Element(c => PdfKit.Footer(c, $"{company.CompanyName} — hesap ekstresi"));
        })).GeneratePdf();

        var slug = new string(customer.Title.Where(char.IsLetterOrDigit).Take(30).ToArray());
        return (pdf, $"ekstre-{customer.CustomerNo}-{slug}.pdf", customer, closing);
    }

    public async Task<string> SendAsync(int customerId, DateOnly? from, DateOnly? to, string? recipient, string? note, CancellationToken ct = default)
    {
        var (content, fileName, customer, closing) = await GenerateAsync(customerId, from, to, ct);
        var target = string.IsNullOrWhiteSpace(recipient) ? customer.Email : recipient.Trim();
        if (string.IsNullOrWhiteSpace(target)) throw new DomainException("Müşterinin e-posta adresi yok. Alıcı adresini yazın.");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var body = $"""
            Sayın {customer.Title},

            Firmamız nezdindeki cari hesap ekstreniz ektedir.
            Güncel bakiye: {Formatters.Currency(Math.Abs(closing))} {(closing >= 0 ? "(borç)" : "(alacak)")}
            {(string.IsNullOrWhiteSpace(company.Iban) ? "" : $"IBAN: {company.Iban}")}
            {(string.IsNullOrWhiteSpace(note) ? "" : "\n" + note.Trim() + "\n")}
            Saygılarımızla,
            {company.CompanyName}{(string.IsNullOrWhiteSpace(company.Phone) ? "" : " · " + company.Phone)}
            """;
        await email.SendAsync(new EmailMessage(target, $"{company.CompanyName} – cari hesap ekstresi", body,
            [new EmailAttachment(fileName, "application/pdf", content)], company.Email), ct);
        return target;
    }
}
