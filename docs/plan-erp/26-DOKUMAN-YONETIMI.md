# 26 — Doküman ve Belge Yönetimi

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (KVKK ve saklama
süreleri için **avukat onayı gerekir**). "Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı
taşır.

## 1. Amaç ve kapsam

Bu modül, panelde **kâğıt ve taranmış belgelerin** tek yerden yönetilmesini sağlar: belge yükleme
(bilgisayardan **ve telefondan kamera ile**), tür seçimi (fatura, irsaliye, çek, sözleşme, ruhsat,
sigorta poliçesi, teslim evrakı, diğer), belgeyi **kayda bağlama** (fatura, sevkiyat, araç, cari),
sürüm ve geçmiş, arama (tür / tarih / etiket / tutar), OCR ile alan çıkarımı, saklama süresi ve
KVKK, depolama (S3 uyumlu) ve boyut limitleri.

Bugün panelde **üç ayrı dosya saklama yeri** vardır ve üçü birbirinden habersizdir:

1. **Sevkiyat ekleri** (`TripAttachment`): teslim fotoğrafı, irsaliye, imza
   (`server/YesLojistik.Core/Entities/TripAttachment.cs:4-16`).
2. **Filo ve firma belgeleri** (`FleetDocument`): ruhsat, kasko, K belgesi, takograf, ehliyet, SRC
   (`server/YesLojistik.Core/Entities/FleetDocument.cs:4-16`).
3. **Alınan fatura dosyası** (`PurchaseInvoice.FilePath`, `:25-26`) — faturanın PDF'i ya da
   görüntüsü.

Bunların hiçbirinde **ortak arama**, **etiket**, **sürüm geçmişi**, **tutar alanı**, **OCR** ve
**saklama süresi** yoktur. Bu modül üç yeri tek bir **belge arşivi** çatısı altında birleştirir;
mevcut kayıtlar ve uçlar **bozulmadan** çalışmaya devam eder (yalnız ekleme kuralı,
`01-ORTAK-SARTNAME.md:22`).

**Kapsam:**

- Belge yükleme: masaüstünde dosya seçici, telefonda **kamera** ve galeri; çoklu yükleme; sürükle
  bırakma (masaüstü).
- Belge türleri ve alt türleri; her tür için **zorunlu alanlar** ve **saklama süresi** kuralı.
- Kayda bağlama: fatura (satış/alış), sevkiyat, araç, şoför, cari (müşteri/tedarikçi), kasa/banka,
  çek-senet, personel, sabit kıymet; bir belge **birden çok** kayda bağlanabilir.
- Sürüm ve geçmiş: aynı belgenin yeni sürümü; kim, ne zaman, hangi sürümü yükledi; eski sürüm
  görüntülenebilir.
- Arama: tür, tarih aralığı, etiket, tutar aralığı, bağlı kayıt, yükleyen, dosya adı, OCR ile
  çıkarılan numara (fatura no, çek no, poliçe no); tam metin arama opsiyonel.
- OCR ile alan çıkarımı: fatura no, tarih, VKN, toplam tutar, çek no/vade; **kullanıcı onayı**
  olmadan hiçbir alan kayda yazılmaz.
- Saklama süresi ve KVKK: tür bazlı saklama süresi, süre sonu **imha** akışı, kişisel veri içeren
  belgelerde erişim kısıtı, veri sahibi talebi (silme/dışa aktarma) akışı.
- Depolama: mevcut `IFileStorage` soyutlaması korunur; **S3 uyumlu** sağlayıcı eklenir; boyut
  limitleri ve toplam kota.
- Ekranlar: Belge Arşivi (liste + süzgeç), Belge Detayı (önizleme + sürüm + bağlar), kayıt
  kartlarındaki **Belgeler** sekmesi, telefondan hızlı yükleme.

**Kapsam dışı:** e-Fatura/e-Arşiv belgesinin **üretimi** (`08-E-BELGE-KATMANI.md`), e-Defter ve
muhasebe belgeleri (`06-MUHASEBE-MOTORU.md`), e-Dönüşüm saklama hizmeti (Luca bu hizmeti listeliyor:
`docs/plan-erp/02-LUCA-ENVANTERI.md:75-77`; bizde kapsam dışı, **doğrulanacak**), taranmış belgenin
hukuki aslı yerine geçmesi (mevzuat yorumu yapılmaz; avukat onayı gerekir), dijital imza/ zaman
damgası, belge şablonu üretimi (`13-SIPARIS-TEKLIF.md`, `11-SATIS-FATURA.md`), tam metin arama
motoru kurulumu (opsiyonel, `**doğrulanacak**`).

Bu modülün çözdüğü beş soru: (1) "Bu aracın ruhsatı sistemde var mı?" (2) "Bu faturanın imzalı
nüshası nerede?" (3) "Bu sevkiyatın teslim evrakını kim, ne zaman yükledi?" (4) "Sigorta poliçesi ne
zaman bitiyor, dosyası ekli mi?" (5) "Şu belgeyi telefonda çektim, kayda nasıl bağlarım?"

## 2. Luca'daki karşılığı

Luca'nın ürün sayfalarında **belge saklama** tarafı şu maddelerle temsil edilir:

- **Koza:** *"SMMM'ler ve müşterilerinin entegre çalışması; tüm işlemlerin tek ekrandan
  muhasebeleştirilmesi, Luca Koza'dan muhasebe fişine erişim, **belge üzerinden muhasebe fişi
  iptali**"* (`docs/plan-erp/02-LUCA-ENVANTERI.md:46-47`) — belgenin kayda bağlı olması ve belgeden
  işlem yapılması.
- **Luca Net:** *"Sigortaya konu ürünlerin stok kalemi olarak açılması; sigorta ettiren/sigortalı/
  poliçe/ödeme yönetimi takibi"* (`02-LUCA-ENVANTERI.md:41`) — poliçe takibi (bizde filo belgesi
  tarafı).
- **e-Dönüşüm saklama hizmetleri** (`/Sayfa/-e-–-donusum-saklama-hizmetleri/29`) ve **Nette Arşiv**
  (`02-LUCA-ENVANTERI.md:76`) — belge saklama hizmeti.
- **e-Defter** (`/Sayfa/luca-e-defter-uyeligi/26`) ve **e-SMM** (`/Sayfa/esmm/66`)
  (`02-LUCA-ENVANTERI.md:75`) — muhasebe belgelerinin saklanması.
- **Koza:** *"İş merkezi tanımı… gelir-gider türleri tanımlanır"* (`:59`) — belgenin merkeze
  bağlanması.
- **Luca Net:** *"Excel ile veri aktarımı: cari kartlar, stok kartları, çek-senet tanımları,
  faturalar, yevmiye fişleri, banka ekstreleri"* (`:28-29`) — belge **içe aktarma** tarafı.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> ve
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'da belge arşivinin kapsamı: hangi kayda hangi belge türü bağlanıyor, sürüm
tutuluyor mu — kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da OCR ile alan çıkarımı
var mı, hangi alanlar — kaynak: Luca ürün sayfası/satıcı. **doğrulanacak:** Luca'nın e-Dönüşüm
saklama hizmetinin kapsamı, saklama süresi ve ücreti — kaynak: Luca satıcı + mali müşavir.
**doğrulanacak:** Luca'da dosya boyutu limiti ve kabul edilen dosya türleri — kaynak: Luca teknik
dokümanı. **doğrulanacak:** Luca'da belge silme/imha yetkisi ve kaydı — kaynak: Luca kılavuzu.
**doğrulanacak:** Luca Net One'da belge arşivi kapsamı (`02-LUCA-ENVANTERI.md:13`, içerik okunmadı).

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Depolama soyutlaması hazır ve iki uygulaması var.** `server/YesLojistik.Core/Abstractions/IFileStorage.cs:3-8`:
  `SaveAsync`, `OpenAsync`, `DeleteAsync`. Uygulamalar: `LocalFileStorage` (disk/Docker volume —
  `server/YesLojistik.Infrastructure/Services/LocalFileStorage.cs:6-37`, yol kaçışı denetimi `:10-16`)
  ve `DatabaseFileStorage` (PostgreSQL `stored_files` —
  `server/YesLojistik.Infrastructure/Services/DatabaseFileStorage.cs:9-30`; gerekçe `:8`: "Kalıcı disk
  olmayan ortamlarda (Render) dosyalar kaybolmaz"). Seçim `Yedekleme:Storage` ayarıyla yapılır:
  `server/YesLojistik.Infrastructure/DependencyInjection.cs:52-56` (`Local` → `LocalFileStorage`,
  aksi hâlde `DatabaseFileStorage`; varsayılan veritabanı). **S3 uyumlu sağlayıcı yoktur**; bu modül
  üçüncü bir uygulama ekler.
- **Sevkiyat eki:** varlık `TripAttachment.cs:4-16`; iş kuralları
  `server/YesLojistik.Infrastructure/Services/AttachmentService.cs:10-76`: türler `Photo`, `Document`,
  `Signature` (`server/YesLojistik.Core/Entities/Enums.cs:5`); **boyut tavanı 10 MB**
  (`AttachmentService.cs:12`, hata metni `:25`); **içerikten tür saptama** (uzantıya güvenilmez):
  `Sniff` metodu `:65-72` yalnız JPEG, PNG, WEBP ve PDF kabul eder (hata metni `:30`); depolama yolu
  `trips/{tripId}/{guid}{ext}` (`:32`); dosya adı 200 karaktere kısaltılır (`:41`);
  çevrimdışı çift yüklemeyi önleyen `ClientRequestId` (`:21-22`, `:42`); silme **soft delete**
  (`:59`) + depodan silme (`:61`).
- **Sevkiyat eki uçları.** `server/YesLojistik.Api/Controllers/AttachmentsController.cs:12-36`:
  liste `:12-13`, yükleme `:15-22` (`[RequestSizeLimit(12 * 1024 * 1024)]` `:16`; tür ve not
  `:17-18`), indirme/görüntüleme `:24-29` (`download` sorgusu `:25`), silme `:31-36`.
- **Filo ve firma belgesi:** varlık `FleetDocument.cs:4-16` (`OwnerType`, `OwnerId`, `Type`, `No`,
  `IssueDate`, `ExpiryDate`, `FilePath`, `FileContentType`, `Note`); tür listesi
  `DocumentType` (`Enums.cs:52-57`); iş kuralları
  `server/YesLojistik.Infrastructure/Services/FleetService.cs:15-103`: liste `:15-22` (bitiş tarihine
  göre sıralı), tek belge `:24-28`, DTO üretimi ve **kalan gün** hesabı `:30-44`, kaydetme/doğrulama
  `:46-68`, silme `:70-75`, **dosya kaydetme** `:77-94` (10 MB tavanı `:81`, içerik saptama `:84-85`,
  yol `documents/{id}/{guid}{ext}` `:87`, eski dosya silinir `:93`), dosya açma `:96-103`.
  Belge türü Türkçe etiketleri `:193-207` (Ruhsat, Trafik Sigortası, Kasko, Muayene, K Belgesi,
  Takograf Kalibrasyonu, Egzoz Emisyon, Ehliyet, SRC, Psikoteknik, Sağlık Raporu).
- **Filo belgesi uçları.** `server/YesLojistik.Api/Controllers/FleetController.cs:15-61`:
  liste `:19-21`, tek `:23-24`, oluştur/düzenle/sil `:26-42` (`Operations` yetkisi), dosya yükleme
  `:44-53` (`[RequestSizeLimit(12 * 1024 * 1024)]` `:47`), dosya açma `:55-60`.
- **Alınan fatura dosyası.** Varlıkta alanlar `server/YesLojistik.Core/Entities/PurchaseInvoice.cs:25-26`;
  uçlar `server/YesLojistik.Api/Controllers/PurchaseInvoicesController.cs:76-92`: yükleme
  `:77-85` (`Accounting` yetkisi `:77`, 12 MB istek tavanı `:79`), dosya açma `:87-92`.
  Fatura Excel'inde dosya sütunu yoktur (`:30-40`).
- **Belge bitiş uyarısı hazır.** `server/YesLojistik.Infrastructure/Services/AlertService.cs:48`
  bitiş tarihi yaklaşan belgeleri tarar; uyarı üretimi `:29`; menü sayacı
  `client/src/lib/nav.ts:44` (şoför belgesi), `:51` (araç belgesi), `:63` (firma belgesi).
- **Arayüz: belge paneli ve sevkiyat ekleri.** `client/src/components/FleetPanels.tsx:45-89`
  `DocumentsPanel`: tablo (Belge, No, Bitiş, Dosya, işlemler) `:62-81`, "Belge Ekle" `:58`,
  dosyayı açma `:70-71`, silme onayı `:84-86`; form `:91-135`: tür seçimi (çipli) `:117-121`, no
  `:122`, veriliş tarihi `:123`, bitiş tarihi ve hızlı seçenekler (1/2/5/10 yıl) `:124-126`, not
  `:127`, **dosya seçici** `:128-130` (`accept="image/jpeg,image/png,image/webp,application/pdf"`),
  kaydetmeden önce **istemci tarafı sıkıştırma** `:104-107` (`compressImage`,
  `client/src/lib/image.ts:8`). Sevkiyat ekleri: `client/src/components/TripExtras.tsx:13-57`
  (tür seçimi `:46-48`, not `:49-51`, çoklu dosya `:52`, yükleme `:54`), liste ve önizleme `:57-69`,
  indirme `:73`, silme `:82`; bilgi metni "JPEG, PNG, WEBP veya PDF · en fazla 10 MB. Şoförler teslim
  fotoğraflarını mobil uygulamadan yükler." `:56`.
- **Telefondan kamera zaten kullanılıyor (şoför uygulaması).**
  `mobile/src/lib/photos.ts:8-21`: kamera/galeri izni ister (`:9-13`), `launchCameraAsync` /
  `launchImageLibraryAsync` (`:15`), fotoğrafı küçültür (en uzun kenar 1600 px — `:7`, `:18`),
  MIME ve ad üretir (`:19-20`). Yani **kamera ile belge çekme deseni projede vardır**; ofis panelinde
  henüz bağlı değildir.
- **Arşiv arama için örnek desen var.** Müşteri Excel'inde tarih ve metin aramaları, sunucu tarafı
  `ILIKE` ile yapılır: `server/YesLojistik.Api/Controllers/CustomersController.cs:28-32`;
  kaçışlama `server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:46-49`; sayfalama
  `:23-31`; güvenli sıralama `:13-21`.
- **Yetki politikaları.** `server/YesLojistik.Api/Auth/Policies.cs:5-17`: `Operations` (sevkiyat,
  araç, şoför belgeleri), `Accounting` (fatura ve mali belgeler), `Admin` (firma belgeleri, saklama
  ayarları).
- **Ayna ve lisans.** Dosya yükleme yazma sayılır; ayna modunda gizlenir. Aynada okuma (görüntüleme,
  indirme) çalışır (`client/src/components/Exports.tsx:8-11` deseni). Lisans süresi dolduğunda
  yükleme/silme kapanır, görüntüleme kalır (`01-ORTAK-SARTNAME.md:16-18`).
- **Veri sıfırlama dosyaları da temizler.** `server/YesLojistik.Infrastructure/Services/DataResetService.cs:16`
  ve `:31` (belge dosya yolları toplanır) — yani dosya yaşam döngüsü için mevcut desen vardır.
- **Tam veri yedeği.** `server/YesLojistik.Api/Controllers/DataExportController.cs:33-45`;
  dosya listesi `server/YesLojistik.Api/Infrastructure/DataExportService.cs:24-29`. **Belge
  dosyalarının kendisi ZIP'e girmez**; yalnız tablo verileri CSV olur.

**Olmayanlar (kanıtlı).**

- **Tek belge arşivi yok.** Üç kaynak (`TripAttachment`, `FleetDocument`, `PurchaseInvoice.FilePath`)
  ayrı tablolardadır; `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içinde ortak bir
  `Document`/`ArchiveItem` tablosu yoktur. Aynı belge iki yere yüklenirse iki kopya olur.
- **Etiket, sürüm ve geçmiş yok.** Hiçbir belge tablosunda `Version`, `ReplacedBy`, `Tags`,
  `Amount`, `Currency` alanı yoktur (`TripAttachment.cs:4-16`, `FleetDocument.cs:4-16`).
- **Tutar alanı yok.** Belgeye tutar yazılamaz; bu yüzden "belge tutarıyla fatura tutarını karşılaştır"
  kontrolü yapılamaz.
- **OCR yok.** Kodda OCR, metin çıkarımı, PDF metin okuma bileşeni geçmez; hiçbir paket buna işaret
  etmez.
- **Saklama süresi ve imha akışı yok.** `FleetDocument` yalnız `ExpiryDate` taşır
  (`FleetDocument.cs:12`) — bu belgenin **geçerlilik bitişi**dir, **saklama süresi** değildir.
  Kodda imha/anonimleştirme işi yoktur.
- **KVKK akışı belge düzeyinde yok.** Panelde gizlilik ve veri indirme sayfası vardır
  (`client/src/pages/PrivacyPage.tsx`, `client/src/pages/DataExportController` karşılığı
  `DataExportController.cs:33-45`), ama **belge bazlı** erişim kısıtı, veri sahibi talebine göre
  belge seçme/silme yoktur.
- **S3 uyumlu depolama yok.** `DependencyInjection.cs:52-56` yalnız iki sağlayıcı tanır.
- **Toplam kota ve kullanım göstergesi yok.** Boyut tavanı belge başına 10 MB'dir
  (`AttachmentService.cs:12`, `FleetService.cs:81`), ama toplam depolama kotası, kalan alan,
  kullanıcı/şirket başına sınır yoktur.
- **Mükerrer dosya denetimi yalnız mobil kuyruğunda vardır.** `ClientRequestId` çevrimdışı mobil
  çift yüklemeyi engeller (`AttachmentService.cs:21-22`); **içerik parmak izi (hash)** ile mükerrer
  denetimi yoktur.
- **Belge arama ekranı yok.** `DocumentsPanel` yalnız bir sahibin (araç/şoför/firma) belgelerini
  listeler (`FleetPanels.tsx:50`); tür/tarih/tutar/etiket ile **tüm arşivde** arama yoktur.
- **Sürüm karşılaştırma yok.** Yeni dosya yüklenince eskisi **silinir**
  (`FleetService.cs:93`, `:86-93`), yani eski sürüm kaybolur.
- **Faturaya dosya ekleme ekranı eksik görünüyor.** Uç vardır
  (`PurchaseInvoicesController.cs:76-92`) ama satış faturası tarafında
  (`server/YesLojistik.Api/Controllers/InvoicesController.cs:15-83`) dosya ucu **yoktur**; satış
  faturasında yalnız PDF üretimi vardır (`:61`).
- **Telefondan (ofis) belge yükleme yok.** Kamera deseni yalnız şoför uygulamasındadır
  (`mobile/src/lib/photos.ts:8-21`); ofis paneli `accept` ile dosya seçtirir
  (`FleetPanels.tsx:129`), doğrudan kamera yakalama (`capture`) yoktur.

**Eksik listesi:** ortak belge arşivi tablosu, tür ve alt tür sözlüğü, etiket, tutar/para birimi,
sürüm ve geçmiş, OCR ve onaylı alan aktarımı, tür bazlı saklama süresi ve imha akışı, KVKK erişim
kısıtı ve veri sahibi talebi akışı, S3 uyumlu depolama sağlayıcısı, toplam kota ve kullanım
göstergesi, mükerrer denetimi (hash), belge arama ekranı, belge detayı ve önizleme, ofis panelinden
kamera ile yükleme, satış faturasına dosya ucu.

## 4. Hedef ekranlar ve alanlar

### 4.1 Ekranlar

- `/belgeler` — **Belge Arşivi**: `FilterBar` + `DataTable` (masaüstü) / `MobileCards` (telefon).
  Kolonlar: küçük önizleme, dosya adı, tür, etiketler, bağlı kayıt (fatura/sevkiyat/araç/cari),
  tarih, tutar, sürüm, yükleyen, boyut. Süzgeçler: tür, alt tür, tarih aralığı, etiket, tutar
  aralığı, bağlı kayıt türü, yükleyen, dosya adı, "süresi yaklaşan", "saklama süresi dolan".
  Üstte `TotalsStrip`: belge sayısı, toplam boyut, tutar toplamı.
- `/belgeler/:id` — **Belge Detayı** (yeni görünümde `DetailDrawer`, klasikte `Modal`): solda
  önizleme (görsel/PDF), sağda meta bilgiler, **Sürümler** listesi, **Bağlantılar** listesi,
  **Etiketler**, **OCR alanları** (onay kutularıyla), **Geçmiş** (kim, ne zaman, ne yaptı),
  işlemler (İndir · Yeni sürüm yükle · Bağlantı ekle/kaldır · Etiket düzenle · Sil).
- `/belgeler/yukle` — **Hızlı Yükleme** (telefonda tam ekran): kamera/galeri seçimi, çoklu dosya,
  tür seçimi, bağlanacak kayıt arama (fatura no, sevkiyat no, plaka, cari ünvan), etiket, not,
  "OCR ile alanları doldur" anahtarı.
- Kayıt kartlarındaki **Belgeler** sekmesi: mevcut `DocumentsPanel` (`FleetPanels.tsx:45-89`)
  genişletilir; sevkiyat penceresindeki ekler bölümü (`TripExtras.tsx:13-57`) korunur ve aynı
  arşive yazar.
- **Belge Türleri** ayarı (`/ayarlar` altında): tür listesi, zorunlu alanlar, saklama süresi
  (yıl/ay), erişim rolü, "imha onayı gerekli" anahtarı. Yönetici yetkisi.

### 4.2 Alanlar

| Alan | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Dosya | dosya (çoklu) | evet | Masaüstü: seç/drag-drop; telefon: kamera/galeri; JPEG, PNG, WEBP, PDF | "Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir." (mevcut metin, `AttachmentService.cs:30`) |
| Belge türü | seçim | evet | Tür seçilince zorunlu alanlar açılır | "Belge türünü seçin." |
| Alt tür | seçim | koşullu | Ör. Fatura → Satış / Alış / İade | — |
| Belge tarihi | tarih | evet | Varsayılan: bugün; OCR önerisi | — |
| Belge no | metin (60) | koşullu | Fatura no, çek no, poliçe no; OCR önerisi | — |
| Tutar | tutar (2 kuruş) | koşullu | Fatura/çek/sözleşmede zorunlu | "Tutar 0'dan büyük olmalı." |
| Para birimi | seçim: TL / USD / EUR | koşullu | Varsayılan TL | — |
| Etiketler | çoklu metin | hayır | En fazla 10 etiket, her biri 30 karakter | "En fazla 10 etiket ekleyebilirsiniz." |
| Bağlı kayıt | arama + seçim | hayır (önerilir) | Fatura, sevkiyat, araç, şoför, cari, çek-senet, personel, sabit kıymet; birden çok | "Bağlanacak kaydı seçin." |
| Not | metin (500) | hayır | — | — |
| Gizlilik düzeyi | seçim: Normal / Kısıtlı / Gizli | evet | "Kısıtlı": yalnız `Accounting`; "Gizli": yalnız yükleyen + admin | "Bu belgeyi görme yetkiniz yok." |
| Saklama süresi | salt okunur | — | Türden gelir; kullanıcı değiştiremez (admin ayarı) | — |
| OCR ile doldur | anahtar | hayır | Alanlar **öneri** olarak gelir; kullanıcı onaylar | "Okunan alanları kontrol edin." |
| Sürüm notu | metin (200) | hayır | Yeni sürümde ne değişti | — |
| İmha onayı | onay kutusu | koşullu | Süresi dolan belge imhasında zorunlu (admin) | "İmha için onay gerekli." |

### 4.3 Belge türleri ve bağlanacak kayıtlar

| Tür | Zorunlu alanlar | Bağlanabileceği kayıt | Saklama süresi |
|---|---|---|---|
| Satış faturası | tarih, no, tutar | Fatura (satış), sevkiyat, cari | **doğrulanacak** (avukat/mali müşavir) |
| Alış faturası | tarih, no, tutar | Alınan fatura, tedarikçi, sevkiyat | **doğrulanacak** |
| İrsaliye | tarih, no | Sevkiyat, cari | **doğrulanacak** |
| Teslim evrakı / imzalı irsaliye | tarih | Sevkiyat | **doğrulanacak** |
| Çek / senet (görüntü) | tarih, no, vade, tutar | Çek-senet (ödeme), cari | **doğrulanacak** |
| Sözleşme | tarih, taraf | Cari, araç, personel | **doğrulanacak** |
| Araç ruhsatı | tarih, plaka | Araç | **doğrulanacak** |
| Sigorta poliçesi (trafik/kasko) | poliçe no, başlangıç, bitiş, tutar | Araç | **doğrulanacak** |
| Muayene / K belgesi / takograf | tarih, bitiş | Araç | **doğrulanacak** |
| Ehliyet / SRC / psikoteknik / sağlık raporu | tarih, bitiş | Şoför | **doğrulanacak** |
| Personel sözleşmesi / bordro | tarih | Personel | **doğrulanacak** |
| Kasa/banka dekontu | tarih, tutar | Kasa/banka hesabı, cari | **doğrulanacak** |
| Diğer | tarih | herhangi | **doğrulanacak** |

Filo belgesi türlerinin Türkçe etiketleri **hazırdır** (`FleetService.cs:193-207`); bu tablo o
listeyi korur ve üzerine ticari belge türlerini ekler. Araç/şoför belgelerinin **geçerlilik bitişi**
`FleetDocument.ExpiryDate` ile izlenir ve uyarı üretir (`AlertService.cs:48`); bu davranış
bozulmaz.

## 5. İş kuralları

1. **Tek arşiv, çok bağ.** Bütün belgeler tek `DocumentArchive` tablosunda tutulur; bağlantılar
   `DocumentLink` ile kurulur ve bir belge **birden çok** kayda bağlanabilir (1-N). Mevcut
   `TripAttachment`, `FleetDocument` ve alınan fatura dosyası **korunur**; yeni arşiv yazılırken
   bunlara **gölge kayıt** (aynı dosyaya işaret eden bağ) oluşturulur, böylece eski ekranlar
   çalışmaya devam eder. Geçiş sırasında dosya **kopyalanmaz** (aynı `StoragePath` paylaşılır).
2. **Boyut ve tür limitleri.** Belge başına en fazla **10 MB** (mevcut kural:
   `AttachmentService.cs:12`, `FleetService.cs:81`); istek gövdesi en fazla **12 MB**
   (`AttachmentsController.cs:16`, `FleetController.cs:47`, `PurchaseInvoicesController.cs:79`).
   Kabul edilen türler **içerikten** saptanır ve yalnız JPEG, PNG, WEBP, PDF olur
   (`AttachmentService.cs:65-72`); uzantıya güvenilmez. ZIP, Office belgesi, e-posta (`.eml`) ve
   çalıştırılabilir dosya **reddedilir**.
3. **Depolama sağlayıcısı.** Mevcut iki sağlayıcı korunur (`DependencyInjection.cs:52-56`) ve
   üçüncüsü eklenir: **S3 uyumlu** (`S3FileStorage`). Seçim ayar ile yapılır
   (`Yedekleme:Storage` = `Database` / `Local` / `S3`). Aynı belge farklı sağlayıcıya taşınırsa
   taşıma işi **arka planda** yapılır ve ilerleme yöneticiye gösterilir. **Sağlayıcı değişince
   mevcut dosyalar okunmaya devam etmelidir**; yeni yüklemeler yeni sağlayıcıya gider.
4. **Yol güvenliği.** Depolama yolu `belgeler/{yıl}/{ay}/{guid}{ext}` biçimindedir; kullanıcı
   dosya adı yolu etkilemez (`Path.GetFileName`, mevcut desen `AttachmentService.cs:36`).
   Yerel sağlayıcıda kök dışına çıkış engellenir (mevcut denetim:
   `LocalFileStorage.cs:10-16`).
5. **Sürüm kuralı (bu modülün en önemli değişikliği).** Bugün yeni dosya eskisini **siler**
   (`FleetService.cs:93`). Yeni kural: aynı belgeye yeni dosya yüklenince **eski sürüm saklanır**;
   `DocumentArchive.CurrentVersionId` güncellenir, eski sürüm `DocumentVersion` olarak kalır. Her
   sürümde yükleyen, tarih ve sürüm notu tutulur. **Sürüm silinemez**, yalnız belge arşivlenir.
6. **Mükerrer denetimi.** Dosyanın **SHA-256** parmak izi hesaplanır; aynı parmak izi aynı şirkette
   varsa kullanıcıya "Bu dosya arşivde var: {tür} – {tarih}. Yine de yüklensin mi?" sorulur.
   Zorla yükleme izinlidir (ör. aynı PDF farklı kayda bağlanacaksa) ama bağ kurulurken mevcut kayıt
   kullanılır; **ikinci kopya depolanmaz**.
7. **OCR kuralı (sınırı açık).** OCR **öneri** üretir; hiçbir alan kullanıcı onayı olmadan kayda
   yazılmaz. OCR yalnız şu alanları hedefler: fatura no, belge tarihi, VKN/TCKN, toplam tutar, KDV
   tutarı, çek no, vade tarihi, poliçe no. Okunan değer ile kullanıcının yazdığı değer farklıysa
   **ikisi de görünür** ve kullanıcı seçer. OCR başarısız olursa belge yine yüklenir (OCR zorunlu
   değildir). **OCR sağlayıcısı ve dil desteği doğrulanacaktır** (§12); sağlayıcı seçilene kadar OCR
   kapalıdır ve kod yolu **kapalı anahtar** arkasında gelişir.
8. **Arama kuralı.** Arama sunucu tarafındadır (`ILIKE` deseni: `QueryExtensions.cs:46-49`); sayfa
   boyutu en fazla 500 (`:9`), dışa aktarma 20.000 (`:11`). Arama alanları: dosya adı, belge no,
   etiket, not, bağlı kaydın numarası/plakası/ünvanı. Tutar aramasında **aralık** kullanılır
   (`minAmount`/`maxAmount`), tek tutar eşitliği değil (kuruş farkı yüzünden).
9. **Saklama süresi ve imha.** Her tür için saklama süresi **ayar tablosundan** gelir (varsayılanlar
   §4.3'te `**doğrulanacak**` olarak işaretlidir; avukat/mali müşavir onayı olmadan kesin sayı
   yazılmaz). Süre dolduğunda belge **silinmez**; "İmha bekliyor" listesine düşer, yönetici onayıyla
   **imha kaydı** açılır ve dosya depodan silinir. İmha işlemi geri alınamaz ve `AuditLog`'a yazılır;
   imha kaydının kendisi (kim, ne zaman, hangi belge no, hangi tür) **saklanır** (ör. 10 yıl —
   `**doğrulanacak**`).
10. **KVKK kuralları.** (a) Kişisel veri içeren belgeler (kimlik, ehliyet, sağlık raporu, sözleşme)
    `PrivacyLevel` ile işaretlenir ve erişim role göre kısıtlanır. (b) Veri sahibi talebi geldiğinde
    ilgili kişiye bağlı belgeler **tek ekranda** listelenir, dışa aktarılabilir ve silinebilir
    (silme = arşivleme + depodan silme + imha kaydı). (c) Belge içeriği **log'a yazılmaz**; log
    yalnız "kim, ne zaman, hangi belgeyi gördü/indirdi" bilgisini tutar. (d) Yurt dışına aktarım
    (S3 bölgesi) **avukat onayına bağlıdır**; onay yoksa S3 sağlayıcısı yurt içi bölge ile
    yapılandırılır (**doğrulanacak**).
11. **Erişim kuralı.** Görüntüleme ve indirme rol ile belge `PrivacyLevel`'ının **kesişimi**dir:
    `Normal` → ofis rolleri; `Kısıtlı` → `Accounting` + `Admin`; `Gizli` → yükleyen + `Admin`.
    Şoför rolü yalnız kendi sevkiyatının eklerini görür (mevcut davranış:
    `server/YesLojistik.Api/Controllers/DriverController.cs` kapsamı) ve şoför uygulamasından
    yalnız **fotoğraf** yükleyebilir (PDF yükleyemez).
12. **Kota kuralı.** Şirket başına toplam depolama kotası ayarlanır (**doğrulanacak:** sayı).
    Kullanım %80'e gelince yöneticiye uyarı, %100'de yeni yükleme **engellenir** ("Depolama alanı
    doldu. Eski belgeleri arşivleyin ya da paketi yükseltin."). Mevcut belgeler silinmez.
13. **Denetim kuralı.** Yükleme, indirme, görüntüleme, sürüm ekleme, bağ ekleme/kaldırma, etiket
    değişikliği, gizlilik düzeyi değişikliği, arşivleme ve imha `AuditLog`'a yazılır
    (`server/YesLojistik.Core/Entities/AuditLog.cs:4`). İndirme kaydı **kişi bazlıdır**.
14. **Ayna ve lisans.** Ayna modunda yükleme/silme düğmeleri `write` işaretlidir ve gizlenir;
    görüntüleme/indirme çalışır. Lisans süresi dolduğunda yükleme kapanır, görüntüleme kalır
    (`01-ORTAK-SARTNAME.md:16-18`).

## 6. Veri modeli

**Yalnız ekleme.** Yeni tablolar:

- `DocumentArchive` — belgenin kimliği ve güncel durumu. `Id`, `Title` (kullanıcıya görünen ad;
  boşsa dosya adı), `Type` (`ArchiveDocumentType` enum), `SubType` (`string?`), `DocumentNo`,
  `DocumentDate` (`DateOnly?`), `Amount` (`decimal?`), `Currency` (`string?`, varsayılan `TRY`),
  `PrivacyLevel` (`DocumentPrivacy`: Normal/Restricted/Confidential), `CurrentVersionId` (`int?`),
  `OcrJson` (`string?`, çıkarılan alanlar ve güven puanı), `OcrConfirmedByUserId` (`int?`),
  `OcrConfirmedAt`, `RetentionUntil` (`DateOnly?`), `Status`
  (`DocumentStatus`: Active/Archived/PendingDisposal/Disposed), `UploadedByUserId`, `Note`,
  `OwnerCompanyId` (`int?`, çok şirketli yapı için).
- `DocumentVersion` — sürüm. `Id`, `DocumentArchiveId`, `VersionNo` (`int`), `FileName`,
  `ContentType`, `Size` (`long`), `StorageProvider` (`string`: Database/Local/S3), `StoragePath`,
  `Sha256` (`string`, 64 karakter), `UploadedByUserId`, `UploadedAt`, `Note` (`string?`),
  `IsCurrent` (`bool`).
- `DocumentLink` — kayda bağ. `Id`, `DocumentArchiveId`, `TargetType`
  (`DocumentTargetType`: Invoice, PurchaseInvoice, Trip, Vehicle, Driver, Customer, Supplier,
  CashAccount, Instrument, Staff, Asset), `TargetId` (`int`), `LinkedByUserId`, `LinkedAt`,
  `Note`. Aynı belge–hedef çifti **benzersizdir**.
- `DocumentTag` — etiket. `Id`, `DocumentArchiveId`, `Name` (30). `Name` + belge benzersiz.
- `DocumentTypeSetting` — tür ayarı. `Id`, `Type`, `RequiresAmount`, `RequiresDocumentNo`,
  `RequiresExpiryDate`, `RetentionMonths` (`int?`), `AccessRole` (`string?`),
  `DisposalNeedsApproval` (`bool`), `IsActive`.
- `DocumentAuditEntry` — belge olayı. `Id`, `DocumentArchiveId`, `DocumentVersionId` (`int?`),
  `Action` (`string`: Uploaded/Viewed/Downloaded/VersionAdded/LinkAdded/LinkRemoved/TagChanged/
  PrivacyChanged/Archived/DisposalRequested/Disposed), `UserId`, `UserName`, `At`, `Detail`
  (`string?`). **İçerik saklanmaz.**

**Mevcut tablolara eklenen alanlar (hepsi boş olabilir):**

- `TripAttachment` → `DocumentArchiveId` (`int?`) — mevcut ekler arşive bağlanır; eski alanlar
  korunur (`TripAttachment.cs:4-16`).
- `FleetDocument` → `DocumentArchiveId` (`int?`) — aynı desen (`FleetDocument.cs:4-16`).
- `PurchaseInvoice` → `DocumentArchiveId` (`int?`) — mevcut `FilePath`/`FileContentType` korunur
  (`PurchaseInvoice.cs:25-26`).
- `CompanySettings` → `StorageQuotaBytes` (`long?`), `DocumentRetentionOverrideMonths` (`int?`).

**Saklanan dosya kaydı.** `StoredFile` tablosu mevcut ve yeterlidir
(`server/YesLojistik.Core/Entities/StoredFile.cs:4`: `Path`, `Content`, `Size`, `CreatedAt`);
`DatabaseFileStorage` bunu kullanır (`DatabaseFileStorage.cs:18`). Yeni alan gerekmez.

İlişkiler: `DocumentArchive` → `DocumentVersion` (1-N, `CurrentVersionId` güncel sürümü gösterir),
→ `DocumentLink` (1-N), → `DocumentTag` (1-N), → `DocumentAuditEntry` (1-N).
`DocumentLink.TargetType`/`TargetId` polimorfiktir; **yabancı anahtar kurulmaz** (mevcut desen:
`FleetDocument.OwnerType`/`OwnerId`, `FleetDocument.cs:6-8`), bütünlük uygulama katmanında
doğrulanır.

İndeksler: `DocumentArchive(Type, DocumentDate)`, `DocumentArchive(DocumentNo)`,
`DocumentArchive(Status, RetentionUntil)`, `DocumentArchive(OwnerCompanyId)`,
`DocumentVersion(DocumentArchiveId, VersionNo)` benzersiz, `DocumentVersion(Sha256)`,
`DocumentLink(TargetType, TargetId)`, `DocumentLink(DocumentArchiveId, TargetType, TargetId)`
benzersiz, `DocumentTag(Name)`, `DocumentAuditEntry(DocumentArchiveId, At)`.

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/documents/archive` | `ArchiveQuery` (tür, alt tür, tarih, etiket, tutar aralığı, hedef tür/id, yükleyen, arama, sayfa, sıralama) | `PagedResult<ArchiveItemDto>` | giriş yapmış (gizlilik süzgeci uygulanır) |
| GET | `/api/documents/archive/totals` | `ArchiveQuery` | `ArchiveTotalsDto` (adet, toplam boyut, tutar toplamı) | giriş yapmış |
| GET | `/api/documents/archive/{id}` | — | `ArchiveDetailDto` (meta + sürümler + bağlar + etiketler + OCR) | gizlilik kuralı |
| POST | `/api/documents/archive` | çok parçalı: dosyalar + meta (`type`, `subType`, `documentNo`, `documentDate`, `amount`, `currency`, `privacyLevel`, `note`, `tags`, `links`) | `ArchiveItemDto[]` | operations / accounting (türe göre) |
| PUT | `/api/documents/archive/{id}` | meta güncelleme | `ArchiveDetailDto` | yükleyen / admin |
| POST | `/api/documents/archive/{id}/versions` | dosya + sürüm notu | `ArchiveDetailDto` | yükleyen / admin |
| GET | `/api/documents/archive/{id}/versions/{versionId}/file` | `download?` | dosya akışı | gizlilik kuralı |
| GET | `/api/documents/archive/{id}/file` | `download?` | güncel sürüm akışı | gizlilik kuralı |
| POST | `/api/documents/archive/{id}/links` | `{ targetType, targetId, note? }` | `ArchiveDetailDto` | operations / accounting |
| DELETE | `/api/documents/archive/{id}/links/{linkId}` | — | `204` | operations / accounting |
| PUT | `/api/documents/archive/{id}/tags` | `string[]` | `ArchiveDetailDto` | yükleyen / admin |
| PUT | `/api/documents/archive/{id}/privacy` | `{ privacyLevel }` | `ArchiveDetailDto` | admin |
| POST | `/api/documents/archive/{id}/ocr` | `{ apply: false }` | `OcrResultDto` (alanlar + güven) | operations / accounting |
| POST | `/api/documents/archive/{id}/ocr/confirm` | `{ fields }` | `ArchiveDetailDto` | operations / accounting |
| POST | `/api/documents/archive/{id}/archive` | — | `204` | admin |
| POST | `/api/documents/archive/{id}/dispose` | `{ confirm: true, note? }` | `DisposalDto` | admin + onay |
| GET | `/api/documents/disposal` | `from,to,page,pageSize` | `PagedResult<DisposalDto>` | admin |
| GET | `/api/documents/duplicate` | `sha256` | `ArchiveItemDto?` | operations / accounting |
| GET | `/api/documents/type-settings` | — | `DocumentTypeSettingDto[]` | giriş yapmış |
| PUT | `/api/documents/type-settings/{type}` | ayar | `DocumentTypeSettingDto` | admin |
| GET | `/api/documents/quota` | — | `{ usedBytes, quotaBytes, percent }` | admin |
| GET | `/api/documents/export` | `ArchiveQuery` + `format=xlsx\|pdf` | dosya (belge **listesi**, dosyalar değil) | accounting / admin |
| GET | `/api/documents/subject/{targetType}/{targetId}` | `page,pageSize` | `PagedResult<ArchiveItemDto>` | gizlilik kuralı |
| POST | `/api/documents/bulk-download` | `{ ids[] }` | ZIP akışı (en fazla 200 belge) | gizlilik kuralı |
| GET | `/api/trips/{tripId}/attachments` (mevcut) | — | `AttachmentDto[]` | korunur |
| POST | `/api/trips/{tripId}/attachments` (mevcut) | dosya + tür + not | `AttachmentDto` | korunur; arşive gölge kayıt yazar |
| GET/POST/PUT/DELETE | `/api/documents[/{id}][/file]` (mevcut) | — | `DocumentDto` | korunur; arşive bağlanır |
| POST/GET | `/api/purchase-invoices/{id}/file` (mevcut) | — | — | korunur; arşive bağlanır |

Mevcut uçlar **bozulmaz**; yeni uçlar `/api/documents/archive` altında toplanır. Ayrıntı görünümü
mevcut `DocumentDto` yapısını da besler (`FleetService.cs:37-43`).

## 8. Yetki, onay ve denetim izi

| İşlem | Admin | Operations | Accounting | Driver |
|---|---|---|---|---|
| Arşiv listesi ve arama (Normal) | ✓ | ✓ | ✓ | — |
| Arşiv listesi (Kısıtlı) | ✓ | — | ✓ | — |
| Arşiv listesi (Gizli) | ✓ | yalnız kendi yüklediği | yalnız kendi yüklediği | — |
| Belge yükleme (sevkiyat/araç/şoför) | ✓ | ✓ | — | yalnız kendi sevkiyatına **fotoğraf** |
| Belge yükleme (fatura/mali) | ✓ | — | ✓ | — |
| Belge yükleme (sözleşme/personel) | ✓ | ✓ | ✓ | — |
| Yeni sürüm yükleme | ✓ | yükleyen | yükleyen | — |
| Bağ ekleme/kaldırma | ✓ | ✓ | ✓ | — |
| Gizlilik düzeyi değiştirme | ✓ | — | — | — |
| Tür ayarı ve saklama süresi | ✓ | — | — | — |
| Kota ve depolama ayarı | ✓ | — | — | — |
| Arşivleme | ✓ | — | — | — |
| İmha talebi/onayı | ✓ | — | — | — |
| Belge denetim kayıtları | ✓ | — | — | — |

- **Onay (maker-checker).** İki yerde onay vardır: (1) **imha** — süresi dolan belge yönetici
  onayıyla imha edilir; (2) **gizlilik düzeyi yükseltme** — bir belgeyi `Gizli` yapmak tek kişinin
  kararı değildir, ikinci yönetici onayı ister. Onay kaydı `DocumentAuditEntry` ve `AuditLog`'a
  yazılır.
- **Denetim izi.** Görüntüleme ve indirme **dahil** her erişim `DocumentAuditEntry`'ye yazılır
  (kim, ne zaman, hangi belge, hangi sürüm, IP değil kullanıcı kimliği). İçerik asla loglanmaz.
  Mevcut `DataExportController.cs:37-41` deseni genişletilir.
- **Satır düzeyi güvenlik.** Sorgular kullanıcının rolü ve `PrivacyLevel` kesişimine göre sunucuda
  süzülür; kullanıcı bu süzgeci kaldıramaz. Çok şirketli yapıda `OwnerCompanyId` zorunlu süzgeçtir
  (`30-COK-SIRKETLI-KONSOLIDASYON.md`).
- **Yedek ve geri yükleme.** Belge dosyaları `Database` sağlayıcısında yedeğe **dahildir**
  (`DatabaseFileStorage.cs:8`); `Local` ve `S3` sağlayıcılarında yedek ayrıdır ve
  `36-PERFORMANS-OLCEK.md` ile RPO/RTO tanımlanır. Tam veri ZIP'i (`DataExportService.cs:24-29`)
  belge **dosyalarını içermez**; istenirse belge arşivi ayrı ZIP olarak dışa aktarılır
  (`/api/documents/bulk-download`).

## 9. Kabul kriterleri

1. Bir sevkiyatın teslim fotoğrafı **telefondan** çekilip yüklenir; yükleme ≤ 3 tık + kamera
   onayı; dosya 10 MB'ı geçerse anlaşılır hata verir (mevcut metin korunur).
2. Masaüstünde bir fatura PDF'i sürükle-bırak ile yüklenir ve **faturaya bağlanır**; bağ kurulmadan
   kaydetmek mümkündür ama ekranda "bağlanmadı" uyarısı görünür.
3. Aynı belgeye yeni sürüm yüklendiğinde **eski sürüm kaybolmaz**; sürüm listesinde iki kayıt
   görünür ve eski sürüm indirilebilir.
4. Aynı dosya (aynı SHA-256) ikinci kez yüklenmeye çalışılırsa uyarı çıkar ve depoda **ikinci kopya
   oluşmaz**.
5. Arşiv aramasında tür + tarih aralığı + etiket + tutar aralığı birlikte çalışır; sonuç
   **p95 < 700 ms** (50.000 belge test verisinde).
6. Belge listesi Excel'e iner; **belge dosyaları** yalnız seçili belgeler için ZIP olarak iner
   (en fazla 200 belge).
7. Saklama süresi dolan belge "İmha bekliyor" listesine düşer; onaysız imha **yapılamaz**; imha
   kaydı (kim, ne zaman, belge no, tür) kalıcıdır.
8. Süresi dolan araç/şoför belgesi ana sayfa uyarısında görünmeye **devam eder** (mevcut davranış
   korunur: `AlertService.cs:48`, `client/src/lib/nav.ts:44`, `:51`).
9. `Kısıtlı` belge `Operations` rolüne listede **görünmez**; doğrudan adresle denendiğinde `403`.
10. Bir belgenin görüntülenmesi ve indirilmesi `DocumentAuditEntry`'ye yazılır (10 görüntüleme + 3
    indirme → 13 kayıt).
11. OCR kapalıyken hiçbir OCR çağrısı yapılmaz; açıkken çıkarılan alan **kullanıcı onayı olmadan**
    kayda yazılmaz (test: onaysız `ocr` → belge alanı değişmez).
12. Depolama sağlayıcısı `Database` → `S3` değiştirildiğinde **mevcut belgeler okunmaya devam
    eder**; yeni yüklemeler S3'e gider.
13. 1440×900'de arşiv listesinde **≥12 satır**; 390×844'te yatay kaydırma yok, kart görünümü ve
    tam ekran yükleme akışı çalışır.
14. Mevcut uçlar bozulmaz: `AttachmentsController`, `DocumentsController`, alınan fatura dosya ucu
    ve bunların testleri (`DocumentTests`, `FleetTests`, `AttachmentSniffTests`) yeşil kalır.

## 10. Testler

**Sunucu (birim).**
`server/YesLojistik.Tests/Unit/AttachmentSniffTests.cs` (**mevcut**, korunur): içerikten tür saptama
(`AttachmentService.cs:65-72`).
`server/YesLojistik.Tests/Unit/DocumentTypeRulesTests.cs` (yeni): tür → zorunlu alan matrisi;
saklama süresi hesabı; `RetentionUntil` sınırı; gizlilik düzeyi → rol kesişimi.
`server/YesLojistik.Tests/Unit/DocumentHashTests.cs` (yeni): SHA-256 hesabı, aynı içerik → aynı
parmak izi, farklı içerik → farklı.
`server/YesLojistik.Tests/Unit/DocumentOcrParseTests.cs` (yeni): OCR yanıtından alan ayrıştırma,
güven puanı eşiği, geçersiz tutar/tarih reddi (OCR sağlayıcısı **sahte** ile test edilir).

**Sunucu (entegrasyon).**
`server/YesLojistik.Tests/Integration/DocumentArchiveTests.cs` (yeni): yükleme (çoklu), listeleme
süzgeçleri, sayfalama zarfı (`PagedResult`), meta güncelleme, etiket, bağ ekleme/kaldırma, arşivleme.
`server/YesLojistik.Tests/Integration/DocumentVersionTests.cs` (yeni): yeni sürüm ekleme, eski
sürümün korunması ve indirilebilmesi, sürümün silinememesi, `IsCurrent` tekilliği.
`server/YesLojistik.Tests/Integration/DocumentPrivacyTests.cs` (yeni): `Kısıtlı`/`Gizli` belge
erişimi; `Operations` rolüne `403`; şoförün yalnız kendi sevkiyatını görmesi; şoförün PDF
yükleyememesi.
`server/YesLojistik.Tests/Integration/DocumentRetentionTests.cs` (yeni): süre dolumu →
"İmha bekliyor"; onaysız imha reddi; imha sonrası dosyanın depodan silinmesi ve kaydın kalması.
`server/YesLojistik.Tests/Integration/DocumentStorageTests.cs` (yeni): `Database`, `Local` ve
`S3` (sahte istemci) sağlayıcılarında yazma/okuma/silme; sağlayıcı değişiminde eski dosyanın
okunması; yol kaçışı denemesi reddi (`LocalFileStorage.cs:10-16` deseni).
`server/YesLojistik.Tests/Integration/DocumentAuditTests.cs` (yeni): görüntüleme/indirme kayıtları;
içeriğin loglanmaması.
`server/YesLojistik.Tests/Integration/DocumentQuotaTests.cs` (yeni): kota hesabı, %80 uyarısı,
%100'de yüklemenin engellenmesi ve mevcut belgelerin korunması.
Mevcut testler korunur: `server/YesLojistik.Tests/Integration/DocumentTests.cs`,
`server/YesLojistik.Tests/Integration/FleetTests.cs` (`:94` belge bitiş uyarısı),
`server/YesLojistik.Tests/Integration/DataExportTests.cs`,
`server/YesLojistik.Tests/Integration/DataResetTests.cs`.

**Mobil (şoför uygulaması).**
`mobile/src/lib/photos.ts:8-21` korunur; belge yükleme akışı için `npm run typecheck` yeşil
kalmalıdır (`docs/plan/01-ORTAK-SARTNAME.md:172-173`). Şoför uygulamasında **yeni ekran
eklenmez**; yalnız yükleme türü ve boyut denetimi netleşir.

**Panel (e2e, Playwright).**
`client/e2e/documents.spec.ts` (yeni): belge yüklenir (dosya seçici), etiket ve bağ eklenir, arşivde
aranır, detay açılır, yeni sürüm yüklenir ve eski sürüm listede kalır; Excel listesi indirilir;
`Kısıtlı` belge operasyon kullanıcısına görünmez.
`client/e2e/documents-mobile.spec.ts` (yeni): 390×844'te arşiv kart görünümü, tam ekran yükleme
akışı ve kamera seçeneğinin varlığı; yatay kaydırma yok.
Mevcut `client/e2e/vehicles.spec.ts` ve `client/e2e/new-ui/mobile-cards.spec.ts` korunur; yeni
görünüm testleri `useNewUi(page)` ile yazılır (`client/e2e/helpers.ts:44-46`).

**Veri.** Testler uydurma veri kullanır (`01-ORTAK-SARTNAME.md` §1.3); pratikortam'dan alınmış
gerçek belge, müşteri adı veya tutar kullanılmaz.

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün | Not |
|---|---|---|
| `DocumentArchive`/`Version`/`Link`/`Tag`/`Audit` tabloları + servis | 6-8 | Mevcut üç kaynağa gölge bağ |
| Arşiv listesi, süzgeçler, toplamlar, sayfalama | 5-6 | `QueryExtensions` üzerine |
| Belge detayı, önizleme, sürüm listesi | 5-6 | Görsel/PDF önizleme |
| Hızlı yükleme (masaüstü + telefon kamera) | 4-6 | Kamera deseni mobilde hazır |
| Bağlama (fatura/sevkiyat/araç/cari) + kayıt kartı sekmeleri | 4-5 | Mevcut paneller korunur |
| Sürüm ve geçmiş davranışı (eskisini silmeyi bırakma) | 3-4 | `FleetService.cs:93` değişir |
| Mükerrer denetimi (SHA-256) | 2-3 | — |
| Arama (tür/tarih/etiket/tutar/no) | 3-4 | — |
| S3 uyumlu depolama sağlayıcısı + taşıma işi | 4-6 | Sağlayıcı ayarı ve sahte test |
| Kota ve kullanım göstergesi | 2-3 | — |
| Saklama süresi, imha akışı, onay | 4-5 | Avukat onayı bekler |
| KVKK erişim kısıtı ve veri sahibi talebi akışı | 3-4 | `35-DENETIM-IZI-KVKK-UYUM.md` ile ortak |
| Belge tür ayarları ekranı (yönetici) | 3-4 | — |
| OCR entegrasyonu (kapalı anahtar arkasında) | 4-8 | **Sağlayıcı doğrulanmadan başlamaz** |
| Denetim izi, testler, e2e | 7-9 | — |
| **Toplam** | **59-80** | OCR hariç **55-72** |

**Bağımlılık sırası:** (1) `05-VERI-MODELI.md` (ortak alanlar, çok şirketli zemin),
(2) `38-GUVENLIK.md` (dosya güvenliği, sır yönetimi, depolama anahtarları),
(3) `35-DENETIM-IZI-KVKK-UYUM.md` (saklama/imha ve erişim kısıtı), (4) `36-PERFORMANS-OLCEK.md`
(depolama kotası, yedek RPO/RTO), (5) `08-E-BELGE-KATMANI.md` (e-Fatura XML'lerinin arşive
bağlanması), (6) `11-SATIS-FATURA.md` (satış faturasına dosya ucu). OCR, sağlayıcı doğrulanana
kadar **kapalı** gelir.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Depolama dolar, panel çalışmaz hâle gelir | Kota + %80 uyarı + %100'de yükleme engeli; dışa aktarma ile arşiv boşaltma | Kota geçici yükseltilir |
| Belge kaybı (sağlayıcı değişimi, disk) | `Database` sağlayıcısı yedeğe dahil (`DatabaseFileStorage.cs:8`); S3'te sürümleme + yedek | Sağlayıcı `Database`'e geri alınır |
| Yeni sürüm eskisini siler, kanıt kaybolur | Sürüm saklama zorunlu; silme yalnız arşivleme | Değişiklik geri alınır (`FleetService.cs:93` eski davranış) |
| Kötü amaçlı dosya yüklenir (uzantı gizlenir) | İçerikten tür saptama (`AttachmentService.cs:65-72`); ZIP/Office/eml reddi; 10 MB tavanı | Yükleme yalnız yöneticiye açılır |
| KVKK ihlali: kişisel belge fazla kişiye görünür | `PrivacyLevel` + rol kesişimi; görüntüleme/indirme logu; yurt dışı aktarım onayı | Kısıtlı düzey varsayılan yapılır |
| Saklama süresi yanlış varsayılır, erken imha edilir | Süreler **ayar tablosundan**; varsayılanlar `**doğrulanacak**`; imha onayı | İmha kapatılır, süre uzatılır |
| OCR yanlış alanı kayda yazar, mali veri bozulur | OCR yalnız öneri; onay zorunlu; fark gösterilir | OCR kapatılır |
| OCR sağlayıcısı uydurulur | Sağlayıcı seçilene kadar OCR kapalı; testler sahte sağlayıcı ile | OCR kodu hiç açılmaz |
| S3 yurt dışı bölgede veri saklar | Bölge ayarı + avukat onayı; onay yoksa yurt içi bölge | S3 kapatılır, `Database` kullanılır |
| Aynı dosya onlarca kez yüklenir, yer israfı | SHA-256 mükerrer denetimi; ikinci kopya yok | Zorla yükleme yalnız admine |
| Denetim logu şişer | Log yalnız meta; içerik yok; arşivleme politikası | Görüntüleme logu kapatılır (indirme kalır) |
| `Local` sağlayıcıda dosyalar sunucu yeniden başlayınca kaybolur | Sağlayıcı seçimi ekranda uyarıyla; üretimde `Database`/`S3` önerilir | Sağlayıcı değiştirilir |

**doğrulanacak:** belge türlerinin **saklama süreleri** (fatura, irsaliye, çek, sözleşme, poliçe,
personel, sağlık raporu) — kaynak: avukat + mali müşavir; bu dokümanda **kesin sayı yazılmadı**.
**doğrulanacak:** imha kaydının saklama süresi ve imha yöntemi (yok etme tutanağı) — kaynak: avukat.
**doğrulanacak:** S3 uyumlu sağlayıcı seçimi (sağlayıcı adı, bölge, yurt dışı aktarım gerekip
gerekmediği, şifreleme ve sürümleme) — kaynak: kullanıcı + avukat. **doğrulanacak:** depolama kotası
ve fiyatlandırma (şirket başına kaç GB dahil) — kaynak: kullanıcı + iş kararı.
**doğrulanacak:** OCR sağlayıcısı, dili ve doğruluğu; bulut OCR mı, sunucu içi mi; belge içeriğinin
işlenmek üzere dışarı çıkmasının KVKK açısından durumu — kaynak: kullanıcı + avukat.
**doğrulanacak:** taranmış belgenin hukuki aslı yerine geçip geçmediği ve e-imza/zaman damgası
gereksinimi — kaynak: avukat + mali müşavir. **doğrulanacak:** Luca'nın e-Dönüşüm saklama
hizmetinin kapsamı ve bizde gerekli olup olmadığı — kaynak: Luca satıcı + mali müşavir.
**doğrulanacak:** e-Defter ve e-SMM belgelerinin arşivde nasıl saklanacağı — kaynak: mali müşavir.
**doğrulanacak:** şoförün yükleyebileceği dosya türleri (yalnız fotoğraf mı, PDF de olur mu) ve
boyut — kaynak: kullanıcı. **doğrulanacak:** belge içeriğinin aranması (tam metin arama) isteniyor
mu — kaynak: kullanıcı. **doğrulanacak:** toplu belge indirme sınırı (200 belge) yeterli mi —
kaynak: kullanıcı.

Sonraki belgeyle bağlantı: `08-E-BELGE-KATMANI.md` üretilen e-Fatura/e-Arşiv XML'lerini bu arşive
bağlar; `35-DENETIM-IZI-KVKK-UYUM.md` saklama, imha ve erişim kısıtı kurallarını,
`38-GUVENLIK.md` dosya güvenliği ve depolama anahtarlarını, `36-PERFORMANS-OLCEK.md` kota ve
yedekleme hedeflerini, `11-SATIS-FATURA.md` satış faturasına dosya ucunu tanımlar.
