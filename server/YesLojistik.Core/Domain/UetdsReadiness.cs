using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Domain;

/// <summary>Eksik bilginin nerede düzeltileceği.</summary>
public enum UetdsTarget { Trip, Driver, Vehicle, Customer }

/// <summary>
/// Hazırlık kontrolünün bulduğu tek bir eksik ya da hatalı bilgi.
/// <paramref name="Blocking"/> false ise "kontrol edin" notudur ve seferi "eksik" saymaz.
/// <paramref name="Field"/> sefer formundaki alan adıdır (arayüz o alana götürür).
/// </summary>
public record UetdsIssue(string Code, UetdsTarget Target, string Message, string? Field = null, bool Blocking = true);

/// <summary>Kontrol için gereken bilgiler (sefer + şoför + araç + müşteri); saf veri, veritabanı yok.</summary>
public record UetdsInput(
    DateOnly LoadingDate, TimeOnly? LoadingTime,
    string? CargoType, decimal? CargoWeightKg, int? CargoQuantity, string? CargoUnit,
    string? LoadingCity, string? LoadingDistrict, string? DeliveryCity, string? DeliveryDistrict,
    string? ConsigneeTitle, string? ConsigneeTaxNumber, string? TripTrailerPlate,
    string DriverName, string? DriverNationalId, bool DriverIsForeign, string? DriverNationality, string? DriverPhone,
    string VehiclePlate, string VehicleType, string? VehicleTrailerPlate,
    string CustomerTitle, string? CustomerTaxNumber);

/// <summary>
/// "U-ETDS'ye hazır mı?" kontrolü. Bakanlığa HİÇBİR ŞEY göndermez; yalnızca bir seferin bildirim için gereken
/// bilgilerinin dolu ve geçerli olup olmadığını söyler.
/// <para>
/// Kaynak: U-ETDS yük taşıma kaydı bildirimi için kamuya açık anlatımlar (plaka, dorse, sürücü adı-soyadı ve T.C. kimlik no,
/// yük cinsi ve miktarı, yükleme-boşaltma il/ilçe, gönderici ve alıcı kimliği, tarih ve saat). Bakanlığın teknik
/// dokümanına erişilemediği için alan listesi <b>doğrulanacak</b>: özellikle yabancı şoför kimliği, uyruk kodu,
/// zorunlu birim listesi ve dorse zorunluluğu.
/// </para>
/// </summary>
public static class UetdsReadiness
{
    /// <summary>Dorse beklenen araç tipleri (araç tipi serbest metin; küçük harfe çevrilip aranır). Doğrulanacak.</summary>
    private static readonly string[] TrailerTypes = ["tır", "çekici", "lowbed", "treyler"];

    public static IReadOnlyList<UetdsIssue> Check(UetdsInput i)
    {
        var issues = new List<UetdsIssue>();
        void Add(string code, UetdsTarget target, string message, string? field = null, bool blocking = true) =>
            issues.Add(new UetdsIssue(code, target, message, field, blocking));

        // Sürücü
        if (string.IsNullOrWhiteSpace(i.DriverNationalId))
            Add("driver.nationalId", UetdsTarget.Driver, i.DriverIsForeign
                ? "Şoförün pasaport / kimlik numarası girilmemiş."
                : "Şoförün TC kimlik numarası girilmemiş.");
        else if (i.DriverIsForeign)
        {
            if (!IsValidForeignId(i.DriverNationalId))
                Add("driver.nationalId", UetdsTarget.Driver, "Yabancı şoförün pasaport / kimlik numarası geçersiz (5-20 harf veya rakam olmalı).");
        }
        else if (i.DriverNationalId.Length != 11 || !i.DriverNationalId.All(char.IsAsciiDigit))
            Add("driver.nationalId", UetdsTarget.Driver, "Şoförün TC kimlik numarası 11 haneli olmalı.");
        else if (!TaxNumberValidator.IsValidTckn(i.DriverNationalId))
            Add("driver.nationalId", UetdsTarget.Driver, "Şoförün TC kimlik numarası geçersiz (kontrol hanesi tutmuyor). Yazım hatası olabilir.");

        if (i.DriverIsForeign && string.IsNullOrWhiteSpace(i.DriverNationality))
            Add("driver.nationality", UetdsTarget.Driver, "Yabancı şoförün uyruğu seçilmemiş.");

        if (Formatters.NormalizePhone(i.DriverPhone) == null)
            Add("driver.phone", UetdsTarget.Driver, string.IsNullOrWhiteSpace(i.DriverPhone)
                ? "Şoförün telefonu girilmemiş."
                : "Şoförün telefonu geçersiz (ör. 0532 123 45 67).");

        // Araç
        if (Formatters.NormalizePlate(i.VehiclePlate) == null)
            Add("vehicle.plate", UetdsTarget.Vehicle, $"Araç plakası geçerli bir Türkiye plakası değil ({i.VehiclePlate}). Yabancı plakalar için kural doğrulanacak.");

        var trailer = string.IsNullOrWhiteSpace(i.TripTrailerPlate) ? i.VehicleTrailerPlate : i.TripTrailerPlate;
        if (!string.IsNullOrWhiteSpace(trailer))
        {
            if (Formatters.NormalizePlate(trailer) == null)
                Add("trip.trailerPlate", UetdsTarget.Trip, $"Dorse plakası geçerli değil ({trailer}).", "trailerPlate");
        }
        else if (NeedsTrailer(i.VehicleType))
            Add("trip.trailerPlate", UetdsTarget.Trip, "Tır / çekici için dorse plakası girilmemiş. Dorsesiz çekiyorsa bu notu yok sayabilirsiniz.",
                "trailerPlate", blocking: false);

        // Yük
        if (string.IsNullOrWhiteSpace(i.CargoType))
            Add("trip.cargoType", UetdsTarget.Trip, "Yük cinsi girilmemiş.", "cargoType");
        if (!(i.CargoWeightKg is > 0) && !(i.CargoQuantity is > 0))
            Add("trip.cargoAmount", UetdsTarget.Trip, "Yükün ağırlığı (kg) ya da miktarı girilmemiş.", "cargoWeightKg");
        else if (!(i.CargoWeightKg is > 0) && string.IsNullOrWhiteSpace(i.CargoUnit))
            Add("trip.cargoUnit", UetdsTarget.Trip, "Miktar girilmiş ama birimi (palet, koli, adet...) yok. Ağırlık (kg) girmek daha kesindir.",
                "cargoUnit", blocking: false);

        // Yerler
        Place("loading", "Yükleme", i.LoadingCity, i.LoadingDistrict);
        Place("delivery", "Teslim (boşaltma)", i.DeliveryCity, i.DeliveryDistrict);

        // Gönderici = müşteri, alıcı = seferdeki alıcı bilgisi. Doğrulanacak: gönderici/alıcının müşteriyle ilişkisi.
        if (string.IsNullOrWhiteSpace(i.CustomerTaxNumber))
            Add("customer.taxNumber", UetdsTarget.Customer, $"Gönderici ({i.CustomerTitle}) için VKN / TCKN girilmemiş.");
        else if (!TaxNumberValidator.IsValid(i.CustomerTaxNumber))
            Add("customer.taxNumber", UetdsTarget.Customer, $"Gönderici ({i.CustomerTitle}) VKN / TCKN numarası geçersiz.");

        if (string.IsNullOrWhiteSpace(i.ConsigneeTaxNumber))
            Add("trip.consigneeTaxNumber", UetdsTarget.Trip, "Alıcının VKN / TCKN numarası girilmemiş. Alıcı müşteriyle aynıysa onun numarasını yazın.",
                "consigneeTaxNumber");
        else if (!TaxNumberValidator.IsValid(i.ConsigneeTaxNumber))
            Add("trip.consigneeTaxNumber", UetdsTarget.Trip, "Alıcının VKN / TCKN numarası geçersiz.", "consigneeTaxNumber");
        if (string.IsNullOrWhiteSpace(i.ConsigneeTitle))
            Add("trip.consigneeTitle", UetdsTarget.Trip, "Alıcının unvanı (ya da adı soyadı) girilmemiş.", "consigneeTitle");

        // Tarih ve saat
        if (i.LoadingTime == null)
            Add("trip.loadingTime", UetdsTarget.Trip, "Yükleme saati girilmemiş.", "loadingTime");

        return issues;

        void Place(string key, string label, string? city, string? district)
        {
            if (string.IsNullOrWhiteSpace(city) || Cities.Normalize(city) == null)
                Add($"trip.{key}City", UetdsTarget.Trip, $"{label} ili seçilmemiş.", $"{key}City");
            if (string.IsNullOrWhiteSpace(district))
                Add($"trip.{key}District", UetdsTarget.Trip, $"{label} ilçesi girilmemiş.", $"{key}District");
        }
    }

    /// <summary>Listede/uyarılarda sayılacak seferler: henüz teslim edilmemiş, iptal olmayan, eski sistemden aktarılmamış.</summary>
    public static bool AppliesTo(TripStatus status, bool isLegacy) =>
        !isLegacy && status is TripStatus.Planned or TripStatus.Loaded or TripStatus.OnRoad;

    /// <summary>Bildirimi engelleyen (eksik sayılan) madde sayısı.</summary>
    public static int MissingCount(IEnumerable<UetdsIssue> issues) => issues.Count(x => x.Blocking);

    public static bool NeedsTrailer(string? vehicleType)
    {
        var t = vehicleType?.Trim().ToLower(Formatters.Tr) ?? "";
        return TrailerTypes.Any(t.Contains);
    }

    /// <summary>Yabancı şoför kimliği: serbest biçim (pasaport / kimlik), 5-20 harf-rakam. Kesin biçim doğrulanacak.</summary>
    public static bool IsValidForeignId(string? value) =>
        value is { Length: >= 5 and <= 20 } && value.All(char.IsAsciiLetterOrDigit);
}
