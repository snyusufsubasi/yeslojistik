using FluentAssertions;
using YesLojistik.Core.Domain;

namespace YesLojistik.Tests.Unit;

public class IbanAndCityTests
{
    [Theory]
    [InlineData("TR33 0006 1005 1978 6457 8413 26", true)]
    [InlineData("tr330006100519786457841326", true)]
    [InlineData("TR330006100519786457841327", false)]
    [InlineData("DE89370400440532013000", false)]
    [InlineData("TR33", false)]
    public void Iban_is_validated_with_mod97(string iban, bool valid) => IbanValidator.IsValid(iban).Should().Be(valid);

    [Fact]
    public void Iban_is_formatted_in_groups() =>
        IbanValidator.Format("tr330006100519786457841326").Should().Be("TR33 0006 1005 1978 6457 8413 26");

    [Fact]
    public void Cities_are_normalized_with_turkish_casing()
    {
        Cities.All.Should().HaveCount(81).And.OnlyHaveUniqueItems();
        Cities.Normalize("istanbul").Should().Be("İstanbul");
        Cities.Normalize(" IĞDIR ").Should().Be("Iğdır");
        Cities.Normalize("Atlantis").Should().BeNull();
        Cities.IsValid(null).Should().BeTrue();
        Cities.IsValid("Atlantis").Should().BeFalse();
    }
}
