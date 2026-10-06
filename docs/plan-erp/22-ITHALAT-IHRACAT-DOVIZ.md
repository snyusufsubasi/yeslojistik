# 22 — İthalat, İhracat ve Döviz

## 1. Amaç ve kapsam

Bu modül üç şeyi çözer: **yabancı parayla işlem yapmak** (dövizli alım-satım), **ithal edilen malın
gerçek maliyetini bulmak** (mal bedeli + nakliye + gümrük + sigorta) ve **ihracatı ayrı izlemek**
(istisna, belge takibi, tahsilat).

Nakliye firması için bu modülün anlamı yüksektir: uluslararası taşıma yapan bir firma müşterisinden
**döviz** alır, yurt dışı acentesine **döviz** öder, bazen kendi aracı/dorsesi için **ithal mal**
getirir. Bugün bu üç iş de TL olarak tutuluyor; kur farkı ve ithalat maliyeti hiçbir yerde
görünmüyor.

Modülün çözdüğü işler:

- Günlük döviz kurlarını sisteme almak (TCMB kaynağı **doğrulanacak**), geçmiş kurları saklamak.
- Dövizli satış/alış faturası kesmek; TL karşılığını ve kur farkını hesaplamak.
- İthalat dosyası açmak: mal bedeli, nakliye, sigorta, gümrük vergileri, ardiye; bunları **malın
  maliyetine dağıtmak**; dosyayı kapatmak.
- İhracat faturası, istisna kodu, KDV iadesi sınırı bilgisi (**doğrulanacak**), belge takibi.
- Proforma ve numune faturası düzenlemek (satış değil, teklif/beyan niteliğinde).
- Tedarikçi ve müşteri **ödeme planı** takibi (vadeli ödeme takvimi).
- Akreditasyon (L/C) ve vesaik mukabili (CAD) gibi ödeme biçimlerini kayıt altına almak
  (**doğrulanacak**).

Kapsam dışı olanlar:

- **Beyanname doldurma ve Gümrük/GİB'e elektronik gönderim kapsam dışı.** Biz belge ve hesap
  tutarız; resmî gönderim yapmayız.
- **Muhasebe fişi üretmek kapsam dışı** — `06-MUHASEBE-MOTORU.md` işidir.
- **Bankada döviz hesabı açma, SWIFT/IBAN doğrulama kapsam dışı** — `15-BANKA-ENTEGRASYON.md`.
- **Mevzuat yorumu yapılmaz.** İstisna, iade ve teşvik soruları mali müşavir/avukat onayına bağlıdır.

## 2. Luca'daki karşılığı

`02-LUCA-ENVANTERI.md:55-56` birebir şunu yazıyor: Luca Koza'da **"farklı döviz cinslerinden fatura
kesimi, işletmeye göre fatura tipi tanımlama, ithalat takibi ve dosya kapama, ithalat analizleri,
proforma ve numune faturası, müşteri/tedarikçi ödeme planı takibi"** vardır. Kaynak:
<https://luca.com.tr/> ve ürün sayfaları (`02-LUCA-ENVANTERI.md:11-12`). Menü omurgası
`02-LUCA-ENVANTERI.md:20-23`: bu işler ağırlıklı olarak **Fatura**, **Finans Yönetimi** ve
**Satınalma Yönetimi** menülerinin içindedir.

Buradan çıkan tasarım kararları:

1. İthalat "dosya" mantığıyla yürür: bir dosya numarası altında mal bedeli ve bütün masraflar toplanır;
   **dosya kapanınca** maliyet kesinleşir ve stoğa/mamule dağıtılır.
2. Proforma ve numune faturası ayrı belge türleridir; **stok ve ciro doğurmaz**, muhasebe fişi
   yazmaz. Bu ayrım ekranda açıkça belirtilir.
3. Ödeme planı, cari bakiyenin yanında **takvim** olarak görünür (vade, tutar, para birimi).

**doğrulanacak:** Luca'nın ithalat dosyası ekranı, masraf kalemlerinin maliyete dağıtım yöntemi
(tutar mı, ağırlık mı, hacim mi), dosya kapatma adımları, proforma/numune fatura şablonları, ödeme
planı ekranı, akreditasyon/vesaik takibinin olup olmadığı. Kaynak sitede yalnız özellik cümlesi var.

## 3. Bizde bugün

Bugün panelde **tek para birimi TL'dir.** Döviz, kur, kur farkı, ithalat dosyası ve ihracat istisnası
kavramları yoktur; yalnız birkaç hazır iz vardır.

- **Fatura tablosunda para birimi yok.** `server/YesLojistik.Core/Entities/Invoice.cs:11-19` matrah,
  KDV oranı, KDV tutarı, tevkifat ve toplam alanları var; **para birimi, kur ve TL karşılığı alanı
  yok**. `InvoiceCreateRequest` de yalnız TL varsayar
  (`server/YesLojistik.Core/Dtos/FinanceDtos.cs:18-20`).
- **Alış faturasında da para birimi yok.** `server/YesLojistik.Core/Entities/PurchaseInvoice.cs:15-20`
  aynı yapıda; `PurchaseInvoiceSaveRequest` (`FinanceDtos.cs:119-120`) kur taşımıyor.
- **e-Fatura para birimi sabit.** `server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:19`
  birebir `public const string Currency = "TRY";` — UBL belgesinde para kodu TL'ye sabitlenmiş.
- **Tedarikçi/müşteri kartında döviz yok.** `Supplier.cs:17-18` yalnız `PaymentTermDays` (vade günü)
  tutuyor; `Iban` alanı var ama **para birimi, IBAN'ın döviz mi TL mi olduğu** yazılı değil.
- **İhracat istisna kodları hazır.** `client/src/lib/labels.ts:238-243` üç istisna kodu tanımlı:
  `311` (14/1 uluslararası taşımacılık), `301` (11/1-a mal ihracatı), `302` (11/1-b hizmet ihracatı).
  Veri tarafında `Invoice.VatExemptionCode` alanı var (`Invoice.cs:38`) ve DTO'da taşınıyor
  (`FinanceDtos.cs:12`). Yani **istisnalı fatura kesilebiliyor** ama ihracat belge takibi yok.
- **Kur farkı kavramı yok.** `Payment` ve `SupplierPayment` yalnız TL tutar taşıyor
  (`FinanceDtos.cs:33-40`, `FinanceDtos.cs:87-92`); ödeme günü kurundan doğan fark hesaplanmıyor.
- **Ödeme planı takibi kısmen var.** Tedarikçi kartında vade günü (`Supplier.cs:18`), müşteri
  kartında `PaymentTermDays` (`MasterDataDtos.cs:8`) ve çek/senet vade takibi
  (`docs/AGENTS.md` §5, `Enums.cs:61`) mevcut. Ancak **döviz cinsinden** ödeme planı ve vadeli ithalat
  ödemesi takvimi yok.
- **İthalat/ihracat ekranı yok.** `client/src/pages/` altındaki 33 sayfada ithalat/ihracat/döviz
  adlı dosya yok; menüde (`client/src/lib/nav.ts:19-114`), sekmelerde
  (`client/src/lib/sections.ts:10-39`) ve rotalarda (`client/src/App.tsx:80-118`) karşılığı yok.
- **Kur servisi yok.** `server/` altında TCMB, kur, `ExchangeRate` adlı hiçbir sınıf/istek yok
  (arama sonucu boş).
- **Ortak parçalar hazır.** `PageShell`, `DataTable`, `FilterPanel`, `SumStrip`, `Modal` bugün
  kullanımda (`client/src/pages/VehicleExpensesPage.tsx:10-13`). **Not:**
  `docs/plan/01-ORTAK-SARTNAME.md:147-148` "PageShell kodda yok" diyor; bu ifade artık gerçek
  dışıdır.
- **Para biçimi tek yerde.** `server/YesLojistik.Core/Domain/Formatters.cs:32`
  `Currency(decimal) => value.ToString("N2", Tr) + " TL"` — döviz eklendiğinde bu biçim **para
  birimine göre** genişletilmelidir.

Eksik listesi: para birimi alanları, kur tablosu ve kur servisi, kur farkı hesabı, ithalat dosyası ve
masraf dağıtımı, dosya kapatma, ihracat belge takibi, proforma/numune fatura, dövizli ödeme planı,
akreditasyon/vesaik kaydı, ekranlar, API, yetkiler, testler.

## 4. Hedef ekranlar ve alanlar

**E1. Döviz kurları — `/doviz/kurlar`**
Haftalık/aylık tablo: Tarih, USD (alış/satış), EUR, GBP, diğer tanımlı birimler; kaynak (TCMB/elle),
"kullanıldığı belge sayısı". Düğmeler: **Kurları çek** (TCMB — **doğrulanacak**), **Elle gir**,
**Dışa aktar**. Satırda kaynak rozeti: "TCMB" veya "Elle". Elle girilen kur, çekilen kurun üzerine
yazmaz; ayrı satır olur ve belge hangisini kullandıysa o görünür.

**E2. Dövizli fatura formu (satış ve alışta ortak davranış)**
Mevcut fatura formuna eklenen alanlar:

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Para birimi | seçim | evet | TL · USD · EUR · GBP · (tanımlı diğerleri) |
| Kur | sayı (6 hane) | koşullu | Para birimi TL değilse zorunlu; fatura tarihindeki kurdan öneri |
| Kur tarihi | tarih | koşullu | Kurun hangi güne ait olduğu (öneri: fatura tarihi) |
| Tutar (döviz) | para | evet | Fatura satırlarının döviz toplamı |
| TL karşılığı | para | — | Salt okunur: döviz tutar × kur |
| Kur farkı | para | — | Yalnız ödeme/tahsilat ekranında görünür |
| Ödeme planı | alt tablo | hayır | Vade, tutar, para birimi, yöntem |
| İhracat mı | anahtar | evet | Açıksa istisna kodu ve ihracat belge alanları görünür |
| İstisna kodu | seçim | koşullu | Mevcut liste (`labels.ts:238-243`) |

**E3. İthalat dosyaları — `/ithalat/dosyalar`**
Liste sütunları: Dosya no, Tedarikçi (yurt dışı), Ülke, Para birimi, Mal bedeli (döviz), Masraf
toplamı (TL), Toplam maliyet (TL), Durum (Açık/Kapalı/İptal), Açılış, Kapanış. `SumStrip`: açık dosya
sayısı, açık dosyalarda bağlı masraf, kapanan dosya maliyeti.

**E4. İthalat dosyası kartı**
Sekmeler: **Mal kalemleri**, **Masraflar**, **Dağıtım**, **Belgeler**, **Ödeme planı**.

*Mal kalemleri:* stok/mamul, miktar, birim, birim fiyat (döviz), tutar (döviz), GTİP/kod (metin 20),
menşe ülke.

*Masraflar:* tür (Nakliye · Sigorta · Gümrük vergisi · Ardiye · Elleçleme · Müşavirlik · Diğer),
tarih, tutar, para birimi, kur, TL tutarı, ödendi mi, tedarikçi/kurum, belge no.

*Dağıtım:* masrafın hangi kaleme ne oranda yüklendiği. Yöntem seçimi: **Tutar oranı · Ağırlık · Hacim ·
Eşit · Elle**. Tablo: kalem, pay (%), masraf payı (TL), birim maliyet (TL). Yöntem **doğrulanacak**
(§12).

*Dosya kapatma:* kapalı dosya düzenlenemez; düzeltme ters kayıtla yapılır.

**E5. İhracat — `/ihracat`**
Liste: Fatura no, Müşteri, Ülke, Para birimi, Tutar (döviz), TL karşılığı, İstisna kodu, Gümrük
beyanname no, Teslim biçimi (Incoterm — **doğrulanacak**), Durum (Hazırlanıyor/Gönderildi/Kabul
edildi/İade), KDV iadesi durumu (kayıt amaçlı). Detay sekmesi: belgeler (beyanname, CMR/taşıma
belgesi, fatura), tahsilat planı, kur farkı.

**E6. Proforma / numune faturası — `/faturalar/proforma`**
Alanlar: belge türü (Proforma · Numune), müşteri, tarih, geçerlilik, para birimi, satırlar, toplam,
not. Ekranda kalıcı uyarı şeridi: **"Proforma ve numune faturası satış değildir; stok, ciro ve
muhasebe kaydı doğurmaz."** Bu belgeler gerçek faturaya **dönüştürülebilir** (tek tık, alanlar
kopyalanır).

**E7. Ödeme planı — `/odeme-plani`**
İki sekme: **Alacak** (müşteri) ve **Borç** (tedarikçi). Tablo: Vade, Cari, Belge no, Tutar, Para
birimi, TL karşılığı (vade günü kuru), Ödenen, Kalan, Gecikme (gün). Süzgeç: para birimi, cari, tarih
aralığı, "geciken". Takvim görünümünde haftalık gruplar.

## 5. İş kuralları

1. **Kur kaynağı ve seçimi.** Belge kendi kurunu taşır (fatura tarihi kuru). Kur, belge içinde
   **donar**; sonradan kur değişse belge tutarı değişmez.
2. **Kur farkı hesabı.** Kur farkı = ödeme/tahsilat günü TL karşılığı − belge günü TL karşılığı.
   Kısmi ödemede fark, ödenen kısım üzerinden orantılı hesaplanır. Örnek (uydurma): 10.000,00 USD
   fatura, kur 34,00 → 340.000,00 TL; tahsilatta kur 34,50 → 345.000,00 TL; kur farkı
   **+5.000,00 TL** (lehine). Fark, gelir/gider olarak işaretlenir (kâr mı zarar mı metinle yazılır).
3. **Yuvarlama.** Döviz tutarlar 2 hane; kur 6 hane saklanır, hesapta 4 hane kullanılır. TL karşılığı
   `Money.Round` ile 2 hane (`server/YesLojistik.Core/Domain/Money.cs:6`).
4. **Masraf dağıtımı toplamı korunur.** Dağıtım sonrası kalem paylarının toplamı, masraf tutarına
   **kuruşu kuruşuna** eşit olmalıdır. Yuvarlama farkı **en büyük paylı kaleme** eklenir.
5. **İthal malın maliyeti** = mal bedeli (TL) + dağıtılan masraflar. Stok kartına bu maliyet yazılır
   (`10-STOK-VE-DEPO.md` maliyet yöntemi). Dosya kapanmadan stok maliyeti **kesinleşmez**; ara maliyet
   "geçici" rozetiyle gösterilir.
6. **Dosya kapatma şartları.** Kapatmak için: bütün kalemlerde miktar ve fiyat var, bütün masraflar
   dağıtılmış, dağıtım toplamı tutuyor, ödeme planı girilmiş. Eksik varsa kapatma reddedilir ve
   eksikler listelenir.
7. **Dosya kapatma onayı.** Kapanış **iki onay** ister (işlemi yapan + muhasebe/yönetici). Kapanan
   dosya düzenlenemez.
8. **Proforma ve numune.** Stok hareketi doğurmaz, ciroya girmez, muhasebe fişi yazmaz. Muhasebe
   raporlarında **hiç görünmez**; yalnız belge arşivinde ve "açık proformalar" listesinde durur.
9. **İhracat istisnası.** İstisna kodu faturaya yazılır; KDV %0 uygulanır. İstisna kodu seçilmeden
   ihracat faturası kesilemez. KDV iadesi **hesaplanmaz**; modül yalnız "iade başvurusu yapıldı mı,
   tutar ne" bilgisini kaydeder — sınır ve şartlar **doğrulanacak** (§12).
10. **İhracat belgesi zorunluluğu.** İhracat faturası "Kabul edildi" durumuna geçerken gümrük
    beyanname numarası zorunludur; yoksa durum değişmez ve neden yazar.
11. **Akreditasyon / vesaik.** Kayıt amaçlıdır: banka, akreditasyon no, açılış tarihi, geçerlilik,
    şart özeti, vesaik teslim tarihi, tahsil durumu. Sistem bankaya hiçbir şey göndermez; yalnız
    takip eder. Alanların hangilerinin zorunlu olduğu **doğrulanacak**.
12. **Kur farkının dönemi.** Kur farkı, ödemenin yapıldığı döneme yazılır (tahakkuk değil, tahsil
    esası). Dönem seçimi mali müşavir onayına bağlıdır.
13. **Çok para birimli raporlama.** Toplamlar TL'ye çevrilirken **belge kuru** kullanılır; güncel
    kurla çevrilmiş "bilgi amaçlı" sütun ayrı başlıkla ve "bilgi" etiketiyle gösterilir. İki sütun
    karıştırılmaz.
14. **Yetki.** Kur girişi `Policies.Accounting`; dövizli fatura ve ithalat dosyası
    `Policies.Operations` + `Policies.Accounting`; dosya kapatma yalnız `Policies.Accounting`;
    proforma/numune `Policies.Operations` (`server/YesLojistik.Api/Auth/Policies.cs:8-17`).
15. **Ayna ve lisans.** Ayna açıkken yazma engellenir; lisans dolduysa salt okunur. **Dikkat:**
    `MirrorWriteGuard` yalnız kendi listesindeki yolları koruyor
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`); `/api/import-files`,
    `/api/export-documents`, `/api/exchange-rates`, `/api/payment-plans`, `/api/letters-of-credit` ve
    `/api/proforma-invoices` bu listede **yoktur** ve eklenmelidir. Aksi hâlde ayna modunda ithalat
    dosyası veya dövizli belge yazılır ve sonraki senkronda kaybolur. Ayrıca `/api/invoices` ve
    `/api/purchase-invoices` listede olduğu için, bu iki uca eklenen para birimi ve kur alanları ayna
    modunda **yazılamaz** olacaktır; bu beklenen davranıştır ve kullanıcıya ekranda açıklanır.

## 6. Veri modeli

Yeni tablolar ve mevcut tablolara yalnız **boş olabilen** eklemeler. Migration kuralı:
`01-ORTAK-SARTNAME.md:22-23`.

**`Currency`** — Id, Code (metin 3, tekil, `USD`), Name (50), Symbol (5), IsActive (bool),
DecimalPlaces (sayı, varsayılan 2).

**`ExchangeRate`** — Id, CurrencyId, Date (tarih), ForexBuying (sayı 10,4), ForexSelling (sayı 10,4),
Source (enum `RateSource`: Tcmb, Manual, Document), Note (200), CreatedBy (100). İndeks:
`(CurrencyId, Date, Source)`.

**`ImportFile`** — Id, FileNo (20, tekil), ForeignSupplierId (int?), SupplierName (200), Country
(metin 60), CurrencyId, Rate (sayı 10,4), RateDate (tarih), InvoiceNo (60), InvoiceDate (tarih),
GoodsAmount (sayı 18,2, döviz), GoodsAmountTry (para), ExpenseTotalTry (para), TotalCostTry (para),
Status (enum `ImportFileStatus`: Open, Closed, Cancelled), OpenedAt, OpenedBy (100), ClosedAt?,
ClosedBy?, ApprovedBy? (100), ApprovedAt?, DistributionMethod (enum `CostDistribution`: Amount,
Weight, Volume, Equal, Manual), Note (500).

**`ImportFileLine`** — ImportFileId, StockItemId, Quantity (sayı 4), Unit (10), UnitPrice (sayı 18,4),
Amount (sayı 18,2), CurrencyId, GtipCode (20), OriginCountry (60), Weight (sayı 10,3),
Volume (sayı 10,3), AllocatedExpenseTry (para), UnitCostTry (para), Note (200).

**`ImportFileExpense`** — ImportFileId, Kind (enum `ImportExpenseKind`: Freight, Insurance, Customs,
Storage, Handling, Consultancy, Other), Date, Amount (sayı 18,2), CurrencyId, Rate (sayı 10,4),
AmountTry (para), IsPaid (bool), SupplierId? (int?), DocumentNo (60), Note (200).

**`ImportExpenseAllocation`** — ImportFileExpenseId, ImportFileLineId, Share (sayı 6,4),
AmountTry (para).

**`ExportDocument`** — InvoiceId, Country (60), CustomsDeclarationNo (30), Incoterm (10),
IncotermPlace (60), DepartureDate (tarih?), DeliveryDate (tarih?), ExchangeRate (sayı 10,4),
ExemptionCode (10), VatRefundStatus (enum `VatRefundStatus`: None, Applied, Approved, Rejected),
VatRefundAmount (para), Note (300), Status (enum `ExportStatus`: Preparing, Sent, Accepted, Returned).
İndeks: `InvoiceId` tekil.

**`PaymentPlan`** — Id, Direction (enum: Receivable, Payable), CustomerId?, SupplierId?, ImportFileId?,
InvoiceId?, PurchaseInvoiceId?, DueDate, Amount (18,2), CurrencyId, Rate (10,4), AmountTry (para),
PaidAmount (para), PaidAmountTry (para), Status (enum `PaymentPlanStatus`: Planned, PartiallyPaid,
Paid, Overdue, Cancelled), Method (enum `PaymentMethod` — mevcut `Enums.cs:35`),
InstrumentNo (40), Bank (100), Note (300).

**`LetterOfCredit`** (akreditasyon/vesaik) — Id, ImportFileId?, ExportDocumentId?, Kind (enum
`TradeFinanceKind`: LetterOfCredit, DocumentaryCollection, AdvancePayment, OpenAccount),
BankName (150), ReferenceNo (60), OpeningDate, ExpiryDate?, Amount (18,2), CurrencyId, Rate (10,4),
Terms (1000), DocumentsDeliveredAt? (tarih), SettledAt? (tarih), Status (enum `TradeFinanceStatus`:
Open, DocumentsDelivered, Settled, Cancelled), Note (300).

**Mevcut tablolara eklenen sütunlar (hepsi boş olabilir):** `Invoice.CurrencyId`, `Invoice.ExchangeRate`,
`Invoice.AmountTry`, `Invoice.PaymentPlanId?`; `PurchaseInvoice.CurrencyId`, `.ExchangeRate`,
`.AmountTry`, `.ImportFileId?`; `Payment.CurrencyId`, `.ExchangeRate`, `.AmountTry`,
`.ExchangeDiffTry`, `.AmountInCurrency`; `SupplierPayment` için aynı beş alan;
`Customer.DefaultCurrencyId?`, `Supplier.DefaultCurrencyId?`, `Supplier.IsForeign` (bool);
`StockItem.LastImportFileId?` (maliyet izlenebilirliği).

`UblInvoiceBuilder` içindeki sabit `Currency` (`UblInvoiceBuilder.cs:19`) **kaldırılmaz**; belge para
birimi artık faturadan okunur ve alan varsayılanı `TRY` olur. Bu, mevcut davranışı bozmaz.

Yapılandırma: yeni `DbSet` satırları `AppDbContext.cs:10-43` düzenine, model yapılandırması
`AppDbContext.cs:147-167` örneğine (uzunluk, tekil indeks, `is_deleted = false` filtreli tekil
indeks, `SetNull`/`Restrict`) uygun yazılır.

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/currencies` | includeInactive | `List<CurrencyDto>` | oturum |
| POST/PUT | `/api/currencies[/{id}]` | `CurrencySaveRequest` | `CurrencyDto` | Accounting |
| GET | `/api/exchange-rates` | currencyId, from, to, source | `List<ExchangeRateDto>` | oturum |
| POST | `/api/exchange-rates` | `ExchangeRateSaveRequest` | `ExchangeRateDto` | Accounting |
| POST | `/api/exchange-rates/fetch` | `{ date }` | `List<ExchangeRateDto>` | Accounting |
| GET | `/api/exchange-rates/lookup` | currencyId, date | `ExchangeRateDto` | oturum |
| GET | `/api/import-files` | page, pageSize, search, status, supplierId, from, to | `PagedResult<ImportFileDto>` | oturum |
| GET | `/api/import-files/{id}` | — | `ImportFileDto` (kalem + masraf + dağıtım) | oturum |
| POST | `/api/import-files` | `ImportFileSaveRequest` | `ImportFileDto` | Operations |
| PUT | `/api/import-files/{id}` | `ImportFileSaveRequest` | `ImportFileDto` | Operations |
| DELETE | `/api/import-files/{id}` | — | 204 | Accounting |
| POST | `/api/import-files/{id}/lines` | `ImportFileLineSaveRequest[]` | `ImportFileDto` | Operations |
| POST | `/api/import-files/{id}/expenses` | `ImportExpenseSaveRequest[]` | `ImportFileDto` | Operations |
| PUT | `/api/import-files/{id}/distribution` | `{ method, manual[], }` | `ImportFileDto` | Accounting |
| POST | `/api/import-files/{id}/close` | `{ note }` | `ImportFileDto` | Accounting |
| POST | `/api/import-files/{id}/reopen` | `{ reason }` | `ImportFileDto` | Admin |
| GET | `/api/import-files/{id}/cost` | — | `ImportCostDto` | oturum |
| GET | `/api/import-files/export` | liste süzgeçleri | xlsx | oturum |
| GET | `/api/export-documents` | page, pageSize, status, country, from, to | `PagedResult<ExportDocumentDto>` | oturum |
| POST | `/api/export-documents` | `ExportDocumentSaveRequest` | `ExportDocumentDto` | Operations |
| PUT | `/api/export-documents/{id}` | `ExportDocumentSaveRequest` | `ExportDocumentDto` | Operations |
| POST | `/api/export-documents/{id}/status` | `{ status, customsDeclarationNo, note }` | `ExportDocumentDto` | Accounting |
| GET | `/api/payment-plans` | direction, customerId, supplierId, currencyId, from, to, overdue | `PagedResult<PaymentPlanDto>` | oturum |
| POST | `/api/payment-plans` | `PaymentPlanSaveRequest` | `PaymentPlanDto` | Accounting |
| POST | `/api/payment-plans/{id}/settle` | `{ date, amount, rate, method, cashAccountId }` | `PaymentPlanDto` (+ kur farkı) | Accounting |
| GET | `/api/payment-plans/calendar` | from, to, direction | `List<PaymentPlanBucketDto>` | oturum |
| GET | `/api/letters-of-credit` | kind, status, from, to | `PagedResult<LetterOfCreditDto>` | oturum |
| POST/PUT | `/api/letters-of-credit[/{id}]` | `LetterOfCreditSaveRequest` | `LetterOfCreditDto` | Accounting |
| GET | `/api/proforma-invoices` | page, pageSize, kind, search | `PagedResult<ProformaInvoiceDto>` | oturum |
| POST | `/api/proforma-invoices` | `ProformaInvoiceSaveRequest` | `ProformaInvoiceDto` | Operations |
| POST | `/api/proforma-invoices/{id}/convert` | `{ date, dueDate }` | `InvoiceDto` | Accounting |

`ImportCostDto` alanları: GoodsAmountTry, ExpenseBreakdown (tür bazında), TotalCostTry,
Lines (kalem, miktar, birim maliyet), Method, RateAtClose, IsProvisional. Proforma tablosu
`ProformaInvoice` + `ProformaInvoiceLine` olarak iki tablo; gerçek faturaya dönüşümde satırlar
kopyalanır ve proforma "Dönüştürüldü" işaretlenir.

## 8. Yetki, onay ve denetim izi

- **Rol matrisi.** Yönetici: tam (dosya yeniden açma dahil). Operasyon: dövizli fatura keser, ithalat
  kalem ve masraf girer, proforma düzenler. Muhasebe: kur girer, dağıtım yöntemini belirler, dosyayı
  kapatır, ödeme planını kapatır, istisna kodunu onaylar. Şoför: hiç erişemez.
- **Maker-checker.** İthalat dosyası kapatma (giren kişi ≠ onaylayan), yüksek tutarlı kur farkı
  düzeltmesi ve dosya yeniden açma iki onay ister. Eşikler kullanıcı ayarıdır.
- **Belge bütünlüğü.** Kur, belgeye yazıldıktan sonra değiştirilemez; değiştirmek isteyen kullanıcı
  belgeyi iptal edip yenisini keser. Bu kural denetimde en çok sorulan noktadır.
- **Denetim izi.** `AuditTrail` otomatik çalışır
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`). Etiketler `AuditTrail.cs:83-106`
  içine eklenir: `ImportFile f => $"{f.FileNo} ithalat dosyası"`,
  `ExportDocument e => $"İhracat {e.CustomsDeclarationNo}"`,
  `LetterOfCredit l => $"Akreditasyon {l.ReferenceNo}"`. Alan adları `AuditTrail.cs:23-52` sözlüğüne
  Türkçe eklenir (ör. `ExchangeRate` → "Kur", `AmountTry` → "TL karşılığı", `RateDate` → "Kur tarihi").
  Sözlükte olmayan alan ham adla görünür; bu istenmez.
- **Kur kaynağı görünürlüğü.** Rapor ve ekranlarda kullanılan kurun kaynağı (TCMB/elle/belge) her
  zaman görünür; "hangi kurla hesaplandı" sorusu tek bakışta cevaplanır.
- **Gizli alanlar.** Akreditasyon şart metni (`Terms`) denetim etiketine yazılmaz; yalnız referans
  numarası yazılır.

## 9. Kabul kriterleri

1. Dövizli fatura kesildiğinde TL karşılığı **anında** görünür; kullanıcı hesap makinesi kullanmaz.
2. Kur tarihi fatura tarihinden farklı seçilirse ekranda sarı uyarı ve "kur 3 gün eski" gibi metin
   çıkar.
3. İthalat dosyası 1440×900'de **en az 12 kalem satırı** gösterir; üst kısım **≤260px**.
4. Masraf dağıtımı sonrası payların toplamı masraf tutarına **kuruşu kuruşuna** eşittir; yuvarlama
   farkı en büyük paylı kaleme eklenir ve bu ekranda "yuvarlama düzeltmesi" olarak görünür.
5. Dosya kapanmadan stok maliyeti "geçici" rozetiyle görünür; kapandıktan sonra rozet kaybolur ve
   maliyet kilitlenir.
6. Eksik masraf veya dağıtılmamış kalem varsa kapatma düğmesi **eksikleri listeleyerek** reddeder
   (genel "hata" mesajı yok).
7. Kur farkı örnekte doğru çıkar: 10.000,00 USD, kur 34,00 → 34,50 tahsilat → **+5.000,00 TL**; ekranda
   "lehine" metniyle yazılır.
8. İstisna kodu seçilmeden ihracat faturası kesilemez; hata metni hangi kodu seçmesi gerektiğini
   açıklar.
9. İhracat faturası "Kabul edildi"ye geçerken beyanname numarası zorunludur; boşsa durum değişmez.
10. Proforma faturası ciroya, stoğa ve muhasebe raporlarına **hiç girmez**; proforma listesinde
    "Dönüştürüldü" işareti görünür ve dönüşümde alanlar birebir kopyalanır.
11. Ödeme planı takviminde geciken satırlar hem kırmızı hem "gecikti" metniyle görünür.
12. Telefonda (390×844) yatay kaydırma yok; liste kart görünümüne döner.
13. Excel dışa aktarımda döviz tutar, kur ve TL karşılığı **üç ayrı sütun** olarak Türkçe başlıklarla
    iner (`VehiclesController.cs:57-79` kalıbı).

## 10. Testler

**Sunucu (birim).** `server/YesLojistik.Tests/Unit/CurrencyTests.cs`:
- Kur farkı: tam ve kısmi tahsilat; lehine/aleyhine işaret.
- Yuvarlama: 10.000,00 USD × 34,5678 = 345.678,00 TL; 2 hane kuralı.
- Masraf dağıtımı: tutar, ağırlık, hacim, eşit yöntemlerde pay toplamı = masraf tutarı.
- Yuvarlama farkı en büyük paylı kaleme eklenir; diğer paylar değişmez.
- Kur tarihi geçersizse (gelecek tarih) hata.
- Proforma toplamları ciroya girmez (rapor toplamı testi).

**Sunucu (entegrasyon).** `server/YesLojistik.Tests/Integration/ForeignTradeTests.cs`
(`FleetTests.cs:18-32` kurulum deseni):
- Dövizli satış faturası oluştur → `AmountTry` doğru; UBL belgesinde para kodu doğru
  (`UblInvoiceBuilder` testi mevcut e-Fatura testleriyle birlikte).
- Tahsilat günü farklı kurla → kur farkı kaydı ve tutarı doğru.
- İthalat dosyası: kalem + masraf ekle, dağıt, kapat → stok maliyeti güncellenir; kapalı dosya
  düzenlenemez (400 + Türkçe mesaj).
- Eksik dağıtımla kapatma reddedilir ve eksik listesi döner.
- Dosya yeniden açma yalnız admin; denetim kaydı oluşur.
- İhracat: istisna kodu zorunluluğu; beyanname numarası olmadan durum değişmez.
- Proforma dönüşümü: fatura oluşur, proforma "Dönüştürüldü" olur, ikinci kez dönüştürülemez.
- Ödeme planı: vade geçince durum `Overdue`; kapatma tutarı doğru; para birimi karışmaz.
- Ayna açıkken `POST` reddedilir (`LegacyMirrorTests.cs` deseni).

**Panel (e2e).** `client/e2e/foreign-trade.spec.ts`:
- Dövizli fatura formunda para birimi seçilir, kur önerisi gelir, TL karşılığı görünür.
- İthalat dosyası açılır, masraf eklenir, dağıtım yapılır, kapatılır.
- Kapatma eksikken reddedilir ve eksik listesi görünür.
- Proforma listesi ve dönüşüm akışı çalışır; uyarı şeridi görünür.
- Telefon görünümü: `client/e2e/mobile.spec.ts` deseni; yatay kaydırma yok.
- Yeni görünüm: `client/e2e/helpers.ts:44-46` `useNewUi(page)` ile ikinci koşu.

Test silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:24`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Para birimi ve kur tabloları, kur servisi (TCMB iskeleti + elle giriş) | 3 |
| Dövizli fatura alanları (satış + alış) ve TL karşılığı | 2,5 |
| Kur farkı hesabı ve tahsilat/ödeme entegrasyonu | 2,5 |
| İthalat dosyası tabloları ve kart ekranı | 3 |
| Masraf dağıtım motoru (5 yöntem) + dağıtım ekranı | 3 |
| Dosya kapatma, onay, stok maliyetine yansıma | 2 |
| İhracat belge takibi ve istisna akışı | 2 |
| Proforma / numune fatura ve dönüşüm | 2 |
| Ödeme planı takvimi (alacak/borç) | 2,5 |
| Akreditasyon / vesaik kaydı | 1,5 |
| Testler (birim + entegrasyon + e2e) | 3,5 |
| Dokümantasyon, denetim etiketleri, kabul turu | 1,5 |
| **Toplam** | **29,5 kişi-gün** |

Bağımlılıklar (önce bitmeli):
- `05-VERI-MODELI.md` — para birimi alanlarının çekirdek kararı.
- `10-STOK-VE-DEPO.md` — ithal malın stok maliyetine yazılması.
- `11-SATIS-FATURA.md` ve `12-SATIN-ALMA.md` — dövizli fatura akışının oturduğu yer.
- `08-E-BELGE-KATMANI.md` — UBL belgesinde para kodu ve kur alanları.
- `06-MUHASEBE-MOTORU.md` — kur farkının fişe dönüşmesi.
- `15-BANKA-ENTEGRASYON.md` — döviz hesabı ve tahsilat eşleştirmesi.
- `19-SABIT-KIYMET.md` — ithal edilen kıymetin maliyeti bu modülden gelir.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Kur kaynağı güvenilmez/kesintili | Elle giriş her zaman açık; kaynak rozeti görünür; kur yoksa belge kaydedilemez | Elle kur girilir |
| Yanlış kurla kesilen fatura | Kur tarihi uyarısı; 3 günden eski kurda sarı uyarı | Fatura iptal edilir, yenisi kesilir |
| Dağıtım toplamı tutmaz, maliyet bozulur | Toplam kontrolü + yuvarlama farkı kuralı; kapatma engeli | Dağıtım yeniden hesaplanır |
| Mevcut TL faturaları bozulur | Yeni alanlar boş olabilir; boşsa davranış bugünkü gibi TL | Alanlar kullanılmaz |
| UBL para kodu hatası e-Faturayı reddettirir | Belge testleri; para kodu faturadan okunur, varsayılan TL | Fatura iptal, yeniden gönderim |
| Proforma gerçek sanılıp ciroya yazılır | Kalıcı uyarı şeridi; muhasebe raporlarında hariç tutma testi | Proforma iptal edilir |
| Kur farkı dönemi tartışmalı | Dönem kuralı ayar; raporda fark ayrı satır | Fiş düzeltmesi (muhasebe) |
| Çok para birimli toplamlar karışır | İki sütun: belge kuru esas, güncel kur "bilgi" etiketli | Sütun gizlenir |

**doğrulanacak:**
1. **TCMB kur servisi:** erişim adresi, veri biçimi, günlük yayın saati, kullanım şartları/lisans,
   kimlik doğrulama gerekip gerekmediği. Bu dokümanda hiçbir adres veya alan adı kesin yazılmadı.
2. **Hangi kur kullanılacak:** döviz alış mı, döviz satış mı, efektif mi; ihracat ve ithalatta farklı
   mı. Kaynak: mali müşavir teyidi.
3. **Gümrük ve vergi kalemleri:** ithalatta hangi kalemler maliyete eklenir, hangileri gider yazılır
   (gümrük vergisi, KDV, özel tüketim vergisi, ardiye, gümrük müşavirliği). Tutar/oran bilgisi
   kesinlikle bu dokümana yazılmadı; mali müşavir + gümrük müşaviri teyidi gerekir.
4. **İhracatta KDV istisnası ve iade sınırı:** hangi belgeler gerekir, iade üst sınırı nedir, hangi
   hallerde istisna uygulanmaz. Kaynak: mevzuat + mali müşavir. Modül yalnız kayıt tutar.
5. **İhracat teslim biçimleri (Incoterm) listesi ve hangi alanların zorunlu olduğu.**
6. **Akreditasyon / vesaik mukabili akışı:** hangi alanlar zorunlu, belge teslim ve ödeme aşamaları
   nasıl adlandırılır, banka referans biçimi. Kaynak: banka + dış ticaret uzmanı.
7. **Kur farkının dönemi ve hesabı:** tahakkuk mu tahsil mi; kısmi ödemede oranlama yöntemi.
   Mali müşavir teyidi.
8. **Masraf dağıtım yöntemi:** Luca'nın ve uygulamanın hangi yöntemi varsayılan kabul ettiği
   (tutar/ağırlık/hacim); kullanıcı kararı.
9. **Luca'nın ithalat dosyası ve ödeme planı ekranları** — demo erişimi veya ekran görüntüsü.
10. **e-Fatura/e-Arşiv'de dövizli fatura zorunlulukları ve kur alanlarının GİB beklentisi** —
    entegratör dokümanı (`docs/ENTEGRATOR-EKLEME.md`).
11. **Ayna modunda dövizli belge:** pratikortam aynası açıkken dövizli fatura kesilebilecek mi; kesilirse
    sonraki aynadan gelen kayıtla çakışır mı. Bugünkü guard `/api/invoices` ve `/api/purchase-invoices`
    yollarını koruyor (`MirrorWriteGuard.cs:14-18`), bu yüzden karar kullanıcıya sorulmalıdır.

Sonraki belgeyle bağlantı: `10-STOK-VE-DEPO.md` ithal malın maliyet ve lot tarafını;
`08-E-BELGE-KATMANI.md` dövizli e-Fatura ve ihracat belgelerini; `15-BANKA-ENTEGRASYON.md` döviz
hesabı ve tahsilat eşleştirmesini; `19-SABIT-KIYMET.md` ithal kıymetin maliyetini bu modülden alır.
