using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record TripDto(int Id, int CustomerId, string CustomerTitle, int VehicleId, string VehiclePlate, string VehicleType,
    int DriverId, string DriverName, string LoadingAddress, string DeliveryAddress, DateOnly LoadingDate,
    DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice, decimal ExpenseTotal,
    decimal Profit, TripStatus Status, IReadOnlyList<TripStatus> NextStatuses, int? InvoiceId, string? InvoiceNo,
    string? CustomerReference = null, string? CargoType = null, decimal? CargoWeightKg = null, int? CargoQuantity = null,
    string? CargoUnit = null, string? TrailerPlate = null, string? LoadingCity = null, string? DeliveryCity = null,
    string? LoadingContact = null, string? DeliveryContact = null, int? CarrierSupplierId = null, string? CarrierSupplierTitle = null,
    string? CarrierInvoiceNo = null, DateOnly? CarrierInvoiceDate = null, string? ReceivedBy = null, DateTime? DeliveredAt = null,
    VehicleOwnership VehicleOwnership = VehicleOwnership.Own, int? JobRequestId = null, bool IsLegacy = false, TripTerms? Terms = null,
    string? CommissionAccountName = null, DateOnly? InvoiceDate = null, string? CreatedBy = null,
    TripUetds? Uetds = null, int? UetdsMissing = null, TripOps? Ops = null);

public record TripSaveRequest(int CustomerId, int VehicleId, int DriverId, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice,
    string? CustomerReference = null, string? CargoType = null, decimal? CargoWeightKg = null, int? CargoQuantity = null,
    string? CargoUnit = null, string? TrailerPlate = null, string? LoadingCity = null, string? DeliveryCity = null,
    string? LoadingContact = null, string? DeliveryContact = null, int? CarrierSupplierId = null,
    string? CarrierInvoiceNo = null, DateOnly? CarrierInvoiceDate = null, int? JobRequestId = null, TripTerms? Terms = null,
    TripUetds? Uetds = null, TripOps? Ops = null);

/// <summary>
/// Operasyon alanları: taşıma şekli, dorse/kasa tipi, iptal/sorun nedeni ve açıklaması (hepsi serbest yazı, akıllı alanla seçilir).
/// Kayıtta boş (null) gelirse mevcut değerler korunur (eski istemciler silmesin).
/// </summary>
public record TripOps(string? TransportMode = null, string? TrailerType = null, string? ProblemReason = null, string? ProblemNote = null);

/// <summary>
/// Seferin ticari koşulları (eski paneldeki fiyat, komisyon, masraf ve evrak alanları). Tutarlar KDV hariç.
/// Tevkifat onda bir cinsinden (ör. 2 = 2/10); null ise faturada otomatik belirlenir.
/// </summary>
public record TripTerms(
    decimal SaleVatRate = 20, int? SaleWithholdingTenths = null, decimal CostVatRate = 20, int? CostWithholdingTenths = null,
    decimal Commission = 0, int? CommissionAccountId = null, CommissionStatus CommissionStatus = CommissionStatus.Pending,
    bool CommissionInvoiced = false, bool CommissionVatIncluded = true,
    decimal ExtraCharge = 0, bool ExtraChargeInvoiced = false, bool ExtraChargeVatIncluded = true,
    string? ExtraChargeTaxNo = null, string? ExtraChargeTitle = null,
    decimal DriverBonus = 0, bool CustomerPays = false, string? CustomerGroup = null,
    string? DeliveryDocumentNo = null, bool DeliveryDocumentApproved = false, string? WaybillNo = null,
    string? EWaybillNo = null, DateOnly? EWaybillDate = null,
    double? LoadingLatitude = null, double? LoadingLongitude = null, double? DeliveryLatitude = null, double? DeliveryLongitude = null,
    int? DistanceKm = null, bool HideCarrierPrice = false, string? InvoiceFooterNote = null, bool ShowFooterNote = false,
    string? DeliveredBy = null, string? PaymentTerms = null, string? ExternalRef = null);

/// <summary>
/// U-ETDS hazırlığı için seferde tutulan ek bilgiler (ilçeler, yükleme saati, alıcı). Kayıtta boş (null) gelirse mevcut değerler korunur.
/// Gönderici = müşteri. Hiçbir yere gönderilmez.
/// </summary>
public record TripUetds(string? LoadingDistrict = null, string? DeliveryDistrict = null, TimeOnly? LoadingTime = null,
    string? ConsigneeTitle = null, string? ConsigneeTaxNumber = null);

/// <summary>Sefer durum zaman çizelgesi satırı.</summary>
/// <param name="Kind">"created" (kayıt açıldı), "status" (durum değişti) ya da "problem" (iptal/sorun nedeni girildi).</param>
public record TripEventDto(long Id, TripStatus Status, DateTime OccurredAt, DateTime RecordedAt, string? UserName,
    TripEventSource Source, string? Note, string Kind = "status");

/// <param name="OccurredAt">Şoför uygulaması çevrimdışıyken durumun gerçekten değiştiği an.</param>
/// <summary>Durum değişikliği. ReceivedBy: teslim alan kişi (yalnızca teslimde).</summary>
/// <param name="ProblemReason">İptalde (ya da sorun bildiriminde) neden; seferin iptal/sorun nedeni alanına yazılır.</param>
public record TripStatusRequest(TripStatus Status, DateTime? OccurredAt = null, string? Note = null, string? ReceivedBy = null,
    string? ProblemReason = null);

public record TripQuery : ListQuery
{
    public TripStatus? Status { get; init; }
    public int? CustomerId { get; init; }
    public int? VehicleId { get; init; }
    public int? DriverId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public bool? Invoiced { get; init; }
    public int? CarrierSupplierId { get; init; }
    /// <summary>Teslim edilmiş ama taşeron faturası (CarrierInvoiceNo) girilmemiş kiralık araç seferleri.</summary>
    public bool? MissingCarrierInvoice { get; init; }
    /// <summary>Satış ya da maliyet fiyatı girilmemiş (0) seferler.</summary>
    public bool? MissingPrice { get; init; }
    /// <summary>Teslim edilmiş, teslim evrakı onaylanmamış seferler.</summary>
    public bool? PendingDeliveryDocument { get; init; }
    public CommissionStatus? CommissionStatus { get; init; }
    public string? CustomerGroup { get; init; }
    /// <summary>Taşeron faturası girildi mi (fatura alındı).</summary>
    public bool? CarrierInvoiced { get; init; }
    /// <summary>Eski paneldeki "Piyasa / Öz Araç": Rented = kiralık araç ya da taşeronlu sefer, Own = kendi aracımız.</summary>
    public VehicleOwnership? Ownership { get; init; }
    /// <summary>Komisyon işi: komisyonu olan (true) ya da olmayan (false) seferler.</summary>
    public bool? HasCommission { get; init; }
    /// <summary>Yükleme yeri: il ya da adres bu metni içerir.</summary>
    public string? LoadingPlace { get; init; }
    /// <summary>İndirme (teslim) yeri: il ya da adres bu metni içerir.</summary>
    public string? DeliveryPlace { get; init; }
    /// <summary>Sevkiyat no: listede görünen numara (aktarılan kayıtta eski sistemin numarası, "S" öneki yazılmasa da olur).</summary>
    public string? TripNo { get; init; }
    /// <summary>Teslim evrak no bu metni içerir.</summary>
    public string? DeliveryDocumentNo { get; init; }
    /// <summary>Satış faturası ya da taşeron faturası numarası bu metni içerir.</summary>
    public string? InvoiceNo { get; init; }
    /// <summary>Teslim evrakı var (teslim evrak no girilmiş ya da sefere belge yüklenmiş) / yok.</summary>
    public bool? HasDeliveryDocument { get; init; }
    /// <summary>U-ETDS hazırlığı eksik olan, henüz teslim edilmemiş seferler (iptal ve eski kayıtlar sayılmaz).</summary>
    public bool? UetdsMissing { get; init; }
    /// <summary>Taşıma şekli (büyük/küçük harf farkı gözetmeden tam eşleşme).</summary>
    public string? TransportMode { get; init; }
    /// <summary>Dorse / kasa tipi (büyük/küçük harf farkı gözetmeden tam eşleşme).</summary>
    public string? TrailerType { get; init; }
    /// <summary>İptal/sorun nedeni girilmiş (true) ya da girilmemiş (false) seferler.</summary>
    public bool? HasProblem { get; init; }
}

/// <summary>Sevkiyat şablonu (sık tekrarlanan iş).</summary>
public record TripTemplateDto(int Id, string Name, int? CustomerId, string? CustomerTitle, int? VehicleId, string? VehiclePlate,
    int? DriverId, string? DriverName, string? LoadingCity, string? LoadingDistrict, string LoadingAddress, string? LoadingContact,
    string? DeliveryCity, string? DeliveryDistrict, string DeliveryAddress, string? DeliveryContact,
    string? CargoType, decimal? CargoWeightKg, int? CargoQuantity, string? CargoUnit, string? TransportMode, string? TrailerType,
    decimal? SalePrice, decimal? VehicleCost, string? PaymentTerms, string? Description, int UseCount, DateTime? LastUsedAt, DateTime CreatedAt);

/// <summary>Şablon kaydı: ya bir seferden (TripId) ya da alanlardan. Ad boşsa "Müşteri · A → B" yazılır.</summary>
public record TripTemplateSaveRequest(string? Name = null, int? TripId = null, int? CustomerId = null, int? VehicleId = null, int? DriverId = null,
    string? LoadingCity = null, string? LoadingDistrict = null, string? LoadingAddress = null, string? LoadingContact = null,
    string? DeliveryCity = null, string? DeliveryDistrict = null, string? DeliveryAddress = null, string? DeliveryContact = null,
    string? CargoType = null, decimal? CargoWeightKg = null, int? CargoQuantity = null, string? CargoUnit = null,
    string? TransportMode = null, string? TrailerType = null, decimal? SalePrice = null, decimal? VehicleCost = null,
    string? PaymentTerms = null, string? Description = null);

/// <summary>Müşterinin daha önce kullanılmış bir yükleme / teslim adresi (kaç seferde geçtiğiyle).</summary>
public record TripAddressHint(string Address, string? City, string? Contact, int Count);

/// <summary>Aynı güzergâhta (il → il) son bir yıldaki seferlerin fiyat özeti.</summary>
public record TripRouteHint(int Count, decimal AvgSalePrice, decimal AvgVehicleCost, decimal LastSalePrice, decimal LastVehicleCost, DateOnly LastDate);

/// <summary>Yeni sefer formu için öneriler: son sefer, kayıtlı adresler, sık yük cinsleri, güzergâh fiyatı.</summary>
public record TripHintsDto(TripDto? LastTrip, IReadOnlyList<TripAddressHint> LoadingAddresses, IReadOnlyList<TripAddressHint> DeliveryAddresses,
    IReadOnlyList<string> CargoTypes, TripRouteHint? Route);

/// <summary>Sevkiyat listesi satırı (müşteriye gönderilen PDF). Tutar = nakliye bedeli + faturalanan ek masraf, KDV hariç.</summary>
public record TripStatementLine(int TripId, string No, DateOnly Date, int CustomerId, string Customer, string From, string To,
    string Plate, string Driver, string? Cargo, string? CustomerReference, string? DocumentNo,
    decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total);

/// <summary>İcmal satırı: müşteri ve ay bazında sefer sayısı ve vergili tutarlar. Toplam = matrah + KDV − tevkifat.</summary>
public record TripSummaryRow(int CustomerId, string Customer, int Year, int Month, int TripCount,
    decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total);

/// <summary>Sefer listesindeki süzgece uyan seferlerin toplamı (eski paneldeki "Kazanç Tablosu"). İptal edilen seferler sayılmaz.</summary>
/// <remarks>Kazanç = satış − maliyet + komisyon − prim − (faturalanmayan) ek masraf − giderler.</remarks>
public record TripTotalsDto(int Count, decimal Sale, decimal VehicleCost, decimal Expenses, decimal Profit, int UninvoicedCount, decimal UninvoicedTotal,
    decimal Commission = 0, decimal CommissionBank = 0, decimal ExtraCharge = 0, decimal DriverBonus = 0);
