# 01 — Ortak şartname (belge şablonu, kurallar, ortak gerçekler)

Bu belge `docs/plan/` altındaki bütün belgelerin **anayasasıdır**. Her belge yazılırken önce bu
dosya okunur; şablon ve kurallar buradan alınır. Bir belge buradaki kurallarla çelişiyorsa belge
yanlıştır.

- Set: `docs/plan/00-DIZIN.md` (dizin) + bu belge + `02`–`34` numaralı ekran/modül belgeleri.
- Amaç: paneli **pratikortam kadar tanıdık, ondan daha sade ve şık** hâle getirmek; işi ekran ekran,
  uygulanabilir adımlara bölmek.
- Dil: Türkçe (teknik terimler İngilizce kalabilir: e2e, commit, build).
- Hedef uzunluk: **belge başına 1.000–2.400 kelime**; **set toplamı en az 50.000 kelime**.
  Kısa belge (1.000 altı) kabul edilmez; şişirme de yasak — her paragraf ya bugünkü kodu anlatır,
  ya hedefi tanımlar, ya adım/ölçüt verir.
  Not (5 Ekim 2026): ilk sürümde belge başına alt sınır 1.900 kelimeydi; 10 belge 1.100–1.400
  kelimede kaldı ve set toplamı hedefin (50.000) çok üzerine çıktı (73.924). Dolgu metinle
  şişirmek yerine alt sınır **1.000** kelimeye çekildi; 1.000 altındaki belge hâlâ eksik sayılır.

---

## 1. Değişmez kurallar (proje kurallarından özet)

Kaynak: `AGENTS.md` §3 ve `CLAUDE.md`.

1. **pratikortam.com canlı kullanımda ve salt okunurdur.** Orada hiçbir şey eklenmez, değiştirilmez,
   silinmez; form doldurulmaz, kaydet/sil düğmesine basılmaz. Yalnız okuma (liste, ayrıntı, dışa aktarma).
2. **Kullanıcı pratikortam'a kendisi giriş yapar**; ajan şifre yazmaz.
3. **pratikortam verisi (müşteri, VKN, tutar, dosya) depoya girmez.** Plan belgelerinde de gerçek
   müşteri verisi, gerçek tutar, gerçek plaka **kullanılmaz**; örnekler uydurma olur (ör. `ABC Nakliyat`,
   `16 KZ 528`, `17.000,00 TL`).
4. **Şifre, token, anahtar hiçbir dosyaya yazılmaz.** Gerekirse yalnız adı geçer
   (ör. "GitHub Secret `PASS`").
5. **Canlı veriyi değiştiren işlemden önce yedek + kullanıcı onayı.**
6. **Doğrudan `main` üzerinde çalışılır** (kullanıcı istemedikçe dal/PR yok). Her adım sonunda:
   testler → commit → `git pull --rebase origin main` → `git push origin HEAD:main`.
   `main`'e giden her şey **canlıya** (Render) çıkar; test edilmemiş kod push edilmez.
7. **Migration yalnız ekleme yapar** (boş olabilen sütun/tablo). Veri silen/dönüştüren migration yazılmaz.
8. `docs/GELISTIRME-PLANI.md` ve `docs/YOL-HARITASI.md` güncel tutulur.

Bu sette ek kural: **plan belgeleri kodu değiştirmez.** Kod değişikliği gerekiyorsa belge, ne
değişeceğini `dosya:satır` ile tarif eder; uygulama ayrı bir iştir.

---

## 2. Belge şablonu (zorunlu başlıklar, bu sırayla)

Her `02`–`34` belgesi **aynen** bu başlıkları kullanır. Başlık atlanmaz; içerik yoksa "kapsam dışı"
yazılır ve nedeni belirtilir.

```
# NN — <Başlık>

## 1. Amaç ve kapsam
## 2. Bugünkü durum (kod kanıtıyla)
## 3. Hedef yerleşim
## 4. Alanlar, düğmeler ve etkileşim
## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans
## 6. Metinler ve terimler
## 7. Telefon davranışı (390×844)
## 8. Erişilebilirlik ve klavye
## 9. Testler (e2e + birim)
## 10. Uygulama adımları (dosya:satır, sırayla)
## 11. Kabul ölçütü
## 12. Riskler ve geri dönüş
## 13. Doğrulanacaklar
```

Bölüm içerikleri:

1. **Amaç ve kapsam** — ekran/modül ne işe yarar, hangi en sık işleri karşılar (bkz. §5'teki 10 iş
   listesi), kapsam dışı olanlar.
2. **Bugünkü durum (kod kanıtıyla)** — bugün kodda ne var: bileşenler, props, yerleşim, süzgeçler,
   `dosya:satır` referanslarıyla. Bu bölüm **kanıtsız cümle içermez**.
3. **Hedef yerleşim** — ASCII şema (aşağıdaki örnek çizime uygun), yükseklik/ölçü notları
   (üst kısım ≤260px, 1440×900'de ≥12 satır kuralı), yeni görünümde neyin nereye gittiği.
4. **Alanlar, düğmeler ve etkileşim** — tablo: alan/düğme · tip · zorunlu mu · davranış · hata metni.
   Ayrıca klavye kısayolları (Ctrl+Enter kaydet, Esc kapat).
5. **Durumlar** — boş liste, yükleniyor iskeleti, hata ekranı, yetkisiz (rol), **ayna modu**
   (`MirrorContext`, `write` düğmeleri gizli), **lisans** (sahip modu / süre dolduğu için salt okunur).
6. **Metinler ve terimler** — ekranda görünecek tam metinler; `docs/TERIMLER.md` ve
   `docs/plan/32-TERMINOLOJI.md` ile uyumlu. Teknik sözcük yasak: "ayna", "dry-run", "UBL", "token",
   "endpoint" ekranda görünmez.
7. **Telefon davranışı** — 390×844'te yerleşim, kart görünümü, alt çubuk, süzgeç paneli tam ekran,
   yatay kaydırma olmaması.
8. **Erişilebilirlik ve klavye** — rol/aria, odak sırası, `:focus-visible`, tablo başlıkları,
   renk körlüğü (rozet + metin birlikte), dokunma hedefi ≥44px.
9. **Testler** — mevcut e2e dosyaları (varsa) ve eklenecek senaryolar; yeni görünüm testi için
   `useNewUi` yardımcısı; birim/sunucu testi gerekiyorsa hangi katman.
10. **Uygulama adımları** — numaralı, her adımda: dosya, ne yapılacak, tahmini süre (saat/gün),
    doğrulama komutu.
11. **Kabul ölçütü** — ölçülebilir: tık sayısı, satır sayısı, piksel, test sayısı, süre.
12. **Riskler ve geri dönüş** — tablo: risk · önlem · geri dönüş yolu.
13. **Doğrulanacaklar** — koddan/dokümandan doğrulanamayan, kullanıcıya sorulacak maddeler.
    Emin olunmayan hiçbir şey gövdeye kesin bilgi gibi yazılmaz.

### Yerleşim şeması örneği (bölüm 3 için)

```
┌──────────────────────────────────────────────────────────────┐
│ Sevkiyatlar                          [⋯ Diğer] [+ Sevkiyat Ekle] │
│ Liste   Pano   Harita                                        │
│ [🔍 Ara] [Bugün|Gelecek|Geçmiş] [Süzgeç (2)]                 │
│ (Müşteri: ABC ✕)  Süzgeci temizle                            │
│ SATIŞ … │ MALİYET … │ KAZANÇ … │ FATURASI KESİLECEK …       │
│ ┌ tablo ─────────────────────────────────────────────────────┐│
│ │ Tarih  Müşteri  Güzergâh  Araç  Durum  Tutar  ⋯           ││
│ └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Ortak teknik gerçekler (her belge bunları varsayar)

### 3.1 Görünüm anahtarı
- `client/src/lib/uiMode.ts` — `UiMode = 'classic' | 'new'`; **`DEFAULT_UI_MODE = 'classic'` (satır 8)**;
  localStorage anahtarı `yes.uiMode` (satır 9); `<html data-ui="…">` niteliği (satır 21);
  `applySavedUiMode()` açılışta (`client/src/main.tsx:19`); `useUiMode()` / `useIsNewUi()` (satır 35-40).
- Kullanıcı seçimi: kullanıcı menüsündeki radyo (`client/src/components/Layout.tsx:221-233`).
- **Kritik eksik:** `client/src/index.css` içinde `html[data-ui="new"]` seçicisi **yok** → yeni
  görünümde görsel fark oluşmuyor. `docs/plan/29-GORSEL-SISTEM.md` bunu kapatır.
- Diğer tarayıcı anahtarları: `yes.textSize` (`client/src/lib/textSize.ts:4`),
  `yes.tripView`/`yes.tripColumns` (`client/src/pages/TripsPage.tsx:80-84`),
  `yes.tripKeepOpen` (`client/src/components/TripForm.tsx:154-155`).

### 3.2 Menü ve sekmeler
- `client/src/lib/nav.ts` — `classicNav` (satır 19-66, 7 grup/23 öğe) ve `newNav` (satır 72-114,
  7 grup/17 öğe). Öğe alanları: `to,label,icon,perm?,badge?` (satır 10); sayaçlar `alertsAt` (12-13).
- Yeni menüde `/ayarlar` yalnız `perm: 'admin'` (satır 106) → **admin olmayan kullanıcı** yeni
  görünümde Ayarlar/Profilim'e menüden ulaşamıyor. Düzeltme `docs/plan/26-PROFILIM.md` ve
  `docs/plan/25-YONETICI.md` belgelerinde tarif edilir.
- `client/src/lib/sections.ts` — 8 bölüm / 18 sekme (satır 10-33), `sectionFor()` (36-38),
  `newTitles` yeni başlık adları (41-50).
- Yeni görünümde menüde olmayan, sekmelerden açılan sayfalar: `/is-talepleri`, `/harita`,
  `/faturalar/yeni`, `/tahsilatlar`, `/alinan-faturalar`, `/aktar`, `/kurulum`, `/yardim`.

### 3.3 Ortak parçalar
- `client/src/components/shell/Menu.tsx` — `DropMenu` (11-49), `MoreMenu` "⋯ Diğer" (52-61),
  `RowMenu` satır sonu "İşlemler" (64-72).
- `client/src/components/shell/FilterPanel.tsx` — `FilterBar` (7-32), `FilterPanel` sağdan çekmece
  (35-62; telefonda tam ekran).
- `client/src/components/shell/SectionTabs.tsx` — yeni görünümde sekmeler (8-32); klasikte `null`.
- `PageHeader` `client/src/components/ui.tsx:108-134` içinde (yeni başlık 112, alt başlık gizleme 113,
  `SectionTabs` 132, `HelpTip` gizleme 126).
- **Kullanım çok dar:** `MoreMenu`/`RowMenu` yalnız `client/src/pages/TripsPage.tsx` (16-17, 245, 341);
  `FilterBar`/`FilterPanel` yalnız aynı dosyada (379, 466); `SectionTabs` yalnız `ui.tsx:132` ve
  `client/src/pages/DashboardPage.tsx:65`.
- Dokümanda adı geçen **`PageShell` ve `DetailDrawer` kodda YOK**; `docs/plan/28-ORTAK-PARCALAR.md`
  bunların şartnamesini yazar.
- Dokümanda geçen `client/src/pages/TodayPage.tsx` **YOK**; "Bugün" ekranı
  `client/src/pages/DashboardPage.tsx:56-93` içinde.

### 3.4 Tema ve tipografi
- Tailwind v4; **config dosyası yok**; jetonlar `client/src/index.css` `@theme` bloğunda:
  yazı tipleri (9-11), Otoyol renkleri (14-38), `slate`/`navy`/`brand` yeniden eşlemesi (41-67),
  yarıçaplar 2-6px (70-76), gölgeler neredeyse yok (79-85).
- Taban `html { font-size: 17.5px }`; `data-text="lg"` 19px, `xl` 21px (91-93); tabular sayılar
  Overpass Mono (97-99); `:focus-visible` (102-106); `.input/.label/.card/.th/.td` (110-126).
- Grafik renkleri `client/src/lib/chart.ts`.
- Yazı boyutu seçeneği (Normal/Büyük/Çok büyük) **kalmalı** (`AGENTS.md` §6).

### 3.5 Modlar ve koruma
- **Ayna modu:** kayıtlar pratikortam'dan gelir; sunucuda `MirrorWriteGuard` yazmayı reddeder;
  istemcide `MirrorContext` + `Button write` yazma düğmelerini gizler; "+ Yeni" menüsü
  "pratikortam'a girin" der.
- **Lisans:** `LicenseService` (ECDSA P-256); lisans yoksa "sahip modu"; süre dolunca `LicenseGuard`
  salt okunur yapar. `docs/LISANS.md`.
- **Rol/yetki:** menü öğelerinde `perm`; sayfa içinde buton bazlı yetki kontrolü.

### 3.6 Komutlar
```bash
cd server && dotnet test                                  # ~311 test (gerçek PostgreSQL)
cd client && npm run lint && npm run build                # oxlint + tsc -b + vite build
cd mobile && npm run typecheck
cd server && dotnet-ef migrations has-pending-model-changes \
  --project YesLojistik.Infrastructure --startup-project YesLojistik.Api
```
e2e: `client/e2e` (20 spec, **53 test**; `AGENTS.md` "~47" diyor, güncel değil),
`client/playwright.config.ts` (workers 1; desktop 1440×900, mobile 375×812),
`.github/workflows/ci.yml` (job'lar: legacy, server, client, mobile, e2e).
Yeni görünüm testi: `client/e2e/helpers.ts:44-46` → `useNewUi(page)` (`localStorage: yes.uiMode='new'`).
Yeni görünüm spec'leri: `client/e2e/new-ui/basics.spec.ts`, `cari-invoice.spec.ts`, `trip-copies.spec.ts`.
**Kural: test silme, atlama, skip yasak.**

---

## 4. Rota tablosu (App.tsx:79-114)

| Rota | Sayfa dosyası | Yeni menüde |
|---|---|---|
| `/` | `pages/DashboardPage.tsx` | Bugün |
| `/harita` | `pages/MapPage.tsx` | yok (sekmelerden) |
| `/is-talepleri` | `pages/JobRequestsPage.tsx` | yok |
| `/seferler` | `pages/TripsPage.tsx` | Sevkiyatlar |
| `/cari/musteriler` | `pages/CariPage.tsx` | Raporlar |
| `/cari/tedarikciler` | `pages/CariPage.tsx` | Raporlar |
| `/faturalar` | `pages/InvoicesPage.tsx` | e-Fatura |
| `/faturalar/yeni` | `pages/InvoiceCreatePage.tsx` | yok |
| `/tahsilatlar` | `pages/PaymentsPage.tsx` | yok |
| `/alinan-faturalar` | `pages/PurchaseInvoicesPage.tsx` | yok |
| `/odemeler` | `pages/SupplierPaymentsPage.tsx` | Raporlar |
| `/musteriler` | `pages/CustomersPage.tsx` | Listeler |
| `/tedarikciler` | `pages/SuppliersPage.tsx` | Listeler |
| `/soforler` | `pages/DriversPage.tsx` | Listeler |
| `/personel` | `pages/StaffPage.tsx` | Listeler |
| `/sabit-odemeler` | `pages/RecurringPaymentsPage.tsx` | Listeler |
| `/araclar` | `pages/VehiclesPage.tsx` | Öz Mal |
| `/giderler` | `pages/ExpensesPage.tsx` | Öz Mal |
| `/kasa-banka` | `pages/CashAccountsPage.tsx` | Banka & Çek (Bankalar) |
| `/cek-senet` | `pages/ChecksPage.tsx` | Banka & Çek (Çekler) |
| `/raporlar` | `pages/ReportsPage.tsx` | Raporlar (Analiz) |
| `/ayarlar` | `pages/SettingsPage.tsx` | Yönetici |
| `/yardim` | `pages/HelpPage.tsx` | üst çubuk simgesi |
| `/aktar` | `pages/ImportPage.tsx` | yok |
| `/kurulum` | `pages/OnboardingPage.tsx` | yok |

Planlanan **yeni** rotalar: `/mazotlar` (`pages/FuelPage.tsx`), `/arac-masraflari`
(`ExpensesPage` `mode` prop'u ile).

---

## 5. Kabul ölçütleri (bütün belgeler bunlara hizmet eder)

**En sık 10 iş** (hedef tık sayıları `docs/KOLAYLASTIRMA-PLANI.md:251-262`):

1. Yeni sevkiyat girmek → tek ekran
2. Bugünkü sevkiyatları görmek → 1 tık
3. Sevkiyat durumunu ilerletmek → satırdaki düğme, 1 tık
4. Sevkiyat bulmak (plaka/firma) → yaz, Enter
5. Fatura kesmek → 3 tık
6. Müşteri bakiyesi/ekstresi → 2 tık
7. Tahsilat girmek → 2 tık + form
8. Tedarikçiye ödeme girmek → 2 tık + form
9. Mazot/gider girmek → tek ekran
10. Aylık kazancı görmek → 1 tık

**Nihai kabul:** müşteri **yardım almadan** bu 10 işin **en az 9'unu** yapar ve hiçbiri
pratikortam'dakinden uzun sürmez.

**Ölçülebilir ek ölçütler:**
- 1440×900'de Sevkiyatlar listesinde **≥12 satır** görünür.
- Yeni görünümde üst kısım (başlık → tablo başlığı) **≤260px**.
- 390×844'te **yatay kaydırma yok** (`client/e2e/mobile.spec.ts`).
- Bir satırda **en fazla 1 durum rozeti**; istisna değilse uyarı rozeti yok.
- Para `tl()` ile iki kuruş, tarih `03.10.2026`, plaka `PlateBadge`.
- Ekranda teknik sözcük yok ("ayna", "dry-run", "token" vb.).

---

## 6. Yazım kuralları (belge yazan ajan için)

1. **Kanıt zorunlu:** "şu an şöyle" diyorsan `dosya:satır` ver. Kanıt bulamıyorsan yazma;
   "Doğrulanacaklar" bölümüne taşı.
2. **Uydurma yasak:** olmayan bileşen/dosya/rotayı var gibi yazma. Örnek: `PageShell` yok →
   "yok, §10'da eklenecek" yaz.
3. **Kod değiştirme.** Yalnız `docs/plan/<NN>-<AD>.md` dosyasını yaz. Başka belgeye dokunma.
4. **Sır yazma.** Gerçek şifre/token/anahtar, gerçek müşteri verisi yok.
5. **Sayı ver:** süre (saat/gün), tık sayısı, piksel, test adedi, dosya sayısı.
6. **Çelişkiyi bildir:** `AGENTS.md`/`KOLAYLASTIRMA-*` ile kod çelişiyorsa bunu belgede açıkça yaz.
7. **Kısa cümle, sade Türkçe.** Kullanıcı kod yazmıyor; belge uygulayan ajan için teknik, karar
   veren insan için anlaşılır olmalı.
8. **Belge sonunda** kısa bir "Sonraki belgeyle bağlantı" satırı: hangi belgeyle nasıl kesişiyor.
9. **Kısa dosya adları `client/` altını kasteder.** `ui.tsx:126` yazınca `client/src/components/ui.tsx`
   anlaşılır; aynı ad `mobile/` altında da varsa (`mobile/src/components/ui.tsx` 56 satır,
   `mobile/src/lib/types.ts` 87 satır) mobil için **tam yol** yazılır. Şüphede kalırsan tam yolu yaz.
10. **Bölüm 13 dolu olmalı.** Koddan doğrulanamayan her madde oraya yazılır; "Doğrulanacaklar" boş
    bırakılıyorsa nedeni tek cümleyle belirtilir (ör. "kapsam dışı, `docs/plan/30-VERI-API.md`").

---

## 7. Numara ve dosya adları

| # | Dosya | Konu |
|---|---|---|
| 00 | `00-DIZIN.md` | Dizin, okuma sırası, durum takibi |
| 01 | `01-ORTAK-SARTNAME.md` | Bu belge |
| 02 | `02-BUGUN.md` | Bugün ekranı |
| 03 | `03-SEVKIYATLAR-LISTE.md` | Sevkiyatlar listesi |
| 04 | `04-SEVKIYAT-FORMU.md` | Sevkiyat ekle/düzenle/kopyala |
| 05 | `05-E-FATURA.md` | e-Fatura gönderilen/e-arşiv |
| 06 | `06-FATURALANDIRILACAKLAR.md` | Faturalandırılacaklar + sayaçlar |
| 07 | `07-ALINAN-FATURALAR.md` | Alınan (satın alma) faturaları |
| 08 | `08-MUSTERILER-CARI.md` | Müşteriler cari + ekstre |
| 09 | `09-TEDARIKCILER-CARI.md` | Tedarikçiler cari + ödemeleri |
| 10 | `10-TAHSILAT-ODEME-FORMLARI.md` | Tahsilat ve ödeme formları |
| 11 | `11-BANKALAR.md` | Bankalar, kasa, transfer |
| 12 | `12-CEKLER.md` | Çekler, senetler, hareketler |
| 13 | `13-HARITA-TAKIP.md` | Harita, araç takip, takip linki |
| 14 | `14-LISTE-MUSTERILER.md` | Müşteri listesi |
| 15 | `15-LISTE-TEDARIKCILER.md` | Tedarikçi listesi |
| 16 | `16-LISTE-SOFORLER.md` | Şoför listesi |
| 17 | `17-LISTE-PERSONEL.md` | Personel listesi |
| 18 | `18-LISTE-SABIT-ODEMELER.md` | Sabit ödemeler |
| 19 | `19-OZ-MAL-MAZOTLAR.md` | Mazotlar (yeni sayfa) |
| 20 | `20-OZ-MAL-GIDERLER.md` | Giderler |
| 21 | `21-OZ-MAL-ARAC-MASRAFLARI.md` | Araç masrafları |
| 22 | `22-OZ-MAL-ARACLAR.md` | Araçlar (öz/kiralık) |
| 23 | `23-ANALIZ.md` | Analiz: Genel Bakış + sekmeler |
| 24 | `24-RAPORLAR-MUHASEBE.md` | Raporlar, yaşlandırma, muhasebe |
| 25 | `25-YONETICI.md` | Yönetici/Ayarlar sekmeleri |
| 26 | `26-PROFILIM.md` | Profilim sekmeleri |
| 27 | `27-TELEFON.md` | Telefon davranışı |
| 28 | `28-ORTAK-PARCALAR.md` | PageShell/MoreMenu/RowMenu/FilterBar/FilterPanel/DetailDrawer şartnamesi |
| 29 | `29-GORSEL-SISTEM.md` | `data-ui="new"` jetonları, tipografi, iskelet/hata/boş |
| 30 | `30-VERI-API.md` | Veri ve API sözleşmeleri |
| 31 | `31-TEST-CI.md` | Test ve CI stratejisi |
| 32 | `32-TERMINOLOJI.md` | Terim sözlüğü ve ekran metinleri |
| 33 | `33-K0-VE-KABUL-TESTI.md` | K0 dinleme, tık ölçümü, kabul testi |
| 34 | `34-RISK-GUVENLIK.md` | Risk, güvenlik, gizlilik, klasik görünümün kaldırılması |

---

Sonraki belgeyle bağlantı: `00-DIZIN.md` bu tabloyu kullanır; her ekran belgesi §3'teki ortak
gerçekleri tekrar etmek yerine bu belgeye atıf yapar.
