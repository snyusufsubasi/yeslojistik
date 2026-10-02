using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record InvoiceLineDto(int Id, int? TripId, string Description, decimal Amount);

public record InvoiceDto(int Id, string InvoiceNo, int CustomerId, string CustomerTitle, DateOnly Date, DateOnly DueDate,
    decimal Subtotal, decimal VatRate, decimal VatAmount, int WithholdingTenths, decimal WithholdingAmount, decimal Total,
    decimal Paid, decimal Remaining, InvoiceStatus Status, string PaymentStatus, string? Notes,
    IReadOnlyList<InvoiceLineDto> Lines, EInvoiceScenario? Scenario = null, EInvoiceTypeCode? TypeCode = null, Guid? Ettn = null,
    string? EInvoiceNo = null, EInvoiceStatus EInvoiceStatus = EInvoiceStatus.None, string? EInvoiceMessage = null,
    DateTime? EInvoiceSentAt = null, string? WithholdingCode = null);

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
    decimal Amount, PaymentMethod Method, string? Description, int? CashAccountId = null, string? CashAccountName = null,
    string? InstrumentNo = null, string? Bank = null, DateOnly? InstrumentDueDate = null, InstrumentStatus? InstrumentStatus = null,
    int? EndorsedSupplierPaymentId = null, string? EndorsedTo = null, bool IsRefund = false);

public record PaymentSaveRequest(int CustomerId, int? InvoiceId, DateOnly Date, decimal Amount, PaymentMethod Method,
    string? Description, int? CashAccountId = null, string? InstrumentNo = null, string? Bank = null, DateOnly? InstrumentDueDate = null,
    bool IsRefund = false);

/// <summary>Çek/senet durum değişikliği. Ciroda tedarikçi zorunlu; tahsilde/tahsil edildiğinde hesap seçilebilir.</summary>
public record InstrumentStatusRequest(InstrumentStatus Status, int? SupplierId = null, DateOnly? Date = null, int? CashAccountId = null);

public record PaymentQuery : ListQuery
{
    public int? CustomerId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    /// <summary>Yalnızca çek ve senetler.</summary>
    public bool? Instruments { get; init; }
    public InstrumentStatus? InstrumentStatus { get; init; }
    public DateOnly? DueTo { get; init; }
    public int? CashAccountId { get; init; }
}

public record ExpenseDto(int Id, ExpenseCategory Category, decimal Amount, DateOnly Date, int? VehicleId,
    string? VehiclePlate, int? TripId, string? TripLabel, string? Description,
    int? DriverId = null, string? DriverName = null, decimal? Liters = null, int? Odometer = null,
    int? SupplierId = null, string? SupplierTitle = null, bool IsOnCredit = false, bool HasReceipt = false,
    ExpensePaidBy PaidBy = ExpensePaidBy.Company, ApprovalStatus ApprovalStatus = ApprovalStatus.Approved,
    string? RejectionReason = null, int? CashAccountId = null, ExpenseDetails? Details = null);

public record ExpenseSaveRequest(ExpenseCategory Category, decimal Amount, DateOnly Date, int? VehicleId, int? TripId,
    string? Description, int? DriverId = null, decimal? Liters = null, int? Odometer = null, int? SupplierId = null,
    bool IsOnCredit = false, int? CashAccountId = null, ExpenseDetails? Details = null);

/// <summary>Giderin eski paneldeki ayrıntıları: kullanıcı kategorisi, gider adı, dönem; yakıtta istasyon, yakıt türü, litre fiyatı, önceki km.</summary>
public record ExpenseDetails(string? CategoryName = null, string? Title = null, DateOnly? PeriodStart = null, DateOnly? PeriodEnd = null,
    string? FuelStation = null, string? FuelType = null, decimal? UnitPrice = null, int? PreviousOdometer = null, string? ExternalRef = null);

public record ExpenseQuery : ListQuery
{
    public ExpenseCategory? Category { get; init; }
    public int? VehicleId { get; init; }
    public int? TripId { get; init; }
    public int? DriverId { get; init; }
    public int? SupplierId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public ApprovalStatus? ApprovalStatus { get; init; }
    public ExpensePaidBy? PaidBy { get; init; }
}

public record InvoiceEmailRequest(string? To, string? Message);

public record SupplierPaymentDto(int Id, int SupplierId, string SupplierTitle, DateOnly Date, decimal Amount, PaymentMethod Method,
    int? TripId, string? TripLabel, string? Description, int? CashAccountId = null, string? CashAccountName = null, int? EndorsedFromPaymentId = null,
    bool IsRefund = false, IReadOnlyList<int>? TripIds = null);

public record SupplierPaymentSaveRequest(int SupplierId, DateOnly Date, decimal Amount, PaymentMethod Method, int? TripId, string? Description,
    int? CashAccountId = null, bool IsRefund = false);

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

/// <summary>Alınan faturaya bağlı sefer.</summary>
public record PurchaseInvoiceTripDto(int TripId, DateOnly LoadingDate, string Route, string Plate, decimal VehicleCost, decimal Payable, string? ExternalRef);

public record PurchaseInvoiceDto(int Id, int SupplierId, string SupplierTitle, string InvoiceNo, DateOnly Date, DateOnly? DueDate,
    PurchaseInvoiceKind Kind, decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total, string? Notes,
    bool IsCancelled, string? CancelReason, bool HasFile, string? ExternalRef, IReadOnlyList<PurchaseInvoiceTripDto> Trips);

/// <summary>Toplam sunucuda hesaplanır: matrah + KDV − tevkifat.</summary>
public record PurchaseInvoiceSaveRequest(int SupplierId, string InvoiceNo, DateOnly Date, DateOnly? DueDate, PurchaseInvoiceKind Kind,
    decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, string? Notes, IReadOnlyList<int>? TripIds, string? ExternalRef = null);

public record PurchaseInvoiceCancelRequest(string? Reason);

public record PurchaseInvoiceQuery : ListQuery
{
    public int? SupplierId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public PurchaseInvoiceKind? Kind { get; init; }
    public bool? IncludeCancelled { get; init; }
}

/// <summary>Faturası henüz gelmemiş taşeron seferi (alınan faturaya bağlanabilir).</summary>
public record UninvoicedCarrierTripDto(int TripId, DateOnly LoadingDate, string Route, string Plate, decimal VehicleCost,
    decimal CostVatRate, decimal Payable, string? ExternalRef);
// Liste filtrelerinin tamamının toplamları ("filtre toplamı"; yalnızca görünen sayfanın değil).

/// <summary>Faturalar: tutarlar kesilmiş faturalardan (durum seçildiyse o durumdan). Kalan = tahsil edilmemiş tutar.</summary>
public record InvoiceTotalsDto(int Count, decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total, decimal Remaining);

/// <summary>Alınan faturalar (iptaller yalnızca "iptalleri göster" seçiliyse girer).</summary>
public record PurchaseInvoiceTotalsDto(int Count, decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total);

/// <summary>Giderler: Total filtredeki bütün giderler; Approved onaylı, Pending onay bekleyen kısım.</summary>
public record ExpenseTotalsDto(int Count, decimal Total, decimal Approved, decimal Pending);

/// <summary>Tahsilat / tedarikçi ödemesi: Total net tutar (iadeler düşülmüş), Refunds iadelerin toplamı (pozitif).</summary>
public record PaymentTotalsDto(int Count, decimal Total, decimal Refunds);

public record ExpenseCategoryTotal(string Name, int Count, decimal Total, decimal Percent);
