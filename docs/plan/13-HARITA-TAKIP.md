# 13 — Harita, araç takip ve takip linki

## 1. Amaç ve kapsam

Bu belge üç işi anlatır: ofisin araçların **son konumunu** tek haritada görmesi, bir aracın hangi
**sevkiyatta** olduğunu ve o sevkiyatın **izlediği yolu** görmesi, müşteriye **giriş gerektirmeyen
takip linki** gönderilmesi. Ekranın işi "yük nerede?" sorusunu 5 saniyede cevaplamaktır.

Harita, en sık 10 iş listesinde (`docs/KOLAYLASTIRMA-PLANI.md:251-262`) doğrudan yok; 2. iş
("bugünkü sevkiyatları görmek") ve 4. iş ("plakayla sevkiyat bulmak") için yardımcı ekrandır. Takip
linki ise "yüküm nerede?" telefonlarını azaltır.

Kapsam dışı: GPS donanımı (Arvento/Mobiliz) — hesap ve API anahtarı bekleniyor (`AGENTS.md` §8), şu
an yalnız şoför telefonunun konumu var. Ayrıca rota planlama, adres çözümlemesi, tahmini varış
saati, coğrafi çit uyarısı, şoför mobil ekranlarının düzeni (`mobile/AGENTS.md`) ve UETDS bildirimi
(`docs/UETDS.md`) kapsam dışıdır.

## 2. Bugünkü durum (kod kanıtıyla)

**Rotalar.** `/harita` → `MapPage` (`client/src/App.tsx:90`), `/takip/:token` →
`PublicTrackingPage` (`App.tsx:80`). Harita yeni menüde yok (`nav.ts:72-114`), klasik menüde "Araç
Takip Haritası" olarak var (`nav.ts:22`). Yeni görünümde erişim bölüm sekmesindendir: `sevkiyat`
bölümü `/seferler` + `/harita` (`sections.ts:25`). Yani sorunun bugünkü cevabı **bölüm sekmesi**;
sayfa içi Harita görünümü yok — `TripsPage` yalnız `'list' | 'board'` tanır (`TripsPage.tsx:80-81`,
segment düğmeleri `:329-330`), şablondaki "Liste · Pano · Harita" üçlüsü kurulmamıştır.

**Harita ekranı.** `MapPage.tsx:16` 30 saniyede bir `/tracking/vehicles`, `:18-23` seçili aracın
`/trips/{id}/route` verisini çeker. Konumlular süzülür (`:25`), işaretçiler `:26-37`; balonda plaka,
tip, şoför, sevkiyat etiketi, "Son konum" ve hız (`:29-36`). Yerleşim: `PageHeader` (`:43`),
`xl:grid-cols-4` (`:44`), harita `h-[60vh] min-h-80` (`:46`), sağda "Araçlar" listesi
`max-h-[60vh]` (`:48-67`). Boş durumda "Araç yok." (`:49`), konum yoksa "Konum bilgisi yok" (`:62`).
Ekranda **arama, süzgeç, dışa aktarma, yenile düğmesi ve hata dalı yoktur** — kod yalnız `data`
kullanır (`:16`, `:25`, `:49`, `:51`); istek düşerse kullanıcı boş harita ve boş liste görür.

**Harita bileşeni.** `MapView.tsx` Leaflet + react-leaflet'tir; döşemeler OpenStreetMap'ten
(`:49-51`), rota mavi çizgi (`:52`), işaretçi divIcon plaka etiketidir (`:19-29`, 11px beyaz yazı `:25`).

**Sunucu.** `server/YesLojistik.Api/Controllers/TrackingController.cs`: `GET tracking/vehicles`
(`:13`), `GET trips/{id}/route` (`:16`), `POST trips/{id}/tracking-link` (`:20-27`),
`GET public/track/{token}` (`:29-33`, `AllowAnonymous` + `public` hız sınırı). Denetleyicide
`[Authorize]` yok; koruma global fallback politikasındandır — personel rolü zorunlu
(`server/YesLojistik.Api/Program.cs:81`); genel takip ucu IP başına dakikada 60 istek
(`Program.cs:94-97`).

**İş kuralları.** `server/YesLojistik.Infrastructure/Services/TrackingService.cs`: link teslimden
**7 gün** sonra kapanır (`:14`, `:109`); iptal edilen sevkiyat için link üretilmez, var olan 404
döner (`:89`, `:108`); belirteç 18 rastgele bayttan base64url üretilir (`:90-95`); konum yalnız araç
o sevkiyatta yoldayken paylaşılır (`:117`); plaka maskelenir (`:119`, `:130-134`).
`LocationRetentionService.cs:11-12` günde bir, varsayılan **90** günden eski konumları, `:20-22`
2 yıldan eski işlem geçmişini siler. **Boşluk:** `PurgeAsync` (`TrackingService.cs:123-127`) yalnız
konum satırlarını siler; aracın üstündeki `LastLatitude/LastLongitude/LastLocationAt`
(`:51-57`) temizlenmez, oysa `VehiclesAsync` bu alanları okur (`:67`) — saklama süresi araç kartında
delinir.

**Şoför tarafı.** Konum ucu `POST api/driver/location`
(`Controllers/DriverController.cs:164-169`); uygulama 60 sn / 200 m aralıkla konum toplar
(`mobile/src/lib/location.ts:84-96`), çekim yoksa en çok 2000 kaydı kuyrukta tutar (`:9`), konum
rızası ayrıca kaydedilir (`DriverController.cs:39-44`). Rota ucu sevkiyat başına en çok 5000 nokta
döner (`TrackingService.cs:83`).

**Takip linki ve müşteri sayfası.** `TripExtras.tsx:88-138`: "Takip Linki Oluştur" (`:113`), salt
okunur link alanı (`:116`), "Kopyala" (`:118`), "WhatsApp ile Gönder" (`:119-122`), "Önizle"
(`:123-124`), "Sevkiyat rotası" haritası `h-72` (`:135`), "N konum · son kayıt …" (`:136`), konum
yoksa açıklayıcı boş metin (`:132`). `TripTracking` `MirrorContext` kullanmaz. `PublicTrackingPage`
oturumsuz düz axios ile okur, 60 sn'de bir yeniler (`:31-37`); başlık şeridi duruma göre renklenir
(`:13-19`, `:55-60`); dört adımlı ilerleme listesi (`:21-26`, `:69-79`); adres, tarih ve plaka
alanları (`:61-68`); konum varsa harita ve "Aracın son konumu, X önce alındı" (`:80-85`); `tel:`
bağlantısı (`:91-95`); "Bu sayfa her dakika kendiliğinden yenilenir." (`:97`); hatalı linkte "Takip
linki geçersiz" kartı (`:47-52`).

**Ayna ve lisans.** `MirrorWriteGuard.cs:16` yol listesinde `/api/trips` vardır ve GET dışı istekler
reddedilir (`:23-25`) → ayna açıkken **takip linki üretilemez**; dönen mesaj genel ayna metnidir.
Şoför konum ucu listede olmadığı için ayna açıkken yazmaya devam eder. Yardım sayfası haritayı ve
7 günlük kapanmayı anlatır (`HelpPage.tsx:124-133`); gizlilik metni konumun yalnız ilgili müşterinin
linkinde, teslimden en çok 7 gün sonrasına kadar gösterildiğini yazar (`PrivacyPage.tsx:78`); veri
indirmede takip belirteci dışarıda bırakılır
(`server/YesLojistik.Tests/Integration/DataExportTests.cs:64-65`).

## 3. Hedef yerleşim

**Karar:** Harita **hem** `/harita` bölüm sekmesi olarak kalır (derin bağlantı, telefonda tek
dokunuş; `sections.ts:25` korunur) **hem de** Sevkiyatlar listesine üçüncü sayfa içi görünüm olarak
eklenir: `Liste · Pano · Harita`. Gerekçe: çalışan Sevkiyatlar'da gezerken "hangi araç yolda" diye
bakmak ister; sayfa değiştirmeden görmek 1 tık kazandırır. Adres `/seferler` kalır (yeni rota yok),
seçim `yes.tripView` anahtarına `'map'` olarak yazılır (`TripsPage.tsx:80-81` genişletilir). Kod
kopyalanmaz: sorgular `client/src/lib/tracking.ts` içinde ortaklaştırılır.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Sevkiyatlar                        [⋯ Diğer]  [+ Sevkiyat Ekle]        │
│ Sevkiyat Listesi │ Harita          ← bölüm sekmesi (sections.ts:25)    │
│ Liste │ Pano │ Harita              ← sayfa içi görünüm (yeni)          │
│ [🔍 Plaka ara] [Tümü│Yoldakiler│Konumsuz] [↻ Şimdi yenile]             │
│ ┌ harita ≥60vh ───────────────────┐ ┌ Araçlar (60vh, kayar) ────────┐  │
│ │   [34 VES 01]   [06 ABC 12]     │ │ 34 VES 01   Yolda             │  │
│ │      rota çizgisi + son konum   │ │ İstanbul → Ankara             │  │
│ └─────────────────────────────────┘ └───────────────────────────────┘  │
│ Seçili: 34 VES 01 · Şoför Ali Y.  [Sevkiyatı aç →]  [Takip linki]      │
└────────────────────────────────────────────────────────────────────────┘
```

Ölçüler: üst kısım **≤260px** (`01-ORTAK-SARTNAME.md` §5), harita 1440×900'de **≥540px**, liste aynı
yükseklikte kendi içinde kayar, seçili araç şeridi 44px ve yalnız seçim varken görünür. Yeni
görünümde `/harita` için `newTitles` kaydı yoktur (`sections.ts:41-50`), bu yüzden başlık "Araç
Takip Haritası" kalır ve alt başlık gizlenir (`ui.tsx:112-113`); hedefte başlık **"Harita"**.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Davranış | Hata metni |
|---|---|---|---|
| Plaka ara | metin | Yazdıkça listeyi ve işaretçileri süzer | — |
| Tümü / Yoldakiler / Konumsuz | segment (rol: tab) | Duruma göre süzer; seçim adreste taşınmaz | — |
| Şimdi yenile | düğme | `refetch()`, son yenilenme saatini günceller | "Yenilenemedi, bağlantınızı denetleyin." |
| Araç satırı | düğme | Aracı seçer; tekrar tıklama seçimi kaldırır (`MapPage.tsx:53`) | — |
| Sevkiyatı aç → | bağlantı | Aktif sevkiyatı `/seferler?id=…` ile açar | — |
| Takip Linki Oluştur | yazma düğmesi | `POST /trips/{id}/tracking-link` (`TripExtras.tsx:113`) | "Link oluşturulamadı, yeniden deneyin." |
| Kopyala · WhatsApp · Önizle | düğme/bağlantı | Panoya kopyalar, `wa.me` paylaşır, yeni sekmede açar (`:118-124`) | "Kopyalanamadı, linki elle seçin." (`:99`) |

Klavye: **Ctrl+Enter** kaydeder, **Esc** pencereyi kapatır (kirli formda sorar, `ui.tsx:153-159`);
harita oklarla kayar, `+`/`-` yakınlaştırır; `/` plaka aramasına odaklanır. Bu ekranda süzgeç paneli
yoktur; plaka araması ve durum segmenti yeterlidir.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

**Boş:** hiç araç yoksa "Araç yok." (`MapPage.tsx:49`), konum yoksa liste dolar, harita Türkiye
merkezinde kalır, satırda "Konum bilgisi yok" (`:62`). Hedef: "Henüz araç eklenmemiş." ve "Konum
bekleniyor".

**Yükleniyor:** bugün iskelet yok, liste boş kalır. Hedefte harita ve liste gri iskelet; ilk anlamlı
içerik ≤1,5 sn.

**Hata:** bugün dal yok (§2). Hedefte "Konumlar alınamadı." + "Yeniden dene". Müşteri sayfasında
hata kartı vardır (`PublicTrackingPage.tsx:47-52`); 429 için "Çok sık yenilendi, bir dakika sonra
tekrar deneyin." eklenecek.

**Yetkisiz:** `/harita` yolunda `Guard` yoktur (`App.tsx:90`) → giriş yapan her ofis kullanıcısı
görür; şoför hesabı web paneline giremez (`client/e2e/tracking.spec.ts:65-71`). Karar: görüntüleme
tüm rollere açık kalır, yazma yetki ister.

**Ayna:** okuma serbest, `POST /api/trips/{id}/tracking-link` guard'a takılır
(`MirrorWriteGuard.cs:16`, `:23-25`). Hedefte düğme gizlenir, yerine "Ayna açık: takip linki
oluşturulamaz." satırı gelir; ham 403/500 metni görünmez.

**Lisans:** sahip modunda sınırsız, süre dolduğunda salt okunur (`docs/LISANS.md`): harita ve liste
çalışır, link üretimi kapanır, üstte "Aboneliğiniz doldu: görüntüleme açık, kayıt kapalı." şeridi.

## 6. Metinler ve terimler

Bugün görünenler: "Araç Takip Haritası", "Şoför uygulamasından gelen son konumlar · 30 saniyede bir
yenilenir" (`MapPage.tsx:43`), "Araç yok." (`:49`), "Konum bilgisi yok" (`:62`), "Müşteri takip
linki" (`TripExtras.tsx:107`), "Takip Linki Oluştur" (`:113`), "Link teslimden 7 gün sonra
kapanır." (`:110`), "Sevkiyat rotası" (`:130`), "Bu sevkiyat için henüz konum kaydı yok. Şoför mobil
uygulamada sevkiyata başladığında rota burada görünür." (`:132`); müşteri tarafında "Sayın …"
(`PublicTrackingPage.tsx:56`), "Yükünüz yolda" ve diğer durum başlıkları (`:13-19`), "Nereden",
"Nereye", "Yükleme tarihi", "Tahmini teslim"/"Teslim tarihi", "Araç plakası", "Sipariş / referans
no" (`:62-67`), "şu an" rozeti (`:74`), "Takip linki geçersiz" (`:49`), "Bu sayfa her dakika
kendiliğinden yenilenir." (`:97`).

Kurallar: ekranda teknik sözcük olmaz — "belirteç", "uç nokta", "ayna", "dry-run" görünmez; belirteç
yalnız adres çubuğundadır. Terim onayı gelmeden toplu değişiklik yapılmaz (`AGENTS.md` §6); yeni
metinler "Sevkiyat" der (`docs/plan/32-TERMINOLOJI.md`).

## 7. Telefon davranışı (390×844)

Bugün ızgara tek sütuna düşer: önce harita `h-[60vh] min-h-80` (`MapPage.tsx:46`), sonra 60vh
listesi (`:50`) → listeye inmek için kaydırmak gerekir. `client/e2e/mobile.spec.ts:4` `/harita`'yı
yatay taşma listesine dahil eder, taşma yoktur. Hedef: harita **45vh**, liste kayan gövdede; seçili
araç şeridi ekran altına **sabit** oturur ("Sevkiyatı aç", "Takip linki"), dokunma hedefi ≥44px.
Plaka arama kutusu tam genişlik, durum segmenti yatay kaydırılabilir tek satır; sayfa kaydırması
haritada kilitlenmemelidir. Müşteri sayfası `max-w-3xl` tek sütun akar
(`PublicTrackingPage.tsx:45`), "Bizi arayın" tam genişlik olur. İki ekranda da **yatay kaydırma 0px**.

## 8. Erişilebilirlik ve klavye

İşaretçiler divIcon'dur (`MapView.tsx:19-29`) ve görsel etiketten başka erişilebilir ad taşımaz; bu
yüzden erişilebilir yol **araç listesidir**. Satırlar `<button>` (`MapPage.tsx:53`) ama adı ham
metindir; hedef: `aria-label="34 VES 01, Yolda, son konum 4 dakika önce"` ve seçilide
`aria-current="true"`. Bölüm sekmeleri `role="tablist"` + `aria-selected` (`SectionTabs.tsx:17-27`);
sayfa içi görünüm düğmeleri de aynı rolü kullanmalı (`TripsPage.tsx:330`). Odak sırası: başlık →
sekmeler → arama → segment → yenile → harita → liste → şerit; `:focus-visible` jetonu
`index.css:102-106`. Durum **rozet + metin** birlikte verilir (`MapPage.tsx:57`). Kontrast: 11px
beyaz yazı, turuncu `#d97706` üzerinde ≈**3,2:1**, yeşil `#059669` üzerinde ≈**3,8:1**
(`MapPage.tsx:12`, `MapView.tsx:25`) — küçük yazı için 4,5:1 altında; hedef ≥4,5:1 (§13).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/tracking.spec.ts:4-63` tek testte haritayı, dosya yüklemeyi, takip linki
üretimini (`/takip/…` deseni) ve oturumsuz müşteri görünümünü (maskeli plaka `34 VES **`, fiyatın
görünmemesi) sınar; `:65-71` şoför hesabını; `:73-91` gizlilik sayfalarını. `mobile.spec.ts:4`
`/harita`'da yatay taşmayı ölçer. Sunucuda `DriverAppTests.cs:86-106` konum kaydının aracı ve
rotayı güncellediğini, geçersiz enlemde 400'ü; `:109-123` çok aktif sevkiyatta önce yoldakine
yazıldığını; `:147-164` genel ucun hassas alanları sakladığını, iptal sonrası 404'ü; `:320-332`
konum rızasını sınar. `AttachmentSniffTests.cs:28` plaka maskelemesini örnekler.

Eklenecekler: (1) `client/e2e/new-ui/map.spec.ts` — `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile sekmeler ve "Harita" başlığı, plaka araması, durum segmenti.
(2) Sevkiyatlar'da Harita görünümü: 1 tıkla geçer, adres `/seferler` kalır, yenilemede seçim
korunur. (3) `/api/tracking/vehicles` 500 dönerken hata kartı ve "Yeniden dene". (4) Ayna açıkken
takip linki düğmesinin gizlenmesi. (5) Sunucu: `PurgeAsync` eskimiş konumları ve araç üstündeki son
konum alanlarını temizler. (6) Bozuk plaka biçiminde ("34VES01") maskeleme birim testi. Kurallar:
test silme/atlama yok; yeni e2e önce arama yapar (`AGENTS.md` §4 tuzağı).

## 10. Uygulama adımları (dosya:satır, sırayla)

Kısaltmalar: **C** = `cd client && npm run lint && npm run build`, **T** = `cd client && npx playwright test`,
**S** = `cd server && dotnet test`.

1. `client/src/lib/tracking.ts` (yeni) — `MapPage.tsx:16-23` sorgularını ortak kancalara taşı
   (30 sn korunur). 2 saat. **C**.
2. `client/src/pages/MapPage.tsx:41-69` — plaka araması, durum segmenti, "Şimdi yenile", boş/hata/
   yükleniyor dalları. 4 saat. **T** `e2e/tracking.spec.ts`.
3. `client/src/pages/TripsPage.tsx:80-84, 329-330, 358-382` — görünüm `'list' | 'board' | 'map'`,
   `yes.tripView`'e `'map'`, üçüncü segment ve gömülü harita. 4 saat. **C**.
4. `client/src/pages/MapPage.tsx:44-68` — sabit "seçili araç" şeridi, "Sevkiyatı aç →" ve
   "Takip linki" eylemleri. 2 saat. Elle 1440×900 + 390×844 denemesi.
5. `client/src/components/MapView.tsx:19-29` — işaretçi etiketinde ≥4,5:1 kontrast, `title` ve
   erişilebilir ad. 2 saat. **C**.
6. `client/src/pages/MapPage.tsx:50-67` — telefonda harita 45vh, liste kayan gövde, tam genişlik
   arama. 3 saat. **T** `e2e/mobile.spec.ts`.
7. `client/src/components/TripExtras.tsx:112-127` — düğmeyi `write` korumasına al, ayna bilgi
   satırı ekle. 2 saat. **T** `e2e/tracking.spec.ts`.
8. `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16, 23-27` — takip linki ucu için
   anlaşılır ayrı mesaj (istisna kararı §13'e). 2 saat. **S** `--filter DriverAppTests`.
9. `server/YesLojistik.Infrastructure/Services/TrackingService.cs:123-127` — temizlikte eskimiş araç
   konum alanlarını da sil (`:51-57`). 3 saat. **S**.
10. `server/YesLojistik.Infrastructure/Services/TrackingService.cs:130-134` — `MaskPlate`'i plaka
    biçiminden bağımsız maskele. 1 saat. **S** `--filter AttachmentSniffTests`.
11. `server/YesLojistik.Api/appsettings.json` — `Tracking:RetentionDays` ve `App:PublicUrl`
    anahtarlarını açıkça yaz (varsayılan 90 gün; sır yazılmaz). 0,5 saat. **S**.
12. `client/e2e/new-ui/map.spec.ts` (yeni) + `client/e2e/tracking.spec.ts` — §9'daki senaryolar,
    tümü yeşil. 3 saat. **T** `e2e/new-ui e2e/tracking.spec.ts`.
13. `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md` — yapılanı işaretle. 0,5 saat. `git diff --stat`.

Toplam ≈ **29 saat ≈ 3,5 iş günü**; 1-3 numaralı adımlar görünen asıl kazançtır.

## 11. Kabul ölçütü

- 1440×900'de `/harita`: üst kısım **≤260px**, harita **≥540px**, sağ liste kendi içinde kayar.
- 390×844'te `/harita` ve `/takip/{token}`: **yatay taşma 0px**, harita **45vh**, şerit sabit.
- Plakayla araç bulma: menüden Harita **1 tık** + yazma + Enter = **≤3 etkileşim, ≤5 sn**.
- Sevkiyatlar'da Harita görünümü **1 tık**; adres `/seferler` kalır, yenilemede görünüm korunur.
- Takip linki: Sevkiyatlar → satır → "Takip ve Rota" → "Takip Linki Oluştur" = **≤3 tık**, link
  **≤2 sn** üretilir ve kopyalanır; müşteri sayfası giriş istemez, ilk anlamlı içerik **≤2 sn**,
  **60 sn**'de bir yenilenir, plakası maskelidir ve fiyat, şoför adı, müşteri telefonu içermez
  (`tracking.spec.ts:58-60`).
- **90 günden** eski konumlar silinir; temizlik sonrası araç kartında konum kalmaz (yeni test geçer).
- Ayna açıkken link düğmesi gizli veya açıklamalı; ham 403/500 metni hiç görünmez.
- Erişilebilirlik: işaretçi kontrastı **≥4,5:1**, dokunma hedefleri **≥44px**, satırlarda
  erişilebilir ad ve `aria-current`.
- **+4 e2e**, **+2 sunucu testi**; hiçbir test silinmez/atlanmaz; lint, build, `dotnet test` yeşil.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Haritayı Sevkiyatlar'a gömmek listeyi yavaşlatır | Yalnız görünüm açıkken yüklenir, sorgu ortak kancadan gelir | `yes.tripView='list'` varsayılanı; segment düğmesi kaldırılır |
| OSM döşemeleri üretimde engellenir | Adres tek yerde (`MapView.tsx:51`) | Sağlayıcı URL'si geri alınır |
| Konum temizliği yanlış çalışır | Yalnız `RecordedAt < kesim` silinir; önce yedek + onay | `Tracking:RetentionDays` artırılır, iş durdurulur |
| Yeni e2e örnek plakaya bağlanır | Test önce arama yapar, plakayı veriden okur | Test düzeltilir; silme yok |

## 13. Doğrulanacaklar

1. **Döşeme sağlayıcısı:** OpenStreetMap döşemeleri bu kullanım hacmi ve ticari kullanım için uygun
   mu, ücretli sağlayıcı/anahtar gerekiyor mu (`MapView.tsx:51`)? Koddan doğrulanamaz.
2. **Saklama süresi:** 90 gün (`LocationRetentionService.cs:11`) iş ve KVKK açısından onaylı mı;
   aydınlatma metnine yazılacak süre nedir? `PrivacyPage.tsx:78` yalnız takip bağlantısı için 7 gün
   der, konum kaydı süresini yazmaz.
3. **Ayna davranışı:** Ayna açıkken takip linki üretiminin engellenmesi istenen davranış mı
   (`MirrorWriteGuard.cs:16`)? Düğme mi gizlensin, uç nokta mı istisna olsun? Aynı listede olmayan
   `/api/driver/location` ayna açıkken yazmaya devam ediyor — bu da istenen mi?
4. **Terim:** Sunucu kimi yerde "Sefer" der, ekranlar "Sevkiyat" (`TrackingService.cs:81`, `:88`);
   terim onayı gelmeden toplu değişiklik yapılmayacak (`AGENTS.md` §6).
5. **Link ömrü:** Teslimden 7 gün (`TrackingService.cs:14`) yeterli mi; iptal edilen sevkiyatta
   linkin anında kapanması (`:108`) müşteri iletişiminde sorun yaratır mı?
6. **Menü:** Haritanın yalnız "Sevkiyat Listesi · Harita" sekmesinden açılması yeterli mi, yoksa
   menüye "Araç Takip" öğesi mi eklensin (`nav.ts:72-114`, `sections.ts:25`)?
7. **Planlanmış sevkiyat:** Konum yalnız `Loaded/OnRoad` iken paylaşılır
   (`TrackingService.cs:117`); "Planned" durumda müşteri haritayı hiç görmez — kabul mü?
8. **Kontrast:** Hesaplanan ≈3,2:1 ve ≈3,8:1 değerleri bir ölçüm aracıyla doğrulanmalı; hedef renk
   seçimi tasarım onayına bağlı.
9. **Rota kırpılması:** Sevkiyat başına 5000 nokta sınırı (`TrackingService.cs:83`) uzun seferde
   yolu eksik çizer; sınır artırılsın mı, örnekleme mi yapılsın?
10. **Bildirim:** Müşteriye "yükünüz yolda" e-postası sunucu e-posta ayarına bağlı
    (`CustomerForm.tsx:144`); canlıda açık olup olmadığı koddan doğrulanamaz.

Sonraki belgeyle bağlantı: `docs/plan/03-SEVKIYATLAR-LISTE.md` sayfa içi "Harita" görünümünü,
`docs/plan/04-SEVKIYAT-FORMU.md` "Takip ve Rota" sekmesini bu belgeye göre kurar;
`docs/plan/28-ORTAK-PARCALAR.md` ortak parçaları, `docs/plan/30-VERI-API.md` ise
`/tracking/vehicles`, `/trips/{id}/route` ve `/public/track/{token}` sözleşmelerini tanımlar.
