# 07 — Alınan (satın alma) faturaları

## 1. Amaç ve kapsam

Bu ekran, **taşeronların ve tedarikçilerin firmaya kestiği faturaların** girildiği yerdir ve iki işi
birden yapar: (1) faturayı kaydetmek (tedarikçi, fatura no, tarih, tür, matrah, KDV, tevkifat, vade,
dosya); (2) faturayı **sevkiyatlara bağlamak** — taşeronun taşıdığı ve henüz faturalanmamış
sevkiyatlar işaretlenir, bağlanan sevkiyat "fatura bekleyen" listesinden düşer ve sevkiyatın taşeron
fatura no/tarihi bu faturanın bilgisiyle yazılır.

Bu, `01-ORTAK-SARTNAME.md` §5'teki 10 sık işten **8 numaralı "tedarikçiye ödeme girmek"** işinin
fatura ayağıdır. Tedarikçi carisi (belge `09`), tedarikçi ödeme formu (belge `10`) ve
faturalandırılacaklar sayaçları (belge `06`) bu ekranla kesişir.

**Kapsam içi:** listede süzgeç/toplam/Excel, ekle-düzenle penceresi, fatura dosyası (PDF/görsel),
iptal, tedarikçi carisine borç etkisi. **Kapsam dışı:** kesilen (satış) faturalar (belge `05`),
tedarikçiye ödeme kaydı (belge `10`), tedarikçi cari ekstresi (belge `09`), e-Fatura
entegratöründen **otomatik içe aktarma** (böyle bir entegrasyon kodda yok).

---

## 2. Bugünkü durum (kod kanıtıyla)

### 2.1 Liste ekranı

Sayfa `client/src/pages/PurchaseInvoicesPage.tsx` içinde tek dosyada durur: liste (satır 26-102) ve
form (satır 118-257). Rota `client/src/App.tsx:104` (`/alinan-faturalar`), tembel yükleme
`client/src/App.tsx:21`.

Rota adı `client/src/lib/nav.ts:37` ile **klasik menüde** vardır; yeni menüde (`newNav`) yoktur.
Sayfa yeni görünümde **sekmelerden** açılır: `client/src/lib/sections.ts:15` — `efatura` bölümünün
üçüncü sekmesi "Alınan Faturalar". Ancak `newTitles` (satır 41-50) içinde `/alinan-faturalar` **yok**;
yeni görünümde başlık olduğu gibi kalır (`client/src/components/ui.tsx:112`).

Hızlı erişim: `client/src/lib/quickActions.ts:25` — "+ Yeni" menüsünde "Alınan Fatura" (`?new=1`,
`perm: 'accounting'`). Adresteki `new=1` parametresini `useOpenNewFromUrl`
(`client/src/lib/hooks.ts:90-101`) okur ve formu açar; sayfa bunu satır 35'te bağlar. `PageHeader`
(satır 70-74) başlık, açıklama ve iki düğme taşır: `ExportButton` (Excel, `alinan-faturalar.xlsx`) ve
`can('accounting')` ise "Fatura Ekle".

Süzgeç çubuğu (satır 77-83): dört denetim tek satırda — `Select` tedarikçi (satır 78), `Select` tür
(satır 80), iki `DateFilter` (satır 81-82). Arama kutusu `SearchBox` kartın `actions` yuvasında
(satır 76); yer tutucu "Fatura no, tedarikçi, VKN...". Sunucuda arama fatura no, tedarikçi ünvanı,
açıklama ve **VKN** üzerinde çalışır
(`server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:42-44` — `Filter`).

Toplam şeridi `TotalsStrip` ile (sayfa satır 84-90, koşul `totals.count > 0`;
`client/src/components/Exports.tsx:35-47`): Fatura
adedi, Matrah, KDV, Tevkifat, Genel tutar. Yalnız süzgece uyan kayıt varsa görünür ve **sayfanın
değil süzgecin tamamının** toplamıdır
(`server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:26-32` — `TotalsAsync`). `AGENTS.md` §8 bu
şeritleri `SumStrip`'e çevirmeyi bekleyen işler arasında sayar; bu ekran hâlâ `TotalsStrip` kullanır.

Tablo (`DataTable`, satır 91-94) sütunları satır 46-65'te: Tarih, Tedarikçi, Fatura No (altında tür
etiketi), Sevkiyat (bağlı sevkiyatların dış referansı ya da kimliği, yoksa `—`), Matrah, KDV,
Tevkifat, Genel Tutar. Son sütun boş başlıklı işlemler sütunudur: dosya varsa "Faturayı aç" (ataç
simgesi), `accounting` varsa "Düzenle" ve "İptal et". Sayfa boyu 20 (satır 40), satır tıklaması
`accounting` varsa formu açar (satır 92). Boş liste metni (satır 94) süzgeçliyse "Aramanıza uyan
fatura yok.", hiç kayıt yoksa "Henüz alınan fatura yok…" der.

İptal akışı: satır 42-44 isteği gönderir, `ConfirmDialog` (satır 97-99) "Bağlı sevkiyatlar yeniden
'fatura bekleyen' olur…" der. **İptal sebebi sorulmaz**; sunucuya `{ reason: null }` gider (satır 42),
oysa sunucu sebebi saklamaya hazırdır (`server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:119` —
`entity.CancelReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();`).

### 2.2 Form

Form bir `Modal` (satır 188, `size="lg"`) içinde iki kolon: sol kolon başlık ve tutarlar, sağ kolon
sevkiyat seçimi (satır 190).

Sol kolon: Tedarikçi (`FormSelect`, satır 193-194, zorunlu), Fatura No (satır 197, büyük harfe
çeviren CSS sınıfı), Fatura Tarihi (`DateQuick`, satır 198), Tür (`ControlledChoice` çip, satır
200-202), Vade Tarihi (satır 203; ipucu "Boşsa tedarikçinin vade günü kullanılır"), Tutarlar kutusu
(satır 204-227), Açıklama (satır 228), dosya seçimi (satır 229-231).

Tutar kutusunda üç alan (Matrah/KDV/Tevkifat, satır 213-223) ve altında canlı "Ödenecek (genel
tutar)" satırı `subtotal + vat - withholding` (satır 225). KDV oranı seçicisi (satır 206-211,
`vatRates = [0, 1, 10, 20]` — `client/src/lib/labels.ts:232`) ve **otomatik hesap**: kullanıcı
KDV/tevkifat kutusuna elle yazana kadar matrahtan KDV ve tevkifat önerilir (`taxEdited` bayrağı,
satır 142-150; oran değişimi satır 159-164); KDV dahil tutar 12.000 TL'yi aşarsa 2/10 tevkifat
uygulanır (`client/src/lib/tripTerms.ts:111-122` — `AUTO_WITHHOLDING_LIMIT`, `autoWithholding`;
tutar satır 124-131 `grossAmount`, `total = base + vat - withholding`).

Sağ kolon: "Faturaya bağlanacak sevkiyatlar" (satır 234) ve kaydırılabilir liste
(`max-h-[26rem]`, satır 237-250). Her satırda onay kutusu, "No {dış referans} · {tarih} · plaka",
güzergâh, sevkiyat maliyeti ve "KDV'li" tutar var. Tedarikçi seçilmemişse "Önce tedarikçiyi seçin."
(satır 235); bekleyen sevkiyat yoksa "… Servis/yakıt faturası ise sevkiyat seçmeden kaydedin."
(satır 236). Seçim yapılınca `Badge` ile "N sevkiyat seçildi" uyarısı çıkar (satır 251) ve seçilen
sevkiyatların maliyetleri toplanıp matrah olarak önerilir (satır 151-158, `fillFromTrips`; seçim satır
165-169 `toggle`).

Alt düğmeler (satır 189): "Vazgeç", "Kaydet". `Ctrl+Enter` ile kaydetme ve kirli formda kapatma
sırasında sorma ortak `Modal`'dan gelir (`client/src/components/ui.tsx:184-205`). Dosya yükleme
kayıttan **sonra** ayrı istekte yapılır; hata olursa "Fatura kaydedildi ama dosya yüklenemedi: …"
bildirimi gösterilir (satır 174-178).

Şema (satır 104-114): tedarikçi pozitif kimlik, fatura no ve tarih zorunlu, tür dört değerden biri
(`EInvoice`, `EArchive`, `Paper`, `Receipt`; etiketler `client/src/lib/labels.ts:245-250`). Sunucu
kuralları daha sıkıdır (`server/YesLojistik.Core/Validation/Validators.cs:529-544`): fatura no ≤50
karakter, **tevkifat KDV'den büyük olamaz**, **vade fatura tarihinden önce olamaz**, açıklama ≤1000.

### 2.3 Sunucu ve cari etkisi

Uçlar (`server/YesLojistik.Api/Controllers/PurchaseInvoicesController.cs`): liste (17), toplamlar (21),
Excel (23-41; veri sütunları 31-39, "Toplam" satırı 28-30), tekil kayıt (48), faturasız sevkiyatlar (52),
ekle (57), düzenle (61), iptal (65), sil (69), dosya yükle (78-80, `RequestSizeLimit` 12 MB),
dosyayı aç (87-92). Yazma uçları `Policies.Accounting` ister (56, 60, 64, 68, 77); okuma uçları istemez.

İş kuralları (`server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs`): fatura no büyük
harfe çevrilir ve **aynı tedarikçide tekrar edemez** (satır 164-166); toplam her zaman
`matrah + KDV − tevkifat` olarak sunucuda yeniden hesaplanır (satır 175); fatura + sevkiyat bağlama
**tek işlemde** kaydedilir (satır 88-95: `CreateAsync` satır 84-97, `UpdateAsync` satır 99-111).
Faturasız sevkiyat listesi yalnız o tedarikçinin iptal edilmemiş, hiçbir faturaya bağlı olmayan
sevkiyatlarını getirir; düzenlemede faturanın kendi sevkiyatları da listelenir (satır 74-77; seçim
satır 183-203 `LinkTripsAsync`).
İptalde kayıt silinmez, sevkiyatlar çözülür (satır 114-123).

Cari etkisi: tedarikçi borcu **saklanmaz, hesaplanır**. Alınan faturalar borç kalemi olur
(`server/YesLojistik.Infrastructure/Services/PayableService.cs:48-50` — `InvoicesAsync` yalnız
iptal edilmemişleri çeker; 101-103 — borç `p.Total − komisyon`); "faturadan düş" komisyonu faturanın
borcundan düşülür ve açıklama "Alış faturası (komisyon düşüldü: …)" olur. İptal edilenler borca
girmez, ayrı sayılır (`server/YesLojistik.Infrastructure/Services/CariService.cs:60-61`). Tedarikçi
cari tablosundaki "Alınan Fatura" sütunu bu değeri gösterir (`client/src/pages/CariPage.tsx:60` —
`header: 'Alınan Fatura'`).

---

## 3. Hedef yerleşim

Üst kısmı sıkıştır, süzgeci tek satıra indir, tabloyu yükselt. Hedef: 1440×900'de **≥12 satır**.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Alınan Faturalar                    [Excel]        [+ Fatura Ekle]        │  ~56px
│ [Kesilen Faturalar] [Fatura Kes] [Alınan Faturalar]                        │  ~36px
│ [🔍 Fatura no, tedarikçi, VKN]  [Tedarikçi ▾] [Tür ▾] [01.10–31.10 ▾] (2)  │  ~44px
│ 8 fatura · Matrah 96.000,00 · KDV 19.200,00 · Tevkifat 3.840,00 · 111.360,00│ ~52px
│ Tarih      Tedarikçi     Fatura No      Sevkiyat  Matrah  KDV  Tevk.  Tutar│
│ 03.10.2026 ABC Nakliyat  GIB…00178 · e-Fatura  S-000123  25.000,00 …  ⋯    │
│ … 12+ satır                                                                │
└────────────────────────────────────────────────────────────────────────────┘
```

Yerleşim kararları:

- Başlık → tablo başlığı arası **≤260px**. Bugünkü dört denetimli ızgara iki satır kaplıyor;
  tedarikçi/tür/tarih tek satırda süzgeç çubuğuna taşınır.
- Toplam şeridi ikinci satıra iner; tıklanınca o kaleme göre süzülür.
- Tablo satır yüksekliği 40-42px, tutarlar sağda tek sırada.
- Fatura formu iki kolon kalır; sol kolon (başlık + tutarlar) sabit, sağ kolon (sevkiyat listesi)
  kendi içinde kayar. Telefonda tek kolon.
- Sevkiyat listesine arama kutusu ve "tümünü seç" onay kutusu eklenir (bugün yalnız liste var).

---

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Tedarikçi | aranabilir seçim | evet | Seçilince sevkiyat listesi yenilenir | "Tedarikçi seçin." |
| Fatura No | metin (büyük harf) | evet | Aynı tedarikçide tekil | "Fatura numarası zorunlu." |
| Fatura Tarihi | tarih + hızlı seçim | evet | Bugün önerilir | "Tarih zorunlu." |
| Tür | çip (4 seçenek) | evet | Varsayılan "e-Fatura" | — |
| Vade Tarihi | tarih | hayır | Boşsa tedarikçinin vade günü | "Vade fatura tarihinden önce olamaz." |
| KDV oranı | açılır liste | hayır | Değişince tutarlar yeniden önerilir | — |
| Matrah | tutar | evet | Elle dokunulmadıysa KDV/tevkifat önerir | "Geçerli bir tutar girin." |
| KDV | tutar | evet | Elle yazılırsa otomatik öneri kapanır | "Geçerli bir tutar girin." |
| Tevkifat | tutar | evet | KDV'den büyük olamaz | "Tevkifat KDV tutarından büyük olamaz." |
| Açıklama | çok satırlı metin | hayır | En çok 1000 karakter | "En çok 1000 karakter." |
| Fatura dosyası | dosya seç | hayır | PDF/JPEG/PNG/WEBP, ≤10 MB | "Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir." |
| Sevkiyat satırı | onay kutusu | hayır | Seçilince matrah önerilir | "Seçilen sevkiyatlar bu tedarikçiye ait olmalı." |
| Fatura Ekle / Kaydet | birincil düğme | — | Formu açar / kaydeder | — |
| Excel | ikincil düğme | — | Süzgeçle dosya indirir | "Dosya indirilemedi." |
| Faturayı aç | simge düğme | — | PDF/görseli açar | "Bu faturanın dosyası yok." |
| Düzenle | simge düğme | — | Kayıtlı değerlerle açar | "İptal edilmiş fatura düzenlenemez." |
| İptal et | simge düğme | — | Onay + **sebep** (eklenecek) | "Fatura zaten iptal edilmiş." |

Klavye: `Ctrl+Enter` kaydet, `Esc` kapat (kirliyse sor), `Tab` alan sırası — hepsi ortak `Modal`'dan
gelir (`client/src/components/ui.tsx:184-205`). Hedef ek: süzgeç kutusunda `Enter` ile arama,
tabloda `↑`/`↓` ile satır gezme.

---

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** iki ayrı metin (süzgeçli/süzgeçsiz) korunur; süzgeçsiz boş durumda [+ Fatura Ekle]
  vurgulanır.
- **Yükleniyor / hata:** `DataTable` satır varken tabloyu soluklaştırır, satır yokken `Spinner`,
  hata varsa `ErrorState` + "Tekrar dene" gösterir (`client/src/components/DataTable.tsx:148`). Hedef:
  6 soluk satırlık iskelet; süzgeçler hata ve yenilemede korunur.
- **Yetkisiz:** `accounting` olmayan kullanıcı listeyi görür; ekle/düzenle/iptal düğmelerini görmez
  (`client/src/pages/PurchaseInvoicesPage.tsx` satır 61-62, 73), satır tıklaması formu açmaz (satır 92).
  Hedef: "Yalnız görüntüleme" ipucu.
- **Ayna modu:** `Button write` (`client/src/components/ui.tsx:30-32`) ve `IconButton write`
  (`client/src/components/ui.tsx:46-48`) yazma düğmelerini gizler; sunucuda `MirrorWriteGuard`
  `/api/purchase-invoices` yazmalarını reddeder
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`).
  Bu sayfadaki **üç yazma düğmesi `write` bayrağını zaten taşıyor** — "Düzenle"/"İptal et"
  (`client/src/pages/PurchaseInvoicesPage.tsx:61-62`) ve "Fatura Ekle" (satır 73) — yani ayna açıkken
  görünmez; §10 adım 5 ve §11/7 bu yüzden *doğrulama* işidir, kod değişikliği değil. Excel düğmesi
  `write` almadığı için aynada da görünür (`client/src/components/Exports.tsx:8-11`).
- **Lisans/sahip modu:** süre dolunca salt okunur; yazma düğmeleri gizlenir, liste ve Excel açık
  kalır (`docs/LISANS.md`; `export` geçen istekler serbest — `docs/LISANS.md:69`).

---

## 6. Metinler ve terimler

Ekranda görünecek metinler (bugünküler korunur): başlık ve sekme "Alınan Faturalar"; "+ Yeni" öğesi
"Alınan Fatura", ipucu "Taşeronun kestiği fatura"; arama yer tutucusu "Fatura no, tedarikçi, VKN";
türler "e-Fatura", "e-Arşiv", "Kâğıt", "Fiş"; toplam şeridi etiketleri "Fatura", "Matrah", "KDV",
"Tevkifat", "Genel tutar"; boş durum "Henüz alınan fatura yok. Taşeron fatura gelince 'Fatura Ekle'
ile sevkiyatlara bağlayın."; süzgeç boş durumu "Aramanıza uyan fatura yok."; form başlığı "Alınan
Fatura Ekle" / "Fatura {no}", "Faturaya bağlanacak sevkiyatlar", "Önce tedarikçiyi seçin.", "Bu
tedarikçinin fatura bekleyen sevkiyatı yok. Servis/yakıt faturası ise sevkiyat seçmeden kaydedin.",
"Ödenecek (genel tutar)", "Vazgeç", "Kaydet"; iptalde "Faturayı iptal et" ve yeni alan "İptal sebebi
(isteğe bağlı)".

`docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` uyumu: "sevkiyat" (sefer değil), "tedarikçi",
"tevkifat", "matrah". Teknik sözcük yasak: ekranda "ayna", "dry-run", "UBL", "token", "endpoint"
görünmez. Terim tablosu onayı beklediği için (`AGENTS.md` §6) toplu metin değişikliği yapılmaz.

---

## 7. Telefon davranışı (390×844)

Bugün bu tabloda `mobileCard` verilmemiştir; 390px genişlikte 9 sütunlu tablo yatay kaydırma üretir.
`01-ORTAK-SARTNAME.md` §5 "yatay kaydırma yok" dediği için bu sayfa **eksiktir**.

Hedef: `DataTable`'ın `mobileCard` yuvası (`client/src/components/DataTable.tsx:49-50, 78-100`)
kullanılır, `.sm` altında tablo gizlenir. Kart: üst satırda tedarikçi adı (kalın) ve genel tutar
(mono, sağda); ikinci satırda fatura no + tür rozeti; üçüncü satırda tarih ve bağlı sevkiyat sayısı; altta 44px yüksekliğinde
"Faturayı aç" / "Düzenle" düğmeleri. Süzgeçler tam ekran panelde açılır
(`client/src/components/shell/FilterPanel.tsx:35-62`). Tutar alanları alt alta iner, "Ödenecek"
satırı yapışkan kalır.

---

## 8. Erişilebilirlik ve klavye

- Tutar sütunları `text-right` + `tabular-nums` (`client/src/components/DataTable.tsx:138`); tablo
  başlıkları `<th>` (`DataTable.tsx:113-121`).
- Süzgeç denetimlerinde `aria-label` ("Tedarikçi", "Tür" — satır 78, 80); tarih alanlarına da eklenir.
- İşlem düğmeleri `IconButton` ile ad taşır: "Faturayı aç", "Düzenle", "İptal et" (satır 60-62).
- Dokunma hedefi ≥44px; `:focus-visible` halkası `client/src/index.css` jetonlarından. Sevkiyat
  listesi klavyeyle gezilebilir olmalı (bugün `<label>` + onay kutusu, `Space` ile seçilir —
  doğrulanacak).
- Renk körlüğü: tür ve durum **rozet + metin** birlikte; tutar `tl2()`, tarih `03.10.2026`, plaka
  `PlateBadge`.

---

## 9. Testler (e2e + birim)

**Bugün var olanlar:** Bu ekrana özel e2e dosyası **yok**. Dolaylı iki dokunuş:
`client/e2e/quick-add.spec.ts:8` ("+ Yeni" menüsünde "Alınan Fatura" öğesi) ve
`client/e2e/cari.spec.ts:55` (tedarikçi carisinde "Alınan Fatura" sütunu). Sunucuda
`server/YesLojistik.Tests/Integration/PurchaseInvoiceTests.cs` (satır 19-20 taşeron ödenecek tutarı ve
2/10 tevkifat; satır 23-87: faturasız sevkiyat listesi, tekil fatura no, bağlama hatasında yarım fatura
reddi, iptal sonrası çözülme), `server/YesLojistik.Tests/Integration/CariExportTests.cs:162-174` ve
`server/YesLojistik.Tests/Integration/ReportsAndExportsTests.cs:227-255` (toplamlar, Excel) var.

**Eklenecek e2e:** `client/e2e/new-ui/purchase-invoices.spec.ts` (yeni dosya) — `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile 7 senaryo: (1) "+ Yeni" → "Alınan Fatura" → pencere açılır,
tedarikçi seçilince bekleyen sevkiyat listesi gelir; (2) iki sevkiyat işaretlenir → matrah toplamı ve
"Ödenecek" satırı beklenen değeri gösterir; (3) kaydet → satır listede, toplam şeridi adedi 1 artar;
(4) aynı fatura no ile ikinci kayıt → alan hatası; (5) başka faturaya bağlı sevkiyat → hata metni;
(6) iptal → satır düşer, sevkiyat yeniden "fatura bekleyen" olur; (7) telefon (375×812) kart görünümü,
yatay kaydırma yok.

**Birim/sunucu:** `PurchaseInvoiceService.Filter` (süzgeç birleşimleri), `LinkTripsAsync` (bağlama
çözme) ve doğrulayıcı (`server/YesLojistik.Core/Validation/Validators.cs:529-544`) testleri
genişletilir. Test silme/atlama yok.

---

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **Sekme/başlık.** `client/src/lib/sections.ts:15` — sekme etiketi korunur; gerekirse `newTitles`
   (satır 41-50) girdisi eklenir. Doğrulama: `cd client && npm run build`. Süre: 0,5 saat.
2. **Üst kısmı sıkıştır.** `client/src/pages/PurchaseInvoicesPage.tsx:77-90` — dört denetimli ızgara
   tek satırlık süzgeç çubuğuna çevrilir, toplam şeridi ikinci satıra alınır (hedef ≤260px). Doğrulama:
   `npx playwright test e2e/new-ui`. Süre: 3 saat.
3. **Tabloyu yükselt.** `client/src/pages/PurchaseInvoicesPage.tsx:46-65` — satır yüksekliği 40-42px,
   tutarlar tek satır, işlemler sütunu daralır. Doğrulama: 1440×900'de ≥12 satır. Süre: 2 saat.
4. **İptal sebebi.** `client/src/pages/PurchaseInvoicesPage.tsx:42-44` ve `:97-99` — sebep alanlı küçük
   pencere; gövdede `reason` gönderilir (sunucu hazır:
   `server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:119`). Doğrulama: e2e iptal
   senaryosu + `cd server && dotnet test`. Süre: 2 saat.
5. **Ayna uyumu (doğrulama).** `client/src/pages/PurchaseInvoicesPage.tsx:61-62, 73` — üç yazma düğmesi
   `write` bayrağını **zaten taşıyor** (`client/src/components/ui.tsx:30-32, 46-48`); bu adım kod
   eklemez, ayna açıkken gizlendiklerini doğrular ve istisna çıkarsa düzeltir.
   Doğrulama: ayna açıkken düğmelerin görünmediğini kontrol eden e2e adımı. Süre: 1 saat.
6. **Telefon kartı.** `client/src/pages/PurchaseInvoicesPage.tsx:91-94` — `DataTable`'a `mobileCard`
   verilir (`client/src/components/DataTable.tsx:49-50`); süzgeçler tam ekran panele taşınır
   (`client/src/components/shell/FilterPanel.tsx:35-62`).
   Doğrulama: `npx playwright test e2e/mobile.spec.ts`. Süre: 4 saat.
7. **Sevkiyat listesine arama + tümünü seç.** `client/src/pages/PurchaseInvoicesPage.tsx:234-251`.
   Doğrulama: yeni e2e adımı. Süre: 3 saat.
8. **Yükleniyor iskeleti.** `client/src/components/DataTable.tsx:148` — satır iskeleti
   (`28-ORTAK-PARCALAR.md` şartnamesine göre). Doğrulama: `npm run build` + görsel kontrol. Süre: 2 saat.
9. **e2e spec.** `client/e2e/new-ui/purchase-invoices.spec.ts` (yeni) — §9'daki 7 senaryo.
   Doğrulama: `npx playwright test e2e/new-ui/purchase-invoices.spec.ts`. Süre: 4 saat.
10. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`. Doğrulama:
    `git diff --stat`. Süre: 0,5 saat.

Toplam: **22 saat ≈ 3 iş günü**.

---

## 11. Kabul ölçütü

1. 1440×900'de liste **≥12 satır**; başlıktan tablo başlığına yükseklik **≤260px**.
2. "+ Yeni" → "Alınan Fatura" formu **en çok 2 tıkta** açılır; tedarikçi seçilince bekleyen sevkiyat
   listesi **1 saniye içinde** dolar.
3. Sevkiyat işaretlenince matrah/KDV/tevkifat önerisi otomatik gelir; "Ödenecek" satırı
   `matrah + KDV − tevkifat` ile **kuruşu kuruşuna** uyuşur.
4. Aynı tedarikçide aynı fatura no ikinci kez kaydedilemez; alan hatası tek denemede görünür.
   Tevkifat KDV'den büyükse kayıt engellenir ve sebep ekranda yazar.
5. İptal edilen fatura listeden düşer; bağlı sevkiyatlar "fatura bekleyen" durumuna döner (tedarikçi
   carisindeki borç **aynı tutarda azalır**).
6. 390×844'te **yatay kaydırma yok**; kart görünümünde dokunma hedefleri **≥44px**.
7. Ekranda teknik sözcük yok ("ayna", "token", "endpoint", "UBL" geçmez); ayna modunda **hiçbir**
   yazma düğmesi görünmez, Excel çalışır.
8. Yeni e2e spec'inde **7 senaryo** yeşil; `dotnet test`'teki mevcut alınan fatura testleri
   (**en az 4**) bozulmadan geçer.

---

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sevkiyat bağlama hatası borcu bozar | Bağlama tek işlemde (`server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:88-95`); `dotnet test` | `git revert`; borç saklanmadığı için veri onarımı gerekmez |
| İptal sebebi eski iptalleri bozar | Sebep isteğe bağlı kalır (`reason: null`) | Alan gizlenir, eski akış çalışır |
| Süzgeç çubuğu mobilde taşar | Süzgeçler telefonda tam ekran panelde | Çubuk eski ızgaraya döner |
| Telefon kartı masaüstü tablosunu bozar | `mobileCard` verilince `.sm` üstünde tablo kalır (`client/src/components/DataTable.tsx:101`) | `mobileCard` prop'u kaldırılır |
| `SumStrip` çevirme işiyle çakışma | Bu belge `TotalsStrip`'i korur; çevirme ayrı iş (`AGENTS.md` §8) | Şerit tek satırda değiştirilir |
| Ayna/lisans modunda yazma sızması | Üç düğme `write` bayrağını taşıyor (`client/src/pages/PurchaseInvoicesPage.tsx:61-62, 73`) + sunucuda `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18` | `write` bayrağı geri alınır |

---

## 13. Doğrulanacaklar

1. Bu ekranın **pratikortam'daki karşılığı** hangi ekran; süzgeç ve sütun sırası oradan mı alınmalı?
   (Canlı sistem salt okunur; yalnız kullanıcı bakabilir.)
2. Taşeron faturası dışında **hangi tür alımlar** bu forma giriyor (yakıt, servis, otopark)? Tür
   listesi `e-Fatura/e-Arşiv/Kâğıt/Fiş` yeterli mi, "Servis"/"Yakıt" gibi **konu** alanı gerekli mi?
3. **Tevkifat oranı** her zaman 2/10 mu, yoksa farklı oran (3/10, 4/10, 5/10) girilebilmeli mi?
   Bugünkü kod yalnız otomatik 2/10 üretir (`client/src/lib/tripTerms.ts:118-122`); veri modeli
   ondalık oran taşıyor (`CostWithholdingTenths`,
   `server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:62`).
4. **İptal sebebi** zorunlu olmalı mı (bugün gönderilmiyor, sunucu saklıyor)? Alınan fatura
   **silinebilmeli** mi (sunucuda silme ucu var:
   `server/YesLojistik.Api/Controllers/PurchaseInvoicesController.cs:69`; yumuşak siler — `IsDeleted`
   işaretler ve sevkiyatları çözer:
   `server/YesLojistik.Infrastructure/Services/PurchaseInvoiceService.cs:125-131`)? Bir faturaya
   **kaç sevkiyat** bağlanabilir — üst sınır var mı (bugün sınır yok, seçim serbest)?
5. **Ödeme durumu** (ödendi/kalan) listede görünmeli mi? Bugün borç yalnız tedarikçi carisinde
   hesaplanıyor (`server/YesLojistik.Infrastructure/Services/PayableService.cs:101-103`);
   `docs/plan/09-TEDARIKCILER-CARI.md` ile karar verilmeli.
6. Fatura dosyası için **sürükle-bırak** ve **mobil kamera** isteniyor mu
   (`client/src/pages/PurchaseInvoicesPage.tsx:229-231`)? e-Fatura **entegratöründen otomatik içe
   aktarma** kapsamda mı? Entegratör adı/API dokümanı gelmeden yazılmaz (`AGENTS.md` §8).

---

Sonraki belgeyle bağlantı: `08-MUSTERILER-CARI.md` müşteri carisini, `09-TEDARIKCILER-CARI.md`
tedarikçi carisini ve ödeme dağıtımını, `10-TAHSILAT-ODEME-FORMLARI.md` tedarikçi ödeme formunu
anlatır; bu belge alınan faturanın **borç kalemi** olarak o carilere nasıl düştüğünü tanımlar ve
`06-FATURALANDIRILACAKLAR.md` içindeki "fatura bekleyen sevkiyat" sayacını besler.
