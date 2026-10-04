using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>İlk kurulum sihirbazının sunucu tarafı: yeni (boş) kurulumda örnek veriyle denemek için.</summary>
[ApiController]
[Route("api/onboarding")]
[Authorize(Policy = Policies.Admin)]
public class OnboardingController(AppDbContext db, InvoiceService invoices) : ControllerBase
{
    /// <summary>
    /// Örnek (demo) veriyi yükler: müşteri, araç, şoför, sefer, fatura. Yalnız veritabanı boşken çalışır; böylece gerçek veri hiçbir zaman karışmaz.
    /// Temizlemek için Ayarlar → Veriler → "Demo verilerini temizle".
    /// </summary>
    [HttpPost("sample-data")]
    public async Task<IActionResult> LoadSampleData(CancellationToken ct)
    {
        if (await db.CompanySettings.AnyAsync(s => s.HasSampleData, ct)) throw new DomainException("Örnek veriler zaten yüklü.");
        if (await db.CompanySettings.AnyAsync(s => s.SampleDataClearedAt != null, ct))
            throw new DomainException("Örnek veriler daha önce temizlendi; gerçek verileri korumak için tekrar yüklenmez.");
        var hasData = await db.Customers.IgnoreQueryFilters().AnyAsync(ct) || await db.Vehicles.IgnoreQueryFilters().AnyAsync(ct)
            || await db.Drivers.IgnoreQueryFilters().AnyAsync(ct) || await db.Suppliers.IgnoreQueryFilters().AnyAsync(ct);
        if (hasData) throw new DomainException("Sistemde kayıt var. Örnek veri yalnız boş kurulumda yüklenir.");
        // Örnek veri firma bilgilerini demo değerlerle doldurur; kullanıcının kurulumda girdiği gerçek bilgiler korunur.
        var before = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        await DbSeeder.SeedSampleDataAsync(db, invoices);
        var s = await db.CompanySettings.FirstAsync(ct);
        if (!string.IsNullOrWhiteSpace(before.Address)) s.Address = before.Address;
        if (!string.IsNullOrWhiteSpace(before.Phone)) s.Phone = before.Phone;
        if (!string.IsNullOrWhiteSpace(before.Email)) s.Email = before.Email;
        if (!string.IsNullOrWhiteSpace(before.TaxOffice)) s.TaxOffice = before.TaxOffice;
        if (!string.IsNullOrWhiteSpace(before.TaxNumber)) s.TaxNumber = before.TaxNumber;
        if (!string.IsNullOrWhiteSpace(before.Iban)) s.Iban = before.Iban;
        if (!string.IsNullOrWhiteSpace(before.City)) s.City = before.City;
        if (!string.IsNullOrWhiteSpace(before.District)) s.District = before.District;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
