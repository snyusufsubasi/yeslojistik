# YES Lojistik: Kapsamlı geliştirme planı (Ekim 2026)

*Hazırlanma: 7 Ekim 2026. Durum: öneri. Bu belge uygulamadan önce kullanıcının kararlarını bekler (bölüm 14).*

*Kaynak notu: Rakip bilgileri, rakiplerin kendi sitelerinden ve arama özetlerinden derlendi. Hiçbir rakip panelinde hesap açılmadı; ekran görüntüleri incelenmedi. Fiyatlar ve modül listeleri değişebilir. Bölüm 3'te her bilginin kaynağı ve güvenilirliği belirtildi.*

---

## 0. Yönetici özeti

Arkadaşınızın "ham" dediği şey tek bir hata değil. Panel üç yönden aynı anda ham görünüyor:

1. **Görsel düzen yoğun ve dengesiz.** Sevkiyatlar ekranında tablo başlamadan önce yaklaşık sekiz süzgeç kutusu, üç işlem düğmesi, iki görünüm anahtarı, bir arama kutusu ve bir kazanç şeridi var. Ana sayfada yedi kısayol kutusu, bir demo uyarısı, dört rakam, iki uyarı kutusu, bir nakit akışı tablosu, bir günlük sevkiyat listesi ve bir "Bu ay" kartı yan yana. Göz nereye bakacağını bilemez.
2. **Tutarsız ara yüz dili.** Aynı ekranda hem büyük başlık hem küçük büyük harfli etiket, hem renkli rozet hem düz metin, hem yuvarlak hem köşeli düğme var. Yazı tipi ve yazı boyutu ayarı yüzünden her ekran biraz farklı oturuyor. Bu, profesyonel bir ürünün izlenimini bozar.
3. **İki görünüm birden yaşıyor.** "Klasik" ve "Yeni" görünümler aynı kod tabanında yan yana duruyor. Bu, her değişikliğin iki kez yapılması ve iki görünümde farklı hatalar çıkması demek. Kullanıcı hangisinde olduğunu da bilmiyor.

Rakipler de tam bu sorunları çözmeye çalışıyor: Nakpro ana ekranda açık işleri, günlük sevkiyat sayısını ve kayıtlı araç/şoför sayısını gösteriyor; Datatruck kârı sefer, araç, güzergâh ve şoför bazında tek bakışta veriyor; Kamyoon ise işi bir "kontrol kulesi" ve "ne yapmalıyım" akışı etrafında düzenliyor. Hiçbiri bizim paneldeki kadar çok düğme ve süzgeçle açılmıyor.

**Önerilen çözüm, bir cümlede:** Tek bir görünüm, tek bir tasarım sistemi ve her ekranda yalnızca bir ana iş. Pratikortam'ın menü adları ve sırası korunur (müşterinin alışkanlığı için), ama ekranın içi sadeleşir: süzgeçler tek satıra iner, detaylar panele taşınır, rozetler yalnızca gerçek uyarıda görünür, boş ekranlar bir sonraki adımı gösterir.

**Süre tahmini:** Yaklaşık 12-14 hafta, tek kişi ve yapay zekâ ajanlarıyla birlikte. Her aşama canlıya ayrı ayrı çıkar ve müşteri onayıyla ilerler (bölüm 11).

**Müşteriden tekrar istenen tek şey:** Bir ekran kaydı ve kısa bir test görüşmesi (bölüm 10, Faz 0).

---

## 1. Neden "ham" görünüyor? Ekran ekran tespitler

Tespitler 7 Ekim 2026'da canlı sürüm (`main`, Hark tasarımı, Klasik görünüm) üzerinde 1440×900 ekranda yapıldı. Yeni görünüm için aynı analiz bölüm 6'da.

### 1.1 Genel
| # | Sorun | Neden ham hissettirir | Ciddiyet |
|---|---|---|---|
| G1 | Sol menüde 17 madde, bazılarında sayaç rozeti | Menü bir ekran gibi değil, bir liste gibi okunur; sayaçlar dikkat dağıtır | Yüksek |
| G2 | Üst çubukta arama, "+ Yeni", "Aa", bildirim, kullanıcı; "+ Yeni" ile "Ekstre" benzeri düğmeler yan yana | Üst çubuk tek bir işi değil beş işi yapıyor | Orta |
| G3 | Sayfa başlıklarının altında bazen alt başlık cümlesi, bazen yok | Sayfalar arası tutarsızlık | Orta |
| G4 | Her kart başlığı küçük büyük harfli, her tablo başlığı da öyle | Büyük harf çok yoğun; hiyerarşi kayboluyor | Orta |
| G5 | Yazı boyutu ayarı (Aa) var ama varsayılan 16 px; kullanıcı 17,5 ve üstünü istedi | Ekran yazıları küçük ve sıkışık görünüyor | Yüksek |
| G6 | Karanlık tema yok, ama aydınlık zeminde çok fazla renk tonu var (sarı, mavi, yeşil, turuncu, mor, kırmızı) | Renkler anlam taşımadığı için gürültü oluşturuyor | Yüksek |
| G7 | Tablolarda sağa yaslı ve sola yaslı sütunlar karışık; sayılar bazen mono yazı, bazen değil | Sayılar hizalı durmuyor | Orta |
| G8 | Toast bildirimleri ve hata mesajları standart kutu, marka ile uyumsuz değil ama genel | Ürün kendine özgü bir ses kazanmamış | Düşük |

### 1.2 Ana sayfa (Klasik)
| # | Sorun |
|---|---|
| A1 | Yedi kısayol kutusu ("İş Talebi", "Yeni Sevkiyat", "Tahsilat Gir", "Taşerona Ödeme", "Gider Ekle", "Fatura Kes", "Müşteri Ekle") en üstte; "+ Yeni" menüsüyle aynı işi yapıyor. İki yerde aynı şey. |
| A2 | Demo uyarısı ("Şu an örnek (demo) veriler görüntüleniyor") ana sayfanın en üstünde yer kaplıyor. Gerçek müşteri için bu uyarı yanlış bir sinyal verir. |
| A3 | Dört rakam kutusu güzel ama altında iki uyarı kutusu ("faturalanmadı", "masraf onay bekliyor") ve sonra büyük bir nakit akışı tablosu geliyor. Üç farklı görsel dil aynı ekranda. |
| A4 | Nakit akışı tablosu beş sütun, dört satır, para biçimli. Müşteri için anlamlı, ama ana sayfada ilk bakışta bu kadar yer kaplamamalı. |
| A5 | "Günlük Sevkiyatlar" tablosu sütunları küçük ve "Tarih", "Müşteri", "Güzergâh", "Durum", "Tutar" başlıkları gri. Satırlar sıkışık. |
| A6 | "Bu Ay" kartı ve "Araç Takip / Araçlar" ayrı kart olarak aşağıda. Ekranın alt yarısı kart yığını gibi. |

### 1.3 Sevkiyatlar (Klasik)
| # | Sorun |
|---|---|
| S1 | Sayfa başlığı, üç dış işlem düğmesi (Excel, Sevkiyat PDF, İcmal), "Excel'den Aktar", "Fatura Kes", "+ Yeni Sevkiyat" aynı satırda. Altı düğme. |
| S2 | İki görünüm anahtarı (Liste/Pano, Özet/Detay) ayrı satırda. |
| S3 | Dönem düğmeleri (Bugün, Gelecek, Geçmiş, Bu ay, Hepsi) ve yanında arama kutusu. |
| S4 | Sekiz süzgeç kutusu: durum, müşteri, başlangıç, bitiş, tedarikçi, plaka, araç durumu, fatura. "Ayrıntılı süzgeç" bağlantısı ile altında daha dokuz süzgeç. |
| S5 | Kazanç şeridi: sefer sayısı, satış, maliyet, masraf, kazanç ve sağda sarı "Faturası kesilecek" kutusu. Altı bilgi tek satırda. |
| S6 | Tablo satırlarında her seferde iki rozet ("Planlandı", "UETDS 11 eksik") ve kiralık rozeti. Uyarı çok, dikkat hiç yok. |
| S7 | Satır sonunda "Yüklendi yap" düğmesi, pano ikonu ve kalem ikonu. Üç işlem, aynı satırda. |
| S8 | İlk satır ekranın ortasında başlıyor; ilk ekranda 3-4 satır görünüyor. |

**Sonuç:** Sevkiyatlar sayfası "her şeyi bir arada gösterme" hedefiyle tasarlanmış; oysa kullanıcı çoğu zaman ya bugünkü işlere ya da tek bir sevkiyata bakıyor.

### 1.4 Sevkiyat formu
| # | Sorun |
|---|---|
| F1 | Üç adım ve iki katlanır bölüm. Adım sayısı ve katlanmalar formu uzun ve belirsiz gösteriyor. |
| F2 | KDV ve tevkifat iki seçici ile ayrı ayrı; tek satır özet var ama iki satırlık seçim hâlâ görünüyor. |
| F3 | Komisyon, şoför primi, masraf ve evrak alanları yine de forma yakın. |
| F4 | "Formu açık tut" ve "Kopya sayısı" yeni eklendi, ama düzeni hâlâ eski. |

### 1.5 Cari ekranları
| # | Sorun |
|---|---|
| C1 | Müşteriler Cari tablosunda dokuz sütun: Devir, Kesilen Fatura, İptal Fatura, Faturasız Sevkiyatlar, Alınan Ödeme, Verilen Ödeme, Bakiye ve düğmeler. Sütunların bazıları sıfır. |
| C2 | Her hücrede tutar ve altında sayı (örn. "3 sefer") gösteriliyor. İki bilgi bir arada, okuması zor. |
| C3 | Satır sonunda "Ekstre" ve (yeni) "Tahsilat Ekle". Bakiye sütunu ile düğmeler arası boşluk dar. |
| C4 | Üstte "Hesaplar" kartı ve üç süzgeç düğmesi ("Bakiyesi olanlar", "Vadesi geçenler", "Hepsi") ayrı kutularda. |

### 1.6 Listeler ve diğer ekranlar
| # | Sorun |
|---|---|
| L1 | Listeler (müşteri, tedarikçi, şoför, personel) aynı yapıda ama her sayfada başlık, alt başlık ve düğme düzeni biraz farklı. |
| L2 | Giderler ekranında kategori yönetimi, dönemli gider, şoför masrafı onayı ve yakıt girişi tek sayfada. Yakıt girişi ayrı bir iş olmalı. |
| L3 | Ayarlar'da on sekme ("Firma Bilgileri", "Kullanıcılar", "Fatura Notları", "İşlem Geçmişi", "Veriler", "Abonelik", "Telefon Bildirimleri", "Şifre Değiştir", "Güvenlik", "Veri ve hesap"). Yönetici işi ile kişisel işler karışık. |
| L4 | Raporlar: sekme sayısı çok, her sekmede farklı tablo tasarımı. |
| L5 | Giriş ekranı sade ama marka yok (yalnızca küçük logo). İlk izlenim orada oluşuyor. |

### 1.7 Mobil (panel telefonda)
| # | Sorun |
|---|---|
| M1 | Telefonda Sevkiyatlar sayfasında önce altı düğme, sonra iki görünüm anahtarı, sonra dönem düğmeleri, sonra beş süzgeç kutusu. Liste ekranın yarısından sonra başlıyor. |
| M2 | Alt çubuk (Ana Sayfa, Sevkiyatlar, +, Cariler, Menü) iyi, ama "Menü" içinde 17 madde var. |
| M3 | Yazı boyutu büyüdüğünde kart başlıkları ve düğmeler birbirine yaklaşıyor. |

---

## 2. Kullanıcılar ve yapılacak işler (jobs to be done)

Panel üç tür kullanıcı tarafından kullanılıyor. Her biri için en önemli işler ve sıklıkları:

### 2.1 Operasyon sorumlusu (günde çok kez)
- **Bugün ne var?** Yüklenecek, yolda, teslim edilecek sevkiyatları görmek. (Günde 10-30 kez)
- **Yeni sevkiyat girmek.** Müşteri, güzergâh, araç, şoför, fiyat. (Günde 3-15 kez)
- **Durum ilerletmek.** Yüklendi → Yolda → Teslim. (Günde 10-40 kez, en sık iş)
- **Bir sevkiyatı bulmak.** Plaka, müşteri veya tarihle. (Günde 5-10 kez)
- **Şoföre bilgi kopyalamak.** Plaka, şoför, adres. (Günde birkaç kez)

### 2.2 Muhasebe / ofis (günde birkaç kez, ayın sonunda yoğun)
- **Teslim edilmiş sevkiyatları faturalamak.** (Haftada birkaç kez, toplu)
- **Tahsilat girmek** ve müşteri bakiyesine bakmak. (Günde birkaç kez)
- **Tedarikçiye ödeme** ve taşeron faturası kaydı. (Haftada birkaç kez)
- **Ekstre çıkarmak** (PDF veya Excel, müşteriye göndermek için). (Haftada birkaç kez)
- **Ay sonu kazanç ve gider raporu.** (Ayda birkaç kez)

### 2.3 Yönetici / sahip (haftada birkaç kez)
- **Bu ayki kazanç ne?** Tek bakışta. (Günde 1-2 kez)
- **Kim ne yaptı?** İşlem geçmişi. (Haftada)
- **Şoför ve araç uyarıları** (belge bitişleri, bakım). (Haftada)
- **Abonelik, yedek, kullanıcı yönetimi.** (Ayda birkaç kez)

### 2.4 Şoför (telefonda, günde çok kez)
- Görevini görmek, yükleme ve boşaltma adresi, telefon.
- Durum bildirmek (yola çıktım, teslim ettim).
- Fotoğraf ve belge yüklemek.
- Masraf girmek (yakıt, otoyol, yemek).

Panelin asıl hedefi: **operasyon sorumlusunun günde 30 kez yaptığı işleri üç tıkta, şoförün telefonda yaptığı işleri tek ekranda yapabilmesi.** Diğer her şey ikinci plandadır.

---

## 3. Rakip analizi

### 3.1 Kapsam ve yöntem
Türkiye'deki nakliye programları ve yurt dışındaki küçük nakliye TMS'leri incelendi. Bilgiler üç kaynaktan geldi:
- **Doğrulanmış (site):** Rakibin kendi sitesinde açıkça yazılan bilgi.
- **Arama özeti:** Arama sonuçlarında görülen ama tam sayfası açılamayan bilgi.
- **Tahmin:** Bizim çıkarımımız.

Hiçbir rakibin panelinde hesap açılmadı. Bu yüzden "ekran" karşılaştırması yerine "sunulan özellik ve konumlandırma" karşılaştırması yapılıyor.

### 3.2 Türkiye: nakliye programları

| Rakip | Ne sunuyor (kaynak) | Güçlü yanı | Zayıf yanı (bizim için) | Ne alırız |
|---|---|---|---|---|
| **Nakpro** | Bulut, kurulum yok. Modüller: Nakliye, Fatura, İrsaliye, Tahsilat, Çek-Senet, Cari, Stok, Araç, Hatırlatma; Rapor paketlere dahil. 6 aylık paket 400 TL + KDV (site, tarih belirsiz). Ana ekranda açık ve tamamlanan işler, günlük sevkiyat sayısı, kasa durumu, kayıtlı şoför ve araç sayıları (site ve tanıtım metni). | Fiyatı çok düşük, modüller açık, ana ekranı sayılarla dolu. | Ekran görüntüsü incelenmedi; ara yüzün ne kadar sade olduğu bilinmiyor. | Ana ekranda "bugünkü" sayıları tek bakışta gösterme fikri. |
| **Kiraz Yazılım** | Bulut ERP. 13-14 ana modül, 106-110+ alt özellik (site). Sefer, araç, konteyner takibi; UETDS'ye otomatik bildirim; GİB e-Fatura/EDM; sefer analizi raporları (site). Paketler: nakliye, forwarder. 14 gün ücretsiz deneme (tanıtım). | Kapsam geniş; UETDS ve e-belge entegrasyonu iddiası var. | Modül sayısı iki sayfada farklı (14 ve 13). Fiyat açık değil. Kapsam genişliği, yeni başlayan kullanıcı için karmaşıklık demek olabilir. | UETDS ve e-belge gereksinimini bilmek; sefer analizi raporlarını bir ekranda toplamak. |
| **Divizyon** (Exweb, Pro, Maksi, Ultra) | Lisans (tek seferlik). Sevkiyat, araç, şoför, cari, komisyon takibi; her cihazdan erişim (arama özeti). | Tek seferlik lisans, yerleşik. | Bulut değil; mobil deneyim belirsiz. Fiyat yüksek (9.000-55.000 TL). | Lisans sayısı ve komisyon takibi alanlarının adları. |
| **Lojiper** | Web ve mobil; şoför uygulaması ve müşteri portalı (site). Sevkiyatta yükleme ve indirme noktaları haritada; çoklu para birimi; sefer bazında kâr-zarar; tur raporu; yakıt, otopark, kantar ve ceza gibi ek giderler (site). Şoför fotoğraf ve belge yükler (site). Araç ve filo modülü, HGS ve yakıt tanıma entegrasyonları (site). | Müşteri portalı ve şoför uygulaması var; tur raporu ve ek giderler bizde zayıf. | Kapsam ve fiyat sitede net değil. | Müşteri portalı ve tur bazında ek gider kalemleri. |
| **Nakliye Yazılımı (Asistan Pro vb.)** | Lisans, nakliye ve ön muhasebe; 65.000 TL, 3 taksit (arama özeti). | Tek seferlik fiyat ve taksit. | Bulut değil; pazarlama dili ağır. | Taksit seçeneği fikri. |
| **Softek Fastlane** | Nakliye ve lojistik ERP (arama özeti, Kiraz'ın karşılaştırma listesinde). | Kurumsal ERP. | Küçük firma için ağır olabilir. | Bilgi amaçlı. |
| **Demsoft, Probilnet, Sentigo, Evren, Portakal, MDS, KG Yazılım, Atılım Dijital** | Çeşitli nakliye programları (arama özeti). | Yerel satış kanalları, uzun süredir pazarda. | Bilgi derinliği düşük; sitelerinin çoğu klasik. | Yalnızca genel kıyas. |

**Türkiye pazarından çıkarımlar:**
1. Rakiplerin hepsi **"özellik sayısı"** ile satıyor (106, 110, 14 modül). Bu, müşteri için karar kriteri değil. Müşteri "ilk gün ne yapacağım?" diye soruyor.
2. Müşteri portalı ve şoför uygulaması Lojiper'da açıkça var; bizde şoför uygulaması var, müşteri portalı yalnızca takip linki.
3. UETDS ve e-belge (e-Fatura, e-İrsaliye) iddiası neredeyse herkeste var. Bizde UETDS yalnızca hazırlık kontrolü. Bu alan bir "olmalı" maddesi.
4. Fiyatlar çok geniş bir aralıkta (400 TL/6 ay'dan 55.000 TL'ye kadar). Küçük firma için aylık bulut aboneliği ve sade bir başlangıç fiyatı tercih edilir.

### 3.3 Dünya: küçük nakliye TMS'leri

| Rakip | Ne sunuyor (kaynak) | Güçlü yanı | Ne alırız |
|---|---|---|---|
| **Datatruck** | Fiyat araç sayısına göre: 1-6 araç 99 $/ay, 7-25 araç 299 $, 26-40 araç 499 $, kurumsal teklif (kendi blogu ve üçüncü taraf özetler). Kullanıcı sınırı yok (kaynaklar tutarsız, doğrulanmalı). Kâr her sefer, araç, güzergâh ve şoför bazında gerçek zamanlı (kendi sitesi). Dispatch, filo ve finans tek platform. ELD entegrasyonu, belge tarama ve fatura otomasyonu. | Kâr görünürlüğü ve araç sayısına göre fiyat. | Sefer, araç, güzergâh ve şoför bazında kâr; fiyatın araç sayısına bağlanması. |
| **Truckpedia** | AI destekli, 10 araca kadar 300 $/ay (arama özeti). | Otomasyon odaklı. | Gerekli değil; pahalı. |
| **Axele, TruckingOffice** | Basit TMS, yük yönetimi, şoför hesabı, faturalama; TruckingOffice'te IFTA raporu (arama özeti). | Şoför hesabı ve basit faturalama. | Şoför hesabı sadeliği. |
| **Ascend TMS** | Kullanıcı başı 49 / 99 / 149 $ (arama özeti). 30 gün ücretsiz deneme. | Net fiyat paketleri. | Deneme süresi ve fiyat sayfasının netliği. |
| **Tailwind** | Çok küçük firmalar için; kullanıcı başı (arama özeti). | Basit fatura. | Bilgi amaçlı. |
| **Kamyoon** | Yük borsası + TMS. TMS'in temel özellikleri ücretsiz (site). Modüller: taşıma talebi, araç ataması, kontrol kulesi ve ETA uyarıları, dijital irsaliye/POD, navlun ve kârlılık (site). Navlun maliyet hesaplama aracı: mesafe, tüketim, motorin fiyatı, boş dönüş oranı. U-ETDS yük bildirim yardımı ücretsiz (site). 150.000 günlük ilan, 600+ lojistik firması (site). | Ücretsiz başlangıç, navlun hesaplama, kontrol kulesi. | "Kontrol kulesi" ve ETA uyarısı fikri; navlun hesaplama aracı; U-ETDS bildirim yardımı. |
| **Samsara, Webfleet, Fleetio** | Filo ve telematik; donanım + abonelik (arama özeti). | GPS, yakıt, bakım, sürücü davranışı. | Yalnızca ileride GPS entegrasyonu için. |
| **Transporeon, Trans.eu** | Büyük yük platformları; kurumsal (arama özeti). | Ağ ve yük pazarı. | Kapsam dışı. |

**Dünya pazarından çıkarımlar:**
1. **Araç sayısına göre fiyat** yaygın ve küçük firma için adil; bizim fiyat önerimiz de bu yönde.
2. **"Kâr her sefer için"** tek satırda gösterilmeli. Datatruck bunu ana vaat yapıyor; bizde de kazanç şeridi var ama ilk bakışta okunmuyor.
3. **Kontrol kulesi** (ne yapılması gerektiği listesi) müşteriye "bugün ne yapacağım" sorusunda yardım eder.
4. **Navlun hesaplama** küçük nakliyeci için güçlü bir ilk değer. Kamyoon bunu ücretsiz veriyor.
5. Yurt dışı ürünler de **boş durum ve ilk adım** konusunda pratik öneriler veriyor (bölüm 7).

### 3.4 Panel tasarımı için genel dersler (kaynaklar: SaaS UX blogları, arama özeti)
Bunlar yayınlanmış UX blogları ve ajans içeriklerinden derlendi. Özel istatistikler doğrulanamadı; yalnızca yönler kullanılıyor:
- **Boş durum bir onboarding ekranıdır.** Açıklama, tek bir birincil eylem ve dolu hâlin önizlemesi ya da örnek veri.
- **Örnek veri net etiketlenmeli.** "Örnek veri" rozeti ile gerçek veri ayrılmalı.
- **Rol bazlı görünüm.** Her kullanıcı ilk açılışta kendi en sık ekranını görmeli.
- **Pano "şimdi ne yapmalıyım?" sorusunu yanıtlamalı.** Sayılar birkaç kümeye toplanmalı, derin bağlantılar sığ olmalı.
- **Aynı işi yapan iki yol olmamalı.** Hem "+ Yeni" menüsü hem kısayol kutuları aynı işi yapıyorsa seçmek zorlaşır.

### 3.5 Rakiplerden çıkan konumlandırma
Piyasada üç büyük grup var: (a) tek seferlik lisanslı yerel programlar, (b) bulut nakliye programları (Nakpro, Lojiper, Kiraz), (c) yük borsası ve TMS karışımları (Kamyoon) ve dünya TMS'leri (Datatruck). Bizim boşluk: **küçük ve orta ölçekli, bulut, Türkçe, sade, sevkiyat başına kârı açıkça gösteren ve şoförü telefonda da kullanan bir panel.** Bu konumda rakip sayısı az; ama "sade" iddiası ekran sadeleşmeden kanıtlanamaz. Yani asıl iş görsel ve deneyim işi.

---

## 4. Ürün ilkeleri

Bu ilkeler her ekran kararında geçerli. Çelişki olursa ilk sıradaki kazanır.

1. **Bir ekran, bir iş.** Her sayfanın başlığı yaptığı işi söyler. Aynı sayfada üç ayrı iş yoksa sadeleşmiş demektir.
2. **Bir ana düğme.** Her ekranda tek bir yeşil/çivit düğme olur. İkincil işler "Diğer" menüsünde ya da panelde.
3. **Önce liste, sonra detay.** Liste ekranın üstünden başlar. Detay sağdan açılan panelde, liste kaybolmadan.
4. **Süzgeç satırı, süzgeç paneli.** En çok kullanılan 1-2 süzgeç ve arama üstte; diğerleri panelde. Açık süzgeçler çip olarak görünür.
5. **Uyarı nadir olur.** Bir satırda en fazla bir uyarı. Uyarı her satırda çıkıyorsa, o uyarı süzgece taşınır.
6. **Renk anlam taşır.** Renk yalnızca durum (yolda, teslim, uyarı, hata) ve tek bir vurgu için kullanılır. Dekorasyon için renk yok.
7. **Sayılar hizalı durur.** Tutarlar sağa yaslı, eşit genişlikli rakamlarla, iki kuruş basamağıyla.
8. **Pratikortam'ın adları ve sırası korunur.** Müşterinin kas hafızası bozulmaz. Ama ekranın içi bizim tasarımımız olur; birebir kopya değil.
9. **Boş ekran bir yönlendirmedir.** Ne var, ne yoksa, sonraki adım ne.
10. **Telefonda da aynı anlam.** Telefonda liste kart olur, süzgeç tam ekran olur, ana düğme alt çubukta olur.
11. **Yazı küçük olmaz.** Taban 17 px. Tablo hücreleri 15-16 px. Hiçbir metin 13 px'in altına inmez (rozet hariç).
12. **Hata sakin anlatılır.** Hata mesajı ne olduğunu ve ne yapılacağını söyler; ünlem ve büyük harf kullanmaz.

---

## 5. Bilgi mimarisi ve gezinme

### 5.1 Tek görünüm kararı
Klasik ve Yeni görünüm birlikte yaşamamalı. Öneri:
- **Yeni görünüm** tek görünüm olur. Bu belgedeki düzen onun üzerine kurulur.
- **Klasik görünüm** müşteri onaylayınca kaldırılır (bölüm 11, Faz 7). Geçiş süresince kullanıcı görünüm tercihini değiştirebilir, ama kod tek olur.
- Gerekçe: iki görünüm, her değişikliği iki kez test etmek ve iki kez hata çıkarmak demek. Hark tasarımı zaten ortak parçaları değiştirdi; iki görünüm daha da zorlaşıyor.

### 5.2 Sol menü (pratikortam adları ve sırası, sadeleşmiş görünüm)
Menü 17 maddeden oluşur; sayaç yalnızca gerçek işlerde görünür ve en fazla dört tane.

| Grup | Madde | Adres | Sayaç |
|---|---|---|---|
| — | Bugün | `/` | Bugün bekleyen iş sayısı |
| — | e-Fatura | `/faturalar` | Faturalanmamış teslim sayısı |
| Raporlar | Müşteriler Cari | `/cari/musteriler` | Vadesi geçen alacak |
| Raporlar | Tedarikçiler Cari | `/cari/tedarikciler` | — |
| Raporlar | Tedarikçi Ödemeleri | `/odemeler` | — |
| Raporlar | Analiz | `/raporlar` | — |
| — | Sevkiyatlar | `/seferler` | Yolda/bekleyen |
| Listeler | Müşteri Listesi | `/musteriler` | — |
| Listeler | Tedarikçi Listesi | `/tedarikciler` | — |
| Listeler | Şoför Listesi | `/soforler` | Belge uyarısı |
| Listeler | Personel Listesi | `/personel` | — |
| Listeler | Sabit Ödeme Listesi | `/sabit-odemeler` | — |
| Öz Mal | Mazotlar | `/mazotlar` | — |
| Öz Mal | Giderler | `/giderler` | Onay bekleyen masraf |
| Öz Mal | Araç Masrafları | `/arac-masraflari` | — |
| Öz Mal | Araçlar | `/araclar` | Belge/bakım uyarısı |
| — | Yönetici | `/ayarlar` | (yalnız yönetici) |
| Banka & Çek | Bankalar | `/kasa-banka` | — |
| Banka & Çek | Çekler | `/cek-senet` | Vadesi yaklaşan |

Gruplar hep açık kalır (müşteri isteği). Gruplar arası boşluk küçük, grup başlığı düz ve sakin. Sol menünün altında yalnızca kullanıcı adı ve sürüm.

### 5.3 Üst çubuk
- Sol: menü düğmesi (telefonda), arama (Ctrl+K), genel arama sonuçları.
- Sağ: tarih, "+ Yeni" (tek ana eylem menüsü), bildirim zili, kullanıcı.
- "Aa" yazı boyutu düğmesi kullanıcı menüsüne taşınır. Üst çubukta yalnızca sık kullanılan şeyler kalır.
- Yardım simgesi üst çubukta; "?" düğmesi her sayfada aynı yerde.

### 5.4 Bölüm sekmeleri
Pratikortam'daki gibi, sayfanın başlığının altında. Sekmeler her zaman adreslere bağlıdır, geri tuşu çalışır.

| Bölüm | Sekmeler |
|---|---|
| Bugün | Bugün · İş Talepleri · Onay Bekleyenler |
| e-Fatura | Faturalandırılacaklar · Kesilen Faturalar · Alınan Faturalar |
| Müşteriler Cari | Bakiyeler · Tahsilatlar |
| Tedarikçiler Cari | Bakiyeler · Ödemeler |
| Sevkiyatlar | Liste · Pano · Harita |
| Öz Mal | Giderler · Mazotlar · Araç Masrafları · Araçlar |
| Banka & Çek | Bankalar · Çekler |
| Yönetici | Firma · Kullanıcılar · İşlem Geçmişi · Veri Aktarımı · Yedek ve Veri · Abonelik · Kurulum |

---

## 6. Görsel sistem

Bu bölüm "ham" hissi kaldıran asıl değişiklik. Her değer bir jeton (token) olarak `client/src/index.css` içinde tanımlanır; sayfalar sabit değer kullanmaz.

### 6.1 Yazı tipi: karar bekleniyor
Kullanıcı, Claude'un cevap yazısına benzeyen tırnaklı yazıyı (Source Serif 4) sevmişti. Hark tasarımı her yerde Inter kullanıyor. İki seçenek:

- **Seçenek A (öneri): Tırnaklı başlık, düz gövde.** Başlıklar Source Serif 4 (tırnaklı, şık, sevilen yazı), gövde ve tablo Inter (düz, okunaklı). Tutarlar Inter'in eşit genişlikli rakamlarıyla. Bu, şıklık ile okunurluğu birleştirir ve kullanıcının sevdiği yazıyı korur.
- **Seçenek B: Hepsi Inter.** Daha sade ve modern; ama kullanıcının önceki tercihi bozulur.

Öneri A. Karar bekleniyor (bölüm 14, karar 1).

### 6.2 Yazı ölçeği (type scale)
Taban: **17 px** (Normal). "Büyük" 19 px, "Çok büyük" 21 px. Bu, kullanıcının "bir tık büyütünce daha iyi duruyor" dediği aralıktır. Mevcut 16/18/20 yerine:

| Jeton | Boyut | Satır | Kullanım |
|---|---|---|---|
| `text-xs` | 13 px | 1.4 | Yalnızca rozet ve yardımcı not |
| `text-sm` | 15 px | 1.45 | Tablo hücresi (ikincil satır), form yardımı |
| `text-base` | 17 px | 1.5 | Gövde, tablo hücresi, form alanı |
| `text-lg` | 19 px | 1.4 | Kart başlığı |
| `text-xl` | 22 px | 1.3 | Sayfa başlığı |
| `text-2xl` | 28 px | 1.2 | Rakam kutusu değeri |

Kalın ağırlık yalnızca iki yerde: sayfa başlığı ve rakam kutusu değeri. Başlıklarda BÜYÜK HARF yok; kart başlığı normal büyük-küçük harfle, koyu gri.

### 6.3 Renk
- **Zemin:** sayfa `#f7f7f5`, yüzey (kart, tablo, pencere) `#ffffff`, ikincil zemin `#f3f3f0`.
- **Çizgi:** `#e6e5e1`, 1 px.
- **Yazı:** ana `#1c1b19`, ikincil `#6b6a65`, devre dışı `#9b9a94`.
- **Vurgu (tek):** çivit `#4652c9`. Yalnızca ana düğme, seçili sekme, seçili çip, bağlantı.
- **Durum renkleri (yalnızca durum etiketinde):**
  - Planlandı: mavi-gri
  - Yüklendi: kehribar
  - Yolda: çivit
  - Teslim edildi: yeşil
  - İptal: gri
- **Uyarı:** kehribar (dikkat), kırmızı (hata, vadesi geçmiş). Sarı zemin yalnızca "faturası kesilecek" gibi tek bir vurgu kutusunda.
- Karanlık tema: şimdilik yok. Eklenirse jetonlar değişir, sayfalar değişmez.

### 6.4 Boşluk, köşe, gölge
- **Boşluk:** 4 px temel birim. Kart içi 20 px, bölümler arası 24 px, sayfa kenarı 24 px (telefonda 16 px).
- **Köşe:** kart 14 px, düğme ve alan 10 px, çip ve rozet tam yuvarlak.
- **Gölge:** yalnızca açılır pencere ve sağ panel (`0 12px 32px rgb(0 0 0 / 0.12)`). Kartlarda gölge yok, 1 px çizgi yeter.
- **Yükseklik:** düğme 40 px (masaüstü), 48 px (telefon). Alan 42 px. Tablo satırı 56 px (masaüstü), 64 px (telefon kartı).

### 6.5 Tablo
- Başlık satırı yapışkan (sticky), zemin `#f3f3f0`, yazı ikincil gri 15 px, büyük harf yok.
- Satır çizgisi 1 px; üzerine gelince zemin `#f7f7f5`.
- Sayı sütunları sağa yaslı, rakamlar eşit genişlikli. Metin sütunları sola.
- Sütun sayısı en fazla 6 (masaüstü). Daha fazlası "Detay" panelinde.
- Seçim kutusu yalnızca toplu işlem için; kutu ilk sütunda, ayrı genişlikte.
- Satır sonu: yalnızca bir ana işlem düğmesi ve bir "⋯" menüsü.

### 6.6 Rozet ve durum
- Durum etiketi: tam yuvarlak, 13-14 px, solda küçük nokta, zemin çok açık ton. Yazı ana renkte.
- Plaka rozeti: ince çerçeveli, solda çivit "TR" şeridi, yazı eşit genişlikli. Yalnızca plaka gösterilen yerde.
- Sayaç rozeti (menüde): küçük, kehribar zemin, koyu yazı. En fazla dört.
- "UETDS eksik" gibi hazırlık uyarıları satırda değil; süzgeçte ve sevkiyat ayrıntısında.

### 6.7 Düğme ve form
- **Ana düğme:** çivit zemin, beyaz yazı, yarı kalın. Ekranda en fazla bir tane.
- **İkincil düğme:** beyaz zemin, 1 px çizgi, koyu yazı.
- **Metin düğmesi:** çivit yazı, zeminsiz (ör. "Değiştir").
- **Form alanı:** üstte etiket (ikincil gri, 14 px), altında alan, altında yardım metni (13-14 px). Zorunlu alanda yıldız yerine "(zorunlu)" yazısı ya da etiket sonunda çivit nokta; yıldız en iyisi değil, çünkü herkesin tanıdığı bir düzen gerekmez.
- Hata: alan çerçevesi kırmızı, altında tek cümle, ne yapılacağı.

### 6.8 Simgeler ve resimler
- Tek simge seti (Lucide), 16 px (düğme içi) ve 20 px (menü). Renkli simge yok; simge yazı rengini alır.
- Boş durum için çizim yok. Sade bir simge ve metin yeter. (Çizim gerekirse sonra.)
- Logo: şimdilik "YES Lojistik" kutusu. Beyaz etiket için firma logosu (Ayarlar'dan).

### 6.9 Hareket
- Geçişler 150-200 ms. "Hareketi azalt" tercihinde kapanır.
- Sağ panel ve açılır pencere yumuşak girer; tablo satırları animasyonsuz.
- Yükleme: iskelet (skeleton) satırları, dönen simge değil.

---

## 7. Boş durumlar, ilk kullanım, onboarding

Boş durum yeni kullanıcının ilk izlenimidir. Her boş ekranda şu üçü olur:
1. **Ne burada olacağı:** "Sevkiyatlar burada görünür. İlk sevkiyatınızı ekleyin."
2. **Tek birincil eylem:** "+ Sevkiyat Ekle" (yönetici ya da operasyon yetkisi yoksa eylem yerine "Yöneticinize sorun" yazısı).
3. **İkincil yol:** "Excel'den aktarın" (yalnız veri aktarımı olan listelerde).

**Örnek veri:** Kurulum sihirbazında "Örnek veri ile deneyin" seçeneği var. Örnek veri her sayfada "Örnek veri" rozetiyle ayrılır ve tek tıkla temizlenir. Gerçek kayıt girildiğinde örnek veri kendiliğinden gizlenir.

**Kurulum kartı (Bugün ekranında):**
- Firma bilgileri (VKN, adres)
- İlk müşteri
- İlk araç ve şoför
- İlk sevkiyat
- Kullanıcı ekleme
Her adım tamamlanınca işaretlenir; hepsi bitince kart kaybolur.

**Rol bazlı ilk ekran:**
- Operasyon: Bugün (bugünkü sevkiyatlar).
- Muhasebe: e-Fatura → Faturalandırılacaklar.
- Yönetici: Bugün (kurulum kartı, ardından genel durum).
- Şoför (web): "Telefondan kullanın" bağlantısı.

**Hata durumları:**
- Bağlantı kesilirse üst bantta "Bağlantı yok, değişiklikler kaydedilmedi" uyarısı ve tekrar deneme.
- Sunucu hatası: sayfa içinde sakin mesaj, "Tekrar dene" düğmesi.
- Yetki yok: kilit simgesi ve "Bu bilgi için yönetici yetkisi gerekir".

---

## 8. Ekran ekran yeniden tasarım

Her ekran için: amaç, üst satır, süzgeç, tablo ya da içerik, boş durum, telefon. Ekran görüntüsü yerine metin çizimi; uygulama sırasında her ekran için 1440×900 ve 390×844 görüntüsü alınır.

### 8.1 Bugün (ana sayfa)
**Amaç:** Operasyon sorumlusunun "bugün ne yapacağım" sorusunu yanıtlamak.

**Yerleşim (yukarıdan aşağıya):**
1. Başlık "Bugün" ve tarih. Sağda ana düğme "+ Sevkiyat Ekle".
2. Bölüm sekmeleri: Bugün · İş Talepleri · Onay Bekleyenler.
3. **Üç rakam** (yatay, eşit kutular): Yüklenecek (bugün), Yolda, Teslim edildi (bugün). Her rakama tıklanınca ilgili liste açılır.
4. **Kontrol listesi** (en fazla 3 madde): "3 sevkiyat faturalanmadı → Fatura kes", "2 masraf onay bekliyor → İncele", "1 belge bitişi 15 gün içinde → Araçlar". Yalnızca gerçek işler. Yok ise bu bölüm görünmez.
5. **Bugünkü sevkiyatlar** tablosu: Saat/tarih, Müşteri, Güzergâh (kısa), Araç, Şoför, Durum, İşlem düğmesi. Satır tıklanınca sağ panel.
6. Altta, daralmış bir "Bu ay" şeridi: satış, maliyet, kazanç (3 rakam, tek satır).

**Kaldırılan:** yedi kısayol kutusu (işlevi "+ Yeni" menüsünde), demo uyarısı (yönetici için üst bantta küçük bağlantı), nakit akışı tablosu (Analiz'e taşınır), uzun "Dikkat edilecekler" listesi (kontrol listesine indirgenir).

**Telefon:** Üç rakam üst üste değil yan yana (üç sütun, küçük). Kontrol listesi açılır kart. Tablo yerine sevkiyat kartları.

**Kabul ölçütü:** 1440×900'de bugünkü sevkiyatların en az 5 satırı ilk ekranda görünür; sayfada en fazla bir ana düğme; üç rakam bir satırda.

### 8.2 Sevkiyatlar (liste)
**Amaç:** Sevkiyat bulmak, durumunu ilerletmek, toplu işlem yapmak.

**Yerleşim:**
1. Başlık "Sevkiyatlar". Sağda "+ Sevkiyat Ekle" (ana düğme) ve "⋯ Diğer" (Excel, PDF, İcmal, Excel'den aktar, Fatura kes).
2. Bölüm sekmeleri: Liste · Pano · Harita.
3. **Süzgeç satırı (tek satır):** arama kutusu (geniş), zaman çipleri (Bugün · Gelecek · Geçmiş · Bu ay · Hepsi), "Süzgeç (n)" düğmesi.
4. Açık süzgeçler çip olarak (örn. "Müşteri: ABC ✕").
5. **Toplam şeridi (tek satır, üç rakam):** Sevkiyat sayısı · Satış · Kazanç. "Faturası kesilecek" yalnızca sayı sıfırdan büyükse ve tek bir sarı kutuda.
6. **Tablo:** Tarih/No · Müşteri · Güzergâh · Araç/Şoför · Durum · Tutar/Kâr · İşlem. En fazla 7 sütun.
   - Durum hücresinde tek rozet ve yanında tek ilerletme düğmesi ("Yüklendi yap").
   - "İşlem" hücresinde "⋯" menüsü: Düzenle, Kopyala, Evrak, Takip linki, Sevk belgesi, Şoför bilgisini kopyala, Sil.
   - UETDS rozeti yok (süzgeçte).
7. Satır tıklanınca sağ panel: Bilgiler · Evrak · Takip · Geçmiş.

**Süzgeç paneli (sağdan):** Tarih aralığı, durum, müşteri, tedarikçi, plaka, Piyasa/Öz araç, faturalı/faturasız, komisyon işi, firma grubu, yükleme/indirme yeri, sevkiyat/evrak/fatura no, evrak var/yok, UETDS eksik. "Listeyi göster" düğmesi.

**Pano görünümü:** Yalnızca durum sütunları. Kart başına müşteri, plaka, güzergâh kısa, tutar. Sürükleme yok; ilerletme düğmesi var.

**Harita:** Mevcut harita, üstte aynı süzgeç satırı.

**Kabul ölçütü:** Bir sevkiyatın durumu üç tıkta ilerletilir; ilk ekranda en az 8 satır görünür; süzgeç paneli ve çipler ile bir süzgeç değişikliği tek adımda uygulanır.

### 8.3 Sevkiyat ekle / düzenle (form)
**Amaç:** Hızlı girmek; zorunluları önce, isteğe bağlıyı sonra.

**Yerleşim (iki sütun, masaüstü):**
- Sol sütun, "Güzergâh ve tarih": Müşteri (aranabilir), Yükleme ili/adresi, Yükleme tarihi, İndirme ili/adresi, Teslim tarihi. Son sevkiyattan doldur düğmesi.
- Sağ sütun, "Araç ve fiyat": Araç (aranabilir), Şoför (araçtan otomatik), Müşteri fiyatı, Araç maliyeti (taşeronsa taşerona ödenecek), KDV ve tevkifat özeti (tek satır, "Değiştir" ile açılır), Kazanç (canlı).
- Altta tek geniş alan: "Açıklama".
- Katlı bölüm, varsayılan kapalı: "Diğer bilgiler" (komisyon, prim, ek masraf, evrak, yetkililer, UETDS alanları, konum). Değer varsa açık gelir.

**Alt çubuk (sabit):** Solda "Kaydettikten sonra formu açık tut" ve "Kopya sayısı". Sağda "Vazgeç" (ikincil) ve "Kaydet" (ana). Kopya sayısı 2 veya daha fazlaysa düğme "3 sevkiyat kaydet".

**Telefon:** Tek sütun, sırayla. Kaydet düğmesi alt çubukta sabit.

**Kabul ölçütü:** Zorunlu alanlar ilk ekranda; müşteri, araç, şoför seçimi üç tıkta; Ctrl+Enter kaydeder; kapatırken kaydedilmemiş değişiklik sorulur (mevcut davranış korunur).

### 8.4 e-Fatura
**Amaç:** Teslim edilmiş sevkiyatları faturalamak, kesilmiş faturayı izlemek.

**Sekmeler:** Faturalandırılacaklar · Kesilen Faturalar · Alınan Faturalar.

- **Faturalandırılacaklar** (varsayılan): müşteriye göre gruplu sevkiyatlar. Her grupta toplam ve "Fatura kes" düğmesi. Grup satırını açınca sevkiyatlar. Seçim toplu fatura için.
- **Kesilen Faturalar:** üstte üç sayaç (taslak, kesilen, vadesi geçen), altında liste. Süzgeç: tarih, müşteri, durum, tür. Sağda "⋯": İcmal, Excel, PDF.
- **Alınan Faturalar:** tedarikçi faturaları; matrah girilince KDV ve tevkifat kendiliğinden.
- **Fatura kesme ekranı:** müşteri ve sevkiyat seçilince özet kutusu (ara toplam, KDV, tevkifat, ödenecek). KDV oranı farklı sevkiyat seçilirse seçim anında uyarı ve "Faturayı Kes" pasif. Otomatik tevkifat metni: "Otomatik: 2/10 uygulanıyor" ya da "tevkifat yok".

**Kabul ölçütü:** Teslim edilmiş bir sevkiyat üç tıkla faturalanır; KDV uyarısı seçim anında çıkar.

### 8.5 Müşteriler Cari ve Tahsilatlar
**Amaç:** Hangi müşteriden ne alacağım, tahsilat girmek, ekstre çıkarmak.

**Üst satır:** başlık, "⋯ Diğer" (Excel, PDF), "+ Tahsilat". Bölüm sekmeleri: Bakiyeler · Tahsilatlar.

**Üç rakam:** Toplam alacak, vadesi geçen, bu ay tahsilat.

**Süzgeç satırı:** arama, çipler (Bakiyesi olanlar · Vadesi geçenler · Hepsi), "Süzgeç".

**Tablo sütunları (en fazla 6):** Müşteri · Kesilen fatura · Alınan ödeme · Faturasız sevkiyat · Bakiye · İşlem. Devir ve iptal fatura sütunları "Diğer" panelinde (varsayılan gizli).
- Bakiye sütunu tek sayı; vadesi geçen varsa altında kırmızı tek satır.
- İşlem: "Ekstre" (ikincil) ve "⋯" (Tahsilat ekle, Ödeme ekle, Müşteri kartı).

**Ekstre:** Müşteri sayfası açılır, sekmeler: Ekstre · Faturalar · Sevkiyatlar · Bilgiler. Ekstre tablosu sade: tarih, açıklama, borç, alacak, bakiye. Üstte PDF/Excel ve e-posta.

**Tahsilat formu:** müşteri önceden dolu, açık faturalar listelenir ve işaretlenebilir (pratikortam'daki "Ekstreden Tahsilat"). Tutar girilince işaretli faturalar kapanır.

**Kabul ölçütü:** Bir müşterinin bakiyesi ve ekstresi iki tıkla; tahsilat açık faturalara bağlı girilir.

### 8.6 Tedarikçiler Cari ve Ödemeler
Müşteriler Cari ile aynı iskelet. Ek olarak "Seçilenlerden toplu ödeme" (seçili tedarikçilere tek liste). Ödeme formu tedarikçi önceden dolu; bağlı fatura ve sevkiyat seçilebilir.

### 8.7 Listeler (müşteri, tedarikçi, şoför, personel, sabit ödeme)
Tek iskelet: başlık, "+ Ekle", "⋯ Diğer" (Excel, Excel'den aktar), arama, "Arşivdekileri göster", tablo.

- **Müşteri:** No, Firma, VKN/TCKN, Telefon, İl/İlçe, Bakiye. Satır tıklanınca kart: Bilgiler · Cari · Sevkiyatlar · Belgeler.
- **Şoför:** Ad, Telefon, Plaka (varsa), Ehliyet bitiş, Belge uyarısı (tek simge). Kart: Bilgiler · Hesap · Sevkiyatlar · Belgeler.
- **Personel:** Ad, Maaş, Kalan. Kart: Bilgiler · Avans/Prim · Ödemeler.
- **Sabit ödeme:** Başlık, Tutar, Son ödeme, Durum. Ay seçici üstte.

**Kabul ölçütü:** Beş liste sayfası aynı yerleşim ve aynı düğme konumuyla çalışır.

### 8.8 Öz Mal: Giderler, Mazotlar, Araç Masrafları, Araçlar
- **Giderler:** üstte kategori çipleri (Yakıt hariç, Yakıt, Bakım, Otoyol, Şoför, Diğer); tablo: tarih, kategori, açıklama, araç, tutar, durum (onay bekliyor / onaylı). Şoför masrafı onayı satır düğmesi. Yakıt girişi ayrı sekmede: Mazotlar.
- **Mazotlar:** Plaka, tarih, istasyon, litre, tutar, km, KM başı maliyet. Toplam altta. Ana düğme "+ Mazot ekle" (sade form: plaka, litre, tutar, km).
- **Araç Masrafları:** araç seçilince o aracın giderleri; toplam.
- **Araçlar:** Öz araçlar ve taşeron araçları sekmeleri (mevcut, korunur). Her satırda tek uyarı simgesi (belge veya bakım); üzerine gelince neyin ne zaman bittiği.

### 8.9 Banka & Çek
- **Bankalar:** hesap kartları, her kartta bakiye büyük, son üç hareket, "Tüm hareketler". Virman ve yeni hesap ikincil düğmelerde.
- **Çekler:** sekmeler: Portföyde · Ciro edilen · Tahsil edilen · Verilen. Vadesi yaklaşanlar üstte; uyarı tek simge.

### 8.10 Analiz (Raporlar)
- **Genel Bakış (ilk sekme):** üstte plaka ve tarih aralığı. Üç rakam: kazanç, gider, net kazanç. Altında tek grafik: son 12 ay net kazanç. Altında "Kâr kırılımı" tablosu: piyasa sevkiyat, öz mal sevkiyat, mazot, gider, personel. Nakit akışı tablosu burada.
- **Diğer sekmeler:** Sevkiyat kazancı, Araç, Şoför, Müşteri, Yaşlandırma, Muhasebe aktarımı. Her sekme tek tablo ve (varsa) tek grafik. Üstte aynı tarih seçici.
- Excel ve PDF "⋯" menüsünde.

### 8.11 Yönetici ve Profilim
- **Yönetici:** Firma · Kullanıcılar · İşlem Geçmişi · Veri Aktarımı · Yedek ve Veri · Abonelik · Kurulum. Teknik kartlar "Gelişmiş" başlığı altında daraltılmış.
- **Profilim:** Bilgilerim · Şifre · Güvenlik (2 adımlı) · Bildirimler · Görünüm (yazı boyutu, tablo yoğunluğu). Yönetici olmayan kullanıcı yalnızca bunu görür.

### 8.12 Giriş ve şifre sayfaları
Marka bloğu (logo, firma adı), iki alan, tek ana düğme, "Şifremi unuttum". Arka plan düz `#f7f7f5`. Hata: sakin cümle.

### 8.13 Telefon (panel) ve şoför uygulaması
- **Panel telefonda:** alt çubuk (Bugün · Sevkiyatlar · + · Cariler · Menü). Listeler kart. Süzgeç tam ekran. Ana düğme alt çubukta, "+" simgesi.
- **Şoför uygulaması (ayrı akış):** Ana ekran: bugünkü görevlerim, her görev kartında yükleme ve boşaltma adresi, telefon düğmesi, "Yola çıktım" ve "Teslim ettim" büyük düğmeler. Fotoğraf ve belge alt sekme. Masraf: tek büyük "Masraf ekle" düğmesi, tür seçici, fotoğraf. Çevrimdışıyken kayıt sıraya girer.
- Şoför uygulamasında tek bir ana eylem olmalı: o an yapılacak iş.

---

## 9. Çekirdek iş akışları ve tık hedefleri

Hedef: en sık 10 iş yardım almadan yapılmalı. Bugünkü tık sayısı ve hedef:

| # | İş | Bugün (tahmin) | Hedef |
|---|---|---|---|
| 1 | Yeni sevkiyat girmek | 3 tık + form | "+ Sevkiyat Ekle", form, Kaydet: 1 ekran |
| 2 | Bugünkü sevkiyatları görmek | 1 tık | 1 tık (Bugün) |
| 3 | Durum ilerletmek | 1 tık | 1 tık (satır düğmesi) |
| 4 | Sevkiyat bulmak | arama + enter | arama + enter |
| 5 | Teslim edilenleri faturalamak | 4-5 tık | 3 tık |
| 6 | Müşteri ekstresi | 3 tık | 2 tık |
| 7 | Tahsilat girmek | 3 tık + form | 2 tık + form |
| 8 | Tedarikçiye ödeme | 3 tık + form | 2 tık + form |
| 9 | Mazot girmek | 3 tık + form | 1 tık + kısa form |
| 10 | Aylık kazanç | 2 tık | 1 tık |

Ölçüm: Faz 0'da bugünkü tık sayıları müşteriyle birlikte ölçülür; Faz 7'de yeniden ölçülür.

---

## 10. Araştırma ve doğrulama planı

Bu planın en zayıf noktası kullanıcıdan gelen bilginin azlığı. Üç yöntem:

### 10.1 Müşteri görüşmesi (Faz 0)
- 45 dakika, operasyon sorumlusu ve muhasebe ile ayrı ayrı.
- Ekran kaydı: müşteri kendi bilgisayarında üç iş yapar (sevkiyat girmek, bir sevkiyatı faturalamak, bir müşterinin ekstresini çıkarmak). Veriler kayıt dışında tutulur, depoya girmez.
- Sorular: Hangi ekranda takılıyorsun? Hangi düğmeyi aramak zorunda kalıyorsun? Pratikortam'da en çok ne seviyorsun? Burada neyi bulamıyorsun?

### 10.2 Kısa kullanıcı testi (Faz 0 ve Faz 7)
- 5 kişi (müşteri ekibi ve iki kişi dışarıdan). Her biri 10 iş görevini yapar, yardım almaz.
- Ölçü: tamamlama oranı, süre, takılma noktası. Hedef: 10 işin en az 9'u, her biri için ortalama süre pratikortam'dakinden kısa.

### 10.3 Erişilebilirlik ve performans
- Tarayıcıda WCAG AA kontrolü (renk karşıtlığı, odak sırası, klavye). Otomatik araç + elle kontrol.
- Sayfa yükleme: ana sayfa 2 saniyenin altında (bağlantı iyi iken).
- Tablo: 1.000 satırda kaydırma akıcı olmalı (sanal kaydırma gerekirse eklenir).

---

## 11. Uygulama aşamaları

Her aşama: amaç, işler, çıkış ölçütü, müşteri onayı. Süreler tek kişi + yapay zekâ ajanları varsayımıyla. Her aşama canlıya ayrı çıkar; eski görünüm aşama bitene kadar çalışır.

### Faz 0: Karar ve ölçüm (1 hafta)
- Müşteri görüşmesi ve ekran kaydı (10.1).
- Bugünkü tık sayıları ölçülür (bölüm 9).
- Bölüm 14'teki kararların alınması.
- Çıkış: kararlar yazılı, ölçümler belgeli, yazı tipi seçildi.

### Faz 1: Tasarım sistemi (2 hafta)
- Jetonlar: renk, yazı ölçeği, boşluk, köşe, gölge (bölüm 6). `index.css` tek kaynak olur.
- Ortak parçalar yeniden yazılır: düğme, alan, rozet, kart, tablo iskeleti, başlık, boş durum, sağ panel, açılır pencere, süzgeç satırı, süzgeç paneli, "⋯" menüsü.
- Eski ortak parçalar kaldırılır (ölü kod temizliği).
- Görsel regresyon: her ekran için 1440×900 ve 390×844 görüntüsü, önceki ile karşılaştırma.
- Çıkış: bir örnek sayfa (Sevkiyatlar) yeni tasarım sistemiyle, müşteri onaylı.

### Faz 2: Bugün, Sevkiyatlar, Sevkiyat formu (2 hafta)
- Bölüm 8.1, 8.2, 8.3.
- Çıkış: kabul ölçütleri (bölüm 8) karşılandı; e2e testleri güncellendi; müşteri ile bir gün kullanım.

### Faz 3: e-Fatura, Cari, Tahsilat, Ödeme (2 hafta)
- Bölüm 8.4, 8.5, 8.6.
- Karışık KDV uyarısı, toplu fatura, ekstre, ekstreden tahsilat.
- Çıkış: iş akışı 5, 6, 7, 8 numaralı hedefleri karşılandı.

### Faz 4: Listeler, Öz Mal, Araçlar (2 hafta)
- Bölüm 8.7, 8.8.
- Mazot ve araç masrafları ayrı ekranlar.
- Çıkış: beş liste sayfası aynı iskelet, mazot 1 tıkla girilir.

### Faz 5: Analiz, Banka, Çek, Yönetici, Profilim (1,5 hafta)
- Bölüm 8.9, 8.10, 8.11.
- Analiz Genel Bakış ilk sekme; nakit akışı oraya taşınır.
- Çıkış: aylık kazanç 1 tıkta.

### Faz 6: Boş durumlar, hata durumları, onboarding, yardım (1 hafta)
- Bölüm 7 tamamen.
- Kurulum kartı ve rol bazlı ilk ekran.
- Yardım sayfası yeni ekranlara göre; 30-60 saniyelik kısa videolar (ayrı üretim).
- Çıkış: yeni bir firma kurulumu boş hesapla başlayıp ilk sevkiyata kadar yardımsız gider.

### Faz 7: Telefon, şoför uygulaması, cila (1,5 hafta)
- Bölüm 8.13. Panel telefon görünümü. Şoför uygulamasında tek ana eylem.
- Erişilebilirlik (bölüm 10.3).
- Kullanıcı testi 2 (10.2).
- Çıkış: telefonda 10 iş testi geçer.

### Faz 8: Klasik görünümü kaldırma ve yayın (1 hafta)
- Klasik görünüm kodu silinir (`classicNav`, eski sayfa dalları, `uiMode` anahtarı kaldırılır; tek görünüm).
- Eski adresler yönlendirilir (zaten korunuyor).
- Kullanıcı görüşmesi, sürüm notu, yayın.
- Çıkış: tek görünüm, testler yeşil, müşteri onaylı.

**Toplam:** yaklaşık 12-13 hafta. Faz 2 ve 3 paralel yürütülebilir (ayrı dosya alanları). Şoför uygulaması (Faz 7) panelden bağımsız, paralel yapılabilir.

---

## 12. Teknik notlar ve borç

### 12.1 Mevcut borç
- İki görünüm için iki dal: sayfalarda `isNew ? … : …` dalları ve `classicNav`, `newNav` ayrımı. Faz 8'de kaldırılır.
- Ortak parçalar tekrar ediyor: `PageHeader` ile `PageShell`, `Card` ile yeni kart, iki süzgeç yapısı. Tek parçaya indirgenir.
- Metin ve düğme etiketleri farklı dosyalarda tekrar ediyor. Ortak metin dosyası (`lib/copy.ts`) önerilir; "Sefer" → "Sevkiyat" değişikliği ancak bu dosyayla güvenli olur.
- Lint: 6 uyarı (fast refresh, kullanılmayan değişken). Faz 1'de temizlenir.

### 12.2 Test
- e2e: 62 test, üç dakika. Seçiciler metne bağlı; metin değiştikçe kırılıyor. Faz 1'de rol ve etiket seçicileri (`getByRole`) tercih edilir; `data-testid` yalnızca gerektiğinde.
- Görsel regresyon: Faz 1'den itibaren her PR'da ekran görüntüleri üretilir; fark raporu.
- Sunucu: 313 test, değişmez. Yeni uç noktalar için test zorunlu.

### 12.3 Performans
- Sayfalar `lazy` yükleniyor (mevcut). Büyük tablolar için sayfalama (mevcut); 1.000+ satır için sanal kaydırma Faz 7'de değerlendirilir.
- Panel tüm ekranlarda aynı veri çekme kalıbı (`usePaged`, `useLookup`) kullanıyor; tekrar eden sorgular `staleTime` ile azaltılır.

### 12.4 Erişilebilirlik
- Sekmeler: `role="tablist"`, ok tuşları ile gezinme.
- Sağ panel ve açılır pencere: odak tuzağı, Esc ile kapanma.
- Renk tek başına anlam taşımaz: durum etiketinde metin de var.
- Dokunma hedefi telefonda en az 44 px.

### 12.5 Veri ve KVKK
- Kullanım ölçümü (hangi düğmeye basıldı) yalnızca sayaç olarak, kişisel veri olmadan tutulur. Kişi bazlı izleme yok.
- Örnek veri gerçek kişi ya da VKN içermez (mevcut uygulama uyuyor).

---

## 13. Riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Müşteri yeni düzene alışamaz | Orta | Yüksek | Faz 0 ve Faz 2 sonunda birlikte kullanım; eski görünüm Faz 8'e kadar kalır |
| Yazı tipi kararı tekrar tekrar değişir | Yüksek | Orta | Faz 0'da kesin karar, yazılı; sonradan değişiklik ayrı istek |
| Kapsam büyür (her ekrana yeni özellik) | Yüksek | Yüksek | Bu plan dışı her istek ayrı listeye; faz başında donduruluyor |
| Testler kırılır, zaman yenmez | Yüksek | Orta | Rol seçicilere geçiş; her fazda test güncellemesi fazın işi |
| Pratikortam alışkanlığı ile sadelik çelişir | Orta | Orta | Ad ve sıra korunur; içerik sadeleşir; kullanıcı testleri ile doğrulanır |
| Şoför uygulaması ayrı bir iş olarak büyür | Orta | Orta | Faz 7'de yalnız iki ekran (görevler, masraf); fotoğraf ve belge sonraya |
| Yasal konular (UETDS, e-Fatura, KVKK) plan dışı hız kazanır | Orta | Yüksek | Bu planda yasal yükümlülükler dışarıda; ayrı yol haritası (docs/UETDS.md, docs/ENTEGRATOR-EKLEME.md) |
| Yapay zekâ ajanlarının yaptığı sessiz değişiklikler | Orta | Yüksek | Her PR için ekran görüntüsü ve test sonucu; tek kişi onayı |
| Tek kişi bağımlılığı | Yüksek | Yüksek | Belgeler, görev kartları, karar kaydı; AGENTS.md güncel tutulur |

---

## 14. Kullanıcının kararları (önce bunlar)

Uygulamaya başlamadan şu kararlar gerekir:

1. **Yazı tipi:** Seçenek A (tırnaklı başlık, düz gövde; öneri) mi, Seçenek B (hepsi düz) mi?
2. **Tek görünüm:** Klasik görünüm Faz 8'de tamamen kaldırılsın mı? (Öneri: evet.)
3. **Yazı boyutu varsayılanı:** 17 px mi, 18 px mi? (Öneri: 17 px; "Büyük" 19 px.)
4. **"Sefer" → "Sevkiyat":** her yerde yazılsın mı? (Öneri: evet, terim tablosu zaten bu yönde.)
5. **UETDS rozeti:** satırdan kaldırılsın, süzgeçte kalsın mı? (Öneri: evet.)
6. **Demo uyarısı:** yalnız yönetici görsün mü? (Öneri: evet.)
7. **Kontrol listesi (Bugün):** en fazla üç madde yeterli mi?
8. **Tasarım dili:** Hark tasarımındaki çivit vurgu ve yuvarlak köşeler korunsun mu, yoksa bu planın kare-yuvarlak dengesi mi? (Öneri: Hark'ın çivit vurgusu, bu plandaki köşe ölçüleri.)
9. **Müşteri görüşmesi:** hangi gün, kim katılacak?
10. **Faz sırası:** önce Bugün-Sevkiyatlar (Faz 2) mı, yoksa önce tasarım sistemi (Faz 1) mi? (Öneri: Faz 1 önce; yoksa her ekran yeniden değişir.)

---

## 15. Codex ve Claude için görev kartları

Her kart tek oturumda bitecek büyüklükte. Sıra önemli. Her karttan sonra: test, ekran görüntüsü, commit, push. AGENTS.md kuralları geçerli.

**T1 (Faz 0):** `docs/KARAR-KAYDI.md` oluştur; bölüm 14'teki kararları kullanıcı cevaplarıyla yaz. Müşteri görüşme sorularını (10.1) ekle. Kod değişikliği yok.

**T2 (Faz 1):** `client/src/index.css` jetonlarını bölüm 6'ya göre yeniden yaz. Yazı ölçeğini ve boşlukları tek yerden ayarla. Sayfalara sabit değer kalmamasını kontrol eden bir lint kuralı veya test ekle (en azından grep kontrolü). Tüm e2e testlerini yeşil tut.

**T3 (Faz 1):** Ortak parçaları yeniden yaz: `Button`, `Field`, `Badge`, `Card`, `PageHeader`, `Empty`. Eski varyantları kaldır; kullanan sayfaları güncelle.

**T4 (Faz 1):** `DataTable` iskeletini bölüm 6.5'e göre yeniden yaz: yapışkan başlık, sayı hizalaması, satır yüksekliği, satır sonu "⋯" yeri. Sanal kaydırma değerlendirmesi notu ekle.

**T5 (Faz 1):** Süzgeç satırı (`FilterBar`) ve süzgeç paneli (`FilterPanel`) bileşenlerini tek bileşen haline getir. Sevkiyatlar'ı yeni bileşenle yeniden bağla.

**T6 (Faz 1):** `lib/copy.ts` oluştur; düğme ve başlık metinlerini topla. "Sefer" → "Sevkiyat" değişikliğini yalnız bu dosyadan yap (karar 4 onaylıysa).

**T7 (Faz 2):** Bugün ekranını bölüm 8.1'e göre yeniden yaz. Kabul ölçütleri için test ekle.

**T8 (Faz 2):** Sevkiyatlar liste ekranını bölüm 8.2'ye göre yeniden yaz. Tek süzgeç satırı, tek toplam şeridi, satır menüsü, UETDS rozetini süzgece taşı.

**T9 (Faz 2):** Sevkiyat formunu bölüm 8.3'e göre yeniden yerleştir (iki sütun, katlı "Diğer bilgiler", sabit alt çubuk). Mevcut davranışlar (formu açık tut, kopya sayısı, KDV özeti, akıllı alanlar) korunur.

**T10 (Faz 3):** e-Fatura bölümünü bölüm 8.4'e göre yeniden düzenle: Faturalandırılacaklar varsayılan, sayaçlar, toplu fatura, karışık KDV uyarısı.

**T11 (Faz 3):** Cari ekranlarını bölüm 8.5 ve 8.6'ya göre yeniden düzenle. Sütun sayısını altıya indir, devir ve iptal sütunlarını "Diğer" panelinde tut.

**T12 (Faz 3):** Ekstre ve ekstreden tahsilat akışını bölüm 8.5'e göre yaz (açık faturaları işaretleyerek kapatma).

**T13 (Faz 4):** Listeler (müşteri, tedarikçi, şoför, personel, sabit ödeme) için tek iskelet kullan. Sayfa başlığı, düğme ve arama yerleşimi aynı olsun.

**T14 (Faz 4):** Öz Mal bölümünü bölüm 8.8'e göre ayır: Giderler (kategori çipleri, onay), Mazotlar (ayrı ekran, 1 tıkla giriş), Araç Masrafları, Araçlar (tek uyarı simgesi).

**T15 (Faz 5):** Analiz ekranını bölüm 8.10'a göre yeniden düzenle. Genel Bakış ilk sekme; nakit akışı oraya taşınır; grafik tek.

**T16 (Faz 5):** Bankalar kart görünümü ve Çekler sekmeleri (bölüm 8.9). Yönetici ve Profilim ayrımı (bölüm 8.11).

**T17 (Faz 6):** Boş durumlar, hata durumları, kurulum kartı ve rol bazlı ilk ekran (bölüm 7). Örnek veri rozeti ve tek tıkla temizleme.

**T18 (Faz 6):** Yardım sayfasını yeni ekranlara göre güncelle. Her ana iş için kısa adım listesi (video üretimi ayrı iş).

**T19 (Faz 7):** Panel telefon görünümü (bölüm 8.13): alt çubuk, kart listeler, tam ekran süzgeç. Hedef boyut 390×844; yatay kaydırma yok.

**T20 (Faz 7):** Şoför uygulamasında tek ana eylem ekranı ve masraf akışı (bölüm 8.13). Çevrimdışı kayıt sırası.

**T21 (Faz 7):** Erişilebilirlik taraması ve düzeltmeler (bölüm 12.4). Klavye ile tüm ana iş akışları.

**T22 (Faz 8):** Klasik görünümü kaldır: `classicNav`, `uiMode` anahtarı, sayfa içi `isNew` dalları, eski parçalar. Tek görünüm. Eski adreslerin yönlendirmesini doğrula. Tüm testleri güncelle.

---

## 16. Başarı ölçütleri

Plan bittiğinde şunlar doğru olmalı:
- Müşteri, yardım almadan 10 işin en az 9'unu yapabiliyor.
- Her iş pratikortam'dakinden daha kısa sürüyor (ölçüm bölüm 9).
- Sevkiyatlar ilk ekranda en az 8 satır gösteriyor (1440×900).
- Ana sayfada en fazla bir ana düğme ve üç rakam var.
- Tek görünüm, tek tasarım sistemi; klasik görünüm kodu yok.
- Telefonda 10 iş testi geçiyor.
- Tüm testler yeşil (e2e, sunucu, lint, build).
- Müşteri "ham değil" diyor. Bu, en önemli ölçüt; kanıtı ekran görüntüsü karşılaştırması ve bir kullanıcı görüşmesi.

---

## 17. Bu belgenin sınırları

- Rakip panelleri açılmadı; ekran karşılaştırması yapılmadı. Bölüm 3, sunulan özellik ve konumlandırma karşılaştırmasıdır. Ekran benzerliği için bir demo hesabı ile manuel inceleme gerekir (öneri: Faz 0'da Nakpro ve Datatruck'ın deneme sürümleri 30 dakikalık incelenir).
- Fiyatlar ve modül sayıları değişebilir; kaynakları bölüm 3 ve 18'de.
- UETDS, e-Fatura entegratörü, GPS ve yasal konular bu planın kapsamı dışında; ayrı yol haritalarında.
- Süreler tahmindir.
- Müşterinin asıl şikâyetinin ne olduğu, ekran kaydı ve görüşme yapılmadan kesin bilinmiyor. Faz 0 bu belirsizliği kapatır.

---

## 18. Kaynaklar

**Rakip (site ve arama özeti):**
- Nakpro: https://nakpro.web.tr/ (modüller, 6 aylık 400 TL + KDV, ana ekran tanımı)
- Kiraz Yazılım: https://www.kirazyazilim.com/ , https://www.nakliyeyazilim.com/ (modül sayıları, UETDS, EDM, 14 gün deneme)
- Lojiper: https://www.lojiper.com/ , https://www.lojiper.com/cozumler/lojistik-yazilimi.html (web ve mobil, şoför uygulaması, müşteri portalı, tur raporu)
- Divizyon: https://www.divizyon.com/nakliye-takip-sistemi/ (arama özeti: lisans paketleri ve fiyatlar)
- Datatruck: https://www.datatruck.io/blog/how-much-does-tms-software-actually-cost (kendi blogu; fiyat ve kademeler, doğrulanmalı)
- Kamyoon: https://www.kamyoon.com/ (TMS modülleri, ücretsiz başlangıç), https://www.kamyoon.com/nakliye-fiyati-hesaplama (navlun hesaplama)
- Truckpedia, Axele, TruckingOffice, Ascend, Tailwind: arama özetleri; fiyatlar değişebilir.

**UX (arama özeti, yayın blogları):**
- Boş durum ve onboarding yönleri: kompassify.com, saasui.design, nudgesaas.com (ve benzerleri).
- Dashboard ilkeleri: saasfactor.co, flowmazeux.com.
Bu kaynaklardaki özel istatistikler doğrulanamadı; yalnızca yön olarak kullanıldı.

**Proje içi:**
- `docs/TASARIM-HARK.md` (mevcut görsel dil)
- `docs/PRATIKORTAM-HARITA.md` (eski program ekranları)
- `docs/KOLAYLASTIRMA-PLANI.md`, `docs/KOLAYLASTIRMA-UYGULAMA.md` (önceki kolaylaştırma planı; bu belge onun devamıdır)
- `docs/UYGULAMA-DURUMU.md`, `AGENTS.md`
