using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Bütün müşterilerin ve tedarikçilerin cari özetini tek tabloda verir. Tutarlar cari ekranı ve ekstreyle aynı kurallarla hesaplanır.</summary>
public class CariService(AppDbContext db, BalanceService balances, PayableService payables)
{
    public async Task<List<CustomerCariRow>> CustomersAsync(CancellationToken ct = default)
    {
        var customers = await db.Customers.AsNoTracking()
            .Select(c => new { c.Id, c.Title, c.TaxNumber, c.Phone, c.OpeningBalance, c.LegacyBalance, c.LegacyBalanceAt }).ToListAsync(ct);
        var invoiced = await db.Invoices.Where(i => i.Status == InvoiceStatus.Issued)
            .GroupBy(i => i.CustomerId).Select(g => new { g.Key, Sum = g.Sum(i => i.Total) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var cancelled = await db.Invoices.Where(i => i.Status == InvoiceStatus.Cancelled)
            .GroupBy(i => i.CustomerId).Select(g => new { g.Key, Count = g.Count(), Sum = g.Sum(i => i.Total) }).ToDictionaryAsync(x => x.Key, ct);
        var collected = await db.Payments.Where(Payment.Counts)
            .GroupBy(p => p.CustomerId).Select(g => new { g.Key, Sum = g.Sum(p => p.Amount) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var uninvoiced = await db.Trips.Where(t => !t.IsLegacy && t.Status == TripStatus.Delivered && t.InvoiceId == null)
            .GroupBy(t => t.CustomerId).Select(g => new { g.Key, Count = g.Count(), Sum = g.Sum(t => t.SalePrice) })
            .ToDictionaryAsync(x => x.Key, ct);
        var overdue = (await balances.BalancesByCustomerAsync(null, ct))
            .ToDictionary(g => g.Key, g => g.Where(b => b.Remaining > 0 && b.DueDate < Clock.Today).Sum(b => b.Remaining));

        return customers.Select(c =>
        {
            var inv = invoiced.GetValueOrDefault(c.Id);
            var col = collected.GetValueOrDefault(c.Id);
            var un = uninvoiced.GetValueOrDefault(c.Id);
            var can = cancelled.GetValueOrDefault(c.Id);
            return new CustomerCariRow(c.Id, c.Id.ToString("D5"), c.Title, c.TaxNumber, c.Phone, c.OpeningBalance, inv, col,
                c.OpeningBalance + inv - col, overdue.GetValueOrDefault(c.Id), un?.Count ?? 0, un?.Sum ?? 0, can?.Count ?? 0, can?.Sum ?? 0,
                c.LegacyBalance, c.LegacyBalanceAt);
        }).OrderByDescending(r => r.Balance).ThenBy(r => r.Title).ToList();
    }

    public async Task<List<SupplierCariRow>> SuppliersAsync(CancellationToken ct = default)
    {
        var suppliers = await db.Suppliers.AsNoTracking()
            .Select(s => new { s.Id, s.Title, s.TaxNumber, s.Phone, s.OpeningBalance, s.LegacyBalance, s.LegacyBalanceAt }).ToListAsync(ct);
        var items = await payables.ItemsAsync(null, ct);
        var byKind = items.GroupBy(i => i.SupplierId).ToDictionary(g => g.Key, g => new
        {
            // Faturası gelmemiş taşeron seferleri (yüklenmiş/yolda/teslim) ve alınan faturalar birlikte sefer borcudur.
            Trips = g.Where(i => i.Kind == PayableKind.Trip).Sum(i => i.Total),
            TripCount = g.Count(i => i.Kind == PayableKind.Trip),
            Invoices = g.Where(i => i.Kind == PayableKind.Invoice).Sum(i => i.Total),
            InvoiceCount = g.Count(i => i.Kind == PayableKind.Invoice),
            Expenses = g.Where(i => i.Kind == PayableKind.Expense).Sum(i => i.Total),
            Overdue = g.Where(i => i.Remaining > 0 && i.DueDate < Clock.Today).Sum(i => i.Remaining),
        });
        var cancelled = await db.PurchaseInvoices.Where(p => p.IsCancelled).GroupBy(p => p.SupplierId)
            .Select(g => new { g.Key, Count = g.Count(), Sum = g.Sum(p => p.Total) }).ToDictionaryAsync(x => x.Key, ct);
        var paid = await db.SupplierPayments.GroupBy(p => p.SupplierId).Select(g => new { g.Key, Sum = g.Sum(p => p.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var trips = await db.Trips.Where(t => t.CarrierSupplierId != null).GroupBy(t => t.CarrierSupplierId!.Value)
            .Select(g => new { g.Key, Count = g.Count(),
                Missing = g.Count(t => !t.IsLegacy && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null) })
            .ToDictionaryAsync(x => x.Key, ct);

        return suppliers.Select(s =>
        {
            var k = byKind.GetValueOrDefault(s.Id);
            var p = paid.GetValueOrDefault(s.Id);
            var t = trips.GetValueOrDefault(s.Id);
            var can = cancelled.GetValueOrDefault(s.Id);
            var tripCost = (k?.Trips ?? 0) + (k?.Invoices ?? 0);
            var exp = k?.Expenses ?? 0;
            return new SupplierCariRow(s.Id, $"T{s.Id:D5}", s.Title, s.TaxNumber, s.Phone, s.OpeningBalance, tripCost, exp, p,
                s.OpeningBalance + tripCost + exp - p, k?.Overdue ?? 0, t?.Count ?? 0, t?.Missing ?? 0,
                k?.Invoices ?? 0, k?.InvoiceCount ?? 0, can?.Count ?? 0, can?.Sum ?? 0, k?.TripCount ?? 0, k?.Trips ?? 0,
                s.LegacyBalance, s.LegacyBalanceAt);
        }).OrderByDescending(r => r.Balance).ThenBy(r => r.Title).ToList();
    }

    // ------------------------------------------------------------------ Dışa aktarım (Excel / PDF)

    /// <summary>Sütunun aynada görünürlüğü: her zaman, yalnız panelde veri varsa, hiç (ayna bakiyesiyle çelişen panel hesapları).</summary>
    private enum MirrorShow { Always, IfData, Never }

    /// <summary>Tablonun tutar sütunu. Count verilirse yanına sefer/fatura adedi sütunu da yazılır.</summary>
    private sealed record Col<T>(string Key, string Header, Func<T, decimal> Value, MirrorShow Mirror, Func<T, int>? Count = null, string? CountHeader = null);

    private static readonly List<Col<CustomerCariRow>> CustomerCols =
    [
        new("opening", "Devir", r => r.Opening, MirrorShow.Never),
        new("invoiced", "Kesilen Fatura", r => r.Invoiced, MirrorShow.IfData),
        new("cancelled", "İptal Fatura", r => r.CancelledInvoices, MirrorShow.IfData),
        new("uninvoiced", "Faturasız Sevkiyatlar", r => r.UninvoicedTrips, MirrorShow.IfData, r => r.UninvoicedTripCount, "Faturasız Sefer"),
        new("collected", "Alınan Ödeme", r => r.Collected, MirrorShow.Never),
    ];

    private static readonly List<Col<SupplierCariRow>> SupplierCols =
    [
        new("opening", "Devir", r => r.Opening, MirrorShow.Never),
        new("received", "Alınan Fatura", r => r.ReceivedInvoices, MirrorShow.IfData),
        new("cancelled", "İptal Fatura", r => r.CancelledInvoices, MirrorShow.IfData),
        new("uninvoiced", "Faturasız Sevkiyatlar", r => r.UninvoicedTrips, MirrorShow.IfData, r => r.UninvoicedTripCount, "Faturasız Sefer"),
        new("expenses", "Vadeli Gider", r => r.CreditExpenses, MirrorShow.Never),
        new("paid", "Verilen Ödeme", r => r.Paid, MirrorShow.Never),
    ];

    public async Task<(byte[] Content, string FileName, string ContentType)> ExportCustomersAsync(CariExportQuery q, string? format, CancellationToken ct = default) =>
        await ExportAsync(await CustomersAsync(ct), CustomerCols, q, format, "Müşteriler Cari", "Müşteri", "musteriler-cari",
            r => r.Title, r => r.TaxNumber, r => r.Phone, r => r.Balance, r => r.Overdue, r => r.LegacyBalance, ct);

    public async Task<(byte[] Content, string FileName, string ContentType)> ExportSuppliersAsync(CariExportQuery q, string? format, CancellationToken ct = default) =>
        await ExportAsync(await SuppliersAsync(ct), SupplierCols, q, format, "Tedarikçiler Cari", "Tedarikçi", "tedarikciler-cari",
            r => r.Title, r => r.TaxNumber, r => r.Phone, r => r.Balance, r => r.Overdue, r => r.LegacyBalance, ct);

    private async Task<(byte[] Content, string FileName, string ContentType)> ExportAsync<T>(List<T> all, List<Col<T>> allCols, CariExportQuery q,
        string? format, string title, string partyHeader, string fileName, Func<T, string> name, Func<T, string?> tax, Func<T, string?> phone,
        Func<T, decimal> balance, Func<T, decimal> overdue, Func<T, decimal?> legacy, CancellationToken ct)
    {
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var mirror = company.MirrorMode;
        // Ayna açıkken bakiye pratikortam'ın rakamıdır; panel kendi borç/alacak hesabını yapmaz (ekrandaki tabloyla aynı kural).
        decimal Bal(T r) => mirror ? legacy(r) ?? 0 : balance(r);
        var cols = allCols.Where(c => !mirror || c.Mirror == MirrorShow.Always
            || (c.Mirror == MirrorShow.IfData && all.Any(r => c.Value(r) != 0 || (c.Count?.Invoke(r) ?? 0) != 0))).ToList();

        var search = SearchKey(q.Search ?? "");
        var filter = q.Filter is "all" or "overdue" ? q.Filter : "open";
        var rows = all.Where(r => filter switch { "all" => true, "overdue" => overdue(r) > 0, _ => Bal(r) != 0 })
            .Where(r => search.Length == 0 || SearchKey($"{name(r)} {tax(r)} {phone(r)}").Contains(search, StringComparison.Ordinal))
            .ToList();
        rows = Sort(rows, q.Sort, q.Desc, cols, name, tax, Bal, overdue);

        var balanceHeader = mirror ? "Bakiye (pratikortam)" : "Bakiye";
        var filterLabel = filter switch { "all" => "Hepsi", "overdue" => "Vadesi geçenler", _ => "Bakiyesi olanlar" };
        var info = $"Gösterilen: {filterLabel}" + (search.Length > 0 ? $" · Arama: “{q.Search!.Trim()}”" : "");

        // Satırları düz bir diziye çevir: ünvan, VKN, sütunlar (adetlerle), bakiye, (vadesi geçen).
        var headers = new List<(string Text, bool Money, bool Number)> { (partyHeader, false, false), ("VKN", false, false) };
        foreach (var c in cols)
        {
            headers.Add((c.Header, true, false));
            if (c.Count != null) headers.Add((c.CountHeader!, false, true));
        }
        headers.Add((balanceHeader, true, false));
        if (!mirror) headers.Add(("Vadesi Geçen", true, false));

        object?[] Line(T r)
        {
            var cells = new List<object?> { name(r), tax(r) };
            foreach (var c in cols)
            {
                cells.Add(c.Value(r));
                if (c.Count != null) cells.Add(c.Count(r));
            }
            cells.Add(Bal(r));
            if (!mirror) cells.Add(overdue(r));
            return cells.ToArray();
        }
        var lines = rows.Select(Line).ToList();
        var total = new object?[headers.Count];
        total[0] = $"Toplam ({rows.Count} kayıt)";
        for (var i = 2; i < headers.Count; i++)
            total[i] = headers[i].Number ? lines.Sum(l => (int)l[i]!) : lines.Sum(l => (decimal)l[i]!);

        if (format == "pdf")
        {
            var note = mirror
                ? $"Bakiyeler pratikortam'daki cari ile aynıdır{(company.MirrorLastAt is { } at ? $" (son güncelleme {Formatters.Date(DateOnly.FromDateTime(at.ToLocalTime()))})" : "")}. Diğer sütunlar paneldeki kayıtlardandır."
                : "Faturasız sevkiyatlar ve iptal faturalar bilgi içindir; müşteri bakiyesine dahil değildir.";
            return (Pdf(company, title.ToUpper(Formatters.Tr), info, headers, lines, total, note), $"{fileName}.pdf", "application/pdf");
        }

        var preface = new List<string> { title, info, $"Düzenleme: {Formatters.Date(Clock.Today)}" };
        if (mirror) preface.Add("Bakiyeler pratikortam'daki cari ile aynıdır; diğer sütunlar paneldeki kayıtlardandır.");
        using var wb = new ExcelWorkbookBuilder();
        wb.AddSheet(title, lines, [total], preface, headers.Select((h, i) =>
            new ExcelColumn<object?[]>(h.Text, l => l[i], h.Money ? ExcelExporter.MoneyFormat : null)).ToArray());
        return (wb.Build(), $"{fileName}-{Clock.Today:yyyyMMdd}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    private static List<T> Sort<T>(List<T> rows, string? sort, bool desc, List<Col<T>> cols, Func<T, string> name, Func<T, string?> tax,
        Func<T, decimal> balance, Func<T, decimal> overdue)
    {
        var tr = StringComparer.Create(Formatters.Tr, CompareOptions.IgnoreCase);
        if (sort is "title" or "taxNumber")
        {
            Func<T, string> key = sort == "title" ? name : r => tax(r) ?? "";
            return (desc ? rows.OrderByDescending(key, tr) : rows.OrderBy(key, tr)).ThenBy(name, tr).ToList();
        }
        // Bilinmeyen anahtar: ekrandaki varsayılan (en büyük bakiye üstte).
        Func<T, decimal>? value = sort switch
        {
            "balance" => balance,
            "overdue" => overdue,
            _ => cols.FirstOrDefault(c => c.Key == sort)?.Value,
        };
        if (value == null) { value = balance; desc = true; }
        return (desc ? rows.OrderByDescending(value) : rows.OrderBy(value)).ThenBy(name, tr).ToList();
    }

    private static byte[] Pdf(CompanySettings company, string title, string info, List<(string Text, bool Money, bool Number)> headers,
        List<object?[]> lines, object?[] total, string note) =>
        Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.Margin(28);
            page.DefaultTextStyle(x => x.FontSize(8.5f));
            page.Header().Element(c => PdfKit.Header(c, company, title, info, $"Kayıt: {lines.Count}", $"Düzenleme: {Formatters.Date(Clock.Today)}"));
            page.Content().PaddingVertical(12).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(3); c.ConstantColumn(70);
                    foreach (var h in headers.Skip(2))
                        if (h.Number) c.ConstantColumn(42); else c.RelativeColumn(1.2f);
                });
                table.Header(h =>
                {
                    foreach (var (text, money, number) in headers)
                    {
                        var cell = h.Cell().Background(PdfKit.Navy).Padding(4);
                        (money || number ? cell.AlignRight() : cell).Text(text).FontColor(Colors.White).Bold();
                    }
                });
                IContainer Cell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(3).PaddingHorizontal(4);
                void Row(object?[] l, bool bold)
                {
                    for (var i = 0; i < headers.Count; i++)
                    {
                        var (_, money, number) = headers[i];
                        var text = l[i] switch
                        {
                            decimal d when money => d == 0 && !bold ? "—" : Formatters.Currency(d),
                            int n when number => n == 0 && !bold ? "" : n.ToString(Formatters.Tr),
                            null => "",
                            var o => o.ToString()!,
                        };
                        var cell = table.Cell().Element(Cell);
                        if (bold) cell = cell.Background(Colors.Grey.Lighten4);
                        var t = (money || number ? cell.AlignRight() : cell).Text(text);
                        if (bold) t.Bold();
                    }
                }
                foreach (var l in lines) Row(l, false);
                if (lines.Count == 0)
                    table.Cell().ColumnSpan((uint)headers.Count).Element(Cell).AlignCenter().Text("Bu süzgeçte kayıt yok.").FontColor(Colors.Grey.Darken1);
                else Row(total, true);
            });
            page.Footer().Element(c => PdfKit.Footer(c, note));
        })).GeneratePdf();

    /// <summary>Aramada Türkçe harfleri sadeleştirir ("şahin" = "Sahin"); ekrandaki aramayla (lib/search.ts) aynı kural.</summary>
    public static string SearchKey(string s)
    {
        var lower = s.ToLower(Formatters.Tr);
        var sb = new StringBuilder(lower.Length);
        foreach (var ch in lower.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch switch { 'ı' => 'i', _ => char.IsWhiteSpace(ch) ? ' ' : ch });
        }
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
