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
    int? DriverId = null, string? DriverName = null, decimal? Liters = null, int? Odometer = null,
    int? SupplierId = null, string? SupplierTitle = null, bool IsOnCredit = false, bool HasReceipt = false);

public record ExpenseSaveRequest(ExpenseCategory Category, decimal Amount, DateOnly Date, int? VehicleId, int? TripId,
    string? Description, int? DriverId = null, decimal? Liters = null, int? Odometer = null, int? SupplierId = null,
    bool IsOnCredit = false);

public record ExpenseQuery : ListQuery
{
    public ExpenseCategory? Category { get; init; }
    public int? VehicleId { get; init; }
    public int? TripId { get; init; }
    public int? DriverId { get; init; }
    public int? SupplierId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

public record InvoiceEmailRequest(string? To, string? Message);

public record SupplierPaymentDto(int Id, int SupplierId, string SupplierTitle, DateOnly Date, decimal Amount, PaymentMethod Method,
    int? TripId, string? TripLabel, string? Description);

public record SupplierPaymentSaveRequest(int SupplierId, DateOnly Date, decimal Amount, PaymentMethod Method, int? TripId, string? Description);

public record SupplierPaymentQuery : ListQuery
{
    public int? SupplierId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

/// <summary>Tedarikçi cari özeti: Borç = devir + sefer maliyetleri + vadeli giderler; Alacak = ödemeler.</summary>
public record SupplierSummaryDto(SupplierDto Supplier, decimal TotalDebit, decimal TotalCredit, decimal Balance, decimal OverdueAmount,
    int TripCount, int MissingInvoiceCount);

public record PayableAgingRow(int SupplierId, string Supplier, decimal NotDue, decimal Days1To30, decimal Days31To60,
    decimal Days61To90, decimal Over90, decimal Total);

public record SupplierReportRow(int SupplierId, string Supplier, int TripCount, decimal TripCost, decimal CreditExpenses,
    decimal Paid, decimal Balance);
