using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>
/// e-Fatura sayaç kutuları (şartname: docs/plan/06-FATURALANDIRILACAKLAR.md §3; sözleşme: docs/plan/30-VERI-API.md §10.2).
/// `GET /api/invoices/counters` salt okunurdur ve sayıları mevcut kayıtlardan hesaplar; migration/şema değişikliği yoktur.
/// Sayı uydurulmaz: "faturalandırılacak" sevkiyat listesiyle aynı küme, "bugün kesilen" fatura tarihi bugün olan kesilmiş
/// faturalar, "vadesi geçen" kalanı sıfırdan büyük vadesi geçmiş faturalardır.
/// </summary>
public class InvoiceCounterTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private static async Task<InvoiceCountersDto> CountersAsync(HttpClient c) =>
        await (await c.GetAsync("/api/invoices/counters")).ReadAsync<InvoiceCountersDto>();

    private static async Task<InvoiceDto> InvoiceAsync(HttpClient c, int customerId, DateOnly date, DateOnly? dueDate, bool draft, decimal amount) =>
        await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customerId, date, dueDate, 20, 0, null, draft, [],
            [new InvoiceLineInput(null, "Nakliye bedeli", amount)]))).ReadAsync<InvoiceDto>();

    private static async Task<int> TripAsync(HttpClient c, int customerId, int vehicleId, int driverId, decimal salePrice, bool delivered)
    {
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customerId, vehicleId, driverId, "İstanbul", "Ankara",
            Today.AddDays(-2), null, null, 500, salePrice))).ReadAsync<TripDto>();
        TripStatus[] statuses = delivered
            ? [TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered]
            : [TripStatus.Loaded];
        foreach (var status in statuses)
            await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(status))).ReadAsync<TripDto>();
        return trip.Id;
    }

    [Fact]
    public async Task Counters_report_invoices_and_uninvoiced_trips()
    {
        var c = await factory.LoginAsync();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Sayaç Müşteri", "1234567890", null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>();
        var start = await CountersAsync(c);

        // Bugün kesilen (vadesi gelmemiş) fatura.
        var todayIssued = await InvoiceAsync(c, customer.Customer.Id, Today, Today.AddDays(30), draft: false, 1_000);
        // Vadesi geçmiş fatura: tarih 40 gün önce, vade 10 gün önce.
        var overdue = await InvoiceAsync(c, customer.Customer.Id, Today.AddDays(-40), Today.AddDays(-10), draft: false, 2_500);
        // Taslak: kesilmiş sayılmaz, "bugün kesilen" sayacına girmez.
        await InvoiceAsync(c, customer.Customer.Id, Today, null, draft: true, 700);
        // İptal edilen: yalnız "iptal" sayacına girer.
        var cancelled = await InvoiceAsync(c, customer.Customer.Id, Today.AddDays(-5), Today.AddDays(25), draft: false, 400);
        (await c.PostAsync($"/api/invoices/{cancelled.Id}/cancel", null)).EnsureSuccessStatusCode();

        var counters = await CountersAsync(c);
        counters.Draft.Should().Be(start.Draft + 1);
        counters.Issued.Should().Be(start.Issued + 2);
        counters.Cancelled.Should().Be(start.Cancelled + 1);
        counters.TodayIssued.Should().Be(start.TodayIssued + 1);
        counters.TodayIssuedTotal.Should().Be(start.TodayIssuedTotal + todayIssued.Total);
        counters.Overdue.Should().Be(start.Overdue + 1);
        counters.OverdueTotal.Should().Be(start.OverdueTotal + overdue.Total);

        // Faturalandırılacak: teslim edilmiş ve faturasız sevkiyatlar sayılır; yolda olan sayılmaz.
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 SYC 01", "Tır", null, null, null, 0, null, null, null,
            null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Sayaç Şoför", null, null, "CE", null, null, null, true)))
            .ReadAsync<DriverDto>();
        await TripAsync(c, customer.Customer.Id, vehicle.Id, driver.Id, 1_000, delivered: true);
        await TripAsync(c, customer.Customer.Id, vehicle.Id, driver.Id, 2_500, delivered: true);
        await TripAsync(c, customer.Customer.Id, vehicle.Id, driver.Id, 9_000, delivered: false);

        var afterTrips = await CountersAsync(c);
        afterTrips.UninvoicedTrips.Should().Be(start.UninvoicedTrips + 2);
        afterTrips.UninvoicedTotal.Should().Be(start.UninvoicedTotal + 3_500);

        // Sayaç, ekrandaki "Faturalandırılacaklar" listesinin kaynağıyla aynı kümeyi sayar (e2e karşılaştırmasının sunucu ayağı).
        var pending = await (await c.GetAsync("/api/trips?invoiced=false&status=Delivered&pageSize=500")).ReadAsync<PagedResult<TripDto>>();
        pending.Items.Should().HaveCount(afterTrips.UninvoicedTrips);
    }

    [Fact]
    public async Task Counters_require_accounting_permission()
    {
        var c = await factory.LoginAsync();
        (await c.PostJsonAsync("/api/users", new UserSaveRequest("Ops Sayaç", "opssayac@test.local", UserRole.Operations, true, "Ops12345")))
            .EnsureSuccessStatusCode();
        var ops = await factory.LoginAsync("opssayac@test.local", "Ops12345");

        (await ops.GetAsync("/api/invoices/counters")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await c.GetAsync("/api/invoices/counters")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
