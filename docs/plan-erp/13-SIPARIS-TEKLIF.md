# 13 — Sipariş ve Teklif

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, sevkiyatın **öncesindeki** ticari zinciri kurar: müşteri fiyat ister → **teklif** verilir →
müşteri kabul eder → **sipariş** doğar → **sevkiyat (sefer)** planlanır → teslim → **fatura**. Bugün bu
zincirin yalnızca küçük bir parçası vardır: "iş talebi" (araç/şoför atanmadan açılan kayıt) ve onun
sefer kaydına dönüşmesi.

Kapsam:

- **Fiyat teklifi**: teklif kalemleri, geçerlilik süresi, revizyon (versiyonlama), onay, PDF, e-posta.
- **Teklif → sipariş dönüşümü** (kabul, kısmi kabul, red).
- **Satış siparişi**: durum akışı, kısmi sevkiyat, kalan miktar/tutar takibi, **stok rezervasyonu**.
- **İrsaliye ve sevk akışı**: siparişten sevkiyat üretimi, irsaliye no/tarih, e-irsaliye alanı.
- **Lojistik bağlantısı**: sipariş → sevkiyat (`Trip`) → teslim → fatura; mevcut `Trip` ve
  `JobRequest` yapısıyla uyum.
- **Teslim ve iade** akışı.
- **Sipariş kâr marjı önizlemesi**: sipariş girilirken tahmini maliyet, komisyon, prim ve ek masrafla
  kâr; teklif aşamasında da gösterilir.
- Yeni tablolar: `Quote`, `QuoteLine`, `SalesOrder`, `SalesOrderLine`, `SalesOrderReservation`.

Kapsam dışı: satış faturası kesimi ve iade faturası (bkz. `11-SATIS-FATURA.md`), satın alma siparişi
(bkz. `12-SATIN-ALMA.md`), kasa/banka (bkz. `14-KASA.md`), stok kartı ve depo tanımı (stok dokümanı),
müşteri portalı (ayrı doküman).

Bu modülün çözdüğü üç sorun: (1) "Fiyat teklifini ne zaman, kaça verdik; müşteri kabul etti mi?"
(2) "Sipariş aldık ama sevk edildi mi, kalanı var mı?" (3) "Bu iş bize kâr bırakıyor mu?"

## 2. Luca'daki karşılığı

Luca Koza'nın **Satış Yönetimi** modülü bu dokümanın referansıdır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:12`, `:21`). Siteden okunan ilgili maddeler:

- **"Siparişten teslimata uzanan satış-pazarlama akışı"** (`02-LUCA-ENVANTERI.md:60`) — bu dokümanın
  ana cümlesi.
- Müşteri/tedarikçi **ödeme planı** takibi ve döviz cinsleri (`02-LUCA-ENVANTERI.md:55-56`).
- **Luca Koza Rest API** ile diğer uygulamalarla senkron; sanal mağaza entegrasyonu
  (`02-LUCA-ENVANTERI.md:53`) — siparişin dış kanaldan gelmesi senaryosu.
- İstatistik raporları (satın alma–satış–finans karar desteği, `02-LUCA-ENVANTERI.md:57`).
- Üretim yönetimi ve planlama (`02-LUCA-ENVANTERI.md:63`) — siparişin üretime bağlanması; bizde kapsam
  dışıdır (nakliye hizmeti).
- Çok depolu stok takibi (`02-LUCA-ENVANTERI.md:48`) — rezerve stok için gerekli zemin.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'da fiyat teklifinin revizyon/versiyon yapısı (revizyon numarası mı, yeni teklif
mi) ve onay akışı — kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da sipariş bazlı stok
rezervasyonunun nasıl çalıştığı ve ne zaman çözüldüğü — kaynak: Luca kılavuzu. **doğrulanacak:** Luca
Rota ile sipariş→sevkiyat bağlantısının kapsamı (`02-LUCA-ENVANTERI.md:14`).

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **İş talebi.** `server/YesLojistik.Core/Entities/JobRequest.cs:4-31`: müşteri, tarih, yükleme/teslim
  adresi, teslim aralığı, yük cinsi ve miktarı, araç cinsi, **satış fiyatı** (`:15`), **taşeron fiyatı**
  (`:16`), **komisyon** (`:17`), **şoför primi** (`:18`), **diğer masraf** (`:19`), evrak no'ları,
  not, koordinatlar, durum. Durumlar: `Pending, Cancelled, Converted`
  (`server/YesLojistik.Core/Entities/Enums.cs:16`). Yani bugün **tek fiyatlı, tek seferlik bir
  ön kayıt** vardır; çok kalemli teklif, geçerlilik, revizyon ve onay **yoktur**.
- **İş talebi yaşam döngüsü.** `server/YesLojistik.Infrastructure/Services/JobRequestService.cs`:
  yalnız **bekleyen** talep düzenlenebilir (`:51-52`) ve iptal edilebilir (`:62-63`); sevk edilmiş
  (`Converted`) talep silinemez (`:72-73`). Tutarlar 2 kuruşa yuvarlanır (`:100-104`).
- **Talep → sefer dönüşümü.** `server/YesLojistik.Infrastructure/Services/TripService.cs:217-245`:
  sefer oluştururken `JobRequestId` verilirse talep bulunur (`:223-224`), talebin **bekleyen** olması
  (`:225-226`) ve **müşterinin aynı** olması (`:227-228`) zorunludur; sonra seferin `JobRequestId`'si
  yazılır ve talep `Converted` olur (`:234-235`). Bire-bir bağ vardır ve **benzersiz indekslidir**
  (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:213-214`). Bu, "teklif → sipariş → sevkiyat"
  zincirinin kurulacağı hazır desendir.
- **Fiyat ve kâr mantığı.** `server/YesLojistik.Core/Entities/Trip.cs:25-27` (taşeron maliyeti, satış
  fiyatı), `:73-80` (komisyon ve hesabı), `:82-87` (faturalanacak ek masraf), `:88-89` (şoför primi),
  `:66-71` (satış/taşeron KDV oranı ve tevkifat). Kâr formülü `Trip.Margin()` (`Trip.cs:121-123`) ve
  `server/YesLojistik.Core/Domain/TripMoney.cs`; **kâr KDV hariç** hesaplanır
  (`docs/KDV-KURALLARI.md:30-34`).
- **Durum akışı.** `server/YesLojistik.Core/Domain/TripStatusRules.cs:7-14`: `Planned → Loaded →
  OnRoad → Delivered`, geri adım ve iptal kuralları; ileri adım `Forward()` (`:21-27`); etiketler
  Türkçe (`:32-40`). Araç durumu ile eşitleme: "Yüklendi/Yolda" aracı meşgul eder (`:30`).
- **Faturalanacak sevkiyatlar.** `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:98-100`
  yalnız teslim edilmiş, faturasız, aktarılmamış sevkiyatı faturalar; ekran tarafı
  `client/src/pages/InvoicesPage.tsx:292-340` ("Faturalandırılacaklar" sekmesi, müşteriye göre grup ve
  "Fatura Kes" düğmesi `:331-333`).
- **İş talebi ekranı.** `client/src/pages/JobRequestsPage.tsx` (179 satır) ve rota `/is-talepleri`
  (`client/src/lib/nav.ts:25`); yeni görünümde menüde yok, sekmelerden açılır
  (`docs/plan/01-ORTAK-SARTNAME.md:133`).
- **Sevkiyat listesi/formu.** `client/src/pages/TripsPage.tsx` (701 satır) ve
  `client/src/components/TripForm.tsx`; sevkiyat süzgeçleri, detay görünümü ve satır menüsü bu
  ekrandadır (şartname §3.3).

**Olmayanlar (kanıtlı).** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içinde
`Quote`, `SalesOrder`, `OrderLine`, `Shipment`, `Reservation` **yoktur**. Teklif, revizyon, teklif
onayı, sipariş durumu, kısmi sevkiyat, rezerve stok ve sipariş bazlı kâr önizlemesi kodda geçmez.
`docs/YOL-HARITASI.md` ve `AGENTS.md` §8, **"teklif hazırlama"** işini "bilgi beklemeyen, yapılabilir
işler" listesinde sayar — yani ihtiyaç kabul edilmiştir, kod henüz yoktur.

**Eksik listesi:** teklif belgesi ve revizyonu, teklif onayı, teklif→sipariş dönüşümü, sipariş
tablosu, kısmi sevkiyat, stok rezervasyonu, irsaliye alanlarının siparişe bağlanması, teslim/iade
kaydı, marj önizleme ekranı, sipariş raporları.

## 4. Hedef ekranlar ve alanlar

### 4.1 Teklifler (`/teklifler`)

Liste: teklif no, tarih, müşteri, konu, geçerlilik, tutar, **revizyon** (R0, R1…), durum rozeti
(Hazırlanıyor / Gönderildi / Kabul / Red / Süresi doldu / Siparişe dönüştü). Form:

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Teklif no | metin (otomatik) | — | Seri bazlı: `TKF-2026/000123` |
| Müşteri | seçim | evet | Karttan; vade ve fatura şablonu önerilir |
| Konu / açıklama | metin (200) | evet | PDF başlığına yazılır |
| Teklif tarihi | tarih | evet | Varsayılan bugün |
| Geçerlilik tarihi | tarih | evet | Süresi geçen teklif "Süresi doldu" olur |
| Kalemler | tablo | evet (≥1) | Açıklama, güzergâh, miktar, birim, birim fiyat, KDV, iskonto |
| Tahmini maliyet | tutar | hayır | Taşeron fiyatı önerisi; **marj önizlemesi** için |
| Marj önizlemesi | salt okunur | — | Satış − maliyet + komisyon − prim − masraf (KDV hariç) |
| Para birimi / kur | seçim + sayı | hayır | Dövizli teklifte |
| Notlar / şartlar | metin | hayır | Ödeme koşulu, teslim süresi |

Düğmeler: Kaydet, **Revize Et** (yeni sürüm üretir, eskisi salt okunur kalır), PDF, E-posta Gönder,
Gönderildi işaretle, **Kabul Et**, **Reddet** (gerekçe), **Siparişe Dönüştür**.

### 4.2 Siparişler (`/siparisler`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Sipariş no | metin (otomatik) | — | `SIP-2026/000123` |
| Müşteri | seçim | evet | Tekliften gelirse dolu |
| Sipariş tarihi / istenen teslim | tarih | evet / hayır | Teslim gecikme uyarısında kullanılır |
| Kaynak teklif | bağlantı | hayır | Tekliften dönüştüyse otomatik |
| Kalemler | tablo | evet (≥1) | Açıklama, miktar, birim, birim fiyat, KDV, iskonto, **sevk edilen**, **kalan** |
| Sevk durumu | rozet | — | Bekliyor / Kısmi / Tamamlandı / İptal |
| Rezerve stok | tablo | hayır | Kalem bazında ayrılan miktar ve depo |
| Tahmini kâr | salt okunur | — | Maliyet + komisyon + prim ile |
| Bağlı sevkiyatlar | liste | — | Sefer no, tarih, durum, plaka |

Düğmeler: Kaydet, Onayla, **Sevkiyat Oluştur** (seçili kalemlerden), PDF, İptal Et (gerekçe).
Sevkiyat oluşturma, mevcut `POST /api/trips` ucunu kullanır ve `jobRequestId` benzeri
`salesOrderId` bağını kurar (`server/YesLojistik.Infrastructure/Services/TripService.cs:217-245`
deseni).

### 4.3 Sipariş Detayı

Üst şerit: sipariş no, müşteri, tutar, sevk durumu, kalan tutar, tahmini kâr. Sekmeler: Kalemler,
Sevkiyatlar, Rezervasyonlar, Belgeler, Hareketler (kim ne zaman ne değiştirdi).

### 4.4 Sevkiyat (mevcut `TripsPage` genişletmesi)

Yeni alanlar: **Sipariş** (bağlantı, seçilirse müşteri/güzergâh/not önerilir), **İrsaliye no** ve
**İrsaliye tarihi** (bugün `Trip.WaybillNo` ve `Trip.EWaybillNo` vardır:
`server/YesLojistik.Core/Entities/Trip.cs:97-99`), **Teslim belgesi** (`DeliveryDocumentNo`,
`DeliveryDocumentApproved`, `Trip.cs:95-96`). Sipariş seçilince kalan miktar ve tutar üst şeritte
görünür.

### 4.5 Teklif ve Sipariş Raporları (`/raporlar/satis`)

- **Teklif dönüşüm oranı:** gönderilen tekliflerin kabul oranı (%), ortalama karar süresi (gün).
- **Açık siparişler:** sevk bekleyen, kısmi sevk edilen, gecikmiş siparişler ve tutarları.
- **Sipariş kârlılığı:** sipariş bazında tahmini ve gerçekleşen kâr (sevkiyat kârı toplamı).
- **Müşteri bazında kazanma oranı** ve ortalama teklif tutarı.

## 5. İş kuralları

1. **Numaralandırma.** Teklif, sipariş ve sevkiyat numaraları seri bazlıdır: `<seri>-<yıl>/<sıra>`
   (`TKF`, `SIP`, mevcut sevkiyat numarası). Sıra **satır kilidiyle** alınır
   (`InvoiceService.cs:221-228` deseni). İptal edilen belge numarasını korur.
2. **Revizyon.** Revize edilen teklif **yeni sürüm** üretir; eski sürüm salt okunur kalır ve
   "R0, R1, R2…" diye numaralanır. Bir siparişe yalnız **kabul edilmiş** sürüm bağlanabilir.
3. **Geçerlilik.** Geçerlilik tarihi geçen teklif "Süresi doldu" olur; bu tekliften sipariş
   oluşturulamaz (yönetici gerekçeyle zorlayabilir).
4. **Teklif → sipariş.** Dönüşümde kalemler, fiyatlar, KDV, iskonto ve notlar kopyalanır; teklif
   `Converted` olur ve **başka siparişe dönüştürülemez**. Kısmi kabul desteklenir: seçilmeyen kalemler
   siparişe girmez ve teklif "Kısmi kabul" işareti alır.
5. **Sipariş durum akışı.** `Draft → Approved → PartiallyShipped → Shipped → Closed`, ayrıca
   `Cancelled`. `Shipped`, tüm kalemlerin sevk edilen miktarı miktara eşit olunca otomatik olur.
6. **Kısmi sevkiyat.** Bir siparişe **birden çok sevkiyat** bağlanabilir. Sevk edilen miktar, sipariş
   miktarını **aşamaz**; aşım için gerekçe + onay gerekir. Kalan miktar her ekranda görünür.
7. **Rezerve stok.** Sipariş kalemi için stok ayrılır (`SalesOrderReservation`). Rezervasyon, sevkiyat
   oluşturulunca **kısmen/tamamen çözülür**; sipariş iptalinde tamamen çözülür. Rezerve miktar,
   mevcut stoktan düşülür ama **stok hareketi doğurmaz** (stok çıkışı sevkiyat/irsaliye anında olur).
   **Not:** stok modülü gelene kadar bu alan **hizmet** kalemlerinde kullanılmaz.
8. **İrsaliye ve sevk.** Sevkiyat oluşturulunca irsaliye no/tarih girilir; alanlar bugünkü
   `Trip.WaybillNo` / `Trip.EWaybillNo` / `Trip.EWaybillDate` alanlarında tutulur (`Trip.cs:97-99`).
   e-İrsaliye gönderimi **kapsam dışıdır** (yalnız alan hazırlanır); mevzuat zorunluluğu
   **doğrulanacak** (GİB/mali müşavir).
9. **Lojistik bağlantısı.** Zincir: `SalesOrder` → `Trip` (sevkiyat) → teslim (`Delivered`) →
   `Invoice`. Sefer durumu kuralları **değişmez**
   (`TripStatusRules.cs:7-14`); yalnız sipariş bağı eklenir. Sevkiyat "Teslim Edildi" olduğunda sipariş
   kalemi "sevk edildi" sayılır.
10. **Teslim.** Teslim alan kişi, teslim zamanı ve teslim belgesi sevkiyatta tutulur
    (`Trip.ReceivedBy`, `Trip.DeliveredAt`, `Trip.DeliveredBy`, `Trip.cs:60-64`). Teslim belgesi
    işaretlenmemişse fatura kesimi **uyarır** ama engellemez (bugünkü davranış korunur:
    `InvoiceService.cs:98-100` yalnız durum ve faturalanmamışlık arar).
11. **İade.** İade, sipariş ya da sevkiyat satırına bağlanır; miktar kısmi olabilir; kümülatif iade,
    sevk edilen miktarı aşamaz. Cari etkisi iade faturasıyla olur (bkz. `11-SATIS-FATURA.md` §5.9).
12. **Marj önizlemesi.** Teklif ve sipariş ekranında satır bazında ve toplamda tahmini kâr gösterilir:
    satış − maliyet + komisyon − prim − (faturalanmayan) masraf, **KDV hariç**
    (`Trip.cs:121-123`, `docs/KDV-KURALLARI.md:30-34`). Kâr, yetkisi olmayan kullanıcıya
    **gösterilmez** (§8).
13. **Faturalanabilirlik.** Sipariş **doğrudan** faturalanamaz; fatura yalnız teslim edilmiş
    sevkiyattan kesilir (`InvoiceService.cs:98-100`). Böylece "sipariş = satış" karışıklığı olmaz.
14. **Doğrulamalar.** Müşteri zorunlu, en az bir kalem zorunlu, miktar > 0, fiyat ≥ 0, iskonto satır
    tutarını aşamaz, geçerlilik tarihi teklif tarihinden önce olamaz, sevk edilen > miktar engellenir.

## 6. Veri modeli

**Yeni tablolar:**

| Tablo | Ana alanlar | İlişki |
|---|---|---|
| `Quote` | No, CustomerId, Date, ValidUntil, Subject, Notes, CurrencyCode, ExchangeRate, Subtotal, DiscountTotal, VatAmount, Total, Status, Revision (int), RootQuoteId?, SentAt, AcceptedAt, RejectedAt, RejectReason, ConvertedOrderId?, LegacyKey | `CustomerId → Customer`; `Lines`; `RootQuoteId → Quote` (revizyon zinciri) |
| `QuoteLine` | QuoteId, Description, Route, Quantity, Unit, UnitPrice, DiscountRate, VatRate, VatAmount, Amount, EstimatedCost, SortOrder | — |
| `SalesOrder` | No, CustomerId, QuoteId?, Date, RequestedDeliveryDate, Status, CurrencyCode, ExchangeRate, Subtotal, VatAmount, Total, Notes, ApprovedBy, ApprovedAt, CancelReason, LegacyKey | `CustomerId → Customer`; `QuoteId → Quote`; `Lines`; `Reservations` |
| `SalesOrderLine` | OrderId, Description, Route, Quantity, Unit, UnitPrice, DiscountRate, VatRate, VatAmount, Amount, ShippedQuantity, InvoicedQuantity, EstimatedCost, StockId?, SortOrder | — |
| `SalesOrderReservation` | OrderLineId, WarehouseId?, Quantity, ReservedAt, ReleasedAt, ReleasedQuantity, StockId? | — |
| `SalesOrderShipment` | OrderId, TripId, ShippedAt, WaybillNo, Note | `TripId → Trip` (bir sipariş → çok sevkiyat) |

**Eklenecek alanlar (yalnız ekleme migration; boş olabilir):**

`Trip` (mevcut, `Trip.cs:3`): `SalesOrderId int?`, `SalesOrderLineId int?`. Mevcut `JobRequestId`
(`Trip.cs:11`) ve bire-bir indeksi (`AppDbContext.cs:213-214`) **değişmez**; iş talebi ile sipariş
bağı **birlikte** bulunabilir (talep → sipariş → sevkiyat).

`JobRequest` (mevcut, `JobRequest.cs:4`): `QuoteId int?` — iş talebinin teklifle bağlantısı. Böylece
bugünkü talep akışı bozulmadan teklif zincirine bağlanır. `Enums.cs:16` içindeki
`JobRequestStatus` **değiştirilmez** (test ve mevcut davranış korunur).

`Invoice` (mevcut, `Invoice.cs:5`): `SalesOrderId int?` — fatura ile sipariş bağı (rapor için).

Migration yalnız ekleme yapar (`01-ORTAK-SARTNAME.md:22-23`); mevcut `Trip.JobRequestId` benzersiz
indeksi gibi kısıtlar bozulmaz.

## 7. API uçları

Mevcut uçlar korunur: `POST /api/trips` (`server/YesLojistik.Api/Controllers/TripsController.cs`),
`/api/job-requests` (`JobRequestsController.cs`), `/api/invoices` (bkz. `11-SATIS-FATURA.md` §7).

**Eklenecek uçlar:**

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET/POST | `/api/quotes` | müşteri, tarih, geçerlilik, kalemler | teklif | operasyon |
| GET | `/api/quotes/{id}` | — | teklif + revizyon zinciri | ofis |
| POST | `/api/quotes/{id}/revise` | değişen alanlar | yeni sürüm | operasyon |
| GET | `/api/quotes/{id}/pdf` | — | PDF | ofis |
| POST | `/api/quotes/{id}/send` | e-posta, mesaj | gönderim | operasyon |
| POST | `/api/quotes/{id}/accept` | kabul edilen kalemler | teklif | operasyon |
| POST | `/api/quotes/{id}/reject` | gerekçe | teklif | operasyon |
| POST | `/api/quotes/{id}/order` | tarihler, notlar | sipariş | operasyon |
| GET/POST | `/api/sales-orders` | müşteri, tarih, kalemler | sipariş | operasyon |
| GET | `/api/sales-orders/{id}` | — | sipariş + sevkiyat/rezervasyon özeti | ofis |
| POST | `/api/sales-orders/{id}/approve` | — | sipariş | muhasebe |
| POST | `/api/sales-orders/{id}/cancel` | gerekçe | sipariş | muhasebe |
| POST | `/api/sales-orders/{id}/ship` | kalem miktarları, sevkiyat bilgileri | sevkiyat(lar) | operasyon |
| GET | `/api/sales-orders/{id}/margin` | — | satır ve toplam marj | yetki: fiyat/kâr |
| GET/POST | `/api/sales-orders/{id}/reservations` | kalem, miktar, depo | rezervasyon | operasyon |
| GET | `/api/reports/sales/quote-funnel` | tarih aralığı | kabul oranı, karar süresi | muhasebe |
| GET | `/api/reports/sales/open-orders` | tarih aralığı | açık/gecikmiş siparişler | muhasebe |

`TripSaveRequest` (`server/YesLojistik.Core/Dtos/TripDtos.cs:13,22`) `SalesOrderId` ile genişletilir;
`TripDto` mevcut alan sırasını korur (istemci kırılmaz). Doğrulama hataları Türkçe ve alan bazlıdır;
`JobRequest` dönüşümündeki mevcut hata metinleri aynen kalır (`TripService.cs:225-228`).

## 8. Yetki, onay ve denetim izi

| İş | Operasyon | Muhasebe | Yönetici |
|---|---|---|---|
| Teklif oluştur/revize et | yaz | yaz | yaz |
| Teklif gönder (e-posta) | yaz | yaz | yaz |
| Teklif kabul/red | yaz | yaz | yaz |
| Teklif → sipariş | yaz | yaz | yaz |
| Sipariş onayla | — | yaz | yaz |
| Sipariş iptal | — | yaz | yaz |
| Sevkiyat oluştur | yaz | yaz | yaz |
| Rezervasyon | yaz | yaz | yaz |
| Marj/kâr görme | — | yaz | yaz |
| İskonto üstü (ör. %10+) | — | yaz + gerekçe | yaz |
| Raporlar | — | yaz | yaz |

**Fiyat/kâr gizliliği.** Operasyon rolü teklif ve sipariş tutarını görür, **maliyet ve marjı görmez**;
`GET /api/sales-orders/{id}/margin` yalnız muhasebe ve yöneticiye açıktır. Bu, `docs/TAM-GELISTIRME-PLANI.md`
"fiyat/kâr yetkisi ayrılır" maddesinin uygulanmasıdır.

**Maker-checker.** Sipariş iptali, kısmi kabulle teklif→sipariş dönüşümü, miktar aşan sevkiyat ve
yüksek iskontolu teklif **ikinci kişi onayı** ister.

**Denetim izi.** Mevcut `AuditLog` kullanılır: kullanıcı, zaman, kayıt, alan bazında eski→yeni değer,
gerekçe. Teklif revizyonları ayrı satırlarda saklandığı için geçmiş **silinmez**; "R0 → R1" farkı
ekranda görülebilir. Sipariş durum geçişleri ve sevkiyat bağlantısı da izlenir.

## 9. Kabul kriterleri

1. Teklif → sipariş → sevkiyat → teslim → fatura zinciri tek akışta tamamlanır; her adımda bir önceki
   belge bağlantısı görünür.
2. Revize edilen teklif yeni sürüm üretir; eski sürüm salt okunur ve PDF'inde "R0" yazar.
3. Geçerliliği geçmiş tekliften sipariş oluşturulamaz; ekranda Türkçe engel metni çıkar.
4. Aynı teklif iki kez siparişe dönüştürülemez (ikinci denemede hata metni).
5. Kısmi kabulde yalnız seçilen kalemler siparişe girer; teklif "Kısmi kabul" işareti alır.
6. Siparişten kısmi sevkiyat yapılabilir; "Sevk edilen" ve "Kalan" miktarlar doğru güncellenir ve
   toplamları sipariş miktarını aşamaz.
7. Tüm kalemler sevk edilince sipariş durumu otomatik `Shipped` olur.
8. Rezervasyon, sevkiyat oluşturulunca çözülür; sipariş iptalinde tamamen kalkar; **stok hareketi
   doğurmaz**.
9. Marj önizlemesi, sevkiyat kâr formülüyle (`Trip.Margin()`) aynı sonucu verir (test: aynı girdiler →
   aynı kâr).
10. Operasyon rolü marj ucundan **403** alır; tutarı görebilir.
11. Sevkiyat "Teslim Edildi" olunca müşteriye takip bildirimi mevcut davranışla gider
    (`TripService`/`CustomerNotifier` mevcut akışı bozulmaz).
12. "Faturalandırılacaklar" sekmesi, sipariş bağı eklendikten sonra da doğru gruplar ve doğru toplamı
    gösterir (`InvoicesPage.tsx:296-321`).
13. Teklif/sipariş PDF'lerinde plaka, tarih ve tutar biçimleri şartnameye uyar: para 2 kuruş, tarih
    `03.10.2026`, plaka büyük harf boşluklu (`01-ORTAK-SARTNAME.md:56-59`).
14. 390×844'te yatay kaydırma yok; kalem tablosu kart görünümüne döner.

## 10. Testler

**Birim (sunucu):** yeni `server/YesLojistik.Tests/Unit/QuoteRevisionTests.cs` (revizyon zinciri,
sürüm numarası, eski sürümün salt okunurluğu), `OrderShipmentTests.cs` (kısmi sevkiyat toplamı, aşım
engeli, otomatik `Shipped`), `ReservationTests.cs` (rezerve/çöz, iptalde tam çözüm, stok hareketi
doğurmama), `OrderMarginTests.cs` (marj formülü, KDV hariç, `TripMoney` ile aynı sonuç).
Mevcut `TripProfitTests.cs` ve `TripStatusRulesTests.cs` regresyon için koşulur.

**Entegrasyon (sunucu):** mevcut `JobRequestTests.cs` (talep → sefer dönüşümü, `Converted` durumu,
bire-bir bağ) korunur ve **genişletilir**: talep → teklif → sipariş → sevkiyat zinciri. Yeni
`QuoteTests.cs` (oluştur, revize, kabul, red, siparişe dönüştür, mükerrer dönüşüm engeli),
`SalesOrderTests.cs` (durum akışı, kısmi sevkiyat, iptal, `Trip.SalesOrderId` bağı),
`SalesReportTests.cs` (dönüşüm oranı, açık siparişler, gecikmiş siparişler),
`OrderInvoiceFlowTests.cs` (sevkiyat → teslim → fatura; fatura siparişe bağlanır).
`MigrationTests.cs` yeni tabloları ve indeksleri kapsar.

**E2E (panel, Playwright, `client/e2e/`):** yeni `new-ui/quote-order.spec.ts` (teklif oluştur, revize
et, kabul et, siparişe dönüştür, PDF indir), `new-ui/partial-shipment.spec.ts` (siparişten iki kısmi
sevkiyat, kalan miktar kontrolü), `new-ui/order-invoice.spec.ts` (sevkiyatı teslim et, faturalandır,
faturada sipariş bağını doğrula). Mevcut `trips.spec.ts`, `workflow.spec.ts` ve
`new-ui/faturalandirilacaklar.spec.ts` korunur. **Hiçbir test silinmez/atlanmaz**
(`01-ORTAK-SARTNAME.md:24-25`).

Komutlar: `cd server && dotnet test`; `cd client && npm run lint && npm run build`;
`cd server && dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure
--startup-project YesLojistik.Api`.

## 11. Efor ve bağımlılıklar

| İş kalemi | Efor | Önce bitmeli |
|---|---|---|
| Teklif + kalemler + revizyon (veri, API, ekran) | 5 gün | — |
| Teklif PDF/e-posta ve kabul/red | 2 gün | Teklif |
| Teklif → sipariş dönüşümü | 2 gün | Teklif + sipariş |
| Sipariş + kalemler + onay akışı (veri, API, ekran) | 5 gün | — |
| Kısmi sevkiyat + sipariş kalemi güncelleme | 3 gün | Sipariş + sevkiyat bağı |
| Sevkiyat bağı ve irsaliye alanları (`Trip`) | 2 gün | Sipariş |
| Rezervasyon (stok modülü gelince) | 3 gün | Stok/depo dokümanı |
| Marj önizlemesi + yetki ayrımı | 2 gün | Sipariş |
| Teslim/iade akışı | 3 gün | Sipariş + `11` iade akışı |
| Raporlar (dönüşüm, açık sipariş, kârlılık) | 3 gün | Sipariş + kısmi sevkiyat |
| Testler (birim + entegrasyon + e2e) | 4 gün | Her kalemin yanında |
| **Toplam** | **~34 gün** (rezervasyon hariç ~31) | — |

Bağımlılıklar: `11-SATIS-FATURA.md` (iade ve fatura bağı), `12-SATIN-ALMA.md` (ortak sipariş durum
modeli ve satır yapısı), stok/depo dokümanı (rezervasyon ve stok kalemi), `14-KASA.md` (tahsilat
bağlantısı), `docs/plan/` F3 (faturalandırılacaklar akışı — sevkiyat → fatura).

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Süreç ağırlaşır, sevkiyat doğrudan girilmek istenir | Sipariş bağı **isteğe bağlı**; teklif/sipariş olmadan sevkiyat eskisi gibi girilebilir | Sipariş alanını gizle |
| Kısmi sevkiyat sayıları tutarsız kalır | "Sevk edilen + kalan = miktar" kontrolü, testi vardır | Farkı elle düzelt (yetkili) |
| Rezervasyon stok modülü yokken yanlış çalışır | Rezervasyon yalnız stok kalemlerinde; hizmette kapalı | Rezervasyonu kapat |
| Marj rakamı güvenilmez sanılır | "Tahmini" etiketi, KDV hariç notu, girdiler görünür | Marj kolonunu gizle |
| Fiyat/kâr gizliliği ihlali | Sunucu tarafı yetki, istemci yalnız gizler (güvenlik sunucuda) | Marj ucunu kapat |
| Revizyon zinciri şişer, karışıklık olur | Yalnız son sürüm düzenlenebilir; eskiler salt okunur | Fazla sürümü arşive al |
| Mevcut iş talebi akışı bozulur | `JobRequestStatus` ve bire-bir indeks **değişmez**; test korunur | Yeni alanları kullanma |
| Sipariş doğrudan faturalanmaya çalışılır | Fatura yalnız teslim edilmiş sevkiyattan (`InvoiceService.cs:98-100`) | Değişiklik yok, kural sabit |

**doğrulanacak:** Teklif revizyon numarası biçimi (R0/R1 mi, V1/V2 mi) ve kaç sürüm saklanacağı —
kaynak: kullanıcı iş kararı.
**doğrulanacak:** Teklif geçerlilik süresi varsayılanı (15/30 gün) — kaynak: kullanıcı.
**doğrulanacak:** Sipariş onayı zorunlu mu, hangi tutardan sonra — kaynak: kullanıcı.
**doğrulanacak:** e-İrsaliye zorunluluğu ve gönderim kanalı — kaynak: GİB/mali müşavir.
**doğrulanacak:** Stok rezervasyonunun nakliye hizmetinde uygulanıp uygulanmayacağı (stok kalemi var mı)
— kaynak: kullanıcı.
**doğrulanacak:** Luca'da teklif/sipariş ekranlarının alan adları ve akış sırası — kaynak: Luca
kılavuzu/demo.

Sonraki belgeyle bağlantı: bu doküman `11-SATIS-FATURA.md`'nin **öncesidir** (teklif → sipariş →
sevkiyat → fatura); `12-SATIN-ALMA.md` ile sipariş durum modelini ve satır yapısını paylaşır;
`14-KASA.md` siparişin tahsilat tarafını tamamlar.
