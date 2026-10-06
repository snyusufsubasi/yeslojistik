# 19 — Sabit Kıymet (Varlık) Yönetimi

## 1. Amaç ve kapsam

Bu modül, işletmenin **bir yıldan uzun süre kullandığı ve tüketmediği** değerleri kayıt altına alır. Buna
sabit kıymet (varlık) denir: çekici, kamyon, dorse, forklift, pres, ofis mobilyası, sunucu, vinç gibi.
Bugün bu değerlerin çoğu panelde yok; olanlar da "gider" gibi davranıyor. Oysa bir aracın alış bedeli
gider değildir; o bedel yıllara bölünerek gider yazılır. Bu bölme işine **amortisman**, her yıl yazılan
payına **amortisman gideri** denir.

Modülün çözdüğü işler:

- Kıymetin kimliğini tutmak: ne aldık, kaça aldık, ne zaman aldık, hangi faturayla aldık.
- Yıllık amortismanı hesaplayıp aya bölmek (kıst hesap: yılın ortasında alınan kıymet tam yıl gider yazmaz).
- Kıymetin bugünkü defter değerini göstermek (alış bedeli − birikmiş amortisman).
- Satış, hurdaya ayırma, kayıp gibi **çıkış** işlemlerini ve bunların kâr/zararını göstermek.
- Araç kıymetlerini mevcut filo ekranıyla bağlamak: bakım, sigorta, muayene, şoför ataması aynı kartta.

Kapsam dışı olanlar ve nedeni:

- **Muhasebe fişi üretmek kapsam dışı.** Yevmiye kaydı `06-MUHASEBE-MOTORU.md` işidir; bu modül ona
  "amortisman gideri şu tarihte, şu tutarda, şu kıymet için" bilgisini hazır verir, fişi o yazar.
- **Vergi beyanı ve beyanname kapsam dışı.** Mevzuat yorumu bu dokümanda yapılmaz; oran ve yöntem
  seçiminin doğruluğu mali müşavir onayına bağlıdır (bkz. §12).
- **Kiralık (taşeron) araçlar kapsam dışı.** Bugün kiralık araçlar `Vehicle.Ownership = Rented` ile
  tutuluyor (`server/YesLojistik.Core/Entities/Enums.cs:39`) ve bunlar işletmenin malı değildir; amortismana
  girmez. Kıymet kartı yalnız öz mal için açılır.
- **Küçük demirbaşlar kapsam dışı.** Belli bir tutarın altındaki alımlar bugünkü gibi doğrudan gider
  yazılır. Bu tutar kullanıcı ayarıdır, varsayılanı **doğrulanacak** (§12).

## 2. Luca'daki karşılığı

Luca ürün ailesinde sabit kıymet, muhasebe çekirdeğinin bir alt modülüdür; "Muhasebe" menüsü altında
duran kıymet kartları ve amortisman işlemleriyle yürür. Kaynak: <https://luca.com.tr/> ve ürün
sayfaları (`02-LUCA-ENVANTERI.md`). Envanterde birebir geçen ve bu modüle dayanak olan maddeler:

- Luca Koza'da **tüm işlemlerin tek ekrandan muhasebeleştirilmesi** ve **muhasebe fişine erişim**
  (`02-LUCA-ENVANTERI.md:46-47`). Yani kıymet kartı ile yevmiye aynı yerden görülür.
- Luca'da **iş merkezi** tanımı ve **gelir-gider yeri** ayrımı (`02-LUCA-ENVANTERI.md:59`). Amortisman
  giderinin hangi merkeze yazılacağı bu ayrımla belirlenir; biz de kıymet kartına "gider merkezi"
  alanı koyacağız (§4).
- Luca'da sigortaya konu ürünlerin stok kalemi olarak açılması ve poliçe takibi
  (`02-LUCA-ENVANTERI.md:41`). Bizde kıymet kartı, poliçe bitiş tarihini `FleetDocument` ile bağlar.

**doğrulanacak:** Luca'nın kıymet ekranının menü yeri, alan adları ve amortisman yöntem listesi
(Luca demo hesabı ya da kullanıcı ekran görüntüsüyle). Kaynak sitede kıymet modülünün ayrıntılı sayfası
okunamadı; bu yüzden ekran tasarımı Luca'ya benzetilecek ama birebir kopya iddiası yoktur.

## 3. Bizde bugün

Bugün panelde **sabit kıymet kavramı yoktur**; ne bir kıymet tablosu ne bir ekran vardır. Bunu
doğrulayan aramalar ve elimizdeki yakın yapılar:

- **Kıymet tablosu yok.** `server/YesLojistik.Core/Entities/` altında `FixedAsset`, `Asset`,
  `Depreciation` adlı bir sınıf bulunmuyor; `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43`
  içindeki `DbSet` listesinde de karşılığı yok.
- **Araç kartı var, bedel yok.** `server/YesLojistik.Core/Entities/Vehicle.cs:5-9` plaka, tip, marka,
  model ve model yılı tutuyor; **alış bedeli, alış tarihi ve amortisman alanı yok**. Yani bir çekicinin
  kaça alındığı hiçbir yerde durmuyor.
- **Araç kilometresi ve bakım alanları var.** `Vehicle.cs:10-16`: `Km`, `LastMaintenanceDate`,
  `NextMaintenanceDate`, `NextMaintenanceKm`, `InspectionExpiry`, `InsuranceExpiry`. Bunlar kıymet
  kartının "kullanım" tarafını besleyecek hazır verilerdir.
- **Araç kartı ek alanları var.** `Vehicle.cs:31-41`: `Capacity`, `FuelType`, `InsuranceInfo`,
  `CascoInfo`, `CascoExpiry`, `InspectionInfo`, `EmissionInfo`, `EmissionExpiry`, `MaintenanceInfo`,
  `RegistrationOwner`. "Ruhsat sahibi" alanı öz mal/kiralık ayrımını doğrulamak için kullanılabilir.
- **Öz/kiralık ayrımı çalışıyor.** `Enums.cs:39` ve `VehiclesController.cs:139-140` kiralık araçta
  araç sahibini zorunlu tutuyor. Kıymet kartı yalnız `Own` araç için açılacak.
- **Amortisman yerine gider yazılıyor.** Bakım kaydının tutarı doğrudan gider oluyor:
  `server/YesLojistik.Infrastructure/Services/FleetService.cs:136-149` (tutar > 0 ise `Expense` üretilir,
  kategori `Maintenance`). Yani bugün araca yapılan her harcama gider; **alış bedeli hiçbir yere
  yazılmıyor**.
- **Gider tarafı.** `server/YesLojistik.Core/Entities/Expense.cs:5-7` kategori, KDV dahil tutar ve tarih
  tutuyor; `Expense.cs:49-51` dönemsel gider için `PeriodStart`/`PeriodEnd` var. Amortisman gideri bu
  yapıya benzetilebilir ama kıymet bağı (`FixedAssetId`) bugün yok.
- **Filo belgeleri ayrı tabloda.** `server/YesLojistik.Core/Entities/FleetDocument.cs:4-15`: araç, şoför
  veya firma belgesi; `DocumentType` listesi `Enums.cs:52-56` (ruhsat, kasko, muayene, K belgesi…).
  Kıymet kartı bu tabloyu yeniden kullanacak, ikinci bir belge tablosu açılmayacak.
- **Filo uçları (API).** `server/YesLojistik.Api/Controllers/FleetController.cs:66-91` bakım listesi,
  ekleme, güncelleme, silme; `FleetController.cs:17-60` belge ve belge dosyası uçları.
- **Ekranlar.** Araçlar listesi `client/src/pages/VehiclesPage.tsx:58-72` (plaka, tip, şoför, durum, km,
  sonraki bakım, muayene/sigorta sütunları); araç formu sekmeli:
  `client/src/components/VehicleForm.tsx:76-79` (Bilgiler / Belgeler / Bakım), bakım paneli
  `client/src/components/FleetPanels.tsx:154-196`, bakım formu alanları `FleetPanels.tsx:216-238`.
- **Menü.** Öz Mal grubu `client/src/lib/nav.ts:49-54` (Araçlar, Giderler); yeni görünümde
  `nav.ts:98-104`. Yeni görünüm varsayılan değil: `client/src/lib/uiMode.ts:8`
  (`DEFAULT_UI_MODE = 'classic'`).
- **Ortak parçalar hazır.** `client/src/components/shell/PageShell.tsx` ve
  `client/src/components/shell/FilterPanel.tsx:7-62` bugün kullanılıyor
  (`client/src/pages/VehicleExpensesPage.tsx:10-13`). **Çelişki:** `docs/plan/01-ORTAK-SARTNAME.md:147-148`
  "PageShell ve DetailDrawer kodda YOK" diyor; bu ifade artık geçersizdir. Kıymet ekranları bu parçaları
  kullanacak.

Eksik listesi: kıymet kartı tablosu, amortisman planı, amortisman gideri üretimi, çıkış/kâr-zarar
işlemi, kıymet ekranları, kıymet API'si, kıymet yetkileri, testler.

## 4. Hedef ekranlar ve alanlar

Üç ekran eklenecek. Üçü de iki görünümde (klasik/yeni) çalışır ve ortak parçaları kullanır.

**E1. Kıymetler listesi — `/sabit-kiymetler`**
Üstte `FilterBar`: arama (kod, ad, plaka), tür (Araç/Makine/Demirbaş), durum (Kullanımda/Kiraya
verildi/Satıldı/Hurda), gider merkezi, "bu yıl amortismanı bitenler". Gövde: masaüstünde `DataTable`,
telefonda `MobileCards`. Sütunlar: Kod, Ad, Tür, Alış tarihi, Alış bedeli, Birikmiş amortisman,
Defter değeri, Yıllık oran (%), Durum, bağlı plaka. Alt şeritte `SumStrip` ile toplam alış bedeli,
toplam birikmiş amortisman ve toplam defter değeri.

**E2. Kıymet kartı (detay penceresi / tam sayfa)**
Sekmeler: **Bilgiler**, **Amortisman**, **Hareketler**, **Belgeler**, **Araç** (yalnız araç kıymetinde).

| Alan | Tip | Zorunlu | Davranış / doğrulama |
|---|---|---|---|
| Kod | metin (20) | evet | Tekil; öneri: `KIY-2026-0001` |
| Ad | metin (150) | evet | Ör. "Çekici 34 ABC 123" |
| Tür | seçim | evet | Araç · Makine · Demirbaş |
| Alt tür | seçim | hayır | Çekici, Kamyon, Dorse, Forklift, Pres, Mobilya, Bilgisayar, Diğer |
| Edinme biçimi | seçim | evet | Faturalı yurt içi · İthal · Devir (mevcut) · Kiralama yoluyla edinim |
| Alış tarihi | tarih | evet | Gelecek tarih kabul edilmez |
| Alış bedeli (KDV hariç) | para | evet | 2 kuruş; 0 olamaz |
| KDV tutarı | para | hayır | Faturalı alımda faturadan gelir |
| Masraf kalemleri | alt tablo | hayır | Nakliye, gümrük, montaj; toplam **maliyete** eklenir |
| Maliyet (hesaplanan) | para | — | Alış bedeli + masraflar; salt okunur |
| Amortisman yöntemi | seçim | evet | Normal (eşit tutar) · Azalan bakiyeler · Kıst (gün) |
| Yıllık oran (%) | sayı (5,2) | evet | Kullanıcı girer; öneri listesi **doğrulanacak** |
| Faydalı ömür (yıl) | sayı | hayır | Oran girilmezse ömürden hesaplanır; ikisi çelişirse uyarı |
| Amortisman başlangıç ayı | seçim (ay) | evet | Kıst hesabın çıpası |
| Kıymet artışı / yeniden değerleme | alt tablo | hayır | Tarih + tutar + gerekçe **doğrulanacak** |
| Gider merkezi | seçim | evet | Tanımlardan; yoksa "Genel" |
| Durum | seçim | evet | Kullanımda · Kiraya verildi · Satıldı · Hurda · Kayıp |
| Araç bağı | seçim | hayır | Zorunlu, tür = Araç ise |
| Sorumlu | seçim (personel/şoför) | hayır | Zimmet takibi |
| Seri no / şasi no | metin (40) | hayır | Makinede seri, araçta şasi |
| Not | metin (500) | hayır | |

**E3. Çıkış (satış/hurda) penceresi**
Alanlar: çıkış türü (Satış · Hurda · Kayıp · Devir), çıkış tarihi, satış bedeli (KDV hariç), KDV,
alıcı (cari), fatura no, gerekçe/not. Alt kısımda canlı hesap: defter değeri, satış bedeli, fark
(kâr/zarar). Fark eksi ise kırmızı, artı ise yeşil ve **her zaman metinle** yazılır ("zarar" / "kâr")
— yalnız renge güvenilmez.

## 5. İş kuralları

1. **Yuvarlama.** Bütün para hesabı `Money.Round` üzerinden
   (`server/YesLojistik.Core/Domain/Money.cs:6`) — 2 hane, yarım yukarı. Aylık amortisman tutarı
   hesaplanıp yuvarlandıktan sonra plana yazılır.
2. **Amortisman planı bir kez üretilir.** Kıymet kaydedilirken (alış tarihi + yöntem + oran + kıst ayı)
   dönem dönem satırlar üretilir. Sonradan oran değişirse plan **yeniden hesaplanır** ama geçmiş ayların
   gider kaydı silinmez; fark bir düzeltme satırı olarak yazılır.
3. **Kıst hesap.** `Amortisman başlangıç ayı` girilen aya kadar tam aylık, girilen aydan sonra yılın
   kalan ay sayısı kadar tutar yazılır. Örnek (uydurma): 120.000,00 TL bedel, %20 oran, 12 ay =
   aylık 2.000,00 TL; kıst ayı 7 ise ilk yıl 6 × 2.000,00 = 12.000,00 TL.
4. **Son ay düzeltmesi.** Yıllık toplam, aylık tutar × 12 çarpımından yuvarlama farkı kadar farklı
   olabilir; fark **son aya** eklenir. Böylece birikmiş amortisman tam olarak hesaplanan toplam tutara
   eşit olur.
5. **Defter değeri eksi olamaz.** Amortisman, maliyetin (varsa yeniden değerlenmiş tutarın) altına
   inmez; plan üretilirken son dönem kırpılır.
6. **Durum geçişleri.** `Taslak → Kullanımda → (Kiraya verildi ↔ Kullanımda) → Satıldı | Hurda | Kayıp`.
   Çıkış yapılan kıymet yeniden "Kullanımda" yapılamaz; yanlış çıkış yalnız **iptal** ile geri alınır
   (çıkış kaydı silinmez, iptal işaretlenir).
7. **Çıkışta amortisman durur.** Çıkış tarihinden sonraki aylar için amortisman gideri üretilmez;
   o dönemlerin plan satırı "iptal" durumuna geçer.
8. **Kâr/zarar.** Kâr/zarar = satış bedeli (KDV hariç) − çıkış anındaki defter değeri. Kayıp ve hurdada
   satış bedeli 0 kabul edilir, tamamı zarar yazılır.
9. **KDV.** Alışta KDV, indirilecek KDV olarak faturaya dayanır; kıymetin maliyetine **eklenmez**
   (aksini gerektiren durum mali müşavir onayına bağlıdır). Satışta KDV, satış faturasının işidir.
10. **Tevkifat.** Bu modül tevkifat hesabı yapmaz; kıymet alım faturası `12-SATIN-ALMA.md` akışından
    geçer. Tevkifat oranları **doğrulanacak** (§12).
11. **Yetki.** Kıymet kartı açma/düzenleme `Policies.Operations` + `Policies.Accounting`; çıkış
    (satış/hurda) yalnız `Policies.Accounting`. Roller: `server/YesLojistik.Api/Auth/Policies.cs:8-17`.
12. **Ayna ve lisans.** Ayna açıkken yazma düğmeleri gizlenir; lisans süresi dolduysa salt okunur.
    **Dikkat:** sunucudaki `MirrorWriteGuard` yalnız listede yazan yolları koruyor
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`); `/api/fixed-assets` bu listede
    **yoktur** ve eklenmelidir. Aksi hâlde ayna modunda kıymet kaydı panelde yazılabilir ve sonraki
    senkronda kaybolur. Bu ekleme, bu modülün uygulama adımlarından biridir.
13. **Silme yok, iptal var.** Kıymet kaydı silinmez; `IsDeleted` ile gizlenir
    (`server/YesLojistik.Core/Entities/BaseEntity.cs` temel alanları). Bu, denetim izi şartıdır.

## 6. Veri modeli

İki yeni tablo, mevcut tablolara yalnız **ekleme** (boş olabilen sütun veya yeni tablo). Migration
kuralı: `01-ORTAK-SARTNAME.md:22-23`.

**Yeni: `FixedAsset`** (`server/YesLojistik.Core/Entities/FixedAsset.cs`)

| Alan | Tip | Not |
|---|---|---|
| Id, IsDeleted, CreatedAt… | temel | `BaseEntity` |
| Code | metin (20) | tekil indeks, `is_deleted = false` filtresi |
| Name | metin (150) | |
| Kind | enum `AssetKind` | Vehicle, Machine, Fixture |
| SubKind | metin (50) | boş olabilir |
| AcquisitionKind | enum `AssetAcquisitionKind` | Invoiced, Imported, Transfer, Leased |
| AcquisitionDate | tarih | |
| AcquisitionCost | para (18,2) | KDV hariç |
| VatAmount | para (18,2) | boş olabilir |
| ExtraCosts | para (18,2) | masraf kalemleri toplamı |
| Cost | para (18,2) | hesaplanan maliyet |
| Method | enum `DepreciationMethod` | StraightLine, Declining, ProRata |
| AnnualRate | sayı (5,2) | |
| UsefulLifeYears | sayı | boş olabilir |
| StartMonth | sayı | 1-12 |
| CostCenter | metin (80) | gider merkezi |
| Status | enum `AssetStatus` | InUse, Leased, Sold, Scrapped, Lost |
| VehicleId | int? | `Vehicle` ile ilişki, `SetNull` |
| LegacyKey | metin (200) | ayna/eşleştirme için |
| Note | metin (500) | |

**Yeni: `DepreciationEntry`** (`server/YesLojistik.Core/Entities/DepreciationEntry.cs`)

| Alan | Tip | Not |
|---|---|---|
| FixedAssetId | int | `Cascade` silme (yalnız kıymet silinirse) |
| PeriodYear, PeriodMonth | sayı | dönem |
| Amount | para (18,2) | o dönemin gideri |
| Accumulated | para (18,2) | dönem sonu birikmiş |
| BookValue | para (18,2) | dönem sonu defter değeri |
| IsPosted | bool | muhasebeye aktarıldı mı |
| PostedAt | tarih/saat? | |
| IsCancelled | bool | çıkış sonrası iptal |
| Source | enum `DepreciationSource` | Planned, Revaluation, Disposal, Correction |

**Yeni: `AssetRevaluation`** (yeniden değerleme/artış) — tarih, tutar, gerekçe, `FixedAssetId`.
Yöntem ve hesap **doğrulanacak** (§12).

**Eklenen sütunlar (hepsi boş olabilir):** `Vehicle.AcquisitionDate`, `Vehicle.AcquisitionCost`,
`Vehicle.FixedAssetId`. Bunlar araç listesinde değer sütunlarını göstermek için gerekli; veri silen
dönüşüm yoktur. `AppDbContext` içine `DbSet<FixedAsset>`, `DbSet<DepreciationEntry>`,
`DbSet<AssetRevaluation>` eklenir (`AppDbContext.cs:10-43` düzeni izlenir) ve model yapılandırması
`AppDbContext.cs:147-167` örneğine uygun yazılır.

## 7. API uçları

Yol düzeni mevcut `/api/...` kuralını izler (`VehiclesController.cs:21-22`).

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/fixed-assets` | page, pageSize, search, kind, status, costCenter, from, to, sort, desc | `PagedResult<FixedAssetDto>` | oturum |
| GET | `/api/fixed-assets/{id}` | — | `FixedAssetDto` (plan + hareketler) | oturum |
| POST | `/api/fixed-assets` | `FixedAssetSaveRequest` | `FixedAssetDto` | Operations |
| PUT | `/api/fixed-assets/{id}` | `FixedAssetSaveRequest` | `FixedAssetDto` | Operations |
| DELETE | `/api/fixed-assets/{id}` | — | 204 | Accounting |
| GET | `/api/fixed-assets/lookup` | — | `List<LookupItem>` | oturum |
| GET | `/api/fixed-assets/{id}/depreciation` | from, to | `List<DepreciationEntryDto>` | oturum |
| POST | `/api/fixed-assets/{id}/depreciation/regenerate` | `DepreciationPlanRequest` | `List<DepreciationEntryDto>` | Accounting |
| POST | `/api/fixed-assets/{id}/dispose` | `AssetDisposeRequest` | `AssetDisposeDto` (kâr/zarar) | Accounting |
| POST | `/api/fixed-assets/{id}/dispose/cancel` | `{ reason }` | `FixedAssetDto` | Accounting |
| GET | `/api/fixed-assets/{id}/movements` | — | `List<AssetMovementDto>` | oturum |
| GET | `/api/fixed-assets/export` | liste süzgeçleri | xlsx | oturum |
| GET | `/api/fixed-assets/totals` | liste süzgeçleri | `FixedAssetTotalsDto` | oturum |

`FixedAssetDto` alanları: Id, Code, Name, Kind, SubKind, AcquisitionKind, AcquisitionDate,
AcquisitionCost, Cost, Accumulated, BookValue, AnnualRate, Method, Status, CostCenter, VehicleId,
VehiclePlate, MonthlyAmount, NextPeriod, HasRevaluation. `FixedAssetSaveRequest` aynı alanları
maskesiz taşır; hesaplanan alanlar (Cost, Accumulated, BookValue) istekte yer almaz, sunucu üretir.

## 8. Yetki, onay ve denetim izi

- **Rol matrisi.** Yönetici: tam. Operasyon: kart açar/düzenler, çıkış yapamaz. Muhasebe: kart açar,
  oran/yöntem değiştirir, çıkışı yapar, planı yeniden üretir. Şoför: hiç erişemez.
- **Maker-checker.** 500.000,00 TL üzeri kıymette çıkış işlemi **iki onay** ister: muhasebe girer,
  yönetici onaylar. Eşik kullanıcı ayarıdır.
- **Denetim izi.** Kıymet değişiklikleri `AuditTrail` ile otomatik kaydedilir
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`). Etiket üretimi için `AuditTrail.cs:83-106`
  içine kıymet satırı eklenir: `FixedAsset fa => $"{fa.Code} {fa.Name}"`. Alan adları
  `AuditTrail.cs:23-52` sözlüğüne Türkçe karşılıklarıyla eklenir (ör. `Accumulated` → "Birikmiş
  amortisman"); sözlükte olmayan alan ham adıyla görünür ve bu istenmez.
- **Kritik alanlar.** Alış bedeli, oran ve alış tarihi değişikliği ayrıca `AuditLog` üzerinden
  raporlanabilir olmalı; rapor `23-RAPORLAMA-BI.md` işidir.
- **Gizli alanlar.** Silinen kıymetin satış bedeli denetim etiketine yazılmaz; yalnız kod ve ad yazılır.

## 9. Kabul kriterleri

1. `/sabit-kiymetler` ekranı 1440×900'de **en az 12 satır** gösterir; üst kısım (başlık → tablo başlığı)
   **≤260px**.
2. Yeni kıymet kaydı **tek pencerede**, en çok **12 zorunlu alanla** girilir; Ctrl+Enter kaydeder,
   Esc kaydedilmemiş değişiklikte sorar.
3. Kaydın ardından amortisman planı **anında** üretilir; kullanıcı kaydettikten sonra ikinci bir işlem
   yapmak zorunda kalmaz.
4. Kıst örnek: 120.000,00 TL · %20 · kıst ayı 7 → ilk yıl toplam amortisman **12.000,00 TL**,
   aylık **2.000,00 TL**; ekranda ve testte birebir görünür.
5. Son ay düzeltmesi sonrası birikmiş amortisman = maliyet × oran × yıl (kıst hariç); kuruş farkı **0**.
6. Çıkış işleminde kâr/zarar **tek bakışta** okunur: defter değeri, satış bedeli, fark; fark metinle
   ("kâr"/"zarar") yazılır.
7. Çıkıştan sonraki dönemlerde amortisman gideri üretilmez; plan satırları iptal işaretlenir.
8. Listedeki `SumStrip` toplamları, süzgeç değiştiğinde **sayfanın değil süzgecin** toplamını gösterir.
9. Excel dışa aktarım, listedeki bütün sütunları içerir ve Türkçe başlıklarla iner
   (`VehiclesController.cs:57-79` örneği).
10. Ayna açıkken bütün yazma düğmeleri gizlenir; lisans dolduysa kaydet düğmesi pasiftir ve neden
    yazan bir uyarı görünür.
11. Telefonda (390×844) **yatay kaydırma yok**.
12. Kıymet silme yoktur; "arşivle" vardır ve arşivlenen kıymet listede varsayılan gizlenir.

## 10. Testler

Var olan yapı izlenir: sunucu tarafında `dotnet test` ile gerçek PostgreSQL, panelde Playwright.

**Sunucu (birim).** `server/YesLojistik.Tests/Unit/DepreciationCalculatorTests.cs`:
- Düz amortisman, tam yıl: 120.000,00 · %20 → 12 ayda 2.000,00; toplam 24.000,00.
- Kıst hesap: kıst ayı 7 → ilk yıl 6 ay.
- Yuvarlama: 10.000,00 · %33 → aylık 275,00 ve son ay düzeltmesi.
- Defter değeri sıfırın altına inmez; son dönem kırpılır.
- Azalan bakiyeler yöntemi: ilk yıl tutarı > ikinci yıl tutarı.
- Çıkış sonrası iptal: plan satırları üretilmez.

**Sunucu (entegrasyon).** `server/YesLojistik.Tests/Integration/FixedAssetTests.cs`
(`FleetTests.cs:18-32` kurulum deseni kullanılır):
- Kart oluştur → plan üretilir → `GET /api/fixed-assets/{id}` birikmiş tutarı doğru döner.
- Yalnız muhasebe çıkış yapabilir: operasyon 403 alır.
- Çıkış sonrası kâr/zarar hesabı doğru; çıkış iptali kartı eski durumuna döndürür.
- Kiralık araç (`Ownership = Rented`) için kıymet kartı açılamaz.
- Ayna açıkken `POST` reddedilir (`MirrorWriteGuard`), testi `LegacyMirrorTests.cs` desenine uyar.
- Silme (`DELETE`) kıymeti gizler, plan satırları listede kalmaz ama denetim kaydı kalır.

**Panel (e2e).** `client/e2e/fixed-assets.spec.ts`:
- Liste açılır, süzgeç çalışır, arama sonucu daralır (`client/e2e/vehicles.spec.ts` deseni).
- Yeni kıymet eklenir; tabloda görünür; amortisman sekmesinde 12 satır vardır.
- Çıkış penceresinde kâr/zarar metni görünür.
- Telefon görünümünde yatay kaydırma yoktur: `client/e2e/mobile.spec.ts` deseniyle.
- Yeni görünüm: `client/e2e/helpers.ts:44-46` içindeki `useNewUi(page)` yardımcısıyla ikinci kez koşulur.

Test silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:24`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Varlık ve DTO'lar + `AppDbContext` + migration | 1,5 |
| Amortisman hesap motoru + birim testleri | 2 |
| API uçları (liste, kart, plan, çıkış, iptal, dışa aktarım) | 2,5 |
| Kıymet listesi ekranı (klasik + yeni, telefon) | 2 |
| Kıymet kartı + amortisman/hareket/belge sekmeleri | 3 |
| Çıkış penceresi + maker-checker | 1,5 |
| Entegrasyon + e2e testleri | 2 |
| Dokümantasyon, denetim izi etiketleri, kabul turu | 1 |
| **Toplam** | **15,5 kişi-gün** |

Bağımlılıklar (önce bitmeli):
- `10-STOK-VE-DEPO.md` — demirbaş ve makine kıymetleri stok kartıyla karışmamalı; sınır orada çizilir.
- `12-SATIN-ALMA.md` — alış faturası bağlantısı (ithal alımda masraf dağıtımı).
- `06-MUHASEBE-MOTORU.md` — amortisman giderinin yevmiye karşılığı.
- `17-GIDER-GELIR-MERKEZERI.md` — gider merkezi listesi buradan gelir; kıymet kartı onu kullanır.
- `22-ITHALAT-IHRACAT-DOVIZ.md` — ithal edilen kıymetin kur ve masraf dağıtımı.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Amortisman oranları yanlış girilir | Oran listesi kullanıcı ayarı; kayıtta uyarı; rapor "oranı girilmemiş kıymet" | Plan yeniden üretilir, geçmiş gider korunur |
| Kıst ayı yanlış anlaşılır | Ekranda örnek hesap gösterilir; yardım metni | Plan yeniden üretilir |
| Var olan `Expense` kayıtlarıyla çift sayım | Amortisman gideri `Expense`'e yazılmaz; ayrı tablo + muhasebe aktarımı | Aktarım işareti geri alınır |
| Mevcut araç verisi bozulur | Yalnız boş olabilen sütun eklenir; mevcut alanlar değişmez | Migration geri alınır (kod), veri ellenmez |
| Kiralık araç yanlışlıkla kıymet yazılır | `Ownership = Rented` için kart açılamaz; sunucu reddeder | Kayıt iptal edilir |
| Ağır listelerde yavaşlık | `Code`, `Status`, `VehicleId` indeksleri; sayfalama | İndeks eklenir |

**doğrulanacak:**
1. **Amortisman oranları ve faydalı ömür listesi:** hangi kıymet türüne hangi oran uygulanacak (VUK
   listeleri ve sektör uygulaması). Kaynak: mali müşavir yazılı teyidi. Dokümanda hiçbir oran kesin
   bilgi olarak yazılmadı.
2. **Kıst hesabın resmî kuralı:** kıymetin hangi ayda aktife girdiği sayılır, hangi ay tam ay sayılır.
   Mali müşavir teyidi gerekir.
3. **Yeniden değerleme:** hangi kıymetler, hangi dönemde, hangi endeks/katsayı ile değerlenir; artış
   tutarının nasıl hesaplandığı. Kaynak: mevzuat + mali müşavir. Bu dokümanda yöntem uydurulmadı.
4. **Azalan bakiyeler yönteminin uygulanıp uygulanmayacağı** ve oran farkı.
5. **Küçük demirbaş sınırı** (doğrudan gider yazılacak tutar) — kullanıcı kararı.
6. **İthal kıymette masraf dağıtımı** (kur, gümrük, nakliye) — `22-ITHALAT-IHRACAT-DOVIZ.md` ile
   birlikte netleşecek.
7. **Luca'daki kıymet ekranının alanları ve menü yeri** — ekran görüntüsü ya da demo erişimi.
8. **Tevkifat/KDV uygulaması** kıymet alımında — mali müşavir teyidi.
9. **Ayna modu kapsamı:** pratikortam aynası açıkken kıymet kartının panelde hiç yazılmaması mı
   (yalnız okuma), yoksa kıymetlerin aynadan hiç gelmemesi nedeniyle yazmanın serbest olması mı
   istendiği — kullanıcı kararı. Bugünkü guard yalnız liste tabanlı olduğu için bu karar gerekli
   (`MirrorWriteGuard.cs:14-18`).

Sonraki belgeyle bağlantı: `20-URETIM-RECETE.md` makine ve iş merkezi tanımlarını bu modüldeki kıymet
kartına bağlar; `17-GIDER-GELIR-MERKEZLERI.md` kıymetin gider merkezini, `12-SATIN-ALMA.md` alış
faturasını, `22-ITHALAT-IHRACAT-DOVIZ.md` ithal alımın kur ve masraf tarafını besler.
