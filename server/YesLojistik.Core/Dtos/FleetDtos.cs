using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record ExpenseRejectRequest(string Reason);

public record DriverSettlementDto(int Id, int DriverId, string DriverName, DateOnly Date, decimal Amount, SettlementDirection Direction,
    PaymentMethod Method, string? Note);

public record DriverSettlementSaveRequest(int DriverId, DateOnly Date, decimal Amount, SettlementDirection Direction, PaymentMethod Method, string? Note);

/// <summary>
/// Şoför hesabı hareketi. Debit: şoföre verilen para (avans, ödeme). Credit: şoförün firma adına harcadığı ya da geri verdiği para.
/// Bakiye pozitifse şoförün elinde firmaya ait para var; negatifse firma şoföre borçlu.
/// </summary>
public record DriverLedgerRow(DateOnly Date, string Kind, string Description, decimal Debit, decimal Credit, decimal Balance,
    int? ExpenseId, int? SettlementId, ApprovalStatus? ApprovalStatus = null);

public record DriverLedgerDto(int DriverId, string DriverName, decimal Advances, decimal PaidToDriver, decimal DriverExpenses,
    decimal ReceivedFromDriver, decimal Balance, decimal PendingExpenses, IReadOnlyList<DriverLedgerRow> Rows);

public record DocumentDto(int Id, DocumentOwnerType OwnerType, int? OwnerId, string? OwnerName, DocumentType Type, string? No,
    DateOnly? IssueDate, DateOnly? ExpiryDate, bool HasFile, string? Note, int? DaysLeft);

public record DocumentSaveRequest(DocumentOwnerType OwnerType, int? OwnerId, DocumentType Type, string? No, DateOnly? IssueDate,
    DateOnly? ExpiryDate, string? Note);

public record MaintenanceDto(int Id, int VehicleId, string VehiclePlate, DateOnly Date, int? Km, MaintenanceType Type, string? Description,
    decimal Cost, int? SupplierId, string? SupplierTitle, int? NextDueKm, DateOnly? NextDueDate, int? ExpenseId);

public record MaintenanceSaveRequest(DateOnly Date, int? Km, MaintenanceType Type, string? Description, decimal Cost, int? SupplierId,
    int? NextDueKm, DateOnly? NextDueDate, bool IsOnCredit = false);
