using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record JobRequestDto(int Id, int CustomerId, string CustomerTitle, DateOnly Date,
    string LoadingAddress, string DeliveryAddress, string? DeliveryWindow, string? CargoType,
    decimal? CargoQuantity, string? VehicleType, decimal? SalePrice, decimal? CarrierPrice,
    decimal? Commission, decimal? DriverBonus, decimal? OtherExpense, bool CustomerPays,
    string? LoadingDocumentNo, string? WaybillNo, string? InvoiceFooterNote, string? Description,
    decimal? LoadingLatitude, decimal? LoadingLongitude, decimal? DeliveryLatitude, decimal? DeliveryLongitude,
    JobRequestStatus Status, int? TripId);

public record JobRequestSaveRequest(int CustomerId, DateOnly Date, string LoadingAddress,
    string DeliveryAddress, string? DeliveryWindow, string? CargoType, decimal? CargoQuantity,
    string? VehicleType, decimal? SalePrice, decimal? CarrierPrice, decimal? Commission,
    decimal? DriverBonus, decimal? OtherExpense, bool CustomerPays, string? LoadingDocumentNo,
    string? WaybillNo, string? InvoiceFooterNote, string? Description, decimal? LoadingLatitude,
    decimal? LoadingLongitude, decimal? DeliveryLatitude, decimal? DeliveryLongitude);

public record JobRequestQuery : ListQuery
{
    public JobRequestStatus? Status { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}
