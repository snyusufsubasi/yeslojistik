# 21 — Sayım ve Barkod

## 1. Amaç ve kapsam

Bu modül iki işi birleştirir: **ürünü etiketlemek** (barkod/QR üretmek ve okumak) ve **fiili stoğu
sayıp sistemle karşılaştırmak**. Depoda gerçekte kaç adet var, sistemde kaç görünüyor, fark nerede?
Bu sorunun cevabı sayım oturumuyla alınır.

Modülün çözdüğü işler:

- Stok kartına barkod/QR atamak; etiket yazdırmak (raf etiketi, ürün etiketi, palet etiketi).
- Barkodu okuyup hızlı giriş/çıkış yapmak; el terminali (Android) ve telefonla okumak.
- Sayım oturumu açmak, sayılanı toplamak, farkı görmek, oturumu kapatmak.
- Seri numarası ve lot (parti) takibi: hangi seri kimde, hangi lot ne zaman geldi, son kullanma tarihi.
- Depoyu raf/adres bazında tutmak: "A-03-2 rafında 12 adet".
- Depolar arası transfer.
- Sayım farkının stoğa ve muhasebeye etkisini göstermek (fire/noksan/fazla).

Kapsam dışı olanlar:

- **Otomatik sipariş önerisi kapsam dışı** — `12-SATIN-ALMA.md` işidir.
- **Muhasebe fişi üretmek kapsam dışı** — `06-MUHASEBE-MOTORU.md` işidir; bu modül fark kaydını
  hazırlar.
- **RFID, konveyör, otomatik depo (AS/RS) kapsam dışı.** Barkod/QR ile sınırlıyız.
- **Üretim içi ara stok sayımı** `20-URETIM-RECETE.md` ile birlikte çalışır ama üretim mantığı orada.

## 2. Luca'daki karşılığı

`02-LUCA-ENVANTERI.md:30` birebir şunu yazıyor: Luca Net'te **"Barkod: faturadan hızlı barkod ile
sayım ve seri takibi"** vardır. `02-LUCA-ENVANTERI.md:48` ise Luca Koza'da **"birden fazla depo ve
depo bölümü bazında stok takibi"** olduğunu söylüyor. Kaynak: <https://luca.com.tr/> ve ürün
sayfaları (`02-LUCA-ENVANTERI.md:11-12`). Menü omurgası `02-LUCA-ENVANTERI.md:20-23` içindeki
**Stok Yönetimi** menüsüdür.

Buradan çıkan iki tasarım kararı:

1. "Faturadan hızlı barkod ile sayım" ifadesi, sayımın **fatura/alım belgesinden başlayabildiğini**
   gösterir. Bizde de sayım oturumu iki türlü başlar: **kör sayım** (sistem miktarı gizli) ve
   **belgeli sayım** (alım irsaliyesinden gelen miktarla başlar).
2. Depo bölümü (raf/adres) bazlı takip bizde `StockLocation` tablosuyla kurulur; depo ve bölüm iki
   ayrı seviyedir.

**doğrulanacak:** Luca'nın barkod ekranları, kullandığı barkod simbologları (EAN-13, Code-128 vb.),
etiket tasarım aracının olup olmadığı, el terminali desteğinin nasıl çalıştığı (Android uygulaması mı,
taramalı klavye mi), kaç depo/bölüm seviyesi desteklendiği. Kaynak sitede yalnız özellik cümlesi var.

## 3. Bizde bugün

Bugün panelde **stok, depo, raf, barkod, QR, seri, lot ve sayım kavramları yoktur.**

- **Stok tablosu yok.** `server/YesLojistik.Core/Entities/` altında `StockItem`, `StockMovement`,
  `Warehouse`, `StockLocation`, `StockLot`, `SerialNumber`, `InventoryCount` adlı sınıf yok;
  `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içindeki `DbSet` listesinde de yok.
- **Barkod alanı yok.** `Vehicle.cs`, `Expense.cs`, `PurchaseInvoice.cs` gibi mevcut tabloların
  hiçbirinde barkod alanı geçmiyor (`server/YesLojistik.Core/Entities/` içeriği okundu).
- **Depo kavramı yalnızca metin.** "Depo" sözcüğü panelde yalnız yakıt deposu anlamında ve serbest
  metin olarak geçiyor: `client/src/pages/ExpensesPage.tsx:261` ("önceki depodaki km") ve
  `client/src/pages/FuelPage.tsx:115` ("kayıtlı deposu yok"). Gerçek depo/raf yapısı yok.
- **"Sayım" yalnız sunucu taşıma karşılaştırması.** `client/src/pages/SettingsPage.tsx:622` içindeki
  "sayım" bir kayıt sayımıdır (sunucudaki kayıt adetleri), fiziki stok sayımı değil. Karıştırılmamalı.
- **Sayım ekranı yok.** `client/src/pages/` altındaki 33 sayfada stok/sayım/barkod adlı dosya yok;
  menüde (`client/src/lib/nav.ts:19-114`) ve sekmelerde (`client/src/lib/sections.ts:10-39`) karşılığı
  yok; rotalarda (`client/src/App.tsx:80-118`) yok.
- **Mobil uygulama hazır bir omurgaya sahip.** `mobile/src/lib/outbox.ts:9-13` çevrimdışı kuyruğu
  açıklıyor: "şoförün yaptığı her işlem önce telefona yazılır, sonra sırayla gönderilir"; her işlem
  `Idempotency-Key` ile gider (`outbox.ts:11-12`). Sayım da aynı deseni kullanacak: depoda internet
  yoksa sayılan miktar telefonda durur, ağ gelince gönderilir.
- **Mobil işlem türleri.** `mobile/src/lib/outbox.ts:15` bugün yalnız `status | expense | photo |
  signature` türlerini tanıyor; sayım için `count` türü **eklenecek**.
- **Mobil yönetici ekranları var.** `mobile/src/app/yonetim/(tabs)/` altında seferler, cariler,
  harita, daha sekmesi; `mobile/src/app/yonetim/gider.tsx`, `odeme.tsx`, `tahsilat.tsx`,
  `onay.tsx` mevcut. Sayım ekranı bu gruba `yonetim/sayim.tsx` olarak eklenecek.
- **Kamera ve dosya izinleri altyapısı var.** `mobile/src/lib/photos.ts` ve
  `mobile/src/lib/permissions.ts` mevcut; kamera izni ve fotoğraf çekme akışı bugün kullanılıyor
  (`mobile/src/lib/outbox.ts:19` `FilePayload`). Barkod okuma kamerası bu izin akışını izleyecek.
- **Ortak parçalar hazır.** Masaüstünde `PageShell`, `DataTable`, `FilterPanel`, `SumStrip` bugün
  kullanımda (`client/src/pages/VehicleExpensesPage.tsx:10-13`). **Not:**
  `docs/plan/01-ORTAK-SARTNAME.md:147-148` "PageShell kodda yok" diyor; bu ifade artık gerçek dışıdır.
- **Excel dışa aktarım kalıbı var.** `server/YesLojistik.Api/Controllers/VehiclesController.cs:57-79`
  örneği; sayım farkı listesi de aynı kalıpla dışa aktarılacak.

Eksik listesi: stok modülü (ön koşul), barkod alanı ve etiket üretimi, barkod okuma, sayım oturumu,
seri/lot takibi, raf/adres, transfer, fark kaydı, ekranlar, API, mobil sayım ekranı, yetkiler, testler.

## 4. Hedef ekranlar ve alanlar

**E1. Barkodlar / etiketler — `/stok/barkod`**
Sol tarafta stok arama, sağda etiket önizleme. Alanlar: stok seçimi, barkod tipi (EAN-13 · Code-128 ·
QR), etiket boyutu (50×30 mm, 100×50 mm, A4 sayfa), kopya adedi, etikete yazılacaklar (ad, kod, fiyat,
raf, lot). Düğmeler: **Etiket oluştur**, **Yazdır**, **PDF indir**, **Toplu üret** (seçili N stok).
QR içeriği tek biçimde tanımlıdır: `YES|<stokKodu>|<lot>|<miktar>|<depo>`. Biçim **doğrulanacak** (§12).

**E2. Stok sayımı — oturum listesi `/stok/sayim`**
Sütunlar: Oturum no, Depo, Tür (Kör/Belgeli/Döngüsel), Başlangıç, Bitiş, Sayılan kalem, Farklı kalem,
Fark tutarı, Durum, Sorumlu. Düğmeler: **Yeni sayım**, **Devam et**, **Kapat**, **Rapor**.
`SumStrip`: açık oturum, toplam fark adedi, toplam fark tutarı (TL).

**E3. Sayım oturumu ekranı `/stok/sayim/{id}`**
Üç bölüm:

1. **Üst şerit:** depo, tür, durum, sorumlu, başlangıç saati, sayılan/toplam kalem, fark sayısı.
2. **Sayım listesi (tablo):** Stok kodu, Ad, Raf, Birim, Sistem miktarı (kör sayımda gizli),
   Sayılan, Fark, Fark tutarı, Durum (Sayılmadı/Sayıldı/Farklı/Onaylandı). Raf bazlı süzgeç.
3. **Fark paneli:** yalnız farkı olan kalemler; onay düğmesi kalem kalem veya toplu.

Alanlar (satır düzenleme): Sayılan miktar (sayı 4), Raf (seçim), Lot (seçim/metin), Seri listesi
(tekrar eden metin), Neden (seçim: Sayım hatası · Kayıp · Fire · Bulundu · Diğer), Not (200).

**E4. Transfer — `/stok/transfer`**
Alanlar: Çıkış deposu, Giriş deposu, Tarih, Kalemler (stok, miktar, lot, seri), Araç/plaka (isteğe
bağlı), Not. Düğmeler: **Kaydet**, **Fişi yazdır**, **İptal et**. Transfer tek onayla stok hareketi
doğurur; iptal ters kayıtla geri alınır.

**E5. Seri / lot takibi — `/stok/seri-lot`**
Süzgeç: stok, lot, seri, depo, son kullanma tarihi aralığı, "süresi yaklaşan". Tablo: Lot/Seri,
Stok, Depo, Raf, Giriş tarihi, Son kullanma, Kalan miktar, Durum. Düğme: **İzlenebilirlik** (bu lotun
hangi giriş ve çıkışlarda geçtiğini gösterir).

**E6. Mobil sayım — `mobile/src/app/yonetim/sayim.tsx`**
Ekranlar: oturum seç/aç, barkod tara, miktar gir, liste (çevrimdışı kuyruk göstergesi), gönder.
Kamera izni yoksa "Kamera izni verilmedi" uyarısı ve elle kod girme alanı görünür
(`mobile/src/lib/permissions.ts` deseni). El terminali (Android, taramalı) için aynı ekran tam ekran
ve klavye girişli çalışır: terminal tarayıcısı kendini klavye gibi gösterir, bu yüzden barkod alanı
**odakta kalır** ve Enter ile satır ekler.

## 5. İş kuralları

1. **Barkod tekildir.** Aynı barkod iki stokta kullanılamaz; çakışmada kayıt reddedilir ve hangi
   stokta olduğu mesajda yazar. Seri takipli üründe **her seri ayrı barkod** taşır.
2. **Sayım oturumu dondurur.** Oturum açıldığında sistem miktarları o an için sabitlenir
   (`SnapshotQuantity`). Sayım sürerken başka giriş/çıkış olursa fark hesabı bozulmasın diye bu
   gereklidir; ekranda "sayım anı" zamanı gösterilir.
3. **Kör sayımda sistem miktarı gizlenir.** Kullanıcı sayılanı yazar; fark ancak kaydettikten sonra
   görünür. Bu, sayanın rakamı "olması gereken" değere uydurmasını engeller.
4. **Fark = sayılan − sistem.** Pozitif fark "fazla", negatif fark "noksan" olarak etiketlenir.
   Sıfır fark kayda geçmez ama "sayıldı" işareti kalır.
5. **Yuvarlama.** Miktarlar birime göre: adet tam sayı, kg/litre 3 hane, metre 2 hane. Fark tutarı
   `Money.Round` ile 2 hane (`server/YesLojistik.Core/Domain/Money.cs:6`).
6. **Oturum kapanışı.** Kapanışta onaylanmamış fark kalemleri **kapatmayı engeller**; kullanıcı ya
   onaylar ya "fark yok" işaretler. Kapanışta stok hareketleri üretilir: noksan → çıkış, fazla →
   giriş.
7. **Farkın kaynağı zorunlu.** 0'dan farklı her kalemde neden seçilmelidir. Neden listesi sabittir ve
   raporda kırılım olarak görünür.
8. **Eşik onayı.** Fark tutarı kullanıcı ayarındaki eşiği (varsayılan 5.000,00 TL) veya fark oranı
   %5'i geçerse oturum kapanışı **ikinci onay** ister (muhasebe). Eşikler ayardır.
9. **Sayım kilidi.** Aynı depoda aynı anda tek açık oturum olur. İki kullanıcı aynı rafı sayıyorsa
   ikinci kayıt "üzerine yaz" uyarısı verir ve kim ne zaman yazdı görünür.
10. **Seri/lot zorunluluğu.** Stok kartında "seri takip" veya "lot takip" açıksa sayımda ve transferde
    ilgili alan zorunludur; açık değilse alan gizlenir.
11. **Son kullanma tarihi.** Lot ekranında süresi geçmiş lot kırmızı, 30 gün içinde bitecek lot sarı
    gösterilir; uyarı **renk + metin** olarak verilir.
12. **Transfer.** Çıkış ve giriş deposu aynı olamaz; miktar 0'dan büyük olmalı; transfer kendi
    içinde tek işlemdir (transaction) — yarısı yazılmaz.
13. **Devir.** Yeni dönem devri, sayım oturumu ile karıştırılmaz; devir `10-STOK-VE-DEPO.md` işidir.
14. **Muhasebe etkisi.** Noksan ve fire gider yazılır; fazla gelir/gider düzeltmesi olarak yazılır.
    Kayıt `06-MUHASEBE-MOTORU.md` hazır olduğunda fişe dönüşür; bu modül fiş yazmaz.
15. **Yetki.** Barkod üretimi/etiket `Policies.Operations`; sayım açma ve sayma `Policies.Operations`;
    oturum kapatma ve fark onayı `Policies.Operations` + `Policies.Accounting`
    (`server/YesLojistik.Api/Auth/Policies.cs:8-17`).
16. **Ayna ve lisans.** Ayna açıkken yazma engellenir; lisans dolduysa salt okunur. **Dikkat:**
    `MirrorWriteGuard` yalnız kendi listesindeki yolları koruyor
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`); `/api/inventory-counts`,
    `/api/stock-transfers`, `/api/stock-labels`, `/api/stock-locations` ve `/api/mobile/inventory-counts`
    bu listede **yoktur** ve eklenmelidir. Aksi hâlde ayna modunda sayım kaydı yazılır ve sonraki
    senkronda kaybolur. Ayrıca güvenlik açısından mobil sayım uçları, guard'ın mobil muafiyet
    kurallarıyla birlikte değerlendirilmelidir.

## 6. Veri modeli

Dört yeni tablo (stok tarafı `10-STOK-VE-DEPO.md` ile birlikte) ve sayım tarafında iki tablo. Yalnız
ekleme; migration kuralı `01-ORTAK-SARTNAME.md:22-23`.

**`StockItem` alanına eklenenler (boş olabilir):** `Barcode` (metin 40, tekil indeks, `is_deleted =
false` filtresi), `QrPayload` (metin 200), `TrackSerial` (bool), `TrackLot` (bool), `ShelfLifeDays`
(sayı), `DefaultLocationId` (int?).

**`StockLocation`** (depo bölümü / raf) — Id, WarehouseId, Code (metin 30, ör. `A-03-2`),
Name (100), Barcode (40, tekil), IsActive (bool), Note (200).

**`StockLot`** — Id, StockItemId, LotNo (metin 40), ProductionDate (tarih?), ExpiryDate (tarih?),
WarehouseId, LocationId?, RemainingQuantity (sayı 4), UnitCost (para), Note (200). İndeks:
`(StockItemId, LotNo)`.

**`StockSerial`** — Id, StockItemId, SerialNo (metin 60, tekil), LotId?, Status (enum `SerialStatus`:
InStock, Reserved, Delivered, Returned, Scrapped), WarehouseId?, LocationId?, InDate (tarih),
OutDate (tarih?), Note (200).

**`InventoryCountSession`** — Id, SessionNo (metin 20, tekil), WarehouseId, Kind (enum
`CountKind`: Blind, Documented, Cyclic), Status (enum `CountStatus`: Open, Counting, Closed,
Cancelled), StartedAt, StartedBy (metin 100), ClosedAt?, ClosedBy?, SnapshotAt, LocationFilter?,
TotalLines (sayı), CountedLines (sayı), DiffLines (sayı), DiffAmount (para), Note (500),
ApprovedBy? (metin 100), ApprovedAt?.

**`InventoryCountLine`** — SessionId, StockItemId, LocationId?, LotId?, SystemQuantity (sayı 4),
CountedQuantity (sayı 4), DiffQuantity (sayı 4), UnitCost (para), DiffAmount (para),
Reason (enum `CountReason`: CountingError, Loss, Scrap, Found, Other), Status (enum
`CountLineStatus`: Pending, Counted, Approved, Rejected), CountedAt?, CountedBy (metin 100),
SerialNos (metin 500), Note (200).

**`StockTransfer`** — Id, TransferNo (20, tekil), FromWarehouseId, ToWarehouseId, Date,
VehicleId?, Status (enum `TransferStatus`: Draft, Posted, Cancelled), Note (300), PostedBy.

**`StockTransferLine`** — TransferId, StockItemId, Quantity (sayı 4), LotId?, SerialNos (metin 500),
UnitCost (para).

**`StockMovement`** (`10-STOK-VE-DEPO.md` ile ortak) — `SourceType` enum'una `InventoryCount`,
`Transfer`, `Production`, `Purchase`, `Sale` değerleri; `SourceId` ile bağ. Bu modül yalnız
`InventoryCount` ve `Transfer` kaynaklarını üretir.

Yapılandırma: yeni `DbSet` satırları `AppDbContext.cs:10-43` düzenine, model yapılandırması
`AppDbContext.cs:147-167` örneğine (uzunluk, tekil indeks, `SetNull`/`Restrict` silme davranışı,
`is_deleted = false` filtreli tekil indeks) uygun yazılır.

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/stock-items/by-barcode/{code}` | — | `StockItemDto` (+ lot/seri) | oturum |
| POST | `/api/stock-items/{id}/barcode` | `{ barcode, type }` | `StockItemDto` | Operations |
| GET | `/api/stock-labels/{id}` | type, size, copies | PDF | oturum |
| POST | `/api/stock-labels/bulk` | `{ ids[], type, size }` | PDF | Operations |
| GET | `/api/stock-locations` | warehouseId, search | `List<StockLocationDto>` | oturum |
| POST/PUT/DELETE | `/api/stock-locations[/{id}]` | `StockLocationSaveRequest` | `StockLocationDto` | Operations |
| GET | `/api/stock-lots` | itemId, warehouseId, expiringInDays | `PagedResult<StockLotDto>` | oturum |
| GET | `/api/stock-serials` | itemId, lotId, status, search | `PagedResult<StockSerialDto>` | oturum |
| GET | `/api/stock-serials/{serialNo}/trace` | — | `List<SerialTraceDto>` | oturum |
| GET | `/api/inventory-counts` | page, pageSize, warehouseId, status, kind, from, to | `PagedResult<InventoryCountSessionDto>` | oturum |
| POST | `/api/inventory-counts` | `InventoryCountStartRequest` | `InventoryCountSessionDto` | Operations |
| GET | `/api/inventory-counts/{id}` | — | `InventoryCountSessionDto` (+ satırlar) | oturum |
| PUT | `/api/inventory-counts/{id}/lines` | `InventoryCountLineSaveRequest[]` | `InventoryCountSessionDto` | Operations |
| POST | `/api/inventory-counts/{id}/lines/{lineId}/approve` | `{ reason, note }` | `InventoryCountLineDto` | Accounting |
| POST | `/api/inventory-counts/{id}/close` | `{ note, approve }` | `InventoryCountSessionDto` | Accounting |
| POST | `/api/inventory-counts/{id}/cancel` | `{ reason }` | `InventoryCountSessionDto` | Accounting |
| GET | `/api/inventory-counts/{id}/diff` | — | `List<InventoryCountLineDto>` | oturum |
| GET | `/api/inventory-counts/{id}/export` | — | xlsx | oturum |
| GET | `/api/stock-transfers` | page, pageSize, warehouseId, status, from, to | `PagedResult<StockTransferDto>` | oturum |
| POST | `/api/stock-transfers` | `StockTransferSaveRequest` | `StockTransferDto` | Operations |
| POST | `/api/stock-transfers/{id}/cancel` | `{ reason }` | `StockTransferDto` | Operations |
| GET | `/api/mobile/inventory-counts/{id}` | — | mobil için daraltılmış liste | Operations |
| POST | `/api/mobile/inventory-counts/{id}/scan` | `{ barcode, quantity, lotNo?, serialNo? }` | `InventoryCountLineDto` | Operations |

Mobil uçları çevrimdışı kuyrukla uyumludur: her istek `Idempotency-Key` başlığı taşır
(`mobile/src/lib/outbox.ts:11-12` deseni) ve aynı istek iki kez gelirse **tek satır** yazılır.

## 8. Yetki, onay ve denetim izi

- **Rol matrisi.** Yönetici: tam. Operasyon: barkod/etiket üretir, sayım açar, sayar, transfer yapar;
  oturum kapatamaz. Muhasebe: oturum kapatır, fark onaylar, transferi iptal eder. Şoför: yalnız mobil
  sayım ekranına erişir (kendi atandığı depo). Depo personeli için yeni bir rol **önerilmez**; mevcut
  `Operations` rolü yeterlidir (`Enums.cs:3`).
- **Maker-checker.** Eşiği aşan farkta oturum kapanışı iki onay ister (§5 kural 8). Onaylayan kişi
  sayımı yapan kişi olamaz; aynı kullanıcı hem sayıp hem onaylarsa kayıt "kendi onayı" olarak
  işaretlenir ve raporda görünür.
- **Denetim izi.** `AuditTrail` otomatik çalışır
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`). Etiketler `AuditTrail.cs:83-106`
  içine eklenir: `InventoryCountSession s => $"{s.SessionNo} sayımı"`,
  `StockTransfer t => $"{t.TransferNo} transferi"`. Alan adları `AuditTrail.cs:23-52` sözlüğüne
  Türkçe eklenir (ör. `CountedQuantity` → "Sayılan", `DiffQuantity` → "Fark"). Sözlükte olmayan alan
  ham adla görünür; bu istenmez.
- **Kim saydı.** Her satırda `CountedBy` ve `CountedAt` tutulur; raporda "kim, ne zaman, hangi rafı"
  görünür. Bu, sayım farkı tartışmalarında tek dayanaktır.
- **Etiket üretimi loglanır mu?** Etiket üretimi kayıt değiştirmez, bu yüzden denetim iznine yazılmaz;
  yalnız barkod ataması yazılır.

## 9. Kabul kriterleri

1. Barkod okutulduğunda doğru stok kartı **1 işlemde** açılır (okuma → kart); arama yapılmaz.
2. Etiket çıktısı seçilen boyutta **taşma yapmadan** basar; 50×30 mm etikette stok adı en çok 2 satır
   kısaltılır ve tam ad başlıkta (tooltip) görünür.
3. Sayım oturumu 1440×900'de **en az 14 satır** gösterir; üst kısım **≤260px**.
4. Kör sayımda sistem miktarı ekranda **hiç görünmez**; DOM'da da yoktur (kaynakta gizleme değil,
   göndermeme).
5. 100 kalemlik sayımda telefonda çevrimdışı 100 okutma yapılır, ağ gelince **100'ü de** sunucuya
   ulaşır; hiçbiri iki kez yazılmaz.
6. Aynı barkod iki kez okutulursa miktar **artırılır** (iki satır açılmaz) ve ekranda "+1" geri
   bildirimi görünür.
7. Fark tutarı eşiği aşarsa kapatma düğmesi ikinci onay ister; onaysız kapatma reddedilir ve neden
   yazar.
8. Kapanışta noksan çıkış, fazla giriş hareketi üretir; stok bakiyesi fark kadar değişir ve hareket
   listesinde "Sayım" kaynağıyla görünür.
9. Transfer yarıda kalmaz: çıkış yazıldıysa giriş de yazılır; hata hâlinde ikisi de yazılmaz.
10. Süresi geçmiş lot listede kırmızı **ve** "süresi geçti" metniyle görünür (yalnız renk yok).
11. Telefonda (390×844) yatay kaydırma yok; barkod alanı odakta kalır ve Enter ile satır ekler.
12. Excel dışa aktarım sayım farkı listesini Türkçe başlıklarla verir
    (`VehiclesController.cs:57-79` kalıbı).

## 10. Testler

**Sunucu (birim).** `server/YesLojistik.Tests/Unit/InventoryCountTests.cs`:
- Fark hesabı: sayılan 97, sistem 100 → −3 ve tutar = 3 × birim maliyet.
- Yuvarlama: 1,005 kg → 1,005; tutar 2 hane.
- Eşik kontrolü: fark 4.999,99 TL → onay istemez; 5.000,00 TL → ister.
- Snapshot: oturum açıldıktan sonra yapılan giriş farkı değiştirmez.
- Mükerrer barkod reddi ve hata mesajı içeriği.

**Sunucu (entegrasyon).** `server/YesLojistik.Tests/Integration/InventoryTests.cs`
(`FleetTests.cs:18-32` kurulum deseni):
- Stok + barkod oluştur → `by-barcode` ucu doğru kartı döner.
- Sayım oturumu aç → satır kaydet → kapat → stok bakiyesi ve hareket kaydı doğru.
- Eşik üstü farkta onaysız kapatma 400 döner (Türkçe mesaj).
- Transfer: çıkış ve giriş aynı işlemde; iptal ters kayıt üretir; stok eski hâline döner.
- Seri takipli stokta seri zorunluluğu: serisiz satır reddedilir.
- Aynı `Idempotency-Key` ile iki kez gönderilen mobil okutma tek satır bırakır.
- Yetki: operasyon rolü oturum kapatamaz (403).
- Ayna açıkken `POST` reddedilir (`LegacyMirrorTests.cs` deseni).

**Panel (e2e).** `client/e2e/inventory.spec.ts`:
- Barkod listesi, etiket önizleme, PDF indirme bağlantısı çalışır.
- Sayım oturumu açılır, satır sayılanı girilir, fark görünür, kapatılır.
- Kör sayımda sistem miktarı ekranda görünmez (metin aramasıyla doğrulanır).
- Telefon görünümü: `client/e2e/mobile.spec.ts` deseni; yatay kaydırma yok.
- Yeni görünüm: `client/e2e/helpers.ts:44-46` `useNewUi(page)` ile ikinci koşu.

**Mobil.** `mobile` tarafında tip kontrolü `npm run typecheck` ile geçer; sayım kuyruğu için birim
test eklenir (kuyruk sırası, idempotency anahtarı üretimi, ağ gelince gönderim).

Test silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:24`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Barkod/QR alanları, etiket üretimi (PDF) | 2 |
| Barkod okuma (panel + mobil kamera), odak yönetimi | 2 |
| Raf/adres (`StockLocation`) tanım ve ekranları | 1,5 |
| Seri ve lot takibi (tablolar, ekran, izlenebilirlik) | 3 |
| Sayım oturumu tabloları ve hesap motoru | 2,5 |
| Sayım ekranları (liste, oturum, fark paneli, kapatma onayı) | 3,5 |
| Transfer ekranı ve ters kayıt | 1,5 |
| Stok/fark hareketleri ve muhasebe hazırlığı | 2 |
| Mobil sayım ekranı + çevrimdışı kuyruk türü | 3 |
| Testler (birim + entegrasyon + e2e + mobil) | 3 |
| Dokümantasyon, denetim etiketleri, kabul turu | 1 |
| **Toplam** | **25 kişi-gün** |

Bağımlılıklar (önce bitmeli):
- **`10-STOK-VE-DEPO.md` — zorunlu ön koşul.** Stok kartı, depo ve maliyet yöntemi olmadan bu modül
  uygulanamaz.
- `06-MUHASEBE-MOTORU.md` — sayım farkının fişe dönüşmesi.
- `12-SATIN-ALMA.md` — mal kabulde barkodla giriş, "belgeli sayım" türü.
- `20-URETIM-RECETE.md` — üretim çıkış/girişinin lot ve seri ile bağlanması.
- `29-MOBIL-VE-DISA-ACILIM.md` — mobil yönetici ekranlarının genel çerçevesi.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sayım sırasında stok değişir, fark yanlış çıkar | Snapshot + "sayım anı" gösterimi | Oturum iptal edilir, yenisi açılır |
| Personel sistem miktarını görüp uydurur | Kör sayım varsayılan; sistem miktarı gizlenir | Oturum türü değiştirilir, yeniden sayılır |
| Telefonda internet yok, sayım kaybolur | Çevrimdışı kuyruk + idempotency (`outbox.ts:9-13`) | Kuyruk elle gönderilir, mükerrer yazılmaz |
| Barkod çakışması / yanlış etiket | Tekil indeks; çakışmada kayıt reddi | Etiket iptal edilir, yeni barkod atanır |
| Fark onayı atlanır | Eşik + ikinci onay zorunlu | Kapanış iptal edilir, satır onaya gönderilir |
| Raf kodları düzensiz (A-1, A1, a1) | Kod normalizasyonu (büyük harf, tire) ve tekil indeks | Kodlar toplu düzeltme ekranıyla düzeltilir |
| Kamera izni verilmez | Elle kod girme alanı her zaman görünür | Terminal/klavye girişi kullanılır |
| Seri takibi yanlış kurgulanır (adette seri) | Stok kartında takip türü açıkça seçilir; rapor "seri takipli ama serisiz hareket" listeler | Takip ayarı kapatılır, geçmiş korunur |

**doğrulanacak:**
1. **Barkod simbologları ve standartları:** hangi ürün grubunda EAN-13, hangisinde Code-128/QR
   kullanılacağı; barkod numarasının kime/neye göre verileceği (GTIN mi, firma içi kod mu). Kaynak:
   kullanıcı + tedarikçi etiketleri.
2. **QR içerik biçimi:** `YES|<kod>|<lot>|<miktar>|<depo>` önerisi kullanıcı onayına bağlıdır; farklı
   bir alan sırası istenebilir.
3. **El terminali modeli ve tarayıcı davranışı:** terminal barkodu klavye gibi mi gönderiyor, özel SDK
   mı gerekiyor, Android sürümü ne. Kaynak: cihaz üreticisi belgesi.
4. **Etiket yazıcı modeli ve dil** (ZPL/EPL/ESC-POS), etiket boyutları. Biz PDF üretiyoruz; doğrudan
   yazıcıya gönderim gerekiyorsa ek iş çıkar.
5. **Luca'nın barkod/sayım ekranları** ve depo-bölüm seviyesi sayısı — demo erişimi veya ekran
   görüntüsü.
6. **Sayım farkı eşiği ve neden listesi** — kullanıcı ve mali müşavir kararı.
7. **Noksan/fire/fazla kaydının vergisel niteliği** (hangi durumda gider yazılır, hangi belge
   gerekir) — mevzuat yorumu yapılmadı; mali müşavir teyidi gerekir.
8. **Mobil sayımda çok kullanıcılı eşzamanlılık:** iki kişi aynı rafı sayarsa beklenen davranış
   (uyarı mı, birleştirme mi) — kullanıcı kararı.
9. **Sayım modülünün ayna modundaki durumu:** pratikortam aynası açıkken sayım yapılabilmeli mi
   (fiziki sayım panelin kendi işi olduğu için "evet" mantıklı görünüyor), yoksa tüm yazma kapalı mı
   kalmalı — kullanıcı kararı. Guard liste tabanlı olduğu için bu karar ekleme sırasını belirler
   (`MirrorWriteGuard.cs:14-18`).

Sonraki belgeyle bağlantı: `10-STOK-VE-DEPO.md` stok kartı, depo ve maliyet yöntemini; `12-SATIN-ALMA.md`
mal kabulde barkodlu girişi; `20-URETIM-RECETE.md` üretim giriş/çıkışının lot-seri bağını;
`22-ITHALAT-IHRACAT-DOVIZ.md` ithal malın lot ve maliyet tarafını bu modüle bağlar.
