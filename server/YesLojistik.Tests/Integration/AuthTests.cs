using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
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

        // Aynı refresh token ikinci kez kullanılamaz.
        var again = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        again.Headers.Add("Cookie", refresh);
        (await c.SendAsync(again)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
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
}
