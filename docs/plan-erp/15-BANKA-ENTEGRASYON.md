# 15 — Banka Entegrasyonu

## 1. Amaç ve kapsam

Bu modül, bankadaki paranın paneldeki kayıtlarla **kendiliğinden** uyuşmasını sağlar. Bugün kullanıcı
bankanın internet şubesine girip ekstreyi gözle okur, sonra tahsilatı, tedarikçi ödemesini ve gideri
panelde elle girer. Aradaki fark (bankada olan ama panelde olmayan hareket, ya da tersi) hiçbir yerde
görünmez. Bu modül üç işi çözer:

1. **Banka hesabı kartını zenginleştirmek.** Bugünkü kasa/banka hesabı yalnız ad, tür, IBAN ve açılış
   bakiyesinden oluşur (`server/YesLojistik.Core/Entities/CashAccount.cs:6-13`). Hesaba banka adı,
   şube, hesap numarası, para birimi ve ekstre alma yöntemi eklenir.
2. **Ekstreyi içe almak.** Dosyadan (MT940, CSV, Excel) ya da sağlayıcı servisinden ekstre satırları
   okunur, satırlar tek tek listelenir, hiçbiri kendiliğinden "kaydedilmiş" sayılmaz.
3. **Eşleştirmek ve mutabakat yapmak.** Her ekstre satırı ya bir tahsilata, ya bir tedarikçi ödemesine,
   ya bir gidere, ya bir virmana bağlanır; bağlanmayan satır "açık" kalır. Dönem sonunda
   **banka bakiyesi = hesap bakiyesi = muhasebe bakiyesi** üçlüsü karşılaştırılır ve fark kalemleri
   listelenir.

**Kapsam dışı:** muhasebe fişi üretimi (`06-MUHASEBE-MOTORU.md`), e-Fatura/e-Arşiv
(`08-E-BELGE-KATMANI.md`), çek/senet portföyü (`16-CEK-SENET.md`), kasa sayımı (`14-KASA.md`). Para
gönderme talimatının bankaya **gerçekten** iletilmesi bu dokümanın kapsamındadır ancak sağlayıcı
protokolü doğrulanmadığı için ilk sürümde talimat yalnız **dosya üretir ve onay kaydı tutar**; banka
kanalı bağlandığında aynı kayıt üzerinden gönderilir.

## 2. Luca'daki karşılığı

Luca'nın **Finans Yönetimi** menüsü altında banka işlemleri vardır; ayrıca Luca'nın entegrasyon
sayfası **banka entegrasyonu**nu listeler (`02-LUCA-ENVANTERI.md:67`). Luca Net'in öne çıkan
özellikleri arasında "banka ekstrelerinin sisteme entegrasyonu" ve Excel ile **banka ekstresi**
aktarımı sayılır (`02-LUCA-ENVANTERI.md:28-42`). Buna göre Luca'da banka entegrasyonu **vardır**.

Doğrulanmayan noktalar:

- **doğrulanacak:** Luca banka entegrasyonunun hangi bankalarla, hangi protokolle (dosya aktarımı,
  MT940, doğrudan servis, aracı kurum) konuştuğu; yetkilendirmenin nasıl yapıldığı; ekstre alma
  sıklığı ve ücreti. Kaynak: <https://www.luca.com.tr/Sayfa/-banka-entegrasyonlari/8> sayfasının
  teknik içeriği; Luca satış/destek ekibi.
- **doğrulanacak:** Luca'da eşleştirmenin kurallı mı (açıklama/IBAN/tutar) yoksa elle mi yapıldığı;
  "otomatik eşleştirme" diye bir ekranın adı ve kapsamı.
- **doğrulanacak:** sanal POS ve tahsilat linki (ödeme bağlantısı) üretiminin Luca'da bulunup
  bulunmadığı; hangi POS sağlayıcılarıyla çalıştığı. Kaynak: Luca ürün sayfaları ve POS sağlayıcı
  sözleşmeleri.
- **doğrulanacak:** MT940/T940 ve CAMT.053 dosya biçimlerinin hangi sürümlerinin kullanılacağı ve
  Türkiye'deki bankaların bu biçimleri hangi adla verdikleri. Kaynak: kullanıcının çalıştığı bankaların
  kurumsal destek birimi.

## 3. Bizde bugün

**Var olan ve yeniden kullanılacak parçalar:**

- **Banka/kasa hesabı ekranı:** `client/src/pages/CashAccountsPage.tsx:32-73`. Sol tarafta hesap
  listesi, sağda seçili hesabın hareket tablosu. Hesap ekleme/düzenleme penceresi
  `client/src/pages/CashAccountsPage.tsx:130-161`, `kind` seçenekleri `Cash`/`Bank`/`Pos`/`CreditCard`
  (`client/src/pages/CashAccountsPage.tsx:23`). IBAN alanı yalnız `Bank` türünde görünür
  (`client/src/pages/CashAccountsPage.tsx:149`).
- **Hareket dökümü:** `client/src/pages/CashAccountsPage.tsx:75-110`. Sütunlar Tarih, İşlem, Giriş,
  Çıkış, Bakiye; bağlantılı açıklama satırı `m.link` ile ilgili kayda gider
  (`client/src/pages/CashAccountsPage.tsx:100`).
- **Bakiye motoru:** `server/YesLojistik.Infrastructure/Services/CashService.cs:18-62`. Bakiye
  **saklanmaz**; tahsilat (`CashService.cs:21-25`), tedarikçi ödemesi (`CashService.cs:26-30`), firmanın
  ödediği onaylı gider (`CashService.cs:31-36`), şoför mutabakatı (`CashService.cs:37-41`), personel
  hareketi (`CashService.cs:42-46`), hesaba alınan komisyon (`CashService.cs:47-53`) ve virman
  (`CashService.cs:54-60`) toplanarak bulunur.
- **Nakit akışı projeksiyonu:** `server/YesLojistik.Infrastructure/Services/CashService.cs:88-119`.
  Önümüzdeki 4 hafta için beklenen tahsilat/ödeme dilimleri; portföydeki ve tahsildeki çek-senetler
  ayrı dilimde (`CashService.cs:108-112`).
- **Müşteri risk limiti:** `server/YesLojistik.Infrastructure/Services/CashService.cs:121-132`.
- **API uçları:** `server/YesLojistik.Api/Controllers/CashController.cs:18-78` (liste, lookup, hareket,
  ekle, güncelle, sil) ve virman `CashController.cs:90-113`. Hesap silme koruması hareket
  sorgusuyla yapılır (`CashController.cs:60-64`).
- **Excel/CSV içe alma iskeleti:** `server/YesLojistik.Infrastructure/Services/ImportService.cs:36-55`
  sütun sözlüğü, `ImportService.cs:58-72` zorunlu sütunlar, `ImportService.cs:135-160` şablon üretimi.
  Bugünkü türler arasında **banka ekstresi yok**; `cash-accounts` yalnız hesap kartlarını aktarır
  (`ImportService.cs:53`).
- **Yaşlandırma ve mahsup mantığı:** `server/YesLojistik.Core/Domain/PaymentAllocator.cs:19-62`
  (faturaya bağlı tahsilat → kalan FIFO) ve yaşlandırma kovaları `PaymentAllocator.cs:64-80`.
- **Dosya saklama:** `server/YesLojistik.Infrastructure/Services/AttachmentService.cs` ve
  `DatabaseFileStorage.cs`; gider fişi örneği `ExpenseService.cs:49-66`. Ekstre dosyası da aynı
  yolla saklanır.

**Eksik olanlar (bu modül kapatır):**

1. Ekstre tablosu ve ekstre satırı tablosu **yok** (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:39-40`
   yalnız `CashAccounts` ve `CashTransfers` içerir).
2. Ekstre içe alma ucu ve ekranı **yok**; `CashAccountsPage.tsx` yalnız `ImportButton entity="cash-accounts"`
   gösterir (`CashAccountsPage.tsx:45`), yani hesap kartı aktarımı.
3. Otomatik eşleştirme, eşleştirme ekranı, açıklama kuralı motoru **yok**.
4. Mutabakat ekranı ve banka-hesap-muhasebe üçlü karşılaştırması **yok**.
5. Ödeme talimatı akışı ve onay kaydı **yok**.
6. Sağlayıcı soyutlaması **yok**. Var olan tek örnek e-Fatura tarafındadır:
   `server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:31-51` arayüzü ve kayıt tablosu
   `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:21-49`. Banka için aynı desen
   kopyalanır.

## 4. Hedef ekranlar ve alanlar

### 4.1 Hesap listesi (mevcut ekranın genişletilmesi)

`/kasa-banka` sayfası korunur; üst şeride üç sekme gelir: **Hesaplar**, **Ekstreler**, **Mutabakat**.

Hesap formuna eklenen alanlar (`CashAccount` tablosuna boş olabilen sütunlar):

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Banka adı | metin (100) | Banka türünde evet | Ör. "Örnek Bank A.Ş." |
| Şube adı | metin (100) | hayır | Ekstre başlığındaki şube |
| Şube kodu | metin (10) | hayır | MT940 `:25:` alanındaki şube |
| Hesap numarası | metin (30) | hayır | Ekstre eşleşmesinin anahtarı |
| Para birimi | seçim (TRY, USD, EUR) | evet, varsayılan TRY | **doğrulanacak:** kullanılacak para birimi listesi |
| IBAN | metin (34) | hayır (mevcut alan) | Mevcut doğrulama korunur (`CashController.cs:74`) |
| Kredi limiti | tutar | hayır | Negatif bakiyede uyarı eşiği |
| Ekstre yöntemi | seçim (Elle dosya, Sağlayıcı) | evet, varsayılan elle | Sağlayıcı seçiliyse ekstre çekme düğmesi görünür |
| Ekstre günü | tam sayı 1–28 | hayır | Otomatik hatırlatma için |

### 4.2 Ekstre listesi

| Sütun | İçerik |
|---|---|
| Dönem | `01.10.2026 – 31.10.2026` |
| Hesap | Banka hesabı adı |
| Kaynak | "Dosya: ekim.mt940" ya da "Sağlayıcı" |
| Satır | Okunan satır sayısı |
| Eşleşen | Bağlanan satır sayısı / toplam |
| Açık | Bağlanmayan satır sayısı (rozet; 0 ise rozet yok) |
| Açılış / Kapanış bakiye | Ekstre başlığından okunan değerler |

Üstte `SumStrip`: okunan satır, eşleşen tutar, açık tutar, bakiye farkı.

### 4.3 Eşleştirme ekranı (ana çalışma ekranı)

İki sütunlu yerleşim: solda **ekstre satırları**, sağda **panel kayıtları**.

Sol sütun satırları: Tarih · Açıklama (kırpma yok, iki satıra sarar) · Tutar (giriş yeşil, çıkış kırmızı)
· Öneri rozeti · Durum.

Sağ sütun, seçilen satırın tutar ve tarihine göre süzülmüş adayları gösterir:

- **Tahsilat adayı:** müşteri ünvanı, fatura no, tutar, tarih, yöntem.
- **Tedarikçi ödemesi adayı:** tedarikçi ünvanı, tutar, tarih.
- **Gider adayı:** kategori, tutar, plaka, açıklama.
- **Virman adayı:** çıkış/giriş hesabı, tutar, tarih.
- **Yeni kayıt:** "Bu satırdan tahsilat oluştur" / "gider oluştur" / "virman oluştur".

Satır altındaki düğmeler: **Eşleştir**, **Yeni kayıt**, **Yok say** (gerekçe zorunlu), **Geri al**.

Klavye: `↑/↓` satır gezer, `Enter` seçili adayla eşleştirir, `Ctrl+Enter` yeni kayıt formunu açar,
`Esc` seçimi bırakır.

### 4.4 Kural motoru ekranı

`Ayarlar → Banka Kuralları` (yeni sekme). Kural satırı alanları:

| Alan | Tip | Açıklama |
|---|---|---|
| Kural adı | metin (100) | Ör. "POS yatırması" |
| Hesap | seçim | Kural yalnız bu hesapta çalışır (boş = tümü) |
| Yön | seçim (giriş/çıkış/fark etmez) | |
| Açıklamada geçen | metin (200) | Basit "içerir" karşılaştırması |
| Tutar aralığı | iki tutar | Boş olabilir |
| Hedef | seçim | Tahsilat / Tedarikçi ödemesi / Gider / Virman |
| Gider kategorisi | seçim | Yalnız hedef "Gider" ise |
| Masraf merkezi | seçim | `17-GIDER-GELIR-MERKEZLERI.md` tablosundan |
| KDV oranı | seçim | Yalnız hedef "Gider" ise; varsayılan kategori oranı |
| Otomatik uygula | anahtar | Açıksa öneri değil, doğrudan eşleştirme |
| Sıra | sayı | Küçük sıra önce denenir |

Kural motoru **saf fonksiyon** olarak yazılır ve veritabanından bağımsız test edilir.

### 4.5 Mutabakat ekranı

Tek tablo, üç sütun: **Banka**, **Panel hesabı**, **Muhasebe** (`06-MUHASEBE-MOTORU.md` hazır olduğunda).
Satırlar tarih bazında hizalanır; eşleşmeyen her satır "fark" olarak işaretlenir ve nedeni seçilir:
"henüz girilmedi", "tutar farkı", "tarih farkı", "banka masrafı", "faiz", "kayıt hatası".

Alt şeritte: banka kapanış bakiyesi, panel bakiyesi, muhasebe bakiyesi, **fark**. Fark sıfır değilse
"Mutabakatı kapat" düğmesi pasiftir.

## 5. İş kuralları

1. **Yuvarlama.** Bütün tutarlar `Money.Round` ile 2 haneye yuvarlanır
   (`server/YesLojistik.Core/Domain/Money.cs`). Ekstre tutarı ile kayıt tutarı arasındaki fark
   **0,01 TL**'ye kadar eşleşme sayılır; daha büyük fark "tutar farkı" olarak listelenir.
2. **Tarih toleransı.** Varsayılan tolerans **±3 gün**; kural ekranından değiştirilebilir. Tolerans
   dışındaki eşleşme uyarı verir ama engellenmez.
3. **Tek satır tek kayıt.** Bir ekstre satırı yalnız bir kayda bağlanır. Bir kayıt birden çok satıra
   bağlanabilir (kısmi ödeme) ancak toplam bağlanan tutar kaydın tutarını aşamaz; aşarsa
   "Tutar kaydı aşıyor" hatası verilir.
4. **Yinelenen ekstre koruması.** Aynı hesap + aynı dönem + aynı dosya özeti (satır sayısı ve satır
   imzalarının özeti) daha önce alınmışsa içe alma reddedilir: "Bu ekstre daha önce alınmış."
5. **Kendiliğinden yazma yok.** İçe alma önizlemesinde (`dryRun`) hiçbir kayıt oluşmaz; yalnız
   "Kaydet" denince satırlar yazılır. Bu, mevcut Excel aktarımının kuralıyla aynıdır
   (`ImportService.cs:23-24`).
6. **Açık satır bakiyeye girmez.** Panel bakiyesi bugün olduğu gibi gerçek kayıtlardan hesaplanır
   (`CashService.cs:64-70`); ekstre satırı ancak bir kayda bağlandığında bakiyeye yansır. Bağlanmayan
   satır yalnız "açık kalem" listesinde görünür. Böylece canlı bakiye yanlış değişmez.
7. **Yok sayma gerekçesi zorunlu.** "Yok say" en az 3 karakter gerekçe ister; gerekçe denetim izine yazılır.
8. **Banka masrafı ve faiz.** Ekstrede panelde karşılığı olmayan masraf/faiz satırı için "gider
   oluştur" kısayolu vardır; oluşan gider `IsOnCredit = false` ve seçilen hesaba bağlı yazılır
   (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:103-112` kuralıyla aynı).
9. **Ödeme talimatı.** Talimat üç durum geçişi yaşar: **Hazırlandı → Onaylandı → Gönderildi**
   (ya da **İptal**). Onaylayan kişi hazırlayan kişi olamaz (maker-checker, `08` numaralı bölüm).
   Gönderim, sağlayıcı bağlı değilse "dosya indirildi ve kullanıcı bankaya yükledi" işaretiyle
   kapatılır.
10. **Kur farkı.** Döviz hesaplarında ekstre tutarı hesabın para biriminde tutulur. TL karşılığı
    `22-ITHALAT-IHRACAT-DOVIZ.md` kuralına göre hesaplanır; **doğrulanacak:** hangi kur kaynağı.

## 6. Veri modeli

Var olan tablolar **değiştirilmez**, yalnız boş olabilen sütunlar eklenir; üç yeni tablo açılır.

**`cash_accounts` (mevcut tabloya ekleme):** `bank_name`, `branch_name`, `branch_code`,
`account_number`, `currency` (varsayılan `TRY`), `credit_limit`, `statement_source`
(`manual`/`provider`), `statement_day`, `provider_key`.

**`bank_statements` (yeni):**

| Sütun | Tip | Not |
|---|---|---|
| `id` | int | |
| `cash_account_id` | int | Hesap, silme kısıtlı |
| `from_date`, `to_date` | date | Ekstre dönemi |
| `source` | metin (20) | `file`, `provider` |
| `file_name` | metin (200) | Saklanan dosyanın adı |
| `storage_path` | metin (300) | `statements/{id}/...` |
| `opening_balance`, `closing_balance` | tutar | Okunabildiyse; boş olabilir |
| `line_count`, `matched_count` | int | Özet sayaçlar |
| `content_hash` | metin (64) | Yinelenen ekstre koruması |
| `imported_at`, `imported_by` | tarih/metin | Denetim |

**`bank_statement_lines` (yeni):**

| Sütun | Tip | Not |
|---|---|---|
| `id` | int | |
| `bank_statement_id` | int | Üst ekstre |
| `value_date`, `booking_date` | date | MT940'da ikisi ayrı |
| `amount` | tutar | Giriş pozitif, çıkış negatif |
| `description` | metin (500) | Ham açıklama |
| `counterparty` | metin (200) | Karşı taraf adı (okunabildiyse) |
| `counterparty_iban` | metin (34) | |
| `reference` | metin (100) | Banka referansı |
| `matched_kind` | metin (20) | `payment`, `supplier_payment`, `expense`, `transfer` |
| `matched_id` | int | Bağlı kaydın kimliği |
| `matched_amount` | tutar | Kısmi eşleşme için |
| `status` | metin (20) | `open`, `matched`, `ignored` |
| `ignore_reason` | metin (300) | |
| `matched_by`, `matched_at` | metin/tarih | Denetim |

**`bank_rules` (yeni):** `name`, `cash_account_id`, `direction`, `description_contains`,
`min_amount`, `max_amount`, `target_kind`, `expense_category`, `cost_center_id`,
`vat_rate`, `auto_apply`, `sort_order`, `is_active`.

**`payment_orders` + `payment_order_lines` (yeni):** talimat başlığı (`cash_account_id`, `date`,
`total`, `status`, `created_by`, `approved_by`, `approved_at`, `sent_at`, `file_path`) ve satırları
(`supplier_id`, `amount`, `iban`, `description`, `supplier_payment_id`).

**Migration kuralı:** hepsi **ekleme**dir; hiçbir migration veri silmez veya dönüştürmez
(`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

| Metot | Yol | İstek / yanıt | Yetki |
|---|---|---|---|
| GET | `/api/bank-statements` | `accountId`, `from`, `to`, `page` → özet liste | `Accounting` |
| POST | `/api/bank-statements/preview` | dosya (multipart) → satırlar + hata listesi, **yazmaz** | `Accounting` |
| POST | `/api/bank-statements` | `accountId`, `fileName`, satırlar → oluşan ekstre | `Accounting` |
| GET | `/api/bank-statements/{id}/lines` | eşleşme durumu, öneri rozeti | `Accounting` |
| POST | `/api/bank-statements/{id}/reimport` | aynı dosyayı yeniden okur, fark raporu | `Accounting` |
| POST | `/api/bank-statement-lines/{id}/match` | `kind`, `targetId` → bağlanan satır | `Accounting` |
| POST | `/api/bank-statement-lines/{id}/create` | `kind` + kayıt gövdesi → yeni kayıt + eşleşme | `Accounting` |
| POST | `/api/bank-statement-lines/{id}/ignore` | `reason` | `Accounting` |
| DELETE | `/api/bank-statement-lines/{id}/match` | eşleşmeyi geri alır | `Accounting` |
| GET | `/api/bank-statements/{id}/suggestions` | satır başına aday listesi (kural + tutar/tarih) | `Accounting` |
| GET/POST/PUT/DELETE | `/api/bank-rules` | kural yönetimi | `Admin` |
| GET | `/api/bank-reconciliation` | `accountId`, `from`, `to` → üçlü karşılaştırma | `Accounting` |
| POST | `/api/bank-reconciliation/close` | dönemi kapatır (fark 0 ise) | `Admin` |
| GET | `/api/bank-accounts/{id}/statement/export` | alınan ekstreyi Excel olarak indirir | `Accounting` |
| POST/GET | `/api/payment-orders` | talimat oluştur/listele | `Accounting` |
| POST | `/api/payment-orders/{id}/approve` | onay (hazırlayan onaylayamaz) | `Admin` |
| POST | `/api/payment-orders/{id}/send` | gönderim işareti / dosya üretimi | `Admin` |
| GET | `/api/bank-providers` | kayıtlı sağlayıcı adları (`IEInvoiceProvider` deseni) | `Admin` |

Yetki politikaları mevcut sabitlerden gelir (`server/YesLojistik.Api/Auth/Policies.cs:5-17`).
Sağlayıcı anahtarları **yalnız ortam değişkeninde** tutulur; dosyaya yazılmaz.

## 8. Yetki, onay ve denetim izi

| İş | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Ekstre içe alma | ✔ | ✔ | — | — |
| Satır eşleştirme | ✔ | ✔ | — | — |
| Satır yok sayma | ✔ | ✔ | — | — |
| Kural tanımı | ✔ | — | — | — |
| Mutabakat kapatma | ✔ | — | — | — |
| Talimat hazırlama | ✔ | ✔ | — | — |
| Talimat onayı | ✔ | — | — | — |
| Ekstre görüntüleme | ✔ | ✔ | — | — |

**Maker-checker:** ödeme talimatında hazırlayan ve onaylayan aynı kullanıcı olamaz; sunucu bunu
reddeder ve gerekçeyi hata mesajında yazar.

**Denetim izi:** `AppDbContext.SaveChangesAsync` her ekleme/güncellemeyi işlem geçmişine yazar
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:456-492`). Buna ek olarak şu olaylar
`AuditLog`'a açık etiketle yazılır: ekstre içe alma, satır eşleştirme, eşleşme geri alma, yok sayma,
kural değişikliği (eski/yeni değer), talimat onayı, talimat gönderimi, mutabakat kapatma.

**Yedek:** canlı veriye yazan ilk kurulum (ekstre alma) öncesi yedek alınır
(`01-ORTAK-SARTNAME.md:20-21`).

## 9. Kabul kriterleri

1. 500 satırlık örnek MT940 dosyası **30 saniyede** okunur ve önizlenir.
2. Önizleme **hiçbir kayıt oluşturmaz**; test bunu veritabanı sayımıyla doğrular.
3. Aynı dosya ikinci kez alınmak istendiğinde **"Bu ekstre daha önce alınmış."** hatası çıkar.
4. Açıklaması kurala uyan 100 satırın **en az %80'i** öneri olarak doğru hedefi gösterir (altın
   senaryo dosyasıyla ölçülür).
5. Bir satırı eşleştirmek **en fazla 2 tık** (satır + aday).
6. Bağlanmayan satırlar panel bakiyesini **değiştirmez**; test önce/sonra bakiyeyi karşılaştırır.
7. Mutabakat ekranında fark 0,01 TL'nin altındaysa "kapalı" sayılır; üstündeyse kapatma düğmesi pasiftir.
8. Bir kayda bağlanan toplam tutar kaydın tutarını aşarsa sunucu **400** döner ve satır bağlanmaz.
9. Ekstre içe alma, eşleştirme ve kapatma işlemlerinin hepsi işlem geçmişinde görünür.
10. 1440×900'de eşleştirme ekranında **en az 14 ekstre satırı** görünür.
11. 390×844'te yatay kaydırma yoktur; eşleştirme ekranı tek sütuna iner ve aday listesi çekmecede açılır.
12. Ekranda teknik sözcük yoktur: "MT940", "endpoint", "token" kullanıcıya görünmez; "ekstre dosyası"
    ve "banka servisi" yazılır.

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `BankStatementParserTests.cs` — MT940 satır ayrıştırma (`:20:`, `:25:`, `:28C:`, `:60F:`, `:61:`,
  `:86:`, `:62F:`), tutar işareti (borç/alacak), virgül/nokta ondalık ayırıcı, bozuk satırın atlanması.
  **doğrulanacak:** alan etiketlerinin hangi bankada hangi anlamda kullanıldığı; test dosyası uydurma
  veriyle yazılır.
- `BankCsvProfileTests.cs` — sütun eşleme profilleri (tarih, tutar, açıklama sırası bankadan bankaya
  değişir), başlık satırı atlama, ayırıcı seçimi (`;` / `,` / sekme).
- `BankRuleMatcherTests.cs` — kural motoru: yön, "içerir", tutar aralığı, sıra önceliği, hedef seçimi.
- `BankMatchAmountTests.cs` — 0,01 TL toleransı, kısmi eşleşme, tutar aşımı hatası.
- `BankDuplicateStatementTests.cs` — içerik özeti ile yinelenen ekstre reddi.

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `BankStatementTests.cs` — önizleme yazmaz; kaydet yazar; hesap bakiyesi bağlanmayan satırdan
  etkilenmez; eşleşme geri alma bakiyeyi eski hâline döndürür.
- `BankReconciliationTests.cs` — üçlü karşılaştırma toplamları, 0,01 toleransı, fark varsa kapatma reddi.
- `PaymentOrderTests.cs` — hazırlayan ile onaylayan aynı kişi olamaz; iptal edilen talimat gönderilemez.
- Mevcut `CashTests.cs` ve `CashService` davranışı **bozulmaz**; mevcut testler değiştirilmeden geçer.

**Panel e2e testleri** (`client/e2e/`):

- `client/e2e/bank-statement.spec.ts` — sahte ekstre dosyasını yükle, önizlemeyi gör, kaydet, bir satırı
  eşleştir, eşleşmeyi geri al, yok say gerekçesi zorunluluğunu doğrula.
- `client/e2e/new-ui/bank-reconciliation.spec.ts` — `useNewUi(page)` ile yeni görünümde mutabakat
  ekranı ve fark göstergesi.
- `client/e2e/mobile.spec.ts` mevcut kuralı: 390×844'te yatay kaydırma yok.

**Test verisi:** Sahte (uydurma) MT940/CSV dosyaları `server/YesLojistik.Tests/Fixtures/` altında
saklanır; gerçek banka ekstresi, gerçek IBAN ve gerçek müşteri adı **kullanılmaz**
(`01-ORTAK-SARTNAME.md:20`). Sahte dosyalar için hesap sahibi "Örnek Nakliye Ltd." gibi uydurma
adlarla yazılır.

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün |
|---|---|
| Hesap alanları + migration | 1 |
| MT940 ayrıştırıcı | 4 |
| CSV/Excel profil desteği | 2 |
| Ekstre tabloları + API | 3 |
| Önizleme/kaydetme ekranı | 4 |
| Eşleştirme ekranı + aday üretimi | 5 |
| Kural motoru + kural ekranı | 3 |
| Mutabakat ekranı | 3 |
| Ödeme talimatı akışı (onay + dosya) | 3 |
| Testler (birim + entegrasyon + e2e) | 4 |
| **Toplam** | **32 kişi-gün** |

**Bağımlılıklar:** `05-VERI-MODELI.md` (tablo adlandırma ve ortak sütunlar), `14-KASA.md` (hesap türü
paylaşımı), `07-YETKI-ONAY-NUMARALANDIRMA.md` (maker-checker ve numaralandırma), `06-MUHASEBE-MOTORU.md`
(mutabakatın üçüncü ayağı; bu doküman onsuz da çalışır ama "muhasebe" sütunu boş kalır),
`17-GIDER-GELIR-MERKEZLERI.md` (gider eşleştirmesinde masraf merkezi), `16-CEK-SENET.md` (çek
tahsilatlarının ekstrede görünmesi).

**Önce bitmeli:** `05-VERI-MODELI.md` ve `07-YETKI-ONAY-NUMARALANDIRMA.md`.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Banka dosya biçimi sürüm farkı, ayrıştırıcı kırılır | Önizleme zorunlu; bozuk satır atlanır ve raporlanır; profil ekranından sütun eşlemesi düzeltilebilir | Ekstre kaydı silinir (soft delete), dosya yeniden alınır |
| Otomatik eşleştirme yanlış kaydı bağlar | Varsayılan "öneri" modu; "otomatik uygula" kuralı yalnız kullanıcı açarsa | Tek tıkla eşleşme geri alınır; kayıt değişmez |
| Ekstre satırı yanlışlıkla bakiyeye girer | Açık satır bakiyeye hiç girmez; yalnız eşleşen kayıt girer | Eşleşme geri alınır, bakiye eski hâline döner |
| Aynı ekstre iki kez alınır, kayıtlar ikizlenir | İçerik özeti ile reddetme | Yinelenen ekstre ve satırları soft delete |
| Talimat onayı atlanır | Maker-checker sunucuda zorunlu | Talimat iptal; gönderim kaydı varsa denetim izinden izlenir |
| Ekstre dosyası gizli veri taşır | Dosya depoda `statements/` altında; erişim yalnız muhasebe rolü | Dosya ve kayıt birlikte silinir |
| Kural motoru yanlış kategori yazar | Kategori değişikliği denetim izine yazılır; toplu düzeltme ekranı | Kayıtlar elle düzeltilir |

**Doğrulanacaklar (dış bilgi):**

- **doğrulanacak:** Türkiye'deki bankaların kurumsal müşteriye verdiği ekstre biçimleri (MT940, CSV,
  Excel, CAMT.053) ve bu dosyaların hangi ekrandan indirildiği. Kaynak: kullanıcının çalıştığı
  bankaların kurumsal destek birimi.
- **doğrulanacak:** her bankanın "doğrudan servis" (API) protokolü, kimlik doğrulama yöntemi, günlük
  istek limiti ve ücreti. Kaynak: banka kurumsal entegrasyon ekibi / sözleşme.
- **doğrulanacak:** Luca'nın banka entegrasyonunun protokolü ve kapsamı
  (`02-LUCA-ENVANTERI.md:67`).
- **doğrulanacak:** sanal POS ve tahsilat linki sağlayıcıları; komisyon oranları; 3D Secure akışı;
  iade (iptal) akışı. Kaynak: POS sağlayıcı sözleşmesi ve teknik dokümanı.
- **doğrulanacak:** ekstredeki karşı taraf IBAN'ının hangi alanda geldiği; IBAN ile cari eşleştirmenin
  bankalar arasında tutarlı olup olmadığı.
- **doğrulanacak:** döviz hesabında kullanılacak kur kaynağı (TCMB kuru mu, banka kuru mu) ve
  kur farkının hangi tarihte hesaplandığı.
- **doğrulanacak:** ödeme talimatının bankaya iletilmesi için gereken yetki belgesi ve teknik onay
  süreci. Bu gelene kadar talimat **dosya üretir ve onay kaydı tutar**, bankaya göndermez.

**Mevzuat notu:** Banka mutabakatı ve ödeme talimatı konusunda mali müşavir/avukat onayı gerekir;
bu doküman mevzuat yorumu yapmaz.

Sonraki belgeyle bağlantı: `16-CEK-SENET.md` çek ve senedin ekstrede görünen tahsilini, `14-KASA.md`
kasa hesabının banka hesabıyla virman ilişkisini, `06-MUHASEBE-MOTORU.md` mutabakatın muhasebe ayağını
bu dokümanın veri modeline bağlar.
