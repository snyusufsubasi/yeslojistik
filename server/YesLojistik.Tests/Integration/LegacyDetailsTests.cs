using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Eski paneldeki iadeler, araç kartı ve gider ayrıntıları.</summary>
public class LegacyDetailsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Refunds_reverse_balances_and_cash()
    {
        var c = await factory.LoginAsync();
        var account = await (await c.PostJsonAsync("/api/cash-accounts", new CashAccountSaveRequest("İade Bankası", CashAccountKind.Bank, null, 0, null))).ReadAsync<CashAccountDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("İade Müşteri", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customer.Id, null, Today, 1_000, PaymentMethod.BankTransfer, null, account.Id));
        var refund = await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customer.Id, null, Today, 300, PaymentMethod.BankTransfer,
            "Fazla ödeme iadesi", account.Id, IsRefund: true))).ReadAsync<PaymentDto>();
        refund.IsRefund.Should().BeTrue();
        refund.Amount.Should().Be(-300);
        var summary = await (await c.GetAsync($"/api/customers/{customer.Id}")).ReadAsync<CustomerSummaryDto>();
        summary.Balance.Should().Be(-700);
        // İade faturaya bağlanamaz.
        (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(customer.Id, null, Today, 1, PaymentMethod.Check, null, InstrumentDueDate: Today, IsRefund: true)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var supplier = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("İade Tedarikçi", SupplierKind.Service, null, null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var sp = await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(supplier.Id, Today, 250, PaymentMethod.BankTransfer, null,
            "Geri gelen", account.Id, IsRefund: true))).ReadAsync<SupplierPaymentDto>();
        sp.IsRefund.Should().BeTrue();
        (await (await c.GetAsync($"/api/suppliers/{supplier.Id}")).ReadAsync<SupplierSummaryDto>()).Balance.Should().Be(250);

        var accounts = await (await c.GetAsync("/api/cash-accounts")).ReadAsync<List<CashAccountDto>>();
        accounts.Single(a => a.Id == account.Id).Balance.Should().Be(1_000 - 300 + 250);
    }

    [Fact]
    public async Task Vehicle_card_and_expense_details_are_saved()
    {
        var c = await factory.LoginAsync();
        var card = new VehicleCard("3,5 ton", "Dizel", "HDI 2328", "Allianz", Today.AddMonths(6), "Yapıldı", "Yapıldı", Today.AddMonths(3), "Hasan usta", "Yusuf");
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 KR {Random.Shared.Next(1000, 99999)}", "Panelvan",
            "Fiat", null, 2017, 1000, null, null, null, null, VehicleStatus.Available, null, Card: card))).ReadAsync<VehicleDto>();
        vehicle.Card.Should().BeEquivalentTo(card);

        var expense = await (await c.PostJsonAsync("/api/expenses", new ExpenseSaveRequest(ExpenseCategory.Fuel, 5_514.82m, Today, vehicle.Id, null, null,
            Liters: 58.55m, Odometer: 824_619, Details: new ExpenseDetails("Yakıt masrafları", "Depo", null, null, "Üstünpet", "Dizel", 94.19m, 824_335, "1"))))
            .ReadAsync<ExpenseDto>();
        expense.Details!.FuelStation.Should().Be("Üstünpet");
        expense.Details.PreviousOdometer.Should().Be(824_335);
        var cats = await (await c.GetAsync("/api/expenses/categories")).ReadAsync<List<ExpenseCategoryTotal>>();
        cats.Should().Contain(x => x.Name == "Yakıt masrafları" && x.Total >= 5_514.82m);
    }
}
