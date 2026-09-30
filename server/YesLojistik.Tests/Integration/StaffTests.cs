using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class StaffTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Staff_month_summary_and_cash_account_movements()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var account = await (await c.PostJsonAsync("/api/cash-accounts", new CashAccountSaveRequest($"Personel Kasası {u}", CashAccountKind.Cash, null, 100000, null)))
            .ReadAsync<CashAccountDto>();
        var bad = await c.PostJsonAsync("/api/staff", new StaffSaveRequest("", "123", null, null, -1, null));
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var s = await (await c.PostJsonAsync("/api/staff", new StaffSaveRequest($"Arif Özer {u}", null, "0544 475 36 34", new DateOnly(2026, 9, 1), 50000, "Depo")))
            .ReadAsync<StaffDto>();
        await (await c.PostJsonAsync($"/api/staff/{s.Id}/transactions", new StaffTransactionSaveRequest(new DateOnly(2026, 9, 10), StaffTransactionKind.Advance, 5000, null, account.Id))).ReadAsync<object>();
        await (await c.PostJsonAsync($"/api/staff/{s.Id}/transactions", new StaffTransactionSaveRequest(new DateOnly(2026, 9, 20), StaffTransactionKind.Bonus, 2000, "Hafta sonu", account.Id))).ReadAsync<object>();
        await (await c.PostJsonAsync($"/api/staff/{s.Id}/transactions", new StaffTransactionSaveRequest(new DateOnly(2026, 9, 30), StaffTransactionKind.SalaryPayment, 40000, null, account.Id))).ReadAsync<object>();

        var sep = (await (await c.GetAsync("/api/staff?month=2026-09")).ReadAsync<List<StaffDto>>()).Single(x => x.Id == s.Id);
        sep.Salary.Should().Be(50000);
        sep.Remaining.Should().Be(50000 + 2000 - 5000 - 40000);
        (await (await c.GetAsync("/api/staff?month=2026-08")).ReadAsync<List<StaffDto>>()).Single(x => x.Id == s.Id).Salary.Should().Be(0); // işe başlamadan önce

        // Prim kasadan para çıkarmaz; avans ve maaş ödemesi çıkarır.
        var acc = (await (await c.GetAsync("/api/cash-accounts")).ReadAsync<List<CashAccountDto>>()).Single(a => a.Id == account.Id);
        acc.Balance.Should().Be(100000 - 5000 - 40000);
        (await c.DeleteAsync($"/api/staff/{s.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Recurring_payment_is_marked_paid_for_the_month_and_becomes_an_expense()
    {
        var c = await factory.LoginAsync();
        var u = Guid.NewGuid().ToString("N")[..6];
        var r = await (await c.PostJsonAsync("/api/recurring-payments", new RecurringPaymentSaveRequest($"Ofis kirası {u}", null, 25000, 5, ExpenseCategory.Other, null)))
            .ReadAsync<RecurringPaymentDto>();
        r.PaidDate.Should().BeNull();
        var paid = await (await c.PostJsonAsync($"/api/recurring-payments/{r.Id}/pay", new RecurringPayRequest(new DateOnly(2026, 9, 5), 25000, null)))
            .ReadAsync<RecurringPaymentDto>();
        paid.PaidDate.Should().Be(new DateOnly(2026, 9, 5));
        paid.DueDate.Should().Be(new DateOnly(2026, 9, 5));
        var oct = (await (await c.GetAsync("/api/recurring-payments?month=2026-10")).ReadAsync<List<RecurringPaymentDto>>()).Single(x => x.Id == r.Id);
        oct.PaidDate.Should().BeNull();
        oct.LastPaidDate.Should().Be(new DateOnly(2026, 9, 5));
        var expenses = await (await c.GetAsync($"/api/expenses?search={Uri.EscapeDataString($"Ofis kirası {u}")}")).ReadAsync<PagedResult<ExpenseDto>>();
        expenses.Items.Should().ContainSingle(e => e.Amount == 25000);
    }
}
