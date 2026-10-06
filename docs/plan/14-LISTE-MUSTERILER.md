# 14 — Müşteri listesi

## 1. Amaç ve kapsam

Müşteri listesi (`/musteriler`, `client/src/App.tsx:92`) firmanın müşteri kartlarını tek tabloda
toplar: müşteri no, ünvan, VKN/TCKN, iletişim, adres ve cari bakiye (`CustomersPage.tsx:28-41`).
Kullanıcı bu ekranda üç iş yapar: müşteriyi aramak, bakiyesini görmek, yeni müşteri eklemek ya da
listeyi Excel'den aktarmak. `docs/plan/01-ORTAK-SARTNAME.md` §5'teki en sık 10 iş listesinde
doğrudan geçmez; **6. iş "Müşteri bakiyesi/ekstresi → 2 tık"** buradan başlar: satıra tıklamak
detay sayfasını açar (`CustomersPage.tsx:55`, rota `App.tsx:93`), ekstre oradan alınır.

Bu belge `docs/KOLAYLASTIRMA-UYGULAMA.md:349-355` (F4.1) işini tek ekrana indirir: **ortak liste
iskeleti** (`PageShell` + `MoreMenu` + `FilterBar` + tablo), Excel'e aktar / Excel'den aktar,
"Arşivdekileri göster", firma grupları ve e-Fatura şablonu bağlantıları, 1440×900'de 12 satır hedefi.

Kapsam: başlık ve üst eylem alanı, arama ve süzgeç, arşiv (pasif) süzgeci, tablo sütunları,
satır sonu işlemleri, Excel çıktısı ve aktarımı, firma grupları ve fatura şablonu kısayolları,
telefon kartı, erişilebilirlik, testler, uygulama adımları ve kabul ölçütleri.

Kapsam dışı: müşteri cari tablosu ve ekstre içeriği (`08-MUSTERILER-CARI.md`), müşteri kartı formunun
alan sınırları (aynı belge), tahsilat formu (`10-TAHSILAT-ODEME-FORMLARI.md`), ortak parçaların
şartnamesi (`28-ORTAK-PARCALAR.md`) ve görsel jetonlar (`29-GORSEL-SISTEM.md`). Bu belge **kod
değiştirmez**; yalnız hangi dosyada ne değişeceğini tarif eder.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota, menü ve başlık.** Rota `App.tsx:92`'de **yetki koruması olmadan** durur; `Guard perm` yalnız
cari tablosunda vardır (`App.tsx:94`). Klasik menüdeki adı "Müşteriler" (`client/src/lib/nav.ts:41`),
yeni menüdeki adı "Müşteri Listesi"dir (`nav.ts:91`); yeni görünümde sayfa başlığı `newTitles`
üzerinden değişir: `'/musteriler': 'Müşteri Listesi'` (`client/src/lib/sections.ts:43`,
`ui.tsx:112`). `/musteriler` hiçbir bölümde olmadığı için `sectionFor` bu yolda `undefined` döner
(`sections.ts:36-38`) ve yeni görünümde **bölüm sekmesi çizilmez** (`ui.tsx:132`).

**Bugünkü iskelet.** Sayfa `PageHeader` kullanır (`CustomersPage.tsx:45`): başlık "Müşteriler",
alt başlık "Müşteri kartları. Bütün bakiyeleri tek tabloda görmek için “Cari Tablosu”." Sağda dört
düğme vardır (`CustomersPage.tsx:46-51`): "Cari Tablosu" (yalnız `accounting`, satır 47),
`ExportButton` "Excel" → `/customers/export`, dosya adı `musteriler.xlsx` (48), `ImportButton`
"Excel'den Aktar" (49) ve `write` işaretli "Yeni Müşteri" (50). Liste `Card` içinde, başlığı
"Müşteri Listesi", sağında `SearchBox` "Ünvan, VKN, telefon..." ile çizilir (52-53).
**`PageShell` ve `DetailDrawer` kodda YOK** (`01-ORTAK-SARTNAME.md:143-144`); `MoreMenu`,
`RowMenu`, `FilterBar` ve `FilterPanel` bugün **yalnız** `TripsPage` içinde kullanılır
(`01-ORTAK-SARTNAME.md:140-142`, `Menu.tsx:52, 64`, `FilterPanel.tsx:7, 35`).

**Sorgu ve sütunlar.** Durum: arama (300 ms gecikmeli, `hooks.ts:8`), sıralama (`title` artan
varsayılan, `CustomersPage.tsx:19`) ve sayfalama vardır; süzgeç paneli ve satır menüsü yoktur.
Sorgu sabittir: `{ page, pageSize: 20, search, sort, desc }` (`CustomersPage.tsx:25`) ve sunucudan
`usePaged<Customer>('customers', query)` ile alınır (26). Sütunlar (28-41): No (`customerNo`, soluk,
29), Müşteri (30), VKN/TCKN (31), İletişim (telefon + e-posta, 32-35), Adres (`min-w-40`, 36) ve
sağa yaslı Cari Bakiye (37-40; bakiye > 0 kırmızı, < 0 yeşil). Sıralama yalnız `id`, `title` ve
`balance` anahtarlarında çalışır (`CustomersController.cs:18-24`). Satıra tıklamak detay sayfasına
gider (55); `FirstUse` boş durumu "İlk müşterinizi ekleyin" (57-60); telefonda `mobileCard` çizilir
(61-69). `?new=1` adres parametresi formu açar (`CustomersPage.tsx:21`, `hooks.ts:90-101`).

**Excel'e aktarma var, seçim yok.** `ExportButton` ekrandaki arama ve sıralamayı aynen gönderir
(`CustomersPage.tsx:48`) ve sunucu `ExcelExporter.ExportWithTotal` ile **altında toplam bakiyeli**
bir dosya üretir (`CustomersController.cs:43-65`, toplam satırı 48, "Durum" sütunu 64). Tek seferde
en çok **20.000 satır** iner (`QueryExtensions.cs:11`). Ancak tabloda **onay kutusu/seçim yoktur**:
`selectable`, `selection` ve `bulkActions` `CustomersPage`'te geçmez (`DataTable.tsx:52-58`),
oysa tahsilatlarda ve faturalarda "seçilenleri Excel'e aktar" hazırdır
(`PaymentsPage.tsx:85-88`, `InvoicesPage.tsx:106-110`). Sunucu tarafında `Ids` süzgeci
(`QueryExtensions.cs:42-43`) müşterilerde **bağlı değildir**; yalnız tahsilat, tedarikçi ödemesi,
sevkiyat ve faturada kullanılır (`PaymentsController.cs:35`, `SupplierPaymentsController.cs:35`,
`TripService.cs:72`, `InvoiceService.cs:51`).

**Excel'den aktarma.** `ImportButton` "Excel'den Aktar" düğmesi `write` işaretlidir
(`ImportDialog.tsx:43`) ve üç adımlı pencereyi açar: şablonu indir (96), dosya seç (103), kontrol et
ve aktar (88-90). Müşteri ipucu "“Devir Bakiyesi” sütununa müşterinin eski sistemden devreden
borcunu yazabilirsiniz." (25) ve aktarım sırası "1 Tedarikçiler → 2 Müşteriler → 3 Şoförler →
4 Araçlar → 5 Sevkiyatlar"dır (98). Genel sihirbaz karşılığı `/aktar?tur=customers`
(`client/src/lib/importMeta.ts:21-22`) ve `FirstUse` bağlantısı da aynı adrese gider
(`FirstUse.tsx:21`).

**"Arşivdekileri göster" bugün YOK.** Sunucu süzgeci yalnız arama yapar ve
`db.Customers.AsNoTracking()` ile **pasif kayıtları da listeye katar**
(`CustomersController.cs:26-33`); ardından yalnız arama + sıralama uygulanır. Listede "Durum"
sütunu olmadığı için pasif müşteri, aktif olandan ayırt edilemez (28-41). Buna karşılık
`CustomerDto.IsActive` alanı vardır (`server/YesLojistik.Core/Dtos/MasterDataDtos.cs:8`) ve listede
doldurulur (`CustomerAccountService.cs:16`). Tedarikçi listesinde bu süzgeç **vardır**:
`if (q.Active is { } a) query = query.Where(s => s.IsActive == a);`
(`SuppliersController.cs:29`). F4.1'in istediği "Arşivdekileri göster" maddesi
(`KOLAYLASTIRMA-UYGULAMA.md:353`, `KOLAYLASTIRMA-PLANI.md:182`) bu yüzden **yeni bir sunucu
parametresi** gerektirir; müşteri listesinin kendi `ListQuery`'sinde böyle bir alan yoktur
(`server/YesLojistik.Core/Dtos/Common.cs:5-14`).

**Firma grupları.** Müşterinin grupları/şantiyeleri kart formunda yönetilir
(`CustomerForm.tsx:78-85`, arayüz 168-183; grup adı en çok 50 karakter,
`Validators.cs:133`) ve sunucuda `CustomerGroup` kayıtlarına yazılır
(`CustomersController.cs:196-199`, varlık `Customer.cs:78`). Liste yanıtı bu adları **taşır**
(`CustomerAccountService.cs:21`) ama listede grup sütunu ya da grup süzgeci yoktur; grup yalnız
sevkiyat süzgeç kutusunda kullanılır (`TripsPage.tsx:281`, öneri listesi
`TripTermsFields.tsx:141-142`). Sevkiyattaki grup süzgeci
`t.CustomerGroup == q.CustomerGroup` karşılaştırmasıyla çalışır (`TripService.cs:88`).

**e-Fatura şablonu.** Müşterinin e-Fatura davranışı kart formundadır: "Fatura nasıl kesilir?"
(e-Fatura mükellefi / e-Arşiv) ve yalnız mükellefte görünen "PK etiketi" (`CustomerForm.tsx:113-121`),
ayrıca katlanır **"Fatura şablonu"** bölümü (186-219): satırda yazılacak sefer bilgileri (190-192),
"Sevkiyatlardaki fatura altı notlarını faturaya ekle" (195), her faturaya eklenecek açıklama (196),
satış/tevkifat notu ve fatura senaryosu seçimi (199-216). Bu bölüm `MoreFields` ile **kapalı**
gelir (`Inputs.tsx:189-192`; `CustomersPage.tsx:71` formu `defaultOpen` vermeden açar). Ne listede ne
detay sayfasında bu bölüme giden bir kısayol vardır: listeden tek yol "Yeni Müşteri" (50), detaydan
tek yol "Düzenle"dir (`CustomerDetailPage.tsx:42`).

**Ayna ve lisans yüzeyi.** `/api/customers` ayna korumasındaki yollardan biridir
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16`); yazma düğmeleri `write` alır
(`CustomersPage.tsx:50`, `ImportDialog.tsx:43`) ve aynada gizlenir (`Menu.tsx:16`, `ui.tsx`).

## 3. Hedef yerleşim

```
┌───────────────────────────────────────────────────────────────┐
│ Müşteri Listesi                       [⋯ Diğer] [+ Müşteri Ekle]│
│ [🔍 Ünvan, VKN, telefon…]  [Grup ▾]  [☐ Arşivdekileri göster]  │
│ (Grup: Şantiye-7 ✕)                 Süzgeci temizle            │
│ ┌ tablo ──────────────────────────────────────────────────────┐│
│ │ No  Müşteri   VKN/TCKN   İletişim   Gruplar   Cari Bakiye  ⋯││
│ └─────────────────────────────────────────────────────────────┘│
│ Toplam N kayıt · Toplam bakiye X TL                           │
└───────────────────────────────────────────────────────────────┘
```

Üst kısım (başlık → tablo başlığı) **≤260px** olmalıdır (`01-ORTAK-SARTNAME.md:237`). `.th` ~38px,
`.td` 7px+7px dolgu ile ~44px satır yüksekliği verir (`client/src/index.css:119-120`); bu yüzden
1440×900'de hedef **en az 12 satır**dır (`01-ORTAK-SARTNAME.md:236`). Bugün sayfa boyutu 20'dir
(`CustomersPage.tsx:25`); 12 satırın bugünkü üst kısımla karşılanıp karşılanmadığı ölçülmemiştir
(§13, madde 2).

Yer değişiklikleri:

1. `PageHeader` + dört dağınık düğme yerine `PageShell` (28 numaralı belge): başlıkta yalnız
   "+ Müşteri Ekle" kalır; "Excel", "Excel'den Aktar" ve "Cari Tablosu" "⋯ Diğer"e iner.
2. `Card` başlığındaki `SearchBox` süzgeç çubuğuna taşınır; `FilterBar` arama + "Arşivdekileri
   göster" + `Süzgeç (n)` düğmesini taşır (`FilterPanel.tsx:7-32`).
3. Tabloya **Gruplar** sütunu ve satır sonuna "İşlemler" menüsü eklenir
   (Düzenle · Fatura şablonu · Hesap ekstresi · Tahsilat gir · Sil).
4. Satır seçimi (`selectable`) ve seçilenleri Excel'e aktarma bağlanır
   (`DataTable.tsx:52-58, 164-174`; desen `PaymentsPage.tsx:85-88`).
5. Cari bakiyeye tıklamak, sıralama düğmesiyle çakışmayacak biçimde satır tıklamasına bırakılır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Arama | metin | hayır | Ünvan, VKN/TCKN, telefon, e-posta (`CustomersController.cs:30-31`); 300 ms gecikmeli (`hooks.ts:8`) | — |
| Arşivdekileri göster | onay kutusu | hayır | Kapalıyken yalnız `IsActive`; açıkken pasifler de gelir (yeni `active` parametresi, desen `SuppliersController.cs:29`) | — |
| Grup / şantiye | seçim | hayır | Müşterinin `Groups` adlarından; seçim sunucuya `group` olarak gider (bugün yok, §10 adım 4) | — |
| Süzgeç (n) | düğme | hayır | Sağdan `FilterPanel`; n = açık çip sayısı (`FilterPanel.tsx:14-17`) | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar · Cari Tablosu (yalnız `accounting`) | — |
| + Müşteri Ekle | ana düğme | — | `write`; aynada gizlenir (`CustomersPage.tsx:50`) | "Bu işlem için yetkiniz yok." |
| Satır: İşlemler | menü | — | Düzenle · Fatura şablonu · Hesap ekstresi · Tahsilat gir · Sil | — |
| Seçim çubuğu | çubuk | — | "N kayıt seçildi" + "Excel'e aktar" (`DataTable.tsx:164-174`) | — |
| Firma grupları | etiket + metin | hayır | Grubu ekle/çıkar; aynı ad büyük/küçük harf ayrımı olmadan tekrar eklenmez (`CustomerForm.tsx:83`) | "Grup adı en fazla 50 karakter olabilir." (`Validators.cs:133`) |
| Fatura nasıl kesilir? | radyo | hayır | e-Fatura mükellefi · e-Arşiv; mükellefte PK etiketi görünür (`CustomerForm.tsx:113-121`) | — |
| PK etiketi | metin | hayır | Yalnız e-Fatura mükellefinde; en çok 200 karakter (`Validators.cs:121`) | "PK etiketi en fazla 200 karakter olabilir." |
| Fatura şablonu satır alanları | onay kutuları | hayır | Tarih, yükleme, indirme, plaka, araç cinsi, teslim evrak no, yük cinsi, iş açıklaması (`CustomerForm.tsx:53-56`) | — |
| Satış / tevkifat notu | seçim | hayır | `/invoice-notes` kayıtlarından; tür eşleşmesine göre süzülür (`CustomerForm.tsx:199-209`) | — |
| Müşteri ünvanı | metin | evet | En çok 200 karakter (`Validators.cs:109`) | "Müşteri ünvanı zorunlu." |
| VKN / TCKN | metin | hayır | 10 hane VKN ya da 11 hane TCKN (`Validators.cs:110-112`) | "Geçersiz VKN (10 hane) veya TCKN (11 hane)." |

Klavye: `Ctrl+Enter` kaydeder, `Esc` pencereyi kapatır (`01-ORTAK-SARTNAME.md:72`, `ui.tsx:153-159`);
"⋯ Diğer" ve "İşlemler" menüleri `↑`/`↓` ile gezinir, `Esc` kapatır, açılışta ilk maddeye odaklanır
(`Menu.tsx:21, 28-30`); süzgeç düğmesi `aria-haspopup="dialog"` taşır (`FilterPanel.tsx:14`) ve
panelde `Esc` kapatır (39).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste.** Hiç kayıt yokken ve arama boşken `FirstUse` çizilir: "İlk müşterinizi ekleyin" +
  "Yeni müşteri" + "Excel'den aktarın" (`CustomersPage.tsx:57-60`). Arama doluyken metin
  "Aramanıza uyan kayıt yok." olur (57). Hedef: arama/süzgeç doluyken "Bu aramaya uyan müşteri yok."
  ve yanında "Süzgeci temizle".
- **Yükleniyor.** Gövde `opacity-50` ile soluklaşır, kayıt yokken `Spinner` çizilir
  (`DataTable.tsx:126, 148`); hedef `29-GORSEL-SISTEM.md`'deki 6 satırlık iskelet.
- **Hata.** `error` + `onRetry` ile `ErrorState` (`DataTable.tsx:148`, `CustomersPage.tsx:54`).
- **Yetkisiz.** Rota korumasızdır (`App.tsx:92`); `accounting` olmayan kullanıcı listeyi görür ama
  "Cari Tablosu" düğmesini görmez (`CustomersPage.tsx:47`), tahsilat/fatura kısayolları gizlenir.
  Şoför rolü panele hiç girmez (`App.tsx:47`).
- **Ayna.** `MirrorWriteGuard` `/api/customers` altındaki yazmaları reddeder
  (`MirrorWriteGuard.cs:16, 24`); "+ Müşteri Ekle" ve "Excel'den Aktar" gizlenir
  (`CustomersPage.tsx:50`, `ImportDialog.tsx:43`), `FirstUse` yerine "Pratikortam aynası açık:
  kayıtlar pratikortam’dan gelir…" yazar (`FirstUse.tsx:16`). Okuma ve Excel çıktısı çalışır.
- **Lisans.** Süre dolduğunda panel salt okunur olur: GET dışındaki `/api` istekleri 403 döner,
  adresinin son bölümünde `export` geçen istekler serbest kalır (`docs/LISANS.md:57, 69`). Bu yüzden
  Excel'e aktarma salt okunurlukta da çalışır.

## 6. Metinler ve terimler

Görünecek metinler: "Müşteri Listesi", "Müşteri Ekle", "Diğer", "Cari Tablosu", "Excel",
"Excel'den Aktar", "Ara", "Arşivdekileri göster", "Grup / şantiye", "Süzgeç", "Süzgeci temizle",
"No", "Müşteri", "VKN/TCKN", "İletişim", "Gruplar", "Adres", "Cari Bakiye", "İşlemler", "Düzenle",
"Fatura şablonu", "Hesap ekstresi", "Tahsilat gir", "Sil", "N kayıt seçildi", "Toplam N kayıt",
"İlk müşterinizi ekleyin", "Aramanıza uyan kayıt yok.", "Müşteri eklendi.", "Müşteri güncellendi.",
"Müşteri silindi."

Yeni görünümde başlık **"Müşteri Listesi"** olur (`sections.ts:43`); klasik menüdeki "Müşteriler"
kalır. Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` ile uyumludur: ekranda "ayna",
"dry-run", "UBL", "token", "endpoint" geçmez. Para `tl()`/`tl2()` ile iki kuruş, tarih `03.10.2026`,
müşteri no beş haneli (`CustomerAccountService.cs:23`). Sayfa yardımı üç maddeden oluşur
(`pageHelp.ts:41-45`) ve yeni görünümde gizlenir (`ui.tsx:126`).

## 7. Telefon davranışı (390×844)

Bugün telefonda tablo yerine kart çizilir (`CustomersPage.tsx:61-69`; `DataTable.tsx:78-100, 101`):
üstte ünvan, altında "telefon · adres" ya da "No 00001", sağda bakiye. `mobile.spec.ts:4` bu yolu
taşır ve 12-14. satırlardaki ölçümle yatay taşma olmadığını doğrular. Hedef kart (~92px): ünvan +
(gerekirse "Arşiv" rozeti), altında telefon · grup, sağda kalın bakiye; altında tek "İşlemler"
düğmesi (≥44px). Arama ve "Arşivdekileri göster" tam ekran `FilterPanel` içinde toplanır
(`FilterPanel.tsx:49`), alt çubukta "Listeyi göster" durur (57). Excel ve aktarma "⋯ Diğer" altında
kalır; mobilde iki düğme üst üste binmez.

## 8. Erişilebilirlik ve klavye

- Arama kutusu erişilebilir adını `placeholder`'dan alır (`DataTable.tsx:183`); hedefte ad
  "Müşteri ara" olarak sabitlenir.
- Tablo başlıkları gerçek `<th>`'dir (`DataTable.tsx:113`) ve sıralama düğmesi başlık metnini taşır
  (114-119); hedef `aria-sort` eklemektir.
- Odak halkası 3px (`index.css:102-106`); dokunma hedefi `min-h-10` ≈ 44px (`index.css:110-111`).
- Seçim kutusunun ekran okuyucu adı satır etiketinden gelir: `Seç: Müşteri 00042`
  (`DataTable.tsx:75`, `rowLabel`).
- Arşiv durumu **rozet + metin** ile verilir (yalnız renk yetmez); bakiye işareti de metinle
  belirtilir ("Müşterinin borcu" / "Alacaklı").
- Süzgeç paneli `role="dialog" aria-modal="true"` taşır ve açılışta ilk alana odaklanır
  (`FilterPanel.tsx:41, 48`).

## 9. Testler (e2e + birim)

Mevcut e2e kapsamı: **`cari.spec.ts:8-15`** "Müşteriler Cari" ekranını ve satırdan detay sayfasına
geçişi sınar; **`workflow.spec.ts:162-166`** `/musteriler`'i açar, ilk satıra tıklar ve "Hesap
Ekstresi" penceresinden PDF isteğini doğrular; **`onboarding.spec.ts:40-44`** beyaz etiketin bu
sayfada göründüğünü, **`onboarding.spec.ts:57-89`** `/aktar?tur=customers` sihirbazını (VKN hatası,
tekrar eden satır, hata raporu) sınar; **`mobile.spec.ts:4, 12-14`** taşma ölçümünü yapar;
**`new-ui/basics.spec.ts:23-25`** yeni menüde "Müşteri Listesi" adını doğrular.

Eklenecek: **`client/e2e/new-ui/customers-list.spec.ts`** (`useNewUi`, `helpers.ts:44-46`) 7 test:
(1) başlık + tek ana düğme + "⋯ Diğer" ve menüde üç madde; (2) arama süzmesi ve `Esc` ile temizleme;
(3) "Arşivdekileri göster" kapalıyken pasif müşterinin görünmemesi, açıkken listelenmesi ve "Arşiv"
rozeti; (4) aynı adda ikinci müşteri eklenirken grup tekrarının engellenmesi; (5) `?new=1` ile formun
açılması ve kaydın detay sayfasına gitmesi; (6) satır menüsünden "Fatura şablonu"nun doğru müşteri
için açılması; (7) seçilen iki müşterinin "Excel'e aktar" ile inmesi. Sunucu tarafı için
`server/YesLojistik.Tests` altına iki test: `active=false` süzgeci ve `group` süzgeci
(`CustomersController`), ayrıca `ids` ile seçili aktarma. Test silme/atlama yasaktır
(`01-ORTAK-SARTNAME.md:178`).

## 10. Uygulama adımları

1. **`client/src/components/shell/PageShell.tsx` (yeni).** Başlık + `more` menüsü + tek ana düğme;
   `28-ORTAK-PARCALAR.md` sözleşmesine uyar. *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
2. **`CustomersPage.tsx:45-51`.** `PageHeader` → `PageShell`; "Excel", "Excel'den Aktar" ve
   "Cari Tablosu" `MoreMenu` maddelerine iner. *Süre: 2 saat.* Doğrulama:
   `cd client && npx playwright test e2e/workflow.spec.ts e2e/onboarding.spec.ts`.
3. **`CustomersPage.tsx:52-53`.** `SearchBox` `Card` başlığından `FilterBar`'a taşınır; çipler
   (`Grup: …`, `Arşiv`) `FilterPanel` içinde yönetilir. *Süre: 3 saat.*
   Doğrulama: `cd client && npx playwright test e2e/mobile.spec.ts`.
4. **`server/YesLojistik.Core/Dtos/MasterDataDtos.cs` + `CustomersController.cs:26-33`.**
   `CustomerQuery` (yeni): `bool? Active`, `string? Group`; `Filter` içinde `IsActive` ve
   `Groups.Any(g => g.Name == group)` koşulları. Kalıp: `SuppliersController.cs:25-34`. *Süre: 4 saat.*
   Doğrulama: `cd server && dotnet test --filter CustomerTests`.
5. **`CustomersPage.tsx:25`.** Sorguya `active` ve `group` eklenir; "Arşivdekileri göster" kutusu
   `active=false` gönderir; sayfa boyutu 20 kalır (12 satır ölçütü için üst kısım kısaltılır).
   *Süre: 2 saat.* Doğrulama: `cd client && npm run build`.
6. **`CustomersPage.tsx:28-41`.** Sütunlar sadeleşir: Adres "⋯"/ipucu yerine satır detayında;
   **Gruplar** sütunu eklenir (`CustomerDto.Groups`, `CustomerAccountService.cs:21`); pasif kayıtta
   "Arşiv" rozeti. *Süre: 3 saat.* Doğrulama: `cd client && npm run lint`.
7. **`CustomersPage.tsx:54-56`.** `selectable`, `selection`, `rowLabel`, `bulkActions` bağlanır;
   seçimle `/customers/export?ids=…` çağrılır. *Süre: 3 saat.* Doğrulama:
   `cd client && npx playwright test e2e/new-ui/customers-list.spec.ts`.
8. **`CustomersController.cs:43-48`.** Dışa aktarmada `WhereIds(q.Ids)` bağlanır
   (`QueryExtensions.cs:42`); toplam satırı yalnız seçim yokken eklenir. *Süre: 2 saat.*
   Doğrulama: `cd server && dotnet test --filter CustomerTests`.
9. **`CustomersPage.tsx:54`.** Satır sonuna `RowMenu`: Düzenle (`write`) · Fatura şablonu · Hesap
   ekstresi · Tahsilat gir (`write` + `accounting`) · Sil (`write`). *Süre: 3 saat.* Doğrulama:
   `cd client && npx playwright test e2e/cari.spec.ts`.
10. **`CustomerForm.tsx:186`.** "Fatura şablonu" bölümü `detail` amaçlı açılabilir olur
    (`MoreFields` `defaultOpen` parametresi, `Inputs.tsx:189`); satır menüsündeki "Fatura şablonu"
    bu bölüm açık gelecek biçimde formu açar. *Süre: 3 saat.* Doğrulama: `cd client && npm run build`.
11. **`client/e2e/new-ui/customers-list.spec.ts` (yeni, 7 test) + sunucu testleri.** §9 senaryoları;
    mevcut testlerin metinleri aynı commit'te güncellenir. *Süre: 5 saat.* Doğrulama:
    `cd client && npx playwright test e2e/new-ui/customers-list.spec.ts e2e/cari.spec.ts e2e/workflow.spec.ts`
    ve `cd server && dotnet test`.

Toplam: **~33 saat (4 iş günü)**. Her adım sonunda `01-ORTAK-SARTNAME.md` §3.6 sırası: testler →
commit → `git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. 1440×900'de başlıktan tablo başlığına mesafe **≤260px**; listede aynı anda **≥12 satır** görünür.
2. Üstte **tek ana düğme** ve **tek "⋯ Diğer"**; "Excel", "Excel'den Aktar", "Cari Tablosu" başlıkta
   görünmez, menüde 3 madde vardır.
3. `grep -c "PageHeader" client/src/pages/CustomersPage.tsx` → **0**.
4. "Arşivdekileri göster" kapalıyken pasif müşteri listede **yoktur**; açıkken gelir ve "Arşiv"
   rozeti taşır. Sunucu testi bunu doğrular.
5. `grep -c "selectable" client/src/pages/CustomersPage.tsx` → **1**; 2 müşteri seçilip aktarılınca
   inen dosyada **2 veri satırı** olur (toplam satırı yoktur).
6. Müşteri araması ünvan, VKN, telefon ve e-postada eşleşir; sonuç **1 tık** ya da Enter ile gelir,
   sayfa yenilenmez.
7. Excel çıktısında sütunlar: No · Ünvan · VKN/TCKN · Vergi Dairesi · Telefon · E-posta · Yetkili ·
   İl · İlçe · Adres · Vade (gün) · Risk Limiti · Devir Bakiyesi · Cari Bakiye · Durum
   (`CustomersController.cs:50-64`) + toplam satırı.
8. 390×844'te yatay kaydırma yok (`mobile.spec.ts:12-14`); kart ≤100px, dokunma hedefi ≥44px.
9. Grup adı 50 karakteri aşarsa form "Grup adı en fazla 50 karakter olabilir." der (`Validators.cs:133`).
10. Mevcut e2e testleri + **7 yeni** istemci testi + **3 yeni** sunucu testi yeşil; test
    silinmez/atlanmaz. `cd client && npm run lint && npm run build` temiz.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| `PageShell` gecikirse ekran eski kalır | İlk gün `PageHeader` ile devam edilir | `CustomersPage.tsx:45-51` eski hâline döner |
| Arşiv süzgeci varsayılan kapalıyken pasif müşteri "kayboldu" sanılır | Kapalıyken de toplam sayı gösterilir, süzgeç çipi görünür kalır | `active` parametresi kaldırılır; bugünkü davranış (hepsi listelenir) döner |
| Grup süzgeci büyük veride yavaşlar | `CustomerGroups.Name` üzerinden sorgu, sayfa boyutu 20 | Adım 4 geri alınır; grup yalnız sütunda gösterilir |
| Seçim + Excel, `Ids` boşken tüm listeyi indirir | `Ids` boşsa toplam satırlı tam liste iner; düğme yalnız seçimde görünür | `bulkActions` kaldırılır |
| Bakiye sütunu sıralaması bozulur | `SortMap["balance"]` formülü (`CustomersController.cs:22-23`) korunur | Sütun bugünkü hâline döner |
| Aynada yazma düğmeleri görünür kalır | `write` + `MirrorWriteGuard.cs:16` | Düğmeler gizlenir |
| Klasik görünüm metinlerine bağlı testler kırılır | Yeni görünüm varsayılan olana kadar metinler korunur | Adım 2 geri alınır |

## 13. Doğrulanacaklar

1. **"Arşiv" tam olarak ne?** Bugün müşteri tarafında ayrı bir arşiv alanı yok; tek işaret
   `IsActive` (`Customer.cs:23`, `MasterDataDtos.cs:8`). Arşiv = pasif mi, yoksa ayrı bir arşiv
   bayrağı mı isteniyor? (Yeni sütun migration gerektirir; kural: yalnız ekleme.)
2. **12 satır ölçütü.** Bugünkü üst kısımla 1440×900'de kaç satır göründüğü ölçülmemiştir
   (`01-ORTAK-SARTNAME.md:236` Sevkiyatlar için yazılmıştır). Müşteri listesi için de geçerli mi?
3. **Liste varsayılanı.** 20 satırlık sayfalama mı kalacak, yoksa 12 satır "kaydırmasız tam liste"
   hedefi mi (müşteri sayısı 20'nin altındaysa sayfalama gereksizdir)?
4. **Gruplar sütunu.** Grup adları satırda mı, "⋯" ipucunda mı görünsün? Bugün yalnız sevkiyat
   süzgecinde kullanılıyor (`TripsPage.tsx:281`).
5. **Grup süzgeci müşteride gerekli mi?** `TripsPage` grup süzgeci sevkiyat üzerinden çalışır
   (`TripService.cs:88`); müşteri listesinde de isteniyor mu?
6. **Fatura şablonu kısayolu.** Satır menüsünden doğrudan şablona gitmek mi, yoksa detay sayfasındaki
   "Düzenle" yeterli mi (`CustomerDetailPage.tsx:42`)?
7. **Seçilenleri Excel'e aktarma.** Tahsilat ve faturalarda var (`PaymentsPage.tsx:85-88`); müşteri
   listesinde de isteniyor mu, yoksa tüm listeyi indirmek yeterli mi?
8. **Atıflar.** `08-MUSTERILER-CARI.md`, `17-LISTE-PERSONEL.md` ve `28-ORTAK-PARCALAR.md`
   yazılmıştır; `15-LISTE-TEDARIKCILER.md`, `16-LISTE-SOFORLER.md` ve `29-GORSEL-SISTEM.md` ile
   `30`–`34` numaralı belgeler **henüz yazılmamıştır**. Bu belge yazılırken `01`–`13`, `17`–`28`
   aralığı okunmuş; `29`'daki iskelet/boş durum kararları doğrulanamamıştır.

Sonraki belgeyle bağlantı: `15-LISTE-TEDARIKCILER.md` aynı ortak liste iskeletini, "Arşivdekileri
göster" süzgecini ve seçileni Excel'e aktarma desenini devralır (tedarikçide `active` süzgeci
`SuppliersController.cs:29`'da **zaten vardır**); `28-ORTAK-PARCALAR.md` `PageShell`, `MoreMenu`,
`RowMenu`, `FilterBar` ve `FilterPanel` sözleşmesini, `08-MUSTERILER-CARI.md` ise bu listenin
açtığı cari/ekstre ekranını tanımlar.
