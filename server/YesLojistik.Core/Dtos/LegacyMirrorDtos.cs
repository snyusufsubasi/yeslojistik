namespace YesLojistik.Core.Dtos;

/// <summary>
/// Pratikortam'ın bir anlık görüntüsü (tools/legacy/transform.py --json üretir). Ayna senkronu bunu panele uygular:
/// Key ile bulunan kayıt güncellenir, yoksa eklenir; görüntüde olmayan kayıt geri alınabilir şekilde silinir (soft delete).
/// Diğer kayıtlara Key ile bağlanılır (ör. seferin müşterisi CustomerKey).
/// </summary>
public record MirrorSnapshot(
    DateTime? TakenAt,
    List<MirrorParty> Suppliers,
    List<MirrorParty> Customers,
    List<MirrorDriver> Drivers,
    List<MirrorVehicle> Vehicles,
    List<MirrorTrip> Trips,
    List<MirrorExpense> Expenses,
    List<MirrorCashAccount> CashAccounts,
    List<MirrorStaff> Staff);

/// <summary>Müşteri ya da tedarikçi. Balance: pratikortam carisindeki bakiye (yoksa null).</summary>
public record MirrorParty(string Key, string Title, string? TaxNumber, string? TaxOffice, string? Phone, string? Email, string? Iban,
    string? City, string? District, string? ContactName, decimal? Balance);

public record MirrorDriver(string Key, string FullName, string? Phone, string? NationalId, string? LicenseClass, string? SupplierKey);

/// <summary>Own: öz araç (eski panelin Araçlar listesi); değilse OwnerKey taşeronun Key'i.</summary>
public record MirrorVehicle(string Key, string Plate, string Type, bool Own, string? OwnerKey, string? TrailerPlate, string? Brand,
    int? ModelYear, DateOnly? InspectionExpiry, DateOnly? InsuranceExpiry);

public record MirrorTrip(string Key, DateOnly Date, string CustomerKey, string VehicleKey, string DriverKey, string LoadingAddress,
    string DeliveryAddress, string? CargoType, decimal VehicleCost, decimal SalePrice, string? Description, string? DeliveryDocumentNo);

public record MirrorExpense(string Key, DateOnly Date, string Category, decimal Amount, string? VehicleKey, decimal? Liters, int? Odometer,
    string? Description);

public record MirrorCashAccount(string Key, string Name);

public record MirrorStaff(string Key, string FullName, string? NationalId, string? Phone, DateOnly? StartDate, decimal MonthlySalary, string? Notes);

public record MirrorCount(string Entity, int Created, int Updated, int Removed, int Unchanged);

public record MirrorResult(bool DryRun, List<MirrorCount> Counts, string Summary);

public record MirrorStatusDto(bool MirrorMode, DateTime? LastAt, string? LastSummary, Dictionary<string, string> SpellingExceptions);

public record MirrorModeRequest(bool Enabled);
