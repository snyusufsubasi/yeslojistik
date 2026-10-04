using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Unit;

/// <summary>"U-ETDS'ye hazır mı?" kontrolü. Kimlik numaraları uydurmadır (algoritmaya uyan sahte örnekler), gerçek kişilere ait değildir.</summary>
public class UetdsReadinessTests
{
    // Kontrol hanesi algoritmasına uyan sahte TCKN'ler.
    private const string FakeTckn = "12345678950";
    private const string FakeVkn = "1234567890";

    private static UetdsInput Ready() => new(
        new DateOnly(2026, 10, 5), new TimeOnly(8, 30), "Mobilya", 12_000, null, null,
        "İstanbul", "Tuzla", "İzmir", "Bornova", "Alıcı Ticaret A.Ş.", "10000000146", "34 ABC 123",
        "Ali Veli", FakeTckn, false, null, "0532 123 45 67",
        "34 VES 01", "Tır", null, "Gönderici Ltd.", FakeVkn);

    private static string[] Blocking(UetdsInput i) => UetdsReadiness.Check(i).Where(x => x.Blocking).Select(x => x.Code).ToArray();

    [Theory]
    [InlineData("12345678950", true)]
    [InlineData("11111111110", true)]
    [InlineData("55555555550", true)]
    [InlineData("98765432150", true)]
    [InlineData("20000000046", true)]
    [InlineData("10000000146", true)]
    [InlineData("12345678951", false)]   // son hane yanlış
    [InlineData("12345678960", false)]   // 10. hane yanlış
    [InlineData("02345678950", false)]   // 0 ile başlayamaz
    [InlineData("1234567895", false)]    // 10 hane
    [InlineData("123456789501", false)]  // 12 hane
    [InlineData("1234567895a", false)]
    [InlineData("", false)]
    public void Tckn_algorithm(string value, bool expected) => TaxNumberValidator.IsValidTckn(value).Should().Be(expected);

    [Fact]
    public void Fully_filled_trip_is_ready() => UetdsReadiness.Check(Ready()).Should().BeEmpty();

    [Fact]
    public void Missing_driver_tckn_is_reported_with_plain_message()
    {
        var issues = UetdsReadiness.Check(Ready() with { DriverNationalId = null });
        var issue = issues.Should().ContainSingle().Subject;
        issue.Code.Should().Be("driver.nationalId");
        issue.Target.Should().Be(UetdsTarget.Driver);
        issue.Message.Should().Contain("TC kimlik");
        issue.Blocking.Should().BeTrue();
    }

    [Theory]
    [InlineData("1234", "11 haneli")]
    [InlineData("12345678951", "geçersiz")]
    [InlineData("1234567895a", "11 haneli")]
    public void Wrong_driver_tckn_is_reported(string tckn, string text) =>
        UetdsReadiness.Check(Ready() with { DriverNationalId = tckn }).Should().ContainSingle(x => x.Code == "driver.nationalId" && x.Message.Contains(text));

    [Fact]
    public void Foreign_driver_needs_passport_and_nationality_not_tckn()
    {
        var foreign = Ready() with { DriverIsForeign = true, DriverNationalId = "U1234567", DriverNationality = "Gürcistan" };
        UetdsReadiness.Check(foreign).Should().BeEmpty();
        Blocking(foreign with { DriverNationality = " " }).Should().Equal("driver.nationality");
        Blocking(foreign with { DriverNationalId = "12 3" }).Should().Equal("driver.nationalId");
        Blocking(foreign with { DriverNationalId = null }).Should().Equal("driver.nationalId");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345")]
    public void Driver_phone_is_required_and_valid(string? phone) => Blocking(Ready() with { DriverPhone = phone }).Should().Equal("driver.phone");

    [Fact]
    public void Invalid_vehicle_plate_is_reported() => Blocking(Ready() with { VehiclePlate = "99 XX 1" }).Should().Equal("vehicle.plate");

    [Fact]
    public void Trailer_is_a_note_for_tractors_but_never_blocks()
    {
        var i = Ready() with { TripTrailerPlate = null };   // Tır, dorse yok
        var issues = UetdsReadiness.Check(i);
        issues.Should().ContainSingle(x => x.Code == "trip.trailerPlate" && !x.Blocking);
        UetdsReadiness.MissingCount(issues).Should().Be(0);
        UetdsReadiness.Check(i with { TripTrailerPlate = "34 DRS 01" }).Should().BeEmpty();
        UetdsReadiness.Check(i with { VehicleTrailerPlate = "34 DRS 01" }).Should().BeEmpty();   // araçtan gelen dorse sayılır
        UetdsReadiness.Check(i with { VehicleType = "Kamyon" }).Should().BeEmpty();
        Blocking(i with { TripTrailerPlate = "dorse" }).Should().Equal("trip.trailerPlate");   // yazılmışsa geçerli olmalı
    }

    [Theory]
    [InlineData("Tır", true)]
    [InlineData("TIR", true)]
    [InlineData("Çekici", true)]
    [InlineData("Lowbed", true)]
    [InlineData("Kamyon", false)]
    [InlineData("Kamyonet", false)]
    [InlineData(null, false)]
    public void Detects_vehicle_types_that_pull_a_trailer(string? type, bool expected) => UetdsReadiness.NeedsTrailer(type).Should().Be(expected);

    [Fact]
    public void Cargo_type_and_amount_are_required()
    {
        Blocking(Ready() with { CargoType = " " }).Should().Equal("trip.cargoType");
        Blocking(Ready() with { CargoWeightKg = null }).Should().Equal("trip.cargoAmount");
        Blocking(Ready() with { CargoWeightKg = 0, CargoQuantity = 0 }).Should().Equal("trip.cargoAmount");
        // Miktar yeter; birimi yoksa yalnızca not.
        var qty = Ready() with { CargoWeightKg = null, CargoQuantity = 20 };
        UetdsReadiness.Check(qty).Should().ContainSingle(x => x.Code == "trip.cargoUnit" && !x.Blocking);
        UetdsReadiness.Check(qty with { CargoUnit = "palet" }).Should().BeEmpty();
    }

    [Fact]
    public void Loading_and_delivery_need_city_and_district()
    {
        Blocking(Ready() with { LoadingCity = null, DeliveryDistrict = "" }).Should().Equal("trip.loadingCity", "trip.deliveryDistrict");
        Blocking(Ready() with { LoadingCity = "Atlantis" }).Should().Equal("trip.loadingCity");
        Blocking(Ready() with { LoadingDistrict = null, DeliveryCity = "" }).Should().Equal("trip.loadingDistrict", "trip.deliveryCity");
    }

    [Fact]
    public void Consignor_is_the_customer_and_consignee_comes_from_the_trip()
    {
        Blocking(Ready() with { CustomerTaxNumber = null }).Should().Equal("customer.taxNumber");
        Blocking(Ready() with { CustomerTaxNumber = "1234567891" }).Should().Equal("customer.taxNumber");
        UetdsReadiness.Check(Ready() with { CustomerTaxNumber = FakeTckn }).Should().BeEmpty();   // şahıs göndericinin TCKN'si de olur
        Blocking(Ready() with { ConsigneeTaxNumber = null }).Should().Equal("trip.consigneeTaxNumber");
        Blocking(Ready() with { ConsigneeTaxNumber = "123" }).Should().Equal("trip.consigneeTaxNumber");
        Blocking(Ready() with { ConsigneeTitle = null }).Should().Equal("trip.consigneeTitle");
    }

    [Fact]
    public void Loading_time_is_required() => Blocking(Ready() with { LoadingTime = null }).Should().Equal("trip.loadingTime");

    [Fact]
    public void Empty_trip_lists_every_missing_item()
    {
        var empty = Ready() with
        {
            LoadingTime = null, CargoType = null, CargoWeightKg = null, LoadingCity = null, LoadingDistrict = null, DeliveryCity = null,
            DeliveryDistrict = null, ConsigneeTitle = null, ConsigneeTaxNumber = null, DriverNationalId = null, DriverPhone = null,
            CustomerTaxNumber = null,
        };
        var issues = UetdsReadiness.Check(empty);
        UetdsReadiness.MissingCount(issues).Should().Be(12);
        issues.Select(x => x.Message).Should().OnlyContain(m => m.EndsWith('.') && m.Length > 10);
    }

    [Theory]
    [InlineData(TripStatus.Planned, false, true)]
    [InlineData(TripStatus.Loaded, false, true)]
    [InlineData(TripStatus.OnRoad, false, true)]
    [InlineData(TripStatus.Delivered, false, false)]
    [InlineData(TripStatus.Cancelled, false, false)]
    [InlineData(TripStatus.Planned, true, false)]
    public void Only_open_non_legacy_trips_count(TripStatus status, bool legacy, bool expected) =>
        UetdsReadiness.AppliesTo(status, legacy).Should().Be(expected);
}
