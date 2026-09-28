using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class AuditTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Changes_are_recorded_with_user_and_fields_and_only_admins_can_read()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Geçmiş Müşteri", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Geçmiş Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 GCM 01", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var req = new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Bursa", "Konya", Today, null, null, 5_000, 8_000);
        var trip = await (await c.PostJsonAsync("/api/trips", req)).ReadAsync<TripDto>();
        (await c.PutAsJsonAsync($"/api/trips/{trip.Id}", req with { SalePrice = 9_500 }, ApiFactory.Json)).EnsureSuccessStatusCode();
        (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded))).EnsureSuccessStatusCode();
        (await c.DeleteAsync($"/api/trips/{trip.Id}")).EnsureSuccessStatusCode();

        var logs = (await (await c.GetAsync($"/api/audit?entityType=Trip&entityId={trip.Id}")).ReadAsync<PagedResult<AuditLogDto>>()).Items;
        logs.Select(l => l.Action).Should().Equal("Deleted", "Updated", "Updated", "Created");
        logs.Should().OnlyContain(l => l.UserName != null && l.Label == $"Bursa → Konya ({Today:dd.MM.yyyy})");
        logs[2].Changes.Should().Be("Satış fiyatı: 8.000,00 → 9.500,00");
        logs[1].Changes.Should().Be("Durum: Planlandı → Yüklendi");

        // Aracın durum eşitlemesi de kaydedilir; konum güncellemesi kaydedilmez.
        var search = (await (await c.GetAsync("/api/audit?search=34%20GCM%2001")).ReadAsync<PagedResult<AuditLogDto>>()).Items;
        search.Should().Contain(l => l.EntityType == "Vehicle" && l.Action == "Created");

        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Ops", "ops-audit@test.local", UserRole.Operations, true, "Sifre1234"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("ops-audit@test.local", "Sifre1234");
        (await ops.GetAsync("/api/audit")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var userLog = (await (await c.GetAsync("/api/audit?entityType=User")).ReadAsync<PagedResult<AuditLogDto>>()).Items;
        userLog.Should().NotContain(l => (l.Changes ?? "").Contains("PasswordHash") || (l.Changes ?? "").Contains("LastLoginAt"));
    }
}
