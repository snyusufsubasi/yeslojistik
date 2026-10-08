using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

/// <summary>Planlama panosunun bir satırı: araç (öz mal ya da kiralık), tipi, dorse plakası ve varsayılan şoförü.</summary>
public record PlanningVehicleDto(int Id, string Plate, string Type, string? TrailerPlate, VehicleOwnership Ownership, string? SupplierTitle,
    VehicleStatus Status, int? DefaultDriverId, string? DefaultDriverName, List<PlanningDocDto>? Documents = null);

/// <summary>Süresi dolmuş ya da 30 gün içinde dolacak belge (muayene, sigorta, SRC, psikoteknik…).</summary>
public record PlanningDocDto(string What, DateOnly Expiry);

/// <summary>Panonun şoför listesi: aktif şoför, taşeronu (varsa) ve süresi dolan belgeleri. Müsaitlik sevkiyat bloklarından hesaplanır.</summary>
public record PlanningDriverDto(int Id, string FullName, string? Phone, string? SupplierTitle, List<PlanningDocDto> Documents);

/// <summary>
/// Panodaki sevkiyat bloğu: yükleme gününden bitiş gününe (<see cref="EndDate"/>) uzanır.
/// Bitiş: teslim tarihi; yoksa yüklenmiş/yoldaki seferde bugün, diğerlerinde yükleme günü.
/// </summary>
/// <param name="Conflict">Aynı araçta zamanı çakışan başka bir sevkiyat var.</param>
/// <param name="DriverConflict">Aynı şoförün aynı günlerde başka araçta sevkiyatı var.</param>
/// <param name="Warnings">Araç ya da şoför belgesi sevkiyat bitmeden doluyor/dolmuş (ör. "Araç muayenesi 12.10.2026'da doluyor").</param>
public record PlanningTripDto(int Id, string? ExternalRef, int VehicleId, int DriverId, string DriverName, string Customer,
    string? LoadingCity, string? DeliveryCity, string LoadingAddress, string DeliveryAddress, DateOnly LoadingDate, DateOnly? DeliveryDate,
    DateOnly EndDate, TimeOnly? LoadingTime, TripStatus Status, bool Conflict, string? ProblemReason, bool CanAssign,
    bool DriverConflict = false, List<string>? Warnings = null);

/// <summary>"Atanmamış" şeridindeki iş: araç ve şoför atanmamış (bekleyen) iş talebi.</summary>
public record PlanningRequestDto(int Id, string Customer, DateOnly Date, string LoadingAddress, string DeliveryAddress,
    string? VehicleType, string? CargoType, string? DeliveryWindow, decimal? SalePrice);

/// <summary>GET /api/planning?from=&amp;to=: araç × gün panosunun tamamı (tek istek).</summary>
public record PlanningDto(DateOnly From, DateOnly To, DateOnly Today, List<PlanningVehicleDto> Vehicles, List<PlanningTripDto> Trips,
    List<PlanningRequestDto> Unassigned, int ConflictCount, List<PlanningDriverDto>? Drivers = null, int DriverConflictCount = 0,
    int WarningCount = 0);

/// <summary>
/// Panodan araca atama. <see cref="TripId"/> (var olan sevkiyatı başka araca/güne taşı) ya da <see cref="JobRequestId"/>
/// (bekleyen iş talebinden sevkiyat aç) verilir. <see cref="Date"/> yeni yükleme günü (boşsa değişmez);
/// <see cref="DriverId"/> boşsa aracın varsayılan şoförü, o da yoksa mevcut şoför kalır.
/// </summary>
public record PlanningAssignRequest(int VehicleId, int? TripId = null, int? JobRequestId = null, DateOnly? Date = null, int? DriverId = null);

/// <summary>
/// Atamanın sonucu: sevkiyat, yeni açıldı mı, aynı araçta / aynı şoförde çakışan sevkiyatlar ve belge uyarıları
/// (hepsi uyarıdır; atama yine yapılır).
/// </summary>
public record PlanningAssignResultDto(int TripId, bool Created, List<int> ConflictsWith, List<int>? DriverConflictsWith = null,
    List<string>? Warnings = null);
