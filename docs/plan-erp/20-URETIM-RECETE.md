# 20 — Üretim ve Reçete

## 1. Amaç ve kapsam

Bu modül, **bir ürünün başka maddelerden üretilmesini** kayıt altına alır: hangi mamul, hangi
yarı mamulden ve hangi hammaddeden, ne kadar tüketilerek üretilir. Üç kavram vardır:

- **Reçete (ürün ağacı):** bir mamulün içindeki malzeme listesi ve miktarları.
- **Üretim emri:** "şu tarihte, şu kadar üret" talimatı ve bunun durumu.
- **Operasyon / iş merkezi:** üretimin hangi tezgâhta, hangi sürede yapıldığı.

Modülün çözdüğü işler: malzeme ihtiyacını önceden görmek (MRP temel seviye), üretim emrini
başlatıp bitirmek, üretimde tüketilen malzemeyi stoktan düşmek, üretilen mamulü stoğa eklemek, işçilik
ve genel gideri ekleyip **üretim maliyetini** bulmak, fire ve yan ürünü ayrı göstermek.

### Kapsam kararı: nakliye firması için bu modül ne zaman gerekli?

Dürüst cevap: **çoğu nakliye firması için hiç gerekli değildir.** Nakliye işi bir hizmet işidir;
satılan şey taşımadır, üretilen şey yoktur. Bugünkü panelde sevkiyat, araç, yakıt, bakım ve cari
vardır; bunlar hizmetin maliyetini zaten hesaplar. Bir nakliye firmasının "reçete" ihtiyacı ancak
şu üç durumdan biri ortaya çıkarsa doğar:

1. **Kendi atölyesi varsa.** Araç bakım-onarım atölyesi, dorse imalatı, karoser yapımı, boya-kumlama
   gibi işler yapılıyorsa (ör. dorseden kasa üretimi, branda dikimi) bu işler reçeteye girer: sac,
   profil, boya, işçilik, elektrik.
2. **Satılacak fiziksel ürün üretiyorsa.** Ör. palet, sandık, ambalaj, beton blok, gıda ürünü.
3. **Yarı mamul montaj yapıyorsa.** Ör. hazır parçalardan aydınlatma seti, kayış seti gibi bakım
   kitleri hazırlamak.

Bu üç durumdan hiçbiri yoksa modül **kapsam dışıdır** ve açılmamalıdır; açılırsa kullanıcıya boş
ekran gösterir, veri girilmez, güven kaybeder. Bu nedenle modül `03-KAPSAM-VE-KONUMLANDIRMA.md`
paketlerinde **"koşullu paket"** olarak yer alır: yalnız kendi atölyesi/üretimi olan müşteriye açılır.

Kapsam dışı olanlar:

- **Tam MRP (kapasite planlama, çizelgeleme, ileri seviye optimizasyon) kapsam dışı.** Bu doküman
  yalnız "temel seviye" ihtiyaç hesabını tarif eder (§5, kural 5).
- **Muhasebe fişi üretmek kapsam dışı.** `06-MUHASEBE-MOTORU.md` işidir.
- **Kalite kontrol, izlenebilirlik sertifikası, ISO akışları kapsam dışı.**
- **Makine bakım planı kapsam dışı** — o `19-SABIT-KIYMET.md` ve mevcut bakım ekranının işidir.

## 2. Luca'daki karşılığı

`02-LUCA-ENVANTERI.md:37` birebir şunu yazıyor: Luca Net'te **"sürükle-bırak üretim akış diyagramı,
paket uygulamaları ve üretim reçetesi, akışa göre ürün maliyetlendirme"** vardır. Ayrıca
`02-LUCA-ENVANTERI.md:63` Luca Koza'da **"üretim yönetimi ve planlama: malzeme, tedarik, ekip,
vardiya, üretim saati, üretim biçimi"** başlığını sayıyor. Kaynak: <https://luca.com.tr/> ve ürün
sayfaları (`02-LUCA-ENVANTERI.md:11-12`).

Buradan çıkan tasarım kararı: bizim ekranımızda da **sürükle-bırak akış diyagramı** olacak. Akış,
kutulardan oluşan bir şerittir (Hazırlık → Kesim → Montaj → Boya → Paketleme gibi); her kutu bir
operasyondur ve sırası elle sürüklenerek değiştirilir. Diyagram, reçetenin **görsel hâlidir**;
kaydettiği şey aynı veridir (§4/E2, §6 `RecipeOperation`).

**doğrulanacak:** Luca'nın üretim ekranının içeriği, akış kutusunda hangi alanların durduğu, akışın
kaç seviye derinleştiği, "paket uygulamaları" ile ne kastedildiği. Kaynak sitede yalnız özellik
cümlesi var; ekran görüntüsü/demo erişimi gerekir. Ayrıca Luca'nın "üretim biçimi" alanının hangi
seçenekleri sunduğu **doğrulanacak**.

## 3. Bizde bugün

Bugün panelde **üretim, reçete, mamul, yarı mamul, iş merkezi ve vardiya kavramları yoktur.**
Kanıtlar:

- **Üretim tablosu yok.** `server/YesLojistik.Core/Entities/` altında `Recipe`, `ProductionOrder`,
  `ProductionOperation`, `WorkCenter`, `Shift` adlı sınıf yok;
  `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içindeki `DbSet` listesinde de
  karşılıkları yok.
- **Stok tablosu yok.** Üretimin bağlanacağı stok kartı bugün hiç yok; `10-STOK-VE-DEPO.md` yazılıyor.
  Yani bu modül **stok modülü olmadan uygulanamaz**.
- **Maliyet kavramı sefer bazlı.** Bugünkü kâr hesabı sevkiyat üzerinden yürüyor: sevkiyat maliyeti
  araç maliyeti + giderlerdir (`docs/AGENTS.md` §5: kazanç hesabı KDV hariç, `TripProfit`). Mamul
  maliyeti diye bir kavram yok.
- **Gider tarafı hazır ama üretim bağı yok.** `server/YesLojistik.Core/Entities/Expense.cs:5-7`
  kategori, tutar, tarih tutuyor; `Expense.cs:49-51` dönemsel gider alanları var. Üretim işçiliği ve
  genel gideri bu yapıya benzer biçimde yazılacak; ancak `Expense`'te ne üretim emri ne de mamul
  bağı (`ProductionOrderId`) bugün var.
- **Personel ve işçilik verisi var.** `server/YesLojistik.Core/Entities/Staff.cs` ve
  `Enums.cs:48` (`StaffTransactionKind`: Advance, Bonus, SalaryPayment) personel ödemelerini tutuyor.
  İşçilik maliyeti buradan beslenecek ama saat ücreti ve puantaj alanları bugün yok.
- **Vardiya yok.** `Enums.cs` içinde vardiya, üretim saati, iş merkezi ile ilgili hiçbir enum yok
  (`Enums.cs:1-63` tamamı okundu).
- **Araç/makine kıymeti.** Makine tanımı `19-SABIT-KIYMET` modülüyle gelecek; bugün
  `server/YesLojistik.Core/Entities/Vehicle.cs:5-41` yalnız araçları tutuyor.
- **Ekranlar.** `client/src/pages/` altındaki 33 sayfada üretim/reçete/mamul adlı dosya yok; menüde
  (`client/src/lib/nav.ts:19-114`) üretim grubu yok. Sekmelerde de yok
  (`client/src/lib/sections.ts:10-39`).
- **Rotalar.** `client/src/App.tsx:80-118` içindeki rota listesinde üretimle ilgili bir yol yok.
- **Ortak parçalar hazır.** `PageShell`, `DataTable`, `FilterPanel`, `Modal` gibi parçalar bugün
  kullanımda (`client/src/pages/VehicleExpensesPage.tsx:10-13`); üretim ekranları bunları kullanacak,
  yeni görsel dil icat edilmeyecek. **Not:** `docs/plan/01-ORTAK-SARTNAME.md:147-148` "PageShell kodda
  yok" diyor; bu ifade artık gerçek dışıdır (dosya vardır ve kullanılmaktadır).

Eksik listesi: stok modülü (ön koşul), reçete, üretim emri, operasyon, iş merkezi, vardiya, maliyet
motoru, fire/yan ürün, stok ve muhasebe hareketi, ekranlar, API, yetkiler, testler.

## 4. Hedef ekranlar ve alanlar

**E1. Reçeteler listesi — `/uretim/receteler`**
`FilterBar`: arama (kod, mamul adı), mamul grubu, durum (Taslak/Aktif/Arşiv), "maliyeti hesaplanmamış".
`DataTable` sütunları: Kod, Mamul, Versiyon, Bileşen sayısı, Operasyon sayısı, Birim maliyet, Durum,
Son değişiklik. `SumStrip`: reçete sayısı, toplam bileşen, ortalama maliyet.

**E2. Reçete kartı (sekmeli tam sayfa)**
Sekmeler: **Bileşenler**, **Akış (diyagram)**, **Operasyonlar**, **Maliyet**, **Kullanıldığı emirler**.

*Bileşenler sekmesi alanları:*

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Bileşen (stok) | seçim | evet | `10-STOK-VE-DEPO.md` stok kartlarından |
| Miktar | sayı (4 hane) | evet | 0'dan büyük |
| Birim | seçim | evet | Stok kartından gelir, değiştirilemez |
| Kayıp/fire oranı (%) | sayı | hayır | Tüketim hesabına eklenir |
| Zorunlu mu | anahtar | evet | Varsayılan açık |
| Not | metin (200) | hayır | |

*Akış sekmesi:* sürükle-bırak diyagram. Her kutu bir operasyon; kutu içinde operasyon adı, iş merkezi
ve süre görünür. Kutular arası sıra sürükleyerek değişir; sıralama kaydedilir. Kutulara çift tıklama
operasyon formunu açar. Diyagram telefonda **dikey liste** olarak gösterilir (sürükleme yok, yukarı/aşağı
düğmeleri var).

*Operasyonlar sekmesi alanları:*

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Sıra | sayı | evet | Diyagramdan gelir |
| Ad | metin (80) | evet | Ör. "Kesim", "Montaj" |
| İş merkezi | seçim | evet | Tezgâh/atölye |
| Kurulum süresi (dk) | sayı | hayır | |
| Birim süre (dk/adet) | sayı | evet | 0'dan büyük |
| Ekip (kişi) | sayı | hayır | Varsayılan 1 |
| Vardiya | seçim | hayır | Vardiya tanımından |
| Dışarıda mı (fason) | anahtar | evet | Açıksa tedarikçi zorunlu |
| Tedarikçi | seçim | koşullu | Fason açıksa zorunlu |
| Saat ücreti (TL/saat) | para | hayır | Boşsa iş merkezinin ücreti |

**E3. Üretim emirleri listesi — `/uretim/emirler`**
Sütunlar: Emir no, Mamul, Reçete, Planlanan, Üretilen, Durum, Planlanan başlangıç, Gerçekleşen
bitiş, Birim maliyet, Fark (%). Düğmeler: Yeni Emir, Başlat, Bitir, İptal, Yazdır (iş emri fişi).
Süzgeç: durum, mamul, tarih aralığı, "geciken".

**E4. Üretim emri kartı**
Üstte özet şerit: mamul, miktar, durum, planlanan/gerçekleşen maliyet, fark. Sekmeler:
**Malzeme** (reçeteden gelen ihtiyaç + gerçekleşen tüketim), **Operasyonlar** (başlama/bitiş saati,
gerçekleşen süre), **Fire / Yan ürün**, **Maliyet**, **Hareketler**.

**E5. İş merkezleri ve vardiyalar — `/uretim/tanimlar`**
İş merkezi alanları: Kod, Ad, Tür (Makine/El/Atölye), Bağlı kıymet (`FixedAsset`), Kapasite
(birim/saat), Saat ücreti, Günlük çalışma saati, Aktif. Vardiya alanları: Ad, Başlangıç, Bitiş,
Mola (dk), Hafta sonu çalışır mı, Saat ücreti çarpanı (ör. gece 1,5 — **doğrulanacak**).

## 5. İş kuralları

1. **Reçete versiyonlanır.** Yayınlanmış (Aktif) reçete değiştirilmez; yeni versiyon açılır. Bu, geçmiş
   emirlerin maliyetinin sonradan değişmemesi içindir.
2. **Tüketim = miktar × (1 + fire oranı).** Örnek (uydurma): 100 adet mamul, bileşen 2,5 kg/adet, fire
   %4 → 100 × 2,5 × 1,04 = 260,00 kg. Sonuç stok birimine göre yuvarlanır (kg'da 3 hane, adette tam
   sayı).
3. **Malzeme ihtiyacı (MRP temel seviye).** İhtiyaç = planlanan miktar × reçete miktarı × (1 + fire).
   Eldeki stok çıkarılır; kalan "eksik" olarak listelenir. Rezerve ve yoldaki (sipariş verilmiş,
   gelmemiş) miktarlar ayrı sütunda gösterilir. **Bu hesap tek seviyelidir**; yarı mamulün alt
   seviyelerine inilmez — o tam MRP'dir ve kapsam dışıdır (§1).
4. **Yuvarlama kuralı.** Miktarlar stok birimine göre: adet tam sayı, kg/litre 3 hane, metre 2 hane.
   Para `Money.Round` ile 2 hane (`server/YesLojistik.Core/Domain/Money.cs:6`).
5. **Durum geçişleri:** `Taslak → Planlandı → Üretimde → Tamamlandı`, ayrıca her aşamadan `İptal`.
   Geri dönüş yalnız `Planlandı → Taslak`. `Tamamlandı` emir değiştirilemez; düzeltme ters kayıtla
   yapılır.
6. **Maliyet üç parçalıdır.**
   - **Malzeme:** tüketilen miktar × stok maliyet yöntemi (FIFO/ortalama — `10-STOK-VE-DEPO.md`).
   - **İşçilik:** `(kurulum + birim süre × miktar) / 60 × saat ücreti × ekip` + varsa vardiya çarpanı.
   - **Genel gider:** iş merkezi saat ücreti × gerçekleşen saat (dağıtım anahtarı kullanıcı ayarıdır).
7. **Fire.** Fire miktarı ayrı satırda tutulur; maliyeti mamule yüklenir (fire, mamul maliyetini
   artırır), ayrı gider yazılmaz.
8. **Yan ürün.** Yan ürün çıkıyorsa kendi stok kartına girer; maliyetten düşülecek pay (%) reçetede
   tanımlıdır. Ör. sac artığı → hurda stoğu.
9. **Fason operasyon.** Dışarıda yapılan operasyonun bedeli tedarikçi borcuna yazılır; üretim
   maliyetine "dış hizmet" olarak eklenir.
10. **Stok hareketi.** Üretim başlarken malzeme **rezerve**; bitirirken **çıkış**. Mamul bitişte
    **giriş**. Taslak emir stok hareketi üretmez; iptal edilen emirde tüketim ters kayıtla geri alınır.
11. **Muhasebe hareketi.** `06-MUHASEBE-MOTORU.md` hazır olduğunda: yarı mamul/mamul stok artışı,
    hammadde çıkışı, işçilik ve genel gider yansıtması. Modül bu kayıtları **hazırlar**, fişi yazmaz.
12. **Maliyeti kilitli emir.** Tamamlanmış emrin maliyeti kilitlenir; sonradan stok maliyeti
    değişirse emir maliyeti değişmez, fark raporlanır.
13. **Yetki.** Reçete ve emir açma/düzenleme `Policies.Operations`; emir tamamlama (stok hareketi
    doğurduğu için) `Policies.Operations` + `Policies.Accounting`; maliyet kilidi açma yalnız
    `Policies.Accounting` (`server/YesLojistik.Api/Auth/Policies.cs:8-17`).
14. **Ayna ve lisans.** Ayna açıkken yazma engellenir, lisans dolduysa salt okunur. **Dikkat:**
    `MirrorWriteGuard` yalnız kendi listesindeki yolları koruyor
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`); `/api/recipes`,
    `/api/production-orders`, `/api/work-centers` ve `/api/shifts` bu listede **yoktur** ve
    eklenmelidir. Aksi hâlde ayna modunda üretim kaydı yazılır ve sonraki senkronda kaybolur.

## 6. Veri modeli

Dört yeni tablo; mevcut tablolara yalnız boş olabilen ekleme. Migration kuralı:
`01-ORTAK-SARTNAME.md:22-23`.

**`Recipe`** — Id, Code (metin 20, tekil), Name (150), StockItemId (mamul, zorunlu), Version (sayı),
Status (enum `RecipeStatus`: Draft, Active, Archived), OutputQuantity (sayı 4), OutputUnit (metin 10),
OverheadRate (para), Note (500), ValidFrom (tarih?), ValidTo (tarih?).

**`RecipeItem`** (bileşen) — RecipeId, StockItemId, Quantity (sayı 4), Unit, ScrapRate (sayı 5,2),
IsRequired (bool), Note (200), LineNo (sayı).

**`RecipeOperation`** — RecipeId, LineNo (sıra), Name (80), WorkCenterId, SetupMinutes (sayı 2),
MinutesPerUnit (sayı 3), CrewSize (sayı), ShiftId?, IsSubcontracted (bool), SupplierId?,
HourlyRate? (para), Note (200).

**`ProductionOrder`** — Id, OrderNo (metin 20, tekil), RecipeId, RecipeVersion (sayı), StockItemId,
PlannedQuantity (sayı 4), ProducedQuantity (sayı 4), Status (enum `ProductionOrderStatus`:
Draft, Planned, InProgress, Completed, Cancelled), PlannedStart (tarih), PlannedEnd (tarih?),
ActualStart (tarih/saat?), ActualEnd (tarih/saat?), MaterialCost, LaborCost, OverheadCost,
SubcontractCost, TotalCost (para), UnitCost (para), ScrapQuantity (sayı 4), ScrapReason (200),
IsCostLocked (bool), Note (500).

**`ProductionOrderLine`** (tüketim ve çıktı) — ProductionOrderId, Kind (enum: Consumption, Output,
Scrap, ByProduct), StockItemId, PlannedQuantity, ActualQuantity (sayı 4), UnitCost (para), Amount
(para), WarehouseId?.

**`ProductionOperationLog`** — ProductionOrderId, RecipeOperationId, WorkCenterId?, ShiftId?,
StartedAt, FinishedAt (tarih/saat?), ActualMinutes (sayı 3), CrewSize (sayı), HourlyRate (para),
Amount (para), OperatorName (100).

**`WorkCenter`** — Id, Code (20, tekil), Name (100), Kind (enum `WorkCenterKind`: Machine, Manual,
Workshop), FixedAssetId? (`19-SABIT-KIYMET.md`), CapacityPerHour (sayı 4), HourlyRate (para),
DailyHours (sayı 4), IsActive (bool).

**`Shift`** — Id, Name (50), StartTime (saat), EndTime (saat), BreakMinutes (sayı), WorksWeekend
(bool), RateMultiplier (sayı 4,2), IsActive (bool).

**Eklenen sütunlar:** `Staff.HourlyRate` (para, boş olabilir) — işçilik maliyeti için.
`Expense.ProductionOrderId` (int?, boş olabilir) — üretim gideri bağı. `AppDbContext` içine yeni
`DbSet` satırları `AppDbContext.cs:10-43` düzenine uygun eklenir; model yapılandırması
`AppDbContext.cs:147-167` örneğine göre yazılır (uzunluk, indeks, silme davranışı).

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/recipes` | page, pageSize, search, status, sort, desc | `PagedResult<RecipeDto>` | oturum |
| GET | `/api/recipes/{id}` | — | `RecipeDto` (bileşen + operasyon) | oturum |
| POST | `/api/recipes` | `RecipeSaveRequest` | `RecipeDto` | Operations |
| PUT | `/api/recipes/{id}` | `RecipeSaveRequest` | `RecipeDto` | Operations |
| POST | `/api/recipes/{id}/new-version` | `{ note }` | `RecipeDto` | Operations |
| DELETE | `/api/recipes/{id}` | — | 204 | Operations |
| PUT | `/api/recipes/{id}/flow` | `RecipeFlowRequest` (sıralı operasyon kimlikleri) | `RecipeDto` | Operations |
| GET | `/api/recipes/{id}/cost` | quantity | `RecipeCostDto` | oturum |
| GET | `/api/production-orders` | page, pageSize, search, status, from, to, overdue | `PagedResult<ProductionOrderDto>` | oturum |
| GET | `/api/production-orders/{id}` | — | `ProductionOrderDto` | oturum |
| POST | `/api/production-orders` | `ProductionOrderSaveRequest` | `ProductionOrderDto` | Operations |
| PUT | `/api/production-orders/{id}` | `ProductionOrderSaveRequest` | `ProductionOrderDto` | Operations |
| POST | `/api/production-orders/{id}/start` | `{ at }` | `ProductionOrderDto` | Operations |
| POST | `/api/production-orders/{id}/finish` | `ProductionOrderFinishRequest` | `ProductionOrderDto` | Operations |
| POST | `/api/production-orders/{id}/cancel` | `{ reason }` | `ProductionOrderDto` | Operations |
| POST | `/api/production-orders/{id}/operations/{logId}/complete` | `{ minutes, crew }` | `ProductionOrderDto` | Operations |
| GET | `/api/production-orders/{id}/mrp` | — | `List<MrpRowDto>` | oturum |
| GET | `/api/production-orders/{id}/cost` | — | `ProductionCostDto` | oturum |
| GET | `/api/work-centers` | — | `List<WorkCenterDto>` | oturum |
| POST/PUT/DELETE | `/api/work-centers[/{id}]` | `WorkCenterSaveRequest` | `WorkCenterDto` | Operations |
| GET | `/api/shifts` | — | `List<ShiftDto>` | oturum |
| POST/PUT/DELETE | `/api/shifts[/{id}]` | `ShiftSaveRequest` | `ShiftDto` | Operations |
| GET | `/api/production-orders/export` | liste süzgeçleri | xlsx | oturum |

`ProductionOrderFinishRequest`: `ProducedQuantity`, `ScrapQuantity`, `ScrapReason`, `WarehouseId`,
`Lines` (gerçekleşen tüketim satırları), `Note`. Yanıt `ProductionOrderDto` içinde maliyet kırılımı
(malzeme/işçilik/genel gider/fason) ve birim maliyet bulunur.

## 8. Yetki, onay ve denetim izi

- **Rol matrisi.** Yönetici: tam. Operasyon: reçete, emir, operasyon kaydı, emir başlat/bitir.
  Muhasebe: maliyet kilidi açma, rapor, maliyet düzeltmesi. Şoför: hiç erişemez.
- **Maker-checker.** Gerçekleşen tüketim, reçeteden **%20'den fazla** saparsa veya fire oranı
  %10'u geçerse bitirme işlemi ikinci onay ister (muhasebe onayı). Eşikler kullanıcı ayarıdır.
  Bu kontrol, stoktan sessizce fazla malzeme düşülmesini engeller.
- **Denetim izi.** `AuditTrail` otomatik çalışır (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).
  Etiketler `AuditTrail.cs:83-106` içine eklenir: `Recipe r => $"{r.Code} {r.Name}"`,
  `ProductionOrder po => $"{po.OrderNo} ({po.PlannedQuantity} adet)"`. Alan adları
  `AuditTrail.cs:23-52` sözlüğüne Türkçe eklenir (ör. `PlannedQuantity` → "Planlanan miktar",
  `TotalCost` → "Toplam maliyet"). Sözlükte olmayan alan ham adıyla görünür; bu istenmez.
- **Kim ne yaptı.** Operasyon tamamlama kaydında `OperatorName` ve `ReviewedBy` tutulur; üretimde
  hangi vardiyada kimin çalıştığı raporda görünür.
- **Gizli alanlar.** Maliyet kırılımı operasyon rolüne gösterilir mi sorusu bir ayardır; varsayılan
  **göster** (kullanıcı atölye kârını görmek ister), muhasebe saat ücretlerini gizleyebilir.

## 9. Kabul kriterleri

1. Reçete kartı 1440×900'de **en az 12 bileşen satırı** gösterir; üst kısım **≤260px**.
2. Akış diyagramında iki kutu **sürükle-bırak** ile yer değiştirir; kaydedilir; sayfa yenilendiğinde
   sıra korunur.
3. Telefonda (390×844) diyagram dikey listeye döner, **yatay kaydırma yok**, sıra düğmelerle değişir.
4. Reçeteden üretim emri **2 tıkla** açılır (reçete kartı → "Emir Aç"); reçete alanları hazır gelir.
5. MRP tablosu planlanan miktar için eksik/fazla/rezerve/yolda sütunlarını doğru gösterir; hesap
   kural 3'teki formülle birebir uyuşur.
6. 100 adet mamul, %4 fire, 2,5 kg/adet örneğinde ihtiyaç **260,000 kg** görünür.
7. Emir bitirildiğinde mamul stoğa girer, malzeme stoktan düşer; aynı emir ikinci kez bitirilemez
   ("Bu emir zaten tamamlandı." mesajı).
8. Maliyet kırılımı ekranda malzeme + işçilik + genel gider + fason olarak ayrı gösterilir; toplam ve
   birim maliyet satırı vardır.
9. Sapma %20'yi geçtiğinde bitirme düğmesi ikinci onay ister ve neden görünür.
10. Tamamlanan emirde maliyet kilitlenir; kilit açma yalnız muhasebede görünür.
11. Ayna açıkken yazma düğmeleri gizlenir; lisans dolduysa kaydet pasiftir ve nedeni yazar.
12. Modül kapalı olan müşteride menüde **hiç görünmez** (koşullu paket, §1).

## 10. Testler

**Sunucu (birim).** `server/YesLojistik.Tests/Unit/ProductionCostTests.cs`:
- Malzeme maliyeti: 260 kg × birim maliyet; yuvarlama 2 hane.
- İşçilik: (30 dk kurulum + 100 × 2 dk) / 60 × saat ücreti × 2 kişi.
- Vardiya çarpanı: gece vardiyası 1,5 ile çarpım.
- Genel gider dağıtımı: saat × iş merkezi ücreti.
- Fire maliyeti mamule yüklenir; yan ürün payı düşülür.
- Fason operasyon maliyeti toplama eklenir.
- MRP: tek seviye, fire dahil, rezerve ve yoldaki ayrımı.

**Sunucu (entegrasyon).** `server/YesLojistik.Tests/Integration/ProductionTests.cs`
(`FleetTests.cs:18-32` kurulum deseni):
- Reçete oluştur → versiyon artır → eski emir eski versiyonu kullanır.
- Emir başlat → malzeme rezerve; bitir → stok hareketleri doğru yönde.
- İptal edilen emirde tüketim ters kayıtla geri gelir (stok eski hâlinde).
- Tamamlanan emir ikinci kez bitirilemez (400 + Türkçe mesaj).
- Sapma > %20 ise onay olmadan bitirme reddedilir.
- Yetki: operasyon rolü maliyet kilidini açamaz (403).
- Ayna açıkken `POST` reddedilir (`LegacyMirrorTests.cs` deseni).

**Panel (e2e).** `client/e2e/production.spec.ts`:
- Reçete listesi açılır, arama daraltır; yeni reçete eklenir, listede görünür.
- Bileşen ekleme ve miktar doğrulaması (negatif miktar hata verir).
- Akış sekmesinde iki kutu sürüklenir; DOM sırası değişir; kaydettikten sonra korunur.
- Emir açılır, bitirilir, maliyet kırılımı görünür.
- Telefon görünümü: `client/e2e/mobile.spec.ts` desenine uygun, yatay kaydırma yok.
- Yeni görünüm: `client/e2e/helpers.ts:44-46` `useNewUi(page)` ile ikinci koşu.

Test silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:24`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Reçete + bileşen + operasyon tabloları, migration | 2 |
| Reçete listesi ve kartı ekranları (klasik + yeni) | 3 |
| Sürükle-bırak akış diyagramı (masaüstü + telefon listesi) | 2,5 |
| İş merkezi ve vardiya tanımları + ekran | 1,5 |
| Üretim emri listesi ve kartı | 3 |
| MRP temel seviye hesabı + ekran | 1,5 |
| Maliyet motoru (malzeme + işçilik + genel gider + fason) | 3 |
| Fire / yan ürün akışı | 1 |
| Stok ve muhasebe hareketi bağlantısı | 2 |
| Testler (birim + entegrasyon + e2e) | 3 |
| Dokümantasyon, denetim etiketleri, kabul turu | 1 |
| **Toplam** | **23,5 kişi-gün** |

Bağımlılıklar (önce bitmeli):
- **`10-STOK-VE-DEPO.md` — zorunlu ön koşul.** Stok kartı, depo ve maliyet yöntemi olmadan bu modül
  uygulanamaz.
- `19-SABIT-KIYMET.md` — makine kıymeti iş merkezine bağlanır.
- `18-PERSONEL.md` — işçilik saat ücreti ve puantaj.
- `06-MUHASEBE-MOTORU.md` — üretim fişleri.
- `17-GIDER-GELIR-MERKEZLERI.md` — genel gider dağıtım anahtarı.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Modül gereksiz yere açılır, boş ekran kalır | Koşullu paket; kurulum sihirbazında "atölyeniz var mı?" sorusu | Paket kapatılır, menü gizlenir |
| Reçete değişince geçmiş maliyet bozulur | Versiyonlama + maliyet kilidi | Eski versiyon arşivden açılır |
| Stoktan sessizce fazla malzeme düşülür | Sapma onayı (%20) + denetim izi | Ters kayıtla stok düzeltilir |
| Yanlış işçilik/genel gider oranı | Tanımlar tek yerde; raporda "oransız iş merkezi" listesi | Oran düzeltilir, yeni emirlerde geçerli |
| Sürükle-bırak telefonda kullanılamaz | Telefonda liste + yukarı/aşağı düğmeleri | Liste görünümü kalıcı yapılır |
| Maliyet raporu muhasebeyle tutmaz | Maliyet kırılımı ile fiş toplamı karşılaştırma raporu | Fark raporu ile elle düzeltme |

**doğrulanacak:**
1. **Luca'nın üretim ekranı:** akış kutusunun alanları, diyagramın derinliği, "paket uygulamaları"
   ve "üretim biçimi" seçenekleri. Kaynak: demo erişimi veya ekran görüntüsü.
2. **Genel gider dağıtım anahtarı:** saat mi, makine saati mi, miktar mı, işçilik mi? Kullanıcı ve
   mali müşavir kararı gerekir.
3. **Vardiya çarpanı** (gece/hafta sonu zam katsayıları) — iş mevzuatı ve kullanıcı kararı.
4. **Ay sonu değerleme etkisi:** tamamlanmamış emrin maliyeti (yarı mamul) hangi oranda dikkate
   alınır — mali müşavir teyidi.
5. **Fire oranı ölçümü:** oran geçmişten mi hesaplanacak, elle mi girilecek; hangi dönem esas alınır.
6. **Fason operasyonun tevkifat/KDV durumu** — mali müşavir teyidi.
7. **İşçilik saat ücretinin kaynağı:** personel kartındaki sabit ücret mi, puantajdan hesaplanan
   gerçek saat ücreti mi.
8. **Üretim modülünün ayna modundaki durumu:** pratikortam aynası açıkken reçete/emir yazılabilecek mi
   (üretim panelin kendi işi olduğu için "evet" mantıklı görünüyor), yoksa tüm yazma kapalı mı kalmalı
   — kullanıcı kararı. Guard liste tabanlı olduğu için bu karar ekleme sırasını belirler
   (`MirrorWriteGuard.cs:14-18`).

Sonraki belgeyle bağlantı: `21-SAYIM-BARKOD.md` üretilen mamulün ve tüketilen hammaddenin barkodla
sayımını, `10-STOK-VE-DEPO.md` stok kartı ve maliyet yöntemini, `19-SABIT-KIYMET.md` makine
kıymetini bu modüle bağlar.
