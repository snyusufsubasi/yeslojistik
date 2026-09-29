namespace YesLojistik.Core.Dtos;

public record CompanySettingsDto(string CompanyName, string? Slogan, string? TaxNumber, string? TaxOffice, string? Address,
    string? Phone, string? Email, string? Iban, string? LogoDataUrl, string InvoicePrefix, int NextInvoiceNumber,
    decimal DefaultVatRate, int DefaultWithholdingTenths, int DefaultPaymentTermDays, bool EmailEnabled = false, bool DailyDigestEnabled = false,
    string? City = null, string? District = null, string? MersisNo = null, string? TradeRegistryNo = null, string? Website = null,
    DateTime? LastBackupAt = null, DateTime? SampleDataClearedAt = null, bool RequireDeliveryPhoto = false, bool RequireDeliverySignature = false,
    bool EInvoiceEnabled = false, string EInvoiceSeriesPrefix = "YES", string EArchiveSeriesPrefix = "YEA",
    YesLojistik.Core.Entities.EInvoiceScenario DefaultScenario = YesLojistik.Core.Entities.EInvoiceScenario.Temel, string? SenderAlias = null);
