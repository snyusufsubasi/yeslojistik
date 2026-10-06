# 28 — Ortak parçalar şartnamesi

## 1. Amaç ve kapsam

Bu belge, yeni görünümdeki bütün liste ekranlarının paylaştığı **altı ortağı** tek yerde sözleşmeye
bağlar: `PageShell`, `MoreMenu`, `RowMenu`, `FilterBar`, `FilterPanel`, `DetailDrawer`. Amaç, her
ekran belgesinin (`02`–`27`) kendi başlık/süzgeç düzenini yeniden tarif etmesini önlemek ve
"pratikortam kadar tanıdık, ondan daha sade" hedefini tek kod tabanına indirmek.

Neden gerekli: bugün bu parçaların kullanımı çok dardır. `MoreMenu`/`RowMenu` ve
`FilterBar`/`FilterPanel` **yalnız Sevkiyatlar sayfasında** kullanılır (`TripsPage.tsx:16-17`, `245`,
`341`, `379`, `466`); `SectionTabs` yalnız `ui.tsx:132` ve `DashboardPage.tsx:65` üzerinden çizilir.
Yani 25 sayfa `PageHeader` kullanıyor ve her biri süzgeç düzenini kendi gövdesine yazıyor
(`PaymentsPage` örneği `10-TAHSILAT-ODEME-FORMLARI.md:107`). Bu dağınıklık büyüdükçe ekranlar
birbirinden kopar.

Kapsam: altı ortağın **tam props/API sözleşmesi**, klavye davranışı (yukarı/aşağı, Esc, dışarı
tıklama), ayna modunda yazma işlerinin gizlenmesi, `perm` süzgeci, erişilebilirlik (`role`/`aria`),
hangi ekranda hangi sırayla kullanılacağı ve bugün **kodda olmayan** `PageShell` ile `DetailDrawer`'ın
şartnamesi. Kapsam dışı: `DataTable` (`client/src/components/DataTable.tsx`), `SumStrip`, `Modal`,
`Inputs.tsx`, rozet/rakam biçimleri ve görsel jetonlar — bunlar yazılacak `29-GORSEL-SISTEM.md` ile
`30-VERI-API.md` konusudur (ikisi de henüz yok; `00-DIZIN.md:69-70` "bekliyor" der).

## 2. Bugünkü durum (kod kanıtıyla)

**`PageShell` ve `DetailDrawer` kodda YOK.** `client/src` altında iki ad için de **0 eşleşme** vardır
(yalnız `docs/` içinde adları geçer, `KOLAYLASTIRMA-UYGULAMA.md:142`, `:180`). Bugünkü karşılıkları
`PageHeader` (`ui.tsx:108-134`) ve satır tıklamasıyla açılan `TripForm` penceresidir
(`TripsPage.tsx:413`, `:439`).

| Ortak | Dosya | Bugün ne var | Boşluk |
|---|---|---|---|
| `PageShell` | yok | `PageHeader`: başlık, alt başlık, `actions`, `back`, `SectionTabs` (`ui.tsx:108-134`) | "⋯ Diğer" + tek ana düğme sırası, klasik/yeni ikili dal, ölçülü üst şerit yok |
| `MoreMenu` | `shell/Menu.tsx:52-61` | `DropMenu` gövdesi; düğme metni "Diğer", `min-h-10`, `aria-expanded`/`aria-haspopup` (`:55-56`) | Klavye odak dönüşü, Tab ile kapanma, Home/End yok |
| `RowMenu` | `shell/Menu.tsx:64-72` | varsayılan `label="İşlemler"` (`:64`), tetikleyici `size-9` (`:68`), satır tıklamasını keser (`:33`) | Dokunma hedefi 36px (<44px), odak dönüşü yok |
| `FilterBar` | `shell/FilterPanel.tsx:7-32` | arama (`:12`), `quick` (`:13`), "Süzgeç (n)" (`:14-17`), çipler (`:19-29`), "Süzgeci temizle" (`:27`) | `aria-label` düz `div` üzerinde (`:20`), sayaç 99 üstünde taşar |
| `FilterPanel` | `shell/FilterPanel.tsx:35-62` | sağdan panel, `w-full sm:w-[400px]` (`:49`), Esc (`:39`), ilk alana odak (`:41`), alt "Listeyi göster" (`:57`) | **Odak tuzağı yok**, gövde kaydırma kilidi yok, `aria-labelledby` yok |
| `SectionTabs` | `shell/SectionTabs.tsx:8-32` | **props almaz**: `sectionFor(pathname)` (`:12`), `perm` süzgeci (`:14`), 2 sekmeden azsa `null` (`:15`) | `KOLAYLASTIRMA-UYGULAMA.md:135` "`tabs` prop'u" diyor → **belge ile kod çelişiyor** |

`DropMenu` görünürlük süzgeci tek satırdadır ve sözleşmenin çekirdeğidir: `hidden`, ayna modunda
`write`, yetkisiz `perm` elenir (`Menu.tsx:16`). Liste boşalırsa menü hiç çizilmez (`:24`). Klavye:
Esc, aşağı/yukarı ok ile **dairesel** gezinme (`:25-31`); açılışta ilk madde odaklanır (`:21`);
dışarı tıklama `mousedown` ile kapatır (`:19-20`). Ayna bilgisi `MirrorContext`'ten gelir
(`ui.tsx:27`, sağlayıcı `Layout.tsx:115`) ve `Button`/`IconButton` de `write` ile kendini gizler
(`ui.tsx:32`, `:48`). Üst çubuktaki "+ Yeni" ayna açıkken kaydı **gizlemez**, "pratikortam'a girin"
der (`Layout.tsx:157-186`) — ortak parçalar için seçilen davranış gizlemektir; ikisi bilinçli farktır.

`Modal` ile ilgili iki gerçeği bağlar — ortak parçalar bunları devralır: Esc ve Ctrl+Enter yalnız
**en üstteki** pencerede çalışır (`ui.tsx:184-197`, pencere yığını `:187-190`), kaydedilmemiş
değişiklikte kapatma sorusu vardır (`ui.tsx:222-227`).

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────┐
│ Sevkiyat Listesi            [⋯ Diğer]  [+ Sevkiyat Ekle]      │  PageShell başlık şeridi (56px)
│ Sevkiyat Listesi │ Harita                                     │  SectionTabs (44px)
│ [🔍 Ara] [Bugün|Gelecek] [Süzgeç (2)]        Liste | Pano      │  FilterBar (48px)
│ (Müşteri: ABC ✕) (Durum: Yol…)   Süzgeci temizle              │  çip satırı (32px)
│ ┌ tablo ────────────────────────────────────────────────────┐ │
│ │ Tarih  Müşteri  Güzergâh  Araç  Durum  Tutar  ⋯          │ │
│ └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                   ╔══════════════════════════╗
                                   ║ Sevkiyat #1042        ✕  ║  DetailDrawer (560px)
                                   ║ Özet │ Evrak │ Kazanç    ║
                                   ║ …içerik…                 ║
                                   ║ [Sil]        [Kaydet]    ║
                                   ╚══════════════════════════╝
```

Ölçüler sözleşmedir: başlık şeridi **56px**, sekmeler **44px**, `FilterBar` **48px**, çip satırı
**32px** → başlıktan tablo başlığına kadar toplam **≤260px** (`01-ORTAK-SARTNAME.md:237`).
`FilterPanel` masaüstünde **400px** (bugünkü değer korunur, `FilterPanel.tsx:49`), `DetailDrawer`
masaüstünde **560px**, 390×844'te ikisi de tam ekran. Z sırası (**hedef**): başlık **30** · açılır
menü **40** (`Menu.tsx:37`) · `FilterPanel` **45** · `DetailDrawer` **50** · `Modal` **60**.
Bugünkü değerler: başlık `z-20` (`Layout.tsx:86`), menü `z-40` (`Menu.tsx:37`), `FilterPanel` ve
`Modal` ikisi de `z-50` (`FilterPanel.tsx:46`, `ui.tsx:212`) — bu yüzden §10 adım 4'te `Modal` 60'a,
`FilterPanel` 45'e çekilir.

## 4. Alanlar, düğmeler ve etkileşim

**`PageShell`** (yeni: `client/src/components/shell/PageShell.tsx`)

| Prop | Tip | Zorunlu | Davranış |
|---|---|---|---|
| `title` | `string` | evet | Yeni görünümde `newTitles[pathname]` varsa o yazar (`sections.ts:41-50`) |
| `subtitle` | `ReactNode` | hayır | **Yeni görünümde çizilmez** (`ui.tsx:113` deseni); klasikte görünür |
| `section` | `Section['key']` | hayır | Verilirse `SectionTabs` çizilir; klasik görünümde hiç çizilmez (`SectionTabs.tsx:13`) |
| `more` | `MenuItem[]` | hayır | Yeni görünümde `MoreMenu`; klasikte maddeler `actions`'a düz düğme olarak düşer |
| `primary` | `ReactNode` | hayır | Yeni görünümde en sağda **tek** ana düğme; `Button write` sayfa tarafından koşullandırılır |
| `actions` | `ReactNode` | hayır | Klasik görünüm düğmeleri (Excel, PDF, içe aktar) |
| `back` | `{ to, label }` | hayır | Kırıntı bağlantısı (`ui.tsx:119-123`) |
| `children` | `ReactNode` | evet | Sayfa gövdesi (tablo, kartlar) |

**`MenuItem`** (`Menu.tsx:8`): `label` · `onClick` · `icon?` · `write?` · `perm?` · `danger?` ·
`hidden?`. `MoreMenu`/`RowMenu` ek prop almaz; `RowMenu` yalnız `label` (varsayılan "İşlemler").

**`FilterBar`**: `search?` · `quick?` · `chips: FilterChip[]` (`{ label, onClear }`,
`FilterPanel.tsx:4`) · `onOpen` · `onClearAll?`. Sayaç `chips.length`'tır ve 99 üstünde "99+"
yazılır. **`FilterPanel`**: `open` · `onClose` · `title = 'Süzgeç'` · `onClearAll?` · `children`.
Süzgeç değerleri **adreste** durur (`TripsPage.tsx:47-50`, `:114-122`); panel yalnız yerleşimdir
(`FilterPanel.tsx:34`).

**`DetailDrawer`** (yeni: `client/src/components/shell/DetailDrawer.tsx`)

| Prop | Tip | Zorunlu | Davranış |
|---|---|---|---|
| `open` · `onClose` | `boolean` · `() => void` | evet | Adresle eşlenir: `?id=` açıkken `open` |
| `title` | `string` | evet | `aria-labelledby` hedefi; ör. "Sevkiyat #1042" |
| `tabs` | `{ value, label }[]` | hayır | `Tabs` bileşeniyle aynı sözleşme (`ui.tsx:272`) |
| `footer` | `ReactNode` | hayır | Sağ altta; yazma düğmeleri `write` taşır |
| `guard` | `boolean = true` | hayır | İçerideki form kirliyse kapatmadan önce sorar (`ui.tsx:222-227` metni) |
| `size` | `'md' \| 'lg'` | hayır | md 560px, lg 720px; telefonda her ikisi tam ekran |

Adres sözleşmesi: açılışta `?id=<kayıt>` eklenir, kapanışta silinir; başka sayfadan gelen
`/seferler?id=5` bağlantısı paneli açar (bugün aynı parametre `TripForm` penceresini açar,
`TripsPage.tsx:135-143`). Server bildirimleri bu adresi kullanır.

Klavye: Esc kapatır (üstte `Modal` varsa yalnız onu kapatır, `ui.tsx:189-191`); menülerde ↑/↓
dairesel gezinir, Esc menüyü kapatır ve **olayı yukarı göndermez** (`Menu.tsx:28`); Tab menüyü
kapatır; kapanışta odak tetikleyici düğmeye döner; `DetailDrawer` içinde Ctrl+Enter formu kaydeder.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** `Empty` (`ui.tsx:268`) kullanılır; ilk kullanımda `FirstUse` kartı (desen
  `TripsPage.tsx:419-422`). `FilterBar` çip satırı boşsa hiç çizilmez (`FilterPanel.tsx:19`).
- **Yükleniyor:** tablo gövdesi soluk kalır (`DataTable.tsx:126`); ortak parçalar iskelet çizmez.
- **Hata:** `ErrorState` + "Tekrar dene" (`ui.tsx:251-261`); `PageShell` başlığı korunur.
- **Yetkisiz:** `perm` taşıyan menü maddesi çizilmez (`Menu.tsx:16`); `SectionTabs` yetkisiz sekmeyi
  eler (`SectionTabs.tsx:14`); `PageShell.primary` sayfa tarafından `can()` ile koşullandırılır.
- **Ayna:** `write` maddeleri ve `Button write` gizlenir (`Menu.tsx:16`, `ui.tsx:32`, `:48`). Bütün
  maddeler gizlenirse menü `null` döner (`Menu.tsx:24`) ve `PageShell` boş bir kapsayıcı çizmez;
  kullanıcıya durumu üstteki ayna şeridi anlatır (`Layout.tsx:108-113`).
- **Lisans:** parçalar lisansı **okumaz** (`client/src` altında lisans okuyan ortak parça yoktur).
  Süre dolduğunda salt okunurluk sunucudan gelir
  (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:11`); sayfa `primary`'yi çizmez. Ortak bir
  "yazılabilir mi" yardımcısı bugün yoktur (§13).

## 6. Metinler ve terimler

Sabit metinler: **"Diğer"** (`Menu.tsx:57`), **"İşlemler"** (`Menu.tsx:64`), **"Süzgeç"**,
**"Süzgeç (2)"**, **"Süzgeci kaldır"** (`FilterPanel.tsx:22`), **"kaldır"** (`:24`),
**"Süzgeci temizle"** (`:27`, `:56`), **"Listeyi göster"** (`:57`), **"Kapat"** (`:52`),
**"Tekrar dene"** (`ui.tsx:258`), **"Kayıt bulunamadı."** (`ui.tsx:268`),
**"Kaydedilmemiş değişiklikler var. Kapatılsın mı?"** (`ui.tsx:224`), **"Forma dön"**,
**"Kaydetmeden kapat"** (`ui.tsx:225-226`). Bu metinler henüz yazılmamış `32-TERMINOLOJI.md` ile
uyumlu kalmalıdır (`00-DIZIN.md:72`, "bekliyor"); bugünkü terim kaynağı `docs/TERIMLER.md`'dir.

Yasak: ekranda "ayna", "dry-run", "UBL", "token", "endpoint", "drawer", "panel id" gibi teknik
sözcük görünmez (`01-ORTAK-SARTNAME.md:241`). `DetailDrawer` başlığı kaydın kendi adıdır; "Detay"
tek başına başlık olmaz.

## 7. Telefon davranışı (390×844)

`FilterPanel` ve `DetailDrawer` telefonda **tam ekran** açılır (bugünkü `w-full`
`FilterPanel.tsx:49` korunur); üstte 56px başlık şeridi, altta 44px'lik eylem şeridi sabit kalır,
orta bölüm kayar. `PageShell` başlık şeridinde düğmeler alt satıra iner: önce "⋯ Diğer", sonra ana
düğme; başlık iki satıra çıkabilir. `FilterBar` arama kutusu tam genişlik, `quick` ve "Süzgeç (n)"
alt satırda; çipler tek satırda **yatay kaydırılır**, sayfa kaymaz. `RowMenu` tetikleyicisi telefonda
44×44px olur. Hiçbir ekranda yatay kaydırma olmaz: `client/e2e/mobile.spec.ts:4-14` bugün 15 rotayı
tarar, yeni ekranlar bu listeye eklenir.

## 8. Erişilebilirlik ve klavye

| Ortak | Gerekli rol/aria |
|---|---|
| `MoreMenu` | tetikleyici `aria-haspopup="menu"` + `aria-expanded` (`Menu.tsx:55`); liste `role="menu"` + `aria-label` (`:36`); madde `role="menuitem"` (`:39`) |
| `RowMenu` | tetikleyici `aria-label` + `title` (`Menu.tsx:67`); 44px hedef; satır tıklaması `stopPropagation` (`:33`) |
| `FilterBar` | çip satırı `role="group" aria-label="Açık süzgeçler"`; çip düğmesi `aria-label="<çip> süzgecini kaldır"` |
| `FilterPanel` | `role="dialog" aria-modal="true" aria-labelledby`; **odak tuzağı**; kapanışta odak dönüşü; gövde kaydırma kilidi |
| `DetailDrawer` | aynı sözleşme + `aria-labelledby` başlık; sekme varsa `role="tablist"`/`role="tab"`/`aria-selected` (`SectionTabs.tsx:18-22`) |
| `PageShell` | tek `h1`; `usePageTitle` (`ui.tsx:114`); sekmeler `nav aria-label="Bölüm sekmeleri"` |

Odak sırası: başlık → "⋯ Diğer" → ana düğme → sekmeler → arama → hızlı süzgeçler → "Süzgeç" →
tablo başlıkları. `:focus-visible` halkası `index.css` jetonundan gelir (`01-ORTAK-SARTNAME.md:153`).
Durum rozetleri her zaman **rozet + metin** birlikte (`ui.tsx:70-77`); renk tek başına anlam taşımaz.
Dokunma hedefi ≥44px.

## 9. Testler (e2e + birim)

Bugünkü kapsam: `client/e2e/new-ui/basics.spec.ts:38-56` süzgeç panelini açar, `Durum` seçer,
"Listeyi göster" ile kapatır, çipi doğrular ve satır menüsünden "İşlemler → Düzenle" der. Yardımcı:
`useNewUi(page)` (`client/e2e/helpers.ts:44-46`). `TripsPage` için ek: `new-ui/trip-copies.spec.ts`.

Eklenecek senaryolar: (1) `PageShell` başlık şeridi ≤260px ve "⋯ Diğer" sonrası ana düğme sırası;
(2) menüde ↑/↓ ile gezinme ve Esc ile kapanıp odağın tetikleyiciye dönmesi; (3) ayna açıkken
`write` maddesinin **görünmemesi**; (4) `perm` yoksa sekme ve maddenin çizilmemesi;
(5) `DetailDrawer`'ın `?id=` ile açılıp kapanışta adresten silinmesi ve Esc davranışı;
(6) 390×844'te panelin tam ekran olması ve yatay kaydırma olmaması.
Birim: `MenuItem` görünürlük süzgeci saf fonksiyona çıkarılıp test edilir (bugün `Menu.tsx:16`).

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **`client/src/components/shell/PageShell.tsx` (yeni).** §4'teki props; yeni görünümde başlık +
   `MoreMenu` + tek ana düğme + `SectionTabs`; klasikte `PageHeader` gibi. *6 saat.*
   Doğrulama: `cd client && npm run lint && npm run build`.
2. **`ui.tsx:108-134`.** `PageHeader` incelir: gövde `PageShell`'e taşınır, eski çağrılar bozulmaz.
   *3 saat.* Doğrulama: `cd client && npm run build && npx playwright test e2e/new-ui`.
3. **`client/src/components/shell/DetailDrawer.tsx` (yeni).** §4 sözleşmesi, `?id=` eşlemesi, kirli
   form koruması, odak tuzağı. *8 saat.* Doğrulama: yeni spec + `npm run lint`.
4. **Z sırası.** `ui.tsx:212` `z-50` → `z-60`; `FilterPanel.tsx:46` `z-50` → `z-45`. *1 saat.*
5. **`Menu.tsx:25-31`.** Home/End, Tab ile kapanma, kapanışta odak dönüşü, `role="none"` sarmalayıcı;
   `RowMenu` tetikleyicisi `size-11` (44px). *3 saat.*
6. **`FilterPanel.tsx:35-62`.** Odak tuzağı, gövde kaydırma kilidi, `aria-labelledby`, alt düğme
   metni "Kapat" (süzgeçler anında uygulanır, `:34`). *4 saat.*
7. **`TripsPage.tsx:339`, `:379-381`, `:466-468`.** `PageHeader` → `PageShell`; satır tıklaması
   (`:413`) → `DetailDrawer`. *4 saat.* Doğrulama: `npx playwright test e2e/new-ui e2e/trips.spec.ts`.
8. **`ExpensesPage.tsx:99`, `:113`.** Üst şerit `PageShell`, süzgeçler `FilterBar`/`FilterPanel`.
   *3 saat.* (bkz. `20-OZ-MAL-GIDERLER.md:245-251`: adım 1 ortak parçalar, adım 3 "süzgeç tek satır";
   o belgede `:270` yalnız belge güncellemesidir.)
9. **`ChecksPage.tsx:89-92`.** Bugün o `DataTable`'da `onRowClick` **yok** (satır eylemleri `:64-68`
   durum düğmeleridir); satır tıklaması buraya eklenecek → `DetailDrawer` (çek hareketleri). *3 saat.*
10. **`StaffPage.tsx:51-54`, `RecurringPaymentsPage.tsx:48`, `:55-56`.** `PageShell`; satır sonuna `RowMenu`
    (*Avans gir · Prim gir · Maaş ödemesi gir*). *5 saat.*
11. **Kalan listeler sırayla:** e-Fatura (`InvoicesPage`, `PurchaseInvoicesPage`) → Tahsilat/Ödeme
    (`PaymentsPage`, `SupplierPaymentsPage`) → Bankalar (`CashAccountsPage`) → Listeler (`CustomersPage`,
    `SuppliersPage`, `DriversPage`) → `DashboardPage`. Her ekran *2-3 saat*, toplam **~20 saat**.
    Doğrulama: her adımda `npm run build` + ilgili spec.
12. **`FuelPage.tsx` (yeni, `19-OZ-MAL-MAZOTLAR.md`).** `PageShell` + `FilterBar`; çekmece yok.
    *3 saat.*

Toplam tahmin: **~63 saat** (yaklaşık 8 iş günü). Her adım sonunda `main`'e push (`AGENTS.md` §3.6).

## 11. Kabul ölçütü

- Altı ortak da §4'teki props sözleşmesiyle çalışır; `grep -r "PageShell\|DetailDrawer" client/src`
  en az 2 dosya döner (bugün **0**).
- Yeni görünümde başlık→tablo başlığı arası **≤260px**; 1440×900'de tabloda **≥12 satır**.
- `FilterPanel` 400px, `DetailDrawer` 560px; 390×844'te ikisi tam ekran, **yatay kaydırma yok**.
- Menü: ↑/↓ dairesel gezinir, Esc kapatır, dışarı tıklama kapatır, odak tetikleyiciye döner;
  ayna modunda `write` maddeleri **0** görünür.
- `RowMenu` tetikleyicisi **≥44×44px**; bütün açılır katmanlarda `role="menu"`/`role="dialog"` var.
- `new-ui` klasörü bugün **3 spec dosyası / 6 test**tir (`basics.spec.ts` 3, `cari-invoice.spec.ts` 2,
  `trip-copies.spec.ts` 1); dosya sayısı **en az 6**'ya çıkar, test silme/atlama yok
  (`01-ORTAK-SARTNAME.md:178`).
- Ekran metinlerinde yasak teknik sözcük **0**.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| `PageHeader` çağrısı 25 sayfada (ör. `TripsPage.tsx:339`) | Adım 2'de ince sarmalayıcı | `ui.tsx` eski gövdeye döner |
| `z-60` çakışması (Modal üstte kalmalı) | Adım 4 tek commit, görsel kontrol | Z değerleri eski hâline döner |
| Odak tuzağı klavye akışını bozar | Esc ve odak dönüşü e2e ile sabitlenir | Tuzak kaldırılır, yalnız Esc kalır |
| Çekmece açıkken liste kaybolur | Adım 7'de tablo korunur, panel yan yana | Satır tıklaması eski `TripForm` penceresine döner |
| Belge ile kod çelişkisi (`SectionTabs` props) | Kod doğru kabul edilir, `sections.ts` tek kaynak | — |

## 13. Doğrulanacaklar

1. `FilterPanel` genişliği: kod **400px** (`FilterPanel.tsx:49`), `KOLAYLASTIRMA-UYGULAMA.md:175`
   **380px** diyor. Hangisi esas?
2. `DetailDrawer` genişliği **560px** kabul edildi; sevkiyat formunun bugünkü penceresi daha geniş
   (`ui.tsx:207` `md:max-w-2xl`). Sevkiyat paneli için 560px yeter mi, 720px mi?
3. `SectionTabs` props alacak mı, yoksa `sections.ts` tek kaynak olarak mı kalacak?
   (`KOLAYLASTIRMA-UYGULAMA.md:135` ile `SectionTabs.tsx:12` çelişiyor.)
4. Klasik görünüm dalı `PageShell` içinde ne kadar süre kalacak
   (`KOLAYLASTIRMA-UYGULAMA.md:407` kaldırmayı öneriyor)?
5. Satır tıklaması her listede çekmece mi açacak? `08-MUSTERILER-CARI.md:98-99` müşteri ayrıntısı
   için "çekmece değil, ayrı sayfa" diyor; çelişki kullanıcı kararına bağlı.
6. Lisans/`maintenance` için ortak "yazılabilir mi" yardımcısı gerekli mi, yoksa sayfa bazlı
   `can()` yeterli mi?
7. `/seferler?id=` bağlantısını üreten sunucu bildirimlerinin tam listesi doğrulanamadı
   (kaynak: `TripsPage.tsx:136` yorumu). Hangi ekranlar bu adresi üretiyor?

Sonraki belgeyle bağlantı: `29-GORSEL-SISTEM.md` bu parçaların jetonlarını (köşe, gölge, `data-ui`),
`31-TEST-CI.md` yeni spec'lerin CI'da çalışmasını, `03-SEVKIYATLAR-LISTE.md` ile
`20-OZ-MAL-GIDERLER.md` ise §10'daki ekran sırasını devralır.
