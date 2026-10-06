# 10 — Stok ve Depo

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 şablonuna uyar. **Kritik gerçek:** bugün bu depoda
stok/depo modülü **hiç yoktur**; aşağıdaki "bizde bugün" bölümü bu yokluğu kanıtlarıyla gösterir ve
plan, mevcut kod tabanının desenleri üzerine **ekleme** yapar. Doğrulanmamış dış bilgi
`**doğrulanacak:**` etiketi taşır; mevzuat yorumu yapılmaz.

## 1. Amaç ve kapsam

YES Lojistik bugün bir **taşıma** firmasıdır: panelde sevkiyat, cari, fatura, gider, çek, kasa/banka,
personel, araç ve raporlar vardır; **mal** yoktur. Luca sınıfı bir ERP'ye geçişin en büyük yapısal
eklerinden biri stok ve depodur: lastik, yedek parça, yağ, sarf malzemesi, dorse/ambalaj gibi kalemler
bugün gider olarak geçer, ama envanter olarak izlenmez.

Kapsam içinde olanlar:

1. **Stok kartı.** Kod, ad, birim, KDV, kategori/alt kategori, marka, barkod, seri/lot takibi, kritik
   seviye, maliyet yöntemi.
2. **Çoklu depo ve depo bölümü.** Luca Koza'da "birden fazla depo ve depo bölümü bazında stok takibi"
   vardır (`docs/plan-erp/02-LUCA-ENVANTERI.md:48`).
3. **Stok hareketleri.** Giriş, çıkış, devir, transfer, sayım, düzeltme.
4. **Maliyetlendirme.** FIFO ve ağırlıklı ortalama; **Luca'da FIFO öne çıkıyor**
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:11`, `:36` — orada cari yaşlandırma bağlamında geçer).
5. **Sayım ve barkod.** Luca'da "faturadan hızlı barkod ile sayım ve seri takibi" vardır
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:30`).
6. **Stok raporları.** Envanter değeri, hareket dökümü, kritik seviye.
7. **Reçete ile bağlantı.** `20-URETIM-RECETE.md` (bu doküman yalnız bağlantı noktasını tanımlar).
8. **Mevcut tablolar ve yeni tablolar.** `StockItem`, `StockMovement`, `Warehouse`.
9. **Ekranlar ve test senaryoları.**

Kapsam dışı: üretim emri ve reçete yapısı (`20-URETIM-RECETE.md`), barkodlu sayım terminali/telefon
uygulaması ayrıntısı (`21-SAYIM-BARKOD.md`), satın alma süreci ve mal kabul
(`12-SATIN-ALMA.md`), sabit kıymet ve amortisman (`19-SABIT-KIYMET.md`), muhasebe fişi ve stok
değerleme fişi (`06-MUHASEBE-MOTORU.md`), ithalat/döviz maliyeti (`22-ITHALAT-IHRACAT-DOVIZ.md`).

**Önemli sınır:** Bu modül bir **ticari mal** stoğu kurmaz (lojistik firması mal almaz/satmaz). Kurduğu
şey **işletme stoğudur**: araç sarf malzemesi, lastik, yedek parça, yağ, dorse ekipmanı, ambalaj.
Modül, ileride ticari mal satışına da açılabilecek biçimde tasarlanır ama bugünkü kapsam bu değildir.

## 2. Luca'daki karşılığı

Luca sitesinden okunabilenler (`docs/plan-erp/02-LUCA-ENVANTERI.md`):

- **Luca Koza Standart** sürümünde **"Stok Yönetimi"** ayrı bir menüdür; **Profesyonel** sürüm ek olarak
  Satış, Satınalma, Analizler ve Gelir-Gider Yönetimi getirir
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:12`, `:20-21`).
- **"Birden fazla depo ve depo bölümü bazında stok takibi"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:48`).
- **"Barkod: faturadan hızlı barkod ile sayım ve seri takibi"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:30`).
- **"Stok detay bilgileri; stoklar alt kategorilere ayrılır, alt ürün grubu bazında rapor"**
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:33`).
- **"Sürükle-bırak üretim akış diyagramı, paket uygulamaları ve üretim reçetesi, akışa göre ürün
  maliyetlendirme"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:37`).
- **"FIFO cari yaşlandırma ve adat (faiz) hesaplama"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:36`).
- **"Stok/fatura/finans hareketlerinde 'işletmeye özel hareket tanımlama' ve hareket bazında gruplama"**
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:62`).
- Stok kartlarının **Excel ile aktarımı** (`docs/plan-erp/02-LUCA-ENVANTERI.md:28`).
- **"Sigortaya konu ürünlerin stok kalemi olarak açılması"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:41`).
- Luca Net One ve Luca Rota'nın stok kapsamı **okunmadı** (`docs/plan-erp/02-LUCA-ENVANTERI.md:13-14`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>,
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**Doğrulanacak (Luca tarafı):**

- **doğrulanacak:** Luca'da stok **maliyet yöntemi** seçenekleri (FIFO, ağırlıklı ortalama, LIFO,
  standart) ve varsayılanı; kullanıcı yöntemi stok kartı bazında mı, firma bazında mı seçiyor
  (Luca kullanıcı kılavuzu/demo).
- **doğrulanacak:** "FIFO cari yaşlandırma" ifadesinin stok maliyetiyle ilgisi var mı, yoksa yalnız
  cari (alacak) yaşlandırması mı (Luca ürün sayfası metni bunu ayırmıyor).
- **doğrulanacak:** Luca'da stok kartı alanlarının **tam listesi** (kod biçimi, birim seti, kritik
  seviye, raf/bölüm, muadil kod).
- **doğrulanacak:** Luca'da seri/lot takibinin hangi durumlarda zorunlu olduğu ve lot maliyetinin nasıl
  hesaplandığı.
- **doğrulanacak:** Luca'da barkod biçimi (EAN-13, Code128, QR) ve faturadan sayım akışının ekranı.
- **doğrulanacak:** Luca'da **depo bazlı** maliyetlendirme var mı, yoksa maliyet firma genelinde mi.
- **doğrulanacak:** Luca'da sayım farkının muhasebeleştirilme biçimi (bu `06-MUHASEBE-MOTORU.md`'ye
  bağlıdır ve **mali müşavir onayı** gerektirir).
- **doğrulanacak:** Luca'da stok değerleme raporunun hangi yöntemle ve hangi tarihte değer biçtiği.

## 3. Bizde bugün

### 3.1 Yokluk kanıtı

Repoda stok/depo modülü **yoktur**. Aranan desenler ve sonuçları:

| Aranan | Sonuç |
|---|---|
| `StockItem`, `StockMovement`, `Warehouse` | **Hiç eşleşme yok** (kod ve doküman) |
| `Barcode`, `Barkod` (kod) | **Kod eşleşmesi yok**; yalnız `docs/plan-erp/02-LUCA-ENVANTERI.md:30` (Luca) ve `docs/plan-erp/00-DIZIN.md:39` (planlanan `21-SAYIM-BARKOD.md`) |
| `FIFO`, `WeightedAverage` | `FIFO` yalnız **ödeme dağıtımı** bağlamında: `server/YesLojistik.Core/Domain/PaymentAllocator.cs:15`, `server/YesLojistik.Infrastructure/Services/PayableService.cs:19`. `WeightedAverage` **hiç yok** |
| `Sayım` (kod) | Yalnız **veri sayımı** (taşınma kontrolü): `client/src/pages/SettingsPage.tsx:622-650` — stok sayımı değil |
| `Lot`, `Seri`, `Reçete`, `BOM` | **Kod eşleşmesi yok**; "reçete" yalnız `docs/plan-erp/02-LUCA-ENVANTERI.md:37` ve planlanan `20-URETIM-RECETE.md` |
| `Inventory` | **Hiç eşleşme yok** |

**Yetkili tablo listesi:** `AppDbContext` içindeki tüm `DbSet` bildirimleri
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43`) incelendi; aralarında stok/depo
tablosu **yoktur**. Mevcut 34 DbSet şunlardır: `Users`, `RefreshTokens`, `Customers`, `Vehicles`,
`Drivers`, `Trips`, `JobRequests`, `Invoices`, `InvoiceLines`, `Payments`, `Expenses`,
`CompanySettings`, `TripAttachments`, `VehicleLocations`, `PushTokens`, `NotificationPreferences`,
`PasswordResetTokens`, `EInvoiceSequences`, `AuditLogs`, `StoredFiles`, `Suppliers`, `TripEvents`,
`SupplierPayments`, `DriverSettlements`, `Staff`, `StaffTransactions`, `RecurringPayments`,
`Documents`, `MaintenanceRecords`, `CashAccounts`, `CashTransfers`, `PurchaseInvoices`,
`CustomerGroups`, `InvoiceNotes`.

### 3.2 Bugün stoğa benzeyen ama stok olmayan şeyler

Bunlar modülün **komşularıdır**; plan bunları bozmaz, bağlanır.

**(a) Gider kategorileri.** `ExpenseCategory` yedi kategori taşır:
`Fuel, Maintenance, Toll, DriverAllowance, Tire, Insurance, Tax, Other, DriverAdvance`
(`server/YesLojistik.Core/Entities/Enums.cs:43`). Bunların içinde **lastik** (`Tire`) ve
**bakım/onarım** (`Maintenance`) stokla doğrudan kesişir. KDV varsayılanı yakıt/bakım/lastik/otoyol/diğer
için %20, diğerleri %0'dır (`server/YesLojistik.Core/Domain/ExpenseVat.cs:14-18`).
Gider tutarı **KDV dahil** girilir (`server/YesLojistik.Core/Entities/Expense.cs:7`) ve kâr hesabında
KDV hariç tutar kullanılır (`docs/KDV-KURALLARI.md:33`).

**(b) Bakım kayıtları.** `MaintenanceRecord`: `VehicleId`, `Date`, `Km`, `Type`
(`Periodic, Oil, Tire, Brake, Breakdown, Other`), `Description`, `Cost`, `SupplierId`, `NextDueKm`,
`NextDueDate`, `ExpenseId` (`server/YesLojistik.Core/Entities/MaintenanceRecord.cs:6-18`). Yani
**lastik bakımı ve maliyeti** bugün vardır — ama **kaç lastik**, hangi depoda, hangi maliyetle,
bilinmez. Bu modülün en somut kazanç noktası budur.

**(c) Araç sarf alanları.** `Vehicle`: `Km`, `LastMaintenanceDate`, `NextMaintenanceDate`,
`NextMaintenanceKm`, `FuelType`, `InsuranceInfo`, `CascoInfo`, `MaintenanceInfo`
(`server/YesLojistik.Core/Entities/Vehicle.cs:10-11`, `:33`, `:40`). Bunlar **miktar** değil **özet**
tutarlar.

**(d) Yakıt detayı.** Gider üzerinde `Liters`, `Odometer`, `UnitPrice`, `FuelStation`, `FuelType`,
`PreviousOdometer` alanları vardır (`server/YesLojistik.Core/Entities/Expense.cs:20-22`, `:53-56`) ve
yakıt alımında araç kilometresi güncellenir
(`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:96-101`). Bu, **miktar + birim fiyat**
tutan tek mevcut yapıdır; stok maliyet modeline en yakın örnektir.

**(e) Alınan fatura.** `PurchaseInvoice` ve `PurchaseInvoiceKind`
(`EInvoice, EArchive, Paper, Receipt` — `server/YesLojistik.Core/Entities/Enums.cs:22`) ile tedarikçi
faturası kaydedilir; ama **satırları mal değil tutardır**. Mal kabul ile stok girişi bağlantısı
`12-SATIN-ALMA.md` konusudur.

**(f) Maliyet hesabı.** Sevkiyat kazancı `TripFigures` üzerinden hesaplanır ve giderlerin **KDV hariç**
tutarı düşülür (`server/YesLojistik.Infrastructure/Services/TripFigures.cs:20`). Stok maliyeti diye bir
kavram **yoktur**.

### 3.3 Eksik listesi

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | Stok kartı | `StockItem` grep: eşleşme yok |
| 2 | Depo | `Warehouse` grep: eşleşme yok |
| 3 | Stok hareketi | `StockMovement` grep: eşleşme yok |
| 4 | Barkod | Kod eşleşmesi yok |
| 5 | Seri/lot takibi | Kod eşleşmesi yok |
| 6 | Maliyet yöntemi (FIFO/ortalama) | `WeightedAverage` yok; `FIFO` yalnız `PaymentAllocator.cs:15` |
| 7 | Kritik seviye | Kod eşleşmesi yok |
| 8 | Sayım | Yalnız veri sayımı: `SettingsPage.tsx:622` |
| 9 | Transfer | Kod eşleşmesi yok |
| 10 | Reçete | Kod eşleşmesi yok |
| 11 | Envanter değeri raporu | Kod eşleşmesi yok |
| 12 | Depo bazlı rapor | Kod eşleşmesi yok |
| 13 | Mal kabul | Kod eşleşmesi yok (`12-SATIN-ALMA.md`) |

## 4. Hedef ekranlar ve alanlar

Ortak parçalar yeniden kullanılır ve **hepsi mevcuttur**: `PageShell`
(`client/src/components/shell/PageShell.tsx:28`), `DataTable` (`client/src/components/DataTable.tsx:66`),
`SearchBox` (`:179`), `MobileCards` (`client/src/components/shell/MobileCards.tsx:45`), `DetailDrawer`
(`client/src/components/shell/DetailDrawer.tsx:33`), `FilterBar`/`FilterPanel`
(`client/src/components/shell/FilterPanel.tsx:7`, `:35`), `MoreMenu`/`RowMenu`
(`client/src/components/shell/Menu.tsx:63`, `:75`), `Modal` (`client/src/components/ui.tsx:156`),
`Tabs` (`:300`), `SumStrip` (`client/src/components/SumStrip.tsx:12`), `Figures`/`Figure`
(`client/src/components/ui.tsx:350`, `:355`), `Empty`/`ErrorState`/`TableSkeleton`
(`client/src/components/ui.tsx:271`, `:255`, `:285`), `AmountInput`/`Section`/`MoreFields`
(`client/src/components/Inputs.tsx:26`, `:173`, `:189`).

**Kural:** yeni görsel dil icat edilmez; menüye `Öz Mal` grubundan sonra yeni bir **`Stok`** grubu
eklenir ve `client/src/lib/nav.ts` içindeki mevcut yapı korunarak genişletilir
(`classicNav`: `client/src/lib/nav.ts:19-66`; `newNav`: `:72-114`).

### 4.1 Ekran: Stok Kartları (`/stok/kartlar`)

**Liste sütunları:** Kod · Ad · Kategori · Birim · Barkod · Toplam stok (tüm depo) · Kritik · Maliyet
yöntemi · Durum.

| Alan | Tip | Zorunlu | Davranış / hata metni |
|---|---|---|---|
| Kod | metin (30) | Evet | Benzersiz; `"Bu stok kodu zaten var: {kod}"` |
| Ad | metin (200) | Evet | `"Stok adı zorunlu."` |
| Kategori / Alt kategori | seçim + seçim | Evet / Hayır | Luca'da alt kategori vardır (`02-LUCA-ENVANTERI.md:33`) |
| Marka | metin (60) | Hayır | |
| Birim | seçim | Evet | `Adet, Litre, Metre, Kilogram, Takım, Paket` |
| KDV oranı | seçim | Evet | Bugünkü seçilebilir oranlar korunur: %0, %1, %10, %20 (`docs/KDV-KURALLARI.md:19`) |
| Barkod | metin (50) | Hayır | Benzersiz; **doğrulanacak:** biçim (EAN-13/Code128/QR) |
| Seri/lot takibi | seçim | Evet | `Yok`, `Lot`, `Seri` |
| Kritik seviye | sayı (3 ondalık) | Hayır | Altına düşünce uyarı |
| Maliyet yöntemi | seçim | Evet | `FIFO`, `Ağırlıklı ortalama` |
| Minimum/maksimum | sayı | Hayır | Sipariş önerisi için (`12-SATIN-ALMA.md`) |
| Durum | seçim | — | Aktif/Pasif |

### 4.2 Ekran: Depolar (`/stok/depolar`)

**Sütunlar:** Kod · Ad · Tür · Sorumlu · Adres · Bölüm sayısı · Kayıtlı kalem · Envanter değeri.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kod | metin (10) | Evet | Benzersiz |
| Ad | metin (100) | Evet | Ör. `Merkez Depo`, `Atölye` |
| Tür | seçim | Evet | `Ana depo`, `Araç deposu`, `Bölüm`, `Sanal (yolda)` |
| Bölümler | alt liste | Hayır | Luca'daki "depo bölümü" karşılığı (`02-LUCA-ENVANTERI.md:48`) |
| Sorumlu | seçim (personel) | Hayır | `Staff` listesinden (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:34`) |
| Varsayılan | onay kutusu | — | Tek depo varsayılan olur |

### 4.3 Ekran: Stok Hareketleri (`/stok/hareketler`)

**Sütunlar:** Tarih · Belge No · Tür (rozet) · Stok · Depo · Miktar · Birim · Birim maliyet · Tutar ·
Karşı depo (transfer) · Kaynak (sevkiyat/fatura/elle) · Kullanıcı.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Hareket türü | seçim | Evet | `Giriş`, `Çıkış`, `Devir`, `Transfer`, `Sayım`, `Düzeltme` |
| Tarih | tarih | Evet | Dönem kilidi kontrolü (`07` §5.3) |
| Depo | seçim | Evet | Transfer'de **çıkış** deposu |
| Hedef depo | seçim | Transfer'de Evet | Kaynak ≠ hedef: `"Çıkış ve giriş deposu aynı olamaz."` |
| Stok | seçim | Evet | Aktif kartlar |
| Lot/Seri | metin | Takip varsa Evet | Seri takibinde benzersiz |
| Miktar | sayı (3 ondalık) | Evet | Çıkışta stoktan fazla: `"Depoda yeterli stok yok ({mevcut} {birim})."` |
| Birim maliyet | para | Girişte Evet | Çıkışta FIFO/ortalama ile hesaplanır, salt okunur |
| Belge / açıklama | metin (300) | Hayır | |

### 4.4 Ekran: Sayım (`/stok/sayim`)

**Adımlar:** sayım başlat (depo + kapsam) → sayım listesi (kör sayım seçeneği) → sayılan miktar girişi →
**fark önizlemesi** → onay → düzeltme hareketi.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Depo / bölüm | seçim | Evet | Sayım kapsamı |
| Kapsam | seçim | Evet | `Tüm stoklar`, `Kategori`, `Rafta olanlar`, `Kritik seviye altı` |
| Kör sayım | onay kutusu | — | Sistem miktarı gizlenir |
| Sayılan miktar | sayı | Evet | Barkod ile veya elle |
| Fark | salt okunur | — | `sayılan − sistem`; renkli |
| Fark gerekçesi | metin (300) | Farkta Evet | `"Fark varsa gerekçe yazın."` |
| Onay | düğme | — | Onaydan sonra düzeltme hareketleri yazılır |

### 4.5 Ekran: Stok Raporları (`/stok/raporlar`)

`Tabs`: `Envanter değeri` · `Hareket dökümü` · `Kritik seviye` · `Depo karşılaştırma` · `Devir hızı`.

- **Envanter değeri:** depo/kategori bazında miktar × maliyet; toplam `SumStrip` ile.
- **Hareket dökümü:** stok seçilir, tarih aralığı verilir, giriş/çıkış ve yürüyen miktar listelenir.
- **Kritik seviye:** kritik altına düşenler; mevcut uyarı sistemine bağlanır
  (`server/YesLojistik.Infrastructure/Services/AlertService.cs`).
- **Depo karşılaştırma:** aynı stokun depolara göre dağılımı.
- **Devir hızı:** dönem çıkışı / ortalama stok.

### 4.6 Ekran: Barkodlu Sayım (telefon)

`21-SAYIM-BARKOD.md` kapsamındadır; bu doküman yalnız uç noktaları ve biçimi tanımlar (§7, §5.6).
Bugünkü `MobileCards` deseni kullanılır (`client/src/components/shell/MobileCards.tsx:45`) ve şoför
uygulamasındaki çevrimdışı kuyruk yaklaşımı (aynı isteğin iki kez gelmesini engelleyen
`ClientRequestId`, `server/YesLojistik.Core/Entities/Expense.cs:38`) **aynı desen** olarak yeniden
kullanılır.

## 5. İş kuralları

### 5.1 Stok kartı

1. **Kod benzersizdir.** Boş kod yoktur; kod değiştirilebilir ama eski kod `StockItemAlias` benzeri bir
   ek tablo **açılmadan** yalnız denetim izinde kalır (gereksiz tablo açmama ilkesi).
2. **Birim değiştirilemez** hareket varsa. Gerekçe: adet → litre dönüşümü geçmiş miktarları anlamsız
   kılar. Birim değişikliği yeni kart açmayı gerektirir.
3. **Maliyet yöntemi hareket varsa değiştirilemez.** Gerekçe: yöntem değişince geçmiş maliyetler
   yeniden hesaplanamaz (elimizde yeterli geçmiş yoksa) ve raporlar tutarsızlaşır.
4. **Pasif kart** seçim listelerinde görünmez; mevcut ilke korunur
   (`client/src/components/SupplierForm.tsx:92`).
5. **Kritik seviye** negatif olamaz; `0` = takip kapalı.

### 5.2 Depo

1. **En az bir depo zorunludur.** İlk kurulumda `Merkez Depo` oluşturulur ve varsayılan işaretlenir.
2. **Varsayılan depo silinemez**; önce başka bir depo varsayılan yapılır.
3. **Hareketi olan depo silinemez**, yalnız pasife alınır — bugünkü cari silme kuralının aynısı
   (`client/src/pages/CustomerDetailPage.tsx:45-46`).
4. **Depo bölümü** deponun alt kırılımıdır; miktar bölüm bazında izlenir, maliyet **depo** bazındadır.
   Gerekçe: bölüm sayısı sınırsız olabilir; her bölüm için maliyet katmanı tutmak ölçeklenmez.

### 5.3 Stok hareketleri

| Tür | Miktar yönü | Maliyet | Ne zaman |
|---|---|---|---|
| Giriş | + | Girilen birim maliyet | Satın alma, mal kabul, iade girişi |
| Çıkış | − | FIFO veya ortalama ile **hesaplanır** | Kullanım, sarf, satış, fire |
| Devir | + | Devir maliyeti (elle) | Sistem geçişi |
| Transfer | − kaynak / + hedef | Kaynak deponun maliyeti **aynen taşınır** | Depolar arası |
| Sayım | ± (fark) | Sayım anındaki maliyet | Sayım onayı |
| Düzeltme | ± | Elle (gerekçeli) | Hata düzeltme |

Kurallar:

1. **Miktar üç ondalıktır.** Yakıt/yağ gibi kalemler litre olarak küsuratlıdır; bugünkü para yuvarlaması
   `Money.Round` iledir (`server/YesLojistik.Core/Domain/Money.cs`) — stok miktarı için ayrı, 3 haneli
   yuvarlama kullanılır.
2. **Negatif stok engellenir.** Çıkış/transfer, mevcut miktarı aşamaz
   (`"Depoda yeterli stok yok ({mevcut} {birim})."`). Firma ayarından "negatif stok izinli" açılabilir;
   **varsayılan kapalıdır**. Gerekçe: sessiz negatif stok, maliyet hesabını bozar.
3. **Hareket silinemez.** Yanlış hareket, **ters kayıtla** (Düzeltme) kapatılır ve gerekçe zorunludur.
   Gerekçe: silme, envanter değerini geçmişe dönük sessizce değiştirir. Bugünkü "hareketi olan cari
   silinemez" ilkesinin aynısı.
4. **Dönem kilidi.** Kilitli döneme hareket yazılamaz (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.3).
   Bugün `ExpenseService` benzer bir kontrol içermez; yeni `PeriodLockGuard` filtresi kullanılır
   (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:12` deseni).
5. **Belge bağı.** Bir hareket bir kaynağa bağlanabilir: alınan fatura (`PurchaseInvoice`), gider
   (`Expense`), sevkiyat (`Trip`) veya üretim emri (`20`). Kaynak iptal edilirse hareket **otomatik
   silinmez**; ters kayıt **önerilir** ve kullanıcı onaylar.
6. **Kayıt izi.** Her harekette kullanıcı ve an tutulur; bugünkü denetim izi otomatik çalışır
   (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).

### 5.4 Maliyetlendirme

**FIFO (ilk giren ilk çıkar):**

1. Her **giriş** kendi katmanını (tarih, miktar, birim maliyet, kalan miktar) oluşturur.
2. Bir **çıkış**, en eski kalan katmandan başlayarak tüketir.
3. Çıkış maliyeti = tüketilen katmanların maliyet toplamı ÷ çıkış miktarı.
4. Katmanlar depo bazındadır (bkz. §5.2.4).

**Ağırlıklı ortalama:**

1. Ortalama = toplam değer ÷ toplam miktar; her girişte yeniden hesaplanır.
2. Çıkış, o anki ortalamadan değerlenir.
3. Ortalama depo bazındadır.

Kurallar:

1. **Yöntem kart bazındadır**, firma bazında değil. Gerekçe: lastik FIFO ile, sarf malzemesi ortalama
   ile izlenmek istenebilir.
2. **Maliyet hesabı sunucudadır ve tek yerde durur.** Bugün kâr formülü tek yerde tutulur
   (`server/YesLojistik.Infrastructure/Services/TripFigures.cs:9-11` "formül tek yerde kalır");
   stok maliyeti de aynı ilkeye uyar: `StockCosting` sınıfı, birim testiyle sabitlenir.
3. **Ortalama 4 ondalık** tutulur, sunumda 2 ondalık gösterilir. Gerekçe: ara yuvarlama, çok sayıda
   harekette toplam değeri kaydırır.
4. **Yuvarlama farkı** envanter değeri raporunda `Yuvarlama farkı` satırı olarak görünür; gizlenmez.
5. **KDV maliyete girmez.** Bugün giderler KDV hariç hesaplanır (`docs/KDV-KURALLARI.md:33`,
   `server/YesLojistik.Core/Domain/ExpenseVat.cs:23`); stok maliyeti de **KDV hariçtir**. Gerekçe:
   firma ödediği KDV'yi indirir.
6. **Yan maliyetler** (nakliye, gümrük) giriş maliyetine eklenebilir; bu `22-ITHALAT-IHRACAT-DOVIZ.md`
   kapsamındadır ve şimdi uygulanmaz.

### 5.5 Sayım

1. **Sayım anlık görüntüdür.** Başlatıldığında sistem miktarları kopyalanır; sayım sırasında yapılan
   hareketler sayım kaydını **etkilemez**, fark raporunda "sayım sonrası hareket" olarak işaretlenir.
2. **Kör sayım** varsayılandır. Gerekçe: sayan kişi sistem miktarını görürse farkı gizler.
3. **Fark gerekçesi zorunludur** (masraf ret gerekçesiyle aynı ilke:
   `server/YesLojistik.Infrastructure/Services/ExpenseService.cs:35`).
4. **Fark onaylanmadan stok düzeltilmez.** Onay, düzeltme hareketlerini tek transaction'da yazar.
5. **Fark tutarı eşiği.** Belirlenen tutarın üzerindeki fark `Admin` onayı ister
   (`07` §5.2 maker-checker). Eşik ayardan gelir; kodda sabit yoktur.
6. **Sayım kapatıldıktan sonra değiştirilemez.** Yeni sayım açılır.

### 5.6 Barkod

1. **Barkod benzersizdir** ama boş olabilir. Gerekçe: her sarf kaleminin barkodu yoktur.
2. **Biçim doğrulanacak:** EAN-13/Code128/QR kararı verilmeden biçim kuralı kodlanmaz.
3. **Barkod okuma** iki yerde çalışır: masaüstü (klavye emülasyonlu okuyucu) ve telefon
   (`21-SAYIM-BARKOD.md`).
4. **Faturadan sayım.** Luca'da "faturadan hızlı barkod ile sayım" vardır
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:30`); bizde karşılığı: alınan faturanın satırlarından sayım
   listesi üretme. **Bu, alınan faturada mal satırı olmadığı için bugün mümkün değildir**; bağımlılık
   `12-SATIN-ALMA.md`'dir (mal kabul satırları).
5. **Etiket yazdırma** kapsam dışıdır; `21-SAYIM-BARKOD.md`.

### 5.7 Reçete bağlantısı

- Reçete, bir mamulün hangi stoklardan hangi miktarda üretildiğini tanımlar; **tanımı**
  `20-URETIM-RECETE.md`'dedir.
- Bu dokümanın devrettiği iki nokta: (a) reçete satırları `StockItem`e bağlanır, (b) üretim emri
  çıkışları **stok çıkış hareketi** üretir ve maliyet `StockCosting` ile hesaplanır. Böylece mamul
  maliyeti, mevcut "formül tek yerde" ilkesiyle uyumlu biçimde tek noktadan çıkar
  (`TripFigures.cs:9-11`).

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. Aşağıdaki tüm
tablolar **yenidir**; mevcut hiçbir tabloya veri dönüştüren migration yazılmaz.

### 6.1 Yeni tablo: `StockItem` (stok kartı)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Code` | string(30) | **Tekil** |
| `Name` | string(200) | |
| `CategoryId` / `SubCategoryId` | int? | Luca'daki alt kategori (`02-LUCA-ENVANTERI.md:33`) |
| `Brand` | string(60)? | |
| `Unit` | yeni enum | `Piece, Liter, Meter, Kilogram, Set, Package` |
| `VatRate` | decimal(5,2) | Bugünkü oranlar: 0/1/10/20 (`docs/KDV-KURALLARI.md:19`) |
| `Barcode` | string(50)? | **Kısmi tekil** (boşlar muaf) |
| `Tracking` | yeni enum | `None, Lot, Serial` |
| `CriticalLevel` | decimal(18,3)? | Boş/0 = takip kapalı |
| `MinLevel` / `MaxLevel` | decimal(18,3)? | Sipariş önerisi |
| `CostingMethod` | yeni enum | `Fifo, WeightedAverage` |
| `IsActive` | bool | |
| `Notes` | string(500)? | |

İndeksler: `Code` tekil, `Barcode` kısmi tekil, `(CategoryId, SubCategoryId)`, `(Name)`.
`BaseEntity` türevi olduğu için denetim izi **otomatik** çalışır
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56`).

### 6.2 Yeni tablo: `StockCategory` (kategori / alt kategori)

`Id`, `Name`, `ParentId` (kendine referans), `IsActive`. Tekil: `(ParentId, Name)`. Neden ayrı tablo:
kategori listesi kullanıcı tarafından düzenlenir; `Expense.CategoryName` alanındaki gibi serbest metin
tutmak raporlamayı bozar (`server/YesLojistik.Core/Entities/Expense.cs:46` — bugünkü serbest metin
yaklaşımı).

### 6.3 Yeni tablo: `Warehouse` (depo)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Code` | string(10) | Tekil |
| `Name` | string(100) | |
| `Kind` | yeni enum | `Main, Vehicle, Section, Virtual` |
| `Address` | string(300)? | |
| `StaffId` | int? | Sorumlu — `Staff` tablosuna bağ (`AppDbContext.cs:34`) |
| `IsDefault` | bool | Tek depo varsayılan |
| `IsActive` | bool | |

### 6.4 Yeni tablo: `WarehouseSection` (depo bölümü)

`Id`, `WarehouseId`, `Code` (string(20)), `Name`. Tekil: `(WarehouseId, Code)`.
Bölüm bazında **miktar** izlenir; maliyet depo bazındadır (§5.2.4).

### 6.5 Yeni tablo: `StockMovement` (stok hareketi)

| Alan | Tip | Not |
|---|---|---|
| `Id` | long, PK | Hacim yüksek; `long` seçilir |
| `Date` | DateOnly | Dönem kilidi kontrol edilir |
| `Kind` | yeni enum | `In, Out, Opening, Transfer, Count, Adjust` |
| `StockItemId` | int | |
| `WarehouseId` | int | Transfer'de **çıkış** deposu |
| `TargetWarehouseId` | int? | Transfer'de **giriş** deposu |
| `SectionId` / `TargetSectionId` | int? | Bölüm |
| `Quantity` | decimal(18,3) | Yön `Kind`'dan gelir |
| `UnitCost` | decimal(18,4) | Girişte girilir; çıkışta hesaplanır |
| `TotalCost` | decimal(18,2) | `Quantity × UnitCost` |
| `LotNo` / `SerialNo` | string(50)? | Takip varsa |
| `SourceKind` / `SourceId` | yeni enum? / long? | Bağlı belge (alınan fatura, gider, sevkiyat, üretim) |
| `CountId` | int? | Sayım kaydı |
| `Reason` | string(300)? | Düzeltme/sayım farkı gerekçesi |
| `ReversesMovementId` | long? | Ters kayıt bağı |
| `UserName` | string? | Kullanıcı (bugünkü `Expense.ReviewedBy` deseni: `Expense.cs:36`) |

İndeksler: `(StockItemId, WarehouseId, Date)`, `(Date)`, `(SourceKind, SourceId)`, `(CountId)`,
`(LotNo)`, `(SerialNo)`.
**Not:** `BaseEntity` türevi yapılırsa denetim izi her hareketi kaydeder; hacim yüksekse yalnız
`StockItemId`/`Kind`/`Quantity` özeti izlenir (uygulama sırasında karar; `AuditTrail.Ignored` listesine
ekleme yolu vardır: `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:12-21`).

### 6.6 Yeni tablo: `StockCostLayer` (FIFO katmanı)

`Id`, `StockItemId`, `WarehouseId`, `Date`, `MovementId`, `Quantity` (giren), `Remaining`
(kalan), `UnitCost`, `LotNo?`. İndeks: `(StockItemId, WarehouseId, Date, Id)`.
Yalnız `Fifo` yönteminde kullanılır. **Ağırlıklı ortalama** için katman tutulmaz; ortalama
`StockBalance`'ta saklanır.

### 6.7 Yeni tablo: `StockBalance` (anlık bakiye — türetilmiş ama saklanan)

`StockItemId`, `WarehouseId`, `SectionId?`, `Quantity` (decimal 18,3), `AverageCost` (decimal 18,4),
`UpdatedAt`. Tekil: `(StockItemId, WarehouseId, SectionId)`.

**Neden saklanır, neden hesaplanmaz?** Cari bakiyesi bugün her seferinde hesaplanır ve bu doğrudur
(`server/YesLojistik.Infrastructure/Services/BalanceService.cs:8` "Bakiye saklanmaz"). Stok için aynı
yaklaşım **pahalıdır**: her stok kartı × depo × hareket için FIFO zinciri yürütmek gerekir. Bu yüzden
bakiye **saklanır** ve her hareketle **tek transaction içinde** güncellenir. Tutarlılık için:
(a) bakiye yalnız hareket servisinden yazılır, (b) `36-PERFORMANS-OLCEK.md` için bir "bakiyeyi yeniden
kur" komutu bulunur ve (c) bir birim testi, saklanan bakiyenin hareketlerden yeniden hesaplanan
bakiyeyle **aynı** olduğunu doğrular. Bu, bilinçli bir sapmadır ve gerekçesi burada yazılıdır.

### 6.8 Yeni tablo: `StockCount` / `StockCountLine` (sayım)

`StockCount`: `Id`, `WarehouseId`, `StartedAt`, `StartedBy`, `ClosedAt?`, `ClosedBy?`, `Status`
(`Open, Counting, PendingApproval, Closed, Cancelled`), `Blind` (bool), `Scope`, `Note`.
`StockCountLine`: `Id`, `CountId`, `StockItemId`, `SectionId?`, `SystemQuantity`, `CountedQuantity?`,
`Difference` (hesaplanır), `UnitCost`, `Reason`, `LotNo?`, `SerialNo?`.
Tekil: `(CountId, StockItemId, SectionId, LotNo, SerialNo)`.

### 6.9 Mevcut tablolara eklenecek sütunlar (hepsi boş olabilir)

| Tablo | Sütun | Tip | Neden |
|---|---|---|---|
| `Expenses` | `StockMovementId` | long? | Sarf gideri stok çıkışına bağlanabilir |
| `PurchaseInvoices` | — | — | **Dokunulmaz**; mal kabul satırları `12-SATIN-ALMA.md`'de |
| `MaintenanceRecords` | `StockMovementIds` | dizi? | Değişen parçaların stoğa bağlanması |
| `CompanySettings` | `StockNegativeAllowed` | bool | Negatif stok izni (§5.3.2) |
| `CompanySettings` | `StockCountApprovalLimit` | decimal? | Sayım farkı onay eşiği (§5.5.5) |

`MaintenanceRecords.StockMovementIds` için saklama yöntemi, `SupplierPayment.TripIds`'in bugünkü
yöntemiyle **aynı** olur (`server/YesLojistik.Core/Entities/SupplierPayment.cs:15`); yeni bir dizi
saklama biçimi icat edilmez.

### 6.10 Tablo sayısı ve geçiş

Yeni tablolar: `StockItem`, `StockCategory`, `Warehouse`, `WarehouseSection`, `StockMovement`,
`StockCostLayer`, `StockBalance`, `StockCount`, `StockCountLine` — **9 tablo**. Mevcut tablolara **5**
boş olabilen sütun. Hiçbir mevcut tablo silinmez, hiçbir sütun tipi değişmez. Tablolar boş başlar;
stok modülü kullanılmazsa panel bugünkü gibi çalışır.

### 6.11 Geçiş planı (mevcut veriden)

1. **Devir hareketi.** Kullanıcı mevcut stok miktarlarını Excel'den aktarır
   (`Stok Devri` şablonu); her satır `Opening` türünde hareket olur. Kaynak: bugünkü Excel aktarma
   altyapısı (`client/src/components/ImportWizard.tsx`, `wizardEntities`) ve
   `server/YesLojistik.Infrastructure/Services/ImportService.cs`.
2. **Gider eşleştirmesi.** Geçmiş lastik/bakım giderleri **stoğa çevrilmez** (geçmiş veriyi
   dönüştürmek yasak: §1.5). Yalnız bundan sonraki giderler stok çıkışına bağlanabilir.
3. **Araç stoğu.** Kullanıcı isterse her araç için `Vehicle` türünde sanal depo açar; bu **isteğe
   bağlıdır** ve zorunlu kılınmaz.

## 7. API uçları

Desen bugünküyle aynıdır: denetleyici başına politika, `PagedResult<T>` listeleri
(`server/YesLojistik.Api/Controllers/ExpensesController.cs:54-55`), `DomainException` ile sade Türkçe
hata, dışa aktarma uçları (`:88-89`), yetki gerektiren yazma uçları (`:145`, `:154`).

### 7.1 Stok kartı

| Metot | Yol | Yetki | Not |
|---|---|---|---|
| GET | `/api/stock/items` | Ofis | `search, categoryId, active, page` |
| GET | `/api/stock/items/{id}` | Ofis | Kart + bakiye özeti |
| POST | `/api/stock/items` | `Operations` | Yeni kart |
| PUT | `/api/stock/items/{id}` | `Operations` | Düzeltme (birim/yöntem kuralı §5.1) |
| DELETE | `/api/stock/items/{id}` | `Admin` | Hareketi varsa reddedilir → pasife alma |
| GET | `/api/stock/items/export` | Ofis | Excel |
| GET | `/api/stock/items/lookup` | Ofis | Seçim listesi |
| GET | `/api/stock/categories` | Ofis | Kategori ağacı |
| POST/PUT/DELETE | `/api/stock/categories[/{id}]` | `Operations` | Kategori yönetimi |

### 7.2 Depo

| Metot | Yol | Yetki |
|---|---|---|
| GET | `/api/stock/warehouses` | Ofis |
| POST/PUT | `/api/stock/warehouses[/{id}]` | `Operations` |
| DELETE | `/api/stock/warehouses/{id}` | `Admin` (varsayılan/hareketli depo reddedilir) |
| GET/POST/PUT | `/api/stock/warehouses/{id}/sections[/{sectionId}]` | `Operations` |

### 7.3 Hareket

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/stock/movements` | `stockItemId, warehouseId, kind, from, to, page` | `PagedResult<StockMovementDto>` | Ofis |
| POST | `/api/stock/movements` | Hareket gövdesi | `StockMovementDto` | `Operations` |
| POST | `/api/stock/movements/{id}/reverse` | `{ reason }` | Ters hareket | `Operations` |
| GET | `/api/stock/movements/export` | Aynı süzgeçler | Excel | Ofis |
| GET | `/api/stock/balances` | `warehouseId, categoryId, belowCritical` | Bakiye listesi | Ofis |

### 7.4 Sayım ve barkod

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| POST | `/api/stock/counts` | `{ warehouseId, scope, blind }` | Sayım | `Operations` |
| GET | `/api/stock/counts/{id}` | — | Sayım + satırlar | Ofis |
| PUT | `/api/stock/counts/{id}/lines` | Sayılan miktarlar (toplu) | Sayım | `Operations` |
| POST | `/api/stock/counts/{id}/close` | `{ note? }` | Sayım | `Operations` (eşik üstü `Admin` onayı) |
| GET | `/api/stock/counts/{id}/variance` | — | Fark listesi | Ofis |
| GET | `/api/stock/items/by-barcode/{barcode}` | — | Kart + bakiye | Ofis |
| POST | `/api/stock/counts/{id}/scan` | `{ barcode, warehouseId, quantity }` | Sayım satırı | `Operations` |

### 7.5 Rapor

| Metot | Yol | Not |
|---|---|---|
| GET | `/api/stock/reports/inventory-value` | Depo/kategori bazında envanter değeri |
| GET | `/api/stock/reports/movement-ledger` | Hareket dökümü + yürüyen miktar |
| GET | `/api/stock/reports/critical` | Kritik seviye altı |
| GET | `/api/stock/reports/warehouse-compare` | Depo karşılaştırma |
| GET | `/api/stock/reports/turnover` | Devir hızı |
| GET | `/api/stock/reports/{name}/export` | Excel/PDF (bugünkü `CariController` deseni: `server/YesLojistik.Api/Controllers/CariController.cs:24-31`) |

Kurallar:

- Tüm yazma uçlarında **ayna** (`MirrorWriteGuard`) ve **dönem kilidi** geçerlidir. `MirrorWriteGuard`
  bugün yol listesiyle çalışır (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`);
  `/api/stock` bu listeye eklenir.
- Negatif stok denemesi `DomainException` döner; hata metni mevcut miktarı ve birimi içerir.
- `reverse` gerekçesiz çalışmaz (masraf ret gerekçesiyle aynı ilke:
  `server/YesLojistik.Infrastructure/Services/ExpenseService.cs:35`).
- Sayım kapatma, fark eşiğini aşarsa `ApprovalRequest` üretir
  (`07-YETKI-ONAY-NUMARALANDIRMA.md` §6.3).

## 8. Yetki, onay ve denetim izi

| İş | Görme | Ekleme | Düzeltme | Silme | Onaylama |
|---|---|---|---|---|---|
| Stok kartı | Operasyon, Muhasebe, Yönetici | Operasyon | Operasyon | Yönetici | — |
| Kategori | Hepsi | Operasyon | Operasyon | Yönetici | — |
| Depo / bölüm | Hepsi | Operasyon | Operasyon | Yönetici | — |
| Hareket (giriş/çıkış/transfer) | Hepsi | Operasyon | — (yalnız ters kayıt) | — | Yönetici (limit üstü) |
| Sayım başlatma/sayma | Hepsi | Operasyon | Operasyon | — | — |
| Sayım kapatma | Hepsi | — | — | — | Operasyon (eşik altı), Yönetici (eşik üstü) |
| Devir girişi | Hepsi | Yönetici | Yönetici | — | Yönetici |
| Raporlar | Muhasebe, Yönetici | — | — | — | — |

Maker-checker: sayım farkı eşik üstü, devir girişi (koşulsuz, `07` §5.2), toplu düzeltme.
Denetim izi olayları: `StockMovementCreated`, `StockMovementReversed`, `StockCountClosed`,
`StockCountVarianceApproved`, `StockCostingMethodChanged`, `StockOpeningImported`.

Denetim izi metinleri okunur olmalıdır; alan adları bugünkü sözlüğe eklenir
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:23-52` deseni), ör. `["CriticalLevel"] = "Kritik seviye"`,
`["CostingMethod"] = "Maliyet yöntemi"`, `["UnitCost"] = "Birim maliyet"`, `["Quantity"] = "Miktar"`.
Para biçimi iki kuruş, tarih `dd.MM.yyyy` kuralları otomatik uygulanır (`AuditTrail.cs:146-158`).

**Depo silme yetkisi.** `SuppliersController` gibi bazı denetleyicilerde sınıf düzeyinde `Authorize`
**yoktur** (`server/YesLojistik.Api/Controllers/SuppliersController.cs:13-15`); bu uçlar bugün
`Program.cs`'teki **varsayılan politika** ile korunur, yani kimliği doğrulanmış her ofis kullanıcısı
girebilir (`server/YesLojistik.Api/Program.cs:81`). Yeni stok uçlarında bu gevşeklik **tekrarlanmaz**:
yazma uçları açıkça `Operations`, silme uçları açıkça `Admin` politikası taşır — bugünkü sıkı örnek
`ExpensesController`'dır (`server/YesLojistik.Api/Controllers/ExpensesController.cs:145`, `:154`).

## 9. Kabul kriterleri

1. `POST /api/stock/movements` ile çıkış, mevcut miktarı aştığında **reddedilir** ve hata metni mevcut
   miktarı içerir; negatif stok oluşmaz (ayar kapalıyken).
2. FIFO'da iki farklı maliyetli giriş sonrası çıkış, **en eski** katmandan tüketir; çıkış birim maliyeti
   testle sabitlenir.
3. Ağırlıklı ortalamada çıkış birim maliyeti `toplam değer ÷ toplam miktar` olur ve dört ondalıkla
   hesaplanır.
4. Saklanan `StockBalance` miktarı, `StockMovement` kayıtlarından yeniden hesaplanan miktarla **birebir**
   aynıdır (tutarlılık testi).
5. Transfer, kaynak depodan düşer ve hedef depoya **aynı birim maliyetle** ekler; toplam envanter
   değeri değişmez (test edilir).
6. Sayım kapatıldığında yalnız **farkı olan** kalemler için düzeltme hareketi yazılır; farkı sıfır olan
   kalem için hareket oluşmaz.
7. Fark gerekçesiz kapatma denemesi reddedilir.
8. Fark tutarı eşiği aştığında sayım `PendingApproval` olur, onaylanmadan stok **değişmez**.
9. Hareket silme ucu **yoktur**; ters kayıt ucu vardır ve ters kayıt orijinaline `ReversesMovementId` ile
   bağlanır.
10. Yetkisiz rol (`Operations`) stok kartı silme denemesinde **403** alır (bugünkü rol testi üslubu:
    `server/YesLojistik.Tests/Integration/EInvoiceTests.cs:157`).
11. Kilitli döneme stok hareketi yazılamaz; sade Türkçe hata döner ve kayıt oluşmaz.
12. `GET /api/stock/reports/inventory-value` toplamı, depo bazında toplamların toplamına **eşittir**
    (yuvarlama farkı ayrı satırda).
13. Barkodla kart bulma ucu, olmayan barkodda **hata değil** boş sonuç döner ve panelde
    `"Bu barkodla stok kartı yok."` yazar.
14. Stok modülü hiç kullanılmadığında mevcut testlerin **tamamı** yeşil kalır (regresyon kanıtı);
    `dotnet test` ve `client/e2e` sayıları azalmaz.
15. Arayüz metinlerinde teknik sözcük yoktur; para iki kuruş, miktar üç ondalık gösterilir.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `StockCostingTests.cs`
- FIFO: üç giriş, iki çıkış; katman tüketimi ve kalan miktarlar.
- FIFO: çıkış tüm katmanları tüketir; sonraki çıkış hata verir.
- Ağırlıklı ortalama: giriş sonrası ortalama; dört ondalık kuralı.
- Yuvarlama farkı: 1000 çıkış sonrası toplam değer sapması raporlanır.
- KDV maliyete girmez (bugünkü ilke: `server/YesLojistik.Core/Domain/ExpenseVat.cs:23`).
- Yöntem değişikliği hareket varsa reddedilir.

Yeni dosya: `StockMovementRulesTests.cs`
- Negatif stok reddi (ayar kapalı).
- Negatif stok izni (ayar açık) → kabul.
- Transferde kaynak = hedef reddi.
- Transferde toplam değer korunumu.
- Ters kayıt orijinali sıfırlar.
- Birim değişikliği hareket varsa reddedilir.

Yeni dosya: `StockCountTests.cs`
- Kört sayımda sistem miktarı görünmez.
- Fark hesabı (`sayılan − sistem`).
- Fark gerekçesiz kapatma reddi.
- Eşik üstü fark onay bekler; onaydan önce stok değişmez.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `StockApiTests.cs` (`ApiFactory` üzerinden —
`server/YesLojistik.Tests/Integration/ApiFactory.cs`):
- Kart CRUD; kod tekilliği; barkod kısmi tekilliği (iki boş barkod kabul).
- Depo CRUD; varsayılan depo silme reddi.
- Hareket uçları; dışa aktarma (`/export`) dosya döner.
- Saklanan bakiye, hareketlerden hesaplanan bakiyeyle aynı (kabul kriteri 4).

Yeni dosya: `StockCountApiTests.cs`
- Sayım başlat → satır gir → kapat → düzeltme hareketleri oluşur.
- Eşik üstü fark `ApprovalRequest` üretir ve onay merkezinde görünür.

Yeni dosya: `StockGuardTests.cs`
- Ayna modunda yazma reddi (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:26` metni).
- Kilitli dönemde yazma reddi.
- `Operations` rolü kart silmede 403.

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `stok.spec.ts`
- Stok kartı ekle → listede görünür → barkodla ara → bulunur.
- Hareket gir (giriş 10, çıkış 3) → bakiye 7 görünür.
- Stoktan fazla çıkış → hata metni görünür.
- Transfer → iki depoda miktar değişir, toplam değişmez.
- Sayım: kör sayım açık, fark gir, gerekçe yaz, kapat → düzeltme hareketi listede.

Yeni dosya: `stok-rapor.spec.ts`
- Envanter değeri raporu toplamları; Excel indirir.

Yeni dosya: `new-ui/stok.spec.ts`
- Yeni görünümde `Stok` menü grubu ve sekmeler çizilir (`useNewUi` yardımcısı:
  `client/e2e/helpers.ts:44-46`); klasik görünümde de ekranlar çalışır (kural §1.3).

### 10.4 Mevcut testlerde regresyon

`server/YesLojistik.Tests/Integration/FleetTests.cs`, `FleetDocumentsAndDriverLedger` migration'ı ve
`FuelAndAdvanceTests.cs` stokla kesişen alanlara dokunur; bu testler **silinmez** ve yeşil kalmalıdır.
`MaintenanceRecords`'a eklenecek boş olabilir sütun bu testleri bozmamalıdır (kabul kriteri 14).

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `StockItem` + `StockCategory` + migration + EF yapılandırması | 2 | `05-VERI-MODELI.md` |
| 2 | `Warehouse` + `WarehouseSection` + migration | 1,5 | 1 |
| 3 | `StockMovement` + `StockBalance` + migration | 2,5 | 1 |
| 4 | `StockCosting` (FIFO + ortalama) + birim testleri | 3 | 3 |
| 5 | `StockMovementService` (kurallar, ters kayıt, kilit) | 3 | 4 |
| 6 | `StockCount` + `StockCountLine` + sayım servisi | 3 | 5 |
| 7 | Stok kartı ekranı (liste + form) | 2,5 | 1 |
| 8 | Depo ve bölüm ekranı | 2 | 2 |
| 9 | Hareket listesi + hareket formu | 3 | 5 |
| 10 | Bakiye/envanter paneli | 1,5 | 3 |
| 11 | Sayım ekranı (masaüstü) | 3 | 6 |
| 12 | Barkod: arama + sayım ucu | 1,5 | 6 |
| 13 | Raporlar (5 sekme) + dışa aktarma | 3,5 | 3 |
| 14 | Uyarı entegrasyonu (kritik seviye) | 1 | `AlertService` |
| 15 | Excel devir aktarımı | 1,5 | `ImportService` |
| 16 | Reçete bağlantı noktası (yalnız arayüz) | 1 | `20-URETIM-RECETE.md` |
| 17 | Testler (birim + entegrasyon + e2e) | 6 | Tümü |
| **Toplam** | | **~43 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo/alan sözleşmesi), `06-MUHASEBE-MOTORU.md` (stok
değerleme fişi), `07-YETKI-ONAY-NUMARALANDIRMA.md` (yetki, onay, dönem kilidi, denetim olayları),
`09-CARI-YONETIMI.md` (tedarikçi cari bağı).

**Bu dokümanı bekleyenler:** `12-SATIN-ALMA.md` (mal kabul → stok girişi), `13-SIPARIS-TEKLIF.md`
(stok rezervi), `20-URETIM-RECETE.md` (reçete → stok çıkışı), `21-SAYIM-BARKOD.md` (mobil sayım), `11-SATIS-FATURA.md`
(ticari mal satışı senaryosu), `19-SABIT-KIYMET.md` (stok ↔ sabit kıymet ayrımı), `23-RAPORLAMA-BI.md`
(envanter raporlarının ortak altyapıya taşınması).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| **Saklanan bakiyenin hareketlerle ayrışması** | Çok yüksek | Tek yazma noktası (hareket servisi) + transaction + "bakiyeyi yeniden kur" komutu + tutarlılık testi (§6.7) | Bakiye hareketlerden yeniden hesaplanır ve üzerine yazılır; veri kaybı yok |
| Maliyet yönteminin yanlış seçilmesi | Yüksek | Hareket varsa değiştirilemez (§5.1.3); seçim formda açıklamayla sunulur | Yeni kart açılır; eski kartın geçmişi bozulmaz |
| FIFO katmanlarının şişmesi (performans) | Orta | Katmanlar depo bazında; tükenmiş katmanlar `Remaining = 0` ile arşivlenir; indeks `(StockItemId, WarehouseId, Date, Id)` | Ortalama yöntemine geçiş `36-PERFORMANS-OLCEK.md` |
| Negatif stok izninin yanlışlıkla açılması | Yüksek | Varsayılan kapalı; firma ayarı `Admin`; her negatif hareket denetim izine yazılır | Ayar kapatılır |
| Sayım farkının onaysız stoğa yansıması | Yüksek | `PendingApproval` durumu; eşik ayardan; eşik üstü `Admin` onayı (§5.5.5) | Onay kaydı iptal edilir; stok değişmemiştir |
| Geçmiş giderlerin stoğa çevrilmeye çalışılması | Orta | **Yasak**: yalnız ileriye dönük bağlantı (§6.11.2); geçmiş veri dönüştürülmez (kural §1.5) | — |
| Depo/bölüm sayısının kontrolsüz büyümesi | Düşük | Bölüm maliyet tutmaz (§5.2.4); bölüm listesi sayfalanır | Bölüm pasife alınır |
| Barkod biçiminin yanlış varsayılması | Orta | Biçim kuralı **doğrulanmadan** kodlanmaz; barkod yalnız serbest metin olarak çalışır | Biçim doğrulaması eklenir |
| Stok modülünün lojistik dışı iş yükü getirmesi | Orta | Kapsam "işletme stoğu" ile sınırlı; ticari mal satışı ayrı doküman (`11`) | Modül menüden gizlenir |
| `StockMovement` hacminin denetim izini şişirmesi | Orta | `Ignored` listesine alan ekleme yolu (`AuditTrail.cs:12-21`) veya yalnız özet izleme | İzleme kapatılır |

**Doğrulanacaklar:**

1. **doğrulanacak:** Luca'da stok maliyet yöntemi seçenekleri ve varsayılanı; yöntemin kart mı firma
   bazında seçildiği (Luca kılavuzu/demo).
2. **doğrulanacak:** Luca'nın "FIFO cari yaşlandırma" ifadesinin stokla ilgisi olup olmadığı
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:11`, `:36`).
3. **doğrulanacak:** Luca'da stok kartı alanlarının tam listesi, kod biçimi ve birim seti.
4. **doğrulanacak:** Luca'da seri/lot takibinin zorunlu olduğu haller ve lot maliyeti mantığı.
5. **doğrulanacak:** Luca'da barkod biçimi (EAN-13/Code128/QR) ve faturadan sayım ekranı akışı
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:30`).
6. **doğrulanacak:** Luca'da depo bazlı maliyetlendirme var mı; bölüm bazında maliyet izleniyor mu
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:48`).
7. **doğrulanacak:** Sayım farkının muhasebeleştirilme biçimi ve hangi hesaba yazıldığı —
   **mali müşavir onayı** gerekir; bu doküman yorum yapmaz.
8. **doğrulanacak:** Stok değerleme raporunun hangi tarih ve yöntemle değer biçtiği (dönem sonu
   mu, hareket anı mı) — mali müşavir.
9. **doğrulanacak:** Firmada bugün hangi sarf kalemleri **fiziksel olarak** depoda tutuluyor ve
   yaklaşık kaç kalem var (kullanıcıya sorulacak; aktarım eforunu belirler).
10. **doğrulanacak:** Lastik/yedek parça için seri/lot takibi gerçekten gerekli mi, yoksa araç bazlı
    takip yeterli mi (kullanıcı kararı).
11. **doğrulanacak:** Stok modülünün hangi Luca paketine karşılık geldiği ve bizim paketleme kararımızdaki
    yeri (`34-LISANS-ABONELIK-KONTOR.md`).
12. **doğrulanacak:** Negatif stok izni verilip verilmeyeceği (kullanıcı kararı; varsayılan kapalı).

Sonraki belgeyle bağlantı: bu doküman `09-CARI-YONETIMI.md`'nin tedarikçi cari bağını ve
`07-YETKI-ONAY-NUMARALANDIRMA.md`'nin yetki/onay/dönem kilidi altyapısını kullanır; `20-URETIM-RECETE.md`'ye
reçete satırları ve üretim çıkışlarını, `21-SAYIM-BARKOD.md`'ye barkodlu mobil sayımı, `12-SATIN-ALMA.md`'ye
mal kabul → stok girişi bağlantısını devreder.
