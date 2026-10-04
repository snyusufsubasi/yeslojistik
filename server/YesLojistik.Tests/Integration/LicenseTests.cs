using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Api.Controllers;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Core.Licensing;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

/// <summary>Elle ilerletilen saat: ek süre/bitiş senaryoları gerçek zaman beklemeden denenir.</summary>
public sealed class MutableTimeProvider : TimeProvider
{
    public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => Now;
}

/// <summary>Kendi geçici anahtar çiftini üretir; genel anahtarı License:PublicKey olarak verir.</summary>
public class LicensedApiFactory : ApiFactory
{
    public (string Pub, string Priv) Keys { get; } = LicenseToken.GenerateKeyPair();
    public MutableTimeProvider Time { get; } = new();
    /// <summary>Ortam değişkeni (License__Key) gibi davranacak anahtar; null = yok.</summary>
    public string? EnvKey { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("License:PublicKey", Keys.Pub);
        if (EnvKey != null) builder.UseSetting("License:Key", EnvKey);
        builder.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(Time));
    }

    public string Issue(int days, int limit, string plan = "Standart", params string[] features) => LicenseToken.Sign(new LicensePayload
    {
        Customer = "Test Nakliyat", Plan = plan, VehicleLimit = limit, Features = features,
        IssuedAt = Time.Now.AddDays(-1), ExpiresAt = Time.Now.AddDays(days),
    }, Keys.Priv);
}

public class LicenseLifecycleTests(LicensedApiFactory factory) : IClassFixture<LicensedApiFactory>
{
    private static int _n;

    private static async Task<VehicleDto> NewVehicle(HttpClient c, string? plate = null) =>
        await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest(plate ?? $"34 LIC {Interlocked.Increment(ref _n):000}", "Tır", null, null, null, 0,
            null, null, null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();

    private async Task<LicenseStatusDto> Apply(HttpClient c, string key) =>
        await (await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(key))).ReadAsync<LicenseStatusDto>();

    private static async Task<string> Problem(HttpResponseMessage res) => (await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("title").GetString()!;

    [Fact]
    public async Task Lifecycle_owner_then_limit_then_grace_then_readonly_then_renewal()
    {
        var c = await factory.LoginAsync();
        factory.Time.Now = DateTimeOffset.UtcNow;

        // 1) Anahtar yok: sahip modu, sınırsız.
        var owner = await (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>();
        owner.State.Should().Be("owner");
        owner.ReadOnly.Should().BeFalse();
        owner.VehicleLimit.Should().Be(0);
        owner.DaysLeft.Should().BeNull();
        for (var i = 0; i < 3; i++) await NewVehicle(c);

        // 2) Yanlış / bozuk anahtar kaydedilmez.
        (await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest("sahte.anahtar"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(30, 5).Replace('A', 'B')))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(-2, 5)))).StatusCode.Should().Be(HttpStatusCode.BadRequest);   // süresi dolmuş
        (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>().Result.State.Should().Be("owner");

        // 3) Geçerli anahtar: araç sınırı 4, şu an 3 araç var.
        var key4 = factory.Issue(30, 4, "Standart", "eFatura", "uetds");
        var st = await Apply(c, key4);
        st.State.Should().Be("active");
        st.Plan.Should().Be("Standart");
        st.Customer.Should().Be("Test Nakliyat");
        st.VehicleLimit.Should().Be(4);
        st.VehicleCount.Should().Be(3);
        st.DaysLeft.Should().Be(30);
        st.Features.Should().Equal("eFatura", "uetds");
        st.Source.Should().Be("db");

        var fourth = await NewVehicle(c);
        var over = await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 LIC 999", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null));
        over.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Problem(over)).Should().Be("Paketinizdeki araç sınırına ulaştınız (4). Paketi yükseltmek için bize ulaşın.");
        // Silinen araç sayılmaz.
        (await c.DeleteAsync($"/api/vehicles/{fourth.Id}")).EnsureSuccessStatusCode();
        await NewVehicle(c);

        // Excel ile toplu aktarım da sınırı aşamaz (hiçbiri kaydedilmez).
        var file = ImportTests.Workbook(ImportService.Columns["vehicles"], ["34 IMP 01", "Tır"], ["34 IMP 02", "Tır"]);
        var imp = await (await c.PostAsync("/api/import/vehicles", ImportTests.Form(file))).ReadAsync<ImportResult>();
        imp.Errors.Should().NotBeEmpty().And.OnlyContain(e => e.Message.Contains("araç sınırına ulaştınız (4)"));
        imp.Created.Should().Be(0);

        // Anahtarın kendisi hiçbir yanıtta ve işlem geçmişinde görünmez; uygulandığı kaydedilir.
        var audit = (await (await c.GetAsync("/api/audit?entityType=CompanySettings")).ReadAsync<PagedResult<AuditLogDto>>()).Items;
        audit.Should().Contain(a => a.Action == "License" && a.Changes!.Contains("Test Nakliyat") && a.Changes.Contains("Standart"));
        audit.Should().OnlyContain(a => !(a.Changes ?? "").Contains(key4.Substring(0, 40)), "anahtarın kendisi işlem geçmişine yazılmamalı");
        (await (await c.GetAsync("/api/settings")).Content.ReadAsStringAsync()).Should().NotContain("licenseKey");

        // 4) Süre bitti ama 7 gün ek süre: yalnızca uyarı, yazma serbest.
        factory.Time.Now = DateTimeOffset.UtcNow.AddDays(33);
        var grace = await (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>();
        grace.State.Should().Be("grace");
        grace.ReadOnly.Should().BeFalse();
        grace.DaysLeft.Should().BeLessThanOrEqualTo(0);
        (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Ek Süre Müşterisi", null, null, null, null, null, null))).EnsureSuccessStatusCode();

        // 5) Ek süre de bitti: salt okunur.
        factory.Time.Now = DateTimeOffset.UtcNow.AddDays(38);
        (await (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>()).State.Should().Be("expired");
        var blocked = await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Bitmiş Abonelik Müşterisi", null, null, null, null, null, null));
        blocked.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await Problem(blocked)).Should().Contain("Aboneliğiniz bitti").And.Contain("yalnızca görüntüleme");
        (await c.PutJsonAsync("/api/settings", new { })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await c.DeleteAsync("/api/vehicles/1")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        // Okuma, giriş, durum ve yedek hâlâ çalışır.
        (await c.GetAsync("/api/customers")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await c.GetAsync("/api/vehicles/export")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await factory.LoginAsync()).Should().NotBeNull();
        (await c.GetAsync("/api/admin/stats")).StatusCode.Should().Be(HttpStatusCode.OK);

        // 6) Yenileme: yeni anahtar salt okunur modda da uygulanır; yazma yeniden açılır.
        var renewed = await Apply(c, factory.Issue(365, 20, "Profesyonel", "gps"));
        renewed.State.Should().Be("active");
        renewed.Plan.Should().Be("Profesyonel");
        renewed.DaysLeft.Should().Be(365);
        (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Yenilenmiş Müşteri", null, null, null, null, null, null))).EnsureSuccessStatusCode();
        await NewVehicle(c);
    }

}

public class LicenseAccessTests(LicensedApiFactory factory) : IClassFixture<LicensedApiFactory>
{
    private static async Task<HttpClient> LoginNewAsync(LicensedApiFactory f, HttpClient admin, UserRole role, string email, int? driverId = null)
    {
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest(role.ToString(), email, role, true, "Sifre1234", driverId))).ReadAsync<UserDto>();
        return await f.LoginAsync(email, "Sifre1234");
    }

    [Fact]
    public async Task Only_admins_can_apply_but_any_user_can_read_status()
    {
        var admin = await factory.LoginAsync();
        var d = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest("Lisans Şoförü", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var ops = await LoginNewAsync(factory, admin, UserRole.Operations, "ops-lic@test.local");
        var driver = await LoginNewAsync(factory, admin, UserRole.Driver, "sofor-lic@test.local", d.Id);

        (await ops.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(30, 5)))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await driver.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(30, 5)))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await factory.CreateClient().PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(30, 5)))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ops.GetAsync("/api/license/status")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await driver.GetAsync("/api/license/status")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await factory.CreateClient().GetAsync("/api/license/status")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

}

public class LicenseUnlimitedTests(LicensedApiFactory factory) : IClassFixture<LicensedApiFactory>
{
    [Fact]
    public async Task Unlimited_vehicle_limit_zero_never_blocks()
    {
        var c = await factory.LoginAsync();
        factory.Time.Now = DateTimeOffset.UtcNow;
        var st = await (await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(factory.Issue(30, 0, "Kurumsal")))).ReadAsync<LicenseStatusDto>();
        (st.State, st.VehicleLimit).Should().Be(("active", 0));
        for (var i = 0; i < 4; i++)
            (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 UNL 0{i}", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null))).EnsureSuccessStatusCode();
    }
}

/// <summary>Ortam değişkeninden (License__Key) gelen anahtar: panelden değiştirilemez, bozuksa panel salt okunur olur.</summary>
public class LicenseFromEnvironmentTests
{
    [Fact]
    public async Task Environment_key_wins_and_cannot_be_replaced_from_the_panel()
    {
        var f = new LicensedApiFactory();
        f.EnvKey = f.Issue(30, 2, "Baslangic", "portal");
        try
        {
            var c = await f.LoginAsync();
            var st = await (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>();
            (st.State, st.Source, st.Plan, st.VehicleLimit).Should().Be(("active", "env", "Baslangic", 2));

            var res = await c.PostJsonAsync("/api/license/apply", new LicenseApplyRequest(f.Issue(30, 50, "Profesyonel")));
            res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res.Content.ReadAsStringAsync()).Should().Contain("License__Key");

            for (var i = 1; i <= 2; i++)
                (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 ENV 0{i}", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null))).EnsureSuccessStatusCode();
            (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 ENV 03", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null)))
                .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        finally { await f.DisposeAsync(); }
    }

    [Fact]
    public async Task A_tampered_environment_key_makes_the_panel_read_only()
    {
        var f = new LicensedApiFactory();
        var good = f.Issue(30, 100);
        f.EnvKey = good[..^4] + (good.EndsWith("AAAA") ? "BBBB" : "AAAA");
        try
        {
            var c = await f.LoginAsync();    // giriş her zaman çalışır
            var st = await (await c.GetAsync("/api/license/status")).ReadAsync<LicenseStatusDto>();
            st.State.Should().Be("invalid");
            st.ReadOnly.Should().BeTrue();
            st.Message.Should().Contain("imza");
            (await c.GetAsync("/api/vehicles")).StatusCode.Should().Be(HttpStatusCode.OK);
            var blocked = await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 BAD 01", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null));
            blocked.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            (await blocked.Content.ReadAsStringAsync()).Should().Contain("Lisans anahtarı geçersiz");
        }
        finally { await f.DisposeAsync(); }
    }
}
