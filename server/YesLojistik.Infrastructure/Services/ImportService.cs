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
/// Excel'den toplu tedarikçi/müşteri/şoför/araç/sefer aktarımı. Önce <c>dryRun</c> ile kontrol edilir; hata yoksa kaydedilir.
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
            "Yük Cinsi", "Müşteri Ref No", "Araç Maliyeti", "Satış Fiyatı", "Durum", "Açıklama"],
    };

    /// <summary>Başlıkta bulunması zorunlu sütunlar.</summary>
    private static readonly Dictionary<string, string[]> Required = new()
    {
        ["suppliers"] = ["Ünvan"],
        ["customers"] = ["Ünvan"],
        ["drivers"] = ["Ad Soyad"],
        ["vehicles"] = ["Plaka", "Araç Tipi"],
        ["trips"] = ["Yükleme Tarihi", "Müşteri", "Plaka", "Şoför", "Yükleme Adresi", "Teslim Adresi"],
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
            new DateTime(2026, 9, 2), "Mobilya, 20 palet", "4500123", 18000m, 25000m, "Teslim Edildi", ""],
    };

    private static readonly Dictionary<string, string> Notes = new()
    {
        ["suppliers"] = "Zorunlu: Ünvan. Tür: Taşeron, Servis, Akaryakıt veya Diğer (boşsa Taşeron). Devir Borcu: firmanın bu tedarikçiye borcu.",
        ["customers"] = "Zorunlu: Ünvan. e-Fatura Mükellefi: Evet/Hayır. Vade Gün boşsa firma varsayılanı kullanılır.",
        ["drivers"] = "Zorunlu: Ad Soyad. Tedarikçi: taşeronun şoförüyse tedarikçi ünvanı (önce tedarikçileri aktarın); kendi şoförünüzse boş.",
        ["vehicles"] = "Zorunlu: Plaka, Araç Tipi. Sahiplik: Özmal veya Kiralık. Kiralıksa Araç Sahibi (tedarikçi ünvanı) zorunlu; önce tedarikçileri aktarın.",
        ["trips"] = "Zorunlu: Yükleme Tarihi, Müşteri, Plaka, Şoför, Yükleme Adresi, Teslim Adresi. Müşteri, plaka ve şoför sistemde kayıtlı olmalı " +
            "(önce onları aktarın). Durum: Planlandı, Yüklendi, Yolda, Teslim Edildi, İptal (boşsa teslim tarihi varsa Teslim Edildi). " +
            "Aynı tarih, müşteri, plaka, teslim adresi ve satış fiyatına sahip sefer zaten varsa satır atlanır.",
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
        info.Cell(4, 1).Value = "Aktarım sırası: 1 Tedarikçiler → 2 Müşteriler → 3 Şoförler → 4 Araçlar → 5 Seferler.";
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
        var existing = (await db.Trips.Select(t => new { t.LoadingDate, t.CustomerId, t.VehicleId, t.DeliveryAddress, t.SalePrice }).ToListAsync(ct))
            .Select(t => (t.LoadingDate, t.CustomerId, t.VehicleId, Key(t.DeliveryAddress), t.SalePrice)).ToHashSet();
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

            var key = (req.LoadingDate, req.CustomerId, req.VehicleId, Key(req.DeliveryAddress), Money.Round(req.SalePrice));
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
            };
            trip.Events.Add(new TripEvent { Status = status, Source = TripEventSource.Import, OccurredAt = now, RecordedAt = now, Note = "Excel aktarımı" });
            db.Trips.Add(trip);
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
