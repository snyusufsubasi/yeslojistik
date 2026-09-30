using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

/// <summary>Personel ve seçilen ayın özeti: maaş + prim − avans − ödenen maaş = kalan.</summary>
public record StaffDto(int Id, string FullName, string? NationalId, string? Phone, DateOnly? StartDate, decimal MonthlySalary, string? Notes,
    bool IsActive, decimal Salary, decimal Advances, decimal Bonuses, decimal Paid, decimal Remaining);

public record StaffSaveRequest(string FullName, string? NationalId, string? Phone, DateOnly? StartDate, decimal MonthlySalary, string? Notes,
    bool IsActive = true);

public record StaffTransactionDto(int Id, int StaffId, DateOnly Date, StaffTransactionKind Kind, decimal Amount, string? Note, int? CashAccountId,
    string? CashAccountName);

public record StaffTransactionSaveRequest(DateOnly Date, StaffTransactionKind Kind, decimal Amount, string? Note, int? CashAccountId = null);

/// <summary>Sabit ödeme ve seçilen aydaki durumu (ödendiyse tarihi ve tutarı).</summary>
public record RecurringPaymentDto(int Id, string Title, string? Detail, decimal Amount, int DueDay, ExpenseCategory Category, int? CashAccountId,
    string? CashAccountName, bool IsActive, DateOnly DueDate, DateOnly? PaidDate, decimal? PaidAmount, DateOnly? LastPaidDate);

public record RecurringPaymentSaveRequest(string Title, string? Detail, decimal Amount, int DueDay, ExpenseCategory Category, int? CashAccountId,
    bool IsActive = true);

public record RecurringPayRequest(DateOnly Date, decimal Amount, int? CashAccountId);
