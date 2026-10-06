# 33 — Bildirim, E-posta, SMS ve KEP

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir/avukat onayı
gerekir).

## 1. Amaç ve kapsam

Bu modül, bugün dağınık olan bildirimleri **olay → şablon → kanal → gönderim günlüğü** zincirine
çevirir. Bugün e-posta gönderimi çalışır (`server/YesLojistik.Infrastructure/Services/SmtpEmailSender.cs`),
müşteriye sevkiyat durumu e-postası gider
(`server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:11-14`), fatura PDF'i e-postayla
yollar (`server/YesLojistik.Infrastructure/Services/InvoiceMailer.cs:9`) ve telefona anlık bildirim
gönderilir (`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:9-13`). Eksik olan kısım
**şablon yönetimi, kuyruk, yeniden deneme, gönderim günlüğü, SMS ve KEP**tir. Kapsam:

- **Olay sözlüğü**: hangi iş olayı hangi bildirimi doğurur (tek liste, kodda dağılmaz).
- **Şablon yönetimi**: değişkenli metin, önizleme, dil, sürüm; panelden düzenlenebilir.
- **Kanallar**: uygulama içi, e-posta, SMS, push (mobil), KEP. Her kanalın kendi kuralları.
- **Alıcı grupları ve tercihler**: rol, müşteri kartı, tedarikçi, şoför, kişisel tercih.
- **Kuyruk + yeniden deneme + gönderim günlüğü**: tek seferlik teslim hedefi, tekrar denemede çift
  gönderim yasağı.
- **Fatura/ekstre/e-belge gönderimi** ve **hatırlatmalar** (vade, muayene, sigorta, çek vadesi).
- **KEP/e-tebligat entegrasyonu**: sağlayıcıdan bağımsız arayüz, gerçek sağlayıcı **doğrulanacak**.
- **KVKK/izin yönetimi**: ticari elektronik ileti izni, ret hakkı, İYS durumu.

Kapsam dışı: e-belge üretimi ve entegratör (`08-E-BELGE-KATMANI.md`), e-posta sunucusu kurulumu
(`docs/MUSTERI-KURULUM.md` §11), KVKK metinleri ve saklama süreleri (`35-DENETIM-IZI-KVKK-UYUM.md`).

Bu modül şu üç soruyu net cevaplar: (1) Bu mesaj müşteriye gitti mi, gitmediyse neden? (2) Aynı mesaj
iki kez gider mi? (3) Kime hangi kanaldan yazmaya iznimiz var?

## 2. Luca'daki karşılığı

Luca Net'in tanıtım sayfasında iki ilgili madde vardır: **"BA-BS mutabakatı: oluşan kayıtlardan BA-BS
verisi listelenir, karşı firmanın e-postasına bilgi postası gider"**
(`docs/plan-erp/02-LUCA-ENVANTERI.md:31`) ve **"Fatura bilgilendirme: oluşturulan fatura cari firmanın
e-postasına gönderilir"** (`docs/plan-erp/02-LUCA-ENVANTERI.md:32`). Luca Mali Müşavir paketinde
**TÜRMOB KEP** bağlantı olarak listelenir (`docs/plan-erp/02-LUCA-ENVANTERI.md:16`) ve e-Dönüşüm
başlıkları arasında e-Defter, e-SMM ve **e-Dönüşüm saklama hizmetleri** vardır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:75-77`).

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> ve
<https://turmobkep.com.tr/>.

Bu dokümanın Luca'dan aldığı **fikir**: bildirim, belgeye bağlı ve **olay güdümlü** olmalıdır
(fatura kesildi → cariye gider; mutabakat oluştu → karşı firmaya gider). Bizde bugün bu fikir kısmen
vardır (sevkiyat durumu, fatura PDF'i) ama şablon, günlük ve kuyruk yoktur.

**doğrulanacak:** Luca'da bildirim şablonları kullanıcı tarafından düzenlenebiliyor mu, değişken
(ör. `{müşteri}`, `{tutar}`) desteği var mı — kaynak: Luca kullanım kılavuzu veya bayi demosu.
**doğrulanacak:** Luca'da SMS ve WhatsApp kanalı var mı, hangi sağlayıcıyla — kaynak: Luca kılavuzu.
**doğrulanacak:** TÜRMOB KEP entegrasyonunun teknik biçimi (API mi, portal mı, hangi belge türleri,
ücret) — kaynak: TÜRMOB KEP teknik dokümanı. **doğrulanacak:** KEP/e-tebligat zorunluluğunun hangi
firmalar için geçerli olduğu ve tebligatın hukuki sonuçları — **avukat onayı gerekir**; bu doküman
yorum yapmaz. **doğrulanacak:** SMS gönderim sağlayıcıları, başlık (sender ID) tahsis süreci, mesaj
başı ücret ve İYS entegrasyon gereksinimleri — kaynak: sağlayıcı teklifleri ve İYS dokümanları.
**doğrulanacak:** ticari elektronik ileti için tacir/esnaf alıcılarda istisna kapsamı ve ret hakkı
metni — kaynak: `docs/hukuk/README.md:63` ve avukat.

## 3. Bizde bugün

Bildirim altyapısı **kısmen çalışır**: e-posta ve telefon bildirimi vardır; şablon, kuyruk, günlük,
SMS ve KEP yoktur.

**E-posta gönderimi.** Arayüz iki üyelidir: `EmailMessage(To, Subject, Body, Attachments, ReplyTo?)`
(`server/YesLojistik.Core/Abstractions/IEmailSender.cs:5`) ve `IsConfigured`. Uygulama MailKit/MimeKit
ile SMTP kullanır (`server/YesLojistik.Infrastructure/Services/SmtpEmailSender.cs:1-2`); ayarlar
`Host, Port(587), User, Password, From` alanlarıdır (`:10-18`) ve yapılandırmadan tek satırda okunur
(`server/YesLojistik.Api/Program.cs:41-42`). Bağlantı 465'te SSL, aksi hâlde `StartTlsWhenAvailable`
ile kurulur (`server/YesLojistik.Infrastructure/Services/SmtpEmailSender.cs:39`). Gönderim hatası
Türkçe sade mesaja çevrilir ve günlüğe uyarı yazılır (`:44-48`). Ek (attachment) desteği vardır ve
içerik türü taşınır (`:33`). Ortam değişkenleri müşteri konteynerindedir
(`deploy/customer-compose.yml:48-52`).

**Olay → bildirim eşlemesi (bugün).** Aşağıdaki liste kodun tamamıdır; başka olay yoktur.

| Olay | Kanal | Sınıf / satır | Şablon |
|---|---|---|---|
| Sevkiyat `Loaded` / `OnRoad` / `Delivered` | e-posta | `server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:18-24` | Kod içinde sabit metin (`:42-53`) |
| Fatura kesildi (elle gönderim) | e-posta + PDF eki | `server/YesLojistik.Infrastructure/Services/InvoiceMailer.cs:12-34` | Kod içinde sabit metin (`:22-31`) |
| Sabah uyarı özeti (08:00) | e-posta | `server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:20-58` | Kod içinde sabit metin (`:40-54`) |
| Sabah uyarı özeti (gruplu) | push | `server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:62-81` | Kod içinde sabit metin |
| Sevkiyat durumu (şoför değiştirdi) | push | `server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:15-24` | Etiket sözlüğü |
| Şoför fotoğraf/belge yükledi | push | Aynı sözlük (`StaffNotifier.cs:19`) | Etiket sözlüğü |
| Şoför masraf girdi / onay bekliyor | push | `server/YesLojistik.Api/Controllers/DriverController.cs:90` | Kod içinde sabit metin |
| Masraf reddedildi | push | `server/YesLojistik.Infrastructure/Services/ExpenseService.cs:44-46` | Kod içinde sabit metin |
| Seferle ilgili değişiklik | push (şoföre) | `server/YesLojistik.Infrastructure/Services/DriverNotifier.cs:12-28` | Kod içinde sabit metin |

**Şablonlar.** Bugün şablon **yoktur**: metinler C# içinde sabit yazılıdır. Örnek — müşteri durum
e-postası (`server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:42-53`): başlık satırı
duruma göre "Yükünüz araca yüklendi", "Yükünüz yola çıktı", "Yükünüz teslim edildi" olur (`:18-24`);
gövdede güzergâh, yükleme tarihi, maskeli plaka ve takip bağlantısı vardır (`:47-50`). Fatura
e-postasında tutar, son ödeme tarihi ve IBAN satırı vardır
(`server/YesLojistik.Infrastructure/Services/InvoiceMailer.cs:25-27`). Günlük özette uyarılar üç gruba
ayrılır ve panel bağlantısı eklenir
(`server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:42-53`). Değişken yerine koyma
**yoktur**; hepsi dize birleştirmedir.

**Bildirim türleri ve tercihler.** Yedi tür vardır: `TripDelivered`, `TripStatusChanged`,
`DriverPhotoUploaded`, `DriverExpenseAdded`, `InvoiceOverdue`, `PayableDue`, `DocumentExpiring`
(`server/YesLojistik.Core/Entities/NotificationPreference.cs:4-7`). Türkçe etiketler tek sözlüktedir
(`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:15-24`). Kişisel tercih kaydı yoksa
**rol varsayılanı** geçerlidir: yönetici hepsini, operasyon sevkiyat olaylarını, muhasebe finans
olaylarını alır (`server/YesLojistik.Core/Entities/NotificationPreference.cs:19-26`); şoför rolü hiç
push almaz (`server/YesLojistik.Api/Controllers/MeController.cs:48`). Alıcılar aktif ve şoför olmayan
kullanıcılardır (`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:27-35`).
**Firma düzeyinde** tek bildirim anahtarı "Sabah uyarı özeti"dir
(`server/YesLojistik.Core/Entities/CompanySettings.cs:28`). Müşteri düzeyinde ise müşteri kartında
`NotifyStatusByEmail` alanı vardır ve yalnız o kart için çalışır
(`server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:35`; panel notu:
`client/src/pages/SettingsPage.tsx:212`).

**Push (telefon) bildirimi.** `ExpoPushSender` ile gönderilir; jetonlar `PushToken` tablosundadır ve
geçersiz jetonlar **silinir** (`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:44-48`,
`server/YesLojistik.Infrastructure/Services/DriverNotifier.cs:16-22`). Jeton kaydı uygulamadan gelir
(`server/YesLojistik.Api/Controllers/MeController.cs:30-33`) ve kullanıcı kendi jetonunu silebilir
(`:36-41`). Bildirim hatası iş akışını **bozmaz**: yalnız uyarı günlüğü yazılır
(`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:50-53`).

**Günlük özet.** 08:00'den sonra günde bir kez gönderilir; "önce günü işaretle" deseniyle aynı gün
ikinci kez gönderilmez (`server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:22-28`).
Uyarı yoksa e-posta atılmaz (`:30-31`). Alıcılar aktif **yönetici** kullanıcılarıdır (`:34-35`).
Zamanlanmış işçi ayrı sınıftadır (`server/YesLojistik.Api/Infrastructure/DailyDigestWorker.cs`).

**Uyarı üretimi.** Bildirimlerin beslediği uyarılar `AlertService` içindedir: bakım (15 gün,
`server/YesLojistik.Infrastructure/Services/AlertService.cs:12`, `:35`), muayene ve sigorta (30 gün,
`:13`, `:36-37`), bakım kilometresi (1.000 km, `:14`, `:38-44`), araç/şoför/firma **belgeleri**
(`:48-69`), şoför ehliyet/SRC/psikoteknik (`:72-78`), vadesi geçen alacaklar (`:84-92`), risk limiti
(`:118`) ve vadesi geçen taşeron borçları (`:131`). Çek/senet uyarı eşiği 7 gündür (`:15`).

**Uygulama içi bildirim.** Bugün **bildirim merkezi yoktur**. Uyarılar ana sayfada liste olarak
gösterilir; `AlertService` yalnız veri üretir, okundu/okunmadı durumu tutmaz. Panelde bildirim zili
veya okunmamış sayacı yoktur.

**SMS / KEP / WhatsApp.** SMS gönderimi **yoktur** (sağlayıcı yok, kod yok). KEP **yoktur**. WhatsApp
için yalnız **paylaşım bağlantısı** vardır; uygulama kullanıcı adına mesaj göndermez (`AGENTS.md` §8,
`docs/SATIS-PLANI.md:156-157`, `docs/PLAN.md:5`).

**Gönderim günlüğü ve yeniden deneme.** **Yoktur.** Gönderim sonucu hiçbir tabloya yazılmaz; yalnız
uygulama günlüğüne (logger) uyarı düşer. Yeniden deneme mekanizması yoktur; hata hâlinde mesaj
kaybolur.

**Ekranda bugün.** Ayarlar → Telefon Bildirimleri kişisel tercihleri gösterir
(`client/src/pages/SettingsPage.tsx:582-603`) ve `GET/PUT /api/me/notification-preferences` uçlarını
kullanır (`server/YesLojistik.Api/Controllers/MeController.cs:44`, `:57`). SMTP ayarlı değilse Firma
Bilgileri sekmesinde sarı uyarı çıkar (`client/src/pages/SettingsPage.tsx:200-204`).

**Eksik listesi (kanıtlı):** şablon tablosu ve düzenleme ekranı yok; SMS sağlayıcısı ve kodu yok;
KEP/e-tebligat yok; WhatsApp için yalnız bağlantı var; kuyruk ve yeniden deneme yok; gönderim günlüğü
tablosu yok (repoda `NotificationLog`/`OutboxMessage` terimi geçmez); uygulama içi bildirim merkezi ve
okunmadı sayacı yok; teslim durumu (delivered/bounced) izlenmez; müşteri bazlı kanal tercihi yoktur
(yalnız `NotifyStatusByEmail` bayrağı); ekstre gönderimi yoktur; çek vadesi hatırlatması yalnız günlük
özetin içindedir, ayrı hatırlatma değildir.

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md` §3 ortak parçalarını kullanır: `PageHeader`,
`Card`, `Field`, `Tabs`, `Badge`, `Button`, `Modal`, `Figures` (`client/src/components/ui.tsx`),
`DataTable` (`client/src/components/DataTable.tsx:66`), `MobileCards`
(`client/src/components/shell/MobileCards.tsx`), `SumStrip` (`client/src/components/SumStrip.tsx:12`),
`PageShell` (`client/src/components/shell/PageShell.tsx:28`). Form standardı: `Modal` (kaydetmeden
kapatma koruması, Ctrl+Enter) veya tam sayfa form. Klasik görünüm varsayılan kalır
(`client/src/lib/uiMode.ts:8`).

### 4.1 Ekran: Bildirim Merkezi (`/bildirimler`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Sekmeler | sekmeli | `Okunmamış`, `Tümü`, `Gönderilemeyen`, `Kuyruk` |
| Zaman | tarih-saat | `03.10.2026 14:22` biçimi |
| Olay | metin | Olay anahtarı + Türkçe adı (§5.1 sözlüğü) |
| Alıcı | metin | Kullanıcı/müşteri/tedarikçi adı |
| Kanal | rozet | `Uygulama içi`, `E-posta`, `SMS`, `Push`, `KEP` |
| Durum | rozet | `Bekliyor`, `Gönderildi`, `Teslim edildi`, `Hata`, `İptal` |
| Deneme | sayı | `2/5` |
| İşlem | düğme | "Yeniden gönder", "İptal et", "Ayrıntı" |
| Okundu işaretle | düğme | Tek satır ve toplu |

Filtreler: tarih aralığı, kanal, durum, olay, alıcı. Telefonda `MobileCards` ile kart görünümü.

### 4.2 Ekran: Şablonlar (`/ayarlar?tab=templates`) — yeni

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Olay | seçim | Evet | §5.1 olay sözlüğü; olay başına kanal başına bir şablon |
| Kanal | seçim | Evet | `Email`, `Sms`, `Push`, `Kep`, `InApp` |
| Dil | seçim | Evet | `tr` (varsayılan), `en` (boş bırakılabilir) |
| Ad | metin (80) | Evet | Panelde görünen ad |
| Konu | metin (150) | E-posta için evet | Değişken kullanabilir |
| Gövde | uzun metin | Evet | Değişkenler `{musteri}`, `{faturaNo}`, `{tutar}`, `{vade}`, `{takipLinki}`, `{firma}` |
| Değişken listesi | yan panel | — | Kullanılabilir değişkenler ve örnek değerleri |
| Önizleme | salt okunur | — | Örnek veriyle doldurulmuş çıktı |
| SMS parça sayısı | salt okunur | — | 160 karakter kuralı; aşılırsa uyarı |
| Sürüm | salt okunur | — | Her kayıt yeni sürüm; geçmiş korunur |
| Aktif | onay kutusu | Evet | Kapalıysa o olay için mesaj gönderilmez |

Kural: şablon **silinmez**; pasife alınır. Eski sürümler saklanır (denetim izi nedeniyle).

### 4.3 Ekran: Kanal Ayarları (`/ayarlar?tab=channels`) — yeni

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| E-posta gönderen adı | metin (80) | Evet | Bugünkü `From` alanı |
| E-posta gönderen adresi | e-posta | Evet | Bugünkü `Smtp:From` |
| Yanıt adresi | e-posta | Hayır | Bugünkü `EmailMessage.ReplyTo` (`IEmailSender.cs:5`) |
| Günlük gönderim tavanı | sayı | Evet | Aşılırsa kuyruk bekler; varsayılan 500 |
| SMS sağlayıcı | seçim | Hayır | `Yok` / sağlayıcı adı; **doğrulanacak** |
| SMS başlığı (sender ID) | metin (11) | Koşullu | Sağlayıcı tahsis eder |
| SMS birim maliyeti | tutar | Koşullu | Kontör hesabı için (`34-LISANS-ABONELIK-KONTOR.md`) |
| KEP adresi | metin (120) | Hayır | Firma KEP adresi |
| KEP sağlayıcı | seçim | Hayır | **doğrulanacak** |
| Push gönderim saati sınırı | saat aralığı | Evet | Gece 22:00–07:00 arası gönderilmez |
| Test gönderimi | düğme | — | Giriş yapan kullanıcının kendi adresine/telefonuna |

### 4.4 Ekran: Alıcı Grupları ve Tercihler (`/ayarlar?tab=recipients`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Grup adı | metin (60) | Ör. `Operasyon`, `Muhasebe`, `Müşteri - A grubu` |
| Üyeler | çoklu seçim | Kullanıcı, müşteri, tedarikçi, şoför |
| Olay seçimi | çoklu onay kutusu | §5.1 olayları |
| Kanal seçimi | çoklu onay kutusu | E-posta / SMS / Push / KEP |
| Sessiz saat | saat aralığı | Bu aralıkta gönderim ertelenir |
| Günlük tavan | sayı | Kişi başı günlük mesaj sayısı |
| İzin durumu | rozet | `Onaylı`, `Onaysız`, `Ret` (KVKK/İYS) |
| İzin kaynağı | metin | Nereden alındı (sözleşme, form, sözlü) + tarih |

### 4.5 Ekran: Hatırlatmalar (`/ayarlar?tab=reminders`) — yeni

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Hatırlatma türü | seçim | Evet | `Fatura vadesi`, `Araç muayenesi`, `Sigorta`, `Şoför belgesi`, `Çek/senet vadesi`, `Taşeron ödemesi` |
| Kaç gün önce | sayı listesi | Evet | Ör. 7, 3, 1, 0 |
| Vade sonrası | sayı listesi | Hayır | Ör. 1, 7, 15 (gecikme hatırlatması) |
| Kanal | çoklu seçim | Evet | |
| Alıcı grubu | seçim | Evet | §4.4 grupları |
| Gönderim saati | saat | Evet | Varsayılan 09:00 |
| Tekilleştirme | onay kutusu | Evet | Aynı belge + aynı gün + aynı kanal için tek mesaj |

### 4.6 Ekran: Gönderim Günlüğü (`/ayarlar?tab=log`) — yeni

| Alan | Tip | Davranış |
|---|---|---|
| Kayıt no | sayı | |
| Zaman | tarih-saat | |
| Olay / şablon sürümü | metin | Hangi şablonun hangi sürümü kullanıldı |
| Alıcı | maskeli metin | E-posta/telefon **maskeli** gösterilir |
| Kanal | rozet | |
| Durum | rozet | |
| Sağlayıcı yanıtı | metin (200) | Hata kodu ve sade açıklama |
| Deneme / sonraki deneme | sayı + zaman | |
| İçerik | düğme | Gönderilen metnin **tam** hâli (yetkiye bağlı) |

## 5. İş kuralları

### 5.1 Olay sözlüğü (tek kaynak)

Olaylar sunucuda tek bir sözlükte tanımlanır; kod ve panel bu sözlükten beslenir. Bugünkü dağınık
etiket sözlüğü (`server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:15-24`) bu sözlüğe taşınır.

| Olay anahtarı | Türkçe ad | Varsayılan kanal | Varsayılan alıcı |
|---|---|---|---|
| `trip.loaded` | Yükünüz araca yüklendi | E-posta | Müşteri (`NotifyStatusByEmail`) |
| `trip.onRoad` | Yükünüz yola çıktı | E-posta | Müşteri |
| `trip.delivered` | Yükünüz teslim edildi | E-posta + push | Müşteri + ofis |
| `trip.statusChanged` | Şoför durumu değiştirdi | Push | Ofis |
| `driver.photoUploaded` | Şoför fotoğraf/belge yükledi | Push | Operasyon |
| `driver.expenseAdded` | Şoför masraf girdi | Push | Muhasebe + operasyon |
| `expense.rejected` | Masraf reddedildi | Push | Şoför |
| `invoice.issued` | Fatura kesildi | — (elle) | — |
| `invoice.mailed` | Fatura e-postayla gönderildi | E-posta + PDF | Müşteri |
| `invoice.overdue` | Vadesi geçen alacak | E-posta + push | Müşteri + muhasebe |
| `payable.due` | Taşeron ödemesi bekliyor | Push + e-posta | Muhasebe |
| `document.expiring` | Belge süresi doluyor | Push | Operasyon |
| `check.due` | Çek/senet vadesi yaklaştı | Push + e-posta | Muhasebe |
| `statement.monthly` | Aylık hesap ekstresi | E-posta | Müşteri |
| `license.expiring` | Abonelik bitiyor | E-posta + uygulama içi | Yönetici |
| `backup.failed` | Gece yedeği alınamadı | E-posta | Yönetici |
| `kap.notification` | KEP bildirimi alındı | Uygulama içi | Yönetici |

### 5.2 Genel kurallar

1. **Tek seferlik teslim hedefi, en az bir kez garanti.** Kuyruk kaydı gönderimden **önce** yazılır
   (`Pending`); gönderim başarılıysa `Sent`, sağlayıcı onaylarsa `Delivered` olur. Zaman aşımında
   **önce sorgula, sonra gönder** kuralı uygulanır; aynı kuyruk kaydı iki kez gönderilmez
   (`08-E-BELGE-KATMANI.md:691` ile aynı ilke).
2. **Tekilleştirme anahtarı.** `(olay, hedefBelgeId, alıcı, kanal, gün)` tekil indeks olur. Bu, "aynı
   gün iki kez vade hatırlatması" gibi hataları veritabanı düzeyinde engeller.
3. **Yeniden deneme.** 5 deneme; bekleme süreleri 1 dk, 5 dk, 30 dk, 2 saat, 6 saat. Beşinci denemede
   başarısızsa durum `NeedsAttention` olur ve bildirim merkezinde kırmızı görünür. **Sessiz vazgeçme
   yoktur.**
4. **Hata iş akışını bozmaz.** Bugünkü ilke korunur: bildirim hatası sevkiyat, fatura veya masraf
   işlemini geri almaz (`server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:56-59`,
   `server/YesLojistik.Infrastructure/Services/StaffNotifier.cs:50-53`).
5. **İzin yoksa gönderilmez.** KVKK/ticari ileti izni olmayan alıcıya pazarlama/bilgilendirme mesajı
   gitmez; yalnız **mevcut sözleşmenin ifası** için gereken mesajlar (fatura, sevkiyat durumu, vade
   hatırlatması) gönderilir. İzin kaydı alıcı grubunda tutulur. **doğrulanacak:** tacir/esnaf
   alıcılarda istisna kapsamı — avukat.
6. **Ret hakkı.** Her mesajda ret yolu bulunur ("Bu mesajları almak istemiyorsanız ..."). Ret kaydı
   alıcı grubunda `Ret` durumuna geçer ve bir daha gönderilmez.
7. **Sessiz saat.** 22:00–07:00 arası SMS ve push gönderilmez; kuyrukta bekler ve sabah 07:00'de
   gönderilir. E-posta için sınır yoktur ama toplu gönderim gece yapılmaz.
8. **Günlük tavan.** Kişi başı günlük mesaj sayısı ve firma geneli günlük tavan aşılırsa kuyruk bekler;
   tavan aşımı gönderim günlüğünde görünür. Gerekçe: yanlış bir döngünün müşteriyi mesajla boğmasını
   engellemek.
9. **Şablon değişikliği geriye işlemez.** Gönderilmiş mesajın kullandığı şablon **sürümü** günlüğe
   yazılır; şablon değişince eski kayıtlar bozulmaz.
10. **E-belge ayrı kanal değildir.** e-Fatura/e-Arşiv gönderimi entegratör işidir
    (`08-E-BELGE-KATMANI.md`); bu modül **bilgilendirme** e-postasını ve PDF ekini gönderir. Aynı
    belge için iki ayrı bildirim üretilirse tekilleştirme anahtarı bunu engeller.
11. **Müşteri kartı bayrağı korunur.** Bugünkü `NotifyStatusByEmail` alanı
    (`server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:35`) tek doğru kaynak olarak
    kalır; yeni alıcı grupları onun **üstüne** eklenir, onu geçersiz kılmaz.
12. **KEP ayrı hukuki kanaldır.** KEP mesajı "bilgilendirme" değil **tebligat** olabilir. KEP
    gönderimi varsayılan **kapalıdır**, açılması yönetici onayı ve hukuki teyit ister. KEP ile gelen
    belge uygulama içi bildirim üretir ve **silinemez** (delil niteliği). **doğrulanacak:** KEP'in
    hukuki sonuçları — avukat.
13. **Ayna modu.** Ayna açıkken müşteri verisi pratikortam'dan gelir; bu modda **pazarlama** mesajı
    gönderilmez, yalnız sevkiyat durumu ve fatura bilgilendirmesi gidebilir. Gerekçe: veri sahibinin
    izni pratikortam tarafında alınmış olabilir ama kapsamı bilinmez.
14. **Lisans kapısı.** Abonelik bitmişse (salt okunur mod) yeni **pazarlama** mesajı kuyruğa alınmaz;
    bilgilendirme mesajları da durur, çünkü panel yazma yapamaz
    (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:22-41`). Kuyrukta bekleyenler saklanır.
15. **Gizlilik.** Gönderim günlüğünde e-posta/telefon **maskeli** saklanır (ör. `a***@firma.com`,
    `0532 *** 45 67`); tam içerik yalnız yetkili kullanıcıya gösterilir. Gerekçe: günlük tablosu
    ikinci bir kişisel veri deposuna dönüşmemelidir.

## 6. Veri modeli

Kural: `docs/plan-erp/01-ORTAK-SARTNAME.md` §1.5 — migration **yalnız ekleme** yapar. `BackgroundJob`
tablosu (`docs/plan-erp/05-VERI-MODELI.md:433-438`) **yeniden kullanılır**; ayrı bir kuyruk tablosu
açılmaz.

### 6.1 Yeni tablo: `NotificationTemplate`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `EventKey` | string(40) | §5.1 anahtarı |
| `Channel` | yeni enum | `InApp`, `Email`, `Sms`, `Push`, `Kep` |
| `Language` | string(5) | `tr` / `en` |
| `Name` | string(80) | Panelde görünen ad |
| `Subject` | string(150)? | Yalnız e-posta |
| `Body` | string (uzun) | Değişkenli metin |
| `Version` | int | Her kayıtta artar |
| `IsActive` | bool | |
| `UpdatedAt` / `UpdatedBy` | DateTime / string(80) | |

Tekil indeks: `(CompanyId, EventKey, Channel, Language, Version)`.

### 6.2 Yeni tablo: `NotificationMessage` (kuyruk + günlük)

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `EventKey` | string(40) | |
| `Channel` | yeni enum | |
| `TemplateId` / `TemplateVersion` | int? / int? | Hangi sürüm kullanıldı |
| `RecipientType` | string(12) | `User`, `Customer`, `Supplier`, `Driver`, `Company` |
| `RecipientId` | int? | |
| `Address` | string(160) | E-posta/telefon/KEP; günlükte **maskeli** |
| `Subject` | string(150)? | Gönderilen konu |
| `BodySnapshot` | string (uzun)? | Gönderilen metnin tam hâli |
| `Status` | yeni enum | `Pending`, `Sending`, `Sent`, `Delivered`, `Failed`, `NeedsAttention`, `Cancelled` |
| `Attempts` | int | |
| `NextAttemptAt` | DateTime? | |
| `DedupeKey` | string(120) | §5.2.2 |
| `ProviderMessageId` | string(80)? | Sağlayıcı kimliği |
| `ProviderResponse` | string(200)? | Hata kodu ve sade açıklama |
| `CreatedAt` / `SentAt` / `DeliveredAt` | DateTime | |
| `ReadAt` | DateTime? | Uygulama içi okundu bilgisi |
| `SourceType` / `SourceId` | string(30) / int? | Belge bağı (fatura, sevkiyat, çek) |
| `JobId` | int? | `BackgroundJob` bağı |
| `Cost` | decimal? | SMS/KEP birim maliyeti (`34` dokümanı için) |

Tekil indeks: `(CompanyId, DedupeKey)`. İndeksler: `(Status, NextAttemptAt)`,
`(CompanyId, CreatedAt)`, `(RecipientType, RecipientId)`, `(SourceType, SourceId)`.

### 6.3 Yeni tablo: `NotificationChannelSetting`

| Alan | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `Channel` | yeni enum | |
| `IsEnabled` | bool | |
| `SenderName` / `SenderAddress` | string(80) / string(160)? | E-posta ve SMS başlığı |
| `DailyCap` | int? | Firma geneli günlük tavan |
| `QuietHoursStart` / `QuietHoursEnd` | TimeOnly? | Sessiz saat |
| `ProviderCode` | string(30)? | Sağlayıcı adı (kod içinde tarif edilir) |
| `UnitCost` | decimal? | Kontör hesabı için |

Tekil indeks: `(CompanyId, Channel)`.

### 6.4 Yeni tablo: `RecipientGroup` + `RecipientGroupMember`

| `RecipientGroup` | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `CompanyId` | int? | |
| `Name` | string(60) | |
| `EventKeys` | string (JSON) | Hangi olaylar |
| `Channels` | string (JSON) | Hangi kanallar |
| `DailyCap` | int? | Kişi başı tavan |
| `IsActive` | bool | |

| `RecipientGroupMember` | Tip | Not |
|---|---|---|
| `Id` | int, PK | |
| `GroupId` | int, FK | |
| `RecipientType` / `RecipientId` | string(12) / int | |
| `Consent` | yeni enum | `Unknown`, `Granted`, `Denied` |
| `ConsentSource` | string(60)? | Sözleşme/form |
| `ConsentAt` | DateTime? | |
| `OptOutAt` | DateTime? | Ret tarihi |

Tekil indeks: `(GroupId, RecipientType, RecipientId)`.

### 6.5 Mevcut tablolara eklenecek sütunlar

| Tablo | Sütun | Tip | Not |
|---|---|---|---|
| `Customer` | `PreferredChannel` | string(12)? | Boş = firma varsayılanı |
| `Customer` | `NotifyDueByEmail` | bool | Vade hatırlatması izni |
| `Supplier` | `NotifyDueByEmail` | bool | Taşeron ödeme hatırlatması |
| `CompanySettings` | `KepAddress` | string(120)? | `31` dokümanında da geçer |
| `CompanySettings` | `NotifyAdminOnBackupFail` | bool | Yedek hatası bildirimi |
| `User` | `Phone` | string(20)? | SMS için; bugün `User` tablosunda telefon alanı **yoktur** (`server/YesLojistik.Core/Entities/User.cs:5-16`) |

## 7. API uçları

Mevcut uçlar korunur: `GET/PUT /api/me/notification-preferences`
(`server/YesLojistik.Api/Controllers/MeController.cs:44`, `:57`). Yeni uçlar:

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/notifications` | `?status=&channel=&from=&to=&page=` | Mesaj listesi (maskeli adres) | `Admin`, `Accounting`, `Operations` |
| GET | `/api/notifications/unread-count` | — | `{count}` | Giriş yapmış |
| POST | `/api/notifications/{id}/read` | — | 204 | Alıcı veya yönetici |
| POST | `/api/notifications/read-all` | `{before}` | `{count}` | Giriş yapmış |
| POST | `/api/notifications/{id}/retry` | — | Güncel mesaj | `Admin` |
| POST | `/api/notifications/{id}/cancel` | — | Güncel mesaj | `Admin` |
| GET | `/api/notifications/{id}/content` | — | Gönderilen tam metin | `Admin` |
| GET | `/api/erp/notification-templates` | `?event=&channel=` | Şablon listesi | `Admin` |
| POST | `/api/erp/notification-templates` | `{eventKey, channel, language, name, subject, body}` | Şablon (yeni sürüm) | `Admin` |
| PUT | `/api/erp/notification-templates/{id}` | Aynı gövde | Şablon (yeni sürüm) | `Admin` |
| POST | `/api/erp/notification-templates/preview` | `{body, sampleData}` | Doldurulmuş metin | `Admin` |
| POST | `/api/erp/notification-templates/{id}/test` | `{to}` | Gönderim kaydı | `Admin` |
| GET | `/api/erp/notification-channels` | — | Kanal ayarları | `Admin` |
| PUT | `/api/erp/notification-channels/{channel}` | Kanal ayarı | Güncel ayar | `Admin` |
| GET | `/api/erp/recipient-groups` | — | Gruplar | `Admin` |
| POST | `/api/erp/recipient-groups` | `{name, eventKeys, channels}` | Grup | `Admin` |
| PUT | `/api/erp/recipient-groups/{id}/members` | `{members[], consent}` | Güncel grup | `Admin` |
| GET | `/api/erp/reminders` | — | Hatırlatma kuralları | `Admin` |
| PUT | `/api/erp/reminders/{id}` | Kural | Güncel kural | `Admin` |
| POST | `/api/erp/notifications/enqueue` | `{eventKey, sourceType, sourceId, recipientIds[]}` | `BackgroundJob` | `Admin` |

Kurallar: (a) gönderim **senkron değildir**; uçlar yalnız kuyruğa yazar ve `BackgroundJob` döner;
(b) liste uçlarında adres maskelenir; tam içerik ayrı uçtan ve yalnız yöneticiye verilir;
(c) hata gövdesi sade Türkçe `ProblemDetails`; (d) KEP gönderim ucu ayrıdır ve varsayılan kapalıdır.

## 8. Yetki, onay ve denetim izi

### 8.1 Rol matrisi

| İşlem | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Bildirim merkezini görme | ✅ | ✅ | ✅ | ❌ |
| Gönderim günlüğünü görme | ✅ | ✅ | Kendi olayları | ❌ |
| Gönderilen tam içeriği görme | ✅ | ❌ | ❌ | ❌ |
| Yeniden gönderme / iptal | ✅ | ❌ | ❌ | ❌ |
| Şablon oluşturma/değiştirme | ✅ | ❌ | ❌ | ❌ |
| Kanalları yapılandırma | ✅ | ❌ | ❌ | ❌ |
| Alıcı grubu ve izin yönetimi | ✅ | ❌ | ❌ | ❌ |
| Hatırlatma kuralı | ✅ | Görme | ❌ | ❌ |
| KEP gönderimi | ✅ (çift onay) | ❌ | ❌ | ❌ |
| Kişisel bildirim tercihi | ✅ | ✅ | ✅ | ❌ |

### 8.2 Onay (maker-checker)

| İşlem | Onay | Bugünkü durum |
|---|---|---|
| Şablon değişikliği | Yok (sürüm + denetim izi yeter) | **Yok** |
| Toplu gönderim (100+ alıcı) | Önizleme + açık onay | **Yok** |
| KEP gönderimi | Çift onay (iki yönetici) | **Yok** |
| Hatırlatma kuralını kapatma | Yok, ama denetim izli | **Yok** |
| İzin durumunun `Granted` yapılması | Kaynak belge zorunlu | **Yok** |

### 8.3 Denetim izi

`AuditLog`'a yazılacak olaylar: `TemplatePublished`, `TemplateDeactivated`, `ChannelConfigured`,
`RecipientGroupChanged`, `ConsentRecorded`, `ConsentRevoked`, `NotificationRetried`,
`NotificationCancelled`, `KepMessageSent`, `BulkNotificationApproved`. Günlük gönderim kayıtları
`NotificationMessage` tablosundadır; **her mesaj için denetim izi satırı yazılmaz** (gerekçe: hacim).
Denetim izi yalnız **karar** ve **yapılandırma** değişikliklerini tutar. İzin değişiklikleri ise
`35-DENETIM-IZI-KVKK-UYUM.md` gereği denetim izine **yazılır** ve silinemez.

## 9. Kabul kriterleri

1. Bildirim merkezi okunmamış sayısını gösterir; bir mesaj okundu işaretlenince sayaç bir azalır.
2. Sevkiyat "Yolda" durumuna geçince müşteriye e-posta gider; aynı durum ikinci kez tetiklenirse
   **ikinci mesaj üretilmez** (tekilleştirme anahtarı).
3. Aynı fatura için "fatura e-postası" iki kez tetiklenirse ikinci istek kuyrukta `İptal` olur.
4. Gönderim başarısız olduğunda mesaj `Hata` durumunda kalır, 5 kez denenir ve sonra
   `İlgi bekliyor` olur; hiçbir aşamada sessizce kaybolmaz.
5. Şablon gövdesindeki bilinmeyen değişken kaydetmeyi engeller ve hata metni değişken adını söyler.
6. Şablon önizlemesi örnek veriyle doldurulmuş metni gösterir; SMS önizlemesi parça sayısını yazar.
7. Şablon değiştirildiğinde eski mesajların günlüğü **değişmez** (sürüm sabittir).
8. SMTP ayarlı değilse e-posta kanalı pasif görünür ve neden yazar (bugünkü uyarı korunur:
   `client/src/pages/SettingsPage.tsx:200-204`).
9. Sessiz saatte kuyruğa giren SMS/push, sabah 07:00'den önce gönderilmez.
10. Günlük tavan aşıldığında mesaj `Bekliyor` durumunda kalır ve günlükte tavan nedeni yazılıdır.
11. İzni `Ret` olan alıcıya hiçbir kanaldan mesaj gitmez; deneme kuyruğa bile alınmaz.
12. İzni olmayan alıcıya pazarlama/bilgilendirme mesajı gitmez; yalnız sözleşme ifası mesajları gider.
13. KEP kanalı varsayılan **kapalıdır**; açılmadan KEP ucu 400 döner.
14. Günlükte e-posta ve telefon **maskeli** görünür; tam içerik yalnız yöneticiye açılır.
15. Bildirim hatası sevkiyat/fatura/masraf işlemini geri almaz (bugünkü ilke; regresyon testi).
16. Sabah uyarı özeti aynı gün ikinci kez gönderilmez (bugünkü davranış korunur:
    `server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:22-28`).
17. Uyarı yoksa sabah özeti gönderilmez ve kuyrukta boş kayıt oluşmaz
    (`server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:30-31`).
18. Abonelik salt okunur moddayken yeni pazarlama mesajı kuyruğa alınmaz.
19. Klasik görünüm varsayılan kalır; yeni ekranlar **iki görünümde de** çalışır.
20. `docs/plan-erp/01-ORTAK-SARTNAME.md` §4 referans denetimi bu doküman için **0 kırık referans** verir;
    mevcut testlerin hiçbiri silinmez veya atlanmaz.

## 10. Testler

### 10.1 Sunucu birim testleri (`server/YesLojistik.Tests/Unit/`)

Yeni dosya: `NotificationTemplateTests.cs`
- Bilinmeyen değişken kaydı reddeder; hata metni değişken adını içerir.
- Şablon sürümü her kayıtta artar; eski sürüm korunur.
- SMS gövdesi 160 karakteri aşarsa parça sayısı doğru hesaplanır.

Yeni dosya: `NotificationQueueTests.cs`
- Tekilleştirme anahtarı aynı olan ikinci kayıt eklenemez.
- Deneme sayısı 5'i aşınca durum `NeedsAttention` olur.
- Sessiz saatte `NextAttemptAt` sabah 07:00'ye taşınır.
- Günlük tavan aşılırsa mesaj `Pending` kalır.

Yeni dosya: `ConsentTests.cs`
- `Denied` izinli alıcı kuyruğa alınmaz.
- `Unknown` izinli alıcıya yalnız sözleşme ifası olayları gider.
- İzin değişikliği denetim izi satırı üretir.

### 10.2 Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration/`)

Yeni dosya: `NotificationFlowTests.cs` (`server/YesLojistik.Tests/Integration/ApiFactory.cs` deseniyle,
`server/YesLojistik.Tests/Integration/FakeEmailSender.cs` ve
`server/YesLojistik.Tests/Integration/FakePushSender.cs` yeniden kullanılır)
- Sevkiyat "Yolda" → e-posta kaydı `Sent`; ikinci tetikleme yeni kayıt üretmez.
- Şoför masraf girdi → muhasebe kullanıcısına push; izni kapalı kullanıcıya gitmez.
- Fatura maili → ek dosya adı ve içerik türü doğru.
- SMTP yapılandırılmamışken e-posta denemesi iş akışını bozmaz.

Yeni dosya: `NotificationTemplateApiTests.cs`
- Şablon kaydetme yalnız `Admin`; `Operations` rolü **403**.
- Önizleme ucu örnek veriyle doldurulmuş metni döner.
- Test gönderimi gerçek sağlayıcıya gitmez (sahte gönderici kullanılır).

Mevcut testler korunur ve genişletilir:
`server/YesLojistik.Tests/Integration/CustomerNotifyTests.cs` (müşteri durum e-postası),
`server/YesLojistik.Tests/Integration/DailyDigestTests.cs` (günlük özet),
`server/YesLojistik.Tests/Integration/CustomerTemplateTests.cs`.

### 10.3 Panel e2e testleri (`client/e2e/`)

Yeni dosya: `notifications.spec.ts`
- Sevkiyat durumu değiştirilir → bildirim merkezinde kayıt görünür.
- Okundu işaretlenir → sayaç azalır.
- Kanal ayarı kapatılır → yeni mesaj kuyruğa girmez.

Yeni dosya: `notification-templates.spec.ts`
- Şablon düzenlenir, önizleme doğru metni gösterir, kaydedilir, sürüm artar.
- Bilinmeyen değişken yazılınca Türkçe hata görünür.

Mevcut `client/e2e/workflow.spec.ts:121` ("bildirimler açılır") testi bildirim merkezini kapsayacak
biçimde genişletilir; `client/e2e/new-ui/basics.spec.ts` yeni sekmeleri kapsar
(yardımcı: `client/e2e/helpers.ts:44-46`).

## 11. Efor ve bağımlılıklar

| # | İş kalemi | Efor (kişi-gün) | Bağımlılık |
|---|---|---|---|
| 1 | `NotificationTemplate` + şablon motoru (değişken, sürüm) | 3 | — |
| 2 | `NotificationMessage` + kuyruk + yeniden deneme | 4 | `BackgroundJob` (`05-VERI-MODELI.md`) |
| 3 | `NotificationChannelSetting` + kanal uçları | 2 | 2 |
| 4 | `RecipientGroup`/üye + izin (KVKK) altyapısı | 3 | 1 |
| 5 | Olay sözlüğü ve mevcut çağrıların taşınması | 3 | 1, 2 |
| 6 | Hatırlatma kuralları + zamanlanmış iş | 4 | 2, 4 |
| 7 | Bildirim Merkezi ekranı | 3 | 2 |
| 8 | Şablonlar ve Kanal Ayarları ekranları | 3,5 | 1, 3 |
| 9 | Alıcı Grupları ve Hatırlatmalar ekranları | 3 | 4, 6 |
| 10 | Gönderim Günlüğü ekranı | 2 | 2 |
| 11 | Uygulama içi bildirim (zil + okunmadı sayacı) | 2 | 7 |
| 12 | SMS kanalı (sağlayıcı seçildikten sonra) | 3 | Sağlayıcı kararı |
| 13 | KEP/e-tebligat kanalı (sağlayıcı seçildikten sonra) | 4-6 | Sağlayıcı + avukat teyidi |
| 14 | E-posta teslim durumu izleme (webhook) | 2 | Sağlayıcı desteği |
| 15 | Testler (birim + entegrasyon + e2e) | 5 | Tümü |
| **Toplam (SMS ve KEP hariç)** | | **~44 kişi-gün** | |

**Önce bitmesi gerekenler:** `05-VERI-MODELI.md` (tablo sözleşmesi ve `BackgroundJob`),
`31-AYARLAR-SIRKET-KURULUMU.md` (KEP adresi, SMTP ayarları), `07-YETKI-ONAY-NUMARALANDIRMA.md`
(yetki matrisi, denetim olayları).

**Bu dokümanı bekleyenler:** `08-E-BELGE-KATMANI.md` (fatura e-postası), `09-CARI-YONETIMI.md`
(ekstre ve mutabakat postası), `16-CEK-SENET.md` (çek vadesi hatırlatması), `34-LISANS-ABONELIK-KONTOR.md`
(SMS/KEP kontör tüketimi), `35-DENETIM-IZI-KVKK-UYUM.md` (izin ve saklama),
`29-MOBIL-VE-DISA-ACILIM.md` (şoför push ve müşteri portalı bildirimleri).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Önlem | Geri dönüş |
|---|---|---|---|
| **Aynı mesajın iki kez gitmesi** (müşteri güveni) | Yüksek | Tekilleştirme anahtarı + "önce sorgula sonra gönder" + tek transaction | Kuyruk kaydı iptal edilir; şablon geçici kapatılır |
| Mesajın sessizce kaybolması | Yüksek | Her gönderim kaydı yazılır; 5 deneme sonrası `İlgi bekliyor` | Elle "Yeniden gönder" |
| SMS/KEP sağlayıcısı seçilememesi | Orta | Kanal varsayılan **kapalı**; panelde "sağlayıcı seçilmedi" yazar | Kanal açılmaz, sistem çalışmaya devam eder |
| KVKK/ticari ileti izni ihlali | **Yüksek** | İzin kaydı zorunlu; izinsiz alıcıya pazarlama mesajı gitmez; ret hakkı her mesajda | İzin durumu `Denied` yapılır; geçmiş mesajlar için hukuki değerlendirme |
| KEP mesajının hukuki sonucunun yanlış varsayılması | **Yüksek** | KEP varsayılan kapalı; açılması avukat teyidine bağlı; doküman yorum yapmaz | Kanal kapatılır |
| Şablon değişikliğinin geçmiş kayıtları bozması | Orta | Şablon **sürümlenir**; gönderilen metin `BodySnapshot` olarak saklanır | Eski sürüm yeniden yayınlanır |
| Yanlış döngü (binlerce mesaj) | Yüksek | Günlük tavan + kişi başı tavan + sessiz saat + toplu gönderimde önizleme | Kanal kapatılır; kuyruk toplu iptal edilir |
| Gönderim günlüğünün kişisel veri deposuna dönüşmesi | Orta | Adres maskeli saklanır; tam içerik yalnız yöneticiye | Günlük temizleme (saklama kararı `35`) |
| E-posta teslim edilebilirliği (spam) | Orta | SPF/DKIM ve gönderen adresi ayarı; **doğrulanacak** | Sağlayıcı değişir; kuyruk yeniden denenir |
| Sağlayıcı anahtarının sızması | Yüksek | Anahtar yalnız ortam değişkeninde; panele yazılmaz | Anahtar yenilenir |
| Mobil jetonların geçersizleşmesi | Düşük | Geçersiz jeton silinir (bugünkü davranış) | Kullanıcı uygulamaya yeniden giriş yapar |

**Doğrulanacaklar (dış bilgi):**

1. **doğrulanacak:** SMS sağlayıcıları, başlık (sender ID) tahsis süreci, mesaj başı ücret, toplu
   gönderim API'si ve teslim raporu desteği — kaynak: sağlayıcı teklifleri.
2. **doğrulanacak:** İYS (İleti Yönetim Sistemi) entegrasyonunun zorunluluğu, kapsamı ve teknik
   biçimi; tacir/esnaf alıcılarda istisna — kaynak: İYS dokümanları ve avukat
   (`docs/hukuk/README.md:63`).
3. **doğrulanacak:** KEP sağlayıcıları (TÜRMOB KEP dâhil), tebligat gönderme/alma API'si, ücret ve
   hukuki sonuçlar — kaynak: sağlayıcı teknik dokümanı ve avukat
   (`docs/plan-erp/02-LUCA-ENVANTERI.md:16`).
4. **doğrulanacak:** e-tebligat kapsamı: hangi belgeler hangi firmaya KEP ile tebliğ edilir —
   kaynak: avukat ve GİB/ilgili kurum.
5. **doğrulanacak:** E-posta sağlayıcısının teslim durumu (delivered/bounce/complaint) webhook
   desteği — kaynak: e-posta sağlayıcısı.
6. **doğrulanacak:** KVKK kapsamında bildirim içeriğinin hangi kişisel verileri taşıyabileceği
   (plaka, adres, tutar) ve saklama süresi — avukat ve `35-DENETIM-IZI-KVKK-UYUM.md`.
7. **doğrulanacak:** WhatsApp Business API kullanılacaksa sağlayıcı, şablon onay süreci ve ücret —
   kaynak: sağlayıcı; bugün yalnız paylaşım bağlantısı vardır (`AGENTS.md` §8).
8. **doğrulanacak:** Luca'da bildirim şablonu düzenleme ve değişken desteği var mı — kaynak: Luca
   kullanım kılavuzu veya bayi demosu.
9. **doğrulanacak:** SMS içeriğinde "ret" satırının zorunlu olup olmadığı ve metin biçimi — avukat.
10. **doğrulanacak:** Sağlayıcı hata kodlarının Türkçe karşılıkları ve kullanıcıya gösterilecek sade
    metinler — kaynak: sağlayıcı API dokümanı.

Sonraki belgeyle bağlantı: bu doküman `08-E-BELGE-KATMANI.md`'ye fatura bilgilendirmesini,
`09-CARI-YONETIMI.md`'ye ekstre ve mutabakat postasını, `34-LISANS-ABONELIK-KONTOR.md`'ye SMS/KEP
kontör tüketimini, `35-DENETIM-IZI-KVKK-UYUM.md`'ye izin ve saklama akışını devreder; hepsi
`01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak parçalarını kullanır.
