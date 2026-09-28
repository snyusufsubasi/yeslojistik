using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record CustomerDto(int Id, string CustomerNo, string Title, string? TaxNumber, string? TaxOffice,
    string? Phone, string? Email, string? Address, string? Notes, decimal Balance, decimal OpeningBalance = 0,
    DateOnly? OpeningBalanceDate = null);

public record CustomerSaveRequest(string Title, string? TaxNumber, string? TaxOffice, string? Phone,
    string? Email, string? Address, string? Notes, decimal OpeningBalance = 0, DateOnly? OpeningBalanceDate = null);

public record CustomerSummaryDto(CustomerDto Customer, decimal TotalDebit, decimal TotalCredit, decimal Balance,
    decimal OverdueAmount, int TripCount);

public record AccountMovementDto(DateOnly Date, string Type, string Reference, string? Description,
    decimal Debit, decimal Credit, decimal RunningBalance, string Status);

public record VehicleDto(int Id, string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId, string? DefaultDriverName);

public record VehicleSaveRequest(string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId);

public record DriverDto(int Id, string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive);

public record DriverSaveRequest(string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive);

public record StatementEmailRequest(DateOnly? From, DateOnly? To, string? Recipient, string? Message);
