# Kabul testi: gerçek iş günü provası

Kullanıcı, ofisteki kuzen ve bir şoförle birlikte yapılır. Her adımda "Beklenen" sütunu kontrol edilir ve "Sonuç" işaretlenir.

| # | Adım | Kim | Beklenen | Sonuç |
|---|------|-----|----------|-------|
| 1 | Panelde kiralık araçla sefer aç (Seferler → Yeni Sefer; araç sahibi tedarikçi) | Ofis | Sefer "Planlandı"; formda "Taşerona ödenecek" görünür | ☐ |
| 2 | Şoför APK'dan giriş yapar, rıza ekranını kabul eder, "Yüklendi" ve "Yola Çıktı" der | Şoför | Panelde durum değişir; Harita'da araç konumu görünür | ☐ |
| 3 | Seferden müşteriye takip linki gönder (WhatsApp) | Ofis | Link girişsiz açılır; zaman çizelgesi ve konum görünür | ☐ |
| 4 | Şoför telefonu uçak moduna alır; teslim ekranında teslim alanı, imza ve fotoğraf girer | Şoför | Uygulamada "N işlem bekliyor" şeridi | ☐ |
| 5 | Uçak modu kapatılır | Şoför | Birkaç saniye içinde panelde sefer "Teslim Edildi"; imza ve fotoğraf dosyalarda, tek kopya | ☐ |
| 6 | Şoför bir masraf (fişli) girer | Şoför | Panel ana sayfada "masraf onay bekliyor"; yöneticiye bildirim | ☐ |
| 7 | Masrafı onayla (Giderler → Onayla) | Ofis | Sefer kârından düşer; şoför hesabında görünür | ☐ |
| 8 | Fatura kes (Faturalar → Yeni Fatura, teslim edilen sefer) | Muhasebe | e-Fatura açıksa e-Arşiv/e-Fatura numarası; XML iner; PDF toplamı XML ile aynı | ☐ |
| 9 | Çekle kısmi tahsilat gir (yöntem Çek, vade) | Muhasebe | Müşteri bakiyesi düşer; Çek/Senet portföyünde görünür | ☐ |
| 10 | Taşerona ödeme yap (Ödemeler → Ödeme Yap, hesap seç) | Muhasebe | Tedarikçi bakiyesi düşer; kasa/banka bakiyesi azalır | ☐ |
| 11 | Raporlara bak: Aylık Özet, Müşteri Kârlılığı, Borç Yaşlandırma | Yönetici | Rakamlar girilen işlemlerle tutarlı | ☐ |
| 12 | Ayarlar → Veriler → Tam yedeği indir | Yönetici | `.dump` dosyası iner; son yedek zamanı güncellenir | ☐ |

Sorun çıkan adım not edilir; düzeltme sonrası o adım tekrar denenir.
