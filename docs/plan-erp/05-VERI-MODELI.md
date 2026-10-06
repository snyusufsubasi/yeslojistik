# 05 — Veri Modeli

Bu belge, ERP hedefinin **veri modelini** anlatır: çekirdek tablolar, anahtar alanları, ilişkileri,
hangi modülün kullandığı, her birinin **ekleme mi yeni tablo mu** olduğu, migration kuralı, indeksler
ve çok şirketli ayrım. Mevcut tablolarla (`Trip`, `Customer`, `Expense`, `Vehicle`, `Driver`, `Invoice`)
nasıl bağlanacağı açıkça yazılmıştır. Kararlar `03-KAPSAM-VE-KONUMLANDIRMA.md` ve
`04-HEDEF-MIMARI.md`; fiş kuralları `06-MUHASEBE-MOTORU.md`.

## 1. Amaç ve kapsam

**Amaç.** Hangi işin hangi tabloda duracağını, hangi alanın zorunlu olduğunu ve yeni tabloların mevcut
canlı veriye nasıl **dokunmadan** ekleneceğini tek yerde yazmak. Uygulayan ajan bu belgeden tablo
adını, alan adını ve indeksi alır; ekran alan listesi `04-HEDEF-MIMARI.md` §4'te, fiş mantığı `06`'da.

**Bu belgenin kapsamı dışı:** SQL yazmak, migration üretmek, ekran çizmek. Belge kodu değiştirmez
(`docs/plan-erp/01-ORTAK-SARTNAME.md:1-8`).

**Tabloların bölümlere dağılımı** (şablon gereği 12 başlık korunur):

| Bölüm | İçindeki tablolar |
|---|---|
| §3 Bizde bugün | Mevcut tabloların envanteri |
| §4 Hedef ekranlar ve alanlar | Alan adı/tipi sözlüğü (ekran eşlemesi) |
| §5 İş kuralları | Migration, indeks, çok şirketli ayrım, silme kuralları |
| §6 Veri modeli | **Bütün yeni tablolar** (asıl tablo) |
| §7 API uçları | Tablo–uç eşlemesi |
| §8 Yetki | Şirket süzgeci, alan bazlı gizleme, denetim |
| §9-§12 | Kabul, test, efor, risk |

**Temel kararlar (özet).**

1. Hiçbir mevcut tablo **silinmez, yeniden adlandırılmaz, dönüştürülmez**.
2. Yeni tablo adları tekil ve İngilizce (`Company`, `Account`, `JournalEntry`); EF adlandırma kuralı
   `snake_case` üretir (`EFCore.NamingConventions` bağımlılıkta:
   `server/YesLojistik.Infrastructure/YesLojistik.Infrastructure.csproj:16`).
3. Para alanları `decimal(18,2)`; bu, bağlam genelinde zaten zorunlu
   (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:47`).
4. Enum'lar metin olarak saklanır (`AppDbContext.cs:48`) — okunabilirlik ve migration güvenliği.
5. Yeni tabloların **hepsi** `CompanyId` taşır; süzgeç tek noktadan uygulanır
   (`AppDbContext.cs:54-58`).

## 2. Luca'daki karşılığı

Luca Net'in veri tarafında öne çıkan başlıklar: cari kartlar, stok kartları, çek-senet tanımları,
faturalar, yevmiye fişleri, banka ekstreleri (`docs/plan-erp/02-LUCA-ENVANTERI.md:28-29`); FIFO cari
yaşlandırma ve adat (`:36`); çok depo ve depo bölümü (`:48`); döviz cinsinden fatura (`:55`);
iş merkezi tanımı (`:59`); üretim reçetesi (`:37`, `:63`); e-Defter ve banka entegrasyonu (`:42`).

Bizim tablo karşılıklarımız: cari → `Contact`; stok → `StockItem`/`StockUnit`/`Warehouse`/`StockMovement`;
çek-senet → `Cheque`/`Note`; yevmiye → `JournalEntry`/`JournalLine`; banka ekstresi →
`BankStatement`/`BankStatementLine`; adat/yaşlandırma → `LedgerBalance` + `06`'daki hesap kuralları;
iş merkezi → `CostCenter` fikri; reçete → `Recipe`.

**doğrulanacak:** Luca'nın tablo/alan düzeyi şeması (kapalı kaynak; demo ya da teknik doküman
gerekir); Luca'nın e-Defter dosya biçimi; Luca'nın stok maliyet yöntemi (FIFO mu ortalama maliyet mi)
ve bunun beyanı. Bu belgede **FIFO cari yaşlandırma** için kural yazılır, stok maliyet yöntemi
"doğrulanacak" olarak işaretlenir.

## 3. Bizde bugün

Mevcut tablolar ve kanıtları:

| Tablo | Dosya:satır | Not |
|---|---|---|
| `CompanySettings` (tek satır) | `server/YesLojistik.Core/Entities/CompanySettings.cs:5` | `Id = 1` varsayar |
| `BaseEntity` (ortak temel) | `server/YesLojistik.Core/Entities/BaseEntity.cs:3` | Id, CreatedAt, UpdatedAt, CreatedBy, IsDeleted |
| `Customer` | `server/YesLojistik.Core/Entities/Customer.cs:3` | Devir bakiyesi `:25`; risk limiti `:28`; e-Fatura kullanıcısı `:18` |
| `Supplier` | `server/YesLojistik.Core/Entities/Supplier.cs:4` | Tür (taşeron/servis/yakıt) `:7`; devir `:21` |
| `Invoice` + `InvoiceLine` | `server/YesLojistik.Core/Entities/Invoice.cs:3`, `:45` | KDV/tevkifat `:15-17`; ETTN `:29` |
| `EInvoiceSequence` | `Invoice.cs:56` | Seri + yıl + sıradaki |
| `Payment` | `server/YesLojistik.Core/Entities/Payment.cs:3` | Çek/senet alanları `:18-23` |
| `CashAccount` + `CashTransfer` | `server/YesLojistik.Core/Entities/CashAccount.cs:4`, `:17` | Bakiye saklanmaz, hareketlerden hesaplanır |
| `Expense` | `server/YesLojistik.Core/Entities/Expense.cs:3` | Şoför avansı `:17`; onay `:33` |
| `Trip` | `server/YesLojistik.Core/Entities/Trip.cs:3` | KDV alanları `:67-71`; `IsLegacy` `:17` |
| `SupplierPayment` | `server/YesLojistik.Core/Entities/SupplierPayment.cs:4` | `TripIds` toplu ödeme `:15` |
| `PurchaseInvoice` | `server/YesLojistik.Core/Entities/PurchaseInvoice.cs:7` | KDV tutarı `:17`, oran alanı **yok** |
| `AuditLog` | `server/YesLojistik.Core/Entities/AuditLog.cs:4` | Değişen alanlar metin olarak `:17` |
| `StoredFile` | `server/YesLojistik.Core/Entities/StoredFile.cs:4` | İçerik veritabanında |
| `User` / `RefreshToken` / `PasswordResetToken` | `server/YesLojistik.Core/Entities/User.cs:3`, `:35`, `:46` | Rol `:8`; 2FA alanları `:25-31` |

**Eksik tablolar (bugün kodda yok).** Kaynak taramasında **hiçbir** `CompanyId`/`TenantId` alanı
bulunmadı; `Account`, `JournalEntry`, `JournalLine`, `AccountingPeriod`, `LedgerBalance`, `Contact`,
`ContactAddress`, `DocumentSeries`, `VatCode`, `WithholdingCode`, `Currency`, `ExchangeRate`,
`StockItem`, `StockUnit`, `Warehouse`, `StockMovement`, `PaymentAllocation`, `BankAccount`,
`BankStatement`, `BankStatementLine`, `Cheque`, `Note`, `Order`, `OrderLine`, `ProductionOrder`,
`Recipe`, `FixedAsset`, `Attachment` sınıfları da yok. (Mevcut `Payment` tablosu cari tahsilatını
tutar; `PaymentAllocation` kapanış dağıtımıdır, farklı iştir.)

## 4. Hedef ekranlar ve alanlar

Bu bölüm **alan adı ve tipi sözlüğüdür**; tablo ayrıntısı §6'dadır. Ortak tipler:

| Tip | Anlam | Karar |
|---|---|---|
| `Money` | `decimal(18,2)` | 2 kuruş; yuvarlama `server/YesLojistik.Core/Domain/Money.cs:3` |
| `Rate` | `decimal(5,2)` | Yüzde (ör. `20.00`) |
| `Tenths` | `int` | Tevkifat onda biri (ör. `2` = 2/10) |
| `Day` | `DateOnly` | Kayıt tarihi |
| `Stamp` | `DateTime` (UTC) | Oluşma/değişme anı |
| `Code` | `string(20)` | Hesap kodu, seri öneki |
| `Ref` | `int` | Başka tabloya kimlik |

**Alan adı kuralları.** (a) Tutar alanları `Amount`/`Total`/`Subtotal`; KDV için `VatRate`,
`VatAmount`; tevkifat için `WithholdingTenths`, `WithholdingAmount`, `WithholdingCode`. (b) Durum
alanları `Status`; iptal için `IsCancelled` + `CancelReason` (mevcut desen:
`server/YesLojistik.Core/Entities/PurchaseInvoice.cs:22-23`). (c) Başka sistemden gelen kimlik
`ExternalRef` (mevcut desen: `PurchaseInvoice.cs:28`). (d) Eski panel kimliği `LegacyKey`
(mevcut desen: `Customer.cs:41`).

**Şirket ayrımı kuralı.** Her yeni tabloda `CompanyId int not null` + `Company` ilişkisi. Tek
istisna: `Company` tablosunun kendisi. Mevcut tablolarda `CompanyId` **önce boş olabilir**
(nullable), doldurulduktan sonra zorunluya çevrilir (`04-HEDEF-MIMARI.md` §5.3).

## 5. İş kuralları

### 5.1 Migration kuralı (yalnız ekleme)

- Yeni tablo: serbestçe eklenir.
- Mevcut tabloya yeni alan: yalnız **boş olabilir** (nullable) ya da varsayılan değerli.
- Alan **tipi daraltılmaz**, alan **silinmez**, tablo **yeniden adlandırılmaz**.
- Veri taşıyan (dönüştüren) migration yazılmaz; doldurma ayrı bir "veri işi" olarak, yedek alındıktan
  sonra yapılır (`docs/plan-erp/01-ORTAK-SARTNAME.md:22-23`).
- Canlı veritabanı açılışta migrate edilir; bu yüzden migration kısa ve kilit süresi düşük olmalı.
- Yeni zorunlu alan gerekiyorsa: (1) nullable ekle, (2) doldur, (3) ayrı migration ile zorunlu yap.

### 5.2 İndeks kuralları

- Her yeni tabloda birincil anahtar `Id` (ya da `AuditLog`/`StoredFile` gibi yüksek hacimlilerde `long`).
- Bütün yeni tablolarda ilk indeks `(company_id)` ya da `(company_id, <iş anahtarı>)`.
- Tekil indeksler yumuşak silmeyi dışlar: `HasFilter("is_deleted = false")` deseni
  (`AppDbContext.cs:66`).
- Tarih alanlarına indeks: belge tarihi, vade, hareket tarihi (mevcut desen `AppDbContext.cs:248`).
- Yabancı anahtar indeksi zorunlu (PostgreSQL otomatik kurmaz).
- Kısmi tekil indeks örnekleri: `e_invoice_no IS NOT NULL` (`AppDbContext.cs:306`),
  `client_request_id IS NOT NULL` (`AppDbContext.cs:266`).

### 5.3 Çok şirketli ayrım

- Bütün iş tablolarında `CompanyId`; sorgular `AppDbContext` global süzgeciyle şirkete bağlanır.
- Süzgeç tek noktada kurulduğu için (`AppDbContext.cs:54-58`) tablo başına kod yazılmaz.
- Arka plan işleri ve raporlar şirket bağlamını **açıkça** taşır; süzgece güvenip bağlamsız sorgu
  yazılmaz.
- Şirketler arası paylaşılan tanımlar (ör. resmî hesap planı şablonu) `CompanyId = 0` ya da ayrı bir
  "sistem" şirketiyle tutulur; **doğrulanacak:** hangi yaklaşımın seçileceği.

### 5.4 Silme ve değiştirilmezlik

- Finansal hareketler (fiş, stok hareketi, tahsilat, ödeme) **silinmez**; iptal (ters kayıt) kullanılır
  (`06-MUHASEBE-MOTORU.md`).
- Fatura zaten iptal edilir, numara boşluğu oluşmaz
  (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:203`).
- Kart kayıtları (cari, stok, hesap) yumuşak silinir (`IsDeleted`); referans varsa silinemez, yalnız
  pasife alınır (`IsActive`, mevcut desen `Customer.cs:23`).
- Ekler (`Attachment`) yumuşak silinir; saklama süresi dolunca arşive alınır.

## 6. Veri modeli

Aşağıdaki tablolarda **E** = mevcut tabloya ekleme, **Y** = yeni tablo. Bütün yeni tablolarda
`CompanyId` (Y) ve ortak denetim alanları bulunur.

### 6.1 Kuruluş ve dönem

**`Company` (Y).** Amaç: bir ya da çok tüzel kişiliği tutmak. Alanlar: `Id`, `Title`, `TaxNumber`
(10/11 hane), `TaxOffice`, `Address`, `City`, `District`, `Phone`, `Email`, `Website`, `MersisNo`,
`TradeRegistryNo`, `LogoDataUrl`, `IsActive`, `ParentCompanyId` (grup şirketi için, boş olabilir).
İlişkiler: `CompanySettings` (1-1), bütün iş tabloları (1-N). Modül: Yönetici. Migration: yeni tablo;
mevcut `CompanySettings` kaydı **kopyalanmaz**, yalnız bir `Company` satırı oluşturulup `CompanySettings`
ona bağlanır. İndeks: `(tax_number)` tekil (yumuşak silme filtresiyle). **doğrulanacak:** grup şirketi
senaryosu gerekli mi.

**`CompanySettings` (E).** Mevcut tablo korunur; `CompanyId int?` eklenir. Bugünkü bütün alanlar
(varsayılan KDV, tevkifat, fatura öneki, ayna, lisans) yerinde kalır. Kaynak:
`server/YesLojistik.Core/Entities/CompanySettings.cs:5`.

**`AccountingPeriod` (Y).** Amaç: mali dönem ve kapanış durumu. Alanlar: `Id`, `CompanyId`, `Year`,
`StartDate`, `EndDate`, `Status` (`Open`/`Closed`/`Locked`), `ClosedAt`, `ClosedBy`, `ReopenReason`.
İlişkiler: `JournalEntry` (1-N). Modül: Muhasebe. Migration: yeni tablo. İndeks: `(company_id, year, start_date)`
tekil. Kural: kapalı döneme fiş yazılamaz; açmak yönetici onayı + denetim izi gerektirir.

**`Currency` (Y).** Amaç: döviz türleri. Alanlar: `Id`, `Code` (ISO, `TRY`/`USD`/`EUR`), `Name`,
`Symbol`, `IsBase` (tek satır true), `Decimals`. İlişkiler: `ExchangeRate`, `Invoice`, `Payment`.
Modül: Fatura, Finans. Migration: yeni tablo. İndeks: `(code)` tekil; `(is_base)` kısmi tekil.
**doğrulanacak:** TCMB kur kaynağı ve kullanım koşulları.

**`ExchangeRate` (Y).** Amaç: günlük kur. Alanlar: `Id`, `CompanyId` (kur firma bazında olabilir),
`CurrencyId`, `Date`, `ForexBuying`, `ForexSelling`, `Source` (`TCMB`/`Manuel`). İlişkiler:
`Currency` (N-1). Modül: Fatura, Finans, Muhasebe (kur farkı). Migration: yeni tablo. İndeks:
`(company_id, currency_id, date)` tekil.

### 6.2 Hesap planı ve muhasebe

**`Account` (Y).** Amaç: hesap planı hiyerarşisi. Alanlar: `Id`, `CompanyId`, `Code` (ör. `120`,
`120.01`), `Name`, `ParentAccountId` (boş olabilir), `Level` (1-5), `Kind`
(`Asset`/`Liability`/`Equity`/`Income`/`Expense`/`OffBalance`), `NormalBalance` (`Debit`/`Credit`),
`IsPostable` (yalnız yaprak hesaplara fiş yazılır), `CurrencyId` (boş = firma para birimi),
`IsActive`, `TaxNumber` (ör. KDV hesabı için), `Notes`. İlişkiler: kendine öz-referans (ağaç),
`JournalLine` (1-N), `LedgerBalance` (1-N). Modül: Muhasebe; bütün modüller hesap kodu sorar.
Migration: yeni tablo. İndeks: `(company_id, code)` tekil; `(parent_account_id)`. Kural:
hesap silinmez, pasife alınır; kod değişikliği denetim izine yazılır.

**`JournalEntry` (Y).** Amaç: yevmiye fişi başlığı. Alanlar: `Id`, `CompanyId`, `PeriodId`,
`EntryNo` (seriden), `Date`, `Kind` (`Opening`/`Daily`/`Closing`/`Adjustment`/`Reversal`),
`SourceType` (`Invoice`/`PurchaseInvoice`/`Payment`/`SupplierPayment`/`CashTransfer`/`Expense`/
`Cheque`/`Manual`/`Depreciation`/`StockCount`), `SourceId` (kaynak belge kimliği), `Description`,
`TotalDebit`, `TotalCredit`, `Status` (`Draft`/`Approved`/`Reversed`), `ApprovedBy`, `ApprovedAt`,
`ReversalOfId` (ters kayıt bağlantısı), `AttachmentCount`. İlişkiler: `JournalLine` (1-N),
`AccountingPeriod` (N-1). Modül: Muhasebe. Migration: yeni tablo. İndeks: `(company_id, entry_no)`
tekil; `(company_id, date)`; `(source_type, source_id)` tekil (aynı belgeye iki fiş yazılmasın).
Kural: `TotalDebit == TotalCredit` değilse kayıt yapılamaz.

**`JournalLine` (Y).** Amaç: fiş satırı. Alanlar: `Id`, `CompanyId`, `JournalEntryId`, `LineNo`,
`AccountId`, `Description`, `Debit`, `Credit`, `CurrencyId`, `AmountCurrency`, `ExchangeRate`,
`ContactId` (cari muavin için), `VatCodeId`, `WithholdingCodeId`, `CostCenterId`, `DocumentNo`
(kaynak belge no), `DueDate` (vade; cari satırlarında dolu). İlişkiler: `JournalEntry` (N-1),
`Account` (N-1), `Contact` (N-1, boş olabilir). Modül: Muhasebe. Migration: yeni tablo. İndeks:
`(journal_entry_id, line_no)`; `(company_id, account_id, due_date)`; `(contact_id)`. Kural:
satırda `Debit` ve `Credit` aynı anda dolu olamaz.

**`LedgerBalance` (Y).** Amaç: dönem/hesap bazında özet (mizan hızı). Alanlar: `Id`, `CompanyId`,
`PeriodId`, `AccountId`, `ContactId` (boş olabilir), `OpeningDebit`, `OpeningCredit`, `Debit`,
`Credit`, `ClosingDebit`, `ClosingCredit`, `LastEntryId`, `UpdatedAt`. Modül: Muhasebe, Analiz.
Migration: yeni tablo. İndeks: `(company_id, period_id, account_id)` tekil; `(contact_id)`.
Kural: **türetilmiş** tablodur; fiş değişince aynı transaction içinde güncellenir ve her zaman
fişlerden yeniden üretilebilir olmalıdır (özet ile detay farkı testi zorunlu).

### 6.3 Cari (Contact) ve adres

**`Contact` (Y).** Amaç: müşteri ve tedarikçiyi **tek kartta** tutmak (Luca'daki cari mantığı).
Alanlar: `Id`, `CompanyId`, `Code` (otomatik, ör. `C00001`), `Title`, `ShortName`, `Kind` (bayrak
kümesi: `IsCustomer`, `IsSupplier`, `IsCarrier`), `TaxNumber`, `TaxOffice`, `IsCompanyTaxNumber`
(10 hane mi), `TcIdentityNo` (11 hane), `Phone`, `Email`, `Website`, `Fax`, `ContactName`,
`Country`, `City`, `District`, `Neighborhood`, `Street`, `BuildingNo`, `DoorNo`, `PostalCode`,
`Address`, `IsEInvoiceUser`, `EInvoiceAlias`, `PaymentTermDays`, `CreditLimit`, `CurrencyId`,
`OpeningBalance`, `OpeningBalanceDate`, `IsActive`, `Notes`, `LegacyKey`, `LegacyBalance`,
`LegacyBalanceAt`. İlişkiler: `ContactAddress` (1-N), `Customer` (1-1 eşleme, boş olabilir),
`Supplier` (1-1 eşleme, boş olabilir), `Invoice`, `Payment`, `SupplierPayment`, `JournalLine`.
Modül: Cari, Fatura, Finans. Migration: yeni tablo; mevcut `Customer`/`Supplier` kayıtları için
**satır oluşturulur ve yalnız kimlik alanları kopyalanır**; eski tablolara `ContactId int?` eklenir.
Eski tablolar **çalışmaya devam eder** (çift yazım dönemi). İndeks: `(company_id, code)` tekil;
`(company_id, title)`; `(tax_number)`; `(legacy_key)`.

**`ContactAddress` (Y).** Amaç: bir carinin birden çok adresi (fatura, sevk, şantiye). Alanlar:
`Id`, `CompanyId`, `ContactId`, `Kind` (`Invoice`/`Shipping`/`Other`), `Title`, `Country`, `City`,
`District`, `Neighborhood`, `Street`, `BuildingNo`, `DoorNo`, `PostalCode`, `Phone`, `IsDefault`.
İlişkiler: `Contact` (N-1). Modül: Cari, Fatura (e-Fatura adresi). Migration: yeni tablo. İndeks:
`(contact_id, kind)`; `(company_id, city)`.

**Mevcut `Customer` ve `Supplier` ile bağ.** `Customer` (`Customer.cs:3`) ve `Supplier`
(`Supplier.cs:4`) tablolarına `ContactId int?` eklenir; ayna ve pratikortam senkronu bu iki tabloyu
kullanmaya devam eder (`LegacyKey` alanı bakiye eşlemesi için zaten var: `Customer.cs:41`,
`Supplier.cs:25`). Geçiş tamamlanınca okuma yolu `Contact`'a çevrilir; eski tablolar arşiv görevi
görür. **Kural:** aynı anda iki kaynak yazılmaz; yazma tek yönlüdür ve tek bir servis üzerinden yapılır.

### 6.4 Belge serileri, KDV ve tevkifat kodları

**`DocumentSeries` (Y).** Amaç: belge numara serileri (tek merkez). Alanlar: `Id`, `CompanyId`,
`DocumentType` (`SalesInvoice`/`PurchaseInvoice`/`Waybill`/`JournalEntry`/`Receipt`/`Order`/
`ProductionOrder`), `Prefix`, `Year`, `NextNumber`, `Padding` (basamak, ör. 6), `Separator`,
`IsLocked`, `ResetYearly`. İlişkiler: yok (yalnız sayaç). Modül: bütün belge üreten modüller.
Migration: yeni tablo; mevcut `next_invoice_number` ve `e_invoice_sequences` değerleri **taşınır**
(okuma; eski alanlar bir süre daha güncellenir). İndeks: `(company_id, document_type, prefix, year)`
tekil. Sayım deseni mevcut koddan alınır
(`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:223-227`,
`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:41-46`).

**`VatCode` (Y).** Amaç: KDV oranı ve istisna kodu tanımı. Alanlar: `Id`, `CompanyId`, `Code`
(ör. `KDV20`, `IST311`), `Name`, `Rate` (`0`/`1`/`10`/`20`), `Kind` (`Standard`/`Exempt`/`Zero`),
`ExemptionCode` (ör. `311`), `Direction` (`Sales`/`Purchase`/`Both`), `IsActive`. Modül: Fatura,
Alınan Fatura, Gider, Muhasebe. Migration: yeni tablo; varsayılan satırlar kod içinden eklenir
(`%0, %1, %10, %20`; istisna `311` — mevcut sabit
`server/YesLojistik.Core/Domain/InvoiceCalculator.cs:48`). İndeks: `(company_id, code)` tekil.

**`WithholdingCode` (Y).** Amaç: tevkifat oranı ve kodu. Alanlar: `Id`, `CompanyId`, `Code`
(ör. `624`), `Name`, `Tenths` (2 = 2/10), `Direction`, `AppliesAbove` (KDV dahil eşik; varsayılan
`12.000,00 TL`, kaynak `InvoiceCalculator.cs:25`), `RequiresCompanyTaxNumber` (10 hane şartı;
`InvoiceCalculator.cs:38`). Modül: Fatura, Alınan Fatura, Muhasebe. Migration: yeni tablo. İndeks:
`(company_id, code)` tekil. **doğrulanacak:** yürürlükteki tevkifat oranları ve kod listesi;
mali müşavir onayı gerekir.

### 6.5 Stok ve depo

**`StockUnit` (Y).** Amaç: ölçü birimi. Alanlar: `Id`, `CompanyId`, `Code` (`KG`, `LT`, `AD`, `M3`),
`Name`, `Decimals`, `IsBase`. İlişkiler: `StockItem` (N-1), `StockMovement`. Modül: Stok. Migration:
yeni tablo. İndeks: `(company_id, code)` tekil.

**`StockItem` (Y).** Amaç: stok kartı. Alanlar: `Id`, `CompanyId`, `Code`, `Name`, `Category`,
`SubCategory`, `UnitId`, `Barcode`, `VatCodeId`, `PurchaseVatCodeId`, `SalePrice`, `PurchasePrice`,
`MinLevel`, `MaxLevel`, `TrackingType` (`None`/`Lot`/`Serial`), `IsActive`, `Notes`, `ExternalRef`.
İlişkiler: `StockUnit` (N-1), `StockMovement` (1-N), `InvoiceLine` (boş olabilir satır bağı),
`Recipe` (1-N). Modül: Stok, Fatura, Satınalma, Üretim. Migration: yeni tablo. İndeks:
`(company_id, code)` tekil; `(company_id, name)`; `(barcode)` kısmi (`barcode IS NOT NULL`);
`(category)`. **doğrulanacak:** barkod okuyucu markası ve barkod standardı.

**`Warehouse` (Y).** Amaç: depo ve depo bölümü. Alanlar: `Id`, `CompanyId`, `Code`, `Name`,
`ParentWarehouseId` (bölüm için), `Address`, `ResponsibleName`, `IsActive`. İlişkiler:
`StockMovement` (1-N), `ProductionOrder`. Modül: Stok, Üretim. Migration: yeni tablo. İndeks:
`(company_id, code)` tekil; `(parent_warehouse_id)`. Çok depo, Luca Koza'nın "birden fazla depo ve
depo bölümü" özelliğinin karşılığıdır (`docs/plan-erp/02-LUCA-ENVANTERI.md:48`).

**`StockMovement` (Y).** Amaç: stok giriş/çıkış/devir/nakil hareketi. Alanlar: `Id`, `CompanyId`,
`StockItemId`, `WarehouseId`, `Date`, `Kind` (`In`/`Out`/`Transfer`/`Opening`/`CountAdjust`/
`ProductionIn`/`ProductionOut`), `Quantity`, `UnitId`, `UnitPrice`, `Total`, `CurrencyId`,
`SourceType` (`Invoice`/`PurchaseInvoice`/`Order`/`ProductionOrder`/`Manual`/`Count`), `SourceId`,
`SourceLineId`, `LotNo`, `SerialNo`, `Description`, `ExternalRef`. İlişkiler: `StockItem`,
`Warehouse`; `InvoiceLine`/`OrderLine` (kaynak). Modül: Stok, Fatura, Sipariş, Üretim, Sayım.
Migration: yeni tablo. İndeks: `(company_id, stock_item_id, warehouse_id, date)`;
`(source_type, source_id)`; `(lot_no)` kısmi. Kural: hareket silinmez; yanlış hareket ters hareketle
düzeltilir. **doğrulanacak:** stok maliyet yöntemi (FIFO mu ağırlıklı ortalama mı) ve maliyet
katmanlarının tutulup tutulmayacağı.

### 6.6 Fatura, tahsilat ve ödeme

**`Invoice` (E) ve `InvoiceLine` (E).** Mevcut tablolar korunur (`Invoice.cs:3`, `Invoice.cs:45`).
Eklenenler: `CompanyId int?`, `ContactId int?`, `SeriesId int?`, `CurrencyId int?`, `ExchangeRate
decimal?`, `PeriodId int?`, `JournalEntryId int?`, `VatCodeId int?`, `WithholdingCodeId int?`,
`IrregularityReason` (belge düzeninde istisna gerekçesi). `InvoiceLine`'a: `CompanyId`, `StockItemId
int?`, `WarehouseId int?`, `UnitId int?`, `Quantity decimal?`, `UnitPrice decimal?`, `VatCodeId int?`,
`DiscountRate decimal?`, `CostCenterId int?`. Kural: mevcut KDV/tevkifat alanları (`Invoice.cs:15-17`)
**korunur**; yeni kod/`VatCode` alanları ek bilgidir, eskisini ezmez.

**`Payment` (E).** Mevcut tahsilat tablosu korunur (`Payment.cs:3`). Eklenenler: `CompanyId int?`,
`ContactId int?`, `PeriodId int?`, `JournalEntryId int?`, `AccountId int?` (kasa/banka `CashAccount`
yanında ERP hesabı). Çek/senet alanları yerinde kalır (`Payment.cs:18-23`).

**`PaymentAllocation` (Y).** Amaç: bir tahsilatın hangi faturaya/kaleme ne kadar kapandığını tutmak
(FIFO dağıtımının kalıcı izi). Alanlar: `Id`, `CompanyId`, `PaymentId` (ya da `SupplierPaymentId`),
`TargetType` (`SalesInvoice`/`PurchaseInvoice`/`Trip`), `TargetId`, `Amount`, `AppliedAt`. İlişkiler:
`Payment`, `Invoice`. Modül: Cari, Finans, Muhasebe. Migration: yeni tablo. İndeks:
`(company_id, payment_id)`; `(target_type, target_id)`. Bugünkü FIFO dağıtımı **hesapla** yapılıyor
(`server/YesLojistik.Core/Domain/PaymentAllocator.cs:19`); bu tablo aynı sonucu **saklar**, böylece
geçmiş değişmez.

**`Cheque` (Y).** Amaç: alınan/verilen çek. Alanlar: `Id`, `CompanyId`, `Direction`
(`Received`/`Given`), `ContactId`, `SerialNo`, `BankName`, `BankBranch`, `AccountNo`, `Amount`,
`CurrencyId`, `IssueDate`, `DueDate`, `Status` (`Portfolio`/`InCollection`/`Collected`/`Endorsed`/
`Bounced`/`Returned`), `EndorsedToContactId`, `CollectionAccountId`, `LegacyKey`, `Notes`.
İlişkiler: `Contact`, `CashAccount`, `Payment` (boş olabilir). Modül: Banka & Çek, Muhasebe.
Migration: yeni tablo. İndeks: `(company_id, due_date)`; `(company_id, status)`;
`(contact_id)`. Mevcut `Payment` içindeki çek alanları (`Payment.cs:18-23`) korunur; yeni tablo
çek/senedi **kendi kartı** olarak tutar. Taşıma: mevcut çek alanları olan tahsilatlar için `Cheque`
satırı üretilir, eski alanlar silinmez.

**`Note` (Y).** Amaç: senet (borç/alacak senedi). Alanlar: `Id`, `CompanyId`, `Direction`,
`ContactId`, `SerialNo`, `Amount`, `CurrencyId`, `IssueDate`, `DueDate`, `Status`, `Guarantor`,
`Notes`. Modül: Banka & Çek, Muhasebe. Migration: yeni tablo. İndeks: `(company_id, due_date)`,
`(contact_id)`. Mevcut `PaymentMethod.PromissoryNote` (`server/YesLojistik.Core/Entities/Enums.cs:35`)
ve `InstrumentStatus` (`Enums.cs:61`) enum'ları yeniden kullanılır.

### 6.7 Kasa, banka ve ekstre

**`CashAccount` (E).** Mevcut tablo korunur (`CashAccount.cs:4`). Eklenenler: `CompanyId int?`,
`AccountId int?` (muhasebe hesabı bağı), `CurrencyId int?`, `IsCashRegister` (yazar kasa).
Kural: bakiye saklanmaz, hareketlerden hesaplanır (mevcut yorum: `CashAccount.cs:3`).

**`BankAccount` (Y).** Amaç: banka hesabının banka tarafı bilgisi (kasa/banka hesabından ayrı).
Alanlar: `Id`, `CompanyId`, `CashAccountId` (bire bir), `BankName`, `BranchName`, `BranchCode`,
`AccountNo`, `Iban`, `SwiftCode`, `CurrencyId`, `IsActive`. İlişkiler: `CashAccount` (1-1),
`BankStatement` (1-N). Modül: Banka & Çek, Finans. Migration: yeni tablo. İndeks: `(company_id, iban)`
kısmi; `(cash_account_id)` tekil. IBAN doğrulaması mevcut yardımcıdan:
`server/YesLojistik.Core/Domain/IbanValidator.cs:1`.

**`BankStatement` (Y).** Amaç: banka ekstresi başlığı (çekilen ya da yüklenen). Alanlar: `Id`,
`CompanyId`, `BankAccountId`, `PeriodStart`, `PeriodEnd`, `OpeningBalance`, `ClosingBalance`,
`Source` (`Manual`/`File`/`Api`), `FileName`, `ImportedAt`, `ImportedBy`, `Status`
(`Imported`/`Reconciled`/`Partial`). İlişkiler: `BankStatementLine` (1-N). Modül: Banka.
Migration: yeni tablo. İndeks: `(company_id, bank_account_id, period_start)` tekil.
**doğrulanacak:** banka ekstresi servisleri (protokol, yetki, ücret) — hangi bankalar desteklenecek.

**`BankStatementLine` (Y).** Amaç: ekstre satırı ve mutabakat. Alanlar: `Id`, `CompanyId`,
`BankStatementId`, `LineNo`, `ValueDate`, `Description`, `Debit`, `Credit`, `Balance`, `Reference`,
`MatchStatus` (`Unmatched`/`Matched`/`Ignored`), `MatchedType` (`Payment`/`SupplierPayment`/
`CashTransfer`/`Expense`/`JournalLine`), `MatchedId`, `MatchedBy`, `MatchedAt`. Modül: Banka,
Muhasebe. Migration: yeni tablo. İndeks: `(bank_statement_id, line_no)` tekil;
`(company_id, match_status)`; `(value_date)`.

### 6.8 Sipariş, üretim ve sabit kıymet

**`Order` (Y).** Amaç: satış ve satınalma siparişi (tek tablo, iki yön). Alanlar: `Id`, `CompanyId`,
`OrderNo` (seriden), `Direction` (`Sales`/`Purchase`), `ContactId`, `Date`, `DueDate`,
`Status` (`Draft`/`Confirmed`/`PartiallyFulfilled`/`Fulfilled`/`Cancelled`), `CurrencyId`,
`ExchangeRate`, `Subtotal`, `VatAmount`, `WithholdingAmount`, `Total`, `Notes`, `WarehouseId`,
`OwnerUserId`, `ExternalRef`. İlişkiler: `OrderLine` (1-N), `Contact` (N-1), `Invoice` (boş olabilir).
Modül: Sipariş, Satınalma, Satış. Migration: yeni tablo. İndeks: `(company_id, order_no)` tekil;
`(company_id, status, date)`; `(contact_id)`.

**`OrderLine` (Y).** Amaç: sipariş satırı. Alanlar: `Id`, `CompanyId`, `OrderId`, `LineNo`,
`StockItemId` (boş olabilir — hizmet satırı), `Description`, `Quantity`, `UnitId`, `UnitPrice`,
`DiscountRate`, `VatCodeId`, `Total`, `FulfilledQuantity`, `WarehouseId`, `ProductionOrderId`
(boş olabilir). Modül: Sipariş, Stok, Üretim. Migration: yeni tablo. İndeks:
`(order_id, line_no)`; `(stock_item_id)`. Lojistik bağı: sevkiyat satırı bu tabloya bağlanabilir
(`Trip` → `OrderLine`), böylece "siparişten teslimata" akışı kurulur
(`docs/plan-erp/02-LUCA-ENVANTERI.md:60`).

**`Recipe` (Y).** Amaç: üretim reçetesi (mamul + bileşenler). Alanlar: `Id`, `CompanyId`,
`StockItemId` (mamul), `Name`, `Version`, `OutputQuantity`, `UnitId`, `IsActive`, `Notes`.
İlişkiler: kendine bağlı `RecipeLine` (1-N), `ProductionOrder`. Modül: Üretim. Migration: yeni tablo.
İndeks: `(company_id, stock_item_id, version)` tekil.

**`ProductionOrder` (Y).** Amaç: üretim emri. Alanlar: `Id`, `CompanyId`, `OrderNo` (seriden),
`RecipeId`, `StockItemId`, `WarehouseId`, `PlannedQuantity`, `ProducedQuantity`, `ScrapQuantity`,
`PlannedStart`, `PlannedEnd`, `ActualStart`, `ActualEnd`, `Status` (`Draft`/`Planned`/`InProgress`/
`Completed`/`Cancelled`), `CostLabor`, `CostOverhead`, `CostMaterial`, `Shift`, `Notes`. İlişkiler:
`Recipe` (N-1), `StockMovement` (1-N), `OrderLine` (boş olabilir). Modül: Üretim, Stok, Muhasebe
(maliyet fişi). Migration: yeni tablo. İndeks: `(company_id, status, planned_start)`;
`(stock_item_id)`. Kural: üretim tamamlanınca malzeme çıkışı + mamul girişi **tek transaction**;
maliyet fişi `06`'daki kurallarla üretilir.

**`FixedAsset` (Y).** Amaç: sabit kıymet kartı ve amortisman. Alanlar: `Id`, `CompanyId`, `Code`,
`Name`, `Category`, `AccountId`, `DepreciationAccountId`, `ExpenseAccountId`, `AcquisitionDate`,
`AcquisitionCost`, `CurrencyId`, `UsefulLifeMonths`, `Method` (`StraightLine`/`Declining`),
`SalvageValue`, `AccumulatedDepreciation`, `NetBookValue`, `Status` (`Active`/`Sold`/`Scrapped`),
`DisposalDate`, `DisposalAmount`, `VehicleId` (boş olabilir — araçla ilişki), `Notes`. İlişkiler:
`Vehicle` (boş olabilir), `Account` (N-1). Modül: Sabit Kıymet, Muhasebe. Migration: yeni tablo.
İndeks: `(company_id, code)` tekil; `(company_id, status)`. **doğrulanacak:** amortisman oranları
ve mevzuat sınırları (mali müşavir onayı gerekir).

### 6.9 Denetim, ekler ve kuyruk

**`AuditLog` (E).** Mevcut tablo korunur (`AuditLog.cs:4`). Eklenenler: `CompanyId int?`,
`Module` (ör. `stock`), `CorrelationId` (aynı işlemin satırlarını bağlar), `IpAddress`,
`UserAgent`. Mevcut alanlar (`Action`, `EntityType`, `EntityId`, `Label`, `Changes` — `AuditLog.cs:11-17`)
aynen kalır; yazan mekanizma `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:9`.

**`Attachment` (Y).** Amaç: belge eki (fiş, fatura görseli, teslim fotoğrafı) için ortak tablo.
Alanlar: `Id`, `CompanyId`, `OwnerType` (`Invoice`/`PurchaseInvoice`/`JournalEntry`/`Trip`/
`Contact`/`FixedAsset`/`ProductionOrder`), `OwnerId`, `FileName`, `ContentType`, `Size`,
`StorageKey` (S3 yolu), `Hash` (sha256), `Kind` (`Photo`/`Document`/`Signature`), `UploadedBy`,
`UploadedAt`, `IsArchived`. İlişkiler: polimorfik (`OwnerType` + `OwnerId`). Modül: bütün modüller.
Migration: yeni tablo; mevcut `StoredFile` (`StoredFile.cs:4`) ve sevkiyat ekleri
(`TripAttachment`) **korunur**, yeni tablo ek olarak gelir. İndeks: `(company_id, owner_type, owner_id)`;
`(hash)`; `(storage_key)` tekil.

**`BackgroundJob` (Y).** Amaç: arka plan iş kuyruğu (`04-HEDEF-MIMARI.md` §5.6). Alanlar: `Id`,
`CompanyId`, `Type` (ör. `einvoice.send`), `Key` (tekilleştirme anahtarı), `Payload` (JSON),
`Status` (`Pending`/`Running`/`Done`/`Failed`/`NeedsAttention`), `Attempts`, `MaxAttempts`,
`NextAttemptAt`, `LockedBy`, `LockedAt`, `LastError`, `CreatedAt`, `FinishedAt`. Modül: Yönetici,
bütün arka plan işleri. Migration: yeni tablo. İndeks: `(status, next_attempt_at)`;
`(company_id, type, key)` tekil (kısmi: `status IN ('Pending','Running')`).

### 6.10 Mevcut tablolarla bağlantı özeti

| Mevcut tablo | Yeni bağ | Nasıl |
|---|---|---|
| `Trip` (`Trip.cs:3`) | `CostCenterId`, `ContactId` (taşeron), `OrderLineId`, `StockMovement` (yok) | Ekleme; `IsLegacy` (`Trip.cs:17`) anlamı korunur |
| `Customer` (`Customer.cs:3`) | `ContactId` | Ekleme; mevcut `LegacyKey`/`LegacyBalance` (`Customer.cs:41-43`) korunur |
| `Supplier` (`Supplier.cs:4`) | `ContactId` | Ekleme; `LegacyKey` (`Supplier.cs:25`) korunur |
| `Expense` (`Expense.cs:3`) | `CompanyId`, `JournalEntryId`, `VatCodeId`, `CostCenterId` | Ekleme |
| `Vehicle` | `FixedAssetId` | Ekleme; sabit kıymet kartı araçla eşleşir |
| `Driver` | `ContactId` (şoför cari olursa) | Ekleme; **doğrulanacak:** şoför cari kartı açılacak mı |
| `Invoice` (`Invoice.cs:3`) | `CompanyId`, `ContactId`, `SeriesId`, `PeriodId`, `JournalEntryId` | Ekleme; KDV/tevkifat alanları korunur |
| `Payment` (`Payment.cs:3`) | `CompanyId`, `ContactId`, `PeriodId`, `JournalEntryId` | Ekleme; çek alanları korunur |
| `PurchaseInvoice` (`PurchaseInvoice.cs:7`) | `CompanyId`, `ContactId`, `PeriodId`, `JournalEntryId`, `VatCodeId` | Ekleme; **`VatRate` alanı yok**, yalnız tutar var — oran alanı eklenir |
| `CashAccount` (`CashAccount.cs:4`) | `CompanyId`, `AccountId`, `BankAccountId` | Ekleme |

## 7. API uçları

Tablo → uç eşlemesi (tam uç listesi `04-HEDEF-MIMARI.md` §7):

| Tablo | Uç |
|---|---|
| `Company`, `CompanySettings` | `/api/erp/companies`, `/api/settings` |
| `AccountingPeriod` | `/api/erp/periods`, `/api/erp/periods/{id}/close` |
| `Account` | `/api/erp/accounts` |
| `JournalEntry`/`JournalLine` | `/api/erp/journal-entries` |
| `LedgerBalance` | `/api/erp/trial-balance`, `/api/erp/ledger/{accountId}` |
| `Contact`/`ContactAddress` | `/api/erp/contacts`, `/api/erp/contacts/{id}/addresses` |
| `DocumentSeries` | `/api/erp/document-series` |
| `VatCode`/`WithholdingCode` | `/api/erp/vat-codes`, `/api/erp/withholding-codes` |
| `Currency`/`ExchangeRate` | `/api/erp/currencies`, `/api/erp/exchange-rates` |
| `StockItem`/`StockUnit`/`Warehouse`/`StockMovement` | `/api/erp/stock/*` |
| `PaymentAllocation` | `/api/erp/payments/{id}/allocations` |
| `Cheque`/`Note` | `/api/erp/instruments` |
| `BankAccount`/`BankStatement`/`BankStatementLine` | `/api/erp/bank/*` |
| `Order`/`OrderLine` | `/api/erp/orders` |
| `Recipe`/`ProductionOrder` | `/api/erp/production/*` |
| `FixedAsset` | `/api/erp/assets` |
| `AuditLog` | `/api/audit` |
| `Attachment` | `/api/erp/attachments` |
| `BackgroundJob` | `/api/erp/jobs` |

## 8. Yetki, onay ve denetim izi

- **Şirket süzgeci yetkiden önce gelir:** yanlış şirket kimliğiyle istek 403/404 döner; hiçbir liste
  karşı şirketin satırını görmez.
- **Alan bazlı gizleme:** maliyet ve kâr alanları (`StockItem.PurchasePrice`, `FixedAsset.AcquisitionCost`,
  `OrderLine.UnitPrice` alış yönünde) yetki yoksa API yanıtından **çıkarılır**, panelde gizlenmez.
- **Onay gerektiren tablolar:** `JournalEntry` (onay), `AccountingPeriod` (kapatma),
  `FixedAsset` (çıkış), `DocumentSeries` (elle numara).
- **Denetim izi:** bütün yeni tablolarda oluşturma/güncelleme/iptal kaydı `AuditLog`'a yazılır;
  `CorrelationId` ile aynı işlemin satırları bağlanır.
- **Sır yok:** `CompanySettings.LicenseKey` gibi alanlar (`CompanySettings.cs:53`) hiçbir uçtan
  dönmez; mevcut kural korunur.

## 9. Kabul kriterleri

| # | Ölçüt | Hedef |
|---|---|---|
| 1 | Mevcut tablolar korunur | Hiçbir alan silinmez/yeniden adlandırılmaz; şema karşılaştırma testi |
| 2 | Ekleme migration | Bütün yeni alanlar nullable ya da varsayılanlı; veri kaybı 0 |
| 3 | Çok şirketli ayrım | İki şirketli kurulumda çapraz kayıt 0; en az 5 test |
| 4 | Cari birleşmesi | 500 caride `Contact` ↔ `Customer`/`Supplier` eşlemesi %100; bakiye farkı 0 |
| 5 | Fiş dengesi | Her `JournalEntry` için borç = alacak; ihlal 0 |
| 6 | Özet tutarlılığı | `LedgerBalance` ile fişlerden hesaplanan toplam farkı 0,00 TL |
| 7 | Numara serisi | 100 eşzamanlı kayıtta boşluk 0 |
| 8 | Stok | Her hareketin kaynağı var (`source_type`/`source_id` boş olamaz); ihlal 0 |
| 9 | Ekler | Şirket kökü dışına yazma denemesi başarısız |
| 10 | Silme kuralı | Finansal hareket tablolarında `DELETE` yetkisi yok; testle kanıtlı |

## 10. Testler

- **Birim:** hesap kodu ağacı kuralları, `JournalEntry` dengesi, `DocumentSeries` numara üretimi,
  tevkifat eşiği (`12.000,00 TL` + 10 hane VKN), KDV oranı doğrulaması. Yer:
  `server/YesLojistik.Tests/Unit/` (mevcut: `InvoiceCalculatorTests.cs` deseni).
- **Entegrasyon:** ekleme migration sonrası eski uçların çalışması; iki şirketli süzgeç; fatura →
  `StockMovement` + `JournalEntry` zinciri; `PaymentAllocation` ile FIFO sonucunun
  `server/YesLojistik.Core/Domain/PaymentAllocator.cs:19` hesabıyla aynı çıkması. Yer:
  `server/YesLojistik.Tests/Integration/`.
- **Veri taşıma testi (kuru prova):** müşteri/tedarikçi → `Contact` eşlemesi; bakiye ve
  `LegacyBalance` karşılaştırması; fark < 0,05 TL (`docs/GELISTIRME-PLANI.md:124`).
- **e2e:** cari kartı (tek kart), hesap planı ağacı, stok kartı, yevmiye fişi dengesi ekranı.
  Yer: `client/e2e/`.
- **Kabul:** iki şirketli kurulumda mizan; ekstre; BA-BS verisi (`06` ile).

## 11. Efor ve bağımlılıklar

| İş | Efor (kişi-gün) | Bağımlılık |
|---|---|---|
| `Company` + bütün tablolara `CompanyId` + süzgeç | 15-25 | `04` §5.3 |
| `Account` + hesap planı şablonu | 8-12 | — |
| `JournalEntry`/`JournalLine`/`LedgerBalance` | 12-18 | `06` |
| `AccountingPeriod` + kapanış | 5-8 | Muhasebe çekirdeği |
| `Contact` + `ContactAddress` + eşleme | 10-15 | Cari servisleri |
| `DocumentSeries` | 3-5 | — |
| `VatCode`/`WithholdingCode` | 3-5 | Mali müşavir teyidi |
| `Currency`/`ExchangeRate` | 4-6 | Kur kaynağı kararı |
| `StockUnit`/`StockItem`/`Warehouse`/`StockMovement` | 15-22 | `DocumentSeries` |
| `PaymentAllocation` | 4-6 | Muhasebe çekirdeği |
| `Cheque`/`Note` | 8-12 | Cari |
| `BankAccount`/`BankStatement`/`BankStatementLine` | 10-15 | Banka kararı |
| `Order`/`OrderLine` | 12-18 | Stok |
| `Recipe`/`ProductionOrder` | 12-18 | Stok |
| `FixedAsset` | 6-10 | Muhasebe çekirdeği |
| `Attachment` + S3 | 8-12 | Sağlayıcı kararı |
| `BackgroundJob` | 5-8 | — |

**Sıra:** `Company`/`CompanyId` → `Account` + `DocumentSeries` → `JournalEntry` → `Contact` → stok →
sipariş → üretim → kıymet/banka. `06-MUHASEBE-MOTORU.md` fiş kuralları, `JournalEntry` yazılmadan
önce netleşmelidir.

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma |
|---|---|---|
| Cari birleşmesi yarım kalır, iki kaynak çelişir | Yüksek | Çift yazım dönemi + tek yazma servisi; mutabakat testi (fark < 0,05 TL) |
| Eski tabloya zorunlu alan eklenir, canlı migrate patlar | Yüksek | Yalnız nullable; üç adımlı geçiş (§5.1) |
| `LedgerBalance` ile fişler ayrışır | Yüksek | Özet türetilmiş; aynı transaction; günlük tutarlılık testi |
| Hesap planı kodu karmaşası (aynı iş için iki hesap) | Orta | Kod içi şablon + "kod değişikliği denetim izi"; mali müşavir onayı |
| Stok maliyet yöntemi belirsizken hareket yazılması | Orta | Yöntem onaylanana kadar maliyet alanı boş; rapor maliyet göstermez |
| Enum'ların metin saklanması ileride ad değişikliği sorunu | Düşük | Değer adları bir daha değiştirilmez; yeni değer eklenir |
| Şirket süzgeci atlanan tek sorgu veri sızdırır | Yüksek | Global süzgeç + "süzgeçsiz sorgu" testi + kod incelemesi |
| Yüksek hacimli `AuditLog`/`Attachment` şişer | Orta | Arşivleme işi (`BackgroundJob`), S3, tarih bazlı bölümleme |

**doğrulanacak:** Luca tablo/alan şeması; Luca stok maliyet yöntemi; e-Defter berat/defter dosya
biçimi; tevkifat oran ve kodları; KDV istisna kodları; TCMB kur kaynağı ve kullanım koşulları;
banka ekstresi servisleri (hangi banka, protokol, ücret, test ortamı); e-Fatura entegratör API'si
(gelen belge, iptal, durum); barkod standardı ve okuyucu; sabit kıymet amortisman oranları;
S3 uyumlu sağlayıcı, bölge ve şifreleme; KVKK saklama süreleri (muhasebe belgesi, konum, ek).
Mevzuat yorumu bu belgede yapılmaz; **mali müşavir/avukat onayı gerekir**.

Sonraki belgeyle bağlantı: `06-MUHASEBE-MOTORU.md` bu tabloların üstünde çalışan hesap planı, fiş
üretimi, KDV/tevkifat, mizan, dönem kapatma ve e-Defter kurallarını tanımlar; `03` hangi tablonun
hangi pakette olduğunu, `04` hangi katmanda kullanıldığını belirler.
