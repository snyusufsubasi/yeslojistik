using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>"U-ETDS'ye hazır mı?" uç noktası, listedeki işaret ve süzgeç. Kimlik numaraları uydurmadır.</summary>
public class UetdsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private const string FakeTckn = "12345678950";

    private record Setup(HttpClient C, CustomerDto Customer, DriverDto Driver, VehicleDto Vehicle, TripDto Trip, string Unique);

    private async Task<Setup> SetupAsync()
    {
        var c = await factory.LoginAsync();
        var u = Random.Shared.Next(100_000, 999_999).ToString();
        // Gönderici müşterinin geçerli (sahte) VKN'si var; şoförde TCKN, telefon yok.
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"UETDS Müşteri {u}", "1234567890", null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"UETDS Şoför {u}", null, null, null, null, null, null, true)))
            .ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 UT {u[..5]}", "Kamyon",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla OSB", "Bornova sanayi",
            Today, null, null, 1_000, 2_000, CargoType: "Mobilya", CargoWeightKg: 12_000, LoadingCity: "İstanbul", DeliveryCity: "İzmir")))
            .ReadAsync<TripDto>();
        return new Setup(c, customer, driver, vehicle, trip, u);
    }

    [Fact]
    public async Task Trip_with_missing_data_is_not_ready_and_fixing_it_makes_it_ready()
    {
        var s = await SetupAsync();

        var before = await (await s.C.GetAsync($"/api/trips/{s.Trip.Id}/uetds-readiness")).ReadAsync<UetdsReadinessDto>();
        before.Ready.Should().BeFalse();
        before.TripId.Should().Be(s.Trip.Id);
        var codes = before.Issues.Where(i => i.Blocking).Select(i => i.Code).ToList();
        codes.Should().BeEquivalentTo("driver.nationalId", "driver.phone", "trip.loadingDistrict", "trip.deliveryDistrict",
            "trip.consigneeTaxNumber", "trip.consigneeTitle", "trip.loadingTime");
        before.MissingCount.Should().Be(7);
        before.Issues.Single(i => i.Code == "driver.nationalId").TargetId.Should().Be(s.Driver.Id);
        before.Issues.Single(i => i.Code == "driver.nationalId").Target.Should().Be("Driver");
        before.Issues.Single(i => i.Code == "trip.loadingTime").TargetId.Should().Be(s.Trip.Id);

        // Şoförü düzelt: TCKN + telefon.
        var driverReq = new DriverSaveRequest(s.Driver.FullName, "0532 123 45 67", FakeTckn, null, null, null, null, true);
        (await s.C.PutJsonAsync($"/api/drivers/{s.Driver.Id}", driverReq)).StatusCode.Should().Be(HttpStatusCode.OK);
        var mid = await (await s.C.GetAsync($"/api/trips/{s.Trip.Id}/uetds-readiness")).ReadAsync<UetdsReadinessDto>();
        mid.Issues.Where(i => i.Blocking).Select(i => i.Target).Should().OnlyContain(t => t == "Trip");
        mid.MissingCount.Should().Be(5);

        // Seferi düzelt: ilçeler, saat, alıcı.
        var update = new TripSaveRequest(s.Customer.Id, s.Vehicle.Id, s.Driver.Id, "Tuzla OSB", "Bornova sanayi", Today, null, null, 1_000, 2_000,
            CargoType: "Mobilya", CargoWeightKg: 12_000, LoadingCity: "İstanbul", DeliveryCity: "İzmir",
            Uetds: new TripUetds("Tuzla", "Bornova", new TimeOnly(8, 30), "Alıcı Ticaret A.Ş.", "10000000146"));
        var saved = await (await s.C.PutJsonAsync($"/api/trips/{s.Trip.Id}", update)).ReadAsync<TripDto>();
        saved.Uetds!.LoadingTime.Should().Be(new TimeOnly(8, 30));
        saved.Uetds.LoadingDistrict.Should().Be("Tuzla");

        var after = await (await s.C.GetAsync($"/api/trips/{s.Trip.Id}/uetds-readiness")).ReadAsync<UetdsReadinessDto>();
        after.Ready.Should().BeTrue();
        after.MissingCount.Should().Be(0);
    }

    [Fact]
    public async Task Readiness_of_unknown_trip_is_404()
    {
        var c = await factory.LoginAsync();
        (await c.GetAsync("/api/trips/987654/uetds-readiness")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_marks_and_filters_trips_with_missing_uetds_data()
    {
        var s = await SetupAsync();
        var list = await (await s.C.GetAsync($"/api/trips?customerId={s.Customer.Id}")).ReadAsync<PagedResult<TripDto>>();
        list.Items.Single().UetdsMissing.Should().Be(7);

        async Task<List<int>> Missing() =>
            (await (await s.C.GetAsync($"/api/trips?customerId={s.Customer.Id}&uetdsMissing=true")).ReadAsync<PagedResult<TripDto>>()).Items.Select(t => t.Id).ToList();
        (await Missing()).Should().Equal(s.Trip.Id);

        // Teslim edilmiş sefer sayılmaz: listede işaret yok, süzgeçte yok.
        foreach (var status in new[] { TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered })
            (await s.C.PostJsonAsync($"/api/trips/{s.Trip.Id}/status", new TripStatusRequest(status))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await Missing()).Should().BeEmpty();
        var delivered = await (await s.C.GetAsync($"/api/trips?customerId={s.Customer.Id}")).ReadAsync<PagedResult<TripDto>>();
        delivered.Items.Single().UetdsMissing.Should().BeNull();
        // Süzgeç toplamlara da aynen uygulanır.
        (await (await s.C.GetAsync($"/api/trips/totals?customerId={s.Customer.Id}&uetdsMissing=true")).ReadAsync<TripTotalsDto>()).Count.Should().Be(0);
    }

    [Fact]
    public async Task Complete_trip_is_not_in_the_missing_list()
    {
        var s = await SetupAsync();
        (await s.C.PutJsonAsync($"/api/drivers/{s.Driver.Id}", new DriverSaveRequest(s.Driver.FullName, "0532 123 45 67", FakeTckn, null, null, null, null, true)))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        var update = new TripSaveRequest(s.Customer.Id, s.Vehicle.Id, s.Driver.Id, "Tuzla OSB", "Bornova sanayi", Today, null, null, 1_000, 2_000,
            CargoType: "Mobilya", CargoWeightKg: 12_000, LoadingCity: "İstanbul", DeliveryCity: "İzmir",
            Uetds: new TripUetds("Tuzla", "Bornova", new TimeOnly(8, 30), "Alıcı Ticaret A.Ş.", "10000000146"));
        (await s.C.PutJsonAsync($"/api/trips/{s.Trip.Id}", update)).StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await (await s.C.GetAsync($"/api/trips?customerId={s.Customer.Id}&uetdsMissing=true")).ReadAsync<PagedResult<TripDto>>();
        list.Items.Should().BeEmpty();
        var all = await (await s.C.GetAsync($"/api/trips?customerId={s.Customer.Id}")).ReadAsync<PagedResult<TripDto>>();
        all.Items.Single().UetdsMissing.Should().Be(0);
    }

    [Fact]
    public async Task Update_without_uetds_block_keeps_existing_values()
    {
        var s = await SetupAsync();
        var full = new TripSaveRequest(s.Customer.Id, s.Vehicle.Id, s.Driver.Id, "Tuzla OSB", "Bornova sanayi", Today, null, null, 1_000, 2_000,
            Uetds: new TripUetds("Tuzla", "Bornova", new TimeOnly(8, 30), "Alıcı", "10000000146"));
        (await s.C.PutJsonAsync($"/api/trips/{s.Trip.Id}", full)).StatusCode.Should().Be(HttpStatusCode.OK);
        var plain = full with { Uetds = null, Description = "sadece not" };
        var saved = await (await s.C.PutJsonAsync($"/api/trips/{s.Trip.Id}", plain)).ReadAsync<TripDto>();
        saved.Uetds!.LoadingDistrict.Should().Be("Tuzla");
        saved.Uetds.ConsigneeTaxNumber.Should().Be("10000000146");
    }

    [Fact]
    public async Task Validators_accept_optional_fields_but_reject_bad_values()
    {
        var s = await SetupAsync();
        var bad = new TripSaveRequest(s.Customer.Id, s.Vehicle.Id, s.Driver.Id, "A", "B", Today, null, null, 1, 1,
            Uetds: new TripUetds(ConsigneeTaxNumber: "123"));
        (await s.C.PutJsonAsync($"/api/trips/{s.Trip.Id}", bad)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Şoför: Türk şoförde geçersiz TCKN reddedilir; yabancı şoförde pasaport no + uyruk kabul edilir.
        var wrong = new DriverSaveRequest("Yabancı Şoför", null, "12345678951", null, null, null, null, true);
        (await s.C.PostJsonAsync("/api/drivers", wrong)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var foreign = wrong with { NationalId = "u1234567", IsForeign = true, Nationality = "Gürcistan" };
        var created = await (await s.C.PostJsonAsync("/api/drivers", foreign)).ReadAsync<DriverDto>();
        created.NationalId.Should().Be("U1234567");
        created.Nationality.Should().Be("Gürcistan");
    }
}
