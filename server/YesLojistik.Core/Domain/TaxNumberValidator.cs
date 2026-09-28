namespace YesLojistik.Core.Domain;

public static class TaxNumberValidator
{
    /// <summary>10 haneli VKN veya 11 haneli TCKN'yi doğrular.</summary>
    public static bool IsValid(string? value) => value?.Length switch
    {
        10 => IsValidVkn(value),
        11 => IsValidTckn(value),
        _ => false,
    };

    public static bool IsValidVkn(string vkn)
    {
        if (vkn.Length != 10 || !vkn.All(char.IsAsciiDigit)) return false;
        var sum = 0;
        for (var i = 0; i < 9; i++)
        {
            var tmp = (vkn[i] - '0' + 9 - i) % 10;
            var v = tmp * (1 << (9 - i)) % 9;
            if (tmp != 0 && v == 0) v = 9;
            sum += v;
        }
        return (10 - sum % 10) % 10 == vkn[9] - '0';
    }

    public static bool IsValidTckn(string tckn)
    {
        if (tckn.Length != 11 || !tckn.All(char.IsAsciiDigit) || tckn[0] == '0') return false;
        var d = tckn.Select(c => c - '0').ToArray();
        var odd = d[0] + d[2] + d[4] + d[6] + d[8];
        var even = d[1] + d[3] + d[5] + d[7];
        var d10 = ((odd * 7 - even) % 10 + 10) % 10;
        var d11 = d.Take(10).Sum() % 10;
        return d[9] == d10 && d[10] == d11;
    }
}
