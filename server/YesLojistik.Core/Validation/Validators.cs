using FluentValidation;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;

namespace YesLojistik.Core.Validation;

internal static class Rules
{
    public static IRuleBuilderOptions<T, string?> ValidPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(p => string.IsNullOrWhiteSpace(p) || Formatters.NormalizePhone(p) != null)
            .WithMessage("Geçerli bir telefon numarası girin (ör. 0532 123 45 67).");

    public static IRuleBuilderOptions<T, string?> OptionalEmail<T>(this IRuleBuilder<T, string?> rule) =>
        rule.EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.").MaximumLength(200);

    public static IRuleBuilderOptions<T, decimal> Amount<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.GreaterThanOrEqualTo(0).WithMessage("Tutar negatif olamaz.")
            .LessThan(1_000_000_000).WithMessage("Tutar çok büyük.")
            .Must(v => decimal.Round(v, 2) == v).WithMessage("Tutar en fazla 2 ondalık basamak içerebilir.");
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunlu.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Şifre zorunlu.");
    }
}

public static class PasswordPolicy
{
    public const string Message = "Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.";
    public static bool IsValid(string? p) =>
        p is { Length: >= 8 } && p.Any(char.IsLetter) && p.Any(char.IsDigit);
}

public class UserSaveRequestValidator : AbstractValidator<UserSaveRequest>
{
    public UserSaveRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunlu.").MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunlu.").EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");
        RuleFor(x => x.Role).IsInEnum();
        RuleFor(x => x.Password).Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.Message)
            .When(x => !string.IsNullOrEmpty(x.Password));
        RuleFor(x => x.DriverId).NotNull().WithMessage("Şoför rolündeki kullanıcı bir şoföre bağlanmalı.")
            .When(x => x.Role == Entities.UserRole.Driver);
    }
}

public class LocationPingValidator : AbstractValidator<LocationPing>
{
    public LocationPingValidator()
    {
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.SpeedKmh).InclusiveBetween(0, 300).When(x => x.SpeedKmh.HasValue);
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Mevcut şifre zorunlu.");
        RuleFor(x => x.NewPassword).Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.Message);
    }
}

public class CustomerSaveRequestValidator : AbstractValidator<CustomerSaveRequest>
{
    public CustomerSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Müşteri ünvanı zorunlu.").MaximumLength(200);
        RuleFor(x => x.TaxNumber)
            .Must(TaxNumberValidator.IsValid).WithMessage("Geçersiz VKN (10 hane) veya TCKN (11 hane).")
            .When(x => !string.IsNullOrWhiteSpace(x.TaxNumber));
        RuleFor(x => x.TaxOffice).MaximumLength(100);
        RuleFor(x => x.Phone).ValidPhone();
        RuleFor(x => x.Email).OptionalEmail().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Address).MaximumLength(500);
        RuleFor(x => x.OpeningBalance).Amount();
    }
}

public class VehicleSaveRequestValidator : AbstractValidator<VehicleSaveRequest>
{
    public VehicleSaveRequestValidator()
    {
        RuleFor(x => x.Plate).NotEmpty().WithMessage("Plaka zorunlu.")
            .Must(p => Formatters.NormalizePlate(p) != null).WithMessage("Geçerli bir plaka girin (ör. 34 ABC 123).");
        RuleFor(x => x.Type).NotEmpty().WithMessage("Araç tipi zorunlu.").MaximumLength(100);
        RuleFor(x => x.ModelYear).InclusiveBetween(1970, DateTime.Today.Year + 1).WithMessage("Geçersiz model yılı.")
            .When(x => x.ModelYear.HasValue);
        RuleFor(x => x.Km).GreaterThanOrEqualTo(0).WithMessage("Km negatif olamaz.");
        RuleFor(x => x.Status).IsInEnum();
    }
}

public class DriverSaveRequestValidator : AbstractValidator<DriverSaveRequest>
{
    public DriverSaveRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunlu.").MaximumLength(100);
        RuleFor(x => x.Phone).ValidPhone();
        RuleFor(x => x.NationalId).Must(v => TaxNumberValidator.IsValidTckn(v!)).WithMessage("Geçersiz TC kimlik numarası.")
            .When(x => !string.IsNullOrWhiteSpace(x.NationalId));
        RuleFor(x => x.LicenseClass).MaximumLength(20);
    }
}

public class TripSaveRequestValidator : AbstractValidator<TripSaveRequest>
{
    public TripSaveRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müşteri seçin.");
        RuleFor(x => x.VehicleId).GreaterThan(0).WithMessage("Araç seçin.");
        RuleFor(x => x.DriverId).GreaterThan(0).WithMessage("Şoför seçin.");
        RuleFor(x => x.LoadingAddress).NotEmpty().WithMessage("Yükleme adresi zorunlu.").MaximumLength(300);
        RuleFor(x => x.DeliveryAddress).NotEmpty().WithMessage("Teslimat adresi zorunlu.").MaximumLength(300);
        RuleFor(x => x.DeliveryDate).GreaterThanOrEqualTo(x => x.LoadingDate)
            .WithMessage("Teslim tarihi yükleme tarihinden önce olamaz.").When(x => x.DeliveryDate.HasValue);
        RuleFor(x => x.VehicleCost).Amount();
        RuleFor(x => x.SalePrice).Amount();
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}

public class InvoiceCreateRequestValidator : AbstractValidator<InvoiceCreateRequest>
{
    public InvoiceCreateRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müşteri seçin.");
        RuleFor(x => x.VatRate).InclusiveBetween(0, 100).WithMessage("KDV oranı 0-100 arasında olmalı.");
        RuleFor(x => x.WithholdingTenths).InclusiveBetween(0, 10).WithMessage("Tevkifat oranı 0/10 - 10/10 arasında olmalı.");
        RuleFor(x => x.DueDate).GreaterThanOrEqualTo(x => x.Date).WithMessage("Vade tarihi fatura tarihinden önce olamaz.")
            .When(x => x.DueDate.HasValue);
        RuleFor(x => x).Must(x => x.TripIds.Count > 0 || x.ExtraLines is { Count: > 0 })
            .WithMessage("Faturaya en az bir sefer veya satır ekleyin.");
        RuleForEach(x => x.ExtraLines).ChildRules(l =>
        {
            l.RuleFor(y => y.Description).NotEmpty().WithMessage("Satır açıklaması zorunlu.").MaximumLength(300);
            l.RuleFor(y => y.Amount).Amount();
        });
    }
}

public class PaymentSaveRequestValidator : AbstractValidator<PaymentSaveRequest>
{
    public PaymentSaveRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müşteri seçin.");
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Method).IsInEnum();
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class ExpenseSaveRequestValidator : AbstractValidator<ExpenseSaveRequest>
{
    public ExpenseSaveRequestValidator()
    {
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class CompanySettingsValidator : AbstractValidator<CompanySettingsDto>
{
    public CompanySettingsValidator()
    {
        RuleFor(x => x.CompanyName).NotEmpty().WithMessage("Firma adı zorunlu.").MaximumLength(200);
        RuleFor(x => x.TaxNumber).Must(TaxNumberValidator.IsValid).WithMessage("Geçersiz VKN/TCKN.")
            .When(x => !string.IsNullOrWhiteSpace(x.TaxNumber));
        RuleFor(x => x.Phone).ValidPhone();
        RuleFor(x => x.InvoicePrefix).NotEmpty().Matches("^[A-Z]{1,5}$").WithMessage("Fatura ön eki 1-5 büyük harf olmalı.");
        RuleFor(x => x.NextInvoiceNumber).GreaterThan(0);
        RuleFor(x => x.DefaultVatRate).InclusiveBetween(0, 100);
        RuleFor(x => x.DefaultWithholdingTenths).InclusiveBetween(0, 10);
        RuleFor(x => x.DefaultPaymentTermDays).InclusiveBetween(0, 365);
        RuleFor(x => x.LogoDataUrl).Must(v => (v!.StartsWith("data:image/png;base64,") || v.StartsWith("data:image/jpeg;base64,")) && v.Length < 700_000)
            .WithMessage("Logo 500 KB'dan küçük PNG veya JPEG olmalı.").When(x => !string.IsNullOrEmpty(x.LogoDataUrl));
    }
}
