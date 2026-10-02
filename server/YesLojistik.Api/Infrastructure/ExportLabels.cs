using YesLojistik.Core.Entities;

namespace YesLojistik.Api.Infrastructure;

/// <summary>Excel çıktılarında enum değerlerinin Türkçe karşılıkları (paneldeki etiketlerle aynı).</summary>
public static class ExportLabels
{
    public static string Active(bool active) => active ? "Aktif" : "Pasif";

    public static string SupplierKind(SupplierKind k) => k switch
    {
        Core.Entities.SupplierKind.Carrier => "Taşeron / Araç sahibi",
        Core.Entities.SupplierKind.Service => "Servis / Tamir",
        Core.Entities.SupplierKind.Fuel => "Akaryakıt",
        _ => "Diğer",
    };

    public static string VehicleStatus(VehicleStatus s) => s switch
    {
        Core.Entities.VehicleStatus.OnRoad => "Yolda",
        Core.Entities.VehicleStatus.Maintenance => "Bakımda",
        _ => "Müsait",
    };

    public static string Ownership(VehicleOwnership o) => o == VehicleOwnership.Rented ? "Kiralık" : "Öz mal";

    public static string? DriverRating(DriverRating? r) => r switch
    {
        null => null,
        Core.Entities.DriverRating.Excellent => "Mükemmel",
        Core.Entities.DriverRating.Workable => "Çalışılır",
        Core.Entities.DriverRating.NoCommission => "Komisyon çıkarmıyor",
        Core.Entities.DriverRating.StealsCustomers => "Müşteri çalıyor",
        Core.Entities.DriverRating.BadAttitude => "Ters davranıyor",
        Core.Entities.DriverRating.Unreliable => "Güvenilmez",
        _ => "İşi yarıda bırakıyor",
    };
}
