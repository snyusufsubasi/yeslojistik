using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;
using static YesLojistik.Tests.Integration.ImportTests;

namespace YesLojistik.Tests.Integration;

/// <summary>Eski panelden geçiş: fatura, tahsilat, taşeron ödemesi, gider ve iş talebi aktarımı.</summary>
public class LegacyImportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static async Task<ImportResult> Import(HttpClient c, string entity, byte[] file, bool dryRun = false) =>
        await (await c.PostAsync($"/api/import/{entity}?dryRun={dryRun}", Form(file))).ReadAsync<ImportResult>();

    [Fact]
    public async Task Invoices_and_payments_rebuild_the_customer_balance()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var customer = $"Eski Cari {u}";
        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [customer]))).Created.Should().Be(1);

        var invoices = Workbook(ImportService.Columns["invoices"],
            [$"E{u}01", new DateTime(2026, 8, 1), null, customer, 10000m, 20m, "2/10", 11600m, "Ağustos taşımaları", "Kesildi"],
            [$"E{u}02", new DateTime(2026, 8, 15), null, customer, 5000m, null, null, null, null, null],
            [$"E{u}03", new DateTime(2026, 8, 20), null, customer, 999m, 20m, null, null, null, "İptal"]);
        var dry = await Import(c, "invoices", invoices, dryRun: true);
        dry.Errors.Should().BeEmpty();
        (await Import(c, "invoices", invoices)).Created.Should().Be(3);
        // Aynı dosya ikinci kez aktarılırsa çift kayıt olmaz.
        (await Import(c, "invoices", invoices)).Skipped.Should().Be(3);

        var payments = Workbook(ImportService.Columns["payments"],
            [new DateTime(2026, 9, 1), customer, 11600m, "Havale", $"E{u}01", null, null, null, "Ağustos"],
            [new DateTime(2026, 9, 5), customer, 2000m, "Çek", null, "123456", "Ziraat", new DateTime(2020, 1, 1), null]);
        (await Import(c, "payments", payments)).Created.Should().Be(2);

        var list = await (await c.GetAsync($"/api/customers?search={Uri.EscapeDataString(customer)}")).ReadAsync<PagedResult<CustomerDto>>();
        // 11.600 + 6.000 (iptal fatura sayılmaz) − 11.600 − 2.000
        list.Items.Single().Balance.Should().Be(4000);
        var inv = await (await c.GetAsync($"/api/invoices?search=E{u}01")).ReadAsync<PagedResult<InvoiceDto>>();
        inv.Items.Single().Remaining.Should().Be(0);
    }

    [Fact]
    public async Task Wrong_total_or_unknown_customer_writes_nothing()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [$"Tutar Cari {u}"]))).Created.Should().Be(1);
        var file = Workbook(ImportService.Columns["invoices"],
            [$"T{u}01", new DateTime(2026, 8, 1), null, $"Tutar Cari {u}", 1000m, 20m, null, 1200m, null, null],
            [$"T{u}02", new DateTime(2026, 8, 1), null, $"Tutar Cari {u}", 1000m, 20m, null, 1250m, null, null],
            [$"T{u}03", new DateTime(2026, 8, 1), null, "Olmayan Firma", 1000m, 20m, null, null, null, null]);
        var r = await Import(c, "invoices", file);
        r.Errors.Should().HaveCount(2);
        r.Errors.Should().Contain(e => e.Row == 3 && e.Message.Contains("Toplam tutmuyor"));
        r.Errors.Should().Contain(e => e.Row == 4 && e.Message.Contains("Müşteri bulunamadı"));
        r.Created.Should().Be(0);
        (await (await c.GetAsync($"/api/invoices?search=T{u}")).ReadAsync<PagedResult<InvoiceDto>>()).Total.Should().Be(0);
    }

    [Fact]
    public async Task Supplier_payments_expenses_and_job_requests_are_imported()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var supplier = $"Eski Taşeron {u}";
        (await Import(c, "suppliers", Workbook(ImportService.Columns["suppliers"],
            [supplier, "Taşeron", null, null, null, null, null, null, null, null, null, 30, 10000m, new DateTime(2026, 1, 1)]))).Created.Should().Be(1);

        var plate = $"06 LG {Random.Shared.Next(100, 9999)}";
        (await Import(c, "vehicles", Workbook(ImportService.Columns["vehicles"], [plate, "Kamyon"]))).Errors.Should().BeEmpty();
        (await Import(c, "drivers", Workbook(ImportService.Columns["drivers"], [$"Eski Şoför {u}"]))).Created.Should().Be(1);

        (await Import(c, "supplier-payments", Workbook(ImportService.Columns["supplier-payments"],
            [new DateTime(2026, 9, 1), supplier, 3000m, "Nakit", "Kısmi"]))).Created.Should().Be(1);
        var expenses = await Import(c, "expenses", Workbook(ImportService.Columns["expenses"],
            [new DateTime(2026, 9, 2), "Bakım", 1500m, plate, null, supplier, "Evet", null, 421000, $"Fren {u}"],
            [new DateTime(2026, 9, 3), "Yakıt", 2500m, plate, $"Eski Şoför {u}", null, "Hayır", 60m, null, $"Mazot {u}"],
            [new DateTime(2026, 9, 3), "Uçak bileti", 100m, null, null, null, null, null, null, null]));
        expenses.Errors.Should().ContainSingle(e => e.Row == 4 && e.Message.Contains("Kategori"));

        var fixedExpenses = await Import(c, "expenses", Workbook(ImportService.Columns["expenses"],
            [new DateTime(2026, 9, 2), "Bakım", 1500m, plate, null, supplier, "Evet", null, 421000, $"Fren {u}"],
            [new DateTime(2026, 9, 3), "Yakıt", 2500m, plate, $"Eski Şoför {u}", null, "Hayır", 60m, null, $"Mazot {u}"]));
        fixedExpenses.Errors.Should().BeEmpty();
        fixedExpenses.Created.Should().Be(2);

        var list = await (await c.GetAsync($"/api/suppliers?search={Uri.EscapeDataString(supplier)}")).ReadAsync<PagedResult<SupplierDto>>();
        // Devir 10.000 + vadeli bakım 1.500 − ödeme 3.000
        list.Items.Single().Balance.Should().Be(8500);

        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [$"Talep Cari {u}"]))).Created.Should().Be(1);
        var requests = await Import(c, "job-requests", Workbook(ImportService.Columns["job-requests"],
            [new DateTime(2026, 9, 10), $"Talep Cari {u}", $"Depo {u}", "Sincan", "2 gün", "Mobilya", 2.5m, "Tır", 25000m, 18000m, 500m, 750m, null, "Evet",
                "YE-1", "IRS-1", "Not", null, "Bekliyor"]));
        requests.Errors.Should().BeEmpty();
        requests.Created.Should().Be(1);
        var jr = await (await c.GetAsync($"/api/job-requests?search=Depo%20{u}")).ReadAsync<PagedResult<JobRequestDto>>();
        var item = jr.Items.Single();
        item.CargoQuantity.Should().Be(2.5m);
        item.DriverBonus.Should().Be(750);
        item.CustomerPays.Should().BeTrue();
        item.WaybillNo.Should().Be("IRS-1");
    }

    [Fact]
    public async Task Import_rejects_bad_withholding_cancelled_invoice_undated_instrument_and_driverless_advance()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var customer = $"Kural Cari {u}";
        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [customer]))).Created.Should().Be(1);

        // 1) Tevkifat "2/5" reddedilir (payda 10 değil); Toplam boş, yine de satır hata verir ve hiçbir fatura yazılmaz.
        var badVat = await Import(c, "invoices", Workbook(ImportService.Columns["invoices"],
            [$"K{u}01", new DateTime(2026, 8, 1), null, customer, 1000m, 20m, "2/5", null, null, null]));
        badVat.Errors.Should().ContainSingle(e => e.Message.Contains("Tevkifat"));
        badVat.Created.Should().Be(0);

        // Biri kesilmiş, biri iptal iki fatura.
        (await Import(c, "invoices", Workbook(ImportService.Columns["invoices"],
            [$"K{u}A", new DateTime(2026, 8, 1), null, customer, 1000m, 20m, null, null, null, "Kesildi"],
            [$"K{u}I", new DateTime(2026, 8, 1), null, customer, 1000m, 20m, null, null, null, "İptal"]))).Created.Should().Be(2);

        // 2) İptal faturaya tahsilat bağlanamaz.
        var toCancelled = await Import(c, "payments", Workbook(ImportService.Columns["payments"],
            [new DateTime(2026, 9, 1), customer, 500m, "Havale", $"K{u}I", null, null, null, "İptale ödeme"]));
        toCancelled.Errors.Should().ContainSingle(e => e.Message.Contains("kesilmiş durumda değil"));
        toCancelled.Created.Should().Be(0);

        // 3) Vadesiz çek reddedilir.
        var undated = await Import(c, "payments", Workbook(ImportService.Columns["payments"],
            [new DateTime(2026, 9, 2), customer, 500m, "Çek", null, "123", "Ziraat", null, "Vadesiz çek"]));
        undated.Errors.Should().ContainSingle(e => e.Message.Contains("Çek Vadesi"));
        undated.Created.Should().Be(0);

        // 4) Şoförsüz avans reddedilir.
        var advance = await Import(c, "expenses", Workbook(ImportService.Columns["expenses"],
            [new DateTime(2026, 9, 3), "Avans", 500m, null, null, null, null, null, null, "Şoförsüz avans"]));
        advance.Errors.Should().ContainSingle(e => e.Message.Contains("Şoför"));
        advance.Created.Should().Be(0);

        // Doğru yazılmış çek/senet ve şoförlü avans ise kabul edilir.
        (await Import(c, "drivers", Workbook(ImportService.Columns["drivers"], [$"Kural Şoför {u}"]))).Created.Should().Be(1);
        (await Import(c, "payments", Workbook(ImportService.Columns["payments"],
            [new DateTime(2026, 9, 4), customer, 500m, "Çek", null, "456", "Ziraat", new DateTime(2027, 1, 1), "Vadeli çek"]))).Created.Should().Be(1);
        (await Import(c, "expenses", Workbook(ImportService.Columns["expenses"],
            [new DateTime(2026, 9, 5), "Avans", 500m, null, $"Kural Şoför {u}", null, null, null, null, "Şoförlü avans"]))).Created.Should().Be(1);
    }

    [Fact]
    public async Task Legacy_trips_are_history_only_no_payable_no_uninvoiced_not_invoiceable()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var supplier = $"Eski Nakliyeci {u}";
        var customer = $"Eski Müşteri {u}";
        var plate = $"07 EK {Random.Shared.Next(100, 9999)}";
        var driver = $"Eski Kayıt Şoför {u}";
        (await Import(c, "suppliers", Workbook(ImportService.Columns["suppliers"],
            [supplier, "Taşeron", null, null, null, null, null, null, null, null, null, 30, 5000m, new DateTime(2026, 9, 30)]))).Created.Should().Be(1);
        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [customer]))).Created.Should().Be(1);
        (await Import(c, "drivers", Workbook(ImportService.Columns["drivers"], [driver, null, null, null, null, null, null, supplier]))).Created.Should().Be(1);
        (await Import(c, "vehicles", Workbook(ImportService.Columns["vehicles"],
            [plate, "Tır", null, null, null, null, null, null, null, null, "Kiralık", supplier, null]))).Errors.Should().BeEmpty();

        var trips = await Import(c, "trips", Workbook(ImportService.Columns["trips"],
            [new DateTime(2026, 5, 1), customer, plate, driver, "İstanbul", $"Depo {u}", "Ankara", "Sincan", new DateTime(2026, 5, 2), "Mobilya", null,
                18000m, 25000m, "Teslim Edildi", "Sevkiyat 123", "Evet"]));
        trips.Errors.Should().BeEmpty();
        trips.Created.Should().Be(1);

        // Taşeron bakiyesi yalnız devir: eski seferin 18.000 maliyeti ikinci kez borç yazılmaz.
        var sup = await (await c.GetAsync($"/api/suppliers?search={Uri.EscapeDataString(supplier)}")).ReadAsync<PagedResult<SupplierDto>>();
        sup.Items.Single().Balance.Should().Be(5000);

        // Sefer listede görünür, eski kayıt olarak işaretlidir; "faturalanmamış" filtresine düşmez.
        var all = await (await c.GetAsync($"/api/trips?search={Uri.EscapeDataString(customer)}")).ReadAsync<PagedResult<TripDto>>();
        var trip = all.Items.Single();
        trip.IsLegacy.Should().BeTrue();
        (await (await c.GetAsync($"/api/trips?search={Uri.EscapeDataString(customer)}&invoiced=false")).ReadAsync<PagedResult<TripDto>>()).Total.Should().Be(0);

        // Eski sefer yeniden faturalanamaz.
        var inv = await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(trip.CustomerId, new DateOnly(2026, 9, 30), null, 20, 0, null, false, [trip.Id], null));
        inv.IsSuccessStatusCode.Should().BeFalse();
    }

    [Fact]
    public async Task Same_day_same_route_trips_with_different_descriptions_are_all_imported()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var plate = $"09 SD {Random.Shared.Next(100, 9999)}";
        (await Import(c, "customers", Workbook(ImportService.Columns["customers"], [$"Tekrar Cari {u}"]))).Created.Should().Be(1);
        (await Import(c, "drivers", Workbook(ImportService.Columns["drivers"], [$"Tekrar Şoför {u}"]))).Created.Should().Be(1);
        (await Import(c, "vehicles", Workbook(ImportService.Columns["vehicles"], [plate, "Tır"]))).Errors.Should().BeEmpty();
        object?[] Row(string note) => [new DateTime(2026, 9, 1), $"Tekrar Cari {u}", plate, $"Tekrar Şoför {u}", null, "Tuzla", null, "Sincan",
            null, null, null, 1000m, 2000m, "Teslim Edildi", note, "Evet"];
        var file = Workbook(ImportService.Columns["trips"], Row("Sevkiyat 1"), Row("Sevkiyat 2"), Row("Sevkiyat 3"));
        (await Import(c, "trips", file)).Created.Should().Be(3);
        // Aynı dosya tekrar yüklenince hiçbiri çiftlenmez.
        (await Import(c, "trips", file)).Skipped.Should().Be(3);
    }

    [Fact]
    public async Task Bank_accounts_import_with_signed_opening_balances_once()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var file = Workbook(ImportService.Columns["cash-accounts"],
            [$"Akbank {u}", "Banka", null, 5012704.83m, new DateTime(2026, 9, 30)],
            [$"Denizbank {u}", null, null, -1415455.48m, new DateTime(2026, 9, 30)],
            [$"Hatalı {u}", "Cüzdan", null, 0m, null]);
        var bad = await Import(c, "cash-accounts", file, dryRun: true);
        bad.Errors.Should().ContainSingle(e => e.Row == 4);

        file = Workbook(ImportService.Columns["cash-accounts"],
            [$"Akbank {u}", "Banka", null, 5012704.83m, new DateTime(2026, 9, 30)],
            [$"Denizbank {u}", null, null, -1415455.48m, new DateTime(2026, 9, 30)]);
        (await Import(c, "cash-accounts", file)).Created.Should().Be(2);
        (await Import(c, "cash-accounts", file)).Skipped.Should().Be(2);

        var accounts = await (await c.GetAsync("/api/cash-accounts")).ReadAsync<List<CashAccountDto>>();
        accounts.Single(a => a.Name == $"Denizbank {u}").Balance.Should().Be(-1415455.48m);
        accounts.Single(a => a.Name == $"Akbank {u}").Kind.Should().Be(YesLojistik.Core.Entities.CashAccountKind.Bank);
    }
}
