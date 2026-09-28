using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class WorkflowTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private async Task<(HttpClient Client, int CustomerId, int VehicleId, int DriverId)> SetupAsync(string plate)
    {
        var c = await factory.LoginAsync();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest(
            "Test Mobilya " + plate, "1234567890", "Tuzla", "0216 555 44 33", "a@b.com", "İstanbul", null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest(
            "Mehmet Yılmaz", "05321234567", null, "ce", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest(
            plate, "Kamyon", "Ford", "Cargo", 2020, 1000, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        return (c, customer.Customer.Id, vehicle.Id, driver.Id);
    }

    private static TripSaveRequest Trip(int customer, int vehicle, int driver, decimal price) =>
        new(customer, vehicle, driver, "İstanbul / Sultanbeyli", "İzmir / Balçova", Today, null, "Mobilya", price * 0.7m, price);

    [Fact]
    public async Task Full_trip_to_payment_flow_updates_balances()
    {
        var (c, customerId, vehicleId, driverId) = await SetupAsync("34yes01");

        var trip = await (await c.PostJsonAsync("/api/trips", Trip(customerId, vehicleId, driverId, 25_000))).ReadAsync<TripDto>();
        trip.Status.Should().Be(TripStatus.Planned);
        trip.VehiclePlate.Should().Be("34 YES 01");
        trip.Profit.Should().Be(7_500);

        // Durumları ilerlet, araç otomatik "Yolda" olmalı.
        foreach (var s in new[] { TripStatus.Loaded, TripStatus.OnRoad })
            trip = await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(s))).ReadAsync<TripDto>();
        (await (await c.GetAsync($"/api/vehicles/{vehicleId}")).ReadAsync<VehicleDto>()).Status.Should().Be(VehicleStatus.OnRoad);

        trip = await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Delivered))).ReadAsync<TripDto>();
        trip.DeliveryDate.Should().NotBeNull();
        (await (await c.GetAsync($"/api/vehicles/{vehicleId}")).ReadAsync<VehicleDto>()).Status.Should().Be(VehicleStatus.Available);

        // Gider ekle: kâr düşmeli.
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 1_500, Today, null, trip.Id, "Mazot"))).ReadAsync<ExpenseDto>();
        (await (await c.GetAsync($"/api/trips/{trip.Id}")).ReadAsync<TripDto>()).Profit.Should().Be(6_000);

        // Fatura kes: 25.000 + 5.000 KDV − 1.000 tevkifat = 29.000
        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(
            customerId, Today, null, 20, 2, null, false, [trip.Id], null))).ReadAsync<InvoiceDto>();
        invoice.Total.Should().Be(29_000);
        invoice.Remaining.Should().Be(29_000);
        invoice.InvoiceNo.Should().MatchRegex(@"^F-\d{6}$");
        invoice.Lines.Should().ContainSingle(l => l.TripId == trip.Id);

        var pdf = await c.GetAsync($"/api/invoices/{invoice.Id}/pdf");
        pdf.StatusCode.Should().Be(HttpStatusCode.OK);
        pdf.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        (await pdf.Content.ReadAsByteArrayAsync()).Take(4).Should().Equal("%PDF"u8.ToArray());

        // Faturalanmış sefer ikinci kez faturalanamaz.
        (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customerId, Today, null, 20, 2, null, false, [trip.Id], null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Kısmi tahsilat.
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, invoice.Id, Today, 10_000, PaymentMethod.BankTransfer, null))).ReadAsync<PaymentDto>();
        invoice = await (await c.GetAsync($"/api/invoices/{invoice.Id}")).ReadAsync<InvoiceDto>();
        invoice.Paid.Should().Be(10_000);
        invoice.Remaining.Should().Be(19_000);
        invoice.PaymentStatus.Should().Be("Kısmi Ödendi");

        var summary = await (await c.GetAsync($"/api/customers/{customerId}")).ReadAsync<CustomerSummaryDto>();
        summary.TotalDebit.Should().Be(29_000);
        summary.TotalCredit.Should().Be(10_000);
        summary.Balance.Should().Be(19_000);

        var movements = await (await c.GetAsync($"/api/customers/{customerId}/movements")).ReadAsync<List<AccountMovementDto>>();
        movements.Should().HaveCount(2);
        movements.Last().RunningBalance.Should().Be(19_000);

        var dashboard = await (await c.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>();
        dashboard.ReceivableTotal.Should().BeGreaterThanOrEqualTo(19_000);

        // Tahsilatı olan fatura iptal edilemez.
        (await c.PostAsync($"/api/invoices/{invoice.Id}/cancel", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cancelling_invoice_releases_trips_and_keeps_number()
    {
        var (c, customerId, vehicleId, driverId) = await SetupAsync("34yes02");
        var trip = await (await c.PostJsonAsync("/api/trips", Trip(customerId, vehicleId, driverId, 10_000))).ReadAsync<TripDto>();
        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(
            customerId, Today, null, 20, 0, null, false, [trip.Id], [new InvoiceLineInput(null, "Hamaliye", 500)]))).ReadAsync<InvoiceDto>();
        invoice.Subtotal.Should().Be(10_500);
        invoice.Total.Should().Be(12_600);

        // Faturalı sefer iptal edilemez / satış fiyatı değiştirilemez.
        (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Cancelled)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PutJsonAsync($"/api/trips/{trip.Id}", Trip(customerId, vehicleId, driverId, 11_000)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var cancelled = await (await c.PostAsync($"/api/invoices/{invoice.Id}/cancel", null)).ReadAsync<InvoiceDto>();
        cancelled.Status.Should().Be(InvoiceStatus.Cancelled);
        cancelled.InvoiceNo.Should().Be(invoice.InvoiceNo);
        (await (await c.GetAsync($"/api/trips/{trip.Id}")).ReadAsync<TripDto>()).InvoiceId.Should().BeNull();
        (await (await c.GetAsync($"/api/customers/{customerId}")).ReadAsync<CustomerSummaryDto>()).Balance.Should().Be(0);
    }

    [Fact]
    public async Task Invoice_numbers_are_unique_and_sequential_under_concurrency()
    {
        var (c, customerId, _, _) = await SetupAsync("34yes03");
        var tasks = Enumerable.Range(0, 8).Select(i => c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(
            customerId, Today, null, 20, 0, null, false, [], [new InvoiceLineInput(null, $"Hizmet {i}", 100)])));
        var results = await Task.WhenAll(tasks);
        var numbers = new List<int>();
        foreach (var r in results) numbers.Add(int.Parse((await r.ReadAsync<InvoiceDto>()).InvoiceNo[2..]));
        numbers.Should().OnlyHaveUniqueItems();
        (numbers.Max() - numbers.Min()).Should().Be(7);
    }

    [Fact]
    public async Task Invalid_status_transition_is_rejected_with_message()
    {
        var (c, customerId, vehicleId, driverId) = await SetupAsync("34yes04");
        var trip = await (await c.PostJsonAsync("/api/trips", Trip(customerId, vehicleId, driverId, 5_000))).ReadAsync<TripDto>();
        var res = await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Delivered));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).Should().Contain("Planlandı");
    }

    [Fact]
    public async Task Vehicle_in_maintenance_cannot_start_trip()
    {
        var (c, customerId, vehicleId, driverId) = await SetupAsync("34yes05");
        var trip = await (await c.PostJsonAsync("/api/trips", Trip(customerId, vehicleId, driverId, 5_000))).ReadAsync<TripDto>();
        var v = await (await c.GetAsync($"/api/vehicles/{vehicleId}")).ReadAsync<VehicleDto>();
        await (await c.PutJsonAsync($"/api/vehicles/{vehicleId}", new VehicleSaveRequest(v.Plate, v.Type, v.Brand, v.Model, v.ModelYear, v.Km,
            null, null, null, null, VehicleStatus.Maintenance, v.DefaultDriverId))).ReadAsync<VehicleDto>();
        (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Validation_errors_are_returned_per_field()
    {
        var c = await factory.LoginAsync();
        var res = await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("", "123", null, "12", "not-an-email", null, null));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("\"title\"").And.Contain("\"taxNumber\"").And.Contain("\"phone\"").And.Contain("\"email\"");
    }

    [Fact]
    public async Task Duplicate_plate_returns_conflict()
    {
        var (c, _, _, _) = await SetupAsync("34yes06");
        var res = await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 YES 06", "Kamyon", null, null, null, 0, null, null, null, null, VehicleStatus.Available, null));
        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Invoice_is_emailed_with_pdf_and_driver_report_counts_trips()
    {
        var (c, customerId, vehicleId, driverId) = await SetupAsync("34yes07");
        var trip = await (await c.PostJsonAsync("/api/trips", Trip(customerId, vehicleId, driverId, 10_000))).ReadAsync<TripDto>();
        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(
            customerId, Today, null, 20, 0, null, false, [trip.Id], null))).ReadAsync<InvoiceDto>();

        (await c.GetAsync("/api/settings")).Content.ReadAsStringAsync().Result.Should().Contain("\"emailEnabled\":true");
        (await c.PostJsonAsync($"/api/invoices/{invoice.Id}/email", new InvoiceEmailRequest("yanlis", null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync($"/api/invoices/{invoice.Id}/email", new InvoiceEmailRequest(null, "Teşekkürler"))).EnsureSuccessStatusCode();
        var mail = factory.Email.Sent.Last();
        mail.To.Should().Be("a@b.com");
        mail.Subject.Should().Contain(invoice.InvoiceNo);
        mail.Body.Should().Contain("12.000,00 TL").And.Contain("Teşekkürler");
        mail.Attachments.Should().ContainSingle().Which.Content.Take(4).Should().Equal("%PDF"u8.ToArray());

        var drivers = await (await c.GetAsync($"/api/reports/drivers?from={Today:yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).ReadAsync<List<DriverReportRow>>();
        drivers.Single(d => d.DriverId == driverId).Revenue.Should().Be(10_000);
    }

    [Fact]
    public async Task Excel_exports_are_generated()
    {
        var c = await factory.LoginAsync();
        foreach (var url in new[] { "/api/trips/export", "/api/invoices/export", "/api/reports/monthly?format=xlsx", "/api/reports/aging?format=xlsx" })
        {
            var res = await c.GetAsync(url);
            res.StatusCode.Should().Be(HttpStatusCode.OK, url);
            res.Content.Headers.ContentType!.MediaType.Should().Contain("spreadsheetml");
        }
    }
}
