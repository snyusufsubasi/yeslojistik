# Codex (ChatGPT) için prompt dizisi

Claude'dan Codex'e geçerken kullanın. Proje kuralları ve durumu depodaki **`AGENTS.md`** dosyasında; Codex bu dosyayı otomatik okur. Aşağıdaki mesajları **sırayla** yapıştırın. Her mesaj ayrı bir kutuda.

## Nasıl kullanılır?
1. Codex'te depoyu bağlayın: `snyusufsubasi/yeslojistik`, dal **main**. (Codex GitHub'a push yapabilmeli; yapamıyorsa 3. kutudaki "push yetkisi" notuna bakın.)
2. **Önce Prompt 0 ve 1'i** yapıştırın (tanışma + ortam doğrulama). Kod değiştirmezler.
3. Sonra **bir oturumda bir iş** verin (Prompt 2'deki listeden). Bitince Prompt 9 (kapanış) ile bitirin.
4. Codex bir şey sorarsa kısa cevap verin. Emin değilseniz "sen karar ver, kararı raporda yaz" deyin.
5. **Şifre, anahtar, token yazmayın.** Codex'ten istenirse "ortam değişkeni olarak ben girerim" deyin.

---

## Prompt 0: Tanışma (kod değiştirmez)
```
Bu depo YES Lojistik: bir nakliye firmasının web paneli (React + .NET 10 + PostgreSQL) ve şoför uygulaması.
Başka bir yapay zekâ (Claude) ile çalışıyordum, şimdi sen devam edeceksin.

Önce şunları oku, sırayla:
1) AGENTS.md  (kurallar, çalıştırma, mimari, durum: bunlara kesin uy)
2) CLAUDE.md
3) docs/YOL-HARITASI.md
4) docs/SATIS-PLANI.md  (özellikle "Durum (4 Ekim)" bölümü)
5) docs/GELISTIRME-PLANI.md ve docs/PRATIKORTAM-HARITA.md

Henüz HİÇBİR dosyayı değiştirme, commit atma, push yapma.
Bana kısa Türkçe özetle: (a) proje ne, (b) şu an canlıda ne var, (c) hangi işler bilgi beklediği için bloklu,
(d) hangi işleri hemen yapabilirsin. Kuralları da kendi cümlelerinle 5 maddede tekrar et ki anladığını göreyim.
Ben kod yazmam; kısa ve sade Türkçe konuş.
```

## Prompt 1: Ortamı kur ve doğrula (kod değiştirmez)
```
AGENTS.md'deki "Çalıştırma ve test" bölümüne göre ortamı hazırla ve doğrula. Kod değiştirme, commit atma.
1) git pull --rebase origin main yap; son commit ve CI durumunu söyle.
2) PostgreSQL 16'yı (postgres/postgres, localhost:5432) hazırla.
3) `cd server && dotnet test` çalıştır, kaç test geçti/kaldı söyle.
4) `cd client && npm ci && npm run lint && npm run build` çalıştır. (2 eski lint uyarısı normaldir.)
5) `dotnet-ef migrations has-pending-model-changes` çalıştır.
6) Mümkünse e2e'yi de kur ve çalıştır (AGENTS.md'deki adımlar). Kuramıyorsan nedenini yaz, yerine CI'ın sonucuna bak.
Beklenen: sunucuda ~300 test, tarayıcıda ~47 test geçer.
Sonunda tek tablo ver: adım / sonuç / sorun varsa neden. Sorun çıkarsa düzeltmeye başlama, önce bana söyle.
```

**Push yetkisi notu:** Codex'in GitHub'a yazma izni yoksa şunu ekleyin: *"Push yapamıyorsan değişiklikleri `codex/<konu>` adlı bir dalda commit et ve bana söyle; ben birleştiririm."* (Normalde proje doğrudan `main`'e çalışır; ama izin yoksa dal kullanmak güvenlidir.)

---

## Prompt 2: İş seçenekleri (hangisinden başlayacağınızı seçin)
Her görevden önce şu **ortak başlığı** ekleyin:
```
AGENTS.md'deki kurallara uy (pratikortam'a yazma yok, şifre yazma yok, uydurma API yok, testsiz push yok).
Bu görevi bitir, test et, docs/GELISTIRME-PLANI.md'yi güncelle, commit + git pull --rebase origin main + git push origin HEAD:main yap.
Başlamadan 5 satırla planını yaz, sonra çalış. Bitince kısa Türkçe özet ver: ne yaptım / ne test ettim / senden ne lazım.
GÖREV:
```

### 2Z. Kolaylaştırma (ÖNCELİKLİ)
```
docs/KOLAYLASTIRMA-PLANI.md dosyasını baştan sona oku. Bölüm 8'deki sıradaki "Bekliyor" aşamasını uygula
(K0 ve K1 müşteri onayı ister: onay gelmeden K2'ye geçme). Bölüm 12'deki talimata uy.
```

### 2A. Tam geçmişi taşıma (en önemli; pratikortam'dan tamamen çıkmak için gerek)
```
Pratikortam aynası şu an müşteri, tedarikçi, şoför, araç, sevkiyat, gider kayıtlarını ve her carinin bakiye rakamını getiriyor.
Eksik: faturalar, tahsilatlar, tedarikçi ödemeleri, banka/kasa hareketleri (A8, docs/YOL-HARITASI.md).
1) Önce docs/PRATIKORTAM-HARITA.md ve tools/legacy/ içindeki mevcut çekme (extract.mjs), dönüştürme (transform.py), yükleme (mirror.py) ve sunucu tarafını (LegacyController, LegacyMirrorService) incele.
2) Bu eksik verileri aynı hatta ekle. Pratikortam'a SADECE OKUMA yapılır; yazma/silme/kaydet yok; giriş şifresini sen yazma (kullanıcı kendisi girer).
3) Sonunda panelin hesapladığı bakiye ile pratikortam bakiyesi her carinin için tutmalı; fark raporu üreten bir doğrulama ekle.
4) Deneme için canlıya yazmadan önce "dry-run" (kuru çalıştırma) modunu kullan, canlı yazmadan önce yedek + kullanıcı onayı iste.
5) Hiçbir pratikortam verisi depoya girmesin, testlerde uydurma veri kullan.
```

### 2B. "Sefer" → "Sevkiyat" terim temizliği (KULLANICI TERİM TABLOSUNU ONAYLADIYSA)
```
Kullanıcı docs/TERIMLER.md içindeki terim tablosunu onayladı [onayladıysanız bu satırı olduğu gibi bırakın; onaylamadıysanız bu görevi vermeyin].
Tüm panelde (client/src, e-posta/PDF şablonları, server mesajları, mobile/, docs/KULLANIM.md, site/) tabloda yazan öneri adları uygula.
Rota (URL) adları ve veritabanı alan adları DEĞİŞMEZ; yalnız kullanıcıya görünen yazılar. e2e testlerindeki metinleri de güncelle.
Bitince bütün testleri (sunucu + e2e) çalıştır. Değişen ekranlardan 3-4 ekran görüntüsü al.
```

### 2C. Küçük tasarım artıkları
```
docs/TASARIM-OTOYOL.md "Sırada" bölümündeki işleri bitir:
Ödemeler, Giderler, Alınan Faturalar, Çekler ve Tedarikçi Ödemeleri sayfalarındaki toplam şeridini eski TotalsStrip'ten components/SumStrip.tsx'e çevir;
Personel ve Sabit Ödemeler sayfalarındaki StatCard kutularını Figures/Figure rakam şeridine çevir;
"Kiralık" etiketinin mor rengini tasarım jetonlarından birine (info/warn vb.) çek.
Yazı boyutu seçeneklerini (Aa) bozma. Lint, build ve e2e geçsin; önce/sonra ekran görüntüsü ver.
```

### 2D. Pratikortam eksik listesi (orta öncelik)
```
docs/PRATIKORTAM-HARITA.md içindeki orta öncelikli 7-16. maddeleri sırayla yap (ek belge türleri, kesilen çekler, ödeme listesi vb.).
Her madde için: mevcut ekranı incele, en küçük çalışan çözümü yap, test ekle, listede işaretle.
Bir madde belirsizse onu atla ve raporda "belirsiz, sebebi" olarak yaz. Pratikortam'a yazma yok.
```

### 2E. Müşteri portalı
```
Müşterinin kendi firmasının sevkiyatlarını, faturalarını ve ekstresini görebildiği salt okunur bir portal yap.
Mevcut müşteri takip linki (TrackingController, takip sayfası) ve rol/yetki yapısı üzerine kur.
Giriş: müşteri başına davet bağlantısı + şifre belirleme (mevcut şifre sıfırlama akışını kullan), 2FA zorunlu değil.
Müşteri yalnız KENDİ kayıtlarını görür: bunu kanıtlayan sunucu testleri yaz (başka müşterinin verisine erişim 403/404).
Ayarlar'dan açılıp kapanabilsin. Otoyol tasarımı, sade Türkçe.
```

### 2F. Otomatik bildirimler ("yükünüz yolda")
```
Sevkiyat durumu değişince (Yüklendi, Yolda, Teslim edildi) müşteriye otomatik e-posta (mevcut SmtpEmailSender) gönder; WhatsApp/SMS için
"mesaj hazırla + tek tıkla gönder" bağlantısı üret (gerçek SMS/WhatsApp API'si yok, uydurma).
Müşteri başına açma/kapama, şablon düzenleme ve gönderim geçmişi olsun. Test: durum değişimi e-posta kuyruğuna yazar.
```

### 2G. Teklif hazırlama
```
Müşteri için fiyat teklifi: güzergâh, yük, fiyat (KDV ayrı gösterilir, docs/KDV-KURALLARI.md), geçerlilik süresi, PDF çıktısı (mevcut PDF altyapısı), e-posta ile gönder,
"Kabul edildi" olunca tek tıkla sevkiyata çevir. Yeni tablo gerekirse migration yalnız ekleme yapsın. Testler ve e2e ekle.
```

### 2H. Abonelik ödemesi (iyzico)
```
docs/SATIS-PLANI.md bölüm 4'teki paketlere göre abonelik ödemesini iyzico Abonelik ile bağlama hazırlığı yap.
İyzico anahtarlarını ASLA koda yazma (ortam değişkeni). Gerçek iyzico API'sini bilmiyorsan docs.iyzico.com'u oku; doğrulayamadığın alanı "doğrulanacak" diye işaretle.
Lisans sistemiyle (LicenseService) bağla: ödeme başarılı → lisans süresi uzar. Önce soyutlama + sahte sağlayıcı + testler; gerçek bağlantıyı kullanıcı anahtar verince açacak şekilde bırak.
```

### 2I. e-Fatura entegratörü (BİLGİ GELDİYSE)
```
Kullanıcı entegratörü seçti ve şunları verdi: [entegratör adı, API dokümanı/özet, test hesabı bilgisi, kontör modeli].
docs/ENTEGRATOR-EKLEME.md'deki kontrol listesine göre IEInvoiceProvider için bir adaptör yaz (EInvoiceProviders kaydına tek satır).
Gönderme, durum sorgulama, gelen faturaları alma. Önce entegratörün TEST ortamında dene; canlıya geçiş kullanıcı onayıyla. Anahtarlar ortam değişkeni.
Dokümanda olmayan hiçbir alanı uydurma.
```

### 2J. UETDS bildirimi (BİLGİ GELDİYSE)
```
Kullanıcı Bakanlık U-ETDS entegrasyon dokümanını ve test erişimini verdi: [özet/dosya].
docs/UETDS.md bölüm 8'deki görev listesine göre IUetdsProvider yaz: sefer bildirimi, iptal, güncelleme, durum. UetdsReadiness kontrolü "Hazır" ise gönder.
Test ortamıyla dene, canlı kullanıcı onayıyla. Dokümanda olmayanı uydurma.
```

### 2K. GPS entegrasyonu (BİLGİ GELDİYSE)
```
Kullanıcı [Arvento veya Mobiliz] hesabı ve API bilgisini verdi. Araç konumlarını mevcut VehicleLocation yapısına periyodik çek,
harita ve müşteri takip linkinde canlı göster. Anahtarlar ortam değişkeni; dokümanda olmayanı uydurma. Hata/kesinti durumunda panel bozulmasın.
```

### 2L. Güvenlik ve kalite taraması
```
Depoyu güvenlik ve kalite açısından tara: yetki kontrolleri (her endpoint doğru rolle mi), SQL/CSV enjeksiyonu, dosya yükleme, rate limit,
sır sızıntısı (şifre/token), bağımlılık güvenlik uyarıları (npm audit, dotnet list package --vulnerable), erişilebilirlik, yavaş sorgular.
Düzeltmesi küçük ve güvenli olanları testle düzelt; büyük olanları docs/GELISTIRME-PLANI.md'ye "bulgu" olarak yaz.
```

---

## Prompt 8: Sorun çıktığında
**CI kırmızı olursa**
```
GitHub Actions'taki son CI çalışması kırmızı. Önce hangi iş (server, client, mobile, e2e) ve hangi test düştüğünü bul, hatayı yerelde yeniden üret,
kök nedeni düzelt (testi silme/atlama/devre dışı bırakma YASAK), testleri çalıştır, push et, CI'ın yeşile döndüğünü doğrula.
```

**Birleştirme çakışması olursa**
```
git pull --rebase sırasında çakışma çıktı. Çakışan dosyaları tek tek incele, iki tarafın da amacını koruyarak çöz (birini körlemesine seçme),
EF migration/model snapshot çakışırsa migration'ı yeniden üret ve has-pending-model-changes ile doğrula. Tüm testler geçmeden push etme.
```

## Prompt 9: Oturum kapanışı (her işten sonra)
```
Oturumu kapatıyoruz. Sırasıyla:
1) git status temiz mi, push edilmemiş commit var mı? Varsa testleri çalıştırıp push et.
2) docs/GELISTIRME-PLANI.md ve docs/YOL-HARITASI.md'yi güncelle (ne bitti, ne sırada). AGENTS.md'deki "Durum" bölümü değiştiyse onu da.
3) Canlı sitenin (yeslojistik.onrender.com/api/health) yeni commit'i gösterdiğini ve CI'ın yeşil olduğunu doğrula.
4) Bana kısa Türkçe özet: ne yaptım, ne test ettim, neyi YAPAMADIM ve neden, bir sonraki oturumda ne yapmalı, benden ne lazım.
```

---

## Önemli notlar
- **Bir seferde bir iş verin.** Codex büyük "her şeyi yap" işlerinde yarım bırakabilir; küçük adımlarla ilerleyin.
- **Bloklu işler** (UETDS gönderme, e-Fatura gönderme, GPS) bilgi gelmeden verilmemeli; Codex uydurur.
- **Aynı anda iki yapay zekâyı** (Claude + Codex) aynı dala çalıştırmayın; biri bitince `git pull` yapın.
- Claude geri döndüğünde: "AGENTS.md ve docs/GELISTIRME-PLANI.md'yi oku, Codex'in son yaptıklarını `git log` ile özetle" demeniz yeter.
- Lisans **özel anahtarını** (`tools/license/` ile ürettiğiniz) Codex'e vermeyin; yalnızca sizde kalsın.
