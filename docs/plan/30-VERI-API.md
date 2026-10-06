# 30 — Veri ve API sözleşmeleri

## 1. Amaç ve kapsam

Yeni görünümün ekranları büyük ölçüde **mevcut** uçlarla beslenebiliyor. Bu belge, hangi ekranın
hangi uçtan beslendiğini, hangi alanların bugün eksik olduğunu ve gerektiğinde yeni ucun nasıl
tanımlanacağını tek yerde toplar. Amaç: gereksiz yeni uç yazmamak, yazılacaksa sözleşmeyi
(istek/yanıt/hata) önceden netleştirmek.

Kapsam: uç envanteri, sayfalama/hata sözleşmesi, yetki ve ayna kuralları, eksik uçların listesi.
Kapsam dışı: ekran yerleşimleri (02–27), rapor içerikleri (`23`, `24`), veritabanı şeması
(migration kuralı `AGENTS.md` §3.7).

## 2. Bugünkü durum (kod kanıtıyla)

`server/YesLojistik.Api/Controllers` altında **36 controller**, toplam **≈270 uç** var:

| Controller | Uç | Hizmet ettiği ekran |
|---|---|---|
| `TripsController.cs` | 16 | Sevkiyatlar, sevkiyat formu, Bugün |
| `FleetController.cs` | 15 | Araçlar, belgeler, bakım |
| `DriverController.cs` | 13 | Şoför uygulaması uçları |
| `CustomersController.cs` | 12 | Müşteri listesi |
| `ExpensesController.cs` | 12 | Giderler, mazot, araç masrafları |
| `ReportsController.cs` | 12 | Analiz, raporlar |
| `StaffController.cs` | 12 | Personel, prim, avans |
| `PurchaseInvoicesController.cs` | 11 | Alınan faturalar |
| `AuthController.cs` | 10 | Giriş, kullanıcı oturumu |
| `InvoicesController.cs` | 10 | e-Fatura listesi/kesme |
| `CashController.cs` | 9 | Kasa/banka, çek-senet |
| `DriversController.cs` | 9 | Şoför listesi |
| `EInvoiceController.cs` | 9 | e-Fatura/e-arşiv, XML |
| `SupplierPaymentsController.cs` | 9 | Tedarikçi ödemeleri |
| `SuppliersController.cs` | 9 | Tedarikçi listesi |
| `PaymentsController.cs` | 8 | Tahsilatlar |
| `UsersController.cs` | 7 | Kullanıcılar |
| `VehiclesController.cs` | 7 | Araç kaydı |
| `JobRequestsController.cs` | 6 | İş talepleri |
| `TwoFactorController.cs` | 5 | İki adımlı doğrulama |
| `AttachmentsController.cs` | 4 | Belge/fiş görselleri |
| `CariController.cs` | 4 | Cari ekstre/bakiye |
| `DataExportController.cs` | 4 | Excel/CSV dışa aktarım |
| `InvoiceNotesController.cs` | 4 | Fatura notları |
| `LegacyController.cs` | 4 | pratikortam aynası (aktarım) |
| `MeController.cs` | 4 | Profilim |
| `TrackingController.cs` | 4 | Takip linki, konum |
| `AdminController.cs` | 3 | Yedek, bakım |
| `DashboardController.cs` | 3 | Bugün ekranı sayaçları |
| `SettingsController.cs` | 3 | Firma ayarları |
| `ImportController.cs` | 2 | Excel'den aktarım |
| `LicenseController.cs` | 2 | Lisans |
| `PublicController.cs` | 2 | Kamusal marka/takip |
| `AuditController.cs` | 1 | İşlem geçmişi |
| `OnboardingController.cs` | 1 | Kurulum sihirbazı |
| `SearchController.cs` | 1 | Genel arama (Ctrl+K) |

İstemci tarafı: `client/src/api/` (axios istemcisi + tipler); tip dosyaları `client/src/api/types.ts`.
Sunucu DTO'ları `server/YesLojistik.Core` altında (ör. `FinanceDtos.cs`, `DashboardService.cs`).

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `server/YesLojistik.Api/Controllers/` (36 dosya) | Yukarıdaki envanter; uç sayıları `[Http*]` özniteliklerinden sayıldı |
| `server/YesLojistik.Api/Controllers/TripsController.cs` | 16 uç — en geniş yüzey |
| `client/src/pages/ExpensesPage.tsx:65` | Sayfalama deseni (`pageSize: 20`) |
| `client/src/pages/ExpensesPage.tsx:168` | `staleTime` ile önbellek deseni |
| `client/src/lib/nav.ts:10` | Menü öğesi alanları (`perm` dahil) |
| `client/src/api/types.ts` | İstemci tipleri (1066 satır) |

## 3. Sözleşmeler

### 3.1 Sayfalama

Liste uçları `PagedResult<T>` döner: `items`, `total`, `page`, `pageSize`. Varsayılan `pageSize=20`
(`ExpensesPage.tsx:65` deseni). Yeni görünümde **12+ satır** hedefi için `pageSize` 20 kalır;
satır yoğunluğu CSS ile ayarlanır (`29-GORSEL-SISTEM.md`).

### 3.2 Hata gövdesi

Doğrulama ve iş kuralı hataları **Türkçe** mesajla döner (`client/src/lib/zodTr.ts` istemci
tarafını çevirir). Sunucu 400/409/422 gövdeleri alan bazlı `errors` nesnesi taşır; istemci bunu
form alanlarına basar. Teknik exception metni kullanıcıya gösterilmez.

### 3.3 Yetki

- Rol/yetki anahtarları: `accounting`, `operations`, `admin` (`client/src/lib/nav.ts:10` `perm`).
- Menü süzgeci istemcide (`Layout.tsx`), asıl kontrol sunucuda.
- **Ayna modu:** `MirrorWriteGuard` yazma isteklerini reddeder; istemci `write` düğmelerini gizler.
  Yeni uçlar da bu guard'dan geçer — yazma uçları için ayrı muafiyet **tanımlanmaz**.

### 3.4 Lisans

`LicenseGuard` süre dolduğunda yazma uçlarını kapatır; okuma uçları açık kalır. Yeni uçlar bu
ayrıma uyar (rapor/okuma = serbest, kayıt = korumalı).

## 4. Ekran → uç eşlemesi (yeni görünüm)

| Ekran | Mevcut uçlar | Eksik olan |
|---|---|---|
| Bugün (`02`) | `DashboardController` (3), `TripsController` (liste), `PaymentsController` | Onay bekleyen masraf sayacı (bugün `ExpensesController` süzgeciyle) |
| Sevkiyatlar (`03`) | `TripsController` (16), `SearchController` | — |
| Sevkiyat formu (`04`) | `TripsController`, `CustomersController`, `FleetController`, `DriversController` | — |
| e-Fatura (`05`) | `InvoicesController` (10), `EInvoiceController` (9) | e-Fatura/e-Arşiv ayrımı süzgeci (yanıtta tür alanı var mı doğrulanacak) |
| Faturalandırılacaklar (`06`) | `InvoicesController` listesi, `ReportsController` kazanç | **Sayaç ucu**: `GET /invoices/counters` (bekleyen, bugün kesilen, vadesi geçen) |
| Alınan faturalar (`07`) | `PurchaseInvoicesController` (11) | — |
| Müşteriler/Tedarikçiler cari (`08`, `09`) | `CariController` (4), `CustomersController`, `SuppliersController`, `PaymentsController` | — |
| Tahsilat/ödeme formları (`10`) | `PaymentsController` (8), `SupplierPaymentsController` (9), `CashController` | — |
| Bankalar/Çekler (`11`, `12`) | `CashController` (9) | Hesap ekstresi toplamları (varsa mevcut) |
| Harita/Takip (`13`) | `TrackingController` (4), `PublicController` (2) | — |
| Listeler (`14`–`18`) | `CustomersController`, `SuppliersController`, `DriversController`, `StaffController`, `RecurringPayments*` | Excel'e aktarım (varsa `DataExportController`; yoksa istemcide CSV) |
| Mazotlar (`19`) | `ExpensesController` (`category=Fuel`) | **KM farkı / km başı maliyet** alanları (bugün gider kaydında var mı doğrulanacak) |
| Giderler (`20`) | `ExpensesController` (12), `/expenses/categories` | — |
| Araç masrafları (`21`) | `ExpensesController` + `vehicleId` süzgeci | Araç bazlı toplam (istemcide hesaplanabilir; yoksa `GET /expenses/summary?vehicleId=`) |
| Araçlar (`22`) | `VehiclesController` (7), `FleetController` (15) | Belge uyarı özeti (varsa mevcut) |
| Analiz (`23`) | `ReportsController` (12) | Genel Bakış kırılımı (piyasa/öz mal) — **yeni uç gerekirse dur ve sor** |
| Raporlar/muhasebe (`24`) | `ReportsController`, `DataExportController` | — |
| Yönetici (`25`) | `SettingsController`, `UsersController`, `AuditController`, `LegacyController`, `AdminController` | — |
| Profilim (`26`) | `MeController` (4), `TwoFactorController` (5) | — |
| Telefon (`27`) | tüm liste uçları | — |

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** `items: []` + `total: 0`; ekran kendi boş metnini basar (`29-GORSEL-SISTEM.md` §5).
- **Yükleniyor:** istek sürerken iskelet; `staleTime`/`refetch` davranışı bugünkü gibi
  (`ExpensesPage.tsx:168` örneği).
- **Hata:** 401 → giriş sayfası; 403 → tek cümle yetki mesajı; 5xx → "Yüklenemedi. Yenile."
- **Yetkisiz:** menüde gizli, uçta 403.
- **Ayna:** yazma uçları 409/403 döner; istemci zaten düğmeyi gizler (çift koruma).
- **Lisans:** süre dolduysa yazma uçları 402/403; istemci salt okunur rozetini gösterir.

## 6. Metinler ve terimler

Uç yolları ve alan adları İngilizce kalır (`/expenses`, `vehicleId`); **kullanıcıya görünen**
her metin Türkçedir. Hata mesajları: "Bu işlem için yetkiniz yok.", "Kayıt bulunamadı.",
"Bağlantı koptu, tekrar deneyin." Terimler `docs/TERIMLER.md` + `32-TERMINOLOJI.md`.

## 7. Telefon davranışı (390×844)

Mobil uçlar (`DriverController`) ayrı kalır; panel uçları mobil web'de aynı sözleşmeyi kullanır.
Büyük liste istekleri mobilde `pageSize=20` ile sınırlı kalır (veri tasarrufu).

## 8. Erişilebilirlik ve klavye

Sözleşme düzeyinde: uzun süren istekler için yükleme durumu her zaman görünür (ekran okuyucu
`aria-busy`); hata mesajları `role="alert"` ile duyurulur.

## 9. Testler (e2e + birim)

- Sunucu: yeni uç yazılırsa `server/YesLojistik.Tests` içine entegrasyon testi (gerçek PostgreSQL,
  geçici veritabanı). Yetki ve ayna davranışı test edilir.
- İstemci: yeni uç kullanılıyorsa e2e senaryosu ilgili ekran belgesinde yazılıdır (ör. `06` §9).
- `dotnet test` yerelde çalışmadığı için (yerel ortamda .NET 10 ve PostgreSQL yok) doğrulama
  **CI'da** yapılır (`31-TEST-CI.md`).

## 10. Uygulama adımları

1. **Envanter doğrulaması (2 saat).** Yukarıdaki tabloyu kodla karşılaştır; eksik sandığın uç
   zaten varsa yeni uç yazma.
2. **Sayaç ucu (3 saat, gerekirse).** `GET /invoices/counters` — `Count`, `OverdueCount`,
   `TodayIssued`; DTO `FinanceDtos` yanına; yetki `accounting`; test.
3. **Mazot alanları (2 saat, gerekirse).** Gider kaydında litre/km alanları var mı doğrula;
   varsa yalnız liste ucu genişletilir (yeni tablo **yok**).
4. **Araç masraf toplamı (2 saat).** İstemcide hesaplanabiliyorsa uç yazma; gerekirse
   `GET /expenses/summary`.
5. **Genel Bakış kırılımı (dur ve sor).** Piyasa/öz mal ayrımı mevcut raporlarda yoksa yeni uç
   gerekir; kullanıcı onayı olmadan yazılmaz.
6. **Sözleşme testleri (3 saat).** Yetki, ayna, lisans davranışı; migration **yalnız ekleme**.
7. **Belge (30 dk).** `docs/GELISTIRME-PLANI.md`; yeni uçlar `docs/PLAN.md` kapsamına işlenir.

Toplam ≈ **12 saat** (yeni uç gerekmezse) – **20 saat** (iki uçla).

## 11. Kabul ölçütü

- Yeni görünümün hiçbir ekranı "veri yok" bahanesiyle boş kalmaz: her ekran mevcut uçlarla dolar.
- Yeni uç yazıldıysa: yetki + ayna + lisans davranışı testli, migration **ekleme** tipinde.
- Uç sayısı gereksiz artmaz: aynı veriyi iki uç döndürüyorsa biri kaldırılır.
- CI yeşil (`server`, `client`, `e2e` job'ları).

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Gereksiz yeni uç yazılır | Adım 1 envanteri zorunlu; "önce ara, sonra yaz" |
| Yeni uç ayna/lisans kuralını atlar | Tüm yazma uçları mevcut guard'lardan geçer; test şart |
| Migration canlıyı bozar | Yalnız ekleme; canlı veriye yazan işlem öncesi yedek + onay |
| Rapor uçları yavaşlar | Toplu dönem ucu; gerekirse önbellek (`staleTime`) |

## 13. Doğrulanacaklar

- `InvoicesController` yanıtında e-Fatura/e-Arşiv türü ve vade alanı var mı.
- Gider kaydında litre/km/önceki km alanları bugün var mı (mazot ekranı için kritik).
- Genel Bakış kırılımının (piyasa/öz mal) mevcut rapor uçlarından üretilip üretilemeyeceği.
- `DataExportController` listelerin Excel çıktısını veriyor mu (yoksa istemcide CSV).

Sonraki belgeyle bağlantı: `31-TEST-CI.md` doğrulama akışını, `29-GORSEL-SISTEM.md` iskeletlerin
veri ihtiyacını, `06`/`19`/`23` belgeleri bu uçların ekran karşılıklarını tanımlar.
