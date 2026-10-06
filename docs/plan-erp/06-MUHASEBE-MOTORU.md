# 06 — Muhasebe Motoru

Bu belge ERP hedefinin **muhasebe motorunu** anlatır: hesap planı, kaynak belgeden otomatik yevmiye
fişi üretimi, KDV ve tevkifat, kur farkı, mizan/kesin mizan, muavin, dönem kapatma, fiş iptali ve ters
kayıt, e-Defter dosya üretimi, BA-BS verisi, adat/faiz ve FIFO cari yaşlandırma, yuvarlama kuralları,
yetki/onay ve test senaryoları. Tablolar `05-VERI-MODELI.md`; mimari `04-HEDEF-MIMARI.md`; KDV
kuralları `docs/KDV-KURALLARI.md` ile uyumludur.

> **Not:** Bu belge mevzuat yorumu yapmaz. Oran, kod ve beyan kuralları **mali müşavir/avukat onayı
> gerektirir**; burada yazılanlar yalnız yazılım davranışıdır.

## 1. Amaç ve kapsam

**Amaç.** Panelde üretilen her ticari belgenin (satış faturası, alınan fatura, tahsilat, ödeme, kasa,
çek, masraf) **tek bir muhasebe fişine** dönüşmesini ve bu fişlerden mizan, muavin, e-Defter ve BA-BS
çıktılarının üretilmesini sağlamak. Motor, bugünkü "muhasebeciye Excel gönder" akışının
(`client/src/pages/ReportsPage.tsx:388`) yerini alır; Excel aktarımı **kaldırılmaz**, ek çıktı olur.

**Kapsam içi.** Hesap planı yönetimi; fiş üretimi (otomatik + elle); fiş onayı ve ters kayıt; KDV ve
tevkifat hesapları; kur farkı; mizan/kesin mizan; muavin; dönem kapatma; e-Defter üretimi; BA-BS
verisi; adat/faiz; FIFO cari yaşlandırma; yuvarlama.

**Kapsam dışı.** Bordro fişleri, enflasyon düzeltmesi, konsolide finansal tablo, maliyet muhasebesinin
safha/standart maliyet kısmı, beyanname gönderimi (yalnız veri hazırlanır), resmî defterlerin GİB'e
gönderimi (dosya üretilir; gönderim entegrasyona bağlıdır — **doğrulanacak**).

**Değişmez ilkeler.**

1. **Fiş dengesi:** her fişte toplam borç = toplam alacak; değilse kayıt yapılamaz.
2. **Kayıt silinmez:** düzeltme ters kayıtla; iptal iz bırakır.
3. **Tek kaynak:** bir belgeye bir fiş. İkinci fiş üretilmez (idempotent).
4. **Belge ile fiş aynı transaction:** ya ikisi olur ya hiçbiri
   (`docs/plan-erp/04-HEDEF-MIMARI.md` §5.5).
5. **Yuvarlama tek yerden:** `Money.Round` (`server/YesLojistik.Core/Domain/Money.cs:6`).

## 2. Luca'daki karşılığı

Luca Net'te yevmiye defterinin e-Defter standartlarına aktarımı ve banka ekstre entegrasyonu var
(`docs/plan-erp/02-LUCA-ENVANTERI.md:42`). Luca Koza'da "tüm işlemlerin tek ekrandan
muhasebeleştirilmesi", "Luca Koza'dan muhasebe fişine erişim" ve **"belge üzerinden muhasebe fişi
iptali"** öne çıkıyor (`02-LUCA-ENVANTERI.md:46-47`). FIFO cari yaşlandırma ve **adat** (faiz)
Luca Net özellikleri arasında (`02-LUCA-ENVANTERI.md:36`). SMMM ile entegre çalışma ve "Mali Müşavir
paketi" ayrı bir ürün olarak listeli (`02-LUCA-ENVANTERI.md:15`).

Bizim karşılığımız: belge ekranında "Muhasebe fişi" düğmesi; fişten belgeye ve belgeden fişe çift yönlü
geçiş; iptal ters kayıtla; mizan/muavin raporları; adat/faiz hesabı; e-Defter dosyası.

**doğrulanacak:** Luca'nın hangi hesap kodlarını varsayılan atadığı (otomatik hesap eşleme tablosu);
Luca'nın e-Defter berat ve defter dosya biçimi; Luca'nın adat/faiz hesap yöntemi (basit faiz mi,
hangi gün sayısı) ve varsayılan faiz oranı kaynağı; Luca'nın BA-BS verisini nasıl ürettiği. Site
metni bu ayrıntıları vermiyor; demo ya da teknik doküman gerekir.

## 3. Bizde bugün

**Var olan ve yeniden kullanılacak parçalar:**

| Ne | Kanıt |
|---|---|
| Belge tutar hesabı (KDV + tevkifat) | `server/YesLojistik.Core/Domain/InvoiceCalculator.cs:10` |
| Tevkifat eşiği (KDV dahil 12.000 TL) | `InvoiceCalculator.cs:25` |
| Nakliye tevkifatı 2/10 | `InvoiceCalculator.cs:26` |
| Otomatik tevkifat kuralı (10 haneli VKN) | `InvoiceCalculator.cs:44-45` |
| 10 haneli VKN kontrolü | `InvoiceCalculator.cs:38` |
| %0 KDV istisna kodu (311) | `InvoiceCalculator.cs:48` |
| Yuvarlama (2 hane, yarım yukarı) | `server/YesLojistik.Core/Domain/Money.cs:6` |
| Kâr hesabı KDV hariç, tek formül | `server/YesLojistik.Core/Domain/TripProfit.cs:16-29` |
| FIFO ödeme dağıtımı | `server/YesLojistik.Core/Domain/PaymentAllocator.cs:19` |
| Yaşlandırma kovaları (vadesi gelmemiş/1-30/31-60/61-90/90+) | `PaymentAllocator.cs:64` |
| Fatura toplamları ve tevkifat alanları | `server/YesLojistik.Core/Entities/Invoice.cs:15-19` |
| Tevkifat kodu ve istisna kodu alanları | `Invoice.cs:35-38` |
| e-Fatura tevkifat vergi satırı üretimi | `server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:133` |
| e-Fatura KDV istisna gerekçesi | `UblInvoiceBuilder.cs:127-128` |
| e-Fatura numara dizisi (seri+yıl) | `server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:39` |
| Fatura numarası atomik artış | `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:221` |
| Fatura iptali (silme yok, numara boşluğu yok) | `InvoiceService.cs:203` |
| Tahsilat bağlantısı ve kalan bakiye | `server/YesLojistik.Infrastructure/Services/BalanceService.cs:15` |
| Kasa/banka hareketleri | `server/YesLojistik.Infrastructure/Services/CashService.cs:72` |
| Cari bakiye hesabı (devir + fatura − tahsilat) | `server/YesLojistik.Infrastructure/Services/CariService.cs:39` |
| KDV kuralları (oranlar, kategoriler) | `docs/KDV-KURALLARI.md:9-19` |
| Denetim izi | `server/YesLojistik.Core/Entities/AuditLog.cs:4` |

**Eksikler (bugün kodda YOK).**

| Eksik | Sonuç |
|---|---|
| Hesap planı (`Account`) | Hiçbir belge hesaba bağlanmıyor; muhasebe fişi üretilemiyor |
| Yevmiye fişi (`JournalEntry`/`JournalLine`) | Kodda yok; `server/YesLojistik.Core/Entities/` altında böyle sınıf bulunmuyor |
| Mizan/kesin mizan, muavin | Kodda yok |
| Muhasebe dönemi ve kapatma | Kodda yok |
| Kur farkı | Kodda yok; `Currency`/`ExchangeRate` de yok |
| e-Defter | Kodda e-Defter üretimi yok; yalnız e-Fatura XML var (`UblInvoiceBuilder.cs:57`) |
| BA-BS | Kodda BA/BS verisi üretimi yok |
| Adat/faiz | Kodda yok; yalnız vade gecikme sayımı (`BalanceService.cs:47`) |
| Fiş onayı (maker-checker) | Kodda yok; bugün üç rol var (`server/YesLojistik.Api/Auth/Policies.cs:15-17`) |
| Alınan faturada KDV oranı alanı | `PurchaseInvoice` yalnız `VatAmount` tutar (`server/YesLojistik.Core/Entities/PurchaseInvoice.cs:17`); oran alanı yok |

## 4. Hedef ekranlar ve alanlar

| Ekran | Alanlar (tip) | Not |
|---|---|---|
| **Hesap Planı** (liste + ağaç) | `Kod` (Code), `Ad`, `Üst Hesap` (Ref), `Seviye` (1-5), `Tür` (Varlık/Kaynak/Öz Kaynak/Gelir/Gider/Nazım), `Normal Bakiye` (Borç/Alacak), `Fişe Açık` (bool), `Döviz` (Ref), `Aktif` (bool) | Ağaç görünümü; yalnız yaprak hesaplara fiş yazılır |
| **Yevmiye Fişi** (liste) | `Fiş No` (seriden), `Tarih`, `Tür` (Açılış/Günlük/Kapanış/Düzeltme/Ters), `Kaynak` (Fatura/Tahsilat/…/Elle), `Açıklama`, `Borç Toplam` (Money), `Alacak Toplam` (Money), `Durum` (Taslak/Onaylı/Ters) | Liste toplamı filtreye göre |
| **Yevmiye Fişi** (form) | Satırlar: `Hesap` (Ref), `Açıklama`, `Borç` (Money), `Alacak` (Money), `Cari` (Ref, boş olabilir), `KDV Kodu` (Ref), `Tevkifat Kodu` (Ref), `Vade` (Day), `Belge No`, `Masraf Merkezi` (Ref) | Alt satırda borç/alacak toplamı ve **fark** göstergesi; fark 0 değilse kaydetmez |
| **Fiş Detayı** | Fiş başlığı + satırlar + **belgeye git** düğmesi + ekler + onay izi | Belgeden fişe, fişten belgeye geçiş (`02-LUCA-ENVANTERI.md:46`) |
| **Mizan** | `Hesap`, `Devir Borç`, `Devir Alacak`, `Borç`, `Alacak`, `Kalan Borç`, `Kalan Alacak` | Borç = alacak kontrolü ekranda |
| **Kesin Mizan** | Dönem sonu kapanış sonrası kilitli rakamlar + `Kapanış Tarihi` | Yalnız kapanmış dönem |
| **Muavin** | `Hesap` + hareketler (`Tarih`, `Belge No`, `Açıklama`, `Borç`, `Alacak`, `Bakiye`) | Cari bazlı da açılır |
| **Dönem Kapatma** | `Yıl`, `Başlangıç`, `Bitiş`, `Durum`, `Kapanış Notu` | Kapatma onay ister |
| **e-Defter** | `Dönem`, `Dosya Türü` (Yevmiye/Kebir), `Üretim Tarihi`, `Berat Durumu` | Berat biçimi **doğrulanacak** |
| **BA-BS** | `Dönem`, `Tür` (BA/BS), `Cari`, `VKN`, `Belge Sayısı`, `Tutar` | Veri üretilir; gönderim yok |
| **Adat / Faiz** | `Cari`, `Hesap`, `Tarih Aralığı`, `Faiz Oranı`, `Gün`, `Tutar`, `Fişe Aktar` | Oran **doğrulanacak** |

Biçim kuralları: para 2 kuruş (`client/src/lib/format.ts:1`), tarih `03.10.2026` (`format.ts:11`).

## 5. İş kuralları

### 5.1 Hesap planı

- Tek düzen hesap planı mantığı: hiyerarşik kod (ör. `120`, `120.01`, `120.01.001`); seviye en çok 5.
- Yalnız **yaprak** (`IsPostable = true`) hesaplara fiş yazılır; ara hesaplar yalnız toplam gösterir.
- Hesap **türü** normal bakiyeyi belirler; borç/alacak toplamı türe göre pozitif/negatif gösterilir.
- Hesap **silinmez**, pasife alınır; kodu değiştirilirse denetim izine yazılır.
- Şirket kurulumunda **varsayılan şablon** uygulanır (kod içinden). **doğrulanacak:** tek düzen hesap
  planı kodları ve hangi kodların zorunlu olduğu (mali müşavir onayı gerekir).
- Otomatik eşleme: belge türü → hesap (ör. yurt içi nakliye satışı → gelir hesabı; %20 KDV → hesaplanan
  KDV hesabı; taşeron → maliyet hesabı). Eşleme tablosu şirket ayarında tutulur, elle değiştirilebilir.

### 5.2 Kaynak belgeden otomatik fiş

Bütün fişler `05-VERI-MODELI.md` §6.2'deki `JournalEntry`/`JournalLine` tablolarına yazılır.
Aşağıdaki tablo **davranış sözleşmesidir** (hesap adları örnektir; gerçek kodlar §5.1'deki eşlemeden
gelir).

**Satış faturası** (`Invoice`, kaynak: `Invoice.cs:3`): matrah → alıcı borç / gelir alacak; KDV →
alıcı borç / hesaplanan KDV alacak; tevkifat varsa tevkifat tutarı alıcı borcundan düşülür ve
"tevkif edilen KDV" alacağı yazılır. Toplam alıcı borcu = matrah + KDV − tevkifat
(`InvoiceCalculator.cs:18`). Fatura iptalinde ters kayıt.

**Alınan fatura** (`PurchaseInvoice`, kaynak: `PurchaseInvoice.cs:7`): matrah → gider/maliyet borç;
indirilecek KDV borç; tevkifat varsa "tevkif edilen KDV" borcu; tedarikçi alacak = matrah + KDV −
tevkifat. **Not:** bugün bu tabloda KDV **oranı** yok, yalnız tutar var
(`PurchaseInvoice.cs:17`); fiş üretimi oran gerektirdiğinden `VatCodeId` alanı eklenir
(`05-VERI-MODELI.md` §6.10).

**Tahsilat** (`Payment.cs:3`): kasa/banka borç / alıcı alacak. Çek ile tahsilatta: portföy hesabı
borç / alıcı alacak; tahsil edilince kasa/banka borç / portföy alacak.

**Tedarikçi ödemesi** (`SupplierPayment.cs:4`): tedarikçi borç / kasa-banka alacak. Ciro edilen
çekle ödemede portföy alacak.

**Kasa/banka** (`CashAccount`, `CashTransfer` — `CashAccount.cs:4`, `CashAccount.cs:17`): virman tek
fiş, iki satır (çıkan hesap alacak / giren hesap borç). Masraf ve tahsilatların kasa/banka satırı
aynı hesaba bağlanır.

**Çek/senet** (`Cheque`, `Note` — `05` §6.6): alınan çek portföye girer (portföy borç / alıcı alacak);
tahsil (kasa-banka borç / portföy alacak); karşılıksız (alıcı borç / portföy alacak + ihtar notu);
ciro (tedarikçi borç / portföy alacak). Verilen çek: tedarikçi borç / banka alacak.

**Masraf/gider** (`Expense.cs:3`): gider borç; varsa indirilecek KDV borç; kasa/banka alacak (firma
ödediyse) ya da **şoför hesabı** alacak (`Expense.PaidBy`, `Expense.cs:31`). Vadeli giderde tedarikçi
alacak (`Expense.IsOnCredit`, `Expense.cs:27`).

**Üretim** (`ProductionOrder`): malzeme çıkışı → maliyet borç / stok alacak; mamul girişi → stok borç /
maliyet alacak; işçilik ve genel gider → maliyet borç / ilgili alacak. Maliyet farkı mamul maliyetine
yazılır.

**Sabit kıymet** (`FixedAsset`): alış (kıymet borç / tedarikçi alacak); amortisman (gider borç /
birikmiş amortisman alacak).

**Kurallar.** (a) Aynı belgeye ikinci fiş yazılmaz: `(source_type, source_id)` tekil indeks
(`05-VERI-MODELI.md` §6.2). (b) Belge tutarı sonradan değişirse fiş **güncellenmez**; ters kayıt +
yeni fiş. (c) Elle fiş serbest; ama `SourceType = Manual` işaretlenir ve denetim izi tutulur.

### 5.3 KDV hesapları ve tevkifat

Bu bölüm `docs/KDV-KURALLARI.md` ile **birebir uyumludur**; oranlar ve kodlar teyide bağlıdır.

| Kalem | KDV | Tevkifat |
|---|---|---|
| Müşteriye kesilen nakliye faturası | %20 | 2/10 (kod 624), KDV dahil 12.000 TL üstü **ve** 10 haneli VKN (`docs/KDV-KURALLARI.md:11`) |
| Taşerondan alınan nakliye | %20 | Aynı kural (`KDV-KURALLARI.md:12`) |
| Komisyon | %20 | Yok (`KDV-KURALLARI.md:13`) |
| Yakıt, bakım, lastik, otoyol/köprü | %20 | Yok (`KDV-KURALLARI.md:14`) |
| Sigorta, vergi/harç, harcırah, avans | %0 | Yok (`KDV-KURALLARI.md:15`) |
| Yemek ve konaklama | %10 (elle) | Yok (`KDV-KURALLARI.md:16`) |
| Yurt dışı taşıma | %0, istisna kodu 311 | Yok (`KDV-KURALLARI.md:17`) |

**Hesap satırları.** Satışta: hesaplanan KDV; alışta: indirilecek KDV; tevkifatlı belgede: tevkif
edilen KDV (satışta alacak, alışta borç). Dönem sonunda hesaplanan ve indirilecek KDV karşılaştırılır;
ödenecek/devreden KDV fişi elle ya da dönem kapanışında üretilir. **doğrulanacak:** devreden KDV
devri, iade ve indirim mekanizmasının hangi hesaplarla izleneceği (mali müşavir onayı gerekir).

**Seçilebilen oranlar** %0, %1, %10, %20 (`KDV-KURALLARI.md:19`). Motor oranı elle değiştirilebilir
bırakır; yalnız varsayılanı doldurur (`KDV-KURALLARI.md:38`).

**Tevkifat hesabı (bugünkü davranış korunur).** Tevkifat "otomatik" bırakılırsa: KDV dahil toplam
12.000 TL'yi aşıyor **ve** alıcının 10 haneli VKN'si varsa 2/10; aksi hâlde 0
(`InvoiceCalculator.cs:44-45`, `InvoiceCalculator.cs:38`). Eşik sabiti `12.000,00 TL`
(`InvoiceCalculator.cs:25`); nakliye tevkifat oranı 2/10 (`InvoiceCalculator.cs:26`). Elle girilen
oran panel tarafından **değiştirilmez** (`KDV-KURALLARI.md:38`).

**KDV %0.** İstisna kodu sorulur; varsayılan 311, uluslararası taşıma (`InvoiceCalculator.cs:48`).
301/302 ve başka kod girilebilir (`KDV-KURALLARI.md:27`). **doğrulanacak:** güncel istisna kodu listesi.

**Kâr hesabı KDV hariç kalır** (bugünkü tek formül: `TripProfit.cs:16-29`); cari ve borçlar KDV dahil
kalır (`KDV-KURALLARI.md:30-34`). Muhasebe motoru bu ayrımı **bozmaz**: muhasebe KDV'yi kendi
hesaplarında izler, kâr raporu değişmez.

### 5.4 Kur farkı

Dövizli belgede satır iki tutar taşır: belge para biriminde tutar ve defter para biriminde karşılığı
(kur). Kur farkı kuralları:

- **Tahsil/ödeme anında:** kapanan tutar için `(tahsil kuru − belge kuru) × döviz tutarı` farkı kur
  farkı kârı/zararı hesabına yazılır.
- **Dönem sonunda:** açık dövizli bakiyeler dönem sonu kuruyla değerlenir; fark fişlenir.
- Kur kaynağı kayıtta **saklanır** (`ExchangeRate.Source`); rapor "hangi kurdan" sorusunu yanıtlar.
- Kur farkı fişi `Kind = Adjustment` işaretlenir ve kaynak belgeye bağlanır.
- **doğrulanacak:** kur kaynağı (TCMB efektif/forex), dönem sonu değerleme zorunluluğu ve
  vergi etkisi (mali müşavir onayı gerekir).

Bugün döviz alanı hiç yok (`05-VERI-MODELI.md` §6.1); bu bölüm **yeni** iştir. Luca'da "farklı döviz
cinslerinden fatura kesimi" var (`02-LUCA-ENVANTERI.md:55`).

### 5.5 Mizan, kesin mizan ve muavin

- **Mizan:** hesap bazında devir + dönem borç/alacak + kalan. Borç toplamı = alacak toplamı olmalı.
- **Kesin mizan:** dönem kapandıktan sonra üretilen, değişmeyen mizan. Kapanmamış dönemde "kesin"
  etiketi kullanılmaz.
- **Muavin:** hesap (ve gerekiyorsa cari) bazında hareket listesi; her satırda belge no ve bakiye.
- Hesaplama kaynağı: fişler (kesin doğru) ya da `LedgerBalance` özeti (hızlı). İkisi **her zaman**
  aynı olmalı; günlük tutarlılık testi (`05` §9, ölçüt 6).
- **Kapanış sonrası** kesin mizan donar; düzeltme yeni dönemde yapılır.

### 5.6 Muhasebe dönemi kapatma

1. Dönemde **taslak fiş** kalmamalı; kalan varsa kapatma engellenir ve liste gösterilir.
2. Borç = alacak kontrolü ve `LedgerBalance` yeniden üretimi çalışır.
3. KDV, stok değerleme ve amortisman fişleri üretilir (§5.3, §5.7).
4. Kur değerlemesi yapılır (varsa dövizli bakiye).
5. Kapanış kaydı: `AccountingPeriod.Status = Closed`, `ClosedAt`, `ClosedBy`; denetim izi yazılır.
6. Kapalı döneme yeni fiş yazılamaz; açmak yönetici onayı + gerekçe ister (`ReopenReason`).
7. Kapanış geri alınırsa (yeniden açma) bu da denetim izine yazılır ve **yeni** kapanış gerekir.

### 5.7 Fiş iptali ve ters kayıt

- **İptal yolu tektir: ters kayıt.** Borç ve alacak yer değiştirir; tutarlar aynı kalır.
- Ters kayıt `ReversalOfId` ile aslına bağlanır; asıl fiş `Kind = Reversed` işaretlenir (silinmez).
- Kaynak belge iptal edilirse (ör. fatura iptali, `InvoiceService.cs:203`) ters kayıt **otomatik**
  üretilir.
- Onaylı fiş doğrudan düzenlenemez; önce ters kayıt, sonra yeni fiş.
- Kapanmış dönemdeki fiş için ters kayıt **açık dönemde** yazılır (bugünkü dönem tarihiyle).
- İptal izi: kim, ne zaman, gerekçe (`AuditLog.cs:4`).

### 5.8 e-Defter dosya üretimi

- Dönem için **yevmiye defteri** ve **kebir defteri** dosyaları üretilir; ikisi de kapanış öncesi
  kontrol edilir (taslak fiş yok, denge var).
- Dosya, belirlenen dizin yapısında paketlenir ve **berat** ile birlikte saklanır.
- Berat, defter dosyasının özeti ve imzasıdır; üretim anı, dönem ve dosya listesi kayıtta tutulur.
- Dosyalar `Attachment`/dosya deposunda saklanır (`05-VERI-MODELI.md` §6.9); yedekleme kapsamına
  girer.
- **doğrulanacak:** e-Defter **defter ve berat dosya biçimi**, alan listesi, imzalama yöntemi, hangi
  kuruma/dizine yükleneceği, zorunluluk tarihleri ve berat süreleri. Kaynak: GİB kılavuzu ve mali
  müşavir; bu belgede uydurulmaz. **doğrulanacak:** hangi mükellefin e-Defter'e tabi olduğu.

### 5.9 BA-BS verisi

- **BA** (alış) ve **BS** (satış) formları için dönem verisi üretilir: karşı firma VKN'si, ünvan,
  belge sayısı, toplam tutar (KDV hariç ve KDV'li ayrımı **doğrulanacak**).
- Belge türüne göre kapsam (fatura, e-Arşiv, gümrük) **doğrulanacak**.
- Kendi belgelerimizin karşı tarafın verisiyle tutması için **mutabakat** ekranı: fark satırları
  listelenir, "farkı kabul et" gerekçesiyle kapatılabilir (desen: `docs/GELISTIRME-PLANI.md:124`).
- Luca'da BA-BS mutabakatı ve karşı firmaya bilgi postası özelliği var (`02-LUCA-ENVANTERI.md:31`);
  bu, uzun vadeli hedef olarak not edilir.
- **doğrulanacak:** form dönemleri, zorunluluk sınırları, hangi belge türlerinin girdiği, gönderim
  yöntemi. Mevzuat yorumu yapılmaz; **mali müşavir onayı gerekir.**

### 5.10 Adat/faiz ve FIFO cari yaşlandırma

**FIFO yaşlandırma (bugün var, korunur).** Tahsilatlar faturaya bağlıysa önce onu kapatır; bağlı
değilse en eski faturadan başlanarak dağıtılır (`PaymentAllocator.cs:19`). Yaşlandırma kovaları:
vadesi gelmemiş, 1-30, 31-60, 61-90, 90+ (`PaymentAllocator.cs:64`). Motor bu hesabı **değiştirmez**;
yalnız muhasebe fişiyle tutarlılığını doğrular. Kapanış izi `PaymentAllocation` tablosunda saklanır
(`05-VERI-MODELI.md` §6.6).

**Adat (faiz).** Vadesi geçen bakiyeler için gün bazında faiz hesabı:

- Girdi: cari, hesap, tarih aralığı, faiz oranı, gün sayısı yöntemi (365/360) — **doğrulanacak**.
- Çıktı: gün gün adat dökümü + toplam faiz tutarı.
- Faiz **kendiliğinden** cariye yazılmaz; kullanıcı "fişe aktar" der ve fiş üretilir (denetim izi).
- Varsayılan oran firma ayarında tutulur; **doğrulanacak:** yasal azami oran ve sözleşme şartı
  (avukat onayı gerekir).
- Negatif adat (bizim borcumuz) da hesaplanır; ayrı hesaba yazılır.

### 5.11 Yuvarlama kuralları

- Bütün para yuvarlamaları tek fonksiyondan: `Money.Round` (2 hane, yarım yukarı —
  `Money.cs:6`).
- KDV, satır tutarından hesaplanır ve **satır bazında** yuvarlanır; toplam, yuvarlanmış satırların
  toplamıdır (`InvoiceCalculator.cs:15-17`).
- Tevkifat, **yuvarlanmış KDV** üzerinden hesaplanır (`InvoiceCalculator.cs:17`).
- Fatura satırı toplamı ile başlık toplamı arasında kuruş farkı oluşursa fark **satır bazında**
  kapatılır, "yuvarlama" satırı eklenmez.
- Dövizli belgede defter karşılığı satır bazında yuvarlanır; kur farkı ayrı satırdır.
- Yuvarlama farkı hiçbir zaman 1 kuruşu geçmez; test edilir (§10).

### 5.12 Yetki ve onay

| İşlem | Gerekli yetki | Onay |
|---|---|---|
| Fiş görüntüleme, mizan, muavin | `ledger.view` | — |
| Elle fiş girişi | `ledger.edit` | Onaya düşer |
| Fiş onayı | `ledger.approve` | **Maker-checker:** giren kişi onaylayamaz |
| Ters kayıt | `ledger.approve` | Gerekçe zorunlu |
| Dönem kapatma / yeniden açma | `admin` | Gerekçe + denetim izi |
| Seri/numara değiştirme | `admin` | Gerekçe + denetim izi |
| e-Defter üretimi | `ledger.approve` | Üretim kaydı saklanır |
| BA-BS üretimi | `ledger.view` | — |
| Adat/faiz fişe aktarma | `ledger.edit` | Onaya düşer |

Bugün üç rol var (`server/YesLojistik.Api/Auth/Policies.cs:15-17`); bu yetkiler rol matrisine eklenir
(`04-HEDEF-MIMARI.md` §8). Bütün onay/iptal hareketleri denetim izine yazılır (`AuditLog.cs:4`).

## 6. Veri modeli

Bu bölümdeki tablolar `05-VERI-MODELI.md` §6'da **tanımlıdır**; burada yalnız muhasebe motorunun
kullandığı alanlar ve kurallar özetlenir:

| Tablo | Motorun kullandığı alanlar | Kural |
|---|---|---|
| `Account` | `Code`, `Kind`, `NormalBalance`, `IsPostable` | Fiş yalnız yaprak hesaba |
| `AccountingPeriod` | `Status`, `StartDate`, `EndDate` | Kapalı döneme fiş yok |
| `JournalEntry` | `EntryNo`, `SourceType`, `SourceId`, `Status`, `ReversalOfId`, `TotalDebit`, `TotalCredit` | Denge zorunlu; belge–fiş tekilliği |
| `JournalLine` | `AccountId`, `Debit`, `Credit`, `ContactId`, `VatCodeId`, `WithholdingCodeId`, `DueDate` | Borç **veya** alacak |
| `LedgerBalance` | `PeriodId`, `AccountId`, `ContactId`, `ClosingDebit`, `ClosingCredit` | Türetilmiş; fişlerden yeniden üretilebilir |
| `VatCode` / `WithholdingCode` | `Rate`, `ExemptionCode`, `Tenths`, `AppliesAbove`, `RequiresCompanyTaxNumber` | Eşik 12.000,00 TL (`InvoiceCalculator.cs:25`) |
| `DocumentSeries` | `DocumentType`, `Prefix`, `Year`, `NextNumber` | Boşluksuz numara |
| `PaymentAllocation` | `PaymentId`, `TargetType`, `TargetId`, `Amount` | FIFO sonucunun kalıcı izi |
| `ExchangeRate` | `Date`, `ForexBuying`, `ForexSelling`, `Source` | Kur farkı hesabının girdisi |
| `Attachment` | `OwnerType = JournalEntry`, `StorageKey` | Fiş ekleri |
| `BackgroundJob` | `Type = ledger.post` | Ağır toplu fiş üretimi |

**Ekleme mi, yeni mi?** `Account`, `AccountingPeriod`, `JournalEntry`, `JournalLine`,
`LedgerBalance`, `VatCode`, `WithholdingCode`, `PaymentAllocation` → **yeni tablo**.
`Invoice`'a `PeriodId`/`JournalEntryId`/`VatCodeId`/`WithholdingCodeId`;
`PurchaseInvoice`'a `VatRate`/`VatCodeId`/`PeriodId`/`JournalEntryId`;
`Payment`/`SupplierPayment`'e `PeriodId`/`JournalEntryId` → **ekleme** (hepsi boş olabilir).
Migration yalnız ekleme yapar (`docs/plan-erp/01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET/POST | `/api/erp/accounts` | Hesap planı | `ledger.view` / `.edit` |
| GET/POST | `/api/erp/journal-entries` | Fiş listesi / giriş | `ledger.view` / `.edit` |
| GET | `/api/erp/journal-entries/{id}` | Fiş detayı + belge bağı | `ledger.view` |
| POST | `/api/erp/journal-entries/{id}/approve` | Onay | `ledger.approve` |
| POST | `/api/erp/journal-entries/{id}/reverse` | Ters kayıt | `ledger.approve` |
| POST | `/api/erp/journal-entries/from-document` | Belgeden fiş üret (elle tetik) | `ledger.edit` |
| GET | `/api/erp/trial-balance` | Mizan / kesin mizan | `ledger.view` |
| GET | `/api/erp/ledger/{accountId}` | Muavin | `ledger.view` |
| POST | `/api/erp/periods/{id}/close` | Dönem kapatma | `admin` |
| POST | `/api/erp/periods/{id}/reopen` | Yeniden açma | `admin` |
| POST | `/api/erp/e-ledger/generate` | e-Defter dosyası üret | `ledger.approve` |
| GET | `/api/erp/ba-bs` | BA-BS verisi | `ledger.view` |
| GET | `/api/erp/aging` | FIFO cari yaşlandırma | `ledger.view` |
| POST | `/api/erp/interest/calculate` | Adat/faiz hesabı | `ledger.edit` |

**Kurallar.** Yazma uçları: lisans kapısı → yetki → doğrulama → transaction → denetim izi
(`04-HEDEF-MIMARI.md` §7). Fiş üretimi idempotent: aynı belge için ikinci çağrı **var olan fişi**
döner, yenisini üretmez.

## 8. Yetki, onay ve denetim izi

§5.12'deki matris geçerlidir. Ek kurallar:

- **Maker-checker** veritabanı düzeyinde de desteklenir: `JournalEntry.ApprovedBy != CreatedBy`
  kontrolü uygulama katmanında zorunludur.
- **Geri alma (undo) yoktur:** yanlış onay ters kayıtla düzeltilir; onay geri alınamaz, yalnız
  "onayı kaldır" (taslağa döndürme) yetkisi `admin`'de olabilir ve denetim izi tutar.
- **Denetim izi alanları:** kim, ne zaman, hangi şirket, hangi fiş, hangi alan, eski → yeni değer
  (`AuditLog.Changes`, `AuditLog.cs:17`).
- **Belge–fiş bağı** denetim izinde görünür: fatura iptal edilince üretilen ters kayıt, aynı
  `CorrelationId` ile bağlanır.
- **Salt okunur durum:** abonelik bittiğinde yazma kapalı (`LicenseGuard.cs:18-20`); mizan, muavin ve
  raporlar **görüntülenebilir** kalır.

## 9. Kabul kriterleri

| # | Ölçüt | Hedef |
|---|---|---|
| 1 | Fiş dengesi | Her fişte borç = alacak; ihlal 0 (1000 rastgele fiş testi) |
| 2 | Belge–fiş tekilliği | Aynı belgeye ikinci fiş yok; test 0 ihlal |
| 3 | KDV hesabı | `InvoiceCalculator` ile aynı sonuç (`InvoiceCalculator.cs:10`); fark 0 kuruş |
| 4 | Tevkifat | 12.000,00 TL eşiği ve 10 hane VKN kuralı; sınır testleri (11.999,99 / 12.000,00 / 12.000,01) |
| 5 | Yuvarlama | Satır toplamı = başlık toplamı; fark ≤ 0,01 TL ve satır bazında kapatılmış |
| 6 | Mizan | Borç toplamı = alacak toplamı; `LedgerBalance` ile fişlerden hesap farkı 0,00 TL |
| 7 | Kesin mizan | Kapanmamış dönemde "kesin" etiketi yok; kapalı dönemde değişmez |
| 8 | Ters kayıt | Asıl fiş durumu `Reversed`; ters kayıt `ReversalOfId` dolu; toplam etki 0 |
| 9 | Dönem kapatma | Taslak fiş varken kapatma engellenir; engel mesajı listede en az 1 ihlal gösterir |
| 10 | e-Defter | Dosya üretilir, saklanır, tekrar üretim aynı içeriği verir (deterministik) |
| 11 | BA-BS | Dönem verisi üretilir; cari mutabakat farkı listelenir |
| 12 | Adat | Elle onay olmadan cariye faiz yazılmaz |
| 13 | Onay | Giren kişi kendi fişini onaylayamaz (403) |
| 14 | Geri dönüş | Motor kapatıldığında belgeler eskisi gibi kaydedilir; hiçbir ekran bozulmaz |

## 10. Testler

**Birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `JournalEntryBalanceTests` — borç/alacak dengesi, tek satır kuralı, boş fiş reddi.
- `VatWithholdingTests` — oran/eşik/VKN kombinasyonları; sınır değerleri; %0 istisna kodu.
- `RoundingTests` — satır bazlı yuvarlama, satır toplamı = başlık toplamı.
- `DocumentSeriesTests` — boşluksuz numara, yıl devri, eşzamanlılık (100 paralel istek).
- `AccountTreeTests` — seviye sınırı, yaprak hesap kuralı, kod tekilliği.
- `CurrencyRevaluationTests` — kur farkı hesabı, yön (kâr/zarar).
- `InterestTests` — adat gün sayısı, 365/360 yöntemi, negatif adat.

**Entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `InvoiceToJournalTests` — satış faturası → fiş; iptal → ters kayıt; ikinci üretim yok.
- `PurchaseInvoiceToJournalTests` — alınan fatura → fiş; tevkifatlı ve tevkifatsız hâl.
- `PaymentAllocationJournalTests` — tahsilat → fiş; FIFO sonucu
  `PaymentAllocator.cs:19` ile aynı.
- `PeriodCloseTests` — taslak fiş engeli, kapanış, kapalı döneme yazma reddi, yeniden açma izi.
- `TrialBalanceTests` — mizan toplamı; özet ile detay farkı 0,00 TL.
- `ELedgerFileTests` — dosya üretimi deterministik; içerik şablonu **doğrulanınca** güncellenir.
- `BaBsTests` — dönem verisi; VKN bazlı toplama; kapsam dışı belge elenir.
- `MultiCompanyLedgerTests` — iki şirkette fişler karışmaz; mizan ayrı.

**e2e testleri** (`client/e2e/`):

- Hesap planı ekranı: ağaç aç/kapa, yaprak olmayan hesaba fiş denenince hata.
- Yevmiye fişi formu: borç/alacak farkı gösterilir, fark varken kaydetmez, Ctrl+Enter kaydeder.
- Fatura detayında "Muhasebe fişi" düğmesi → fiş ekranı; fişten faturaya dönüş.
- Mizan ekranı: filtre toplamı, Excel indirme.
- Dönem kapatma: taslak fiş varken engel mesajı; kapatınca yazma düğmeleri gizlenir.

**Kabul testi (uçtan uca).** Tek bir ay için: 5 satış faturası, 3 alınan fatura, 4 tahsilat,
2 tedarikçi ödemesi, 1 kasa virmanı, 1 çek tahsili, 3 masraf → fişler üretilir → mizan alınır →
dönem kapatılır → e-Defter dosyası ve BA-BS verisi üretilir → sayılar elle yapılan hesapla
karşılaştırılır (fark 0,00 TL).

## 11. Efor ve bağımlılıklar

| İş | Efor (kişi-gün) | Önce bitmeli |
|---|---|---|
| Hesap planı + varsayılan şablon + eşleme tablosu | 10-14 | Tek düzen hesap planı teyidi |
| Yevmiye fişi (giriş, denge, onay, ters kayıt) | 12-16 | Hesap planı |
| Otomatik fiş: satış + alınan fatura | 8-12 | Fiş altyapısı |
| Otomatik fiş: tahsilat, ödeme, kasa, virman | 8-12 | Fiş altyapısı |
| Otomatik fiş: çek/senet, masraf, üretim, kıymet | 10-15 | İlgili modüller (`05`) |
| KDV/tevkifat hesap eşlemesi | 5-8 | Mali müşavir teyidi |
| Mizan, kesin mizan, muavin | 8-12 | Fiş altyapısı |
| Dönem kapatma | 5-8 | Mizan |
| e-Defter üretimi | 8-12 | **Berat/defter biçimi doğrulaması** |
| BA-BS verisi + mutabakat | 6-10 | Defter verisi |
| Adat/faiz | 5-8 | Faiz yöntemi teyidi |
| Kur farkı | 5-8 | `Currency`/`ExchangeRate` (`05`) |
| Test paketi (birim + entegrasyon + e2e) | 12-18 | Bütün işler |

Toplam **110-160 kişi-gün**. **Sıra:** hesap planı → fiş altyapısı → otomatik fişler → mizan →
kapanış → e-Defter/BA-BS. Muhasebe motoru, stok ve sipariş modüllerinden **önce** bitmeli
(`05` §11).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma |
|---|---|---|
| Yanlış hesap eşlemesi (her belge yanlış hesaba) | Yüksek | Eşleme tablosu şirket ayarında ve görünür; ilk ay elle kontrol; mali müşavir onayı |
| Denge kontrolü atlanır, bozuk fiş yazılır | Yüksek | Denge hem uygulamada hem testte; veritabanı kısıtı değerlendirilir |
| Ters kayıt yerine fiş silinir | Yüksek | Silme yetkisi yok; API'de `DELETE` ucu açılmaz; test |
| Tevkifat eşiği/10 hane kuralı yanlış uygulanır | Yüksek | Sınır testleri; oran `WithholdingCode` tablosundan; elle giriş korunur |
| KDV %0 istisna kodu eksik/yanlış | Orta | Kod listesi tablodan; varsayılan 311 (`InvoiceCalculator.cs:48`); uyarı metni |
| e-Defter biçimi varsayımla yazılır | Yüksek | **Üretim, biçim doğrulanana kadar kapalı**; dosya üretilse bile "taslak" işaretlenir |
| BA-BS kapsamı yanlış | Orta | Kapsam kuralı ayarda; mutabakat ekranı; mali müşavir onayı |
| Adat/faiz oranı uydurulur | Yüksek | Oran kullanıcı girer; varsayılan boş; otomatik yazılmaz |
| Kur kaynağı belirsizken kur farkı hesaplanır | Orta | Kur kaynağı saklanır ve raporda gösterilir; kaynak seçilmeden dövizli fiş üretilmez |
| Kapanmış döneme yazma | Yüksek | Dönem kontrolü servis katmanında; ters kayıt açık döneme |
| Motor kapatılınca belge kaydı bozulur | Orta | Motor **ek** çalışır; belge kaydı eskisi gibi; geri dönüş testi |

**doğrulanacak:** tek düzen hesap planı kodları ve zorunlu hesaplar; tevkifat oranları ve kod listesi
(624 ve diğerleri); KDV istisna kodları (311/301/302 ve diğerleri); e-Defter **defter ve berat dosya
biçimi**, imzalama yöntemi, zorunluluk kapsamı ve tarihleri; BA-BS form dönemleri, sınırları, hangi
belge türlerinin girdiği ve gönderim yöntemi; adat/faiz gün sayısı yöntemi ve yasal azami oran;
devreden KDV ve iade mekanizmasının hesap izi; sabit kıymet amortisman oranları; kur kaynağı (TCMB
efektif/forex) ve dönem sonu değerleme zorunluluğu; e-Fatura/e-Arşiv iptal ve itiraz akışının muhasebe
yansıması; Luca'nın otomatik hesap eşleme mantığı ve adat yöntemi. Mevzuat yorumu bu belgede
yapılmaz; **mali müşavir/avukat onayı gerekir**.

Sonraki belgeyle bağlantı: bu belge `05-VERI-MODELI.md` tablolarının üstünde çalışır ve
`04-HEDEF-MIMARI.md` §5.5'teki olay akışının fiş üreten tarafıdır; `03-KAPSAM-VE-KONUMLANDIRMA.md`
muhasebe çekirdeğini Standart pakete, e-Defter ve BA-BS'yi Profesyonel pakete koyar.
