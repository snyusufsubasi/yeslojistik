# 29 — Mobil ve Dışa Açılım

Bu belge, ERP çekirdeğinin **telefona ve şirket dışına** açılan yüzünü anlatır: şoför mobil
uygulamasının ERP bağlantısı, yönetici mobil görünümü, müşteri portalı, tedarikçi portalı, kendi açık
API'si ve anahtar yönetimi, çevrimdışı çalışma ve senkron, push bildirim. Amaç, aynı veriyi üç ayrı
kullanıcı grubuna **doğru sınırlarla** göstermektir: şoför işini yapar, yönetici onaylar, müşteri ve
tedarikçi yalnız kendi dosyasını görür.

## 1. Amaç ve kapsam

**Bugünkü durum.** Şoför uygulaması gerçek bir iş aracı: sefer listesi, durum bildirimi, masraf girişi,
fotoğraf/imza yükleme ve çevrimdışı kuyruk çalışıyor (`mobile/src/lib/outbox.ts:9-13`). Yönetici
tarafında mobil uygulama yalnız **iki iş** yapıyor: onay bekleyen masraflar ve gider girişi. Yönetici
ekranındaki "daha" sekmesi kullanıcıya açıkça "Raporlar, fatura kesme ve ayarlar için web panelini
kullanın" diyor (`mobile/src/app/yonetim/(tabs)/daha.tsx:45`). Müşteriye giden takip bağlantısı
girişsiz çalışıyor (`server/YesLojistik.Api/Controllers/TrackingController.cs:29-33`); ancak
müşterinin **kendi geçmişine** eriştiği bir alan, tedarikçi için hiçbir alan ve programatik erişim için
bir API yok.

**Bu belge neyi çözer.**

1. **Şoför tarafının ERP'ye bağlanması.** Masraf girişi ve onayı, teslim evrakı fotoğrafı, sayım,
   sevkiyat durumu — hepsi muhasebe çekirdeğine ve fiş zincirine bağlanır.
2. **Yönetici mobil görünümü.** Onay kuyruğu tek ekranda (yalnız masraf değil: fiş, ödeme, indirim,
   sayım farkı), üstte özet kartları, telefonda hızlı karar.
3. **Müşteri portalı.** Mevcut takip bağlantısı bir **kapı** olur: takip, ekstre, fatura indirme, talep
   açma. Müşteri maliyet/kâr görmez.
4. **Tedarikçi portalı.** Sipariş ve irsaliye görme, fatura yükleme — **kapsam sınırı** açıkça yazılır.
5. **Açık API ve anahtar yönetimi.** Kapsam (scope) bazlı anahtar; yalnız okuma, yazma ayrı kapsamda.
6. **Çevrimdışı çalışma ve senkron.** Bugünkü `outbox` deseni genelleştirilir; çakışma çözümü yazılır.
7. **Push bildirim.** Kime, hangi olayda, hangi metinle gider; kullanıcı tercihi nasıl uygulanır.

**Bu belge neyi çözmez.** Muhasebe fişi kuralları (`06-MUHASEBE-MOTORU.md`), entegrasyon çerçevesi
(`27-ENTEGRASYONLAR.md`), çok firma izolasyonu (`30-COK-SIRKETLI-KONSOLIDASYON.md`), sayım modülünün
stok tarafı (`21-SAYIM-BARKOD.md`), bildirim kanallarının şablon yönetimi
(`33-BILDIRIM-EPOSTA-SMS-KEP.md`). Mevzuat yorumu yapılmaz.

## 2. Luca'daki karşılığı

| Luca ürünü | Kaynak | Bizdeki karşılığı |
|---|---|---|
| **Luca Rota** (rota/dağıtım) | <https://www.luca.com.tr/Urun/Index/luca-rota-yazilimi/18> | Şoför mobil akışı; içerik **doğrulanacak** |
| **Luca Koza Rest API** ile diğer uygulamalarla senkron | `docs/plan-erp/02-LUCA-ENVANTERI.md:53` | Kendi açık API'si ve anahtar yönetimi |
| **StockMount** ile sanal mağaza, **Orion Pos** ile restoran senkronu | `02-LUCA-ENVANTERI.md:53` | Tedarikçi/pazaryeri portalı (kapsam sınırı ile) |
| **Online cari hesap mutabakatı** | `02-LUCA-ENVANTERI.md:50` | Müşteri portalında ekstre ve mutabakat |
| Luca Net'in fatura bilgilendirmesi ve BA-BS bilgi postası | `02-LUCA-ENVANTERI.md:31-32` | Bildirim şablonları ve gönderim günlüğü |

**doğrulanacak:** Luca'nın mobil uygulaması olup olmadığı (şoför ve yönetici için), varsa kapsamı;
Luca Rota'nın ekranları; Luca Koza Rest API'nin kapsamı, kimlik doğrulama yöntemi, oran sınırı ve
hangi verileri açtığı. Kaynak: Luca demo erişimi, satış/destek ekibi, API dokümanı. Bu belgede hiçbir
uç nokta ya da alan adı bu kaynaktan **uydurulmaz**.

## 3. Bizde bugün

Bu bölümdeki her iddia `dosya:satır` kanıtlıdır.

**Mobil uygulama — var olan.**

| Parça | Ne yapar | Kanıt |
|---|---|---|
| Tek uygulama, iki rol | Girişte role göre ekranlar açılır: `Driver` ya da ofis | `mobile/app.config.ts:3-7`, `mobile/src/app/_layout.tsx:16-19` |
| Şoför sefer listesi | Aktif/geçmiş sekmeleri, 60 sn yenileme, belge uyarıları | `mobile/src/app/sofor/index.tsx:18-30`, `:81-88`, `:124-137` |
| Şoför durum ve masraf | `POST /api/driver/trips/{id}/status`, masraf, fiş, ek dosya | `server/YesLojistik.Api/Controllers/DriverController.cs:56-58`, `:78-94`, `:100-110`, `:119-137` |
| Şoför profili | Araç plakası, firma telefonu, teslim fotoğrafı/imza zorunluluğu | `DriverController.cs:24-35` |
| Onay bekleyen masraf (mobil) | Yönetici onaylar/gerekçeyle reddeder | `mobile/src/app/yonetim/onay.tsx:28-55`, `:61-95` |
| Ofis gider girişi (mobil) | Fiş fotoğrafı, tedarikçi, vadeli seçeneği | `mobile/src/app/yonetim/gider.tsx:19-58` |
| Yönetici sekmeleri | Özet, seferler, cariler, harita, "daha" | `mobile/src/app/yonetim/(tabs)/_layout.tsx` (yol: `mobile/src/app/yonetim/tabs/_layout.tsx:16-32`) |
| Yönetici "daha" ekranı | Hızlı işlemler, bildirim tercihleri, web paneli bağlantısı | `mobile/src/app/yonetim/(tabs)/daha.tsx:24-48` |
| Çevrimdışı kuyruk | Telefonda kalıcı sıra, üstel geri çekilme (5 sn → 5 dk, altı adım), kalıcı hata bayrağı | `mobile/src/lib/outbox.ts:186-232`, `:177` |
| Kuyruk tetikleyicileri | Açılış, internet gelmesi, uygulama öne gelmesi, 30 sn tur | `mobile/src/lib/outbox.ts:240-249` |
| Bekleyenler ekranı | Tek tek tekrar dene / sil, hepsini gönder | `mobile/src/app/sofor/bekleyenler.tsx:7-32` |
| Kuyruk şeridi | Bekleyen ve hatalı işlem sayısı | `mobile/src/components/OutboxBanner.tsx:1-21` |
| Bulut nesnesi (dosya) | Fotoğraf gönderilmeden önce kalıcı klasöre kopyalanır | `mobile/src/lib/outbox.ts:79-99` |
| Kimlik bilgisi saklama | Cihazda `SecureStore`, web önizlemesinde `localStorage` | `mobile/src/lib/storage.ts:4-11` |
| Konum gönderimi | Toplu konum, arka plan izni, rıza kontrolü | `DriverController.cs:163-170`, `mobile/src/app/sofor/index.tsx:41-54` |
| Push kaydı | `/api/me/push-token` (web ve mobil ortak) | `server/YesLojistik.Api/Controllers/MeController.cs:21-41`, `mobile/src/lib/notifications.ts:18-35` |
| Bildirim tercihleri | Kullanıcı bazlı tür başına aç/kapat; şoförde liste boş | `MeController.cs:43-53`, `mobile/src/app/yonetim/(tabs)/daha.tsx:34-42` |
| Bildirim türleri | Yedi tür ve rol varsayılanları | `server/YesLojistik.Core/Entities/NotificationPreference.cs:4-26` |
| Müşteri takip bağlantısı | Token üretimi ve girişsiz takip sayfası | `TrackingController.cs:19-33`, `client/src/pages/PublicTrackingPage.tsx:28-37` |
| Takip sayfası içeriği | Aşama adımları, araç plakası, son konum, firma telefonu | `client/src/pages/PublicTrackingPage.tsx:69-96` |
| Bağlantı gönderimi | Durum değişince e-posta ile takip linki | `server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:26-54` |
| Marka bilgisi (girişsiz) | Firma adı ve logo | `server/YesLojistik.Api/Controllers/PublicController.cs:19-30` |

**Eksik olanlar.**

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | Teslim evrakı fotoğrafı akışı (ayrı iş) | Ek dosya ucu var (`DriverController.cs:119-137`) ama "teslim evrakı" türü ve onay durumu panelde yok |
| 2 | Şoför sayım ekranı | `mobile/src/app` altında sayım ekranı yok; sayım modülü planda (`docs/plan-erp/21-SAYIM-BARKOD.md:71-72`) |
| 3 | Yönetici onay kuyruğu (masraf dışında) | Onay listesi yalnız masraf: `mobile/src/app/yonetim/onay.tsx:33` |
| 4 | Yönetici özet kartları | Mobil özet ekranı var (`mobile/src/app/yonetim/(tabs)/index.tsx`) ama ERP onay kuyruğunu göstermiyor |
| 5 | Müşteri portalı (girişli alan) | Yalnız tek sevkiyat takibi var; ekstre/fatura/talep yok |
| 6 | Müşteri portalı girişi | Yeniden kullanılabilir bir müşteri oturumu yok (`UserRole` dört değerli: `Enums.cs:3`) |
| 7 | Tedarikçi portalı | Hiç yok; `Supplier` tablosu yalnız panel içi (`server/YesLojistik.Core/Entities/Supplier.cs:4`) |
| 8 | Kendi açık API'si | Bugün yalnız çerez/JWT oturumu var (`server/YesLojistik.Api/Program.cs:58-78`); anahtar tablosu yok |
| 9 | API anahtarı yönetimi | Yalnız yedek ucu tek başlıkla korunuyor (`server/YesLojistik.Api/Controllers/AdminController.cs:19-32`) |
| 10 | Müşteriye/tedarikçiye açık uçlarda oran sınırı | Politikalar: `login`, `public`, `backup` (`Program.cs:88-101`); yeni kovalar tanımlı değil |
| 11 | Mobil sayım/evrak için çakışma çözümü | `outbox` son-yazar-kazanır mantığında; sunucu tarafı sürüm alanı yok (`mobile/src/lib/outbox.ts:203-232`) |
| 12 | Push bildirim metinleri tek yerde | Metinler servis içinde dağıtılmış (`CustomerNotifier.cs:18-24`, `StaffNotifier`), şablon tablosu yok |
| 13 | Bildirim gönderim günlüğü | Push/e-posta gönderiminin başarı kaydı tutulmuyor |

## 4. Hedef ekranlar ve alanlar

Mobil ekranlar mevcut bileşenleri kullanır (`mobile/src/components/office.tsx`, `mobile/src/components/ui.tsx`);
panel ve portal ekranları `docs/plan-erp/01-ORTAK-SARTNAME.md:51-59` ortak parçalarını yeniden kullanır.
Klasik görünüm korunur (`client/src/lib/uiMode.ts:8`). Telefonda 44 px dokunma hedefi ve tam ekran
süzgeç kuralı geçerlidir.

### 4.1 Şoför: masraf girişi ve onay durumu

Bugünkü masraf formu (`mobile/src/app/yonetim/gider.tsx:63-79`) şoför tarafında genişletilir.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kategori | seçim | Evet | Mevcut kategori listesi korunur (`gider.tsx:14-17`) |
| Tarih | tarih | Evet | Varsayılan bugün; geçmiş 7 günden eski tarih gerekçe ister |
| Tutar | tutar | Evet | İki kuruş; büyük tutarda uyarı |
| Litre / Km | sayı | Yakıtta evet | Mevcut alanlar (`DriverController.cs:85-87`) |
| Açıklama | metin (200) | Hayır | — |
| Fiş fotoğrafı | kamera/galeri | Kategoriye göre | Yakıt, bakım, otoyol için zorunlu |
| Konum | otomatik | Hayır | Rıza varsa eklenir; kullanıcı kapatabilir |
| Sevkiyat | seçim | Evet (aktif sevkiyat varsa) | Sefer dışı masraf "genel" olarak işaretlenir |

**Onay durumu şeridi:** `Onay bekliyor` / `Onaylandı` / `Reddedildi (gerekçe)`. Reddedilen masraf
düzeltilip yeniden gönderilebilir; düzeltme **yeni kayıt** açar, eski kayıt iz olarak kalır.

### 4.2 Şoför: teslim evrakı fotoğrafı

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Evrak türü | seçim | Evet | İrsaliye, teslim tutanağı, tartı fişi, diğer |
| Fotoğraf | kamera | Evet | En az bir; en fazla 10 |
| Belge no | metin (30) | Hayır | İrsaliye no; panelde sefer alanına yazılır |
| Teslim alan | metin (100) | Evet | Mevcut `ReceivedBy` alanı (`DriverController.cs:58`) |
| Not | metin (300) | Hayır | — |
| İmza | çizim | Ayar açıksa evet | `RequireDeliverySignature` (`CompanySettings.cs:43`) |

**Kural:** ayar açıkken fotoğraf/imza yüklenmeden "Teslim Edildi" durumuna geçilemez
(`server/YesLojistik.Core/Entities/CompanySettings.cs:42-43`, `mobile/src/app/sofor/index.tsx` akışı).
Evrak fotoğrafı, panelde sefer
detayında "Teslim evrakı" bölümünde onay durumuyla görünür.

### 4.3 Şoför: sayım

Sayım ekranı `21-SAYIM-BARKOD.md` §4 ile aynı ekranı kullanır; mobil taraf eklenir.

| Alan | Tip | Zorunlu |
|---|---|---|
| Depo / araç | seçim | Evet |
| Kalem | barkod oku veya ara | Evet |
| Miktar | sayı | Evet |
| Birim | seçim (salt okunur, karttan) | — |
| Fotoğraf | kamera | Fark varsa evet |
| Not | metin (200) | Fark varsa evet |

**Kural:** sayım farkı **onaya** düşer; şoför kendi farkını onaylayamaz (`21-SAYIM-BARKOD.md:369`).

### 4.4 Yönetici mobil: onay kuyruğu ve özet

**Özet kartları (üst şerit):** bugünkü sevkiyat, bekleyen onay, gecikmiş tahsilat, vadesi yaklaşan
ödeme, kritik belge (muayene/sigorta). Her kart dokunulunca ilgili süzülmüş listeye gider.

**Onay kuyruğu (tek ekran, sekmeli):** masraf, fiş, indirim/tahsilat farkı, sayım farkı, tedarikçi
faturası. Her satırda tür, tutar, kim, ne zaman, belge bağlantısı. Eylemler: **Onayla**, **Reddet
(gerekçe)**, **Detay (web)**, **Belgeyi gör**.

### 4.5 Müşteri portalı

Giriş iki yoldan olur: (a) takip bağlantısı (girişsiz, yalnız o sevkiyat), (b) davetli müşteri
oturumu (ekstre, fatura, talep). İki yol aynı sayfa ailesini kullanır.

| Ekran | İçerik | Alanlar |
|---|---|---|
| Takip (mevcut) | Tek sevkiyat, aşamalar, plaka, son konum | Korunur (`PublicTrackingPage.tsx:53-98`) |
| Sevkiyatlarım | Geçmiş ve aktif sevkiyat listesi | Tarih, güzergâh, durum, evrak sayısı |
| Ekstre | Dönem ekstresi, borç/alacak/bakiye | Dönem seçimi, PDF indirme, e-posta ile isteme |
| Faturalarım | Kesilen faturalar | Fatura no, tarih, tutar, PDF indirme, e-Arşiv bağlantısı |
| Taleplerim | Yeni talep açma ve takip | Konu, açıklama (1000), dosya (5), durum, yanıtlar |
| Bilgilerim | Ünvan, VKN, adres, yetkili, e-posta | Düzeltme talebi (doğrudan yazma yok) |

**Kural:** müşteri **maliyet, kâr, taşeron fiyatı, komisyon ve şoför özel verisi görmez**; yalnız kendi
faturaları ve kendi sevkiyatları. Plaka takip sayfasında maskelenebilir
(`server/YesLojistik.Infrastructure/Services/TrackingService.cs` içindeki `MaskPlate`).

### 4.6 Tedarikçi portalı (kapsam sınırı ile)

| Ekran | İçerik | Kapsam sınırı |
|---|---|---|
| Siparişlerim | Kendi siparişleri, teslim bekleyen kalemler | Fiyat görür; başka tedarikçinin verisi görünmez |
| İrsaliye bildir | Sevk edilen kalem, miktar, irsaliye no | Mal kabul **yok**; kabul panelde yapılır |
| Fatura yükle | Fatura dosyası (PDF/XML) + tutar + tarih | Fatura **onaylanmaz**; panelde eşleştirilir |
| Ödemelerim | Vadesi gelen ve ödenen tutarlar | Kısmi ödeme detayı panelde |
| Bilgilerim | Ünvan, VKN, IBAN (maskeli), yetkili | IBAN değişikliği **onaya** düşer |

**Kapsam sınırı (açıkça):** tedarikçi portalı **muhasebe kaydı oluşturmaz**, stok hareketi yazmaz,
fiyat teklifi vermez, ihaleye katılmaz. Yalnız belge bildirir ve kendi durumunu görür. Amaç: fatura ve
irsaliyenin panele **zamanında** ulaşması (`docs/plan-erp/12-SATIN-ALMA.md` ile bağlantılı).

### 4.7 Açık API ve anahtar ekranı (Ayarlar → API)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Anahtar adı | metin (50) | Evet | "Muhasebe programı", "Müşteri portalı" |
| Kapsamlar | çoklu seçim | Evet | `shipments.read`, `statements.read`, `invoices.read`, `suppliers.read` |
| Bitiş tarihi | tarih | Hayır | Boşsa süresiz; 12 ay önerilir |
| IP kısıtı | metin (200) | Hayır | Virgülle ayrılmış liste |
| Etkin | anahtar | Evet | Kapalıysa 401 |
| Son kullanım | salt okunur | — | Zaman ve çağrı sayısı |

**Kural:** anahtar **bir kez** gösterilir; sunucuda yalnız özeti (hash) saklanır
(`27-ENTEGRASYONLAR.md` §6 `ApiKey`). Kapsam dışı uç 403 döner.

## 5. İş kuralları

### 5.1 Çevrimdışı çalışma ve senkron

Bugünkü desen korunur ve genelleştirilir (`mobile/src/lib/outbox.ts`):

1. **Önce telefona yaz.** Her işlem (durum, masraf, fotoğraf, imza, sayım, evrak) önce cihaza yazılır;
   internet yoksa kaybolmaz (`outbox.ts:9-13`).
2. **Sıra korunur.** Aynı sevkiyatın işlemleri sırayla gider: önce fotoğraf/imza, sonra "Teslim Edildi"
   (`outbox.ts:182-185`).
3. **Kalıcı hata tekrar denenmez.** 4xx hatası `failed` işaretlenir; kullanıcı "Tekrar dene" ya da "Sil"
   demeden gönderilmez (`outbox.ts:34-35`, `:218-227`).
4. **Geçici hata geri çekilmeli denenir.** 5 sn'den başlayıp 5 dakikaya kadar uzayan bekleme
   (`outbox.ts:224`); bağlantı yoksa tur durur (`outbox.ts:228-229`).
5. **Idempotency zorunlu.** Her işlem kendi kimliğini `Idempotency-Key` olarak gönderir; aynı işlem iki
   kez ulaşırsa tek kayıt olur (`DriverController.cs:75-77`, `:96-97`, `:126`).
6. **Dosya güvenliği.** Fotoğraf önbellekten kalıcı klasöre kopyalanır; işlem gönderilince silinir
   (`outbox.ts:79-99`, `:101-109`).
7. **Çıkışta uyarı.** Gönderilmemiş işlem varken çıkışta onay istenir (`mobile/src/app/sofor/index.tsx:56-61`).
8. **Yeni kural — çakışma (conflict).** Sunucu, kaydın sürümünü döner. İki cihaz aynı masrafı ya da
   sayım satırını değiştirdiyse **son yazan kazanmaz**: sunucu `409` ve iki sürümü döner, kullanıcıya
   "Bu kayıt başka bir cihazda değişti" denir ve fark gösterilir. Bu kural bugün yoktur.
9. **Yeni kural — saat kayması.** Cihaz saati sunucudan 5 dakikadan fazla sapıyorsa işlem
   `RecordedAt` alanıyla birlikte gönderilir; sunucu kabul edilen zamanı yazar
   (`DriverController.cs:163-170` konum deseniyle aynı yaklaşım).
10. **Yeni kural — kuyruk boyutu.** Kuyruk 500 işlemi geçerse kullanıcıya uyarı; 1.000'de yeni işlem
    engellenir (cihaz depolaması şişmesin).

### 5.2 Push bildirim

- **Kime:** ofis kullanıcılarına (rol varsayılanı `NotificationPreference.Default`,
  `NotificationPreference.cs:19-26`) ve müşteriye e-posta (bugünkü yol,
  `CustomerNotifier.cs:26-54`). Şoföre push bugün yalnız görev bildirimi için kullanılır.
- **Ne zaman:** (a) sevkiyat atandı/değişti, (b) masraf onay bekliyor / onaylandı / reddedildi,
  (c) evrak yüklendi, (d) teslim edildi, (e) fatura vadesi geçti, (f) ödeme günü yaklaştı,
  (g) belge süresi yaklaştı (bugünkü yedi tür: `NotificationPreference.cs:6`), (h) **yeni:** fiş
  onayı bekliyor, sayım farkı onayı bekliyor, tedarikçi fatura yükledi.
- **Kanallar:** push (telefon), e-posta, SMS (opsiyonel). Kanal seçimi kullanıcı tercihinde tür
  bazında tutulur; SMS varsayılan **kapalı** (ücretli kanal).
- **Tekilleştirme:** aynı olay + aynı alıcı için 5 dakika içinde ikinci bildirim gönderilmez.
- **Gönderim günlüğü:** kanal, alıcı (maskeli), şablon kodu, sonuç, hata kodu, zaman. Gizli bilgi
  günlüğe yazılmaz (`27-ENTEGRASYONLAR.md` §5.3).
- **Sessiz saat:** 22:00-07:00 arası yalnız "kritik" olaylar gönderilir (kullanıcı tercihi).
- **Şablon:** tüm metinler tek tabloda; kod içinde dağıtılmaz. Şablon değişikliği denetim izine yazılır.
- **doğrulanacak:** sağlayıcı sınırları (Expo push günlük sınırı, SMS karakter/başlık kuralları) ve
  müşteriye SMS göndermek için açık rıza metni. Kaynak: sağlayıcı sözleşmesi + **avukat onayı**.

### 5.3 Açık API

| Kural | Ayrıntı |
|---|---|
| Kimlik doğrulama | `X-Api-Key` başlığı; anahtar yalnız özet olarak saklanır |
| Kapsam | Her uç bir kapsam ister; kapsam yoksa 403 |
| Sürümleme | Yol `/api/public/v1/...`; kırıcı değişiklik yeni sürüm |
| Oran sınırı | Anahtar başına dakikalık sınır (`27-ENTEGRASYONLAR.md` §5.5) |
| Sayfalama | Sayfa boyu en çok 200; imleç tabanlı |
| Tarih/sayı biçimi | ISO 8601 tarih, JSON sayı; ekranda `03.10.2026`, `45.000,00 TL` (`client/src/lib/format.ts:1-15`) |
| Hata biçimi | `ProblemDetails`, Türkçe `title`, alan hataları `errors` |
| İz | Her yanıt `X-Request-Id` döner; istek çağrı günlüğüne yazılır |
| Kapsam dışı | İş verisi **yazma** ilk sürümde yok; yazma uçları ayrı kapsam ve ayrı sürümle gelir |
| KVKK | Kişisel veri (şoför adı, telefon) API'de varsayılan **kapalı**; kapsam açılırsa sözleşme gerekir |

### 5.4 Portal güvenliği

- **Müşteri oturumu ayrıdır.** Ofis oturumu ile müşteri oturumu aynı çerez adını kullanmaz; müşteri
  oturumu ofis uçlarına erişemez.
- **Müşteri-kayıt bağı.** Müşteri portalı oturumu bir `Customer` kaydına bağlıdır; başka müşterinin
  verisi firma süzgeciyle değil **sahiplik** denetimiyle engellenir.
- **Davet akışı.** Müşteri daveti e-posta ile gider; bağlantı tek kullanımlık ve 72 saat geçerlidir.
  Parola müşteri belirler; panel hiçbir yerde parola görmez.
- **Tedarikçi oturumu** aynı kuralla `Supplier` kaydına bağlıdır. Tedarikçi, kendi IBAN değişikliğini
  **onaya** gönderir; doğrudan yazamaz (dolandırıcılık riski).
- **Takip linki** (girişsiz) yalnız tek sevkiyatı gösterir; toplu liste, ekstre ve fatura **vermez**.
  Süresi dolan link 404 döner (`TrackingController.cs:33`).
- **Oran sınırı:** portal uçları `portal` kovasına bağlanır; takip ucu bugünkü `public` kovasını
  korur (`Program.cs:94-97`).

### 5.5 Mobil-panel tutarlılığı

- Telefonda yapılan işlem **aynı** iş kuralından geçer; mobil için ayrı kural yazılmaz.
- Mobil ekranda tutar iki kuruş, tarih `03.10.2026`, plaka büyük harf boşluklu gösterilir.
- Yetki kontrolü paneldeki kuralla aynıdır; mobildeki karşılığı `mobile/src/lib/permissions.ts:1-14`
  ve paneldeki `client/src/lib/auth.tsx:6`, `:77` aynı üç izni kullanır.
- Yeni bir ERP ekranı telefonda gerekmiyorsa mobil menüye **eklenmez**; "daha" ekranı kullanıcıyı web
  paneline yönlendirmeye devam eder (`mobile/src/app/yonetim/(tabs)/daha.tsx:45`).

## 6. Veri modeli

Yeni tablolar `05-VERI-MODELI.md` kararlarına uyar; `CompanyId` taşır; migration **yalnız ekleme**.

**`PortalAccount` (Y).** Amaç: müşteri ve tedarikçi portal oturumu. Alanlar: `Id`, `CompanyId`,
`Kind` (`Customer`/`Supplier`), `OwnerId` (müşteri ya da tedarikçi kimliği), `Email`, `PasswordHash`,
`FullName`, `IsActive`, `InvitedAt`, `InviteTokenHash`, `InviteExpiresAt`, `LastLoginAt`,
`FailedLoginCount`, `LockoutUntil`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `IsDeleted`. İndeksler:
tekil `(company_id, kind, owner_id, email)`; `(invite_token_hash)`.

**`PortalRequest` (Y).** Amaç: müşteri/tedarikçi talebi ve yazışma. Alanlar: `Id`, `CompanyId`,
`PortalAccountId`, `Kind` (`Question`/`Document`/`Correction`/`InvoiceUpload`), `Subject` (150),
`Text` (2000), `Status` (`Open`/`Answered`/`Closed`), `RelatedType`, `RelatedId`, `CreatedAt`,
`ClosedAt`, `ClosedBy`. İndeksler: `(company_id, status, created_at)`; `(portal_account_id)`.

**`PortalRequestMessage` (Y).** Alanlar: `Id`, `CompanyId`, `PortalRequestId`, `AuthorSide`
(`Company`/`Portal`), `AuthorUserId` (boş olabilir), `Text` (2000), `CreatedAt`. İndeks:
`(portal_request_id, created_at)`.

**`ApiKey` (Y).** `27-ENTEGRASYONLAR.md` §6 ile aynı tablo: `Id`, `CompanyId`, `Name`, `Prefix`,
`Hash`, `ScopesJson`, `IpAllowList`, `IsActive`, `ExpiresAt`, `LastUsedAt`, `CreatedAt`, `RevokedAt`.

**`NotificationTemplate` (Y).** Amaç: bildirim metinlerini tek yere toplamak. Alanlar: `Id`,
`CompanyId`, `EventCode` (`trip.assigned`, `expense.pending`, `invoice.overdue`...), `Channel`
(`Push`/`Email`/`Sms`), `Subject` (150), `Body` (2000), `IsActive`, `UpdatedAt`, `UpdatedBy`.
İndeks: tekil `(company_id, event_code, channel)`.

**`NotificationLog` (Y).** Alanlar: `Id`, `CompanyId`, `EventCode`, `Channel`, `RecipientMasked`,
`UserId` (boş olabilir), `PortalAccountId` (boş olabilir), `Status` (`Sent`/`Failed`/`Skipped`),
`ErrorCode`, `ProviderRef`, `At`. İndeksler: `(company_id, at)`; `(event_code, at)`.

**`DeliveryDocument` (Y).** Amaç: teslim evrakı ve onayı. Alanlar: `Id`, `CompanyId`, `TripId`,
`Kind` (`Waybill`/`DeliveryNote`/`Weighbridge`/`Other`), `DocumentNo` (30), `ReceivedBy` (100),
`Note` (300), `ApprovalStatus` (`Pending`/`Approved`/`Rejected`), `RejectionReason` (300),
`UploadedByUserId`, `UploadedAt`, `ReviewedBy`, `ReviewedAt`. İndeksler: `(company_id, trip_id)`;
`(company_id, approval_status)`. (Ek dosyalar mevcut `TripAttachment` tablosunda kalır —
`server/YesLojistik.Core/Entities/TripAttachment.cs:4` — bu tablo yalnız evrakın **üst verisini** tutar.)

**`SyncConflict` (Y).** Amaç: çakışan çevrimdışı işlemin izi ve kararı. Alanlar: `Id`, `CompanyId`,
`EntityType`, `EntityId`, `ClientRequestId` (Guid), `IncomingJson`, `CurrentJson`, `DetectedAt`,
`ResolvedAt`, `Resolution` (`ClientWins`/`ServerWins`/`Merged`), `ResolvedByUserId`. İndeks:
tekil `(company_id, entity_type, entity_id, client_request_id)`.

**Mevcut tablolara eklenenler.** `Trip` → `RowVersion bytea?` (çakışma denetimi için; ilk aşamada
boş olabilir). `TripAttachment` → `RowVersion bytea?`. `User` → `QuietHoursFrom time?`,
`QuietHoursTo time?`. `PushToken` → `LastOkAt DateTime?`, `LastErrorCode string(40)?`. `Supplier` →
`PortalEnabled bool` (varsayılan `false`). `Customer` → `PortalEnabled bool` (varsayılan `false`).
Silme/dönüştürme yok; canlı veritabanı açılışta migrate edilir
(`server/YesLojistik.Api/Program.cs:141-145`).

## 7. API uçları

**Mobil (mevcut uçlar korunur, yenileri eklenir).**

| Metot | Yol | Ne yapar | Yetki |
|---|---|---|---|
| GET | `/api/driver/me` | Profil, plaka, firma telefonu, zorunluluklar | `Driver` (mevcut) |
| GET | `/api/driver/trips?scope=` | Sevkiyat listesi | `Driver` (mevcut) |
| POST | `/api/driver/trips/{id}/status` | Durum değiştir (idempotent başlık destekli) | `Driver` (mevcut) |
| POST | `/api/driver/trips/{id}/expenses` | Masraf ekle | `Driver` (mevcut) |
| POST | `/api/driver/expenses/{expenseId}/receipt` | Fiş fotoğrafı | `Driver` (mevcut) |
| POST | `/api/driver/trips/{id}/attachments` | Fotoğraf/imza/evrak yükle | `Driver` (mevcut) |
| **POST** | **`/api/driver/trips/{id}/delivery-document`** | **Teslim evrakı bildir** | `Driver` (yeni) |
| **GET** | **`/api/driver/expenses?status=`** | Kendi masrafları ve onay durumu | `Driver` (yeni) |
| **POST** | **`/api/driver/counts`** | Sayım satırı gönder (kuyruklu) | `Driver` (yeni) |
| GET | `/api/me/notification-preferences` | Bildirim tercihleri | Oturum (mevcut) |
| POST | `/api/me/push-token` | Telefon bildirim adresi | Oturum (mevcut) |

**Yönetici mobil.**

| Metot | Yol | Ne yapar | Yetki |
|---|---|---|---|
| GET | `/api/mobile/summary` | Özet kartları | `operations` |
| GET | `/api/mobile/approvals?type=` | Onay kuyruğu (masraf, fiş, sayım, fatura) | `accounting` / `operations` |
| POST | `/api/mobile/approvals/{type}/{id}/approve` | Onayla | Tür bazlı |
| POST | `/api/mobile/approvals/{type}/{id}/reject` | Gerekçeyle reddet | Tür bazlı |

**Müşteri portalı.**

| Metot | Yol | Ne yapar | Yetki |
|---|---|---|---|
| POST | `/api/portal/auth/login` | Müşteri/tedarikçi girişi | Anonim + oran sınırı |
| POST | `/api/portal/auth/invite/accept` | Daveti kabul et, parola belirle | Anonim + tek kullanımlık token |
| GET | `/api/portal/shipments` | Kendi sevkiyatları | Portal oturumu |
| GET | `/api/portal/statements?from=&to=` | Ekstre (JSON/PDF) | Portal oturumu |
| GET | `/api/portal/invoices` | Faturalar ve PDF | Portal oturumu |
| GET | `/api/portal/requests` | Talepler | Portal oturumu |
| POST | `/api/portal/requests` | Talep aç | Portal oturumu |
| POST | `/api/portal/requests/{id}/messages` | Yanıt yaz | Portal oturumu |
| GET | `/api/public/track/{token}` | Girişsiz takip (mevcut) | Anonim + `public` kovası |

**Tedarikçi portalı.**

| Metot | Yol | Ne yapar | Yetki |
|---|---|---|---|
| GET | `/api/portal/supplier/orders` | Siparişler | Portal oturumu |
| POST | `/api/portal/supplier/orders/{id}/dispatch` | İrsaliye bildir | Portal oturumu |
| POST | `/api/portal/supplier/invoices` | Fatura yükle (dosya + tutar + tarih) | Portal oturumu |
| GET | `/api/portal/supplier/payments` | Ödeme durumu | Portal oturumu |
| POST | `/api/portal/supplier/bank-account` | IBAN değişikliği **talebi** | Portal oturumu + onay |

**Açık API.**

| Metot | Yol | Ne yapar | Kapsam |
|---|---|---|---|
| GET | `/api/public/v1/shipments` | Sevkiyat listesi (tarih, durum süzgeci) | `shipments.read` |
| GET | `/api/public/v1/shipments/{id}` | Sevkiyat detayı (maskeli kişisel veri) | `shipments.read` |
| GET | `/api/public/v1/statements/{customerId}` | Cari ekstre | `statements.read` |
| GET | `/api/public/v1/invoices` | Fatura listesi | `invoices.read` |
| GET | `/api/public/v1/suppliers` | Tedarikçi listesi | `suppliers.read` |
| GET | `/api/public/v1/health` | Servis durumu (anahtarsız) | — |

**Kurallar.** (a) Portal uçları **firma + sahiplik** denetimi yapar. (b) Açık API ilk sürümde yalnız
okuma. (c) Yazma uçları `Idempotency-Key` kabul eder (`DriverController.cs:80` deseni). (d) Bütün
yanıtlar `ProblemDetails` biçiminde ve Türkçe. (e) Her uç çevrimdışı kuyruktan gelebilecek **tekrarlı**
isteğe dayanıklıdır.

## 8. Yetki, onay ve denetim izi

| İş | Şoför | Operasyon | Muhasebe | Yönetici | Müşteri | Tedarikçi |
|---|---|---|---|---|---|---|
| Sevkiyat durumu değiştir | Kendi sevkiyatı | Evet | — | Evet | — | — |
| Masraf gir | Kendi sevkiyatı | Evet | Evet | Evet | — | — |
| Masraf onayla | **Hayır** | Evet | Evet | Evet | — | — |
| Teslim evrakı yükle | Kendi sevkiyatı | Evet | — | Evet | — | — |
| Teslim evrakı onayla | Hayır | Evet | — | Evet | — | — |
| Sayım yap | Kendi aracı | Evet | — | Evet | — | — |
| Sayım farkı onayla | **Hayır** | Evet | Evet | Evet | — | — |
| Kendi ekstresini gör | — | — | — | — | Evet | Evet |
| Fatura indir | — | — | — | — | Kendi faturaları | Kendi faturaları |
| Talep aç | — | — | — | — | Evet | Evet |
| Fatura yükle | — | — | — | — | — | Evet |
| Anahtar üret | — | — | — | Evet | — | — |

**Maker-checker.** Şoförün girdiği masraf ve sayım farkı, giren kişi tarafından onaylanamaz
(`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:264` mantığı). Şoför kendi masrafını düzenleyip
yeniden gönderebilir ama onaylayamaz.

**Denetim izi.** Ayrı satır olarak yazılır: portal daveti gönderildi/kabul edildi, portal girişi
(başarılı/başarısız), ekstre görüntülendi/indirildi, fatura indirildi, talep açıldı/kapatıldı,
tedarikçi fatura yükledi, IBAN değişiklik talebi (eski/yeni maskeli), API anahtarı üretildi/iptal
edildi, API çağrısı (anahtar öneki + uç), çakışma çözümü, teslim evrakı onayı/reddi. Bugünkü
`AuditTrail` yalnız veri değişikliğini yazar
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-56`); bu olaylar elle yazılır —
`server/YesLojistik.Api/Controllers/UsersController.cs:42` deseniyle.

## 9. Kabul kriterleri

1. **Çevrimdışı kayıp yok.** Uçak modunda girilen masraf, fotoğraf, imza ve sayım; internet gelince
   kendiliğinden gider; uygulama kapatılıp açılsa da kaybolmaz (`outbox.ts:49-64`, `:240-249`).
2. **Çift kayıt yok.** Aynı işlem iki kez gönderildiğinde tek kayıt oluşur
   (`DriverController.cs:96-97`, `:126`).
3. **Sıra.** Fotoğraf/imza yüklenmeden "Teslim Edildi" gönderilmez; ayar açıksa sunucu da reddeder.
4. **Masraf onayı.** Şoför kendi masrafını onaylayamaz; reddedilen masrafın gerekçesi telefonda görünür.
5. **Çakışma.** İki cihaz aynı kaydı değiştirdiğinde çakışma ekranı çıkar; sessiz üzerine yazma olmaz.
6. **Takip linki sınırı.** Takip bağlantısı yalnız tek sevkiyatı gösterir; ekstre, fatura ve liste
   **vermez**; süresi dolan link 404 döner.
7. **Portal izolasyonu.** Müşteri A'nın oturumuyla müşteri B'nin sevkiyatı, ekstresi ya da faturası
   alınamaz (parametreli test, 10 uç).
8. **Gizli alan.** Müşteri ve tedarikçi yanıtlarında maliyet, kâr, komisyon, prim ve şoför özel
   verisi **yoktur**.
9. **Kapsam.** Kapsamı olmayan anahtar 403 alır; kapsam listesi yanıtta görünür.
10. **Anahtar güvenliği.** API anahtarı düz metin olarak ne veritabanında ne günlükte bulunur; yalnız
    önek görünür.
11. **Oran sınırı.** Portal ve açık API kovaları aşıldığında 429 + `Retry-After`; giriş sınırı
    etkilenmez.
12. **Bildirim tercihi.** Kapalı tür için bildirim gitmez; sessiz saatte yalnız kritik olay gider.
13. **Bildirim günlüğü.** Her gönderim (başarılı/başarısız) günlükte; gizli bilgi yok.
14. **Tedarikçi sınırı.** Tedarikçi portalı stok hareketi ve muhasebe kaydı oluşturamaz; IBAN
    değişikliği onaya düşer.
15. **Mobil-panel tutarlılığı.** Aynı işlem telefonda ve panelde aynı sonucu verir; tutar/tarih
    biçimleri aynıdır (`client/src/lib/format.ts:1-15`).
16. **Mevcut akış bozulmaz.** Bugünkü takip sayfası, şoför sefer akışı ve bildirim tercihleri
    değişmeden çalışmaya devam eder.

## 10. Testler

**Sunucu birim testleri (`server/YesLojistik.Tests/Unit`).**

| Dosya | Ne sınar |
|---|---|
| `ApiKeyScopeTests.cs` | Kapsam denetimi; eksik kapsam 403; süresi geçmiş anahtar 401 |
| `PortalInviteTests.cs` | Davet token'ı tek kullanımlık ve 72 saat; süre bitince reddedilir |
| `ConflictResolutionTests.cs` | Aynı kaydın iki sürümü; çakışma kaydı ve karar |
| `NotificationTemplateTests.cs` | Şablon değişken yerleştirme; eksik değişken hatası; sessiz saat kuralı |

**Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration`).** Bugünkü desen:
`WebApplicationFactory` + gerçek PostgreSQL (`server/YesLojistik.Tests/Integration/ApiFactory.cs`);
şoför akışının mevcut testleri korunur (`server/YesLojistik.Tests/Integration/DriverAppTests.cs:252`,
`:269` içindeki `Idempotency-Key` senaryoları).

| Dosya | Senaryo |
|---|---|
| `MobileApprovalTests.cs` | Onay kuyruğu; şoförün kendi masrafını onaylayamaması (403); gerekçeli ret |
| `DeliveryDocumentTests.cs` | Evrak yükle → onayla/reddet; fotoğraf zorunluluğu; durum geçişi engeli |
| `PortalAuthTests.cs` | Davet, giriş, kilit, oran sınırı; ofis oturumunun portal ucuna erişememesi |
| `PortalIsolationTests.cs` | Müşteri A ≠ müşteri B; tedarikçi A ≠ tedarikçi B (parametreli uç taraması) |
| `OpenApiTests.cs` | Kapsam, sayfalama, `X-Request-Id`, ProblemDetails biçimi |
| `PushNotificationTests.cs` | Tercih kapalıysa gönderim yok; günlük kaydı; tekilleştirme (`FakePushSender` kullanılır) |

**Panel uçtan uca testleri (`client/e2e`).** Mevcut testler `tracking.spec.ts`, `mobile.spec.ts`,
`driver-app.spec.ts`, `office-app.spec.ts` dosyalarıdır; yenileri eklenir.

| Dosya | Senaryo |
|---|---|
| `musteri-portali.spec.ts` | Davet → giriş → sevkiyat listesi → ekstre → fatura indir → talep aç |
| `tedarikci-portali.spec.ts` | Giriş → sipariş gör → irsaliye bildir → fatura yükle → IBAN talebi |
| `api-anahtarlari.spec.ts` | Anahtar üret → kapsam seç → kapsam dışı uçta 403 → iptal |
| `new-ui/musteri-portali.spec.ts` | Aynı akış yeni görünümde (`uiMode.ts:8` anahtarının arkasında) |

**Mobil testler.** Şoför akışının mobil web önizlemesi CI'da koşar (`AGENTS.md` §4); yeni akışlar
`client/e2e/driver-app.spec.ts` dosyasına senaryo olarak eklenir. Çevrimdışı senaryo: ağ kes →
işlem gir → ağ aç → işin gittiğini doğrula. Testler uydurma veri kullanır (`AGENTS.md` §3.3).

## 11. Efor ve bağımlılıklar

| İş kalemi | Kişi-gün | Önce bitmeli |
|---|---|---|
| Şoför masraf onay durumu + reddedilen masrafı düzeltme | 5-7 | — (mevcut uçlar var) |
| Teslim evrakı akışı (üst veri + panel onayı) | 6-9 | `26-DOKUMAN-YONETIMI.md` (arşiv) |
| Şoför sayım ekranı (kuyruklu) | 6-9 | `21-SAYIM-BARKOD.md`, `10` (stok) |
| Yönetici onay kuyruğu + özet kartları | 8-12 | `07` (onay altyapısı) |
| Müşteri portalı (oturum, listeler, ekstre, fatura, talep) | 18-26 | `09` (ekstre), `11` (fatura PDF) |
| Tedarikçi portalı (sipariş, irsaliye, fatura yükleme) | 12-18 | `12-SATIN-ALMA.md` |
| Açık API + anahtar yönetimi + oran sınırı | 10-15 | `27-ENTEGRASYONLAR.md` (§5.5, §6) |
| Çakışma çözümü (sürüm alanı + ekran) | 6-9 | Çevrimdışı kuyruk |
| Bildirim şablonları + günlük + sessiz saat | 6-9 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` |
| Testler (birim + entegrasyon + e2e + mobil) | 14-20 | Her kalemle birlikte |
| **Toplam** | **91-134** | — |

**Sıra.** (1) Masraf onay durumu ve evrak akışı (en çok acı çeken iki iş), (2) yönetici onay kuyruğu,
(3) portal oturumu ve müşteri portalı, (4) tedarikçi portalı, (5) açık API ve anahtar yönetimi,
(6) çakışma çözümü, (7) bildirim şablonları. Açık API, portal oturumu olgunlaşmadan yazılmaz: aynı
yetki ve maskeleme kurallarını paylaşırlar.

**Bağımlılıklar.** `27-ENTEGRASYONLAR.md` (anahtar, kuyruk, oran sınırı, günlük),
`30-COK-SIRKETLI-KONSOLIDASYON.md` (portalın firma sınırı), `09-CARI-YONETIMI.md` (ekstre),
`11-SATIS-FATURA.md` (fatura PDF ve e-Arşiv bağlantısı), `12-SATIN-ALMA.md` (tedarikçi sipariş ve
fatura), `21-SAYIM-BARKOD.md` (sayım ekranı), `26-DOKUMAN-YONETIMI.md` (belge arşivi),
`33-BILDIRIM-EPOSTA-SMS-KEP.md` (kanallar ve şablonlar), `35-DENETIM-IZI-KVKK-UYUM.md` (portal
gizlilik metinleri ve saklama), `38-GUVENLIK.md` (anahtar ve oturum güvenliği).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma | Geri alma |
|---|---|---|---|
| Çevrimdışı kuyrukta veri kaybı | Yüksek | Kalıcı depolama + dosya kopyası; çıkışta uyarı; boyut sınırı | Bekleyenler ekranından elle gönderim |
| Sessiz çakışma (iki cihaz aynı kaydı ezer) | Yüksek | Sürüm alanı + 409 + çakışma ekranı | Sunucu sürümü geçerli sayılır |
| Portal oturumunun ofis oturumuna yükselmesi | Çok yüksek | Ayrı çerez adı, ayrı politika, sahiplik denetimi, izolasyon testi | Portal kapatılır |
| Müşterinin maliyet/kâr görmesi | Yüksek | Yanıt modelinde alan yok; parametreli test | Alan kapatılır, kayıt incelenir |
| API anahtarının sızması | Yüksek | Yalnız hash saklama; kapsam; IP kısıtı; süre; iptal; çağrı günlüğü | Anahtar iptal edilir |
| Push bildiriminin gürültüye dönüşmesi | Orta | Kullanıcı tercihi, sessiz saat, tekilleştirme, günlük özet | Tür kapatılır |
| Tedarikçi portalında sahte IBAN değişikliği | Yüksek | Değişiklik yalnız **talep**; onay + denetim izi + eski/yeni maskeli gösterim | Talep reddedilir |
| Bildirim günlüğünde kişisel veri birikmesi | Orta | Alıcı maskeli; saklama süresi; KVKK akışı (`35` belgesi) | Arşiv ve imha |
| Sayım farkının şoför tarafından onaylanması | Orta | Maker-checker; fark gerekçesi zorunlu | Kural sıkılaştırılır |
| Mobil ekran sayısının şişmesi | Düşük | Yalnız gerçekten telefonda gereken işler; "daha" ekranı web'e yönlendirir | Ekran kaldırılır |

**doğrulanacak:**

1. **Luca'nın mobil uygulaması** var mı, hangi rollere hitap ediyor, hangi ekranları var. Kaynak: Luca
   demo erişimi, tanıtım materyali.
2. **Luca Koza Rest API kapsamı** — hangi veriler, hangi kimlik doğrulama, oran sınırı, ücret. Kaynak:
   Luca API dokümanı ve satış ekibi.
3. **Luca Rota kapsamı** — rota/dağıtım özellikleri bizim şoför akışına örnek olur mu. Kaynak: Luca
   ürün sayfası ve demo.
4. **Portal açılırken gereken hukuki metinler:** müşteri/tedarikçi kullanım şartları, KVKK aydınlatma,
   veri işleme sözleşmesi, portal davetinin hukuki niteliği. Kaynak: **avukat onayı**; bu belge metin
   yazmaz, yalnız yerini gösterir (`docs/hukuk/`).
5. **SMS ile bildirim için açık rıza** gerekip gerekmediği ve metni. Kaynak: **avukat + mali müşavir**;
   mevzuat yorumu yapılmaz.
6. **Push sağlayıcı sınırları:** günlük/aylık bildirim sınırı, ücret, teslim raporu. Kaynak: sağlayıcı
   sözleşmesi (`docs/SATIS-PLANI.md` bekleyenler listesi).
7. **Açık API'de kişisel veri paylaşımı** — şoför adı/telefonu verilecek mi, hangi sözleşmeyle. Kaynak:
   avukat + kullanıcı kararı.
8. **Tedarikçi portalında fiyat görünürlüğü** — tedarikçi yalnız kendi fiyatını mı, yoksa sevkiyat
   bazlı maliyeti de mi görür. Kaynak: kullanıcı kararı.
9. **Müşteri portalında ekstre kapsamı** — hangi dönem, hangi fatura türü, itiraz süresi. Kaynak: mali
   müşavir/kullanıcı.
10. **Çakışma çözümünde hangi alanların çakışabildiği** (durum, tutar, açıklama, fotoğraf). Kaynak:
    saha kullanımı ve kullanıcı kararı.

Sonraki belgeyle bağlantı: `30-COK-SIRKETLI-KONSOLIDASYON.md` portalın ve API'nin firma sınırını
tanımlar; `27-ENTEGRASYONLAR.md` anahtar, kuyruk ve oran sınırı altyapısını verir;
`33-BILDIRIM-EPOSTA-SMS-KEP.md` kanalların şablon ve günlük tarafını tamamlar.
