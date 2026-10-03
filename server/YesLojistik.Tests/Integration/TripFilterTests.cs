using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>
/// Sevkiyatlar süzgeçleri (eski paneldeki "Filtrele"): Piyasa / Öz Araç, komisyon işi, yükleme/indirme yeri,
/// sevkiyat / teslim evrak / fatura no, teslim evrakı var/yok. Liste, toplamlar, Excel ve İcmal aynı süzgeci kullanır.
/// </summary>
public class TripFilterTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private record Setup(HttpClient C, int CustomerId, int SupplierId, int RentedVehicleId, TripDto Own, TripDto Rented, TripDto WithFile,
        string Unique, string InvoiceNo);

    private async Task<Setup> SetupAsync()
    {
        var c = await factory.LoginAsync();
        var u = Random.Shared.Next(700_000, 799_999).ToString();
        var s = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest($"Süzgeç Nakliyat {u}", SupplierKind.Carrier, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Süzgeç Müşteri {u}", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Süzgeç Şoför {u}", null, null, null, null, null, null, true)))
            .ReadAsync<DriverDto>();
        var own = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 SZ {u[..5]}", "Kamyon",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var rented = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 SZK {u[..5]}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id))).ReadAsync<VehicleDto>();

        var a = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, own.Id, driver.Id, "Tuzla OSB 3. cadde", "Gebze Plastikçiler",
            Today, null, "Kolay yük", 1_000, 2_000, CargoType: "Mobilya", LoadingCity: "İstanbul", DeliveryCity: "Kocaeli",
            Terms: new TripTerms(DeliveryDocumentNo: $"TE-{u}-A")))).ReadAsync<TripDto>();
        var b = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, rented.Id, driver.Id, "Sincan OSB", "Torbalı depo",
            Today, null, null, 3_000, 4_500, LoadingCity: "Ankara", DeliveryCity: "İzmir", CarrierInvoiceNo: $"TF-{u}",
            CarrierInvoiceDate: Today, Terms: new TripTerms(Commission: 300, ExternalRef: $"S{u}")))).ReadAsync<TripDto>();
        var f = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, own.Id, driver.Id, "Nilüfer OSB", "Kartal",
            Today, null, null, 500, 900, LoadingCity: "Bursa", DeliveryCity: "İstanbul"))).ReadAsync<TripDto>();

        // Üçüncü sefere teslim evrakı dosya olarak yüklenir (evrak no yok).
        var form = new MultipartFormDataContent
        {
            { new ByteArrayContent("%PDF-1.4\n%teslim\n"u8.ToArray()) { Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") } }, "file", "teslim.pdf" },
            { new StringContent("Document"), "kind" },
        };
        (await c.PostAsync($"/api/trips/{f.Id}/attachments", form)).StatusCode.Should().Be(HttpStatusCode.OK);

        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Id, Today, null, 20, 0, null, false, [a.Id], null)))
            .ReadAsync<InvoiceDto>();
        return new Setup(c, customer.Id, s.Id, rented.Id, a, b, f, u, invoice.InvoiceNo);
    }

    private static async Task<List<int>> Ids(Setup s, string filter) =>
        (await (await s.C.GetAsync($"/api/trips?customerId={s.CustomerId}&{filter}")).ReadAsync<PagedResult<TripDto>>())
        .Items.Select(t => t.Id).ToList();

    [Fact]
    public async Task New_trip_filters_narrow_the_list()
    {
        var s = await SetupAsync();
        int a = s.Own.Id, b = s.Rented.Id, f = s.WithFile.Id;

        (await Ids(s, "ownership=Rented")).Should().BeEquivalentTo([b]);
        (await Ids(s, "ownership=Own")).Should().BeEquivalentTo([a, f]);
        (await Ids(s, $"carrierSupplierId={s.SupplierId}")).Should().BeEquivalentTo([b]);
        (await Ids(s, $"vehicleId={s.RentedVehicleId}")).Should().BeEquivalentTo([b]);
        (await Ids(s, "hasCommission=true")).Should().BeEquivalentTo([b]);
        (await Ids(s, "hasCommission=false")).Should().BeEquivalentTo([a, f]);

        // Yer: il ya da adres içinde, büyük/küçük harf fark etmez.
        (await Ids(s, "loadingPlace=tuzla")).Should().BeEquivalentTo([a]);
        (await Ids(s, "loadingPlace=Bursa")).Should().BeEquivalentTo([f]);
        (await Ids(s, "deliveryPlace=torbal")).Should().BeEquivalentTo([b]);
        (await Ids(s, "deliveryPlace=Kocaeli")).Should().BeEquivalentTo([a]);

        // Numaralar: sevkiyat no (aktarılan kayıtta "S" öneki yazılmadan da), teslim evrak no, satış ya da taşeron fatura no.
        (await Ids(s, $"tripNo={s.Unique}")).Should().BeEquivalentTo([b]);
        (await Ids(s, $"tripNo=s{s.Unique}")).Should().BeEquivalentTo([b]);
        (await Ids(s, $"tripNo={a}")).Should().BeEquivalentTo([a]);
        (await Ids(s, $"tripNo={b}")).Should().BeEmpty(); // numarası eski sistemden gelen sefer kayıt numarasıyla bulunmaz
        (await Ids(s, $"deliveryDocumentNo=te-{s.Unique}")).Should().BeEquivalentTo([a]);
        (await Ids(s, $"invoiceNo={Uri.EscapeDataString(s.InvoiceNo)}")).Should().BeEquivalentTo([a]);
        (await Ids(s, $"invoiceNo=TF-{s.Unique}")).Should().BeEquivalentTo([b]);

        // Teslim evrakı: evrak no ya da yüklenen belge.
        (await Ids(s, "hasDeliveryDocument=true")).Should().BeEquivalentTo([a, f]);
        (await Ids(s, "hasDeliveryDocument=false")).Should().BeEquivalentTo([b]);

        // Süzgeçler birlikte çalışır.
        (await Ids(s, "ownership=Own&hasDeliveryDocument=true&loadingPlace=nil")).Should().BeEquivalentTo([f]);
    }

    [Fact]
    public async Task Totals_exports_and_summary_follow_the_new_filters()
    {
        var s = await SetupAsync();

        var totals = await (await s.C.GetAsync($"/api/trips/totals?customerId={s.CustomerId}&ownership=Rented")).ReadAsync<TripTotalsDto>();
        totals.Count.Should().Be(1);
        totals.Sale.Should().Be(4_500);
        totals.Commission.Should().Be(300);
        totals = await (await s.C.GetAsync($"/api/trips/totals?customerId={s.CustomerId}&hasDeliveryDocument=true")).ReadAsync<TripTotalsDto>();
        totals.Count.Should().Be(2);
        totals.Sale.Should().Be(2_900);

        var file = await s.C.GetAsync($"/api/trips/export?customerId={s.CustomerId}&hasCommission=false");
        file.StatusCode.Should().Be(HttpStatusCode.OK);
        using (var book = new ClosedXML.Excel.XLWorkbook(await file.Content.ReadAsStreamAsync()))
        {
            var sheet = book.Worksheet(1);
            sheet.RowsUsed().Count().Should().BeGreaterThanOrEqualTo(3).And.BeLessThanOrEqualTo(4); // başlık + 2 sefer (+ toplam)
            sheet.Row(1).CellsUsed().Select(x => x.GetString()).Should().Contain(["Ürün", "Açıklama", "Fatura Tarihi", "Kaydı Giren"]);
        }

        var summary = await (await s.C.GetAsync($"/api/trips/summary?customerId={s.CustomerId}&ownership=Own")).ReadAsync<List<TripSummaryRow>>();
        summary.Sum(r => r.TripCount).Should().Be(2);
        (await s.C.GetAsync($"/api/trips/pdf?customerId={s.CustomerId}&loadingPlace=tuzla")).Content.Headers.ContentType!.MediaType
            .Should().Be("application/pdf");
    }

    [Fact]
    public async Task List_rows_carry_invoice_date_and_who_created_the_trip()
    {
        var s = await SetupAsync();
        var row = (await (await s.C.GetAsync($"/api/trips?customerId={s.CustomerId}&tripNo={s.Own.Id}")).ReadAsync<PagedResult<TripDto>>()).Items.Single();
        row.InvoiceNo.Should().Be(s.InvoiceNo);
        row.InvoiceDate.Should().Be(Today);
        row.CreatedBy.Should().NotBeNullOrWhiteSpace();
        row.CargoType.Should().Be("Mobilya");
        row.Description.Should().Be("Kolay yük");
    }
}
