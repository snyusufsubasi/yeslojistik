using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Unit;

/// <summary>
/// Tek kâr formülü (KDV hariç): satış + komisyon − maliyet − prim − faturalanmayan ek masraf − sefer giderleri.
/// KDV dahil girilen komisyonun ve ek masrafın KDV'si düşülür.
/// </summary>
public class TripProfitTests
{
    private static TripMoney Gross(decimal sale, decimal cost, decimal commission, decimal bonus, decimal extra, bool extraInvoiced, decimal expenses) =>
        new(sale, cost, commission, bonus, extra, extraInvoiced, expenses, CommissionVatIncluded: false, ExtraChargeVatIncluded: false, SaleVatRate: 20);

    [Fact]
    public void Profit_of_a_single_trip()
    {
        var m = Gross(10_000, 6_000, 500, 200, 300, false, 250);
        m.Revenue.Should().Be(10_500);
        m.DirectCost.Should().Be(6_500);
        m.Margin.Should().Be(4_000);
        m.Profit.Should().Be(3_750);
        // Müşteriye faturalanan ek masraf kâra yük olmaz.
        (m with { ExtraChargeInvoiced = true }).Profit.Should().Be(4_050);
    }

    [Fact]
    public void Vat_included_commission_and_extra_charge_count_net()
    {
        var m = new TripMoney(10_000, 6_000, Commission: 1_200, DriverBonus: 0, ExtraCharge: 600, ExtraChargeInvoiced: false, Expenses: 0,
            CommissionVatIncluded: true, ExtraChargeVatIncluded: true, SaleVatRate: 20);
        m.CommissionNet.Should().Be(1_000);
        m.ExtraCost.Should().Be(500);
        m.Profit.Should().Be(10_000 - 6_000 + 1_000 - 500);
        // Satış KDV'si %10 ise ek masrafın KDV'si de %10 sayılır; KDV hariç girildiyse olduğu gibi.
        (m with { SaleVatRate = 10, ExtraCharge = 550 }).ExtraCost.Should().Be(500);
        (m with { ExtraChargeVatIncluded = false }).ExtraCost.Should().Be(600);
        (m with { CommissionVatIncluded = false }).CommissionNet.Should().Be(1_200);
        // Faturalanan ek masraf yine kâra yük olmaz.
        (m with { ExtraChargeInvoiced = true }).ExtraCost.Should().Be(0);
        TripProfit.CommissionNet(1_000, true).Should().Be(833.33m);
    }

    [Fact]
    public void Totals_use_the_same_formula_as_single_trips()
    {
        TripMoney[] trips =
        [
            Gross(10_000, 6_000, 500, 200, 300, false, 250),
            Gross(8_000, 5_000, 0, 0, 400, true, 0),
            Gross(0, 1_000, 0, 0, 0, false, 100),
            new(5_000, 4_000, 1_200, 0, 120, false, 0, true, true, 20),
        ];
        var totals = TripMoneyTotals.Of(trips);
        totals.Count.Should().Be(4);
        totals.Commission.Should().Be(1_500);
        totals.ExtraCost.Should().Be(400);
        totals.Profit.Should().Be(trips.Sum(t => t.Profit));
        totals.MarginPercent.Should().Be(Math.Round(totals.Profit / 24_500 * 100, 1));
        TripMoneyTotals.Of([]).MarginPercent.Should().BeNull();
    }

    [Fact]
    public void Trip_margin_delegates_to_the_shared_formula()
    {
        var trip = new Trip { SalePrice = 9_500, VehicleCost = 4_500, Commission = 600, DriverBonus = 200, ExtraCharge = 360 };
        // Komisyon ve ek masraf varsayılan olarak KDV dahil: 600 → 500, 360 → 300.
        trip.Margin().Should().Be(5_000);
        trip.ExtraChargeInvoiced = true;
        trip.Margin().Should().Be(5_300);
    }

    [Fact]
    public void Expense_vat_defaults_follow_the_category()
    {
        ExpenseVat.DefaultFor(ExpenseCategory.Fuel).Should().Be(20);
        ExpenseVat.DefaultFor(ExpenseCategory.Maintenance).Should().Be(20);
        ExpenseVat.DefaultFor(ExpenseCategory.Tire).Should().Be(20);
        ExpenseVat.DefaultFor(ExpenseCategory.Toll).Should().Be(20);
        ExpenseVat.DefaultFor(ExpenseCategory.Other).Should().Be(20);
        ExpenseVat.DefaultFor(ExpenseCategory.Insurance).Should().Be(0);
        ExpenseVat.DefaultFor(ExpenseCategory.Tax).Should().Be(0);
        ExpenseVat.DefaultFor(ExpenseCategory.DriverAllowance).Should().Be(0);
        ExpenseVat.DefaultFor(ExpenseCategory.DriverAdvance).Should().Be(0);

        ExpenseVat.NetOf(new Expense { Category = ExpenseCategory.Fuel, Amount = 1_200 }).Should().Be(1_000);
        ExpenseVat.NetOf(new Expense { Category = ExpenseCategory.Insurance, Amount = 1_200 }).Should().Be(1_200);
        // Yemek/konaklama "Diğer" altında %10 seçilebilir.
        ExpenseVat.NetOf(new Expense { Category = ExpenseCategory.Other, Amount = 1_100, VatRate = 10 }).Should().Be(1_000);
    }

    [Fact]
    public void Expense_vat_query_expression_matches_the_domain_rule()
    {
        var net = ExpenseVat.NetAmount.Compile();
        foreach (var category in Enum.GetValues<ExpenseCategory>())
            foreach (decimal? rate in new decimal?[] { null, 0, 10, 20 })
            {
                var e = new Expense { Category = category, Amount = 1_234.56m, VatRate = rate };
                Money.Round(net(e)).Should().Be(ExpenseVat.NetOf(e), $"{category} %{rate}");
            }
    }
}
