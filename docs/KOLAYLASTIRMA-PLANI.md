# Kolaylaştırma planı: "Pratikortam kadar tanıdık, ondan daha sade ve şık"

*5 Ekim 2026. Müşteri (YES Lojistik) paneli pratikortam'a göre **çok zor** buldu. Kullanıcının isteği: pratikortam'daki gibi sekmeler ve menüler, aynı kullanım mantığı; ama daha basit görünen, göze hoş gelen, şık bir site.*

> **Kullanıcı planı onayladı (5 Ekim).** Kod düzeyinde adım adım uygulama: **`docs/KOLAYLASTIRMA-UYGULAMA.md`** (ChatGPT/Codex için görev kartları F1-F6).
> Bu belge **plandır**, henüz kod değişmedi. Uygulama aşama aşama yapılır ve her aşama müşteriye gösterilip onaylanır (bölüm 8).
> Pratikortam'ın ekran ve menü bilgisi `docs/PRATIKORTAM-HARITA.md` dosyasından gelir (salt okuma robotuyla çıkarıldı, veri içermez).

---

## 1. Özet (1 dakikada)
- **Sorun:** Panel çok şey yapıyor ama **pratikortam'a alışmış bir kullanıcı aradığını bulamıyor ve ekranlar kalabalık.**
  - Menü adları ve yerleri pratikortam'dan farklı.
  - Bir ekranda çok fazla düğme, süzgeç ve uyarı var.
  - Tablolar ekranın ancak yarısından sonra başlıyor.
- **Çözüm:** üç kural.
  1. **Aynı yer, aynı ad.** Menü, sekme ve düğme adları pratikortam'daki gibi olur, aynı sırada durur. Müşterinin alışkanlığı (kas hafızası) bozulmaz.
  2. **Az ama öz.** Her ekranda tek bir ana iş ve tek bir ana düğme olur. Gelişmiş seçenekler "Süzgeç" ya da "⋯ Diğer" altına saklanır. Liste ekranın en üstünden başlar.
  3. **Sakin ve şık görünüm.** Renk ve rozet sadece gerçekten dikkat isteyen yerde kullanılır. Bol boşluk, büyük ve net yazı, tutarlı simgeler olur.
- **Nasıl:**
  - Önce müşteriyi dinleriz. Ardından tıklanabilir bir **"Yeni görünüm"** hazırlarız; eski görünüm yerinde kalır, müşteri tek düğmeyle ikisi arasında geçer.
  - Ekranları sırayla yenileriz. Müşteri onaylayınca yeni görünüm varsayılan olur.
- **Süre (tahmin):** 4-6 hafta. İlk iki hafta sonunda müşteri yeni menüyü ve Sevkiyatlar ekranını dener.

---

## 2. Neden zor? (bugünkü panelde tespitler)
Bugünkü ekranlar 1440×900 bilgisayar ekranında incelendi (örnek veriyle, 5 Ekim).

| # | Tespit | Neden zor | Pratikortam'da nasıl |
|---|---|---|---|
| 1 | Sol menüde **23 madde**. Adlar pratikortam'dan farklı ("Müşteriler Cari" ayrı, "Müşteriler" ayrı; Tahsilatlar, Alınan Faturalar, Tedarikçi Ödemeleri ayrı ayrı sayfalar). | Kullanıcı aradığı ekranın adını bilmiyor. | ~20 madde, kendi bildiği adlar ve sıra: Bugün, e-Fatura, Raporlar, Sevkiyatlar, Listeler, Öz Mal, Yönetici, Banka & Çek. |
| 2 | **Sevkiyatlar** ekranında listeden önce şunlar var: 6 üst düğme, 4 görünüm düğmesi, 5 zaman düğmesi, 8 süzgeç kutusu, "Ayrıntılı süzgeç" ve kazanç şeridi. **İlk sevkiyat satırı ekranın yaklaşık %75'inde başlıyor; ilk bakışta yalnız 3 satır görünüyor.** | Asıl iş olan listeyi görmek için kaydırmak gerekiyor. | Liste hemen başlıyor. Süzgeç ayrı bir "Filtrele" penceresinde. |
| 3 | Her sevkiyat satırında **"UETDS 9 eksik"** gibi sarı rozetler var. | Her satırda uyarı olunca hiçbir uyarı fark edilmiyor ("alarm yorgunluğu"). Üstelik UETDS bildirimi henüz yapılmıyor. | Yok. |
| 4 | Satır sonunda birden çok düğme var ("Yüklendi yap", belge, kalem). Dar ekranda kalem simgesi kesiliyor. | Hangi düğmenin ne yaptığı belirsiz. | Satır başında tek bir "İşlemler" menüsü. |
| 5 | **Ana Sayfa'da** sırasıyla şunlar var: 7 kısayol, demo uyarısı, 4 rakam, 2 uyarı kutusu, nakit akışı tablosu, günlük seferler, "Bu ay" tablosu. | Kullanıcı nereden başlayacağını bilmiyor. | "Bugün" ekranı tek bir liste: bugünkü işler + Bugün/Gelecek/Geçmiş/Hepsi sekmeleri. |
| 6 | **"Sefer" ve "Sevkiyat"** aynı ekranda karışık kullanılıyor ("Sevkiyatlar" sayfasında "Sefer listesi", "Yeni Sefer"). | Aynı şeye iki ad, kafa karıştırıyor. | Her yerde "Sevkiyat". |
| 7 | Ayarlar'da 10 sekme var; "Veriler", "Veri ve hesap", "Veri Aktarımı" ayrı yerlerde. | Yönetim işleri dağınık. | "Yönetici" ve "Profilim" ayrı, sade. |
| 8 | Yazılar büyüdü (17,5 px) ve tablolar da tırnaklı yazıda. | Sık tablolarda satırlar uzuyor, ekrana daha az kayıt sığıyor. | Küçük, düz yazı; çok satır. |
| 9 | Sevkiyat formu 3 adım ve 2 katlanır bölümden oluşuyor; alan adları pratikortam'ın "İş Ekle" formundan farklı. | Alışık olunan sırayla doldurulamıyor. | Tek sayfa "İş Ekle": alanlar hep aynı yerde. "Formu açık tut" ve "Kopya sayısı" seçenekleri var. |

> **Not:** Bu tespitler bizim gözlemimiz. Müşterinin asıl "zor" dediği yerleri öğrenmek için bölüm 8'deki **K0 Dinleme** adımı şart.

---

## 3. Tasarım ilkeleri (her ekran bunlara uyar)
1. **Aynı yer, aynı ad.** Pratikortam'daki menü/sekme/düğme adı ve sırası korunur. Farklı yapmak için iyi bir neden yoksa farklı yapılmaz.
2. **Bir ekran = bir iş.** Ekranın amacı başlıkta yazar. Tek bir ana (yeşil) düğme olur, örneğin "+ Sevkiyat Ekle".
3. **Liste en üstte.**
   - Arama kutusu ve en çok kullanılan 1-2 süzgeç üstte durur.
   - Gerisi "Süzgeç" düğmesinin açtığı yan panelde.
   - Açık süzgeçler küçük çipler hâlinde görünür, tek tıkla silinir.
4. **Gelişmiş = gizli.** Excel, PDF, İcmal ve Excel'den aktar gibi nadir işler tek bir "⋯ Diğer" menüsünde toplanır.
5. **Rozet ve renk yalnız gerçek uyarı için.** Bir satırın %80'inde görünen bir uyarı uyarı değildir. Bunlar ayrı bir süzgeç ya da sekmeye taşınır, örneğin "UETDS eksik olanlar".
6. **Satır başına tek işlem menüsü.** Satıra tıklayınca ayrıntı açılır. Durum ilerletme tek bir belirgin düğmedir; geri kalanı "İşlemler" menüsündedir.
7. **Sade dil.** Kısa, günlük Türkçe kullanılır. Teknik terim yok: "Ayna modu", "dry-run", "UBL" gibi sözcükler ekranda görünmez.
8. **Tutarlılık.** Her listede aynı yerleşim: üstte arama ve süzgeç, sonra toplam şeridi, sonra tablo. Her formda kaydet düğmesi aynı yerde.
9. **Hızlı olmalı.** En sık 10 işin her biri en fazla 3 tıkla yapılır (bölüm 7).
10. **Erişilebilirlik.** Yazı boyutu ayarı (Aa) kalır. Klavyeyle kullanılabilir; yeterli renk karşıtlığı korunur.

---

## 4. Yeni menü ve sekmeler (bilgi mimarisi)

### 4.1 Sol menü: pratikortam ile aynı sıra ve adlar
Gruplar **hep açık kalır** (kullanıcının önceki isteği). Madde sayısı 23'ten 19'a iner.

| Pratikortam menüsü | Yeni menü (bizde) | Bugünkü karşılığı | Değişiklik |
|---|---|---|---|
| **Bugün** | **Bugün** | Ana Sayfa + İş Talepleri | Ana Sayfa sadeleşir; İş Talepleri buranın sekmesi olur (bkz. 5.1) |
| **e-Fatura** | **e-Fatura** | Faturalar, Alınan Faturalar, Yeni Fatura | Tek sayfa, sekmeli (bkz. 5.3) |
| **Raporlar** › Müşteriler Cari | Raporlar › **Müşteriler Cari** | Müşteriler Cari + Tahsilatlar | Tahsilatlar bu sayfanın sekmesi olur |
| Raporlar › Tedarikçiler Cari | Raporlar › **Tedarikçiler Cari** | Tedarikçiler Cari | Aynı |
| Raporlar › Tedarikçi Ödemeleri | Raporlar › **Tedarikçi Ödemeleri** | Tedarikçi Ödemeleri | Aynı |
| Raporlar › Analiz | Raporlar › **Analiz** | Raporlar | Ad değişir; ilk sekme "Genel Bakış" (tek sayfa özet) |
| **Sevkiyatlar** | **Sevkiyatlar** | Sevkiyatlar + Araç Takip Haritası | Harita, Sevkiyatlar'ın "Harita" görünümü olur |
| **Listeler** › Müşteri Listesi | Listeler › **Müşteri Listesi** | Müşteriler | Ad değişir |
| Listeler › Tedarikçi Listesi | Listeler › **Tedarikçi Listesi** | Tedarikçiler | Ad değişir |
| Listeler › Şöför Listesi | Listeler › **Şoför Listesi** | Şoförler | Ad değişir |
| Listeler › Personeller Listesi | Listeler › **Personel Listesi** | Personeller | Ad değişir |
| Listeler › Sabit Ödeme Listesi | Listeler › **Sabit Ödeme Listesi** | Sabit Ödemeler | Ad değişir |
| **Öz Mal** › Mazotlar | Öz Mal › **Mazotlar** | Giderler (Yakıt) | Yakıt giderleri kendi sayfasında, pratikortam'daki sütunlarla (Fark KM, KM başı) |
| Öz Mal › Giderler | Öz Mal › **Giderler** | Giderler | Yakıt dışındakiler |
| Öz Mal › Araç Masrafları | Öz Mal › **Araç Masrafları** | Giderler (araçlı) | Araca bağlı giderlerin görünümü |
| Öz Mal › Araçlar | Öz Mal › **Araçlar** | Araçlar | Aynı (öz/taşeron sekmeleri kalır) |
| **Yönetici** | **Yönetici** | Ayarlar (firma, kullanıcılar, fatura notları, işlem geçmişi, veriler, abonelik, veri ve hesap) + Veri Aktarımı + Kurulum | Tek yerde, sekmeli (bkz. 5.9) |
| **Banka & Çek** › Bankalar | Banka & Çek › **Bankalar** | Kasa / Banka | Ad değişir |
| Banka & Çek › Çekler | Banka & Çek › **Çekler** | Çek / Senet | Ad değişir |
| **Profilim** | **Profilim** (sağ üstte, kullanıcı menüsü) | Şifre, Güvenlik, Telefon Bildirimleri, Yazı boyutu | Kişisel ayarlar burada toplanır |
| — | **Yardım** (sağ üstte "?" simgesi) | Yardım | Menüden çıkar |

- **Üst çubuk:** arama (Ctrl K), **+ Yeni** menüsü (pratikortam sırasıyla), Aa, bildirim zili, Profilim.
- **Adresler değişmez** (`/seferler`, `/cari/musteriler`…): yeni menü mevcut adreslere bağlanır; sunucu bildirimleri ve yer imleri bozulmaz. Yalnız gerçekten yeni sayfalar (`/mazotlar`, `/arac-masraflari`) yeni adres alır.
- **Rol bazlı görünüm:** kullanıcı yetkisi olmayan menüleri görmez (bugünkü gibi). Şoför web panelinde yalnız uygulamaya yönlendirilir.

### 4.2 Sayfa içi sekmeler (pratikortam'daki gibi)
Her ana sayfanın üstünde sekmeler olur. Sekme seçimi adrese yazılır; sayfa yenilenince aynı sekme açılır.

| Sayfa | Sekmeler |
|---|---|
| Bugün | **Bugün** · Gelecek · Geçmiş · Hepsi (iş talepleri ve sevkiyatlar) · **Onay Bekleyenler** |
| e-Fatura | **Faturalandırılacaklar** · Kesilen Faturalar · Alınan (Gelen) Faturalar · Fatura Notları |
| Müşteriler Cari | **Bakiyeler** · Tahsilatlar · Vadesi Geçenler |
| Tedarikçiler Cari | **Bakiyeler** · Ödemeler · Alınan Faturalar |
| Sevkiyatlar | **Liste** · Pano · Harita, ayrıca zaman çipleri: Bugün · Gelecek · Geçmiş · Bu ay · Hepsi |
| Analiz | **Genel Bakış** · Sevkiyat Kazancı · Araç · Şoför · Mazot · Giderler · Müşteri · Yaşlandırma |
| Araçlar | **Öz araçlarım** · Taşeron araçları · Hepsi |
| Yönetici | **Firma** · Kullanıcılar · İşlem Geçmişi · Veri Aktarımı · Yedek ve Veri · Abonelik |
| Profilim | **Bilgilerim** · Şifre · Güvenlik (2 adımlı) · Bildirimler · Görünüm (yazı boyutu, yeni/eski görünüm) |

---

## 5. Ekran ekran yeni düzen

Her ekranda aynı iskelet kullanılır:
```
[Başlık]                                   [⋯ Diğer] [+ Ana düğme]
[Sekmeler]
[Arama ........] [1-2 hızlı süzgeç] [Süzgeç (3)]   ← açık süzgeçler çip olarak
[Toplam şeridi (tek satır, katlanabilir)]
[Tablo ......................................................]
```

### 5.1 Bugün (Ana Sayfa yerine)
- **Üstte üç rakam:** bugün yüklenecek, yolda, teslim edildi. Yalnız bunlar.
- **Hemen altında "Bugünkü işler" listesi:** iş talepleri ve sevkiyatlar birlikte, pratikortam'daki gibi. Sekmeler: Bugün / Gelecek / Geçmiş / Hepsi. "Kart / Tablo" görünüm seçimi.
- **"Onay Bekleyenler" sekmesi:** teslim evrakı, şoför masrafı ve fatura onayları tek listede, toplu onay düğmesiyle.
- **Kaldırılanlar:**
  - 7 kısayol (zaten **+ Yeni** menüsünde var);
  - nakit akışı ve "Bu ay" tabloları (Analiz → Genel Bakış'a taşınır);
  - demo uyarısı (yalnız Yönetici'de görünür).
- **Uyarılar** ("15 sevkiyat faturalanmadı" gibi) tek satırlık ince bant olur, en fazla 2 tane.

### 5.2 Sevkiyatlar
- **Üst sıra:**
  - Başlık "Sevkiyatlar", tek ana düğme **"+ Sevkiyat Ekle"**.
  - **⋯ Diğer** menüsünde: Excel (Özet / Detay), PDF, İcmal, Excel'den Aktar, Fatura Kes.
- **Sekmeler ve görünüm:** Liste · Pano · Harita, zaman çipleri: Bugün · Gelecek · Geçmiş · Bu ay · Hepsi.
- **Arama ve süzgeç:**
  - Bir arama kutusu: müşteri, plaka, şoför, yer, sevkiyat no.
  - **"Süzgeç"** düğmesi sağdan bir panel açar. Pratikortam'ın "Filtrele" penceresindeki sırayla:
    - tarih aralığı;
    - sevkiyat durumu (Faturalı / Faturasız / Komisyon İşi);
    - Piyasa / Öz Araç;
    - satış ve alış faturası (Kesilenler / Beklenenler);
    - firma, firma grubu, tedarikçi, plaka, şoför;
    - yükleme ve indirme yeri;
    - sevkiyat, teslim evrak ve fatura no;
    - evrak var/yok;
    - UETDS eksik.
  - Açık süzgeçler listenin üstünde çip olarak görünür.
- **Kazanç şeridi:** tek satır kalır; Müşteri Fiyat · Tedarikçi Fiyat · Kazanç · Faturası Kesilecek. Ayrıntısı "Ayrıntı ▾" ile açılır.
- **Tablo:**
  - Ekranın üstünden başlar; 1440×900'de **en az 12 satır** görünür.
  - Sütunlar: Tarih/No · Firma · Güzergâh · Araç/Şoför · Durum · Fiyat/Kazanç.
  - Durum hücresinde tek düğme: sıradaki durum ("Yüklendi yap").
  - Satır sonunda tek **"⋯"** menüsü: Düzenle, Kopyala, Evrak, Takip linki, Sevk belgesi, Sil.
  - **UETDS rozeti satırda görünmez.** Yalnız süzgeçte ve sevkiyat ayrıntısında görünür. Bildirim gönderme başlayınca yeniden değerlendirilir.
- **Satıra tıklayınca** sağdan ayrıntı paneli açılır; liste kaybolmaz.
  - Panelin sekmeleri: Bilgiler · Evrak · Takip · Geçmiş.
  - Düzenleme bu panelden yapılır.

### 5.3 e-Fatura
- **Faturalandırılacaklar** (varsayılan sekme): teslim edilmiş, faturası kesilmemiş sevkiyatlar müşteriye göre gruplanır. Her grupta "Fatura Kes" düğmesi var: pratikortam'daki "Sevkiyatı Faturalandır" işi tek tıkla açılır.
- **Kesilen Faturalar:** üstte "Sayaç kutuları" yer alır (onay bekleyen, gönderilen, iptal); altında liste, süzgeç toplamları (matrah, KDV, tevkifat, toplam) ve ⋯ Diğer menüsünde İcmal/Excel/PDF.
- **Alınan (Gelen) Faturalar:** bugünkü "Alınan Faturalar" sayfası buraya taşınır.
- **Fatura kesme ekranı** sade olur:
  - Müşteri seç, sevkiyatlar işaretli gelir.
  - Tarih/vade ve KDV/tevkifat "Otomatik"tir; özet "KDV %20 · tevkifat otomatik" diye yazar, değiştirmek isteyen açar.
  - Tek "Faturayı Kes" düğmesi olur.
  - KDV oranı farklı sevkiyatlar seçilirse uyarı seçim anında çıkar, "Faturayı Kes"e basınca değil.

### 5.4 Müşteriler Cari / Tedarikçiler Cari
- Pratikortam'daki sütunlar ve sıra korunur. Bugünkü tablo büyük ölçüde hazır; yalnız yerleşim iskelete uyar.
- **Her satırda iki düğme:** "Ekstre" ve "Tahsilat Ekle" (tedarikçide "Ödeme Ekle").
- **Ekstre ekranı:**
  - Kalan açık faturalar işaretlenerek tahsilat yapılır (pratikortam'daki "Ekstreden Tahsilat Ekle").
  - Ayna kapanınca etkin olur.
- **Tahsilatlar / Ödemeler** aynı sayfanın sekmesidir; ayrı menü maddesi değildir.

### 5.5 Listeler (Müşteri, Tedarikçi, Şoför, Personel, Sabit Ödeme)
- Hepsi aynı iskeleti kullanır: arama, "Arşivdekileri göster", ⋯ Diğer (Excel, Excel'den aktar), "+ Ekle".
- Sütunlar pratikortam'daki gibidir (ör. Müşteri: No, Firma, VKN/TCKN, VD, Telefon, İl/İlçe, Yetkili).
- Kayda tıklayınca kart açılır. Kart sekmeleri: Bilgiler · Cari/Ekstre · Sevkiyatlar · Belgeler.

### 5.6 Öz Mal (Mazotlar, Giderler, Araç Masrafları, Araçlar)
- **Mazotlar:** pratikortam sütunları kullanılır: Plaka, Tarih, Yakıt cinsi, İstasyon, Tutar, Yeni KM, Eski KM, Fark KM, KM başı, Litre. Altta toplam.
- **Giderler:** kategori dağılımı tek satırlık şerittir; liste ve "+ Gider Ekle".
- **Araç Masrafları:** araca bağlı giderlerin listesidir; araç seçince süzülür.
- **Araçlar:** sekmeler aynı kalır (öz araçlarım varsayılan).
  - Belge uyarıları sütun yerine tek bir "uyarı" simgesi olur.
  - Simgenin üzerine gelince ayrıntı görünür.

### 5.7 Banka & Çek
- **Bankalar:** her hesap bir kart (bakiye büyük yazıyla). Kartın altında son 5 hareket ve "Tüm hareketler" bağlantısı.
- **Çekler:** sekmeler Portföyde · Ciro edilen · Tahsil edilen · Verilen. Vadesi yaklaşanlar üstte.

### 5.8 Analiz
- **Genel Bakış**, pratikortam'daki "Analiz" sayfası gibi:
  - üstte plaka ve tarih seçimi;
  - Toplam Kazanç, Toplam Gider, Net Kazanç;
  - piyasa / öz mal / mazot / gider / personel kırılımı;
  - 12 aylık grafik;
  - "Tüm Rapor Excel / PDF".
- Diğer raporlar sekmelerde durur, her biri tek tablo ve tek grafik.

### 5.9 Yönetici ve Profilim
- **Yönetici:** firma ayarları, kullanıcılar, işlem geçmişi, veri aktarımı, yedek, abonelik tek yerde, sekmeli. Teknik kartlar ("ayna eşleştirme", "dry-run" vb.) **"Gelişmiş"** başlığı altına iner.
- **Profilim:** kişisel her şey burada; şifre, 2 adımlı doğrulama, bildirimler, yazı boyutu, yeni/eski görünüm.

### 5.10 Formlar: "Sevkiyat Ekle" (pratikortam "İş Ekle" gibi)
- **Tek sayfalık iki sütunlu form.** Alanlar pratikortam "İş Ekle" sırasıyla dizilir:
  - Firma;
  - Yükleme yeri ve tarihi, İndirme yeri ve tarihi;
  - Araç, Şoför;
  - Yük cinsi ve miktarı;
  - Müşteri fiyatı, Tedarikçi fiyatı;
  - Açıklama.
- **Adım numaraları kalkar.** Komisyon, evrak ve UETDS alanları "Diğer bilgiler" bölümündedir; dolu ise açık gelir.
- **Pratikortam'daki iki seçenek eklenir:** **"Formu açık tut"** (kaydettikten sonra yeni boş form) ve **"Kopya sayısı"** (aynı işten N tane aç).
- **Akıllı doldurma kalır:** son sevkiyatı doldur, araç seçince şoför gelir, son fiyatları kullan.
- **Kaydet düğmesi hep görünür:** ekranın altında sabit "Kaydet" ve "Kaydet ve yeni ekle".
- **Diğer formlar** (Gider, Tahsilat, Ödeme, Müşteri, Araç, Şoför) aynı kurala uyar: önce zorunlular, sonra "Diğer bilgiler".

### 5.11 Telefon
- Alt çubuk aynı mantıkla kalır: Bugün · Sevkiyatlar · (+) · Cari · Menü.
- Listeler telefonda kart olarak görünür. Süzgeç tam ekran açılır.

---

## 6. Görünüm: "sade ama şık"
Mevcut "Otoyol" kimliği (koyu çam yeşili menü, açık zemin) korunur; şu ayarlar yapılır:

| Konu | Bugün | Yeni | Neden |
|---|---|---|---|
| Yazı tipi | Her yerde Source Serif 4 (tırnaklı) | **Başlıklar ve metinler Source Serif 4** (kullanıcının sevdiği Claude benzeri yazı). **Tablo ve form alanları için düz eşi Source Sans 3** önerilir: sık tablolarda okunurluğu artırır. Müşteriye iki seçenekle gösterilir, o seçer. | Şıklık başlıkta, okunurluk tabloda |
| Yazı boyutu | Taban 17,5 px (Aa ile büyür) | Taban aynı kalır. Tablolar için **"Satır sıklığı: Rahat / Sık"** ayarı eklenir (Profilim → Görünüm). Aa ayarı kalır. | Çok satır görmek isteyen sık seçer |
| Renk | Yeşil, sarı, mavi, kırmızı rozetler her yerde | **Nötr zemin + tek vurgu rengi (yeşil).** Sarı yalnız "dikkat", kırmızı yalnız "hata/gecikme". Durum etiketleri yumuşak tonlu, küçük. | Göz yorulmaz, uyarı gerçekten fark edilir |
| Boşluk | Sık, kutular üst üste | Bölümler arası daha fazla boşluk, kart sayısı az | Ferah, düzenli görünüm |
| Köşe / gölge | Neredeyse keskin, gölgesiz | Kartlarda hafif yuvarlak köşe (6 px), açılır pencerelerde yumuşak gölge | "Şık" hissi, ama abartısız |
| Simgeler | Çoğu yerde var | Yalnız menüde ve düğmelerde; tablo başlıklarında yok | Daha sakin ekran |
| Boş ekranlar | Bazılarında yönlendirme var | Her listede: "Henüz kayıt yok, + Ekle" | Ne yapacağı belli |

Görsel yön, uygulamaya geçmeden önce **3 ekranlık bir örnek sayfayla** müşteriye gösterilir (K1).

---

## 7. Başarı ölçüsü: en sık 10 iş
Uygulama öncesi ve sonrası her iş için tık sayısı ölçülür. Pratikortam'daki tık sayısı da müşteriyle birlikte ölçülür (K0).

| # | İş | Hedef |
|---|---|---|
| 1 | Yeni sevkiyat girmek | **+ Yeni → Sevkiyat**, form, Kaydet: tek ekran |
| 2 | Bugünkü sevkiyatları görmek | Menü → Bugün: 1 tık |
| 3 | Sevkiyat durumunu ilerletmek (Yüklendi/Yolda/Teslim) | Satırdaki düğme: 1 tık |
| 4 | Sevkiyat bulmak (plaka/firma ile) | Arama kutusu: yaz, Enter |
| 5 | Fatura kesmek | e-Fatura → Faturalandırılacaklar → Fatura Kes → Kes: 3 tık |
| 6 | Müşteri bakiyesine ve ekstresine bakmak | Müşteriler Cari → Ekstre: 2 tık |
| 7 | Tahsilat girmek | Müşteriler Cari → satırda Tahsilat Ekle: 2 tık + form |
| 8 | Tedarikçiye ödeme girmek | Tedarikçiler Cari → Ödeme Ekle: 2 tık + form |
| 9 | Mazot / gider girmek | + Yeni → Mazot (Gider): tek ekran |
| 10 | Aylık kazancı görmek | Analiz → Genel Bakış: 1 tık |

**Kabul testi:**
- Müşteri, **yardım almadan** bu 10 işten en az 9'unu yapabilmeli.
- Pratikortam'dakinden daha uzun sürmemeli. Süre telefonla ya da ekran kaydıyla ölçülür.

---

## 8. Uygulama aşamaları

Kural: **canlı site hiçbir aşamada bozulmaz.**
- Yeni görünüm bir **anahtarın** (Profilim → Görünüm → "Yeni görünüm") arkasında gelişir.
- Müşteri onaylayana kadar eski görünüm varsayılan kalır.
- Her aşamada şunlar yapılır: testler (sunucu + tarayıcı), önce/sonra ekran görüntüleri ve müşteri onayı.

### K0. Dinleme ve ölçüm (2-3 gün) ← **ilk iş**
- Müşteriyle 30 dakikalık görüşme yapılır:
  - Hangi ekranlarda zorlanıyor?
  - En sık hangi işleri yapıyor?
  - Pratikortam'da en sevdiği şey ne?
- Müşteri pratikortam'da 3 işi gösterir, ekran kaydı alınır (kendi bilgisayarında). Veriler kayıt dışında tutulur; depoya girmez.
- Bölüm 7'deki 10 iş için bugünkü panelde ve pratikortam'da tık sayısı çıkarılır.
- **Çıktı:** `docs/KOLAYLASTIRMA-DINLEME.md`, veri içermeyen notlar. Bölüm 2'deki tespitler güncellenir, öncelik sırası netleşir.

### K1. Görsel örnek ve tıklanabilir prototip (3-4 gün)
- 3 ekran için iki görsel seçenek hazırlanır:
  - **A:** tamamen tırnaklı yazı;
  - **B:** tırnaklı başlık + düz tablo.
- Ekranlar: Bugün, Sevkiyatlar, Müşteriler Cari. Sahte veri kullanılır.
- Yeni menü ve sekmelerle tıklanabilir bir örnek hazırlanır: gerçek panelde "Yeni görünüm" anahtarı ya da ayrı bir önizleme sayfası.
- **Müşteri seçer ve onaylar.** Seçim `docs/TASARIM-OTOYOL.md` dosyasına "Otoyol 2" olarak yazılır.

### K2. Menü, sekmeler ve sayfa iskeleti (1 hafta)
- Yeni sol menü (bölüm 4.1) ve sayfa içi sekmeler (4.2) yapılır. Eski adresler yönlendirilir.
- Ortak "liste iskeleti" yapılır (başlık + ⋯ Diğer + ana düğme + sekmeler + arama/süzgeç paneli + toplam şeridi + tablo). Bütün listeler bunu kullanır.
- Ortak "sağdan ayrıntı paneli" ve "Süzgeç paneli" parçaları yapılır.
- Profilim ve Yönetici ayrılır.
- "Sefer" yazıları her yerde **"Sevkiyat"** olur (`docs/TERIMLER.md` 1. satır; bu plan onaylanınca o satır da onaylanmış sayılır).

### K3. Bugün + Sevkiyatlar + Sevkiyat Ekle formu (1 hafta)
- Bölüm 5.1, 5.2 ve 5.10.
- Kabul ölçütleri:
  - 1440×900'de en az 12 sevkiyat satırı görünür;
  - satır başına tek işlem menüsü vardır;
  - UETDS rozeti listede görünmez;
  - "Formu açık tut" ve "Kopya sayısı" çalışır.

### K4. e-Fatura + Cari + Banka & Çek (1 hafta)
- Bölüm 5.3, 5.4 ve 5.7.
- Karışık KDV uyarısı seçim anında çıkar.

### K5. Listeler + Öz Mal + Analiz + diğer formlar (1 hafta)
- Bölüm 5.5, 5.6, 5.8 ve 5.11.
- Mazotlar ayrı sayfa olur, Analiz → Genel Bakış eklenir.

### K6. Cila, yardım ve geçiş (3-4 gün)
- Boş ekranlar, yükleniyor/hata durumları, telefon görünümü ve klavye kısayolları gözden geçirilir.
- Yardım sayfası yeni ekranlara göre güncellenir. Her ana iş için 30-60 saniyelik kısa ekran videoları hazırlanır (pratikortam'daki "Eğitim Videoları" gibi).
- Kabul testi (bölüm 7) müşteriyle yapılır.
- Müşteri onaylayınca **"Yeni görünüm" varsayılan olur.** Eski görünüm 2 hafta seçenek olarak kalır, sonra kaldırılır.

---

## 9. Teknik notlar (geliştirici için)
- **Sunucu değişmez.** Bu iş neredeyse tamamen `client/` içindedir. Yeni bir veri alanı gerekmez. Tek istisna: "Kopya sayısı" mevcut sevkiyat oluşturma uç noktası tekrar çağrılarak yapılır.
- **Yeni ortak parçalar** (`client/src/components/`):
  - `PageShell` (başlık + ⋯ Diğer + ana düğme + sekmeler);
  - `FilterPanel` (sağdan açılan süzgeç, açık süzgeç çipleri);
  - `DetailDrawer` (sağdan ayrıntı paneli);
  - `RowMenu` (satır "⋯" menüsü);
  - `MoreMenu` (⋯ Diğer).
  - Mevcut `DataTable`, `SumStrip`, `Chip`, `Modal`, `useOpenNewFromUrl` yeniden kullanılır.
- **Görünüm anahtarı:** `localStorage` + kullanıcı tercihi (`yes.layout = 'classic' | 'new'`). Menü ve sayfa iskeleti bu değere göre seçilir. Sayfa içerikleri ortak kalır, kod iki kez yazılmaz.
- **Adresler değişmez** (bkz. `KOLAYLASTIRMA-UYGULAMA.md` bölüm 0). Sekmeler mevcut sayfalar arasında bağlantıdır.
- **Ayna modu** bu işten etkilenmez: yazma düğmeleri `write` ile yine gizlenir.
- **Testler:**
  - Her aşamada `client/e2e` güncellenir. Seçiciler metin değiştiği için güncellenmeli.
  - Yeni testler eklenir: menüde pratikortam sırası, satır menüsü, süzgeç paneli, en sık 10 iş.
  - Ekran görüntüleri (1440×900 ve 390×844) her aşamada alınır.
- **Erişilebilirlik:** sekmeler `role="tablist"`, paneller odak hapsi, klavye ile tam kullanım.

---

## 10. Riskler
| Risk | Önlem |
|---|---|
| Müşteri yeni düzene de alışamaz | K0 dinleme + K1 prototip onayı. Eski görünüm geçiş süresince seçenek olarak kalır |
| Pratikortam'ı birebir kopyalamak hukuki sorun yaratır | Kopyalanan şey **menü adları ve iş akışı**; bunlar sektörde genel. Görsel tasarım, kod ve metinler bizimdir. Pratikortam'ın logosu, renkleri ve ekran düzeni birebir alınmaz |
| Ekranlar sadeleşirken bir özellik "kaybolur" | Her kaldırılan şeyin yeni yeri bu belgede yazılı. K2'de "eski → yeni" tablosu ekranda yardımda da görünür |
| Testler çok kırılır | Seçicileri metin yerine rol/etiketle yazmak; her aşamada tüm testleri güncellemek |
| Büyük yazı + çok satır isteği çelişir | "Satır sıklığı" ayarı ve düz tablo yazısı seçeneği |

---

## 11. Sizden (kullanıcıdan) gerekenler
1. **Müşteriyle 30 dakikalık görüşme** (K0): hangi ekran zor, en sık işler, pratikortam'da en sevdiği şey. İsterseniz görüşme sorularını da hazırlarım.
2. **Pratikortam'dan 3-4 ekran görüntüsü** (Bugün, Sevkiyatlar, Müşteriler Cari, İş Ekle). Müşteri adı ve tutarlar **karartılmış** olmalı; yerleşimi birebir anlamak için. *(Pratikortam'a biz giremeyiz; giriş sizin.)*
3. **Onaylar:**
   - bu planın genel yönü;
   - K1'de görsel seçim (A ya da B);
   - "Sefer" yerine her yerde "Sevkiyat" (terim tablosu 1. satır).

---

## 12. Codex / yapay zekâ için uygulama talimatı
Her aşama ayrı oturumda yapılır. Ortak başlık `docs/CODEX-PROMPTLARI.md` dosyasında. Görev metni:

```
docs/KOLAYLASTIRMA-PLANI.md dosyasını baştan sona oku. Şimdi bölüm 8'deki [K2 / K3 / K4 / K5 / K6] aşamasını uygula.
Kurallar: AGENTS.md'ye uy; canlı site bozulmasın, yeni düzen "Yeni görünüm" anahtarının arkasında gelişsin (bölüm 9);
pratikortam'a erişme; sunucu değiştirme gerekiyorsa önce bana sor.
Bitince: lint + build + sunucu testleri + bütün e2e testleri; 1440x900 ve 390x844 önce/sonra ekran görüntüleri;
bölüm 7'deki ilgili işlerin tık sayısı; docs/KOLAYLASTIRMA-PLANI.md'de aşamanın durumunu "yapıldı" diye işaretle; commit + push.
Bana kısa Türkçe özet: ne değişti, nerede, müşteriye neyi göstermeliyim.
```

---

## Durum
Aşama adları: plan K0-K6 ↔ uygulama kılavuzu F1-F6 (K1+K2 = F1, K3 = F2, K4 = F3, K5 = F4 + F5, K6 = F6).

| Aşama | Durum |
|---|---|
| K0 Dinleme (müşteri görüşmesi) | Bekliyor; uygulamayı durdurmaz, F2 sonunda müşteriye gösterilir |
| F1 Anahtar, menü, sekmeler, ortak parçalar, terim | **Kısmen yapıldı (5 Ekim):** görünüm anahtarı (kullanıcı menüsü → Görünüm), pratikortam sıralı yeni menü, bölüm sekmeleri, pratikortam başlıkları, MoreMenu/RowMenu/FilterBar/FilterPanel. F1.5: panelde görünen bütün "Sefer" yazıları "Sevkiyat" oldu (sunucu mesajları ve şoför uygulaması henüz değil) |
| F2 Bugün + Sevkiyatlar + Sevkiyat Ekle | **Kısmen yapıldı (5 Ekim):** Bugün ekranı (3 rakam, 2 uyarı, bugünkü sevkiyatlar), Sevkiyatlar (⋯ Diğer, tek ana düğme, süzgeç paneli + çipler, satır menüsü, UETDS rozeti listede yok; ilk ekranda 3 → 7-8 satır). Kalan: Onay Bekleyenler sekmesi, F2.3 Sevkiyat Ekle formu |
| F3 e-Fatura + Cari + Banka & Çek | Bekliyor |
| F4 Listeler + Öz Mal + Analiz + Yönetici | Bekliyor |
| F5 Formlar + telefon | Bekliyor |
| F6 Cila, yardım, varsayılan yapma | Bekliyor |
