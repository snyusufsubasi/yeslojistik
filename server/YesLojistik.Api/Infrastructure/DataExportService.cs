using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// "Verilerimi indir": ana tabloların her biri için okunur başlıklı bir CSV içeren ZIP üretir. CSV: UTF-8 (BOM'lu), ayırıcı ";",
/// sayılar Türkçe (virgüllü), tarihler gg.aa.yyyy; Excel'de çift tıklayınca doğru açılır. Şifre özeti, oturum anahtarı, iki adımlı
/// doğrulama anahtarı gibi gizli alanlar ve kullanıcı hesapları dışarı verilmez.
/// </summary>
public class DataExportService(AppDbContext db)
{
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly Regex NumberLike = new(@"^[+-]?[\d\s().,-]+$", RegexOptions.Compiled);

    /// <summary>ZIP içindeki dosya adları (test ve belge için sabit).</summary>
    public static readonly string[] FileNames =
    [
        "musteriler.csv", "tedarikciler.csv", "soforler.csv", "araclar.csv", "sevkiyatlar.csv", "faturalar.csv", "fatura-satirlari.csv",
        "alis-faturalari.csv", "tahsilatlar.csv", "tedarikci-odemeleri.csv", "giderler.csv", "kasa-ve-bankalar.csv", "personel.csv",
        "personel-hareketleri.csv", "OKUBENI.txt",
    ];

    /// <summary>ZIP'i yazar. Hazır dosyayı (arka planda silinen geçici dosya) açık bir akış olarak döner.</summary>
    public async Task<FileStream> BuildAsync(CancellationToken ct)
    {
        var tmp = new FileStream(Path.Combine(Path.GetTempPath(), $"export-{Guid.NewGuid():N}.zip"), FileMode.Create, FileAccess.ReadWrite,
            FileShare.None, 81920, FileOptions.DeleteOnClose | FileOptions.Asynchronous);
        try
        {
            using (var zip = new ZipArchive(tmp, ZipArchiveMode.Create, leaveOpen: true))
            {
                await TableAsync(zip, "musteriler.csv", Live(db.Customers).OrderBy(x => x.Id), Customers, ct);
                await TableAsync(zip, "tedarikciler.csv", Live(db.Suppliers).OrderBy(x => x.Id), Suppliers, ct);
                await TableAsync(zip, "soforler.csv", Live(db.Drivers).Include(x => x.Supplier).OrderBy(x => x.Id), Drivers, ct);
                await TableAsync(zip, "araclar.csv", Live(db.Vehicles).Include(x => x.Supplier).Include(x => x.DefaultDriver).OrderBy(x => x.Id), Vehicles, ct);
                await TableAsync(zip, "sevkiyatlar.csv", Live(db.Trips).Include(x => x.Customer).Include(x => x.Vehicle).Include(x => x.Driver)
                    .Include(x => x.CarrierSupplier).Include(x => x.Invoice).OrderBy(x => x.Id), Trips, ct);
                await TableAsync(zip, "faturalar.csv", Live(db.Invoices).Include(x => x.Customer).OrderBy(x => x.Id), Invoices, ct);
                await TableAsync(zip, "fatura-satirlari.csv", db.Set<InvoiceLine>().AsNoTracking().IgnoreQueryFilters().Include(x => x.Invoice).Where(x => !x.Invoice.IsDeleted).OrderBy(x => x.Id), InvoiceLines, ct);
                await TableAsync(zip, "alis-faturalari.csv", Live(db.PurchaseInvoices).Include(x => x.Supplier).OrderBy(x => x.Id), PurchaseInvoices, ct);
                await TableAsync(zip, "tahsilatlar.csv", Live(db.Payments).Include(x => x.Customer).Include(x => x.Invoice).Include(x => x.CashAccount).OrderBy(x => x.Id), Payments, ct);
                await TableAsync(zip, "tedarikci-odemeleri.csv", Live(db.SupplierPayments).Include(x => x.Supplier).Include(x => x.CashAccount).OrderBy(x => x.Id), SupplierPayments, ct);
                await TableAsync(zip, "giderler.csv", Live(db.Expenses).Include(x => x.Vehicle).Include(x => x.Driver).Include(x => x.Supplier).Include(x => x.CashAccount).OrderBy(x => x.Id), Expenses, ct);
                await TableAsync(zip, "kasa-ve-bankalar.csv", Live(db.CashAccounts).OrderBy(x => x.Id), CashAccounts, ct);
                await TableAsync(zip, "personel.csv", Live(db.Staff).OrderBy(x => x.Id), StaffRows, ct);
                await TableAsync(zip, "personel-hareketleri.csv", Live(db.StaffTransactions).Include(x => x.Staff).OrderBy(x => x.Id), StaffTx, ct);
                await ReadmeAsync(zip, ct);
            }
            tmp.Position = 0;
            return tmp;
        }
        catch
        {
            await tmp.DisposeAsync();
            throw;
        }
    }

    private static async Task ReadmeAsync(ZipArchive zip, CancellationToken ct)
    {
        var entry = zip.CreateEntry("OKUBENI.txt", CompressionLevel.Optimal);
        await using var w = new StreamWriter(entry.Open(), new UTF8Encoding(true));
        await w.WriteAsync(
            $"Veri dışa aktarma - {DateTime.Now:dd.MM.yyyy HH:mm}\r\n\r\n" +
            "Bu paketteki her dosya bir tablodur (müşteriler, sevkiyatlar, faturalar...). Dosyalar Excel'de çift tıklayarak açılır.\r\n" +
            "Ayırıcı noktalı virgüldür (;), karakter kodlaması UTF-8'dir. Tutarlar Türk lirasıdır ve virgüllü yazılır.\r\n" +
            "Güvenlik nedeniyle şifreler, oturum anahtarları ve iki adımlı doğrulama anahtarları pakete konmaz.\r\n" +
            "Bu dosyaları güvenli bir yerde saklayın; içinde müşteri ve şoför bilgileri vardır.\r\n");
    }

    /// <summary>Silinmemiş kayıtlar; bağlı kayıt (müşteri, araç...) silinmiş olsa bile adı satırda görünsün diye süzgeç elle uygulanır.</summary>
    private static IQueryable<T> Live<T>(DbSet<T> set) where T : BaseEntity =>
        set.AsNoTracking().IgnoreQueryFilters().Where(x => !x.IsDeleted);

    // --- Tablo tanımları ---
    private static IEnumerable<Col<Customer>> Customers => new Col<Customer>[]
    {
        new("Müşteri no", x => x.CustomerNo), new("Ünvan", x => x.Title), new("VKN/TCKN", x => x.TaxNumber), new("Vergi dairesi", x => x.TaxOffice),
        new("Telefon", x => x.Phone), new("E-posta", x => x.Email), new("Yetkili", x => x.ContactName), new("Adres", x => x.Address),
        new("İl", x => x.City), new("İlçe", x => x.District), new("Faks", x => x.Fax), new("Web sitesi", x => x.Website),
        new("e-Fatura mükellefi", x => x.IsEInvoiceUser), new("e-Fatura PK etiketi", x => x.EInvoiceAlias), new("Vade (gün)", x => x.PaymentTermDays),
        new("Risk limiti", x => x.CreditLimit), new("Devir bakiyesi", x => x.OpeningBalance), new("Devir tarihi", x => x.OpeningBalanceDate),
        new("Aktif", x => x.IsActive), new("Notlar", x => x.Notes), new("Kayıt tarihi", x => x.CreatedAt),
    };

    private static IEnumerable<Col<Supplier>> Suppliers => new Col<Supplier>[]
    {
        new("Tedarikçi no", x => x.SupplierNo), new("Ünvan", x => x.Title), new("Tür", x => ExportLabels.SupplierKind(x.Kind)),
        new("VKN/TCKN", x => x.TaxNumber), new("Vergi dairesi", x => x.TaxOffice), new("Telefon", x => x.Phone), new("E-posta", x => x.Email),
        new("Yetkili", x => x.ContactName), new("Adres", x => x.Address), new("İl", x => x.City), new("İlçe", x => x.District), new("IBAN", x => x.Iban),
        new("Vade (gün)", x => x.PaymentTermDays), new("Devir bakiyesi", x => x.OpeningBalance), new("Devir tarihi", x => x.OpeningBalanceDate),
        new("Aktif", x => x.IsActive), new("Notlar", x => x.Notes), new("Kayıt tarihi", x => x.CreatedAt),
    };

    private static IEnumerable<Col<Driver>> Drivers => new Col<Driver>[]
    {
        new("Ad soyad", x => x.FullName), new("Telefon", x => x.Phone), new("TC kimlik no", x => x.NationalId), new("Doğum yılı", x => x.BirthYear),
        new("Adres", x => x.Address), new("Ehliyet sınıfı", x => x.LicenseClass), new("Ehliyet no", x => x.LicenseNo),
        new("Ehliyet bitiş", x => x.LicenseExpiry), new("SRC bitiş", x => x.SrcExpiry), new("Psikoteknik bitiş", x => x.PsychotechnicExpiry),
        new("Taşeron", x => x.Supplier?.Title), new("Plaka", x => x.Plate), new("Yabancı uyruklu", x => x.IsForeign),
        new("Değerlendirme", x => ExportLabels.DriverRating(x.Rating)), new("Aktif", x => x.IsActive), new("Not", x => x.Note),
        new("Kayıt tarihi", x => x.CreatedAt),
    };

    private static IEnumerable<Col<Vehicle>> Vehicles => new Col<Vehicle>[]
    {
        new("Plaka", x => x.Plate), new("Araç cinsi", x => x.Type), new("Marka", x => x.Brand), new("Model", x => x.Model), new("Model yılı", x => x.ModelYear),
        new("Kilometre", x => x.Km), new("Durum", x => ExportLabels.VehicleStatus(x.Status)), new("Sahiplik", x => ExportLabels.Ownership(x.Ownership)),
        new("Araç sahibi (taşeron)", x => x.Supplier?.Title), new("Dorse plakası", x => x.TrailerPlate), new("Varsayılan şoför", x => x.DefaultDriver?.FullName),
        new("Kapasite", x => x.Capacity), new("Yakıt türü", x => x.FuelType), new("Ruhsat sahibi", x => x.RegistrationOwner),
        new("Muayene bitiş", x => x.InspectionExpiry), new("Sigorta bitiş", x => x.InsuranceExpiry), new("Kasko bitiş", x => x.CascoExpiry),
        new("Emisyon bitiş", x => x.EmissionExpiry), new("Son bakım", x => x.LastMaintenanceDate), new("Sonraki bakım", x => x.NextMaintenanceDate),
        new("Sonraki bakım km", x => x.NextMaintenanceKm), new("Kayıt tarihi", x => x.CreatedAt),
    };

    private static IEnumerable<Col<Trip>> Trips => new Col<Trip>[]
    {
        new("Sevkiyat no", x => x.Id), new("Müşteri", x => x.Customer.Title), new("Müşteri ref. no", x => x.CustomerReference),
        new("Plaka", x => x.Vehicle.Plate), new("Dorse", x => x.TrailerPlate), new("Şoför", x => x.Driver.FullName),
        new("Yükleme tarihi", x => x.LoadingDate), new("Teslim tarihi", x => x.DeliveryDate), new("Durum", x => TripStatusRules.Label(x.Status)),
        new("Yükleme adresi", x => x.LoadingAddress), new("Yükleme ili", x => x.LoadingCity), new("Teslimat adresi", x => x.DeliveryAddress),
        new("Teslim ili", x => x.DeliveryCity), new("Yük cinsi", x => x.CargoType), new("Ağırlık (kg)", x => x.CargoWeightKg), new("Miktar", x => x.CargoQuantity),
        new("Birim", x => x.CargoUnit), new("Satış fiyatı (KDV hariç)", x => x.SalePrice), new("Satış KDV oranı", x => x.SaleVatRate),
        new("Araç maliyeti (KDV hariç)", x => x.VehicleCost), new("Maliyet KDV oranı", x => x.CostVatRate), new("Komisyon", x => x.Commission),
        new("Ek masraf", x => x.ExtraCharge), new("Şoför primi", x => x.DriverBonus), new("Ödeme müşteride", x => x.CustomerPays),
        new("Taşeron", x => x.CarrierSupplier?.Title), new("Taşeron fatura no", x => x.CarrierInvoiceNo), new("Fatura no", x => x.Invoice?.InvoiceNo),
        new("İrsaliye no", x => x.WaybillNo), new("Teslim evrak no", x => x.DeliveryDocumentNo), new("Teslim alan", x => x.ReceivedBy),
        new("Mesafe (km)", x => x.DistanceKm), new("Açıklama", x => x.Description), new("Kayıt tarihi", x => x.CreatedAt),
    };

    private static IEnumerable<Col<Invoice>> Invoices => new Col<Invoice>[]
    {
        new("Fatura no", x => x.InvoiceNo), new("Müşteri", x => x.Customer.Title), new("Tarih", x => x.Date), new("Vade", x => x.DueDate),
        new("Ara toplam", x => x.Subtotal), new("KDV oranı", x => x.VatRate), new("KDV", x => x.VatAmount), new("Tevkifat (onda)", x => x.WithholdingTenths),
        new("Tevkifat tutarı", x => x.WithholdingAmount), new("Toplam", x => x.Total), new("Durum", x => InvoiceStatusLabel(x.Status)),
        new("e-Fatura senaryosu", x => x.Scenario?.ToString()), new("ETTN", x => x.Ettn?.ToString()), new("e-Fatura no", x => x.EInvoiceNo),
        new("e-Fatura durumu", x => x.EInvoiceStatus == EInvoiceStatus.None ? null : x.EInvoiceStatus.ToString()), new("Not", x => x.Notes),
    };

    private static IEnumerable<Col<InvoiceLine>> InvoiceLines => new Col<InvoiceLine>[]
    {
        new("Fatura no", x => x.Invoice.InvoiceNo), new("Açıklama", x => x.Description), new("Tutar", x => x.Amount), new("Sevkiyat no", x => x.TripId),
    };

    private static IEnumerable<Col<PurchaseInvoice>> PurchaseInvoices => new Col<PurchaseInvoice>[]
    {
        new("Fatura no", x => x.InvoiceNo), new("Tedarikçi", x => x.Supplier.Title), new("Tarih", x => x.Date), new("Vade", x => x.DueDate),
        new("Ara toplam", x => x.Subtotal), new("KDV", x => x.VatAmount), new("Tevkifat", x => x.WithholdingAmount), new("Toplam", x => x.Total),
        new("İptal", x => x.IsCancelled), new("İptal nedeni", x => x.CancelReason), new("Not", x => x.Notes),
    };

    private static IEnumerable<Col<Payment>> Payments => new Col<Payment>[]
    {
        new("Tarih", x => x.Date), new("Müşteri", x => x.Customer.Title), new("Tutar", x => x.Amount), new("Yöntem", x => MethodLabel(x.Method)),
        new("Fatura no", x => x.Invoice?.InvoiceNo), new("Kasa/Banka", x => x.CashAccount?.Name), new("Çek/Senet no", x => x.InstrumentNo),
        new("Banka", x => x.Bank), new("Çek/Senet vadesi", x => x.InstrumentDueDate), new("Çek/Senet durumu", x => x.InstrumentStatus?.ToString()),
        new("Açıklama", x => x.Description),
    };

    private static IEnumerable<Col<SupplierPayment>> SupplierPayments => new Col<SupplierPayment>[]
    {
        new("Tarih", x => x.Date), new("Tedarikçi", x => x.Supplier.Title), new("Tutar", x => x.Amount), new("Yöntem", x => MethodLabel(x.Method)),
        new("Sevkiyat no", x => x.TripId), new("Kasa/Banka", x => x.CashAccount?.Name), new("Açıklama", x => x.Description),
    };

    private static IEnumerable<Col<Expense>> Expenses => new Col<Expense>[]
    {
        new("Tarih", x => x.Date), new("Kategori", x => x.CategoryName ?? ExpenseLabel(x.Category)), new("Gider", x => x.Title), new("Tutar (KDV dahil)", x => x.Amount),
        new("KDV oranı", x => x.VatRate), new("Plaka", x => x.Vehicle?.Plate), new("Şoför", x => x.Driver?.FullName), new("Tedarikçi", x => x.Supplier?.Title),
        new("Sevkiyat no", x => x.TripId), new("Litre", x => x.Liters), new("Birim fiyat", x => x.UnitPrice), new("Km", x => x.Odometer),
        new("Vadeli", x => x.IsOnCredit), new("Ödeyen", x => x.PaidBy == ExpensePaidBy.Driver ? "Şoför" : "Firma"), new("Kasa/Banka", x => x.CashAccount?.Name),
        new("Onay", x => x.ApprovalStatus switch { ApprovalStatus.Pending => "Onay bekliyor", ApprovalStatus.Rejected => "Reddedildi", _ => "Onaylı" }),
        new("Açıklama", x => x.Description),
    };

    private static IEnumerable<Col<CashAccount>> CashAccounts => new Col<CashAccount>[]
    {
        new("Ad", x => x.Name), new("Tür", x => x.Kind switch { CashAccountKind.Bank => "Banka", CashAccountKind.Pos => "POS", CashAccountKind.CreditCard => "Kredi kartı", _ => "Kasa" }),
        new("IBAN", x => x.Iban), new("Devir bakiyesi", x => x.OpeningBalance), new("Devir tarihi", x => x.OpeningBalanceDate), new("Aktif", x => x.IsActive),
    };

    private static IEnumerable<Col<Staff>> StaffRows => new Col<Staff>[]
    {
        new("Ad soyad", x => x.FullName), new("TC kimlik no", x => x.NationalId), new("Telefon", x => x.Phone), new("İşe başlama", x => x.StartDate),
        new("Aylık maaş", x => x.MonthlySalary), new("Aktif", x => x.IsActive), new("Notlar", x => x.Notes),
    };

    private static IEnumerable<Col<StaffTransaction>> StaffTx => new Col<StaffTransaction>[]
    {
        new("Tarih", x => x.Date), new("Personel", x => x.Staff.FullName),
        new("Tür", x => x.Kind switch { StaffTransactionKind.Advance => "Avans", StaffTransactionKind.Bonus => "Prim", _ => "Maaş ödemesi" }),
        new("Tutar", x => x.Amount), new("Not", x => x.Note),
    };

    private static string InvoiceStatusLabel(InvoiceStatus s) => s switch { InvoiceStatus.Draft => "Taslak", InvoiceStatus.Cancelled => "İptal", _ => "Kesildi" };

    private static string MethodLabel(PaymentMethod m) => m switch
    {
        PaymentMethod.BankTransfer => "Havale/EFT", PaymentMethod.Check => "Çek", PaymentMethod.CreditCard => "Kredi kartı",
        PaymentMethod.PromissoryNote => "Senet", _ => "Nakit",
    };

    private static string ExpenseLabel(ExpenseCategory c) => c switch
    {
        ExpenseCategory.Fuel => "Yakıt", ExpenseCategory.Maintenance => "Bakım/Onarım", ExpenseCategory.Toll => "Otoyol/Köprü",
        ExpenseCategory.DriverAllowance => "Şoför harcırahı", ExpenseCategory.DriverAdvance => "Şoför avansı", ExpenseCategory.Tire => "Lastik",
        ExpenseCategory.Insurance => "Sigorta/Kasko", ExpenseCategory.Tax => "Vergi/Harç", _ => "Diğer",
    };

    // --- CSV yazımı ---
    private record Col<T>(string Header, Func<T, object?> Value);

    private static async Task TableAsync<T>(ZipArchive zip, string name, IQueryable<T> query, IEnumerable<Col<T>> columns, CancellationToken ct)
    {
        var cols = columns.ToList();
        var entry = zip.CreateEntry(name, CompressionLevel.Optimal);
        await using var w = new StreamWriter(entry.Open(), new UTF8Encoding(true), 65536);
        await w.WriteAsync(string.Join(';', cols.Select(c => Escape(c.Header))) + "\r\n");
        await foreach (var row in query.AsAsyncEnumerable().WithCancellation(ct))
            await w.WriteAsync(string.Join(';', cols.Select(c => Escape(Format(c.Value(row))))) + "\r\n");
    }

    private static string Format(object? v) => v switch
    {
        null => "",
        string s => Guard(s),
        bool b => b ? "Evet" : "Hayır",
        decimal d => d.ToString("0.00", Tr),
        double d => d.ToString("0.######", Tr),
        DateOnly d => d.ToString("dd.MM.yyyy", Tr),
        DateTime d => d.ToLocalTime().ToString("dd.MM.yyyy HH:mm", Tr),
        IFormattable f => f.ToString(null, Tr),
        _ => v.ToString() ?? "",
    };

    /// <summary>Excel'de formül gibi çalışabilecek metinlerin başına ' konur (CSV enjeksiyonu). Telefon ve sayılar etkilenmez.</summary>
    private static string Guard(string s)
    {
        if (s.Length == 0) return s;
        var c = s[0];
        if (c is '=' or '@' or '\t' or '\r') return "'" + s;
        if (c is '+' or '-' && !NumberLike.IsMatch(s)) return "'" + s;
        return s;
    }

    private static string Escape(string s) =>
        s.IndexOfAny([';', '"', '\n', '\r']) >= 0 ? "\"" + s.Replace("\"", "\"\"") + "\"" : s;
}
