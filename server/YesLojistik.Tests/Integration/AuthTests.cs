using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class AuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Anonymous_requests_are_rejected()
    {
        var c = factory.CreateClient();
        (await c.GetAsync("/api/trips")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await c.GetAsync("/api/health")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Wrong_password_is_rejected()
    {
        var c = factory.CreateClient();
        var res = await c.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = "yanlis-sifre1" });
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_sets_httponly_cookies_and_refresh_rotates()
    {
        var c = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var res = await c.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        res.EnsureSuccessStatusCode();
        var cookies = res.Headers.GetValues("Set-Cookie").ToList();
        cookies.Should().Contain(x => x.StartsWith("yl_at=") && x.Contains("httponly", StringComparison.OrdinalIgnoreCase));
        cookies.Should().Contain(x => x.StartsWith("yl_rt=") && x.Contains("path=/api/auth", StringComparison.OrdinalIgnoreCase));

        var refresh = cookies.First(x => x.StartsWith("yl_rt=")).Split(';')[0];
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        req.Headers.Add("Cookie", refresh);
        (await c.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.OK);

        // İkinci sekme aynı anda yenilerse (tolerans süresi içinde) oturum düşmez.
        var sameMoment = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        sameMoment.Headers.Add("Cookie", refresh);
        (await c.SendAsync(sameMoment)).StatusCode.Should().Be(HttpStatusCode.OK);

        // Tolerans süresi geçtikten sonra eski token kullanılamaz.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.RefreshTokens.Where(t => t.RevokedAt != null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow.AddMinutes(-5)));
        }
        var later = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        later.Headers.Add("Cookie", refresh);
        (await c.SendAsync(later)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Roles_restrict_write_access()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Operasyon Kişi", "ops@test.local", UserRole.Operations, true, "Sifre1234"))).ReadAsync<UserDto>();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Muhasebe Kişi", "acc@test.local", UserRole.Accounting, true, "Sifre1234"))).ReadAsync<UserDto>();

        var ops = await factory.LoginAsync("ops@test.local", "Sifre1234");
        (await ops.GetAsync("/api/invoices")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await ops.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(1, DateOnly.FromDateTime(DateTime.Today), null, 20, 0, null, false, [], [new(null, "x", 1)])))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.GetAsync("/api/reports/monthly")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.GetAsync("/api/users")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var acc = await factory.LoginAsync("acc@test.local", "Sifre1234");
        (await acc.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 ZZ 999", "Kamyon", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await acc.GetAsync("/api/reports/monthly")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Weak_password_is_rejected()
    {
        var admin = await factory.LoginAsync();
        var res = await admin.PostJsonAsync("/api/users", new UserSaveRequest("Zayıf", "weak@test.local", UserRole.Operations, true, "123"));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Account_locks_after_five_wrong_passwords_and_admin_can_unlock()
    {
        var admin = await factory.LoginAsync();
        var user = await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Kilit Test", "kilit@test.local", UserRole.Operations, true, "Kilit1234"))).ReadAsync<UserDto>();
        var c = factory.CreateClient();
        for (var i = 0; i < AuthControllerLimits.MaxFailed; i++)
            (await c.PostAsJsonAsync("/api/auth/login", new { email = "kilit@test.local", password = "yanlis-1234" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        // Doğru şifre de kilit süresince reddedilir.
        var locked = await c.PostAsJsonAsync("/api/auth/token", new { email = "kilit@test.local", password = "Kilit1234" });
        locked.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await (await admin.GetAsync("/api/users")).ReadAsync<List<UserDto>>()).Single(u => u.Id == user.Id).LockoutUntil.Should().NotBeNull();

        (await admin.PostAsync($"/api/users/{user.Id}/unlock", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await c.PostAsJsonAsync("/api/auth/login", new { email = "kilit@test.local", password = "Kilit1234" })).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Password_reset_link_is_single_use_and_signs_out_other_sessions()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Unutkan", "unutkan@test.local", UserRole.Accounting, true, "Eski12345"))).ReadAsync<UserDto>();
        var mobile = factory.CreateClient();
        var session = await (await mobile.PostAsJsonAsync("/api/auth/token", new { email = "unutkan@test.local", password = "Eski12345" })).ReadAsync<TokenLoginResponse>();

        var anon = factory.CreateClient();
        (await anon.PostAsJsonAsync("/api/auth/forgot-password", new { email = "yok@test.local" })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await anon.PostAsJsonAsync("/api/auth/forgot-password", new { email = "Unutkan@test.local" })).StatusCode.Should().Be(HttpStatusCode.OK);
        var mail = factory.Email.Sent.Last(m => m.To == "unutkan@test.local");
        var token = System.Text.RegularExpressions.Regex.Match(mail.Body, @"token=([\w-]+)").Groups[1].Value;
        token.Should().NotBeEmpty();
        factory.Email.Sent.Should().NotContain(m => m.To == "yok@test.local");

        (await anon.PostAsJsonAsync("/api/auth/reset-password", new { token, newPassword = "kisa" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await anon.PostAsJsonAsync("/api/auth/reset-password", new { token, newPassword = "Yeni12345" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await anon.PostAsJsonAsync("/api/auth/reset-password", new { token, newPassword = "Baska12345" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await anon.PostAsJsonAsync("/api/auth/login", new { email = "unutkan@test.local", password = "Yeni12345" })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await mobile.PostAsJsonAsync("/api/auth/token/refresh", new { refreshToken = session.RefreshToken })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Public_company_info_is_open_without_sensitive_fields()
    {
        var c = factory.CreateClient();
        var company = await c.GetAsync("/api/public/company");
        company.StatusCode.Should().Be(HttpStatusCode.OK);
        (await company.Content.ReadAsStringAsync()).Should().Contain("companyName").And.NotContain("iban");
    }
}

internal static class AuthControllerLimits
{
    public const int MaxFailed = 5;
}
