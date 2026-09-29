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
    string? CommissionAccountName = null);

public record TripSaveRequest(int CustomerId, int VehicleId, int DriverId, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice,
    string? CustomerReference = null, string? CargoType = null, decimal? CargoWeightKg = null, int? CargoQuantity = null,
    string? CargoUnit = null, string? TrailerPlate = null, string? LoadingCity = null, string? DeliveryCity = null,
    string? LoadingContact = null, string? DeliveryContact = null, int? CarrierSupplierId = null,
    string? CarrierInvoiceNo = null, DateOnly? CarrierInvoiceDate = null, int? JobRequestId = null, TripTerms? Terms = null);

/// <summary>
/// Seferin ticari koşulları (eski paneldeki fiyat, komisyon, masraf ve evrak alanları). Tutarlar KDV hariç.
/// Tevkifat onda bir cinsinden (ör. 2 = 2/10); null ise faturada otomatik belirlenir.
/// </summary>
public record TripTerms(
    decimal SaleVatRate = 20, int? SaleWithholdingTenths = null, decimal CostVatRate = 0, int? CostWithholdingTenths = null,
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

/// <summary>Sefer durum zaman çizelgesi satırı.</summary>
public record TripEventDto(long Id, TripStatus Status, DateTime OccurredAt, DateTime RecordedAt, string? UserName,
    TripEventSource Source, string? Note);

/// <param name="OccurredAt">Şoför uygulaması çevrimdışıyken durumun gerçekten değiştiği an.</param>
/// <summary>Durum değişikliği. ReceivedBy: teslim alan kişi (yalnızca teslimde).</summary>
public record TripStatusRequest(TripStatus Status, DateTime? OccurredAt = null, string? Note = null, string? ReceivedBy = null);

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
}

/// <summary>Filtredeki seferlerin kazanç tablosu (eski paneldeki "Kazanç Tablosu").</summary>
public record TripTotalsDto(int Count, decimal Sale, decimal Cost, decimal GrossMargin, decimal CommissionBank, decimal CommissionCash,
    decimal Commission, decimal ExtraCharge, decimal DriverBonus, decimal Expenses, decimal Profit);

/// <summary>Müşterinin daha önce kullanılmış bir yükleme / teslim adresi (kaç seferde geçtiğiyle).</summary>
public record TripAddressHint(string Address, string? City, string? Contact, int Count);

/// <summary>Aynı güzergâhta (il → il) son bir yıldaki seferlerin fiyat özeti.</summary>
public record TripRouteHint(int Count, decimal AvgSalePrice, decimal AvgVehicleCost, decimal LastSalePrice, decimal LastVehicleCost, DateOnly LastDate);

/// <summary>Yeni sefer formu için öneriler: son sefer, kayıtlı adresler, sık yük cinsleri, güzergâh fiyatı.</summary>
public record TripHintsDto(TripDto? LastTrip, IReadOnlyList<TripAddressHint> LoadingAddresses, IReadOnlyList<TripAddressHint> DeliveryAddresses,
    IReadOnlyList<string> CargoTypes, TripRouteHint? Route);

/// <summary>Sefer listesindeki süzgece uyan seferlerin toplamı (eski paneldeki "Kazanç Tablosu"). İptal edilen seferler sayılmaz.</summary>
public record TripTotalsDto(int Count, decimal Sale, decimal VehicleCost, decimal Expenses, decimal Profit, int UninvoicedCount, decimal UninvoicedTotal);
