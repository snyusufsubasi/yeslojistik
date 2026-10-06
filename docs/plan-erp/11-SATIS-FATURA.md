# 11 — Satış Faturası

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir onayı gerekir).

## 1. Amaç ve kapsam

Bu modül, müşteriye kesilen **satış faturasını** bugünkü "sevkiyat seç + kes" akışından çıkarıp tam bir
ticari fatura modülüne genişletir. Kapsam:

- Fatura tiplerinin **tanımlanabilir** olması (satış, iade, ihracat/istisna, masraf, komisyon…).
- Satır düzeyi: **stok** ve **hizmet** satırı, miktar, birim fiyat, iskonto, KDV, tevkifat, masraf satırı.
- **Dövizli fatura** (kur bilgisi ve TL karşılığı) ve **iade faturası** (mevcut faturaya bağlı).
- **İhracat/istisna** senaryosu (mevcut `VatExemptionCode` altyapısı üzerine).
- Sevkiyattan fatura kesme akışının `docs/plan/` F3 kalanıyla uyumlu biçimde tamamlanması.
- Otomatik **yevmiye / stok / cari hareketi**, e-belgeye gönderim, yazdırma/PDF, iptal ve düzeltme.
- Fatura numarası serilerinin birden çok olabilmesi.

Kapsam dışı: satın alma (bkz. `12-SATIN-ALMA.md`), teklif/sipariş (bkz. `13-SIPARIS-TEKLIF.md`),
kasa/banka hareket detayı (bkz. `14-KASA.md`), e-belge entegratör adaptörünün kendisi (bkz.
`docs/plan-erp/08-*.md` — e-belge dokümanı). Stok kartı ve depo modülü bu dokümanda yalnız satır
tarafında tüketilir; kart tanımı ayrı dokümandadır.

Bu modül şu üç soruyu net cevaplar: (1) Hangi faturalar kesildi ve hangisi hâlâ borç? (2) Faturanın
satırları doğru mu (KDV, tevkifat, masraf, iskonto)? (3) Kesilen fatura muhasebeye, stoğa ve carieye
doğru yansıdı mı — iptal/düzeltmede ne oldu?

## 2. Luca'daki karşılığı

Luca Koza'nın **Fatura** menüsü ve Satış Yönetimi modülü bu dokümanın referansıdır. Siteden okunan ve
`02-LUCA-ENVANTERI.md`'ye yazılan ilgili maddeler:

- Farklı **döviz cinslerinden** fatura kesimi, işletmeye göre **fatura tipi tanımlama**, **proforma** ve
  **numune** faturası (`02-LUCA-ENVANTERI.md:55-56`).
- e-Fatura gönderimi ve **gelen e-Faturaların alınması**, e-Arşiv fatura gönderimi
  (`02-LUCA-ENVANTERI.md:39-40`).
- Barkod: **faturadan** hızlı barkod ile sayım ve seri takibi (`02-LUCA-ENVANTERI.md:30`).
- Fatura bilgilendirme: oluşturulan faturanın cari firmanın e-postasına gönderilmesi
  (`02-LUCA-ENVANTERI.md:32`).
- Fatura hareketlerinde "işletmeye özel hareket tanımlama" ve hareket bazında gruplama
  (`02-LUCA-ENVANTERI.md:62`).
- Belge üzerinden **muhasebe fişi iptali** ve tüm işlemlerin tek ekrandan muhasebeleştirilmesi
  (`02-LUCA-ENVANTERI.md:46-47`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> ve
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**doğrulanacak:** Luca'da proforma ve numune faturasının resmî belge niteliği, numara serisinden
tüketilip tüketilmediği ve muhasebeye yansıyıp yansımadığı — kaynak: Luca kullanım kılavuzu veya
mali müşavir. **doğrulanacak:** dövizli faturada kurun hangi tarihten alındığı (fatura tarihi mi, fiilî
teslim tarihi mi) — kaynak: mali müşavir. **doğrulanacak:** e-Arşiv/e-Fatura senaryo eşikleri ve
zorunluluk tarihleri — kaynak: GİB ve mali müşavir.

## 3. Bizde bugün

Fatura modülü **çalışıyor** ve üretimde kullanılıyor; eksik olan kısım satırdır.

**Veri modeli.** `server/YesLojistik.Core/Entities/Invoice.cs:5-43` — `Invoice` tablosu başlık
düzeyinde matrah, KDV oranı/tutarı, tevkifat (onda bir), genel toplam, durum, not, e-Fatura alanları
(ETTN, GİB no, senaryo, tip kodu, istisna kodu, tevkifat kodu) taşır. Satırlar ayrı tablodadır:
`Invoice.cs:45-53` — `InvoiceLine` yalnız `TripId`, `Description`, `Amount` alanlarına sahiptir;
**miktar, birim fiyat, iskonto, satır KDV, stok bağlantısı YOK**. Numaralar iki yerde tutulur: panel
numarası `CompanySettings.InvoicePrefix` + `NextInvoiceNumber`
(`server/YesLojistik.Core/Entities/CompanySettings.cs:20-21`), e-belge numarası
`EInvoiceSequence` (`Invoice.cs:56-62`) ve `CompanySettings.EInvoiceSeriesPrefix` /
`EArchiveSeriesPrefix` (`CompanySettings.cs:46-47`).

**Fatura kesme.** `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:87-154`:
müşteri doğrulanır (`:89`), seferler çekilir (`:95`), aynı müşteriye ait olma (`:97`), zaten
faturalanmamış olma (`:98`), aktarılmış sefer olmama (`:99`), iptal sefer olmama (`:100`) ve **tüm
seferlerin KDV oranı aynı olma** (`:101-102`) kuralları uygulanır. Satırlar seferden üretilir
(`:107-112`), faturalanacak ek masraf ayrı satır olur ve KDV dahil girildiyse KDV hariçe çevrilir
(`:114-120`), serbest satırlar eklenir (`:124`). Tevkifat boşsa tutar ve alıcı VKN'sine göre otomatik
belirlenir (`:127`). Fatura numarası **satır kilidiyle** atomik alınır
(`:221-228`) ve e-belge hazırlığı aynı transaction içindedir (`:146`). Fatura silinmez, iptal edilir;
bağlı tahsilat varsa iptal reddedilir (`:204-215`).

**Hesaplar.** `server/YesLojistik.Core/Domain/InvoiceCalculator.cs` (KDV, tevkifat, toplam), 2 kuruş
yuvarlama `Money.Round`. KDV ve tevkifat kuralları `docs/KDV-KURALLARI.md:9-19` ile sabittir: nakliye
%20, KDV dahil 12.000 TL üstü + 10 haneli VKN'de 2/10 (kod 624), yurt dışı taşımada %0 ve istisna kodu
311. Kâr **KDV hariç**, cari/borç **KDV dahil** (`docs/KDV-KURALLARI.md:30-34`,
`AGENTS.md` §5).

**e-Belge.** `server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:19-33` senaryoyu, tip
kodunu, ETTN'yi ve GİB numarasını üretir; `:39-47` boşluksuz sıra; `:66-86` gönderim; `:112-136` iptal
akışı (e-Fatura elektronik iptal edilemez → "İptal talep edildi"). UBL-TR XML
`server/YesLojistik.Infrastructure/EInvoice/UblInvoiceBuilder.cs`; **para birimi sabit `TRY`**
(`UblInvoiceBuilder.cs:19`). Sağlayıcı tablosu yalnız `manual` ve `mock` içerir
(`server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:21-28`); **gerçek entegratör yoktur**.

**Ekranlar.** Fatura listesi `client/src/pages/InvoicesPage.tsx`: süzgeçler (müşteri, durum,
tarih, sevkiyat no, "sadece ödenmemiş") `:89-99`, filtre toplamı şeridi `:100-107`, tablo sütunları
`:54-70`, satır menüsü `:136-139`. "Faturalandırılacaklar" sekmesi `:37` ve `:292-340`; teslim edilmiş
faturasız sevkiyatlar müşteriye göre gruplanır ve **grup düğmesi** seçili sevkiyatları forma taşır
(`:331-333`). Fatura detayı aynı dosyada modaldır (`:149-206`) ve e-belge paneli `:218-251`.
Yeni fatura formu `client/src/pages/InvoiceCreatePage.tsx`: müşteri seçimi (`:120-123`), sevkıyat
seçimi (`:131-151`), serbest satırlar ve hızlı satır çipleri (`:155-179`, `:21`), KDV/tevkifat/vade/not
kutusu (`:182-233`), satır toplamı önizlemesi (`:70-89`), farklı KDV oranı uyarısı (`:222-226`).
Ekranda açıkça yazar: **"Bu fatura sistem içi kayıttır. Resmî e-Fatura/e-Arşiv mevcut muhasebe
programınızdan kesilmeye devam eder."** (`InvoiceCreatePage.tsx:231`).

**Yetki ve görünüm.** Yazma uçları `Policies.Accounting`
(`server/YesLojistik.Api/Controllers/InvoicesController.cs:68-83`); okuma uçları açıktır. Menüde
"Faturalar" (klasik) ve "e-Fatura" (yeni görünüm)
(`client/src/lib/nav.ts:34-35`, `client/src/lib/nav.ts:75-76`). Klasik görünüm varsayılandır
(`client/src/lib/uiMode.ts:8`).

**Eksik listesi (kanıtlı):** satırda miktar/birim fiyat/iskonto yok (`Invoice.cs:45-53`); stok kartı ve
depo yok (`AppDbContext.cs:10-43` içinde `Stock`, `Warehouse`, `StockMovement` **yoktur**); döviz alanı
yok; yevmiye/muhasebe fişi yok; iade faturası tipi yok; fatura tipi tanımı yok; yalnız tek panel numara
serisi var (`CompanySettings.cs:20-21`); PDF/Excel çıktıları var
(`server/YesLojistik.Api/Controllers/InvoicesController.cs:22-66`).

## 4. Hedef ekranlar ve alanlar

### 4.1 Fatura Listesi (`/faturalar`)

Mevcut liste korunur; üstüne **tip** ve **döviz** süzgeci, satır aksiyonuna **"Düzeltme/iade"** eklenir.

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Tip | liste (tanımlardan) | hayır | Fatura tipini süzer; boşsa tümü |
| Döviz | liste (TL/USD/EUR **doğrulanacak**) | hayır | Yalnız o dövizdeki faturalar |
| Kalan | tutar (salt okunur) | — | Kırmızı, 0 ise "—" |
| Tip sütunu | metin + rozet | — | "İade" ve "İhracat" rozetli |

Mevcut sütunlar, toplam şeridi ve mobil kart korunur (`InvoicesPage.tsx:54-70`, `:100-107`,
`:125-141`).

### 4.2 Fatura Detayı (modal → tam sayfa)

Alanlar: müşteri, tarih, vade, tip, döviz + kur, satır tablosu (açıklama, miktar, birim, iskonto,
KDV %, tutar), toplamlar kutusu (ara toplam, iskonto, KDV, tevkifat, genel toplam, tahsil edilen,
kalan), notlar, e-belge paneli, ekli belgeler, hareket dökümü (yevmiye/stok/cari izi). Düğmeler:
Yazdır/PDF, E-posta Gönder, e-Belge gönder, Düzeltme, İade Faturası, İptal Et.

### 4.3 Yeni Fatura (`/faturalar/yeni`)

Sol kolon: müşteri, tip, satır tablosu, satır ekleme. Sağ kolon (yapışkan): fatura tarihi, vade,
döviz ve kur, KDV, tevkifat, not, toplamlar, "Taslak Kaydet" / "Faturayı Kes". Mevcut zorunlu alanlar
ve `Ctrl+Enter` davranışı korunur (şartname §3).

### 4.4 Fatura Tipleri Tanımı (Yönetici → Tanımlar → Fatura Tipleri)

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| Ad | metin (60) | evet | Tekrar edemez |
| Yön | seçim: Satış / İade | evet | İade ise negatif satır üretir |
| Varsayılan KDV | seçim %0/%1/%10/%20 | evet | Satırlara öneri olarak gelir |
| Varsayılan tevkifat | seçim: Otomatik/0…10 | hayır | Boşsa "Otomatik" |
| İstisna kodu | metin (3) | hayır | KDV %0 ise sorulur |
| Numara serisi | metin (3) | evet | Seri bazlı sıra |
| Muhasebe kodu | metin (20) | hayır | Yevmiye satırına yazılır |
| Aktif | anahtar | evet | Pasif tip yeni faturada seçilemez |

### 4.5 E-Belge Gönderim Kutusu

Mevcut kutuya **seri seçimi** ve **"Gönderim geçmişi"** eklenir. Alanlar: senaryo, tip kodu, GİB no,
ETTN, durum rozeti, son mesaj, gönderim/iptal zamanı. Düğmeler: XML indir, Entegratöre Gönder,
Gönderildi olarak işaretle, Durumu yenile, İptal talebi. (Bugünkü karşılığı:
`InvoicesPage.tsx:218-251`.)

## 5. İş kuralları

1. **Numaralandırma.** Panel numarası seri bazlıdır: `<seri>-<yıl>/<sıra>` (ör. `SAT-2026/000123`).
   Seri bazında sıra **satır kilidiyle** alınır (`InvoiceService.cs:221-228` örneği genişletilir). Sıra
   boşluğu üretilmez; iptal edilen fatura numarasını korur (`InvoiceService.cs:203`).
2. **Yuvarlama.** Her satır 2 kuruşa yuvarlanır, toplamlar yuvarlanmış satırlardan hesaplanır
   (`Money.Round`; bugünkü davranış `InvoiceCreatePage.tsx:15`, `:77`).
3. **KDV.** Satırda oran seçilir; fatura KDV'si satır KDV'lerinin toplamıdır. Farklı oranlı satırlar
   **aynı faturada serbesttir** (bugünkü "seferlerin oranı aynı olmalı" kısıtı yalnız sevkiyat
   satırları için korunur: `InvoiceService.cs:101-102`).
4. **Tevkifat.** Boş bırakılırsa otomatik: KDV dahil toplam > 12.000 TL **ve** alıcı 10 haneli VKN ise
   2/10; aksi hâlde yok (`InvoiceService.cs:126-127`, `docs/KDV-KURALLARI.md:11`). Kod 624'tür
   (`Invoice.cs:35-36`). Elle seçilebilir (`InvoiceCreatePage.tsx:209-214`).
5. **İstisna.** KDV %0 ise istisna kodu zorunludur, varsayılan 311
   (`InvoiceService.cs:137`, `InvoiceCreatePage.tsx:39`, `:111`).
6. **İskonto.** Satır iskontosu tutardan önce uygulanır; **fatura geneli iskonto** oransal dağıtılır ve
   KDV matrahı iskontolu tutardan hesaplanır. Yuvarlama farkı son satıra yazılır.
7. **Döviz.** Kur faturada **saklanır**; TL karşılığı cari ve yevmiyeye yazılır. Kur sonradan
   değişmez; tarih değişirse kur yeniden önerilir. (Kur kaynağı **doğrulanacak:** TCMB/TMB
   bülteni mi, elle mi.)
8. **Durum geçişleri.** `Draft → Issued → Cancelled` (`Invoice.cs:26`); taslak kesilir
   (`InvoiceService.cs:183-194`), iptal bağlı tahsilat varsa reddedilir (`:208-209`). Yeni: `Issued →
   Corrected` (düzeltme) ve `Issued → Returned` (iade) bağlantıları; **silme yoktur**.
9. **İade faturası.** Kaynak faturaya bağlanır; satırlar kaynaktan kopyalanır ve miktar kısmi
   olabilir. Kümülatif iade, kaynak satır miktarını aşamaz. Cari ve stok ters yönde hareket eder.
10. **Masraf satırı.** Sevkiyattaki "faturalanacak ek masraf" ayrı satır olur; KDV dahil girildiyse
    KDV hariçe çevrilir (`InvoiceService.cs:114-120`). Masraf satırı **stok hareketi doğurmaz**.
11. **Faturalanabilirlik.** Yalnız teslim edilmiş (`Delivered`) ve faturasız sevkiyat faturalanır;
    aktarılmış (`IsLegacy`) ve iptal sevkiyat engellenir (`InvoiceService.cs:98-100`).
12. **Otomatik hareket.** Kesimde tek transaction içinde: (a) **cari** borç/alacak, (b) **yevmiye**
    fişi (fatura tipi ve KDV kodu ile), (c) stok satırı varsa **stok çıkışı**, (d) bağlı sevkiyatın
    `InvoiceId` ataması (`InvoiceService.cs:149`). Üçünden biri başarısızsa fatura kesilmiş sayılmaz.
13. **Düzeltme.** Kesilmiş faturada tutar/müşteri değiştirilemez; ya **tam iptal + yeni fatura**, ya
    bağlı **düzeltme/iade faturası**. Kritik alanı sessizce değiştirmek yasaktır
    (`docs/TAM-GELISTIRME-PLANI.md:211` F3.5 kuralının karşılığı).
14. **e-Belge.** Gönderim hatası faturayı geri almaz; durum "Hata" olur (`EInvoiceService.cs:79-84`).
    e-Fatura elektronik iptal edilemez, "İptal talep edildi" olur (`:112-126`).
15. **Doğrulamalar.** Müşteri zorunlu, en az bir satır zorunlu, miktar > 0, birim fiyat ≥ 0, iskonto
    satır tutarını aşamaz, istisna kodu 3 hane, döviz seçiliyse kur > 0.

## 6. Veri modeli

**Eklenecek alanlar (yalnız ekleme migration; hepsi boş olabilir):**

`Invoice` (mevcut tablo, `Invoice.cs:5`):
`InvoiceTypeId int?`, `Direction` (Satış/İade, varsayılan Satış), `CurrencyCode string(3)?`,
`ExchangeRate decimal?`, `SubtotalTry decimal?`, `DiscountTotal decimal?`, `SourceInvoiceId int?`
(iade/düzeltme kaynağı), `ReturnReason string(300)?`, `Series string(3)?`, `JournalEntryId int?`,
`CorrectedByInvoiceId int?`, `PrintedAt DateTime?`, `PrintCount int`.

`InvoiceLine` (mevcut tablo, `Invoice.cs:45`): `StockId int?`, `Quantity decimal?` (varsayılan 1),
`Unit string(10)?`, `UnitPrice decimal?`, `DiscountRate decimal?`, `DiscountAmount decimal?`,
`VatRate decimal?` (boşsa başlıktan), `VatAmount decimal?`, `LineType` (Stok/Hizmet/Masraf),
`WarehouseId int?`, `Note string(200)?`, `SortOrder int`.

**Yeni tablolar:** `InvoiceType` (Ad, Direction, DefaultVatRate, DefaultWithholdingTenths,
VatExemptionCode, Series, AccountingCode, IsActive, LegacyKey), `InvoiceSeries` (Series, Year, Next,
Kind: panel/e-Fatura/e-Arşiv), `InvoiceRelation` (SourceInvoiceId, TargetInvoiceId, Kind:
Correction/Return, Reason, CreatedBy). Mevcut `EInvoiceSequence` (`Invoice.cs:56`) korunur; yeni seri
tablosu onun yerine geçmez, yanında durur.

**Yeni tablolar (bu dokümanın tükettiği):** `Stock`, `Warehouse`, `StockMovement` — tanımları stok
dokümanındadır; burada yalnız `InvoiceLine.StockId` bağlantısı kurulur. **Yeni tablo:**
`JournalEntry`/`JournalLine` (yevmiye) — muhasebe dokümanındadır; burada `Invoice.JournalEntryId`
bağlantısı kurulur. Bağımlılık sırası §11'dedir.

**İlişkiler.** `Invoice.CustomerId → Customer` (mevcut), `Invoice.SourceInvoiceId → Invoice` (yeni,
kendine referans), `InvoiceLine.StockId → Stock` (yeni), `InvoiceType.Id → Invoice.InvoiceTypeId`
(yeni). Migration yalnız ekleme yapar; veri silen/dönüştüren migration yazılmaz
(`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

Mevcut uçlar korunur (`InvoicesController.cs:15-83`): `GET /api/invoices`, `GET /api/invoices/totals`,
`GET /api/invoices/export`, `GET /api/invoices/summary-pdf`, `GET /api/invoices/{id}`,
`GET /api/invoices/{id}/pdf`; yazma uçları `POST /api/invoices`, `POST /api/invoices/{id}/issue`,
`POST /api/invoices/{id}/cancel`, `POST /api/invoices/{id}/email` (hepsi `Policies.Accounting`).

**Eklenecek uçlar:**

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/invoice-types` | — | liste | ofis |
| POST | `/api/invoice-types` | ad, yön, KDV, tevkifat, seri, kod | kayıt | yönetici |
| PUT | `/api/invoice-types/{id}` | aynı | kayıt | yönetici |
| DELETE | `/api/invoice-types/{id}` | — | 204 | yönetici |
| POST | `/api/invoices/{id}/correct` | tarih, satırlar, gerekçe | yeni fatura | muhasebe |
| POST | `/api/invoices/{id}/return` | satır miktarları, tarih, gerekçe | iade faturası | muhasebe |
| GET | `/api/invoices/{id}/movements` | — | cari/stok/yevmiye izi | muhasebe |
| GET | `/api/invoices/{id}/einvoice/history` | — | gönderim geçmişi | muhasebe |
| POST | `/api/invoices/{id}/print` | — | yazdırma kaydı | muhasebe |

`POST /api/invoices` gövdesine `InvoiceTypeId`, `CurrencyCode`, `ExchangeRate`, `Series` ve satır
alanları (`InvoiceLineInput` genişletilir: `FinanceDtos.cs:14`) eklenir. Yanıt `InvoiceDto`
(`FinanceDtos.cs:7-12`) yeni alanlarla genişletilir; **mevcut alanların adı/sırası değişmez** (istemci
kırılmaz). Doğrulama hataları Türkçe ve alan bazlıdır.

## 8. Yetki, onay ve denetim izi

| İş | Operasyon | Muhasebe | Yönetici |
|---|---|---|---|
| Fatura listesi/detay/PDF | oku | oku | oku |
| Fatura kes / taslak kaydet | — | yaz | yaz |
| Fatura iptal | — | yaz + onay | yaz |
| İade / düzeltme faturası | — | yaz | yaz |
| Fatura tipi tanımı | — | — | yaz |
| Numara serisi değiştirme | — | — | yaz |
| e-Belge gönderimi | — | yaz | yaz |
| İskonto oranı üstü (ör. %10+) | — | yaz + gerekçe | yaz |

**Maker-checker:** iptal, iade ve düzeltme ile **yüksek iskontolu** fatura ikinci bir muhasebe
kullanıcısının onayını ister. Onaylanmadan bu işlemler muhasebeye ve stoğa yansımaz (taslak kalır).

**Denetim izi.** Her yazma uçunda mevcut `AuditLog` altyapısı kullanılır; kayıt: kim, ne zaman, hangi
fatura, alan bazında eski→yeni değer, gerekçe, IP. e-Belge gönderim/iptal olayları ayrıca
`EInvoiceStatus` geçişi ve zaman damgasıyla saklanır (`EInvoiceService.cs:77`, `:95`).

## 9. Kabul kriterleri

1. Fatura listesinde tip ve döviz süzgeci çalışır; süzülmüş toplam şeridi doğru toplar.
2. Fatura kesme: `Faturalandırılacaklar` sekmesinden **3 tık** (sekme → "Fatura Kes" → "Faturayı Kes").
3. Aynı faturada %20 ve %0 KDV'li satırlar birlikte kaydedilebilir; sevkiyat satırlarında farklı oran
   seçilirse kaydetme engellenir ve sarı uyarı görünür (bugünkü davranış korunur,
   `InvoiceCreatePage.tsx:222-226`).
4. 10.000 TL + %20 KDV = 12.000,00 TL fatura, 11 haneli TCKN'li alıcıda **tevkifatsız**; 10.000,01 TL
   matrahta 10 haneli VKN'li alıcıda **2/10** otomatik gelir.
5. KDV %0 seçilince istisna kodu zorunlu; kod girilmeden kaydedilemez.
6. Dövizli faturada kur ve TL karşılığı kayıtta saklanır; sonradan kur değişikliği kaydı bozmaz.
7. İade faturası kaynak faturaya bağlanır; iade miktarı kaynak miktarı aşınca hata metni çıkar.
8. Tam iade sonrası cari bakiye fatura öncesi değerine döner (test: `CariTests` benzeri).
9. Kesilen faturada yevmiye fişi, stok çıkışı ve cari hareketi **birlikte** oluşur; biri başarısızsa
   fatura taslak kalır.
10. İptal edilen fatura numarasını korur ve bağlı sevkiyat yeniden faturalanabilir
    (`InvoiceService.cs:212`).
11. Fatura PDF'i ve Excel çıktısı yeni alanlarla (tip, döviz) birlikte doğru görünür.
12. e-Belge gönderiminde entegratör yoksa "XML indir" + "Gönderildi olarak işaretle" yolu çalışır
    (`InvoicesPage.tsx:238-242`).
13. Ekranda teknik sözcük yok ("ayna", "token", "UBL" yazmaz) (`01-ORTAK-SARTNAME.md:17-19`).
14. 390×844'te yatay kaydırma yok; satır düzenleme alanları tam ekran çekmecede açılır.

## 10. Testler

**Birim (sunucu):** `server/YesLojistik.Tests/Unit/InvoiceCalculatorTests.cs` (mevcut) genişletilir:
satır iskontosu, fatura geneli iskonto dağıtımı, karışık KDV oranlı satırlar, döviz kuru yuvarlaması,
iade miktarı sınırı. Yeni: `InvoiceSeriesTests.cs` (seri başına sıra, boşluksuzluk), `InvoiceTypeTests.cs`
(tip doğrulaması, pasif tip reddi).

**Entegrasyon (sunucu):** `server/YesLojistik.Tests/Integration/`:
`VatRulesTests.cs` (mevcut, tevkifat/istisna) korunur ve genişletilir; yeni
`SalesInvoiceTests.cs` (tip/seri/döviz/iskonto ile kesim, iptal, bağlantı bütünlüğü),
`ReturnInvoiceTests.cs` (tam/kısmi iade, cari ve stok ters hareketi),
`InvoicePostingTests.cs` (yevmiye + stok + cari birlikte; biri patlarsa geri alma),
`EInvoiceTests.cs` (mevcut) — yeni seri bazlı numara ve gönderim geçmişi senaryoları.
`CariTests.cs` ve `CashTests.cs` regresyon için koşulur.

**E2E (panel, Playwright, `client/e2e/`):** mevcut `new-ui/cari-invoice.spec.ts` ve
`new-ui/faturalandirilacaklar.spec.ts` korunur; yeni `new-ui/sales-invoice.spec.ts`: tip seç, karışık
KDV'li satır ekle, kes, detayda toplamları doğrula, iade oluştur, PDF indir. Yeni
`new-ui/invoice-types.spec.ts`: tanım ekle/düzenle/pasife al. `forms.spec.ts` içindeki fatura adımları
güncellenir. **Kural: hiçbir test silinmez veya atlanmaz** (`01-ORTAK-SARTNAME.md:24-25`).

Komutlar: `cd server && dotnet test`; `cd client && npm run lint && npm run build`;
`cd server && dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure
--startup-project YesLojistik.Api`.

## 11. Efor ve bağımlılıklar

| İş kalemi | Efor | Önce bitmeli |
|---|---|---|
| Fatura tipi tanımı + seri tablosu (veri + API + ekran) | 3 gün | — |
| Satır modeli (miktar, birim fiyat, iskonto, satır KDV, tip) | 3 gün | — |
| Yeni fatura formu (satır tablosu, iskonto, döviz) | 4 gün | Üstteki iki kalem |
| İade ve düzeltme akışı | 3 gün | Satır modeli |
| Yevmiye bağlantısı | 3 gün | Muhasebe çekirdeği dokümanı (hesap planı, yevmiye) |
| Stok satırı bağlantısı | 2 gün | Stok/depo dokümanı |
| Listeler, süzgeçler, mobil, erişilebilirlik | 2 gün | Yeni fatura formu |
| Testler (birim + entegrasyon + e2e) | 3 gün | Her kalemin yanında |
| **Toplam** | **~23 gün** | — |

Bağımlılıklar: `08` (e-belge) entegratör adaptörü ve numara serisi için; `12` (satın alma) iade
faturasının tedarikçi tarafı için; muhasebe çekirdeği dokümanı yevmiye için; stok dokümanı satır
bağlantısı için.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Dövizli faturada kur yanlış/eskimiş | Kur faturaya **yazılır**, elle düzeltilebilir; kaynak doğrulanana kadar elle giriş | Kur alanını boş bırak, TL devam |
| Yevmiye ile cari çift sayım | Tek transaction; aynı tutar iki yerde saklanmaz, fiş cari hareketten üretilir | Fiş üretimini kapat, fatura aynen kalır |
| Stok modülü hazır değilken satır tipi karışır | `LineType` varsayılanı **Hizmet**; stok tipi yalnız kart seçilince açılır | Satır tipini Hizmet'e geri al |
| İade ile mükerrer alacak | Kümülatif iade kontrolü + kaynak faturaya bağ zorunlu | İadeyi iptal et, kaynak fatura değişmez |
| Seri değişikliğinde numara çakışması | Satır kilidi + seri/yıl bileşik anahtar | Eski seriye dön |
| İskonto sonrası yuvarlama farkı | Fark son satıra yazılır, testi vardır | Farkı fatura geneline dağıt |
| e-Belge iptal edilemez | "İptal talep edildi" durumu ve kullanıcı metni | İptali geri al (durum eski hâline) |
| Ekranların klasik görünümü bozulur | Yeni alanlar iki görünümde de çalışır; `uiMode.ts:8` korunur | Yeni alanları gizle (özellik anahtarı) |

**doğrulanacak:** Proforma ve numune faturası resmî belge midir, numara serisinden tüketir mi,
muhasebeye yansır mı? Kaynak: mali müşavir / Luca kılavuzu.
**doğrulanacak:** Dövizli faturada kur tarihi ve kur kaynağı (TCMB/TMB/elle). Kaynak: mali müşavir.
**doğrulanacak:** İhracat/istisna fatura senaryosu ve gereken belgeler (gümrük beyannamesi vb.).
Kaynak: mali müşavir + GİB.
**doğrulanacak:** İade faturasında süre sınırı ve itiraz süreci. Kaynak: mali müşavir.
**doğrulanacak:** Kullanılacak döviz cinsleri listesi (yalnız USD/EUR mu?). Kaynak: kullanıcı.
**doğrulanacak:** Fatura tipi başına muhasebe kodu eşlemesi ve KDV kodu listesi. Kaynak: mali müşavir.

Sonraki belgeyle bağlantı: bu doküman `12-SATIN-ALMA.md` ile **alış tarafının aynası** olarak
kesişir (aynı satır/iskonto/KDV kuralları, ters yön); `08` e-belge dokümanı gönderim akışını,
`13` sipariş dokümanı ise fatura öncesi sipariş→sevkiyat bağını tanımlar.
