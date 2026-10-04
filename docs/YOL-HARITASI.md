# YES Lojistik — Yol Haritası (uçtan uca)

*2 Ekim 2026'da kullanıcıyla soru-cevapla belirlendi. Bu belgeye veri, şifre ya da kişisel bilgi yazılmaz.*
*Her aşama bitince burada işaretlenir. Teknik ayrıntılar: `GELISTIRME-PLANI.md`, pratikortam tarafı: `PRATIKORTAM-GECIS.md`.*

## Kullanıcının kararları

| Konu | Karar |
|---|---|
| Kullanım | **Yan yana dönem:** iş pratikortam'da sürer, panel pratikortam'ın aynasıdır. Panelde kayıt girilmez. |
| Geçiş | Eksikler tamamlanınca, tek günde. |
| Cihaz | Çoğunlukla bilgisayar. Telefonda da düzgün çalışmalı ama öncelik masaüstü. |
| Görünüş | **Yeni ve modern.** Renk ve hava: 3 örnek tasarımdan kullanıcı seçer. |
| Tablolar | Orta yoğunluk: okunaklı, az boşluk, bir ekranda 15-20 satır. |
| Kalabalık | **Formlar kısalır:** zorunlu alanlar üstte, gerisi kapalı "Ayrıntılar" bölümünde. |
| Göze batanlar | Bütün ekranlar: Sevkiyatlar, Cari, formlar, ana sayfa ve menü. Kalabalık; yazılar ve renkler. |
| Eksikler | Raporlar ve çıktılar, toplu işlemler, fatura ve e-Fatura, eksik ekran ve alanlar. |
| Raporlar | Sevkiyat PDF/İcmal, kazanç/kâr raporu, cari ekstre, her listede Excel. |
| e-Fatura | Bugün ayrı bir programla kesiliyor (hangisi olduğu öğrenilecek). Geçişten sonra **yeni panelden** gidecek. |
| İş sırası | **Önce tasarım, sonra eksikler.** |
| Takip | Toplu, aşama aşama: her aşama bitince birlikte bakılır. |

## Aşamalar

### A0 — Ayna canlıda (önkoşul, 1 gün)
Kod hazır ve canlıda. Bekleyen tek şey şifreler.
- [x] **Kullanıcı:** GitHub → Settings → Secrets and variables → Actions → Repository secrets'a giriş bilgileri eklendi (3 Ekim). Tek kayıt: `PASS`, her satırda `AD=değer` (PRATIK_USER, PRATIK_PASS, PANEL_EMAIL, PANEL_PASSWORD). Ayrıntı: `tools/legacy/secrets.sh`.
- [ ] **Kullanıcı:** Aynı sayfaya gece yedeği için `BACKUP_URL`, `BACKUP_TOKEN` ve `BACKUP_PASSPHRASE` eklenir. Gece yedeği şu ana kadar hiç çalışmadı.
- [x] Panelden tam yedek alınır, Ayarlar'dan ayna açılır, ilk senkron elle çalıştırılır (onayla). *3 Ekim 12:45: kullanıcı yedek aldı ve aynayı açtı, ilk senkron onayla uygulandı.*
  - Yeni gelenler: 5 tedarikçi, 4 şoför, 5 araç, 25 sevkiyat.
  - Pratikortam'daki hâline getirilenler: 155 müşteri, 140 tedarikçi, 134 şoför, 133 araç, 211 sevkiyat.
  - 150 gider yenisiyle değiştirildi, eski aktarımdan kalan 25 tedarikçi ödemesi kaldırıldı.
  - Hemen ardından yapılan deneme senkronunda her türde "aynı" çıktı.
- [ ] Kontrol: 10 öz araç / 127 taşeron aracı olmalı. 5 rastgele carinin bakiyesi pratikortam ile aynı olmalı. *(Panelde göz kontrolü kullanıcıda. Veritabanı dışarıdan sorgulanamıyor.)*

### A1 — Tasarım seçimi (2-3 gün)
- [ ] 3 farklı tasarım hazırlanır, her biri aynı 3 ekranla: Sevkiyatlar listesi, Yeni Sevkiyat formu, Ana sayfa. Gerçek görünümle, paylaşılabilir bir sayfada sunulur.
- [ ] Her tasarımda belirlenenler: renkler, yazı tipi, boşluklar, tablo, düğme ve form görünümü.
- [x] **Kullanıcı** birini seçer ya da karıştırır ("şunun rengi, bunun tablosu"). **3 Ekim kararı: "Otoyol" tasarımı.** Önce "Ferah" (B) dedi, sonra "Otoyol daha iyi" diye değiştirdi. Ek istek: soldaki menü listeleri hep görünür olsun, açılıp kapanan gruplar olmasın.
- [ ] Seçilen tasarım tek yerde tanımlanır (tasarım sistemi), bütün ekranlar oradan beslenir.

### A2 — Tasarımı bütün panele uygulama + Türkçe (1-2 hafta)
*3 Ekim: "Otoyol" tasarımı bütün panele uygulandı. Ayrıntı ve kalan küçük işler: `TASARIM-OTOYOL.md` → Durum.*
- [x] **Ortak parçalar:** tablo, kart, düğme, pencere ve form alanları. Tablo orta yoğunlukta olur, başlığı kaydırınca sabit kalır.
- [x] **Menü ve üst çubuk:** sadeleşir, menüdeki açıklama yazıları kalkar.
- [x] **Ana sayfa:** yalnızca önemli rakamlar ve bugünün işleri kalır.
- [x] **Sevkiyatlar:** liste, filtreler ve kazanç şeridi yeniden düzenlenir.
- [x] **Cari ekranları** ile müşteri, tedarikçi ve araç kartları yeniden düzenlenir.
- [x] **Formlar kısalır:** zorunlu alanlar üstte, gerisi kapalı "Ayrıntılar" bölümünde. Ctrl+Enter ile kaydetme, yanlışlıkla kapanınca uyarı. *(3 Ekim: pencereler ilk alana odaklanır, Ctrl+Enter kaydeder, yazılmış form kapatılırken sorar; sefer formunda referans no, dorse, yük, yetkililer ve not "Ayrıntılar"da. Diğer formlarda isteğe bağlı bölümler zaten vardı.)*
- [ ] **Ekran yazıları tek tek okunur:**
  - [x] imla ve noktalama (taramada bozuk Türkçe harf bulunmadı; form hata mesajları Türkçeleşti);
  - [ ] aynı şeye tek ad: tablo hazır, `docs/TERIMLER.md`. **Kullanıcı onayı bekleniyor**, onaydan sonra bütün panelde uygulanır;
  - [x] tutarlar hep 2 kuruş basamağıyla.
- [x] Bekleyen küçük işler de burada biter:
  - sunucu uyanırken "Tekrar dene" ekranı;
  - ana sayfanın hızlı açılması;
  - fatura toplam satırının kayması.
  - Ayrıca klavye akışı: öneri düğmeleri Tab sırasından çıktı, aranabilir kutuda Tab vurgulananı seçer.
- [ ] Sonunda bütün ekranların yeni hâli ekran görüntüleriyle **toplu gösterilir**.

### A3 — Eksik listesi (2-3 gün, A2 ile paralel)
- [ ] Pratikortam salt okuma ile ekran ekran gezilir. Her ekran ve alan için bizde var mı, yok mu, eksik mi diye bir tablo çıkarılır (`PRATIKORTAM-HARITA.md`, veri içermez).
- [ ] **Kullanıcı** aklına gelenleri ekler ve önem sırasını seçer. A4–A6 bu sıraya göre yapılır.

### A4 — Raporlar ve çıktılar (1 hafta)
- [x] Sevkiyat listesi PDF ve İcmal: seçili tarih ve müşteri için, müşteriye gönderilebilir.
- [x] Kazanç/kâr raporu: ay, müşteri ve araç bazında; kâr tek formülle hesaplanır.
- [x] Cari ekstre: müşteri ve tedarikçi için, PDF ve Excel.
- [x] Her listede "Excel'e aktar" ve filtrenin tamamının toplamı (yalnızca sayfanın değil).
  - Yapıldı: Sevkiyatlar'da "Sevkiyat PDF" ve "İcmal" (filtredeki seferler), Raporlar → "Kazanç" sekmesi (ay/müşteri/araç/şoför), ekstrede Excel, bütün ana listelerde Excel, fatura/gider/tahsilat/ödeme/alınan fatura/çek-senet listelerinde filtre toplamı şeridi.
  - Yapıldı (3 Ekim): kâr KDV hariç. Komisyon, ek masraf ve giderlerin KDV'si düşülüyor. Kurallar: `KDV-KURALLARI.md`.

### A5 — Toplu işlemler (1 hafta)
- [x] Listelerde çoklu seçim ve alt işlem çubuğu (Sevkiyatlar, tedarikçi kartı → Seferler, Faturalar, Tahsilatlar; telefonda da).
- [x] Toplu işlemler: teslim evrakı onayı, durumu ilerletme, fatura kesme, tedarikçi ödemesi, Excel'e aktarma.
- [ ] Kullanıcıyla birlikte bakılır (toplu gösterim). 3 Ekim: ekran görüntülü gösterim sayfası paylaşıldı, kullanıcının bakması bekleniyor.

### A6 — Eksik ekran ve alanlar (A3'teki sıraya göre)
- [ ] Her grup ayrı bir adım olarak yapılır. Grup bitince toplu gösterilir.

### A7 — Fatura ve e-Fatura (1-2 hafta, entegratör bilgisine bağlı)
- [ ] **Kullanıcı:** kullanılan e-Fatura programının adı öğrenilir (kuzen ya da muhasebeci). Programın API/entegrasyon bilgisi istenir; şifreler sohbete yazılmaz.
- [ ] Panel o programa bağlanır. Fatura kesince e-Fatura/e-Arşiv panelden gider, durumu panelde izlenir.
- [ ] Önce test ortamında denenir. Fatura şablonu ve notları pratikortam'dakiyle karşılaştırılır.

### A8 — Geçişe hazırlık (1 hafta)
- [ ] **Tam geçmiş taşınır:** faturalar, tahsilatlar, tedarikçi ödemeleri, banka hareketleri. Bugün ayna yalnızca kayıtları ve bakiye rakamını getiriyor.
- [ ] Panel bakiyeleri kendi hesaplar. Her carinin bakiyesi pratikortam ile kişi kişi tutmalı.
- [ ] Kullanıcı yetkileri belirlenir: kim neyi görür, kim neyi siler.
- [ ] **Veritabanı:** ücretsiz veritabanı 28 Ekim'de silinir.
  - Ekim ortasında karar verilir: ya ücretli plana geçilir ya da yeni ücretsiz veritabanı açılıp ayna yeniden doldurulur.
  - Gerçek geçişten önce ücretli plan şart.
- [x] .NET 10'a yükseltme (.NET 8 desteği 10 Kasım'da bitiyordu). 2 Ekim'de yapıldı.
- [ ] Yedeklerin saklama süresi uzatılır.

### A9 — Geçiş günü (1 gün)
- [ ] Pratikortam'a kayıt girişi durur → son senkron yapılır → ayna kapatılır → panel kayıt girişine açılır.
- [ ] 5 rastgele cari pratikortam ile yan yana karşılaştırılır. Tam yedek alınır.
- [ ] Pratikortam salt okunur arşiv olarak kalır. Şifreler ortamlardan silinir.

## Satışa hazırlık
Panel başka firmalara satılacak ürün olarak da düşünülüyor. Rakipler, eksikler, fiyat ve aşamalar: `docs/SATIS-PLANI.md` (başında 4 Ekim durumu var: lisans, 2FA, kurulum otomasyonu, sihirbaz, UETDS hazırlığı, hukuk taslakları yapıldı).

## Kaldığımız yer (3 Ekim, kullanım limiti yüzünden ara)
1. `claude/wip-backup-test-fix` dalı: ara sıra düşen `BackupTests` için düzeltme var.
   - Sebep: geri yükleme testi sunucuyu kapatıyor, aynı sınıftaki sonraki test kapanmış sunucuya istek atıyor.
   - Çözüm: `Backup:RestartAfterRestore=false` ayarı.
   - Yedek testleri geçti. Tam `dotnet test` çalıştırılıp ana dala alınacak.
2. A2 başlar: "Otoyol" tasarımı önce ortak parçalara uygulanır (`index.css` renkleri, `ui.tsx`, `DataTable`, `Layout`). Sol menü grupları sabit açık. Sonra ekran ekran.
3. Bekleyen kullanıcı kararları aşağıda (terimler, secret'lar, eksik sıralaması). Komisyon KDV'si yapıldı; KDV kurallarını mali müşavire teyit ettirin (`KDV-KURALLARI.md`).

## Kullanıcıdan gerekenler (özet)
1. A0: GitHub secret'ları (4 + 3 yedek).
2. ~~A1: Tasarım seçimi.~~ Yapıldı: Otoyol, sol menü hep açık.
3. A2: Terim tablosu onayı (Sefer/Sevkiyat vb.).
4. A3: Eksik listesine ekleme ve sıralama.
5. A7: e-Fatura programının adı ve entegrasyon bilgisi.
6. A8: Veritabanı kararı (Ekim ortası).
7. Her aşama sonunda toplu bakış ve onay.
