# 30 — Çok Şirketli Konsolidasyon

Bu belge, panelin **tek firmadan çok firmaya** geçişini ve firmaların **konsolide** (birleşik)
görünümünü anlatır: veri modeli ve izolasyon, kullanıcı-firma yetkilendirmesi, firma değiştirme, ortak
tanımlar, firmalar arası işlem, konsolide raporlar, grup yapısı, firma kurulum/kopyalama/arşivleme ve
mevcut tek firmalı koddan geçiş planı. Ayna modu ile etkileşim ayrıca ele alınır.

## 1. Amaç ve kapsam

**Bugünkü durum.** Ürün tek firmalı: ayar tablosu tek satır varsayıyor
(`server/YesLojistik.Core/Entities/CompanySettings.cs:5`) ve fatura numarası bu tek satırdan artıyor
(`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:221-228`). Bütün depoda `CompanyId` ya
da `TenantId` alanı **yok** (`docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md:127`). Bu, ürünü satarken iki
sorun çıkarıyor: (a) aynı tüzel kişilik altında ikinci bir şirket (ör. ikinci bir nakliye şirketi ya da
şube) açılamıyor, (b) mali müşavir birden çok firmayı **tek oturumda** göremiyor
(`28-MUHASEBECI-PAKETI.md`).

**Bu belge neyi çözer.**

1. **Firma kavramı.** `Company` tablosu gelir; mevcut bütün iş tabloları boş olabilen `CompanyId`
   kazanır. Bugünkü firma tek bir satıra dönüşür, **hiçbir veri taşınmaz**.
2. **İzolasyon.** Sorgular tek noktadan firma süzgecinden geçer; unutulan tablo riski düşer.
3. **Yetkilendirme.** Kullanıcı-firma ilişkisi ve firma içi rol; firma değiştirme oturumda taşınır.
4. **Ortak tanımlar.** Hesap planı şablonu, belge serileri, para birimi ve KDV/tevkifat kodları
   firmalar arasında **paylaşılabilir** ya da kopyalanabilir.
5. **Firmalar arası işlem.** Ortak cari, yansıtma faturası, iç borç/alacak; konsolidasyonda bu işlemler
   **karşılıklı elenir**.
6. **Konsolide raporlar.** Nakit, satış, kârlılık ve mizanın grup görünümü; firmalar arası elenmiş.
7. **Grup yapısı.** Üst firma (holding) ve alt firmalar; grup içi hiyerarşi.
8. **Kurulum/kopyalama/arşivleme.** Yeni firma açma, şablon kopyalama, arşivleme (silme değil).
9. **Geçiş planı.** Üç adımlı, **ekleme-only** migration; canlı veri bozulmaz.

**Bu belge neyi çözmez.** Muhasebe çekirdeği (`06-MUHASEBE-MOTORU.md`), belge serilerinin numara
mantığı (`04-HEDEF-MIMARI.md` §5.4), mali müşavir akışı (`28-MUHASEBECI-PAKETI.md`), portal izolasyonu
(`29-MOBIL-VE-DISA-ACILIM.md`). Ayrıca **vergi/muhasebe yorumu yapılmaz**: transfer fiyatı, yansıtma
faturası ve grup içi işlemlerin vergisel sonucu **mali müşavir onayına** bağlıdır.

## 2. Luca'daki karşılığı

| Luca ürünü/özelliği | Kaynak | Bizdeki karşılığı |
|---|---|---|
| **Luca Net** — "otomatik firma kurulumu" | `docs/plan-erp/02-LUCA-ENVANTERI.md:27` | Firma kurulum ve kopyalama sihirbazı |
| **Luca Koza** — birden fazla **depo** ve depo bölümü | `02-LUCA-ENVANTERI.md:48` | Firma içi çok depo (firma değil, depo ayrımı) |
| **Luca Koza** — "iş merkezi" tanımı: birden fazla iş merkezi gelir-gider yeri olarak | `02-LUCA-ENVANTERI.md:59` | Firma içi maliyet merkezi (`17-GIDER-GELIR-MERKEZLERI.md`) |
| **Luca Koza** — ayrıntılı yetkilendirme ile iş planı | `02-LUCA-ENVANTERI.md:51` | Rol + firma + kapsam yetkilendirmesi |
| **Luca Koza** — çoklu dil | `02-LUCA-ENVANTERI.md:52` | Kapsam dışı; arayüz Türkçe (`03-KAPSAM-VE-KONUMLANDIRMA.md:52`) |
| **Luca Mali Müşavir** — SMMM'ler ve müşterilerinin entegre çalışması | `02-LUCA-ENVANTERI.md:15`, `:46` | Muhasebecinin bağlı firmaları görmesi (`28`) |

**doğrulanacak.** Luca'nın çok firmalı yapısı **gerçekten** çok tüzel kişilik mi, yoksa tek tüzel kişi
içinde çok "işletme/dönem" mi tutuyor; firmalar arası işlem (yansıtma) nasıl yapılıyor; konsolide
rapor üretiyor mu; Lucanın grup/holding desteği var mı. Kaynak: Luca demo erişimi, satış/destek ekibi
ve teknik doküman. Ayrıca **doğrulanacak:** Luca'da depo ve iş merkezinin firma sınırıyla ilişkisi
(`02-LUCA-ENVANTERI.md:48`, `:59`). Bu belge bu soruların cevabını **varsaymaz**.

## 3. Bizde bugün

Bu bölümdeki her iddia `dosya:satır` kanıtlıdır.

**Tek firmalı yapının kanıtları.**

| Bulgu | Kanıt |
|---|---|
| Ayar tablosu tek satır varsayar | `server/YesLojistik.Core/Entities/CompanySettings.cs:5` |
| Şema bu satırı sabitler ve tohumlar | `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:438-452` (`Id` `ValueGeneratedNever`, `HasData` ile `Id = 1`) |
| Fatura numarası tek satırdan, `WHERE id = 1` ile artar | `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:221-228` |
| e-Fatura serisi ayrı tabloda, önek + yıl bazlı | `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:275-279` |
| Bütün depoda `CompanyId`/`TenantId` yok | `docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md:127` |
| `CompanySettings` toplayıcı nesnesi tek kayıt döner | `server/YesLojistik.Api/Controllers/PublicController.cs:24-30` |
| Ayar okuma/yazma tek satır üzerinden | `server/YesLojistik.Api/Controllers/SettingsController.cs:1-74` |
| Marka bilgisi tek satırdan gelir | `PublicController.cs:19-22` |

**Yeniden kullanılacak altyapı taşları.**

| Taş | Ne sağlar | Kanıt |
|---|---|---|
| Global sorgu süzgeci tek noktada | Bütün `BaseEntity` türevlerine yumuşak silme süzgeci `OnModelCreating` içinde döngüyle kurulur | `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:54-60` |
| `AppDbContext` zaten "kim" bilgisini alıyor | Yapıcı `ICurrentUser?` alır | `AppDbContext.cs:8` |
| Kayıt damgaları tek noktada | `SaveChangesAsync` içinde `CreatedAt`, `UpdatedAt`, `CreatedBy`, yumuşak silme | `AppDbContext.cs:456-481` |
| `ICurrentUser` genişletilebilir | Yalnız `Id` ve `Name` var | `server/YesLojistik.Core/Abstractions/ICurrentUser.cs:3-7` |
| Uygulama bu arayüzü dolduruyor | JWT taleplerinden okur | `server/YesLojistik.Api/Auth/CurrentUser.cs:11-12` |
| Denetim izi | `AuditLog` + otomatik `AuditTrail` | `server/YesLojistik.Core/Entities/AuditLog.cs:4`, `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:9` |
| Rol/politika | Üç politika: operasyon, muhasebe, yönetici | `server/YesLojistik.Api/Auth/Policies.cs:8-17` |
| Dört yerleşik rol | `Admin`, `Operations`, `Accounting`, `Driver` | `server/YesLojistik.Core/Entities/Enums.cs:3` |
| Ayna modu yazma koruması | Yol listesine göre yazmayı reddeder | `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-28` |
| Lisans modül kapısı | `LicenseInfo.Has("...")` var ama üretim kodunda çağrılmıyor | `server/YesLojistik.Core/Licensing/LicenseInfo.cs:27-30` |
| Dosya saklama soyutlaması | `IFileStorage` + iki uygulama | `server/YesLojistik.Core/Abstractions/IFileStorage.cs:1-7` |
| Panel menüsü elle yazılı | `classicNav` ve `newNav` | `client/src/lib/nav.ts:19`, `:72` |
| Görünüm anahtarı | `DEFAULT_UI_MODE = 'classic'` | `client/src/lib/uiMode.ts:8` |

**Eksik olanlar.**

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | `Company` tablosu ve `CompanyId` sütunları | Yukarıdaki kanıt satırları; kaynak taraması boş |
| 2 | Firma süzgeci | `OnModelCreating` içinde yalnız yumuşak silme süzgeci var (`AppDbContext.cs:54-58`) |
| 3 | Kullanıcı-firma ilişkisi ve firma içi rol | `User` tablosunda böyle alan yok (`server/YesLojistik.Core/Entities/User.cs:3-32`) |
| 4 | Oturumda firma bağlamı | `ICurrentUser` yalnız `Id`/`Name` (`CurrentUser.cs:11-12`) |
| 5 | Firma değiştirme ekranı | Panelde yok; `SettingsPage` sekmeleri arasında firma seçimi yok (`client/src/pages/SettingsPage.tsx:26`) |
| 6 | Ortak hesap planı şablonu | `Account` sınıfı yok (`docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md:122`) |
| 7 | Genel belge serisi tablosu | Yalnız fatura numarası (`InvoiceService.cs:221`) ve e-Fatura serisi (`AppDbContext.cs:275`) |
| 8 | Çok para birimi | `Currency`/`ExchangeRate` yok (`docs/plan-erp/05-VERI-MODELI.md:185`) |
| 9 | Firmalar arası işlem | Kavram yok; cari tek tablo (`server/YesLojistik.Core/Entities/Customer.cs:3`) |
| 10 | Konsolide rapor | `ReportsController` tek veri kümesi üzerinde çalışır (`server/YesLojistik.Api/Controllers/ReportsController.cs:11-36`) |
| 11 | Grup yapısı | `Company` olmadığı için `ParentCompanyId` de yok (`05-VERI-MODELI.md:163-165`) |
| 12 | Firma kurulum/kopyalama/arşivleme | Kurulum sihirbazı var (`client/src/pages/OnboardingPage.tsx`) ama tek firmayı kurar |
| 13 | Modül kapısının firmaya göre çalışması | `LicenseInfo.Has` üretimde çağrılmıyor (`03-KAPSAM-VE-KONUMLANDIRMA.md:128`) |
| 14 | `AuditLog`'da firma bilgisi | `AuditLog` alanları: `At`, `UserId`, `UserName`, `Action`, `EntityType`, `EntityId`, `Label`, `Changes` (`AuditLog.cs:11-17`) |

## 4. Hedef ekranlar ve alanlar

`01-ORTAK-SARTNAME.md:51-59` ortak parçaları yeniden kullanılır; klasik görünüm korunur
(`client/src/lib/uiMode.ts:8`).

### 4.1 Ekran: Firma değiştirici (üst çubuk)

| Alan | Tip | Davranış |
|---|---|---|
| Aktif firma | açılır liste | Kullanıcının bağlı olduğu firmalar; her satırda ünvan + VKN son 4 |
| Firma ara | metin | Çok firma varsa arama |
| Grup görünümü | anahtar | Yalnız "tüm firmalar" yetkisi olanlarda görünür |
| Rozet | salt okunur | Aktif firmanın kısa adı; her ekranda görünür (hangi firmada çalıştığımız hep belli olsun) |

**Kural:** firma seçilmeden iş ekranları açılmaz. Tek firmaya bağlı kullanıcıda bu denetim
görünmez (klasik davranış bozulmaz).

### 4.2 Ekran: Firmalar (`/ayarlar?tab=companies`)

| Sütun | İçerik |
|---|---|
| Ünvan | Ticari ünvan |
| VKN / Vergi dairesi | — |
| Grup | Üst firma adı ya da "Bağımsız" |
| Kullanıcı sayısı | Bağlı aktif kullanıcı sayısı |
| Durum | `Aktif`, `Arşivli` |
| Dönem | Açık mali dönem |
| İşlem | **Aç**, **Düzenle**, **Kopyala**, **Arşivle** |

Firma formu alanları: ünvan (200, zorunlu), kısa ad (50), VKN (11), vergi dairesi, MERSİS no,
ticaret sicil no, adres, il/ilçe, telefon, e-posta, web sitesi, logo, IBAN (maskeli gösterim), üst firma
(seçim, boş olabilir), varsayılan para birimi, mali yıl başlangıcı (ay), durum.

### 4.3 Ekran: Firma kurulum sihirbazı

Adımlar: (1) firma bilgileri, (2) mali yıl ve dönem, (3) **şablon seçimi** — "boş başla", "şablondan
kopyala" (hangi firma), (4) kopyalanacak tanımlar (hesap planı, belge serileri, KDV/tevkifat kodları,
ölçü birimleri, gider kategorileri, bildirim şablonları), (5) kullanıcı atama, (6) özet ve onay.
Kopyalama **veri kopyalamaz** (cari, fatura, sevkiyat aktarılmaz); yalnız **tanım** kopyalar.

### 4.4 Ekran: Konsolide görünüm (`/grup`)

| Sekme | İçerik |
|---|---|
| Nakit | Firma başına ve toplam kasa/banka bakiyesi; firma sütunları |
| Satış | Firma ve ay bazında satış, tahsilat, iptal; elenmiş ara firma satışı |
| Kârlılık | Firma bazında kâr; elenmiş grup içi kâr |
| Mizan | Hesap bazında firmalar arası karşılaştırma (hesap planı eşlemesi sonrası) |
| Cariler | Firma + cari bazında bakiye; **grup içi bakiyeler ayrı sekmede** |
| Eliminasyon | Elenen işlemlerin listesi ve gerekçesi |

Her sekmede: dönem seçici, para birimi (TL varsayılan), "elenmiş/elenmemiş" anahtarı (varsayılan
elenmiş), dışa aktarma (Excel/PDF), alt toplamlar `SumStrip` ile.

### 4.5 Ekran: Firmalar arası işlem

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kaynak firma | salt okunur | — | Aktif firma |
| Hedef firma | seçim | Evet | Grup içi firmalar |
| İşlem türü | seçim | Evet | Satış, hizmet, masraf yansıtma, ortak cari |
| Belge | bağlantı | Evet | Fatura/sefer/masraf |
| Tutar | tutar | Evet | Kaynak belgeden önerilir |
| İç hesap | seçim (hesap planı) | Evet | Muavin iç hesap; **doğrulanacak:** hangi hesap |
| KDV durumu | seçim | Evet | **doğrulanacak:** mali müşavir kararı |
| Açıklama | metin (300) | Evet | İç yazışmada görünür |

## 5. İş kuralları

### 5.1 Veri modeli ve izolasyon

- **Tek süzgeç noktası.** Firma süzgeci `AppDbContext.OnModelCreating` içindeki **aynı döngüye** eklenir;
  bugün yumuşak silme süzgeci orada kurulur (`AppDbContext.cs:54-60`). Böylece 40'tan fazla tabloya tek
  tek yazmak gerekmez (`docs/plan-erp/04-HEDEF-MIMARI.md:156-159`).
- **Süzgeç kuralı:** `e.CompanyId == currentCompanyId`. Kullanıcının firma bağlamı yoksa (ör. arka plan
  işi) süzgeç uygulanmaz ama **hiçbir** iş ucu bu durumda çalışmaz.
- **Yazma kuralı:** yeni kayıtta `CompanyId` **sunucuda** yazılır (`SaveChangesAsync` içinde,
  `AuditTrail`'in çalıştığı yer: `AppDbContext.cs:456-481`). İstemciden gelen `CompanyId` yok sayılır.
- **Okuma kuralı:** firma bağlamı isteğin kimliğinden gelir; sorgu dizesinden gelen `companyId` yalnız
  "tüm firmalar" yetkisi olan kullanıcıda dikkate alınır.
- **Şüpheli durumda hata:** süzgeç uygulanamıyorsa (firma bağlamı çözülemedi) istek **500 değil 403**
  ile reddedilir ve günlüğe yazılır.

**Teknik sınır (açıkça yazılır).** EF Core global sorgu süzgeci, örnek (`DbContext`) oluşturulurken
sabit bir ifade ister. "Tüm firmalar" görünümü bu yüzden iki yoldan biriyle yapılır:

| Yol | Nasıl | Ne zaman |
|---|---|---|
| A — Süzgeçsiz okuma bağlamı | Yalnız grup raporları için ayrı `DbContext` (`CompanyFilter: off`) | Konsolide raporlar |
| B — Açık kapsam | Firma bağlamı başlıkta taşınır; "tüm firmalar" özel bir değerdir | Tek firma akışları |

Seçim: **A** konsolide raporlar için, **B** iş ekranları için. Gerekçe: rapor tarafında süzgeçsiz okuma
kaçınılmaz; iş tarafında ise her kaydın tek firmaya ait olması gerekir. Bu belge kararı yazar, kod
yazmaz.

### 5.2 Kullanıcı-firma yetkilendirmesi ve firma değiştirme

- **Bağlantı.** Bir kullanıcı bir ya da birden çok firmaya bağlı olabilir; firma içi rolü ayrıdır
  (`Owner`, `Manager`, `Accountant`, `Viewer`). Firma içi rol, **firma sınırı içinde** geçerlidir.
- **Firma değiştirme.** Oturumda aktif firma taşınır. Değişiklik yeni bir erişim belirteci üretir
  (yetki önbelleği karışmasın diye) ve denetim izine yazılır.
- **Varsayılan firma.** Kullanıcının `IsDefault` işaretli firması açılışta seçilir.
- **Tek firmalı kullanıcı.** Firma seçici görünmez; bugünkü davranış birebir korunur.
- **Muhasebeci.** `Accountant` firma rolü, kâr/maliyet alanlarını varsayılan olarak görmez
  (`28-MUHASEBECI-PAKETI.md` §5.1).
- **Süper yönetici (sahip).** "Tüm firmalar" görünümü yalnız `Owner` rolüne ve yalnız okuma amaçlı
  raporlara açıktır; iş kaydı oluşturmak için firma seçmek zorundadır.
- **Kural:** bir kullanıcı **hiçbir** uçtan başka firmanın verisini göremez; panelde gizleme yeterli
  sayılmaz.

### 5.3 Ortak tanımlar

| Tanım | Paylaşım modeli | Gerekçe |
|---|---|---|
| **Hesap planı şablonu** | Şablon grup düzeyinde; firma kendi kopyasını alır, sonra serbestçe değiştirir | Firmalar farklı hesap kodu kullanabilir |
| **Belge serileri** | Firma bazında ayrı sayaç; **asla** paylaşılmaz | Numara tekilliği firma içinde anlamlı (`04-HEDEF-MIMARI.md` §5.4) |
| **KDV / tevkifat kodları** | Grup düzeyinde ortak; firma ek kod ekleyebilir | Kodlar mevzuata bağlı, ortak olması tutarlılık sağlar |
| **Para birimi ve kurlar** | Kur tablosu grup düzeyinde ortak; firma bazlı kur geçersiz kılınabilir | Kur piyasa verisi, firmaya göre değişmez |
| **Ölçü birimleri, gider kategorileri** | Şablondan kopyalanır, sonra bağımsız | Firma kendi kategorisini açabilir |
| **Bildirim şablonları** | Şablondan kopyalanır, firma düzenleyebilir | Firma adı ve tonu farklı olabilir |
| **Mali dönem** | Firma bazında, **asla** paylaşılmaz | Dönem kapanışı firma kararıdır |
| **Vergi/tevkifat oranları** | Kod olarak ortak; oran değeri **doğrulanacak:** mali müşavir | Mevzuat yorumu yapılmaz |

**Kural:** paylaşılan tanımı değiştirmek, kopyasını almamış firmaları etkiler. Ekranda "bu tanım
N firmada kullanılıyor" uyarısı gösterilir. Kullanımdaki tanım **silinemez**, yalnız pasife alınır.

### 5.4 Firmalar arası işlem

- **Ortak cari.** Grup içi bir firma, diğer firmanın carisi olabilir. Bu cari kaydı **paylaşılmaz**:
  her firmada kendi cari kartı vardır, iki kart `GroupContactId` ile birbirine bağlanır. Gerekçe: iki
  firmanın kendi mutabakatı ve kendi bakiyesi olmalıdır.
- **Yansıtma faturası.** Kaynak firma, hedef firmaya fatura keser; hedef firmada **aynı belge** alış
  faturası olarak oluşur ve iki belge `MirrorDocumentId` ile bağlanır. İki kayıt **tek işlemde** ve
  aynı transaction içinde yazılır; biri oluşup diğeri oluşmazsa işlem geri alınır.
- **KDV ve belge türü.** Yansıtma faturasının KDV durumu, belge türü ve hangi iç hesaba yazılacağı
  **doğrulanacak:** mali müşavir onayı. Bu belge **oran ya da hesap kodu uydurmaz**.
- **İç borç/alacak.** Firmalar arası bakiye ayrı bir "grup içi" sekmesinde izlenir; konsolide nakit ve
  kârlılıkta **karşılıklı elenir**.
- **Eliminasyon.** Grup içi satış, grup içi kâr ve grup içi bakiye elenir. Eleme **kayıt silmez**;
  raporlama katmanında işaretlenir ve "elenmiş" sütununda gösterilir. Gerekçe: işlem gerçekten olmuştur,
  yok sayılamaz.
- **Kur farkı.** Farklı para birimli firmalar arası işlemde kur farkı ayrı satır olarak izlenir;
  hesaplama kaynağı **doğrulanacak:** mali müşavir (`22-ITHALAT-IHRACAT-DOVIZ.md` ile bağlantılı).

### 5.5 Konsolide raporlar

| Rapor | Nasıl hesaplanır | Kural |
|---|---|---|
| **Konsolide nakit** | Firma kasa/banka bakiyeleri toplamı; grup içi virmanlar elenir | Kasa bakiyesi saklanmaz, hareketlerden hesaplanır (`server/YesLojistik.Infrastructure/Services/CashService.cs:18-62`) |
| **Konsolide satış** | Firma satış faturaları; grup içi yansıtmalar elenir | İptal faturalar hariç; KDV hariç/dahil ayrımı görünür |
| **Konsolide kârlılık** | Firma kârları toplamı; grup içi kâr elenir | Kâr KDV hariç hesaplanır (`server/YesLojistik.Core/Domain/TripProfit.cs:1`) |
| **Konsolide mizan** | Hesap eşlemesi sonrası hesap bazında toplam | Eşleme yoksa hesap "eşlenmemiş" grubunda |
| **Konsolide cariler** | Firma + cari bazında bakiye; grup içi ayrı | Kur farkı ayrı satır |
| **Eliminasyon defteri** | Elenen işlemler, gerekçe, belge bağı | Raporla birlikte saklanır |

**Kurallar.** (a) Konsolide raporlar **yalnız okuma**; hiçbir kayıt oluşturmaz. (b) Para birimi farklı
firmalar varsa rapor, seçilen raporlama para birimine çevrilir ve **kullanılan kur** raporda yazılır.
(c) Rapor üretimi kuyruğa yazılabilir (`report.build` işi, `04-HEDEF-MIMARI.md:231`). (d) Yetki: yalnız
`Owner` ve `GroupViewer`; muhasebeci grup raporunu **varsayılan olarak görmez**
(`28-MUHASEBECI-PAKETI.md`).

### 5.6 Firma kurulum, kopyalama, arşivleme

- **Kurulum.** Yeni firma açılışta boştur; `CompanySettings` satırı oluşur; mali dönem açılır.
- **Kopyalama.** Yalnız **tanım** kopyalar (hesap planı şablonu, seriler, kodlar, ölçü birimleri, gider
  kategorileri, bildirim şablonları). **Veri kopyalamaz** (cari, fatura, sevkiyat, kasa hareketi).
  Kopyalanan serilerin sayaçları **sıfırdan** başlar.
- **Arşivleme = silme değil.** Arşivlenen firma listede "Arşivli" görünür, raporlarda varsayılan
  gizlenir, yazma kapalıdır. Veri **korunur** (muhasebe saklama süresi; `35` belgesi).
- **Gerçek silme** yalnız sahip talebiyle, yedek alındıktan sonra, elle yapılır; panelde "sil" düğmesi
  yoktur. Gerekçe: bugünkü hesap kapatma akışı da veri silmez
  (`server/YesLojistik.Api/Controllers/DataExportController.cs:18-21`).
- **Çok şirketli lisans/kapasite.** Firma sayısı lisans paketine bağlanabilir; kapı
  `LicenseInfo.Has` ile kurulur (`LicenseInfo.cs:27-30`) — bugün üretimde çağrılmıyor
  (`03-KAPSAM-VE-KONUMLANDIRMA.md:128`), bu belge onu **firma sayısı** için devreye alır.
- **doğrulanacak:** firma başına fiyat modeli (kullanıcı başı mı, firma başı mı) — satıcı kararı
  (`docs/SATIS-PLANI.md`).

### 5.7 Mevcut tek firmalı koddan geçiş (üç adımlı, ekleme-only)

**Aşama 1 — şema hazırlığı (canlı veri dokunulmaz).**

1. `Company` tablosu açılır (yeni tablo; `05-VERI-MODELI.md:163-165`).
2. Bütün iş tablolarına `CompanyId int NULL` eklenir; indeksler `(company_id, ...)` olarak eklenir.
3. `CompanySettings`'e `CompanyId int NULL` eklenir; **mevcut satır ve tohum kaydı aynen kalır**
   (`AppDbContext.cs:438-452` değişmez).
4. Hiçbir veri taşınmaz, hiçbir sorgu değişmez. Uygulama bu aşamada **bugünkü gibi** çalışır.

**Aşama 2 — doldurma ve süzgeç.**

5. Tek `Company` kaydı oluşturulur (bugünkü firma) ve bütün mevcut satırların `CompanyId` alanı bu
   kayda **tek seferlik bir arka plan işiyle** yazılır (iş kaydı ve ilerleme görünür; iş
   `BackgroundJob` tablosunda tutulur, `05-VERI-MODELI.md:433-438`).
6. Süzgeç `AppDbContext.OnModelCreating` içindeki tek noktaya eklenir (`AppDbContext.cs:54-58`).
7. `CompanyId` hâlâ **boş olabilir**; `NOT NULL` yapılmaz. Gerekçe: ekleme-only kuralı ve canlı
   veritabanının açılışta migrate edilmesi (`docs/plan-erp/01-ORTAK-SARTNAME.md:22-23`).

**Aşama 3 — yazma güvenliği ve yetki.**

8. Yeni kayıtta `CompanyId` otomatik yazılır (`AppDbContext.cs:456-481` içindeki döngüye eklenir).
9. `ICurrentUser`'a `CompanyId` eklenir (`ICurrentUser.cs:3-7`) ve `CurrentUser` bunu doldurur
   (`CurrentUser.cs:11-12`); firma bağlamı erişim belirtecinde taşınır.
10. `CompanyUser` tablosu ve firma değiştirme ekranı gelir.
11. Çapraz firma erişim testi **zorunlu** hâle gelir (`docs/plan-erp/04-HEDEF-MIMARI.md:161-162`).

**Neden bu yol?** (a) Her aşama tek başına çalışır durumda bırakılır; geri alınabilir. (b) Hiçbir
migration veri silmez/dönüştürmez. (c) Süzgeç tek noktada olduğu için unutulan tablo riski düşer.
(d) Canlı veritabanı açılışta migrate edilir; kesinti gerekmez (`Program.cs:141-145`).

### 5.8 Ayna modu ile etkileşim

**Bugünkü durum (kanıtlı).** `MirrorWriteGuard`, **sabit bir yol listesine** bakar ve listedeki yollara
yapılan yazma isteklerini ayna açıkken reddeder
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`). Liste bugün 14 yol içeriyor:
`/api/customers`, `/api/suppliers`, `/api/drivers`, `/api/vehicles`, `/api/trips`, `/api/expenses`,
`/api/cash-accounts`, `/api/staff`, `/api/payments`, `/api/supplier-payments`, `/api/invoices`,
`/api/purchase-invoices`, `/api/import`, `/api/job-requests`. Denetim yalnız **GET ve HEAD dışındaki**
isteklere uygulanır (`MirrorWriteGuard.cs:23-25`). Ayar yazma yolu izlenmez: şirket ayarı
`CompanySettings.MirrorMode` alanıdır (`CompanySettings.cs:34`) ve guard ayarları engellemez.

**Sonuç: yeni modüller bu listeye eklenmedikçe ayna açıkken yazmaya açık kalır.** Çok firmalı geçişte
eklenecek yollar:

| Yeni yol | Neden |
|---|---|
| `/api/erp` | Hesap planı, fiş, mizan, stok, sipariş, sabit kıymet yazmaları |
| `/api/accountant` | Muhasebeci fiş onayı ve aktarım üretimi (yazma uçları) |
| `/api/portal` | Müşteri/tedarikçi portalı yazmaları (tedarikçi fatura yükleme dahil) |
| `/api/erp/companies` | Firma kurulum/kopyalama/arşivleme |
| `/api/hooks` | Webhook uçları (yazma sayılır) |

**Kurallar.** (a) `/api/erp` gibi **üst yol** eklemek alt yolları kapsar (`StartsWithSegments` deseni,
`MirrorWriteGuard.cs:24`); yine de okuma uçlarının etkilenmemesi için GET/HEAD kuralı korunur.
(b) Ayna açıkken firma **kurulum/kopyalama** yapılamaz; çünkü bu, aynadaki tek firmalı veriyle
çelişir. (c) Yeni bir yazma ucu ekleyen geliştirici, guard listesini güncellemek zorundadır; bunu
zorlamak için **otomatik test** yazılır: uygulamadaki bütün yazma uçları taranır, guard listesinde
karşılığı olmayan yol kaldıysa test **kırmızı** olur. (d) Ayna modu açıkken firma değiştirici
görünür ama "Yeni firma" düğmesi görünmez (bugünkü "+ Yeni menüsü" davranışının aynısı,
`AGENTS.md` §5).

## 6. Veri modeli

Yeni tablolar `05-VERI-MODELI.md` kararlarına uyar (tekil İngilizce ad, `decimal(18,2)`, enum metin,
`CompanyId` taşır, ekleme-only).

**`Company` (Y).** `Id`, `Title` (200), `ShortName` (50), `TaxNumber` (11), `TaxOffice` (100), `MersisNo`
(20), `TradeRegistryNo` (30), `Address` (500), `City` (30), `District` (50), `Phone` (20), `Email` (200),
`Website` (200), `LogoDataUrl`, `Iban` (34), `DefaultCurrency` (3), `FiscalYearStartMonth` (1-12),
`ParentCompanyId int?` (grup), `IsActive`, `ArchivedAt`, `CreatedAt`, `UpdatedAt`, `CreatedBy`,
`IsDeleted`. İndeksler: tekil `(tax_number)` kısmi (`is_deleted = false`); `(parent_company_id)`.

**`CompanyUser` (Y).** `Id`, `UserId`, `CompanyId`, `RoleInCompany` (`Owner`/`Manager`/`Accountant`/
`Viewer`), `IsDefault`, `CanSeeProfit` (varsayılan `false`), `CreatedAt`, `UpdatedAt`, `CreatedBy`,
`IsDeleted`. İndeksler: tekil `(user_id, company_id)`; `(company_id)`.

**`CompanySettings` (E).** Mevcut tablo **korunur**; `CompanyId int?` eklenir. Bugünkü bütün alanlar
(`CompanyName`, `InvoicePrefix`, `NextInvoiceNumber`, `MirrorMode`, `EInvoiceEnabled`...) aynen kalır
(`CompanySettings.cs:5-54`); aşama 2'den sonra ayar okuması firma bazına taşınır. Tohum kaydı
(`AppDbContext.cs:452`) değişmez.

**`CompanyPlan` (Y).** Amaç: hesap planı şablonu. `Id`, `CompanyId` (şablon sahibi; grup şablonu için
`null`), `Name` (100), `Level` (1-4), `AccountPattern` (40), `AccountName` (150), `VatRelevant bool`,
`Order`, `CreatedAt`. İndeks: `(company_id, account_pattern)`.

**`Currency` (Y).** `Id`, `CompanyId` (boş olabilir = grup ortak), `Code` (3, ör. `TRY`, `USD`, `EUR`),
`Name` (50), `Symbol` (5), `IsBase bool`, `Decimals` (0-4), `IsActive`. İndeks: tekil
`(company_id, code)`.

**`ExchangeRate` (Y).** `Id`, `CompanyId` (boş olabilir), `CurrencyCode` (3), `Date`, `Rate`
(`decimal(18,6)`), `Source` (30, ör. "TCMB", "elle"), `CreatedBy`, `CreatedAt`. İndeks: tekil
`(company_id, currency_code, date)`. **doğrulanacak:** kur kaynağı ve güncelleme anı (mali müşavir).

**`InterCompanyLink` (Y).** Amaç: iki firmadaki karşılıklı kayıtların bağı. `Id`, `CompanyId`,
`CounterpartCompanyId`, `LinkKind` (`MirrorInvoice`/`GroupContact`/`CashTransfer`), `SourceType`,
`SourceId`, `CounterpartType`, `CounterpartId`, `Amount`, `CurrencyCode`, `Rate`, `IsEliminated bool`,
`EliminationNote` (300), `CreatedAt`, `CreatedBy`, `IsDeleted`. İndeksler:
`(company_id, counterpart_company_id)`; tekil `(source_type, source_id, link_kind)`.

**`GroupContact` (Y).** Amaç: iki firmadaki cari kartların aynı gerçek kişiyi göstermesi. `Id`,
`GroupId` (grup kökü firma), `Name` (200), `TaxNumber` (11), `CreatedAt`. İndeks: `(group_id,
tax_number)`.

**`ConsolidationRun` (Y).** Amaç: konsolide rapor üretiminin izi. `Id`, `GroupCompanyId`, `From`, `To`,
`ReportingCurrency` (3), `EliminatedTotal`, `Status` (`Running`/`Done`/`Failed`), `StartedAt`,
`FinishedAt`, `RequestedBy`, `ReportHash`. İndeks: `(group_company_id, from, to)`.

**Mevcut tablolara eklenenler (hepsi `NULL` olabilir).** Bütün `BaseEntity` türevlerine `CompanyId int?`;
`AuditLog`'a `CompanyId int?`, `Module` (20), `CorrelationId` (40) (`05-VERI-MODELI.md:419-422`);
`User`'a doğrudan `CompanyId` **eklenmez** (ilişki `CompanyUser` üzerinden kurulur; gerekçe: bir
kullanıcı birden çok firmaya bağlı olabilir). `EInvoiceSequence`'a `CompanyId int?`
(`AppDbContext.cs:275-279`). `PushToken`, `NotificationPreference` tabloları `CompanyId` alır.

**Migration sırası.** (1) `Company` + `CompanyUser` + bütün `CompanyId` sütunları, (2) dolum işi,
(3) süzgeç ve yazma güvenliği, (4) `Currency`/`ExchangeRate`/`CompanyPlan`, (5) `InterCompanyLink`/
`GroupContact`, (6) `ConsolidationRun`. Tek bir migration **veri taşımaz**; dolum ayrı bir arka plan
işidir, böylece açılış süresi uzamaz.

## 7. API uçları

| Metot | Yol | Ne yapar | Yetki |
|---|---|---|---|
| GET | `/api/erp/companies` | Kullanıcının bağlı firmaları | Oturum |
| POST | `/api/erp/companies` | Yeni firma (kurulum) | Sahip / Yönetici |
| PUT | `/api/erp/companies/{id}` | Firma bilgileri | Firma `Manager` |
| POST | `/api/erp/companies/{id}/copy-definitions` | Tanım kopyala | Yönetici |
| POST | `/api/erp/companies/{id}/archive` | Arşivle (silme değil) | Sahip |
| POST | `/api/erp/session/company` | Aktif firmayı değiştir | Oturum + firma bağı |
| GET | `/api/erp/companies/{id}/users` | Firmaya bağlı kullanıcılar | Firma `Owner`/`Manager` |
| POST | `/api/erp/companies/{id}/users` | Kullanıcıyı firmaya bağla / rol ver | Firma `Owner` |
| DELETE | `/api/erp/companies/{id}/users/{userId}` | Bağlantıyı kaldır | Firma `Owner` |
| GET | `/api/erp/group/summary` | Konsolide özet (nakit, satış, kâr) | `group.view` |
| GET | `/api/erp/group/balance` | Konsolide mizan (hesap eşlemesi) | `group.view` |
| GET | `/api/erp/group/cari` | Konsolide cari, grup içi ayrı | `group.view` |
| GET | `/api/erp/group/eliminations` | Eliminasyon defteri | `group.view` |
| POST | `/api/erp/group/consolidate` | Konsolide rapor üret (kuyruğa yazılır) | `group.view` |
| POST | `/api/erp/intercompany/invoice` | Yansıtma faturası oluştur | `intercompany.edit` + iki firma yetkisi |
| GET | `/api/erp/intercompany/links` | Firmalar arası bağ listesi | `intercompany.view` |
| POST | `/api/erp/intercompany/contacts/link` | İki cari kartı bağla | `intercompany.edit` |
| GET | `/api/erp/currencies` | Para birimleri | `ledger.view` |
| GET | `/api/erp/exchange-rates` | Kurlar | `ledger.view` |
| POST | `/api/erp/exchange-rates` | Kur gir / içe al | `ledger.edit` |
| GET | `/api/erp/account-plans` | Hesap planı şablonları | `ledger.view` |
| POST | `/api/erp/account-plans/{id}/apply` | Şablonu firmaya uygula | Yönetici |

**Kurallar.** (a) Firma bağlamı yolda taşınmaz; aktif firmadan gelir. Yansıtma faturasında **iki**
firma yetkisi birden aranır. (b) `group.*` yetkileri rol matrisine eklenir
(`07-YETKI-ONAY-NUMARALANDIRMA.md` §4). (c) Konsolide üretim kuyruğa yazılır (`report.build` işi,
`04-HEDEF-MIMARI.md:231`) ve `ConsolidationRun` kaydı oluşur. (d) Mevcut uçlar
(`/api/settings`, `/api/public/branding`, `/api/invoices`...) **değişmez**; tek firmalı kullanımda
davranış birebir aynı kalır.

## 8. Yetki, onay ve denetim izi

| İş | Sahip | Grup görüntüleyici | Firma Yöneticisi | Muhasebeci | Operasyon |
|---|---|---|---|---|---|
| Firma açma | Evet | Hayır | Hayır | Hayır | Hayır |
| Firma bilgisi düzenleme | Evet | Hayır | Kendi firması | Hayır | Hayır |
| Tanım kopyalama | Evet | Hayır | Evet | Hayır | Hayır |
| Firma arşivleme | Evet | Hayır | Hayır | Hayır | Hayır |
| Kullanıcı-firma bağlama | Evet | Hayır | Kendi firması | Hayır | Hayır |
| Firma değiştirme | Evet | Evet | Kendi firmaları | Bağlı firmalar | Bağlı firmalar |
| Konsolide rapor | Evet | Evet | Hayır | Hayır (varsayılan) | Hayır |
| Yansıtma faturası | Evet | Hayır | İki firma yetkisi varsa | Hayır | Hayır |
| Eliminasyon işareti | Evet | Hayır | Hayır | Hayır | Hayır |
| Kur girişi | Evet | Hayır | Hayır | Evet | Hayır |

**Maker-checker.** Yansıtma faturası onay bekler; oluşturan kişi onaylayamaz. Firma arşivleme ve kur
toplu içe alma da onay ister (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2 ruhu).

**Denetim izi.** Ayrı satır olarak yazılır: firma açıldı, firma bilgisi değişti, tanım kopyalandı,
firma arşivlendi, kullanıcı-firma bağlantısı eklendi/kaldırıldı, firma değiştirildi, çapraz firma
erişim denemesi (**403**), yansıtma faturası oluşturuldu/onaylandı, eliminasyon işaretlendi, kur içe
alındı, hesap planı şablonu uygulandı, konsolide rapor üretildi. Bugünkü `AuditTrail` yalnız veri
değişikliğini yazar (`AuditTrail.cs:54-56`); bu olaylar elle yazılır
(`server/YesLojistik.Api/Controllers/UsersController.cs:42` deseni). `AuditLog`'a `CompanyId` eklendiği
için iz firma bazında süzülebilir.

## 9. Kabul kriterleri

1. **Tek firmalı davranış bozulmaz.** Firma süzgeci kapalıyken bütün mevcut testler yeşil kalır
   (`server/YesLojistik.Tests` ve `client/e2e`).
2. **Veri kaybı yok.** Aşama 1 ve 2 migration'ları hiçbir satırı silmez/değiştirmez; canlı
   veritabanında satır sayıları aşama öncesi ve sonrası **aynı**.
3. **İzolasyon.** İki firmalı kurulumda A firmasının kullanıcısı B firmasının 20 farklı ucundan veri
   alamaz; her deneme 403 ve denetim izi satırı üretir.
4. **Yazma güvenliği.** İstemcinin gönderdiği `CompanyId` yok sayılır; kayıt aktif firmaya yazılır.
5. **Firma değiştirme.** Firma değişince liste ve toplamlar anında değişir; eski firmanın verisi
   ekranda kalmaz (önbellek anahtarı firmayı içerir).
6. **Belge numarası.** İki firma aynı öneki kullansa bile numaralar birbirine karışmaz; her firmada
   sayaç bağımsızdır.
7. **Konsolide toplam.** İki firmalı örnekte konsolide satış = firma satışları toplamı − grup içi
   satış; fark **0,05 TL**'nin altında.
8. **Eliminasyon.** Grup içi bir yansıtma faturası, "elenmiş" raporunda **bir** satır olarak görünür ve
   toplamdan düşülür.
9. **Yansıtma bütünlüğü.** Yansıtma faturası iki firmada **birlikte** oluşur; hata hâlinde ikisi de
   oluşmaz (transaction).
10. **Kopyalama sınırı.** "Şablondan kopyala" hiçbir cari, fatura, sevkiyat ya da kasa hareketi
    kopyalamaz; sayaçlar sıfırdan başlar.
11. **Arşivleme.** Arşivli firma varsayılan listelerde görünmez, yazma kapalıdır, verisi korunur.
12. **Ayna modu.** Ayna açıkken yeni modüllerin (`/api/erp`, `/api/accountant`, `/api/portal`,
    `/api/erp/companies`) yazma uçları reddedilir; okuma serbesttir. Guard listesi kapsam testi
    geçer (yazma ucu eklenip listeye eklenmezse test kırmızı olur).
13. **Muhasebeci sınırı.** Muhasebeci firma değiştirebilir ama konsolide raporu **göremez**.
14. **Kur.** Farklı para birimli firmalarda konsolide rapor, kullanılan kuru ve tarihini raporda
    yazar; kur yoksa rapor üretilmez, uyarı verir.
15. **Lisans.** Paket sınırı aşılırsa yeni firma açılamaz; mevcut firmaların verisi okunabilir kalır
    (`LicenseInfo.cs:27-30` deseni).

## 10. Testler

**Sunucu birim testleri (`server/YesLojistik.Tests/Unit`).**

| Dosya | Ne sınar |
|---|---|
| `CompanyFilterTests.cs` | Süzgeç ifadesi doğru kurulur; firma bağlamı yoksa hata |
| `CompanyContextTests.cs` | `ICurrentUser.CompanyId` çözümü; bağlam yoksa 403 |
| `EliminationMathTests.cs` | Grup içi eleme toplamı; fark 0,05 TL altında |
| `ConsolidationCurrencyTests.cs` | Kur çevrimi; kur yoksa hata; raporlama para birimi |
| `MirrorGuardCoverageTests.cs` | Bütün yazma uçları guard listesinde mi (kapsam denetimi) |

**Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration`).** Bugünkü desen:
`WebApplicationFactory` + gerçek PostgreSQL (`server/YesLojistik.Tests/Integration/ApiFactory.cs`).
İki firmalı kurulum ortak bir yardımcıyla hazırlanır.

| Dosya | Senaryo |
|---|---|
| `MultiCompanyIsolationTests.cs` | A/B firması: 20 uçta çapraz erişim imkânsız; denetim izi satırı |
| `MultiCompanyMigrationTests.cs` | Aşama 1 ve 2: satır sayıları korunur; `CompanyId` dolar; süzgeç açar/kapatır |
| `CompanySwitchTests.cs` | Firma değiştirme; önbellek karışmaz; toplamlar doğru |
| `DocumentNumberIsolationTests.cs` | İki firmada numara çakışmaz; yıl değişiminde sayaç sıfırlanır |
| `InterCompanyTests.cs` | Yansıtma faturası iki tarafta; hata hâlinde geri alma; bağ kaydı |
| `ConsolidationTests.cs` | Nakit/satış/kârlılık konsolide; elenmiş ve elenmemiş görünüm |
| `MirrorGuardNewModulesTests.cs` | Ayna açıkken yeni modüllerde yazma reddi, okuma serbest |
| `LegacyMirrorRegressionTests.cs` | Bugünkü ayna testleri yeşil kalır (`LegacyMirrorTests.cs` korunur) |

**Panel uçtan uca testleri (`client/e2e`).**

| Dosya | Senaryo |
|---|---|
| `cok-firma.spec.ts` | Firma listesi → firma değiştir → liste değişir → eski firma verisi görünmez |
| `firma-kurulum.spec.ts` | Sihirbaz: firma aç → şablondan kopyala → kullanıcı ata |
| `konsolide.spec.ts` | Grup görünümü: nakit, satış, kârlılık, eliminasyon sekmesi |
| `new-ui/cok-firma.spec.ts` | Aynı akış yeni görünümde (`uiMode.ts:8` anahtarının arkasında) |

**Veri.** Testler uydurma firma, uydurma VKN ve uydurma tutar kullanır (`AGENTS.md` §3.3);
pratikortam verisi kullanılmaz. Paralel çalışan ajanlar kendi veritabanını kullanır (`AGENTS.md` §4).

## 11. Efor ve bağımlılıklar

| İş kalemi | Kişi-gün | Önce bitmeli |
|---|---|---|
| `Company` + bütün `CompanyId` sütunları (aşama 1) | 10-15 | `05-VERI-MODELI.md` |
| Dolum işi + ilerleme ekranı (aşama 2) | 6-9 | Aşama 1 |
| Süzgeç + `ICurrentUser.CompanyId` + yazma güvenliği (aşama 3) | 8-12 | Dolum |
| `CompanyUser`, rol ve firma değiştirici | 8-12 | Süzgeç |
| Firma kurulum/kopyalama/arşivleme ekranları | 12-18 | `CompanyUser` |
| `Currency`/`ExchangeRate` + ekranlar | 8-12 | Süzgeç |
| Hesap planı şablonu (`CompanyPlan`) | 6-9 | `06-MUHASEBE-MOTORU.md` |
| Firmalar arası işlem (yansıtma, ortak cari, iç hesap) | 15-22 | Fiş altyapısı + **mali müşavir onayı** |
| Konsolide raporlar (nakit, satış, kârlılık, mizan, cari) | 18-26 | Firmalar arası işlem |
| Eliminasyon defteri | 6-9 | Konsolide raporlar |
| `MirrorWriteGuard` yol listesi + kapsam testi | 2-3 | — (hemen yapılabilir) |
| Testler (birim + entegrasyon + e2e) | 16-24 | Her kalemle birlikte |
| **Toplam** | **115-171** | — |

**Sıra.** (1) `MirrorWriteGuard` yol listesi ve kapsam testi — bu **hemen** yapılabilir ve yeni modüller
yazılmadan önce yapılmalıdır; (2) aşama 1 şema, (3) dolum, (4) süzgeç ve yazma güvenliği,
(5) `CompanyUser` ve firma değiştirici, (6) kurulum/kopyalama/arşivleme, (7) para birimi ve kur,
(8) hesap planı şablonu, (9) firmalar arası işlem, (10) konsolide raporlar. Dokuzuncu kalem
**mali müşavir onayı** gelmeden başlamaz.

**Bağımlılıklar.** `04-HEDEF-MIMARI.md` (§5.3 üç aşamalı geçiş, §5.4 seriler, §5.6 kuyruk),
`05-VERI-MODELI.md` (`Company`, `CompanyId`, `Currency`, `ExchangeRate`), `06-MUHASEBE-MOTORU.md`
(hesap planı, fiş), `07-YETKI-ONAY-NUMARALANDIRMA.md` (rol matrisi, maker-checker),
`28-MUHASEBECI-PAKETI.md` (muhasebecinin firma listesi), `29-MOBIL-VE-DISA-ACILIM.md` (portalın firma
sınırı ve API anahtarının firma kapsamı), `31-AYARLAR-SIRKET-KURULUMU.md` (firma kurulum sihirbazı),
`35-DENETIM-IZI-KVKK-UYUM.md` (firma bazlı saklama ve imha), `36-PERFORMANS-OLCEK.md` (indeksler ve
konsolide rapor performansı), `37-TEST-CI-GENISLETME.md` (izolasyon testleri CI'da).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma | Geri alma |
|---|---|---|---|
| Çok firmalı geçiş canlı veriyi bozar | Çok yüksek | Ekleme-only migration; `CompanyId` önce boş; iki firmalı test; dolum işi geri alınabilir | Süzgeç kapatılır, sistem tek firmalı gibi çalışır |
| Unutulan tabloda süzgeç olmaması (veri sızıntısı) | Çok yüksek | Süzgeç tek noktada; otomatik kapsam testi: `CompanyId` almayan tablo listesi kırmızı | Tablo listesi gözden geçirilir |
| Ayna modunda yeni modüllerin yazmaya açık kalması | Yüksek | Guard listesine üst yollar eklenir + kapsam testi | Yol listesi daraltılır |
| Konsolide raporda çift sayım (grup içi satış) | Yüksek | Eliminasyon defteri; "elenmiş" varsayılan; fark testi | Rapor elenmemiş görünüme alınır |
| Yansıtma faturasının vergisel sonucu yanlış | Yüksek | Uygulama **mali müşavir onayı** gelmeden yazılmaz; oran/hesap kodu kodda sabitlenmez | Yansıtma kapatılır, manuel süreç |
| Firma sayısı lisans modeli belirsizliği | Orta | Kapı `LicenseInfo.Has` ile; sınır ayarlanabilir; mevcut firmalar okunur kalır | Sınır gevşetilir |
| Kur kaynağı belirsizliği (TCMB/elle) | Orta | Kur kaynağı alanı zorunlu; **doğrulanacak:** mali müşavir | Elle kur girişi |
| Dolum işinin yarıda kalması | Orta | İş kaydı ve ilerleme; kaldığı yerden devam; tekrar çalıştırma güvenli | İş yeniden başlatılır |
| Firma kopyalamanın veriyi de kopyalaması | Orta | Yalnız tanım kopyalama; testle sabitlenir | Kopya firma arşivlenir |
| Performans düşüşü (her sorguda ek süzgeç) | Düşük | İndeksler `(company_id, ...)`; özet tablolar | İndeks gözden geçirilir |

**doğrulanacak:**

1. **Luca'nın çok firmalı yapısı.** Gerçekten çok tüzel kişilik mi, tek kişilik içinde çok
   işletme/dönem mi; grup/holding desteği var mı; konsolide rapor üretiyor mu. Kaynak: Luca demo
   erişimi, satış/destek ekibi, teknik doküman.
2. **Yansıtma faturasının vergisel çerçevesi** — KDV durumu, belge türü, hangi iç hesaba yazılacağı,
   transfer fiyatı kuralları. Kaynak: **mali müşavir onayı**; bu belge yorum yapmaz.
3. **Grup içi işlemlerin elenmesinde hangi kalemlerin eleneceği** (satış, kâr, stok kârı, kur farkı).
   Kaynak: mali müşavir ve muhasebe standardı.
4. **Kur kaynağı ve güncelleme anı** (TCMB mi, banka kuru mu, elle mi; hangi saat). Kaynak: mali
   müşavir; `22-ITHALAT-IHRACAT-DOVIZ.md` ile aynı soru orada da açık.
5. **Firma başına fiyat modeli** (firma başı mı, kullanıcı başı mı, modül başı mı). Kaynak: satıcı
   kararı ve `docs/SATIS-PLANI.md`; Luca fiyat sayfası okunamadı (`01-ORTAK-SARTNAME.md:75`).
6. **Mevcut canlı verinin firma ataması** — bugünkü bütün kayıtların tek firmaya yazılacağı **kullanıcı
   onayına** bağlıdır; onay alınmadan dolum işi çalıştırılmaz.
7. **Aynı VKN'li ikinci firma** açılmasına izin verilip verilmeyeceği (şube/aynı tüzel kişilik).
   Kaynak: kullanıcı kararı ve mali müşavir.
8. **Arşivlenen firmanın saklama süresi** ve gerçek silme koşulları. Kaynak: avukat/mali müşavir onayı
   (`35-DENETIM-IZI-KVKK-UYUM.md`).
9. **Depo ve iş merkezinin firma sınırıyla ilişkisi** — depo firma içi mi, firmalar arası
   paylaşılabilir mi. Kaynak: Luca karşılaştırması (`02-LUCA-ENVANTERI.md:48`, `:59`) ve kullanıcı
   kararı.
10. **Muhasebecinin "tüm firmalar" görünümü** görecek mi; görecekse hangi alanlar maskeli. Kaynak:
    mali müşavir ve kullanıcı kararı.

Sonraki belgeyle bağlantı: `31-AYARLAR-SIRKET-KURULUMU.md` firma kurulum sihirbazının ayrıntısını,
`28-MUHASEBECI-PAKETI.md` muhasebecinin firma listesini ve yetki izolasyonunu,
`29-MOBIL-VE-DISA-ACILIM.md` portal ve API'nin firma sınırını bu belgeye bağlar.
