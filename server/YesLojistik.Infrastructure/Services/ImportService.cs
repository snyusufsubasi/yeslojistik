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
/// Excel'den toplu müşteri/araç/şoför aktarımı. Önce <c>dryRun</c> ile kontrol edilir; hata yoksa kaydedilir.
/// Hatalı satır varsa hiçbir satır kaydedilmez (yarım aktarım olmasın).
/// </summary>
public class ImportService(AppDbContext db, IValidator<CustomerSaveRequest> customerValidator,
    IValidator<VehicleSaveRequest> vehicleValidator, IValidator<DriverSaveRequest> driverValidator)
{
    public const int MaxRows = 5000;
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    public static readonly Dictionary<string, string[]> Columns = new()
    {
        ["customers"] = ["Ünvan", "VKN/TCKN", "Vergi Dairesi", "Telefon", "E-posta", "Adres", "Not", "Devir Bakiyesi", "Devir Tarihi"],
        ["vehicles"] = ["Plaka", "Araç Tipi", "Marka", "Model", "Model Yılı", "Km", "Son Bakım", "Sonraki Bakım", "Muayene Bitiş", "Sigorta Bitiş"],
        ["drivers"] = ["Ad Soyad", "Telefon", "TC Kimlik No", "Ehliyet Sınıfı", "Ehliyet Bitiş", "SRC Bitiş", "Psikoteknik Bitiş"],
    };

    private static readonly Dictionary<string, object[]> Examples = new()
    {
        ["customers"] = ["Yıldız Mobilya", "1234567890", "Sultanbeyli", "0216 555 44 33", "info@yildizmobilya.com", "İstanbul / Sultanbeyli", "", 28114.50m, new DateTime(2026, 1, 1)],
        ["vehicles"] = ["34 VES 01", "Kamyon", "Ford", "Cargo", 2020, 420000, new DateTime(2026, 5, 12), new DateTime(2026, 11, 12), new DateTime(2027, 3, 1), new DateTime(2027, 1, 15)],
        ["drivers"] = ["Mehmet Yılmaz", "0532 111 22 33", "", "CE", new DateTime(2030, 1, 1), new DateTime(2028, 6, 1), new DateTime(2027, 6, 1)],
    };

    public static byte[] Template(string entity)
    {
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
        info.Cell(2, 1).Value = "Tarihler gg.aa.yyyy biçiminde olmalı. Zorunlu alanlar: " + entity switch
        {
            "customers" => "Ünvan.", "vehicles" => "Plaka, Araç Tipi.", _ => "Ad Soyad.",
        };
        info.Cell(3, 1).Value = "Sistemde zaten kayıtlı olanlar (aynı plaka / aynı ünvan veya VKN / aynı ad soyad) atlanır.";
        info.Column(1).Width = 110;
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<ImportResult> ImportAsync(string entity, Stream file, bool dryRun, CancellationToken ct = default)
    {
        if (!Columns.ContainsKey(entity)) throw new NotFoundException("Bilinmeyen aktarım türü.");
        XLWorkbook wb;
        try { wb = new XLWorkbook(file); }
        catch (Exception) { throw new DomainException("Dosya okunamadı. Lütfen şablondaki .xlsx dosyasını kullanın."); }
        using var _ = wb;
        var ws = wb.Worksheets.First();

        var header = ws.Row(1).CellsUsed().ToDictionary(c => Normalize(c.GetString()), c => c.Address.ColumnNumber);
        var missing = Columns[entity].Take(entity == "vehicles" ? 2 : 1).Where(c => !header.ContainsKey(Normalize(c))).ToList();
        if (missing.Count > 0) throw new DomainException($"Başlık satırında zorunlu sütun eksik: {string.Join(", ", missing)}. Şablonu kullanın.");

        var rows = ws.RowsUsed().Where(r => r.RowNumber() > 1 && !r.CellsUsed().All(c => string.IsNullOrWhiteSpace(c.GetString()))).ToList();
        if (rows.Count > MaxRows) throw new DomainException($"Tek seferde en fazla {MaxRows} satır aktarılabilir.");

        var reader = new RowReader(header);
        var errors = new List<ImportRowError>();
        var warnings = new List<string>();
        var created = 0;
        var skipped = 0;

        switch (entity)
        {
            case "customers":
            {
                var existing = await db.Customers.Select(c => new { c.Title, c.TaxNumber }).ToListAsync(ct);
                var titles = existing.Select(c => c.Title.ToUpper(Tr)).ToHashSet();
                var taxes = existing.Where(c => c.TaxNumber != null).Select(c => c.TaxNumber!).ToHashSet();
                foreach (var row in rows)
                {
                    var n = row.RowNumber();
                    try
                    {
                        var req = new CustomerSaveRequest(reader.Str(row, "Ünvan") ?? "", reader.Str(row, "VKN/TCKN"), reader.Str(row, "Vergi Dairesi"),
                            reader.Str(row, "Telefon"), reader.Str(row, "E-posta"), reader.Str(row, "Adres"), reader.Str(row, "Not"),
                            reader.Dec(row, "Devir Bakiyesi") ?? 0, reader.Date(row, "Devir Tarihi"));
                        if (!Validate(customerValidator, req, n, errors)) continue;
                        if (titles.Contains(req.Title.Trim().ToUpper(Tr)) || (req.TaxNumber != null && taxes.Contains(req.TaxNumber.Trim())))
                        {
                            warnings.Add($"Satır {n}: “{req.Title}” zaten kayıtlı, atlandı.");
                            skipped++;
                            continue;
                        }
                        titles.Add(req.Title.Trim().ToUpper(Tr));
                        if (req.TaxNumber != null) taxes.Add(req.TaxNumber.Trim());
                        db.Customers.Add(new Customer
                        {
                            Title = req.Title.Trim(), TaxNumber = Clean(req.TaxNumber), TaxOffice = Clean(req.TaxOffice),
                            Phone = Formatters.NormalizePhone(req.Phone), Email = Clean(req.Email)?.ToLowerInvariant(), Address = Clean(req.Address),
                            Notes = Clean(req.Notes), OpeningBalance = Money.Round(req.OpeningBalance),
                            OpeningBalanceDate = req.OpeningBalance > 0 ? req.OpeningBalanceDate ?? Clock.Today : null,
                        });
                        created++;
                    }
                    catch (FormatException ex) { errors.Add(new ImportRowError(n, ex.Message)); }
                }
                break;
            }
            case "vehicles":
            {
                var plates = (await db.Vehicles.Select(v => v.Plate).ToListAsync(ct)).ToHashSet();
                foreach (var row in rows)
                {
                    var n = row.RowNumber();
                    try
                    {
                        var req = new VehicleSaveRequest(reader.Str(row, "Plaka") ?? "", reader.Str(row, "Araç Tipi") ?? "", reader.Str(row, "Marka"),
                            reader.Str(row, "Model"), reader.Int(row, "Model Yılı"), reader.Int(row, "Km") ?? 0, reader.Date(row, "Son Bakım"),
                            reader.Date(row, "Sonraki Bakım"), reader.Date(row, "Muayene Bitiş"), reader.Date(row, "Sigorta Bitiş"),
                            VehicleStatus.Available, null);
                        if (!Validate(vehicleValidator, req, n, errors)) continue;
                        var plate = Formatters.NormalizePlate(req.Plate)!;
                        if (!plates.Add(plate))
                        {
                            warnings.Add($"Satır {n}: {plate} zaten kayıtlı, atlandı.");
                            skipped++;
                            continue;
                        }
                        db.Vehicles.Add(new Vehicle
                        {
                            Plate = plate, Type = req.Type.Trim(), Brand = Clean(req.Brand), Model = Clean(req.Model), ModelYear = req.ModelYear,
                            Km = req.Km, LastMaintenanceDate = req.LastMaintenanceDate, NextMaintenanceDate = req.NextMaintenanceDate,
                            InspectionExpiry = req.InspectionExpiry, InsuranceExpiry = req.InsuranceExpiry,
                        });
                        created++;
                    }
                    catch (FormatException ex) { errors.Add(new ImportRowError(n, ex.Message)); }
                }
                break;
            }
            default:
            {
                var names = (await db.Drivers.Select(d => d.FullName).ToListAsync(ct)).Select(x => x.ToUpper(Tr)).ToHashSet();
                foreach (var row in rows)
                {
                    var n = row.RowNumber();
                    try
                    {
                        var req = new DriverSaveRequest(reader.Str(row, "Ad Soyad") ?? "", reader.Str(row, "Telefon"), reader.Str(row, "TC Kimlik No"),
                            reader.Str(row, "Ehliyet Sınıfı"), reader.Date(row, "Ehliyet Bitiş"), reader.Date(row, "SRC Bitiş"),
                            reader.Date(row, "Psikoteknik Bitiş"), true);
                        if (!Validate(driverValidator, req, n, errors)) continue;
                        if (!names.Add(req.FullName.Trim().ToUpper(Tr)))
                        {
                            warnings.Add($"Satır {n}: {req.FullName} zaten kayıtlı, atlandı.");
                            skipped++;
                            continue;
                        }
                        db.Drivers.Add(new Driver
                        {
                            FullName = req.FullName.Trim(), Phone = Formatters.NormalizePhone(req.Phone), NationalId = Clean(req.NationalId),
                            LicenseClass = Clean(req.LicenseClass)?.ToUpperInvariant(), LicenseExpiry = req.LicenseExpiry, SrcExpiry = req.SrcExpiry,
                            PsychotechnicExpiry = req.PsychotechnicExpiry,
                        });
                        created++;
                    }
                    catch (FormatException ex) { errors.Add(new ImportRowError(n, ex.Message)); }
                }
                break;
            }
        }

        if (!dryRun && errors.Count == 0) await db.SaveChangesAsync(ct);
        else db.ChangeTracker.Clear();
        return new ImportResult(rows.Count, errors.Count == 0 ? created : 0, skipped, errors, warnings, dryRun || errors.Count > 0);
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
