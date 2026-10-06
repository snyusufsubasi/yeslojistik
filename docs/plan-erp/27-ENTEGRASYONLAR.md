# 27 — Entegrasyonlar

Bu belge, ERP hedefinin **dış dünya bağlantı çerçevesini** anlatır: sağlayıcı arayüzü, kimlik bilgisi
saklama, kuyruk ve yeniden deneme, hata günlüğü, webhook alma, oran sınırı, idempotency, test/sandbox
modu ve entegrasyon envanteri. Tek bir entegrasyonun ayrıntısı kendi belgesindedir (banka `15`, e-belge
`08`, muhasebeci `28`, mobil ve portal `29`); burada hepsinin **ortak gövdesi** ve **öncelik sırası**
kurulur.

## 1. Amaç ve kapsam

**Amaç.** Bugün her dış bağlantı kendi başına, kendi deseniyle yazılıyor: e-Fatura tarafında güzel bir
sağlayıcı kayıt tablosu var (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:21-28`),
ama e-posta, push, yedek ve içe aktarma birbirinden habersiz. İkinci bir dış servis eklendiğinde aynı
işler yeniden yazılır: anahtar nerede durur, hata nereye yazılır, kaç kez denenir, çift kayıt nasıl
engellenir, test ortamı nasıl ayrılır. Bu belge bu soruları **tek çerçevede** cevaplar ve entegrasyon
listesini öncelik sırasına dizer.

Bu belge şunları çözer:

1. **Ortak arayüz.** Her dış servis aynı iskeleti uygular: kimlik bilgisi, sağlık kontrolü, gönderim,
   durum sorgusu, webhook. Böylece kuyruk, günlük ve yetki tek yerde yazılır.
2. **Kimlik bilgisi saklama.** API anahtarı, kullanıcı adı, şifre, token **şifreli** saklanır; hiçbiri
   dosyaya, depoya ya da günlüğe yazılmaz (`docs/plan-erp/01-ORTAK-SARTNAME.md:20-21`).
3. **Kuyruk, yeniden deneme, hata günlüğü.** Dış çağrı belge işlemini bekletmez; iş kaydı tutulur,
   geri çekilmeli bekleme ile denenir, kalıcı hata görünür olur.
4. **Webhook alma.** Sağlayıcı bize çağrı yapıyorsa imzası doğrulanır, aynı olay iki kez işlenmez.
5. **Oran sınırı ve idempotency.** Kendi API'miz ve dış çağrılarımız için ölçülebilir sınırlar.
6. **Test/sandbox modu.** Canlı veri ile test verisi karışmaz; ekranda hangi modda olduğumuz yazar.

**Bu belge neyi çözmez.** Banka ekstresi eşleştirme kuralları (`15-BANKA-ENTEGRASYON.md`), UBL-TR
üretimi ve e-belge durum makinesi (`08-E-BELGE-KATMANI.md`), yevmiye fişi (`06-MUHASEBE-MOTORU.md`),
mali müşavir aktarım dosyasının içeriği (`28-MUHASEBECI-PAKETI.md`), portal ekranları
(`29-MOBIL-VE-DISA-ACILIM.md`). Ayrıca **hiçbir gerçek uç nokta, protokol ayrıntısı ya da fiyat
uydurulmaz**: doğrulanmamış her dış bilgi `**doğrulanacak:**` etiketiyle yazılır.

## 2. Luca'daki karşılığı

Luca, entegrasyonu bir **ürün başlığı** olarak satıyor: envanterde banka entegrasyonu, BES, Defter
Beyan, Ülker-Mobis, turizm, NetteCap, İŞNET e-Çırak, SYS-R ve TÜRMOB e-imza listeli
(`docs/plan-erp/02-LUCA-ENVANTERI.md:67-71`). Luca Net'in özellik listesinde "banka ekstrelerinin
sisteme entegrasyonu" ve Excel ile banka ekstresi aktarımı var (`02-LUCA-ENVANTERI.md:42`); Koza
tarafında **Luca Koza Rest API** ile diğer uygulamalarla senkron, StockMount ile sanal mağaza
entegrasyonu ve Orion Pos ile restoran senkronu sayılıyor (`02-LUCA-ENVANTERI.md:53`).

Buradan çıkan ders şudur: Luca entegrasyonu **ürün ailesi başına** değil, **tek bir bağlantı
katmanı** üzerinden veriyor. Bizde de öyle olur: her entegrasyon aynı sağlayıcı arayüzünü ve aynı
kuyruğu kullanır.

**doğrulanacak:** Luca'nın entegrasyonlarının teknik protokolü (REST/SOAP/dosya), yetkilendirme
yöntemi, hangi entegrasyonun hangi ücretle satıldığı ve Luca Koza Rest API'nin kapsamı. Kaynak: Luca
satış/destek ekibi ve ürün demo erişimi; site metni protokol düzeyine inmiyor
(`docs/plan-erp/04-HEDEF-MIMARI.md:36-38`).

## 3. Bizde bugün

Bu bölümdeki her iddia `dosya:satır` kanıtlıdır.

**Var olan ve yeniden kullanılacak parçalar.**

| Parça | Ne yapar | Kanıt |
|---|---|---|
| `IEInvoiceProvider` | Sağlayıcı arayüzü: `Key`, `Name`, `CanSend`, `SupportsStatus`, `SupportsRecipientCheck`, `SupportsDownload`, `SendAsync`, `GetStatusAsync`, `CancelAsync`, `CheckRecipientAsync`, `DownloadAsync` | `server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:31-51` |
| `EInvoiceProviders.Registry` | Ad → sağlayıcı üreten fonksiyon; tanınmayan ad sunucuyu düşürmez, `manual` kullanılır | `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:21-28`, `:39-49` |
| Sağlayıcı seçimi | Ortam değişkeni `EInvoice__Provider`; varsayılan `manual` | `server/YesLojistik.Api/Program.cs:35-36`, `EInvoiceProviders.cs:18` |
| Tanımlı mı göstergesi | `ApiKeyConfigured` yalnız "`EInvoice:ApiKey` dolu mu" der, değeri göstermez | `server/YesLojistik.Api/Controllers/EInvoiceController.cs:16-17`, `:25-27` |
| E-posta soyutlaması | `IEmailSender` + `IsConfigured`; ayar yoksa düğme gizlenir | `server/YesLojistik.Core/Abstractions/IEmailSender.cs:7-12` |
| Push soyutlaması | `IPushSender`; `Push:Enabled` false ise `NullPushSender` | `server/YesLojistik.Core/Abstractions/IPushSender.cs:1-8`, `Program.cs:43-44` |
| Dosya saklama soyutlaması | `IFileStorage` + iki uygulama (`Database`, `Local`) | `server/YesLojistik.Core/Abstractions/IFileStorage.cs:1-7`, `server/YesLojistik.Infrastructure/DependencyInjection.cs:52-56` |
| Kimlik bilgisi şifreleme deseni | TOTP anahtarı AES-GCM ile şifrelenir; anahtar `TwoFactor:Key`, o yoksa `Jwt:Key` üzerinden HKDF ile türetilir; kayıt `v1.` önekli | `server/YesLojistik.Api/Auth/TwoFactorService.cs:52-57`, `:60-68`, `:70-85` |
| Idempotency deseni | Şoför masrafı `Idempotency-Key` başlığıyla tek kayda bağlanır (`ClientRequestId`) | `server/YesLojistik.Api/Controllers/DriverController.cs:75-97`, `server/YesLojistik.Core/Entities/Expense.cs:38` |
| Idempotency (ek dosya) | Aynı anahtar ikinci kez gelirse yeni ek açılmaz | `DriverController.cs:122-129`, `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:266` |
| Oran sınırı | Giriş (`login`), takip (`public`) ve yedek (`backup`) için IP başına pencere | `server/YesLojistik.Api/Program.cs:86-107` |
| Dış çağrı örneği (HTTP) | Push gönderimi `HttpClient` fabrikasıyla, 5 sn zaman aşımı | `server/YesLojistik.Infrastructure/DependencyInjection.cs:51` |
| Dış çağrı hatası belgeyi bozmaz | Müşteri durum e-postası hatası yutulur, uyarı günlüğe yazılır | `server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:54-59` |
| Basit API anahtarı doğrulaması | Yedek ucu `X-Backup-Token` başlığıyla erişir | `server/YesLojistik.Api/Controllers/AdminController.cs:19-32` |
| Denetim izi | `AuditLog` alanları ve otomatik yazan `AuditTrail`; gizli alanlar izlenmez | `server/YesLojistik.Core/Entities/AuditLog.cs:11-17`, `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:12-21`, `:54-56` |
| İçe aktarma iskeleti | Sütun sözlüğü, zorunlu sütunlar, tür bazlı dağıtım (`switch`) | `server/YesLojistik.Infrastructure/Services/ImportService.cs:36-55`, `:320-330` |
| Mobil çevrimdışı kuyruk | Telefonda sıra, üstel geri çekilme, kalıcı hata bayrağı, `Idempotency-Key` | `mobile/src/lib/outbox.ts:161-175`, `:177`, `:203-232` |
| Müşteri takip bağlantısı | Token üretimi ve herkese açık takip ucu | `server/YesLojistik.Api/Controllers/TrackingController.cs:19-33` |

**Eksik olanlar (bu belge kapatır).**

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | Entegrasyon kimlik bilgisi tablosu ve şifreli saklama | Kodda `ApiKey`/`Token` sütunlu böyle bir tablo yok; `AppDbContext` `DbSet` listesinde karşılığı bulunmuyor (`AppDbContext.cs:10-43`) |
| 2 | Kalıcı iş kuyruğu tablosu | Arka plan işleri `PeriodicTimer` tabanlı; yalnız üç işçi var (`Program.cs:38-40`) |
| 3 | Sağlayıcıdan bağımsız çağrı günlüğü | Kodda istek/yanıt günlüğü tutulmuyor; Serilog yalnız konsola yazıyor (`Program.cs:25`) |
| 4 | Webhook alma ucu ve imza doğrulaması | Depoda `webhook` sözcüğü geçmiyor (kaynak taraması boş) |
| 5 | Kendi açık API'si ve anahtar yönetimi | Bugün yalnız çerez/JWT tabanlı oturum var (`Program.cs:58-78`); API anahtarı yalnız yedek ucunda tek başlık (`AdminController.cs:23`) |
| 6 | Oran sınırı politikası: kendi API'si ve webhook | Yalnız `login`, `public`, `backup` politikaları tanımlı (`Program.cs:88-101`) |
| 7 | Sandbox/canlı ayrımı | Tek `EInvoice:Provider` ayarı var; "test mi canlı mı" bilgisi taşınmıyor (`EInvoiceController.cs:16-17`) |
| 8 | Genel sağlayıcı arayüzü | Yalnız e-belge için arayüz var; banka, kargo, muhasebe programı, SMS için ortak arayüz yok (`server/YesLojistik.Core/Abstractions/` içeriği) |
| 9 | SMS ve KEP/e-tebligat kanalı | Depoda `Sms`/`Kep` sınıfı ya da ayarı yok (`IEmailSender` ve `IPushSender` dışında kanal yok) |
| 10 | Harita döşemesi ve GPS sağlayıcı ayarı | Karo adresi koda gömülü: `MapView` içinde OpenStreetMap | `client/src/components/MapView.tsx:50-51` |
| 11 | Dış servis sağlık durumu ekranı | Ayar ekranında yalnız "tanımlı mı" bilgisi var (`EInvoiceController.cs:25-27`) |

**Eksik listesinin özeti:** çerçeve yok, kayıt yeri yok, kuyruk yok, günlük yok, webhook yok, anahtar
yönetimi yok. Buna karşılık **desenler var**: sağlayıcı kayıt tablosu, `v1.` şifreli saklama,
`Idempotency-Key`, oran sınırı politikaları, `AuditTrail`. Çerçeve bu desenleri genelleştirir.

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md:51-59` ortak parçalarını yeniden kullanır
(`PageShell`, `DataTable`, `MobileCards`, `Modal`, `SumStrip`, `FilterBar`). Görsel dil icat edilmez;
klasik görünüm bozulmaz (`client/src/lib/uiMode.ts:8`).

Anahtar yol: **Ayarlar → Entegrasyonlar** (`/ayarlar?tab=integrations`). Bugünkü sekme yapısı
`client/src/pages/SettingsPage.tsx:26` içinde; yeni sekme bu listeye **eklenir**, mevcut sekmeler
değişmez.

### 4.1 Ekran: Entegrasyon listesi

| Sütun | İçerik | Kaynak |
|---|---|---|
| Entegrasyon | "Banka (ekstre)", "e-Belge", "Kargo" gibi okunur ad | Kayıt defteri |
| Sağlayıcı | Seçili sağlayıcı adı, yoksa "Seçilmedi" | Bağlantı kaydı |
| Mod | `Test` ya da `Canlı` rozeti (renkli) | Bağlantı kaydı |
| Durum | `Tanımlı değil` / `Tanımlı` / `Bağlantı hatası` / `Süresi doldu` | Son sağlık kontrolü |
| Son başarılı çağrı | Tarih-saat, `03.10.2026 14:20` biçimi | Çağrı günlüğü özeti |
| Kuyruk | Bekleyen iş sayısı, hatalı iş sayısı | Kuyruk tablosu |
| İşlem | **Bağlantıyı dene**, **Günlükleri gör**, **Düzenle**, **Kapat** | — |

### 4.2 Ekran: Bağlantı formu

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Entegrasyon türü | seçim (kilitli) | Evet | Form açıldığı türden gelir |
| Sağlayıcı | seçim (kayıtlı adlar) | Evet | Kayıt tablosundan; bilinmeyen ad yazılamaz |
| Mod | seçim (`Test`, `Canlı`) | Evet | Varsayılan **Test**; canlıya geçiş onay ister |
| Etiket | metin (50) | Hayır | "Örnek Bank A — vadesiz TL" gibi ayırt edici ad |
| Kullanıcı adı | metin (100) | Sağlayıcıya göre | Şifreli saklanır |
| Şifre | parola | Sağlayıcıya göre | Kaydedildikten sonra **tekrar gösterilmez**; "Değiştir" ile yenilenir |
| API anahtarı | parola | Sağlayıcıya göre | Aynı kural: yazılır, okunmaz |
| Ek alanlar | anahtar-değer (en çok 12) | Hayır | Sağlayıcıya özel (`BaseUrl`, `FirmaKodu`...) |
| Oran sınırı (dakikada) | sayı, 1-600 | Hayır | Boşsa sağlayıcı varsayılanı |
| Etkin | anahtar | Evet | Kapalıysa kuyruk iş üretmez |
| Not | metin (300) | Hayır | "Sözleşme 2026-11, destek hattı..." |

**Kural:** şifre ve anahtar **hiçbir koşulda** okuma uçlarından dönmez. Liste ve detay yalnız
"tanımlı mı" ve **son 4 karakter** bilgisini gösterir. Bu, bugünkü `ApiKeyConfigured` davranışının
genişletilmiş hâlidir (`EInvoiceController.cs:16-17`).

### 4.3 Ekran: İş kuyruğu

| Sütun | İçerik |
|---|---|
| Zaman | Planlanan çalışma anı (`NextAttemptAt`) |
| Tür | `einvoice.send`, `bank.statement.fetch`, `notify.sms` gibi iş kodu |
| Anahtar | Tekilleştirme anahtarı (belge no / tarih aralığı) |
| Durum | `Bekliyor`, `Çalışıyor`, `Bitti`, `Hata`, `Müdahale gerekli` |
| Deneme | `2 / 5` |
| Son hata | Kısaltılmış Türkçe mesaj (tam metin detayda) |
| İşlem | **Şimdi dene**, **İptal**, **Detay** |

Süzgeçler: tür, durum, tarih aralığı, entegrasyon. Liste varsayılan olarak `Müdahale gerekli` ve
`Hata` kayıtlarını en üste alır.

### 4.4 Ekran: Çağrı ve hata günlüğü

| Alan | İçerik |
|---|---|
| Zaman | Çağrının başlangıcı |
| Yön | `Giden` (biz çağırdık) / `Gelen` (webhook) |
| Yöntem ve adres | `POST https://.../v1/invoice` — sorgu dizesi **maskeli** |
| Durum | HTTP kodu ya da `zaman aşımı`, `bağlantı yok` |
| Süre | milisaniye |
| İlişki | İş kimliği, belge kimliği (fatura no, sefer no) |
| Özet | Yanıtın ilk 200 karakteri, **gizli alanlar ayıklanmış** |
| İşlem | **Tamamını gör**, **Tekrar dene**, **Kopyala** |

### 4.5 Ekran: Webhook uçları

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Ad | metin (50) | Evet | "e-Belge durum bildirimi" |
| Yol | metin (60, tekil) | Evet | `/api/hooks/<yol>`; küçük harf, tire |
| Gizli anahtar | parola | Evet | İmza doğrulamasında kullanılır; okunmaz |
| Olaylar | çoklu seçim | Evet | Sağlayıcının olay adları **doğrulanacak** |
| Etkin | anahtar | Evet | Kapalıyken uç 404 döner (varlık sızdırmaz) |
| Son çağrı | salt okunur | — | Zaman, durum, olay kimliği |

## 5. İş kuralları

### 5.1 Sağlayıcı arayüzü

Her entegrasyon türü kendi arayüzünü `YesLojistik.Core/Abstractions` altında tanımlar; hepsi ortak bir
taban sözleşmeyi uygular. Bugünkü e-belge arayüzü örnek alınır (`IEInvoiceProvider.cs:31-51`).

| Üye | Anlam | Zorunlu |
|---|---|---|
| `Key` | Ayardaki kısa ad (küçük harf) | Evet |
| `Name` | Ekranda görünen ad | Evet |
| `Capabilities` | Neyi yapabildiği (gönderim, sorgu, iptal, indirme, webhook) | Evet |
| `ValidateAsync` | Ayarları sınar; eksik/yanlışsa Türkçe mesaj | Evet |
| `HealthAsync` | Ağ erişimi ve kimlik doğrulama denemesi | Evet |
| İş metotları | Tür bazlı (`SendAsync`, `FetchAsync`...) | Tür bazlı |

**Kurallar.** (a) Sağlayıcı **hiçbir zaman** `AppDbContext` görmez; veriyi servis hazırlar. (b) Sağlayıcı
gizli bilgiyi günlüğe yazmaz; hata mesajında yalnız sağlayıcının verdiği kodu ve düz Türkçe açıklamayı
döner. (c) Desteklenmeyen yetenek `false` bırakılır; "desteklenmiyor" hatası arayüz katmanında
üretilir (bugünkü `CanSend` deseni, `IEInvoiceProvider.cs:38`). (d) Kayıt tablosu **tek satır** ile
büyür; başka dosya değişmez (`docs/ENTEGRATOR-EKLEME.md:63`).

### 5.2 Kimlik bilgisi saklama

- Kimlik bilgisi **yalnız veritabanında ve şifreli** durur. Kaynak kodda, `appsettings.json` içinde,
  depoda, günlükte, hata mesajında ve ekran görüntüsünde açık değer bulunmaz
  (`docs/plan-erp/01-ORTAK-SARTNAME.md:20-21`).
- Şifreleme, bugünkü TOTP deseniyle aynı ailedendir: AES-GCM, rastgele 12 baytlık nonce, 16 baytlık
  etiket, `v1.` sürüm öneki, anahtarın HKDF ile türetilmesi
  (`server/YesLojistik.Api/Auth/TwoFactorService.cs:52-68`). Yeni çerçevede bu kod **kopyalanmaz**;
  ortak bir `ISecretProtector` arayüzüne taşınır ve iki tüketici de onu kullanır.
- **Anahtar kaynağı:** `Integration:Key` ortam değişkeni; yoksa `Jwt:Key` (bugünkü iki adımlı geri
  çekilme, `TwoFactorService.cs:54-55`). **Kural:** anahtar değişirse eski kayıtlar çözülemez;
  bu durumda kullanıcıya "yeniden girin" denir, sessizce `manual` moduna düşülmez.
- **Maskeleme:** okuma uçları yalnız `IsConfigured` ve son 4 karakteri döner. `AuditTrail` gizli
  alanları izlemez (`AuditTrail.cs:12-21`); yeni tablonun gizli sütunları bu listeye eklenir.
- **Dosyaya yazmama kuralı.** Ayar dosyasına (ör. `appsettings.Development.json`) entegrasyon anahtarı
  yazılmaz; yerelde bile ortam değişkeni kullanılır. Mobil tarafta da aynı kural geçerlidir: cihazda
  yalnız oturum anahtarı `SecureStore` içinde tutulur (`mobile/src/lib/storage.ts:4-11`).
- **Sır paylaşımı:** webhook gizli anahtarı ve kendi API anahtarımız da aynı tabloda, aynı şifreleme ile
  saklanır; tek fark, üretilen tarafın biz olmamızdır.

### 5.3 Kuyruk, yeniden deneme ve hata günlüğü

Kalıcı kuyruk tablosu `04-HEDEF-MIMARI.md` §5.6 ve `05-VERI-MODELI.md` §6.9 içinde tanımlıdır
(`BackgroundJob`). Bu belge onun **entegrasyon kullanımını** sabitler:

1. **Belge işlemi beklemez.** Dış çağrı asla kullanıcı isteğinin içinde denenmez; iş kuyruğa yazılır
   (`docs/plan-erp/04-HEDEF-MIMARI.md:205-208`).
2. **Tekilleştirme.** Aynı `(şirket, tür, anahtar)` üçlüsü için ikinci iş açılmaz. Örnek anahtarlar:
   `einvoice.send` → fatura no; `bank.statement.fetch` → hesap + dönem; `notify.sms` → olay + alıcı.
3. **Geri çekilmeli bekleme.** Denemeler: 1 dk, 5 dk, 15 dk, 1 saat, 6 saat. Beş denemede bitmeyen iş
   **Müdahale gerekli** durumuna düşer ve yönetici ekranında kırmızı görünür.
4. **En az bir kez.** İş idempotent yazılır; aynı iş iki kez çalışsa bile ikinci kayıt oluşmaz.
5. **Hata günlüğü** çağrı düzeyindedir: her deneme için yön, yöntem, adres (maskeli), durum kodu, süre,
   kısaltılmış yanıt ve ilişki kimliği yazılır. **Kural:** gövdenin tamamı saklanmaz; yalnız
   `Hash` + ilk 200 karakter (gizli alanlar ayıklanmış) saklanır.
6. **Gizlilik.** Günlükte kullanıcı adı, şifre, token, kart/IBAN tam numarası bulunmaz. IBAN
   `TR** **** **** **** **** **34 56` biçiminde maskelenir.
7. **Saklama süresi.** Çağrı günlüğü 1 yıl, iş kaydı 2 yıl; süre bitince arşive taşınır (`36` ve `35`
   belgeleriyle uyumlu olacak şekilde ayarlanabilir).

### 5.4 Webhook alma

- Uç yolu tahmin edilemez olmalıdır: `/api/hooks/<tür>-<rastgele 32 karakter>`. Böylece yolun bilinmesi
  tek başına erişim sağlamaz; imza doğrulaması zorunludur.
- **İmza doğrulaması:** sağlayıcının belirttiği başlık ve algoritma kullanılır; ham gövde üzerinden
  hesaplanır. Algoritma ve başlık adı **doğrulanacak:** her sağlayıcı için API dokümanından teyit
  edilir (`docs/ENTEGRATOR-EKLEME.md:39`).
- **Tek işleme:** olay kimliği (sağlayıcı olay no, ETTN, işlem no) tekil indeksle saklanır. Aynı olay
  ikinci kez gelirse **200** döner ve iş **üretilmez** (sağlayıcı yeniden denemeyi bıraksın diye).
- **Hızlı yanıt:** uç yalnız doğrular ve kuyruğa yazar; iş burada çalıştırılmaz. Yanıt 2 saniyenin
  altında döner.
- **Kötüye kullanım:** imzası geçersiz istekler kaydedilir (IP, zaman) ve oran sınırına tabidir;
  gövde saklanmaz.
- **Sıra:** aynı belgeye ait olaylar geldikleri sırayla işlenir; eski zaman damgalı olay yeni durumu
  geriye almaz (durum makinesi reddeder ve uyarı üretir).

### 5.5 Oran sınırı

| Kova | Anahtar | Sınır | Aşılınca |
|---|---|---|---|
| Kendi API'miz | API anahtarı kimliği | Şirket ve anahtar bazında dakikada 600 | `429` + `Retry-After` |
| Kendi API'miz (okuma) | API anahtarı | Dakikada 1.200 | `429` |
| Kendi API'miz (yazma) | API anahtarı | Dakikada 300 | `429` |
| Webhook alma | Yol + IP | Dakikada 300 | `429` |
| Giden dış çağrı | Entegrasyon başına | Sağlayıcının verdiği sınırın %80'i | İş ertelenir |

**Kurallar.** (a) Mevcut `login`/`public`/`backup` politikaları aynen kalır
(`Program.cs:88-101`); yenileri **eklenir**. (b) Giden çağrılarda sınır, sağlayıcı 429/503 dönerse de
uygulanır: ceza süresi boyunca iş beklemede tutulur. (c) Sınır aşımı kullanıcı hatası değil sistem
durumudur; ekranda "sağlayıcı sınırı" olarak görünür.

### 5.6 Idempotency

- **Gelen istek:** yazma uçları `Idempotency-Key` başlığını kabul eder. Aynı anahtar tekrar gelirse ilk
  yanıt aynen döner (bugünkü masraf deseni, `DriverController.cs:84-87`).
- **Giden istek:** her dış çağrı, kuyruk iş anahtarından türetilmiş **kararlı** bir istemci anahtarı
  taşır. Sağlayıcı bu alanı destekliyorsa çift gönderim imkânsız olur; desteklemiyorsa gönderim öncesi
  "durum sorgula" kuralı uygulanır (`docs/ENTEGRATOR-EKLEME.md:119`).
- **Belirsiz sonuç:** zaman aşımında iş "başarısız" sayılmaz; **önce sorgu**, sonra karar verilir.
  Bu kural e-belge için bugün de yazılıdır (`docs/ENTEGRATOR-EKLEME.md:119`).
- **Anahtar üretimi:** kullanıcıdan gelen anahtar yoksa sunucu `tür + belge kimliği + sürüm` üçlüsünden
  deterministik anahtar üretir; rastgele anahtar kullanılmaz (tekrar denemede aynı anahtar çıksın diye).

### 5.7 Test/sandbox modu

- Her bağlantı kaydı `Mode` alanı taşır: `Test` ya da `Canlı`. Varsayılan **Test**'tir.
- Test modunda sağlayıcının test adresi kullanılır ve **canlı veri gönderilmez**. Sağlayıcı test ortamı
  vermiyorsa mod `Canlı` seçilebilir ama ekranda kalıcı uyarı görünür.
- Test ve canlı **numara serileri karışmaz**: test faturaları kendi serisini kullanır
  (kural `docs/ENTEGRATOR-EKLEME.md:89` içinde de yazılıdır).
- Ekranın her yerinde mod rozeti görünür; canlıya geçiş onay ister ve denetim izine yazılır.
- **Kural:** test modunda üretilen belgeler "gerçek belge" sayılmaz; resmî deftere aktarılmaz.
- Test ortamı, ücreti ve süresi **doğrulanacak:** her sağlayıcı için ayrı ayrı teyit edilir
  (`docs/ENTEGRATOR-EKLEME.md:101`).

## 6. Veri modeli

Yeni tablolar `05-VERI-MODELI.md` kararlarına uyar: tekil İngilizce ad, `decimal(18,2)` para,
enum'lar metin, `CompanyId` taşır, migration **yalnız ekleme**
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:45-49`, `docs/plan-erp/05-VERI-MODELI.md:32-40`).

**`IntegrationConnection` (Y).** Amaç: bir entegrasyon türü için sağlayıcı ve kimlik bilgisi kaydı.
Alanlar: `Id`, `CompanyId`, `Kind` (`Bank`/`EInvoice`/`Marketplace`/`Shipping`/`Accounting`/`Kep`/
`Signature`/`Sms`/`Map`/`OwnApi`), `ProviderKey`, `Label`, `Mode` (`Test`/`Canlı`), `UsernameEnc`,
`SecretEnc`, `ExtraJson` (şifreli), `RateLimitPerMinute`, `IsActive`, `LastOkAt`, `LastCheckAt`,
`LastCheckMessage`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `IsDeleted`. İlişkiler: `CompanyId` →
`Company`; tekil indeks `(company_id, kind, provider_key, label)`. Gizli sütunlar `AuditTrail` gizli
listesine eklenir (`AuditTrail.cs:12-21`).

**`IntegrationJob` (Y).** `05-VERI-MODELI.md` §6.9 içindeki `BackgroundJob` tablosunun entegrasyon
görünümü. Alanlar: `Id`, `CompanyId`, `ConnectionId` (boş olabilir), `Type`, `DedupeKey`, `PayloadJson`,
`Status` (`Pending`/`Running`/`Done`/`Failed`/`NeedsAttention`), `Attempts`, `MaxAttempts`,
`NextAttemptAt`, `LockedBy`, `LockedAt`, `LastErrorCode`, `LastErrorMessage`, `CreatedAt`,
`FinishedAt`. İndeksler: `(status, next_attempt_at)`, tekil `(company_id, type, dedupe_key)` kısmi
(`status IN ('Pending','Running')`).

**`IntegrationCallLog` (Y).** Amaç: giden/gelen çağrı izi. Alanlar: `Id`, `CompanyId`, `ConnectionId`,
`JobId` (boş olabilir), `Direction` (`Out`/`In`), `Method`, `Url` (maskeli), `StatusCode`, `DurationMs`,
`RequestHash`, `RequestPreview` (200 karakter, ayıklanmış), `ResponsePreview`, `ErrorCode`,
`RelatedType`, `RelatedId`, `At`. İndeksler: `(company_id, at)`, `(connection_id, at)`,
`(related_type, related_id)`.

**`WebhookEndpoint` (Y).** Alanlar: `Id`, `CompanyId`, `Name`, `Path` (tekil), `SecretEnc`, `EventsJson`,
`IsActive`, `LastCallAt`, `LastStatusCode`, `CreatedAt`, `UpdatedAt`, `IsDeleted`. İndeks:
tekil `(path)`.

**`WebhookEvent` (Y).** Amaç: gelen olayın tek işlenmesi. Alanlar: `Id`, `CompanyId`, `EndpointId`,
`ProviderEventId`, `EventType`, `PayloadHash`, `ReceivedAt`, `ProcessedAt`, `Status`, `JobId`.
İndeks: tekil `(endpoint_id, provider_event_id)`; `(company_id, received_at)`.

**`ApiKey` (Y).** Amaç: kendi açık API'miz. Alanlar: `Id`, `CompanyId`, `Name`, `Prefix` (ilk 8
karakter, görünür), `Hash` (SHA-256; **düz anahtar saklanmaz**), `ScopesJson`, `IsActive`,
`ExpiresAt`, `LastUsedAt`, `CreatedBy`, `CreatedAt`, `RevokedAt`. İndeks: tekil `(prefix)`;
`(company_id, is_active)`.

**Mevcut tablolara eklenenler.** `AuditLog` → `IntegrationConnectionId int?`, `CorrelationId string(40)?`
(bkz. `05-VERI-MODELI.md:419-422`). Başka mevcut tablo değişmez; `Expense.ClientRequestId` ve
`TripAttachment.ClientRequestId` desenleri aynen kalır (`AppDbContext.cs:266`, `:361`).

**Migration.** Altı yeni tablo ve iki boş olabilen sütun; veri taşıma yok, silme yok. Canlı veritabanı
açılışta migrate edilir (`server/YesLojistik.Api/Program.cs:141-145`).

## 7. API uçları

Yetki kodları `04-HEDEF-MIMARI.md` §7 ve `06-MUHASEBE-MOTORU.md` §7'deki adlandırmayı izler
(`entegrasyon.view`, `entegrasyon.edit`, `entegrasyon.run`).

| Metot | Yol | Ne yapar | İstek/yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/erp/integrations` | Entegrasyon listesi ve durum | `kind`, `providerKey`, `mode`, `lastOkAt`, `pendingJobs`, `failedJobs` | `integration.view` |
| GET | `/api/erp/integrations/providers` | Kayıtlı sağlayıcı adları ve yetenekleri | `key`, `name`, `capabilities[]` | `integration.view` |
| POST | `/api/erp/integrations` | Yeni bağlantı | `kind`, `providerKey`, `label`, `mode`, `username`, `secret`, `extra{}` | `integration.edit` |
| PUT | `/api/erp/integrations/{id}` | Güncelle (boş `secret` = değiştirme) | Aynı alanlar | `integration.edit` |
| DELETE | `/api/erp/integrations/{id}` | Pasife al (yumuşak silme) | — | `integration.edit` |
| POST | `/api/erp/integrations/{id}/test` | `ValidateAsync` + `HealthAsync` | `ok`, `message`, `durationMs` | `integration.run` |
| GET | `/api/erp/integration-jobs` | Kuyruk listesi | `status`, `type`, `from`, `to`, sayfalama | `integration.view` |
| POST | `/api/erp/integration-jobs/{id}/retry` | Şimdi dene (deneme sayacı sıfırlanır) | — | `integration.run` |
| POST | `/api/erp/integration-jobs/{id}/cancel` | İşi iptal et | `reason` | `integration.run` |
| GET | `/api/erp/integration-logs` | Çağrı günlüğü | `connectionId`, `direction`, `status`, `from`, `to` | `integration.view` |
| GET | `/api/erp/webhook-endpoints` | Webhook uçları | `name`, `path` (tam yol), `events[]`, `isActive` | `integration.edit` |
| POST | `/api/erp/webhook-endpoints` | Yeni uç (yol ve gizli anahtar üretilir) | `name`, `events[]` | `integration.edit` |
| POST | `/api/erp/webhook-endpoints/{id}/test` | Örnek olay gönder (kendine) | `ok`, `message` | `integration.edit` |
| POST | `/api/hooks/{path}` | **Webhook alma** (anonim, imzalı, oran sınırlı) | Sağlayıcı gövdesi | Anonim + imza |
| GET | `/api/erp/api-keys` | Anahtar listesi (düz anahtar dönmez) | `name`, `prefix`, `scopes[]`, `lastUsedAt` | `admin` |
| POST | `/api/erp/api-keys` | Yeni anahtar üret | `name`, `scopes[]`, `expiresAt` | `admin` |
| POST | `/api/erp/api-keys/{id}/revoke` | Anahtarı iptal et | — | `admin` |
| GET | `/api/public/v1/...` | Kendi açık API'si | `X-Api-Key` başlığı | Anahtar + kapsam |

**Kurallar.** (a) Açık API yalnız **kaynak** sunar (sevkiyat durumu, ekstre, fatura listesi); iş verisi
yazmaz. Yazma uçları `29-MOBIL-VE-DISA-ACILIM.md` kapsamında ayrıca değerlendirilir. (b) Anahtar
uçları yalnız yöneticiye açıktır ve anahtar üretimi bir kez gösterilir. (c) Webhook ucu `AllowAnonymous`
ama imzasız istek 401 alır; gövde hızlı yanıt kuralı gereği kuyruğa yazılıp 200 döner
(`docs/plan-erp/29-MOBIL-VE-DISA-ACILIM.md` ile aynı desen).

## 8. Yetki, onay ve denetim izi

| İş | Rol | Onay |
|---|---|---|
| Entegrasyon listesini görme | Yönetici, Muhasebe | — |
| Bağlantı ekleme/düzenleme | Yönetici | Maker-checker (iki kişi varsa) |
| Canlı moda geçirme | Yönetici | Açık onay penceresi + gerekçe |
| Test çağrısı yapma | Yönetici, Muhasebe | — |
| Hatalı işi tekrar deneme | Yönetici, Muhasebe | — |
| API anahtarı üretme/iptal | Yönetici | Denetim izi |
| Webhook anahtarı üretme | Yönetici | Denetim izi |
| Webhook olayı işleme | Sistem | — |

**Denetim izi.** Şu olaylar ayrı satır olarak `AuditLog`'a yazılır: bağlantı eklendi, gizli alan
değişti (yalnız "değişti" bilgisi, değer değil), mod değişti, bağlantı test edildi, iş elle tekrar
denendi, iş iptal edildi, API anahtarı üretildi/iptal edildi, webhook ucu açıldı/kapatıldı, imzasız
webhook reddedildi. Bugünkü `AuditTrail` yalnız veri değişikliğini yazar
(`AuditTrail.cs:54-56`); bu olaylar **elle** yazılır (bugünkü 2FA sıfırlama örneğindeki gibi,
`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:204-205`).

**Kural:** gizli alanın değeri hiçbir biçimde denetim iznine, günlüğe veya hata yanıtına girmez.

## 9. Kabul kriterleri

1. **Sır sızmaz.** Kod, ayar dosyası ve depo taramasında hiçbir gerçek anahtar/şifre bulunmaz
   (`docs/plan-erp/01-ORTAK-SARTNAME.md:20-21`); otomatik test bunu doğrular.
2. **Şifreli saklama.** Veritabanında kimlik bilgisi `v1.` önekli şifreli metindir; düz değer hiçbir
   sütunda yoktur.
3. **Okuma maskeleme.** `/api/erp/integrations` yanıtında `secret` alanı yoktur; yalnız
   `isConfigured` ve son 4 karakter döner.
4. **Kuyruk dayanıklılığı.** Sunucu iş sırasında yeniden başlatılırsa iş kaybolmaz; bir sonraki turda
   devam eder.
5. **Tekilleştirme.** Aynı `dedupeKey` ile 10 istek gönderildiğinde tek iş oluşur.
6. **Geri çekilme.** Hata veren iş beş denemede başarısız olur ve `NeedsAttention` durumuna geçer;
   ekranda görünür.
7. **Belirsiz sonuç.** Zaman aşımı senaryosunda ikinci gönderim **yapılmaz**; önce sorgu denenir
   (`docs/ENTEGRATOR-EKLEME.md:119`).
8. **Webhook tek işleme.** Aynı olay kimliği ile 5 kez çağrı yapıldığında tek iş üretilir; her çağrı
   200 döner.
9. **İmza.** Yanlış imzalı webhook 401 alır, iş üretmez, gövde saklanmaz.
10. **Oran sınırı.** Anahtar başına dakikalık sınır aşıldığında `429` ve `Retry-After` döner; giriş
    sınırı (`login`) etkilenmez.
11. **Test modu.** Test modundaki bağlantı canlı uca istek atmaz ve test belgesi resmî deftere
    aktarılmaz.
12. **Günlük temizliği.** Çağrı günlüğünde şifre/token/IBAN tam numarası bulunmaz; maskeleme testi
    geçer.
13. **Açık API kapsamı.** API anahtarı yalnız izin verilen kapsamları görür; kapsam dışı uç 403 döner.
14. **Geriye dönük uyum.** Mevcut e-Fatura, e-posta ve push davranışı değişmez; `manual` sağlayıcı
    varsayılan kalır (`EInvoiceProviders.cs:18`).
15. **Ayna ve lisans.** Ayna modunda (`MirrorWriteGuard.cs:14-18`) entegrasyon yazma uçları reddedilir;
    lisans süresi bitince salt okunur kalır (`docs/plan-erp/04-HEDEF-MIMARI.md:297`).

## 10. Testler

**Sunucu birim testleri (`server/YesLojistik.Tests/Unit`).**

| Dosya | Ne sınar |
|---|---|
| `SecretProtectorTests.cs` | Şifrele/çöz turu; yanlış anahtarla çözüm `null`; sürüm öneki; bozuk base64 |
| `IntegrationRegistryTests.cs` | Bilinmeyen sağlayıcı adı sunucuyu düşürmez; varsayılan seçilir (`EInvoiceProviders.cs:39-49` deseni) |
| `RetryPolicyTests.cs` | Bekleme dizisi (1, 5, 15, 60, 360 dk); beşinci denemede `NeedsAttention` |
| `DedupeKeyTests.cs` | Deterministik anahtar üretimi; aynı girdi aynı anahtar |
| `MaskingTests.cs` | IBAN, token, şifre maskeleme; günlük önizlemesinde sır yok |

**Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration`).** Bugünkü desen izlenir:
`WebApplicationFactory` + `HttpMessageHandler` sahtesi; **gerçek entegratöre CI'dan istek atılmaz**
(`docs/ENTEGRATOR-EKLEME.md:67`).

| Dosya | Senaryo |
|---|---|
| `IntegrationConnectionTests.cs` | Ekle/düzenle/sil; yetki (Muhasebe ekleyemez); maskeleme; audit satırı |
| `IntegrationQueueTests.cs` | Kuyruk işi üretimi, tekilleştirme, elle tekrar deneme, iptal |
| `WebhookTests.cs` | İmza doğrulama, tek işleme, hızlı yanıt, oran sınırı, `AllowAnonymous` |
| `ApiKeyTests.cs` | Anahtar üretimi, kapsam denetimi, iptal, son kullanma tarihi |
| `SandboxModeTests.cs` | Test modunda canlı adrese gidilmediği (sahte işleyici adres kaydı) |
| `AccountantExportTests.cs` (bkz. `28`) | Muhasebeci aktarımında çağrı günlüğü izi |

**Panel uçtan uca testleri (`client/e2e`).**

| Dosya | Senaryo |
|---|---|
| `integrations.spec.ts` | Ayarlar → Entegrasyonlar: liste, bağlantı formu, "Bağlantıyı dene", hata mesajı |
| `integration-queue.spec.ts` | Hatalı işi gör, tekrar dene, işin kaybolmadığını doğrula |
| `new-ui/integrations.spec.ts` | Aynı akış yeni görünümde (`uiMode.ts:8` anahtarının arkasında) |

**Ortak test kuralları.** Testler uydurma veri kullanır (`AGENTS.md` §3.3); paralel çalışan ajanlar
kendi veritabanını kullanır (`AGENTS.md` §4). Yeni e2e testleri önce arama/süzme yapar.

## 11. Efor ve bağımlılıklar

| İş kalemi | Kişi-gün | Önce bitmeli |
|---|---|---|
| `ISecretProtector` + şifreli saklama + maskeleme | 4-6 | — |
| `IntegrationConnection` + ekran (liste, form, test çağrısı) | 6-9 | Şifreli saklama |
| Kuyruk tablosu + işçi + geri çekilme + tekilleştirme | 8-12 | `05` §6.9 (`BackgroundJob`) |
| Çağrı ve hata günlüğü + günlük ekranı | 5-7 | Kuyruk |
| Webhook altyapısı (uç, imza, tek işleme, oran sınırı) | 6-9 | Kuyruk |
| Kendi API anahtarı + kapsam modeli | 5-8 | Şifreli saklama |
| Sandbox modu + mod rozetleri | 3-4 | Bağlantı ekranı |
| Entegrasyon envanteri ve sağlayıcı arayüzleri (iskelet) | 6-10 | Çerçeve |
| Testler (birim + entegrasyon + e2e) | 8-12 | Her kalemle birlikte |
| **Toplam** | **51-77** | — |

**Sıra.** (1) Şifreli saklama ve maskeleme, (2) bağlantı kaydı ve ekranı, (3) kuyruk ve işçi,
(4) webhook, (5) kendi API anahtarı, (6) sandbox, (7) tür arayüzleri. İlk üç kalem bitmeden hiçbir
gerçek entegrasyon yazılmaz: yoksa her entegrasyon kendi kuyruğunu ve kendi hata yolunu icat eder.

**Bağımlılıklar.** `04-HEDEF-MIMARI.md` (kuyruk, olay, `ICurrentUser`), `05-VERI-MODELI.md`
(`BackgroundJob`, `Attachment`), `07-YETKI-ONAY-NUMARALANDIRMA.md` (yetki kodları, maker-checker),
`08-E-BELGE-KATMANI.md` (e-belge sağlayıcısı bu çerçeveye taşınır), `15-BANKA-ENTEGRASYON.md`
(banka sağlayıcısı), `28-MUHASEBECI-PAKETI.md` (aktarım dosyası), `29-MOBIL-VE-DISA-ACILIM.md`
(açık API tüketicileri), `33-BILDIRIM-EPOSTA-SMS-KEP.md` (SMS/KEP kanalları), `38-GUVENLIK.md`
(sır yönetimi).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma | Geri alma |
|---|---|---|---|
| Bir sağlayıcının çökmesi tüm entegrasyonları kilitler | Orta | Kuyruk sağlayıcı bazında kilitlenir; devre kesici (üst üste 10 hata → 15 dk bekleme) | Devre kesici kapatılır |
| Gizli anahtarın günlüğe sızması | Yüksek | Merkezî maskeleme; önizlemede alan ayıklama; otomatik sır taraması testi | Anahtar döndürülür, günlük temizlenir |
| Şifreleme anahtarı kaybı | Yüksek | Anahtar ortam değişkeni; yedek prosedürü yazılı; kayıpta yeniden giriş akışı | Bağlantılar yeniden girilir |
| Çift gönderim (e-belge, ödeme talebi) | Yüksek | Kararlı istemci anahtarı; belirsiz sonuçta önce sorgu (`ENTEGRATOR-EKLEME.md:119`) | Sağlayıcıda iptal/itiraz |
| Webhook spam'i sunucuyu boğar | Orta | Yol tahmin edilemez + imza + oran sınırı + hızlı yanıt | Uç kapatılır |
| Test ve canlı verinin karışması | Yüksek | Zorunlu mod alanı; ayrı seri; canlı geçişte onay ve denetim izi | Mod geri alınır, belge iptal edilir |
| Kuyruk uyuyan sunucuda çalışmaz | Orta | Dış zamanlayıcıyla tetikleme; iş kaydı kalıcı, uyanınca devam eder (`docs/plan-erp/04-HEDEF-MIMARI.md:238-239`) | Elle "şimdi dene" |
| Kayıt tablosunun şişmesi | Düşük | Günlük 1 yıl, iş 2 yıl; arşiv + özet | Arşiv geri yüklenir |

**Entegrasyon envanteri ve öncelik.**

| # | Entegrasyon | Ne için | Öncelik | Belge |
|---|---|---|---|---|
| 1 | **Banka** (ekstre, ödeme talimatı) | Ekstre çekme, eşleştirme, mutabakat, talimat dosyası | P0 | `15-BANKA-ENTEGRASYON.md` |
| 2 | **e-Belge entegratörü** | e-Fatura/e-Arşiv/e-İrsaliye gönderimi ve durum | P0 | `08-E-BELGE-KATMANI.md` |
| 3 | **Muhasebe programları** (Luca/Mikro/Logo veri alışverişi) | Yevmiye fişi, mizan, cari aktarımı | P1 | `28-MUHASEBECI-PAKETI.md` |
| 4 | **Kendi açık API'si + anahtar yönetimi** | Müşteri portalı, entegratör, mobil | P1 | `29-MOBIL-VE-DISA-ACILIM.md` |
| 5 | **SMS** | "Yükünüz yolda" gibi kısa bilgilendirme | P1 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` |
| 6 | **Harita/GPS** | Filo konum kaynağı, karo sağlayıcı ayarı | P1 | `29-MOBIL-VE-DISA-ACILIM.md` |
| 7 | **Kargo** | Gönderi takip numarası, teslim durumu | P2 | `29-MOBIL-VE-DISA-ACILIM.md` |
| 8 | **e-İmza / mali mühür** | Belge imzalama, kullanıcı imzası | P2 | `08-E-BELGE-KATMANI.md` |
| 9 | **KEP / e-tebligat** | Tebligat alma ve saklama | P2 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` |
| 10 | **E-ticaret / pazaryeri** | Sipariş ve sevkiyat alışverişi | P3 | `13-SIPARIS-TEKLIF.md` |

**doğrulanacak:**

1. **Banka servisleri.** Hangi bankaların kurumsal API'si var, protokol (MT940/CAMT.053/özel REST),
   yetkilendirme yöntemi, günlük sorgu sınırı, ücret. Kaynak: kullanıcının çalıştığı bankaların
   kurumsal destek birimi.
2. **e-Belge entegratörü.** Aday firmaların API türü, test ortamı, kontör/fiyat modeli, imzayı kimin
   attığı, webhook desteği. Kaynak: entegratör teklifi ve API dokümanı; karşılaştırma tablosu
   `docs/ENTEGRATOR-EKLEME.md:95-115` hâlâ boş.
3. **E-ticaret / pazaryeri.** Hangi platformlar (kendi site, pazaryeri, sanal mağaza), sipariş çekme
   yöntemi (API/webhook), kargo etiketi üretimi, komisyon modeli. Kaynak: platform satıcı paneli ve
   API dokümanı.
4. **Kargo firmaları.** Gönderi oluşturma ve takip API'si var mı, barkod biçimi, teslim durumu kodları.
   Kaynak: kargo firmasının entegrasyon birimi.
5. **Muhasebe programları.** Luca/Mikro/Logo için **veri alışverişi** (dosya biçimi, sürüm, hangi
   alanlar) ve varsa API. Kaynak: program satıcısı ve mali müşavir; ayrıntı `28` numaralı belgede.
6. **KEP / e-tebligat.** KEP adresi zorunluluğu, tebligatın hangi kanaldan alındığı, saklama süresi.
   Kaynak: KEP sağlayıcısı ve mali müşavir/avukat onayı (`docs/hukuk/README.md:62`).
7. **e-İmza / mali mühür.** Hangi belge için hangi imza türü, akıllı kart mı uzaktan imza mı, sağlayıcı
   ücreti. Kaynak: e-imza sağlayıcısı ve GİB; mevzuat yorumu yapılmaz, mali müşavir/avukat onayı
   gerekir.
8. **SMS sağlayıcısı.** Başlık (sender ID) tahsisi, karakter sınırı, ücret, teslim raporu (DLR) ve
   webhook desteği. Kaynak: sağlayıcı sözleşmesi.
9. **Harita/GPS.** Karo (tile) sağlayıcısı ve kullanım şartları; filo takip sağlayıcısı (ör. Arvento,
   Mobiliz) için API anahtarı, sorgu sıklığı, veri sahipliği. Kaynak: sağlayıcı sözleşmesi; bugün
   karolar OpenStreetMap'e gömülüdür (`client/src/components/MapView.tsx:50-51`).
10. **Webhook imza biçimi.** Her sağlayıcıda başlık adı, algoritma, zaman damgası zorunluluğu ve
    tekrar deneme politikası. Kaynak: sağlayıcı API dokümanı.
11. **Saklama süreleri.** Çağrı günlüğü ve iş kaydı için saklama süresi ve KVKK dayanağı. Kaynak:
    avukat/mali müşavir onayı; bu belge süre **önerir**, kesinleştirmez.

**Son not.** Bu belge bir çerçeve sözleşmesidir: hangi entegrasyonun hangi protokolle konuştuğunu
**yazmaz**. Sağlayıcı sözleşmesi ve API dokümanı gelmeden hiçbir adaptör yazılmaz; bugünkü `manual`
sağlayıcı varsayılan kalır (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:18`).

Sonraki belgeyle bağlantı: `28-MUHASEBECI-PAKETI.md` bu çerçevenin ilk gerçek tüketicisidir (mali
müşavir aktarımı), `29-MOBIL-VE-DISA-ACILIM.md` kendi API'sini ve anahtar yönetimini genişletir,
`33-BILDIRIM-EPOSTA-SMS-KEP.md` kanalları aynı kuyruğa bağlar.
