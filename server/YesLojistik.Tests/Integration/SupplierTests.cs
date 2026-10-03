using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

public class SupplierTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private static SupplierSaveRequest Supplier(string title, decimal opening = 0, string? iban = null) =>
        new(title, SupplierKind.Carrier, null, null, "0532 111 22 33", null, null, "istanbul", "Kartal", iban, "Hasan", 15, null, opening, opening > 0 ? Today : null);

    [Fact]
    public async Task Supplier_crud_validates_iban_and_city()
    {
        var c = await factory.LoginAsync();
        var bad = await c.PostJsonAsync("/api/suppliers", Supplier("Hatalı IBAN") with { Iban = "TR000000", City = "Atlantis" });
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await bad.Content.ReadAsStringAsync();
        body.Should().Contain("IBAN").And.Contain("il");

        var s = await (await c.PostJsonAsync("/api/suppliers", Supplier("Demir Test Nakliyat", 5000, "tr330006100519786457841326"))).ReadAsync<SupplierDto>();
        s.City.Should().Be("İstanbul");
        s.Iban.Should().Be("TR33 0006 1005 1978 6457 8413 26");
        s.SupplierNo.Should().StartWith("T");
        s.Balance.Should().Be(5000);

        var list = await (await c.GetAsync("/api/suppliers?search=Demir Test")).ReadAsync<PagedResult<SupplierDto>>();
        list.Items.Should().ContainSingle(x => x.Id == s.Id);

        (await c.DeleteAsync($"/api/suppliers/{s.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest); // devir borcu var
        await (await c.PutJsonAsync($"/api/suppliers/{s.Id}", Supplier("Demir Test Nakliyat"))).ReadAsync<SupplierDto>();
        (await c.DeleteAsync($"/api/suppliers/{s.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Rented_vehicle_trip_accrues_carrier_debt_and_records_timeline()
    {
        var c = await factory.LoginAsync();
        var s = await (await c.PostJsonAsync("/api/suppliers", Supplier("Kiralık Araç Sahibi"))).ReadAsync<SupplierDto>();

        var noOwner = await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 KRL 01", "Tır", null, null, null, 0, null, null, null, null,
            VehicleStatus.Available, null, VehicleOwnership.Rented));
        noOwner.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 KRL 01", "Tır", null, null, null, 0, null, null, null, null,
            VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id, "34drs01"))).ReadAsync<VehicleDto>();
        vehicle.SupplierTitle.Should().Be("Kiralık Araç Sahibi");
        vehicle.TrailerPlate.Should().Be("34 DRS 01");

        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Taşeron Şoförü", null, null, null, null, null, null, true, s.Id))).ReadAsync<DriverDto>();
        driver.SupplierTitle.Should().Be("Kiralık Araç Sahibi");
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Taşeron Müşterisi", null, null, null, null, null, null,
            City: "ankara", PaymentTermDays: 45))).ReadAsync<CustomerSummaryDto>()).Customer;
        customer.City.Should().Be("Ankara");

        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla OSB", "Sincan OSB", Today, null, null,
            20_000, 27_000, CustomerReference: "PO-4500123", CargoType: "Mobilya", CargoQuantity: 20, CargoUnit: "palet", CargoWeightKg: 8500,
            LoadingCity: "İstanbul", DeliveryCity: "Ankara", DeliveryContact: "Ali Bey 0532 000 00 00"))).ReadAsync<TripDto>();
        trip.CarrierSupplierId.Should().Be(s.Id);
        trip.TrailerPlate.Should().Be("34 DRS 01");
        trip.VehicleOwnership.Should().Be(VehicleOwnership.Rented);

        // Planlanmış sefer borç doğurmaz; yüklenince doğurur.
        (await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierDto>()).Balance.Should().Be(0);
        await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<TripDto>();
        // Yeni seferde taşeron KDV'si varsayılan %20: 20.000 + 4.000 KDV − 800 (2/10 tevkifat, 24.000 > 12.000).
        (await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierDto>()).Balance.Should().Be(23_200);

        var events = await (await c.GetAsync($"/api/trips/{trip.Id}/events")).ReadAsync<List<TripEventDto>>();
        events.Select(e => e.Status).Should().Equal(TripStatus.Planned, TripStatus.Loaded);
        events.Should().OnlyContain(e => e.Source == TripEventSource.Panel && e.UserName != null);

        // Taşeron seferler filtresi ve referans no ile arama
        (await (await c.GetAsync($"/api/trips?carrierSupplierId={s.Id}")).ReadAsync<PagedResult<TripDto>>()).Total.Should().Be(1);
        (await (await c.GetAsync("/api/trips?search=PO-4500123")).ReadAsync<PagedResult<TripDto>>()).Total.Should().Be(1);

        // Fatura vadesi müşterinin vadesiyle, satırda referans no
        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Id, Today, null, 20, 0, null, false, [trip.Id], null))).ReadAsync<InvoiceDto>();
        invoice.DueDate.Should().Be(Today.AddDays(45));
        invoice.Lines.Single().Description.Should().Contain("(Ref: PO-4500123)");

        // Tedarikçiye bağlı kayıt varken silinemez
        (await c.DeleteAsync($"/api/suppliers/{s.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Suppliers_and_trip_history_are_imported_without_duplicates()
    {
        var c = await factory.LoginAsync();
        var suppliers = ImportTests.Workbook(ImportService.Columns["suppliers"],
            ["Aktarım Nakliyat", "Taşeron", null, null, "05321112233", null, "TR330006100519786457841326", null, "Kocaeli", null, null, 20, 3000m, null]);
        var sres = await (await c.PostAsync("/api/import/suppliers?dryRun=false", ImportTests.Form(suppliers))).ReadAsync<ImportResult>();
        sres.Errors.Should().BeEmpty();
        sres.Created.Should().Be(1);

        var customers = ImportTests.Workbook(ImportService.Columns["customers"],
            ["Aktarım Müşterisi", null, null, null, null, null, null, null, null, "Bursa", "Nilüfer", "Veli", "Evet", "urn:mail:pk@aktarim.com", 60]);
        (await (await c.PostAsync("/api/import/customers?dryRun=false", ImportTests.Form(customers))).ReadAsync<ImportResult>()).Errors.Should().BeEmpty();
        var drivers = ImportTests.Workbook(ImportService.Columns["drivers"], ["Aktarım Şoförü", null, null, "CE", null, null, null, "Aktarım Nakliyat"]);
        (await (await c.PostAsync("/api/import/drivers?dryRun=false", ImportTests.Form(drivers))).ReadAsync<ImportResult>()).Errors.Should().BeEmpty();
        var vehicles = ImportTests.Workbook(ImportService.Columns["vehicles"],
            ["41 AKT 41", "Tır", null, null, null, 100000, null, null, null, null, "Kiralık", "Aktarım Nakliyat", "41 DRS 41"]);
        (await (await c.PostAsync("/api/import/vehicles?dryRun=false", ImportTests.Form(vehicles))).ReadAsync<ImportResult>()).Errors.Should().BeEmpty();

        var customer = (await (await c.GetAsync("/api/customers?search=Aktarım Müşterisi")).ReadAsync<PagedResult<CustomerDto>>()).Items.Single();
        customer.IsEInvoiceUser.Should().BeTrue();
        customer.PaymentTermDays.Should().Be(60);
        var vehicle = (await (await c.GetAsync("/api/vehicles?search=41 AKT")).ReadAsync<PagedResult<VehicleDto>>()).Items.Single();
        vehicle.Ownership.Should().Be(VehicleOwnership.Rented);
        vehicle.SupplierTitle.Should().Be("Aktarım Nakliyat");

        string[] tripCols = ImportService.Columns["trips"];
        object?[] Row(string customerName, decimal price) =>
            [new DateTime(2026, 8, 1), customerName, "41akt41", "aktarım şoförü", "Kocaeli", "Gebze", "İzmir", "Kemalpaşa", new DateTime(2026, 8, 2),
                "Otomotiv", "REF-1", 15000m, price, "Teslim Edildi", null];
        // Bilinmeyen müşteri: hiçbir satır yazılmaz
        var bad = await (await c.PostAsync("/api/import/trips?dryRun=false", ImportTests.Form(ImportTests.Workbook(tripCols,
            Row("Aktarım Müşterisi", 20000m), Row("Olmayan Müşteri", 21000m))))).ReadAsync<ImportResult>();
        bad.Errors.Should().ContainSingle(e => e.Row == 3 && e.Message.Contains("Müşteri bulunamadı"));
        (await (await c.GetAsync("/api/trips?search=Kemalpaşa")).ReadAsync<PagedResult<TripDto>>()).Total.Should().Be(0);

        var file = ImportTests.Workbook(tripCols, Row("Aktarım Müşterisi", 20000m), Row("AKTARIM MÜŞTERİSİ", 22000m));
        var ok = await (await c.PostAsync("/api/import/trips?dryRun=false", ImportTests.Form(file))).ReadAsync<ImportResult>();
        ok.Errors.Should().BeEmpty();
        ok.Created.Should().Be(2);
        // Aynı dosya ikinci kez: çift sefer oluşmaz
        var again = await (await c.PostAsync("/api/import/trips?dryRun=false", ImportTests.Form(file))).ReadAsync<ImportResult>();
        again.Created.Should().Be(0);
        again.Skipped.Should().Be(2);

        var trips = await (await c.GetAsync("/api/trips?search=Kemalpaşa")).ReadAsync<PagedResult<TripDto>>();
        trips.Total.Should().Be(2);
        trips.Items.Should().OnlyContain(t => t.Status == TripStatus.Delivered && t.CarrierSupplierTitle == "Aktarım Nakliyat" && t.DeliveryCity == "İzmir");
        var events = await (await c.GetAsync($"/api/trips/{trips.Items[0].Id}/events")).ReadAsync<List<TripEventDto>>();
        events.Should().ContainSingle(e => e.Source == TripEventSource.Import);
        // Kiralık araçla teslim edilmiş seferler taşeron borcu doğurur: devir 3.000 + 2 × 15.000
        var supplier = (await (await c.GetAsync("/api/suppliers?search=Aktarım Nakliyat")).ReadAsync<PagedResult<SupplierDto>>()).Items.Single();
        supplier.Balance.Should().Be(33_000);
    }
}
