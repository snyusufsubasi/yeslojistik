# 04 — Hedef Mimari

Bu belge, ERP hedefinin **teknik mimarisini** anlatır: katmanlar, modül kayıt defteri, çok şirketli veri
izolasyonu, belge numaraları, olay-güdümlü yan etkiler, arka plan işleri, dosya saklama, önbellek,
hata izleme, ortamlar ve geriye dönük uyumluluk. Kapsam kararı `03-KAPSAM-VE-KONUMLANDIRMA.md` içinde;
tablo alanları `05-VERI-MODELI.md`; fiş kuralları `06-MUHASEBE-MOTORU.md`.

## 1. Amaç ve kapsam

**Amaç.** Bugün tek firmalı, lojistik odaklı paneli; muhasebe çekirdeği + ticari modüller taşıyan,
**çok şirketli**, modül kapılı, olay-güdümlü bir ERP iskeletine taşımak. İskelet, bugünkü ekranları
bozmadan yanına büyür.

**Bu belge neyi çözmez.** Ekran tasarımı (bkz. `docs/plan/` seti), tablo alan listesi (`05`), yevmiye
fişi kuralları (`06`), fiyat/paket ticari kararı (`03`). Kod yazmaz; yalnız hangi katmanın neyi
yapacağını ve hangi sınırın bozulmayacağını tarif eder.

**Üç değişmez sınır.**

1. **Klasik görünüm korunur:** `DEFAULT_UI_MODE = 'classic'` (`client/src/lib/uiMode.ts:8`).
2. **Ayna modu korunur:** yazma istekleri sunucuda reddedilir
   (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`).
3. **Migration yalnız ekleme:** yeni boş olabilen sütun/tablo (`docs/plan-erp/01-ORTAK-SARTNAME.md:22`).

## 2. Luca'daki karşılığı

Luca, panel tasarımını **modül menüleri** üzerine kuruyor; Koza'nın sekiz menüsü (Yönetici, Stok
Yönetimi, Fatura, Finans Yönetimi, Satış Yönetimi, Satınalma Yönetimi, Analizler, Gelir-Gider Yönetimi)
`docs/plan-erp/02-LUCA-ENVANTERI.md:20-21`'de listeli. Bizim modül kayıt defteri bu sekiz menüyü
temel alır; menü **veriden** üretilir, kodda sabit liste tutulmaz.

Luca'nın çok depo, çoklu döviz ve iş merkezi özellikleri aynı envanterde geçiyor
(`02-LUCA-ENVANTERI.md:48`, `:55`, `:59`). Bizim karşılığımız: **depo** ve **iş merkezi** tabloları,
döviz için `Currency`/`ExchangeRate`.

**doğrulanacak:** Luca'nın teknik mimarisi (sunucu/veritabanı/kuyruk), çok kiracılı mı her müşteriye
ayrı kurulum mu olduğu, Luca Koza Rest API'nin kapsamı ve yetki modeli (`02-LUCA-ENVANTERI.md:53`).
Site metni bu ayrıntıları vermiyor; demo/teknik doküman gerekir.

## 3. Bizde bugün

**Katmanlar (bugün).**

| Katman | Teknoloji | Kanıt |
|---|---|---|
| Panel | React 19 + TypeScript + Vite + Tailwind v4 | `client/package.json:1` |
| API | .NET 10 (net10.0), EF Core 10, Npgsql | `server/YesLojistik.Api/YesLojistik.Api.csproj:5`, `server/YesLojistik.Infrastructure/YesLojistik.Infrastructure.csproj:21` |
| Veritabanı | PostgreSQL 16 (yerel `localhost:5432`) | `AGENTS.md` §4 |
| Mobil | Expo / React Native (şoför + yönetici modu) | `mobile/`, `docs/SURUMLER.md:3-5` |
| PDF/Excel | QuestPDF, ClosedXML | `YesLojistik.Infrastructure.csproj:10`, `:18` |
| E-posta | MailKit | `YesLojistik.Infrastructure.csproj:19` |
| Dağıtım | Render + Docker + GitHub Actions | `docs/YOL-HARITASI.md:3` |

**Tek firmalı yapı (kanıt).**

- Ayar tablosu tek satır varsayar: `Id = 1` (`server/YesLojistik.Core/Entities/CompanySettings.cs:5`).
- Fatura numarası bu tek satırdan artar: `UPDATE company_settings ... WHERE id = 1`
  (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:223-227`).
- Bütün depoda `CompanyId`/`TenantId` alanı geçmiyor (kaynak taraması boş sonuç verdi).
- Yumuşak silme global süzgeci zaten kurulu ve **tek noktadan** yönetiliyor
  (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:54-58`) — çok şirketli süzgeç aynı yere
  eklenebilir.
- `AppDbContext` zaten `ICurrentUser` alıyor (`AppDbContext.cs:8`), yani "kim" bilgisi veritabanı
  katmanında mevcut; şirket bilgisi buraya eklenebilir.

**Var olan altyapı taşları (yeniden kullanılacak).**

- Belge numarası için atomik desen (satır kilidi + UPSERT): `InvoiceService.cs:223`,
  `server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:41-46`.
- Denetim izi: `AuditLog` (`server/YesLojistik.Core/Entities/AuditLog.cs:4`) ve otomatik yazan
  `AuditTrail` (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:9`).
- Dosya saklama soyutlaması: `IFileStorage` (`server/YesLojistik.Core/Abstractions/IFileStorage.cs:3`)
  ve iki uygulama: `DatabaseFileStorage` (`server/YesLojistik.Infrastructure/Services/DatabaseFileStorage.cs:9`),
  `LocalFileStorage` (`server/YesLojistik.Infrastructure/Services/LocalFileStorage.cs:6`).
- Arka plan işleri: `DailyDigestWorker` (`server/YesLojistik.Api/Infrastructure/DailyDigestWorker.cs:6`),
  `EInvoiceStatusWorker` (`server/YesLojistik.Api/Infrastructure/EInvoiceStatusWorker.cs:10`),
  `LocationRetentionService` (`server/YesLojistik.Api/Infrastructure/LocationRetentionService.cs:7`).
- Lisans kapısı ve salt okunur kuralı: `LicenseGuard.cs:18-20`.
- Hata izi: `ExceptionHandler` (`server/YesLojistik.Api/Infrastructure/ExceptionHandler.cs:1`).

**Eksikler.**

| Eksik | Sonuç |
|---|---|
| `CompanyId` ve global şirket süzgeci | İkinci firma aynı veritabanına konamaz |
| Modül kayıt defteri (menü veriden üretilmiyor) | Menü `client/src/lib/nav.ts:19` ve `nav.ts:72` içinde **elle** yazılı |
| Genel belge numara serisi tablosu | Yalnız fatura ve e-Fatura serisi var |
| Olay (domain event) altyapısı | Yan etkiler servis içinde doğrudan çağrılıyor |
| Kalıcı kuyruk | Arka plan işleri `PeriodicTimer` ile zamanlanıyor; iş kaydı tutulmuyor |
| Modül kapısı | `LicenseInfo.Has()` var (`server/YesLojistik.Core/Licensing/LicenseInfo.cs:27`) ama üretim kodunda **çağrılmıyor** |
| Önbellek | Toplamlar her istekte yeniden hesaplanıyor (`docs/GELISTIRME-PLANI.md:193`) |
| Hata izleme servisi (traceId + dış servis) | `docs/GELISTIRME-PLANI.md:172`, `:265` |
| Ayrı test/canlı ortam ayrımı | Bugün yalnız Development/Production ve Render |

## 4. Hedef ekranlar ve alanlar

Bu belge alan listesi vermez; **hangi ekranın hangi katmandan beslendiğini** verir. Yeni ekranlar
`docs/plan-erp/01-ORTAK-SARTNAME.md:51-59`'daki ortak parçaları yeniden kullanır
(`PageShell`, `DataTable`, `MobileCards`, `Modal`, `SumStrip`, `FilterBar`/`FilterPanel`).

| Ekran | Veri kaynağı | Katman |
|---|---|---|
| Modül menüsü | Modül kayıt defteri (lisans + şirket ayarı) | API `GET /api/erp/modules` → panel |
| Hesap planı | `Account` ağacı | API + ağaç bileşeni |
| Yevmiye fişi | `JournalEntry` + `JournalLine` | API; satır toplamı ekranda |
| Mizan / kesin mizan | `LedgerBalance` (özet) | API; toplamlar veritabanında |
| Cari kart | `Contact` + ekstre | API + mevcut `CariPage` deseni |
| Stok kartı / hareket | `StockItem`, `StockMovement` | API |
| Sipariş | `Order` + `OrderLine` | API |
| Sabit kıymet | `FixedAsset` | API |
| İş kuyruğu (e-belge, ekstre) | Kuyruk tablosu | Yönetici ekranı |

**Alan tipleri (ortak kural).** Para: 2 kuruş (`client/src/lib/format.ts:1`). Tarih: `03.10.2026`
(`format.ts:11`). Plaka: büyük harf boşluklu. Oran: yüzde; tevkifat onda bir
(`server/YesLojistik.Core/Domain/InvoiceCalculator.cs:9`).

## 5. İş kuralları

### 5.1 Katmanlar ve sorumluluk sınırı

- **Panel (React):** yalnız sunum ve doğrulama (zod, Türkçe mesajlar: `client/src/lib/zodTr.ts:1`).
  İş kuralı hesaplamaz; toplam gösterir.
- **API (.NET):** yetki, doğrulama, iş kuralı, transaction sınırı. Bugünkü desen: denetleyici ince,
  servis kalın (`server/YesLojistik.Infrastructure/Services/`).
- **Veritabanı (PostgreSQL):** bütünlük, tekil indeks, şirket süzgeci, özet tablolar.
- **Mobil (Expo):** şoför akışı + yönetici özet; çevrimdışı kuyruk idempotent olmalı
  (`server/YesLojistik.Core/Entities/Expense.cs:38` içindeki `ClientRequestId` deseni).

### 5.2 Modül kayıt defteri ve menü üretimi

Tek bir `ModuleRegistry` tanımı (sunucuda) şu alanları taşır: `Key` (ör. `stock`), `Name` (ör. "Stok"),
`Group` (ör. "Stok"), `Route` (ör. `/stok`), `Permission` (ör. `stock.view`), `Feature`
(lisans özellik adı, ör. `stock`), `Package` (en düşük paket kodu), `Order`.

Akış: panel açılışta `GET /api/erp/modules` çağırır; sunucu **lisans** (`LicenseInfo.Has`,
`server/YesLojistik.Core/Licensing/LicenseInfo.cs:27`) + **rol yetkisi**
(`server/YesLojistik.Api/Auth/Policies.cs:15-17`) kesişimine göre listeyi süzer. Panel bu listeyi
menüye çevirir. Bugünkü elle yazılı menü (`client/src/lib/nav.ts:19`) **silinmez**; ERP menüsü onun
yanına, ayrı bir grup olarak gelir. Böylece klasik menüde 23 öğe (bkz. `nav.ts:19-66`) aynı kalır.

**Kural:** kapalı modülün menüde karşılığı yoktur; adres elle yazılırsa 403 ve "bu modül paketinizde
yok" ekranı görünür.

### 5.3 Çok şirketli veri izolasyonu

Bugün: tek firma, `CompanySettings.Id = 1` (`CompanySettings.cs:5`), numara üretimi aynı satırdan
(`InvoiceService.cs:223-227`), hiçbir tabloda `CompanyId` yok.

Hedef (üç aşamalı, canlı veriyi bozmadan):

**Aşama 1 — şema hazırlığı.** `Company` tablosu açılır; mevcut `CompanySettings` **aynen kalır** ve
bir `CompanyId` sütunu (boş olabilir) eklenir. Bütün iş tablolarına `CompanyId` **nullable** sütun
eklenir; indeksler `(CompanyId, ...)` olarak eklenir. Hiçbir veri taşınmaz.

**Aşama 2 — doldurma ve süzgeç.** Tek `Company` kaydı oluşturulur (bugünkü firma) ve bütün mevcut
satırların `CompanyId` alanı bu kayda yazılır. Ardından `AppDbContext.OnModelCreating` içindeki
**tek noktaya** (`AppDbContext.cs:54-58`, bugün yumuşak silme süzgecinin kurulduğu yer) ikinci bir
global süzgeç eklenir: `e.CompanyId == currentCompanyId`. Süzgeç aynı yerde toplandığı için 40'tan
fazla tabloya tek tek yazmak gerekmez.

**Aşama 3 — yazma güvenliği.** Yeni kayıt eklerken `CompanyId` otomatik yazılır (`SaveChanges`
üzerinden, `AuditTrail`'in çalıştığı yerde). Çapraz şirket erişimi testi zorunludur.

**Yetki.** Kullanıcı-şirket ilişkisi: bir kullanıcı bir ya da birden çok şirkete bağlı olabilir;
şirket seçimi oturumda taşınır. Bugün `ICurrentUser` yalnız `Id`/`Name` veriyor
(`server/YesLojistik.Core/Abstractions/ICurrentUser.cs:3`); `CompanyId` eklenir. **Kural:** kullanıcı
başka şirketin verisine erişemez; "tüm şirketler" görünümü yalnız sahip/yönetici içindir.

**Neden bu yol?** Migration yalnız ekleme kuralı korunur; canlı veritabanı açılışta migrate edilir
(`AGENTS.md` §3.7). Süzgeç tek noktada olduğu için unutulan tablo riski düşer.

### 5.4 Belge numara serileri

Bugün iki ayrı mekanizma var: fatura için `next_invoice_number` satır kilidi
(`InvoiceService.cs:223-227`), e-Fatura için seri+yıl tablosu
(`EInvoiceService.cs:41-46`). Hedef: tek `DocumentSeries` tablosu (seri tipi, önek, yıl, sıradaki
numara, şirket, kilitli mi). Kurallar:

- Numara **boşluksuz**: üretim satır kilidi/`UPSERT` ile atomik; transaction geri alınırsa numara da
  geri alınır (bugünkü davranış, `InvoiceService.cs:217-220` yorumu).
- Seri tipi başına ayrı sayaç: satış faturası, alış faturası, irsaliye, yevmiye fişi, makbuz, sipariş.
- Yıl değişiminde yeni sayaç; eski seri kilitlenir.
- Aynı şirkette iki kullanıcı aynı numarayı alamaz.
- Elle numara düzeltme yalnız yönetici + gerekçe ile ve denetim izine yazılır.

### 5.5 Olay-güdümlü yan etkiler

Bugün fatura kesilince bazı yan etkiler servis içinde doğrudan yapılıyor: e-Fatura hazırlığı aynı
transaction içinde (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:146`), bağlı
sevkiyatların işaretlenmesi (`InvoiceService.cs:149`), gönderim denemesi transaction sonrası
(`InvoiceService.cs:197-201`).

Hedef desen: **kaynak belge → olay → yan etkiler**.

| Olay | Yan etkiler |
|---|---|
| `InvoiceIssued` (satış faturası kesildi) | Cari borç hareketi, KDV hesabı, gelir hesabı, stok çıkışı (mal satışıysa), e-belge kuyruğu |
| `PurchaseInvoiceCreated` (alış faturası) | Cari alacak, KDV indirilecek, stok girişi, maliyet |
| `PaymentReceived` (tahsilat) | Kasa/banka hareketi, cari alacak kapanışı, KDV'siz fiş satırları |
| `PaymentMade` (tedarikçi ödemesi) | Kasa/banka çıkışı, cari borç kapanışı |
| `CashTransferCreated` (virman) | İki hesap hareketi, tek fiş |
| `InstrumentChanged` (çek durumu) | Cari hareket, portföy/tahsil/iade geçişi |
| `ExpenseApproved` | Gider hesabı, KDV, kasa/banka ya da şoför hesabı |

**Kurallar.** (a) Olaylar **aynı transaction** içinde işlenir; fiş ile belge ya birlikte olur ya
birlikte olmaz. (b) Dış dünyaya çıkan iş (e-posta, e-belge gönderimi, banka) **kuyruğa** yazılır,
transaction içinde denenmez; hata belgeyi geri almaz (bugünkü e-Fatura davranışı:
`EInvoiceService.cs:79-84`). (c) Aynı olay iki kez işlenmez: olay kimliği tekildir (idempotent).
(d) Yan etki üretilemezse (ör. hesap planında hesap yok) işlem durur ve kullanıcıya anlaşılır hata
verilir; sessizce geçilmez.

**Kod tarafı.** Olay altyapısı `YesLojistik.Core/Domain` altında tanımlanır, işleyiciler
`YesLojistik.Infrastructure/Services` altında yaşar. Bugünkü servis çağrıları kaldırılmaz; olay
yayınına çevrilir (davranış aynı kalır, testler korunur).

### 5.6 Arka plan işleri (kuyruk)

Bugün üç `BackgroundService` var: `DailyDigestWorker.cs:6` (15 dakikada bir), `EInvoiceStatusWorker.cs:10`,
`LocationRetentionService.cs:7` (24 saat). Sorun: iş kaydı tutulmuyor, uyuyan sunucuda çalışmıyor
(`docs/GELISTIRME-PLANI.md:173`, `:256`).

Hedef: **kuyruk tablosu + işçi**. Kuyruk kaydı: tip, anahtar (belge kimliği), durum (bekliyor/çalışıyor/
bitti/hata), deneme sayısı, son hata, planlanan zaman, kilit sahibi. Kuyruğa giren işler:

| İş | Ne yapar |
|---|---|
| `einvoice.send` | e-Fatura/e-Arşiv gönderimi |
| `einvoice.status` | Gönderilen belgenin durum sorgusu |
| `einvoice.incoming` | Gelen e-Faturayı çekme (**doğrulanacak:** entegratör API'si) |
| `bank.statement.fetch` | Banka ekstresini çekme (**doğrulanacak:** banka servisi) |
| `report.build` | Ağır rapor/Excel/PDF üretimi |
| `digest.daily` | Sabah özeti e-postası |
| `ledger.post` | Ağır fiş toplu üretimi (dönem kapanışı, aktarım sonrası) |

**Kurallar.** Aynı anahtar için ikinci iş açılmaz (tekilleştirme). İş en az bir kez çalışır; bu yüzden
işler **idempotent** yazılır. Hata hâlinde geri çekilmeli bekleme (ör. 1, 5, 15 dakika) ve en fazla
5 deneme. Kalıcı hata "müdahale gerekli" durumuna düşer ve Yönetici ekranında görünür. Kuyruk, uyuyan
sunucu sorununu çözmek için dış zamanlayıcıyla da tetiklenebilir olmalı
(`docs/GELISTIRME-PLANI.md:173`).

### 5.7 Dosya saklama

Bugün iki uygulama var: veritabanı (`DatabaseFileStorage.cs:9`) ve yerel disk (`LocalFileStorage.cs:6`),
ikisi de `IFileStorage` arayüzünü uygular (`IFileStorage.cs:3`). Hedef: **S3 uyumlu ucuncu uygulama**
(`S3FileStorage`) aynı arayüzü uygular; seçim ortam ayarıyla yapılır. Kurallar:

- Dosya yolu **şirket köküyle** başlar: `company/{companyId}/...`; çapraz şirket erişimi imkânsız olur.
- Veritabanında yalnız üst veri tutulur (`StoredFile`, `server/YesLojistik.Core/Entities/StoredFile.cs:4`);
  asıl içerik S3'te. Bu, yedeği ve 1 GB'lık veritabanı sınırını rahatlatır
  (`docs/GELISTIRME-PLANI.md:182`).
- Yükleme kimliği tekildir (bugünkü `ClientRequestId` deseni), çift kayıt oluşmaz.
- Silme yumuşaktır; muhasebe eki saklama süresi boyunca korunur.
- **doğrulanacak:** S3 sağlayıcısı, bölge (AB), şifreleme, maliyet.

### 5.8 Önbellek

Bugün ana toplamlar her istekte yeniden hesaplanıyor (`docs/GELISTIRME-PLANI.md:193`). Hedef:

- **Okuma önbelleği:** mizan/özet tablolar (`LedgerBalance`) ve gösterge toplamları; kısa süreli
  (ör. 60 sn) bellek önbelleği.
- **Kalıcı özet:** dönem kapanışında yazılan mizan satırları; rapor bunları okur.
- **Kaçırma (invalidation):** kayıt değişince ilgili özet anahtarı düşer. Kural: önbellek
  **doğruluğu** bozmaz; şüphede kalırsan hesapla.
- Ağır raporlar kuyruğa gider, hazır dosya indirilir.

### 5.9 Hata ve izleme

- Her isteğe `traceId`; hata yanıtında "Hata kodu: ..." görünür
  (`docs/GELISTIRME-PLANI.md:172`).
- Yapılandırılmış günlük (Serilog zaten bağımlılıkta: `server/YesLojistik.Api/YesLojistik.Api.csproj:12`).
- Kritik iş olayları denetim izine: fiş onayı, iptal, numara düzeltme, kullanıcı yetkisi
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:9`).
- Sağlık ucu ve dış izleme servisi: **doğrulanacak:** hangi servis, ücret, veri saklama yeri.

### 5.10 Ortamlar

| Ortam | Amaç | Veritabanı | Not |
|---|---|---|---|
| Geliştirme (dev) | Günlük geliştirme | Yerel PostgreSQL 16 | Örnek veri: `Seed__SampleData` |
| Test (test/staging) | Gerçek müşteri verisinin **kopyasıyla** prova | Ayrı veritabanı | Migration burada denenir |
| Canlı (prod) | Müşteri kullanımı | Ücretli plan, Frankfurt | Yedek + geri dönüş provası |
| Müşteri kurulumu | Firma başına ayrı kurulum | Ayrı veritabanı | `deploy/customer-*.sh`, `docs/MUSTERI-KURULUM.md` |

**Kurallar.** Sırlar yalnız ortam değişkeni/Secret olarak tutulur; dosyaya yazılmaz
(`docs/plan-erp/01-ORTAK-SARTNAME.md:21`). Migration önce test ortamında koşar; canlıda açılışta
otomatik uygulanır. Canlı veriye yazan iş öncesi yedek + onay gerekir (`AGENTS.md` §3.5). e-Fatura
**test ortamında** denenmeden canlıya gönderim açılmaz (`docs/GELISTIRME-PLANI.md:86`).

### 5.11 Geriye dönük uyumluluk

- **Klasik görünüm:** `DEFAULT_UI_MODE = 'classic'` (`uiMode.ts:8`); ERP ekranları her iki görünümde
  çalışır. Klasik menüdeki 23 öğe korunur (`client/src/lib/nav.ts:19-66`).
- **Ayna modu:** ERP yazma kökleri koruma listesine eklenir
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`); ayna açıkken kayıt girilmez.
  Ayna kapanışı `docs/YOL-HARITASI.md:99` akışıyla olur.
- **Lisans:** anahtar yoksa sahip modu sınırsız (`LicenseInfo.cs:29`); süre bitince salt okunur
  (`LicenseGuard.cs:18-20`). ERP modül kapısı **yalnız yazmayı** keser; mizan ve raporlar görüntülenebilir
  kalır (veri kaybı hissi olmasın).
- **Mevcut uçlar:** `/api/trips`, `/api/invoices` yerinde kalır; ERP uçları `/api/erp/...` altında
  açılır. Panel adresleri değişmez (`docs/KOLAYLASTIRMA-UYGULAMA.md:12-15`).
- **Veri:** yeni tablolar boş başlar; mevcut kayıtlar dönüştürülmez. Devir rakamları ve `IsLegacy`
  işaretli sevkiyatlar (`server/YesLojistik.Core/Entities/Trip.cs:17`) bugünkü anlamını korur:
  taşeron borcu ve "kesilecek fatura" hesabına girmez.

## 6. Veri modeli

Alan alan tanım `05-VERI-MODELI.md` içinde. Bu belgede mimariyi ilgilendiren dört karar:

1. `Company` yeni tablo; `CompanySettings` **korunur** ve `CompanyId` kazanır (ekleme migration).
2. Bütün iş tablolarına `CompanyId` (önce boş olabilir, sonra dolu); indeksler şirketle başlar.
3. `DocumentSeries`, `ModuleRegistry` (kod içinde sabit, tablo değil), `BackgroundJob` yeni tablolar.
4. Finansal hareket tabloları **değişmez (immutable)**: düzeltme yeni ters kayıtla yapılır; bu kural
   `06-MUHASEBE-MOTORU.md` ile aynıdır.

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET | `/api/erp/modules` | Açık modül listesi (menü) | oturum |
| GET | `/api/erp/companies` | Kullanıcının şirketleri | oturum |
| POST | `/api/erp/companies/{id}/select` | Şirket değiştir | oturum |
| GET/POST | `/api/erp/accounts` | Hesap planı | `accounting.view` / `.edit` |
| GET/POST | `/api/erp/journal-entries` | Yevmiye fişi | `ledger.view` / `.edit` |
| POST | `/api/erp/journal-entries/{id}/approve` | Fiş onayı (maker-checker) | `ledger.approve` |
| POST | `/api/erp/journal-entries/{id}/reverse` | Ters kayıt | `ledger.approve` |
| GET | `/api/erp/trial-balance` | Mizan / kesin mizan | `ledger.view` |
| GET | `/api/erp/ledger/{accountId}` | Muavin | `ledger.view` |
| POST | `/api/erp/periods/{id}/close` | Dönem kapatma | `admin` |
| GET/POST | `/api/erp/stock/items` | Stok kartı | `stock.view` / `.edit` |
| POST | `/api/erp/stock/movements` | Stok hareketi | `stock.edit` |
| GET/POST | `/api/erp/orders` | Sipariş | `order.view` / `.edit` |
| GET/POST | `/api/erp/assets` | Sabit kıymet | `asset.edit` |
| GET | `/api/erp/jobs` | Kuyruk durumu | `admin` |
| POST | `/api/erp/jobs/{id}/retry` | İşi yeniden dene | `admin` |

**Kurallar.** Bütün yazma uçları: lisans kapısı → yetki → doğrulama → transaction → denetim izi.
Yanıtlar `PagedResult` deseniyle listelenir (mevcut desen: `server/YesLojistik.Core/Dtos/`).
Hata gövdesi `ProblemDetails` + `traceId`.

## 8. Yetki, onay ve denetim izi

Bugün üç rol (`server/YesLojistik.Api/Auth/Policies.cs:15-17`). Hedef: rol + **ince yetki** listesi.
İlkeler:

- **En az yetki:** yeni kullanıcı hiçbir ERP modülünü görmez; yetki açıkça verilir.
- **Maker-checker:** yevmiye fişi onayı, dönem kapatma, kıymet çıkışı, elle numara düzeltme.
- **Değiştirilemez kayıt:** onaylanmış fiş silinmez; düzeltme ters kayıtla.
- **Denetim izi:** kim, ne zaman, hangi şirket, hangi belge, hangi alan değişti
  (`AuditLog.cs:4`, `AuditTrail.cs:9`). ERP olayları da aynı izi kullanır.
- **Şirket sınırı** yetkiden önce gelir: yanlış şirketin kimliğiyle istek gelirse 404/403.

## 9. Kabul kriterleri

| # | Ölçüt | Hedef |
|---|---|---|
| 1 | Klasik görünüm | Menüde 23 öğe aynı (`nav.ts:19-66`); hiçbir ekran kaybolmaz |
| 2 | Klasik davranış | Mevcut sunucu testleri ve 58 e2e senaryosu yeşil kalır (`docs/GELISTIRME-PLANI.md:305`) |
| 3 | Çok şirketli izolasyon | İki şirketli kurulumda 0 çapraz kayıt; en az 5 otomatik test |
| 4 | Modül kapısı | Kapalı modül yazma ucu 403; menüde görünmez; en az 3 test |
| 5 | Belge numarası | 100 eşzamanlı kayıtta boşluk 0, çakışma 0 |
| 6 | Olay atomikliği | Fiş ile belge ya birlikte oluşur ya hiç; testle kanıtlı |
| 7 | Kuyruk | Aynı anahtar iki kez işlenmez; hata sonrası 5 denemede durur |
| 8 | Dosya | Şirket kökü dışına çıkılamaz; yol denemesi testi |
| 9 | Sır yok | Depoda ve günlükte anahtar/şifre bulunmaz |
| 10 | Geri dönüş | Modül bayrağı kapatılınca eski ekranlar aynen çalışır |

## 10. Testler

- **Birim:** numara üretimi, olay işleyicileri, süzgeç ifadesi üretimi, kuyruk tekilleştirmesi.
  Yer: `server/YesLojistik.Tests/Unit/`.
- **Entegrasyon:** çok şirketli süzgeç (izin/sızıntı), fatura → fiş zinciri, dönem kapatma, e-belge
  kuyruğu. Yer: `server/YesLojistik.Tests/Integration/` (bugün 40'tan fazla sınıf var).
- **e2e:** modül menüsü pakete göre görünürlük, hesap planı ekranı, yevmiye fişi dengesi, klasik
  görünümde kayıp yok. Yer: `client/e2e/` ve `client/e2e/new-ui/`.
- **Yük/çakışma:** iki eşzamanlı fatura, iki eşzamanlı kuyruk işçisi.
- **Geri dönüş testi:** modül bayrağı kapatma, ayna açma, lisans bitirme senaryolarında
  beklenen mesajlar.

## 11. Efor ve bağımlılıklar

| İş | Efor (kişi-gün) | Bağımlılık |
|---|---|---|
| `Company` + `CompanyId` + global süzgeç | 15-25 | `05-VERI-MODELI.md` |
| `ICurrentUser`'a şirket bilgisi | 2-3 | Yukarıdaki |
| Modül kayıt defteri + menü ucu | 5-8 | Lisans altyapısı (var) |
| `DocumentSeries` + numara servisi | 3-5 | `05` |
| Olay altyapısı + ilk 6 olay | 10-15 | Muhasebe çekirdeği (`06`) |
| Kuyruk tablosu + işçi | 8-12 | — |
| S3 uyumlu `IFileStorage` uygulaması | 5-8 | Sağlayıcı kararı |
| Önbellek + özet tablolar | 8-12 | `06` |
| traceId + hata izleme | 3-5 | — |
| Test/canlı ortam ayrımı | 3-5 | Sunucu kararı |

**Sıra:** `06-MUHASEBE-MOTORU.md` → olay altyapısı → modül kayıt defteri → stok/sipariş. Çok şirketli
temel, muhasebe çekirdeğinden **önce** bitmeli; yoksa fiş tablolarına `CompanyId` eklemek ikinci bir
migration turu gerektirir.

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma |
|---|---|---|
| Global süzgeç unutulan tablo | Yüksek (veri sızıntısı) | Süzgeç tek noktada (`AppDbContext.cs:54-58`); "süzgeçsiz tablo" otomatik testi |
| Canlı migration bozar | Yüksek | Yalnız ekleme; önce test ortamında prova; açılış öncesi yedek |
| Olay döngüsü / çift fiş | Yüksek | Idempotent olay kimliği; aynı belgeye tek fiş kuralı |
| Kuyruk işi sonsuz tekrar | Orta | Deneme sınırı 5, geri çekilmeli bekleme, "müdahale gerekli" durumu |
| Önbellek yanlış rakam gösterir | Orta | Kısa süre; değişimde anahtar düşürme; mizan her zaman hesaplanabilir |
| S3 sağlayıcısı ve bölge kararı gecikir | Düşük | Arayüz hazır (`IFileStorage.cs:3`); geçiş ayarla yapılır |
| Uyuyan sunucuda kuyruk durur | Orta | Dış zamanlayıcı tetikleyicisi (`docs/GELISTIRME-PLANI.md:173`) |
| Terim/klasik görünüm kayması | Düşük | Kabul kriteri 1-2 |

**doğrulanacak:** Luca'nın teknik mimarisi ve çok kiracılılık modeli; Luca Koza Rest API kapsamı;
e-Fatura entegratör API'si (gönderim, durum, gelen belge, iptal); banka ekstresi servisleri ve
protokolleri; S3 uyumlu sağlayıcı/bölge/şifreleme/maliyet; dış izleme servisi; abonelik ödeme
sağlayıcısı; KVKK saklama süreleri ve konum verisi saklama kuralı. Mevzuat yorumu yapılmaz;
**mali müşavir/avukat onayı gerekir**.

Sonraki belgeyle bağlantı: `05-VERI-MODELI.md` bu mimarinin tablolarını, `06-MUHASEBE-MOTORU.md` olay
ve fiş kurallarını açar; `03-KAPSAM-VE-KONUMLANDIRMA.md` hangi modülün hangi pakette olduğunu belirler.
