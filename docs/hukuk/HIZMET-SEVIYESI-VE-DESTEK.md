**TASLAK: avukat onayı olmadan kullanmayın**

# Hizmet Seviyesi ve Destek (SLA) Taslağı

*Sürüm: 0.1 (taslak) · Abonelik Sözleşmesinin ekidir.*

> Taslak notu (yayınlamadan önce silin): Aşağıdaki sayılar **öneridir**. Satıcı, gerçekten tutabileceği değerleri seçmelidir; tutamayacağı bir hedefi yazmak sözleşme riski doğurur. Köşeli parantezli değerler kararlaştırılacaktır. Tek kişilik ekiple başlanıyorsa destek saatleri ve yanıt süreleri buna göre daraltılmalıdır.

## 1. Kapsam

Bu belge, **[ÜRÜN ADI]** hizmetinin erişilebilirlik hedefini, destek kanallarını ve saatlerini, olay önceliklerine göre yanıt sürelerini, yedeklemeyi ve bakım pencerelerini tanımlar.

## 2. Erişilebilirlik hedefi

- **Hedef:** Takvim ayı başına **%[99,5]** erişilebilirlik (planlı bakım hariç). Bu, ayda yaklaşık [3,6] saat kesinti payı demektir.
- Hedef, aksi açıkça yazılmadıkça **taahhüt değil hedeftir** [KARAR VERİLECEK: taahhüt olacaksa hizmet kredisi tablosu eklenir].
- **Ölçüm:** [DURUM SAYFASI / İZLEME ARACI] ile dışarıdan, [5] dakikalık aralıklarla.
- **Hariç tutulanlar:** planlı bakım, Müşteri kaynaklı sorunlar (hatalı yapılandırma, internet erişimi), üçüncü taraf kesintileri (barındırma sağlayıcısı genel kesintisi, GİB/e-Fatura entegratörü, operatörler), mücbir sebepler, saldırı (makul önlemlere rağmen). *(Hariç tutma kapsamı avukata sorulacak.)*
- Şoför uygulaması internet olmadığında işlemleri cihazda tutar ve bağlantı gelince gönderir; bu davranış kesinti sayılmaz.

## 3. Destek kanalları ve saatleri

| Kanal | Adres | Saat |
|---|---|---|
| E-posta | [DESTEK E-POSTASI] | 7/24 alınır; yanıt destek saatlerinde |
| Telefon/WhatsApp | [DESTEK TELEFONU/WHATSAPP] | [Hafta içi 09:00-18:00] |
| Panel içi Yardım | Yardım sayfaları ve kılavuz | 7/24 |

- **Destek saatleri:** [Pazartesi-Cuma 09:00-18:00, Türkiye saati]; resmî tatiller hariç. [Cumartesi: 09:00-13:00 — KARAR VERİLECEK]
- Acil (Seviye 1) durumlar için [ACİL HAT / ÖNCELİKLİ KANAL] [Profesyonel ve Kurumsal paketlerde].

## 4. Olay seviyeleri ve yanıt süreleri

*"Yanıt süresi" ilk insan yanıtıdır; çözüm süresi değildir. Süreler destek saatleri içinde sayılır.*

| Seviye | Tanım | Örnek | İlk yanıt (hedef) | Çözüm/geçici çözüm (hedef) |
|---|---|---|---|---|
| **1: Kritik** | Hizmet kullanılamıyor veya veri kaybı/güvenlik riski var | Giriş yapılamıyor, sevkiyatlar açılmıyor, veri bozulması | [1 saat] | [4 saat içinde geçici çözüm] |
| **2: Yüksek** | Önemli bir işlev çalışmıyor, yedek yöntem var | Fatura PDF'i oluşmuyor, şoför uygulaması durum gönderemiyor | [4 saat] | [1 iş günü] |
| **3: Normal** | İşlev kısmen bozuk veya yanlış sonuç, iş sürüyor | Rapor toplamı beklenenden farklı, ekran hatası | [1 iş günü] | [5 iş günü / sonraki sürüm] |
| **4: Düşük** | Soru, öneri, kullanım yardımı | "Nasıl yapılır?", yeni özellik isteği | [2 iş günü] | Planlamaya göre |

Başlangıç paketinde tüm yanıt sürelerinin [2 katı], Profesyonel ve Kurumsal pakette öncelikli destek uygulanabilir. [KARAR VERİLECEK]

Müşteri, olayı bildirirken: kullanıcı e-postası, yapılan iş, hata mesajı veya ekran görüntüsü, saat bilgisi göndermeyi kabul eder. Kişisel veri içeren ekran görüntüsü gönderirken gereksiz verinin gizlenmesi önerilir.

## 5. Yedekleme ve geri yükleme

- **Sıklık:** her gece [03:30] otomatik veritabanı yedeği.
- **Doğrulama:** yedek geçici bir veritabanına geri yüklenerek denenir; başarısızsa Satıcı uyarılır.
- **Şifreleme:** yedekler şifreli saklanır.
- **Saklama:** [SAKLAMA SÜRESİ, ör. 30 gün günlük + 12 ay aylık] *(belirlenecek)*.
- **Ek kopya:** yedeğin ikinci bir yerde saklanması [PLANLANDI / YAPILDI — DOĞRULANACAK].
- **Müşteri yedeği:** Müşteri yöneticisi **Ayarlar → Veriler → Tam yedeği indir** ile kendi verisini (fotoğraflar dahil) istediği zaman indirebilir; haftada bir indirmesi önerilir.
- **Hedefler (öneri):** veri kaybı en çok [24 saat] (RPO), kritik kesintide geri dönüş en çok [8 saat] (RTO). *(Satıcının gerçek yedekleme düzenine göre belirlenecek; alt yapı henüz nokta-zaman geri dönüşü sunmuyorsa RPO 24 saattir.)*
- **Geri yükleme talebi:** Müşteri talebiyle belirli bir yedeğe dönüş yapılırsa, o tarihten sonraki veriler kaybolur; talep yazılı olarak ve yönetici onayıyla alınır.

## 6. Bakım pencereleri

- **Planlı bakım:** [Pazar 02:00-05:00, Türkiye saati]; ayda en çok [4] saat. Müşteriler en az [48 saat] önceden panel içi duyuru veya e-postayla bilgilendirilir.
- **Acil bakım:** güvenlik açığı veya veri bütünlüğü riski varsa önceden bildirim olmadan yapılabilir; mümkün olan en kısa sürede bilgi verilir.
- Yazılım güncellemeleri, kullanıcıların çalışmasını kesmemeyi hedefler; sunucu yeniden başlatma sırasında kısa süreli "yeniden bağlanıyor" ekranı görülebilir.

## 7. Güvenlik olayları

Kişisel veri ihlali şüphesinde Satıcı, VERI-ISLEME-SOZLESMESI m.9'a göre Müşteriyi bildirir. Güvenlik açığı bildirimi için: [GÜVENLİK E-POSTASI].

## 8. Hizmet kredisi (isteğe bağlı)

*[Taahhüt verilirse doldurulacak.]* Örnek: aylık erişilebilirlik %[99,5]'in altında kalırsa o ayın aylık bedelinin %[5-10]'u sonraki faturadan düşülür; Müşterinin ayın kapanışından itibaren [15] gün içinde yazılı talep etmesi gerekir. Kredi tek çözüm yoludur.

## 9. Müşterinin sorumlulukları

Güncel tarayıcı kullanmak; kullanıcılarının eğitimini sağlamak; yedeğini düzenli indirmek; destek talebini doğru kanaldan ve eksiksiz bilgiyle iletmek; mali müşavirle teyit gerektiren oran ve kodları kendisinin kontrol etmesi.

## 10. Kapsam dışı

Özel geliştirme, ayrı sunucuya taşıma, üçüncü taraf programlardan veri dönüştürme (olağan içe aktarma sihirbazı dışında), mali müşavirlik/hukuki danışmanlık, Müşterinin kendi donanım ve ağ sorunları. Bunlar için ayrı teklif verilir.
