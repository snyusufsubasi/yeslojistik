# 41 — Riskler ve Varsayımlar

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır. Konusu
**dürüstlüktür**: bu planın neresi sağlam, neresi tahmin, neresi bilinmiyor ve **yanlış çıkarsa ne
olur**. Hiçbir risk "düşük olasılık" diye yazılmaz; olasılık ve etki **gerekçesiyle** yazılır.

## 1. Amaç ve kapsam

**Bu doküman neyi çözer?**

1. Bütün plan setindeki riskleri **tek kayıtta** toplar (her modül dokümanının §12'si kendi riskini
   yazar; burada hepsi bir arada ve **sahipli** durur).
2. Her riski **tetikleyicisiyle** yazar: "bu risk gerçekleşiyor" nasıl anlarız? Tetikleyici yoksa risk
   kaydı süs olur.
3. Planın **hangi varsayıma dayandığını** ve o varsayımın **nasıl doğrulanacağını** yazar. Doğrulanma
   yolu yoksa varsayım değil, temennidir.
4. **Yapmayacaklarımızı** yazar. Kapsamın en güçlü savunması "hayır" listesidir.
5. **Karar bekleyen soruları** maddeler; bunlar kullanıcıya sorulacaklardır.

**Kapsam içinde:** risk kaydı (kapsam, teknik, ticari, uyum, bağımlılık), varsayım listesi,
yapmayacaklarımız, karar bekleyen sorular, risk yönetim düzeni, kabul kriterleri, testler, efor,
doğrulanacaklar.

**Kapsam dışında:** faz sırası ve efor (`39-YOL-HARITASI-EFOR.md`), UAT senaryoları ve geçiş adımları
(`40-UAT-KABUL-CANLIYA-GECIS.md`), modül iş kuralları (`03`–`38`), mevzuat yorumu (mali müşavir/avukat),
fiyat ve sözleşme (`docs/SATIS-PLANI.md`, `docs/hukuk/`).

**Yöntem (kısa).** Her risk için:

- **Olasılık:** Düşük / Orta / Yüksek — bugünkü kanıta göre.
- **Etki:** Düşük / Orta / Yüksek / Çok yüksek — takvim, para, itibar ve **mali sorumluluk** açısından.
- **Sahip:** riski izleyen ve tetiklendiğinde **karar veren** kişi. "Ekip" gibi sahipsiz atama yok.
- **Tetikleyici:** riskin gerçekleştiğini gösteren **ölçülebilir** işaret.

## 2. Luca'daki karşılığı

Rakip bir ürünün risk kaydı yayınlanmaz. Luca envanterinden çıkarabildiğimiz **dolaylı** dersler
şunlardır ve risk listemizin şeklini belirlediler:

- **Luca, çözümü paketlere bölmüş** (Standart / Profesyonel; `docs/plan-erp/02-LUCA-ENVANTERI.md:12`,
  `:20-23`). Bu, "hepsini birden yapma" riskine karşı bizim de kullandığımız çaredir: modüller kapalı
  doğar, paketle açılır (`39` §5.4).
- **Luca'nın birçok entegrasyonu "bağlantı listesi" düzeyinde listelenmiş** ve teknik ayrıntısı
  verilmemiş (`02-LUCA-ENVANTERI.md:65-71`). Bu, **bağımlılık riskinin** sektörde normal olduğunu
  gösterir: entegratör, banka, GİB — hepsi dışarıya bağlıdır.
- **e-Dönüşüm başlıkları ayrı bir ürün olarak duruyor** (e-Defter, e-SMM, saklama hizmetleri;
  `02-LUCA-ENVANTERI.md:73-77`). Bizde de e-belge/e-Defter **ayrı ve kapılı** bir katmandır
  (`08-E-BELGE-KATMANI.md`); bu, uyum riskini yönetilebilir tutar.
- **Fiyat sayfası dahi güvenli metne çevrilemedi** (`02-LUCA-ENVANTERI.md:80-83`). Bu,
  "fiyatlandırma varsayımı" riskinin gerçek olduğunun kanıtıdır: rakibin fiyatını bile
  doğrulayamıyoruz.

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>,
<https://www.luca.com.tr/Sayfa/fiyat/57>.

**doğrulanacak:** Luca'nın fiyat/paket/kontör modeli — kaynak: Luca fiyat sayfası (içerik okunamadı)
veya Luca satış ekibi. **doğrulanacak:** Luca'nın çok kiracılılık/barındırma modeli (müşteri başına ayrı
kurulum mu, tek sistem mi) — kaynak: Luca satış/teknik ekibi. **doğrulanacak:** Luca'nın kesinti/olay
geçmişi ve hizmet seviyesi taahhüdü — kaynak: Luca sözleşmesi. Bu bilgiler bizim risklerimizi
**azaltmaz**; ama karşılaştırma cümlesi kurarken uydurmamak için gereklidir.

## 3. Bizde bugün

Risk yönetimi bugün **dağınık ama boş değil**. Kanıtlı durum:

**Olanlar:**

- **Risk listeleri var, ama dağınık:** `docs/plan/34-RISK-GUVENLIK.md` (R1–R7 ve üzeri),
  `docs/SATIS-PLANI.md:293-298` (5 ticari risk), `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:159-168`
  (6 satırlık risk/geri dönüş tablosu), `docs/plan-erp/36-PERFORMANS-OLCEK.md:452` (R1 kaydı) ve her
  modül dokümanının §12'si. Hepsi ayrı; **tek kayıt yok**.
- **En kritik bağımlılık zaten yazılı:** Render'ın ücretsiz PostgreSQL'i **28 Ekim'de silinir**
  (`AGENTS.md:112`, `render.yaml:4`) ve bu, plan kararını doğrudan etkiler
  (`36-PERFORMANS-OLCEK.md:35-40`).
- **Ayna işi çalışıyor ve saatleri biliniyor:** günde 4 kez, 07:07 / 12:07 / 17:07 / 22:07
  (`.github/workflows/mirror.yml:10`). Geçiş ve yayın planı bu saatlere göre yazıldı
  (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:216-219`).
- **Yazma koruması var:** ayna açıkken panelde yazma reddedilir
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`) — "yanlışlıkla canlıya yazma"
  riskine karşı bugünkü tek sert savunma.
- **Yedek ve geri yükleme iş akışları var:** `.github/workflows/backup.yml`,
  `.github/workflows/restore.yml`; geri yükleme bir kez denenmiştir
  (`docs/YOL-HARITASI.md:129-132`).
- **İki adımlı doğrulama ve hesap kilidi var:** TOTP, kurtarma kodu, yönetici sıfırlaması, 5 hatalı
  denemede 15 dakika kilit (`server/YesLojistik.Api/Controllers/TwoFactorController.cs:37-43`,
  `server/YesLojistik.Api/Controllers/AuthController.cs:42`).
- **Sır denetimi yapılmıştır:** repoda ve tüm git geçmişinde gömülü şifre/anahtar **yok**; giriş
  bilgileri GitHub Secret olarak durur (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:170-193`).
- **Kapsam kararı yazılı:** "kapsam baştan sona uygulanacak" ve "kapsam dışı" listesi
  (`03-KAPSAM-VE-KONUMLANDIRMA.md:305-328`).

**Eksikler (bu dokümanın kapatacağı):**

1. **Tek risk kaydı yok**; olasılık/etki/sahip/tetikleyici sütunları hiçbir dosyada birlikte yok.
2. **Varsayım listesi yok.** Takvim ve efor varsayımları `39` §11.5'te var, ama **doğrulanma yolu ve
   yanlış çıkarsa etkisi** yazılı değil.
3. **"Yapmayacaklarımız" listesi yok.** `03` kapsam dışını yazar; **bilinçli olarak yapılmayacak**
   olanlar (tam bordro, e-Defter canlı üretimi vb.) tek yerde değil.
4. **Karar bekleyen sorular dağınık:** `docs/SATIS-PLANI.md:278-289` (10 madde) ve
   `docs/YOL-HARITASI.md:136-143` (7 madde) var; ERP planına özgü sorular (bordro, üretim modülü,
   `03`'teki efor tutarsızlığı) **hiç sorulmamış**.
5. **Risk gözden geçirme düzeni yok:** kim, ne sıklıkla, hangi tetikleyiciye bakacak — yazılı değil.
6. **Ticari risklerin sahibi yok:** fiyatlandırma ve destek yükü riskleri yazılmış
   (`docs/SATIS-PLANI.md:294-295`) ama sorumlusu belirtilmemiş.

## 4. Hedef ekranlar ve alanlar

Risk kaydı **yaşayan** bir belgedir; bu yüzden iki yerde görünür:

**4.1 Depodaki kayıt (bu doküman).** §5'teki tablolar asıl kayıttır; her satır bir risk numarası taşır
(`R-K01`, `R-T04`, `R-C02`, `R-U03`, `R-B05` gibi). Numaralar **bir daha değişmez**; kapanan risk
silinmez, "Kapandı" işaretlenir ve kapanış tarihi yazılır.

**4.2 Panelde "Risk ve Karar Defteri" (iç araç).** Ayarlar altında **yalnız yöneticiye** görünen bir
sekme. Alanlar:

| Alan | Tip | Açıklama |
|---|---|---|
| `RiskNo` | metin | `R-K01` biçiminde; tekil |
| `Baslik` | metin | Kısa ad |
| `Kategori` | seçim | Kapsam / Teknik / Ticari / Uyum / Bağımlılık |
| `Olasilik`, `Etki` | seçim | Düşük / Orta / Yüksek (etkide + Çok yüksek) |
| `Azaltma` | uzun metin | Yapılacak iş; iş kalemine bağlanır |
| `Sahip` | metin | Kişi/rol adı |
| `Tetikleyici` | metin | Ölçülebilir işaret |
| `Durum` | seçim | Açık / İzleniyor / Kapandı / Gerçekleşti |
| `GozdenGecirmeTarihi` | tarih | Sonraki bakım tarihi |
| `KararNotu` | uzun metin | Alınan karar ve gerekçesi |
| `IlgiliBelge` | metin | `docs/plan-erp/...` yolu |

**Kural:** bu sekme **müşteri verisi taşımaz** ve **paket kapısı dışındadır** (`34` ile satılan
pakete girmez). Risk kaydı ekranı, karar bekleyen maddelerin de görünür olduğu tek yerdir; böylece
"karar bekliyor" maddesi kaybolmaz.

## 5. İş kuralları

### 5.1 Kapsam riskleri

| No | Risk | Olasılık | Etki | Azaltma | Sahip | Tetikleyici |
|---|---|---|---|---|---|---|
| **R-K01** | **Luca sınıfı ERP'nin büyüklüğü**: 12 faz, 38 modül dokümanı, **~2.150 kişi-gün** (1.900–2.400); kapsam tek seferde bitmez | **Yüksek** | Yüksek | Fazlara bölme (`39`); modüller **kapalı doğar** ve paketle açılır (`39` §5.4); her faz sonunda müşteriye gösterim; kapsam daraltma seçeneği hazır (`39` §11.6) | kullanıcı (kapsam kararı) + geliştirici (sıra) | 2 faz üst üste takvimin %30'undan fazla aşarsa |
| **R-K02** | **Tek geliştirici hızı yetmez**: 1 geliştiriciyle **~10,5 yıl**, 2 geliştiriciyle ~6,2 yıl (`39` §11.5); mevzuat ve rakip kaçar | **Yüksek** | Yüksek | 2–4 geliştirici senaryosu ve kapsam daraltma hazır; ilk 2 fazda **gerçek hız ölçümü** ile varsayım güncellenir | kullanıcı | Aylık tamamlanan kişi-gün, planın %60'ının altına düşerse |
| **R-K03** | **Mevzuat değişimi**: KDV oranı, tevkifat, e-belge zorunluluğu, e-Defter kapsamı faz ortasında değişir | **Yüksek** | Yüksek | Oran/kod tabloları **veriden** gelir (`06-MUHASEBE-MOTORU.md`); motor **ek** çalışır, kapatılabilir (`:481`); aylık mevzuat kontrolü (`docs/SATIS-PLANI.md:296`); mali müşavir onayı | mali müşavir + kullanıcı | GİB/TÜRMOB duyurusu ya da mali müşavirden "kod değişti" uyarısı |
| **R-K04** | **Kapsam şişmesi**: her müşteri isteği modüle dönüşür | **Yüksek** | Orta | Yazılı kapsam dışı listesi (`03-KAPSAM-VE-KONUMLANDIRMA.md:305-328`) + §5.7 "yapmayacaklarımız"; kapsam değişikliği **yeni belge** ister | kullanıcı | Ayda 3'ten fazla "kapsam dışı" istek onaylanırsa |
| **R-K05** | **`03` §11'deki 150–230 kişi-gün** ile detaylı toplam (**~2.150**, ~9–10 kat) çelişir; plan güvenilirliği zedelenir | **Yüksek** | Orta | Çelişki `39` §11.4'te açıklandı (çift sayma + eksik modüller); `03` rakamının düzeltilmesi karar bekliyor (§5.8 K1) | geliştirici | Bu tutarsızlık düzeltilmezse müşteriye yanlış büyüklük söylenir |
| **R-K06** | **Kabul tanımı kayar**: kod teslimi "bitti" sanılır | Orta | Orta | `40` §9.3 dokuz şartlı "bitti" tanımı; her faz sonunda toplu gösterim (`docs/YOL-HARITASI.md:23`) | geliştirici | Kullanıcı bir modülü "bitmiş" sayarken UAT kaydı boşsa |
| **R-K07** | **Faz kapısı atlanır**, test edilmemiş modül canlıya çıkar | Orta | Yüksek | `39` §5.1 beş maddesi; CI yeşil olmadan `main`'e alınmaz; `Canlı kontrol` işi | geliştirici | CI yeşil olmadan yayın denemesi ya da "skip" etiketi |

### 5.2 Teknik riskler

| No | Risk | Olasılık | Etki | Azaltma | Sahip | Tetikleyici |
|---|---|---|---|---|---|---|
| **R-T01** | **Çok şirketli geçiş canlı veriyi bozar**: `CompanyId` bütün tablolara eklenir | **Yüksek** | **Çok yüksek** | Yalnız ekleme migration; `CompanyId` önce **boş**, sonra tek şirkete doldurulur (`03-KAPSAM-VE-KONUMLANDIRMA.md:309`); süzgeç tek noktada (`AppDbContext.cs:54-58`); "süzgeçsiz tablo" otomatik testi (`04-HEDEF-MIMARI.md:402`); migration **önce test ortamında** prova (`04` §5.10) | geliştirici | Migration provasında satır sayısı sapması ya da süzgeç testinin kırmızı olması |
| **R-T02** | **Veri göçü yanlış/eksik olur**: cari birleşmesi, devir bakiyesi, geçmiş belgeler | **Yüksek** | **Çok yüksek** | Kuru prova + satır bazlı hata raporu; bakiye farkı ölçütü **< 0,05 TL** (`05-VERI-MODELI.md:518-519`); çift yazım dönemi; tek yazma servisi | geliştirici + muhasebe | Kuru provada eşleşmeyen satır oranı %1'i, bakiye farkı 0,05 TL'yi aşarsa |
| **R-T03** | **e-belge entegratörü gecikir**: API, test hesabı, iptal akışı gelmez | **Yüksek** | Yüksek | Sağlayıcıdan bağımsız arayüz; varsayılan `manual` XML (`EInvoiceProviders.cs:18`); adaptör sonradan **tek sınıf** (`docs/ENTEGRATOR-EKLEME.md`); canlı gönderim test turu olmadan **açılmaz** (`docs/GELISTIRME-PLANI.md:86-87`) | kullanıcı (seçim) + geliştirici | Entegratör seçimi F2 sonuna kadar yapılmazsa |
| **R-T04** | **Banka entegrasyonu yapılamaz**: protokol, test ortamı, ücret bilinmiyor | **Yüksek** | Orta–yüksek | MT940/CSV ayrıştırıcı **dosya ile** çalışır; F4 canlı servis olmadan kapanabilir (`15-BANKA-ENTEGRASYON.md:363-380`); "muhasebe" sütunu boş kalır ama akış çalışır | geliştirici + kullanıcı | Bankadan 2 hafta içinde yanıt gelmezse dosya yolu tek seçenek kabul edilir |
| **R-T05** | **Performans düşer**: mizan, yaşlandırma, ağır raporlar paneli yavaşlatır | Orta | Orta | Sayfalama zorunlu, üst sınır 500 (`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:9`); ağır iş **kuyruğa**; şirket bazlı önbellek; toplam **ayrı uçtan** (`36-PERFORMANS-OLCEK.md:449-451`) | geliştirici | Bir liste/rapor 3 sn'yi aşar ya da SQL sayısı sayfa boyutundan bağımsız değilse |
| **R-T06** | **Veri kaybı**: yedek alınmadan yazan iş, başarısız migration, yanlış silme | Orta | **Çok yüksek** | Yazan işlemden önce **yedek + onay** (`AGENTS.md` §3.5); yalnız ekleme migration; silme yok → iptal/ters kayıt (`35-DENETIM-IZI-KVKK-UYUM.md`); geri yükleme provası | geliştirici | Yedeksiz bir yazma işlemi planlanıyorsa; `restore.yml` denenmemişse |
| **R-T07** | **Ayna modu ile çakışma**: yayın/migration ayna koşusunun ortasına denk gelir, veri yarım yazılır | **Yüksek** | Yüksek | Yayın ve geçiş adımları ayna saatlerinden **en az 45 dk** uzak (`.github/workflows/mirror.yml:10`, `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:216-219`); "son senkron sonucu 'aynı' çıkmalı" kuralı (`docs/YOL-HARITASI.md:99`) | geliştirici | `gh run list` ile ayna koşusu bitmeden `main`'e alma denemesi |
| **R-T08** | **Klasik görünüm bozulur**: yeni ekranlar yalnız "yeni görünüm"de çalışır, müşteri kaybolur | Orta | Orta | `DEFAULT_UI_MODE = 'classic'` faz boyunca sabit (`client/src/lib/uiMode.ts:8`); klasik menüde 23 öğe korunur (`client/src/lib/nav.ts:19-66`); her senaryo iki görünümde (`40` §9.1/3) | geliştirici | e2e'de klasik görünüm spec'i kırmızı olursa |
| **R-T09** | **Şirket süzgeci atlanan tek sorgu veri sızdırır** | Orta | **Çok yüksek** | Süzgeç tek noktada (`AppDbContext.cs:54-58`); "süzgeçsiz sorgu" testi + kod incelemesi (`05-VERI-MODELI.md:560`); iki şirketli izolasyon e2e | geliştirici | İzolasyon testi kırmızı ya da gözden geçirmede süzgeçsiz sorgu görülürse |
| **R-T10** | **Kuyruk/iş altyapısı dayanıksız**: yeniden başlatmada iş kaybolur, sonsuz döngü | Orta | Orta | Deneme sınırı 5, geri çekilmeli bekleme, `NeedsAttention` durumu (`27-ENTEGRASYONLAR.md:486-488`); kalıcı kuyruk tablosu (`36-PERFORMANS-OLCEK.md`) | geliştirici | Yeniden başlatma testinde iş kaybolursa |
| **R-T11** | **Testler CI'da koşmuyor sanılır**: "yerelde çalışmıyor" bahanesiyle yeşil varsayımı | Orta | Yüksek | "CI'da görülmüş olması" şartı (`40` §9.3); yerel sınır yazılı (`docs/GELISTIRME-PLANI.md:315`); test silme/atlama yasağı (`01-ORTAK-SARTNAME.md:24`) | geliştirici | CI koşusu olmadan `main`'e alma ya da "skip" etiketi |
| **R-T12** | **Lisans/paket kapısı yanlış kurulur**, müşteri modül kaybeder | Orta | Orta | Kapı yalnız yazmada; sahip modu ve Kurumsal pakette kapı yok (`03-KAPSAM-VE-KONUMLANDIRMA.md:312`); okuma açık kalır | geliştirici | Müşteri "modülüm kayboldu" derse |

### 5.3 Ticari riskler

| No | Risk | Olasılık | Etki | Azaltma | Sahip | Tetikleyici |
|---|---|---|---|---|---|---|
| **R-C01** | **Fiyatlandırma yanlış**: rakip 400–1.000 TL/ay bandında, bizim öneri 990–4.990 TL/ay | **Yüksek** | Yüksek | Fiyat **hipotez** olarak yazıldı (`docs/SATIS-PLANI.md:184-197`); pilotta doğrulanır; araç sayısına göre kademe; "iki programı birden değiştirir" konumlandırması | kullanıcı | Pilotta 3 firmadan 2'si fiyatı yüksek bulursa |
| **R-C02** | **Rakip fiyatı çok düşük** (ör. 400 TL/6 ay) ve özellik eşitliği sağlanır | **Yüksek** | Orta–yüksek | Fiyatla değil **farkla** yarış: sade Türkçe ekran, sevkiyat başına net kâr, şoför uygulaması, pratikortam geçiş kolaylığı (`docs/SATIS-PLANI.md:295`) | kullanıcı | Rakip aynı işlevi yarı fiyata verirse |
| **R-C03** | **Müşteri beklentisi yönetilemez**: "Luca gibi olacak" denip tarih verilir, sonra yetişmez | **Yüksek** | Yüksek | Müşteriye **yalnız faz çıktısı** gösterilir (`39` §12.1); tarih yerine **kilometre taşı** konuşulur; takvim varsayımları yazılı (`39` §11.5) | kullanıcı | Müşteri bir tarih sorduğunda ve cevap varsayıma dayanıyorsa |
| **R-C04** | **Destek yükü tek kişiyi tıkar**; geliştirme durur | **Yüksek** | Yüksek | Eğitim materyali (kılavuz + video, `40` §5.5); yardım sayfaları; **ilk 6 ay az müşteri** (`docs/SATIS-PLANI.md:294`); destek bütçesi ayrı sayıldı (`40` §11) | kullanıcı | Haftalık destek süresi 2 iş gününü aşarsa |
| **R-C05** | **Pilot başarısız olur** (firma kullanmaz), referans çıkmaz | Orta | Yüksek | Pilot seçim ölçütü (5–20 araç, sahibi kullanacak) ve başarı ölçütü baştan yazılı (`40` §5.4); başarısızlık **kapsam daraltma** kararını tetikler (`39` §11.6) | kullanıcı | Pilot 3. haftada kullanım ölçütünün yarısına ulaşmazsa |
| **R-C06** | **Reklam/konumlandırma pratikortam ile ilişkiyi bozar** | Orta | Orta | Tanıtımda pratikortam kötülenmez; veri yalnız **müşterinin kendi izniyle** alınır (`docs/SATIS-PLANI.md:298`, `:284`) | kullanıcı | Tanıtım metninde rakip adı geçerse |
| **R-C07** | **Kurulum/altyapı maliyeti fiyata yansımaz**: müşteri başına ayrı kurulumun sunucu maliyeti | Orta | Orta | Paket fiyatı araç sayısına bağlı; müşteri başına altyapı tahmini yazılı (`docs/SATIS-PLANI.md:209`); pilotta gerçek maliyet ölçülür | kullanıcı | Pilot altyapı maliyeti tahminin 2 katını aşarsa |

### 5.4 Uyum riskleri

| No | Risk | Olasılık | Etki | Azaltma | Sahip | Tetikleyici |
|---|---|---|---|---|---|---|
| **R-U01** | **KVKK ihlali**: kişisel veri (şoför, müşteri yetkilisi, konum) amaç dışı kullanılır ya da saklanır | Orta | **Çok yüksek** | Kişisel veri envanteri; maskeleme; veri sahibi başvuru akışı; aydınlatma/rıza sürümleme; erişim günlüğü (`35-DENETIM-IZI-KVKK-UYUM.md`) | kullanıcı + avukat | Envanterde olmayan bir alanda kişisel veri bulunursa; başvuru süresi kaçarsa |
| **R-U02** | **e-Defter/e-belge saklama yükümlülüğü karşılanmaz**: saklama süresi ya da biçim yanlış | Orta | **Çok yüksek** | Saklama politikası tablosu + imha kaydı; e-Defter **biçim doğrulanana kadar üretim kapalı** (`06-MUHASEBE-MOTORU.md:476`); mali müşavir onayı | mali müşavir + kullanıcı | GİB/TÜRMOB kılavuzu ile mevcut ayarlar uyuşmazsa |
| **R-U03** | **Mevzuat yorumu biz yaparız**: vergi/vergi usulü konusunda kod yorumu yazılır | Orta | Yüksek | Kural: mevzuat yorumu yazılmaz; "mali müşavir/avukat onayı gerekir" (`01-ORTAK-SARTNAME.md:11-14`); tüm dokümanlarda `doğrulanacak` etiketi | geliştirici | Bir dokümanda mevzuat hükmü yorumlanmışsa |
| **R-U04** | **Yurt dışı veri aktarımı**: barındırma/yedek konumu (Frankfurt) ve ayna verisi | Orta | Yüksek | Barındırma konumu ve yedek yeri kayıtlı; S3 sağlayıcı/bölge kararı **doğrulanacak** (`04-HEDEF-MIMARI.md:411-415`); aydınlatma metninde konum belirtilir | avukat + kullanıcı | Sağlayıcı bölgesi değişirse ya da yedek AB dışına çıkarsa |
| **R-U05** | **Kullanıcı verisini yanlış yere koyar**: UAT/sohbet/dokümana gerçek müşteri, VKN, tutar girer | Orta | Yüksek | Kural açık (`AGENTS.md` §3.3); UAT kaydı veri tutmaz (`40` §4); eğitim materyalinde örnek veri; repo taraması | geliştirici + kullanıcı | Depoda VKN/plaka/tutar benzeri gerçek veri bulunursa |
| **R-U06** | **Denetim izi/saklama çelişkisi**: "e-belge sakla" ile "KVKK sil" çatışır | Orta | Yüksek | Politika tabanlı arşivleme; hukuki blok; silme yerine iptal/pasifleştirme (`35-DENETIM-IZI-KVKK-UYUM.md`) | avukat | Bir veri sahibi talebi saklama yükümlülüğüyle çakışırsa |

### 5.5 Bağımlılık riskleri

| No | Risk | Olasılık | Etki | Azaltma | Sahip | Tetikleyici |
|---|---|---|---|---|---|---|
| **R-B01** | **Render ücretsiz PostgreSQL 28 Ekim'de silinir** | **Yüksek** (tarih belli) | **Çok yüksek** | Karar **F0'dan önce** (`39` §5.2); iki senaryo hazır: ücretli plana geçiş ya da yeni DB + ayna ile yeniden doldurma; yedek + geri yükleme provası (`docs/TASINMA.md`; `AGENTS.md:112`) | **kullanıcı** | 28 Ekim'e 2 hafta kala karar verilmemişse |
| **R-B02** | **e-Fatura entegratörü** seçilmez/API vermez | Yüksek | Yüksek | Bkz. R-T03; manuel XML ile devam; kontör ücreti müşteriye yansıtılır (`docs/SATIS-PLANI.md:195`) | kullanıcı | Seçim F2 sonuna kadar yapılmazsa |
| **R-B03** | **Banka** test ortamı/protokol vermez | Yüksek | Orta | Bkz. R-T04; dosya (MT940/CSV) yolu | geliştirici | Banka 2 hafta içinde dönmezse |
| **R-B04** | **GİB** e-belge/e-Defter başvurusu ve biçim bilgisi gecikir | Orta | Yüksek | Başvuru adımları geçiş listesinde (`40` §9.4/13); e-Defter kapalı doğar; mali müşavir takip eder | mali müşavir + kullanıcı | Kılavuz sürümü ile ayarlar uyuşmazsa |
| **R-B05** | **UETDS** Bakanlık yetkisi/test erişimi gelmez | **Yüksek** | Orta | Yalnız **hazırlık kontrolü** var; gerçek bildirim yazılmaz, **uydurma API yazılmaz** (`docs/UETDS.md`, `AGENTS.md` §5) | kullanıcı | Bakanlık erişimi 2 ay içinde gelmezse |
| **R-B06** | **GPS (Arvento/Mobiliz)** API anahtarı gelmez | Orta | Orta | GPS ileri fazda; yoksa harita ve müşteri takibi mevcut durumda kalır (`docs/SATIS-PLANI.md:225`) | kullanıcı | Anahtar 2 ay içinde gelmezse |
| **R-B07** | **Sağlayıcı kesintisi** ya da plan değişikliği (Render) | Orta | Yüksek | Yedek + başka yere kopya; VPS kurulum seçeneği hazır (`deploy/`, `docs/MUSTERI-KURULUM.md`); durum sayfası | geliştirici | 30 dakikadan uzun kesinti |
| **R-B08** | **GitHub Actions** kotası/ücretlendirmesi değişir; CI ve ayna durur | Orta | Orta | CI beş iş (`.github/workflows/ci.yml:8-82`) ve ayna tek iş; ayna elle `workflow_dispatch` ile çalıştırılabilir (`.github/workflows/mirror.yml:11`) | geliştirici | Ayna 24 saatten uzun çalışmazsa |
| **R-B09** | **Pilot firma bulunamaz** | Orta | Yüksek | YES Lojistik'in kendisi ilk pilot; dışarıdan 1–3 firma için ölçüt yazılı (`40` §5.4); satış kanalı: dernekler, mali müşavirler (`docs/SATIS-PLANI.md:253`) | kullanıcı | 3 ay içinde hiç aday görüşmesi olmazsa |
| **R-B10** | **Avukat/mali müşavir bulunamaz** ya da geç katılır | Orta | Yüksek | Hukuk metinleri "TASLAK" olarak kalır (`35` §9/12); KVKK ve e-Defter adımları **bu onaya bağlı** işaretlenir | kullanıcı | UAT'ta MM1 senaryoları onaysız kapanıyorsa |
| **R-B11** | **Kurulum betikleri gerçek sunucuda denenmedi** | Orta | Orta | Pilot öncesi 1 deneme sunucusunda baştan sona prova (`docs/SATIS-PLANI.md:42`) | geliştirici | Prova yapılmadan pilot kurulumuna başlanırsa |

### 5.6 Varsayımlar listesi

Her varsayım **nasıl doğrulanacak** ve **yanlış çıkarsa etkisi** ile yazılır.

| No | Varsayım | Doğrulanma yolu | Yanlış çıkarsa etkisi |
|---|---|---|---|
| **V1** | Bir geliştiricinin net üretken günü ayda **17 gündür** (22 iş gününün %78'i) | Son 3 ayın commit/test/yayın kaydından ölçüm; ilk 2 fazda tamamlanan kişi-gün sayımı | Takvim **doğrudan** kayar; %20 sapma 2 geliştirici senaryosunda ~15 ay demektir (`39` §11.5) |
| **V2** | 2 geliştirici ≈ **1,7×**, 4 geliştirici ≈ **2,8×** hız | Faz 1 ve 2'de tamamlanan kişi-gün/hafta ölçümü | Doğrusal varsayılırsa takvim iyimser çıkar; katsayı düşükse süre uzar |
| **V3** | Toplam efor **~2.150 kişi-gün** (aralık 1.900–2.400), yazılı modül §11'lerinin toplamı | Modül dokümanları §11'leri güncellendikçe yeniden toplama; ilk 2 fazın gerçek ölçümü | Toplam büyürse kapsam daraltma **zorunlu** olur; `03`'teki 150–230 rakamı geçersiz kalır |
| **V4** | **Veritabanı kararı** F0'dan önce verilir ve uygulanır | Kullanıcı kararı + `render.yaml` plan satırı + yedek/geri yükleme provası | F0 **başlamaz**; tüm plan durur; 28 Ekim'de veri silinme riski (R-B01) |
| **V5** | e-Fatura **entegratörü** F2 sonuna kadar seçilir ve test ortamı verir | Entegratör sözleşmesi + test hesabı + API dokümanı (`docs/ENTEGRATOR-EKLEME.md` §2) | F2 manuel XML ile kapanır; canlı e-belge **yok**; müşteri beklentisi karşılanmaz (R-T03) |
| **V6** | **Mali müşavir** UAT'a katılır ve KDV/e-Defter/BA-BS kurallarını teyit eder | MM1 senaryolarının imzalı sonucu; yazılı teyit | Muhasebe modülü **onaysız** canlıya çıkar; mali sorumluluk riski (R-U02, R-U03) |
| **V7** | **Avukat** KVKK, sözleşme ve saklama metinlerini onaylar | `docs/hukuk/` metinlerinin "TASLAK" ibaresinin kalkması | Portal ve aydınlatma akışları **açılamaz**; ticari satış gecikir |
| **V8** | Kullanıcı **2–4 geliştirici** bütçesi ayırır ya da kapsamı daraltmayı kabul eder | Kullanıcı kararı (`39` §11.6) | Tek geliştiriciyle takvim **~10,5 yıl**; plan fiilen rafa kalkar (R-K02) |
| **V9** | Mevcut panel **kesintisiz** çalışmaya devam eder; her faz ek (kapalı) özellik getirir | Her faz sonunda `Canlı kontrol` yeşil + e2e'de klasik görünüm spec'i | Mevcut müşteri işi durur; bu planın **en sert kuralı** çiğnenmiş olur (`39` §5.3) |
| **V10** | **Pilot firma** bulunur (YES Lojistik + 1–3 dış firma) | Aday listesi ve görüşme kaydı | UAT ve fiyat doğrulaması yapılamaz; satış takvimi kayar (R-B09) |
| **V11** | **Ayna saatleri** değişmez (günde 4 kez) ve yayın penceresi uygulanabilir | `.github/workflows/mirror.yml:10` izleme | Yayın ve geçiş planı yeniden zamanlanır (R-T07) |
| **V12** | e-belge/e-Defter **biçim bilgisi** doğrulanabilir bir kaynaktan gelir | GİB kılavuzu + mali müşavir teyidi | e-Defter **kapalı** kalır; muhasebe çıktısı eksik kalır (R-U02) |
| **V13** | Örnek/`Seed` verisiyle UAT yapılabilir; gerçek veri gerekmez | UAT kayıt defteri ve eğitim materyali incelemesi | Gerçek veri kullanma baskısı doğar; KVKK ve kural ihlali riski (R-U05) |
| **V14** | Mevcut **KDV/kâr** kuralları (KDV hariç kâr, KDV dahil cari) ERP'de de korunur | Entegrasyon testleri + mali müşavir kontrolü (`docs/KDV-KURALLARI.md`) | Kâr rakamı değişir; müşteri güveni sarsılır |
| **V15** | **Yedekten geri yükleme** çalışır ve RTO ≤ 2 saat tutulabilir | Gerçek geri yükleme tatbikatı (`36-PERFORMANS-OLCEK.md`) | Geri dönüş planı güvenilmez olur; canlıya geçiş ertelenir (R-T06) |
| **V16** | **Kurulum betikleri** gerçek sunucuda çalışır | Deneme sunucusunda baştan sona kurulum provası | Pilot kurulumu uzar; müşteri karşısında güven kaybı (R-B11) |

### 5.7 Yapmayacaklarımız (bilinçli kapsam dışı)

Bu liste, "sonra yaparız" listesi değil **karar** listesidir. Değişmesi için **kullanıcı onayı** ve
gerekçe gerekir.

| # | Yapmayacağız | Neden | Yerine ne var |
|---|---|---|---|
| 1 | **Tam bordro** (SGK bildirgesi, gelir vergisi, damga, kıdem/ihbar hesabı, banka ödeme dosyası) | Mevzuat ağır, sorumluluk yüksek, hedef müşteri bordroyu mali müşavire yaptırıyor | Puantaj, izin, avans, masraf ve **muhasebe aktarımı** (`18-PERSONEL.md`); bordro dışarıda |
| 2 | **Uydurma API** (UETDS, GPS, banka, entegratör) | Bilgi yokken yazılan API yanlış ve tehlikeli (`AGENTS.md` §5) | "Hazırlık kontrolü" (`docs/UETDS.md`) + sağlayıcıdan bağımsız arayüz |
| 3 | **e-Defter canlı üretimi** (biçim doğrulanana kadar) | Yanlış biçim resmî sorun doğurur | Üretim **kapalı**; üretilse bile "taslak" (`06-MUHASEBE-MOTORU.md:476`) |
| 4 | **Mevzuat yorumu** | Mali sorumluluk | "Mali müşavir/avukat onayı gerekir" + `doğrulanacak` etiketi |
| 5 | **pratikortam'a yazma** (her türlü) | Canlı kullanımda; kural kesin | Salt okuma, dışa aktarma, ekran incelemesi (`AGENTS.md` §3.1-3.2) |
| 6 | **Pratikortam verisini depoya alma** | KVKK + kural | Yalnız kod ve belge; testte uydurma veri (`AGENTS.md` §3.3) |
| 7 | **Gerçek veriyle UAT** | Canlı iş bozulur; KVKK | Test ortamı + örnek veri (`40` §5.1) |
| 8 | **Sıfırdan ayrı depo/ürün açmak** (şimdilik) | Ortak parçaların yeniden yazımı 80–120 kişi-gün + çift bakım (`03-KAPSAM-VE-KONUMLANDIRMA.md:321`) | Aynı kod tabanı; 20+ müşteriden sonra yeniden değerlendirme |
| 9 | **Gerçek çok kiracılı (SaaS) mimari** (şimdilik) | Bütün tablolar ve sorgular değişir; yüksek sızıntı riski (`docs/SATIS-PLANI.md:204-213`) | Her müşteriye **ayrı kurulum** (A kararı); 20+ müşteriden sonra B değerlendirilir |
| 10 | **Çoklu dil** | Şimdilik gerekmez (`docs/SATIS-PLANI.md:175`) | Türkçe; terimler `docs/TERIMLER.md` onayına bağlı |
| 11 | **Terimleri onaysız değiştirmek** ("Sefer" → "Sevkiyat" sunucu/mobil tarafı) | Kullanıcı onayı bekliyor | Görünen metinlerde değişti; kalan iş onaya bağlı (`docs/TERIMLER.md`) |
| 12 | **Testleri silmek/atlamak** | Kalite kapısı | Test yazılır; e2e CI'da koşar (`01-ORTAK-SARTNAME.md:24`) |
| 13 | **Veri silen/dönüştüren migration** | Canlı veriyi bozar | Yalnız ekleme; düzeltme ters kayıtla (`AGENTS.md` §3.7) |
| 14 | **Onaysız canlıya yazma** | Geri alınamaz | Yedek + kullanıcı onayı (`AGENTS.md` §3.5) |
| 15 | **Sırları dosyaya yazmak** | Güvenlik | Ortam değişkeni / GitHub Secret (`AGENTS.md` §3.4) |
| 16 | **Rapor tasarımcısının serbest SQL üretmesi** | Güvenlik + performans | Katalog + süzgeç sözleşmesi (`23`, `24`) |
| 17 | **Üretim/ithalat ve portalı ilk sürümde açmak** (öneri) | Hedef müşteride karşılığı sınırlı; ~230–250 kişi-gün | Modüller **kapalı doğar**; müşteri talebiyle açılır (`39` §5.4, `39` §11.6) |

### 5.8 Karar bekleyen sorular (kullanıcıya sorulacak)

Bunlar **planı doğrudan değiştirir**; cevap gelmeden ilgili iş başlamaz.

| # | Soru | Neden soruluyor | Cevap yoksa ne olur |
|---|---|---|---|
| **K1** | **`03-KAPSAM-VE-KONUMLANDIRMA.md:299`'daki 150–230 kişi-gün** rakamı düzeltilsin mi? Yazılı modül dokümanlarının toplamı **~2.150 kişi-gün** diyor | İki rakam arasında ~9–10 kat fark var; müşteriye söylenen büyüklük yanlış olur | Plan güvenilirliği zedelenir; takvim tartışması her toplantıda tekrarlanır (R-K05) |
| **K2** | **Veritabanı:** ücretli plana mı geçiyoruz, yeni DB + ayna ile yeniden doldurma mı? | F0'ın ön koşulu; 28 Ekim sınırı | F0 başlamaz; veri silinme riski (R-B01) |
| **K3** | **Kaç geliştirici** ve hangi çalışma modeli (`39` §11.6)? | Takvim **~10,5 yıl (1 kişi)** ile **~3,8 yıl (4 kişi)** arasında değişir; kapsam daraltmayla ~4,6 yıl, çekirdek hedefle ~3 yıl | Belirsizlik sürer; plan hep "yavaş" görünür |
| **K4** | **Üretim modülü (F8) ve ithalat/ihracat açılacak mı?** | ~53 kişi-gün; hedef müşteride karşılığı soru işareti | Açılırsa boşa emek; açılmazsa üretici müşteri kaybedilir |
| **K5** | **Tam bordro yapılacak mı?** (§5.7/1) | En ağır ve en riskli kapsam kalemi | Puantaj yapılır, bordro dışarıda kalır; müşteri "bordro da olsun" derse kapsam büyür |
| **K6** | **Fiyatlandırma modeli** onaylanıyor mu: araç sayısına göre 990 / 2.490 / 4.990 TL/ay (KDV hariç)? | Ticari riskin kalbi (R-C01) | Pilotta fiyat sorulunca cevap hazır olmaz; görüşme dağılır |
| **K7** | **Hedef müşteri sayısı** (ilk yıl kaç firma) ve **A mı B mi** (ayrı kurulum / çok kiracılı)? | Mimari ve altyapı bütçesi buna bağlı | Gereksiz SaaS yatırımı ya da ölçek duvarı |
| **K8** | **Rapor tasarımcısı** (`24`) ilk sürümde var mı? | 55–72 kişi-gün | Rapor isteği gelince plansız iş çıkar |
| **K9** | **Müşteri portalı** (F10) ilk sürümde var mı? | Portal kısmı 30–44 kişi-gün; KVKK metni + marka hazırlığı ister | Portal isteği gelince acele ve riskli çıkar |
| **K10** | **Geçiş günü çift kayıt** yapılacak mı (3 gün eski + yeni program birlikte)? | Geri dönüş kaybını azaltır (`40` §9.6) | Veri kaybı riski artar |
| **K11** | **Pilot firmalar** kimler (3–5 nakliyeci) ve ne zaman? | Pilot olmadan fiyat ve kabul doğrulanmaz | UAT ve fiyat doğrulaması yapılamaz (R-B09) |
| **K12** | **Pratikortam kullanım şartları**: başka firmaya "geçiş" sunacak mıyız, yalnız YES mi? | Yasal risk (`docs/SATIS-PLANI.md:284`) | Yasal belirsizlik; tanıtımda vaat verilemez |
| **K13** | **CRM (`25`) ve doküman arşivi (`26`)** ilk sürümde var mı? | İkisi birlikte **~105–143 kişi-gün** | Sonradan istenirse plan dışı iş çıkar |
| **K14** | **Destek modeli**: 30 gün sonrası ücretli destek mi, sözleşmede saat mi? | Destek yükü tek kişiyi tıkıyor (R-C04) | Sınırsız beklenti doğar; geliştirme durur |

### 5.9 Risk yönetim düzeni

| Ne | Ne sıklıkla | Kim | Çıktı |
|---|---|---|---|
| Risk kaydının gözden geçirilmesi | **Her faz sonunda** + ayda bir | geliştirici | Güncellenen `Durum` ve `GozdenGecirmeTarihi` |
| Tetikleyici kontrolü | **Haftalık** (kısa liste) | geliştirici | Tetiklenen risk için karar notu |
| Karar bekleyen maddeler | **Her faz sonunda** müşteriye sunum | kullanıcı | Karar + gerekçe, panele işlenir |
| Yedek/geri yükleme provası | **Çeyrek yılda bir** ve her canlıya geçişten önce | geliştirici | Tatbikat kaydı (RTO ölçümü) |
| Mevzuat kontrolü | **Aylık** | mali müşavir + kullanıcı | Değişiklik notu; kod/tablo güncellemesi |
| Sır taraması | **Çeyrek yılda bir** + her yeni entegrasyonda | geliştirici | "Sızma yok" kaydı (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:185-193`) |
| Bağımlılık durumu (entegratör, banka, GİB, GPS, DB) | **Aylık** | kullanıcı | "Geldi / gelmedi" tablosu; gecikme varsa plan kaydırması |

**Kural:** tetikleyici gerçekleştiğinde **karar** yazılır: (a) azaltma uygula, (b) kapsamı daralt,
(c) tarihi kaydır, (d) riski **kabul et** (gerekçesiyle). Sessizce geçmek yasak.

## 6. Veri modeli

Bu doküman **iş verisi tablosu eklemez.** Risk kaydını panelde tutmak istenirse **iki yardımcı tablo**
önerilir; istenmezse §5 tabloları depoda kalır (asgari çözüm).

| Tablo | Alanlar | Amaç | Not |
|---|---|---|---|
| `RiskRegisterItem` | `Id`, `CompanyId`, `RiskNo`, `Baslik`, `Kategori`, `Olasilik`, `Etki`, `Azaltma`, `Sahip`, `Tetikleyici`, `Durum`, `GozdenGecirmeTarihi`, `KararNotu`, `IlgiliBelge`, `KapanmaTarihi` | Risk kaydının yaşayan hâli | Yalnız ekleme migration; `CompanyId` taşır; **müşteri verisi içermez** |
| `DecisionItem` | `Id`, `CompanyId`, `SoruNo` (K1…), `Soru`, `Durum`, `Karar`, `KararTarihi`, `KararVeren` | Karar bekleyen maddelerin izi | Aynı ekranda görünür (§4.2) |

**Kural:** `RiskRegisterItem` paket kapısı dışındadır (iç araç); müşteriye satılan sürümde görünmez.
Alternatif: bu iki tablo yazılmaz, kayıt yalnız bu dokümanda tutulur — bu durumda aylık gözden geçirme
disiplini **elle** uygulanır.

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET | `/api/erp/risks` | Risk listesi (kategori/durum süzgeci) | yönetici |
| POST | `/api/erp/risks` | Yeni risk | yönetici |
| PUT | `/api/erp/risks/{riskNo}` | Risk güncelleme (durum, azaltma, karar notu) | yönetici |
| POST | `/api/erp/risks/{riskNo}/close` | Kapatma (gerekçe zorunlu) | yönetici + onay |
| GET | `/api/erp/risks/summary` | Kategori bazında açık risk sayısı, tetiklenen riskler | yönetici |
| GET | `/api/erp/decisions` | Karar bekleyen maddeler | yönetici |
| PUT | `/api/erp/decisions/{soruNo}` | Karar kaydı (karar + gerekçe + tarih) | yönetici |
| GET | `/api/erp/dependencies/status` | Bağımlılık durumu (DB, entegratör, banka, GİB, GPS) | yönetici |

**Kural:** risk uçları **salt okunur ağırlıklı**dır; yazma uçları denetim izine düşer ve ayna modunda
reddedilir (`MirrorWriteGuard.cs:14-18`).

## 8. Yetki, onay ve denetim izi

| İş | Yapan | Onaylayan | Denetim izi |
|---|---|---|---|
| Risk ekleme/güncelleme | yönetici | — | `RiskRegisterItem` değişikliği |
| Risk kapatma | yönetici | ikinci yetkili (maker-checker) | Gerekçe + tarih |
| Risk "gerçekleşti" işaretleme | yönetici | — | Karar notu |
| Karar kaydı (K1…K14) | yönetici | **kullanıcı** | Karar + gerekçe + tarih |
| Bağımlılık durumu güncelleme | yönetici | — | Durum değişikliği |
| Yedek/geri yükleme tatbikatı kaydı | geliştirici | yönetici | Tatbikat tarihi + RTO ölçümü |

**KVKK:** risk kaydında **kişisel veri tutulmaz** (kişi adı yerine rol yazılır; gerekirse kısaltma).
Denetim izi ve saklama kuralları `35-DENETIM-IZI-KVKK-UYUM.md` ile ortaktır. Mevzuat yorumu bu
dokümanda yapılmaz; **mali müşavir ve avukat onayı gerekir**.

## 9. Kabul kriterleri

1. **Tek kayıt:** bütün plan setindeki riskler (§5.1–5.5) numaralı ve **sahipli**dir; sahipsiz risk
   kalmaz.
2. **Tetikleyici zorunlu:** her riskin ölçülebilir tetikleyicisi vardır; "belirsiz" tetikleyici kabul
   edilmez.
3. **Varsayım izlenebilirliği:** §5.6'daki 16 varsayımın her biri ya **doğrulanmış** ya
   **doğrulanma tarihi** işaretli ya da açıkça "doğrulanmadı" olarak işaretlidir.
4. **Kapsam savunması:** §5.7'deki 17 madde yazılıdır ve her biri için "yerine ne var" sütunu
   doludur.
5. **Kararlar görünür:** §5.8'deki 14 soru panele/karar defterine işlenmiştir; her birinin durumu
   (bekliyor / karar verildi) görünür.
6. **Gözden geçirme disiplini:** son gözden geçirme tarihi **30 günden eski değildir**; her faz
   sonunda kayıt güncellenmiştir.
7. **Bağımlılık tablosu güncel:** R-B01'den R-B11'e kadarki bağımlılıkların durumu (geldi/gelmedi)
   aylık güncellenir.
8. **Kesintisizlik:** risk yönetimi hiçbir aşamada **canlı veriye yazmaz**; ayna ve mevcut panel
   bozulmaz.
9. **Dürüstlük:** `doğrulanacak` etiketi taşıyan hiçbir madde, doğrulanmadan "kesin" diye
   kullanılmaz; bir risk "kabul edildi" ise gerekçesi yazılıdır.

## 10. Testler

Risk yönetiminin testi, **riskin gerçekten izlendiğini** kanıtlamaktır.

| Katman | Ne | Yer | Ne zaman |
|---|---|---|---|
| Birim | Risk durum makinesi (açık → izleniyor → kapandı), zorunlu alan doğrulaması (tetikleyici, sahip) | `server/YesLojistik.Tests/Unit/` | her commit |
| Entegrasyon | Risk uçları yetki kontrolü; ayna modunda yazma reddi; karar kaydı denetim izi | `server/YesLojistik.Tests/Integration/` | her commit |
| e2e | Ayarlar → Risk ve Karar Defteri: liste, güncelleme, kapatma; iki görünümde çalışma | `client/e2e/`, `client/e2e/new-ui/` | her push |
| **Tetikleyici testi** | Bilinen bir tetikleyicinin (ör. 3 sn'yi aşan rapor) gerçekten uyarı ürettiği yapay olayla gösterilir | `server/YesLojistik.Tests/Integration/` | her push |
| **Yedek tatbikatı** | Yedekten geri yükleme + kayıt sayısı doğrulaması; RTO ölçümü | test ortamı | çeyrek yılda bir + geçiş öncesi |
| **Sır taraması** | Depo ve geçmişte şifre/anahtar araması | CI + elle | çeyrek yılda bir |
| **Veri kontrolü testleri** | Mizan eşitliği, yetim kayıt, numara boşluğu (riskin *gerçekleştiğini* erken yakalar) | `server/YesLojistik.Tests/Integration/` | her push (`40` §5.3) |
| **Geri dönüş provası** | Tetikleyici → dondur → yedek → yükle → doğrula zinciri | test ortamı | canlıya geçişten önce (`40` §9.6) |

**Kural:** "test edilmedi" = "yok". Risk kaydı ekranı için de test yazılır; hiçbir ekran "iç araç"
diye testsiz bırakılmaz.

## 11. Efor ve bağımlılıklar

Bu doküman **modül eforu üretmez**. Kendi işi için ayrılan yük aşağıdadır; modül rakamları
`39-YOL-HARITASI-EFOR.md` §11'den alınır ve burada **tekrarlanmaz**.

| İş | Kişi-gün | Önce bitmeli |
|---|---|---|
| Risk kaydının yazılması ve numaralandırma düzeni | 2 | — |
| Varsayım listesinin çıkarılması ve doğrulama planı | 2 | — |
| `RiskRegisterItem` + `DecisionItem` + uçlar + ekran | 4 | F0 (`CompanyId`) |
| Testler (birim + entegrasyon + e2e) | 3 | Yukarıdaki |
| Haftalık tetikleyici kontrolü ve aylık gözden geçirme (ilk 12 ay) | 12 (aylık ~1) | Fazlar başladıktan sonra |
| Yedek/geri yükleme tatbikatı (yılda 4 + geçiş öncesi) | 4 | Yedek altyapısı (var) |
| Sır taraması (çeyrek) | 2 | — |
| **Toplam** | **~29 kişi-gün** | — |

**Bağımlılıklar:**

- Risk kaydı ekranı `CompanyId`'yi bekler (F0). Tablo yazılmazsa kayıt depoda kalır; bu durumda
  **aylık gözden geçirme elle** yapılır.
- Varsayım **V4** (veritabanı), **V5** (entegratör), **V8** (geliştirici sayısı) ve **V10** (pilot)
  **kullanıcı kararına** bağlıdır; karar gelmeden ilgili fazlar başlamaz (`39` §5.2, `40` §11).
- Tetikleyici kontrolü, `36-PERFORMANS-OLCEK.md` ölçümlerini (yanıt süresi, kuyruk, arşiv) ve
  `40` §5.3 veri kontrollerini **girdi** olarak kullanır; ikisi kurulmadan bazı tetikleyiciler
  ölçülemez.
- Mevzuat kontrolü, mali müşavirin katılımına bağlıdır (V6).

**Not (dürüstlük):** bu **~29 kişi-gün**, `39`'daki **~2.150 kişi-günün içinde değildir**; `40`'taki
**~56 kişi-gün** UAT/geçiş yükü de ayrıdır. Toplam program yükü bu üç kalemin toplamıdır
(**~2.235 kişi-gün**).

## 12. Riskler ve doğrulanacaklar

**Bu dokümanın kendi riskleri** (risk kaydını yönetirken doğabilecek riskler):

| Risk | Etki | Azaltma |
|---|---|---|
| Risk kaydı yazılır ama **kimse bakmaz**; belge süs olur | Yüksek | §5.9 düzeni: haftalık tetikleyici kontrolü, aylık gözden geçirme, her faz sonunda zorunlu güncelleme; kabul kriteri 6 |
| Riskler **çok genel** yazılır ("veri bozulabilir"), tetikleyici ölçülemez | Orta | Kabul kriteri 2: tetikleyici ölçülebilir olmalı |
| Varsayımlar doğrulanmadan **kesin** gibi kullanılır | Yüksek | Kabul kriteri 9; `doğrulanacak` etiketi; §5.6'da doğrulama yolu sütunu |
| "Yapmayacaklarımız" listesi unutulur, kapsam sessizce büyür | Yüksek | Liste §5.7'de yazılı; değişiklik **kullanıcı onayı** ister; R-K04 tetikleyicisi |
| Karar bekleyen maddeler **soru olarak sorulmaz**, karar varsayılır | Yüksek | §5.8 + panelde Karar Defteri; her faz sonunda sunum |
| Bağımlılıklar (entegratör, banka, GİB) **geç fark edilir** | Yüksek | Aylık durum tablosu; R-B02/B03/B04 tetikleyicileri |
| Yedek tatbikatı yapılmaz, geri dönüş güvenilmez olur | Çok yüksek | Çeyrek yıllık tatbikat + geçiş öncesi prova; R-T06 |
| Risk kaydı panelde **müşteriye görünür** ve güven sarsılır | Orta | Paket kapısı dışı; yalnız yönetici; kişisel veri yok |
| Tek kişi hem riski yazar hem "kapandı" der | Orta | Kapatma maker-checker; denetim izi |
| **Efor toplamı sonradan yine büyür** (yeni modül dokümanı eklenirse) | Yüksek | `39` §11.2 tablosu her yeni dokümanda güncellenir; kabul kriteri: toplam, karar bekleyen maddelerde görünür kalır |

### 12.1 doğrulanacaklar

- **doğrulanacak:** Luca'nın fiyat/paket/kontör modeli — kaynak: Luca fiyat sayfası
  (<https://www.luca.com.tr/Sayfa/fiyat/57>; içerik güvenli metne çevrilemedi) veya Luca satış ekibi.
- **doğrulanacak:** Luca'nın barındırma/çok kiracılılık modeli ve hizmet seviyesi taahhüdü — kaynak:
  Luca sözleşmesi/satış ekibi.
- **doğrulanacak:** Render ücretli plan seçenekleri, kaynak sınırları, yedek saklama süresi ve
  maliyeti — kaynak: Render fiyat/kaynak sayfası + kullanıcı kararı (`36-PERFORMANS-OLCEK.md:38-40`).
- **doğrulanacak:** e-Fatura entegratörünün test ortamı, iptal/itiraz akışı ve kontör ücreti — kaynak:
  entegratör (ör. Nilvera/Kolaysoft; `docs/SATIS-PLANI.md:223`) ve `docs/ENTEGRATOR-EKLEME.md` §2.
- **doğrulanacak:** banka ekstresi servisleri (hangi banka, protokol, test ortamı, ücret) — kaynak:
  banka kurumsal entegrasyon birimi (`15-BANKA-ENTEGRASYON.md`).
- **doğrulanacak:** GİB e-belge/e-Defter başvuru prosedürü, defter/berat biçimi ve zorunluluk
  kapsamı — kaynak: GİB kılavuzu + mali müşavir.
- **doğrulanacak:** UETDS Bakanlık yetki belgesi, test ortamı ve entegrasyon dokümanı — kaynak:
  Ulaştırma Bakanlığı + kullanıcı (`docs/UETDS.md`).
- **doğrulanacak:** KVKK saklama süreleri, veri işleyen sözleşmesi ve yurt dışı aktarım koşulları —
  kaynak: avukat (`docs/hukuk/`, `35-DENETIM-IZI-KVKK-UYUM.md`).
- **doğrulanacak:** bizim gerçek geliştirme hızımız (V1, V2) — kaynak: son 3 ayın commit/test/yayın
  kaydı; ilk 2 fazda tamamlanan kişi-gün ölçümü.
- **doğrulanacak:** pilot firma adayları ve pratikortam kullanım şartları — kaynak: **kullanıcı**
  (`docs/SATIS-PLANI.md:283-284`).
- **doğrulanacak:** hedef müşteri sayısı ve buna bağlı A/B (ayrı kurulum / çok kiracılı) kararı —
  kaynak: kullanıcı (`docs/SATIS-PLANI.md:282`).

Mevzuat yorumu bu dokümanda yapılmaz; **mali müşavir ve hukuk danışmanı onayı gerekir**.

**Bağlantı:** bu doküman `39-YOL-HARITASI-EFOR.md`'deki süre/kapsam iddialarının ve
`40-UAT-KABUL-CANLIYA-GECIS.md`'deki kabul/geçiş planının **hangi varsayıma dayandığını** yazar.
Üç doküman birlikte okunur: `39` **ne zaman**, `40` **nasıl sınanır**, `41` **neye güveniyoruz**.
