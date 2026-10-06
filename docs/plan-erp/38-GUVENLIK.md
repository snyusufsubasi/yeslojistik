# 38 — Güvenlik

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır.
"Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır. Mevzuat (ihlal bildirim süresi ve
mercii) ile dış hizmet bilgileri `**doğrulanacak:**` etiketiyle yazılır; hukuki değerlendirme için
"hukuk danışmanı onayı gerekir" denir.

## 1. Amaç ve kapsam

Bu doküman, ERP genişlemesi boyunca **güvenlik seviyesinin düşmemesini** sağlar. Bugünkü panel tek
firmaya satılıyor ve güvenlik tarafı şaşırtıcı biçimde olgun: iki adımlı doğrulama, hesap kilidi, oturum
iptali, içerik güvenliği politikası, oran sınırı, dosya türü doğrulama ve şifreli yedek **çalışıyor**
(`docs/plan/34-RISK-GUVENLIK.md:25-38`). Ancak ERP genişlemesi yeni yüzey açar: muhasebe verisi
(şirketin en hassas verisi), başka firmalara satış (çok şirketli yapı), dış entegrasyonlar (entegratör,
banka), dosya yükleme (e-belge, fiş, sözleşme) ve müşteri/tedarikçi portalı. Bu doküman o yüzeyi
kural, test ve kabul ölçütüne bağlar.

Kapsam içindekiler:

1. **Kimlik doğrulama.** Mevcut iki adımlı doğrulama (TOTP) ve hesap kilidinin genişletilmesi.
2. **Oturum yönetimi.** Erişim/yenileme belirteci, cihaz listesi, uzaktan oturum kapatma.
3. **Parola politikası** ve parola sıfırlama.
4. **Yetki yükseltme koruması.** Rol değişimi, kendi kendine yetki verme, ikinci onay.
5. **API güvenliği.** Anahtar yönetimi, oran sınırı, idempotency, CORS.
6. **Girdi doğrulama ve enjeksiyon koruması.** SQL, komut, şablon, yol geçişi, XSS.
7. **Dosya yükleme güvenliği.** Tür, boyut, içerik doğrulama ve virüs taraması.
8. **Sır yönetimi.** Sır dosyaya yazılmaz kuralı, rotasyon, ortam değişkeni/secret disiplini.
9. **Yedek şifreleme** ve geri yükleme güvenliği.
10. **Kişisel veri maskeleme.**
11. **Denetim ve sızma testi planı.**
12. **Olay müdahale** (ihlal bildirimi süresi ve mercii).
13. **Tedarikçi/entegrasyon güvenliği.**
14. **Güvenlik kabul kriterleri ve testler.**

Kapsam dışı: KVKK saklama/imha ve veri sahibi başvurusu (`35-DENETIM-IZI-KVKK-UYUM.md`), performans
hedefleri (`36-PERFORMANS-OLCEK.md`), test işlerinin CI düzeni (`37-TEST-CI-GENISLETME.md`), ekran
tasarımı (`docs/plan/01-ORTAK-SARTNAME.md:49-59`). Hukuki metinlerin içeriği `docs/hukuk/` altındadır
ve **avukat onayı bekler** (`docs/plan/34-RISK-GUVENLIK.md:42`).

## 2. Luca'daki karşılığı

Luca envanterinde güvenlikle doğrudan ilişkilendirilebilecek maddeler: **"ayrıntılı yetkilendirme ile iş
planı yapabilme"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:51`) — rol ve yetki derinliği; **Luca Koza Rest
API** ile dış uygulama senkronu (`:53`) — API anahtarı ve oran sınırı ihtiyacı; **banka entegrasyonu**
(`:67`) ve **TÜRMOB e-imza** (`:71`) — dış servis güveni; **e-Dönüşüm saklama hizmetleri** (`:75-77`) —
verinin üçüncü taraf saklaması; **çoklu dil** (`:52`) ve **çok şirketli yapı** (`:12`) — kurulum
sertleştirmesi.

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>,
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**doğrulanacak:** Luca'da oturum süresi, iki adımlı doğrulama, IP kısıtı ve cihaz yönetimi var mı —
kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'nın bulut sürümünde veri şifreleme
(disk/TLS/kolon) yaklaşımı ve sertifikaları — kaynak: Luca teknik ekibi. **doğrulanacak:** Luca'nın
entegrasyonlarda kullandığı kimlik doğrulama yöntemi (API anahtarı, OAuth, mTLS) — kaynak: Luca
entegrasyon dokümanı. Sitede bu üç konuda bilgi **yoktur**; uydurulmaz.

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Belirteç tabanlı kimlik, httpOnly çerezde.** `server/YesLojistik.Api/Program.cs:58-78` JWT bearer
  yapılandırması; erişim belirteci **çerezden** okunur (`:70-77`) — `localStorage` kullanılmaz, bu
  yüzden XSS ile belirteç çalınması zorlaşır. Anahtar uzunluğu en az 32 karakter olarak **zorlanır**
  (`:55-56`); süreler `server/YesLojistik.Api/Auth/JwtOptions.cs:8-9` (erişim 15 dakika, yenileme 14 gün).
  Çerez bayrakları: `HttpOnly`, `Secure` (ayarlanabilir), `SameSite=Strict`, yenileme çerezi yol ile
  sınırlı (`server/YesLojistik.Api/Auth/TokenService.cs:87-100`, `:15-17`).
- **İki adımlı doğrulama (TOTP).** `server/YesLojistik.Api/Auth/TwoFactorService.cs:48-50` meydan okuma
  ömrü 5 dakika, 10 kurtarma kodu; gizli anahtar **AES-GCM ile şifrelenir** (`:60-66`); kurtarma kodları
  yalnız özet olarak saklanır (`:89-98`, `:103`); aynı 30 saniyelik adım ikinci kez kullanılamaz
  (`:130-146`). Alanlar `server/YesLojistik.Core/Entities/User.cs:23-31`. Uçlar
  `server/YesLojistik.Api/Controllers/TwoFactorController.cs:40`, `:48`, `:64`, `:84`, `:111`.
- **Hesap kilidi.** `server/YesLojistik.Api/Controllers/AuthController.cs:19-20`: 5 hatalı denemede 15
  dakika kilit. Akış `:27-58`; kilit olayı denetim iznine yazılır (`:42`). Kilitli hesap `429`, pasif
  hesap `403`, hatalı giriş `401` döner (`:34-36`, `:46`, `:48-49`). İki adımlı doğrulaması açık hesapta
  sayaç yalnız ikinci adım bitince sıfırlanır (`:22-26` yorumu) — yani şifreyi bilen biri kod
  denemelerini sıfırlayamaz.
- **Oturum iptali ve yenileme döndürmesi (rotation).** `TokenService.cs:40-53` yeni yenileme belirteci
  üretir ve eskileri temizler; `:61-72` belirteci doğrulayıp **iptal eder**; `:59` iki sekmenin aynı
  anda yenilemesi için 30 saniyelik tolerans; `:74-77` şifre değişikliği/çıkışta **tüm** oturumları
  iptal eder; `:80-85` çıkışta tek belirteci iptal eder. Belirteçler yalnız **özet** (SHA-256) olarak
  saklanır (`:21`, `server/YesLojistik.Core/Entities/User.cs:46-54`).
- **Parola değiştirme ve sıfırlama.** `AuthController.cs:144-158` mevcut parolayı doğrulayıp değiştirir;
  `:161-186` sıfırlama bağlantısı üretir ve eski belirteçleri geçersiz kılar (`:171`); `:188-206` yeni
  parolayı belirteçle belirler. Sıfırlama belirteci tek kullanımlık ve **yalnız özet** saklanır
  (`User.cs:34-44`).
- **Oran sınırı (rate limit).** `Program.cs:86-107`: giriş ucu IP başına dakikada 10 (`:91-93`),
  herkese açık takip sayfası 60 (`:95-97`), yedek indirme 2 (`:99-101`); reddedilen istek **429** ve
  Türkçe mesaj (`:102-106`). Uygulama yeri `Program.cs:172`; giriş uçlarında öznitelik
  (`AuthController.cs:65`, `:103`, `:161`, `:188`).
- **Yetkilendirme ve varsayılan politika.** `Program.cs:79-84`: özel `[Authorize]` belirtilmeyen **tüm**
  uçlar yalnız ofis kullanıcılarına açıktır (şoför hariç) — yani "yetki vermeyi unutma" hatası kapalı
  yönlüdür. Politikalar `server/YesLojistik.Api/Auth/Policies.cs:7-17`.
- **Ayna ve lisans kapıları.** `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-28` ayna
  açıkken belirli yollara yazmayı reddeder; `.../LicenseGuard.cs:22-41` abonelik bitince GET dışı
  istekleri 403 yapar (giriş, lisans, yönetim ve dışa aktarma serbest, `:16-20`).
- **Girdi doğrulama.** `Program.cs:125-133` FluentValidation otomatik doğrulama; hata mesajları
  tek noktadan Türkçeleştirilir (`:127-128`) ve `400` problem ayrıntısıyla döner (`:129-133`).
  Doğrulayıcı testleri `server/YesLojistik.Tests/Unit/ValidatorTests.cs:6-31`.
  Arama deseni `%`/`_` kaçışlanır (`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:46-49`).
- **Güvenlik başlıkları.** `server/YesLojistik.Api/Infrastructure/HostingSupport.cs:52-61`:
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` (kamera/mikrofon/konum kapalı, `:73`) ve HTTPS'te HSTS (`:59-60`).
  Panel için **içerik güvenliği politikası** (`:68-71`): `default-src 'self'`, `frame-ancestors 'none'`,
  `object-src 'none'`, `form-action 'self'`; yalnız kendi sunucumuz ve harita karoları serbest.
- **Yönlendirme güvenliği.** `HostingSupport.cs:35-46` sunucu taşınmasında `/api/health` dışındaki
  istekleri 308 ile yönlendirir; testi `server/YesLojistik.Tests/Integration/MigrationTests.cs:11`.
- **Hata gizleme.** `Program.cs:162` `UseExceptionHandler()`; `server/YesLojistik.Api/Infrastructure/ExceptionHandler.cs:10-12`
  teknik yığın izini kullanıcıya göstermez, loglar.
- **Dosya yükleme güvenliği (bugünkü hâli).** `server/YesLojistik.Infrastructure/Services/AttachmentService.cs:12`
  ek başına 10 MB; sıfır/negatif boyut reddi (`:24`); **tür uzantıya değil içeriğin ilk baytlarına**
  göre belirlenir (`:64-72`) ve yalnız JPEG, PNG, WEBP, PDF kabul edilir (`:29-30`). Kayıt adı yoldan
  arındırılır (`:36-37`) ve depolama yolu `Guid` ile üretilir (`:32`) — yol geçişi (path traversal)
  engellenir. Silme yumuşaktır (`:56-62`).
- **Sır yönetimi kuralı (bugünkü kural).** `AGENTS.md:23`: "Şifre, token, anahtar hiçbir dosyaya ya da
  komuta yazılmaz." Örnek dosyada yalnız boş alanlar vardır (`.env.example:10` `JWT_KEY=`,
  `:29` `BACKUP_TOKEN=`) ve `.env` dosyasının depoya eklenmemesi ilk satırda yazılıdır
  (`.env.example:1`). Lisans özel anahtarı `.gitignore` ile engellidir (`AGENTS.md:23`).
  Ayna işinde değerler `::add-mask` ile maskelenir (`tools/legacy/secrets.sh:43`) ve ortama aktarılır (`:45`);
  ayna işi depoya yalnız **okuma** izniyle çalışır (`.github/workflows/mirror.yml:22-23`) ve indirdiği
  veriyi siler (`:60-62`). Ayna işi yalnız sayı basar (`:59`).
- **Yedek şifreleme.** `.github/workflows/backup.yml:83-86` yedeği GPG ile **AES256** ve parola ile
  şifreler; artefakt olarak yükler (`:91-93`). Geri yükleme yalnız `Backup__AllowRestore=true` iken
  yapılabilir (`.github/workflows/restore.yml:2`) ve "GERİ YÜKLE" onay metni ister (`restore.yml:29-31`).
  Yedekleme öncesi geri yükleme tatbikatı koşar (`backup.yml:72-82`).
- **Kişisel veri maskeleme (bugünkü hâli).** Genel takip sayfasında plaka maskelenir
  (`server/YesLojistik.Infrastructure/Services/TrackingService.cs:129-134`); konum yalnız araç o sefer
  için yoldayken paylaşılır (`:116-120`); bağlantı teslimden 7 gün sonra kapanır (`:14`, `:109`).
  Denetim izinde hassas alanlar hariç tutulur
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:12-21`).
- **Veri indirme ve hesap kapatma.** `server/YesLojistik.Api/Controllers/DataExportController.cs:25`
  bütün veriyi ZIP olarak verir (`:34`); kapatma talebi 30 gün ek süre tanır (`:27`) ve firma adı
  doğrulaması ister (`:60`); talep geri çekilebilir (`:80`). Uçtan uca testi
  `client/e2e/security.spec.ts:25-47`.
- **Güvenlik testleri bugün vardır.** `server/YesLojistik.Tests/Integration/AuthTests.cs:13-63` (giriş,
  kilit, oturum), `.../TwoFactorTests.cs:17-121`, `.../Unit/TotpTests.cs:8-41`,
  `.../Integration/BackupTests.cs:24-83`, `.../Integration/DataExportTests.cs:16-101`,
  `.../Unit/AttachmentSniffTests.cs:6-25`, `client/e2e/security.spec.ts:49-119` (2FA ve kurtarma kodu).
- **Canlı kontrol 401 denetimi yapar.** `.github/workflows/smoke.yml:36` girişsiz `/api/customers`
  isteğinin 401 döndüğünü doğrular.
- **Gömülü sır denetimi yapıldı.** `docs/plan/34-RISK-GUVENLIK.md:26-35`: repoda ve tüm git geçmişinde
  gömülü şifre/anahtar bulunmadı; repo özel yapıldı (5 Ekim); **secret scanning kapalıdır**
  (ücretsiz planda kapalı, `:91`).

**Eksikler (kanıtlı).**

1. **Parola politikası yoktur.** `AuthController.cs` akışında uzunluk/karmaşıklık kuralı görünmez;
   yalnız istemci ve doğrulayıcı tarafında kural varsa da **sunucuda zorlanan** bir politika
   (en az 12 karakter, sızdırılmış parola listesi, tekrar kullanım engeli, son kullanma uyarısı)
   tanımlı değildir.
2. **Oturum/cihaz listesi yoktur.** Kullanıcı hangi cihazlardan açık olduğunu göremez ve tek tek
   kapatamaz; yalnız "tümünü iptal et" vardır (`TokenService.cs:74-77`).
3. **API anahtarı yoktur.** Dış entegrasyon için tek yol kullanıcı oturumudur; kapsamı sınırlı,
   rotasyonu olan bir anahtar yoktur. (Lisans ve yedek uçlarında paylaşılan jeton vardır:
   `.env.example:29` `BACKUP_TOKEN`.)
4. **Idempotency yalnız kısmen vardır.** Bazı uçlar `ClientRequestId` taşır
   (`server/YesLojistik.Infrastructure/Services/AttachmentService.cs:21-22`) ve denetim adları listesinde
   "İstek kimliği" geçer (`AuditTrail.cs:44`), ama genel bir idempotency anahtarı (`Idempotency-Key`)
   sözleşmesi yoktur.
5. **Virüs taraması yoktur.** Dosya türü içerikten doğrulanır (`AttachmentService.cs:64-72`) ama
   kötü amaçlı içerik (makro, gömülü betik, PDF eylemi) taranmaz.
6. **Dosya boyutu üst sınırı yalnız uygulama düzeyindedir.** Sunucu istek gövdesi sınırı ayrıca
   ayarlanmamıştır; büyük gövdeyle bellek tüketimi denenmemiştir.
7. **Sızma testi yapılmamıştır.** `docs/plan/34-RISK-GUVENLIK.md` bir **gizlilik/secret denetimi**
   anlatır (`:25-38`) ama yetki yükseltme, enjeksiyon, SSRF, IDOR gibi saldırı sınıfları denenmemiştir.
8. **Olay müdahale planı yoktur.** İhlal bildirimi süresi, mercii ve iletişim zinciri yazılı değildir.
9. **Tedarikçi/entegrasyon envanteri yoktur.** Hangi dış servise hangi veri gittiği, hangi anahtarla ve
   hangi sözleşmeyle belirsizdir; alt işleyen listesi de yoktur.
10. **Yetki yükseltme koruması yalnız role bakar.** Bir yönetici kendine yeni yetki verebilir; "kendi
    rolünü yükseltme" veya "son yöneticiyi pasife alma" engeli tanımlı değildir.
11. **CORS üretimde kapalıdır ama kural yazılı değildir.** `Program.cs:116-118` yalnız tanımlı
    kaynaklara izin verir; üretimde liste boşsa CORS hiç açılmaz. Kural ve testi yoktur.
12. **`Swagger` yalnız geliştirmede açıktır (`Program.cs:164-168`) — bu doğrudur**; ancak başka
    ortamda açılmasını engelleyen bir test yoktur.
13. **Denetim izi okuma erişimini loglamaz** (ayrıntı: `35`) — güvenlik olayları için eksiktir.

## 4. Hedef ekranlar ve alanlar

**4.1. Güvenlik Merkezi ekranı (yeni).** Özet kartları: 2FA durumu, son girişler, başarısız giriş
sayısı, kilitli hesaplar, açık oturum sayısı, süresi yaklaşan lisans, son yedek zamanı, son sızma testi
tarihi, açık güvenlik bulgusu sayısı.

**4.2. Oturumlar ve Cihazlar ekranı (yeni).** Satır alanları: cihaz adı (tarayıcı/işletim sistemi),
konum (IP'den kaba tahmin — **doğrulanacak:** IP konum servisi kullanılacak mı), ilk/son görülme,
IP (maskeli), rol, durum (açık/iptal), "bu oturumu kapat" düğmesi, "diğer tüm oturumları kapat".

**4.3. Parola Politikası ekranı (yeni).** Alanlar: en az uzunluk, büyük/küçük harf ve rakam/simge
zorunluluğu, sık kullanılan/sızdırılmış parola reddi, son N parolanın tekrarının engellenmesi, parola
ömrü ve uyarı günü, kilit eşiği ve süresi, oturum süresi (erişim/yenileme), 2FA zorunluluğu (rol
bazında). Değişiklik onay akışına bağlıdır ve denetim izine yazılır.

**4.4. API Anahtarları ekranı (yeni).** Alanlar: ad, kapsam (uç grupları: rapor okuma, sevkiyat yazma,
e-belge gönderme), oluşturma/son kullanım/bitiş tarihi, IP kısıtı, oran sınırı, durum, rotasyon
(eskisini N gün geçerli tut), iptal. Anahtar **yalnız bir kez** gösterilir; veritabanında **yalnız
özeti** saklanır.

**4.5. Güvenlik Olayları ekranı (yeni).** Satır alanları: zaman, tür (başarısız giriş, kilit, 2FA
değişimi, yetki değişimi, anahtar kullanımı, dosya reddi, oran sınırı, şüpheli erişim), önem
(bilgi/uyarı/kritik), kullanıcı, kaynak (IP özeti, istemci), sonuç, ilişkili kayıt, "incelendi" işareti
ve notu.

**4.6. Dosya Karantinası ekranı (yeni).** Tarama durumu (bekliyor/temiz/şüpheli/reddedildi), dosya adı,
tür, boyut, özet (SHA-256), yükleyen, ilgili kayıt, tarama sonucu, karantinadan çıkarma/verme kararı,
gerekçe.

**4.7. Olay Müdahale ekranı (yeni).** Olay kaydı: olay no, tespit zamanı, kaynak, etki (hangi veri,
kaç kişi), şiddet, durum (açık/inceleniyor/kapatıldı), yapılan işlemler, bildirim gerekiyor mu, bildirim
zamanı ve mercii, kök neden, önlem, sorumlu, kapanış onayı. Ekran, süre sayacı gösterir.

**4.8. Tedarikçi ve Entegrasyon Envanteri ekranı (yeni).** Alanlar: ad, tür (barındırma, e-posta, SMS,
entegratör, banka, harita, ödeme), kullanım amacı, paylaşılan veri kategorileri, veri konumu/ülkesi,
kimlik doğrulama biçimi, anahtarın nerede saklandığı, sözleşme/DPA durumu, son gözden geçirme, risk
notu, yedek tedarikçi.

**4.9. Yetki Yükseltme Onayı penceresi (yeni).** Rol değişimi, anahtar oluşturma, güvenlik ayarı
değişikliği ve oturum toplu kapatma işlemleri için ikinci onay penceresi: işlem özeti, etki, gerekçe
(zorunlu), onaylayan kişi, "bu işlem denetim izine yazılır" bilgisi.

## 5. İş kuralları

**5.1. Kimlik doğrulama.** (a) İki adımlı doğrulama **yönetici ve muhasebe** rolleri için zorunludur;
diğer ofis rolleri için önerilir, şoför uygulamasında cihaz kaydı ile sınırlanır. (b) Kilit eşiği
5 deneme / 15 dakikadır (`AuthController.cs:19-20`) ve **rol bazında sıkılaştırılabilir**; yönetici
hesabında 3 deneme önerilir. (c) Kilit, başarılı girişte sıfırlanır; **2FA'lı hesapta sayaç yalnız
ikinci adım bitince** sıfırlanır (mevcut davranış korunur, `AuthController.cs:22-26`). (d) Kurtarma
kodu tek kullanımlıktır ve kullanıldığında kullanıcıya e-posta ile bildirilir. (e) Şifre sıfırlama
bağlantısı tek kullanımlık, kısa ömürlüdür ve **yalnız özet** saklanır (`User.cs:34-44`). (f) Aynı
kullanıcı için eşzamanlı başarısız deneme sayacı IP'den bağımsız işler (mevcut davranış).

**5.2. Oturum yönetimi.** Erişim belirteci 15 dakika, yenileme 14 gündür (`JwtOptions.cs:8-9`);
yenileme **döndürmeli**dir (mevcut, `TokenService.cs:61-72`) ve yeniden kullanım tespit edilirse
(kısa tolerans dışında) oturum iptal edilir (`:68`). Kurallar: (a) her oturum kaydı cihaz parmak izi
(özet) ve IP özeti taşır; (b) kullanıcı cihaz listesini görür ve tek tek kapatabilir; (c) rol değişimi,
şifre değişimi, 2FA kapatma ve hesap pasife alma **tüm** oturumları iptal eder (`:74-77`); (d) 30 gün
kullanılmayan oturum otomatik kapanır; (e) "beni hatırla" seçeneği yoktur — oturum süresi ayardan gelir.
Çerez bayrakları korunur: `HttpOnly`, `SameSite=Strict`, `Secure` üretimde **zorunlu**
(`TokenService.cs:87-100`; `SECURE_COOKIES` üretimde `true` — `.env.example:16`).

**5.3. Parola politikası.** En az 12 karakter; en az bir büyük harf, bir küçük harf, bir rakam;
kullanıcı adı/e-posta içermez; en sık kullanılan 10.000 parola listesinde yoktur; son 5 parola tekrar
edilemez; ilk girişte değiştirme zorunludur. Parolalar `PasswordHasher<User>` ile özetlenir
(`Program.cs:49`); düz metin parola **hiçbir yerde** saklanmaz ve **loga yazılmaz**. Parola ömrü
önerilir ama zorunlu değildir (modern yaklaşım); 2FA zorunluluğu parola ömründen daha etkilidir.

**5.4. Yetki yükseltme koruması.** (a) Kimse **kendi rolünü** yükseltemez. (b) Yönetici, kendi
yetkilerini genişleten yeni bir rol tanımı oluşturamaz; rol tanımı değişikliği ikinci onay ister.
(c) **Son yönetici** pasife alınamaz veya silinemez. (d) Kullanıcı, kendine API anahtarı veremez.
(e) Rol değişimi anında tüm oturumlar iptal edilir. (f) "Süper kullanıcı" arka kapısı yoktur; bakım
modu (`Program.cs:175`, `server/YesLojistik.Api/Infrastructure/Maintenance.cs`) bile kimlik ister.
(g) Lisans "sahip modu" (`AGENTS.md:76`) yalnız kendi kurulumumuz içindir ve **canlı müşteri
kurulumunda kapalı** olmalıdır; açık/kapalı olduğu Güvenlik Merkezi'nde görünür.

**5.5. API güvenliği.**
- **Anahtar.** `Authorization: Bearer <anahtar>` yerine `X-Api-Key` başlığı; anahtar **yalnız özet**
  olarak saklanır, oluşturulduğu anda bir kez gösterilir; kapsam (uç grubu), IP kısıtı ve oran sınırı
  taşır; rotasyonda eski anahtar en fazla 7 gün geçerli kalır.
- **Oran sınırı.** Mevcut politikalara ek: anahtar başına dakikada 120 istek; yazma uçları için
  dakikada 30; e-belge gönderme için dakikada 10; dosya yükleme için dakikada 20; şifre sıfırlama
  için saatte 5. Sınır aşımı **429** ve `Retry-After` başlığı döner.
- **Idempotency.** Yazma uçları `Idempotency-Key` başlığını kabul eder; aynı anahtarla gelen ikinci
  istek **yeni kayıt oluşturmaz**, ilk yanıtı döner (24 saat saklanır). Yeni kayıt üretmeyen uçlar
  bu başlığı yok sayar; davranış dokümante edilir.
- **CORS.** Varsayılan **kapalıdır** (`Program.cs:116-118`, liste boşsa CORS açılmaz — mevcut doğru
  davranış korunur). Açıldığında yalnız `https://` kaynaklar, açık metot listesi (`GET`, `POST`, `PUT`,
  `DELETE`), sınırlı başlık listesi ve `AllowCredentials` yalnız kendi alan adlarımız için. Joker (`*`)
  kaynak **yasaktır**; testle engellenir.
- **Yöntem ve başlık hijyeni.** Beklenmeyen metot `405`; bilinmeyen uç `404`; gövdesiz `POST` `400`.
- **Yanıt başlıkları.** Güvenlik başlıkları (`HostingSupport.cs:52-61`) API yanıtlarında da bulunur;
  `Server` başlığı sürüm bilgisi sızdırmaz.

**5.6. Girdi doğrulama ve enjeksiyon koruması.** (a) **SQL enjeksiyonu:** LINQ/EF Core parametreli
sorgu; ham SQL yalnız `ExecuteDeleteAsync`/`ExecuteUpdateAsync` gibi parametreli yollarla; kullanıcı
girdisinden SQL birleştirme **yasaktır**. Arama `%`/`_` kaçışlanır (`QueryExtensions.cs:46-49`).
(b) **XSS:** React otomatik kaçışlar; `dangerouslySetInnerHTML` **yasaktır**; CSP (`HostingSupport.cs:68-71`)
ikinci savunmadır; zengin metin alanları (fatura notu) sunucuda arındırılır. (c) **Komut enjeksiyonu:**
`Process.Start` yalnız sabit program adı ve **dizi** argümanla çağrılır
(`server/YesLojistik.Infrastructure/Services/BackupService.cs:17-18`, `:35`, `:48`); kabuk kullanılmaz.
(d) **Yol geçişi:** yüklenen dosya adı `Path.GetFileName` ile arındırılır ve yol `Guid` olur
(`AttachmentService.cs:32`, `:36-37`). (e) **CSV/Excel formül enjeksiyonu:** `=`, `+`, `-`, `@` ile
başlayan hücre değerleri dışa aktarmada kesme işaretiyle kaçışlanır. (f) **SSRF:** dış çağrı adresleri
sabittir veya beyaz listededir; kullanıcı girdisinden URL alınmaz. (g) **Seri durumdan çıkarma:**
`System.Text.Json`, polimorfik tip çözümü kapalı; döngü derinliği sınırlı. (h) **Balon (zip bomb):**
arşiv açma boyut sınırı ve özyineleme sınırı vardır.

**5.7. Dosya yükleme güvenliği.** (a) **Tür:** içerik baytlarından (`AttachmentService.cs:64-72`);
uzantı tek başına kabul edilmez. (b) **Boyut:** uygulama sınırı 10 MB (`:12`) + sunucu istek gövdesi
sınırı (yeni). (c) **Virüs taraması:** yükleme önce **karantinaya** alınır, tarama "temiz" demeden
kullanıcıya gösterilmez/indirilmez; şüpheli dosya karantinada bekler ve yöneticiye bildirilir.
Tarama motoru seçimi **doğrulanacak:** hangi açık kaynak/paylaşımlı tarayıcı, lisansı ve maliyeti —
kaynak: teknik ekip kararı. (d) **Önizleme:** PDF ve görsel dışındaki içerik satır içi gösterilmez;
indirme `Content-Disposition: attachment` ve doğru `Content-Type` ile yapılır. (e) **Depolama:** dosya
adı kullanılmaz, `Guid` kullanılır; depolama yolu kullanıcıya gösterilmez
(`AuditTrail.cs:19` yolu denetim izinden hariç tutar). (f) **Aynı içerik:** SHA-256 özeti ile tekrar
yükleme tespit edilir (`36`). (g) **İmha:** silme yumuşak + depolama silme (mevcut, `:56-62`).

**5.8. Sır yönetimi.** (a) Kural **değişmez:** sır hiçbir dosyaya, komuta, ekran görüntüsüne veya
dokümana yazılmaz (`AGENTS.md:23`); ortam değişkeni veya GitHub Secret kullanılır. (b) Üretimde
`JWT_KEY` en az 48 rastgele bayttır ve **yıllık** döndürülür (döndürmede tüm oturumlar kapanır —
planlı bakım penceresi). (c) Her sır için sahibi, saklama yeri, döndürme sıklığı ve son döndürme
tarihi Tedarikçi Envanteri'nde yazılıdır. (d) Sır **loglara** yazılmaz; ayna işi değerleri maskeler
(`tools/legacy/secrets.sh:43`). (e) Yerel geliştirmede `.env` kullanılır ve `.gitignore` ile engellidir
(`.env.example:1`). (f) Depo **özel** kalır; `secret scanning`/`push protection` açılabilirse açılır
(`docs/plan/34-RISK-GUVENLIK.md:91`). (g) Sır sızıntısı şüphesinde: anahtar döndür, oturumları iptal
et, olay kaydı aç, etkilenen veriyi belirle.

**5.9. Yedek şifreleme.** Yedek **her zaman** şifrelenir (AES256 + parola,
`.github/workflows/backup.yml:83-86`); parola GitHub Secret'tadır, depoda veya dokümanda yoktur.
Yedek dosyası indirildiğinde geçici dosya iş sonunda silinir (`backup.yml:87`). Geri yükleme yalnız
`Backup__AllowRestore=true` ve "GERİ YÜKLE" onayıyla yapılır (`restore.yml:2`, `:29-31`); iş sonunda
ayar **tekrar kapatılır**. Bir yedeğin kaybolması veya parolanın unutulması durumunda veri **geri
getirilemez** — bu yüzden yedeğin geri yüklenebilirliği her koşuda sınanır (`backup.yml:72-82`).

**5.10. Kişisel veri maskeleme.** Ekran ve çıktılarda: TCKN `*********1234`, telefon `0*** *** ** 67`,
IBAN `TR** **** **** **** **** **** ** 12`, e-posta `ab***@alan.com`, plaka takip sayfasında
`34 VES **` (`TrackingService.cs:129-134`). Maskeleme **sunucuda** yapılır (istemciye ham veri
gönderilmez). Yetkili roller (yönetici, muhasebe) ham veriyi iş amacıyla görebilir; her ham görüntüleme
denetim iznine yazılır. Dışa aktarmada maskeleme **ayardan** kapatılabilir; kapatma ikinci onay ister.

**5.11. Denetim ve sızma testi planı.** (a) **Yılda en az bir kez** dış sızma testi; satış öncesi ve
çok şirketli sürüm öncesinde **bir kez** ek test. (b) Kapsam: kimlik doğrulama ve oturum, yetki
yükseltme (IDOR/dikey-yatay), enjeksiyon (SQL, komut, şablon), dosya yükleme, SSRF, oran sınırı atlatma,
iş mantığı (negatif tutar, çift kayıt, idempotency), çok şirketli izolasyon. (c) Otomatik tarama her
CI'da (bağımlılık zafiyet taraması); dinamik tarama haftalık. (d) Bulgular `PentestFinding` tablosuna
yazılır; kritik bulgu **7 gün**, yüksek **30 gün**, orta **90 gün** içinde kapatılır. (e) Test kuralları:
**canlı veriyle test yapılmaz**, üretim ortamında yıkıcı test yapılmaz, test öncesi yazılı izin alınır.
(f) Sonuç raporu Güvenlik Merkezi'nde görünür.

**5.12. Olay müdahale (ihlal bildirimi).** Adımlar: (1) **Tespit** — uyarı veya ihbar; olay kaydı
açılır. (2) **Sınırlama** — etkilenen anahtar/oturum iptal edilir, erişim kapatılır, gerekiyorsa
bakım modu. (3) **Değerlendirme** — hangi veri, kaç kişi, hangi şirket(ler), yurt dışına gitti mi.
(4) **Bildirim** — veri sorumlusu (müşteri firma) bilgilendirilir; Kişisel Verileri Koruma Kurulu'na
bildirim **süresi ve mercii** ile ilgili kişilere bildirim usulü **doğrulanacak:** ilgili mevzuat
maddeleri — kaynak: hukuk danışmanı; **hukuk danışmanı onayı gerekir**. (5) **Kanıt** — loglar ve
denetim izi değiştirilmeden saklanır. (6) **Kök neden ve önlem** — kalıcı düzeltme, test eklenir.
(7) **Kapanış** — sorumlu onayı ve özet rapor. İletişim zinciri (kim kimi arar, kim açıklama yapar)
yazılıdır ve yılda bir prova edilir. **doğrulanacak:** bildirim için kullanılacak kanal ve form —
kaynak: hukuk danışmanı/KVKK Kurumu rehberi.

**5.13. Tedarikçi/entegrasyon güvenliği.** (a) Her dış servis için envanter satırı zorunludur (§4.8).
(b) **Veri minimizasyonu:** entegratöre yalnız gereken alan gider (örn. e-faturada alıcı e-postası
gerekmiyorsa gönderilmez). (c) Kimlik doğrulama: tercihen anahtar/istemci sertifikası; şifre paylaşımı
**yasaktır**. (d) **Giden çağrılar** zaman aşımı ve yeniden deneme ile sınırlıdır; başarısızlık
kuyruğa alınır (`37`). (e) Gelen webhook çağrıları **imza doğrulaması** ile kabul edilir; imzasız
istek reddedilir. (f) Sözleşme: veri işleme sözleşmesi (DPA), alt işleyen bildirimi, silme taahhüdü,
ihlal bildirim süresi. (g) Entegratör seçimi `docs/ENTEGRATOR-EKLEME.md` akışıyla yapılır; **gerçek
entegratör henüz yoktur** (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:14`).
(h) Barındırma sağlayıcısı (Render) ve veri konumu envanterde yazılıdır; yurt dışı aktarım riski
`35` dokümanında ele alınır.

**5.14. Ortam sertleştirmesi.** Üretimde: `Swagger` kapalı (`Program.cs:164-168` mevcut davranış),
ayrıntılı hata yok (mevcut, `ExceptionHandler.cs:10-12`), `SECURE_COOKIES=true` (`.env.example:16`),
HSTS açık (`HostingSupport.cs:59-60`), bakım ve lisans kapıları açık (`Program.cs:175-176`), varsayılan
yönetici parolası **değiştirilmiş** (demo parolası canlıda yasak — `docs/plan/34-RISK-GUVENLIK.md:89-90`,
`AGENTS.md:65` örnek hesabın canlı şifre olmadığını yazar), örnek veri yüklenmemiş
(`Program.cs:153-154` yalnız `Seed:SampleData` açıkken).

## 6. Veri modeli

Hepsi **yeni tablo**dur ve `CompanyId` taşır (`docs/plan-erp/05-VERI-MODELI.md:39-40`). Migration
kuralı: yalnız ekleme, boş olabilen sütun/tablo (`AGENTS.md:29`). Erişim/giriş olayları `35` dokümanında
tanımlı `AccessLog` tablosuyla **paylaşılır** (aynı olay iki yere yazılmaz).

1. `Session` — `Id`, `CompanyId`, `UserId`, `RefreshTokenId`, `DeviceLabel`, `ClientHash`, `IpHash`,
   `CreatedAt`, `LastSeenAt`, `ExpiresAt`, `RevokedAt`, `RevokeReason`.
2. `ApiKey` — `Id`, `CompanyId`, `Name`, `KeyHash`, `Prefix`, `Scopes` (JSON dizi), `IpAllowList`,
   `RateLimitPerMinute`, `CreatedBy`, `CreatedAt`, `LastUsedAt`, `ExpiresAt`, `RevokedAt`,
   `RotatedFromId`.
3. `IdempotencyRecord` — `Id`, `CompanyId`, `Key`, `UserId`, `Method`, `Path`, `RequestHash`,
   `ResponseStatus`, `ResponseBody` (küçük), `CreatedAt`, `ExpiresAt`.
4. `PasswordPolicy` — `Id`, `CompanyId`, `MinLength`, `RequireUpper`, `RequireLower`, `RequireDigit`,
   `RequireSymbol`, `BlockCommon`, `HistoryCount`, `MaxAgeDays`, `LockoutThreshold`, `LockoutMinutes`,
   `AccessTokenMinutes`, `RefreshTokenDays`, `RequireTwoFactorRoles` (JSON), `Version`, `ApprovedBy`,
   `ApprovedAt`.
5. `UserPasswordHistory` — `Id`, `CompanyId`, `UserId`, `PasswordHash`, `CreatedAt`.
6. `SecurityEvent` — `Id`, `CompanyId`, `At`, `Kind`, `Severity` (Info/Warning/Critical), `UserId`,
   `IpHash`, `ClientHash`, `Result`, `EntityType`, `EntityId`, `Detail`, `ReviewedAt`, `ReviewedBy`,
   `Note`.
7. `FileScan` — `Id`, `CompanyId`, `StoredFileId`, `Sha256`, `Status` (Pending/Clean/Suspicious/
   Rejected), `Engine`, `EngineVersion`, `ScannedAt`, `Detail`, `DecidedBy`, `DecidedAt`.
8. `Vendor` — `Id`, `CompanyId`, `Name`, `Kind`, `Purpose`, `DataCategories` (JSON), `DataRegion`,
   `AuthMethod`, `SecretLocation`, `DpaStatus`, `LastReviewAt`, `RiskNote`, `IsActive`.
9. `Incident` — `Id`, `CompanyId`, `No`, `DetectedAt`, `Source`, `Severity`, `Status`,
   `AffectedData` (JSON), `AffectedCount`, `CrossBorder`, `NotifiedAt`, `NotifiedTo`,
   `RootCause`, `Remediation`, `OwnerId`, `ClosedAt`, `ClosedBy`.
10. `PentestFinding` — `Id`, `CompanyId`, `Title`, `Severity`, `Category`, `FoundAt`, `FoundBy`,
    `Evidence`, `Status`, `DueAt`, `ClosedAt`, `FixNote`.

**Ekleme (mevcut tabloya sütun).** `User` tablosuna `PasswordChangedAt` (DateTime?, null),
`MustChangePassword` (bool, null) ve `FailedTwoFactorCount` (int, null) eklenir. `RefreshToken`
tablosuna `DeviceLabel` (metin(100), null) ve `IpHash` (metin(64), null) eklenir.

**İlişkiler.** `Session` → `RefreshToken` (bir-bir); `ApiKey` → `ApiKey` (rotasyon zinciri);
`FileScan` → `StoredFile`; `Incident` → `PentestFinding` (opsiyonel); `SecurityEvent` → `AccessLog`
(aynı olay için ortak `CorrelationId`). Yüksek hacimli tablolar (`SecurityEvent`, `IdempotencyRecord`)
180 gün / 24 saat sonra otomatik silinir; `IdempotencyRecord.Key` + `CompanyId` tekil indekstir.

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| POST | `/api/auth/login` | Giriş (mevcut; politika ve 2FA denetimi eklenir) | Anonim + oran sınırı |
| POST | `/api/auth/2fa/verify` | İkinci adım (mevcut) | Anonim + oran sınırı |
| POST | `/api/auth/refresh` | Oturum yenileme (mevcut, döndürmeli) | Anonim |
| POST | `/api/auth/logout` | Çıkış (mevcut) | Oturum |
| GET | `/api/security/overview` | Güvenlik Merkezi özeti | Admin |
| GET | `/api/security/sessions` | Açık oturumlar | Admin; kullanıcı kendi listesi |
| DELETE | `/api/security/sessions/{id}` | Tek oturumu kapat | Admin; kullanıcı kendi oturumu |
| POST | `/api/security/sessions/revoke-all` | Kullanıcının tüm oturumlarını kapat | Admin |
| GET/PUT | `/api/security/password-policy` | Parola/oturum politikası | Admin + ikinci onay |
| GET | `/api/security/api-keys` | Anahtar listesi (yalnız ön ek) | Admin |
| POST | `/api/security/api-keys` | Anahtar oluştur (tam değer bir kez döner) | Admin + ikinci onay |
| POST | `/api/security/api-keys/{id}/rotate` | Rotasyon | Admin + ikinci onay |
| DELETE | `/api/security/api-keys/{id}` | İptal | Admin + ikinci onay |
| GET | `/api/security/events` | Güvenlik olayları | Admin |
| POST | `/api/security/events/{id}/review` | İncelendi işareti + not | Admin |
| GET | `/api/security/file-scans` | Dosya tarama listesi | Admin, Operasyon |
| POST | `/api/security/file-scans/{id}/decide` | Karantina kararı | Admin |
| GET/POST | `/api/security/incidents` | Olay listesi/oluştur | Admin |
| POST | `/api/security/incidents/{id}/notify` | Bildirim kaydı | Admin + ikinci onay |
| POST | `/api/security/incidents/{id}/close` | Kapanış | Admin + ikinci onay |
| GET/POST | `/api/security/vendors` | Tedarikçi envanteri | Admin |
| GET/POST | `/api/security/pentests` | Sızma testi bulguları | Admin |

Dış entegrasyon uçları `X-Api-Key` başlığıyla ve anahtarın kapsamındaki uçlarla sınırlıdır; anahtar
kapsamı dışındaki istek `403` döner. Yazma uçları `Idempotency-Key` başlığını destekler. Liste uçları
`PagedResult<T>` sözleşmesini kullanır
(`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:23-31`).

## 8. Yetki, onay ve denetim izi

| İş | Yönetici | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Güvenlik Merkezi görme | ✔ | — | — | — |
| Oturum listesi (tümü) | ✔ | — | — | — |
| Kendi oturumunu kapatma | ✔ | ✔ | ✔ | ✔ |
| Parola politikası değiştirme | ✔ + ikinci onay | — | — | — |
| API anahtarı oluşturma/iptal | ✔ + ikinci onay | — | — | — |
| Güvenlik olayı inceleme | ✔ | — | — | — |
| Karantina kararı | ✔ | — | — | — |
| Olay bildirimi ve kapanış | ✔ + ikinci onay | — | — | — |
| Tedarikçi envanteri | ✔ | görme | — | — |
| Sızma testi bulguları | ✔ | — | — | — |
| Kendi 2FA'sını açma/kapatma | ✔ | ✔ | ✔ | ✔ |

- **maker-checker.** Parola politikası, anahtar oluşturma/rotasyon/iptal, olay bildirimi ve kapanış,
  rol değişikliği, maskeleme kapatma: "hazırlayan ≠ onaylayan" (`07`).
- **Denetim izi.** Anonimleştirilmiş şu olaylar yazılır: giriş/çıkış, başarısız giriş, kilit, 2FA
  açma/kapatma, kurtarma kodu kullanımı, şifre değişimi, rol değişimi, anahtar oluşturma/iptal,
  politika değişikliği, karantina kararı, olay bildirimi/kapanış, maskeleme kapatma, ham kişisel veri
  görüntüleme. Kayıtlar append-only (`35`); silinemez, yalnız süresi dolunca silinir.
- **Şifre asla loglanmaz.** Denetim izi ve uygulama logu parola, anahtar veya belirteç içermez;
  `AuditTrail.cs:12-21` hariç tutma listesi bu kuralın teknik dayanağıdır ve genişletilir.
- **IP saklama.** Ham IP saklanmaz; **özet** (tuzlu hash) tutulur (`Session.IpHash`, `SecurityEvent.IpHash`).
  Ham IP gerekiyorsa kısa süreli (7 gün) ve maskeli saklanır.

## 9. Kabul kriterleri

1. Parola politikası **sunucuda** zorlanır; kısa parola `400` döner. Politika değişikliği denetim izine
   ve sürüm numarasına yansır.
2. 5 hatalı denemede hesap kilitlenir (mevcut, `AuthController.cs:19-20`); yönetici hesabında eşik
   ayarlanabilir ve test edilir.
3. Yönetici ve muhasebe rollerinde 2FA açık değilse giriş **reddedilir** (zorunluluk testi).
4. Oturum listesi cihaz bazında görünür; tek oturum kapatma ve tümünü kapatma çalışır; kapatılan
   oturumun erişim belirteci 15 dakika içinde değil, **yenileme anında** geçersiz olur ve test edilir.
5. Şifre değişimi, rol değişimi ve 2FA kapatma **tüm** oturumları iptal eder (test kanıtı).
6. Kimse kendi rolünü yükseltemez; son yönetici pasife alınamaz/silinemez; deneme `403` döner ve
   güvenlik olayı yazılır.
7. API anahtarı tam değeri **yalnız bir kez** döner; veritabanında yalnız özet bulunur (test ile
   doğrulanır). Kapsam dışı uç `403`; iptal edilmiş anahtar `401`.
8. Aynı `Idempotency-Key` ile iki kez gönderilen yazma isteği **tek kayıt** oluşturur.
9. Oran sınırları (giriş 10/dk, genel herkese açık 60/dk, yedek 2/dk — mevcut; anahtar ve yazma
   uçları yeni) aşılınca `429` + `Retry-After` döner.
10. CORS joker kaynakla **açılamaz**; açık kaynak listesi dışındaki `Origin` yanıt alamaz.
11. Dosya yükleme: uzantısı `.jpg` olan ama içeriği PDF olmayan dosya reddedilir; 10 MB üstü
    reddedilir; karantinadaki dosya tarama "temiz" demeden indirilemez.
12. `=cmd|' /C calc'!A0` gibi bir hücre değeri Excel dışa aktarımında formül olarak çalışmaz.
13. Güvenlik başlıkları (CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS) bütün yanıtlarda bulunur;
    `frame-ancestors 'none'` iframe ile gömülmeyi engeller.
14. `Swagger` üretimde kapalıdır (test). Ayrıntılı hata/stack trace hiçbir ortamda istemciye gitmez.
15. Repoda ve git geçmişinde sır yoktur; periyodik tarama bunu doğrular
    (`docs/plan/34-RISK-GUVENLIK.md:26-27`).
16. Yedek şifreli iner; parolasız açılamaz; geri yükleme yalnız açık ayar + onay metniyle yapılır ve
    iş sonunda ayar kapatılır.
17. TCKN, IBAN ve telefon ekranlarda ve liste uçlarında maskeli gelir; ham değer görüntüleme denetim
    izine yazılır.
18. Her dış servis için tedarikçi envanteri satırı vardır; DPA durumu ve veri bölgesi boş olamaz.
19. Olay müdahale akışı: olay açıldığında süre sayacı çalışır; bildirim kaydı olmadan olay
    kapatılamaz.
20. Yılda en az bir sızma testi yapılır; kritik bulgu 7 gün içinde kapatılır ve kapanış kanıtı
    (test) eklenir.

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `PasswordPolicyTests.cs` — uzunluk, karmaşıklık, sık parola listesi, geçmiş tekrarı.
- `ApiKeyScopeTests.cs` — kapsam hesabı, süre bitişi, ön ek/özet eşleşmesi.
- `IdempotencyTests.cs` — anahtar tekilliği, 24 saat sonra geçersizlik, yanıt tekrarı.
- `MaskingRulesTests.cs` — TCKN, IBAN, telefon, e-posta, plaka maskeleme (`TrackingService.cs:129-134`
  genişletilir).
- `ExportFormulaInjectionTests.cs` — `=`, `+`, `-`, `@` kaçışlama.
- `TotpTests.cs` — mevcut (`server/YesLojistik.Tests/Unit/TotpTests.cs:8-41`) korunur ve genişletilir
  (adım tekrarı, saat kayması, kurtarma kodu tükenişi).

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`, gerçek PostgreSQL —
`server/YesLojistik.Tests/Integration/ApiFactory.cs:17-27`):

- `AuthHardeningTests.cs` — mevcut `AuthTests.cs:13-63` genişletilir: parola politikası, 2FA zorunluluğu,
  kilit eşiği, oturum iptali.
- `SessionManagementTests.cs` — cihaz listesi, tek/toplu kapatma, yeniden kullanım tespiti.
- `PrivilegeEscalationTests.cs` — kendi rolünü yükseltme, son yönetici, kendine anahtar verme.
- `ApiKeyTests.cs` — oluşturma, kapsam, IP kısıtı, oran sınırı, rotasyon, iptal.
- `RateLimitTests.cs` — mevcut politikalar (`Program.cs:86-107`) + yeni sınırlar; `429` ve başlık.
- `CorsTests.cs` — joker reddi, izinli/izinsiz `Origin`, `AllowCredentials` davranışı.
- `FileUploadSecurityTests.cs` — tür yanıltma, boyut, çift uzantı, karantina, imza doğrulama
  (mevcut `AttachmentSniffTests.cs:6-25` genişletilir).
- `InjectionTests.cs` — SQL benzeri girdi, komut benzeri girdi, yol geçişi (`../`), seri durum.
- `SecurityHeadersTests.cs` — CSP, `X-Frame-Options`, `nosniff`, HSTS, `Swagger` kapalı.
- `BackupSecurityTests.cs` — mevcut `BackupTests.cs:24-83` genişletilir: şifreli inme, onaysız geri
  yükleme reddi, ayar kapanışı.
- `DataExportSecurityTests.cs` — mevcut `DataExportTests.cs:16-101` genişletilir: kapatma talebi,
  firma adı doğrulaması, veri silinmemesi.
- `SecurityEventTests.cs` — olay yazımı, önem seviyesi, incelendi işareti.
- `VendorAndIncidentTests.cs` — envanter zorunlu alanları, olay kapanış kuralı, bildirim kaydı.

**Tarayıcı testleri** (`client/e2e/`, Playwright — `client/playwright.config.ts:5-9`):

- `new-ui/security-center.spec.ts` — Güvenlik Merkezi kartları, 2FA durumu.
- `new-ui/sessions.spec.ts` — oturum listesi, tek oturum kapatma, kendi oturumunu kapatma.
- `new-ui/password-policy.spec.ts` — politika formu, ikinci onay, kısa parola reddi.
- `new-ui/api-keys.spec.ts` — anahtar oluşturma (bir kez gösterim), kapsam, iptal.
- `new-ui/security-events.spec.ts` — olay listesi, inceleme notu, süzgeç.
- `new-ui/incident.spec.ts` — olay açma → bildirim kaydı → kapanış (bildirimsiz kapanış reddi).
- Mevcut `client/e2e/security.spec.ts:25-47` ve `:49-119` korunur; 2FA senaryosu genişletilir.

**Kapılar.** Bütün güvenlik testleri CI'da koşar (`37`); bağımlılık zafiyet taraması her koşuda;
dinamik tarama haftalık. Test silinmez, atlanmaz (`docs/plan/31-TEST-CI.md:79-80`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Parola politikası + geçmiş + zorunlu değiştirme | 3 |
| Oturum/cihaz listesi + tek/toplu kapatma + yeni sütunlar | 4 |
| API anahtarı (kapsam, IP, oran, rotasyon) + idempotency | 6 |
| Yetki yükseltme koruması (kendi rolü, son yönetici, onay) | 3 |
| CORS kuralı + başlık hijyeni + Swagger kapalı testi | 2 |
| Girdi/enjeksiyon sertleştirmesi (CSV formül, yol, SSRF, seri durum) | 4 |
| Dosya karantinası + virüs taraması entegrasyonu | 5 |
| Kişisel veri maskeleme (sunucu) + ham görüntüleme logu | 3 |
| Güvenlik Merkezi + Olaylar + Karantina ekranları | 6 |
| Olay müdahale akışı + bildirim kaydı + prova | 4 |
| Tedarikçi envanteri ekranı + DPA alanları | 3 |
| Sızma testi (dış) ve bulgu yönetimi | dış + 3 |
| 10 yeni tablo + migration + indeksler | 3 |
| Testler (birim + entegrasyon + e2e) | 8 |
| **Toplam** | **≈57 kişi-gün + dış sızma testi** |

**Bağımlılıklar.** `35-DENETIM-IZI-KVKK-UYUM.md` (denetim izi ve erişim günlüğü) **önce**; `07` (rol
matrisi ve maker-checker) **önce**; `30` (çok şirketli izolasyon) **önce** — anahtar ve oturum şirket
bazlıdır. `08-E-BELGE-KATMANI.md` entegratör akışını verir; bu doküman onun güvenliğini sertleştirir.
`37-TEST-CI-GENISLETME.md` bu testlerin CI'da koşmasını sağlar; `36` yavaş sorgu günlüğünün kişisel
veri içermemesini garanti eder.

## 12. Riskler ve doğrulanacaklar

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | Çok şirketli yapıda yetki/anahtar şirket ayrımı atlanır | Orta | Çok yüksek | Her tabloya `CompanyId`; izolasyon testleri (`37`); anahtar kapsamı şirkete bağlı |
| R2 | Virüs taraması eklenmez, kötü amaçlı dosya kullanıcıya iner | Orta | Yüksek | Karantina zorunlu; tarama "temiz" demeden indirme yok |
| R3 | Parola politikası yalnız istemcide uygulanır (atlatılabilir) | Orta | Yüksek | Sunucu tarafı zorunlu doğrulama + test |
| R4 | Idempotency eksikliği çift fatura/çift tahsilat üretir | Orta | Yüksek | `Idempotency-Key` sözleşmesi ve testi |
| R5 | İhlal bildirimi gecikir, hukuki yaptırım doğar | Orta | Çok yüksek | Süre/mercii hukuk danışmanıyla netleşir; olay ekranı sayaç tutar; yıllık prova |
| R6 | Sır depoya/loga düşer | Düşük | Yüksek | Kural (`AGENTS.md:23`), maskeleme (`secrets.sh:43`), periyodik tarama, rotasyon planı |
| R7 | Yedek parolası kaybolur, geri yükleme yapılamaz | Düşük | Çok yüksek | Parola iki kişide/iki kasada; her koşuda geri yükleme tatbikatı |
| R8 | API anahtarı sızar (log, ekran görüntüsü, destek talebi) | Orta | Yüksek | Anahtar bir kez gösterilir; özet saklanır; IP kısıtı; rotasyon |
| R9 | Entegratör/webhook imzası doğrulanmaz, sahte belge işlenir | Orta | Yüksek | İmza doğrulaması zorunlu; imzasız istek reddi |
| R10 | Sızma testi bulguları kapatılmaz, rapor rafa kalkar | Orta | Orta | Süreli kapatma kuralı (7/30/90 gün) + Güvenlik Merkezi sayacı |
| R11 | Maskeleme atlanır, kişisel veri dışa aktarmada ham çıkar | Orta | Yüksek | Sunucu tarafı maskeleme; kapatma ikinci onaya bağlı; otomatik tarama |
| R12 | Yeni uç yanlış politikayla eklenir (yetki sızıntısı) | Orta | Yüksek | Varsayılan politika ofis kullanıcılarıdır (`Program.cs:79-84`); yetki matrisi testi kapsanmamış uç bırakmaz |
| R13 | Bakım modu ve sahip modu kötüye kullanılır | Düşük | Yüksek | İkisi de kimlik ister; canlı müşteride sahip modu kapalı ve görünür |
| R14 | `secure scanning` kapalı kalır, sır sızıntısı geç fark edilir | Orta | Orta | Plan uygunsa açılır (`docs/plan/34-RISK-GUVENLIK.md:91`); yerel tarama zorunlu |

**doğrulanacak:** kişisel veri ihlalinde Kurul'a ve ilgili kişilere bildirim **süresi ve mercii** —
kaynak: KVKK ve ilgili yönetmelik maddeleri → hukuk danışmanı; **hukuk danışmanı onayı gerekir**.
**doğrulanacak:** ihlal bildirimi için kullanılacak kanal/form ve zorunlu içerik — kaynak: KVKK Kurumu
rehberi. **doğrulanacak:** virüs/zararlı içerik tarama motoru seçimi, lisansı ve maliyeti — kaynak:
teknik ekip kararı. **doğrulanacak:** barındırma sağlayıcısının (Render) veri şifreleme, yedek
şifreleme ve veri bölgesi taahhütleri — kaynak: sağlayıcı sözleşmesi/dokümanı. **doğrulanacak:**
entegratör ve banka entegrasyonlarında kullanılacak kimlik doğrulama yöntemi (anahtar, OAuth, mTLS) —
kaynak: entegratör API dokümanı (henüz elde yok). **doğrulanacak:** e-posta gönderim sağlayıcısının
(mevcut SMTP ayarı — `.env.example:31-37`) güvenlik özellikleri (SPF/DKIM/DMARC) — kaynak: sağlayıcı.
**doğrulanacak:** depo için GitHub Secret Protection planı var mı, `secret scanning` açılabilir mi —
kaynak: GitHub plan bilgisi. **doğrulanacak:** sızma testi yapacak firma, kapsam, süre ve maliyet —
kaynak: satın alma kararı. **doğrulanacak:** IP konum tahmini kullanılacaksa hangi servis ve KVKK
uygunluğu — kaynak: hukuk danışmanı. **doğrulanacak:** Luca'nın oturum/2FA/anahtar yönetimi ve bulut
şifreleme yaklaşımı — kaynak: Luca teknik ekibi (sitede bilgi yok).

Sonraki belgeyle bağlantı: `35-DENETIM-IZI-KVKK-UYUM.md` denetim izi ve veri sahibi başvurusunu,
`36-PERFORMANS-OLCEK.md` izleme ve uyarıları, `37-TEST-CI-GENISLETME.md` bu dokümandaki testlerin
CI'da koşmasını, `00-DIZIN.md` bütün setin durumunu tanımlar.
