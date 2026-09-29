using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

/// <summary>Şoför uygulamasında gösterilen sefer. Fiyat bilgisi içermez.</summary>
public record DriverTripDto(int Id, string CustomerTitle, string? CustomerPhone, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, string VehiclePlate, TripStatus Status,
    IReadOnlyList<TripStatus> NextStatuses, int AttachmentCount, string? CustomerReference = null, string? Cargo = null,
    string? TrailerPlate = null, string? LoadingCity = null, string? DeliveryCity = null, string? LoadingContact = null,
    string? DeliveryContact = null);

public record LocationPing(double Latitude, double Longitude, double? SpeedKmh, double? Heading, double? Accuracy, DateTime? RecordedAt);

public record AttachmentDto(int Id, int TripId, AttachmentKind Kind, string FileName, string ContentType, long Size,
    string? Note, string? UploadedBy, DateTime CreatedAt);

public record VehicleLocationDto(int VehicleId, string Plate, string Type, VehicleStatus Status, double? Latitude, double? Longitude,
    double? SpeedKmh, DateTime? LastLocationAt, int? ActiveTripId, string? ActiveTripLabel, string? DriverName);

public record RoutePointDto(double Latitude, double Longitude, double? SpeedKmh, DateTime RecordedAt);

public record TrackingLinkDto(string Token, string Url);

/// <summary>Müşteriye açık takip sayfası. Fiyat, telefon gibi bilgiler içermez.</summary>
public record PublicTrackingDto(string CompanyName, string? CompanyPhone, string CustomerTitle, string LoadingAddress,
    string DeliveryAddress, DateOnly LoadingDate, DateOnly? DeliveryDate, TripStatus Status, string VehiclePlate,
    double? Latitude, double? Longitude, DateTime? LastLocationAt, IReadOnlyList<PublicTripEvent>? Events = null,
    string? CustomerReference = null);

/// <summary>Takip sayfasındaki zaman çizelgesi (kim yaptığı gösterilmez).</summary>
public record PublicTripEvent(TripStatus Status, DateTime OccurredAt);

public record TokenLoginResponse(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresAt, CurrentUserDto User);

public record RefreshTokenRequest(string RefreshToken);

public record PushTokenRequest(string Token, string? Platform);

/// <summary>Şoförün yolda girdiği masraf (yakıt, otoyol, bakım/onarım, diğer).</summary>
public record DriverExpenseRequest(ExpenseCategory Category, decimal Amount, decimal? Liters, int? Odometer, string? Description);

public record DriverExpenseDto(int Id, ExpenseCategory Category, decimal Amount, DateOnly Date, decimal? Liters, int? Odometer, string? Description,
    ApprovalStatus ApprovalStatus = ApprovalStatus.Approved, bool HasReceipt = false, string? RejectionReason = null);

/// <summary>Konum paylaşımı rızası. Version: uygulamada gösterilen açıklama metninin sürümü.</summary>
public record LocationConsentRequest(bool Accepted, string Version);

/// <summary>Şoförün ana ekranı: kendi bilgileri, belge bitiş tarihleri ve firmanın teslim kuralları.</summary>
public record DriverProfileDto(int DriverId, string FullName, string? Phone, string? VehiclePlate, string CompanyName, string? CompanyPhone,
    DateOnly? LicenseExpiry = null, DateOnly? SrcExpiry = null, DateOnly? PsychotechnicExpiry = null, DateTime? LocationConsentAt = null,
    string? LocationConsentVersion = null, bool RequireDeliveryPhoto = false, bool RequireDeliverySignature = false);
