# 32 — Veri Göçü ve Excel/CSV Aktarımı

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, yeni bir müşterinin **eski programından gelen veriyi** kayıpsız, doğrulanabilir ve geri
dönülebilir biçimde çekirdeğe taşır. Bugün çalışan bir Excel/CSV aktarımı vardır: on iki varlık türü
için şablon üretilir, dosya **önce kontrol edilir** (`dryRun`), sonra aktarılır
(`client/src/components/ImportDialog.tsx:66-84`, `client/src/components/ImportWizard.tsx:37-55`).
Eksik olan kısım "göç" tarafıdır: kalıcı iş kaydı, geri alma, banka ekstresi ve yevmiye fişi aktarımı,
başka programların (Luca/Mikro/Logo) dosya biçimleri ve **pratikortam aynasından gelen verinin çekirdeğe
taşınması**. Kapsam:

- Mevcut on iki aktarım türünün **ortak bir çatıya** alınması (tek uç, tek rapor, tek kuyruk).
- **Şablon dosyaları ve sütun eşleme**: şablon indirme, alternatif başlık adları, kullanıcı tanımlı
  eşleme (alan eşleme ekranı).
- **Doğrulama ve hata raporu**: satır numaralı hata, uyarı ve "tekrar" durumu; CSV rapor indirme.
- **Önizleme + onaylı aktarım**: mevcut akış korunur, üstüne "ne değişecek" özeti eklenir.
- **Tekrar aktarım ve geri alma**: partinin (batch) kaydı, mükerrer tespiti, aktarımı geri alma.
- **Pratikortam aynasından çekirdeğe geçiş**: ayna kapanınca verinin çekirdek tablolara taşınması.
- **Başka programlardan geçiş**: Luca, Mikro, Logo dışa aktarımları için eşleme profilleri.
- **Büyük dosya performansı**: 5.000 satır sınırının arkasındaki tasarım ve parçalı aktarım.

Kapsam dışı: e-belge gönderimi (`08-E-BELGE-KATMANI.md`), muhasebe fişi üretimi (`06-MUHASEBE-MOTORU.md`),
banka ekstresi **eşleştirme ve mutabakat** kuralları (`15-BANKA-ENTEGRASYON.md`), şirket kurulumu
ekranları (`31-AYARLAR-SIRKET-KURULUMU.md`).

Bu modül şu üç soruyu net cevaplar: (1) Eski verinin tamamı geldi mi, gelmediyse hangi satır neden
gelmedi? (2) Yanlış aktarım olduysa nasıl geri alınır, veri bozulmadan? (3) Aynı dosyayı ikinci kez
yükleyince ne olur?

## 2. Luca'daki karşılığı

Luca Net'in tanıtım sayfasında **"Excel ile veri aktarımı"** açıkça listelenir ve sayılan türler
şunlardır: **cari kartlar, stok kartları, çek-senet tanımları, faturalar, yevmiye fişleri, banka
ekstreleri** (`docs/plan-erp/02-LUCA-ENVANTERI.md:28-29`). Aynı sayfada **"otomatik firma kurulumu"**
(`docs/plan-erp/02-LUCA-ENVANTERI.md:27`) ve cari kart girişinde **VKN/TCKN ile vergi dairesi + adres
otomatik sorgusu** (`docs/plan-erp/02-LUCA-ENVANTERI.md:34-35`) vardır.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

Bizim bugünkü listemiz Luca'nın listesiyle **örtüşmez**: Luca'da banka ekstresi, yevmiye fişi, stok
kartı ve çek-senet tanımı vardır; bizde yoktur. Tersine bizde sevkiyat, iş talebi, gider ve personel
aktarımı vardır; bunlar Luca'nın "Excel ile veri aktarımı" başlığında sayılmamıştır. Bu doküman iki
listeyi **birleştirir** ve eksik dört türü plana ekler.

**doğrulanacak:** Luca/Mikro/Logo programlarının dışa aktardığı dosyaların **gerçek biçimi**: dosya
türü (xlsx mi, csv mi, sabit genişlikli metin mi), kodlama (UTF-8 mi, Windows-1254 mü), ayraç (noktalı
virgül mü, virgül mü, sekme mi), başlık satırının yeri, tarih/sayı biçimi ve tutar işareti (borç/alacak
sütunları mı, tek işaretli tutar mı) — kaynak: bu programları kullanan müşteriden örnek dosya (müşteri
verisi depoya girmez; yalnız **sütun başlıkları ve biçim** alınır). **doğrulanacak:** Luca'da aktarım
sırasında mükerrer kayıt denetimi var mı, aynı dosyayı iki kez yükleyince ne oluyor — kaynak: Luca
kullanım kılavuzu veya bayi demosu. **doğrulanacak:** banka ekstresi aktarımında banka başına dosya
biçimleri (MT940, OFX, CSV) ve hangisinin istendiği — kaynak: müşterinin bankası ve
`docs/plan-erp/15-BANKA-ENTEGRASYON.md`. **doğrulanacak:** yevmiye fişi aktarımında hesap kodu
zorunluluğu ve hesap planı eşleşmesi — mali müşavir.

## 3. Bizde bugün

Aktarım **çalışıyor** ve üretimde kullanılıyor; eksik olan göç tarafıdır.

**Aktarım türleri.** On iki tür vardır: `suppliers`, `customers`, `drivers`, `vehicles`, `trips`,
`job-requests`, `invoices`, `payments`, `supplier-payments`, `expenses`, `cash-accounts`, `staff`
(`client/src/components/ImportDialog.tsx:8`, `server/YesLojistik.Infrastructure/Services/ImportService.cs:36-55`).
Genel sihirbazda ise dört temel tür gösterilir: müşteri, tedarikçi, araç, şoför
(`client/src/lib/importMeta.ts:20-29`).

**Akış (uçtan uca).** Üç adım vardır ve ekranda numaralı yazılıdır: 1) şablonu indirip doldurun,
2) dosyayı seçin, 3) kontrol edin ve aktarın (`client/src/components/ImportDialog.tsx:102-120`).
Şablon `GET /api/import/{entity}/template` ile iner
(`server/YesLojistik.Api/Controllers/ImportController.cs:28-33`), dosya
`POST /api/import/{entity}?dryRun=...` ile yüklenir (`client/src/components/ImportDialog.tsx:70`).
Önizleme kuralı ekranda açıkça yazar: **"Önce kontrol edilir; hatalı satır varsa hiçbir kayıt
aktarılmaz."** (`client/src/components/ImportDialog.tsx:118`). Sihirbaz sürümünde ek olarak
`skipInvalid=true` gönderilir ve yalnız geçerli satırlar aktarılır
(`client/src/components/ImportWizard.tsx:41`, `server/YesLojistik.Infrastructure/Services/ImportService.cs:334-338`).

**Kabul edilen dosyalar.** Basit pencere yalnız `.xlsx` kabul eder
(`client/src/components/ImportDialog.tsx:112`); sihirbaz `.xlsx` ve `.csv` kabul eder
(`client/src/components/ImportWizard.tsx:97`). Sunucu tarafı ikisini de okur: dosya `PK` ile başlıyorsa
xlsx, aksi hâlde CSV olarak çözülür (`server/YesLojistik.Infrastructure/Services/ImportService.cs:213-231`).
CSV kodlaması önce UTF-8, bozulursa Windows-1254 (`:233-241`), ayraç noktalı virgül/virgül/sekme
arasından en sık olanla seçilir (`:243-247`). Kütüphane **ClosedXML**'dir
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:2`).

**Sınırlar.** Tek dosyada en çok **5.000 satır** ve **5 MB**
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:30-31`); istemci de aynı 5 MB sınırını
kontrol eder ve aştığında Türkçe hata verir (`client/src/components/ImportWizard.tsx:10`, `:68-72`).
Uç tarafında istek boyutu sınırı ayrıca verilmiştir
(`server/YesLojistik.Api/Controllers/ImportController.cs:40`). Sınır aşılırsa kullanıcıya "dosyayı
ikiye bölün" denir (`:46-47`, `server/YesLojistik.Infrastructure/Services/ImportService.cs:286-288`).

**Şablon ve sütunlar.** Her tür için sütun listesi sabittir
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:38-55`), zorunlu sütunlar ayrı listededir
(`:58-72`), iki örnek satır ve "Açıklama" sayfası eklenir (`:135-185`). Tarih biçimi `gg.aa.yyyy`
(`:177`), önerilen aktarım sırası şablonda ve ekranda yazılıdır (`:179-180`,
`client/src/components/ImportDialog.tsx:108`). Başlık eşlemesi **alternatif adlarla** yapılır: örneğin
"Ünvan" yerine "Firma Adı", "Cari Ünvan", "Müşteri Adı" da kabul edilir
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:190-208`). Eksik zorunlu sütun varsa
istek hata verir: `"Başlık satırında zorunlu sütun eksik: ..."` (`:310-311`).

**Mükerrer kontrolü.** Kayıtlar anahtarına göre atlanır: tedarikçi/müşteri ünvan veya VKN
(`:414-418`, `:451-455`), araç plakası (`:498-502`), şoför ad soyad (`:536-540`), sevkiyat gün + müşteri
+ araç + teslim adresi + fiyat + açıklama (`:608-614`), fatura numarası (`:753-757`), tahsilat gün +
müşteri + tutar + açıklama (`server/YesLojistik.Infrastructure/Services/ImportService.cs:777-778`).
Aynı dosya içindeki tekrarlar da ayrıca yakalanır (`:350-355`).

**Hata raporu.** Her satırın durumu üçten biri olur: `ok`, `warning`, `error`, `duplicate`
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:14-15`, `:358-377`). Pencere hatalı satır
sayısını ve satır numaralarını gösterir (`client/src/components/ImportDialog.tsx:124-138`); sihirbaz
özet şerit çizer, sorunlu satırları süzer ve **CSV hata raporu indirir**
(`client/src/components/ImportWizard.tsx:125-131`, `:140-142`). Rapor UTF-8 BOM ve `;` ayraçla üretilir,
böylece Excel'de çift tıkla açılır (`client/src/lib/importMeta.ts:38-45`); veri tarayıcıdan **çıkmaz**.

**Yetki.** Tür bazlı yetki sunucudadır: müşteri, tedarikçi ve gider tüm ofise açıktır; fatura, tahsilat,
tedarikçi ödemesi, kasa hesabı ve personel muhasebe rollerine; kalan türler operasyon rollerine
açıktır (`server/YesLojistik.Api/Controllers/ImportController.cs:20-26`).

**Lisans kapısı.** Araç aktarımı paket sınırını kontrol eder; satır bazında sınır aşılırsa hata yazılır
ve satır **aktarılmaz** (`server/YesLojistik.Infrastructure/Services/ImportService.cs:476-508`). Sınır
mesajı tek yerden gelir (`server/YesLojistik.Infrastructure/Services/LicenseService.cs:40`).

**Yan etki yok (bilinçli).** Aktarılan geçmiş sevkiyatlarda bildirim gönderilmez, araç durumu değişmez;
zaman çizelgesine yalnız "Import" kaynaklı tek olay yazılır
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:560-563`, `:628`). Taşeron KDV'si 0 kalır
(`:625-626`). Eski faturaların numarası korunur, e-Fatura gönderilmez ve firma sayacı **değişmez**
(`:718-721`, `:753-757`).

**Deneme modu temizliği.** `dryRun` sırasında hiçbir şey yazılmaz; değişiklik izleyici temizlenir
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:334-338`). Aktarım sırasında toplu
silme/kayıt yoktur; tek `SaveChanges` çağrısı vardır (`:336`).

**Ekranlar.** Genel sayfa `/aktar` (Veri Aktarımı) dört türü sekmeli çip olarak sunar
(`client/src/pages/ImportPage.tsx:14-31`) ve ayna açıkken aktarımı kapatır (`:21-22`). Kurulum
sihirbazının 3. adımı aynı sihirbazı kullanır (`client/src/pages/OnboardingPage.tsx:224-240`).
Sayfa bazlı aktarım düğmeleri ilgili listelerdedir (`client/src/components/ImportDialog.tsx:49-57`).

**Aynadan gelen veri.** Pratikortam aynası günde dört kez çalışır
(`.github/workflows/mirror.yml:9-10`) ve veriyi **doğrudan panele** yazar; dönüştürme ve uygulama
`tools/legacy/mirror.py:2-9` içindedir, uygulamadan önce `--apply` yoksa **deneme** yapılır (`:7`) ve
eşik koruması vardır (`:9`). Yani aynadan gelen veri bugün **çekirdeğe taşınmaz**; panelin kendi
tablolarına yazılır ve ayna kapanınca kayıt girişi açılır (`AGENTS.md` §5).

**Eksik listesi (kanıtlı):** kalıcı aktarım/parti kaydı yok (repoda `ImportBatch`/`ImportJob` terimi
geçmez); **geri alma yok** (aktarılan kaydı toplu geri alan bir uç yoktur; `ImportController.cs:28-53`
içinde yalnız şablon ve aktarım uçları vardır); banka ekstresi, yevmiye fişi, stok kartı ve çek-senet
tanımı aktarımı **yoktur** (`server/YesLojistik.Infrastructure/Services/ImportService.cs:36-55`);
sütun eşleme ekranı yoktur (yalnız sabit alternatif ad listesi: `:190-208`); büyük dosya için parçalı
aktarım yoktur (`:286-288` yalnız "bölün" der); aktarım sırasında ilerleme göstergesi yoktur
(tek HTTP isteği: `client/src/components/ImportWizard.tsx:41`); "devir mutabakatı" yani aktarım sonrası
eski programla bakiye karşılaştırması yoktur (bugünkü taşınma kontrolü **sunucu** karşılaştırır:
`client/src/pages/SettingsPage.tsx:623-676`).

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md` §3 ortak parçalarını kullanır: `PageHeader`, `Card`,
`Field`, `Chip`, `Badge`, `Button`, `Modal`, `Figures` (`client/src/components/ui.tsx`), `DataTable`
(`client/src/components/DataTable.tsx:66`), `MobileCards` (`client/src/components/shell/MobileCards.tsx`),
`PageShell` (`client/src/components/shell/PageShell.tsx:28`). Liste standardı: `FilterBar` + `DataTable`
/ `MobileCards` + sayfalama + `Empty`/`ErrorState`/`TableSkeleton`.
Klasik görünüm varsayılan kalır (`client/src/lib/uiMode.ts:8`).

### 4.1 Ekran: Veri Aktarımı (`/aktar`) — mevcut, genişletilir

Bugünkü dört sekme (`client/src/pages/ImportPage.tsx:25-30`) on iki türe çıkar ve **gruplanır**:

| Grup | Türler | Sıra |
|---|---|---|
| Kartlar | Tedarikçiler, Müşteriler | 1-2 |
| Kaynaklar | Şoförler, Araçlar, Personel | 3-5 |
| Belgeler | Faturalar, İş talepleri, Sevkiyatlar, Tahsilatlar, Tedarikçi ödemeleri, Giderler | 6-11 |
| Finans | Kasa/banka hesapları, **Banka ekstresi**, **Yevmiye fişi**, **Çek/senet tanımı**, **Stok kartı** | 12-16 |

Ek alanlar:

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Aktarım profili | seçim | Hayır | `Şablon`, `Luca`, `Mikro`, `Logo`, `Özel` |
| Dosya | dosya (.xlsx/.csv) | Evet | Bugünkü 5 MB kuralı; üstünde parçalı aktarım önerilir |
| Sütun eşlemesi | tablo | Hayır | Profil boşsa açılır; başlık → alan eşlemesi |
| Çalışma modu | seçim | Evet | `Kontrol` (varsayılan) / `Aktar` |
| Hatalı satırlar | seçim | Evet | `Durdur` (bugünkü) / `Atla ve devam` (bugünkü `skipInvalid`) |
| Mükerrerler | seçim | Evet | `Atla` (bugünkü) / `Güncelle` (yeni) |

### 4.2 Ekran: Aktarım Önizlemesi (aynı sayfa, 3. adım)

Bugünkü sihirbazın özet şeridi korunur (`client/src/components/ImportWizard.tsx:125-131`) ve üstüne
şunlar eklenir:

| Alan | Tip | Davranış |
|---|---|---|
| Toplam / Aktarılacak / Uyarılı / Hatalı / Tekrar | sayı | Bugünkü `Figures` bloğu aynen |
| Güncellenecek | sayı | Yeni: profil + `Güncelle` modunda değişecek satır sayısı |
| Bakiye etkisi | para | Yeni: "müşteri alacakları +X, taşeron borçları +Y" |
| Açılış kilit tarihi | tarih | Yeni: aktarımın yazılacağı dönem; kilitliyse uyarı |
| Örnek satırlar | tablo | Bugünkü satır tablosu (satır no, durum, kayıt, açıklama) |

### 4.3 Ekran: Aktarım Geçmişi (`/aktar?sekme=gecmis`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Parti no | metin | Ör. `IMP-20261006-01` |
| Tarih / kullanıcı | tarih + metin | Kim yükledi |
| Tür | metin | Varlık türü |
| Dosya adı | metin | Yalnız ad; **içerik saklanmaz** |
| Sonuç | sayaç | Eklenen / atlanan / hatalı / güncellenen |
| Durum | rozet | `Uygulandı`, `Geri alındı`, `Kısmi` |
| İşlemler | düğme | "Hata raporunu indir", "Geri al" (yalnız uygulanmış ve mükerrer etkilenmemişse) |

### 4.4 Ekran: Geri Alma Onayı (Modal)

Kaydetmeden kapatma koruması ve Ctrl+Enter davranışı bugünkü `Modal` kuralına uyar
(`client/src/components/ui.tsx:156`). Alanlar: etkilenecek kayıt sayısı (salt okunur), gerekçe (metin,
zorunlu, 300 karakter), "Bu partide üretilmiş N belge/bakiye silinecek" uyarısı ve **`GERİ AL`** yazma
kutusu. Kural: aktarımdan sonra o kayıtlara **bağlı** yeni kayıt üretildiyse (ör. faturalandırılmış
aktarılmış sevkiyat) geri alma **reddedilir**; hangi kaydın engellediği listelenir.

### 4.5 Ekran: Sütun Eşleme (`/aktar/esleme`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Profil adı | metin | Kaydedilir; müşteri başına birden çok profil |
| Kaynak dosya başlıkları | tablo | Dosyadan okunur, salt okunur |
| Hedef alan | seçim | Türün alan listesi (bugünkü `Columns` sözlüğü: `ImportService.cs:36-55`) |
| Zorunlu mu | rozet | Bugünkü `Required` listesinden (`ImportService.cs:58-72`) |
| Örnek değer | metin | Dosyanın ilk üç satırından |
| Kaydet | düğme | Eşleme profili olarak saklanır; sonraki aktarımda otomatik seçilir |

### 4.6 Ekran: Pratikortam Geçişi (`/aktar?sekme=pratikortam`) — yeni

Yalnız ayna açık olan kurulumda görünür.

| Alan | Tip | Davranış |
|---|---|---|
| Ayna durumu | rozet | Bugünkü kart bilgisi (`client/src/pages/SettingsPage.tsx:403-408`) |
| Aktarılacak türler | çoklu seçim | Müşteri, tedarikçi, araç, şoför, sevkiyat, gider |
| Devir tarihi | tarih | Aynadan çekirdeğe geçiş günü |
| Önizleme | tablo | Tür, kayıt sayısı, bakiye toplamı |
| Geçişi başlat | düğme | Ayna kapanmadan çalışmaz; çift onay ister |

## 5. İş kuralları

1. **Önce kontrol, sonra yazma.** Hiçbir aktarım doğrudan yazmaz; `dryRun` zorunludur
   (bugünkü davranış: `client/src/components/ImportDialog.tsx:98-100`). Sihirbazda dosya seçilir
   seçilmez kontrol başlar (`client/src/components/ImportWizard.tsx:64-76`).
2. **Yarım aktarım olmaz.** Hatalı satır varsa `Durdur` modunda hiçbir satır yazılmaz; tek
   `SaveChanges` çağrısı vardır (`server/YesLojistik.Infrastructure/Services/ImportService.cs:334-338`).
   `Atla ve devam` modu yalnız satır başına bağımsız türlerde açıktır: müşteri, tedarikçi, araç, şoför
   (`:32-33`).
3. **Mükerrer atlanır, güncellenmez (varsayılan).** Bugünkü davranış korunur; güncelleme modu
   **açıkça** seçilir ve yalnız boş alanları doldurur, dolu alanı **ezmez**. Gerekçe: eski programdaki
   hatalı bir değerin paneldeki doğru değeri bozması kabul edilemez.
4. **Zorunlu alan boşsa satır hatalıdır.** Doğrulama mevcut sunucu doğrulayıcılarıyla yapılır
   (`server/YesLojistik.Infrastructure/Services/ImportService.cs:26-29`); istemci kendi kuralını
   **yazmaz**, sunucunun mesajını gösterir.
5. **Sıra kuralı.** İlişkili kayıtlar önce gelmelidir: tedarikçi → müşteri → şoför → araç → sevkiyat.
   Bugünkü akış bulunamayan kaydı hata olarak yazar ve ne yapılacağını söyler
   (`server/YesLojistik.Infrastructure/Services/ImportService.cs:382-388`). Ekranlarda sıra uyarısı
   korunur (`client/src/components/ImportDialog.tsx:108`).
6. **Aktarım sessizdir.** Bildirim, e-posta, SMS ve e-belge gönderilmez
   (`server/YesLojistik.Infrastructure/Services/ImportService.cs:560-563`). Bu kural geri alma
   dâhil değişmez.
7. **Numara ve sayaç dokunulmaz.** Aktarılan eski fatura numarası korunur, firma sayacı artmaz
   (`server/YesLojistik.Infrastructure/Services/ImportService.cs:718-721`). Sayaç yalnız
   `31-AYARLAR-SIRKET-KURULUMU.md`'deki seri ayarıyla ilerletilir.
8. **Lisans sınırı aktarımı keser.** Araç sınırı dolarsa satır hata olur
   (`server/YesLojistik.Infrastructure/Services/ImportService.cs:504-508`); kullanıcı sınırı
   (`34-LISANS-ABONELIK-KONTOR.md`) personel ve kullanıcı aktarımında uygulanır.
9. **Ayna ve göç çakışmaz.** Ayna açıkken genel aktarım sayfası kapalıdır
   (`client/src/pages/ImportPage.tsx:21-22`); aynadan çekirdeğe geçiş **ayna kapatıldıktan sonra** ve
   devir tarihiyle yapılır. Gerekçe: aksi hâlde iki kaynak aynı cariyi iki kez yazar.
10. **Geri alma yalnız "temiz" partide çalışır.** Partiden sonra o kayıtlara bağlı yeni kayıt
    üretildiyse (fatura, tahsilat, gider, sevkiyat) geri alma reddedilir. Bağlı kayıt yoksa partide
    üretilen satırlar silinmez, **pasife alınır** (bugünkü ayna felsefesiyle aynı:
    `client/src/pages/SettingsPage.tsx:428`); böylece geri alma da geri alınabilir.
11. **Kısmi başarı raporlanır.** `Atla ve devam` modunda parti `Kısmi` durumuyla kaydedilir ve hangi
    satırların atlandığı parti kaydında saklanır.
12. **Dosya içeriği saklanmaz.** Yalnız dosya **adı**, boyutu ve satır sayısı saklanır. Gerekçe: müşteri
    verisi gereksiz yere ikinci kez depolanmaz (KVKK, `35-DENETIM-IZI-KVKK-UYUM.md`).
13. **Büyük dosya parçalanır.** 5.000 satır / 5 MB sınırı korunur; üstünde kullanıcıya tür bazlı
    bölme önerilir (`server/YesLojistik.Infrastructure/Services/ImportService.cs:286-288`). Hedefte
    parçalar **arka plan işi** olarak sırayla işlenir (`BackgroundJob`, `docs/plan-erp/05-VERI-MODELI.md:433-438`).
14. **Devir mutabakatı zorunlu adımdır.** Aktarım tamamlandığında ekran, eklenen satır sayısını ve
    bakiye toplamını gösterir; kullanıcı "eski programla aynı" onayını vermeden kurulum sihirbazındaki
    veri adımı **tamamlanmış sayılmaz** (`31-AYARLAR-SIRKET-KURULUMU.md` §4.9).
15. **Yetki ve lisans kapısı.** Her aktarım isteği yetki (`ImportController.cs:20-26`), ayna
    (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs`) ve lisans
    (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:18-20`) kapılarından geçer.

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. Aşağıdaki üç tablo
bu modüle özgüdür; geri kalan bağlar mevcut tablolara **boş olabilen** sütun ekler.

### 6.1 Yeni tablo: `ImportBatch`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | Tek şirkette boş |
| `Code` | string(20) | `IMP-20261006-01`; tekil |
| `Entity` | string(30) | Bugünkü `ImportService.Columns` anahtarı |
| `FileName` | string(200) | Yalnız ad; içerik saklanmaz |
| `FileBytes` | long | |
| `TotalRows` | int | |
| `Created` | int | |
| `Skipped` | int | |
| `Updated` | int | Güncelleme modunda |
| `Failed` | int | |
| `Mode` | string(10) | `DryRun` / `Stop` / `SkipInvalid` |
| `DuplicatePolicy` | string(10) | `Skip` / `Update` |
| `Status` | string(12) | `Applied`, `Partial`, `Reverted`, `Failed` |
| `UserId` / `UserName` | int? / string(80) | Kim yükledi |
| `StartedAt` / `FinishedAt` | DateTime | |
| `RevertedAt` / `RevertedBy` | DateTime? / string(80) | |
| `RevertReason` | string(300)? | |
| `ProfileId` | int? | Kullanılan eşleme profili |

Tekil indeks: `(CompanyId, Code)`. İndeks: `(CompanyId, Entity, StartedAt)`.

### 6.2 Yeni tablo: `ImportBatchRow`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `BatchId` | int, FK | `ImportBatch` |
| `RowNumber` | int | Dosyadaki satır |
| `Status` | string(12) | `ok`, `warning`, `error`, `duplicate`, `updated` |
| `Label` | string(120)? | Kayıt etiketi (ünvan/plaka) |
| `Message` | string(400)? | Türkçe açıklama |
| `EntityId` | int? | Üretilen/güncellenen kaydın kimliği |

İndeks: `(BatchId, RowNumber)`. Amaç: hata raporu **kalıcı** olsun; bugün rapor yalnız tarayıcıda
üretilir (`client/src/lib/importMeta.ts:38-45`).

### 6.3 Yeni tablo: `ImportProfile`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `Name` | string(60) | `Luca cari`, `Mikro stok` … |
| `Entity` | string(30) | |
| `SourceKind` | string(12) | `Generic`, `Luca`, `Mikro`, `Logo`, `Custom` |
| `MappingJson` | string | `{"Ünvan":"Title", ...}` |
| `IsActive` | bool | |

Tekil indeks: `(CompanyId, Entity, Name)`.

### 6.4 Mevcut tablolara eklenecek sütunlar

| Tablo | Sütun | Tip | Not |
|---|---|---|---|
| `CompanySettings` | `MigrationDevirDate` | DateOnly? | Aynadan çekirdeğe geçiş günü |
| `CompanySettings` | `MigrationApprovedAt` | DateTime? | Devir mutabakatı onayı |
| `Invoice` | `ImportBatchId` | int? | Parti bağı; geri alma kararı için |
| `Trip` | `ImportBatchId` | int? | Aynı |
| `Payment` | `ImportBatchId` | int? | Aynı |
| `Expense` | `ImportBatchId` | int? | Aynı |
| `Customer` / `Supplier` / `Vehicle` / `Driver` | `ImportBatchId` | int? | Kart partileri |

Gerekçe: `ImportBatchId` boş olan kayıtlar elle girilmiş demektir; geri alma **yalnız** dolu olanları
hedeflar. Bu, mevcut veriyi hiç etkilemeyen bir eklemedir.

### 6.5 Yeni aktarım türleri için hedef tablolar

| Yeni tür | Hedef | Kaynak |
|---|---|---|
| Banka ekstresi | `BankStatement` / `BankStatementLine` (`05-VERI-MODELI.md:473`) | `15-BANKA-ENTEGRASYON.md` |
| Yevmiye fişi | `JournalEntry` / `JournalLine` (`05-VERI-MODELI.md:201-217`) | `06-MUHASEBE-MOTORU.md` |
| Çek/senet tanımı | `Cheque` / `Note` (`05-VERI-MODELI.md:335-345`) | `16-CEK-SENET.md` |
| Stok kartı | `StockItem` / `StockUnit` (`05-VERI-MODELI.md:282-296`) | `10-STOK-VE-DEPO.md` |

Bu dört tür, hedef tablolar hazır olmadan **açılmaz**; ekranda "yakında" olarak görünmez, hiç
listelenmez. Gerekçe: yarım tür, kullanıcıyı sessiz veri kaybına götürür.

## 7. API uçları

Mevcut uçlar korunur: `GET /api/import/{entity}/template`
(`server/YesLojistik.Api/Controllers/ImportController.cs:28-33`) ve `POST /api/import/{entity}`
(`:39-53`). Yeni uçlar:

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/import/entities` | — | Tür listesi + zorunlu alanlar + sıra | Giriş yapmış |
| POST | `/api/import/{entity}/analyze` | dosya | `{totalRows, ready, warning, error, duplicate, columns[], unmapped[]}` | Bugünkü tür yetkisi |
| POST | `/api/import/{entity}/apply` | dosya + `batchCode?` | `ImportBatchDto` | Aynı |
| GET | `/api/import/batches` | `?entity=&page=` | Parti listesi | `Accounting`, `Operations` |
| GET | `/api/import/batches/{id}` | — | Parti + satır durumları | Aynı |
| GET | `/api/import/batches/{id}/report` | `?format=csv` | Hata raporu dosyası | Aynı |
| POST | `/api/import/batches/{id}/revert` | `{reason, confirm}` | Güncel parti | `Admin` |
| GET | `/api/import/profiles` | `?entity=` | Profil listesi | `Accounting`, `Operations` |
| POST | `/api/import/profiles` | `{name, entity, sourceKind, mapping}` | Profil | `Admin` |
| PUT | `/api/import/profiles/{id}` | Aynı gövde | Profil | `Admin` |
| DELETE | `/api/import/profiles/{id}` | — | 204 | `Admin` |
| POST | `/api/import/mirror-adopt` | `{entities[], devirDate, confirm}` | `BackgroundJob` kimliği | `Admin` |
| GET | `/api/import/jobs/{jobId}` | — | İş durumu | `Admin` |

Kurallar: (a) `analyze` **hiçbir şey yazmaz**; (b) `apply` aynı dosyayı yeniden analiz eder ve analiz
sonucu ile **birebir** aynı satır kümesini işler (zaman aşımı koruması: dosyanın SHA-256 özeti istekte
taşınır); (c) `revert` gerekçe zorunludur ve `AuditLog`'a `ImportReverted` yazar; (d) uzun süren
işler `BackgroundJob` üzerinden yürür ve `GET /api/import/jobs/{jobId}` ile izlenir; (e) liste uçları
sayfalanır; (f) hata gövdesi sade Türkçe `ProblemDetails`.

## 8. Yetki, onay ve denetim izi

### 8.1 Rol matrisi

| İşlem | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Şablon indirme | ✅ | ✅ | ✅ | ❌ |
| Kart aktarımı (müşteri/tedarikçi) | ✅ | ✅ | ✅ | ❌ |
| Kaynak aktarımı (araç/şoför/personel) | ✅ | ❌ | ✅ | ❌ |
| Belge aktarımı (fatura/tahsilat/ödeme/gider) | ✅ | ✅ | ❌ | ❌ |
| Sevkiyat ve iş talebi aktarımı | ✅ | ❌ | ✅ | ❌ |
| Banka ekstresi / yevmiye fişi aktarımı | ✅ | ✅ | ❌ | ❌ |
| Parti geçmişini görme | ✅ | ✅ | ✅ (kendi türleri) | ❌ |
| **Geri alma** | ✅ | ❌ | ❌ | ❌ |
| Eşleme profili oluşturma | ✅ | ❌ | ❌ | ❌ |
| Aynadan çekirdeğe geçiş | ✅ | ❌ | ❌ | ❌ |

### 8.2 Onay (maker-checker)

| İşlem | Onay | Kim | Bugünkü durum |
|---|---|---|---|
| Parti aktarımı | Yok (kontrol + onay kutusu yeter) | — | Var (iki adımlı akış) |
| **Geri alma** | Var | Yönetici + gerekçe + `GERİ AL` yazısı | **Yok** |
| Aynadan çekirdeğe geçiş | Var (çift onay) | Yönetici | **Yok** |
| Eşleme profilini silme | Yok | — | **Yok** |
| 5.000 satır üstü parçalı aktarım | Var (parça listesi onaylanır) | Yönetici | **Yok** |

### 8.3 Denetim izi

Yeni olaylar `AuditLog`'a `Action` alanıyla yazılır: `ImportAnalyzed`, `ImportApplied`,
`ImportReverted`, `ImportProfileChanged`, `MirrorAdoptStarted`, `MirrorAdoptFinished`. Bugünkü otomatik
veri izleme korunur (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`).
**Dikkat:** `ImportBatch` ve `ImportBatchRow` tabloları `BaseEntity` türevi **yapılmaz** (sayaç gibi
davranırlar); izlenmeleri gereken şey **karar**dir, her satır değildir. Gerekçe: 5.000 satırlık bir
aktarım 5.000 denetim satırı üretirse iz okunamaz hâle gelir.

## 9. Kabul kriterleri

1. `/aktar` sayfasında on altı tür gruplanmış görünür; hedef tablosu hazır olmayan türler listelenmez.
2. Bir dosya seçildiğinde **hiçbir kayıt yazılmadan** özet gelir: toplam, aktarılacak, uyarılı, hatalı,
   tekrar ve güncellenecek satır sayıları ile bakiye etkisi.
3. Hatalı satır varken `Durdur` modunda "Aktar" çağrısı **hiçbir** satır oluşturmaz (test edilir).
4. `Atla ve devam` modu yalnız dört satır-bağımsız türde kabul edilir; diğer türlerde istek reddedilir.
5. Aynı dosya iki kez aktarıldığında ikinci çalıştırma **0 yeni kayıt** ekler ve "tekrar" satırlarını
   raporlar (bugünkü davranış korunur: `server/YesLojistik.Infrastructure/Services/ImportService.cs:414-418`).
6. Hata raporu indirildiğinde dosya Excel'de **bozulmadan** açılır (UTF-8 BOM ve `;` ayraç).
7. Hata raporu sunucudan da inilebilir; parti kaydı kapatılıp yeniden açıldığında rapor aynıdır.
8. Aktarım geçmişi ekranı parti no, tarih, kullanıcı, tür ve sonuç sayaçlarını gösterir.
9. **Geri alma**: temiz bir partide çalışır, satırları pasife alır, parti durumu `Geri alındı` olur ve
   `AuditLog`'da `ImportReverted` satırı görünür.
10. Bağlı kaydı olan partide geri alma **reddedilir** ve engelleyen kayıtlar listelenir.
11. Aktarılan bir kayıt geri alındıktan sonra aynı dosya yeniden yüklenip aktarılabilir.
12. Araç sınırı doluyken taşıt aktarımı satır hatası üretir; hata metni paketi yükseltme yolunu söyler.
13. Aktarım sırasında **hiçbir** e-posta/SMS/e-belge gönderilmez (mevcut test korunur).
14. Aktarılan eski fatura numarası korunur ve firma sayacı değişmez.
15. 5 MB üstü dosya net Türkçe mesajla reddedilir; 5.000 satır üstü dosya "bölün" mesajı alır (mevcut
    davranış: `server/YesLojistik.Infrastructure/Services/ImportService.cs:286-288`).
16. Sütun eşleme profili kaydedilir; aynı dosya ikinci kez yüklendiğinde eşleme **elle yapılmaz**.
17. Ayna açıkken `/aktar` sayfası aktarımı reddeder ve pratikortam'a yönlendirir (bugünkü davranış:
    `client/src/pages/ImportPage.tsx:21-22`).
18. Aynadan çekirdeğe geçiş yalnız ayna kapalıyken çalışır; devir tarihi kilitli döneme düşerse
    reddedilir.
19. Klasik görünüm varsayılan kalır; yeni ekranlar **iki görünümde de** çalışır.
20. `docs/plan-erp/01-ORTAK-SARTNAME.md` §4 referans denetimi bu doküman için **0 kırık referans** verir;
    mevcut testlerin hiçbiri silinmez veya atlanmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `ImportMappingTests.cs`
- Alternatif başlık adları çözülür (bugünkü `Aliases` sözlüğü: `ImportService.cs:190-208`).
- Zorunlu sütun eksikse hata metni sütun adlarını içerir.
- CSV ayraç seçimi (noktalı virgül / virgül / sekme) ve Windows-1254 çözümü doğru çalışır.
- Sayı alanı metin olarak yazıldığında baştaki sıfırlar korunur (VKN, telefon).

Yeni dosya: `ImportBatchTests.cs`
- Parti no üretimi tekil; ikinci parti farklı kod alır.
- `Revert` gerekçesiz çağrılırsa reddedilir.
- Satır durumu eşlemesi: hata > tekrar > uyarı > tamam sırası korunur.

Yeni dosya: `ImportProfileTests.cs`
- Aynı adla ikinci profil eklenemez.
- Profil silinince parti kaydı bozulmaz (`ProfileId` boş kalır).

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `ImportBatchApiTests.cs` (`server/YesLojistik.Tests/Integration/ApiFactory.cs` deseniyle)
- `analyze` sonrası veritabanı sayımı **değişmez** (kanıt: `GET /api/admin/stats` iki kez okunur).
- `apply` sonrası parti kaydı ve satır kayıtları oluşur.
- `Ops` rolü fatura aktarımında **403**, müşteri aktarımında 200 alır.
- `revert` sonrası kayıtlar pasife düşer ve liste sayımı azalır.
- Bağlı fatura varsa `revert` 400/`DomainException` döner.

Mevcut testler korunur ve genişletilir:
`server/YesLojistik.Tests/Integration/ImportTests.cs`,
`server/YesLojistik.Tests/Integration/ImportWizardTests.cs`,
`server/YesLojistik.Tests/Integration/LegacyImportTests.cs`,
`server/YesLojistik.Tests/Integration/LegacyMirrorTests.cs`,
`server/YesLojistik.Tests/Integration/VatRulesTests.cs` (aktarılan sevkiyatta taşeron KDV'si 0 kuralı:
`server/YesLojistik.Tests/Integration/VatRulesTests.cs:48`).

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `import-batches.spec.ts`
- CSV yükle → özet görünür → aktar → parti geçmişinde görünür → geri al → kayıt pasif.
- Bağlı kaydı olan partide geri alma düğmesi **pasif** ve nedeni yazılı.

Yeni dosya: `import-mapping.spec.ts`
- Luca biçimli başlıklarla dosya yükle → eşleme ekranı açılır → profil kaydet → ikinci yüklemede
  eşleme sorulmaz.

Mevcut `client/e2e/import.spec.ts:5` ve `client/e2e/import.spec.ts:22` testleri yeni özet alanlarını
kapsayacak biçimde genişletilir; `client/e2e/onboarding.spec.ts:57` (sihirbaz aktarım akışı) ve
`client/e2e/onboarding.spec.ts:104` (büyük dosya reddi) korunur.

### 10.4 Yeni görünüm testi

`client/e2e/new-ui/` altına `import-summary.spec.ts`: yeni görünümde `/aktar` açılır, özet şeridi ve
sorunlu satır süzgeci çalışır, telefonda kart görünümüne düşer (yardımcı: `client/e2e/helpers.ts:44-46`).

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `ImportBatch` + `ImportBatchRow` + migration | 2 | — |
| 2 | `analyze` / `apply` uçlarının ayrılması (SHA-256 koruması) | 3 | 1 |
| 3 | Parti geçmişi ekranı | 2,5 | 1 |
| 4 | Geri alma servisi + onay modalı | 3 | 1 |
| 5 | `ImportProfile` + sütun eşleme ekranı | 4 | 1 |
| 6 | Luca/Mikro/Logo eşleme profilleri | 3 | 5 |
| 7 | Banka ekstresi aktarımı | 4 | `15-BANKA-ENTEGRASYON.md` |
| 8 | Yevmiye fişi aktarımı | 4 | `06-MUHASEBE-MOTORU.md` |
| 9 | Çek/senet ve stok kartı aktarımı | 3 | `16-CEK-SENET.md`, `10-STOK-VE-DEPO.md` |
| 10 | Parçalı/arka plan aktarımı (`BackgroundJob`) | 4 | `05-VERI-MODELI.md` |
| 11 | Aynadan çekirdeğe geçiş aracı | 5 | `31-AYARLAR-SIRKET-KURULUMU.md`, `30-COK-SIRKETLI-KONSOLIDASYON.md` |
| 12 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam** | | **~42,5 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (yeni tablolar ve hedef tablolar),
`31-AYARLAR-SIRKET-KURULUMU.md` (devir tarihi ve mali dönem), `07-YETKI-ONAY-NUMARALANDIRMA.md`
(yetki matrisi ve denetim olayları).

**Bu dokümanı bekleyenler:** `15-BANKA-ENTEGRASYON.md` (ekstre aktarımı girişi),
`06-MUHASEBE-MOTORU.md` (açılış fişi ve devir), `09-CARI-YONETIMI.md` (devir bakiyesi mutabakatı),
`40-UAT-KABUL-CANLIYA-GECIS.md` (gerçek müşteri verisiyle göç provası),
`41-RISKLER-VE-VARSAYIMLAR.md` (veri kaybı riski).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| Eksik/yanlış devir bakiyesi (sessiz veri kaybı) | **Yüksek** | Aktarım sonunda bakiye toplamı gösterilir ve onay istenir; `41` risk kaydına girer | Parti geri alınır, dosya düzeltilip yeniden yüklenir |
| Geri almanın bağlı kayıtları bozması | Yüksek | Bağlı kayıt varsa geri alma **reddedilir**; silme yerine pasife alma | Pasife alınan kayıt yeniden etkinleştirilir |
| Aynı dosyanın iki kez aktarılması (mükerrer cari/belge) | Yüksek | Mükerrer anahtarları tür bazında tanımlı; varsayılan `Atla` | Parti geri alınır |
| Yanlış sütun eşlemesi (ör. "Tutar" → "Matrah") | Yüksek | Eşleme ekranında **örnek değer** gösterilir; zorunlu alan rozetli; kaydetmeden aktarım yok | Profil düzeltilir; parti geri alınır |
| Büyük dosyada zaman aşımı / yarım iş | Orta | 5.000 satır + 5 MB sınırı; üstünde `BackgroundJob` ile parçalı işlem | Parça listesi yeniden çalıştırılır |
| CSV kodlama bozulması (Türkçe karakter) | Orta | UTF-8 → Windows-1254 geri düşüşü (bugünkü kod) | Dosya UTF-8 olarak yeniden üretilir |
| Aynadan gelen verinin çekirdeğe taşınmasında bakiye farkı | Yüksek | Geçiş yalnız ayna **kapalıyken**; devir tarihi ve bakiye karşılaştırması zorunlu | Ayna yeniden açılır (veri hâlâ orada) |
| Aktarımın bildirim/e-belge tetiklemesi | Orta | Yan etkisiz aktarım kuralı (§5.6) ve testi | — |
| Eski fatura numaralarının firma sayacıyla çakışması | Yüksek | Sayaç aktarımda **değişmez**; çakışma denetimi aktarım öncesi çalışır | Seri ayarından sayaç ileri alınır (`31`) |
| KVKK: dosya içeriğinin saklanması | Orta | Yalnız ad/boyut/satır sayısı saklanır | — |
| Başka program dosya biçimlerinin yanlış varsayılması | Orta | Profiller **örnek dosyayla** doğrulanmadan yayına alınmaz | Profil devre dışı bırakılır |

**Doğrulanacaklar (dış bilgi):**

1. **doğrulanacak:** Luca dışa aktarımının gerçek dosya biçimi (tür, kodlama, ayraç, tarih/sayı biçimi,
   borç/alacak sütun düzeni) — kaynak: müşteriden örnek dosya (yalnız başlık ve biçim).
2. **doğrulanacak:** Mikro ve Logo dışa aktarım biçimleri — kaynak: bu programları kullanan müşteri
   veya programın kullanım kılavuzu.
3. **doğrulanacak:** Luca'da aktarım sırasında mükerrer denetimi ve geri alma davranışı — kaynak: Luca
   kullanım kılavuzu veya bayi demosu.
4. **doğrulanacak:** Luca'da banka ekstresi aktarımında desteklenen biçimler (MT940, OFX, CSV) —
   kaynak: Luca kılavuzu ve müşterinin bankası.
5. **doğrulanacak:** Yevmiye fişi aktarımında hesap kodu eşleşmesi ve borç/alacak dengesi denetiminin
   beklenen davranışı — mali müşavir.
6. **doğrulanacak:** Pratikortam'ın kullanım şartları: başka bir firmanın kendi verisini kendi izniyle
   dışa aktarıp bize getirmesinin önünde engel var mı — kaynak: pratikortam sözleşmesi/kullanım
   şartları ve avukat (`docs/SATIS-PLANI.md:284`).
7. **doğrulanacak:** Devir bakiyesinin hangi tarihle ve hangi belgeyle muhasebeleştirileceği (açılış
   fişi kuralı) — mali müşavir.
8. **doğrulanacak:** Aktarılan geçmiş belgelerin e-Defter/e-belge kapsamına girip girmediği — mali
   müşavir ve `08-E-BELGE-KATMANI.md`.
9. **doğrulanacak:** Banka ekstresi verisinin saklama süresi ve KVKK kapsamı — avukat ve
   `35-DENETIM-IZI-KVKK-UYUM.md`.
10. **doğrulanacak:** Müşterinin eski programından çıkan dosyada kişisel veri (şoför TC kimlik no,
    telefon) bulunması hâlinde aktarımın hukuki dayanağı — avukat.

Sonraki belgeyle bağlantı: bu doküman `15-BANKA-ENTEGRASYON.md`'ye ekstre aktarım girişini,
`06-MUHASEBE-MOTORU.md`'ye açılış fişini, `09-CARI-YONETIMI.md`'ye devir mutabakatını,
`31-AYARLAR-SIRKET-KURULUMU.md` ile birlikte kurulum sihirbazının veri adımını besler; hepsi
`01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak parçalarını kullanır.
