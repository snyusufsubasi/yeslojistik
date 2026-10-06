# 24 — Rapor Tasarımcısı

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz. "Bizde bugün"
bölümündeki her iddia `dosya:satır` kanıtı taşır.

## 1. Amaç ve kapsam

Kullanıcı "bana şu sütunların olduğu, şu tarihler arasında, şu müşteriye göre gruplanmış, tutarı
10.000 TL üstü kırmızı görünen bir liste lazım" dediğinde **kod yazılmasını beklemez**. Bu modül,
kullanıcının kendi raporunu **ekrandan** kurmasını sağlar: kaynak seçer, sütun seçer, başlık ve yazı
biçimini ayarlar, sıralar, gruplar, ara toplam alır, koşullu biçimlendirme koyar, grafik ekler,
kaydeder ve paylaşır.

Bugün panelde **22 hazır rapor** olacaktır (`23-RAPORLAMA-BI.md` §4.2) ve bu hazır raporlar
kullanıcının çoğu ihtiyacını karşılar. Rapor tasarımcısı, hazır raporların **kapsamadığı** durumlar
içindir: kendi birleştirdiği sütunlar, kendi eşikleri, kendi gruplaması, müşteriye özel liste.

**Kapsam:**

- **Kaynak seçimi:** sistemde tanımlı **veri görünümleri** (data source). Kullanıcı tablo seçmez;
  "Sevkiyatlar", "Cari Hareketler", "Faturalar", "Giderler", "Araçlar", "Çek/Senetler" gibi hazır
  görünümlerden birini seçer.
- **Sütun seçimi:** kaynağın izin verdiği alanlar arasından seçim; sütun başlığını değiştirme, yazı
  tipi (serif/mono) ve boyut seçme, sayı/tarih biçimi, hizalama, genişlik.
- **Sıralama:** birden çok sütuna göre artan/azalan.
- **Gruplama ve ara toplam:** bir ya da iki düzey grup; sayısal sütunlarda toplam/ortalama/en
  küçük/en büyük/sayı.
- **Koşullu biçimlendirme:** "tutar > 10.000 ise kırmızı kalın", "marj < %5 ise sarı zemin" gibi
  kurallar; hücre ya da satır düzeyinde.
- **Grafik:** sütun, yatay sütun, çizgi, alan, pasta, halka; X ekseni grup, Y ekseni ölçü.
- **Kaydetme ve paylaşma:** kişisel rapor, ekiple paylaşılan rapor, süzgeç kalıbı olarak kaydetme;
  paylaşılan rapor yönetici onayından geçer.
- **Yetki ve satır düzeyi güvenlik:** kaynak bazlı görünürlük; kullanıcı yalnız yetkili olduğu
  kaynakları ve satırları görür.
- **Güvenlik sınırı (kesin):** kullanıcı **SQL yazamaz**, tablo adı seçemez, kolon ifadesi giremez.
  Serbest metin yalnız sütun başlığıdır; onun da uzunluğu ve içeriği denetlenir.
- **Dışa aktarma:** kurulan rapor aynı Excel/PDF dışa aktarma yolundan iner
  (`23-RAPORLAMA-BI.md` §5.7, `ExcelExporter.cs:12-20`).
- **Ekran:** sürükle-bırak sütun seçici (sol: alan listesi, orta: sütun/ayar, sağ: canlı önizleme).
- **Teknik yaklaşım:** rapor **JSON tanım** olarak saklanır; sunucu tarafı bir **yorumlayıcı** bu
  tanımı beyaz listeye karşı çözer ve EF Core sorgusuna çevirir.

**Kapsam dışı:** hazır sistem raporları (`23-RAPORLAMA-BI.md`), yevmiye fişi üretimi
(`06-MUHASEBE-MOTORU.md`), veri ambarı/ETL, doğrudan SQL erişimi, dış BI aracına (Power BI vb.)
bağlanma, mobilde rapor tasarlama (mobilde yalnız kayıtlı raporu açma ve görüntüleme).

Bu modülün çözdüğü üç sorun: (1) "Her yeni liste için yazılımcı beklemek istemiyorum." (2) "Aynı
süzgeci her ay elle kuruyorum." (3) "Bu listeyi ortağımla aynı şekilde görmek istiyorum."

## 2. Luca'daki karşılığı

Luca Net'in tanıtım sayfasında **"bağımsız rapor tasarlama (sütun başlığı, yazı tipi, boyut
seçilebilir)"** maddesi vardır (`docs/plan-erp/02-LUCA-ENVANTERI.md:38`). Bu madde, bu dokümanın
birebir karşılığıdır: kullanıcı bağımsız (hazır olmayan) bir rapor tasarlar ve sütun başlığı, yazı
tipi ve boyutu seçebilir. Koza tarafında **"özel değişken tanımlama esnekliği; istenilen sayıda ve
formatta tanımlama/sorgulama"** (`02-LUCA-ENVANTERI.md:49`) ve **"stok/fatura/finans hareketlerinde
'işletmeye özel hareket tanımlama' ve hareket bazında gruplama"** (`:62`) maddeleri vardır; ikisi de
tasarımcının gruplama ve özel alan yönünü destekler. **"İstatistik raporları (satın alma-satış-finans
karar desteği)"** (`:57`) hazır rapor tarafındadır.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> ve
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'nın bağımsız rapor tasarımında seçilebilen yazı tipleri ve boyut aralığı —
kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da tasarlanan raporun kaydedilip
başka kullanıcıyla paylaşılıp paylaşılamadığı ve yetki düzeyi — kaynak: Luca kılavuzu.
**doğrulanacak:** Luca'nın rapor tasarımında grafik türleri (hangi grafikler var) — kaynak: Luca
demo. **doğrulanacak:** Luca'da rapor tanımının veritabanında mı dosyada mı tutulduğu ve taşınabilir
olup olmadığı — kaynak: Luca teknik dokümanı/satıcı. **doğrulanacak:** Luca'da koşullu biçimlendirme
(renk kuralı) desteği — kaynak: Luca demo. **doğrulanacak:** Luca Net One'da rapor tasarımcısının
kapsamı (`02-LUCA-ENVANTERI.md:13`, içerik okunmadı).

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Excel üretim altyapısı hazır ve rapor tanımına yakındır.** `server/YesLojistik.Infrastructure/Services/ExcelExporter.cs:5`
  → `ExcelColumn<T>(Header, Value, Format)`: **başlık**, **değer seçici** ve **biçim** üçlüsü. Bu,
  tasarımcının sütun modelinin sunucu tarafındaki tam karşılığıdır. `:9` `MoneyFormat`
  (`#,##0.00 "TL"`), `:10` `DateFormat` (`dd.mm.yyyy`).
- **Sayfa başlığı, açıklama satırı, kalın toplam satırı, otomatik süzgeç ve donmuş başlık satırı**
  `ExcelWorkbookBuilder.AddSheet` içinde vardır: `ExcelExporter.cs:33-43` (preface ve başlık satırı),
  `:46-51` (başlık biçimi: kalın, beyaz yazı, koyu zemin), `:56-64` (toplam satırı kalın + zemin),
  `:66` (`FreezeRows`), `:67` (`SetAutoFilter`), `:68` (`AdjustToContents`). Yani **yazı tipi
  boyutu** ve **zemin rengi** sunucuda zaten yazılabiliyor; tasarımcı bunları kullanıcı seçimine
  bağlar.
- **İstemci tarafı dışa aktarma ortak parçaları.** `client/src/components/Exports.tsx:28-32`
  (`ExportButton`), `:35-39` (`PdfButton`, filtreleri adrese ekler), `:16-26` (`useExportAction`),
  `:44-55` (`TotalsStrip`). İndirme `client/src/api/client.ts:114-125`; adres parametreleri `:85-95`.
- **Ortak tablo ve sıralama.** `client/src/components/DataTable.tsx:24-31` `Column<T>` tipi
  (`key`, `header`, `render`, `sortKey`, `align`, `className`); `:110-124` başlık ve sıralama
  düğmesi; `:137-141` hücre hizalaması (`align: 'right'` → sağa dayalı ve `tabular-nums`);
  `:150-163` sayfalama çubuğu. Tasarımcının ürettiği rapor **aynı tabloyla** gösterilir.
- **Sütun görünürlüğü ve kullanıcı tercihi deseni var.** `client/src/pages/TripsPage.tsx:80-84`
  bölümünde `yes.tripView` / `yes.tripColumns` tarayıcı anahtarları tutulur; yani sütun tercihini
  kullanıcıya kaydetme deseni projede vardır (bugün yalnız sevkiyat listesinde ve tarayıcıda).
- **Sıralama ve süzgeç güvenliği sunucuda çözülmüş.** `server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:13-21`
  `ApplySort` **sözlükten** (beyaz liste) anahtar okur; haritada olmayan `sort` değeri yok sayılır ve
  varsayılana düşer. `:23-31` `PageAsync` sayfa boyutunu 1–`maxPageSize` aralığına **kısıtlar**
  (`:26`), böylece kullanıcı `pageSize=1000000` yazamaz. `:46-49` `LikePattern` arama metnindeki `%`
  ve `_` karakterlerini kaçırır. Bu üç fonksiyon, tasarımcının güvenlik sınırının **mevcut
  temelidir**.
- **Sorgu zarfı ve liste parametreleri.** `server/YesLojistik.Core/Dtos/Common.cs:3`
  `PagedResult<T>`; `:5-14` `ListQuery` (`Page`, `PageSize`, `Search`, `Sort`, `Desc`, `Ids`).
- **İstemci tarafı liste sözleşmesi.** `client/src/lib/hooks.ts:26-32` `usePaged`,
  `:35-38` `listFilters`, `:41-45` `useListTotals`; `client/src/api/types.ts:22-29` `ListParams`
  (`page`, `pageSize`, `search`, `sort`, `desc` + serbest anahtarlar).
- **Grafik altyapısı ve palet hazır.** `client/src/lib/chart.ts:6-15` sabit renk jetonları
  (accent/hl/info/bad/tick/grid/cursor), `:18` eksen yazısı (Overpass Mono, 12 px).
  Kullanım örneği: `client/src/pages/ReportsPage.tsx:4` (recharts import), `:124-136` (sütun grafik),
  `:290-302` (yatay çubuk grafik), `:84-98` (özel ipucu balonu).
- **Koşullu biçimlendirme deseni (gömülü).** `ReportsPage.tsx:112` (negatif kâr kırmızı, pozitif
  kalın yeşil), `:193` (kâr rengi), `:251` (ortalamanın %15 üstü yakıt tüketimi kırmızı), `:272`
  (90+ gün kırmızı), `:341` (marj: negatif kırmızı, %10 altı sarı, üstü yeşil), `:382` (bakiye
  sarı). Bu eşikler **koda gömülüdür**; tasarımcı bunları kullanıcı kuralına çevirir.
- **Yetki altyapısı.** `server/YesLojistik.Api/Auth/Policies.cs:5-17`: `Admin`, `Accounting`,
  `Operations` politikaları. Rapor uçları bugün `Accounting` ister
  (`server/YesLojistik.Api/Controllers/ReportsController.cs:12`). `ReportRunLog` benzeri bir denetim
  tablosu henüz yoktur; tasarım kaydı için denetim deseni `server/YesLojistik.Core/Entities/AuditLog.cs:4`
  ile aynı olur.
- **Ayna ve lisans davranışı.** Kayıt değiştirmeyen işlemler aynada da çalışır
  (`client/src/components/Exports.tsx:8-11` açıklaması); lisans süresi dolduğunda salt okunur mod
  yalnız yazmayı engeller (`01-ORTAK-SARTNAME.md:16-18`). Tasarımcıda "raporu çalıştır" aynada da
  çalışır; "kaydet/paylaş" yazma sayılır ve aynada gizlenir.

**Olmayanlar (kanıtlı).**

- **Kullanıcı tanımlı rapor yok.** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43`
  içinde `ReportDefinition`, `ReportCustom`, `ReportDataSource` benzeri tablo **yoktur**. Rapor
  sekmesi listesi koda gömülüdür (`ReportsPage.tsx:38-52`).
- **Serbest veri kaynağı katmanı yok.** Bugün her rapor kendi elle yazılmış servis metodudur
  (`server/YesLojistik.Infrastructure/Services/ReportService.cs:11-200`, `CashService.cs:92-119`).
  Ortak "veri görünümü + alan listesi" soyutlaması yoktur; bu yüzden kullanıcıya seçilebilir alan
  listesi sunulamaz.
- **JSON rapor tanımı ve yorumlayıcı yok.** Kodda rapor tanımı taşıyan bir JSON şeması, doğrulayıcı
  ya da yorumlayıcı sınıfı geçmez.
- **Hesaplanan (formül) sütun yok.** `ExcelColumn<T>.Value` bir C# lambda'sıdır
  (`ExcelExporter.cs:5`); kullanıcı tanımlı ifade desteği **yoktur**.
- **Koşullu biçimlendirme kullanıcıya açık değil.** Renk/eşik kararları koda gömülüdür
  (`ReportsPage.tsx:341`, `:251`); kural tablosu yoktur.
- **Grafik seçimi yok.** Grafik türü her raporda sabittir (`ReportsPage.tsx:126` sütun grafik,
  `:294` yatay çubuk); kullanıcı grafik türü seçemez.
- **Rapor paylaşımı yok.** Panelde rapor paylaşma, süzgeç kalıbı kaydetme, sık kullanılan ekleme
  özelliği yoktur.
- **Sürükle-bırak sütun seçici yok.** Projede sürükle-bırak kitaplığı kullanılmaz; `package.json`
  içinde dnd bileşeni yoktur (bu doküman bir tane eklemeyi **önermez**; §4.3'te klavye/düğme
  tabanlı seçici tarif edilir).
- **Rapor çalıştırma denetim kaydı yok.** Yalnız tam veri yedeği loglanır
  (`server/YesLojistik.Api/Controllers/DataExportController.cs:37-41`).
- **Sütun ayarı sunucuda tutulmaz.** `yes.tripColumns` tarayıcıda tutulur
  (`TripsPage.tsx:80-84`); kullanıcı başka cihazdan girdiğinde tercihi kaybolur.

**Eksik listesi:** veri görünümü (data source) katmanı, alan meta verisi (etiket, tip, biçim, yetki
etiketi), rapor tanımı JSON şeması ve doğrulayıcısı, sunucu tarafı yorumlayıcı, hesaplanan sütun
ifade motoru (sınırlı), koşullu biçimlendirme kural motoru, grafik türü seçimi, kaydet/paylaş/yetki,
sürükle-bırak yerine erişilebilir sütun seçici, canlı önizleme, rapor çalıştırma denetim izi,
kullanıcı sütun tercihinin sunucuda saklanması.

## 4. Hedef ekranlar ve alanlar

### 4.1 Ekranlar

- `/raporlar/tasarla` — **Rapor Tasarımcısı** (tam sayfa). Üç kolon: sol **Alanlar**, orta
  **Sütunlar ve Ayarlar**, sağ **Önizleme**. Üstte kaynak seçimi ve "Kaydet / Farklı kaydet /
  Paylaş" düğmeleri.
- `/raporlar/tasarla/:id` — kayıtlı tanımı düzenleme (aynı ekran, dolu gelir).
- `/raporlar/kayitli` — **Kayıtlı Raporlarım** listesi: ad, kaynak, sahip, paylaşım, son çalıştırma,
  satır sayısı; satır menüsünde Aç · Kopyala · Paylaş · Sil · Excel · PDF.
- `/raporlar/kayitli/:id` — raporun **çalıştırma görünümü**: süzgeç şeridi + `DataTable` + grafik +
  Excel/PDF düğmeleri. Kayıtlı rapor açılınca kullanıcı yalnız **süzgeç değerlerini** değiştirebilir
  (tarih aralığı, müşteri, plaka, tutar eşiği); sütun/grup/renk yapısını değiştirmek için "Tasarla"ya
  döner.

### 4.2 Alanlar

| Alan | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Rapor adı | metin (80) | evet | Aynı kullanıcıda ikinci aynı ad → yeni sürüm önerilir | "Bu adda bir raporunuz var. Farklı bir ad yazın." |
| Kaynak (veri görünümü) | seçim | evet | Değiştirilince sütun seçimi sıfırlanır (onay istenir) | "Kaynağı değiştirirseniz sütun seçiminiz silinir." |
| Alan listesi | arama + liste | — | Her alanın etiketi, tipi ve "hassas" işareti görünür | — |
| Sütunlar | sıralı liste | en az 1 | Ekle/çıkar, yukarı-aşağı taşı, genişlik | "En az bir sütun seçmelisiniz." |
| Sütun başlığı | metin (60) | hayır | Boşsa alan etiketi kullanılır | "Başlık 60 karakteri geçemez." |
| Yazı tipi | seçim: Serif / Mono | hayır | Mono yalnız sayı/tarih alanlarında önerilir | — |
| Yazı boyutu | seçim: 9 / 10 / 11 / 12 / 14 | hayır | Excel ve PDF'te uygulanır | — |
| Biçim | seçim: para (2 kuruş) / tam sayı / ondalık / tarih / yüzde / metin | hayır | Alana göre öneri gelir | — |
| Hizalama | seçim: sol / sağ / orta | hayır | Sayı alanlarında varsayılan sağ | — |
| Hesaplanan sütun | ifade alanı | hayır | Yalnız sayısal alanlar ve `+ - * / ( )` ile; bkz. §5.4 | "Yalnız sayı alanları ve + - * / ( ) kullanılabilir." |
| Sıralama | sıralı liste (en fazla 3) | hayır | Alan + artan/azalan | — |
| Gruplama | seçim (en fazla 2 düzey) | hayır | Grup sütunu listenin başına geçer | — |
| Ara toplam | çoklu seçim: toplam / ortalama / en küçük / en büyük / sayı | hayır | Yalnız sayısal sütunlarda | "Bu sütunda ara toplam alınamaz." |
| Koşul kuralı | satır listesi | hayır | Alan · karşılaştırma (`>`, `<`, `>=`, `<=`, `=`, `!=`, `içerir`) · değer · renk | "Koşul değeri sayı olmalı." |
| Koşul kapsamı | seçim: hücre / satır | hayır | Satır seçilirse tüm satır zemin alır | — |
| Grafik | seçim: yok / sütun / yatay sütun / çizgi / alan / pasta / halka | hayır | X = ilk grup ya da ilk metin sütunu, Y = seçilen sayısal sütun | "Grafik için en az bir sayısal sütun gerekir." |
| Süzgeç alanları | çoklu seçim | hayır | Raporda kullanıcıya açık süzgeçler (tarih, müşteri, plaka, tutar aralığı) | — |
| Paylaşım | seçim: Özel / Ekip | hayır | "Ekip" seçilirse onaya düşer | "Paylaşılan rapor yönetici onayı bekler." |
| Önizleme | sanal tablo (ilk 100 satır) | — | Ayar değişince 400 ms sonra yenilenir | — |

### 4.3 Sürükle-bırak sütun seçici ve erişilebilirlik

Kullanıcı isteği "sürükle-bırak sütun seçici"dir. Uygulama **iki yolla** çalışır: (1) fare ile
sürükle-bırak (işaretçiyle), (2) **klavye ve düğmelerle** ekle/çıkar/yukarı/aşağı. İkinci yol
zorunludur: dokunmatik ekranda ve ekran okuyucuda sürükle-bırak güvenilir değildir
(`docs/plan/01-ORTAK-SARTNAME.md:82-85` erişilebilirlik kuralları). Ekran okuyucu için sütun
listesi `role="list"`, her satır `role="listitem"` ve taşıma düğmeleri "Yukarı taşı – Tutar" gibi
açık etiketlidir. Dokunma hedefi en az 44 px'dir.

Önizleme, seçili sütunların ilk 100 satırını gösterir; **toplamlar tüm süzgeç kümesi** üzerinden
hesaplanır (`client/src/lib/hooks.ts:35-38` deseni: süzgeç, sayfa ve sıralama ayrılır).
Kullanıcı sütun eklerken önizleme yeniden **sayfalanmaz**; yalnız sorgu tekrarlanır
(`keepPreviousData` deseni: `hooks.ts:30`).

## 5. İş kuralları

### 5.1 Genel

1. **Kaynak ve alan beyaz listesi.** Kullanıcı yalnız sistemin tanımladığı kaynağı seçer; yalnız o
   kaynağa kayıtlı alanları kullanır. Kaynak ve alan adları **sunucuda sabittir**; tanım
   geldiğinde bilinmeyen anahtar → `400` ve Türkçe mesaj ("Bilinmeyen alan: ...").
2. **Kaydetme kuralları.** Aynı kullanıcıda aynı ad iki kez olamaz (benzersizlik
   `UserId + Name`); kaynak boş olamaz; en az bir sütun zorunludur; grup düzeyi en fazla 2; sıralama
   anahtarı en fazla 3; koşul kuralı en fazla 10.
3. **Grup ve ara toplam mantığı.** GroupBy sütunları listenin başında gelir. Ara toplam satırı
   toplamları **yuvarlanmış satır değerlerinden** hesaplar (`23-RAPORLAMA-BI.md` §5.2 ile aynı
   kural); böylece alt toplamların toplamı genel toplama eşit olur.
4. **Hesaplanan sütun (sınırlı).** Yalnız **sayısal** alanlar, sayı sabitleri ve `+ - * / ( )`
   işleçleri. Metin, tarih, alt sorgu, fonksiyon çağrısı, nokta, `;`, `'`, `"`, `--`, `/*`
   **reddedilir**. Sonuç 2 kuruşa yuvarlanır. Sıfıra bölme → hücrede "—", rapor hatası değil.
5. **Koşullu biçimlendirme.** Kural sırası önemlidir; ilk eşleşen kural uygulanır. Renkler tema
   jetonlarından seçilir (`client/src/lib/chart.ts:6-15`): yeşil (olumlu), sarı (dikkat), kırmızı
   (olumsuz), gri (nötr). Renk **tek başına** anlam taşımaz; kural etiketi hücre ipucunda yazılır
   (renk körlüğü kuralı, `docs/plan/01-ORTAK-SARTNAME.md:84-85`).
6. **Grafik.** Yalnız sayısal ölçü kullanılır; en fazla 2 ölçü serisi; pasta/halka yalnız 12
   dilime kadar (fazlası "Diğer" altında toplanır). Grafiğin altında **her zaman** aynı veriyi
   gösteren tablo bulunur (erişilebilirlik ve yazdırma).
7. **Dışa aktarma.** Excel/PDF, ekrandaki süzgeç ve sıralamayla iner; satır tavanı 20.000
   (`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:11`). Başlık satırı kalın ve
   filtreli, ilk satır donmuş olur (`ExcelExporter.cs:46-51`, `:66-67`).
8. **Sürüm.** Raporda yapılan her kaydetme `ReportCustom.Version`'ı bir artırır; önceki sürüm
   saklanır (en fazla 10 sürüm). "Geri al" son sürüme döner.
9. **Silme.** Rapor **soft delete** (`IsDeleted`) ile silinir; paylaşılan raporda diğer kullanıcılar
   görmeye devam eder, sahibi "arşivlendi" görür. Fiziksel silme yoktur (`01-ORTAK-SARTNAME.md:22`).
10. **Ayna modu.** Tasarımcı ve kayıtlı rapor çalıştırma aynada çalışır (okuma); "Kaydet",
    "Paylaş", "Sil" düğmeleri `write` işaretlidir ve ayna modunda gizlenir
    (`client/src/components/Exports.tsx:8-11` deseni).
11. **Lisans.** Süre dolduğunda tasarımcı salt okunur olur: kayıtlı raporlar açılır, yeni tanım
    kaydedilemez.
12. **Ayna ve sütun tercihi.** Sütun tercihi sunucuda kullanıcı bazında tutulur
    (`ReportColumnPreference`, `23-RAPORLAMA-BI.md` §6) ve cihazdan bağımsız çalışır.

### 5.2 Güvenlik sınırı (bu modülün en kritik kuralı)

**Kullanıcı SQL yazamaz.** Uygulama bu sınırı altı katmanda tutar:

1. **Kaynak adı serbest metin değildir.** Tanımdaki `source` alanı, sunucudaki
   `ReportDataSource.Key` değerleriyle **birebir** eşleşmelidir; eşleşmezse istek reddedilir.
2. **Alan adı serbest metin değildir.** Tanımdaki her `field`, kaynağın alan sözlüğünde
   (`DataSourceField.Key`) bulunmalıdır. Kullanıcı `Trip.Customer.Title` gibi bir yol yazamaz;
   yalnız `customer` anahtarını seçer.
3. **İşleç kümesi sabittir.** Karşılaştırma `= != > >= < <= contains startsWith in`; mantık yalnız
   `and`/`or` (en fazla 10 kural). `like`, `raw`, `sql`, `exec` gibi anahtarlar şemada yoktur →
   doğrulayıcı reddeder.
4. **Hesaplanan sütun dili ayrıştırıcıdan geçer.** Kendi küçük ayrıştırıcısı (tokenizer + shunting
   yard) yalnız sayı, sayısal alan ve `+ - * / ( )` üretir; başka hiçbir token kabul edilmez.
   Ayrıştırıcı çıktısı **ifade ağacı**dır, metin birleştirme yoktur.
5. **Sorgu EF Core üzerinden kurulur.** Yorumlayıcı, ifade ağacını `IQueryable<T>` üzerine
   `Where`/`OrderBy`/`GroupBy` olarak uygular. Ham SQL (`FromSqlRaw`) **kullanılmaz**; yorumlayıcı
   içinde bu çağrılar yasaktır ve derleme zamanı denetimi (kod incelemesi + test) ile korunur.
6. **Satır düzeyi güvenlik.** Kaynak sorgusu kullanıcının rolüne ve (çok şirketli yapıda)
   `CompanyId`'sine göre **sunucuda** süzülür; kullanıcı bu süzgeci tanımdan kaldıramaz. Örnek:
   `Operations` rolü mali rapor kaynaklarını (`cari-hareket`, `yevmiye`) hiç göremez
   (`server/YesLojistik.Api/Auth/Policies.cs:15-17`).
7. **Satır tavanı ve zaman aşımı.** Her çalıştırma `MaxPageSize` (500) ve `ExportLimit` (20.000)
   ile sınırlıdır (`QueryExtensions.cs:9-11`, `:26`); sorgu zaman aşımı 10 saniyedir; aşımda
   Türkçe hata ("Rapor çok uzun sürdü; tarih aralığını daraltın.").
8. **Başlık metni.** Kullanıcı yalnız sütun **başlığını** serbest yazar (60 karakter). Başlık HTML
   olarak yorumlanmaz (React otomatik kaçırır) ve Excel'de hücre değeri olarak yazılır
   (`ExcelExporter.cs:46-47`).

## 6. Veri modeli

**Yalnız ekleme.** Yeni tablolar:

- `ReportDataSource` — beyaz listedeki veri görünümü. `Id`, `Key` (ör. `trips`), `Title`,
  `Description`, `RequiredPermission` (`accounting`/`operations`/`admin`), `GroupCount` (izin verilen
  grup düzeyi), `SortOrder`, `IsActive`, `FieldsJson` (alan sözlüğü: anahtar, etiket, tip, biçim
  önerisi, hassas mı, toplanabilir mi). Alan sözlüğü **veriden** okunur; kodda tek yerden üretilir.
- `ReportCustom` — kullanıcı raporu. `Id`, `UserId`, `Name`, `SourceKey`, `DefinitionJson`
  (sütunlar, sıralama, gruplama, koşullar, grafik, süzgeç şeridi), `Version`, `IsShared`,
  `ShareStatus` (`Private`/`Pending`/`Shared`), `LastRunAt`, `LastRowCount`, `IsDeleted`.
- `ReportCustomVersion` — sürüm geçmişi. `Id`, `ReportCustomId`, `Version`, `DefinitionJson`,
  `SavedAt`, `SavedByUserId`.
- `ReportShare` — paylaşım. `Id`, `ReportCustomId`, `UserId` (boş olabilir = tüm ekip),
  `Role` (`admin`/`accounting`/`operations`), `CanEdit`, `At`.
- `ReportColumnPreference` — kullanıcı sütun tercihi (`23-RAPORLAMA-BI.md` §6 ile **aynı tablo**;
  bu doküman onu da kullanır).

Mevcut tablolara eklenen alan **yoktur**. `AuditLog` alanları hazır
(`server/YesLojistik.Core/Entities/AuditLog.cs:4`); rapor kaydetme/paylaşma/silme olayları buraya
yazılır. `AppDbContext` içine DbSet ve indeksler eklenir (`AppDbContext.cs:10-43` deseni).

İndeksler: `ReportCustom(UserId, Name)` benzersiz (yalnız silinmemişler), `ReportCustom(SourceKey)`,
`ReportCustomVersion(ReportCustomId, Version)` benzersiz, `ReportShare(ReportCustomId, UserId)`.

`DefinitionJson` için **şema sürümü** tutulur (`"v": 1`); şema büyüdüğünde eski tanımlar
dönüştürülmeden çalışmaya devam eder (yalnız ekleme kuralı, `01-ORTAK-SARTNAME.md:22`).

### 6.1 Tanım JSON şeması (sürüm 1)

```json
{
  "v": 1,
  "source": "trips",
  "columns": [
    { "field": "loadingDate", "header": "Yükleme", "format": "date", "font": "mono", "size": 10, "align": "right", "width": 12 },
    { "field": "customer", "header": "Müşteri", "format": "text", "width": 28 },
    { "field": "salePrice", "header": "Satış", "format": "money", "aggregate": "sum" },
    { "expr": "salePrice - vehicleCost", "header": "Fark", "format": "money", "aggregate": "sum" }
  ],
  "sort": [ { "field": "loadingDate", "desc": true } ],
  "groups": [ { "field": "customer", "subtotals": ["sum", "count"] } ],
  "conditions": [
    { "field": "salePrice", "op": ">", "value": 10000, "scope": "row", "color": "bad" }
  ],
  "chart": { "type": "column", "x": "customer", "y": "salePrice" },
  "filters": ["from", "to", "customerId", "vehicleId"]
}
```

Bu şema dışındaki her anahtar (`sql`, `table`, `join`, `raw`, `function`) **reddedilir**. Doğrulayıcı
`server/YesLojistik.Infrastructure/Services/ReportDefinitionValidator.cs` içinde yaşar; yorumlayıcı
`ReportInterpreter.cs`; kaynak kayıtları `ReportDataSourceRegistry.cs`; uçlar
`server/YesLojistik.Api/Controllers/ReportDesignerController.cs`.

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/report-designer/sources` | — | `ReportDataSourceDto[]` (kullanıcının yetkisine göre) | giriş yapmış |
| GET | `/api/report-designer/sources/{key}/fields` | — | `DataSourceFieldDto[]` | kaynağa bağlı |
| POST | `/api/report-designer/preview` | `DefinitionJson` + `ReportQuery` | `PagedResult<Dictionary<string,object?>>` + `totals` + `groups` | kaynağa bağlı |
| GET | `/api/report-designer/reports` | `page,pageSize,search,source` | `PagedResult<ReportCustomDto>` | giriş yapmış (kendi + paylaşılan) |
| POST | `/api/report-designer/reports` | `name, sourceKey, definitionJson, isShared` | `ReportCustomDto` | giriş yapmış; `isShared` → onaya düşer |
| PUT | `/api/report-designer/reports/{id}` | `name, definitionJson, isShared` | `ReportCustomDto` (yeni sürüm) | sahibi ya da `CanEdit` |
| DELETE | `/api/report-designer/reports/{id}` | — | `204` | sahibi ya da admin |
| POST | `/api/report-designer/reports/{id}/duplicate` | `name` | `ReportCustomDto` | giriş yapmış |
| GET | `/api/report-designer/reports/{id}/versions` | — | `ReportCustomVersionDto[]` (en fazla 10) | sahibi ya da admin |
| POST | `/api/report-designer/reports/{id}/revert/{version}` | — | `ReportCustomDto` | sahibi ya da admin |
| GET | `/api/report-designer/reports/{id}/run` | `ReportQuery` | `PagedResult<...>` + `totals` | paylaşım/yetki |
| GET | `/api/report-designer/reports/{id}/export` | `ReportQuery` + `format=xlsx\|pdf\|csv` | dosya | paylaşım/yetki |
| POST | `/api/report-designer/reports/{id}/share` | `userId? , role?, canEdit` | `ReportShareDto[]` | sahibi |
| POST | `/api/report-designer/reports/{id}/approve` | `approve: true\|false` | `ReportCustomDto` | admin |
| GET/PUT | `/api/report-designer/preferences/{sourceKey}` | `columnsJson` | `ReportColumnPreferenceDto` | giriş yapmış |

`preview` ve `run` yanıtı **jenerik** satır döner (alan anahtarı → değer); istemci sütun başlığını
tanımdan yazar. Böylece kaynak başına DTO yazmak gerekmez.

Excel üretimi mevcut `ExcelExporter` üzerinden yapılır: her sütun için `ExcelColumn<Dictionary<string,object?>>`
(`ExcelExporter.cs:5`), biçim `MoneyFormat`/`DateFormat` (`:9-10`), alt toplam satırı
`ExportWithTotal` (`:16-20`) ya da `AddSheet(..., footer: ...)` (`:33`). PDF için
`StatementPdfGenerator` deseni (`server/YesLojistik.Api/Controllers/CustomersController.cs:86-99`).

## 8. Yetki, onay ve denetim izi

| İşlem | Admin | Accounting | Operations | Driver |
|---|---|---|---|---|
| Kaynak listesi (mali kaynaklar) | ✓ | ✓ | — | — |
| Kaynak listesi (operasyon kaynakları) | ✓ | ✓ | ✓ | — |
| Kendi raporunu tasarla/kaydet/sil | ✓ | ✓ | ✓ | — |
| Rapor çalıştır (paylaşılan) | ✓ | ✓ | ✓ (yalnız kendi yetkili kaynakları) | — |
| Ekip ile paylaşma **talebi** | ✓ | ✓ | ✓ | — |
| Paylaşım **onayı** (`/approve`) | ✓ | — | — | — |
| Başkasının raporunu düzenleme (`CanEdit`) | ✓ | sahibi verirse | sahibi verirse | — |
| Sürüm geçmişi görme | ✓ | kendi | kendi | — |
| Tüm rapor tanımlarını listeleme (denetim) | ✓ | — | — | — |

- **Onay akışı (maker-checker).** "Ekip" paylaşımı `Pending` durumuna düşer; admin onaylar
  (`07-YETKI-ONAY-NUMARALANDIRMA.md` deseni). Onaylanmadan rapor yalnız sahibine görünür.
- **Denetim izi.** Rapor kaydetme, sürüm, paylaşım, onay, silme ve **çalıştırma/dışa aktarma**
  `AuditLog` ve `ReportRunLog`'a yazılır (`23-RAPORLAMA-BI.md` §6). Kayıt: kullanıcı, rapor adı,
  kaynak, süzgeç özeti, satır sayısı, süre, biçim. Filtre metni kişisel veri içermez; `search`
  metni **saklanmaz**.
- **Satır düzeyi güvenlik.** Kullanıcı tanımından bağımsız olarak sunucu, kaynağın zorunlu
  süzgecini uygular (rol + `CompanyId`). Kullanıcı bu süzgeci tanımda göremez ve kaldıramaz; tanım
  kaydedilirken zorunlu süzgeçler şemaya otomatik eklenir.
- **Kötüye kullanım koruması.** Aynı kullanıcı için dakikada en fazla 60 `preview`/`run` isteği
  (mevcut hız sınırlama altyapısı kullanılır); aşımda Türkçe uyarı. Deneme yanılma ile şema
  zorlaması (`sql`, `raw`) 10 kez reddedilirse kullanıcı 15 dakika tasarımcıdan çıkarılır ve olay
  güvenlik günlüğüne yazılır (`38-GUVENLIK.md`).

## 9. Kabul kriterleri

1. Kullanıcı **kod yazmadan** 5 adımda rapor kurar: kaynak seç → sütun seç → grup/sıralama →
   koşul → kaydet. Toplam tık sayısı **≤ 12**.
2. Kaydedilen rapor, çıkış/giriş sonrası ve **başka cihazda** aynı görünür (sütun tercihi sunucuda).
3. **Güvenlik:** `sql`, `table`, `join`, `raw`, `function` anahtarları içeren tanım `400` döner;
   bilinmeyen alan anahtarı `400` döner; ham SQL hiçbir kod yolunda çalışmaz. Otomatik test:
   20 kötü niyetli tanımın **20'si** reddedilir.
4. **Satır düzeyi güvenlik:** `Operations` rolü `cari-hareket` kaynağını **hiç** göremez; görmeye
   çalışırsa `403`.
5. Hesaplanan sütun `+ - * / ( )` ile 4 işlemi destekler; sıfıra bölmede hücre "—" olur ve rapor
   hata vermez.
6. Koşullu biçimlendirme kuralı ekranda, Excel'de ve PDF'te aynı hücreyi işaretler; renk tek başına
   anlam taşımaz (ipucu metni vardır).
7. Gruplu raporda **alt toplamların toplamı genel toplama eşittir** (fark < 0,05 TL).
8. Grafik eklenmiş raporun altında aynı veriyi gösteren tablo bulunur; grafik yalnız başına
   gösterilemez.
9. 20.000 satırlık dönemde önizleme (ilk 100 satır) p95 **800 ms** altındadır; tam rapor p95 **1,5 s**
   altındadır.
10. 1440×900'de tasarımcıda üç kolon yan yana sığar ve önizlemede **≥8 satır** görünür; 390×844'te
    tek kolon akış olur, yatay kaydırma olmaz.
11. Sürükle-bırak **ve** klavye ile sütun ekleme/taşıma çalışır; ekran okuyucu sütun listesini
    düzgün okur.
12. Paylaşılan rapor admin onayı olmadan ekibe görünmez; onay `AuditLog`'a yazılır.
13. Yeni testler yeşildir: `ReportDefinitionValidatorTests`, `ReportInterpreterTests`,
    `ReportDesignerTests`, `client/e2e/report-designer.spec.ts`. Mevcut test silinmez/atlanmaz.

## 10. Testler

**Sunucu (birim) — güvenlik ağırlıklı.**
`server/YesLojistik.Tests/Unit/ReportDefinitionValidatorTests.cs` (yeni): bilinmeyen kaynak/alan
reddi; `sql`/`raw`/`table` anahtarlarının reddi; grup düzeyi > 2 reddi; 11. koşulun reddi; başlık
60 karakter sınırı; şema sürümü `v` yokluğunda varsayılan.
`server/YesLojistik.Tests/Unit/ReportExpressionTests.cs` (yeni): `+ - * / ( )` kabulü; `;`, `'`,
`--`, `/*`, nokta, harf fonksiyon adının reddi; sıfıra bölme; 2 kuruş yuvarlama.
`server/YesLojistik.Tests/Unit/ReportGroupingTests.cs` (yeni): ara toplamların toplamı = genel
toplam; boş grupta davranış; `HideZeroRows`.

**Sunucu (entegrasyon).**
`server/YesLojistik.Tests/Integration/ReportDesignerTests.cs` (yeni): kaynak listesinin role göre
süzülmesi; tasarla-kaydet-çalıştır akışı; sürüm artışı ve geri alma; paylaşım talebi → admin onayı →
görünürlük; silinen raporun listeden çıkması ama denetim kaydının kalması.
`server/YesLojistik.Tests/Integration/ReportDesignerSecurityTests.cs` (yeni): 20 kötü niyetli tanımın
reddi; `Operations` rolünün mali kaynağa `403`; satır düzeyi süzgecin tanımdan kaldırılamaması;
Excel çıktısında başlık metninin formül olarak yorumlanmaması (=, +, -, @ ile başlayan başlık
kaçışlanır).
`server/YesLojistik.Tests/Integration/ReportDesignerExportTests.cs` (yeni): Excel'de başlık biçimi,
donmuş satır, otomatik filtre, para/tarih biçimi (mevcut Excel doğrulama deseni:
`server/YesLojistik.Tests/Integration/ReportsAndExportsTests.cs:31-36`).

**Panel (e2e, Playwright).**
`client/e2e/report-designer.spec.ts` (yeni): tasarımcı açılır; kaynak seçilir; 3 sütun eklenir;
1 grup ve 1 koşul konur; önizlemede satır görünür; kaydedilir; listede görünür; Excel indirilir
(`page.waitForEvent('download')`); yeniden açıldığında ayarlar aynıdır.
`client/e2e/report-designer-a11y.spec.ts` (yeni): klavye ile sütun ekleme/taşıma; ekran okuyucu
adlarının varlığı; 44 px dokunma hedefi; 390×844'te yatay kaydırma yok.
Mevcut `client/e2e/new-ui/mobile-cards.spec.ts` ve `client/e2e/mobile.spec.ts` korunur; yeni görünüm
testleri `useNewUi(page)` ile yazılır (`client/e2e/helpers.ts:44-46`).

**Veri.** Testler uydurma veri kullanır (`01-ORTAK-SARTNAME.md` §1.3). Örnek: `ABC Nakliyat`,
`16 KZ 528`, `17.000,00 TL`.

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün | Not |
|---|---|---|
| Veri görünümü (data source) katmanı + alan sözlüğü | 6-8 | 6-8 kaynak; alan meta verisi elle yazılır |
| Tanım JSON şeması + doğrulayıcı | 3-4 | Güvenlik testleri buraya bağlı |
| Hesaplanan sütun ayrıştırıcısı ve ifade ağacı | 4-6 | Beyaz liste; test ağırlıklı |
| Yorumlayıcı (süzgeç + sıralama + grup + ara toplam) | 6-8 | `QueryExtensions` üstüne |
| Sorgu uçları (preview, run, export) | 4-5 | Excel/PDF mevcut |
| Tasarımcı ekranı (alan/sütun/ayar + önizleme) | 8-10 | En büyük istemci işi |
| Sürükle-bırak + klavye erişilebilirliği | 3-4 | İki yol birlikte |
| Koşullu biçimlendirme motoru (istemci + Excel) | 4-5 | Renk jetonları hazır |
| Grafik türü seçimi | 3-4 | `chart.ts` ve recharts mevcut |
| Kaydetme, sürüm, paylaşım, onay | 4-5 | Denetim izi dahil |
| Sütun tercihi (sunucu) | 2-3 | `ReportColumnPreference` |
| Testler (birim + entegrasyon + e2e) | 8-10 | Güvenlik testleri zorunlu |
| **Toplam** | **55-72** | — |

**Bağımlılık sırası:** (1) `23-RAPORLAMA-BI.md` (katalog, `ReportQuery`, toplam uçları; tasarımcı
bunların üstüne oturur), (2) `05-VERI-MODELI.md` (ortak alanlar, çok şirketli zemin),
(3) `07-YETKI-ONAY-NUMARALANDIRMA.md` (paylaşım onayı ve denetim izi deseni),
(4) `35-DENETIM-IZI-KVKK-UYUM.md` (log saklama), (5) `36-PERFORMANS-OLCEK.md` (önizleme SLA'sı).
Veri görünümleri **hazır rapor servisleriyle aynı hesabı** kullanmalıdır; aksi hâlde
`23-RAPORLAMA-BI.md` §5.10'daki tutarlılık kuralı bozulur.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Yorumlayıcıdan SQL enjeksiyonu | Kaynak/alan/işleç beyaz listesi; ham SQL yasağı; 20 kötü tanım testi | Tasarımcı kapatılır, hazır raporlar kalır |
| Hesaplanan sütun dili büyür, denetlenemez | Dil sabit: sayı + `+ - * / ( )` | Dil daraltılır; hesaplanan sütun kapatılır |
| Yorumlayıcı ile hazır rapor farklı sayı verir | Ortak hesap fonksiyonları; tutarlılık testi | Kaynak kapatılır |
| Kullanıcı 20.000 satırı aşan rapor kurar, sunucu kilitlenir | Satır tavanı + zaman aşımı + hız sınırı | Ağır rapor gece koşusuna alınır |
| Paylaşılan raporla veri sızıntısı (başka rolün gördüğü alan) | Alan bazlı yetki etiketi + satır düzeyi süzgeç | Paylaşım kapatılır |
| Excel'de başlık formül olarak yorumlanır | `= + - @` ile başlayan başlık kaçışlanır | Başlık serbestliği kaldırılır |
| Sürükle-bırak dokunmatikte çalışmaz | Klavye/düğme yolu zorunlu | Yalnız düğme yolu kalır |
| Tanım şeması büyür, eski raporlar bozulur | Şema sürümü (`v`) ve geriye dönük okuma | Eski sürüm salt okunur açılır |
| Sürüm geçmişi veritabanını şişirir | Kullanıcı başına en fazla 10 sürüm, FIFO silme (soft) | Sürüm geçmişi kapatılır |
| Kullanıcı raporu "her şeyi göster" diye kurar ve performans düşer | Önizleme sınırı 100 satır; varsayılan tarih aralığı "bu ay" | Varsayılan aralık zorunlu kılınır |

**doğrulanacak:** Luca'nın bağımsız rapor tasarımında seçilebilen yazı tipleri ve boyut aralığı —
kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da rapor paylaşımı ve yetki düzeyi —
kaynak: Luca kılavuzu. **doğrulanacak:** Luca'daki grafik türleri — kaynak: Luca demo.
**doğrulanacak:** Luca'da koşullu biçimlendirme var mı — kaynak: Luca demo. **doğrulanacak:**
kullanıcının hangi veri görünümlerini istediği (ilk sürümde hangi 6-8 kaynak açılacak) — kaynak:
kullanıcı. **doğrulanacak:** hesaplanan sütunda toplama/çıkarma dışında işlev (yüzde, kur çevirme)
istenip istenmediği — kaynak: kullanıcı. **doğrulanacak:** paylaşılan raporların onay makamı
(yönetici mi, mali müşavir mi) — kaynak: kullanıcı. **doğrulanacak:** sürüm geçmişinin saklama
süresi ve KVKK kapsamı — kaynak: avukat/KVKK. **doğrulanacak:** rapor tanımlarının şirketler arası
taşınabilirliği — kaynak: kullanıcı.

Sonraki belgeyle bağlantı: `23-RAPORLAMA-BI.md` bu modülün `ReportQuery`, `ReportDefinition` ve
dışa aktarma sözleşmesini sağlar; `07-YETKI-ONAY-NUMARALANDIRMA.md` paylaşım onayını,
`05-VERI-MODELI.md` veri görünümlerinin alanlarını, `36-PERFORMANS-OLCEK.md` önizleme SLA'sını
belirler.
