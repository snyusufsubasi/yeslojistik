using System.Net;
using ClosedXML.Excel;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

/// <summary>
/// Cari tablolarındaki yeni sütunlar (iptal/alınan fatura, faturasız sevkiyatlar), tablonun Excel/PDF çıktısı,
/// ekstrede "faturasız seferleri de göster", Fatura İcmali PDF'i ve faturalarda sevkiyat no ile arama.
/// </summary>
public class CariExportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private static string U() => Random.Shared.Next(100_000, 999_999).ToString();

    private record Fleet(CustomerDto Customer, VehicleDto Vehicle, DriverDto Driver);

    private static async Task<Fleet> FleetAsync(HttpClient c, string title)
    {
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest(title, null, null, null, "muhasebe@cari.test", "Gebze OSB", null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"{title} Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 CR {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        return new Fleet(customer, vehicle, driver);
    }

    private static async Task<TripDto> DeliveredTripAsync(HttpClient c, Fleet f, decimal sale, string? externalRef = null, DateOnly? date = null)
    {
        var t = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(f.Customer.Id, f.Vehicle.Id, f.Driver.Id, "Tuzla", "Çorlu", date ?? Today, null, null,
            sale / 2, sale, LoadingCity: "İstanbul", DeliveryCity: "Tekirdağ", Terms: externalRef == null ? null : new TripTerms(ExternalRef: externalRef)))).ReadAsync<TripDto>();
        foreach (var s in new[] { TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered })
            t = await (await c.PostJsonAsync($"/api/trips/{t.Id}/status", new TripStatusRequest(s))).ReadAsync<TripDto>();
        return t;
    }

    private static Task<InvoiceDto> InvoiceAsync(HttpClient c, int customerId, params int[] tripIds) =>
        c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customerId, Today, null, 20, 0, null, false, tripIds, null))
            .ContinueWith(t => t.Result.ReadAsync<InvoiceDto>()).Unwrap();

    private static async Task<XLWorkbook> WorkbookAsync(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        res.Content.Headers.ContentType!.MediaType.Should().Contain("spreadsheet");
        return new XLWorkbook(new MemoryStream(await res.Content.ReadAsByteArrayAsync()));
    }

    private static async Task ShouldBePdfAsync(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        res.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        (await res.Content.ReadAsByteArrayAsync())[..4].Should().Equal("%PDF"u8.ToArray());
    }

    /// <summary>Sayfadaki tablo: başlık satırı (ilk sütunu verilen başlık olan satır) ve altındaki satırlar.</summary>
    private static (List<string> Headers, List<IXLRow> Rows) Table(IXLWorksheet ws, string firstHeader)
    {
        var header = ws.RowsUsed().First(r => r.Cell(1).GetString() == firstHeader);
        var headers = header.CellsUsed().Select(x => x.GetString()).ToList();
        return (headers, ws.RowsUsed().Where(r => r.RowNumber() > header.RowNumber()).ToList());
    }

    [Fact]
    public async Task Customer_cari_shows_cancelled_and_uninvoiced_and_exports_as_filtered_and_sorted()
    {
        var c = await factory.LoginAsync();
        var u = U();
        var big = await FleetAsync(c, $"Çağlar Cari {u} Büyük");
        var small = await FleetAsync(c, $"Çağlar Cari {u} Küçük");

        // Büyük: kesilen fatura 12.000; iptal edilen fatura 9.600 (sefer yeniden faturasız: 8.000); ayrıca faturasız 5.000.
        var invoiced = await DeliveredTripAsync(c, big, 10_000);
        await InvoiceAsync(c, big.Customer.Id, invoiced.Id);
        var again = await DeliveredTripAsync(c, big, 8_000);
        var cancelled = await InvoiceAsync(c, big.Customer.Id, again.Id);
        (await (await c.PostAsync($"/api/invoices/{cancelled.Id}/cancel", null)).ReadAsync<InvoiceDto>()).Status.Should().Be(InvoiceStatus.Cancelled);
        await DeliveredTripAsync(c, big, 5_000);
        // Küçük: 3.600'lük fatura.
        await InvoiceAsync(c, small.Customer.Id, (await DeliveredTripAsync(c, small, 3_000)).Id);

        var rows = await (await c.GetAsync("/api/cari/customers")).ReadAsync<List<CustomerCariRow>>();
        var row = rows.Single(r => r.Id == big.Customer.Id);
        row.Invoiced.Should().Be(12_000);
        row.Balance.Should().Be(12_000); // iptal fatura ve faturasız seferler bakiyeye girmez
        row.CancelledInvoiceCount.Should().Be(1);
        row.CancelledInvoices.Should().Be(9_600);
        row.UninvoicedTripCount.Should().Be(2);
        row.UninvoicedTrips.Should().Be(13_000);

        // Türkçe harfler sadeleşerek aranır; sıralama: bakiye artan.
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/cari/customers/export?search=caglar cari {u}&filter=all&sort=balance&desc=false")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(1, 1).GetString().Should().Be("Müşteriler Cari");
            var (headers, data) = Table(ws, "Müşteri");
            headers.Should().ContainInOrder("Müşteri", "VKN", "Devir", "Kesilen Fatura", "İptal Fatura", "Faturasız Sevkiyatlar", "Faturasız Sefer",
                "Alınan Ödeme", "Bakiye", "Vadesi Geçen");
            data.Select(r => r.Cell(1).GetString()).Should().Equal(small.Customer.Title, big.Customer.Title, "Toplam (2 kayıt)");
            var col = (string h) => headers.IndexOf(h) + 1;
            data[1].Cell(col("İptal Fatura")).GetValue<decimal>().Should().Be(9_600);
            data[1].Cell(col("Faturasız Sevkiyatlar")).GetValue<decimal>().Should().Be(13_000);
            data[1].Cell(col("Faturasız Sefer")).GetValue<int>().Should().Be(2);
            data[2].Cell(col("Bakiye")).GetValue<decimal>().Should().Be(15_600);
        }
        // Ünvana göre azalan; "bakiyesi olanlar" süzgeci (varsayılan) ve arama ekrandaki gibi.
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/cari/customers/export?search=ÇAĞLAR CARİ {u}&sort=title&desc=true")))
        {
            var (_, data) = Table(wb.Worksheet(1), "Müşteri");
            data.Select(r => r.Cell(1).GetString()).Should().Equal(small.Customer.Title, big.Customer.Title, "Toplam (2 kayıt)");
        }

        await ShouldBePdfAsync(await c.GetAsync($"/api/cari/customers/export?format=pdf&search={u}&filter=all"));
        var download = await c.GetAsync($"/api/cari/customers/export?format=pdf&search={u}&download=true");
        download.Content.Headers.ContentDisposition!.FileName.Should().Contain("musteriler-cari");
        // Sonuç yoksa da belge oluşur; yalnızca muhasebe yetkisi görür.
        await ShouldBePdfAsync(await c.GetAsync("/api/cari/customers/export?format=pdf&search=hiçbiri-yok-xyz"));
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Cari Operasyon", $"cari-ops-{u}@test.local", UserRole.Operations, true, "Sifre1234")))
            .ReadAsync<UserDto>();
        var ops = await factory.LoginAsync($"cari-ops-{u}@test.local", "Sifre1234");
        (await ops.GetAsync("/api/cari/customers/export")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Ayna modunda bakiye pratikortam'ın rakamıdır; panel hesapları (devir, ödeme) yazılmaz, verisi olan sütunlar kalır.
        (await (await c.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(true))).ReadAsync<MirrorStatusDto>()).MirrorMode.Should().BeTrue();
        try
        {
            using var wb = await WorkbookAsync(await c.GetAsync($"/api/cari/customers/export?search={u}&filter=all"));
            var (headers, _) = Table(wb.Worksheet(1), "Müşteri");
            headers.Should().Contain(["Kesilen Fatura", "İptal Fatura", "Faturasız Sevkiyatlar", "Bakiye (pratikortam)"]);
            headers.Should().NotContain(["Devir", "Alınan Ödeme", "Bakiye", "Vadesi Geçen"]);
            await ShouldBePdfAsync(await c.GetAsync($"/api/cari/customers/export?format=pdf&search={u}&filter=all"));
        }
        finally
        {
            await c.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(false));
        }
    }

    [Fact]
    public async Task Supplier_cari_splits_received_invoices_and_uninvoiced_trips()
    {
        var c = await factory.LoginAsync();
        var u = U();
        var s = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest($"Cari Taşeron {u}", SupplierKind.Carrier, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Cari Taşeron Müşteri {u}", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 TS {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Cari Taşeron Şoför {u}", null, null, null, null, null, null, true, s.Id)))
            .ReadAsync<DriverDto>();
        async Task<TripDto> Trip(decimal cost)
        {
            var t = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Ümraniye", "Gebze", Today, null, null,
                cost, cost + 5_000, Terms: new TripTerms(CostVatRate: 20)))).ReadAsync<TripDto>();
            return await (await c.PostJsonAsync($"/api/trips/{t.Id}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<TripDto>();
        }
        var t1 = await Trip(25_000);   // faturalanır: 29.000
        await Trip(7_500);             // faturasız: 9.000 (KDV dahil)
        await (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(s.Id, $"CRT{u}", Today, null,
            PurchaseInvoiceKind.EInvoice, 25_000, 5_000, 1_000, null, [t1.Id]))).ReadAsync<PurchaseInvoiceDto>();
        var wrong = await (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(s.Id, $"YNL{u}", Today, null,
            PurchaseInvoiceKind.EInvoice, 1_000, 200, 0, null, null))).ReadAsync<PurchaseInvoiceDto>();
        await c.PostJsonAsync($"/api/purchase-invoices/{wrong.Id}/cancel", new PurchaseInvoiceCancelRequest("Yanlış"));

        var row = (await (await c.GetAsync("/api/cari/suppliers")).ReadAsync<List<SupplierCariRow>>()).Single(r => r.Id == s.Id);
        row.ReceivedInvoices.Should().Be(29_000);
        row.ReceivedInvoiceCount.Should().Be(1);
        row.CancelledInvoiceCount.Should().Be(1);
        row.CancelledInvoices.Should().Be(1_200);
        row.UninvoicedTripCount.Should().Be(1);
        row.UninvoicedTrips.Should().Be(9_000);
        row.TripCost.Should().Be(38_000);
        row.Balance.Should().Be(row.Opening + row.ReceivedInvoices + row.UninvoicedTrips + row.CreditExpenses - row.Paid).And.Be(38_000);

        using var wb = await WorkbookAsync(await c.GetAsync($"/api/cari/suppliers/export?search=cari taseron {u}&filter=all"));
        var (headers, data) = Table(wb.Worksheet(1), "Tedarikçi");
        headers.Should().ContainInOrder("Tedarikçi", "VKN", "Devir", "Alınan Fatura", "İptal Fatura", "Faturasız Sevkiyatlar", "Faturasız Sefer",
            "Vadeli Gider", "Verilen Ödeme", "Bakiye");
        data.Should().HaveCount(2);
        data[0].Cell(headers.IndexOf("Alınan Fatura") + 1).GetValue<decimal>().Should().Be(29_000);
        data[0].Cell(headers.IndexOf("Bakiye") + 1).GetValue<decimal>().Should().Be(38_000);
        await ShouldBePdfAsync(await c.GetAsync($"/api/cari/suppliers/export?format=pdf&search={u}&sort=received&desc=true"));
    }

    [Fact]
    public async Task Statement_can_list_uninvoiced_trips_without_changing_the_balance()
    {
        var c = await factory.LoginAsync();
        var f = await FleetAsync(c, $"Ekstre Sefer {U()}");
        await InvoiceAsync(c, f.Customer.Id, (await DeliveredTripAsync(c, f, 10_000)).Id);
        await DeliveredTripAsync(c, f, 15_000, date: Today.AddDays(-2));  // 18.000 KDV dahil, 2/10 tevkifat → 17.400
        await DeliveredTripAsync(c, f, 4_000, date: Today.AddDays(-40));  // dönem dışında
        var url = $"/api/customers/{f.Customer.Id}/statement";

        using (var wb = await WorkbookAsync(await c.GetAsync($"{url}?format=xlsx&from={Today.AddDays(-10):yyyy-MM-dd}&uninvoiced=true")))
        {
            wb.Worksheets.Should().HaveCount(2);
            var ekstre = wb.Worksheet(1);
            ekstre.Cell(ekstre.LastRowUsed()!.RowNumber(), 7).GetValue<decimal>().Should().Be(12_000); // bakiye yalnız faturadan
            var trips = wb.Worksheet("Faturasız Seferler");
            trips.Cell(1, 1).GetString().Should().Be(StatementPdfGenerator.UninvoicedTitle);
            var (headers, data) = Table(trips, "Tarih");
            headers.Should().ContainInOrder("Tarih", "Sevkiyat No", "Güzergâh", "Plaka", "Evrak No", "Matrah", "KDV", "Tevkifat", "Toplam");
            data.Should().HaveCount(2);
            data[0].Cell(6).GetValue<decimal>().Should().Be(15_000);
            data[1].Cell(3).GetString().Should().Be("Toplam (1 sefer)");
            data[1].Cell(9).GetValue<decimal>().Should().Be(17_400);
        }
        using (var wb = await WorkbookAsync(await c.GetAsync($"{url}?format=xlsx&uninvoiced=true")))
            Table(wb.Worksheet("Faturasız Seferler"), "Tarih").Rows.Should().HaveCount(3); // iki sefer + toplam
        using (var wb = await WorkbookAsync(await c.GetAsync($"{url}?format=xlsx")))
            wb.Worksheets.Should().ContainSingle();

        await ShouldBePdfAsync(await c.GetAsync($"{url}?uninvoiced=true"));
        await ShouldBePdfAsync(await c.GetAsync($"{url}?uninvoiced=true&from={Today.AddDays(1):yyyy-MM-dd}")); // dönemde sefer yok
        var sent = await (await c.PostJsonAsync($"{url}/email", new StatementEmailRequest(null, null, null, null, Uninvoiced: true)))
            .ReadAsync<Dictionary<string, string>>();
        sent["sentTo"].Should().Be("muhasebe@cari.test");
    }

    [Fact]
    public async Task Invoices_can_be_found_by_trip_number_and_summarised_as_pdf()
    {
        var c = await factory.LoginAsync();
        var u = U();
        var f = await FleetAsync(c, $"İcmal Fatura {u}");
        var old = await DeliveredTripAsync(c, f, 10_000, externalRef: $"S7{u}");
        var plain = await DeliveredTripAsync(c, f, 5_000);
        var i1 = await InvoiceAsync(c, f.Customer.Id, old.Id);
        var i2 = await InvoiceAsync(c, f.Customer.Id, plain.Id);

        async Task<List<int>> Find(string tripNo) =>
            (await (await c.GetAsync($"/api/invoices?pageSize=100&tripNo={tripNo}")).ReadAsync<PagedResult<InvoiceDto>>()).Items.Select(i => i.Id).ToList();
        (await Find($"7{u}")).Should().Equal(i1.Id);   // pratikortam numarası S öneksiz
        (await Find($"s7{u}")).Should().Equal(i1.Id);
        (await Find(plain.Id.ToString())).Should().Equal(i2.Id);
        (await Find($"9{u}")).Should().BeEmpty();
        // İptal edilen faturada da sefer numarasıyla bulunur (satırlardan).
        await c.PostAsync($"/api/invoices/{i2.Id}/cancel", null);
        (await Find(plain.Id.ToString())).Should().Equal(i2.Id);

        var totals = await (await c.GetAsync($"/api/invoices/totals?tripNo=7{u}")).ReadAsync<InvoiceTotalsDto>();
        totals.Count.Should().Be(1);
        totals.Total.Should().Be(i1.Total).And.Be(12_000);
        totals.Remaining.Should().Be(12_000);

        await ShouldBePdfAsync(await c.GetAsync($"/api/invoices/summary-pdf?customerId={f.Customer.Id}"));
        await ShouldBePdfAsync(await c.GetAsync($"/api/invoices/summary-pdf?ids={i1.Id},{i2.Id}&status=Cancelled"));
        await ShouldBePdfAsync(await c.GetAsync("/api/invoices/summary-pdf?from=2001-01-01&to=2001-01-31")); // boş süzgeç
        await ShouldBePdfAsync(await c.GetAsync("/api/invoices/summary-pdf")); // birden çok müşteri: müşteri sütunuyla
        var download = await c.GetAsync($"/api/invoices/summary-pdf?customerId={f.Customer.Id}&download=true");
        download.Content.Headers.ContentDisposition!.FileName.Should().StartWith("fatura-icmali-");
    }

    [Theory]
    [InlineData("  Çağlar  ŞAHİN ", "caglar sahin")]
    [InlineData("IŞIK Gıda", "isik gida")]
    [InlineData("Öztürk Ünlü", "ozturk unlu")]
    public void Search_key_folds_turkish_letters_like_the_screen(string input, string expected) =>
        CariService.SearchKey(input).Should().Be(expected);
}
