# 17 — Personel listesi

## 1. Amaç ve kapsam

Personel listesi (`/personel`, `client/src/App.tsx:96`) ofis ve depo çalışanlarının aylık maaşını,
o ay verilen avansı, hak edilen primi ve yapılan maaş ödemesini tek tabloda toplar; ay sonunda
ödenmesi gereken kalanı gösterir. Kural kodun kendi başlığında yazılıdır:
"Kalan = maaş + prim − avans − ödenen" (`client/src/pages/StaffPage.tsx:51`).

Bu ekran `docs/plan/01-ORTAK-SARTNAME.md` §5'teki en sık 10 iş listesinde doğrudan geçmez;
şoförler ayrı listede tutulur (`client/src/lib/nav.ts:43`). İki işi dolaylı besler:

- **10. Aylık kazancı görmek:** personel maliyeti Analiz kırılımında yer alır
  (`docs/KOLAYLASTIRMA-UYGULAMA.md:376`); buradaki prim ve avans kayıtları o raporun girdisidir.
- **Kasa/banka bakiyesinin doğru kalması:** avans ve maaş ödemesi bir hesaba bağlanınca bakiyeden
  düşer (`StaffPage.tsx:155`, `server/YesLojistik.Infrastructure/Services/CashService.cs:42-46`).

Kapsam: başlık ve üst eylem alanı, ay seçimi, arama, süzgeç, özet şeridi (`StatCard` yerine
`Figures`), ortak liste iskeleti, tablo sütunları, satır sonu işlemleri, avans/prim/maaş ödemesi
penceresi, kasa/banka seçiminin bakiye etkisi, telefon kartı, kabul ölçütleri.

Kapsam dışı: şoför listesi (`16-LISTE-SOFORLER.md`), sabit ödemeler (`18-LISTE-SABIT-ODEMELER.md`),
kasa/banka ekranı (`11-BANKALAR.md`), ortak parçalar (`28-ORTAK-PARCALAR.md`), görsel jetonlar
(`29-GORSEL-SISTEM.md`). Bu belge kod değiştirmez.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** Rota `App.tsx:96`'da `Guard perm="accounting"` ile korunur; klasik menüdeki adı
"Personeller" (`nav.ts:45`), yeni menüde "Personel Listesi" (`nav.ts:95`). Yeni görünümde başlık
`newTitles` üzerinden değişir: `'/personel': 'Personel Listesi'` (`client/src/lib/sections.ts:46`).
Sunucuda sınıf `[Authorize(Policy = Policies.Accounting)]` taşır
(`server/YesLojistik.Api/Controllers/StaffController.cs:16`).

**İskelet.** Sayfa `PageHeader` kullanır (`StaffPage.tsx:51-55`): başlık "Personeller", alt başlıkta
kalan formülü, sağda `ImportButton` "Excel'den Aktar" (`StaffPage.tsx:53`) ve `write` işaretli
"Personel Ekle" (`StaffPage.tsx:54`). **`PageShell` ve `DetailDrawer` kodda YOK**
(`01-ORTAK-SARTNAME.md:143-144`, `28-ORTAK-PARCALAR.md:26`). Personelde **hiç "⋯ Diğer" menüsü ve hiç Excel'e aktarma düğmesi
yoktur**; sunucuda `/api/staff/export` ucu da yoktur — denetleyicide yalnız `api/staff` yolları
vardır (`StaffController.cs:15, 77, 84, 97`). Tüm veriyi indiren genel yedekte personel yine vardır:
`personel.csv` ve `personel-hareketleri.csv`
(`server/YesLojistik.Api/Infrastructure/DataExportService.cs:53-54`).

**Özet kutuları.** Üç `StatCard` (`StaffPage.tsx:56-60`): "Bu ayın maaşları" (yalnız çalışanlar,
satır 57), "Verilen avans" (satır 58), "Ödenecek kalan" (satır 59, yalnız `max(0, remaining)`
toplanır). `StatCard` tanımı `client/src/components/ui.tsx:302-316`'dadır. Otoyol'un rakam şeridi
`Figures` (`ui.tsx:322-324`) + `Figure` (`ui.tsx:327-338`) hazırdır ve başka sayfalarda kullanılır
(`DashboardPage.tsx:67`, `ReportsPage.tsx:118`, `FleetPanels.tsx:267`). Hedef, `F4.1`'de yazıldığı
gibi bu kutuları `Figures` şeridine çevirmektir (`docs/KOLAYLASTIRMA-UYGULAMA.md:356`,
`docs/TASARIM-OTOYOL.md:112`). Dikkat: `CariPage.tsx:227` içinde aynı adlı yerel bir `Figures`
vardır ve `items` dizisi alır; personelde `ui.tsx:322`'deki çocuk tabanlı sürüm kullanılmalıdır.

**Ay seçimi ve tablo.** Ay, `Card` başlığının sağındaki `<input type="month" aria-label="Ay">` ile
değişir (`StaffPage.tsx:61-63`); varsayılan bu aydır (`StaffPage.tsx:21, 25`) ve sorgu anahtarına
girer (`StaffPage.tsx:26`). Tabloda **arama, sıralama ve sayfalama yoktur**: `sort`, `onSort`,
`page`, `total`, `onPage` prop'ları geçilmez; `SearchBox` (`DataTable.tsx:179-186`) bu sayfada
kullanılmaz. Sütunlar (`StaffPage.tsx:32-47`): Personel (alt satırda telefon · not ya da
"Başlangıç …", satır 33-36), Maaş (37), Avans (turuncu `−`, 38), Prim (yeşil `+`, 39), Ödenen (40),
Kalan (41; kalan ≤ 0 ise yeşil) ve `write` işaretli tek satır düğmesi "Düzenle" (42-46).
"Çalışmıyor" rozeti ad hücresindedir (34).

**Telefon kartı.** `DataTable`'a `mobileCard` verilir (`StaffPage.tsx:66-71`): ad + "Maaş …" ve sağda
kalan. Kart listesi `sm` altında görünür, tablo `hidden sm:block` olur (`DataTable.tsx:101`).

**Hareketler ve kalan hesabı.** Satıra tıklayınca `StaffLedger` açılır (`StaffPage.tsx:74, 134-179`):
üstte hareket formu (tür · tutar · tarih · hesap · not), altta hareket listesi. Türler Avans / Prim /
Maaş ödemesi (`StaffPage.tsx:19`), renkleri turuncu, yeşil, mavi (20). "Hangi hesaptan ödendi?"
kutusu **yalnız Prim dışındaki türlerde** görünür (155) ve ipucu aynen şudur: "Seçerseniz kasa/banka
bakiyesinden düşer." Hesap seçilirse kayıt kasa/banka hareketine dönüşür (`CashService.cs:42-46`:
avans "Personel avansı", ödeme "Maaş ödemesi"). Sunucu primi hesaba hiç bağlamaz
(`StaffController.cs:89`) ve olmayan hesabı reddeder (90).

**Kalanın hesabı.** Sunucu ayı `yyyy-MM` ile çözer, boşsa bu ayı alır (`StaffController.cs:20-24`);
maaş yalnız çalışan ve işe başlangıcı ay sonundan önce olan personel için tahakkuk eder (39); kalan
`Money.Round(maaş + prim − avans − ödenen)` olarak döner (44). Liste çalışanlar önce gelecek biçimde
sıralanır (30). Kalan **eksi olabilir** (fazla ödeme). Hareketi olan personel silinemez: sunucu
"Hareketi olan personel silinemez; "Çalışmıyor" olarak işaretleyebilirsiniz." der (70-71); pencere
aynı cümleyi onay kutusunda tekrarlar (`StaffPage.tsx:118-119`).

**Doğrulama sınırları.** Ad soyad zorunlu ve en çok 150 karakter, TC kimlik doğrulanır, telefon
biçimi kontrol edilir, maaş eksi olamaz, not en çok 500 karakter
(`server/YesLojistik.Core/Validation/Validators.cs:491-495`); hareket tutarı sıfırdan büyük olmalı
(504). İstemci şeması bu sınırların yalnız bir kısmını taşır: ad zorunlu (`StaffPage.tsx:80`), maaş
eksi olamaz (84), tutar sıfırdan büyük (127), tarih zorunlu (126). Uzunluk, TC ve telefon kuralları
istemcide **yoktur** — `req` yalnız boş olmama, `optStr` yalnız isteğe bağlı metin arar
(`client/src/lib/forms.ts:5-6`); sunucudan dönen alan hatası forma `applyServerErrors` ile işlenir
(`StaffPage.tsx:99`).

**Aktarma.** Personel Excel'den aktarılabilir (`ImportDialog.tsx:8`); başlık "Personel" (21), ipucu
"Şoförler buraya değil Şoförler sayfasına aktarılır." (35). Sunucu sütunları: Ad Soyad · TC Kimlik
No · Telefon · İşe Başlangıç · Maaş · Not
(`server/YesLojistik.Infrastructure/Services/ImportService.cs:54`).

## 3. Hedef yerleşim

```
┌───────────────────────────────────────────────────────────────┐
│ Personel Listesi                    [⋯ Diğer] [+ Personel Ekle]│
│ [🔍 Ad, telefon, not ara]  [Ay: 2026-10 ▾]  [Süzgeç (1)]      │
│ (Durum: Çalışmıyor ✕)              Süzgeci temizle             │
│ ÇALIŞAN … │ AYLIK MAAŞ … │ AVANS … │ PRİM … │ ÖDENEN … │ KALAN …│
│ ┌ tablo ──────────────────────────────────────────────────────┐│
│ │ Personel        Maaş      Avans   Prim    Ödenen    Kalan  ⋯││
│ └─────────────────────────────────────────────────────────────┘│
│ Toplam N kayıt                                                │
└───────────────────────────────────────────────────────────────┘
```

Üst kısım (başlık → tablo başlığı) **≤260px** olmalıdır (`01-ORTAK-SARTNAME.md:237`); `.th` ~38px,
`.td` 7px+7px dolgu ile ~44px satır verir (`client/src/index.css:119-120`). Personel sayısı genelde 30'un
altındadır; ölçüt "12 satır" değil, **kaydırmasız tüm liste** ve 260px sınırıdır.

Yer değişiklikleri:

1. `PageHeader` ve dağınık düğmeler yerine tek `PageShell` (28 numaralı belge); Excel maddeleri
   "⋯ Diğer" altına iner, başlıkta yalnız "+ Personel Ekle" kalır.
2. Üç `StatCard` yerine üç `Figure`'lü tek şerit; kutular tıklanınca sırasıyla "yalnız çalışanlar",
   "çalışmıyor" ve "kalan > 0" süzgecini uygular.
3. Ay kutusu `Card` başlığından süzgeç çubuğuna taşınır; klasik görünümde bugünkü yeri korunur.
4. Tabloya **arama** ve **sıralama** eklenir; `DataTable` bunu zaten destekler
   (`DataTable.tsx:110-124`), `sortKey` + `onSort` verilmelidir.
5. Satır sonuna "İşlemler" menüsü gelir: **Avans gir · Prim gir · Maaş ödemesi gir · Düzenle · Sil**
   (son madde `write` + `accounting`). Böylece en sık iş satırdan 1 tıkla başlar.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ad, telefon, not; istemcide süzülür | — |
| Ay | ay seçici | hayır | Boşsa bu ay (`StaffPage.tsx:21`); adrese `?ay=2026-10` yazılır | — |
| Süzgeç (n) | düğme | hayır | Sağdan `FilterPanel`; n = açık çip sayısı | — |
| Durum | radyo | hayır | Çalışanlar · Çalışmıyor · Hepsi | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar (`/aktar?tur=personel`; dikkat: `/aktar` sihirbazı bugün yalnız 4 varlık tanır — `client/src/lib/importMeta.ts:2, 20` — `staff` eklenmelidir) · Kalanı olanlar | — |
| + Personel Ekle | ana düğme | — | `write` + `accounting`; ayna modunda gizlenir (`ImportDialog.tsx:43` deseni) | "Bu işlem için yetkiniz yok." |
| Satır: İşlemler | menü | — | Avans gir · Prim gir · Maaş ödemesi gir · Düzenle · Sil | — |
| "Ne kaydedilecek?" | radyo | evet | Avans (maaştan düşülür) · Prim (maaşa eklenir) · Maaş ödemesi (`StaffPage.tsx:148-152`) | "Seçim yapın." |
| Tutar | tutar | evet | Sıfırdan büyük (`Validators.cs:504`) | "Tutar sıfırdan büyük olmalı." |
| Tarih | tarih | evet | Varsayılan bugün (`StaffPage.tsx:138`) | "Tarih zorunlu." |
| Hesap | seçim | hayır | **Yalnız Avans ve Maaş ödemesinde**; seçilirse bakiyeden düşer (`StaffPage.tsx:155`) | "Kasa/banka hesabı bulunamadı." |
| Not | metin | hayır | En çok 500 karakter | "Not en çok 500 karakter." |
| Personel formu (ad, maaş, telefon, TC, başlangıç, not, durum) | form | ad + maaş | Bugünkü pencere korunur (`StaffPage.tsx:109-115`) | "Ad soyad zorunlu.", "Maaş eksi olamaz." |

Klavye: `Ctrl+Enter` kaydeder, `Esc` kapatır (`01-ORTAK-SARTNAME.md:72`); "⋯ Diğer" ve satır menüsü
`↑`/`↓` ile gezinir (`Menu.tsx:29-30`), `Esc` kapatır (28), menü açılınca ilk maddeye odaklanır (21);
süzgeç kutusu `aria-haspopup="dialog"` taşır (`FilterPanel.tsx:14`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste.** Bugünkü metin korunur ("Henüz personel yok… Şoförler bu listeye değil Şoförler
  sayfasına girilir.", `StaffPage.tsx:65`). Arama/süzgeç doluyken "Bu aramaya uyan personel yok." ve
  "Süzgeci temizle" gösterilir.
- **Yükleniyor.** Bugün gövde `opacity-50` ile soluklaşır (`DataTable.tsx:126`), kayıt yoksa `Spinner`
  çizilir (148). Hedef `29-GORSEL-SISTEM.md`'deki 6 satırlık iskelet.
- **Hata.** `error` + `onRetry` ile `ErrorState` (`StaffPage.tsx:64`).
- **Yetkisiz.** `accounting` yoksa rota kapalıdır (`App.tsx:96`); tüm yazma düğmeleri `write`
  işaretlidir (`StaffPage.tsx:44, 54, 172`).
- **Ayna.** `MirrorWriteGuard` `/api/staff` yolunu korur
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:17`); ayna açıkken yazma düğmeleri
  gizlenir, liste okunur kalır.
- **Lisans.** Süre dolunca salt okunur: GET dışındaki `/api` istekleri 403 döner, adresinin son
  bölümünde `export` geçen istekler serbest kalır (`docs/LISANS.md:57, 69`). Personelde bugün dışa
  aktarma ucu yoktur (§2); bu yüzden eklenen istemci CSV'si salt okunurlukta da çalışır.

## 6. Metinler ve terimler

Görünecek metinler: "Personel Listesi", "Personel Ekle", "Diğer", "Ara", "Ay", "Süzgeç",
"Süzgeci temizle", "Çalışanlar", "Çalışmıyor", "Hepsi", "Personel", "Maaş", "Avans", "Prim",
"Ödenen", "Kalan", "Çalışan", "İşlemler", "Avans gir", "Prim gir", "Maaş ödemesi gir", "Düzenle",
"Sil", "Hareketler", "Henüz hareket yok.", "Ne kaydedilecek?", "Maaştan düşülür", "Maaşa eklenir",
"Maaşın ödenen kısmı", "Hangi hesaptan ödendi?", "Seçerseniz kasa/banka bakiyesinden düşer.",
"Kaydedildi.", "Personel kaydedildi.", "Personel silindi.", "Toplam N kayıt", "Kaydı sil",
"Hareketi olan personel silinemez; "Çalışmıyor" olarak işaretleyebilirsiniz."

Yeni görünümde başlık **"Personel Listesi"** olur (`sections.ts:46`,
`docs/KOLAYLASTIRMA-PLANI.md:80`); "Personeller" klasik menüde kalır. Terimler `docs/TERIMLER.md` ve
`docs/plan/32-TERMINOLOJI.md` ile uyumludur: ekranda "ayna", "dry-run", "token", "endpoint" geçmez.
Para `tl()`/`tl2()` ile iki kuruş, tarih `03.10.2026`.

## 7. Telefon davranışı (390×844)

Bugün telefonda kart çizilir (`StaffPage.tsx:66-71`), `DataTable` kart listesini `sm` altında
gösterir (`DataTable.tsx:101`); `mobile.spec.ts:4` `/personel` yolunu taşır, 12-14 yatay taşmayı
ölçer. Hedef kart (~92px): üstte ad + "Çalışmıyor" rozeti, altta `Maaş 45.000,00 TL` ·
`Avans −5.000,00 TL`, sağda kalın **Kalan**; kart altında tek "İşlemler" düğmesi (≥44px). Ay ve
süzgeç tam ekran `FilterPanel` içinde toplanır (`FilterPanel.tsx:49`), alt çubukta "Listeyi göster"
durur. Hareket formu tek sütuna iner (`StaffPage.tsx:147` ızgarası `sm:grid-cols-2`).

## 8. Erişilebilirlik ve klavye

- Şerit `aria-label` taşır (`ui.tsx:323`); "+"/"−" işaretleri yazıyla verilir
  (`StaffPage.tsx:38-39`), anlam yalnız renge bağlı değildir.
- Tablo başlıkları gerçek `<th>`'dir (`DataTable.tsx:113`, biçim `index.css:119`); sıralama düğmesi
  başlık metnini taşır, `aria-sort` eklenmesi hedeftir.
- Odak halkası 3px (`index.css:102-106`); dokunma hedefi `min-h-10` ≈ 44px (`index.css:110-111`).
- Ay kutusunun erişilebilir adı "Ay"dır (`StaffPage.tsx:63`). Hareket radyo grubu `Field group` ile
  `role="group"` + `aria-label` alır (`ui.tsx:142`).
- Kalan eksi olduğunda renk yeşil kalır; metin "fazla ödendi" ipucu taşımalıdır.

## 9. Testler (e2e + birim)

Mevcut e2e: **`cari.spec.ts:66-96`** personel akışını uçtan uca sınar — "Personeller" bağlantısı
(71), "Personel Ekle" (73), 50.000,00 TL maaşın tabloda görünmesi (77-78), satıra tıklayıp "Avans"
radyosu + 5.000 tutar (79-82) ve kalanın 45.000,00 TL'ye inmesi (85). `mobile.spec.ts:4, 12-14`
`/personel`'de taşma olmadığını doğrular; `new-ui/basics.spec.ts:24` yeni menü adını listeler.

Eklenecek: **`client/e2e/new-ui/staff-list.spec.ts`** (`useNewUi`, `helpers.ts:44-46`), 6 test:
(1) başlık ve tek ana düğme + "⋯ Diğer"; (2) üç kutulu şerit ve kalan toplamının tabloyla uyuşması;
(3) arama süzmesi ve `Esc` ile temizleme; (4) ay değişiminin adrese yazılması ve geçmiş ayda maaşın
0 görünmesi; (5) "İşlemler" → "Avans gir" penceresinin Avans türüyle açılması; (6) hesap seçilerek
girilen avansın kasa/banka hareketinde "Personel avansı" olarak görünmesi. Sunucu sözleşmesi
değişmez; mevcut kapsam `StaffTests.cs:11-34`'tedir (ay özeti, kasa hareketi, silme kısıtı). Test
silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`client/src/components/shell/PageShell.tsx` (yeni).** Başlık + `more` menüsü + tek ana düğme.
   *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
2. **`StaffPage.tsx:51-55`.** `PageHeader` → `PageShell`; Excel maddeleri menüye iner. *Süre: 2 saat.*
   Doğrulama: `cd client && npx playwright test e2e/cari.spec.ts -g "personeller"`.
3. **`StaffPage.tsx:56-60`.** Üç `StatCard` → `Figures` + `Figure` × 3 (`ui.tsx:322-338`;
   `CariPage.tsx:227`'deki yerel sürüm kullanılmaz). *Süre: 2 saat.*
   Doğrulama: `cd client && npx playwright test e2e/new-ui/staff-list.spec.ts`.
4. **`StaffPage.tsx:61-63`.** Ay kutusu süzgeç çubuğuna; seçim `?ay=yyyy-MM`. *Süre: 2 saat.*
   Doğrulama: `cd client && npm run build`.
5. **`shell/FilterPanel.tsx` (mevcut).** Ayrı bir `FilterBar.tsx` **yoktur**; `FilterBar` (7-32) ve
   `FilterPanel` (35-62) aynı dosyadadır. Personelde ilk kez kullanılır; bugün yalnız `TripsPage`
   kullanır (`01-ORTAK-SARTNAME.md:140-142`). *Süre: 3 saat.*
   Doğrulama: `cd client && npx playwright test e2e/mobile.spec.ts`.
6. **`StaffPage.tsx:32-47, 64-71`.** Arama, sıralama (`sortKey`), `total`/`onPage` bağlanır
   (`DataTable.tsx:110-124, 150-163`). *Süre: 3 saat.*
   Doğrulama: `cd client && npx playwright test e2e/new-ui/staff-list.spec.ts`.
7. **`StaffPage.tsx:42-46`.** Satır sonuna `RowMenu`: Avans gir · Prim gir · Maaş ödemesi gir ·
   Düzenle · Sil; ilk üçü pencereyi tür seçili açar. *Süre: 3 saat.*
   Doğrulama: `cd client && npx playwright test e2e/cari.spec.ts`.
8. **`StaffPage.tsx:134-179`.** Hareket penceresi ortak sözleşmeye uydurulur; hesap kuralı
   (`StaffPage.tsx:155`) ve ipucu korunur. *Süre: 3 saat.*
   Doğrulama: `cd server && dotnet test --filter StaffTests`.
9. **Excel'e aktar.** Sunucuda uç yok; `F4.1` uyarınca istemcide CSV üretilir (`;` ayraç, UTF-8 BOM,
   yeni bağımlılık yok). *Süre: 2 saat.* Doğrulama: `cd client && npm run lint && npm run build`.
10. **`client/e2e/new-ui/staff-list.spec.ts` (yeni, 6 test).** §9 senaryoları; ayrıca
    `cari.spec.ts:66-96` metin değişiklikleriyle aynı commit'te güncellenir. *Süre: 4 saat.*
    Doğrulama: `cd client && npx playwright test e2e/new-ui/staff-list.spec.ts e2e/cari.spec.ts`.

Toplam: **~27 saat (3,5 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası: testler →
commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 1440×900'de başlıktan tablo başlığına mesafe **≤260px**; kayıt 12'den azsa liste kaydırmasız.
2. Üstte **tek ana düğme** ve **tek "⋯ Diğer"**; menüde 4 madde; Excel düğmeleri başlıkta görünmez.
3. `grep -c "StatCard" client/src/pages/StaffPage.tsx` → **0**; şerit **3 kutu**; "Bu ayın maaşları"
   yalnız çalışanları içerir (`StaffPage.tsx:57`).
4. Kalan = maaş + prim − avans − ödenen; 50.000 maaş + 5.000 avans → **45.000,00 TL**
   (`cari.spec.ts:85`).
5. Hesap seçilerek girilen avans/ödeme kasa/bankada **1 hareket**; prim hesaba bağlanmaz
   (`StaffController.cs:89`).
6. Arama yazıldığında tablo süzülür, `Esc` temizler, sayfa yenilenmez.
7. Ay adrese yazılır (`?ay=2026-09`); geçmiş ayda işe başlamamış personelin maaşı **0**
   (`StaffController.cs:39`, `StaffTests.cs:29`).
8. 390×844'te yatay kaydırma yok; kart ≤100px, dokunma hedefi ≥44px.
9. Mevcut e2e testleri + **6 yeni** test yeşil; test silinmez/atlanmaz.
10. `cd client && npm run lint && npm run build` temiz; `StaffPage` içinde teknik sözcük yok.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| `PageShell` gecikirse sayfa eski kalır | İlk gün `PageHeader` ile devam edilir | `StaffPage.tsx:51-55` eski hâline döner |
| `Figures`'a geçerken simge/renk kaybı | `Figure` etiket + değer + ton alır (`ui.tsx:327`) | Üç `StatCard` geri konur |
| Eksi kalan (fazla ödeme) yanlış anlaşılır | İşaret ve "fazla ödendi" ipucu metinle verilir | Renk kuralı eski hâle döner (41) |
| Excel için sunucu ucu yok | İstemcide CSV (`F4.1`, yeni bağımlılık yok) | Menü maddesi kaldırılır |
| Klasik metne bağlı testler kırılır | Yeni görünüm varsayılan olana kadar metinler korunur | Adım 6 geri alınır |
| Aynada yazma düğmeleri görünür kalır | `write` + `MirrorWriteGuard.cs:17` | Düğmeler gizlenir |

## 13. Doğrulanacaklar

1. **Yeni sütun gerekli mi?** pratikortam'da İşe başlangıç, TC ve Maaş ödemesi ayrı sütundur
   (`docs/PRATIKORTAM-HARITA.md:121`); bugün İşe başlangıç ad altındadır (33-36), TC hiç görünmez.
   Sütun eklenecek mi, ayrıntı kartında mı kalacak?
2. **"Listeler" bölüm sekmesi kurulacak mı?** `/personel` hiçbir bölümde değildir; `sectionFor` bu
   yolda `undefined` döner (`sections.ts:36-38`).
3. **Excel biçimi:** istemci CSV'si mi, yeni bir `/api/staff/export` ucu mu (`F4.1` "dur ve sor")?
4. **Silme:** hareketi olmayan personel silinsin mi, yalnız "Çalışmıyor" mu işaretlensin
   (`StaffController.cs:70-71`)?
5. **Geçmiş tarihli hareket** hangi ayın kalanına yazar (`StaffController.cs:31`)? Kullanıcı bunu
   bekliyor mu?
6. **Şoför–personel ayrımı:** şoföre maaş girilmek istenirse bu ekran mı, şoför hesabı mı
   (`FleetPanels.tsx:257`, `pageHelp.ts:12`) kullanılacak?
7. **Atıflar.** `18-LISTE-SABIT-ODEMELER.md` **artık yazılmıştır** ve `:22, 284-285`'te bu ekranla
   aynı F4.1 iskeletini, `StaffPage`'i ve `StatCard` → `Figures` kararını paylaştığını doğrular.
   `28-ORTAK-PARCALAR.md` de yazılmıştır; `:26`'da `PageShell`/`DetailDrawer`'ın kodda olmadığını,
   `:36`'da `FilterBar`'ın `shell/FilterPanel.tsx:7-32`'de durduğunu doğrular.
   `19-OZ-MAL-MAZOTLAR.md` ile `20-OZ-MAL-GIDERLER.md` de yazılmıştır ama personel ekranını
   ilgilendirmez. Buna karşılık `16-LISTE-SOFORLER.md`, `29-GORSEL-SISTEM.md` ve
   `32-TERMINOLOJI.md` **henüz yazılmamıştır**; ayrıca `KOLAYLASTIRMA-PLANI.md`,
   `KOLAYLASTIRMA-UYGULAMA.md` ve `TASARIM-OTOYOL.md` `docs/` kökündedir.

Sonraki belgeyle bağlantı: `18-LISTE-SABIT-ODEMELER.md` aynı ortak liste iskeletini ve aynı
`StatCard` → `Figures` dönüşümünü devralır (`18-LISTE-SABIT-ODEMELER.md:22, 284-285`); `11-BANKALAR.md`
bu ekranda hesap seçilince oluşan
"Personel avansı" / "Maaş ödemesi" hareketlerinin kasa/banka tarafını, `28-ORTAK-PARCALAR.md` ise
`PageShell`, `RowMenu` ve `FilterBar` sözleşmesini tanımlar.
