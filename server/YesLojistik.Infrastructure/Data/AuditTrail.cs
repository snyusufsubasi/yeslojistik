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
        nameof(User.PasswordHash), nameof(User.LastLoginAt),
        nameof(Vehicle.LastLatitude), nameof(Vehicle.LastLongitude), nameof(Vehicle.LastSpeedKmh), nameof(Vehicle.LastLocationAt),
        nameof(Trip.TrackingToken), nameof(CompanySettings.LogoDataUrl), nameof(CompanySettings.LastDigestDate),
        nameof(TripAttachment.StoragePath),
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
        Payment p => $"{p.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL ({p.Date:dd.MM.yyyy})",
        Expense x => $"{EnumLabel(x.Category)} {x.Amount.ToString("N2", CultureInfo.GetCultureInfo("tr-TR"))} TL",
        User u => u.Email,
        TripAttachment a => a.FileName,
        CompanySettings s => s.CompanyName,
        _ => null,
    };

    private static readonly Dictionary<string, string> EnumLabels = new()
    {
        ["VehicleStatus.Available"] = "Müsait", ["VehicleStatus.OnRoad"] = "Yolda", ["VehicleStatus.Maintenance"] = "Bakımda",
        ["InvoiceStatus.Draft"] = "Taslak", ["InvoiceStatus.Issued"] = "Kesildi", ["InvoiceStatus.Cancelled"] = "İptal",
        ["PaymentMethod.Cash"] = "Nakit", ["PaymentMethod.BankTransfer"] = "Havale/EFT", ["PaymentMethod.Check"] = "Çek",
        ["PaymentMethod.CreditCard"] = "Kredi kartı",
        ["UserRole.Admin"] = "Yönetici", ["UserRole.Operations"] = "Operasyon", ["UserRole.Accounting"] = "Muhasebe", ["UserRole.Driver"] = "Şoför",
        ["ExpenseCategory.Fuel"] = "Yakıt", ["ExpenseCategory.Maintenance"] = "Bakım/Onarım", ["ExpenseCategory.Toll"] = "Otoyol/Köprü",
        ["ExpenseCategory.DriverAllowance"] = "Şoför harcırahı", ["ExpenseCategory.DriverAdvance"] = "Şoför avansı",
        ["ExpenseCategory.Tire"] = "Lastik", ["ExpenseCategory.Insurance"] = "Sigorta/Kasko", ["ExpenseCategory.Tax"] = "Vergi/Harç",
        ["ExpenseCategory.Other"] = "Diğer",
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
        _ => Convert.ToString(v, CultureInfo.InvariantCulture) ?? "",
    };

    private static string? Truncate(string? s, int max) => s is null || s.Length <= max ? s : s[..(max - 1)] + "…";
}
