namespace YesLojistik.Core.Domain;

/// <summary>
/// Tutarı faturadaki "yazıyla" biçimine çevirir: 12.345,67 → "YALNIZ ONİKİBİNÜÇYÜZKIRKBEŞ TÜRK LİRASI ALTMIŞYEDİ KURUŞ".
/// Türkçe yazımda "bir yüz" / "bir bin" denmez: "YÜZ", "BİN".
/// </summary>
public static class AmountInWords
{
    private static readonly string[] Ones = ["", "BİR", "İKİ", "ÜÇ", "DÖRT", "BEŞ", "ALTI", "YEDİ", "SEKİZ", "DOKUZ"];
    private static readonly string[] Tens = ["", "ON", "YİRMİ", "OTUZ", "KIRK", "ELLİ", "ALTMIŞ", "YETMİŞ", "SEKSEN", "DOKSAN"];
    private static readonly string[] Scales = ["", "BİN", "MİLYON", "MİLYAR", "TRİLYON"];

    public static string Tr(decimal amount)
    {
        amount = Math.Round(Math.Abs(amount), 2, MidpointRounding.AwayFromZero);
        var lira = (long)Math.Floor(amount);
        var kurus = (int)((amount - lira) * 100);
        var text = $"YALNIZ {(lira == 0 ? "SIFIR" : Words(lira))} TÜRK LİRASI";
        if (kurus > 0) text += $" {Words(kurus)} KURUŞ";
        return text;
    }

    public static string Words(long n)
    {
        if (n == 0) return "SIFIR";
        var parts = new List<string>();
        for (var scale = 0; n > 0; scale++, n /= 1000)
        {
            var group = (int)(n % 1000);
            if (group == 0) continue;
            var g = group == 1 && scale == 1 ? "" : Hundreds(group);
            parts.Insert(0, g + Scales[scale]);
        }
        return string.Concat(parts);
    }

    private static string Hundreds(int n)
    {
        var h = n / 100;
        var rest = n % 100;
        var hundred = h == 0 ? "" : (h == 1 ? "" : Ones[h]) + "YÜZ";
        return hundred + Tens[rest / 10] + Ones[rest % 10];
    }
}
