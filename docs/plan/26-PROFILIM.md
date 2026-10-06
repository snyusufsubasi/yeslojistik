# 26 — Profilim

## 1. Amaç ve kapsam

Profilim, kullanıcının **kendi** işlerinin toplandığı yerdir: adı ve e-postası, şifresi, iki adımlı
doğrulaması, telefon bildirimleri ve görünüm tercihleri. Bugün bunlar `/ayarlar` sayfasında, yönetici
işleriyle **aynı sekme şeridinde** durur (`client/src/pages/SettingsPage.tsx:32-41`). Yönetici olmayan
kullanıcı sayfaya girince doğrudan "Şifre Değiştir" açılır (`SettingsPage.tsx:31`); "Profilim",
"Bilgilerim" ve "Görünüm" diye bölümler **yoktur**. Bu belge o ayrımı kurar.

Kapsam:

- `/ayarlar` **yeni rota almadan** ikiye ayrılır: yönetici için "Yönetici", diğeri için "Profilim"
  (`docs/KOLAYLASTIRMA-UYGULAMA.md:382-388`).
- Sekmeler: **Bilgilerim · Şifre · Güvenlik · Bildirimler · Görünüm**.
- Admin olmayan kullanıcı `/ayarlar`'a gelince **doğrudan Profilim'i** görür.
- Yeni menüde `/ayarlar` yalnız `perm: 'admin'` olduğu için (`client/src/lib/nav.ts:106`) admin olmayan
  menüden hiç giremiyor; bu düzeltilir.
- **Yazı boyutu seçeneği (Normal / Büyük / Çok büyük) korunur** (`AGENTS.md` §6).
- Görünüm'e iki yeni tercih eklenir: **tablo yazısı** (Tırnaklı / Düz) ve **satır sıklığı**
  (Rahat / Sık) — ikisi de kodda yok (`KOLAYLASTIRMA-UYGULAMA.md:190-194`).

Kapsam dışı: yönetici sekmeleri (`25-YONETICI.md`), telefon (`27-TELEFON.md`), ortak parçalar
(`28-ORTAK-PARCALAR.md`), jetonlar (`29-GORSEL-SISTEM.md`), terimler (`32-TERMINOLOJI.md`). Şoför
hesapları web panelini hiç açmaz (`client/src/App.tsx:47-48`).

En sık 10 iş listesinde (`01-ORTAK-SARTNAME.md:219-230`) Profilim geçmez; ama "müşteri yardım almadan"
hedefinin ön koşuludur: yazıyı büyütemeyen, şifresini değiştiremeyen kullanıcı paneli kullanamaz.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve koruma.** `/ayarlar` korumasızdır (`App.tsx:109`). `admin` olmayan da açabilir; yönetici
içeriği `can('admin')` ile süzülür (`SettingsPage.tsx:33-36, 40, 46-71`).

**Başlık ve sekmeler.** Başlık herkese "Ayarlar"dır (`SettingsPage.tsx:44`). Sekme listesi tek şeritte
10 madde (`26`): yöneticiye Firma Bilgileri · Kullanıcılar · Fatura Notları · İşlem Geçmişi · Veriler ·
Abonelik (`33-36`), herkese Telefon Bildirimleri · Şifre Değiştir · Güvenlik (`37-39`), yöneticiye
ayrıca Veri ve hesap (`40`). Varsayılan sekme `can('admin') ? 'company' : 'password'` (`31`). `?tab=`
okunur (`30-31`) ama yazılmaz: `onChange={setTab}` yalnız durumu günceller (`45`), yenilemede varsayılan
sekmeye dönülür. `security.spec.ts:20-23` bu yüzden sekmeyi düğmeye basarak açar.

**Bilgilerim yok.** Ad, e-posta ve rol hiçbir formda gösterilmez; yalnız sol menünün alt şeridinde
(`client/src/components/Layout.tsx:80`) ve kullanıcı menüsü düğmesinde (`322-326`) görünür.
Ad/e-posta güncelleyen uç yoktur: `AuthController` yalnız
`login/refresh/logout/token/me/change-password/forgot-password/reset-password` taşır
(`server/YesLojistik.Api/Controllers/AuthController.cs:66-189`); `CurrentUser` alanları
`id, fullName, email, role` (`client/src/api/types.ts:37-42`).

**Şifre.** `PasswordForm` mevcut + yeni + tekrar ister (`SettingsPage.tsx:330-357`); kural `strong` ile
**en az 8 karakter, harf ve rakam** (`239, 334`). Sunucu yanlış şifrede "Mevcut şifre hatalı." der
(`AuthController.cs:148`); başarıda **tüm oturumlar kapanır ve yeni jeton verilir** (`151-152`).

**Güvenlik (iki adımlı doğrulama).** `TwoFactorCard` (`client/src/components/SecurityCards.tsx:31`) QR
üretir, elle giriş anahtarını gösterir (`125-128`), açılışta **10 kurtarma kodu** verir (`80, 96`) ve
`kurtarma-kodlari.txt` indirtir (`100`); kapatmak şifre + kod ister (`109-115`). Şoförde "Şoför
hesaplarında iki adımlı doğrulama kullanılmaz." yazar (`46-50`).

**Bildirimler.** `NotificationPrefsCard` (`SettingsPage.tsx:582-603`) türleri
`GET /api/me/notification-preferences`'tan alır (`583`); uç `MeController`'dadır
(`server/YesLojistik.Api/Controllers/MeController.cs:44-53`), şoförde boş liste döner (`48`), kayıt
yoksa **rolün varsayılanı** kullanılır (`51`). Etiketler sunucudan gelir
(`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:15-24`). Her onay kutusu tek başına
kaydeder (`SettingsPage.tsx:595-596`).

**Görünüm.** Üst çubuktaki "Aa" düğmesi (`Layout.tsx:95`) `TextSizePicker`'ı açar (`189-217`); aynı
seçici kullanıcı menüsündedir (`330`). Tercih `yes.textSize`'ta saklanır (`textSize.ts:4`),
`<html data-text>`e yazılır (`13-16`), açılışta uygulanır (`main.tsx:18`); `index.css` tabanı 17,5px,
`lg` 19px, `xl` 21px yapar (`index.css:91-93`). `UiModePicker` (`Layout.tsx:220-234`) yalnız kullanıcı
menüsündedir (`331`); varsayılan `classic` (`uiMode.ts:8`), anahtar `yes.uiMode` (`9`), `<html data-ui>`
(`21`). **Kritik eksik:** `index.css` içinde `html[data-ui="new"]` seçicisi yok
(`01-ORTAK-SARTNAME.md:115-116`); o iş `29-GORSEL-SISTEM.md`'ye aittir.

**Tablo yazısı ve satır sıklığı yok.** Kodda `data-table-font` ya da `data-density` geçmez; `.td` dikey
dolgusu sabit `py-[7px]` (`index.css:120`); tablo ikinci satırı için tek kural `.td .text-sm` 0,78125rem
(`130-131`). Hedef değerler planda yazılıdır: sık modda `.td` dolgusu 7px → 4px
(`docs/KOLAYLASTIRMA-UYGULAMA.md:194`), düz yazıda sans yığını (`190-192`).

**Yeni menüde ulaşım ve erişilebilirlik.** `newNav` içindeki tek `/ayarlar` maddesi `perm: 'admin'`
taşır (`nav.ts:105-108`); klasik menüde aynı madde yetkisizdir (`62-63`). Bölüm sekmeleri `'yonetici'`
bölümünden gelir (`sections.ts:28-32`) ve `SectionTabs` yetkiye göre süzer (`SectionTabs.tsx:14`);
admin olmayanda `[Ayarlar, Veri Aktarımı]` kalır ve çizilir (`15`). Yani admin olmayan yeni görünümde
`/ayarlar`'a **adres çubuğundan** girebilir, menüden giremez. `Tabs` ayrıca düz `<button>` çizer;
`role` ve `aria-selected` yoktur (`ui.tsx:272-284`).

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────┐
│ Profilim                          Ahmet Yılmaz · Yönetici     │
│ Bilgilerim  Şifre  Güvenlik  Bildirimler  Görünüm             │
│ ┌ Bilgilerim ───────────────────────────────────────────────┐│
│ │ Ad Soyad   Ahmet Yılmaz      Rol  Yönetici                ││
│ │ E-posta    a***@ornek.com    Son giriş  03.10.2026 09:12   ││
│ │ [Bildirimlerimi yönet]  [Şifremi değiştir]  [Güvenlik]     ││
│ └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

- Başlık **"Profilim"** (yöneticide "Yönetici"), sağında ad + rol rozeti; sekme şeridi **5 madde** ve
  `Tabs` bileşeni `role="tablist"` kazanır.
- Kart genişlikleri bugünkü gibi `max-w-md` / `max-w-xl` / `max-w-2xl` kalır (`SettingsPage.tsx:348,
  588`; `SecurityCards.tsx:88`); üst kısım (başlık → ilk kart) **≤260px**
  (`01-ORTAK-SARTNAME.md:237`).
- Yer değişiklikleri: yönetici sekmeleri "Yönetici" altında toplanır ve admin olmayanda çizilmez;
  varsayılan sekme `bilgilerim` olur; seçiciler ortak bileşene taşınıp üç yerden kullanılır; sekme
  değişimi adrese yazılır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Bilgilerim · Ad Soyad / E-posta / Rol | salt okunur | — | `CurrentUser` alanları (`types.ts:37-42`), rol rozeti (`Layout.tsx:100`) | — |
| Şifre · Mevcut / Yeni / Tekrar + "Şifreyi Değiştir" | parola ×3 + düğme | evet | `POST /api/auth/change-password` (`SettingsPage.tsx:340`); başarıda oturumlar kapanır (`AuthController.cs:151`) | "Mevcut şifre hatalı." (`AuthController.cs:148`) |
| Güvenlik · "İki adımlı doğrulamayı aç" + 6 haneli kod | düğme + metin | kod evet | QR + elle anahtar (`SecurityCards.tsx:58-63`); `POST /api/auth/2fa/enable` (`67`) | "Kod hatalı" |
| Güvenlik · Kapatma (şifre + kod) | parola + metin | evet | `POST /api/auth/2fa/disable` (`SecurityCards.tsx:77`) | "İki adımlı doğrulama kapatıldı." |
| Bildirimler · onay kutuları | onay kutusu | hayır | Her değişiklikte `PUT /api/me/notification-preferences` (`SettingsPage.tsx:584, 596`) | "Bildirim tercihleri kaydedildi." |
| Görünüm · Yazı boyutu / Görünüm | radyo (3 / 2) | — | `yes.textSize` + `data-text` (`textSize.ts:24-27`); `yes.uiMode` + `data-ui` (`uiMode.ts:26-31`) | — |
| Görünüm · Tablo yazısı / Satır sıklığı | radyo (2 / 2) | — | Tırnaklı (varsayılan) / Düz → `data-table-font`; Rahat (varsayılan) / Sık → `data-density` | — |

Klavye: `Ctrl+Enter` kaydeder, `Esc` kapatır (`01-ORTAK-SARTNAME.md:72`); iki adımlı kod kutusu
`autoComplete="one-time-code"` taşır (`SecurityCards.tsx:112, 132`). Sekme şeridi `←`/`→` ile
gezinmeli, `Home`/`End` ilk/son sekmeye gitmelidir.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş / yükleniyor / hata.** Bildirim türü listesi boş dönerse (şoför) yalnız başlıklı kart çizilir;
  web'de şoför oturumu olmadığı için bu durum görünmez (`App.tsx:47`). Yüklemede `Loading` iskeleti,
  hatada `error`+`onRetry` kullanılır (`SettingsPage.tsx:586`, `SecurityCards.tsx:45`); şifre formu
  sunucu hatasını alan altına yazar (`344`). Hedef, 6 satırlık iskelet (`29-GORSEL-SISTEM.md`).
- **Yetkisiz.** `admin` yoksa yönetici sekmeleri hem listeden (`SettingsPage.tsx:33-36, 40`) hem
  içerikten (`46-71`) düşer; `?tab=company` ile gelinse de kart çizilmez. Yeni menüde menüden giriş
  yoktur (`nav.ts:106`).
- **Ayna.** `MirrorWriteGuard` müşteri, tedarikçi, araç, sevkiyat, gider, fatura ve benzeri kayıt
  yollarını korur (`MirrorWriteGuard.cs:14-18`). **`/api/auth` ve `/api/me` listede yoktur** → ayna
  açıkken şifre değiştirme, iki adımlı doğrulama ve bildirim tercihleri çalışır; yazma düğmeleri
  gizlenmez.
- **Lisans.** Salt okunur modda yalnız `GET`/`HEAD`/`OPTIONS` ile `/api/auth`, `/api/license`,
  `/api/admin` ve adı "export" içeren istekler serbesttir (`LicenseGuard.cs:16-20`). **Şifre değiştirme
  çalışır, bildirim tercihi kaydetme 403 alır** (`/api/me` listede yok).

## 6. Metinler ve terimler

Görünecek metinler: "Profilim", "Yönetici", "Bilgilerim", "Şifre", "Güvenlik", "Bildirimler",
"Görünüm", "Ad Soyad", "E-posta", "Rol", "Şifre Değiştir", "Mevcut Şifre", "Yeni Şifre",
"Yeni Şifre (tekrar)", "İki Adımlı Doğrulama", "Açık", "Kapalı", "İki adımlı doğrulamayı aç",
"Doğrula ve aç", "Kurtarma kodları", "Kodları güvenli bir yere kaydettim", "Bitti",
"Telefon Bildirimleri", "Yazı boyutu", "Normal", "Büyük", "Çok büyük", "Klasik", "Yeni (sade)",
"Tablo yazısı", "Tırnaklı", "Düz", "Satır sıklığı", "Rahat", "Sık".

Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` ile uyumlu olmalı; **ekranda "ayna",
"dry-run", "token", "endpoint" görünmez** (`01-ORTAK-SARTNAME.md:77, 241`). **Çelişki:** kod tam tersini
yapar — yönetici "Veriler" kartının başlığı "Pratikortam aynası", düğmeleri "Aynayı aç" / "Aynayı
kapat"tır (`SettingsPage.tsx:403, 413-414`); sadeleştirme `25-YONETICI.md`'de kapanmalıdır. Para `tl2()`
ile iki kuruş, tarih `03.10.2026` (`SecurityCards.tsx:108`).

## 7. Telefon davranışı (390×844)

- `/ayarlar` bugün `mobile.spec.ts:4` listesindedir; orada yatay taşma ölçülür. Hedefte de korunur:
  **gövdede yatay kaydırma yok**. Sekme şeridi 5 maddeye çıkınca tek satıra sığmaz → şerit
  `overflow-x-auto` ile kaydırılır (`SectionTabs.tsx:17` deseni); şerit kayar, sayfa kaymaz.
- Kartlar tek sütuna iner; katlanır bölüm kullanılmaz.
- Kullanıcı menüsü telefonda adı gizler (`Layout.tsx:323`); Profilim'de ad ve e-posta mutlaka görünür
  olmalıdır — kullanıcının kendi adını gördüğü tek yer orasıdır.
- Dokunma hedefleri: seçici düğmeler `min-h-11` ≈ 44px (`Layout.tsx:210, 227`); radyo grupları
  `role="radiogroup"` + `aria-label` taşır (`Layout.tsx:207, 224`).

## 8. Erişilebilirlik ve klavye

- **Düzeltilecek:** `Tabs` bugün `role` taşımıyor (`ui.tsx:272-284`). `role="tablist"`, her düğmede
  `role="tab"` + `aria-selected` + `aria-controls`, panelde `role="tabpanel"` olmalı
  (`SectionTabs.tsx:18, 22` doğru örnektir).
- Odak halkası 3px, `outline-offset: 2px` (`index.css:102-106`); dokunma hedefi ≥44px
  (`Layout.tsx:210`). `Field` etiketleri gerçek `<label>`, grup alanları `role="group"` +
  `aria-label` taşır (`ui.tsx:140-142`).
- Renk körlüğü: "Açık"/"Kapalı" hem rozet hem metinle verilir (`SecurityCards.tsx:89`); 2FA kapatma
  düğmesi `variant="danger"` ve "İki adımlı doğrulamayı kapat" yazar (`114`).
- QR görselinin `alt` metni vardır (`SecurityCards.tsx:125`); elle anahtar `aria-label="Elle giriş
  anahtarı"` (`128`), kurtarma kodları `aria-label="Kurtarma kodları"` taşır (`95`).

## 9. Testler (e2e + birim)

**Mevcut.** `client/e2e/security.spec.ts:49-119` iki adımlı doğrulamayı uçtan uca sınar: "Güvenlik"
sekmesi (`67`), QR (`69`), yanlış kod reddi (`73-75`), 10 kurtarma kodu (`80`), kurtarma koduyla giriş
(`103-109`). `workflow.spec.ts:203, 211, 306` `/ayarlar`'ı kullanır; `license.spec.ts:9`
`?tab=license`; `mobile.spec.ts:4` `/ayarlar`'da taşma ölçer; `new-ui/basics.spec.ts:20-25` yeni menü
adlarını birebir listeler.

**Eklenecek: `client/e2e/new-ui/profilim.spec.ts`** (`useNewUi`, `helpers.ts:44-46`), 6 test:
(1) admin olmayan kullanıcı `/ayarlar`'a girince Bilgilerim açık ve yönetici sekmeleri yok;
(2) `?tab=gorunum` adresi korunur, yenilemede aynı sekme açılır; (3) yazı boyutu "Büyük" →
`html[data-text="lg"]`, yenilemede kalır; (4) satır sıklığı "Sık" → `data-density="compact"`;
(5) tablo yazısı "Düz" → `data-table-font="sans"`; (6) yeni menüde "Profilim" maddesi admin olmayan
kullanıcıda da görünür ve 1 tıkla açılır.

`basics.spec.ts:23-25` beklenen menü listesi 6. testle aynı commit'te güncellenir. Yeni uç eklenirse
`server/YesLojistik.Tests` altında profil testi yazılır. **Test silme, atlama, skip yasak**
(`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`client/src/lib/prefs.ts` (yeni).** Dört tercihi tek modülde topla (yazı boyutu, görünüm, tablo
   yazısı, satır sıklığı) ve `<html>` niteliklerini uygula. *Süre: 3 saat.*
   Doğrulama: `cd client && npm run lint && npm run build`.
2. **`client/src/main.tsx:18-19`.** `applySavedPrefs()` çağrısı ekle. *Süre: 0,5 saat.*
   Doğrulama: `cd client && npm run build`.
3. **`client/src/index.css:120` civarı.** `html[data-density="compact"] .td { padding-block: 4px; }` ve
   `html[data-table-font="sans"] td { font-family: … }`. *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
4. **`SettingsPage.tsx:26-45`.** Sekme listesi iki gruba ayrılır; varsayılan
   `can('admin') ? 'company' : 'bilgilerim'`; başlık `can('admin') ? 'Ayarlar' : 'Profilim'`.
   *Süre: 3 saat.* Doğrulama: `npx playwright test e2e/security.spec.ts`.
5. **`SettingsPage.tsx:30-31, 45`.** Sekme seçimi adrese yazılır (`setSearchParams`, `replace: true`);
   varsayılan sekmede parametre yazılmaz. *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/workflow.spec.ts`.
6. **`SettingsPage.tsx` (yeni `ProfileInfoCard`).** Ad, e-posta, rol, son giriş ve diğer sekmelere
   kısayol düğmeleri. *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
7. **`SettingsPage.tsx` (yeni `AppearanceCard`).** Dört radyo grubu; `TextSizePicker` ve `UiModePicker`
   (`Layout.tsx:189-234`) ortak bileşene çıkarılır. *Süre: 4 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
8. **`client/src/lib/nav.ts:105-108`.** Admin olmayana da görünen "Profilim" maddesi eklenir; yönetici
   maddesi "Yönetici" olarak `perm: 'admin'` kalır. *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
9. **`client/src/lib/sections.ts:28-32` + `SectionTabs`.** Admin olmayan için bölüm sekmeleri
   sadeleştirilir ("Ayarlar · Veri Aktarımı" yerine "Profilim"). *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
10. **`client/e2e/new-ui/profilim.spec.ts` (yeni, 6 test).** §9 senaryoları; `basics.spec.ts:23-25` aynı
    commit'te güncellenir. *Süre: 4 saat.* Doğrulama:
    `npx playwright test e2e/new-ui/profilim.spec.ts e2e/security.spec.ts e2e/mobile.spec.ts`.
11. **(Koşullu) `MeController.cs:17`.** Ad/e-posta güncellemesi istenirse `PUT /api/me/profile`; mevcut
    sütunlar güncellendiği için **migration gerekmez** (`AGENTS.md` §3.7). *Süre: 3 saat.*
    Doğrulama: `cd server && dotnet test --filter ProfileTests`.

Toplam: **~29,5 saat (4 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası: testler →
commit → `git pull --rebase origin main` → `git push origin HEAD:main`. Doküman güncellemesi son adıma
dahildir (*1 saat*).

## 11. Kabul ölçütü

1. Admin olmayan kullanıcı `/ayarlar`'a girdiğinde açık sekme **Bilgilerim**, adres `?tab=bilgilerim`;
   "Firma Bilgileri", "Kullanıcılar", "Abonelik", "Veri ve hesap" **hiç görünmez**
   (`SettingsPage.tsx:33-36, 40`).
2. Yeni menüde admin olmayan kullanıcıda **1 "Profilim" maddesi** görünür ve **1 tıkla** açılır;
   bugünkü `perm: 'admin'` engeli kalkar (`nav.ts:106`). Profilim'de **5 sekme** vardır: Bilgilerim ·
   Şifre · Güvenlik · Bildirimler · Görünüm.
3. Yazı boyutu **3 seçenek** korunur; seçim `yes.textSize`'a yazılır, yenilemede `<html data-text>` aynı
   kalır ve `index.css:91-93` 17,5 / 19 / 21px değerlerini uygular (`AGENTS.md` §6). Görünüm **2
   seçenek**; `yes.uiMode` + `data-ui` yenilemede kalır (`basics.spec.ts:4-15` bozulmaz).
4. Satır sıklığı "Sık" seçilince `.td` dikey dolgusu **7px → 4px**; 1440×900 Sevkiyatlar listesinde
   görünen satır sayısı **en az 3 artar** ve **12'nin altına düşmez** (`01-ORTAK-SARTNAME.md:236`).
   Tablo yazısı "Düz" seçilince `td` sans yığınıyla çizilir; "Tırnaklı" **varsayılandır**
   (`KOLAYLASTIRMA-UYGULAMA.md:192`).
5. 1440×900'de başlıktan ilk karta mesafe **≤260px**; 5 sekme tek satırda, kaydırma yok.
6. 390×844'te **yatay kaydırma yok** (`mobile.spec.ts:4`); sekme şeridi kendi içinde kayar.
7. Sekme şeridi `role="tablist"`, etkin sekme `aria-selected="true"` taşır (bugün `ui.tsx:272`'de yok).
8. Mevcut e2e (security, workflow, license, mobile, new-ui/basics) **yeşil** + **6 yeni** test;
   hiçbir test silinmez/atlanmaz. Profilim metinlerinde "ayna", "token", "endpoint" geçmez;
   `cd client && npm run lint && npm run build` temizdir.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sekme adı/konumu değişince mevcut testler kırılır | "Güvenlik" ve yönetici sekme adları korunur; testler aynı commit'te güncellenir | `SettingsPage.tsx:32-41` eski hâline döner |
| `?tab=` iki yönlü yazımı döngü yapar | Tek `setSearchParams(replace: true)`; varsayılan sekmede parametre yazılmaz | Adres yazımı geri alınır |
| `data-density` tüm tabloları etkiler, 12 satır ölçütü kayar | Yalnız `.td` dikey dolgusu değişir; ölçüm yeniden yapılır | Kural silinir, `py-[7px]` kalır |
| Yazı boyutu ayarı bozulur (`AGENTS.md` §6 ihlali) | `textSize.ts` ve `Layout.tsx:95, 189-217` davranışı değişmez, yalnız ortak bileşene taşınır | Seçici `Layout.tsx` içindeki yerel hâline döner |
| Admin olmayana menü açılınca yönetici içeriği sızar | Sayfa içi `can('admin')` koşulları korunur (`SettingsPage.tsx:33-36, 40`) + 1. e2e testi | `nav.ts:106` eski hâline döner |

## 13. Doğrulanacaklar

1. **Bilgilerim düzenlenebilir mi?** Ad/e-posta güncelleyen uç yoktur; `MeController` yalnız bildirim
   tercihlerini ve bildirim adresini yönetir (`MeController.cs:22, 44, 57`). (a) salt okunur gösterim +
   "yöneticinize söyleyin" mi, (b) yeni `PUT /api/me/profile` mu (10. adım 11)?
2. **E-posta değişirse** giriş adı ve açık oturumlar ne olur? Şifre değişiminde tüm oturumlar kapanıp
   yeni jeton veriliyor (`AuthController.cs:151-152`); aynı kural uygulanacak mı?
3. **Salt okunur lisansta bildirim tercihi** kaydedilememesi (403, `LicenseGuard.cs:16-20`) kabul
   edilebilir mi, yoksa `/api/me` serbest listeye alınmalı mı?
4. **Tablo yazısı "Düz"** için yeni paket (`@fontsource-variable/source-sans-3`,
   `KOLAYLASTIRMA-UYGULAMA.md:191`) eklenebilir mi, yoksa sistem sans yığını mı kullanılmalı? **Satır
   sıklığı** yalnız tabloları mı etkiler, kart ve form satırlarını da mı?
5. **Klasik görünüm** ne zaman kaldırılır? Plan `DEFAULT_UI_MODE = 'new'` ve klasik görünümün
   Profilim'de "Klasik görünüm (eski)" olarak **2 hafta** kalmasını söyler
   (`KOLAYLASTIRMA-UYGULAMA.md:405`); bugün varsayılan `classic` (`uiMode.ts:8`).
6. **Bölüm adı:** `sections.ts:28-32` içindeki `'yonetici'` bölümü admin olmayana "Ayarlar" ve
   "Veri Aktarımı" sekmelerini gösteriyor; admin olmayanda bölüm adı "Profilim" mi olmalı?
7. **Yönetici kartındaki "Pratikortam aynası" metni** (`SettingsPage.tsx:403, 413-414`) belge
   kurallarıyla çelişiyor (`01-ORTAK-SARTNAME.md:77`); hangi yeni terim kullanılacak?
8. **Atıflar.** `25-YONETICI.md`, `27-TELEFON.md`, `28-ORTAK-PARCALAR.md`, `29-GORSEL-SISTEM.md`,
   `31-TEST-CI.md` ve `32-TERMINOLOJI.md` **henüz yazılmamıştır**; `PageShell` ve `DetailDrawer` kodda
   yoktur (`01-ORTAK-SARTNAME.md:143-144`), bu belge onlara yalnız atıf yapar.

Sonraki belgeyle bağlantı: `25-YONETICI.md` aynı `/ayarlar` sayfasının yönetici yarısını ve "Pratikortam
aynası" metninin sadeleştirmesini devralır; `29-GORSEL-SISTEM.md` `html[data-ui="new"]` jetonlarını,
`data-table-font` ve `data-density` kurallarının görsel karşılığını tanımlar; `27-TELEFON.md` 5 sekmeli
şeridin 390×844 davranışını, `28-ORTAK-PARCALAR.md` ise `Tabs` bileşeninin `role="tablist"`
sözleşmesini yazar.
