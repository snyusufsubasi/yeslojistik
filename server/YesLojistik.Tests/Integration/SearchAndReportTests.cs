using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Faz 9: müşteri ve güzergâh kârlılığı, genel arama.</summary>
public class SearchAndReportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Customer_and_route_profit_and_global_search()
    {
        var c = await factory.LoginAsync();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Arama Kimya A.Ş.", "1234567890", null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Arama Şoför", "05321112233", null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("06 ARA 77", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        foreach (var (price, cost) in new[] { (10_000m, 7_000m), (12_000m, 8_000m) })
            await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "Gebze", "İzmir", Today, null, null, cost, price,
                LoadingCity: "Kocaeli", DeliveryCity: "İzmir", CustomerReference: "PO-778899"))).ReadAsync<TripDto>();

        var customers = await (await c.GetAsync($"/api/reports/customers?from={Today.AddDays(-1):yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).ReadAsync<List<CustomerProfitRow>>();
        var row = customers.Single(r => r.CustomerId == customer.Customer.Id);
        row.TripCount.Should().Be(2);
        row.Profit.Should().Be(7_000);
        row.MarginPercent.Should().Be(31.8m);

        var routes = await (await c.GetAsync($"/api/reports/routes?from={Today.AddDays(-1):yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).ReadAsync<List<RouteProfitRow>>();
        routes.Should().Contain(r => r.From == "Kocaeli" && r.To == "İzmir" && r.TripCount == 2 && r.AvgRevenue == 11_000);
        (await c.GetAsync("/api/reports/routes?format=xlsx")).Content.Headers.ContentType!.MediaType.Should().Contain("spreadsheet");

        var byPlate = await (await c.GetAsync("/api/search?q=06ara77")).ReadAsync<List<SearchResult>>();
        byPlate.Should().Contain(r => r.Type == "vehicle" && r.Title == "06 ARA 77");
        byPlate.Should().Contain(r => r.Type == "trip");
        var byRef = await (await c.GetAsync("/api/search?q=PO-7788")).ReadAsync<List<SearchResult>>();
        byRef.Should().Contain(r => r.Type == "trip" && r.Subtitle!.Contains("PO-778899"));
        var byName = await (await c.GetAsync("/api/search?q=arama kim")).ReadAsync<List<SearchResult>>();
        byName.Should().Contain(r => r.Type == "customer" && r.Link == $"/musteriler/{customer.Customer.Id}");
        (await (await c.GetAsync("/api/search?q=a")).ReadAsync<List<SearchResult>>()).Should().BeEmpty();
    }
}
