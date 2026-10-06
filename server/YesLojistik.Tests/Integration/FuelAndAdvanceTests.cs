using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class FuelAndAdvanceTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Fuel_consumption_and_driver_advances_are_reported()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Yakıt Test", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Hasan Yakıt", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var idle = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Seferi Olmayan", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 YKT 01", "Tır", null, null, null, 100_000, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "A", "B", Today, null, null, 1_000, 2_000))).ReadAsync<TripDto>();

        // Depo doldurma: 100.000 km (ilk dolum sayılmaz), 100.600 km'de 180 L, 101.000 km'de 120 L → 300 L / 1.000 km = 30 L/100 km
        async Task Fill(int km, decimal liters, decimal amount) =>
            (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, amount, Today, vehicle.Id, null, null, null, liters, km))).EnsureSuccessStatusCode();
        await Fill(100_000, 400, 16_000);
        await Fill(100_600, 180, 7_200);
        await Fill(101_000, 120, 4_800);

        var fuel = await (await c.GetAsync($"/api/reports/fuel?from={Today:yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).ReadAsync<List<FuelReportRow>>();
        var row = fuel.Single(r => r.VehicleId == vehicle.Id);
        row.Should().BeEquivalentTo(new { FillCount = 3, Liters = 700m, Cost = 28_000m, PricePerLiter = 40m, Km = 1_000, LitersPer100Km = 30m });
        (await (await c.GetAsync($"/api/vehicles/{vehicle.Id}")).ReadAsync<VehicleDto>()).Km.Should().Be(101_000);

        // Avans şoförsüz reddedilir; sefere bağlı harcırahta şoför seferden gelir.
        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAdvance, 500, Today, null, null, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var allowance = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAllowance, 750, Today, null, trip.Id, null))).ReadAsync<ExpenseDto>();
        allowance.DriverName.Should().Be("Hasan Yakıt");
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAdvance, 2_000, Today, null, null, "Yol avansı", driver.Id))).ReadAsync<ExpenseDto>();
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAdvance, 300, Today, null, null, null, idle.Id))).ReadAsync<ExpenseDto>();

        var drivers = await (await c.GetAsync($"/api/reports/drivers?from={Today:yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).ReadAsync<List<DriverReportRow>>();
        drivers.Single(d => d.DriverId == driver.Id).Should().BeEquivalentTo(new { TripCount = 1, Advances = 2_000m, Allowances = 750m });
        drivers.Single(d => d.DriverId == idle.Id).Should().BeEquivalentTo(new { TripCount = 0, Advances = 300m });

        var list = await (await c.GetAsync($"/api/expenses?driverId={driver.Id}")).ReadAsync<PagedResult<ExpenseDto>>();
        list.Items.Should().HaveCount(2);
    }

    /// <summary>
    /// Mazot şeridi (docs/plan/19-OZ-MAL-MAZOTLAR.md §6): filtre toplamları litre ve ölçülmüş km'yi de verir.
    /// Km, satırlardaki "yeni km − önceki km" farklarının toplamıdır; litre/km yoksa null döner (ekranda "—").
    /// </summary>
    [Fact]
    public async Task Fuel_totals_report_liters_and_measured_km()
    {
        var c = await factory.LoginAsync();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 YKT 02", "Tır", null, null, null, 0,
            null, null, null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        // İki dolum: 205 L + 100 L = 305 L; fark 500 + 500 = 1.000 km.
        async Task Fill(int odometer, int previousOdometer, decimal liters, decimal amount) =>
            (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, amount, Today, vehicle.Id, null, null,
                null, liters, odometer, Details: new ExpenseDetails(PreviousOdometer: previousOdometer)))).EnsureSuccessStatusCode();
        await Fill(1_000, 500, 205, 4_000);
        await Fill(1_500, 1_000, 100, 2_000);
        // Yakıt olmayan gider litre/km toplamına girmez (litresi ve kilometresi yoktur).
        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Toll, 750, Today, vehicle.Id, null, "Köprü")))
            .EnsureSuccessStatusCode();

        var totals = await (await c.GetAsync($"/api/expenses/totals?category=Fuel&vehicleId={vehicle.Id}&pageSize=1")).ReadAsync<ExpenseTotalsDto>();
        totals.Count.Should().Be(2);
        totals.Total.Should().Be(6_000);
        totals.Liters.Should().Be(305);
        totals.Km.Should().Be(1_000);

        // Litre ve km girilmemiş yakıt kaydı: toplamlar null kalır (uydurma sıfır gösterilmez).
        var bare = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 YKT 03", "Tır", null, null, null, 0,
            null, null, null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 500, Today, bare.Id, null, "Mazot")))
            .EnsureSuccessStatusCode();
        var none = await (await c.GetAsync($"/api/expenses/totals?category=Fuel&vehicleId={bare.Id}")).ReadAsync<ExpenseTotalsDto>();
        none.Count.Should().Be(1);
        none.Liters.Should().BeNull();
        none.Km.Should().BeNull();
    }
}
