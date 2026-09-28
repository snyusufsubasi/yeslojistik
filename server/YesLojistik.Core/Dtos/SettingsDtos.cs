namespace YesLojistik.Core.Dtos;

public record CompanySettingsDto(string CompanyName, string? Slogan, string? TaxNumber, string? TaxOffice, string? Address,
    string? Phone, string? Email, string? Iban, string? LogoDataUrl, string InvoicePrefix, int NextInvoiceNumber,
    decimal DefaultVatRate, int DefaultWithholdingTenths, int DefaultPaymentTermDays, bool EmailEnabled = false, bool DailyDigestEnabled = false);
