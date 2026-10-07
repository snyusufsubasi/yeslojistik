# YES Lojistik — Yol Haritası (uçtan uca)

> **7 Ekim — yeni görünüm ve akıllı alanlar (canlıda):** Kullanıcı "Otoyol" görünümünü bıraktı; yerine **"Hark tarzı"** geldi (aydınlık, ferah, yuvarlak köşeli, tek vurgu rengi çivit mavisi, her yerde Inter; spec: `TASARIM-HARK.md`). Serbest yazılan alanlar **"akıllı alan"** oldu: en sık 5-6 seçenek tek dokunuşla çip, bütün seçenekler aranabilir listede (önce firmanın kendi kullandıkları, sonra sektörde yaygın olanlar), listede olmayan değer aynen kaydedilir. Ayrıca CI'daki kırmızı e2e (menü testi Mazotlar/Araç Masrafları eklenmesine uymuyordu) düzeltildi. Ayrıntı ve test kanıtı: `UYGULAMA-DURUMU.md` (7 Ekim bölümü).
> Sırada: sevkiyata "taşıma şekli" ve "iptal/sorun nedeni", araca "dorse/kasa tipi" alanları (ek sütun ister; sektör listeleri hazır).

> **5 Ekim — kullanıcı kararları ve uygulama:** YES'in tam geçişi ve satış hazırlığı birlikte planlandı. Önce hesap doğruluğu ve kullanım; Otoyol tasarımı korunacak (7 Ekim: yerini "Hark tarzı" aldı, `TASARIM-HARK.md`). YES'in müşterileri kendi kayıtlarını görüp taşıma/teklif talebi açabilecek. Ayrıntı: `TAM-GELISTIRME-PLANI.md`. İlk güvenlik paketi tamamlandı ve tüm CI kontrolleri geçti; kanıt ve kalan işler `UYGULAMA-DURUMU.md` içinde. Aşağıdaki eski “Kaldığımız yer” bölümü güncel görev sırası olarak kullanılmamalı.

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

## Kolaylaştırma (5 Ekim, öncelik)
Müşteri paneli pratikortam'a göre çok zor buldu. Plan: menü ve sekmeler pratikortam'daki ad ve sırayla, ekranlar daha sade ve şık; "Yeni görünüm" anahtarıyla aşama aşama. Ayrıntı: `docs/KOLAYLASTIRMA-PLANI.md`.

### Kolaylaştırmada bitenler (6 Ekim)
- **F1 (temel) bitti (5 Ekim):** görünüm anahtarı (`lib/uiMode.ts`, `main.tsx`, kullanıcı menüsündeki "Görünüm" seçimi), yeni menü (`lib/nav.ts` → `classicNav`/`newNav`), bölüm sekmeleri (`shell/SectionTabs`, `lib/sections.ts`), ortak parçalar (`shell/PageShell`, `shell/Menu` içinde `MoreMenu`/`RowMenu`, `shell/FilterPanel`); "Sefer" → "Sevkiyat" terim değişikliği görünen metinlerde tamam.
- **Görsel jeton katmanı (6 Ekim):** `client/src/index.css` → `html[data-ui="new"]`: daha açık zemin, tablo başlığında büyük harf yok, satır sıklığı 7px → 5px. Klasik görünüm etkilenmez.
- **Pratikortam benzerliği plan seti (6 Ekim):** `docs/plan/` altında 35 belge ve `tools/docs/referans-denetimi.ps1` (dosya:satır + mojibake denetimi, `00-DIZIN.md` tablosunu üretir).
- **Liste iskeleti (6 Ekim):** `TableSkeleton` + `shell/PageShell`; Müşteriler, Tedarikçiler, Şoförler, Personel ve Sabit Ödemeler listeleri geçti; menü ve süzgeç panelinde erişilebilirlik/z-sırası düzeltmeleri.
- **F3 "Faturalandırılacaklar" (6 Ekim):** `/faturalar?sekme=bekleyen` — teslim edilmiş, faturasız sevkiyatlar müşteriye göre gruplanır; "Fatura Kes" seçili sevkiyatları forma taşır. Sunucu değişikliği yok.
- **Detay çekmecesi (6 Ekim):** `shell/DetailDrawer`, Sevkiyatlar'da `?id=` ile açılır.
- **F4.2/F4.3 (6 Ekim):** `/mazotlar` (`FuelPage`) ve `/arac-masraflari` (`VehicleExpensesPage`); mazotta litre, km ve km başı maliyet.
- **F5 telefon (6 Ekim, yalnız yeni görünüm):** 640px altında kart görünümü (`shell/MobileCards`), beş yuvalı alt şerit, tam ekran süzgeç, 44px dokunma hedefleri.
- **F2 (6 Ekim):** Bugün ekranında "Onay Bekleyenler" sekmesi (`/?tab=approvals`, yalnız muhasebe); sevkiyat formu tek sayfa iki sütun.
- **Testler:** `client/e2e/new-ui/` altında 8 spec (bugün 5 yeni: `faturalandirilacaklar`, `mobile-cards`, `today-approvals`, `trip-form`, `trip-form-mobile`); toplam 58 `test(...)`. Bu makinede e2e koşulamıyor (yerelde .NET 10 SDK ve PostgreSQL yok), koşu CI'da.

### Kolaylaştırmada sıradakiler (6 Ekim)
- `nav.ts` menüsüne **Mazotlar** ve **Araç Masrafları** girdisi (klasik görünümde menüden erişim yok, yalnız adres; yeni görünümde "Öz Mal" sekmeleri).
- Mazot şeridinde toplam litre/toplam km için `ExpenseTotalsDto` genişletilmeli (`server/YesLojistik.Core/Dtos/FinanceDtos.cs`). Sunucu işi.
- Gider formunda kilitli kategori, mazot listesinde satır düzenleme.
- Detay sayfaları, Yönetici, Analiz, Çekler, Ödemeler ve Alınan Faturalar'da mobil kart görünümü.
- F4.4 (Araçlar), F4.5 (Analiz "Genel Bakış"), F4.6 (Yönetici/Profilim) ve F6 (`DEFAULT_UI_MODE = 'new'` yapılacak — **müşteri onayı bekliyor**).

## Ekim 2026 geliştirme planı (7 Ekim)
Rakip panelleri ve sektör UX'i ile hazırlanmış kapsamlı plan: `docs/GELISTIRME-PLANI-2026-EKIM.md`. Önce bölüm 14'teki kararlar, sonra Faz 0.

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
