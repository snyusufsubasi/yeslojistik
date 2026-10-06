# 06 — Faturalandırılacaklar ve sayaç kutuları

## 1. Amaç ve kapsam

Bu belge, e-Fatura bölümünün ilk sekmesi olacak **Faturalandırılacaklar** ekranını (`/faturalar?sekme=bekleyen`, adres kararı: `docs/KOLAYLASTIRMA-UYGULAMA.md:106`) ve bölümün üstünde duracak **sayaç kutularını** tarif eder. İş hedefi: teslim edilmiş ama faturası kesilmemiş sevkiyatları müşteriye göre gruplayıp "Fatura Kes" işini tek akışa indirmek (`docs/KOLAYLASTIRMA-PLANI.md:163-164`). Kabul cümlesi nettir: "Faturalandırılacaklar"dan fatura **3 tıkta** kesilir (`docs/KOLAYLASTIRMA-UYGULAMA.md:330`); bu, en sık 10 işin 5. maddesidir (`01-ORTAK-SARTNAME.md:225`).

İkinci kapsam: `docs/PRATIKORTAM-HARITA.md:56`'da "operasyon ekranı (sayaçlı kutular)" diye geçen ve bugün tek yerde karşılığı bulunmayan sayıların (faturalandırılacak sevkiyat, taslak, kesilen, iptal, vadesi geçen) bir arada görünmesi. Üçüncü kapsam: karışık KDV uyarısı ve toplu fatura kesme akışının sadeleştirilmesi; bu ikisi bugün kısmen canlıdır (§2).

Kapsam dışı: e-Fatura/e-Arşiv gönderim durumu ve XML işlemleri (`05-E-FATURA.md`), alınan faturalar (`07-ALINAN-FATURALAR.md`), KDV mevzuatı ve tevkifat oranları, entegratör seçimi (bilgi bekliyor). Bu belge kodu değiştirmez, test çalıştırmaz (`01-ORTAK-SARTNAME.md:35-36`).

## 2. Bugünkü durum (kod kanıtıyla)

**"Faturalandırılacaklar" sekmesi yok.** e-Fatura bölümünün sekmeleri `client/src/lib/sections.ts:12-16` içinde üç tanedir: *Kesilen Faturalar* (`/faturalar`), *Fatura Kes* (`/faturalar/yeni`, `perm: 'accounting'`), *Alınan Faturalar* (`/alinan-faturalar`); dizide `?sekme=bekleyen` yoktur. `sections.ts:42` yeni görünümde `/faturalar` başlığını "e-Fatura" yapar.

**Sayfa sorgu parametrelerini kısmen okuyor.** `client/src/pages/InvoicesPage.tsx:26-35` içinde `useSearchParams` ile yalnız `id` (satır 35) ve `unpaid` (satır 30) okunur; `sekme` okunmaz ve `InvoicesPage.tsx:41-43` bu iki parametreyi adresten temizler. Yani `?sekme=bekleyen` bugün sessizce yok sayılır.

**Sekme çubuğu sorguya duyarsız.** `client/src/components/shell/SectionTabs.tsx:12` bölümü `sectionFor(pathname)` ile bulur; `sections.ts:36-38` yalnız tam eşleşmeye bakar. `SectionTabs.tsx:20` aktifliği `t.to === pathname` ile hesaplar → `?sekme=bekleyen` açıldığında adres `/faturalar` kaldığı için *Kesilen Faturalar* aktif görünür.

**"Faturalandırılacaklar" işi bugün beş yere dağılmış:** Bugün ekranındaki sarı şerit (`client/src/pages/DashboardPage.tsx:72-77`, yeni görünümde `121-129`, bağlantı `/faturalar/yeni`); sol menü sayacı (`client/src/lib/nav.ts:34-35` ve `75-76`, kaynak `uninvoicedTripCount`); Cari ekranındaki vurgulu kutu (`client/src/pages/CariPage.tsx:175-177`, "Faturası kesilecek sevkiyatlar"); Sevkiyatlar kazanç şeridinin sağ ucu (`client/src/pages/TripsPage.tsx:568-583`, `SumStrip` `end` kutusu `highlight: true`, tıklayınca `TripsPage.tsx:411` süzgeci `invoiced='no'`, `status='Delivered'` yapar); hızlı işler kümesi (`client/src/lib/quickActions.ts:24`, sarı "Fatura Kes" kutusu).

**Toplu fatura kesme akışı hazır.** `TripsPage.tsx:197-206`: seçilenler tek müşteriye ait değilse (199-200), faturalanmış varsa (201-202), iptal varsa (203-204) hata; sonra `navigate('/faturalar/yeni?customerId=…&tripIds=…')` (205).

**Fatura kesme ekranı bu adresleri destekliyor.** `client/src/pages/InvoiceCreatePage.tsx:50-53` `customerId` ve `tripIds` parametrelerini okur; `56-63` listeden gelinmemiş sevkiyat sayısını (`missingFromList`) uyarı olarak gösterir; `43-47` `GET /trips?invoiced=false&pageSize=500` çağırır; `48` iptalleri eler; kullanıcı seçim yapmazsa teslim edilmiş sevkiyatlar ön seçili gelir (`54-61`).

**Karışık KDV uyarısı canlı ve test edilmiş.** `InvoiceCreatePage.tsx:66-69` seçili sevkiyatların `saleVatRate` değerlerini toplar, `109` `mixedVat` bayrağını kurar, `110-111` kaydetmeyi kapatır; uyarı `222-226` içinde `role="alert"` ve sarı zeminle, hangi oranların karıştığını yazarak çıkar. Sunucu da reddeder: `server/YesLojistik.Infrastructure/Services/InvoiceService.cs:101-102`. Mevcut e2e doğrular: `client/e2e/new-ui/cari-invoice.spec.ts:15-36`. Yani "seçim anında uyarı" işi **bitmiştir**; kalan iş, uyarının hedef yerleşimde özet çubuğunun yanında durmasıdır.

**Hedefle çelişen iki nokta.** Birincisi iki düğme: "Taslak Kaydet" ve "Faturayı Kes" (`InvoiceCreatePage.tsx:227-230`); `docs/KOLAYLASTIRMA-PLANI.md:170` tek "Faturayı Kes" ister. İkincisi `xl:sticky xl:top-20` sağ kolon (`InvoiceCreatePage.tsx:182-233`); `docs/KOLAYLASTIRMA-PLANI.md:168-169` tarih/vade/KDV/tevkifatın "Otomatik" görünüp isteyenin açmasını ister. Özet satırları `216-221`, müşteri ve sevkiyat tablosu `119-154`, tümünü seç onay kutusu `134-135`, ek satırlar `155-179` (hazır açıklamalar `21`).

**Sayaç kutuları için parçalar var, veri yok.** Hazır parçalar: `client/src/components/ui.tsx:322-338` (`Figures` + `Figure`; `highlight` sarı `bill-soft`, `326-334`), `ui.tsx:302-316` (`StatCard`), `client/src/components/SumStrip.tsx:12-38` (`end` kutusu `highlight` ile `bg-bill-soft`, satır 28; `aria-label` satır 19). Faturalar sayfası bugün yalnız filtre toplamı şeridini gösterir (`InvoicesPage.tsx:95-102`). Durum kırılımı yoktur: `InvoiceTotalsDto` yalnız `Count, Subtotal, VatAmount, WithholdingAmount, Total, Remaining` taşır (`server/YesLojistik.Core/Dtos/FinanceDtos.cs:139`) ve `InvoiceQuery` içinde "vadesi geçen" süzgeci bulunmaz (`FinanceDtos.cs:22-31`). Bu yüzden dört sayaç bugünkü iki uçla tek istekte üretilemez (§10.4).

**Yardımcı altyapı hazır.** `GET /trips` üzerinde `Invoiced` süzgeci vardır (`TripDtos.cs:65`); `DashboardDtos.cs:8` `UninvoicedTripCount`/`UninvoicedTripTotal` taşır. İstemcide `usePaged`/`useListTotals`/`useSave` (`client/src/lib/hooks.ts:26,41,60`) ve toplu seçim `useRowSelection` (`InvoicesPage.tsx:39-40`) kullanılabilir.

**Ortak parçaların durumu.** `PageShell` ve `DetailDrawer` **kodda yoktur**; şartnamelerini `28-ORTAK-PARCALAR.md` yazar (`01-ORTAK-SARTNAME.md:143-144`). `/faturalar/yeni` yeni menüde görünmez, sekmelerden açılır (`01-ORTAK-SARTNAME.md:130`).

## 3. Hedef yerleşim

Faturalandırılacaklar sekmesi (açılışta varsayılan), `/faturalar?sekme=bekleyen`:

```
┌──────────────────────────────────────────────────────────────────────┐
│ e-Fatura                                                             │
│ Faturalandırılacaklar · Kesilen Faturalar · Fatura Kes · Alınan       │
│ ┌ FATURALANDIRILACAK ┐ ┌ TASLAK ┐ ┌ KESİLEN ┐ ┌ İPTAL ┐ ┌ VADESİ GEÇEN┐
│ │ 7 sevkiyat         │ │   2    │ │   41   │ │   1   │ │     3      │
│ │ 126.500,00 TL      │ │        │ │        │ │       │ │ 18.200,00TL│
│ └────────────────────┘ └────────┘ └────────┘ └───────┘ └────────────┘
│ [🔍 Müşteri ara]   [Süzgeç (1)]   [⋯ Diğer]        [+ Fatura Kes]    │
│ ┌ ABC Nakliyat · 3 sevkiyat · 42.500,00 TL ───────────── Fatura Kes ┐│
│ │ 14.10.2026 İstanbul → Ankara  34 ABC 123  Teslim edildi 17.000,00 ││
│ └───────────────────────────────────────────────────────────────────┘│
│ 7 sevkiyat · 126.500,00 TL + KDV        (toplam şeridi, alta yapışık) │
└──────────────────────────────────────────────────────────────────────┘
```

Kurallar: (a) Üst kısım — başlık, sekme çubuğu, sayaçlar, süzgeç çubuğu — 1440×900'de **≤260px** (`01-ORTAK-SARTNAME.md:237`); sayaçlar tek satır, 5 kutu, her kutu ≥180px. (b) Liste ekranın üstünden başlar; **≥12 satır** görünür (`01-ORTAK-SARTNAME.md:236`). (c) Grup başlığı yapışkan kalır; "Fatura Kes" düğmesi sağındadır ve gruptaki sevkiyat sayısını/tutarını gösterir. (d) Ayrı çekmece yoktur; satır tıklaması sevkiyat ayrıntısını açar. (e) Toplam şeridi `SumStrip` ile altta, `end` kutusu "Faturalandırılacak" vurgulu (`SumStrip.tsx:14,28`).

Kesilen Faturalar sekmesi (bugünkü `/faturalar`): aynı sayaç satırı en üstte; altında mevcut süzgeç alanı (`InvoicesPage.tsx:84-94`), filtre toplamı (`95-102`) ve tablo (`103-133`). İcmal/Excel/PDF düğmeleri başlıktan `MoreMenu`'ye taşınır (`76-80`), süzgeçler `FilterPanel`'e (`01-ORTAK-SARTNAME.md:135-136`).

Fatura Kes ekranı (`/faturalar/yeni`): tek kolon akış; müşteri + sevkiyat listesi üstte (`119-154`), ek satırlar ortada (`155-179`), altta **yapışkan özet çubuğu** ("Ara toplam · KDV %20 · Tevkifat otomatik · Ödenecek", `216-221` temel alınır) ve tek "Faturayı Kes" düğmesi (`229`). "Taslak Kaydet" `⋯ Diğer` menüsüne girer (`client/src/components/shell/Menu.tsx:52-61`). KDV uyarısı bu çubuğun hemen üstünde durur.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata / uyarı metni |
|---|---|---|---|---|
| Sekme çubuğu | `SectionTabs` bağlantısı | — | Sorgu parametresini de karşılaştırır | — |
| Faturalandırılacak kutusu | `Figure highlight` | — | Süzgeci temizler, liste başına kaydırır | — |
| Taslak / Kesilen / İptal / Vadesi geçen | `Figure` | — | Tıklayınca o durumu süzer | — |
| Müşteri ara | `SearchBox` | — | Yazarken grupları süzer (yerel) | "Aramanıza uyan sevkiyat yok." |
| Süzgeç | `FilterPanel` | — | Tarih ve tutar aralığı, plaka | — |
| Grup "Fatura Kes" | `Button` (accent) | — | `/faturalar/yeni?customerId=X&tripIds=…` (`TripsPage.tsx:205` düzeni) | — |
| Toplu "Fatura Kes" | seçim çubuğu düğmesi | — | Farklı müşteri seçilirse engellenir | "Seçilen sevkiyatlar farklı müşterilere ait…" (`TripsPage.tsx:200`) |
| KDV uyarısı | `role="alert"` | — | Seçim değişince anında; düğmeyi pasifleştirir | "Seçilen sevkiyatların KDV oranları farklı (%0, %20)…" (`InvoiceCreatePage.tsx:222-226`) |
| Faturayı Kes | `Button` | evet | Tek kaydetme düğmesi (`InvoiceCreatePage.tsx:229`) | Pasifken ipucu: "Müşteri ve en az bir sevkiyat seçin." |
| ⋯ Diğer (liste) | `DropMenu` | — | İcmal, Excel, PDF, Taslak Kaydet | — |

Klavye: `Ctrl+Enter` kaydet, `Esc` kapatır, `↑/↓` gezer, `Space` sevkiyat seçer, `Alt+1…5` sayaçlara gider. Kaydetme sırasında düğme `loading` olur (`InvoiceCreatePage.tsx:228-229` düzeni).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** faturalanacak sevkiyat yoksa `FirstUse` kartı (eylem: "Sevkiyatlar'a git"); düzen `InvoicesPage.tsx:114-119`'dan alınır.
- **Yükleniyor:** iskelet; sayaçlar `—`, liste grisi. Bugünkü karşılığı: `InvoicesPage.tsx:103` `DataTable`'a `loading` bayrağını verir; `DataTable.tsx:126` satırları soluklaştırır, satır yokken `DataTable.tsx:148` dönen göstergeyi çizer. Salt "6 gri iskelet satır" hedefte eklenir (bugün kodda yok).
- **Hata:** sayfa içi hata + "Yeniden dene" (aynı desen).
- **Yetkisiz:** ekran `perm: 'accounting'` ister (`App.tsx:101`); başka rol sekmeyi görmez, adres yazılırsa `/`'a yönlenir (`App.tsx:65-68`).
- **Ayna:** yazma düğmeleri gizlenir (`Button write`); şerit "Bu dönem kayıtlar eski programdan geliyor; fatura kesme kapalı." der (`01-ORTAK-SARTNAME.md:157-160`).
- **Lisans:** süre dolduğunda salt okunur; "Faturayı Kes" gizlenir, sayaçlar ve liste görünür kalır (`01-ORTAK-SARTNAME.md:161-162`).

## 6. Metinler ve terimler

Görünecek metinler: "e-Fatura" (`sections.ts:42`), "Faturalandırılacaklar", "Kesilen Faturalar", "Fatura Kes", "Alınan Faturalar", "Faturalandırılacak", "Taslak", "Kesilen", "İptal", "Vadesi geçen", "Sevkiyat", "Teslim edildi", "Faturayı Kes", "Taslak Kaydet", "⋯ Diğer", "Süzgeci temizle", "Aramanıza uyan sevkiyat yok.", "Seçilen sevkiyatların KDV oranları farklı (%0, %20). Ayrı fatura kesin: aynı orandaki sevkiyatları seçin." ve "Bu fatura sistem içi kayıttır. Resmi e-Fatura/e-Arşiv mevcut muhasebe programınızdan kesilmeye devam eder." (son cümle `InvoiceCreatePage.tsx:231`).

Yasak sözcükler: "ayna", "dry-run", "UBL", "token", "endpoint", "payload" (`01-ORTAK-SARTNAME.md:77`). "Sefer" yerine "Sevkiyat" tercih edilir; terim tablosu onayı beklediği için (`AGENTS.md` §6) ekran yazıları toplu değiştirilmez. Para `tl()` ile iki kuruş, tarih `03.10.2026`, plaka `PlateBadge` (`01-ORTAK-SARTNAME.md:240`).

## 7. Telefon davranışı (390×844)

Yatay kaydırma yoktur (`01-ORTAK-SARTNAME.md:238`). Sayaçlar iki sütunlu ızgaraya döner, beşinci kutu tam satır olur — bu davranış `SumStrip.tsx:19`'daki `grid-cols-2 … sm:flex` deseninin aynısıdır. Gruplar kart olur: müşteri adı, sevkiyat sayısı ve tutar üstte, "Fatura Kes" altta tam genişlikte ve ≥44px. Sevkiyat satırları mevcut `mobileCard` desenini izler (`InvoicesPage.tsx:120-133`). Süzgeç tam ekran `FilterPanel` olarak açılır; özet çubuğu ekranın altına yapışır, "Faturayı Kes" görünür kalır.

## 8. Erişilebilirlik ve klavye

Sekme çubuğu `role="tablist"`, sekmeler `role="tab"` + `aria-selected` (`SectionTabs.tsx:18,22`). Sayaçlar tek `aria-label` altında toplanır; "Faturalandırılacak" kutusundaki sarı zemin tek başına anlam taşımaz, yanında sayı ve "sevkiyat" sözcüğü bulunur (`ui.tsx:330-332`). Tablo başlıkları `scope="col"`, grup başlığı `role="rowheader"`. Odak sırası: sekmeler → sayaçlar → arama → süzgeç → gruplar → satırlar → özet çubuğu. `:focus-visible` halkası `client/src/index.css:102-106` jetonundan. Dokunma hedefi ≥44px; onay kutuları `aria-label` taşır (`InvoiceCreatePage.tsx:134,141`). KDV uyarısı `role="alert"` ile duyurulur (`223`).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/new-ui/cari-invoice.spec.ts:15-36` karışık KDV uyarısını ve düğmenin pasifleşmesini doğrular; `bulk.spec.ts` toplu işlemleri, `trips.spec.ts` sevkiyat süzgeçlerini, `mobile.spec.ts` yatay kaydırma yokluğunu kapsar. Yeni görünüm testi `useNewUi(page)` ile açılır (`client/e2e/helpers.ts:44-46`).

Eklenecek: `client/e2e/new-ui/faturalandirilacaklar.spec.ts` — (1) `?sekme=bekleyen` açıldığında *Faturalandırılacaklar* sekmesinin `aria-selected="true"` olması; (2) teslim edilmiş, faturasız iki sevkiyatın aynı müşteri grubunda görünmesi; (3) grup "Fatura Kes" düğmesinin `/faturalar/yeni?customerId=…&tripIds=…` açması ve sevkiyatların seçili gelmesi; (4) "Faturayı Kes" sonrası faturanın oluşması ve sevkiyatların sekmeden düşmesi; (5) sayaç sayılarının liste uzunluğuyla uyuşması. Sunucu tarafında yeni sayaç ucu için `server/YesLojistik.Tests/Integration/` altına tek test yazılır. Test silme/atlama yasak (`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **`client/src/lib/sections.ts:12-16`** — e-Fatura sekme dizisinin başına `{ to: '/faturalar?sekme=bekleyen', label: 'Faturalandırılacaklar' }` eklenir; `SectionTab` tipi sorgu parametreli adresi taşır. **1 saat.** Doğrulama: `cd client && npm run build`.
2. **`client/src/components/shell/SectionTabs.tsx:12-21`** — aktiflik `t.to === pathname` yerine adres + sorgu karşılaştırmasına çevrilir. **1,5 saat.** Doğrulama: `npm run lint && npm run build`.
3. **`client/src/components/InvoicesCounters.tsx` (yeni)** — beş kutu, `ui.tsx:322-338` ile; "Faturalandırılacak" kutusu `highlight` ve tutarlı, diğerleri sayı. **3 saat.** Doğrulama: `npm run build`.
4. **`server/YesLojistik.Api/Controllers/InvoicesController.cs:19-20`, `YesLojistik.Infrastructure/Services/InvoiceService.cs`, `YesLojistik.Core/Dtos/FinanceDtos.cs:139`** — salt okunur `GET /invoices/counters` ucu: `Draft, Issued, Cancelled, Overdue, UninvoicedTrips, UninvoicedTotal`. Migration **gerekmez**. **4 saat.** Doğrulama: `cd server && dotnet test`.
5. **`client/src/pages/InvoicesPage.tsx:26-43`** — `sekme=bekleyen` okunur; `bekleyen` iken gruplu görünüm, diğer durumda bugünkü liste. Sekme durumu adreste kalır (temizlenmez). **4 saat.** Doğrulama: `npm run lint && npm run build`.
6. **`InvoicesPage.tsx` (yeni iç bileşen)** — müşteriye göre gruplu liste: `GET /trips?invoiced=false&status=Delivered&pageSize=500`, istemcide `customerId` ile gruplama; başlıkta müşteri adı, sevkiyat sayısı, tutar, "Fatura Kes". **1,5 gün.** Doğrulama: adım 9'daki spec.
7. **`client/src/pages/InvoiceCreatePage.tsx:182-233`** — sağ kolon kaldırılır; tarih/vade/KDV/tevkifat "Otomatik" özet olarak altta yapışkan çubukta, ayrıntı açılır panelde; tek "Faturayı Kes" (`229`), "Taslak Kaydet" (`228`) `MoreMenu`'ye. **4 saat.** Doğrulama: `npx playwright test e2e/new-ui/cari-invoice.spec.ts`.
8. **`InvoicesPage.tsx:76-94`** — süzgeçler `FilterPanel`'e, İcmal/Excel/PDF ve `ImportButton` (`79`) `MoreMenu`'ye taşınır. **4 saat.** Doğrulama: `npm run build` + `npx playwright test e2e/forms.spec.ts`.
9. **`client/e2e/new-ui/faturalandirilacaklar.spec.ts` (yeni)** — §9'daki beş senaryo; test önce kendi müşterisini ve sevkiyatlarını oluşturur (`cari-invoice.spec.ts:18-29` deseni). **4 saat.** Doğrulama: `npx playwright test e2e/new-ui/faturalandirilacaklar.spec.ts`.
10. **`docs/GELISTIRME-PLANI.md` + `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:34,92`** — "Faturalandırılacaklar sekmesi ve sayaç kutuları yapıldı" satırı güncellenir. **1 saat.**

Toplam: **≈3,5 gün** (28 saat). Sıra bağımlıdır: 1-2 olmadan 5-6 görünmez, 4 olmadan 3 gerçek sayı gösteremez.

## 11. Kabul ölçütü

- Menüden e-Fatura → grup "Fatura Kes" → "Faturayı Kes": **3 tık**, tek müşteri grubunda (`docs/KOLAYLASTIRMA-UYGULAMA.md:330`).
- `?sekme=bekleyen` açıldığında *Faturalandırılacaklar* `aria-selected="true"`; sayfa yenilenince sekme korunur.
- 1440×900'de sayaçlar **tek satırda 5 kutu**, her kutu ≥180px; üst kısım toplamı **≤260px**.
- 390×844'te **yatay kaydırma yok**; sayaçlar 2 sütun, 5. kutu tam satır; düğme yüksekliği ≥44px.
- Faturalandırılacak sevkiyat sayısı ile sayaçtaki sayı **birebir** eşit (e2e karşılaştırması).
- KDV oranları farklı iki sevkiyat seçilince uyarı **1 tık içinde** görünür ve "Faturayı Kes" pasif kalır; biri çıkarılınca uyarı kaybolur (mevcut test korunur).
- Fatura Kes ekranında **tek** kaydetme düğmesi vardır; "Taslak Kaydet" yalnız `⋯ Diğer` menüsünde.
- Yeni spec'te **en az 5 test**; `dotnet test` toplamı düşmez; `npm run lint && npm run build` temiz.
- Ekranda teknik sözcük yok: "ayna", "token", "endpoint", "UBL" geçmez.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sekme sırası değişince başka sayfaların `sectionFor` eşleşmesi bozulur | Sorgu parametresi `sectionFor`'a verilmez, yalnız `pathname` eşleşir (`sections.ts:36-38`) | Sekme satırı geri alınır |
| `?sekme=bekleyen` eski yer imlerini etkiler | Yalnız ekleme; `sekme` yokken bugünkü liste aynen çalışır | Parametre yok sayılır |
| Sayaç için ikinci uç performansı düşürür | Tek toplu sorgu, `AsNoTracking`, tarih süzgeci yok | Uç kaldırılır, kutular `SumStrip`'e döner |
| Gruplu liste 500 kayıt sınırını aşar | Sınır aşılırsa uyarı + "Müşteri seç" yönlendirmesi | Bugünkü müşteri seçimli ekran korunur (`InvoiceCreatePage.tsx:31`) |
| Tek düğmeye geçiş "Taslak" alışkanlığını bozar | Taslak `⋯ Diğer` menüsünde kalır, uç aynı | İki düğme düzeni geri alınır (`227-230`) |
| KDV uyarısı yerleşim değişikliğinde kaybolur | Test kırmızıya düşerse iş bitmiş sayılmaz | Yerleşim geri alınır |

Her adım sonunda: testler → commit → `git pull --rebase origin main` → `git push origin HEAD:main` (`AGENTS.md` §3.6; `main`'e giden her şey canlıya çıkar).

## 13. Doğrulanacaklar

1. **"Vadesi geçen" tanımı:** vade tarihi geçmiş **ve** kalanı sıfırdan büyük faturalar mı, yoksa vadesi geçen tüm faturalar mı? (Kodda böyle bir süzgeç yok — `FinanceDtos.cs:22-31`.)
2. **Sayaç kümesi:** "Faturalandırılacak · Taslak · Kesilen · İptal · Vadesi geçen" mi, yoksa `docs/KOLAYLASTIRMA-PLANI.md:165`'teki "onay bekleyen · gönderilen · iptal" mi? İkincisi e-Fatura gönderim durumuna bağlıdır ve `05-E-FATURA.md` kapsamına girer.
3. **Sekme sırası:** *Fatura Kes* sekme mi kalmalı, yoksa yalnız ekran içi düğme mi olmalı? (`sections.ts:14` bugün sekme sayıyor.)
4. **Gruplama ölçütü:** müşteri mi, müşteri + KDV oranı mı? Farklı oranlı sevkiyatlar aynı faturaya giremediği için (`InvoiceService.cs:101-102`) ikinci bir kırılım gerekebilir.
5. **Tutar gösterimi:** grup tutarı KDV hariç mi (matrah), yoksa "+ KDV" ibaresiyle mi? Bugünkü şerit "+ KDV" der (`DashboardPage.tsx:74`).
6. **Sayaç verisi:** yeni `GET /invoices/counters` ucu mu açılacak, yoksa mevcut `/invoices/totals` (`InvoicesController.cs:19-20`) genişletilip dört kez mi çağrılacak? Sözleşme `30-VERI-API.md` ile kararlaştırılmalı.
7. **Ayna modunda sayaçlar:** faturalandırılacak sevkiyatlar pratikortam kaynaklıysa sayı gösterilecek mi, yoksa "—" mi yazılacak?

Sonraki belgeyle bağlantı: `05-E-FATURA.md` gönderim/e-Arşiv durumunu ve e-Fatura işlemlerini tanımlar; bu belge yalnız **henüz kesilmemiş** tarafla ve sayaç kutularının yerleşimiyle ilgilenir. `07-ALINAN-FATURALAR.md` aynı sekme çubuğunu tedarikçi yönünde kullanır; ortak parça kararları için `28-ORTAK-PARCALAR.md`, görsel jetonlar için `29-GORSEL-SISTEM.md`, sayaç verisinin sözleşmesi için `30-VERI-API.md` okunmalıdır. **Denetim notu (5 Ekim 2026):** `05` ve `07` yazıldı; `28`, `29` ve `30` numaralı belgeler `docs/plan/` altında henüz yok — `00-DIZIN.md:68-70` onları "bekliyor" olarak listeler. Bu üçüne yapılan atıflar yazılacak şartnameye yöneliktir, bugün okunacak bir dosya değildir.
