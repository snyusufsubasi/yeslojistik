# 23 — Raporlama ve İş Zekâsı

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir/avukat onayı
gerekir). "Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır.

## 1. Amaç ve kapsam

Bu modül, panelde **karar vermek için bakılan bütün sayıları** tek bir rapor envanterine bağlar:
cari ekstre ve yaşlandırma, satış analizi, kârlılık, stok envanter değeri, kasa/banka durumu, nakit
akışı, KDV özeti, BA-BS, mizan/muavin, çek-senet vade takvimi, bütçe-gerçekleşen, müşteri/tedarikçi
performansı ve araç maliyeti. Modülün ikinci işi, bu raporların hepsinin üstünde duracağı **ortak
altyapıyı** tanımlamaktır: sunucu tarafı süzgeç + sayfalama + toplam, tek bir tarih aralığı sözleşmesi,
tek bir Excel/PDF dışa aktarma yolu ve tek bir yetki denetimi.

Bugün panelde `client/src/pages/ReportsPage.tsx:22-78` içinde **13 sekme** vardır
(`ReportsPage.tsx:38-52`): Aylık Özet, Kazanç, Müşteri Kârlılığı, Güzergâh, Sevkiyat Kârlılığı, Araç
Bazlı, Şoför Bazlı, Yakıt, Alacak Yaşlandırma, Borç Yaşlandırma, Tedarikçiler, Gider Dağılımı ve
Muhasebe Aktarımı. Bu 13 sekme "sevkiyat işi kâr mı" sorusunu iyi yanıtlar; ama cari ekstre, satış
analizi, stok değeri, KDV özeti, BA-BS, mizan, çek vade takvimi ve bütçe-gerçekleşen **yoktur**.

**Kapsam:**

- Rapor envanteri: her rapor için amaç, filtreler, sütunlar, toplamlar, yetki, dışa aktarma,
  performans notu ve bağlı modül tanımlanır.
- Ortak altyapı: `ReportQuery` sözleşmesi, sunucu tarafı süzgeç/sayfalama/toplam, tarih aralığı
  sözleşmesi, `PagedResult<T>` zarfı, ortak Excel/PDF üretimi.
- Rapor kataloğu tablosu (`ReportDefinition`): hangi raporun hangi rolde ve hangi modülde göründüğü
  veriden okunur; ekran kodu rapor listesini elle tutmaz.
- Yeni rapor uçları: cari ekstre (liste hâli), satış analizi, stok envanter değeri, nakit akışı,
  KDV özeti, BA-BS, mizan/muavin, çek-senet vade takvimi, bütçe-gerçekleşen, performans.
- "Rapor → hücre → kaynak belge" izlenebilirliği: satırdan ilgili kayda tek tıkla gitme.

**Kapsam dışı:** kullanıcı tanımlı rapor tasarımcısı (`24-RAPOR-TASARIMCISI.md`), muhasebe çekirdeği
ve yevmiye/mizan üretimi (`06-MUHASEBE-MOTORU.md`), stok kartı ve depo hareketleri
(`10-STOK-VE-DEPO.md`), BA-BS beyanının kendisi (beyan gönderimi yoktur), banka ekstresi eşleştirme
(`15-BANKA-ENTEGRASYON.md`), çok şirketli konsolidasyon (`30-COK-SIRKETLI-KONSOLIDASYON.md`).

Bu modülün çözdüğü beş soru: (1) "Bu ay ne kazandım, geçen aya göre nasıl?" (2) "Kim bana ne kadar
borçlu, ne kadarı gecikmiş?" (3) "Kasada ve bankada ne var, önümüzdeki 4 hafta ne girecek/çıkacak?"
(4) "Mali müşavire KDV ve BA-BS için ne vereceğim?" (5) "Hangi müşteri, hangi tedarikçi, hangi araç
para kazandırıyor, hangisi kaybettiriyor?"

## 2. Luca'daki karşılığı

Luca Koza'nın **Analizler** modülü bu dokümanın ana referansıdır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:12`). Ayrıca Koza'nın **Finans Yönetimi** menüsü (aynı satır)
nakit/kasa/banka raporlarının, **Stok Yönetimi** menüsü envanter değeri raporunun, **Fatura** menüsü
satış analizi ve KDV özetinin karşılığıdır. Siteden okunan ilgili maddeler:

- **"İstatistik raporları (satın alma-satış-finans karar desteği)"** (`02-LUCA-ENVANTERI.md:57`) — bu
  dokümanın ana cümlesi: karar destek raporları.
- **"BA-BS mutabakatı: oluşan kayıtlardan BA-BS verisi listelenir, karşı firmanın e-postasına bilgi
  postası gider."** (`02-LUCA-ENVANTERI.md:31`) — BA-BS raporu ve mutabakat postası.
- **"FIFO cari yaşlandırma ve adat (faiz) hesaplama."** (`02-LUCA-ENVANTERI.md:36`) — yaşlandırma
  raporunun vade kovaları ve faiz sütunu.
- **"Stok detay bilgileri; stoklar alt kategorilere ayrılır, alt ürün grubu bazında rapor."**
  (`02-LUCA-ENVANTERI.md:33`) — envanter değeri raporunun kırılımı.
- **"Yevmiye defterinin e-Defter standartlarına aktarımı"** (`02-LUCA-ENVANTERI.md:42`) ve
  **"tüm işlemlerin tek ekrandan muhasebeleştirilmesi"** (`02-LUCA-ENVANTERI.md:46`) — mizan/muavin
  raporunun zeminini muhasebe çekirdeği kurar.
- **"Çek/Senet modülü: alacak/borç çek ve senetleri tüm detay hareketleriyle takip."**
  (`02-LUCA-ENVANTERI.md:58`) — vade takvimi.
- **"İş merkezi tanımı… gelir-gider türleri tanımlanır."** (`02-LUCA-ENVANTERI.md:59`) — bütçe ve
  merkez bazlı gerçekleşen raporu.
- **"Ayrıntılı yetkilendirme ile iş planı yapabilme."** (`02-LUCA-ENVANTERI.md:51`) — rapor yetkisi.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> ve
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**doğrulanacak:** Luca Analizler menüsündeki raporların tam listesi ve her raporun süzgeç/sütun yapısı
— kaynak: Luca kullanım kılavuzu veya demo hesabı. **doğrulanacak:** Luca'da yaşlandırma kovalarının
hangi gün aralıkları olduğu ve adat (faiz) hesabının hangi oranla yapıldığı — kaynak: mali müşavir.
**doğrulanacak:** Luca'nın BA-BS listesini hangi eşik/limitlere göre ürettiği ve mutabakat postasının
hangi alanları taşıdığı — kaynak: mali müşavir. **doğrulanacak:** Luca'da stok envanter değerinin
hangi maliyet yöntemiyle (FIFO / ortalama) hesaplandığı — kaynak: Luca kılavuzu. **doğrulanacak:**
Luca'nın dışa aktarma biçimleri (Excel/PDF/CSV) ve PDF'lerin kurumsal başlık ayarı — kaynak: Luca
demo. **doğrulanacak:** Luca Net One ve Luca Rota'daki rapor kapsamı
(`02-LUCA-ENVANTERI.md:13-14`, içerik okunmadı).

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Rapor ekranı ve sekmeler.** `client/src/pages/ReportsPage.tsx:22-78`. Sekme tipi 13 değerden
  oluşur (`:16`), sekme düğmeleri `:38-52`. Sayfa başlığı ve Excel düğmesi `:34-35`; Excel düğmesi
  `accounting` sekmesinde gizlenir (`:35`).
- **Kırılım ve tarih süzgeci.** Yıl seçimi yalnız Aylık Özet'te (`:54`); kırılım seçimi yalnız
  Kazanç'ta (`:55`, seçenekler `:142-147`: Aylara/Müşterilere/Araçlara/Şoförlere göre); başlangıç-bitiş
  tarihi 8 sekmede (`:28`, `:56-59`). Yaşlandırma, borç yaşlandırma, tedarikçiler ve muhasebe aktarımı
  sekmelerinde tarih süzgeci **yoktur** (`:29`).
- **Tek kâr formülü.** Kazanç raporu `:150-180`: sütunlar satış, komisyon, araç/taşeron, şoför primi,
  ek masraf, sevkiyat giderleri, kâr ve marj; toplam satırı `:172-178`. Formül açıklaması ekranda
  yazılıdır (`:170`). Sunucu tarafı aynı formülü Excel başlığına da yazar
  (`server/YesLojistik.Api/Controllers/ReportsController.cs:71-83`).
- **Sevkiyat kârlılığı.** `ReportsPage.tsx:182-204`; toplam satırı sevkiyat sayısıyla birlikte
  (`:200-202`). Sunucu ucu `ReportsController.cs:87-103`.
- **Araç, şoför, yakıt.** `ReportsPage.tsx:206-218` (araç), `:220-234` (şoför), `:236-262` (yakıt).
  Yakıt raporunda filo ortalaması ve %15 üstü eşiği istemcide hesaplanır (`:238-241`).
- **Alacak ve borç yaşlandırma.** Alacak: `ReportsPage.tsx:264-282`, kovalar
  "Vadesi Gelmemiş / 1-30 / 31-60 / 61-90 / 90+" (`:268-272`), toplam satırı `:277-281`. Borç:
  `:321-339`. Sunucu uçları `ReportsController.cs:155-168` (alacak) ve `:170-184` (borç).
- **Müşteri kârlılığı ve güzergâh.** `ReportsPage.tsx:343-359` ve `:361-372`; müşteri kârlılığında
  açık alacak ve yaklaşık tahsil süresi sütunları (`:352-353`) ve yöntem açıklaması (`:356`).
- **Tedarikçi raporu.** `ReportsPage.tsx:374-385`; sunucu ucu `ReportsController.cs:186-199`.
- **Gider dağılımı.** `ReportsPage.tsx:284-319`: yatay çubuk grafik + tablo + pay yüzdesi
  (`:288`, `:306-313`). Kategori etiketleri `ReportsController.cs:17-28`.
- **Muhasebe aktarımı.** `ReportsPage.tsx:387-414`: ay seçimi, "Muhasebe Excel'i" ve "e-Fatura XML
  (ZIP)" düğmeleri (`:409-410`); indirme çağrıları `:395`. Sunucu ucu
  `server/YesLojistik.Api/Controllers/EInvoiceController.cs:88-119`: tek Excel'de "Satış Faturaları",
  "Tahsilatlar", giderler, taşeron sevkiyatları ve taşeron ödemeleri sayfaları; fatura sayfasında
  matrah, KDV, tevkifat ve toplam sütunları vardır (`:114-116`).
- **Nakit akışı (kısmi).** `server/YesLojistik.Api/Controllers/DashboardController.cs:19-20` ucu
  `CashService.CashFlowAsync` çağırır; hesap `server/YesLojistik.Infrastructure/Services/CashService.cs:92-119`:
  "Gecikmiş" dilimi + 4 haftalık kovalar (`:95-97`), beklenen tahsilat açık fatura kalanlarından
  (`:106-107`), portföy/tahildeki çek-senetlerden (`:108-112`), beklenen ödeme tedarikçi borç
  kalemlerinden (`:113-114`), eldeki nakit kredi kartı hariç (`:116`). Yanıt tipi
  `server/YesLojistik.Core/Dtos/FleetDtos.cs:47-49`. Bu uç bugün **rapor ekranında sekme değildir**;
  Raporlar sayfasında nakit akışı sekmesi yoktur (`ReportsPage.tsx:38-52`).
- **Rapor servisi.** `server/YesLojistik.Infrastructure/Services/ReportService.cs:9-200`: `MonthlyAsync`
  (`:11-36`), `TripProfitAsync` (`:38-43`), `VehiclesAsync` (`:45-59`), `DriversAsync` (`:61-80`) ve
  devamı. Alacak yaşlandırma `BalanceService`, borç yaşlandırma `PayableService` üzerinden gelir
  (`ReportsController.cs:13`).
- **Ortak liste altyapısı.** `server/YesLojistik.Core/Dtos/Common.cs:3` → `PagedResult<T>(Items, Total,
  Page, PageSize)`; `:5-14` → `ListQuery` (Page, PageSize, Search, Sort, Desc, Ids). Süzgeç/sıralama
  yardımcıları `server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:9-11` (MaxPageSize 500,
  ExportLimit 20.000), `:13-21` (güvenli sıralama, Id ile ikincil sıra), `:23-31` (sayfalama +
  CountAsync), `:42-43` (seçilen kayıtlar), `:46-49` (`ILIKE` deseni).
- **İstemci tarafı ortak liste.** `client/src/lib/hooks.ts:26-32` `usePaged` (önceki sayfa korunur,
  `:30`), `:18-24` `usePage` (süzgeç değişince 1. sayfa), `:35-38` `listFilters` (Excel/toplam
  filtrenin tamamını kullanır), `:41-45` `useListTotals`.
- **Ortak tablo ve dışa aktarma parçaları.** `client/src/components/DataTable.tsx:66-67` (props:
  sıralama, sayfalama, toplam, hata, mobil kart, seçim), `:150-163` (sayfalama çubuğu),
  `client/src/components/Exports.tsx:28-32` (`ExportButton`), `:35-39` (`PdfButton`), `:44-55`
  (`TotalsStrip`), `:16-26` (`useExportAction`). İndirme `client/src/api/client.ts:114-125`, PDF yeni
  sekmede `:132-139`, adres parametreleri `:85-95`.
- **Tam veri yedeği.** `server/YesLojistik.Api/Controllers/DataExportController.cs:33-45`: yönetici
  tüm veriyi ZIP olarak indirir; dosya listesi `server/YesLojistik.Api/Infrastructure/DataExportService.cs:24-29`
  (müşteriler, tedarikçiler, şoförler, araçlar, sevkiyatlar, faturalar, fatura satırları, alış
  faturaları, tahsilatlar, tedarikçi ödemeleri, giderler, kasa/bankalar, personel, personel
  hareketleri). Bu bir **yedek**tir, rapor değildir; ama rapor dışa aktarmanın teknik desenini verir
  (`:32-40`).
- **Yetki politikaları.** `server/YesLojistik.Api/Auth/Policies.cs:5-17`: `Operations`, `Accounting`,
  `Admin`. `ReportsController.cs:12` tüm rapor ucunu `Accounting` ile korur; yani bugün raporlar
  **operasyon rolüne kapalıdır**. Nakit akışı ucu da `Accounting` ister
  (`DashboardController.cs:18`). Tam veri yedeği `Admin` ister (`DataExportController.cs:24`).
- **Mevcut testler.** `server/YesLojistik.Tests/Integration/ReportsAndExportsTests.cs` (236 satır):
  tek kâr formülünün dört kırılımda aynı toplamı vermesi (`:38-60`), Excel üretimi (`:31-36`).
  Ayrıca `server/YesLojistik.Tests/Integration/SearchAndReportTests.cs`,
  `server/YesLojistik.Tests/Integration/PayableTests.cs` (borç yaşlandırma),
  `server/YesLojistik.Tests/Integration/CashTests.cs:102` (nakit akışı ucu) ve
  `server/YesLojistik.Tests/Integration/CariExportTests.cs`.

**Olmayanlar (kanıtlı).**

- **Rapor kataloğu tablosu yok.** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs` içinde
  `ReportDefinition` ya da benzeri bir tablo yoktur; sekme listesi koda gömülüdür
  (`ReportsPage.tsx:38-52`).
- **Rapor uçları sayfalamasız.** `ReportsController.cs` içindeki hiçbir uç `PagedResult<T>` döndürmez
  (`:37`, `:56`, `:88`, `:106`, `:122`, `:140`, `:156`, `:172`, `:188`, `:202`, `:213`, `:230`);
  hepsi tam listeyi döner. `ReportService` yalnız `List<T>` üretir (`ReportService.cs:11`, `:38`,
  `:45`, `:61`).
- **Rapor toplamı sunucudan gelmiyor.** Kazanç ve yaşlandırma toplamları istemcide toplanır
  (`ReportsPage.tsx:167`, `:275`, `:332`, `:196`). Binlerce satırda bu, yalnız görünen sayının
  toplamı olur; sayfa yoksa da hesaplama tarayıcıya biner.
- **Tek tarih aralığı sözleşmesi yok.** Yaşlandırma/borç/tedarikçi sekmeleri tarih almaz
  (`ReportsPage.tsx:29`); Aylık Özet takvim yılı alır (`:29`); Kazanç `from/to` alır (`:29`); sunucu
  varsayılanı yıl başı–bugündür (`ReportsController.cs:30-34`). Cari ekstrede varsayılan ay
  farklıdır (`EInvoiceController.cs:80-86`: ay başı–ay sonu).
- **Stok envanter değeri raporu yok.** Stok tabloları bu planda henüz `10-STOK-VE-DEPO.md` ile
  kurulacaktır; `AppDbContext.cs:10-43` içinde stok/maliyet tablosu yoktur.
- **KDV özeti (beyan öncesi kontrol) yok.** KDV tutarları fatura/`Expense` kayıtlarında sütun olarak
  vardır (`server/YesLojistik.Core/Entities/Invoice.cs:14`, `PurchaseInvoice.cs:17`,
  `server/YesLojistik.Core/Domain/ExpenseVat.cs:10-31`) ama aylık "hesaplanan KDV − indirilecek KDV"
  özeti üreten bir uç veya ekran yoktur.
- **BA-BS raporu yok.** Kodda `BA`/`BS` geçmez.
- **Mizan/muavin raporu yok.** Muhasebe çekirdeği (hesap planı, yevmiye) henüz yoktur
  (`06-MUHASEBE-MOTORU.md`); bugünkü "Muhasebe Aktarımı" yalnız Excel üretir
  (`ReportsPage.tsx:387-414`).
- **Çek-senet vade takvimi (takvim görünümü) yok.** Bugün yalnız liste ve "vadesi şu tarihe kadar"
  süzgeci vardır: `client/src/pages/ChecksPage.tsx:38-45` ve `:83`; takvim/12 haftalık kova yoktur.
- **Bütçe-gerçekleşen raporu yok.** Bütçe tablosu `17-GIDER-GELIR-MERKEZLERI.md` ile gelecektir.
- **Müşteri/tedarikçi performans raporu yok.** Müşteri kârlılığı ve tedarikçi raporu vardır; ama
  teslim süresi, zamanında teslim oranı, iade/ceza oranı gibi **performans** göstergeleri yoktur.
- **Araç maliyeti raporu (detaylı) yok.** Araç bazlı rapor gelir/maliyet/gider/net verir
  (`ReportsPage.tsx:206-218`) ama km başına maliyet, yakıt dışı kalemlerin kırılımı, sabit gider
  dağıtımı yoktur; araç bakım verisi `MaintenanceRecord` tarafındadır
  (`server/YesLojistik.Infrastructure/Services/FleetService.cs:107-191`).
- **Rapor dışa aktarma denetim izi yok.** `AuditLog` yalnız tam veri yedeğinde yazılır
  (`DataExportController.cs:37-41`); rapor Excel indirmeleri loglanmaz.
- **Cari ekranı sayfalamasız yüklenir.** `client/src/pages/CariPage.tsx:79` tüm cari listesini tek
  istekte çeker, süzme/sıralama/sayfalama tarayıcıda yapılır (`:88-98`), toplam satırı da
  istemcide toplanır (`:100-102`, `:143-152`). Büyük cari sayısında bu bir performans riskidir.

**Eksik listesi:** rapor kataloğu, ortak `ReportQuery` sözleşmesi, sunucu tarafı toplam, cari ekstre
liste ucu, satış analizi, stok envanter değeri, nakit akışı sekmesi, KDV özeti, BA-BS, mizan/muavin,
çek-senet vade takvimi, bütçe-gerçekleşen, performans raporları (müşteri/tedarikçi/araç), rapor
merkezi tek sayfa düzeni, rapor dışa aktarma denetim kaydı, PDF şablon birliği.

## 4. Hedef ekranlar ve alanlar

### 4.1 Rapor merkezi düzeni

Bugünkü tek sayfa + 13 sekme yapısı korunur (`ReportsPage.tsx:38-52`); sekme sayısı 13'ten **18**'e
çıkar ve sekmeler **grup başlıklarıyla** üç bloka ayrılır: **Ticari** (Satış Analizi, Kârlılık,
Müşteri Kârlılığı, Müşteri Performansı, Güzergâh, Sevkiyat Kârlılığı), **Finans** (Nakit Akışı,
Kasa/Banka Durumu, Çek-Senet Vade Takvimi, Gider Dağılımı, Bütçe-Gerçekleşen) ve **Mali/Muhasebe**
(KDV Özeti, BA-BS, Mizan, Muavin, Muhasebe Aktarımı). Aylık Özet her zaman ilk sekmedir. Grup
başlıkları `Tabs` bileşeninin üstünde küçük bir `role="tablist"` grubudur; mobilde grup başlıkları
yatay kaydırmalı şerit olur.

Yeni bir **rapor üst şeridi** eklenir: tarih aralığı (hazır seçenekler: Bugün · Bu hafta · Bu ay ·
Geçen ay · Bu çeyrek · Bu yıl · Geçen yıl · Özel), karşılaştırma anahtarı (Önceki dönem / Geçen yıl
aynı dönem / yok — **doğrulanacak:** Luca'da karşılaştırma var mı), para birimi (yalnız TL bugün;
döviz `22-ITHALAT-IHRACAT-DOVIZ.md`), "şube/şirket" seçimi (bugün tek şirket; çok şirket
`30-COK-SIRKETLI-KONSOLIDASYON.md`), "sıfır satırları gizle" anahtarı ve "Rapor Tasarla" düğmesi
(`24-RAPOR-TASARIMCISI.md`'ye gider).

### 4.2 Rapor envanteri

Aşağıdaki tablo, envanterin **özet sözleşmesidir**. Her satır bir sekme/rapor olur. "Perf." sütunu
hedef ölçüdür: **A** = tek istek, p95 < 400 ms; **B** = p95 < 1,5 s (20.000 satıra kadar); **C** =
p95 < 4 s ve arka planda üretim (uzun rapor).

| # | Rapor | Amaç | Filtreler | Toplamlar | Yetki | Excel | PDF | Perf. | Bağlı modül |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Cari Ekstre (toplu) | Bütün carilerin dönem hareketi ve kapanış bakiyesi | tarih aralığı, cari, tür (müşteri/tedarikçi), bakiye var/yok, "faturasız sevkiyatları göster" | devir, borç, alacak, kapanış, vadesi geçen | accounting | var | var | B | `09-CARI-YONETIMI.md` |
| R2 | Alacak Yaşlandırma | Kim, ne kadar, ne zamandır borçlu | tarih (yaşlandırma anı), cari, kova aralıkları, risk limiti aşımı | 5 kova + toplam, vadesi geçen | accounting | var | var | B | `09` |
| R3 | Borç Yaşlandırma | Taşeron/tedarikçiye ne zaman ne ödeyeceğiz | tarih, tedarikçi, tür (taşeron/hizmet/yakıt) | 5 kova + toplam | accounting | var | var | B | `12-SATIN-ALMA.md` |
| R4 | Satış Analizi | Ciro nereden geliyor: müşteri, güzergâh, ay, hizmet | tarih, müşteri, güzergâh ili, sevkiyat durumu, grup (`CustomerGroup`), fatura durumu | sevkiyat, ciro (KDV hariç), KDV, tevkifat, KDV dahil | accounting | var | var | B | `11-SATIS-FATURA.md` |
| R5 | Kârlılık (Kazanç) | Tek kâr formülüyle kâr ve marj | tarih, kırılım (ay/müşteri/araç/şoför), müşteri, araç, şoför | satış, komisyon, maliyet, prim, masraf, gider, kâr, marj % | accounting | var | var | B | `11`, `13-SIPARIS-TEKLIF.md` |
| R6 | Sevkiyat Kârlılığı | Sevkiyat başına kâr/zarar | tarih, müşteri, plaka, durum, güzergâh, kâr < 0 / marj < %5 | satış, araç maliyeti, gider, kâr | accounting | var | var | B | `11` |
| R7 | Müşteri Kârlılığı | Hangi müşteri kâr bırakıyor | tarih, müşteri, grup, min. sevkiyat sayısı | ciro, maliyet, kâr, marj, açık alacak, tahsil süresi | accounting | var | var | B | `09` |
| R8 | Müşteri Performansı | Hizmet kalitesi: zamanında teslim, iade, ceza | tarih, müşteri, güzergâh | sevkiyat, zamanında teslim %, gecikme gün toplamı, iade sayısı, ceza tutarı | accounting | var | var | B | `11`, `13` |
| R9 | Güzergâh Kârlılığı | Hangi hat para kazandırıyor | tarih, yükleme ili, teslim ili, min. sevkiyat | sevkiyat, ort. satış, ort. maliyet, toplam kâr, marj | accounting | var | var | B | `11` |
| R10 | Araç Maliyeti | Araç başına gerçek maliyet ve km maliyeti | tarih, plaka, öz/kiralık, araç tipi, km aralığı | gelir, yakıt, bakım, lastik, sigorta/vergi, diğer, toplam gider, net, km başına maliyet | accounting | var | var | B | `19-SABIT-KIYMET.md` |
| R11 | Şoför Bazlı | Şoför verimliliği ve avans/harcırah dengesi | tarih, şoför, tedarikçi (taşeron şoförü) | sevkiyat, teslim, gelir, maliyet, kâr, avans, harcırah | accounting | var | var | B | `18-PERSONEL.md` |
| R12 | Yakıt | Tüketim ve litre fiyatı denetimi | tarih, plaka, yakıt istasyonu (tedarikçi), min. litre | alım, litre, tutar, ort. litre fiyatı, km, L/100 km, filo ortalaması | accounting | var | var | B | `17-GIDER-GELIR-MERKEZLERI.md` |
| R13 | Gider Dağılımı | Gider nereye gidiyor | tarih, kategori, araç, şoför, tedarikçi, onay durumu, merkez | tutar, pay %, kategori toplamı | accounting | var | var | A | `17` |
| R14 | **Nakit Akışı** | Önümüzdeki 4 hafta ne girecek/çıkacak | ufuk (2/4/8/12 hafta), hesap, yalnız gecikmiş, senaryo (çekler tahsil edilirse/edilmezse) | beklenen giriş, çek-senet girişi, beklenen çıkış, net, eldeki nakit | accounting | var | var | A | `14-KASA.md`, `15-BANKA-ENTEGRASYON.md`, `16-CEK-SENET.md` |
| R15 | **Kasa/Banka Durumu** | Hesap bakiyeleri ve günlük hareket | tarih, hesap, tür (kasa/banka/POS/kredi kartı), aktif/pasif | açılış, giriş, çıkış, kapanış, net | accounting | var | var | A | `14`, `15` |
| R16 | **KDV Özeti (beyan öncesi kontrol)** | Hesaplanan ve indirilecek KDV, devreden | dönem (ay), fatura türü, KDV oranı, tevkifatlı/tevkifatsız | matrah, KDV, tevkifat, KDV dahil toplam, oran kırılımı | accounting (admin görünür) | var | var | B | `06-MUHASEBE-MOTORU.md`, `08-E-BELGE-KATMANI.md` |
| R17 | **BA-BS** | Form BA/BS öncesi mal/hizmet listesi | dönem, taraf (alış/satış), eşik tutarı, belge türü, VKN | belge sayısı, matrah, KDV, toplam | accounting | var | var | B | `06`, `08` |
| R18 | **Mizan / Muavin** | Hesap bazlı borç-alacak-bakiye dengesi | dönem, hesap aralığı, hesap sınıfı, seviye, yalnız hareketli hesaplar | borç, alacak, borç bakiye, alacak bakiye, denge kontrolü | accounting | var | var | B | `06` |
| R19 | **Çek-Senet Vade Takvimi** | Vade haftasına göre tahsil/ciro planı | tarih aralığı, durum (portföy/tahilde/tahsil/ciro/karşılıksız), müşteri, banka, tutar aralığı | hafta toplamı, durum toplamı, portföy toplamı | accounting | var | var | B | `16-CEK-SENET.md` |
| R20 | **Bütçe-Gerçekleşen** | Plan ile gerçek farkı | dönem, merkez, gider/gelir türü, bütçe sürümü | bütçe, gerçekleşen, fark, fark %, kalan | accounting | var | var | B | `17` |
| R21 | **Tedarikçi Performansı** | Taşeron/hizmet kalitesi ve maliyet | tarih, tedarikçi, tür, güzergâh, fatura durumu | sevkiyat, maliyet, ödenen, bakiye, fatura gelmeyen sevkiyat, ort. ödeme günü | accounting | var | var | B | `12` |
| R22 | Muhasebe Aktarımı | Mali müşavire aylık dosya | ay | satış, tahsilat, gider, taşeron maliyet/ödeme, KDV, tevkifat | accounting | var | — | A | `28-MUHASEBECI-PAKETI.md` |

Yukarıdaki 22 raporun 13'ü bugün kısmen vardır (bkz. §3); **R14, R15, R16, R17, R18, R19, R20 ve R21
yeni**, geri kalanı genişletmedir. "Excel" kolonunun hepsi `format=xlsx` sorgusuyla aynı uçtan iner
(mevcut desen: `ReportsController.cs:40`); "PDF" kolonu `DocumentPdfs`/`StatementPdfGenerator`
desenini kullanır (mevcut ekstre PDF'i: `server/YesLojistik.Api/Controllers/CustomersController.cs:86-99`).

### 4.3 Rapor ekranı ortak parçaları

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Tarih aralığı | iki tarih + hazır seçenek | evet | Aralık değişince sayfa 1'e döner; adres çubuğuna yazılır | "Başlangıç tarihi bitiş tarihinden sonra olamaz." (mevcut metin, `ReportsController.cs:60`) |
| Kırılım | seçim | hayır | Ay / Müşteri / Araç / Şoför / Güzergâh / Merkez | — |
| Sıfır satırları gizle | anahtar | hayır | Toplamı 0 olan satırlar listeden çıkar; toplamlar değişmez | — |
| Karşılaştır | seçim | hayır | Önceki dönem / Geçen yıl / yok; fark sütunu eklenir | — |
| Arama | `SearchBox` | hayır | Sunucuya `search` olarak gider (300 ms gecikmeli) | — |
| Excel'e Aktar | `ExportButton` | — | Ekrandaki süzgecin tamamı ile iner; 20.000 satır tavanı | "Dışa aktarma sınırı aşıldı; tarih aralığını daraltın." |
| PDF | `PdfButton` | — | Yeni sekmede açılır; kurumsal başlık ve toplam satırı | "PDF oluşturulamadı." |
| Sütun seç | çoklu seçim | hayır | Sütun görünürlüğü kullanıcıya kaydedilir | — |
| Sayfa boyutu | seçim | hayır | 20 / 50 / 100 / 200 | — |

Excel dışa aktarmada **süzgeç, sıralama ve toplam** ekrandakiyle aynı olmalıdır; bugün bu kural
filtre toplamları için tanımlıdır (`client/src/lib/hooks.ts:35-38`) ve rapor uçlarına da uygulanır.

## 5. İş kuralları

1. **Tarih aralığı sözleşmesi.** Bütün raporlar `from`/`to` alır; ikisi de **dahil**dir. `to` boşsa
   `Clock.Today`, `from` boşsa `to`'nun yıl başı (mevcut davranış: `ReportsController.cs:30-34`).
   `from > to` → hata (`:60`). Yaşlandırma raporlarında `to` "yaşlandırma anı"dır; kovalar bu ana göre
   hesaplanır. Aylık raporlarda ay = `from`..`to` aralığından türetilir, ayrı `month` parametresi
   kullanılmaz; yalnız Aylık Özet takvim yılı alır (uyumluluk için korunur).
2. **Para ve yuvarlama.** Her hücre sunucuda 2 kuruşa yuvarlanır (mevcut desen:
   `server/YesLojistik.Core/Domain/Money.cs`, `ExpenseVat.cs:31`); toplamlar **yuvarlanmış
   satırlardan** toplanır, ham ondalıklardan değil. Böylece Excel toplamı ekran toplamıyla kuruşuna
   kadar aynı olur. Marj ve yüzdeler bir ondalık basamakla gösterilir (mevcut desen:
   `ReportsPage.tsx:177`, `:341`).
3. **KDV mantığı.** Kârlılık raporlarında tutarlar **KDV hariç**tır (`ReportsPage.tsx:170`); cari,
   tahsilat ve borç raporlarında **KDV dahil**tır (gerçek para). KDV Özeti iki tarafı ayrı gösterir:
   hesaplanan KDV (satış faturaları) ve indirilecek KDV (alış faturaları + gider KDV'si). Gider
   KDV'si `ExpenseVat.NetAmount` üzerinden ayrıştırılır (`server/YesLojistik.Core/Domain/ExpenseVat.cs:31`).
   Tevkifat ayrı sütundur (mevcut: `ReportsController.cs:84`). **Mevzuat yorumu yapılmaz**; hangi
   oranların beyana girdiği mali müşavir onayına bağlıdır.
4. **Kâr formülü tek ve değişmez.** Kâr = satış + komisyon − araç/taşeron maliyeti − şoför primi −
   müşteriye faturalanmayan ek masraf − sevkiyata bağlı onaylı giderler
   (`ReportsPage.tsx:170`, `ReportsController.cs:73`). Yeni raporlar (Araç Maliyeti, Müşteri
   Performansı) bu formülü yeniden yazmaz; ortak fonksiyonu çağırır.
5. **Bağlantı (drill-down).** Rapor satırından kaynağa gitme kuralı: müşteri → `/musteriler/{id}`,
   tedarikçi → `/tedarikciler/{id}`, sevkiyat → `/seferler?search={plaka}` ya da sevkiyat detayı,
   fatura → `/faturalar?search={no}`, araç → `/araclar`. Bu bağlar bugün kısmen vardır
   (`ReportsPage.tsx:156`, `:324`, `:346`, `:377`).
6. **Sıfır satır kuralı.** Kaynağı olmayan hesaplar (ör. hiç sevkiyatı olmayan müşteri) raporda
   **gösterilmez**; "sıfır satırları gizle" anahtarı bunu kullanıcıya bırakır. Bu, yaşlandırma
   raporlarının bugünkü davranışıdır ("Açık alacak yok." → `ReportsPage.tsx:276`).
7. **Dışa aktarma tavanı.** Tek Excel'de en fazla 20.000 satır (`QueryExtensions.cs:11`). Tavan
   aşılırsa iki yol: tarih aralığını daraltmak ya da "arka planda üret, bitince bildir" akışı
   (`33-BILDIRIM-EPOSTA-SMS-KEP.md`). Arka plan akışı bu dokümanın kapsamındadır; kuyruk altyapısı
   `36-PERFORMANS-OLCEK.md` ile birlikte kurulur.
8. **Karşılaştırma kuralı.** "Önceki dönem", seçili `from`..`to` aralığının **aynı gün sayısı** kadar
   geriye kaydırılmasıyla bulunur (ör. 1–31 Ekim → 1–30 Eylül). "Geçen yıl", aynı tarihlerin bir yıl
   öncesidir. Fark sütunu = (bu dönem − karşılaştırma) ve yüzde = fark / karşılaştırma; karşılaştırma
   0 ise yüzde "—" gösterilir.
9. **Yetki kuralı.** Rapor görme `Accounting` politikasına bağlıdır (mevcut: `ReportsController.cs:12`).
   Yeni kural: **operasyon rolü** sevkiyat/cari kaynaklı raporları (R4, R6, R7, R8, R10, R11, R21)
   görebilir; **mali raporlar** (R16, R17, R18, R20, R22) yalnız `Accounting` ve `Admin` görür. Yetki
   matrisi `07-YETKI-ONAY-NUMARALANDIRMA.md` ile hizalanır.
10. **Tutarlılık kuralı.** Aynı sayı iki raporda farklı çıkamaz. Kabul: Aylık Özet net kâr toplamı,
   Kazanç raporu kâr toplamı ve Sevkiyat Kârlılığı kâr toplamı aynı dönemde eşittir (mevcut test
   deseni: `ReportsAndExportsTests.cs:38-60`). Nakit Akışı'ndaki "beklenen giriş" toplamı, Alacak
   Yaşlandırma toplamı + portföy/tahildeki çek-senet toplamına eşit olmalıdır (mevcut hesap:
   `CashService.cs:106-112`).
11. **Onaylı gider kuralı.** Kâr ve maliyet raporlarında yalnız `ApprovalStatus.Approved` gider
   sayılır (mevcut: `server/YesLojistik.Infrastructure/Services/TripFigures.cs:20`,
   `ReportService.cs:23`). Onay bekleyen giderler raporda ayrı bir uyarı şeridiyle gösterilir
   ("3 gider onay bekliyor, kârda sayılmadı").
12. **Ayna modu kuralı.** Ayna açıkken cari bakiyeler pratikortam'dakidir
   (`client/src/pages/CariPage.tsx:80-82`, `:127-128`) ve rapor, panelin kendi hesabını yapmaz.
   R1/R2/R3 raporları ayna modunda "pratikortam kaynaklı" etiketiyle gelir; panel kaynaklı nakit
   akışı ayrı sekmede kalır.

## 6. Veri modeli

**Yalnız ekleme** yapılır (`01-ORTAK-SARTNAME.md:22`). Mevcut tablo/alan silinmez.

Yeni tablolar:

- `ReportDefinition` — rapor kataloğu (R1…R22 ve tasarımcıda kaydedilenler).
  `Id`, `Key` (ör. `cash-flow`), `Title`, `Group` (Ticari/Finans/Mali), `Description`,
  `Source` (veri görünümü anahtarı, `24-RAPOR-TASARIMCISI.md` ile ortak), `DefaultSort`,
  `DefaultPageSize`, `RequiredPermission` (metin: `accounting`/`operations`/`admin`),
  `ModuleRef` (ör. `16-CEK-SENET.md`), `IsSystem` (sistem raporu mu), `IsActive`, `Order`,
  `Sla` (`A`/`B`/`C`), `CustomDefinitionId` (tasarımcı tanımına bağ; boş olabilir).
  Sistem raporları kod ile aynı anahtarı taşır; katalog tablosu yalnız **görünüm ve yetki** bilgisini
  tutar, hesabı kod yapar.
- `ReportColumnPreference` — kullanıcı başına sütun görünürlüğü ve sırası.
  `Id`, `UserId`, `ReportKey`, `ColumnsJson`, `UpdatedAt`.
- `ReportRunLog` — rapor çalıştırma ve dışa aktarma denetim izi.
  `Id`, `ReportKey`, `UserId`, `UserName`, `FiltersJson`, `RowCount`, `DurationMs`, `Format`
  (`json`/`xlsx`/`pdf`), `At`, `CompanyId` (çok şirketli yapı için; bugün 1).
- `ReportFavorite` — kullanıcının sık kullandığı raporlar ve kayıtlı süzgeçleri.
  `Id`, `UserId`, `ReportKey`, `Name`, `FiltersJson`, `IsShared`, `At`.

Mevcut tablolara **eklenen** alanlar (boş olabilir):

- `Invoice` → yok (KDV alanları hazır: `server/YesLojistik.Core/Entities/Invoice.cs:14`).
- `Expense` → yok (`ExpenseVat` hesabı hazır: `ExpenseVat.cs:31`).
- `Customer` → yok (`PaymentTermDays`, `CreditLimit` hazır: `Customer.cs:22`, `:28`).
- `AppDbContext` içine DbSet ve indeks eklenir; desen `AppDbContext.cs:37-43` ile aynıdır.
  İndeksler: `ReportRunLog(CompanyId, At)`, `ReportColumnPreference(UserId, ReportKey)` benzersiz,
  `ReportFavorite(UserId, ReportKey)`.

Rapor sorguları için **mevcut** indeksler yeterlidir (sevkiyat tarih/plaka, fatura tarih/durum,
gider tarih/kategori, ödeme tarih, çek vade). Yeni indeks gerekirse **yalnız ekleme** yapılır;
ölçüm `36-PERFORMANS-OLCEK.md` işidir.

İlişkiler: `ReportDefinition.Source` → tasarımcı veri görünümü (`ReportDataSource`, bkz.
`24-RAPOR-TASARIMCISI.md`); `ReportRunLog.ReportKey` → `ReportDefinition.Key` (mantıksal, yabancı
anahtar zorunlu değil, çünkü kod raporları da loglanır).

## 7. API uçları

Tüm uçlar `[Authorize]` altındadır ve §5.9'daki yetki kuralına uyar. Ortak zarf:
`PagedResult<TRow>` (`Common.cs:3`); toplamlar ayrı uçtan veya aynı yanıtta `totals` alanıyla döner.

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/reports/catalog` | — | `ReportDefinitionDto[]` | giriş yapmış tüm roller (kendi yetkisine göre süzülür) |
| GET | `/api/reports/{key}` | `ReportQuery` | `PagedResult<TRow>` + `totals` | rapora bağlı |
| GET | `/api/reports/{key}/totals` | `ReportQuery` (sayfa hariç) | `ReportTotalsDto` | rapora bağlı |
| GET | `/api/reports/{key}/export` | `ReportQuery` + `format=xlsx\|pdf\|csv` | dosya | rapora bağlı |
| GET | `/api/reports/statements` (R1) | `from,to,kind,customerId,withBalance,uninvoiced,page,pageSize,sort,desc,search` | `PagedResult<StatementRowDto>` | accounting |
| GET | `/api/reports/aging/receivable` (R2) | `asOf,customerId,bucket,riskOnly` | `PagedResult<CustomerAgingRow>` | accounting |
| GET | `/api/reports/aging/payable` (R3) | `asOf,supplierId,kind,bucket` | `PagedResult<PayableAgingRow>` | accounting |
| GET | `/api/reports/sales` (R4) | `from,to,groupBy(customer/route/month/service),customerId,groupId,status` | `PagedResult<SalesAnalysisRow>` | accounting |
| GET | `/api/reports/profit` (R5, mevcut) | `from,to,groupBy,customerId,vehicleId,driverId` | `PagedResult<ProfitReportRow>` | accounting |
| GET | `/api/reports/trips` (R6, mevcut) | `from,to,customerId,vehicleId,status,onlyLoss` | `PagedResult<TripProfitRow>` | accounting |
| GET | `/api/reports/customers` (R7, mevcut) | `from,to,minTrips` | `PagedResult<CustomerProfitRow>` | accounting |
| GET | `/api/reports/customer-performance` (R8) | `from,to,customerId,route` | `PagedResult<CustomerPerformanceRow>` | accounting |
| GET | `/api/reports/routes` (R9, mevcut) | `from,to,fromCity,toCity,minTrips` | `PagedResult<RouteProfitRow>` | accounting |
| GET | `/api/reports/vehicle-cost` (R10) | `from,to,plate,ownership,minKm` | `PagedResult<VehicleCostRow>` | accounting |
| GET | `/api/reports/drivers` (R11, mevcut) | `from,to,driverId,supplierId` | `PagedResult<DriverReportRow>` | accounting |
| GET | `/api/reports/fuel` (R12, mevcut) | `from,to,vehicleId,supplierId,minLiters` | `PagedResult<FuelReportRow>` | accounting |
| GET | `/api/reports/expenses` (R13, mevcut) | `from,to,category,vehicleId,driverId,supplierId,approval,centerId` | `PagedResult<ExpenseCategoryRow>` | accounting |
| GET | `/api/reports/cash-flow` (R14) | `weeks(2..12),accountId,overdueOnly,scenario` | `CashFlowReportDto` | accounting |
| GET | `/api/reports/cash-accounts` (R15) | `asOf,kind,activeOnly` | `PagedResult<CashAccountStatusRow>` | accounting |
| GET | `/api/reports/vat-summary` (R16) | `period` (YYYY-MM) veya `from,to`, `vatRate`, `withWithholding` | `VatSummaryDto` (+ oran kırılımı) | accounting |
| GET | `/api/reports/ba-bs` (R17) | `period`, `side(ba/bs)`, `threshold`, `documentKind` | `PagedResult<BaBsRow>` | accounting |
| GET | `/api/reports/trial-balance` (R18) | `from,to,accountFrom,accountTo,level,onlyWithMovement` | `PagedResult<TrialBalanceRow>` | accounting |
| GET | `/api/reports/ledger` (R18 muavin) | `from,to,accountCode` | `PagedResult<LedgerRow>` | accounting |
| GET | `/api/reports/instrument-calendar` (R19) | `from,to,status,customerId,bank,minAmount,maxAmount` | `PagedResult<InstrumentCalendarRow>` | accounting |
| GET | `/api/reports/budget-actual` (R20) | `period,centerId,kind,budgetVersion` | `PagedResult<BudgetActualRow>` | accounting |
| GET | `/api/reports/supplier-performance` (R21) | `from,to,supplierId,kind,route` | `PagedResult<SupplierPerformanceRow>` | accounting |
| GET | `/api/reports/runs` | `reportKey,userId,from,to,page,pageSize` | `PagedResult<ReportRunLogDto>` | admin |
| GET/PUT | `/api/reports/{key}/columns` | `ColumnsJson` | `ReportColumnPreferenceDto` | giriş yapmış |
| GET/POST/PUT/DELETE | `/api/reports/favorites` | `reportKey,name,filtersJson,isShared` | `ReportFavoriteDto` | giriş yapmış |
| GET | `/api/reports/export-jobs/{id}` | — | `ExportJobDto` (durum, dosya bağlantısı) | rapora bağlı |

`ReportQuery`, mevcut `ListQuery`'yi (`Common.cs:5-14`) genişletir:
`record ReportQuery : ListQuery { DateOnly? From; DateOnly? To; string? GroupBy; string? Compare; bool HideZeroRows; string? Filters; }`
— `Filters` alanı, raporun kendi ek süzgeçlerini JSON olarak taşır (sunucuda beyaz listedeki
anahtarlarla eşlenir; serbest SQL yoktur — bkz. `24-RAPOR-TASARIMCISI.md` §5).

Dışa aktarma: mevcut `FileResults.Excel` (`ReportsController.cs:41`) ve `ExcelExporter` /
`ExcelWorkbookBuilder` deseni kullanılır. PDF için `StatementPdfGenerator` deseni genişletilir
(`CustomersController.cs:86-99`). Dosya adı Türkçe ve tarih içerir: `alacak-yaslandirma-03.10.2026.xlsx`.

## 8. Yetki, onay ve denetim izi

Rol matrisi (roller: `Admin`, `Operations`, `Accounting`, `Driver` — `Policies.cs:15-17`):

| Rapor grubu | Admin | Accounting | Operations | Driver |
|---|---|---|---|---|
| Operasyon raporları (R4, R6, R7, R8, R9, R10, R11, R12, R21) | ✓ | ✓ | ✓ (okuma) | — |
| Mali raporlar (R1, R2, R3, R13, R14, R15, R16, R17, R18, R19, R20, R22) | ✓ | ✓ | — | — |
| Rapor kataloğunu düzenleme, paylaşılan süzgeç | ✓ | — | — | — |
| Rapor çalıştırma kayıtları (`/api/reports/runs`) | ✓ | — | — | — |
| Kullanıcı tanımlı rapor tanımı (`24-RAPOR-TASARIMCISI.md`) | ✓ | ✓ (kendi + paylaşılan) | ✓ (kendi) | — |

- **Onay (maker-checker).** Raporun kendisi onay gerektirmez; ama **paylaşılan** süzgeç/rapor tanımı
  yayına alınmadan önce yönetici onayı ister (durum: Taslak → Onay bekliyor → Yayında).
  Desen `07-YETKI-ONAY-NUMARALANDIRMA.md` ile aynıdır.
- **Denetim izi.** Her rapor çalıştırma ve her dışa aktarma `ReportRunLog`'a yazılır (kullanıcı,
  rapor anahtarı, süzgeçler, satır sayısı, süre, biçim). Bugün yalnız tam veri yedeği loglanır
  (`DataExportController.cs:37-41`); bu modül logu rapor düzeyine indirir. Log kaydı **filtre
  metnini** saklar; kişisel veri içermez (VKN gibi alanlar süzgeçte aranmaz, yalnız sayısal/tarih
  süzgeçler saklanır — KVKK akışı `35-DENETIM-IZI-KVKK-UYUM.md`).
- **Satır düzeyi güvenlik.** Bugün tek şirket vardır; çok şirketli yapıda rapor sorgusu zorunlu
  `CompanyId` süzgeci alır (`30-COK-SIRKETLI-KONSOLIDASYON.md`). Şoför rolü hiçbir rapora erişemez
  (`Driver` rolü `StaffRoles` dışındadır: `Policies.cs:15`).
- **Ayna ve lisans.** Ayna açıkken raporlar çalışır ama yazma gerektiren hiçbir şey yapmaz; lisans
  süresi dolduğunda raporlar **okunabilir** kalır (salt okunur mod yalnız yazmayı engeller,
  `01-ORTAK-SARTNAME.md:16-18`).

## 9. Kabul kriterleri

1. Rapor merkezinde **22 rapor** vardır; her biri `ReportDefinition` kaydıyla gelir ve yetkisiz
   kullanıcıya menüde görünmez.
2. Bütün rapor uçları `PagedResult<T>` döndürür; hiçbir uç tam listeyi zarfın dışında döndürmez.
3. 20.000 satırlık bir dönemde (test verisi) her rapor p95 süresi **1,5 saniyenin** altındadır;
   A sınıfı raporlarda **400 ms** altındadır (ölçüm `36-PERFORMANS-OLCEK.md` yöntemiyle).
4. Ekrandaki toplam ile Excel'deki toplam **kuruşuna kadar** aynıdır (para 2 kuruş).
5. Aynı dönemde Aylık Özet net kâr toplamı = Kazanç kâr toplamı = Sevkiyat Kârlılığı kâr toplamı.
6. Nakit Akışı "beklenen giriş" = Alacak Yaşlandırma toplamı + portföy/tahildeki çek-senet toplamı
   (fark < 0,05 TL).
7. `from > to` her uçta aynı Türkçe hatayı verir (`ReportsController.cs:60` metni birebir).
8. Her rapordan kaynağa en fazla **1 tıkla** gidilir (satır tıklaması ya da satır sonu düğmesi).
9. 1440×900'de rapor tablosunda **≥12 satır** görünür; üst kısım (başlık → tablo başlığı) **≤260px**
   (`docs/plan/01-ORTAK-SARTNAME.md:240-241`).
10. 390×844'te yatay kaydırma yok; raporlar `MobileCards` ile kart görünümünde açılır.
11. Rapor çalıştırma ve dışa aktarma **%100** `ReportRunLog`'a yazılır (otomatik test: 10 çalıştırma →
    10 kayıt).
12. Yeni testler: sunucu `dotnet test` yeşil, e2e `client/e2e/reports.spec.ts` yeşil; mevcut test
    silinmez/atlanmaz (`01-ORTAK-SARTNAME.md:24-25`).

## 10. Testler

**Sunucu (birim).**
`server/YesLojistik.Tests/Unit/ReportQueryTests.cs` (yeni): tarih aralığı sözleşmesi (boş `from`/`to`,
`from > to`, ay sınırı), karşılaştırma dönemi hesabı (1–31 Ekim → 1–30 Eylül), yuvarlama kuralı
(yuvarlanmış satırlardan toplam), `HideZeroRows` davranışı.
`server/YesLojistik.Tests/Unit/ReportTotalsTests.cs` (yeni): kâr formülünün rapor toplamlarıyla
uyumu; Nakit Akışı = yaşlandırma + çek-senet eşitliği.

**Sunucu (entegrasyon).**
`server/YesLojistik.Tests/Integration/ReportCenterTests.cs` (yeni): 22 raporun kaydı, yetki süzülmesi
(`Operations` mali raporu göremez), `PagedResult` zarfı, `format=xlsx` üretimi.
`server/YesLojistik.Tests/Integration/ReportExportAuditTests.cs` (yeni): her çalıştırma için
`ReportRunLog` kaydı.
`server/YesLojistik.Tests/Integration/VatSummaryTests.cs` (yeni): hesaplanan/indirilecek KDV, oran
kırılımı, tevkifat ayrımı, iptal edilen faturanın beyana girmemesi
(`InvoiceStatus` — `server/YesLojistik.Core/Entities/Enums.cs:26`).
`server/YesLojistik.Tests/Integration/BaBsTests.cs` (yeni): eşik altı belgenin listelenmemesi, VKN
boş kayıtların uyarı üretmesi.
`server/YesLojistik.Tests/Integration/InstrumentCalendarTests.cs` (yeni): hafta kovaları, durum
kırılımı, karşılıksız çekin plana girmemesi (mevcut çek kuralları:
`client/src/pages/ChecksPage.tsx:118`).
Mevcut testler korunur ve genişletilir:
`server/YesLojistik.Tests/Integration/ReportsAndExportsTests.cs`,
`server/YesLojistik.Tests/Integration/SearchAndReportTests.cs`,
`server/YesLojistik.Tests/Integration/PayableTests.cs`,
`server/YesLojistik.Tests/Integration/CashTests.cs`,
`server/YesLojistik.Tests/Integration/CariExportTests.cs`.

**Panel (e2e, Playwright).**
`client/e2e/reports.spec.ts` (yeni): rapor merkezi açılır, 22 sekme görünür; tarih aralığı daraltılınca
satır sayısı azalır; Excel indirme başlar (`page.waitForEvent('download')`); yetkisiz kullanıcı
(operasyon rolü) mali raporu görmez.
`client/e2e/reports-mobile.spec.ts` (yeni): 390×844'te yatay kaydırma yok, kart görünümü ve hazır
tarih seçenekleri çalışır. Yeni görünüm testi `useNewUi(page)` yardımcısıyla yazılır
(`client/e2e/helpers.ts:44-46`).
Mevcut `client/e2e/cari.spec.ts` (ekstre ve cari akışı) ve `client/e2e/mobile.spec.ts` korunur.

**Veri.** Testler uydurma veriyle çalışır (`01-ORTAK-SARTNAME.md` §1.3); pratikortam verisi
kullanılmaz. Örnek: `ABC Nakliyat`, `16 KZ 528`, `17.000,00 TL`.

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün | Not |
|---|---|---|
| Ortak `ReportQuery` + zarflama + toplam uçları | 4-6 | Mevcut `QueryExtensions` üstüne |
| `ReportDefinition` kataloğu + yetki süzülmesi + ekran grupları | 3-4 | `ReportCenterTests` |
| Mevcut 13 sekmeyi sayfalama/toplam sözleşmesine taşıma | 5-7 | Kâr formülü değişmez |
| R1 cari ekstre (toplu) + R2/R3 yaşlandırma süzgeçleri | 4-5 | `09-CARI-YONETIMI.md` ile ortak |
| R4 satış analizi | 3-4 | — |
| R8 müşteri performansı, R21 tedarikçi performansı | 4-6 | Zamanında teslim verisi gerekir |
| R10 araç maliyeti (km başına) | 3-4 | `19-SABIT-KIYMET.md` amortismanı bekler |
| R14 nakit akışı sekmesi + R15 kasa/banka durumu | 3-4 | Hesap hazır (`CashService.cs:92-119`) |
| R16 KDV özeti | 4-5 | Mali müşavir onayı gerekir |
| R17 BA-BS | 4-6 | Eşik/limit doğrulanmalı |
| R18 mizan/muavin | 6-8 | `06-MUHASEBE-MOTORU.md` bitmeden yapılamaz |
| R19 çek-senet vade takvimi | 3-4 | — |
| R20 bütçe-gerçekleşen | 4-5 | `17-GIDER-GELIR-MERKEZLERI.md` bütçe tablosunu bekler |
| Ortak PDF şablonu + Excel başlık birliği | 3-4 | — |
| Denetim izi + dışa aktarma kuyruğu | 3-4 | `36-PERFORMANS-OLCEK.md` |
| Testler ve e2e | 6-8 | — |
| **Toplam** | **62-88** | — |

**Bağımlılık sırası:** (1) `05-VERI-MODELI.md` (ortak alanlar), (2) `06-MUHASEBE-MOTORU.md`
(R18, R22), (3) `09-CARI-YONETIMI.md` (R1, R2), (4) `15-BANKA-ENTEGRASYON.md` + `16-CEK-SENET.md`
(R14, R15, R19), (5) `17-GIDER-GELIR-MERKEZLERI.md` (R13, R20), (6) `10-STOK-VE-DEPO.md` (stok
envanter değeri — bu dokümanda yalnız yer ayrıldı), (7) `36-PERFORMANS-OLCEK.md` (SLA ölçümü).
`24-RAPOR-TASARIMCISI.md` bu dokümanın katalog ve süzgeç sözleşmesini **kullanır**; ters yön yoktur.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Rapor uçları sayfalamasız kalır, büyük veride tarayıcı kilitlenir | Ortak zarf zorunlu; `MaxPageSize` 500, `ExportLimit` 20.000 | Sekme bazında eski davranışa dön (uç `?legacy=1` kaldırılır) |
| Kâr formülü ikinci kez yazılır, iki rapor farklı sayı verir | Tek fonksiyon; test `ReportsAndExportsTests.cs:38-60` deseni | Yeni rapor kapatılır, eski rapor korunur |
| KDV özeti yanlış oran/tevkifat nedeniyle beyanı yanıltır | Ekranda "ön kontrol" ibaresi; beyan gönderimi yok | Rapor yalnız mali müşavir onayıyla açılır |
| BA-BS eşiği/limiti yanlış varsayılır | Eşik **parametre**; varsayılan boş | Eşik kullanıcı tarafından girilir |
| Toplamlar sayfa başına hesaplanır, yanlış çıkar | Toplam ayrı uçtan, tüm süzgeç kümesiyle | Toplam sütunu gizlenir |
| Ağır rapor isteği sunucuyu kilitler | Dışa aktarma kuyruğu + zaman aşımı + `ReportRunLog.DurationMs` izleme | Ağır rapor gece koşusuna alınır |
| Mizan, muhasebe çekirdeği bitmeden yazılmaya çalışılır | R18 `06-MUHASEBE-MOTORU.md` çıkış şartına bağlı | Sekme "hazırlanıyor" olarak gizlenir |
| Ayna modunda rapor panel rakamı gösterir | R1/R2/R3 ayna etiketi ve kaynak ayrımı | Rapor ayna modunda yalnız pratikortam rakamı gösterir |
| Rapor logu kişisel veri biriktirir | Log yalnız tarih/sayı süzgeci tutar; VKN arama metni saklanmaz | Log alanı daraltılır (`35-DENETIM-IZI-KVKK-UYUM.md`) |

**doğrulanacak:** Luca Analizler menüsündeki raporların tam listesi ve süzgeç yapısı — kaynak: Luca
kullanım kılavuzu/demo. **doğrulanacak:** yaşlandırma kovaları ve adat (faiz) oranı — kaynak: mali
müşavir. **doğrulanacak:** BA-BS eşik tutarı, hangi belge türlerinin listelendiği ve mutabakat
postasının alanları — kaynak: mali müşavir/GİB. **doğrulanacak:** KDV özetinde hangi oranların ve
tevkifatın beyana girdiği, devreden KDV'nin nasıl gösterileceği — kaynak: mali müşavir.
**doğrulanacak:** stok envanter değerinin maliyet yöntemi (FIFO/ortalama) — kaynak: Luca kılavuzu +
mali müşavir. **doğrulanacak:** "zamanında teslim" tanımı (planlanan teslim tarihi nereden gelir) —
kaynak: kullanıcı. **doğrulanacak:** karşılaştırma (önceki dönem/geçen yıl) istenip istenmediği —
kaynak: kullanıcı. **doğrulanacak:** rapor PDF'lerinde kurumsal başlık/logo ve imza alanı gerekip
gerekmediği — kaynak: kullanıcı. **doğrulanacak:** rapor çalıştırma kaydının saklama süresi — kaynak:
avukat/KVKK.

Sonraki belgeyle bağlantı: `24-RAPOR-TASARIMCISI.md` bu dokümandaki `ReportQuery`, `ReportDefinition`
ve süzgeç sözleşmesini kullanır; `36-PERFORMANS-OLCEK.md` SLA ölçümünü, `06-MUHASEBE-MOTORU.md`
R16-R18 raporlarının veri kaynağını, `09-CARI-YONETIMI.md` R1-R3 raporlarının hesabını sağlar.
