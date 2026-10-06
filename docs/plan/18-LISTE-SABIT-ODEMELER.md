# 18 — Sabit ödemeler

## 1. Amaç ve kapsam

Bu belge, panelin **Sabit Ödeme Listesi** ekranını (`/sabit-odemeler`,
`client/src/pages/RecurringPaymentsPage.tsx`) tarif eder. İşi tek cümleyle: *"Her ay tekrar eden
ödemeleri bir kez tanımla; hangi ay ödendi, hangisi gecikti — tek bakışta gör."* Kullanıcı bu ekrana
yeni menüde **Listeler → Sabit Ödeme Listesi** (`client/src/lib/nav.ts:96`), klasik menüde
**Listeler → Sabit Ödemeler** (`nav.ts:46`) yolundan gider; yeni görünümde başlık *Sabit Ödeme
Listesi* olur (`client/src/lib/sections.ts:47`, `client/src/components/ui.tsx:112`), klasikte *Sabit
Ödemeler* kalır (`RecurringPaymentsPage.tsx:55`).

Kapsanan işler:

- **Tekrarlayan ödeme tanımı:** kira, kasko taksiti, muhasebe ücreti gibi kalemler bir kez girilir
  (`:80-88`).
- **Ay bazında durum:** seçilen ayda kalem *Ödendi · tarih*, *Gecikti*, *Bekliyor* ya da pasifse *—*
  görünür (`:41-44`).
- **"Ödendi" → gider kaydı:** düğmeye basınca o ay için **gider** açılır; hesap seçildiyse kasa/banka
  bakiyesinden düşer (`server/YesLojistik.Api/Controllers/StaffController.cs:170-184`).
- **Toplu görünüm:** üç özet kutusu ve tek tablo (`:57-61`, `:65`).
- **Ortak liste iskeleti:** `CustomersPage`, `SuppliersPage`, `DriversPage`, `StaffPage` ve bu sayfa
  aynı iskeleti paylaşır (`docs/KOLAYLASTIRMA-UYGULAMA.md:349-356`).

Kapsam dışı: personel (`17-LISTE-PERSONEL.md`), giderler (`20-OZ-MAL-GIDERLER.md`), hesaplar
(`11-BANKALAR.md`), tahsilat/ödeme (`10-TAHSILAT-ODEME-FORMLARI.md`), Excel (`30-VERI-API.md`),
ortak parçalar (`28-ORTAK-PARCALAR.md`). Bu belge **kodu değiştirmez**.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** Rota `accounting` yetkisiyle korunur (`client/src/App.tsx:97`); yetkisiz kullanıcı
`/` adresine yönlenir (`App.tsx:65-68`). Menü öğesi de `perm: 'accounting'` taşır (`nav.ts:46`,
`:96`). Sunucuda beş ucun tamamı sınıf düzeyinde `Policies.Accounting` ister
(`StaffController.cs:119-122`); bu sınıf için ayrı yetki testi yoktur (`StaffTests.cs:37-54`).

**Ekran iskeleti.** Sayfa `PageHeader` + üç `StatCard` + tek `Card` içinde `DataTable` kurar
(`:54-73`); başlıktaki tek düğme *Sabit Ödeme Ekle*'dir (`:56`, `Button write`). Sayfa **`PageShell`
kullanmaz**; çünkü `PageShell` kodda **yoktur** (`01-ORTAK-SARTNAME.md:143-144`) — §10'da *eklenecek*
yazılır. Alt başlık düz metindir (`:55`), yeni görünümde gizlenir (`ui.tsx:113`); `/sabit-odemeler`
hiçbir bölümde geçmediği için (`sections.ts:10-33`) bölüm sekmeleri çizilmez (`SectionTabs.tsx:13`).

**Ay seçimi ve veri.** Ay `thisMonth()` ile başlar (`:20`, `format.ts:17-20`); istek
`GET /recurring-payments?month=YYYY-AA` biçimindedir (`:26`). Sunucu ayı aralığa çevirir
(`StaffController.cs:20-24`, `:127`) ve aktifler önce, sonra gün, sonra başlık sıralar (`:129`). Her
istekte **bağlı bütün giderler** okunur (`:130-131`): SQL'de ay süzgeci yoktur, daraltma bellekte
yapılır (`:134`).

**Tablo ve özet.** Beş sütun (`:34-51`): *Ödeme günü*, *Başlık* (pasifse *Pasif* rozeti +
`gider türü · detay · hesap`), *Tutar*, *Bu ay*, işlem. Durum kararı `:41-44`'te: ay içinde ödeme
varsa *Ödendi · tarih*, pasifse *—*, gün geçmişse *Gecikti*, aksi hâlde *Bekliyor*. `r.dueDate <
today` metin karşılaştırmasıdır; iki değer de `yyyy-aa-gg` olduğu için doğru çalışır (`:32`, `:44`).
Satır sonunda yalnız ödenmemiş aktiflerde *Ödendi* düğmesi (`:47`) ve `write` işaretli *Düzenle*
ikonu (`:48`) durur; **arama, sıralama, sayfalama, dışa aktarma yoktur** (`:65`). Üstteki üç
`StatCard` (`ui.tsx:302-316`) bu ayın toplamını ve ödenmeyeni yalnız aktiflerden sayar (`:58-59`);
*Ödenen* ise **pasifleri de** katar (`:60`). F4.1 bu kutuların `Figures`/`Figure` ile değiştirilmesini
ister (`KOLAYLASTIRMA-UYGULAMA.md:356`; `ui.tsx:322-338`).

**Tanım formu.** Yedi alan (`:114-131`): *Başlık* (zorunlu), *Aylık tutar*, *Ayın kaçında ödenir?*
(1-28), *Gider türü*, *Genelde hangi hesaptan ödenir?* (`:92`), *Detay*, *Aktif/Pasif*. Kaydet
`POST`/`PUT /recurring-payments` çağırır (`:109-110`); silme onayı geçmiş ödemelerin gider olarak
kaldığını söyler (`:132-133`). Sunucu kuralları `Validators.cs:509-519`'da: başlık zorunlu en çok 150
karakter, detay 500, tutar > 0, gün 1-28, tür enum içinde.

**Açık uyuşmazlık (kanıtlı).** Form yalnız **altı** gider türü sunar (`:21`, `:125`); istemci şeması
ve sunucu **dokuz** türü kabul eder (`:85`, `Validators.cs:517`). *Şoför Harcırahı*, *Şoför Avansı* ve
*Lastik* arayüzden seçilemez; bu türlerle kayıtlı kalem düzenlenirse hiçbir seçenek işaretli görünmez.

**"Ödendi" akışı.** Pencere tutar, tarih ve hesap sorar (`:150-155`); varsayılan tarih, seçili ay bu ay
ise bugün, değilse kalemin o aydaki ödeme günüdür (`:144`). Kaydet
`POST /recurring-payments/{id}/pay` çağırır; üç sorgu tazelenir (`:146-147`). Sunucu hesabı istekte
yoksa kalemin varsayılanından alır (`StaffController.cs:175-176`) ve gideri yazar: tarih, kategori,
tutar, açıklama = başlık, `RecurringPaymentId`, hesap, `PaidBy = Company`,
`ApprovalStatus = Approved` (`:177-181`). KDV oranı **atanmaz**, kategori varsayılanı uygulanır
(`Expense.cs:8-9`). Ödeme ucu yalnız tutarı doğrular (`Validators.cs:521-527`) — tarih serbesttir.
Silme yumuşaktır (`StaffController.cs:165`); geçmiş giderler bağlı kalır, ilişki `OnDelete(SetNull)`
(`AppDbContext.cs:359`). DTO `DueDate`, `PaidDate`, `PaidAmount`, `LastPaidDate` taşır
(`StaffDtos.cs:17-19`; `client/src/api/types.ts:1012-1015`); *son ödeme tarihi* ekranda **hiç
gösterilmez**.

**Ayna ve dışa aktarma.** Ayna modunda `Button write` ve `IconButton write` gizlenir (`ui.tsx:31-32`,
`:47-48`) — *Sabit Ödeme Ekle* (`:56`) ve *Düzenle* (`:48`) kaybolur. **İki boşluk var (kanıtlı):**
(a) *Ödendi* düğmesinde `write` **yoktur** (`:47`); (b) koruma listesinde `/api/staff` **vardır** ama
`/api/recurring-payments` **yoktur**
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`) — ayna açıkken ödeme sunucuda da
reddedilmez. Dışa/içe aktarma da yoktur: `ExportButton` **kullanılmaz**,
`/recurring-payments/export` ucu **yoktur** (`StaffController.cs:124-184`); `ImportEntity`
birleşiminde `recurring-payments` yoktur (`ImportDialog.tsx:8`) ve sunucu anahtarı tanımaz
(`ImportService.cs:320-330`).

## 3. Hedef yerleşim

İlke: üst kısım (başlık → tablo başlığı) **≤260px**, 1440×900'de **≥12 satır**, 390×844'te yatay
kaydırma yok (`01-ORTAK-SARTNAME.md:236-238`).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sabit Ödeme Listesi                  [⋯ Diğer]  [+ Sabit Ödeme Ekle]     │
│ [🔍 Başlıkta ara] [Ay: 10.2026] [ Süzgeç (1) ] [ ] Arşivdekileri göster   │
│ (Gider türü: Sigorta ✕)  Süzgeci temizle                                  │
│ BU AYIN TOPLAMI …  ÖDENMEYEN …  ÖDENEN …  GECİKEN …                       │
│ │ Gün  Başlık         Gider türü  Tutar       Bu ay     ⋯               │
│ │ 05   Ofis kirası    Diğer       25.000,00   Ödendi    ⋯               │
│ │ 10   Kasko taksiti  Sigorta      4.250,00   Gecikti   ⋯               │
└──────────────────────────────────────────────────────────────────────────┘
```

Değişiklikler: (a) üst şerit `PageShell` ile tek satıra iner, `MoreMenu` (`Menu.tsx:52-61`) ve
`FilterBar` (`FilterPanel.tsx:7-32`) buraya taşınır; (b) üç `StatCard` yerine dört kutulu `Figures`
şeridi gelir (*Geciken* eklenir); (c) arama, tür süzgeci ve "Arşivdekileri göster" anahtarı gelir;
(d) satır sonuna `RowMenu` (`Menu.tsx:64-72`) konur; (e) *Son ödeme* sütunu (`lastPaidDate`) eklenir.
`PageShell` ile `FilterBar`'ın bu sayfadaki kullanımı **bugün yoktur**; `28-ORTAK-PARCALAR.md`
uygulanmadan §10 adımları başlatılmaz.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Başlıkta ara (yeni) | metin | hayır | Başlık ve detayda süzer | — |
| Ay | `type="month"` | evet | Boşaltılırsa bu aya döner (`:64`) | — |
| Arşivdekileri göster + tür süzgeci (yeni) | anahtar, çoklu seçim | hayır | Kapalıyken pasifler gizli; etiketler `labels.ts:40-50` | — |
| Başlık | metin | evet | En çok 150 karakter | "Başlık zorunlu." (`Validators.cs:513`) |
| Aylık tutar | tutar | evet | `AmountInput` (`:121`) | "Tutar sıfırdan büyük olmalı." |
| Ayın kaçında ödenir? | sayı | evet | 1-28 arası (`:84`) | "1 ile 28 arası" |
| Gider türü | 9 şıklı seçim | evet | §2'deki 6/9 uyuşmazlığı kapatılır | sunucu `IsInEnum` (`:517`) |
| Hesap | seçim | hayır | Yalnız ödeme hesabı önerisi (`:94-97`) | "Kasa/banka hesabı bulunamadı." (`:176`) |
| Ödendi / Ödendi olarak kaydet | iki düğme | — | Pencereyi açar (`:47`), gideri yazar, üç sorguyu tazeler (`:146-147`) | "Tutar sıfırdan büyük olmalı." (`:138`) |
| Düzenle / Sil | ikon, tehlike | — | Sil onay ister (`:132-133`) | "Sabit ödeme bulunamadı." (`:155`) |
| Excel'e aktar (yeni) | `MoreMenu` öğesi | — | §10.9'da eklenir | — |

Klavye: `Esc` kapatır, kirli formda önce sorar; `Ctrl/Cmd+Enter` kaydeder (`ui.tsx:189-197`); gizli
gönder düğmesi bunun için durur (`:130`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Yükleniyor:** ay değişince tablo `opacity-50` ile söner (`DataTable.tsx:126`); ilk yükte `Spinner`
  (`DataTable.tsx:148`). Hedef: iskelet satırlar (`29-GORSEL-SISTEM.md`).
- **Boş:** *"Henüz sabit ödeme yok. Kira, sigorta taksiti, muhasebe ücreti gibi her ay ödenenleri
  ekleyin."* (`:66`).
- **Hata:** `rows = list.data ?? []` olduğu için (`:29`) hata durumunda `rows` boş dizi olur;
  `DataTable` `error` dalına **hiç girmez** (`DataTable.tsx:148`) ve kullanıcı boş mesajını görür.
  Hedef: `list.isError` iken `ErrorState` + *Tekrar dene* (`ui.tsx:252-261`).
- **Yetkisiz:** rota `Guard perm="accounting"` (`App.tsx:97`), menüde öğe gizli (`nav.ts:46`), sunucu
  403 döner (`StaffController.cs:121`).
- **Ayna:** yalnız *Sabit Ödeme Ekle* ve *Düzenle* gizlenir (`ui.tsx:31-32`, `:47-48`); *Ödendi*
  görünür kalır ve sunucu yazmayı reddetmez (§2). Hedef: §10.8.
- **Lisans:** süre dolduğunda yazma reddedilir; hata `useSave` bildirimiyle görünür
  (`client/src/lib/hooks.ts:73-76`). Sahip modunda kısıt yoktur.

## 6. Metinler ve terimler

Başlıca metinler: *Sabit Ödemeler*, *Sabit Ödeme Listesi*, *Ödeme günü*, *Başlık*, *Tutar*, *Bu ay*,
*Ödendi*, *Gecikti*, *Bekliyor*, *Pasif*, *Geciken*, *Sabit Ödeme Ekle*, *Sabit Ödeme Düzenle*,
*Aylık tutar*, *Ayın kaçında ödenir?*, *Gider türü*, *Genelde hangi hesaptan ödenir?*, *Ödenen tutar*,
*Ödeme tarihi*, *Ödendi olarak kaydet*, *Ay*, *Bu ayın toplamı*, *Ödenmeyen*, *Ödenen*. Etiketler tek
kaynaktan gelir: `expenseCategoryLabel` (`labels.ts:40-50`), `expenseCategoryIcon`; yardım metinleri
`pageHelp.ts:16-20`. Ekranda teknik sözcük görünmez ("ayna", "dry-run", "token"). Para `tl` ile iki
kuruş, tarih `03.10.2026` (`format.ts:4`, `:11-15`).

## 7. Telefon davranışı (390×844)

640px altında tablo yerine `mobileCard` çizilir (`DataTable.tsx:49-50`, `:78-79`, `:101`); kart
başlık, tarih ve tutarı gösterir, sağda tek rozet durur (`:67-71`). İki eksik vardır: kart **hiç
*Gecikti* göstermez** (ödenmemiş her kalem *Bekliyor* olur, `:70`) ve pasif kalem için etiket yoktur —
masaüstü tablosuyla çelişir (`:43`). Özet kutuları `sm:grid-cols-3` ile alt alta iner (`:57`). Hedef:
kart ile tabloyu aynı durum mantığından beslemek, *Ödendi*'yi kartta da 44px hedefle göstermek,
süzgeci tam ekran çekmecede açmak (`27-TELEFON.md`). `client/e2e/mobile.spec.ts:4` bu adresi taşma
ölçümüne **zaten dahil eder**.

## 8. Erişilebilirlik ve klavye

Bugün: *Düzenle* ikonunun `label`'ı vardır (`:48`, `ui.tsx:50`); *Ödendi* gerçek bir `button`'dır
(`:47`); ay kutusunda `aria-label="Ay"` vardır (`:64`); durum rozeti renk + metin birlikte verilir
(`ui.tsx:73-74`). Eksikler: `th` hücreleri `scope` taşımaz, `<caption>` yoktur
(`DataTable.tsx:110-123`); satıra klavyeyle erişilemez (`DataTable.tsx:127-129`). Hedef: (a)
`<caption>` + `scope="col"`; (b) satır içi düğmelerin `Tab` sırasına girmesi; (c) pasif kalemi
metinle bildirmek; (d) dokunma hedefleri ≥44px; (e) `:focus-visible` çerçevesi
(`client/src/index.css:102-106`); (f) tutarda `tabular-nums` (`DataTable.tsx:138` zaten verir).

## 9. Testler (e2e + birim)

- `server/YesLojistik.Tests/Integration/StaffTests.cs:37-54` — ödeme yapılmadan `PaidDate` boştur
  (`:44`); 2026-09-05 ödemesinden sonra `PaidDate` ve `DueDate` o gün olur (`:47-48`); ekim ayında
  `PaidDate` boş, `LastPaidDate` 2026-09-05'tir (`:49-51`); oluşan gider `/api/expenses` aramasında
  görünür (`:52-53`).
- `client/e2e/cari.spec.ts:87-95` — *Sabit Ödeme Ekle* ile kayıt açılır, *Ödendi* → *Ödendi olarak
  kaydet* akışı ve *"Ödendi ·"* metni doğrulanır.
- `client/e2e/mobile.spec.ts:4` — `/sabit-odemeler` yatay taşma listesinde.
- `client/e2e/new-ui/basics.spec.ts:24` — yeni menüde *Sabit Ödeme Listesi* etiketi sabitlenir.

Eklenecek senaryolar (`client/e2e/new-ui/sabit-odemeler.spec.ts`, `useNewUi(page)` —
`client/e2e/helpers.ts:44-46`): (1) yeni görünümde `h1` *Sabit Ödeme Listesi*; (2) arama başlıkta
süzer; (3) ay değişince *Ödendi* rozeti kaybolur; (4) günü geçmiş kalem *Gecikti* rozetiyle ve
metinle; (5) "Arşivdekileri göster" kapalıyken pasif gizlenir; (6) `Esc` kirli formda sorar. Test
silme, atlama, `skip` **yasaktır** (`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`pages/RecurringPaymentsPage.tsx:29, 65`** — hata durumunu boş durumdan ayır: `list.isError` iken
   `ErrorState` + *Tekrar dene*. Süre: 2 saat. Doğrulama: `cd client && npm run build`.
2. **`RecurringPaymentsPage.tsx:57-61`** — üç `StatCard` yerine dört kutulu `Figures` (bu ayın toplamı,
   ödenmeyen, ödenen, geciken); *Ödenen*'deki pasif tutarsızlığını gider. Süre: 3 saat.
   Doğrulama: `cd client && npm run build && npm run lint`.
3. **`RecurringPaymentsPage.tsx:62-64` + `components/shell/FilterPanel.tsx:7-32`** — ay kutusunu,
   aramayı, tür süzgecini ve "Arşivdekileri göster" anahtarını `FilterBar`'a taşı; çipi
   `28-ORTAK-PARCALAR.md` deseniyle bağla. Süre: 5 saat. Doğrulama: `cd client && npm run build`.
4. **`RecurringPaymentsPage.tsx:21, 85, 125`** — tür listesini dokuza tamamla ya da şemayı altıya
   daralt (karar §13.1). Süre: 1 saat. Doğrulama: `npm run lint`.
5. **`RecurringPaymentsPage.tsx:34-51`** — *Son ödeme* sütunu (`lastPaidDate`) ve gecikme vurgusu;
   durum mantığını tek fonksiyona indir ki masaüstü ve kart aynı sonucu versin. Süre: 4 saat.
   Doğrulama: `cd client && npm run build`.
6. **`RecurringPaymentsPage.tsx:45-50` + `components/shell/Menu.tsx:64-72`** — satır sonuna `RowMenu`
   (*Ödendi · Düzenle · Sil*), üst şeride `PageShell` ve `MoreMenu` (ön koşul:
   `28-ORTAK-PARCALAR.md`). Süre: 6 saat. Doğrulama: `cd client && npm run build`.
7. **`StaffController.cs:130-131`** — bağlı gider sorgusunu SQL'de aya daralt
   (`e.Date >= from && e.Date <= to`); DTO değişmez. Süre: 2 saat.
   Doğrulama: `cd server && dotnet test --filter Recurring_payment_`.
8. **`RecurringPaymentsPage.tsx:47, 151` + `MirrorWriteGuard.cs:16`** — *Ödendi* ve kaydet düğmesine
   `write` ekle; koruma listesine `/api/recurring-payments` yaz ve testle sabitle. Süre: 3 saat.
   Doğrulama: `cd server && dotnet test`.
9. **`components/Exports.tsx:12` + `ImportService.cs:320-330` + `ImportDialog.tsx:8`** — Excel'e ve
   Excel'den aktarma: önce sunucuda hazır uç var mı bak; yoksa **istemci tarafında** `;` ayraçlı,
   UTF-8 BOM'lu CSV üret (yeni bağımlılık ekleme) ve `MoreMenu`'ye bağla. Süre: 1 iş günü.
   Doğrulama: `cd client && npm run build`.
10. **`client/e2e/new-ui/sabit-odemeler.spec.ts`** (yeni) + **`client/e2e/cari.spec.ts:87-95`** —
    §9'daki altı senaryoyu yaz. Süre: 5 saat. Doğrulama:
    `E2E_BASE_URL=http://localhost:5173 npx playwright test e2e/new-ui/sabit-odemeler.spec.ts e2e/cari.spec.ts`.
11. **`docs/GELISTIRME-PLANI.md`, `docs/PRATIKORTAM-HARITA.md:122`** — yapılanları işaretle. Süre:
    0,5 saat. Doğrulama: `git diff --stat`.

Toplam tahmin: **~4 iş günü** (32 saat). Sıra: 1 → 2 → 3; 4 ve 7 bağımsız; 6 için 3 şarttır;
5 → 8 → 9 → 10.

## 11. Kabul ölçütü

1. 1440×900'de listede **≥12 satır**; üst kısım (başlık → tablo başlığı) **≤260px**.
2. Arama kutusuna üç harf yazıldığında liste **tek tık olmadan** süzer; tür süzgeci çipi görünür ve
   temizlenebilir.
3. "Arşivdekileri göster" kapalıyken pasif kalem **görünmez**; açıkken *Pasif* rozetiyle görünür.
4. Günü geçmiş ve ödenmemiş kalemde **hem rozet hem metin** *Gecikti* yazar; durum yalnız renkle
   verilmez. Aynı kalem telefonda da *Gecikti* gösterir.
5. *Ödendi* → *Ödendi olarak kaydet* sonrası o ayın satırı *Ödendi · gg.aa.yyyy* olur, `expenses`
   sorgusu tazelenir ve hesap seçildiyse kasa bakiyesi **aynı tutarda** azalır (`StaffTests.cs:52-53`).
6. Özet kutularının toplamı ekrandaki satırlarla tutarlıdır; pasif kalem *Ödenen*'e giriyorsa metinde
   belirtilir.
7. Liste isteği hata verdiğinde boş durum değil, **hata durumu + Tekrar dene** görünür.
8. Ayna açıkken *Sabit Ödeme Ekle*, *Düzenle*, *Sil* ve *Ödendi* **hiç görünmez**;
   `POST /api/recurring-payments/{id}/pay` sunucuda **reddedilir**.
9. Ödeme penceresinde `Ctrl/Cmd+Enter` kaydeder, `Esc` kirli formda sorar; 390×844'te yatay kaydırma
   yok (`mobile.spec.ts`), dokunma hedefleri ≥44px.
10. e2e: `cari.spec.ts`, `new-ui/basics.spec.ts`, yeni `new-ui/sabit-odemeler.spec.ts` ve
    `mobile.spec.ts` **yeşil**; `npm run build`, `npm run lint` ve `dotnet test` hatasız.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Tür listesi dokuza çıkınca eski kayıtların etiketi değişir | Etiket tek kaynak, kayıt enum | Listeyi altıya al |
| *Ödendi*'ye `write` eklenince ayna açıkken ödeme yapılamaz | Kural yalnız ayna açıkken (`MirrorWriteGuard.cs:25`) | İşareti geri al |
| Aynı ay için iki ödeme (tarih serbest, `Validators.cs:521-527`) | "Bu ay zaten ödendi" uyarısı | Uyarıyı kaldır |
| Ay süzgeci SQL'e taşınırken DTO bozulur | `LastPaidDate` süzgeçsiz (`StaffController.cs:135`) | Bellek içi süzmeye dön |
| Arama 1000+ kalemde yavaşlar | Bugün liste tamamen gelir (`:128`) | Sunucu araması ekle |

Her adım ayrı commit; `main`'e giden her şey canlıya çıkar (`01-ORTAK-SARTNAME.md:29-31`).

## 13. Doğrulanacaklar

1. **Gider türü sayısı:** form altı, şema ve sunucu dokuz tür kabul ediyor
   (`RecurringPaymentsPage.tsx:21`, `:85`, `Validators.cs:517`). Hangisi doğru? Kullanıcı kararı.
2. **Excel çıktısı:** eski programda sabit ödeme listesinin Excel çıktısı var
   (`PRATIKORTAM-HARITA.md:122`); panelde ne uç ne düğme var. Sunucu ucu mu, istemci CSV'si mi?
3. **"Önceki ay ödenen" sütunu:** eski programda var (`PRATIKORTAM-HARITA.md:122`); `LastPaidDate`
   sunucudan gelir (`StaffDtos.cs:19`) ama ekranda kullanılmaz. İsteniyor mu?
4. **Aynı ayda iki ödeme:** ödeme tarihi serbest olduğu için aynı ay için ikinci gider yazılabilir;
   iş kuralı olarak engellenmeli mi?
5. **Silinen kalemin geçmişi:** silme yumuşaktır ve geçmiş giderler kalır
   (`RecurringPaymentsPage.tsx:132-133`, `StaffController.cs:165`); bu onaylı mı?
6. **Ayna modunda ödeme:** `/api/recurring-payments`'in koruma listesinde olmaması
   (`MirrorWriteGuard.cs:14-18`) kasıtlı mı, gözden mi kaçtı?
7. **Gerçek kalem sayısı:** kaç sabit ödeme tutuluyor ve 12 satır hedefi gerçek veriyle tutuyor mu?
   Ölçüm `33-K0-VE-KABUL-TESTI.md`'de yapılır.
8. **KDV davranışı:** ödeme ucu KDV oranı atamaz (`Expense.cs:8-9`), kategori varsayılanı uygulanır;
   kira gibi kalemlerde oran elle girilmeli mi?

Sonraki belgeyle bağlantı: `17-LISTE-PERSONEL.md` ile aynı F4.1 iskeletini paylaşır
(`KOLAYLASTIRMA-UYGULAMA.md:349-356`) ve `StatCard` → `Figures` kararı ikisinde ortaktır (`:356`);
açılan gider kaydı `20-OZ-MAL-GIDERLER.md`, hesap seçimi ve bakiye etkisi `11-BANKALAR.md`, ortak
parçalar (`PageShell`, `RowMenu`, `FilterBar`) `28-ORTAK-PARCALAR.md`, telefon davranışı
`27-TELEFON.md` içinde tanımlanır.
