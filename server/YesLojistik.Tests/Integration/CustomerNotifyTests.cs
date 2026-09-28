using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class NotifyApiFactory : ApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("App:PublicUrl", "https://panel.test/");
    }
}

public class CustomerNotifyTests(NotifyApiFactory factory) : IClassFixture<NotifyApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Customer_gets_status_emails_only_when_enabled()
    {
        var c = await factory.LoginAsync();
        var on = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Bildirimli Müşteri", null, null, null, "lojistik@musteri.com", null, null,
            NotifyStatusByEmail: true))).ReadAsync<CustomerSummaryDto>()).Customer;
        var off = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Sessiz Müşteri", null, null, null, "sessiz@musteri.com", null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        on.NotifyStatusByEmail.Should().BeTrue();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Bildirim Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var v1 = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 BLD 01", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var v2 = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 BLD 02", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();

        var before = factory.Email.Sent.Count;
        var t1 = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(on.Id, v1.Id, driver.Id, "İstanbul", "Bursa", Today, null, null, 1, 2))).ReadAsync<TripDto>();
        foreach (var s in new[] { TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered })
            (await c.PostJsonAsync($"/api/trips/{t1.Id}/status", new TripStatusRequest(s))).EnsureSuccessStatusCode();
        var t2 = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(off.Id, v2.Id, driver.Id, "İstanbul", "İzmir", Today, null, null, 1, 2))).ReadAsync<TripDto>();
        (await c.PostJsonAsync($"/api/trips/{t2.Id}/status", new TripStatusRequest(TripStatus.Loaded))).EnsureSuccessStatusCode();

        var mails = factory.Email.Sent.Skip(before).ToList();
        mails.Should().HaveCount(3).And.OnlyContain(m => m.To == "lojistik@musteri.com");
        mails.Select(m => m.Subject).Should().Equal(
            "YES LOJİSTİK – Yükünüz araca yüklendi", "YES LOJİSTİK – Yükünüz yola çıktı", "YES LOJİSTİK – Yükünüz teslim edildi");
        mails[1].Body.Should().Contain("https://panel.test/takip/").And.Contain("34 BLD **");
        mails[2].Body.Should().NotContain("/takip/");
    }
}
