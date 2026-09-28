using FluentAssertions;
using YesLojistik.Core.Domain;

namespace YesLojistik.Tests.Unit;

public class ValidatorTests
{
    [Theory]
    [InlineData("1234567890", true)]   // geçerli örnek VKN
    [InlineData("1234567891", false)]
    [InlineData("10000000146", true)]  // geçerli örnek TCKN
    [InlineData("10000000147", false)]
    [InlineData("01234567890", false)] // TCKN 0 ile başlayamaz
    [InlineData("12345", false)]
    [InlineData("abcdefghij", false)]
    [InlineData(null, false)]
    public void Validates_tax_numbers(string? value, bool expected) =>
        TaxNumberValidator.IsValid(value).Should().Be(expected);

    [Theory]
    [InlineData("34ves01", "34 VES 01")]
    [InlineData("34 abc 123", "34 ABC 123")]
    [InlineData("06 A 1234", "06 A 1234")]
    [InlineData(" 16kz528 ", "16 KZ 528")]
    [InlineData("99 ABC 12", null)]   // il kodu 81'den büyük olamaz
    [InlineData("34 ABCD 12", null)]
    [InlineData("", null)]
    public void Normalizes_plates(string input, string? expected) =>
        Formatters.NormalizePlate(input).Should().Be(expected);

    [Theory]
    [InlineData("02165554433", "0216 555 44 33")]
    [InlineData("+90 532 123 45 67", "0532 123 45 67")]
    [InlineData("5321234567", "0532 123 45 67")]
    [InlineData("12345", null)]
    [InlineData("0123 456 78 90", null)]
    public void Normalizes_phones(string input, string? expected) =>
        Formatters.NormalizePhone(input).Should().Be(expected);
}
