# KDV ve Tevkifat Kuralları

Bu sayfa panelin KDV'yi nasıl hesapladığını anlatır. Firma KDV mükellefi, iş karayolu ile yük taşıma.

> **Önemli:** Oranlar ve kodlar mevzuata bağlıdır ve değişebilir. Kullanmadan önce **mali müşavirinize teyit ettirin.**

## Kurallar

| Kalem | KDV | Tevkifat |
|---|---|---|
| Müşteriye kesilen nakliye faturası | %20 | 2/10 (kod 624). Yalnızca KDV dahil toplam **12.000 TL'yi aşarsa** ve müşteri **şirketse** (10 haneli VKN). Şahıs (11 haneli TCKN) ya da vergi numarası yoksa tevkifat yok. |
| Taşerondan (kiralık araç) alınan nakliye | %20 | Aynı kural: KDV dahil 12.000 TL'yi aşarsa 2/10 |
| Komisyon | %20 | Yok |
| Gider: yakıt, bakım, lastik, otoyol/köprü | %20 | Yok |
| Gider: sigorta, vergi/harç, şoför harcırahı, şoför avansı | %0 | Yok |
| Gider: diğer | %20 (değiştirilebilir). Yemek ve konaklama %10'dur, elle %10 seçin. | Yok |
| Yurt dışı (uluslararası) taşıma | %0, istisna kodu **311** (KDV Kanunu 14/1) | Yok |

Seçilebilen KDV oranları: %0, %1, %10, %20. (%8 ve %18 Temmuz 2023'te kalktı. Eski kayıtlarda varsa olduğu gibi kalır.)

## Panel ne yapar?

- **Yeni sefer:** Satış KDV'si %20, taşeron KDV'si %20 gelir. Tevkifat "Otomatik"tir.
- **Fatura keserken:**
  - KDV oranı seçilen seferlerden gelir. Seferlerin hepsi aynı orandaysa o oran seçilir (yurt dışı seferde %0).
  - Tevkifat "Otomatik" gelir: 12.000 TL'yi aşan ve şirkete kesilen faturada 2/10, diğerlerinde yok. Ekranda hangisinin uygulandığı yazar.
  - KDV %0 seçilirse istisna kodu sorulur. Varsayılan 311 (uluslararası taşıma). 301 (mal ihracatı), 302 (hizmet ihracatı) ya da başka bir kod da girilebilir.
- **Alınan fatura (taşeron):** Matrahı yazınca KDV ve tevkifat kendiliğinden dolar. KDV ya da tevkifat kutusuna elle yazarsanız panel artık değiştirmez.
- **Gider girerken:** Tutar **KDV dahil** girilir. KDV oranı kategoriden gelir (yakıt %20, sigorta %0 gibi). Gerekirse değiştirin.
- **Kâr hesabı KDV hariçtir.** Firma ödediği KDV'yi indirdiği için kârdan KDV düşülür:
  - Komisyon "KDV dahil" işaretliyse %20'si düşülür (1.200 TL → 1.000 TL).
  - Müşteriye yansıtılmayan ek masraf "KDV dahil" ise KDV'si düşülür.
  - Giderler KDV'siz tutarıyla düşülür (1.200 TL yakıt → 1.000 TL).
- **Cari ve borçlar değişmez.** Müşteriden alınacak ve taşerona ödenecek tutarlar gerçek paradır, KDV dahil kalır.

## Her şey değiştirilebilir

Panelin önerdiği her oran (sefer, fatura, alınan fatura, gider) elle değiştirilebilir. Panel yalnızca varsayılanı doldurur. Özel bir durum varsa (ör. farklı tevkifat oranı) elle seçin.

## Eski kayıtlar

- Eski seferlerin ve giderlerin oranları değiştirilmedi.
- Pratikortam'dan ve Excel'den aktarılan seferlerde taşeron KDV'si 0 kalır (tutar olduğu gibi ödenir).
- Aktarılan giderlerde oran boştur, kâr hesabında kategorinin varsayılanı kullanılır.
