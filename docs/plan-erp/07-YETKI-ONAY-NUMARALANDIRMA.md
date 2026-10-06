# 07 — Yetki, Onay ve Numaralandırma

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 şablonuna uyar. İçindeki her "bizde bugün" iddiası
`dosya:satır` kanıtı taşır. Dış dünyaya ait (Luca ekranı, mevzuat, entegratör) doğrulanmamış bilgi
`**doğrulanacak:**` etiketiyle yazılmıştır.

## 1. Amaç ve kapsam

Bu modül üç soruyu kodla cevaplanabilir hâle getirir: **Kim yapabilir?**, **Kim onaylar?**, **Belge hangi
numarayı alır?** Bugün panelde bu üç sorunun cevabı kaba biçimde var (dört rol, üç politika, tek fatura
sayacı); muhasebe çekirdeği ve stok/satın alma modülleri geldiğinde bu kaba yapı yetmez.

Kapsam içinde olanlar:

1. **Rol ve yetki modeli.** Mevcut `Perm`/`can()` yapısının modül bazında genişletilmesi; görme, ekleme,
   düzeltme, silme, onaylama ve muhasebeleştirme ayrımının ayrı haklar olması.
2. **Modül bazlı yetki matrisi.** Hangi rol hangi modülde neyi yapabilir; matrisin tek bir yerde
   (sunucu) tanımlanıp panelin ondan beslenmesi.
3. **Onay akışları (maker-checker).** Masraf onayı, fatura onayı, ödeme talimatı ve iptal için
   "hazırlayan ≠ onaylayan" kuralı; tutar limitleri.
4. **Dönem kilidi.** Kapanmış mali döneme kayıt/fiş girişinin engellenmesi; kilidin kim tarafından
   açılıp kapatıldığının izi.
5. **Belge numaralandırma ve seri takibi.** Fatura, irsaliye, yevmiye fişi ve çek/senet için seri
   tanımları; numara boşluğu ve iptal davranışı.
6. **Denetim izi.** Kim, ne zaman, neyi değiştirdi; mevcut `AuditLog` altyapısının yetki ve onay
   olaylarını da kapsayacak biçimde genişletilmesi.

Kapsam dışı: muhasebe fişinin kendisi (`06-MUHASEBE-MOTORU.md`), e-belge gönderim akışı
(`08-E-BELGE-KATMANI.md`), çok şirketli izolasyon (`30-COK-SIRKETLI-KONSOLIDASYON.md`), KVKK saklama/imha
(`35-DENETIM-IZI-KVKK-UYUM.md`). Bu doküman o modüllere **altyapı** verir, onların yerine geçmez.

Neden şimdi: iki adımlı doğrulama, hesap kilidi, oturum iptali ve işlem geçmişi bugün zaten çalışıyor
(`server/YesLojistik.Core/Entities/User.cs:17`, `server/YesLojistik.Api/Controllers/UsersController.cs:26`,
`server/YesLojistik.Api/Controllers/AuditController.cs:14`). Yetki/onay/numara katmanını bu sağlam
temelin üstüne koymak, sonradan eklemekten çok daha ucuz.

## 2. Luca'daki karşılığı

Luca'nın yetki ve numaralandırma tarafında siteden okunabilenler şunlardır:

- **Luca Koza** ürün sayfasında "**Ayrıntılı yetkilendirme ile iş planı yapabilme**" ve "**tüm işlemlerin
  tek ekrandan muhasebeleştirilmesi**" başlıkları geçer
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:51`, `docs/plan-erp/02-LUCA-ENVANTERI.md:46`).
- **Luca Net** tarafında "otomatik firma kurulumu" ve Excel ile cari/stok/çek-senet/fatura/yevmiye fişi
  aktarımı listelenir (`docs/plan-erp/02-LUCA-ENVANTERI.md:27-29`).
- **Belge üzerinden muhasebe fişi iptali** Koza'nın özellikleri arasında yazılıdır
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:47`) — yani Luca'da iptal, belge ile fiş arasındaki bağı koparmaz.
- Çek/Senet modülünde "alacak/borç çek ve senetleri tüm detay hareketleriyle takip"
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:58`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>,
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**Doğrulanacak (Luca tarafı):**

- **doğrulanacak:** Luca'da rol tanımı kaç seviyeli, kullanıcı bazında modül/kayıt bazında yetki
  verilebiliyor mu, "ayrıntılı yetkilendirme"nin kapsamı nedir (Luca kullanıcı kılavuzu/bayiden).
- **doğrulanacak:** Luca'da onay (maker-checker) akışı var mı, tutar limiti tanımlanabiliyor mu; varsa
  hangi belgelerde (Luca demo hesabı ya da kullanıcı kılavuzu).
- **doğrulanacak:** Luca'da dönem kilidi (kapanan dönem) nasıl çalışır, geriye dönük kayıt için özel
  yetki gerekiyor mu (Luca mali müşavir paketi belgeleri).
- **doğrulanacak:** Luca'da fatura/irsaliye/fiş seri tanımlarının ekranı, seri başına yıl sıfırlaması ve
  numara boşluğu politikası.
- **doğrulanacak:** Luca belge numarasını kendi mi üretir, entegratör mü atar (bu, bizim
  `docs/ENTEGRATOR-EKLEME.md:44` maddesiyle aynı sorudur).

## 3. Bizde bugün

### 3.1 Rol ve yetki

Bugün **tek katmanlı** bir yetki modeli vardır; yetki "modül" düzeyindedir, işlem düzeyinde değildir.

- Roller tek bir enum'da: `Admin`, `Operations`, `Accounting`, `Driver`
  (`server/YesLojistik.Core/Entities/Enums.cs:3`).
- Panelde yetki tipi üç değerli: `Permission = 'operations' | 'accounting' | 'admin'`
  (`client/src/lib/auth.tsx:6`).
- Rol → yetki eşlemesi istemcide sabit bir tablodur:
  `operations` → `Admin, Operations`; `accounting` → `Admin, Accounting`; `admin` → `Admin`
  (`client/src/lib/auth.tsx:8-12`).
- Karar veren tek fonksiyon: `can()` (`client/src/lib/auth.tsx:77`).
- Sunucu tarafı karşılığı `Policies` sınıfıdır; aynı üç politika ve aynı rol listeleri vardır
  (`server/YesLojistik.Api/Auth/Policies.cs:8-17`).
- Politikalar `Program.cs`'te bağlanır; ayrıca **varsayılan politika** kimliği doğrulanmış ofis
  kullanıcısı ister (`staff`), yani şoför rolü varsayılan olarak hiçbir ofis ucuna giremez
  (`server/YesLojistik.Api/Program.cs:81-84`).

Denetleyici bazında bugünkü dağılım (örnekler):

| Denetleyici | Politika | Kanıt |
|---|---|---|
| `CariController` (cari tablolar) | `Accounting` | `server/YesLojistik.Api/Controllers/CariController.cs:12` |
| `CashController` (kasa/banka) | `Accounting` | `server/YesLojistik.Api/Controllers/CashController.cs:18` |
| `SettingsController` | `Admin` | `server/YesLojistik.Api/Controllers/SettingsController.cs:27` |
| `UsersController` | `Admin` | `server/YesLojistik.Api/Controllers/UsersController.cs:16` |
| `AuditController` | `Admin` | `server/YesLojistik.Api/Controllers/AuditController.cs:14` |
| `TripsController` yazma uçları | `Operations` | `server/YesLojistik.Api/Controllers/TripsController.cs:110` |
| `InvoicesController` yazma uçları | `Accounting` | `server/YesLojistik.Api/Controllers/InvoicesController.cs:68-82` |
| `DriverController` | `Roles = Driver` | `server/YesLojistik.Api/Controllers/DriverController.cs:16` |

Panelde aynı karar `can()` ile verilir; örnekler: müşteri kartında tahsilat/yeni fatura düğmelerinin
gizlenmesi (`client/src/pages/CustomerDetailPage.tsx:47-48`), fatura listesinde "İptal Et" ve "Faturayı
Kes" düğmeleri (`client/src/pages/InvoicesPage.tsx:164-165`), ana sayfada onay sekmesi
(`client/src/pages/DashboardPage.tsx:89`) ve masraf onay düğmeleri
(`client/src/pages/ExpensesPage.tsx:85`).

Menü ve sayfa iskeleti de aynı yetkiyi kullanır: `NavItem`/`SectionTab`/`MenuItem` tiplerinde `perm?`
alanı vardır (`client/src/lib/nav.ts:10`, `client/src/lib/sections.ts:7`,
`client/src/components/shell/Menu.tsx:8`) ve görünürlük süzgeci tek yerde toplanmıştır:
`useVisibleItems` hem ayna modunu hem yetkiyi eler (`client/src/components/shell/Menu.tsx:11-15`).

Bir örnek: yeni görünümde `/ayarlar` yalnız `perm: 'admin'` ile işaretlidir
(`client/src/lib/nav.ts:106`), `Yönetici` sayfası da `can('admin')` yoksa `null` döner
(`client/src/pages/OnboardingPage.tsx:39`).

### 3.2 Onay

Onay bugün **tek bir yerde** vardır: gider (masraf) onayı.

- Onay durumu tek enum: `ApprovalStatus { Approved, Pending, Rejected }`
  (`server/YesLojistik.Core/Entities/Enums.cs:10`).
- Gider kaydında onay alanları: `ApprovalStatus`, `RejectionReason`, `ReviewedAt`, `ReviewedBy`
  (`server/YesLojistik.Core/Entities/Expense.cs:33-36`).
- Onaylayan/reddeden iş kuralı tek bir metotta: `ExpenseService.ReviewAsync`
  (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31`). Reddetme gerekçesi zorunludur
  (`:35`), gerekçe en fazla 300 karakterdir (`:36`), reddedilince şoföre bildirim gider (`:44-46`).
- Reddedilme gerekçesi denetim izi adlarına da girmiştir: `Ret gerekçesi`, `Onaylayan`
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:46`).

**Eksik:** Fatura onayı, ödeme talimatı onayı ve iptal onayı için **hiçbir maker-checker yapısı yok**.
Onay ucu yalnız gider denetleyicisinde vardır (`server/YesLojistik.Api/Controllers/ExpensesController.cs:145`).
Fatura iptali tek bir çağrıdır ve onay beklemez (`server/YesLojistik.Api/Controllers/InvoicesController.cs:81-82`).
Ayrıca **tutar limiti diye bir kavram yoktur**: `ExpenseService.ReviewAsync` içinde tutara bakan hiçbir
koşul yoktur (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31-47`).

### 3.3 Numaralandırma

Bugün **iki ayrı numara üreticisi** vardır ve ikisi de farklı biçim kullanır.

**(a) Satış faturası numarası** — firma ayarından seri öneki + 6 hane, PostgreSQL tarafında satır kilidi
ile boşluksuz:

- Ayar alanları: `InvoicePrefix` (varsayılan `"F"`) ve `NextInvoiceNumber` (varsayılan `1`)
  (`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`).
- Üretim: `UPDATE company_settings ... RETURNING` biçiminde tek atomik ifade
  (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:181-188`), sonuç `"{Prefix}-{Number:D6}"`
  (`:188`). Fatura oluşturulurken çağrılır (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:131`).
- Doğrulama: seri öneki 3 karakter olmalıdır (`server/YesLojistik.Core/Validation/Validators.cs:378`).

**(b) e-Fatura/e-Arşiv numarası** — GİB biçimi, seri (3) + yıl (4) + sıra (9) = 16 hane:

- Alanlar: `EInvoiceSeriesPrefix` (varsayılan `YES`), `EArchiveSeriesPrefix` (varsayılan `YEA`)
  (`server/YesLojistik.Core/Entities/CompanySettings.cs:46-47`).
- Sıra tablosu: `EInvoiceSequence` — `Prefix`, `Year`, `Next`
  (`server/YesLojistik.Core/Entities/Invoice.cs:56-61`), DbSet olarak kayıtlı
  (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:27`).
- Üretim: `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` ile boşluksuz ve eşzamanlı güvenli
  (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:39-47`), biçim `{prefix}{year}{next:D9}`
  (`:46`). Fatura hazırlanırken senaryoya göre önek seçilir (`:30-31`).
- Fatura üzerindeki alan: `EInvoiceNo` (en fazla 16 karakter) ve **tekildir**
  (`server/YesLojistik.Core/Entities/Invoice.cs:31`,
  `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-305`).
- ETTN (UUID) fatura kesilirken üretilir (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:29`)
  ve tekildir (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:306`).

İki üretici arasındaki fark **kritik**tir: satış faturası numarası `F-000001` biçimindedir, e-Fatura
numarası `YES2026000000001` biçimindedir. Aynı fatura kaydında iki numara yan yana durur
(`server/YesLojistik.Core/Entities/Invoice.cs:5`, `:31`).

İrsaliye ve yevmiye fişi için **numara üreticisi yoktur**. Sevkiyatta taşınan irsaliye numarası
`WaybillNo` dışarıdan girilen bir alandır (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:39` kayıt
adı "İrsaliye no"); çek/senet numarası da `InstrumentNo` olarak elle girilir
(`server/YesLojistik.Core/Entities/Payment.cs:18`).

**Numara boşluğu (gap) davranışı:** İki üretici de transaction'a bağlıdır; e-Fatura numarası için bu
açıkça yazılmıştır — "transaction geri alınırsa numara da geri alınır"
(`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:37`). Yani **numara boşluğu üretilmez**,
ancak bu bir mali müşavir tercihi olabilir; gerçek hayatta bazı serilerde boşluk beklenir. Fatura iptal
edildiğinde numara **korunur** ve kullanıcıya bu açıkça söylenir: "Fatura numarası korunur."
(`client/src/pages/InvoicesPage.tsx:202`). İptal edilen fatura `Cancelled` durumuna geçer
(`server/YesLojistik.Core/Entities/Enums.cs:26`) ve denetim izinde "Taslak/Kesildi/İptal" olarak okunur
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:111`).

Eşzamanlılık testi bugün vardır ve numaraların benzersizliğini doğrular:
`server/YesLojistik.Tests/Integration/EInvoiceTests.cs:111`.

### 3.4 Denetim izi

Denetim izi **çalışır durumdadır** ve oldukça olgundur.

- Varlık: `AuditLog` — `At`, `UserId`, `UserName`, `Action`, `EntityType`, `EntityId`, `Label`, `Changes`
  (`server/YesLojistik.Core/Entities/AuditLog.cs:4-17`).
- Üretim: `SaveChanges` sırasında EF değişiklik izleyicisinden otomatik çıkarılır
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`). `Describe` yalnız gerçekten değişen
  alanları toplar (`:67-71`), 2000 karakterde kırpar (`:71`).
- Değişiklik metni okunur Türkçe üretilir: alan adları sözlükten gelir
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:23-52`), değer biçimi insan okur biçimdedir
  (para iki kuruş, tarih `dd.MM.yyyy`) (`:146-158`).
- Gizli/sık değişen alanlar bilinçli olarak dışlanır: şifre özeti, TOTP sırrı, kurtarma kodları, konum,
  takip jetonu, lisans anahtarı, dosya yolları (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:12-21`).
- Okuma ucu yalnız yöneticiye açıktır ve arama/süzgeç destekler
  (`server/YesLojistik.Api/Controllers/AuditController.cs:14`, `:19-32`).
- Panelde gösterim: sevkiyat formunda "Değişiklik kaydı" yalnız `can('admin')` iken çizilir
  (`client/src/components/TripForm.tsx:521`).
- Yetki olayları da iz bırakır: yönetici 2FA'yı sıfırladığında `AuditLogs`'a elle kayıt yazılır
  (`server/YesLojistik.Api/Controllers/UsersController.cs:42`).

**Eksik:** `AuditLog` bugün **yalnız veri değişikliğini** kaydeder. Şunlar kaydedilmez:
- Rol değişikliğinin kendisi ayrı bir olay olarak (kullanıcı güncellenince `Role` alanı değişiklik metnine
  girer, ama "yetki verildi/alındı" olarak okunmaz),
- onay/red kararı (`ExpenseService.ReviewAsync` yalnız alan değiştirir; alanlar izlenir ama karar
  gerekçesi ayrı olay değildir),
- dönem kilidi açma/kapama (kavram yok),
- numara serisi değişikliği (`EInvoiceSeriesPrefix` değişimi izlenir
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:42`) ama `EInvoiceSequence` tablosu
  `BaseEntity` türevi olmadığı için izlenmez — `AuditTrail.Tracks` yalnız `BaseEntity` ve
  `CompanySettings` kabul eder: `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56`).

### 3.5 Eksik listesi (özet)

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | İşlem düzeyi yetki (görme/ekleme/düzeltme/silme/onaylama/muhasebeleştirme ayrı haklar) | `Permission` yalnız 3 değer: `client/src/lib/auth.tsx:6` |
| 2 | Kullanıcı bazında özel yetki (rolden bağımsız) | Yetki yalnız rolden türer: `client/src/lib/auth.tsx:77` |
| 3 | Fatura onayı / ödeme talimatı onayı / iptal onayı | Onay ucu yalnız giderde: `server/YesLojistik.Api/Controllers/ExpensesController.cs:145` |
| 4 | Tutar limiti | Gider onayında tutar koşulu yok: `server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31-47` |
| 5 | Dönem kilidi | Repoda `PeriodLock`/`FiscalPeriod`/`ClosedPeriod` **hiç geçmiyor** (grep: eşleşme yok) |
| 6 | Seri tanım tablosu (seri başına yıl, sıfırlama kuralı, belge türü) | Seri yalnız iki metin alanı: `server/YesLojistik.Core/Entities/CompanySettings.cs:20`, `:46-47` |
| 7 | İrsaliye/fiş/çek seri üreticisi | İrsaliye no elle: `server/YesLojistik.Core/Entities/Payment.cs:18` |
| 8 | Onay/yetki olaylarının denetim izi | `AuditTrail.Tracks` yalnız veri değişikliği: `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56` |
| 9 | Onay bekleyenlerin tek ekranda toplanması (masraf dışında) | Onay listesi yalnız masraf: `client/src/pages/DashboardPage.tsx:91` |

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md` §3'teki ortak parçaları **yeniden kullanır**:
`PageShell` (`client/src/components/shell/PageShell.tsx:28`), `DataTable`
(`client/src/components/DataTable.tsx:66`), `MobileCards` (`client/src/components/shell/MobileCards.tsx`),
`Modal` (`client/src/components/ui.tsx:156`), `SumStrip` (`client/src/components/SumStrip.tsx:12`),
`Tabs` (`client/src/components/ui.tsx:300`), `MoreMenu`/`RowMenu`
(`client/src/components/shell/Menu.tsx:63`, `:75`). Yeni görsel dil icat edilmez.

Anahtar yolu: **Ayarlar → Yönetici** (`/ayarlar`) sayfasına üç yeni sekme eklenir; mevcut sekme yapısı
`client/src/pages/SettingsPage.tsx` içindedir ve bozulmaz.

### 4.1 Ekran: Roller ve Yetkiler (`/ayarlar?tab=roles`)

**Liste:** rol kartları. Her kartta rol adı, kullanıcı sayısı, kapsam etiketi.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Rol adı | metin | Evet | Yerleşik dört rol (`Admin`, `Operations`, `Accounting`, `Driver`) salt okunur; kullanıcı tanımlı roller eklenebilir |
| Açıklama | metin (200) | Hayır | Kart altında görünür |
| Aktif kullanıcı sayısı | sayı (salt okunur) | — | `/api/users` listesinden sayılır |
| Kapsam | seçim | Evet | `Tüm şirket` (bugün tek şirket; çok şirket `30` dokümanı) |

**Yetki matrisi sekmesi:** satırlar modül, sütunlar altı hak. Hücre üç durumlu onay kutusudur
(`izinli` / `izinli değil` / `özel`).

| Sütun | Anlam | Bugünkü karşılığı |
|---|---|---|
| Görme | Listeyi/detayı açabilir | `can('operations')` / `can('accounting')` |
| Ekleme | Yeni kayıt | `Button write` + politika |
| Düzeltme | Var olan kaydı değiştirme | Aynı |
| Silme | Pasife alma / silme | Aynı |
| Onaylama | Bekleyen kaydı onaylama/reddetme | Yalnız masraf |
| Muhasebeleştirme | Belgeyi fişe bağlama (ileride) | **Yok** |

Form alanları: **Tutar limiti (TL)** — `AmountInput`, boş = limitsiz
(`client/src/components/Inputs.tsx` içindeki `AmountInput`; müşteri formunda aynı bileşen
`client/src/components/CustomerForm.tsx:136`'da kullanılır). **Kendi hazırladığını onaylayabilir** —
onay kutusu, varsayılan kapalı; açılırsa ekranda sarı uyarı ve denetim izine "kendi onayı" notu.

Düğmeler: `Kaydet` (Ctrl+Enter), `Vazgeç` (Esc), satır sonunda `Sıfırla` (`RowMenu`),
sayfa üstünde `⋯ Diğer → Matrisi Excel'e aktar`.

### 4.2 Ekran: Onay Merkezi (`/onaylar`)

Yeni sayfa. Bugünkü ana sayfa onay sekmesi (`client/src/pages/DashboardPage.tsx:89`) buraya taşınmaz,
**orada kalır**; bu sayfa tüm onay türlerini tek listede toplar.

**Liste sütunları:** Tür (rozet) · Özet · Tutar · Hazırlayan · Bekleme süresi · Durum · İşlemler.

| Alan | Tip | Zorunlu | Doğrulama / hata metni |
|---|---|---|---|
| Tür | salt okunur | — | `Masraf onayı`, `Fatura onayı`, `Ödeme talimatı`, `İptal onayı` |
| Tutar | para (salt okunur) | — | `tl2()` ile iki kuruş |
| Hazırlayan | metin (salt okunur) | — | Onaylayanla aynıysa satır sarı zeminli |
| Karar | düğme | — | `Onayla` / `Reddet` |
| Red gerekçesi | metin (300) | Red'de Evet | `ExpenseService` kuralıyla aynı: gerekçesiz ret olmaz |

Süzgeçler (`FilterBar`): tür, tutar aralığı, hazırlayan, tarih aralığı, "yalnız limit üstü".
Toplamlar `SumStrip` ile: toplam bekleyen, limit üstü, bugün onaylanan.

### 4.3 Ekran: Dönem Kilidi (`/ayarlar?tab=periods`)

**Liste:** dönem satırları (yıl-ay). Sütunlar: Dönem · Durum (`Açık`/`Kilitli`) · Kayıt sayısı · Kilitleyen ·
Kilitleme anı · İşlem.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Dönem | ay seçimi | Evet | Yalnız içinde bulunulan yıl ve önceki yıl seçilebilir |
| Kilit tarihi | tarih | Evet | Bu tarihe kadarki (dahil) kayıtlar kilitlenir |
| Gerekçe | metin (300) | Evet | Denetim izine yazılır |
| Geçici açma | onay kutusu | Hayır | Açılırsa `Modal` içinde ikinci onay + süre (saat) ister |

Kilit **tek yönlü geri alma** ile çalışır: kilit kaldırma işlemi de gerekçe ister ve denetim izine
`PeriodUnlock` olarak yazılır.

### 4.4 Ekran: Belge Serileri (`/ayarlar?tab=series`)

Bugünkü dağılım ikiye ayrılmıştır (`InvoicePrefix`/`NextInvoiceNumber` ve
`EInvoiceSeriesPrefix`/`EArchiveSeriesPrefix`); bu ekran onları **tek listeye** toplar.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Belge türü | seçim | Evet | `Satış faturası`, `e-Fatura`, `e-Arşiv`, `e-İrsaliye`, `Yevmiye fişi`, `Çek`, `Senet` |
| Seri | metin (3, büyük harf) | Evet | Bugünkü kural aynen: `^[A-Za-z0-9]{3}$` (`server/YesLojistik.Core/Validation/Validators.cs:378`) |
| Yıl | sayı | Evet | Yıl değişince sıra sıfırlanır |
| Sıradaki numara | sayı (>0) | Evet | Bugünkü kural: `NextInvoiceNumber > 0` (`server/YesLojistik.Core/Validation/Validators.cs:381`) |
| Hane sayısı | seçim (6/9) | Evet | Bugün fatura 6, e-Fatura 9 hane |
| Boşluk politikası | seçim | Evet | `Boşluksuz` (bugünkü davranış) / `İptalde boşluk bırak` |
| Kullanımda | onay kutusu | Hayır | Kapatılırsa yeni belge bu seriyi kullanmaz |

Ekranda salt okunur bir **"Son numaralar"** tablosu bulunur: son 10 belge (tür, seri, numara, tarih, durum).
Bu tablo `EInvoiceSequence` ve `CompanySettings` alanlarından beslenir; yeni bir sayaç tablosu
gerekmez (bkz. §6).

## 5. İş kuralları

### 5.1 Yetki kararı

1. **Tek kaynak kuralı.** Yetki matrisi sunucuda tanımlanır. Panel matrisi `GET /api/permissions/matrix`
   ile okur ve `can()` bunun üstüne kurulur. Bugünkü gibi iki yerde ayrı liste tutulmaz — çünkü bugün
   istemci tablosu (`client/src/lib/auth.tsx:8-12`) ile sunucu listesi
   (`server/YesLojistik.Api/Auth/Policies.cs:15-17`) elle senkron tutulmaktadır; ikisi ayrışırsa
   kullanıcı düğmeyi görür ama sunucu reddeder.
2. **En az yetki.** Yeni bir kullanıcı varsayılan olarak **görme** hakkı alır; ekleme/düzeltme/silme
   açıkça verilir. Onaylama ve muhasebeleştirme asla varsayılan gelmez.
3. **Rol ≠ kullanıcı.** Rol bir şablondur; kullanıcıya rol dışı ek hak verilebilir, ancak **hak
   alınamaz**. Gerekçe: bir kullanıcıyı beklenmedik biçimde kilitli bırakmak, iş akışını durdurur.
4. **Kendi kendini kilitleme yasağı.** Bugünkü kural korunur: kullanıcı kendi yönetici yetkisini
   kaldıramaz ve kendini pasife alamaz (`server/YesLojistik.Api/Controllers/UsersController.cs:73-74`).
   Kural matrise de uygulanır: son `admin` kullanıcısının `admin` hakkı kaldırılamaz.
5. **Ayna modu üstün.** Ayna açıkken yazma uçları zaten reddedilir
   (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:20-28`). Yetki artırılsa bile ayna
   kuralı kazanır; sıra: kimlik → yetki → ayna → lisans.
6. **Lisans üstün.** Süresi dolmuş lisansta panel salt okunur olur (`LicenseGuard`,
   `server/YesLojistik.Api/Infrastructure/LicenseGuard.cs`); yetki bu durumu geçersiz kılamaz.

### 5.2 Onay (maker-checker)

| Akış | Kim hazırlar | Kim onaylar | Limitten sonra | Bugünkü durum |
|---|---|---|---|---|
| Masraf onayı | Şoför (mobil) / operasyon | Muhasebe | Limit zorunlu | Kısmen var (`ExpenseService.ReviewAsync`) |
| Fatura onayı | Muhasebe | Yönetici | Limit üstü daima | **Yok** |
| Ödeme talimatı | Muhasebe | Yönetici | Limit üstü daima | **Yok** |
| İptal onayı | Muhasebe | Yönetici | Tutar ne olursa olsun **daima** | **Yok** |

Kurallar:

1. **Hazırlayan onaylayamaz.** `ApprovalRequest.PreparedByUserId != CurrentUserId` zorunludur; ihlal
   `DomainException("Hazırladığınız kaydı kendiniz onaylayamazsınız.")` ile reddedilir.
2. **Limit.** Tutar ≤ limit ise onay **gerekmez** (doğrudan kaydedilir); tutar > limit ise kayıt
   `Pending` durumunda oluşur ve ilgili onay merkezine düşer. Limit `0` = her tutar onay ister.
3. **Limit tutarı belge para birimindedir.** Bugün tek para birimi vardır (bkz. §6.5), bu yüzden kural
   basittir: TL. Döviz geldiğinde (`22-ITHALAT-IHRACAT-DOVIZ.md`) limit, işlem günü kuruyla TL'ye
   çevrilerek karşılaştırılır.
4. **Ret gerekçesi zorunlu.** Bugünkü masraf kuralı tüm akışlara yayılır: gerekçesiz ret kabul edilmez
   (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:35`).
5. **Onay geri alınabilir mi?** Hayır. Onaylanan kayıt için düzeltme yapılır; onay kararı geçmişte kalır.
   Gerekçe: onay geri alınırsa iki ayrı onaylı sürüm oluşur ve denetim izi okunamaz hale gelir.
6. **Onay bekleyen kayıt raporlara girer mi?** Evet ama ayrı gösterilir. Bugünkü `ApprovalStatus`
   davranışı korunur: `Pending` masraf kaydı silinmez, onay sekmesinde bekler
   (`client/src/pages/ExpensesPage.tsx:85`). Muhasebe çekirdeği geldiğinde `Pending` kayıt **fişe
   bağlanmaz** (bu `06-MUHASEBE-MOTORU.md` ile kesişir).
7. **Zaman aşımı.** Onay 7 gün bekleyen kayıt onay merkezinde kırmızı vurgulanır; **otomatik onay
   yoktur** (sessiz onay muhasebe açısından tehlikelidir).

### 5.3 Dönem kilidi

1. **Kilit tarihi (dahil).** `PostingDate <= LockDate` olan kayıtlar kilitlidir.
2. **Kilit neyi engeller?** Yeni fiş, fatura, tahsilat, ödeme, gider ve stok hareketi **oluşturmayı ve
   düzeltmeyi** engeller. Silme de engellenir (izin verilseydi bakiye sessizce değişirdi).
3. **Kilit neyi engellemez?** Okuma, raporlama, ekstre, dışa aktarma, e-belge **durum sorgusu**
   (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:100`) ve iptal onayı.
4. **Geçici açma.** Yönetici gerekçe + süre vererek açar. Süre dolunca kilit kendiliğinden geri gelir.
   Açıkken yapılan **her** kayıt denetim izine `PeriodOverride` etiketiyle yazılır.
5. **Hata metni.** Sade Türkçe, teknik sözcük yok:
   `"Bu tarih kilitli (31.12.2026). Kayıt için yöneticiden dönem kilidini açmasını isteyin."`
6. **Devir ve açılış.** Devir bakiyesi bugün ayrı bir alandır (`Customer.OpeningBalance`,
   `server/YesLojistik.Core/Entities/Customer.cs:25`); kilit devir tarihinden önce başlatılamaz,
   yoksa devir bakiyesi kilitli dönemde kalır ve düzeltilemez.

### 5.4 Numaralandırma

1. **Boşluksuz varsayılan.** Bugünkü davranış korunur: numara transaction içinde alınır ve geri alma
   durumunda numara da geri alınır (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:37`).
2. **İptalde numara korunur.** Kullanıcıya açıkça söylenir
   (`client/src/pages/InvoicesPage.tsx:202`). İptal edilen belge numarası **başka belgeye verilmez**;
   `InvoiceNo` alanı tekildir (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:308`).
3. **Seri değişimi.** Seri değiştirildiğinde eski seri kapatılır; yeni seri kendi sırasından başlar.
   Eski seri **silinemez** (geçmiş belgeler ona bağlıdır).
4. **Yıl dönümü.** e-Fatura numarası yıl başına sıfırlanır; bu bugün `EInvoiceSequence` tablosunun
   `(Prefix, Year)` anahtarıyla zaten doğaldır (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:42`).
5. **Satış faturası numarası yıl sıfırlamaz.** Bugün `NextInvoiceNumber` tek bir sayaçtır ve yıl
   bilgisi taşımaz (`server/YesLojistik.Core/Entities/CompanySettings.cs:21`). Bu **bilinçli bir
   eksik** olarak işaretlenir: yıl dönümünde sıfırlama isteniyorsa seri tanımına `Year` eklenmesi
   gerekir (bkz. §6.2).
6. **Çakışma koruması.** Hem `InvoiceNo` hem `EInvoiceNo` için veritabanı düzeyinde tekil indeks
   vardır (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-308`); uygulama hatası olsa bile
   aynı numara iki kez yazılamaz.
7. **Entegratör numarayı değiştirirse.** Sağlayıcı kendi numarasını dönerse bu numara faturaya yazılır
   ve 16 karakterde kırpılır (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:141`).
   Bu davranış **risk**tir: numarayı entegratör verirse boşluk bizim kontrolümüzde olmaz
   (`docs/ENTEGRATOR-EKLEME.md:44` ile aynı uyarı).

### 5.5 Denetim izi

1. **Veri değişikliği** bugünkü mekanizmayla otomatik yazılmaya devam eder
   (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).
2. **Karar olayları** ayrı satır olarak yazılır: `ApprovalGranted`, `ApprovalRejected`, `ApprovalCreated`,
   `PeriodLocked`, `PeriodUnlocked`, `PeriodOverride`, `RoleGranted`, `RoleRevoked`, `NumberSeriesChanged`.
   Bunlar `Action` alanına yazılır; `Changes` alanına okunur gerekçe konur (mevcut 2000 karakter sınırı
   içinde — `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:71`).
3. **Numara sayaçları da izlenir.** `EInvoiceSequence` bugün `BaseEntity` türevi olmadığı için
   izlenmez (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56`). Seri **tanımı** değişikliği
   izlenir, sayaç artışı izlenmez — bu doğrudur (her fatura bir sayaç artışı üretir ve izi
   zaten fatura kaydıdır). Ancak **elle müdahale** (sıradaki numarayı elle değiştirme) mutlaka
   `NumberSeriesChanged` olayıyla kaydedilir, çünkü bu tek başına numara boşluğu ya da tekrarı yaratır.
4. **Yetki değişikliği izi.** Rol değişikliğinde bugün oturumlar iptal edilir
   (`server/YesLojistik.Api/Controllers/UsersController.cs:79`). Buna ek olarak
   `RoleGranted`/`RoleRevoked` olayı yazılır; böylece "kim, kime, hangi yetkiyi, ne zaman verdi"
   sorusu tek sorguyla cevaplanır.
5. **Silinemezlik.** Denetim izi silinmez ve düzeltilmez. Bugün `AuditLog` `BaseEntity` türevi
   **değildir** (`server/YesLojistik.Core/Entities/AuditLog.cs:4`), yani yumuşak silme alanı yoktur —
   bu doğru tasarımdır ve korunur.
6. **Gizlilik.** Bugünkü dışlama listesi korunur; yeni olaylarda da şifre/token/anahtar yazılmaz
   (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:12-21`).

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. Aşağıdaki tüm
tablolar **yeni**dir ve mevcut tablolara yalnız boş olabilen sütun ekler.

### 6.1 Yeni tablo: `RolePermission` (modül bazlı yetki matrisi)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Role` | `UserRole` | Yerleşik rol; kullanıcı tanımlı roller için `30` dokümanı |
| `Module` | string(40) | Ör.: `trips`, `invoices`, `expenses`, `cash`, `stock`, `purchase`, `payroll` |
| `CanView` … `CanPost` | bool × 6 | `View`, `Create`, `Edit`, `Delete`, `Approve`, `Post` |
| `AmountLimit` | decimal? | Boş = limitsiz; `0` = her tutar onay ister |
| `CanApproveOwn` | bool | Varsayılan `false` |

Tekil indeks: `(Role, Module)`. Ekleme yöntemi: yeni tablo + başlangıç verisi (mevcut üç politikadan
türetilen satırlar) — böylece **davranış değişmez**: bugün `Operations` neyi yapabiliyorsa matriste
aynısı yazılır (`server/YesLojistik.Api/Auth/Policies.cs:15-17` ile birebir).

### 6.2 Yeni tablo: `NumberSeries` (belge serisi)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `DocumentKind` | yeni enum | `SalesInvoice, EInvoice, EArchive, EWaybill, JournalEntry, Check, PromissoryNote` |
| `Prefix` | string(3) | Bugünkü `^[A-Za-z0-9]{3}$` kuralı |
| `Year` | int? | Boş = yıl sıfırlaması yok (bugünkü satış faturası davranışı) |
| `Next` | long | Sıradaki numara |
| `Pad` | int | 6 (satış) / 9 (e-Fatura) |
| `GapOnCancel` | bool | Varsayılan `false` = boşluksuz |
| `IsActive` | bool | |

Tekil indeks: `(DocumentKind, Prefix, Year)`.
**Geçiş planı:** bugünkü `CompanySettings.InvoicePrefix`/`NextInvoiceNumber`
(`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`) ve
`EInvoiceSeriesPrefix`/`EArchiveSeriesPrefix` (`:46-47`) ile `EInvoiceSequence`
(`server/YesLojistik.Core/Entities/Invoice.cs:56-61`) **silinmez**. Yeni tablo eklenir, mevcut satırlar
oradan **okunur**; sayaç artışı önce yeni tablodan yapılır, eski alanlar aynı anda güncellenir (çift
yazma). Eski alanlar bir sürüm boyunca yedek olarak kalır; bu bir **geri dönüş yolu**dur.

### 6.3 Yeni tablo: `ApprovalRequest` (onay akışı)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Kind` | yeni enum | `Expense, Invoice, PaymentOrder, Cancellation` |
| `EntityType` | string(40) | `Expense`, `Invoice`, `SupplierPayment`, … |
| `EntityId` | int | Hedef kayıt |
| `Amount` | decimal | Limit karşılaştırması bu alandan |
| `Status` | yeni enum | `Pending, Approved, Rejected, Cancelled` |
| `PreparedByUserId` / `PreparedBy` | int? / string | Hazırlayan (mevcut `ReviewedBy` deseniyle uyumlu) |
| `DecidedByUserId` / `DecidedBy` | int? / string | Karar veren |
| `DecidedAt` | DateTime? | |
| `Reason` | string(300) | Ret gerekçesi; masraf kuralıyla aynı sınır |
| `Note` | string(500) | Onay notu |

İndeksler: `(Status, Kind)`, `(EntityType, EntityId)`.
**Geçiş:** `Expense.ApprovalStatus`/`RejectionReason`/`ReviewedAt`/`ReviewedBy`
(`server/YesLojistik.Core/Entities/Expense.cs:33-36`) **korunur** ve çalışmaya devam eder. Yeni
`ApprovalRequest` satırı masraf için de yazılır; iki kayıt aynı kararı gösterir. Böylece mevcut şoför
bildirimi (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:44-46`) bozulmaz.

### 6.4 Yeni tablo: `AccountingPeriod` (dönem kilidi)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Year` / `Month` | int | Dönem |
| `LockDate` | DateOnly? | Boş = dönem açık |
| `IsLocked` | bool | |
| `LockedBy` / `LockedAt` | string? / DateTime? | |
| `UnlockReason` | string(300)? | |
| `OverrideUntil` | DateTime? | Geçici açma bitişi |

Tekil indeks: `(Year, Month)`.
**Kritik:** bu tabloda **hiçbir varsayılan satır oluşturulmaz**. Tablo boş başlarsa hiçbir dönem
kilitli değildir; yani mevcut canlı veri **etkilenmez** (kural §1.4 ve §1.5).

### 6.5 Mevcut tablolara eklenecek sütunlar (hepsi boş olabilir)

| Tablo | Sütun | Tip | Neden |
|---|---|---|---|
| `Expenses` | `ApprovalRequestId` | int? | Yeni onay kaydına bağ |
| `Invoices` | `ApprovalRequestId` | int? | Fatura onayı |
| `SupplierPayments` | `ApprovalRequestId` | int? | Ödeme talimatı |
| `Users` | `PermissionOverridesJson` | text? | Rol dışı ek haklar (yalnız ekler, almaz) |
| `CompanySettings` | `RequireApprovalOverLimit` | bool | Firma geneli açma/kapama |

Bu beş sütun boş olabilir; doldurulmadığında davranış bugünküyle **birebir aynıdır**.

**Para birimi notu:** bugün repoda döviz alanı **yoktur** (grep: `Currency`, `ExchangeRate`, `Doviz`
için eşleşme yok). Bu yüzden limit karşılaştırması tek para birimidir; döviz `22-ITHALAT-IHRACAT-DOVIZ.md`
kapsamındadır ve bu doküman oraya `AmountLimit` kuralını devreder.

## 7. API uçları

Tümü mevcut desenle yazılır: denetleyici başına politika, `PagedResult<T>` listeleri
(`server/YesLojistik.Api/Controllers/CustomersController.cs:35`), `DomainException` ile sade Türkçe hata.

### 7.1 Yetki

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/permissions/matrix` | — | `{ module, role, view, create, edit, delete, approve, post, amountLimit }[]` | Kimliği doğrulanmış (kendi matrisi) |
| GET | `/api/permissions/roles` | — | Rol listesi + kullanıcı sayısı | `Admin` |
| PUT | `/api/permissions/matrix` | `{ role, module, haklar… }` | Güncel satır | `Admin` |
| PUT | `/api/users/{id}/permissions` | `{ overrides: {module, hak}[] }` | Kullanıcı | `Admin` |

`PUT /api/permissions/matrix` kuralları: `Admin` rolünün `View` hakkı kaldırılamaz (yöneticisiz kalma
koruması, bugünkü `UsersController.cs:73-74` mantığının aynısı). Değişiklik `RoleGranted`/`RoleRevoked`
olayı yazar ve etkilenen kullanıcıların oturumları iptal edilir (`TokenService.RevokeAllAsync`,
bugün `server/YesLojistik.Api/Controllers/UsersController.cs:79`'da kullanılıyor).

### 7.2 Onay

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/approvals` | `kind, status, from, to, minAmount, page` | `PagedResult<ApprovalRequestDto>` | `Accounting` veya `Admin` |
| GET | `/api/approvals/summary` | — | Tür bazında bekleyen sayı/tutar | `Accounting` |
| POST | `/api/approvals/{id}/approve` | `{ note? }` | `ApprovalRequestDto` | `Accounting`, limit üstü `Admin` |
| POST | `/api/approvals/{id}/reject` | `{ reason }` (zorunlu) | `ApprovalRequestDto` | `Accounting` |
| POST | `/api/approvals/{id}/cancel` | `{ reason }` | `ApprovalRequestDto` | Hazırlayan veya `Admin` |

`reject` kuralı: `reason` boşsa `DomainException("Reddetme gerekçesini yazın.")` — bugünkü metinle aynı
(`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:35`).

### 7.3 Dönem kilidi

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/periods` | `year?` | Dönem listesi + kilit durumu | `Accounting` |
| POST | `/api/periods/{year}/{month}/lock` | `{ lockDate, reason }` | Dönem | `Admin` |
| POST | `/api/periods/{year}/{month}/unlock` | `{ reason, hours? }` | Dönem | `Admin` |

Kilit kontrolü **sunucuda** yapılır ve tüm yazma uçlarında ortak bir filtreden geçer. Bugünkü
`MirrorWriteGuard` bir `IAsyncActionFilter`'dır (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:12`);
yeni `PeriodLockGuard` aynı desende yazılır ve `MirrorWriteGuard`'dan **sonra** çalışır.
`Program.cs`'te kayıt yeri bugünküyle aynı blokta (`server/YesLojistik.Api/Program.cs:120`).

### 7.4 Belge serileri

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/number-series` | `kind?` | Seri listesi + son numaralar | `Accounting` |
| POST | `/api/number-series` | `{ documentKind, prefix, year, next, pad, gapOnCancel }` | Seri | `Admin` |
| PUT | `/api/number-series/{id}` | Aynı gövde | Seri | `Admin` |
| GET | `/api/number-series/{id}/last` | `count=10` | Son belgeler | `Accounting` |

`next` alanı **elle düşürülemez** (tekrar üretir). Yalnız ileri alınabilir; geri alma denemesi
`DomainException("Sıradaki numara yalnız ileri alınabilir.")` ile reddedilir. Bu kural
`next` alanının bugünkü `UPDATE ... RETURNING` üretimiyle çakışmaması için gereklidir
(`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:181-188`).

### 7.5 Denetim izi (genişletme)

Bugünkü uç korunur ve `action` süzgeci eklenir: `GET /api/audit?entityType=&entityId=&action=&search=`
(`server/YesLojistik.Api/Controllers/AuditController.cs:19`). Yetki `Admin` olarak kalır.

## 8. Yetki, onay ve denetim izi

Bu dokümanın kendi konusu olduğu için burada **karar tablosu** verilir.

| İş | Görme | Ekleme | Düzeltme | Silme | Onaylama | Muhasebeleştirme |
|---|---|---|---|---|---|---|
| Sevkiyat | Operasyon, Muhasebe, Yönetici | Operasyon, Yönetici | Operasyon, Yönetici | Yönetici | — | Muhasebe |
| Masraf/gider | Muhasebe, Yönetici | Operasyon, Muhasebe | Hazırlayan (onaysız), Muhasebe | Yönetici | Muhasebe (limit üstü Yönetici) | Muhasebe |
| Satış faturası | Muhasebe, Yönetici | Muhasebe | Muhasebe (onaysız), Yönetici | Yönetici | Yönetici (limit üstü) | Muhasebe |
| Tahsilat | Muhasebe, Yönetici | Muhasebe | Muhasebe | Yönetici | Yönetici (limit üstü) | Muhasebe |
| Ödeme talimatı | Muhasebe, Yönetici | Muhasebe | Muhasebe (onaysız) | Yönetici | Yönetici | Muhasebe |
| Cari kartı | Operasyon, Muhasebe | Operasyon, Muhasebe | Operasyon, Muhasebe | Yönetici | — | — |
| Stok kartı | Operasyon, Muhasebe | Operasyon | Operasyon | Yönetici | — | Muhasebe |
| Belge serisi | Muhasebe | Yönetici | Yönetici | — (silinemez) | — | — |
| Dönem kilidi | Muhasebe | — | Yönetici | — | — | — |
| Kullanıcı/yetki | Yönetici | Yönetici | Yönetici | Yönetici | — | — |

Tablo bugünkü politika listeleriyle **uyumlu başlar** (`server/YesLojistik.Api/Auth/Policies.cs:15-17`),
yani geçiş gününde hiçbir kullanıcı iş yapamaz hâle gelmez.

Maker-checker özeti:

- **Masraf:** bugünkü akış korunur, limit eklenir.
- **Fatura:** `Draft` → (hazırlayan) → `Pending` → (onaylayan) → `Issued`. Bugünkü `issue` ucu
  (`server/YesLojistik.Api/Controllers/InvoicesController.cs:78`) limit altında doğrudan çalışmaya
  devam eder; limit üstünde onay kaydı üretir.
- **Ödeme talimatı:** ödeme kaydı oluşur ama kasa/banka bakiyesine **onaydan sonra** yansır.
- **İptal:** bugünkü iptal ucu (`server/YesLojistik.Api/Controllers/InvoicesController.cs:81`) artık
  onay kaydı üretir. e-Fatura tarafında iptal zaten iki adımlıdır
  (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:112-136`); bu doküman onu
  **bozmaz**, insan onayını önüne ekler.

Denetim izi: §5.5 ve §6.3'te tarif edilen olay adları; mevcut otomatik alan izleme aynen sürer
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).

## 9. Kabul kriterleri

1. `GET /api/permissions/matrix` dört rol × en az 7 modül için satır döner; yanıt süresi
   yerel ortamda 200 ms altı.
2. Yetki matrisi kaydedildiğinde etkilenen kullanıcının açık oturumu kapanır (sonraki istek 401 alır) —
   bugünkü davranışla aynı: `server/YesLojistik.Api/Controllers/UsersController.cs:79`.
3. Son `admin` kullanıcısından `Admin` rolü kaldırılmaya çalışılırsa sunucu `DomainException` döner ve
   kayıt değişmez (test edilir).
4. Limit üstü fatura onaylanmadan `Issued` durumuna geçmez; onaylandığında tek istekte geçer.
5. Hazırlayan kendi onay kaydını onaylamaya çalışırsa **403/`DomainException`** alır; deneme denetim
   izine yazılır.
6. Gerekçesiz ret denemesi reddedilir; hata metni `"Reddetme gerekçesini yazın."` içerir.
7. Kilitli döneme fatura kesme, tahsilat girme, gider ekleme ve stok hareketi yazma denemelerinin
   **dördü de** sade Türkçe hata verir; hiçbiri kayıt oluşturmaz.
8. Kilit kaldırma ve kilit üstü kayıt olayları `AuditLog`'da `PeriodUnlocked`/`PeriodOverride` olarak
   görünür; `GET /api/audit?action=PeriodOverride` en az bir satır döner.
9. Kilit açıkken panelde düğmeler **görünür ama pasiftir** (değil gizli): kullanıcı neden
   yapamadığını görebilmelidir. Gizleme yerine `disabled` + `title` tercih edilir.
10. Seri tanımında `next` alanı geriye alınamaz; deneme hata verir ve sayaç değişmez.
11. İki farklı kullanıcı aynı anda fatura keserse iki **farklı** numara üretilir — bugünkü test
    genişletilir (`server/YesLojistik.Tests/Integration/EInvoiceTests.cs:111`).
12. Bir fatura iptal edildikten sonra numarası hiçbir yeni faturaya verilmez.
13. `docs/plan-erp/01-ORTAK-SARTNAME.md` §4'teki referans denetimi bu doküman için **0 kırık referans**
    verir.
14. Bu dokümanın uygulanmasından sonra mevcut testlerin **hiçbiri** silinmez veya atlanmaz; toplam test
    sayısı azalmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `PermissionMatrixTests.cs`
- Matris varsayılanları bugünkü politikalarla aynı mı (`Policies.OperationsRoles` ↔ `trips.create`).
- `Admin` rolünün `view` hakkı kaldırılamaz.
- Son `admin` kullanıcısının yetkisi alınamaz.

Yeni dosya: `NumberSeriesTests.cs`
- `next` geriye alınamaz.
- Boşluksuz seride iptal numarayı boşa çıkarmaz.
- Yıl değişiminde e-Fatura sırası sıfırlanır, satış faturası sırası (yılsız seri) sıfırlanmaz.

Yeni dosya: `PeriodLockTests.cs`
- `PostingDate <= LockDate` kilitli; `LockDate + 1 gün` açık.
- Boş `LockDate` hiçbir kaydı engellemez (geriye dönük uyumluluk kanıtı).

Yeni dosya: `ApprovalRulesTests.cs`
- Hazırlayan = onaylayan reddi.
- Limit sınırında (`tutar == limit`) onay **gerekmez** mi, gerekir mi: karar `tutar > limit` olarak
  sabitlenir ve testle kilitlenir.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `ApprovalFlowTests.cs` (bugünkü `EInvoiceTests.cs` deseniyle, `ApiFactory` üzerinden —
`server/YesLojistik.Tests/Integration/ApiFactory.cs`):
- Limit üstü masraf → `Pending` → onay → `Approved`; şoför bildirimi red yolunda gider
  (mevcut `FakePushSender` kullanılır: `server/YesLojistik.Tests/Integration/FakePushSender.cs`).
- `Operations` rolü onay uçlarında **403** alır (bugünkü rol testiyle aynı üslup:
  `server/YesLojistik.Tests/Integration/EInvoiceTests.cs:157`).
- Kilitli dönemde fatura kesme 400/`DomainException` döner ve fatura **oluşmaz**.

Yeni dosya: `NumberSeriesApiTests.cs`
- `POST /api/number-series` ile seri oluşturma; `PUT` ile ileri alma; geri alma reddi.
- İki eşzamanlı istek → iki farklı numara.

Mevcut testler korunur; `WorkflowTests.cs`, `AuditTests.cs` ve `AuthTests.cs` bu değişikliklerden sonra
yine yeşil olmalıdır (regresyon kanıtı).

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `approvals.spec.ts`
- Muhasebe kullanıcısıyla giriş → `/onaylar` → limit üstü masrafı onayla → satır listeden çıkar.
- Gerekçesiz ret denemesi → hata metni görünür.
- Operasyon kullanıcısıyla giriş → `/onaylar` menüde **görünmez**.

Yeni dosya: `period-lock.spec.ts`
- Yönetici dönemi kilitler → muhasebe kullanıcısı fatura kesmeye çalışır → hata metni.
- Kilit kaldırılır → aynı işlem başarılı olur.

Mevcut `client/e2e/new-ui/basics.spec.ts` ve `client/e2e/security.spec.ts` dosyaları yeni sekmeleri
kapsayacak biçimde **genişletilir** (`useNewUi` yardımcısı: `client/e2e/helpers.ts:44-46`).

### 10.4 Yeni görünüm testi

`client/e2e/new-ui/` altına `settings-roles.spec.ts`: yeni görünümde `/ayarlar?tab=roles` açılır, matris
tablosu çizilir, bir hücre değiştirilip kaydedilir. Klasik görünümde de aynı sekmenin çalıştığı
`basics.spec.ts` içinde doğrulanır — kural §1.3: yeni ekranlar **iki görünümde de** çalışır.

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `RolePermission` tablosu + migration + başlangıç verisi | 1,5 | — |
| 2 | `PermissionService` + `GET/PUT /api/permissions/*` | 2 | 1 |
| 3 | Panel: `can()` yeniden yazımı + matris ekranı | 3 | 2 |
| 4 | `ApprovalRequest` + `ApprovalService` + uçlar | 3 | 1 |
| 5 | Onay Merkezi ekranı (`/onaylar`) | 2,5 | 4 |
| 6 | Mevcut masraf onayının yeni akışa taşınması (bildirim korunarak) | 1,5 | 4 |
| 7 | Fatura/ödeme/iptal limit entegrasyonu | 3 | 4 |
| 8 | `AccountingPeriod` + `PeriodLockGuard` + uçlar | 2,5 | — |
| 9 | Dönem kilidi ekranı | 1,5 | 8 |
| 10 | `NumberSeries` + üreticiler + uçlar | 3 | — |
| 11 | Belge serileri ekranı | 2 | 10 |
| 12 | Denetim izi olayları (§5.5) | 1,5 | 4, 8, 10 |
| 13 | Testler (birim + entegrasyon + e2e) | 4 | Tümü |
| **Toplam** | | **~32 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo adlandırma ve ortak `BaseEntity` kuralları) ve
`04-HEDEF-MIMARI.md` (servis kayıt düzeni). Bu doküman onların kararlarını **bekler**; tablo/alan adları
oradaki sözleşmeye göre son hâlini alır.

**Bu dokümanı bekleyenler:** `06-MUHASEBE-MOTORU.md` (fiş numarası ve muhasebeleştirme hakkı),
`08-E-BELGE-KATMANI.md` (seri sürekliliği), `09-CARI-YONETIMI.md` (risk limiti yetkisi),
`10-STOK-VE-DEPO.md` (stok hareketi kim girebilir), `34-LISANS-ABONELIK-KONTOR.md` (modül lisansı
yetkiyle kesişir).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| Matrisi sıkı başlatmak → kullanıcılar iş yapamaz | Yüksek | Başlangıç verisi bugünkü politikaların **birebir** kopyası (`Policies.cs:15-17`); ilk gün kimse kaybetmez | `RolePermission` tablosunu boşalt → eski `Policies` davranışı geri gelir |
| İstemci/sunucu matris ayrışması | Orta | Tek kaynak: `GET /api/permissions/matrix`; `can()` oradan beslenir | İstemci sabit tablosu (`client/src/lib/auth.tsx:8-12`) bir sürüm yedek olarak kalır |
| Dönem kilidi yanlış tarihle konur → geçmiş kilitlenir | Yüksek | Kilit ekranı önce **önizleme** gösterir ("bu aralıkta N kayıt var"); kilit `Admin`'e kapalı | `POST .../unlock` gerekçeyle açar; tüm açmalar izlenir |
| Onay akışı çift kayıt yaratır (`ApprovalRequest` + `Expense.ApprovalStatus`) | Orta | İki kayıt **tek transaction** içinde yazılır; masraf alanları yeni tablodan türetilir, tersi değil | `ApprovalRequest` kullanılmazsa mevcut masraf onayı yalnız başına çalışmaya devam eder |
| Seri geçişinde numara tekrarı | Yüksek | Veritabanı tekil indeksleri (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-308`) son savunma; çift yazma döneminde eski sayaç da güncellenir | Eski alanlar bir sürüm boyunca korunur; üretici tek satır değişiklikle geri alınır |
| Elle numara müdahalesi iz bırakmaz | Orta | `NumberSeriesChanged` olayı zorunlu (§5.5) | Olay yazılmazsa uç `DomainException` ile reddeder |
| Denetim izinin büyümesi (performans) | Düşük | Bugünkü okuma ucu zaten indeksli sıralıdır (`AuditController.cs:31`); arşivleme `35-DENETIM-IZI-KVKK-UYUM.md` | — |
| Yetki kontrolünün yalnız panelde kalması | Yüksek | Tüm kontroller sunucuda; panel yalnız görünürlük sağlar (bugünkü ilke: `MirrorWriteGuard` sunucuda reddeder) | — |

**Doğrulanacaklar (dış bilgi):**

1. **doğrulanacak:** Luca'da "ayrıntılı yetkilendirme" kaç seviyeli, kullanıcı bazında modül/kayıt
   yetkisi verilebiliyor mu (Luca kullanıcı kılavuzu veya bayi demosu).
2. **doğrulanacak:** Luca'da onay akışı ve tutar limiti var mı; hangi belgelerde (demo/kılavuz).
3. **doğrulanacak:** Luca'da dönem kilidi ve geriye dönük kayıt için özel yetki var mı.
4. **doğrulanacak:** Luca'da seri tanım ekranı, yıl sıfırlaması ve numara boşluğu politikası.
5. **doğrulanacak:** e-Fatura numarasını biz mi veriyoruz yoksa entegratör mü atıyor — bu,
   `docs/ENTEGRATOR-EKLEME.md:44` sorusunun cevabıdır ve §5.4.7'yi doğrudan etkiler.
6. **doğrulanacak:** Yasal olarak fatura serisinde numara boşluğu bırakılabilir mi, iptal edilen fatura
   numarası yeniden kullanılabilir mi — **mali müşavir onayı** gerekir; bu doküman yorum yapmaz.
7. **doğrulanacak:** Kapanan döneme kayıt engelinin yasal dayanağı ve süresi — mali müşavir.
8. **doğrulanacak:** Denetim izinin saklama süresi (KVKK ve ticari defter mevzuatı) —
   `35-DENETIM-IZI-KVKK-UYUM.md` ile birlikte, mali müşavir/avukat.
9. **doğrulanacak:** Çok şirketli yapıya geçildiğinde yetki matrisinin şirket bazında mı, kullanıcı
   bazında mı tutulacağı (`30-COK-SIRKETLI-KONSOLIDASYON.md`).
10. **doğrulanacak:** Kullanıcı tanımlı rol ihtiyacı var mı, yoksa dört yerleşik rol yeterli mi
    (kullanıcıya sorulacak; bu doküman dört rolü varsayar ve genişletme yolunu açık bırakır).

Sonraki belgeyle bağlantı: bu doküman `06-MUHASEBE-MOTORU.md`'ye fiş numarası ve muhasebeleştirme
yetkisini, `08-E-BELGE-KATMANI.md`'ye seri sürekliliğini, `09-CARI-YONETIMI.md` ile `10-STOK-VE-DEPO.md`'ye
işlem düzeyi yetki matrisini devreder; hepsi `01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak parçalarını
kullanır.
