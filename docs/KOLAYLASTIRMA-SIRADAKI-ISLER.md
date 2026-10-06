# Kolaylaştırma: sıradaki işler, tıkanıklık ve takvim

> Bu belge `docs/KOLAYLASTIRMA-PLANI.md` (K0-K6) ve `docs/KOLAYLASTIRMA-UYGULAMA.md` (F1-F6)
> belgelerinin yerine geçmez; onların üstüne **"şu an ne yapılacak, hangi sırayla, nerede tıkandı"**
> sorusunu cevaplar. Tarih: 5 Ekim 2026. Dayanak: dokümanlar + klondaki kodun satır satır denetimi.

---

## 1. Özet (30 saniye)

Yapılan iş kodda duruyor (görünüm anahtarı, pratikortam sıralı menü, sekmeler, Bugün, sade
Sevkiyatlar). Müşterinin "olmuyor" demesinin **üç somut sebebi** var:

1. **Varsayılan hâlâ klasik** (`DEFAULT_UI_MODE = 'classic'`, `client/src/lib/uiMode.ts:8`) —
   müşteri panele girince yeni düzeni hiç görmüyor.
2. **Yeni görünümün görsel karşılığı yok:** `uiMode.ts:21` `html[data-ui="new"]` niteliğini yazıyor
   ama `client/src/index.css` içinde `data-ui` seçicisi **hiç yok** → renk, köşe, gölge, boşluk
   değişmiyor. Müşterinin asıl isteği ("daha sade ve şık") kodda karşılıksız.
3. **Ortak parçalar tek sayfada:** `MoreMenu`, `RowMenu`, `FilterBar`, `FilterPanel` yalnız
   `client/src/pages/TripsPage.tsx` içinde kullanılıyor; diğer ~20 sayfa eski düğme/süzgeç
   düzeninde. Yani "az ama öz" kuralı sadece Sevkiyatlar'da uygulanmış.

Buna ek olarak **K0 (müşteriyle dinleme/ölçüm) hiç yapılmadı**; öncelik sırası tahmine kaldı.

## 2. Aşama durumu (özet)

`docs/KOLAYLASTIRMA-PLANI.md` "Durum" tablosundan (satır 383-391) + kod denetiminden:

| Aşama | Durum |
|---|---|
| K0 Dinleme | **Yapılmadı.** Çıktı dosyası `docs/KOLAYLASTIRMA-DINLEME.md` repoda yok |
| F1 Anahtar/menü/sekmeler/ortak parçalar | **Kısmen.** Anahtar, `newNav`, `sections.ts`, SectionTabs, Menu/FilterPanel var. Ama görsel jetonlar (`data-ui="new"`) yok; parçalar yalnız Sevkiyatlar'da |
| F2 Bugün + Sevkiyatlar + form | **Kısmen.** "Bugün" `DashboardPage.tsx:56-93` içinde (dokümandaki `pages/TodayPage.tsx` yok); kalan: Onay Bekleyenler sekmesi, formun tek sayfa iki sütun düzeni |
| F3 e-Fatura + Cari + Banka & Çek | **Kısmen.** Kalan: "Faturalandırılacaklar" sekmesi, sayaç kutuları, süzgeç paneli, Bankalar kart görünümü |
| F4 Listeler + Öz Mal + Analiz + Yönetici/Profilim | **Yapılmadı.** `/mazotlar`, `/arac-masraflari`, Analiz "Genel Bakış", Profilim sekmeleri yok |
| F5 Formlar + telefon | **Yapılmadı** |
| F6 Cila + varsayılan yapma | **Yapılmadı** (`DEFAULT_UI_MODE` hâlâ klasik) |

## 3. Kod ile doküman arasındaki farklar (5 Ekim denetimi)

Bu maddeler "yapıldı" sanılıp aslında olmayan işleri gösterir; plan bunlara göre yazıldı.

| Dokümanda geçen | Gerçek |
|---|---|
| `pages/TodayPage.tsx` (F2.1) | Yok; Bugün ekranı `DashboardPage.tsx:56-93` içinde |
| `PageShell`, `DetailDrawer` (F1.4) | Yok; `PageHeader` `components/ui.tsx:108-134` içinde |
| `MoreMenu/RowMenu/FilterBar/FilterPanel` (F1.4) | Var ama **yalnız** `TripsPage.tsx` kullanıyor |
| Görünüm jetonları `html[data-ui="new"]` (F1 §4.8) | `index.css` içinde **yok** → yeni görünüm görsel olarak farklı değil |
| `e2e/new-ui/ui-mode.spec.ts` (F1.1) | Yok; anahtar kalıcılığını `basics.spec.ts:4` sınıyor |
| `/mazotlar`, `/arac-masraflari` (F4.2/F4.3) | Yok; `nav.ts:99` yorumu "F4'te eklenecek" diyor |
| Profilim sekmeleri (F4.6) | Yok; yeni menüde `/ayarlar` yalnız `perm: 'admin'` (`nav.ts:106`) → **admin olmayan kullanıcı yeni görünümde Ayarlar/Profilim'e menüden ulaşamıyor** |
| "~47 e2e testi" (AGENTS.md) | 20 spec dosyasında 53 test |
| `useNewUi(page)` yardımcısı eklenecek (F1) | Zaten var: `client/e2e/helpers.ts:44-46` |

Kodda `TODO/FIXME` yok; yarım kalan yerler yukarıdaki tabloda.

> **Ayrıntılı şartname seti:** Ekran ekran, gerçek koddan `dosya:satır` kanıtlı uygulama
> şartnameleri `docs/plan/` klasöründedir (dizin: `docs/plan/00-DIZIN.md`, ortak şablon ve kurallar:
> `docs/plan/01-ORTAK-SARTNAME.md`). Uygulama yaparken ilgili belge oradan okunur; bu dosya
> tıkanıklık analizi ve takvim olarak kalır.

## 4. Sıradaki işler (öncelik sırasıyla)

### P0 — Bu hafta (müşteriye görünür etki)

**P0.1 K0 dinleme görüşmesi (yarım gün).**
- Müşteriyle 30 dakika: hangi ekranda zorlanıyor, pratikortam'da en çok neyi seviyor.
- 10 iş için bugünkü panelde ve pratikortam'da tık sayısı ölçülür (liste: `KOLAYLASTIRMA-PLANI.md:251-262`).
- Çıktı: `docs/KOLAYLASTIRMA-DINLEME.md` (müşteri adı, tutar, VKN **yazılmaz**).
- Kural: pratikortam.com **salt okunur**; şifreyi ajan yazmaz, müşteri kendisi girer.

**P0.2 Görsel jetonları yaz — en ucuz, en yüksek etkili iş (1-2 gün).**
- `client/src/index.css` içine `html[data-ui="new"] { … }` bloğu: sade zemin, keskin köşe, gölgesiz
  kart, daha geniş satır aralığı, sakin kenarlıklar. `uiMode.ts:21` niteliği zaten yazıyor.
- Amaç: müşteri "Yeni görünüm"ü açtığında **farkı görebilsin**. Bugün göremiyor.
- Doğrulama: 2 ekran görüntüsü (klasik vs yeni, aynı sayfa), `npm run lint && npm run build`.

**P0.3 Ortak parçaları yay (2-3 gün).**
- `MoreMenu` (Excel'e aktar / Excel'den aktar), `FilterBar` + `FilterPanel`, `RowMenu` beş listeye
  uygulanır: `CustomersPage`, `SuppliersPage`, `DriversPage`, `StaffPage`, `RecurringPaymentsPage`
  (F4.1'in ön koşulu; F4'ü beklemeden yapılabilir).
- Doğrulama: `client/e2e/new-ui/` altına bir spec; `AGENTS.md:493` kuralı: **test silme/skip yok**.

**P0.4 Müşteri hesabında "Yeni görünüm"ü aç ve gezdir (1 saat).**
- Kod değişikliği yok; P0.2'den **sonra** anlamlı. Müşteri kendi hesabında açar, ekran kaydı alır.

**P0.5 F2 kalanı (2-3 gün):** Onay Bekleyenler sekmesi (`?sekme=onay`) + Sevkiyat formu tek sayfa
iki sütun (`components/TripForm.tsx`). En sık iş #1 ve #5 buna bağlı.

### P1 — Sonraki hafta

**P1.1 F3 kalanı (3-4 gün):** "Faturalandırılacaklar" sekmesi, sayaç kutuları, süzgeç paneli,
Bankalar kart görünümü. Dosyalar: `InvoiceCreatePage.tsx`, `InvoicesPage.tsx`, `CariPage.tsx`,
`CashAccountsPage.tsx`, `ChecksPage.tsx`. En sık iş #5, #6, #7, #8.

**P1.2 F4 (1 hafta):** beş listede Excel'e aktarım; yeni `pages/FuelPage.tsx` (`/mazotlar`) ve
`/arac-masraflari` (`ExpensesPage`'e `mode` prop'u, kod kopyalamadan); Araçlar'da tek uyarı simgesi;
`ReportsPage` ilk sekme "Genel Bakış" (**yeni sunucu ucu gerekirse dur ve sor**); `SettingsPage`
Yönetici sekmeleri + **Profilim** (admin olmayan kullanıcı da ulaşabilmeli — `nav.ts` düzeltmesi).

**P1.3 F5 (3-4 gün):** formlar (zorunlu alanlar → tek "Diğer bilgiler", sabit Kaydet/Kaydet ve yeni);
telefon alt çubuğu + 640px altında kart görünümü (`DataTable`'a `mobileCard` prop'u).

### P2 — Üçüncü hafta

**P2.1 F6 (3-4 gün):** boş/iskelet/hata ekranları; `HelpPage` yeni adlarla + "Eski adı → Yeni yeri"
tablosu; **`DEFAULT_UI_MODE = 'new'`**; klasik görünüm Profilim'de "Klasik (eski)" olarak 2 hafta kalır.

**P2.2 Kabul testi (müşteriyle):** aşağıdaki §6. Sonuç `KOLAYLASTIRMA-PLANI.md` "Durum" tablosuna yazılır.

**P2.3 (2 hafta sonra, onayla):** klasik kodu kaldır (`classicNav`, `DashboardPage` eski düzeni,
`PageShell` klasik dalı).

## 5. Önerilen takvim

| Hafta | İş | Gösterim |
|---|---|---|
| 1 | K0 + P0.2 görsel jetonlar + P0.3 ortak parçalar + müşteride yeni görünüm + F2 kalanı | Cuma: müşteri |
| 2 | F3 kalanı + F4 | Cuma: müşteri |
| 3 | F4 kalanı + F5 + F6 cila + `DEFAULT_UI_MODE='new'` | Cuma: kabul testi |
| 5 | Klasik görünümü kaldır (onayla) | — |

Toplam ~3 hafta (klasik kodun silinmesi ayrı iş, +2 hafta bekleme).

## 6. Kabul ölçütü (değişmedi)

`KOLAYLASTIRMA-UYGULAMA.md` §8: müşteri **yardım almadan 10 işin en az 9'unu** yapabilmeli ve hiçbiri
pratikortam'dakinden uzun sürmemeli. Ek ölçütler: 1440×900'de **≥12 sevkiyat satırı**; yeni görünümde
üst kısım (başlık → tablo başlığı) **≤260px**; 390×844'te yatay kaydırma yok.

## 7. Doğrulama

```bash
# Sunucu (~311 test, gerçek PostgreSQL gerekir)
cd server && dotnet test

# İstemci (lint + tsc + build)
cd client && npm run lint && npm run build

# Model/migration uyumu (model değiştiyse)
cd server && dotnet-ef migrations has-pending-model-changes \
  --project YesLojistik.Infrastructure --startup-project YesLojistik.Api

# Şoför uygulaması
cd mobile && npm run typecheck
```

Tarayıcı (e2e, 53 test): `AGENTS.md` §4'teki sıra. Yeni görünümü testte açmak için yardımcı zaten var:

```ts
// client/e2e/helpers.ts:44
export async function useNewUi(page: Page) { /* localStorage: yes.uiMode = 'new' */ }
```

Kural: **her görev sonunda** lint + build + `dotnet test` + tüm e2e + 2 ekran görüntüsü + Durum
tablosu güncellemesi + commit + `git pull --rebase origin main` + `git push origin HEAD:main`.
Push = canlı (Render). Testler yeşil değilse push yok. Test silme/atlama yasak.

## 8. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Varsayılan `new` yapılınca müşteri zorlanır | Tek satır geri: `DEFAULT_UI_MODE = 'classic'` (`lib/uiMode.ts:8`); klasik kod 2 hafta kalıyor |
| Görsel jetonlar müşterinin beğenmediği bir yön olur | P0.2'de 2 ekran görüntüsü müşteriye gösterilir, **onaydan sonra** yayılır (K1 adımı) |
| F4.5 Analiz yeni sunucu ucu ister | Uç yazmadan dur, kullanıcıya sor (`UYGULAMA.md` §F4.5) |
| Yeni görünümde özellik "kaybolur" | Kaldırılanın yeni yeri `KOLAYLASTIRMA-PLANI.md` §5'te; HelpPage'e "eski → yeni" tablosu |
| Admin olmayan kullanıcı yeni görünümde ayarlara ulaşamaz | F4.6'da `nav.ts:106` düzeltilir (`/ayarlar` herkese, admin sekmeleri yetkiye bağlı) |
| Canlı veri bozulur | Migration yalnız ekleme; canlıya yazan işlemden önce yedek + onay (kural `AGENTS.md` §3.5) |

## 9. Güvenlik: pratikortam ve panel giriş bilgileri

**Denetim sonucu (5 Ekim 2026): repoda ve tüm git geçmişinde gömülü şifre/anahtar YOK.**
Kontrol edilenler: çalışma ağacı, tüm commit geçmişi (`git log -S` ile `PRATIK_PASS`, `PRATIK_USER`,
`PANEL_PASSWORD`), commitlenmiş `.env` arayışı, workflow logları.

- `.env` hiç commitlenmemiş; yalnız `.env.example` (boş şablon) var.
- Giriş bilgileri GitHub **Actions secret** olarak duruyor: tek `PASS` secret'ı; `tools/legacy/secrets.sh`
  satır satır okuyup `::add-mask` ile maskeliyor, loglara değer basılmıyor (`mirror.yml` yalnız sayı yazar).
- `tools/license/` özel anahtarı `.gitignore` ile engelli.
- Koddaki `Admin123!` yalnız geliştirme/CI örnek hesabı (`appsettings.Development.json`, testler);
  canlı şifre değil (kurulum sihirbazı kendi şifresini sorar: `docs/KURULUM.md`).
- Not: repo bu tarihe kadar geneldi; Actions secret'ları repo public olsa da dışarıya açılmaz ve
  maskesiz log izi bulunmadı → **sızma tespit edilmedi**.

**Öneriler (sırayla):**
1. `PASS` yerine dört ayrı secret: `PRATIK_USER`, `PRATIK_PASS`, `PANEL_EMAIL`, `PANEL_PASSWORD`
   (`secrets.sh` ikisini de destekliyor).
2. **Ayna dönemi bitince** (A9 geçişi) pratikortam secret'ları GitHub'dan silinir.
3. Müşteri kendi pratikortam şifresini değiştirsin (o şifre senin GitHub hesabında duruyor).
4. Canlı yönetici şifresinin demo şifresi olmadığını doğrula.
5. Repo özel (private) yapıldı; secret scanning / push protection ücretli plana bağlı olabilir —
   uygunsa Ayarlar → Code security'den açılır.
6. Yeni sır dosyaya yazılmaz; ortam değişkeni / GitHub Secret (kural `AGENTS.md` §3.4).

## 10. Kullanıcıdan (müşteriden) bekleyenler
- K0 görüşmesi için 30 dakika + pratikortam'da 3 işin gösterimi.
- P0.2 görsel yönü için onay (2 ekran görüntüsü).
- F3 "sayaç kutuları" ile ne kastedildiğinin onayı.
- `docs/TERIMLER.md` terim onayı (ekran metinleri F1.5'te "Sevkiyat" oldu; sunucu mesajları ve
  şoför uygulaması hâlâ "Sefer" diyor).
- F6 sonunda kabul testi + "varsayılan yapılsın" onayı.

## 11. Uygulama modu ve kapsam (kullanıcı kararı, 5 Ekim 2026)

- **Kapsam:** plan **baştan sona** uygulanacak (`docs/plan/02`–`34` belgelerinin tamamı).
- **Çalışma modu: dal + CI kapısı.** Kod `codex/<konu>` benzeri bir dala push edilir; GitHub Actions
  (legacy · server[PostgreSQL 16] · client · mobile · e2e/Playwright) **yeşil** olunca `main`'e alınır.
  Böylece test edilmemiş kod canlıya çıkmaz. Bu, `AGENTS.md` §3.6'daki "doğrudan main" kuralına
  **kullanıcı onayıyla** bu iş için getirilen istisnadır.
- **Yerel ortam gerçeği (5 Ekim ölçümü):** bu makinede .NET **8** SDK var, proje .NET **10** istiyor;
  PostgreSQL kurulu değil; Playwright Chromium yok; Docker yok. Bu yüzden yerelde `dotnet test` ve e2e
  **çalışmıyor**; doğrulama CI'da yapılır. `npm` betik kısıtına takıldığı için `npm.cmd` kullanılır.
- **Yayın disiplini:**
  1. İşe başlarken `git pull --rebase origin main`.
  2. Dal push → CI yeşil olana kadar bekle (~9-11 dk).
  3. **Ayna işi çalışırken `main`'e almaktan kaçın:** Render yeniden başlatması, aynanın (pratikortam
     verisini panele yazan GitHub Actions işi, günde 4 kez) ortasında API'yi düşürür. `gh run list` ile
     "Pratikortam aynası" koşusunun bitmesini bekle.
  4. `main`'e alındıktan sonra **Canlı kontrol** (smoke) koşusunun yeşil olduğunu doğrula.
  5. Migration kuralı: yalnız ekleme (boş olabilen sütun/tablo); canlı veriye yazan işlemden önce
     yedek + kullanıcı onayı.
- **Adım büyüklüğü:** her adım tek konu, tek dal, tek yeşil CI, tek `main` alımı. Belge başına §10'daki
  adımlar sırayla uygulanır; ilgili belgenin §11 kabul ölçütü sağlanınca bir sonraki belgeye geçilir.
- **Müşteriye bağlı adımlar:** K0 görüşmesi (`33-K0-VE-KABUL-TESTI.md`), görsel yön onayı (P0.2),
  terim onayı ve kabul testi kullanıcı/müşteri tarafındadır; bunlar beklenirken kod işi durmaz.
