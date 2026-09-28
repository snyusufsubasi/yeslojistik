using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record TripDto(int Id, int CustomerId, string CustomerTitle, int VehicleId, string VehiclePlate, string VehicleType,
    int DriverId, string DriverName, string LoadingAddress, string DeliveryAddress, DateOnly LoadingDate,
    DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice, decimal ExpenseTotal,
    decimal Profit, TripStatus Status, IReadOnlyList<TripStatus> NextStatuses, int? InvoiceId, string? InvoiceNo);

public record TripSaveRequest(int CustomerId, int VehicleId, int DriverId, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, decimal VehicleCost, decimal SalePrice);

public record TripStatusRequest(TripStatus Status);

public record TripQuery : ListQuery
{
    public TripStatus? Status { get; init; }
    public int? CustomerId { get; init; }
    public int? VehicleId { get; init; }
    public int? DriverId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public bool? Invoiced { get; init; }
}
