using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record LoginRequest(string Email, string Password);

public record CurrentUserDto(int Id, string FullName, string Email, UserRole Role);

public record UserDto(int Id, string FullName, string Email, UserRole Role, bool IsActive, DateTime CreatedAt,
    int? DriverId = null, string? DriverName = null, DateTime? LockoutUntil = null, DateTime? LastLoginAt = null);

public record UserSaveRequest(string FullName, string Email, UserRole Role, bool IsActive, string? Password, int? DriverId = null);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);
