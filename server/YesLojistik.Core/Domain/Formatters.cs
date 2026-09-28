using System.Globalization;
using System.Text.RegularExpressions;

namespace YesLojistik.Core.Domain;

public static partial class Formatters
{
    public static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    [GeneratedRegex(@"^(0[1-9]|[1-7][0-9]|8[01])\s*([A-Z]{1,3})\s*(\d{2,5})$")]
    private static partial Regex PlateRegex();

    /// <summary>"34ves01" → "34 VES 01". Geçersizse null.</summary>
    public static string? NormalizePlate(string? plate)
    {
        if (string.IsNullOrWhiteSpace(plate)) return null;
        var m = PlateRegex().Match(plate.Trim().ToUpper(Tr));
        return m.Success ? $"{m.Groups[1].Value} {m.Groups[2].Value} {m.Groups[3].Value}" : null;
    }

    /// <summary>"+90 216 555 4433" → "0216 555 44 33". Geçersizse null.</summary>
    public static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsAsciiDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length == 12) digits = digits[2..];
        if (digits.StartsWith('0') && digits.Length == 11) digits = digits[1..];
        if (digits.Length != 10 || digits[0] is '0' or '1') return null;
        return $"0{digits[..3]} {digits[3..6]} {digits[6..8]} {digits[8..]}";
    }

    public static string Currency(decimal value) => value.ToString("N2", Tr) + " TL";

    public static string Date(DateOnly value) => value.ToString("dd.MM.yyyy", Tr);
}
