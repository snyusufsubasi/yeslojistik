# 02 — Luca Referans Envanteri

Bu dosya, <https://luca.com.tr/> sitesinden **6 Ekim 2026** tarihinde okunan bilgileri toplar. Amaç: plan
dokümanlarının "Luca'daki karşılığı" bölümlerine ortak bir kaynak vermek. Sitede yazmayan hiçbir şey
buraya yazılmadı; yazmayan yerler `**doğrulanacak**` olarak işaretlendi.

## 1. Ürün aileleri

| Ürün | Kim için | Kaynak | Not |
|---|---|---|---|
| **Luca Net** (KOBİ ticari yazılım) | Küçük/orta işletme | <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> | Web tabanlı; otomatik firma kurulumu, Excel aktarım, barkod, BA-BS mutabakatı, FIFO cari yaşlandırma + adat, sürükle-bırak üretim akışı, bağımsız rapor tasarımı, e-Fatura/e-Arşiv |
| **Luca Koza** (kurumsal) | Orta/büyük işletme, çok depolu | <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> | **Standart** sürüm: Yönetici, Stok Yönetimi, Fatura, Finans Yönetimi. **Profesyonel** sürüm ek olarak: Satış Yönetimi, Satınalma Yönetimi, Analizler, Gelir-Gider Yönetimi |
| **Luca Net One** | Bulut/tek platform | <https://www.lucanetone.com.tr> | İçerik okunmadı → **doğrulanacak** |
| **Luca Rota** | (rota/dağıtım) | <https://www.luca.com.tr/Urun/Index/luca-rota-yazilimi/18> | Kapsam okunmadı → **doğrulanacak** |
| **Luca Mali Müşavir** | SMMM ve müşterileri | <https://www.luca.com.tr/Urun/Index/luca-ile-gelecege-hazirsiniz/5> | Mali müşavir paketi; müşteri ile entegre çalışma ("Luca MMP - Kayıt Aktarımı" sayfası var: `/Sayfa/luca-kayit-aktarimi/64`) |
| **TÜRMOB KEP** | Tebligat | <https://turmobkep.com.tr/> | Bağlantı olarak listeli |

## 2. Menü (modül) yapısı — Koza sürümlerinden

Koza Standart: **Yönetici**, **Stok Yönetimi**, **Fatura**, **Finans Yönetimi**.
Koza Profesyonel ek olarak: **Satış Yönetimi**, **Satınalma Yönetimi**, **Analizler**, **Gelir-Gider Yönetimi**.

Bu sekiz menü, plan setimizin modül omurgasını belirler (bkz. `03-KAPSAM-VE-KONUMLANDIRMA.md`).

## 3. Luca Net'in öne çıkan özellikleri (kaynaktan birebir)

- Otomatik firma kurulumu.
- Excel ile veri aktarımı: cari kartlar, stok kartları, çek-senet tanımları, faturalar, yevmiye fişleri,
  banka ekstreleri.
- Barkod: faturadan hızlı barkod ile sayım ve seri takibi.
- BA-BS mutabakatı: oluşan kayıtlardan BA-BS verisi listelenir, karşı firmanın e-postasına bilgi postası gider.
- Fatura bilgilendirme: oluşturulan fatura cari firmanın e-postasına gönderilir.
- Stok detay bilgileri; stoklar alt kategorilere ayrılır, alt ürün grubu bazında rapor.
- Cari kart girişinde yalnız T.C. Kimlik No **veya** Vergi Kimlik No ile vergi dairesi + adres otomatik
  sorgusu; e-Fatura kullanıcısı olan carilerin GİB tarafında sorgulanıp listelenmesi.
- **FIFO** cari yaşlandırma ve **adat** (faiz) hesaplama.
- Sürükle-bırak üretim akış diyagramı, paket uygulamaları ve üretim reçetesi, akışa göre ürün maliyetlendirme.
- Bağımsız rapor tasarlama (sütun başlığı, yazı tipi, boyut seçilebilir).
- e-Fatura gönderim (e-Fatura'ya geçmiş carilere) ve **gelen e-Faturaların alınması**.
- e-Arşiv fatura gönderimi.
- Sigortaya konu ürünlerin stok kalemi olarak açılması; sigorta ettiren/sigortalı/poliçe/ödeme yönetimi takibi.
- Yevmiye defterinin e-Defter standartlarına aktarımı; banka ekstrelerinin sisteme entegrasyonu.

## 4. Luca Koza'nın öne çıkan özellikleri (kaynaktan birebir)

- SMMM'ler ve müşterilerinin entegre çalışması; **tüm işlemlerin tek ekrandan muhasebeleştirilmesi**,
  Luca Koza'dan muhasebe fişine erişim, **belge üzerinden muhasebe fişi iptali**.
- Birden fazla **depo** ve depo bölümü bazında stok takibi.
- Özel değişken tanımlama esnekliği; istenilen sayıda ve formatta tanımlama/sorgulama.
- Online cari hesap mutabakatı (sınırsız/ücretsiz).
- Ayrıntılı yetkilendirme ile iş planı yapabilme.
- Çoklu dil.
- **Luca Koza Rest API** ile diğer uygulamalarla senkron; StockMount ile sanal mağaza entegrasyonu;
  Orion Pos ile restoran/kafe senkronu.
- Farklı **döviz cinslerinden** fatura kesimi, işletmeye göre fatura tipi tanımlama, **ithalat** takibi ve
  dosya kapama, ithalat analizleri, **proforma** ve **numune** faturası, müşteri/tedarikçi **ödeme planı** takibi.
- İstatistik raporları (satın alma-satış-finans karar desteği).
- **Çek/Senet modülü**: alacak/borç çek ve senetleri tüm detay hareketleriyle takip.
- **İş merkezi** tanımı: birden fazla iş merkezi gelir-gider yeri olarak tanımlanır; gelir-gider türleri tanımlanır.
- Siparişten teslimata uzanan satış-pazarlama akışı.
- Satın alma süreci: ihtiyaç tespiti, merkezlerden gelen taleplerin değerlendirilmesi, planlama.
- Stok/fatura/finans hareketlerinde "işletmeye özel hareket tanımlama" ve **hareket bazında gruplama**.
- **Üretim yönetimi ve planlama**: malzeme, tedarik, ekip, vardiya, üretim saati, üretim biçimi.

## 5. Entegrasyon listesi (siteden)

Banka entegrasyonu (`/Sayfa/-banka-entegrasyonlari/8`), BES entegrasyonu
(`/Sayfa/luca-bes-entegrasyonu/46`), Defter Beyan entegrasyonu (`/Sayfa/defter-beyan-entegrasyonu/47`),
Ülker-Mobis entegrasyonu (`/Sayfa/luca-net-ticari-yazilim-ulker--mobis-entegrasyonu/45`), Turizm
entegrasyonu (`/Sayfa/-luca-net-ticari-yazilim-turizm-entegrasyonu/6`), NetteCap, İŞNET e-Çırak,
SYS-R, TÜRMOB e-imza. Her birinin **teknik ayrıntısı (protokol, yetki, ücret) doğrulanacak**.

## 6. e-Dönüşüm başlıkları (siteden)

e-Defter (`/Sayfa/luca-e-defter-uyeligi/26`), e-SMM (`/Sayfa/esmm/66`), e-Dönüşüm saklama hizmetleri
(`/Sayfa/-e-–-donusum-saklama-hizmetleri/29`), Nette Arşiv, e-Başvuru akışı. Kapsam ve zorunluluk
tarihleri **doğrulanacak** (GİB/mali müşavir).

## 7. Fiyatlandırma

<https://www.luca.com.tr/Sayfa/fiyat/57> sayfası güvenli metne çevrilemedi; ayrıca üçüncü taraf bir
PDF'te "2.500 Kontör Paket" gibi kalemler göründü (asmmmo.org.tr). **Fiyat/kontör modeli doğrulanacak**:
hangi modül hangi pakette, kontör nedir, kullanıcı başı mı firma başı mı.

## 8. Bizim için çıkarımlar (özet)

1. Luca bir **muhasebe çekirdeği + ticari modüller** ürünü; panel tasarımı modül menüleri üzerine kurulu.
2. Bizde bugün olan: sevkiyat (taşıma işi), cari, fatura + e-Fatura iskeleti, gider, çek, banka/kasa,
   personel, araç, raporlar, lisans, ayna (pratikortam), çok kullanıcılı yetki. Olmayan: **muhasebe
   çekirdeği (hesap planı, yevmiye, mizan, e-Defter)**, **stok/depo**, **sipariş/satın alma**,
   **üretim/reçete**, **bağımsız rapor tasarımcısı**, **banka entegrasyonu/mutabakat**, **BA-BS**,
   **barkod/sayım**, **ithalat/döviz dosyası**, **CRM**.
3. Bu yüzden plan iki katmanlıdır: (a) **muhasebe ve belge çekirdeği** (her şeyin bağlandığı yer),
   (b) üstüne oturan **ticari modüller**. Lojistik işi (sevkiyat) bu yapıda bir "satış/hizmet" modülü
   olarak kalır; atılmaz, çekirdeğe bağlanır.
