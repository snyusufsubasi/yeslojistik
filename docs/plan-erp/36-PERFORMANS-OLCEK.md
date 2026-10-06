# 36 — Performans ve Ölçek

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır.
"Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır. Barındırma, ücret ve donanım gibi dış
bilgiler `**doğrulanacak:**` etiketiyle yazılır.

## 1. Amaç ve kapsam

Bu doküman, ERP modülleri eklendiğinde panelin **yavaşlamamasını** ve verinin **büyümesine rağmen
çalışmaya devam etmesini** sağlar. Bugün panel tek bir nakliye firması için, görece küçük veriyle ve
ücretsiz bir barındırma planında çalışıyor; muhasebe çekirdeği, stok hareketleri, yevmiye fişleri ve
çok şirketli yapı geldiğinde üç şey aynı anda değişir: satır sayısı, eşzamanlı kullanıcı ve rapor
sorgularının ağırlığı. Bu doküman hedefleri **sayıyla** koyar, bu hedeflere nasıl ulaşılacağını yazar ve
her hedefi ölçülebilir bir teste bağlar.

Kapsam içindekiler:

1. **Hedefler.** Liste açılışı, fatura kesme, rapor yanıtı ve eşzamanlı kullanıcı için süre hedefleri.
2. **İndeksler ve sorgu planı.** Hangi sorgu hangi indeksi kullanır; `EXPLAIN` ile doğrulama kuralı.
3. **N+1 önleme.** Liste uçlarında ilişkili kayıtların tek sorguda çekilmesi.
4. **Zorunlu sayfalama.** Sınırsız liste döndüren uç kalmaması.
5. **Toplamların ayrı uçtan gelmesi.** Mevcut `/expenses/totals` deseninin bütün modüllere yayılması.
6. **Kısa ömürlü, şirket bazlı önbellek.** Ne önbelleğe girer, ne girmez, ne zaman düşer.
7. **Ağır işlerin arka plana taşınması.** Rapor, e-belge durumu, toplu içe aktarma, imha işleri.
8. **Dosya/depolama büyümesi.** Fotoğraf, imza, PDF ve e-belge XML'lerinin yer kaplaması.
9. **Kapanan yılların arşivlenmesi.** Canlı tabloyu küçük tutma stratejisi.
10. **Yedekleme/geri yükleme hedefi (RPO/RTO).**
11. **İzleme ve uyarılar.** Sağlık ucu, yavaş sorgu günlüğü, kuyruk gecikmesi, disk/DB büyümesi.
12. **Yük testi senaryoları ve büyüme tahmini.** Kayıt/yıl, maliyet ölçeği.

Kapsam dışı: güvenlik sıkılaştırması (`38-GUVENLIK.md`), denetim izinin içeriği
(`35-DENETIM-IZI-KVKK-UYUM.md`), ekran tasarımı kararları (`04-HEDEF-MIMARI.md`), test işlerinin CI
düzeni (`37-TEST-CI-GENISLETME.md`). Bu doküman onlara **ölçü ve sınır** verir.

**Bugünkü barındırma kısıtı (planı doğrudan etkiler).** Render'ın **ücretsiz PostgreSQL'i 28 Ekim'de
silinir** (`AGENTS.md:112`); Ekim ortasında ücretli plana geçilmeli ya da yeni bir veritabanı açılıp ayna
yeniden doldurulmalıdır. Bu karar verilmeden kapasite planı yapılamaz: ücretsiz planda bağlantı sayısı,
CPU payı ve disk sınırı bilinmediği için ölçek hedefleri **doğrulanacak:** ücretli plan seçenekleri ve
kaynak sınırları — kaynak: Render fiyat/kaynak sayfası ve kullanıcı kararı. Aynı kısıt
`docs/plan/34-RISK-GUVENLIK.md:22-23` ve `:72` içinde R7 riski olarak kayıtlıdır.

## 2. Luca'daki karşılığı

Luca envanterinde performansla doğrudan ilgili okunabilen maddeler şunlardır: **otomatik firma
kurulumu** ve **Excel ile veri aktarımı** (`docs/plan-erp/02-LUCA-ENVANTERI.md:27-29`) — büyük veri
girişinin toplu ve arka planda yapılması; **BA-BS mutabakatı** ve **fatura bilgilendirme e-postası**
(`:31-32`) — ağır işlerin kullanıcıyı bekletmeden yürümesi; **banka ekstrelerinin entegrasyonu**
(`:42`) — dış veri akışının kendi hızında gelmesi; **bağımsız rapor tasarlama** (`:38`) — rapor
motorunun ayrı bir katman olması; **Luca Koza Rest API ile senkron** (`:53`) — dış çağrıların
kaynakları tüketmemesi.

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'nın büyük veri (milyon satır) ile ölçülmüş liste/rapor süreleri ve
"kilitlenme/yeniden bağlanma" davranışı — kaynak: Luca teknik dokümanı veya demo. **doğrulanacak:**
Luca'da arka plan işleri (kuyruk) ve rapor önbelleği var mı — kaynak: Luca kılavuzu. **doğrulanacak:**
Luca'nın çok şirketli kurulumda veri hacmi sınırı ve önerdiği donanım — kaynak: Luca satış/teknik ekibi.

## 3. Bizde bugün

**Olanlar (kanıtlı) — bugünkü performans tabanı.**

- **Zorunlu sayfalama altyapısı var.** `server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:23-31`
  (`PageAsync`) sayfa boyutunu `Math.Clamp` ile sınırlar; üst sınır `MaxPageSize = 500` (`:9`),
  dışa aktarma sınırı `ExportLimit = 20_000` (`:11`). `ApplySort` kararlı sıralama için `Id` ile ikincil
  sıralama ekler (`:19-20`) — sayfa kaymasını önler.
- **Liste uçları bu deseni kullanıyor.** Örnek: `server/YesLojistik.Api/Controllers/ExpensesController.cs:57`,
  `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:29` (dışa aktarmada `ExportLimit`),
  `.../TripService.cs:145-151`, `.../PurchaseInvoiceService.cs:21`, `.../JobRequestService.cs:30`.
- **Toplamlar ayrı uçtan geliyor (mevcut desen).**
  `server/YesLojistik.Api/Controllers/ExpensesController.cs:78-86` filtrenin **tamamının** toplamını
  ayrı bir uçta döner; `q with { Sort = null }` ile gereksiz sıralamayı kaldırır (`:81`).
  Fatura tarafında aynı desen `InvoicesController.cs:20` ve `InvoiceService.cs:38-46`.
  Panelde toplamlar `client/src/pages/ExpensesPage.tsx:95` ile ayrı sorgu olarak çekilir ve
  `:121-124` şeritte gösterilir. Yani "liste = sayfa, toplam = ayrı uç" kuralı bugün **vardır**.
- **İndeksler tanımlı.** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:77-78` denetim
  tablosunda `At` ve `(EntityType, EntityId)`; `:192-193` sevkiyatta yükleme tarihi ve durum; `:248-249`
  faturada tarih ve durum; `:293-295` konumda `(VehicleId, RecordedAt)`, `(TripId, RecordedAt)` ve
  `RecordedAt`; `:306-309` e-faturada ETTN ve numara (tekil, koşullu); `:66`, `:120`, `:163` tekil
  indeksler `is_deleted = false` süzgeciyle; `:325`, `:379-380`, `:405`, `:418`, `:427-428`, `:436`
  modül indeksleri. Yani indeks kültürü bugün vardır; yeni modüllerde **kural** hâline getirilir.
- **N+1'e karşı projeksiyon kullanımı.** Uçlar varlık yerine DTO projeksiyonu seçer; örnek
  `ExpensesController.cs:26-33` (`Projection`) ve `server/YesLojistik.Infrastructure/Services/Projections.cs`.
  Bu, ilişkili kaydın (araç plakası, şoför adı, tedarikçi ünvanı) tek sorguda gelmesini sağlar.
- **Ağır işler arka planda (kısmen).** `server/YesLojistik.Api/Program.cs:38-40` üç barındırılan
  servis kaydeder: `LocationRetentionService` (konum/imha, günde bir), `DailyDigestWorker` (günlük
  özet), `EInvoiceStatusWorker` (e-belge durum yoklaması).
- **Sağlık ucu var.** `Program.cs:181-184` `/api/health` veritabanı bağlantısını, sürümü, commit'i,
  bakım ve yönlendirme durumunu döner; ulaşılamazsa 503.
- **İstek günlüğü var.** `Program.cs:163` `UseSerilogRequestLogging()` her isteğin süresini loglar;
  konfigürasyon `Program.cs:25` ile okunur. Ancak **yavaş sorgu eşiği** ve **uyarı** tanımlı değildir.
- **Statik dosya önbelleği var.** `server/YesLojistik.Api/Infrastructure/HostingSupport.cs:78-83`
  panel derlemesini `wwwroot`'tan sunar; `/assets` yolu bir yıl `immutable`, diğer yollar `no-cache`.
- **Dosyalar veritabanında saklanıyor.** Varsayılan depolama `Database`
  (`.env.example:27`); `server/YesLojistik.Infrastructure/Services/DatabaseFileStorage.cs:11-29`
  içeriği `StoredFile.Content` (bayt dizisi) olarak yazar. Amaç, tek `pg_dump` ile her şeyin yedeğe
  girmesidir (`server/YesLojistik.Core/Entities/StoredFile.cs:3`). Bu, yedeklemeyi basitleştirir ama
  **veritabanını ve yedeği büyütür**.
- **Dosya boyutu sınırı var.** `server/YesLojistik.Infrastructure/Services/AttachmentService.cs:12`
  ek başına 10 MB; tür içerikten doğrulanır (`:64-72`).
- **Yedek döngüsü tanımlı.** `.github/workflows/backup.yml:8` gece 03:30'da çalışır; `:83-93` yedeği
  GPG ile şifreleyip yükler, saklama süresi tam yedekte 20, dosyasız yedekte 30 gündür (`:93`);
  `:96-106` eski tam yedeklerden yalnız en yeni ikisini bırakır. `:72-82` her yedeği geçici bir
  PostgreSQL'e geri yükleyip sağlamlığını sınar.
- **Canlı kontrol var.** `.github/workflows/smoke.yml:18-28` yeni sürümün yayına çıkmasını bekler
  (30 dakikaya kadar), `:30-37` panelin açıldığını ve girişsiz isteğin 401 döndüğünü doğrular.

**Eksikler (kanıtlı).**

1. **Ölçülmüş hedef yoktur.** Hiçbir listede "şu ekran şu sürede açılmalı" yazılı değildir; performans
   bugün yalnızca CI süresiyle (`docs/plan/31-TEST-CI.md:42`: ≈9-11 dakika) ve canlı kontrolle dolaylı
   izlenir.
2. **Yavaş sorgu günlüğü yoktur.** `Program.cs:163` yalnız istek süresini loglar; hangi SQL'in yavaş
   olduğu ve hangi planı seçtiği görünmez.
3. **`EXPLAIN` doğrulaması yoktur.** İndeksler tanımlı ama kullanıldığını kanıtlayan bir kontrol yoktur.
4. **Önbellek katmanı yoktur.** Her istek veritabanına gider; ayarlar, marka bilgisi ve rapor
   başlıkları bile her seferinde okunur (`server/YesLojistik.Infrastructure/Services/TrackingService.cs:111`
   her genel takip isteğinde `CompanySettings` okur).
5. **Ağır raporlar istek içinde çalışır.** `server/YesLojistik.Api/Controllers/ReportsController.cs:36-230`
   on üç rapor ucunun tamamı istek süresi içinde hesaplanır; yaşlandırma (`:155-156`) ve borç listesi
   (`:171-172`) en ağır olanlardır.
6. **Gösterge paneli çok sayıda bağımsız sorgu yapar.**
   `server/YesLojistik.Infrastructure/Services/DashboardService.cs:17-24` yedi ayrı `CountAsync`/`SumAsync`,
   `:46-82` ek toplamalar çalıştırır. Küçük veride sorun değildir; yüz binlerce satırda gecikme üretir.
7. **Muhasebe çekirdeği için sıcak yol yoktur.** Yevmiye, mizan ve e-Defter sorguları daha yazılmadı;
   planlanan hâlleriyle satır sayısı en büyük tablolar olacaktır (`06-MUHASEBE-MOTORU.md`).
8. **Arşiv stratejisi yoktur.** Kapanan yıl verisi canlı tabloda kalır; hiçbir tablo bölümlenmez veya
   arşive taşınmaz.
9. **Toplam boyut izlenmez.** `StoredFile.Size` alanı vardır (`StoredFile.cs:9`) ama büyüme
   raporlanmaz; kaç GB'a ulaşıldığı ekranda görünmez.
10. **RPO/RTO hedefi yazılı değildir.** Yedek günde bir kez alınır (`backup.yml:8`), yani bugünkü
    **RPO ≈ 24 saat**; geri yükleme süresi hiç ölçülmemiştir (hedef yoktur).
11. **Yük testi yoktur.** Eşzamanlı kullanıcı davranışı hiç ölçülmemiştir; CI'da performans işi yoktur.
12. **Kapasite tahmini yoktur.** Kayıt/yıl tahmini ve maliyet ölçeği hiçbir yerde yazılı değildir.

## 4. Hedef ekranlar ve alanlar

**4.1. Sağlık ve Kapasite ekranı (yeni).** Alanlar: durum (yeşil/sarı/kırmızı), sürüm ve commit
(`Program.cs:181-184` ile aynı kaynak), veritabanı bağlantısı, aktif kullanıcı sayısı, son 24 saatte
istek sayısı, ortalama/95. yüzdelik yanıt süresi, en yavaş 10 uç, veritabanı boyutu, dosya deposu
boyutu, yedek son çalışma zamanı ve sonucu, kuyrukta bekleyen iş sayısı, arşivlenen kayıt sayısı.

**4.2. Yavaş Sorgu ekranı (yeni).** Satır alanları: zaman, uç noktası, süre (ms), SQL özeti (maskeli,
parametresiz), kullanılan indeksler, okunan satır, dönen satır, öneri ("indeks eksik: `invoices
(status, date)`" gibi). Eşik ayarlanabilir (varsayılan 500 ms).

**4.3. İş Kuyruğu ekranı (yeni).** Satır alanları: iş türü (rapor, e-belge durumu, toplu içe aktarma,
imha, arşiv), durum (bekliyor/çalışıyor/bitti/hata), başlangıç/bitiş, süre, deneme sayısı, çıktı
bağlantısı, hata mesajı. Kullanıcı "raporu arka planda hazırla" der ve iş bitince bildirim alır.

**4.4. Arşiv ekranı (yeni).** Yıl seçimi, arşivlenen tablolar ve satır sayıları, arşiv özeti (özet
tutarlar korunur), geri getirme talebi ve durumu, arşiv doğrulama sonucu (canlı + arşiv satır sayısı
toplamı = beklenen).

**4.5. Depolama ekranı (yeni).** Tür başına dosya sayısı ve toplam boyut (teslim fotoğrafı, imza,
masraf fişi, e-belge XML, PDF), en büyük 20 dosya, büyüme eğrisi (aylık), sıkıştırma önerisi, saklama
süresi dolan dosyalar için imha işi bağlantısı.

**4.6. Liste ekranları (ortak kural, yeni ekran değil).** Her liste ekranının altında sayfa boyutu
seçimi (25/50/100/200, üst sınır 500 — `QueryExtensions.cs:9`) ve toplam şeridi bulunur; şerit her
zaman **ayrı uçtan** gelen toplamı gösterir (`ExpensesController.cs:78-86` deseni).

## 5. İş kuralları

**5.1. Hedefler (ölçülebilir).** Aşağıdaki süreler hedeftir; ölçüm, CI'da koşan performans testi ve
canlı yavaş sorgu günlüğüyle yapılır. "Veri hacmi" sütunu, hedefin geçerli olduğu en büyük veri
büyüklüğüdür.

| İş | Hedef (95. yüzdelik) | Veri hacmi | Ölçüm yeri |
|---|---|---|---|
| Liste açılışı (ilk sayfa, 50 satır) | ≤ 800 ms | 500.000 sevkiyat | Yük testi + canlı |
| Liste süzgeç/arama (yazarken) | ≤ 400 ms | 500.000 sevkiyat | Yük testi |
| Toplam şeridi (ayrı uç) | ≤ 1.200 ms | 2.000.000 gider satırı | Yük testi |
| Fatura kesme (kaydet + numara + PDF hazırlık) | ≤ 1.500 ms | 200.000 fatura | Yük testi |
| Fatura kesme (e-belge kuyruğa alma dâhil) | ≤ 3.000 ms | 200.000 fatura | Yük testi |
| Standart rapor yanıtı (aylık, sevkiyat, yakıt) | ≤ 2.500 ms | 500.000 sevkiyat | Yük testi |
| Ağır rapor (yaşlandırma, borç listesi, mizan) | ≤ 4.000 ms **veya** arka plana devret | 1.000.000 satır | Yük testi |
| Gösterge paneli | ≤ 1.500 ms | 500.000 sevkiyat | Yük testi |
| Genel takip sayfası (herkese açık) | ≤ 600 ms | 5.000 eşzamanlı takip | Yük testi |
| Eşzamanlı ofis kullanıcısı | 50 eşzamanlı, hata oranı ≤ %0,5 | — | Yük testi |
| Eşzamanlı şoför konum yüklemesi | 200 şoför, dakikada 2 istek | — | Yük testi |

**5.2. İndeks kuralı.** Her yeni tablo için: (a) birincil anahtar; (b) `CompanyId` sütunu ve
`(CompanyId, ...)` bileşik indeks; (c) liste ekranının varsayılan sıralamasında kullanılan sütun;
(d) süzgeçte kullanılan her sütun; (e) tekil iş kuralı olan alanlarda koşullu tekil indeks
(`AppDbContext.cs:66`, `:120`, `:163`, `:306-309` deseni). Her indeks için en az bir `EXPLAIN ANALYZE`
kanıtı dokümana eklenir: kanıt, "Index Scan" kullandığını ve okunan satır sayısını gösterir. Tam
tablo taraması (`Seq Scan`) görülen sorgu için indeks eklenir veya sorgu yeniden yazılır.

**5.3. N+1 önleme.** Liste uçları varlık değil **DTO projeksiyonu** döner (`ExpensesController.cs:26-33`
deseni). Döngü içinde veritabanı çağrısı yasaktır; ilişkili veri `Select` içinde çekilir. Kural,
CI'da çalışan bir sayaç testiyle korunur: liste ucu başına çalışan SQL sayısı, sayfa boyutundan
bağımsız olarak **sabit** olmalıdır (örn. en fazla 3).

**5.4. Zorunlu sayfalama.** Hiçbir liste ucu sınırsız sonuç döndürmez. Sayfa boyutu üst sınırı 500'dür
(`QueryExtensions.cs:9`); her liste yanıtı `PagedResult<T>` ile toplam sayıyı döner. Dışa aktarma
ayrı uçtur ve `ExportLimit = 20_000` satırla sınırlıdır (`:11`); bu sınır aşılırsa kullanıcıya
"tarih aralığını daraltın veya arka plan raporu isteyin" denir.

**5.5. Toplamların ayrı uçtan gelmesi.** Kural: liste ucu **sayfayı**, `.../totals` ucu **filtrenin
tamamını** döner. Toplam ucu sıralama uygulamaz (`ExpensesController.cs:81`). Panel toplamı liste
sorgusundan bağımsız, kendi önbellek süresiyle çeker. Bu kural bütün yeni modüllere uygulanır: stok
hareketi, yevmiye, çek portföyü, personel, sabit kıymet.

**5.6. Kısa ömürlü, şirket bazlı önbellek.** Önbellek anahtarı **her zaman** `CompanyId` ile başlar;
çok şirketli yapıda şirketler arası sızıntı olmaz.

| Veri | Süre | Düşme koşulu |
|---|---|---|
| Marka bilgisi (`/api/public/branding`, `CompanySettings`) | 5 dk | Ayar kaydı |
| Hesap planı, KDV/tevkifat oranları, seri tanımları | 10 dk | Tanım değişikliği |
| Rapor başlıkları ve sütun tanımları | 30 dk | Şablon değişikliği |
| Gösterge paneli özetleri | 60 sn | Sevkiyat/fatura/tahsilat yazımı |
| Kullanıcı yetkileri (rol matrisi) | 5 dk | Kullanıcı/rol değişikliği |
| Kamu kurumu kod listeleri (döviz kuru, vergi dairesi) | 6 saat | Zaman aşımı |

Önbelleğe **girmez**: kişisel veri listeleri, cari bakiyeler, kasa bakiyeleri, mizan, denetim izi,
dosya içeriği. Önbellek süreyle sınırlıdır ve yazma işleminde açıkça düşürülür; "süresiz" önbellek
yasaktır. Bugün uygulama içi önbellek yoktur; ilk sürümde dağıtık önbellek (Redis) **gerekmez** —
barındırma kısıtı nedeniyle süreç içi bellek önbelleğiyle başlanır ve çok örnekli (yatay ölçekli)
kuruluma geçildiğinde ayrı katman değerlendirilir (**doğrulanacak:** ücretli planın örnek sayısı —
kaynak: Render planı).

**5.7. Ağır işlerin arka plana taşınması.** İstek içinde **yapılmayacak** işler: 20.000 satırdan büyük
dışa aktarma, üç aydan uzun dönem raporu, yaşlandırma/borç listesi/mizan gibi çok tablo birleştiren
raporlar, toplu içe aktarma (Excel/CSV), e-belge durum taraması, veri imhası, arşivleme, yedek
doğrulama. Bu işler kuyruğa yazılır; kullanıcı "hazırlanıyor" durumunu görür ve iş bitince bildirim
alır. Bugünkü üç barındırılan servis (`Program.cs:38-40`) bu yapının ilk hâlidir; kuyruk kalıcı ve
durumu sorgulanabilir olur (`JobRun` tablosu). Eşzamanlılık sınırı: kaynak tüketen işlerden aynı anda
en fazla 2 tanesi; ağır raporlardan en fazla 1 tanesi.

**5.8. Dosya/depolama büyümesi.** Bugün dosyalar `bytea` olarak veritabanında
(`DatabaseFileStorage.cs:11-29`); ek başına sınır 10 MB (`AttachmentService.cs:12`). Kurallar:
(a) yüklenen görseller sunucuda **küçültülür** (teslim fotoğrafı en uzun kenar 1600 px, JPEG kalite
80); (b) aynı dosyanın özeti (SHA-256) tutulur, tekrar yükleme saklanmaz; (c) e-belge XML'i
sıkıştırılır; (d) 25 MB'ı aşan dosyalar veritabanı yerine nesne depolamaya gider (depolama sağlayıcısı
soyutlaması bugün vardır: `STORAGE_PROVIDER` — `.env.example:27`); (e) depolama ekranı aylık büyümeyi
gösterir; (f) 12 ay içinde 10 GB'ı aşma eğilimi varsa nesne depolamaya geçiş planı devreye girer.

**5.9. Kapanan yılların arşivlenmesi.** Mali yıl kapandığında (dönem kilidi: `07`) o yılın defter
hareketleri ayrı bir arşiv tablosuna taşınır; canlı tablolar son 2 mali yılı tutar. Arşiv tablosu
özet bakiyeleri korur; ekranlar "arşiv dâhil" süzgeciyle çalışır. Arşivleme işi yılda bir kez, gece,
kuyrukta koşar; iş sonunda satır sayısı doğrulaması yapılır ve imha/arşiv kaydı yazılır. Bölümleme
(partitioning) ilk sürümde **gerekmez**; muhasebe tabloları 5 milyon satırı geçerse PostgreSQL
bölümlemesi değerlendirilir (**doğrulanacak:** barındırma planının bölümleme ve bakım penceresi
kısıtları — kaynak: sağlayıcı).

**5.10. Yedekleme/geri yükleme hedefi (RPO/RTO).**

| Ölçü | Bugün | Hedef |
|---|---|---|
| RPO (kabul edilebilir veri kaybı) | ≈ 24 saat (`backup.yml:8`) | ≤ 6 saat (ek gündüz yedeği) — **doğrulanacak:** maliyet |
| RTO (geri dönüş süresi) | ölçülmedi | ≤ 2 saat (tam yedekten) |
| Yedek doğrulama | her koşuda (`backup.yml:72-82`) | korunur + aylık geri yükleme tatbikatı |
| Yedek saklama | tam 20 gün / dosyasız 30 gün (`backup.yml:93`) | politika tablosuna bağlanır (`35`) |
| Yedek şifreleme | AES256 + parola (`.github/workflows/backup.yml:83-86`) | korunur; anahtar yönetimi `38` |

**Not:** Yedek saklama süresi ve yedekteki kişisel verinin ne zaman yok olacağı bir **saklama
politikası** kararıdır; süreler `35-DENETIM-IZI-KVKK-UYUM.md` politikasına bağlanır ve bu süreler için
**hukuk danışmanı onayı gerekir**. Kısaltma yönündeki her değişiklik ikinci onaya tabidir.

**5.11. İzleme ve uyarılar.** Uyarı eşikleri: (1) `/api/health` 503 dönerse → anında; (2) yanıt
süresi 95. yüzdelik 3 saniyeyi 5 dakika boyunca aşarsa; (3) yavaş sorgu eşiği (500 ms) dakikada 10'dan
fazla aşılırsa; (4) kuyruk gecikmesi 15 dakikayı aşarsa; (5) veritabanı disk kullanımı %80'i aşarsa;
(6) son yedek 30 saatten eskiyse; (7) art arda 20 başarısız giriş. Uyarı kanalı: e-posta
(`IEmailSender` altyapısı) + panel bildirimi. Bugün yalnızca sağlık ucu ve istek günlüğü vardır
(`Program.cs:163`, `:181-184`).

**5.12. Büyüme tahmini (kayıt/yıl).** Aşağıdaki tahminler tek firma içindir ve **doğrulanacak:**
gerçek iş hacmi — kaynak: kullanıcı/kullanım istatistiği.

| Tablo | Bugün (tahmin) | Yıllık artış | 5 yıl sonra |
|---|---|---|---|
| Sevkiyat (`Trips`) | ~10.000 | 15.000 | ~85.000 |
| Gider (`Expenses`) | ~20.000 | 30.000 | ~170.000 |
| Fatura + satır (`Invoices`, `InvoiceLines`) | ~5.000 | 8.000 (×3 satır) | ~130.000 |
| Kasa/banka hareketi | ~30.000 | 50.000 | ~280.000 |
| Konum kaydı (`VehicleLocations`) | ~2.000.000 (90 gün) | 90 gün döngü, sabit | sabit (imha) |
| Denetim izi (`AuditLogs`) | ~100.000 | 400.000 | ~2.100.000 |
| Yevmiye fişi + satır (planlanan) | 0 | 120.000 (×4 satır) | ~2.400.000 |
| Stok hareketi (planlanan) | 0 | 40.000 | ~200.000 |
| Dosya (`StoredFiles`) | ~5 GB | 4–8 GB | ~40 GB |

Bu tabloya göre **ilk darboğaz denetim izidir** (2 milyon satır/yıl) ve ikincisi yevmiye satırlarıdır.
Bu yüzden `35` dokümanında denetim izi için arşiv + indeks, burada ise arşivleme işi zorunludur.

**5.13. Maliyet ölçeği.** Maliyet kalemleri: veritabanı planı, uygulama örneği (CPU/RAM), disk,
nesne depolama, yedek saklama (GitHub Actions artefaktı — `.github/workflows/backup.yml:96-106` ücretsiz
planda 500 MB sınırına dikkat eder), e-posta gönderimi, e-belge entegratörü (kontör), yedek dışa
kopyalama (`RCLONE_REMOTE` — `.env.example:42-43`). Kural: her ölçek adımı (kayıt sayısı iki katına
çıktığında) tahmini aylık maliyet artışıyla birlikte yazılır. Fiyatlar **doğrulanacak:** sağlayıcı
fiyat sayfaları; bu dokümanda tutar yazılmaz.

## 6. Veri modeli

**Ekleme (mevcut tabloya sütun).** `StoredFile` tablosuna `Sha256` (metin(64), null) ve `Kind`
(metin(20), null) eklenir — tekrar eden dosyayı tanımak ve tür bazında raporlamak için. Migration
kuralı: yalnız ekleme, boş olabilen sütun (`AGENTS.md:29`).

**Yeni tablolar** (hepsi `CompanyId` taşır; `docs/plan-erp/05-VERI-MODELI.md:39-40`):

1. `JobRun` — `Id`, `CompanyId`, `Kind` (Report/Import/EInvoice/Retention/Archive/Backup),
   `Status` (Queued/Running/Done/Failed), `RequestedBy`, `StartedAt`, `FinishedAt`, `Attempt`,
   `Progress`, `OutputPath`, `ErrorText`, `Payload` (küçük JSON).
2. `RequestMetric` — `Id`, `CompanyId`, `At`, `Path`, `Method`, `Status`, `DurationMs`, `QueryCount`,
   `UserId`, `Source` (Web/Mobil/İş).
3. `SlowQuery` — `Id`, `CompanyId`, `At`, `Path`, `DurationMs`, `SqlHash`, `SqlText` (maskeli),
   `RowsRead`, `RowsReturned`, `PlanHint`, `Suggestion`.
4. `ArchiveRun` — `Id`, `CompanyId`, `FiscalYear`, `Tables`, `RowsMoved`, `VerifiedAt`, `VerifiedBy`,
   `Status`, `Note`.
5. `ArchiveBalance` — `Id`, `CompanyId`, `FiscalYear`, `AccountCode`, `Opening`, `Debit`, `Credit`,
   `Closing` (arşivlenen yılın özeti; mizan arşivden okunur).
6. `StorageUsage` — `Id`, `CompanyId`, `Period` (ay), `Kind`, `FileCount`, `TotalBytes`.
7. `CapacityForecast` — `Id`, `CompanyId`, `Period`, `TableName`, `RowCount`, `GrowthPerMonth`,
   `ProjectedRows`, `Note`.

**İlişkiler.** `JobRun` ← `ArchiveRun` (arşiv işi bir kuyruk işidir); `RequestMetric` → `SlowQuery`
(yavaş istek ayrıntısı); `StorageUsage` → `StoredFile` (tür bazında toplam). `RequestMetric` ve
`SlowQuery` yüksek hacimlidir: 30 günden eski satırlar otomatik silinir (politika: `35`), tablo
`At` sütununda indekslidir.

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET | `/api/health` | Mevcut sağlık ucu (genişletilir: DB süresi, kuyruk, yedek) | Anonim |
| GET | `/api/ops/overview` | Sağlık ve kapasite özeti | Admin |
| GET | `/api/ops/slow-queries` | Yavaş sorgu listesi (süzgeç: aralık, eşik, uç) | Admin |
| GET | `/api/ops/requests` | İstek metrikleri (ortalama, 95. yüzdelik, en yavaş uçlar) | Admin |
| GET | `/api/jobs` | Kuyruk listesi (süzgeç: tür, durum, tarih) | Admin, Muhasebe |
| POST | `/api/jobs` | İş kuyruğa al (rapor, içe aktarma, arşiv) | Modül yetkisi |
| GET | `/api/jobs/{id}` | İş durumu ve ilerleme | İşi isteyen, Admin |
| GET | `/api/jobs/{id}/output` | Üretilen dosya (rapor/Excel) | İşi isteyen, Admin |
| POST | `/api/jobs/{id}/cancel` | İşi iptal et | Admin |
| GET | `/api/archive/years` | Arşivlenmiş yıllar ve özet | Admin, Muhasebe |
| POST | `/api/archive/run` | Arşivleme işini başlat (onaylı) | Admin + onay |
| POST | `/api/archive/{year}/restore` | Arşivi canlıya geri getir (onaylı) | Admin + onay |
| GET | `/api/storage/usage` | Depolama kullanımı ve büyüme | Admin |
| GET | `/api/ops/forecast` | Kapasite tahmini | Admin |

Bütün liste uçları `PagedResult<T>` ve `PageAsync` sözleşmesini kullanır
(`QueryExtensions.cs:23-31`); toplam uçları ayrıdır (`.../totals` deseni).

## 8. Yetki, onay ve denetim izi

| İş | Yönetici | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Sağlık/kapasite ekranı | ✔ | — | — | — |
| Yavaş sorgu listesi | ✔ | — | — | — |
| Kuyruk işi başlatma | ✔ | rapor/dışa aktarma | rapor | — |
| Arşivleme başlatma | ✔ (ikinci onay) | görme | — | — |
| Arşivi geri getirme | ✔ (ikinci onay) | — | — | — |
| Depolama raporu | ✔ | görme | — | — |

- **Onay.** Arşivleme ve arşivi geri getirme geri dönüşü zor işlerdir: "hazırlayan ≠ onaylayan"
  kuralına bağlanır ve iş öncesi yedek zorunludur (`AGENTS.md:24`).
- **Denetim izi.** İş kuyruğa alma, iptal, arşivleme, geri getirme, önbellek temizleme ve uyarı eşiği
  değişikliği denetim iznine yazılır (`35`). Her iş `JobRun` ile `AuditLog` arasında `CorrelationId`
  ile bağlanır.
- **Önbellek temizleme** yönetici işlemidir ve kaydı tutulur; çok şirketli yapıda yalnız kendi
  şirketinin anahtarları temizlenir.
- **Yavaş sorgu metni maskeleme.** `SlowQuery.SqlText` kişisel veri içermez; parametreler
  maskelenir (`@p0`), TCKN/tutar/adres değerleri yazılmaz.

## 9. Kabul kriterleri

1. Yük testi bütün §5.1 hedeflerini karşılar; sonuçlar sayılarla rapora işlenir.
2. Hiçbir liste ucu sınırsız sonuç döndürmez; sayfa boyutu 500'ü aşamaz (`QueryExtensions.cs:9`).
3. Liste ucu başına SQL sayısı sayfa boyutundan bağımsız ve sabittir (N+1 testi yeşil).
4. Bütün liste ekranlarında toplam **ayrı uçtan** gelir; ekranda gösterilen liste ile toplam
   tutarlıdır (uygulama testi).
5. Yeni tabloların her biri için en az bir `EXPLAIN ANALYZE` kanıtı vardır; hiçbir varsayılan liste
   sorgusu tam tablo taraması yapmaz.
6. Önbellek anahtarı `CompanyId` ile başlar; A şirketinin önbelleğinden B şirketine veri sızamaz
   (otomatik test).
7. İstek süresi 3 saniyeyi aşan işler arka plana taşınmıştır; istek içinde 20.000 satırdan fazla
   dışa aktarma yapılmaz.
8. Kuyruk işleri kalıcıdır: sunucu yeniden başladığında "çalışıyor" durumundaki iş yeniden denenir ve
   hata kaydı görünür.
9. Arşivleme sonrası "canlı + arşiv" satır toplamı, iş öncesi toplamla eşittir; arşiv özeti mizanla
   uyumludur.
10. Depolama ekranı tür bazında aylık büyümeyi gösterir; 12 aylık projeksiyon görünür.
11. RPO ≤ 6 saat ve RTO ≤ 2 saat hedefleri ölçülmüş bir geri yükleme tatbikatıyla kanıtlanır
    (`backup.yml:72-82` genişletilir).
12. Uyarı eşiklerinin her biri için yapay bir test olayı üretilip uyarının gerçekten gittiği görülür.
13. `Canlı kontrol` işi `/api/health` yanıt süresini de ölçer ve 3 saniyeyi aşarsa uyarır
    (`.github/workflows/smoke.yml:22` genişletilir).

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `PaginationLimitTests.cs` — sayfa boyutu kırpma (1 ve 500 sınırları), negatif sayfa düzeltme.
- `CacheKeyTests.cs` — anahtar üretimi, şirket ayrımı, yazma sonrası düşürme.
- `RetryPolicyTests.cs` — kuyruk işi yeniden deneme, en fazla deneme, geri çekilme süresi.
- `ForecastMathTests.cs` — büyüme tahmini, projeksiyon, ay/yıl sınırları.

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`, gerçek PostgreSQL —
`server/YesLojistik.Tests/Integration/ApiFactory.cs:17-27`):

- `QueryCountTests.cs` — her liste ucu için sabit SQL sayısı (N+1 kilidi).
- `TotalsConsistencyTests.cs` — liste + toplam ucu tutarlılığı (mevcut `ExpensesController.cs:78-86`
  deseni genişletilir).
- `IndexUsageTests.cs` — kritik sorgularda `EXPLAIN` planı `Seq Scan` içermez.
- `JobQueueTests.cs` — kuyruğa alma, çalıştırma, hata, iptal, yeniden başlatma sonrası devam.
- `ArchiveTests.cs` — arşivleme, doğrulama (canlı + arşiv = beklenen), geri getirme.
- `StorageGrowthTests.cs` — aynı dosyanın iki kez yüklenmesi tek kayıt üretir (özet eşleşmesi).
- `BackupRestoreDrillTests.cs` — geri yükleme tatbikatı ve süre ölçümü (RTO kanıtı).

**Performans testi (CI işi, yeni).** `server/YesLojistik.Tests/Performance/` altında tohum verisi
üreten bir yük testi: 500.000 sevkiyat, 2.000.000 gider, 200.000 fatura, 2.000.000 denetim kaydı.
Ölçümler `dotnet test --filter Category=Performance` ile koşar ve sonuç JSON olarak artefakt yüklenir.
Eşik aşılırsa iş **başarısız** olur; iş gecelik (nightly) ve etiketli dalda çalışır. Ayrıntı ve CI
yerleşimi `37-TEST-CI-GENISLETME.md` içinde tanımlıdır.

**Tarayıcı testleri** (`client/e2e/`, Playwright — `client/playwright.config.ts:5-9`):

- `new-ui/ops.spec.ts` — Sağlık ve Kapasite ekranı açılır, anahtar ölçümler görünür.
- `new-ui/job-queue.spec.ts` — "Raporu arka planda hazırla" → durum "hazırlanıyor" → "bitti" → indirme.
- `new-ui/slow-query.spec.ts` — yavaş sorgu listesi süzgeci ve öneri metni.
- `new-ui/pagination.spec.ts` — sayfa boyutu seçimi, toplam şeridinin ayrı uçtan gelmesi, 500 üst sınırı.
- `new-ui/archive.spec.ts` — arşiv yılı listesi, onay isteği olmadan arşivleme başlatılamaması.

Mevcut testler silinmez, atlanmaz (`docs/plan/31-TEST-CI.md:79-80`); yerelde .NET 10 SDK ve PostgreSQL
bulunmadığı için sunucu ve e2e testleri **yalnız CI'da** koşar (`docs/plan/31-TEST-CI.md:43-45`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Metrik toplama (istek süresi, SQL sayısı, yavaş sorgu) | 4 |
| 7 yeni tablo + migration + indeksler | 3 |
| Sağlık/kapasite + yavaş sorgu ekranları | 4 |
| Önbellek katmanı (şirket bazlı, süreli, düşürmeli) | 4 |
| Kalıcı iş kuyruğu + çalıştırıcı + ekran | 6 |
| Ağır raporların kuyruğa taşınması (mizan, yaşlandırma, borç listesi) | 4 |
| Dosya küçültme, özet ile tekrar önleme, depolama ekranı | 4 |
| Arşivleme + geri getirme + arşiv mizanı | 6 |
| Yedek sıklığı, RPO/RTO tatbikatı, uyarı kurulumu | 3 |
| Yük testi altyapısı + senaryolar + CI işi | 5 |
| Kapasite tahmini ve maliyet ölçeği raporu | 2 |
| Testler (birim + entegrasyon + e2e) | 5 |
| **Toplam** | **≈50 kişi-gün** |

**Bağımlılıklar.** `05-VERI-MODELI.md` (tablo ve indeks adları) **önce**; `06-MUHASEBE-MOTORU.md`
(defter tablolarının hacmi) **önce**; `07` (dönem kilidi, onay) **önce** — arşivleme ona dayanır.
`35-DENETIM-IZI-KVKK-UYUM.md` ile eşzamanlı (denetim tablosunun hacmi ve arşivi). `37` buradaki
performans testinin CI'da koşmasını üstlenir. `30` çok şirketli yapı geldiğinde her önbellek anahtarı ve
her indeks `CompanyId` ile baştan gözden geçirilir.

## 12. Riskler ve doğrulanacaklar

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | Render ücretsiz DB 28 Ekim'de silinir; plan kararı gecikir | Yüksek | Çok yüksek | Karar Ekim ortasında; yedek + yeni DB senaryosu hazır (`AGENTS.md:112`) |
| R2 | Ücretsiz/ucuz planda CPU ve bağlantı sınırı performans hedeflerini boşa çıkarır | Yüksek | Yüksek | Hedefler plan seçildikten sonra doğrulanır; ölçüm plana göre raporlanır |
| R3 | Dosyalar veritabanında büyür, yedek ve geri yükleme şişer | Yüksek | Yüksek | Görsel küçültme, özet ile tekrar önleme, 25 MB üstü nesne depolama |
| R4 | Denetim izi 2 milyon satır/yıl ile en büyük tablo olur | Yüksek | Yüksek | İndeks + arşiv + politika tabanlı imha (`35`) |
| R5 | Önbellek şirketler arası veri sızdırır | Orta | Çok yüksek | Anahtar `CompanyId` ile başlar; otomatik sızıntı testi; önbelleğe kişisel veri konmaz |
| R6 | Arşivleme sırasında veri kaybı veya çift kayıt | Düşük | Çok yüksek | Onay + yedek + satır sayısı doğrulaması + geri getirme yolu |
| R7 | Arka plan işleri sessizce başarısız olur | Orta | Orta | Kuyruk ekranı, deneme sayacı, uyarı eşiği, `JobRun` kaydı |
| R8 | Yavaş sorgu günlüğü kişisel veri toplar | Orta | Yüksek | Parametre maskeleme, 30 gün saklama, ham SQL yazılmaması |
| R9 | Yedek saklama alanı (GitHub artefaktı) dolar | Orta | Orta | Eski tam yedekleri temizleme (`backup.yml:96-106`) + dışa kopyalama (`RCLONE_REMOTE`) |
| R10 | Performans testi yavaş CI'ı daha da yavaşlatır | Orta | Düşük | Gecelik ve etiketli koşu; hızlı işler varsayılan kalır |
| R11 | Yatay ölçek gerektiğinde süreç içi önbellek tutarsız olur | Düşük | Orta | Çok örnekli kuruluma geçişte ayrı önbellek katmanı değerlendirilir |

**doğrulanacak:** Render ücretli plan seçenekleri, kaynak sınırları (CPU, RAM, bağlantı, disk) ve
fiyatları — kaynak: Render fiyat sayfası + kullanıcı kararı. **doğrulanacak:** ücretli planda veritabanı
bölümleme, otomatik yedek sıklığı ve bakım penceresi — kaynak: sağlayıcı dokümanı. **doğrulanacak:**
gerçek iş hacmi (yıllık sevkiyat, gider, fatura sayısı) ve eşzamanlı kullanıcı sayısı — kaynak: kullanıcı
ve mevcut veri. **doğrulanacak:** gece yedeğinin yanına gündüz yedeği eklemenin maliyeti ve saklama
sınırı (`.env.example:41` `BACKUP_KEEP_DAYS=30`). **doğrulanacak:** GitHub Actions artefakt kotası ve
yedek boyutu sınırı. **doğrulanacak:** nesne depolama sağlayıcısı seçimi, aylık maliyeti ve veri
bölgesi (yurt dışı aktarım riski — `35`). **doğrulanacak:** Luca'nın ölçülmüş rapor/liste süreleri ve
arka plan işi davranışı — kaynak: Luca teknik dokümanı/demo. **doğrulanacak:** Postgres `pg_stat_
statements` uzantısının barındırma planında açık olup olmadığı — kaynak: sağlayıcı; kapalıysa yavaş
sorgu ölçümü uygulama tarafında toplanır.

Sonraki belgeyle bağlantı: `37-TEST-CI-GENISLETME.md` performans testinin ve ölçümlerin CI'da
koşmasını, `35-DENETIM-IZI-KVKK-UYUM.md` denetim izinin saklama ve arşiv kurallarını,
`38-GUVENLIK.md` yedek şifreleme ve izleme güvenliğini, `00-DIZIN.md` bütün setin durumunu tanımlar.
