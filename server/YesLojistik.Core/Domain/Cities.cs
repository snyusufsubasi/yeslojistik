namespace YesLojistik.Core.Domain;

/// <summary>Türkiye'nin 81 ili (plaka sırasıyla). Web'deki client/src/lib/cities.ts ile aynı liste.</summary>
public static class Cities
{
    public static readonly string[] All =
    [
        "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
        "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
        "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
        "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
        "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
        "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
        "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
        "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
    ];

    private static readonly Dictionary<string, string> ByKey = All.ToDictionary(Key);

    private static string Key(string s) => s.Trim().ToUpper(Formatters.Tr);

    /// <summary>Yazılışı listeye göre düzeltir ("istanbul" → "İstanbul"); listede yoksa null.</summary>
    public static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : ByKey.GetValueOrDefault(Key(value));

    public static bool IsValid(string? value) => string.IsNullOrWhiteSpace(value) || Normalize(value) != null;
}
