# YES Lojistik — Geliştirme Planı

> **6 Ekim — kolaylaştırma/yeni görünüm ilerlemesi:** Ayrıntı ve kalan işler aşağıdaki "Yeni görünüm ve kolaylaştırma (6 Ekim)" bölümünde. Özet: görsel jeton katmanı (`html[data-ui="new"]`), `docs/plan/` seti (35 belge) + `tools/docs/referans-denetimi.ps1` denetleyicisi, liste iskeleti (`TableSkeleton` + `PageShell`) ve Müşteriler/Tedarikçiler/Şoförler/Personel/Sabit Ödemeler listeleri, e-Fatura'da "Faturalandırılacaklar" sekmesi, `DetailDrawer` (Sevkiyatlar `?id=`), Mazotlar ve Araç Masrafları ekranları, telefonda kart görünümü/alt menü şeridi/tam ekran süzgeç, Bugün'de "Onay Bekleyenler" sekmesi, sevkiyat formunda tek sayfa iki sütun.

> **5 Ekim — yeni uygulama sırası:** Kullanıcıyla hazırlanan kapsam ve kabul şartları `TAM-GELISTIRME-PLANI.md` dosyasında. İlk güvenlik paketi tamamlandı: eksik aktarım doğrulaması, küçük gruplarda toplu silme koruması ve karışık KDV faturası kontrolü. 311 sunucu ve 47 tarayıcı testi dahil CI geçti. Doğrulama durumu `UYGULAMA-DURUMU.md` içinde.
>
> Eski bulguların güncel durumu: tedarikçi carisine alınan faturalar dahil edilmiş; alınan fatura oluşturma/güncelleme transaction kullanıyor; demo temizliğinde koruma ve audit kaydı mevcut; müşteri durum e-postası mevcut. Bunlar yeniden yazılacak işler değil, testlerle doğrulanacak/tamamlanacak başlıklardır.

*Dört ayrı inceleme (arayüz, sunucu, veri aktarımı, güvenlik/kalite) tek planda birleştirildi. En kritik bulguları kodda tek tek kontrol ettim:*
- *Tedarikçi cari hatası: doğrulandı.*
- *Fatura toplam satırının kayması: doğrulandı.*
- *Ücretsiz veritabanı ve demo verisi ayarı: doğrulandı.*
- *Sıfırlama listesinde alış faturalarının eksik olması: doğrulandı.*
- *Ana sayfanın grafik kütüphanesini hemen yüklemesi: doğrulandı.*
- *Aktarım betiklerinin Windows'ta çalışmaması: doğrulandı.*

*Belgede gerçek müşteri, tedarikçi adı ya da tutar yok. Yalnızca kayıt sayıları var.*

> **Güncel sıra ve kullanıcı kararları (2 Ekim):** `YOL-HARITASI.md` (A0–A9). Bu belge teknik ayrıntı kaynağıdır.

> **Müşteri kurulum otomasyonu (karar A, hazır, gerçek sunucuda denenmedi):** `deploy/customer-new.sh` / `customer-update.sh` / `customer-check.sh` / `customer-backup.sh` / `customer-restore.sh` / `customer-remove.sh`; anlatım `MUSTERI-KURULUM.md`, pilot listesi `PILOT-PAKETI.md`. Sıradaki: ilk gerçek VPS'te uçtan uca deneme, lisans ayarının (`License__Key`) uygulamayla eşlenmesi.

---

## Özet

1. **Veritabanı 28 Ekim 2026'da silinecek.** Canlı sistem Render'ın ücretsiz veritabanında duruyor (Frankfurt). Render bu veritabanını kuruluştan 30 gün sonra siliyor: kurulum 28 Eylül, silinme 28 Ekim (Render panelinden doğrulandı). Alan 1 GB ile sınırlı ve nokta-zaman geri dönüşü yok. Gerçek veri yüklemeden önce **ücretli bir veritabanı planına geçmek şart.**
2. **Tedarikçiler Cari ekranı yanlış bakiye gösteriyor.** Alış faturaları bu ekranın bakiyesine hiç girmiyor. Tedarikçi kartı ve ekstre doğru, ama cari listesi farklı rakam veriyor. Para tarafındaki en ciddi hata bu ve 1 günde düzelir.
3. **Veri aktarımındaki sıkıntının sebebi tasarım, şans değil.** Bugünkü yol 3 ayrı program dili (Node, Python, .NET), 10 ayrı Excel dosyası ve ortam değişkenine yazılan şifreler istiyor. Masaüstündeki yedeğin formatını okuyamıyor, bilgisayarınızda Python kurulu değil, aktarım betikleri Windows'ta hiçbir şey yapmadan kapanıyor. **Çözüm:** panelin içinde tek ekranlı bir "Eski Sistemden Taşı" sihirbazı (ayrıntısı aşağıda).
4. **Geçmiş taşınmıyor.** Bugünkü yöntem her cari için tek bir "devir" rakamı taşıyor. Şunların hiçbiri tek tek gelmiyor:
   - yaklaşık 498 satış faturası,
   - yaklaşık 379 alış faturası,
   - 365 tahsilat,
   - yaklaşık 290 tedarikçi ödemesi,
   - 758 banka hareketi.

   Bu yüzden ekstreler, vade raporları ve banka dökümleri boş başlıyor. Ayrıca seferlerin komisyon, KDV ve tevkifat bilgisi aktarımda kayboluyor.
5. **"Demo verilerini temizle" düğmesi gerçek veride de çalışıyor.** "SİL" yazan bir yönetici gerçek verinin tamamını ve kayıt geçmişini (audit log) siliyor. Alış faturası eklendikten sonra bu işlem zaten hata verip yarıda kalıyor.
6. **Günlük iş hızı için en büyük kazanç:**
   - "Kaydet ve Yeni" düğmesi,
   - kopya sayısı alanı (pratikortam'daki gibi),
   - klavyeyle hızlı giriş (✅ 3 Ekim: Tab akışı, Ctrl+Enter ile kaydetme),
   - yanlışlıkla kapanınca kaybolmayan formlar (✅ 3 Ekim: kapatmadan önce sorar).
7. ✅ *(3 Ekim: "Sunucu açılıyor" şeridi, hata ve "Tekrar dene" ekranları eklendi.)* **Sunucu uykudayken ekran donmuş gibi görünüyor.** Ücretsiz sunucu uykudan uyanırken ekranlar sonsuz dönen simgede kalıyor ya da sizi oturumdan atıyor. Hata ve "Tekrar dene" ekranları yok.
9. ✅ **3 Ekim'de canlıya gidenler:**
   - raporlar (Sevkiyat PDF/İcmal, Kazanç raporu, ekstre Excel, liste Excel'leri, filtre toplamları);
   - toplu işlemler (çoklu seçim ve alt çubuk);
   - kısa sefer formu ("Ayrıntılar");
   - tutarlar 2 kuruş basamağıyla;
   - Türkçe form hataları.
10. ✅ **Cari, ekstre ve fatura çıktıları (3 Ekim):**
   - Müşteriler/Tedarikçiler Cari: İptal Fatura, Alınan Fatura (tedarikçi), Faturasız Sevkiyatlar (tutar ve sefer sayısı) sütunları;
     başlığa tıklayınca sıralama; ekrandaki süzgeç, arama ve sıralamayla Excel ve PDF. Aynada bakiye yine pratikortam'ın;
     panelde verisi olan fatura/sefer sütunları gösterilir, devir ve ödeme sütunları gizlenir.
   - Müşteri ekstresinde "Faturasız seferleri de göster" (PDF, Excel ve e-posta): teslim edilmiş, faturası kesilmemiş seferler
     ayrı bölümde bilgi olarak listelenir, bakiyeye girmez.
   - Faturalar: "Fatura İcmali" PDF'i (süzgeçteki ya da seçilen faturalar: no, tarih, vade, matrah, KDV, tevkifat, toplam, kalan)
     ve sevkiyat no ile arama (S öneksiz de yazılabilir).

   Bekleyen kararlar `YOL-HARITASI.md` → "Kullanıcıdan gerekenler" bölümünde.
8. ✅ **.NET 10'a geçildi (2 Ekim).** .NET 8 desteği 10 Kasım 2026'da bitiyordu. Sunucu, Docker imajları ve CI artık .NET 10 kullanıyor.

---

## Veri aktarımı: sıkıntıyı kalıcı çözme

> **Kullanıcı kararı (2 Ekim, güncel):** Yan yana kullanım. Panel pratikortam'ın aynası: günde 4 kez otomatik senkron, panelde düzenleme yok,
> cari bakiyeler pratikortam rakamı, Türkçe yazım düzeltmeli. Ayrıntı ve sıradakiler: `PRATIKORTAM-GECIS.md`. Aşağıdaki "Eski Sistemden Taşı"
> sihirbazı tam geçiş günü için geçerliliğini korur; o güne kadar öncelik görünüş, Türkçe ve pratikortam'a benzeyen düzen (Faz 2–3).

### Neden her seferinde sorun çıkıyor?

| Sorun | Sonucu |
|---|---|
| Elimizde 3 farklı veri formatı var, ama masaüstündeki yedeği okuyan kod yok | Her yeni yedek için yeniden tarama ya da elle yapıştırma gerekiyor |
| Python bilgisayarınızda kurulu değil. Node betikleri Windows'ta sessizce kapanıyor | Aktarım yalnızca bulut oturumunda, özel ayarlarla çalışıyor |
| 10 ayrı dosya, uyuyan ücretsiz sunucuya tek tek yükleniyor. Giriş anahtarı 15 dakika geçerli | İş yarıda kesiliyor, veri yarım kalıyor |
| Çift kayıt kontrolü tahmine dayanıyor (tarih + tutar + açıklama) | Aynı gün aynı tutardaki iki gerçek ödeme tek kayda düşüyor. Tekrar çalıştırınca devirler iki kez yazılıyor |
| Hatalı VKN, telefon veya IBAN alanları otomatik siliniyor | Bilgi kalıcı olarak kayboluyor |
| Geri alma yok | Sorun çıkarsa ya tüm veriyi silmek ya da yedekten tamamen dönmek gerekiyor |

### Yeni tasarım: tek dosya, iki tık

Bütün dönüştürme işi tek bir yerde, **panelin sunucusunda** yapılacak. Python yok, Excel ara dosyası yok, şifre yazmak yok.

**Sizin yapacaklarınız (5 adım):**
1. Panele normal şekilde giriş yapın: **Ayarlar → Veriler → "Eski Sistemden Taşı"**.
2. Masaüstündeki yedek klasörünü **tek bir .zip dosyası** olarak sürükleyip bırakın.
3. Açılan **önizleme** ekranını okuyun. Örnek: "154 müşteri, 205 sefer, 498 satış faturası… — Mutabakat: 154/154 tuttu". Bu adımda hiçbir kayıt yazılmaz.
4. Panelde zaten kayıtlı olan cariler için "Eşleştir / Yeni aç / Atla" seçimini yapın.
5. **"Aktar"** düğmesine basın ve bitince **Mutabakat Raporu**nu indirin.

**Otomatik yapılanlar:**
- **Yedek kontrolü:** zip açılır, dosyaların bütünlüğü ve güvenliği kontrol edilir.
- **Gerçek deneme:** önizleme, gerçek veritabanı kurallarıyla ama **geri alınan bir işlem** içinde yapılır. Deneme gerçek gibi çalışır, ama hiçbir şey kalmaz.
- **Aktarım öncesi yedek:** "Aktar"a basınca önce otomatik bir veritabanı yedeği alınır.
- **Sıralı aktarım:** veriler şu sırayla aktarılır:
  1. Kasa ve bankalar
  2. Müşteriler
  3. Tedarikçiler
  4. Şoförler
  5. Araçlar
  6. Seferler
  7. Satış faturaları
  8. Alış faturaları
  9. Tahsilatlar
  10. Tedarikçi ödemeleri
  11. Giderler
  12. Personel
  13. Belgeler

  Her adım kendi içinde tamamlanır. Sunucu yarıda kapanırsa **kaldığı yerden devam eder**.
- **Kalıcı eşleştirme:** her kayıt eski sistemdeki numarasıyla (sefer no, VKN, plaka, fatura no) eşleştirilir. Aynı yedeği ikinci kez yüklemek **hiçbir kaydı çoğaltmaz**. Yeni bir yedek yüklenirse sadece değişenler ve yeniler gelir.
- **Mevcut kayıtlar korunur:** panelde zaten olan bir carinin yalnızca **boş alanları** doldurulur. Dolu alanların üzerine yazılmaz.
- **Bozuk veri silinmez:** hatalı VKN veya telefon olduğu gibi saklanır ve "Düzeltilmesi gerekenler" listesine düşer.
- **Geri al düğmesi:** sadece bu aktarımın eklediği kayıtlar silinir, güncellenen kayıtlar eski hâline döner.
- **Sessiz aktarım:** aktarım sırasında e-fatura, bildirim ya da SMS gönderilmez.

### Hiçbir şeyin kaybolmadığını nasıl doğrularız?

- **Cari bazında karşılaştırma:** her müşteri ve tedarikçinin panel bakiyesi, eski sistemin kendi ekstresinin son bakiyesiyle karşılaştırılır (154 müşteri, 128 tedarikçi).
- **Banka bazında karşılaştırma:** 3 hesabın kapanış bakiyesi eski sistemdeki "Güncel Bakiye" ile karşılaştırılır.
- **Sayı karşılaştırması:** her tür için kayıt sayıları eşleşmeli (sefer, fatura, tahsilat, ödeme, gider). Sefer numaralarındaki boşluklar "Eski panelde silinmiş görünüyor" diye ayrıca listelenir.
- **Kural:** her farkın 0,05 TL'nin altında olması gerekir. Daha büyük bir fark varsa ya düzeltilir ya da gerekçesi yazılarak "Farkı kabul et" ile onaylanır. Aksi hâlde "Aktar" düğmesi açılmaz.
- **Geçiş günü son kontrol:** rastgele 5 carinin ekstresi eski sistemle elle karşılaştırılır.
- **Otomatik testler:** gerçek yedeğin isimleri ve vergi numaraları sahteleriyle değiştirilmiş bir kopyası üzerinde şunlar test edilir:
  - "iki kez aktar = 0 yeni kayıt",
  - "geri al = eski hâl",
  - "mutabakat = 0 fark".

### Geçiş takvimi önerisi
1. Önce veritabanını ücretli ve Avrupa'daki plana taşıyın. Demo veri ayarını kapatın.
2. Bugünkü yedekle **prova** yapın: önizleme, aktarım, mutabakat.
3. Geçiş günü pratikortam'a veri girişini durdurun, son yedeği alın ve aynı ekrandan yükleyin. Sadece fark gelir, sıfırlama gerekmez.
4. Masaüstündeki şifresiz yedeği şifreli arşive koyun ve düz klasörü silin (KVKK).

---

## Aşama 1 — Hemen (1–3 gün)

| # | Başlık | Neden önemli | Ne değişecek | Efor |
|---|---|---|---|---|
| 1 | Veritabanını ücretli plana geçir (2 Ekim: kullanıcı şimdilik istemiyor; ayna yeniden kurabildiği için karar Ekim ortasında) | Ücretsiz veritabanı 28 Ekim 2026'da silinir. 1 GB sınırı var, nokta-zaman geri dönüşü yok | `render.yaml` (plan, `region: frankfurt`), yedek anahtarı ayarı, bir kez yedekten geri yükleme denemesi | M |
| 2 | ✅ Canlıda demo veri yüklemeyi kapat (2 Ekim) | Veritabanı yeniden kurulursa sahte müşteriler gerçek verinin içine karışır | `render.yaml` → `Seed__SampleData: "false"` | S |
| 3 | Tedarikçi cari bakiyesini düzelt | Alış faturaları cari listesine girmiyor, bakiye yanlış | `CariService.SuppliersAsync` + tutarlılık testi | S |
| 4 | "Demo verilerini temizle"yi kilitle ve onar | Gerçek veriyi tek kelimeyle silebiliyor. Alış faturası varken hata veriyor | `DataResetService`: sadece demo durumunda çalışsın, eksik tablolar eklensin, kayıt geçmişi silinmesin | S |
| 5 | ✅ Fatura sayfasındaki toplam satırı kaymasını düzelt | Toplam "Kalan" sütununun, kalan tutar "Durum" sütununun altında görünüyor | `InvoicesPage.tsx` alt satırı (colSpan 4 → 3) | S |
| 6 | ✅ Hata ve "Tekrar dene" ekranları | Sunucu uyanırken ekran sonsuz döner, ağ hatasında kullanıcı oturumdan atılır | `DataTable`, `DashboardPage`, `auth.tsx`. Metin: "Sunucu birkaç saniye içinde açılıyor olabilir. [Tekrar dene]" | M |
| 7 | Alış faturası kaydını "ya hep ya hiç" yap | Sefer bağlama başarısız olursa fatura yarım kalır ve borç yanlış artar | `PurchaseInvoiceService` işlem (transaction) | S |
| 8 | ✅ Ana sayfa yüklemesini hafiflet (ilk yükleme 666 kB → 299 kB) | İlk açılışta gereksiz yere grafik kütüphanesi iniyor (665 kB) | `App.tsx` → `DashboardPage` sonradan yüklensin, grafik ayrı parçaya ayrılsın | S |
| 9 | ✅ Klavye akışı: öneri düğmeleri Tab sırasından çıksın, Tab ile seçim yapılsın | Tab tuşu 30'dan fazla küçük düğmede duruyor. "akd" yazıp Tab'a basınca seçim kayboluyor | `TripForm`, `Inputs`, `FormSelect` | S |
| 10 | Sadece main dalı CI'dan geçince yayına al | Hatalı kod da otomatik yayına çıkıyor | `render.yaml` → `autoDeployTrigger: checksPass` | S |

## Aşama 2 — Kısa vade (1–2 hafta)

| # | Başlık | Neden önemli | Ne değişecek | Efor |
|---|---|---|---|---|
| 1 | **"Eski Sistemden Taşı" sihirbazı** | Aktarım sıkıntısını kalıcı bitirir, tüm geçmişi taşır | Yeni sunucu servisi (yedek okuyucu, aktarım, mutabakat), yeni panel sayfası, aktarım çalıştırma ve eşleştirme tabloları | L |
| 2 | Sefer aktarımında tüm alanlar | Komisyon, KDV, tevkifat, taşeron ve teslim evrak no kayboluyor | Aktarım eşleştirmesi + seferlere eski numara (`ExternalRef`) | M |
| 3 | Kalıcı eşleştirme anahtarı (eski kayıt no) | Tekrar aktarımda çift kayıt ve kaybolan kayıt olmasın | Cari, şoför, araç, fatura ve ödeme tablolarına eski no ve benzersiz indeks | M |
| 4 | **Kaydet ve Yeni + Kopya sayısı + Formu açık tut** | Günde çok sefer giriyorsunuz, pratikortam'daki alışkanlık | `TripForm` alt düğmeleri, listede "Kopyala" | M |
| 5 | Formlarda odak, Ctrl+Enter ile kaydet, kapatmadan önce uyarı, taslak | Yanlış tıklamayla 30 alanlık form kayboluyor. Metin: "Kaydedilmemiş değişiklikler var" | `ui.tsx` Modal + `TripForm` taslak | M |
| 6 | Faturada seferin KDV ve tevkifatını kullan | Tevkifatlı sefer tevkifatsız faturalanabiliyor. Metin: "Seçilen seferlerin KDV oranları farklı. Ayrı fatura kesin." | `InvoiceService.CreateAsync` | M — **kısmen (3 Ekim):** KDV seçili seferlerden gelir, tevkifat "Otomatik" (12.000 TL + VKN kuralı), %0'da istisna kodu 311. Farklı oranlı seferler için uyarı bekliyor |
| 7 | Faturalı seferde kritik alanları kilitle | Faturası kesilmiş seferin taşeronu veya maliyeti değişince iki cari birden bozulur | `TripService.UpdateAsync` | S |
| 8 | Aynı anda düzenleme koruması | Çift tıklama veya iki kullanıcı aynı seferi iki kez faturalayabiliyor | Sürüm alanı + uyarı: "Bu kayıt siz düzenlerken değiştirildi" | M |
| 9 | Filtre toplamları (sayfa değil, filtrenin tamamı) | "Sayfa toplamı" ay sonu kontrolünde yanıltıyor | Fatura, gider, ödeme ve alış faturası toplam uçları + ortak toplam şeridi | M — **yapıldı (A4)** |
| 10 | Filtreler adres çubuğunda kalsın | Geri gelince veya sayfayı yenileyince filtreler sıfırlanıyor | Ortak bir adres-durumu yardımcısı, tüm liste sayfaları | M — **Sevkiyatlar'da yapıldı (3 Ekim)**, diğer listeler bekliyor |
| 11 | ~~Sefer listesine Özet/Detay görünümü, tedarikçi, plaka ve evrak filtresi, PDF/İcmal~~ **Yapıldı (3 Ekim)** | Pratikortam'daki liste alışkanlığı | `TripsPage`, `TripQuery` | M |
| 12 | ~~Toplu seçim ve toplu işlem~~ **Yapıldı (A5)** | Teslim evrakı onayı tek tek yapılıyor. Toplu ödeme yok | `DataTable` seçim + alt işlem çubuğu; `/api/trips/bulk/*`, `/api/supplier-payments/bulk` | M |
| 13 | Cari tablolarında sıralama, Excel/PDF ve sütun toplamları | Pratikortam'da var, burada yok | `CariPage` | S — **yapıldı (3 Ekim)** |
| 14 | Ana listelerde Excel dışa aktarma ve arşiv/pasif görünümü | Müşteri, tedarikçi, şoför ve araç listelerinde sadece içe aktarma var | 4 dışa aktarma ucu + düğmeler | M — **Excel yapıldı (A4)**, arşiv görünümü bekliyor |
| 15 | Hata kodu (iz numarası) ve hata kayıtları | "Beklenmeyen hata" mesajının nedeni bulunamıyor | `ExceptionHandler` + mesajda "Hata kodu: …" | S |
| 16 | Arka plan işleri zamanlayıcıyla çalışsın | Sabah özeti ve e-fatura durumu uyuyan sunucuda çalışmıyor | GitHub Actions zamanlayıcısı + "Son çalışma" bilgisi | S |
| 17 | ✅ .NET 10'a yükseltme (2 Ekim) | .NET 8 desteği 10 Kasım'da bitiyor | Tüm `.csproj`, Docker, CI | M |
| 18 | Yedek saklama süresini uzat ve dışarıya kopyala | Muhasebe kayıtları 5–10 yıl saklanmalı, şu an 30 gün | `backup.yml` + harici depo (R2/B2) | M |

## Aşama 3 — Orta vade

| # | Başlık | Neden önemli | Ne değişecek | Efor |
|---|---|---|---|---|
| 1 | Ayrıntılı kullanıcı yetkileri | Bugün her ofis kullanıcısı müşteri, gider ve belge silebiliyor, kârı görebiliyor | Yetki tablosu (Görüntüle / Ekle / Düzenle / Sil), "Kârı görebilir" yetkisi | L |
| 2 | Dosyaları veritabanından harici depoya taşı | PDF ve fotoğraflar veritabanını ve yedekleri şişiriyor | S3 uyumlu depo (AB bölgesi) + "Depolama" göstergesi | M |
| 3 | Kâr hesabını tek formüle indir, komisyonda KDV'yi doğru hesapla | Kâr, komisyonun KDV'si kadar fazla görünüyor. Formül 8 yerde tekrar ediyor | Ortak bir kâr ifadesi + testler. Etiket: "Kâr (KDV hariç)" | M — **yapıldı (3 Ekim):** tek formül (`TripProfit`); komisyon, ek masraf ve giderler KDV hariç sayılıyor (`docs/KDV-KURALLARI.md`) |
| 4 | Şoför primi, masraf ve bekleyen komisyon cariye işlensin | Kâr düşüyor ama borç ya da alacak görünmüyor | Şoför cari, borçlar, "Bekleyen komisyonlar" raporu | M |
| 5 | Cari tutarlılık testleri | Tedarikçi hatası testlerle yakalanamadı | Ortak bir "tüm bakiyeler aynı mı" kontrolü | M |
| 6 | Sıkı görünüm ve sabit tablo başlığı | Bir ekrana az satır sığıyor, başlık kayboluyor | `DataTable` + "Görünüm: Normal / Sıkı" | M |
| 7 | Mobilde filtre paneli ve kart görünümü | Telefonda filtreler ekranın yarısını kaplıyor, 8 liste yana kayıyor | Filtre alt sayfası + 8 listeye kart görünümü | M — **kısmen (6 Ekim):** süzgeç telefonda tam ekran ve 11 sayfada kart görünümü var (Sevkiyatlar, Cari, Müşteriler, Tedarikçiler, Şoförler, Personel, Sabit Ödemeler, Faturalar, İş Talepleri, Mazotlar, Araç Masrafları); detay sayfaları, Yönetici, Analiz, Çekler, Ödemeler ve Alınan Faturalar bekliyor |
| 8 | Güvenlik iyileştirmeleri | Hesap kilitleme kötüye kullanılabiliyor; yedek anahtarı tek parça; şifre sıfırlama bağlantısı sahte adrese yönlendirilebilir; hız sınırı aşılabilir | Kimlik doğrulama, yönetim ve başlangıç kodu; nginx | S–M |
| 9 | KVKK: konum izni sunucuda da denetlensin, mesai dışında konum kaydı tutulmasın | Yasal risk | `DriverController`, konum saklama süresi | S |
| 10 | Klavye kısayolları ve erişilebilirlik | Alt+N = Yeni Sefer, "/" = arama, "?" = kısayol listesi | Layout, yardım sayfası | S |
| 11 | Görsel tutarlılık | Para hep 2 kuruş basamağıyla gösterilsin, tek tip etiket bileşeni olsun, yazım tek tip olsun ("Güzergâh") | Ortak bileşenler | S |
| 12 | Ödeme kurallarını servise taşı | Aktarım ve elle girişin aynı kurallardan geçmesi için | Ödeme ve tedarikçi ödemesi servisleri | M |
| 13 | Panel performansı | Geçmiş aktarılınca ana sayfa ve cari ekranları yavaşlar | Toplamlar veritabanında hesaplanır, kısa süreli önbellek | M |
| 14 | U-ETDS (karayolu eşya bildirimi) | Rakiplerin çoğunda var, bizde yok; yasal zorunluluk | **Hazırlık yapıldı (4 Ekim):** "U-ETDS hazırlığı" kontrolü (sefer paneli, liste süzgeci), şoför/sefer ek alanları, `docs/UETDS.md`. **Gönderim bekliyor:** yetki belgesi, kullanıcı adı/şifre, test ortamı ve Bakanlık teknik dokümanı gerekli | M (doküman gelince) |
| 15 | e-Fatura entegratörü | Fatura panelden gönderilemiyor, XML elle yükleniyor | **Altyapı yapıldı (4 Ekim):** `IEInvoiceProvider` + `ManualXmlProvider` + `EInvoice__Provider` kayıt tablosu, `docs/ENTEGRATOR-EKLEME.md`. **Bekliyor:** entegratör seçimi, test hesabı ve API dokümanı | M |

---

## Pratikortam'da olup hâlâ eksik olanlar

| Özellik (pratikortam) | YES Lojistik'te durum | Aşama |
|---|---|---|
| İş ekle → "Formu açık tut" ve kopya sayısı (1–19) | **Var (6 Ekim):** sevkiyat formu tek sayfa iki sütun; "Kaydettikten sonra formu açık tut" ve "Kopya sayısı" (1–20) | 2 |
| Sevkiyatlar Özet/Detay görünümü (yük, açıklama, komisyon, masraf, fatura, giren kişi) | **Var (3 Ekim):** "Özet / Detay" düğmesi; tercih tarayıcıda hatırlanır | 2 |
| Tedarikçi, plaka, evrak var/yok filtreleri | **Var (3 Ekim):** tedarikçi, plaka, Piyasa / Öz Araç, komisyon işi, yükleme/indirme yeri, sevkiyat/teslim evrak/fatura no, teslim evrakı var/yok; adreste kalır, toplamlar ve Excel/PDF/İcmal süzgece uyar | 2 |
| Sevkiyat listesi PDF ve İcmal | **Var:** Sevkiyatlar → "Sevkiyat PDF" ve "İcmal" | 2 |
| "Teslim Evrak Onayla" satır işlemi | **Var (A5):** Sevkiyatlar'da seçip "Teslim evrakını onayla" (toplu) | 2 |
| Toplu ödemeler / "Seçilenleri listeye ekle" | **Var (A5):** Sevkiyatlar ve tedarikçi kartında seferleri seçip "Toplu ödeme" (tedarikçi başına bir ödeme, önizlemeli) | 2 |
| Cari tablolarında her sütunda sıralama, Excel ve PDF | **Var (3 Ekim)** | 2 |
| Cari detay sütunları (alınan fatura, verilen ödeme, iptal) | **Var (3 Ekim):** iptal fatura, alınan fatura, faturasız sevkiyatlar | 2 |
| Faturalarda filtre toplamı (matrah, KDV, tevkifat, genel toplam) | Sadece sayfa toplamı | 2 |
| Müşteri, tedarikçi ve şoför listelerinde Excel dışa aktarma | Sadece içe aktarma | 2 |
| Arşiv firmaları / arşiv tedarikçileri | Sadece şoförde pasif filtresi var | 2 |
| Filtrelerin adreste kalması (yer imi, paylaşım) | Yok | 2 |
| Tüm sütunlarda sıralama işareti (↕) | 6 listede sıralama hiç yok | 2 |
| Eski fatura, tahsilat, ödeme ve banka hareketi geçmişi | Taşınmıyor (tek devir rakamı) | 2 |
| Sefer belgeleri (PDF), alış faturası görselleri | Taşınmıyor, yedekte sadece dosya adları var | 2 |
| Kullanıcı başına modül ve işlem yetkisi | Sadece 3 rol | 3 |
| Her yerde 2 kuruş basamaklı tutar | Tablolar karışık | 3 |

---

## Teknik ek

Önem sırasına göre ham liste (mühendisler ve bulut oturumları için):

| # | Başlık | Önem | Yer |
|---|---|---|---|
| 1 | Prod DB on Render free Postgres (30-day deletion, 1 GB, no PITR, US region) | critical | `render.yaml` (databases plan free, no region) |
| 2 | Supplier cari omits PayableKind.Invoice (verified L42-43) | critical | `server/YesLojistik.Infrastructure/Services/CariService.cs` |
| 3 | Migration pipeline cannot read the json/ snapshot; Windows entry guard `file://${argv[1]}` never matches (verified) | critical | `tools/legacy/extract.mjs:67`, `crawl.mjs:234`, `transform.py`, `prova.py` |
| 4 | Financial history not migrated (invoices, purchase invoices, payments, bank rows collapsed to devir) | critical | `transform.py`, `ImportService` (no purchase-invoice import) |
| 5 | DataResetService wipes real data and audit_logs; table list missing purchase_invoices, customer_groups, invoice_note_templates; FK Restrict breaks it (verified) | high | `DataResetService.cs` L19-41 |
| 6 | Seed__SampleData "true" in prod (verified) | high | `render.yaml` L32 |
| 7 | Server-side LegacySnapshotImporter + wizard (preview in rolled-back tx, apply in background job, checkpoints, rollback by import_run_id, legacy_links upsert) | high | new `Legacy*` services, `LegacyImportController`, `LegacyImportPage.tsx` |
| 8 | Trip import drops TripTerms fields, ExternalRef, carrier per shipment; customers get IsEInvoiceUser=false | high | `ImportService.Columns["trips"]`, `TripsAsync`, `transform.py` |
| 9 | No idempotency keys; natural-key dedupe drops real rows; TODAY-dated devir double-counts on rerun | high | `ImportService` Payments/SupplierPayments/Expenses/Trips |
| 10 | Existing prod records skipped and their opening balances lost | high | `ImportService` Customers/Suppliers/Vehicles/Drivers |
| 11 | Trip SaleVatRate/SaleWithholdingTenths ignored by invoicing | high | `InvoiceService.cs` ~55-116 |
| 12 | Purchase invoice create/update not atomic | high | `PurchaseInvoiceService.cs` |
| 13 | No granular permissions; deletes open to all office roles | high | `Policies.cs`, Customers/Suppliers/Expenses/Attachments controllers |
| 14 | ✅ Done (2 Oct): upgraded to .NET 10 (net10.0, EF Core/Npgsql 10, sdk/aspnet:10.0 images) | high | `*.csproj`, Dockerfiles, `ci.yml` |
| 15 | Fast entry: Kaydet ve Yeni / kopya / keep-open | high | `client/src/components/TripForm.tsx` |
| 16 | Modal: no autofocus, focus trap, restore, Ctrl+Enter; no dirty guard | high | `client/src/components/ui.tsx` Modal |
| 17 | Suggestion chips in Tab order; SearchSelect doesn't select on Tab | high | `TripForm.tsx`, `Inputs.tsx`, `FormSelect.tsx` |
| 18 | No isError UI; /auth/me network error logs out | high | `DataTable.tsx`, `DashboardPage.tsx`, `lib/auth.tsx` |
| 19 | Main chunk 665 kB via eager DashboardPage/recharts (verified) | high | `client/src/App.tsx` L7, `vite.config.ts` |
| 20 | InvoicesPage footer 8 cells for 7 columns (verified) | medium | `client/src/pages/InvoicesPage.tsx` L104-111 |
| 21 | Optimistic concurrency missing (double invoicing) | medium | Invoice/PurchaseInvoice/Trip services; add xmin token |
| 22 | Trip edits desync linked invoices | medium | `TripService.UpdateAsync/Apply/DeleteAsync` |
| 23 | Margin formula duplicated ~8× and uses gross commission | medium | `Trip.Margin`, `ReportService`, `DashboardService`, `TripService` |
| 24 | Driver bonus / extra charge / pending commission off-ledger | medium | `DriverLedgerService`, `PayableService` |
| 25 | Reconciliation as a server feature (LegacyClosingBalance, /reconcile) | medium | new endpoint, `MigrationCheckCard` |
| 26 | prova.py blanks invalid VKN/IBAN, hard-coded dev admin login, no token refresh; .pyc committed | medium | `tools/legacy/prova.py`, `__pycache__/` |
| 27 | Attachments not migrated; files in DB bloat 1 GB + backups | medium | `DatabaseFileStorage`, new S3 `IFileStorage` |
| 28 | Background workers unreliable on sleeping instance | medium | `DailyDigestWorker`, `EInvoiceStatusWorker`, `LocationRetentionService` |
| 29 | Auto-deploy without CI gate; migrations at boot without fresh backup | medium | `render.yaml`, `Program.cs` |
| 30 | Backup retention 30 days; restore defaults to weekly full | medium | `backup.yml`, `restore.yml` |
| 31 | Single backup token allows dump + restore; secrets reachable from any branch | medium | `AdminController`, workflows |
| 32 | Host-header based reset/tracking links when PublicUrl empty | medium | `AuthController`, `TrackingController` |
| 33 | Lockout DoS + account enumeration (429 vs 401) | medium | `AuthController.VerifyAsync` |
| 34 | Forwarded headers trusted from any proxy (rate-limit bypass) | medium | `Program.cs`, `client/nginx.conf` |
| 35 | KVKK: GPS consent not enforced server-side; off-trip tracking; Vehicle.Last* never purged | medium | `DriverController`, `TrackingService` |
| 36 | KVKK: plaintext snapshot on Desktop | medium | owner machine; doc step |
| 37 | Error ProblemDetails lack traceId; FK 23503 → 500 | medium | `ExceptionHandler.cs` |
| 38 | Missing ledger invariant tests | medium | `YesLojistik.Tests/Integration` |
| 39 | Page-only totals; filters not in URL; trips list parity; bulk actions; cari sort/export; master export | medium | `client/src/pages/*`, `DataTable.tsx` |
| 40 | Form validation UX (aria-invalid, FormSelect ref not forwarded); rows not keyboard-accessible; Excel buttons lack loading/error | medium | `ui.tsx` Field, `FormSelect.tsx`, `DataTable.tsx`, 10 download sites |
| 41 | Sticky header + compact density | medium | `DataTable.tsx`, `index.css` |
| 42 | Trip status forced to Delivered; future trips excluded; structured master fields dropped | medium | `extract.mjs`, `transform.py` |
| 43 | CI: no Dependabot/CodeQL, floating action tags, `\|\| true` on pg client, old test packages | medium | `.github/` |
| 44 | Auto-withholding per trip vs per document | medium | `InvoiceCalculator` |
| 45 | Dashboard/cari full recompute per request | low | `DashboardService`, `PayableService`, `CariService` |
| 46 | BackupService.StatsAsync ignores Payment.Counts | low | `BackupService.StatsAsync` |
| 47 | Business rules in controllers (payments) | low | `PaymentsController`, `SupplierPaymentsController` |
| 48 | VAT-rate validation inconsistent | low | `Core/Validation/Validators.cs` |
| 49 | Attachment idempotency key not scoped to trip | low | `AttachmentService.UploadAsync` |
| 50 | Duplicated upload pipeline / base URL / rate-limit lambdas | low | services + `Program.cs` |
| 51 | CSP duplicated in C# and nginx | low | `HostingSupport.cs`, `nginx.conf` |
| 52 | JWT keeps role 15 min after revoke; access cookie Expires 14 days | low | `TokenService.cs` |
| 53 | Popovers ignore Esc/arrows; tabs/toasts ARIA; only Ctrl+K shortcut | low | `Layout.tsx`, `ui.tsx`, `Toast.tsx` |
| 54 | Money formatting tl vs tl2; pill/copy inconsistencies; low-contrast muted text; theme-color | low | `lib/format.ts`, various |
| 55 | Mobile filter block height; 8 lists without mobileCard | low | `TripsPage.tsx` + 8 pages |
| 56 | Lint: exported const from component file | low | `InvoicesPage.tsx` L177 |

## İlk kurulum ve genel içe aktarma (4 Ekim)
**Yapıldı:**
- **Kurulum sihirbazı** `/kurulum` (yalnız yönetici): firma bilgileri + logo, fatura/KDV varsayılanları, veri aktarma, ilk kullanıcılar, "Örnek veri ile dene / Boş başla". Adımlar atlanabilir; tamamlanma veriden anlaşılır. Ana sayfada, firma VKN ve adresi girilene kadar büyük kart olarak görünür ("Şimdilik gizle" tarayıcıda hatırlanır).
- **Veri Aktarımı** `/aktar` (menü: Listeler): müşteri, tedarikçi, araç, şoför (devir bakiyeleri dahil). Şablon (2 örnek satır + açıklama sayfası), .xlsx veya .csv (UTF-8 / Windows-1254, `;` `,` sekme), satır satır önizleme (hazır / uyarı / hatalı / tekrar), yalnız geçerli satırları aktarma, CSV hata raporu. En çok 5.000 satır ve 5 MB. Başka programların sütun adları (Vergi No, Tel, Firma Adı...) ve ASCII yazım (Unvan) de okunur; Excel'in sildiği baştaki sıfır (9 haneli VKN) geri konur.
- **Beyaz etiket:** firma adı ve logo ayardan gelir: sol menü, giriş, takip ve gizlilik sayfaları, sekme başlığı. Ad "YES Lojistik" kaldıysa eski sarı "YES" kutusu korunur.
- **Boş durumlar:** Müşteriler, Araçlar, Sevkiyatlar, Faturalar tamamen boşken "İlk ... ekleyin" kartı + "Excel'den aktarın"; ayna açıkken düğmeler gizli.

**Sırada:** sefer, fatura, tahsilat ve gider aktarımı da önizlemeli/kısmi sihirbaza alınabilir (şimdilik eski pencere: hatalı satır varsa hiçbiri aktarılmaz). Pratikortam'dan geçiş sihirbazı ayrı iş.

## Yeni görünüm ve kolaylaştırma (6 Ekim)
**Yapıldı (main'e giren sıra: `8ce5c15` → `bd09ad9` → `afb62e8` → `7dba4d0` → `4ebc182`):**
- **Görsel jeton katmanı:** `client/src/index.css` içinde `html[data-ui="new"]` bloğu — daha açık zemin ve ince çizgiler, tablo başlığında büyük harf yok, satır sıklığı 7px → 5px, süzgeç ve sekme boşlukları. Klasik görünüm etkilenmez. Şartname: `docs/plan/29-GORSEL-SISTEM.md`.
- **Pratikortam benzerliği plan seti:** `docs/plan/` altında 35 belge (dizin, ortak şartname, ekran ekran şartname ve uygulama adımları, test/CI, risk) ve denetleyici `tools/docs/referans-denetimi.ps1` (dosya:satır referansı, mojibake/BOM, `00-DIZIN.md` durum tablosunu üretir). Tıkanıklık analizi `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md`.
- **Liste iskeleti:** `DataTable` iskeleti (`TableSkeleton`) ve `shell/PageShell`; Müşteriler listesi ilk geçen sayfa oldu. Ardından Tedarikçiler, Şoförler, Personel ve Sabit Ödemeler listeleri `PageShell`'e geçti; menü (`shell/Menu`) ve süzgeç panelinde erişilebilirlik ve z-sırası düzeltmeleri yapıldı. Toplam beş liste: Müşteriler, Tedarikçiler, Şoförler, Personel, Sabit Ödemeler.
- **F3 — "Faturalandırılacaklar" sekmesi:** `/faturalar?sekme=bekleyen`. Teslim edilmiş, faturası kesilmemiş sevkiyatlar müşteriye göre gruplanır; üstte faturalanacak sevkiyat sayısı ve KDV hariç toplam; gruptaki "Fatura Kes" sevkiyatları seçili hâlde fatura ekranını açar (`/faturalar/yeni?customerId=…&tripIds=…`). **Sunucu değişikliği yok**, mevcut `/trips` ucu kullanılır.
- **Detay çekmecesi:** `shell/DetailDrawer` ortak parçası; Sevkiyatlar'da `?id=` adresiyle açılır (klasik görünümde eski pencere davranışı aynen korunur).
- **F4 — Öz Mal ekranları:** `/mazotlar` (`pages/FuelPage.tsx`) ve `/arac-masraflari` (`pages/VehicleExpensesPage.tsx`). Mazot listesinde plaka, yakıt cinsi, istasyon, litre, yeni km, eski km, fark km ve km başı maliyet; fark hesaplanamıyorsa "—". Süzgeçler adreste kalır.
- **F5 — telefon (yalnız yeni görünüm):** 640px altında listeler kart görünümüne geçer (`shell/MobileCards` + `DataTable.mobileCard`), alt menü şeridi beş yuva, süzgeç paneli tam ekran, 44px dokunma hedefleri. Mobil spec yatay kaydırma olmadığını doğrular.
- **F2 — Bugün ve sevkiyat formu:** Bugün ekranında "Onay Bekleyenler" sekmesi (`/?tab=approvals`, yalnız muhasebe yetkisi): onay bekleyen teslim evrakları ve şoför masrafları tek listede, mevcut uçlarla. Sevkiyat formu tek sayfa iki sütun düzenine geçti; katlı "Diğer bilgiler" bölümü ve "Kaydet ve yeni"/"Kopya sayısı" korunur.
- **Testler:** `client/e2e/new-ui/` altına 5 yeni spec eklendi (`faturalandirilacaklar`, `mobile-cards`, `today-approvals`, `trip-form`, `trip-form-mobile`). Toplam `client/e2e` altında 24 spec ve 58 `test(...)`. Bu makinede e2e koşulamıyor (yerelde .NET 10 SDK ve PostgreSQL yok); koşu CI'da (`.github/workflows/ci.yml`, `e2e` işi).

**Sırada (bilinen eksikler):**
- `client/src/lib/nav.ts` menüsünde **Mazotlar** ve **Araç Masrafları** girdisi yok: klasik görünümde bu iki ekrana menüden erişim yok, yalnız adresle; yeni görünümde "Öz Mal" sekmelerinden açılır.
- Mazot şeridinde **toplam litre / toplam km** gösterilemiyor: `ExpenseTotalsDto` (`server/YesLojistik.Core/Dtos/FinanceDtos.cs:145`) yalnız kayıt, tutar, onaylı ve onay bekleyen veriyor; genişletilmeli. (Sunucu işi; istemci işi değil.)
- Gider formunda **kilitli kategori** yok (`lockCategory`/`defaultCategory` kodda yok): Mazotlar'dan "+ Mazot Ekle" genel gider formunu açar, kategori değiştirilebilir. Mazot listesinde **satır düzenleme** (satır menüsü) de yok.
- Detay sayfaları, Yönetici (Ayarlar), Analiz (Raporlar), Çekler, Tedarikçi Ödemeleri ve Alınan Faturalar ekranlarında **mobil kart görünümü yok**.
- `DEFAULT_UI_MODE` hâlâ `'classic'` (`client/src/lib/uiMode.ts:8`): yeni görünüm varsayılan olmadı, **müşteri onayı bekleniyor** (F6).
- "Tablo yazısı: Tırnaklı / Düz" seçimi ve `data-density` (Rahat / Sık) henüz yok.
- F4.4 (Araçlar), F4.5 (Analiz "Genel Bakış"), F4.6 (Yönetici/Profilim) ve F6 cilası yapılmadı.
- e2e testleri **bu makinede koşulamıyor** (yerelde .NET 10 SDK ve PostgreSQL yok); doğrulama CI'da yapılıyor.
