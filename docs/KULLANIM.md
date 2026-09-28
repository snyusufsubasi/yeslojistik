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

Herkes tüm kayıtları görüntüleyebilir, müşteri ve gider ekleyebilir.

*Ayarlar → Firma Bilgileri* ekranında fatura PDF'inde görünecek firma bilgileri, logo, IBAN, fatura ön eki,
varsayılan KDV/tevkifat ve vade süresi ayarlanır.
