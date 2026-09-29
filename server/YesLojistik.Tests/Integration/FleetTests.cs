using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Faz 6: masraf onayı, şoför hesabı, belgeler ve bakım.</summary>
public class FleetTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private static readonly byte[] Pdf = "%PDF-1.4\n%test\n"u8.ToArray();

    private record Setup(HttpClient Admin, HttpClient Driver, int DriverId, int VehicleId, int TripId);

    private async Task<Setup> SetupAsync(string suffix)
    {
        var admin = await factory.LoginAsync();
        var customer = await (await admin.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Filo Müşteri {suffix}", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Filo Şoför {suffix}", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await admin.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 FL {suffix}", "Tır", null, null, null, 100_000, null, null, null, null,
            VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await admin.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "İstanbul", "Ankara", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        var email = $"filo{suffix}@test.local";
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest($"Filo Şoför {suffix}", email, UserRole.Driver, true, "Sofor1234", driver.Id))).ReadAsync<UserDto>();
        var mobile = factory.CreateClient();
        var login = await (await mobile.PostAsJsonAsync("/api/auth/token", new { email, password = "Sofor1234" })).ReadAsync<TokenLoginResponse>();
        mobile.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        return new Setup(admin, mobile, driver.Id, vehicle.Id, trip.Id);
    }

    [Fact]
    public async Task Driver_expense_approval_flow_and_reports_count_only_approved()
    {
        var s = await SetupAsync("601");
        (await s.Driver.PostJsonAsync("/api/driver/push-token", new PushTokenRequest("ExponentPushToken[filo601]", "android"))).EnsureSuccessStatusCode();
        var e1 = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses", new DriverExpenseRequest(ExpenseCategory.Toll, 700, null, null, "Köprü"))).ReadAsync<DriverExpenseDto>();
        var e2 = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses", new DriverExpenseRequest(ExpenseCategory.Other, 300, null, null, "Yıkama"))).ReadAsync<DriverExpenseDto>();

        var pending = await (await s.Admin.GetAsync($"/api/expenses?approvalStatus=Pending&driverId={s.DriverId}")).ReadAsync<PagedResult<ExpenseDto>>();
        pending.Items.Select(e => e.Id).Should().BeEquivalentTo([e1.Id, e2.Id]);
        (await (await s.Admin.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>()).PendingExpenseCount.Should().BeGreaterThanOrEqualTo(2);

        // Bekleyen masraf sefer kârına girmez.
        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}")).ReadAsync<TripDto>()).Profit.Should().Be(1000);

        (await (await s.Admin.PostAsync($"/api/expenses/{e1.Id}/approve", null)).ReadAsync<ExpenseDto>()).ApprovalStatus.Should().Be(ApprovalStatus.Approved);
        (await s.Admin.PostJsonAsync($"/api/expenses/{e2.Id}/reject", new ExpenseRejectRequest(" "))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var rejected = await (await s.Admin.PostJsonAsync($"/api/expenses/{e2.Id}/reject", new ExpenseRejectRequest("Fiş yok"))).ReadAsync<ExpenseDto>();
        rejected.ApprovalStatus.Should().Be(ApprovalStatus.Rejected);
        rejected.RejectionReason.Should().Be("Fiş yok");
        factory.Push.Sent.Should().Contain(m => m.Token == "ExponentPushToken[filo601]" && m.Title == "Masrafınız reddedildi" && m.Body.Contains("Fiş yok"));

        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}")).ReadAsync<TripDto>()).Profit.Should().Be(300);
        var mine = await (await s.Driver.GetAsync($"/api/driver/trips/{s.TripId}/expenses")).ReadAsync<List<DriverExpenseDto>>();
        mine.Single(e => e.Id == e2.Id).RejectionReason.Should().Be("Fiş yok");
    }

    [Fact]
    public async Task Driver_ledger_matches_manual_calculation()
    {
        var s = await SetupAsync("602");
        (await s.Admin.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.DriverAdvance, 5_000, Today.AddDays(-5), null, null, "Yol avansı", s.DriverId))).EnsureSuccessStatusCode();
        var fuel = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses", new DriverExpenseRequest(ExpenseCategory.Fuel, 3_200, 70, null, null))).ReadAsync<DriverExpenseDto>();
        await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses", new DriverExpenseRequest(ExpenseCategory.Toll, 400, null, null, null))).ReadAsync<DriverExpenseDto>();
        (await s.Admin.PostAsync($"/api/expenses/{fuel.Id}/approve", null)).EnsureSuccessStatusCode();
        (await s.Admin.PostJsonAsync("/api/driver-settlements", new DriverSettlementSaveRequest(s.DriverId, Today, 1_000, SettlementDirection.ReceivedFromDriver, PaymentMethod.Cash, "İade"))).EnsureSuccessStatusCode();
        (await s.Admin.PostJsonAsync("/api/driver-settlements", new DriverSettlementSaveRequest(s.DriverId, Today, 250, SettlementDirection.PaidToDriver, PaymentMethod.Cash, null))).EnsureSuccessStatusCode();

        var l = await (await s.Admin.GetAsync($"/api/drivers/{s.DriverId}/ledger")).ReadAsync<DriverLedgerDto>();
        // 5.000 avans + 250 ödeme − 3.200 onaylı yakıt − 1.000 iade = 1.050 (400 TL bekleyen masraf sayılmaz)
        l.Advances.Should().Be(5_000);
        l.PaidToDriver.Should().Be(250);
        l.DriverExpenses.Should().Be(3_200);
        l.ReceivedFromDriver.Should().Be(1_000);
        l.Balance.Should().Be(1_050);
        l.PendingExpenses.Should().Be(400);
        l.Rows.Last().Balance.Should().Be(1_050);

        var export = await s.Admin.GetAsync($"/api/drivers/{s.DriverId}/ledger/export");
        export.StatusCode.Should().Be(HttpStatusCode.OK);

        // Operasyon rolü şoföre ödeme giremez.
        await (await s.Admin.PostJsonAsync("/api/users", new UserSaveRequest("Ops Filo", "opsfilo@test.local", UserRole.Operations, true, "Ops12345"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("opsfilo@test.local", "Ops12345");
        (await ops.PostJsonAsync("/api/driver-settlements", new DriverSettlementSaveRequest(s.DriverId, Today, 1, SettlementDirection.PaidToDriver, PaymentMethod.Cash, null)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Documents_with_files_raise_expiry_alerts()
    {
        var s = await SetupAsync("603");
        var doc = await (await s.Admin.PostJsonAsync("/api/documents", new DocumentSaveRequest(DocumentOwnerType.Vehicle, s.VehicleId, DocumentType.Casco, "KSK-1",
            Today.AddYears(-1), Today.AddDays(25), null))).ReadAsync<DocumentDto>();
        doc.DaysLeft.Should().Be(25);
        doc.OwnerName.Should().Be("34 FL 603");

        using var form = new MultipartFormDataContent { { new ByteArrayContent(Pdf), "file", "kasko.pdf" } };
        (await (await s.Admin.PostAsync($"/api/documents/{doc.Id}/file", form)).ReadAsync<DocumentDto>()).HasFile.Should().BeTrue();
        var file = await s.Admin.GetAsync($"/api/documents/{doc.Id}/file");
        file.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        (await file.Content.ReadAsByteArrayAsync()).Should().Equal(Pdf);

        (await s.Admin.PostJsonAsync("/api/documents", new DocumentSaveRequest(DocumentOwnerType.Driver, null, DocumentType.Src, null, null, null, null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var alerts = await (await s.Admin.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>();
        alerts.Should().Contain(a => a.Type == "document" && a.Title == "34 FL 603" && a.Message.StartsWith("Kasko 25 gün sonra"));

        var list = await (await s.Admin.GetAsync($"/api/documents?ownerType=Vehicle&ownerId={s.VehicleId}")).ReadAsync<List<DocumentDto>>();
        list.Should().ContainSingle();
        (await s.Admin.DeleteAsync($"/api/documents/{doc.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await (await s.Admin.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>()).Should().NotContain(a => a.Type == "document" && a.Title == "34 FL 603");
    }

    [Fact]
    public async Task Maintenance_creates_linked_expense_and_updates_vehicle()
    {
        var s = await SetupAsync("604");
        var m = await (await s.Admin.PostJsonAsync($"/api/vehicles/{s.VehicleId}/maintenance", new MaintenanceSaveRequest(Today, 100_500, MaintenanceType.Periodic,
            "Yağ + filtre", 8_000, null, 101_300, Today.AddMonths(6)))).ReadAsync<MaintenanceDto>();
        m.ExpenseId.Should().NotBeNull();

        var vehicle = await (await s.Admin.GetAsync($"/api/vehicles/{s.VehicleId}")).ReadAsync<VehicleDto>();
        vehicle.Km.Should().Be(100_500);
        vehicle.LastMaintenanceDate.Should().Be(Today);
        vehicle.NextMaintenanceKm.Should().Be(101_300);
        vehicle.NextMaintenanceDate.Should().Be(Today.AddMonths(6));

        var expense = await (await s.Admin.GetAsync($"/api/expenses/{m.ExpenseId}")).ReadAsync<ExpenseDto>();
        expense.Category.Should().Be(ExpenseCategory.Maintenance);
        expense.Amount.Should().Be(8_000);
        expense.VehicleId.Should().Be(s.VehicleId);

        // Bakıma 800 km kaldı: kilometre uyarısı.
        var alerts = await (await s.Admin.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>();
        alerts.Should().Contain(a => a.Type == "maintenance-km" && a.Title == "34 FL 604" && a.Message.Contains("800"));

        // Tutar değişince aynı gider güncellenir (çift sayılmaz); bağlı gider tek başına silinemez.
        var updated = await (await s.Admin.PutJsonAsync($"/api/vehicles/{s.VehicleId}/maintenance/{m.Id}", new MaintenanceSaveRequest(Today, 100_500, MaintenanceType.Periodic,
            "Yağ + filtre", 9_000, null, 101_300, null))).ReadAsync<MaintenanceDto>();
        updated.ExpenseId.Should().Be(m.ExpenseId);
        (await (await s.Admin.GetAsync($"/api/expenses/{m.ExpenseId}")).ReadAsync<ExpenseDto>()).Amount.Should().Be(9_000);
        (await s.Admin.DeleteAsync($"/api/expenses/{m.ExpenseId}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var maintenanceExpenses = await (await s.Admin.GetAsync($"/api/expenses?vehicleId={s.VehicleId}&category=Maintenance")).ReadAsync<PagedResult<ExpenseDto>>();
        maintenanceExpenses.Items.Should().ContainSingle();

        (await s.Admin.DeleteAsync($"/api/vehicles/{s.VehicleId}/maintenance/{m.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await s.Admin.GetAsync($"/api/expenses/{m.ExpenseId}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
