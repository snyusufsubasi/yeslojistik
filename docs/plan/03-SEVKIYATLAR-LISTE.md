# 03 — Sevkiyatlar listesi

## 1. Amaç ve kapsam

Sevkiyatlar listesi (`/seferler`, `client/src/App.tsx:87`), panelin en çok açılan ekranıdır: firmanın
bütün taşımaları burada durur. Amaç, bu ekranı pratikortam'daki "İş Listesi" kadar tanıdık ama ondan
sade hâle getirmektir. Ekran, `docs/plan/01-ORTAK-SARTNAME.md` §5'teki en sık 10 işten üçünü karşılar:

- **2. Bugünkü sevkiyatları görmek → 1 tık:** menüden "Sevkiyatlar", sonra "Bugün" zaman çipi.
- **3. Sevkiyat durumunu ilerletmek → satırdaki düğme, 1 tık.**
- **4. Sevkiyat bulmak (plaka/firma) → yaz, Enter:** tek arama kutusu.

Kapsam: sayfa başlığı ve üst eylem alanı (PageShell + "⋯ Diğer" + tek ana düğme), FilterBar ve
FilterPanel + açık süzgeç çipleri, satır sonu menüsü, durum ilerletme düğmesi, UETDS rozetinin
listeden kaldırılması, **Liste / Pano / Harita** sekmeleri ve 1440×900'de en az 12 satır görünmesi.

Kapsam dışı: sevkiyat formunun iç düzeni (`04-SEVKIYAT-FORMU.md`), fatura ekranları (`05`, `06`),
harita sayfasının kendisi (`13-HARITA-TAKIP.md`), sayaç kutuları (`06`). Bu belge **kod değiştirmez**.

## 2. Bugünkü durum (kod kanıtıyla)

**İskelet.** Sayfa `PageHeader` kullanır (`client/src/pages/TripsPage.tsx:339-357`); yeni görünümde
(`isNew`, satır 89) sağ tarafa `MoreMenu` (satır 341-348) + tek ana düğme (satır 349, "Sevkiyat Ekle")
konur. Klasik görünümde ise başlıkta **altı ayrı düğme** vardır (satır 350-357): `ExportButton` ·
`PdfButton` "Sevkiyat PDF" · `PdfButton` "İcmal" · `ImportButton` · "Fatura Kes" · "Yeni Sevkiyat".
Yeni görünümdeki tek ana düğme bu kalabalığı sadeleştirir.
**`PageShell` ve `DetailDrawer` kodda YOK** (`01-ORTAK-SARTNAME.md` §3.3); başlık + sekmeler + menü +
düğme bugün üç ayrı yerden yönetiliyor.

**Sekmeler.** Sayfa içi görünüm anahtarı iki seçenek taşır: `[['list','Liste',List],['board','Pano',Columns3]]`
(satır 327-335, dizinin kendisi satır 329); tercih `yes.tripView` içinde tutulur (satır 79-81).
Ayrıca `PageHeader` → `SectionTabs`
(`client/src/components/ui.tsx:132`) bölüm sekmelerini çizer; sevkiyat bölümünün sekmeleri
`Sevkiyat Listesi` ve `Harita`'dır (`client/src/lib/sections.ts:25`). Yani **"Harita" bugün sayfa içi
anahtarda değil, üstteki bölüm sekmelerinde** durur ve `/harita` adresine gider (`App.tsx:90`).

**Süzgeç yüzeyi.** Yeni görünümde `FilterBar` satır 378-381'de, sağdan açılan `FilterPanel` satır
466-468'de, klasik ızgara süzgeçler satır 397-408'dedir. Süzgeç durumu adreste tutulur
(`?status=…&ownership=…`, satır 47-58; adrese yazma 112-122; `clearFilters` 123-127); çipler satır
292-309'de **üretilir** (`Durum: …`, `Müşteri: …`, `Yükleme: …`), 310-312'de tarih çipi eklenir ve
`FilterBar`'a `chips={chips}` olarak verilir (satır 380). "Süzgeç (n)" düğmesi `FilterPanel.tsx:14-17`'de
`aria-haspopup="dialog"` taşır; `n` = `chips.length`.

**Kazanç şeridi.** `totals` ucu (satır 159) `EarningsStrip` ile çizilir (satır 410-411, 569-583);
şerit bugün bütün kalemleri (satış, araç/taşeron maliyeti, komisyon, ek masraf, şoför primi, masraf,
kazanç) yan yana dizer; yeni görünüm için sadeleştirme yapılmamıştır.

**Tablo.** `DataTable` (satır 412-436) 20 satır sayfalar (`pageSize: 20`, satır 157; tabloya geçirilmesi
satır 415), sıralama varsayılanı `loadingDate` azalan (satır 77), seçim `useRowSelection` (satır 107-109).
Sütunlar satır 223-234: Tarih / No · Müşteri · Güzergah · Araç / Şoför · Durum · Tutar / Kâr; "Detay"
açıkken ek sütunlar gelir (fatura başlığı 508, ürün + açıklama 511-519, komisyon / masraf / fatura
bilgisi / kaydı giren 522-545). Satır yüksekliği ikincil satırlar yüzünden büyür ("No …", şoför adı,
Ref, komisyon, "Eski kayıt").

**Satır sonu.** `can('operations')` ise işlem sütunu eklenir (satır 235-258). Durum ilerletme düğmesi
zaten **tek** düğmedir: `nextStatuses` içinden Planlandı/İptal/Teslim hariç ilkini gösterir (satır
239-243). Yeni görünümde `RowMenu` maddeleri Düzenle · Kopyala (aynısından yeni sevkiyat) · Şoför
bilgisini kopyala · Sil'dir (satır 244-250); klasikte iki `IconButton` vardır: Şoför bilgisini kopyala ve
Düzenle (satır 251-254, sıra koddaki gibidir).

**UETDS rozeti.** `UetdsBadge` bileşeni satır 35-42'de tanımlıdır ve durum sütununda **yalnız klasik
görünümde** çizilir: koşul `UETDS_READINESS && !isNew` (satır 230); aynı hücrede fatura bilgisi ve
"Eski kayıt" rozeti de vardır. Özellik anahtarı
`client/src/lib/features.ts:6` içinde `true`'dur. Yani "rozet listeden kaldırılsın" işinin yarısı
koda girmiş; rozet ve "U-ETDS eksik olanlar" süzgeci (satır 287-288,
`Select` + `aria-label="U-ETDS hazırlığı"`) durmaktadır. Süzgeç `?uetds=missing` adresini kullanır
(satır 72, 106).

**Görsel temel yok.** `client/src/index.css` içinde `html[data-ui="new"]` seçicisi bulunmaz (yalnız
`data-text` satır 92-93 ve `:focus-visible` satır 102-106); bu yüzden iki görünüm arasında bugün sadece
yerleşim farkı vardır (`docs/plan/29-GORSEL-SISTEM.md` bunu kapatır).

## 3. Hedef yerleşim

```
┌───────────────────────────────────────────────────────────────┐
│ Sevkiyatlar                        [⋯ Diğer] [+ Sevkiyat Ekle]│
│ Sevkiyat Listesi │ Harita     ← bölüm sekmeleri (SectionTabs)  │
│ [ Liste │ Pano │ Harita ]  [Bugün|Gelecek|Geçmiş|Bu ay|Hepsi] │
│ [🔍 Müşteri, plaka, şoför, sevkiyat no...]      [Süzgeç (2)]  │
│ (Müşteri: ABC ✕) (Durum: Yolda ✕)      Süzgeci temizle        │
│ SATIŞ … │ MALİYET … │ KAZANÇ … │ FATURASI KESİLECEK …  Ayrıntı▾│
│ ┌ tablo ──────────────────────────────────────────────────────┐│
│ │ ☐ Tarih/No Müşteri Güzergâh Araç/Şoför Durum Tutar/Kâr   ⋯ ││
│ └─────────────────────────────────────────────────────────────┘│
│ Toplam 128 kayıt             Sayfa 1 / 7   ‹Önceki  Sonraki›  │
└───────────────────────────────────────────────────────────────┘
```

Ölçüler: başlık → tablo başlığı **≤260px** (`01-ORTAK-SARTNAME.md` §5); tablo başlığı `.th` ile ~38px
(`index.css:119`), hedef satır yüksekliği **≤44px** (`.td` dolgusu 7px+7px, `index.css:120`).
12 × 44 + 260 + 38 + sayfalama ~42 = ~868px, yani 900px'e sığar. Sayfa boyu 20 satırdır (satır 157).

Yer değişiklikleri:

1. `PageHeader` + ayrı sekmeler + ayrı görünüm anahtarı yerine tek `PageShell` (28 numaralı belge).
2. "Özet / Detay" anahtarı başlık altındaki satırdan (satır 358-369; düğmeler 361-367) kalkar; yalnız
   "⋯ Diğer" maddesi olarak kalır — bu maddeler bugün "Kısa liste (özet sütunlar)" / "Ayrıntılı liste
   (tüm sütunlar)" adını taşır (satır 345, `MoreMenu` içinde zaten var; çift kaynak biter).
3. Kazanç şeridi yeni görünümde **4 kutu** + "Ayrıntı ▾" olur; diğer kalemler katlanır.
4. Pano görünümündeki ikinci arama kutusu ve müşteri seçicisi (satır 371-375) kaldırılır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Müşteri, plaka, şoför, adres, sevkiyat no; 300ms gecikmeli (satır 97-98) | — |
| Zaman çipleri | radyo grubu | hayır | Bugün/Gelecek/Geçmiş/Bu ay/Hepsi; `from`/`to` adrese yazılır (satır 161-167, 313-325) | — |
| Süzgeç (n) | düğme | hayır | Sağdan `FilterPanel` açar; n = açık çip sayısı (`FilterPanel.tsx:14-17`, satır 380 ve 466) | — |
| Süzgeç çipleri | düğme | hayır | Tıklayınca o süzgeç kalkar; "Süzgeci temizle" hepsini siler (satır 292-312) | — |
| Liste / Pano / Harita | sekme | — | Görünümü değiştirir; adres `?gorunum=` ile paylaşılabilir olur | — |
| ⋯ Diğer | menü | — | Excel (liste), Sevkiyat PDF, İcmal, "Kısa liste (özet sütunlar)" / "Ayrıntılı liste (tüm sütunlar)", Excel'den aktar¹, Fatura Kes² |
| + Sevkiyat Ekle | ana düğme | — | `operations` yetkisi; `?new=1` gibi formu açar (satır 85, `hooks.ts:90-101`) | "Bu işlem için yetkiniz yok." |
| Satır: durum düğmesi | düğme | — | Sıradaki durum: "Yüklendi yap", "Yola çıktı yap", "Teslim edildi yap" | "Sevkiyat durumu güncellenemedi." |
| Satır: ⋯ menü | menü | — | Bugün (yeni görünüm): Düzenle · Kopyala (aynısından yeni sevkiyat) · Şoför bilgisini kopyala · Sil (satır 244-250). Hedef: + Evrak · Takip linki · Sevk belgesi PDF | — |
| Seçim çubuğu | onay kutusu | — | Teslim evrakını onayla · Durumu ilerlet · Fatura kes · Toplu ödeme · Excel'e aktar (satır 214-221) | "Seçilen sevkiyatlar farklı müşterilere ait…" (satır 200) |

¹ `write` + `operations` (`TripsPage.tsx:346`), ayna modunda gizlenir. ² `write` + `accounting`
(satır 347). Satır menüsündeki "Evrak", "Takip linki" ve "Sevk belgesi PDF" maddeleri bugün formun
içindedir; uçları hazırdır: `/trips/{id}/attachments` (`TripExtras.tsx:21`),
`POST /trips/{id}/tracking-link` (`TrackingController.cs:20`), `GET /trips/{id}/waybill`
(`TripsController.cs:103`). Yeni uç gerekmez.

Klavye: `Ctrl+Enter` kaydeder (`Modal`), `Esc` menüyü/paneli kapatır (`Menu.tsx:28`,
`FilterPanel.tsx:39`); menüde `↑`/`↓` gezinir, açılırken ilk madde odaklanır (`Menu.tsx:21, 25-30`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste (3 metin, satır 417-422):** süzgeçliyse "Bu filtrelere uyan sevkiyat yok. Filtreleri
  temizlemeyi deneyin."; süzgeçsizse "Bu görünümde sevkiyat yok."; hiç kayıt yoksa `FirstUse` kartı.
- **Yükleniyor:** hedef 8 satırlık gri iskelet; bugün iskelet **yok** — `DataTable` `tbody`'yi
  `opacity-50` ile soluklaştırır (satır 126) ve kayıt gelmediyse `Spinner` çizer (`DataTable.tsx:148`).
- **Hata:** `error` + `onRetry` ile `ErrorState` (satır 62, `DataTable.tsx:148`).
- **Yetkisiz:** `operations` yoksa işlem sütunu ve "+ Sevkiyat Ekle" çizilmez (satır 235, 349);
  `accounting` yoksa para kalemleri gizlenir (satır 410, `showMoney` satır 571).
- **Ayna:** `write` maddeleri gizlenir (`Menu.tsx:16`); "+ Sevkiyat Ekle" kalır ama kayıt yazılamaz.
- **Lisans:** süre dolunca salt okunur; liste ve dışa aktarma çalışır (`docs/LISANS.md`).

## 6. Metinler ve terimler

Ekranda görünecek tam metinler: "Sevkiyatlar" (başlık), "Sevkiyat Listesi" / "Harita" (bölüm
sekmeleri), "Liste" / "Pano" / "Harita" (görünüm), "Bugün" / "Gelecek" / "Geçmiş" / "Bu ay" / "Hepsi",
"Süzgeç", "Süzgeci temizle", "Listeyi göster", "Diğer", "Sevkiyat Ekle", "Yüklendi yap" /
"Yola çıktı yap" / "Teslim edildi yap", "Düzenle", "Kopyala (aynısından yeni sevkiyat)",
"Şoför bilgisini kopyala", "Evrak", "Takip linki",
"Sevk belgesi PDF", "Sil", "İşlemler", "Seçilen kayıtlar", "Toplam N kayıt", "Sayfa N / M".

Bugün ekranda olan (ve yeni görünümde sadeleşecek) metinler de koda göre sayılır: "Klasik" görünümde
başlık düğmeleri "Yeni Sevkiyat", "Fatura Kes", "İcmal", "Sevkiyat PDF"tir (satır 351-356); ⋯ Diğer
maddesi "Ayrıntılı liste (tüm sütunlar)" / "Kısa liste (özet sütunlar)" (satır 345) ve süzgeç tarafında
"Ayrıntılı süzgeç (n)" (satır 402) metinleri geçer. Bunlar yeni görünümde yukarıdaki listeye indirilir.

Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` ile uyumludur: "Sefer" değil
**Sevkiyat**, "Firma" yerine **Müşteri**. Durum etiketleri `client/src/lib/labels.ts:3-9`'dan gelir.
Teknik sözcük yasak: ekranda "ayna", "dry-run", "UBL", "token", "endpoint" geçmez. Para `tl()` ile iki
kuruş, tarih `03.10.2026`, plaka `PlateBadge`.

## 7. Telefon davranışı (390×844)

Bugün telefonda tablo yerine kart çizilir (`mobileCard`, satır 423-436): tarih + plaka, müşteri,
güzergâh, şoför, tutar/kâr. `DataTable` kart listesini `sm` altında gösterir, tabloyu `hidden sm:block`
yapar (`DataTable.tsx:101`). Süzgeç paneli telefonda tam ekrandır (`w-full … sm:w-[400px]`,
`FilterPanel.tsx:49`), alt çubukta "Listeyi göster" vardır.

Hedef: kart ~96px, dokunma hedefi ≥44px, kartta da tek durum düğmesi ve tek "⋯"; zaman çipleri yatay
kaydırmaz. `client/e2e/mobile.spec.ts:12-14` `/seferler` için yatay taşmayı ölçer.

## 8. Erişilebilirlik ve klavye

- Görünüm anahtarı `role="tablist"` + `role="tab"` + `aria-selected` (satır 328-333); zaman çipleri
  `role="radiogroup"` + `role="radio"` + `aria-checked` (satır 314-318).
- Arama kutusunun `aria-label`'ı placeholder metnidir (`DataTable.tsx:183`); süzgeç kutusu
  `aria-haspopup="dialog"` (`FilterPanel.tsx:14`), panel `role="dialog" aria-modal="true"`
  (`FilterPanel.tsx:48`).
- Menü klavyeyle açılır, ilk madde odaklanır, `Esc` kapatır (`Menu.tsx:21, 28`); odak halkası
  `:focus-visible` ile 3px (`index.css:102-105`).
- Dokunma hedefi: `min-h-10` = 2,5 × 17,5px ≈ **44px** (`index.css:91`, `Menu.tsx:56`).
- Renk körlüğü: durum yalnız renkle değil **rozet + metin** ile verilir (`labels.ts:80-86`). Bir
  satırda en fazla 1 durum rozeti kuralı korunur.

## 9. Testler (e2e + birim)

Mevcut e2e (Playwright, `client/e2e`, **19 spec / 58 test** — `01-ORTAK-SARTNAME.md` §3.6; sayım
`client/e2e` altındaki `*.spec.ts` dosyalarındaki `test(...)` çağrılarıdır, `new-ui/` altındaki
`cari-invoice.spec.ts` ve `trip-copies.spec.ts` dahil):

- `new-ui/basics.spec.ts:38-56` — süzgeç paneli, çip ve satır menüsü (yeni görünüm).
- `trips.spec.ts:4-44` — süzgeçlerin adreste kalması, ayrıntılı süzgeç, Detay ("Kaydı giren" sütunu)
  hatırlama; satır 32'de "Detay" radyosuna basar.
- `bulk.spec.ts:28-65` — toplu teslim evrakı onayı ve fatura kesme; **satır 34 klasik görünümün
  arama placeholder metnine bağlıdır** ("Müşteri, plaka, şoför, adres...").
- `uetds.spec.ts:33, 59` — klasik görünümdeki rozet metinlerini ("UETDS 2 eksik" / "UETDS hazır")
  doğrular; rozet yalnız yeni görünümde kaldırılacağı için bozulmaz.
- `mobile.spec.ts:4-20` — yatay taşma yok (satır 12-14 ölçüm, satır 4 listesinde `/seferler` vardır).

Eklenecek: `client/e2e/new-ui/trips-list.spec.ts` (yeni dosya, `useNewUi` yardımcısı
`helpers.ts:44-46`), 6 test: (1) üç sekme görünür ve `?gorunum=pano` çalışır; (2) ⋯ Diğer'de 6 madde
var ve "Kısa liste / Ayrıntılı liste" maddesi sütunları değiştirir; (3) 1440×900'de `tbody tr` sayısı ≥12 ve ilk satır
yüksekliği ≤44px; (4) satırdaki tek durum düğmesi durumu ilerletir ve rozet güncellenir; (5) yeni
görünümde "UETDS" metni `tbody` içinde hiç geçmez, süzgeç panelinde "U-ETDS eksik olanlar" durur;
(6) satır ⋯ menüsünde 6 madde var ve "Sevk belgesi PDF" PDF isteği üretir (`expectPdfOpens`,
`helpers.ts:24-29`). Test silme/atlama yasaktır; metin değişen testler aynı commit'te güncellenir.
Birim testi gerekmez (sunucu sözleşmesi değişmiyor); `npm run lint && npm run build` zorunludur.

## 10. Uygulama adımları

1. **`client/src/components/shell/PageShell.tsx` (yeni).** Başlık + bölüm sekmeleri + `more` menüsü +
   tek `primary` düğme tek bileşende. *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
2. **`TripsPage.tsx:339-357`.** `PageHeader` yerine `PageShell`; `more` maddeleri satır 341-348'den
   taşınır. *Süre: 2 saat.* Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
3. **`TripsPage.tsx:327-335`.** Üçüncü sekme "Harita" ve `?gorunum=` adres desteği yazılır
   (`yes.tripView` geriye dönük okunur). *Süre: 3 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/trips-list.spec.ts`.
4. **`TripsPage.tsx:358-369`.** Özet/Detay satırı kaldırılır; yalnız ⋯ Diğer maddesi kalır (satır 345).
   *Süre: 1 saat.* Doğrulama: `grep -n "Ayrıntılı liste" client/src/pages/TripsPage.tsx`.
5. **`TripsPage.tsx:569-583`.** `EarningsStrip` yeni görünümde 4 kutu + "Ayrıntı ▾"; klasik aynı kalır.
   *Süre: 3 saat.* Doğrulama: `npx playwright test e2e/trips.spec.ts`.
6. **`TripsPage.tsx:230, 287-288, 35-42`.** Rozet yeni görünümde çizilmez (satır 230'da `!isNew` ile
   zaten böyle); süzgeç maddesi korunur. *Süre: 1 saat.*
   Doğrulama: `npx playwright test e2e/uetds.spec.ts`.
7. **`TripsPage.tsx:244-250`.** Satır menüsüne "Evrak", "Takip linki", "Sevk belgesi PDF" eklenir;
   mevcut uçlar kullanılır. *Süre: 3 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/trips-list.spec.ts e2e/tracking.spec.ts`.
8. **`TripsPage.tsx:223-234, 423-436`.** Satır yoğunluğu: ikincil satır en fazla 1; telefonda kart
   düzeni sadeleşir. *Süre: 3 saat.* Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
9. **`client/e2e/new-ui/trips-list.spec.ts` (yeni, 6 test).** Bölüm 9'daki senaryolar. *Süre: 4 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/trips-list.spec.ts`.
10. **`client/e2e/bulk.spec.ts:34`.** Yeni görünüm varsayılan olunca arama placeholder'ı güncellenir.
    *Süre: 0,5 saat.* Doğrulama: `npx playwright test e2e/bulk.spec.ts`.

Toplam tahmin: **~24 saat (3 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası:
testler → commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 1440×900'de (yazı boyutu Normal) ilk ekranda **en az 12 `tbody tr`**; ilk satır yüksekliği
   **≤44px**; başlıktan tablo başlığına **≤260px** (`page.locator('tbody tr').first().boundingBox()`).
2. Başlıkta **tek ana düğme** ve **tek "⋯ Diğer"** menüsü; ⋯ Diğer'de **6 madde**. Klasikteki 6
   düğmeli satır (satır 351-356) yeni görünümde görünmez.
3. Listede **hiçbir satırda** "UETDS" geçmez (`tbody` içinde sayı 0); süzgeç panelinde "U-ETDS eksik
   olanlar" durur ve `/seferler?uetds=missing` çalışır.
4. Durum ilerletme **1 tık**: satır düğmesine basınca toast görünür ve rozet değişir; sayfa yenilenmez.
5. Üç görünüm sekmesi çalışır: Liste, Pano, Harita; her biri adrese yazılır, geri tuşuyla döner.
6. Süzgeçler kaybolmaz: panelde **en az 16** alan vardır (bugünkü `mainFilters` 8 — satır 260-274 —
   + `moreFilters` 10 — satır 275-289 — = **18**; `FilterPanel` ikisini birden basar, satır 467).
7. Süzgeçler adreste kalır: yenilemede `?status=…&loading=…` aynen geri gelir.
8. Yatay kaydırma yok: 390×844'te `mobile.spec.ts` geçer.
9. e2e: **58 mevcut + 6 yeni = 64 test yeşil**; test silinmez/atlanmaz.
10. `npm run lint && npm run build` temiz; `TripsPage` içinde teknik sözcük yok.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| 12 satır hedefi tutmaz (ikincil satırlar satırı şişirir) | Satır başına en fazla 1 ikincil satır; yükseklik e2e ile ölçülür | İkincil satırlar "Detay"a taşınır; `pageSize` 20 kalır |
| Harita sekmesi bölüm sekmeleriyle çakışır | `SectionTabs`'ta kalan sekme "Sevkiyat Listesi" olur ya da sayfa içi sekme `/harita`'ya gider | Sayfa içi sekme kaldırılır, `sections.ts:25` hâli korunur |
| Klasik metinlere bağlı testler kırılır (`bulk.spec.ts:34`) | Aynı commit'te placeholder güncellenir | Güncelleme geri alınır, `DEFAULT_UI_MODE` klasikte kalır |
| `PageShell`/`DetailDrawer` yok; satıra tıklayınca liste kaybolur | Adım 1 ile `PageShell` gelir; panel işi bitene kadar bugünkü pencere kullanılır | `TripsPage` bugünkü `TripForm` penceresine döner |
| `data-ui="new"` jetonları yok → görsel fark görünmez | Önce `29-GORSEL-SISTEM.md` uygulanır | Yerleşim değişiklikleri `isNew` koşuluyla geri alınır |

## 13. Doğrulanacaklar

1. **Harita sekmesi nereye bağlanacak?** Sayfa içi üçüncü sekme mi, bugünkü bölüm sekmesi mi kalacak?
   Bugün yalnız `sections.ts:25` üzerinden `/harita` vardır; `MapPage` araç takibi gösterir.
2. **Kazanç şeridinin 4 kutusu hangi etiketlerle?** `KOLAYLASTIRMA-PLANI.md:152` "Müşteri Fiyat ·
   Tedarikçi Fiyat · Kazanç · Faturası Kesilecek", `KOLAYLASTIRMA-UYGULAMA.md:292` ise "Satış ·
   Maliyet · Kazanç · Faturası Kesilecek" diyor; kodda "Satış" ve "Araç / taşeron maliyeti" geçer
   (`TripsPage.tsx:572`).
3. **Satır menüsündeki "Evrak" ne açacak?** Dosya paneli mi (`TripExtras` içeriği) yoksa ayrıntı
   panelinin "Evrak" sekmesi mi (`28-ORTAK-PARCALAR.md`)?
4. **Satıra tıklama.** `KOLAYLASTIRMA-PLANI.md:159` "sağdan ayrıntı paneli açılır" diyor ama
   `DetailDrawer` kodda yok; panel gelene kadar bugünkü pencere mi açılacak?
5. **"Satır sıklığı: Rahat" ayarı** kodda bulunamadı; 12 satır ölçütü hangi yazı boyutunda
   doğrulanacak (Normal 17,5px mi, Büyük 19px mi — `index.css:91-93`)?
6. **`?gorunum=pano`** `KOLAYLASTIRMA-UYGULAMA.md:233`'te isteniyor ama kodda yok (`grep` sonuçsuz);
   adres anahtarının tam adı onaylanmalı.
7. **`bulk.spec.ts:34` ve `uetds.spec.ts`** klasik metinlere bağlı; klasik görünüm kaldırılınca hangi
   sırayla güncellenecek (`34-RISK-GUVENLIK.md`)?
8. **Bu belgenin atıfları.** `docs/plan/` dizininde bugün yalnız `00-DIZIN.md` … `08-MUSTERILER-CARI.md`
   vardır; bu metinde adı geçen `13-HARITA-TAKIP.md`, `28-ORTAK-PARCALAR.md`, `29-GORSEL-SISTEM.md`,
   `32-TERMINOLOJI.md` ve `34-RISK-GUVENLIK.md` **henüz yazılmamıştır** (bağlantılar kırıktır; belge
   yazıldıkça buradaki numaralar kontrol edilmeli). Ayrıca `KOLAYLASTIRMA-PLANI.md` ve
   `KOLAYLASTIRMA-UYGULAMA.md` `docs/` kökündedir, `docs/plan/` altında değil.

Sonraki belgeyle bağlantı: `04-SEVKIYAT-FORMU.md` bu listenin "+ Sevkiyat Ekle", satır "Düzenle",
"Kopyala" ve `?new=1` yollarını devralır; `28-ORTAK-PARCALAR.md` `PageShell` ile satır menüsünün
sözleşmesini, `29-GORSEL-SISTEM.md` yeni görünümün jetonlarını, `13-HARITA-TAKIP.md` ise "Harita"
sekmesinin veri kaynağını tanımlar.
