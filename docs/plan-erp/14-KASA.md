# 14 — Kasa

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, panelde hâlihazırda var olan **kasa/banka hesabı ve hareket** altyapısını gerçek bir kasa
modülüne çevirir. Bugün kasa **bir hesap listesi ve türetilmiş hareket dökümüdür**; kasiyer, gün sonu,
kasa sayımı, para birimi ve kasa defteri yoktur.

Kapsam:

- **Kasa tanımları**: TL ve döviz kasası, banka, POS, kredi kartı hesapları; açılış bakiyesi ve tarihi.
- **Kasa hareketleri**: tahsilat, ödeme, **virman**, masraf (gider), **avans** (şoför/personel),
  iade (müşteriye iade, tedarikçiden iade), komisyon girişi.
- **Gün sonu / kasa sayımı** ve **fark kaydı** (sayılan ile beklenen arasındaki fark, gerekçesiyle).
- **Kasa defteri** ve raporları (günlük hareket, hesap ekstresi, devir–hareket–kapanış).
- **Yetki (kasiyer)**: kasa işlemlerini yapan rol, limiti ve onay zinciri.
- **Kasa–muhasebe bağlantısı**: her kasa hareketinin **yevmiye** fişine yansıması.
- **Banka ile virman**: kasadan bankaya yatırma, bankadan kasa çekme (ayrıntı: `15` dokümanı).

Kapsam dışı: satış faturası (bkz. `11-SATIS-FATURA.md`), satın alma (bkz. `12-SATIN-ALMA.md`),
çek/senet portföy yönetimi (`server/YesLojistik.Infrastructure/Services/CashService.cs:108-112`
portföydeki çeki hesaba katmaz; çek modülü ayrı dokümandadır), banka ekstresi mutabakatı (`15`),
muhasebe çekirdeğinin hesap planı (muhasebe dokümanı).

Bu modülün çözdüğü üç sorun: (1) "Kasada bugün ne var, ne kadar olmalı?" (2) "Bu para nereden geldi,
nereye gitti?" (3) "Sayımda fark çıktı, kimin, neden?"

## 2. Luca'daki karşılığı

Luca Koza'nın **Finans Yönetimi** ve **Gelir-Gider Yönetimi** modülleri bu dokümanın referansıdır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:12`, `:21`). Siteden okunan ilgili maddeler:

- **İş merkezi** tanımı: birden fazla iş merkezi **gelir-gider yeri** olarak tanımlanır; gelir-gider
  türleri tanımlanır (`02-LUCA-ENVANTERI.md:59`) — kasa masraf/gelir türlerinin karşılığı.
- Tüm işlemlerin **tek ekrandan muhasebeleştirilmesi**, belge üzerinden **muhasebe fişi iptali**
  (`02-LUCA-ENVANTERI.md:46-47`) — kasa hareketi → yevmiye bağlantısının karşılığı.
- **Banka ekstrelerinin** sisteme entegrasyonu ve **banka entegrasyonu**
  (`02-LUCA-ENVANTERI.md:42`, `:67`) — virman ve mutabakatın karşılığı.
- **Çek/Senet modülü**: alacak/borç çek ve senetleri tüm detay hareketleriyle takip
  (`02-LUCA-ENVANTERI.md:58`).
- **FIFO cari yaşlandırma + adat** (faiz) hesaplama (`02-LUCA-ENVANTERI.md:36`).
- Ayrıntılı **yetkilendirme** ile iş planı yapabilme (`02-LUCA-ENVANTERI.md:51`) — kasiyer yetkisinin
  karşılığı.
- Farklı **döviz cinslerinden** işlem (`02-LUCA-ENVANTERI.md:55`) — döviz kasasının karşılığı.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'da kasa sayımı/gün sonu ekranının alanları ve fark kaydının muhasebeleşmesi —
kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da döviz kasasında kur farkının nasıl
işlendiği ve hangi kurun kullanıldığı — kaynak: mali müşavir. **doğrulanacak:** kasiyer yetkisinin
Luca'daki karşılığı ve limit mekanizması — kaynak: Luca kılavuzu + kullanıcı iş kararı.

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Hesap tanımı.** `server/YesLojistik.Core/Entities/CashAccount.cs:4-14`: ad, tür
  (`Cash`/`Bank`/`Pos`/`CreditCard`, `Enums.cs:63`), IBAN, **açılış bakiyesi** (`:9`) ve
  **açılış tarihi** (`:10`), aktif/pasif, ayna kimliği. **Para birimi alanı YOKTUR**; tüm tutarlar TL
  kabul edilir (UBL tarafında da para birimi sabittir:
  `server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs:19`).
- **Virman.** `CashAccount.cs:16-26` — `CashTransfer`: çıkış hesabı, giriş hesabı, tarih, tutar, not.
- **Bakiye hesabı.** `server/YesLojistik.Infrastructure/Services/CashService.cs:9-13` açıkça yazar:
  bakiye **saklanmaz**, hareketlerden hesaplanır. Formül: devir + tahsilatlar (çek/senet yalnız
  **tahsil edilince**) + şoförden alınan + gelen virman − tedarikçi ödemeleri (ciro hariç) − firmanın
  ödediği **onaylı** giderler − şoföre ödemeler − giden virman.
- **Hareket üretimi.** `CashService.cs:18-62` tüm kaynakları okur: müşteri tahsilatları ve **negatif
  tutarlı iade** (`:21-25`), tedarikçi ödemeleri ve **negatif tutarlı "tedarikçiden iade"** (`:26-30`),
  **yüklenmiş/yoldaki/teslim** durumundan bağımsız olarak onaylı ve vadeli olmayan giderler (`:31-36`),
  şoför ödemeleri ve şoförden alınanlar (`:37-41`), personel avansı ve **maaş ödemesi** (`:42-46`,
  bonus hariç), hesaba alınmış **komisyon** (`:48-53`), virmanın iki bacaklı kaydı (`:54-60`).
- **Hareket dökümü.** `CashService.cs:72-86`: açılış bakiyesi "Devir" satırı olarak eklenir
  (`:77-79`), hareketler tarihe göre sıralanır ve **yürüyen bakiye** hesaplanır (`:80-84`). Her satırda
  kaynağa giden bağlantı vardır (`Link`).
- **Nakit akışı öngörüsü.** `CashService.cs:92-119`: önümüzdeki 4 hafta + gecikmiş dilimi; beklenen
  tahsilat (açık fatura kalanları + portföydeki/tahsildeki çek ve senetler), beklenen ödeme (tedarikçi
  kalemleri), devirdeki nakit (kredi kartı hesabı **hariç**, `:116`).
- **Müşteri risk limiti.** `CashService.cs:122-132`: açık bakiye + faturalanmamış teslim sevkiyatları.
- **Uçlar ve yetki.** `server/YesLojistik.Api/Controllers/CashController.cs`: `GET /api/cash-accounts`
  ve `/{id}/movements` **`Policies.Accounting`** (`:18-19`, `:27-29`); seçim listesi
  `GET /api/cash-accounts/lookup` tüm ofis kullanıcılarına açık (`:22-25`). Hesap silme, hareketi olan
  hesapta **engellenir** (`:57-67`, mesaj: "Hareketi olan hesap silinemez; pasife alabilirsiniz.").
  Virman uçları da muhasebe yetkisindedir ve aynı hesaba virman reddedilir
  (`:94-98`, message: "Çıkış ve giriş hesabı aynı olamaz.").
- **Ekran.** `client/src/pages/CashAccountsPage.tsx`: hesap listesi ve bakiye (`:33-39`), toplam nakit
  ve banka (kredi kartı hariç, `:39`, `:43`), hesap formu (`:130-161`: tür, ad, IBAN, açılış bakiyesi
  ve tarihi, aktif/pasif; kredi kartında negatif bakiye ipucu `:150`), hareket tablosu
  (`:75-110`; tarih, işlem, giriş, çıkış, bakiye), son virmanlar ve silme (`:111-125`),
  virman formu (`:163-198`: çıkış/giriş hesabı, tutar, tarih, not).
- **Hareket girişleri nereden yapılır.** Tahsilat `client/src/components/PaymentForm.tsx`
  (çek/senet için vade zorunlu, `:32`), tedarikçi ödemesi `SupplierPaymentForm`, gider
  `client/src/pages/ExpensesPage.tsx:291-295` ("Kasa / Banka" seçimi), şoför ödemesi ve personel
  avansı ilgili ekranlardan. Bu formlar hesabı **seçtirir**, hareketi kendi modülünde oluşturur.
- **Menü ve test.** Menüde "Kasa / Banka" (klasik, `client/src/lib/nav.ts:56`) ve **"Bankalar"**
  (yeni görünüm, `nav.ts:110`); bölüm sekmesi `client/src/lib/sections.ts:33`. Kapsamlı kasa testi
  vardır: `server/YesLojistik.Tests/Integration/CashTests.cs:56-81` (açılış 1.000 + tahsilat 3.000 −
  gider 400 − virman 2.500 = 1.100; portföydeki çek hesaba girmez, tahsil edilince girer, `:65-79`) ve
  yetki testi `:108-112` (operasyon kullanıcısı `GET /api/cash-accounts` ve `/api/dashboard/cash-flow`
  için **403**, `/api/cash-accounts/lookup` için **200**).

**Olmayanlar (kanıtlı).** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43` içinde
`CashCount`, `CashSession`, `JournalEntry`, `ExchangeRate`, `CashierLimit` **yoktur**. Kodda **gün
sonu, kasa sayımı, fark kaydı, kasa defteri (yazdırılabilir), kasiyer rolü/limiti, para birimi ve kur
farkı yoktur**. `CashAccountKind` (`Enums.cs:63`) yeni bir tür gerektirmez. Gider kategorileri
(`ExpenseCategory`, `Enums.cs:43`) ve `ExpensePaidBy` (`:8`) mevcut kasa etkisini belirler
(`CashService.cs:31-36`).

**Eksik listesi:** döviz kasası ve kur, gün sonu/kasa sayımı, fark kaydı ve gerekçesi, kasiyer rolü ve
limit, kasa defteri çıktısı, hareket bazlı makbuz, kasa hareketine yevmiye fişi bağlantısı, "kasa
hareketi elle ekleme" (bugün tüm hareketler başka modüllerden doğar), hesap bazlı yetki.

## 4. Hedef ekranlar ve alanlar

### 4.1 Kasa / Banka (`/kasa-banka`)

Mevcut ekran korunur; eklenenler:

- Hesap kartında **para birimi** ve (dövizse) **güncel kur** ve **TL karşılığı**.
- Hesap kartı sekmeleri: **Hareketler**, **Gün Sonu**, **Sayımlar**.
- Üstte düğmeler: **Virman**, **Gün Sonu Al**, **Kasa Sayımı**, **Hesap Ekle**.
- Süzgeç: tarih aralığı, hareket türü (Tahsilat / Ödeme / Virman / Masraf / Avans / İade / Komisyon),
  tutar aralığı, kullanıcı (kim girdi).

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Hesap adı | metin (60) | evet | Tekrar edebilir; tür + para birimi ile ayırt edilir |
| Tür | seçim: Kasa / Banka / POS / Kredi Kartı | evet | Mevcut `cashAccountKindLabel` etiketleri korunur |
| **Para birimi** | seçim: TL / USD / EUR (**doğrulanacak**) | evet (varsayılan TL) | Dövizde kur alanı açılır |
| IBAN | metin | bankada evet | `IbanValidator.Normalize` (mevcut) |
| Açılış bakiyesi | tutar | evet | Negatif olabilir (kredi kartı borcu) |
| Açılış tarihi | tarih | evet | "Devir" satırının tarihi |
| Kasiyer | seçim (kullanıcı) | hayır | Sorumlu kişi; gün sonunda imza |
| Günlük limit | tutar | hayır | Bu limiti aşan çıkışta onay gerekir |
| Aktif | anahtar | evet | Pasif hesap yeni harekette seçilemez |

### 4.2 Kasa Hareketi Ekle (yeni, elle kayıt)

Bugün hareketler yalnız diğer modüllerden doğar. Yeni form, **kasa kaynaklı düzeltmeler** için gerekli:
tür (Masraf / Avans / İade / Komisyon / Diğer), tarih, tutar, hesap, karşı taraf (tedarikçi / şoför /
personel / müşteri), açıklama, gerekçe, belge eki. Banka/kasa dışı türler (tahsilat, tedarikçi ödemesi)
**buradan girilemez**; kullanıcı doğru ekrana yönlendirilir.

### 4.3 Gün Sonu ve Kasa Sayımı

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Hesap | seçim | evet | Kasa türü önerilir |
| Tarih | tarih | evet | Gün sonu alındığı gün |
| Devir (açılış) | tutar (salt okunur) | — | Günün ilk bakiyesi |
| Gün içi giriş / çıkış | tutar (salt okunur) | — | Hareketlerden |
| **Beklenen bakiye** | tutar (salt okunur) | — | Devir + giriş − çıkış |
| **Sayılan tutar** | tutar (girilir) | evet | Kasadaki fiilî para |
| **Fark** | tutar (salt okunur) | — | Sayılan − beklenen; 0 değilse kırmızı |
| Fark gerekçesi | metin (300) | fark varsa **evet** | "Kasada unutulmuş", "para üstü hatası"… |
| Kapatan kişi | kullanıcı (otomatik) | — | Oturumdaki kullanıcı |
| Onaylayan | kullanıcı | fark varsa evet | Farkı ikinci kişi onaylar |

Kurallar: gün sonu alınmadan aynı gün için ikinci kez alınamaz; alınmış günün hareketi düzenlenirse
gün sonu "geçersiz" işareti alır ve yeniden alınması istenir. Sıfır farklı gün sonu **onay istemez**.

### 4.4 Kasa Defteri ve Raporlar (`/raporlar/kasa`)

- **Günlük kasa defteri:** tarih, devir, giriş toplamı, çıkış toplamı, kapanış, fark; altında hareket
  dökümü (tür, açıklama, karşı taraf, tutar, giriş/çıkış, yürüyen bakiye). PDF ve Excel.
- **Hesap ekstresi:** tarih aralığında hareketler + devir/kapanış (bugünkü ekranla aynı veri,
  yazdırılabilir).
- **Sayım farkı raporu:** tarih aralığında gün sonu farkları, gerekçeleri ve kapatan/onaylayan kişi.
- **Nakit durumu:** tüm hesapların bakiyesi (dövizde TL karşılığı ve kur), kredi kartı borcu ayrı
  satırda. Bugünkü "Toplam nakit ve banka" göstergesi (`CashAccountsPage.tsx:39,43`) korunur.

## 5. İş kuralları

1. **Bakiye saklanmaz.** Hesap bakiyesi her sorguda hareketlerden hesaplanır
   (`CashService.cs:9-13`). Gün sonu kaydı bir **fotoğraf**tır; bakiyeyi değiştirmez.
2. **Hesaba giriş zamanı.** Müşteri çeki/senedi yalnız **tahsil edildiğinde** hesaba girer
   (`CashService.cs:22`, `:108-112`); portföydeki çek bakiye ve nakit akışında görünmez
   (test: `CashTests.cs:65-67`). Bu kural değişmez.
3. **Gider etkisi.** Gider hesaba yalnız **firmanın ödediği**, **vadeli olmayan** ve **onaylanmış**
   durumda yansır (`CashService.cs:32-33`). Reddedilen gider toplama girmez
   (`client/src/pages/ExpensesPage.tsx:125`).
4. **Virman iki bacaklıdır.** Aynı tutar çıkış hesabından düşer, giriş hesabına eklenir
   (`CashService.cs:56-60`). Aynı hesaba virman yasaktır
   (`CashController.cs:97`). Döviz hesapları arasında virman varsa **kur farkı** ayrı satır olur;
   kâr/zarar hesabı mali müşavir onayına bağlıdır.
5. **Döviz kasası.** Döviz hesabında tutar **işlem para biriminde** saklanır; TL karşılığı işlem
   tarihindeki **kurla** hesaplanır ve saklanır. Kur sonradan değişmez; rapor TL karşılığını gösterir.
   (Kur kaynağı **doğrulanacak:** TCMB/TMB/elle.) Bakiye toplamı TL'ye çevrilirken **güncel** kur
   kullanılır; iki değer ekranda ayrı gösterilir ("döviz bakiyesi" ve "TL karşılığı").
6. **Gün sonu.** Bir hesap+tarih için **tek** gün sonu kaydı olur. Beklenen bakiye = devir + gün içi
   giriş − çıkış. Sayılan tutar girildikten sonra hareket eklenirse gün sonu **geçersiz** olur ve
   yeniden alınmadan yeni gün sonu açılmaz (veri tutarlılığı).
7. **Fark kaydı.** Fark ≠ 0 ise gerekçe **zorunlu** ve **ikinci kişi onayı** gerekir. Fark, kasa
   bakiyesini **otomatik düzeltmez**; düzeltme, "Diğer" türünde bir **düzeltme hareketi** ve gerekçesi
   ile yapılır. Bu, sessiz bakiye değişikliğini engeller.
8. **Kasiyer limiti.** Kasadan yapılan çıkış (masraf, avans, iade) kasiyerin günlük limitini aşarsa
   kayıt **"onay bekliyor"** durumuna düşer ve muhasebe onaylayana kadar bakiye hesabına **girmez**.
   Onay mekanizması mevcut `ApprovalStatus` desenini kullanır
   (`server/YesLojistik.Core/Entities/Enums.cs:10`, gider onayı örneği
   `client/src/pages/ExpensesPage.tsx:85-88`).
9. **Yevmiye bağlantısı.** Her kasa hareketi bir **yevmiye fişi** doğurur: tahsilat (kasa borç / cari
   alacak), ödeme (tedarikçi borç / kasa alacak), masraf (gider borç / kasa alacak), virman (giriş
   hesabı borç / çıkış hesabı alacak). Fiş, hareketle **tek transaction** içinde yazılır; fiş
   üretilemezse hareket kaydedilmez.
10. **İptal ve silme.** Kasa hareketi doğrudan silinmez; kaynağı olan belge (tahsilat, ödeme, gider)
    iptal edilir. Kaynak belge silinemiyorsa hareket **düzeltme kaydı** ile kapatılır. Ham
    `DELETE /api/cash-accounts/{id}` yalnız **hareketsiz** hesapta çalışır
    (`CashController.cs:59-67`); bu kural korunur.
11. **Devir.** Açılış bakiyesi ve tarihi zorunludur; geçmiş hareket girişi devir tarihinden önce
    yapılamaz. Devir değiştirilirse gün sonları geçersiz olur ve yeniden alınır.
12. **Kredi kartı.** Kredi kartı hesabı "nakit" sayılmaz; nakit durumu toplamında **hariç** tutulur
    (`CashService.cs:116`, `CashAccountsPage.tsx:39`). Kart borcu negatif bakiye olarak görünür.
13. **Komisyon.** "Hesaba alınan" komisyon ilgili hesaba giriş yazar
    (`CashService.cs:48-53`); komisyonun faturası kesilmemişse bile kasa hareketi oluşur, ancak
    muhasebe eşleştirmesi mali müşavir onayı gerektirir.
14. **Doğrulamalar.** Tutar > 0, tarih devir tarihinden önce olamaz, virman hesapları farklı olmalı,
    döviz hesabında para birimi ve kur zorunlu, fark gerekçesi boş bırakılamaz.

## 6. Veri modeli

**Eklenecek alanlar (yalnız ekleme migration; boş olabilir):**

`CashAccount` (mevcut, `CashAccount.cs:4`): `CurrencyCode string(3)?` (boş = TL),
`OpeningExchangeRate decimal?`, `CashierUserId int?`, `DailyOutLimit decimal?`,
`CountRequired bool` (gün sonu zorunlu mu), `IbanBankName string(60)?`.

`CashTransfer` (mevcut, `CashAccount.cs:17`): `ExchangeRate decimal?`, `TargetAmount decimal?`
(farklı para biriminde giriş tutarı), `JournalEntryId int?`.

`Payment` (mevcut, `Payment.cs:3`) ve `SupplierPayment` (mevcut, `SupplierPayment.cs:4`):
`ExchangeRate decimal?`, `JournalEntryId int?`, `CashSessionId int?`.

`Expense` (mevcut, `Expense.cs:3`): `JournalEntryId int?`, `CashSessionId int?`, `ApprovedByUserId int?`
(onaylayan; bugün yalnız `ReviewedBy` metni vardır: `Expense.cs:36`).

`StaffTransaction` (mevcut) ve `DriverSettlement` (mevcut, `Enums.cs:46` ile yön):
`JournalEntryId int?`, `CashSessionId int?`.

**Yeni tablolar:**

| Tablo | Ana alanlar | İlişki |
|---|---|---|
| `CashSession` | AccountId, Date, OpeningBalance, TotalIn, TotalOut, ExpectedBalance, CountedAmount, Difference, DifferenceReason, ClosedByUserId, ClosedAt, ApprovedByUserId?, ApprovedAt?, Status (Açık/Kapalı/Geçersiz/Onay bekliyor), Note | `AccountId → CashAccount` |
| `CashCount` | SessionId, CountedAt, CountedByUserId, Denominations (JSON: 200/100/50/20/10/5/1 ve kuruş adetleri), CountedAmount, Note | `SessionId → CashSession` |
| `CashMovement` | AccountId, Date, Kind (Tahsilat/Ödeme/Virman/Masraf/Avans/İade/Komisyon/Düzeltme), Amount, CurrencyCode, ExchangeRate, AmountTry, CounterpartyType, CounterpartyId?, Description, SourceType (Payment/SupplierPayment/Expense/Settlement/StaffTransaction/Transfer/Manual), SourceId?, JournalEntryId?, CreatedByUserId, SessionId? | Kasa hareketinin **elle eklenen** ve **düzeltme** kayıtları; diğerleri türetilmiş kalır |
| `CashierLimit` | UserId, DailyOutLimit, CurrencyCode, IsActive | — |

**Önemli tasarım kararı.** Mevcut türetilmiş hareket mantığı (`CashService.cs:18-62`) **bozulmaz**;
`CashMovement` tablosu yalnız **elle eklenen** hareketleri ve **düzeltmeleri** tutar. Böylece
çift sayım riski olmaz: bir hareket ya türetilmiştir ya elle girilmiştir, ikisi birden olamaz. Elle
girilen hareket `SourceType = Manual` ile işaretlenir ve ekranda ayırt edilir.

`JournalEntry`/`JournalLine` tabloları muhasebe dokümanındadır; burada yalnız `JournalEntryId`
bağlantı alanları eklenir. Migration yalnız ekleme yapar (`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

Mevcut uçlar korunur (`CashController.cs:15-113`): `GET /api/cash-accounts` (muhasebe),
`GET /api/cash-accounts/lookup` (ofis), `GET /api/cash-accounts/{id}/movements` (muhasebe),
`POST/PUT/DELETE /api/cash-accounts`, `GET/POST/DELETE /api/cash-transfers` (muhasebe).
Ayrıca nakit akışı `GET /api/dashboard/cash-flow` ve risk `GET /api/customers/{id}/risk`
(`CashService.cs:92-132`); operasyon rolü nakit akışında **403** alır
(`CashTests.cs:108-112`).

**Eklenecek uçlar:**

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/cash-accounts/{id}/ledger` | tarih aralığı | devir/hareket/kapanış satırları | muhasebe |
| POST | `/api/cash-accounts/{id}/movements` | tür, tarih, tutar, karşı taraf, gerekçe | hareket | kasiyer (limit içi) |
| POST | `/api/cash-sessions` | hesap, tarih, sayılan tutar, fark gerekçesi | gün sonu | kasiyer |
| GET | `/api/cash-sessions` | hesap, tarih aralığı | gün sonu listesi | muhasebe |
| POST | `/api/cash-sessions/{id}/approve` | — | gün sonu | muhasebe (fark onayı) |
| POST | `/api/cash-sessions/{id}/count` | kupür adetleri | sayım | kasiyer |
| GET | `/api/cash-sessions/{id}/pdf` | — | kasa defteri PDF | muhasebe |
| GET | `/api/cash-sessions/export` | tarih aralığı | Excel | muhasebe |
| GET | `/api/reports/cash/counts` | tarih aralığı | fark raporu | muhasebe |
| GET | `/api/reports/cash/daily` | tarih aralığı | günlük özet (tüm hesaplar) | muhasebe |
| GET/POST | `/api/cashier-limits` | kullanıcı, limit | limit | yönetici |

Mevcut `CashMovementDto` yanıtı yeni alanlarla genişletilir (`CurrencyCode`, `ExchangeRate`,
`SourceType`, `Manual`, `SessionId`); **mevcut alan adı ve sırası korunur** (ekran kırılmaz:
`client/src/pages/CashAccountsPage.tsx:94-105`). Hata metinleri bugünkü gibi Türkçe ve sadedir
("Hareketi olan hesap silinemez; pasife alabilirsiniz.", "Çıkış ve giriş hesabı aynı olamaz.").

## 8. Yetki, onay ve denetim izi

| İş | Operasyon | **Kasiyer** | Muhasebe | Yönetici |
|---|---|---|---|---|
| Hesap listesi | — | yaz | yaz | yaz |
| Hesap bakiyesi/movements | — | yaz | yaz | yaz |
| Hesap ekle/düzenle/pasife al | — | — | yaz | yaz |
| Kasa hareketi ekle (limit içi) | — | yaz | yaz | yaz |
| Kasa hareketi ekle (limit üstü) | — | onaya gönderir | onaylar | onaylar |
| Virman | — | — | yaz | yaz |
| Gün sonu al | — | yaz | yaz | yaz |
| Fark onayı | — | — | yaz | yaz |
| Kasa defteri/rapor | — | — | yaz | yaz |
| Kasiyer limiti tanımı | — | — | — | yaz |
| Nakit akışı öngörüsü | — | — | yaz | yaz |

**Not (kanıtlı çelişki).** Bugün `CashAccountKind.Lookup` dışındaki tüm kasa uçları **`Policies.Accounting`**
ile korunur (`CashController.cs:18-19`, `:27-29`) ve operasyon kullanıcısı 403 alır
(`CashTests.cs:108-112`). Bu doküman **kasiyer** adında yeni bir yetki düzeyi önerir; bu, mevcut
davranışı **gevşetmez**: kasiyer yalnız kendi hesabında, limiti içinde **hareket ekleyebilir**, hesap
tanımını ve raporları göremez. Kasiyer yetkisi verilmemiş kullanıcılar bugünkü gibi davranır. **Not:**
yeni yetki eklenmeden önce kullanıcı onayı gerekir (`01-ORTAK-SARTNAME.md:26-27` rol/yetki maddesi).

**Maker-checker.** (a) Limit üstü kasa çıkışı, (b) farklı gün sonu, (c) devir/açılış bakiyesi
değişikliği, (d) elle eklenen "Düzeltme" hareketi ikinci kişi onayı ister. Onaylanana kadar bakiye
**değişmez**.

**Denetim izi.** Mevcut `AuditLog` kullanılır: kullanıcı, zaman, hesap, hareket, alan bazında eski→yeni
değer, gerekçe. Gün sonu kayıtları silinmez; geçersiz olan "Geçersiz" durumuna geçer ve yeni kayıt
açılır, böylece sayım geçmişi tam kalır. Yevmiye fişi bağlantısı (`JournalEntryId`) izlenebilir olur.

## 9. Kabul kriterleri

1. Hesap bakiyesi, hareket dökümü ve hesap kartındaki bakiye **birebir** aynıdır; hiçbir yerde
   saklanan bakiye kullanılmaz (`CashService.cs:9-13`).
2. `CashTests.cs:56-81` senaryosu aynen geçer: 1.000 + 3.000 − 400 − 2.500 = **1.100** ve banka 2.500
   (regresyon testi korunur).
3. Portföydeki çek kasa bakiyesine **girmez**; tahsil edilince girer (`CashTests.cs:65-79`).
4. Gün sonu: beklenen bakiye = devir + giriş − çıkış; sayılan 0 farkla kaydedilir ve onay istemez.
5. Fark varsa gerekçesiz kaydedilemez; kaydedildiğinde "Onay bekliyor" olur ve onaylanana kadar
   geçerli sayılmaz.
6. Gün sonu alındıktan sonra o güne hareket eklenirse gün sonu "Geçersiz" olur ve uyarı görünür.
7. Fark kaydı kasayı **kendiliğinden düzeltmez**; düzeltme ayrı bir hareket ve gerekçe ile yapılır
   (test: fark sonrası bakiye değişmez).
8. Kasiyer limitini aşan çıkış, onaylanana kadar bakiyeyi değiştirmez ve "Onay bekliyor" rozeti taşır.
9. Virman iki hesabın bakiyesini eşit ve ters yönde değiştirir; aynı hesaba virman reddedilir
   (`CashController.cs:97`; test `:70`).
10. Döviz kasasında işlem tutarı ve kur saklanır; TL karşılığı işlem tarihindeki kurdan hesaplanır ve
    sonradan değişmez.
11. Nakit durumu toplamında kredi kartı hesabı **hariçtir** (`CashService.cs:116`).
12. Kasa defteri PDF'i ve Excel'i devir–hareket–kapanış satırlarını ve farkı gösterir; para 2 kuruş,
    tarih `03.10.2026` biçimindedir (`01-ORTAK-SARTNAME.md:56-59`).
13. Hareketsiz hesap silinebilir, hareketli hesap silinemez (`CashController.cs:59-67`); mesaj aynen
    korunur.
14. Operasyon rolü kasa listesinde bugünkü gibi **403** alır; kasiyer yetkisi verilmemişse davranış
    değişmez.
15. 390×844'te yatay kaydırma yok; hareket tablosu kart görünümüne döner, gün sonu formu tam ekran
    çekmecede açılır.

## 10. Testler

**Birim (sunucu):** yeni `server/YesLojistik.Tests/Unit/CashSessionTests.cs` (beklenen bakiye,
sıfır fark, fark gerekçesi, geçersizlik kuralı), `CashLimitTests.cs` (limit sınırı, onay durumu, limit
tam sınırı), `CurrencyBalanceTests.cs` (döviz tutarı, kur, TL karşılığı, kuruş yuvarlaması,
farklı para birimli virman kur farkı). Mevcut `PaymentAllocatorTests.cs` ve `TripProfitTests.cs`
regresyon için koşulur.

**Entegrasyon (sunucu):** mevcut `CashTests.cs` (çek/senet, kasa bakiyesi, virman, nakit akışı, yetki)
**korunur ve genişletilir**: gün sonu, kasa sayımı, fark onayı, kasiyer limiti, döviz hesabı,
yevmiye bağlantısı. Yeni `CashLedgerTests.cs` (devir–hareket–kapanış, ekstre ucu, PDF/Excel çıktısı
satır sayısı), `CashSessionTests.cs` (entegrasyon: gün sonu → hareket → geçersizlik → yeniden alma),
`CashierLimitTests.cs` (limit üstü onay akışı, onaysız bakiyeye yansımama),
`CashJournalTests.cs` (her hareket türü için tek fiş; fiş üretilemezse hareket kaydolmaz).
`ReportsAndExportsTests.cs` kasa raporlarıyla genişletilir.

**E2E (panel, Playwright, `client/e2e/`):** yeni `new-ui/cash-day-close.spec.ts` (gün sonu al, sıfır
fark; sonra farklı gün sonu → gerekçe → onay), `new-ui/cash-movement.spec.ts` (masraf hareketi ekle,
bakiyeyi doğrula), `new-ui/cash-transfer.spec.ts` (virman, iki hesabın bakiyesi), `new-ui/cash-report.spec.ts`
(kasa defteri PDF/Excel indir). Mevcut `new-ui/mobile-cards.spec.ts` ve `mobile.spec.ts` kasa
ekranını kapsayacak şekilde genişletilir. **Hiçbir test silinmez/atlanmaz**
(`01-ORTAK-SARTNAME.md:24-25`).

Komutlar: `cd server && dotnet test`; `cd client && npm run lint && npm run build`;
`cd server && dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure
--startup-project YesLojistik.Api`.

## 11. Efor ve bağımlılıklar

| İş kalemi | Efor | Önce bitmeli |
|---|---|---|
| Para birimi + kur (hesap, hareket, rapor) | 3 gün | — |
| Elle kasa hareketi + düzeltme akışı | 3 gün | — |
| Gün sonu / kasa sayımı + fark kaydı | 4 gün | Elle hareket |
| Kasiyer yetkisi ve limit | 3 gün | Kullanıcı onayı (yeni rol) |
| Kasa defteri + raporlar (PDF/Excel) | 3 gün | Gün sonu |
| Yevmiye bağlantısı | 3 gün | Muhasebe çekirdeği dokümanı |
| Ekran düzenlemeleri (sekmeler, kartlar, mobil) | 3 gün | Üstteki kalemler |
| Testler (birim + entegrasyon + e2e) | 4 gün | Her kalemin yanında |
| **Toplam** | **~26 gün** | — |

Bağımlılıklar: muhasebe çekirdeği dokümanı (yevmiye fişi), `15` banka dokümanı (virman/mutabakat),
`11-SATIS-FATURA.md` (tahsilat bağı), `12-SATIN-ALMA.md` (tedarikçi ödeme bağı),
`13-SIPARIS-TEKLIF.md` (sipariş tahsilatı). Stok dokümanıyla bağımlılık yoktur.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Türetilmiş + elle hareket **çift sayılır** | Elle hareket ayrı kaynak türüyle işaretlenir; aynı belge iki kez sayılmaz | Elle hareketleri kapat, türetilmiş akışa dön |
| Fark kaydı bakiyeyi sessizce değiştirir | Fark bakiyeyi **değiştirmez**; düzeltme ayrı hareket + gerekçe | Düzeltme hareketini iptal et |
| Kasiyer rolü yetkiyi gevşetir | Kasiyer yalnız limit içi hareket ekler; tanım ve rapor kapalı; sunucu tarafı kontrol | Rolü kaldır (eski yetki aynen kalır) |
| Döviz kuru yanlış/eskimiş | Kur harekete **yazılır**, sonradan değişmez; rapor iki değeri ayrı gösterir | Kur alanını elle düzelt, kayıt geçmişi kalır |
| Kur farkı muhasebesi yanlış | Kur farkı ayrı satır; hesap eşlemesi mali müşavir onayına bağlı | Kur farkı satırını kapat |
| Gün sonu geçersizliği karmaşa yaratır | "Geçersiz" durumu ve tek tık yeniden alma; eski kayıt silinmez | Gün sonunu iptal et, elle not düş |
| Yevmiye ile kasa çift kayıt | Tek transaction; fiş hareketten üretilir, ayrı saklanmaz | Fiş üretimini kapat |
| Raporlar yavaşlar (bakiye her sorguda hesaplanır) | Sayfa başına hesap sayısı sınırlı; tarih aralığı zorunlu; gerekirse özet görünüm | Tarih aralığını daralt |
| Klasik görünüm bozulur | Yeni alanlar iki görünümde de çalışır; `client/src/lib/uiMode.ts:8` korunur | Yeni sekmeleri gizle |

**doğrulanacak:** Kullanılacak döviz cinsleri (TL/USD/EUR) ve döviz kasası açılıp açılmayacağı —
kaynak: kullanıcı.
**doğrulanacak:** Döviz kurunun kaynağı (TCMB/TMB/elle) ve güncelleme anı — kaynak: mali müşavir.
**doğrulanacak:** Kur farkı kâr/zararının hangi hesaba yazılacağı — kaynak: mali müşavir.
**doğrulanacak:** Kasiyer rolünün tanımlanıp tanımlanmayacağı ve günlük limit tutarı — kaynak:
kullanıcı iş kararı.
**doğrulanacak:** Kasa sayımında kupür listesi ve kuruş sayımı gerekip gerekmediği — kaynak: kullanıcı.
**doğrulanacak:** Fark kaydının muhasebeleşmesi (hangi hesap, hangi belge) — kaynak: mali müşavir.
**doğrulanacak:** Gün sonunun her kasa için zorunlu olup olmadığı — kaynak: kullanıcı.

Sonraki belgeyle bağlantı: bu doküman `15` banka dokümanıyla **virman, banka mutabakatı ve ekstre**
üzerinden kesişir; `11-SATIS-FATURA.md` tahsilat tarafını, `12-SATIN-ALMA.md` ödeme tarafını bu modüle
bağlar. Kasa hareketleri muhasebe çekirdeği dokümanındaki **yevmiye** tablosuna yazılır ve oradan
mizana taşınır.
