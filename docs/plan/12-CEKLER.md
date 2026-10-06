# 12 — Çekler ve senetler

## 1. Amaç ve kapsam

Bu ekran, **müşteriden alınan çek ve senetlerin** vade ve durum takibini yapar: hangisi portföyde
bekliyor, hangisi bankaya tahsile verildi, hangisi tahsil edildi, hangisi taşerona ciro edildi,
hangisi karşılıksız çıktı ya da iade edildi. Üç işi vardır: **vadesi yaklaşanı öne çıkarmak**,
**durumu ilerletmek**, **iz bırakmak** (o çekin başına ne geldiğini göstermek).

Kapsam içi: durum sekmeleri (Portföyde · Ciro edilen · Tahsil edilen · Hepsi), 7 gün vurgusu,
satırdan durum ilerletme, ciro/tahsil/iade penceresi, çek hareketleri, Excel, telefon kartı.
Kapsam dışı: yeni çek girişi (belge `10`), kasa/banka virmanı (belge `11`), verilen (kendi) çek,
döviz, protesto/yasal takip/avukat bilgisi ve "açık (kalan) tutar" — bunlar kodda yoktur
(`docs/PRATIKORTAM-HARITA.md:148, 185, 228, 242`).

`01-ORTAK-SARTNAME.md` §5'teki 10 sık işin doğrudan biri değildir; 7 numaralı "tahsilat girmek"
işinin **çek ayağı**, 10 numaralı "aylık kazancı görmek" işinin **nakit akışı** ayağıdır (portföydeki
çek beklenen tahsilat sayılır: `server/YesLojistik.Infrastructure/Services/CashService.cs:108-112`).

---

## 2. Bugünkü durum (kod kanıtıyla)

### 2.1 Yer ve menü

Sayfa tek dosyadır: liste `client/src/pages/ChecksPage.tsx:35-97`, durum penceresi `:99-137`. Rota
`/cek-senet` (`client/src/App.tsx:106`), tembel yükleme `App.tsx:27`.

Klasik menüde "Banka & Çek" grubunda "Çek / Senet" (`client/src/lib/nav.ts:57-58`), yeni menüde
**"Çekler"** (`nav.ts:111-112`); ikisinde de vadesi yaklaşan çek sayacı vardır (`nav.ts:12-13`). Yeni
görünümde sayfa `client/src/lib/sections.ts:27`'deki "Çekler" sekmesiyle açılır, başlık
`sections.ts:50`'den gelir (`client/src/components/ui.tsx:112`).

### 2.2 Liste ekranı

Durum `ChecksPage.tsx:37-44`: arama, **durum süzgeci varsayılan `'Portfolio'`** (`:38`), "vadesi şu
tarihe kadar" (`:39`), **vade artan** sıralama (`:40`); sorgu `pageSize: 20`, `instruments: true` vb.
(`:44`). Sunucu karşılığı `server/YesLojistik.Core/Dtos/FinanceDtos.cs:45-55` ve
`server/YesLojistik.Api/Controllers/PaymentsController.cs:39-41`.

`PageHeader` başlık "Çek / Senet", tek düğme `ExportButton` (`/payments/export`, `cek-senet.xlsx`) —
`ChecksPage.tsx:76-77`; altında "Yeni çek/senet, Tahsilatlar'da girilir…" bilgisi (`:78`). Tek kart
"Portföy" (`:79`) başlık yuvasında `SearchBox` taşır
("Müşteri, açıklama...", `:80`); kartta `Select` durum ve `DateFilter` "Vadesi şu tarihe kadar" olmak
üzere **iki denetim** vardır ve `md:grid-cols-4` ızgarasında satırın yarısı boş kalır (`:81-84`).
`TotalsStrip` (`:85-88`) yalnız adet ve "Toplam" gösterir; toplam **süzgecin tamamının** toplamıdır
(`PaymentsController.cs:66-71`).

Tablo (`DataTable`, `:89-92`) sütunları `:47-61`: **Vade** (gün farkı alt satırda), **Müşteri**
("Alış: {tarih}"), **Çek / Senet** (yöntem + çek no + banka), **Durum** (rozet; ciro edilense
"→ {tedarikçi}", tahsil edildiyse hesap adı), **Tutar** (`tl2`, sağa dayalı). `DataTable`'ın
`onRowClick` yuvası doldurulmaz ve `rowClassName` verilmez: **satır tıklaması ve satır vurgusu
yoktur**; `mobileCard` da verilmez. Boş metin `:92`'de duruma göre değişir ("Portföyde çek/senet
yok." / "Kayıt yok."). Dosya 146 satırdır; `:139-146` yerel `PlainSelect`'tir.

### 2.3 Vade vurgusu ve 7 gün kuralı

Vade hücresi `daysUntil` ile hesaplanır (`client/src/lib/format.ts:43`) ve **yalnızca açık**
(Portfolio/InCollection) kayıtlarda **tarih metni** renklenir: vadesi geçmişse kırmızı, 0-7 gün
kalmışsa amber; altında "N gün geçti / bugün / N gün kaldı" yazar (`ChecksPage.tsx:48-53`).
Vurgu **hücre metnindedir** (`text-red-600` / `text-amber-600`); tabloda satır şeridi veya satır
arka planı (`rowClassName`) yoktur. Sunucudaki uyarı eşiği 7 gündür
(`server/YesLojistik.Infrastructure/Services/AlertService.cs:15`) ve portföydeki/tahsildeki çekler
için `/cek-senet` bağlantılı uyarı üretir (`AlertService.cs:98-104`) — menü sayacını bu besler.

### 2.4 Satırdan durum ilerletme

Durum düğmeleri **yalnızca `accounting`** yetkisinde çizilir (`ChecksPage.tsx:63-71`) ve istemcide dar
bir geçiş tablosuna uyar (`:24-32`): Portföyde → tahsile ver / tahsil edildi / ciro et / karşılıksız /
iade; Ciro edildi ve Karşılıksız yalnız sınırlı geri dönüşlere izin verir. Sunucu ise **her geçişi
kabul eder** (`PaymentsController.cs:104-129`) — §12'de risk olarak yazılmıştır.

Pencere (`ChecksPage.tsx:99-137`): tedarikçi ve kasa/banka listelerini çeker (`:101-102`), `POST
/payments/{id}/instrument` gönderir (`:106`), sonra ilgili listeleri tazeler (`:107`). Ciroda
**tedarikçi zorunludur** (`:110, :114`); karşılıksızda kırmızı uyarı (`:118`), iadede "tutar müşterinin
bakiyesine geri eklenir" (`:119`) yazar. "Tahsil edildi"/"Tahsile ver" için banka/kasa hesabı
seçilebilir (`:128-133`); tarih alanı **yalnız ciro** kolunda görünür (`:125`), diğer durumlarda
sunucu `Clock.Today` kullanır (`PaymentsController.cs:121`); seçim kutusu yerel `PlainSelect`'tir
(`:139-146`).

Sunucu kuralları (`PaymentsController.cs:102-133`): işlem tek transaction (`:109`); ciro geri alınınca
oluşan tedarikçi ödemesi silinir (`:110-114`); ciro, tedarikçiye **aynı tutarda** ödeme yazar (`:115-127`);
hesap yalnız tahsil/tahsile vermede yazılır (`:128`). Ciro edilmiş çek **silinemez** (`:161`); silme
düğmesi bu ekranda değil Tahsilatlar'dadır (`client/src/pages/PaymentsPage.tsx:55`); Tahsilatlar'da
Excel dışındaki yazma yolları `write` bayrağı taşır (`PaymentsPage.tsx:54-55, 66`).

### 2.5 Cari, kasa ve iz etkisi

Karşılıksız ve iade edilen çek müşteri bakiyesinden düşmez: kural tek yerde tanımlıdır
(`server/YesLojistik.Core/Entities/Payment.cs:26-27` — `Counts`) ve bakiye hesabında kullanılır
(`server/YesLojistik.Infrastructure/Services/CustomerAccountService.cs:14-15, 31`); ekstrede "Çek
karşılıksız (6.000,00 TL sayılmadı)" yazar (`CustomerAccountService.cs:56-61`). Hesap bakiyesine
**yalnızca tahsil edilmiş** çek girer — hareket sorgusu `InstrumentStatus == null || Collected`
süzgeci taşır (`CashService.cs:21-23`); tahsile verilmiş çek bakiyeyi değiştirmez.

Çek hareketleri için ayrı tablo **yoktur**, ama değişiklikler zaten işlem geçmişine yazılır:
`AuditTrail` alanı "Çek/Senet durumu" olarak Türkçeleştirmiş
(`server/YesLojistik.Infrastructure/Data/AuditTrail.cs:49`), durum etiketleri de hazırdır
(`AuditTrail.cs:115-116`). Kayıt bazında geçmiş gösteren bileşen vardır
(`client/src/components/AuditLog.tsx:29`'daki `AuditLogTable`; geçmişi bu sayfada `Payment` kaydı
için `?entityType=Payment&entityId=…` ile sorar — `AuditLog.tsx:35-37`). Tek engel: `/api/audit`
**yalnız yöneticiye** açıktır (`server/YesLojistik.Api/Controllers/AuditController.cs:14`).

### 2.6 Giriş tarafı ve testler

Çek/senet kaydı burada açılmaz: Tahsilatlar formunda yöntem seçilir
(`client/src/components/PaymentForm.tsx:26`), vade zorunludur (`:32`), alan "Çek no"/"Senet no" olur
(`:94`) ve ipucu "Portföye girer…" der (`:96`).

E2E: tek uçtan uca senaryo `client/e2e/workflow.spec.ts:410-451` (çek girişi → "Portföyde" → "Ciro et"
→ "Ciro edildi"); yeni görünümde menü adı "Çekler" sınanır (`client/e2e/new-ui/basics.spec.ts:25`).
Telefon testi bu sayfayı **kapsamaz** (`client/e2e/mobile.spec.ts:4`'te `/cek-senet` yok). Sunucu
testleri `server/YesLojistik.Tests/Integration/CashTests.cs:21-53` (vade zorunlu, portföy, ciro sonrası
tedarikçi borcu 8.000 → 2.000, ciro edilmiş çek silinemez, karşılıksızda bakiye geri gelir); aynı
dosyada `:66-79` portföydeki çekin hesap bakiyesine girmediğini, tahsil edilince girdiğini sınar.

Pratikortam'da "Çekler" listesi (No, Çek No, Tür, Firma/Tedarikçi, Vade, Tutar, Açık, Durum;
Tür/Durum/Para süzgeçleri) ve ayrı bir "Çek Hareketi / İş Akışı" ekranı vardır
(`docs/PRATIKORTAM-HARITA.md:147-149`); bizde hareket geçmişi ekranı ve protesto/yasal takip yoktur
(`PRATIKORTAM-HARITA.md:148, 242`).

---

## 3. Hedef yerleşim

Üst kısmı sıkıştır, süzgeci tek satıra indir, tabloyu yükselt. Hedef: 1440×900'de **≥12 satır**,
başlıktan tablo başlığına **≤260px**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Çekler                                          [Excel]                │
│ [Bankalar] [Çekler]                                                    │
│ [🔍 Müşteri, çek no, banka] [Vade ≤ ▾] [Diğer durumlar ▾]              │
│ (Portföyde 12) (Ciro edilen 3) (Hepsi)                                 │
│ Vadesi geçen 2 · 7 gün içinde 4 · Toplam 148.500,00                    │
│ Vade       Müşteri      Çek / Senet       Durum       Tutar            │
│▌03.10.2026 ABC Nakliyat Çek 123456·Ziraat Portföyde  17.000,00    ⋯    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Durum sekmeleri** (yeni): Portföyde · Ciro edilen · Tahsil edilen · Hepsi — bölüm sekmelerinden
  ayrı, sayfa içi bir şerit. Kalan üç durum (Tahsilde, Karşılıksız, İade) "Diğer durumlar" açılır
  listesinde kalır; altı durumun tamamı erişilebilir olur.
- Vade vurgusu **satıra** taşınır: vadesi geçmiş satırın solunda 3px kırmızı, 0-7 gün kalanda amber
  şerit; "N gün kaldı" metni korunur. `01-ORTAK-SARTNAME.md` §5 gereği vade için **ikinci rozet
  eklenmez**.
- Toplam şeridi ikinci satıra iner, kalemleri tıklanabilir olur ("Vadesi geçen", "7 gün içinde",
  "Toplam") ve `TotalsStrip`'ten `SumStrip`'e çevrilir (`AGENTS.md` §8).
- Satır yüksekliği 40-42px; işlemler sütunu en çok iki düğme (birincil + "⋯ İşlemler" `RowMenu`,
  `Menu.tsx:64-72`). Telefonda kart görünümü, süzgeçler tam ekran panelde (`FilterPanel.tsx:35-62`).
- **Çek hareketleri** satır tıklamasıyla açılan yan panelde gösterilir; `PageShell` ve `DetailDrawer`
  kodda **yoktur** (`01-ORTAK-SARTNAME.md:143-144`), §10'da `28-ORTAK-PARCALAR.md`'ye göre
  **eklenecektir**.

---

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Durum sekmeleri | sekme şeridi | — | Portföyde · Ciro edilen · Tahsil edilen · Hepsi; seçim adreste | — |
| Diğer durumlar | açılır liste | hayır | Tahsilde / Karşılıksız / İade süzer | — |
| Ara | metin kutusu | hayır | Müşteri + çek/senet no + banka | — |
| Vadesi şu tarihe kadar | tarih | hayır | Süzgeci daraltır | — |
| Excel | ikincil düğme | — | Süzgeçle dosya indirir | "Dosya indirilemedi." |
| Satır | tıklama | — | Çek hareketleri panelini açar | — |
| Tahsile ver / Tahsil edildi | ikincil düğme | — | Durum ilerler; hesap seçilir, tahsilde bakiye etkilenir | "Hesap bulunamadı." |
| Ciro et | ikincil düğme | tedarikçi evet | Tedarikçi + ciro tarihi; tedarikçiye aynı tutarda ödeme | "Ciro için tedarikçiyi seçin." |
| Karşılıksız | kırmızı düğme | — | Tutar bakiyeye geri eklenir; ciro geri alınır | — |
| İade / Portföye al | ikincil düğme | — | Durumu geri alır | — |
| Vazgeç / Kaydet | pencere düğmeleri | — | `Esc` kapatır (kirliyse sorar), `Ctrl+Enter` kaydeder | — |

Klavye: `Ctrl+Enter` kaydet, `Esc` kapat (ortak `Modal`, `ui.tsx:184-205`); süzgeçte `Enter`, sekmede
`←`/`→`, tabloda `↑`/`↓`.

---

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** iki metin korunur (`ChecksPage.tsx:92`); hedefte boş Portföyde sekmesinden
  Tahsilatlar'a giden bir düğme olur.
- **Yükleniyor / hata:** `DataTable` satır varken tabloyu soluklaştırır, satır yokken `Spinner`, hatada
  `ErrorState` + "Tekrar dene" gösterir (`DataTable.tsx:148`). Hedef: 6 soluk satırlık iskelet.
- **Yetkisiz:** `accounting` olmayan kullanıcı listeyi ve Excel'i görür, durum düğmelerini görmez
  (`ChecksPage.tsx:63`); hedefte "Yalnız görüntüleme" ipucu.
- **Ayna modu:** **bugün eksiktir.** `ChecksPage.tsx:67` ve `:114` düğmeleri `write` bayrağını
  **taşımaz**; `Button write` yalnız ayna açıkken gizlenir (`ui.tsx:27-32`, `IconButton` için `:46-48`).
  Yani aynada yazma düğmeleri görünür, tıklanınca sunucu reddeder: `/api/payments` korumalı yollar
  listesindedir (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:16-17`,
  ayna kontrolü `:23-25`). §10 adım 4 bunu kapatır.
  Excel düğmesi `write` almadığı için aynada da görünür (`client/src/components/Exports.tsx:8-11`).
- **Lisans/sahip modu:** süre dolunca salt okunur; liste ve Excel açık kalır (`docs/LISANS.md`).

---

## 6. Metinler ve terimler

Başlık yeni görünümde **"Çekler"** (`sections.ts:50`), klasikte "Çek / Senet" (`ChecksPage.tsx:76`);
sekmeler "Portföyde", "Ciro edilen", "Tahsil edilen", "Hepsi" + "Diğer durumlar" (Tahsilde,
Karşılıksız, İade); süzgeçler "Müşteri, çek no, banka", "Vadesi şu tarihe kadar"; şerit "Vadesi geçen",
"7 gün içinde", "Portföyde", "Toplam"; sütunlar "Vade", "Müşteri", "Çek / Senet", "Durum", "Tutar";
pencere "Ciro edilen tedarikçi", "Ciro tarihi", "Tedarikçiye aynı tutarda ödeme yazılır, borcu düşer.",
"Tutar müşterinin bakiyesine geri eklenir.", "Vazgeç", "Kaydet"; panel "Çek hareketleri", "Zaman",
"Kişi", "İşlem", "Değişiklik".

Durum adları `client/src/lib/labels.ts:172-179`, tonlar `labels.ts:181-188`, sayfa yardım metinleri
(`HelpTip`) `client/src/lib/pageHelp.ts:66-70`'ten gelir. `docs/TERIMLER.md` onayı beklediği için
toplu metin değişikliği yapılmaz (`AGENTS.md` §6). Teknik sözcük yasak: "ayna", "dry-run", "token",
"endpoint" ekranda görünmez.

---

## 7. Telefon davranışı (390×844)

Bugün `mobileCard` verilmemiştir (`ChecksPage.tsx:89-92`); 5 sütunlu tablo 390px'te yatay kaydırma
üretir ve `mobile.spec.ts:4` listesinde `/cek-senet` olmadığı için bu eksik **testle de yakalanmaz**.
Hedef: `DataTable`'ın `mobileCard` yuvası (`DataTable.tsx:49-50, 78-101`) kullanılır, `sm` altında
tablo gizlenir. Kart: üstte müşteri adı (kalın) ve tutar (mono, sağda); ortada "Çek 123456 · Ziraat"
ve durum rozeti; altta vade + "3 gün kaldı"; vadesi geçmiş kartta sol kenarda kırmızı şerit; en altta
44px yüksekliğinde "Tahsil edildi" ve "⋯ İşlemler" düğmeleri. Durum sekmeleri yatay kayar şerit olur;
tarih ve "Diğer durumlar" tam ekran paneldedir.

---

## 8. Erişilebilirlik ve klavye

- Durum sekmeleri `role="tablist"`/`role="tab"` + `aria-selected` ile yazılır; sayaçlar
  `aria-live="polite"` taşır. Bugünkü durum listesi `aria-label="Durum"` taşır (`ChecksPage.tsx:82`).
- Tutar sütunu sağa dayalı ve `tabular-nums` (`DataTable.tsx:138`); başlıklar `<th>`
  (`DataTable.tsx:113-121`).
- Satır tıklaması klavye desteğiyle eklenir (`tabIndex`, `Enter`).
- Renk körlüğü: durum **rozet + metin** (`Badge`, `ui.tsx:70-77`); vade vurgusu renk + metin ("3 gün
  kaldı"). Dokunma hedefi ≥44px; `:focus-visible` halkası `client/src/index.css:102-106`'dan gelir.

---

## 9. Testler (e2e + birim)

**Bugün var olanlar:** `client/e2e/workflow.spec.ts:410-451` (çek girişi → portföy → ciro),
`client/e2e/new-ui/basics.spec.ts:25` ("Çekler" menü adı), sunucuda
`server/YesLojistik.Tests/Integration/CashTests.cs:21-53` (çek/senet akışı) ve `:56-81` (kasa/banka
bakiyesi ve virman; `:66-79` çekin hesaba girişi). Ekrana özel yeni görünüm spec'i **yoktur**.

**Eklenecek e2e:** `client/e2e/new-ui/checks.spec.ts` (yeni) — `useNewUi(page)`
(`client/e2e/helpers.ts:44-46`) ile 7 senaryo: (1) Portföyde sekmesi seçili ve sıralama vade artan;
(2) vadesi geçmiş satırda kırmızı şerit + "N gün geçti", "Vadesi geçen" kalemi süzer; (3) 7 gün
içindeki satırda amber şerit; (4) "Tahsil edildi" + hesap → durum ve şerit toplamı değişir;
(5) "Ciro et" tedarikçisiz kaydedilemez, seçilince "Ciro edildi" + "→ {tedarikçi}"; (6) satır
tıklanır → panelde "Çek/Senet durumu: … → …"; (7) 375×812'de kart görünümü, yatay kaydırma yok.
**Birim/sunucu:** süzgeç birleşimleri (arama artık çek no + banka), sunucu geçiş matrisi ve
`AuditTrail` Türkçe etiketi. Test silme/atlama yok.

---

## 10. Uygulama adımları (dosya:satır, sırayla)

1. **Ortak parçalar.** `client/src/components/shell/DetailDrawer.tsx` (yeni) ve `PageShell` kodda yok
   (`01-ORTAK-SARTNAME.md:143-144`); `28-ORTAK-PARCALAR.md` şartnamesine göre yazılır. Doğrulama:
   `cd client && npm run build`. Süre: 4 saat.
2. **Durum sekmeleri.** `client/src/pages/ChecksPage.tsx:38, 81-84` — dört sekme + "Diğer durumlar";
   seçim adreste kalır. Doğrulama: `npx playwright test e2e/new-ui/checks.spec.ts`. Süre: 3 saat.
3. **Vade vurgusu ve şerit.** `ChecksPage.tsx:48-53, 85-88` — satır şeridi; `SumStrip` +
   "Vadesi geçen"/"7 gün içinde"; gerekirse `PaymentsController.cs:66-71` toplamları genişletilir.
   Doğrulama: `npx playwright test e2e/new-ui/checks.spec.ts`. Süre: 4 saat.
4. **Ayna uyumu.** `ChecksPage.tsx:67, 114` — düğmelere `write` bayrağı (`ui.tsx:27-32, 46-48`).
   Doğrulama: `npm run build`. Süre: 1 saat.
5. **Çek hareketleri paneli.** `ChecksPage.tsx:89-92` satır tıklaması → `DetailDrawer` +
   `AuditLogTable` (`AuditLog.tsx:29`) `entityType='Payment'`. `/api/audit` yalnız yöneticiye açık
   (`AuditController.cs:14`); muhasebeye açılması §13'te. Doğrulama:
   `npx playwright test e2e/new-ui/checks.spec.ts`. Süre: 4 saat.
6. **Aramayı genişlet.** `PaymentsController.cs:43-45` — çek/senet no ve banka da aranır;
   `ChecksPage.tsx:80` yer tutucusu güncellenir. Doğrulama:
   `cd server && dotnet test --filter CashTests`. Süre: 2 saat.
7. **Telefon kartı.** `ChecksPage.tsx:89-92` — `mobileCard`; süzgeçler tam ekran panele
   (`FilterPanel.tsx:35-62`); `client/e2e/mobile.spec.ts:4`'e `/cek-senet` eklenir. Doğrulama:
   `npx playwright test e2e/mobile.spec.ts`. Süre: 4 saat.
8. **Sunucu geçiş doğrulaması.** `PaymentsController.cs:104-129` — istemci tablosu
   (`ChecksPage.tsx:24-32`) sunucuda da uygulanır. Doğrulama:
   `cd server && dotnet test --filter CashTests`. Süre: 3 saat.
9. **e2e spec.** `client/e2e/new-ui/checks.spec.ts` (yeni) — §9'daki 7 senaryo. Doğrulama:
   `npx playwright test e2e/new-ui/checks.spec.ts`. Süre: 4 saat.
10. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`. Doğrulama:
    `git diff --stat`. Süre: 0,5 saat.

Toplam: **29,5 saat ≈ 4 iş günü**.

---

## 11. Kabul ölçütü

1. 1440×900'de liste **≥12 satır**; başlıktan tablo başlığına yükseklik **≤260px**.
2. Dört durum sekmesi **tek tıkla** değişir; Portföyde varsayılan, sıralama vade artandır.
3. Vadesi **geçmiş** satırda kırmızı şerit + "N gün geçti", **7 gün içindeki** satırda amber şerit +
   "N gün kaldı" görünür; şerit kalemi listeyi süzer ve sayı satır sayısıyla uyuşur.
4. "Ciro et" tedarikçisiz kaydedilemez; kaydedilince "Ciro edildi" + "→ {tedarikçi}" görünür ve
   tedarikçi borcu **aynı tutarda** azalır.
5. "Karşılıksız" çek müşteri bakiyesini **eski hâline döndürür** (CashTests ile aynı sonuç); ciro
   edilmişse tedarikçi borcu da yeniden açılır.
6. Satır tıklanınca "Çek hareketleri" paneli açılır, "Çek/Senet durumu: … → …" satırı gösterir ve
   `Esc` ile kapanır.
7. 390×844'te **yatay kaydırma yok**; dokunma hedefleri **≥44px**; `mobile.spec.ts` `/cek-senet`
   yolunu da denetler.
8. Ekranda teknik sözcük yok; aynada yazma düğmesi görünmez, Excel çalışır.
9. Yeni e2e spec'inde **7 senaryo** yeşil; `dotnet test --filter CashTests` bozulmadan geçer.

---

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Sunucu her geçişi kabul ediyor (`PaymentsController.cs:104-129`); yanlış geçiş bakiyeyi bozar | Geçiş matrisi sunucuya taşınır (§10/8) | Adım geri alınır |
| Hareket paneli yönetici dışına açılınca gizli alan sızması | `AuditTrail` gizli alanları dışlar (`AuditTrail.cs:12-21`); politika yalnız `Payment` için genişler | Politika `Policies.Admin`'e döner |
| Satır tıklaması durum düğmeleriyle çakışır | Düğme hücresinde `stopPropagation` korunur (`ChecksPage.tsx:65`) | Satır tıklaması kaldırılır |
| `DetailDrawer`/`PageShell` yokken panel yazılması | Önce §10 adım 1 | Adım 1 geri alınır |

---

## 13. Doğrulanacaklar

1. **pratikortam'daki "Çekler"** ekranının süzgeç/sütun sırası birebir alınmalı mı; alınan/verilen
   ayrımı isteniyor mu? (Canlı sistem salt okunur; yalnız kullanıcı bakabilir.)
2. **Verilen (kendi) çekimiz** kapsama girecek mi? `docs/PRATIKORTAM-HARITA.md:228` bunu "orta"
   öncelikli eksik sayıyor.
3. **Döviz (USD/EUR)** kullanılıyor mu? Veri modeli tek para birimi tutar (`Payment.cs:10`);
   `PRATIKORTAM-HARITA.md:185` döviz sütunu sayar.
4. **Protesto / yasal takip / avukata verildi** durumları isteniyor mu? Bugün yalnız altı durum var
   (`server/YesLojistik.Core/Entities/Enums.cs:61`; `PRATIKORTAM-HARITA.md:148, 242`).
5. **Kısmi tahsil / kalan ("açık") tutar** gerekli mi? Bugün çek tek tutardır.
6. **Vade uyarı eşiği 7 gün** doğru mu (`AlertService.cs:15`); vadesi geçenler en üstte mi kalsın?
7. **Hareket geçmişi kimlere açık olsun** — yalnız yönetici mi (`AuditController.cs:14`), muhasebe de
   görebilmeli mi?
8. **Çek ve senet ayrı sekme** olmalı mı, tek liste + yöntem etiketi yeterli mi (`ChecksPage.tsx:55`)?
   Çek evrakı bağlanacak mı (bugün dosya bağlama yoktur)?

---

Sonraki belgeyle bağlantı: `10-TAHSILAT-ODEME-FORMLARI.md` çekin **nasıl girildiğini**,
`11-BANKALAR.md` tahsil edilen çekin hangi hesaba düştüğünü ve virmanı, `28-ORTAK-PARCALAR.md` bu
ekranın ihtiyaç duyduğu `DetailDrawer`/`PageShell` parçalarını anlatır; sıradaki belge
`13-HARITA-TAKIP.md`'dir.
