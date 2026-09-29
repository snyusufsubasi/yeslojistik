using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record CustomerDto(int Id, string CustomerNo, string Title, string? TaxNumber, string? TaxOffice,
    string? Phone, string? Email, string? Address, string? Notes, decimal Balance, decimal OpeningBalance = 0,
    DateOnly? OpeningBalanceDate = null, bool NotifyStatusByEmail = false, string? City = null, string? District = null,
    string? ContactName = null, bool IsEInvoiceUser = false, string? EInvoiceAlias = null, int? PaymentTermDays = null, bool IsActive = true);

public record CustomerSaveRequest(string Title, string? TaxNumber, string? TaxOffice, string? Phone,
    string? Email, string? Address, string? Notes, decimal OpeningBalance = 0, DateOnly? OpeningBalanceDate = null,
    bool NotifyStatusByEmail = false, string? City = null, string? District = null, string? ContactName = null,
    bool IsEInvoiceUser = false, string? EInvoiceAlias = null, int? PaymentTermDays = null, bool IsActive = true);

public record CustomerSummaryDto(CustomerDto Customer, decimal TotalDebit, decimal TotalCredit, decimal Balance,
    decimal OverdueAmount, int TripCount);

public record AccountMovementDto(DateOnly Date, string Type, string Reference, string? Description,
    decimal Debit, decimal Credit, decimal RunningBalance, string Status);

public record VehicleDto(int Id, string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId, string? DefaultDriverName, VehicleOwnership Ownership = VehicleOwnership.Own,
    int? SupplierId = null, string? SupplierTitle = null, string? TrailerPlate = null, int? NextMaintenanceKm = null);

public record VehicleSaveRequest(string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId, VehicleOwnership Ownership = VehicleOwnership.Own, int? SupplierId = null,
    string? TrailerPlate = null, int? NextMaintenanceKm = null);

public record DriverDto(int Id, string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive, int? SupplierId = null,
    string? SupplierTitle = null, bool HasAppAccount = false, DateTime? LocationConsentAt = null);

public record DriverSaveRequest(string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive, int? SupplierId = null);

public record StatementEmailRequest(DateOnly? From, DateOnly? To, string? Recipient, string? Message);

public record SupplierDto(int Id, string SupplierNo, string Title, SupplierKind Kind, string? TaxNumber, string? TaxOffice,
    string? Phone, string? Email, string? Address, string? City, string? District, string? Iban, string? ContactName,
    int PaymentTermDays, string? Notes, decimal OpeningBalance, DateOnly? OpeningBalanceDate, bool IsActive, decimal Balance);

public record SupplierSaveRequest(string Title, SupplierKind Kind, string? TaxNumber, string? TaxOffice, string? Phone,
    string? Email, string? Address, string? City, string? District, string? Iban, string? ContactName, int PaymentTermDays,
    string? Notes, decimal OpeningBalance = 0, DateOnly? OpeningBalanceDate = null, bool IsActive = true);

public record SupplierQuery : ListQuery
{
    public SupplierKind? Kind { get; init; }
    public bool? Active { get; init; }
}
