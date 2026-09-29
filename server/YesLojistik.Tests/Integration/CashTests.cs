using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Faz 7: çek/senet, kasa/banka hesapları, nakit akışı ve risk limiti.</summary>
public class CashTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private static async Task<int> CustomerWithInvoiceAsync(HttpClient c, string title, decimal amount, decimal? creditLimit = null)
    {
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest(title, null, null, null, null, null, null,
            OpeningBalance: amount, OpeningBalanceDate: Today.AddDays(-5), CreditLimit: creditLimit))).ReadAsync<CustomerSummaryDto>();
        return customer.Customer.Id;
    }

    [Fact]
    public async Task Bounced_check_restores_customer_balance_and_endorsement_pays_supplier()
    {
        var c = await factory.LoginAsync();
        var customerId = await CustomerWithInvoiceAsync(c, "Çek Müşteri", 10_000);
        var supplier = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Çek Nakliyat", SupplierKind.Carrier, null, null, null, null, null,
            null, null, null, null, 30, null, OpeningBalance: 8_000, OpeningBalanceDate: Today.AddDays(-10)))).ReadAsync<SupplierDto>();

        (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, null, Today, 6_000, PaymentMethod.Check, null)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest); // vade zorunlu
        var check = await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, null, Today, 6_000, PaymentMethod.Check, null,
            InstrumentNo: "123456", Bank: "Ziraat", InstrumentDueDate: Today.AddDays(20)))).ReadAsync<PaymentDto>();
        check.InstrumentStatus.Should().Be(InstrumentStatus.Portfolio);
        (await (await c.GetAsync($"/api/customers/{customerId}")).ReadAsync<CustomerSummaryDto>()).Balance.Should().Be(4_000);

        // Ciro: tedarikçi borcu 8.000 → 2.000
        var endorsed = await (await c.PostJsonAsync($"/api/payments/{check.Id}/instrument", new InstrumentStatusRequest(InstrumentStatus.Endorsed, supplier.Id)))
            .ReadAsync<PaymentDto>();
        endorsed.EndorsedTo.Should().Be("Çek Nakliyat");
        (await (await c.GetAsync($"/api/suppliers/{supplier.Id}")).ReadAsync<SupplierSummaryDto>()).Balance.Should().Be(2_000);
        (await c.DeleteAsync($"/api/payments/{check.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.DeleteAsync($"/api/supplier-payments/{endorsed.EndorsedSupplierPaymentId}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Karşılıksız: müşteri bakiyesi geri döner, ciro geri alınır (tedarikçi borcu yeniden açılır).
        await (await c.PostJsonAsync($"/api/payments/{check.Id}/instrument", new InstrumentStatusRequest(InstrumentStatus.Bounced))).ReadAsync<PaymentDto>();
        (await (await c.GetAsync($"/api/customers/{customerId}")).ReadAsync<CustomerSummaryDto>()).Balance.Should().Be(10_000);
        (await (await c.GetAsync($"/api/suppliers/{supplier.Id}")).ReadAsync<SupplierSummaryDto>()).Balance.Should().Be(8_000);
        var moves = await (await c.GetAsync($"/api/customers/{customerId}/movements")).ReadAsync<List<AccountMovementDto>>();
        moves.Last().Status.Should().Contain("karşılıksız");
        moves.Last().RunningBalance.Should().Be(10_000);

        var list = await (await c.GetAsync("/api/payments?instruments=true&instrumentStatus=Bounced")).ReadAsync<PagedResult<PaymentDto>>();
        list.Items.Should().Contain(p => p.Id == check.Id);
    }

    [Fact]
    public async Task Cash_account_balance_and_transfers()
    {
        var c = await factory.LoginAsync();
        var box = await (await c.PostJsonAsync("/api/cash-accounts", new CashAccountSaveRequest("Test Kasa", CashAccountKind.Cash, null, 1_000, Today.AddDays(-30)))).ReadAsync<CashAccountDto>();
        var bank = await (await c.PostJsonAsync("/api/cash-accounts", new CashAccountSaveRequest("Test Banka", CashAccountKind.Bank, "TR33 0006 1005 1978 6457 8413 26", 0, null))).ReadAsync<CashAccountDto>();
        (await c.PostJsonAsync("/api/cash-accounts", new CashAccountSaveRequest("Hatalı", CashAccountKind.Bank, "TR00", 0, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var customerId = await CustomerWithInvoiceAsync(c, "Kasa Müşteri", 5_000);
        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, null, Today, 3_000, PaymentMethod.Cash, null, CashAccountId: box.Id))).ReadAsync<PaymentDto>();
        // Portföydeki çek hesaba girmez; tahsil edilince girer.
        var check = await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, null, Today, 2_000, PaymentMethod.Check, null,
            InstrumentDueDate: Today.AddDays(3)))).ReadAsync<PaymentDto>();
        await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Toll, 400, Today, null, null, "Köprü", CashAccountId: box.Id))).ReadAsync<ExpenseDto>();
        await (await c.PostJsonAsync("/api/cash-transfers", new CashTransferSaveRequest(box.Id, bank.Id, Today, 2_500, "Bankaya yatırıldı"))).ReadAsync<CashTransferDto>();
        (await c.PostJsonAsync("/api/cash-transfers", new CashTransferSaveRequest(box.Id, box.Id, Today, 1, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var accounts = await (await c.GetAsync("/api/cash-accounts")).ReadAsync<List<CashAccountDto>>();
        accounts.Single(a => a.Id == box.Id).Balance.Should().Be(1_000 + 3_000 - 400 - 2_500);
        accounts.Single(a => a.Id == bank.Id).Balance.Should().Be(2_500);

        await (await c.PostJsonAsync($"/api/payments/{check.Id}/instrument", new InstrumentStatusRequest(InstrumentStatus.Collected, CashAccountId: bank.Id))).ReadAsync<PaymentDto>();
        var movements = await (await c.GetAsync($"/api/cash-accounts/{bank.Id}/movements")).ReadAsync<List<CashMovementDto>>();
        movements.Should().HaveCount(2);
        movements.Last().Balance.Should().Be(4_500);
        (await c.DeleteAsync($"/api/cash-accounts/{bank.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cash_flow_buckets_and_credit_limit_risk()
    {
        var c = await factory.LoginAsync();
        var customerId = await CustomerWithInvoiceAsync(c, "Risk Müşteri", 9_000, creditLimit: 10_000);
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 RSK 01", "Tır", null, null, null, 0, null, null, null, null,
            VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Risk Şoför", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customerId, vehicle.Id, driver.Id, "İstanbul", "Bursa", Today, null, null, 500, 2_000))).ReadAsync<TripDto>();
        await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<TripDto>();

        var risk = await (await c.GetAsync($"/api/customers/{customerId}/risk")).ReadAsync<CustomerRiskDto>();
        risk.OpenBalance.Should().Be(9_000);
        risk.UninvoicedDelivered.Should().Be(2_000);
        risk.Available.Should().Be(-1_000);
        (await (await c.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>()).Should().Contain(a => a.Type == "credit-limit" && a.Title == "Risk Müşteri");

        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customerId, null, Today, 1_500, PaymentMethod.PromissoryNote, null,
            InstrumentNo: "S-1", InstrumentDueDate: Today.AddDays(9)))).ReadAsync<PaymentDto>();
        var flow = await (await c.GetAsync("/api/dashboard/cash-flow")).ReadAsync<CashFlowDto>();
        flow.Buckets.Should().HaveCount(5);
        flow.Buckets[0].ExpectedIn.Should().BeGreaterThanOrEqualTo(7_500); // devir vadesi geçmiş (9.000 − 1.500 senet)
        flow.Buckets[2].InstrumentsIn.Should().BeGreaterThanOrEqualTo(1_500); // 9 gün sonra: 2. hafta
        (await (await c.GetAsync("/api/dashboard/alerts")).ReadAsync<List<AlertDto>>()).Should().NotContain(a => a.Type == "instrument" && a.Title == "Risk Müşteri");

        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Ops Kasa", "opskasa@test.local", UserRole.Operations, true, "Ops12345"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("opskasa@test.local", "Ops12345");
        (await ops.GetAsync("/api/cash-accounts")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.GetAsync("/api/dashboard/cash-flow")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ops.GetAsync("/api/cash-accounts/lookup")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
