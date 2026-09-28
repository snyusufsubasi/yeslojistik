using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

public class DailyDigestTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<int> RunAsync(DateTime now)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<DailyDigestService>().SendIfDueAsync(now);
    }

    [Fact]
    public async Task Digest_is_sent_once_a_day_after_eight_when_enabled()
    {
        var c = await factory.LoginAsync();
        var today = DateOnly.FromDateTime(DateTime.Today);
        await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 OZT 01", "Kamyon", null, null, null, 0, null,
            today.AddDays(3), null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var morning = DateTime.Today.AddHours(9);

        (await RunAsync(morning)).Should().Be(0, "ayar kapalıyken gönderilmez");

        var settings = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await c.PutAsync("/api/settings", JsonContent.Create(settings with { DailyDigestEnabled = true }, options: ApiFactory.Json))).EnsureSuccessStatusCode();
        (await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>()).DailyDigestEnabled.Should().BeTrue();

        (await RunAsync(DateTime.Today.AddHours(7))).Should().Be(0, "08:00'den önce gönderilmez");
        var before = factory.Email.Sent.Count;
        (await RunAsync(morning)).Should().Be(1);
        var mail = factory.Email.Sent.Skip(before).Single();
        mail.To.Should().Be(ApiFactory.AdminEmail);
        mail.Body.Should().Contain("34 OZT 01").And.Contain("Periyodik bakım");

        (await RunAsync(morning.AddHours(3))).Should().Be(0, "aynı gün ikinci kez gönderilmez");
        (await RunAsync(morning.AddDays(1))).Should().Be(1, "ertesi gün yeniden gönderilir");
    }
}
