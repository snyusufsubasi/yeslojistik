using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Akıllı alan önerileri: firmanın kendi kayıtlarındaki değerler, kullanım sayısına göre sıralı.</summary>
public class OptionsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Options_are_ordered_by_usage_and_merge_case_variants()
    {
        var c = await factory.LoginAsync();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Seçenek Gıda", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Seçenek Şoför", "05321112277", null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("37 SCK 37", "Zzz Kasa Tipi", null, null, null, 0, null, null, null, null,
            VehicleStatus.Available, driver.Id, Card: new VehicleCard(FuelType: "Zzz Yakıt")))).ReadAsync<VehicleDto>();
        async Task Trip(string cargo, string unit) =>
            (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "A", "B", Today, null, null, 1, 2,
                CargoType: cargo, CargoUnit: unit))).EnsureSuccessStatusCode();

        await Trip("Qq Seyrek Yük", "qqbirim");
        await Trip("Qq Sık Yük", "qqbirim");
        await Trip("Qq Sık Yük", "QQbirim ");
        await Trip("qq sık yük", "qqbirim");

        var cargo = await (await c.GetAsync("/api/options/cargoType")).ReadAsync<List<OptionUsageDto>>();
        var sik = cargo.FindIndex(o => o.Value == "Qq Sık Yük");
        var seyrek = cargo.FindIndex(o => o.Value == "Qq Seyrek Yük");
        sik.Should().BeGreaterThanOrEqualTo(0);
        seyrek.Should().BeGreaterThan(sik, "daha sık kullanılan değer önce gelir");
        cargo[sik].Count.Should().Be(3, "büyük/küçük harf farkı aynı değer sayılır");
        cargo.Should().NotContain(o => o.Value == "qq sık yük");

        var units = await (await c.GetAsync("/api/options/cargoUnit")).ReadAsync<List<OptionUsageDto>>();
        units.Should().ContainSingle(o => o.Value.Trim().ToLowerInvariant() == "qqbirim").Which.Count.Should().Be(4);

        var types = await (await c.GetAsync("/api/options/vehicleType")).ReadAsync<List<OptionUsageDto>>();
        types.Should().Contain(o => o.Value == "Zzz Kasa Tipi");

        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 100, Today, vehicle.Id, null, null,
            Details: new ExpenseDetails(Title: "Zzz HGS", FuelType: "Zzz Yakıt")))).EnsureSuccessStatusCode();
        var fuel = await (await c.GetAsync("/api/options/fuelType")).ReadAsync<List<OptionUsageDto>>();
        fuel.Should().ContainSingle(o => o.Value == "Zzz Yakıt").Which.Count.Should().Be(2, "araç kartı ve yakıt gideri birlikte sayılır");
        var titles = await (await c.GetAsync("/api/options/expenseTitle")).ReadAsync<List<OptionUsageDto>>();
        titles.Should().Contain(o => o.Value == "Zzz HGS");

        (await c.GetAsync("/api/options/password")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Options_require_login()
    {
        var anon = factory.CreateClient();
        (await anon.GetAsync("/api/options/cargoType")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
