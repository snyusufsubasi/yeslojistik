# 31 — Ayarlar ve Şirket Kurulumu

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, bugün tek bir "Firma Bilgileri" formuna sıkışmış olan bütün kurulum bilgisini **şirket
kurulumunun tek merkezine** çevirir. Bugün şirket bilgileri, fatura numarası ayarı, KDV varsayılanları,
e-belge ayarları, bildirim anahtarları, kullanıcılar, yedekleme ve deneme verisi temizliği **tek bir
ekranda on sekmeye** dağılmıştır (`client/src/pages/SettingsPage.tsx:26-41`). Bu yapı çalışıyor ama
Luca sınıfı bir ERP'nin istediği şirket kurulumunu taşımıyor. Kapsam:

- Şirket künyesinin (ünvan, VKN, vergi dairesi, MERSİS, ticaret sicil, adres, logo, IBAN) tek yerde
  toplanması ve **çok şirketli** yapıya (`05-VERI-MODELI.md`) hazırlanması.
- **Mali yıl ve dönem** tanımı, açılış tarihi, dönem kilidiyle bağlantı (`07-YETKI-ONAY-NUMARALANDIRMA.md`).
- **Para birimi ve kur kaynağı** seçimi (`05-VERI-MODELI.md` §6.1'deki `Currency`/`ExchangeRate`).
- **Hesap planı şablonu** seçimi (hangi hazır plan yüklenecek; ağaç `06-MUHASEBE-MOTORU.md`).
- **Belge serileri ve numaralandırma**: bugün `CompanySettings` içindeki tek sayaç, seri tablosuna taşınır.
- **KDV/tevkifat varsayılanları** (`docs/KDV-KURALLARI.md` uyumu), **e-belge ayarları**, banka/kasa/depo
  tanımları, kullanıcılar ve roller, bildirim ayarları, yedekleme ve **otomatik firma kurulumu**.
- **Ayarların denetim izi**: bugünkü otomatik alan izleme korunur, "karar olayları" ayrı satır yazılır.

Kapsam dışı: hesap planının kendisi (`06-MUHASEBE-MOTORU.md`), dönem kilidinin iş kuralları
(`07-YETKI-ONAY-NUMARALANDIRMA.md`), e-belge gönderimi (`08-E-BELGE-KATMANI.md`), Excel aktarımı
(`32-VERI-GOCU-EXCEL-AKTARIM.md`), bildirim şablonları (`33-BILDIRIM-EPOSTA-SMS-KEP.md`), paket ve
modül lisansı (`34-LISANS-ABONELIK-KONTOR.md`).

Bu modül şu üç soruyu net cevaplar: (1) Yeni bir müşteri kaç dakikada çalışır hâle gelir? (2) Bir ayar
değiştiğinde hangi belgeler etkilenir, hangileri etkilenmez? (3) Kim, hangi ayarı, ne zaman değiştirdi?

## 2. Luca'daki karşılığı

Luca Net'in (KOBİ) tanıtım sayfasında **"otomatik firma kurulumu"** bir özellik olarak açıkça yazılıdır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:27`). Koza tarafında ise **çok depo**, **iş merkezi tanımı**, **"işletmeye
özel hareket tanımlama"**, **farklı döviz cinslerinden fatura** ve **işletmeye göre fatura tipi
tanımlama** maddeleri vardır (`docs/plan-erp/02-LUCA-ENVANTERI.md:48-62`). Luca Mali Müşavir tarafında
bir de "Kayıt Aktarımı" sayfası listelenmiştir (`docs/plan-erp/02-LUCA-ENVANTERI.md:15`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> ve
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

Bu dokümanın Luca'dan aldığı **fikir** şudur: firma kurulumu bir sihirbazla, sırayla ve eksiksiz
yapılmalıdır; ayarlar tek bir "diğer" ekranına gömülü olmamalıdır. Luca'nın ekranlarının **birebir
yerleşimi kopyalanmaz** (bkz. `docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md`).

**doğrulanacak:** Luca Net'te "otomatik firma kurulumu" tam olarak neyi otomatik yapıyor (kaç adım,
hangi alanlar zorunlu, mali yıl ve hesap planı orada mı seçiliyor) — kaynak: Luca kullanım kılavuzu
veya bayi demosu. **doğrulanacak:** Luca'da çok şirketli yapıda her şirketin kendi hesap planı, kendi
fatura serisi ve kendi mali yılı mı oluyor — kaynak: Luca kullanım kılavuzu. **doğrulanacak:** TCMB kur
kaynağının kullanım koşulları, hangi kur türünün (döviz alış/satış, efektif) esas alındığı — kaynak:
TCMB yayınları ve mali müşavir. **doğrulanacak:** hazır hesap planı şablonlarının (tekdüzen hesap planı
ve sektör şablonları) güncel hâli ve kullanım hakkı — kaynak: mali müşavir.

## 3. Bizde bugün

**Şirket künyesi.** Tek satırlık `CompanySettings` tablosu bütün künyeyi taşır: firma adı, slogan,
VKN, vergi dairesi, adres, il/ilçe, telefon, e-posta, IBAN, MERSİS no, ticaret sicil no, web sitesi ve
logo (`server/YesLojistik.Core/Entities/CompanySettings.cs:5-19`). Kayıt `Id = 1` varsayılanıyla tek
satırdır (`server/YesLojistik.Core/Entities/CompanySettings.cs:5`). Okuma ucu
`GET /api/settings` herkese açıktır; yazma ucu `PUT /api/settings` yalnız yöneticidir
(`server/YesLojistik.Api/Controllers/SettingsController.cs:16-17`, `:27-28`).

**Ekran.** Ayarlar sayfası on sekmeye ayrılmıştır: Firma Bilgileri, Kullanıcılar, Fatura Notları, İşlem
Geçmişi, Veriler, Abonelik (yalnız yönetici), Telefon Bildirimleri, Şifre Değiştir, Güvenlik, Veri ve
hesap (`client/src/pages/SettingsPage.tsx:32-41`). Firma formu alan alan şöyledir: Firma Adı
(`:138`), Slogan (`:139`), VKN (`:140`), Vergi Dairesi (`:141`), Telefon (`:142`), E-posta (`:143`),
İl (`:144`), İlçe (`:145`), Adres (`:146`), MERSİS No (`:147`), Ticaret Sicil No (`:148`), Web Sitesi
(`:149`), IBAN (`:150`) ve Logo (`:151-162`). Logo tarayıcıda okunup **data URL** olarak saklanır;
PNG/JPEG ve en çok 500 KB kabul edilir (`client/src/pages/SettingsPage.tsx:123-132`). Aynı kural
kurulum sihirbazında da vardır (`client/src/pages/OnboardingPage.tsx:142-151`).

**Doğrulama.** İstemci tarafı şema VKN'yi 10 (VKN) ya da 11 (TCKN) hane ile sınırlar
(`client/src/pages/SettingsPage.tsx:79`), MERSİS no 16 hane (`:101`), IBAN serbest metindir (`:84`).
Sunucu tarafı ek kural: e-Fatura açıkken VKN, vergi dairesi ve **il** zorunludur
(`server/YesLojistik.Api/Controllers/SettingsController.cs:61-62`).

**Numaralandırma (kritik eksik).** Satış faturası numarası firma ayarının iki alanından üretilir:
`InvoicePrefix` (varsayılan `F`) ve `NextInvoiceNumber` (varsayılan `1`)
(`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`). Üretim tek bir atomik SQL ifadesidir ve
satır **sabit `id = 1`** ile kilitlenir:

```sql
UPDATE company_settings SET next_invoice_number = next_invoice_number + 1
WHERE id = 1 RETURNING invoice_prefix AS "Prefix", next_invoice_number - 1 AS "Number"
```

Bu ifade `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:221-228` içindedir ve biçim
`{Prefix}-{Number:D6}` olarak kurulur (`:227`). Yani bugün **tek şirket, tek fatura serisi, yıl
sıfırlaması yok** vardır. İkinci bir sayaç e-belge tarafındadır: `EInvoiceSequence`
(`server/YesLojistik.Core/Entities/Invoice.cs:56-61`), `EInvoiceSeriesPrefix`/`EArchiveSeriesPrefix`
(`server/YesLojistik.Core/Entities/CompanySettings.cs:46-47`) ve
`INSERT ... ON CONFLICT DO UPDATE` deseni (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:39-47`).
İki üretici farklı biçim üretir: `F-000001` ve `YES2026000000001`. İrsaliye, çek, senet ve yevmiye fişi
için **numara üreticisi yoktur**; irsaliye no elle girilir (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:39`).

**Mali yıl, dönem, para birimi, kur: kodda yoktur.** `FiscalYear`, `AccountingPeriod`, `PeriodLock`
terimleri repoda hiç geçmez; para birimi iki yerde **sabit**tir: UBL-TR üretiminde `TRY`
(`server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:19`) ve biçimlendirmede `" TL"`
(`server/YesLojistik.Core/Domain/Formatters.cs:32`). `Currency`/`ExchangeRate` tabloları planlanmıştır
ama henüz yoktur (`docs/plan-erp/05-VERI-MODELI.md:180-188`, `docs/plan-erp/06-MUHASEBE-MOTORU.md:90`).

**KDV/tevkifat varsayılanları.** `DefaultVatRate` (20), `DefaultWithholdingTenths` (2/10) ve
`DefaultPaymentTermDays` (30) firma satırındadır
(`server/YesLojistik.Core/Entities/CompanySettings.cs:22-24`) ve panelde düzenlenir
(`client/src/pages/SettingsPage.tsx:170-176`). Kurallar `docs/KDV-KURALLARI.md:9-19` ile sabittir.

**E-belge ayarları.** `EInvoiceEnabled`, `EInvoiceSeriesPrefix`, `EArchiveSeriesPrefix`,
`DefaultScenario`, `SenderAlias` (`server/YesLojistik.Core/Entities/CompanySettings.cs:44-51`); panelde
kutular ve üç karakterlik seri önekleri (`client/src/pages/SettingsPage.tsx:178-196`). Bağlı sağlayıcı
adı ve gönderebilme durumu ayrı bir uçtan okunur (`client/src/pages/SettingsPage.tsx:606-614`).

**Kullanıcılar ve roller.** Dört yerleşik rol vardır: `Admin, Operations, Accounting, Driver`
(`server/YesLojistik.Core/Entities/Enums.cs:3`). Kullanıcı uçlarının tamamı yöneticidir
(`server/YesLojistik.Api/Controllers/UsersController.cs:16`, `:26`, `:36`, `:49`, `:57`, `:69`, `:83`).
**Kullanıcı sayısı sınırı yoktur** ve kullanıcı bazlı özel yetki de yoktur
(`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:222-223`).

**Bildirim ayarları.** Firma düzeyinde tek anahtar "Sabah uyarı özeti"dir
(`client/src/pages/SettingsPage.tsx:205-211`, alan `CompanySettings.DailyDigestEnabled`:
`server/YesLojistik.Core/Entities/CompanySettings.cs:28`). Kişisel bildirim tercihleri Ayarlar →
Telefon Bildirimleri sekmesindedir (`client/src/pages/SettingsPage.tsx:582-603`) ve
`GET/PUT /api/me/notification-preferences` uçlarını kullanır
(`server/YesLojistik.Api/Controllers/MeController.cs:44`, `:57`). SMTP ayarlı değilse panelde sarı uyarı
çıkar (`client/src/pages/SettingsPage.tsx:200-204`); SMTP ayarı ortam değişkeninden okunur
(`server/YesLojistik.Api/Program.cs:41-42`, `deploy/customer-compose.yml:48-52`).

**Yedekleme.** Panelden iki düğme ile yedek inilir: tam yedek ve dosyasız yedek
(`client/src/pages/SettingsPage.tsx:511-512`); uçlar `GET /api/admin/backup?files=...`
(`server/YesLojistik.Api/Controllers/AdminController.cs:37-50`), geri yükleme
`POST /api/admin/restore` ve yalnız `Backup:AllowRestore=true` iken açıktır
(`server/YesLojistik.Api/Controllers/AdminController.cs:62-70`). Sayım ve doluluk bilgisi
`GET /api/admin/stats` (`:52-57`), veritabanı boyutu `pg_database_size` ile ölçülür
(`server/YesLojistik.Infrastructure/Services/BackupService.cs:81`). Dosya adı deseni
`yeslojistik-yyyyMMdd-HHmm.dump` (`server/YesLojistik.Api/Controllers/AdminController.cs:42`).
Otomatik gece yedeği müşteri konteynerindedir (`deploy/customer-compose.yml:76-93`) ve saklama süresi
`BACKUP_KEEP_DAYS` ile verilir (varsayılan 30, `docs/MUSTERI-KURULUM.md:163`).

**Kurulum sihirbazı (Firma kurulumunun çekirdeği).** Beş adımlıdır: Firma bilgileri, Fatura ve KDV
varsayılanları, Verileri getir, İlk kullanıcılar, Başlayın
(`client/src/pages/OnboardingPage.tsx:22-29`). Her adım **atlanabilir**, kaldığı yer tarayıcı
depolamasında tutulur (`client/src/pages/OnboardingPage.tsx:35`, `:42`, `:57-60`) ve tamamlanma veriden
anlaşılır (`:43-49`). Sunucu tarafı yalnız örnek veri yükleme ucudur
(`server/YesLojistik.Api/Controllers/OnboardingController.cs:21-44`); zorunlu adım yoktur, alan
zorlaması yoktur. Canlıya geçiş kontrol listesi Ayarlar → Veriler içindedir ve yedi maddeden oluşur
(`client/src/pages/SettingsPage.tsx:547-558`). Ayrıca "Taşınma kontrolü" kartı iki sunucunun sayımını
karşılaştırır (`client/src/pages/SettingsPage.tsx:623-676`).

**Denetim izi.** `AuditLog` kaydı `SaveChanges` sırasında otomatik üretilir; `CompanySettings` izlenen
iki türden biridir (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56`). Alan adları Türkçeye
çevrilir — `NextInvoiceNumber` → "Sıradaki fatura no", `EInvoiceSeriesPrefix` → "e-Fatura seri"
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:31`, `:42`). Gizli alanlar (logo data URL'i,
lisans anahtarı) bilinçli olarak dışlanır (`:18`). Panelde "Kayıtlar 2 yıl saklanır" notuyla gösterilir
(`client/src/pages/SettingsPage.tsx:54`).

**Eksik listesi (kanıtlı):** mali yıl/dönem kavramı yok (`docs/plan-erp/06-MUHASEBE-MOTORU.md:89`);
para birimi ve kur yok, değer sabit `TRY`/`TL` (`server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:19`,
`server/YesLojistik.Core/Domain/Formatters.cs:32`); hesap planı seçimi yok (`docs/plan-erp/05-VERI-MODELI.md:192`
tablo yalnız plandadır); belge serisi tablosu yok, tek sayaç `id = 1`
(`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:221-228`); banka hesabı tanımı
`CashAccount` ile vardır ama IBAN/SWIFT alanları yoktur (`docs/plan-erp/05-VERI-MODELI.md:357`); depo
tanımı yoktur (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içinde `Warehouse`
**yoktur**); sihirbazda zorunlu alan ve **onay adımı** yoktur
(`client/src/pages/OnboardingPage.tsx:57-60`); yedekten **zamanlanmış** geri yükleme provası yoktur.

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md` §3 ortak parçalarını yeniden kullanır:
`PageHeader`, `Card`, `Field`, `Button`, `Tabs` (`client/src/components/ui.tsx`), `DataTable`
(`client/src/components/DataTable.tsx:66`), `MobileCards` (`client/src/components/shell/MobileCards.tsx`),
`Modal` (`client/src/components/ui.tsx:156`), `SumStrip` (`client/src/components/SumStrip.tsx:12`),
`PageShell` (`client/src/components/shell/PageShell.tsx:28`). Yeni görsel dil icat edilmez; klasik
görünüm varsayılan kalır (`client/src/lib/uiMode.ts:8`).

### 4.1 Ekran: Şirket Künyesi (`/ayarlar?tab=company`)

Mevcut sekme korunur, **ikiye bölünür**: "Künye" ve "Resmî bilgiler". Bugünkü alanlara ek olarak:

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Ünvan | metin (200) | Evet | Bugünkü `companyName`; fatura ve PDF başlığı |
| Kısa ad | metin (40) | Hayır | Menü ve yazışmada kullanılır |
| VKN/TCKN | metin (10/11, rakam) | Koşullu | Bugünkü kural: e-Fatura açıksa zorunlu (`SettingsController.cs:61-62`) |
| Vergi dairesi | metin (60) | Koşullu | Aynı kural |
| MERSİS no | metin (16, rakam) | Hayır | Bugünkü kural (`SettingsPage.tsx:101`) |
| Ticaret sicil no | metin (30) | Hayır | Bugünkü alan |
| İl / İlçe | seçim / metin | Koşullu | İl `CitySelect` ile (`client/src/components/CitySelect.tsx`) |
| Adres | metin (300) | Evet | Fatura ve sevk belgesi |
| IBAN | metin (34) | Hayır | Bugünkü kural: serbest metin; hedefte IBAN doğrulaması |
| Logo | dosya (PNG/JPEG ≤ 500 KB) | Hayır | Bugünkü kural aynen korunur |
| KEP adresi | metin | Hayır | `33-BILDIRIM-EPOSTA-SMS-KEP.md` ile gelir |

### 4.2 Ekran: Mali Yıl ve Dönemler (`/ayarlar?tab=periods`)

Dönem kilidi ekranı `07-YETKI-ONAY-NUMARALANDIRMA.md` §4.3'te tanımlıdır; bu doküman yalnız **mali yıl**
tanımını ekler.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Mali yıl başlangıcı | tarih | Evet | Varsayılan 1 Ocak; değiştirilirse **yeni yıldan** geçerli |
| Mali yıl bitişi | tarih | Evet | Başlangıçtan türetilir (12 ay) |
| Devir tarihi | tarih | Evet | `Customer.OpeningBalance` bu tarihe yazılır |
| İlk dönem | seçim | Evet | Devirden sonraki ilk ay/çeyrek/yıl |
| Dönem uzunluğu | seçim | Evet | Aylık / üç aylık / yıllık |

### 4.3 Ekran: Para Birimleri ve Kur (`/ayarlar?tab=currencies`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Firma para birimi | seçim | Evet | Tek `IsBase = true` satır (`05-VERI-MODELI.md:180-182`) |
| Kullanılan dövizler | çoklu seçim | Hayır | Boş = yalnız TL |
| Kur kaynağı | seçim | Evet | `TCMB` / `Manuel` (`05-VERI-MODELI.md:185-188`) |
| Kur getirme saati | saat | Koşullu | TCMB seçiliyse; günlük iş kuyruğuna yazılır |
| Elle kur girişi | tutar (6 basamak) | Koşullu | Manuel seçiliyse; değişiklik denetim izine girer |
| Kur yoksa davranış | seçim | Evet | `Kaydı engelle` / `Son bilinen kuru kullan` |

### 4.4 Ekran: Hesap Planı Şablonu (`/ayarlar?tab=chart`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Şablon | seçim | Evet | `Tekdüzen (genel)`, `Nakliye`, `Boş` |
| Şablon sürümü | salt okunur | Evet | Yüklenen şablonun sürümü kayda geçer |
| Yükleme kapsamı | seçim | Evet | `Yalnız eksikleri ekle` (varsayılan) / `Tümünü yeniden kur` |
| Önizleme | tablo | — | Eklenecek hesap sayısı ve kod çakışmaları |

Kural: **hiçbir hesap silinmez.** Yeniden kurulum yalnız eksik hesap ekler; var olan hesabın kodu ve
adı korunur. Gerekçe: fişler hesap kimliğine bağlıdır, silme geçmişi bozar
(`docs/plan-erp/05-VERI-MODELI.md:198-199`).

### 4.5 Ekran: Belge Serileri (`/ayarlar?tab=series`)

`07-YETKI-ONAY-NUMARALANDIRMA.md` §4.4 ekranını **aynı tanımla** kullanır; bu doküman yalnız **geçiş
işini** üstlenir: `CompanySettings.InvoicePrefix`/`NextInvoiceNumber`
(`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`), `EInvoiceSeriesPrefix`/`EArchiveSeriesPrefix`
(`:46-47`) ve `EInvoiceSequence` (`server/YesLojistik.Core/Entities/Invoice.cs:56-61`) değerleri
`DocumentSeries` tablosuna **okunur ve çift yazılır** (`docs/plan-erp/05-VERI-MODELI.md:256-264`).

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Belge türü | seçim | Evet | `SalesInvoice`, `EInvoice`, `EArchive`, `Waybill`, `JournalEntry`, `Check`, `Note` |
| Seri | metin (3, büyük harf) | Evet | Bugünkü kural `^[A-Za-z0-9]{3}$` (`server/YesLojistik.Core/Validation/Validators.cs:378`) |
| Yıl | sayı | Hayır | Boş = yıl sıfırlaması yok (bugünkü satış faturası davranışı) |
| Sıradaki numara | sayı (> 0) | Evet | Bugünkü kural (`server/YesLojistik.Core/Validation/Validators.cs:381`) |
| Basamak | seçim | Evet | 6 (satış) / 9 (e-belge) |
| Boşluk politikası | seçim | Evet | `Boşluksuz` (bugün) / `İptalde boşluk bırak` |
| Kullanımda | onay kutusu | Hayır | Kapatılırsa yeni belge bu seriyi kullanmaz |

### 4.6 Ekran: Banka, Kasa ve Depo Tanımları (`/ayarlar?tab=accounts`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Hesap adı | metin (80) | Evet | Bugünkü `CashAccount` alanı |
| Tür | seçim | Evet | `Kasa`, `Banka`, `POS`, `Kredi Kartı` |
| IBAN / SWIFT | metin | Banka için evet | `BankAccount` tablosuna yazılır (`docs/plan-erp/05-VERI-MODELI.md:357`) |
| Para birimi | seçim | Evet | Firma para birimi varsayılan |
| Muhasebe hesabı | seçim | Hayır | Kasa/banka hesabı ↔ hesap planı bağı |
| Yazar kasa | onay kutusu | Hayır | Bugünkü `IsCashRegister` alanı |
| Depo kodu/adı | metin | Evet (depo için) | Ekleme: yeni tablo `Warehouse` (`05-VERI-MODELI.md:294`) |

### 4.7 Ekran: Kullanıcılar ve Kullanıcı Sayısı (`/ayarlar?tab=users`)

Mevcut liste korunur (`client/src/pages/SettingsPage.tsx:241-284`). Eklenenler:

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kullanıcı sayısı kullanımı | salt okunur | — | `etkin kullanıcı / paket sınırı`; sınır `34-LISANS-ABONELIK-KONTOR.md` |
| Kullanıcı tipi | seçim | Evet | `Ofis` (eşzamanlı) / `Şoför` (sayılmaz) |
| Eşzamanlı oturum sınırı | sayı | Hayır | Boş = sınırsız; doluysa yeni giriş eski oturumu düşürür |
| Son giriş / oturum sayısı | salt okunur | — | Bugünkü `Son giriş` sütunu genişletilir (`:257`) |

### 4.8 Ekran: Ayarlar Denetim İzi (`/ayarlar?tab=audit`)

Bugünkü "İşlem Geçmişi" sekmesi (`client/src/pages/SettingsPage.tsx:52-57`) altına **karar olayları**
süzgeci eklenir: `SettingsChanged`, `PeriodLocked`, `PeriodUnlocked`, `NumberSeriesChanged`,
`LicenseApplied`, `BackupRestored`. Sütunlar: tarih, kullanıcı, olay, hedef, eski → yeni değer, gerekçe.

### 4.9 Kurulum Sihirbazı (otomatik firma kurulumu)

Bugünkü beş adım (`client/src/pages/OnboardingPage.tsx:22-29`) **yedi adıma** çıkar ve her adım
zorunluluk taşır:

1. **Firma** (bugünkü `CompanyStep`) — ünvan, VKN, vergi dairesi, adres, il, logo.
2. **Mali yıl ve para birimi** — yeni; mali yıl başlangıcı, firma para birimi, kur kaynağı.
3. **Fatura ve KDV** (bugünkü `InvoiceStep`) — seri, sıradaki numara, KDV, tevkifat, vade.
4. **Hesap planı** — yeni; şablon seçimi ve önizleme.
5. **Veriler** (bugünkü `DataStep`) — `32-VERI-GOCU-EXCEL-AKTARIM.md` sihirbazı.
6. **Kullanıcılar** (bugünkü `UsersStep`) — roller ve davet.
7. **Kontrol ve başla** (bugünkü `StartStep` + `GoLiveCard`) — yedi maddelik canlıya geçiş listesi
   (`client/src/pages/SettingsPage.tsx:547-558`) ve **özet onay ekranı**.

Kurallar: (a) her adım yine **atlanabilir**, ancak atlanan zorunlu adım özet ekranında kırmızı görünür;
(b) sihirbaz hiçbir adımda mevcut veriyi silmez; (c) sunucu tarafı her adım için ayrı uç ve doğrulama
sağlar; (d) sihirbaz ilerlemesi tarayıcı depolamasından **sunucuya** taşınır (`OnboardingState`
tablosu), böylece başka bilgisayardan devam edilebilir.

## 5. İş kuralları

1. **Tek kaynak kuralı.** Şirket künyesinin tek kaynağı `CompanySettings` (hedefte `Company`) satırıdır;
   panel, PDF, e-posta ve takip sayfası aynı satırdan okur. Bugün bu böyledir
   (`client/src/pages/SettingsPage.tsx:108`) ve korunur; ayrı bir "yazışma bilgisi" tablosu açılmaz.
2. **Numara geriye alınamaz.** Bugünkü kural korunur: sıradaki numara, seri öneki değişmeden geriye
   çekilemez (`server/YesLojistik.Api/Controllers/SettingsController.cs:32-33`). Hata metni:
   `"Sıradaki fatura numarası geriye alınamaz (numara çakışması olur)."`
3. **Seri değişimi.** Seri değiştirildiğinde eski seri **kapatılır** (silinmez, pasife alınır); yeni seri
   kendi sırasından başlar. Geçmiş belgeler eski seriye bağlı kalır.
4. **Numara boşluğu.** Varsayılan `Boşluksuz`: numara transaction içinde alınır, geri alma olursa
   numara da geri alınır. Bugünkü davranış korunur
   (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:217-220`).
5. **e-Fatura ön koşulu.** `EInvoiceEnabled` açılırken VKN, vergi dairesi ve il zorunludur
   (`server/YesLojistik.Api/Controllers/SettingsController.cs:61-62`); ayrıca KDV varsayılanı ve
   tevkifat varsayılanı **dolu olmalıdır**; eksikse kayıt reddedilir ve panel ilgili sekmeye yönlendirir.
6. **KDV/tevkifat varsayılanı belgeyi değiştirmez.** Varsayılan yalnız **yeni** belgeye uygulanır;
   mevcut fatura, gider ve sevkiyatların oranları değişmez (`docs/KDV-KURULARI.md` ruhu:
   `docs/KDV-KURALLARI.md:36-38`). Bu kural testle kilitlenir (§10).
7. **Para birimi değişimi.** Firma para birimi, **hiç kayıt yokken** serbestçe değişir. Kayıt varsa
   değişiklik yalnız yönetici + gerekçe ile yapılır ve denetim izine `SettingsChanged` olarak yazılır.
   Gerekçe: geçmiş tutarlar TL kabul edilmiştir; sonradan çevirmek bakiyeleri bozar.
8. **Kur kaynağı.** `TCMB` seçiliyse kur günde bir kez çekilir ve `ExchangeRate` tablosuna **eklenir**
   (üzerine yazılmaz); manuel kur girilirse kaynak `Manuel` olur. Kur günü çekilemezse davranış §4.3'teki
   ayardan okunur. **doğrulanacak:** TCMB kur yayın saatleri ve kullanım koşulları.
9. **Mali yıl değişimi.** Mali yıl başlangıcı yalnız **hiç dönem kapanmamışken** değişir. Bir dönem
   kapandıysa değişiklik reddedilir ve hata metni hangi dönemin kapalı olduğunu söyler.
10. **Dönem ve devir.** Devir tarihi kilitli döneme düşemez; düşerse kayıt reddedilir
    (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:389-391` ile aynı kural).
11. **Hesap planı koruması.** Şablon yükleme yalnız hesap **ekler**; var olan hesabı silmez, kodunu
    değiştirmez. Fişi olan hesap pasife alınabilir, silinemez (`docs/plan-erp/05-VERI-MODELI.md:198-199`).
12. **Kullanıcı sayısı.** Paket sınırı dolduğunda yeni **ofis** kullanıcısı açılamaz; şoför hesabı
    sayılmaz. Hata metni sade Türkçe olur ve paketi yükseltme yolunu söyler
    (`34-LISANS-ABONELIK-KONTOR.md`). Var olan kullanıcılar **silinmez** ve çalışmaya devam eder.
13. **Ayna ve lisans üstünlüğü.** Sıra korunur: kimlik → yetki → ayna → lisans
    (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:343-347`). Ayna açıkken ayar ekranından **kayıt
    akışını** etkileyen alanlar (seri, varsayılanlar) salt okunur gösterilir; künye ve bildirim ayarı
    yazılabilir kalır, çünkü ayna senkronu bunları kullanmaz.
14. **Deneme verisi temizliği.** Bugünkü `reset-data` akışı korunur: onay için ekrana `SİL` yazılır
    (`client/src/pages/SettingsPage.tsx:488-493`), sunucu aynı kontrolü tekrarlar
    (`server/YesLojistik.Api/Controllers/SettingsController.cs:74-75`) ve fatura numarası 1'e döner
    (`server/YesLojistik.Infrastructure/Services/DataResetService.cs:52`). Yeni seri tablosu geldiğinde
    **seri sayaçları da sıfırlanır**; bu davranış testle kilitlenir.
15. **Yedek öncesi onay.** Canlı veriyi değiştiren hiçbir ayar işlemi (geri yükleme, dönem kilidi,
    şablon yükleme) kullanıcı onayı olmadan çalışmaz; geri yükleme bugün de `GERİ YÜKLE` yazısı ister
    (`server/YesLojistik.Api/Controllers/AdminController.cs:69-70`).

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. Aşağıdaki
tabloların tamamı ya `05-VERI-MODELI.md`'de tanımlıdır (yeniden tanımlanmaz, yalnız bu modülün
kullandığı alanlar listelenir) ya da bu modüle özgüdür.

### 6.1 Mevcut tabloya eklenecek sütunlar (hepsi boş olabilir)

| Tablo | Sütun | Tip | Not |
|---|---|---|---|
| `CompanySettings` | `CompanyId` | int? | `05-VERI-MODELI.md:171-173` |
| `CompanySettings` | `ShortName` | string(40)? | Menü/yazışma kısa adı |
| `CompanySettings` | `KepAddress` | string(120)? | `33` dokümanıyla gelir |
| `CompanySettings` | `FiscalYearStartMonth` | int? | Varsayılan boş = Ocak |
| `CompanySettings` | `BaseCurrencyId` | int? | Boş = TL |
| `CompanySettings` | `RateSource` | string(10)? | `TCMB` / `Manuel` |
| `CompanySettings` | `OnboardingStateJson` | string? | Sihirbaz ilerlemesi (sunucuya taşınır) |
| `CompanySettings` | `ChartTemplateCode` | string(30)? | Yüklenen hesap planı şablonu |

### 6.2 Kullanılacak yeni tablolar (tanımları başka dokümanda)

| Tablo | Tanım yeri | Bu modüldeki rolü |
|---|---|---|
| `Company` | `05-VERI-MODELI.md:163-169` | Çok şirketli yapıda künyenin taşıyıcısı |
| `AccountingPeriod` | `05-VERI-MODELI.md:175-178` | Mali dönem ve kapanış durumu |
| `Currency` / `ExchangeRate` | `05-VERI-MODELI.md:180-188` | Para birimi ve günlük kur |
| `Account` | `05-VERI-MODELI.md:192-199` | Hesap planı şablonunun hedefi |
| `DocumentSeries` | `05-VERI-MODELI.md:256-264` | Belge serileri (tek merkez) |
| `Warehouse` | `05-VERI-MODELI.md:294-296` | Depo tanımı |
| `BankAccount` | `05-VERI-MODELI.md:357` | IBAN/SWIFT alanları |
| `BackgroundJob` | `05-VERI-MODELI.md:433-438` | Kur çekme ve şablon yükleme işleri |

### 6.3 Bu modüle özgü yeni tablo: `SetupChecklist`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | Tek şirkette boş |
| `StepKey` | string(30) | `company`, `fiscal`, `invoice`, `chart`, `data`, `users`, `done` |
| `CompletedAt` | DateTime? | Boş = tamamlanmadı |
| `SkippedAt` | DateTime? | Boş = atlanmadı |
| `CompletedByUserId` | int? | |
| `Note` | string(300)? | Gerekçe/not |

Tekil indeks: `(CompanyId, StepKey)`. Amaç: sihirbaz ilerlemesini tarayıcıdan kurtarmak ve "hangi adım
atlandı" sorusunu denetlenebilir kılmak. Bugün bu bilgi yalnız tarayıcı deposundadır
(`client/src/lib/onboarding.ts`, `client/src/pages/OnboardingPage.tsx:35`).

### 6.4 Geçiş planı (numara sayaçları)

1. `DocumentSeries` tablosu eklenir.
2. Mevcut değerler okunur: `InvoicePrefix`/`NextInvoiceNumber`
   (`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`), `EInvoiceSeriesPrefix`/
   `EArchiveSeriesPrefix` (`:46-47`), `EInvoiceSequence` satırları
   (`server/YesLojistik.Core/Entities/Invoice.cs:56-61`).
3. **Çift yazma** dönemi: numara önce `DocumentSeries`'ten alınır, eski alanlar aynı transaction
   içinde güncellenir. Böylece geri dönüş tek satırlık kod değişikliğidir.
4. Eski alanlar **bir sürüm boyunca silinmez**; silme işi ayrı ve onaylı bir iştir.

## 7. API uçları

Mevcut uçlar korunur (`/api/settings`, `/api/users`, `/api/admin/*`, `/api/me/notification-preferences`).
Yeni uçlar `05-VERI-MODELI.md:455-479` ve `04-HEDEF-MIMARI.md` §7'deki desene uyar.

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/settings` | — | Künye + varsayılanlar | Giriş yapmış (bugünkü gibi) |
| PUT | `/api/settings` | `CompanySettingsDto` | Güncel künye | `Admin` |
| GET | `/api/erp/periods` | `?year=` | Dönem listesi | `Accounting` + görme |
| POST | `/api/erp/periods` | `{year, startDate, endDate}` | Dönem | `Admin` |
| POST | `/api/erp/periods/{id}/close` | `{reason}` | Kapanan dönem | `Admin` |
| GET | `/api/erp/currencies` | — | Para birimleri | Giriş yapmış |
| PUT | `/api/erp/currencies/base` | `{currencyId}` | Güncel liste | `Admin` |
| GET | `/api/erp/exchange-rates` | `?from=&to=` | Kur listesi | Giriş yapmış |
| POST | `/api/erp/exchange-rates/fetch` | `{date}` | Çekilen kur sayısı | `Admin` |
| GET | `/api/erp/accounts/templates` | — | Şablon listesi | `Accounting` |
| POST | `/api/erp/accounts/templates/{code}/apply` | `{mode}` | Eklenen/atlanan hesap sayısı | `Admin` |
| GET | `/api/erp/document-series` | `?documentType=` | Seri listesi | `Accounting` |
| POST | `/api/erp/document-series` | `{documentType, prefix, year, nextNumber, padding, separator}` | Seri | `Admin` |
| PUT | `/api/erp/document-series/{id}` | Aynı gövde | Seri | `Admin` |
| GET | `/api/erp/warehouses` | — | Depo listesi | Giriş yapmış |
| POST | `/api/erp/warehouses` | `{code, name, address, responsibleName}` | Depo | `Operations` |
| GET | `/api/erp/jobs/{id}` | — | İş durumu | `Admin` |
| GET | `/api/setup/checklist` | — | Adım listesi ve durumu | `Admin` |
| PUT | `/api/setup/checklist/{stepKey}` | `{skipped, note}` | Güncel liste | `Admin` |
| GET | `/api/admin/backup` | `?files=` | `.dump` akışı | `Admin` veya `X-Backup-Token` |
| POST | `/api/admin/restore` | dosya + `confirm` | `{restored:true}` | `Admin`, `Backup:AllowRestore=true` |

Kurallar: (a) yazma uçlarının hepsi yetki **ve** lisans kapısından geçer
(`docs/plan-erp/04-HEDEF-MIMARI.md:336`); (b) liste uçları sayfalanır; (c) hata gövdesi sade Türkçe
`ProblemDetails` olur; (d) uzun süren işler (kur çekme, şablon yükleme, geri yükleme) `BackgroundJob`
kaydı açar ve `GET /api/erp/jobs/{id}` ile izlenir.

## 8. Yetki, onay ve denetim izi

### 8.1 Rol matrisi (bu modül)

| İşlem | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Künyeyi görme | ✅ | ✅ | ✅ | ❌ |
| Künyeyi değiştirme | ✅ | ❌ | ❌ | ❌ |
| Mali yıl/dönem tanımı | ✅ | Görme | ❌ | ❌ |
| Dönem kapatma / açma | ✅ | ❌ | ❌ | ❌ |
| Kur görme | ✅ | ✅ | ✅ | ❌ |
| Kur çekme / elle kur | ✅ | ❌ | ❌ | ❌ |
| Hesap planı şablonu uygulama | ✅ | ❌ | ❌ | ❌ |
| Belge serisi tanımı | ✅ | Görme | ❌ | ❌ |
| Depo tanımı | ✅ | Görme | ✅ | ❌ |
| Kullanıcı yönetimi | ✅ | ❌ | ❌ | ❌ |
| Bildirim tercihi (kendi) | ✅ | ✅ | ✅ | ❌* |
| Yedek alma | ✅ | ❌ | ❌ | ❌ |
| Geri yükleme | ✅ | ❌ | ❌ | ❌ |

\* Şoför panelde bildirim tercihi görmez; mobil uygulama tercihleri ayrıdır
(`server/YesLojistik.Api/Controllers/MeController.cs:48`).

### 8.2 Onay (maker-checker)

| İşlem | Onay gerekir mi | Kim onaylar | Bugünkü durum |
|---|---|---|---|
| Seri elle numara değişimi | Evet | Yönetici | **Yok** (`07` §6.3'te `ApprovalRequest` ile gelir) |
| Dönem kapatma | Evet (aynı kişi onaylayamaz) | Yönetici | Yok |
| Mali yıl değişimi | Evet | Yönetici | Yok |
| Hesap planı şablonu uygulama | Hayır (önizme + onay kutusu yeter) | — | Yok |
| Yedekten geri yükleme | Evet (`GERİ YÜKLE` yazısı) | Yönetici | **Var** (`AdminController.cs:69-70`) |
| Deneme verisi temizliği | Evet (`SİL` yazısı) | Yönetici | **Var** (`SettingsController.cs:74-75`) |

### 8.3 Denetim izi

1. Bugünkü otomatik alan izleme korunur (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).
2. Aşağıdaki **karar olayları** ayrı `AuditLog` satırı olarak yazılır (Action alanına):
   `SettingsChanged`, `FiscalYearChanged`, `PeriodLocked`, `PeriodUnlocked`, `ChartTemplateApplied`,
   `NumberSeriesChanged`, `CurrencyFetched`, `BaseCurrencyChanged`, `BackupRestored`, `SampleDataCleared`.
3. Değişiklik metni okunur Türkçe kalır; para iki kuruş, tarih `dd.MM.yyyy`
   (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:146-158`).
4. Gizlilik: logo data URL'i, lisans anahtarı ve dosya yolları izlenmez
   (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:18-20`). Bu liste yeni alanlarla
   **genişletilmez**; yeni gizli alan eklenirse listeye eklenir.
5. Denetim izi silinmez (`server/YesLojistik.Core/Entities/AuditLog.cs:4` — `BaseEntity` türevi değil).
   Saklama/imha kararı `35-DENETIM-IZI-KVKK-UYUM.md` dokümanına aittir; bu doküman süre **yorumu yapmaz**.

## 9. Kabul kriterleri

1. Kurulum sihirbazı yeni bir kurulumda **yedi adımı** gösterir; her adım atlanabilir, atlanan adım özet
   ekranında kırmızı görünür ve `SetupChecklist` tablosunda `SkippedAt` dolu olur.
2. Sihirbaz yarıda bırakılıp **başka bir bilgisayardan** açıldığında aynı adımdan devam eder
   (tarayıcı deposu temizlenmiş olsa bile).
3. Mali yıl tanımı yapılmadan dönem kapatma düğmesi **pasiftir** ve nedeni yazar.
4. Firma para birimi TL dışında seçildiğinde yeni fatura `ExchangeRate` satırı olmadan
   **kaydedilemez**; hata metni hangi gün için kur gerektiğini söyler.
5. Kur çekme işi aynı gün için **ikinci kez** çalıştırıldığında yeni satır oluşturmaz (idempotent).
6. Hesap planı şablonu iki kez uygulandığında ikinci çalıştırma **0 yeni hesap** ekler ve var olan
   hesap kodlarının hiçbiri değişmez.
7. Satış faturası numarası, `DocumentSeries` tablosu eklendikten sonra da **birebir aynı** biçimde
   üretilir (`F-000001`); iki eşzamanlı fatura iki farklı numara alır.
8. `EInvoiceSequence` değerleri taşındıktan sonra e-Fatura numarası serisi kesintisiz devam eder;
   yıl dönümünde sıfırlanır.
9. `PUT /api/settings` ile mevcut fatura numarası geriye alınmaya çalışılırsa istek reddedilir ve sayaç
   değişmez.
10. e-Fatura açılmaya çalışılırken VKN, vergi dairesi veya il boşsa kayıt reddedilir; hata metni hangi
    alanın eksik olduğunu söyler.
11. KDV varsayılanı değiştirildikten sonra **mevcut** fatura, gider ve sevkiyatların oranları
    değişmez (regresyon testi).
12. Paket kullanıcı sınırı dolduğunda yeni ofis kullanıcısı **açılamaz**; hata metni sade Türkçedir ve
    paketi yükseltme yolunu söyler. Şoför hesabı sınırdan sayılmaz.
13. Kullanıcı silme, kendi kendini silme yasağı korunur (bugünkü davranış:
    `client/src/pages/SettingsPage.tsx:265`, `server/YesLojistik.Api/Controllers/UsersController.cs:73-74`).
14. Seri, dönem, kur ve şablon işlemlerinin **hepsi** `AuditLog`'da görünür; `GET /api/audit?action=NumberSeriesChanged`
    en az bir satır döner.
15. Ayna modu açıkken seri ve varsayılan alanları **salt okunur** görünür; künye kaydedilebilir.
16. Geri yükleme yalnız `Backup:AllowRestore=true` iken çalışır; kapalıyken uç `404` döner.
17. Klasik görünüm varsayılan kalır (`client/src/lib/uiMode.ts:8`); yeni sekmeler **iki görünümde de**
    çalışır.
18. `docs/plan-erp/01-ORTAK-SARTNAME.md` §4 referans denetimi bu doküman için **0 kırık referans** verir.
19. Bu dokümanın uygulanmasından sonra mevcut testlerin **hiçbiri** silinmez veya atlanmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `SetupRulesTests.cs`
- Mali yıl başlangıcı kapalı dönem varken değiştirilemez.
- Devir tarihi kilitli döneme düşerse reddedilir.
- Firma para birimi kayıt varken yalnız gerekçeyle değişir.
- KDV varsayılanı değişimi mevcut belgelerin oranını değiştirmez.

Yeni dosya: `DocumentSeriesTests.cs`
- Seri öneki `^[A-Za-z0-9]{3}$` kuralına uymayan değer reddedilir
  (`server/YesLojistik.Core/Validation/Validators.cs:378`).
- `NextNumber` geriye alınamaz (`server/YesLojistik.Core/Validation/Validators.cs:381`).
- Yılsız seride yıl dönümünde sıfırlama olmaz; yıllı seride olur.

Yeni dosya: `CurrencyRateTests.cs`
- Aynı gün için ikinci çekim yeni satır üretmez.
- Kur yokken `Kaydı engelle` ayarında belge kaydı reddedilir.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `SettingsApiTests.cs` (`server/YesLojistik.Tests/Integration/ApiFactory.cs` deseniyle)
- `PUT /api/settings` yalnız `Admin` rolünde 200; `Operations` rolünde **403**.
- Numara geriye alma denemesi 400/`DomainException` döner, sayaç değişmez.
- e-Fatura açma, eksik alanla 400 döner.

Yeni dosya: `SetupChecklistTests.cs`
- Adım atlama kaydı `SkippedAt` yazar; tamamlama `CompletedAt` yazar.
- Aynı adım iki kez tamamlanırsa ikinci çağrı satır **eklemez** (idempotent).

Yeni dosya: `DocumentSeriesMigrationTests.cs`
- Taşıma sonrası `F-000001` biçimi korunur.
- Eşzamanlı iki fatura isteği iki farklı numara üretir (bugünkü eşzamanlılık testi genişletilir:
  `server/YesLojistik.Tests/Integration/EInvoiceTests.cs:111`).
- `reset-data` çağrısından sonra seri sayaçları 1'e döner
  (mevcut test genişletilir: `server/YesLojistik.Tests/Integration/DataResetTests.cs`).

Mevcut testler korunur; `server/YesLojistik.Tests/Integration/MigrationTests.cs`,
`server/YesLojistik.Tests/Integration/AuditTests.cs` ve
`server/YesLojistik.Tests/Integration/BackupTests.cs` bu değişikliklerden sonra yine yeşil olmalıdır.

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `setup-wizard.spec.ts`
- Boş kurulumda sihirbaz açılır, yedi adım görünür, iki adım atlanır, özet ekranında kırmızı görünür.
- Sayfa yenilenir ve **kaldığı adımdan** devam eder.
- Klasik ve yeni görünümde aynı akış (yardımcı: `client/e2e/helpers.ts:44-46`).

Yeni dosya: `settings-company.spec.ts`
- Künye kaydedilir, logo yüklenir, menüde firma adı değişir (mevcut beyaz etiket testi genişletilir:
  `client/e2e/onboarding.spec.ts:33`).
- VKN alanına 9 hane yazılınca Türkçe hata görünür.

Mevcut `client/e2e/workflow.spec.ts:209` (yedek kartı) ve `client/e2e/security.spec.ts:25` (veri indirme)
testleri yeni sekmeleri kapsayacak biçimde genişletilir.

### 10.4 Doğrulama komutu

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp
```
Beklenen: bu dokümanda **0 kırık referans**, **0 mojibake/BOM**.

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `SetupChecklist` tablosu + uçlar + migration | 2 | — |
| 2 | Sihirbazın yedi adıma çıkarılması (panel) | 4 | 1 |
| 3 | `AccountingPeriod` + mali yıl ayarı + dönem uçları | 3 | `05-VERI-MODELI.md` |
| 4 | `Currency`/`ExchangeRate` + kur çekme işi | 4 | 3 |
| 5 | Hesap planı şablonları + uygulama servisi | 5 | `06-MUHASEBE-MOTORU.md` |
| 6 | `DocumentSeries` geçişi (çift yazma, çift okuma) | 4 | `05`, `07` |
| 7 | Belge serileri ekranı (ortak ekran) | 1,5 | 6 |
| 8 | Depo ve banka hesabı tanımları + uçlar | 3 | `10-STOK-VE-DEPO.md`, `15-BANKA-ENTEGRASYON.md` |
| 9 | Kullanıcı sayısı sınırı + eşzamanlı oturum | 3 | `34-LISANS-ABONELIK-KONTOR.md` |
| 10 | Ayarlar denetim izi olayları ve süzgeci | 2 | 1, 3, 6 |
| 11 | Yedek/geri yükleme ekranının genişletilmesi | 2 | — |
| 12 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam** | | **~38,5 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo ve alan sözleşmesi), `04-HEDEF-MIMARI.md`
(servis kayıt düzeni, modül kayıt defteri), `07-YETKI-ONAY-NUMARALANDIRMA.md` (dönem kilidi ve seri
ekranının ortak tanımı).

**Bu dokümanı bekleyenler:** `06-MUHASEBE-MOTORU.md` (mali yıl ve hesap planı),
`07-YETKI-ONAY-NUMARALANDIRMA.md` (seri tablosunun geçişi), `08-E-BELGE-KATMANI.md` (seri ayarları),
`32-VERI-GOCU-EXCEL-AKTARIM.md` (firma kurulumundan sonra çalışır), `33-BILDIRIM-EPOSTA-SMS-KEP.md`
(KEP adresi ve SMTP), `34-LISANS-ABONELIK-KONTOR.md` (kullanıcı sınırı ve modül kapısı),
`40-UAT-KABUL-CANLIYA-GECIS.md` (pilot kurulum provası).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| Numara sayacının seri tablosuna taşınmasında numara tekrarı/boşluğu | Yüksek | Çift yazma + veritabanı tekil indeksi (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-308`) | Eski alanlar bir sürüm kalır; üretici tek satırla geri alınır |
| Firma para birimi değişiminin geçmiş bakiyeleri bozması | Yüksek | Kayıt varken değişiklik yalnız gerekçeli ve denetim izli; varsayılan TL | Ayar geri alınır, geçmiş belgeler TL kalır |
| Kur kaynağının (TCMB) erişilememesi | Orta | Kur çekme işi `BackgroundJob` kuyruğunda; başarısızlıkta "son bilinen kur" ayarı | Manuel kur girişi her zaman açık |
| Hesap planı şablonunun mevcut hesaplarla çakışması | Yüksek | Şablon yalnız **ekler**; önizleme zorunlu | Uygulama geri alınmaz ama hesap pasife alınır |
| Mali yıl değişiminin kapanmış dönemi bozması | Yüksek | Kapalı dönem varken değişiklik reddedilir | — |
| Sihirbazın yarıda kalması (kullanıcı bırakır) | Düşük | İlerleme sunucuda; atlanan adım özet ekranında görünür | Sihirbaz her zaman `/kurulum` adresinden açılır |
| Kullanıcı sayısı sınırının yanlış sayması (şoför hesabı) | Orta | Şoför `Driver` rolü sayılmaz; sınır testle kilitlenir | Sınır ayarı kapatılabilir (paket kararı) |
| Yedekten geri yüklemenin canlı veriyi ezmesi | Yüksek | Onay yazısı (`GERİ YÜKLE`) + önce otomatik güvenlik yedeği | Yedek dosyası saklanır; `customer-restore.sh` ile dönüş |
| Ayar değişikliğinin geçmiş belgeleri geriye dönük değiştirmesi | Yüksek | Varsayılanlar yalnız **yeni** belgeye uygulanır; regresyon testi | — |
| Çok şirketli yapıya geçişte künyenin iki yerde kalması | Orta | `Company` tablosu eklenir, `CompanySettings` ona bağlanır; veri **kopyalanmaz** (`05-VERI-MODELI.md:166-168`) | `CompanyId` boş kalır, tek şirket davranışı sürer |

**Doğrulanacaklar (dış bilgi):**

1. **doğrulanacak:** Luca Net'te "otomatik firma kurulumu" tam olarak hangi adımları otomatik yapıyor;
   mali yıl, hesap planı ve seri orada mı seçiliyor — kaynak: Luca kullanım kılavuzu veya bayi demosu.
2. **doğrulanacak:** Luca'da çok şirketli yapıda hesap planı, seri ve mali yıl şirket bazında mı —
   kaynak: Luca kullanım kılavuzu.
3. **doğrulanacak:** TCMB kur kaynağının kullanım koşulları, hangi kur türünün kullanılacağı ve
   yayın saatleri — kaynak: TCMB yayınları ve mali müşavir.
4. **doğrulanacak:** Hazır hesap planı şablonlarının (tekdüzen ve sektör) güncel hâli ve kullanım
   hakkı — kaynak: mali müşavir.
5. **doğrulanacak:** Mali yıl başlangıcının Ocak dışında olması hâlinde beyan ve defter dönemlerinin
   nasıl tanımlanacağı — **mali müşavir onayı gerekir**; bu doküman yorum yapmaz.
6. **doğrulanacak:** Fatura serisinde yıl sıfırlaması ve numara boşluğu politikasının yasal durumu —
   mali müşavir.
7. **doğrulanacak:** Yedek saklama süresi ve şifreleme zorunluluğu; müşteri verisinin yurt dışı
   sunucuda tutulmasının KVKK açısından durumu — avukat ve `35-DENETIM-IZI-KVKK-UYUM.md`.
8. **doğrulanacak:** Denetim izinin saklama süresi (panelde "2 yıl" yazıyor:
   `client/src/pages/SettingsPage.tsx:54`) ile ticari defter saklama süresinin uyumu — mali müşavir/avukat.
9. **doğrulanacak:** Kullanıcı sayısı sınırı için "eşzamanlı oturum" mu, "tanımlı kullanıcı" mı
   sayılacağı — satış kararı (kullanıcıya sorulacak).
10. **doğrulanacak:** Posta gönderen (SMTP) adresinin alan adı doğrulaması (SPF/DKIM) gerekip
    gerekmediği — e-posta sağlayıcısı.

Sonraki belgeyle bağlantı: bu doküman `06-MUHASEBE-MOTORU.md`'ye mali yıl ve hesap planı şablonunu,
`07-YETKI-ONAY-NUMARALANDIRMA.md`'ye seri geçişini, `32-VERI-GOCU-EXCEL-AKTARIM.md`'ye kurulum sonrası
veri getirmeyi, `33-BILDIRIM-EPOSTA-SMS-KEP.md`'ye bildirim ve KEP ayarlarını,
`34-LISANS-ABONELIK-KONTOR.md`'ye kullanıcı sayısı sınırını devreder; hepsi
`01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak parçalarını kullanır.
