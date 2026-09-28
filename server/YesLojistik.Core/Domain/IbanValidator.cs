using System.Numerics;

namespace YesLojistik.Core.Domain;

/// <summary>Türk IBAN'ı: TR + 24 hane, ISO 13616 mod-97 kontrolü.</summary>
public static class IbanValidator
{
    public static string? Normalize(string? iban) =>
        string.IsNullOrWhiteSpace(iban) ? null : new string(iban.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToUpperInvariant();

    public static bool IsValid(string? iban)
    {
        var s = Normalize(iban);
        if (s is null || s.Length != 26 || !s.StartsWith("TR") || !s[2..].All(char.IsDigit)) return false;
        var rearranged = s[4..] + s[..4];
        var digits = string.Concat(rearranged.Select(c => char.IsLetter(c) ? (c - 'A' + 10).ToString() : c.ToString()));
        return BigInteger.Parse(digits) % 97 == 1;
    }

    /// <summary>"TR330006100519786457841326" → "TR33 0006 1005 1978 6457 8413 26"</summary>
    public static string? Format(string? iban)
    {
        var s = Normalize(iban);
        return s is null ? null : string.Join(' ', Enumerable.Range(0, (s.Length + 3) / 4).Select(i => s.Substring(i * 4, Math.Min(4, s.Length - i * 4))));
    }
}
