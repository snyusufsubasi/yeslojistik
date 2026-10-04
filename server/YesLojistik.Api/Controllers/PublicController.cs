using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

public record PublicCompanyDto(string CompanyName, string? Address, string? Phone, string? Email, string? TaxOffice, string? TaxNumber,
    string? MersisNo, string? Website, int LocationRetentionDays);

public record PublicBrandingDto(string CompanyName, string? LogoDataUrl);

/// <summary>Giriş gerektirmeyen bilgiler: gizlilik politikası / KVKK aydınlatma metni ve hesap silme sayfası için veri sorumlusu.</summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController(AppDbContext db, IConfiguration config) : ControllerBase
{
    /// <summary>Giriş sayfası, takip sayfası ve sol menü logosu için ad ve logo (beyaz etiket).</summary>
    [HttpGet("branding")]
    public async Task<PublicBrandingDto> Branding(CancellationToken ct) =>
        await db.CompanySettings.AsNoTracking().Select(c => new PublicBrandingDto(c.CompanyName, c.LogoDataUrl)).FirstAsync(ct);

    [HttpGet("company")]
    public async Task<PublicCompanyDto> Company(CancellationToken ct)
    {
        var s = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var retention = config.GetValue("Tracking:RetentionDays", 90);
        return new PublicCompanyDto(s.CompanyName, s.Address, s.Phone, s.Email, s.TaxOffice, s.TaxNumber, s.MersisNo, s.Website, retention);
    }
}
