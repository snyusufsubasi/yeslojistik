using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class PayableTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private async Task<(HttpClient C, SupplierDto S, int Customer, int Vehicle, int Driver)> SetupAsync(string name, decimal opening = 0, int term = 30)
    {
        var c = await factory.LoginAsync();
        var s = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest(name, SupplierKind.Carrier, null, null, null, null, null, null, null,
            null, null, term, null, opening, opening > 0 ? Today.AddDays(-60) : null))).ReadAsync<SupplierDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"{name} Müşteri", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 PY {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"{name} Şoför", null, null, null, null, null, null, true, s.Id))).ReadAsync<DriverDto>();
        return (c, s, customer.Id, vehicle.Id, driver.Id);
    }

    private static async Task<TripDto> TripAsync(HttpClient c, int customer, int vehicle, int driver, decimal cost, DateOnly date, params TripStatus[] statuses)
    {
        var t = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer, vehicle, driver, "A", "B", date,
            statuses.Contains(TripStatus.Delivered) ? date.AddDays(1) : null, null, cost, cost + 5000,
            // Borç hesabı düz tutarlarla denenir (taşeron KDV'si yok).
            Terms: new TripTerms(CostVatRate: 0)))).ReadAsync<TripDto>();
        foreach (var st in statuses) t = await (await c.PostJsonAsync($"/api/trips/{t.Id}/status", new TripStatusRequest(st))).ReadAsync<TripDto>();
        return t;
    }

    [Fact]
    public async Task Balance_combines_opening_trips_credit_expenses_and_payments()
    {
        var (c, s, customer, vehicle, driver) = await SetupAsync("Borç Nakliyat", opening: 2_000);
        var t1 = await TripAsync(c, customer, vehicle, driver, 10_000, Today.AddDays(-40), TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered);
        var t2 = await TripAsync(c, customer, vehicle, driver, 7_000, Today, TripStatus.Loaded);
        await TripAsync(c, customer, vehicle, driver, 9_999, Today); // planlandı: borç yok
        var cancelled = await TripAsync(c, customer, vehicle, driver, 8_888, Today, TripStatus.Cancelled);
        cancelled.Status.Should().Be(TripStatus.Cancelled);

        // Vadeli gider: tedarikçisiz olamaz
        (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Maintenance, 1_500, Today, vehicle, null, null, IsOnCredit: true)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var exp = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Maintenance, 1_500, Today, vehicle, null, "Tamir",
            SupplierId: s.Id, IsOnCredit: true))).ReadAsync<ExpenseDto>();
        exp.IsOnCredit.Should().BeTrue();

        // Sefere bağlı ödeme önce o seferi kapatır; bağsız ödeme en eskiden (devir) başlar.
        await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 7_000, PaymentMethod.BankTransfer, t2.Id, null))).ReadAsync<SupplierPaymentDto>();
        await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 3_000, PaymentMethod.Cash, null, null))).ReadAsync<SupplierPaymentDto>();

        var summary = await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierSummaryDto>();
        summary.TotalDebit.Should().Be(2_000 + 10_000 + 7_000 + 1_500);
        summary.TotalCredit.Should().Be(10_000);
        summary.Balance.Should().Be(10_500);
        // Devir (60 gün önce, vade 30) 2.000 tamamen ödendi; t1 (40 gün önce + 30 vade) kalan 9.000 vadesi geçmiş.
        summary.OverdueAmount.Should().Be(9_000);
        summary.MissingInvoiceCount.Should().Be(1);

        var moves = await (await c.GetAsync($"/api/suppliers/{s.Id}/movements")).ReadAsync<List<AccountMovementDto>>();
        moves.First().Type.Should().Be("Devir");
        moves.Last().RunningBalance.Should().Be(10_500);
        moves.Should().Contain(m => m.Type == "Fatura bekleyen sefer" && m.Status == "Ödendi" && m.Debit == 7_000);

        var aging = await (await c.GetAsync("/api/reports/payables")).ReadAsync<List<PayableAgingRow>>();
        aging.Single(a => a.SupplierId == s.Id).Total.Should().Be(10_500);
        var report = await (await c.GetAsync("/api/reports/suppliers")).ReadAsync<List<SupplierReportRow>>();
        report.Single(r => r.SupplierId == s.Id).Should().BeEquivalentTo(new { TripCount = 2, TripCost = 17_000m, CreditExpenses = 1_500m, Paid = 10_000m, Balance = 10_500m });

        var pdf = await c.GetAsync($"/api/suppliers/{s.Id}/statement");
        pdf.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        var alerts = await (await c.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>();
        alerts.Should().Contain(a => a.Type == "payable" && a.Link == $"/tedarikciler/{s.Id}");
        (await (await c.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>()).PayableOverdue.Should().BeGreaterThanOrEqualTo(9_000);
    }

    [Fact]
    public async Task Payment_rules_and_permissions()
    {
        var (c, s, customer, vehicle, driver) = await SetupAsync("Kural Nakliyat");
        var other = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Başka Taşeron", SupplierKind.Carrier, null, null, null, null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var t = await TripAsync(c, customer, vehicle, driver, 5_000, Today, TripStatus.Loaded);
        (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(other.Id, Today, 100, PaymentMethod.Cash, t.Id, null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 0, PaymentMethod.Cash, null, null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Operasyon P", "ops-pay@test.local", UserRole.Operations, true, "Sifre1234"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("ops-pay@test.local", "Sifre1234");
        (await ops.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 100, PaymentMethod.Cash, null, null)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var p = await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 1_000, PaymentMethod.Check, null, "Çek"))).ReadAsync<SupplierPaymentDto>();
        (await (await c.GetAsync($"/api/supplier-payments?supplierId={s.Id}")).ReadAsync<PagedResult<SupplierPaymentDto>>()).Total.Should().Be(1);
        (await c.DeleteAsync($"/api/suppliers/{s.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.DeleteAsync($"/api/supplier-payments/{p.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierSummaryDto>()).Balance.Should().Be(5_000);
    }

    [Fact]
    public async Task Expense_receipt_is_uploaded_and_downloaded()
    {
        var c = await factory.LoginAsync();
        var exp = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Toll, 250, Today, null, null, "Köprü"))).ReadAsync<ExpenseDto>();
        exp.HasReceipt.Should().BeFalse();
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4 };
        var form = new MultipartFormDataContent { { new ByteArrayContent(png) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } }, "file", "fis.png" } };
        (await (await c.PostAsync($"/api/expenses/{exp.Id}/receipt", form)).ReadAsync<ExpenseDto>()).HasReceipt.Should().BeTrue();
        var get = await c.GetAsync($"/api/expenses/{exp.Id}/receipt");
        get.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
        (await get.Content.ReadAsByteArrayAsync()).Should().Equal(png);
        var bad = new MultipartFormDataContent { { new ByteArrayContent("merhaba"u8.ToArray()), "file", "x.txt" } };
        (await c.PostAsync($"/api/expenses/{exp.Id}/receipt", bad)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
