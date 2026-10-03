using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Sevkiyat listesi (müşteriye gönderilebilir PDF) ve İcmal (müşteri/ay özeti). Sefer listesindeki filtrenin tamamını kullanır;
/// iptal edilen seferler yazılmaz. Tutarlar seferin satış fiyatından ve KDV/tevkifat bilgisinden hesaplanır.
/// </summary>
public class TripStatementService(AppDbContext db, TripService trips)
{
    /// <summary>Tek belgeye yazılabilecek en fazla sefer (daha fazlası için tarih aralığı daraltılmalı).</summary>
    public const int MaxTrips = 5_000;

    public async Task<List<TripStatementLine>> LinesAsync(TripQuery q, CancellationToken ct = default)
    {
        var query = trips.Filter(q).Where(t => t.Status != TripStatus.Cancelled);
        var count = await query.CountAsync(ct);
        if (count > MaxTrips)
            throw new DomainException($"Filtrede {count} sefer var. Belge en fazla {MaxTrips} sefer alır; tarih aralığını daraltın.");
        var list = await query.Include(t => t.Customer).Include(t => t.Vehicle).Include(t => t.Driver)
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id).ToListAsync(ct);
        return list.Select(Line).ToList();
    }

    public static TripStatementLine Line(Trip t)
    {
        var amount = CustomerAmount(t);
        var tax = InvoiceCalculator.ForAmount(amount, t.SaleVatRate, t.SaleWithholdingTenths);
        return new TripStatementLine(t.Id, t.ExternalRef ?? t.Id.ToString(), t.LoadingDate, t.CustomerId, t.Customer.Title,
            Place(t.LoadingCity, t.LoadingAddress), Place(t.DeliveryCity, t.DeliveryAddress),
            t.TrailerPlate is { } trailer ? $"{t.Vehicle.Plate} / {trailer}" : t.Vehicle.Plate, t.Driver.FullName, DriverAppService.CargoText(t),
            t.CustomerReference, t.DeliveryDocumentNo ?? t.WaybillNo, tax.Subtotal, tax.VatAmount, tax.WithholdingAmount, tax.Total);
    }

    /// <summary>Müşteriye yansıyan tutar (KDV hariç): nakliye bedeli + müşteriye faturalanan ek masraf.</summary>
    public static decimal CustomerAmount(Trip t)
    {
        var extra = !t.ExtraChargeInvoiced || t.ExtraCharge <= 0 ? 0
            : t.ExtraChargeVatIncluded && t.SaleVatRate > 0 ? Money.Round(t.ExtraCharge * 100 / (100 + t.SaleVatRate)) : t.ExtraCharge;
        return Money.Round(t.SalePrice + extra);
    }

    /// <summary>"İstanbul / Tuzla OSB"; adres zaten ili içeriyorsa tekrar yazılmaz.</summary>
    public static string Place(string? city, string address) =>
        !string.IsNullOrWhiteSpace(city) && !address.Contains(city, StringComparison.CurrentCultureIgnoreCase) ? $"{city} / {address}" : address;

    /// <summary>İcmal: müşteri ve ay bazında sefer sayısı, matrah, KDV, tevkifat ve toplam.</summary>
    public static List<TripSummaryRow> Summary(IEnumerable<TripStatementLine> lines) => lines
        .GroupBy(l => (l.CustomerId, l.Customer, l.Date.Year, l.Date.Month))
        .Select(g => new TripSummaryRow(g.Key.CustomerId, g.Key.Customer, g.Key.Year, g.Key.Month, g.Count(),
            g.Sum(l => l.Subtotal), g.Sum(l => l.VatAmount), g.Sum(l => l.WithholdingAmount), g.Sum(l => l.Total)))
        .OrderBy(r => r.Customer, StringComparer.Create(Formatters.Tr, false)).ThenBy(r => r.Year).ThenBy(r => r.Month)
        .ToList();

    public static string Period(DateOnly? from, DateOnly? to) => (from, to) switch
    {
        (null, null) => "Tüm tarihler",
        ({ } a, null) => $"{Formatters.Date(a)} sonrası",
        (null, { } b) => $"{Formatters.Date(b)} tarihine kadar",
        ({ } a, { } b) => $"{Formatters.Date(a)} – {Formatters.Date(b)}",
    };

    /// <summary>Filtre tek bir müşteriyi gösteriyorsa belgede "Sayın ..." kutusu çıkar.</summary>
    private async Task<Customer?> SingleCustomerAsync(TripQuery q, IReadOnlyCollection<TripStatementLine> lines, CancellationToken ct)
    {
        var id = q.CustomerId ?? (lines.Select(l => l.CustomerId).Distinct().Count() == 1 ? lines.First().CustomerId : null);
        return id is { } cid ? await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cid, ct) : null;
    }

    private static string FileSlug(Customer? c) =>
        c == null ? "" : "-" + new string(c.Title.Where(char.IsLetterOrDigit).Take(30).ToArray());

    public async Task<(byte[] Content, string FileName)> ListPdfAsync(TripQuery q, CancellationToken ct = default)
    {
        var lines = await LinesAsync(q, ct);
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var customer = await SingleCustomerAsync(q, lines, ct);
        var pdf = Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.Margin(28);
            page.DefaultTextStyle(x => x.FontSize(8.5f));
            page.Header().Element(c => PdfKit.Header(c, company, "SEVKİYAT LİSTESİ",
                $"Dönem: {Period(q.From, q.To)}", $"Sefer sayısı: {lines.Count}", $"Düzenleme: {Formatters.Date(Clock.Today)}"));

            page.Content().PaddingVertical(12).Column(col =>
            {
                col.Spacing(10);
                if (customer != null) col.Item().Element(c => PartyBox(c, customer));

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(54); c.ConstantColumn(44); c.RelativeColumn(3); c.ConstantColumn(72); c.RelativeColumn(1.3f);
                        c.RelativeColumn(1.4f); c.ConstantColumn(66); c.ConstantColumn(58); c.ConstantColumn(56); c.ConstantColumn(70);
                    });
                    table.Header(h =>
                    {
                        foreach (var (text, right) in new[] { ("Tarih", false), ("No", false), ("Güzergâh", false), ("Plaka", false), ("Şoför", false),
                                     ("Yük", false), ("Tutar", true), ("KDV", true), ("Tevkifat", true), ("Toplam", true) })
                        {
                            var cell = h.Cell().Background(PdfKit.Navy).Padding(4);
                            (right ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                        }
                    });
                    IContainer Cell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(3).PaddingHorizontal(4);
                    foreach (var l in lines)
                    {
                        table.Cell().Element(Cell).Text(Formatters.Date(l.Date));
                        table.Cell().Element(Cell).Text(l.No);
                        table.Cell().Element(Cell).Column(c =>
                        {
                            c.Item().Text($"{l.From} → {l.To}");
                            var refs = string.Join(" · ", new[] { customer == null ? l.Customer : null,
                                l.CustomerReference is { } r ? $"Ref: {r}" : null, l.DocumentNo is { } d ? $"Evrak: {d}" : null }.Where(x => x != null));
                            if (refs.Length > 0) c.Item().Text(refs).FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                        });
                        table.Cell().Element(Cell).Text(l.Plate);
                        table.Cell().Element(Cell).Text(l.Driver);
                        table.Cell().Element(Cell).Text(l.Cargo ?? "");
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(l.Subtotal));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(l.VatAmount));
                        table.Cell().Element(Cell).AlignRight().Text(l.WithholdingAmount > 0 ? Formatters.Currency(l.WithholdingAmount) : "");
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(l.Total));
                    }
                    if (lines.Count == 0)
                        table.Cell().ColumnSpan(10).Element(Cell).AlignCenter().Text("Bu filtrede sefer yok.").FontColor(Colors.Grey.Darken1);
                });

                col.Item().AlignRight().Width(260).Element(c => Totals(c, lines.Count, lines.Sum(l => l.Subtotal), lines.Sum(l => l.VatAmount),
                    lines.Sum(l => l.WithholdingAmount), lines.Sum(l => l.Total)));
            });

            page.Footer().Element(c => PdfKit.Footer(c,
                "Tutarlar KDV hariç sefer fiyatlarından hesaplanmıştır; kesilen faturalardaki tutarlarla kuruş farkı olabilir."));
        })).GeneratePdf();
        return (pdf, $"sevkiyat-listesi{FileSlug(customer)}.pdf");
    }

    public async Task<(byte[] Content, string FileName)> SummaryPdfAsync(TripQuery q, CancellationToken ct = default)
    {
        var lines = await LinesAsync(q, ct);
        var rows = Summary(lines);
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var customer = await SingleCustomerAsync(q, lines, ct);
        var pdf = Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(x => x.FontSize(9.5f));
            page.Header().Element(c => PdfKit.Header(c, company, "İCMAL",
                $"Dönem: {Period(q.From, q.To)}", $"Sefer sayısı: {lines.Count}", $"Düzenleme: {Formatters.Date(Clock.Today)}"));

            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(12);
                if (customer != null) col.Item().Element(c => PartyBox(c, customer));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        if (customer == null) c.RelativeColumn(2);
                        c.ConstantColumn(78); c.ConstantColumn(40); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn();
                    });
                    var headers = new List<(string, bool)> { ("Ay", false), ("Sefer", true), ("Matrah", true), ("KDV", true), ("Tevkifat", true), ("Toplam", true) };
                    if (customer == null) headers.Insert(0, ("Müşteri", false));
                    table.Header(h =>
                    {
                        foreach (var (text, right) in headers)
                        {
                            var cell = h.Cell().Background(PdfKit.Navy).Padding(5);
                            (right ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                        }
                    });
                    IContainer Cell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5);
                    foreach (var r in rows)
                    {
                        if (customer == null) table.Cell().Element(Cell).Text(r.Customer);
                        table.Cell().Element(Cell).Text(ReportService.MonthLabel(r.Year, r.Month));
                        table.Cell().Element(Cell).AlignRight().Text(r.TripCount.ToString(Formatters.Tr));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(r.Subtotal));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(r.VatAmount));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(r.WithholdingAmount));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(r.Total));
                    }
                    if (rows.Count == 0)
                        table.Cell().ColumnSpan((uint)headers.Count).Element(Cell).AlignCenter().Text("Bu filtrede sefer yok.").FontColor(Colors.Grey.Darken1);
                });
                col.Item().AlignRight().Width(260).Element(c => Totals(c, lines.Count, rows.Sum(r => r.Subtotal), rows.Sum(r => r.VatAmount),
                    rows.Sum(r => r.WithholdingAmount), rows.Sum(r => r.Total)));
            });

            page.Footer().Element(c => PdfKit.Footer(c,
                "Tutarlar KDV hariç sefer fiyatlarından hesaplanmıştır; kesilen faturalardaki tutarlarla kuruş farkı olabilir."));
        })).GeneratePdf();
        return (pdf, $"icmal{FileSlug(customer)}.pdf");
    }

    /// <summary>
    /// Fatura İcmali: faturaların listesi (fatura no, tarih, vade, matrah, KDV, tevkifat, toplam, kalan) ve toplamları.
    /// Müşteriye fatura ekinde gönderilir; tek müşterinin faturalarıysa "Sayın ..." kutusu çıkar, değilse müşteri sütunu eklenir.
    /// </summary>
    public async Task<(byte[] Content, string FileName)> InvoiceSummaryPdfAsync(IReadOnlyList<InvoiceDto> invoices, DateOnly? from, DateOnly? to,
        CancellationToken ct = default)
    {
        var rows = invoices.OrderBy(i => i.Date).ThenBy(i => i.InvoiceNo, StringComparer.Ordinal).ToList();
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var customerIds = rows.Select(i => i.CustomerId).Distinct().ToList();
        var customer = customerIds.Count == 1 ? await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == customerIds[0], ct) : null;
        var pdf = Document.Create(doc => doc.Page(page =>
        {
            // Tek müşteride dikey A4 (müşteriye giden belge); birden çok müşteride müşteri sütunu sığsın diye yatay.
            page.Size(customer == null ? PageSizes.A4.Landscape() : PageSizes.A4);
            page.Margin(30);
            page.DefaultTextStyle(x => x.FontSize(8.5f));
            page.Header().Element(c => PdfKit.Header(c, company, "FATURA İCMALİ",
                $"Dönem: {Period(from ?? rows.FirstOrDefault()?.Date, to ?? rows.LastOrDefault()?.Date)}", $"Fatura sayısı: {rows.Count}",
                $"Düzenleme: {Formatters.Date(Clock.Today)}"));

            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(12);
                if (customer != null) col.Item().Element(c => PartyBox(c, customer));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        if (customer == null) c.RelativeColumn(1.6f);
                        c.ConstantColumn(66); c.ConstantColumn(54); c.ConstantColumn(54);
                        c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn();
                    });
                    var headers = new List<(string, bool)> { ("Fatura No", false), ("Tarih", false), ("Vade", false), ("Matrah", true), ("KDV", true),
                        ("Tevkifat", true), ("Toplam", true), ("Kalan", true) };
                    if (customer == null) headers.Insert(0, ("Müşteri", false));
                    table.Header(h =>
                    {
                        foreach (var (text, right) in headers)
                        {
                            var cell = h.Cell().Background(PdfKit.Navy).Padding(4);
                            (right ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                        }
                    });
                    IContainer Cell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(3).PaddingHorizontal(4);
                    foreach (var i in rows)
                    {
                        if (customer == null) table.Cell().Element(Cell).Text(i.CustomerTitle);
                        table.Cell().Element(Cell).Text(i.InvoiceNo);
                        table.Cell().Element(Cell).Text(Formatters.Date(i.Date));
                        table.Cell().Element(Cell).Text(Formatters.Date(i.DueDate));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(i.Subtotal));
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(i.VatAmount));
                        table.Cell().Element(Cell).AlignRight().Text(i.WithholdingAmount > 0 ? Formatters.Currency(i.WithholdingAmount) : "");
                        table.Cell().Element(Cell).AlignRight().Text(Formatters.Currency(i.Total));
                        table.Cell().Element(Cell).AlignRight().Text(i.Remaining > 0 ? Formatters.Currency(i.Remaining) : "—");
                    }
                    if (rows.Count == 0)
                        table.Cell().ColumnSpan((uint)headers.Count).Element(Cell).AlignCenter().Text("Bu süzgeçte fatura yok.").FontColor(Colors.Grey.Darken1);
                });
                col.Item().ShowEntire().AlignRight().Width(260).Element(c => Totals(c, "Fatura sayısı", rows.Count, rows.Sum(i => i.Subtotal), rows.Sum(i => i.VatAmount),
                    rows.Sum(i => i.WithholdingAmount), rows.Sum(i => i.Total), rows.Sum(i => i.Remaining)));
                if (!string.IsNullOrWhiteSpace(company.Iban) && rows.Any(i => i.Remaining > 0))
                    col.Item().Text(x => { x.Span("IBAN: ").Bold(); x.Span(company.Iban); });
            });

            page.Footer().Element(c => PdfKit.Footer(c,
                "Kalan: tahsilatlar düşüldükten sonra ödenmesi gereken tutar. Faturaların asılları e-Fatura / e-Arşiv olarak ayrıca iletilir."));
        })).GeneratePdf();
        return (pdf, $"fatura-icmali{FileSlug(customer)}.pdf");
    }

    private static void PartyBox(IContainer container, Customer c) => PdfKit.Box(container, "SAYIN", b =>
    {
        b.Item().Text(c.Title).Bold();
        if (!string.IsNullOrWhiteSpace(c.Address)) b.Item().Text(c.Address);
        if (!string.IsNullOrWhiteSpace(c.TaxNumber)) b.Item().Text($"{c.TaxOffice} V.D. — {c.TaxNumber}");
    });

    private static void Totals(IContainer container, int count, decimal subtotal, decimal vat, decimal withholding, decimal total) =>
        Totals(container, "Sefer sayısı", count, subtotal, vat, withholding, total);

    private static void Totals(IContainer container, string countLabel, int count, decimal subtotal, decimal vat, decimal withholding, decimal total,
        decimal? remaining = null) =>
        container.Column(tot =>
        {
            void Row(string label, string value, bool bold = false) => tot.Item().Row(r =>
            {
                var l = r.RelativeItem().Padding(3).Text(label);
                var v = r.ConstantItem(110).Padding(3).AlignRight().Text(value);
                if (bold) { l.Bold(); v.Bold(); }
            });
            Row(countLabel, count.ToString(Formatters.Tr));
            Row("Matrah (KDV hariç)", Formatters.Currency(subtotal));
            Row("KDV", Formatters.Currency(vat));
            if (withholding > 0) Row("Tevkifat", "− " + Formatters.Currency(withholding));
            tot.Item().LineHorizontal(1).LineColor(PdfKit.Navy);
            Row("Genel toplam", Formatters.Currency(total), bold: true);
            if (remaining is { } rem) Row("Kalan", Formatters.Currency(rem), bold: true);
        });
}
