using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Nakliye sektörü KDV kuralları (docs/KDV-KURALLARI.md).</summary>
public class VatRulesTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private async Task<(HttpClient C, int Vehicle, int Driver)> FleetAsync(string plate)
    {
        var c = await factory.LoginAsync();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("KDV Şoför " + plate, null, null, null, null, null, null, true)))
            .ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"{plate} {Random.Shared.Next(1000, 99999)}", "Tır", null, null, null, 0, null, null, null, null,
            VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        return (c, vehicle.Id, driver.Id);
    }

    private static async Task<int> CustomerAsync(HttpClient c, string title, string? taxNo) =>
        (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest(title, taxNo, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer.Id;

    private static async Task<TripDto> TripAsync(HttpClient c, int customer, int vehicle, int driver, decimal sale, TripTerms? terms = null) =>
        await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer, vehicle, driver, "Tuzla", "Gebze", Today, null, null,
            sale / 2, sale, Terms: terms))).ReadAsync<TripDto>();

    private static async Task<InvoiceDto> InvoiceAsync(HttpClient c, int customer, int trip, decimal vat, int? withholding, string? exemption = null) =>
        await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer, Today, null, vat, withholding, null, false, [trip], null,
            exemption))).ReadAsync<InvoiceDto>();

    [Fact]
    public async Task Automatic_withholding_needs_total_over_limit_and_a_company_buyer()
    {
        var (c, vehicle, driver) = await FleetAsync("34 KD");
        var company = await CustomerAsync(c, "KDV Şirket", "1234567890");
        var person = await CustomerAsync(c, "KDV Şahıs", "10000000146");
        // Fatura formu otomatik tevkifatı önizlemek için müşterinin şirket olup olmadığını öğrenir.
        (await (await c.GetAsync($"/api/customers/{company}/invoice-defaults")).ReadAsync<CustomerInvoiceDefaultsDto>()).IsCompany.Should().BeTrue();
        (await (await c.GetAsync($"/api/customers/{person}/invoice-defaults")).ReadAsync<CustomerInvoiceDefaultsDto>()).IsCompany.Should().BeFalse();

        // 10.000 + 2.000 KDV = 12.000: sınırı aşmıyor → tevkifat yok.
        var small = await InvoiceAsync(c, company, (await TripAsync(c, company, vehicle, driver, 10_000)).Id, 20, null);
        small.WithholdingTenths.Should().Be(0);
        small.Total.Should().Be(12_000);

        // 20.000 + 4.000 KDV = 24.000 > 12.000 ve alıcı şirket → 2/10 (800 TL).
        var big = await InvoiceAsync(c, company, (await TripAsync(c, company, vehicle, driver, 20_000)).Id, 20, null);
        big.WithholdingTenths.Should().Be(2);
        big.WithholdingAmount.Should().Be(800);
        big.Total.Should().Be(23_200);

        // Alıcı şahıs (TCKN) → tevkifat yok; elle seçilen oran ise her zaman uygulanır.
        (await InvoiceAsync(c, person, (await TripAsync(c, person, vehicle, driver, 20_000)).Id, 20, null)).WithholdingTenths.Should().Be(0);
        (await InvoiceAsync(c, person, (await TripAsync(c, person, vehicle, driver, 20_000)).Id, 20, 2)).WithholdingTenths.Should().Be(2);
    }

    [Fact]
    public async Task Zero_vat_invoice_keeps_the_exemption_code()
    {
        var (c, vehicle, driver) = await FleetAsync("34 KD");
        var customer = await CustomerAsync(c, "KDV Yurt Dışı", "1234567890");

        var intl = await InvoiceAsync(c, customer, (await TripAsync(c, customer, vehicle, driver, 30_000, new TripTerms(SaleVatRate: 0))).Id, 0, null);
        intl.VatAmount.Should().Be(0);
        intl.WithholdingTenths.Should().Be(0);
        intl.VatExemptionCode.Should().Be("311");

        var export = await InvoiceAsync(c, customer, (await TripAsync(c, customer, vehicle, driver, 30_000)).Id, 0, 0, "302");
        export.VatExemptionCode.Should().Be("302");
        (await InvoiceAsync(c, customer, (await TripAsync(c, customer, vehicle, driver, 1_000)).Id, 20, 0)).VatExemptionCode.Should().BeNull();

        (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer, Today, null, 0, 0, null, false, [], [new(null, "x", 1)], "ABC")))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task New_trip_defaults_carrier_vat_to_20_and_expense_vat_follows_category()
    {
        var (c, vehicle, driver) = await FleetAsync("34 KD");
        var customer = await CustomerAsync(c, "KDV Gider", "1234567890");
        var trip = await TripAsync(c, customer, vehicle, driver, 10_000);
        trip.Terms!.CostVatRate.Should().Be(20);
        trip.Profit.Should().Be(5_000);

        // Yakıt: oran girilmedi → %20 varsayılan (saklanmaz); 1.200 → kâra 1.000.
        var fuel = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 1_200, Today, null, trip.Id, null)))
            .ReadAsync<ExpenseDto>();
        fuel.VatRate.Should().BeNull();
        // Yemek "Diğer" altında %10: 550 → 500.
        var meal = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Other, 550, Today, null, trip.Id, "Yemek",
            VatRate: 10))).ReadAsync<ExpenseDto>();
        meal.VatRate.Should().Be(10);
        // Harcırah KDV'siz: 300 → 300. Varsayılanla aynı oran seçilirse boş saklanır.
        var allowance = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAllowance, 300, Today, null, trip.Id, null,
            VatRate: 0))).ReadAsync<ExpenseDto>();
        allowance.VatRate.Should().BeNull();

        (await (await c.GetAsync($"/api/trips/{trip.Id}")).ReadAsync<TripDto>()).Profit.Should().Be(5_000 - 1_000 - 500 - 300);

        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Other, 100, Today, null, null, null, VatRate: 7)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
