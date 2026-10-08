namespace YesLojistik.Core.Dtos;

/// <summary>"Bugün" ekranındaki bir satır: kayıt, kısa açıklama ve tek tıkla açılan adres.</summary>
/// <param name="Tone">"danger" (gecikmiş / süresi dolmuş), "warning" (yaklaşan) ya da boş.</param>
/// <param name="Badge">Sağdaki kısa etiket: "3 gün gecikti", "12 gün kaldı"...</param>
public record TodayItemDto(string Title, string? Subtitle, string Link, DateOnly? Date = null, decimal? Amount = null,
    string? Tone = null, string? Badge = null);

/// <summary>Bir istisna kartı: kaç kayıt var, toplam tutar (varsa), süzülmüş listenin adresi ve ilk kayıtlar (en fazla 20).</summary>
/// <param name="Link">Kartın "Tümünü gör" adresi; tek bir listeye düşmeyen kartta boş.</param>
public record TodaySectionDto(string Key, string Title, int Count, string? Link, List<TodayItemDto> Items, decimal? Total = null);

/// <summary>GET /api/today: personelin güne başladığı istisna listesi. Muhasebe yetkisi yoksa tahsilat kartı gelmez.</summary>
public record TodayDto(DateOnly Date, List<TodaySectionDto> Sections);
