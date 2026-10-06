# 12 — Satın Alma

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, bugün **"fatura gelince sevkiyata bağla"** düzeyinde olan satın alma tarafını uçtan uca bir
sürece çevirir:

**Talep → onay → sipariş → mal kabul/irsaliye → alış faturası → ödeme.**

Kapsam:

- Satın alma **talebi** ve **onay limitleri** (kim, hangi tutara kadar onaylar).
- **Sipariş** (`PurchaseOrder`) ve sipariş satırları; tedarikçiye gönderim/PDF.
- **Tedarikçi fiyat listeleri** ve **karşılaştırma** (aynı ihtiyaç için birden çok tedarikçi teklifi).
- **Mal kabul / irsaliye** (`GoodsReceipt`), **kısmi teslim** ve **kısmi fatura**.
- **Üç yönlü eşleştirme**: sipariş ↔ irsaliye ↔ fatura; tutarsızlıkta uyarı ve gerekçe.
- Alış faturası girişi ve **gelen e-Fatura ile otomatik doldurma**.
- **İade** (tedarikçiye geri gönderim) ve **masraf dağıtımı** (navlun, sigorta, gümrük vb.).
- Satın alma **raporları**: tedarikçi performansı, fiyat geçmişi, teslim süresi.
- Mevcut `PurchaseInvoice` ve tedarikçi borcu (`PayableService`) yapısına **ekleme** yoluyla bağlanma.

Kapsam dışı: satış faturası (bkz. `11-SATIS-FATURA.md`), kasa/banka ödeme detayı (bkz.
`14-KASA.md`), stok kartı tanımı ve depo (stok dokümanı), e-Fatura entegratör adaptörü (`08`).

Bu modülün çözdüğü üç sorun: (1) "Bu mal/hizmeti kimden, kaça aldık?" (2) "Sipariş ettik, geldi mi,
faturası doğru mu?" (3) "Tedarikçi bize ne kadar ve ne zamandır borçlu, faturası gelmeyen iş var mı?"

## 2. Luca'daki karşılığı

Luca Koza'nın **Satınalma Yönetimi** modülü (Profesyonel sürüm) bu dokümanın referansıdır
(`02-LUCA-ENVANTERI.md:12`, `:21`). Siteden okunan ilgili maddeler:

- Satın alma süreci: **ihtiyaç tespiti**, merkezlerden gelen **taleplerin değerlendirilmesi**,
  **planlama** (`02-LUCA-ENVANTERI.md:61`).
- **İthalat takibi ve dosya kapama**, ithalat analizleri; müşteri/tedarikçi **ödeme planı** takibi
  (`02-LUCA-ENVANTERI.md:55-56`).
- **Çok depolu** stok takibi ve depo bölümü bazında izleme (`02-LUCA-ENVANTERI.md:48`).
- İstatistik raporları: **satın alma–satış–finans** karar desteği (`02-LUCA-ENVANTERI.md:57`).
- SMMM ile entegre çalışma, tüm işlemlerin tek ekrandan muhasebeleştirilmesi
  (`02-LUCA-ENVANTERI.md:46-47`).
- e-Fatura yalnız gönderim değil, **gelen e-Faturaların alınması** (`02-LUCA-ENVANTERI.md:39`).
- BA-BS mutabakatı: karşı firmanın e-postasına bilgi postası (`02-LUCA-ENVANTERI.md:31`).

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'da satın alma talebi ve onay akışının kaç kademeli olduğu, onay limitlerinin
tanımlanıp tanımlanmadığı — kaynak: Luca kullanım kılavuzu / demo ekranı. **doğrulanacak:** gelen
e-Faturanın hangi kanaldan (GİB posta kutusu, entegratör API'si) alındığı ve otomatik doldurmanın
hangi alanları kapsadığı — kaynak: entegratör teknik dokümanı. **doğrulanacak:** Luca'da üç yönlü
eşleştirme (sipariş-irsaliye-fatura) ve tolerans yüzdesi var mı — kaynak: Luca kılavuzu.

## 3. Bizde bugün

**Olmayanlar (kanıtlı).** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içinde
`PurchaseOrder`, `GoodsReceipt`, `PurchaseRequest`, `SupplierPriceList`, `Stock`, `Warehouse`,
`StockMovement` **yoktur**. Sipariş, irsaliye, talep, onay limiti, fiyat listesi ve karşılaştırma
kavramları kodda geçmez. Depoda "Depo" sözcüğü yalnız gider açıklamalarında ve test verisinde
geçer (`server/YesLojistik.Tests/Integration/LegacyDetailsTests.cs:47,52`) — **depo modülü yoktur**.
`PurchaseInvoice` tablosunda **satır (line) yoktur**: tutarlar başlıkta tek blok hâlindedir
(`server/YesLojistik.Core/Entities/PurchaseInvoice.cs:15-20`).

**Olanlar (kanıtlı).**

- **Alış faturası kaydı.** `server/YesLojistik.Core/Entities/PurchaseInvoice.cs:7-31`: tedarikçi,
  fatura no, tarih, vade, tür (`EInvoice|EArchive|Paper|Receipt`, `Enums.cs:22`), matrah, KDV,
  tevkifat, toplam, iptal + gerekçe, dosya yolu, dış referans.
- **Faturaya sevkiyat bağlama.** `server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs`
  `:161-178` alanları uygular ve **aynı tedarikçide aynı fatura numarasını** reddeder (`:165-166`);
  `:181-205` sefer bağlantısını eşitler, başka faturaya bağlı seferi reddeder (`:195-196`) ve seferin
  taşeron fatura no/tarihini faturadan yazar (`:199-201`). İptal edilen faturanın seferleri yeniden
  "fatura bekleyen" olur (`:113-123`).
- **Faturasız taşeron seferleri.** `PurchaseInvoiceService.cs:72-82` — fatura bekleyen seferler
  `carrierSupplierId` üzerinden listelenir; uç: `GET /api/purchase-invoices/uninvoiced-trips`
  (`server/YesLojistik.Api/Controllers/PurchaseInvoicesController.cs:52-54`).
- **Üç yönlü eşleştirmenin bugünkü zayıf hâli.** Sefer (sipariş yerine), fatura ve tutar tutarlılığı
  yalnız "sefer bu tedarikçiye ait mi" ve "başka faturada mı" kontrolünden geçer
  (`PurchaseInvoiceService.cs:194-196`); **miktar/tolerans karşılaştırması yoktur.**
- **Tedarikçi borcu.** `server/YesLojistik.Infrastructure/Services/PayableService.cs` borcu saklamaz,
  hesaplar: devir + faturasız taşeron seferleri + alınan faturalar + vadeli giderler − ödemeler
  (`:16-19`, `:53-70`). Borç kalemleri ve FIFO ödeme dağıtımı `:73-120`; yaşlandırma `:158-170`;
  rapor `:172-185`; "faturası 15 günden uzun süredir gelmeyen sefer" sayacı `:188-196`.
- **Ödeme.** `server/YesLojistik.Core/Entities/SupplierPayment.cs:3-21` — tedarikçiye ödeme; sefer ya
  da toplu sefer listesine bağlanabilir (`TripIds`, `:14-15`), kasa/banka hesabı seçilebilir (`:17-18`),
  müşteri çekinin cirosuyla ödenebilir (`:19-20`).
- **Vadeli gider.** `server/YesLojistik.Core/Entities/Expense.cs:26-27,40-41` — `IsOnCredit` true ise
  tutar tedarikçiye borç yazılır; kasa/banka hesabı bağlanabilir. Borç hesabı:
  `PayableService.cs:61-63`.
- **Tedarikçi kartı.** `server/YesLojistik.Core/Entities/Supplier.cs:5-31` — ünvan, tür
  (`Carrier|Service|Fuel|Other`, `Enums.cs:37`), VKN, IBAN, **ödeme vadesi** (`:18`), devir bakiyesi
  (`:21`), ayna kimliği. Fiyat listesi alanı **yoktur**.
- **Ekran.** `client/src/pages/PurchaseInvoicesPage.tsx`: liste ve süzgeçler `:28-40`, sütunlar
  `:46-56`, toplam şeridi `:84-90`, iptal `:42-44` + `:97-99`. Form `:104-115` (zod şeması) ve
  `:118-256`: tedarikçi, fatura no/tarihi, tür, vade, matrah/KDV/tevkifat, açıklama, dosya ve
  **faturaya bağlanacak sevkiyat listesi** `:233-251`. Matrah seçilen seferlerden önerilir
  (`:151-158`); KDV/tevkifat matrahtan otomatik dolar ve elle yazılınca kilitlenir (`:142-150`).
  Formun `supplierId` prop'u tanımlı ama **hiçbir yerden kullanılmıyor**
  (`PurchaseInvoicesPage.tsx:118` dışında çağrı yok — `:96`).
- **Menü ve rota.** Rota `/alinan-faturalar` (`client/src/lib/nav.ts:37`), "e-Fatura" bölümünün sekmesi
  (`client/src/lib/sections.ts:16`). Uç yetkileri: yazma `Policies.Accounting`
  (`PurchaseInvoicesController.cs:56-79`), okuma açık.

**Eksik listesi:** sipariş, talep, onay limiti, irsaliye/mal kabul, kısmi teslim, fiyat listesi,
karşılaştırma, üç yönlü eşleştirme, fatura satırları, masraf dağıtımı, iade, tedarikçi performans
raporu, fiyat geçmişi, gelen e-Fatura ile otomatik doldurma.

## 4. Hedef ekranlar ve alanlar

### 4.1 Satın Alma Talepleri (`/satin-alma/talepler`)

Liste: talep no, tarih, talep eden, ihtiyaç konusu, tahmini tutar, durum rozeti (Bekliyor/Onaylandı/
Reddedildi/Siparişe dönüştü). Form alanları: konu (zorunlu), gerekçe, ihtiyaç tarihi, kalem listesi
(açıklama, miktar, birim, tahmini birim fiyat), tedarikçi önerisi, aciliyet. Düğmeler: Kaydet,
Onaya Gönder, Onayla, Reddet (gerekçe zorunlu), Siparişe Dönüştür.

### 4.2 Satın Alma Siparişleri (`/satin-alma/siparisler`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Sipariş no | metin (otomatik) | — | Seri bazlı: `SIP-2026/000123` |
| Tedarikçi | seçim | evet | Karttan gelir; vadesi ve IBAN'ı önerilir |
| Sipariş tarihi / beklenen tarih | tarih | evet / hayır | Geç teslim raporunda kullanılır |
| Kalemler | tablo | evet (≥1) | Açıklama, miktar, birim, birim fiyat, KDV, iskonto |
| Ara toplam, KDV, genel toplam | tutar (salt okunur) | — | 2 kuruş |
| Teslim durumu | rozet | — | Bekliyor / Kısmi / Tamamlandı / İptal |
| Faturalanan | rozet + tutar | — | Siparişe bağlı fatura toplamı |
| Not | metin | hayır | Tedarikçiye giden PDF'e yazılır |

Sipariş durum geçişleri: `Draft → Sent → PartiallyReceived → Received → Closed`, ayrıca `Cancelled`.
Siparişten **kısmi** irsaliye ve **kısmi** fatura üretilebilir; kalan miktar görünür kalır.

### 4.3 Mal Kabul / İrsaliye (`/satin-alma/mal-kabul`)

Alanlar: irsaliye no (tedarikçinin), tarih, sipariş seçimi, teslim alan kişi, kalem bazında
**sipariş miktarı / gelen miktar / kabul edilen / reddedilen**, red gerekçesi, depo (stok dokümanı
gelene kadar **serbest metin**), dosya eki (irsaliye fotoğrafı). Kısmi teslimde sipariş durumu
`PartiallyReceived` olur ve kalan miktar listede görünür.

### 4.4 Alış Faturası (`/alinan-faturalar`)

Mevcut ekran korunur; eklenenler:

- **Sipariş/irsaliye bağlama** kutusu: fatura seçilen sipariş ve irsaliyelerle eşleştirilir.
- **Eşleştirme uyarı bandı:** tutar farkı, miktar farkı, faturasız teslim, teslimsiz fatura. Her uyarı
  için "gerekçe yaz" alanı; gerekçesiz kaydedilirse fatura **"İncelemede"** işareti alır.
- **Satır tablosu:** açıklama, miktar, birim, birim fiyat, iskonto, KDV, tutar. (Bugün başlık düzeyinde
  tek tutar vardır: `PurchaseInvoice.cs:15-20`.)
- **Masraf dağıtımı:** navlun, sigorta, gümrük gibi masraf satırları satır tutarlarına **oransal**
  dağıtılır; dağıtım sonucu satırda "birim maliyet" olarak görünür.
- **Gelen e-Fatura:** tedarikçi VKN'si ve fatura no ile eşleşen gelen belge forma **otomatik dolar**;
  kullanıcı yalnız kontrol edip onaylar.

### 4.5 Fiyat Listeleri ve Karşılaştırma (`/satin-alma/fiyat-listeleri`)

Tedarikçi + mal/hizmet + geçerlilik tarihi + birim fiyat + para birimi. Karşılaştırma ekranı: bir
ihtiyaç seçilir, aynı kalem için farklı tedarikçilerin **son fiyatı, teslim süresi ve performans notu**
yan yana listelenir; en uygun satır işaretlenip siparişe taşınır.

### 4.6 Satın Alma Raporları (`/raporlar/satin-alma`)

- **Tedarikçi performansı:** sipariş sayısı, zamanında teslim oranı (%), ortalama gecikme günü,
  reddedilen miktar oranı, fatura uyuşmazlık sayısı.
- **Fiyat geçmişi:** kalem bazında zaman içindeki birim fiyat değişimi ve ortalama.
- **Açık siparişler:** teslim bekleyen, gecikmiş siparişler ve tutarları.
- **Faturasız teslimler:** mal kabul edildi, faturası gelmedi.

## 5. İş kuralları

1. **Onay limitleri.** Talepler tutara göre kademelidir: 0–25.000 TL operasyon sorumlusu,
   25.000–150.000 TL muhasebe, 150.000 TL üstü yönetici. Limitler tanımlanabilir; kullanıcı kendi
   limitinin üstünü onaylayamaz. (Sayılar **doğrulanacak:** kullanıcı iş kararı.)
2. **Sipariş numarası.** `<seri>-<yıl>/<sıra>`; satır kilidiyle alınır (`InvoiceService.cs:221-228`
   deseninin aynısı). İptal edilen sipariş numarasını korur.
3. **Miktar/sipariş kontrolü.** Kabul edilen miktar, sipariş miktarını **aşamaz**; aşım için gerekçe
   ve yetkili onayı gerekir (fazla teslim). Eksik teslim kısmi sayılır.
4. **Üç yönlü eşleştirme toleransı.** Fatura tutarı ile (kabul edilen miktar × sipariş fiyatı)
   arasındaki fark **±%2** içindeyse otomatik eşleşir; dışındaysa fatura "İncelemede" işareti alır ve
   gerekçe ister. Tolerans oranı ayarlardan değiştirilebilir. (Oran **doğrulanacak:** kullanıcı.)
5. **Kısmi fatura.** Bir siparişe birden çok irsaliye ve birden çok fatura bağlanabilir. Aynı irsaliye
   iki faturaya bağlanamaz. Toplam faturalanan miktar, kabul edilen miktarı aşamaz.
6. **Kısmi teslim.** Sipariş, tüm kalemleri tam kabul edilene kadar kapanmaz. Kalan miktar ve kalan
   tutar her ekranda görünür.
7. **Masraf dağıtımı.** Masraf satırları, satır tutarları oranında dağıtılır; yuvarlama farkı en
   büyük tutarlı satıra yazılır. Dağıtılan masraf **stok maliyetini** ve **sevkiyat maliyetini**
   etkiler; KDV'si ayrı satırda kalır.
8. **İade (tedarikçiye geri).** Kaynak fatura/sipariş satırına bağlanır; miktar kısmi olabilir;
   kümülatif iade, kabul edilen miktarı aşamaz. Cari borç azalır; stok (varsa) geri girer.
9. **Fatura numarası tekilliği.** Aynı tedarikçide aynı fatura numarası ikinci kez kaydedilemez
   (`PurchaseInvoiceService.cs:165-166`). Bu kural korunur ve **gelen e-Fatura** için de uygulanır.
10. **Borç etkisi.** Faturaya bağlanan sefer artık ayrı borç kalemi doğurmaz; borç faturanın ödenecek
    tutarından gelir (`PayableService.cs:59`, `:98-103`). "Faturadan düş" komisyonu faturanın borcundan
    düşülür (`PayableService.cs:83-84`).
11. **Tarihler.** Vade boşsa tedarikçinin vade günü kullanılır (`Supplier.cs:18`). Sipariş beklenen
    tarihi geçtiyse ve teslim gelmediyse uyarı üretilir.
12. **Durum geçişleri (fatura).** `Draft → Posted → Cancelled`; iptal gerekçesi zorunludur ve bağlı
    seferler yeniden "fatura bekleyen" olur (`PurchaseInvoiceService.cs:113-123`). **Silme yoktur**;
    bugünkü `DeleteAsync` (`:125-131`) yalnız kurulum/demo temizliğinde kullanılır ve yeni akışta
    kullanıcıya gösterilmez.
13. **Gelen e-Fatura eşleşmesi.** Eşleşme anahtarı: tedarikçi VKN + fatura no; ikincil: tutar + tarih.
    Eşleşme bulunamazsa "sahipsiz gelen belge" kutusuna düşer ve kullanıcı elle bağlar.
14. **Doğrulamalar.** Tedarikçi zorunlu, en az bir satır zorunlu, miktar > 0, fiyat ≥ 0, sipariş
    seçilmeden irsaliye bağlanamaz, kabul edilen + reddedilen = gelen miktar.

## 6. Veri modeli

**Eklenecek alanlar (yalnız ekleme migration; boş olabilir):**

`PurchaseInvoice` (mevcut, `PurchaseInvoice.cs:7`): `PurchaseOrderId int?`, `CurrencyCode string(3)?`,
`ExchangeRate decimal?`, `MatchStatus` (Eşleşti/İncelemede), `MatchNote string(300)?`,
`SubtotalTry decimal?`, `PostedAt DateTime?`, `SourceEInvoiceId int?`, `ReturnOfInvoiceId int?`.
Yeni tablo: `PurchaseInvoiceLine` (InvoiceId, Description, Quantity, Unit, UnitPrice, DiscountRate,
VatRate, VatAmount, Amount, ExpenseShare, StockId?, SortOrder).

`Supplier` (mevcut, `Supplier.cs:4`): `ApprovalLimit decimal?`, `PerformanceNote string(200)?`,
`DefaultCurrencyCode string(3)?`. **Not:** performans alanları hesaplanan rapor alanlarıdır; kartta
yalnız elle not tutulur.

`Trip` (mevcut, `Trip.cs:3`): `PurchaseOrderId int?` — taşeron seferinin siparişle bağlantısı
(mevcut `PurchaseInvoiceId`, `Trip.cs:114` yanında). Böylece "sevkiyat → sipariş → fatura" zinciri
kurulur.

**Yeni tablolar:**

| Tablo | Ana alanlar | İlişki |
|---|---|---|
| `PurchaseRequest` | No, Date, RequestedBy, Subject, Reason, NeedDate, EstimatedTotal, Status, ApprovedBy, ApprovedAt, RejectReason | `Lines` → `PurchaseRequestLine` |
| `PurchaseRequestLine` | RequestId, Description, Quantity, Unit, EstimatedUnitPrice, StockId? | — |
| `PurchaseOrder` | No, SupplierId, Date, ExpectedDate, CurrencyCode, ExchangeRate, Subtotal, VatAmount, Total, Status, Notes, SentAt, LegacyKey | `SupplierId → Supplier`; `Lines`, `Receipts` |
| `PurchaseOrderLine` | OrderId, Description, Quantity, Unit, UnitPrice, DiscountRate, VatRate, ReceivedQuantity, InvoicedQuantity, StockId? | — |
| `GoodsReceipt` | No, OrderId, SupplierId, Date, WaybillNo, ReceivedBy, Status, Notes, FilePath | `OrderId → PurchaseOrder` |
| `GoodsReceiptLine` | ReceiptId, OrderLineId, ReceivedQuantity, AcceptedQuantity, RejectedQuantity, RejectReason | — |
| `SupplierPriceList` | SupplierId, ItemKey (StockId?/Description), Unit, UnitPrice, CurrencyCode, ValidFrom, ValidTo | `SupplierId → Supplier` |
| `PurchaseInvoiceMatch` | PurchaseInvoiceId, OrderId?, ReceiptId?, MatchStatus, DifferenceAmount, Tolerance, Note, MatchedBy, MatchedAt | Üç yönlü eşleştirme izi |
| `ExpenseAllocation` | PurchaseInvoiceId, ExpenseLineId, TargetLineId, Amount | Masraf dağıtımı |
| `IncomingEInvoice` | Ettn, SupplierTaxNumber, InvoiceNo, Date, Subtotal, VatAmount, Total, RawXmlPath, Status, MatchedInvoiceId? | Gelen e-belge kutusu |

Mevcut `PayableService` yeni tabloları **okuyacak** şekilde genişletilir; borç hesabı yine
saklanmaz. Migration yalnız ekleme yapar (`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

Mevcut uçlar korunur (`PurchaseInvoicesController.cs:15-92`): `GET /api/purchase-invoices`,
`/totals`, `/export`, `/{id}`, `/uninvoiced-trips`, `/{id}/file`; yazma: `POST`, `PUT /{id}`,
`POST /{id}/cancel`, `DELETE /{id}` (hepsi `Policies.Accounting`).

**Eklenecek uçlar:**

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET/POST | `/api/purchase-requests` | konu, gerekçe, kalemler | talep | operasyon |
| POST | `/api/purchase-requests/{id}/approve` | — | talep | muhasebe/yönetici (limite göre) |
| POST | `/api/purchase-requests/{id}/reject` | gerekçe | talep | muhasebe/yönetici |
| POST | `/api/purchase-requests/{id}/order` | tedarikçi, fiyatlar | sipariş | operasyon |
| GET/POST | `/api/purchase-orders` | tedarikçi, tarihler, kalemler | sipariş | operasyon |
| GET | `/api/purchase-orders/{id}` | — | sipariş + teslim/fatura özeti | ofis |
| GET | `/api/purchase-orders/{id}/pdf` | — | PDF | ofis |
| POST | `/api/purchase-orders/{id}/cancel` | gerekçe | sipariş | muhasebe |
| GET/POST | `/api/goods-receipts` | sipariş, irsaliye no, kalem kabul miktarları | irsaliye | operasyon |
| POST | `/api/goods-receipts/{id}/file` | dosya | irsaliye | operasyon |
| GET | `/api/supplier-price-lists` | tedarikçi, kalem | liste | muhasebe |
| GET | `/api/purchase-orders/compare` | kalem, miktar | tedarikçi karşılaştırması | muhasebe |
| GET | `/api/purchase-invoices/{id}/match` | — | eşleştirme sonucu + farklar | muhasebe |
| POST | `/api/purchase-invoices/{id}/match` | sipariş/irsaliye seçimi, gerekçe | eşleştirme | muhasebe |
| POST | `/api/purchase-invoices/{id}/return` | satır miktarları, gerekçe | iade faturası | muhasebe |
| GET | `/api/incoming-einvoices` | tarih, eşleşme durumu | gelen belge listesi | muhasebe |
| POST | `/api/incoming-einvoices/{id}/accept` | düzeltmeler | alış faturası | muhasebe |
| GET | `/api/reports/purchase/supplier-performance` | tarih aralığı | performans tablosu | muhasebe |
| GET | `/api/reports/purchase/price-history` | kalem | fiyat geçmişi | muhasebe |

`PurchaseInvoiceSaveRequest` (`server/YesLojistik.Core/Dtos/FinanceDtos.cs:119`) yeni alanlarla
genişletilir; `PurchaseInvoiceDto` mevcut alan sırasını korur (istemci kırılmaz). Hata metinleri Türkçe
ve alan bazlıdır.

## 8. Yetki, onay ve denetim izi

| İş | Operasyon | Muhasebe | Yönetici |
|---|---|---|---|
| Talep oluştur | yaz | yaz | yaz |
| Talebi onayla (≤25.000) | yaz | yaz | yaz |
| Talebi onayla (25.000–150.000) | — | yaz | yaz |
| Talebi onayla (>150.000) | — | — | yaz |
| Sipariş oluştur/gönder | yaz | yaz | yaz |
| Mal kabul / irsaliye | yaz | yaz | yaz |
| Alış faturası gir/düzelt | — | yaz | yaz |
| Eşleştirme gerekçesi yaz | — | yaz | yaz |
| İade faturası | — | yaz + onay | yaz |
| Fiyat listesi | — | yaz | yaz |
| Sipariş iptali | — | yaz | yaz |
| Onay limiti tanımı | — | — | yaz |

**Maker-checker.** Onay limiti üstü talepler, tolerans dışı faturalar ve iade faturaları **iki kişi**
ister: kaydeden ve onaylayan farklı kullanıcı olmalıdır. Onaylanana kadar işlem stok/cari/muhasebeye
yansımaz.

**Denetim izi.** Her yazma uçunda mevcut `AuditLog` kullanılır: kullanıcı, zaman, kayıt, alan bazında
eski→yeni değer, gerekçe. Eşleştirme izi ayrı `PurchaseInvoiceMatch` satırında saklanır (fark tutarı,
tolerans, gerekçe, kim, ne zaman). Sipariş gönderimi (`SentAt`) ve e-belge durum geçişleri de izlenir.

## 9. Kabul kriterleri

1. Talep → onay → sipariş zinciri tek akışta tamamlanır; onaysız talep siparişe dönüşemez.
2. Limit üstü talebi düşük yetkili kullanıcı onaylayamaz; düğme pasif ve Türkçe gerekçe görünür.
3. Siparişten kısmi irsaliye girilebilir; sipariş durumu "Kısmi" olur ve kalan miktar görünür.
4. Kabul edilen + reddedilen miktar toplamı, gelen miktara eşit değilse kayıt engellenir.
5. Sipariş miktarını aşan kabul, gerekçesiz kaydedilemez.
6. Fatura tutarı, kabul edilen miktar × sipariş fiyatından ±%2'den fazla saparsa fatura
   "İncelemede" olur ve gerekçe zorunludur.
7. Aynı irsaliye iki faturaya bağlanamaz; aynı tedarikçide aynı fatura no ikinci kez kaydedilemez
   (`PurchaseInvoiceService.cs:165-166` kuralı korunur).
8. Masraf dağıtımı sonrası satır maliyetleri toplamı, fatura genel toplamına **kuruşu kuruşuna** eşit
   olur.
9. İade faturası kabul edilen miktarı aşamaz; tam iade sonrası tedarikçi bakiyesi fatura öncesine
   döner.
10. "Faturası 15 günden uzun süredir gelmeyen sefer" sayacı korunur (`PayableService.cs:188-196`) ve
    yeni "faturasız mal kabul" sayacı eklenir.
11. Tedarikçi performans raporu: zamanında teslim oranı ve ortalama gecikme iki ondalıkla görünür.
12. Fiyat geçmişi raporu, aynı kalemin tedarikçi bazında son 12 ay değişimini gösterir.
13. Gelen e-Fatura otomatik doldurulduğunda alanların **tamamı** kullanıcı tarafından
    düzenlenebilir kalır; hiçbir alan gizli kilitlenmez.
14. Alış faturası listesi, süzgeç toplamı ve Excel çıktısı bugünkü sütunları korur
    (`PurchaseInvoicesPage.tsx:46-56`, `PurchaseInvoicesController.cs:30-41`).
15. 390×844'te yatay kaydırma yok; kalem tablosu kart görünümüne döner.

## 10. Testler

**Birim (sunucu):** yeni `server/YesLojistik.Tests/Unit/PurchaseMatchingTests.cs` (tolerans sınırı
±%2, tam sınır, sıfır fark, negatif fark), `ExpenseAllocationTests.cs` (oransal dağıtım, yuvarlama
farkı, tek satır, eşit tutarlar), `ApprovalLimitTests.cs` (limit sınır değerleri, yetki eşleşmesi).
Mevcut `InvoiceCalculatorTests.cs` ve `PaymentAllocatorTests.cs` regresyon için koşulur.

**Entegrasyon (sunucu):** mevcut `PurchaseInvoiceTests.cs` ve `PayableTests.cs` korunur ve genişletilir;
yeni `PurchaseOrderTests.cs` (talep→onay→sipariş→kısmi irsaliye→kısmi fatura→kapanış),
`GoodsReceiptTests.cs` (kabul/red miktarları, aşım engeli, dosya eki), `PurchaseReturnTests.cs`
(iade, bakiye dönüşü, miktar sınırı), `SupplierPriceListTests.cs` (liste, karşılaştırma, para birimi),
`IncomingEInvoiceTests.cs` (eşleşme, sahipsiz belge, elle bağlama), `PurchaseReportTests.cs`
(performans ve fiyat geçmişi sayıları). `MigrationTests.cs` yeni tabloları da kapsar.

**E2E (panel, Playwright, `client/e2e/`):** yeni `new-ui/purchase-order.spec.ts` (talep aç, onayla,
siparişe dönüştür, PDF indir), `new-ui/goods-receipt.spec.ts` (kısmi kabul, kalan miktar kontrolü),
`new-ui/purchase-match.spec.ts` (tolerans dışı fatura → "İncelemede", gerekçe yaz, kaydet),
`new-ui/supplier-price.spec.ts` (fiyat listesi ekle, karşılaştır). Mevcut `forms.spec.ts` içindeki
alınan fatura adımları yeni alanlara göre güncellenir. **Hiçbir test silinmez/atlanmaz**
(`01-ORTAK-SARTNAME.md:24-25`).

Komutlar: `cd server && dotnet test`; `cd client && npm run lint && npm run build`;
`cd server && dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure
--startup-project YesLojistik.Api`.

## 11. Efor ve bağımlılıklar

| İş kalemi | Efor | Önce bitmeli |
|---|---|---|
| Talep + onay limiti (veri, API, ekran) | 4 gün | — |
| Sipariş + satırlar + PDF (veri, API, ekran) | 5 gün | Talep |
| Mal kabul / irsaliye + kısmi teslim | 4 gün | Sipariş |
| Alış faturası satırları (mevcut ekranın genişletilmesi) | 4 gün | Sipariş |
| Üç yönlü eşleştirme + tolerans | 3 gün | Sipariş + mal kabul + fatura satırları |
| Fiyat listeleri + karşılaştırma | 3 gün | — |
| Masraf dağıtımı | 2 gün | Fatura satırları |
| İade (tedarikçiye geri) | 3 gün | Fatura satırları |
| Gelen e-Fatura ile otomatik doldurma | 4 gün | `08` e-belge dokümanı + entegratör |
| Raporlar (performans, fiyat geçmişi, açık sipariş) | 3 gün | Sipariş + mal kabul |
| Testler (birim + entegrasyon + e2e) | 5 gün | Her kalemin yanında |
| **Toplam** | **~40 gün** | — |

Bağımlılıklar: `08` (e-belge) gelen e-Fatura için; stok/depo dokümanı `StockId` bağlantısı ve stok
hareketi için; muhasebe çekirdeği dokümanı yevmiye için; `14-KASA.md` ödeme tarafı için;
`11-SATIS-FATURA.md` satır/iskonto/KDV ortak kuralları için.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Süreç ağırlaşır, kullanıcı eski yola döner | Talep ve onay **isteğe bağlı** başlar; sipariş olmadan da fatura girilebilir | Talep/onay ekranlarını menüden gizle |
| Onay limiti yanlış tanımlanır | Limitler tanımlanabilir, değişiklik denetim izine yazılır | Eski limite dön |
| Tolerans dışı faturalar birikir | "İncelemede" kutusu ve günlük uyarı özeti (`AlertService`) | Toleransı geçici yükselt |
| Gelen e-Fatura yanlış eşleşir | İkincil anahtar (tutar + tarih) ve elle bağlama; eşleşme **her zaman** onay ister | Belgeyi sahipsiz kutusuna geri al |
| Masraf dağıtımı maliyetleri bozar | Dağıtım ayrı tabloda, geri alınabilir; yuvarlama testi | Dağıtımı sil, fatura tutarları kalır |
| İki kullanıcı aynı siparişi iki kez teslim alır | Satır kilidi + kabul miktarı toplamı kontrolü | İrsaliyeyi iptal et |
| Mevcut tedarikçi borcu çift sayılır | `PayableService` tek kaynak kalır (`PayableService.cs:53-70`); sipariş borç doğurmaz | Sipariş bağlantısını kaldır |
| Klasik görünüm bozulur | Yeni ekranlar iki görünümde de çalışır; `uiMode.ts:8` korunur | Yeni ekranları gizle (özellik anahtarı) |

**doğrulanacak:** Onay kademeleri ve tutar limitleri (kaç kademe, hangi roller, hangi tutarlar) —
kaynak: kullanıcı iş kararı.
**doğrulanacak:** Üç yönlü eşleştirme tolerans oranı (%2 mi, sabit tutar mı) — kaynak: kullanıcı +
mali müşavir.
**doğrulanacak:** Gelen e-Faturanın alınma kanalı (GİB posta kutusu mu, entegratör API'si mi) ve
teknik ayrıntıları — kaynak: entegratör teknik dokümanı.
**doğrulanacak:** Masraf dağıtımında hangi masrafların stok maliyetine, hangilerinin gidere
yazılacağı — kaynak: mali müşavir.
**doğrulanacak:** Tedarikçiye iade süreci ve gereken belge (iade faturası/irsaliye) — kaynak: mali
müşavir.
**doğrulanacak:** Luca'da satın alma talep/onay akışının ekran akışı — kaynak: Luca kılavuzu/demo.

Sonraki belgeyle bağlantı: bu doküman `11-SATIS-FATURA.md`'nin ters yönüdür (aynı satır, iskonto, KDV,
numara serisi kuralları); `13-SIPARIS-TEKLIF.md` satış tarafındaki sipariş akışını tanımlar ve bu
dokümanla **ortak sipariş durum modelini** paylaşır; `14-KASA.md` ödeme (kasa/banka çıkışı) tarafını
kapsar.
