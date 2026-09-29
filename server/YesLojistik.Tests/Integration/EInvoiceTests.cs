using System.Net;
using System.Xml.Linq;
using ClosedXML.Excel;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.EInvoice;

namespace YesLojistik.Tests.Integration;

public class EInvoiceTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private static readonly XNamespace Cbc = UblInvoiceBuilder.Cbc;
    private static readonly XNamespace Cac = UblInvoiceBuilder.Cac;

    private async Task<HttpClient> EnableAsync()
    {
        var c = await factory.LoginAsync();
        var s = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await c.PutJsonAsync("/api/settings", s with
        {
            TaxNumber = "1234567890", TaxOffice = "Kadıköy", City = "İstanbul", Address = "Test Cad. 1",
            EInvoiceEnabled = true, EInvoiceSeriesPrefix = "YES", EArchiveSeriesPrefix = "YEA",
        })).EnsureSuccessStatusCode();
        return c;
    }

    private static async Task<InvoiceDto> InvoiceAsync(HttpClient c, bool eInvoiceUser, int withholding, string suffix)
    {
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"e-Fatura Müşteri {suffix}", "1234567890", "Ümraniye",
            null, null, "Alemdağ Cad. 5", null, City: "İstanbul", District: "Ümraniye", IsEInvoiceUser: eInvoiceUser,
            EInvoiceAlias: eInvoiceUser ? "urn:mail:defaultpk@test.com" : null))).ReadAsync<CustomerSummaryDto>();
        return await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Customer.Id, Today, null, 20, withholding, null, false, [],
            [new InvoiceLineInput(null, "Gebze → İzmir nakliye bedeli", 10_000m), new InvoiceLineInput(null, "Bekleme bedeli", 1_234.57m)]))).ReadAsync<InvoiceDto>();
    }

    [Fact]
    public void Amount_in_words_is_turkish()
    {
        AmountInWords.Tr(12_345.67m).Should().Be("YALNIZ ONİKİBİNÜÇYÜZKIRKBEŞ TÜRK LİRASI ALTMIŞYEDİ KURUŞ");
        AmountInWords.Tr(1_000m).Should().Be("YALNIZ BİN TÜRK LİRASI");
        AmountInWords.Tr(101_100m).Should().Be("YALNIZ YÜZBİRBİNYÜZ TÜRK LİRASI");
        AmountInWords.Tr(2_000_001m).Should().Be("YALNIZ İKİMİLYONBİR TÜRK LİRASI");
        AmountInWords.Tr(0.5m).Should().Be("YALNIZ SIFIR TÜRK LİRASI ELLİ KURUŞ");
    }

    [Fact]
    public async Task EArchive_invoice_gets_number_ettn_and_valid_ubl()
    {
        var c = await EnableAsync();
        var inv = await InvoiceAsync(c, eInvoiceUser: false, withholding: 0, "A1");
        inv.Scenario.Should().Be(EInvoiceScenario.EArsiv);
        inv.EInvoiceStatus.Should().Be(EInvoiceStatus.Ready);
        inv.EInvoiceNo.Should().MatchRegex($"^YEA{Today.Year}\\d{{9}}$");
        inv.Ettn.Should().NotBeNull();

        var res = await c.GetAsync($"/api/invoices/{inv.Id}/einvoice/xml");
        res.Content.Headers.ContentType!.MediaType.Should().Be("application/xml");
        var doc = XDocument.Parse(await res.Content.ReadAsStringAsync());
        var root = doc.Root!;
        root.Element(Cbc + "ProfileID")!.Value.Should().Be("EARSIVFATURA");
        root.Element(Cbc + "InvoiceTypeCode")!.Value.Should().Be("SATIS");
        root.Element(Cbc + "ID")!.Value.Should().Be(inv.EInvoiceNo);
        root.Element(Cbc + "UUID")!.Value.Should().Be(inv.Ettn!.Value.ToString().ToUpperInvariant());
        root.Element(Cbc + "LineCountNumeric")!.Value.Should().Be("2");
        root.Elements(Cbc + "Note").First().Value.Should().StartWith("YALNIZ ONÜÇBİN");
        var total = root.Element(Cac + "LegalMonetaryTotal")!;
        total.Element(Cbc + "LineExtensionAmount")!.Value.Should().Be("11234.57");
        total.Element(Cbc + "PayableAmount")!.Value.Should().Be(inv.Total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
        root.Element(Cac + "TaxTotal")!.Element(Cbc + "TaxAmount")!.Value.Should().Be("2246.91");
        // Satır KDV'leri toplamı belge KDV'sine eşit (yuvarlama farkı son satırda).
        root.Elements(Cac + "InvoiceLine").Sum(l => decimal.Parse(l.Element(Cac + "TaxTotal")!.Element(Cbc + "TaxAmount")!.Value,
            System.Globalization.CultureInfo.InvariantCulture)).Should().Be(inv.VatAmount);
        root.Element(Cac + "AccountingCustomerParty")!.Descendants(Cbc + "ID").First().Attribute("schemeID")!.Value.Should().Be("VKN");

        // Elle akış: entegratör yokken gönder denemesi açıklamalı hata, "gönderildi" işareti çalışır.
        (await c.PostAsync($"/api/invoices/{inv.Id}/einvoice/send", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var sent = await (await c.PostAsync($"/api/invoices/{inv.Id}/einvoice/mark-sent", null)).ReadAsync<InvoiceDto>();
        sent.EInvoiceStatus.Should().Be(EInvoiceStatus.Sent);
    }

    [Fact]
    public async Task Withholding_invoice_to_einvoice_user_is_temel_tevkifat()
    {
        var c = await EnableAsync();
        var inv = await InvoiceAsync(c, eInvoiceUser: true, withholding: 2, "T1");
        inv.Scenario.Should().Be(EInvoiceScenario.Temel);
        inv.TypeCode.Should().Be(EInvoiceTypeCode.Tevkifat);
        inv.WithholdingCode.Should().Be("624");
        inv.EInvoiceNo.Should().StartWith($"YES{Today.Year}");

        var root = XDocument.Parse(await (await c.GetAsync($"/api/invoices/{inv.Id}/einvoice/xml")).Content.ReadAsStringAsync()).Root!;
        root.Element(Cbc + "ProfileID")!.Value.Should().Be("TEMELFATURA");
        root.Element(Cbc + "InvoiceTypeCode")!.Value.Should().Be("TEVKIFAT");
        var wh = root.Element(Cac + "WithholdingTaxTotal")!;
        wh.Element(Cbc + "TaxAmount")!.Value.Should().Be(inv.WithholdingAmount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
        wh.Descendants(Cbc + "Percent").First().Value.Should().Be("20");
        wh.Descendants(Cbc + "TaxTypeCode").First().Value.Should().Be("624");
        root.Element(Cac + "LegalMonetaryTotal")!.Element(Cbc + "TaxInclusiveAmount")!.Value.Should()
            .Be((inv.Subtotal + inv.VatAmount).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));

        // İptal: e-Fatura gönderilmeden iptal edilirse e-Fatura durumu da iptal.
        var cancelled = await (await c.PostAsync($"/api/invoices/{inv.Id}/cancel", null)).ReadAsync<InvoiceDto>();
        cancelled.EInvoiceStatus.Should().Be(EInvoiceStatus.Cancelled);
    }

    [Fact]
    public async Task Numbers_are_unique_under_concurrency()
    {
        await EnableAsync();
        var numbers = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
        {
            using var scope = factory.Services.CreateScope();
            await using var tx = await scope.ServiceProvider.GetRequiredService<YesLojistik.Infrastructure.Data.AppDbContext>().Database.BeginTransactionAsync();
            var n = await scope.ServiceProvider.GetRequiredService<EInvoiceService>().NextNumberAsync("TST", 2030);
            await tx.CommitAsync();
            return n;
        }));
        numbers.Should().OnlyHaveUniqueItems().And.HaveCount(10).And.OnlyContain(n => n.Length == 16 && n.StartsWith("TST2030"));
    }

    [Fact]
    public async Task Accounting_export_has_expected_sheets_and_xml_zip()
    {
        var c = await EnableAsync();
        await InvoiceAsync(c, false, 0, "X1");
        var res = await c.GetAsync($"/api/exports/accounting?from={Today.AddDays(-40):yyyy-MM-dd}&to={Today:yyyy-MM-dd}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        using var wb = new XLWorkbook(await res.Content.ReadAsStreamAsync());
        wb.Worksheets.Select(w => w.Name).Should().Equal("Satış Faturaları", "Tahsilatlar", "Giderler", "Taşeron Maliyetleri", "Taşeron Ödemeleri");
        wb.Worksheet("Satış Faturaları").RowsUsed().Count().Should().BeGreaterThan(1);

        var zip = await c.GetAsync($"/api/exports/einvoice-xml?from={Today.AddDays(-40):yyyy-MM-dd}&to={Today:yyyy-MM-dd}");
        zip.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");
        using var archive = new System.IO.Compression.ZipArchive(await zip.Content.ReadAsStreamAsync());
        archive.Entries.Should().NotBeEmpty().And.OnlyContain(e => e.Name.EndsWith(".xml"));
    }

    [Fact]
    public async Task Mock_provider_moves_through_statuses()
    {
        var mock = new MockEInvoiceProvider();
        var inv = new Invoice { EInvoiceNo = "YES2026000000001", Scenario = EInvoiceScenario.Ticari, EInvoiceStatus = EInvoiceStatus.Ready };
        (await mock.SendAsync(inv, "<Invoice>YES2026000000001</Invoice>")).Status.Should().Be(EInvoiceStatus.Sent);
        inv.EInvoiceStatus = EInvoiceStatus.Sent;
        (await mock.GetStatusAsync(inv)).Status.Should().Be(EInvoiceStatus.Delivered);
        inv.EInvoiceStatus = EInvoiceStatus.Delivered;
        (await mock.GetStatusAsync(inv)).Status.Should().Be(EInvoiceStatus.Accepted);
        (await mock.CancelAsync(inv, "x")).Status.Should().Be(EInvoiceStatus.CancelRequested);
        (await mock.CheckRecipientAsync("1234567899"))!.IsEInvoiceUser.Should().BeTrue();
    }

    [Fact]
    public async Task Operations_role_cannot_use_einvoice_endpoints()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Ops EF", "opsef@test.local", UserRole.Operations, true, "Ops12345"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("opsef@test.local", "Ops12345");
        (await ops.GetAsync("/api/einvoice/info")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.GetAsync("/api/exports/accounting")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
