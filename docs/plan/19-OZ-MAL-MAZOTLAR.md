# 19 — Mazotlar (yeni sayfa)

## 1. Amaç ve kapsam

Bu ekran **yalnızca yakıt (mazot) kayıtlarını** tek yerde toplar. Bugün yakıt, diğer bütün giderlerle
aynı listede durur; kullanıcı mazot girerken bakım, otoyol ve harcırah satırlarının arasından geçer.
Yeni sayfada yalnız depo doldurma kayıtları vardır; her satır bir depoyu anlatır: hangi araç, hangi
tarih, hangi istasyon, kaç litre, kaç TL, hangi kilometre, önceki depoya göre kaç km ve **km başı
maliyet**.

Ekran `01-ORTAK-SARTNAME.md` §5'teki 10 sık işten **9 numaralı "mazot/gider girmek"** işini karşılar:
hedef, tek ekrandan **"+ Mazot Ekle"** ile kaydı kısa yoldan girmek ve hemen ardından "bu araç km'de ne
yakıyor" cevabını aynı listede görmek. İkinci iş: dönem sonunda **kaç litre, kaç TL, kaç km**
yapıldığını tek şeritten okumak (10 numaralı "aylık kazancı görmek" işinin akaryakıt ayağı).

Kapsam içi: `/mazotlar` rotası ve `client/src/pages/FuelPage.tsx`; on sütun; altta toplam şeridi;
"+ Mazot Ekle" düğmesinin gider formunu **Fuel kategorisi sabit** açması; Giderler sayfasının yakıt
dışını göstermesi; yeni rota, menü girdisi ve sekme.

Kapsam dışı: **yeni kayıt türü ve yeni tablo yoktur**, çünkü yakıt zaten bir giderdir
(`server/YesLojistik.Core/Entities/Expense.cs:5, 19-22, 52-56` — `ExpenseCategory Category`, `Liters`,
`Odometer` ve "Yakıt ayrıntısı" alanları aynı tabloda durur). İstasyon kartı, yakıt faturası
eşleştirmesi, taşeron aracının mazotunun cariye yazılması, pompa entegrasyonu ve akaryakıt stok takibi
kodda yoktur.

---

## 2. Bugünkü durum (kod kanıtıyla)

### 2.1 Yakıt verisi ve bugünkü giriş

Yakıt ayrı tablo değildir; `Expense` kaydının `Category = 'Fuel'` olmasıdır
(`client/src/api/types.ts:13`). `liters` ve `odometer` doğrudan gider üzerindedir (`types.ts:478-479`);
istasyon, yakıt türü, litre fiyatı ve önceki km "ayrıntılar" nesnesindedir (`types.ts:494-504`).
Sunucu bu dört alanı yalnızca kategori Fuel ise yazar
(`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:124-127`) ve girilen km araç
kartındakinden büyükse **araç kilometresini ileri taşır** (`:96-101`); form bunu "Araç km'si de
güncellenir" diye yazar (`client/src/pages/ExpensesPage.tsx:256`).
Girişin tek yolu gider formudur: "Gider Ekle" (`ExpensesPage.tsx:103`) `ExpenseForm` penceresini açar
(`:130`); pencerenin tanımı `:156`'da başlar. Kategori listesinde "Yakıt" vardır
(`client/src/lib/labels.ts:41`) ve **varsayılan kategori Fuel'dir** (`ExpensesPage.tsx:175`). Kategori
Fuel olunca **Litre**, **Araç kilometresi**, **İstasyon**, **Yakıt Türü** ve **Önceki km** alanları
görünür (`:252-264`); ipuçları anlık litre fiyatını, farkı ve
km başı maliyeti gösterir (hesap `:185, :188`). Bu matematik bugün de vardır, ama **yalnız formun
içinde**; listede tek iz, "Tutar" hücresinin altındaki litre ve km satırıdır (`:81`).

### 2.2 Giderler sayfası ve sunucu uçları

- Rota `/giderler` (`client/src/App.tsx:105`); menüde "Öz Mal" grubunda "Giderler"
  (`client/src/lib/nav.ts:52-53`, `:100-101`), sekmelerde aynı ad (`client/src/lib/sections.ts:26`).
- Süzgeçler: onay durumu, **kategori**, araç, başlangıç, bitiş (`ExpensesPage.tsx:113-120`). Varsayılan
  kategori süzgeci **boştur**, yani liste yakıt dahil her şeyi gösterir (`:53`). Sütunlar: Tarih,
  Kategori, Araç / Şoför, Sevkiyat, Açıklama, Tutar, işlemler (`:70-94`).
- Üst şerit `TotalsStrip`'tir: Kayıt, Toplam, gerekiyorsa Onaylı ve Onay bekleyen (`:121-125`).
  `AGENTS.md` §8 bunların `SumStrip`'e çevrilmesini ister (`SumStrip.tsx:12-41`).
- Liste `GET /api/expenses` (`ExpensesController.cs:54-59`) ve toplamlar `GET /api/expenses/totals`
  (`:78-86`); süzgeç **tek kategorilidir** (`FinanceDtos.cs:74`). "Yakıt hariç" süzgeci yoktur; bu
  belgenin eklediği tek sunucu alanı budur. Dışa aktarmada **Litre** ve **Km** sütunları vardır
  (`ExpensesController.cs:105-106`), istasyon, yakıt türü ve önceki km yoktur.
- Araç bazlı yakıt raporu vardır: `ReportService.FuelAsync`
  (`server/YesLojistik.Infrastructure/Services/ReportService.cs:89-110`) araç başına dolum sayısı,
  litre, tutar, ortalama litre fiyatı, toplam km ve **L/100 km** üretir; Analiz → Yakıt sekmesinde
  görünür. O rapor aracı olmayan ve onaysız dolumları dışlar; satır bazında fark ve km başı maliyet
  yoktur.

### 2.3 Menü, sekmeler ve testler

`nav.ts:98-103` içinde "Öz Mal" grubunda yalnız iki öğe vardır ve hemen üstünde bir not durur:
"Mazotlar ve Araç Masrafları kendi sayfalarıyla F4'te eklenir" (`:99`); menü girdisi bilerek
bekletilmiştir. Bölüm sekmeleri `sections.ts:26` tek satırdır: Giderler, Araçlar.

E2E'de yakıt **dolaylı** sınanır: litre alanı, litre fiyatı ipucu, kategori değişince alanların
gizlenmesi ve yakıt raporu `client/e2e/workflow.spec.ts:169-190` içindedir; gider formunun sevkiyat
bağlantısı `client/e2e/forms.spec.ts:96-107`'de, `/giderler` mobil kontrolü
`client/e2e/mobile.spec.ts:4`'te durur. `/mazotlar` ve "Mazotlar" adı bu listelerde **yoktur**.

---

## 3. Hedef yerleşim

Yerleşim: üstte başlık, sağda "Excel" ve "+ Mazot Ekle"; altında sekmeler; sonra tek süzgeç satırı
(arama, araç, tarih aralığı); sonra toplam şeridi ve tablo. Hedef: 1440×900'de **≥12 satır**,
başlıktan tablo başlığına yükseklik **≤260px**.

Tek kart: başlık yuvasında `SearchBox` (desen `ExpensesPage.tsx:112`); süzgeç satırında araç açılır
listesi ve tarih aralığı (`:116-119`). Sonda en çok iki düğme vardır: "Düzenle" ve "⋯ İşlemler"
(`client/src/components/shell/Menu.tsx:64-72`). Plaka `PlateBadge`, para `tl2`, tarih `03.10.2026` ile
gösterilir. Satır tıklaması kaydı aynı gider penceresinde Fuel kategorisiyle açar. Ayrı ayrıntı
çekmecesi **gerekmez**; `DetailDrawer` ve `PageShell` kodda **yoktur**
(`01-ORTAK-SARTNAME.md:143-144`), ilk sürüm bunlara bağlanmaz.

---

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Ara | metin kutusu | hayır | Plaka, istasyon ve açıklama içinde arar | — |
| Araç | açılır liste | hayır | `vehicleId` süzgeci; "Tüm araçlar" varsayılan | — |
| Tarih aralığı | iki tarih | hayır | `from`/`to`; varsayılan **bu ay** | "Başlangıç bitişten sonra olamaz." |
| Excel | ikincil düğme | — | Süzgeçle yakıt dosyasını indirir | "Dosya indirilemedi." |
| **+ Mazot Ekle** | birincil düğme | — | Gider formunu **Fuel sabit** açar | — |
| ⋯ İşlemler | satır menüsü | — | Düzenle · Fişi gör · Sil | "Kayıt silinsin mi?" |
| Tutar / Litre (form) | sayı | evet | Sıfırdan büyük | "Tutar sıfırdan büyük olmalı." |
| Yeni km / Eski km | tam sayı | hayır | Yeni km aracın kilometresini ileri taşır | "Tam sayı girin." (bugünkü metin, `ExpensesPage.tsx:37`) |
| İstasyon / Yakıt cinsi | metin | hayır | Serbest metin; listeye aynen basılır | — |
| Vazgeç / Kaydet | pencere düğmeleri | — | `Esc` kapatır, `Ctrl+Enter` kaydeder | — |

**Fark ve km başı maliyet** istemcide hesaplanır: fark, yeni km eksi eski km; km başı maliyet, tutar
bölü fark. Bugün bu iki değer **yalnız gider formunun ipucunda** yaşar: fark `ExpensesPage.tsx:185`'te,
km başı maliyet `:188`'de hesaplanır ve `:261`'de ipucu olarak yazılır. Fark yoksa ya da 0 veya
negatifse Mazotlar listesinde iki sütun "—" gösterir; "Eski km girilmedi" ipucu **bu sayfada yeni
yazılır** (kodda böyle bir metin yoktur). Liste herkese açıktır; ekleme, düzenleme ve silme düğmeleri
`write` bayrağı taşır ve ayna modunda gizlenir (`ui.tsx:29-32`). Excel aynada da görünür
(`client/src/components/Exports.tsx:8-11`).

---

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** hiç kayıt yoksa "Henüz mazot kaydı yok. İlk depoyu “+ Mazot Ekle” ile girin.";
  süzgeç doluysa "Aramanıza uyan mazot kaydı yok."; araç seçili ama kaydı yoksa "Bu aracın kayıtlı
  deposu yok." (Desen: `ExpensesPage.tsx:128`.)
- **Yükleniyor:** `DataTable` satır varken tabloyu soluklaştırır (`client/src/components/DataTable.tsx:126`;
  mobil kartta `:79`), satır yokken `Spinner` gösterir (`:148`); hedef 6 soluk satırlık iskelet.
- **Hata:** hata durumu ve "Tekrar dene"; süzgeçler korunur.
- **Yetkisiz:** muhasebe yetkisi olmayan kullanıcı listeyi ve Excel'i görür, yazma düğmelerini görmez.
- **Ayna modu:** kayıtlar pratikortam'dan gelir, sunucu yazmayı reddeder
  (`01-ORTAK-SARTNAME.md` §3.5). Şoför uygulamasından gelen yakıt **onay bekliyor** olabilir
  (`ExpensesPage.tsx:73`); bu satırlar rozet ve metinle işaretlenir.
- **Lisans/sahip modu:** lisans yoksa tam çalışır; süre dolunca salt okunur olur (`docs/LISANS.md`).

---

## 6. Metinler ve terimler

Başlık **"Mazotlar"** (menü ve sekmede); klasik menüde de aynı ad kullanılır ve `docs/TERIMLER.md`
onayı beklediği için toplu metin değişikliği yapılmaz (`AGENTS.md` §6). Kategori etiketi ekranda
**"Yakıt"** kalır (`client/src/lib/labels.ts:41`), sütun başlığı **"Yakıt cinsi"** olur.

Düğmeler: "+ Mazot Ekle", "Excel", "Vazgeç", "Kaydet", "Düzenle", "Sil", "Fişi gör". Sütun başlıkları:
"Plaka", "Tarih", "Yakıt cinsi", "İstasyon", "Litre", "Tutar", "Yeni km", "Eski km", "Fark km",
"Km başı maliyet". Şerit: "Toplam litre", "Tutar", "Km", "Ortalama litre", "Km başı maliyet",
"Onay bekleyen". Form başlıkları bugünkü gibi kalır (`ExpensesPage.tsx:228-265`).

Teknik sözcük yasak: "ayna", "dry-run", "token" ve "endpoint" ekranda görünmez
(`01-ORTAK-SARTNAME.md` §5). Litre "L", kilometre "km", para "TL" ile yazılır; tutar iki kuruş
basamağında gösterilir.

---

## 7. Telefon davranışı (390×844)

Bugün gider tablosunun mobil kart yuvası verilmemiştir (`ExpensesPage.tsx:126`), bu yüzden 390px'te
tablo kendi kabında yatay kayar (`DataTable.tsx:101`); sayfa düzeyinde taşma olmaz
(`client/e2e/mobile.spec.ts:12-14`). Mazotlar sayfası bunu **baştan** doğru yapar: `DataTable`'ın
`mobileCard` yuvası kullanılır (`DataTable.tsx:50, 78-101`), `sm` altında tablo gizlenir.

Kart düzeni: üst satırda plaka rozeti ve tutar (sağda, mono); ikinci satırda tarih, yakıt cinsi ve
istasyon; üçüncü satırda litre ve yeni km; alt satırda fark km ve km başı maliyet; en altta 44px
yüksekliğinde "Düzenle" ve "⋯ İşlemler". Fark hesaplanamıyorsa alt satırın ikinci yarısı "—" olur.
Süzgeçler telefonda **tam ekran panelde** açılır (`client/src/components/shell/FilterPanel.tsx:35-62`);
toplam şeridi iki sütunlu ızgaraya döner (`SumStrip.tsx:19`). Kabul: **yatay kaydırma yok**
(`client/e2e/mobile.spec.ts`).

---

## 8. Erişilebilirlik ve klavye

- Tablo başlıkları `<th>` (`DataTable.tsx:113-121`), tutar, litre ve km hücreleri sağa dayalı ve
  `tabular-nums` (`:138`); sayılar Overpass Mono ile yazılır (`client/src/index.css:97-99`).
- Şeridin ekran okuyucu adı `label` prop'uyla verilir (`SumStrip.tsx:12, 19`); §6'daki kalem etiketleri
  kutuların içinde durur. Bugün satır **yalnız fareyle** açılır (`ExpensesPage.tsx:126` →
  `onRowClick={setEditing}`, `DataTable.tsx:128`); `DataTable` satırlarında `tabIndex`/`onKeyDown`
  **yoktur** (0 eşleşme) — Mazotlar sayfası satırı odaklanabilir yapacak ve `Enter` ile pencereyi
  açacaktır (bu belgenin eklediği davranış).
- Renk körlüğü: onay durumu **rozet ve metin** ile verilir (`Badge`, `ui.tsx:70-77`). Ortalamanın %15
  üstündeki araç vurgusu yalnız Analiz → Yakıt sekmesinde renkle yapılır (`ReportsPage.tsx:257`);
  Mazotlar sayfası bu vurguyu **almaz**, böylece "satırda en fazla 1 durum rozeti" kuralı korunur.
- Dokunma hedefi ≥44px; odak halkası `client/src/index.css:102-106`'dan gelir.

---

## 9. Testler (e2e + birim)

Bugün var olanlar: yakıt alanları ve litre fiyatı ipucu gider formunda
(`client/e2e/workflow.spec.ts:169-190`), gider formunun sevkiyat bağlantısı
(`client/e2e/forms.spec.ts:96-107`), masraf onay akışı (`client/e2e/workflow.spec.ts:346-370`), şoför
uygulamasından gelen yakıt (`client/e2e/driver-app.spec.ts:58-63`), `/giderler` mobil kontrolü
(`client/e2e/mobile.spec.ts:4`) ve menü adları (`client/e2e/new-ui/basics.spec.ts:24`). Mazotlar
sayfasına özel spec **yoktur**.

Eklenecek e2e: `client/e2e/new-ui/fuel.spec.ts` (yeni) — `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile yedi senaryo: (1) menüde "Mazotlar" görünür ve tıklanınca sayfa
açılır; (2) liste yalnız yakıt gösterir, bakım kaydı görünmez; (3) şerit toplamı satırlarla uyuşur;
(4) "+ Mazot Ekle" penceresi Fuel sabit açılır ve yakıt alanları doğrudan görünür; (5) kayıt sonrası
satırda fark km ve km başı maliyet görünür; (6) araç süzgeci yalnız o aracın depolarını bırakır;
(7) 375×812'de kart görünümü vardır ve yatay kaydırma yoktur.

Güncellenecek testler: `mobile.spec.ts:4` listesine `/mazotlar`, `basics.spec.ts:24` menü listesine
"Mazotlar" eklenir; test silme ve atlama yasaktır. Sunucu tarafında "yakıt hariç" süzgeci
`ExpensesController.Filter` içinde denenir (`:35-52`). Fark ve km başı hesabı saf fonksiyon olarak
yazılır ve üç durumla test edilir: normal fark, sıfır fark, eski km boş.
`server/YesLojistik.Tests/Integration/LegacyDetailsTests.cs:51-55` (yakıt ayrıntılarının — istasyon,
önceki km — kaydı) bozulmadan geçmelidir.

---

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **Sunucu süzgeci (yakıt hariç).** `server/YesLojistik.Core/Dtos/FinanceDtos.cs:72-83` içine
   `ExcludeFuel` alanı eklenir; `ExpensesController.cs:35-52` içinde kategori süzgecinden sonra
   `Category != ExpenseCategory.Fuel` koşulu yazılır. Doğrulama:
   `cd server && dotnet test --filter Expense`. Süre: 1,5 saat.
2. **Excel sütunları.** `ExpensesController.cs:88-108` — ihracata "İstasyon", "Yakıt türü",
   "Önceki km" ve "Fark km" sütunları **sona** eklenir; toplam satırı (`:93`) bozulmaz. Doğrulama:
   `dotnet build YesLojistik.Api`. Süre: 2 saat.
3. **Gider formu parametreleri ve yeni sayfa iskeleti.** `ExpensesPage.tsx:156` ve altı — `ExpenseForm`
   `lockCategory` ve `defaultCategory` prop'u alır; kilitliyken kategori seçimi değiştirilemez olur
   (`:228-231`) ve sevkiyat bağlantısı verilse bile Fuel kilidi korunur. Ardından
   `client/src/pages/FuelPage.tsx` (yeni) yazılır: başlık "Mazotlar", Excel düğmesi, `write` işaretli
   "+ Mazot Ekle"; veri yakıt süzgeciyle `usePaged`'den, toplamlar `useListTotals`'tan çekilir
   (`client/src/lib/hooks.ts:26, 41`). Doğrulama: `cd client && npm run build`. Süre: 6 saat.
4. **Sütunlar ve şerit.** `FuelPage.tsx` — on sütunlu tablo tanımı (`Column<T>` tipi
   `client/src/components/DataTable.tsx:24-31`, mobil kart yuvası `:50`);
   `client/src/lib/format.ts` yanına fark ve km başı maliyet saf fonksiyonları; şerit `SumStrip` ile
   kurulur (`SumStrip.tsx:12-41`). Doğrulama: `cd client && npm run build`. Süre: 4 saat.
5. **Rota, menü, sekme.** `client/src/App.tsx:26` ve `:105` — tembel içe aktarma ve `/mazotlar` rotası;
   `client/src/lib/nav.ts:98-103` — gruba "Mazotlar" öğesi eklenir ve `:99` notu kaldırılır;
   `client/src/lib/sections.ts:26` — sekmeler "Giderler · Araç Masrafları · Mazotlar · Araçlar" olur.
   Doğrulama: `cd client && npm run lint && npm run build`. Süre: 2 saat.
6. **Giderler sayfası yakıtı bırakır.** `ExpensesPage.tsx:53` ve `:65` — sorguya yakıt hariç süzgeci
   eklenir; `:115` kategori açılır listesinden Fuel çıkarılır ve başlık yanına "Mazot kayıtları Mazotlar
   sayfasında." bağlantısı konur. Doğrulama: `npx playwright test e2e/forms.spec.ts`. Süre: 3 saat.
7. **Mobil kart ve panel.** `FuelPage.tsx` — mobil kart yuvası; süzgeçler `sm` altında tam ekran
   (`FilterPanel.tsx:35-62`); `client/e2e/mobile.spec.ts:4` listesine `/mazotlar` eklenir. Doğrulama:
   `npx playwright test e2e/mobile.spec.ts`. Süre: 4 saat.
8. **E2E spec.** `client/e2e/new-ui/fuel.spec.ts` (yeni) — §9'daki yedi senaryo;
   `basics.spec.ts:24` listesine "Mazotlar". Doğrulama: `npx playwright test e2e/new-ui/fuel.spec.ts`.
   Süre: 4 saat.
9. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md` ve `docs/TERIMLER.md`
   önerisi. Doğrulama: `git diff --stat`. Süre: 1 saat.

Toplam: **27,5 saat ≈ 4 iş günü**; 7 ve 8 paralel yürütülürse 3 gün.

---

## 11. Kabul ölçütü

1. `/mazotlar` rotası vardır; yeni menüde "Öz Mal" grubunda "Mazotlar" **tek tıkla** açılır.
2. Liste **yalnız** yakıt kayıtlarını gösterir; aynı dönemde girilen bakım veya otoyol kaydı görünmez.
3. Sütun sırası tam olarak şudur: plaka, tarih, yakıt cinsi, istasyon, litre, tutar, yeni km, eski km,
   fark km, km başı maliyet.
4. Şeritte **beş** kalem vardır (toplam litre, tutar, km, ortalama litre, km başı maliyet) ve sayfadaki
   satırların toplamıyla **kuruşu kuruşuna** uyuşur.
5. Eski km boş ya da fark sıfır veya negatif olan satırda "Fark km" ve "Km başı maliyet" **"—"**
   gösterir; başka bir satırın değeri tekrarlanmaz.
6. "+ Mazot Ekle" penceresi **Fuel sabit** açılır, kategori değiştirilemez ve litre ile km alanları ilk
   bakışta görünür; kayıt **2 tık + form** ile tamamlanır. (`01-ORTAK-SARTNAME.md:229` iş 9 için
   "tek ekran" der; tık hedefi bu belgenin ölçütüdür.)
7. Giderler sayfası yakıt kaydı göstermez ve "Mazot kayıtları Mazotlar sayfasında." bağlantısı vardır.
8. 1440×900'de liste **≥12 satır**; başlıktan tablo başlığına yükseklik **≤260px**.
9. 390×844'te kart görünümü vardır, **yatay kaydırma yok**; `mobile.spec.ts` `/mazotlar` yolunu denetler.
10. Aynada hiçbir yazma düğmesi görünmez; Excel çalışır ve dosya iner.
11. Ekranda teknik sözcük yoktur; litre "L", km "km", plaka `PlateBadge`, para `tl2` ile gösterilir.
12. Yeni e2e spec'inde **7 senaryo** yeşildir; yakıt ayrıntıları ve gider testleri bozulmadan geçer,
    `npm run lint && npm run build` temizdir.

---

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Giderler'den yakıtın çıkarılması kullanıcıyı şaşırtır | Başlık yanına Mazotlar bağlantısı (adım 6) | Süzgeç kaldırılır, liste eski hâline döner |
| Aynı kayıt iki yerde düzenlenir, çift kayıt sanılır | Tek kaynak: yakıt süzgeçli gider listesi | Sayfa ve menü girdisi kaldırılır |
| Km başı maliyet yanlış (eski km elle ve hatalı girilmiş) | Fark sıfır veya negatifse "—" gösterilir | Sütun ve şerit kalemi gizlenir |
| Eski kayıtlarda önceki km boş kalır | Boş kabul edilir, satır "—" gösterir | Sütunlar kaldırılır |
| On sütun dar ekranda sıkışır | `sm` altında kart görünümü (`DataTable.tsx:78-101`) | Kart kapatılırsa üç sütun kalır |
| Excel'e eklenen sütunlar mevcut dosyayı bozar | Sütunlar sona eklenir (adım 2) | Yeni sütunlar geri alınır |
| Menüdeki F4 notunun silinmesi başka belgeyle çelişir | Notu yalnız bu adımda kaldır | Not satırı geri yazılır |

Bütün iş yeni sayfa, iki süzgeç alanı ve menü ile sekme satırından oluşur; geri alınırsa panel bugünkü
davranışına döner ve **hiçbir veri kaybı olmaz**.

---

## 13. Doğrulanacaklar

1. **Önceki km otomatik mi gelsin?** Bugün elle girilir (`ExpensesPage.tsx:261-262`).
2. **Fark km ve km başı maliyet sunucuda mı hesaplansın?** Kayıt sayısı büyürse gider toplamları
   yanıtına litre ve km eklenmelidir; bu, henüz yazılmamış `30-VERI-API.md` (durum: bekliyor,
   `00-DIZIN.md:70`) kapsamına girer.
3. **Ortalama litre fiyatı** toplam tutar bölü toplam litre mi, dolu depoların ortalaması mı? Analiz →
   Yakıt raporu bugün **toplam tutarı toplam litreye böler** ve yalnız litresi girilmiş dolumları
   hesaba katar (`ReportService.cs:97-99`); satır başı litre fiyatlarının ortalamasını **almaz**.
4. **Yakıt cinsi serbest metin mi, liste mi?** Bugün serbest metindir (`client/src/api/types.ts:500`).
5. **Taşeron aracının mazotu** bu sayfada görünsün mü? Görünürse gider tedarikçiye borç yazılarak
   cariye de işlenir (`ExpensesPage.tsx:280-290`).
6. **Onay bekleyen** depolar listede kalsın mı, ayrı sekmede mi görünsün? Onayla ve Reddet düğmeleri
   (`:85-88`) Mazotlar sayfasına taşınsın mı?
7. **Excel dosyasında** istasyon, yakıt türü, önceki km ve fark sütunları yeterli mi?
8. **Menüde grup konumu:** "Mazotlar" "Öz Mal" grubunda mı kalsın, tek başına üstte mi dursun?

---

Sonraki belgeyle bağlantı: `20-OZ-MAL-GIDERLER.md` aynı gider formunun yakıt **dışı** kullanımını ve
şerit dönüşümünü anlatır (yazıldı). `21-OZ-MAL-ARAC-MASRAFLARI.md` araç başına masraf görünümünü,
`22-OZ-MAL-ARACLAR.md` bu sayfanın ileri taşıdığı **araç kilometresini** anlatacak; ikisi de henüz
yazılmadı (`00-DIZIN.md:61-62`, durum: bekliyor). `28-ORTAK-PARCALAR.md` ise `RowMenu`, `FilterPanel`
ve `SumStrip` ortak parçalarını yazar; sıradaki belge `20-OZ-MAL-GIDERLER.md`'dir.
