# 09 — Cari Yönetimi

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 şablonuna uyar. Mevcut `Customer`/`Supplier`
tablolarını ve cari altyapısını **genişletir**; sıfırdan yeni bir cari modülü kurmaz. Doğrulanmamış dış
bilgi `**doğrulanacak:**` etiketi taşır; mevzuat yorumu yapılmaz.

## 1. Amaç ve kapsam

Bugün panelde cari iki ayrı yerde yaşar: `Customer` ve `Supplier`
(`server/YesLojistik.Core/Entities/Customer.cs:3`, `server/YesLojistik.Core/Entities/Supplier.cs:4`).
Bakiyeler, hareketler, yaşlandırma ve mahsup **çalışır durumdadır**; eksik olan, Luca sınıfı bir ERP'nin
beklediği **tek cari kimliği**, **risk yönetimi**, **mutabakat** ve **vergi bilgisi doğrulaması**dır.

Kapsam içinde olanlar:

1. **Müşteri + tedarikçi tek cari kartı.** Aynı firmayla hem satış hem alım ilişkisi olabiliyorsa tek
   kart, iki bakiye.
2. **Kart alanları.** Ünvan, VKN/TCKN, vergi dairesi, adresler, yetkili kişiler, e-posta/telefon, ödeme
   koşulu (vade), risk limiti, döviz cinsi, e-Fatura mükellefiyeti.
3. **VKN/TCKN ile vergi dairesi-adres sorgusu.** Luca'da olduğu belirtilen özellik; **bizde hangi
   servisin kullanılacağı doğrulanacak**.
4. **Cari hareketleri.** Borç/alacak, bakiye, yaşlandırma, ekstre.
5. **Tahsilat/ödeme ve mahsup.** Kısmi ödeme, avans, çoklu fatura kapatma.
6. **Mutabakat mektubu.** Ekstre gönderme (bugün var) + karşı tarafın onayı (bugün yok).
7. **Risk takibi ve limit uyarısı.**
8. **Cari birleştirme ve düzeltme.**
9. **Geçiş planı** ve ekranlar.

Kapsam dışı: muhasebe fişi ve hesap planı (`06-MUHASEBE-MOTORU.md`), çek/senet portföy yönetimi
(`16-CEK-SENET.md`), banka ekstresi eşleştirme (`15-BANKA-ENTEGRASYON.md`), döviz kuru kaynağı
(`22-ITHALAT-IHRACAT-DOVIZ.md`), müşteri portalı (`29-MOBIL-VE-DISA-ACILIM.md`).

## 2. Luca'daki karşılığı

Luca sitesinden okunabilenler (`docs/plan-erp/02-LUCA-ENVANTERI.md`):

- **"FIFO cari yaşlandırma ve adat (faiz) hesaplama"** — Luca Net'in öne çıkan özelliği
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:11`, `:36`).
- **"Cari kart girişinde yalnız T.C. Kimlik No veya Vergi Kimlik No ile vergi dairesi + adres otomatik
  sorgusu; e-Fatura kullanıcısı olan carilerin GİB tarafında sorgulanıp listelenmesi"**
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:34-35`).
- **"Online cari hesap mutabakatı (sınırsız/ücretsiz)"** — Luca Koza özelliği
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:50`).
- **"Müşteri/tedarikçi ödeme planı takibi"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:56`).
- **"BA-BS mutabakatı"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:31`).
- **"Farklı döviz cinslerinden fatura kesimi"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:55`) — caride döviz
  cinsi anlamına gelir.
- Cari kartların **Excel ile aktarımı** (`docs/plan-erp/02-LUCA-ENVANTERI.md:28`).
- **Komisyon** takibi taşeron faturasından düşme dahil (`Commission` alanı bugün bizde de var:
  `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:39`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**Doğrulanacak (Luca tarafı):**

- **doğrulanacak:** Luca'da "cari" kavramı müşteri ve tedarikçiyi **tek kartta** mı tutar; aynı VKN'ye
  hem satış hem alım yapılabiliyor mu (Luca demo hesabı/kullanıcı kılavuzu).
- **doğrulanacak:** Luca'nın VKN/TCKN → vergi dairesi + adres sorgusu hangi servisi kullanıyor (GİB
  servisi mi, kendi veritabanı mı), ücretli mi, günlük sorgu sınırı var mı.
- **doğrulanacak:** Luca'da **adat (faiz)** hesabının varsayılan oranı ve dayanağı; bizim kapsayıp
  kapsamayacağımız (bu doküman adat **yapmaz**, `06-MUHASEBE-MOTORU.md`'ye bırakır).
- **doğrulanacak:** Luca'nın "online mutabakat" akışı: karşı taraf nasıl onaylıyor (portal mı, e-posta
  mı), onay izi nasıl saklanıyor.
- **doğrulanacak:** Luca'da cari birleştirme (iki kartı tek kartta toplama) var mı, varsa eski
  hareketler nasıl taşınıyor.
- **doğrulanacak:** Luca'da risk limiti/kredi limiti uyarısı var mı, kaydı engelliyor mu yoksa uyarıyor mu.

## 3. Bizde bugün

### 3.1 Müşteri kartı — oldukça dolu

`Customer` varlığı (`server/YesLojistik.Core/Entities/Customer.cs`):

| Alan | Satır | Not |
|---|---|---|
| `Title` | `:5` | Ünvan (zorunlu) |
| `TaxNumber` | `:6` | VKN/TCKN |
| `TaxOffice` | `:7` | Vergi dairesi — **elle girilir** |
| `Phone`, `Email`, `Address` | `:8-10` | |
| `City`, `District`, `ContactName` | `:15-17` | İl, ilçe, yetkili kişi |
| `IsEInvoiceUser`, `EInvoiceAlias` | `:18-20` | e-Fatura mükellefiyeti + PK etiketi |
| `PaymentTermDays` | `:22` | Müşteriye özel vade (boşsa firma varsayılanı) |
| `IsActive` | `:23` | |
| `OpeningBalance`, `OpeningBalanceDate` | `:25-26` | Devir |
| `CreditLimit` | `:28` | Risk limiti — **uyarı verir, engellemez** |
| Ayrıntılı adres | `:31-39` | Ülke, mahalle, cadde, bina, kapı, posta kodu, faks, web |
| `LegacyKey`, `LegacyBalance`, `LegacyBalanceAt` | `:41-44` | Pratikortam aynası |
| `InvoiceTemplate` | `:46` | Fatura şablonu |
| `Groups` | `:47` | Şantiye/proje alt grupları |
| `CustomerNo` | `:53` | `Id.ToString("D5")` — salt okunur |

Ek olarak `CustomerGroup` (`:78-83`) ve `InvoiceNoteTemplate` (`:86-93`) aynı dosyadadır.

Kart kaydı doğrulaması: ünvan zorunlu, VKN/TCKN 10 veya 11 hane
(`client/src/components/CustomerForm.tsx:17-18`). Yetki: müşteri yazma uçları yetki istemez ama
varsayılan politika kimliği doğrulamış ofis kullanıcısı ister
(`server/YesLojistik.Api/Program.cs:81`); ekstre e-postası `Accounting` ister
(`server/YesLojistik.Api/Controllers/CustomersController.cs:99`).

### 3.2 Tedarikçi kartı — daha zayıf

`Supplier` varlığı (`server/YesLojistik.Core/Entities/Supplier.cs`):

| Alan | Satır | Not |
|---|---|---|
| `Title` | `:6` | Ünvan |
| `Kind` | `:7` | `SupplierKind`: `Carrier, Service, Fuel, Other` (`Enums.cs:37`) |
| `TaxNumber`, `TaxOffice` | `:8-9` | |
| `Phone`, `Email`, `Address`, `City`, `District` | `:10-14` | |
| `Iban` | `:15` | **Müşteride yok** |
| `ContactName` | `:16` | |
| `PaymentTermDays` | `:18` | Varsayılan `30`, zorunlu |
| `OpeningBalance`, `OpeningBalanceDate` | `:21-22` | Devir borcu |
| `IsActive` | `:23` | |
| `LegacyKey`, `LegacyBalance`, `LegacyBalanceAt` | `:25-28` | |
| `SupplierNo` | `:30` | `"T" + Id.ToString("D5")` |

**Asimetri (kanıtlı):** `CreditLimit` yalnız `Customer`'da vardır
(`Customer.cs:28`); `Supplier`'da **yoktur**. `Iban` yalnız `Supplier`'da vardır (`Supplier.cs:15`);
`Customer`'da **yoktur**. İkisinde de **döviz cinsi yoktur** (grep: `Currency`/`ExchangeRate` eşleşmesi
yok).

Tedarikçi formu bugün şu alanları toplar: tür, yetkili, telefon, ödeme vadesi, IBAN, VKN/TCKN, vergi
dairesi, e-posta, il, ilçe, adres, devir borcu, devir tarihi, notlar, durum
(`client/src/components/SupplierForm.tsx:61-93`).

### 3.3 Cari hareketleri ve bakiye — çalışıyor

- **Bakiye saklanmaz, her seferinde hesaplanır.** Alanın kendi yorumu bunu söyler
  (`server/YesLojistik.Infrastructure/Services/BalanceService.cs:8`).
- Dağıtım motoru `PaymentAllocator`: faturaya bağlı tahsilat önce o faturayı kapatır; bağlı olmayan
  tahsilatlar ve faturayı aşan kısımlar **en eski faturadan başlanarak** dağıtılır (FIFO)
  (`server/YesLojistik.Core/Domain/PaymentAllocator.cs:13-16`, `:53-59`).
- Yaşlandırma beş kova: vadesi gelmemiş, 1-30, 31-60, 61-90, 90+
  (`server/YesLojistik.Core/Domain/PaymentAllocator.cs:8-11`, `:64-80`).
- Yürüyen bakiyeli hareket listesi `CustomerAccountService.MovementsAsync`
  (`server/YesLojistik.Infrastructure/Services/CustomerAccountService.cs:40-77`): fatura borç, tahsilat
  alacak, devir en başta (`:65-68`), tarih + oluşturma anına göre sıralı (`:69`).
- Fatura durum etiketi: `Taslak`, `İptal`, `Açık`, `Ödendi`, `Kısmi Ödendi`, `Vadesi Geçti`
  (`server/YesLojistik.Infrastructure/Services/BalanceService.cs:47-56`).
- Karşılıksız/iade çek müşteri bakiyesinden **düşülmez**: `Payment.Counts` ifadesi bunu tanımlar
  (`server/YesLojistik.Core/Entities/Payment.cs:26-27`).
- Devir, dağıtım motoruna **negatif kimlikli sahte fatura** olarak girer
  (`server/YesLojistik.Infrastructure/Services/BalanceService.cs:11-12`).
- Cari özet uçları: `GET /api/customers/{id}` (özet), `/movements`, `/statement`, `/risk`
  (`server/YesLojistik.Api/Controllers/CustomersController.cs:71-79`).
- Ekstre PDF/Excel üretimi: `StatementPdfGenerator`
  (`server/YesLojistik.Infrastructure/Services/DocumentPdfs.cs:165`) ve
  `GET /api/customers/{id}/statement?format=xlsx`
  (`server/YesLojistik.Api/Controllers/CustomersController.cs:86-88`).
- Tüm müşterilerin bakiyesi tek tabloda: `CariService.CustomersAsync`
  (`server/YesLojistik.Infrastructure/Services/CariService.cs:17-43`); tedarikçiler için
  `SuppliersAsync` (`:45-70`), borç kalemleri `PayableService` üzerinden gelir (`:49`).
- Cari dışa aktarma (Excel/PDF): `GET /api/cari/customers/export` ve `/suppliers/export`
  (`server/YesLojistik.Api/Controllers/CariController.cs:24-31`), politika `Accounting` (`:12`).
- Denetim izi okunur adlar hazır: `Devir bakiyesi`, `Risk limiti`, `Vade (gün)`, `Yetkili`, `IBAN`,
  `VKN/TCKN`, `Vergi dairesi`, `e-Fatura mükellefi`, `PK etiketi`
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:33`, `:38`, `:50`).

### 3.4 Mahsup — asimetrik, önemli bulgu

- **Müşteri tarafı:** `Payment` varlığında **tek** `InvoiceId` vardır
  (`server/YesLojistik.Core/Entities/Payment.cs:7`). `PaymentSaveRequest` de tek `InvoiceId` taşır
  (`server/YesLojistik.Core/Dtos/FinanceDtos.cs` içindeki `PaymentSaveRequest`). Dağıtım çağrısı
  `Targets` alanını **her zaman `null`** geçer:
  `new AllocPayment(p.InvoiceId, p.Date, p.Amount, null)`
  (`server/YesLojistik.Infrastructure/Services/BalanceService.cs:39`). Yani motorun **çoklu hedef**
  yeteneği müşteri tarafında **kullanılmıyor**.
- **Tedarikçi tarafı:** `SupplierPayment` varlığında hem tek `TripId` hem **`List<int>? TripIds`**
  ("toplu ödeme") vardır (`server/YesLojistik.Core/Entities/SupplierPayment.cs:12-15`), toplu ödeme
  uçları da mevcuttur: `POST /api/supplier-payments/bulk/preview` ve `POST /bulk`
  (`server/YesLojistik.Api/Controllers/SupplierPaymentsController.cs:113-124`), dağıtımda `TripIds`
  gerçekten kullanılır (`server/YesLojistik.Infrastructure/Services/PayableService.cs:110-112`).
- **Avans:** müşteri tarafında ayrı avans kavramı yoktur; fazla ödeme **negatif bakiye** olarak görünür ve
  ekranda "Müşteri fazla ödeme yapmış (avans)" yazar
  (`client/src/pages/CustomerDetailPage.tsx:67`). Tedarikçi tarafında sefere bağlı ön ödeme/avans
  tanımlıdır (`SupplierPayment.cs:12`, `:15`).
- **İade:** müşteri iadesi eksi tutarla girilir ve hareket listesinde "Müşteriye iade" olarak görünür
  (`server/YesLojistik.Infrastructure/Services/CustomerAccountService.cs:54`), `IsRefund` bayrağı
  formda vardır (`client/src/components/PaymentForm.tsx:86`).
- **Kısmi ödeme:** kalan tutar takip edilir; ödeme formunda seçilen faturanın kalanı yazılır
  (`client/src/components/PaymentForm.tsx:116-117`) ve "Tamamını gir" düğmesi açık toplamı doldurur
  (`:81`).

### 3.5 Risk limiti — yalnız uyarı

- Müşteri kartında alan var: `CreditLimit` (`server/YesLojistik.Core/Entities/Customer.cs:28`).
- Formda alan ve açıklama var: "Açık bakiye + faturalanmamış sevkiyatlar bu tutarı aşınca uyarı verilir.
  Boş: limit yok." (`client/src/components/CustomerForm.tsx:135`).
- Hesap: açık bakiye + faturalanmamış (teslim/yüklendi/yolda) sevkiyat tutarı
  (`client/src/components/TripForm.tsx:202` ile aynı kaynak: `GET /api/customers/{id}/risk` —
  `server/YesLojistik.Api/Controllers/CustomersController.cs:75-76`).
- Sunucu hesabı `CashService.RiskAsync` içindedir; `excludeTripId` ile düzenlenen sefer dışlanır
  (`server/YesLojistik.Api/Controllers/CustomersController.cs:75`).
- Sevkiyat formunda uyarı metni: "Risk limiti aşılıyor: … Kayıt yine de yapılabilir."
  (`client/src/components/TripForm.tsx:304`).
- **Kanıt:** kayıt **engellenmez**. Uyarı metninin kendisi "Kayıt yine de yapılabilir." der
  (`client/src/components/TripForm.tsx:304`) ve sunucuda limit karşılaştırması yapan bir ret yolu
  yoktur.

### 3.6 Mutabakat — mektup var, çift yönlü onay yok

- Bugün yapılan: tarih aralıklı ekstre PDF/Excel'i müşteriye e-posta gönderme
  (`server/YesLojistik.Api/Controllers/CustomersController.cs:99-101`) ve "Vade Hatırlatma" metni
  (`client/src/pages/CustomerDetailPage.tsx:177`).
- Ekstre diyaloğu kullanıcıya ne yaptığını söyler: "Seçilen dönemdeki faturalar ve tahsilatlar, devreden
  bakiye ve güncel bakiyeyle listelenir. Mutabakat için müşteriye gönderebilirsiniz."
  (`client/src/pages/CustomerDetailPage.tsx:203`).
- Yardım sayfası da bunu teyit eder (`client/src/pages/HelpPage.tsx:143`).
- **Eksik:** karşı tarafın **onayladığı** bir mutabakat kaydı yoktur. Repoda `mutabakat` sözcüğü
  yalnız **veri aktarımı mutabakatı** anlamında kullanılır
  (`docs/GELISTIRME-PLANI.md:89-91`, `docs/TAM-GELISTIRME-PLANI.md:186-187`) — yani "eski sistemden
  aktarılan kayıtlar tuttu mu" kontrolü. Online/çift yönlü cari mutabakatı **yoktur**.

### 3.7 VKN/TCKN sorgusu — yok

- `TaxOffice` alanı bugün yalnız elle doldurulur: müşteri formunda düz metin girişi
  (`client/src/components/CustomerForm.tsx:129`), tedarikçi formunda düz metin
  (`client/src/components/SupplierForm.tsx:82`), firma ayarında düz metin
  (`client/src/pages/SettingsPage.tsx:141`), kurulum sihirbazında düz metin
  (`client/src/pages/OnboardingPage.tsx:158`).
- Repoda vergi dairesi/adres sorgulayan **hiçbir servis yoktur** (grep: `vergi dairesi`, `TaxOffice`,
  `gib`, `mukellef` — yalnız elle giriş alanları ve GİB e-Fatura mükellefiyet sorgusu). Tek GİB çağrısı
  **e-Fatura mükellefiyet** sorgusudur, vergi dairesi/adres değil:
  `GET /api/einvoice/recipient/{taxNumber}` (`server/YesLojistik.Api/Controllers/EInvoiceController.cs:65-66`),
  ki varsayılan `manual` sağlayıcı bunu desteklemez
  (`server/YesLojistik.Infrastructure/EInvoice/Providers.cs:13`).

### 3.8 Cari birleştirme / düzeltme — yok

- Repoda birleştirme kodu yoktur (grep: `merge`, `birlestir`, `Birleştir` — kod eşleşmesi yok).
- Silme vardır ama **koşulludur**: müşteri detayında "Sil" düğmesi yalnız sevkiyat, borç ve alacak
  sıfırsa görünür (`client/src/pages/CustomerDetailPage.tsx:45-46`). Yani hareketi olan cari
  silinemez — bu doğru tasarımdır ve korunur.
- Tedarikçi silme ucu vardır (`server/YesLojistik.Api/Controllers/SuppliersController.cs:129-130`).
- **Yanlış açılmış mükerrer kartı düzeltme yolu yoktur.**

### 3.9 Ekranlar

| Rota | Dosya | Ne yapar |
|---|---|---|
| `/musteriler` | `client/src/pages/CustomersPage.tsx` | Müşteri listesi: No, ünvan, VKN/TCKN, iletişim, adres, cari bakiye (`:40-53`) |
| `/musteriler/:id` | `client/src/pages/CustomerDetailPage.tsx` | Kart + 4 sekme: Hareketler, Sevkiyatlar, Faturalar, Tahsilatlar (`:74-84`) |
| `/tedarikciler` | `client/src/pages/SuppliersPage.tsx` | Tedarikçi listesi |
| `/tedarikciler/:id` | `client/src/pages/SupplierDetailPage.tsx` | Kart + 5 sekme: Hareketler, Sevkiyatlar, Ödemeler, Araçlar, Şoförler (`:84-96`) |
| `/cari/musteriler` | `client/src/pages/CariPage.tsx` | Bütün müşterilerin bakiyesi tek tabloda |
| `/cari/tedarikciler` | `client/src/pages/CariPage.tsx` | Aynısı tedarikçiler için |
| `/tahsilatlar` | `client/src/pages/PaymentsPage.tsx` | Tahsilat listesi |
| `/odemeler` | `client/src/pages/SupplierPaymentsPage.tsx` | Ödeme listesi |

Yetki kullanımı: cari tablosu düğmeleri `can('accounting')` ile gizlenir
(`client/src/pages/CustomersPage.tsx:35`, `:61`, `:84`); tahsilat/yeni fatura düğmeleri
`write` + `can('accounting')` (`client/src/pages/CustomerDetailPage.tsx:47-48`); tahsilat listesinde
para sütunları yalnız muhasebeye görünür (`client/src/pages/PaymentsPage.tsx:51`).

### 3.10 Eksik listesi

| # | Eksik | Kanıt |
|---|---|---|
| 1 | Tek cari kartı (müşteri+tedarikçi birleşik) | İki ayrı tablo: `Customer.cs:3`, `Supplier.cs:4` |
| 2 | VKN/TCKN → vergi dairesi/adres sorgusu | `TaxOffice` elle: `CustomerForm.tsx:129`; sorgu servisi grep ile bulunamadı |
| 3 | Döviz cinsi | grep: `Currency`/`ExchangeRate` eşleşmesi yok |
| 4 | Müşteride IBAN | `Iban` yalnız `Supplier.cs:15` |
| 5 | Tedarikçide risk limiti | `CreditLimit` yalnız `Customer.cs:28` |
| 6 | Çoklu fatura kapatma (müşteri) | `AllocPayment(..., null)`: `BalanceService.cs:39` — motor hazır, kullanılmıyor |
| 7 | Ayrı avans kaydı (müşteri) | Avans yalnız negatif bakiye: `CustomerDetailPage.tsx:67` |
| 8 | Çift yönlü/online mutabakat | Ekstre gönderimi var (`CustomersController.cs:99`), onay kaydı yok |
| 9 | Cari birleştirme | grep: kod eşleşmesi yok |
| 10 | Yetkili kişiler (birden çok) | Tek `ContactName`: `Customer.cs:16`, `Supplier.cs:16` |
| 11 | Risk limiti engeli (blokaj) | Uyarı metni "Kayıt yine de yapılabilir.": `TripForm.tsx:304` |
| 12 | Adat (faiz) hesabı | Repoda yok (Luca'da var: `02-LUCA-ENVANTERI.md:36`) |
| 13 | BA-BS verisi | Repoda yok |
| 14 | Cari kartına özel belge/ek dosya | Fiş yalnız giderde var: `Expense.cs:29` |

## 4. Hedef ekranlar ve alanlar

Ortak parçalar yeniden kullanılır: `PageShell` (`client/src/components/shell/PageShell.tsx:28`),
`DataTable` (`client/src/components/DataTable.tsx:66`), `MobileCards`, `Modal`
(`client/src/components/ui.tsx:156`), `Tabs` (`:300`), `SumStrip`
(`client/src/components/SumStrip.tsx:12`), `FilterBar`/`FilterPanel`
(`client/src/components/shell/FilterPanel.tsx`), `RowMenu` (`client/src/components/shell/Menu.tsx:75`).

**Kural:** mevcut `/musteriler` ve `/tedarikciler` sayfaları **bozulmaz**. Yeni "Cari Kartı" ekranı, iki
kartı tek kartta gösterebilen **yeni** bir ekrandır (`/cari/:id`).

### 4.1 Ekran: Cari Listesi (`/cari`)

Bugün iki ayrı liste var (`/cari/musteriler`, `/cari/tedarikciler`). Yeni liste **tek**tir, iki bakiyeyi
yan yana gösterir.

**Sütunlar:** Cari No · Ünvan · VKN/TCKN · Tür (rozet: `Müşteri`/`Tedarikçi`/`İkisi`) · Borç · Alacak ·
Bakiye · Vadesi geçen · Risk (limit varsa çubuk) · İşlemler.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Cari No | metin (salt okunur) | — | Müşteri `D5`, tedarikçi `T…D5` (`Customer.cs:53`, `Supplier.cs:30`) |
| Tür | rozet | — | Yeni: `Both` değeri |
| Borç / Alacak | para (salt okunur) | — | Bugünkü hesap aynen: `CariService.cs:39-41` |
| Risk | çubuk + metin | — | `used / CreditLimit`; limit yoksa "Limit yok" |
| Süzgeç | `FilterBar` | — | Tür, bakiye durumu (`Açık`/`Vadesi geçen`/`Tümü`), il, grup |

Toplamlar `SumStrip` ile: toplam borç, toplam alacak, net bakiye, vadesi geçen.

### 4.2 Ekran: Cari Kartı (`/cari/:id`)

**Sekmeler:** `Özet` · `Hareketler` · `Ekstre` · `Faturalar` · `Sevkiyatlar` · `Ödemeler/Tahsilatlar` ·
`Yetkililer` · `Belgeler` · `Mutabakat` · `Risk`.

**Özet sekmesi alanları:**

| Alan | Tip | Zorunlu | Doğrulama / hata metni |
|---|---|---|---|
| Ünvan | metin (200) | Evet | `req('Müşteri ünvanı zorunlu.')` bugünkü metin korunur (`CustomerForm.tsx:17`) |
| Cari türü | seçim | Evet | `Müşteri`, `Tedarikçi`, `İkisi` |
| VKN / TCKN | metin (11) | Hayır | Bugünkü kural: 10 veya 11 hane (`CustomerForm.tsx:18`). **Sorgula** düğmesi |
| Vergi dairesi | metin | Hayır | Sorgu doldurur; elle de yazılabilir |
| Döviz cinsi | seçim | Evet | `TRY` (varsayılan), `USD`, `EUR`, `GBP` |
| Ödeme koşulu (gün) | sayı | Hayır | Bugünkü 0-365 sınırı (`CustomerForm.tsx:32`) |
| Risk limiti | para | Hayır | Bugünkü metin korunur (`CustomerForm.tsx:135`) |
| IBAN | metin (34) | Hayır | Yeni: müşteride de olsun |
| e-Fatura mükellefi | onay kutusu | — | Bugünkü toggle (`CustomerForm.tsx:114`) |
| PK etiketi | metin | Hayır | Bugünkü alan (`CustomerForm.tsx:119`) |
| Durum | seçim | — | Aktif/Pasif (`CustomerForm.tsx:148`) |

**Yetkililer sekmesi (yeni tablo):** Ad Soyad · Görev · Telefon · E-posta · Birincil (radyo) ·
Notlar. Bugün tek `ContactName` vardır (`Customer.cs:16`); yeni tablo bunu **koruyarak** genişletir:
mevcut alan birincil yetkilinin adı olarak okunmaya devam eder (geri dönüş yolu).

**Risk sekmesi:** açık bakiye · faturalanmamış teslim · kullanılan limit · kalan limit · limit aşım
geçmişi (son 12 ay). Hesap bugünkü `RiskAsync` ile **aynı** olmalıdır (`CustomersController.cs:75`).

**Mutabakat sekmesi:** mutabakat dönemi · gönderim anı · karşı taraf yanıtı · yanıt farkı · fark
gerekçesi · onay belgesi yükleme.

### 4.3 Ekran: Ekstre (`/cari/:id/ekstre`)

Bugünkü ekstre diyaloğu tam sayfa forma dönüşür: tarih aralığı, "faturasız sevkiyatları göster"
seçeneği (bugün var: `CustomersController.cs:86-88`), sütun seçimi, `PDF`/`Excel` düğmeleri,
"E-posta Gönder", `Yazdır`. Bakiye satırı kalın; devir satırı ilk satırdır
(`CustomerAccountService.cs:65-68`).

### 4.4 Ekran: Tahsilat ve Mahsup (`/tahsilatlar?new=1`)

Bugünkü `PaymentForm` **genişletilir** (kaldırılmaz). Yeni alan: **çoklu fatura seçimi**.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Müşteri | seçim | Evet | Bugünkü `FormSelect` (`PaymentForm.tsx:74`) |
| Tutar | para | Evet | |
| Yöntem | seçim | Evet | Bugünkü beş yöntem (`PaymentMethod`, `Enums.cs:35`) |
| Kapatılacak faturalar | çoklu seçim | Hayır | Sıralı kapatma; artan FIFO'ya gider |
| Faturaya bağlama | seçim | Hayır | Bugünkü tek fatura yolu **korunur** (`PaymentForm.tsx:108`) |
| Avans olarak bırak | onay kutusu | Hayır | Yeni: faturaya bağlanmayan kısmı avans say |
| İade | onay kutusu | Hayır | Bugünkü `IsRefund` (`PaymentForm.tsx:86`) |

Ekranda canlı **mahsup önizlemesi** gösterilir: seçilen faturalar ve kapanan tutarlar. Bu önizleme
sunucuda `PaymentAllocator` ile hesaplanır; motor **zaten vardır**
(`server/YesLojistik.Core/Domain/PaymentAllocator.cs:19`) ve tedarikçi tarafında çoklu hedef
kullanılmaktadır (`PayableService.cs:110-112`). Yapılacak iş: müşteri tarafında `Targets` alanını
doldurmak (`BalanceService.cs:39` bugün `null` geçiyor).

## 5. İş kuralları

### 5.1 Kart ve kimlik

1. **VKN/TCKN tekilliği.** Aynı VKN/TCKN ile ikinci cari kartı **açılamaz**; yeni kural:
   `(TaxNumber)` tekil olmalı (boş değerler muaf). Bugün böyle bir kısıt yoktur; eklenir.
   Gerekçe: mükerrer kart bakiyeyi böler ve risk limitini işe yaramaz hâle getirir.
2. **Tek kart, iki bakiye.** `Both` türündeki caride müşteri bakiyesi (borç) ve tedarikçi bakiyesi
   (alacak) **ayrı** hesaplanır ve **netleştirilmez**. Gerekçe: netleştirme, tek taraflı ödeme
   yapıldığında iki ilişkiyi karıştırır ve mutabakatı imkânsız kılar.
3. **VKN/TCKN biçimi.** Bugünkü kural korunur: 10 hane VKN veya 11 hane TCKN, aksi hâlde
   `"VKN 10, TCKN 11 haneli olmalı."` (`client/src/components/CustomerForm.tsx:18`).
4. **Vergi dairesi/adres sorgusu isteğe bağlıdır.** Sorgu başarısız olursa alan **boş kalmaz hatası
   vermez**; kullanıcı elle yazar. Gerekçe: dış servis kesintisi kart kaydını engellememelidir.
5. **Pasif kart.** Bugünkü davranış korunur: pasif cari seçim listelerinde görünmez
   (`SupplierForm.tsx:92`, `CustomerForm.tsx:147`).
6. **Silme.** Bugünkü koşul korunur ve tüm carilere yayılır: hareketi olan cari **silinemez**, yalnız
   pasife alınır (`client/src/pages/CustomerDetailPage.tsx:45-46`).

### 5.2 Bakiye, yaşlandırma ve mahsup

1. **Bakiye = Devir + Faturalanan − Tahsil edilen.** Bugünkü formül korunur
   (`CustomerAccountService.cs:14-15`).
2. **Karşılıksız çek sayılmaz.** Bugünkü kural korunur (`Payment.cs:26-27`).
3. **Mahsup sırası.** Faturaya bağlı ödeme önce o faturayı kapatır; artan en eski faturadan başlar
   (FIFO) (`PaymentAllocator.cs:13-16`). **Çoklu seçimde** seçilen faturalar **kendi sırasıyla** kapanır,
   artan yine FIFO'ya gider (`PaymentAllocator.cs:27-39`).
4. **Kısmi ödeme.** Fatura kalanı kadar kapatılır; kalan bakiyede görünür ve durum `Kısmi Ödendi` olur
   (`BalanceService.cs:53`).
5. **Avans.** Faturaya bağlanmayan tutar avanstır ve **negatif bakiye** olarak durur; ekranda
   "Müşteri fazla ödeme yapmış (avans)" yazar (`CustomerDetailPage.tsx:67`). Yeni kural: avans
   **kendiliğinden** sonraki faturaya kapatılmaz; kullanıcı hangi faturayı kapatacağını seçer. Gerekçe:
   sessiz kapatma, müşteriyle mutabakatta açıklanamayan bir mahsup yaratır.
6. **Fazla ödeme uyarısı.** Ödeme tutarı açık toplamı aşarsa kaydetmeden önce uyarı gösterilir:
   `"Girilen tutar açık bakiyeyi aşıyor. {fark} avans olarak kalacak."` Kayıt engellenmez
   (bugünkü "uyar ama engelleme" ilkesi: `TripForm.tsx:304`).
7. **Yaşlandırma gün sayısı.** Vade tarihine göre hesaplanır
   (`PaymentAllocator.cs:69`). Vadesi gelmemiş fatura "vadesi gelmemiş" kovasındadır.
8. **İade.** Eksi tutarlı ödeme borç tarafında görünür
   (`CustomerAccountService.cs:54-56`) ve bakiyeyi geri artırır.

### 5.3 Risk limiti

1. **Hesap:** `açık bakiye + faturalanmamış (yüklendi/yolda/teslim) sevkiyat + yeni işlem` — bugünkü
   `RiskAsync` ile aynı (`server/YesLojistik.Api/Controllers/CustomersController.cs:75-76`).
2. **Uyarı eşiği.** %90'ında sarı, %100'ünde kırmızı rozet. Bu **görsel** eşiktir, iş kuralı değildir.
3. **Engelleme (yeni, varsayılan kapalı).** Firma ayarından "limit aşımında kaydı engelle" açılabilir.
   Varsayılan **kapalıdır**; gerekçe: bugünkü davranış "uyarır ama engellemez"
   (`TripForm.tsx:304`) ve bunu sessizce sertleştirmek canlı iş akışını durdurur.
4. **Engel açıkken hata metni.** `"Risk limiti aşıldı (limit {limit}, kullanılan {used}). Kayıt için
   yönetici onayı gerekir."` — onay akışı `07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2'ye bağlanır.
5. **Limit değişikliği izlenir.** Bugün `CreditLimit` denetim izinde okunur ad taşır
   (`AuditTrail.cs:50`); limit değiştiren kullanıcı ve eski/yeni değer kaydedilir.

### 5.4 Mutabakat

1. **Mektup (gönderim).** Bugünkü ekstre e-postası genişletilir: dönem, kapanış bakiyesi, hareket sayısı
   ve yanıt bağlantısı içerir. Bugünkü hatırlatma metni korunur
   (`client/src/pages/CustomerDetailPage.tsx:177`).
2. **Yanıt.** Karşı taraf üç durumdan birini bildirir: `Onaylıyorum`, `Fark var`, `Yanıt yok`.
   `Fark var` ise **fark tutarı** ve **gerekçe** zorunludur.
3. **Durum makinesi:** `Hazırlandı → Gönderildi → Onaylandı` / `Farklı` / `Süresiz` (yanıt yok).
4. **Onay yolu.** Bugün müşteri portalı yoktur (`docs/SATIS-PLANI.md:158`); bu yüzden ilk sürümde yanıt
   **elle** girilir: muhasebe, müşteriden gelen e-posta/imzalı belgeyi görüp durumu işaretler ve belgeyi
   yükler. **doğrulanacak:** Luca'daki online mutabakat akışı; portal geldiğinde
   (`29-MOBIL-VE-DISA-ACILIM.md`) bu adım otomatikleşir.
5. **Onaylanan mutabakat değiştirilemez.** Yeni dönem için yeni mutabakat açılır. Gerekçe: onaylanmış
   bakiyenin sonradan değişmesi denetim izini anlamsız kılar.
6. **Fark varsa.** Fark kaydı **muhasebeleştirme değildir**; yalnız nottur. Düzeltme ayrı kayıtla
   (tahsilat/fatura) yapılır. Gerekçe: mutabakat farkı otomatik düzeltilirse gerçek hata gizlenir.

### 5.5 Birleştirme ve düzeltme

1. **Birleştirme koşulu.** İki cari **aynı VKN/TCKN**'ye sahipse birleştirilebilir. Farklı VKN'li iki
   kart **birleştirilemez** (hukuken ayrı kişilerdir).
2. **Ne taşınır?** Faturalar, tahsilatlar, sevkiyatlar, alınan faturalar, ödemeler, giderler, gruplar,
   yetkililer. **Ne taşınmaz?** Devir bakiyesi — iki devir toplanmaz, **kullanıcı seçer**: "hangi kartın
   devri geçerli".
3. **Kaynak kart silinmez, pasife alınır** ve üzerine `MergedIntoCustomerId` yazılır. Gerekçe: eski
   ekstrelerde/PDF'lerde görünen numara kaybolmamalıdır; ayrıca birleştirme geri alınabilmelidir.
4. **Birleştirme tek yönlüdür ve izlenir.** `CustomerMerged` olayı denetim izine yazılır
   (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.5). Geri alma **yeni** bir birleştirme gerektirir.
5. **Yetki.** Birleştirme yalnız `Admin`; ve **onay gerektirir** (maker-checker).
6. **Düzeltme.** VKN/TCKN, ünvan, vergi dairesi düzeltilebilir; düzeltme denetim izine yazılır
   (bugünkü otomatik alan izleme bunu zaten yapar: `AuditTrail.cs:67-71`).

### 5.6 Döviz cinsi

1. Bugün döviz **yoktur** (grep eşleşmesi yok). Bu doküman `Currency` alanını **ekler** ama kur
   çevrimi **yapmaz**.
2. Kural: cari kartında döviz cinsi **bilgi** alanıdır; fatura/tahsilat tutarları **TL** kalır. Gerekçe:
   kur çevrimi, kur kaynağı ve kur farkı muhasebesi olmadan yapılırsa yanlış bakiye üretir.
3. `22-ITHALAT-IHRACAT-DOVIZ.md` kur kaynağını ve kur farkını tanımladığında bu alan kullanılır.

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar.

### 6.1 Mevcut tablolara eklenecek sütunlar (hepsi boş olabilir)

| Tablo | Sütun | Tip | Neden |
|---|---|---|---|
| `Customers` | `Currency` | string(3)? | Döviz cinsi (bilgi) |
| `Customers` | `Iban` | string(34)? | Müşteride de olsun (tedarikçide var: `Supplier.cs:15`) |
| `Customers` | `Kind` | yeni enum | `Customer`, `Supplier`, `Both` |
| `Customers` | `SupplierId` | int? | `Both` ise eşleşen tedarikçi kartı |
| `Suppliers` | `CreditLimit` | decimal? | Risk limiti (müşteride var: `Customer.cs:28`) |
| `Suppliers` | `Currency` | string(3)? | Döviz cinsi |
| `Suppliers` | `CustomerId` | int? | `Both` ise eşleşen müşteri kartı |
| `Customers`/`Suppliers` | `MergedIntoId` | int? | Birleştirme hedefi (§5.5.3) |
| `Customers`/`Suppliers` | `RiskBlockEnabled` | bool | Müşteri bazında engelleme |

`Kind`, `SupplierId`, `CustomerId` alanları **iki yönlü** tutulur; tutarsızlık riskini azaltmak için
`Kind = Both` iken ikisinin de dolu olması uygulama katmanında doğrulanır.

**Kimlik tekilliği:** `TaxNumber` için **kısmi tekil indeks** eklenir (boş/null değerler muaf) —
bugünkü `EInvoiceNo`/`Ettn` indekslerinin kullandığı desenin aynısı
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-306`).

### 6.2 Yeni tablo: `CustomerContact` (yetkili kişiler)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CustomerId` / `SupplierId` | int? | Biri dolu olur |
| `FullName` | string(100) | |
| `Title` | string(100)? | Görev |
| `Phone` / `Email` | string? | |
| `IsPrimary` | bool | Birincil yetkili |
| `Notes` | string(300)? | |

Tekil indeks: kart başına **tek** `IsPrimary = true`.

### 6.3 Yeni tablo: `Reconciliation` (mutabakat)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CustomerId` / `SupplierId` | int? | |
| `PeriodStart` / `PeriodEnd` | DateOnly | Mutabakat dönemi |
| `ClosingBalance` | decimal | Bizdeki kapanış bakiyesi (gönderim anındaki) |
| `Status` | yeni enum | `Prepared, Sent, Confirmed, Disputed, NoResponse` |
| `SentAt` / `RespondedAt` | DateTime? | |
| `SentTo` | string? | E-posta |
| `CounterBalance` | decimal? | Karşı tarafın bildirdiği bakiye |
| `Difference` | decimal? | `ClosingBalance - CounterBalance` |
| `DifferenceReason` | string(500)? | Fark varsa zorunlu |
| `DocumentPath` | string(300)? | İmzalı mutabakat belgesi |
| `PreparedBy` / `DecidedBy` | string? | Maker-checker izi |

İndeksler: `(CustomerId, PeriodEnd)`, `(Status)`.

### 6.4 Yeni tablo: `CariMergeLog` (birleştirme kaydı)

`SourceKind`, `SourceId`, `TargetKind`, `TargetId`, `MovedInvoices`, `MovedPayments`, `MovedTrips`,
`MovedExpenses`, `KeptOpeningBalanceFrom`, `At`, `By`, `Reason`. Neden ayrı tablo: birleştirme geri
alınamaz bir işlemdir; ne taşındığının kanıtı fatura satırlarında dağınık durmamalıdır.

### 6.5 Mevcut tablolara eklenecek: mahsup hedefleri

| Tablo | Sütun | Tip | Neden |
|---|---|---|---|
| `Payments` | `TargetInvoiceIds` | `List<int>?` | Çoklu fatura kapatma. Bugün `SupplierPayment.TripIds` aynı işi yapar: `SupplierPayment.cs:15` |

**Nasıl saklanır:** `SupplierPayment.TripIds` bugün veritabanında nasıl tutuluyorsa (mevcut migration ve
EF yapılandırması) **aynı yöntem** kullanılır; yeni bir dizi saklama biçimi icat edilmez. Uygulama
sırasında `AppDbContext`'teki `SupplierPayment` yapılandırması birebir örnek alınır
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs`).

`AllocPayment` çağrısı müşteri tarafında `Targets` alanını doldurmaya başlar
(`BalanceService.cs:39` bugün `null`); motor değişmez.

### 6.6 Mevcut tablolarda değişmeyenler

`Customer.OpeningBalance`/`OpeningBalanceDate`, `Payment.InvoiceId`, `Payment.InstrumentStatus`,
`CustomerGroup`, `InvoiceTemplate`, `InvoiceNoteTemplate`, `LegacyKey`/`LegacyBalance` alanları
**aynen kalır** (`Customer.cs:25-47`, `Payment.cs:7`, `:21`). Terk edilen alan yoktur; bu, geri dönüş
yolunun temelidir.

## 7. API uçları

Bugünkü uçlar **korunur** (`server/YesLojistik.Api/Controllers/CustomersController.cs:35-126`,
`CariController.cs`, `PaymentsController.cs:49-158`, `SupplierPaymentsController.cs:44-124`).
Yeniler yanlarına eklenir.

### 7.1 Mevcut uçlar (değişmez)

| Metot | Yol | Yetki | Not |
|---|---|---|---|
| GET | `/api/customers` | Ofis | Liste (`CustomersController.cs:35`) |
| GET | `/api/customers/{id}` | Ofis | Özet (`:71`) |
| GET | `/api/customers/{id}/movements` | Ofis | Hareketler (`:79`) |
| GET | `/api/customers/{id}/risk` | Ofis | Risk (`:75`) |
| GET | `/api/customers/{id}/statement` | Ofis | Ekstre PDF/Excel (`:86`) |
| POST | `/api/customers/{id}/statement/email` | `Accounting` | Ekstre e-postası (`:99`) |
| POST/PUT/DELETE | `/api/customers[/{id}]` | Ofis | Kart CRUD (`:104`, `:115`, `:125`) |
| GET | `/api/cari/customers`, `/api/cari/suppliers` | `Accounting` | Cari tabloları (`CariController.cs:14-18`) |
| GET | `/api/cari/{customers\|suppliers}/export` | `Accounting` | Excel/PDF (`:24-31`) |
| GET | `/api/suppliers/{id}/movements`, `/statement` | Ofis | Tedarikçi (`SuppliersController.cs:87`, `:91`) |
| POST | `/api/payments` vb. | `Accounting` | Tahsilat yazma (`PaymentsController.cs:135-158`) |
| POST | `/api/supplier-payments/bulk[/preview]` | `Accounting` | Toplu ödeme (`SupplierPaymentsController.cs:113-124`) |

### 7.2 Yeni uçlar

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/cari` | `kind, search, filter, page` | `PagedResult<CariRow>` (birleşik liste) | `Accounting` |
| GET | `/api/cari/{id}` | — | `CariCardDto` (iki bakiye) | `Accounting` |
| GET | `/api/tax/lookup` | `?taxNumber=` | `{ taxNumber, title, taxOffice, address, city, district, source }` | `Accounting` |
| POST | `/api/tax/lookup/bulk` | `{ taxNumbers: [] }` | Sonuç dizisi | `Admin` |
| GET | `/api/customers/{id}/contacts` | — | Yetkili listesi | Ofis |
| POST/PUT/DELETE | `/api/customers/{id}/contacts[/{contactId}]` | Yetkili gövdesi | Kayıt | Ofis |
| POST | `/api/payments/allocate-preview` | `{ customerId, amount, targetInvoiceIds, date }` | Fatura bazında kapanış | `Accounting` |
| GET | `/api/reconciliations` | `status, from, to, page` | `PagedResult<ReconciliationDto>` | `Accounting` |
| POST | `/api/reconciliations` | `{ customerId, periodStart, periodEnd }` | Hazırlanan mutabakat | `Accounting` |
| POST | `/api/reconciliations/{id}/send` | `{ to, note? }` | Gönderilen mutabakat | `Accounting` |
| POST | `/api/reconciliations/{id}/respond` | `{ status, counterBalance?, reason?, documentId? }` | Mutabakat | `Admin` |
| POST | `/api/cari/merge/preview` | `{ sourceKind, sourceId, targetKind, targetId, keepOpeningFrom }` | Taşınacak kayıt sayıları | `Admin` |
| POST | `/api/cari/merge` | Aynı gövde + `reason` | `CariMergeLogDto` | `Admin` + onay |

Kurallar:

- `tax/lookup` sağlayıcı tanımlı **değilse** `501` yerine `{ source: null }` ve
  `"Vergi dairesi sorgusu bu kurulumda tanımlı değil. Alanı elle doldurun."` mesajı döner. Gerekçe:
  sağlayıcı seçilmeden paneli kırılmaz hâle getirmemek. **doğrulanacak:** hangi servis kullanılacak
  (GİB, ücretli ticari servis, mali müşavir aracı) — sözleşme ve anahtar gelmeden kod yazılmaz.
- `tax/lookup` sonucu **önizlemedir**: kullanıcı `Kaydet` demeden karta yazılmaz. Gerekçe: yanlış
  eşleşme (aynı ünvanlı iki firma) kartı bozabilir.
- `cari/merge` **onay akışına** bağlanır (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2): hazırlayan
  `Admin`, onaylayan başka bir `Admin`. Gerekçe: geri alınamaz işlem.
- `payments/allocate-preview` **hiçbir şey yazmaz**; yalnız `PaymentAllocator` sonucunu gösterir
  (`server/YesLojistik.Core/Domain/PaymentAllocator.cs:19`).
- Tüm yazma uçlarında **ayna** ve **dönem kilidi** kuralları geçerlidir
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:20-28`).
- `TaxNumber` tekilliği sunucuda doğrulanır: çakışmada
  `"Bu VKN/TCKN ile kayıtlı bir cari zaten var: {ünvan} (#{id})."` hata metni döner ve mevcut kartın
  bağlantısı verilir.

## 8. Yetki, onay ve denetim izi

| İş | Görme | Ekleme | Düzeltme | Silme | Onaylama |
|---|---|---|---|---|---|
| Cari listesi/kartı | Operasyon, Muhasebe, Yönetici | Operasyon, Muhasebe | Operasyon, Muhasebe | Yönetici (hareketsizse) | — |
| Cari tablosu (bakiyeler) | Muhasebe, Yönetici | — | — | — | — |
| Tahsilat | Muhasebe, Yönetici | Muhasebe | Muhasebe | Yönetici | Yönetici (limit üstü) |
| Çoklu mahsup | Muhasebe, Yönetici | Muhasebe | Muhasebe | — | Yönetici (limit üstü) |
| Risk limiti değiştirme | Muhasebe, Yönetici | — | Yönetici | — | — |
| Mutabakat hazırlama/gönderme | Muhasebe | Muhasebe | Muhasebe (yanıtsızken) | — | — |
| Mutabakat yanıtı işleme | Muhasebe, Yönetici | — | Yönetici | — | Yönetici |
| Vergi dairesi sorgusu | Operasyon, Muhasebe | — | — | — | — |
| Toplu VKN sorgusu | Yönetici | — | — | — | — |
| Cari birleştirme | Yönetici | Yönetici (hazırlar) | — | — | Başka Yönetici |

Bu tablo bugünkü politikaları **bozmaz**: `CariController` `Accounting` politikasındadır
(`server/YesLojistik.Api/Controllers/CariController.cs:12`) ve öyle kalır; müşteri kartı CRUD'u bugün
olduğu gibi ofis kullanıcısına açık kalır (`CustomersController.cs:104`).

Maker-checker: tahsilat limit üstü (`07` §5.2), cari birleştirme (koşulsuz), mutabakat yanıtı.
Denetim izi olayları: `CariMerged`, `ReconciliationSent`, `ReconciliationConfirmed`,
`ReconciliationDisputed`, `TaxLookupApplied`, `RiskLimitChanged`, `PaymentAllocated`.

Bugünkü otomatik alan izleme çalışmaya devam eder
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`) ve cari alanlarının okunur adları
hazırdır: `VKN/TCKN`, `Vergi dairesi`, `Devir bakiyesi`, `Vade (gün)`, `Risk limiti`, `Yetkili`, `IBAN`
(`AuditTrail.cs:29`, `:33`, `:50`). Yeni `CustomerContact` ve `Reconciliation` varlıkları `BaseEntity`
türevi yapılırsa otomatik izlenir (`AuditTrail.cs:54-56` bu koşulu arar) — bu **bilinçli** tercihtir.

## 9. Kabul kriterleri

1. `GET /api/cari` tek listede hem müşteri hem tedarikçi satırı döner; `Both` türünde iki bakiye
   **ayrı** sütunda görünür ve toplamları netleştirilmez.
2. Aynı VKN/TCKN ile ikinci cari kaydı denemesi reddedilir; hata metni mevcut kartın ünvanını ve
   numarasını içerir.
3. `TaxNumber` indeksi boş değerlerde çakışma üretmez (100 boş VKN'li kart yan yana kaydedilebilir).
4. `POST /api/payments/allocate-preview` iki fatura seçildiğinde **hiçbir kayıt yazmaz** ve iki fatura
   için kapanan tutarları döner (test edilir).
5. Çoklu fatura kapatma kaydedildiğinde: seçilen faturalar sırayla kapanır, artan en eski açık faturaya
   gider ve **toplam** tahsilat tutarı değişmez.
6. Ödeme açık bakiyeyi aşarsa kayıt yapılır, avans negatif bakiye olarak görünür ve ekranda
   "Müşteri fazla ödeme yapmış (avans)" yazar.
7. Karşılıksız işaretlenen çek müşteri bakiyesini **artırır** (geri yükler); bugünkü kural korunur
   (`Payment.cs:26-27`).
8. Risk limiti %100 aşıldığında, engelleme **kapalıyken** kayıt yapılır ve sarı/kırmızı uyarı çıkar;
   engelleme **açıkken** kayıt yapılmaz ve onay kaydı açılır.
9. Mutabakat `Farklı` durumuna geçerken fark gerekçesi zorunludur; gerekçesiz deneme reddedilir.
10. Onaylanmış mutabakat üzerinde değişiklik yapılamaz (test edilir).
11. Cari birleştirme farklı VKN'li iki kartı reddeder.
12. Cari birleştirme sonrası kaynak kart pasiftir, `MergedIntoId` doludur, **silinmemiştir** ve kaynak
    kartın eski ekstresi hâlâ açılabilir.
13. Birleştirmede devir bakiyesi **toplanmaz**; seçilen kartın devri geçerli olur.
14. `GET /api/customers/{id}/statement` çıktısı, mahsup kuralları değiştikten sonra da bugünkü
    `CariTests.cs` / `PayableTests.cs` testlerini geçer (regresyon kanıtı).
15. Mevcut testlerin **hiçbiri** silinmez veya atlanmaz; `client/e2e/cari.spec.ts` yeşil kalır.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Mevcut `PaymentAllocatorTests.cs` **genişletilir**:
- Çoklu hedef: seçilen faturalar sırayla kapanır, artan FIFO'ya gider
  (`PaymentAllocator.cs:27-39` bugün test edilmemiş yol olabilir — uygulama sırasında doğrulanır).
- Hedef listesinde **olmayan** fatura kimliği sessizce atlanır (`:30` `paid.ContainsKey` süzgeci).
- Kısmi + FIFO birlikte: iki fatura, üç tahsilat.
- İade (negatif tutar) bakiyeyi artırır.

Yeni dosya: `CariIdentityTests.cs`
- VKN tekilliği: aynı VKN ikinci kart → hata.
- Boş VKN'ler çakışmaz.
- `Kind = Both` tutarlılığı: `SupplierId`/`CustomerId` boşsa hata.

Yeni dosya: `ReconciliationRulesTests.cs`
- `Disputed` için fark gerekçesi zorunlu.
- `Confirmed` sonrası değişiklik reddi.
- Devir seçiminin toplanmadığı (birleştirme).

Yeni dosya: `CariMergeTests.cs`
- Farklı VKN reddi.
- Aynı VKN'de taşınan kayıt sayıları doğru.
- Devir bakiyesi hedefte **kaynak + hedef toplamı değil**, seçilen değer.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Mevcut `CariTests.cs`, `SupplierTests.cs`, `PayableTests.cs`, `CariExportTests.cs` **korunur**.
Yeni dosya: `CariUnifiedTests.cs` (`ApiFactory` üzerinden —
`server/YesLojistik.Tests/Integration/ApiFactory.cs`):
- `GET /api/cari` birleşik liste; `Both` caride iki bakiye.
- VKN tekilliği uçtan uca.
- `POST /api/payments/allocate-preview` yazma yapmıyor (kayıt sayısı değişmiyor).

Yeni dosya: `ReconciliationApiTests.cs`
- Hazırla → gönder → yanıtla akışı.
- Yetkisiz rol (`Operations`) mutabakat yanıtında **403** alır (bugünkü rol testi üslubu:
  `server/YesLojistik.Tests/Integration/EInvoiceTests.cs:157`).

Yeni dosya: `TaxLookupTests.cs`
- Sağlayıcı tanımlı değilken uç **hata değil** bilgi mesajı döner.
- Sahte sağlayıcı (`FakeTaxLookup`) ile bulunan vergi dairesi kartı **kendiliğinden** değiştirmez;
  yalnız önizleme döner.

### 10.3 Panel e2e testleri (`client/e2e/`)

Mevcut `client/e2e/cari.spec.ts` **korunur**. Yeni dosya: `cari-mahsup.spec.ts`
- Muhasebe kullanıcısı: tahsilat formunda **iki** fatura seç → önizleme tutarları görünür → kaydet →
  hareketlerde iki fatura `Ödendi` olur.
- Fazla tutar girilince avans uyarısı görünür ve kayıt başarılı olur.

Yeni dosya: `cari-mutabakat.spec.ts`
- Mutabakat hazırla, gönder, "Fark var" yanıtı gir → gerekçesiz deneme hata verir.

Yeni dosya: `new-ui/cari-kart.spec.ts`
- Yeni görünümde `/cari/:id` sekmeleri çizilir (`useNewUi`: `client/e2e/helpers.ts:44-46`);
  klasik görünümde de aynı ekran çalışır (kural §1.3).

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | Birleşik cari modeli: `Kind`, çift yönlü bağ, `TaxNumber` indeksi, migration | 2,5 | `05-VERI-MODELI.md` |
| 2 | `GET /api/cari` birleşik liste + panel Cari Listesi | 3 | 1 |
| 3 | Cari Kartı ekranı (`/cari/:id`, 10 sekme) | 5 | 1 |
| 4 | `CustomerContact` tablosu + Yetkililer sekmesi | 2 | 1 |
| 5 | `Payments.TargetInvoiceIds` + mahsup önizleme + form genişletmesi | 3 | 1 |
| 6 | Avans kuralı ve uyarıları | 1 | 5 |
| 7 | Risk limiti geliştirmesi (engelleme ayarı, geçmiş) | 2 | 1 |
| 8 | `Reconciliation` tablosu + uçlar + sekme | 4 | 1 |
| 9 | Cari birleştirme (önizleme + taşıma + log + onay) | 4 | 1 |
| 10 | Döviz cinsi alanı + panel | 1 | 1 |
| 11 | VKN/TCKN sorgu soyutlaması + uçlar + panel düğmesi (**sağlayıcı hariç**) | 2 | Sağlayıcı sözleşmesi |
| 12 | Gerçek vergi dairesi sağlayıcısı | 2-4 | **doğrulanacak:** hangi servis |
| 13 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam (gerçek VKN sağlayıcısı hariç)** | | **~36 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo/alan sözleşmesi), `06-MUHASEBE-MOTORU.md` (cari
bakiyenin fişle bağlantısı), `07-YETKI-ONAY-NUMARALANDIRMA.md` (risk limiti yetkisi, onay akışı, dönem
kilidi — cari hareketleri kilitli dönemde yazılamaz).

**Bu dokümanı bekleyenler:** `10-STOK-VE-DEPO.md` (cari-stok bağı), `12-SATIN-ALMA.md` (tedarikçi cari
borcu), `15-BANKA-ENTEGRASYON.md` (ekstre eşleştirme → cari hareket), `16-CEK-SENET.md` (ciro ve
karşılıksız), `22-ITHALAT-IHRACAT-DOVIZ.md` (döviz kuru), `29-MOBIL-VE-DISA-ACILIM.md` (müşteri portalı →
online mutabakat), `25-CRM-TEKLIF-TAKIP.md` (aday → cari dönüşümü).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| VKN tekilliği canlı veride çakışma bulur | Yüksek | İndeks **kısmi** ve migration önce **rapor** üretir (kaç çakışma var); otomatik birleştirme yapılmaz | İndeks kaldırılır; çakışmalar elle çözülür |
| Cari birleştirme yanlış yapılır | Çok yüksek | Önizleme (kaç fatura/tahsilat taşınacak) + `Admin` maker-checker + `CariMergeLog` + kaynak kart silinmez | `MergedIntoId` temizlenip kayıtlar geri taşınır (log sayesinde hangi kayıtlar olduğu bilinir) |
| VKN sorgusu yanlış eşleşme getirir | Orta | Sonuç **önizleme**; kullanıcı onaylamadan yazılmaz | Alan elle düzeltilir; düzeltme izlenir |
| Çoklu mahsup bakiye tutarsızlığı yaratır | Yüksek | Motor değişmez; yalnız `Targets` doldurulur (`BalanceService.cs:39`); tedarikçi tarafında aynı motor zaten çalışıyor (`PayableService.cs:110-112`) | `TargetInvoiceIds` kullanılmazsa eski tek-fatura davranışı aynen döner |
| Döviz cinsi eklenince bakiye karışır | Yüksek | Döviz yalnız **bilgi**; tüm tutarlar TL kalır (§5.6) | Alan gizlenir |
| Risk limiti engelinin yanlışlıkla açılması | Yüksek | Varsayılan **kapalı**; firma ayarı + müşteri bazlı ayar; uyarı metni her durumda görünür | Ayar kapatılır |
| Mutabakat farkının otomatik düzeltilmesi | Yüksek | Fark yalnız **not**; düzeltme ayrı kayıtla (§5.4.6) | — |
| Yetkili kişiler tablosunun mevcut `ContactName` ile ayrışması | Orta | Mevcut alan birincil yetkilinin adı olarak **okunmaya** devam eder; iki yönlü senkron | Yeni tablo kullanılmazsa mevcut alan çalışır |
| Bakiye performansı (her seferinde hesaplanıyor) | Orta | Bugünkü tasarım bilinçli: `BalanceService.cs:8` "Bakiye saklanmaz"; indeksler ve sayfalama korunur | Önbellek `36-PERFORMANS-OLCEK.md` |

**Doğrulanacaklar:**

1. **doğrulanacak:** Luca'da müşteri ve tedarikçi **tek cari kartında** mı tutuluyor; aynı VKN'ye hem
   satış hem alım yapılabiliyor mu (Luca demo/kılavuz).
2. **doğrulanacak:** VKN/TCKN → vergi dairesi + adres sorgusu için **hangi servis** kullanılacak (GİB
   servisi, ücretli ticari servis, mali müşavir aracı); ücret, günlük sorgu sınırı, sözleşme ve yetki.
   Bu, `docs/plan-erp/02-LUCA-ENVANTERI.md:34-35` ile aynı ihtiyaçtır ve **kullanıcıdan bilgi
   beklemektedir**.
3. **doğrulanacak:** Luca'nın online mutabakat akışı (karşı taraf nasıl onaylıyor, onay izi nasıl
   saklanıyor) — `docs/plan-erp/02-LUCA-ENVANTERI.md:50`.
4. **doğrulanacak:** Luca'da cari birleştirme var mı, devir bakiyesi nasıl ele alınıyor.
5. **doğrulanacak:** Luca'da risk limiti uyarısı kaydı engelliyor mu — `docs/plan-erp/02-LUCA-ENVANTERI.md`
   bu konuda bilgi içermiyor.
6. **doğrulanacak:** Adat (faiz) hesabı bizim kapsamımıza girecek mi; girecekse oran ve dayanak —
   **mali müşavir onayı** gerekir; bu doküman yorum yapmaz
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:36`).
7. **doğrulanacak:** BA-BS verisinin bizde üretilip üretilmeyeceği ve hangi dönemde
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:31`).
8. **doğrulanacak:** Cari verisinin saklama süresi ve KVKK kapsamı — `35-DENETIM-IZI-KVKK-UYUM.md` ile
   birlikte, avukat.
9. **doğrulanacak:** Canlı veritabanında **aynı VKN'li kaç cari** olduğu (migration öncesi rapor);
   kullanıcı karar verir.
10. **doğrulanacak:** Mutabakat mektubunun hukuki geçerliliği için imzalı belge şartı —
    avukat/mali müşavir.

Sonraki belgeyle bağlantı: bu doküman `07-YETKI-ONAY-NUMARALANDIRMA.md`'nin yetki/onay/dönem kilidi
altyapısını ve `08-E-BELGE-KATMANI.md`'nin gelen fatura akışını kullanır; `12-SATIN-ALMA.md`'ye tedarikçi
cari borcunu, `15-BANKA-ENTEGRASYON.md`'ye ekstre eşleştirmesini, `22-ITHALAT-IHRACAT-DOVIZ.md`'ye döviz
kuru ihtiyacını devreder.
