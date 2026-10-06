# 20 — Giderler

## 1. Amaç ve kapsam

Bu ekran aracın ve firmanın **bütün masraflarını** tek yerde toplar: yakıt, bakım/onarım,
otoyol/köprü, lastik, sigorta/kasko, vergi/harç, şoför harcırahı, şoför avansı, "diğer". Üç işi
vardır: **gider girmek** (`01-ORTAK-SARTNAME.md` §5'teki 10 sık işin **9 numarası**, "tek ekran"
hedefi), **şoförün telefondan girdiği masrafı onaylamak/reddetmek** ve **doğru yere yazmak** — gider
bir araca, sevkiyata ya da genel gidere bağlanır; **vadeli** gider tedarikçiye **borç** yazılır; KDV
tutarın içinden ayrılır.

Kapsam içi: kategori süzgeci, araç/sevkiyat bağlama, KDV oranı, vadeli giderin tedarikçiye borç
yazılması, fiş görseli, onay-red akışı, Excel (dışa ve içe), yeni görünümde sade üst şerit, telefon
kartı. Kapsam dışı: **mazotlar** (`19-OZ-MAL-MAZOTLAR.md` — `/mazotlar`), **araç masrafları**
(`21-OZ-MAL-ARAC-MASRAFLARI.md` — `mode` prop'u, `01-ORTAK-SARTNAME.md:212-213`), bakım kaydından
doğan giderin düzenlenmesi (`22-OZ-MAL-ARACLAR.md`), tedarikçi ödeme formu (`10`) ve tedarikçi cari
ekstresi (`09`).

---

## 2. Bugünkü durum (kod kanıtıyla)

### 2.1 Yer, menü, rota

Rota `/giderler` (`client/src/App.tsx:105`), tembel yükleme `App.tsx:26`. Sayfa tek dosya: liste
`client/src/pages/ExpensesPage.tsx:46-137`, gider formu `:156-311`, red penceresi `:139-154`. Klasik
menüde "Öz Mal" grubunda "Giderler" (`client/src/lib/nav.ts:52`), yeni menüde de aynı grupta **onay
bekleyen masraf sayacıyla** (`nav.ts:100-101`; sayaç `/api/dashboard`,
`server/YesLojistik.Core/Dtos/DashboardDtos.cs:8`). Yeni görünümde sayfa `sections.ts:26` "Öz Mal"
bölümünden açılır; sekmeler `SectionTabs.tsx:8-32` ve `ui.tsx:132` ile çizilir.

### 2.2 Süzgeçler ve toplam şeridi

Süzgeç durumu `ExpensesPage:50-57`: onay durumu (`:50`, adresten `onay` parametresiyle), arama
(`:52`), kategori (`:53`), araç (`:54`), tarih aralığı (`:55-56`), sıralama (varsayılan **tarih
azalan**, `:57`). Beş denetim `:113`'te `lg:grid-cols-3 2xl:grid-cols-5` ızgarasında durur; 1440px'te
üç sütun kaldığı için **ikinci satır boşa düşer**. Sorgu `:65` (`pageSize: 20`); sunucu süzgeci
`ExpensesController:35-52` on kategori, araç, sevkiyat, şoför, tedarikçi, tarih, onay, ödeyen dışında
dört alanda metin arama yapar (`:47-50`).

`TotalsStrip` (`:121-125`; `Exports.tsx:35-47`) Kayıt, Toplam, varsa "Onaylı" ve "Onay bekleyen"
gösterir; filtre seçili değilse "Reddedilen giderler toplama girmez." notunu yazar (`:125`). Sunucu
karşılığı `ExpensesController:78-86`. `?tripId=` varsa üstte "#N numaralı sevkiyata ait giderler
gösteriliyor." şeridi ve ✕ vardır (`:105-110`).

### 2.3 Tablo ve satır işlemleri

Sütunlar `:70-94`: **Tarih**, **Kategori** (rozet + "Onay bekliyor"/"Reddedildi" alt rozeti ve red
gerekçesi, `:72-76`), **Araç / Şoför** (`PlateBadge`, `:77`), **Sevkiyat** (`:78`), **Açıklama**
(tedarikçi + " · vadeli" ve "Fişi gör" bağlantısı, `:79-80`), **Tutar** (`tl2`, altında litre/km,
`:81`), işlemler (`:82-93`). Onay/Reddet düğmeleri yalnız `approvalStatus === 'Pending'` ve
`can('accounting')` iken çizilir (`:85-88`); Düzenle/Sil `IconButton write` taşır (`:89-90`). Satır
tıklaması formu açar (`:126`), boş metin süzgece göre değişir (`:128`).

### 2.4 Form, KDV ve vadeli borç

Form `ExpenseForm` (`:156-311`): kategori (dokuz seçenek, üç sütunlu rozet seçim — `:228-231`;
etiketler `labels.ts:40-50`), tutar + **KDV** (`:232-241`), tarih (`:242`), araç (`:243-246`; boşsa
"genel gider"), şoför (`:247-251`) ve katlanır bölüm (`:266-304`): sevkiyat, gider adı, kendi kategori
adı, tedarikçi, ödeme durumu, kasa/banka, dönem aralığı, fiş. `vatRate` ve `details` `:196`'da gövdeye
konur.

KDV kuralı `:178-193`: kullanıcı seçmedikçe oran kategoriden gelir (`expenseVatDefault`,
`labels.ts:53-63`: yakıt/bakım/otoyol/lastik/diğer %20; sigorta, vergi, harcırah, avans %0).
Seçilebilen oranlar `labels.ts:235` ve `docs/KDV-KURALLARI.md:19`: %0, %1, %10, %20. **Tutar KDV dahil
girilir** (`:236`), kârda gider KDV hariç düşülür (`docs/KDV-KURALLARI.md:33`, `ExpenseVat.cs`).
Sunucu, oran kategori varsayılanına eşitse **boş bırakır** (`ExpenseService:112`).

Vadeli gider: "Ödendi mi?" seçimi `:285-290`; şema tedarikçiyi zorunlu kılar (`:42`), sunucu aynı
kuralı uygular (`ExpenseService:92`; `PayableTests.cs:46-48`). Kasa/banka alanı yalnız hesap varsa
görünür (`:291-295`); şoför avansı/harcırahında şoför ya da sevkiyat zorunludur (`:41`).

### 2.5 Onay akışı, fiş, Excel

Onay `POST /api/expenses/{id}/approve`, red `.../reject` — ikisi de
`[Authorize(Policy = Policies.Accounting)]` (`ExpensesController:144-160`). Red penceresi gerekçe
ister (`ExpensesPage:139-154`); sunucu boş gerekçeyi reddeder, 300 karakter sınırı koyar, reddedilen
masrafı şoföre bildirir (`ExpenseService:34-46`). Onaylı gider sevkiyat kârına girer, bekleyen girmez
(`TripFigures.cs:20`).

Fiş: `POST /api/expenses/{id}/receipt` (12 MB istek sınırı, `ExpensesController:128-135`), yalnız
JPEG/PNG/WEBP/PDF ve en fazla 10 MB (`ExpenseService:49-57`); yükleme başarısızsa gider yine
kaydedilir, uyarı çıkar (`ExpensesPage:197-201`).

**Dışa:** `ExportButton url="/expenses/export" fileName="giderler.xlsx"` (`:101`); 13 sütun ve toplam
satırı (`ExpensesController:92-108`). **İçe:** `ImportButton entity="expenses"` (`:102`;
`ImportDialog.tsx:43`).

### 2.6 Yeni görünümde üst şerit

`PageHeader` (`ui.tsx:108-134`) yeni görünümde açıklama cümlesini gizler (`:113`), bölüm sekmelerini
ekler (`:132`). `/giderler` için `sections.ts:41-50`'de özel başlık **tanımlı değildir**; başlık
klasik "Giderler" kalır (`ExpensesPage:99`) — hedefte `newTitles`'a eklenir. Düğmeler `:100-104`:
Excel, "Excel'den Aktar", "Gider Ekle".

---

## 3. Hedef yerleşim

Üst kısmı sıkıştır, süzgeci **tek satıra** indir, tabloyu yükselt. Hedef: 1440×900'de **≥12 satır**,
başlıktan tablo başlığına **≤260px** (`01-ORTAK-SARTNAME.md` §5).

```
┌──────────────────────────────────────────────────────────────────────┐
│ Giderler                  [+ Gider Ekle] [Excel ▾]                   │
│ [Giderler] [Araçlar]  [Onaylı|Onay bekleyen 3|Reddedilen|Hepsi]      │
│ [🔍 Açıklama, plaka, şoför] [Kategori ▾] [Araç ▾] [Tarih ▾] [Süzgeç] │
│ Bugün 12.400,00 · Bu ay 186.500,00 · Bekleyen 3 · Toplam 42.900,00   │
│ Tarih      Kategori   Araç/Şoför  Sevkiyat  Açıklama     Tutar   ⋯   │
│▌03.10.2026 Yakıt      16 KZ 528   Bursa→…   Shell·vadeli 17.000,00   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Onay sekmeleri** (yeni): Onaylı · Onay bekleyen · Reddedilen · Hepsi; sayaçlı, seçim adreste
  (`?onay=` korunur, `:50`). `accounting` bekleyeni **1 tıkla** bulur; menü sayacı bu sekmeye bağlanır.
- **Süzgeç tek satır**: arama + kategori + araç + "Tarih" + "Süzgeç"; tarih aralığı, sevkiyat ve onay
  **tam ekran panelde** (`FilterPanel.tsx:7-62` — bugün yalnız `TripsPage.tsx:379, 466`).
- **Toplam şeridi** ikinci satıra iner, kalemleri tıklanabilir olur ve `SumStrip`'e çevrilir
  (`SumStrip.tsx:12`, `AGENTS.md` §8).
- **Hızlı giriş** (yeni): kategori ızgarasının **ilk satırında dört hazır kalem** (Yakıt ·
  Otoyol/Köprü · Bakım/Onarım · Diğer), kalan beş kalem "Diğer kategoriler" altında (`:228-231`).
- Satır yüksekliği 40-42px; işlemler sütunu en çok iki düğme (birincil onay + "⋯ İşlemler" `RowMenu`,
  `Menu.tsx:64-72`).
- **Gider ayrıntısı** satır tıklamasıyla sağdaki çekmecede açılır; `PageShell` ve `DetailDrawer` kodda
  **yoktur** (`01-ORTAK-SARTNAME.md:143-144`), §10'da `28-ORTAK-PARCALAR.md`'ye göre **eklenecektir**.
- Telefonda kart görünümü (`DataTable.tsx:50, 78-101`), süzgeçler tam ekran panelde.---

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Zorunlu | Davranış | Hata metni |
|---|---|---|---|
| Onay sekmeleri | — | Onaylı · Onay bekleyen (sayaçlı) · Reddedilen · Hepsi | — |
| Ara · Kategori · Araç · Tarih · Excel · Gider Ekle | hayır / — | Arama (açıklama, plaka, şoför), dokuz kategori, "Tüm araçlar", Bugün/Bu hafta/Bu ay/Özel; süzgeçle `giderler.xlsx` indirir; formu açar | "Dosya indirilemedi." |
| Kategori rozetleri | **evet** | Dokuz kalem; yakıt seçilince litre/km alanları çıkar | "Ne için harcandığını seçin." |
| Tutar (TL) · KDV · Tarih | **evet** / hayır | KDV **dahil**; oran kategoriden (%0/%1/%10/%20), elle değişir; tarih hızlı seçilir | "Tutar sıfırdan büyük olmalı." |
| Araç · Şoför · Sevkiyat | hayır (avans/harcırahta şoför **evet**) | Boş araç = genel gider; şoför/araç sevkiyattan dolar; bağlı gider kârdan düşülür | "Avans için şoför seçin." |
| Tedarikçi · Ödendi/Vadeli · Kasa/Banka | vadeli ise tedarikçi **evet** | Vadeli = tedarikçiye **borç yazılır**; kasa/banka paranın çıktığı hesap | "Vadeli gider için tedarikçi seçin." |
| Litre · Km · Önceki km | yakıtta isteğe bağlı | Litre fiyatı ve km başı maliyet ipucu; araç km'si güncellenir | "Litre sıfırdan büyük olmalı." |
| Fiş görseli · Onayla/Reddet | hayır / — | JPEG/PNG/WEBP/PDF ≤10 MB; onay yalnız `accounting` + "Onay bekliyor" | "Dosya en fazla 10 MB olabilir." || Fişi gör · ⋯ İşlemler · Vazgeç/Kaydet | — | Fişi açar; Düzenle · Sil · Kopyala (yeni); `Esc` kapatır (kirliyse sorar), `Ctrl+Enter` kaydeder | "Bu giderin fişi yok." |

Klavye: `Ctrl+Enter` kaydet, `Esc` kapat (`ui.tsx:153-205`); süzgeçte `Enter` arama; sekmelerde
`←`/`→`.

---

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** süzgeç yoksa "Henüz gider yok. Yakıt, otoyol gibi masrafları "Gider Ekle" ile girin.",
  varsa "Aramanıza uyan kayıt yok." (`ExpensesPage:128`). Hedefte ek **"Mazottan da girebilirsiniz"**
  bağlantısı (`19-OZ-MAL-MAZOTLAR.md`).
- **Yükleniyor / hata:** `DataTable` satır varken tabloyu soluklaştırır, satır yokken `Spinner`,
  hatada "Tekrar dene" gösterir (`DataTable.tsx:148`; `onRetry` → `ExpensesPage:126`). Hedef: 6 soluk
  satırlık iskelet ve şeritte "…" yer tutucu.
- **Yetkisiz:** `accounting` olmayan kullanıcı listeyi, süzgeçleri ve Excel'i görür; **Onayla/Reddet
  görünmez** (`:85`).
- **Ayna modu:** yazma düğmeleri `write` ile gizlenir (`ui.tsx:29-32, 46-48`): Düzenle, Sil (`:89-90`),
  "Gider Ekle" (`:103`), "Excel'den Aktar" (`ImportDialog.tsx:43`). **Excel dışa aktarma aynada da
  çalışır** (`Exports.tsx:8-11`). **Kural:** aynada satır tıklaması form değil, salt okuma çekmecesi
  açar (§10 adım 6).
- **Lisans/sahip modu:** süre dolunca salt okunur; liste, süzgeç ve Excel açık kalır (`docs/LISANS.md`).

---

## 6. Metinler ve terimler

Sekmeler: "Onaylı", "Onay bekleyen", "Reddedilen", "Hepsi". Süzgeçler: "Açıklama, plaka, şoför",
"Kategori", "Araç", "Tarih", "Süzgeç", "Süzgeci temizle". Şerit: "Bugün", "Bu ay", "Onay bekleyen",
"Toplam", "Reddedilen giderler toplama girmez." Sütunlar: "Tarih", "Kategori", "Araç / Şoför",
"Sevkiyat", "Açıklama", "Tutar". Form: "Ne için harcandı?", "Tutar (TL)", "KDV", "Tutar KDV dahil
girilir", "Tarih", "Araç", "Boş bırakılırsa genel gider sayılır.", "Şoför", "Litre", "Araç
kilometresi", "Önceki km", "Açıklama", "Sevkiyat, tedarikçi, ödeme, fiş ve diğer bilgiler (isteğe
bağlı)", "Sevkiyata bağlanan giderler sevkiyat kârından düşülür.", "Tedarikçi (servis, istasyon)",
"Ödendi mi?", "Vadeli (tedarikçiye borç yaz)", "Kasa / Banka", "Dönem başlangıcı", "Dönem bitişi",
"Fiş / fatura görseli", "Vazgeç", "Kaydet". Red penceresi: "Masrafı reddet", "Gerekçe", "Reddedilen
masraf raporlara ve şoför hesabına girmez; gerekçe şoföre bildirim olarak gider.", "Reddet".

Yardım metinleri `client/src/lib/pageHelp.ts:76-80`'den gelir; terimler `32-TERMINOLOJI.md` ve
`docs/TERIMLER.md` ile uyumlu olmalı. Tablo **onay beklediği** için toplu metin değişikliği yapılmaz
(`AGENTS.md` §6). Ekranda teknik sözcük yok: "ayna", "dry-run", "token", "endpoint" görünmez.

---

## 7. Telefon davranışı (390×844)

Bugün `mobileCard` **verilmemiştir** (`ExpensesPage:126`); 6 sütunlu tablo 390px'te yatay kaydırma
üretir ama `/giderler` `client/e2e/mobile.spec.ts:4` listesinde olduğu için bu testle yakalanır. Hedef
kart: üstte kategori rozeti ve tutar (mono), ikinci satırda tarih · plaka, üçüncüde açıklama ve
"vadeli · {tedarikçi}"; onay bekleyende "Onay bekliyor" rozeti ve 44px **Onayla / Reddet** düğmeleri;
altta "⋯ İşlemler". Kartta en fazla **bir durum rozeti** (`01-ORTAK-SARTNAME.md` §5). Sekmeler yatay
kayar şerit; süzgeçler **tam ekran panelde** (`FilterPanel.tsx:35-62`); "Gider Ekle" alt çubukta sabit.

---

## 8. Erişilebilirlik ve klavye

- Onay sekmeleri `role="tablist"`/`role="tab"` + `aria-selected`, sayaçlar `aria-live="polite"`;
  bugün onay süzgeci `aria-label="Onay durumu"` taşır (`ExpensesPage:114`), kategori ve araç
  süzgeçleri de etiketlidir (`:115-116`).
- Tablo başlıkları `<th>` (`DataTable.tsx:113-121`), tutar sütunu sağa dayalı ve `tabular-nums`
  (`:138`); işlemler hücresi satır tıklamasını durdurur (`ExpensesPage:84`).
- Klavye: `Ctrl+Enter` kaydet, `Esc` kapat (`ui.tsx:153-205`); süzgeçte `Enter`; sekmelerde `←`/`→`.
- Renk körlüğü: kategori ve onay durumu **rozet + metin** (`Badge`, `ui.tsx:70-77`); KDV "%20" gibi
  yüzde işaretiyle yazılır. Dokunma hedefi ≥44px; `:focus-visible` `client/src/index.css:102-106`.
- Formda etiket-alan bağı `Field` (`ui.tsx:136-149`); hata metni alanın altında. Tutar okunuşunun
  ekran okuyucuda yinelenmemesi için `aria-hidden` kullanımı uygulama sırasında doğrulanacak.

---

## 9. Testler (e2e + birim)

**Bugün var olanlar:** `client/e2e/workflow.spec.ts:169-186` (yakıt gideri litre + km ile girilir),
`:355-375` (şoför masrafı → `giderler?onay=Pending` → gerekçeli reddetme),
`client/e2e/forms.spec.ts:96-104` (sevkiyat seçilince araç/şoför sevkiyattan gelir),
`client/e2e/quick-add.spec.ts:24-25` (ayna metni); yeni görünümde yalnız menü adı sınanır
(`client/e2e/new-ui/basics.spec.ts:24`). Sunucu: `VatRulesTests.cs:133-147` (KDV oranları),
`FleetTests.cs:42-51` (onay/boş gerekçe reddi), `FuelAndAdvanceTests.cs:35-45` (avans için şoför
zorunlu), `PayableTests.cs:46-48, 109-118` (vadeli borç, fiş), `ReportsAndExportsTests.cs:234, 245`
(toplam, Excel).

**Eklenecek:** `client/e2e/new-ui/expenses.spec.ts` (yeni) — `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile 6 senaryo: (1) "Onay bekleyen" sekmesi yalnız bekleyenleri
listeler, sayaç satır sayısıyla uyuşur; (2) "Onayla" sonrası satır "Onaylı" olur, şeritte bekleyen
tutarı düşer; (3) vadeli gider kaydedilince tedarikçi borcu artar; (4) KDV %10 seçilince kâra KDV
hariç yansır; (5) fiş yüklenince "Fişi gör" açılır; (6) 375×812'de kart görünümü, yatay kaydırma yok.
**Birim:** süzgeç birleşimleri ve `ExpenseVat.NetOf` eşleşmesi
(`server/YesLojistik.Tests/Unit/TripProfitTests.cs:77-101`). Test silme/atlama yok.

---

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **Ortak parçalar.** `PageShell`/`DetailDrawer` kodda **yok** (`01-ORTAK-SARTNAME.md:143-144`);
   `SumStrip` var, `FilterBar`/`FilterPanel` var ama yalnız Sevkiyatlar'da (`TripsPage.tsx:379, 466`).
   Doğrulama: `cd client && npm run lint && npm run build`. Süre: 4 saat.
2. **Onay sekmeleri + sayaç.** `ExpensesPage:50, 114, 121-125`; seçim `?onay=`'da kalır.
   Doğrulama: `npx playwright test e2e/new-ui/expenses.spec.ts`. Süre: 3 saat.
3. **Süzgeç tek satır.** `ExpensesPage:113-120` — `FilterBar`; tarih aralığı, sevkiyat ve onay
   `FilterPanel`'e. Doğrulama: `npm run build`. Süre: 4 saat.
4. **Şerit `SumStrip`.** `ExpensesPage:121-125`; "Bugün"/"Bu ay" için `ExpenseQuery`'ye hazır tarih
   aralığı eklenir. Doğrulama: `cd server && dotnet test --filter ReportsAndExportsTests`. Süre: 5 saat.
5. **Başlık.** `sections.ts:41-50` — `/giderler: 'Giderler'`, `/arac-masraflari`. Süre: 0,5 saat.
6. **Ayna uyumu + kategori ızgarası.** `ExpensesPage:126` (ayna: salt okuma çekmecesi), `:228-231`
   (ilk satırda dört hazır kalem). Doğrulama:
   `npx playwright test e2e/quick-add.spec.ts e2e/forms.spec.ts`. Süre: 4 saat.
7. **Telefon kartı.** `ExpensesPage:126` — `mobileCard`; `mobile.spec.ts:4` korunur. Doğrulama:
   `npx playwright test e2e/mobile.spec.ts`. Süre: 4 saat.
8. **Ayrıntı çekmecesi.** `ExpensesPage:79-81` — fiş, plaka, tedarikçi, litre/km ve red gerekçesi tek
   panelde. Süre: 3 saat.
9. **e2e spec ve tam doğrulama.** `client/e2e/new-ui/expenses.spec.ts` (yeni); ardından
   `cd server && dotnet test`, `npm run lint && npm run build`, `npx playwright test`. Süre: 4 saat.
10. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`; doğrulama:
    `git diff --stat`. Süre: 0,5 saat.

Toplam: **32,5 saat ≈ 4 iş günü**.

---

## 11. Kabul ölçütü

1. 1440×900'de liste **≥12 satır**; başlıktan tablo başlığına yükseklik **≤260px**.
2. Dört onay sekmesi **tek tıkla** değişir; "Onay bekleyen" sayacı menü sayacıyla (`nav.ts:101`) ve
   liste satır sayısıyla **birebir** uyuşur.
3. **Şoför masrafı 3 tıkta onaylanır**: sayfa → "Onay bekleyen" → "Onayla"; gerekçesiz reddetme
   kaydedilemez, gerekçe satırda görünür (`ExpensesPage:73-75`).
4. **Vadeli gider tedarikçiye borç yazar:** borç **KDV dahil tam tutar** kadar artar; tedarikçisiz
   vadeli kayıt **engellenir** (`ExpensesPage:42`, `ExpenseService:92`).
5. **KDV:** varsayılan oran doğrudur (yakıt %20, sigorta %0, `labels.ts:53-63`); tutar **KDV dahil**
   girilir, kârda gider **KDV hariç** düşülür (%20'de 1.200 → 1.000, `VatRulesTests.cs:133`).
6. **Excel** süzgeçle iner: `giderler.xlsx`, 13 sütun + toplam satırı (`ExpensesController:96-108`);
   şeritteki "Toplam" ile aynıdır.
7. 390×844'te **yatay kaydırma yok**; dokunma hedefleri **≥44px**; kartta en fazla bir durum rozeti.
8. Aynada **hiçbir** yazma düğmesi görünmez (Gider Ekle, Düzenle, Sil, Aktar); satır tıklaması salt
   okuma çekmecesi açar, **Excel çalışır**.
9. Yeni spec'te **6 senaryo** yeşil; `dotnet test` ve `npm run lint && npm run build` temiz geçer;
   ekranda teknik sözcük yok, tutar `tl2` ile iki kuruş, tarih `03.10.2026`, plaka `PlateBadge`.

---

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Vadeli gider yanlış tedarikçiye borç yazar | Tedarikçi zorunlu; kaydetmeden önce "…'a borç yazılacak" özeti | Kayıt silinir; borç cari ekstreden izlenir |
| KDV oranı iki yerde (istemci `labels.ts:53-63`, sunucu `ExpenseVat.DefaultFor`) ayrışır | Sunucu tek kaynak sayılır (`ExpenseService:112`), eşleşme birim testiyle denetlenir (`TripProfitTests.cs:77-85`) | İstemci tablosu kaldırılır |
| Onay/red geri alınamaz (aynı duruma ikinci çağrı erken döner, `ExpenseService:38`) | Sekme + sayaç bekleyenleri netleştirir; reddedilen gerekçesiyle görünür | Reddedilen masraf yeniden onaylanabilir |
| Süzgeç tek satıra inince sevkiyat/tarih kaybolur | `FilterPanel`'de tamamı korunur; `?tripId=` şeridi (`:105-110`) kalır | Adım 3 geri alınır, beş denetimli ızgara döner |
| `PageShell`/`DetailDrawer` yokken çekmece yazılması | Önce §10 adım 1 | Adım 1 geri alınır, çekmece kapatılır |
| Bakım kaydından gelen gider silinemez (`ExpensesController:166-167`) | Hata metni korunur; "Sil" pasif ve ipuçlu gösterilir | Düğme eski hâline döner |

---

## 13. Doğrulanacaklar

1. **Araç zorunlu mu olsun?** Bugün boş bırakılınca "genel gider" sayılır (`ExpensesPage:243`).
2. **"Mazotlar" sınırı:** yakıt kaydının hangi ekranda girileceği `19-OZ-MAL-MAZOTLAR.md` yazılana
   kadar kesin değil (`sections.ts:26`'da `/mazotlar` yok).
3. **Araç masrafları** (`21`) `mode` prop'u ile mi, ayrı sayfa mı olacak? Sütun/süzgeç farkı buna bağlı.
4. **Sekme ve şerit kalemleri:** dört onay sekmesi yeterli mi; "Bugün"/"Bu ay" toplamı isteniyor mu?
   Sunucu bugün yalnız Kayıt/Toplam/Onaylı/Onay bekleyen verir (`ExpensesController:83-85`).
5. **"Kopyala"** işlemi isteniyor mu? Bugün kopyalama yoktur.
6. **Onay yetkisi:** yalnız `accounting` mi (`ExpensesController:145`), yönetici de mi? Şoförün kendi
   masrafını geri çekmesi gerekli mi?
7. **Tedarikçi** peşin giderde isteğe bağlı kalmalı mı (kategori analizi için gerekli mi)?
8. **pratikortam'daki "Masraflar"** ekranının sütun/süzgeç sırası birebir alınmalı mı?
9. **KDV %1** `vatRateChoices` (`labels.ts:235`) ve `docs/KDV-KURALLARI.md:19`'da var; hangi kategori
   için önerilecek? Bugün kategoriden %1 gelmez.
---

Sonraki belgeyle bağlantı: `19-OZ-MAL-MAZOTLAR.md` yakıt kaydının ayrı sayfasını,
`21-OZ-MAL-ARAC-MASRAFLARI.md` aynı sayfanın araç odaklı görünümünü, `09-TEDARIKCILER-CARI.md` vadeli
giderin tedarikçi borcuna yansımasını ve `28-ORTAK-PARCALAR.md` bu ekranın ihtiyaç duyduğu
`PageShell`/`DetailDrawer`/`FilterBar`/`RowMenu` parçalarını anlatır; sıradaki belge
`21-OZ-MAL-ARAC-MASRAFLARI.md`'dir.
