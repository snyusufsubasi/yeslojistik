# 05 — e-Fatura: gönderilen ve e-arşiv

## 1. Amaç ve kapsam

Bu belge, panelin **e-Fatura bölümünü** tarif eder: kesilen faturaların listesi
(`/faturalar`), **gönderilen** ve **e-arşiv** ayrımı, fatura kesme akışı
(`/faturalar/yeni`), fatura detayındaki e-Fatura paneli, XML indirme, e-posta
gönderimi, iptal akışı, durum rozetleri ve entegratör soyutlaması
(`IEInvoiceProvider`, varsayılan `ManualXmlProvider`).

Hedef, "en sık 10 iş" listesindeki **5. işi (fatura kesmek → 3 tık)** ve 6. işin
fatura ayağını karşılamaktır (`01-ORTAK-SARTNAME.md` §5). Bugün fatura kesme akışı
`/faturalar/yeni` sayfasında çalışıyor; eksik olan, **kesilen faturanın resmî
gönderim durumunun liste düzeyinde görünmesi** ve "entegratör yok" durumunun
kullanıcıya sade biçimde anlatılmasıdır.

Kapsam içi: liste, süzgeçler, sütunlar, detay penceresi, e-Fatura paneli, iptal,
XML indirme, e-posta, e-Arşiv/gönderilen sekmeleri, entegratör durumunun ekranda
anlatımı.

Kapsam dışı ve başka belgelerde: alınan (satın alma) faturaları → `07-ALINAN-FATURALAR.md`;
faturalandırılacak sevkiyat kuyruğu ve sayaçlar → `06-FATURALANDIRILACAKLAR.md`;
muhasebe Excel/ZIP aktarımı ekranı → `24-RAPORLAR-MUHASEBE.md`; e-Fatura ayar
alanları → `25-YONETICI.md`; entegratör adaptörünün yazımı → `docs/E-FATURA.md` ve
`docs/ENTEGRATOR-EKLEME.md` (bu belge kod yazmaz, yalnız ekranı tarif eder).

## 2. Bugünkü durum (kod kanıtıyla)

**Rota ve menü.** `/faturalar` → `client/src/pages/InvoicesPage.tsx`
(`client/src/App.tsx:100`), `/faturalar/yeni` → `client/src/pages/InvoiceCreatePage.tsx`
ve `Guard perm="accounting"` ile korunuyor (`client/src/App.tsx:101`). Menüde
klasik görünümde "Faturalar" (`client/src/lib/nav.ts:34`), yeni görünümde "e-Fatura"
(`client/src/lib/nav.ts:75`) adıyla duruyor; ikisinde de faturası kesilmemiş teslim
sevkiyat sayacı rozet olarak gösteriliyor (`nav.ts:35`, `nav.ts:76`).

**Liste.** `InvoicesPage.tsx:45` sorguyu kuruyor: `page`, `pageSize: 20`, `search`,
`status`, `customerId`, `unpaid`, `from`, `to`, `tripNo`, `sort`, `desc`. Süzgeç
alanları `InvoicesPage.tsx:84-94`: müşteri arama kutusu, **fatura durumu** seçimi,
başlangıç/bitiş tarihi, sevkiyat no ve "Sadece ödenmemiş" onay kutusu. **e-Fatura
durumu için süzgeç yok.** Sütunlar `InvoicesPage.tsx:52-68`; e-Fatura numarası ve
durumu yalnız "Fatura No" hücresinin alt satırında metin olarak görünüyor
(`InvoicesPage.tsx:55`). Sayfa başlığı ve düğmeler `InvoicesPage.tsx:74-81`:
Excel'e aktar, Fatura İcmali (PDF), Excel'den Aktar (yalnız `accounting`), Yeni Fatura.
Filtre toplamı şeridi `InvoicesPage.tsx:95-102` (`SumStrip`). URL'den gelen `id` ve
`unpaid` parametreleri okunup **hemen temizleniyor** (`InvoicesPage.tsx:41-43`), yani
detay adres çubuğunda kalıcı değil. Mobil kart `InvoicesPage.tsx:120-133`,
`DataTable` mobil kart desteği `client/src/components/DataTable.tsx:50` ve `78-96`.

**Detay penceresi.** Liste satırına tıklayınca `InvoiceDetail` **Modal** açılıyor
(`InvoicesPage.tsx:135`, `140-197`); Modal `size="lg"`. Alt düğmeler
`InvoicesPage.tsx:154-161`: İptal Et, Faturayı Kes (yalnız `Draft`), Tahsilat Ekle,
E-posta Gönder (yalnız ayarlarda `emailEnabled` açıksa) ve PDF. İptal onayı
`ConfirmDialog` ile soruluyor (`InvoicesPage.tsx:192-194`; metin `:193`). Toplam dökümü
`InvoicesPage.tsx:176-185`.

**e-Fatura paneli.** `inv.ettn` doluysa `InvoiceDetail` gövdesinde `EInvoicePanel`
çiziliyor (`InvoicesPage.tsx:187`); panelin kendisi `InvoicesPage.tsx:209-242`:
senaryo etiketi + tevkifat bilgisi (`:218`), durum rozeti (`:219`), e-Fatura No ve
ETTN kutu değerleri (`:222-223`), sağlayıcı mesajı (`:225`), düğmeler: **XML indir**
(`:228-229`), **Entegratöre Gönder** (yalnız `canSend` iken, `:230-231`),
**Gönderildi olarak işaretle** (yalnız `canSend` değilken, `:232-233`),
**Durumu yenile** (yalnız `supportsStatus` ve uygun durumda, `:234-235`),
**İptal tamamlandı** (yalnız `CancelRequested`, `:236-237`). Sağlayıcı bilgisi
`/einvoice/info`'dan geliyor (`InvoicesPage.tsx:212`).

**Durum sözlüğü.** `eInvoiceStatusLabel` `InvoicesPage.tsx:199-202` içinde; tonlar
`eInvoiceStatusTone` `:203-205`; senaryo etiketleri `:206`. İstemci tipi
`client/src/api/types.ts:435`, senaryo tipi `:434`; sunucudaki karşılıklar
`server/YesLojistik.Core/Entities/Enums.cs:29` ve `:33`. Sözlük sayfa dosyasının
içinde duruyor; başka ekran kullanmak isterse ortak bir dosyaya taşınmalı.

Sunucu ile istemci arasında küçük ama gerçek bir fark var: `EInvoiceStatus`
(`Enums.cs:33`) ve istemci eşi (`types.ts:435`) **dokuz** durum taşır — `None`,
`Ready`, `Sent`, `Delivered`, `Accepted`, `Rejected`, `Failed`, `CancelRequested`,
`Cancelled`. §6 ve §11'de istenen "9 durum" bu yüzden bugün de tamdır; ek durum
uydurulmaz. Buna karşılık `eInvoiceStatusLabel` `None` durumunu `'—'` olarak
yazıyor (`InvoicesPage.tsx:200`), yani listede "durum yok" satırı boş görünür:
yeni süzgeçte `None` için ayrı bir "Gönderilmemiş" etiketi gerekir.

İkinci fark sunucu DTO'sunda: `EInvoiceInfoDto` (`EInvoiceController.cs:16-17`)
`ProviderName`, `CanSend`, `SupportsStatus`, `SupportsRecipientCheck`,
`ApiKeyConfigured` alanlarının yanında `ProviderKey` ve `SupportsDownload` da
döner; istemci tipi `EInvoiceInfo` (`client/src/api/types.ts:437-443`) bu iki
alanı **tanımlamaz**. Panel bugün onları okumadığı için kırılma yok, ama
sağlayıcı adını sadeleştiren §10/6 adımı `ProviderKey` alanını istemciye eklemek
zorunda kalabilir.

**E-posta.** `EmailDialog` (`InvoicesPage.tsx:252-275`) alıcı adresini müşteri
kartından öneriyor (`:253`, `:256`), konu dışı serbest mesaj alanı var (`:268-270`),
gönderim `/invoices/{id}/email` ucuna gidiyor (`:257`). Sunucu tarafı
`server/YesLojistik.Api/Controllers/InvoicesController.cs:73` (`accounting` politikası `:72`).

**Fatura kesme sayfası.** `InvoiceCreatePage.tsx` üç kolon: müşteri + sevkiyat
seçimi (`:119-154`), ek satırlar (`:155-179`), sağda yapışkan "Fatura Bilgileri"
kartı (`:182-233`). Teslim edilmiş sevkiyatlar baştan seçili geliyor (`:61`),
sevkiyatlardan gelen `?tripIds=` desteği var (`:49-53`). Tevkifat "Otomatik"
geliyor (`:17`, `:84-86`), KDV seçili sevkiyatlardan türetiliyor (`:68-69`), farklı
KDV oranlarında kaydetme kilitlenip uyarı çıkıyor (`:109-111`, `:222-226`). İki
düğme: **Taslak Kaydet** ve **Faturayı Kes** (`:228-229`). Sayfanın altındaki not
hâlâ şunu söylüyor: "Resmi e-Fatura/e-Arşiv mevcut muhasebe programınızdan
kesilmeye devam eder." (`:231`) — bu metin, e-Fatura açıkken yanıltıcı.

**Sunucu.** `server/YesLojistik.Api/Controllers/EInvoiceController.cs`:
`GET einvoice/info` (`:25-27`), `GET invoices/{id}/einvoice/xml` (`:29-34`),
`POST .../send` (`:36`), `.../mark-sent` (`:43`), `.../status` (`:50`),
`.../cancel-confirmed` (`:57`), `GET einvoice/recipient/{taxNumber}` (`:65-71`);
sınıfın tamamı `Policies.Accounting` ile korunuyor (`:22`). Aynı dosyada
`ExportsController`: `GET exports/accounting` (Excel, `:88`) ve
`GET exports/einvoice-xml` (aralıktaki faturaların XML'leri tek ZIP, `:137-156`).
İş kuralları `server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs`:
senaryo seçimi (`:25-26`), tip kodu (`:27`), seri öneki ve numara (`:30-32`),
durum `Ready` (`:32`), XML üretimi (`:57-63`), gönderim (`:66-86`), elle işaretleme
(`:89-98`), durum yenileme (`:100-106`), iptal ve iptal onayı (`:112-136`). Numarayı
üreten `NextNumberAsync` (`:39-47`) `e_invoice_sequences` tablosunda satır kilidiyle
UPSERT yapar (`prefix + yıl + 9 hane`); transaction geri alınırsa numara da geri
alınır, yani boşluksuz ve eşzamanlı güvenlidir. Soyutlama
`server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs:31`;
`ManualXmlProvider` `server/YesLojistik.Infrastructure/EInvoice/Providers.cs:10-24`
(`CanSend=false`, `SupportsStatus=false`), test sağlayıcısı `MockEInvoiceProvider`
`:30-58`. Kayıt tablosu `EInvoiceProviders.cs`, ortam değişkeni `EInvoice__Provider`
(`docs/E-FATURA.md:50`).

**Ekran metinleri.** Ayarlardaki sağlayıcı bilgisi
`client/src/pages/SettingsPage.tsx:606-615`: `canSend` yoksa "Entegratörle
sözleşme sonrası kurulum adımları docs/E-FATURA.md dosyasında." yazıyor — ekranda
**dosya yolu** görünüyor (`:612`).

**Test.** `client/e2e/workflow.spec.ts:310-344` uçtan uca senaryoyu kapsıyor:
e-Fatura açılır, e-Arşiv numarası doğrulanır, XML indirilir (`:328-329`),
"Gönderildi olarak işaretle" denenir (`:330-331`). Sunucu testleri
`server/YesLojistik.Tests/Integration/EInvoiceTests.cs` (yetki reddi `:157-162`).

## 3. Hedef yerleşim

```
┌────────────────────────────────────────────────────────────────────┐
│ e-Fatura                        [⋯ Diğer] [Excel] [+ Yeni Fatura] │
│ Gönderilen (128)   e-Arşiv (64)   Faturalandırılacak (7)           │
│ [🔍 Fatura no, müşteri…] [Durum ▾] [Müşteri ▾] [01.10–31.10]       │
│ (Durum: İptal talep edildi ✕)   Süzgeci temizle                    │
│ Bu listede 128 fatura · Matrah … · KDV … · Genel toplam …          │
│ ┌ tablo ───────────────────────────────────────────────────────────┐│
│ │ Tarih/Vade │ Fatura No · e-Fatura No │ Müşteri │ Tutar │ Kalan │ Durum │ ⋯│
│ └──────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

- Üst kısım (başlık → ilk tablo satırı) **≤260px**; 1440×900'de **≥12 satır**.
- Sekmeler `Gönderilen` / `e-Arşiv` / `Faturalandırılacak`. Üçüncü sekme
  `06-FATURALANDIRILACAKLAR.md` sayfasına gider; burada sayaç olarak durur.
- Durum rozeti **tek** olur (kural: satırda en fazla 1 durum rozeti,
  `01-ORTAK-SARTNAME.md` §5). Ödeme durumu metin olarak kalır (ör. "Kısmi ödendi"),
  rozet yalnız e-Fatura durumuna ayrılır.
- Detay: mevcut Modal korunur; `28-ORTAK-PARCALAR.md` ile gelecek `DetailDrawer`
  hazır olduğunda **sağdan çekmeceye** taşınır (satır kaybolmaz, liste bağlamı korunur).
  `PageShell` ve `DetailDrawer` bugün kodda **yok**; bu belge onların varlığını
  varsaymaz, yalnız geçiş noktasını işaretler.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Sekme: Gönderilen | sekme | — | e-Fatura mükellefi alıcılara kesilenler; varsayılan | — |
| Sekme: e-Arşiv | sekme | — | mükellef olmayan alıcılar (senaryo `EArsiv`) | — |
| Durum süzgeci | çoklu seçim | — | 9 durum + "Gönderilmemiş" | — |
| Müşteri | arama seçimi | — | mevcut davranış | — |
| Tarih aralığı | tarih ×2 | — | başlangıç > bitiş olamaz | "Başlangıç tarihi bitişten sonra olamaz." |
| Sadece ödenmemiş | onay kutusu | — | mevcut davranış | — |
| Yeni Fatura | düğme | — | `/faturalar/yeni` | — |
| XML indir | düğme | — | `{e-Fatura No}.xml` iner | "XML indirilemedi, tekrar deneyin." |
| Entegratöre Gönder | düğme | — | yalnız sağlayıcı gönderimi destekliyorsa | "Entegratöre ulaşılamadı. Biraz sonra tekrar deneyin." |
| Gönderildi olarak işaretle | düğme | — | entegratör yokken görünür | — |
| Durumu yenile | düğme | — | yalnız destekleyen sağlayıcıda | — |
| İptal Et | düğme (kırmızı) | — | onay sorar | "Fatura iptal edilsin mi?" |
| İptal tamamlandı | düğme | — | yalnız "İptal talep edildi" durumunda | — |
| E-posta Gönder | düğme | — | yalnız SMTP açıksa; PDF eklenir | "Alıcı adresi gerekli." |

- Klavye: **Ctrl+Enter** faturayı keser, **Esc** pencereyi kapatır, sekmeler `←/→`
  ile gezinir; `Tab` sırası: sekmeler → arama → süzgeçler → tablo → satır işlemleri.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** `FirstUse` bileşeni "Henüz fatura kesilmedi" diyor
  (`InvoicesPage.tsx:114-119`). Süzgeçli boşlukta metin "Bu filtrelere uyan fatura yok."
- **e-Arşiv sekmesi boş:** "Bu müşteriler için e-Arşiv faturası kesilmedi."
- **Yükleniyor:** `DataTable` iskeleti, 8 satır.
- **Hata:** tablo üstünde kırmızı şerit + "Tekrar dene" (`DataTable.tsx` `error`/`onRetry`).
- **Yetkisiz:** `accounting` yetkisi yoksa fatura düğmeleri gizli; sunucu da 403
  döner (`EInvoiceTests.cs:157-162`). Operasyon rolü listeyi görür, kesemez.
- **Ayna modu:** `MirrorContext` açıkken `Button write` yazma düğmeleri hiç
  çizilmez (`client/src/components/ui.tsx:27-32`, `46-48`) → "Yeni Fatura",
  "Faturayı Kes", "Tahsilat Ekle", "İmportButton" görünmez; XML indirme ve PDF
  **kalır** (okuma işlemidir). Listede "Kayıtlar pratikortam'dan geliyor" şeridi.
- **Lisans:** süre dolduğunda salt okunur; e-Fatura paneli görünür ama yazma
  düğmeleri kapalı olur.

## 6. Metinler ve terimler

Ekranda görünecek tam metinler (teknik sözcük yok — "UBL", "endpoint", "token",
"ayna", "dry-run" geçmez):

- Sekmeler: `Gönderilen`, `e-Arşiv`, `Faturalandırılacak`.
- Durum rozetleri: `Gönderilmeye hazır`, `Gönderildi`, `Alıcıya ulaştı`,
  `Kabul edildi`, `Reddedildi`, `Hata`, `İptal talep edildi`, `İptal edildi`
  (mevcut sözlük `InvoicesPage.tsx:199-202`).
- **Entegratör yok** durumu (tek satır, sade): "Bu fatura henüz gönderilmedi.
  XML dosyasını indirip e-Fatura portalına yükleyin ya da muhasebecinize verin."
  Bugünkü ayar metni dosya yoluna atıf yapıyor
  (`SettingsPage.tsx:612`); hedef metin: "Şu an otomatik gönderim kapalı; XML elle
  yüklenir. Entegratör bağlandığında bu ekrandan gönderilecek." — kullanıcıya
  `docs/E-FATURA.md` yolu **gösterilmez**.
- Ayarlarda sağlayıcı adı olduğu gibi yazılır (`Elle (XML indir)` →
  "Elle gönderim (XML indir)").
- Terimler `docs/TERIMLER.md` ve `docs/plan/32-TERMINOLOJI.md` onayına bağlı;
  onay gelmeden toplu değişiklik yapılmaz (`AGENTS.md` §6).

## 7. Telefon davranışı (390×844)

- Tablo yerine `mobileCard` (`InvoicesPage.tsx:120-133`): satır 1 fatura no + tek
  durum rozeti, satır 2 müşteri, satır 3 tarih/vade + tutar, satır 4 kalan.
- e-Fatura numarası karta eklenir (`YEA2026000000001`, mono yazı, tek satır,
  taşarsa `text-ellipsis`).
- Sekmeler yatay kaydırılır ama **sayfa gövdesi yatay kaymaz** (kabul ölçütü,
  `client/e2e/mobile.spec.ts`).
- Süzgeçler tam ekran panelde açılır (`client/src/components/shell/FilterPanel.tsx:35-62`).
- Satır eylemleri alt çubukta: `XML indir`, `PDF`, `Fatura Kes` (varsa).
- Dokunma hedefi ≥44px; bugünkü `size="sm"` düğme yüksekliği daha küçük
  (`ui.tsx:36` `min-h-8`), telefonda `md` boyuta çıkılır.

## 8. Erişilebilirlik ve klavye

- Tablo başlıkları `<th>` ile (`InvoicesPage.tsx:172`, `DataTable.tsx:102`),
  satır `aria-selected` (`DataTable.tsx:128`).
- Sekmeler `role="tablist"`/`role="tab"`, seçili sekme `aria-selected`, panel
  `aria-labelledby`.
- Durum rozeti **renk + metin** birlikte (`ui.tsx:70-77`; renk körlüğü).
- `:focus-visible` halkası `client/src/index.css:102-106` jetonundan geliyor.
- e-Fatura paneli `aria-live="polite"` bölge: durum değişince ("Gönderildi")
  ekran okuyucu duyurur.
- XML indirme düğmesi sonucu `aria-live` bildirim + `toast`.
- Toplu seçim çubuğu `role="region" aria-label="Seçilen kayıtlar"`
  (`DataTable.tsx:165-167`).

## 9. Testler (e2e + birim)

Mevcut: `client/e2e/workflow.spec.ts:310-344` (uçtan uca e-Arşiv + XML),
`client/e2e/new-ui/cari-invoice.spec.ts:15-35` (farklı KDV uyarısı),
`client/e2e/mobile.spec.ts` (yatay kaydırma), sunucu
`EInvoiceTests.cs` (XML içeriği, tekil numara, yetki).

Eklenecek (yeni görünüm yardımcısı `useNewUi`, `client/e2e/helpers.ts:44-46`):

1. `client/e2e/new-ui/einvoice.spec.ts` — sekmeler, e-Arşiv süzgeci, rozet metni.
2. "Entegratör yok" metni görünüyor mu ve **dosya yolu içermiyor** mu.
3. İptal akışı: İptal Et → "İptal talep edildi" rozeti → "İptal tamamlandı".
4. Ayna modu: "Yeni Fatura" ve "Faturayı Kes" görünmüyor, "XML indir" görünüyor.
5. Sunucu: yeni süzgeç parametreleri (`eInvoiceStatus`, `scenario`) için iki
   entegrasyon testi; `dotnet test` sayısı artar, hiçbir test silinmez
   (kural: test silme/skip yasak, `01-ORTAK-SARTNAME.md` §3.6).

## 10. Uygulama adımları

1. **`client/src/pages/InvoicesPage.tsx:26-45`** — URL'den `scenario` ve
   `eInvoiceStatus` parametrelerini oku, sorguya ekle; `unpaid` temizliği korunur.
   *Süre: 1 saat.* Doğrulama: `cd client && npm run build`.
2. **`client/src/pages/InvoicesPage.tsx:84-94`** — süzgeç satırına "e-Fatura
   durumu" çoklu seçimi ve sekme çubuğunu ekle (`SectionTabs` deseni,
   `client/src/components/shell/SectionTabs.tsx:8-32`). *Süre: 2 saat.*
   Doğrulama: `npx playwright test e2e/new-ui/einvoice.spec.ts`.
3. **`client/src/pages/InvoicesPage.tsx:52-68`** — "Fatura No" hücresini böl:
   iç numara üstte, e-Fatura numarası mono altta; durum rozetini ayrı sütuna al;
   ödeme durumu metne çevir. *Süre: 2 saat.* Doğrulama: `npm run build && npm run lint`.
4. **`client/src/lib/eInvoiceLabels.ts` (yeni)** — `eInvoiceStatusLabel`,
   `eInvoiceStatusTone`, `scenarioLabel` buraya taşınır; `InvoicesPage.tsx:199-206`
   yeniden dışa aktarır (kırılma olmasın). *Süre: 1 saat.* Doğrulama: `npm run build`.
5. **`client/src/pages/InvoicesPage.tsx:209-242`** — panele "entegratör yok"
   açıklaması, durum rozeti ve `aria-live` bildirimi ekle; yazma düğmeleri lisans
   salt okunurken kapansın. *Süre: 2 saat.* Doğrulama: yeni e2e testi.
6. **`client/src/pages/SettingsPage.tsx:606-615`** — "docs/E-FATURA.md" atfını
   kullanıcı dostu metinle değiştir; sağlayıcı adını sadeleştir. *Süre: 0,5 saat.*
   Doğrulama: `npm run build`, `rg "E-FATURA.md" client/src`.
7. **`client/src/pages/InvoiceCreatePage.tsx:231`** — e-Fatura açıkken yanıltıcı
   olan "resmî e-Fatura mevcut muhasebe programınızdan kesilir" notunu ayar
   durumuna göre koşullu yap. *Süre: 1 saat.* Doğrulama: `npm run build`.
8. **`server/YesLojistik.Api/Controllers/InvoicesController.cs:15-19`** —
   `einvoiceStatus` ve `scenario` süzgeç parametrelerini ekle (yalnız okuma;
   migration yok). *Süre: 2 saat.* Doğrulama: `cd server && dotnet test`.
9. **`client/e2e/new-ui/einvoice.spec.ts` (yeni)** — §9'daki 1-4 senaryoları.
   *Süre: 3 saat.* Doğrulama: `npx playwright test e2e/new-ui/einvoice.spec.ts`.
10. **`server/YesLojistik.Tests/Integration/EInvoiceTests.cs`** — iki süzgeç
    testi. *Süre: 2 saat.* Doğrulama: `cd server && dotnet test`.
11. **Telefon** (`client/src/pages/InvoicesPage.tsx:120-133`) — kart ve alt çubuk
    düzeni; dokunma hedefi ≥44px. *Süre: 1,5 saat.* Doğrulama: `npx playwright test e2e/mobile.spec.ts`.
12. **Belge güncelleme** — `docs/E-FATURA.md` ekran anlatımı ve
    `docs/GELISTIRME-PLANI.md`. *Süre: 0,5 saat.* Doğrulama: `git diff --stat`.

Toplam: **yaklaşık 2 iş günü** (18,5 saat).

## 11. Kabul ölçütü

- 1440×900'de liste **≥12 satır**; üst kısım **≤260px**.
- **2 tıkla** XML indirme (liste satırı → XML indir); **1 tıkla** sekme değişimi.
- Fatura kesme akışı 3 tıkta biter: `+ Yeni Fatura` → müşteri seç → `Faturayı Kes`.
- Her satırda **en fazla 1 durum rozeti**; e-Fatura durum sözlüğünde **9 durum** tam.
- "Entegratör yok" metni ekranda **en fazla 1 kez**, **0 teknik sözcük**, **0 dosya yolu**.
- 390×844'te **yatay kaydırma yok**; tüm dokunma hedefleri **≥44px**.
- Testler: **+5 test** (3 e2e, 2 sunucu), **0 silinen/skip edilen test**.
- Değişen üretim dosyası: **en fazla 7 istemci + 1 sunucu**; **0 migration**, **0 yeni paket**.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Yeni süzgeç sorguyu yavaşlatır | Yalnız okuma parametresi; ölçüm sonrası indeks | Süzgeci kaldır, `git revert` |
| Sekmeler kullanıcıyı şaşırtır | Varsayılan "Gönderilen", sayaç her sekmede görünür | Sekmeleri gizle, süzgeç bırak |
| Durum sözlüğü taşınırken import kırılır | `InvoicesPage.tsx` yeniden dışa aktarır | Dosyayı geri al |
| e2e seçicileri düğme metnine bağlı | Düğme adları **aynen** korunur (`workflow.spec.ts:328,330`) | Metinleri eski hâline döndür |
| Yazma düğmeleri ayna/lisans durumunda yanlış görünür | `Button write` + salt okunur kontrolü tek noktada | Kontrolü kaldır |
| Yanıltıcı not metni yanlış koşula bağlanır | Ayar `eInvoiceEnabled` okunur, varsayılan metin korunur | Notu eski hâline döndür |

Tüm adımlar tek tek commit'lenir; her adım sonunda `dotnet test`,
`npm run lint && npm run build`, sonra `git pull --rebase origin main` ve
`git push origin HEAD:main` (`AGENTS.md` §3.6).

## 13. Doğrulanacaklar

1. Liste satırındaki e-Fatura durumu için **hangi durumlar "gönderilmemiş"
   sayılacak**? (`None`, `Ready`, `Failed` — kullanıcı kararı gerekir.)
2. "Gönderilen" sekmesi **yalnız e-Fatura mükellefi alıcıları mı**, yoksa elle
   "gönderildi" işaretlenen e-Arşiv faturaları da mı kapsar?
3. İptal edilmiş faturalar varsayılan listede görünsün mü, ayrı süzgeçte mi?
4. Detay **Modal** olarak mı kalsın, `28-ORTAK-PARCALAR.md` çekmecesine mi taşınsın?
5. Gerçek entegratör bağlandığında ekranda görünecek **sağlayıcı adı** ne olacak?
6. e-Fatura kapalıyken "Gönderilen"/"e-Arşiv" sekmeleri **gizlensin mi**?
7. `docs/TERIMLER.md` onayı bekleyen terim değişiklikleri bu ekranda uygulanacak mı?
8. Ödeme durumu rozetini metne çevirmek müşteri onayı gerektirir mi?

Sonraki belgeyle bağlantı: `06-FATURALANDIRILACAKLAR.md` bu listenin
"Faturalandırılacak" sekmesini ve sayaçlarını, `24-RAPORLAR-MUHASEBE.md` aylık
Excel/XML ZIP aktarımını, `25-YONETICI.md` e-Fatura ayar alanlarını, `30-VERI-API.md`
süzgeç sözleşmelerini, `28-ORTAK-PARCALAR.md` ise `DetailDrawer` geçişini tarif eder.
