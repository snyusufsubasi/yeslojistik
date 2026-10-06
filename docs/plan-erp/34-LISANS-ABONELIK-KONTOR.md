# 34 — Lisans, Abonelik ve Kontör

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir/avukat
onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, çalışan lisans altyapısını **paket/modül bazlı aboneliğe** ve **tüketim (kontör) modeline**
genişletir. Bugün imzalı bir lisans anahtarı vardır: ECDSA P-256 ile imzalanır
(`server/YesLojistik.Core/Licensing/LicenseToken.cs:33-37`), çevrimdışı doğrulanır (`:71-102`), araç
sınırı uygulanır (`server/YesLojistik.Infrastructure/Services/LicenseService.cs:51-57`) ve süre bitince
panel salt okunur olur (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:22-41`). Anahtarın içinde
zaten bir **özellik listesi** (`Features`) vardır ve bir **özellik kapısı** hazırdır
(`LicenseInfo.Has`, `server/YesLojistik.Core/Licensing/LicenseInfo.cs:27-32`). Ancak bu kapı üretim
kodunda **hiç çağrılmaz**; yalnız testlerde ve belge yorumlarında geçer
(`server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:90`, `server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:122-126`).
Bu dokümanın **birinci işi bu kapıyı kurmaktır.** Kapsam:

- **Paket/modül bazlı lisanslama**: paket → modül matrisi, modül açma/kapama, menü ve uç kapısı.
- **Modül kapısının üretimde çalışması**: yazma uçlarında zorunlu, okuma uçlarında bilgilendirici.
- **Kullanıcı sayısı limiti**: ofis kullanıcıları sayılır, şoför hesabı sayılmaz.
- **Kontör/kredi modeli**: e-belge gönderimi, SMS, KEP gibi tüketim kalemleri; bakiye, harcama,
  yükleme ve uyarı eşiği.
- **Deneme süresi**: 30 gün, modül kısıtı, bitişte davranış.
- **Abonelik yenileme ve hatırlatma**: bitişe 14 gün kala bant (bugün var), 30/7/1 gün bildirimi.
- **Süre dolunca salt okunur mod**: bugünkü davranış korunur ve genişletilir (modül bazlı kapanma).
- **Çevrimdışı doğrulama ve saat oynatma koruması**: sistem saatinin geri alınmasına karşı önlem.
- **Paketlerin modül matrisi**: mevcut `Baslangic`, `Standart`, `Profesyonel`, `Kurumsal` kodları
  korunur (`server/YesLojistik.Core/Licensing/LicenseToken.cs:22-26`).
- **Abonelik ekranı** ve **kontör ekranı**.

Kapsam dışı: ödeme alma (iyzico) entegrasyonu (`docs/SATIS-PLANI.md` S2), müşteri kurulum betikleri
(`docs/MUSTERI-KURULUM.md`), e-belge üretimi (`08-E-BELGE-KATMANI.md`), bildirim kanalları
(`33-BILDIRIM-EPOSTA-SMS-KEP.md`), yetki matrisi (`07-YETKI-ONAY-NUMARALANDIRMA.md`).

Bu modül şu üç soruyu net cevaplar: (1) Bu müşteri hangi modülleri kullanabilir ve neden? (2) Paket
sınırına ne zaman ulaşıldı, kim uyarıldı? (3) Kontör bittiğinde hangi işlem durur, hangisi devam eder?

## 2. Luca'daki karşılığı

Luca, ürün ailelerini **sürümlere ayırarak** lisanslar: Koza **Standart** sürümünde Yönetici, Stok
Yönetimi, Fatura ve Finans Yönetimi menüleri vardır; **Profesyonel** sürüm ek olarak Satış Yönetimi,
Satınalma Yönetimi, Analizler ve Gelir-Gider Yönetimi getirir
(`docs/plan-erp/02-LUCA-ENVANTERI.md:20-21`). Yani Luca'da **paket = menü kümesi**dir. Fiyatlandırma
tarafında üçüncü taraf bir PDF'te **"2.500 Kontör Paket"** kalemi görünmüştür ve fiyat sayfası güvenli
metne çevrilememiştir; bu nedenle **kontör modelinin ayrıntısı doğrulanacak** olarak işaretlenmiştir
(`docs/plan-erp/02-LUCA-ENVANTERI.md:80-83`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> ve
<https://www.luca.com.tr/Sayfa/fiyat/57> (içerik güvenli dönüştürülemedi).

Bu dokümanın Luca'dan aldığı **fikir**: paket, teknik bir "sürüm numarası" değil **görünür bir menü
kümesi** olmalıdır; müşteri ne aldığını menüden anlar. Bizde bugün bu yoktur: paket adı yalnız
abonelik ekranında görünür (`client/src/pages/LicenseTab.tsx:39`), modül kapısı ise **kapalıdır**.

**doğrulanacak:** Luca'da kontör nedir (belge başı mı, paket mi), hangi işlemler kontör harcar, kontör
bitince ne olur — kaynak: Luca fiyat sayfası ve kullanım kılavuzu. **doğrulanacak:** Luca'da kullanıcı
sayısı sınırı var mı, hangi sürümde kaç kullanıcı — kaynak: Luca kılavuzu veya bayi demosu.
**doğrulanacak:** Luca'da modül yükseltmenin teknik yolu (yeni anahtar mı, sunucu ayarı mı, çevrimiçi
aktivasyon mu) ve çevrimdışı çalışma davranışı — kaynak: Luca kılavuzu. **doğrulanacak:** GİB özel
entegratörlerinin kontör fiyatları ve kontörün fatura başına mı paket başına mı satıldığı — kaynak:
entegratör teklifleri ve `docs/ENTEGRATOR-EKLEME.md:50`. **doğrulanacak:** abonelik sözleşmesinde
hizmet kesintisi, veri teslimi ve cayma koşulları — **avukat onayı gerekir**; bu doküman yorum yapmaz.

## 3. Bizde bugün

Lisans altyapısı **çalışır ve üretimde kullanılır**; eksik olan kısım modül kapısı, kullanıcı sınırı ve
kontördür.

**Anahtar biçimi ve doğrulama.** Anahtar `base64url(yük).base64url(imza)` biçimindedir; imza ECDSA
P-256 + SHA-256 ve 64 bayttır (`server/YesLojistik.Core/Licensing/LicenseToken.cs:33-37`). Yük UTF-8
JSON'dur ve şu alanları taşır: `Customer`, `Plan`, `VehicleLimit`, `Features[]`, `IssuedAt`,
`ExpiresAt`, `InstanceId?` (`server/YesLojistik.Core/Licensing/LicenseToken.cs:8-20`). Doğrulama
sırasında biçim, imza ve içerik denetlenir; `Plan`, izin verilen beş addan biri olmalıdır
(`:22-26`, `:98-100`). Ağ erişimi **gerekmez** (çevrimdışı çalışır): `:35-36`.

**Genel anahtar.** Yerleşik bir genel anahtar sabiti vardır ve karşılığındaki özel anahtar atılmıştır
(`server/YesLojistik.Infrastructure/Services/LicenseService.cs:22-23`); gerçek anahtar `License:PublicKey`
ayarıyla verilir, ayar yoksa yerleşik sabit kullanılır (`:25`). Özel anahtar yalnız satıcıda kalır ve
depoya girmez (`tools/license/.gitignore`). Satıcı aracı üç komut sunar: `keygen`, `issue`, `verify`
(`tools/license/license.py:111-127`); `issue` seçenekleri `--plan`, `--vehicles`, `--days`,
`--features`, `--instance-id` (`:118-125`).

**Durumlar.** Beş durum vardır: `owner`, `active`, `grace`, `expired`, `invalid`
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:4-11`). Ek süre **7 gündür**
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:17`) ve `Evaluate` içinde `Grace` olarak hesaplanır
(`:51-55`). `ReadOnly` yalnız `expired` ve `invalid` durumlarında `true` olur (`:22`). Kalan gün
yukarı yuvarlanır (`:52`).

**Sahip modu.** Anahtar boşsa `owner` durumu döner ve hiçbir sınır uygulanmaz
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:44`); `VehicleLimit` sıfır yani sınırsız olur
(`:25`). Bu bizim kendi kurulumumuz ve testler içindir.

**Modül kapısı — bugün ÖLÜ KOD.** `Has(feature)` metodu vardır ve doğru çalışır: sahip modunda daima
`true`, `active`/`grace` durumunda anahtardaki listeye bakar, diğer durumlarda `false`
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:27-32`). Ancak **üretim kodunda hiçbir çağrısı
yoktur**: repodaki tüm `Has(` eşleşmeleri testler
(`server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:90`, `:122-126`, `:147`) ve iki yorum satırıdır
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:13`,
`server/YesLojistik.Infrastructure/Services/LicenseService.cs:14`). Yani bugün `--features uetds`
anahtarına yazılsa bile **hiçbir özellik kapanmaz**; bu durum `docs/LISANS.md:42`'de de açıkça yazılıdır.
`docs/plan-erp/04-HEDEF-MIMARI.md:90` aynı boşluğu kaydeder.

**Araç sınırı.** `EnsureVehicleCapacityAsync` yalnız tek noktadan çağrılır:
`server/YesLojistik.Api/Controllers/VehiclesController.cs:98`. Excel aktarımı ayrıca
`RemainingVehiclesAsync` ile sınırı satır bazında uygular
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:476-508`). Sınır mesajı tek yerden gelir
(`server/YesLojistik.Infrastructure/Services/LicenseService.cs:40`). Sınır dolduğunda **var olan
araçlar silinmez** (`docs/LISANS.md:61`).

**Kullanıcı sınırı — YOK.** `LicensePayload` içinde yalnız `VehicleLimit` vardır
(`server/YesLojistik.Core/Licensing/LicenseToken.cs:13-14`); kullanıcı sayısı için bir alan yoktur ve
`UsersController` içinde hiçbir sınır denetimi yoktur
(`server/YesLojistik.Api/Controllers/UsersController.cs:57`). Kullanıcı açma yalnız `Admin` rolüne
açıktır (`:16`).

**Salt okunur mod.** `LicenseGuard` GET/HEAD/OPTIONS dışındaki tüm `/api` isteklerini reddeder; serbest
kalanlar `/api/auth`, `/api/license`, `/api/admin` ve adresinin son bölümünde `export` geçen
isteklerdir (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:16-20`, `:25-38`). Hata gövdesi
Türkçe sade metindir (`:13-14`).

**Anahtar uygulama.** `ApplyAsync` ortam anahtarı varsa reddeder ("ortam kazanır",
`server/YesLojistik.Infrastructure/Services/LicenseService.cs:62-63`); süresi dolmuş anahtarı kabul
etmez (`:69-70`) ve uygulamayı `AuditLog`'a yazar (`:74-80`). Anahtar **panelde hiçbir yerde
gösterilmez** (`server/YesLojistik.Core/Entities/CompanySettings.cs:52-53`) ve denetim izinin dışlama
listesindedir (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:18`).

**Kaynak önceliği.** Anahtar üç yerden gelebilir: `License__Key` ortam değişkeni (bu varsa kazanır),
`CompanySettings.LicenseKey` (panelden girilen) ve genel anahtar `License:PublicKey`
(`server/YesLojistik.Infrastructure/Services/LicenseService.cs:25-36`). Kurulum betiği anahtarı
müşterinin `.env` dosyasına yazar (`docs/MUSTERI-KURULUM.md:140`) ve konteynere aktarılır
(`deploy/customer-compose.yml:54`).

**API.** `GET /api/license/status` herhangi bir giriş yapmış kullanıcıya açıktır; `POST /api/license/apply`
yalnız yöneticidir (`server/YesLojistik.Api/Controllers/LicenseController.cs:18-26`). Yanıt gövdesi
`LicenseStatusDto`dur ve anahtarın **kendisini içermez** (`:9-10`, `:28-33`).

**Ekranlar.** Ayarlar → Abonelik sekmesi üç kart çizer: durum, yenileme ve paket tablosu
(`client/src/pages/LicenseTab.tsx:14-24`). Durum kartında paket, firma, bitiş tarihi, kalan gün, araç
kullanımı ve pakete dahil özellik rozetleri vardır (`:30-68`). Üst bant yalnız bitmek üzere/bitti
durumunda görünür (`client/src/components/LicenseBanner.tsx:7-20`). Paket tablosu ve fiyatlar **istemci
sabitime** yazılıdır (`client/src/lib/licenseConstants.ts:18-23`); destek e-postası ve telefonu **yer
tutucudur** (`:5-6`).

**Testler.** Birim testleri anahtar üretir ve doğrular: `Features` çözümü
(`server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:28`), sahip modu (`:90`), büyük/küçük harf
duyarsızlığı ve ek süre davranışı (`:122-126`), süresi bitmiş anahtar (`:147`). Entegrasyon testleri
yaşam döngüsünü, rol sınırını, sınırsız paketi, ortam anahtarının kazanmasını ve **kurcalanmış anahtarın
paneli salt okunur yapmasını** doğrular (`server/YesLojistik.Tests/Integration/LicenseTests.cs:59`,
`:152`, `:172`, `:187`, `:210`). e2e tarafında sahip modu ve paket tablosu testi vardır
(`client/e2e/license.spec.ts:5`).

**Eksik listesi (kanıtlı):** modül kapısı üretimde çağrılmıyor
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:27` — tek çağıran testler); kullanıcı sayısı sınırı
yok (`server/YesLojistik.Core/Licensing/LicenseToken.cs:8-20` içinde alan yok); kontör/kredi kavramı
yok (repoda `Credit`/`Balance` alanı lisans bağlamında geçmez); deneme süresi ayrı bir mod değil,
yalnız `Deneme` adlı plan (`server/YesLojistik.Core/Licensing/LicenseToken.cs:24`); yenileme hatırlatması
yalnız görsel banttır (`client/src/components/LicenseBanner.tsx:7-20`), e-posta/push bildirimi yoktur;
saat oynatma koruması yoktur (`LicenseEvaluator.Evaluate` doğrudan `TimeProvider.GetUtcNow()` değerini
kullanır: `server/YesLojistik.Infrastructure/Services/LicenseService.cs:29-35`); abonelik ödeme alma
yoktur (`docs/SATIS-PLANI.md:43`); modül menüsü filtresi yoktur
(`client/src/lib/nav.ts:19-66` elle yazılıdır).

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md` §3 ortak parçalarını kullanır: `PageHeader`,
`Card`, `Tabs`, `Badge`, `Button`, `Modal`, `Figures` (`client/src/components/ui.tsx`), `DataTable`
(`client/src/components/DataTable.tsx:66`), `MobileCards`
(`client/src/components/shell/MobileCards.tsx`), `SumStrip` (`client/src/components/SumStrip.tsx:12`),
`PageShell` (`client/src/components/shell/PageShell.tsx:28`). Klasik görünüm varsayılan kalır
(`client/src/lib/uiMode.ts:8`).

### 4.1 Ekran: Abonelik (`/ayarlar?tab=license`) — mevcut, genişletilir

Bugünkü üç kart korunur (`client/src/pages/LicenseTab.tsx:14-24`) ve üstüne eklenir:

| Alan | Tip | Davranış |
|---|---|---|
| Durum | rozet | Bugünkü beş durum + `Deneme` |
| Paket | metin | Bugünkü `planLabel` |
| Firma | metin | Anahtardaki `Customer` |
| Bitiş tarihi / kalan gün | tarih + metin | Bugünkü gösterim |
| Araç kullanımı | sayaç + çubuk | Bugünkü gösterim (`LicenseTab.tsx:49-56`) |
| **Kullanıcı kullanımı** | sayaç + çubuk | Yeni: `etkin ofis kullanıcısı / sınır` |
| **Modüller** | rozet listesi | Yeni: açık modüller ve paket dışı olanlar |
| **Kontör bakiyesi** | tutar | Yeni: e-belge/SMS/KEP kredisi |
| **Kurulum no** | metin | Bugünkü `instanceId` gösterimi (`LicenseTab.tsx:67`) |
| Anahtar kaynağı | rozet | `Sunucu ayarı` / `Panelden girildi` (bugünkü `source`, `LicenseTab.tsx:83`) |
| **Kullanım geçmişi** | tablo | Yeni: son 20 olay (araç eklendi, kullanıcı açıldı, kontör harcandı) |

### 4.2 Ekran: Modüller (`/ayarlar?tab=modules`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Modül adı | metin | Modül kayıt defterinden (`docs/plan-erp/04-HEDEF-MIMARI.md:131-133`) |
| Anahtar (`Key`) | metin | Ör. `stock`, `purchase`, `payroll` |
| Lisans özelliği | metin | `Feature` alanı; anahtardaki `Features` listesiyle eşleşir |
| En düşük paket | metin | `Package` alanı |
| Durum | rozet | `Açık`, `Pakette yok`, `Kullanıcı kapattı`, `Lisans bitti` |
| Kullanıcı anahtarı | onay kutusu | Yönetici modülü kapatabilir (lisansın **verdiğini geri almaz**) |
| Neden kapalı | metin | Sade Türkçe gerekçe |

### 4.3 Ekran: Kontör ve Tüketim (`/ayarlar?tab=credits`) — yeni

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Kontör bakiyesi | tutar | — | Salt okunur |
| Uyarı eşiği | tutar | Evet | Bu değerin altına düşünce bant ve bildirim |
| Aylık tavan | tutar | Hayır | Boş = sınırsız; aşılırsa tüketim durur |
| Tüketim kalemleri | tablo | — | Kalem, birim tüketim, birim maliyet, bu ay |
| Yükleme | düğme | — | Yeni kontör paketi uygulama (anahtar ya da elle) |
| Geçmiş | tablo | — | Tarih, kalem, adet, tüketim, kalan bakiye, belge bağı |
| Tüketim durunca davranış | seçim | Evet | `Beklet ve uyar` (varsayılan) / `İşlemi reddet` |

### 4.4 Ekran: Paket Karşılaştırma (`/abonelik/paketler`) — mevcut tablo genişletilir

Bugünkü tablo (`client/src/pages/LicenseTab.tsx:109-131`) **modül satırlarıyla** büyütülür. Sütunlar:
paket, araç, kullanıcı, aylık fiyat, modül listesi, kontör durumu. Fiyatlar tek kaynaktan
(`client/src/lib/licenseConstants.ts:18-23`) okunmaya devam eder; destek bilgileri gerçek değerle
değiştirilir (`:5-6`, `docs/SATIS-PLANI.md:280`).

### 4.5 Ekran: Lisans Geçmişi (`/ayarlar?tab=license&alt=gecmis`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Zaman | tarih-saat | |
| Olay | metin | `Anahtar uygulandı`, `Anahtar reddedildi`, `Kontör yüklendi`, `Uyarı gönderildi`, `Saat kaydı` |
| Paket / araç / kullanıcı sınırı | metin | Anahtarın içeriği |
| Kullanıcı | metin | İşlemi yapan |
| Sonuç | rozet | `Başarılı`, `Reddedildi` |
| Red nedeni | metin | Sade Türkçe |

Kaynak: bugünkü `AuditLog` kaydı (`server/YesLojistik.Infrastructure/Services/LicenseService.cs:74-80`).

### 4.6 Bant ve uyarılar

Bugünkü sarı/kırmızı bant korunur (`client/src/components/LicenseBanner.tsx:13-18`) ve şu eşikler
eklenir: bitişe **30, 7 ve 1 gün** kala bilgilendirme; araç sınırının **%80**'i; kullanıcı sınırının
**%80**'i; kontör bakiyesinin uyarı eşiğinin altına düşmesi; **saat oynatma tespiti**. Bantta her
zaman tek bir eylem bağlantısı bulunur (bugünkü gibi `Abonelik`, `LicenseBanner.tsx:16-18`).

## 5. İş kuralları

1. **Tek doğrulama kaynağı sunucudur.** Panel yalnız görünürlük sağlar; modül kapısı ve sınırlar
   sunucuda uygulanır. Gerekçe: bugünkü `MirrorWriteGuard` ve `LicenseGuard` da sunucudadır
   (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:759`).
2. **Kapı sırası.** Her yazma isteği sırayla: kimlik → yetki → ayna → **lisans (salt okunur)** →
   **modül kapısı** → doğrulama → transaction → denetim izi. Bugünkü sıra korunur ve araya modül kapısı
   eklenir (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:343-347`).
3. **Modül kapısı yalnız yazmayı keser.** Pakette olmayan modülün **okuma** uçları ve raporları
   görüntülenebilir; yeni kayıt eklenemez, düzeltilemez. Gerekçe: `docs/plan-erp/04-HEDEF-MIMARI.md:296-297`
   ile aynı ilke — müşteri kendi verisini kaybetmez ve görebilir.
4. **Kapı "kapalı" ise yazma cevabı 403'tür** ve gövdede sade Türkçe metin bulunur:
   `"Bu modül paketinizde yok. Yükseltmek için bize ulaşın."` Adres elle yazılırsa panel bunu
   gösterir (`docs/plan-erp/04-HEDEF-MIMARI.md:141-142`).
5. **Sahip modu hiçbir kapıya takılmaz.** Anahtar yoksa bütün modüller açık, bütün sınırlar sınırsızdır
   (bugünkü `Has` davranışı: `server/YesLojistik.Core/Licensing/LicenseInfo.cs:29`). Bu, bizim kendi
   kurulumumuz ve testler içindir.
6. **Özellik adları sözleşmedir.** Anahtardaki `Features` değerleri `ModuleRegistry.Feature` alanıyla
   **birebir** eşleşir; eşleşmeyen özellik adı yok sayılır (sessiz hata değil, uyarı üretir). Bugünkü
   örnek değerler `eFatura`, `uetds`, `gps`, `portal`dur (`server/YesLojistik.Infrastructure/Services/LicenseService.cs:14`,
   `docs/LISANS.md:42`).
7. **Yazım büyük/küçük harf duyarsızdır.** Bugünkü davranış korunur (`server/YesLojistik.Core/Licensing/LicenseInfo.cs:30`,
   test: `server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:123`).
8. **Araç sınırı tüm giriş yollarında uygulanır.** Bugün iki yol vardır (araç ucu ve Excel aktarımı);
   hedefte **tek kapı** olur ve import, API, mobil ve toplu işlemler aynı denetimden geçer. Var olan
   kayıtlar silinmez (`docs/LISANS.md:61`).
9. **Kullanıcı sınırı.** Etkin **ofis** kullanıcıları sayılır; `Driver` rolündeki hesaplar sayılmaz
   (gerekçe: şoför hesabı müşterinin kendi çalışanı içindir ve paket araç sayısına göre fiyatlanır).
   Pasif kullanıcı sayılmaz. Sınır dolduğunda yeni ofis kullanıcısı **açılamaz**; hata metni sade
   Türkçedir ve paketi yükseltme yolunu söyler.
10. **Kontör tüketimi.** Kontör yalnız **dışarıya çıkan** işlemlerde harcanır: e-belge gönderimi, SMS,
    KEP. Bunların her biri için tüketim kaydı yazılır ve bakiye aynı transaction içinde düşülür.
    Kontör bitince varsayılan davranış **"beklet ve uyar"**dır: belge taslak kalır, hiçbir şey
    kaybolmaz. "İşlemi reddet" seçilirse kullanıcı doğrudan hata alır. **doğrulanacak:** hangi
    işlemlerin kontör harcadığı ve birim fiyatlar — kaynak: entegratör/sağlayıcı teklifleri.
11. **Kontör bakiyesi anahtarda taşınmaz.** Bakiye sunucuda tutulur ve yalnız **yükleme anahtarıyla**
    artırılır. Gerekçe: bakiye sık değişir; imzalı anahtara yazmak her yüklemede yeni anahtar üretmeyi
    gerektirirdi.
12. **Deneme süresi.** `Deneme` planı 30 gündür (`docs/SATIS-PLANI.md:196`) ve **tüm modüller açık**
    gelir; tek kısıt araç/kullanıcı sınırı ve süredir. Deneme bitince `active` yerine `expired` olur ve
    panel salt okunur moda geçer. Deneme **bir kez** verilir; `instanceId` ile aynı kurulumda ikinci
    deneme engellenir.
13. **Yenileme.** Yeni anahtar eskisinin yerine geçer; veri değişmez (`docs/LISANS.md:48`). Süresi
    dolmuş anahtar `apply` ucundan **kabul edilmez** (bugünkü kural:
    `server/YesLojistik.Infrastructure/Services/LicenseService.cs:69-70`). Ortam anahtarı varsa panelden
    değiştirilemez (`:62-63`).
14. **Paket düşürme.** Daha düşük paket yüklenebilir; ancak **sınırı aşan mevcut kayıtlar silinmez**.
    Kullanıcı sınırı aşılmışsa yeni kullanıcı açılamaz ve panel "sınırı aşıyorsunuz (N/M)" uyarısı
    gösterir. Araç sınırı için aynı kural (`docs/LISANS.md:61`).
15. **Salt okunur mod.** Bugünkü davranış korunur: `expired`/`invalid` durumunda GET dışı istekler 403
    olur; `/api/auth`, `/api/license`, `/api/admin` ve `export` içeren adresler serbest kalır
    (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:16-20`). Buna **modül kapısı eklenmez**:
    modül kapısı salt okunur moddan önce değil **sonra** değerlendirilir, çünkü salt okunur mod zaten
    tüm yazmayı keser.
16. **Saat oynatma koruması.** `Evaluate` sunucu saatini kullanır
    (`server/YesLojistik.Infrastructure/Services/LicenseService.cs:29`). Koruma üç katmanlıdır:
    (a) **son görülen zaman** sunucuda tutulur ve yeni okuma ondan **geriye** olamaz; geriye
    gidiyorsa "saat geri alınmış" kabul edilir; (b) en büyük ileri kayıt (`maxSeenAt`) saklanır ve
    lisans bitişi bu değere göre değerlendirilir; (c) 24 saatten büyük sıçramada yönetici uyarılır ve
    olay denetim izine `ClockAnomaly` olarak yazılır. Saat geri alınmışsa **salt okunur moda geçilmez**
    (yanlış pozitif müşteriyi durdurur) ama abonelik **uzamaz**; uyarı kalır.
    **doğrulanacak:** sanal sunucularda (VPS) saat kayması davranışı ve NTP zorunluluğu — kaynak:
    sunucu sağlayıcısı belgeleri.
17. **Çevrimdışı doğrulama.** Ağ erişimi gerekmez; anahtar imzası yerel doğrulanır
    (`server/YesLojistik.Core/Licensing/LicenseToken.cs:35-36`). Hedefte de böyle kalır: **çevrimiçi
    aktivasyon zorunluluğu getirilmez.** Gerekçe: müşteri interneti kesildiğinde panel durmamalı.
18. **Kurulum bağı.** `InstanceId` doluysa anahtar yalnız aynı `License:InstanceId` değerine sahip
    kurulumda geçerlidir (`server/YesLojistik.Core/Licensing/LicenseInfo.cs:48-49`). Yeni müşteride bu
    alan **varsayılan olarak doldurulur**; anahtarın kopyalanması böylece engellenir.
19. **Gizlilik.** Anahtar hiçbir panel yanıtında ve denetim izinde görünmez
    (`server/YesLojistik.Api/Controllers/LicenseController.cs:9-10`,
    `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:18`). Kural korunur.
20. **Askıya alma.** Ödeme yapılmazsa uygulanan yol **salt okunur**dur, veri silme değil. Müşteri
    verisini hiçbir durumda kaybetmez (`docs/LISANS.md:63`).

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. Lisans anahtarının
kendisi **hiçbir yeni tabloya kopyalanmaz**; anahtar bugünkü iki yerde kalır (ortam değişkeni ve
`CompanySettings.LicenseKey`).

### 6.1 Yeni tablo: `ModuleState`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `ModuleKey` | string(40) | Kayıt defteri anahtarı (`04-HEDEF-MIMARI.md:131`) |
| `EnabledByUser` | bool | Yönetici kapatmış olabilir; varsayılan `true` |
| `DisabledReason` | string(200)? | |
| `ChangedAt` / `ChangedBy` | DateTime / string(80) | |

Tekil indeks: `(CompanyId, ModuleKey)`. Amaç: **yönetici kapatması** ile **lisans kapalılığı**nı
birbirinden ayırmak. Lisans bilgisi burada **tutulmaz** (anahtardan anlık hesaplanır), yalnız kullanıcı
kararı tutulur.

### 6.2 Yeni tablo: `LicenseState`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `InstanceId` | string(64)? | Kurulum no |
| `LastSeenAt` | DateTime | En son okunan sunucu zamanı |
| `MaxSeenAt` | DateTime | En büyük ileri zaman; saat koruması (§5.16) |
| `ClockAnomalyAt` | DateTime? | Son anomali |
| `ClockAnomalyCount` | int | |
| `LastWarnedAt` | DateTime? | Bitiş uyarısının son gönderimi |
| `WarnedAt30` / `WarnedAt7` / `WarnedAt1` | DateTime? | Eşik uyarıları |
| `KeyFingerprint` | string(64)? | Anahtarın **özeti** (SHA-256, ilk 16 bayt); anahtarın kendisi değil |

Tekil indeks: `(InstanceId)`. `KeyFingerprint` sayesinde "anahtar değişti mi" sorusu anahtarı
saklamadan cevaplanır; denetim izi de bunu kullanır.

### 6.3 Yeni tablo: `LicenseCredential` (kontör)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `Kind` | string(20) | `EInvoice`, `Sms`, `Kep` |
| `Balance` | decimal | Kalan kontör |
| `WarnThreshold` | decimal? | Uyarı eşiği |
| `MonthlyCap` | decimal? | Boş = sınırsız |
| `MonthUsed` | decimal | Bu ayın tüketimi |
| `MonthKey` | string(7) | `2026-10`; ay dönümünde sıfırlanır |
| `BlockWhenEmpty` | bool | `false` = bekle ve uyar (varsayılan) |

Tekil indeks: `(CompanyId, Kind)`.

### 6.4 Yeni tablo: `LicenseCreditMovement`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CredentialId` | int, FK | |
| `At` | DateTime | |
| `Kind` | string(10) | `Load`, `Consume`, `Adjust`, `Expire` |
| `Quantity` | decimal | Pozitif yükleme, negatif tüketim |
| `BalanceAfter` | decimal | |
| `SourceType` / `SourceId` | string(30) / int? | Belge bağı (fatura, SMS mesajı) |
| `Note` | string(200)? | |
| `UserId` | int? | İşlemi yapan |

İndeks: `(CredentialId, At)`; `(SourceType, SourceId)`.

### 6.5 Mevcut tablolara eklenecek sütunlar

| Tablo | Sütun | Tip | Not |
|---|---|---|---|
| `CompanySettings` | `InstanceId` | string(64)? | `License:InstanceId` ayarı yoksa buradan okunur |
| `CompanySettings` | `TrialUsedAt` | DateTime? | Deneme bir kez (§5.12) |
| `CompanySettings` | `LicenseWarnChannel` | string(12)? | Uyarıların gideceği kanal |

### 6.6 Lisans anahtarına eklenecek alanlar (geriye uyumlu)

`LicensePayload`'a **boş olabilen** iki alan eklenir; eski anahtarlar geçerli kalır:

| Alan | Tip | Not |
|---|---|---|
| `UserLimit` | int | 0 = sınırsız; alan yoksa eski davranış (sınırsız) |
| `Credit` | int | Bu anahtarla yüklenen kontör; 0 = yükleme yok |

`LicensePlans.IsValid` listesi **değişmez** (`server/YesLojistik.Core/Licensing/LicenseToken.cs:22-26`);
yeni paket eklenirse liste ayrı bir işle ve anahtar aracıyla birlikte güncellenir.

## 7. API uçları

Mevcut uçlar korunur (`server/YesLojistik.Api/Controllers/LicenseController.cs:18-26`). Yeni uçlar:

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/license/status` | — | Bugünkü gövde + `userLimit`, `userCount`, `modules[]`, `credits[]` | Giriş yapmış |
| POST | `/api/license/apply` | `{key}` | Durum | `Admin` |
| GET | `/api/erp/modules` | — | Modül listesi (açık/kapalı, neden) | Giriş yapmış |
| PUT | `/api/erp/modules/{moduleKey}` | `{enabled, reason}` | Güncel modül | `Admin` |
| GET | `/api/license/credits` | — | Kontör bakiyeleri | `Admin` |
| POST | `/api/license/credits/load` | `{kind, quantity, note}` | Güncel bakiye | `Admin` |
| GET | `/api/license/credits/movements` | `?kind=&page=` | Hareket listesi | `Admin` |
| GET | `/api/license/history` | `?page=` | Lisans olay geçmişi | `Admin` |
| POST | `/api/license/clock-check` | — | `{anomaly, lastSeenAt, maxSeenAt}` | Giriş yapmış (panel açılışında) |
| GET | `/api/erp/plans` | — | Paket ve modül matrisi | Giriş yapmış |

Kurallar: (a) modül kapısı **her yazma ucunda** uygulanır; kapatma ucu yalnız yöneticidir;
(b) `POST /api/license/apply` anahtarı **yanıtlamaz**, yalnız özeti ve parmak izini döner;
(c) kontör yükleme kaydı `AuditLog`'a `CreditLoaded` olarak yazılır; (d) `clock-check` panel açılışında
bir kez çağrılır ve anomali varsa bant çizer; (e) hata gövdesi sade Türkçe `ProblemDetails`.

## 8. Yetki, onay ve denetim izi

### 8.1 Rol matrisi

| İşlem | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Abonelik durumunu görme | ✅ | ✅ (arayüz bandı) | ✅ | ❌ |
| Anahtar uygulama | ✅ | ❌ | ❌ | ❌ |
| Modül açma/kapama | ✅ | ❌ | ❌ | ❌ |
| Kontör bakiyesi görme | ✅ | ✅ | ❌ | ❌ |
| Kontör yükleme | ✅ | ❌ | ❌ | ❌ |
| Lisans geçmişi | ✅ | ❌ | ❌ | ❌ |
| Kullanıcı açma (sınır denetimiyle) | ✅ | ❌ | ❌ | ❌ |
| Araç ekleme (sınır denetimiyle) | ✅ | ✅ | ✅ | ❌ |

### 8.2 Onay (maker-checker)

| İşlem | Onay | Bugünkü durum |
|---|---|---|
| Anahtar uygulama | Yok (yönetici kararı + denetim izi) | **Var** (`LicenseController.cs:23-26`) |
| Paket düşürme | Evet (uyarı + açık onay) | **Yok** |
| Kontör yükleme | Yok, ama `AuditLog` zorunlu | **Yok** |
| Modül kapatma | Yok (geri alınabilir) | **Yok** |
| `instanceId` değiştirme | Evet (`Admin`, gerekçeli) | **Yok** |

### 8.3 Denetim izi

`AuditLog`'a yazılacak olaylar: `LicenseApplied`, `LicenseRejected`, `LicenseExpiring`,
`LicenseExpired`, `ModuleDisabled`, `ModuleEnabled`, `CreditLoaded`, `CreditConsumed`,
`CreditThresholdReached`, `ClockAnomaly`, `InstanceIdChanged`. Bugünkü `LicenseApplied` kaydı korunur
(`server/YesLojistik.Infrastructure/Services/LicenseService.cs:74-80`).
**Kural:** anahtarın kendisi, parmak izi dışında hiçbir yere yazılmaz. Kontör tüketimi (`CreditConsumed`)
**her belge için** yazılmaz; yalnız `LicenseCreditMovement` tablosuna yazılır ve günlük toplu özet
denetim izine girer (gerekçe: hacim).

## 9. Kabul kriterleri

1. `Features` listesinde `stock` olmayan bir anahtarla stok modülünün yazma ucu **403** döner; hata
   metni "Bu modül paketinizde yok. Yükseltmek için bize ulaşın." içerir.
2. Aynı anahtarla stok modülünün **okuma** ucu (`GET`) çalışır ve veri görüntülenir.
3. Sahip modunda (anahtar yok) bütün modüller açıktır; hiçbir uç 403 dönmez.
4. Menüde kapalı modül **hiç görünmez**; adres elle yazılırsa açıklayıcı ekran çıkar
   (`docs/plan-erp/04-HEDEF-MIMARI.md:141-142`).
5. Modül kapısı üretim kodunda **çağrılır**: `Has(` çağrısının test dışı en az bir kullanımı vardır ve
   bu bir entegrasyon testiyle doğrulanır.
6. Kullanıcı sınırı dolduğunda yeni ofis kullanıcısı açılamaz (403/`DomainException`); şoför hesabı
   sınırı etkilemez.
7. Araç sınırı dolduğunda araç ekleme **ve** Excel aktarımı ikisi de reddedilir (bugünkü davranış
   korunur: `server/YesLojistik.Infrastructure/Services/ImportService.cs:504-508`).
8. Paket düşürüldüğünde mevcut kayıtlar **silinmez**; panel sınır aşımını "N/M" olarak gösterir.
9. Kontör bittiğinde `Beklet ve uyar` modunda belge taslak kalır, hiçbir kayıt kaybolmaz; kullanıcı
   uyarı görür.
10. Kontör `İşlemi reddet` modunda işlem doğrudan hata verir ve tüketim kaydı **oluşmaz**.
11. Kontör hareketleri bakiyeyi birebir tutar: yüklemeler − tüketimler = bakiye (testle kilitlenir).
12. Aylık tavan aşıldığında tüketim durur ve `MonthKey` ay dönümünde sıfırlanır.
13. Deneme süresi 30 gündür; aynı `instanceId` ile **ikinci deneme** verilmez.
14. Bitişe 30/7/1 gün kala uyarı üretilir ve her eşik **bir kez** gönderilir.
15. Sunucu saati 10 gün geriye alınırsa `clock-check` anomali döner, `AuditLog`'da `ClockAnomaly`
    görünür ve abonelik **uzamaz**.
16. Sunucu saati küçük ölçüde kayarsa (birkaç dakika) anomali üretilmez (yanlış pozitif yok).
17. Anahtar hiçbir API yanıtında, denetim izinde veya günlükte **görünmez**; yalnız parmak izi görünür
    (mevcut testler korunur: `server/YesLojistik.Tests/Integration/LicenseTests.cs:210`).
18. Ortam anahtarı varken panelden anahtar uygulanamaz (bugünkü kural:
    `server/YesLojistik.Infrastructure/Services/LicenseService.cs:62-63`).
19. Süresi dolmuş anahtar uygulanamaz (bugünkü kural korunur).
20. `expired`/`invalid` durumunda GET dışı istekler 403 olur; `/api/auth`, `/api/license`, `/api/admin`
    ve `export` adresleri serbest kalır (bugünkü davranış korunur).
21. Klasik görünüm varsayılan kalır; yeni ekranlar **iki görünümde de** çalışır.
22. `docs/plan-erp/01-ORTAK-SARTNAME.md` §4 referans denetimi bu doküman için **0 kırık referans** verir;
    mevcut testlerin hiçbiri silinmez veya atlanmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `LicenseFeatureGateTests.cs` (`server/YesLojistik.Tests/Unit/LicenseTokenTests.cs` yanında,
aynı geçici anahtar üretimi kullanılır)
- `Has("stock")` sahip modunda `true`; `active`/`grace` durumunda listeye göre; `expired`/`invalid`
  durumunda `false`.
- Büyük/küçük harf duyarsızlığı korunur (mevcut testle aynı üslup:
  `server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:122-126`).
- Eski anahtarda `UserLimit` alanı yoksa sınırsız kabul edilir (geriye uyumluluk).

Yeni dosya: `LicenseClockTests.cs`
- Saat 10 gün geriye alınırsa anomali üretilir; 5 dakika geriye alınırsa üretilmez.
- `MaxSeenAt` ileri kaydedilir; abonelik bu değere göre değerlendirilir.
- Anomali hâlinde abonelik uzamaz (kalan gün artmaz).

Yeni dosya: `CreditLedgerTests.cs`
- Yükleme − tüketim = bakiye.
- Aylık tavan aşılırsa tüketim reddedilir.
- `BlockWhenEmpty = false` iken tüketim kaydı oluşmaz, işlem bekler.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `ModuleGateTests.cs` (mevcut `LicensedApiFactory` yeniden kullanılır:
`server/YesLojistik.Tests/Integration/LicenseTests.cs:23`)
- `stock` özelliği olmayan anahtarla stok yazma ucu **403**, okuma ucu 200.
- Sahip modunda hiçbir uç 403 dönmez.
- Yönetici modülü kapatınca uç 403 döner ve kapatma denetim izine yazılır.
- Kapatılan modülün menü listesinde karşılığı yoktur.

Yeni dosya: `UserLimitTests.cs`
- Sınır 3 iken üçüncü ofis kullanıcısı açılır, dördüncü **403** alır.
- Şoför hesabı sınırdan sayılmaz (4. kullanıcı şoförse açılır).
- Pasif kullanıcı sayılmaz.

Yeni dosya: `CreditApiTests.cs`
- Kontör yükleme `AuditLog`'a `CreditLoaded` yazar.
- Kontör bitince fatura gönderimi taslak kalır; fatura **kaybolmaz**.

Mevcut testler korunur ve genişletilir:
`server/YesLojistik.Tests/Integration/LicenseTests.cs` (yaşam döngüsü, ortam anahtarı, kurcalanmış
anahtar), `server/YesLojistik.Tests/Unit/LicenseTokenTests.cs`, `server/YesLojistik.Tests/Integration/UetdsTests.cs`
(özellik kapısı `uetds` ile ilişkilendirilir), `server/YesLojistik.Tests/Integration/MigrationTests.cs`.

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `license-modules.spec.ts`
- Paket dışı modül menüde **görünmez**; adres elle yazılınca bilgilendirme ekranı çıkar.
- Yönetici modülü kapatır → çalışan kullanıcı yazma denemesinde hata görür, okuma yapabilir.

Yeni dosya: `license-credits.spec.ts`
- Kontör bakiyesi görünür, yükleme sonrası artar, tüketim sonrası azalır.
- Bakiye eşiğin altına düşünce bant görünür.

Mevcut `client/e2e/license.spec.ts:5` (sahip modu ve paket tablosu) yeni alanları kapsayacak biçimde
genişletilir; `client/e2e/new-ui/basics.spec.ts` yeni sekmeleri kapsar
(yardımcı: `client/e2e/helpers.ts:44-46`).

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `LicensePayload` alanları (`UserLimit`, `Credit`) + geriye uyumlu doğrulama | 1,5 | `tools/license/license.py` güncellemesi |
| 2 | `ModuleRegistry` alanı `Feature` + `GET /api/erp/modules` | 3 | `04-HEDEF-MIMARI.md` §5.2 |
| 3 | **Modül kapısı**: sunucu ara katmanı + tüm yazma uçlarına uygulama | 4 | 2 |
| 4 | Panel menü filtresi + kapalı modül ekranı | 2,5 | 2 |
| 5 | `ModuleState` tablosu + yönetici aç/kapa ekranı | 2 | 2 |
| 6 | Kullanıcı sayısı sınırı (uç + hata metni + ekran sayacı) | 2,5 | 1 |
| 7 | `LicenseState` + saat oynatma koruması + uç | 3 | — |
| 8 | `LicenseCredential` + `LicenseCreditMovement` + uçlar | 4 | 1 |
| 9 | Kontör tüketim bağlantıları (e-belge, SMS, KEP) | 3 | `08`, `33` |
| 10 | Kontör ve Modüller ekranları | 3,5 | 5, 8 |
| 11 | Bitiş/limit uyarıları (30/7/1, %80, eşik) + bildirim bağlantısı | 3 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` |
| 12 | Lisans geçmişi ekranı ve denetim olayları | 2 | 1, 7 |
| 13 | Paket karşılaştırma tablosunun modül matrisine genişletilmesi | 1,5 | 2 |
| 14 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam** | | **~42,5 kişi-gün** | |

**Önce bitmesi gerekenler:** `04-HEDEF-MIMARI.md` (modül kayıt defteri ve kapı sırası),
`07-YETKI-ONAY-NUMARALANDIRMA.md` (yetki matrisi, denetim olayları), `05-VERI-MODELI.md` (tablo
sözleşmesi).

**Bu dokümanı bekleyenler:** `08-E-BELGE-KATMANI.md` (kontör tüketimi ve modül kapısı),
`33-BILDIRIM-EPOSTA-SMS-KEP.md` (SMS/KEP kontörü), `10-STOK-VE-DEPO.md`, `12-SATIN-ALMA.md`,
`16-CEK-SENET.md` (modül kapısı bu modülleri açar/kapatır), `40-UAT-KABUL-CANLIYA-GECIS.md`
(paket doğrulaması), `41-RISKLER-VE-VARSAYIMLAR.md` (lisans ve saat riski).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| Modül kapısının yanlış açılması (müşteri kullanamaz) | **Yüksek** | Varsayılan **açık**; kapı yalnız anahtardaki liste **yoksa** kapatır; sahip modu sınırsız | Anahtar yenilenir; kapı bir sürüm boyunca `License:GatesEnabled=false` ile kapatılabilir |
| Modül kapısının okuma uçlarını da kesmesi | Yüksek | Kapı **yalnız yazmayı** keser (§5.3); testle kilitlenir | Kapı kapatılır, bugünkü davranışa dönülür |
| **Saat oynatma** ile lisansın süresiz uzatılması | **Yüksek** | `MaxSeenAt` + anomali tespiti + denetim izi; abonelik uzamaz | Saat düzeltilir; anomali kaydı kalır |
| Saat korumasının yanlış pozitifi (müşteri durur) | Yüksek | Geri alma **salt okunur yapmaz**, yalnız uyarır; eşik küçük kaymaları yok sayar | Uyarı eşiği ayardan yükseltilir |
| Kullanıcı sınırının yanlış sayması | Orta | Şoför ve pasif kullanıcı sayılmaz; sayaç panelde görünür | Sınır anahtardan büyütülür |
| Kontör bakiyesinin kayması (para) | **Yüksek** | Her tüketim hareket kaydı + tek transaction; günlük mutabakat testi | Hareketlerden bakiye yeniden üretilir |
| Kontörün yanlış işlemde harcanması | Yüksek | Tüketim yalnız **başarılı** dış gönderimde yazılır; hata hâlinde iade hareketi | `Adjust` hareketiyle düzeltme |
| Kapanan modülün verisinin erişilemez sanılması | Orta | Veri silinmez, okunur; panelde "pakette yok" açıklaması | Paket yükseltilir |
| Anahtarın müşteriler arası kopyalanması | Orta | `instanceId` varsayılan dolu; uyuşmazlıkta `invalid` | Yeni anahtar üretilir |
| Paket düşürmede mevcut kayıtların silinmesi | **Yüksek** | Silme **yok**; yalnız yeni ekleme engellenir | Paket geri yükseltilir |
| İstemci sabit fiyat tablosunun sunucudan sapması | Düşük | Fiyatlar tek dosyada (`client/src/lib/licenseConstants.ts:18-23`); sunucu `GET /api/erp/plans` ile beslenir | Sabit tablo bir sürüm yedek kalır |
| Ödeme alınmaması (iyzico yok) | Orta | Bu doküman **ödeme almaz**; elle anahtar üretimi sürer | — |

**Doğrulanacaklar (dış bilgi):**

1. **doğrulanacak:** Luca'da kontör nedir, hangi işlemler harcar, bitince ne olur, paket fiyatları
   nedir — kaynak: Luca fiyat sayfası ve kullanım kılavuzu
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:80-83`).
2. **doğrulanacak:** Luca'da kullanıcı sayısı sınırı var mı, sürümlere göre kaç kullanıcı — kaynak:
   Luca kılavuzu veya bayi demosu.
3. **doğrulanacak:** Luca'da modül yükseltmenin teknik yolu ve çevrimdışı çalışma davranışı — kaynak:
   Luca kılavuzu.
4. **doğrulanacak:** e-belge kontörünün birim fiyatı ve faturalandırma biçimi (fatura başı mı, paket
   mi) — kaynak: entegratör teklifleri ve `docs/ENTEGRATOR-EKLEME.md:50`.
5. **doğrulanacak:** SMS ve KEP tüketim birim fiyatları ve sağlayıcı sözleşmeleri — kaynak: sağlayıcı
   teklifleri (`33-BILDIRIM-EPOSTA-SMS-KEP.md` doğrulanacakları ile aynı iş).
6. **doğrulanacak:** Abonelik sözleşmesinde hizmet askıya alma, veri teslimi, cayma ve fesih koşulları
   — **avukat onayı gerekir**; bu doküman yorum yapmaz (`docs/hukuk/ABONELIK-VE-MESAFELI-SATIS-SOZLESMESI.md`).
7. **doğrulanacak:** Satışta "sınırsız kullanıcı" vaadi ile kullanıcı sınırı kararının uyumu — satış
   kararı (`docs/SATIS-PLANI.md:197`).
8. **doğrulanacak:** Abonelik faturasının KDV ve e-belge durumu, dönemsellik ve gelir kaydı — mali
   müşavir.
9. **doğrulanacak:** VPS sağlayıcılarında saat kayması davranışı ve NTP zorunluluğu — kaynak: sunucu
   sağlayıcısı belgeleri.
10. **doğrulanacak:** Özel anahtarın saklanma yeri ve yedekleme usulü (kaybolursa yeni müşteri anahtarı
    üretilemez: `docs/LISANS.md:17`) — satıcı süreci.

Sonraki belgeyle bağlantı: bu doküman `04-HEDEF-MIMARI.md`'nin modül kayıt defterini çalışır hâle
getirir, `08-E-BELGE-KATMANI.md` ile `33-BILDIRIM-EPOSTA-SMS-KEP.md`'ye kontör tüketimini,
`07-YETKI-ONAY-NUMARALANDIRMA.md` ile birlikte kapı sırasını, `40-UAT-KABUL-CANLIYA-GECIS.md`'ye paket
doğrulamasını devreder; hepsi `01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak parçalarını kullanır.
