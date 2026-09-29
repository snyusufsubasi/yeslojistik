using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Yeni sefer formu önerileri: son sefer, kayıtlı adresler, yük cinsleri, güzergâh fiyatı.</summary>
public class TripHintsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Hints_return_last_trip_addresses_cargo_and_route_price()
    {
        var c = await factory.LoginAsync();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Öneri Tekstil", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Öneri Şoför", "05321112299", null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("36 ONR 36", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var cid = customer.Customer.Id;
        async Task<TripDto> Trip(string from, string to, decimal cost, decimal price, DateOnly date, string cargo) =>
            await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(cid, vehicle.Id, driver.Id, from, to, date, null, null, cost, price,
                LoadingCity: "Kars", DeliveryCity: "Hakkari", CargoType: cargo, LoadingContact: "Depo Ali 0555"))).ReadAsync<TripDto>();

        await Trip("Kars OSB 3. Cadde", "Hakkari Merkez", 7_000, 10_000, Today.AddDays(-3), "Kumaş");
        await Trip("kars osb 3. cadde ", "Hakkari Merkez", 8_000, 12_000, Today.AddDays(-2), "Kumaş");
        var cancelled = await Trip("Kars Liman", "Yüksekova", 1, 99_000, Today.AddDays(-1), "İplik");
        (await c.PostJsonAsync($"/api/trips/{cancelled.Id}/status", new TripStatusRequest(TripStatus.Cancelled))).EnsureSuccessStatusCode();

        var h = await (await c.GetAsync($"/api/trips/hints?customerId={cid}&loadingCity=Kars&deliveryCity=Hakkari")).ReadAsync<TripHintsDto>();
        h.LastTrip!.SalePrice.Should().Be(12_000, "iptal edilen sefer son sefer sayılmaz");
        h.LoadingAddresses.Should().ContainSingle().Which.Should().Match<TripAddressHint>(a => a.Count == 2 && a.City == "Kars" && a.Contact == "Depo Ali 0555");
        h.DeliveryAddresses.Should().ContainSingle(a => a.Address == "Hakkari Merkez");
        h.CargoTypes.Should().Contain("Kumaş");
        h.Route!.Count.Should().Be(2);
        h.Route.AvgSalePrice.Should().Be(11_000);
        h.Route.AvgVehicleCost.Should().Be(7_500);
        h.Route.LastSalePrice.Should().Be(12_000);

        var empty = await (await c.GetAsync("/api/trips/hints?loadingCity=Kars&deliveryCity=Bayburt")).ReadAsync<TripHintsDto>();
        empty.LastTrip.Should().BeNull();
        empty.Route.Should().BeNull();
        empty.LoadingAddresses.Should().BeEmpty();
    }
}
