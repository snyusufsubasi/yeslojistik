# 08 — E-Belge Katmanı

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 şablonuna uyar. Mevcut `IEInvoiceProvider` +
`ManualXmlProvider` iskeletini **genişletir**; yeni bir e-belge altyapısı kurmaz. Doğrulanmamış dış bilgi
`**doğrulanacak:**` etiketi taşır; mevzuat yorumu yapılmaz.

## 1. Amaç ve kapsam

Bugün panel **tek bir e-belge türünü** yarım destekliyor: kesilen satış faturasına ETTN ve GİB numarası
verilip UBL-TR XML üretiliyor, ama hiçbir entegratör bağlı olmadığı için XML indirilip elle yükleniyor
(`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:19-32`,
`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs`). Bu modül o iskeleti **tam bir
e-belge katmanına** dönüştürür.

Kapsam içinde olanlar:

1. **Belge türleri.** e-Fatura, e-Arşiv, e-İrsaliye, e-SMM ve e-Defter. e-Müstahsil için durum
   **doğrulanacak** olarak işaretlenir (bkz. §2).
2. **Senaryolar.** Temel fatura, ticari fatura, ihracat, istisna ve iade senaryolarının hangi alanları
   değiştirdiği.
3. **Gönderim ve alma akışı.** Gönderim, durum sorgusu, gelen fatura kutusu, kabul/red, itiraz süresi.
4. **Entegratör soyutlaması.** Mevcut `IEInvoiceProvider` üzerine kurulan genişletme; yeni sağlayıcı
   ekleme adımları ve sahte sağlayıcıyla test.
5. **Durum makineleri.** Gönderilmedi → Kuyrukta → Gönderildi → Alıcıya ulaştı → Kabul/Red; hata ve
   iptal yolları.
6. **Yeniden gönderim, iptal ve itiraz.**
7. **GİB'e kayıt, mali mühür/e-imza gereksinimi** (yalnız gereksinim listesi; tedarik kararı kullanıcıda).
8. **Saklama yükümlülüğü** (10 yıl **doğrulanacak**) ve XML/PDF arşivleme.

Kapsam dışı: muhasebe fişi (`06-MUHASEBE-MOTORU.md`), seri/numara yönetiminin genel çerçevesi
(`07-YETKI-ONAY-NUMARALANDIRMA.md`), bildirim şablonları (`33-BILDIRIM-EPOSTA-SMS-KEP.md`), entegratör
sözleşme/fiyat kararı (`34-LISANS-ABONELIK-KONTOR.md`).

**En önemli kısıt:** gerçek bir entegratörün API dokümanına erişimimiz yoktur. Bu yüzden bu doküman
**uydurma uç nokta, uydurma durum kodu veya uydurma alan adı içermez.** Sağlayıcıya özel her şey
`docs/ENTEGRATOR-EKLEME.md` §2'deki kontrol listesi doldurulduktan sonra yazılır.

## 2. Luca'daki karşılığı

Luca sitesinden okunabilenler (`docs/plan-erp/02-LUCA-ENVANTERI.md`):

- e-Fatura gönderimi (e-Fatura'ya geçmiş carilere) ve **gelen e-Faturaların alınması**
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:39`).
- **e-Arşiv fatura gönderimi** (`docs/plan-erp/02-LUCA-ENVANTERI.md:40`).
- Farklı **döviz cinslerinden** fatura kesimi, işletmeye göre fatura tipi tanımlama, **ithalat** takibi,
  **proforma** ve **numune** faturası (`docs/plan-erp/02-LUCA-ENVANTERI.md:55-56`).
- **Yevmiye defterinin e-Defter standartlarına aktarımı** (`docs/plan-erp/02-LUCA-ENVANTERI.md:42`).
- **BA-BS mutabakatı**: oluşan kayıtlardan BA-BS verisi listelenir, karşı firmanın e-postasına bilgi
  postası gider (`docs/plan-erp/02-LUCA-ENVANTERI.md:31`).
- Fatura bilgilendirme: oluşturulan fatura cari firmanın e-postasına gönderilir
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:32`).
- Cari kart girişinde e-Fatura kullanıcısı olan carilerin **GİB tarafında sorgulanıp listelenmesi**
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:34-35`).
- e-Dönüşüm başlıkları: e-Defter (`/Sayfa/luca-e-defter-uyeligi/26`), e-SMM (`/Sayfa/esmm/66`),
  e-Dönüşüm saklama hizmetleri (`/Sayfa/-e-–-donusum-saklama-hizmetleri/29`), Nette Arşiv, e-Başvuru
  (`docs/plan-erp/02-LUCA-ENVANTERI.md:73-77`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Sayfa/luca-e-defter-uyeligi/26>, <https://www.luca.com.tr/Sayfa/esmm/66>.

**Doğrulanacak (Luca tarafı):**

- **doğrulanacak:** Luca'da e-İrsaliye var mı; ürün sayfalarında adı geçmiyordu, ayrı bir modül/ürün
  olarak mı satılıyor (Luca ürün sayfaları veya bayi).
- **doğrulanacak:** Luca'da **e-Müstahsil** makbuzu desteği var mı; envanterde geçmiyor
  (Luca ürün/modül listesi, mali müşavir).
- **doğrulanacak:** Luca'da gelen fatura kabul/red akışının ekranı ve itiraz süresi nasıl yönetiliyor
  (Luca demo hesabı).
- **doğrulanacak:** Luca'nın hangi entegratörlerle çalıştığı ve entegratörü kullanıcının seçip
  seçemediği (`docs/plan-erp/02-LUCA-ENVANTERI.md:65-71` — her birinin teknik ayrıntısı doğrulanacak).
- **doğrulanacak:** Luca'da e-Arşiv iptalinin ekrandan mı, entegratör portalından mı yapıldığı.
- **doğrulanacak:** Luca'da XML/PDF arşivinin nerede tutulduğu ve dışa aktarma imkânı
  (`docs/ENTEGRATOR-EKLEME.md:53` ile aynı soru).
- **doğrulanacak:** Luca'nın e-Defter aktarımının hangi biçimde (dosya/entegrasyon) yapıldığı.

## 3. Bizde bugün

### 3.1 Sağlayıcı soyutlaması — çalışıyor

- Arayüz: `IEInvoiceProvider` — `Key`, `Name`, `CanSend`, `SupportsStatus`, `SupportsRecipientCheck`,
  `SupportsDownload`, `SendAsync`, `GetStatusAsync`, `CancelAsync`, `CheckRecipientAsync`,
  `DownloadAsync` (`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:31-51`).
- Sonuç tipi: `EInvoiceResult(Status, Number, Message, ProviderRef)`
  (`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:10`). `ProviderRef` alanı **tanımlı ama
  veritabanına yazılmıyor** — arayüzün kendi yorumu bunu söyler (`:6-8`).
- Belge tipi: `EInvoiceDocumentKind { Xml, Pdf }` ve `EInvoiceDocument(Content, ContentType, FileName)`
  (`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:12-15`).
- Alıcı sorgusu sonucu: `EInvoiceRecipient(IsEInvoiceUser, Aliases, Title)`
  (`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:18`).
- `ManualXmlProvider` (`manual`): `CanSend = false`, `SupportsStatus = false`,
  `SupportsRecipientCheck = false` (`server/YesLojistik.Infrastructure/EInvoice/Providers.cs:10-21`).
  Gönderim çağrısı `Ready` durumu ve "XML'i indirip e-Fatura portalına yükleyin." mesajı döner
  (`:15`).
- `MockEInvoiceProvider` (`mock`): `CanSend = true`, `SupportsStatus = true`,
  `SupportsRecipientCheck = true` (`server/YesLojistik.Infrastructure/EInvoice/Providers.cs:30-36`).
  Durum ilerlemesi taklit edilir: `Sent` → `Delivered`, ticari senaryoda `Accepted`
  (`:42-47`). **VKN'si 9 ile biten** alıcı mükellef sayılır (`:53-55`) — bu bir test kuralıdır,
  gerçek bir mükellefiyet sorgusu değildir.
- Kayıt tablosu `EInvoiceProviders.Registry`: `manual`, `FileExport`, `xml` → `ManualXmlProvider`;
  `mock` → `MockEInvoiceProvider` (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:28-35`).
  Tanınmayan ad **sunucuyu düşürmez**: uyarı yazılır ve `manual` kullanılır (`:56-63`).
- **Gerçek entegratör yoktur**; bunu dosyanın kendi yorumu açıkça söyler
  (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:22-24`) ve
  `docs/ENTEGRATOR-EKLEME.md:3` doğrular.

### 3.2 Fatura hazırlama ve numara — çalışıyor

- `EInvoiceService.PrepareAsync`: e-Fatura kapalıysa ya da `Ettn` doluysa hiçbir şey yapmaz
  (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:22`).
- Senaryo kararı: müşteri mükellef değilse **e-Arşiv**; mükellefse müşteri şablonundaki tercih, yoksa
  firma varsayılanı (`:25-26`).
- Tip kodu: tevkifat varsa `Tevkifat`, yoksa `Satis` (`:27`); tevkifat kodu boşsa varsayılan `624`
  uygulanır (`:28`, sabit `server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:16`).
- ETTN üretilir (`:29`), seri öneki senaryoya göre seçilir (`:30-31`), numara `NextNumberAsync`'ten
  alınır (`:31`), durum `Ready` olur (`:32`).
- Numara üretimi boşluksuz ve eşzamanlı güvenlidir: `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`
  (`:41-45`), biçim `{prefix}{year}{next:D9}` (`:46`). Transaction geri alınırsa numara da geri alınır
  (`:37`).
- UBL-TR 1.2 XML üretimi `UblInvoiceBuilder.Build` ile yapılır ve **imzasızdır**
  (`server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs`).

### 3.3 Gönderim ve durum — çalışıyor, ama elle

- `SendAsync`: yalnız **kesilmiş** fatura gönderilir (`:70`); sağlayıcı gönderemiyorsa kullanıcıya
  sade Türkçe yol gösterilir: `"Entegratör bağlantısı yok. XML'i indirip entegratör portalına yükleyin,
  sonra \"Gönderildi olarak işaretle\" deyin."` (`:71`).
- Çift gönderim koruması: `Ready` veya `Failed` dışındaki durumlarda
  `"Fatura zaten gönderilmiş."` hatası (`:72`).
- Hata faturayı bozmaz: durum `Failed`, mesaj `"Entegratöre ulaşılamadı. Biraz sonra tekrar deneyin."`
  (`:79-84`).
- `MarkSentAsync`: elle akış — XML portala yüklendikten sonra kullanıcı işaretler (`:89-98`).
- `RefreshStatusAsync`: yalnız `SupportsStatus` varsa ve durum `Sent`/`Delivered`/`CancelRequested`
  ise sorgular (`:100-106`).
- Arka plan işi `EInvoiceStatusWorker`: 10 dakikada bir, tek seferde en fazla 200 faturayı sorgular
  (`server/YesLojistik.Api/Infrastructure/EInvoiceStatusWorker.cs:29-35`). Sağlayıcı durum sorgusunu
  desteklemiyorsa **hiç çalışmaz** (`:14`).

### 3.4 İptal — ikiye ayrılmış, doğru tasarım

- Gönderilmeden iptal (`Ready`/`Failed`): doğrudan `Cancelled` (`:115-119`).
- e-Arşiv: sağlayıcı gönderebiliyorsa iptal denenir; gönderemiyorsa `CancelRequested` ve mesaj
  "e-Arşiv iptalini entegratör portalından yapın." (`:121-125`).
- e-Fatura: `CancelRequested` ve mesaj "e-Fatura iptali için alıcının onayı ya da GİB portalından iptal
  talebi gerekir." (`:123-125`).
- `ConfirmCancelAsync`: bekleyen iptal talebi tamamlanır (`:129-136`).

### 3.5 Durum modeli — var

`EInvoiceStatus` dokuz değerli: `None, Ready, Sent, Delivered, Accepted, Rejected, Failed,
CancelRequested, Cancelled` (`server/YesLojistik.Core/Entities/Enums.cs:33`).
Panel etiketleri hazırdır (`client/src/pages/InvoicesPage.tsx:208-210`): `Gönderilmeye hazır`,
`Gönderildi`, `Alıcıya ulaştı`, `Kabul edildi`, `Reddedildi`, `Hata`, `İptal talep edildi`, `İptal edildi`.
Senaryo modeli üç değerli: `EArsiv, Temel, Ticari` (`server/YesLojistik.Core/Entities/Enums.cs:29`).
Tip kodu iki değerli: `Satis, Tevkifat` (`server/YesLojistik.Core/Entities/Enums.cs:31`).

### 3.6 API ve panel

- `EInvoiceController` (politika `Accounting`): `GET /api/einvoice/info`,
  `GET /api/invoices/{id}/einvoice/xml`, `POST .../einvoice/send`, `POST .../einvoice/mark-sent`,
  `POST .../einvoice/status`, `POST .../einvoice/cancel-confirmed`,
  `GET /api/einvoice/recipient/{taxNumber}`
  (`server/YesLojistik.Api/Controllers/EInvoiceController.cs:22-66`).
- Dışa aktarma: `GET /api/exports/einvoice-xml` (tarih aralığıyla XML zip)
  (`server/YesLojistik.Api/Controllers/EInvoiceController.cs:137-138`).
- Panelde `EInvoicePanel`: durum rozeti, e-Fatura No, mesaj, `XML indir`, `Entegratöre Gönder`,
  `Gönderildi olarak işaretle`, `İptal tamamlandı` düğmeleri; hangi düğmenin görüneceği sağlayıcı
  yeteneğine göre belirlenir (`client/src/pages/InvoicesPage.tsx:218-247`).
- Ayarlar: `eInvoiceEnabled`, `eInvoiceSeriesPrefix`, `eArchiveSeriesPrefix` alanları
  (`client/src/pages/SettingsPage.tsx:94-96`, `:187-188`), GB etiketi (`:195`) ve salt okunur sağlayıcı
  bilgisi (`:606-612`).

### 3.7 Eksik listesi

| # | Eksik | Kanıt |
|---|---|---|
| 1 | Gerçek entegratör adaptörü | Hiç yok: `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:22-24` |
| 2 | Yeni sağlayıcı adımlarının kodda uygulanması (`ProviderRef` alanı) | `EInvoiceResult.ProviderRef` yazılmıyor: `server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:6-8` |
| 3 | **Gelen fatura kutusu** (alma, listeleme, kabul/red) | Arayüzde alma metodu yok; `IEInvoiceProvider` yalnız gönderim/durum/iptal/alıcı/indirme içerir (`:44-50`) |
| 4 | İtiraz/red akışı uçları | `Rejected` durumu var (`Enums.cs:33`) ama onu üreten bir uç/akış yok |
| 5 | **Kuyruk** durumu | `EInvoiceStatus` içinde kuyruk yok (`server/YesLojistik.Core/Entities/Enums.cs:33`) |
| 6 | Yeniden gönderim (retry) sayacı/gecikmesi | Yalnız elle tekrar denenir: `send` ucu `Ready`/`Failed` kabul eder (`EInvoiceService.cs:72`) |
| 7 | e-İrsaliye | Repoda hiç geçmiyor (grep: e-İrsaliye/eWaybill eşleşmesi yok) |
| 8 | e-SMM | Repoda hiç geçmiyor (grep: e-SMM/eSMM eşleşmesi yok) |
| 9 | e-Defter | Repoda hiç geçmiyor (grep: e-Defter/eDefter eşleşmesi yok) |
| 10 | e-Müstahsil | Repoda hiç geçmiyor (**doğrulanacak**: gerekli mi) |
| 11 | İhracat/istisna senaryosunun uçtan uca akışı | İstisna **kodu** var (`Invoice.VatExemptionCode`, `server/YesLojistik.Core/Entities/Invoice.cs:38`) ve varsayılan atanıyor (`InvoiceService.cs:137`); ayrı senaryo/akış yok |
| 12 | İade faturası | Repoda iade fatura türü yok (grep: iade fatura eşleşmesi yok); yalnız `Payment` iadesi var (`Payment.cs:26-27`) |
| 13 | XML/PDF arşivleme | `SupportsDownload` varsayılan `false` (`IEInvoiceProvider.cs:42`); indirilen belge **saklanmıyor** |
| 14 | Saklama süresi takibi | Repoda yok |
| 15 | Mali mühür / e-imza gereksinim kontrolü | Repoda yok |
| 16 | UBL XML imzalama | `UblInvoiceBuilder` imzasız üretir (`docs/ENTEGRATOR-EKLEME.md:16`) |
| 17 | BA-BS verisi | Repoda yok (grep: BA-BS eşleşmesi yok, yalnız `docs/plan-erp/02-LUCA-ENVANTERI.md:31`) |
| 18 | e-Fatura mükellefiyetinin **toplu** sorgusu | Tek VKN sorgusu var (`EInvoiceController.cs:65-66`), liste yok |
| 19 | GİB kayıt/başvuru durumu takibi | Repoda yok |

## 4. Hedef ekranlar ve alanlar

Ortak parçalar yeniden kullanılır: `PageShell` (`client/src/components/shell/PageShell.tsx:28`),
`DataTable` (`client/src/components/DataTable.tsx:66`), `MobileCards`, `Modal`
(`client/src/components/ui.tsx:156`), `Tabs` (`:300`), `RowMenu`
(`client/src/components/shell/Menu.tsx:75`), `SumStrip` (`client/src/components/SumStrip.tsx:12`).

### 4.1 Ekran: E-Belgeler (`/e-belgeler`)

Bugünkü `/faturalar` sayfası **korunur**; bu yeni sayfa yalnız e-belge yaşam döngüsünü yönetir.

**Sekmeler:** `Giden` · `Gelen` · `Kuyruk` · `Arşiv` · `Ayarlar`.

**Giden listesi sütunları:** Belge No · Tür (rozet) · Alıcı · Tarih · Tutar · Durum (rozet) · Son mesaj ·
İşlemler (`RowMenu`: `XML indir`, `PDF indir`, `Durumu sorgula`, `Yeniden gönder`, `İptal talep et`).

| Alan | Tip | Zorunlu | Doğrulama / hata metni |
|---|---|---|---|
| Belge türü | seçim | Evet | e-Fatura/e-Arşiv; **doğrulanacak:** e-İrsaliye, e-SMM |
| Senaryo | seçim | Evet | `Temel fatura`, `Ticari fatura`, `e-Arşiv` |
| Alıcı VKN/TCKN | metin | Evet | Bugünkü kural: 10 ya da 11 hane (`client/src/components/CustomerForm.tsx:18`) |
| PK etiketi | metin | Hayır | Mükellef sorgusu doldurur; elle de yazılabilir |
| İstisna kodu | metin (10) | KDV %0'da Evet | Bugünkü varsayılan korunur (`InvoiceService.cs:137`) |
| Tevkifat kodu | metin (10) | Tevkifat varsa Evet | Varsayılan `624` (`UblInvoiceBuilder.cs:16`) |
| Gönderim zamanı | seçim | Evet | `Hemen`, `Kuyruğa al`, `Elle (XML indir)` |

### 4.2 Ekran: Gelen Kutusu (`/e-belgeler?tab=incoming`)

**Sütunlar:** Geliş · Gönderen (VKN + ünvan) · Belge No · Tür · Tutar · İtiraz sonu · Durum · İşlemler.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Gönderen VKN | salt okunur | — | Eşleşen tedarikçi kartı varsa yanında adı görünür |
| Eşleşen kayıt | bağlantı | Hayır | Alınan fatura kaydına bağlanır (`PurchaseInvoice`) |
| Kabul / Red | düğme | — | Ticari senaryoda anlamlıdır |
| Ret gerekçesi | metin (300) | Red'de Evet | Masraf ret kuralıyla aynı sınır |
| İtiraz süresi | geri sayım | — | **doğrulanacak:** süre kaç gün (mali müşavir/GİB) |

Kabul edilen gelen fatura, mevcut alınan fatura ekranındaki kayda bağlanır
(`server/YesLojistik.Api/Controllers/PurchaseInvoicesController.cs:56-77`); böylece cari borç akışı
bozulmaz.

### 4.3 Ekran: Kuyruk (`/e-belgeler?tab=queue`)

Bekleyen/gönderilecek belgeler. Sütunlar: Sıra · Belge No · Alıcı · Deneme · Son hata · Sonraki deneme ·
İşlemler (`Şimdi gönder`, `Kuyruktan çıkar`). Üstte `SumStrip`: `Kuyrukta N`, `Hatalı N`, `Bugün
gönderilen N`.

### 4.4 Ekran: Arşiv (`/e-belgeler?tab=archive`)

Saklanan XML/PDF çiftleri. Sütunlar: Belge No · Tür · Tarih · Boyut · Saklama bitişi · İşlemler
(`XML indir`, `PDF indir`, `Doğrula`). Süzgeç: tarih aralığı, tür, "yalnız saklama süresi yaklaşan".

### 4.5 Ekran: E-Belge Ayarları (`/ayarlar?tab=ebelge`)

Bugünkü e-Fatura bloğu (`client/src/pages/SettingsPage.tsx:178-197`) buraya genişletilir.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| e-Belge açık | onay kutusu | — | Bugünkü `eInvoiceEnabled` |
| e-Fatura seri | metin (3) | Evet | Bugünkü kural (`SettingsPage.tsx:95`) |
| e-Arşiv seri | metin (3) | Evet | Bugünkü kural (`:96`) |
| Varsayılan senaryo | seçim | Evet | Bugünkü `DefaultScenario` |
| GB etiketi | metin | Hayır | Bugünkü `SenderAlias` (`:195`) |
| Sağlayıcı | salt okunur | — | Bugünkü gibi ortam değişkeninden (`SettingsPage.tsx:606-612`) |
| Kuyruk denemesi | sayı (1-10) | Evet | Yeni: yeniden gönderim sayısı |
| Deneme aralığı (dk) | sayı (1-120) | Evet | Yeni: sabit `10` yerine ayarlanabilir |
| Arşiv saklama (yıl) | sayı | Evet | **doğrulanacak:** yasal süre |
| İtiraz süresi (gün) | sayı | Evet | **doğrulanacak:** yasal süre |

Sağlayıcı seçimi **panelden yapılmaz** (anahtar sızdırma riski); mevcut karar korunur
(`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs`, ortam değişkeni `EInvoice__Provider`).

## 5. İş kuralları

### 5.1 Belge türü seçimi

| Durum | Belge türü | Kanıt / not |
|---|---|---|
| Alıcı e-Fatura mükellefi | e-Fatura (Temel veya Ticari) | Bugünkü karar: `EInvoiceService.cs:25-26` |
| Alıcı mükellef değil | e-Arşiv | Aynı satır |
| Mal hareketi (irsaliye) | e-İrsaliye | **doğrulanacak:** kapsam ve zorunluluk |
| Serbest meslek makbuzu | e-SMM | **doğrulanacak:** gerekli mi |
| Müstahsil alımı | e-Müstahsil | **doğrulanacak:** gerekli mi |

### 5.2 Senaryolar ve alan etkileri

| Senaryo | Değişen alanlar | Bugünkü durum |
|---|---|---|
| **Temel fatura** | `Scenario = Temel`; alıcı kabul/ret vermez | Var (`Enums.cs:29`, varsayılan `CompanySettings.DefaultScenario`) |
| **Ticari fatura** | `Scenario = Ticari`; alıcı kabul/ret verir | Var; `mock` sağlayıcı `Accepted`'a ilerletir (`Providers.cs:44`) |
| **İhracat** | KDV %0 + istisna kodu (bugün varsayılan `311`) | Kısmen: kod alanı var (`Invoice.cs:38`), ayrı senaryo yok |
| **İstisna** | `VatExemptionCode` dolu, `VatAmount = 0` | Var; kod `InvoiceService.cs:137`'de atanır |
| **İade** | Negatif tutarlı belge, orijinal belgeye referans | **Yok**; yeni alan gerekir (§6) |

Kural: **senaryo fatura kesildikten sonra değiştirilemez.** Gerekçe: senaryo ETTN ve numarayla birlikte
üretilir (`EInvoiceService.cs:25-32`) ve değişirse belge ile kayıt ayrışır. Yanlış senaryo seçildiyse
fatura iptal edilip yeniden kesilir.

Kural: **istisna kodu yalnız KDV %0 iken doludur.** Bugünkü davranış korunur: KDV %0 değilse alan
`null` yazılır (`InvoiceService.cs:137`).

Kural: **tevkifat kodu yalnız tevkifat varsa doludur** (`EInvoiceService.cs:28`) ve varsayılanı `624`'tür
(`UblInvoiceBuilder.cs:16`). Oranın kendisi `WithholdingTenths` alanındadır ve onda bir olarak tutulur
(`server/YesLojistik.Core/Entities/Invoice.cs:15-17`). Oran/kod seçimi **mali müşavir onayına** bağlıdır
(`docs/KDV-KURALLARI.md:5`); bu doküman yorum yapmaz.

### 5.3 Gönderim akışı ve durum makinesi

```
                       ┌──────────────┐
   fatura kesilir ────► │ Hazır (Ready)│
                       └──────┬───────┘
                              │ gönderim isteği
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
      ┌────────────┐   ┌────────────┐   ┌────────────┐
      │ Kuyrukta   │   │ Gönderildi │   │   Hata     │
      │ (yeni)     │   │  (Sent)    │   │ (Failed)   │
      └─────┬──────┘   └──────┬─────┘   └─────┬──────┘
            │ işçi alır        │ durum         │ yeniden dene
            └─────────────────►│               │
                               ▼               │
                       ┌───────────────┐       │
                       │Alıcıya ulaştı │◄──────┘
                       │  (Delivered)  │
                       └───────┬───────┘
                    ticari     │
                 senaryoda     ▼
                  ┌────────────────────────┐
                  │  Kabul (Accepted)      │
                  │  Red   (Rejected)      │
                  └────────────────────────┘

   İptal yolu: Ready/Failed ──► Cancelled (doğrudan)
               Sent sonrası  ──► CancelRequested ──► Cancelled (onaydan sonra)
```

Bugünkü değerler bu şemanın **ilk beş kutusunu** karşılar (`Enums.cs:33`). Yeni eklenenler:

1. **Kuyrukta.** `Ready` durumu bugün "gönderilmeye hazır ama elle" anlamına gelir
   (`client/src/pages/InvoicesPage.tsx:209`). Kuyruk için **yeni durum** eklenir; `Ready` anlamı
   değiştirilmez (geriye dönük uyumluluk).
2. **Yeniden gönderim kuralı.** `Failed` durumundaki belge, deneme sayısı aşılmadıysa otomatik yeniden
   gönderilir. Deneme sayısı aşılırsa belge `Failed` kalır ve **onay merkezine** düşer
   (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2).
3. **Çift gönderim yasağı.** Bugünkü kural korunur: yalnız `Ready`/`Failed` gönderilebilir
   (`EInvoiceService.cs:72`). Ek kural: **zaman aşımında önce sorgula, sonra gönder**
   (`docs/ENTEGRATOR-EKLEME.md:119` sayesinde aynı ilke).
4. **Kabul reddedilirse.** `Rejected` durumu kaydedilir, mesaj alana yazılır. Red sonrası **yeniden
   gönderim yoktur**; düzeltilmiş yeni belge kesilir. Gerekçe: aynı ETTN ile iki kez gönderim GİB
   tarafında tutarsızlık yaratır.

### 5.4 Gelen fatura ve itiraz

1. Gelen fatura, gönderen VKN ile tedarikçi kartına eşlenir. Eşleşme yoksa **yeni tedarikçi kartı
   önerilir**, kendiliğinden oluşturulmaz (yanlış cari açılmasını engeller).
2. Kabul edilen gelen fatura `PurchaseInvoice` kaydına bağlanır; tutar, KDV ve tevkifat alanları
   gelen belgeden okunur ve **kullanıcı onayıyla** yazılır.
3. **İtiraz süresi doğrulanacak:** süre ve başlangıç anı (belge tarihi mi, GİB'e ulaşma anı mı) mali
   müşavirden teyit edilir. Kodda sabit bir gün yazılmaz; süre **ayardan** gelir (§4.5).
4. Süre dolduğunda kayıt otomatik "kabul edildi" sayılmaz; **durum değişmez**, yalnız uyarı rozeti
   kırmızıya döner. Gerekçe: sessiz kabul, muhasebe açısından geri alınamaz bir varsayımdır.

### 5.5 Kuyruk, yeniden gönderim ve iptal

- **Kuyruk işçisi.** Bugünkü `EInvoiceStatusWorker` deseni genişletilir
  (`server/YesLojistik.Api/Infrastructure/EInvoiceStatusWorker.cs`): durum sorgusu 10 dakikada bir
  **korunur**; kuyruk işleyicisi ayrı bir arka plan işi olarak eklenir. Sağlayıcı gönderemiyorsa
  (`CanSend = false`) kuyruk işçisi **hiç çalışmaz** — bugünkü `SupportsStatus` kontrolünün aynısı
  (`:12`).
- **Yeniden gönderim.** Deneme sayısı belge üzerinde tutulur (§6). Her denemede `LastAttemptAt` ve
  `LastError` güncellenir. Başarılı gönderimde sayaç sıfırlanır.
- **İptal.** Bugünkü üç yol korunur (`EInvoiceService.cs:112-136`). Eklenen: iptal talebi
  **onay gerektirir** (fatura iptali için maker-checker; `07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2).
  Gönderilmeden iptal (`Ready`/`Failed`) onay gerektirmez, çünkü belge dışarı çıkmamıştır.
- **Kuyruktan çıkarma.** Kuyruktaki belge iptal edilebilir; bu da `Cancelled` yazar ve numara korunur
  (`client/src/pages/InvoicesPage.tsx:202`).

### 5.6 GİB kaydı, mali mühür ve e-imza

Bunlar **gereksinim**tir; sağlanıp sağlanmadığı koddan doğrulanamaz:

- **doğrulanacak:** GİB özel entegratör listesinde olan firma seçimi (`docs/ENTEGRATOR-EKLEME.md:93`).
- **doğrulanacak:** Faturayı biz mi imzalıyoruz (mali mühür) yoksa entegratör mü imzalıyor
  (`docs/ENTEGRATOR-EKLEME.md:33`).
- **doğrulanacak:** Mali mühür ya da e-imza temin süreci, kim sağlıyor (GİB/TÜBİTAK/BTK yetkili),
  yıllık yenileme ve ücreti.
- **doğrulanacak:** Gönderici birim (GB) ve PK etiketi alma yolu.
- **doğrulanacak:** e-Defter için berat oluşturma/arşivleme sorumluluğu kimde.

Bugün kodda **hiçbiri yoktur** (grep: `mali mühür`, `e-imza`, `berat` — eşleşme yok). UBL üretimi
imzasızdır (`docs/ENTEGRATOR-EKLEME.md:16`), yani bugünkü `manual` akışta imzayı entegratör portalı ya da
mali müşavir yapar.

### 5.7 Saklama ve arşivleme

- **Saklama süresi:** **doğrulanacak:** 10 yıl olduğu söyleniyor
  (`docs/ENTEGRATOR-EKLEME.md:53`); mevzuat yorumu bu dokümanda yapılmaz, mali müşavir/avukat teyidi
  gerekir. Süre **ayardan** okunur (§4.5); kodda sabit yazılmaz.
- **Ne saklanır:** (a) bizim ürettiğimiz UBL XML, (b) sağlayıcıdan indirilen imzalı XML,
  (c) PDF görünümü, (d) durum geçmişi (kim, ne zaman, hangi durum).
- **Nerede saklanır:** mevcut dosya deposu kullanılır. Bugün `IFileStorage` soyutlaması ve
  `DatabaseFileStorage`/`LocalFileStorage` uygulamaları vardır
  (`server/YesLojistik.Core/Abstractions/IFileStorage.cs`,
  `server/YesLojistik.Infrastructure/Services/DatabaseFileStorage.cs`), fişler bu yolla saklanır
  (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:59-63`). Aynı yol kullanılır; yeni bir
  depolama katmanı icat edilmez.
- **Doğrulama:** saklanan XML, fatura numarasını içermelidir. `mock` sağlayıcının gönderim kontrolü
  zaten bu ilkeyi kullanır (`server/YesLojistik.Infrastructure/EInvoice/Providers.cs:37-39`); arşiv
  doğrulaması aynı kuralı uygular.
- **Saklama bitişi:** arşiv kaydında `RetainUntil` alanı tutulur; bitiş yaklaşanlar listede işaretlenir.
  **Silme otomatik yapılmaz**; karar `35-DENETIM-IZI-KVKK-UYUM.md` kapsamındadır.

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar.

### 6.1 Mevcut tablo: `Invoices` — eklenecek sütunlar (hepsi boş olabilir)

| Sütun | Tip | Neden |
|---|---|---|
| `EInvoiceProviderRef` | string(100)? | `EInvoiceResult.ProviderRef` bugün yazılmıyor (`IEInvoiceProvider.cs:6-8`); entegratör kendi kimliğini verirse gerekir |
| `EInvoiceAttempts` | int | Yeniden gönderim sayacı |
| `EInvoiceLastAttemptAt` | DateTime? | Son deneme anı |
| `EInvoiceNextAttemptAt` | DateTime? | Kuyruk zamanlaması |
| `EInvoiceQueuedAt` | DateTime? | Kuyruğa giriş anı |
| `EInvoiceDocumentKind` | yeni enum? | Fatura / İrsaliye / SMM / Müstahsil ayrımı |
| `EInvoiceRejectionReason` | string(300)? | Alıcının ret gerekçesi (bugün yalnız `EInvoiceMessage` var: `Invoice.cs:33`) |
| `EInvoiceRespondedAt` | DateTime? | Alıcı kabul/ret anı |
| `EInvoiceArchivedXmlPath` | string(300)? | Arşivlenen **imzalı** XML yolu (bizim ürettiğimizden ayrı) |
| `EInvoiceArchivedPdfPath` | string(300)? | Arşivlenen PDF yolu |
| `EInvoiceRetainUntil` | DateOnly? | Saklama bitişi |
| `OriginalInvoiceId` | int? | İade faturasının orijinal belgeye bağlanması |
| `IsReturn` | bool | İade işareti |

Bugünkü alanlar korunur: `Scenario`, `TypeCode`, `Ettn`, `EInvoiceNo`, `EInvoiceStatus`,
`EInvoiceMessage`, `EInvoiceSentAt`, `WithholdingCode`, `VatExemptionCode`
(`server/YesLojistik.Core/Entities/Invoice.cs:26-38`).

**Not:** `Ettn` ve `EInvoiceNo` tekil indeksleri zaten vardır
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:301-306`); yeni sütunlar bunları değiştirmez.

### 6.2 Yeni tablo: `EInvoiceInbox` (gelen e-belgeler)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `Ettn` | Guid | Tekil indeks |
| `SenderTaxNumber` / `SenderTitle` | string? | Gönderen |
| `DocumentKind` | yeni enum | Fatura / İrsaliye / SMM |
| `Scenario` | `EInvoiceScenario` | Ticari ise kabul/ret beklenir |
| `Number` | string(30)? | Gönderenin belge numarası |
| `IssueDate` | DateOnly | Belge tarihi |
| `Total` / `VatAmount` | decimal | Gelen tutarlar |
| `Status` | yeni enum | `New, Matched, Accepted, Rejected, Objected, Expired` |
| `ReceivedAt` / `RespondedAt` | DateTime | |
| `ObjectionDeadline` | DateOnly? | Ayardan hesaplanır; **doğrulanacak** süre |
| `SupplierId` / `PurchaseInvoiceId` | int? | Eşleşen kayıtlar |
| `RawXmlPath` | string(300)? | Gelen ham XML |
| `Message` | string(500)? | Sağlayıcı mesajı |

İndeksler: `(Status, ReceivedAt)`, `(SenderTaxNumber)`.

### 6.3 Yeni tablo: `EInvoiceArchive` (arşiv defteri)

`InvoiceId`, `Kind` (Xml/Pdf), `Path`, `Size`, `Sha256`, `StoredAt`, `RetainUntil`, `IsSigned`.
Tekil indeks: `(InvoiceId, Kind, IsSigned)`. Neden ayrı tablo: bir fatura için **dört** belge
saklanabilir (bizim XML, imzalı XML, PDF, gelen ham XML); bunları fatura satırında tutmak okunamaz hâle
gelir.

### 6.4 Yeni tablo: `EInvoiceStatusHistory` (durum geçmişi)

`InvoiceId`, `From`, `To`, `At`, `Source` (`Worker`/`Panel`/`Provider`), `Message`, `UserId?`.
Bugün durum **yalnız son hâliyle** saklanır (`Invoice.EInvoiceStatus`); geçmiş yoktur. Geçmiş, kabul
süresinin ve itirazların ispatı için gereklidir.

### 6.5 Yeni tablolar: yalnız gerekli olursa

`EWaybill` (e-İrsaliye) ve `ESmm`/`EMustahsil` tabloları **şimdi açılmaz**. Gerekçe: kapsam
**doğrulanacak** (Luca'da var mı, bize gerekli mi). Tablo açmak, olmayan işi varmış gibi göstermek
olurdu. Karar geldiğinde `Invoice` deseni kopyalanır (`Invoice` + `InvoiceLine` çifti:
`server/YesLojistik.Core/Entities/Invoice.cs:40-53`).

## 7. API uçları

Bugünkü uçlar (`server/YesLojistik.Api/Controllers/EInvoiceController.cs:22-66`) **korunur**;
yanlarına yenileri eklenir.

### 7.1 Mevcut uçlar (değişmez)

| Metot | Yol | Yetki | Bugünkü davranış |
|---|---|---|---|
| GET | `/api/einvoice/info` | `Accounting` | Sağlayıcı adı ve yetenekleri |
| GET | `/api/invoices/{id}/einvoice/xml` | `Accounting` | UBL XML indir |
| POST | `/api/invoices/{id}/einvoice/send` | `Accounting` | Sağlayıcı gönderebiliyorsa gönder |
| POST | `/api/invoices/{id}/einvoice/mark-sent` | `Accounting` | Elle "gönderildi" işaretle |
| POST | `/api/invoices/{id}/einvoice/status` | `Accounting` | Durum sorgula |
| POST | `/api/invoices/{id}/einvoice/cancel-confirmed` | `Accounting` | İptali tamamla |
| GET | `/api/einvoice/recipient/{taxNumber}` | `Accounting` | Mükellefiyet sorgusu |
| GET | `/api/exports/einvoice-xml` | `Accounting` | Tarih aralığı XML zip |

### 7.2 Yeni uçlar

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| POST | `/api/einvoice/queue/{invoiceId}` | `{ at? }` | Belge durumu | `Accounting` |
| DELETE | `/api/einvoice/queue/{invoiceId}` | — | `204` | `Accounting` |
| GET | `/api/einvoice/queue` | `status, page` | `PagedResult<QueueRow>` | `Accounting` |
| POST | `/api/einvoice/{invoiceId}/retry` | — | Belge durumu | `Accounting` |
| GET | `/api/einvoice/{invoiceId}/history` | — | Durum geçmişi | `Accounting` |
| GET | `/api/einvoice/{invoiceId}/archive` | `kind?` | Arşiv kayıtları | `Accounting` |
| GET | `/api/einvoice/{invoiceId}/download?kind=pdf` | — | Dosya | `Accounting` |
| POST | `/api/einvoice/recipients/check` | `{ taxNumbers: [] }` | `{ taxNumber, isUser, aliases }[]` | `Accounting` |
| GET | `/api/einvoice/inbox` | `status, from, to, page` | `PagedResult<InboxRow>` | `Accounting` |
| POST | `/api/einvoice/inbox/{id}/accept` | `{ purchaseInvoiceId? }` | Inbox kaydı | `Accounting` |
| POST | `/api/einvoice/inbox/{id}/reject` | `{ reason }` | Inbox kaydı | `Accounting` |
| POST | `/api/einvoice/inbox/{id}/object` | `{ reason }` | Inbox kaydı | `Accounting` |
| POST | `/api/einvoice/inbox/sync` | — | `{ fetched, matched }` | `Accounting` |

Kurallar:

- `retry` yalnız `Failed` ve deneme sayısı limitin altında çalışır; aksi halde
  `DomainException("Deneme sayısı doldu. Belge yönetici onayına düştü.")`.
- `recipients/check` **toplu** sorgudur ama sağlayıcı desteklemiyorsa (`SupportsRecipientCheck = false`,
  bugünkü `manual` gibi: `Providers.cs:16`) tek istekte `501` yerine **boş sonuç + uyarı** döner;
  panelde "Mükellefiyet sorgusu bu bağlantıda yapılamıyor." yazar.
- `inbox/*` uçları sağlayıcı gelen kutusunu desteklemiyorsa `sync` uyarı döner. **Bugün hiçbir sağlayıcı
  desteklemiyor** (arayüzde alma metodu yok), yani bu uçlar önce **`mock`** ile test edilir.
- Tüm yeni uçlarda **ayna ve dönem kilidi** kuralları geçerlidir
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:20-28` ve
  `07-YETKI-ONAY-NUMARALANDIRMA.md` §5.3).

### 7.3 Arayüz genişletmesi (`IEInvoiceProvider`)

Mevcut metotlar **değişmez** (geriye dönük uyumluluk); yenileri **varsayılan gövdeli** eklenir, böylece
`ManualXmlProvider` ve `MockEInvoiceProvider` bozulmaz:

- `bool SupportsInbox => false;`
- `Task<IReadOnlyList<EInvoiceInboxItem>> FetchInboxAsync(DateTime? since, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<EInvoiceInboxItem>>([]);`
- `Task<EInvoiceResult> RespondAsync(EInvoiceInboxItem item, bool accept, string? reason, CancellationToken ct = default) => Task.FromResult(new EInvoiceResult(item.Status, null, "Bu bağlantı yanıt gönderemiyor."));`
- `bool SupportsSigning => false;` — imzayı sağlayıcı atıyor mu (açıkça görünür olsun).

Bu desen, arayüzün bugünkü alışkanlığıyla aynıdır: `SupportsDownload` ve `DownloadAsync` zaten
varsayılan gövdeli tanımlıdır (`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:42`, `:49-50`).

### 7.4 Yeni sağlayıcı ekleme adımları

`docs/ENTEGRATOR-EKLEME.md` §3'te on adım zaten yazılıdır; bu doküman onları **tekrarlamaz**, iki noktayı
netleştirir:

1. `docs/ENTEGRATOR-EKLEME.md` §2 kontrol listesi **doldurulmadan** kod yazılmaz (uydurma uç nokta
   yasak).
2. Kayıt tek satırdır: `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:34`'teki örnek
   satır açılır. **Başka dosya değişmez**; tanınmayan ad davranışı (uyarı + `manual`) korunur (`:56-63`).

## 8. Yetki, onay ve denetim izi

- **Yetki:** tüm e-belge uçları `Accounting` politikasındadır (`EInvoiceController.cs:22`); bu korunur.
  Gelen fatura kabul/red **ek onay** gerektirir: kabul eden kişi ile belgeyi cariye bağlayan kişi aynı
  olabilir, ancak `Rejected`/`Objected` kararı denetim izine gerekçesiyle yazılır.
- **Maker-checker:** iptal onayı (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.2). Kuyruk denemesi dolan belge
  onay merkezine düşer.
- **Denetim izi:** mevcut otomatik alan izleme çalışır (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:54-72`)
  ve e-belge alanları okunur Türkçe adlarla zaten sözlükte vardır: `e-Fatura senaryosu`, `Fatura tipi`,
  `ETTN`, `e-Fatura no`, `e-Fatura durumu`, `e-Fatura mesajı`, `e-Fatura gönderim`, `Tevkifat kodu`,
  `e-Fatura açık`, `e-Fatura seri`, `e-Arşiv seri`, `Varsayılan senaryo`, `GB etiketi`
  (`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:40-42`).
- **Eklenen olaylar** (`07-YETKI-ONAY-NUMARALANDIRMA.md` §5.5 ile aynı listede):
  `EInvoiceSent`, `EInvoiceFailed`, `EInvoiceAccepted`, `EInvoiceRejected`, `EInvoiceCancelRequested`,
  `EInvoiceArchived`, `EInvoiceInboxAccepted`, `EInvoiceInboxRejected`.
- **Gizlilik:** sağlayıcı anahtarları hiçbir dosyaya ve hiçbir denetim kaydına yazılmaz — yalnız ortam
  değişkeninde tutulur (`docs/ENTEGRATOR-EKLEME.md:59`, `:64`). Sağlayıcı hata mesajları kullanıcıya
  düz Türkçe ve **gizli bilgi sızdırmadan** gösterilir; bugünkü yaklaşım korunur
  (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:83`).

## 9. Kabul kriterleri

1. `EInvoice__Provider=manual` iken panelde `Kuyruk` sekmesi **görünür ama pasiftir** ve
   "Bu bağlantı doğrudan gönderemez." yazar; hiçbir istek atılmaz.
2. `EInvoice__Provider=mock` iken kuyruğa alınan belge tek işçi turunda `Sent` olur ve durum sorgusuyla
   `Delivered`, ticari senaryoda `Accepted`'a ilerler.
3. Aynı fatura iki kez kuyruğa alınamaz; ikinci deneme hata verir ve deneme sayacı artmaz.
4. `Failed` durumundaki belge için `retry` en fazla ayarlanan sayıda çalışır; sonrasında hata verir ve
   belge onay merkezinde görünür.
5. `Rejected` olan bir belge **hiçbir** uçtan yeniden gönderilemez (test edilir).
6. Gelen kutusu senkronu eşleşen tedarikçiyi bulur, eşleşmeyen için **kart açmaz**, öneri döner.
7. Kabul edilen gelen fatura `PurchaseInvoice` kaydına bağlanır ve cari borç toplamı
   **tek** kez artar (çift sayım yok — entegrasyon testi ile kanıtlanır).
8. Gerekçesiz ret/red denemesi reddedilir; hata metni gerekçe ister.
9. Gönderilmeden iptal onay gerektirmez; gönderildikten sonra iptal `CancelRequested` üretir ve onay
   kaydı açar.
10. Arşivlenen her XML/PDF kaydı için `Sha256` ve `Size` doludur; aynı `(InvoiceId, Kind, IsSigned)`
    ikinci kez yazılamaz.
11. Arşivlenen XML, ilgili fatura numarasını içerir (doğrulama testi).
12. `GET /api/einvoice/{id}/history` en az `Ready → Sent` iki satır döner.
13. Durum geçmişi kaydı olmadan durum değişikliği yapılamaz (her geçiş tek transaction'da geçmişe
    yazılır).
14. Tüm yeni uçlar ayna modunda yazma denemesinde bugünkü sade Türkçe hatayı döner
    (`MirrorWriteGuard.cs:26`).
15. Mevcut `EInvoiceTests.cs` testlerinin **tamamı** yeşil kalır (regresyon kanıtı);
    `Numbers_are_unique_under_concurrency` ve `Operations_role_cannot_use_einvoice_endpoints` dahil
    (`server/YesLojistik.Tests/Integration/EInvoiceTests.cs:111`, `:157`).
16. Hiçbir test silinmez veya atlanmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `EInvoiceStateMachineTests.cs`
- İzinli geçişler: `Ready→Sent`, `Sent→Delivered`, `Delivered→Accepted`, `Delivered→Rejected`,
  `Ready→Failed`, `Failed→Sent`, `Sent→CancelRequested`, `CancelRequested→Cancelled`.
- Yasak geçişler: `Accepted→Sent`, `Rejected→Sent`, `Cancelled→*`, `Sent→Ready`.
- Kuyruk durumu eklenince: `Queued→Sent` ve `Queued→Cancelled` izinli; `Queued→Delivered` yasak.

Yeni dosya: `EInvoiceRetryPolicyTests.cs`
- Deneme sayacı limitinde durur.
- Başarılı gönderimde sayaç sıfırlanır.
- `NextAttemptAt` geriye gitmez.

Yeni dosya: `EInvoiceArchiveTests.cs`
- Aynı `(InvoiceId, Kind, IsSigned)` üçlüsü iki kez eklenemez.
- `Sha256` hesabı içerik değişince değişir.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Mevcut `EInvoiceTests.cs` **genişletilir** (silinmez). Yeni dosya: `EInvoiceInboxTests.cs`
(`ApiFactory` kullanır — `server/YesLojistik.Tests/Integration/ApiFactory.cs`; sahte e-posta/gönderim
için mevcut `FakeEmailSender`/`FakePushSender` deseni):
- Gelen faturanın eşleşmesi, kabulü, reddi, itirazı.
- Çift sayım yok testi (kabul sonrası cari borç bir kez artar).
- Gelen kutusu desteklemeyen sağlayıcıda `sync` uyarı döner ve hata vermez.

Yeni dosya: `EInvoiceQueueTests.cs`
- Kuyruğa alma, işçi turu (`mock` ile), iptal, kuyruktan çıkarma.
- `manual` sağlayıcıda kuyruk işçisinin **çalışmadığı** kanıtı.

Yeni dosya: `EInvoiceArchiveApiTests.cs`
- Arşiv indirme uçları; yetkisiz rol (`Operations`) **403** alır — bugünkü rol testiyle aynı üslup
  (`server/YesLojistik.Tests/Integration/EInvoiceTests.cs:157`).

### 10.3 Sahte sağlayıcıyla test (zorunlu)

`MockEInvoiceProvider` bugün gönderim, durum, iptal ve alıcı sorgusunu taklit eder
(`server/YesLojistik.Infrastructure/EInvoice/Providers.cs:30-56`). **CI'dan gerçek entegratöre istek
atılmaz** (`docs/ENTEGRATOR-EKLEME.md:67`). Yeni yetenekler için `mock` genişletilir:
gelen kutusu (iki sahte belge), kabul/red yanıtı, imzalı XML/PDF indirme. `MockEInvoiceProvider`
**yalnız test** amaçlıdır; canlıda `EInvoice__Provider=mock` kullanılmaması gerektiği ayar ekranında
yazılır.

### 10.4 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `e-belge.spec.ts`
- `mock` sağlayıcıyla fatura kes → kuyruğa al → durumu sorgula → `Alıcıya ulaştı` rozeti.
- XML indir → dosya iner.
- Gelen kutusunda fatura reddet → gerekçe zorunlu hatası görünür.

Yeni dosya: `new-ui/e-belge.spec.ts`
- Yeni görünümde `Kuyruk` sekmesinin çizildiği ve `manual` sağlayıcıda pasif olduğu doğrulanır
  (`useNewUi` yardımcısı: `client/e2e/helpers.ts:44-46`).

Mevcut `client/e2e/workflow.spec.ts` ve `client/e2e/forms.spec.ts` e-belge akışına dokunduğu için
regresyon amacıyla koşulmaya devam eder.

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `Invoices` sütunları + `EInvoiceArchive` + `EInvoiceStatusHistory` + migration | 2,5 | `05-VERI-MODELI.md` |
| 2 | Durum makinesi + geçmiş yazımı | 2 | 1 |
| 3 | Kuyruk + işçi + yeniden gönderim | 3 | 2 |
| 4 | `IEInvoiceProvider` genişletmesi (varsayılan gövdeli metotlar) | 1 | — |
| 5 | `MockEInvoiceProvider` genişletmesi (gelen kutusu, indirme) | 1,5 | 4 |
| 6 | Gelen kutusu tablosu + uçlar + senkron | 3 | 4 |
| 7 | Arşivleme (XML/PDF kaydetme, `Sha256`, saklama bitişi) | 2 | 1 |
| 8 | E-Belgeler ekranı (5 sekme) | 4 | 3, 6, 7 |
| 9 | Ayarlar sekmesi genişletmesi | 1,5 | 3 |
| 10 | Toplu mükellefiyet sorgusu + panel | 1,5 | 4 |
| 11 | Gerçek adaptör (entegratör seçildikten sonra) | 4-6 | `docs/ENTEGRATOR-EKLEME.md` §2 doldurulması |
| 12 | İade/ihracat senaryoları | 2 | `11-SATIS-FATURA.md` |
| 13 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam (adaptör hariç)** | | **~29 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo/alan sözleşmesi), `06-MUHASEBE-MOTORU.md`
(e-belgenin fişe bağlanması), `07-YETKI-ONAY-NUMARALANDIRMA.md` (seri, limit, onay, denetim olayları).

**Bu dokümanı bekleyenler:** `11-SATIS-FATURA.md` (senaryo/iade), `12-SATIN-ALMA.md` (gelen fatura →
alınan fatura bağlantısı), `13-SIPARIS-TEKLIF.md` (e-İrsaliye), `21-SAYIM-BARKOD.md` (irsaliye-irsaliye
eşleşmesi), `28-MUHASEBECI-PAKETI.md` (mali müşavire XML/veri aktarımı), `33-BILDIRIM-EPOSTA-SMS-KEP.md`
(fatura e-postası — bugün `InvoiceMailer` ile kısmen var), `35-DENETIM-IZI-KVKK-UYUM.md` (saklama/imha).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| **Çift gönderim** (en pahalı hata) | Yüksek | Zaman aşımında önce **sorgula**, sonra gönder; durum geçişleri tek transaction; `Sent` sonrası gönderim yasağı bugünden var (`EInvoiceService.cs:72`) | Belge iptal + yeniden kesme (numara korunur) |
| Numarayı entegratörün vermesi → numara boşluğu/tekrarı | Yüksek | `docs/ENTEGRATOR-EKLEME.md:44` sorusu sözleşmede netleşmeden adaptör yazılmaz; gelen numara 16 karakterde kırpılır (`EInvoiceService.cs:141`) | `manual` sağlayıcıya dönüş: `EInvoice__Provider=manual` (tek satır) |
| Kuyruk işçisinin yoğun gönderim yapması (hız sınırı) | Orta | Deneme sayısı + aralık ayardan; tek seferde tavan (bugünkü worker 200 sınırı: `EInvoiceStatusWorker.cs:27`) | İşçiyi durdurma: `CanSend=false` sağlayıcıya dönüş |
| İtiraz süresinin yanlış varsayılması | Yüksek | Süre **ayardan**; kodda sabit yok; varsayılan **yazılmaz**, kullanıcı girer | Ayarı düzeltmek yeterli (veri değişmez) |
| Gelen faturanın yanlış cariye bağlanması | Yüksek | Eşleşme yalnız VKN ile; eşleşmezse **kart açılmaz**, öneri verilir | Kabul kaydı geri alınır (onay kaydı ve denetim izi kalır) |
| Saklama süresi uygulamasının yanlış olması (veri kaybı) | Yüksek | Otomatik silme **yok**; yalnız uyarı rozeti | Silme kararı ayrı doküman (`35`) |
| Arşiv büyümesi (depolama maliyeti) | Orta | PDF + XML çift saklama bilinçli; boyut arşiv listesinde görünür | Yalnız imzalı XML saklama modu |
| Mali mühür/e-imza temininin gecikmesi | Yüksek | `manual` akış bu sürede çalışmaya devam eder; sistem beklemeye girmez | — |
| Sağlayıcı anahtarının sızması | Yüksek | Anahtar yalnız ortam değişkeni; panele yazılmaz; hata mesajı gizli bilgi sızdırmaz (`docs/ENTEGRATOR-EKLEME.md:64`) | Anahtar yenileme (kod değişmez) |
| e-İrsaliye/e-SMM/e-Müstahsil kapsamının yanlış varsayılması | Orta | Bu doküman o türler için **tablo açmaz**, kapsamı doğrulanacak yazar | Gerekirse `Invoice` deseni kopyalanır |

**Doğrulanacaklar:**

1. **doğrulanacak:** e-Fatura numarasını biz mi veriyoruz yoksa entegratör mü atıyor; seri/önek kuralları
   ve yıl sıfırlaması (`docs/ENTEGRATOR-EKLEME.md:44-45`).
2. **doğrulanacak:** İmzayı (mali mühür) biz mi atıyoruz yoksa entegratör mü; UBL `Signature` düğümü
   kimin sorumluluğunda (`docs/ENTEGRATOR-EKLEME.md:33`).
3. **doğrulanacak:** Gelen fatura kabul/red ve **itiraz süresi**: kaç gün, hangi andan başlar —
   mali müşavir/GİB.
4. **doğrulanacak:** e-Arşiv iptalinin API ile mi, portal üzerinden mi yapıldığı — entegratör.
5. **doğrulanacak:** XML/PDF arşivinin **10 yıl** saklanması zorunluluğu ve sorumlunun kim olduğu
   (biz mi, entegratör mü) — `docs/ENTEGRATOR-EKLEME.md:53`, mali müşavir/avukat.
6. **doğrulanacak:** e-İrsaliye kapsamı ve zorunluluğu; şirketimize gerekli mi.
7. **doğrulanacak:** e-SMM ve **e-Müstahsil** gerekli mi (envanterde e-SMM var, e-Müstahsil yok:
   `docs/plan-erp/02-LUCA-ENVANTERI.md:75`).
8. **doğrulanacak:** e-Defter berat/arşiv sorumluluğu ve aktarım biçimi.
9. **doğrulanacak:** BA-BS verisinin bizde üretilip üretilmeyeceği (Luca'da var:
   `docs/plan-erp/02-LUCA-ENVANTERI.md:31`).
10. **doğrulanacak:** GİB özel entegratör listesi ve aday firmaların güncel durumu
    (`docs/ENTEGRATOR-EKLEME.md:93`).
11. **doğrulanacak:** Kontör modeli (fatura başı/paket), gelen faturaların kontör harcayıp harcamadığı
    (`docs/ENTEGRATOR-EKLEME.md:50`).
12. **doğrulanacak:** Entegratörün webhook desteği; yoksa yalnız sorgu ile ilerlenir
    (`docs/ENTEGRATOR-EKLEME.md:39`).
13. **doğrulanacak:** Entegratör değiştirilirken eski faturaların ve numaraların taşınması
    (`docs/ENTEGRATOR-EKLEME.md:54`).
14. **doğrulanacak:** KVKK kapsamında verinin nerede tutulduğu ve veri işleme sözleşmesi
    (`docs/ENTEGRATOR-EKLEME.md:55`).

Sonraki belgeyle bağlantı: bu doküman `07-YETKI-ONAY-NUMARALANDIRMA.md`'nin seri/onay/denetim
altyapısını kullanır, `06-MUHASEBE-MOTORU.md`'ye belge→fiş bağlantısını devreder ve `11-SATIS-FATURA.md`
ile `12-SATIN-ALMA.md`'ye e-belge durum makinesini verir; `docs/ENTEGRATOR-EKLEME.md` bu dokümanın
sağlayıcı tarafındaki uygulama rehberi olarak geçerliliğini korur.
