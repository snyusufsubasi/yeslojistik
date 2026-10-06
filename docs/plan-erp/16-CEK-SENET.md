# 16 — Çek ve Senet

## 1. Amaç ve kapsam

Bu modül, müşteriden **alınan** ve tedarikçiye **verilen** çek ile senetlerin portföyünü, vadesini,
cirosunu, tahsilini ve karşılıksız akışını tek yerde toplar. Bugün panelde çek ve senet, tahsilat
kaydının içinde bir "yöntem" olarak yaşar: alanlar `Payment` tablosunda durur
(`server/YesLojistik.Core/Entities/Payment.cs:17-23`), ekranı `client/src/pages/ChecksPage.tsx`
dosyasıdır ve tür seçimi tahsilat formunda yapılır
(`client/src/pages/ChecksPage.tsx:78`). Bu yapı işin **giriş** tarafını iyi çözer ama şunları çözmez:

- Tedarikçiye **verdiğimiz** kendi çekimizin ve senedimizin takibi (borç çek/senet).
- Çekin fiziksel yerinin izlenmesi: kasada mı, bankada tahsilde mi, teminatta mı, kimde?
- Vade farkı, ihtar, protesto ve yasal takip adımlarının kaydı.
- Banka tahsil dosyasının (tahsile verme listesi) üretilmesi.
- Çek/senet için muhasebe bağlantısı: senet reeskontu ve teminat kaydı gibi kalemler.

**Kapsam dışı:** muhasebe fişinin kendisi ve yevmiye kaydı (`06-MUHASEBE-MOTORU.md`), banka ekstresi
eşleştirmesi (`15-BANKA-ENTEGRASYON.md`), cari bakiye ve yaşlandırma motoru (`09-CARI-YONETIMI.md`),
hukuki takip süreci yönetimi ve avukat dosyası takibi (`26-DOKUMAN-YONETIMI.md` sınırında kalır).
Karşılıksız çekle ilgili **hukuki** adımlar bu dokümanda tarif edilmez; yalnız kayıt tutulur.

## 2. Luca'daki karşılığı

Luca Koza'nın öne çıkan özellikleri arasında **"Çek/Senet modülü: alacak/borç çek ve senetleri tüm
detay hareketleriyle takip"** açıkça yazılıdır (`02-LUCA-ENVANTERI.md:58`). Luca Net tarafında ise
Excel ile veri aktarımı listesinde **"çek-senet tanımları"** sayılır (`02-LUCA-ENVANTERI.md:28-29`).
Yani Luca'da hem alacak hem borç çek/senet takibi **vardır** ve çek-senet tanımları dışa/içe
aktarılabilir.

Doğrulanmayan noktalar:

- **doğrulanacak:** Luca'da çek-senet **tanımları** ekranında hangi alanların bulunduğu (çek no,
  banka, şube, hesap no, keşide tarihi, vade, tutar, keşideci, ciranta listesi). Kaynak: Luca
  kullanım kılavuzu / demo ekranı / Luca destek.
- **doğrulanacak:** Luca'nın portföy durum adlarının birebir listesi (portföyde, tahsilde, tahsil
  edildi, karşılıksız, ciro, teminatta, iade karşılıkları) ve durum geçiş kuralları.
- **doğrulanacak:** Luca'da **banka tahsil dosyası** üretiminin bulunup bulunmadığı; dosya biçimi
  (banka bazlı mı, ortak mı).
- **doğrulanacak:** **teminat mektubu** takibinin Luca'da hangi modülde olduğu (çek/senet mi, banka
  mı) ve hangi alanlarla tutulduğu. Kaynak: Luca ürün sayfaları ve `02-LUCA-ENVANTERI.md:67`
  entegrasyon listesi.
- **doğrulanacak:** senet reeskontu ve çek reeskontu için Luca'nın kullandığı hesaplama yöntemi ve
  oran kaynağı. Bu bir **mevzuat/muhasebe** konusudur; mali müşavir onayı gerekir, bu doküman
  yorum yapmaz.

## 3. Bizde bugün

**Veri modeli:**

- `Payment` tablosu hem tahsilatı hem çeki taşır. Çek/senet alanları:
  `InstrumentNo`, `Bank`, `InstrumentDueDate`, `InstrumentStatus`, `EndorsedSupplierPaymentId`
  (`server/YesLojistik.Core/Entities/Payment.cs:17-23`).
- `InstrumentStatus` yalnız **altı** durum tanır: `Portfolio`, `InCollection`, `Collected`,
  `Endorsed`, `Bounced`, `Returned` (`server/YesLojistik.Core/Entities/Enums.cs:60-61`).
- Bakiyeye sayılma kuralı: karşılıksız ve iade çek/senet müşteri bakiyesinden düşülmez
  (`Payment.cs:25-27`).
- Çek/senet müşteri tarafında yaşar: `Payment.CustomerId` zorunludur (`Payment.cs:5`). Tedarikçiye
  **verilen** çek için ayrı tablo **yoktur**.
- Ciro, `SupplierPayment` kaydı üretir (`Payment.cs:22-23`).

**İş kuralları (var olan):**

- Durum geçiş tablosu panelde tanımlıdır: `client/src/pages/ChecksPage.tsx:24-32`.
- Sunucu, çek/senet olmayan bir tahsilatta durum değiştirmeyi reddeder
  (`server/YesLojistik.Api/Controllers/PaymentsController.cs:107`).
- Ciro edilince aynı tutarda tedarikçi ödemesi üretilir
  (`PaymentsController.cs:115-127`); ciro geri alınınca o ödeme silinir
  (`PaymentsController.cs:110-114`).
- Karşılıksız/iade edilen çekte ciro geri alınır: tedarikçi borcu yeniden açılır
  (`client/src/pages/ChecksPage.tsx:118`).
- Ciro edilmiş çek/senedin tutarı veya yöntemi değiştirilemez
  (`PaymentsController.cs:186-187`); silinemez (`PaymentsController.cs:161`).
- Kasa/banka bakiyesine yalnız **tahsil edilmiş** çek/senet girer
  (`server/YesLojistik.Infrastructure/Services/CashService.cs:21-23`) ve açıklama metni
  `CashService.cs:24-25` içinde kurulur. Portföydeki ve tahsildeki çek-senetler nakit akışı
  projeksiyonunda ayrı dilimde görünür (`CashService.cs:108-112`).

**Ekran:**

- `client/src/pages/ChecksPage.tsx:35-97`. Süzgeçler: durum (`status`, varsayılan `Portfolio`) ve
  vade üst sınırı (`dueTo`) — `ChecksPage.tsx:37-44`. Sütunlar Vade (kalan/gün geçti uyarısı dahil),
  Müşteri, Çek/Senet, Durum, Tutar — `ChecksPage.tsx:47-62`. Eylem sütunu yalnız `accounting`
  yetkisiyle görünür (`ChecksPage.tsx:63`). Toplam şeridi `TotalsStrip` (`ChecksPage.tsx:85-88`).
- Eylem penceresi `ChecksPage.tsx:99-137`: ciro için tedarikçi, tahsil/tahsile verme için banka
  hesabı seçilir.
- Rota `/cek-senet`, menüde "Çek / Senet" (klasik) ve "Çekler" (yeni görünüm):
  `client/src/lib/nav.ts:57-58` ve `client/src/lib/nav.ts:111-112`. Yeni görünümde grup
  "Banka & Çek"tir (`nav.ts:109`).
- Tahsilat formunda çek/senet alanları: "Çek/Senet No", "Banka", "Çek Vadesi" sütunları Excel
  aktarımında da vardır (`server/YesLojistik.Infrastructure/Services/ImportService.cs:50`).

**Eksikler:**

1. Borç çek/senet (tedarikçiye verilen) tablosu ve ekranı **yok**.
2. Çekin **fiziksel yeri** ve **kimde olduğu** kaydı **yok** (yalnız `EndorsedTo` ünvanı dolaylı bilgi
   verir, `ChecksPage.tsx:58`).
3. **Vade farkı**, ihtar, protesto kaydı **yok**.
4. **Banka tahsil dosyası** üretimi **yok**; yalnız mevcut ekstre/Excel dışa aktarımı vardır
   (`ChecksPage.tsx:77`).
5. **Teminat mektubu** modülü **yok** (koddaki tek iz `DocumentType.License` ve
   `DocumentOwnerType.Vehicle/Driver/Company` — `server/YesLojistik.Core/Entities/Enums.cs:50-56`).
6. **Senet reeskontu** ve **teminat** muhasebe bağlantısı **yok**.
7. Senet alanları eksiktir: borçlu adı, kefil, senet düzenleme yeri, faiz şartı gibi alanlar
   `Payment` tablosunda **yoktur**.

## 4. Hedef ekranlar ve alanlar

### 4.1 Portföy listesi (mevcut `/cek-senet` sayfasının genişletilmesi)

Üstte üç sekme: **Alacak**, **Borç**, **Teminat**.

Varsayılan süzgeçler: durum, vade aralığı, banka, tutar aralığı, müşteri/tedarikçi, "vadesi 7 gün
içinde". Sütunlar:

| Sütun | Alacak sekmesi | Borç sekmesi |
|---|---|---|
| Vade | `instrumentDueDate` + "n gün kaldı/geçti" | aynı |
| Cari | müşteri ünvanı; alt satırda alış tarihi | tedarikçi ünvanı |
| Çek / Senet | yöntem + çek no; alt satırda banka | aynı; alt satırda şube/hesap no |
| Fiziksel yer | "Kasada", "Bankada (tahsil)", "Ciro: X", "İade edildi" | "Kasada", "Tedarikçide" |
| Durum | mevcut rozet (`instrumentStatusLabel`) | aynı altı durum |
| Tutar | `tl2` | `tl2` |
| Kalan | tahsil edilen kısım düşülmüş tutar | aynı |
| ⋯ | Tahsile ver · Tahsil et · Ciro et · Karşılıksız · İade | Öde · Karşılıksız · İade al |

`TotalsStrip`: satır sayısı, toplam tutar, vadesi geçen toplam, 7 gün içinde vadesi gelen toplam.

### 4.2 Çek/senet detayı (sağ çekmece veya tam sayfa)

Kimlik bölümü: çek no, banka, şube, hesap no, keşide tarihi, vade, tutar, para birimi, keşideci
(alacak için müşteri, borç için firma), lehtar, ciranta zinciri.

Senet için ek alanlar: borçlu adı/soyadı, kefil (varsa), düzenleme yeri, faiz şartı var/yok,
özel şartlar metni (500 karakter).

Durum bölümü: mevcut durum, durum tarihi, durum değiştiren kullanıcı.

Bağlantı bölümü: bağlı tahsilat/ödeme, ciro edilen tedarikçi, tahsil edildiği banka hesabı, bağlı
banka ekstresi satırı (`15-BANKA-ENTEGRASYON.md`).

Dosya bölümü: çek görseli (ön/arka), senet görseli, ihtar/protesto belgesi. Dosya yükleme mevcut
fiş yükleme akışıyla aynı kuralları kullanır (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:49-66`).

### 4.3 Hareket geçmişi

| Alan | Tip | Örnek |
|---|---|---|
| Tarih | tarih | `03.10.2026` |
| Hareket | seçim (listeden) | Portföye alındı, Tahsile verildi, Tahsil edildi, Ciro edildi, Karşılıksız, İade edildi, Teminata verildi, Protesto edildi |
| Tutar | tutar | 17.000,00 TL |
| Karşı taraf | metin | Banka adı / tedarikçi / müşteri |
| Açıklama | metin (300) | |
| Belge | dosya | İhtar mektubu, banka makbuzu |
| İşlemi yapan | metin | Denetim izinden |

Hareket geçmişi **değiştirilemez** (yalnız ekleme); yanlış hareket için ters kayıt açılır.

### 4.4 Vade takibi ve vade farkı

Vade tarihi geçmiş ve hâlâ portföyde/tahsilde olan çek/senetler için ihtar durumu tutulur: **ihtar
gönderilmedi / gönderildi / protesto edildi / yasal takip**. Vade farkı hesaplanacaksa:

| Alan | Tip | Zorunlu |
|---|---|---|
| Vade farkı oranı | yüzde (aylık) | evet, hesaplanacaksa |
| Gün sayısı | sayı (hesaplı, değiştirilebilir) | evet |
| Gün esası | seçim (365 / 360) | evet, varsayılan 365 |
| Vade farkı tutarı | tutar (hesaplı) | hesaplanır |
| Tahakkuk tarihi | tarih | evet |
| Fatura no | metin | hayır; faturalandırıldıysa |

**doğrulanacak:** vade farkı oranının kaynağı (sözleşme mi, yasal oran mı) ve gün esasının ne
olacağı. Bu bir **hukuki/mali** konudur; **mali müşavir/avukat onayı gerekir**. Bu doküman varsayılan
bir oran **önermez**; oran kullanıcı tarafından girilir ve kaydı denetim izine yazılır.

### 4.5 Banka tahsil dosyası

Seçilen birden çok alacak çek için tek dosya üretilir. Sütunlar (ortak asgari küme):
sıra no, çek no, banka, şube kodu, hesap no, keşideci, vade, tutar, para birimi, müşteri no.

**doğrulanacak:** her bankanın istediği sütun sırası, kod alanları ve dosya biçimi (Excel/CSV).
Bankalar arasında ortak biçim olup olmadığı doğrulanmalıdır; doğrulanana kadar ortak bir CSV
üretilir ve **profil** yaklaşımıyla banka bazlı şablon eklenebilir hâle getirilir.

### 4.6 Teminat mektubu (yeni alt modül, kapsamı dar)

Teminat mektubu, teminat çeki ve ipotek gibi "verilen teminatlar" tek listede tutulur. Alanlar:
tür (teminat mektubu / teminat çeki / diğer), banka, mektup no, tutar, para birimi, veriliş tarihi,
bitiş tarihi, lehtar (kurum), amaç, durum (aktif / iade edildi / nakde çevrildi), komisyon oranı
(varsa), dosya.

**doğrulanacak:** teminat mektubunun Luca'daki yeri ve alanları (`02-LUCA-ENVANTERI.md:67`);
komisyon giderinin nasıl kaydedildiği.

## 5. İş kuralları

1. **Durum geçişleri sunucuda doğrulanır.** Paneldeki tablo
   (`client/src/pages/ChecksPage.tsx:24-32`) bugün yalnız istemci süzgecidir. Bu modülde aynı tablo
   sunucuda da uygulanır ve geçersiz geçiş **400** döner: "Bu durumdan bu duruma geçilemez."
2. **Bakiyeye sayılma.** Karşılıksız ve iade edilen çek/senet bakiyeden düşülmez
   (`server/YesLojistik.Core/Entities/Payment.cs:25-27`). Teminata verilen çek **bakiyeden düşmeye
   devam eder** (henüz tahsil edilmedi); tahsil edilince durum `Collected` olur, teminat bağlantısı
   kalır.
3. **Kasa/banka bakiyesine yalnız tahsil edilen girer.** Kural değişmez
   (`CashService.cs:21-23`); teminata verme bakiye hareketi **doğurmaz**.
4. **Ciro tek yönlüdür.** Ciro edilen çek geri alınmadan başka tedarikçiye ciro edilemez; tutar ve
   yöntem değiştirilemez (`PaymentsController.cs:186-187`). Yeni: ciro geri alma hareketi
   geçmişe **yeni satır** olarak yazılır, eski satır silinmez.
5. **Karşılıksız akışı.** Karşılıksız işaretlenince: durum `Bounced`, tutar müşteri bakiyesine geri
   eklenir, ciro varsa tedarikçi ödemesi geri alınır (`PaymentsController.cs:110-114`), ihtar
   durumu "gönderilmedi" olarak açılır.
6. **Protesto.** Protesto **yalnız** durum `Bounced` iken seçilebilir. Protesto tarihi, noter bilgisi
   (seri no) ve masraf tutarı girilir; masraf gider olarak yazılabilir.
7. **İade.** İade edilen çek/senet müşteriye geri verilir; tutar bakiyeye geri eklenir
   (`client/src/pages/ChecksPage.tsx:119`).
8. **Vade farkı isteğe bağlı ve ayrı kayıt.** Vade farkı hesaplandığında tahsilat tutarına
   **kendiliğinden eklenmez**; ayrı bir "vade farkı tahakkuku" satırı olur ve kullanıcı onayı ister.
   Gerekçe: faiz geliri/gideri ayrı izlenmelidir.
9. **Para birimi.** Çek tutarı, hesabın para biriminde tutulur. Döviz çekte TL karşılığı
   `22-ITHALAT-IHRACAT-DOVIZ.md` kuralına göre hesaplanır. **doğrulanacak:** dövizli çekte tahsil
   tarihi kuru mu, vade tarihi kuru mu kullanılacak.
10. **Yuvarlama.** Bütün tutarlar `Money.Round` ile 2 haneye yuvarlanır
    (`server/YesLojistik.Core/Domain/Money.cs`).
11. **Silme yok.** Çek/senet kaydı silinmez; iptal/geri alma hareketiyle kapatılır. Bu, canlı veriyi
    korur ve denetim izini bozmaz.
12. **Aynı çek iki kez girilemez.** Aynı banka + çek no + vade + tutar dördülü varsa uyarı verilir:
    "Bu çek zaten kayıtlı."

## 6. Veri modeli

**Mevcut tablolara ekleme (boş olabilen sütunlar):**

- `payments`: `portfolio_place` (metin 30; `safe`, `bank`, `endorsed_to`, `supplier`),
  `portfolio_holder` (metin 150; kimde olduğu), `drawer_name` (metin 150; keşideci),
  `payee_name` (metin 150), `currency` (metin 3), `face_amount` (tutar; dövizde çekin kendi tutarı),
  `collected_amount` (tutar; kısmi tahsil), `demand_status` (metin 20; ihtar durumu),
  `demand_date` (tarih), `protest_date` (tarih), `protest_notary` (metin 100),
  `protest_cost` (tutar), `interest_rate` (yüzde), `interest_days` (sayı), `interest_basis`
  (seçim 365/360), `interest_amount` (tutar), `interest_invoice_id` (int).
- `payments`: senet için `guarantor_name` (100), `issue_place` (metin 100),
  `interest_clause` (metin 300).

**Yeni tablolar:**

**`promissory_notes` / borç çek-senet** yerine daha basit ve tutarlı yol: yeni **`debt_instruments`**
tablosu.

| Sütun | Tip | Not |
|---|---|---|
| `id` | int | |
| `supplier_id` | int | Kime verildi; silme kısıtlı |
| `kind` | seçim | `Check` / `PromissoryNote` |
| `instrument_no` | metin (50) | |
| `bank`, `branch_code`, `account_no` | metin | |
| `issue_date`, `due_date` | tarih | |
| `amount` | tutar | |
| `currency` | metin (3) | |
| `endorsed_to` | metin (150) | Kimden alındı (ciro zinciri) |
| `status` | seçim | Altı durum + `GivenToSupplier` |
| `supplier_payment_id` | int? | Bağlı tedarikçi ödemesi |
| `cash_account_id` | int? | Paranın çıktığı hesap |
| `place` | metin (30) | `safe`, `supplier`, `bank` |
| `note` | metin (500) | |

**`instrument_events` (yeni):** `instrument_kind` (`receivable`/`debt`), `instrument_id`, `at`,
`event_type`, `amount`, `counterparty`, `cash_account_id`, `note`, `document_path`,
`created_by`. Yalnız ekleme; güncelleme ve silme ucu **yoktur**.

**`instrument_collateral` (yeni; teminat):** `kind` (LetterOfGuarantee / Check / Other),
`bank_name`, `letter_no`, `amount`, `currency`, `issue_date`, `expiry_date`, `beneficiary`,
`purpose`, `status` (Active / Returned / Cashed), `commission_rate`, `file_path`.

**`collection_files` (yeni; banka tahsil dosyası):** `cash_account_id`, `created_at`,
`created_by`, `line_count`, `total_amount`, `file_path`, `format_key`.

**Bağlantı:** mevcut `Payments.EndorsedSupplierPaymentId` alanı korunur
(`Payment.cs:22-23`); yeni model onu **bozmaz**, yalnız yanına hareket geçmişi ekler. Migration
kuralı: **yalnız ekleme** (`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

| Metot | Yol | İstek / yanıt | Yetki |
|---|---|---|---|
| GET | `/api/instruments` | `side` (receivable/debt), `status`, `from`, `to`, `bank`, `search`, sayfalama | `Accounting` |
| GET | `/api/instruments/{id}` | detay + hareketler + dosyalar | `Accounting` |
| POST | `/api/instruments` | borç çek/senet oluştur | `Accounting` |
| PUT | `/api/instruments/{id}` | yalnız `Portfolio` durumunda düzenlenebilir alanlar | `Accounting` |
| POST | `/api/instruments/{id}/status` | `status`, `date`, `counterpartyId`, `cashAccountId`, `note` | `Accounting` |
| POST | `/api/instruments/{id}/protest` | `date`, `notary`, `cost` | `Accounting` |
| POST | `/api/instruments/{id}/demand` | ihtar gönderildi işareti + belge | `Accounting` |
| POST | `/api/instruments/{id}/interest` | vade farkı tahakkuku (oran, gün, esas) | `Accounting` |
| GET | `/api/instruments/{id}/events` | hareket geçmişi (salt okunur) | `Accounting` |
| POST | `/api/collection-files` | `cashAccountId`, `instrumentIds[]` → dosya | `Accounting` |
| GET | `/api/collection-files/{id}/download` | üretilen dosya | `Accounting` |
| GET/POST/PUT/DELETE | `/api/collaterals` | teminat kayıtları | `Accounting` |
| GET | `/api/instruments/export` | liste Excel'i (mevcut `ExportButton` deseni) | `Accounting` |
| GET | `/api/instruments/due-soon` | vadesi 7 gün içinde olanlar (uyarılar için) | tüm ofis |

Mevcut `POST /api/payments/{id}/instrument` ucu (`server/YesLojistik.Api/Controllers/PaymentsController.cs:103-133`)
**korunur**; yeni uç onun yerine geçmez, onu genişletir. Bu, canlı panelin çalışmasını bozmaz.

## 8. Yetki, onay ve denetim izi

| İş | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Portföy görüntüleme | ✔ | ✔ | — | — |
| Alacak çek/senet girişi | ✔ | ✔ | — | — |
| Durum değiştirme (tahsil, ciro) | ✔ | ✔ | — | — |
| Karşılıksız / iade işareti | ✔ | ✔ | — | — |
| Protesto kaydı | ✔ | — | — | — |
| Vade farkı tahakkuku | ✔ | — | — | — |
| Teminat kaydı | ✔ | ✔ | — | — |
| Banka tahsil dosyası | ✔ | ✔ | — | — |
| Borç çek/senet oluşturma | ✔ | ✔ | — | — |

**Onay akışı:** Protesto ve vade farkı tahakkuku **iki adımlıdır** (hazırla → onayla). Hazırlayan
onaylayamaz. Karşılıksız işareti onay istemez çünkü geri alınabilir; ancak denetim izine yazılır.

**Denetim izi:** `AppDbContext.SaveChangesAsync` her değişikliği kaydeder
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:456-492`). Ek olarak `instrument_events`
tablosu kalıcı ve **yalnız ekleme** hareket geçmişi tutar; protesto, ihtar ve vade farkı olayları
hem `AuditLog`'a hem `instrument_events`'e yazılır.

**Lisans ve ayna:** ayna modu açıkken (`MirrorWriteGuard`) çek/senet yazma uçları reddedilir;
istemcide yazma düğmeleri gizlenir (`client/src/pages/ChecksPage.tsx:63` desenindeki `can` kontrolü
genişletilir). Lisans süresi dolmuşsa ekran salt okunur olur.

## 9. Kabul kriterleri

1. Portföy listesinde 1440×900'de **en az 14 satır** görünür.
2. Vadesi geçmiş çek/senet satırı kırmızı, 7 gün içindeki satır sarı gösterilir; her satırda
   **en fazla 1 durum rozeti** (kural: `docs/plan/01-ORTAK-SARTNAME.md:243`).
3. Bir çekin tahsil edildi olarak işaretlenmesi **en fazla 2 tık**.
4. Geçersiz durum geçişi sunucuda reddedilir ve ekranda Türkçe hata görünür.
5. Karşılıksız işaretlenen çekin tutarı müşteri bakiyesine geri eklenir; test bakiye öncesi/sonrası
   karşılaştırarak doğrular.
6. Ciro edilmiş çek silinemez; silme denemesi Türkçe hata döner.
7. Kasa/banka bakiyesi portföydeki ve teminattaki çekten **etkilenmez**; yalnız tahsil edilince artar.
8. Aynı banka + çek no + vade + tutar ile ikinci kayıt uyarı verir.
9. 10 çekten oluşan banka tahsil dosyası **5 saniyede** üretilir ve toplam tutar ekrandaki toplamla
   birebir aynıdır.
10. Hareket geçmişi hiçbir uçtan güncellenemez veya silinemez (test 405/404 bekler).
11. 390×844'te portföy listesi kart görünümüne iner, yatay kaydırma yoktur.
12. Ekranda "MT940", "endpoint", "token" gibi teknik sözcük yoktur.

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `InstrumentStatusRulesTests.cs` — durum geçiş tablosunun sunucu tarafı: izinli geçişler, yasak
  geçişler, `Bounced`'dan `Collected`'a geçişin yasak olması.
- `InstrumentInterestTests.cs` — vade farkı hesabı: gün sayısı, 365/360 esası, yuvarlama, oran
  girilmediğinde hesap yapılmaması.
- `InstrumentPortfolioPlaceTests.cs` — `safe`/`bank`/`endorsed_to`/`supplier` yerlerinin bakiyeye
  etkisinin olmaması.
- `CollectionFileBuilderTests.cs` — dosya satırları, sütun sırası, toplam tutar, boş liste reddi.

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `InstrumentTests.cs` — alacak çek oluştur, tahsile ver, tahsil et; bakiye ve kasa hareketi
  doğrulaması; ciro ve ciro geri alma; karşılıksız akışında tedarikçi ödemesinin geri alınması;
  iade akışı.
- `DebtInstrumentTests.cs` — tedarikçiye verilen çek: tedarikçi borcunun düşmesi, karşılıksızda geri
  açılması, hesap bakiyesine etkisi.
- `CollateralTests.cs` — teminat mektubu bitiş tarihi uyarısı, iade ve nakde çevirme durumları.
- `InstrumentEventTests.cs` — hareket geçmişinin yalnız eklenebilir olması.
- Mevcut `PaymentsController` testleri ve `CashTests.cs` **değiştirilmeden** geçer.

**Panel e2e testleri** (`client/e2e/`):

- `client/e2e/instruments.spec.ts` — portföy listesi, süzgeç, vade uyarısı metni, durum değiştirme
  penceresi, karşılıksız onay metni.
- `client/e2e/new-ui/instruments.spec.ts` — `useNewUi(page)` ile sekmeler (Alacak/Borç/Teminat) ve
  yeni görünüm başlıkları.
- `client/e2e/collection-file.spec.ts` — tahsil dosyası üretimi ve toplam eşleşmesi.

**Test verisi:** sahte çek/senet verisi (uydurma müşteri "Örnek Nakliye", uydurma çek no) kullanılır;
gerçek çek numarası, gerçek IBAN veya müşteri bilgisi **depoya girmez**
(`01-ORTAK-SARTNAME.md:20`).

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün |
|---|---|
| Şema eklemeleri + yeni tablolar + migration | 2 |
| Sunucu durum motoru (geçiş doğrulaması) | 3 |
| Alacak detayı ve hareket geçmişi | 3 |
| Borç çek/senet (uçtan uca) | 4 |
| Teminat alt modülü | 3 |
| Vade farkı ve protesto akışı | 3 |
| Portföy listesi ekranı (sekmeler, süzgeçler) | 4 |
| Banka tahsil dosyası | 2 |
| Uyarılar ve nakit akışı bağlantısı | 1 |
| Testler (birim + entegrasyon + e2e) | 4 |
| **Toplam** | **29 kişi-gün** |

**Bağımlılıklar:** `05-VERI-MODELI.md` (tablo ve sütun adları), `07-YETKI-ONAY-NUMARALANDIRMA.md`
(onay akışı ve numaralandırma), `09-CARI-YONETIMI.md` (bakiye ve mahsup), `15-BANKA-ENTEGRASYON.md`
(ekstre satırıyla çek tahsilinin eşleşmesi), `17-GIDER-GELIR-MERKEZLERI.md` (protesto masrafının
gider olarak yazılması), `06-MUHASEBE-MOTORU.md` (senet reeskontu ve teminat kalemleri).

**Önce bitmeli:** `05-VERI-MODELI.md`, `09-CARI-YONETIMI.md`.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Mevcut `ChecksPage` davranışı bozulur | Uçlar korunur, yalnız eklenir; e2e testleri mevcut akışı kapsar | Eski ekran ve uçlar aynen kalır, yeni sekmeler gizlenir |
| Durum geçişi veri bozar | Sunucu doğrulaması + hareket geçmişi + geri alınabilir işaretlemeler | Ters hareket kaydı ile düzeltilir |
| Vade farkı yanlış hesaplanır | Oran kullanıcı girer, varsayılan yok; hesap ayrı kayıt ve onaya bağlı | Tahakkuk kaydı iptal edilir |
| Ciro zinciri kopar | Ciro geri alma yeni satır yazar; eski hareket silinmez | Geçmişten izlenip elle düzeltilir |
| Teminat mektubu süresi kaçar | Bitiş tarihi uyarısı ana sayfa ve listede | Uyarı eşiği ayarlanır |
| Dövizli çekte kur farkı | Para birimi ve kur tarihi ayrı alan; kural `22` numaralı dokümanda | Kayıt düzeltme hareketiyle kapatılır |

**Doğrulanacaklar (dış bilgi):**

- **doğrulanacak:** Luca'nın çek/senet portföy durum adları ve geçiş kuralları
  (`02-LUCA-ENVANTERI.md:58`).
- **doğrulanacak:** banka tahsil dosyası biçimleri ve hangi bankanın hangi sütunları istediği.
  Kaynak: bankaların kurumsal şube talimatları.
- **doğrulanacak:** teminat mektubu modülünün Luca'daki yeri ve alanları.
- **doğrulanacak:** vade farkı oranının kaynağı ve gün esası (365/360). Bu **hukuki/mali** bir
  konudur; **mali müşavir/avukat onayı gerekir**.
- **doğrulanacak:** senet reeskontu ve çek reeskontu için kullanılacak oran ve hesaplama yöntemi.
  **Mali müşavir onayı gerekir.**
- **doğrulanacak:** protesto masrafının gider kategorisi ve belge zorunluluğu.
- **doğrulanacak:** dövizli çekte tahsilat kurunun hangi tarihten alınacağı.

**Mevzuat notu:** Çek ve senetle ilgili ihtar, protesto, zamanaşımı ve vade farkı konuları mevzuata
bağlıdır. Bu doküman **mevzuat yorumu yapmaz**; yalnız kayıt ve ekran tarif eder. Hukuki adımlar için
**avukat onayı gerekir**, mali sonuçlar için **mali müşavir onayı gerekir**.

Sonraki belgeyle bağlantı: `15-BANKA-ENTEGRASYON.md` çek tahsilinin ekstre satırıyla eşleşmesini,
`09-CARI-YONETIMI.md` karşılıksız çekin cari bakiyeye etkisini, `06-MUHASEBE-MOTORU.md` reeskont ve
teminat kalemlerinin yevmiye karşılığını bu dokümanın veri modeline bağlar.
