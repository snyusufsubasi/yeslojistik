# Kullanım Kılavuzu

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
   - Hatalı fatura **silinmez, iptal edilir** (numara boşluğu olmasın diye). İptal edilince seferler tekrar faturalanabilir.
7. **Tahsilat gir** → faturanın içinden *Tahsilat Ekle* ya da *Tahsilatlar* sayfasından. Faturaya bağlamazsanız
   ödeme en eski açık faturalardan başlayarak kapatılır.

## İlk kurulum: Excel'den aktarım
*Müşteriler*, *Araçlar* ve *Şoförler* sayfalarındaki **Excel'den Aktar** düğmesiyle mevcut listeleri toplu aktarabilirsiniz:
1. **Şablonu İndir** → Excel'de doldurun (örnek satırı silin).
2. **Dosya Seç** → **Kontrol Et**. Hatalı satırlar satır numarasıyla listelenir; hata varsa hiçbir kayıt aktarılmaz.
3. Hata yoksa **Aktar**. Sistemde zaten kayıtlı olanlar (aynı plaka, aynı ünvan/VKN, aynı ad soyad) atlanır.

Müşteri şablonundaki **Devir Bakiyesi** sütununa müşterinin eski sistemden kalan borcunu yazın. Devir, cari bakiyeye ve
alacak yaşlandırmasına eklenir; faturaya bağlanmayan tahsilatlar önce devri kapatır. Müşteri formundan da girilebilir.

## Şoför uygulaması
Şoförler **YES Lojistik Şoför** uygulamasını kullanır (kurulum: `mobile/README.md`).
- Hesap açma: *Ayarlar → Kullanıcılar → Yeni Kullanıcı*, rol **Şoför (mobil)**, **Bağlı Şoför** seçilir.
- Şoför yalnızca kendisine atanan seferleri görür, fiyat bilgisi görmez.
- Seferde sırasıyla **Yükü Aldım → Yola Çıktım → Teslim Ettim** düğmelerine basar. Geri alma ve iptal yalnızca ofisten yapılır.
- **Fotoğraf Çek / Galeriden** ile teslim fotoğrafı veya imzalı irsaliye yükler; ofis bunu seferin *Dosyalar* sekmesinde görür.
- Yük alındığı andan teslime kadar telefonun konumu otomatik paylaşılır.

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
*Alacak Yaşlandırma* (0-30 / 31-60 / 61-90 / 90+ gün) ve *Gider Dağılımı*. Her rapor **Excel'e Aktar** ile indirilebilir.
Seferler, faturalar, tahsilatlar ve giderler listeleri de filtrelenmiş haliyle Excel'e aktarılabilir.

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
