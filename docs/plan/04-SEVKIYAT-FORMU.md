# 04 — Sevkiyat ekle/düzenle/kopyala formu

## 1. Amaç ve kapsam

Bu ekran panelin **1 numaralı işini** karşılar (`01-ORTAK-SARTNAME.md` §5): yeni sevkiyat girmek. Bugün bu
iş tek pencerede yapılıyor ama pencere üç numaralı bölüm + iki katlanır bölümden oluşuyor ve 1440×900'de
hepsi birden görünmüyor. Hedef: **zorunlu alanlar üstte iki sütunda**, geri kalan her şey **tek bir
"Diğer bilgiler" katmanında**; kullanıcı kaydı en az kaydırmayla bitirir.

Kapsam: sevkiyat **ekle** (`client/src/pages/TripsPage.tsx:349`), **düzenle** (`:246`, satıra tıklama `:413`)
ve **kopyala** (`:247`); **kopya sayısı 1–20** + **"Kaydettikten sonra formu açık tut"**
(`TripForm.tsx:153-156`); **güzergâh fiyat önerisi** (`:464-474`); **kayıtlı adres hapları** (`:615-629`);
**dolu araç uyarısı** (`:422-427`); **Ctrl+Enter ile kaydet** (`components/ui.tsx:192-196`).

Kapsam dışı: sevkiyat listesi/süzgeçleri (`03-SEVKIYATLAR-LISTE.md`), iş talebinden sevkiyat üretme
(`TripsPage.tsx:439-458`), U-ETDS gönderimi (bugün yalnız hazırlık kontrolü var, `docs/UETDS.md`),
şoför mobil formları, e-Fatura kesme (`05-E-FATURA.md`).

## 2. Bugünkü durum (kod kanıtıyla)

**Pencere:** Formun kendi rotası yok; bir `Modal` içinde yaşıyor (`TripForm.tsx:289`): başlık "Sevkiyat
Oluştur"/"Sevkiyat Düzenle"/"Sevkiyat Oluştur (kopya)", `size="lg"` → masaüstünde `sm:max-w-4xl`
(`ui.tsx:207`) = 56 rem; taban yazı 17,5 px olduğu için (`index.css:91`) ~980 px. Gövde `px-5 py-5`
(`ui.tsx:220`), pencere `max-h-[95vh]` (`ui.tsx:214`); bu yüzden bugün içerik kaydırılıyor.

**Üç bölüm:** "Müşteri ve güzergâh" (`:360`), "Araç ve şoför" (`:415`), "Fiyat" (`:448`). Her biri
`md:grid-cols-2` (`:361`, `:416`, `:449`), yani pencere içi zaten iki sütun.

**İki katlanır bölüm:** "Komisyon, şoför primi, ek masraf" (`:484`) ve "Ayrıntılar: yük, belgeler,
yetkililer, not" (`:489`); ikincisinin içinde beş alt grup var: Yük (`:490`), Belgeler (`:517`),
Yetkililer ve not (`:531`), U-ETDS hazırlığı (`:541`), Konum (`:545`). `MoreFields` kapalıyken içeriği
`hidden` tutar (`Inputs.tsx:189-202`), yani alanlar formdan düşmez.

**Zorunlu alanlar:** müşteri (`:362`), yükleme adresi (`:386`), teslimat adresi (`:395`), yükleme tarihi
(`:401`), araç (`:417`), şoför (`:429`), araç maliyeti (`:452`), satış fiyatı (`:458`). Şemada gerçekten
zorunlu olanlar `:51-80`: `customerId`, `vehicleId`, `driverId`, `loadingAddress`, `deliveryAddress`,
`loadingDate`; teslim tarihi yükleme tarihinden küçük olamaz (`:78-80`). Sunucu aynı çekirdeği doğrular
(`server/YesLojistik.Core/Validation/Validators.cs:233-241`); iki tutar `Amount()` kuralına tabidir:
negatif olamaz, 1 milyardan küçük olmalı, en fazla 2 ondalık (`Validators.cs:17-20`; uygulama `:240-241`).

**Fiyat önerisi:** `/trips/hints` ucundan gelir (`:219-224`), yalnız iki il doluyken görünür (`:252`) ve
"son 1 yılda N sevkiyat, ortalama satış/maliyet, son fiyatlar" yazar; tek düğme iki tutarı doldurur
(`:465-473`). Sunucu: `TripsController.cs:89-90`, `TripService.HintsAsync` (`TripService.cs:167-207`),
çıktı `TripRouteHint` (`TripDtos.cs:101`).

**Adres hapları:** `AddressChips` en çok 4 adres gösterir (`:621`); tıklayınca adres, il ve yetkili dolar
(`:247-251`). **Dolu araç uyarısı:** araç `Available` değilse ve bu sevkiyatın aracı değilse uyarı çıkar
(`:253`, `:422-427`); kaydı engellemez.

**Kopya ve açık tut:** durum `:153-155`, sayı 1–20'ye kırpılır (`:156`), kaydetme döngüsü `:162`,
başarı metni `:166`, form açık kalırsa müşteri + tarihler kalır gerisi boşalır (`:169-176`).

**Kolaylıklar:** araç seçilince varsayılan şoför gelir (`:255-273`); düzenleme/kopyada dolu katlanır bölüm
açık gelir (`:275-278`); hata varsa ilgili bölüm açılır (`:283-285` → `hasError`, `:484`, `:489`; eşik
`Inputs.tsx:191`); tutar okunuşu `AmountInput` (`Inputs.tsx:26-51`), tarih hapları `DateQuick`
(`Inputs.tsx:80-111`), marj özeti `MarginSummary` (`:482`).

**Kaydetme yolları:** alt düğme (`:315`), gizli `submit` (`:549`) ve `Modal`'ın yakaladığı Ctrl+Enter
(`ui.tsx:192-196`); kirli formda kapatma onayı `ui.tsx:222-227`. Yeni görünüm anahtarı bugün yalnız listeyi
etkiliyor (`TripsPage.tsx:89`); form iki görünümde aynı — bu belge farkı kapatır.

## 3. Hedef yerleşim

Yeni görünümde pencere `size="xl"` (`ui.tsx:207`) olur: 1440×900'de iç genişlik ~1216 px, iki sütun
2×600 px.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sevkiyat Oluştur                                       [Kaydetmeden kapat]│
├──────────────────────────────────────────────────────────────────────┤
│ MÜŞTERİ · GÜZERGÂH · FİYAT (zorunlu)                                 │
│ ┌─ sol ─────────────────────────┐ ┌─ sağ ───────────────────────────┐│
│ │ Müşteri          [ara ▾]      │ │ Araç             [plaka ▾]      ││
│ │ Yükleme İli [İl▾] Adres [....]│ │ ⚠ Bu araç şu an yolda           ││
│ │ Kayıtlı: (Tuzla OSB)(Gebze)   │ │ Şoför            [ara ▾]        ││
│ │ Teslim İli  [İl▾] Adres [....]│ │ Araç Maliyeti (TL)  [₺ 12.500]  ││
│ │ Kayıtlı: (Balçova)            │ │ KDV [%20▾]  Tevkifat [yok ▾]    ││
│ │ Yükleme Tarihi [03.10.2026]   │ │ Satış Fiyatı (TL)   [₺ 17.000]  ││
│ │ [Bugün][Dün][Yarın]           │ │ KDV [%20▾]  Tevkifat [2/10▾]    ││
│ │ Teslim Tarihi [+1gün][+2gün]  │ │ Kâr 4.500 · Marj %26,5          ││
│ └───────────────────────────────┘ └─────────────────────────────────┘│
│ Güzergâh önerisi: İstanbul → İzmir · son 1 yılda 9 sevkiyat          │
│ Ortalama satış 16.400,00 TL / maliyet 11.900,00 TL [Son fiyatları kullan]│
├──────────────────────────────────────────────────────────────────────┤
│ ▸ Diğer bilgiler (isteğe bağlı): yük, belgeler, komisyon, notlar      │
├──────────────────────────────────────────────────────────────────────┤
│ [x] Kaydettikten sonra formu açık tut    Kopya sayısı [ 2 ]          │
│                                        [Vazgeç] [2 sevkiyat kaydet]  │
└──────────────────────────────────────────────────────────────────────┘
```

Ölçüler (taban yazı 17,5 px, `index.css:91`): sütun arası `gap-4` ≈ 17,5 px (`:361`), alan yüksekliği
`.input min-h-10` ≈ 43,75 px (`index.css:111`), düğme `min-h-9` ≈ 39,4 px (`ui.tsx:36`), etiket
`text-[0.6875rem]` ≈ 12 px büyük harf (`Inputs.tsx:171`), tutar kutusu `text-lg` tablosal rakam
(`Inputs.tsx:38`). Zorunlu blok 1440×900'de **≤520 px** olmalı; öneri şeridi ve alt çubukla kaydırmasız
görünür. Bugün üç bölüm art arda kaydırma gerektiriyor (ölçüm §11.2).

Kurallar: (1) zorunlu alanlar hiçbir katlanır bölümün içinde değil; (2) iki `MoreFields` tek düğmede
birleşir, iç sıra Yük → Belgeler → Komisyon/primi → Yetkililer ve not → Konum → U-ETDS; (3) uyarılar
alanın altında (dolu araç `:422-427`, risk limiti `:368-372`); (4) güzergâh önerisi iki sütunun altında
tam genişlikte; (5) alt çubuk sabit — kopya ve "açık tut" solda, düğmeler sağda (`:301-316`).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış · hata metni |
|---|---|---|---|
| Müşteri | aranabilir seçim | evet | yaz–seç; "Yeni müşteri olarak ekle" (`:365`); hata "Müşteri seçin." (`:52`) |
| İl + Adres (yükleme/teslim) | il seçimi + metin | adres evet | il solda 2/5 oranında (`:384-389`, `:392-400`); hata "Yükleme adresi zorunlu." (`:55`) |
| Kayıtlı adres hapları | düğme (≤4) | — | adres + il + yetkili doldurur (`:247-251`) |
| Tarihler | tarih + hazır haplar | yükleme evet | Bugün/Dün/Yarın ve +1/+2/+3 gün (`Inputs.tsx:84-88`); teslim < yükleme olamaz (`TripForm.tsx:79`) |
| Araç | aranabilir seçim | evet | seçince varsayılan şoför gelir (`:255-273`) |
| Dolu araç uyarısı | `role="alert"` | — | yolda/bakımda ise sarı şerit, kayıt sürer (`:422-427`) |
| Şoför | aranabilir seçim | evet | "Yeni şoför olarak ekle" (`:430`) → "Hızlı şoför ekle" penceresi (`:552`, başlık `:580`); hata "Şoför seçin." (`:54`) |
| Taşeron | aranabilir seçim | kiralıkta evet | kiralık araçta ya da sevkiyatta taşeron varsa görünür (`:286`, `:436-445`) |
| Araç Maliyeti / Satış Fiyatı | tutar kutusu | işaretli | okunuş altta, KDV/tevkifat hemen altında (`:451-462`); fatura kesilmişse satış kilitli (`:459`) |
| Kâr / Marj özeti | salt okunur | — | satış − maliyet ve marj yüzdesi (`:482`) |
| Güzergâh önerisi | şerit + düğme | — | "Son fiyatları kullan" iki tutarı doldurur (`:472`) |
| Diğer bilgiler | katlanır düğme | — | hata varsa açık gelir (`Inputs.tsx:191`) |
| Yük cinsi hapları | düğme (≤6) | — | son kullanılanlar + varsayılan liste (`:495`) |
| Formu açık tut | onay kutusu | — | `localStorage yes.tripKeepOpen` (`:154-155`) |
| Kopya sayısı | sayı 1–20 | — | dışı kırpılır (`:156`) |
| Kaydet | birincil düğme | — | metin kopya sayısına göre (`:315`); sunucu hatası alan altında (`:178`) |
| Vazgeç / Kapat | ikincil | — | kirliyse "Kaydedilmemiş değişiklikler var" (`ui.tsx:224`) |
| Kopyala / Sevk Belgesi / Sil | ikincil | — | yalnız düzenlemede (`:293-298`); fatura kesilmişse Sil gizli (`:293`) |

Klavye: **Ctrl+Enter** (Mac Cmd+Enter) kaydeder (`ui.tsx:193-196`); **Esc** kirliyse onay ister; seçim
kutularında **↑↓** gezer, **Enter** seçer, **Tab** vurgulanana geçer (`FormSelect.tsx:74-92`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** müşteri listesi boşsa "Henüz müşteri yok — önce müşteri ekleyin →" (`:366`), aynısı araç için (`:421`).
- **Yükleniyor:** son sevkiyat (`:373`) ve güzergâh (`:464`) şeritleri veri gelene kadar çizilmez; marj
  özeti her zaman çizilir, boşken 0,00 TL gösterir (`:475-483`, `TripTermsFields.tsx:190-201`). Alanlar
  hemen kullanılabilir.
- **Hata:** kaydetme hatası alan adıyla eşlenir (`applyServerErrors`, `:178`); eşlenmeyen hata bildirim olur.
- **Yetkisiz:** formu yalnız `operations` yetkisi açar (`TripsPage.tsx:349`); yetkisi olmayan satıra
  tıklayınca düzenleme açılmaz (`:413`).
- **Ayna:** `Button write` ayna açıkken çizilmez (`ui.tsx:32`). Formda bugün yalnız "Hızlı şoför ekle" →
  "Ekle" `write` taşır (`TripForm.tsx:581`); Kaydet (`:315`), Kopyala (`:298`), Sil (`:294`) görünür kalır,
  yazmayı sunucudaki `MirrorWriteGuard` reddeder (`MirrorWriteGuard.cs:12-25`). Sağlayıcı `Layout.tsx:115`.
- **Lisans:** süre dolduğunda sunucu GET dışı istekleri 403 ile reddeder (`LicenseGuard.cs:22-41`); istemcide
  Kaydet pasif olmaz, üstte `LicenseBanner` şeridi çıkar (`LicenseBanner.tsx:7-21`, `Layout.tsx:107`).
  Ayrıntı `docs/LISANS.md`.
- **Faturalanmış:** sarı şerit "Bu sevkiyat … faturaya bağlı. Müşteri ve satış fiyatı değiştirilemez."
  (`:354-358`), müşteri ve satış fiyatı kilitli (`:363`, `:459`).

## 6. Metinler ve terimler

Görünecek metinler: "Sevkiyat Oluştur", "Sevkiyat Düzenle", "Sevkiyat Oluştur (kopya)", "Kaydet",
"3 sevkiyat kaydet", "Vazgeç", "Kopyala", "Sevk Belgesi", "Sevkiyatı Sil", "Kaydettikten sonra formu
açık tut", "Kopya sayısı", "Diğer bilgiler (isteğe bağlı)", "Güzergâh önerisi", "Son fiyatları kullan",
"Kayıtlı:", "Aynısını doldur". Yasak sözcükler (`01-ORTAK-SARTNAME.md` §2.6) ekranda görünmez: "ayna",
"dry-run", "token", "endpoint", "UBL". `docs/TERIMLER.md` onayı beklediğinden bu belge **metin
değişikliği önermez**, yalnız yerleşimi değiştirir.

## 7. Telefon davranışı (390×844)

Pencere tam ekran ve alttan açılır (`ui.tsx:212`); gövde dikey kaydırılır, **yatay kaydırma olmaz**
(`mobile.spec.ts:12-14` bugün yalnız sayfaları denetler; pencere içi ölçüm §9'daki yeni testin işi). İki
sütun 768 px altında tek sütuna iner; sıra: müşteri → yükleme → teslim → tarihler → araç → şoför → tutarlar.
Adres hapları satır başına 2'yi geçmez. Alt çubuk ekran altına yapışır, "Kaydet" tam genişlik, dokunma
hedefi ≥44 px (bugün `.input min-h-10` ≈ 43,75 px, `index.css:111`). Tutar kutuları `inputMode="decimal"`
(`Inputs.tsx:37`), tarih kutuları yerel seçici açar (`Inputs.tsx:91`). Öneri şeridi sütun altına iner,
düğmesi tam genişlik olur.

## 8. Erişilebilirlik ve klavye

Uyarılar `role="alert"` (`:369`, `:423`). Katlanır düğmede `aria-expanded` (`Inputs.tsx:194`), listelerde
`role="listbox"` (`FormSelect.tsx:115`) + `aria-activedescendant` (`FormSelect.tsx:99`). Odak sırası görsel sırayla aynı:
müşteri → yükleme → teslim → tarihler → araç → şoför → tutarlar → "Diğer bilgiler" → alt çubuk. Yardımcı
haplar `tabIndex={-1}` ile Tab sırasına girmez (`:44`, `Inputs.tsx:96`), çünkü aynı değer elle yazılabilir.
`:focus-visible` halkası `client/src/index.css:102-106`; uyarılar yalnız renkle değil metinle anlatılır.
`Modal` açılınca ilk uygun alana odaklanır (`ui.tsx:175-182`), Esc yalnız en üstteki pencereyi kapatır
(`ui.tsx:186-191`), zorunlu yıldızı `title="Zorunlu alan"` taşır (`ui.tsx:143`).

## 9. Testler (e2e + birim)

Bugün toplam **53 e2e testi** (`client/e2e` altında 53 `test(...)`; `00-DIZIN.md` de aynı sayıyı yazar).
Formla ilgili olanlar: `client/e2e/new-ui/trip-copies.spec.ts` (tek test 4-39; kopya + açık tut denetimleri
23-38), `workflow.spec.ts` (oluşturma 47-57, düzenleme 127-135, kopya 147-167), `forms.spec.ts`
(klavye/seçim 4-39, katlanır bölüm ve KDV özeti 41-60, pencere davranışı ve Ctrl+Enter 62-94 — Ctrl+Enter
testi müşteri penceresinde), `uetds.spec.ts` (panel 7-60, form alanları 62-91). Sunucu: `TripHintsTests.cs`
(29-39).

Eklenecek testler (`client/e2e/new-ui/trip-form.spec.ts`, `useNewUi(page)` yardımcısı
`client/e2e/helpers.ts:44-46`):

1. İki sütun: müşteri ve araç kutularının `boundingBox().y` değeri eşit; 390×844'te aynı iki kutu alt alta
   iner ve pencerede yatay kaydırma olmaz.
2. Fiyat önerisi: iki il seçilince "Son fiyatları kullan" iki tutarı doldurur.
3. Dolu araç: yoldaki araçta sarı uyarı görünür, kayıt yine başarılı olur.
4. Ctrl+Enter: form doldurulup `Control+Enter` ile kaydedilir.
5. "Diğer bilgiler" kapalıyken kaydetme çalışır (gizli alanlar formdan düşmez).
6. Klavye sırası: Tab müşteriden yükleme adresine gider, hap düğmelerine uğramaz.
7. Kayıtlı adres hapı adres + il + yetkili alanlarını doldurur.
8. Kopya sınırı: 21 yazılınca değer 20 olur, düğme "20 sevkiyat kaydet" der.

Plaka doğrulaması (`VehicleForm.tsx:21`, zod `regex`) ve tutar ayrıştırma (`lib/amountWords.ts`) kodda var;
ancak istemcide **birim testi altyapısı yok** (`client/package.json` yalnız `lint`, `build`, `test:e2e`
betiklerini tanımlar; `client/src` altında `*.test.ts` yok), bu yüzden ikisi de bugün yalnız e2e ile
dolaylı korunuyor. Test silme/atlama yasak (`01-ORTAK-SARTNAME.md` §3.6).

## 10. Uygulama adımları (dosya:satır, sırayla)

Her adımdan sonra: `cd client && npm run lint && npm run build`.

1. **`TripForm.tsx:359-550`** — Gövdeyi `grid gap-6 lg:grid-cols-2` ile iki sütuna al; sol müşteri/
   güzergâh/tarihler, sağ araç/şoför/tutarlar. Bölüm numaralarını kaldır. **5 saat.** Doğrulama:
   `npx playwright test new-ui/trip-copies.spec.ts`.
2. **`TripForm.tsx:484-548`** — İki `MoreFields`'ı tek "Diğer bilgiler" düğmesine indir; alt sırayı
   sabitle, hata bayraklarını (`:283-285`) birleştir. **3 saat.** Doğrulama:
   `npx playwright test forms.spec.ts uetds.spec.ts`.
3. **`TripForm.tsx:289`** — `size="lg"` → `size="xl"`; 390×844'te tek sütun kaldığını doğrula. **1 saat.**
   Doğrulama: `npx playwright test mobile.spec.ts` (sayfa genişliği) + §9'daki `new-ui/trip-form.spec.ts`
   1. testi (390×844'te pencere içi tek sütun ve yatay kaydırma yok).
4. **`TripForm.tsx:464-474`** — Öneri şeridini iki sütunun altına, tam genişliğe taşı; telefonda düğme
   tam genişlik. **2 saat.**
5. **`TripForm.tsx:301-316`** — Alt çubuk düzeni: kopya 1–20 (`:156`) ve "açık tut" solda, düğmeler
   sağda; 20 kırpmasında düğme metni güncellenir. **2 saat.**
6. **`client/src/index.css`** — Yeni düzen kurallarını `html[data-ui="new"]` altında yaz (ayrıntı
   `29-GORSEL-SISTEM.md`; belge **henüz yazılmadı**, sırada: `00-DIZIN.md:69`; bugün `index.css` içinde
   `data-ui` seçicisi yok — 0 eşleşme). **2 saat.** Doğrulama: `npm run lint && npm run build`.
7. **`client/e2e/new-ui/trip-form.spec.ts`** — §9'daki 8 testi yaz. **5 saat.** Doğrulama:
   `npx playwright test new-ui`.
8. **`TripForm.tsx:422-427`** — Dolu araç uyarısını araç kutusunun altına sabitle, metni sadeleştir.
   **1 saat.**
9. **Doküman** — `docs/GELISTIRME-PLANI.md`, `docs/KOLAYLASTIRMA-UYGULAMA.md` ve
   `docs/TASARIM-OTOYOL.md` durum satırlarını güncelle. **1 saat.**
10. **Sunucu** — değişiklik yok; `cd server && dotnet test` ile 311 testin yeşil kaldığını doğrula.
    **0,5 saat.**

Toplam **~22,5 saat (≈3 iş günü)**.

## 11. Kabul ölçütü

1. Yeni sevkiyat girişi fare ile **en çok 12 tık** (müşteri → araç → şoför otomatik → iki il → iki adres
   → iki tarih hapı → iki tutar → Kaydet).
2. 1440×900'de zorunlu blok **≤520 px**; öneri şeridi ve alt çubukla birlikte kaydırmasız görünür
   (`dialog.scrollHeight - dialog.clientHeight === 0` zorunlu blokta).
3. Zorunlu alan **8**, katlanır bölüm **1**, bölüm başlığı **2**.
4. Ctrl+Enter tek basışta kaydeder, bildirim görünür.
5. Kopya sayısı **1–20** dışına çıkamaz; 20'de 20 kayıt oluşur ve düğme metni "20 sevkiyat kaydet" olur.
6. E2e toplamı **53 → ≥61**; yeni dosyada **8 test**; silinen/atlanan test **0**.
7. `cd server && dotnet test` **311 test yeşil**; `npm run lint && npm run build` temiz.
8. 390×844'te `document.documentElement.scrollWidth === 390` (yatay kaydırma yok).

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| İki sütun dar ekranda sıkışır | `lg:` eşiği; 768–1024 px tek sütun | Izgarayı kaldır, üç bölüme dön |
| Katlanır bölüm birleşirken alan unutulur | Alanları `:51-80` şemasıyla karşılaştır; `hidden` davranışı korunur (`Inputs.tsx:200`) | İki `MoreFields` geri gelir |
| Ctrl+Enter gizli `submit`'e bağlı | `ui.tsx:192-196` değişmez, e2e 4 korur | Gizli düğme ve `requestSubmit` korunur |
| Öneri şeridi sütunları bozar | Tam genişlik, uzun metin `truncate` | Şerit eski yerine alınır |
| 20 kopya + açık tut yavaşlar | Kaydetme sıralı (`:162`), düğme kilitli | Üst sınır 10'a iner |
| Yeni jetonlar klasik görünümü bozar | Kurallar yalnız `html[data-ui="new"]` altında | CSS bloğu geri alınır |
| E2e süresi uzar (3 dk → 4 dk) | Yeni spec tek dosya, veriyi API ile kurar (`trip-copies.spec.ts:7-12`) | Testler `new-ui` projesinde gruplanır |

Adımlar tek tek commit edildiği için (`AGENTS.md` §3.6) dönüş yolu `git revert <sha>`.

## 13. Doğrulanacaklar

1. **Pencere mi, tam sayfa mı?** Bu belge `Modal` yapısını koruyup yerleşimi değiştirir; formun kalıcı
   rotaya taşınması isteniyor mu? (`PageShell` bugün kodda yok — 0 eşleşme; şartnamesi
   `28-ORTAK-PARCALAR.md`'de, o belge **henüz yazılmadı**: `00-DIZIN.md:68`.)
2. **"Dolu araç" tanımı:** bugün yalnız `status` "Yolda"/"Bakımda" ise uyarı var (`:253`). Tarih
   çakışması da uyarı sayılsın mı?
3. **"Açık tut" kapsamı:** bugün müşteri + iki tarih kalıyor (`:171-175`). Araç ve şoför de kalsın mı?
4. **Fiyat zorunlu mu?** Form iki tutarı yıldızlı gösteriyor (`:452`, `:458`), sunucu 0'a izin veriyor
   (`Validators.cs:240-241`; üst sınır 1 milyar ve en fazla 2 ondalık kuralı da var, `:17-20`).
5. **"Diğer bilgiler" iç sırası** ve "Ayrıntılar" adının tamamen kalkması onaylanıyor mu?
6. **Kopya üst sınırı** 20 kalacak mı; bildirim "20 sevkiyat oluşturuldu." biçiminde mi olmalı (`:166`)?
7. **Terim onayı:** "Sevkiyat" kullanımı `docs/TERIMLER.md` onayına bağlı (`AGENTS.md` §6).
8. **Lisans şeridi metni** `docs/LISANS.md` ile hizalanmalı; buradaki öneri metin onay bekliyor.

---

Sonraki belgeyle bağlantı: `03-SEVKIYATLAR-LISTE.md` formun açıldığı listeyi ve satır menüsünü tanımlar;
`10-TAHSILAT-ODEME-FORMLARI.md` aynı iki sütun + tek "Diğer bilgiler" kalıbını kullanır (belge **henüz
yazılmadı**: `00-DIZIN.md:50`); `28-ORTAK-PARCALAR.md` bu formun da kullanacağı `PageShell` ve katlanır
bölüm şartnamesini yazar (belge **henüz yazılmadı**: `00-DIZIN.md:68`).
