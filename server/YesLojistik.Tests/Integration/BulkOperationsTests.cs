using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Toplu işlemler: teslim evrakı onayı, durum ilerletme, toplu tedarikçi ödemesi ve seçilenleri Excel'e aktarma.</summary>
public class BulkOperationsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private record Setup(HttpClient C, int Customer, int OwnVehicle, int Driver);

    private async Task<Setup> SetupAsync(string name)
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"{name} Müşteri", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"{name} Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await VehicleAsync(c, VehicleOwnership.Own, null);
        return new Setup(c, customer.Id, vehicle, driver.Id);
    }

    private static async Task<int> VehicleAsync(HttpClient c, VehicleOwnership ownership, int? supplierId) =>
        (await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 TP {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, ownership, supplierId))).ReadAsync<VehicleDto>()).Id;

    private static async Task<int> SupplierAsync(HttpClient c, string title) =>
        (await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest(title, SupplierKind.Carrier, null, null, null, null, null, null, null,
            null, null, 30, null))).ReadAsync<SupplierDto>()).Id;

    private static async Task<TripDto> TripAsync(HttpClient c, Setup s, decimal cost, DateOnly date, int? vehicle = null, params TripStatus[] statuses)
    {
        var t = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(s.Customer, vehicle ?? s.OwnVehicle, s.Driver, "Tuzla", "Balçova", date,
            null, null, cost, cost + 5_000))).ReadAsync<TripDto>();
        foreach (var st in statuses) t = await (await c.PostJsonAsync($"/api/trips/{t.Id}/status", new TripStatusRequest(st))).ReadAsync<TripDto>();
        return t;
    }

    private static readonly TripStatus[] Delivered = [TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered];

    private static async Task<TripDto> GetTripAsync(HttpClient c, int id) => await (await c.GetAsync($"/api/trips/{id}")).ReadAsync<TripDto>();

    private async Task<HttpClient> UserAsync(HttpClient admin, string email, UserRole role)
    {
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest(email, email, role, true, "Sifre1234"))).ReadAsync<UserDto>();
        return await factory.LoginAsync(email, "Sifre1234");
    }

    [Fact]
    public async Task Approve_delivery_documents_updates_delivered_trips_and_explains_the_rest()
    {
        var s = await SetupAsync("Evrak");
        var a = await TripAsync(s.C, s, 1_000, Today, null, Delivered);
        var b = await TripAsync(s.C, s, 1_000, Today, null, Delivered);
        var planned = await TripAsync(s.C, s, 1_000, Today);

        var result = await (await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([a.Id, b.Id, planned.Id, a.Id])))
            .ReadAsync<BulkResultDto>();
        result.Updated.Should().Be(2);
        result.Skipped.Should().ContainSingle(x => x.Id == planned.Id && x.Reason.Contains("teslim edilmedi"));
        (await GetTripAsync(s.C, a.Id)).Terms!.DeliveryDocumentApproved.Should().BeTrue();
        (await GetTripAsync(s.C, b.Id)).Terms!.DeliveryDocumentApproved.Should().BeTrue();
        (await GetTripAsync(s.C, planned.Id)).Terms!.DeliveryDocumentApproved.Should().BeFalse();

        // "Onay bekleyen teslim evrakları" listesinden düşer.
        var pending = await (await s.C.GetAsync($"/api/trips?pendingDeliveryDocument=true&customerId={s.Customer}")).ReadAsync<PagedResult<TripDto>>();
        pending.Total.Should().Be(0);

        // Tekrar: hepsi zaten onaylı.
        var again = await (await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([a.Id, b.Id]))).ReadAsync<BulkResultDto>();
        again.Updated.Should().Be(0);
        again.Skipped.Should().HaveCount(2).And.OnlyContain(x => x.Reason == "Teslim evrakı zaten onaylı.");

        // İşlem geçmişine yazılır.
        var audit = await (await s.C.GetAsync($"/api/audit?entityType=Trip&entityId={a.Id}")).ReadAsync<PagedResult<AuditLogDto>>();
        audit.Items.Should().Contain(x => x.Action == "Updated" && x.Changes!.Contains("Teslim evrakı onayı: hayır → evet"));
    }

    [Fact]
    public async Task Approve_delivery_documents_writes_nothing_when_a_trip_is_missing_or_request_is_invalid()
    {
        var s = await SetupAsync("Eksik");
        var a = await TripAsync(s.C, s, 1_000, Today, null, Delivered);
        var deleted = await TripAsync(s.C, s, 1_000, Today);
        (await s.C.DeleteAsync($"/api/trips/{deleted.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var res = await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([a.Id, deleted.Id]));
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await GetTripAsync(s.C, a.Id)).Terms!.DeliveryDocumentApproved.Should().BeFalse();

        (await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest(Enumerable.Range(1, 501).ToList())))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await s.C.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([a.Id, -1]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await GetTripAsync(s.C, a.Id)).Terms!.DeliveryDocumentApproved.Should().BeFalse();
    }

    [Fact]
    public async Task Advance_status_moves_each_trip_one_step_and_syncs_vehicles()
    {
        var s = await SetupAsync("İlerlet");
        var planned = await TripAsync(s.C, s, 1_000, Today);
        var onRoad = await TripAsync(s.C, s, 1_000, Today, await VehicleAsync(s.C, VehicleOwnership.Own, null), TripStatus.Loaded, TripStatus.OnRoad);
        var delivered = await TripAsync(s.C, s, 1_000, Today, null, Delivered);
        var cancelled = await TripAsync(s.C, s, 1_000, Today, null, TripStatus.Cancelled);
        // Aracı bakımda olan sefer yüklenemez.
        var repairVehicle = await VehicleAsync(s.C, VehicleOwnership.Own, null);
        var blocked = await TripAsync(s.C, s, 1_000, Today, repairVehicle);
        var v = await (await s.C.GetAsync($"/api/vehicles/{repairVehicle}")).ReadAsync<VehicleDto>();
        (await s.C.PutJsonAsync($"/api/vehicles/{repairVehicle}", new VehicleSaveRequest(v.Plate, v.Type, null, null, null, 0, null, null, null, null,
            VehicleStatus.Maintenance, null, VehicleOwnership.Own, null))).EnsureSuccessStatusCode();

        var result = await (await s.C.PostJsonAsync("/api/trips/bulk/advance-status",
            new BulkTripRequest([planned.Id, onRoad.Id, delivered.Id, cancelled.Id, blocked.Id]))).ReadAsync<BulkResultDto>();
        result.Updated.Should().Be(2);
        result.Skipped.Select(x => x.Id).Should().BeEquivalentTo([delivered.Id, cancelled.Id, blocked.Id]);
        result.Skipped.Single(x => x.Id == blocked.Id).Reason.Should().Contain("bakımda");

        var loaded = await GetTripAsync(s.C, planned.Id);
        loaded.Status.Should().Be(TripStatus.Loaded);
        (await (await s.C.GetAsync($"/api/vehicles/{loaded.VehicleId}")).ReadAsync<VehicleDto>()).Status.Should().Be(VehicleStatus.OnRoad);
        var done = await GetTripAsync(s.C, onRoad.Id);
        done.Status.Should().Be(TripStatus.Delivered);
        done.DeliveryDate.Should().Be(Today);
        (await (await s.C.GetAsync($"/api/vehicles/{done.VehicleId}")).ReadAsync<VehicleDto>()).Status.Should().Be(VehicleStatus.Available);
        (await (await s.C.GetAsync($"/api/trips/{onRoad.Id}/events")).ReadAsync<List<TripEventDto>>()).Last().Status.Should().Be(TripStatus.Delivered);
        (await GetTripAsync(s.C, blocked.Id)).Status.Should().Be(TripStatus.Planned);

        // Biri bulunamazsa hiçbiri değişmez.
        (await s.C.PostJsonAsync("/api/trips/bulk/advance-status", new BulkTripRequest([planned.Id, 987_654]))).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await GetTripAsync(s.C, planned.Id)).Status.Should().Be(TripStatus.Loaded);
    }

    [Fact]
    public async Task Bulk_endpoints_follow_single_item_permissions_and_mirror_guard()
    {
        var s = await SetupAsync("Yetki");
        var t = await TripAsync(s.C, s, 1_000, Today, null, Delivered);
        var accounting = await UserAsync(s.C, "bulk-acc@test.local", UserRole.Accounting);
        var ops = await UserAsync(s.C, "bulk-ops@test.local", UserRole.Operations);

        (await accounting.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([t.Id]))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await accounting.PostJsonAsync("/api/trips/bulk/advance-status", new BulkTripRequest([t.Id]))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.PostJsonAsync("/api/supplier-payments/bulk/preview", new BulkTripRequest([t.Id]))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t.Id], Today, PaymentMethod.BankTransfer)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await factory.CreateClient().PostJsonAsync("/api/trips/bulk/advance-status", new BulkTripRequest([t.Id]))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await (await ops.PostJsonAsync("/api/trips/bulk/approve-delivery-documents", new BulkTripRequest([t.Id]))).ReadAsync<BulkResultDto>()).Updated.Should().Be(1);

        // Pratikortam aynası açıkken toplu yazma işlemleri de reddedilir.
        (await s.C.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(true))).EnsureSuccessStatusCode();
        try
        {
            (await s.C.PostJsonAsync("/api/trips/bulk/advance-status", new BulkTripRequest([t.Id]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await s.C.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t.Id], Today, PaymentMethod.BankTransfer)))
                .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        finally
        {
            (await s.C.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(false))).EnsureSuccessStatusCode();
        }
    }

    [Fact]
    public async Task Bulk_supplier_payment_creates_one_payment_per_supplier_and_closes_the_selected_trips()
    {
        var s = await SetupAsync("Toplu Ödeme");
        var s1 = await SupplierAsync(s.C, "Birinci Taşeron");
        var s2 = await SupplierAsync(s.C, "İkinci Taşeron");
        var v1 = await VehicleAsync(s.C, VehicleOwnership.Rented, s1);
        var v2 = await VehicleAsync(s.C, VehicleOwnership.Rented, s2);
        var older = await TripAsync(s.C, s, 4_000, Today.AddDays(-20), v1, Delivered); // seçilmiyor: açık kalmalı
        var t1 = await TripAsync(s.C, s, 10_000, Today.AddDays(-5), v1, Delivered);
        var t2 = await TripAsync(s.C, s, 5_000, Today, v1, TripStatus.Loaded);
        var t3 = await TripAsync(s.C, s, 7_000, Today, v2, Delivered);
        var own = await TripAsync(s.C, s, 3_000, Today, null, Delivered);
        var planned = await TripAsync(s.C, s, 2_000, Today, v2);

        var preview = await (await s.C.PostJsonAsync("/api/supplier-payments/bulk/preview", new BulkTripRequest([t1.Id, t2.Id, t3.Id, own.Id, planned.Id])))
            .ReadAsync<BulkPaymentPreviewDto>();
        preview.Suppliers.Select(x => (x.SupplierId, x.Total)).Should().BeEquivalentTo([(s1, 15_000m), (s2, 7_000m)]);
        preview.Suppliers.Single(x => x.SupplierId == s1).Trips.Select(x => x.TripId).Should().Equal(t1.Id, t2.Id);
        preview.Total.Should().Be(22_000);
        preview.Skipped.Select(x => x.Id).Should().BeEquivalentTo([own.Id, planned.Id]);
        preview.Skipped.Single(x => x.Id == own.Id).Reason.Should().Contain("Özmal");

        // Ödenemeyecek sefer seçiliyse hiçbir ödeme yazılmaz.
        var rejected = await s.C.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t1.Id, t2.Id, t3.Id, own.Id], Today, PaymentMethod.BankTransfer));
        rejected.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await s.C.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t1.Id, 987_654], Today, PaymentMethod.BankTransfer)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await s.C.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t1.Id], Today, PaymentMethod.BankTransfer, CashAccountId: 987_654)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await (await s.C.GetAsync($"/api/supplier-payments?supplierId={s1}")).ReadAsync<PagedResult<SupplierPaymentDto>>()).Total.Should().Be(0);
        (await (await s.C.GetAsync($"/api/supplier-payments?supplierId={s2}")).ReadAsync<PagedResult<SupplierPaymentDto>>()).Total.Should().Be(0);

        var result = await (await s.C.PostJsonAsync("/api/supplier-payments/bulk", new BulkSupplierPaymentRequest([t1.Id, t2.Id, t3.Id], Today, PaymentMethod.BankTransfer)))
            .ReadAsync<BulkSupplierPaymentResultDto>();
        result.Total.Should().Be(22_000);
        result.Payments.Should().HaveCount(2);
        var p1 = result.Payments.Single(p => p.SupplierId == s1);
        p1.Amount.Should().Be(15_000);
        p1.TripId.Should().BeNull();
        p1.TripIds.Should().Equal(t1.Id, t2.Id);
        p1.TripLabel.Should().Be("2 sefer (toplu ödeme)");
        p1.Description.Should().StartWith("Toplu ödeme: No ");
        var p2 = result.Payments.Single(p => p.SupplierId == s2);
        p2.TripId.Should().Be(t3.Id);
        p2.Amount.Should().Be(7_000);

        // Ödeme seçilen seferleri kapatır; seçilmeyen eski sefer açık kalır (FIFO'ya gitmez).
        var summary = await (await s.C.GetAsync($"/api/suppliers/{s1}")).ReadAsync<SupplierSummaryDto>();
        summary.Balance.Should().Be(4_000);
        var moves = await (await s.C.GetAsync($"/api/suppliers/{s1}/movements")).ReadAsync<List<AccountMovementDto>>();
        moves.Where(m => m.Type == "Fatura bekleyen sefer" && m.Status == "Ödendi").Select(m => m.Debit).Should().BeEquivalentTo([10_000m, 5_000m]);
        moves.Single(m => m.Debit == 4_000).Status.Should().NotBe("Ödendi");
        (await (await s.C.GetAsync($"/api/suppliers/{s2}")).ReadAsync<SupplierSummaryDto>()).Balance.Should().Be(0);

        // Artık borcu kalmayan sefer bir daha ödenmez.
        var after = await (await s.C.PostJsonAsync("/api/supplier-payments/bulk/preview", new BulkTripRequest([t1.Id, older.Id]))).ReadAsync<BulkPaymentPreviewDto>();
        after.Skipped.Should().ContainSingle(x => x.Id == t1.Id && x.Reason.Contains("Borcu kalmamış"));
        after.Suppliers.Single().Total.Should().Be(4_000);

        // İşlem geçmişine yazılır.
        var audit = await (await s.C.GetAsync($"/api/audit?entityType=SupplierPayment&entityId={p1.Id}")).ReadAsync<PagedResult<AuditLogDto>>();
        audit.Items.Should().ContainSingle(x => x.Action == "Created");

        // Toplu ödeme tek ödeme formundan düzenlenince sefer listesi korunur; başka tedarikçiye taşınırsa bırakılır.
        var edited = await (await s.C.PutJsonAsync($"/api/supplier-payments/{p1.Id}", new SupplierPaymentSaveRequest(s1, Today, 15_000, PaymentMethod.Cash, null, "Düzeltme")))
            .ReadAsync<SupplierPaymentDto>();
        edited.TripIds.Should().Equal(t1.Id, t2.Id);
    }

    [Fact]
    public async Task Selected_rows_can_be_listed_and_exported()
    {
        var s = await SetupAsync("Excel");
        var a = await TripAsync(s.C, s, 1_000, Today);
        var b = await TripAsync(s.C, s, 1_000, Today);
        await TripAsync(s.C, s, 1_000, Today);

        var list = await (await s.C.GetAsync($"/api/trips?ids={a.Id},{b.Id},x")).ReadAsync<PagedResult<TripDto>>();
        list.Items.Select(t => t.Id).Should().BeEquivalentTo([a.Id, b.Id]);
        var file = await s.C.GetAsync($"/api/trips/export?ids={a.Id},{b.Id}");
        file.StatusCode.Should().Be(HttpStatusCode.OK);
        file.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        using var book = new ClosedXML.Excel.XLWorkbook(await file.Content.ReadAsStreamAsync());
        book.Worksheet(1).RowsUsed().Count().Should().BeGreaterThanOrEqualTo(3).And.BeLessThanOrEqualTo(4); // başlık + 2 satır (+ toplam)

        (await s.C.GetAsync($"/api/invoices/export?ids=1")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await s.C.GetAsync($"/api/payments/export?ids=1")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
