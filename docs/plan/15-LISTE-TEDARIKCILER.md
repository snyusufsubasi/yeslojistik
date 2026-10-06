# 15 — Tedarikçi listesi

## 1. Amaç ve kapsam

Tedarikçi listesi (`/tedarikciler`, `client/src/App.tsx:98`) firmanın **borçlu olduğu tarafları** tek
tabloda toplar: taşeron / kiralık araç sahipleri, servis ve tamir atölyeleri, akaryakıt istasyonları
ve diğer tedarikçiler. Sayfanın kendi alt başlığı bunu aynen söyler: "Taşeron araç sahipleri, servisler
ve akaryakıt istasyonları · firmanın borçlu olduğu taraflar" (`client/src/pages/SuppliersPage.tsx:44`).
Ekranın işi, pratikortam'daki "Tedarikçi Listesi" alışkanlığını korumaktır
(`docs/KOLAYLASTIRMA-UYGULAMA.md:67, 477`).

Bu ekran `docs/plan/01-ORTAK-SARTNAME.md` §5'teki en sık 10 iş listesinde doğrudan geçmez; üç işi
dolaylı besler:

- **8. Tedarikçiye ödeme girmek:** satıra tıklamak ayrıntıyı açar, ödeme düğmesi oradadır
  (`client/src/pages/SupplierDetailPage.tsx:55`).
- **6. Bakiyeyi/ekstreyi görmek:** satır → ayrıntı → "Hesap Ekstresi" PDF'i
  (`SupplierDetailPage.tsx:50-52`).
- **10. Aylık kazancı görmek:** tedarikçi borcu Analiz'in girdisidir; "Cari Tablosu" düğmesi
  bakiyeleri toplu gösterir (`SuppliersPage.tsx:46`).

Kapsam içi: ortak iskelet (başlık, ana düğme, "⋯ Diğer" menüsü), tür (taşeron / servis / akaryakıt /
diğer) ayrımı, arşivdeki (pasif) kayıtları gösterme, Excel'e aktarma ve Excel'den aktarma, cari
tablosuyla bağlantı, kiralık araç sahiplerinin bu listeye girmesi, satır menüsü, süzgeç çubuğu,
telefon kartı, testler ve ölçülebilir kabul ölçütleri.

Kapsam dışı: tedarikçi ayrıntısı ve ekstre ekranı (`docs/plan/09-TEDARIKCILER-CARI.md`), müşteri
listesi (`docs/plan/14-LISTE-MUSTERILER.md`), şoför listesi (`docs/plan/16-LISTE-SOFORLER.md`),
ödeme formları (`docs/plan/10-TAHSILAT-ODEME-FORMLARI.md`), kiralık araç sekmesi
(`docs/plan/22-OZ-MAL-ARACLAR.md`), ortak parçalar (`docs/plan/28-ORTAK-PARCALAR.md`), görsel jetonlar
(`docs/plan/29-GORSEL-SISTEM.md`). Bu belge kod değiştirmez; adımlar §10'dadır.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve menü.** Rota `App.tsx:98`, ayrıntı rotası `App.tsx:99`. Rota bir `Guard` taşımaz:
`accounting` yetkisi olmayan kullanıcı da listeyi görür. Klasik menüdeki adı "Tedarikçiler"
(`client/src/lib/nav.ts:42`), yeni menüde "Tedarikçi Listesi" (`nav.ts:92`); yeni görünümde başlık
`newTitles` üzerinden değişir (`client/src/lib/sections.ts:44`). `/tedarikciler` hiçbir bölümde
değildir; `sectionFor` bu yolda `undefined` döner (`sections.ts:36-38`) ve sayfa üstünde sekme çıkmaz
(`client/src/components/ui.tsx:132`).

**İskelet.** Sayfa `PageHeader` kullanır (`SuppliersPage.tsx:44-50`); sağda dört eylem vardır:
"Cari Tablosu" (`accounting` varsa, satır 46), `ExportButton` "Excel" (47), `ImportButton` (48) ve
`write` işaretli "Yeni Tedarikçi" (49). **`PageShell` ve `DetailDrawer` kodda YOK**
(`01-ORTAK-SARTNAME.md:143-144`); `FilterBar`/`FilterPanel` bugün yalnız `TripsPage`'de kullanılır
(`01-ORTAK-SARTNAME.md:140-142`) ve tanımı `client/src/components/shell/FilterPanel.tsx:7-32, 35-62`
içindedir. Bu sayfada ne "⋯ Diğer" menüsü ne satır sonu "İşlemler" menüsü ne de süzgeç düğmesi
vardır — üçü de §10'da eklenecektir.

**Süzgeçler ve arama.** Süzgeçler `Card` başlığının sağındadır (`SuppliersPage.tsx:52-58`): tür
açılır kutusu (53-56) ve `SearchBox` (57). Tür seçenekleri `supplierKindLabel`'dan üretilir:
"Taşeron / Araç sahibi", "Servis / Tamir", "Akaryakıt", "Diğer" (`client/src/lib/labels.ts:114-119`).
Arama dört alanda çalışır: ünvan, VKN, telefon ve yetkili adı
(`server/YesLojistik.Api/Controllers/SuppliersController.cs:30-32`). Sorgu `pageSize: 20` ile
sayfalanır (24) ve sunucu sıralama anahtarları `title · id · kind · city` ile sınırlıdır (17-23).

**Durum ve tür.** Arşiv görünümü **yoktur**: sunucu `active` parametresini destekler
(`SupplierQuery.Active`, `server/YesLojistik.Core/Dtos/MasterDataDtos.cs:81`; süzme
`SuppliersController.cs:29`) ama istemci bu parametreyi hiç göndermez (`SuppliersPage.tsx:24`).
Pasif kayıtlar listede görünür ve yalnız ad hücresindeki gri "Pasif" rozetiyle ayırt edilir (31).
Şoför listesindeki "Pasifleri göster" onay kutusu bu işin hazır desenidir
(`client/src/pages/DriversPage.tsx:55, 70, 108-110`).

**Sütunlar ve satır.** Altı sütun (`SuppliersPage.tsx:27-40`): No (`supplierNo`), Tedarikçi (ünvan +
"Pasif" rozeti), Tür, "Yetkili / Telefon" (ikisi boşsa "—"), İl, "Borcumuz" (sağa dayalı, `tl()` ile
iki kuruş; sıfırdan büyükse kırmızı). Sıralama dört sütunda vardır (`sortKey`); "Borcumuz" sütununda
`sortKey` **yoktur** (37) — sunucu bakiye sıralamasını desteklemez. Satıra tıklama ayrıntıya gider
(`onRowClick`, 60). Seçim, toplu işlem ve alt toplam satırı yoktur.

**Boş liste, yükleme, hata.** Boş metin iki hâllidir (`SuppliersPage.tsx:63`): arama ya da tür
doluysa "Aramanıza uyan kayıt yok.", hiç kayıt yoksa "Henüz tedarikçi yok. Kiralık araç sahiplerini
"Yeni Tedarikçi" ile ekleyin ya da "Excel'den Aktar" ile yükleyin." Yüklemede gövde soluklaşır
(`client/src/components/DataTable.tsx:126`); hata `error` + `onRetry` ile gösterilir (148).

**Excel.** Sunucuda iki uç hazırdır: liste Excel'i `GET /api/suppliers/export`
(`SuppliersController.cs:45-70`; No, Ünvan, Tür, VKN, Telefon, Yetkili, İl, Vade, Devir Bakiyesi,
Borcumuz, Durum ve altında "Toplam" satırı) ve ekstre Excel'i
`GET /api/suppliers/{id}/statement?format=xlsx` (100-102). Aktarım ucu
`POST /api/import/suppliers?dryRun=...` (`server/YesLojistik.Api/Controllers/ImportController.cs:15, 23`);
zorunlu sütun "Ünvan", ipucu "Kiralık araç sahibi taşeronlar buraya girer"
(`client/src/lib/importMeta.ts:23-24`). Ayna modu `/api/suppliers` yolunu yazmaya kapatır
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16`); istemcide `write` işaretli düğmeler
çizilmez (`ui.tsx:29-32`).

**Telefon kartı.** `DataTable`'a `mobileCard` verilir (`SuppliersPage.tsx:64-71`): üstte ünvan, altında
tür · telefon, sağda bakiye. Kart listesi 640px altında görünür, tablo gizlenir
(`DataTable.tsx:79, 101`). `client/e2e/mobile.spec.ts:4, 12-14` on beş yolda yatay taşma ölçer ama
`/tedarikciler` bu listede **yoktur**; `/cari/tedarikciler` vardır.

## 3. Hedef yerleşim

```
┌───────────────────────────────────────────────────────────────┐
│ Tedarikçi Listesi                   [⋯ Diğer] [+ Yeni Tedarikçi]│
│ [🔍 Ünvan, VKN, telefon ara]  [Tür ▾]  [Süzgeç (1)]            │
│ (Arşivdekileri göster ✕)          Süzgeci temizle              │
│ BORCUMUZ … │ TAŞERON … │ SERVİS … │ AKARYAKIT …                │
│ ┌ tablo ──────────────────────────────────────────────────────┐│
│ │ No  Tedarikçi        Tür        İl   Borcumuz            ⋯ ││
│ └─────────────────────────────────────────────────────────────┘│
│ Toplam 34 kayıt · Borcumuz 128.400,00 TL                      │
└───────────────────────────────────────────────────────────────┘
```

Üst kısım (başlık → tablo başlığı) **≤260px** olmalıdır (`01-ORTAK-SARTNAME.md:237`). 1440×900'de
satır yüksekliği ~44px olduğundan (§2, `client/src/index.css:119-120`) 20 kayıtlık sayfa ekranı
doldurur; ölçüt "≥12 satır"dır (`01-ORTAK-SARTNAME.md:236`).

Yer değişiklikleri:

1. `PageHeader` ve dört dağınık düğme yerine `PageShell`: başlıkta **tek ana düğme**
   "+ Yeni Tedarikçi", Excel maddeleri "⋯ Diğer" menüsüne iner.
2. Tür kutusu `FilterBar`'ın hızlı süzgecine, arama aynı çubuğa taşınır; "Arşivdekileri göster"
   `FilterPanel` içine girer.
3. Tablonun altına tek satır **toplam**: "Toplam N kayıt · Borcumuz X TL". Excel'in "Toplam" satırı
   sunucuda vardır (`SuppliersController.cs:51-53`), ekranda yoktur.
4. Satır sonuna **"İşlemler"** menüsü: Ayrıntı · Cari hareketleri · Ödeme yap (`write` + accounting) ·
   Düzenle (`write`) · Excel'e aktar. Böylece iş satırdan 1 tıkla başlar.
5. "Cari Tablosu" bağlantısı korunur ama "⋯ Diğer" altına iner; oradan `/cari/tedarikciler` açılır
   (`SuppliersPage.tsx:46`) ve o ekranın "Tedarikçi Listesi" bağlantısı geri döner
   (`client/src/pages/CariPage.tsx:31`).
6. Kiralık araç sahipleri ayrı liste oluşturmaz: tür süzgeci "Taşeron / Araç sahibi" ve
   `importMeta.ts:24` ipucu bu akışı tanımlar; ayrıntıdaki "Araçlar" sekmesi sahibin araçlarını
   listeler (`SupplierDetailPage.tsx:88, 146-155`).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ünvan, VKN, telefon, yetkili (`SuppliersController.cs:30-32`); 300 ms gecikmeli (`hooks.ts:8`) | — |
| Tür | seçim | hayır | "Tüm türler" + dört tür (`labels.ts:114-119`); adrese `?tur=taseron` yazılır | — |
| Süzgeç (n) | düğme | hayır | Sağdan `FilterPanel`; n = açık çip sayısı (`FilterPanel.tsx:16`) | — |
| Arşivdekileri göster | onay kutusu | hayır | Kapalı: `active=true`; açık: parametre gönderilmez (`DriversPage.tsx:70` deseni) | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar · Cari Tablosu · Kiralık araç sahiplerini göster | — |
| + Yeni Tedarikçi | ana düğme | — | `write`; ayna modunda gizlenir (`ui.tsx:32`) | "Bu işlem için yetkiniz yok." |
| Satır: İşlemler | menü | — | Ayrıntı · Cari hareketleri · Ödeme yap · Düzenle · Excel'e aktar | — |
| Tedarikçi formu (Ünvan, tür, yetkili, telefon, IBAN, vade, devir borcu, notlar, durum) | form | ünvan + tür + vade | Bugünkü pencere korunur (`client/src/components/SupplierForm.tsx:56-99`); `Ctrl+Enter` kaydeder | "Tedarikçi ünvanı zorunlu.", "VKN 10, TCKN 11 haneli olmalı.", "IBAN TR ile başlamalı (26 karakter).", "0-365 gün" |
| Toplam satırı | metin | — | Kayıt sayısı + filtreye uyan borç toplamı; sunucudan gelir | — |

Klavye: `Ctrl+Enter` kaydeder, `Esc` kapatır (`01-ORTAK-SARTNAME.md:72`); "⋯ Diğer" ve satır menüsü
`↑`/`↓` ile gezinir, `Esc` kapatır, menü açılınca ilk maddeye odaklanır
(`client/src/components/shell/Menu.tsx:21, 28-30`); süzgeç düğmesi `aria-haspopup="dialog"` taşır
(`FilterPanel.tsx:14`). Arama kutusuna `Esc` basmak metni temizler (hedef davranış, §10 adım 5).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste.** Bugünkü iki metin korunur (`SuppliersPage.tsx:63`). Arşiv süzgeci açıkken hiç pasif
  kayıt yoksa: "Arşivde tedarikçi yok." Arama/süzgeç doluyken "Süzgeci temizle" düğmesi görünür
  (`FilterPanel.tsx:27`).
- **Yükleniyor.** Bugün gövde `opacity-50` ile soluklaşır (`DataTable.tsx:126`), kayıt yoksa `Spinner`
  çizilir (148). Hedef, `29-GORSEL-SISTEM.md`'deki altı satırlık iskelet.
- **Hata.** `error` + `onRetry` ile `ErrorState` (148); "Tekrar dene" sorguyu yeniler.
- **Yetkisiz.** Rota bugün korumasızdır (`App.tsx:98`); "Cari Tablosu" düğmesi `can('accounting')`
  koşuluna bağlıdır (`SuppliersPage.tsx:46`). Hedef: liste herkese açık kalır, yazma düğmeleri
  `can('operations')` deseniyle kontrol edilir (`DriversPage.tsx:101-104`).
- **Ayna.** `MirrorWriteGuard` `/api/suppliers` yolunu kapatır (`MirrorWriteGuard.cs:16`): "Yeni
  Tedarikçi", "Ödeme yap" ve "Düzenle" görünmez; liste, ekstre ve Excel çalışır (Excel `write`
  işaretli değildir, `Exports.tsx:10-11`).
- **Lisans.** Süre dolunca salt okunur: GET dışındaki `/api` istekleri reddedilir, adresinin son
  bölümünde `export` geçenler serbest kalır (`docs/LISANS.md:57, 69`); "Yeni Tedarikçi" gizlenir.

## 6. Metinler ve terimler

Görünecek metinler: "Tedarikçi Listesi", "Yeni Tedarikçi", "Diğer", "Ara", "Ünvan, VKN, telefon...",
"Tür", "Tüm türler", "Taşeron / Araç sahibi", "Servis / Tamir", "Akaryakıt", "Diğer", "İl",
"Yetkili / Telefon", "Borcumuz", "Pasif", "Aktif", "Arşivdekileri göster", "Süzgeç", "Süzgeci
temizle", "İşlemler", "Ayrıntı", "Cari hareketleri", "Ödeme yap", "Düzenle", "Excel'e aktar",
"Excel'den aktar", "Cari Tablosu", "Toplam N kayıt", "Henüz tedarikçi yok. Kiralık araç sahiplerini
"Yeni Tedarikçi" ile ekleyin ya da "Excel'den Aktar" ile yükleyin.", "Aramanıza uyan kayıt yok.",
"Tedarikçi eklendi.", "Tedarikçi güncellendi.", "Tedarikçi silindi."

Yeni görünümde başlık **"Tedarikçi Listesi"** olur (`sections.ts:44`); "Tedarikçiler" klasik menüde
kalır. Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` ile uyumludur: ekranda "ayna",
"dry-run", "token", "endpoint" geçmez. Para `tl()`/`tl2()` ile iki kuruş, tarih `03.10.2026`
(`01-ORTAK-SARTNAME.md:240`). "Taşeron / Araç sahibi" etiketi terim tablosu onayı bekleyen
maddelerdendir (`AGENTS.md` §6) — §13'te sorulur.

## 7. Telefon davranışı (390×844)

Bugün telefonda kart çizilir (`SuppliersPage.tsx:64-71`): ünvan, altında tür · telefon, sağda bakiye.
Hedef kart (~92px, dokunma hedefi ≥44px): üstte ünvan + varsa "Pasif" rozeti, altında
`Taşeron / Araç sahibi · 05xx …`, sağda kalın `Borcumuz`; kart altında tek "İşlemler" düğmesi.
Eski `select` ve `SearchBox` çubuğu telefonda **tam ekran** `FilterPanel` içine toplanır
(`FilterPanel.tsx:49`), alt çubukta "Listeyi göster" durur. 390×844'te yatay kaydırma olmamalıdır
(`01-ORTAK-SARTNAME.md:238`); bu yol ölçüme eklenmelidir, çünkü `mobile.spec.ts:4` listesinde
`/tedarikciler` yoktur.

## 8. Erişilebilirlik ve klavye

- Tür açılır kutusu bugün `aria-label="Tür"` taşır (`SuppliersPage.tsx:53`); yeni çubukta etiket
  görünür metin olarak da bulunmalıdır ("Tür"). Arşiv onay kutusu metniyle eşleşen `<label>` alır
  (`DriversPage.tsx:108-110` deseni).
- Tablo başlıkları gerçek `<th>`'dir (`DataTable.tsx:113`); sıralama düğmesi başlık metnini taşır.
  Hedef: `aria-sort` eklemek (`docs/plan/17-LISTE-PERSONEL.md:192` ile aynı karar).
- "Borcumuz" değeri yalnız renkle anlatılmaz; tutar her hâlde yazıyla görünür ve Pasif durumu rozet +
  metindir (`SuppliersPage.tsx:31, 38`) — `01-ORTAK-SARTNAME.md:239` "satırda en fazla 1 rozet"
  kuralına uyar.
- Odak halkası 3px (`client/src/index.css:102-106`); dokunma hedefi `min-h-10` ≈ 44px
  (`index.css:110-111`). Satır tıklaması klavyeyle de çalışmalıdır: hedef, ünvan hücresine
  `Link` koymak ya da satıra `tabIndex` + `onKeyDown` eklemektir (§10 adım 6).

## 9. Testler (e2e + birim)

Mevcut e2e: **`workflow.spec.ts:221-308`** tedarikçi akışını uçtan uca sınar — "Tedarikçiler"
bağlantısı (224), "Yeni Tedarikçi" (225), ünvan + IBAN doldurma (227-228), kaydın ayrıntıda
görünmesi (232), listede arama sonrası `17.400` bakiyesi (290-291), "Ödeme Yap" (296-301) ve
"Tedarikçi Ödemeleri" ekranında `6.000` (303-304). `mobile.spec.ts:4` on beş yolda taşma ölçer;
`/tedarikciler` listede yoktur. `new-ui/basics.spec.ts:24` yeni menüde "Tedarikçi Listesi" adını
doğrular. `cari.spec.ts:17-18, 54` yalnız "Tedarikçiler Cari" ekranını sınar.

Eklenecek: **`client/e2e/new-ui/supplier-list.spec.ts`** (`useNewUi`, `helpers.ts:44-46`), altı test:
(1) başlık "Tedarikçi Listesi", tek ana düğme ve tek "⋯ Diğer"; (2) menüde "Excel'e aktar" ve
"Excel'den aktar" maddeleri; (3) "Arşivdekileri göster" kutusunun pasif kaydı listeye katması;
(4) tür süzgecinin "Taşeron / Araç sahibi" seçimiyle listeyi daraltması ve adrese yazması;
(5) aramada VKN ve yetkili adıyla bulma; (6) satır "İşlemler" menüsünden "Ödeme yap" seçilince
ödeme penceresinin tedarikçi seçili açılması. Sunucu sözleşmesi değişmez; mevcut kapsam
`SupplierTests.cs` (liste, IBAN doğrulama, silme kısıtı) ve `ReportsAndExportsTests.cs:180-182`
(tür + arama ile Excel) içindedir. Test silme, atlama, skip yasaktır
(`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`client/src/components/shell/PageShell.tsx` (yeni).** Başlık + `more` menüsü + tek ana düğme;
   `docs/plan/28-ORTAK-PARCALAR.md` sözleşmesine uyar. *Süre: 3 saat.* Doğrulama:
   `cd client && npm run lint`.
2. **`shell/FilterPanel.tsx:7-32` (mevcut).** `FilterBar`'ı bağımsız kullanıma hazırla; bugün yalnız
   `TripsPage` kullanır (`01-ORTAK-SARTNAME.md:140-142`). *Süre: 2 saat.* Doğrulama:
   `cd client && npx playwright test e2e/trips.spec.ts`.
3. **`SuppliersPage.tsx:44-50`.** `PageHeader` → `PageShell`; "Cari Tablosu", "Excel", "Excel'den
   Aktar" maddeleri menüye iner; başlıkta yalnız "+ Yeni Tedarikçi" kalır. *Süre: 3 saat.*
   Doğrulama: `cd client && npx playwright test e2e/workflow.spec.ts -g "tedarikçi"`.
4. **`SuppliersPage.tsx:52-58`.** `select` + `SearchBox` → `FilterBar`; tür adrese `?tur=`, arşiv
   süzgeci `FilterPanel`'e; `esc` ile arama temizleme. *Süre: 3 saat.* Doğrulama:
   `cd client && npm run build`.
5. **`SuppliersPage.tsx:18-25`.** `showArchive` durumu ve sorguya `active: showArchive ? undefined : true`
   eklenir (`DriversPage.tsx:70` deseni; sunucu desteği `MasterDataDtos.cs:81`). *Süre: 2 saat.*
   Doğrulama: `cd client && npx playwright test e2e/new-ui/supplier-list.spec.ts`.
6. **`SuppliersPage.tsx:27-40, 59-72`.** Ünvan hücresi klavyeyle erişilebilir bağlantı olur; satır
   sonuna `RowMenu` eklenir (Ayrıntı · Cari hareketleri · Ödeme yap · Düzenle · Excel'e aktar);
   `aria-sort` verilir. *Süre: 4 saat.* Doğrulama:
   `cd client && npx playwright test e2e/workflow.spec.ts e2e/new-ui/supplier-list.spec.ts`.
7. **Toplam satırı.** `SuppliersController.cs`'e `[HttpGet("totals")]` eklenir (Hakediş/ödemelerdeki
   desen: `ExpensesPage.tsx:95`, `client/src/lib/hooks.ts:41-49`); sayaç + borç toplamı döner ve
   `DataTable` footer'ında gösterilir. **Yeni uç gerekirse `F4.1` kuralı: dur ve sor**
   (`docs/KOLAYLASTIRMA-UYGULAMA.md:355`). *Süre: 3 saat.* Doğrulama:
   `cd server && dotnet test --filter SupplierTests`.
8. **`client/e2e/mobile.spec.ts:4`.** `/tedarikciler` yolu listeye eklenir. *Süre: 1 saat.*
   Doğrulama: `cd client && npx playwright test e2e/mobile.spec.ts`.
9. **`client/e2e/new-ui/supplier-list.spec.ts` (yeni, 6 test).** §9 senaryoları; ayrıca
   `workflow.spec.ts:224-225` metin değişiklikleriyle aynı commit'te güncellenir. *Süre: 4 saat.*
   Doğrulama: `cd client && npx playwright test e2e/new-ui/supplier-list.spec.ts e2e/workflow.spec.ts`.

Toplam: **~25 saat (3,5 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası: testler →
commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 1440×900'de başlıktan tablo başlığına mesafe **≤260px**; listede **≥12 satır** görünür.
2. Üstte **tek ana düğme** ve **tek "⋯ Diğer"** menüsü; menüde 3 madde; Excel düğmeleri ve
   "Cari Tablosu" başlıkta görünmez.
3. Tür süzgeci dört seçenek sunar (`labels.ts:114-119`); "Taşeron / Araç sahibi" seçilince yalnız
   `kind=Carrier` kayıtlar gelir (`SuppliersController.cs:28`).
4. "Arşivdekileri göster" kapalıyken pasif kayıt **görünmez** (`active=true`, kaynak 29); açıkken
   görünür ve rozetlidir.
5. Arama; ünvan, VKN, telefon ve yetkili adının her biriyle kaydı bulur (kaynak 30-32);
   `Esc` temizler, sayfa yenilenmez.
6. Satır menüsü **5 madde**; "Ödeme yap" tedarikçi seçili ödeme penceresini açar
   (`SupplierDetailPage.tsx:55, 100` ile aynı akış); aynada yalnız okunur maddeler kalır.
7. Toplam satırı görünen kayıt sayısıyla uyuşur; borç toplamı tek istekten gelir.
8. Excel dosyası ekrandaki süzgeç ve aramayla iner (`ReportsAndExportsTests.cs:182`) ve "Toplam"
   satırını taşır (`SuppliersController.cs:51-53`).
9. 390×844'te yatay kaydırma yok; kart ≤100px; dokunma hedefi ≥44px.
10. Mevcut e2e + **6 yeni** test yeşil; `cd client && npm run lint && npm run build` temiz; ekranda
    teknik sözcük yok.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| `PageShell` gecikirse liste eski kalır | Adım 1 önce bitirilir; diğer listeler beklemez | `SuppliersPage.tsx:44-50` eski `PageHeader`'a döner |
| `FilterBar`'ı üçüncü sayfaya taşımak `TripsPage`'i bozar | Adım 2'de sevkiyat e2e'si koşulur | `FilterPanel.tsx` değişikliği geri alınır |
| Yeni `totals` ucu ölçek/kapsam sorusu doğurur | `F4.1` "dur ve sor" kuralı; uç yoksa toplam istemcide hesaplanmaz | Toplam satırı kaldırılır |
| Arşiv süzgeci yanlış anlaşılır (pasif ≠ silinmiş) | Metin "Arşivdekileri göster"; silinen kayıt hiç gelmez (`IsDeleted`, `SuppliersController.cs:137`) | Süzgeç gizlenir |
| Klasik metne bağlı testler kırılır | Yeni görünüm varsayılan olana kadar başlık metinleri korunur | Adım 3 geri alınır |
| Aynada yazma düğmeleri görünür kalır | `write` + `MirrorWriteGuard.cs:16` | Düğmeler gizlenir |

## 13. Doğrulanacaklar

1. **Terim onayı.** "Taşeron / Araç sahibi" etiketi `labels.ts:114`'te sabittir; terim tablosu
   onayı beklediğinden (`AGENTS.md` §6) ekran metni onaylanmadan değiştirilmez.
2. **Toplam satırı isteniyor mu?** Ne listede alt toplam ne `SuppliersController.cs` içinde `totals`
   ucu vardır; yeni uç "dur ve sor" kapsamındadır.
3. **Arşiv tanımı.** "Arşiv" yalnız pasifleri mi (kaynak 29), yoksa silinme işaretlileri de mi
   kastediyor? Silinenler sorguda hiç dönmez (`SuppliersController.cs:137`).
4. **Sütun seçimi.** pratikortam'da tedarikçi listesinde hangi sütunlar var (vade, IBAN, yetkili ayrı
   sütun mu)? `docs/PRATIKORTAM-HARITA.md` bu ekranı ayrıntılı listelemiyor. Vade ve IBAN bugün
   yalnız ayrıntıda ve Excel'de vardır (`SupplierDetailPage.tsx:65, 67`).
5. **Bakiye sıralaması.** "Borcumuz" sütununda `sortKey` yoktur (`SuppliersPage.tsx:37`), sunucu
   `SortMap` bakiyeyi içermez (`SuppliersController.cs:17-23`); istenirse nerede sıralanacak?
6. **Mobil ölçüm.** `/tedarikciler` `mobile.spec.ts:4` listesinde değildir; eklenmesi yeni bir
   varsayım mı, bilinçli bir dışlama mı?
7. **Atıflar.** `28-ORTAK-PARCALAR.md` yazılmıştır ve `PageShell` şartnamesini taşır;
   `09-TEDARIKCILER-CARI.md` ayrıntı/ekstre tarafını, `22-OZ-MAL-ARACLAR.md` kiralık araç sekmesini
   tanımlar. Buna karşılık `14-LISTE-MUSTERILER.md`, `16-LISTE-SOFORLER.md`, `29-GORSEL-SISTEM.md`
   ve `32-TERMINOLOJI.md` **henüz yazılmamıştır**; bu belge onlara yalnız atıf yapar.

Sonraki belgeyle bağlantı: `16-LISTE-SOFORLER.md` aynı ortak liste iskeletini (`PageShell`,
`MoreMenu`, `FilterBar`, arşiv onay kutusu) devralır; "Pasifleri göster" deseni `SuppliersPage` ile
`DriversPage` arasında paylaşılır, `09-TEDARIKCILER-CARI.md` bu listenin cari hareket ve ekstre
tarafını, `28-ORTAK-PARCALAR.md` ise `PageShell` ve `RowMenu` sözleşmesini tanımlar.
