# YES Lojistik — Tam Geliştirme ve Geçiş Planı

**Sürüm:** 1.0 · **Tarih:** 4 Ekim 2026 · **Durum:** Kullanıcı cevaplarına göre hazırlanmış uygulama planı; uygulama henüz başlamadı.

**Depo:** https://github.com/snyusufsubasi/yeslojistik

**İncelenen main commit'i:** `41cc8898350715d454d7c4c1205ff51d0e576197`.

## 1. Hedef ve verilen kararlar

YES Lojistik'in bütün günlük operasyonunu ve para takibini panelden güvenilir biçimde yürütmesini sağlamak; aynı ürünü başka nakliye firmalarına kurulabilir ve satılabilir hâle getirmek. YES'in müşterileri kendi işlerini takip edebilecek ve yeni taşıma/fiyat teklifi talebi açabilecek.

Önce veri ve hesap doğruluğu, ardından günlük kullanım kolaylığı ele alınır. Satış hazırlığı bu çalışmayla birlikte ilerler; gerçek satış ve geçiş, aşağıdaki kabul şartları sağlandığında açılır.

### 1.1 Kullanıcının bu oturumdaki kararları

| Konu | Karar | Plan üzerindeki etkisi |
|---|---|---|
| Ana hedef | YES'in tam geçişi ve satış hazırlığı birlikte | Hem işletme akışı hem ürünleştirme kapsama dahil |
| İlk sorunlar | Veri/hesaplar ve ekran/kullanım | Yeni özelliklerden önce doğruluk ve kullanım |
| Kapsam | Tam yol haritası | Bütün işler kayda alınır; uygulama küçük parçalara bölünür |
| Görünüş | Otoyol korunsun, kullanım iyileşsin | Yeni tasarım arayışı yapılmaz |
| Geçiş zamanı | Hazır olunca | Takvim tarihi yerine doğrulanmış geçiş koşulları |
| Portal kullanıcısı | YES'in yükünü taşıdığı müşteriler | Yazılımı alan nakliye firmasıyla yük sahibi müşteri ayrılır |
| Para takibi | Tüm günlük para işleri | Cari, fatura, tahsilat, ödeme, banka/kasa, çek ve giderler |
| Dış bağlantılar | E-Fatura, UETDS, GPS bilgileri henüz yok | Doküman ve test erişimi gelmeden gerçek adaptör yazılmaz |
| Müşteri portalı | Gör/indir ve talep oluştur | Talepler YES onayından geçer; müşteri doğrudan sevkiyat açamaz |
| Ekran önceliği | Hepsini incele ve sırala | Ana sayfa, sevkiyat, cari ve para ekranları birlikte incelenir |
| Altyapı | Gerekli masrafı planla | Ücretli DB, yedek ve barındırma değerlendirilir; satın alma ayrıca kararlaştırılır |

### 1.2 Korunan önceki kararlar

- Sol menünün grupları masaüstünde sürekli açık kalır; daraltma düğmesi eklenmez.
- Öz araçlar ve kiralık/taşeron araçlar ayrı sekmelerdedir; varsayılan öz araçlardır.
- `Aa` yazı boyutu seçenekleri korunur. Source Serif 4 ve Overpass Mono korunur; gerçek ölçüler koddan doğrulanır.
- Para iki kuruş basamağıyla, tarih Türkçe biçimde, plaka büyük harf ve boşluklarla gösterilir.
- Başka nakliye firmalarına başlangıçta ayrı kurulum yapılması, mevcut satış planından korunan yaklaşımdır. Ortak çok firmalı veritabanı bu sürümün zorunlu işi değildir.
- Terim tablosu henüz onaylı değildir. Bu belgede anlatım için “sevkiyat” kullanılması, ekranlardaki toplu terim değişikliğine onay sayılmaz.

### 1.3 Kullanıcı cevaplarından çıkarılan kapsam

Panel operasyon ve günlük para takibini kapsar. Muhasebecinin resmî muhasebe/beyanname işini üstlenmek bu sürümün hedefi değildir. Muhasebe programına bağlantı ileride adı ve ihtiyaçları öğrenilerek planlanabilir.

Ofisteki kişi sayısı, kesin roller, şoför uygulamasının ilk geçişte kullanılıp kullanılmayacağı ve ilk pilot firmalar henüz belirlenmedi. Yetki ve mobil kabul oturumunda netleştirilir; bunlar mevcut müşteri portalıyla karıştırılmaz.

## 2. Mevcut durum ve kanıt sınırı

Bu belge tam bir kod güvenlik denetimi veya ekranların kullanıcıyla kabul testi değildir. Depo belgeleri, dosya ağacı, bazı kritik servisler ve gerçek CI kayıtları incelenerek hazırlanmıştır. Tam inceleme ilk iş paketidir.

| Konu | 4 Ekim kontrolü | Nasıl ele alınacak? |
|---|---|---|
| Main ve canlı sürüm | Canlı `/api/health` incelenen commit'i gösterdi | Her yayında commit eşleştirilir |
| Son CI | İncelenen commit'in CI çalışması başarıyla tamamlandı | Yerel ve CI doğrulaması uygulama öncesi yeniden yapılır |
| Sunucu testleri | Son CI logunda 302 geçti, 0 başarısız, 0 atlanan | Sayı referanstır; değişikliklerle artabilir |
| Panel | CI lint/build başarılı; 2 bilinen lint uyarısı | Yeni uyarı/hata eklenmez |
| Mobil | CI tip kontrolü ve Android dışa aktarımı başarılı | Değişen mobil akış ayrıca doğrulanır |
| Tarayıcı testleri | Önceki commit'in logunda 47 geçti; son CI da başarılı | Son commit'in ayrıntılı test sayısı ayrıca kaydedilir |
| Yerel çalışma | Bu oturumda clone için Git kimlik doğrulaması yok; .NET/PostgreSQL hazır değil | Ortam kurulmadan yerel test geçmiş sayılmaz |
| Tedarikçi cari | `CariService` alınan faturaları borca dahil ediyor | Eski “faturalar hiç sayılmıyor” maddesi yeniden geliştirme işi değildir; tutarlılık testleri gerekir |
| Alınan fatura kaydı | `PurchaseInvoiceService.CreateAsync/UpdateAsync` transaction kullanıyor | Mevcut çözüm korunur; hata/iptal/eş zamanlı işlem senaryoları doğrulanır |
| Demo sıfırlama | `HasSampleData` kontrolü, alış faturası tablosu ve audit kaydını koruma var | Gerçek veriyle karışmış demo durumunun ve yeni tablo ilişkilerinin güvenliği doğrulanır |
| Otomatik durum e-postası | `CustomerNotifier` ve `CustomerNotifyTests` mevcut | Sıfırdan yapılmaz; kalıcı kuyruk, tekrar deneme, geçmiş ve şablonlar tamamlanır |
| Tam geçmiş | `MirrorSnapshot` finansal fatura/ödeme/hareket koleksiyonlarını henüz içermiyor | Öncelikli aktarım işi |
| Portal | Tekil takip linki var; hesaplı müşteri portalı dosya ağacında bulunmadı | Ayrı müşteri yetkisiyle geliştirilir; mevcut takip akışı korunur |
| Dokümanlar | Bazı eski “eksik” ve “kaldığımız yer” bölümleri güncel kodla çelişiyor | Önce doğrulanmış iş listesi çıkarılır |

**Kaynak belgeler:** `AGENTS.md`, `CLAUDE.md`, `docs/YOL-HARITASI.md`, `docs/SATIS-PLANI.md`, `docs/GELISTIRME-PLANI.md`, `docs/PRATIKORTAM-HARITA.md`, `docs/TASARIM-OTOYOL.md`, `docs/TERIMLER.md`, `docs/CODEX-PROMPTLARI.md`, `.github/workflows/ci.yml` ve `render.yaml`.

**CI kanıtı:** https://github.com/snyusufsubasi/yeslojistik/actions/runs/37204178059

## 3. Çalışma kuralları

1. Pratikortam canlı kullanımda kalır; yalnız okuma, listeleme ve dışa aktarma yapılır. Form gönderme/kaydetme/silme yoktur. Girişini kullanıcı yapar.
2. Gerçek müşteri, VKN, tutar, evrak ve anlık veri görüntüsü Git'e girmez. Testlerde yapay veri kullanılır.
3. Şifre, token, özel anahtar dosyalara veya komutlara yazılmaz. İlgili ortam değişkenlerini/secret'ları kullanıcı girer. Lisans özel anahtarı kullanıcıda kalır.
4. Canlı veri aktarımı, geri yükleme, ayna kapatma ve gerçek para/resmî bildirim işlemlerinden önce gereken yedek ve açık onay alınır.
5. Kod önce yerelde doğrulanır; commit, güncel main ile rebase ve push ardından CI/canlı sürüm kontrol edilir. Test edilemeyen kod main'e gönderilmez.
6. Mevcut kurala göre main üzerinde çalışılır. Kullanıcı istemeden yan dal/PR açılmaz. Aynı dala eş zamanlı iki oturum yazmaz.
7. Migration yalnız ekleme yapar. Mevcut veriyi değiştirmek gerekiyorsa ayrı, önizlemeli ve onaylı veri işlemi tasarlanır.
8. Ayna koruması ve lisans koruması yeni endpoint'lerde de korunur. Müşteri talep kuyruğu için gerekirse dar kapsamlı ayrı bir izin tasarlanır; genel koruma devre dışı bırakılmaz.
9. Dış API alanları, mevzuat ve sağlayıcı maliyetleri uygulama zamanında birincil kaynaklarla doğrulanır. Bilgi yoksa “bloklu” kalır.
10. Bir iş paketi tamamlanmadan diğeri yarım bırakılarak başlanmaz. Büyük paketler incelenebilir küçük teslimlere bölünür.

## 4. Hedef iş akışı

### 4.1 Ofis akışı

İş talebi veya müşteri talebi alınır → gerekiyorsa fiyat teklifi hazırlanır → ofis onaylar → tek sevkiyat oluşturulur → araç/şoför atanır → yükleme/yol/teslim durumu ilerletilir → teslim evrakı doğrulanır → satış ve alınan faturalar bağlanır → tahsilat/tedarikçi ödemesi yapılır → banka/kasa ve cari tutarları aynı kayıtları yansıtır → ekstre ve kazanç raporu alınır.

### 4.2 Yük sahibi müşterinin akışı

Davet bağlantısı → hesap oluşturma → kendi firmasının işleri → sevkiyat ve teslim evrakı → kendi faturaları/ekstresi → yeni taşıma veya fiyat teklifi talebi → YES incelemesi → teklif/onay → müşteriye durum gösterimi.

Müşteri, başka müşteriyi, YES'in araç maliyetini, tedarikçi fiyatını, kârını, banka hesaplarının tamamını ve yönetici ekranlarını göremez. Talep kabulü otomatik finansal kayıt ya da resmî bildirim üretmez.

### 4.3 Başka nakliye firmasının kurulumu

Ayrı kurulum → firma bilgileri → lisans/deneme → kendi verisinin önizlemeli aktarımı → roller → gerekli sağlayıcı ayarları → yedek/geri yükleme provası → eğitim → kabul. YES'e ait Pratikortam hesabı veya verisi yeni firmaya taşınmaz.

## 5. Öncelikler ve aşamalar

**P0:** veri kaybı, yanlış hesap veya yetkisiz erişimi engelleyen işler; geçişi durdurur.

**P1:** günlük kullanım ve ilk müşteri portalı için gereken işler.

**P2:** satış, otomasyon ve tamamlayıcı operasyon işleri.

**P3:** kullanım/pilot ihtiyacı doğrulanınca yapılacak genişlemeler.

| Aşama | Çıktı | Öncelik | Başlama koşulu | Bitirme koşulu |
|---|---|---|---|---|
| F0 | Çalışan ortam ve doğrulanmış iş listesi | P0 | Planın uygulanmaya alınması | Testler çalışıyor; eski/yeni bulgular ayrılmış |
| F1 | Güvenilir veri ve yayın altyapısı | P0 | F0 | Yedek/geri yükleme ve test ortamı doğrulanmış |
| F2 | Tam geçmiş aktarımı ve mutabakat | P0 | F0; canlı prova için F1 | Tüm finansal kayıtlar ve hesaplar açıklanmış biçimde eşleşiyor |
| F3 | Finansal kuralların sağlamlaştırılması | P0 | F0; F2 ile ortak model | Kritik finansal senaryolar ve eş zamanlı işlemler doğrulanmış |
| F4 | Ekranlar ve hızlı günlük kullanım | P1 | F0 incelemesi | Öncelikli ekran akışları ve görsel kabul tamam |
| F5 | Portalın giriş, görünürlük ve talepleri | P1 | F1 ve yetki temeli | Başka müşteri verisine erişim engellenmiş; talepler ofise düşüyor |
| F6 | Teklifler ve güvenilir bildirimler | P1/P2 | F3; müşteri talepleri için F5 | Kabul edilen teklif tek sevkiyata dönüşüyor; bildirimler izlenebiliyor |
| F7 | Resmî ve GPS entegrasyonları | Bilgiye bağlı | Doküman/test erişimi | Sağlayıcı testleri ve kullanıcı canlı açılış onayı |
| F8 | Prova, eğitim ve YES geçişi | P0/P1 | F1–F4; operasyonun gerektirdiği F7 | Tam geçiş kontrol listesi geçti |
| F9 | Satış ve pilot kurulumları | P2 | F1, F3, ilgili F5–F7 | Kurulum ve destek pilotta doğrulandı |

F4, F5 ve satış dokümanları teknik olarak bağımsız parçalar hâlinde ilerleyebilir. Veritabanı/model değişiklikleri tek sorumlu akışta birleştirilir; aynı dala eş zamanlı yazılmaz. Plan bütün işi kapsar; tek oturum bütün aşamaları bitirmek zorunda değildir.

## 6. F0 — Ortam, inceleme ve güncel iş listesi

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F0.1 | Git erişimi ve güncel main çalışma kopyası | Okuma/yazma yolu doğrulanmış; yerel durum temiz; başlangıç SHA'sı kaydedilmiş |
| F0.2 | .NET 10, Node 22, PostgreSQL 16, EF aracı, Playwright Chromium | Sunucu, panel, mobil ve e2e testleri çalıştırılabilir |
| F0.3 | Başlangıç testlerini yeniden çalıştır | Gerçek geçen/kalan/atlanan sayılar; lint/build ve model uyumu kaydı |
| F0.4 | Ana akışları sahte verilerle baştan sona incele | İş talebi → sevkiyat → faturalar → para → ekstre akış haritası |
| F0.5 | Eski bulguları kodla karşılaştır | Her madde “mevcut ve doğrulandı / kısmen / eksik / incelenecek / bloklu” durumunda |
| F0.6 | Ekran envanteri ve öncelik | Ana sayfa, sevkiyat, cari, faturalar, para, araç, personel, ayarlar için sorun/etki/çözüm listesi |

**Somut teslim:** güncel görev tablosu, yerel test raporu, sahte veriyle temel ekran görüntüleri. Mevcut test kırığı çıkarsa yeni özellik geliştirmeden önce kök nedeni çözülür; test silinmez veya atlanmaz.

**Bu oturumdaki sınırlama:** GitHub bağlayıcısının yazma izni, kabukta Git kimlik doğrulaması bulunduğu anlamına gelmez. Kod uygulamasına başlamadan çalışma kopyası ve test çalıştırma yolu gerçekten kurulmalıdır. Gerekirse kullanıcı mevcut Codex/GitHub çalışma ortamını bağlar; şifre/token sohbete alınmaz.

## 7. F1 — Veri güvenliği, yayın ve barındırma

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F1.1 | Canlı DB planı ve süresini doğrula | Gerçek Render kaydıyla son tarih ve kapasite kaydedilmiş |
| F1.2 | Ücretli altyapı seçeneklerini maliyetlendir | DB, uygulama, dosyalar, e-posta, yedek, trafik toplamı; satın alma kararı kullanıcıda |
| F1.3 | Otomatik şifreli yedek ve başarısızlık takibi | Son başarılı yedek görülebilir; hata fark edilebilir; anahtarlar koda girmez |
| F1.4 | Ayrı ortamda geri yükleme provası | Veritabanı ve gerekli dosyalar açılır; kayıt sayıları/örnek ekstreler doğrulanır |
| F1.5 | Yayını CI başarısına bağlama | Kırmızı CI ile yeni sürüm canlıya çıkmaz; uygun Render yolu güncel dokümanla doğrulanır |
| F1.6 | Ayrı test ortamı ve izlenebilir sürüm | Gerçek veri içermeyen test ortamı; health'te SHA; geri dönülecek sürüm belli |
| F1.7 | Dosya ve kapasite ihtiyacını belirle | DB içindeki evrak boyutu ölçülür; harici depoya ihtiyaç ve maliyet belirlenir |

Eski belgelerde ücretsiz DB'nin **28 Ekim 2026'da silineceği** yazıyor. Bu oturumda sağlayıcının güncel hesabından doğrulanmadı; F1.1 ilk işlerdendir. Tam geçiş hazır olmasa da mevcut gerçek veriyi koruyan altyapı kararı bekletilmez.

Yedek planı yalnız “dosya oluşturuldu” testiyle kapanmaz. Geri yükleme süresi, kaybedilebilecek son kayıt aralığı, saklama süresi ve erişim yetkisi kullanıcıyla belirlenir. Fatura/evrak saklama yükümlülükleri mali müşavir/avukatla doğrulanır; plan bu süreleri kendiliğinden varsaymaz.

## 8. F2 — Tam geçmiş aktarımı

### 8.1 Veri kapsamı

| Veri grubu | Gereken alan ve ilişki | Kontrol |
|---|---|---|
| Müşteri/tedarikçi | Kaynak ID, kimlik, devir ve kaynak kapanış bakiyesi | Aynı cari iki kez açılmaz |
| Sevkiyat | Kaynak ID, gerçek durum, müşteri/taşeron/araç/şoför, KDV, tevkifat, komisyon, masraf, evrak bağlantıları | Eksik alan sessizce varsayılanla doldurulmaz |
| Satış faturası | No, tarih/vade, müşteri, satırlar, matrah, KDV, tevkifat, durum/iptal, sevkiyatlar | Hesaplara bir kez girer |
| Alınan fatura | Tedarikçi, belge türü, no/tarih/vade, tutarlar, bağlı sevkiyatlar | Taşeron borcu çift sayılmaz |
| Tahsilat | Kaynak ID, müşteri, tarih, yöntem, hesap, fatura dağılımı | Aynı tutarlı iki farklı gerçek işlem korunur |
| Tedarikçi ödemesi | Kaynak ID, tedarikçi, tarih, hesap, fatura/sevkiyat dağılımı | Bağlantı ve kalan borç doğru |
| Banka/kasa | Hesaplar, açılış, hareketler, virmanlar, kaynak bakiye | Ödemeyle aynı hareket ikinci kez sayılmaz |
| Gider/personel | Cari ve hesap etkileyen giderler, maaş/avans/prim ve ödemeler | Muhasebe etkisi olan eksik hareket açıklanır |
| Çek/senet | Mevcut/açık kayıtlar, tahsil/ciro/ödeme durumu ve tarihleri | Cari ve banka etkisi yönteme göre tek kez oluşur |
| Dosyalar | Erişilebilen fatura ve teslim evrakı; kaynak dosya kimliği | Eksik/erişilemeyen dosya raporlanır |

Kaynakta olmayan alanlar uydurulmaz. Dövizli kayıt bulunursa mevcut modelin yeterliliği incelenir; kur/tutar kaybetmeden ayrı karar alınır. Müşteri iadesi, müşteriden alınan fatura veya olağan dışı işlem bulunursa eşleme modeli açıkça eklenir.

### 8.2 İş paketleri

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F2.1 | Mevcut çekme/dönüştürme/ayna hattı ve güvenlik sınırları | `extract.mjs`, `transform.py`, `mirror.py`, `LegacyController`, `LegacyMirrorService` ve DTO'lar birlikte haritalanmış |
| F2.2 | Kaynak şeması ve işlem türlerini doğrula | Hangi liste/ayrıntıdan hangi kayıt geliyor; boş/iptal/kısmi kayıtlar belli |
| F2.3 | Finansal koleksiyonlar ve kalıcı kaynak eşlemesi | Kaynak sistem+tür+ID ile benzersiz ilişki; tarih+tutar tahmini anahtar olarak kullanılmaz |
| F2.4 | Çekme ve dönüştürmeyi genişlet | Finansal gruplar ilişki kaybetmeden önizlemeye gelir; bozuk veri silinmez |
| F2.5 | Önizleme ve kuru çalıştırma | Ekle/güncelle/uyarı/hata/eksik kaydı ve bakiye farkı gösterilir; kalıcı iş verisi yazılmaz |
| F2.6 | Gerçek uygulama ve tekrar çalıştırma | Aynı görüntüyü ikinci uygulama 0 yeni kayıt üretir; değişen kaynak kayıtları kontrollü güncellenir |
| F2.7 | Yarıda kesilme, tamamlanmamış görüntü ve silinme | Kaldığı yer belli; eksik kaynak cevabı mali kayıtları silmez; doğrulanmış iptal durumu ayrı işlenir |
| F2.8 | Mutabakat raporu | Her cari ve her hesap için kaynak/panel/fark ve sebep; tür bazında sayılar/tutarlar |
| F2.9 | Prova ve canlı aktarım | Ayrı DB'de prova; onaylı canlı aktarım öncesi yedek; sonrasında tekrar mutabakat |

### 8.3 Finansal aktarımın kritik kuralları

- Panelin bağımsız hesapladığı bakiye ile kaynağın bakiyesi karşılaştırılır. Ekranın zaten kaynak bakiyesini göstermesi mutabakat sayılmaz.
- Önceki devir rakamı ve sonradan taşınan geçmiş birlikte iki kez sayılmaz. Tarih kesimi/devir yöntemi cari ve banka için ayrı belgelenir.
- Tahsilat/ödeme ile banka hareketinin aynı işlemi temsil ettiği durum açıkça bağlanır. Mükerrer para hareketi oluşmaz.
- Tüm cariler, tüm hesaplar ve işlem toplamları kontrol edilir. Rastgele beş kayıt yalnız ek kullanıcı kontrolüdür.
- Hedef, kuruşa yuvarlanan tutarlarda **0,00 TL açıklanamayan farktır**. Eski belgedeki 0,05 TL tolerans otomatik kabul edilmez. Kaynak yuvarlaması gibi farklar sebebi ve kullanıcı kararıyla ayrı istisna kaydına alınır.
- Kaynakta ödenmiş/iptal/taslak belge, panelde yanlışlıkla açık borca dönüşmez.
- Aktarım sırasında müşteriye e-posta, SMS, e-Fatura veya UETDS bildirimi gönderilmez.
- Kaynaktan alınamayan geçmiş ve evrak sessizce “tamamlandı” sayılmaz; boşluk listesi gösterilir.
- Ayna modunun mevcut “kaynakta olmayan kaydı kaldırma” davranışı finansal kayıtlara körlemesine genişletilmez. Eksik sayfa, zaman aşımı veya kısmi dışa aktarım silme/iptal nedeni değildir.

**Geri dönüş:** ilk sürümde onaylı yedekten geri yükleme ve kayıt girişini durdurma prosedürü zorunludur. Paket bazında geri alma eklenecekse yalnız paketin değişikliklerini kapsar; sonradan girilen ofis kayıtlarını silmez. Canlıda gelişi güzel “geri al” işlemi yapılmaz.

## 9. F3 — Hesap doğruluğu ve finansal iş kuralları

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F3.1 | Müşteri bakiye tekliği | Cari liste, müşteri kartı, ekstre, vade raporu ve dışa aktarım aynı kayıt kümesini yansıtır |
| F3.2 | Tedarikçi bakiye tekliği | Faturasız taşeron işi → alınan fatura → ödeme → iptal akışında borç bir kez sayılır |
| F3.3 | Banka/kasa bakiye tekliği | Tahsilat, ödeme, gider, virman ve çek etkileri hesap ekstresiyle tutar |
| F3.4 | Faturalama ve KDV kuralları | Farklı oranlı sevkiyatlar, tevkifat, istisna, kısmi ödeme ve yuvarlama açık kurala bağlı |
| F3.5 | Faturalı sevkiyat düzenleme | Kritik alan değişikliği bağlı faturayı/cariyi sessizce bozmaz; engel veya kontrollü düzeltme akışı vardır |
| F3.6 | Eş zamanlı işlemler | İki kullanıcı aynı işi ikinci kez faturalayamaz/ödeyemez; anlaşılır uyarı alır |
| F3.7 | İptal, silme ve kayıt izi | Finansal kaydın geçmişi, gerekçesi, yapan kişi ve etkisi görünür; bağlantılar yarım kalmaz |
| F3.8 | Güvenli sıfırlama | Gerçek veri durumu korunur; yeni portal/teklif/kuyruk ilişkileri demo temizliğinde doğru davranır |
| F3.9 | Eksik ödeme yöntemleri ve iadeler | Kısmi ödeme, fazla ödeme, iade ve çek etkisi ihtiyaca göre doğrulanır; eksik destek açık iş olarak kalır |

Bu aşama mevcut `BalanceService`, `PayableService`, `CariService`, `CustomerAccountService`, `InvoiceService` ve `PurchaseInvoiceService` kurallarını birbiriyle karşılaştırır. Gereksiz ikinci hesap motoru kurulmaz.

**Test örnekleri:** alınan faturaya bağlanan taşeron işi; bir ödeme birden fazla faturayı kapatıyor; tek fatura kısmen ödeniyor; fatura iptal ediliyor; çek tahsilde/ciro/karşılıksız oluyor; banka virmanı; farklı KDV oranlı işler; eş zamanlı iki fatura isteği. Mevcut veri modeli izin vermiyorsa küçük ve eklemeli model değişikliği yapılır.

Kazanç KDV hariç, cari borç/alacak gerçek ödenecek tutar üzerinden hesaplanır. Banka transferi gider değildir. Raporlarda ödeme ile gider aynı anda ikinci kez düşülmez. Şoför avansı, maaş/prim ve personel giderinin etkisi ayrı tanımlanır. KDV/tevkifat eşikleri güncel resmî kaynak ve mali müşavirle doğrulanmadan yeni mevzuat değişikliği uygulanmaz.

## 10. F4 — Bütün ekranların kullanımını iyileştirme

### 10.1 İnceleme yöntemi

Her ekran için kullanıcı işi, gerekli alanlar, gereksiz tekrarlar, ilk bakışta görülmesi gereken rakamlar, filtre/arama, klavye akışı, mobil davranış ve hata durumları kaydedilir. Gerçek müşteri verisi ekran görüntülerine alınmaz.

Öncelik ölçüsü: hesap/işlem hatasını azaltma → sık yapılan işi hızlandırma → okunabilirlik → görsel tutarlılık. Kullanıcı sahte verili kısa örnek akışla değişikliği görebilir.

| ID | Ekran veya ortak iş | Tamamlanma ölçütü |
|---|---|---|
| F4.1 | Ana sayfa | Bugünün işleri, bekleyen teslim evrakı, fatura/tahsilat ve hatalar; sayılar ilgili filtreye gider |
| F4.2 | Sevkiyat listesi ve form | Arama/filtre/Özet-Detay korunur; fiyat, durum, fatura ve evrak ilişkisi okunur |
| F4.3 | Hızlı kayıt | Kaydet ve Yeni, kopya sayısı, formu açık tut ihtiyaca göre tamamlanır; yanlış çift kayıt engellenir |
| F4.4 | Cari ve kartlar | Bakiyenin kaynağı ve tarihi, borç/alacak anlamı, bağlı hareketlere erişim açıktır |
| F4.5 | Fatura ve para ekranları | Filtre toplamı, kalan tutar, vade ve belge bağlantıları açık; süzgeç çıktıya da uygulanır |
| F4.6 | Ortak toplam şeritleri | Eski `TotalsStrip` kullanan sayfalar `SumStrip`; Personel/Sabit Ödemeler `Figures/Figure`; kiralık etiketi ortak renklerde |
| F4.7 | Form ve klavye | Tab/Ctrl+Enter, odak, doğrulama ve kaydedilmemiş veri uyarısı; mevcut çalışan davranışlar korunur |
| F4.8 | Filtre/sıralama ve arşiv | Eksik listelerde URL'de filtre, arama ve sıralama; aktif/pasif kayıt görünümü |
| F4.9 | Hata ve yüklenme | Boş, hata, yetkisiz, yavaş bağlantı durumları farklı; işlem başarısızken başarılı görünmez |
| F4.10 | Telefon ve erişilebilirlik | Ana akışlar dar ekranda kullanılabilir; odak görünür, düğmeler adlandırılmış, büyük yazıda taşma yok |
| F4.11 | Terimler | `docs/TERIMLER.md` kullanıcıya sunulur; onaydan sonra yalnız görünür metinler değişir |

### 10.2 Pratikortam haritasındaki kalan işler

| Mevcut madde | Plan karşılığı | Kapsam ve karar |
|---|---|---|
| 7 — Evrak türleri ve satırdan onay | F4 + operasyon | Yükleme/teslim evrakı, fotoğraf, irsaliye türü; yetkili onay ve filtre |
| 8 — Verilen çek, kalan tutar | F3 + F4 | Kendi çeki ile ciro edilen müşteri çeki ayrılır; cari/banka etkisi test edilir |
| 9 — Ödemelerde fatura bilgisi/toplu liste | F3 + F4 | Mevcut toplu işlem tekrar yazılmaz; eksik no/tarih/tutar ve ödeme listesi tamamlanır |
| 10 — Kopya sayısı/formu açık tut | F4.3 | İş talebi ve sevkiyat akışlarında ihtiyaca göre uygulanır |
| 11 — Tek sayfa işletme özeti/PDF | F3 + rapor | Gider/personel/operasyon doğru ayrılır; ödeme gider gibi ikinci kez düşülmez |
| 12 — Fatura filtre toplamı | Mevcut çözümü doğrula | Haritada tamamlandı; eski dokümandaki eksik kaydı temizlenir |
| 13 — Yakıt görünümü | F4 sonrası P2 | Fark km, km maliyeti, tüketim hesabı ve eksik km uyarısı |
| 14 — Sevk fişi sözleşmesi | F4 sonrası P2 | Ayardan metin, PDF düzeni; hukuk metni onayı ayrı |
| 15 — Ayrıntılı yetkiler | F3/F5 öncesi temel | Fiyat/kâr, silme, onay, finans ve veri aktarımı ayrılır |
| 16 — Banka ekstresi çıktısı | F3 + F4 | Filtreyle aynı Excel/PDF; açılış/hareket/kapanış tutarları |

Tasarım dosyasıyla `AGENTS.md` arasında yazı ölçüsü gibi farklılıklar varsa mevcut kod ve kullanıcı seçimi esas alınır; eski ölçü listesi nedeniyle yazı küçültülmez. Önce/sonra ekran görüntüleri aynı örnek veriden alınır.

## 11. F5 — Müşteri portalı ve talep akışı

### 11.1 Giriş ve veri ayrımı

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F5.1 | Müşteri kullanıcı modeli | Ofis rolü verilmeden müşteri hesabı; belirli müşteri firmasıyla sunucuda ilişki |
| F5.2 | Davet ve hesap yönetimi | Tek kullanımlık/süreli davet, şifre belirleme/sıfırlama, davet iptali ve erişimi kapatma |
| F5.3 | Yetki kontrolü | Liste, detay, dosya, arama, export ve talep endpoint'leri yalnız kendi firma verisini döndürür |
| F5.4 | Portal ekranları | Kendi sevkiyatları, durum/tarih/güzergâh, teslim evrakları, kendi faturaları ve ekstresi |
| F5.5 | Firma ayarları | Portal aç/kapat; müşteri erişimi yönetimi; kullanım ve kritik işlem geçmişi |

İlk sürümde müşteri başına birden fazla kullanıcı desteklenebilecek yapı tercih edilir. Davet alma yöntemi ve ilk müşteri listesi pilotta belirlenir. Zorunlu 2FA müşteri portalında başlangıç şartı değildir; ofis/yönetici güvenliği ayrı değerlendirilir.

Kritik testler: A müşterisi B'nin sevkiyatını/faturasını/dosyasını/ekstresini/talebini ID değiştirerek veya export filtresiyle göremez. Gönderilen `CustomerId` güvenilir kabul edilmez; müşteri ilişkisi oturumdan alınır. Kapatılmış hesap ve iptal edilmiş davet kullanılamaz. Tekil anonim takip linki hesap portalı yetkisi olarak kullanılamaz.

### 11.2 Yeni taşıma ve fiyat talebi

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F5.6 | Talep formu | Taşıma/fiyat talebi türü, yerler, tarih, yük, miktar/birim, iletişim ve açıklama; zorunlular kısa |
| F5.7 | Ofis talep kutusu | Bekleyen/incelemede/teklif verildi/kabul/reddedildi/iptal gibi açık durumlar; sorumlu ve not |
| F5.8 | Müşteriye durum | Kendi talebinin durumunu ve kendisine açıklanan yanıtı görür; iç notları göremez |
| F5.9 | İşe dönüştürme | Ofis onayıyla mevcut iş talebi/sevkiyat modeline bağlanır; tekrar tıklama ikinci iş açmaz |
| F5.10 | Kötüye kullanım ve dosyalar | İstek sınırı; varsa dosyada tür/boyut ve erişim kontrolü; güvenli hata davranışı |

Müşterinin teklif kabulü, sözleşmenin tamamlandığı veya e-Fatura/UETDS işleminin onaylandığı anlamına otomatik olarak gelmez. Hukuk ve operasyon kuralları ayrıca belirlenir.

**Ayna döneminde:** ilk tercih portalı görünürlük testi için açmak, talep işleme pilotunu tam geçişten sonra başlatmaktır. Daha erken müşteri talepleri alınacaksa yalnız ayrı talep kuyruğuna yazılır; sevkiyat/finans kayıtlarına dönüşüm kapalı kalır. Bu davranış ayna korumasını genel olarak kaldırmadan uygulanır.

**Canlı portal kabulü:** hesap mutabakatı bitmeden eksik finansal geçmiş müşteriye tam ve doğrulanmış ekstre gibi gösterilmez. Müşteri maliyet/kâr/taşeron fiyatını görmez; hangi kişisel evrakı görebileceği ayrıca sınırlandırılır.

## 12. F6 — Teklifler, iletişim ve raporlar

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F6.1 | Fiyat teklifi | Müşteri/talep, güzergâh, yük, fiyat, KDV/tevkifat gösterimi, geçerlilik, not ve durum |
| F6.2 | Teklif PDF ve gönderim | Firma ayarlarından kimlik; okunaklı PDF; gönderilen sürümün kaydı |
| F6.3 | Teklif kabulü ve dönüşüm | Yetkili onayla tek sevkiyat/iş talebi; kabul edilen fiyat sürümü korunur |
| F6.4 | Mevcut durum e-postalarını kalıcı kuyruğa alma | Durum işlemiyle kuyruk kaydı tutarlı; e-posta hatası sevkiyatı geri çevirmiyor |
| F6.5 | Tekrar deneme ve gönderim geçmişi | Bekleyen/başarılı/başarısız, deneme zamanı, tekrar deneme; sır/veri loga gereksiz yazılmaz |
| F6.6 | Tercihler ve şablonlar | Müşteri başına aç/kapat, olay bazlı tercih, düzenlenebilir güvenli şablon |
| F6.7 | WhatsApp/SMS mesaj hazırlama | Metin ve paylaşım bağlantısı; kullanıcı gönderir; gönderildiği doğrulanmadan “gönderildi” yazılmaz |
| F6.8 | Birleşik işletme özeti | Gelir/maliyet/gider/personel/net kazanç ve cari durum; Excel/PDF aynı kuralları kullanır |

Bildirim sağlayıcıları yokken otomatik WhatsApp/SMS gönderimi iddia edilmez. SMTP yapılandırması ve e-posta teslim durumları kullanıcıya anlaşılır biçimde gösterilir. Tekrar eden durum isteği ikinci kuyruk kaydı üretmemelidir; dış e-posta sağlayıcısı desteklemiyorsa mutlak “tam bir kez teslim” garantisi verilmez.

## 13. F7 — Bilgi bekleyen entegrasyonlar

| İş | Gerekli bilgi | Hazır olana kadar yapılabilecek | Canlı açılış şartı |
|---|---|---|---|
| E-Fatura/e-Arşiv | Entegratör adı, güncel API belgesi, test hesabı, fiyat/kontör modeli | Mevcut sağlayıcı soyutlamasını doğrula; gönderim/durum/gelen fatura akışını planla | Test belge ve durumları doğrulandı; mükerrer gönderim korunuyor; kullanıcı onayı |
| UETDS | Firma yetkisi, Bakanlık teknik belge ve test erişimi | Mevcut hazırlık kontrolünü doğrula; eksik alanları ve durum ekranını tamamla | Gönder/güncelle/iptal testleri ve gerçek operasyon gereksinimi doğrulandı |
| GPS | Arvento/Mobiliz veya kullanılan sağlayıcı, API/test erişimi | Mevcut konum akışı, harita ve kesinti davranışını doğrula | Araç eşlemesi ve izin/saklama politikası; veri kesilince son konum zamanı gösteriliyor |
| İyzico | Satıcı kuruluş bilgileri, güncel API belge/test anahtarları, lisans yenileme yetkisi | Sahte ödeme sağlayıcısı, abonelik durum modeli ve testler | Ödeme/webhook doğrulaması, tekrar eden olay koruması, anahtar yönetimi, test ödeme |

Resmî fatura ve taşıma bildirimleri hazırlık kontrolünden farklıdır. “Hazır” etiketi “gönderildi” anlamına gelmez. Sağlayıcı hatası/zaman aşımı sonrası durum sorgulanmadan ikinci gerçek gönderim yapılmaz.

**İyzico ve lisans:** başarılı ödeme olayı doğrudan panel içine ECDSA özel anahtarı koyularak lisans imzalanmasına yol açmaz. Satıcı tarafındaki güvenli lisans üretme/dağıtma yöntemi ayrıca tasarlanır; panel yalnız doğrulama ve teslim alma yapar. Sahte sağlayıcı gerçek ödeme almaz. İade, iptal, yenileme, başarısız ödeme ve süre sonu davranışları belirlenir.

E-Fatura/UETDS bilgileri gecikirse diğer işler sürer. Tam geçiş gününde bu işlemler hâlâ başka programla yapılacaksa bunun iş akışı ve sorumlusu kullanıcı tarafından açıkça kabul edilir. Pratikortam'da kayıt girişi gerektiren zorunlu iş kaldığında “Pratikortam tamamen bırakıldı” denmez.

## 14. F8 — YES geçiş provası ve gerçek geçiş

### 14.1 Geçiş öncesi zorunlu kontrol

- [ ] Ücretli/güvenilir veritabanı kararı uygulanmış; mevcut veri silinme riski giderilmiş.
- [ ] Güncel tam yedek alınmış, ayrı ortamda geri yükleme denenmiş; gerekli dosyalar dahil.
- [ ] Finansal geçmiş aktarılmış; tüm cariler, banka/kasa hesapları ve toplamlar mutabık.
- [ ] Devir ve geçmiş çift sayılmıyor; açıklanamayan bakiye farkı yok.
- [ ] Kritik günlük işler ofis kullanıcılarıyla baştan sona denenmiş.
- [ ] Rol, fiyat/kâr, finans, silme ve onay yetkileri belirlenmiş.
- [ ] Kritik testler ve CI yeşil; ayna/lisans koruması doğrulanmış.
- [ ] E-Fatura ve UETDS'nin geçişte nasıl yürütüleceği net; zorunlu iş boşta kalmıyor.
- [ ] Müşteri portalı mali verisi güvenilir; erişim ayrımı test edilmiş.
- [ ] Şoför uygulaması geçişte kullanılacaksa gerçek cihazda kabul edilmiş.
- [ ] Açık kritik hata yok; önemli bilinen sınırlamalar kullanıcıya gösterilmiş.
- [ ] Geri dönüş yöntemi, sorumlusu, süresi ve yeni kayıtların korunması belirlenmiş.
- [ ] Kullanıcı canlı veri işlemini ve ayna kapatmayı açıkça onaylamış.

### 14.2 Prova

Kaynağın uygun anlık görüntüsü alınır; canlıya yazmadan ayrı DB'de tam aktarım yapılır. Aynı görüntü ikinci kez uygulanır, kesinti senaryosu denenir, mutabakat raporu alınır. Ofis kullanıcıları birkaç sahte örnek günlük işi yapar. Rastgele carilere ek olarak yüksek hareketli, kısmi ödemeli, çekli ve iptal faturası olan senaryolar kontrol edilir.

### 14.3 Geçiş günü sırası

1. Kullanıcı onayı ve son yedek doğrulanır; her sistemde kayıt girişi için kısa duraklama belirlenir.
2. Pratikortam'a yeni kayıt girişi durdurulur.
3. Son kaynak görüntüsü alınır; son farklar önizleme ve mutabakatla uygulanır.
4. Cari ve hesap raporları tekrar karşılaştırılır; sorun varsa geçiş açılmaz.
5. Zamanlanmış ayna senkronu kapatılır; yeniden yanlışlıkla çalışamayacağı doğrulanır.
6. Ayna modu kapatılır; yetkili ofis kayıt girişine açılır.
7. İlk sevkiyat ve gerekli para işlemi kontrollü yürütülür; rapor/cari/banka etkisi doğrulanır.
8. Portal ve talep kabul akışı aşamalı açılır; şoför akışı karara göre açılır.
9. Pratikortam salt okunur arşiv olarak kalır; artık gerekmeyen otomasyon erişimleri kullanıcı tarafından kaldırılır.
10. İlk kullanım döneminde günlük hata, yedek ve bakiye kontrolü yapılır; süre sorumlu kullanıcıyla belirlenir.

**Geri dönüşte:** panelde yeni kayıt girişi durur. Geçiş sonrası oluşan kayıtlar dışa alınmadan eski yedek körlemesine yüklenmez. Gerekirse kaynak sisteme tekrar iş girişi kullanıcı tarafından yapılır; ajan Pratikortam'a yazmaz. Sürüm geri alma ile veritabanı geri yükleme farklı işlemlerdir.

## 15. F9 — Satılabilir ürün ve pilot

| ID | İş | Tamamlanma ölçütü |
|---|---|---|
| F9.1 | Paket ve özellik matrisi | Temel/üst paket özellikleri, araç/kullanıcı sınırları ve gerçek kullanılabilir entegrasyonlar net |
| F9.2 | Lisans/deneme kabulü | Deneme, bitiş, salt okunur, yükseltme/yenileme, veri dışa alma akışları test edilmiş |
| F9.3 | Gerçek ayrı kurulum provası | `deploy/customer-*` betikleri gerçek deneme sunucusunda kurul/güncelle/yedek/geri yükle adımlarını geçiyor |
| F9.4 | Genel veri aktarımı | Mevcut Excel/CSV sihirbazı doğrulanmış; gereken ek işlem türleri önizlemeyle genişletilmiş |
| F9.5 | Eğitim ve destek | Ofis, müşteri portalı ve gerekirse şoför için kısa kılavuz; bilinen hata/destek yöntemi |
| F9.6 | Satıcı/marka/hukuk | Ürün/alan adı, satıcı bilgileri, sözleşme, veri işleme ve gizlilik metinleri uzman onayıyla hazır |
| F9.7 | Pilot firmalar | Kullanıcı belirler; önce sınırlı pilot, kabul ve geri bildirim kaydı |
| F9.8 | Satış/ödeme açılışı | Gerçek ödeme hazırsa etkinleştirilir; değilse kullanıcıca belirlenen manuel lisans/ödeme akışı dürüstçe belirtilir |
| F9.9 | Güncelleme ve operasyon | Her müşterinin sürümü, yedek durumu, lisansı ve destek süreci takip edilebilir |

Tanıtımda hazırlanmış altyapı gerçek entegrasyon gibi gösterilmez. Fiyatlar eski satış belgesindeki tahminlerden otomatik sabitlenmez; güncel altyapı/sağlayıcı maliyeti ve pilot geri bildirimiyle belirlenir.

**Ortak çok firmalı sistem:** ayrı kurulumun bakım/maliyet sınırı pilotlarda ölçülür. Ortak tenant yapısına ihtiyaç doğarsa ayrıca veri ayrımı, müşteri izolasyonu, lisans ve taşıma planı hazırlanır. Bu sürüm için bütün tabloları hemen dönüştürmek zorunlu değildir.

## 16. Sonraki aşamada değerlendirilecek işler

| İş | Öncelik | Başlama koşulu |
|---|---|---|
| Dövizli işlem/kur ve raporlar | P3; veri varsa yükselir | Gerçek kaynak veya pilot kullanım ihtiyacı |
| Gelişmiş müşteri/şantiye kısıtları | P3 | Temel portal ayrımının ötesinde kullanıcı yetkilendirme ihtiyacı |
| Rota, mesafe ve süre tahmini | P3 | Kullanım değeri ve sağlayıcı maliyeti belli |
| Çek protesto/yasal takip ayrıntıları | P3 | Günlük kullanıcı ihtiyacı doğrulanmış |
| Gelişmiş yakıt/lastik/bakım | P2/P3 | Öncelikli para/operasyon akışı tamam |
| GPS verisini genişletme | P3 | Temel sağlayıcı bağlantısı ve izinler çalışıyor |
| Muhasebe programıyla bağlantı | P3 | Kullanılan program ve aktarma ihtiyacı öğrenilmiş |
| Çoklu dil, depo, şube/konteyner | P3 | Hedef müşteri ihtiyacı doğrulanmış |

Bu işler unutulmuş değildir; mevcut kullanıcı kararına göre ilk geçişi geciktirmeyecek şekilde sıraya konmuştur.

## 17. Test ve kabul matrisi

| Alan | Zorunlu senaryo | Kanıt |
|---|---|---|
| Finans | Liste/kart/ekstre/rapor tutarlılığı; iptal; kısmi ödeme; verilen çek; virman | PostgreSQL entegrasyon testleri ve örnek ekstre |
| Aktarım | Tekrar uygulama, kesinti, eksik kaynak sayfası, hatalı referans, devir çakışması | Yapay kaynak verisi + mutabakat raporu |
| Yetki | Ofis rolü, müşteri A/B ayrımı, dosya ve export, kapalı hesap | Sunucu testleri; izinsiz istek 403/404 veya uygun giriş yanıtı |
| Ayna/lisans | Yazma korunuyor; talep istisnası varsa dar kapsamlı; süre bitişi | Sunucu testleri ve e2e |
| Kullanım | Klavye, büyük yazı, filtre, form kapanması, tekrar tıklama | Sahte verili e2e ve ekran görüntüleri |
| Teklif | Sürüm, fiyat, geçerlilik, tek sevkiyata dönüşüm | Sunucu/e2e/PDF kontrolü |
| Bildirim | Kuyruk tutarlılığı, başarısız sağlayıcı, tekrar deneme, kapalı tercih | Sahte e-posta sağlayıcılı testler |
| Entegrasyon | İmza/webhook, tekrar olay, zaman aşımı, durum sorgulama | Resmî test ortamı; sahte test gerçek entegrasyon kabulü değildir |
| Yedek | Geri yükleme, dosyalar, sürüm uyumu, örnek bakiye | Ayrı ortamda prova tutanağı |
| Yayın | CI ve canlı SHA; temel erişim kontrolleri | Actions bağlantısı + health kontrolü |

### 17.1 Test komutları ve ortam notları

Projenin güncel `AGENTS.md` ve CI adımları esas alınır:

```bash
# server/ içinde
dotnet test

# client/ içinde
npm ci
npm run lint
npm run build

# server/ içinde; EF aracı kurulu olmalı
dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure --startup-project YesLojistik.Api

# mobile/ içinde
npm ci
npm run typecheck

# client/ içinde; ayrı yerel API/panel/şoför önizlemesi başladıktan sonra
npx playwright test
```

Yerel API için `--no-launch-profile`, ayrı e2e veritabanı ve doğru portlar gerekir. Geliştirme hesabı ve bağlantı bilgileri mevcut güvenli ortam ayarlarından alınır; bu belge şifre yazmaz. Süreçler yalnız kendi PID'leriyle durdurulur; `pkill -f` kullanılmaz. Ortak veritabanında paralel test çatışması çıkarsa sebebi doğrulanır; uygulama hatası test tekrarına saklanmaz.

Her küçük teslimde ilgili anlamlı testler çalışır; main'e kod göndermeden `AGENTS.md`'deki zorunlu kontroller tamamlanır. Migration değiştiyse model uyumu, mobil değiştiyse mobil kontroller, görünür akış değiştiyse e2e ve görsel kontrol gerekir. Geçiş/pilot öncesi tüm akışlar birlikte çalıştırılır. Yeni testler gerçek davranışı doğrular; mevcut kodu kopyalayan gereksiz testler eklenmez.

## 18. Açık kararlar ve dış bağımlılıklar

| Gerekli karar/bilgi | Ne zaman? | Kim sağlar? | Yoksa ne olur? |
|---|---|---|---|
| Çalışan Git/.NET/PostgreSQL ortamı | İlk uygulamadan önce | Ajan kurar; erişim gerekiyorsa kullanıcı ortamı bağlar | Kod uygulaması/test doğrulaması başlamaz |
| Terim tablosu onayı | F4.11 | Kullanıcı | Toplu metin değişikliği bekler |
| Ofis kullanıcıları ve roller | F3/F5, geçiş öncesi | Kullanıcı/YES | Yetki kabulü kapanmaz |
| E-Fatura programı/API/test | F7 | Firma/muhasebeci/sağlayıcı | Gerçek gönderim bloklu |
| UETDS teknik belge/test | F7 | Firma/Bakanlık | Gerçek bildirim bloklu |
| GPS sağlayıcısı/API | F7 | Firma/sağlayıcı | Canlı GPS bağlantısı bloklu |
| DB/sunucu bütçesi ve satın alma | F1 | Kullanıcı | Maliyet raporu hazırlanır, satın alma yapılmaz |
| Yedek secret'ları ve güvenli saklama | F1 | Kullanıcı | Otomatik yedek işletimi tamamlanmaz |
| Şoför uygulamasının ilk geçişte kullanımı | Prova öncesi | Kullanıcı/YES | Ofis akışı hazır olabilir; mobil canlı kabul ayrı kalır |
| Portalın ilk müşterileri ve davetler | F5 pilotu | Kullanıcı/YES | Sahte kullanıcıyla geliştirme/test devam eder |
| KDV ve muhasebe kuralları teyidi | F3 ve gerçek belge öncesi | Mali müşavir | Tartışmalı yeni kural canlıya uygulanmaz |
| Satıcı/marka/alan adı ve hukuk | F9 | Kullanıcı/uzman | Satış açılışı tamamlanmaz |
| İyzico test/hesap ve lisans dağıtımı | F7/F9 | Kullanıcı/satıcı | Sahte sağlayıcıyla hazırlık yapılır; gerçek ödeme kapalı |
| Gerçek veri aktarımı ve ayna kapatma onayı | F2.9/F8 | Kullanıcı | Canlı veri değişmez |

Bilgi bekleyen madde diğer bağımsız işleri durdurmaz. Ajan, kullanıcıdan aynı onayı tekrar tekrar istemez; mevcut açık yetkiyi korur. Yeni satın alma, canlı veri değişikliği ve dış hizmet açılışı için somut sonuç ve maliyet hazırlandıktan sonra gerekli karar alınır.

## 19. Zamanlama ve ilerleme takibi

Kesin bitiş tarihi verilmemiştir. İş yükü, kaynak verinin yapısı ve dış entegrasyon belgeleri tam bilinmediğinden takvim günü taahhüdü verilmez. F0 sonunda her küçük iş paketi için efor ve bağımlılıklar güncellenir.

İlk uygulama sırası:

1. F0: ortamı çalıştır, eski bulguları doğrula, başlangıç testlerini al.
2. F1: mevcut veriyi koruyan yedek/DB kararını ve geri yükleme provasını tamamla.
3. F2.1–F2.3: kaynak şeması, finansal model ve kalıcı eşleştirmeyi tasarla.
4. F2'yi fatura → tahsilat/ödeme → banka/kasa → diğer bakiye etkileri şeklinde küçük teslimlerle tamamla; F3 tutarlılık testlerini her teslimde ekle.
5. F4'te bütün ekranları incele; hesap ve günlük kullanım etkisine göre iyileştirmeleri uygula.
6. F5 portal giriş/görünürlük → talepler; F6 teklifler ve bildirimler.
7. F7 belge geldikçe gerçek adaptörleri tamamla; satış dokümanı/kurulum testleri uygun bağımsız aşamalarda sürer.
8. F8 prova ve onaylı geçiş; F9 pilot ve satış açılışı.

### 19.1 Durum kaydı

Her iş için şu alanlar tutulur:

| Alan | İçerik |
|---|---|
| ID ve başlık | Bu belgedeki görev ID'si |
| Durum | Bekliyor / inceleniyor / yapılıyor / testte / tamam / bloklu |
| Bağımlılık | Önce bitmesi gereken iş veya dış bilgi |
| Kapsam | Değişen davranış ve dosyalar |
| Kabul | Önceden yazılmış tamamlanma şartı |
| Kanıt | Test komutu/sonucu, CI, gerekiyorsa ekran görüntüsü |
| Yayın | Commit ve canlı SHA |
| Kalan | Bilinen sınırlama ve sonraki iş |

Bir iş yalnız “kod yazıldı” diye tamam sayılmaz. Kabul şartı ve gerekli test/yayın kontrolü tamam olmalıdır. Eski planlarla çelişki F0'da düzeltilir; uygulama başladıktan sonra ana takip listesi `docs/GELISTIRME-PLANI.md`, aşama özeti `docs/YOL-HARITASI.md` ile uyumlu tutulur.

## 20. Uygulama oturumları için hazır talimat

Bu belgeyi uygulayacak ajan önce güncel `AGENTS.md`, `CLAUDE.md`, bu plan ve mevcut geliştirme/yol haritasını okur. Başlangıçta güncel main ve kendi çalışma durumunu doğrular. Henüz başlamamış işi tamamlanmış gibi kabul etmez.

### İlk oturum

```text
YES Lojistik geliştirme planının F0 aşamasını uygula.
AGENTS.md ve CLAUDE.md kurallarına uy.
Güncel main çalışma kopyasını, .NET 10, Node 22, PostgreSQL 16,
EF ve Playwright ortamını hazırla. Şifre/token yazma.
Sunucu, panel, mobil, e2e ve migration/model uyumunu doğrula.
Eski geliştirme planındaki bulguları kodla karşılaştır;
zaten düzeltilen işleri tekrar yazma.
Ana günlük iş akışını ve ekranları yapay verilerle incele.
Doğrulanmış eksikleri öncelik ve kabul şartlarıyla raporla.
Bu oturumda yeni özellik geliştirme veya canlı veriye yazma.
Kod hatası bulursan kök nedeni ve öneriyi belirt; kapsam dışına taşma.
Bitince kısa Türkçe sonuç ve ilk uygulanacak küçük işi ver.
```

### Sonraki küçük iş oturumları

```text
Bu planın [GÖREV ID] işini uçtan uca tamamla.
Başlangıçta güncel main'i ve AGENTS.md kurallarını doğrula.
Önce ilgili mevcut kodu incele; kısa planını yaz.
Gerekli en küçük değişikliği yap; kabul şartını kanıtlayan testleri çalıştır.
Canlı veriyi değiştirme; gerekiyorsa ayrı prova ve yedek/onay aşaması hazırla.
Zorunlu kontroller geçince plan/doküman durumlarını güncelle,
commit, rebase ve push yap; CI ve canlı SHA'yı doğrula.
Sonunda ne değişti / nasıl doğrulandı / ne kaldı / sıradaki iş özetini ver.
```

## 21. Planın hazır kabul edilmesi

Bu plan kullanıcının verdiği cevapları içerir; açık kalan kararları saklamaz. Yeni model veya ajan kullanılması doğruluk/test gereksinimlerini değiştirmez. Uygulama yetkisi geldiğinde ilk adım F0'dır; canlı aktarım, ödeme veya resmî gönderim bu belge hazırlanmış diye otomatik açılmaz.

**Bu dosya oluşturulurken uygulama kodu değiştirilmedi, GitHub'a commit/push yapılmadı ve canlı veri üzerinde işlem yapılmadı.**
