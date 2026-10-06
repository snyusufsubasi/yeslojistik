# 09 — Tedarikçiler cari ekranı ve ödemeleri

## 1. Amaç ve kapsam

Bu belge üç ekranı tarif eder: **Tedarikçiler Cari** (`/cari/tedarikciler`,
`client/src/pages/CariPage.tsx` içinde `kind="suppliers"`), **tedarikçi ayrıntısı**
(`/tedarikciler/:id`, `client/src/pages/SupplierDetailPage.tsx`) ve **Ödemeler**
(`/odemeler`, `client/src/pages/SupplierPaymentsPage.tsx`). İşin özü: *"Hangi taşerona ya da
servise ne kadar borcumuz var, ne kadarı vadesi geçti, hangi sevkiyatın faturası gelmedi ve
satırdan tek tıkla ödeme yapabilir miyim?"*

Kapsanan işler (ortak şartname §5):

- **İş 8 — tedarikçiye ödeme girmek:** hedef **2 tık + form** (menü *Raporlar → Tedarikçiler Cari*
  → satırdaki ödeme düğmesi).
- **Taşeron mahsuplaşması:** faturası gelen sevkiyatta "faturadan düş" komisyonunun borçtan inmesi,
  ödemenin önce sefere sonra eskiden yeniye (FIFO) dağılması görünür olmalı.
- **Vadeli giderin borca etkisi:** *Vadeli Gider* sütunu bakiyeye **giren** bir tutardır.
- **Toplu ödeme:** seçilen taşeron sevkiyatlarının tedarikçi başına tek ödemeye dönüşmesi.
- **Ekstre:** satırdan tek tıkla mutabakat ekstresi.

Kapsam dışı: tedarikçi **listesi** (`15-LISTE-TEDARIKCILER.md`), alınan faturalar
(`07-ALINAN-FATURALAR.md`), ödeme formunun alan alan şartnamesi
(`10-TAHSILAT-ODEME-FORMLARI.md`), yaşlandırma/muhasebe (`24-RAPORLAR-MUHASEBE.md`), müşteri
carisi (`08-MUSTERILER-CARI.md`). Bu belge kodu değiştirmez.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** `/cari/tedarikciler` muhasebe yetkisiyle korunur (`App.tsx:95`,
`Guard perm="accounting"`). Buna karşılık `/tedarikciler/:id` (`App.tsx:99`) ve `/odemeler`
(`App.tsx:103`) **korumasızdır**; yazma düğmeleri `can('accounting')` ile gizlenir
(`SupplierDetailPage.tsx:55`, `SupplierPaymentsPage.tsx:46-53, 60-61`).

**Menü ve sekmeler.** Yeni görünümde *Raporlar* grubunda üç satır: *Müşteriler Cari*
(`client/src/lib/nav.ts:79-80`), *Tedarikçiler Cari* (`nav.ts:81-82`) ve *Tedarikçi Ödemeleri*
(`nav.ts:83`), ardından *Analiz* (`nav.ts:84`). Klasik menüde tedarikçi carisi *Cari* grubunda
*Tedarikçiler Cari* (`nav.ts:32-33`), ödemeler aynı grubun sonunda *Tedarikçi Ödemeleri* olarak
durur (`nav.ts:38`). Yeni görünümde sayfa üstünde bölüm sekmeleri çizilir (`ui.tsx:132` →
`client/src/components/shell/SectionTabs.tsx:8-15`); tedarikçi bölümünün anahtarı
`tedarikci-cari` olup sekmeleri *Bakiyeler* ve *Tedarikçi Ödemeleri*'dir
(`client/src/lib/sections.ts:21-24`). Sekmeler `sectionFor` ile adresten bulunur
(`sections.ts:36-38`) ve yetkisi olmayan sekme süzülür (`SectionTabs.tsx:14`).

**Ekran iskeleti.** `PageHeader` + özet + tablo kartı (`CariPage.tsx:156, 157-162, 163-180, 181-206`).
Metinler tek nesnede: başlık *"Tedarikçiler Cari"*, satır tıklaması `/tedarikciler/{id}`, üst ödeme
düğmesi `/odemeler?new=1`, dosya adı `tedarikciler-cari` (`28-32`).

**Süzgeç ve sütunlar.** Üç radyo (`CariPage.tsx:183-190`): *Bakiyesi olanlar* (varsayılan, `77`),
*Vadesi geçenler* (`overdue > 0`), *Hepsi* (`94-98`); arama ünvan, VKN ve telefonu tarar (`96`).
Tutar sütunları `58-65`: **Devir**, **Alınan Fatura** (adetli), **İptal Fatura** (adetli),
**Faturasız Sevkiyatlar** (adetli, `text-warn`), **Vadeli Gider**, **Verilen Ödeme**; bakiye
`129-132`, altında kırmızı *"Vadesi geçen …"*. Her tutar sütununun ayna kuralı vardır (`44`, `86`);
adet ikinci satıra yazılır ve yazı `Word` ile normal (mono değil) tutulur (`123-126`, `214`).
Sıralama tek elden yürür: ünvan A-Z, tutarlarda ilk tık büyükten küçüğe (`108`), aynı başlığa
ikinci tık yönü çevirir; sunucu tarafı da `title`, `taxNumber`, `balance`, `overdue` ve tutar
anahtarlarını tanır (`CariService.cs:185-203`).

**Bakiyenin kaynağı.** `CariService.cs:77-78`:
`Devir + (taşeron sevkiyatları + alınan faturalar) + vadeli giderler − ödemeler`; `tripCost` `75`.
Kalemler `PayableService.ItemsAsync`'ten gelir (`73-120`): devir `96-97`, faturasız taşeron
sevkiyatı `98-100`, alınan fatura `101-103`, vadeli gider `104-105`. Vadesi geçen, kalanı pozitif ve
vadesi bugünden eski kalemlerdir (`CariService.cs:58`); kalemin kendi vadesi yoksa tedarikçi vadesi
eklenir (`PayableService.cs:108`). Özet kutuları `170-180`: *Toplam borç*, *Vadesi geçen*,
*Taşeron faturası gelmeyen* → `/seferler?carrierInvoice=missing` (`179`; `TripsPage.tsx:56`).

**Mahsuplaşma.** Faturaya bağlı seferin komisyonu faturanın borcundan inilir
(`PayableService.cs:59, 83-84`), açıklama *"Alış faturası (komisyon düşüldü: …)"* olur (`102-103`);
ödemeler önce bağlı sefere, sonra FIFO sırasıyla borçlara dağıtılır (`107-112`, kural `16-20`).
Vadeli gider yalnız `IsOnCredit` ve tedarikçisi seçilmiş giderdir (`61-63, 86-87`); form bunu zorunlu
kılar ve *"Vadeli (tedarikçiye borç yaz)"* yazar (`ExpensesPage.tsx:39-42, 286-290`).

**Satır işlemleri.** Ayna kapalıyken satır sonunda *Ekstre* ve `Button write` **"Ödeme Ekle"**
vardır (`CariPage.tsx:133-140`). Ekstre `/suppliers/{id}/statement` PDF'ini açar (`111`; sunucu
`SuppliersController.cs:91-108`, Excel `100-102`, ad `tedarikci-ekstre-{supplierNo}.pdf` `106`).

**Ayrıntı sayfası.** Beş sekme (`SupplierDetailPage.tsx:84-90`): Hareketler, Sevkiyatlar, Ödemeler,
Araçlar, Şoförler. Üst düğmeler `47-55`: *Geri*, *Düzenle*, *Hesap Ekstresi* (`50-51`),
*Ekstre Excel* (`52`), yalnız kayıtsız tedarikçide *Sil* (`53-54`), `accounting` ile *Ödeme Yap*
(`55`). Özet `72-79`: *Toplam Borçlanma*, *Toplam Ödenen*, *Kalan Borcumuz* (negatifse "Fazla ödeme
(avans)"), *Vadesi Geçen*. Hareket tür ve durumları sunucudan (`PayableService.cs:141-148`);
Sevkiyatlar sekmesi seçim ve toplu ödeme sunar (`121-141`).

**Ödeme formu.** `client/src/components/SupplierPaymentForm.tsx`: başlık *Ödeme Yap* (`64`),
*"Kime ödüyorsunuz?"* (yazarak arama + "Yeni tedarikçi olarak ekle", `67-71, 104-105`), borç bandı ve
*Tamamını gir* (`72-77`), tutar, *Tedarikçiden iade* (`78-79`), tarih (`81`), yöntem (`82-84`),
kasa/banka (`85-89`), katlanmış sevkiyat/açıklama alanı ve FIFO ipucu (`90-99`). İade eksi tutarla
saklanır: borcu artırır, kasaya girer (`SupplierPaymentsController.cs:167-169`). Kaydetme
`Ctrl/Cmd+Enter` ile de olur (`ui.tsx:191-196`).

**Ödemeler listesi.** Süzgeçler tedarikçi + tarih aralığı, toplam şeridi `TotalsStrip`, sütunlar,
satır tıklaması formu açar, satır sonu düzenle/sil düğmeleri
(`SupplierPaymentsPage.tsx:65-79, 38-53`).

**Toplu ödeme.** `BulkSupplierPaymentDialog` (`client/src/components/BulkDialogs.tsx:42`) önizleme
alır (`45-49`; sunucu `SupplierPaymentsController.cs:112-116`), sonra **tedarikçi başına tek ödeme**
yazar (`56-65`, sunucu `118-152`). Tek işlemdedir: ödenemeyecek sefer varsa hiçbir ödeme yazılmaz
(`129-132`). Giriş: `TripsPage.tsx:219`, `SupplierDetailPage.tsx:138`.

**Dışa aktarma.** `CariController.cs:27-29` (`format=pdf` ya da Excel); sunucu süzgeç/sıralamayı
yeniden uygular (`CariService.cs:130-135`), sütun listesi `101-109`; *Vadesi Geçen* yalnız ayna
kapalıyken eklenir (`149`).

**Ortak parçalar ve eksikler.** Özet kutuları **yerel** `Figures` bileşenidir (`CariPage.tsx:227-245`);
ortak `SumStrip` (`SumStrip.tsx:12`) ve `StatCard` (`ui.tsx:302`) burada **kullanılmaz**.
**`PageShell` ve `DetailDrawer` kodda yoktur** (`28-ORTAK-PARCALAR.md` yazar).
`index.css` içinde `data-ui="new"` seçicisi **yoktur** (dosyanın tamamında 0 eşleşme); o özniteliği
yalnız e2e testi okur (`client/e2e/new-ui/basics.spec.ts:8`), görünüm `useIsNewUi()` ile seçilir.
Bugün yeni görünümün sayfaya etkisi üç tanedir: sayfa başlığı `newTitles` ile pratikortam adına
çevrilir (`ui.tsx:112` → `sections.ts:41-49`), düz yazı alt başlık gizlenir (`ui.tsx:113`) ve
başlığın altına bölüm sekmeleri eklenir (`ui.tsx:132`).

## 3. Hedef yerleşim

İlke: üst kısım (başlık → tablo başlığı) **≤260px**, 1440×900'de **≥12 satır**, 390×844'te yatay
kaydırma yok. Kutu yerine **sade üst şerit**; şerit üç kalemi geçmez.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tedarikçiler Cari          [Excel] [PDF] [Tedarikçi Listesi]    [Ödeme Yap]   │
│ Bakiyeler | Tedarikçi Ödemeleri            (yeni görünüm sekmeleri)           │
│ ┌ özet şeridi ───────────────────────────────────────────────────────────────┐│
│ │ TOPLAM BORÇ     VADESİ GEÇEN      FATURASI GELMEYEN                        ││
│ │ 482.100,00 TL   96.400,00 TL      4 sevkiyat            (tıklanır)         ││
│ └────────────────────────────────────────────────────────────────────────────┘│
│ ┌ Hesaplar ──────────────────────────────────────────────────────────────────┐│
│ │ [🔍 Ünvan, VKN, telefon…]   ( Bakiyesi olanlar | Vadesi geçenler | Hepsi ) ││
│ │ Tedarikçi      Alınan Fatura  Faturasız  Vadeli Gider  Bakiye     İşlem    ││
│ │ ABC Nakliyat   240.000,00     12.500,00  6.000,00      189.300,00 [Ekstre] ││
│ │ … 12+ satır …                                                [Ödeme]       ││
│ │ 18 kayıt        Bakiye toplamı 482.100,00 TL · vadesi geçen 96.400,00 TL   ││
│ └────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

Değişiklikler: (a) özet yerel `Figures` yerine ortak `SumStrip`; *Vadesi geçen* kutusu süzgeci
`overdue` yapar; (b) `Devir` ve `Verilen Ödeme` varsayılan gizli, "Sütunlar" menüsünden açılır;
(c) satır düğmeleri ikon + etiket ve ≥44px; (d) toplam satırı tablo altında kalır
(`CariPage.tsx:143-152`); (e) liste iskeleti yeni görünümde `28-ORTAK-PARCALAR.md`'de tanımlanacak
`PageShell` ile kurulur — **bugün böyle bir bileşen yoktur**.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ünvan, VKN, telefon; yazıldıkça süzer (`CariPage.tsx:94-97`) | — |
| Süzgeç | radyo (3) | evet | Varsayılan *Bakiyesi olanlar* | — |
| Tedarikçi başlığı | sıralama düğmesi | — | A-Z / Z-A | — |
| Tutar başlıkları | sıralama düğmesi | — | İlk tık büyükten küçüğe (`108`) | — |
| *Vadesi geçen* kutusu | tıklanır kutu | — | Süzgeci `overdue` yapar (`173`) | — |
| *Taşeron faturası gelmeyen* | tıklanır kutu | — | `/seferler?carrierInvoice=missing` (`179`) | — |
| Satır | tıklanabilir | — | `/tedarikciler/{id}` (`193`) | — |
| Ekstre | ikincil düğme | — | `/suppliers/{id}/statement` PDF (`111`) | "Ekstre açılamadı. Yeniden deneyin." |
| Ödeme (satır) | birincil düğme (`write`) | — | Tedarikçi seçili ödeme penceresi | forma ait doğrulama |
| Excel / PDF | ikincil düğme | — | Ekrandaki süzgeç + sıralama ile iner | "Dosya indirilemedi." |
| Tutar / Tarih / Yöntem | form alanı | evet | Ödeme penceresi | "Tutar sıfırdan büyük olmalı.", "Tarih zorunlu." |
| Tedarikçiden iade | onay kutusu | hayır | Tutar eksi kaydedilir (`SupplierPaymentForm.tsx:78-79`) | "İade sefere bağlanamaz." |
| Toplu ödeme | seçim çubuğu düğmesi | — | Önizleme → tedarikçi başına tek ödeme | "Seçilen seferlerden N tanesi ödenemez…" |

Klavye: Tab ile süzgeç → arama → tablo başlıkları → satır düğmeleri; Esc pencereyi kapatır
(`ui.tsx:161-164`); `Ctrl/Cmd+Enter` kaydeder (`191-196`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Yükleniyor:** satırlar %50 soluk, veri yokken `Spinner` (`DataTable.tsx:126, 148`). Hedef:
  iskelet satırlar (`29-GORSEL-SISTEM.md`).
- **Boş:** süzgece göre dört metin (`CariPage.tsx:195`), ödemelerde *"Henüz ödeme yok…"*
  (`SupplierPaymentsPage.tsx:79`).
- **Hata:** `ErrorState` + *Yeniden dene* (`DataTable.tsx:148`); özet kutuları aynı sorgudan gelir
  (`CariPage.tsx:79`).
- **Yetkisiz:** cari ekranı rota guard'ıyla kapalı (`App.tsx:95`); ayrıntı ve ödemeler listesi açık,
  yazma düğmeleri gizli (`SupplierDetailPage.tsx:55`, `SupplierPaymentsPage.tsx:46-53`). Hedef: bu
  iki rotaya da `Guard perm="accounting"`.
- **Ayna:** bakiye pratikortam rakamıdır (`CariPage.tsx:82`), başlık *"Bakiye (pratikortam)"* (`128`),
  özet iki kutuya iner (`163-169`): birincisi *Toplam borç* ve tıklanınca *Bakiyesi olanlar* süzgeci
  (`165`), ikincisi tıklanamayan *"Pratikortam'dan"* bilgi kutusu — son aktarım zamanını `ago()` ile
  gösterir (`167-168`). *Vadesi geçenler* radyosu ve satır düğmeleri gizlenir (`184`, `133`), üst
  *Ödeme Yap* gizlenir (`161`). `Button write` aynada `null` döner (`ui.tsx:30-32, 46-48`).
- **Lisans:** süre dolduğunda sunucu yazmayı reddeder (`LicenseGuard`); kullanıcı anlaşılır hata
  görür. Sahip modunda kısıt yoktur.

## 6. Metinler ve terimler

Ekranda: *Tedarikçiler Cari*, *Taşeron ve tedarikçilere borcun tek tabloda*, *Toplam borç*,
*Vadesi geçen*, *Taşeron faturası gelmeyen*, *Hesaplar*, *Bakiyesi olanlar*, *Vadesi geçenler*,
*Hepsi*, *Devir*, *Alınan Fatura*, *İptal Fatura*, *Faturasız Sevkiyatlar*, *Vadeli Gider*,
*Verilen Ödeme*, *Bakiye*, *Bakiye (pratikortam)*, *Ekstre*, *Ödeme*, *Ödeme Yap*,
*Tedarikçi Listesi*, *Excel*, *PDF*, *kayıt*, *Bakiye toplamı*, *hesapta bakiye var*,
*listelemek için tıklayın*. Ödemeler listesinde: *Ödemeler*, *Ödeme Listesi*, *Tedarikçi*,
*Sevkiyat*, *Yöntem*, *Tutar*, *Açıklama*, *Toplu ödeme*, *Tedarikçiden iade*. Ayrıntıda:
*Tedarikçi Bilgileri*, *Cari özeti*, *Toplam Borçlanma*, *Toplam Ödenen*, *Kalan Borcumuz*,
*Vadesi Geçen*, *Hesap Ekstresi*, *Ekstre Excel*, *Hareketler*, *Toplu Ödeme*.

Yasak: "ayna", "dry-run", "token", "endpoint", "UBL" ekranda görünmez; "pratikortam" yalnız ayna
modunda kalır. *Sevkiyat* terimi kullanılır (*sefer* değil) — ancak bugün kullanıcıya görünen birkaç
metinde *sefer* geçer: *"N sefer (toplu ödeme)"* (`SupplierPaymentsController.cs:30`), ödeme
açıklaması *"… için toplu ödeme"* (`PayableService.cs:147`), cari hareket türü *"Fatura bekleyen
sefer"* (`PayableService.cs:143`) ve toplu ödeme penceresinin başlık metni
(`BulkDialogs.tsx:77, 85`). Toplu önizleme doğrulaması da *"En az bir sefer seçin."* der
(`PayableService.cs:206`). Aynı eylem iki ad taşır: satırda *Ödeme Ekle* (`CariPage.tsx:138`),
üstte ve pencerede *Ödeme Yap* (`CariPage.tsx:30`, `SupplierPaymentForm.tsx:64`).
Para `tl()`/`tl2()` ile iki kuruş, tarih `03.10.2026`.

## 7. Telefon davranışı (390×844)

Mobil kart görünümü vardır (`CariPage.tsx:196-205`): ünvan, altında VKN/telefon veya kırmızı
*"Vadesi geçen …"*, sağda tabular bakiye; tablo gövdesi mobilde gizlenir (`DataTable.tsx:101`).
Hedef: kartın altına iki tam genişlik düğme (*Ekstre*, *Ödeme*) ve süzgeç radyolarında yatay kaydırma
olmaması. Playwright mobil profili 375×812'dir (`client/playwright.config.ts:20`), ölçülen sayfalar
arasında `/cari/tedarikciler` vardır (`client/e2e/mobile.spec.ts:4`); 390×844 kabul testinde ölçülür.

## 8. Erişilebilirlik ve klavye

Süzgeç grubu doğru: `role="radiogroup"` + `aria-label="Gösterilecek hesaplar"`, düğmelerde
`role="radio"` + `aria-checked` (`CariPage.tsx:183-190`). Hedef: (a) sıralanabilir başlıklara
`aria-sort` — bugün yön oku var ama `aria-sort` yok (`DataTable.tsx:110-123`); (b) satır düğmelerine
`aria-label`; (c) *Vadesi geçen* bilgisi renkle birlikte metinle verilir (bugün metin var, `131`);
(d) dokunma hedefi ≥44px (bugün `size="sm"` düğmeler `min-h-8`, `135-138`); (e) `:focus-visible`
çerçevesi görünür kalır (`client/src/index.css`); (f) tutar sütunları `tabular-nums`
(`DataTable.tsx:138`).

## 9. Testler (e2e + birim)

Mevcut kapsam: `client/e2e/cari.spec.ts:17-20` (*Tedarikçiler Cari* başlığı, *Hepsi* radyosu, ilk
satır) ve `54-56` (*Alınan Fatura* sütunu, `/api/cari/suppliers/export?…format=pdf`);
`client/e2e/workflow.spec.ts:289-304` (taşeron borcunun KDV/tevkifatla oluşması, *Ödeme Yap* ile
bakiyenin düşmesi, ekstre PDF'i, ödemenin listede görünmesi); `client/e2e/bulk.spec.ts` yalnız **sevkiyat** toplu işlemlerini kapsar, tedarikçi toplu ödemesini
kapsamaz; `client/e2e/mobile.spec.ts:4` yatay taşma kontrolü; `client/e2e/new-ui/basics.spec.ts:23`
yeni menü adları.

Eklenecek senaryolar (`client/e2e/new-ui/tedarikci.spec.ts`, `useNewUi(page)` —
`client/e2e/helpers.ts:44-46`): satırdaki *Ödeme* düğmesi tedarikçi seçili pencereyi açar; *Vadesi
geçenler* süzgeci yalnız vadesi geçenleri gösterir; toplam satırı görünen satırla uyuşur; toplu ödeme
önizlemesi tutar gösterir ve kayıt sonrası bakiye düşer; ayna modunda satır düğmeleri görünmez.
Sunucu tarafında bakiye ve mahsuplaşma kuralları `server/YesLojistik.Tests` içinde (`CariTests.cs`,
`CariExportTests.cs`) sabitlenir.

## 10. Uygulama adımları

1. **`client/src/App.tsx:99, 103`** — `/tedarikciler/:id` ve `/odemeler` rotalarına
   `Guard perm="accounting"` ekle. Süre: 0,5 saat.
   Doğrulama: `cd client && npm run build && npm run lint`.
2. **`client/src/components/DataTable.tsx:110-123`** — sıralanabilir başlıklara `aria-sort` ekle,
   yön okunu `aria-hidden` yap. Süre: 1 saat. Doğrulama: `cd client && npm run build`.
3. **`client/src/pages/CariPage.tsx:227-245, 163-180`** — yerel `Figures` yerine ortak `SumStrip`
   (`SumStrip.tsx:12`); tedarikçide üç kutu, aynada iki kutu. Süre: 3 saat.
   Doğrulama: `npx playwright test e2e/cari.spec.ts`.
4. **`client/src/pages/CariPage.tsx:58-65, 86`** — `Devir` ve `Verilen Ödeme` varsayılan gizli,
   "Sütunlar" menüsünden açılır (Excel listesi sunucuda sabit, `CariService.cs:101-109`). Süre: 4 saat.
   Doğrulama: `cd client && npm run build && npm run lint`.
5. **`client/src/pages/CariPage.tsx:133-140, 196-205`** — satır düğmelerini ≥44px yap, etiketi tek
   terime indir, mobil karta iki tam genişlik düğme ve `aria-label` ekle. Süre: 4 saat.
   Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
6. **`client/src/pages/CariPage.tsx:192-206`** — yükleniyor durumunu iskelet satırlara çevir
   (`28-ORTAK-PARCALAR.md`'de tanımlanacak ortak liste iskeleti). Süre: 3 saat.
   Doğrulama: `cd client && npm run build`.
7. **`client/src/pages/SupplierPaymentsPage.tsx:71-75`** — `TotalsStrip` yerine `SumStrip`; şeride
   *Ödeme sayısı*, *Toplam*, varsa *Gelen iadeler*. Süre: 2 saat. Doğrulama: `cd client && npm run build`.
8. **`server/YesLojistik.Infrastructure/Services/CariService.cs:173`** — PDF dipnotu tedarikçi
   tablosunda da "müşteri bakiyesine dahil değildir" diyor; tedarikçi için doğru metni yaz (faturasız
   sevkiyat **borca girer**). Süre: 1 saat. Doğrulama: `cd server && dotnet test --filter CariExportTests`.
9. **`client/e2e/new-ui/tedarikci.spec.ts`** (yeni dosya) — §9'daki beş senaryoyu yaz. Süre: 5 saat.
   Doğrulama: `E2E_BASE_URL=http://localhost:5173 npx playwright test e2e/new-ui/tedarikci.spec.ts`.
10. **`docs/plan/09-TEDARIKCILER-CARI.md`, `docs/GELISTIRME-PLANI.md`** — yapılanları işaretle.
    Süre: 0,5 saat. Doğrulama: `git diff --stat`.

Toplam tahmin: **~3 iş günü** (24 saat). Sıra: 1 → 3 → 4 → 5 → 6; 7-8 bağımsız.

## 11. Kabul ölçütü

1. Menüden tedarikçi ödemesine **2 tık**; pencere açıldığında tedarikçi seçili gelir.
2. 1440×900'de tabloda **≥12 satır**; üst kısım (başlık → tablo başlığı) **≤260px**.
3. 390×844'te **yatay kaydırma yok**; satır düğmeleri ≥44px.
4. Aynı anda **en fazla 3** özet kutusu; *Vadesi geçen* kutusu tek tıkla süzgeci `overdue` yapar.
5. Sıralanabilir her başlıkta `aria-sort` doğru; A-Z ↔ Z-A çalışır.
6. Excel adı `tedarikciler-cari-YYYYAAGG.xlsx`; PDF adresi `filter`, `sort`, `desc` taşır.
7. *Ekstre* `/api/suppliers/{id}/statement` açar; ayna açıkken de çalışır.
8. Ayna açıkken: *Bakiye (pratikortam)* görünür, *Vadesi geçenler* radyosu ve satır düğmeleri yok,
   özet iki kutu.
9. Toplu ödeme sonrası ilgili tedarikçilerin bakiyesi aynı tutarda düşer ve ödemeler listesinde görünür.
10. Vadeli gider girildiğinde *Vadeli Gider* sütunu ve bakiye artışı görünür.
11. e2e: `cari.spec.ts`, `mobile.spec.ts`, yeni `tedarikci.spec.ts` yeşil; `npm run build`,
    `npm run lint`, `cd server && dotnet test` hatasız.
12. Ekranda teknik sözcük yok; boş durum metinleri bütün süzgeç durumlarını kapsar.

## 12. Riskler ve geri dönüş
| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sütun gizleme Excel/PDF çıktısını değiştirir | Sunucu sütun listesi (`CariService.cs:101-109`) sabit | Sütunları görünür yap |
| Ayna kuralı bozulur, panel kendi bakiyesini gösterir | `bal()` (`CariPage.tsx:82`), sütun süzgeci (`86`) ve sunucu eşi (`CariService.cs:126-128`) korunur | `git revert` |
| Rota guard'ı eklenince muhasebe dışı rol ekranı kaybeder | Karar §13.5'e bağlı; önce sorulur | Guard kaldırılır |
| Toplu ödeme yanlış tutar yazar | Sunucu tek işlemde ve önizlemeyle çalışır (`SupplierPaymentsController.cs:127-132`) | `git revert` + ödeme silme |
| `SumStrip`'e geçişte özet bilgisi kaybolur | Üç kutu ve alt yazılar bire bir taşınır | Yerel `Figures` geri gelir |

Her adım ayrı commit; `main`'e giden her şey canlıya çıkar (ortak şartname §1.6). Görsel
değişiklikler `data-ui="new"` arkasında geliştirilir (`29-GORSEL-SISTEM.md`).

## 13. Doğrulanacaklar

1. **PDF dipnotu çelişkisi:** `CariService.cs:173` tedarikçi tablosunda da "…**müşteri** bakiyesine
   dahil değildir." yazıyor; oysa faturasız taşeron sevkiyatı `tripCost` içinde ve **bakiyeye
   giriyor** (`75-78`). Düzeltilmiş metin kullanıcı onayı ister.
2. **Terim kararı:** aynı eylem için üç ad (*Ödeme Ekle* `CariPage.tsx:138`, *Ödeme Yap*
   `SupplierPaymentForm.tsx:64`, sayfa *Ödemeler* `SupplierPaymentsPage.tsx:57`); menü/sekmeler ise
   *Tedarikçi Ödemeleri* diyor (`nav.ts:83`). Karar `32-TERMINOLOJI.md`'ye bağlı.
3. ***sefer* sözcüğü:** `PayableService.cs:147` ve `SupplierPaymentsController.cs:30` kullanıcıya
   görünen metinde *sefer* yazıyor (terim onayı bekliyor). Aynı sözcük cari hareket türü
   *"Fatura bekleyen sefer"* olarak da ekrana çıkıyor (`PayableService.cs:143`) ve toplu ödeme
   penceresinde *"N sevkiyat"* ile birlikte geçiyor (`BulkDialogs.tsx:85`); hesap ekstresi ve
   faturasız sevkiyat bölümünde de *"(N sefer)"* yazılıdır
   (`DocumentPdfs.cs:270, 413`). Terim onayı gelince hepsi birlikte değişmeli.
4. **Şeritte tutar:** *Taşeron faturası gelmeyen* kutusu bugün yalnız **adet** gösterir
   (`CariPage.tsx:178`; `waiting.total` tedarikçide `0`, `106`). Tutar da istenirse sunucu toplamı
   kullanılır (`uninvoicedTrips`, `client/src/api/types.ts:981`).
5. **Yetki sınırı:** `/tedarikciler/:id` ve `/odemeler` bugün korumasız (`App.tsx:99, 103`); yalnız
   muhasebe rolüne kapatılıp kapatılmayacağı iş kararıdır.
6. **Vade kuralı:** vadeli giderin vadesi gider tarihine tedarikçi vadesi eklenerek bulunuyor
   (`PayableService.cs:108`); gider için ayrı vade alanı gerekip gerekmediği doğrulanmadı.
7. **Gerçek veri:** tedarikçi hesap sayısı ve 12 satır hedefinin tutup tutmadığı bu belgeye yazılmaz;
   ölçüm `33-K0-VE-KABUL-TESTI.md`'de yapılır.
8. **Yeni görünüm jetonları:** `index.css` içinde `data-ui="new"` seçicisi yok (0 eşleşme); sade üst
   şeridin görsel farkı `29-GORSEL-SISTEM.md` yazılana kadar doğrulanamaz.
9. **`PageShell` / liste iskeleti:** kodda yok; §3 ve §10.6 `28-ORTAK-PARCALAR.md`'ye bağlıdır.

Sonraki belgeyle bağlantı: `10-TAHSILAT-ODEME-FORMLARI.md` ödeme ve iade penceresinin alan alan
şartnamesini, `15-LISTE-TEDARIKCILER.md` tedarikçi listesini, `28-ORTAK-PARCALAR.md` üst şerit ve
liste iskeletini, `07-ALINAN-FATURALAR.md` borcu doğuran alış faturalarını tanımlar.
