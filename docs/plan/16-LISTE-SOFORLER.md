# 16 — Şoför listesi

## 1. Amaç ve kapsam

Şoför listesi (`/soforler`, `client/src/App.tsx:91`) firmanın kendi şoförleriyle taşeron şoförlerini
tek tabloda tutar; ehliyet, SRC ve psikoteknik belgelerinin bitişini izler, şoförün mobil uygulama
hesabını ve konum iznini gösterir, satırdan açılan pencerede belgeleri, hesap ekstresini ve masraf
onayını bir araya getirir. Bugünkü alt başlık işi özetler: "Şoför bilgileri ve belge süreleri"
(`client/src/pages/DriversPage.tsx:98`).

Ekran `docs/plan/01-ORTAK-SARTNAME.md` §5'teki en sık 10 iş listesinde doğrudan geçmez; üç işi
dolaylı besler:

- **4. Sevkiyat bulmak (plaka/firma):** kayıtta plaka ve taşeron vardır (`DriversPage.tsx:77`);
  sevkiyat formunun şoför araması buradan beslenir (`client/src/components/TripForm.tsx:430`).
- **9. Mazot/gider girmek:** şoförün telefondan girdiği masraf "Onay bekliyor" olarak düşer ve şoför
  hesabında bekleyen kalem olur (`server/YesLojistik.Infrastructure/Services/DriverLedgerService.cs:45`).
- **10. Aylık kazancı görmek:** şoför primi sevkiyat kaydındadır
  (`server/YesLojistik.Core/Entities/Trip.cs:89`) ve analizde "Şoförlere göre" kırılımına girer
  (`client/src/pages/ReportsPage.tsx:146, 161`).

Kapsam: ortak liste iskeleti, belge uyarıları, şoför primi, mobil uygulama hesabı bağlantısı, şoför
ekstresi ve masraf onayı akışı, taşeron ayrımı, telefon kartı, kabul ölçütleri. Kapsam dışı: müşteri
ve tedarikçi listeleri (`14`, `15`), personel (`17-LISTE-PERSONEL.md`), araçlar (`22`), ortak parçalar
(`28-ORTAK-PARCALAR.md`), görsel jetonlar (`29`), veri sözleşmeleri (`30`), terimler (`32`). Bu belge
kod değiştirmez.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** Rota `App.tsx:91`'de yalnız `RequireAuth` altındadır, `Guard perm="operations"`
yoktur. Sunucuda yazma uçları `[Authorize(Policy = Policies.Operations)]` taşır
(`server/YesLojistik.Api/Controllers/DriversController.cs:109, 121, 132`), okuma uçlarında öznitelik
görünmez. Klasik menü adı "Şoförler" (`client/src/lib/nav.ts:43`), yeni menü adı "Şoför Listesi"
(`nav.ts:93`); ikisinde de sayaç vardır: `badge(alertsAt(a, '/soforler'), 'belge uyarısı')`
(`nav.ts:44, 94`; `alertsAt` tanımı `nav.ts:12`). Yeni görünüm başlığı `sections.ts:45`'ten gelir;
`/soforler` **hiçbir bölümde değildir**, `sectionFor` bu yolda `undefined` döner
(`client/src/lib/sections.ts:10-38`), yani sekme şeridi çıkmaz.

**İskelet.** `PageHeader` (98-105): başlık, alt başlık, `ExportButton` `/drivers/export` →
`soforler.xlsx` (100), `ImportButton entity="drivers"` (102), `Button write` "Yeni Şoför" (103).
Son ikisi `can('operations')` içindedir (101). `Card` başlığı "Şoför Listesi" (106); sağ üstte
"Pasifleri göster" (108-110) ve `SearchBox` "Ad, telefon..." (111). **`PageShell` ve `DetailDrawer`
kodda YOK** (`01-ORTAK-SARTNAME.md:143-144`); şartnameleri `28-ORTAK-PARCALAR.md`'dedir ve §10'da
"eklenecek" olarak geçer.

**Tablo.** `DataTable` (113-116) sıralama, sayfalama, satır tıklaması ve aramaya göre değişen boş
metni alır. Sütunlar (74-86): Ad Soyad (alt satırda "Taşeron: …", 75), Telefon (`tel:` bağlantısı, 76),
Plaka (`PlateBadge`, 77), Değerlendirme (rozet, `title` içinde not, 78), Ehliyet sınıfı (79), Ehliyet
Bitiş (80), SRC Bitiş (81), Psikoteknik (82), Uygulama (83-84), Durum (85); işlem sütunu yalnız
`can('operations')` varken eklenir (87-94) ve iki `IconButton write` taşır. Toplam **10 veri sütunu +
1 işlem sütunu**. Üç belgede ortak `DueDate value warn={30}` kullanılır; renk kuralı
`client/src/pages/VehiclesPage.tsx:120-123`'tedir (geçmişse kırmızı, 30 gün içindeyse turuncu).
`DataTable`'a `mobileCard` **verilmez**, bu yüzden telefonda kart yerine yatay kaydırmalı tablo çıkar
(`client/src/components/DataTable.tsx:101`).

**Uygulama sütunu.** Sunucu listeyi zenginleştirir: `Users` tablosunda `DriverId` dolu ve aktif
hesaplar bulunur, `HasAppAccount` ve `LocationConsentAt` işaretlenir (`DriversController.cs:70-76`).
İstemci üç durumu ayırır: hesap yoksa "—", konum rızası varsa yeşil "Konum izni var", yoksa sarı
"Konum izni yok" (83-84).

**Sorgu ve dışa aktarma.** İstemci `{ page, pageSize: 20, search, active, sort, desc }` gönderir (70),
arama `useDebounce` ile geciktirilir (60). Sunucuda `DriverQuery` `Active` ve `SupplierId` ekler
(14-18); `Filter` (34-43) `FullName`, `Phone`, `Plate`, `NationalId` üzerinde büyük/küçük harf duyarsız
arama yapar; sıralama haritası `fullName`, `srcExpiry`, `licenseExpiry`, `isActive` (24-30), varsayılan
`fullName` artan (42). Dışa aktarma aynı süzgeci kullanır ve **13 sütun** yazar (51-63); üst sınır
`QueryExtensions.ExportLimit`'tir (49).

**Form.** Satır tıklaması `DriverForm`'u açar (118); `?id=` derin bağlantısı (62-68) U-ETDS panelinden
üretilir (`UetdsPanel.tsx:10`), `?new=1` hızlı eylemden gelir (58, `quickActions.ts:28`). Sekmeler
Bilgiler · Belgeler · Hesap (156-157); yazma yetkisi yoksa varsayılan "Hesap" olur (129). Bölümler:
"Kim?" (162-177: Ad Soyad, Telefon, "Kendi şoförümüz / Taşeron şoförü" kartları 167-169, taşeron
seçimi 171-175), "Ehliyet ve belgeler" (178-188: sınıf + B/C/CE/D/DE çipleri 182, üç bitiş tarihi
185-187) ve iki katlanır `MoreFields` (190-219). İstemci şeması (24-47) ad zorunluluğu, TC 11 hane,
yabancıda 5-20 harf-rakam ve doğum yılı 1930-2015 sınırlarını taşır.

**Taşeron ayrımı ve belge uyarıları.** Form ipucu aynen şudur: "Taşeron şoförleri belge uyarılarına
girmez." (166). Sunucu bunu uygular: uyarı yalnız `SupplierId == null` olan aktif şoförler için
üretilir (`server/YesLojistik.Infrastructure/Services/AlertService.cs:71-78`) ve `/soforler?id={id}`
bağlantısı verilir. Şoföre bağlı **ek belgeler** ayrı paneldedir: `DocumentsPanel`
(`client/src/components/FleetPanels.tsx:46-89`), şoför belge türleri `driverDocumentTypes` (94),
rozetler metinlidir ("3 gün kaldı" / "5 gün geçti", 40-42).

**Şoför hesabı.** Hesap sekmesi `DriverLedgerPanel`'i çizer (`DriversPage.tsx:159`). Dört `Figure`:
"Verilen avans + ödeme", "Onaylı masraf + iade", "Şoförde kalan (firmanın)" / "Şoföre borcumuz",
"Onay bekleyen masraf" (267-272); Excel düğmesi `/drivers/{id}/ledger/export` (274). Bakiye formülü
sunucudadır: `advances + paid − driverExpenses − received` (`DriverLedgerService.cs:64-65`);
**onaysız masraf bakiyeye girmez** (30-33, 45) ve satır soluk gösterilir (283). Avans "Giderler →
Şoför Avansı" ile girilir; mahsuplaşma `SettlementForm` (308-329) ve `POST /api/driver-settlements`
(`server/YesLojistik.Api/Controllers/FleetController.cs:96`) iledir. Sunucu `from`/`to` dönem
süzgecini destekler ve dönem öncesini "Devir" satırında toplar (`DriversController.cs:86`,
`DriverLedgerService.cs:51-57`), ama panel bu iki parametreyi **hiç göndermez** (`FleetPanels.tsx:261`).

**Masraf onayı.** Şoför telefondan masraf girince kayıt "şoför ödedi" + "onay bekliyor" yazılır ve
yöneticiye bildirim gider (`server/YesLojistik.Api/Controllers/DriverController.cs:85-92`); masaüstünde
Giderler sayfasından onaylanır ya da gerekçeyle reddedilir (`client/src/pages/ExpensesPage.tsx:68,
85-88`), "Onay bekliyor" süzgeci vardır (114). Kural yardım metnindedir
(`client/src/pages/HelpPage.tsx:175`, `client/src/lib/pageHelp.ts:78`).

**Şoför primi bugün listede yoktur.** Prim sevkiyat alanıdır (`Trip.cs:89`), formda "Şoför Primi (TL)"
olarak girilir (`client/src/components/TripTermsFields.tsx:88`) ve sevkiyat şeridiyle analiz raporunda
görünür (`client/src/pages/TripsPage.tsx:575`, `ReportsPage.tsx:161`). Şoför başına prim toplamı
bugün yalnız Analiz → "Şoförlere göre" kırılımından okunur; listede ne sütun ne toplam vardır.

**Mobil hesap.** Hesap şoför kaydında değil `Users` tablosundadır. Ayarlar → Kullanıcılar'da rol
"Şoför" seçilince "Bağlı Şoför" zorunlu olur; ipucu: "Şoför bu hesapla mobil uygulamaya girer ve
yalnızca kendi sevkiyatlarını görür." (`client/src/pages/SettingsPage.tsx:316-317`; zorunluluk 289);
kurulum sihirbazı aynı kuralı işler (`OnboardingPage.tsx:270, 277`). Mobil taraf
`[Authorize(Roles = Driver)]` ile korunur (`DriverController.cs:16`); `me` ucu şoför adı, plaka, firma
ve üç belge bitişini döner (24-35); konum rızası `consent` (38-47) ve mobilde kabul ekranı
`mobile/src/app/izin.tsx:13, 23, 49`'dur; bildirim adresi `push-token` (140-154), konum `location`
(164-170). Uygulama kendi belge uyarısını da gösterir (`mobile/src/app/sofor/index.tsx:124, 130`).
Şoför silinince bağlı hesap pasife alınır ve bağı koparılır (`DriversController.cs:142`).

**Silme ve aktarma.** Sunucu sevkiyatta görev almış şoförü silmez: "Seferlerde görev almış şoför
silinemez. Bunun yerine pasife alın." (137-138); silmede aracın varsayılan şoförü boşaltılır (140).
Onay penceresi kuralı kullanıcı diliyle tekrarlar (119-121). Aktarma ipucu: "Taşeronun şoförüyse
'Tedarikçi' sütununa tedarikçi ünvanını yazın; kendi şoförünüzse boş bırakın."
(`client/src/components/ImportDialog.tsx:28`); meta kaydı `perm: 'operations'`
(`client/src/lib/importMeta.ts:27`), sunucu eşlemesi `ImportService.cs:546-547`.

## 3. Hedef yerleşim

```
┌───────────────────────────────────────────────────────────────┐
│ Şoför Listesi                    [⋯ Diğer]  [+ Yeni Şoför]    │
│ [🔍 Ad, telefon, plaka ara]              [Süzgeç (2)]         │
│ (Kimin: Taşeron ✕)  (Belge: Süresi geçen ✕)   Süzgeci temizle │
│ KENDİ ŞOFÖR … │ TAŞERON … │ BELGESİ YAKIN … │ ŞOFÖR HESABI …    │
│ ┌ tablo ──────────────────────────────────────────────────────┐│
│ │ Ad Soyad   Telefon   Plaka   Ehliyet  Belge  Uygulama   ⋯  ││
│ └─────────────────────────────────────────────────────────────┘│
│ Toplam 38 kayıt                                               │
└───────────────────────────────────────────────────────────────┘
```

Üst kısım (başlık → tablo başlığı) **≤260px** olmalıdır (`01-ORTAK-SARTNAME.md:237`); `.th` ~34px,
`.td` 7px+7px dolgu ile ~36-44px satır verir (`client/src/index.css:119-120`). Sayfa boyutu 20 kayıt
olarak kalır (70), yani 1440×900'de ~12 satır hedefi karşılanır.

Yer değişiklikleri:

1. `PageHeader` yerine tek `PageShell`: Excel maddeleri ve "Pasifleri göster" "⋯ Diğer" menüsüne iner,
   başlıkta tek `+ Yeni Şoför` kalır.
2. Belge ve uygulama durumu dört kutulu tek `Figures` şeridine döner (`ui.tsx:322-338`; şoför hesabı
   paneli bu deseni zaten kullanır, `FleetPanels.tsx:267`).
3. Arama + `FilterPanel`: **Kimin**, **Belge** (süresi geçen / 30 gün içinde / tamam), **Durum**,
   **Uygulama** süzgeçleri.
4. Satır sonuna `RowMenu`: Düzenle · Belge ekle · Hesap ekstresi · Ödeme/iade gir · Pasife al · Sil.
5. Üç belge tarihi tek "Belge" hücresinde en yakın tarihle toplanır; 10 sütun korunur ve bir satırda en
   fazla bir durum rozeti kuralına uyulur (`01-ORTAK-SARTNAME.md:239`).
6. Şoför primi için salt okunur bir toplam/bağlantı eklenir (veri kaynağı §13'te sorulur).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ad, telefon, plaka, TC; sunucuda `ILike` (34-43) | — |
| Süzgeç (n) | düğme | hayır | Sağdan `FilterPanel`: Kimin · Belge · Durum · Uygulama | — |
| Pasifleri göster | anahtar | hayır | Varsayılan kapalı; `active` parametresini üretir (109, 70) | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar | — |
| + Yeni Şoför | ana düğme | — | `write` + `operations`; ayna modunda gizlenir | "Bu işlem için yetkiniz yok." |
| Satır: İşlemler | menü | — | Düzenle · Belge ekle · Hesap ekstresi · Ödeme/iade gir · Sil | — |
| Ad Soyad | metin | evet | Sunucuda en çok 150 karakter | "Ad soyad zorunlu." |
| Kimin şoförü | kart seçimi | evet | Taşeron seçilirse tedarikçi zorunlu (147) | "Şoförün çalıştığı taşeronu seçin." |
| TC / Pasaport | metin | hayır | Türk: 11 hane; yabancı: 5-20 harf-rakam (45-46) | "TC kimlik no 11 hane olmalı." |
| Ehliyet sınıfı ve bitişler | metin+çip+tarih | hayır | B/C/CE/D/DE önerisi (182); 30 gün kala turuncu | "En fazla 20 karakter." |
| Belge ekle | pencere | — | Tür, no, bitiş, not, dosya (46-89) | "Belge türü seçin." |
| Ödeme / iade | pencere | evet | Yön · tutar · yöntem · tarih · not (308-329) | "Tutar sıfırdan büyük olmalı." |
| Masraf onayı | düğme | — | Giderler sayfasında "Onayla" / gerekçeli "Reddet" | "Gerekçe yazın." |

Klavye: `Ctrl+Enter` kaydeder, `Esc` kapatır (`01-ORTAK-SARTNAME.md:72`); "⋯ Diğer" ve satır menüsü
`↑`/`↓` ile gezinir (`Menu.tsx:29-30`), `Esc` kapatır (28). Şoför formu `Modal` içinde kalır (153).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste.** Bugünkü metin korunur (116). Arama/süzgeç doluyken "Aramanıza uyan kayıt yok." ve
  "Süzgeci temizle" gösterilir.
- **Yükleniyor.** Bugün gövde `opacity-50` ile soluklaşır, kayıt yoksa `Spinner` çizilir
  (`DataTable.tsx:126, 148`). Hedef `29-GORSEL-SISTEM.md`'deki iskelet.
- **Hata.** `error` + `onRetry` ile `ErrorState` (`DataTable.tsx:148`).
- **Yetkisiz.** Görüntüleme tüm giriş yapmış kullanıcılara açıktır (`App.tsx:91`); yazma düğmeleri
  `write` + `can('operations')` ile gizlenir (101, 87-94), form salt okunur açılır (129).
- **Ayna.** `MirrorWriteGuard` `/api/drivers` yolunu korur
  (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16`); yazma düğmeleri gizlenir, liste ve
  ekstre okunur kalır.
- **Lisans.** Süre dolunca salt okunur olur, `export` içeren adresler serbest kalır (`docs/LISANS.md`);
  bu yüzden §10'da eklenen istemci CSV'si salt okunurlukta da çalışır.

## 6. Metinler ve terimler

Görünecek metinler: "Şoför Listesi", "Yeni Şoför", "Diğer", "Süzgeç", "Süzgeci temizle", "Kendi
şoförümüz", "Taşeron şoförü", "Belgeler", "Süresi geçen", "30 gün içinde", "Aktif", "Pasif",
"Pasifleri göster", "Uygulama", "Konum izni var", "Konum izni yok", "Şoför hesabı", "Onay bekleyen
masraf", "Ödeme / İade Gir", "İşlemler", "Belge Ekle", "Onay bekliyor", "Reddedildi", "Şoför ödedi",
"Toplam N kayıt", "Sevkiyatlarda görev almış şoförler silinemez; bunun yerine pasife alabilirsiniz.",
"Taşeron şoförleri belge uyarılarına girmez."

Yeni görünümde başlık **"Şoför Listesi"** olur (`sections.ts:45`); "Şoförler" klasik menüde kalır.
Terimler `docs/TERIMLER.md` ve `32-TERMINOLOJI.md` ile uyumludur: ekranda "ayna", "dry-run", "token",
"endpoint" geçmez. Para `tl2()` ile iki kuruş, tarih `03.10.2026`, plaka `PlateBadge`.

## 7. Telefon davranışı (390×844)

Bugün telefonda tablo yatay kayar (`DataTable.tsx:101`) ve `client/e2e/mobile.spec.ts:4` bu yolu
ölçmez. Hedef kart (~96px): üstte ad + "Taşeron: …", altta telefon ve plaka, en yakın belge rozeti,
sağda uygulama durumu; kart altında tek "İşlemler" düğmesi (≥44px). Kartlar `mobileCard` prop'u ile
verilir; süzgeç tam ekran `FilterPanel` içinde toplanır (`FilterPanel.tsx:49`), alt çubukta "Listeyi
göster" durur. Hesap tablosu kendi içinde kayar (278). Hedef: yatay kaydırma yok.

## 8. Erişilebilirlik ve klavye

- Simge düğmeleri `label` taşır ("Düzenle", "Sil", `DriversPage.tsx:90-91`); belge panelinde de aynı
  desen vardır (`FleetPanels.tsx:74-75`).
- Renk tek başına anlam taşımaz: belge rozetleri ("12 gün kaldı", "5 gün geçti") ve durum rozetleri
  metinlidir (`FleetPanels.tsx:40-42`, `DriversPage.tsx:83-85`).
- Tablo başlıkları gerçek `<th>`'dir, sıralama düğmesi başlık metnini taşır (`DataTable.tsx:113-120`);
  `aria-sort` eklenmesi hedeftir.
- Odak halkası 3px (`index.css:102`), dokunma hedefi `min-h-10` ≈ 44px (`index.css:111`).
- Form radyo grupları `Field group` ile `role="group"` + `aria-label` alır (`ui.tsx:142`); katlanır
  bölümler `summary` olduğu için klavyeyle açılır (190, 204).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/uetds.spec.ts:42, 45` `/soforler?id=` derin bağlantısını sınar;
`workflow.spec.ts:351` listeyi API'den okur; `driver-app.spec.ts:22-30` ve `tracking.spec.ts:8-20`
şoför hesabıyla giriş, konum rızası ve masraf girişini doğrular; `new-ui/basics.spec.ts:24` yeni menü
adını listeler; `mobile.spec.ts:4` bu yolu **içermez**.

Eklenecek: **`client/e2e/new-ui/drivers-list.spec.ts`** (`useNewUi`, `helpers.ts:44`) ile 6 test:
(1) başlık ve tek ana düğme + "⋯ Diğer"; (2) belge şeridi toplamının tabloyla uyuşması; (3) "Taşeron
şoförü" süzgeci; (4) plaka araması ve `Esc` ile temizleme; (5) "Hesap ekstresi"nin
`/drivers/{id}/ledger` çağırması; (6) salt okunur kullanıcıda yazma düğmelerinin görünmemesi. Sunucu
kapsamı bugün `FleetTests.cs:70-89`'dadır; şoför CRUD ve süzgeç testleri eklenmelidir. Test
silme/atlama yasaktır (`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`client/src/components/shell/PageShell.tsx` (yeni).** Başlık + `more` menüsü + tek ana düğme;
   bugün **yoktur** (`01-ORTAK-SARTNAME.md:143`). *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
2. **`DriversPage.tsx:98-112`.** `PageHeader` → `PageShell`; Excel maddeleri menüye iner. *Süre: 2 saat.*
   Doğrulama: `cd client && npx playwright test e2e/uetds.spec.ts`.
3. **`DriversPage.tsx:106-117`.** Dört kutulu uyarı şeridi (`Figure`, `ui.tsx:327`); kutular süzgeci
   uygular. *Süre: 3 saat.* Doğrulama: `cd client && npm run build`.
4. **`DriversPage.tsx:70, 113-116`.** Arama/süzgeç `?kimin=&belge=&durum=&uygulama=` parametrelerine
   bağlanır (`DriverQuery.Active` hazır, `DriversController.cs:14-18`). *Süre: 3 saat.* Doğrulama:
   `cd client && npx playwright test e2e/new-ui/drivers-list.spec.ts`.
5. **`shell/FilterPanel.tsx` (mevcut).** Şoför listesinde ilk kez kullanılır (`FilterBar` 7-32,
   `FilterPanel` 35-62 aynı dosyada). *Süre: 3 saat.* Doğrulama:
   `cd client && npx playwright test e2e/mobile.spec.ts`.
6. **`DriversPage.tsx:74-94`.** Satır sonuna `RowMenu`; ilk maddeler pencereyi doğru sekmeyle açar
   (156-159). *Süre: 4 saat.* Doğrulama: `cd client && npm run lint`.
7. **`DriversPage.tsx:113-116` + `DataTable.tsx:101`.** `mobileCard` verilir; `mobile.spec.ts:4`
   listesine `/soforler` eklenir. *Süre: 3 saat.* Doğrulama:
   `cd client && npx playwright test e2e/mobile.spec.ts`.
8. **`FleetPanels.tsx:257-306`.** Hesap paneline dönem (`from`/`to`) ve "yalnız onay bekleyenler"
   süzgeci bağlanır; sunucu parametreleri hazırdır (`DriversController.cs:86`). *Süre: 3 saat.*
   Doğrulama: `cd server && dotnet test --filter FleetTests`.
9. **Onay bağlantısı.** "Onay bekliyor" satırı `/giderler?onay=Pending` sayfasına bağlanır
   (`ExpensesPage.tsx:114`). *Süre: 2 saat.* Doğrulama:
   `cd client && npx playwright test e2e/workflow.spec.ts`.
10. **Şoför primi.** §13'teki karara göre salt okunur toplam ya da sütun; Analiz bağlantısı eklenir.
    *Süre: 3-5 saat.* Doğrulama: `cd server && dotnet test --filter ReportsTests`.
11. **`client/e2e/new-ui/drivers-list.spec.ts` (yeni, 6 test).** §9 senaryoları; `uetds.spec.ts:45`
    aynı commit'te güncellenir. *Süre: 4 saat.* Doğrulama:
    `cd client && npx playwright test e2e/new-ui/drivers-list.spec.ts e2e/uetds.spec.ts`.

Toplam: **~33-35 saat (4-4,5 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası:
testler → commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 1440×900'de başlıktan tablo başlığına mesafe **≤260px**; 20 kayıtlık sayfada **≥12 satır** görünür.
2. Üstte **tek ana düğme** ve **tek "⋯ Diğer"**; Excel düğmeleri başlıkta görünmez.
3. Bir satırda **en fazla bir durum rozeti**; belge uyarısı metinlidir (rozet + gün sayısı).
4. `grep -c "PageHeader" client/src/pages/DriversPage.tsx` → **0**.
5. Taşeron şoförü uyarı şeridine **girmez** (`AlertService.cs:72`); "Kendi şoförlerimiz" süzgeci bunu
   doğrular.
6. Bakiye `avans + ödeme − onaylı masraf − iade` formülüne uyar; onaysız masraf bakiyeyi
   **değiştirmez**, yalnız "Onay bekleyen masraf" kutusunu büyütür (`DriverLedgerService.cs:45, 65`).
7. Onay bekleyen masraf satırı tek tıkla Giderler sayfasının "Onay bekliyor" süzgecine gider.
8. 390×844'te yatay kaydırma yok; kart ≤100px, dokunma hedefi ≥44px.
9. Mevcut e2e testleri + **6 yeni** test yeşil; test silinmez/atlanmaz.
10. `cd client && npm run lint && npm run build` temiz; sayfada teknik sözcük yok.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| `PageShell` gecikirse sayfa eski kalır | İlk gün `PageHeader` ile devam edilir | `DriversPage.tsx:98-105` eski hâline döner |
| Belge sütunları sıkışınca okunmaz olur | Üç tarih tek "Belge" hücresine iner | Ayrı üç sütun geri konur (80-82) |
| Taşeron kuralı istemcide yanlış kurulur | Kural sunucudadır (`AlertService.cs:72`) | Süzgeç "Hepsi"ye çevrilir |
| Şoför silme veri kaybı gibi görünür | Sunucu sevkiyatlı şoförü silmez (137-138) | Silme maddesi menüden çıkarılır |
| Prim toplamı yanlış hesaplanır | Kaynak `Trip.DriverBonus` (`Trip.cs:89`), KDV hariç, `tl2()` | Sütun kaldırılır, Analiz bağlantısı kalır |
| Klasik metne bağlı testler kırılır | Yeni görünüm varsayılan olana kadar metinler korunur | İlgili adım geri alınır |
| Aynada yazma düğmeleri görünür kalır | `write` + `MirrorWriteGuard.cs:16` | Düğmeler gizlenir |

## 13. Doğrulanacaklar

1. **Şoför primi nasıl gösterilecek?** Prim yalnız sevkiyat kaydında (`Trip.cs:89`) ve Analiz
   kırılımında (`ReportsPage.tsx:161`) vardır; yeni bir toplam ucu mu gerekiyor, yoksa sayfa yalnız
   Analiz'e mi bağlanacak?
2. **Okuma yetkisi.** `/soforler`'de `Guard` yoktur (`App.tsx:91`) ve okuma uçlarında öznitelik
   görünmez; liste yalnız `operations` görsün mü, bugünkü gibi herkes mi?
3. **Kimlik alanları.** TC kimlik no ve doğum yılı yalnız Excel'dedir (53, 56); sütun eklenecek mi?
4. **Belge gösterimi.** Ehliyet/SRC/psikoteknik bugün üç ayrı sütundur (80-82); hedefte tek "Belge"
   hücresi önerilir. Kullanıcı hangisini ister?
5. **Pasif şoför kuralı.** Pasif şoförün belgeleri uyarı üretmez (`AlertService.cs:72`); pasif taşeron
   şoförü listede nasıl görünsün?
6. **Dönem süzgeci.** `from`/`to` sunucuda vardır (`DriversController.cs:86`), panelde yoktur;
   varsayılan dönem ne olsun (bu ay / tümü)?
7. **Atıflar.** `17-LISTE-PERSONEL.md` yazılmıştır ve `:22, 293`'te şoför listesini bu belgeye bırakır;
   `28-ORTAK-PARCALAR.md` `PageShell`/`DetailDrawer`'ın kodda olmadığını doğrular.
   `14`, `15`, `29`, `30`, `31`, `32` numaralı belgeler bu belge yazılırken **henüz yoktu**.

Sonraki belgeyle bağlantı: `17-LISTE-PERSONEL.md` aynı ortak liste iskeletini ve `StatCard` →
`Figures` dönüşümünü devralır; `28-ORTAK-PARCALAR.md` bu sayfada kullanılacak `PageShell`, `RowMenu`
ve `FilterPanel` sözleşmesini, `20-OZ-MAL-GIDERLER.md` ise şoför masrafının onaylandığı Giderler
ekranını tanımlar.
