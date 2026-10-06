# 39 — Yol Haritası ve Efor

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır. Bu bir
**modül** dokümanı değil, modüllerin **sırası, süresi ve kabul anı** dokümanıdır: "hangi iş önce, kaç
gün, kim görür, ne zaman 'bitti' deriz" sorularının cevabıdır. Buradaki hiçbir süre ölçülmüş gerçek bir
hız kaydına dayanmaz; hangi varsayıma dayandığı **her tablonun altında** yazılıdır.

## 1. Amaç ve kapsam

**Bu doküman neyi çözer?**

1. `docs/plan-erp/` altındaki 03–38 arası modül dokümanlarını **uygulanabilir bir sıraya** dizer.
   Modüller kendi başına iş paketidir; hangi paketin hangisinden önce biteceğini bu doküman söyler.
2. Her modülün §11 "Efor ve bağımlılıklar" bölümündeki **kişi-gün** rakamlarını tek tabloda toplar,
   çift saymayı işaretler ve toplam büyüklüğü çıkarır.
3. Bu toplamı **takvime** çevirir: 1, 2 ve 4 geliştirici senaryosunda hangi faz hangi ayda biter.
4. **Müşteriye gösterilecek kilometre taşlarını** ve **ilk 90 günün somut iş listesini** yazar.
5. Tek bozulmaz kuralı her fazın içine gömer: **mevcut panel kesintisiz çalışmaya devam eder.**

**Kapsam içinde:** faz tanımları (F0–F11), faz başına amaç/kapsam/çıktı/süre/bağımlılık/kabul/risk,
kişi-gün tablosu, toplam efor, takvim senaryoları, kesintisizlik kuralı, kilometre taşları, ilk 90 gün.

**Kapsam dışında:**

- Modül içerikleri (ekran, alan, API, iş kuralı) — her biri kendi dokümanında. Burada yalnız **atıf**
  vardır.
- Risk kaydının tamamı ve varsayım listesi — `41-RISKLER-VE-VARSAYIMLAR.md`.
- UAT senaryoları, pilot seçimi, canlıya geçiş adımları ve geri dönüş planı —
  `40-UAT-KABUL-CANLIYA-GECIS.md`.
- Fiyat, paketleme ve satış takvimi — `docs/SATIS-PLANI.md`.
- Ölçüm hedefleri (yanıt süresi, RPO/RTO) — `36-PERFORMANS-OLCEK.md`.

**Bu dokümanın çözmediği bir şey daha var:** kaç geliştiriciyle çalışılacağı. Aşağıdaki senaryolar yan
yana verilir; **kararı kullanıcı verir** (§12.3 ve `41` §5.8).

## 2. Luca'daki karşılığı

Luca'nın sitesinde bizim gibi bir "faz takvimi" yayınlanmaz; okunabilen maddeler **hangi işlerin bir
arada geldiğini** gösterir ve faz sıralamamızı bunlara dayandırdık:

- **Otomatik firma kurulumu** (`docs/plan-erp/02-LUCA-ENVANTERI.md:27`) — yeni firma açılışı ile hesap
  planı ve varsayılanlar birlikte gelir. Bizde bu, **F0 kurulum fazıdır**.
- **Excel ile veri aktarımı: cari, stok, çek-senet, fatura, yevmiye fişi, banka ekstreleri**
  (`02-LUCA-ENVANTERI.md:28-29`) — sıralama "kart → belge → defter"tir. Bizim F0 → F1 → F2 sıramız
  aynı mantıktır.
- **Koza menü yapısı** (`02-LUCA-ENVANTERI.md:20-23`): Yönetici, Stok, Fatura, Finans (Standart) +
  Satış, Satınalma, Analizler, Gelir-Gider (Profesyonel). Sekiz menü, F0–F8 hattımızın omurgasıdır.
- **Barkod: faturadan hızlı barkod ile sayım ve seri takibi** (`02-LUCA-ENVANTERI.md:30`) — barkod
  faturadan **sonra** gelir; F2'den önce F3'e geçmenin satışa değeri yoktur.
- **Yevmiye defterinin e-Defter standartlarına aktarımı; banka ekstrelerinin entegrasyonu**
  (`02-LUCA-ENVANTERI.md:42`) — muhasebe çekirdeği (F1) bitmeden bunlar yazılamaz.
- **Siparişten teslimata satış-pazarlama akışı** ve **ihtiyaç tespiti → talep → planlama**
  (`02-LUCA-ENVANTERI.md:60-61`) — F5'in iki ayağı; ikisi de stok (F3) ve cari (F2) ister.
- **Üretim yönetimi ve planlama** (`02-LUCA-ENVANTERI.md:63`) — Luca Koza'nın en ağır modülü; bizde F8
  ve **varsayılan olarak kapalıdır** (§5.4).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'nın gerçek sürüm temposu (hangi yıl hangi modül çıktı) ve sürüm notlarının
arşivi — kaynak: Luca sürüm notları sayfası veya satış ekibi. **doğrulanacak:** Luca'da modüllerin
açılıp kapanabildiği (paket kapısı) ve geçiş döneminde eski sürümün ne kadar desteklendiği — kaynak:
Luca satış/teknik ekibi. **doğrulanacak:** Luca Net One'ın bulut sürümünde çok şirketli yapı ve
konsolidasyon kapsamı — kaynak: <https://www.lucanetone.com.tr> (içerik okunamadı,
`02-LUCA-ENVANTERI.md:13`).

## 3. Bizde bugün

Bugün elimizde bir **faz takvimi yok**; iş sırası iki ayrı yerde tutuluyor ve ikisi de ERP planını
kapsamıyor:

- `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:64-90` — P0/P1 öncelikleri (görsel jetonlar, ortak parçalar,
  Bugün ekranı, sevkiyat formu). Bunlar **kolaylaştırma** işidir, ERP modülü değildir.
- `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:203-224` — kapsam kararı ("plan baştan sona uygulanacak"),
  çalışma modu (dal + CI kapısı), yayın disiplini ve adım büyüklüğü. Bu kurallar bu dokümanın
  **altlığıdır**, tekrar yazılmaz.
- `docs/YOL-HARITASI.md:98-101` — A9 geçiş günü akışı; `docs/GELISTIRME-PLANI.md:139-198` — aşama
  1/2/3 iş listeleri. Üçü de **nakliye paneli** kapsamındadır.

**Kanıtlı bugünkü durum (fazların başlangıç noktası):**

| Bugünkü gerçek | Kanıt | Fazlara etkisi |
|---|---|---|
| Canlı panel Render'da yayında; `main`'e giden her şey canlıya çıkar | `AGENTS.md:9` | Her faz sonu = canlıya çıkış; faz sonu test şartı |
| Veritabanı PostgreSQL; Render'ın ücretsiz planında ve **28 Ekim'de silinir** | `render.yaml:4`, `AGENTS.md:112` | **F0'dan önce** veritabanı kararı verilmezse hiçbir faz güvenli değil |
| pratikortam aynası günde 4 kez çalışıyor | `.github/workflows/mirror.yml:10` | Yayınlar bu saatlerin dışına planlanır (§5.3) |
| Ayna açıkken panelde yazma engelli | `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18` | ERP yazma uçları bu koruma listesine eklenir |
| Klasik görünüm varsayılan | `client/src/lib/uiMode.ts:8` | Yeni ERP ekranları iki görünümde de çalışacak |
| Klasik menüde 23 öğe var | `client/src/lib/nav.ts:19-66` | Fazlara yeni menü öğeleri eklenirken bu liste korunur |
| Sayfalama zorunlu, sayfa üst sınırı 500 | `server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:9` | F0–F5 listeleri bu sözleşmeyi kullanır |
| CI'da 5 iş var: legacy, server, client, mobile, e2e | `.github/workflows/ci.yml:8-82` | Her faz testlerini bu işlerin içine ekler |
| Yedek ve geri yükleme iş akışları var | `.github/workflows/backup.yml`, `.github/workflows/restore.yml` | Geçiş öncesi yedek adımı bu iki işi kullanır (`40`) |

**Eksik liste (fazların kapatacağı):** muhasebe çekirdeği (hesap planı, yevmiye, mizan, dönem),
çok şirketli temel, belge serisi, e-belge kuyruğu, cari birleşik modeli, stok/depo, sipariş/satın alma,
üretim, sabit kıymet, banka entegrasyonu/mutabakat, personel, rapor tasarımcısı, entegrasyon çerçevesi,
muhasebeci paketi, çok şirketli konsolidasyon, portal, göç araçları
(`docs/plan-erp/02-LUCA-ENVANTERI.md:88-95`).

## 4. Hedef ekranlar ve alanlar

Bu dokümanda "ekran" yoktur; **faz kapıları** vardır. Aşağıdaki tablo her fazın görebildiğiniz çıktısını
ve kullanıcıya görünen kabul anını gösterir. Ekranların alan alan tanımı ilgili modül dokümanındadır.

| Faz | Görünen çıktı (ekran / belge / uç) | Kim görür | Tanım yeri |
|---|---|---|---|
| **F0** | Şirket seçici + Ayarlar → Şirket/Mali yıl/Seri; Rol ve İzinler matrisi; Onay Merkezi; Dönem kilidi; modül kapısı | yönetici | `04`, `05`, `07`, `30`, `31`, `34` |
| **F1** | Hesap Planı ağacı; Yevmiye Fişi (giriş/denge/ters kayıt); Mizan + Muavin; KDV Özeti taslağı; Cari Kartı ve hareket | muhasebe, yönetici | `06`, `09` |
| **F2** | Satış faturası (satır tabanlı, iskonto, döviz); e-Belgeler (5 sekme); Tahsilat + mahsup; "Faturalandırılacaklar" | satış, muhasebe | `08`, `11`, `13` |
| **F3** | Stok kartı + kategori; Depo/bölüm; Stok hareketi; Bakiye/envanter paneli; Sayım oturumu + fark; barkod | depo | `10`, `21` |
| **F4** | Kasa + gün sonu; Banka hesabı + ekstre yükleme/eşleştirme/mutabakat; Çek-senet portföyü | muhasebe, yönetici | `14`, `15`, `16` |
| **F5** | Talep → Sipariş → Mal kabul → Alış faturası; üç yönlü eşleştirme; fiyat listeleri; teklif hunisi (CRM) | satın alma, satış | `12`, `13`, `25` |
| **F6** | Rapor Merkezi kataloğu; R1–R22 rapor seti; PDF/Excel şablon birliği; Rapor Tasarımcısı | yönetici, mali müşavir | `23`, `24`, `36` |
| **F7** | Personel kartı + puantaj + izin; Sabit kıymet + amortisman; Gider türü/merkezi + bütçe | İK, yönetici | `17`, `18`, `19` |
| **F8** | Reçete + üretim emri + maliyet; İthalat dosyası + masraf dağıtımı; Kur/kur farkı | üretim, ithalat | `20`, `22` |
| **F9** | Entegrasyon Merkezi (bağlantı, kuyruk, çağrı günlüğü, webhook); Muhasebeci Paketi; Bildirim Merkezi; Güvenlik Merkezi; belge arşivi; mobil/açık API | yönetici, mali müşavir | `26`, `27`, `28`, `29`, `33`, `34`, `35`, `36`, `38` |
| **F10** | Şirket grubu + konsolide rapor; Müşteri/tedarikçi portalı; mobil yönetici ekranları | yönetici, müşteri | `29`, `30` |
| **F11** | Göç/aktarım sihirbazı (kuru prova + rapor); UAT kanıt dosyası; canlıya geçiş kontrol listesi; test kapıları | herkes | `32`, `35`, `37`, `40` |

**Kural:** hiçbir faz, kendinden önceki fazın ekranını **kaldırmaz**. Yeni ekranlar eklenir; mevcut
Sevkiyatlar, Cari, Faturalar, Tahsilatlar ekranları aynen kalır
(`docs/plan-erp/04-HEDEF-MIMARI.md:289-303`).

## 5. İş kuralları

### 5.1 Faz kapısı: bir faz "bitti" sayılmazsa sonraki başlamaz

1. Fazın **bütün** iş kalemleri tamam (kısmi kalem "yapıldı" sayılmaz).
2. Fazın §10 test maddeleri yeşil: `dotnet test`, `npm run lint && npm run build`,
   `npx playwright test`. Yerelde koşulamıyorsa CI'da yeşil
   (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:209-212`).
3. Fazın §9 kabul kriterleri **kanıtla** karşılanmış: ekran görüntüsü, mizan çıktısı, test raporu.
4. Yayın disiplini uygulanmış: dal → yeşil CI → `main` (`KOLAYLASTIRMA-SIRADAKI-ISLER.md:213-221`).
5. Faz sonunda `00-DIZIN.md` **elle güncellenmez**; ölçüm aracı çalıştırılır
   (`tools/docs/referans-denetimi.ps1`).

### 5.2 Bağımlılık sırası (bozulmaz)

- **Veritabanı kararı → F0.** Ücretsiz plan 28 Ekim'de siliniyor (`AGENTS.md:112`). F0, ücretli plana
  geçilmeden **başlamaz**.
- **F0 → F1.** Çok şirketli temel, muhasebe çekirdeğinden önce bitmeli; yoksa fiş tablolarına
  `CompanyId` eklemek ikinci bir migration turu gerektirir (`04-HEDEF-MIMARI.md:394-396`).
- **F1 → F3 ve F5.** Fiş kuralları netleşmeden stok ve sipariş yazılmaz; yanlış hareket üretir
  (`03-KAPSAM-VE-KONUMLANDIRMA.md:302-303`).
- **F2 → F5 ve F8.** Satır/iskonto/KDV ortak kuralları F2'de oturur; satın alma ve ithalat onu
  kullanır (`11-SATIS-FATURA.md:341-344`).
- **F3 → F8.** Stok kartı, depo ve maliyet yöntemi olmadan üretim uygulanamaz — "zorunlu ön koşul"
  (`20-URETIM-RECETE.md:349`).
- **F1 → F6.** Mizan/muavin raporları (R18) muhasebe çekirdeği bitmeden yapılamaz
  (`23-RAPORLAMA-BI.md:525-529`).
- **F9 → gerçek entegrasyonlar.** Şifreli saklama, bağlantı kaydı ve kuyruk bitmeden hiçbir gerçek
  entegrasyon yazılmaz (`27-ENTEGRASYONLAR.md:501-505`).
- **F0 → F11.** Göç araçları çok şirketli yapıyı ve seri/numara altyapısını ister.

### 5.3 Kesintisizlik kuralı: "mevcut panel çalışmaya devam eder"

Planın en sert kuralıdır. Beş maddesi her fazda aynen uygulanır:

1. **Migration yalnız ekleme.** Yeni boş olabilen sütun/tablo; veri silen/dönüştüren migration yok
   (`docs/plan-erp/01-ORTAK-SARTNAME.md:22-23`).
2. **Yeni özellik varsayılan kapalı.** Modül kapısı yalnız **yazmayı** keser; okuma (mizan, rapor)
   açık kalır (`04-HEDEF-MIMARI.md:296-298`).
3. **Klasik görünüm bozulmaz.** `DEFAULT_UI_MODE = 'classic'` (`client/src/lib/uiMode.ts:8`) faz
   boyunca değişmez.
4. **Mevcut uçlar yerinde kalır.** `/api/trips`, `/api/invoices` kaldırılmaz; ERP uçları
   `/api/erp/...` altında açılır (`04-HEDEF-MIMARI.md:299-300`).
5. **Ayna işiyle çakışma yok.** Ayna 07:07, 12:07, 17:07, 22:07'de çalışır
   (`.github/workflows/mirror.yml:10`); `main`'e alma bu saatlerin **dışında** ve ayna koşusu
   bittikten sonra yapılır (`KOLAYLASTIRMA-SIRADAKI-ISLER.md:216-219`).

**Ek kural:** her faz sonunda `Canlı kontrol` (smoke) işi yeşil olmalı
(`.github/workflows/smoke.yml`); kırmızı ise sonraki faza geçilmez.

### 5.4 Fazlarda "kapalı doğan" modüller

Bazı modüller **yazılır ama varsayılan olarak kapalı** doğar; müşteri istemedikçe açılmaz:

| Modül | Neden kapalı doğar | Açma koşulu |
|---|---|---|
| Üretim/reçete (F8) | Lojistik ve ticaret müşterisinde karşılığı yok; ağır modül | Müşteri talebi + reçete verisi |
| İthalat/ihracat (F8) | Döviz dosyası ve masraf dağıtımı özel uzmanlık ister | İthalat yapan müşteri |
| Personel puantajı (F7) | **Tam bordro kapsam dışıdır** (karar bekliyor, `41` §5.8) | İK modülünün açılması |
| e-Defter üretimi (F1) | Biçim doğrulanana kadar üretim **kapalı**; dosya üretilse bile "taslak" | Berat/defter biçimi doğrulaması (`06-MUHASEBE-MOTORU.md:476`) |
| Müşteri portalı (F10) | Yeni bir dış yüz; KVKK ve marka hazırlığı ister | KVKK metinleri + pilot onayı |
| OCR (belge arşivi) | Sağlayıcı doğrulanmadı | Sağlayıcı + ücret kararı (`26-DOKUMAN-YONETIMI.md`) |

**Kural:** kapalı modülün veri modeli ve testleri yine de yazılır; yalnız menü/ekran kapısı kapalıdır.
Böylece açmak "tek satır ayar" olur — modül kapısı `34-LISANS-ABONELIK-KONTOR.md` §11/3 ile gelir.

## 6. Veri modeli

Bu doküman **yeni tablo tanımlamaz**. Fazların hangi tabloları getirdiği aşağıdadır; alan alan tanım
`05-VERI-MODELI.md` içindedir.

| Faz | Getirdiği tablolar / eklemeler | Migration türü |
|---|---|---|
| F0 | `Company`, `CompanySettings.CompanyId`, bütün iş tablolarına `CompanyId` (önce boş), `CompanyUser`, `RolePermission`, `ApprovalRequest`, `AccountingPeriod`, `NumberSeries`, `SetupChecklist`, `ModuleState` | yalnız ekleme |
| F1 | `Account`, `JournalEntry`, `JournalLine`, `LedgerBalance`, `VatCode`, `WithholdingCode`, `Contact`/`ContactAddress`, `CustomerContact`, `Reconciliation`, `PaymentAllocation` | yeni tablo + mevcut `Customers`/`Suppliers`'a nullable alanlar |
| F2 | `Invoices`'a satır/iade/döviz sütunları, `InvoiceLines`, `EInvoiceArchive`, `EInvoiceStatusHistory`, gelen kutusu tablosu | yalnız ekleme |
| F3 | `StockItem`, `StockCategory`, `Warehouse`, `WarehouseSection`, `StockMovement`, `StockBalance`, `StockCosting`, `StockCount`, `StockCountLine`, `StockLocation` | yeni tablo |
| F4 | Kasa hareket eklemeleri, `BankAccount`, `BankStatement`, `BankStatementLine`, `Cheque`, `Note` | yeni tablo |
| F5 | `PurchaseRequest`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt`, fiyat listeleri, `Order`/`OrderLine`, `Lead` (CRM) | yeni tablo |
| F6 | `ReportDefinition` (katalog), `ReportColumnPreference`, rapor çıktı kuyruğu | yalnız katalog + kuyruk |
| F7 | Personel ek tabloları (6 tablo), `FixedAsset` + amortisman planı, `ExpenseType`, `ExpenseCenter`, `Budget` | yeni tablo |
| F8 | `Recipe`, `RecipeComponent`, `ProductionOrder`, ithalat dosyası tabloları, `Currency`, `ExchangeRate` | yeni tablo |
| F9 | `IntegrationConnection`, `BackgroundJob` (kuyruk), çağrı/hata günlüğü, webhook tabloları, API anahtarı, `DocumentArchive`/`Version`/`Link`/`Tag`, `NotificationTemplate`/`Message`, `LicenseCredential`, denetim izi eklemeleri | yeni tablo |
| F10 | Şirket grubu tabloları, konsolidasyon ve eliminasyon eşlemesi, portal kullanıcı/erişim tabloları | yeni tablo |
| F11 | Göç/aktarım tabloları (`ImportBatch`, `ImportBatchRow`, `ImportProfile`) | yeni tablo |

**Ortak kural:** her yeni iş tablosunda `CompanyId` vardır ve indeksler `CompanyId` ile başlar
(`04-HEDEF-MIMARI.md:310`). Finansal hareketler **değişmez**: düzeltme yeni ters kayıtla yapılır
(`04-HEDEF-MIMARI.md:312-313`).

## 7. API uçları

Bu doküman yeni uç tanımlamaz; fazların **hangi uç ailesini** açtığını listeler. Metot/yol/yetki
ayrıntısı ilgili modül dokümanındadır. Ortak kural: ERP uçları `/api/erp/...` ön ekiyle açılır,
mevcut uçlar kaldırılmaz (`04-HEDEF-MIMARI.md:299`).

| Faz | Uç aileleri | Yetki |
|---|---|---|
| F0 | `/api/erp/companies`, `/api/erp/periods`, `/api/erp/series`, `/api/permissions/*`, `/api/erp/approvals`, `/api/erp/modules`, `/api/erp/setup/*` | yönetici; `modules` oturum |
| F1 | `/api/erp/accounts`, `/api/erp/journal-entries`, `/api/erp/trial-balance`, `/api/cari` | muhasebe + maker-checker |
| F2 | `/api/erp/invoices`, `/api/erp/e-documents/*`, `/api/erp/collections` | satış (oluşturma), muhasebe (onay) |
| F3 | `/api/erp/stock-items`, `/api/erp/warehouses`, `/api/erp/stock-movements`, `/api/erp/stock-counts` | depo + muhasebe (onay) |
| F4 | `/api/erp/cash`, `/api/erp/bank-accounts`, `/api/erp/bank-statements`, `/api/erp/cheques` | muhasebe; ödeme talimatı maker-checker |
| F5 | `/api/erp/purchase-requests`, `/api/erp/purchase-orders`, `/api/erp/goods-receipts`, `/api/erp/leads` | satın alma + limit onayı |
| F6 | `/api/erp/reports/catalog`, `/api/erp/reports/{kod}`, `/api/erp/report-designer/*` | rapor yetkisi (katalog süzülür) |
| F7 | `/api/erp/staff`, `/api/erp/timesheets`, `/api/erp/leave`, `/api/erp/fixed-assets`, `/api/erp/expense-centers` | İK/yönetici; çıkış maker-checker |
| F8 | `/api/erp/recipes`, `/api/erp/production-orders`, `/api/erp/import-files`, `/api/erp/exchange-rates` | üretim/ithalat |
| F9 | `/api/erp/integrations`, `/api/erp/jobs`, `/api/erp/webhooks/*`, `/api/erp/api-keys`, `/api/erp/documents`, `/api/erp/notifications`, `/api/erp/accountant/*`, `/api/erp/security/*` | yönetici; webhook imza |
| F10 | `/api/erp/group`, `/api/erp/consolidation`, `/api/portal/*` | grup yöneticisi / portal kullanıcısı |
| F11 | `/api/erp/imports/*`, `/api/erp/uat/*`, `/api/erp/cutover/*` | yönetici + kuru prova ayrı uç |

## 8. Yetki, onay ve denetim izi

**Faz kapısı ile yetki ilişkisi.** Yeni bir faz ekranı açıldığında üç şey birden hazır olur:

1. **Yetki kodu** `RolePermission` tablosunda tanımlı (`07-YETKI-ONAY-NUMARALANDIRMA.md`).
2. **Onay akışı** gerekiyorsa `ApprovalRequest` üzerinden maker-checker; tek kişi hem yapan hem onaylayan
   olamaz.
3. **Denetim izi** olayı: onay, iptal, numara düzeltme, yetki değişikliği
   (`04-HEDEF-MIMARI.md:271-272`).

| Faz | Rol matrisi eklemesi | Onay (maker-checker) | Denetim izi olayı |
|---|---|---|---|
| F0 | Şirket yöneticisi, muhasebe, depo, satış, satın alma, İK rolleri | Rol/izin değişikliği, modül aç/kapa | Yetki değişikliği, dönem kilidi |
| F1 | Muhasebe (fiş girişi/onayı) | Fiş onayı; ters kayıt gerekçesi | Fiş onayı, iptal, hesap kodu değişikliği |
| F2 | Satış (fatura taslağı), muhasebe (kesinleştirme) | İndirim limiti üstü, iptal, iade | Fatura durumu, e-belge gönderimi |
| F3 | Depo (hareket), muhasebe (maliyet) | Sayım farkı kapatma | Stok hareketi iptali, sayım kapanışı |
| F4 | Kasiyer (limitli), muhasebe | Gün sonu farkı, ödeme talimatı | Kasa farkı, çek durumu |
| F5 | Satın alma (talep/sipariş) | Talep onay limiti, tolerans dışı eşleştirme | Sipariş onayı, fiyat değişikliği |
| F6 | Rapor yetkisi (katalog süzülür) | — | Dışa aktarma kaydı |
| F7 | İK, yönetici | Kıymet çıkışı, avans | Puantaj kilidi, amortisman |
| F8 | Üretim, ithalat | Reçete onayı, dosya kapama | Üretim emri kapanışı |
| F9 | Yönetici (bağlantı/anahtar) | Anahtar üretme/iptal, aktarım onayı | Çağrı günlüğü, webhook reddi, gönderim günlüğü |
| F10 | Grup yöneticisi, portal kullanıcısı | Firmalar arası işlem onayı | Şirketler arası erişim kaydı |
| F11 | Yönetici | Göç kuru prova onayı, geçiş adımı | Toplu aktarım ve geçiş kaydı |

**KVKK notu:** denetim izi ve saklama kuralları `35-DENETIM-IZI-KVKK-UYUM.md` ile ortaktır; iki yıllık
otomatik silme kaldırılır, yerine politika tabanlı arşivleme gelir. Mevzuat yorumu bu dokümanda
yapılmaz; **hukuk ve mali müşavir onayı gerekir**.

## 9. Kabul kriterleri

### 9.1 Faz faz kabul kriterleri

Her fazın kendi modül dokümanındaki §9 maddeleri aynen geçerlidir. Buna ek olarak faz kapıları:

| Faz | Faz kabul kriteri (ölçülebilir) |
|---|---|
| F0 | İki şirketli kurulumda A şirketinin hiçbir kaydı B şirketinin listesinde görünmez (otomatik test); dönem kilidi kapatıldığında o döneme yazma denemesi reddedilir ve deneme denetim izinde görünür; modül kapısı kapatılan modülün yazma uçlarını reddeder, okuma açık kalır |
| F1 | Borç ≠ alacak olan fiş kaydedilemez; ters kayıt dışında fiş silinemez; tek ay için mizan toplamı elle hesapla **0,00 TL** fark verir (`06-MUHASEBE-MOTORU.md:440-443`) |
| F2 | Satır tabanlı fatura iskonto ve KDV'yi satır bazında hesaplar; iade faturası orijinal belgeye bağlanır; e-belge kuyruğu sunucu yeniden başladığında iş kaybetmez |
| F3 | Stok bakiyesi = hareket toplamı (0 fark); sayım farkı kapatıldığında maliyet ve fiş tutarlı; barkodla sayım ile ekran sayımı aynı sonucu verir |
| F4 | Ekstre satırı eşleştirildiğinde cari/banka bakiyesi güncellenir; mutabakat farkı 0,00 TL; çek tahsili portföy durumunu değiştirir |
| F5 | Üç yönlü eşleştirme: sipariş–mal kabul–fatura farkı tolerans içindeyse otomatik, dışındaysa onaya düşer; teklif → sipariş dönüşümü kalem ve fiyat kaybetmez |
| F6 | Her raporda ekrandaki liste ile toplam **ayrı uçtan** gelir ve tutarlıdır (`36-PERFORMANS-OLCEK.md:449-451`); katalog yetkiye göre süzülür; tasarımcı serbest SQL üretmez |
| F7 | Amortisman planı elle hesapla kuruş düzeyinde aynı; puantaj ayı kapatıldıktan sonra değiştirilemez |
| F8 | Reçete maliyeti malzeme + işçilik + genel gider + fason toplamına eşit; ithalat dosyası kapatıldığında masraf dağıtımı stok maliyetine yansır |
| F9 | Sır sızmaz (depo taraması temiz); aynı `dedupeKey` ile 10 istek tek iş üretir; hata veren iş 5 denemede `NeedsAttention` olur (`27-ENTEGRASYONLAR.md:482-497`); muhasebeci aktarımı hedef biçime dönüşür ve sürümlenir |
| F10 | Konsolide mizan = şirket mizanlarının toplamı (eliminasyon hariç) 0,00 TL fark; portaldaki kullanıcı yalnız kendi firmasının belgesini görür |
| F11 | Kuru prova raporunda satır bazında hata listesi; aktarım sonrası bakiye farkı < 0,05 TL (`05-VERI-MODELI.md:518-519`); test kapıları (altın senaryo, yalnız-ekleme migration) yeşil |

### 9.2 Kesintisizlik kabul kriteri (her fazda)

1. Faz yayına alındıktan sonra **Sevkiyatlar, Cari, Faturalar, Tahsilatlar** ekranlarının davranışı
   değişmemiştir (e2e ile ölçülür).
2. Klasik görünümde menüde kaybolan öğe yoktur (23 öğe korunur, `client/src/lib/nav.ts:19-66`).
3. Ayna açıkken yeni ERP yazma uçları **red** döner ve hiçbir kayıt yazılmaz.
4. Lisans süresi bitmiş kurulumda ERP ekranları **okunur** kalır; yazma reddedilir.
5. Faz yayınından sonra `Canlı kontrol` işi yeşildir ve `/api/health` 3 saniye altında yanıt verir.

## 10. Testler

Test düzeni bugünküyle aynıdır; yeni bir çatı kurulmaz. **Her iş kalemi için en az bir otomatik test**
yazılır (`01-ORTAK-SARTNAME.md:24-25`). `37-TEST-CI-GENISLETME.md` bu düzeni genişletir (altın
senaryolar, izolasyon, yalnız-ekleme migration kapısı, kalite panosu).

| Faz | Birim | Entegrasyon | e2e | Özel |
|---|---|---|---|---|
| F0 | çok şirketli süzgeç, numara artışı, dönem kilidi, modül kapısı | süzgeçsiz sorgu testi, izolasyon | şirket seçici, izin matrisi | — |
| F1 | fiş dengesi, KDV/tevkifat, mizan | fatura → fiş zinciri, kapanış | hesap planı, yevmiye dengesi | altın senaryo (tek ay, `06` §10) |
| F2 | satır KDV/iskonto, yuvarlama | fatura → stok + cari + fiş | e-belge sekmeleri, iade | kuyruk yeniden başlatma |
| F3 | FIFO/ortalama, sayım farkı | hareket → maliyet → fiş | stok kartı, sayım oturumu | barkod okuma (panel + mobil) |
| F4 | gün sonu farkı, eşleştirme adayı | ekstre → cari hareket → mutabakat | ekstre yükleme, çek portföyü | virman, karşılıksız |
| F5 | üç yönlü eşleştirme, tolerans | talep → sipariş → mal kabul → fatura | satın alma akışı, teklif hunisi | gelen e-Fatura ile doldurma |
| F6 | rapor toplamı, yetki süzülmesi, tasarımcı ifade ağacı | katalog → uç → toplam | Rapor Merkezi, tasarımcı, dışa aktarma | N+1 ve tam tarama testi (`36`) |
| F7 | amortisman, puantaj toplamı | kıymet → fiş, personel → gider | kıymet kartı, puantaj ızgarası | çıkış maker-checker |
| F8 | reçete maliyeti, kur farkı | üretim emri → stok + fiş | reçete diyagramı, ithalat dosyası | fire/yan ürün |
| F9 | dedupe, geri çekilme, imza, maskeleme | kuyruk → işçi → durum, webhook, aktarım | Entegrasyon Merkezi, günlük, Bildirim Merkezi | sır sızma taraması |
| F10 | konsolidasyon toplamı | şirketler arası sızıntı testi | portal girişi, konsolide rapor | — |
| F11 | eşleme/doğrulama | aktarım → bakiye farkı | göç sihirbazı kuru prova | geri dönüş provası |

**Ek kurallar:** test silinmez/atlanmaz (`01-ORTAK-SARTNAME.md:24`); e2e testleri önce arama/süzme
yapar çünkü birikmiş örnek veri ilk sayfayı doldurur (`AGENTS.md` §4 tuzaklar); yeni görünüm spec'leri
`client/e2e/new-ui/` altına, ERP spec'leri `client/e2e/erp/` altına yazılır.

## 11. Efor ve bağımlılıklar

### 11.1 Efor toplama yöntemi (rakam uydurulmaz)

Bu tablodaki rakamlar **modül dokümanlarının §11 bölümlerinden birebir alınmıştır**. Hiçbiri burada
yeniden hesaplanmadı veya yuvarlanmadı. İki kural uygulandı:

- Bir doküman §11'inde toplam veriyorsa o toplam yazıldı; toplam yoksa kalemler toplandı ve "kalem
  toplamı" diye işaretlendi.
- **03–38 arası bütün modül dokümanları yazılmıştır** ve hepsinin §11 bölümü vardır; bu yüzden
  aşağıdaki tabloda **hiçbir satır "tahmin" değildir**.

**Kaynak dosyalar:** `docs/plan-erp/03-…` – `38-…`. Rakamlar 6 Ekim 2026'da okunmuştur; bir doküman
sonradan güncellenirse bu tablo da güncellenmelidir.

### 11.2 Kişi-gün tablosu (kaynak: her dokümanın §11'i)

| Doküman | Kapsam özeti | Efor (kişi-gün) | Faz |
|---|---|---|---|
| `03` §11 | Çok şirketli temel, belge serisi, muhasebe çekirdeği, otomatik fişler, cari, stok, sipariş, üretim, kıymet, e-Defter/BA-BS, modül kapısı, analiz | kalem toplamı 128–182 · belgede yazan kaba toplam **150–230** | F0–F11 kaba çerçeve |
| `04` §11 | `Company` + global süzgeç, modül kayıt defteri, `DocumentSeries`, olay altyapısı, kuyruk, dosya depolama, önbellek, izleme, ortam ayrımı | kalem toplamı **67–108** | F0, F9 |
| `05` §11 | Tablolar: `Company`, `Account`, `JournalEntry`, `Contact`, stok, `Order`, `Recipe`, `FixedAsset`, `Attachment`, `BackgroundJob` | kalem toplamı **135–197** | F0–F8, F11 |
| `06` §11 | Hesap planı, yevmiye, otomatik fişler, KDV/tevkifat, mizan, kapanış, e-Defter, BA-BS, adat, kur farkı, test | **110–160** (belgede yazılı) | F1 |
| `07` §11 | Rol/izin, onay akışı, dönem kilidi, numara serisi, denetim olayları | **~32** | F0 |
| `08` §11 | e-belge sütunları, durum makinesi, kuyruk, gelen kutusu, arşiv, E-Belgeler ekranı, toplu mükellefiyet (+ adaptör 4–6 ayrı) | **~29** (adaptör hariç) | F2, F9 |
| `09` §11 | Birleşik cari modeli, cari kartı, yetkililer, mahsup, avans, risk limiti, mutabakat, birleştirme, döviz, VKN sorgu | **~36** (gerçek VKN sağlayıcısı hariç) | F1, F2 |
| `10` §11 | Stok kartı/kategori, depo/bölüm, hareket/bakiye, maliyet, sayım, ekranlar, raporlar, Excel devir | **~43** | F3 |
| `11` §11 | Fatura tipi/seri, satır modeli, yeni form, iade, yevmiye, stok satırı, listeler, testler | **~23** | F2 |
| `12` §11 | Talep, sipariş, mal kabul, alış faturası satırları, üç yönlü eşleştirme, fiyat listeleri, masraf dağıtımı, iade, gelen e-Fatura, raporlar | **~40** | F5 |
| `13` §11 | Teklif + revizyon, PDF/e-posta, sipariş, kısmi sevkiyat, sevkiyat bağı, rezervasyon, marj, teslim/iade, raporlar | **~34** (rezervasyon hariç ~31) | F2, F5 |
| `14` §11 | Para birimi/kur, elle hareket, gün sonu, kasiyer yetkisi, kasa defteri, yevmiye, ekran düzeni | **~26** | F4 |
| `15` §11 | Hesap alanları, MT940, CSV/Excel, ekstre tabloları, eşleştirme, kural motoru, mutabakat, ödeme talimatı | **32** | F4, F9 |
| `16` §11 | Şema, durum motoru, alacak/borç detayı, teminat, vade farkı/protesto, portföy, banka tahsil dosyası, uyarılar | **29** | F4 |
| `17` §11 | Tür/merkez tanımları, gider formu, dağıtım motoru, sabit ödeme, bütçe, analiz sekmeleri | **31** | F7 |
| `18` §11 | Personel kartı, görev/departman, ücret/kesinti, hareket türleri, puantaj, izin, belgeler, muhasebe aktarımı, şoför mobil | **36** | F7 |
| `19` §11 | Varlık + DTO, amortisman motoru, API uçları, liste/kart ekranları, çıkış penceresi, testler | **15,5** | F7 |
| `20` §11 | Reçete/bileşen/operasyon, akış diyagramı, iş merkezi/vardiya, üretim emri, MRP, maliyet, fire | **23,5** | F8 |
| `21` §11 | Barkod/QR + etiket, okuma, raf/adres, seri/lot, sayım motoru ve ekranları, transfer, mobil sayım | **25** | F3 |
| `22` §11 | Kur tabloları/servisi, dövizli fatura, kur farkı, ithalat dosyası, masraf dağıtımı, ihracat, proforma, ödeme planı | **29,5** | F8 |
| `23` §11 | Ortak rapor altyapısı, katalog, 13 sekme taşıma, R1–R22 raporları, PDF/Excel şablonu, kuyruk, testler | **62–88** | F6 |
| `24` §11 | Rapor Tasarımcısı: veri görünümü, JSON şeması, ifade ağacı, yorumlayıcı, tasarımcı ekranı, koşullu biçimlendirme, grafik, sürüm/onay | **55–72** | F6 |
| `25` §11 | CRM / Teklif Takip: aday, aktivite, teklif durumu, görev/hatırlatma, huni, segment, kampanya, e-posta, İYS izni | **50–63** (gelen e-posta/santral hariç) | F5 (isteğe bağlı) |
| `26` §11 | Doküman Yönetimi: arşiv tabloları, liste/detay, hızlı yükleme, bağlama, sürüm, mükerrer denetimi, S3, kota, saklama/imha, KVKK | **59–80** (OCR hariç **55–72**) | F9 |
| `27` §11 | Sır saklama, bağlantı kaydı, kuyruk/işçi, çağrı günlüğü, webhook, API anahtarı, sandbox, sağlayıcı arayüzleri | **51–77** | F9 |
| `28` §11 | Muhasebeci Paketi: firma bağlamı, muhasebeci paneli, belge→fiş, fiş onayı, mizan, aktarım sürümleme, hedef biçim adaptörleri, mutabakat | **77–115** | F9 |
| `29` §11 | Mobil ve Dışa Açılım: şoför ekranları, teslim evrakı, sayım, yönetici onay kuyruğu, müşteri portalı, tedarikçi portalı, açık API, çakışma çözümü, bildirim, testler | **91–134** (portal kısmı 30–44; kalanı 61–90) | F9, F10 |
| `30` §11 | Çok şirketli: `Company` + `CompanyId`, dolum, süzgeç, `CompanyUser`, kurulum ekranları, kur, hesap planı şablonu, firmalar arası işlem, konsolidasyon, eliminasyon | **115–171** (`Company`+`CompanyId` 10–15 · kur/kurulum 14–21 · konsolidasyon 91–135) | F0, F10 |
| `31` §11 | Ayarlar/Şirket Kurulumu: checklist, sihirbaz 7 adım, mali yıl/dönem, kur, hesap planı şablonu, seri geçişi, depo/banka tanımları, kullanıcı sınırı, denetim, yedek ekranı | **~38,5** | F0 |
| `32` §11 | Veri Göçü/Excel: `ImportBatch`, analyze/apply ayrımı, parti geçmişi, geri alma, eşleme profilleri, banka/yevmiye/çek/stok aktarımı, arka plan, aynadan geçiş | **~42,5** | F11 |
| `33` §11 | Bildirim: şablon motoru, kuyruk, kanal ayarları, alıcı grubu/izin, olay sözlüğü, hatırlatma kuralları, merkez/günlük ekranları, uygulama içi bildirim | **~44** (SMS ve KEP hariç) | F9 |
| `34` §11 | Lisans/Abonelik/Kontör: payload alanları, modül kayıt defteri, **modül kapısı**, menü filtresi, `ModuleState`, kullanıcı sınırı, saat koruması, kontör, uyarılar, paket matrisi | **~42,5** | F0, F9 |
| `35` §11 | Denetim izi şeması, zincir/mühür, arşivleme, maskeleme, saklama politikası, envanter, başvuru, rıza, erişim günlüğü | **~31** + dış onay | F9, F11 |
| `36` §11 | Metrik toplama, indeksler, sağlık ekranları, önbellek, kalıcı kuyruk, ağır rapor taşıma, arşivleme, RPO/RTO tatbikatı, yük testi | **~50** | F6, F9 |
| `37` §11 | Test ve CI Genişletme: altın senaryo kataloğu (20), `GoldenLedger` kapısı, yuvarlama/izolasyon/yetki paketleri, sahte e-belge, göç ve migration testleri, kapsam ölçümü, yük testi işi, test verisi üretici, e2e `erp/`, kalite panosu | **~60** | her faz |
| `38` §11 | Güvenlik: parola politikası, oturum/cihaz, API anahtarı, yetki yükseltme koruması, CORS/başlık, girdi sertleştirme, dosya karantinası, maskeleme, Güvenlik Merkezi, olay müdahale, tedarikçi envanteri, sızma testi, testler | **~57** + dış sızma testi | F9, F11 |

### 11.3 Faz başına efor

| Faz | Kaynak dokümanlar | Efor (kişi-gün) | Not |
|---|---|---|---|
| F0 Hazırlık | `04`, `05`, `07`, `30`, `31`, `34` | **~165–230** | `30` (18–27) + `31` (38,5) + `34` (30) + `04`/`05`/`07` (79–145) |
| F1 Muhasebe çekirdeği | `06`, `09` (cari kısmı), `05` (defter tabloları) | **~180–250** | Çift sayma riski §11.4'te; `06` tek başına 110–160 |
| F2 Fatura/satış + e-belge | `08`, `11`, `13` | **~80–105** | e-belge adaptörü 4–6 gün ayrıca (entegratör seçilince) |
| F3 Stok/depo + sayım | `10`, `21` | **~68** | `10` = 43, `21` = 25 |
| F4 Kasa/banka/çek | `14`, `15`, `16` | **~87** | 26 + 32 + 29 |
| F5 Satın alma/sipariş (+CRM) | `12`, `13`, `25` | **~124–137** | 74 + CRM (50–63); CRM **isteğe bağlı** — çıkarılırsa 74 |
| F6 Raporlama + tasarımcı | `23`, `24`, `36` (rapor kısmı) | **~140–185** | `23` 62–88 + `24` 55–72 + `36`'nın yük/rapor payı ~25 |
| F7 İK/kıymet/gider merkezi | `17`, `18`, `19` | **~82,5** | 31 + 36 + 15,5 |
| F8 Üretim/ithalat | `20`, `22` | **~53** | 23,5 + 29,5 |
| F9 Entegrasyon + muhasebeci + bildirim + güvenlik | `26`, `27`, `28`, `29` (mobil/API), `33`, `34` (kontör), `35`, `36`, `38` | **~470–620** | En ağır faz; `28` tek başına 77–115, `26` 55–72 |
| F10 Çok şirket + portal | `29` (portal), `30` (konsolidasyon) | **~121–179** | portal 30–44 + konsolidasyon 91–135 |
| F11 Göç + UAT + canlıya geçiş | `32`, `35` (arşiv payı), `37` (kapılar), `40` | **~130–175** | `32` 42,5 + `35` ~10 + `37` ~20 + `40` ~56 |

**Faz toplamı:** **~1.900–2.400 kişi-gün** (orta nokta **~2.150**). Bu, **yazılı** modül
dokümanlarının §11 rakamlarının toplamıdır. `03` §11'deki kaba büyüklük (**150–230 kişi-gün**) bunun
**onda biri kadardır**; fark §11.4'te açıklanmıştır.

### 11.4 Toplam efor ve çift sayma uyarısı (dürüst hesap)

Üç kaynak arasında **büyük fark** vardır ve bu fark gizlenmez:

| Kaynak | Toplam | Ne sayıyor | Ne saymıyor |
|---|---|---|---|
| `03-KAPSAM-VE-KONUMLANDIRMA.md:299` kaba büyüklük | **150–230 kişi-gün** | Ana hatlar (çok şirketli temel, muhasebe çekirdeği, otomatik fiş, cari, stok, sipariş, üretim, kıymet, e-Defter, paket kapısı, analiz) | e-belge, banka/çek, personel, rapor tasarımcısı, entegrasyon çerçevesi, muhasebeci paketi, portal, konsolidasyon, göç, KVKK, güvenlik, test/CI, CRM, doküman arşivi, bildirim, lisans/kontör |
| `03` §11 kalem toplamı | **128–182 kişi-gün** | Yukarıdaki kalemler | Aynı eksikler. Ayrıca belgede yazan "150–230" ile kalem toplamı arasında **20–50 kişi-gün** tutarsızlık vardır |
| Modül dokümanlarının (03–38) §11 toplamı | **~1.900–2.400 kişi-gün** | Modül modül, ekran ekran, test dahil | Faz dışı bakım işleri (kolaylaştırma P0–P6, mevcut panel bakımı) |

**Farkın sebebi çift sayma ve eksik kalemlerdir; dört yerde oluşur:**

1. **`05-VERI-MODELI.md` ile modül dokümanları.** `05` tablo başına gün verir (ör. `JournalEntry`
   12–18); `06`, `10`, `21` aynı işin **ekran+servis+test** tarafını ayrıca sayar.
2. **`03` §11 ile `06` §11.** `03` "muhasebe çekirdeği 30–45" der; `06` aynı işi 110–160 güne yayar.
   Doğru olan **detaylı olan**dır.
3. **`13-SIPARIS-TEKLIF.md` iki fazda.** Aynı 34 günün bir kısmı F2, bir kısmı F5'tir; faz tablosunda
   iki kez görünür.
4. **`30-COK-SIRKETLI-KONSOLIDASYON.md` ile `04`/`05`.** `Company` + `CompanyId` işi üç dokümanda
   görünür (`04` 15–25, `05` 15–25, `30` 10–15). F0 hesabında **bir kez** sayıldı.

**Bunun pratik sonucu:** takvim planı **~2.150 kişi-gün** (aralık 1.900–2.400) üzerinden yapılır.
`03`'teki 150–230 rakamı bu toplamla **çelişir** ve düzeltilmesi gerekir; bu, `41` §5.8'de karar
bekleyen bir maddedir.

**Dürüst not (kendi geçmişimiz).** Bu dokümanın ilk sürümü toplamı **~1.100 kişi-gün** vermişti, çünkü
o sırada `24`–`38` arası dokümanlar henüz yazılmamıştı. O dokümanlar yazıldıktan sonra toplam
**~2.150**'ye çıktı: yani **ilk tahmin, gerçeğin yaklaşık yarısıydı.** Bu, "efor tahmini hep düşük
çıkar" eğiliminin somut kanıtıdır (§11.5 A6) ve takvimin neden üst sınıra yakın kurulduğunu açıklar.

### 11.5 Takvim senaryoları

**Varsayımlar (açıkça yazılır):**

- **A1.** Bir geliştiricinin **net üretken günü**, 22 iş günü olan bir ayda **17 gündür** (toplantı,
  inceleme, yayın, destek, hata payı). Aylık verim = kişi-gün × 0,78. **Bu tahmin şu varsayıma
  dayanır:** geliştirici haftada bir gününü yayın, destek ve inceleme işlerine verir.
- **A2.** Ekip büyüdükçe verim **doğrusal artmaz**: aynı mimari, aynı test kapısı ve tek canlı ortam
  paylaşılır. 2 geliştirici ≈ 1,7 kat, 4 geliştirici ≈ 2,8 kat hız. **Bu tahmin şu varsayıma
  dayanır:** ortak dosya (`AppDbContext`, `Program.cs`) çakışmaları ve test kapısı beklemesi hızın bir
  kısmını yer. **doğrulanacak:** kendi hızımızı ilk 2 fazda ölçüp bu katsayıyı güncellemek.
- **A3.** Toplam **2.150 kişi-gün** orta nokta alınır (aralık 1.900–2.400); faz tablosundaki ara toplam
  bu değerdir.
- **A4.** F0 öncesi **veritabanı kararı** ve F9 için **entegratör/banka bilgileri** bekleme süresi
  hesaba **katılmamıştır**; bu bilgiler gecikirse takvim **doğrudan kayar**
  (`docs/SATIS-PLANI.md:272`).
- **A5.** Mevcut panelin bakımı (kolaylaştırma P0–P6, hata düzeltme) bu eforun **içinde değildir**;
  haftada 1–2 gün kesinti yapar ve A1'e yedirilmiştir.
- **A6.** **Efor tahmini hep düşük çıkar.** Kanıtı bu dokümanın kendisidir (bkz. §11.4 son not). Bu
  yüzden takvim, **yazılı** rakamlar üzerinden ve **üst sınıra yakın** kurulur.

| Senaryo | Kişi-gün / ay | 2.150 kişi-gün kaç ay | Kaç yıl |
|---|---|---|---|
| **1 geliştirici** | 17 | ~126 ay | **~10,5 yıl** |
| **2 geliştirici** (1,7×) | ~29 | ~74 ay | **~6,2 yıl** |
| **4 geliştirici** (2,8×) | ~48 | ~45 ay | **~3,8 yıl** |

**Yorum (dürüst).** Rakamlar acıdır ve gizlenmemelidir: bu plan, 2 geliştiriciyle **6 yıllık** bir
iştir; tek geliştiriciyle **10 yılı aşar** ve pratikte yapılamaz. `03`'teki 150–230 kişi-gün rakamına
bakıp "birkaç aylık iş" sanmak, planın en büyük yanılgısı olur. Üç gerçekçi yol vardır:

1. **Kapsamı sert daraltmak.** F8 (üretim/ithalat, 53), F10 (portal + konsolidasyon, 121–179), `25`
   (CRM, 50–63), `26` (doküman yönetimi, 55–72), `24` (rapor tasarımcısı, 55–72) ertelenirse toplam
   **~450–560 kişi-gün** düşer → **~1.600 kişi-gün**; 2 geliştiriciyle **~4,6 yıl**.
2. **Ekip kurmak.** 4 geliştiriciyle **~3,8 yıl**; ama koordinasyon maliyeti büyür (§11.6).
3. **"Luca sınıfı" hedefini küçültmek.** Hedef **F0–F4 + F6'nın yarısı + F9'un muhasebeci paketi**
   olursa toplam **~1.000–1.150 kişi-gün** → 2 geliştiriciyle **~2,9–3,3 yıl**. Rakiplerle yarışan
   kısım budur; üretim, konsolidasyon, portal, CRM sonraya kalır.

**Faz bazında takvim göstergesi:** aşağıdaki "ay" sütunları **1 / 2 / 4 geliştirici** içindir ve
fazların sırayla yürüdüğü varsayımıyla verilmiştir. Paralel yürütülebilecek fazlar (F2 ∥ F3,
F6 ∥ F7) toplamı kısaltır; bu kazanç hesaba **katılmamıştır** (temkinli taraf).

| Faz | Kişi-gün (orta) | 1 geliştirici | 2 geliştirici | 4 geliştirici |
|---|---|---|---|---|
| F0 | 195 | 11,5 ay | 7 ay | 4 ay |
| F1 | 215 | 12,5 ay | 7,5 ay | 4,5 ay |
| F2 | 92 | 5,5 ay | 3 ay | 2 ay |
| F3 | 68 | 4 ay | 2,5 ay | 1,5 ay |
| F4 | 87 | 5 ay | 3 ay | 2 ay |
| F5 | 130 | 7,5 ay | 4,5 ay | 2,5 ay |
| F6 | 162 | 9,5 ay | 5,5 ay | 3,5 ay |
| F7 | 82 | 5 ay | 3 ay | 1,5 ay |
| F8 | 53 | 3 ay | 2 ay | 1 ay |
| F9 | 545 | 32 ay | 19 ay | 11,5 ay |
| F10 | 150 | 9 ay | 5 ay | 3 ay |
| F11 | 152 | 9 ay | 5,5 ay | 3 ay |
| **Toplam** | **~2.150** | **~126 ay** | **~74 ay** | **~45 ay** |

**F9 neden bu kadar ağır?** Sekiz dokümanı taşır: entegrasyon çerçevesi (51–77), muhasebeci paketi
(77–115), doküman yönetimi (55–72), bildirim (44), mobil/açık API (61–90), güvenlik (57), denetim
izi/arşiv (~22) ve performans/kuyruk (~25). Bu faz **tek başına** raporlama + İK toplamından büyüktür.
Azaltma yolu: F9'u **iki parçaya** bölmek — (a) muhasebeci paketi + bildirim + güvenlik (çekirdek),
(b) doküman yönetimi + açık API + entegrasyon adaptörleri (sonra). Bu bölme §11.6'ya eklendi.

### 11.6 Çalışma modeli seçenekleri (karar bekliyor)

| Model | Nasıl | Artı | Eksi |
|---|---|---|---|
| **Tek sıra, tek geliştirici** | Fazlar sırayla | Basit, çakışma yok | **~10,5 yıl**; mevzuat kaçar |
| **Tek sıra, 2–4 geliştirici** | Aynı faz içinde iş bölümü; tek mimari sorumlusu | ~3,8–6,2 yıl | Ortak dosyalarda çakışma; test kapısı darboğaz |
| **Faz paralel, 2 hat** | Hat A: muhasebe+ticaret (F0→F1→F2→F4→F5) · Hat B: depo ve İK (F3→F7) | Aynı sürede daha çok iş | İki hat aynı `AppDbContext`'e yazar; migration sırası kilitlenir |
| **Kapsam daraltma + 2 geliştirici** | F8, F10, `24`, `25`, `26` ertelenir (~450–560 kişi-gün düşer) | ~4,6 yıl; satışa yeten çekirdek | Modül eksiği rakiplerin bir kısmını kaybettirir |
| **Çekirdek hedefe küçültme + 2 geliştirici** | Yalnız F0–F4 + F6'nın yarısı + F9'un muhasebeci paketi (~1.000–1.150 kişi-gün) | ~2,9–3,3 yıl | Üretim, konsolidasyon, portal, CRM, rapor tasarımcısı ertelenir |
| **F9'u ikiye bölme** | F9a (muhasebeci + bildirim + güvenlik) erken; F9b (arşiv + açık API + adaptörler) sonra | Sıra tıkanmaz; erken değer | F9b bağımlılıkları (doküman arşivi) geç gelir |

**Öneri (karar değil, gerekçeli görüş):** **çekirdek hedefe küçültme + 2 geliştirici + F9'u ikiye
bölme.** Gerekçe: satış için gereken çekirdek F0–F4, F6'nın muhasebe kısmı ve F9'un muhasebeci
paketidir; F8 üretim/ithalat, F10 portal/konsolidasyon, `25` CRM, `26` doküman yönetimi ve `24` rapor
tasarımcısı, hedef müşteri (küçük ve orta nakliyeci + ticaret) için **ilk sürümde gerekli değildir**.
Bu öneri `41` §5.8'de karar bekleyen maddeler arasındadır.

**Bağımlılık listesi (faz sırası, özet):**

1. Veritabanı kararı (ücretli plan) — **F0'dan önce**
2. F0 → F1 → {F2, F3} → {F4, F5} → F6 → F7 → F8 → F9 → F10 → F11
3. F6, F9'un kuyruk altyapısını; F9, F2'nin e-belge sağlayıcı arayüzünü bekler.
4. F11, F0 + F2 + F3 + F4'ün **tamamını** bekler (göç dördünü birden yükler).

## 12. Riskler ve doğrulanacaklar

Bu bölüm yalnız **takvimi doğrudan kıran** riskleri listeler. Risk kaydının tamamı, olasılık/etki/sahip
ve tetikleyici sütunlarıyla `41-RISKLER-VE-VARSAYIMLAR.md` §5'tedir.

| Risk | Etki | Azaltma |
|---|---|---|
| Veritabanı kararı gecikir; 28 Ekim'de ücretsiz DB silinir | Çok yüksek | Karar **F0 başlamadan**; yedek + yeni DB + ayna ile yeniden doldurma senaryosu hazır (`docs/TASINMA.md`); `render.yaml:4` plan satırı güncellenir |
| Toplam efor `03`'teki kaba tahminin **~9–10 katı** çıkar (2.150'ye karşı 150–230); plan güvenilirliği kaybolur | Yüksek | Bu doküman detaylı toplamı yazılı hâle getirdi; `03` §11 rakamı karar bekleyenler listesine eklendi; ilk 2 fazda **gerçek hız ölçümü** yapılıp takvim yeniden hesaplanır |
| Tek geliştirici hızı yetmez, fazlar yıllara yayılır (~10,5 yıl) | Yüksek | §11.6 modellerinden biri seçilir; kapsam daraltma (F8/F10/`24`/`25`/`26`) hazır seçenek |
| **F9 tek başına fazla ağır** (545 kişi-gün, sekiz doküman) ve sırayı tıkar | Yüksek | F9 iki parçaya bölünür: (a) muhasebeci paketi + bildirim + güvenlik, (b) doküman yönetimi + açık API + adaptörler |
| Mevzuat değişir (KDV oranı, e-belge zorunluluğu, e-Defter kapsamı) faz ortasında | Yüksek | Motor **ek** çalışır (`06-MUHASEBE-MOTORU.md:481`); oranlar tablodan; aylık mevzuat kontrolü (`docs/SATIS-PLANI.md:296`); mali müşavir onayı |
| Faz yayını ayna koşusunun ortasına denk gelir; veri yarım yazılır | Orta–yüksek | Yayın 07:07/12:07/17:07/22:07 dışında (`.github/workflows/mirror.yml:10`); `KOLAYLASTIRMA-SIRADAKI-ISLER.md:216-219` adımları |
| Çok şirketli geçiş canlı veriyi bozar | Yüksek | `CompanyId` önce boş, sonra tek şirkete doldurulur; migration yalnız ekleme; iki şirketli izolasyon testi (`05-VERI-MODELI.md:554`) |
| e-belge entegratörü seçilmezse F2 yarım kalır | Yüksek | Manuel XML sağlayıcı varsayılan kalır (`EInvoiceProviders.cs:18`); adaptör sonradan tek sınıf olarak eklenir (`docs/ENTEGRATOR-EKLEME.md`) |
| Banka entegrasyonu için protokol/ücret bilgisi gelmez | Orta–yüksek | MT940/CSV ayrıştırıcı **dosya ile** çalışır; canlı servis bağlanmadan F4 kapanabilir (`15-BANKA-ENTEGRASYON.md`); "muhasebe" sütunu boş kalır |
| F6 raporları yavaşlar; kullanıcı "panel ağırlaştı" der | Orta | Ağır rapor kuyruğa; önbellek şirket bazlı; liste toplamı ayrı uçtan (`36-PERFORMANS-OLCEK.md:449-451`) |
| Faz kapısı atlanır, test edilmemiş modül canlıya çıkar | Yüksek | §5.1 beş maddesi; CI yeşil olmadan `main`'e alınmaz; `Canlı kontrol` işi |
| Müşteri ekran görmeden faz "bitti" sayılır, beklenti kayar | Orta | §12.1 kilometre taşları; her faz sonunda toplu gösterim (`docs/YOL-HARITASI.md:23`) |
| İki paralel oturum aynı dosyaya yazar; çakışma çıkar | Orta | `git pull --rebase origin main` ile başlama/bitirme (`AGENTS.md` §3.6); bu plan setinde dosya sahipliği ayrılır |
| Lisans/paket kapısı yanlış kurulur, müşteri modül kaybeder | Orta | Kapı yalnız yazmada; sahip modu ve Kurumsal pakette kapı yok (`03-KAPSAM-VE-KONUMLANDIRMA.md:312`) |

### 12.1 Müşteriye gösterim kilometre taşları

Her kilometre taşı **müşteriye gösterilir**, geri bildirim alınır ve yalnız ondan sonra sonraki faza
geçilir. Kural: gösterim **ekran görüntüsü veya canlı tur** ile yapılır; sözle değil.

| # | Kilometre taşı | Ne gösterilir | Ne zaman (2 geliştirici) | Kabul anı |
|---|---|---|---|---|
| K1 | **Zemine oturdu** | Aynı panelde iki şirket, rol matrisi, dönem kilidi, seri, modül kapısı | F0 sonu (~7. ay) | İki şirketli demo hesapla tur |
| K2 | **Defter tutuyor** | Hesap planı, yevmiye, mizan, muavin, KDV özeti taslağı | F1 sonu (~15. ay) | Tek ayın mizanı elle hesapla karşılaştırılır |
| K3 | **Fatura ve e-belge panelden** | Satır tabanlı fatura, iskonto, iade, e-belge sekmeleri | F2 sonu (~18. ay) | Kendi gerçek fatura taslağı test ortamında |
| K4 | **Depo sayılıyor** | Stok kartı, hareket, bakiye, sayım farkı, barkod | F3 sonu (~20. ay) | Telefonla sayım gösterimi |
| K5 | **Para takibi tam** | Kasa gün sonu, ekstre eşleştirme, çek portföyü | F4 sonu (~23. ay) | Bir ayın ekstresi baştan sona eşleştirilir |
| K6 | **Alım ve teklif akışı** | Talep → sipariş → mal kabul → fatura; üç yönlü eşleştirme; teklif hunisi | F5 sonu (~27,5. ay) | Açık sipariş ve fiyat geçmişi raporu |
| K7 | **Rapor zenginliği** | Rapor Merkezi, mizan/muavin, KDV özeti, nakit akışı, rapor tasarımcısı | F6 sonu (~33. ay) | Mali müşavire çıktı paketi |
| K8 | **İK ve demirbaş** | Personel, puantaj, izin, kıymet, amortisman, bütçe | F7 sonu (~36. ay) | Amortisman planı elle kontrol |
| K9 | **Üretim/ithalat** | Reçete, üretim emri, maliyet, ithalat dosyası, kur farkı | F8 sonu (~38. ay) | Reçete maliyeti elle kontrol |
| K10 | **Entegrasyon ve muhasebeci** | Entegrasyon Merkezi, kuyruk, muhasebeci paketi, bildirim, güvenlik | F9 sonu (~57. ay) | Mali müşavir aktarım turu |
| K11 | **Çok şirket + portal** | Konsolide rapor, müşteri/tedarikçi portalı, açık API | F10 sonu (~62. ay) | İki şirketli konsolide mizan |
| K12 | **Göç ve canlıya geçiş** | Göç sihirbazı, UAT kanıt dosyası, geçiş kontrol listesi | F11 sonu (~67,5. ay) | `40-UAT-KABUL-CANLIYA-GECIS.md` §9 |

**Küçük ama erken kazanımlar (müşteriyi bekletmemek için).** F0–F1 uzun sürdüğü için araya
kolaylaştırma planından bağımsız, mevcut panelde görünür üç iş konur: rapor/toplam şeritleri (`SumStrip`),
"Faturalandırılacaklar" akışı (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:111`) ve mazot/araç masrafı
ekranları (`:113`). Bunlar ERP fazlarını **bekletmez**, aynı canlı panelde yürür.

### 12.2 İlk 90 günün somut iş listesi

**Varsayım:** 90 gün = **13 hafta**. Haftada **17 net üretken gün** (A1) × 2 geliştirici ≈
**34 kişi-gün/hafta** → 13 haftada **~440 kişi-gün**.

**Dürüst uyarı.** Toplam **~2.150 kişi-gün** olduğu için **90 günde plan bitmez**; hatta **F0 tek
başına** (~195 kişi-gün) 90 günün yarısını alır. İlk 90 günün amacı "bitirmek" değil, **zemini kurmak
ve ölçülebilir ilk sonucu almak**tır: iki şirketli yapı ayakta, hesap planı ve yevmiye fişi çalışıyor,
mizan fişlerden türetiliyor. Aynı dönemde **A1/A2 hız varsayımı ilk kez gerçek veriyle ölçülür** ve
takvim buna göre yeniden kurulur.

**Gün 0–5: Karar ve hazırlık (kod yok)**

1. **Veritabanı kararı:** ücretli plana geçiş veya yeni DB + ayna ile yeniden doldurma
   (`docs/TASINMA.md`). Yedek alınır, geri yükleme bir kez **denenir**.
2. Ayarlar: `render.yaml` plan satırı güncellenir; ortam değişkenleri (sır dosyaya yazılmaz).
3. `41` §5.8'deki **karar bekleyen maddeler** kullanıcıya sorulur (§12.3).
4. Kapsam kararı: F8/F10/`24`/`25`/`26` **ilk sürümde var mı**?
5. Şablon kontrolü: `tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp`; kırık referans/mojibake
   **0** olmalı.

**Hafta 1–4: F0 — çok şirketli zemin**

| # | İş | Kaynak | Kişi-gün |
|---|---|---|---|
| 1 | `Company` tablosu + `CompanySettings.CompanyId` | `05` §11, `30` §11 | 4 |
| 2 | Bütün iş tablolarına `CompanyId` + global süzgeç | `04` §11, `05` §11 | 20 |
| 3 | Şirket seçici + `ICurrentUser`'a şirket | `04` §11 | 3 |
| 4 | "Süzgeçsiz tablo" otomatik testi | `04` §12 | 3 |
| 5 | Migration'ın **test ortamında** provası | `04` §5.10 | 3 |
| 6 | İki şirketli izolasyon e2e | `04` §10 | 3 |

**Hafta 5–7: F0 — seri, dönem, yetki, kurulum**

| # | İş | Kaynak | Kişi-gün |
|---|---|---|---|
| 7 | `NumberSeries` + üreticiler + uçlar | `07` §11 | 3 |
| 8 | Belge serileri ekranı | `07` §11 | 2 |
| 9 | `AccountingPeriod` + `PeriodLockGuard` + uçlar | `07` §11 | 2,5 |
| 10 | Dönem kilidi ekranı | `07` §11 | 1,5 |
| 11 | `RolePermission` + `PermissionService` + uçlar | `07` §11 | 3,5 |
| 12 | Panel `can()` yeniden yazımı + izin matrisi ekranı | `07` §11 | 3 |
| 13 | `SetupChecklist` + kurulum sihirbazı adımları | `31` §11 | 4 |
| 14 | Denetim izi olayları (ilk 6 olay) | `04` §11, `07` §11 | 1,5 |

**Hafta 8–13: F1 — hesap planı ve fiş çekirdeği (ilk yarı)**

| # | İş | Kaynak | Kişi-gün |
|---|---|---|---|
| 15 | `Account` + hesap planı şablonu (tek düzen teyidi sonrası) | `05` §11, `06` §11 | 12 |
| 16 | `JournalEntry`/`JournalLine` + migration | `05` §11 | 15 |
| 17 | Yevmiye fişi ekranı: giriş, denge kontrolü, ters kayıt | `06` §11 | 14 |
| 18 | `LedgerBalance` + mizan/muavin uçları | `05` §11, `06` §11 | 10 |
| 19 | Fiş denge testi + ters kayıt testi | `06` §10 | 5 |
| 20 | Hesap planı ve yevmiye e2e (klasik + yeni görünüm) | `04` §10 | 4 |

**90. günde beklenen durum (ölçülebilir kabul):** iki şirketli izolasyon testi yeşil; rol matrisi
çalışıyor; dönem kilidi yazmayı engelliyor; hesap planı ekranı ve yevmiye fişi kaydedilebiliyor; denge
kontrolü bozuk fişi reddediyor; mizan toplamı fişlerden türetiliyor; mevcut panel ve ayna
**kesintisiz** çalışmaya devam ediyor; CI'da 5 iş yeşil; `Canlı kontrol` yeşil.

### 12.3 Kullanıcıya sorulacak kararlar (bu dokümandan çıkanlar)

1. **Veritabanı:** ücretli plana mı geçiyoruz, yeni DB + ayna ile yeniden doldurma mı? (F0'ın ön koşulu)
2. **Kaç geliştirici** ve hangi çalışma modeli (§11.6)?
3. **Kapsam:** F8 (üretim/ithalat), F10 (portal + konsolidasyon), `24` (rapor tasarımcısı), `25` (CRM),
   `26` (doküman arşivi) **ilk sürümde var mı**, yoksa ertelenir mi?
4. **`03` §11'deki 150–230 kişi-gün** rakamı düzeltilsin mi (bu dokümandaki **~1.900–2.400** ile
   çelişiyor)?
5. **Verim katsayısı (A1/A2)** kabul ediliyor mu; ilk 2 fazda gerçek hız ölçülüp takvim güncellensin mi?
6. **F9 ikiye bölünsün mü** (muhasebeci paketi erken, arşiv/açık API sonra)?
7. **Kapalı doğan modüller** (§5.4) listesi onaylanıyor mu — özellikle **e-Defter üretiminin biçim
   doğrulanana kadar kapalı** kalması?

**doğrulanacak:** Luca'nın gerçek sürüm temposu ve modül çıkış sırası — kaynak: Luca sürüm notları /
satış ekibi. **doğrulanacak:** Luca Net One çok şirketli yapı ve konsolidasyon kapsamı — kaynak:
<https://www.lucanetone.com.tr> (`02-LUCA-ENVANTERI.md:13` içerik okunamadı). **doğrulanacak:** Render
ücretli plan seçenekleri, kaynak sınırları ve aylık maliyeti — kaynak: Render fiyat sayfası ve
kullanıcı kararı (`36-PERFORMANS-OLCEK.md:38-40`). **doğrulanacak:** bizim gerçek geliştirme hızımız
(son 3 ayın commit/test geçmişinden ölçüm). **doğrulanacak:** e-Fatura entegratörünün kurulum ve
kontör ücreti — kaynak: entegratör satış ekibi. **doğrulanacak:** mali müşavirin tek düzen hesap planı
ve KDV/tevkifat kod listesi teyidi — kaynak: mali müşavir. Mevzuat yorumu bu dokümanda yapılmaz;
**mali müşavir ve hukuk danışmanı onayı gerekir**.

Sonraki belgeyle bağlantı: `40-UAT-KABUL-CANLIYA-GECIS.md` bu fazların **nasıl sınandığını** (rol bazlı
UAT, pilot, canlıya geçiş, geri dönüş) anlatır; `41-RISKLER-VE-VARSAYIMLAR.md` buradaki süre ve kapsam
iddialarının **hangi varsayıma dayandığını** ve yanlış çıkarsa ne olacağını yazar.
