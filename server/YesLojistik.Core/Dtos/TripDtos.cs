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
    VehicleOwnership VehicleOwnership = VehicleOwnership.Own);

public record TripSaveRequest(int CustomerId, int VehicleId, int DriverId, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice,
    string? CustomerReference = null, string? CargoType = null, decimal? CargoWeightKg = null, int? CargoQuantity = null,
    string? CargoUnit = null, string? TrailerPlate = null, string? LoadingCity = null, string? DeliveryCity = null,
    string? LoadingContact = null, string? DeliveryContact = null, int? CarrierSupplierId = null,
    string? CarrierInvoiceNo = null, DateOnly? CarrierInvoiceDate = null);

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
}
