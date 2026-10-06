# 08 — Müşteriler cari ekranı ve ekstre

## 1. Amaç ve kapsam

Bu belge, panelin **Müşteriler Cari** ekranını (`/cari/musteriler`, `client/src/pages/CariPage.tsx`,
`kind="customers"`) ve o ekrandan açılan **ekstre** ile **tahsilat** akışını tarif eder. Ekranın işi
tek cümleyle şudur: *"Hangi müşteri ne kadar borçlu, ne kadarı vadesi geçmiş, hangi hesap ne kadar
alacak — tek tabloda."* Bugün bu iş için kullanıcı menüde **Raporlar → Müşteriler Cari**
(`client/src/lib/nav.ts:78-80`, `newNav`) yolunu izler ve tabloyu görür; klasik görünümde aynı ekran
**Rapor ve Yönetim → Müşteriler Cari** yolundadır (`nav.ts:29-31`, `classicNav`). İki menüden de aynı
adrese gidilir: `/cari/musteriler`.

Kapsanan işler (ortak şartname §5'teki 10 iş listesinden):

- **İş 6 — müşteri bakiyesi/ekstresi:** hedef **2 tık** (menü + satırdaki *Ekstre*).
- **İş 7 — tahsilat girmek:** hedef **2 tık + form** (satırdaki *Tahsilat Ekle* → form alanları).
- **İş 5 ile kesişim — fatura kesmek:** *Faturası kesilecek sevkiyatlar* kutusu doğrudan fatura
  ekranına götürür (`CariPage.tsx:177`).
- **Faturanın bakiyeye etkisi:** hangi sütunun bakiyeye girdiği ekranda anlaşılır olmalı
  (bugünkü hesap kuralı §2'de kanıtıyla).

Kapsam dışı: **Tedarikçiler Cari** ve ödeme akışı (`09-TEDARIKCILER-CARI.md`), tahsilat formunun
alan alan şartnamesi (`10-TAHSILAT-ODEME-FORMLARI.md`), müşteri **listesi** (`/musteriler`,
`14-LISTE-MUSTERILER.md`), müşteri ayrıntı sayfasının tamamı (`/musteriler/:id`) ve yaşlandırma
raporu (`24-RAPORLAR-MUHASEBE.md`). Bu belge kodu değiştirmez.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** İki cari rotası aynı bileşeni `kind` prop'u ile kullanır:
`client/src/App.tsx:94` (`cari/musteriler`, `Guard perm="accounting"`) ve `App.tsx:95`
(`cari/tedarikciler`); bileşen tembel yüklenir (`App.tsx:15`, `const CariPage = lazy(...)`). Yani cari ekranı **muhasebe yetkisi**
olmayan kullanıcıya hiç açılmaz; menüde de öğe `perm: 'accounting'` taşır (`nav.ts:79`) ve menü
çizilirken yetkiye göre süzülür (`client/src/components/Layout.tsx:51`).

**Ekran iskeleti.** Sayfa `PageHeader` + `Figures` + `Card` sırasıyla kurulur: `CariPage.tsx:156`
başlık/alt başlık, `157-162` üst düğmeler, `163-180` özet kutuları, `181-206` tablo kartı.
Metinler tek bir `text` nesnesinde toplanmıştır (`22-33`): başlık *"Müşteriler Cari"*, alt başlık
*"Bütün müşterilerin bakiyesi tek tabloda. Satıra tıklayınca hareketler açılır."*, dışa aktarma dosya
adı `musteriler-cari` (`26`).

**Süzgeç.** Üç seçenekli radyo grubu `183-191`: *Bakiyesi olanlar* (`open`, varsayılan, `77`),
*Vadesi geçenler* (`overdue`), *Hepsi* (`all`). Süzgeç mantığı `94-98`: `open` → bakiye ≠ 0,
`overdue` → `r.overdue > 0`, `all` → hepsi. Arama kutusu ünvan, VKN ve telefonu tarar (`96`,
`searchKey` ile Türkçe duyarsız normalizasyon, `client/src/lib/search.ts`).

**Sütunlar.** Müşteri sütunları `50-55`: `Devir`, `Kesilen Fatura`, `İptal Fatura` (adetli),
`Faturasız Sevkiyatlar` (adetli, `text-bill` vurgulu) ve `Alınan Ödeme`. Her sütunun bir
`mirror: 'ifData' | 'never'` kuralı vardır ve ayna açıkken `86` numaralı satırdaki `filter` bunları
elerse sütun hiç görünmez. Bakiye sütunu `129-132`: ayna kapalıyken `Bakiye`, altında kırmızı
*"Vadesi geçen …"* satırı; ayna açıkken başlık `Bakiye (pratikortam)` olur (`128`, değer `82`).

**Satır işlemleri.** Ayna kapalıyken her satırın sonunda iki düğme vardır (`133-140`): *Ekstre*
(`135`, ikon `FileText`) ve *Tahsilat Ekle* (`137-138`, `Button write`). Düğme tıklaması satır
tıklamasını durdurur (`134`). Satıra tıklamak müşteri ayrıntısına gider (`193`).

**Sıralama.** Tablo `DataTable` ile çizilir (`192-205`); sıralama durumu `78` (varsayılan
`balance` / azalan). Başlığa tıklama kuralı `108`: tutar sütununda ilk tıklama büyükten küçüğe,
ünvanda A-Z; aynı başlığa yeniden tıklama yönü çevirir. `DataTable` başlığı bir `button` olarak
basar ve aktif yönü ok simgesiyle gösterir (`client/src/components/DataTable.tsx:110-123`);
başlıkta `aria-sort` **yoktur**.

**Dışa aktarma.** İki düğme: `ExportButton` (Excel, `158`) ve `PdfButton` (`159`), ikisi de aynı
uçtan beslenir ve ekrandaki arama/süzgeç/sıralamayı taşır (`109` `exportParams`). Sunucu tarafı
`server/YesLojistik.Api/Controllers/CariController.cs:24` (Excel) ve aynı uçta `format=pdf`
(`21-24`); süzgeç/sıralama sunucuda yeniden uygulanır
(`server/YesLojistik.Infrastructure/Services/CariService.cs:131-135`) ve çıktı dipnotu
*"Faturasız sevkiyatlar ve iptal faturalar bilgi içindir; müşteri bakiyesine dahil değildir."*
yazılır (`CariService.cs:173`).

**Bakiyenin kaynağı.** Cari satırı `Devir + Kesilen Fatura − Alınan Ödeme` olarak hesaplanır
(`CariService.cs:40`); sütun tanımları `94-99`. Vadesi geçen tutar `BalanceService`'ten gelir
(`CariService.cs:30`, `server/YesLojistik.Infrastructure/Services/BalanceService.cs:19-54`;
vade tarihi bugünden eskiyse *"Vadesi Geçti"*, `BalanceService.cs:54`). Faturasız sevkiyatlar
`Delivered` durumunda ve faturasız seferlerdir (`CariService.cs:27-29`) — bu tutar ekranda görünür
ama **bakiyeye girmez** (`api/types.ts:966-967`).

**Ekstre.** Satırdaki *Ekstre* doğrudan PDF açar: `openPdf('/customers/{id}/statement')`
(`CariPage.tsx:111`). Sunucu ucu `GET /api/customers/{id}/statement` (`CustomersController.cs:86-97`);
`format=xlsx` ile aynı ekstre Excel iner (`90-93`), `uninvoiced=true` faturasız sevkiyatları
bilgi bölümü olarak ekler (`95`). Zaman aşımı hatası `toast.error(errorMessage(e))` ile bildirilir
(`112`).

**Ayrıntı sayfası ve zengin ekstre.** `/musteriler/:id` sayfası (`CustomerDetailPage.tsx`) dört
sekme taşır (`74-79`): Hareketler, Sevkiyatlar, Faturalar, Tahsilatlar. Üst düğmeler `40-49`:
*Geri*, *Düzenle*, *Hesap Ekstresi* (`43`), vadesi geçen varsa *Vade Hatırlatma* (`44`), yalnız
hiç kaydı olmayan müşteride *Sil* (`45-46`), `accounting` yetkisiyle *Tahsilat Ekle* (`47`) ve
*Yeni Fatura* (`48`). `StatementDialog` (`166-225`) tarih aralığı, *"Faturasız sevkiyatları de
göster"* onay kutusu (`211-215`), alıcı e-posta, WhatsApp düğmesi (`193-194`), e-postayla gönderme
(`184`) ve *PDF Aç* / Excel çıktısı (`196-198`) sunar.

**Sekmelerin verisi.** Hareketler `GET /customers/{id}/movements` (`CustomerDetailPage.tsx:107`,
`AccountMovement` alanları `api/types.ts:162-171`), listeler `usePaged` ile sayfalanır (`123`,
`137`, `151`, sayfa boyu 15). Hareketler tablosu en yeniden eskiye çevrilerek gösterilir (`118`).

**Ortak parçalar.** Ekran `PageHeader` (`client/src/components/ui.tsx:108`), `Card` (`90`),
`Figures`/`Figure` (`322`, `327`), `Modal` (`153`) ve `Button` (`29`) kullanır; `Modal` Esc ile
kapanır, kirli formda sorar (`160-164`) ve Ctrl/Cmd+Enter ile formu gönderir (`193-196`).
Ortak şartname §3.3'te yazıldığı gibi **`PageShell` ve `DetailDrawer` kodda yok**; müşteri
ayrıntısı ayrı bir **sayfadır**, çekmece değildir. `MoreMenu`/`RowMenu`/`FilterBar`/`FilterPanel`
de bu ekranda **kullanılmaz**. Ekranın kendi `Figures` bileşeni yereldir (`CariPage.tsx:227-245`).
Sayfa `useIsNewUi()` kullanmaz, ama `PageHeader` kullanır ve o bileşen `useIsNewUi()`
okur: yeni görünümde başlık `newTitles` tablosundan gelir (`ui.tsx:110-112`) — bu tabloda
`/cari/musteriler` **yok** (`client/src/lib/sections.ts:41-50`), başlık *"Müşteriler Cari"* kalır;
açıklama cümlesi yeni görünümde gizlenir (`ui.tsx:113`). Yani bugün yeni görünümde **görsel fark
vardır: alt başlık görünmez**; sayfanın kendi düzeni değişmez (ortak şartname §3.1).

## 3. Hedef yerleşim

İlke: üst kısım (başlık → tablo başlığı) **≤260px**, 1440×900'de **≥12 satır**, 390×844'te
yatay kaydırma yok. Özet kutuları üçü geçmez; bilgi kutuları tıklanabilir kalır.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Müşteriler Cari                     [Excel] [PDF] [Müşteri Listesi] [+ Tahsilat]│
│ Bütün müşterilerin bakiyesi tek tabloda.                                  │
│ TOPLAM ALACAK      VADESİ GEÇEN        FATURASIZ SEVKİYAT                  │
│ 1.240.500,00 TL    182.400,00 TL       96.750,00 TL  (7 sevkiyat)         │
│ ┌ Hesaplar ─────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Ünvan, VKN, telefon…]   ( Bakiyesi olanlar | Vadesi geçenler | Hepsi )│
│ │ Müşteri        Devir   Kesilen Fatura  Faturasız  Bakiye     İşlem     │ │
│ │ ABC Nakliyat   0,00    240.000,00      12.500,00  189.300,00 [Ekstre][Tahsilat]│
│ │ … 12+ satır …                                                         │ │
│ │ 24 kayıt                     Bakiye toplamı 1.240.500,00 TL · vadesi geçen 182.400,00 TL│
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

Değişiklikler: (a) üst düğmeler tek satırda ve ikincil görünümde; (b) özet kutuları yalnız
üç kutu, "vadesi geçen" kutusu süzgeci tek tıkla açar; (c) sütun sayısı ekranda 5–7 ile sınırlı,
`Devir` ve `Alınan Ödeme` varsayılan gizli (ayrıntıda görünür); (d) satır sonu düğmeleri ikon +
etiket, 44px dokunma hedefi; (e) toplam satırı tablo altında sabit kalır (`CariPage.tsx:143-152`).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ünvan, VKN, telefon; her tuşta süzer (bugün gecikme yok, `CariPage.tsx:94-97`) | — |
| Süzgeç | radyo (3) | evet | `Bakiyesi olanlar` varsayılan | — |
| Müşteri başlığı | sıralama düğmesi | — | A-Z / Z-A; `aria-sort` bildirir | — |
| Tutar başlıkları | sıralama düğmesi | — | İlk tık büyükten küçüğe | — |
| Satır | tıklanabilir | — | Müşteri ayrıntısına gider | — |
| Ekstre | ikincil düğme | — | `/customers/{id}/statement` PDF açar | "Ekstre açılamadı. Yeniden deneyin." |
| Tahsilat Ekle | birincil düğme (`write`) | — | Müşteri seçili tahsilat formu | forma ait doğrulama |
| Excel / PDF | ikincil düğme | — | Ekrandaki süzgeç+sıralama ile iner | "Dosya indirilemedi." |
| Müşteri Listesi | ikincil düğme | — | `/musteriler` | — |
| Tahsilat Gir (üst) | birincil düğme | — | `/tahsilatlar?new=1` | — |

Süzme bugün istemcide, tamamen yerelde yapılır (`CariPage.tsx:88-98`); ağ isteği yoktur, bu yüzden
gecikme (debounce) gerekmez — arama kutusu yazıldıkça süzer.

Klavye: Tab ile süzgeç → arama → tablo başlıkları → satır düğmeleri; Enter sıralar/açar; Esc açık
pencereyi kapatır; Ctrl/Cmd+Enter formu kaydeder (`ui.tsx:191-196`).
## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Yükleniyor:** `DataTable` yüklenirken satırları %50 soluk gösterir (`DataTable.tsx:126`),
  veri yokken `Spinner` (`148`). Hedef: iskelet satırlar (bkz. `29-GORSEL-SISTEM.md`).
- **Boş:** süzgece göre dört ayrı metin (`CariPage.tsx:195`): arama sonucu yok, vadesi geçen yok,
  bakiyesi olan yok (*"Hepsini görmek için 'Hepsi'yi seçin."*), hiç kayıt yok.
- **Hata:** `DataTable` `ErrorState` + *Yeniden dene* (`148`, `ui.tsx:252-263`); özet kutularının
  verisi de aynı sorgudan gelir (`79`, `refetch`).
- **Yetkisiz:** rota `Guard perm="accounting"` ile korunur (`App.tsx:94`); yetkisiz kullanıcı
  menüde öğeyi görmez (`nav.ts:79`).
- **Ayna:** bakiye pratikortam rakamıdır (`82`, kaynak `legacyBalance`), başlık değişir (`128`), özet
  iki kutuya iner ve yalnızca *Toplam alacak* ile *"Pratikortam'dan"* (son güncelleme zamanı,
  `ago(status.lastAt)`) kutularını gösterir (`163-169`), *Vadesi geçenler*
  süzgeci ve satır düğmeleri gizlenir (`184`, `133`), üst *Tahsilat Gir* gizlenir
  (`161`). Ekstre ve dışa aktarma çalışır; PDF dipnotu bunu açıklar (`CariService.cs:171-172`).
- **Lisans:** süre dolduğunda sunucu yazmayı reddeder; `Tahsilat Ekle` hata alır ve kullanıcıya
  anlaşılır metin gösterilir. Sahip modunda kısıt yok.

## 6. Metinler ve terimler

Ekranda görünecek metinler: *Müşteriler Cari*, *Bütün müşterilerin bakiyesi tek tabloda*,
*Toplam alacak*, *Vadesi geçen*, *Faturası kesilecek sevkiyatlar*, *Hesaplar*, *Bakiyesi olanlar*,
*Vadesi geçenler*, *Hepsi*, *Devir*, *Kesilen Fatura*, *İptal Fatura*, *Faturasız Sevkiyatlar*,
*Alınan Ödeme*, *Bakiye*, *Ekstre*, *Tahsilat Ekle*, *Tahsilat Gir*, *Müşteri Listesi*,
*Excel*, *PDF*, *kayıt*, *Bakiye toplamı*. Ayrıntıda: *Cari özeti*, *Toplam Borç (Faturalanan)*,
*Toplam Alacak (Tahsil Edilen)*, *Cari Bakiye*, *Vadesi Geçen*, *Hesap Ekstresi*,
*Vade Hatırlatma*, *Alıcı e-posta*, *E-postayla Gönder*, *PDF Aç*.

Yasak: "ayna", "dry-run", "token", "endpoint", "UBL" ekranda görünmez (ortak şartname §2.6).
"pratikortam" sözcüğü yalnız ayna modunda kalır; terim kararı `32-TERMINOLOJI.md` ile verilir.
*Sevkiyat* terimi kullanılır (*sefer* değil), para `tl()`/`tl2()` ile iki kuruş, tarih `03.10.2026`.

## 7. Telefon davranışı (390×844)

Bugün mobil kart görünümü vardır (`CariPage.tsx:196-205`): ünvan, altında VKN/telefon veya kırmızı
*"Vadesi geçen …"*, sağda tabular bakiye. Tablo gövdesi mobilde gizlenir
(`DataTable.tsx:101`, `hidden sm:block`). Hedef: kartın altına iki tam genişlik düğme
(*Ekstre*, *Tahsilat Ekle*); süzgeç radyoları yatay kaydırmaz, gerekirse alt çubukta tek satır.
Playwright mobil profil 375×812'dir (`client/playwright.config.ts:20`); 390×844 ölçüsü kabul
testinde ayrıca kontrol edilir. Yatay kaydırma olmamalı (`client/e2e/mobile.spec.ts`).

## 8. Erişilebilirlik ve klavye

Süzgeç grubu bugün doğru kurulmuştur: `role="radiogroup"` + `aria-label="Gösterilecek hesaplar"`
ve her düğmede `role="radio"` + `aria-checked` (`CariPage.tsx:183-190`). Hedef: (a) sıralanabilir
başlıklara `aria-sort` (`ascending`/`descending`/`none`); (b) satır düğmelerinde `aria-label`;
(c) *Vadesi geçen* bilgisi renkle birlikte metinle de verilir (bugün metin vardır, `131`);
(d) dokunma hedefi ≥44px (bugün `size="sm"` düğmeler `min-h-8`, `135-138` → hedefte yükseltilir);
(e) `:focus-visible` çerçevesi görünür kalır (`client/src/index.css:102-106`); (f) sayı sütunları
`tabular-nums` ile hizalanır (`DataTable.tsx:138`).

## 9. Testler (e2e + birim)

Mevcut kapsam:

- `client/e2e/cari.spec.ts:4-29` — menüden *Müşteriler Cari*, *Hepsi* radyosu, ilk satırda *Ekstre*
  ile `/api/customers/{id}/statement` PDF'i açılır, satır tıklaması `/musteriler/:id` adresine gider.
- `client/e2e/cari.spec.ts:31-64` — başlıktan sıralama (A-Z ve ters), Excel dosya adı
  `musteriler-cari*.xlsx`, PDF adresinde `filter=all&sort=title&desc=true` doğrulaması; ardından
  tedarikçi carisi (`/api/cari/suppliers/export`) ve fatura icmali PDF'i.
- `client/e2e/cari.spec.ts:66-96` — personel ve sabit ödeme kaydı (cari ekranıyla aynı dosyada;
  süzgeç/sıralama kapsamı dışında, regresyon için durur).
- `client/e2e/new-ui/cari-invoice.spec.ts:4-13` — satırdaki *Tahsilat Ekle* formu açar ve
  `input[name=customerId]` doludur.
- `client/e2e/new-ui/cari-invoice.spec.ts:15-36` — farklı KDV oranlı sevkiyatlar seçilince uyarı
  çıkar, *Faturayı Kes* pasif olur (faturanın bakiyeye etkisinin ön koşulu).

Eklenecek senaryolar (yeni görünüm, `client/e2e/new-ui/cari.spec.ts`, `useNewUi(page)` —
`client/e2e/helpers.ts:44-46`): *Vadesi geçenler* süzgeci yalnız vadesi geçenleri gösterir; toplam
satırı görünen satır sayısıyla uyuşur; `aria-sort` doğru değeri taşır; mobilde kart düğmeleri
görünür ve yatay kaydırma yoktur. Sunucu tarafında süzgeç+sıralama kuralı `server/YesLojistik.Tests`
içinde cari testiyle sabitlenir (`CariService.cs:131-135`). Test silme/atlama yasaktır (§3.6).

## 10. Uygulama adımları

1. **`client/src/components/DataTable.tsx:110-123`** — sıralanabilir başlıklara `aria-sort`
   ekle; aktif yön okunu `aria-hidden` yap. Süre: 1 saat.
   Doğrulama: `cd client && npm run build`.
2. **`client/src/pages/CariPage.tsx:50-66, 86`** — sütun listesini sadeleştir: `Devir` ve
   `Alınan Ödeme` varsayılan gizli, "Sütunlar" menüsünden açılabilir. Süre: 4 saat.
   Doğrulama: `cd client && npm run build && npm run lint`.
3. **`client/src/pages/CariPage.tsx:163-180`** — özet kutularını üçe indir, *Vadesi geçen*
   kutusunu süzgece bağla, kutuları `ui.tsx` `Figures`/`Figure` ile çiz. Süre: 3 saat.
   Doğrulama: `client/e2e/cari.spec.ts` yeşil.
4. **`client/src/pages/CariPage.tsx:133-140, 196-205`** — satır düğmelerini 44px dokunma hedefine
   çıkar, mobil karta iki tam genişlik düğme ekle, `aria-label` ver. Süre: 4 saat.
   Doğrulama: `E2E_BASE_URL=… npx playwright test e2e/mobile.spec.ts e2e/new-ui/cari-invoice.spec.ts`.
5. **`client/src/pages/CariPage.tsx:192-206`** — yükleniyor durumunu iskelet satırlara çevir
   (ortak parça `28-ORTAK-PARCALAR.md`'de tanımlanacak `TableSkeleton`). Süre: 3 saat.
   Doğrulama: `cd client && npm run build`.
6. **`client/src/pages/CustomerDetailPage.tsx:40-49`** — düğme sırasını ve etiketleri sadeleştir;
   *Ekstre* ile *Hesap Ekstresi* arasındaki ad farkını tek terime indir. Süre: 2 saat.
   Doğrulama: `cd client && npm run build`.
7. **`client/src/pages/CustomerDetailPage.tsx:166-225`** — ekstre penceresini sadeleştir: tarih
   aralığı ön ayarları (*Bu ay*, *Bu yıl*, *Tümü*), *Faturasız sevkiyatlar* açıklaması korunur.
   Süre: 4 saat. Doğrulama: `npx playwright test e2e/cari.spec.ts`.
8. **`client/e2e/new-ui/cari.spec.ts`** (yeni dosya) — §9'daki dört senaryoyu yaz. Süre: 4 saat.
   Doğrulama: `E2E_BASE_URL=http://localhost:5173 npx playwright test e2e/new-ui/cari.spec.ts`.
9. **`docs/plan/08-MUSTERILER-CARI.md`, `docs/GELISTIRME-PLANI.md`** — yapılanları işaretle.
   Süre: 0,5 saat. Doğrulama: `git diff --stat`.

Toplam tahmin: **~3 iş günü** (25,5 saat). Sıra bağımlılığı: 1 → 2 → 3 → 4; 6–7 bağımsızdır.

## 11. Kabul ölçütü

1. Menüden müşteri ekstresine **2 tık** (Raporlar → Müşteriler Cari → satırdaki *Ekstre*).
2. Satırdan tahsilat formuna **1 tık**; form açıldığında `input[name=customerId]` doludur.
3. 1440×900'de tabloda **≥12 satır**; üst kısım (başlık → tablo başlığı) **≤260px**.
4. 390×844'te **yatay kaydırma yok**; kart düğmeleri ≥44px yüksekliğinde.
5. Sıralanabilir her başlıkta `aria-sort` değeri doğru; sıralama A-Z ↔ Z-A çalışır.
6. Excel dosya adı `musteriler-cari.xlsx`; PDF adresi `filter`, `sort`, `desc` taşır; ikisi de
   ekrandaki süzgeçle iner.
7. Aynı anda **en fazla 3** özet kutusu; *Vadesi geçen* kutusu tek tıkla süzgeci `overdue` yapar.
8. Ayna açıkken: *Bakiye (pratikortam)* başlığı görünür, *Tahsilat Ekle* ve *Tahsilat Gir* yok,
   *Vadesi geçenler* radyosu yok, *Ekstre* ve *Excel* çalışır.
9. e2e: `client/e2e/cari.spec.ts` (3 test) + yeni `cari.spec.ts` (4 test) **7/7 yeşil**;
   `npm run build` ve `npm run lint` hatasız.
10. Ekranda teknik sözcük yok; boş durum metinleri dört süzgeç durumunun hepsini kapsar.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sütun gizleme Excel çıktısını değiştirir | Sunucu sütun listesi (`CariService.cs:94-108`) sabit | Sütunları görünür yap |
| Ayna kuralı bozulur, panel kendi bakiyesini gösterir | `bal()` (`CariPage.tsx:82`) ve sütun süzgeci (`86`) ile sunucudaki eşi (`CariService.cs:126-128`) korunur, e2e ile sabitlenir | `git revert` |
| `aria-sort` eklerken sıralama değişir | Yalnız nitelik eklenir, `onSort` imzası sabit | Nitelik kaldırılır |
| Mobil kart düğmeleri kartı şişirir | Kart yüksekliği 64–96px ile sınırlanır | Düğmeler kart altına taşınır |
| Ekstre penceresinde tarih süzgeci kaybolur | `from`/`to` alanları korunur (`CustomerDetailPage.tsx:204-210`) | Eski pencereye dön |

Her adım ayrı commit; `main`'e giden her şey canlıya çıkar (ortak şartname §1.6). Görsel
değişiklikler `data-ui="new"` arkasında geliştirilir, klasik görünüm etkilenmez.

## 13. Doğrulanacaklar

1. **Ekstre PDF'inin bakiyeye etkisi:** PDF'teki devir satırının ekrandaki `Devir` sütunuyla bire
   bir aynı olduğu doğrulanamadı; `StatementPdfGenerator.GenerateAsync` içeriği okunmalı.
2. **`uninvoiced=true` ile gelen faturasız sevkiyatların** PDF'te nasıl göründüğü
   (`26-FATURALANDIRILACAKLAR.md` ile kesişir) doğrulanmalı.
3. **Vade hatırlatma / WhatsApp:** hatırlatma metni ve WhatsApp düğmesi için onay gerekir;
   gönderilen adres ve şablon kullanıcı kararına bağlıdır.
4. **Kaç müşteri hesabı** olduğu ve 12 satır hedefinin gerçek veriyle tutup tutmadığı (gerçek veri
   kuralı gereği bu belgeye yazılmaz; pilot ölçümü `33-K0-VE-KABUL-TESTI.md`'de yapılır).
5. **`accounting` dışındaki rollerin** cari bakiyeyi görüp göremeyeceği (bugün rota kapalı,
   `App.tsx:94`) — kullanıcı kararı beklenir.
6. Yeni görünümde cari sayfasının klasikten görsel olarak ayrışması için gereken jetonlar
   (`29-GORSEL-SISTEM.md` yazılana kadar doğrulanamaz). Bugünkü tek fark, `PageHeader`'ın yeni
   görünümde alt başlığı gizlemesidir (`ui.tsx:113`); `data-ui="new"` seçicisi `index.css` içinde
   **yok** (0 eşleşme).
7. `00-DIZIN.md` §Bakım'da sözü edilen `tools/docs/referans-denetimi.ps1` betiği bu belge yazılırken
   repoda **yoktu**; sonradan eklendi (5 Ekim 2026). Betik şu komutla çalışır ve bu belgedeki bütün
   `dosya:satır` referanslarını denetler:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1
   ```

Sonraki belgeyle bağlantı: `09-TEDARIKCILER-CARI.md` aynı `CariPage.tsx` bileşenini
`kind="suppliers"` ile kullanır; bu belgedeki düzen, süzgeç ve sütun kuralları orada ödeme
sütunlarıyla tekrarlanır. Tahsilat formunun alanları `10-TAHSILAT-ODEME-FORMLARI.md`'de,
ortak parçalar `28-ORTAK-PARCALAR.md`'de tanımlanır.
