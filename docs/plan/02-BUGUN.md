# 02 — Bugün ekranı

## 1. Amaç ve kapsam

"Bugün" ekranı, gün içinde operasyonu yöneten kişinin (operasyon sorumlusu, sahip, muhasebe)
sabah açtığı ilk ekrandır. Amacı tek bakışta şu üç soruya cevap vermektir: **bugün yüklenecek ne
var, yolda ne var, teslim edilen ne oldu**; ardından **bugünkü iş listesini** (iş talepleri ve
sevkiyatlar bir arada) göstermek ve **onay bekleyen** işleri (teslim evrakı, şoför masrafı, fatura
onayı) tek listede toplamak. `docs/KOLAYLASTIRMA-PLANI.md:124-132` bu ekranı "Ana Sayfa yerine"
tanımlar ve sadeleştirme listesini verir.

Kapsam içi: üç rakam şeridi, en fazla iki ince uyarı bandı, sekme çubuğu (Bugün · Gelecek · Geçmiş ·
Hepsi · Onay Bekleyenler), "Bugünkü işler" listesi, liste/kart görünüm seçimi, telefon yerleşimi.

Kapsam dışı: kâr/ciro tabloları, nakit akışı tablosu, araç takip listesi, son faturalar listesi,
kurulum kartı ("Başlarken"), kurulum sihirbazı kartı ve demo verisi uyarısı. Bunların yeni yeri
§3'te tek tek yazılıdır; bu ekranda kalan hiçbiri **kaldırılmaz**, taşınır.

Bu belge kod değiştirmez. `docs/plan/01-ORTAK-SARTNAME.md` §2'deki şablonu ve §3'teki ortak
gerçekleri varsayar; ortak parçaların (`PageShell`, `DetailDrawer`, `FilterBar`) şartnamesi
`docs/plan/28-ORTAK-PARCALAR.md` belgesindedir.

## 2. Bugünkü durum (kod kanıtıyla)

Bugün "Bugün" ve klasik "Ana Sayfa" **aynı dosyadır**: `client/src/pages/DashboardPage.tsx`.
`client/src/pages/TodayPage.tsx` **yoktur**; ayrı bir sayfa §10'da eklenecektir. Sayfa
`useIsNewUi()` (`DashboardPage.tsx:26`) sonucuna göre iki farklı ağaç çizer: yeni görünüm
`DashboardPage.tsx:56-93`, klasik görünüm `DashboardPage.tsx:95-201`. Sekme başlığı da aynı
anahtara bağlıdır: `usePageTitle(isNew ? 'Bugün' : 'Ana Sayfa')` (`DashboardPage.tsx:27`).

**Yeni görünümde bugünkü hâli (`56-93`):**

- Başlık `h1` "Bugün" (`60`) ve altında `longDate()` (`61`). `PageHeader` bu ekranda
  **kullanılmaz**; başlık elle yazılmıştır, bu yüzden `data-ui="new"` başlık eşlemesinden
  (`client/src/components/ui.tsx:112`) ve `HelpTip` gizleme kuralından (`ui.tsx:126`) bağımsızdır.
- Sağda tek düğme: `can('operations')` ise "Sevkiyat Ekle" (`63`), hedefi `/seferler?new=1`.
- `SectionTabs` (`65`) çağrılır; `client/src/lib/sections.ts:11` bölümü yalnız iki sekmeye sahiptir:
  `Bugün` (`/`) ve `İş Talepleri` (`/is-talepleri`). `SectionTabs` aktif olmayan sekmeleri
  `client/src/components/shell/SectionTabs.tsx:23-24` ile aynı sınıflarla çizer (pasif dal `24`).
- Kurulum kartı `66`; `OnboardingCard` `241-258`. Aynı bileşen klasik dalda da çizilir
  (`108-109`); yeni dalda tek kullanımı `66`.
- **Üç rakam** `Figures`/`Figure` ile (`67-71`): "Yüklenmeyi bekleyen" (`data.plannedTripCount`),
  "Yolda / yüklendi" (`data.activeTripCount - data.plannedTripCount`), "Teslim edilen"
  (`data.monthDeliveredCount`, alt yazı "Bu ay"). Üçünde de `onClick` vardır ve `/seferler`
  adresine `?status=Planned`, `?status=OnRoad`, `?status=Delivered` süzgeciyle gider (`68-70`);
  alt yazılar sırasıyla "Planlandı", "Şu an", "Bu ay"dır.
- **İki uyarı bandı** (`72-83`): faturalanmamış teslim sevkiyatı (sarı) ve onay bekleyen şoför
  masrafı (turuncu). İkisi de sunucudan gelen sayı `> 0` koşuluyla çizilir; **fakat `can('accounting')`
  koşulu yalnız birinci bantta vardır (`72`)**, ikinci bantta yoktur (`78`) — bu belge onu bir
  eksik olarak kaydeder, §5 ve §13 bu farkı kapatır. Şerit görünür ama tıklanabilir bir `Link`'tir
  (düğme değil).
- "Bugünkü sevkiyatlar" kartı (`84-88`) `DataTable` ile `data.todayTrips` listesini basar;
  sütunlar `32-38`: Tarih, Müşteri (+`PlateBadge`), Güzergah (yükleme → teslim adresi, `35`),
  Durum (`Badge`), Tutar (`tl`). Satıra tıklayınca `/seferler?id=…` açılır. Boş metin:
  "Bugün için sevkiyat yok." (`87`). Kart başlığındaki "Tüm sevkiyatlar →" düğmesi `/seferler`e
  gider (`85`).
- Demo verisi uyarısı yeni görünümde **tek satır** olarak `89-91`'de durur ve `can('admin')` ile
  `data.setup.sampleData` koşuluna bağlıdır.

**Veri kaynağı:** `useQuery(['dashboard'], '/dashboard')`, `refetchInterval: 60_000`
(`DashboardPage.tsx:25`); uyarılar ayrı sorgu `['alerts']`, `refetchInterval: 5 * 60_000` (`28`).
Sunucu uçları `server/YesLojistik.Api/Controllers/DashboardController.cs:11-20`: `GET /api/dashboard`
(`11-12`), `GET /api/dashboard/alerts` (`14-15`), `GET /api/dashboard/cash-flow` (`19-20`); nakit
akışı üçü içinde tek yetki korumalı olandır ve yalnız `Accounting` ilkesiyle açılır (`18`).
Bugünün sevkiyatları sunucuda
`server/YesLojistik.Infrastructure/Services/DashboardService.cs:54-56` ile seçilir: yükleme tarihi
bugün **veya** teslim tarihi bugün **veya** durum `Loaded`/`OnRoad`, en fazla 50 kayıt, yükleme
tarihine göre sıralı. `activeTripCount`/`plannedTripCount` ise günü değil **durumu** sayar
(`DashboardService.cs:48-49`): `Planned` + `Loaded` + `OnRoad`; teslim edilmiş ve iptal edilmiş
kayıtlar bu iki sayının dışındadır, yani rakamlar bugünle sınırlı değildir; etiketler bunu
yanıstmalıdır. Yanıt alanları istemcide `client/src/api/types.ts:510-532` (`monthDeliveredCount`
`512`, `activeTripCount` `513`, `plannedTripCount` `518`, `todayTrips` `521`) ve sunucuda
`server/YesLojistik.Core/Dtos/DashboardDtos.cs:3` ile eşleşir.

**Bugünkü kalan fazlalıklar (klasik ağaç, `95-201`):** 7 kısayol kutusu `QuickActions`
(`74-80` çağrı, bileşen `338-366`, liste `client/src/lib/quickActions.ts:19-29` ve `main: true`
olan **7** kayıt: İş Talebi, Yeni Sevkiyat, Tahsilat Gir, Taşerona Ödeme, Gider Ekle, Fatura Kes,
Müşteri Ekle), demo uyarısı (`101-106`), `OnboardingCard`/`SetupCard` ikilisi (`108-110`, gövde
`241-258` ve `263-303`), 4 rakamlı "Bu ayın rakamları" (`112-119`), iki uyarı kutusu (`121-138`),
`CashFlowCard` (`140`, gövde `306-327`), "Günlük Sevkiyatlar" + araç takip listeleri (`142-199`),
`TrendChart` (`214-238`) ve `greeting()` (`329-332`, klasik başlık `97`). Bu kutuların hiçbiri yeni
görünüm dalında (`56-93`) yoktur; dalın tamamı üç rakam + iki bant + tek listeden oluşur.

**Telefon:** `client/src/components/Layout.tsx:250-267` alt çubuğu (`BottomBar`, `lg:hidden`) hâlâ
**"Ana Sayfa"** yazar (`255`: `link('/', 'Ana Sayfa', Home, true)`) ve `/` adresine gider; yeni
görünümde de aynı etiketi gösterir, çünkü etiket görünüm anahtarına bağlı değildir. Alt çubuğun
diğer öğeleri Sevkiyat (`256`), ortada "+" düğmesi (`257-262`), Cariler (`263`) ve Menü'dür
(`264-266`).

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Bugün            05.10.2026 Pzt                    [⋯ Diğer] [+ Sevkiyat] │  ≤64px
│ [ Bugün ] Gelecek  Geçmiş  Hepsi  Onay Bekleyenler (2)                    │  ≤44px
│ Yüklenmeyi bekleyen 3 │ Yolda 5 │ Teslim edilen 12 (bu ay)                │  ≤76px
│ ⚠ 3 teslim edilmiş sevkiyat faturalanmadı · 51.000,00 TL  Fatura kes →    │  ≤40px
│ ⚠ 2 şoför masrafı onay bekliyor · 4.300,00 TL            İncele →         │  ≤40px
│ [Liste|Kart]  Bugünkü işler (8)                            [Ara ........] │
│ ┌ tablo ────────────────────────────────────────────────────────────────┐ │
│ │ Tür  Tarih  Müşteri  Güzergâh  Araç/Şoför  Durum  Tutar              │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

Yükseklik bütçesi: başlık + sekmeler + üç rakam + iki bant **≤260px** (ortak kabul ölçütü,
`01-ORTAK-SARTNAME.md:237`). 1440×900'de ilk ekranda **≥12 satır** görünür; bugün aynı listede
3-7 satır görünür (`KOLAYLASTIRMA-PLANI.md:387`), fark tablo üstündeki fazlalıkların kalkmasından
gelir.

**Yeni görünümde neyin nereye gittiği (tek tek):**

| Bugün nerede | Yeni yeri | Kanıt |
|---|---|---|
| 7 kısayol kutusu | **Kaldırılır**; aynı işler üst çubuktaki **+ Yeni** menüsünde (aynı liste) | `KOLAYLASTIRMA-PLANI.md:129`; `client/src/lib/quickActions.ts:19-29` |
| Demo verisi uyarısı (tek satır) | **Yönetici → Veriler** sayfasına taşınır (yalnız admin görür) | `KOLAYLASTIRMA-PLANI.md:131` |
| 4 rakamlı "Bu ayın rakamları" | **Analiz → Genel Bakış** | `DashboardPage.tsx:113-119` |
| Nakit akışı tablosu | **Analiz → Genel Bakış** | `DashboardPage.tsx:140`, `306-327` |
| Günlük Sevkiyatlar + araç sayıları | Bugünkü işler listesi + **Sevkiyatlar / Araçlar** | `DashboardPage.tsx:142-151` (araç rakamları `146-150`) |
| Araç Takip listesi, Son Faturalar | **Araçlar**, **e-Fatura** sayfaları | `DashboardPage.tsx:170-199` (faturalar `193-197`) |
| "Dikkat Edilecekler" (en fazla 5 uyarı) | En fazla **2** bant burada; kalanı bildirim zili | `DashboardPage.tsx:176-192` (`slice(0, 5)` `179-191`, "+N uyarı daha" `191`) |
| "Bu Ay" özet + grafik | **Analiz → Genel Bakış** | `DashboardPage.tsx:152-167` (özet `153-165`, grafik `166`) |
| Kurulum / Başlarken kartı | **kurulum** sonrası yalnız Yönetici'de | `DashboardPage.tsx:66` (yeni dal), `108-110` (klasik dal), gövdeler `241-303` |
| İş Talepleri (ayrı sayfa) | Bu ekranın **sekmesi** (kendi `PageHeader`'ı kalır) | `sections.ts:11`, `JobRequestsPage.tsx:68-72` |

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Sekmeler | bağlantı (`role="tab"`) | — | Bugün `/`, Gelecek `?when=future`, Geçmiş `?when=past`, Hepsi `?when=all`, Onay Bekleyenler `?tab=approvals` | — |
| "Sevkiyat Ekle" | düğme, `write` | — | `/seferler?new=1`; ayna açıkken gizli | — |
| "⋯ Diğer" | menü | — | Sevkiyat Ekle, İş Talebi Aç, Gider Ekle, Tahsilat Gir | — |
| Rakam kutusu (×3) | düğme | — | Süzgeçli listeye gider (`/seferler?status=Planned\|OnRoad\|Delivered`, `DashboardPage.tsx:68-70`) | — |
| Uyarı bandı (×2) | bağlantı | — | Faturalanmamış → `/faturalar/yeni` (`DashboardPage.tsx:73`); masraf → `/giderler?onay=Pending` (`79`) | — |
| Liste/Kart seçimi | radyo grubu | — | Tablo veya kart; seçim `localStorage` `yes.todayView` | — |
| Arama kutusu | metin | — | 250 ms gecikmeli; müşteri, plaka, güzergâh, sevkiyat no | "Kayıt bulunamadı." |
| Satır | bağlantı | — | `/seferler?id=…` sağdan ayrıntı paneli | — |
| Onay düğmesi (toplu) | düğme, `write` | — | Seçili onayları işler; yetki yoksa gizli | "Onaylanacak kayıt seçin." |

Klavye: `N` + Yeni menüsü (mevcut, `Layout.tsx:123-140`; kısayol dinleyicisi `129-139`, alan
içindeyken ve pencere açıkken devre dışı `134-135`), `/` aramaya odak, `Esc` ayrıntı panelini
kapatır, `Ctrl+Enter` onay iletişim kutusunda onaylar (`ui.tsx:191-196`), `Tab` sırası: sekmeler →
rakamlar → bantlar → arama → liste başlıkları.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Yükleniyor:** `Loading` (`ui.tsx:264-266`) yerine bu ekrana özel iskelet: üç rakam kutusu,
  iki bant yerine iki ince çizgi, tabloda 8 gri satır. Yükseklik sıçraması olmaz.
- **Boş:** "Bugün için iş yok." + "Yeni Sevkiyat" düğmesi; uyarı bandı hiç çizilmez.
- **Hata:** `ErrorState` "Tekrar dene" düğmesiyle; rakamlar `—` gösterir, tablo çizilmez.
- **Yetkisiz:** `can('operations')` yoksa "Sevkiyat Ekle" (`63`) ve "⋯ Diğer" gizli; `can('accounting')`
  yoksa **birinci** uyarı bandı (`72`) ve Onay Bekleyenler sekmesi gizli. **İkinci bantta yetki
  koşulu yoktur** (`78`: yalnız `data.pendingExpenseCount > 0`); bugün muhasebe yetkisi olmayan
  kullanıcı da şoför masrafı bandını görür ve tıklayabilir — §10/5 bu koşulu ekler.
- **Ayna:** rakamlar ve liste görünür kalır (alışkanlık bozulmaz; yorum ve kural `DashboardPage.tsx:334-337`;
  `QuickActions` bağlantı yerine `button` çizer `354-356`, uyarı satırı `359-363`); yazma düğmeleri
  `Button write` ile gizlenir (`ui.tsx:29-32`), Onay Bekleyenler'de toplu onay gizlenir ve "Bu kayıt
  pratikortam'a girilir." tek satırı kalır.
- **Lisans:** süre dolduğunda salt okunur; "Sevkiyat Ekle" gizlenir, liste kalır.

## 6. Metinler ve terimler

Başlık **"Bugün"** (klasikte "Ana Sayfa" kalır, `DashboardPage.tsx:27`). Tarih `05.10.2026 Pzt`
biçiminde (`client/src/lib/format.ts:68-69`). Rakam etiketleri: **"Yüklenmeyi bekleyen"**, **"Yolda
/ yüklendi"**, **"Teslim edilen"** (`DashboardPage.tsx:68-70` — üçüncünün alt yazısı **"Bu ay"**,
sunucu değeri aylık toplamdır, `DashboardService.cs:41-42`). Şerit metinleri (`74`, `80`): "3 teslim
edilmiş sevkiyat faturalanmadı · 51.000,00 TL +
KDV", "2 şoför masrafı onay bekliyor · 4.300,00 TL". Liste başlığı **"Bugünkü işler"**. Boş liste:
"Bugün için iş yok." Arama yeri: "Müşteri, plaka, güzergâh…". Onay sekmesi başlığı **"Onay
Bekleyenler"**; alt metin "Toplu onay". Teknik sözcük (ayna, dry-run, token, endpoint, UBL)
ekranda görünmez (`01-ORTAK-SARTNAME.md:76-77`); terimler `docs/TERIMLER.md` ile ve yazıldığında
`docs/plan/32-TERMINOLOJI.md` ile uyumlu tutulur ("Sefer" değil **"Sevkiyat"**). Para `tl()` ile iki
kuruş (`format.ts:4-5`), örnek tutarlar uydurmadır (`01-ORTAK-SARTNAME.md:23-25`).

## 7. Telefon davranışı (390×844)

Tek sütun: başlık → sekmeler (yatay kaydırmalı, sekme başına ≥44px dokunma) → üç rakam **tek satır
kutu** olarak alt alta (kutu yüksekliği ≥56px) → en fazla iki bant tam genişlik → arama tam genişlik
→ **kart görünümü** (varsayılan; tablo yatay kaydırmaz). Alt çubuk (`Layout.tsx:250-267`) sabit
kalır (`lg:hidden`), ilk öğenin etiketi "Ana Sayfa" yerine **"Bugün"** olur; bugün etiket sabittir
(`Layout.tsx:255`) ve görünüm anahtarına bakmaz. Sekme çubuğu ve liste kartları yatay kaydırma
üretmez; `client/e2e/mobile.spec.ts:12-14` kuralı korunur (`01-ORTAK-SARTNAME.md:238`). Mevcut
mobil proje 375×812'dir (`client/playwright.config.ts:20`); 390×844 ölçütü ayrıca doğrulanır.

## 8. Erişilebilirlik ve klavye

Başlık `h1` "Bugün" (yeni dalda elle yazılır, `DashboardPage.tsx:60`; ileride `PageHeader`'a
geçilirse `ui.tsx:125`), sekmeler `nav aria-label="Bölüm sekmeleri"` (`SectionTabs.tsx:17`) +
`role="tablist"` (`18`) + `role="tab"`/`aria-selected` (`22`). Rakam kutuları `onClick` alınca
`button` olur ve erişilebilir adı etiket + değerden gelir (`ui.tsx:327-338`; `button` dalı `335-337`,
erişilebilir ad parçaları `330-332`). Uyarı bantlarında bugün `role="status"` **yoktur** (klasik demo uyarısı
`DashboardPage.tsx:102` bunu kullanır, sarı fatura bandı `73` ve turuncu masraf bandı `79`
kullanmaz); yeni ekranda iki banda da eklenmelidir. Her durum rozeti
**renk + metin** birlikte (`Badge`, `ui.tsx:70-77`; renk karesi `aria-hidden`, `74`); satırda en
fazla bir durum rozeti. Odak halkası `:focus-visible` (`client/src/index.css:102`), dokunma hedefi
≥44px, tablo başlıkları `th` (`.th` sınıfı, `client/src/index.css:119`).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/new-ui/basics.spec.ts:10` yeni görünümde "Bugün" başlığını doğrular;
`client/e2e/helpers.ts:14` giriş sonrası başlık kalıbını (`/Günaydın|İyi (günler|akşamlar|geceler)|^Bugün$/`)
kabul eder; `helpers.ts:44-46` `useNewUi` (localStorage `yes.uiMode='new'`). Bugünkü toplam:
19 spec dosyası, **53** e2e testi; yeni görünüm spec'leri `basics.spec.ts` (3),
`cari-invoice.spec.ts` (2), `trip-copies.spec.ts` (1). Eklenecek senaryolar (aynı dosya ailesi,
`useNewUi` ile):

1. Üç rakam ve en fazla iki bant görünür; klasik ana sayfadaki "Bu ayın rakamları" başlığı
   **yok** (bugünkü klasik başlık `DashboardPage.tsx:113`).
2. "Gelecek" sekmesine tıklanınca adres `?when=future` olur ve sekme `aria-selected` alır
   (`?when=` bugün `TripsPage.tsx:47-58` süzgeçlerinde **yoktur**, §10/6 ile eklenecek).
3. "Onay Bekleyenler" sekmesi muhasebe yetkili kullanıcıda görünür, yetkisiz kullanıcıda
   görünmez (sekme `sections.ts:11`'de bugün yok; yetki süzmesi `SectionTabs.tsx:14` deseniyle).
4. Boş veri: "Bugün için iş yok." metni ve devre dışı bant yokluğu (bugünkü boş metin
   `DashboardPage.tsx:87` "Bugün için sevkiyat yok.").
5. Telefon: `client/playwright.config.ts:20` mobil projesi **375×812** kullanır; ölçüt
   390×844 için de sağlanır (iki genişlikte de `document.documentElement.scrollWidth` ≤ genişlik,
   mevcut kural `client/e2e/mobile.spec.ts:12-14`).

Sunucu tarafında iki birim/entegrasyon testi: (a) `/api/dashboard` bugünün sevkiyatlarını yükleme,
teslim ve yolda ölçütleriyle döndürür (`DashboardService.cs:54-56` ölçütleri); (b) `?when=past` için
liste ucu doğru süzer. Test silme, atlama ve `skip` yasaktır (`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **`client/src/pages/TodayPage.tsx` (yeni).** Bugün ekranını `DashboardPage`'den ayır: üç rakam,
   iki bant, sekmeler, liste. Klasik `DashboardPage` aynen kalır. *2-3 saat.*
   Doğrulama: `cd client && npm run build` + `npx playwright test e2e/new-ui`.
2. **`client/src/lib/todayTabs.ts` (yeni).** Sekme tanımları (`when` çözümleme, adres → durum).
   *2 saat.* Doğrulama: `cd client && npm run lint`.
3. **`client/src/App.tsx`.** `/` rotasını (bugün `86`: `<Route index element={<DashboardPage />} />`)
   `useIsNewUi()` ile ikiye ayır (yeni → `TodayPage`, klasik → `DashboardPage`). *1 saat.* Doğrulama:
   `npx playwright test e2e/new-ui/basics.spec.ts`.
4. **`client/src/lib/sections.ts:11`.** `bugun` bölümüne `Gelecek`, `Geçmiş`, `Hepsi`, `Onay
   Bekleyenler` sekmelerini ekle (adresler `?when=…`, `?tab=approvals`). Bugün bu bölümde yalnız
   `Bugün` ve `İş Talepleri` vardır ve sekme çizimi `SectionTabs.tsx:15` gereği en az iki sekme
   ister. *2 saat.* Doğrulama: `npx playwright test e2e/new-ui`.
5. **`client/src/pages/DashboardPage.tsx:67-93`.** Üç rakam etiketlerini netleştir ("Yolda /
   yüklendi", "Teslim edilen · bu ay"), bantları "en fazla 2" kuralına bağla ve ikinci banda
   `can('accounting')` koşulunu ekle (`78`), eski kartları yeni görünüm dalından çıkar.
   *3 saat.* Doğrulama: `cd client && npm run build`.
6. **`client/src/pages/TripsPage.tsx`.** `?when=` parametresini tarih süzgecine bağla (Bugün /
   Gelecek / Geçmiş / Hepsi); süzgeçler bugün `47-58` aralığında adresten okunur, `when` bunların
   arasında **yoktur**. *3-4 saat.* Doğrulama: `npx playwright test e2e/trips.spec.ts`.
7. **İş talepleri listesi.** `client/src/pages/JobRequestsPage.tsx:35-37` sorgusuna (`status`,
   `from`, `to` alanları bugün burada) `when` parametresini ekle; `from`/`to` alanları bugüne göre
   hesaplanır (`27-28`, tarih kutuları `78-79`). *2-3 saat.*
   Doğrulama: `npx playwright test e2e/quick-add.spec.ts`.
8. **Onay Bekleyenler.** `client/src/api/types.ts` + `Dashboard` yanıtına (`510-531`) onay sayaçları
   ekle; sunucuda `server/YesLojistik.Api/Controllers/DashboardController.cs` altına
   `GET /api/dashboard/approvals` ucu yaz (yetki deseni için `18`). *1 gün.* Doğrulama:
   `cd server && dotnet test`.
9. **`client/src/components/Layout.tsx:255`.** Telefon alt çubuğunun ilk etiketini yeni görünümde
   "Bugün" yap. *1 saat.* Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
10. **`client/src/components/ui.tsx` / sayfa iskeleti.** `PageHeader` + iskelet kullanımına geçir
    (ortak parçalar `docs/plan/28-ORTAK-PARCALAR.md` bitince). *2-3 saat.* Doğrulama:
    `cd client && npm run lint && npm run build`.
11. **e2e + sunucu testleri.** §9'daki 5 senaryo ve 2 sunucu testi. *1 gün.* Doğrulama:
    `npx playwright test` ve `cd server && dotnet test`.
12. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`,
    `docs/KOLAYLASTIRMA-PLANI.md:387` (F2 durumu). *1 saat.* Doğrulama: `git diff --stat`.

Toplam tahmin: **4-5 iş günü** (11 adım kod, 1 adım belge). Her adım sonunda
`01-ORTAK-SARTNAME.md:29-31` kuralı: testler → commit → `git pull --rebase origin main` → push.

## 11. Kabul ölçütü

1. 1440×900'de başlıktan tablo başlığına kadar yükseklik **≤260px** (ölçüm: tarayıcıda
   `document.querySelector('table thead')?.getBoundingClientRect().top`).
2. Aynı ekranda **≥12 satır** görünür.
3. Ekranda en fazla **3 rakam** ve en fazla **2 bilgi bandı** vardır (metin sayımı ile
   doğrulanır); klasik ana sayfadan taşınan kart sayısı **0**.
4. Bugünkü sevkiyatları görmek **1 tık** (`KOLAYLASTIRMA-PLANI.md:254`): "Bugün" menüsüne tıkla →
   liste görünür.
5. "Gelecek" ve "Onay Bekleyenler" sekmeleri **1 tıkla** açılır ve adres parametresi değişir.
6. 390×844'te yatay kaydırma yok (`scrollWidth` ≤ 390) ve tüm dokunma hedefleri ≥44px.
7. Yeni e2e testi **≥5**, yeni sunucu testi **≥2**; toplam e2e test sayısı bugünkü **53**'ün altına
   düşmez (`01-ORTAK-SARTNAME.md:173`; sayım: 19 spec dosyası, `client/e2e`).
8. Ekranda teknik sözcük yok; tüm tutarlar `tl()` ile iki kuruş (`client/src/lib/format.ts:4-5`),
   tarih `05.10.2026 Pzt` (`format.ts:68-69`).

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Klasik görünüm bozulur | `DashboardPage` klasik dalı (`95-201`) olduğu gibi kalır; yeni ekran ayrı dosyada | `App.tsx` rotasını (`86`) klasik dala çevir |
| Görünüm anahtarı karışıklığı | `DEFAULT_UI_MODE = 'classic'` (`client/src/lib/uiMode.ts:8`) korunur | `yes.uiMode` anahtarını sil (`uiMode.ts:9`) |
| Uyarı bandı sayısı fark edilmeden artar | Bantlar tek yardımcı bileşenden çizilir, `slice(0, 2)` | Bant bileşenini eski hâline al |
| Yeni ikinci bant yetki denetimsiz kalır | Bugünkü masraf bandında `can('accounting')` yok (`DashboardPage.tsx:78`); adım 10/5 bunu ekler | Bant `Link`'ini kaldır |
| Onay ucu yeni olduğu için yetki açığı | Uç `Accounting` ilkesiyle korunur (`DashboardController.cs:18` örneği) | Ucu kapat, sekmeyi gizle |
| Sorgu yükü artar | Bugün sorgusu 50 kayıtla sınırlı (`DashboardService.cs:56`, `Take(50)`) | `Take(50)` değerini düşür |
| e2e testleri klasik görünümü bekliyor | Yeni testler `useNewUi` ile (`client/e2e/helpers.ts:44-46`); klasik senaryolar dokunulmaz | Yeni spec dosyasını geri al |

## 13. Doğrulanacaklar

- "Teslim edilen" rakamı bugünü mü yoksa ayı mı göstermeli? Kod bugün **aylık** toplamı verir
  (`DashboardService.cs:42`, `monthDelivered`); ürün kararı kullanıcıya sorulmalı.
- "Yolda / yüklendi" farkı (`activeTripCount - plannedTripCount`) günü değil durumu sayar ve
  teslim edilmişleri dışarıda bırakır (`DashboardService.cs:48-49`); bugüne indirgenecek mi?
- Onay Bekleyenler'de hangi onay türleri olacak (teslim evrakı, şoför masrafı, fatura onayı) ve
  toplu onay yetkisi hangi rol olacak? Bugün üç ayrı ekranda yaşıyor.
- "⋯ Diğer" menüsü bu ekranda gerçekten gerekli mi, yoksa tek düğme yeterli mi?
- Kurulum kartı (`OnboardingCard`, tanım `DashboardPage.tsx:241-258`) yeni görünümde (`66`) hiç
  görünmemeli mi, yoksa yalnız ilk girişte mi?
- Telefon alt çubuğundaki "Ana Sayfa" etiketinin (`Layout.tsx:255`) değişmesi terim onayına bağlı
  (`AGENTS.md` §6: terim tablosu onayı bekliyor; bugünkü karşılığı `docs/TERIMLER.md`).
- `?when=` parametresinin Sevkiyatlar listesindeki mevcut `status` süzgeciyle (`TripsPage.tsx:47-58`)
  çakışmadan çalışması; süzgeç çipi davranışı `docs/plan/03-SEVKIYATLAR-LISTE.md` ile birlikte
  doğrulanmalı.
- `docs/plan/28-ORTAK-PARCALAR.md`, `03-SEVKIYATLAR-LISTE.md` ve `32-TERMINOLOJI.md` **henüz
  yazılmadı** (bugün `docs/plan/` altında yalnız `00`–`08` var); bu belge o üç belgeye ileriye dönük
  atıf yapar. `PageShell`/`DetailDrawer` da kodda yoktur (bkz. `01-ORTAK-SARTNAME.md:143-146`).

---

Sonraki belgeyle bağlantı: `03-SEVKIYATLAR-LISTE.md` (yazılacak) bu ekrandaki satır tıklamasını ve
`?when=` süzgecini devralır; `28-ORTAK-PARCALAR.md` (yazılacak) `PageShell`/`FilterBar`/`DetailDrawer`
parçalarını, `32-TERMINOLOJI.md` (yazılacak) ise bu ekrandaki metinleri kesinleştirir.
