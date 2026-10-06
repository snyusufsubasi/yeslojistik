# 35 — Denetim İzi ve KVKK Uyumu

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır.
"Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır. Mevzuat yorumu yapılmaz: KVKK, saklama
süreleri ve e-belge saklama yükümlülüğü ile ilgili her ifade **hukuk danışmanı onayı gerekir** ya da
`**doğrulanacak:**` etiketiyle yazılır.

## 1. Amaç ve kapsam

Bu modül iki soruyu birlikte çözer: **"Bunu kim yaptı?"** ve **"Bu kişisel veriyi ne zamana kadar
tutabiliriz, ne zaman silmek zorundayız?"** Bugün panelde birinci sorunun cevabı kısmen vardır
(`AuditLog`), ikinci sorunun cevabı ise yalnızca iki otomatik temizleme işine ve taslak hâlindeki hukuk
metinlerine dayanır. Muhasebe çekirdeği, e-belge katmanı ve çok şirketli yapı geldiğinde bu iki cevap
birbirine bağlanmak zorundadır: e-belge saklama yükümlülüğü "sil" der, KVKK ise "ilgili kişi silinmesini
isterse sil" der. Bu modül bu çatışmanın teknik çözümünü tanımlar.

Kapsam içindekiler:

1. **Denetim izi (audit trail).** Kim, ne zaman, hangi kaydı, hangi alanı, hangi eski değerden hangi yeni
   değere getirdi; kişi, IP ve istemci bilgisiyle birlikte.
2. **Değiştirilemez (append-only) kayıt yaklaşımı.** Kayıt sonradan düzeltilemez, silinemez; bütünlük
   özeti (hash) ile ispatlanabilir.
3. **Silme yerine iptal/pasifleştirme.** İş kaydı fiziksel olarak silinmez; iptal, pasife alma veya
   arşiv durumuna geçer.
4. **Veri saklama ve imha politikası.** Veri türü başına saklama süresi, süre dolunca ne olacağı, kim
   onaylar, kaydı nerede tutulur.
5. **Kişisel veri envanteri.** Çalışan, şoför, müşteri yetkilisi ve konum verisi için alan alan envanter.
6. **Aydınlatma ve açık rıza akışları.** Metin sürümü, rıza zamanı, rızanın geri alınması.
7. **Veri sahibi başvurusu.** Erişim, düzeltme, silme, anonimleştirme ve itiraz taleplerinin kaydı,
   yanıt süresi ve sonucu.
8. **Yurt dışı aktarım riski.** Barındırma sağlayıcısının sunucu konumu ve yedeklerin nerede durduğu.
9. **Erişim günlükleri ve log saklama.** Oturum, giriş denemesi, dışa aktarma ve yönetici işlemleri.
10. **Denetim raporu çıktıları.** Mali müşavir, denetçi ve iç kontrol için dışa aktarılabilir raporlar.

Kapsam dışı: yetki matrisinin ve onay akışlarının kendisi (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md`),
muhasebe fişi kuralları (`06-MUHASEBE-MOTORU.md`), e-belgenin üretimi ve gönderimi (`08-E-BELGE-KATMANI.md`),
çok şirketli izolasyonun kurulumu (`30`), güvenlik olayları ve sızma testi (`38-GUVENLIK.md`). Bu doküman
o modüllere **altyapı ve kural** verir.

Bu modülün çözdüğü üç somut sorun: (1) "Bu sevkiyatın fiyatı 12.000'den 9.500'e ne zaman ve kim
tarafından düşürüldü?" (2) "Ayrılan şoförün konum ve iletişim bilgisi ne zaman silinecek?" (3) "Mali
müşavir 'bu faturaların hepsinin değişiklik geçmişini ver' dediğinde tek tuşla ne üretiyoruz?"

## 2. Luca'daki karşılığı

Luca Koza ürün sayfasından okunabilen iki madde bu modülün doğrudan karşılığıdır: **"tüm işlemlerin tek
ekrandan muhasebeleştirilmesi"** ve **"belge üzerinden muhasebe fişi iptali"**
(`docs/plan-erp/02-LUCA-ENVANTERI.md:46-47`). İkinci madde önemlidir: Luca'da iptal, belgeyi yok etmez;
belge ile fiş arasındaki bağ korunur ve iptal izlenebilir bir olay olur. Bizim "silme yerine iptal"
kuralımız aynı mantığa oturur.

Diğer ilgili maddeler: **ayrıntılı yetkilendirme ile iş planı yapabilme**
(`02-LUCA-ENVANTERI.md:51`) — denetim izinin "kim" alanının rol ile birlikte tutulması; **e-Defter
uygulaması ve e-Dönüşüm saklama hizmetleri** (`02-LUCA-ENVANTERI.md:42`, `:75-77`) — e-belge saklama
yükümlülüğünün karşılığı; **çoklu dil ve işletmeye özel tanımlamalar** (`:51-52`, `:62`) — saklama
politikasının şirket bazında tanımlanabilmesi.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'da işlem geçmişi (log) ekranının alanları, saklama süresi ve dışa aktarma biçimi —
kaynak: Luca kullanım kılavuzu veya demo hesabı. **doğrulanacak:** Luca'da "belge iptali" ile "belge
silme" arasındaki fark ve muhasebe fişine etkisi — kaynak: Luca kılavuzu + mali müşavir.
**doğrulanacak:** Luca'nın e-Dönüşüm saklama hizmetinin kapsamı, süresi ve ücreti — kaynak: Luca
satış/teknik ekibi. **doğrulanacak:** e-Arşiv ve e-Defter saklama sürelerinin dayanağı (vergi mevzuatı
maddeleri) — kaynak: mali müşavir; bu dokümanda **hukuk danışmanı onayı gerekir**.

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Denetim kaydı tablosu.** `server/YesLojistik.Core/Entities/AuditLog.cs:6-17`: `Id` (long), `At`,
  `UserId`, `UserName`, `Action` (`Created`/`Updated`/`Deleted`, `AuditLog.cs:10-11`), `EntityType`,
  `EntityId`, `Label` (okunur ad: plaka, fatura no, müşteri ünvanı; `:15`) ve `Changes` (`:17`).
  `Changes` alanının amacı sınıf yorumunda örneklenir: "Durum: Planned → Loaded; Satış: 10000 → 12000".
- **Otomatik üretim.** Denetim kaydı elle yazılmaz; `SaveChanges` sırasında
  `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:484-492` (`SaveWithAuditAsync`) değişiklikleri
  toplar, kaydeder, sonra `AuditLogs.AddRange` ile yazar (`:489`). Böylece "kaydet ama loglamayı unut"
  hatası olamaz.
- **Eski → yeni değer.** `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:60-72` değişen her alanı
  `Eski → Yeni` biçiminde yazar. Alan adları Türkçeleştirilir (`AuditTrail.cs:23-52`, ör. `SalePrice` →
  "Satış fiyatı"). Yabancı anahtarlar `#12` biçiminde gösterilir (`:142-144`). Kayıt uzunluğu 2000
  karakterle sınırlıdır (`:71`, `AppDbContext.cs:76`).
- **Gizli/hızlı değişen alanlar hariç.** `AuditTrail.cs:12-21` listesi şifre özetini, TOTP sırrını,
  kurtarma kodu özetlerini, plaka konumunu, takip jetonunu, dosya yollarını ve logo verisini kayda
  **sokmaz**. Bu, "denetim izi kişisel veriyi çoğaltmasın" ilkesinin bugünkü kısmi uygulamasıdır.
- **Silme yumuşaktır (soft delete).** `AppDbContext.cs:53-58` bütün `BaseEntity` türevlerine
  `IsDeleted = false` süzgeci koyar; `AppDbContext.cs:471-475` fiziksel silmeyi `IsDeleted = true`
  güncellemesine çevirir. `AuditTrail.cs:63-65` bunu `Deleted` olarak kaydeder. Yani bugün zaten
  "veritabanından silme" yoktur; kayıt gizlenir.
- **Bugünkü denetim ekranı.** `server/YesLojistik.Api/Controllers/AuditController.cs:14` ucu yalnızca
  yöneticiye açar; `:18-30` süzgeç (kayıt türü, kayıt no, serbest arama) ve sayfalama yapar. Panelde
  `client/src/components/AuditLog.tsx:29` listeyi, `:38-48` sütunları (zaman, kişi, işlem, kayıt,
  değişiklik) çizer; `:12-26` işlem etiketlerini Türkçe gösterir (ör. `AccountLocked` → "Hesap
  kilitlendi"). `client/src/pages/SettingsPage.tsx:26` sekmeleri tanımlar, `:52` denetim sekmesini
  yalnızca `admin` yetkisiyle gösterir. Sevkiyat penceresinde kayıt bazlı geçmiş sekmesi vardır
  (`client/src/pages/HelpPage.tsx:198`).
- **Kayıt türleri bugün sınırlı.** `client/src/components/AuditLog.tsx:8-11` yalnızca 10 kayıt türünü
  etiketler (Sevkiyat, Fatura, Tahsilat, Müşteri, Araç, Şoför, Gider, Kullanıcı, Sevkiyat dosyası,
  Ayarlar). Yeni ERP modülleri (stok, yevmiye, çek, personel) bu listede **yoktur**.
- **Elle yazılan olaylar.** Bazı olaylar denetim tablosuna doğrudan eklenir: hesap kilidi
  (`server/YesLojistik.Api/Controllers/AuthController.cs:42`), demo verisi sıfırlama
  (`server/YesLojistik.Infrastructure/Services/DataResetService.cs:61`), lisans anahtarı
  (`.../LicenseService.cs:74`), ayna çalışması (`.../LegacyMirrorService.cs:141`). Bunların `Changes`
  alanı serbest metindir.
- **Konum saklama ve maskeleme.** `server/YesLojistik.Infrastructure/Services/TrackingService.cs:123-127`
  saklama süresini aşan konum kayıtlarını siler; süre `Tracking:RetentionDays` (varsayılan 90) ile
  ayarlanır (`server/YesLojistik.Api/Infrastructure/LocationRetentionService.cs:11`). Genel takip
  sayfasında plaka maskelenir (`TrackingService.cs:129-134`), konum yalnızca araç o sefer için yoldayken
  paylaşılır (`:116-120`), bağlantı teslimden 7 gün sonra kapanır (`:14`, `:109`).
- **Konum açık rızası.** `server/YesLojistik.Core/Entities/User.cs:14-16` rıza zamanını ve **metin
  sürümünü** tutar; `server/YesLojistik.Api/Controllers/DriverController.cs:39-44` rıza verilince
  doldurur, geri alınınca temizler. Yani sürümlü rıza altyapısı bugün vardır — ama yalnızca konum için.
- **Aydınlatma metni yayında.** `client/src/pages/PrivacyPage.tsx:63-83` KVKK aydınlatma metnini,
  veri kategorilerini (`:67-74`), hukuki sebebi (`:75-76`), aktarımı (`:78`), saklama sürelerini (`:80`)
  ve m.11 haklarını (`:81-82`) gösterir. `:89-103` hesap/veri silme talebi akışını tanımlar.
  `client/src/pages/PrivacyPage.tsx:56` metnin **şablon** olduğunu ve hukuki danışman incelemesi
  gerektiğini açıkça yazar.
- **Veri indirme (erişim hakkı).** `server/YesLojistik.Api/Infrastructure/DataExportService.cs:18-32`
  bütün veriyi ZIP olarak üretir; uç noktası ve ekranı çalışır durumdadır
  (`client/e2e/security.spec.ts:25-47` bunu uçtan uca sınar).
- **Hukuk metinleri taslaktır.** `docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:1` dosyanın başında
  "TASLAK: avukat onayı olmadan kullanmayın" yazar. Aynı dosya `:19-41` veri türü başına **öneri**
  süreler verir (konum 90 gün `:36`, işlem geçmişi 2 yıl `:37`, şoför TCKN `:38`) ve sürelerin teyide
  bağlı olduğunu `:7` ile belirtir. KVKK aydınlatma, veri işleme sözleşmesi ve çerez politikası da
  `docs/hukuk/` altında taslaktır (`docs/plan/34-RISK-GUVENLIK.md:42`).

**Eksikler (kanıtlı).**

1. **Denetim izi bugün silinebilir.** `server/YesLojistik.Api/Infrastructure/LocationRetentionService.cs:20-22`
   iki yıldan eski bütün `AuditLog` satırlarını `ExecuteDeleteAsync` ile **fiziksel olarak siler**. Yani
   bugünkü yapı "append-only" değildir; üstelik silme, denetim izinin kendisini sildiği için
   denetlenemez.
2. **Kimlik ve bağlam eksik.** `AuditLog` içinde `CompanyId`, IP, istemci (user-agent), oturum no ve
   istek kimliği alanı yoktur (`AuditLog.cs:6-17`); çok şirketli yapıda kayıt karışır.
3. **Okuma erişimi loglanmaz.** Görüntüleme, dışa aktarma, PDF ve Excel indirme olayları denetim iznine
   girmez; yalnızca veri indirme ZIP'i ayrı bir olay olarak elle yazılır.
4. **Kişisel veri envanteri yoktur.** Hangi alanın kişisel veri olduğu kodda işaretli değildir; bu
   bilgi yalnızca aydınlatma metni metninde yaşar (`PrivacyPage.tsx:67-74`).
5. **Veri sahibi başvurusu kaydı yoktur.** `docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:55-57` süreci
   tarif eder, ama panelde talep açacak, durumunu izleyecek ve sonucunu saklayacak bir tablo/ekran yoktur.
6. **Rıza yalnızca konum içindir.** Aydınlatma onayı, ticari elektronik ileti izni ve metin sürümü
   geçmişi tutulmaz.
7. **Saklama politikası kodda değil ayardadır.** Bugün yalnızca `Tracking:RetentionDays`
   (`LocationRetentionService.cs:11`) ve sabit 2 yıl (`:20`) vardır; veri türü başına politika tablosu yoktur.
8. **İmha kaydı yoktur.** Silinen kayıt sayısı loga yazılır (`LocationRetentionService.cs:19`) ama
   "ne, ne zaman, hangi yöntem, kim onayladı" biçiminde kalıcı bir imha kaydı üretilmez; politika bunu
   ister (`docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:53`).
9. **Denetim raporu yoktur.** Yalnızca ekran listesi vardır; tarih aralığı + kayıt türü + kullanıcı
   kırılımında imzalı/özetli rapor üretilmez.

## 4. Hedef ekranlar ve alanlar

**4.1. Denetim İzi ekranı (genişletme).** Mevcut `AuditLogTable` korunur, üstüne gelir.

| Alan | Tip | Not |
|---|---|---|
| Zaman | tarih-saat | Varsayılan sıralama (yeniden eskiye) |
| Kişi | metin | Kullanıcı adı; "sistem" olabilir |
| Rol | seçim | İşlemin yapıldığı andaki rol (dondurulur) |
| İşlem | seçim | Oluşturdu / Değiştirdi / İptal etti / Görüntüledi / Dışa aktardı |
| Kayıt türü | seçim | Modül listesinden (stok, yevmiye, çek dâhil) |
| Kayıt | metin | Okunur ad + kayıt no |
| Değişiklik | uzun metin | Eski → yeni, alan alan |
| Şirket | seçim | Çok şirketli yapıda zorunlu süzgeç |
| Kaynak | metin | IP (maskeli) + istemci |
| Bütünlük | rozet | "Doğrulandı" / "Zincir kırık" |

**4.2. Kayıt detayı geçmiş sekmesi (genişletme).** Her kaydın penceresinde zaman çizelgesi: işlem,
kişi, eski → yeni, ilişkili belge bağlantısı, iptal gerekçesi.

**4.3. Silme yerine iptal penceresi (yeni).** Kayıt silinmek istendiğinde açılır: iptal türü
(İptal / Pasife al / Arşivle / Yanlış kayıt), gerekçe (zorunlu, en az 10 karakter), ilişkili belgelerin
durumu, onay isteyip istemediği, "bu kayıt denetim izinde kalır" bilgisi.

**4.4. Saklama ve İmha Politikası ekranı (yeni).** Veri türü listesi ve her satırda: veri türü, kapsam
(şirket/kişi), saklama süresi (gün/yıl), dayanak (metin), süre dolunca yapılacak (sil / anonimleştir /
kısıtla), hukuki blok (var/yok), son imha tarihi, onaylayan. Süre değişikliği onay akışına bağlıdır.

**4.5. Kişisel Veri Envanteri ekranı (yeni).** Satır alanları: veri kategorisi (kimlik, iletişim,
konum, belge, finans), ilgili kişi grubu (çalışan, şoför, müşteri yetkilisi, teslim alan kişi), tablo ve
alan adı, amaç, hukuki sebep, saklama süresi, alıcı grupları, yurt dışı aktarım (var/yok), maskeleme
kuralı. Envanter ile `PrivacyPage.tsx:67-74` metni **aynı kaynaktan** beslenir.

**4.6. Veri Sahibi Başvurusu ekranı (yeni).** Talep listesi + form: başvuru no, tarih, kanal (e-posta,
form, telefon), ilgili kişi (maskeli), talep türü (erişim, düzeltme, silme, anonimleştirme, itiraz,
bilgi), durum (alındı, inceleniyor, kısmen, tamamlandı, reddedildi), son yanıt tarihi, yapılan işlem,
reddedildiyse dayanak. Yanıt süresi sayacı görünür.

**4.7. Aydınlatma ve Rıza ekranı (yeni).** Metin sürümleri (sürüm no, yürürlük tarihi, dosya bağlantısı,
onaylayan), kullanıcı/şoför bazında rıza durumu (verildi/geri alındı, zaman, sürüm), ticari elektronik
ileti izni (izin/ret, kanal, zaman).

**4.8. Erişim Günlüğü ekranı (genişletme).** Giriş/çıkış, başarısız giriş, kilit, şifre değişimi,
2FA olayları, oturum açan cihaz, veri indirme ve toplu dışa aktarma. Denetim izinden ayrı süzgeçler
(IP, sonuç, kullanıcı).

**4.9. Denetim Raporu ekranı (yeni).** Tarih aralığı, kayıt türü, kullanıcı, şirket süzgeçleri; çıktı
biçimleri: ekran, Excel, PDF; özet blokları (işlem sayısı, kullanıcı kırılımı, iptal sayısı, silme
denemesi, bütünlük doğrulaması sonucu).

## 5. İş kuralları

1. **Append-only.** Denetim kaydı yalnızca **eklenir**. Güncelleme ve silme uçları yoktur; veritabanı
   düzeyinde de engellenir (uygulama kullanıcısına yalnız `INSERT`/`SELECT` yetkisi verilen ayrı bir
   rol düşünülür — **doğrulanacak:** barındırma sağlayıcısında ayrı veritabanı rolü tanımlanabiliyor mu).
   Bu kural bugünkü `LocationRetentionService.cs:20-22` davranışını **değiştirir**.
2. **Bütünlük zinciri.** Her yeni satır bir öncekinin özetini (hash) taşır: `Hash = SHA256(PrevHash +
   Id + At + Action + EntityType + EntityId + Changes)`. Günlük olarak zincirin son özeti ayrı bir
   mühür (seal) tablosuna yazılır; mühür kaydı mali müşavir/denetçiye e-posta ile bildirilebilir.
   Doğrulama işi zinciri baştan hesaplar ve "zincir kırık" rozetini üretir.
3. **Eski → yeni zorunlu.** `Updated` işleminde en az bir alan değişikliği yoksa kayıt yazılmaz
   (bugünkü davranış: `AuditTrail.cs:71` boşsa `null` döner). Tutar, tarih, durum, miktar alanları
   kayda **her zaman** girer.
4. **Kişisel veri maskeleme.** Denetim kaydı kişisel veriyi çoğaltmaz: TCKN son 4 hane, telefon son
   4 hane, IBAN son 4 hane, e-posta kullanıcı adının ilk 2 harfi gösterilir; konum koordinatı kayda
   yazılmaz. Bugünkü "hariç tut" listesi (`AuditTrail.cs:12-21`) genişletilir; kural envanterden
   (`§4.5`) okunur.
5. **Silme yerine iptal.** İş kaydı için fiziksel silme ucu **kaldırılır**; `DELETE` çağrıları
   `Deleted` yerine `Cancelled` durumuna ve gerekçe alanına dönüşür. Fatura tarafında bu kural bugün
   zaten vardır: `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:204-211` faturayı
   `Cancelled` yapar, kaydı silmez; uç `server/YesLojistik.Api/Controllers/InvoicesController.cs:82-83`
   "cancel" adını taşır. Aynı desen stok, çek, personel ve yevmiye fişine uygulanır.
6. **Saklama süresi tür bazındadır.** Öneri tablo (hukuk danışmanı onayı gerekir; mevcut taslak:
   `docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:19-41`):

   | Veri türü | Öneri süre | Süre dolunca |
   |---|---|---|
   | Konum kaydı | 90 gün (ayarlanabilir) | Sil |
   | Erişim/oturum günlüğü | 180 gün – 2 yıl | Sil |
   | Denetim izi (iş kaydı değişikliği) | 10 yıl | Arşive taşı, sil |
   | Fatura, fiş, e-belge | 10 yıl (dayanak doğrulanacak) | Arşiv; hukuki blok kalkmadan silinmez |
   | Şoför belge ve TCKN | Çalışma ilişkisi + yasal süre | Sil veya anonimleştir |
   | Yedekler | 20–35 gün döngü | Şifreli dosya silinir |

7. **E-belge saklama ile KVKK silme çatışması.** Çözüm sırası: (a) **Hukuki blok (legal hold)** —
   yasal saklama süresi dolmamış kayıt "silinemez" olarak işaretlenir; (b) **Kısıtlama** — kayıt
   silinmez, yalnızca belirli amaçla erişilebilir hâle getirilir; (c) **Anonimleştirme** — kimlik
   alanları geri döndürülemez biçimde ayrılır, mali tutar ve belge kimliği kalır; (d) **Silme** —
   yalnızca hukuki blok yoksa. Bugünkü `PrivacyPage.tsx:98` metni bu sırayı "kimliğinizden ayrılmış
   olarak saklanır" diye zaten anlatır. Süre ve dayanak **hukuk danışmanı onayı gerektirir**.
8. **İmha kaydı.** Her otomatik veya elle imha için kayıt: veri türü, kayıt sayısı, tarih aralığı,
   yöntem (sil/anonimleştir), yürüten (sistem/kullanıcı), onaylayan, politika sürümü. İmza kaydı
   değiştirilemez; denetim raporunda görünür.
9. **Veri sahibi başvurusu süresi.** Başvuru alındığında sayaç başlar; `PrivacyPage.tsx:82` ve
   `docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:57` "en geç 30 gün" der. Bu süre ve varsa kısaltma
   **doğrulanacak:** mevzuat maddesi — kaynak: hukuk danışmanı. Sistem süre dolmadan uyarı üretir.
10. **Yurt dışı aktarım riski.** Barındırma ve yedek konumu envanterde alan olarak tutulur. Bugün panel
    Render üzerinde çalışır (`AGENTS.md:10`) ve aydınlatma metni "Veriler barındırma hizmeti
    sağlayıcısının sunucularında saklanır" der (`PrivacyPage.tsx:78`). Sunucu bölgesi, yedek bölgesi ve
    alt işleyen listesi **doğrulanacak:** sağlayıcı sözleşmesi/panel — kaynak: teknik ekip; aktarımın
    hukuki dayanağı **hukuk danışmanı onayı gerektirir**.
11. **Log saklama.** Uygulama logu (Serilog konsol çıktısı, `server/YesLojistik.Api/Program.cs:25`)
    kişisel veri içermez; sevkiyat adresi veya tutar loga yazılmaz. Log saklama süresi politikaya bağlanır.
12. **Ayna kayıtları.** pratikortam'dan gelen kayıtlar da denetim iznine girer; ancak kaynak "ayna"
    olarak işaretlenir ve değişiklik panelde yapılamaz
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-28`).

## 6. Veri modeli

**Ekleme (mevcut tabloya sütun).** `AuditLog` tablosuna yalnızca **boş olabilen** sütunlar eklenir
(migration kuralı: `AGENTS.md:29`):

| Sütun | Tip | Amaç |
|---|---|---|
| `CompanyId` | int, null | Çok şirketli ayrım |
| `ActorType` | metin(20), null | User / System / Worker / ApiKey |
| `ActorRole` | metin(30), null | İşlem anındaki rol |
| `CorrelationId` | metin(64), null | Aynı istekteki kayıtları bağlar |
| `IpHash` | metin(64), null | IP'nin özeti (ham IP tutulmaz) |
| `ClientHash` | metin(64), null | İstemci parmak izi özeti |
| `Source` | metin(20), null | Web / Mobil / Ayna / İş / API |
| `RequestPath` | metin(200), null | Hangi uç |
| `Result` | metin(20), null | Success / Denied / Error |
| `PrevHash` | metin(64), null | Zincir |
| `Hash` | metin(64), null | Bütünlük özeti |
| `LegalHold` | bool, null | Silinemez işareti |

**Yeni tablolar** (hepsi `CompanyId` taşır; `docs/plan-erp/05-VERI-MODELI.md:39-40`):

1. `AuditSeal` — `Id`, `CompanyId`, `SealedAt`, `LastAuditId`, `Hash`, `Signature`, `Note`.
2. `RetentionPolicy` — `Id`, `CompanyId`, `DataType`, `Scope`, `Days`, `LegalBasis`, `Action`
   (Delete/Anonymize/Restrict), `ApprovedBy`, `ApprovedAt`, `Version`, `IsActive`.
3. `PersonalDataField` (envanter) — `Id`, `CompanyId`, `Category`, `SubjectGroup`, `TableName`,
   `ColumnName`, `Purpose`, `LegalBasis`, `RetentionPolicyId`, `Recipients`, `CrossBorder`, `MaskRule`.
4. `DataSubjectRequest` — `Id`, `CompanyId`, `RequestNo`, `Channel`, `SubjectRef` (maskeli), `Kind`,
   `ReceivedAt`, `DueAt`, `Status`, `DecidedAt`, `DecidedBy`, `ActionTaken`, `RejectReason`, `Notes`.
5. `ConsentRecord` — `Id`, `CompanyId`, `UserId`, `Kind` (Location/Marketing/Notice), `Version`,
   `GrantedAt`, `RevokedAt`, `Channel`, `TextHash`.
6. `NoticeVersion` — `Id`, `CompanyId`, `Kind`, `Version`, `EffectiveFrom`, `BodyHash`, `ApprovedBy`.
7. `AccessLog` — `Id`, `CompanyId`, `UserId`, `At`, `Event` (Login/Logout/LoginFailed/Lockout/
   PasswordChanged/TwoFactor/DataExport/Impersonate), `Result`, `IpHash`, `ClientHash`, `Detail`.
8. `ErasureLog` — `Id`, `CompanyId`, `RetentionPolicyId`, `DataType`, `RecordCount`, `From`, `To`,
   `Method`, `ExecutedBy`, `ApprovedBy`, `At`.
9. `LegalHold` — `Id`, `CompanyId`, `EntityType`, `EntityId`, `Reason`, `CaseRef`, `StartsAt`, `EndsAt`,
   `PlacedBy`.

**İlişkiler.** `RetentionPolicy` ← `PersonalDataField` (çok-bir); `RetentionPolicy` ← `ErasureLog`;
`DataSubjectRequest` → `ErasureLog` (talep sonucu); `ConsentRecord` → `NoticeVersion` (sürümle).
`AuditLog` → `AuditSeal` (son mühür). Mevcut tablolar **değiştirilmez, dönüştürülmez**
(`docs/plan-erp/05-VERI-MODELI.md:32`).

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET | `/api/audit` | Denetim izi listesi (genişletilmiş süzgeç) | Admin |
| GET | `/api/audit/{id}` | Tek kaydın tüm alanları | Admin |
| GET | `/api/audit/entity/{type}/{id}` | Bir kaydın geçmişi | Admin |
| GET | `/api/audit/verify` | Zincir doğrulaması (aralık) | Admin |
| POST | `/api/audit/seal` | Mühür al (günlük iş de çağırır) | Admin |
| GET | `/api/audit/export` | Excel/PDF denetim raporu | Admin |
| GET | `/api/retention-policies` | Politika listesi | Admin |
| POST/PUT | `/api/retention-policies` | Politika ekle/düzenle (onay akışıyla) | Admin + onay |
| GET | `/api/personal-data` | Kişisel veri envanteri | Admin |
| POST/PUT | `/api/personal-data` | Envanter satırı | Admin |
| GET | `/api/data-requests` | Başvuru listesi | Admin |
| POST | `/api/data-requests` | Başvuru aç | Admin, Muhasebe |
| POST | `/api/data-requests/{id}/decide` | Karar + işlem | Admin |
| GET | `/api/consents` | Rıza listesi | Admin |
| POST | `/api/driver/consent` | Konum rızası (mevcut, genişletilir) | Şoför |
| POST | `/api/consents/marketing` | Ticari ileti izni | Admin |
| GET | `/api/access-log` | Erişim günlüğü | Admin |
| GET | `/api/erasure-log` | İmha kayıtları | Admin |
| POST | `/api/legal-holds` | Hukuki blok koy/kaldır | Admin + onay |
| POST | `/api/{entity}/{id}/cancel` | Silme yerine iptal | Modül yetkisi |

İstek/yanıt alanları ilgili ekran tanımıyla (§4) birebir aynıdır; `PagedResult<T>` ve sayfalama
sözleşmesi mevcut `QueryExtensions.PageAsync` deseniyle korunur
(`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:23-31`).

## 8. Yetki, onay ve denetim izi

| İş | Yönetici | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Denetim izi görme | ✔ | — | — | — |
| Erişim günlüğü görme | ✔ | — | — | — |
| Saklama politikası düzenleme | ✔ (onay) | öneri | — | — |
| Kişisel veri envanteri | ✔ | görme | görme | — |
| Başvuru açma | ✔ | ✔ | — | — |
| Başvuru kararı | ✔ | — | — | — |
| Hukuki blok koyma | ✔ (ikinci onay) | — | — | — |
| Kayıt iptali | ✔ | modül yetkisi | modül yetkisi | — |
| Kendi konum rızası | — | — | — | ✔ |

- **maker-checker.** Saklama süresi kısaltma, imha çalıştırma kaldırma, hukuki blok kaldırma ve başvuru
  reddi "hazırlayan ≠ onaylayan" kuralına bağlıdır (altyapı: `07`).
- **Denetim izinin denetimi.** Bu modülün kendi işlemleri de kayda girer: politika değişikliği,
  envanter değişikliği, başvuru kararı, imha çalıştırma, mühür alma.
- **Reddedilen istekler de kayıt olur.** Yetkisiz bir `POST /api/audit/seal` denemesi `Result = Denied`
  olarak yazılır.
- **İzleyici erişimi.** Mali müşavir için salt okuma + dışa aktarma yetkili ayrı bir kullanıcı önerilir;
  bu, `28-MUHASEBECI-PAKETI.md` ile birlikte tasarlanır.

## 9. Kabul kriterleri

1. Denetim izi tablosunda **güncelleme ve silme ucu yoktur**; `POST /api/audit/{id}` gibi bir uç 404 döner.
2. İki yıllık otomatik `AuditLog` silme kaldırılmıştır; yerine politika tabanlı arşivleme vardır.
   (Bugünkü kanıt: `server/YesLojistik.Api/Infrastructure/LocationRetentionService.cs:20-22`.)
3. `GET /api/audit/verify` mevcut veride "zincir sağlam" döner; tek bir satır elle bozulduğunda
   "zincir kırık" ve kırılan kayıt no'sunu döner (test kanıtı).
4. Her `Updated` denetim kaydında en az bir `Eski → Yeni` çifti vardır; tutar alanı değişimi
   kayıpsızdır (kuruş düzeyinde).
5. Kişisel veri maskeleme: TCKN, telefon, IBAN ve e-posta denetim kaydında ham hâlde **görünmez**
   (otomatik test).
6. Fatura, stok, çek, personel ve yevmiye fişi için fiziksel silme ucu yoktur; iptal gerekçesi zorunludur.
7. Saklama politikası ekranından süre değiştirildiğinde onay kaydı ve `Version` artışı oluşur.
8. Yetkili hukuki blok varken ilgili kayıt hiçbir uçtan silinemez; deneme `Result = Denied` olarak
   loglanır.
9. Veri sahibi başvurusu açıldığında son yanıt tarihi hesaplanır ve süre dolmadan uyarı üretilir.
10. Denetim raporu Excel ve PDF çıktısı verir; çıktı, ekrandaki süzgeçle aynı sayıyı üretir.
11. Aydınlatma metni, envanterle aynı kaynaktan beslenir: envantere satır eklendiğinde metin sürümü
    artırılmadan yayınlanamaz.
12. `docs/hukuk/` metinleri "TASLAK" ibaresini kaybetmez; ürün içi metin "hukuk danışmanı onayı
    gerekir" uyarısını taşır.

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `AuditHashChainTests.cs` — zincir hesabı, mühürleme, bozulma tespiti, eşzamanlı yazma.
- `AuditMaskingTests.cs` — TCKN/telefon/IBAN/e-posta maskeleme; hariç tutulan alanlar
  (`AuditTrail.cs:12-21` genişlemesi).
- `RetentionPolicyTests.cs` — süre hesabı, artık yıl, hukuki blok önceliği, "sil / anonimleştir /
  kısıtla" seçimi.
- `DataSubjectRequestTests.cs` — son yanıt tarihi, durum geçişleri, ret gerekçesi zorunluluğu.

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`, gerçek PostgreSQL —
`server/YesLojistik.Tests/Integration/ApiFactory.cs:17-27`):

- `AuditImmutabilityTests.cs` — güncelleme/silme ucu yok; doğrudan SQL silme denemesi engellenir.
- `AuditAccessTests.cs` — yönetici olmayan kullanıcı 403; şoför 403.
- `RetentionJobTests.cs` — süresi dolan konum kaydı silinir, denetim kaydı **silinmez**, imha kaydı yazılır.
- `LegalHoldTests.cs` — bloklu kayıt silinemez; blok kaldırılınca silinebilir.
- `ConsentTests.cs` — konum rızası ver/geri al (mevcut test genişletilir:
  `server/YesLojistik.Tests/Integration/DriverAppTests.cs:323-332`), metin sürümü kaydı.
- `AuditReportTests.cs` — Excel/PDF çıktısı ve toplamların ekranla eşitliği.
- `MultiCompanyAuditTests.cs` — A şirketinin kullanıcısı B şirketinin izini göremez (bkz. `30`).

**Tarayıcı testleri** (`client/e2e/`, Playwright — `client/playwright.config.ts:5-9`):

- `new-ui/audit.spec.ts` — İşlem Geçmişi sekmesi yalnızca yöneticide; süzgeç + sayfalama; değişiklik
  metni görünür (`client/src/pages/SettingsPage.tsx:52` genişletilir).
- `new-ui/retention.spec.ts` — Saklama ve İmha Politikası ekranı; süre değiştirince onay isteği.
- `new-ui/data-request.spec.ts` — başvuru açma → karar → sonuç; süre sayacı.
- `new-ui/cancel-instead-of-delete.spec.ts` — silme yerine iptal penceresi; gerekçesiz kaydetme reddi.
- Mevcut `client/e2e/security.spec.ts:25-47` (veri indirme + kapatma talebi) korunur ve genişletilir.

**Kural.** Test silinmez, atlanmaz (`docs/plan/31-TEST-CI.md:79-80`). Kırılan test gerekçesiyle
güncellenir. Yerelde .NET 10 SDK ve PostgreSQL olmadığı için sunucu ve e2e testleri **yalnız CI'da
koşar** (`docs/plan/31-TEST-CI.md:43-45`); bu ayrıntı `37-TEST-CI-GENISLETME.md` içinde iş kalemi olur.

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Şema: `AuditLog` sütunları + 9 yeni tablo + migration | 3 |
| Zincir/mühür altyapısı + doğrulama işi | 3 |
| Eski 2 yıl silme kuralının kaldırılması + arşivleme işi | 2 |
| Maskeleme kuralları + envanter bağlantısı | 2 |
| Saklama politikası ekranı + onay akışı | 3 |
| Kişisel veri envanteri ekranı | 2 |
| Veri sahibi başvurusu ekranı + iş akışı | 3 |
| Aydınlatma/rıza ekranı + metin sürümleme | 2 |
| Erişim günlüğü + erişim kayıtlarının yazılması | 2 |
| Denetim raporu (Excel/PDF) | 2 |
| İmha kaydı + hukuki blok | 2 |
| Testler (birim + entegrasyon + e2e) | 5 |
| Hukuk metinlerinin gözden geçirilmesi (danışman) | dış |
| **Toplam** | **≈31 kişi-gün + dış onay** |

**Bağımlılıklar.** `07-YETKI-ONAY-NUMARALANDIRMA.md` (rol matrisi ve maker-checker) **önce** bitmelidir;
`05-VERI-MODELI.md` (tablo adları ve `CompanyId` kuralı) **önce**; `04-HEDEF-MIMARI.md` (olay/iş
altyapısı) **önce**. `30-COK-SIRKETLI-KONSOLIDASYON.md` ile eşzamanlı yürür. `36-PERFORMANS-OLCEK.md`
denetim tablosunun büyümesini (indeks, arşiv, bölümleme) üstlenir. `38-GUVENLIK.md` erişim günlüğünün
güvenlik tarafını alır.

## 12. Riskler ve doğrulanacaklar

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | Append-only geçişte mevcut 2 yıl silme kuralı kalırsa veri kaybı sürer | Yüksek | Yüksek | Kural kaldırılır, testle kilitlenir (`LocationRetentionService.cs:20-22`) |
| R2 | Denetim tablosu hızla büyür, sorgu yavaşlar | Yüksek | Orta | İndeks (`AppDbContext.cs:77-78` genişletilir), arşiv tablosu, rapor ön-hesabı |
| R3 | Maskeleme eksik kalır, denetim kaydı kişisel veriyi çoğaltır | Orta | Yüksek | Envanterden üretilen maskeleme testi; otomatik tarama |
| R4 | Saklama süreleri hukuken yanlış olur | Orta | Yüksek | Süreler ayarlanabilir; ürün "hukuk danışmanı onayı gerekir" der; taslak onaylanmadan yayına girmez |
| R5 | E-belge saklama ile KVKK silme çatışması yanlış çözülür | Orta | Yüksek | Hukuki blok + kısıtlama + anonimleştirme sırası kodda zorunlu |
| R6 | Yurt dışı aktarım (barındırma bölgesi) belirsiz kalır | Yüksek | Orta | Envanterde alan; sağlayıcı sözleşmesi doğrulanır; önlem hukuk danışmanıyla |
| R7 | Ayna kayıtlarının denetim izi kopya üretir | Orta | Düşük | `Source = Ayna` işareti; aynı `CorrelationId` |
| R8 | Kullanıcı "sil" beklerken "iptal" görünce şaşırır | Orta | Düşük | İptal penceresinde sade açıklama; yardım metni (`HelpPage.tsx:198` deseni) |
| R9 | İmha kaydı tutulmaz, denetimde kanıt çıkmaz | Orta | Orta | İmha kaydı zorunlu; mühürle birlikte raporlanır |
| R10 | Yedeklerdeki kişisel veri döngü dışında kalır | Orta | Orta | Yedek saklama süresi politikaya bağlanır (`.github/workflows/backup.yml:93`) |

**doğrulanacak:** KVKK aydınlatma, açık rıza ve veri sahibi başvurusu için geçerli süreler ve usul —
kaynak: hukuk danışmanı; bu doküman **hukuk danışmanı onayı gerekir** diye işaretler.
**doğrulanacak:** e-Fatura, e-Arşiv ve e-Defter için yasal saklama süresi ve dayanağı — kaynak: mali
müşavir. **doğrulanacak:** `docs/hukuk/VERI-SAKLAMA-VE-IMHA-POLITIKASI.md:19-41` tablosundaki bütün
süreler. **doğrulanacak:** barındırma sağlayıcısının sunucu ve yedek bölgesi; alt işleyen listesi —
kaynak: sağlayıcı sözleşmesi. **doğrulanacak:** barındırma sağlayıcısında denetim tablosu için yalnız
ekleme yetkili ayrı veritabanı rolü tanımlanabiliyor mu. **doğrulanacak:** KVKK kapsamında şirketin
"veri sorumluları sicili" ve "periyodik imha" yükümlülüğünün eşikleri — kaynak: hukuk danışmanı.
**doğrulanacak:** Luca'nın işlem geçmişi ekranı ve e-Dönüşüm saklama hizmeti kapsamı — kaynak: Luca
kılavuzu/demo.

Sonraki belgeyle bağlantı: `36-PERFORMANS-OLCEK.md` denetim tablosunun büyümesini ve arşiv stratejisini,
`37-TEST-CI-GENISLETME.md` bu dokümandaki testlerin CI'da koşmasını, `38-GUVENLIK.md` erişim günlükleri
ve olay müdahalesini, `00-DIZIN.md` bütün setin durumunu tanımlar.
