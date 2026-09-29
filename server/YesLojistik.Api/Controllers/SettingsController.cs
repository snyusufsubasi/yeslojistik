using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(AppDbContext db, YesLojistik.Core.Abstractions.IEmailSender email) : ControllerBase
{
    [HttpGet]
    public async Task<CompanySettingsDto> Get(CancellationToken ct)
    {
        var s = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        return new CompanySettingsDto(s.CompanyName, s.Slogan, s.TaxNumber, s.TaxOffice, s.Address, s.Phone, s.Email, s.Iban,
            s.LogoDataUrl, s.InvoicePrefix, s.NextInvoiceNumber, s.DefaultVatRate, s.DefaultWithholdingTenths, s.DefaultPaymentTermDays,
            email.IsConfigured, s.DailyDigestEnabled, s.City, s.District, s.MersisNo, s.TradeRegistryNo, s.Website,
            s.LastBackupAt, s.SampleDataClearedAt, s.RequireDeliveryPhoto, s.RequireDeliverySignature);
    }

    [Authorize(Policy = Policies.Admin)]
    [HttpPut]
    public async Task<CompanySettingsDto> Update(CompanySettingsDto req, CancellationToken ct)
    {
        var s = await db.CompanySettings.FirstAsync(ct);
        if (req.NextInvoiceNumber < s.NextInvoiceNumber && req.InvoicePrefix == s.InvoicePrefix)
            throw new DomainException("Sıradaki fatura numarası geriye alınamaz (numara çakışması olur).");
        s.CompanyName = req.CompanyName.Trim();
        s.Slogan = CustomersController.NullIfEmpty(req.Slogan);
        s.TaxNumber = CustomersController.NullIfEmpty(req.TaxNumber);
        s.TaxOffice = CustomersController.NullIfEmpty(req.TaxOffice);
        s.Address = CustomersController.NullIfEmpty(req.Address);
        s.Phone = Formatters.NormalizePhone(req.Phone);
        s.Email = CustomersController.NullIfEmpty(req.Email);
        s.Iban = CustomersController.NullIfEmpty(req.Iban);
        s.LogoDataUrl = CustomersController.NullIfEmpty(req.LogoDataUrl);
        s.InvoicePrefix = req.InvoicePrefix;
        s.NextInvoiceNumber = req.NextInvoiceNumber;
        s.DefaultVatRate = req.DefaultVatRate;
        s.DefaultWithholdingTenths = req.DefaultWithholdingTenths;
        s.DefaultPaymentTermDays = req.DefaultPaymentTermDays;
        s.DailyDigestEnabled = req.DailyDigestEnabled;
        s.RequireDeliveryPhoto = req.RequireDeliveryPhoto;
        s.RequireDeliverySignature = req.RequireDeliverySignature;
        s.City = Cities.Normalize(req.City);
        s.District = CustomersController.NullIfEmpty(req.District);
        s.MersisNo = CustomersController.NullIfEmpty(req.MersisNo);
        s.TradeRegistryNo = CustomersController.NullIfEmpty(req.TradeRegistryNo);
        s.Website = CustomersController.NullIfEmpty(req.Website);
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    public record ResetDataRequest(string Confirm);

    /// <summary>Canlıya geçiş: demo/deneme verilerini siler. Onay için "SİL" yazılması gerekir.</summary>
    [Authorize(Policy = Policies.Admin)]
    [HttpPost("reset-data")]
    public async Task<IActionResult> ResetData(ResetDataRequest req, [FromServices] YesLojistik.Infrastructure.Services.DataResetService reset, CancellationToken ct)
    {
        if (req.Confirm?.Trim().ToUpperInvariant() is not ("SİL" or "SIL"))
            throw new DomainException("Onaylamak için kutuya SİL yazın.");
        await reset.ResetAsync(User.Identity?.Name ?? "yönetici", ct);
        return NoContent();
    }
}
