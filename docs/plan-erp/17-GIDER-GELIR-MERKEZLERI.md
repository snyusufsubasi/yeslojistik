# 17 — Gider ve Gelir Merkezleri

## 1. Amaç ve kapsam

Bu modül, paranın **nereye gittiğini** ve **nereden geldiğini** kalem kalem görünür kılar. Bugün
giderler dokuz sabit kategoriye sıkışmıştır (`server/YesLojistik.Core/Entities/Enums.cs:43`) ve
kullanıcı yalnız serbest bir "Kategori (kendi listeniz)" metni yazabilir
(`server/YesLojistik.Core/Entities/Expense.cs:45-46`). Bu metin serbest olduğu için analiz güvenilir
değildir: aynı gider bir ay "Nakliye spot araçlar", başka ay "spot nakliye" diye yazılır ve rapor iki
satıra bölünür.

Modülün çözdüğü işler:

1. **Gider ve gelir türlerini tanımlamak.** Tür artık serbest metin değil, kullanıcı tarafından
   yönetilen bir karttır (ad, üst tür, varsayılan KDV, varsayılan masraf merkezi).
2. **Masraf merkezi / iş merkezi tanımlamak.** Luca'daki "iş merkezi"
   (`02-LUCA-ENVANTERI.md:59`) ve "gelir-gider yönetimi" (`02-LUCA-ENVANTERI.md:12`) karşılığı.
3. **Dağıtım yapmak.** Bir gider projeye, müşteriye, araca veya merkeze yüzde/tutar ile
   paylaştırılır. Ör. ofis kirasının %60'ı "Merkez", %40'ı "Depo" merkezine yazılır.
4. **Tekrarlayan giderleri merkezlemek.** Bugünkü sabit ödemeler ekranı
   (`client/src/pages/RecurringPaymentsPage.tsx`) masraf merkezi bilmez; ödeme yapıldığında oluşan
   gider `RecurringPaymentsController.Pay` içinde yalnız kategori, tutar ve hesap ile doğar
   (`server/YesLojistik.Api/Controllers/StaffController.cs:177-181`).
5. **Bütçe koymak ve gerçekleşenle karşılaştırmak.** Merkez ve tür bazında aylık/yıllık bütçe;
   gerçekleşen tutar, sapma yüzdesi ve uyarı eşiği.
6. **Analiz üretmek.** Tür, merkez, müşteri, araç, proje ve dönem kırılımında gider analizi; KDV
   hariç net tutar üzerinden (`ExpenseVat.Net`, `server/YesLojistik.Core/Domain/ExpenseVat.cs:23-25`).

**Kapsam dışı:** muhasebe fişi ve hesap planı (`06-MUHASEBE-MOTORU.md`), stok maliyeti
(`10-STOK-VE-DEPO.md`), sabit kıymet amortismanı (`19-SABIT-KIYMET.md`), üretim maliyeti
(`20-URETIM-RECETE.md`), şoför masraf onayının kendisi (bu doküman onay akışını **kullanır**, onay
ekranını yeniden yazmaz).

## 2. Luca'daki karşılığı

Luca Koza'nın menü yapısında **Gelir-Gider Yönetimi** ayrı bir modül olarak yer alır; ayrıca
Koza Profesyonel sürümün **Analizler** modülünü ekler (`02-LUCA-ENVANTERI.md:12`, `:20-23`).
Kaynaktan birebir okunan iki özellik:

- **"İş merkezi" tanımı: birden fazla iş merkezi gelir-gider yeri olarak tanımlanır; gelir-gider
  türleri tanımlanır** (`02-LUCA-ENVANTERI.md:59`). Yani Luca'da hem **tür** hem **merkez** ayrı
  tanım kartlarıdır ve bizim planımızın omurgası budur.
- **"Stok/fatura/finans hareketlerinde 'işletmeye özel hareket tanımlama' ve hareket bazında
  gruplama"** (`02-LUCA-ENVANTERI.md:62`). Bu, gider türlerinin işletmeye özel tanımlanabildiğini
  gösterir.

Doğrulanmayan noktalar:

- **doğrulanacak:** Luca'da "iş merkezi" kartının alanları (kod, ad, üst merkez, sorumlu, aktiflik)
  ve kaç seviye derinlik desteklendiği. Kaynak: Luca kullanım kılavuzu / demo.
- **doğrulanacak:** Luca'da gider dağıtımının (tek giderin birden çok merkeze paylaştırılması)
  bulunup bulunmadığı; varsa dağıtım anahtarları (yüzde, tutar, miktar, gün).
- **doğrulanacak:** Luca'da bütçe modülünün adı, kapsamı ve sapma raporunun bulunup bulunmadığı.
  `02-LUCA-ENVANTERI.md` içinde bütçe **geçmez**; bu yüzden bütçe bölümü bizim **önerimizdir**,
  Luca'dan kopya değildir.
- **doğrulanacak:** Luca'da tekrarlayan (periyodik) gider tanımının yeri ve alanları.
- **doğrulanacak:** Luca'nın gelir-gider türü kartında varsayılan KDV oranı ve tevkifat alanı olup
  olmadığı.

## 3. Bizde bugün

**Gider tarafı:**

- Kategori listesi sabittir: `Fuel`, `Maintenance`, `Toll`, `DriverAllowance`, `Tire`, `Insurance`,
  `Tax`, `Other`, `DriverAdvance` (`server/YesLojistik.Core/Entities/Enums.cs:43`). Panelde aynı liste
  `client/src/pages/ExpensesPage.tsx:29` içinde Zod şeması olarak yinelenir.
- Serbest kategori metni vardır: `Expense.CategoryName` (`Expense.cs:45-46`) ve ekranda datalist ile
  desteklenen alan (`client/src/pages/ExpensesPage.tsx:275-278`). Uç `GET /api/expenses/categories`
  mevcut kategorileri toplar (`client/src/pages/ExpensesPage.tsx:168`).
- Gider adı ayrı alandır: `Expense.Title` (`Expense.cs:47-48`).
- Dönemsel gider alanları vardır: `PeriodStart`, `PeriodEnd` (`Expense.cs:49-51`) ve formda
  "Dönem başlangıcı / Dönem bitişi" olarak görünür (`ExpensesPage.tsx:297-298`).
- KDV: tutar KDV **dahil** girilir, oran kategoriden varsayılan gelir; net tutar `ExpenseVat.Net`
  ile hesaplanır (`server/YesLojistik.Core/Domain/ExpenseVat.cs:19-33`). Kural
  `docs/KDV-KURALLARI.md` ve kod içindedir.
- Ödeme yöntemi: `IsOnCredit` (vadeli) + `CashAccountId` + `SupplierId`
  (`Expense.cs:23-41`); vadeli giderde tedarikçi zorunludur
  (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:92`).
- **Şoför masrafı onay akışı çalışıyor:** şoförün girdiği masraf `ApprovalStatus.Pending` olur ve
  ofiste onay/red bekler; `ExpenseService.ReviewAsync`
  (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31-47`) onaylar veya gerekçeyle
  reddeder ve reddedileni şoföre bildirir. Reddedilen masraf raporlara ve şoför hesabına girmez
  (`client/src/pages/ExpensesPage.tsx:148`). Ekranda onay düğmeleri yalnız `accounting` yetkisiyle
  görünür (`ExpensesPage.tsx:85-88`).
- Kasa/banka bakiyesine giren gider: yalnız `PaidBy == Company`, `!IsOnCredit` ve
  `ApprovalStatus == Approved` (`server/YesLojistik.Infrastructure/Services/CashService.cs:31-36`).
- **Gider kategorisi toplamları:** `GET /api/expenses/categories` ucu kategori adına göre toplam
  döner (`server/YesLojistik.Api/Controllers/ExpensesController.cs`) ve gider raporu sekmesi bunu
  kullanır (`client/src/pages/ReportsPage.tsx:73`).

**Tekrarlayan gider tarafı:**

- `RecurringPayment` tablosu: `Title`, `Detail`, `Amount`, `DueDay` (1–28), `Category`,
  `CashAccountId`, `IsActive` (`server/YesLojistik.Core/Entities/Staff.cs:30-41`).
- Ekran `client/src/pages/RecurringPaymentsPage.tsx:26-95`: ay seçici, üç `StatCard` (bu ayın toplamı,
  ödenmeyen, ödenen), durum rozetleri "Ödendi / Gecikti / Bekliyor / Pasif"
  (`RecurringPaymentsPage.tsx:43-46`).
- "Ödendi" denince gider kaydı doğar: `RecurringPaymentsController.Pay`
  (`server/YesLojistik.Api/Controllers/StaffController.cs:171-184`). Gider, `RecurringPaymentId` ile
  sabit ödemeye bağlanır (`Expense.cs:42-44`).
- Sabit ödemede **masraf merkezi alanı yoktur**; gider `Category` ve `Description` ile doğar
  (`StaffController.cs:179-181`).

**Gelir tarafı:**

- Gelir, ayrı bir modül değildir: sevkiyat satış fiyatı (`Trip.SalePrice`) ve kestiğimiz fatura
  üzerinden gelir. Fatura toplamı `InvoiceCalculator` ile hesaplanır
  (`server/YesLojistik.Core/Domain/InvoiceCalculator.cs`). Kâr formülü KDV hariçtir
  (`server/YesLojistik.Core/Domain/TripProfit.cs`).
- Kâr kırılımları rapor ekranındadır: aylık, kâr, müşteri, güzergâh, sevkiyat, araç, şoför, yakıt,
  yaşlandırma, borçlar, tedarikçiler, giderler, muhasebe (`client/src/pages/ReportsPage.tsx:16`).
- **"Masraf merkezi", "iş merkezi" veya "bütçe" kavramı kodda hiç yoktur.** Depoda yapılan arama
  yalnız iki doküman satırında geçer (`docs/plan-erp/02-LUCA-ENVANTERI.md:59`,
  `docs/plan-erp/00-DIZIN.md:35`) ve bir bütçe kavramı yalnız UI yükseklik bütçesi anlamında
  kullanılır (`docs/plan/02-BUGUN.md:106`).

**Eksik listesi:** (1) gider/gelir türü kartı yok, (2) masraf merkezi kavramı yok, (3) dağıtım yok,
(4) sabit ödemede merkez yok, (5) bütçe yok, (6) merkez bazlı analiz yok, (7) `CategoryName` serbest
metni güvenilir değil.

## 4. Hedef ekranlar ve alanlar

Yeni rota: `/tanimlar/gelir-gider` (klasik menüde "Tanımlar" grubu altında, yeni görünümde
`/ayarlar?tab=centers`). Yeni sekme kümesi: **Türler · Merkezler · Dağıtım · Bütçe · Analiz**.

### 4.1 Gider/gelir türleri

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Ad | metin (100) | evet | Tekil; aynı ad ikinci kez eklenemez |
| Yön | seçim (gider / gelir) | evet | Varsayılan gider |
| Üst tür | seçim (tür listesi) | hayır | Tek seviye üst başlık |
| Eski kategori eşlemesi | seçim (dokuz sabit kategori) | hayır | Aktarım ve rapor uyumu için |
| Varsayılan KDV oranı | seçim (%0/%1/%10/%20) | evet | Seçilirse gider formunda ön dolu gelir |
| Varsayılan masraf merkezi | seçim | hayır | Gider formunda ön dolu gelir |
| Renk | seçim (jeton) | hayır | Grafiklerde kullanılır; renk körlüğü için desim etiketi zorunlu |
| Aktif | anahtar | evet | Pasif tür yeni kayıtta seçilemez |
| Sıra | sayı | evet | Liste sırası |

### 4.2 Masraf merkezleri (iş merkezleri)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kod | metin (10) | evet | Tekil, büyük harf |
| Ad | metin (100) | evet | |
| Üst merkez | seçim (merkez listesi) | hayır | En fazla 3 seviye |
| Tür | seçim (genel / araç / depo / proje / müşteri / idari) | evet | Araç ve müşteri seçilirse bağlanacak kayıt sorulur |
| Bağlı araç | seçim (araç listesi) | tür "araç" ise evet | `Vehicles` listesinden |
| Bağlı müşteri | seçim (müşteri listesi) | tür "müşteri" ise evet | |
| Sorumlu | metin (100) | hayır | |
| Bütçe kullanır | anahtar | evet | Kapalıysa bütçe ekranında çıkmaz |
| Aktif | anahtar | evet | |

### 4.3 Dağıtım

Bir giderin birden çok merkeze/projeye bölünmesi. Satırlar: merkez, proje/müşteri, oran (%),
tutar, not. Kurallar: oranların toplamı **%100** olmalıdır; tutar girilirse oran ve tutar
uyuşmalıdır (0,01 TL tolerans). Dağıtım yoksa giderin tamamı türün varsayılan merkezine yazılır.

### 4.4 Gider girişi (mevcut gider formunun genişletilmesi)

Mevcut form korunur (`client/src/pages/ExpensesPage.tsx:156-311`); şu alanlar eklenir:

| Alan | Tip | Nerede | Not |
|---|---|---|---|
| Tür | seçim (tür kartları) | kategori seçicinin yanında | Zorunlu |
| Masraf merkezi | seçim | "Sevkiyat, tedarikçi, ödeme…" katlanır bölümünde | Tür varsayılanı ön dolu |
| Proje / müşteri | seçim | aynı bölümde | Merkez türü "proje/müşteri" ise dolu gelir |
| Dağıtım | düğme → pencere | aynı bölümde | Yalnız "Dağıt" denirse açılır |
| Ödeme yöntemi | seçim (nakit / banka / kredi kartı / vadeli) | ödeme bölümünde | Bugünkü `IsOnCredit` + hesap ikilisi korunur |
| Belge no | metin (50) | aynı bölümde | Fiş/fatura no |
| Onay durumu | salt okunur rozet | üstte | Şoför girdiyse "Onay bekliyor" |

### 4.5 Bütçe

| Sütun | İçerik |
|---|---|
| Merkez | Kod · Ad |
| Tür | Gider/gelir türü |
| Dönem | Ay veya yıl |
| Bütçe | Girilen tutar (KDV hariç baz) |
| Gerçekleşen | Onaylı kayıtlardan hesaplanan net tutar |
| Sapma | Tutar ve yüzde; aşım kırmızı, %90 üstü sarı |
| Kalan | Bütçe − gerçekleşen |

Bütçe girişi `SumStrip` altında satır satır yapılır; aylık kopyalama düğmesi vardır ("Geçen yılın
aynı ayı", "Bu yılın ortalaması").

### 4.6 Analiz

Sekmeler: **Türe göre · Merkeze göre · Müşteriye göre · Araca göre · Dönemsel · Bütçe sapması**.
Her sekmede `FilterBar` (tarih aralığı, merkez, tür, araç), `DataTable` ve toplam şeridi; grafik
mevcut `client/src/lib/chart.ts` renklerini kullanır. Dışa aktarma `ExportButton` ile Excel.

## 5. İş kuralları

1. **Geriye dönük uyum.** Mevcut giderlerin `Category` alanı korunur
   (`Enums.cs:43`); yeni tür alanı boş kalabilir. Rapor, tür boşsa eski kategoriye düşer. Böylece
   geçmiş veri bozulmaz ve migration **yalnız ekleme** olur (`01-ORTAK-SARTNAME.md:22-23`).
2. **`CategoryName` serbest metni korunur.** Kullanıcı eski alışkanlığını kaybetmez; ancak seçilen
   tür varsa **tür kazanır** ve analiz türü kullanır. Ekranda "Tür seçilmedi" uyarısı çıkar.
3. **Dağıtım toplamı.** Oranların toplamı %100 değilse kayıt reddedilir: "Dağıtım oranlarının
   toplamı %100 olmalı." Tutar girilmişse oran × gider tutarı, girilen tutarla 0,01 TL içinde
   uyuşmalıdır.
4. **KDV bazı.** Bütçe ve analiz karşılaştırması **KDV hariç net** tutar üzerinden yapılır
   (`ExpenseVat.Net`, `server/YesLojistik.Core/Domain/ExpenseVat.cs:23-25`). Gider tutarı KDV dahil
   girilir; net tutar hesaplanır. Böylece bütçe ile gerçekleşen aynı bazda karşılaştırılır.
5. **Onay etkisi.** Şoförün girdiği masraf `Pending` iken bütçe gerçekleşenine **girmez**; yalnız
   `Approved` kayıtlar sayılır. Bu, kasa bakiyesi kuralıyla aynıdır
   (`server/YesLojistik.Infrastructure/Services/CashService.cs:31-33`).
6. **Reddedilen gider.** Raporlara ve bütçeye girmez (`client/src/pages/ExpensesPage.tsx:148`).
7. **Tekrarlayan gider.** Sabit ödemeden doğan gider, sabit ödemenin **varsayılan masraf merkezini**
   devralır; sabit ödemede merkez boşsa türün varsayılan merkezi kullanılır. Gider oluşurken
   `RecurringPaymentId` bağı korunur (`Expense.cs:42-44`), böylece "bu ay ödendi mi" sorusu
   değişmeden çalışır (`server/YesLojistik.Api/Controllers/StaffController.cs:130-138`).
8. **Vadeli gider.** Vadeli giderde merkez yine yazılır; muhasebe çıktısında borç tarafı tedarikçide
   kalır (`ExpenseService.cs:92`). Merkez bilgisi maliyet analizini bozmaz.
9. **Bütçe aşımı.** Sapma %100'ü geçerse satır kırmızı ve ana sayfa uyarılarına eklenir; ancak
   gider **engellenmez**. Gerekçe: operasyonu durdurmak yerine görünür kılmak.
10. **Arşiv.** Merkez veya tür silinmez; `IsActive = false` yapılır. Hareketi olan türün adı
    değiştirilebilir ama yönü değiştirilemez (gider türü gelir türüne dönüşemez).
11. **Çok şirketli gelecek.** Merkez ve tür tabloları `company_id` almaya hazır tasarlanır
    (`30-COK-SIRKETLI-KONSOLIDASYON.md`), ancak bu doküman tek şirket varsayımıyla uygulanır.
12. **Yuvarlama.** Dağıtımda satır tutarları `Money.Round` ile 2 haneye yuvarlanır; yuvarlama farkı
    en büyük paya eklenir, böylece dağıtılan toplam gider tutarına birebir eşit kalır.

## 6. Veri modeli

**Yeni tablolar:**

**`finance_types` (gider/gelir türü):** `name` (100, tekil), `direction` (`expense`/`income`),
`parent_id` (int?), `legacy_category` (`ExpenseCategory?`), `default_vat_rate` (yüzde),
`default_center_id` (int?), `color_token` (20), `is_active`, `sort_order`, `legacy_key` (200).

**`cost_centers` (masraf/iş merkezi):** `code` (10, tekil), `name` (100), `parent_id` (int?),
`kind` (`general`/`vehicle`/`warehouse`/`project`/`customer`/`admin`), `vehicle_id` (int?),
`customer_id` (int?), `owner_name` (100), `uses_budget`, `is_active`, `legacy_key` (200).

**`finance_allocations` (dağıtım satırı):** `expense_id` (int?), `center_id`, `project_name` (100),
`customer_id` (int?), `ratio` (yüzde, 5 haneli), `amount` (tutar), `note` (300).
Kısıt: bir giderin satırlarının `ratio` toplamı = 100.

**`budgets`:** `center_id` (int?), `finance_type_id` (int?), `period_start` (date),
`period_end` (date), `amount` (tutar), `note` (300), `copy_source_period` (date?).
Kısıt: aynı merkez + tür + dönem için tek kayıt.

**Mevcut tablolara ekleme (boş olabilen sütunlar):**

- `expenses`: `finance_type_id` (int?), `cost_center_id` (int?), `customer_id` (int?),
  `project_name` (100), `document_no` (50), `net_amount` (tutar?; hesaplanan net tutar saklanabilir,
  yoksa hesaplanır).
- `recurring_payments`: `cost_center_id` (int?), `finance_type_id` (int?), `vat_rate` (yüzde),
  `period_count` (int?; taksitli giderler için).

**Migration:** yalnız ekleme; hiçbir sütun silinmez, `Category` ve `CategoryName` alanları
**kaldırılmaz** (`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

| Metot | Yol | İstek / yanıt | Yetki |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/finance-types` | tür yönetimi; silme yerine `isActive=false` | `Accounting` |
| GET/POST/PUT/DELETE | `/api/cost-centers` | merkez yönetimi; kod tekilliği | `Accounting` |
| GET | `/api/cost-centers/tree` | ağaç görünümü (3 seviye) | `Accounting` |
| POST | `/api/expenses/{id}/allocations` | `[{centerId, ratio, amount, note}]` | `Accounting` |
| GET | `/api/expenses/{id}/allocations` | dağıtım satırları | `Accounting` |
| GET | `/api/expenses/allocations/preview` | `amount`, `rows[]` → yuvarlanmış tutarlar | `Accounting` |
| GET/POST/PUT/DELETE | `/api/budgets` | dönem + merkez + tür bazlı bütçe | `Accounting` |
| POST | `/api/budgets/copy` | `fromPeriod`, `toPeriod`, `mode` (geçen yıl / ortalama) | `Accounting` |
| GET | `/api/reports/expenses/analysis` | `by` (type/center/customer/vehicle/period), `from`, `to` | `Accounting` |
| GET | `/api/reports/expenses/budget-variance` | bütçe, gerçekleşen, sapma, yüzde | `Accounting` |
| GET | `/api/reports/expenses/analysis/export` | Excel (mevcut `ExportButton` deseni) | `Accounting` |
| GET | `/api/lookups/finance-types`,`/api/lookups/cost-centers` | seçim listeleri | tüm ofis |
| POST | `/api/recurring-payments/{id}/pay` | mevcut uç genişletilir: `costCenterId` ve `financeTypeId` opsiyonel | `Accounting` |

`GET /api/expenses/categories` ucu **korunur** (mevcut ekran kullanıyor,
`client/src/pages/ExpensesPage.tsx:168`); yeni analiz uçları onun yerine geçmez, onu tamamlar.

## 8. Yetki, onay ve denetim izi

| İş | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Tür/merkez tanımlama | ✔ | ✔ | — | — |
| Gider girişi (tür + merkez) | ✔ | ✔ | ✔ (yalnız araç gideri) | — |
| Şoför masrafı girişi | — | — | — | ✔ (sevkiyatına) |
| Masraf onayı/reddi | ✔ | ✔ | — | — |
| Dağıtım | ✔ | ✔ | — | — |
| Bütçe girişi | ✔ | ✔ | — | — |
| Bütçe onayı | ✔ | — | — | — |
| Analiz görüntüleme | ✔ | ✔ | — | — |
| Dağıtım kilidi açma | ✔ | — | — | — |

**Onay akışı ve şoför masrafı ilişkisi:** Mevcut akış korunur — şoförün girdiği masraf
`ApprovalStatus.Pending` doğar (`Expense.ApprovalStatus`, `Expense.cs:32-36`), ofis
`ExpenseService.ReviewAsync` ile onaylar veya gerekçeyle reddeder
(`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31-47`), reddedilen masraf şoföre
bildirim olarak gider (`ExpenseService.cs:44-46`) ve raporlara girmez. **Yeni:** onay sırasında
masraf merkezi ve tür zorunlu olur; boşsa onay düğmesi uyarı verir: "Masraf merkezi seçmeden
onaylayamazsınız." Böylece şoförün girdiği her masraf merkezli hâle gelir.

**Maker-checker:** bütçe girişi ile bütçe onayı ayrı kişilerdir; hazırlayan onaylayamaz. Tanım
kartlarında onay aranmaz, ancak değişiklik `AuditLog`'a yazılır
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:456-492`).

**Denetim izi:** tür/merkez oluşturma-güncelleme, dağıtım ekleme-silme, bütçe değişikliği (eski/yeni
tutar), bütçe onayı ve analiz dışa aktarma işlemleri işlem geçmişinde görünür.

## 9. Kabul kriterleri

1. Bir gider kaydı tür + merkez ile **en fazla 1 ek tıkla** girilebilir (varsayılanlar ön dolu).
2. Dağıtım oranları %100 değilse kayıt **reddedilir** ve Türkçe hata görünür.
3. Dağıtılan tutarların toplamı gider tutarına **0,01 TL içinde** eşittir (yuvarlama farkı en büyük
   paya eklenir).
4. Bütçe gerçekleşen tutarı yalnız `Approved` giderlerden hesaplanır; `Pending` gider toplamı
   değiştirmez.
5. Bütçe karşılaştırması **KDV hariç** yapılır; aynı giderin KDV'li ve KDV'siz rapor toplamları
   arasındaki fark testle doğrulanır.
6. Mevcut dokuz kategori korunur: `Category` alanı olan eski 20 gider raporu, yeni tür alanı boşken
   **aynı sayıları** verir (regresyon testi).
7. Sabit ödemeden doğan gider, sabit ödemenin masraf merkezini devralır (test).
8. Analiz ekranında 1440×900'de **en az 14 satır** görünür; sekmeler arası geçiş 1 tık.
9. Bütçe sapması %100'ü geçen satır kırmızı, %90–100 arası sarı; her satırda en fazla 1 rozet.
10. Analiz Excel çıktısı ekrandaki toplamlarla birebir aynıdır.
11. 390×844'te yatay kaydırma yoktur; dağıtım penceresi tam ekran açılır.
12. Ekranda "token", "endpoint", "dry-run" gibi teknik sözcük yoktur.

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `AllocationMathTests.cs` — oran→tutar, tutar→oran, toplam %100 doğrulaması, yuvarlama farkının
  dağıtılması, 3 satırlı ve 7 satırlı dağıtım.
- `BudgetVarianceTests.cs` — bütçe − gerçekleşen, yüzde sapma, sıfır bütçede bölme koruması,
  KDV hariç baz.
- `FinanceTypeLegacyMappingTests.cs` — eski `ExpenseCategory` → yeni tür eşlemesi; eşleme yoksa
  raporun eski kategoriye düşmesi.
- Mevcut `ExpenseVat` kuralı testi genişletilir; `DefaultFor` ile SQL ifadesi aynı kalır
  (`server/YesLojistik.Core/Domain/ExpenseVat.cs:27-33`).

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `FinanceTypeTests.cs` — tür oluştur/güncelle, aynı adın ikinci kez eklenememesi, pasif türün yeni
  giderde seçilememesi.
- `CostCenterTests.cs` — kod tekilliği, 3 seviye sınırı, araç/müşteri bağlama.
- `ExpenseAllocationTests.cs` — dağıtım kaydet, oran toplamı hatası, dağıtım silme, gider silinince
  dağıtımın da etkilenmemesi (soft delete).
- `BudgetTests.cs` — dönem kopyalama, aynı dönem ikinci kayıt reddi, sapma hesabı.
- `RecurringPaymentCenterTests.cs` — sabit ödemeden doğan giderin merkezi devralması.
- Mevcut `Expenses` akışı (şoför masrafı onayı, fiş yükleme, vadeli gider) **bozulmaz**; mevcut
  testler değiştirilmeden geçer.

**Panel e2e testleri** (`client/e2e/`):

- `client/e2e/finance-centers.spec.ts` — tür ve merkez ekleme, gider formunda ön dolu varsayılanlar,
  dağıtım penceresi ve %100 hatası.
- `client/e2e/budget.spec.ts` — bütçe gir, gerçekleşenle karşılaştır, dönem kopyala.
- `client/e2e/new-ui/finance-analysis.spec.ts` — `useNewUi(page)` ile analiz sekmeleri ve toplamlar.
- `client/e2e/mobile.spec.ts` kuralı korunur: 390×844'te yatay kaydırma yok.

**Test verisi:** uydurma tür ve merkez adları ("Genel Yönetim", "Depo İstanbul"), uydurma tutarlar;
gerçek müşteri, gerçek tutar ve gerçek belge numarası **kullanılmaz**
(`01-ORTAK-SARTNAME.md:20`).

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün |
|---|---|
| Tür ve merkez tabloları + migration | 2 |
| Tür/merkez tanım ekranları | 4 |
| Gider formu genişletmesi (tür, merkez, belge no) | 3 |
| Dağıtım motoru + pencere | 4 |
| Sabit ödeme entegrasyonu | 2 |
| Bütçe tablosu + ekran + kopyalama | 4 |
| Analiz sekmeleri + Excel | 5 |
| Bütçe sapması uyarısı ve ana sayfa bağlantısı | 2 |
| Yetki/denetim izi eklemeleri | 1 |
| Testler (birim + entegrasyon + e2e) | 4 |
| **Toplam** | **31 kişi-gün** |

**Bağımlılıklar:** `05-VERI-MODELI.md` (tablo adları), `07-YETKI-ONAY-NUMARALANDIRMA.md` (onay
akışları), `09-CARI-YONETIMI.md` (müşteri bazlı gelir), `14-KASA.md` (ödeme yöntemi ve hesap),
`16-CEK-SENET.md` (protesto masrafının gider olarak yazılması), `19-SABIT-KIYMET.md` (araç merkezi
ile amortisman ilişkisi), `23-RAPORLAMA-BI.md` (analiz altyapısı).

**Önce bitmeli:** `05-VERI-MODELI.md`. `23-RAPORLAMA-BI.md` yoksa analiz sekmeleri mevcut
`ReportsPage` deseniyle yazılır.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Geçmiş giderler türsüz kalır, rapor bozulur | Eski kategori → tür eşlemesi; tür boşsa eski kategoriye düşme; varsayılan eşleme tablosu | Yeni alanlar gizlenir, eski rapor aynen çalışır |
| Çok fazla merkez açılır, seçim zorlaşır | Kod zorunlu, aktiflik, en fazla 3 seviye; seçim kutusunda arama | Pasif işaretleme |
| Dağıtım yuvarlaması toplamı kaydırır | Yuvarlama farkı en büyük paya eklenir; testle doğrulanır | Dağıtım silinip yeniden yapılır |
| Bütçe gerçek dışı kalır, güven kaybolur | Gerçekleşen her zaman onaylı kayıtlardan; sapma yüzdesi görünür | Bütçe kaydı güncellenir (denetim izli) |
| Şoför masrafı onayı yavaşlar | Merkez zorunluluğu onay anında; varsayılan merkez ön dolu | Varsayılan merkez tanımı düzeltilir |
| Serbest `CategoryName` ile tür çakışır | Tür varsa tür kazanır; ekranda uyarı | Tür boş bırakılır |

**Doğrulanacaklar (dış bilgi):**

- **doğrulanacak:** Luca'da "iş merkezi" kartının alanları ve seviye sayısı
  (`02-LUCA-ENVANTERI.md:59`).
- **doğrulanacak:** Luca'da gider dağıtımının bulunup bulunmadığı ve dağıtım anahtarları.
- **doğrulanacak:** Luca'da bütçe modülünün varlığı ve kapsamı; `02-LUCA-ENVANTERI.md` içinde bütçe
  geçmiyor, bu bölüm bizim önerimizdir.
- **doğrulanacak:** Luca'da tekrarlayan gider tanımının yeri; taksitli gider desteği.
- **doğrulanacak:** kullanıcının kendi gider türü listesi (pratikortam'daki mevcut kategoriler) —
  kullanıcı bu listeyi bize bildirmelidir; **pratikortam verisi depoya girmez**, yalnız tür **adı**
  listesi kullanıcı onayıyla taşınır.
- **doğrulanacak:** KDV oranlarının güncel listesi ve sektöre göre değişip değişmediği; mevcut
  `docs/KDV-KURALLARI.md` ile uyum. Vergi oranı ve tevkifat konusunda **mali müşavir onayı gerekir**.

**Mevzuat notu:** Gider belgesi, KDV indirimi, tevkifat ve bütçe kavramının vergisel sonuçları
mevzuata bağlıdır. Bu doküman **mevzuat yorumu yapmaz**; yalnız tanım, ekran ve hesap tarif eder.
Vergisel sonuçlar için **mali müşavir onayı gerekir**; personel ve İK konularında **İK/bordro
uzmanı onayı gerekir** (`18-PERSONEL.md` ile birlikte okunur).

Sonraki belgeyle bağlantı: `18-PERSONEL.md` personel giderlerinin hangi merkeze yazılacağını bu
dokümanın veri modeliyle eşler; `14-KASA.md` ödeme yöntemi ve hesap seçimini, `23-RAPORLAMA-BI.md`
analiz sekmelerinin ortak rapor altyapısını bu dokümanın uçlarına bağlar.
