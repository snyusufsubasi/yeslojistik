using FluentAssertions;
using YesLojistik.Core.Domain;

namespace YesLojistik.Tests.Unit;

public class InvoiceCalculatorTests
{
    [Fact]
    public void Calculates_vat_and_withholding()
    {
        // 25.000 + %20 KDV = 5.000; 2/10 tevkifat = 1.000; ödenecek = 29.000
        var t = InvoiceCalculator.Calculate([25_000m], 20, 2);
        t.Should().Be(new InvoiceTotals(25_000m, 5_000m, 1_000m, 29_000m));
    }

    [Fact]
    public void No_withholding_when_zero()
    {
        var t = InvoiceCalculator.Calculate([10_000m, 5_000m], 20, 0);
        t.Total.Should().Be(18_000m);
        t.WithholdingAmount.Should().Be(0);
    }

    [Fact]
    public void Rounds_each_step_to_two_decimals()
    {
        var t = InvoiceCalculator.Calculate([33.335m], 18, 5);
        t.Subtotal.Should().Be(33.34m);
        t.VatAmount.Should().Be(6.00m);   // 33.34 * 0.18 = 6.0012
        t.WithholdingAmount.Should().Be(3.00m);
        t.Total.Should().Be(36.34m);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(101, 0)]
    [InlineData(20, 11)]
    [InlineData(20, -1)]
    public void Rejects_invalid_rates(decimal vat, int withholding)
    {
        var act = () => InvoiceCalculator.Calculate([100m], vat, withholding);
        act.Should().Throw<DomainException>();
    }
}
