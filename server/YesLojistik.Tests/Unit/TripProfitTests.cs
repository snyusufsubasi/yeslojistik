using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Unit;

/// <summary>Tek kâr formülü: satış + komisyon − maliyet − prim − faturalanmayan ek masraf − sefer giderleri.</summary>
public class TripProfitTests
{
    [Fact]
    public void Profit_of_a_single_trip()
    {
        var m = new TripMoney(Sale: 10_000, VehicleCost: 6_000, Commission: 500, DriverBonus: 200, ExtraCharge: 300, ExtraChargeInvoiced: false, Expenses: 250);
        m.Revenue.Should().Be(10_500);
        m.DirectCost.Should().Be(6_500);
        m.Margin.Should().Be(4_000);
        m.Profit.Should().Be(3_750);
        // Müşteriye faturalanan ek masraf kâra yük olmaz.
        (m with { ExtraChargeInvoiced = true }).Profit.Should().Be(4_050);
    }

    [Fact]
    public void Totals_use_the_same_formula_as_single_trips()
    {
        TripMoney[] trips =
        [
            new(10_000, 6_000, 500, 200, 300, false, 250),
            new(8_000, 5_000, 0, 0, 400, true, 0),
            new(0, 1_000, 0, 0, 0, false, 100),
        ];
        var totals = TripMoneyTotals.Of(trips);
        totals.Count.Should().Be(3);
        totals.ExtraCost.Should().Be(300);
        totals.Profit.Should().Be(trips.Sum(t => t.Profit));
        totals.MarginPercent.Should().Be(Math.Round(totals.Profit / 18_500 * 100, 1));
        TripMoneyTotals.Of([]).MarginPercent.Should().BeNull();
    }

    [Fact]
    public void Trip_margin_delegates_to_the_shared_formula()
    {
        Trip.Margin(9_500, 4_500, 500, 200, 300, false).Should().Be(5_000);
        Trip.Margin(9_500, 4_500, 500, 200, 300, true).Should().Be(5_300);
    }
}
