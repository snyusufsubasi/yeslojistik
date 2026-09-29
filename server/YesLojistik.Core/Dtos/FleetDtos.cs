using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record ExpenseRejectRequest(string Reason);

public record DriverSettlementDto(int Id, int DriverId, string DriverName, DateOnly Date, decimal Amount, SettlementDirection Direction,
    PaymentMethod Method, string? Note);

public record DriverSettlementSaveRequest(int DriverId, DateOnly Date, decimal Amount, SettlementDirection Direction, PaymentMethod Method, string? Note,
    int? CashAccountId = null);

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

public record CashAccountDto(int Id, string Name, CashAccountKind Kind, string? Iban, decimal OpeningBalance, DateOnly? OpeningBalanceDate,
    bool IsActive, decimal Balance);

public record CashAccountSaveRequest(string Name, CashAccountKind Kind, string? Iban, decimal OpeningBalance, DateOnly? OpeningBalanceDate, bool IsActive = true);

public record CashMovementDto(DateOnly Date, string Kind, string Description, decimal In, decimal Out, decimal Balance, string? Link);

public record CashTransferDto(int Id, int FromAccountId, string FromAccountName, int ToAccountId, string ToAccountName, DateOnly Date, decimal Amount, string? Note);

public record CashTransferSaveRequest(int FromAccountId, int ToAccountId, DateOnly Date, decimal Amount, string? Note);

/// <summary>Nakit akışı dilimi: gecikmiş kalemler ayrı, sonra haftalık.</summary>
public record CashFlowBucket(string Label, DateOnly? From, DateOnly? To, decimal ExpectedIn, decimal InstrumentsIn, decimal ExpectedOut);

public record CashFlowDto(IReadOnlyList<CashFlowBucket> Buckets, decimal TotalIn, decimal TotalOut, decimal CashOnHand);

public record CustomerRiskDto(int CustomerId, decimal? CreditLimit, decimal OpenBalance, decimal UninvoicedDelivered, decimal Used, decimal? Available);
