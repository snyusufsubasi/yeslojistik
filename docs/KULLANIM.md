# Kullanım Kılavuzu

> Bu kılavuzun kısa hali panelin içinde de var: sol menüde **Yardım**.
> Sistem ilk açıldığında ana sayfadaki **Başlarken** kartı ne yapılacağını adım adım gösterir.

## Giriş
Tarayıcıdan panel adresine girin, e-posta ve şifrenizle giriş yapın. Telefonda da aynı adres çalışır;
sol üstteki ☰ düğmesi menüyü açar. Şifrenizi sağ üstteki isminize tıklayıp **Şifre Değiştir** ile değiştirebilirsiniz.

## Günlük iş akışı

1. **Müşteri ekle** → *Müşteriler / Cari → Yeni Müşteri*. VKN (10 hane) veya TCKN (11 hane) girerseniz sistem doğrular.
2. **Araç ve şoför** → *Araçlar* ve *Şoförler* sayfalarından bir kez tanımlanır. Araca varsayılan şoför atarsanız
   sefer açarken şoför otomatik gelir.
3. **Sefer aç** → *Seferler → Yeni Sefer*. Araç maliyeti ve müşteriye satış fiyatını girin; tahmini kâr anında görünür.
4. **Sefer durumunu güncelle** → listede satırdaki düğmeyle: **Yüklendi → Yola Çıktı → Teslim Edildi**.
   Sefer yüklendiğinde araç otomatik “Yolda” olur, teslimde tekrar “Müsait” olur.
   Bakımdaki bir araçla sefer başlatılamaz.
5. **Gider gir** → *Giderler → Gider Ekle*. Yakıt, otoyol gibi masrafları sefere bağlarsanız sefer kârından düşülür.
6. **Fatura kes** → *Faturalar → Yeni Fatura*. Müşteriyi seçin; faturalanmamış seferleri listelenir (teslim edilenler
   otomatik işaretli). KDV ve tevkifat (varsayılan %20 ve 2/10) seçilir, toplam anında hesaplanır.
   - **Taslak Kaydet**: sonradan kesmek için saklar (cari bakiyeye yansımaz).
   - **Faturayı Kes**: faturayı kesinleştirir, cari borca yazılır. PDF düğmesiyle yazdırabilir/gönderebilirsiniz.
   - SMTP ayarlıysa fatura detayındaki **E-posta Gönder** ile PDF müşteriye gönderilir (varsayılan alıcı cari kartındaki e-posta).
   - Hatalı fatura **silinmez, iptal edilir** (numara boşluğu olmasın diye). İptal edilince seferler tekrar faturalanabilir.
7. **Tahsilat gir** → faturanın içinden *Tahsilat Ekle* ya da *Tahsilatlar* sayfasından. Faturaya bağlamazsanız
   ödeme en eski açık faturalardan başlayarak kapatılır.

## Kiralık araç (taşeron) ve tedarikçiler

- **Tedarikçiler** sayfası: kiralık araç sahipleri (taşeron), servisler ve akaryakıt istasyonları. IBAN, vade ve devir borcu girilir.
- **Araçlar → Sahiplik: Kiralık** yapılıp araç sahibi seçilir. Dorse plakası araçta ve seferde tutulur.
- Kiralık araçla açılan seferde **Taşerona Ödenecek** tutar, sefer *Yüklendi* olduğu anda araç sahibine borç yazılır. Planlanmış ve iptal edilen sefer borç doğurmaz.
- Ödeme: tedarikçi sayfasında **Ödeme Yap** ya da **Ödemeler** sayfası. Ödeme en eski borçtan başlayarak kapatır; bir sefere bağlanırsa önce o seferi kapatır.
- Veresiye yakıt / açık hesap tamir: **Giderler**'de tedarikçi seçilip **Vadeli** işaretlenir, borca eklenir. Fiş fotoğrafı eklenebilir.
- **Hesap Ekstresi** (PDF) mutabakat için kullanılır. Vadesi geçen borçlar ve 15 günü geçtiği halde taşeron faturası girilmeyen seferler ana sayfa uyarılarında çıkar. Seferler listesinde *Taşeron faturası gelmedi* filtresi, Raporlar'da *Borç Yaşlandırma* ve *Tedarikçiler* sekmeleri vardır.
- Seferin **Geçmiş** sekmesi ne zaman yüklendiğini, yola çıktığını ve teslim edildiğini, kimin (panel / şoför uygulaması) yaptığıyla gösterir. Müşteri takip sayfasında da saatler görünür.

## Yedekler

- Her gece 03:30'da otomatik yedek alınır, geçici bir veritabanına geri yüklenerek denenir ve şifreli saklanır.
- **Ayarlar → Veriler → Tam yedeği indir** ile haftada bir yedeği indirip saklayın. Yedek fotoğrafları da içerir.
- Aynı kartta veritabanı doluluğu görünür (ücretsiz sunucuda 1 GB).

## İlk kurulum: Excel'den aktarım
*Tedarikçiler*, *Müşteriler*, *Şoförler*, *Araçlar* ve *Seferler* sayfalarındaki **Excel'den Aktar** düğmesiyle mevcut listeleri toplu aktarabilirsiniz.
Sıra önemlidir, çünkü sonrakiler öncekilere ada göre bağlanır: **1 Tedarikçiler → 2 Müşteriler → 3 Şoförler → 4 Araçlar → 5 Seferler**.
1. **Şablonu İndir** → Excel'de doldurun (örnek satırı silin).
2. **Dosya Seç** → **Kontrol Et**. Hatalı satırlar satır numarasıyla listelenir; hata varsa hiçbir kayıt aktarılmaz.
3. Hata yoksa **Aktar**. Sistemde zaten kayıtlı olanlar (aynı plaka, aynı ünvan/VKN, aynı ad soyad) atlanır.

Müşteri şablonundaki **Devir Bakiyesi** sütununa müşterinin eski sistemden kalan borcunu yazın. Devir, cari bakiyeye ve
alacak yaşlandırmasına eklenir; faturaya bağlanmayan tahsilatlar önce devri kapatır. Müşteri formundan da girilebilir.

- **Tedarikçi** şablonundaki *Devir Borcu*, firmanın o tedarikçiye olan eski borcudur.
- **Araç** şablonunda *Sahiplik* “Özmal” ya da “Kiralık”; kiralıksa *Araç Sahibi* sütununa tedarikçi ünvanı yazılır.
- **Sefer** şablonu geçmiş seferler içindir: müşteri, plaka ve şoför sistemde kayıtlı olmalı. Aktarılan seferler bildirim göndermez,
  araç durumunu değiştirmez. Tarih, müşteri, plaka, teslim adresi ve satış fiyatı aynı olan sefer ikinci kez aktarılmaz.
- **Ayarlar → Veriler → Canlıya geçiş** kartı yapılacakları sırayla gösterir (demo temizliği, firma bilgileri, kullanıcılar, aktarımlar,
  devir kontrolü, fatura numarası, ilk yedek).

## Şoför uygulaması
Şoförler **YES Lojistik Şoför** uygulamasını kullanır (kurulum: `mobile/README.md`).
- Hesap açma: *Ayarlar → Kullanıcılar → Yeni Kullanıcı*, rol **Şoför (mobil)**, **Bağlı Şoför** seçilir.
- Şoför yalnızca kendisine atanan seferleri görür, fiyat bilgisi görmez.
- Seferde sırasıyla **Yükü Aldım → Yola Çıktım → Teslim Ettim** düğmelerine basar. Geri alma ve iptal yalnızca ofisten yapılır.
- **Fotoğraf Çek / Galeriden** ile teslim fotoğrafı veya imzalı irsaliye yükler; ofis bunu seferin *Dosyalar* sekmesinde görür.
- **Masraf / Yakıt** bölümünden yakıt (litre ve araç km'siyle), otoyol/köprü, bakım/onarım ve diğer masrafları girer. Masraf sefere, araca ve şoföre bağlanır, *Giderler*'de ve yakıt raporunda görünür. Avans ve harcırahı yalnızca ofis girer.
- Yük alındığı andan teslime kadar telefonun konumu otomatik paylaşılır.
- Ofis sefer atadığında, değiştirdiğinde veya iptal ettiğinde şoförün telefonuna bildirim gider.

## Araç takip haritası ve müşteri takip linki
- **Araç Takip Haritası** sayfası araçların son konumunu gösterir (30 saniyede bir yenilenir). Listeden bir araca
  tıklayınca aktif seferinin izlediği rota çizilir.
- Sefere tıklayıp **Takip ve Rota** sekmesinden **Takip Linki Oluştur** → **WhatsApp ile Gönder**. Müşteri, giriş
  yapmadan seferin aşamasını ve araç yoldayken konumunu görür. Fiyat, şoför adı/telefonu gösterilmez, plakanın son
  hanesi gizlenir. Link teslimden 7 gün sonra kapanır.
- **Dosyalar / Fotoğraflar** sekmesinden ofis de irsaliye, CMR vb. belge yükleyebilir (JPEG, PNG, WEBP, PDF; en fazla 10 MB).

## Cari kartı
Müşteriye tıklayınca: toplam borç (kesilen faturalar), toplam alacak (tahsilatlar), bakiye ve vadesi geçen tutar.
*Hareketler* sekmesi fatura ve tahsilatları yürüyen bakiyeyle gösterir.

> Not: Sistemdeki faturalar iç kayıttır. Resmi e-Fatura/e-Arşiv, mevcut muhasebe programınızdan kesilmeye devam eder.

## Bildirimler (zil simgesi)
- Periyodik bakımı 15 gün içinde olan / geçmiş araçlar
- Muayene, trafik sigortası, ehliyet, SRC ve psikoteknik belgesi 30 gün içinde dolacaklar
- Vadesi geçmiş alacaklar (müşteri bazında)

## Raporlar
*Aylık Özet* (ciro, maliyet, net kâr, faturalanan, tahsil edilen), *Sefer Kârlılığı*, *Araç Bazlı* gelir-gider,
*Şoför Bazlı* (sefer sayısı, gelir, kâr), *Alacak Yaşlandırma* (0-30 / 31-60 / 61-90 / 90+ gün) ve *Gider Dağılımı*. Her rapor **Excel'e Aktar** ile indirilebilir.
Seferler, faturalar, tahsilatlar ve giderler listeleri de filtrelenmiş haliyle Excel'e aktarılabilir.

## Toplu işlemler (birden çok kaydı seçme)

Sevkiyatlar, Faturalar, Tahsilatlar ve tedarikçi kartındaki Seferler listesinde satırın başındaki kutuyla kayıt seçilir. Başlıktaki kutu o sayfadakilerin hepsini seçer. Sayfa değiştirince seçim korunur, filtre değişince kalkar. Seçim varken altta bir çubuk çıkar:

- **Teslim evrakını onayla:** Seçilen teslim edilmiş seferlerin evrakı onaylanır. Teslim edilmemiş ya da zaten onaylı olanlar değişmez; nedeni gösterilir.
- **Durumu ilerlet:** Her sefer bir sonraki aşamaya geçer (Planlandı → Yüklendi → Yolda → Teslim Edildi). Önce özet gösterilir.
- **Fatura kes:** Aynı müşterinin seferleri seçiliyse fatura ekranı bu seferlerle açılır.
- **Toplu ödeme:** Seçilen taşeron seferlerinin kalan borcu, her tedarikçiye tek ödeme olarak kaydedilir. Kaydetmeden önce tedarikçi başına toplam gösterilir.
- **Excel'e aktar:** Yalnızca seçilen kayıtlar Excel'e aktarılır.

Toplu işlemler ya tamamen yapılır ya hiç yapılmaz; yarım kalmaz.

## Sevk belgesi, sefer kopyalama ve hesap ekstresi

- **Sevk Belgesi:** Sefer penceresinin altındaki düğmeyle açılır. Araçta taşınır, teslimde imzalatılır; fiyat içermez.
- **Kopyala:** Seçili seferin müşteri, güzergah, araç ve fiyat bilgileriyle bugünün tarihine yeni bir sefer açar.
- **Hesap Ekstresi:** Müşteri kartındaki düğmeyle açılır. Tarih aralığı seçilir; PDF olarak açılır ya da müşteriye e-postayla gönderilir (mutabakat için).

## Yakıt ve şoför avansı

- Yakıt giderine **litre** ve **araç kilometresi** yazılırsa, *Raporlar → Yakıt* araç başına 100 km'de yakılan litreyi gösterir. Filo ortalamasının %15'ten fazla üstündeki araç kırmızı görünür.
- Şoföre verilen avans **Şoför Avansı** kategorisiyle ve şoför seçilerek girilir. *Raporlar → Şoför Bazlı* avans ve harcırah toplamlarını gösterir.

## Genel arama, raporlar ve telefona kurma

- Üst çubuktaki **Ara** (Ctrl+K): plaka, müşteri, sefer referans no, fatura no, şoför, tedarikçi.
- Raporlar → **Müşteri Kârlılığı** (ciro, maliyet, marj, açık alacak, yaklaşık tahsil süresi) ve **Güzergâh** (il → il sefer sayısı, ortalama satış/maliyet, marj). Hepsi Excel'e aktarılabilir.
- Paneli telefona kurma: iPhone Safari → Paylaş → Ana Ekrana Ekle; Android Chrome → Uygulamayı yükle.

## Çek / senet, kasa / banka ve nakit akışı

- Çek/senetle tahsilat: Tahsilatlar'da yöntem **Çek** ya da **Senet**, numara, banka ve vade. **Çek / Senet** sayfasında portföy; vadesine 7 gün kala uyarı.
- Durumlar: Tahsile ver, Tahsil edildi (hesap seçilir), Ciro et (seçilen tedarikçiye ödeme yazılır, borcu düşer), Karşılıksız, İade. Karşılıksız/iade çek müşterinin bakiyesinden düşmez; ciro edilmişse tedarikçi ödemesi de geri alınır.
- **Kasa / Banka**: hesaplar açılış bakiyesiyle açılır; tahsilat, ödeme, gider ve şoför ödemesinde hesap seçilirse bakiye hesaplanır. Çek/senet yalnızca tahsil edilince hesaba girer. Hesaplar arası aktarım: **Virman**.
- Ana sayfa **Nakit Akışı**: önümüzdeki 4 hafta beklenen tahsilat (fatura vadeleri + çek/senet) ve taşeron/tedarikçi ödemeleri.
- Müşteri **Risk limiti**: açık bakiye + faturalanmamış (yüklenmiş/yolda/teslim) seferler limiti aşınca sefer formunda ve bildirimlerde uyarı; kayıt engellenmez.
- **Vade Hatırlatma** (müşteri sayfası): ekstre ekli e-posta ya da hazır WhatsApp mesajı.

## Şoför masraf onayı ve şoför hesabı

- Şoförün uygulamadan girdiği masraf **Onay bekliyor** olarak düşer; ana sayfada sayısı görünür. Giderler sayfasında **Onayla** ya da gerekçe yazıp **Reddet**. Gerekçe şoföre bildirim olarak gider. Yönetici mobil uygulamasında: Daha → Onay Bekleyen Masraflar.
- Raporlar, ana sayfa ve sefer kârı yalnızca **onaylı** masrafları sayar.
- Şoför kartı → **Hesap**: avans ve şoföre ödemeler bakiyeyi artırır; şoförün cebinden yaptığı onaylı masraflar ve geri verdiği para düşürür. Pozitif bakiye "şoförde kalan firma parası", negatif bakiye "şoföre borcumuz". Excel'e aktarılabilir.

## Belgeler ve bakım

- Araç/şoför kartı → **Belgeler**: kasko, K belgesi, takograf, SRC vb. numara, bitiş tarihi ve taranmış dosya. Firma belgeleri Ayarlar → Firma Bilgileri'nde. Bitişe 30 gün kala uyarı.
- Araç kartı → **Bakım**: tutar "Bakım" gideri olarak da yazılır (çift sayılmaz); aracın km'si, son/sonraki bakım tarihi ve **sonraki bakım km**'si güncellenir. 1.000 km kala uyarı.

## E-posta bildirimleri

E-postaların çalışması için sunucuda SMTP ayarı yapılmış olmalıdır (bkz. KURULUM.md).

- **Müşteriye durum e-postası:** Müşteri kartında işaretlenir. Yük yüklendiğinde, yola çıktığında ve teslim edildiğinde müşteriye takip linkli bir e-posta gider.
- **Sabah uyarı özeti:** *Ayarlar → Bildirimler* bölümünden açılır. Her sabah yöneticilere bakım, belge ve vadesi geçen alacak uyarıları gelir.

## İşlem geçmişi

Yalnızca yönetici görür (*Ayarlar → İşlem Geçmişi*). Kimin, ne zaman, hangi kaydı oluşturduğunu, değiştirdiğini ya da sildiğini gösterir; değişen alanların eski ve yeni değerleri de yazılıdır. Bir seferin geçmişi, sefer penceresindeki **Geçmiş** sekmesinde de görünür. Kayıtlar 2 yıl saklanır.

## Kullanıcılar ve yetkiler (Ayarlar)
| Rol | Yapabilecekleri |
|---|---|
| Yönetici | Her şey, kullanıcı ve firma ayarları |
| Operasyon | Sefer, araç, şoför ekleme/düzenleme |
| Muhasebe | Fatura, tahsilat, raporlar |
| Şoför (mobil) | Yalnızca şoför uygulaması: kendi seferleri, durum, fotoğraf |

Herkes tüm kayıtları görüntüleyebilir, müşteri ve gider ekleyebilir.

*Ayarlar → Firma Bilgileri* ekranında fatura PDF'inde görünecek firma bilgileri, logo, IBAN, fatura ön eki,
varsayılan KDV/tevkifat ve vade süresi ayarlanır.

## Şoför uygulaması: teslim ve masraf

- Şoför teslimde teslim alanın adını, imzasını ve fotoğrafını alır; bunlar seferin **Dosyalar** sekmesine, teslim alan kişi seferin bilgisine düşer.
- **Ayarlar → Bildirimler → Teslim kuralları** ile teslimde fotoğraf ve/veya imza zorunlu yapılabilir.
- Şoförün girdiği masraflar **Giderler**'de *Onay bekliyor* ve *Şoför ödedi* olarak görünür (onay akışı sonraki sürümde).
- **Şoförler** listesindeki *Uygulama* sütunu, şoförün konum paylaşımına onay verip vermediğini gösterir.
- Kurulum ve izin adımları şoförlere gönderilecek [MOBIL-KURULUM.md](MOBIL-KURULUM.md) dosyasında.

## Hesap güvenliği ve KVKK

- **Şifremi unuttum:** Giriş ekranındaki bağlantı, e-posta ayarlıysa 30 dakika geçerli, tek kullanımlık bir sıfırlama bağlantısı gönderir. E-posta ayarlı değilse yönetici **Ayarlar → Kullanıcılar**'dan yeni şifre verir.
- **Hesap kilidi:** Aynı hesaba 5 hatalı giriş denemesinde hesap 15 dakika kilitlenir. Yönetici Kullanıcılar listesindeki **Kilidi aç** ile hemen açabilir; **Oturumları kapat** o kullanıcının tüm cihazlardaki oturumunu sonlandırır.
- **Gizlilik ve KVKK:** `/gizlilik` (aydınlatma metni) ve `/hesap-silme` sayfaları herkese açıktır; firma bilgileri Ayarlar'dan gelir. Metin bir şablondur: avukat/mali müşavir gözden geçirmeli, VERBİS kaydı gerekip gerekmediği teyit edilmelidir.

## e-Fatura ve muhasebe aktarımı

- **Ayarlar → Firma Bilgileri → e-Fatura / e-Arşiv** açılınca kesilen faturalara ETTN ve GİB numarası verilir, UBL-TR XML üretilir. Müşteri e-Fatura mükellefiyse e-Fatura, değilse e-Arşiv olur.
- Fatura detayındaki **e-Fatura** panelinden XML indirilir; entegratör sözleşmesi yokken XML portala yüklendikten sonra **Gönderildi olarak işaretle** denir.
- **Raporlar → Muhasebe Aktarımı**: ayın satış, tahsilat, gider ve taşeron kayıtları tek Excel'de; e-Fatura XML'leri ZIP'te. Ayrıntılar: [E-FATURA.md](E-FATURA.md).
