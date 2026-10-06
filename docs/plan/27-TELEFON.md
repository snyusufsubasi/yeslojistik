# 27 — Telefon davranışı

## 1. Amaç ve kapsam

Panel sahada telefondan da kullanılıyor. Bu belge **390×844** ekranda panelin davranışını tanımlar ve
`docs/plan/01-ORTAK-SARTNAME.md` §5'teki 10 işten dördünü bağlar:

- **2. Bugünkü sevkiyatları görmek → 1 tık:** alt çubuktaki "Bugün" (`/`).
- **3. Sevkiyat durumunu ilerletmek → 1 tık:** kart üzerindeki tek durum düğmesi.
- **1. Yeni sevkiyat girmek → tek ekran:** alt çubuktaki "+" → "Yeni Sevkiyat".
- **4. Sevkiyat bulmak → yaz:** kart listesinin üstündeki arama kutusu.

Kapsam: alt çubuk (Bugün · Sevkiyatlar · + · Cari · Menü), listelerin 640px altında kart olması
(`DataTable`'ın `mobileCard` prop'u), `FilterPanel`'in tam ekran açılması, dokunma hedefleri ve
390×844'te yatay kaydırma olmaması.

Kapsam dışı: şoför uygulaması (Expo, `mobile/`), ortak parçalar
(`client/src/components/shell/PageShell.tsx` bugün **yok**; `docs/plan/28-ORTAK-PARCALAR.md`), yeni
görünüm jetonları (`docs/plan/29-GORSEL-SISTEM.md`), e2e altyapısı (`docs/plan/31-TEST-CI.md`). Bu
belge **kod değiştirmez**; neyin değişeceğini `dosya:satır` ile tarif eder.

**Denetim notu (5 Ekim 2026):** bu belgedeki bütün `dosya:satır` bağlantıları koda karşı yeniden
denetlendi. `docs/plan/` altında bugün **00–28** numaralı belgeler vardır; bu belgede adı geçen
`29-GORSEL-SISTEM.md`, `31-TEST-CI.md` ve `32-TERMINOLOJI.md` **henüz yazılmamıştır** (bağlantılar
kırıktır; `00-DIZIN.md:77-78` onları "bekliyor" olarak listeler, `01-ORTAK-SARTNAME.md:299-302`
numaralarını ayırır). Onlara yapılan atıflar yazılacak şartnameye yöneliktir, bugün okunacak bir
dosya değildir. `28-ORTAK-PARCALAR.md` ise yazılmıştır (268 satır).

## 2. Bugünkü durum (kod kanıtıyla)

**Alt çubuk var.** `BottomBar` `client/src/components/Layout.tsx:237-270` içindedir (236 yalnız
yorum satırıdır) ve `main`'in dışında çağrılır (118). Beş yuva: "Ana Sayfa" (255, `/`),
"Sevkiyat" (256, `/seferler`), ortada "+" (257-262), "Cariler" (263, `accounting` varsa
`/cari/musteriler`, yoksa `/musteriler`), "Menü" (264-266). Çubuk `lg:hidden` (254) ve iPhone ana
göstergesi için `pb-[env(safe-area-inset-bottom)]` taşır (254). Bağlantı adı `${label} (kısayol)`
(245), "+" düğmesinin adı "Yeni kayıt ekle" (258) ve `aria-expanded` (258) — `aria-haspopup`
**bu satırda yoktur** (`FilterPanel.tsx:14` ve `Menu.tsx:55, 67`'de vardır).

**Etiketler görünüme bağlı değil.** `BottomBar` `useUiMode()` **çağırmaz**; yeni menü "Bugün"
(`client/src/lib/nav.ts:74`) ve "Sevkiyatlar" (87) derken alt çubuk "Ana Sayfa"/"Sevkiyat" der.
`docs/KOLAYLASTIRMA-UYGULAMA.md:396` "Bugün · Sevkiyatlar · (+) · Cari · Menü" ister. **"+ Yeni"
telefonda yok:** `NewMenu` `hidden sm:block` (`Layout.tsx:143`), 640px altında çizilmez; telefonda
kayıt eklemenin tek genel yolu alt çubuktaki "+"dır ve menü 10 maddeyi
(`client/src/lib/quickActions.ts:18-28`) yetkiye göre süzer (243).

**Dikey pay.** `main` alt dolgusu `pb-28` (`Layout.tsx:114`) = 122,5px (taban 17,5px,
`client/src/index.css:91`). Çubuk kaba hesapla ~64px: `py-1.5` 6,6×2 + `size-6` 26,3 + `gap-0.5` 2,2
+ `text-sm` satır 21,9 + 1px kenarlık. "+" `size-14` (61,3px) ve `-mt-6` (26,3px) ile ~25px taşar; en
yüksek engel ~89px, dolgu ~33px fazladır. Seçim çubuğu
`sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))]` (`DataTable.tsx:166`).

**Kart görünümü var, yaygın değil.** `mobileCard` (`DataTable.tsx:49-50`) verilirse kart listesi
`sm:hidden` (79), tablo `hidden sm:block` (101) çizilir; eşik Tailwind `sm` = **640px**. Kodda
**44** `<DataTable` çağrısı vardır (bileşenin kendi tanımı `DataTable.tsx:66` hariç); bunlardan
**yalnız 8'i** `mobileCard` verir: `TripsPage.tsx:423`, `CariPage.tsx:196`, `CustomersPage.tsx:61`,
`SuppliersPage.tsx:64`, `StaffPage.tsx:66`, `RecurringPaymentsPage.tsx:67`, `JobRequestsPage.tsx:84`,
`InvoicesPage.tsx:120`. Kalan **36 çağrı, 14 dosyada** telefonda yatay kaydırılan tablo gösterir:
`VehiclesPage.tsx:104`, `DriversPage.tsx:113`, `ChecksPage.tsx:89`, `PaymentsPage.tsx:81`,
`SupplierPaymentsPage.tsx:76`, `PurchaseInvoicesPage.tsx:91`, `ExpensesPage.tsx:126`,
`SettingsPage.tsx:273`, `AuditLog.tsx:58`, `InvoiceNotesCard.tsx:35`, `DashboardPage.tsx:86, 145, 173,
195` (4), `CustomerDetailPage.tsx:118, 132, 146, 159` (4), `SupplierDetailPage.tsx:134, 154, 164, 179,
192` (5), `ReportsPage.tsx` (11 çağrı: 137, 171, 197, 217, 233, 259, 276, 333, 357, 371, 384) —
toplam 36.

**Kartta durum düğmesi ve menü yok.** `TripsPage` kartı yalnız tarih/plaka, müşteri, güzergâh,
şoför ve tutar/kâr basar (423-436); durum düğmesi yalnız tablo sütunundadır (235-258), yani telefonda
**§5'teki 3. iş bugün yapılamıyor**. `RowMenu` (`client/src/components/shell/Menu.tsx:64-72`) yalnız
tablodan çağrılır (`TripsPage.tsx:16, 245`; klasik görünümde onun yerine iki `IconButton` çizilir,
251-254). Kartlar `<ul>/<li>` + `onClick`'tir (`DataTable.tsx:89`); `role` veya `tabIndex` yoktur,
klavyeyle açılamaz (seçim kutusu tıklama alanı 92).

**Süzgeç paneli tam ekran.** `fixed inset-0 z-50`, panel `w-full … sm:w-[400px]`
(`client/src/components/shell/FilterPanel.tsx:46-49`); başlık `h-14` (50), gövde `flex-1
overflow-y-auto` (54), altlıkta "Süzgeci temizle" ve "Listeyi göster" (55-58); `Esc` kapatır (39),
açılışta ilk alan odaklanır (41). Gövde kaydırması **kilitlenmez**: `Modal` açıkken
`document.body.style.overflow = 'hidden'` yapılır (`ui.tsx:199`), burada böyle bir satır yoktur ve
parmakla arkadaki liste kayar. Kapatma düğmesi `p-2` + `size-5` ikon = **42px** (52: 2,19×2 rem dolgu
+ 5×2,19px ikon; bu belgenin eski sürümü kaba hesapla ~36px diyordu, kutu 42px'tir) ve 44px hedefinin
altında kalır. Panel bugün yalnız sevkiyatta kullanılır (`TripsPage.tsx:380, 466-468`).

**Ölçüm var, profil farklı.** `client/e2e/mobile.spec.ts:12-14` 15 adreste (satır 4)
`document.documentElement.scrollWidth` ile `main`/`.card` sağ kenarını ölçer, ama profil
**375×812**'dir (`client/playwright.config.ts:20`); 390×844 yalnız Expo spec'lerinde geçer
(`office-app.spec.ts:5`, `driver-app.spec.ts:5`). Alt çubuk hiçbir testte denenmez:
`mobile.spec.ts:17` üst çubuktaki "Menüyü aç"a basar (`Layout.tsx:87`), alt çubuktaki karşılığı
"Tüm menü"dür (264). `SectionTabs` ise `overflow-x-auto` + `min-w-max`'tır
(`client/src/components/shell/SectionTabs.tsx:17-18`), yani e-Fatura'nın üç sekmesi
(`sections.ts:12-16`) 390px'te yana kayar.

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────┐  390×844
│ ☰  [🔍 Ara]                    Aa  🔔  👤 │  56px  üst çubuk
├──────────────────────────────────────────┤
│ Sevkiyatlar                    [+ Ekle]  │
│ Sevkiyat Listesi │ Harita                │  bölüm sekmeleri (kaymaz)
│ [🔍 Müşteri, plaka…]        [Süzgeç (2)] │  43,8px
│ (Durum: Yolda ✕)  Süzgeci temizle        │
│ ┌ kart ────────────────────────────────┐ │
│ │ 05.10.2026  [16 KZ 528]      [Yolda] │ │  kart ≤120px
│ │ ABC Nakliyat                         │ │
│ │ Kocaeli → Ankara                     │ │
│ │ Ali Demir   17.000,00 TL (1.250,00)  │ │
│ │ [Teslim edildi yap]              [⋯] │ │  tek durum + tek ⋯
│ └──────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Bugün   Sevkiyatlar   ( + )   Cari  Menü │  ~64px + safe-area
└──────────────────────────────────────────┘
```

Yer değişiklikleri: (1) beş eşit yuva, 390px'te yuva başına **78px**; çubuk ve `main` dolgusu rem
olduğundan yazı boyutuyla büyür (~64px Normal, ~76px "Çok büyük"). (2) `main` dolgusu ölçüm sonrası
`pb-24` (105px) = engel ~89px + 16px nefes payı. (3) Kart **≤120px**, en çok 4 metin satırı, ilk
ekranda **≥4 tam kart**. (4) Süzgeç paneli tam ekran kalır, bölüm sekmeleri kaymaz.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Bugün · Sevkiyatlar · Cari | alt çubuk bağlantısı | — | `/`, `/seferler` ve `accounting` varsa `/cari/musteriler`, yoksa `/musteriler` (263); etkin yuva `end` ile tam eşleşir (244-249) | — |
| + | düğme | — | `QuickActionMenu` açılır; `Esc` kapatır (`Layout.tsx:130-131`) | "Bu işlem için yetkiniz yok." (bugünkü metin `api/client.ts:68`; menünün kendisi hata basmaz) |
| Menü | düğme | — | Sol çekmece (`w-[236px]`) açılır (264) | — |
| Kart: durum düğmesi | düğme | — | Sıradaki durum tek dokunuşla; metin tabloyla aynı ("Yolda yap") | **Hedef metin** "Sevkiyat durumunu güncellenemedi." (bugün kodda böyle bir metin yok; hata `toast` ile sunucudan gelen metinle gösterilir) |
| Kart: ⋯ İşlemler | menü | — | Düzenle · Kopyala · Şoför bilgisini kopyala · Sil | — |
| Süzgeç (n) · Listeyi göster · ✕ | düğme | — | Tam ekran panel açar/kapatır; `aria-haspopup="dialog"` (`FilterPanel.tsx:14`) | — |

Klavye: `Esc` paneli ve menüleri kapatır (`FilterPanel.tsx:39`, `Menu.tsx:28`), `Ctrl+K` arama
(`GlobalSearch.tsx:24`), `Ctrl+Enter` kaydeder (`ui.tsx:193-196`). Telefonda klavye kısayolu
beklenmez; **kaydet düğmesi ekranda kalmalıdır** — `Modal` altlığı `flex-wrap`'dir (`ui.tsx:228`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** kart listesi yalnız `rows.length > 0` iken çizilir (`DataTable.tsx:78`); boşta `Empty`
  (149, `ui.tsx:268-270`: "Kayıt bulunamadı."). Hedef: iki satır + tek ana düğme.
- **Yükleniyor:** kayıt gelmeden yalnız `Spinner` (148), satırlar gelince `opacity-50` (79, 126).
  Telefonda iskelet **yoktur**; hedef 3 kartlık gri iskelet (`29-GORSEL-SISTEM.md`).
- **Hata:** `ErrorState` + "Tekrar dene" (148, `ui.tsx:252-261`); geçici hatada metin "Sunucu birkaç
  saniye içinde açılıyor olabilir." (253). Kart listesinde hata yalnız `rows` hiç gelmediğinde çizilir
  (148); elde satır varken yenileme hatası sessiz kalır (hedef: telefonda üstte ince uyarı şeridi).
- **Yetkisiz:** Cari yuvası `accounting` yoksa `/musteriler`'e düşer (263); menü yalnız yetkili
  maddeleri gösterir (243) ve hiç yetki yoksa boş kalır — o durumda "+" gizlenmelidir.
- **Ayna:** menüde "pratikortam'a girin" bildirimi (161-166), maddeler `opacity-60` ile tıklanamaz
  (173-177); `Button write` gizlenir (`ui.tsx:32`). "+" görünür kalabilir ama kayıt açmamalıdır.
- **Lisans:** `LicenseStatus.readOnly` tanımlıdır (`client/src/lib/license.ts:20`) ve bant
  `LicenseBanner` ile gösterilir (`Layout.tsx:107`), ama **bu alanı okuyan istemci kodu yoktur**; süre
  bittiğinde bile "+" formu açar (`Layout.tsx:258, 179`). Sunucu yazmayı reddeder (`AGENTS.md` §5,
  `docs/LISANS.md`). Hedef: "+" gizlenir ya da "Aboneliğiniz bitti: şu an yalnızca görüntüleme
  yapılabilir." denir.

## 6. Metinler ve terimler

Görünecek tam metinler: "Bugün", "Sevkiyatlar", "Cari", "Menü"; ekran okuyucu için "Yeni kayıt ekle",
"Tüm menü", "Alt kısayollar"; "Süzgeç", "Süzgeci temizle", "Listeyi göster", "Kapat"; "Kayıt
bulunamadı.", "Tekrar dene", "Sunucu birkaç saniye içinde açılıyor olabilir."; "N kayıt seçildi",
"Seçimi kaldır", "Toplam N kayıt", "Sayfa N / M", "Önceki", "Sonraki".

Hedefte sadeleşecek bugünkü metinler: "Ana Sayfa" (255), "Sevkiyat" (256), "Cariler" (263) ve
"(kısayol)" eki (245). Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` ile uyumludur:
"Sefer" değil **Sevkiyat**. Teknik sözcük yasak: alt çubukta ve süzgeç panelinde "ayna", "dry-run",
"token", "endpoint" geçmez. Para `tl()` ile iki kuruş, tarih `03.10.2026`, plaka `PlateBadge`.

## 7. Telefon davranışı (390×844)

Kırılma noktası notu: Tailwind `sm` = 40rem'dir; medya sorgusundaki `rem` **tarayıcı varsayılanına**
(16px) göre hesaplandığı için eşik her zaman **640px**'tir ve `html { font-size: 17.5px }`
(`index.css:91`) eşiği kaydırmaz; yazı boyutu yalnız ögelerin ölçüsünü büyütür. Sıra: (1) alt çubuk
etiketleri `uiMode`'a bağlanır, `min-w-0` + `truncate` ile taşma önlenir; (2) `main` alt dolgusu
ölçülen çubuk yüksekliğine göre ayarlanır; (3) `mobileCard` bütün listelere eklenir; (4) kartlara tek
durum düğmesi ve ⋯ konur; (5) `FilterPanel`'e gövde kilidi, odak tuzağı ve 44px kapatma eklenir;
(6) bölüm sekmeleri kaymaz hâle gelir.

Etiketlerin en uzunu "Sevkiyatlar"dır (11 harf, ~84px, 15,3px yazıyla) ve 78px'lik yuvaya sığmaz;
tek kelime bölünemediği için taşma belge genişliğini büyütür ve `mobile.spec.ts:12-14` kırmızıya
döner. Bu yüzden etiket sarmalı `min-w-0 truncate` olur.

## 8. Erişilebilirlik ve klavye

- Alt çubuk `nav aria-label="Alt kısayollar"` (254), sol çekmece `aria-label="Ana menü"` (49); iki
  gezinme bölgesi ayrı ad taşır, bu korunur.
- "+" düğmesine `aria-haspopup="menu"` + `aria-controls` eklenir (bugün yalnız `aria-expanded`, 258).
  Menü `role="menu"`/`role="menuitem"` taşır (160, 174, 179) ve ilk madde odaklanır (`Menu.tsx:21`
  `DropMenu` deseni; hızlı menüde henüz yok).
- Kartlar `onClick` ile açılır (`DataTable.tsx:89`); klavye için ya gerçek bir bağlantı/`button`
  içermeli ya da `tabindex="0"` + `role="button"` + `Enter/Space` desteği almalıdır.
- Odak halkası `:focus-visible` ile 3px (`index.css:102-106`). Renk körlüğü: durum **rozet + metin**
  (`ui.tsx:70-77`), plaka `PlateBadge` (80-88); satırda en çok 1 durum rozeti kuralı korunur.
- Dokunma hedefi ≥44px uygulanacak ögeler: alt çubuk yuvaları, "+", kart durum düğmesi, kart ⋯,
  süzgeç kapatma, sayfalama, `Chip`, `IconButton`. Bugün 44px altında kalanlar: `Button size="sm"`
  `min-h-8` = 35px ve `"md"` `min-h-9` = 39,4px (`ui.tsx:36`), `IconButton` `size-9` (51), `Chip`
  `min-h-8` (344), sayfalama ve `sm` altında gizlenen etiketleri (`DataTable.tsx:154-159`),
  `RowMenu` `size-9` ile menü maddeleri ~42px (`Menu.tsx:40, 67-70`). Hedefi tutanlar: üst çubuk menü
  düğmesi 48,1px (`Layout.tsx:87`), `.input` 43,8px (`index.css:111`); iOS'ta odaklanınca sayfa
  büyümesini `.input` için `max(16px, 1rem)` engeller (114-115).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/mobile.spec.ts` (1 test, 15 adres, 375×812; taşma ölçümü 12-14, menü 17-19);
`client/e2e/new-ui/basics.spec.ts:38-56` (süzgeç paneli, çip, satır menüsü — masaüstü);
`office-app.spec.ts:5` ve `driver-app.spec.ts:5` (390×844 ama Expo önizlemesi); `helpers.ts:44-46`
`useNewUi(page)`. Playwright projeleri: masaüstü 1440×900, mobil 375×812 (`playwright.config.ts:19-20`).

Eklenecek: `client/e2e/mobile-panel.spec.ts` (yeni; `viewport: { width: 390, height: 844 }, isMobile:
true, hasTouch: true`), 8 test: (1) alt çubuk görünür, beş yuva var, etkin yuva adrese göre işaretli;
(2) her yuva doğru adrese gider, Menü çekmeceyi açar; (3) "+" menüsü en az 8 madde gösterir ve "Yeni
Sevkiyat" formu açar; (4) en az 12 liste adresinde `main table` görünmez, `main ul` görünür; (5) kart
durum düğmesi durumu tek dokunuşla ilerletir; (6) süzgeç paneli 390×844'ü kaplar, `Esc` kapatır,
panel açıkken `window.scrollY` değişmez; (7) 44px altı etkileşimli öge sayısı 0; (8) `data-text="xl"`
ile taşma yok, 639px'te tablo, 641px'te kart görünür. Masaüstünde bir test alt çubuğun 1440px'te
gizli olduğunu doğrular. Test silme/atlama yasaktır (`KOLAYLASTIRMA-UYGULAMA.md:493`); sunucu
sözleşmesi değişmediği için birim testi gerekmez, `npm run lint && npm run build` zorunludur.

## 10. Uygulama adımları

1. **`client/src/components/Layout.tsx:244-266`.** Alt çubuk etiketleri `newNav` adlarına bağlanır
   (Bugün · Sevkiyatlar · + · Cari · Menü); etiket sarmalı `min-w-0 truncate`. *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
2. **`Layout.tsx:237-267`.** Çubuğa `readOnly` (`license.ts:41-43`) ve ayna durumu geçirilir; salt
   okunurken "+" gizlenir ya da bildirim gösterir. *Süre: 1,5 saat.* Doğrulama:
   `npx playwright test e2e/license.spec.ts`.
3. **`Layout.tsx:114`.** `pb-28` yerine ölçülen çubuk yüksekliği + 16px (`pb-24`). *Süre: 1 saat.*
   Doğrulama: `npx playwright test e2e/mobile-panel.spec.ts`.
4. **`DataTable.tsx:78-100`.** Kart listesine klavye erişimi (`role`/`tabindex` veya iç bağlantı) ve
   `aria-label`. *Süre: 2,5 saat.* Doğrulama: `cd client && npm run lint`.
5. **`DataTable.tsx:154-160`, `ui.tsx:36,51,344`, `Menu.tsx:67-70`, `FilterPanel.tsx:52`.** Telefonda
   44px hedefi (`min-h-11 sm:min-h-8` gibi). *Süre: 2,5 saat.* Doğrulama:
   `npx playwright test e2e/mobile-panel.spec.ts`.
6. **`FilterPanel.tsx:35-59`.** Gövde kaydırma kilidi, odak tuzağı (ilk-son öge arası `Tab`) ve 44px
   kapatma. *Süre: 2,5 saat.* Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
7. **`TripsPage.tsx:423-436`.** Karta tek durum düğmesi + `RowMenu`; kart ≤120px için satır sayısı
   4'te tutulur. *Süre: 3 saat.* Doğrulama: `npx playwright test e2e/trips.spec.ts`.
8. **`mobileCard`'ı olmayan 14 dosyaya kart görünümü** (bölüm 2'deki tam liste; ör.
   `VehiclesPage.tsx:104`, `DriversPage.tsx:113`, `ChecksPage.tsx:89`, `PaymentsPage.tsx:81`,
   `SupplierPaymentsPage.tsx:76`, `PurchaseInvoicesPage.tsx:91`, `ExpensesPage.tsx:126`,
   `SettingsPage.tsx:273`); ortak gövde için **yeni** `client/src/components/shell/RowCard.tsx`
   yazılır. *Süre: 6 saat.* Doğrulama: `npx playwright test e2e/vehicles.spec.ts`.
9. **`DashboardPage.tsx:86,145,173,195`, `CustomerDetailPage.tsx:118,132,146,159`,
   `SupplierDetailPage.tsx:134,154,164,179,192`, `ReportsPage.tsx` (11 çağrı), `AuditLog.tsx:58`,
   `InvoiceNotesCard.tsx:35`.** `RowCard` ile kart görünümü. *Süre: 7 saat.* Doğrulama:
   `npx playwright test e2e/cari.spec.ts e2e/mobile-panel.spec.ts`.
10. **`SectionTabs.tsx:17-24`** (sekmeler kaymaz), **`client/e2e/mobile-panel.spec.ts`** (yeni, 8 test)
    ve **`client/playwright.config.ts:19-20`** (yeni spec mobil projeye eklenir). *Süre: 7,5 saat.*
    Doğrulama: `npx playwright test e2e/mobile.spec.ts e2e/mobile-panel.spec.ts`.

Toplam **~36 saat (4-5 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası:
testler → commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 390×844'te alt çubukta **beş yuva** ve "Bugün", "Sevkiyatlar", "Cari", "Menü" metinleri; 1440×900'de
   çubuk **görünmez**.
2. "+" her ekrandan **1 dokunuşla** açılır, menüde yetkiye uyan **en az 8 madde** vardır; "Yeni
   Sevkiyat" 1 dokunuşla formu açar.
3. Kart görünümü verilen bütün liste ekranlarında `main table` **display:none**, `main ul` görünür;
   12+ adreste yatay taşma **0px**.
4. `/seferler` telefonda ilk ekranda **≥4 tam kart**, kart **≤120px**, kartta **1 durum düğmesi + 1
   ⋯**; durum ilerletme **1 dokunuş** ve rozet anında değişir.
5. Süzgeç paneli 390×844'ü kaplar; `Esc` ve ✕ kapatır; panel açıkken `window.scrollY` sabittir.
6. Dokunma hedefi denetiminde (alt çubuk, kart düğmeleri, panel) **44px altı öge sayısı 0**.
7. 639px'te tablo, 641px'te kart görünür; `data-text="xl"` + 390×844'te taşma yok, etiketler
   kırpılır ve satır atlamaz.
8. e2e: mevcut spec'ler yeşil + yeni dosyada **8 test**; `npm run lint && npm run build` temiz;
   telefonda 4 iş denenirken ekran **hiç yana kaydırılmaz**.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| "Sevkiyatlar" yuvaya sığmaz, belge genişler | `min-w-0 truncate`; 390px taşma testi | Kısa ad "Sevkiyat" korunur |
| Alt çubuk ile sol menü farklı ad söyler | Etiketler tek kaynaktan (`newNav`) | Bugünkü sabit metinlere dönülür |
| Karta düğme + ⋯ eklenince kart 120px'i aşar | Satır sayısı 4'te tutulur, e2e ölçer | ⋯ kaldırılır, durum düğmesi kalır |
| 14 dosyaya `mobileCard` eklerken davranış bozulur | Yalnız görünüm katmanı, süzgeç mantığı korunur | Dosya bazında geri alınır |
| `FilterPanel` gövde kilidi iç içe pencereyi kilitler | Kilit `Modal` gibi sayaçla (`ui.tsx:199-204`) | Kilit kaldırılır, odak tuzağı kalır |
| 44px hedefi masaüstü yoğunluğunu bozar | Yalnız `sm` altında büyütme, XL'de ölçüm | Ölçüler eski hâline alınır |

## 13. Doğrulanacaklar

1. **Alt çubuk metinleri kesin mi?** `KOLAYLASTIRMA-UYGULAMA.md:396` "Bugün · Sevkiyatlar · (+) · Cari
   · Menü" der; kodda "Ana Sayfa", "Sevkiyat", "Cariler" var (`Layout.tsx:255-263`). "Cari" tekil mi?
2. **"+" menüsünde kaç madde?** Bugün 10 maddenin tamamı (`Layout.tsx:243`); yalnız `main: true`
   (7 madde, `quickActions.ts:19-28`) mu gösterilecek?
3. **Resmî telefon ölçüsü hangisi?** Belge ve `office-app.spec.ts:5` 390×844 der, mobil profil
   375×812'dir (`playwright.config.ts:20`); ikisi birlikte mi koşacak?
4. **Alt çubuk klasik görünümde de kalsın mı?** Bugün yalnız `lg:hidden` var (254), `uiMode` ayrımı yok.
5. **Sayaç ve 44px kuralı.** Sol menüdeki bekleyen iş sayaçları (`Layout.tsx:65-70`) yalnız sol
   menüde çizilir, alt çubukta karşılığı yoktur; alt çubuğa eklenecek mi? 44px hedefi tüm panelde mi,
   yalnız alt çubuk + kart + süzgeç panelinde mi geçerli?
6. **Lisans salt okunurken "+" ne yapacak?** `readOnly` alanı istemcide hiç okunmuyor (`license.ts:20`).
7. **Bölüm sekmeleri nasıl davranacak?** Kaydırma korunacak, sığdırılacak yoksa "⋯" altında mı
   toplanacak (`SectionTabs.tsx:17-18`)?
8. **Kart düğmesi + ⋯** `docs/plan/03-SEVKIYATLAR-LISTE.md:165` ile uyumlu mu?
9. **Ölçüm değerleri.** 64px çubuk, 120px kart, 78px yuva ve ~89px engel kaba hesaptır; kesin değerler
   10. adımdaki e2e ölçümüyle sabitlenir. `RowCard.tsx` (8. adımda eklenecek), `PageShell`,
   `DetailDrawer` ve `pages/TodayPage.tsx` bugün kodda yoktur (`01-ORTAK-SARTNAME.md:143-146` §3.3);
   bu belge onları var saymaz.

Sonraki belgeyle bağlantı: `28-ORTAK-PARCALAR.md` (yazıldı, 268 satır) `FilterPanel` tam ekran
davranışının ve kart gövdesinin sözleşmesini devralır. `29-GORSEL-SISTEM.md` telefon iskeletini,
`31-TEST-CI.md` yeni mobil spec'inin CI'ya bağlanmasını, `32-TERMINOLOJI.md` alt çubuk metinlerini
devralacaktır; **bu üçü `docs/plan/` altında henüz yoktur** (kırık bağlantı; bkz. bölüm 1 denetim
notu, `00-DIZIN.md:77-78`).
