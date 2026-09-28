using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class DocumentTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Waybill_and_statement_pdfs_are_generated_and_statement_can_be_emailed()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest(
            "Ekstre Mobilya", "1234567890", "Tuzla", null, "muhasebe@ekstre.com", "İstanbul", null, 1_000, Today.AddDays(-40)))).ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Ali Veli", "05321234567", "10000000146", "ce", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 IRS 01", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "İstanbul", "Ankara", Today, null, "20 palet mobilya", 7_000, 10_000))).ReadAsync<TripDto>();

        var waybill = await c.GetAsync($"/api/trips/{trip.Id}/waybill?download=true");
        waybill.StatusCode.Should().Be(HttpStatusCode.OK);
        waybill.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        waybill.Content.Headers.ContentDisposition!.FileNameStar.Should().Be($"S-{trip.Id:D6}.pdf");
        (await c.GetAsync("/api/trips/999999/waybill")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Id, Today, null, 20, 0, null, false, [trip.Id], null))).ReadAsync<InvoiceDto>();
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customer.Id, null, Today, 4_000, PaymentMethod.BankTransfer, null))).ReadAsync<PaymentDto>();

        var all = await c.GetAsync($"/api/customers/{customer.Id}/statement");
        all.StatusCode.Should().Be(HttpStatusCode.OK);
        (await all.Content.ReadAsByteArrayAsync()).Take(5).Should().Equal("%PDF-"u8.ToArray());
        (await c.GetAsync($"/api/customers/{customer.Id}/statement?from={Today:yyyy-MM-dd}&to={Today:yyyy-MM-dd}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await c.GetAsync($"/api/customers/{customer.Id}/statement?from={Today:yyyy-MM-dd}&to={Today.AddDays(-1):yyyy-MM-dd}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var sent = await (await c.PostJsonAsync($"/api/customers/{customer.Id}/statement/email", new StatementEmailRequest(null, null, null, null))).ReadAsync<Dictionary<string, string>>();
        sent["sentTo"].Should().Be("muhasebe@ekstre.com");
        var mail = factory.Email.Sent.Last();
        mail.Attachments.Should().ContainSingle(a => a.ContentType == "application/pdf");
        // 1.000 devir + 12.000 fatura − 4.000 tahsilat = 9.000
        mail.Body.Should().Contain("9.000,00");
    }
}
