using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Eski paneldeki sevkiyat alanları: komisyon, masraf, prim, KDV/tevkifat ve kazanç tablosu.</summary>
public class TripTermsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Terms_are_saved_and_change_profit_totals_and_carrier_payable()
    {
        var c = await factory.LoginAsync();
        var s = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Komisyon Nakliyat", SupplierKind.Carrier, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Komisyon Müşteri", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 KM {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Komisyon Şoför", null, null, null, null, null, null, true, s.Id,
            LicenseNo: "208140", BirthYear: 1990, Plate: "34 km 1757", Rating: DriverRating.Workable, Note: "Dakik"))).ReadAsync<DriverDto>();
        driver.Rating.Should().Be(DriverRating.Workable);
        driver.Plate.Should().Be("34 KM 1757");

        var terms = new TripTerms(SaleVatRate: 20, SaleWithholdingTenths: 2, CostVatRate: 10, Commission: 500,
            CommissionStatus: CommissionStatus.DeductFromInvoice, ExtraCharge: 300, DriverBonus: 200, CustomerGroup: "Şantiye-7",
            DeliveryDocumentNo: "TE-1", WaybillNo: "IRS-9", DistanceKm: 450, InvoiceFooterNote: "IBAN: TR00", ShowFooterNote: true, ExternalRef: "978");
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla", "Çekmeköy", Today, null,
            null, 4_500, 9_500, Terms: terms))).ReadAsync<TripDto>();

        trip.Terms!.Commission.Should().Be(500);
        trip.Terms.SaleWithholdingTenths.Should().Be(2);
        trip.Terms.CostVatRate.Should().Be(10);
        trip.Terms.CustomerGroup.Should().Be("Şantiye-7");
        trip.Terms.ExternalRef.Should().Be("978");
        // KDV hariç: 9.500 − 4.500 + 416,67 komisyon (500 KDV dahil) − 200 prim − 250 masraf (300 KDV dahil, faturalanmıyor)
        trip.Profit.Should().Be(4_966.67m);

        // Masraf müşteriye faturalanırsa kâra yük olmaz; aktarım numarası formdan silinemez.
        trip = await (await c.PutJsonAsync($"/api/trips/{trip.Id}", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla", "Çekmeköy", Today, null,
            null, 4_500, 9_500, Terms: terms with { ExtraChargeInvoiced = true, ExternalRef = null }))).ReadAsync<TripDto>();
        trip.Profit.Should().Be(5_216.67m);
        trip.Terms!.ExternalRef.Should().Be("978");

        var totals = await (await c.GetAsync($"/api/trips/totals?customerId={customer.Id}")).ReadAsync<TripTotalsDto>();
        totals.Count.Should().Be(1);
        totals.Sale.Should().Be(9_500);
        totals.Commission.Should().Be(416.67m);
        totals.CommissionBank.Should().Be(0);
        totals.Profit.Should().Be(5_216.67m);

        var groups = await (await c.GetAsync($"/api/trips?customerGroup={Uri.EscapeDataString("Şantiye-7")}")).ReadAsync<PagedResult<TripDto>>();
        groups.Items.Should().ContainSingle(t => t.Id == trip.Id);
        var byRef = await (await c.GetAsync("/api/trips?search=IRS-9")).ReadAsync<PagedResult<TripDto>>();
        byRef.Items.Should().Contain(t => t.Id == trip.Id);

        // Yüklenince taşeron borcu oluşur; "faturadan düş" komisyonu borçtan düşülür.
        await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded));
        var summary = await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierSummaryDto>();
        // 4.500 + %10 KDV = 4.950 (12.000 altı: tevkifatsız) − 500 komisyon
        summary.Balance.Should().Be(4_450);
    }

    [Fact]
    public async Task Invalid_terms_are_rejected()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Hatalı Koşul Müşteri", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Hatalı Koşul Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 HK {Random.Shared.Next(1000, 99999)}", "Kamyon",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        TripSaveRequest With(TripTerms t) => new(customer.Id, vehicle.Id, driver.Id, "A", "B", Today, null, null, 1_000, 2_000, Terms: t);

        (await c.PostJsonAsync("/api/trips", With(new TripTerms(SaleVatRate: 15)))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/trips", With(new TripTerms(Commission: -1)))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/trips", With(new TripTerms(SaleWithholdingTenths: 11)))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/trips", With(new TripTerms(Commission: 100, CommissionAccountId: 999_999)))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/trips", With(new TripTerms(ExtraCharge: 50, ExtraChargeTaxNo: "123")))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
