using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Müşteri e-Fatura şablonu, firma grupları ve hazır fatura notları (eski paneldeki "Şablon", "Gruplar", "Fatura Notları").</summary>
public class CustomerTemplateTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Template_shapes_invoice_lines_and_notes()
    {
        var c = await factory.LoginAsync();
        var note = await (await c.PostJsonAsync("/api/invoice-notes", new InvoiceNoteSaveRequest(InvoiceNoteKind.Sale, "Akbank",
            "YES LOJİSTİK", "TR33 0006 1005 1978 6457 8413 26", "Ödemelerinizi aşağıdaki hesaba yapınız."))).ReadAsync<InvoiceNoteDto>();
        note.Iban.Should().Be("TR330006100519786457841326");
        (await c.PostJsonAsync("/api/invoice-notes", new InvoiceNoteSaveRequest(InvoiceNoteKind.Sale, "Hatalı", null, "TR00 1234", null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var template = new InvoiceTemplateDto(LineDate: false, LinePlate: false, LineCargo: true, LineDeliveryDocumentNo: true,
            Note: "Sabit not", SaleNoteId: note.Id, Scenario: EInvoiceScenario.Ticari);
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Şablon Müşteri", "1234567890", "Tuzla", null, null, null, null,
            Extras: new CustomerExtras("Türkiye", "Aydınlı Mah.", "Sanayi Cad.", null, "12", "3", "34953", "0216 555 44 33", "www.ornek.com"),
            InvoiceTemplate: template, Groups: ["Şantiye-7", "Merkez", "merkez"]))).ReadAsync<CustomerSummaryDto>()).Customer;
        customer.Extras!.PostalCode.Should().Be("34953");
        customer.InvoiceTemplate!.LineCargo.Should().BeTrue();
        customer.InvoiceTemplate.LineDate.Should().BeFalse();
        customer.Groups.Should().BeEquivalentTo(["Merkez", "Şantiye-7"]);

        // Grup listesi gönderilmezse gruplar korunur; gönderilirse eşitlenir.
        customer = (await (await c.PutJsonAsync($"/api/customers/{customer.Id}", new CustomerSaveRequest("Şablon Müşteri", "1234567890", "Tuzla", null, null, null, null,
            InvoiceTemplate: template))).ReadAsync<CustomerSummaryDto>()).Customer;
        customer.Groups.Should().HaveCount(2);
        customer = (await (await c.PutJsonAsync($"/api/customers/{customer.Id}", new CustomerSaveRequest("Şablon Müşteri", "1234567890", "Tuzla", null, null, null, null,
            InvoiceTemplate: template, Groups: ["Merkez"]))).ReadAsync<CustomerSummaryDto>()).Customer;
        customer.Groups.Should().BeEquivalentTo(["Merkez"]);

        var defaults = await (await c.GetAsync($"/api/customers/{customer.Id}/invoice-defaults")).ReadAsync<CustomerInvoiceDefaultsDto>();
        defaults.Notes.Should().Contain("Sabit not").And.Contain("TR330006100519786457841326");
        defaults.Scenario.Should().Be(EInvoiceScenario.Ticari);

        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Şablon Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 SB {Random.Shared.Next(1000, 99999)}", "Kamyon",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla", "Gebze", Today, null, null,
            1_000, 2_000, CargoType: "Mobilya", Terms: new TripTerms(DeliveryDocumentNo: "TE-55", ExtraCharge: 120, ExtraChargeInvoiced: true,
                ExtraChargeTitle: "Hamaliye", InvoiceFooterNote: "Sipariş 4500", ShowFooterNote: true)))).ReadAsync<TripDto>();

        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Id, Today, null, 20, 0, defaults.Notes, false, [trip.Id], null)))
            .ReadAsync<InvoiceDto>();
        invoice.Lines.Should().HaveCount(2);
        var main = invoice.Lines.First(l => l.Amount == 2_000);
        main.Description.Should().Be("Tuzla → Gebze nakliye bedeli (Mobilya, Teslim No: TE-55)");
        // KDV dahil 120 TL masraf, faturaya KDV hariç 100 TL satır olarak yazılır.
        invoice.Lines.Should().Contain(l => l.Amount == 100 && l.Description.Contains("Hamaliye"));
        invoice.Subtotal.Should().Be(2_100);
        invoice.Notes.Should().Contain("Sabit not").And.Contain("Sipariş 4500");
    }
}
