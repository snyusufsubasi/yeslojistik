using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.Data;

/// <summary>SaveChanges sırasında değişiklikleri işlem geçmişine çevirir.</summary>
internal static class AuditTrail
{
    /// <summary>Sık değişen ya da gizli alanlar kayda girmez.</summary>
    private static readonly HashSet<string> Ignored =
    [
        nameof(BaseEntity.CreatedAt), nameof(BaseEntity.UpdatedAt), nameof(BaseEntity.CreatedBy),
        nameof(User.PasswordHash), nameof(User.LastLoginAt), nameof(User.FailedLoginCount),
        nameof(Vehicle.LastLatitude), nameof(Vehicle.LastLongitude), nameof(Vehicle.LastSpeedKmh), nameof(Vehicle.LastLocationAt),
        nameof(Trip.TrackingToken), nameof(CompanySettings.LogoDataUrl), nameof(CompanySettings.LastDigestDate), nameof(CompanySettings.LastBackupAt), nameof(CompanySettings.LicenseKey),
        nameof(TripAttachment.StoragePath), nameof(Expense.ReceiptPath), nameof(Expense.ReceiptContentType),
        nameof(FleetDocument.FilePath), nameof(FleetDocument.FileContentType), nameof(Expense.ReviewedAt),
    ];

    private static readonly Dictionary<string, string> Names = new()
    {
        ["Status"] = "Durum", ["SalePrice"] = "Satış fiyatı", ["VehicleCost"] = "Araç maliyeti", ["LoadingAddress"] = "Yükleme",
        ["DeliveryAddress"] = "Teslimat", ["LoadingDate"] = "Yükleme tarihi", ["DeliveryDate"] = "Teslim tarihi", ["Description"] = "Açıklama",
        ["CustomerId"] = "Müşteri", ["VehicleId"] = "Araç", ["DriverId"] = "Şoför", ["InvoiceId"] = "Fatura", ["Amount"] = "Tutar",
        ["Date"] = "Tarih", ["DueDate"] = "Vade", ["Total"] = "Toplam", ["Method"] = "Yöntem", ["Title"] = "Ünvan", ["Phone"] = "Telefon",
        ["Email"] = "E-posta", ["Address"] = "Adres", ["TaxNumber"] = "VKN/TCKN", ["TaxOffice"] = "Vergi dairesi", ["Plate"] = "Plaka",
        ["Km"] = "Km", ["FullName"] = "Ad soyad", ["Role"] = "Rol", ["IsActive"] = "Aktif", ["OpeningBalance"] = "Devir bakiyesi",
        ["NextInvoiceNumber"] = "Sıradaki fatura no", ["Category"] = "Kategori", ["Liters"] = "Litre", ["Odometer"] = "Km",
        ["NextMaintenanceDate"] = "Sonraki bakım", ["InspectionExpiry"] = "Muayene", ["InsuranceExpiry"] = "Sigorta", ["Notes"] = "Not",
        ["Kind"] = "Tür", ["City"] = "İl", ["District"] = "İlçe", ["Iban"] = "IBAN", ["ContactName"] = "Yetkili", ["PaymentTermDays"] = "Vade (gün)",
        ["Ownership"] = "Sahiplik", ["SupplierId"] = "Tedarikçi", ["TrailerPlate"] = "Dorse", ["CustomerReference"] = "Müşteri ref. no",
        ["CargoType"] = "Yük cinsi", ["CargoWeightKg"] = "Ağırlık (kg)", ["CargoQuantity"] = "Miktar", ["CargoUnit"] = "Birim",
        ["LoadingCity"] = "Yükleme ili", ["DeliveryCity"] = "Teslim ili", ["LoadingContact"] = "Yüklemede yetkili", ["DeliveryContact"] = "Teslimde yetkili",
        ["CarrierSupplierId"] = "Taşeron", ["CarrierInvoiceNo"] = "Taşeron fatura no", ["CarrierInvoiceDate"] = "Taşeron fatura tarihi",
        ["ReceivedBy"] = "Teslim alan", ["IsOnCredit"] = "Vadeli", ["TripId"] = "Sefer", ["DeliveredAt"] = "Teslim anı", ["IsEInvoiceUser"] = "e-Fatura mükellefi", ["EInvoiceAlias"] = "PK etiketi",
        ["DeliveryWindow"] = "Teslim süresi", ["VehicleType"] = "Araç cinsi", ["CarrierPrice"] = "Sevkiyat fiyatı", ["Commission"] = "Komisyon", ["DriverBonus"] = "Şoför primi", ["OtherExpense"] = "Masraf", ["CustomerPays"] = "Ödeme müşteride", ["LoadingDocumentNo"] = "Yükleme evrak no", ["WaybillNo"] = "İrsaliye no", ["InvoiceFooterNote"] = "Fatura altı not", ["JobRequestId"] = "İş talebi",
        ["Scenario"] = "e-Fatura senaryosu", ["TypeCode"] = "Fatura tipi", ["Ettn"] = "ETTN", ["EInvoiceNo"] = "e-Fatura no", ["EInvoiceStatus"] = "e-Fatura durumu",
        ["EInvoiceMessage"] = "e-Fatura mesajı", ["EInvoiceSentAt"] = "e-Fatura gönderim", ["WithholdingCode"] = "Tevkifat kodu", ["EInvoiceEnabled"] = "e-Fatura açık",
        ["EInvoiceSeriesPrefix"] = "e-Fatura seri", ["EArchiveSeriesPrefix"] = "e-Arşiv seri", ["DefaultScenario"] = "Varsayılan senaryo", ["SenderAlias"] = "GB etiketi",
        ["FailedLoginCount"] = "Hatalı giriş sayısı", ["LockoutUntil"] = "Kilit bitişi", ["PaidBy"] = "Ödeyen", ["ApprovalStatus"] = "Onay", ["LocationConsentAt"] = "Konum izni", ["LocationConsentVersion"] = "İzin metni sürümü",
        ["RequireDeliveryPhoto"] = "Teslimde fotoğraf zorunlu", ["RequireDeliverySignature"] = "Teslimde imza zorunlu", ["ClientRequestId"] = "İstek kimliği",
        ["MersisNo"] = "MERSİS no", ["TradeRegistryNo"] = "Ticaret sicil no", ["Website"] = "Web sitesi",
        ["RejectionReason"] = "Ret gerekçesi", ["ReviewedBy"] = "Onaylayan", ["NextMaintenanceKm"] = "Sonraki bakım km", ["Direction"] = "Yön",
        ["Note"] = "Not", ["OwnerType"] = "Belge sahibi", ["OwnerId"] = "Sahip", ["Type"] = "Tür", ["No"] = "Belge no", ["IssueDate"] = "Veriliş",
        ["ExpiryDate"] = "Bitiş", ["CashAccountId"] = "Kasa/Banka", ["InstrumentNo"] = "Çek/Senet no", ["Bank"] = "Banka",
        ["InstrumentDueDate"] = "Çek/Senet vadesi", ["InstrumentStatus"] = "Çek/Senet durumu", ["EndorsedSupplierPaymentId"] = "Ciro ödemesi",
        ["EndorsedFromPaymentId"] = "Ciro edilen tahsilat", ["CreditLimit"] = "Risk limiti", ["Name"] = "Ad", ["FromAccountId"] = "Çıkış hesabı", ["ToAccountId"] = "Giriş hesabı", ["Cost"] = "Tutar", ["NextDueKm"] = "Sonraki bakım km", ["NextDueDate"] = "Sonraki bakım tarihi", ["ExpenseId"] = "Gider",
        ["DeliveryDocumentApproved"] = "Teslim evrakı onayı", ["DeliveryDocumentNo"] = "Teslim evrak no", ["TripIds"] = "Seferler",
    };

    public static bool Tracks(EntityEntry e) =>
        e.Entity is (BaseEntity or CompanySettings) and not VehicleLocation
        && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted;

    public record Pending(EntityEntry Entry, string Action, string? Changes);

    public static Pending? Describe(EntityEntry e)
    {
        if (e.State == EntityState.Added) return new Pending(e, "Created", null);
        var deleted = e.State == EntityState.Deleted
            || (e.Entity is BaseEntity && e.Property(nameof(BaseEntity.IsDeleted)) is { IsModified: true, CurrentValue: true, OriginalValue: false });
        if (deleted) return new Pending(e, "Deleted", null);

        var changes = e.Properties
            .Where(p => p.IsModified && !Ignored.Contains(p.Metadata.Name) && !Equals(p.OriginalValue, p.CurrentValue))
            .Select(p => $"{Names.GetValueOrDefault(p.Metadata.Name, p.Metadata.Name)}: {FormatValue(p.Metadata.Name, p.OriginalValue)} → {FormatValue(p.Metadata.Name, p.CurrentValue)}")
            .ToList();
        return changes.Count == 0 ? null : new Pending(e, "Updated", Truncate(string.Join("; ", changes), 2000));
    }

    public static AuditLog ToLog(Pending p, DateTime at, int? userId, string? userName) => new()
    {
        At = at, UserId = userId, UserName = userName ?? "sistem", Action = p.Action,
        EntityType = p.Entry.Entity.GetType().Name,
        EntityId = (int)(p.Entry.Property("Id").CurrentValue ?? 0),
        Label = Truncate(Label(p.Entry.Entity), 200),
        Changes = p.Changes,
    };

    private static string? Label(object entity) => entity switch
    {
        Trip t => $"{t.LoadingAddress} → {t.DeliveryAddress} ({t.LoadingDate:dd.MM.yyyy})",
        Invoice i => i.InvoiceNo,
        Customer c => c.Title,
        Vehicle v => v.Plate,
        Driver d => d.FullName,
        Supplier s => s.Title,
        SupplierPayment sp => $"{sp.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ödeme ({sp.Date:dd.MM.yyyy})",
        Payment p => $"{p.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ({p.Date:dd.MM.yyyy})",
        Expense x => $"{EnumLabel(x.Category)} {x.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL",
        DriverSettlement ds => $"{EnumLabel(ds.Direction)} {ds.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ({ds.Date:dd.MM.yyyy})",
        FleetDocument fd => $"{EnumLabel(fd.Type)}{(fd.No != null ? " " + fd.No : "")}",
        CashAccount ca => ca.Name,
        Staff st => st.FullName,
        StaffTransaction stt => $"{EnumLabel(stt.Kind)} {stt.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ({stt.Date:dd.MM.yyyy})",
        RecurringPayment rp => rp.Title,
        CashTransfer ct => $"Virman {ct.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ({ct.Date:dd.MM.yyyy})",
        MaintenanceRecord mr => $"{EnumLabel(mr.Type)} bakım ({mr.Date:dd.MM.yyyy})",
        User u => u.Email,
        TripAttachment a => a.FileName,
        CompanySettings s => s.CompanyName,
        _ => null,
    };

    private static readonly Dictionary<string, string> EnumLabels = new()
    {
        ["VehicleStatus.Available"] = "Müsait", ["VehicleStatus.OnRoad"] = "Yolda", ["VehicleStatus.Maintenance"] = "Bakımda",
        ["InvoiceStatus.Draft"] = "Taslak", ["InvoiceStatus.Issued"] = "Kesildi", ["InvoiceStatus.Cancelled"] = "İptal",
        ["StaffTransactionKind.Advance"] = "Avans", ["StaffTransactionKind.Bonus"] = "Prim", ["StaffTransactionKind.SalaryPayment"] = "Maaş ödemesi",
        ["PaymentMethod.Cash"] = "Nakit", ["PaymentMethod.BankTransfer"] = "Havale/EFT", ["PaymentMethod.Check"] = "Çek",
        ["PaymentMethod.CreditCard"] = "Kredi kartı", ["PaymentMethod.PromissoryNote"] = "Senet",
        ["InstrumentStatus.Portfolio"] = "Portföyde", ["InstrumentStatus.InCollection"] = "Tahsilde", ["InstrumentStatus.Collected"] = "Tahsil edildi",
        ["InstrumentStatus.Endorsed"] = "Ciro edildi", ["InstrumentStatus.Bounced"] = "Karşılıksız", ["InstrumentStatus.Returned"] = "İade",
        ["CashAccountKind.Cash"] = "Kasa", ["CashAccountKind.Bank"] = "Banka", ["CashAccountKind.Pos"] = "POS", ["CashAccountKind.CreditCard"] = "Kredi kartı",
        ["UserRole.Admin"] = "Yönetici", ["UserRole.Operations"] = "Operasyon", ["UserRole.Accounting"] = "Muhasebe", ["UserRole.Driver"] = "Şoför",
        ["ExpenseCategory.Fuel"] = "Yakıt", ["ExpenseCategory.Maintenance"] = "Bakım/Onarım", ["ExpenseCategory.Toll"] = "Otoyol/Köprü",
        ["ExpenseCategory.DriverAllowance"] = "Şoför harcırahı", ["ExpenseCategory.DriverAdvance"] = "Şoför avansı",
        ["ExpenseCategory.Tire"] = "Lastik", ["ExpenseCategory.Insurance"] = "Sigorta/Kasko", ["ExpenseCategory.Tax"] = "Vergi/Harç",
        ["ExpenseCategory.Other"] = "Diğer",
        ["SupplierKind.Carrier"] = "Taşeron", ["SupplierKind.Service"] = "Servis", ["SupplierKind.Fuel"] = "Akaryakıt", ["SupplierKind.Other"] = "Diğer",
        ["ExpensePaidBy.Company"] = "Firma", ["ExpensePaidBy.Driver"] = "Şoför",
        ["ApprovalStatus.Approved"] = "Onaylı", ["ApprovalStatus.Pending"] = "Onay bekliyor", ["ApprovalStatus.Rejected"] = "Reddedildi",
        ["VehicleOwnership.Own"] = "Özmal", ["VehicleOwnership.Rented"] = "Kiralık",
        ["SettlementDirection.PaidToDriver"] = "Şoföre ödeme", ["SettlementDirection.ReceivedFromDriver"] = "Şoförden alınan",
        ["DocumentOwnerType.Vehicle"] = "Araç", ["DocumentOwnerType.Driver"] = "Şoför", ["DocumentOwnerType.Company"] = "Firma",
        ["DocumentType.Registration"] = "Ruhsat", ["DocumentType.TrafficInsurance"] = "Trafik Sigortası", ["DocumentType.Casco"] = "Kasko",
        ["DocumentType.Inspection"] = "Muayene", ["DocumentType.KCertificate"] = "K Belgesi", ["DocumentType.TachographCalibration"] = "Takograf Kalibrasyonu",
        ["DocumentType.Emission"] = "Egzoz Emisyon", ["DocumentType.License"] = "Ehliyet", ["DocumentType.Src"] = "SRC",
        ["DocumentType.Psychotechnic"] = "Psikoteknik", ["DocumentType.HealthReport"] = "Sağlık Raporu", ["DocumentType.Other"] = "Diğer",
        ["MaintenanceType.Periodic"] = "Periyodik", ["MaintenanceType.Oil"] = "Yağ", ["MaintenanceType.Tire"] = "Lastik",
        ["MaintenanceType.Brake"] = "Fren", ["MaintenanceType.Breakdown"] = "Arıza", ["MaintenanceType.Other"] = "Diğer",
        ["AttachmentKind.Photo"] = "Fotoğraf", ["AttachmentKind.Document"] = "Belge", ["AttachmentKind.Signature"] = "İmza",
    };

    private static string EnumLabel(Enum e) => e is TripStatus t
        ? Core.Domain.TripStatusRules.Label(t)
        : EnumLabels.GetValueOrDefault($"{e.GetType().Name}.{e}", e.ToString());

    /// <summary>Yabancı anahtarlar (CustomerId vb.) "#12" olarak yazılır.</summary>
    private static string FormatValue(string property, object? v) =>
        v is int id && property.EndsWith("Id", StringComparison.Ordinal) ? $"#{id}" : Format(v);

    private static string Format(object? v) => v switch
    {
        null => "—",
        Enum e => EnumLabel(e),
        string s when s.Length == 0 => "—",
        string s => Truncate(s, 120)!,
        decimal d => d.ToString("N2", CultureInfo.GetCultureInfo("tr-TR")),
        DateOnly d => d.ToString("dd.MM.yyyy"),
        DateTime d => d.ToString("dd.MM.yyyy HH:mm"),
        bool b => b ? "evet" : "hayır",
        IEnumerable<int> ids => Truncate(string.Join(", ", ids.Select(i => $"#{i}")), 120)!,
        _ => Convert.ToString(v, CultureInfo.InvariantCulture) ?? "",
    };

    private static string? Truncate(string? s, int max) => s is null || s.Length <= max ? s : s[..(max - 1)] + "…";
}
