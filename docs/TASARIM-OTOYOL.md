# Seçilen tasarım: "Otoyol"

*3 Ekim 2026'da kullanıcı seçti. Kaynak: tasarım seçim sayfası, A yönü.*

**Kullanıcının ek isteği:** soldaki menü listeleri hep görünür olsun. Gruplar açılıp kapanmasın, menü daraltma düğmesi de olmasın.

## Hava
Otoyol tabelası gibi: az renk, net yazı, sıkı ve düzenli tablo.
- Solda koyu çam yeşili sabit menü.
- Açık gri-yeşil zemin, beyaz tablolar.
- Sarı yalnızca dikkat isteyen yerde kullanılır ("faturası kesilecek", menü sayaçları).
- Köşeler neredeyse keskin, gölge yok. Bölümler ince çizgiyle ayrılır.

## Renkler (açık tema)
| Jeton | Değer | Kullanım |
|---|---|---|
| bg | `#f2f5f4` | sayfa zemini |
| surface | `#ffffff` | kart, tablo |
| surface-2 | `#e8eeec` | tablo başlığı, kart başlığı, satır üzeri (hover) |
| side | `#0f3a31` | sol menü zemini |
| side-fg | `#e4efeb` | menü yazısı |
| side-muted | `#8db1a6` | menü grup başlığı, ikonlar |
| side-active | `#1a5145` | menüde seçili / üzerine gelinen satır |
| fg | `#14231e` | ana yazı |
| muted | `#56685f` | ikincil yazı |
| line | `#d3ddd9` | çizgiler |
| accent | `#0d6a51` | ana düğme, bağlantı, seçili çip |
| accent-soft | `#dbeee7` | açık vurgu zemini |
| hl (sarı) | `#f0c02c` | menüde seçili satırın soldaki 3px çizgisi, menü sayaç rozeti, logo kutusu |
| plate | `#1d4f9e` | plaka rozetinin "TR" şeridi |
| good / good-soft | `#1b7442` / `#def2e5` | Teslim edildi, kazanç |
| warn / warn-soft | `#9a5d00` / `#fbeed6` | Yüklendi, uyarı |
| bad / bad-soft | `#b2302a` / `#fae2df` | hata, eksi tutar, vadesi geçen |
| info / info-soft | `#2b5c99` / `#e2ecf8` | Planlandı |
| bill / bill-soft | `#6e5100` / `#fcefc4` | "Faturası kesilecek" vurgusu |

Panelde şu an karanlık tema yok, bu iş için de gerekmez.

## Yazı
- **Overpass** (400, 600, 700, 800): bütün arayüz ve başlıklar. Tırnaklı (serif) başlık yazısı kalkar.
- **Overpass Mono** (400, 600): tutarlar, plakalar, sayılar, sayaçlar. Rakamlar eşit genişlikte olur, alt alta hizalanır.
- Fontlar `@fontsource/overpass` ve `@fontsource/overpass-mono` paketlerinden gelir (Google Fonts bağlantısı kullanılmaz). Yedek yazı tipi: "Segoe UI", system-ui, sans-serif.
- Taban boyut 14px civarı. Yazı boyutu ayarı (Normal / Büyük / Çok büyük) çalışmaya devam eder.

## Ölçüler
- Köşe yarıçapı: kart 4px, düğme ve alan 3px, durum etiketi 2px.
- Gölge yok. Yalnız açılır pencere ve açılır menüde: `0 8px 24px rgb(10 40 30 / .14)`.
- **Tablo:** satır dikey dolgusu 7px, yazı 13.5px. Başlık satırı surface-2 zeminli, 11px, BÜYÜK HARF, harf aralığı .07em. Dizüstünde 18-20 satır görünür.
- **Kart başlığı:** surface-2 zeminli. Başlık yazısı 12px, BÜYÜK HARF, harf aralığı .08em.

## Parçalar
- **Sol menü (236px):**
  - Logo: sarı zeminli küçük "YES" kutusu ve yanında "Lojistik" yazısı.
  - Altında arama kutusu, Ctrl K kısayoluyla.
  - Gruplar: Sevkiyat, Cari, Listeler, Öz Mal, Banka & Çek, Rapor ve Yönetim. Grup başlıkları 11px, BÜYÜK HARF, side-muted renkte. **Hep açık, katlanmaz.**
  - Seçili satır: side-active zemin, soldan 3px sarı çizgi, yazı kalın.
  - Sayaç rozeti: sarı zemin, koyu yeşil yazı, Overpass Mono.
  - En altta kullanıcı adı.
- **Üst çubuk:** beyaz, ince alt çizgi, 13px yazı. İçinde tarih, "Yeni" düğmesi, bildirim zili (kırmızı sayaç), kullanıcı.
- **Düğme:**
  - Ana düğme: accent zemin, beyaz yazı.
  - İkincil düğme: beyaz zemin, ince çizgi.
  - Hepsinde yazı kalın (600), köşe 3px.
- **Durum etiketi:** 2px köşe, solda küçük kare nokta, soft zemin üstünde koyu yazı.
  - Planlandı: info.
  - Yüklendi: warn.
  - Yolda: accent.
  - Teslim Edildi: good.
  - İptal: muted.
- **Plaka rozeti:** ince çerçeveli küçük kutu. Solda mavi (plate) "TR" şeridi, sağda Overpass Mono ile plaka. Plaka gösterilen her yerde kullanılır.
- **Kazanç şeridi (Sevkiyatlar):** yan yana kutular, aralarında dikey çizgi.
  - Etiket: 10.5px, BÜYÜK HARF.
  - Değer: Overpass Mono 15px.
  - "Faturası kesilecek" kutusu sağa yaslı ve bill-soft zeminli.
- **Ana sayfa rakamları:** 4 sütun, aralarında çizgi. Etiket küçük ve BÜYÜK HARF, değer Overpass Mono 22px. Vurgulanan kutu bill-soft zeminli.
- **Form:** alan etiketi 12.5px, kalın (600), muted renkte. Zorunlu alanda kırmızı yıldız. Grup başlıkları 11px, BÜYÜK HARF, accent renkte.

## Durum (3 Ekim)
**Yapıldı (temel):**
- Renkler, yazılar (Overpass, Overpass Mono), köşeler ve gölgeler bütün panelde değişti.
- Sol menü koyu yeşil, gruplar hep açık; menü daraltma düğmesi kalktı.
- Ortak parçalar yeni görünümde: düğme, kart, durum etiketi, açılır pencere, tablo, özet kutusu, sayfa başlığı.
- Plaka rozeti Sevkiyatlar, Araçlar, Ana Sayfa ve Pano'da.

**Sırada (sayfa sayfa düzeltme):**
- Sevkiyatlar kazanç şeridi ve Ana sayfa rakamları: tarifteki "yan yana kutu, arası çizgi" düzeni ve bill-soft vurgu.
- Ana sayfadaki renkli kısayol kutuları sade hale gelecek.
- Sayfalardaki yuvarlak filtre düğmeleri (Bugün / Gelecek / Hepsi gibi) köşeli olacak.
- Raporlar grafik renkleri yeni renklere uyacak.
- Plaka rozeti öbür ekranlara (şoförler, giderler, raporlar, harita) yayılacak.
- Giriş sayfası ve form grup başlıkları (11px, accent renk).
