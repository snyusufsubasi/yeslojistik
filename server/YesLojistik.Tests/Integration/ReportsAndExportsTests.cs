using System.Net;
using ClosedXML.Excel;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>A4: sevkiyat listesi PDF/İcmal, kazanç raporu (tek kâr formülü), ekstre Excel'i, liste Excel'leri ve filtre toplamları.</summary>
public class ReportsAndExportsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private static string D(DateOnly d) => d.ToString("yyyy-MM-dd");

    private record Fleet(CustomerDto Customer, VehicleDto Vehicle, DriverDto Driver);

    private static async Task<Fleet> FleetAsync(HttpClient c, string name)
    {
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"{name} Müşteri", null, null, null, null, "Gebze OSB", null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"{name} Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 RA {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        return new Fleet(customer, vehicle, driver);
    }

    private static async Task<TripDto> TripAsync(HttpClient c, Fleet f, DateOnly date, decimal sale, decimal cost, TripTerms? terms = null) =>
        await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(f.Customer.Id, f.Vehicle.Id, f.Driver.Id, "Tuzla", "Çorlu", date, null, null,
            cost, sale, LoadingCity: "İstanbul", DeliveryCity: "Tekirdağ", CargoType: "Palet", Terms: terms))).ReadAsync<TripDto>();

    private static async Task<XLWorkbook> WorkbookAsync(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        res.Content.Headers.ContentType!.MediaType.Should().Contain("spreadsheet");
        return new XLWorkbook(new MemoryStream(await res.Content.ReadAsByteArrayAsync()));
    }

    [Fact]
    public async Task Profit_is_computed_with_one_formula_everywhere()
    {
        var c = await factory.LoginAsync();
        var f = await FleetAsync(c, "Kazanç");
        var lastMonth = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-1);
        // KDV hariç: 10.000 − 6.000 + 500 komisyon (600 KDV dahil) − 200 prim − 300 faturalanmayan masraf (360 KDV dahil)
        // − 250 sefer gideri (300 otoyol, %20 KDV dahil) = 3.750
        var t1 = await TripAsync(c, f, lastMonth, 10_000, 6_000, new TripTerms(Commission: 600, DriverBonus: 200, ExtraCharge: 360));
        // 8.000 − 5.000; masraf müşteriye faturalanıyor, kâra yük olmaz = 3.000
        var t2 = await TripAsync(c, f, Today, 8_000, 5_000, new TripTerms(ExtraCharge: 400, ExtraChargeInvoiced: true));
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Toll, 300, lastMonth, f.Vehicle.Id, t1.Id, "Otoyol")))
            .ReadAsync<ExpenseDto>();
        t1 = await (await c.GetAsync($"/api/trips/{t1.Id}")).ReadAsync<TripDto>();
        t1.Profit.Should().Be(3_750);
        t2.Profit.Should().Be(3_000);

        var range = $"from={D(lastMonth)}&to={D(Today)}";
        var totals = await (await c.GetAsync($"/api/trips/totals?customerId={f.Customer.Id}&{range}")).ReadAsync<TripTotalsDto>();
        totals.Profit.Should().Be(6_750);

        // Kazanç raporu dört kırılımda da aynı toplamı verir.
        foreach (var groupBy in new[] { "month", "customer", "vehicle", "driver" })
        {
            var rows = await (await c.GetAsync($"/api/reports/profit?groupBy={groupBy}&customerId={f.Customer.Id}&{range}")).ReadAsync<List<ProfitReportRow>>();
            rows.Sum(r => r.Profit).Should().Be(6_750, groupBy);
        }
        var byCustomer = (await (await c.GetAsync($"/api/reports/profit?groupBy=customer&{range}")).ReadAsync<List<ProfitReportRow>>())
            .Single(r => r.Key == f.Customer.Id.ToString());
        byCustomer.Should().BeEquivalentTo(new ProfitReportRow(f.Customer.Id.ToString(), f.Customer.Title, 2, 18_000, 500, 11_000, 200, 300, 250, 6_750, 36.5m));
        var byVehicle = await (await c.GetAsync($"/api/reports/profit?groupBy=vehicle&vehicleId={f.Vehicle.Id}&{range}")).ReadAsync<List<ProfitReportRow>>();
        byVehicle.Should().ContainSingle().Which.Label.Should().Be(f.Vehicle.Plate);
        var byMonth = await (await c.GetAsync($"/api/reports/profit?groupBy=month&customerId={f.Customer.Id}&{range}")).ReadAsync<List<ProfitReportRow>>();
        byMonth.Select(r => r.Profit).Should().Equal(3_750, 3_000);
        byMonth[0].Key.Should().Be($"{lastMonth.Year:D4}-{lastMonth.Month:D2}");

        // Eski raporlar da aynı formülü kullanır.
        var tripRows = await (await c.GetAsync($"/api/reports/trips?{range}")).ReadAsync<List<TripProfitRow>>();
        tripRows.Where(r => r.TripId == t1.Id || r.TripId == t2.Id).Sum(r => r.Profit).Should().Be(6_750);
        var customers = await (await c.GetAsync($"/api/reports/customers?{range}")).ReadAsync<List<CustomerProfitRow>>();
        customers.Single(r => r.CustomerId == f.Customer.Id).Profit.Should().Be(6_750);
        var drivers = await (await c.GetAsync($"/api/reports/drivers?{range}")).ReadAsync<List<DriverReportRow>>();
        drivers.Single(r => r.DriverId == f.Driver.Id).Profit.Should().Be(6_750);

        using var wb = await WorkbookAsync(await c.GetAsync($"/api/reports/profit?groupBy=customer&customerId={f.Customer.Id}&format=xlsx&{range}"));
        var ws = wb.Worksheet(1);
        var last = ws.LastRowUsed()!.RowNumber();
        ws.Cell(last, 1).GetString().Should().Be("Toplam");
        ws.Cell(last, 9).GetValue<decimal>().Should().Be(6_750);

        (await c.GetAsync("/api/reports/profit?groupBy=plate")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Trip_list_pdf_and_summary_follow_the_filter()
    {
        var c = await factory.LoginAsync();
        var f = await FleetAsync(c, "İcmal");
        // 15.000 + %20 KDV = 18.000 → 12.000 sınırını aştığı için 2/10 tevkifat (600) otomatik.
        await TripAsync(c, f, Today, 15_000, 9_000);
        // 5.000 + 1.200 KDV dahil faturalanan ek masraf (1.000 + 200) → matrah 6.000, KDV 1.200, tevkifatsız.
        await TripAsync(c, f, Today, 5_000, 3_000, new TripTerms(ExtraCharge: 1_200, ExtraChargeInvoiced: true));
        var cancelled = await TripAsync(c, f, Today, 99_000, 1_000);
        await c.PostJsonAsync($"/api/trips/{cancelled.Id}/status", new TripStatusRequest(TripStatus.Cancelled));

        var rows = await (await c.GetAsync($"/api/trips/summary?customerId={f.Customer.Id}")).ReadAsync<List<TripSummaryRow>>();
        rows.Should().ContainSingle();
        rows[0].Should().BeEquivalentTo(new TripSummaryRow(f.Customer.Id, f.Customer.Title, Today.Year, Today.Month, 2, 21_000, 4_200, 600, 24_600));

        var pdf = await c.GetAsync($"/api/trips/pdf?customerId={f.Customer.Id}&from={D(Today)}&to={D(Today)}");
        pdf.StatusCode.Should().Be(HttpStatusCode.OK);
        pdf.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        (await pdf.Content.ReadAsByteArrayAsync())[..4].Should().Equal("%PDF"u8.ToArray());
        var download = await c.GetAsync($"/api/trips/pdf?customerId={f.Customer.Id}&download=true");
        download.Content.Headers.ContentDisposition!.FileName.Should().Contain("sevkiyat-listesi");

        var summaryPdf = await c.GetAsync($"/api/trips/summary?customerId={f.Customer.Id}&format=pdf");
        summaryPdf.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        // Müşteri seçilmeden de (tüm müşteriler) çalışır.
        (await c.GetAsync("/api/trips/summary?format=pdf")).StatusCode.Should().Be(HttpStatusCode.OK);

        using var wb = await WorkbookAsync(await c.GetAsync($"/api/trips/summary?customerId={f.Customer.Id}&format=xlsx"));
        var ws = wb.Worksheet(1);
        ws.Cell(3, 1).GetString().Should().Be("Toplam");
        ws.Cell(3, 7).GetValue<decimal>().Should().Be(24_600);

        // Operasyon kullanıcısı sevkiyat listesini alabilir, kazanç raporunu göremez.
        var admin = c;
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("İcmal Operasyon", "icmal-ops@test.local", UserRole.Operations, true, "Sifre1234")))
            .ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("icmal-ops@test.local", "Sifre1234");
        (await ops.GetAsync($"/api/trips/pdf?customerId={f.Customer.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await ops.GetAsync("/api/reports/profit")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Statements_download_as_excel_with_the_same_totals()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Ekstre Excel Müşteri", null, null, null, null, null, null,
            OpeningBalance: 5_000, OpeningBalanceDate: Today.AddDays(-40)))).ReadAsync<CustomerSummaryDto>()).Customer;
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customer.Id, null, Today.AddDays(-5), 1_500, PaymentMethod.BankTransfer, "EFT")))
            .ReadAsync<PaymentDto>();

        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/customers/{customer.Id}/statement?format=xlsx&from={D(Today.AddDays(-10))}")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(1, 1).GetString().Should().Be("Hesap Ekstresi");
            var cells = ws.CellsUsed().Select(x => x.GetString()).ToList();
            cells.Should().Contain("Devreden bakiye");
            var last = ws.LastRowUsed()!.RowNumber();
            ws.Cell(last, 4).GetString().Should().Be("Bakiye (borcunuz)");
            ws.Cell(last, 7).GetValue<decimal>().Should().Be(3_500);
            ws.Cell(last - 1, 6).GetValue<decimal>().Should().Be(1_500);
        }

        var supplier = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Ekstre Excel Taşeron", SupplierKind.Carrier, null, null, null,
            null, null, null, null, null, null, 30, null, OpeningBalance: 2_000, OpeningBalanceDate: Today.AddDays(-3)))).ReadAsync<SupplierDto>();
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/suppliers/{supplier.Id}/statement?format=xlsx")))
        {
            var ws = wb.Worksheet(1);
            var last = ws.LastRowUsed()!.RowNumber();
            ws.Cell(last, 4).GetString().Should().Be("Bakiye (alacağınız)");
            ws.Cell(last, 7).GetValue<decimal>().Should().Be(2_000);
        }
        (await c.GetAsync($"/api/customers/{customer.Id}/statement?format=xlsx&from={D(Today)}&to={D(Today.AddDays(-1))}"))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Master_lists_export_to_excel_with_filters()
    {
        var c = await factory.LoginAsync();
        var f = await FleetAsync(c, "Dışa Aktar");
        await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Dışa Aktar Servis", SupplierKind.Service, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();

        using (var wb = await WorkbookAsync(await c.GetAsync("/api/customers/export?search=Dışa Aktar")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(1, 2).GetString().Should().Be("Ünvan");
            ws.Cell(2, 2).GetString().Should().Be(f.Customer.Title);
            ws.Cell(3, 2).GetString().Should().Be("Toplam");
        }
        using (var wb = await WorkbookAsync(await c.GetAsync("/api/suppliers/export?kind=Service&search=Dışa")))
            wb.Worksheet(1).Cell(2, 3).GetString().Should().Be("Servis / Tamir");
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/drivers/export?search={Uri.EscapeDataString(f.Driver.FullName)}")))
            wb.Worksheet(1).Cell(2, 1).GetString().Should().Be(f.Driver.FullName);
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/vehicles/export?search={Uri.EscapeDataString(f.Vehicle.Plate)}")))
        {
            wb.Worksheet(1).Cell(2, 1).GetString().Should().Be(f.Vehicle.Plate);
            wb.Worksheet(1).Cell(2, 10).GetString().Should().Be("Müsait");
        }
    }

    [Fact]
    public async Task List_totals_cover_the_whole_filter_not_just_the_page()
    {
        var c = await factory.LoginAsync();
        var f = await FleetAsync(c, "Toplam");
        var trips = new List<TripDto>();
        foreach (var sale in new[] { 1_000m, 2_000m, 3_000m }) trips.Add(await TripAsync(c, f, Today, sale, 500));
        foreach (var t in trips)
            await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(f.Customer.Id, Today, null, 20, 0, null, false, [t.Id], null))).ReadAsync<InvoiceDto>();
        var draft = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(f.Customer.Id, Today, null, 20, 0, null, true, [],
            [new InvoiceLineInput(null, "Taslak", 9_999)]))).ReadAsync<InvoiceDto>();
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(f.Customer.Id, null, Today, 1_200, PaymentMethod.BankTransfer, null))).ReadAsync<PaymentDto>();
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(f.Customer.Id, null, Today, 300, PaymentMethod.BankTransfer, null))).ReadAsync<PaymentDto>();
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(f.Customer.Id, null, Today, 100, PaymentMethod.BankTransfer, "İade", IsRefund: true)))
            .ReadAsync<PaymentDto>();

        // Sayfa 1 kayıtlık olsa da toplam filtrenin tamamıdır; taslak tutara girmez.
        var inv = await (await c.GetAsync($"/api/invoices/totals?customerId={f.Customer.Id}&pageSize=1")).ReadAsync<InvoiceTotalsDto>();
        inv.Should().BeEquivalentTo(new InvoiceTotalsDto(4, 6_000, 1_200, 0, 7_200, 7_200 - 1_400));
        var drafts = await (await c.GetAsync($"/api/invoices/totals?customerId={f.Customer.Id}&status=Draft")).ReadAsync<InvoiceTotalsDto>();
        drafts.Total.Should().Be(draft.Total);

        var pay = await (await c.GetAsync($"/api/payments/totals?customerId={f.Customer.Id}&pageSize=1")).ReadAsync<PaymentTotalsDto>();
        pay.Should().BeEquivalentTo(new PaymentTotalsDto(3, 1_400, 100));

        var supplier = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Toplam Tedarikçi", SupplierKind.Fuel, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        foreach (var a in new[] { 700m, 800m })
            await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(supplier.Id, Today, a, PaymentMethod.Cash, null, null)))
                .ReadAsync<SupplierPaymentDto>();
        var sp = await (await c.GetAsync($"/api/supplier-payments/totals?supplierId={supplier.Id}&pageSize=1")).ReadAsync<PaymentTotalsDto>();
        sp.Should().BeEquivalentTo(new PaymentTotalsDto(2, 1_500, 0));

        foreach (var (no, sub) in new[] { ("TOP2026000000001", 1_000m), ("TOP2026000000002", 2_000m) })
            (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(supplier.Id, no, Today, null, PurchaseInvoiceKind.EInvoice,
                sub, sub / 5, 0, null, null))).EnsureSuccessStatusCode();
        var pi = await (await c.GetAsync($"/api/purchase-invoices/totals?supplierId={supplier.Id}&pageSize=1")).ReadAsync<PurchaseInvoiceTotalsDto>();
        pi.Should().BeEquivalentTo(new PurchaseInvoiceTotalsDto(2, 3_000, 600, 0, 3_600));

        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 1_000, Today, f.Vehicle.Id, null, "Mazot"))).ReadAsync<ExpenseDto>();
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Toll, 250, Today, f.Vehicle.Id, null, "Köprü"))).ReadAsync<ExpenseDto>();
        var exp = await (await c.GetAsync($"/api/expenses/totals?vehicleId={f.Vehicle.Id}&pageSize=1")).ReadAsync<ExpenseTotalsDto>();
        exp.Should().BeEquivalentTo(new ExpenseTotalsDto(2, 1_250, 1_250, 0));

        // Excel'in altındaki toplam satırı ekrandaki toplamla aynı.
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/invoices/export?customerId={f.Customer.Id}")))
        {
            var ws = wb.Worksheet(1);
            var last = ws.LastRowUsed()!.RowNumber();
            ws.Cell(last, 1).GetString().Should().Be("Toplam");
            ws.Cell(last, 8).GetValue<decimal>().Should().Be(7_200);
        }
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/expenses/export?vehicleId={f.Vehicle.Id}")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(ws.LastRowUsed()!.RowNumber(), 12).GetValue<decimal>().Should().Be(1_250);
        }
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/payments/export?customerId={f.Customer.Id}")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(ws.LastRowUsed()!.RowNumber(), 10).GetValue<decimal>().Should().Be(1_400);
        }
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/purchase-invoices/export?supplierId={supplier.Id}")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(ws.LastRowUsed()!.RowNumber(), 8).GetValue<decimal>().Should().Be(3_600);
        }
        using (var wb = await WorkbookAsync(await c.GetAsync($"/api/supplier-payments/export?supplierId={supplier.Id}")))
        {
            var ws = wb.Worksheet(1);
            ws.Cell(ws.LastRowUsed()!.RowNumber(), 5).GetValue<decimal>().Should().Be(1_500);
        }
    }
}
