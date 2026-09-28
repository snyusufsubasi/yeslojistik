using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public record LoginRequest(string Email, string Password);

public record CurrentUserDto(int Id, string FullName, string Email, UserRole Role);

public record UserDto(int Id, string FullName, string Email, UserRole Role, bool IsActive, DateTime CreatedAt);

public record UserSaveRequest(string FullName, string Email, UserRole Role, bool IsActive, string? Password);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
