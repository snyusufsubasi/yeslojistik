using System.Globalization;
using ClosedXML.Excel;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public record ImportRowError(int Row, string Message);

public record ImportResult(int TotalRows, int Created, int Skipped, IReadOnlyList<ImportRowError> Errors, IReadOnlyList<string> Warnings, bool DryRun);

/// <summary>
/// Excel'den toplu tedarikçi/müşteri/şoför/araç/sefer/iş talebi/fatura/tahsilat/ödeme/gider aktarımı. Önce <c>dryRun</c> ile kontrol edilir; hata yoksa kaydedilir.
/// Hatalı satır varsa hiçbir satır kaydedilmez (yarım aktarım olmasın). Önerilen sıra: tedarikçiler → müşteriler → şoförler → araçlar → seferler.
/// </summary>
public class ImportService(AppDbContext db, IValidator<CustomerSaveRequest> customerValidator,
    IValidator<VehicleSaveRequest> vehicleValidator, IValidator<DriverSaveRequest> driverValidator,
    IValidator<SupplierSaveRequest> supplierValidator, IValidator<TripSaveRequest> tripValidator)
{
    public const int MaxRows = 5000;
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    public static readonly Dictionary<string, string[]> Columns = new()
    {
        ["suppliers"] = ["Ünvan", "Tür", "VKN/TCKN", "Vergi Dairesi", "Telefon", "E-posta", "IBAN", "Adres", "İl", "İlçe", "Yetkili", "Vade Gün", "Devir Borcu", "Devir Tarihi"],
        ["customers"] = ["Ünvan", "VKN/TCKN", "Vergi Dairesi", "Telefon", "E-posta", "Adres", "Not", "Devir Bakiyesi", "Devir Tarihi",
            "İl", "İlçe", "Yetkili", "e-Fatura Mükellefi", "PK Etiketi", "Vade Gün"],
        ["drivers"] = ["Ad Soyad", "Telefon", "TC Kimlik No", "Ehliyet Sınıfı", "Ehliyet Bitiş", "SRC Bitiş", "Psikoteknik Bitiş", "Tedarikçi"],
        ["vehicles"] = ["Plaka", "Araç Tipi", "Marka", "Model", "Model Yılı", "Km", "Son Bakım", "Sonraki Bakım", "Muayene Bitiş", "Sigorta Bitiş",
            "Sahiplik", "Araç Sahibi", "Dorse Plakası"],
        ["trips"] = ["Yükleme Tarihi", "Müşteri", "Plaka", "Şoför", "Yükleme İli", "Yükleme Adresi", "Teslim İli", "Teslim Adresi", "Teslim Tarihi",
            "Yük Cinsi", "Müşteri Ref No", "Araç Maliyeti", "Satış Fiyatı", "Durum", "Açıklama", "Eski Kayıt"],
        ["job-requests"] = ["Tarih", "Müşteri", "Yükleme Yeri", "İndirme Yeri", "Teslim Süresi", "Yük Cinsi", "Yük Miktarı", "Araç Cinsi",
            "Müşteri Fiyatı", "Sevkiyat Fiyatı", "Komisyon", "Şoför Primi", "Masraf", "Ödeme Müşteride", "Yükleme Evrak No", "İrsaliye No",
            "Fatura Altı Not", "Açıklama", "Durum"],
        ["invoices"] = ["Fatura No", "Tarih", "Vade", "Müşteri", "Matrah", "KDV Oranı", "Tevkifat", "Toplam", "Açıklama", "Durum"],
        ["payments"] = ["Tarih", "Müşteri", "Tutar", "Yöntem", "Fatura No", "Çek/Senet No", "Banka", "Çek Vadesi", "Açıklama"],
        ["supplier-payments"] = ["Tarih", "Tedarikçi", "Tutar", "Yöntem", "Açıklama"],
        ["expenses"] = ["Tarih", "Kategori", "Tutar", "Plaka", "Şoför", "Tedarikçi", "Vadeli", "Litre", "Km", "Açıklama"],
        ["cash-accounts"] = ["Hesap Adı", "Tür", "IBAN", "Devir Bakiyesi", "Devir Tarihi"],
    };

    /// <summary>Başlıkta bulunması zorunlu sütunlar.</summary>
    private static readonly Dictionary<string, string[]> Required = new()
    {
        ["suppliers"] = ["Ünvan"],
        ["customers"] = ["Ünvan"],
        ["drivers"] = ["Ad Soyad"],
        ["vehicles"] = ["Plaka", "Araç Tipi"],
        ["trips"] = ["Yükleme Tarihi", "Müşteri", "Plaka", "Şoför", "Yükleme Adresi", "Teslim Adresi"],
        ["job-requests"] = ["Tarih", "Müşteri", "Yükleme Yeri", "İndirme Yeri"],
        ["invoices"] = ["Fatura No", "Tarih", "Müşteri", "Matrah"],
        ["payments"] = ["Tarih", "Müşteri", "Tutar"],
        ["supplier-payments"] = ["Tarih", "Tedarikçi", "Tutar"],
        ["expenses"] = ["Tarih", "Kategori", "Tutar"],
        ["cash-accounts"] = ["Hesap Adı"],
    };

    private static readonly Dictionary<string, object[]> Examples = new()
    {
        ["suppliers"] = ["Demir Nakliyat", "Taşeron", "1234567890", "Kartal", "0532 444 55 66", "", "TR33 0006 1005 1978 6457 8413 26", "İstanbul / Kartal",
            "İstanbul", "Kartal", "Hasan Demir", 30, 12500m, new DateTime(2026, 1, 1)],
        ["customers"] = ["Yıldız Mobilya", "1234567890", "Sultanbeyli", "0216 555 44 33", "info@yildizmobilya.com", "İstanbul / Sultanbeyli", "", 28114.50m,
            new DateTime(2026, 1, 1), "İstanbul", "Sultanbeyli", "Ayşe Yıldız", "Evet", "urn:mail:defaultpk@yildizmobilya.com", 30],
        ["drivers"] = ["Mehmet Yılmaz", "0532 111 22 33", "", "CE", new DateTime(2030, 1, 1), new DateTime(2028, 6, 1), new DateTime(2027, 6, 1), ""],
        ["vehicles"] = ["34 VES 01", "Kamyon", "Ford", "Cargo", 2020, 420000, new DateTime(2026, 5, 12), new DateTime(2026, 11, 12), new DateTime(2027, 3, 1),
            new DateTime(2027, 1, 15), "Özmal", "", "34 DRS 01"],
        ["trips"] = [new DateTime(2026, 9, 1), "Yıldız Mobilya", "34 VES 01", "Mehmet Yılmaz", "İstanbul", "Tuzla OSB", "Ankara", "Sincan OSB",
            new DateTime(2026, 9, 2), "Mobilya, 20 palet", "4500123", 18000m, 25000m, "Teslim Edildi", "", "Hayır"],
        ["job-requests"] = [new DateTime(2026, 9, 1), "Yıldız Mobilya", "Tuzla OSB", "Sincan OSB", "2 gün", "Mobilya", 20m, "Tır", 25000m, 18000m,
            500m, 750m, 0m, "Hayır", "YE-1234", "IRS-5678", "", "", "Bekliyor"],
        ["invoices"] = ["A2026000123", new DateTime(2026, 9, 5), new DateTime(2026, 10, 5), "Yıldız Mobilya", 25000m, 20m, "2/10", 29000m,
            "Eylül taşımaları", "Kesildi"],
        ["payments"] = [new DateTime(2026, 9, 20), "Yıldız Mobilya", 15000m, "Havale/EFT", "A2026000123", "", "", "", "Eylül tahsilatı"],
        ["supplier-payments"] = [new DateTime(2026, 9, 21), "Demir Nakliyat", 12000m, "Havale/EFT", "Eylül seferleri"],
        ["expenses"] = [new DateTime(2026, 9, 3), "Yakıt", 4250m, "34 VES 01", "Mehmet Yılmaz", "", "Hayır", 110m, 421500, "Opet Tuzla"],
        ["cash-accounts"] = ["Akbank Kurumsal", "Banka", "TR33 0006 1005 1978 6457 8413 26", 150000m, new DateTime(2026, 9, 30)],
    };

    private static readonly Dictionary<string, string> Notes = new()
    {
        ["suppliers"] = "Zorunlu: Ünvan. Tür: Taşeron, Servis, Akaryakıt veya Diğer (boşsa Taşeron). Devir Borcu: firmanın bu tedarikçiye borcu.",
        ["customers"] = "Zorunlu: Ünvan. e-Fatura Mükellefi: Evet/Hayır. Vade Gün boşsa firma varsayılanı kullanılır.",
        ["drivers"] = "Zorunlu: Ad Soyad. Tedarikçi: taşeronun şoförüyse tedarikçi ünvanı (önce tedarikçileri aktarın); kendi şoförünüzse boş.",
        ["vehicles"] = "Zorunlu: Plaka, Araç Tipi. Sahiplik: Özmal veya Kiralık. Kiralıksa Araç Sahibi (tedarikçi ünvanı) zorunlu; önce tedarikçileri aktarın.",
        ["trips"] = "Zorunlu: Yükleme Tarihi, Müşteri, Plaka, Şoför, Yükleme Adresi, Teslim Adresi. Müşteri, plaka ve şoför sistemde kayıtlı olmalı " +
            "(önce onları aktarın). Durum: Planlandı, Yüklendi, Yolda, Teslim Edildi, İptal (boşsa teslim tarihi varsa Teslim Edildi). " +
            "Aynı tarih, müşteri, plaka, teslim adresi, satış fiyatı ve açıklamaya sahip sefer zaten varsa satır atlanır. " +
            "Eski Kayıt: Evet ise sefer yalnız geçmiş olarak görünür; taşeron borcu, kesilecek fatura ve risk hesabına girmez " +
            "(tutarlar devir bakiyesine yazılır).",
        ["job-requests"] = "Zorunlu: Tarih, Müşteri, Yükleme Yeri, İndirme Yeri. Durum: Bekliyor veya İptal (sevk edilmiş talepler sefer olarak aktarılır). " +
            "Aynı tarih, müşteri, yükleme ve indirme yerine sahip talep zaten varsa atlanır.",
        ["invoices"] = "Eski sistemde kesilmiş faturalar içindir; e-Fatura gönderilmez. Zorunlu: Fatura No, Tarih, Müşteri, Matrah (KDV hariç). " +
            "KDV Oranı boşsa 20. Tevkifat: yok, 2/10 gibi. Toplam yazılırsa hesaplanan toplamla karşılaştırılır. Durum: Kesildi veya İptal. " +
            "Aynı numaralı fatura zaten varsa atlanır.",
        ["payments"] = "Zorunlu: Tarih, Müşteri, Tutar. Yöntem: Nakit, Havale/EFT, Kredi Kartı, Çek, Senet (boşsa Havale/EFT). " +
            "Fatura No yazılırsa tahsilat o faturaya bağlanır (önce faturaları aktarın). Aynı tarih, müşteri, tutar ve açıklama zaten varsa atlanır.",
        ["supplier-payments"] = "Zorunlu: Tarih, Tedarikçi, Tutar. Yöntem: Nakit, Havale/EFT, Kredi Kartı, Çek, Senet. " +
            "Aynı tarih, tedarikçi, tutar ve açıklama zaten varsa atlanır.",
        ["expenses"] = "Zorunlu: Tarih, Kategori, Tutar. Kategori: Yakıt, Bakım, Otoyol, Harcırah, Avans, Lastik, Sigorta, Vergi, Diğer. " +
            "Vadeli: Evet ise tutar tedarikçiye borç yazılır (Tedarikçi zorunlu). Aynı tarih, kategori, tutar, plaka ve açıklama zaten varsa atlanır.",
        ["cash-accounts"] = "Zorunlu: Hesap Adı. Tür: Kasa, Banka, POS, Kredi Kartı (boşsa Banka). Devir Bakiyesi: hesabın o tarihteki bakiyesi " +
            "(eksi olabilir, ör. kullanılan kredili hesap). Aynı adlı hesap zaten varsa atlanır.",
    };

    public static byte[] Template(string entity)
    {
        if (!Columns.ContainsKey(entity)) throw new NotFoundException("Bilinmeyen aktarım türü.");
        var cols = Columns[entity];
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Veri");
        for (var i = 0; i < cols.Length; i++)
        {
            var h = ws.Cell(1, i + 1);
            h.Value = cols[i];
            h.Style.Font.Bold = true;
            h.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A55");
            h.Style.Font.FontColor = XLColor.White;
            var ex = ws.Cell(2, i + 1);
            ex.Value = Examples[entity][i] switch
            {
                DateTime d => d,
                decimal m => m,
                int n => n,
                var o => o.ToString(),
            };
            if (Examples[entity][i] is DateTime) ex.Style.DateFormat.Format = "dd.mm.yyyy";
            ex.Style.Font.FontColor = XLColor.Gray;
        }
        ws.Columns().AdjustToContents();
        var info = wb.Worksheets.Add("Açıklama");
        info.Cell(1, 1).Value = "“Veri” sayfasının 2. satırı örnektir; silip kendi kayıtlarınızı yazın. Başlık satırını değiştirmeyin.";
        info.Cell(2, 1).Value = "Tarihler gg.aa.yyyy biçiminde olmalı. " + Notes[entity];
        info.Cell(3, 1).Value = "Sistemde zaten kayıtlı olanlar (aynı plaka / aynı ünvan veya VKN / aynı ad soyad) atlanır.";
        info.Cell(4, 1).Value = "Aktarım sırası: 1 Tedarikçiler → 2 Müşteriler → 3 Şoförler → 4 Araçlar → 5 Seferler ve İş Talepleri → " +
            "6 Faturalar → 7 Tahsilatlar → 8 Taşeron Ödemeleri → 9 Giderler.";
        info.Column(1).Width = 120;
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static string Key(string s) => string.Join(' ', s.Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToUpper(Tr);

    public async Task<ImportResult> ImportAsync(string entity, Stream file, bool dryRun, CancellationToken ct = default)
    {
        if (!Columns.ContainsKey(entity)) throw new NotFoundException("Bilinmeyen aktarım türü.");
        XLWorkbook wb;
        try { wb = new XLWorkbook(file); }
        catch (Exception) { throw new DomainException("Dosya okunamadı. Lütfen şablondaki .xlsx dosyasını kullanın."); }
        using var _ = wb;
        var ws = wb.Worksheets.First();

        var header = ws.Row(1).CellsUsed().ToDictionary(c => Normalize(c.GetString()), c => c.Address.ColumnNumber);
        var missing = Required[entity].Where(c => !header.ContainsKey(Normalize(c))).ToList();
        if (missing.Count > 0) throw new DomainException($"Başlık satırında zorunlu sütun eksik: {string.Join(", ", missing)}. Şablonu kullanın.");

        var rows = ws.RowsUsed().Where(r => r.RowNumber() > 1 && !r.CellsUsed().All(c => string.IsNullOrWhiteSpace(c.GetString()))).ToList();
        if (rows.Count > MaxRows) throw new DomainException($"Tek seferde en fazla {MaxRows} satır aktarılabilir.");

        var ctx = new Ctx(new RowReader(header), [], []);
        switch (entity)
        {
            case "suppliers": await SuppliersAsync(rows, ctx, ct); break;
            case "customers": await CustomersAsync(rows, ctx, ct); break;
            case "vehicles": await VehiclesAsync(rows, ctx, ct); break;
            case "trips": await TripsAsync(rows, ctx, ct); break;
            case "job-requests": await JobRequestsAsync(rows, ctx, ct); break;
            case "invoices": await InvoicesAsync(rows, ctx, ct); break;
            case "payments": await PaymentsAsync(rows, ctx, ct); break;
            case "supplier-payments": await SupplierPaymentsAsync(rows, ctx, ct); break;
            case "expenses": await ExpensesAsync(rows, ctx, ct); break;
            case "cash-accounts": await CashAccountsAsync(rows, ctx, ct); break;
            default: await DriversAsync(rows, ctx, ct); break;
        }

        if (!dryRun && ctx.Errors.Count == 0) await db.SaveChangesAsync(ct);
        else db.ChangeTracker.Clear();
        return new ImportResult(rows.Count, ctx.Errors.Count == 0 ? ctx.Created : 0, ctx.Skipped, ctx.Errors, ctx.Warnings, dryRun || ctx.Errors.Count > 0);
    }

    private sealed record Ctx(RowReader R, List<ImportRowError> Errors, List<string> Warnings)
    {
        public int Created { get; set; }
        public int Skipped { get; set; }
        public void Skip(int row, string what)
        {
            Warnings.Add($"Satır {row}: {what} zaten kayıtlı, atlandı.");
            Skipped++;
        }
    }

    /// <summary>Satırı işler; tarih/sayı biçim hataları satır hatası olarak yazılır.</summary>
    private static async Task EachAsync(IEnumerable<IXLRow> rows, Ctx ctx, Func<IXLRow, int, Task> handle)
    {
        foreach (var row in rows)
        {
            var n = row.RowNumber();
            try { await handle(row, n); }
            catch (FormatException ex) { ctx.Errors.Add(new ImportRowError(n, ex.Message)); }
        }
    }

    private async Task<Dictionary<string, int>> SupplierIdsAsync(CancellationToken ct) =>
        (await db.Suppliers.Select(s => new { s.Id, s.Title }).ToListAsync(ct)).GroupBy(s => Key(s.Title)).ToDictionary(g => g.Key, g => g.First().Id);

    private static int? Lookup(Dictionary<string, int> map, string? name, string what, int row, Ctx ctx)
    {
        if (name == null) return null;
        if (map.TryGetValue(Key(name), out var id)) return id;
        ctx.Errors.Add(new ImportRowError(row, $"{what} bulunamadı: “{name}”. Önce {what.ToLower(Tr)} kaydını ekleyin/aktarın."));
        return null;
    }

    private static bool? YesNo(string? s) => s == null ? null : Key(s) is "EVET" or "E" or "VAR" or "1" or "X" ? true : Key(s) is "HAYIR" or "H" or "YOK" or "0" ? false
        : throw new FormatException($"Evet veya Hayır yazın: {s}");

    private async Task SuppliersAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var existing = await db.Suppliers.Select(s => new { s.Title, s.TaxNumber }).ToListAsync(ct);
        var titles = existing.Select(s => Key(s.Title)).ToHashSet();
        var taxes = existing.Where(s => s.TaxNumber != null).Select(s => s.TaxNumber!).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var kind = r.Str(row, "Tür") is { } k ? Key(k) switch
            {
                "TAŞERON" or "TASERON" or "ARAÇ SAHİBİ" or "NAKLİYECİ" => SupplierKind.Carrier,
                "SERVİS" or "SERVIS" or "TAMİRCİ" => SupplierKind.Service,
                "AKARYAKIT" or "YAKIT" => SupplierKind.Fuel,
                "DİĞER" or "DIGER" => SupplierKind.Other,
                _ => throw new FormatException($"“Tür” Taşeron, Servis, Akaryakıt veya Diğer olmalı: {k}"),
            } : SupplierKind.Carrier;
            var req = new SupplierSaveRequest(r.Str(row, "Ünvan") ?? "", kind, r.Str(row, "VKN/TCKN"), r.Str(row, "Vergi Dairesi"), r.Str(row, "Telefon"),
                r.Str(row, "E-posta"), r.Str(row, "Adres"), r.Str(row, "İl"), r.Str(row, "İlçe"), r.Str(row, "IBAN"), r.Str(row, "Yetkili"),
                r.Int(row, "Vade Gün") ?? 30, null, r.Dec(row, "Devir Borcu") ?? 0, r.Date(row, "Devir Tarihi"));
            if (!Validate(supplierValidator, req, n, ctx.Errors)) return Task.CompletedTask;
            if (titles.Contains(Key(req.Title)) || (req.TaxNumber != null && taxes.Contains(req.TaxNumber.Trim())))
            {
                ctx.Skip(n, $"“{req.Title}”");
                return Task.CompletedTask;
            }
            titles.Add(Key(req.Title));
            if (req.TaxNumber != null) taxes.Add(req.TaxNumber.Trim());
            db.Suppliers.Add(new Supplier
            {
                Title = req.Title.Trim(), Kind = req.Kind, TaxNumber = Clean(req.TaxNumber), TaxOffice = Clean(req.TaxOffice),
                Phone = Formatters.NormalizePhone(req.Phone), Email = Clean(req.Email)?.ToLowerInvariant(), Address = Clean(req.Address),
                City = Cities.Normalize(req.City), District = Clean(req.District), Iban = IbanValidator.Normalize(req.Iban),
                ContactName = Clean(req.ContactName), PaymentTermDays = req.PaymentTermDays, OpeningBalance = Money.Round(req.OpeningBalance),
                OpeningBalanceDate = req.OpeningBalance > 0 ? req.OpeningBalanceDate ?? Clock.Today : null,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task CustomersAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var existing = await db.Customers.Select(c => new { c.Title, c.TaxNumber }).ToListAsync(ct);
        var titles = existing.Select(c => Key(c.Title)).ToHashSet();
        var taxes = existing.Where(c => c.TaxNumber != null).Select(c => c.TaxNumber!).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var eInvoice = YesNo(r.Str(row, "e-Fatura Mükellefi")) ?? false;
            var req = new CustomerSaveRequest(r.Str(row, "Ünvan") ?? "", r.Str(row, "VKN/TCKN"), r.Str(row, "Vergi Dairesi"),
                r.Str(row, "Telefon"), r.Str(row, "E-posta"), r.Str(row, "Adres"), r.Str(row, "Not"),
                r.Dec(row, "Devir Bakiyesi") ?? 0, r.Date(row, "Devir Tarihi"), false, r.Str(row, "İl"), r.Str(row, "İlçe"), r.Str(row, "Yetkili"),
                eInvoice, r.Str(row, "PK Etiketi"), r.Int(row, "Vade Gün"));
            if (!Validate(customerValidator, req, n, ctx.Errors)) return Task.CompletedTask;
            if (titles.Contains(Key(req.Title)) || (req.TaxNumber != null && taxes.Contains(req.TaxNumber.Trim())))
            {
                ctx.Skip(n, $"“{req.Title}”");
                return Task.CompletedTask;
            }
            titles.Add(Key(req.Title));
            if (req.TaxNumber != null) taxes.Add(req.TaxNumber.Trim());
            db.Customers.Add(new Customer
            {
                Title = req.Title.Trim(), TaxNumber = Clean(req.TaxNumber), TaxOffice = Clean(req.TaxOffice),
                Phone = Formatters.NormalizePhone(req.Phone), Email = Clean(req.Email)?.ToLowerInvariant(), Address = Clean(req.Address),
                Notes = Clean(req.Notes), OpeningBalance = Money.Round(req.OpeningBalance),
                OpeningBalanceDate = req.OpeningBalance > 0 ? req.OpeningBalanceDate ?? Clock.Today : null,
                City = Cities.Normalize(req.City), District = Clean(req.District), ContactName = Clean(req.ContactName),
                IsEInvoiceUser = req.IsEInvoiceUser, EInvoiceAlias = req.IsEInvoiceUser ? Clean(req.EInvoiceAlias) : null, PaymentTermDays = req.PaymentTermDays,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task VehiclesAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var plates = (await db.Vehicles.Select(v => v.Plate).ToListAsync(ct)).ToHashSet();
        var suppliers = await SupplierIdsAsync(ct);
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var ownership = r.Str(row, "Sahiplik") is { } o ? Key(o) switch
            {
                "ÖZMAL" or "OZMAL" or "KENDİ" or "KENDI" => VehicleOwnership.Own,
                "KİRALIK" or "KIRALIK" or "TAŞERON" or "TASERON" => VehicleOwnership.Rented,
                _ => throw new FormatException($"“Sahiplik” Özmal veya Kiralık olmalı: {o}"),
            } : VehicleOwnership.Own;
            var errorsBefore = ctx.Errors.Count;
            var supplierId = ownership == VehicleOwnership.Rented ? Lookup(suppliers, r.Str(row, "Araç Sahibi"), "Tedarikçi", n, ctx) : null;
            if (ctx.Errors.Count > errorsBefore) return Task.CompletedTask;
            var req = new VehicleSaveRequest(r.Str(row, "Plaka") ?? "", r.Str(row, "Araç Tipi") ?? "", r.Str(row, "Marka"),
                r.Str(row, "Model"), r.Int(row, "Model Yılı"), r.Int(row, "Km") ?? 0, r.Date(row, "Son Bakım"),
                r.Date(row, "Sonraki Bakım"), r.Date(row, "Muayene Bitiş"), r.Date(row, "Sigorta Bitiş"),
                VehicleStatus.Available, null, ownership, supplierId, r.Str(row, "Dorse Plakası"));
            if (!Validate(vehicleValidator, req, n, ctx.Errors)) return Task.CompletedTask;
            var plate = Formatters.NormalizePlate(req.Plate)!;
            if (!plates.Add(plate))
            {
                ctx.Skip(n, plate);
                return Task.CompletedTask;
            }
            db.Vehicles.Add(new Vehicle
            {
                Plate = plate, Type = req.Type.Trim(), Brand = Clean(req.Brand), Model = Clean(req.Model), ModelYear = req.ModelYear,
                Km = req.Km, LastMaintenanceDate = req.LastMaintenanceDate, NextMaintenanceDate = req.NextMaintenanceDate,
                InspectionExpiry = req.InspectionExpiry, InsuranceExpiry = req.InsuranceExpiry, Ownership = ownership, SupplierId = supplierId,
                TrailerPlate = Formatters.NormalizePlate(req.TrailerPlate) ?? Clean(req.TrailerPlate)?.ToUpper(Tr),
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task DriversAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var names = (await db.Drivers.Select(d => d.FullName).ToListAsync(ct)).Select(Key).ToHashSet();
        var suppliers = await SupplierIdsAsync(ct);
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var errorsBefore = ctx.Errors.Count;
            var supplierId = Lookup(suppliers, r.Str(row, "Tedarikçi"), "Tedarikçi", n, ctx);
            if (ctx.Errors.Count > errorsBefore) return Task.CompletedTask;
            var req = new DriverSaveRequest(r.Str(row, "Ad Soyad") ?? "", r.Str(row, "Telefon"), r.Str(row, "TC Kimlik No"),
                r.Str(row, "Ehliyet Sınıfı"), r.Date(row, "Ehliyet Bitiş"), r.Date(row, "SRC Bitiş"),
                r.Date(row, "Psikoteknik Bitiş"), true, supplierId);
            if (!Validate(driverValidator, req, n, ctx.Errors)) return Task.CompletedTask;
            if (!names.Add(Key(req.FullName)))
            {
                ctx.Skip(n, req.FullName);
                return Task.CompletedTask;
            }
            db.Drivers.Add(new Driver
            {
                FullName = req.FullName.Trim(), Phone = Formatters.NormalizePhone(req.Phone), NationalId = Clean(req.NationalId),
                LicenseClass = Clean(req.LicenseClass)?.ToUpperInvariant(), LicenseExpiry = req.LicenseExpiry, SrcExpiry = req.SrcExpiry,
                PsychotechnicExpiry = req.PsychotechnicExpiry, SupplierId = supplierId,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private static readonly Dictionary<string, TripStatus> StatusByLabel = new()
    {
        ["PLANLANDI"] = TripStatus.Planned, ["YÜKLENDİ"] = TripStatus.Loaded, ["YOLDA"] = TripStatus.OnRoad,
        ["TESLİM EDİLDİ"] = TripStatus.Delivered, ["TESLİM"] = TripStatus.Delivered, ["İPTAL"] = TripStatus.Cancelled,
    };

    /// <summary>
    /// Geçmiş seferler: bildirim gönderilmez, araç durumu değişmez (TripService'in yan etkileri kullanılmaz); zaman çizelgesine
    /// "Import" kaynaklı tek olay yazılır.
    /// </summary>
    private async Task TripsAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var customers = new Dictionary<string, int>();
        foreach (var c in await db.Customers.Select(c => new { c.Id, c.Title, c.TaxNumber }).ToListAsync(ct))
        {
            customers.TryAdd(Key(c.Title), c.Id);
            if (c.TaxNumber != null) customers.TryAdd(c.TaxNumber, c.Id);
        }
        var vehicles = await db.Vehicles.Select(v => new { v.Id, v.Plate, v.Ownership, v.SupplierId, v.TrailerPlate }).ToListAsync(ct);
        var vehicleByPlate = vehicles.ToDictionary(v => v.Plate);
        var drivers = (await db.Drivers.Select(d => new { d.Id, d.FullName }).ToListAsync(ct)).GroupBy(d => Key(d.FullName)).ToDictionary(g => g.Key, g => g.First().Id);
        var existing = (await db.Trips.Select(t => new { t.LoadingDate, t.CustomerId, t.VehicleId, t.DeliveryAddress, t.SalePrice, t.Description }).ToListAsync(ct))
            .Select(t => (t.LoadingDate, t.CustomerId, t.VehicleId, Key(t.DeliveryAddress), t.SalePrice, Key(t.Description ?? ""))).ToHashSet();
        var r = ctx.R;
        var now = DateTime.UtcNow;

        await EachAsync(rows, ctx, (row, n) =>
        {
            var errorsBefore = ctx.Errors.Count;
            var customerName = r.Str(row, "Müşteri");
            int? customerId = customerName == null ? null
                : customers.TryGetValue(Key(customerName), out var cid) || customers.TryGetValue(customerName.Trim(), out cid) ? cid
                : Lookup(customers, customerName, "Müşteri", n, ctx);
            var plateText = r.Str(row, "Plaka");
            var plate = Formatters.NormalizePlate(plateText);
            var vehicle = plate != null && vehicleByPlate.TryGetValue(plate, out var v) ? v : null;
            if (plateText != null && vehicle == null) ctx.Errors.Add(new ImportRowError(n, $"Araç bulunamadı: “{plateText}”. Önce araçları aktarın."));
            var driverId = Lookup(drivers, r.Str(row, "Şoför"), "Şoför", n, ctx);
            if (ctx.Errors.Count > errorsBefore) return Task.CompletedTask;

            var loading = r.Date(row, "Yükleme Tarihi");
            var delivery = r.Date(row, "Teslim Tarihi");
            var legacy = YesNo(r.Str(row, "Eski Kayıt")) ?? false;
            var status = r.Str(row, "Durum") is { } st
                ? StatusByLabel.GetValueOrDefault(Key(st)) is var parsed && StatusByLabel.ContainsKey(Key(st)) ? parsed
                    : throw new FormatException($"“Durum” Planlandı, Yüklendi, Yolda, Teslim Edildi veya İptal olmalı: {st}")
                : delivery != null ? TripStatus.Delivered : TripStatus.Planned;
            var req = new TripSaveRequest(customerId ?? 0, vehicle?.Id ?? 0, driverId ?? 0, r.Str(row, "Yükleme Adresi") ?? "",
                r.Str(row, "Teslim Adresi") ?? "", loading ?? default, delivery, r.Str(row, "Açıklama"), r.Dec(row, "Araç Maliyeti") ?? 0,
                r.Dec(row, "Satış Fiyatı") ?? 0, r.Str(row, "Müşteri Ref No"), r.Str(row, "Yük Cinsi"), null, null, null, null,
                r.Str(row, "Yükleme İli"), r.Str(row, "Teslim İli"));
            if (loading == null) ctx.Errors.Add(new ImportRowError(n, "Yükleme tarihi zorunlu."));
            if (!Validate(tripValidator, req, n, ctx.Errors) || loading == null) return Task.CompletedTask;

            // Aynı gün, aynı araç ve güzergâhta aynı fiyata birden çok sefer olabilir; açıklama (ör. sevkiyat no) onları ayırır.
            var key = (req.LoadingDate, req.CustomerId, req.VehicleId, Key(req.DeliveryAddress), Money.Round(req.SalePrice), Key(Clean(req.Description) ?? ""));
            if (!existing.Add(key))
            {
                ctx.Skip(n, $"{Formatters.Date(req.LoadingDate)} {plate} → {req.DeliveryAddress} seferi");
                return Task.CompletedTask;
            }
            var trip = new Trip
            {
                CustomerId = req.CustomerId, VehicleId = req.VehicleId, DriverId = req.DriverId, LoadingAddress = req.LoadingAddress.Trim(),
                DeliveryAddress = req.DeliveryAddress.Trim(), LoadingDate = req.LoadingDate,
                DeliveryDate = req.DeliveryDate ?? (status == TripStatus.Delivered ? req.LoadingDate : null),
                Description = Clean(req.Description), VehicleCost = Money.Round(req.VehicleCost), SalePrice = Money.Round(req.SalePrice),
                Status = status, CustomerReference = Clean(req.CustomerReference), CargoType = Clean(req.CargoType),
                LoadingCity = Cities.Normalize(req.LoadingCity), DeliveryCity = Cities.Normalize(req.DeliveryCity),
                TrailerPlate = vehicle!.TrailerPlate, CarrierSupplierId = vehicle.Ownership == VehicleOwnership.Rented ? vehicle.SupplierId : null,
                IsLegacy = legacy,
            };
            trip.Events.Add(new TripEvent { Status = status, Source = TripEventSource.Import, OccurredAt = now, RecordedAt = now, Note = legacy ? "Eski sistemden aktarıldı" : "Excel aktarımı" });
            db.Trips.Add(trip);
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task<Dictionary<string, int>> CustomerIdsAsync(CancellationToken ct)
    {
        var map = new Dictionary<string, int>();
        foreach (var c in await db.Customers.Select(c => new { c.Id, c.Title, c.TaxNumber }).ToListAsync(ct))
        {
            map.TryAdd(Key(c.Title), c.Id);
            if (c.TaxNumber != null) map.TryAdd(c.TaxNumber, c.Id);
        }
        return map;
    }

    /// <summary>Müşteriyi ünvanla ya da VKN/TCKN ile bulur.</summary>
    private static int? FindCustomer(Dictionary<string, int> map, string? name, int row, Ctx ctx) =>
        name != null && map.TryGetValue(name.Trim(), out var id) ? id : Lookup(map, name, "Müşteri", row, ctx);

    private static decimal Positive(decimal? amount, string col) =>
        amount is > 0 ? amount.Value : throw new FormatException($"“{col}” sıfırdan büyük olmalı.");

    /// <summary>Tevkifat "2/10" biçimindedir: pay 0..10, payda tam olarak 10. "2" tek başına 2/10 sayılır; "2/5" ya da "2/foo" reddedilir.</summary>
    private static int ParseTenths(string w)
    {
        var parts = w.Split('/');
        var bad = new FormatException($"“Tevkifat” 2/10 gibi yazılmalı (payda 10 olmalı): {w}");
        if (parts.Length > 2 || !int.TryParse(parts[0].Trim(), out var num) || num is < 0 or > 10) throw bad;
        if (parts.Length == 2 && (!int.TryParse(parts[1].Trim(), out var den) || den != 10)) throw bad;
        return num;
    }

    private static PaymentMethod Method(string? s) => s == null ? PaymentMethod.BankTransfer : Key(s) switch
    {
        "NAKİT" or "NAKIT" or "KASA" => PaymentMethod.Cash,
        "HAVALE" or "EFT" or "HAVALE/EFT" or "BANKA" => PaymentMethod.BankTransfer,
        "KREDİ KARTI" or "KREDI KARTI" or "KART" or "POS" => PaymentMethod.CreditCard,
        "ÇEK" or "CEK" => PaymentMethod.Check,
        "SENET" => PaymentMethod.PromissoryNote,
        _ => throw new FormatException($"“Yöntem” Nakit, Havale/EFT, Kredi Kartı, Çek veya Senet olmalı: {s}"),
    };

    private static DateOnly Need(DateOnly? d, string col) => d ?? throw new FormatException($"“{col}” zorunlu.");

    /// <summary>Eski paneldeki iş talepleri (henüz sevk edilmemiş ya da iptal edilmiş olanlar).</summary>
    private async Task JobRequestsAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var customers = await CustomerIdsAsync(ct);
        var existing = (await db.JobRequests.Select(j => new { j.Date, j.CustomerId, j.LoadingAddress, j.DeliveryAddress }).ToListAsync(ct))
            .Select(j => (j.Date, j.CustomerId, Key(j.LoadingAddress), Key(j.DeliveryAddress))).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var before = ctx.Errors.Count;
            var customerId = FindCustomer(customers, r.Str(row, "Müşteri"), n, ctx);
            if (r.Str(row, "Müşteri") == null) ctx.Errors.Add(new ImportRowError(n, "Müşteri zorunlu."));
            var loading = r.Str(row, "Yükleme Yeri");
            var delivery = r.Str(row, "İndirme Yeri");
            if (loading == null || delivery == null) ctx.Errors.Add(new ImportRowError(n, "Yükleme ve indirme yeri zorunlu."));
            if (ctx.Errors.Count > before) return Task.CompletedTask;
            var date = Need(r.Date(row, "Tarih"), "Tarih");
            var status = r.Str(row, "Durum") is { } st ? Key(st) switch
            {
                "BEKLİYOR" or "BEKLIYOR" or "AÇIK" or "ACIK" => JobRequestStatus.Pending,
                "İPTAL" or "IPTAL" => JobRequestStatus.Cancelled,
                _ => throw new FormatException($"“Durum” Bekliyor veya İptal olmalı: {st}"),
            } : JobRequestStatus.Pending;
            if (!existing.Add((date, customerId!.Value, Key(loading!), Key(delivery!))))
            {
                ctx.Skip(n, $"{Formatters.Date(date)} {loading} → {delivery} talebi");
                return Task.CompletedTask;
            }
            db.JobRequests.Add(new JobRequest
            {
                CustomerId = customerId.Value, Date = date, LoadingAddress = loading!.Trim(), DeliveryAddress = delivery!.Trim(),
                DeliveryWindow = r.Str(row, "Teslim Süresi"), CargoType = r.Str(row, "Yük Cinsi"), CargoQuantity = r.Dec(row, "Yük Miktarı"),
                VehicleType = r.Str(row, "Araç Cinsi"), SalePrice = r.Dec(row, "Müşteri Fiyatı"), CarrierPrice = r.Dec(row, "Sevkiyat Fiyatı"),
                Commission = r.Dec(row, "Komisyon"), DriverBonus = r.Dec(row, "Şoför Primi"), OtherExpense = r.Dec(row, "Masraf"),
                CustomerPays = YesNo(r.Str(row, "Ödeme Müşteride")) ?? false, LoadingDocumentNo = r.Str(row, "Yükleme Evrak No"),
                WaybillNo = r.Str(row, "İrsaliye No"), InvoiceFooterNote = r.Str(row, "Fatura Altı Not"), Description = r.Str(row, "Açıklama"),
                Status = status,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    /// <summary>
    /// Eski sistemde kesilmiş faturalar: numarası korunur, tek satır olarak yazılır, e-Fatura gönderilmez ve
    /// firmanın fatura numarası sayacı değişmez. Toplam verilmişse hesaplanan toplamla birebir tutmalı.
    /// </summary>
    private async Task InvoicesAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var customers = await CustomerIdsAsync(ct);
        var numbers = (await db.Invoices.IgnoreQueryFilters().Select(i => i.InvoiceNo).ToListAsync(ct)).Select(Key).ToHashSet();
        var terms = await db.Customers.Where(c => c.PaymentTermDays != null).ToDictionaryAsync(c => c.Id, c => c.PaymentTermDays!.Value, ct);
        var defaultTerm = await db.CompanySettings.Select(c => c.DefaultPaymentTermDays).FirstOrDefaultAsync(ct);
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var before = ctx.Errors.Count;
            var no = r.Str(row, "Fatura No");
            if (no == null) ctx.Errors.Add(new ImportRowError(n, "Fatura No zorunlu."));
            else if (no.Length > 20) ctx.Errors.Add(new ImportRowError(n, $"Fatura No en fazla 20 karakter olabilir: {no}"));
            var customerId = FindCustomer(customers, r.Str(row, "Müşteri"), n, ctx);
            if (r.Str(row, "Müşteri") == null) ctx.Errors.Add(new ImportRowError(n, "Müşteri zorunlu."));
            if (ctx.Errors.Count > before) return Task.CompletedTask;
            var date = Need(r.Date(row, "Tarih"), "Tarih");
            var subtotal = Positive(r.Dec(row, "Matrah"), "Matrah");
            var vatRate = r.Dec(row, "KDV Oranı") ?? 20;
            var tenths = r.Str(row, "Tevkifat") is { } w && Key(w) is not ("YOK" or "0" or "-") ? ParseTenths(w) : 0;
            InvoiceTotals totals;
            try { totals = InvoiceCalculator.Calculate([subtotal], vatRate, tenths); }
            catch (DomainException ex) { throw new FormatException(ex.Message); }
            if (r.Dec(row, "Toplam") is { } given && Math.Abs(given - totals.Total) > 0.01m)
                throw new FormatException($"Toplam tutmuyor: dosyada {given:N2}, hesaplanan {totals.Total:N2} (matrah + KDV − tevkifat).");
            var status = r.Str(row, "Durum") is { } st ? Key(st) switch
            {
                "KESİLDİ" or "KESILDI" or "AKTİF" or "AKTIF" => InvoiceStatus.Issued,
                "İPTAL" or "IPTAL" => InvoiceStatus.Cancelled,
                _ => throw new FormatException($"“Durum” Kesildi veya İptal olmalı: {st}"),
            } : InvoiceStatus.Issued;
            if (!numbers.Add(Key(no!)))
            {
                ctx.Skip(n, $"{no} numaralı fatura");
                return Task.CompletedTask;
            }
            var term = terms.TryGetValue(customerId!.Value, out var d) ? d : defaultTerm;
            var description = r.Str(row, "Açıklama") ?? "Eski sistemden aktarılan fatura";
            db.Invoices.Add(new Invoice
            {
                InvoiceNo = no!.Trim(), CustomerId = customerId.Value, Date = date, DueDate = r.Date(row, "Vade") ?? date.AddDays(term),
                Subtotal = totals.Subtotal, VatRate = vatRate, VatAmount = totals.VatAmount, WithholdingTenths = tenths,
                WithholdingAmount = totals.WithholdingAmount, Total = totals.Total, Status = status, Notes = "Eski sistemden aktarıldı.",
                Lines = [new InvoiceLine { Description = description, Amount = totals.Subtotal }],
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task PaymentsAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var customers = await CustomerIdsAsync(ct);
        var invoices = (await db.Invoices.Select(i => new { i.Id, i.InvoiceNo, i.CustomerId, i.Status }).ToListAsync(ct))
            .GroupBy(i => Key(i.InvoiceNo)).ToDictionary(g => g.Key, g => g.First());
        var existing = (await db.Payments.Select(p => new { p.Date, p.CustomerId, p.Amount, p.Description }).ToListAsync(ct))
            .Select(p => (p.Date, p.CustomerId, p.Amount, Key(p.Description ?? ""))).ToHashSet();
        var today = Clock.Today;
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var before = ctx.Errors.Count;
            var customerId = FindCustomer(customers, r.Str(row, "Müşteri"), n, ctx);
            if (r.Str(row, "Müşteri") == null) ctx.Errors.Add(new ImportRowError(n, "Müşteri zorunlu."));
            int? invoiceId = null;
            if (r.Str(row, "Fatura No") is { } no)
            {
                if (!invoices.TryGetValue(Key(no), out var inv)) ctx.Errors.Add(new ImportRowError(n, $"Fatura bulunamadı: “{no}”. Önce faturaları aktarın."));
                else if (customerId != null && inv.CustomerId != customerId) ctx.Errors.Add(new ImportRowError(n, $"{no} numaralı fatura başka bir müşterinin."));
                else if (inv.Status != InvoiceStatus.Issued) ctx.Errors.Add(new ImportRowError(n, $"{no} numaralı fatura kesilmiş durumda değil; tahsilat bağlanamaz."));
                else invoiceId = inv.Id;
            }
            if (ctx.Errors.Count > before) return Task.CompletedTask;
            var date = Need(r.Date(row, "Tarih"), "Tarih");
            var amount = Positive(r.Dec(row, "Tutar"), "Tutar");
            var method = Method(r.Str(row, "Yöntem"));
            var description = r.Str(row, "Açıklama");
            var instrument = method is PaymentMethod.Check or PaymentMethod.PromissoryNote;
            var due = instrument ? r.Date(row, "Çek Vadesi") : null;
            // Çek/senette vade zorunlu (portföy ve vade uyarıları buna dayanır); vadesiz kayıt sessizce "tahsil edildi" sayılmaz.
            if (instrument && due == null) { ctx.Errors.Add(new ImportRowError(n, "Çek/senet tahsilatında “Çek Vadesi” zorunlu.")); return Task.CompletedTask; }
            if (!existing.Add((date, customerId!.Value, amount, Key(description ?? ""))))
            {
                ctx.Skip(n, $"{Formatters.Date(date)} {amount:N2} TL tahsilat");
                return Task.CompletedTask;
            }
            db.Payments.Add(new Payment
            {
                CustomerId = customerId.Value, InvoiceId = invoiceId, Date = date, Amount = amount, Method = method, Description = description,
                InstrumentNo = instrument ? r.Str(row, "Çek/Senet No") : null, Bank = instrument ? r.Str(row, "Banka") : null, InstrumentDueDate = due,
                // Vadesi geçmiş eski çek/senet tahsil edilmiş sayılır; vadesi gelmemiş olan portföye girer.
                InstrumentStatus = instrument ? (due != null && due >= today ? InstrumentStatus.Portfolio : InstrumentStatus.Collected) : null,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task SupplierPaymentsAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var suppliers = await SupplierIdsAsync(ct);
        var existing = (await db.SupplierPayments.Select(p => new { p.Date, p.SupplierId, p.Amount, p.Description }).ToListAsync(ct))
            .Select(p => (p.Date, p.SupplierId, p.Amount, Key(p.Description ?? ""))).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var before = ctx.Errors.Count;
            if (r.Str(row, "Tedarikçi") == null) ctx.Errors.Add(new ImportRowError(n, "Tedarikçi zorunlu."));
            var supplierId = Lookup(suppliers, r.Str(row, "Tedarikçi"), "Tedarikçi", n, ctx);
            if (ctx.Errors.Count > before) return Task.CompletedTask;
            var date = Need(r.Date(row, "Tarih"), "Tarih");
            var amount = Positive(r.Dec(row, "Tutar"), "Tutar");
            var method = Method(r.Str(row, "Yöntem"));
            var description = r.Str(row, "Açıklama");
            if (!existing.Add((date, supplierId!.Value, amount, Key(description ?? ""))))
            {
                ctx.Skip(n, $"{Formatters.Date(date)} {amount:N2} TL ödeme");
                return Task.CompletedTask;
            }
            db.SupplierPayments.Add(new SupplierPayment { SupplierId = supplierId.Value, Date = date, Amount = amount, Method = method, Description = description });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private async Task CashAccountsAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var existing = (await db.CashAccounts.Select(a => a.Name).ToListAsync(ct)).Select(Key).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var name = r.Str(row, "Hesap Adı");
            if (name == null) { ctx.Errors.Add(new ImportRowError(n, "Hesap Adı zorunlu.")); return Task.CompletedTask; }
            var kind = r.Str(row, "Tür") is { } k ? Key(k) switch
            {
                "KASA" or "NAKİT" => CashAccountKind.Cash,
                "BANKA" => CashAccountKind.Bank,
                "POS" => CashAccountKind.Pos,
                "KREDİ KARTI" or "KREDI KARTI" => CashAccountKind.CreditCard,
                _ => (CashAccountKind?)null,
            } : CashAccountKind.Bank;
            if (kind == null) { ctx.Errors.Add(new ImportRowError(n, "Tür: Kasa, Banka, POS veya Kredi Kartı olmalı.")); return Task.CompletedTask; }
            var iban = r.Str(row, "IBAN");
            if (iban != null && !IbanValidator.IsValid(iban)) { ctx.Errors.Add(new ImportRowError(n, "IBAN geçersiz (TR ile başlayan 26 karakter).")); return Task.CompletedTask; }
            if (!existing.Add(Key(name)))
            {
                ctx.Skip(n, $"“{name}” hesabı");
                return Task.CompletedTask;
            }
            db.CashAccounts.Add(new CashAccount
            {
                Name = name.Trim(), Kind = kind.Value, Iban = IbanValidator.Normalize(iban),
                OpeningBalance = r.Dec(row, "Devir Bakiyesi") ?? 0, OpeningBalanceDate = r.Date(row, "Devir Tarihi"),
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private static ExpenseCategory Category(string s) => Key(s) switch
    {
        "YAKIT" or "AKARYAKIT" or "MAZOT" => ExpenseCategory.Fuel,
        "BAKIM" or "BAKIM/ONARIM" or "ONARIM" or "TAMİR" or "TAMIR" => ExpenseCategory.Maintenance,
        "OTOYOL" or "KÖPRÜ" or "KOPRU" or "OTOYOL/KÖPRÜ" or "HGS" or "OGS" => ExpenseCategory.Toll,
        "HARCIRAH" or "ŞOFÖR HARCIRAHI" or "SOFOR HARCIRAHI" => ExpenseCategory.DriverAllowance,
        "AVANS" or "ŞOFÖR AVANSI" or "SOFOR AVANSI" => ExpenseCategory.DriverAdvance,
        "LASTİK" or "LASTIK" => ExpenseCategory.Tire,
        "SİGORTA" or "SIGORTA" or "KASKO" or "SİGORTA/KASKO" => ExpenseCategory.Insurance,
        "VERGİ" or "VERGI" or "HARÇ" or "HARC" or "VERGİ/HARÇ" => ExpenseCategory.Tax,
        "DİĞER" or "DIGER" => ExpenseCategory.Other,
        _ => throw new FormatException($"“Kategori” tanınmadı: {s}. Yakıt, Bakım, Otoyol, Harcırah, Avans, Lastik, Sigorta, Vergi veya Diğer yazın."),
    };

    private async Task ExpensesAsync(List<IXLRow> rows, Ctx ctx, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.ToDictionaryAsync(v => v.Plate, v => v.Id, ct);
        var drivers = (await db.Drivers.Select(d => new { d.Id, d.FullName }).ToListAsync(ct)).GroupBy(d => Key(d.FullName)).ToDictionary(g => g.Key, g => g.First().Id);
        var suppliers = await SupplierIdsAsync(ct);
        var existing = (await db.Expenses.Select(e => new { e.Date, e.Category, e.Amount, e.VehicleId, e.Description }).ToListAsync(ct))
            .Select(e => (e.Date, e.Category, e.Amount, e.VehicleId, Key(e.Description ?? ""))).ToHashSet();
        var r = ctx.R;
        await EachAsync(rows, ctx, (row, n) =>
        {
            var before = ctx.Errors.Count;
            int? vehicleId = null;
            if (r.Str(row, "Plaka") is { } plateText)
            {
                if (Formatters.NormalizePlate(plateText) is { } plate && vehicles.TryGetValue(plate, out var vid)) vehicleId = vid;
                else ctx.Errors.Add(new ImportRowError(n, $"Araç bulunamadı: “{plateText}”. Önce araçları aktarın."));
            }
            var driverId = Lookup(drivers, r.Str(row, "Şoför"), "Şoför", n, ctx);
            var supplierId = Lookup(suppliers, r.Str(row, "Tedarikçi"), "Tedarikçi", n, ctx);
            var onCredit = YesNo(r.Str(row, "Vadeli")) ?? false;
            if (onCredit && r.Str(row, "Tedarikçi") == null) ctx.Errors.Add(new ImportRowError(n, "Vadeli giderde Tedarikçi zorunlu."));
            if (r.Str(row, "Kategori") == null) ctx.Errors.Add(new ImportRowError(n, "Kategori zorunlu."));
            if (ctx.Errors.Count > before) return Task.CompletedTask;
            var date = Need(r.Date(row, "Tarih"), "Tarih");
            var category = Category(r.Str(row, "Kategori")!);
            var amount = Positive(r.Dec(row, "Tutar"), "Tutar");
            // Avans şoför hesabına işlenir; şoförsüz avans hiçbir hesaba düşmez (normal gider kuralının aynısı).
            if (category == ExpenseCategory.DriverAdvance && driverId == null)
            {
                ctx.Errors.Add(new ImportRowError(n, "Şoför avansında “Şoför” zorunlu."));
                return Task.CompletedTask;
            }
            var description = r.Str(row, "Açıklama");
            if (!existing.Add((date, category, amount, vehicleId, Key(description ?? ""))))
            {
                ctx.Skip(n, $"{Formatters.Date(date)} {amount:N2} TL gider");
                return Task.CompletedTask;
            }
            db.Expenses.Add(new Expense
            {
                Date = date, Category = category, Amount = amount, VehicleId = vehicleId, DriverId = driverId, SupplierId = supplierId,
                IsOnCredit = onCredit, Liters = category == ExpenseCategory.Fuel ? r.Dec(row, "Litre") : null, Odometer = r.Int(row, "Km"),
                Description = description,
            });
            ctx.Created++;
            return Task.CompletedTask;
        });
    }

    private static bool Validate<T>(IValidator<T> validator, T req, int row, List<ImportRowError> errors)
    {
        var result = validator.Validate(req);
        foreach (var e in result.Errors) errors.Add(new ImportRowError(row, e.ErrorMessage));
        return result.IsValid;
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string Normalize(string s) =>
        new string(s.Trim().ToLower(Tr).Where(char.IsLetterOrDigit).ToArray());

    private class RowReader(Dictionary<string, int> header)
    {
        private IXLCell? Cell(IXLRow row, string col) =>
            header.TryGetValue(Normalize(col), out var i) ? row.Cell(i) : null;

        public string? Str(IXLRow row, string col)
        {
            var c = Cell(row, col);
            if (c == null || c.IsEmpty()) return null;
            // Excel sayıya çevirmişse (VKN, telefon) bilimsel gösterim olmasın.
            var s = c.DataType == XLDataType.Number ? c.GetDouble().ToString("0", CultureInfo.InvariantCulture) : c.GetString();
            return string.IsNullOrWhiteSpace(s) ? null : s.Trim();
        }

        public decimal? Dec(IXLRow row, string col)
        {
            var c = Cell(row, col);
            if (c == null || c.IsEmpty()) return null;
            if (c.DataType == XLDataType.Number) return Money.Round((decimal)c.GetDouble());
            var s = c.GetString().Replace("TL", "").Replace("₺", "").Trim();
            if (decimal.TryParse(s, NumberStyles.Number, Tr, out var tr)) return Money.Round(tr);
            if (decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var inv)) return Money.Round(inv);
            throw new FormatException($"“{col}” sayı olmalı: {s}");
        }

        public int? Int(IXLRow row, string col) => Dec(row, col) is { } d ? (int)d : null;

        public DateOnly? Date(IXLRow row, string col)
        {
            var c = Cell(row, col);
            if (c == null || c.IsEmpty()) return null;
            if (c.DataType == XLDataType.DateTime) return DateOnly.FromDateTime(c.GetDateTime());
            if (c.DataType == XLDataType.Number) return DateOnly.FromDateTime(DateTime.FromOADate(c.GetDouble()));
            var s = c.GetString().Trim();
            if (DateOnly.TryParseExact(s, ["dd.MM.yyyy", "d.M.yyyy", "dd/MM/yyyy", "yyyy-MM-dd"], Tr, DateTimeStyles.None, out var d)) return d;
            throw new FormatException($"“{col}” tarih olmalı (gg.aa.yyyy): {s}");
        }
    }
}
