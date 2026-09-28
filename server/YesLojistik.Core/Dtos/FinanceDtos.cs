using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record InvoiceLineDto(int Id, int? TripId, string Description, decimal Amount);

public record InvoiceDto(int Id, string InvoiceNo, int CustomerId, string CustomerTitle, DateOnly Date, DateOnly DueDate,
    decimal Subtotal, decimal VatRate, decimal VatAmount, int WithholdingTenths, decimal WithholdingAmount, decimal Total,
    decimal Paid, decimal Remaining, InvoiceStatus Status, string PaymentStatus, string? Notes,
    IReadOnlyList<InvoiceLineDto> Lines);

public record InvoiceLineInput(int? TripId, string Description, decimal Amount);

public record InvoiceCreateRequest(int CustomerId, DateOnly Date, DateOnly? DueDate, decimal VatRate,
    int WithholdingTenths, string? Notes, bool AsDraft, IReadOnlyList<int> TripIds, IReadOnlyList<InvoiceLineInput>? ExtraLines);

public record InvoiceQuery : ListQuery
{
    public int? CustomerId { get; init; }
    public InvoiceStatus? Status { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public bool? Unpaid { get; init; }
}

public record PaymentDto(int Id, int CustomerId, string CustomerTitle, int? InvoiceId, string? InvoiceNo, DateOnly Date,
    decimal Amount, PaymentMethod Method, string? Description);

public record PaymentSaveRequest(int CustomerId, int? InvoiceId, DateOnly Date, decimal Amount, PaymentMethod Method,
    string? Description);

public record PaymentQuery : ListQuery
{
    public int? CustomerId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

public record ExpenseDto(int Id, ExpenseCategory Category, decimal Amount, DateOnly Date, int? VehicleId,
    string? VehiclePlate, int? TripId, string? TripLabel, string? Description,
    int? DriverId = null, string? DriverName = null, decimal? Liters = null, int? Odometer = null);

public record ExpenseSaveRequest(ExpenseCategory Category, decimal Amount, DateOnly Date, int? VehicleId, int? TripId,
    string? Description, int? DriverId = null, decimal? Liters = null, int? Odometer = null);

public record ExpenseQuery : ListQuery
{
    public ExpenseCategory? Category { get; init; }
    public int? VehicleId { get; init; }
    public int? TripId { get; init; }
    public int? DriverId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

public record InvoiceEmailRequest(string? To, string? Message);
