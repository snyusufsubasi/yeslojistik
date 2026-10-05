# Kolaylaştırma: uygulama kılavuzu (ChatGPT / Codex için adım adım)

> **Bu dosya kimin için?** Bu dosya, `docs/KOLAYLASTIRMA-PLANI.md` planını koda dökecek yapay zekâ ajanı (ChatGPT / Codex) için yazıldı. Planın "ne ve neden"i o dosyada; "nasıl"ı burada.
> **Kullanıcı planı onayladı (5 Ekim):** "tamam planı uygula". Terim değişikliği (**"Sefer" → "Sevkiyat"**, ekranda görünen yazılarda) da bu onaya dahildir.
>
> Önce şunları oku: `AGENTS.md` (kurallar), `docs/KOLAYLASTIRMA-PLANI.md` (hedef), `docs/TASARIM-OTOYOL.md` (görünüm), `docs/PRATIKORTAM-HARITA.md` (pratikortam menü ve ekranları).

---

## 0. Değişmez kurallar (her görevde geçerli)
1. **Canlı site bozulmaz.** `main` dalına giden her şey otomatik yayınlanır (Render). Testler geçmeden push yok.
2. **Adresler (URL) DEĞİŞMEZ.**
   - Bugünkü bütün sayfa adresleri aynen kalır: `/seferler`, `/cari/musteriler`, `/faturalar`, `/tahsilatlar`, `/odemeler`, `/alinan-faturalar`, `/giderler`, `/araclar`, `/kasa-banka`, `/cek-senet`, `/raporlar`, `/ayarlar` …
   - Sunucu bu adresleri bildirim ve e-postalarda kullanıyor; örneğin `/seferler?id=`, `/araclar?id=`, `/musteriler/{id}`, `/cek-senet`, `/ayarlar`.
   - Yeni menü ve sekmeler **mevcut adreslere bağlanır.** Yeni adres yalnız gerçekten yeni bir sayfa için açılır, örneğin `/bugun`, `/mazotlar`. Eski bir adres asla silinmez.
3. **Sunucuya (server/) dokunma.** Bu iş yalnız `client/` içindedir. Sunucu değişikliği gerekirse dur, kullanıcıya sor.
4. **Yeni görünüm bir anahtarın arkasında.**
   - Anahtar: `uiMode`, değerleri `'classic' | 'new'`.
   - Aşama F6'ya kadar **varsayılan `'classic'`**. Kullanıcı Profilim'den "Yeni görünüm"ü açar.
   - F6'da varsayılan `'new'` olur.
5. **Ayna modu korunur.** Yazma düğmeleri `<Button write>` / `<IconButton write>` ile gizlenmeye devam eder. `MirrorContext` ve `useMirror()` bozulmaz.
6. **Pratikortam'a erişme.** Pratikortam'ın görünümünü birebir kopyalama (logo, renk, ekran düzeni); yalnız **menü adları ve iş akışı** alınır.
7. **Her görevin sonunda** şunları yap:
   - `cd client && npm run lint && npm run build`;
   - `cd server && dotnet test` (sunucuya dokunulmasa da);
   - bütün e2e testleri (bkz. bölüm 9);
   - 1440×900 ve 390×844 ekran görüntüsü;
   - `docs/KOLAYLASTIRMA-PLANI.md` sonundaki "Durum" tablosunu güncelle;
   - commit → `git pull --rebase origin main` → `git push origin HEAD:main`.
8. **Kullanıcıya rapor** kısa ve sade Türkçe olur: ne değişti, nerede, müşteriye neyi göstermeli.

---

## 1. Kodda bilmen gerekenler (haritası)

| Ne | Nerede |
|---|---|
| Sayfa yönlendirmeleri | `client/src/App.tsx` (`<Routes>`; `Guard perm="accounting" / "admin"`) |
| Sol menü, üst çubuk, telefon alt çubuğu | `client/src/components/Layout.tsx` (`navGroups`, `NewMenu`, `QuickActionMenu`, `TextSizeButton`, `UserMenu`, `BottomBar`, `AlertsBell`) |
| "+ Yeni" menüsü listesi | `client/src/lib/quickActions.ts` |
| Ortak parçalar | `client/src/components/ui.tsx`: `Button(write)`, `IconButton`, `Badge`, `PlateBadge`, `Card`, `PageHeader`, `Field`, `Modal`, `ConfirmDialog`, `Tabs`, `Select`, `StatCard`, `Figures/Figure`, `Chip`, `DateFilter`, `Empty`, `Loading`, `MirrorContext` |
| Tablo | `client/src/components/DataTable.tsx` (`DataTable`, `SearchBox`) |
| Toplam şeridi | `client/src/components/SumStrip.tsx` |
| Form parçaları | `client/src/components/Inputs.tsx` (`AmountInput`, `DateQuick`, `Section`, `MoreFields`…), `FormSelect.tsx` (`SearchSelect`, `FormSelect`) |
| Yardımcılar | `client/src/lib/hooks.ts` (`usePaged`, `useLookup`, `useOpenNewFromUrl`, `useMirror`), `lib/format.ts` (`tl`, tarih), `lib/labels.ts`, `lib/textSize.ts`, `lib/auth.tsx` (`useAuth().can(perm)`) |
| Renk ve yazı jetonları | `client/src/index.css` (`@theme`) |
| Sayfalar | `client/src/pages/*.tsx`. En büyükleri: `TripsPage` (510 satır), `SettingsPage` (677), `ReportsPage`, `DashboardPage`, `ExpensesPage`, `InvoicesPage` |
| Tarayıcı testleri | `client/e2e/*.spec.ts`, yardımcı `e2e/helpers.ts` (`login`) |

**Mevcut menü (23 madde):** Ana Sayfa, Araç Takip Haritası | SEVKİYAT: İş Talepleri, Sevkiyatlar | CARİ: Müşteriler Cari, Tedarikçiler Cari, Faturalar, Tahsilatlar, Alınan Faturalar, Tedarikçi Ödemeleri | LİSTELER: Müşteriler, Tedarikçiler, Şoförler, Personeller, Sabit Ödemeler, Veri Aktarımı | ÖZ MAL: Araçlar, Giderler | BANKA & ÇEK: Kasa / Banka, Çek / Senet | RAPOR VE YÖNETİM: Raporlar, Ayarlar, Yardım.

---

## 2. Hedef menü (yeni görünüm) — kesin liste
Gruplar **hep açık** (katlanmaz). Sıra pratikortam ile aynı. `perm` sütunu bugünkü yetkiyle aynı kalır.

| Grup | Menü adı | Gideceği adres | perm | Not |
|---|---|---|---|---|
| — | **Bugün** | `/` (yeni Bugün ekranı, F2) | — | Bugünkü Ana Sayfa'nın yerini alır |
| — | **e-Fatura** | `/faturalar` | — | Sekmeler: bkz. 3 |
| RAPORLAR | **Müşteriler Cari** | `/cari/musteriler` | accounting | |
| RAPORLAR | **Tedarikçiler Cari** | `/cari/tedarikciler` | accounting | |
| RAPORLAR | **Tedarikçi Ödemeleri** | `/odemeler` | — | |
| RAPORLAR | **Analiz** | `/raporlar` | accounting | |
| — | **Sevkiyatlar** | `/seferler` | — | |
| LİSTELER | **Müşteri Listesi** | `/musteriler` | — | |
| LİSTELER | **Tedarikçi Listesi** | `/tedarikciler` | — | |
| LİSTELER | **Şoför Listesi** | `/soforler` | — | |
| LİSTELER | **Personel Listesi** | `/personel` | accounting | |
| LİSTELER | **Sabit Ödeme Listesi** | `/sabit-odemeler` | accounting | |
| ÖZ MAL | **Mazotlar** | `/mazotlar` (yeni, F4) | — | F4'e kadar `/giderler?kategori=Fuel` |
| ÖZ MAL | **Giderler** | `/giderler` | — | |
| ÖZ MAL | **Araç Masrafları** | `/arac-masraflari` (yeni, F4) | — | F4'e kadar menüde yok |
| ÖZ MAL | **Araçlar** | `/araclar` | — | |
| — | **Yönetici** | `/ayarlar` | admin | Admin değilse görünmez |
| BANKA & ÇEK | **Bankalar** | `/kasa-banka` | accounting | |
| BANKA & ÇEK | **Çekler** | `/cek-senet` | — | |

**Menüden çıkanlar ve yeni yerleri** (sayfalar silinmez, yalnız menüden kalkar):

| Çıkan madde | Yeni yeri |
|---|---|
| Ana Sayfa | "Bugün" |
| Araç Takip Haritası | Sevkiyatlar → "Harita" sekmesi (`/harita`) |
| İş Talepleri | Bugün → "İş Talepleri" sekmesi (`/is-talepleri`) |
| Faturalar | e-Fatura |
| Tahsilatlar | Müşteriler Cari → "Tahsilatlar" sekmesi (`/tahsilatlar`) |
| Alınan Faturalar | e-Fatura → "Alınan Faturalar" sekmesi (`/alinan-faturalar`) |
| Veri Aktarımı | Yönetici → "Veri Aktarımı" sekmesi (`/aktar`) |
| Ayarlar | Yönetici (`/ayarlar`) + Profilim |
| Yardım | Üst çubukta "?" simgesi (`/yardim`) |
| Raporlar | Analiz |

**Menü sayaçları** (sarı rozetler): bugünkü `badge` fonksiyonları yeni maddelere taşınır.
- `alertsAt(alerts, '/araclar')` gibi adres eşleşmeleri adresler aynı kaldığı için çalışmaya devam eder.
- Sevkiyatlar sayacı kalır. Faturalar sayacı e-Fatura'ya gider. İş talepleri sayacı Bugün'e gider.

---

## 3. Sayfa içi sekmeler (adrese bağlı sekme çubuğu)
Sekmeler **ayrı sayfalara giden bağlantılardır** (adres değişir, geri tuşu çalışır). Yeni parça: `SectionTabs` (bkz. 4.2).

| Bölüm | Sekmeler (sıra önemli) | Hangi sayfalarda görünür |
|---|---|---|
| Bugün | Bugün `/` · İş Talepleri `/is-talepleri` · Onay Bekleyenler `/?sekme=onay` | `/`, `/is-talepleri` |
| e-Fatura | Faturalandırılacaklar `/faturalar?sekme=bekleyen` · Kesilen Faturalar `/faturalar` · Fatura Kes `/faturalar/yeni` (accounting) · Alınan Faturalar `/alinan-faturalar` | `/faturalar`, `/faturalar/yeni`, `/alinan-faturalar` |
| Müşteriler Cari | Bakiyeler `/cari/musteriler` · Tahsilatlar `/tahsilatlar` | ikisi |
| Tedarikçiler Cari | Bakiyeler `/cari/tedarikciler` · Ödemeler `/odemeler` · Alınan Faturalar `/alinan-faturalar?kaynak=tedarikci` | üçü (Tedarikçi Ödemeleri menüden de açılır) |
| Sevkiyatlar | Liste `/seferler` · Pano `/seferler?gorunum=pano` · Harita `/harita` | `/seferler`, `/harita` |
| Öz Mal | Mazotlar · Giderler · Araç Masrafları · Araçlar | dördü |
| Banka & Çek | Bankalar `/kasa-banka` · Çekler `/cek-senet` | ikisi |
| Yönetici | Firma · Kullanıcılar · İşlem Geçmişi · Veri Aktarımı (`/aktar`) · Yedek ve Veri · Abonelik · Kurulum (`/kurulum`) | `/ayarlar?tab=…`, `/aktar`, `/kurulum` |

- Sekme çubuğu yalnız `uiMode === 'new'` iken görünür.
- `/seferler` sayfasındaki mevcut "Liste/Pano" düğmeleri, yeni görünümde bu sekmelere dönüşür (görünüm adres parametresinden okunur).

---

## 4. Yeni ortak parçalar (F1'de yazılır)
Yer: `client/src/components/shell/`. Hepsi Otoyol jetonlarını kullanır (`index.css`). Erişilebilir olmalı; klavye ile tam kullanılmalı.

### 4.1 `lib/uiMode.ts`
```ts
export type UiMode = 'classic' | 'new'
// localStorage anahtarı 'yes.uiMode'. Okuma/yazma try/catch içinde (gizli pencere).
// Varsayılan: F6'ya kadar 'classic', F6'da 'new' (DEFAULT_UI_MODE sabiti).
export function useUiMode(): [UiMode, (m: UiMode) => void]
export function applySavedUiMode(): void // main.tsx'te çağrılır; <html data-ui="new|classic">
```
- `useTextSize` ile aynı desen kullanılır (`lib/textSize.ts`).
- Bütün parçalar aynı değeri okusun diye basit bir React context (`UiModeProvider`) ya da `useSyncExternalStore` kullan.

### 4.2 `SectionTabs`
```tsx
<SectionTabs tabs={[{ to: '/cari/musteriler', label: 'Bakiyeler' }, { to: '/tahsilatlar', label: 'Tahsilatlar', perm?: 'accounting' }]} />
```
- `role="tablist"` / `role="tab"`, `aria-selected`.
- Etkin sekme `useLocation()` ile bulunur. Önce yol eşleşir, sonra (varsa) `?sekme=` eşleşir.
- Görünüm: alt çizgili sekmeler; etkin olanın altında 2px accent çizgi. Dar ekranda yatay kaydırılabilir (sayfa taşmaz).
- Sekme tanımları **tek dosyada** durur: `client/src/lib/sections.ts`. Bölüm 3'teki tablo burada kod olarak tutulur, her sayfa kendi bölümünü buradan alır.

### 4.3 `PageShell`
```tsx
<PageShell title="Sevkiyatlar" section="sevkiyat" primary={<Button write icon={<Plus/>} onClick=…>Sevkiyat Ekle</Button>}
  more={[{ label: 'Excel (Özet)', onClick }, { label: 'İcmal', onClick }, …]}>
  …sayfa içeriği…
</PageShell>
```
- **Üst satır:** sol tarafta başlık. Sağ tarafta önce `MoreMenu` ("⋯ Diğer"), sonra tek ana düğme.
- **Altında** `SectionTabs` (section verilmişse ve `uiMode==='new'`).
- **Klasik görünümde** bugünkü `PageHeader` gibi davranır: başlık, alt başlık, düğmeler yan yana. Böylece sayfalar tek kodla iki görünümü destekler.
- Alt başlık (subtitle) yeni görünümde **gösterilmez**; sade olsun.

### 4.4 `MoreMenu` ("⋯ Diğer")
- Düğme metni "Diğer", simgesi `MoreHorizontal` (lucide).
- Açılır listede her madde bir `{ label, onClick | href, icon?, write?, perm? }`. `write` maddeler ayna modunda gizlenir.
- Klavye: ↑↓ ile gezinme, Enter ile seçme, Esc ile kapatma, dışarı tıklayınca kapanma. Bugünkü `useClickOutside` (Layout'ta) ortak dosyaya taşınabilir.

### 4.5 `RowMenu` (satır sonundaki "⋯")
- `IconButton label="İşlemler"` ve aynı açılır liste davranışı.
- Satırın kendi tıklamasını tetiklemez (`e.stopPropagation()`).

### 4.6 `FilterPanel` (sağdan açılan süzgeç)
```tsx
<FilterBar search={…} quick={<…1-2 hızlı süzgeç…/>} activeCount={n} onOpen={() => setOpen(true)} chips={[{ label: 'Müşteri: X', onClear }]} onClearAll />
<FilterPanel open={open} onClose title="Süzgeç">…bugünkü süzgeç kutuları…</FilterPanel>
```
- **FilterBar:**
  - arama kutusu;
  - 1-2 hızlı süzgeç;
  - "Süzgeç (n)" düğmesi;
  - altında açık süzgeç çipleri, her biri ✕ ile silinir;
  - "Süzgeci temizle" bağlantısı.
- **FilterPanel:**
  - sağdan 380px genişliğinde kayan panel; telefonda tam ekran;
  - odak panel içinde kalır, Esc ile kapanır;
  - altta "Uygula" düğmesi (süzgeçler zaten anında uygulanıyorsa "Kapat").
- Süzgeç değerleri bugünkü gibi **adreste** tutulur (`TripsPage` zaten yapıyor). Panel yalnız yerleşimi değiştirir, mantığı değil.

### 4.7 `DetailDrawer` (sağdan ayrıntı paneli)
- Sağdan 560px genişliğinde panel; telefonda tam ekran. Başlık, sekmeler ve içerik içerir.
- Adrese `?id=` yazılır. Sunucu bildirimleri `/seferler?id=5` gibi adresler kullanıyor; bunlar paneli açmalı.
- **F2'de yalnız Sevkiyatlar'da kullanılır.** İçeriği bugünkü sevkiyat düzenleme penceresiyle (TripForm modal) aynıdır; yalnız kap değişir. İstersen ilk sürümde mevcut `Modal`'ı kullan, panele geçiş F6'da yapılabilir.

### 4.8 Görünüm jetonları (yalnız yeni görünüm)
`index.css` içinde `html[data-ui="new"]` altında:
- **Kart köşesi:** `--radius-xl: 6px`, `--radius-2xl: 8px`. Açılır pencerelerde mevcut gölge.
- **Boşluk:** sayfa içerik genişliği değişmez. Bölümler arası boşluk `space-y-6` → `space-y-7`.
- **Rozetler:** yalnız uyarı (warn/bad) dolgu rengi alır. Bilgi rozetleri (Planlandı vb.) çerçevesiz, yumuşak ton olur (bugünkü `Badge` tonları korunur, doygunluk biraz düşer).
- **Tablo yazısı (opsiyon B):** `html[data-ui="new"][data-table-font="sans"] td { font-family: "Source Sans 3", …}`.
  - Paket: `@fontsource-variable/source-sans-3`.
  - Profilim → Görünüm'de "Tablo yazısı: Tırnaklı / Düz" seçimi. Varsayılan **Tırnaklı**.
  - Müşteri F1 sonunda seçer; seçim varsayılan yapılır.
- **Satır sıklığı:** `data-density="compact"` iken `.td` dikey dolgusu 7px → 4px. Profilim → Görünüm'de "Rahat / Sık".

---

## 5. Aşamalar ve görev kartları
Her kartta: **Amaç · Dosyalar · Adımlar · Kabul · Test**. Kartları sırayla yap. Bir kart bitince commit + push, sonra sonraki kart.

### F1 — Temel: anahtar, menü, sekmeler, ortak parçalar

**F1.1 Görünüm anahtarı**
- **Dosyalar:** `lib/uiMode.ts` (yeni), `main.tsx`, `Layout.tsx` (UserMenu), `index.css`.
- **Adımlar:**
  1. 4.1'deki kodu yaz.
  2. `main.tsx` içinde `applySavedUiMode()` çağır.
  3. Kullanıcı menüsüne, Yazı boyutu bölümünün altına "Görünüm: Klasik / Yeni" radyo düğmesi ekle.
- **Kabul:** seçim sayfa yenilenince korunur ve `<html data-ui>` değişir.
- **Test:** e2e `ui-mode.spec.ts`: Yeni seç → `data-ui="new"`, sayfa yenile → hâlâ yeni.

**F1.2 Yeni menü**
- **Dosyalar:** `Layout.tsx`, yeni `lib/nav.ts`.
- **Adımlar:**
  1. Bugünkü `navGroups` dizisini `lib/nav.ts`'ye `classicNav` adıyla taşı (davranış aynı).
  2. Bölüm 2'deki tabloya göre `newNav` yaz.
  3. `Layout` `uiMode`'a göre birini seçsin.
  4. Yeni menüde **Yardım** maddesi menüden kalksın; üst çubuğa `HelpCircle` simgeli bağlantı (`aria-label="Yardım"`, `/yardim`) gelsin.
  5. Kullanıcı menüsü başlığı "Profilim" olsun.
- **Kabul:**
  - Yeni görünümde menü maddeleri bölüm 2'deki ad ve sırada.
  - Yetkisiz kullanıcı yetkisi olmayanı görmez.
  - Sayaçlar doğru maddede.
- **Test:** e2e yeni spec, menü sırası. **Klasik görünüm testleri hiç değişmeden geçmeli.**

**F1.3 Sekmeler**
- **Dosyalar:** `components/shell/SectionTabs.tsx`, `lib/sections.ts`.
- **Adımlar:**
  1. Bölüm 3 tablosunu kodla.
  2. Sekmeyi ilgili sayfaların başlığının altına ekle (PageHeader/PageShell üzerinden).
  3. `?sekme=` ve `?gorunum=` destekleri için ilgili sayfaya küçük okuma kodu ekle:
     - `/faturalar?sekme=bekleyen` → teslim edilmiş, faturasız sevkiyatlar görünümü;
     - `/seferler?gorunum=pano` → pano.
- **Kabul:** her bölümde sekmeler görünür, adres değişir, geri tuşu çalışır.

**F1.4 Ortak parçalar**
- **Dosyalar:** `components/shell/{PageShell,MoreMenu,RowMenu,FilterBar,FilterPanel,DetailDrawer}.tsx`.
- **Adımlar:** 4.3-4.7'yi yaz. Henüz sayfalara uygulama; yalnız bir örnek sayfada (Çekler) kullanıp dene.
- **Kabul:** klavye ile açılır/kapanır; telefonda tam ekran; ayna modunda `write` maddeleri gizli.

**F1.5 Terim değişikliği ("Sefer" → "Sevkiyat")**
- **Kapsam:** yalnız **ekranda görünen** Türkçe metinler:
  - `client/src`: başlıklar, düğmeler, toast mesajları, boş durum yazıları, yardım sayfası;
  - `docs/KULLANIM.md`.
- **Değişmeyenler:** değişken/tip adları (`Trip`), adresler (`/seferler`), sunucu kodu.
- **Sunucu mesajları:** sunucudan gelen Türkçe hata mesajları (ör. "Seçilen seferlerden bazıları…") **bu görevde değişmez.** Listeyi `docs/KOLAYLASTIRMA-PLANI.md`'ye not düş; sonra kullanıcı onayıyla ayrı görev olur.
- **Örnekler:**
  - "Yeni Sefer" → "Yeni Sevkiyat";
  - "Sefer Oluştur" → "Sevkiyat Ekle";
  - "Sefer listesi" → "Sevkiyat listesi";
  - "sefer" → "sevkiyat";
  - "seferler" → "sevkiyatlar";
  - Türkçe ek uyumuna dikkat: "seferin" → "sevkiyatın", "sefere" → "sevkiyata".
- **Uyarı:** bu değişiklik e2e testlerindeki metinleri kırar; testleri de aynı commit'te güncelle (bölüm 9).
- **Kabul:** `grep -rn "Sefer\|sefer" client/src` sonucunda yalnız kod adları ve yorumlar kalır.

### F2 — Bugün + Sevkiyatlar + Sevkiyat Ekle

**F2.1 Bugün ekranı** (`/`, yeni görünümde)
- **Dosyalar:** `pages/TodayPage.tsx` (yeni). `App.tsx` index rotası `uiMode==='new' ? <TodayPage/> : <DashboardPage/>` olur.
- **İçerik:**
  1. Başlık "Bugün" ve tarih. Sağda ana düğme "+ Sevkiyat Ekle" (`/seferler?new=1`).
  2. **3 rakam** (`Figures`): Bugün yüklenecek · Yolda · Teslim edildi (bugün). Veri: mevcut `/dashboard` ve `/trips` uçları; yeni uç yok.
  3. En fazla 2 ince uyarı bandı:
     - "N sevkiyat faturalanmadı → Fatura kes";
     - "N masraf onay bekliyor → İncele".
     Veri mevcut `/dashboard` cevabında var.
  4. **Liste**: bugünün sevkiyatları ve iş talepleri. Zaman sekmeleri Bugün · Gelecek · Geçmiş · Hepsi (`Chip`). Görünüm "Tablo / Kart". Kayda tıklayınca sevkiyat açılır (`/seferler?id=`).
  5. `?sekme=onay`: onay bekleyen teslim evrakları + şoför masrafları tek listede. Toplu onay için mevcut uçlar kullanılır (Sevkiyatlar'daki toplu "Teslim evrakını onayla" ve Giderler'deki onay).
- **Kaldırılanlar** (yalnız yeni görünümde; klasikte aynen kalır): 7 kısayol kutusu, nakit akışı, "Bu ay", demo uyarısı (demo uyarısı yalnız Yönetici sayfasında görünür).
- **Kabul:** 1440×900'de liste ilk ekranda başlar (başlık + rakamlar + liste başlığı ≤ 320px).

**F2.2 Sevkiyatlar yeni yerleşim** (`pages/TripsPage.tsx`)
- **Adımlar:**
  1. `PageShell` kullan:
     - ana düğme "+ Sevkiyat Ekle";
     - `more` maddeleri: Excel (Özet), Excel (Detay), Sevkiyat PDF, İcmal, Excel'den Aktar, Fatura Kes.
  2. "Liste / Pano" yeni görünümde sekme olur (F1.3). "Özet / Detay" sütun anahtarı "⋯ Diğer → Sütunlar: Özet / Detay" olur.
  3. `FilterBar`: arama + hızlı süzgeç olarak zaman çipleri (Bugün/Gelecek/Geçmiş/Bu ay/Hepsi) + "Süzgeç (n)".
  4. **Bütün diğer süzgeçler `FilterPanel`'e.** Pratikortam sırası:
     - Başlangıç–Bitiş;
     - Durum;
     - Sevkiyat durumu (Faturalı/Faturasız/Komisyon işi);
     - Piyasa/Öz Araç;
     - Fatura;
     - Müşteri, Firma grubu, Tedarikçi, Plaka;
     - Yükleme yeri, İndirme yeri;
     - Sevkiyat no, Teslim evrak no, Fatura no;
     - Teslim evrakı;
     - Hazır liste;
     - UETDS eksik.
  5. Kazanç şeridi tek satır kalır (mevcut `EarningsStrip`). Yeni görünümde yalnız 4 kutu: Satış · Maliyet · Kazanç · Faturası Kesilecek. Diğerleri "Ayrıntı ▾" ile açılır.
  6. **Satır:**
     - sütunlar Tarih/No · Müşteri · Güzergâh · Araç/Şoför · Durum · Tutar/Kazanç;
     - durumda tek ilerletme düğmesi (bugünkü "Yüklendi yap" vb.);
     - satır sonunda `RowMenu`: Düzenle, Kopyala, Evrak, Takip linki, Sevk belgesi PDF, Sil (`write`);
     - kalem ve belge simgeleri satırdan kalkar.
  7. **`UetdsBadge` yeni görünümde satırda gösterilmez.** Yalnız süzgeç ve form içindeki UETDS paneli kalır.
  8. Toplu seçim çubuğu (mevcut) aynen kalır.
- **Kabul:**
  - 1440×900'de **en az 12 satır** görünür (Yazı boyutu Normal, satır sıklığı Rahat).
  - Hiçbir süzgeç kaybolmaz; hepsi panelde.
  - Süzgeçler adreste kalır (mevcut davranış).
- **Test:** `e2e/trips.spec.ts` ve `bulk.spec.ts` yeni görünüm için de çalışsın (bkz. bölüm 9).

**F2.3 Sevkiyat Ekle formu** (`components/TripForm.tsx`)
- **Hedef:** pratikortam "İş Ekle" gibi tek sayfa, iki sütun, adım numarası yok.
- **Alan sırası:**
  - Sol sütun: Firma (Müşteri) · Yükleme ili/adresi · Yükleme tarihi · İndirme ili/adresi · Teslim tarihi.
  - Sağ sütun: Araç · Şoför · Yük cinsi · Miktar/birim · Müşteri fiyatı · Araç maliyeti/Taşerona ödenecek.
  - Altta "Açıklama".
  - Sonra katlı "Diğer bilgiler": komisyon/prim/ek masraf, evrak, yetkililer, UETDS alanları, konum.
- **Korunanlar:** son sevkiyatı doldur, adres çipleri, güzergâh fiyat önerisi, kazanç özeti (fiyatların altında tek satır), KDV tek satır özeti.
- **Yeni seçenekler:**
  - **"Kaydettikten sonra formu açık tut"** onay kutusu. İşaretliyse kayıt sonrası form temizlenir, müşteri ve tarihler kalır.
  - **"Kopya sayısı"** (1-20). N > 1 ise aynı veriyle sırayla N kez `POST /api/trips` çağrılır; sonuç "N sevkiyat oluşturuldu".
- **Düğmeler:** pencere altında sabit "Kaydet" ve "Kaydet ve yeni".
- **Kabul:** formun ilk görünen bölümünde yalnız zorunlu alanlar ve fiyatlar var. Ctrl+Enter, kapatırken sorma (`Modal guard`) çalışmaya devam eder.
- **Test:** `forms.spec.ts` ve `workflow.spec.ts` sevkiyat oluşturma adımları; yeni test "Kopya sayısı 3 → 3 sevkiyat".

### F3 — e-Fatura + Cari + Banka & Çek

**F3.1 e-Fatura** (`InvoicesPage`, `InvoiceCreatePage`, `PurchaseInvoicesPage`)
- `PageShell` ve sekmeler (bölüm 3).
- **`?sekme=bekleyen`:**
  - teslim edilmiş, faturasız sevkiyatlar müşteriye göre gruplu (mevcut `/trips?invoiced=false&status=Delivered` gibi süzgeçlerle);
  - her grupta "Fatura Kes" → `/faturalar/yeni?customerId=X&tripIds=…` (bu parametreler zaten destekleniyor).
- **Kesilen Faturalar:** üstte sayaç kutuları (Taslak / Kesilen / İptal / Vadesi geçen; mevcut veriden). Süzgeçler `FilterPanel`'e. İcmal/Excel/PDF `MoreMenu`'ye.
- **Fatura Kes ekranı:** seçilen sevkiyatların `saleVatRate` değerleri farklıysa **seçim anında** sarı uyarı göster ve "Faturayı Kes" düğmesini pasifleştir. Metin: "Seçilen sevkiyatların KDV oranları farklı. Ayrı fatura kesin." (Sunucu zaten reddediyor.)
- **Kabul:** "Faturalandırılacaklar"dan fatura 3 tıkta kesilir.

**F3.2 Müşteriler Cari / Tedarikçiler Cari** (`CariPage`)
- `PageShell`, sekmeler.
- Satıra iki görünür düğme: "Ekstre" ve "Tahsilat Ekle" (tedarikçide "Ödeme Ekle"; `write`).
  - "Tahsilat Ekle": mevcut `PaymentForm`'u `defaults={{ customerId }}` ile açar.
  - "Ödeme Ekle": mevcut `SupplierPaymentForm`'u `defaults={{ supplierId }}` ile açar.
- Sütunlar değişmez (zaten pratikortam'a göre düzenli).

**F3.3 Tahsilatlar / Tedarikçi Ödemeleri / Alınan Faturalar**
- `PageShell` + `FilterBar`/`FilterPanel`. Excel `MoreMenu`'ye.
- Toplam şeridi `SumStrip` (eski `TotalsStrip` kalkar).

**F3.4 Bankalar / Çekler**
- **Bankalar:** hesap kartları (bakiye büyük). Her kartta son 5 hareket ve "Tüm hareketler". Veri mevcut uçlardan.
- **Çekler:** durum sekmeleri Portföyde · Ciro edilen · Tahsil edilen · Hepsi (mevcut durum alanı). Vadesi 7 gün içinde olanlar üstte vurgulu.

### F4 — Listeler + Öz Mal + Analiz + Yönetici/Profilim

**F4.1 Listeler** (`CustomersPage`, `SuppliersPage`, `DriversPage`, `StaffPage`, `RecurringPaymentsPage`)
- Hepsi aynı iskelet:
  - `PageShell` (ana düğme "+ Ekle");
  - `MoreMenu`: Excel'e aktar, Excel'den aktar (`/aktar?tur=…`);
  - `FilterBar`: arama + "Arşivdekileri göster" (pasif kayıtlar);
  - tablo.
- **Excel'e aktar** yoksa ekle. Önce sunucuda hazır bir uç var mı bak (`grep -rn "export" server/YesLojistik.Api/Controllers`). Yoksa **istemci tarafında** CSV üret (yeni bağımlılık ekleme; `;` ayraç, UTF-8 BOM).
- Personel ve Sabit Ödemeler: `StatCard` → `Figures`.

**F4.2 Mazotlar** (`/mazotlar`, yeni sayfa)
- `pages/FuelPage.tsx`. Veri: mevcut gider uçları, `category=Fuel` süzgeciyle (`grep -n "category" client/src/pages/ExpensesPage.tsx` ile mevcut parametreyi bul).
- **Sütunlar:** Plaka · Tarih · Yakıt cinsi · İstasyon · Litre · Tutar · Yeni KM · Eski KM · Fark KM · KM başı maliyet (= Tutar / Fark KM; fark yoksa "—").
- Altta toplam. Ana düğme "+ Mazot Ekle": mevcut gider formunu `Fuel` kategorisiyle açar.
- Giderler sayfası yeni görünümde varsayılan olarak yakıt dışını gösterir (kategori süzgeci).

**F4.3 Araç Masrafları** (`/arac-masraflari`, yeni sayfa)
- `ExpensesPage`'in araç seçili görünümü: araç süzgeci üstte zorunlu değil, "Araca bağlı giderler" (vehicleId dolu olanlar).
- Gerekirse `ExpensesPage`'e `mode` prop'u ekle ve aynı bileşeni yeniden kullan; kodu kopyalama.

**F4.4 Araçlar**
- Belge uyarıları sütunu yerine tek uyarı simgesi; üzerine gelince/tıklayınca ayrıntı.
- Öz/Taşeron sekmeleri aynen kalır (kullanıcı özellikle istedi).

**F4.5 Analiz** (`ReportsPage`)
- **İlk sekme "Genel Bakış"** (yeni):
  - üstte plaka seçimi (opsiyonel) ve tarih aralığı;
  - Toplam Kazanç / Toplam Gider / Net Kazanç (`Figures`);
  - kırılım tablosu: Piyasa sevkiyat kazancı, Öz mal sevkiyat kazancı, Mazot, Diğer giderler, Personel, Sabit ödemeler;
  - 12 aylık net kazanç çubuk grafiği (`recharts`, mevcut `lib/chart.ts` renkleri);
  - `MoreMenu`: "Tüm rapor Excel".
  - Veri: mevcut rapor uçları (`/reports/...`). **Yeni sunucu ucu gerekirse dur ve sor.**
- Diğer sekmeler aynen kalır; sekme adları sade: Sevkiyat Kazancı, Araç, Şoför, Mazot, Giderler, Müşteri, Yaşlandırma, Muhasebe.

**F4.6 Yönetici ve Profilim** (`SettingsPage`)
- **Yönetici sekmeleri** (admin): Firma · Kullanıcılar · Fatura Notları · İşlem Geçmişi · Veri Aktarımı (`/aktar`) · Yedek ve Veri (bugünkü "Veriler" + "Veri ve hesap") · Abonelik · Kurulum (`/kurulum`).
- Teknik kartlar (pratikortam ayna eşleştirme, mutabakat tablosu vb.) "Gelişmiş" başlıklı katlı bölüme (`MoreFields`).
- **Profilim:**
  - yeni rota yok; `/ayarlar?tab=profil` veya kullanıcı menüsünden açılan sayfa;
  - sekmeleri: Bilgilerim · Şifre · Güvenlik (2 adımlı) · Bildirimler · Görünüm (yazı boyutu, klasik/yeni, tablo yazısı, satır sıklığı);
  - admin olmayan kullanıcı `/ayarlar`'a gelince doğrudan Profilim'i görür.

### F5 — Diğer formlar ve telefon
- **Gider, Tahsilat, Tedarikçi Ödemesi, Müşteri, Tedarikçi, Araç, Şoför formları:**
  - önce zorunlu alanlar, sonra tek "Diğer bilgiler";
  - pencere altında sabit "Kaydet" ve "Kaydet ve yeni";
  - "Formu açık tut" yalnız Gider ve Tahsilat'ta.
- **Telefon:**
  - alt çubuk: Bugün · Sevkiyatlar · (+) · Cari · Menü;
  - listeler 640px altında **kart** olarak görünür (DataTable'a `mobileCard` render prop'u ekle);
  - `FilterPanel` tam ekran.
- **Kabul:** 390×844'te yatay kaydırma yok (`mobile.spec.ts` zaten kontrol ediyor).

### F6 — Cila, yardım, varsayılan yapma
1. Boş ekranlar, yükleniyor iskeletleri, hata ekranları yeni iskelete uygun olsun.
2. `HelpPage`: yeni menü adlarıyla güncelle. En üste "Eski adı → Yeni yeri" tablosu ekle (bölüm 2'deki tablo).
3. Yeni görünüm jetonları (4.8) son hâlini alır. Müşterinin F1 sonunda seçtiği tablo yazısı varsayılan yapılır.
4. **`DEFAULT_UI_MODE = 'new'`.** Klasik görünüm Profilim'de "Klasik görünüm (eski)" olarak **2 hafta** kalır.
5. Kabul testi: bölüm 8. Sonuçları `docs/KOLAYLASTIRMA-PLANI.md`'ye yaz.
6. **2 hafta sonra (ayrı görev, kullanıcı onayıyla):** klasik görünüm kodunu kaldır: `classicNav`, `DashboardPage` eski düzeni, `PageShell` içindeki klasik dal.

---

## 6. Ekran yerleşim şablonu (her liste sayfası)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Sevkiyatlar                                   [⋯ Diğer] [+ Sevkiyat Ekle] │  ← PageShell (h ≈ 56px)
│ Liste   Pano   Harita                                                │  ← SectionTabs (h ≈ 40px)
│ [🔍 Ara: müşteri, plaka, şoför…] [Bugün|Gelecek|Geçmiş|Bu ay|Hepsi] [Süzgeç (2)] │ ← FilterBar
│ (Müşteri: ABC ✕) (Piyasa ✕)  Süzgeci temizle                          │  ← çipler (varsa)
│ SATIŞ 1.965.000,00 TL │ MALİYET … │ KAZANÇ … │ FATURASI KESİLECEK … ▾ │  ← tek satır
│ ┌ tablo ───────────────────────────────────────────────────────────┐ │
│ │ ☐ Tarih/No  Müşteri  Güzergâh  Araç/Şoför  Durum      Tutar   ⋯ │ │
│ │ ☐ 05.10     FLS      Kocaeli→… 16 KZ 528   [Yüklendi yap] 17.000 ⋯ │ │
└──────────────────────────────────────────────────────────────────────┘
```
Üst kısım (başlık → tablo başlığı) yeni görünümde **en fazla 260px** olmalı (1440×900, yazı Normal).

---

## 7. Metin ve görünüm kuralları
- **Düğme metinleri fiil + nesne:** "Sevkiyat Ekle", "Fatura Kes", "Tahsilat Ekle". "Yeni Sefer", "Oluştur" gibi karışık ifadeler kullanılmaz.
- **Başlıklar pratikortam adıyla:** "Müşteriler Cari", "Tedarikçi Ödemeleri", "Mazotlar", "Bankalar", "Çekler".
- **Ekranda teknik sözcük yok:** "ayna", "dry-run", "UBL", "token", "endpoint". Gerekirse sade karşılığı: "pratikortam'dan gelen kayıtlar", "deneme çalıştırması".
- **Rozet sayısı:** bir satırda en fazla 1 durum rozeti. Uyarı rozeti yalnız gerçekten istisna olan kayıtta.
- **Para:** her yerde `tl()` (iki kuruş). **Tarih:** `03.10.2026`. **Plaka:** `PlateBadge`.
- **Renkler** yalnız `index.css` jetonlarından; yeni sabit renk kodu yazma.

---

## 8. Kabul testi (F6 sonunda, müşteriyle)
Müşteriye yardım etmeden, sırayla bu 10 işi yaptırın. Süreyi ve takıldığı yeri not edin.

1. Yarın için yeni bir sevkiyat girin.
2. Bugünkü sevkiyatları açın.
3. Bir sevkiyatı "Yüklendi" yapın.
4. Plakaya göre bir sevkiyat bulun.
5. Teslim edilmiş sevkiyatların faturasını kesin.
6. Bir müşterinin ekstresini açın.
7. Bir müşteriden tahsilat girin.
8. Bir tedarikçiye ödeme girin.
9. Mazot girin.
10. Bu ayın kazancına bakın.

**Başarı:** en az 9'u yardımsız yapılır. Hiçbiri pratikortam'dakinden uzun sürmez. Sonuçlar `docs/KOLAYLASTIRMA-PLANI.md` "Durum" bölümüne yazılır (müşteri adı ve verisi olmadan).

---

## 9. Testler: nasıl çalıştırılır, nasıl güncellenir
**Çalıştırma:** `AGENTS.md` bölüm 4. Özetle: PostgreSQL, API (`--no-launch-profile`), `vite preview`, şoför web önizlemesi, sonra `npx playwright test`. Yerelde kuramazsan bir `codex/<konu>` dalına push et, GitHub Actions'ta (`.github/workflows/ci.yml`) e2e'nin yeşil olduğunu gör, sonra `main`'e al.

**Yeni görünümü testte açmak** için `e2e/helpers.ts`'ye yardımcı ekle:
```ts
export async function useNewUi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('yes.uiMode', 'new'))
}
```

**Strateji:**
- F1–F5 boyunca **mevcut testler klasik görünümde aynen geçmeli.** Varsayılan klasik olduğu için zaten geçerler; yalnız F1.5 (terim değişikliği) metinleri günceller.
- Her aşamada yeni görünüm için **ayrı** spec eklenir: `e2e/new-ui/*.spec.ts`. Her spec `useNewUi(page)` ile başlar.
- F6'da varsayılan `new` olunca eski spec'lerdeki menü seçicileri güncellenir. Bugün kullanılanlar (sayılar kullanım adedi):

| Eski | Yeni |
|---|---|
| `'Sevkiyatlar'` (9) | aynı |
| `'Araçlar'` (4) | aynı |
| `'Şoförler'` (3) | `'Şoför Listesi'` |
| `'Müşteriler'` (3) | `'Müşteri Listesi'` |
| `'Tedarikçiler'` (2) | `'Tedarikçi Listesi'` |
| `'Müşteriler Cari'` (2) | aynı |
| `'Tedarikçiler Cari'` (2) | aynı |
| `'Faturalar'` (2) | `'e-Fatura'` |
| `'Raporlar'` (2) | `'Analiz'` |
| `'Ana Sayfa'` (1) | `'Bugün'` |
| `'Araç Takip Haritası'` (1) | Sevkiyatlar → `'Harita'` sekmesi |
| `'Tahsilatlar'` (1) | Müşteriler Cari → `'Tahsilatlar'` sekmesi |
| `'Personeller'` (1) | `'Personel Listesi'` |
| `'Sabit Ödemeler'` (1) | `'Sabit Ödeme Listesi'` |
| `'Kasa / Banka'` (1) | `'Bankalar'` |
| `'Çek / Senet'` (1) | `'Çekler'` |
| `'Ayarlar'` (1) | `'Yönetici'` |
| `'Yardım'` (1) | üst çubuk `getByRole('link', { name: 'Yardım' })` |

- Mümkün olan yerde menü tıklaması yerine `page.goto('/adres')` kullan; adresler değişmediği için testler sağlam kalır.
- **Testi silme, atlama, `skip` etme. Yasak.**

**Ekran görüntüsü betiği** (repoya girmez, geçici):
```ts
// e2e/zz-shots.spec.ts — çalıştır, sonra sil
import { test } from '@playwright/test'
import { login, useNewUi } from './helpers'
for (const [w, h] of [[1440, 900], [390, 844]] as const)
  test(`shots ${w}`, async ({ page }) => {
    await useNewUi(page); await page.setViewportSize({ width: w, height: h }); await login(page)
    for (const p of ['/', '/seferler', '/faturalar', '/cari/musteriler', '/giderler', '/ayarlar'])
      { await page.goto(p); await page.waitForTimeout(1200); await page.screenshot({ path: `shots/${w}${p.replaceAll('/', '_') || '_bugun'}.png` }) }
  })
```

---

## 10. Sık yapılan hatalar (yapma)
- Adres değiştirmek ya da eski rotayı silmek (sunucu bildirimleri kırılır).
- Süzgeç mantığını yeniden yazmak. Yalnız **yerleşim** değişir; adrese yazılan parametreler aynı kalır.
- Klasik görünümü bozmak. F6'ya kadar iki görünüm de çalışmalı.
- Sayfa kodunu kopyalayıp "yeni" sürüm yazmak. Aynı bileşen `uiMode`'a göre küçük farklarla çizilir.
- Yeni npm bağımlılığı eklemek. Yalnız `@fontsource-variable/source-sans-3` izinli. Gerekirse sor.
- `UetdsBadge`, kazanç şeridi, toplu seçim gibi mevcut işlevleri "sadeleştirme" adına silmek. Taşınır, silinmez.
- Sunucu mesajlarını değiştirmek (F1.5 notu).
- Ayna modunda yazma düğmesi göstermek (`write` prop'unu unutma).

---

## 11. Codex'e verilecek mesajlar (sırayla, her biri ayrı oturum)
Her mesajın başına şunu ekleyin:
```
AGENTS.md, docs/KOLAYLASTIRMA-PLANI.md ve docs/KOLAYLASTIRMA-UYGULAMA.md dosyalarını oku. Bölüm 0'daki kurallara kesin uy.
```
| Oturum | Mesaj |
|---|---|
| 1 | `docs/KOLAYLASTIRMA-UYGULAMA.md F1.1, F1.2 ve F1.3 kartlarını uygula. Bitince yeni görünümün menü ve sekme ekran görüntülerini ver.` |
| 2 | `F1.4 ve F1.5 kartlarını uygula.` |
| 3 | `F2.1 ve F2.2 kartlarını uygula. 1440x900 Sevkiyatlar ekranında kaç satır göründüğünü ölç ve yaz.` |
| 4 | `F2.3 kartını uygula.` → **Müşteriye göster** (yeni görünümü Profilim'den açtırın). Tablo yazısı için Tırnaklı/Düz seçimini ve görüşlerini alın. |
| 5 | `F3.1 ve F3.2 kartlarını uygula.` |
| 6 | `F3.3 ve F3.4 kartlarını uygula.` |
| 7 | `F4.1, F4.2, F4.3 ve F4.4 kartlarını uygula.` |
| 8 | `F4.5 ve F4.6 kartlarını uygula.` |
| 9 | `F5 kartını uygula.` |
| 10 | `F6 kartının 1-5. adımlarını uygula. Müşterinin seçtiği tablo yazısı: [Tırnaklı/Düz].` → Müşteriyle kabul testi (bölüm 8). |
| 11 (2 hafta sonra) | `F6 kartının 6. adımını uygula (klasik görünümü kaldır).` |

**Her oturumun sonunda** Codex'ten şunu isteyin: "Testlerin sonucunu, ekran görüntülerini ve `KOLAYLASTIRMA-PLANI.md` Durum tablosunu göster." Bir test kırmızıysa: "Kök nedeni bul ve düzelt; testi silme."
