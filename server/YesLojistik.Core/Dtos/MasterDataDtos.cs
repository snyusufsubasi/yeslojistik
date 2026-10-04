using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record CustomerDto(int Id, string CustomerNo, string Title, string? TaxNumber, string? TaxOffice,
    string? Phone, string? Email, string? Address, string? Notes, decimal Balance, decimal OpeningBalance = 0,
    DateOnly? OpeningBalanceDate = null, bool NotifyStatusByEmail = false, string? City = null, string? District = null,
    string? ContactName = null, bool IsEInvoiceUser = false, string? EInvoiceAlias = null, int? PaymentTermDays = null, bool IsActive = true,
    decimal? CreditLimit = null, CustomerExtras? Extras = null, InvoiceTemplateDto? InvoiceTemplate = null,
    IReadOnlyList<string>? Groups = null);

public record CustomerSaveRequest(string Title, string? TaxNumber, string? TaxOffice, string? Phone,
    string? Email, string? Address, string? Notes, decimal OpeningBalance = 0, DateOnly? OpeningBalanceDate = null,
    bool NotifyStatusByEmail = false, string? City = null, string? District = null, string? ContactName = null,
    bool IsEInvoiceUser = false, string? EInvoiceAlias = null, int? PaymentTermDays = null, bool IsActive = true, decimal? CreditLimit = null,
    CustomerExtras? Extras = null, InvoiceTemplateDto? InvoiceTemplate = null, IReadOnlyList<string>? Groups = null);

/// <summary>e-Fatura için ayrıntılı adres ve iletişim (eski paneldeki firma alanları).</summary>
public record CustomerExtras(string? Country = null, string? Neighborhood = null, string? Street = null, string? BuildingName = null,
    string? BuildingNo = null, string? DoorNo = null, string? PostalCode = null, string? Fax = null, string? Website = null);

/// <summary>Müşterinin fatura şablonu: satırda yazılacak sefer bilgileri, sabit not ve hazır fatura notları.</summary>
public record InvoiceTemplateDto(bool LineDate = true, bool LineLoading = true, bool LineDelivery = true, bool LinePlate = true,
    bool LineVehicleType = false, bool LineDeliveryDocumentNo = false, bool LineCargo = false, bool LineDescription = false,
    bool TripFooterNotes = true, string? Note = null, int? SaleNoteId = null, int? WithholdingNoteId = null, EInvoiceScenario? Scenario = null);

public record InvoiceNoteDto(int Id, InvoiceNoteKind Kind, string Title, string? AccountName, string? Iban, string? Text);

public record InvoiceNoteSaveRequest(InvoiceNoteKind Kind, string Title, string? AccountName, string? Iban, string? Text);

/// <summary>Yeni fatura formu için müşteriye özel öneriler.</summary>
/// <param name="IsCompany">Müşterinin 10 haneli VKN'si var (otomatik tevkifat yalnız şirkete uygulanır).</param>
public record CustomerInvoiceDefaultsDto(string? Notes, EInvoiceScenario? Scenario, int? PaymentTermDays, bool IsCompany = false);

public record CustomerSummaryDto(CustomerDto Customer, decimal TotalDebit, decimal TotalCredit, decimal Balance,
    decimal OverdueAmount, int TripCount);

public record AccountMovementDto(DateOnly Date, string Type, string Reference, string? Description,
    decimal Debit, decimal Credit, decimal RunningBalance, string Status);

public record VehicleDto(int Id, string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId, string? DefaultDriverName, VehicleOwnership Ownership = VehicleOwnership.Own,
    int? SupplierId = null, string? SupplierTitle = null, string? TrailerPlate = null, int? NextMaintenanceKm = null, VehicleCard? Card = null);

public record VehicleSaveRequest(string Plate, string Type, string? Brand, string? Model, int? ModelYear, int Km,
    DateOnly? LastMaintenanceDate, DateOnly? NextMaintenanceDate, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry,
    VehicleStatus Status, int? DefaultDriverId, VehicleOwnership Ownership = VehicleOwnership.Own, int? SupplierId = null,
    string? TrailerPlate = null, int? NextMaintenanceKm = null, VehicleCard? Card = null);

/// <summary>Eski paneldeki araç kartı: kapasite, yakıt, sigorta/kasko/muayene/egzoz bilgisi ve tarihleri, ruhsat sahibi.</summary>
public record VehicleCard(string? Capacity = null, string? FuelType = null, string? InsuranceInfo = null, string? CascoInfo = null,
    DateOnly? CascoExpiry = null, string? InspectionInfo = null, string? EmissionInfo = null, DateOnly? EmissionExpiry = null,
    string? MaintenanceInfo = null, string? RegistrationOwner = null);

public record DriverDto(int Id, string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive, int? SupplierId = null,
    string? SupplierTitle = null, bool HasAppAccount = false, DateTime? LocationConsentAt = null,
    string? LicenseNo = null, int? BirthYear = null, string? Address = null, bool IsForeign = false, string? Plate = null,
    DriverRating? Rating = null, string? Note = null, string? Nationality = null);

public record DriverSaveRequest(string FullName, string? Phone, string? NationalId, string? LicenseClass,
    DateOnly? LicenseExpiry, DateOnly? SrcExpiry, DateOnly? PsychotechnicExpiry, bool IsActive, int? SupplierId = null,
    string? LicenseNo = null, int? BirthYear = null, string? Address = null, bool IsForeign = false, string? Plate = null,
    DriverRating? Rating = null, string? Note = null, string? Nationality = null);

/// <summary>Uninvoiced: faturası kesilmemiş seferler de ekstrede bilgi olarak listelenir.</summary>
public record StatementEmailRequest(DateOnly? From, DateOnly? To, string? Recipient, string? Message, bool Uninvoiced = false);

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
