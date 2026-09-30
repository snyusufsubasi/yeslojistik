using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class CariTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Cari_tables_match_each_party_balance()
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Cari Test Müşterisi", null, null, null, null, null, null,
            OpeningBalance: 1500, OpeningBalanceDate: Today.AddDays(-60)))).ReadAsync<CustomerSummaryDto>()).Customer;
        var supplier = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Cari Test Taşeronu", SupplierKind.Carrier, null, null, null, null, null,
            null, null, null, null, 30, null, 800, Today))).ReadAsync<SupplierDto>();
        await (await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(supplier.Id, Today, 300, PaymentMethod.BankTransfer, null, null)))
            .ReadAsync<object>();

        var customers = await (await c.GetAsync("/api/cari/customers")).ReadAsync<List<CustomerCariRow>>();
        var row = customers.Single(r => r.Id == customer.Id);
        row.Opening.Should().Be(1500);
        row.Balance.Should().Be(customer.Balance).And.Be(1500);
        row.Overdue.Should().Be(1500); // devir 60 gün önce, vadesi geçmiş sayılır

        var suppliers = await (await c.GetAsync("/api/cari/suppliers")).ReadAsync<List<SupplierCariRow>>();
        var s = suppliers.Single(r => r.Id == supplier.Id);
        s.Paid.Should().Be(300);
        s.Balance.Should().Be(500);
        var detail = await (await c.GetAsync($"/api/suppliers/{supplier.Id}")).ReadAsync<SupplierSummaryDto>();
        s.Balance.Should().Be(detail.Supplier.Balance);
    }

    [Fact]
    public async Task Trip_totals_match_the_listed_trips()
    {
        var c = await factory.LoginAsync();
        var totals = await (await c.GetAsync("/api/trips/totals")).ReadAsync<TripTotalsDto>();
        var list = await (await c.GetAsync("/api/trips?pageSize=100")).ReadAsync<PagedResult<TripDto>>();
        var live = list.Items.Where(t => t.Status != TripStatus.Cancelled).ToList();
        totals.Count.Should().Be(live.Count);
        totals.Sale.Should().Be(live.Sum(t => t.SalePrice));
        totals.Profit.Should().Be(live.Sum(t => t.Profit));
    }
}
