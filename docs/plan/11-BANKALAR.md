# 11 — Bankalar ve kasa

## 1. Amaç ve kapsam

Bu belge, panelin **Kasa / Banka** ekranını (`/kasa-banka`, `client/src/pages/CashAccountsPage.tsx`)
tarif eder. Ekranın işi tek cümleyle şudur: *"Hangi hesapta ne kadar para var, para nereden girdi
nereye çıktı — tek bakışta."* Bugün kullanıcı bu ekrana yeni menüde **Banka & Çek → Bankalar**
(`client/src/lib/nav.ts:110`), klasik menüde **Kasa / Banka** (`nav.ts:56`) yolundan gider; yeni
görünümde başlık *Bankalar* olur (`client/src/lib/sections.ts:49`) ve üstünde *Bankalar · Çekler*
sekmeleri görünür (`sections.ts:27`); klasikte başlık *Kasa / Banka* kalır
(`CashAccountsPage.tsx:43`).

Kapsanan işler:

- **Para girişinin kaynağı:** tahsilat, tedarikçi ödemesi, gider, şoför/personel ödemesi ve virman
  girerken hesap seçilir; bakiye bu ekranda oluşur (`CashAccountsPage.tsx:49`). Hesap seçen formlar:
  `PaymentForm.tsx:101`, `SupplierPaymentForm.tsx:87`, `ExpensesPage.tsx:293`, `StaffPage.tsx:156`,
  `RecurringPaymentsPage.tsx:94`, `BulkDialogs.tsx:109`.
- **Bakiye ve hesap ekstresi:** seçili hesabın hareket dökümü, yürüyen bakiyeyle
  (`CashAccountsPage.tsx:92-108`).
- **Virman:** hesaplar arası para aktarımı.
- **Eksi bakiye:** ekran negatif bakiyeyi kırmızı gösterir (`CashAccountsPage.tsx:62`) ama hiçbir
  yerde engellemez; ayrıntı §2 ve §12'de.
- **Çek/senet bağlantısı:** çek yalnızca *Tahsil edildi* olunca hesaba girer
  (`server/YesLojistik.Infrastructure/Services/CashService.cs:22`).

Kapsam dışı: çek/senet listesi (`12-CEKLER.md`), nakit akışı (`23-ANALIZ.md`,
`24-RAPORLAR-MUHASEBE.md`), form şartnameleri (`10-TAHSILAT-ODEME-FORMLARI.md`,
`20-OZ-MAL-GIDERLER.md`) ve aktarım altyapısı (`30-VERI-API.md`). Bu belge kodu değiştirmez.

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve yetki.** Rota `accounting` yetkisiyle korunur (`client/src/App.tsx:107`); yetkisiz
kullanıcı `/` adresine yönlenir (`App.tsx:67`). Menü öğesi de `perm: 'accounting'` taşır
(`nav.ts:110`, `nav.ts:56`). Sunucuda liste, hareketler, ekle/düzenle/sil uçları
`Policies.Accounting` ister (`server/YesLojistik.Api/Controllers/CashController.cs:18, 27, 34, 45,
55`); virman uçları sınıf düzeyinde korunur (`CashController.cs:84`). **İstisna:**
`GET /api/cash-accounts/lookup` yetki istemez (`CashController.cs:23-25`); sunucu testi bunu
sabitler (`server/YesLojistik.Tests/Integration/CashTests.cs:110-112`): muhasebe yetkisi olmayan
kullanıcı listeyi göremez ama hesap **ad**larını seçim listesinde görür.

**Ekran iskeleti.** Sayfa `PageHeader` + bilgi paragrafı + iki sütunlu ızgara kurar: hesap listesi
solda 1/3, hareket kartı sağda 2/3 (`CashAccountsPage.tsx:53`, `84`). Başlıkta üç düğme vardır
(`44-48`): *Excel'den Aktar* (`45`, `ImportButton entity="cash-accounts"`), *Virman* (`46`) ve
*Hesap Ekle* (`47`, `Button write`). Bilgi paragrafı (`49`) çek/senet kuralını da yazar.

**Hesap listesi.** Sunucu listesi aktifler önce, sonra ada göre sıralıdır (`CashService.cs:66`). Her
satır bir `button`'dır (`CashAccountsPage.tsx:56`); seçili hesap `border-brand-400 bg-brand-50` ile
işaretlenir (`57`). Satırda ad, tür etiketi ve pasifse *"· pasif"* yazar (`59-60`); sağda bakiye,
negatifse `text-red-600` (`62`). Sayfa açılışta ilk hesabı seçer (`38`). Üstteki toplam yalnız
**aktif ve kredi kartı olmayan** hesapları toplar (`39`). Süzgeç, arama, sıralama, sayfalama ve
dışa aktarma **yoktur**.

**Hareket dökümü.** Hareketler `GET /cash-accounts/{id}/movements` ile gelir (`76`) ve istemcide
ters çevrilir, yani en yeni üstte (`81`). Sütunlar Tarih · İşlem · Giriş · Çıkış · Bakiye (`94`).
Devir satırı yalnız açılış bakiyesi sıfırdan farklıysa eklenir (`CashService.cs:77-79`); yürüyen
bakiye `OpeningBalance`'dan başlar (`75`, `82`); türleri sunucu üretir (`CashService.cs:24-59`).
Tabloda `key={i}` kullanılır, kararlı kimlik yoktur (`97`).

**Bakiyenin kaynağı.** Formül sınıf özetinde yazılıdır (`CashService.cs:10-12`): devir + tahsilatlar
(çek/senet yalnız tahsil edilmişse) + şoförden alınan + gelen virman − tedarikçi ödemeleri (ciro
hariç) − firmanın ödediği **onaylı** giderler − şoföre ödemeler − giden virman. Sınıf özeti iki
kalemi yazmaz; uygulamada bunlar da vardır: personel avans ve maaş ödemeleri **çıkış** (prim çıkış
sayılmaz, `CashService.cs:42-46`) ve hesaba alınan sevkiyat komisyonları **giriş**
(`CashService.cs:48-53`). Giderin hesaba girmesi üç koşula bağlıdır: `!IsOnCredit`,
`PaidBy == Company`, `ApprovalStatus == Approved` (`CashService.cs:32`). Kural testle sabitlenmiştir
(`CashTests.cs:73`).

**Virman.** Pencerenin başlığı *"Virman (hesaplar arası aktarım)"* (`CashAccountsPage.tsx:183`);
alanlar çıkış hesabı, giriş hesabı, tutar, tarih ve nottur (`186-194`). Şema aynı hesabı reddeder
(`169`: *"Çıkış ve giriş hesabı aynı olamaz."*), tutar sıfırdan büyük olmalıdır (`167`); sunucu da
aynı kuralı uygular (`CashController.cs:97`), test doğrular (`CashTests.cs:70`). Seçenekler **yalnız
aktif** hesaplardan üretilir (`173`), ama düğme toplam hesap sayısına bakar (`46`); iki hesabı olup
yalnız biri aktif olan kullanıcı pencereyi açabilir ve `toAccountId` boş kalır (`177`) — hata
*"Hesap seçin."* olur (`165`). *Son virmanlar* kartı ilk 10 transferi gösterir (`82`, `112-122`);
veri `GET /cash-transfers` ile gelir ve sunucu bu uçta en çok 500 kayıt döner
(`CashController.cs:92`).

**Hesap formu.** `Modal size="sm"` içinde altı alan (`CashAccountsPage.tsx:142-157`): hesap türü
(4 seçenek, 2 sütun, `146`), hesap adı (`148`, zorunlu), IBAN (yalnız tür *Banka* iken, `149`),
açılış bakiyesi (`151`), açılış tarihi (`153`); durum `ControlledToggle` (`155`). Yeni kayıtta
varsayılanlar tür *Banka*, tarih bugün, durum aktif (`135`). IBAN istemcide doğrulanmaz (`24`);
sunucu `TR` ile başlayan 26 karakter ister: *"IBAN geçersiz (TR ile başlayan 26 karakter)."*
(`server/YesLojistik.Core/Validation/Validators.cs:462`).

**Açık çelişki (kanıtlı).** Açılış bakiyesi ipucu *"Kart borcu varsa başına eksi yazın
(ör. -12.500)."* der (`CashAccountsPage.tsx:150`). Oysa sunucu aynı alana `Amount()` kuralını
uygular; bu kural `>= 0` ister (`Validators.cs:463`, `17-18`) ve negatif değeri *"Tutar negatif
olamaz."* diye reddeder. Yani **kredi kartı borcu bugün eksi yazılamaz**; ipucunu izleyen kullanıcı
hata alır.

**Ayna ve yeni görünüm.** Sayfa `useIsNewUi()` çağırmaz ama `PageHeader` çağırır ve o okur: yeni
görünümde başlık *Bankalar* olur (`client/src/components/ui.tsx:112`, `sections.ts:49`) ve bölüm
sekmeleri çizilir (`ui.tsx:132`). Alt başlık gizleme yalnız düz metinde çalışır (`ui.tsx:113`); bu
sayfanın alt başlığı JSX olduğu için (`CashAccountsPage.tsx:43`) yeni görünümde **görünmeye devam
eder**. Ayna modunda `Button write` kendini gizler (`ui.tsx:31-32`): *Hesap Ekle* (`47`) ve
düzenle/sil ikonları (`87-88`) kaybolur. **İki boşluk var:** (a) *Virman* düğmesinde `write` işareti
yoktur (`46`), ayna açıkken görünür kalır; (b) sunucudaki ayna koruması listesinde
`/api/cash-accounts` vardır ama `/api/cash-transfers` **yoktur**
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16`), yani ayna açıkken virman kaydı
sunucuda reddedilmez.

## 3. Hedef yerleşim

İlke: üst kısım (başlık → liste başlığı) **≤260px**, 1440×900'de listede **≥12 satır**, 390×844'te
yatay kaydırma yok.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Bankalar                    [Excel'den Aktar] [Virman] [+ Hesap Ekle]      │
│ TOPLAM   KASA   BANKA   KREDİ KARTI (borç)                                 │
│ ┌ Hesaplar ───────────────┐ ┌ Hesap hareketleri ─────────────────────────┐ │
│ │ [🔍 Hesap ara]          │ │ Merkez Kasa · IBAN yok      [Düzenle][Sil] │ │
│ │ Merkez Kasa  12.400,00  │ │ [Tümü|Giriş|Çıkış] [Bu ay|Bu yıl|Tarih]    │ │
│ │ Akbank TL  -3.250,00 ⚠  │ │ 03.10.2026 Tahsilat 12.000,00  24.400,00   │ │
│ │ … 12+ satır …           │ │ …                                          │ │
│ └─────────────────────────┘ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Değişiklikler: (a) listeye arama eklenir, pasifler varsayılan gizlenir (desen: `DriversPage.tsx:109`);
(b) şemadaki TOPLAM · KASA · BANKA · KREDİ KARTI kutuları `SumStrip` ile gelir
(`client/src/components/SumStrip.tsx:12-16`); (c) eksi bakiye rozet + metinle bildirilir;
(d) hareketlere tür/tarih süzgeci ve sayfalama gelir; (e) *Virman* yalnız iki aktif hesap varsa
açılır. `PageShell` ve `DetailDrawer` kodda **yoktur**; çekmece isteniyorsa önce
`28-ORTAK-PARCALAR.md` uygulanır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Hesap ara (yeni) | metin | hayır | Ad ve IBAN'da süzer; "Pasifleri göster" kapalıyken pasifler gizli | — |
| Hesap satırı | seçim düğmesi | — | Sağdaki hareket kartını değiştirir (`CashAccountsPage.tsx:56`) | — |
| Hesap türü | 4 seçenek | evet | Varsayılan *Banka* (`135`) | sunucu `IsInEnum` (`Validators.cs:461`) |
| Hesap adı | metin | evet | En çok 100 karakter | "Hesap adı zorunlu." (`22`, `Validators.cs:460`) |
| IBAN | metin | hayır | Yalnız tür *Banka* iken (`149`) | "IBAN geçersiz (TR ile başlayan 26 karakter)." |
| Açılış bakiyesi | tutar | evet | `AmountInput`, `words={false}` (`151`) | "Tutar girin (yoksa 0)." (`25`); negatifte "Tutar negatif olamaz." |
| Açılış tarihi / Durum | tarih + aç/kapa | evet | `DateQuick` (`153`), Aktif/Pasif (`155`) | — |
| Virman | ikincil düğme | — | İki aktif hesap gerekir; pencere `183` | "Çıkış ve giriş hesabı aynı olamaz." (`169`) |
| Virmanı sil / Hesabı sil | ikon düğmesi | — | Virman onaysız (`118`), hesap `ConfirmDialog` ile (`124-125`) | "Hareketi olan hesap silinemez; pasife alabilirsiniz." |
| Excel'den Aktar | ikincil düğme | — | Şablon sütunları `ImportService.cs:53`'te | satır hataları listede |

Klavye: `Esc` pencereyi kapatır (kirli formda önce sorar), `Ctrl/Cmd+Enter` kaydeder
(`ui.tsx:191-196`); gizli gönder düğmesi bunun için durur (`CashAccountsPage.tsx:157`). Öneri:
hesap listesinde `↑`/`↓` ile gezinme.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Yükleniyor:** hesaplar için `Spinner` (`CashAccountsPage.tsx:50`), hareketler için ayrı `Spinner`
  (`91`). Hedef: iskelet satırlar (`29-GORSEL-SISTEM.md`).
- **Boş:** hiç hesap yoksa *"Henüz hesap yok. 'Hesap Ekle' ile kasa ve banka hesaplarınızı açılış
  bakiyeleriyle girin."* (`51`); hareketi olmayan hesapta *"Bu hesapta hareket yok."* (`91`).
- **Hata:** liste isteği hata verirse uyarı çizilmez; `accounts.data ?? []` boş dizi olur (`37`) ve
  kullanıcı **boş durumu görür** (`50-51`). Hedefte `ErrorState` + *Tekrar dene* (`ui.tsx:252`;
  düğme metni `ui.tsx:258`).
- **Yetkisiz:** rota `Guard perm="accounting"` (`App.tsx:107`), menüde öğe gizli (`nav.ts:110`),
  sunucu 403 döner (`CashTests.cs:110`); hesap adları yine seçim listesinde görünür
  (`CashController.cs:23-25`).
- **Ayna:** *Hesap Ekle*, düzenle ve sil gizlenir (`ui.tsx:31-32`); yazma denemesi sunucuda
  reddedilir (`MirrorWriteGuard.cs:26-27`). **Virman bugün görünür ve sunucu da reddetmez** (§2).
- **Lisans:** süre dolduğunda yazma uçları reddeder; ekran bunu `useSave` bildirimiyle gösterir
  (`hooks.ts:73-76`). Sahip modunda kısıt yoktur.

## 6. Metinler ve terimler

Ekranda görünecek başlıca metinler: *Bankalar*, *Kasa / Banka*, *Toplam nakit ve banka*, *Hesap
Ekle*, *Hesap Düzenle*, *Hesap ara*, *Pasifleri göster*, *Virman*, *Son virmanlar*, *Hesap türü*,
*Kasa*, *Banka*, *POS*, *Kredi Kartı*, *Hesap adı*, *IBAN*, *Açılış bakiyesi*, *Aktif*, *Pasif*,
*Devir*, *Bakiye*, *Bu hesapta hareket yok.* Klasik görünümde başlığın yanındaki yardım kutusu
*"Kasa ve banka hesaplarınızın güncel bakiyesi burada görünür."* der
(`client/src/lib/pageHelp.ts:71-75`, kutu `ui.tsx:126`). Tür etiketleri tek
kaynaktan gelir: `cashAccountKindLabel` (`client/src/lib/labels.ts:190-195`) ve
`cashAccountKindIcon` (`client/src/lib/icons.tsx:27`). Ekranda teknik sözcük görünmez ("ayna",
"dry-run", "token", "endpoint", "UBL"). Para `tl2` ile iki kuruş, tarih `03.10.2026`
(`client/src/lib/format.ts:4`).

## 7. Telefon davranışı (390×844)

Bugün tek sütuna iner (`grid-cols-1 lg:grid-cols-3`, `CashAccountsPage.tsx:53`); hareket tablosu
`overflow-x-auto` ile kendi içinde kayar (`92`). Hedef: *Virman* ve *Hesap Ekle*'yi alt çubukta 44px
göstermek; hareketleri kart biçiminde çizmek; seçili hesabı üstte sabit tutmak.
`client/e2e/mobile.spec.ts:4` listesinde `/kasa-banka` **yoktur**; hedefte eklenir ve taşma ölçümü
onun için de çalışır.

## 8. Erişilebilirlik ve klavye

Bugün: hesap satırları gerçek `button`'dır (`CashAccountsPage.tsx:56`) ama seçili durum yalnız
görseldir, `aria-current` yoktur; hareket tablosunda `th` hücreleri (`94`) `scope` taşımaz; satır
anahtarı sıradır (`97`); sil ikonlarının `label`'ı vardır (`87-88`, `118`). Hedef: (a) seçili hesabı
`aria-current="true"` ile bildirmek; (b) tabloya `<caption>` ve `scope="col"` eklemek; (c) eksi
bakiyeyi metinle de yazmak; (d) dokunma hedeflerini ≥44px yapmak; (e) `:focus-visible` çerçevesini
korumak (`client/src/index.css:102-106`); (f) bakiye sütunundaki eşit genişlikli rakamları korumak —
sayı hizası bütün `td`'lere zaten verilir (`client/src/index.css:97`), sağa yaslı sayı hücresi
Overpass Mono'dur (`122`).

## 9. Testler (e2e + birim)

Mevcut kapsam:

- `client/e2e/workflow.spec.ts:410-451` — *Merkez Kasa* görünür, *Virman* açılır, tutar ve not
  girilir, "Virman kaydedildi." bildirimi ve notun listede görünmesi doğrulanır.
- `client/e2e/new-ui/basics.spec.ts:34-35` — yeni menüden *Bankalar* tıklanınca `h1` *Bankalar* olur.
- `client/e2e/mobile.spec.ts:4` — listede `/kasa-banka` yok (kapsam boşluğu).
- `server/YesLojistik.Tests/Integration/CashTests.cs:56-81` — bakiye formülü, aynı hesaba virman
  reddi, geçersiz IBAN reddi, hareketli hesabın silinememesi, çekin ancak tahsil edilince hesaba
  girmesi; `CashTests.cs:110-112` — yetkisiz kullanıcıya 403, seçim listesine 200. Personel ve iade
  hareketleri `StaffTests.cs:15-32` ile `LegacyDetailsTests.cs:17-38`'de sabitlenir.

Eklenecek senaryolar (`client/e2e/new-ui/banka.spec.ts`, `useNewUi(page)` —
`client/e2e/helpers.ts:44-46`): arama süzer; pasif hesap gizlenir/açılır; eksi bakiyede uyarı
görünür; iki aktif hesap yoksa *Virman* kapalıdır. Test silme/atlama yasaktır (ortak şartname §3.6).

## 10. Uygulama adımları

1. **`Validators.cs:463`** — negatif açılış bakiyesi kararını ver: `.Amount()` yerine yalnız üst
   sınır ve 2 ondalık kuralı ya da ipucu metnini düzelt. Süre: 1 saat.
   Doğrulama: `cd server && dotnet test --filter Cash_account_balance_and_transfers`.
2. **`CashAccountsPage.tsx:37-51`** — liste hatasını boş durumdan ayır (`accounts.isError` iken
   `ErrorState` + *Tekrar dene*, `ui.tsx:252-258`). Süre: 2 saat. Doğrulama: `cd client && npm run build`.
3. **`CashAccountsPage.tsx:54-64`** — arama ve "Pasifleri göster" anahtarı ekle; özet kutularını
   `SumStrip` ile bağla. Süre: 4 saat. Doğrulama: `cd client && npm run build && npm run lint`.
4. **`CashAccountsPage.tsx:62, 173`** — eksi bakiye rozeti + metin uyarısı; *Virman* koşulunu aktif
   hesap sayısına bağla. Süre: 3 saat.
   Doğrulama: `npx playwright test e2e/new-ui/banka.spec.ts e2e/workflow.spec.ts`.
5. **`CashAccountsPage.tsx:96-108`** — tabloya `caption` + `scope="col"` ekle, satır anahtarını
   `date+kind+description` yap, bakiye sütununda eşit genişlikli rakam hizasını koru
   (`client/src/index.css:97`, `122`). Süre: 3 saat.
   Doğrulama: `cd client && npm run build`.
6. **`CashAccountsPage.tsx:46, 87-88, 118`** — ayna modunda *Virman* ve *Virmanı sil* düğmelerini de
   gizle (`write` işareti ekle). Süre: 1 saat. Doğrulama: `npx playwright test e2e/license.spec.ts`.
7. **`MirrorWriteGuard.cs:16`** — koruma listesine `/api/cash-transfers` ekle, sunucu testiyle
   sabitle. Süre: 2 saat. Doğrulama: `cd server && dotnet test`.
8. **`CashAccountsPage.tsx:91`** — hareketlere tür/tarih süzgeci ve sayfalama ekle; sunucu ucu
   `CashService.MovementsAsync` (`CashService.cs:72-86`) parametre alır. Süre: 1 gün.
   Doğrulama: `cd server && dotnet test && cd ../client && npm run build`.
9. **`CashAccountsPage.tsx:90`** — IBAN'ı dörtlü gruplarla (`IbanValidator.cs:21-25`) ve kopyala
   düğmesiyle göster (desen: `SupplierDetailPage.tsx:40`). Süre: 2 saat.
   Doğrulama: `cd client && npm run build`.
10. **`client/e2e/new-ui/banka.spec.ts`** (yeni) + `client/e2e/mobile.spec.ts:4` — §9'daki
    senaryoları yaz, mobil listeye `/kasa-banka` ekle. Süre: 5 saat.
    Doğrulama: `E2E_BASE_URL=http://localhost:5173 npx playwright test e2e/new-ui/banka.spec.ts e2e/mobile.spec.ts`.
11. **`docs/plan/11-BANKALAR.md`, `docs/GELISTIRME-PLANI.md`** — yapılanları işaretle. Süre: 0,5 saat.
    Doğrulama: `git diff --stat`.

Toplam tahmin: **~3,5 iş günü** (28,5 saat). Sıra: 1 → 2 → 3 → 4 → 5; 6 ve 7 birlikte yapılmalı;
8–10 bağımsız.

## 11. Kabul ölçütü

1. 1440×900'de listede **≥12 satır**; üst kısım (başlık → liste başlığı) **≤260px**.
2. Hesap aramasına üç harf yazıldığında liste tek tık olmadan süzer; "Pasifleri göster" kapalıyken
   pasif hesap görünmez.
3. Eksi bakiyeli hesapta **hem rozet hem metin** uyarı vardır; uyarı yalnız renkle verilmez.
4. *Virman* yalnız **iki veya daha fazla aktif** hesap varken etkindir; farklı iki hesap seçilmeden
   kaydet çalışmaz ve hata metni §4 tablosundaki gibidir.
5. Hesap penceresinde `Ctrl/Cmd+Enter` kaydeder, `Esc` sorar; negatif açılış bakiyesinde ekran metni
   ile sunucu kuralı **aynı** şeyi söyler (§10.1 kararı).
6. Hareketlerde Giriş − Çıkış toplamı ve son bakiye sunucu testindeki formülle uyuşur
   (`CashTests.cs:73-74`).
7. Liste isteği hata verdiğinde boş durum değil, **hata durumu + Tekrar dene** görünür
   (`ui.tsx:252-258`).
8. Ayna açıkken *Hesap Ekle*, düzenle, sil, *Virman* ve *Virmanı sil* **hiç görünmez**;
   `POST /api/cash-transfers` sunucuda **reddedilir**.
9. 390×844'te yatay kaydırma yok (`client/e2e/mobile.spec.ts` içinde `/kasa-banka` satırı yeşil);
   dokunma hedefleri ≥44px.
10. e2e: `workflow.spec.ts`, `new-ui/basics.spec.ts`, yeni `new-ui/banka.spec.ts` ve
    `mobile.spec.ts` **yeşil**; `npm run build` ve `npm run lint` hatasız; `dotnet test` yeşil.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Negatif açılış bakiyesi eksi bakiyeyi olağan gösterir | Kredi kartı dışındaki türlerde eksi bakiye rozetle işaretlenir | `.Amount()` kuralına ve eski ipucu metnine dön |
| Hareket süzgeci/sayfalama bakiyeyi yanlış hesaplar | Yürüyen bakiye sunucudan gelir (`CashService.cs:80-84`) | Süzgeci kaldır, tam listeye dön |
| Ayna koruması virmanı engeller, eski akış bozulur | Kural yalnız ayna açıkken çalışır (`MirrorWriteGuard.cs:25`) | `/api/cash-transfers` satırını geri al |
| Hesap araması çok hesapta yavaşlar | Bugün liste tamamen gelir (`CashService.cs:64-70`); 200+ hesapta sunucu araması | Aramayı gizle |
| IBAN biçimlendirme kayıtlı değeri değiştirir | Kayıt `Normalize` ile saklanır (`CashController.cs:74`), yalnız gösterim biçimlenir | Biçimlendirmeyi kaldır |

Her adım ayrı commit; `main`'e giden her şey canlıya çıkar (§1.6).

## 13. Doğrulanacaklar
1. **Negatif açılış bakiyesi kararı:** ipucu (`CashAccountsPage.tsx:150`) eksi yazmayı söylüyor,
   sunucu kuralı (`Validators.cs:463`) reddediyor; hangisinin doğru olduğu **kullanıcı kararıdır** ve
   belge iki yolu da §10.1'de tarif eder.
2. **Virman'ın ayna modundaki durumu:** eksik `write` işareti (`CashAccountsPage.tsx:46`) ve
   `MirrorWriteGuard` listesindeki eksik yol (`MirrorWriteGuard.cs:16`) kasıtlı mı, gözden mi kaçtı.
3. **Kaç kasa/banka hesabı** tutulduğu, 12 satır hedefinin gerçek veriyle tutup tutmadığı ve çok
   hareketli hesapta (`MovementsAsync` sayfalama almaz, `CashService.cs:72-86`) tarayıcı
   performansı; ölçüm `33-K0-VE-KABUL-TESTI.md`'de yapılır.
4. **Kredi kartı hesabının toplamdan çıkarılması** (`CashAccountsPage.tsx:39`) iş kuralı olarak
   doğru mu; kart borcunun özet şeritte ayrı kutu olması kullanıcı onayı ister.
5. **`lookup` ucunun açık olması** (`CashController.cs:23-25`) bilinçli mi: hesap adları yetkisiz
   kullanıcıya görünüyor (`CashTests.cs:112`).
6. **Ekstre/çıktı beklentisi:** hesap ekstresinin PDF veya Excel olarak indirilmesi bugün **yok**
   (bu ekranda `ExportButton` yoktur, sunucuda `/cash-accounts/export` ucu bulunmaz). Tüm veriyi
   indirme farklı bir yoldur: kasa/banka satırları orada `kasa-ve-bankalar.csv` olarak çıkar
   (`server/YesLojistik.Api/Infrastructure/DataExportService.cs:52`).

Sonraki belgeyle bağlantı: `12-CEKLER.md` aynı *Banka & Çek* bölümünün ikinci sekmesidir
(`sections.ts:27`); çekin *Tahsil edildi* işaretlenmesi hesabı bu belgedeki listeden seçer
(`ChecksPage.tsx:102-131`) ve bakiye ancak o anda oluşur (`CashService.cs:22`). Tahsilat/ödeme
formlarının alanları `10-TAHSILAT-ODEME-FORMLARI.md`, nakit akışı görünümü `23-ANALIZ.md`, ortak
parçalar `28-ORTAK-PARCALAR.md` içinde tanımlanır.
