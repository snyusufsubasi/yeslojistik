using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace YesLojistik.Tests.Integration;

/// <summary>Sunucu taşınması: eski adres App:RedirectTo ile her isteği yeni adrese 308 yönlendirir (health hariç).</summary>
public class MigrationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Old_server_redirects_everything_but_health_with_308()
    {
        await using var redirecting = factory.WithWebHostBuilder(b => b.UseSetting("App:RedirectTo", "https://yeni.example.com/"));
        var c = redirecting.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var res = await c.PostAsync("/api/driver/location?x=1", new StringContent("[]"));
        res.StatusCode.Should().Be(HttpStatusCode.PermanentRedirect);
        res.Headers.Location!.ToString().Should().Be("https://yeni.example.com/api/driver/location?x=1");

        var track = await c.GetAsync("/takip/abc123");
        track.StatusCode.Should().Be(HttpStatusCode.PermanentRedirect);
        track.Headers.Location!.ToString().Should().Be("https://yeni.example.com/takip/abc123");

        var health = await c.GetAsync("/api/health");
        health.StatusCode.Should().Be(HttpStatusCode.OK);
        (await health.Content.ReadAsStringAsync()).Should().Contain("\"redirectTo\":\"https://yeni.example.com/\"");
    }

    [Fact]
    public async Task Stats_include_supplier_and_file_counts_for_migration_check()
    {
        var c = await factory.LoginAsync();
        var json = await (await c.GetAsync("/api/admin/stats")).Content.ReadAsStringAsync();
        json.Should().Contain("\"suppliers\"").And.Contain("\"supplierPayments\"").And.Contain("\"storedFiles\"").And.Contain("supplierPaymentTotal");
    }
}
