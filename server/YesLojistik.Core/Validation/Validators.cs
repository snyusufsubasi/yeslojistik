using FluentValidation;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

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

public class InvoiceEmailRequestValidator : AbstractValidator<InvoiceEmailRequest>
{
    public InvoiceEmailRequestValidator()
    {
        RuleFor(x => x.To).EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.").When(x => !string.IsNullOrWhiteSpace(x.To));
        RuleFor(x => x.Message).MaximumLength(2000);
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

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Bağlantı geçersiz.");
        RuleFor(x => x.NewPassword).Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.Message);
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
        RuleFor(x => x.City).Must(Cities.IsValid).WithMessage("Listeden geçerli bir il seçin.");
        RuleFor(x => x.District).MaximumLength(50);
        RuleFor(x => x.ContactName).MaximumLength(100);
        RuleFor(x => x.EInvoiceAlias).MaximumLength(200);
        RuleFor(x => x.PaymentTermDays).InclusiveBetween(0, 365).WithMessage("Vade 0-365 gün arasında olmalı.").When(x => x.PaymentTermDays.HasValue);
    }
}

public class SupplierSaveRequestValidator : AbstractValidator<SupplierSaveRequest>
{
    public SupplierSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Tedarikçi ünvanı zorunlu.").MaximumLength(200);
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.TaxNumber)
            .Must(TaxNumberValidator.IsValid).WithMessage("Geçersiz VKN (10 hane) veya TCKN (11 hane).")
            .When(x => !string.IsNullOrWhiteSpace(x.TaxNumber));
        RuleFor(x => x.TaxOffice).MaximumLength(100);
        RuleFor(x => x.Phone).ValidPhone();
        RuleFor(x => x.Email).OptionalEmail().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Address).MaximumLength(500);
        RuleFor(x => x.City).Must(Cities.IsValid).WithMessage("Listeden geçerli bir il seçin.");
        RuleFor(x => x.District).MaximumLength(50);
        RuleFor(x => x.Iban).Must(IbanValidator.IsValid).WithMessage("Geçersiz IBAN (TR ile başlayan 26 karakter).")
            .When(x => !string.IsNullOrWhiteSpace(x.Iban));
        RuleFor(x => x.ContactName).MaximumLength(100);
        RuleFor(x => x.PaymentTermDays).InclusiveBetween(0, 365).WithMessage("Vade 0-365 gün arasında olmalı.");
        RuleFor(x => x.Notes).MaximumLength(1000);
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
        RuleFor(x => x.Ownership).IsInEnum();
        RuleFor(x => x.SupplierId).NotNull().WithMessage("Kiralık araç için araç sahibini (tedarikçi) seçin.")
            .When(x => x.Ownership == VehicleOwnership.Rented);
        RuleFor(x => x.TrailerPlate).MaximumLength(15);
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
        RuleFor(x => x.LicenseNo).MaximumLength(30);
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.Plate).MaximumLength(20);
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x.BirthYear).InclusiveBetween(1930, 2015).WithMessage("Geçerli bir doğum yılı girin.").When(x => x.BirthYear.HasValue);
        RuleFor(x => x.Rating).IsInEnum().When(x => x.Rating.HasValue);
    }
}

public class JobRequestSaveRequestValidator : AbstractValidator<JobRequestSaveRequest>
{
    public JobRequestSaveRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müşteri seçin.");
        RuleFor(x => x.Date).NotEmpty().WithMessage("Tarih zorunlu.");
        RuleFor(x => x.LoadingAddress).NotEmpty().MaximumLength(300);
        RuleFor(x => x.DeliveryAddress).NotEmpty().MaximumLength(300);
        RuleFor(x => x.DeliveryWindow).MaximumLength(100);
        RuleFor(x => x.CargoType).MaximumLength(100);
        RuleFor(x => x.VehicleType).MaximumLength(100);
        RuleFor(x => x.CargoQuantity).InclusiveBetween(0, 1_000_000).When(x => x.CargoQuantity.HasValue);
        RuleFor(x => x.LoadingDocumentNo).MaximumLength(50);
        RuleFor(x => x.WaybillNo).MaximumLength(50);
        RuleFor(x => x.InvoiceFooterNote).MaximumLength(500);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.SalePrice).InclusiveBetween(0, 1_000_000_000).When(x => x.SalePrice.HasValue);
        RuleFor(x => x.CarrierPrice).InclusiveBetween(0, 1_000_000_000).When(x => x.CarrierPrice.HasValue);
        RuleFor(x => x.Commission).InclusiveBetween(0, 1_000_000_000).When(x => x.Commission.HasValue);
        RuleFor(x => x.DriverBonus).InclusiveBetween(0, 1_000_000_000).When(x => x.DriverBonus.HasValue);
        RuleFor(x => x.OtherExpense).InclusiveBetween(0, 1_000_000_000).When(x => x.OtherExpense.HasValue);
        RuleFor(x => x.LoadingLatitude).InclusiveBetween(-90, 90).When(x => x.LoadingLatitude.HasValue);
        RuleFor(x => x.DeliveryLatitude).InclusiveBetween(-90, 90).When(x => x.DeliveryLatitude.HasValue);
        RuleFor(x => x.LoadingLongitude).InclusiveBetween(-180, 180).When(x => x.LoadingLongitude.HasValue);
        RuleFor(x => x.DeliveryLongitude).InclusiveBetween(-180, 180).When(x => x.DeliveryLongitude.HasValue);
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
        RuleFor(x => x.LoadingCity).Must(Cities.IsValid).WithMessage("Listeden geçerli bir il seçin.");
        RuleFor(x => x.DeliveryCity).Must(Cities.IsValid).WithMessage("Listeden geçerli bir il seçin.");
        RuleFor(x => x.CustomerReference).MaximumLength(50);
        RuleFor(x => x.CargoType).MaximumLength(100);
        RuleFor(x => x.CargoWeightKg).InclusiveBetween(0, 1_000_000).WithMessage("Ağırlık 0-1.000.000 kg arasında olmalı.").When(x => x.CargoWeightKg.HasValue);
        RuleFor(x => x.CargoQuantity).InclusiveBetween(0, 1_000_000).WithMessage("Geçersiz miktar.").When(x => x.CargoQuantity.HasValue);
        RuleFor(x => x.CargoUnit).MaximumLength(20);
        RuleFor(x => x.TrailerPlate).MaximumLength(15);
        RuleFor(x => x.LoadingContact).MaximumLength(150);
        RuleFor(x => x.DeliveryContact).MaximumLength(150);
        RuleFor(x => x.CarrierInvoiceNo).MaximumLength(50);
        RuleFor(x => x.Terms!).SetValidator(new TripTermsValidator()).When(x => x.Terms != null);
    }
}

public class TripTermsValidator : AbstractValidator<TripTerms>
{
    private static readonly decimal[] VatRates = [0, 1, 8, 10, 18, 20];

    public TripTermsValidator()
    {
        RuleFor(x => x.SaleVatRate).Must(v => VatRates.Contains(v)).WithMessage("KDV oranı 0, 1, 8, 10, 18 veya 20 olmalı.");
        RuleFor(x => x.CostVatRate).Must(v => VatRates.Contains(v)).WithMessage("KDV oranı 0, 1, 8, 10, 18 veya 20 olmalı.");
        RuleFor(x => x.SaleWithholdingTenths).InclusiveBetween(0, 10).WithMessage("Tevkifat 0-10/10 arasında olmalı.").When(x => x.SaleWithholdingTenths.HasValue);
        RuleFor(x => x.CostWithholdingTenths).InclusiveBetween(0, 10).WithMessage("Tevkifat 0-10/10 arasında olmalı.").When(x => x.CostWithholdingTenths.HasValue);
        RuleFor(x => x.Commission).Amount();
        RuleFor(x => x.ExtraCharge).Amount();
        RuleFor(x => x.DriverBonus).Amount();
        RuleFor(x => x.CommissionStatus).IsInEnum();
        RuleFor(x => x.ExtraChargeTaxNo).Must(v => TaxNumberValidator.IsValid(v!)).WithMessage("Geçersiz VKN/TCKN.")
            .When(x => !string.IsNullOrWhiteSpace(x.ExtraChargeTaxNo));
        RuleFor(x => x.ExtraChargeTitle).MaximumLength(200);
        RuleFor(x => x.CustomerGroup).MaximumLength(50);
        RuleFor(x => x.DeliveryDocumentNo).MaximumLength(50);
        RuleFor(x => x.WaybillNo).MaximumLength(50);
        RuleFor(x => x.EWaybillNo).MaximumLength(50);
        RuleFor(x => x.InvoiceFooterNote).MaximumLength(500);
        RuleFor(x => x.DeliveredBy).MaximumLength(100);
        RuleFor(x => x.PaymentTerms).MaximumLength(100);
        RuleFor(x => x.ExternalRef).MaximumLength(40);
        RuleFor(x => x.DistanceKm).InclusiveBetween(0, 20_000).WithMessage("Mesafe 0-20.000 km arasında olmalı.").When(x => x.DistanceKm.HasValue);
        RuleFor(x => x.LoadingLatitude).InclusiveBetween(-90, 90).When(x => x.LoadingLatitude.HasValue);
        RuleFor(x => x.DeliveryLatitude).InclusiveBetween(-90, 90).When(x => x.DeliveryLatitude.HasValue);
        RuleFor(x => x.LoadingLongitude).InclusiveBetween(-180, 180).When(x => x.LoadingLongitude.HasValue);
        RuleFor(x => x.DeliveryLongitude).InclusiveBetween(-180, 180).When(x => x.DeliveryLongitude.HasValue);
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
        RuleFor(x => x.InstrumentDueDate).NotNull().When(x => x.Method is PaymentMethod.Check or PaymentMethod.PromissoryNote)
            .WithMessage("Çek/senet için vade tarihini girin.");
        RuleFor(x => x.InstrumentNo).MaximumLength(50);
        RuleFor(x => x.Bank).MaximumLength(100);
    }
}

public class ExpenseSaveRequestValidator : AbstractValidator<ExpenseSaveRequest>
{
    public ExpenseSaveRequestValidator()
    {
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.DriverId).NotNull().WithMessage("Avans için şoför seçin.")
            .When(x => x.Category == ExpenseCategory.DriverAdvance && x.TripId is null);
        RuleFor(x => x.Liters).GreaterThan(0).LessThan(5_000).WithMessage("Litre 0 ile 5.000 arasında olmalı.").When(x => x.Liters is not null);
        RuleFor(x => x.Odometer).InclusiveBetween(0, 10_000_000).WithMessage("Geçersiz kilometre.").When(x => x.Odometer is not null);
    }
}

public class SupplierPaymentSaveRequestValidator : AbstractValidator<SupplierPaymentSaveRequest>
{
    public SupplierPaymentSaveRequestValidator()
    {
        RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage("Tedarikçi seçin.");
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Method).IsInEnum();
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
        RuleFor(x => x.EInvoiceSeriesPrefix).Matches("^[A-Za-z0-9]{3}$").WithMessage("e-Fatura seri öneki 3 karakter olmalı (ör. YES).");
        RuleFor(x => x.EArchiveSeriesPrefix).Matches("^[A-Za-z0-9]{3}$").WithMessage("e-Arşiv seri öneki 3 karakter olmalı (ör. YEA).")
            .Must((x, p) => !string.Equals(p, x.EInvoiceSeriesPrefix, StringComparison.OrdinalIgnoreCase)).WithMessage("e-Arşiv ve e-Fatura seri önekleri farklı olmalı.");
        RuleFor(x => x.NextInvoiceNumber).GreaterThan(0);
        RuleFor(x => x.DefaultVatRate).InclusiveBetween(0, 100);
        RuleFor(x => x.DefaultWithholdingTenths).InclusiveBetween(0, 10);
        RuleFor(x => x.DefaultPaymentTermDays).InclusiveBetween(0, 365);
        RuleFor(x => x.City).Must(Cities.IsValid).WithMessage("Listeden geçerli bir il seçin.");
        RuleFor(x => x.District).MaximumLength(50);
        RuleFor(x => x.MersisNo).Matches("^[0-9]{16}$").WithMessage("MERSİS numarası 16 hane olmalı.").When(x => !string.IsNullOrWhiteSpace(x.MersisNo));
        RuleFor(x => x.TradeRegistryNo).MaximumLength(30);
        RuleFor(x => x.Website).MaximumLength(200);
        RuleFor(x => x.LogoDataUrl).Must(v => (v!.StartsWith("data:image/png;base64,") || v.StartsWith("data:image/jpeg;base64,")) && v.Length < 700_000)
            .WithMessage("Logo 500 KB'dan küçük PNG veya JPEG olmalı.").When(x => !string.IsNullOrEmpty(x.LogoDataUrl));
    }
}

public class DriverExpenseRequestValidator : AbstractValidator<DriverExpenseRequest>
{
    public static readonly ExpenseCategory[] Allowed = [ExpenseCategory.Fuel, ExpenseCategory.Toll, ExpenseCategory.Maintenance, ExpenseCategory.Other];

    public DriverExpenseRequestValidator()
    {
        RuleFor(x => x.Category).Must(c => Allowed.Contains(c)).WithMessage("Bu masraf türü uygulamadan girilemez.");
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.").LessThanOrEqualTo(1_000_000).WithMessage("Tutar çok yüksek.");
        RuleFor(x => x.Liters).GreaterThan(0).LessThan(5_000).WithMessage("Litre 0 ile 5.000 arasında olmalı.").When(x => x.Liters is not null);
        RuleFor(x => x.Odometer).InclusiveBetween(0, 10_000_000).WithMessage("Geçersiz kilometre.").When(x => x.Odometer is not null);
        RuleFor(x => x.Description).MaximumLength(300);
    }
}

public class DriverSettlementSaveRequestValidator : AbstractValidator<DriverSettlementSaveRequest>
{
    public DriverSettlementSaveRequestValidator()
    {
        RuleFor(x => x.DriverId).GreaterThan(0).WithMessage("Şoför seçin.");
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Direction).IsInEnum();
        RuleFor(x => x.Method).IsInEnum();
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class DocumentSaveRequestValidator : AbstractValidator<DocumentSaveRequest>
{
    public DocumentSaveRequestValidator()
    {
        RuleFor(x => x.OwnerType).IsInEnum();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.OwnerId).NotNull().When(x => x.OwnerType != DocumentOwnerType.Company).WithMessage("Belgenin sahibini seçin.");
        RuleFor(x => x.No).MaximumLength(50);
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x.ExpiryDate).GreaterThanOrEqualTo(x => x.IssueDate).When(x => x.IssueDate != null && x.ExpiryDate != null)
            .WithMessage("Bitiş tarihi veriliş tarihinden önce olamaz.");
    }
}

public class MaintenanceSaveRequestValidator : AbstractValidator<MaintenanceSaveRequest>
{
    public MaintenanceSaveRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Cost).Amount().GreaterThanOrEqualTo(0).WithMessage("Tutar negatif olamaz.");
        RuleFor(x => x.Km).InclusiveBetween(0, 10_000_000).When(x => x.Km != null).WithMessage("Kilometre geçersiz.");
        RuleFor(x => x.NextDueKm).InclusiveBetween(0, 10_000_000).When(x => x.NextDueKm != null).WithMessage("Sonraki bakım kilometresi geçersiz.");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.NextDueDate).GreaterThan(x => x.Date).When(x => x.NextDueDate != null).WithMessage("Sonraki bakım tarihi bakım tarihinden sonra olmalı.");
    }
}

public class ExpenseRejectRequestValidator : AbstractValidator<ExpenseRejectRequest>
{
    public ExpenseRejectRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Reddetme gerekçesini yazın; şoföre iletilecek.").MaximumLength(300);
    }
}

public class CashAccountSaveRequestValidator : AbstractValidator<CashAccountSaveRequest>
{
    public CashAccountSaveRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Hesap adı zorunlu.").MaximumLength(100);
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.Iban).Must(IbanValidator.IsValid).When(x => !string.IsNullOrWhiteSpace(x.Iban)).WithMessage("IBAN geçersiz (TR ile başlayan 26 karakter).");
        RuleFor(x => x.OpeningBalance).Amount();
    }
}

public class CashTransferSaveRequestValidator : AbstractValidator<CashTransferSaveRequest>
{
    public CashTransferSaveRequestValidator()
    {
        RuleFor(x => x.FromAccountId).GreaterThan(0).WithMessage("Çıkış hesabını seçin.");
        RuleFor(x => x.ToAccountId).GreaterThan(0).WithMessage("Giriş hesabını seçin.");
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class InstrumentStatusRequestValidator : AbstractValidator<InstrumentStatusRequest>
{
    public InstrumentStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.SupplierId).NotNull().When(x => x.Status == InstrumentStatus.Endorsed).WithMessage("Ciro için tedarikçiyi seçin.");
    }
}

public class StaffSaveRequestValidator : AbstractValidator<StaffSaveRequest>
{
    public StaffSaveRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunlu.").MaximumLength(150);
        RuleFor(x => x.NationalId).Must(v => TaxNumberValidator.IsValidTckn(v!)).When(x => !string.IsNullOrWhiteSpace(x.NationalId)).WithMessage("Geçersiz TC kimlik numarası.");
        RuleFor(x => x.Phone).ValidPhone();
        RuleFor(x => x.MonthlySalary).Amount().GreaterThanOrEqualTo(0).WithMessage("Maaş eksi olamaz.");
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class StaffTransactionSaveRequestValidator : AbstractValidator<StaffTransactionSaveRequest>
{
    public StaffTransactionSaveRequestValidator()
    {
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class RecurringPaymentSaveRequestValidator : AbstractValidator<RecurringPaymentSaveRequest>
{
    public RecurringPaymentSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Başlık zorunlu.").MaximumLength(150);
        RuleFor(x => x.Detail).MaximumLength(500);
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.DueDay).InclusiveBetween(1, 28).WithMessage("Ödeme günü 1 ile 28 arasında olmalı.");
        RuleFor(x => x.Category).IsInEnum();
    }
}

public class RecurringPayRequestValidator : AbstractValidator<RecurringPayRequest>
{
    public RecurringPayRequestValidator()
    {
        RuleFor(x => x.Amount).Amount().GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
    }
}
