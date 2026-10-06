# 25 — Yönetici (Ayarlar) ekranı

## 1. Amaç ve kapsam

Bu ekran firmanın **kimliğini ve çalışma kurallarını** tanımlar: firma adı/vergi bilgisi/logo, kullanıcı
hesapları ve rolleri, faturaya kendiliğinden yazılan hazır notlar, kim neyi değiştirdi kaydı, Excel'den
toplu veri alma, yedek ve depolama, abonelik durumu ve ilk kurulum sihirbazı.

`01-ORTAK-SARTNAME.md` §5'teki **10 sık işin** hiçbiri burada yapılmaz; ama üçünün arka planıdır:
**5 (fatura kesmek)** için ön ek, sıradaki numara, KDV/tevkifat ve e-Fatura seri önekleri; **7–8
(tahsilat, tedarikçi ödemesi)** için vade varsayılanı; **10 (aylık kazanç)** için kimin neyi göreceğini
belirleyen roller.

Hedef: pratikortam'daki "Yönetici" alışkanlığını bozmadan sadeleştirmek. Sekmeler pratikortam
adlarını taşır, kullanıcının **kendi** ayarları ile **firmanın** ayarları ayrılır, teknik kartlar
"Gelişmiş" katmanına iner ve `/ayarlar` yönetici olmayana da açılır.

Kapsam içi: sekme modeli ve sırası, sekme yetki kontrolü, `/ayarlar`'ın admin olmayana açılması, kendi
ayarlarının bu ekrandan çıkarılması, `Veri Aktarımı` ve `Kurulum` sekmelerinin mevcut sayfalara
bağlanması, "Gelişmiş" katlanır bölümü, e-Fatura ayar metnindeki **dosya yolu** sorunu, telefon,
erişilebilirlik, testler.

Kapsam dışı: kendi ayarları sekmelerinin içeriği (`26-PROFILIM.md`), ortak parçalar
(`28-ORTAK-PARCALAR.md`), yeni görünüm jetonları (`29-GORSEL-SISTEM.md`), API sözleşmeleri
(`30-VERI-API.md`), tık ölçümü (`33-K0-VE-KABUL-TESTI.md`), risk/gizlilik (`34-RISK-GUVENLIK.md`).

## 2. Bugünkü durum (kod kanıtıyla)

### 2.1 Rota, menü, yetki

Rota `client/src/App.tsx:109` ve bu satırda **`Guard` yoktur** — adres zaten herkese açıktır. Ama yeni
menüde tek öğe `client/src/lib/nav.ts:106`'da `perm: 'admin'` taşır; klasik menüde öğe etiketi düz
"Ayarlar" (`nav.ts:62-63`), `perm` yoktur, yani klasik menüde herkes görür. Süzgeç
`client/src/components/Layout.tsx:51`'dedir (`g.items.filter((n) => !n.perm || can(n.perm))`); aynı
satırın devamında boş kalan grup hiç çizilmez (`Layout.tsx:52`), yani admin olmayan kullanıcı yeni
görünümde Yönetici'yi menüde hiç görmez. Role göre **etiket** değiştiren bir örnek kodda **yoktur**:
`Layout.tsx:64` menü etiketini doğrudan basar (`<span …>{n.label}</span>`); `Layout.tsx:263`'teki
`can('accounting')` yalnızca alt çubuktaki hedef adresi (`/cari/musteriler` ya da `/musteriler`) seçer.

Admin olmayan kullanıcı bugün bu ekrana yalnız **kullanıcı menüsünden** ulaşır: `Layout.tsx:333`
(`?tab=security`) ve `Layout.tsx:336` (`?tab=password`). Yani "kendi ayarları" pratikte iki bağlantıdır.

Bölüm sekmeleri `client/src/lib/sections.ts:28-32`'de: `Ayarlar`, `Veri Aktarımı`, `Kurulum Sihirbazı`
(`perm: 'admin'`). `/ayarlar` `newTitles` içinde **yoktur** (`sections.ts:41-50`), bu yüzden yeni
görünümde başlık düz "Ayarlar" kalır (`client/src/components/ui.tsx:112`).

### 2.2 Sekmeler

`client/src/pages/SettingsPage.tsx:26` on değerli bir `Tab` birleşimi tanımlar. Varsayılan sekme
`:31`'de `?tab=`'dan, yoksa yöneticide `company`, diğerlerinde `password` olur. Liste `:32-41`, çizim
`:44-45` (`PageHeader` + `Tabs`), içerik `:46-71`; sekmelerin çoğu `can('admin')` ile ayrıca korunur
(`:46, 50, 51, 52, 58, 67, 71`).

**İki kusur buradadır.** Birincisi: `:31` adresten gelen `tab` değerini **yetkiye karşı doğrulamaz**;
admin olmayanın `/ayarlar?tab=company` adresinde değer yok sayılır, sayfa varsayılana (`password`)
düşer; `company` değeri yalnız admin sekmesi olarak çizilir, o yüzden yetkisiz kullanıcı yanlış
sekmede boş içerik görür. İkincisi: `Tabs` (`ui.tsx:272-284`)
düz `<button>` çizer; `role="tablist"`, `role="tab"`, `aria-selected` **yoktur** —
`ImportPage.tsx:25-28`'de bu nitelikler vardır.

### 2.3 Firma sekmesi

Şema `SettingsPage.tsx:76-104` (VKN `:79`, fatura ön eki `:86`, e-Fatura seri önekleri `:95-97`,
MERSİS `:101`). Form `:107-111`'de `GET /settings` çeker, `:120`'de `PUT /settings` kaydeder. Logo
kuralı `:125-127` (yalnız PNG/JPEG, ≤500 KB). Kaydet `:222`'de `write` **taşımaz** ve bu doğrudur:
`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16-18` listesinde `/api/settings` **yoktur**,
sınıf yorumu `:10`'da "ayarlar, kullanıcılar ve ayna senkronunun kendisi etkilenmez" der.
Sunucu: `SettingsController.cs:16-25` `GET` (varsayılan politika, `Program.cs:79-81`), `:27` `PUT`
**Admin**, `:61-62` e-Fatura açıkken VKN/vergi dairesi/il zorunluluğu.

### 2.4 Kullanıcılar sekmesi

Şema `:229-236`, uç `:238` (`crud<User, UserValues>('users')`), liste `:245`. Satır işlemleri
`:247-249` (kilidi aç, iki adımlıyı sıfırla, oturumları kapat); sütunlar `:250-269`, kendi hesabında Sil
pasif (`:265`). Rol açıklaması `:274-277`'de tek paragraftır. Form `:286-328`; güçlü şifre kuralı
`:239`, şoför rolünde bağlı şoför zorunluluğu `:289`. Sunucu ucu `UsersController.cs:16` ile tümüyle
**Admin**'dir.

### 2.5 Fatura Notları, İşlem Geçmişi, Veriler, Abonelik

**Fatura Notları:** `SettingsPage.tsx:51` → `client/src/components/InvoiceNotesCard.tsx:14`
(`GET /invoice-notes`); sunucuda **salt okuma açıktır**: `InvoiceNotesController.cs:19-21` `GET`
listesinde `[Authorize]` **yoktur**, varsayılan politikaya düşer (`Program.cs:79-81`: giriş yapmış
**ofis** kullanıcısı, rol ayrımı yok). Yazma uçları **Accounting** ister (`:23` POST, `:34` PUT, `:44`
DELETE). Yani yönetici ve muhasebe yazar, "operasyon" kullanıcısı listeyi görür ama kaydederse 403 alır
(ekran sekmesi yine `can('admin')` ile korunur, `SettingsPage.tsx:51`).

**İşlem Geçmişi:** `:52-57`; ":54"te "Kayıtlar 2 yıl saklanır." yazar. Tablo
`client/src/components/AuditLog.tsx:29`, sayfa boyu 30 (`:36`), arama + kayıt türü süzgeci (`:30-31`).
Sunucu `AuditController.cs:14` **Admin**.

**Veriler:** `:58-66` beş kart çizer: `MirrorCard` (`:368-434`), `GoLiveCard` (`:534-577`),
`BackupCard` (`:502-531`), `MigrationCheckCard` (`:623-676`), `ResetDataCard` (`:436-497`).
`BackupCard` 1 GB sınırını sabit tutar (`SettingsPage.tsx:500`'deki `DB_LIMIT_BYTES`), indirme
bağlantıları `:511-512`; `MigrationCheckCard`
"Sayımı kopyala" (`:649`) ve karşılaştırma tablosu (`:658-672`); `ResetDataCard` kutuya "SİL" onayı
ister (`:443`). Sunucu: `SettingsController.cs:70-77` (`reset-data`), `AdminController.cs:52-57` ve
`:38-50`, `LegacyController.cs:18, 26, 30` — hepsi Admin; `AdminController` sınıfın tamamı `:19`'da
`[AllowAnonymous]`'dur ama her metot `Authorized()` ile korunur, erişim `:26-33`'te yönetici oturumu ya
da `X-Backup-Token` iledir; geri kalanlar (`DataExportController.cs:24` `[Authorize(Policy = Admin)]`,
`/admin/export-all`, `/admin/close-request`) yalnız yönetici oturumuyla açılır.

**Abonelik:** `:67` → `client/src/pages/LicenseTab.tsx:14-24`; durum kartı `:26-69`, yenileme
`:81-107`, paket tablosu `:109-131` (`:112-113`'te `overflow-x-auto` + `min-w-[40rem]`).
Sunucu `LicenseController.cs:19` (okuma) ve `:23` (anahtar uygulama, Admin).

### 2.6 Kendi ayarları ve "dosya yolu" sorunu

Kendi ayarları bugün aynı ekrandadır: `NotificationPrefsCard` `:582-603`, `PasswordForm` `:330-357`,
`TwoFactorCard` `:70` ve `DataOwnershipCard` `:71` (ikisi `client/src/components/SecurityCards.tsx:31`
ve `:156`'da tanımlıdır; sunucu `MeController.cs:18`,
`DataExportController.cs:24`).

**e-Fatura ayarında kullanıcıya dosya yolu gösterilir.** `EInvoiceProviderInfo`
(`SettingsPage.tsx:606-615`) entegratör bağlı değilse `:612`'de aynen "Entegratörle sözleşme sonrası
kurulum adımları docs/E-FATURA.md dosyasında." yazar. Ekranda **depo dosya adı** görünür; bu
`01-ORTAK-SARTNAME.md` §5'teki "ekranda teknik sözcük yok" kuralına aykırıdır. Aynı sorun
`docs/plan/05-E-FATURA.md:123-126`'da da kayıtlıdır.

### 2.7 Testler ve mobil

**Testler:** `workflow.spec.ts:203` (İşlem Geçmişi),
`:209-219` (yedek kartı, indirme), `:306-308` (Canlıya geçiş n/7), `:310-344` (e-Fatura aç/kapat);
`security.spec.ts:20-23`; `license.spec.ts:9-10, 14-19`; `mobile.spec.ts:4, 12-14` (yatay taşma yok);
`new-ui/basics.spec.ts:20-25` (yeni menünün **tam** etiket listesi).

## 3. Hedef yerleşim

Sekmeler pratikortam adlarıyla **tek satır**: Firma · Kullanıcılar · Fatura Notları · İşlem Geçmişi ·
Veri Aktarımı · Yedek ve Veri · Abonelik · Kurulum. Kendi ayarları (Telefon Bildirimleri, Şifre
Değiştir, Güvenlik, Veri ve hesap) buradan çıkar; yerini `26-PROFILIM.md` alır. Bugünkü `Tab` birleşimi
bunların altısını taşır (`SettingsPage.tsx:26`: `company, users, invoiceNotes, audit, data, license`);
`Veri Aktarımı` ve `Kurulum` sekmeleri yeni köprüdür, mevcut `/aktar` ve `/kurulum` sayfalarına gider.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Yönetici                                                [⋯ Gelişmiş ▾]   │
│ Firma · Kullanıcılar · Fatura Notları · İşlem Geçmişi · Veri Aktarımı ·  │
│ Yedek ve Veri · Abonelik · Kurulum                                       │
│ ┌ Firma ─────────────────────────────┐ ┌ Fatura Ayarları ─────────────┐  │
│ │ Firma Adı · VKN · İl · IBAN · Logo │ │ Ön ek · KDV · Tevkifat · Vade│  │
│ └────────────────────────────────────┘ └──────────────────────────────┘  │
│ [Kaydet]                                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

- Sekme şeridi + başlık yüksekliği **≤180px** (form ekranı; §5'teki ≤260px kuralı listeler içindir).
- "Gelişmiş" sağ üstte katlanır bölümdür: **Taşınma kontrolü**, **Pratikortam aynası**, **Demo
  verilerini temizle**, e-Fatura sağlayıcı ayrıntısı — bugün bunlar Veriler sekmesinin ilk ekranıdır
  (`SettingsPage.tsx:58-66`).
- `Veri Aktarımı` sekmesi `/aktar` (`sections.ts:30`), `Kurulum` sekmesi `/kurulum`
  (`sections.ts:31`) açar; ikisi ayrı sayfa kalır, sekme yalnız köprüdür. `/kurulum` rotası zaten
  `Guard perm="admin"` taşır (`App.tsx:110`), `/aktar` taşımaz (`App.tsx:111`): `Veri Aktarımı`
  sekmesi admin olmayana da açıktır.
- Firma formu iki sütun (`SettingsPage.tsx:135`'teki `lg:grid-cols-2`), telefonda tek sütun
  (`:137`'deki `sm:grid-cols-2`).

## 4. Alanlar, düğmeler ve etkileşim

| Sekme | İçerik | Yazma düğmeleri | Yetki |
|---|---|---|---|
| Firma | Firma, fatura, bildirim/e-Fatura ayarları | Kaydet (`:222`) | Admin |
| Kullanıcılar | Kullanıcı tablosu + form | Yeni Kullanıcı, Düzenle, Sil, Kilidi aç, 2 adımlıyı sıfırla, Oturumları kapat | Admin |
| Fatura Notları | Not tablosu + form | Yeni Not, Düzenle, Sil | Admin (sunucu: Accounting) |
| İşlem Geçmişi | Denetim tablosu, arama + tür süzgeci | yok | Admin |
| Veri Aktarımı | `/aktar` sayfası | ImportWizard düğmeleri | Operations+ |
| Yedek ve Veri | Yedek kartı, canlıya geçiş listesi | Tam/Dosyasız yedeği indir, demo temizle | Admin |
| Abonelik | Durum, yenileme, paketler | Anahtarı uygula | Admin |
| Kurulum | `/kurulum` sihirbazı | Sihirbaz düğmeleri | Admin |

Alan kuralları şemadan **aynen** korunur: VKN 10/11 hane (`SettingsPage.tsx:79`), ön ek 1-5 büyük harf
(`:86`), MERSİS 16 hane (`:101`), logo ≤500 KB (`:125-127`), şifre ≥8 karakter + harf ve rakam (`:239`),
e-Fatura açıkken VKN/vergi dairesi/il zorunlu (`SettingsController.cs:61-62`). Hata alanın altında;
sunucu hatası `applyServerErrors` ile alana bağlanır (`:121`, `:301`). **Ctrl+Enter kaydeder**,
**Esc kapatır** — bu iki kısayol `Modal` bileşenindeki pencere dinleyicisindedir (`ui.tsx:189-197`);
kaydedilmemiş değişiklikte kapatma onay ister (`ui.tsx:161-164`'teki `requestClose` + `:222-227`
onay şeridi).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş / yükleniyor / hata:** Firma formu `Loading` çizer (`SettingsPage.tsx:109`), listeler
  `DataTable` iskeletini kullanır; boş liste metinleri (ör. `InvoiceNotesCard.tsx:36`) korunur;
  `Loading error onRetry` (`:109`) ve `DataTable error onRetry` desenleri sürer, hata kart içinde kalır.
- **Yetkisiz:** yönetici sekmeleri admin olmayana **hiç çizilmez** (`:32-41`, `:46-71`). İzinsiz
  `?tab=` **ilk izinli sekmeye** düşer ve `role="alert"` ile "Bu bölümü görmek için yönetici yetkisi
  gerekir." yazar. Bugünkü kod bunun tersini yapar: `:31` değeri doğrulamadan state'e koyar.
- **Ayna:** `MirrorWriteGuard.cs:16-18` listesi yalnız kayıt uçlarını (`/api/customers`, `/api/trips`,
  `/api/invoices` …) korur; `legacy/*` yazma uçları listede **yoktur**, Firma (`/api/settings`) ve
  Kullanıcılar (`/api/users`) da yoktur — üçü ayna açıkken **de** düzenlenebilir (`:10`'daki sınıf
  yorumu: "ayarlar, kullanıcılar ve ayna senkronunun kendisi etkilenmez"). Ayna kartı
  (`SettingsPage.tsx:368-434`) `status.mirrorMode` doğruyken "Aynayı kapat" düğmesini gösterir
  (`:412-414`); kartın `write` taşımaması doğrudur.
- **Lisans:** süre dolduğunda `LicenseBanner` üstte çıkar; yöneticiye "Abonelik", admin olmayana
  "Yöneticinizle görüşün." yazar (`LicenseBanner.tsx:16-18`). Bakım modunda kayıt ekleme kapalıdır
  (`Layout.tsx:102-106`).

## 6. Metinler ve terimler

| Yer | Bugün | Hedef |
|---|---|---|
| Sekme | bilinmeyen | Firma · Kullanıcılar · Fatura Notları · İşlem Geçmişi · Veri Aktarımı · Yedek ve Veri · Abonelik · Kurulum |
| Sekme adı | Veriler (`:35`) | Yedek ve Veri |
| e-Fatura | "… kurulum adımları docs/E-FATURA.md dosyasında." (`:612`) | "Entegratör bağlı değil: faturanın XML dosyasını indirip entegratör portalına ya da muhasebecinize verirsiniz." |
| Rol açıklaması | `:275-276` üç rol tek paragraf | üç satırlık liste (Yönetici / Operasyon / Muhasebe) |

Yasak: "ayna", "dry-run", "endpoint", "token", "UBL" gibi sözcükler ekranda görünmez
(`01-ORTAK-SARTNAME.md` §6; kabul ölçütü §5'teki "Ekranda teknik sözcük yok" satırıdır). Ekranda
**dosya yolu, klasör adı, depo dosyası adı geçmez**. Metinler
`docs/TERIMLER.md` ve `32-TERMINOLOJI.md` ile uyumlu olur.

## 7. Telefon davranışı (390×844)

Sekme şeridi tek satıra sığmaz; **yatay kaydırmalı** olur (`overflow-x-auto`), sayfa gövdesi kaymaz —
`mobile.spec.ts:12-14` bunu kart ve `main` sınırından ölçer. Firma formu telefonda tek sütuna iner
(`SettingsPage.tsx:137`'deki `sm:grid-cols-2`); abonelik paketi kendi kabında kayar
(`LicenseTab.tsx:112-113`). Kullanıcı ve denetim listeleri
kart görünümüne döner; satır işlemleri kart altında, dokunma hedefi **≥44px**. "Gelişmiş" tam
genişlikte, tek sütun açılır. Bugün `Tabs` düğmesi `py-2.5` + `text-[0.875rem]` ile ~41px kalır
(`ui.tsx:277`); 44px hedefi bu satırda `min-h-11` ile karşılanır.

## 8. Erişilebilirlik ve klavye

`Tabs` bileşenine `role="tablist"`, her düğmeye `role="tab"` ve `aria-selected` eklenir
(`ui.tsx:272-284`); örnek uygulama `ImportPage.tsx:25-28`'dedir (`role="tablist"` kabı `:25`, her
çipte `role="tab"` + `aria-selected` `:27`). Panel `role="tabpanel"` ve
`aria-labelledby` alır. Odak sırası: başlık → sekme şeridi → kart alanları → Kaydet. `:focus-visible`
halkası `client/src/index.css:102-106`'dan gelir ve korunur. Rozetler metin + işaret birlikte yazılır
(`ui.tsx:70-77`), yalnız renkle anlatım yoktur. Sekme düğmeleri ≥44px'e çıkarılır. "Gelişmiş" bölümü
`<details>`/`<summary>` ile yazılır (`HelpPage.tsx:8` deseni) ve klavyeyle açılıp kapanır.

## 9. Testler (e2e + birim)

**Bugün var olanlar:** `client/e2e/workflow.spec.ts:203, 209-219, 306-308, 310-344`;
`client/e2e/security.spec.ts:20-23`; `client/e2e/license.spec.ts:9-25`;
`client/e2e/mobile.spec.ts:4-19`; `client/e2e/new-ui/basics.spec.ts:20-25` (menü listesi).

**Güncellenecek:** `client/e2e/new-ui/basics.spec.ts:23-25` etiket listesi, `/ayarlar` etiketi role göre
değiştiği için yeni hâle getirilir (test **silinmez, atlanmaz**).

**Eklenecek:** `client/e2e/new-ui/settings.spec.ts` (yeni), `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile 6 senaryo: (1) admin sekiz sekmeyi tek satırda görür, Firma
varsayılan açılır; (2) admin olmayan `/ayarlar?tab=company` yazınca boş sayfa yerine ilk izinli sekmeyi
ve uyarıyı görür; (3) menüde Ayarlar'ı görür ve Telefon Bildirimleri'ne ulaşır; (4) "Gelişmiş"
kapalıyken Taşınma kontrolü ve ayna kartı görünmez, açılınca görünür; (5) e-Fatura metni **dosya yolu
içermez**; (6) 390×844'te şerit kayar, sayfada taşma olmaz. **Birim:** sekme yetki çözümlemesi
(izinli liste + `?tab=` düşme kuralı) `client/src/lib/settingsTabs.ts` içinde saf fonksiyon olarak
yazılır ve test edilir; sunucuda yeni davranış yoktur.

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **Sekme modeli tek kaynakta.** `client/src/lib/settingsTabs.ts` (yeni): liste, etiket, `perm`,
   varsayılan ve "izinli ilk sekme" çözümleyicisi; `SettingsPage.tsx:26-41` buradan beslenir.
   Doğrulama: `cd client && npm run lint && npm run build`. Süre: 3 saat.
2. **Yetki kontrolü.** `SettingsPage.tsx:31` — izinsiz `tab` ilk izinli sekmeye düşer, `role="alert"`
   mesajı çıkar. Doğrulama: `npm run build` + adım 11'in 2. senaryosu. Süre: 2 saat.
3. **Sekme erişilebilirliği.** `ui.tsx:272-284` — `role="tablist"`, `role="tab"`, `aria-selected`,
   `role="tabpanel"`. Doğrulama: `npx playwright test e2e/security.spec.ts`. Süre: 2 saat.
4. **`/ayarlar`'ı aç.** `client/src/lib/nav.ts:106` — `perm: 'admin'` kaldırılır, öğeye
   `altLabel: 'Ayarlar'` eklenir; `Layout.tsx:64` etiketi `can('admin')`'e göre seçer (rol değil, izin;
   `nav.ts:10`'daki `NavItem` tipine `altLabel?: string` alanı eklenir). `new-ui/basics.spec.ts:23-25`
   güncellenir. Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`. Süre: 2 saat.
5. **Kendi ayarlarını çıkar.** `SettingsPage.tsx:37-40, 68-71` — dört kişisel sekme `26-PROFILIM.md`
   kapsamına taşınır. Doğrulama: `npm run build` + `npx playwright test e2e/security.spec.ts`.
   Süre: 4 saat.
6. **Veri Aktarımı ve Kurulum.** `SettingsPage.tsx` — sekmeler `/aktar` ve `/kurulum`'a gider
   (`sections.ts:29-31`); kopya içerik yazılmaz. Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
   Süre: 3 saat.
7. **"Gelişmiş" katmanı.** Yeni `client/src/components/AdvancedSection.tsx` (`HelpPage.tsx:8` deseni);
   `SettingsPage.tsx:58-66` — `MigrationCheckCard` (`:623-676`), `MirrorCard` (`:368-434`),
   `ResetDataCard` (`:436-497`) buraya iner; `BackupCard` (`:502-531`) önde kalır. Doğrulama:
   `npx playwright test e2e/workflow.spec.ts`. Süre: 4 saat.
8. **e-Fatura metni.** `SettingsPage.tsx:612` — depo dosya adı kaldırılır, §6'daki cümle konur;
   `EInvoiceProviderInfo` Gelişmiş içine iner. Doğrulama: yeni spec senaryo 5. Süre: 1 saat.
9. **Abonelik ve yedek.** `LicenseTab.tsx:112-113` — tablo kabı korunur, telefonda kart; `BackupCard`
   başlığı "Yedekler" olur. Doğrulama: `npx playwright test e2e/license.spec.ts`. Süre: 2 saat.
10. **Telefon ve erişilebilirlik.** Kaydırmalı şerit, ≥44px hedefler, tek sütunlu Gelişmiş. Doğrulama:
    `npx playwright test e2e/mobile.spec.ts`. Süre: 4 saat.
11. **Yeni spec ve tam doğrulama.** `client/e2e/new-ui/settings.spec.ts` (6 senaryo); ardından
    `cd server && dotnet test`, `npm run lint && npm run build`, `npx playwright test`. Süre: 5 saat.
12. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`; `git diff --stat`.
    Süre: 0,5 saat.

Toplam: **32,5 saat ≈ 4 iş günü**.

## 11. Kabul ölçütü

1. Sekmeler **tek satırda, tek tıkla** değişir; sekme sayısı **8** (Firma, Kullanıcılar, Fatura Notları,
   İşlem Geçmişi, Veri Aktarımı, Yedek ve Veri, Abonelik, Kurulum).
2. Admin olmayan `/ayarlar`'a **menüden 1 tıkla** ulaşır, yönetici sekmelerini görmez;
   `/ayarlar?tab=company`'de **boş sayfa yerine** ilk izinli sekme + 1 uyarı çıkar.
3. Admin olmayanda `/api/users`, `/api/audit`, `/api/admin/*`, `/api/legacy/*` istekleri **0**'dır.
4. `?tab=license` açıldığında Abonelik **seçili** gelir (`license.spec.ts:10` korunur).
5. "Gelişmiş" kapalıyken Taşınma kontrolü, ayna kartı ve demo temizleme **görünmez**; başlıktan sekme
   şeridine yükseklik **≤180px**.
6. e-Fatura metninde **dosya yolu ve klasör adı geçmez** ("docs/" içeren metin **0**); "Entegratör"
   ekranda **en fazla 1** kez geçer.
7. `role="tablist"` + `aria-selected` vardır; sekme düğmesi **8**, hepsi ≥44px.
8. 390×844'te yatay taşma **yok** (`mobile.spec.ts:14`); şerit kaydırılabilir.
9. Yeni spec'te **6 senaryo** yeşil; `dotnet test`, `npm run lint && npm run build` ve tüm Playwright
   seti temiz; **silinen/atlanan test yok**, menü listesi testi güncellenmiştir.
10. Ekranda "ayna", "token", "endpoint" yok; para `tl2`/`tl`, tarih `03.10.2026`.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Etiket role göre değişince `basics.spec.ts:23-25` kırılır | Adım 4'te test aynı commit'te güncellenir | `altLabel` kaldırılır |
| Kişisel sekmeler taşınınca kullanıcı menüsü kırılır | `26-PROFILIM.md` ile aynı gün; `Layout.tsx:333, 336` yeni adrese çevrilir | Sekmeler `SettingsPage`'e döner |
| `?tab=` düşme kuralı yanlışsa yönetici sekmesine giremez | Adım 1'de saf fonksiyon + birim testi; `license.spec.ts:9` ile sınanır | Tek satırlık geri alma |
| Gelişmiş'e inen ayna kartı bulunamaz, ayna kapatılamaz | Ayna açıkken bölüm otomatik açılır, kartta "Açık" rozeti (`:406`) | Kart Veriler'in başına döner |
| e-Fatura metni sadeleşince kurulum adımı kaybolur | Metin "muhasebecinize/entegratöre verin" der; ayrıntı `docs/E-FATURA.md`'de kalır | Eski metin geri konur |
| Sekme şeridi telefonda taşar | Kaydırmalı şerit + `mobile.spec.ts:12-14` denetimi | Sekmeler iki satıra sarılır |

## 13. Doğrulanacaklar

1. **Menü etiketi:** admin olmayana "Ayarlar", yöneticiye "Yönetici" mi (`nav.ts:106`),
   yoksa herkes için tek ad mı? pratikortam'daki ad doğrulanmadı.
2. **Kendi ayarları burada mı kalsın?** Hedefte `26-PROFILIM.md`'ye taşınıyor; istenmezse adım 5 ve 7
   değişir.
3. **Fatura Notları yetkisi:** ekranda Admin, sunucuda Accounting (`InvoiceNotesController.cs:23`).
   Muhasebe kullanıcısı bu sekmeyi görmeli mi?
4. **`Kurulum` sekmesi kalıcı mı?** Sihirbaz 5 adımdır (`OnboardingPage.tsx:23-29`) ve iş bitince
   gereksizleşir; yalnız kurulum bitmemişse mi görünsün?
5. **"Gelişmiş" kesin listesi:** bu üç kart dışında ne girecek? Yedek kartı önde kalsın mı?
6. **Depolama sınırı:** `BackupCard` 1 GB'ı sabit varsayar (`:500`). Ücretli plana geçilince sınır
   sunucudan mı gelsin (`AdminController.cs:52-57` bugün yalnız bayt döner)?
7. **Paket fiyatları** `license.spec.ts:16-18`'de sabittir; fiyat değişince test mi, `PLANS` mı
   güncellenecek?
8. **İşlem Geçmişi "2 yıl"** (`:54`): sunucuda temizleme işi var mı? Yoksa metin yanıltıcıdır.
9. **Ayna açıkken ayar değişikliği** serbesttir (`MirrorWriteGuard.cs:10`); Firma sekmesi ayna açıkken
   salt okunur mu olmalı?
10. **`Veri ve hesap`** (`:71`) yöneticiye özel mi kalsın? Sunucu bugün Admin ister
    (`DataExportController.cs:24`).

---

Sonraki belgeyle bağlantı: `26-PROFILIM.md` bu ekrandan çıkan kişisel sekmeleri (Telefon Bildirimleri,
Şifre Değiştir, Güvenlik, Veri ve hesap) devralır; `27-TELEFON.md` 390×844 davranışını,
`28-ORTAK-PARCALAR.md` `PageShell`/`FilterBar` parçalarını, `29-GORSEL-SISTEM.md` yeni görünüm
jetonlarını, `30-VERI-API.md` `/settings`, `/users`, `/audit`, `/admin/stats` sözleşmelerini,
`33-K0-VE-KABUL-TESTI.md` bu ekranın tık ölçümünü anlatır; sıradaki belge `26-PROFILIM.md`'dir.
