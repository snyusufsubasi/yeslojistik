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

## Sevk belgesi, sefer kopyalama ve hesap ekstresi

- **Sevk Belgesi:** Sefer penceresinin altındaki düğmeyle açılır. Araçta taşınır, teslimde imzalatılır; fiyat içermez.
- **Kopyala:** Seçili seferin müşteri, güzergah, araç ve fiyat bilgileriyle bugünün tarihine yeni bir sefer açar.
- **Hesap Ekstresi:** Müşteri kartındaki düğmeyle açılır. Tarih aralığı seçilir; PDF olarak açılır ya da müşteriye e-postayla gönderilir (mutabakat için).

## Yakıt ve şoför avansı

- Yakıt giderine **litre** ve **araç kilometresi** yazılırsa, *Raporlar → Yakıt* araç başına 100 km'de yakılan litreyi gösterir. Filo ortalamasının %15'ten fazla üstündeki araç kırmızı görünür.
- Şoföre verilen avans **Şoför Avansı** kategorisiyle ve şoför seçilerek girilir. *Raporlar → Şoför Bazlı* avans ve harcırah toplamlarını gösterir.

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
