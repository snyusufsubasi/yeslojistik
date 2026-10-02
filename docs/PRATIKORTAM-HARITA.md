# Pratikortam haritası ve YES Lojistik karşılaştırması

> Bu belgede kişisel ya da firma verisi yoktur: müşteri adı, VKN, plaka, tutar, kişi adı yazılmaz.
> Yalnız ekran adları, alan etiketleri ve genel seçenek listeleri ("Piyasa / Öz Araç" gibi) vardır.
>
> **Nasıl çıkarıldı (2 Ekim):** `tools/legacy/crawl.mjs` salt okuma robotu ile. Robot yalnız giriş formunu gönderdi,
> başka hiçbir kayıt/silme/güncelleme isteği yapmadı, saniyede en fazla 1 sayfa açtı. 83 sayfa okundu (48 ayrı ekran şablonu),
> güvenli olmayan 86 adres (düzenle/sil/çıkış bağlantıları) hiç açılmadı. Çıktılar repo dışında kaldı.
>
> **Bilinen boşluk:** "Sevkiyat Düzenle" sayfası (`i_d_new.php`) robotun güvenlik kuralı yüzünden açılmadı.
> Alanları "İş Ekle" formundan ve sevkiyat listesinin sütunlarından çıkarıldı; ikisi aynı alanları kullanıyor.

**Durum sütunu:** **Var** = bizde aynı iş yapılabiliyor. **Kısmen** = var ama bazı alan/işlem eksik.
**Eksik** = bizde yok. **Gerek yok** = pratikortam'ın kendi aboneliği/kontörü gibi bize ait olmayan ekran.

> **Unutmayın:** panel şu an pratikortam'ın aynası (ayna modu açıkken kayıt değiştirilmez). Bu yüzden önceliklerde
> önce **görme, süzme, rapor ve dışa aktarma** farkları, sonra **kayıt girme** farkları geliyor.

## 1. Menü düzeni

Pratikortam'ın sol menüsü (görünen maddeler):

- **Bugün** · **e-Fatura**
- **Raporlar:** Müşteriler Cari · Tedarikçiler Cari · Tedarikçi Ödemeleri · Analiz
- **Sevkiyatlar**
- **Listeler:** Müşteri Listesi · Tedarikçi Listesi · Şöför Listesi · Personeller Listesi · Sabit Ödeme Listesi
- **Öz Mal:** Mazotlar · Giderler · Araç Masrafları · Araçlar
- **Yönetici**
- **Banka & çek:** Bankalar · Çekler
- **Profilim** · Çıkış

Sayfanın kodunda olup menüde **kapatılmış (gizli)** maddeler: Müşteri Ekstre, Tedarikçi Ekstre, Şöför Ekstre,
İstatistikler, Komisyon Takip, Özel İşlemler → Muhasebe, Akaryakıt. Ekstreler cari tablolarındaki "Ekstre" düğmesiyle açılıyor.

Bizim menü aynı grupları izliyor: Sevkiyat · Cari · Listeler · Öz Mal · Banka & Çek · Rapor ve Yönetim (`client/src/components/Layout.tsx`).

## 2. Ekran ekran karşılaştırma

### 2.1 Ana sayfa (Bugün ekranı)

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Ana sayfa: iş talepleri listesi | Araç atanmamış işler; Bugün / Gelecek / Geçmiş / Hepsi sekmeleri, "Kartlı göster / Tablo göster" | İş Talepleri (`/is-talepleri`) + Ana Sayfa'daki bugünün işleri | Kısmen | Bugün/Gelecek/Geçmiş/Hepsi sekmeleri yok (tarih süzgeci var); masaüstünde kartlı görünüm seçeneği yok | Sevkiyatlar'daki hap düğmelerini İş Talepleri'ne de koyalım |
| İş filtrele | İşleri firma, firma grubu, tarih aralığı, indirme yerine göre süzer | İş Talepleri süzgeci (durum, tarih) | Kısmen | Firma grubu ve indirme yeri süzgeci yok | Müşteri, grup ve yer süzgeci ekleyelim |
| İş ekle (hızlı pencere ve tam sayfa) | Yeni iş talebi açar | İş Talebi formu | Kısmen | Kopya sayısı (aynı işten birden çok açma), "formu açık tut", fiyatlarda "KDV dahil" işaretleri, masraf tedarikçisi VKN/ünvan, firma grubu, km, iş görseli / yükleme evrak görseli / irsaliye görseli yükleme, "Koordinatları bul" | Kopya sayısı ve "formu açık tut" çok kullanılıyorsa önce onlar |
| Excel ile iş talebi yükle (+ Örnek Excel İndir) | İşleri Excel'den toplu yükler | İş Talepleri → Excel'den Aktar (şablon indirilebilir) | Var | — | — |
| İşleri dışa aktar | İş listesini Excel'e verir | — | Eksik | İş talepleri Excel çıktısı | Diğer listelerdeki Excel düğmesinin aynısı |
| Onay Bekleyenler | Onay bekleyen sevkiyatlar (sevkiyat, firma, şoför, araç, yer, mal, komisyon) | Sevkiyatlar → "Onay bekleyen teslim evrakları" hapı; Giderler'de onay bekleyen masraflar | Kısmen | Ayrı bir "onay bekleyenler" ekranı ve toplu onay yok | Ana Sayfa'ya tek bir "onay bekleyenler" kartı |
| Eğitim Videoları | Kullanım videoları | Yardım sayfası (yazılı anlatım) | Kısmen | Video yok | Kısa ekran videoları eklenebilir |
| Bugün | Bugünün sevkiyatları | Sevkiyatlar → "Bugün" hapı | Var | — | — |

### 2.2 e-Fatura

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Operasyon ekranı (sayaçlı kutular) | Onay bekleyen, gönderilen e-Fatura/e-Arşiv, faturalandırılacak sevkiyat sayıları tek ekranda | Faturalar sayfası + menüdeki sayaçlar | Kısmen | Tüm fatura sayılarının bir arada olduğu özet ekran yok | Faturalar sayfasının üstüne sayaç kutuları |
| Gelen faturalar / Onay bekleyen faturalar | Entegratörden gelen e-faturaları kabul / red etme | Alınan Faturalar (elle girilir) | Eksik | Gelen e-faturaları entegratörden çekme, kabul/red | Entegratör bağlanınca yapılır (bkz. `docs/E-FATURA.md`) |
| Kabul edilen gelen e-faturalar | Kabul edilmiş gelen faturaların listesi | Alınan Faturalar | Kısmen | Entegratörden otomatik gelmiyor | Yukarıdakiyle birlikte |
| Gönderilen e-Faturalar / Gönderilen arşiv faturalar (Faturalar listesi) | Kesilen ve alınan faturalar; süzgeç: fatura türü (e-Fatura / Arşiv), işlem (Kesilen / Alınan), müşteri, tedarikçi, tarih, fatura no, sevkiyat no, durum (Kabul / Red / Onay Bekliyor / Tekrar Gönder); üstte satış-alış-fark "kazanç tablosu" | Faturalar (`/faturalar`) ve Alınan Faturalar | Kısmen | Kesilen ve alınan faturaların tek listede görünmesi; satış/alış/fark özeti; sevkiyat no ile arama; süzgeç toplamları (matrah, KDV, tevkifat, genel toplam); toplu XML ve toplu PDF indirme (bizde ayda bir ZIP var) | Faturalar'a süzgeç toplamı ve sevkiyat no araması |
| Sevkiyatı Faturalandır | Sevkiyat seçip fatura keser | Yeni Fatura (`/faturalar/yeni`): müşteri seç, seferleri işaretle | Var | — | — |
| Pratik Ortam Fatura Oluştur | Sevkiyatsız elle e-fatura; içinden yeni müşteri/tedarikçi kartı açılabiliyor | Yeni Fatura → "Ek Satırlar" | Kısmen | Tedarikçiye fatura kesme (iade gibi); fatura ekranından yeni cari açma | Gerekirse sonra |
| Manuel Fatura Ekle | Eski/elle fatura kaydı: cari türü (Tedarikçi / Müşteri), işlem (Alınan / Kesilen / Masraf Faturası), para birimi, fatura no, "FİŞ" işareti, tarih, vade (gün), PDF, matrah, KDV, tevkifat, toplam, açıklama, fatura tipi (e-Fatura / e-Arşiv), sevkiyat seçimi | Alınan Faturalar (tür: e-Fatura / e-Arşiv / kâğıt / fiş, PDF, KDV, tevkifat, sefer bağlama); Faturalar → Excel'den Aktar | Kısmen | Para birimi; "Masraf Faturası" türü; müşteriden alınan fatura | Para birimi kararı Döviz maddesiyle birlikte |
| Fatura & Sevkiyat Eşleşme | Gelen/kesilen faturayı sevkiyatlarla eşler (tutar kontrolüyle) | Alınan Faturalar'da sefer bağlama; Yeni Fatura'da sefer seçimi | Var | — | — |
| e-Fatura Notları | Satış ve tevkifat fatura notları (başlık, hesap ismi, IBAN, açıklama) | Fatura notları (Faturalar sayfası) | Var | — | — |
| Kontör Paketleri | Pratikortam'dan e-fatura kontörü satın alma | — | Gerek yok | — | — |

### 2.3 Raporlar (Cari, Ekstre, Analiz)

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Müşteriler Cari | Her müşterinin bakiyesi. Sütunlar: Müşteri VKN, Firma, Kesilen Fatura, Alınan Fatura, İptal Fatura, Fatura Bekleyen Sevkiyat Alacak, Faturasız Sevkiyatlar, Alınan Ödeme, Verilen Ödeme, Bakiye; her sütunda sıralama, A-Z, Excel, PDF | Müşteriler Cari (`/cari/musteriler`): Devir, Kesilen Fatura, Alınan Ödeme, Sefer Borcu, Verilen Ödeme, Bakiye; ayna modunda "Bakiye (pratikortam)" | Kısmen | Alınan Fatura, İptal Fatura, Faturasız Sevkiyatlar sütunları; her sütunda sıralama; listenin Excel ve PDF çıktısı | Yüksek: kuzen bu tabloya her gün bakıyor |
| Vadesi Geçen / Açık Faturalar | Cari tablosundan açılan vadesi geçmiş faturalar | Cari'de "Vadesi geçenler" seçeneği, uyarılar | Var | — | — |
| Müşteri Ekstre | İşlem dökümü (Tarih, İşlem, Açıklama, Fatura No, Borç, Alacak, Bakiye, önceden devreden); süzgeç: firma, para türü, tarih, "Fatura Alacak" / "Sevkiyat Alacak" işaretleri; Excel, PDF | Müşteri kartı → Hesap Ekstresi (PDF, e-posta, tarih aralığı) | Kısmen | Ekstrenin Excel çıktısı; faturasız sevkiyat alacağını ekstreye katma seçeneği; para türü | Ekstreye Excel ve "faturasız seferleri de göster" seçeneği |
| Ekstreden Tahsilat Ekle | Tahsilat girip açık faturaları tek tek işaretleyerek kapatma; banka, tarih, sevkiyat no, açıklama | Tahsilatlar formu (tek fatura ya da otomatik en eskiden dağıtım) | Kısmen | Birden çok faturayı işaretleyerek kapatma; ekstre ekranından doğrudan tahsilat; müşteriye ödeme (iade) girişi | Ayna kapanınca (kayıt girişi başlayınca) |
| Çek ile Tahsilat Yap | Müşteriden çek alma (çek no, tutar, alış tarihi, vade, banka, açıklama) | Tahsilat formu → yöntem Çek / Senet | Var | — | — |
| Fatura İcmali | Seçilen faturanın/dönemin sevkiyat dökümü: No, Tarih, Plaka, Yükleme Yeri, İndirme Yeri, Yük Cinsi, Yük Miktar, KM, Açıklama, Mal Hizmet Tutar, Genel Toplam; firma adres/VD/VKN başlığıyla yazdırılır | — | Eksik | İcmal belgesi (PDF) | Yüksek: müşteriye fatura ekinde gidiyor |
| Fatura Sil (nedenli) | Faturayı silme nedeni yazarak siler | Fatura → İptal et | Kısmen | İptal/silme nedeni alanı | Düşük |
| Tedarikçiler Cari | Tedarikçi bakiyeleri; müşteri cari ile aynı sütunlar; "Seçilenleri Listeye Ekle" (ödeme listesi), satır/sayfa seçimi, Excel, PDF | Tedarikçiler Cari (`/cari/tedarikciler`) | Kısmen | Aynı eksik sütunlar; seçilenlerden ödeme listesi; Excel/PDF; sıralama | Müşteri carisiyle birlikte yapılır |
| Tedarikçi Ekstre | Tedarikçi işlem dökümü (Borç / Alacak / Bakiye), süzgeç: tarih, para türü, "Fatura Alacak" / "Fatura Bekleyen" | Tedarikçi kartı → ekstre PDF | Kısmen | Excel; "fatura bekleyen seferleri göster" seçeneği | Müşteri ekstresiyle birlikte |
| Ekstreden Ödeme Ekle / Gidere Ekle | Tedarikçiye ödeme; istenirse aynı anda gider kaydı (gider kategorisiyle) | Tedarikçi Ödemeleri formu | Kısmen | "Gidere de yaz" seçeneği | Düşük; bizde taşeron maliyeti zaten seferden geliyor |
| Çek ile Ödeme Yap | Tedarikçiye yeni çek yazma ya da portföydeki çeki verme | Çek / Senet → Ciro et (müşteri çekini tedarikçiye verme) | Kısmen | Kendi çekimizi yazma (verilen çek) ve vadesini izleme | Orta |
| Tedarikçiye Yapılan EFT | Ekstreden ödemeleri ayrı listeleme | Tedarikçi Ödemeleri süzgeci | Var | — | — |
| Tedarikçi Ödemeleri | Ödemeler: Tedarikçi VKN, Adı, Fatura No, Fatura Tutarı, Fatura Tarihi, Sevkiyat No, Ödeme Tarihi, Yapılan Ödeme, Açıklama; Düzenle; Excel, PDF | Tedarikçi Ödemeleri (`/odemeler`): Tarih, Tedarikçi, Sefer, Yöntem, Açıklama, Tutar; Excel | Kısmen | Ödemenin bağlı olduğu fatura no/tutar/tarih sütunları; PDF | Orta |
| Toplu Ödemeler | Birden çok tedarikçiye toplu ödeme listesi | — | Eksik | Toplu seçim ve toplu ödeme | Orta (ayna kapanınca) |
| Analiz | Plaka ve tarih seçerek tek ekranda: Toplam Kazanç, Toplam Gider, Net Kazanç; Piyasa sevkiyat net, Özmal sevkiyat, Mazot, Masraf, Gider, Personel, Ödemeler, Fatura ekstre bölümleri; son 12 ay net kazanç grafiği; Bu Ay / Tüm Zamanlar; "Tüm Rapor Excel", "Tüm Rapor PDF" | Raporlar (`/raporlar`): Aylık Özet, Sefer Kârlılığı, Araç Bazlı, Şoför Bazlı, Yakıt, Gider Dağılımı, Müşteri Kârlılığı, Güzergâh, Alacak/Borç Yaşlandırma, Muhasebe Aktarımı; her sekme Excel | Kısmen | Hepsini tek sayfada birleştiren "işletme özeti" (gider + personel + ödemeler dahil); rapor PDF'i | Orta: Aylık Özet'e gider/personel ekleyip PDF |
| Şöför Ekstre (menüde gizli) | Şoför hesap dökümü | Şoför kartı → Hesap (dökümü ve Excel) | Var | — | — |
| İstatistikler (menüde gizli) | Kapalı ekran | Raporlar | Var | — | — |
| Komisyon Takip (menüde gizli) | Komisyon kazançları | Sevkiyatlar → "Komisyonu beklenenler" hapı | Kısmen | Komisyon için ayrı özet | Düşük |

### 2.4 Sevkiyatlar

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Sevkiyat listesi | Sütunlar: İşlemler, Sevkiyat, Firma Ünvanı, Fatura Başlığı, Şöför Bilgisi, Araç Bilgisi, Ürün Bilgisi, Yükleme Noktası, İndirme Noktası, Açıklama, Fiyat Bilgisi, Komisyon, Masraf, Fatura Bilgisi, Personel Bilgisi | Sevkiyatlar (`/seferler`): Tarih/No, Müşteri, Güzergah, Araç/Şoför, Durum, Tutar/Kâr; pano görünümü | Kısmen | "Detay" görünümü: fatura başlığı, ürün, açıklama, komisyon, masraf, fatura bilgisi, kaydı giren kişi sütunları | Yüksek: "Özet / Detay" görünüm düğmesi |
| Sevkiyat süzgeci (Filtrele) | Başlangıç/Bitiş tarihi; Sevkiyat durumu (Faturalı / Faturasız / Komisyon İşi); Araç durumu (Piyasa / Öz Araç); Satış ve Alış fatura durumu (Kesilenler / Beklenenler); Firma; Firma grubu; Teslim durumu (Beklenen / Eklenen); Para türü (TRY / USD / EUR); Plaka; Tedarikçi; TC (şoför); Araç cinsi; Yükleme yeri; İndirme yeri; Sevkiyat no; Teslim evrak no; Fatura no; Yükleme evrakı, Teslim evrakı, Yükleme görseli, Boşaltma görseli durumu (Eklenenler / Beklenenler) | Arama kutusu, durum, müşteri, tarih aralığı, fatura durumu, firma grubu, hazır haplar | Kısmen | Piyasa/Öz araç, Komisyon işi, plaka, tedarikçi, şoför, araç cinsi, yükleme/indirme yeri, sevkiyat/teslim evrak/fatura no ayrı süzgeçleri; evrak ve görsel var/yok süzgeçleri; süzgecin adreste kalması | Yüksek: en sık kullanılan 6 süzgeç (tedarikçi, plaka, piyasa/öz, evrak var/yok, yer, no) |
| Kazanç Tablosu | Süzgece göre: Müşteri Fiyat, Tedarikçi Fiyat, Ara Kazanç, Komisyon hesap, Komisyon nakit, Toplam Komisyon, Masraf, Toplam Kazanç | Sevkiyatlar üstündeki kazanç şeridi | Var | — | — |
| Fiyat Girilmeyenler | Fiyatı boş sevkiyatlar | "Fiyat girilmeyenler" hapı | Var | — | — |
| Onay Bekleyen Teslim Evrakları | Teslim evrakı onay bekleyenler | "Onay bekleyen teslim evrakları" hapı | Var | — | — |
| Sevkiyat Düzenle | Sevkiyat kaydını düzenler (robot açmadı) | Sefer formu | Var | — | — |
| Kopyala | Satırdaki sevkiyattan yenisini açar | "Aynı müşteri, güzergah ve fiyatla yeni sefer" | Var | — | — |
| Evrak Görüntüle (galeri) | Yükleme Evrak, Teslim Evrakları, İş Yükleme görseli, İş Boşaltma görseli, İrsaliye görseli | Sefer → Dosyalar | Kısmen | Evrakların türüne göre ayrı yuvaları (yükleme evrakı / teslim evrakı / yükleme fotoğrafı / boşaltma fotoğrafı / irsaliye) | Dosya yüklerken tür seçtirelim; süzgeçte kullanılır |
| Evrak Yükle | Yukarıdaki beş tür dosyayı yükleme (en fazla 9 MB) | Sefer → Dosya seç | Kısmen | Tür seçimi (yukarıdaki gibi) | Aynı iş |
| Teslim Evrak Onayla | Teslim evrak no girip onaylama, satırdan | Sefer formunda teslim evrak no ve onay | Kısmen | Listeden tek tıkla onay | Satır menüsüne "Teslim evrakını onayla" |
| e-irsaliye Yükle | e-irsaliye no ve tarihi | Sefer formu: e-İrsaliye No, e-İrsaliye Tarihi | Var | — | — |
| Konum Bilgileri | Aracın son konumu | Araç Takip Haritası, şoför uygulaması | Var | — | — |
| Link Oluştur (takip linki) | Müşteriye takip linki; başlangıç ve bitiş tarih-saati seçilir | Sefer → Takip linki | Kısmen | Linkin geçerli olacağı tarih/saat aralığı | Düşük |
| İcmal / Excel (Özet, Detay) / PDF İndir | Süzülen listenin icmali, iki tür Excel ve PDF | Sevkiyatlar → Excel (tek tür) | Kısmen | İcmal; PDF; "Özet" ve "Detay" diye iki Excel | Yüksek: İcmal ile birlikte |
| Para türü (TRY / USD / EUR) | Sevkiyat ve faturada döviz | — | Eksik | Döviz cinsi | Düşük: önce kullanılıyor mu sorulmalı |

### 2.5 Listeler

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Müşteri Listesi (Firmalar) | Liste: No, Firma, VKN/TCKN, VD, E-Posta, Telefon, İl/İlçe, Yetkili; Ekle, Düzenle, Gruplar, Şablon, Arşive Al; Excel | Müşteriler (`/musteriler`) ve müşteri kartı | Kısmen | Listenin Excel çıktısı; yetkili adı ve soyadı ayrı alan; "Kasaba / Köy" alanı | Excel çıktısı (Yüksek, çok kolay) |
| Arşiv Firmaları / Arşive Al / Aktif Et | Pasif müşterileri ayrı listede tutma | Müşteri durumu: Aktif / Pasif | Kısmen | "Arşivdekileri göster" süzgeci | Listeye durum süzgeci |
| Firma Grupları | Müşteriye grup/şantiye ekleme | Müşteri formu → "Firma grupları / şantiyeler" | Var | — | — |
| e-Fatura Şablon | Faturada görünecek bilgiler: Sevkiyat Tarih, Yükleme Yeri, İndirme Yeri, Plaka, Araç Tipi, Teslim No, Yük Cins, İş Açıklama, Fatura Altı Not; Son Cümle; Satış ve Tevkifat fatura notu; Fatura Senaryo (Temel / Ticari); Vade (gün) | Müşteri formu → "Fatura şablonu" ve "Fatura ve ödeme" | Var | — | — |
| Tedarikçi Listesi | Liste: No, Ünvan, VKN/TCKN, VD, IBAN, E-Posta, Telefon, İl/İlçe, Yetkili; Ekle, Düzenle, Arşiv; Excel | Tedarikçiler (`/tedarikciler`) | Kısmen | Excel çıktısı; IBAN'ın bankası (seçim listesi); yetkili ad/soyad ayrı; ülke; adres ayrıntıları (mahalle, cadde, bina, kapı, posta kodu); faks; web | Excel (Yüksek); adres ayrıntıları (Düşük) |
| Arşiv Tedarikçileri | Pasif tedarikçiler | Tedarikçi durumu: Aktif / Pasif | Kısmen | Arşiv süzgeci | Müşterilerle birlikte |
| Şöför Listesi | Liste: No, Durum, Not, Fatura Başlığı, Şöför, Plaka, Telefon, Ehliyet, TC, GSM; Ekle, Düzenle, Sil; Excel | Şoförler (`/soforler`): bizde ehliyet bitiş, SRC, psikoteknik, uygulama da var | Kısmen | İkinci telefon (GSM); listenin Excel çıktısı | Excel (Yüksek), GSM (Düşük) |
| Personeller | Personel: İşe başlangıç, İsim, TC, Telefon, Not, Maaş; Avans (banka, tarih, açıklama, tutar), Prim (tarih, açıklama, tutar), Maaş ödemesi; avans ve prim geçmişi; Kalan | Personeller (`/personel`): maaş, avans, prim, ödeme, kalan | Var | — | — |
| Sabit Ödeme Listesi | Aylık sabit ödemeler: Son ödeme, Ödenen tarih, Başlık, Detay, Liste tutarı, Ödenen, Önceki, Kategori, Banka; Ödeme Ekle; Excel | Sabit Ödemeler (`/sabit-odemeler`) | Kısmen | Excel çıktısı; "önceki ay ödenen" sütunu | Orta |

### 2.6 Öz Mal

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Mazotlar | Yakıt kaydı: Plaka, Tarih, Yakıt cinsi, Petrol (istasyon), Tutar, Yeni KM, Eski KM, Fark KM, KM başı fiyat, Mazot fiyat, Litre, Yakıt yüzdesi; Excel; Excel'den yükleme (örnek dosyalı) | Giderler → Yakıt (litre, araç km, önceki km, istasyon, yakıt türü, birim fiyat); Raporlar → Yakıt; Excel'den Aktar | Kısmen | Listede Fark KM, KM başı maliyet ve yakıt yüzdesi sütunları; mazota özel ayrı liste görünümü | Orta: Giderler'e "Yakıt" görünümü (bu sütunlarla) |
| Giderler | Gider: Banka, Tarih, Tutar, Gider açıklaması, Başlangıç/Bitiş tarihi, Kategori, Not; liste: Gün ve Günlük gider; kategori yönetimi; kategori dağılımı (yüzde); Excel | Giderler (`/giderler`): dönem başlangıcı/bitişi, kendi kategori listesi, hesap; Raporlar → Gider Dağılımı; Excel | Kısmen | Dönemli giderde "gün sayısı" ve "günlük gider" sütunları | Düşük |
| Araç Masrafları | Araca bağlı masraf: Plaka, Tarih, Banka, Tutar, Masraf, Not; Excel | Giderler (araç seçerek), Araç kartı | Var | — | — |
| Araçlar | Plaka, Marka Model, Kapasite, Yakıt, Tip, Sigorta / Bakım / Kasko / Muayene / Egzoz bilgisi ve tarihi; Excel | Araçlar (`/araclar`): aynı alanlar ve fazlası (belge uyarıları, bakım km) | Kısmen | Listenin Excel çıktısı | Excel (Yüksek, kolay) |

### 2.7 Yönetici

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Kullanıcılar (Yönetici) | Kullanıcı ekle/düzenle/sil: İsim, Kullanıcı adı / e-posta, Telefon, Şifre ve yaklaşık 45 ayrı yetki kutusu (ör. İş Talebi Oluştur/Sil, Sevkiyat Düzenle/Sil, Onay İşlem, Müşteri/Tedarikçi Fiyatları, Gelen/Gönderilen Faturalar, Manuel Fatura, Cari, Analiz, Bankalar, Çekler, Kasa Takip, Yönetici) | Ayarlar → Kullanıcılar: 4 rol (Yönetici, Operasyon, Muhasebe, Şoför) | Kısmen | Kişiye özel tek tek yetki; fiyatları gizleme yetkisi; telefon alanı | Orta: rollere birkaç ek anahtar (fiyat gör, sil, onay) |
| Firma Yetkilendirme | Kullanıcının yalnız seçili müşterileri görmesi | — | Eksik | Kullanıcı başına müşteri kısıtı | Düşük: gerekiyorsa sorulmalı |

### 2.8 Banka & Çek

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Bankalar | Hesap: Hesap ismi, Banka ismi, Şube, IBAN, Hesap no, Açılış bakiyesi, Güncel bakiye; Ekstre; Düzenle; Excel | Kasa / Banka (`/kasa-banka`): hesap adı, tür, IBAN, açılış bakiyesi | Kısmen | Banka adı, şube, hesap no alanları; Excel | Düşük |
| Hesap Ekstresi | Banka hesabının hareket dökümü | Kasa / Banka → hesap hareketleri | Kısmen | Ekstrenin Excel/PDF çıktısı | Orta |
| Hesaplar Arası Transfer | Tarih, tutar, gönderen, alıcı hesap ("Nakit & ATM" dahil), açıklama | Virman | Var | — | — |
| Çekler | Liste: No, Çek No, Tür, Firma/Tedarikçi, Vade, Tutar, Açık, Durum; süzgeç: Ara, Tür, Durum, Para, Satır, Başlangıç/Bitiş; Excel; Çek Düzenle (para türü, kayıt/tahsil tarihi, vade, verilen tarih, banka hesabı, keşide yeri, açıklama, ödeme açıklaması) | Çek / Senet (`/cek-senet`): portföy, vade, durum, ciro, Excel | Kısmen | Verilen (kendi) çeklerimiz; para türü; "Açık" (kalan) tutar; verilen tarih | Orta: verilen çek ile birlikte |
| Çek Hareketi / İş Akışı | Çek durum değişiklikleri: ödeme, protesto, yasal takip, avukata verildi, iade/iptal; avukat adı, telefonu, notu; hareket geçmişi | Durum değiştirme (portföy, tahsilde, tahsil edildi, ciro, karşılıksız, iade) | Kısmen | Protesto / yasal takip / avukat durumları ve avukat bilgileri; çek başına hareket geçmişi ekranı | Düşük |
| Geçmiş Çekler | Kapanmış çekler | Durum süzgeci | Var | — | — |

### 2.9 Özel İşlemler (menüde gizli)

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Muhasebe | Kapalı ekran (muhasebe aktarımı olduğu düşünülüyor) | Raporlar → Muhasebe Aktarımı (Excel + e-Fatura XML ZIP) | Var | — | — |
| Akaryakıt | Kapalı ekran | Giderler → Yakıt, Raporlar → Yakıt | Var | — | — |

### 2.10 Profilim

| Pratikortam ekranı | Ne işe yarıyor | Bizdeki karşılığı | Durum | Eksik olan alanlar/işlemler | Öneri |
|---|---|---|---|---|---|
| Firma Bilgileri | Vergi kimlik no, Ünvan, Vergi dairesi, Web, Faks, yetkili ad/soyad/telefon/e-posta (iki yetkili), adres ayrıntıları; "Telefonu faturada göster / gösterme" | Ayarlar → Firma | Kısmen | "Telefonu faturada gösterme" seçeneği; ikinci yetkili; faks | Düşük |
| Sevkiyat Bilgileri | Logo, sevkiyat fişi adresi, 3 e-posta ve 3 telefon, **Taşıma Sözleşmesi** metni | Sefer → Sevk fişi PDF, Ayarlar → logo | Kısmen | Sevk fişinde taşıma sözleşmesi metni; fişe özel adres ve iletişim satırları | Orta: sözleşme metni Ayarlar'a, fişin altına |
| Ortaklık Bilgileri | Ortakların TC, ad, soyad, ortaklık yüzdesi | — | Eksik | Ortaklar ve yüzdeleri | Düşük |
| İşlem Bilgileri (kontör hareketleri) | Pratikortam kontör alım/kullanım dökümü | — | Gerek yok | — | — |
| Abonelik ödeme sayfaları | Pratikortam'ın aboneliğini ödeme | — | Gerek yok | — | — |

**Toplam:** 79 satır (pratikortam'ın 48 ekran şablonu ve içlerindeki pencereler). Var: 25 · Kısmen: 44 · Eksik: 7 · Gerek yok: 3.

## 3. Eksik alanlar (form form)

Yalnız alan adları yazıldı; değer yok.

- **İş Ekle / İş Talebi:** Kopya Sayısı · "Formu açık tut" · Müşteri fiyatı "KDV" işareti · Sevkiyat fiyatı "KDV" işareti · Masraf Tedarikçi VKN · Masraf Tedarikçi Ünvan · Firma Grup · km · İş görseli · Yükleme Evrak Görseli · İrsaliye Görseli · "Koordinatları Bul" düğmesi
- **Sevkiyat (sefer) formu:** Para Türü (TRY / USD / EUR) · evrak türüne göre dosya yuvaları (Yükleme Evrak, Teslim Evrakları, İş Yükleme görseli, İş Boşaltma görseli, İrsaliye Görseli) · Takip linki başlangıç/bitiş tarih ve saati
- **Müşteri (Firma) formu:** Yetkili Ad ve Yetkili Soyad ayrı · Kasaba / Köy
- **Tedarikçi formu:** IBAN Banka (banka adı seçimi) · Yetkili Ad / Yetkili Soyad · Ülke · Mahalle · Cadde / Sokak · Kasaba / Köy · Bina Adı · Bina No · Kapı No · Posta Kodu · Fax · Web
- **Şoför formu:** GSM (ikinci telefon)
- **Mazot (yakıt) kaydı:** Fark KM ve KM Başı Fiyat (hesaplanan) · Yakıt Yüzdesi
- **Gider kaydı:** Gün ve Günlük gider (dönemli giderde, hesaplanan)
- **Sabit ödeme:** "Önceki" ödeme bilgisi (listede)
- **Manuel / alınan fatura:** Para Birimi · işlem türü "Masraf Faturası" · cari türü "Müşteri" (müşteriden alınan fatura)
- **Tahsilat (ekstreden):** birden çok fatura işaretleme · Sevkiyat No · "Ödeme Ekle" (müşteriye ödeme)
- **Tedarikçi ödemesi (ekstreden):** Gider Durum ("Gidere Ekle") · Gider Kategorisi
- **Çek:** Tür (alınan / verilen) · Para Türü · Verilen Tarih · Ödeme Açıklaması · "Açık" kalan tutar · Avukat Adı · Avukat Telefon · Avukat Notu · hareketler: protesto, yasal takip, avukata verildi
- **Banka hesabı:** Banka İsmi · Şube · Hesap No
- **Kullanıcı:** Telefon · tek tek yetki kutuları · Firma yetkilendirme
- **Profil / Firma:** Telefonu faturada göster / gösterme · 2. yetkili (ad, soyad, telefon, e-posta) · Sevkiyat fişi adresi · fiş e-posta 1-3 ve telefon 1-3 · Taşıma Sözleşmesi · Ortaklık bilgileri (TC, isim, soyisim, yüzde)
- **Fatura iptali:** Silme / iptal nedeni

## 4. Raporlar ve çıktılar

| Pratikortam'daki çıktı | Türü | Bizde | Durum |
|---|---|---|---|
| Sevkiyat listesi | Excel "Özet" ve "Detay" | Sevkiyatlar → Excel (tek tür) | Kısmen |
| Sevkiyat listesi | PDF İndir | — | Eksik |
| Sevkiyat **İcmal** | Yazdırılabilir döküm | — | Eksik |
| **Fatura İcmali** (ekstreden) | Firma başlıklı sevkiyat dökümü, yazdır/PDF | — | Eksik |
| Müşteri / Tedarikçi ekstresi | PDF | Müşteri ve tedarikçi ekstresi PDF (müşteride e-postayla gönderme de var) | Var |
| Müşteri / Tedarikçi ekstresi | Excel | — | Eksik |
| Müşteriler Cari / Tedarikçiler Cari tablosu | Excel ve PDF | — | Eksik |
| Tedarikçi Ödemeleri | Excel ve PDF | Excel | Kısmen |
| Faturalar listesi | Excel, toplu XML (imzalı UBL), toplu PDF | Faturalar → Excel; fatura başına PDF; aylık e-Fatura XML ZIP | Kısmen |
| Analiz | "Tüm Rapor Excel", "Tüm Rapor PDF", "Eski Excel" | Raporlar → her sekme Excel | Kısmen (PDF yok) |
| Müşteri / Tedarikçi / Şoför listesi (arşiv dahil) | Excel | — | Eksik |
| Araçlar | Excel | — | Eksik |
| Mazotlar · Giderler · Araç Masrafları | Excel | Giderler → Excel | Var |
| Sabit Ödemeler | Excel | — | Eksik |
| Bankalar / hesap ekstresi | Excel | — | Eksik |
| Çekler | Excel | Çek / Senet → Excel | Var |
| İş talepleri | "İşleri Dışa Aktar" | — | Eksik |
| Örnek Excel (iş talebi, mazot) | Şablon | Her "Excel'den Aktar" penceresinde şablon indir | Var |
| Sevkiyat fişi (taşıma sözleşmeli) | PDF | Sevk fişi PDF (sözleşme metni yok) | Kısmen |
| — | — | Bizde fazladan: fatura PDF + e-posta, muhasebe Excel'i, alacak/borç yaşlandırma, müşteri kârlılığı, güzergâh raporu, tahsilat Excel'i | — |

## 5. Öneri listesi (öncelik sırasıyla)

### Yüksek
1. **Listelere Excel çıktısı** (Müşteri, Tedarikçi, Şoför, Araç, Sabit Ödeme, İş Talepleri, Cari tabloları): pratikortam'da her listede var, kuzen alışkın; bizde altyapı hazır, iş kolay.
2. **Cari tablolarına eksik sütunlar + sıralama + Excel/PDF:** Alınan Fatura, İptal Fatura, Faturasız Sevkiyatlar; her gün bakılan ekran, ayna modunda da işe yarar.
3. **Fatura İcmali ve Sevkiyat İcmali (PDF):** müşteriye fatura ekinde gidiyor, bizde hiç yok.
4. **Sevkiyat süzgeçleri:** tedarikçi, plaka, Piyasa / Öz Araç, Komisyon işi, yükleme/indirme yeri, sevkiyat/teslim evrak/fatura no, evrak var/yok; pratikortam'da en çok kullanılan ekran bu.
5. **Sevkiyatlarda "Detay" görünümü:** fatura başlığı, ürün, açıklama, komisyon, masraf, fatura bilgisi, kaydı giren kişi sütunları; listeye bakarak iş görülüyor.
6. **Ekstreye Excel ve "faturasız seferleri de göster" seçeneği:** mutabakatta Excel isteniyor; pratikortam'daki "Sevkiyat Alacak" işareti bunu yapıyor.

### Orta
7. **Sefer dosyalarında evrak türü** (yükleme evrakı, teslim evrakı, yükleme/boşaltma fotoğrafı, irsaliye) ve satırdan "Teslim evrakını onayla": evrak takibi ve süzgeçler buna dayanıyor.
8. **Verilen çek** (kendi çekimizi tedarikçiye yazma) ve çekte kalan tutar: pratikortam'da tedarikçi ekstresinden kullanılıyor.
9. **Tedarikçi ödemelerinde fatura no/tarih/tutar sütunları ve toplu ödeme listesi:** "Seçilenleri listeye ekle" alışkanlığı var.
10. **İş talebinde kopya sayısı ve "formu açık tut":** aynı işten birden çok araç açılıyor.
11. **Analiz benzeri tek sayfa özet + rapor PDF:** gider, personel ve ödemeleri de içeren net kazanç; pratikortam'da "Tüm Rapor PDF" var.
12. **Faturalar listesinde süzgeç toplamları ve sevkiyat no ile arama:** matrah, KDV, tevkifat, genel toplam.
13. **Yakıt görünümü:** Fark KM, KM başı maliyet, yakıt yüzdesi sütunları.
14. **Sevk fişine taşıma sözleşmesi metni:** pratikortam fişinde var.
15. **Kullanıcı yetkilerine birkaç ek anahtar** (fiyatları gör, sil, onay): 4 rol çoğu işi görüyor, ince ayar eksik.
16. **Banka hesabı ekstresinin Excel/PDF çıktısı.**

### Düşük
17. **Tedarikçi adres ayrıntıları, faks, web, IBAN bankası; şoför GSM; müşteri Kasaba/Köy:** e-Fatura için gerekirse.
18. **Döviz (TRY / USD / EUR):** önce gerçekten kullanılıyor mu kuzene sorulmalı.
19. **Gelen e-faturaları entegratörden çekme, kabul/red:** entegratör sözleşmesine bağlı.
20. **Çekte protesto / yasal takip / avukat bilgileri ve hareket geçmişi.**
21. **Firma yetkilendirme (kullanıcı yalnız seçili müşterileri görsün):** ihtiyaç varsa.
22. **Arşiv süzgeci, fatura iptal nedeni, takip linki süresi, dönemli giderde günlük tutar, ortaklık bilgileri, "telefonu faturada gösterme".**
