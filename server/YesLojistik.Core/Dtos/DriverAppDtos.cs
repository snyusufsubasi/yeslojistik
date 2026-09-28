using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

/// <summary>Şoför uygulamasında gösterilen sefer. Fiyat bilgisi içermez.</summary>
public record DriverTripDto(int Id, string CustomerTitle, string? CustomerPhone, string LoadingAddress, string DeliveryAddress,
    DateOnly LoadingDate, DateOnly? DeliveryDate, string? Description, string VehiclePlate, TripStatus Status,
    IReadOnlyList<TripStatus> NextStatuses, int AttachmentCount);

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
    double? Latitude, double? Longitude, DateTime? LastLocationAt);

public record TokenLoginResponse(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresAt, CurrentUserDto User);

public record RefreshTokenRequest(string RefreshToken);

public record PushTokenRequest(string Token, string? Platform);
