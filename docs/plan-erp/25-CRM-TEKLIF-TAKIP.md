# 25 — CRM ve Teklif Takibi

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir kullanır. Dış dünyaya ait
bilgiler `**doğrulanacak:**` etiketiyle işaretlidir; mevzuat yorumu yapılmaz (mali müşavir/avukat
onayı gerekir). "Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır.

## 1. Amaç ve kapsam

Bu modül, **müşteri olmadan önceki** ve **müşteri olduktan sonraki** ilişkiyi takip eder: aday kaydı,
görüşme ve aktivite kaydı, teklif takibi (hazırlandı/gönderildi/kazanıldı/kaybedildi), kaybetme
nedeni, hatırlatma ve görev, satış hunisi ve dönüşüm oranları, segment/grup, kampanya alanı.

Bugün panelde müşteri kartı vardır (`server/YesLojistik.Core/Entities/Customer.cs:3-54`) ve müşterinin
alt grubu/şantiyesi `CustomerGroup` ile tutulur (`Customer.cs:78-83`). Müşteri adayı (henüz müşteri
olmayan firma), görüşme kaydı, teklif durumu, kaybetme nedeni ve hatırlatma **yoktur**. Sevkiyat
öncesi ticari zincirin **belge** ayağı `13-SIPARIS-TEKLIF.md` ile kurulacaktır; bu doküman onun
**ilişki** ayağıdır: kime teklif verdik, sonuç ne oldu, neden kaybettik.

**Kapsam:**

- **Aday (potansiyel müşteri) kaydı:** firma ünvanı, yetkili kişi, telefon, e-posta, il/ilçe, kaynak
  (tavsiye, web, fuar, eski müşteri, soğuk arama), sektör, filo büyüklüğü, notlar, sahip kullanıcı.
- **Aday → müşteri dönüşümü:** mevcut `Customer` kaydına bağlanma; dönüşümde adayın aktivite ve
  teklif geçmişi müşteriye taşınır.
- **Görüşme ve aktivite kaydı:** telefon, ziyaret, e-posta, WhatsApp, toplantı; tarih, süre, özet,
  sonuç, sonraki adım.
- **Teklif takibi:** hazırlandı → gönderildi → kazanıldı/kaybedildi; tutar, geçerlilik, revizyon,
  kaynak sevkiyat/teklif bağı.
- **Kaybetme nedeni:** fiyat, süre, araç bulunamadı, ödeme vadesi, ilişki, başka firma, kapsam dışı,
  diğer; serbest not.
- **Hatırlatma ve görev:** tarihli görev, atanan kullanıcı, öncelik, tamamlanma, gecikme uyarısı.
- **Satış hunisi ve dönüşüm oranları:** aşama bazlı adet/tutar; aday → görüşme → teklif → kazanılan
  dönüşüm oranı; ortalama kazanma süresi.
- **Segment/grup:** mevcut `CustomerGroup` ile bağlantı (`Customer.cs:78-83`); CRM segmenti ayrı bir
  kavramdır (ölçüt bazlı etiket), grup ise elle atanan alt birimdir. İkisi ayrı tutulur ve raporda
  birlikte gösterilir.
- **Kampanya alanı:** kampanya adı, dönem, hedef kitle, beklenen adet; **kapsam sınırı** §1 sonunda.
- **E-posta/telefon entegrasyonu:** mevcut e-posta gönderme altyapısı kullanılır
  (`server/YesLojistik.Core/Abstractions/IEmailSender.cs:7-11`); gelen e-posta, arama kaydı ve
  santral entegrasyonu **doğrulanacak** (§12).

**Kapsam dışı:** fiyat teklifi belgesi, revizyon, sipariş ve sevkiyat üretimi
(`13-SIPARIS-TEKLIF.md`), satış faturası (`11-SATIS-FATURA.md`), müşteri portalı
(`29-MOBIL-VE-DISA-ACILIM.md`), toplu e-posta/SMS pazarlama aracı ve İYS yönetimi
(`33-BILDIRIM-EPOSTA-SMS-KEP.md`; ticari elektronik ileti izni avukat onayına bağlıdır,
`docs/hukuk/README.md:63`), teklif maliyet motoru (`13-SIPARIS-TEKLIF.md`).

**Kampanya kapsam sınırı (açıkça):** bu modül kampanyayı yalnız **etiket ve hedef kitle** olarak
tutar. Toplu mesaj gönderme, kişi listesi dışa aktarma, açılma/tıklama ölçümü ve İYS izin yönetimi
**kapsam dışıdır**; bunlar `33-BILDIRIM-EPOSTA-SMS-KEP.md` ve hukuk onayı gerektirir.

Bu modülün çözdüğü dört soru: (1) "Bu firmayla görüştük mü, ne konuştuk?" (2) "Verdiğimiz teklif ne
oldu, kazandık mı?" (3) "Kaybettiysek neden?" (4) "Bu ay kaç aday, kaç teklif, kaç kazanılan?"

## 2. Luca'daki karşılığı

Luca Koza'nın **Satış Yönetimi** modülü bu dokümanın ana referansıdır
(`docs/plan-erp/02-LUCA-ENVANTERI.md:12`, `:21`). Siteden okunan ilgili maddeler:

- **"Siparişten teslimata uzanan satış-pazarlama akışı"** (`02-LUCA-ENVANTERI.md:60`) — satış-pazarlama
  akışının uçtan uca tanımlandığı madde; CRM bu akışın başıdır.
- **"İstatistik raporları (satın alma-satış-finans karar desteği)"** (`02-LUCA-ENVANTERI.md:57`) —
  huni ve dönüşüm raporları.
- **"Cari kart girişinde yalnız T.C. Kimlik No veya Vergi Kimlik No ile vergi dairesi + adres otomatik
  sorgusu"** (`02-LUCA-ENVANTERI.md:34`) — aday → müşteri dönüşümünde VKN ile adres/vergi dairesi
  doldurma (**doğrulanacak:** hangi servis).
- **"Müşteri/tedarikçi ödeme planı takibi"** (`02-LUCA-ENVANTERI.md:56`) — teklifte vade alanının
  karşılığı.
- **"Fatura bilgilendirme: oluşturulan fatura cari firmanın e-postasına gönderilir."**
  (`02-LUCA-ENVANTERI.md:32`) ve **"BA-BS mutabakatı… karşı firmanın e-postasına bilgi postası
  gider."** (`:31`) — müşteriyle e-posta iletişiminin Luca'daki iki örneği.
- **"Özel değişken tanımlama esnekliği; istenilen sayıda ve formatta tanımlama/sorgulama."**
  (`02-LUCA-ENVANTERI.md:49`) — segment alanları.
- **"Ayrıntılı yetkilendirme ile iş planı yapabilme."** (`02-LUCA-ENVANTERI.md:51`) — görev atama ve
  yetki.

Kaynak URL: <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> ve
<https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>.

**doğrulanacak:** Luca'da ayrı bir "potansiyel müşteri / aday" kartı var mı, yoksa cari kartı
"aday" işaretiyle mi açılıyor — kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da
aktivite/görüşme kaydı ve hatırlatma (görev) modülü kapsamı — kaynak: Luca kılavuzu.
**doğrulanacak:** Luca'nın teklif durum adımları ve kaybetme nedeni listesi — kaynak: Luca demo.
**doğrulanacak:** Luca'nın e-posta entegrasyonu (giden e-posta sunucusu ayarı, gelen e-postanın
sisteme düşmesi) — kaynak: Luca teknik dokümanı. **doğrulanacak:** Luca'da telefon/santral (çağrı
kaydı) entegrasyonu — kaynak: Luca ürün sayfası/satıcı. **doğrulanacak:** Luca'da kampanya modülü
kapsamı ve İYS ilişkisi — kaynak: Luca ürün sayfası + avukat.

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **Müşteri kartı zemin hazır.** `server/YesLojistik.Core/Entities/Customer.cs:3-54`: ünvan (`:5`),
  VKN (`:6`), vergi dairesi (`:7`), telefon (`:8`), e-posta (`:9`), adres (`:10`), **notlar** (`:11`),
  şehir/ilçe (`:14-15`), **yetkili kişi** (`:16`), vade günü (`:22`), aktif/pasif (`:23`), devir
  bakiyesi (`:25`), **risk limiti** (`:28`), e-Fatura alanları (`:18-20`).
- **Müşterinin alt grubu/şantiyesi zaten var.** `Customer.cs:78-83` `CustomerGroup` (müşteri +
  ad); müşteri kartındaki gruplar `Customer.cs:47` (`Groups`). Sunucuda grup kaydetme
  `server/YesLojistik.Api/Controllers/CustomersController.cs:196-199`; sevkiyatta grup alanı ve
  süzgeci `server/YesLojistik.Core/Entities/Trip.cs:93`, `server/YesLojistik.Core/Dtos/TripDtos.cs:74`,
  `server/YesLojistik.Infrastructure/Services/TripService.cs:88` (grup süzgeci) ve `:537` (grup
  yazımı); sevkiyat Excel'inde "Grup" sütunu
  `server/YesLojistik.Api/Controllers/TripsController.cs:49`. **Dolayısıyla segment/grup bağlantısı
  için şema değişikliği gerekmez; CRM yalnız bu tabloyu kullanır.**
- **Müşteri kartı ekranı ve formu.** `client/src/components/CustomerForm.tsx` (16.381 bayt) ve
  `client/src/pages/CustomersPage.tsx:50` (cari bakiye sütunu); müşteri listesi Excel'i
  `CustomersController.cs:43-65`: yetkili (`:56`), e-posta (`:55`), telefon (`:54`), il/ilçe
  (`:57-58`), vade (`:60`), risk limiti (`:61`).
- **E-posta gönderme altyapısı hazır.** `server/YesLojistik.Core/Abstractions/IEmailSender.cs:7-11`
  (`SendAsync(EmailMessage)`); SMTP uygulaması `server/YesLojistik.Infrastructure/Services/SmtpEmailSender.cs:20-41`.
  Kullanım örnekleri: ekstre e-postası `server/YesLojistik.Infrastructure/Services/DocumentPdfs.cs:420-437`,
  fatura e-postası `server/YesLojistik.Infrastructure/Services/InvoiceMailer.cs:12-32`, sevkiyat
  durumu bildirimi `server/YesLojistik.Infrastructure/Services/CustomerNotifier.cs:54`, günlük özet
  `server/YesLojistik.Infrastructure/Services/DailyDigestService.cs:57`. Testlerde sahte gönderici
  vardır: `server/YesLojistik.Tests/Integration/FakeEmailSender.cs:11`.
- **WhatsApp "hazırla ve ben göndereyim" deseni var.** Müşteri kartındaki vade hatırlatmada WhatsApp
  bağlantısı üretilir: `client/src/pages/CustomerDetailPage.tsx:181` (`wa.me` adresi + kodlanmış
  mesaj), `:193-194` (bağlantı düğmesi), `:201` (açıklama: e-posta ekstre ekli gider, WhatsApp aynı
  mesajı hazırlar), `:202` (e-posta ayarlı değilse yalnız WhatsApp ve PDF). Sevkiyat tarafında aynı
  desen: `client/src/components/TripExtras.tsx:121` ("WhatsApp ile Gönder"). **Kural:** mesajı
  kullanıcı gönderir; sistem "gönderildi" diye yazmaz (`docs/TAM-GELISTIRME-PLANI.md:304`).
- **Hatırlatma/uyarı çatısı hazır.** `server/YesLojistik.Infrastructure/Services/AlertService.cs:10`
  servis; uyarı nesnesi `AlertDto(type, severity, title, msg, link, date)` (`:29`, `:41`, `:91`,
  `:118`, `:131`, `:140`); sonuç önem sırasına göre dizilir (`:143`). Uç:
  `server/YesLojistik.Api/Controllers/DashboardController.cs:12-13`; menü sayaçları
  `client/src/lib/nav.ts:12` (`alertsAt`). Örnek uyarılar: vadesi geçen alacak (`:91`), risk limiti
  aşımı (`:118`), tedarikçi borcu (`:131`), taşeron faturası gelmeyen sevkiyat (`:140`), belge bitişi
  (`:48`).
- **Telefon bildirimi türleri ve kişisel tercih var.**
  `server/YesLojistik.Core/Entities/NotificationPreference.cs:4-7` (`NotificationType`:
  `TripDelivered, TripStatusChanged, DriverPhotoUploaded, DriverExpenseAdded, InvoiceOverdue,
  PayableDue, DocumentExpiring`), `:19-26` rol bazlı varsayılanlar. CRM görev hatırlatması bu
  listeye **yeni bir tür** olarak eklenecektir.
- **Sevkiyat öncesi kayıt: iş talebi.** `server/YesLojistik.Core/Entities/JobRequest.cs:4-31`:
  müşteri (`:6-7`), tarih, adresler, yük cinsi/miktarı, araç cinsi, satış fiyatı (`:15`), taşeron
  fiyatı (`:16`), komisyon (`:17`), prim (`:18`), diğer masraf (`:19`), not (`:24`), durum (`:29`).
  Ekran `client/src/pages/JobRequestsPage.tsx`; rota `/is-talepleri` (`client/src/lib/nav.ts:25`).
  Yeni görünümde menüde yoktur, sekmelerden açılır (`docs/plan/01-ORTAK-SARTNAME.md:133`).
  **Not:** İş talebi "müşteri zaten var" varsayar; aday kaydı yoktur.
- **Rapor tarafında müşteri kârlılığı var.** `client/src/pages/ReportsPage.tsx:343-359` (ciro,
  maliyet, kâr, marj, açık alacak, tahsil süresi); sunucu ucu
  `server/YesLojistik.Api/Controllers/ReportsController.cs:212-227`. Bu, CRM'in "kazanılan müşteri
  performansı" tarafıdır; huni tarafı yoktur.
- **Yetki altyapısı.** `server/YesLojistik.Api/Auth/Policies.cs:5-17`: `Operations`, `Accounting`,
  `Admin`; operasyon yazma yetkisi `OperationsRoles` (`:16`).

**Olmayanlar (kanıtlı).**

- **Aday/potansiyel müşteri kavramı yok.** `server/YesLojistik.Infrastructure/Data/AppDbContext.cs:10-43`
  DbSet listesinde `Lead`, `Prospect`, `Opportunity` benzeri tablo **yoktur**. `Customer.cs` içinde
  "aday" işareti (`IsProspect`/`Status`) alanı yoktur.
- **Aktivite/görüşme kaydı yok.** Kodda görüşme, telefon kaydı, ziyaret, toplantı tutan bir tablo
  yoktur; `Customer.Notes` (`Customer.cs:11`) tek serbest metindir, tarihsiz ve izsizdir.
- **Teklif takibi yok.** `docs/plan-erp/02-LUCA-ENVANTERI.md:92` açıkça "CRM" maddesini **olmayan**
  modüller arasında sayar; `13-SIPARIS-TEKLIF.md` teklif belgesini planlar ama **durum takibi ve
  kaybetme nedeni** bu dokümanın işidir ve henüz koda geçmemiştir.
- **Kaybetme nedeni listesi yok.** Kodda kayıp/kazanç nedeni taşıyan alan yoktur.
- **Görev/hatırlatma nesnesi yok.** `AlertService` (`AlertService.cs:10-143`) **hesaplanan**
  uyarılar üretir; kullanıcının elle açtığı, atadığı ve kapattığı bir **görev** kaydı yoktur.
  `NotificationPreference` yalnız mevcut 7 türü bilir (`NotificationPreference.cs:5-7`).
- **Gelen e-posta işleme yok.** `IEmailSender` yalnız **gönderir** (`IEmailSender.cs:7-11`); gelen
  e-postayı okuyup müşteriye bağlayan (IMAP/Graph) bir bileşen yoktur.
- **Telefon/santral entegrasyonu yok.** Kodda çağrı kaydı, numara eşleştirme, tıkla-ara (CTI)
  bileşeni geçmez. WhatsApp yalnız `wa.me` bağlantısıdır (kullanıcı gönderir,
  `CustomerDetailPage.tsx:181-194`).
- **Satış hunisi ve dönüşüm oranı raporu yok.** `23-RAPORLAMA-BI.md` §4.2 envanterinde huni raporu
  yoktur; müşteri kârlılığı (`ReportsPage.tsx:343-359`) yalnız mevcut müşteriyi ölçer.
- **Segment kavramı yok.** `CustomerGroup` **elle atanan** alt birimdir (`Customer.cs:78-83`);
  ölçüt bazlı segment (ör. "son 90 günde sevkiyatı olmayan, cirosu 1 milyon üstü") hesaplayan bir yapı
  yoktur.
- **Kampanya alanı yok.** Kodda kampanya tablosu/alanı geçmez.
- **CRM denetim izi yok.** `AuditLog` altyapısı vardır
  (`server/YesLojistik.Core/Entities/AuditLog.cs:4`) ama CRM olayları yazılmaz (olay yok).

**Eksik listesi:** aday kartı ve dönüşümü, aktivite kaydı, teklif durum takibi, kaybetme nedeni,
görev/hatırlatma, huni ve dönüşüm raporu, segment tanımı, kampanya etiketi, CRM e-posta geçmişi
(giden), gelen e-posta ve santral entegrasyonu (doğrulanacak), CRM yetki matrisi, CRM denetim izi.

## 4. Hedef ekranlar ve alanlar

### 4.1 Ekranlar

- `/crm/adaylar` — **Adaylar** listesi: ünvan, yetkili, telefon, il, kaynak, sektör, sahip, son
  aktivite, sonraki adım, durum rozeti (Yeni / Görüşülüyor / Teklif verildi / Kazanıldı /
  Kaybedildi / Vazgeçildi). Süzgeçler: durum, kaynak, sahip, il, sektör, tarih aralığı, "bu hafta
  aranacaklar".
- `/crm/adaylar/:id` — **Aday kartı**: üstte özet (yetkili, telefon, e-posta, il, sektör, filo
  büyüklüğü), sekmeler: **Aktiviteler**, **Teklifler**, **Görevler**, **Notlar**, **Bilgiler**.
  Üstte "Müşteriye dönüştür" düğmesi.
- `/crm/aktivite` — **Bugünün Planı** (telefon/toplantı listesi): bugün ve gecikmiş görevler,
  atanan kişi, hızlı "Görüşme kaydet" ve "Görev ekle".
- `/crm/huni` — **Satış Hunisi**: aşama bazlı adet ve tutar, aşamalar arası dönüşüm oranı, ortalama
  kazanma süresi, kaybetme nedeni dağılımı, kaynak bazlı dönüşüm, dönem karşılaştırması.
- `/crm/segmentler` — **Segmentler**: kayıtlı segment tanımları (ölçüt listesi), üye sayısı ve
  cirosu; "Listeyi aç" düğmesi müşteri/aday listesini süzülmüş açar.
- `/crm/kampanyalar` — **Kampanyalar**: ad, dönem, hedef segment, beklenen adet/tutar, gerçekleşen
  adet/tutar, durum (Planlandı / Sürüyor / Bitti). **Toplu mesaj gönderme düğmesi yoktur** (§1
  kapsam sınırı).
- **Müşteri kartına yeni sekme:** `client/src/pages/CustomerDetailPage.tsx` içine **"İlişki"**
  sekmesi (aktivite + teklif + görev geçmişi). Mevcut sekmeler korunur.

### 4.2 Alanlar

| Alan | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Ünvan | metin (200) | evet | Aynı ünvan uyarı verir, engellemez | "Bu ünvanda bir aday kaydı var." |
| Yetkili kişi | metin (120) | hayır | Müşteri kartındaki `ContactName` ile aynı alan | — |
| Telefon | metin (30) | hayır | `wa.me` bağlantısı için normalleştirilir | "Telefon numarası geçersiz." |
| E-posta | metin (200) | hayır | Biçim denetimi; e-posta gönderme düğmesini açar | "Geçerli bir e-posta yazın." |
| İl / ilçe | seçim / metin | hayır | Mevcut il listesi | — |
| Kaynak | seçim: Tavsiye / Web / Fuar / Eski müşteri / Soğuk arama / Diğer | evet | Huni raporunda kırılım | — |
| Sektör | seçim + serbest | hayır | Öneri listesi | — |
| Filo büyüklüğü | tam sayı | hayır | Segment ölçütü olabilir | "Sayı girin." |
| Sahip kullanıcı | seçim (kullanıcı) | evet | Varsayılan: kaydı açan | — |
| Durum | seçim | evet | Aşama geçişleri §5.3'te | "Bu aşamaya geçilemez." |
| Aktivite türü | seçim: Telefon / Ziyaret / E-posta / WhatsApp / Toplantı / Not | evet | Tür `Telefon` ise süre alanı açılır | — |
| Aktivite tarihi/saati | tarih + saat | evet | Varsayılan: şimdi | "Tarih gelecekte olamaz." |
| Görüşülen kişi | metin (120) | hayır | — | — |
| Özet | metin (1000) | evet | Ekranda ilk 120 karakter | "Görüşme özetini yazın." |
| Sonuç | seçim: Olumlu / Kararsız / Olumsuz / Ulaşılamadı | evet | Olumsuz ise neden alanı önerilir | — |
| Sonraki adım | metin + tarih | hayır | Tarih verilirse görev önerilir | — |
| Teklif no | metin (otomatik) | — | `TKF-2026/000123` (bkz. `13-SIPARIS-TEKLIF.md`) | — |
| Teklif tutarı | tutar (2 kuruş) | evet | Huni tutarının kaynağı | "Tutar 0'dan büyük olmalı." |
| Teklif durumu | seçim: Hazırlandı / Gönderildi / Kazanıldı / Kaybedildi / İptal | evet | Geçişler §5.3 | — |
| Geçerlilik tarihi | tarih | evet | Süresi geçen teklif "Süresi doldu" olur | — |
| Kaybetme nedeni | seçim: Fiyat / Süre / Araç yok / Vade / İlişki / Başka firma / Kapsam dışı / Diğer | koşullu | "Kaybedildi" seçilince **zorunlu** | "Kaybetme nedenini seçin." |
| Kaybetme notu | metin (400) | hayır | — | — |
| Rakip firma | metin (150) | hayır | Huni raporunda kırılım | — |
| Görev başlığı | metin (150) | evet | — | "Görev başlığı gerekli." |
| Görev tarihi | tarih | evet | Gecikince `AlertService` uyarısı | — |
| Öncelik | seçim: Düşük / Normal / Yüksek | evet | Varsayılan Normal | — |
| Atanan | seçim (kullanıcı) | evet | Varsayılan: kaydı açan | — |
| Görev durumu | seçim: Açık / Tamamlandı / İptal | evet | Tamamlanınca kim/ne zaman yazılır | — |
| Segment adı | metin (80) | evet | Benzersiz | "Bu adda bir segment var." |
| Segment ölçütü | kural listesi | evet (≥1) | Alan · işleç · değer; beyaz liste (§5.6) | "Ölçüt değeri geçersiz." |
| Kampanya adı | metin (120) | evet | — | — |
| Kampanya dönemi | tarih aralığı | evet | Bitiş ≥ başlangıç | "Bitiş tarihi başlangıçtan önce olamaz." |
| Hedef segment | seçim | evet | Segment referansı | — |
| Beklenen adet / tutar | sayı / tutar | hayır | Gerçekleşen ile karşılaştırılır | — |

### 4.3 Yerleşim şeması (aday kartı, masaüstü)

```
┌──────────────────────────────────────────────────────────────────┐
│ ABC Nakliyat (aday)                    [⋯ Diğer] [Müşteriye Dönüştür] │
│ Yetkili: Ayşe Y. · 0212 000 00 00 · info@example.com · Gebze/Kocaeli │
│ Durum: Görüşülüyor        Sahip: Mehmet K.     Son aktivite: 03.10.2026 │
│ [Aktiviteler] Teklifler  Görevler  Notlar  Bilgiler              │
│ ┌ Aktiviteler ───────────────────────────────────────────────────┐│
│ │ Tarih      Tür      Özet                    Sonuç     Kim     ││
│ │ 03.10.2026 Telefon  Fiyat sordu, teklif...  Olumlu    MK      ││
│ └────────────────────────────────────────────────────────────────┘│
│ [Görüşme Kaydet] [Teklif Ekle] [Görev Ekle]                       │
└──────────────────────────────────────────────────────────────────┘
```

## 5. İş kuralları

1. **Aday ve müşteri ayrımı.** Aday (`Lead`) ile müşteri (`Customer`) **ayrı tablolardır**; aday
   müşteri tablosuna karışmaz (cari bakiye, fatura, sevkiyat aday kaydına bağlanamaz). Dönüşüm
   sırasında adaydan `Customer` üretilir ve aday `ConvertedCustomerId` ile ona bağlanır. Böylece cari
   listesi ve mali raporlar kirlenmez.
2. **Dönüşüm kuralları.** Dönüşüm yalnız `Yeni`, `Görüşülüyor` veya `Teklif verildi` durumundaki
   adayda yapılır. Aynı VKN ile müşteri varsa **yeni kayıt açılmaz**, mevcut müşteriye bağlanır ve
   kullanıcıya sorulur. Dönüşümde ünvan/VKN/vergi dairesi/adres/telefon/e-posta/yetkili taşınır;
   aktivite, teklif ve görev geçmişi müşteriye görünür (aday kaydı silinmez, arşivlenir).
3. **Durum geçişleri (aday).** `Yeni → Görüşülüyor → Teklif verildi → Kazanıldı` ileri akıştır;
   `Kaybedildi` ve `Vazgeçildi` her aşamadan yapılabilir. Geri adım yalnız `Teklif verildi →
   Görüşülüyor` olur ve **neden** ister. `Kazanıldı` durumu dönüşüm yapılmadan seçilebilir ama
   kullanıcıya "müşteriye dönüştür" önerisi çıkar.
4. **Teklif durumu ile aday durumu ilişkisi.** Teklif `Gönderildi` olunca aday en az `Teklif verildi`
   olur; teklif `Kazanıldı` olunca aday `Kazanıldı` olur; teklif `Kaybedildi` olunca aday `Kaybedildi`
   olur ve **kaybetme nedeni tekliften adaya kopyalanır**. Otomatik geçiş denetim iznine yazılır.
5. **Para ve tarih biçimi.** Bütün tutarlar 2 kuruş (`tl2`); tarih `03.10.2026`; telefon `wa.me`
   bağlantısı için `90` önekli ve boşluksuz normalleştirilir (mevcut desen:
   `client/src/pages/CustomerDetailPage.tsx:181`).
6. **Segment ölçütü güvenliği.** Segment kuralı da beyaz listedir: alan (ör. `city`, `sector`,
   `ownerUserId`, `lastActivityDays`, `revenueLast12m`, `tripCountLast90d`), işleç
   (`= != > >= < <= contains in range`), değer. **Serbest SQL yazılamaz**; kural motoru
   `24-RAPOR-TASARIMCISI.md` §5.2'deki aynı yorumlayıcı yaklaşımı kullanır. Bilinmeyen alan →
   `400`. Segment üyeleri **çalıştırma anında** hesaplanır (saklanan liste değil), böylece veri
   eskimez; üye sayısı önbelleğe alınır (en fazla 5 dakika).
7. **Görev ve hatırlatma kuralları.** Görev tarihi geçti ve durum `Açık` ise `AlertService` uyarısı
   üretilir (`AlertService.cs:29` deseni) ve `NotificationPreference`'a eklenecek **CRM görevi**
   türüne göre telefon bildirimi gider. Aynı görev için **ikinci uyarı üretilmez** (idempotent
   hatırlatma; `docs/TAM-GELISTIRME-PLANI.md:307` kuralı: tekrar eden durum isteği ikinci kayıt
   üretmemeli). Görev "Tamamlandı" olduğunda kim ve ne zaman bilgisi yazılır.
8. **E-posta kuralları.** Gönderim mevcut `IEmailSender` ile yapılır (`IEmailSender.cs:7-11`);
   CRM'den gönderilen her e-posta **aktivite** olarak kaydedilir (tür: E-posta, özet: konu).
   Gönderim başarısız olursa aktivite `Gönderilemedi` işaretiyle kaydedilir ve kullanıcı uyarılır.
   Toplu gönderim **yapılmaz**. Ticari elektronik ileti izni/İYS gerekliliği **avukat onayına
   bağlıdır** (`docs/hukuk/README.md:63`); modül izin durumunu **alan olarak** tutar
   (`ContactPermission`: Bilinmiyor / Var / Yok) ve "Yok" ise gönderim düğmesi uyarı verir.
9. **WhatsApp kuralı.** WhatsApp yalnız **mesajı hazırlar ve bağlantıyı açar**; sistem gönderildi
   bilgisini **doğrulayamaz**. Bu yüzden WhatsApp aktivitesi kullanıcı "Kaydettim" dediğinde
   kaydedilir ve kayıtta "elle doğrulandı" işareti bulunur
   (`docs/TAM-GELISTIRME-PLANI.md:304-307`).
10. **Telefon kuralı.** Tıkla-ara (CTI) ve çağrı kaydı **bu sürümde yoktur** (§12). Bugün yalnız
    numara görünür ve tıklanınca cihazın arama uygulaması açılır (`tel:` bağlantısı); görüşme
    sonrası kayıt **elle** girilir.
11. **Kampanya kuralları.** Kampanya yalnız etiket ve hedef kitle tutar; üye listesi dinamik olarak
    segmentten gelir. Kampanya kapatıldığında gerçekleşen adet/tutar, dönem içinde kazanılan
    aday/tekliflerden hesaplanır. Toplu mesaj yoktur.
12. **Silme ve arşivleme.** Aday, aktivite, teklif ve görev kayıtları **soft delete** (`IsDeleted`)
    ile silinir (`01-ORTAK-SARTNAME.md:22`); finansal/mali bağ yoktur, bu yüzden fiziksel silme de
    veri kaybı sayılmaz ama yine de yapılmaz. Dönüştürülmüş aday silinemez, yalnız arşivlenir.
13. **Yuvarlama ve toplamlar.** Huni tutarları teklif tutarlarından toplanır ve 2 kuruşa yuvarlanır
    (`23-RAPORLAMA-BI.md` §5.2 ile aynı kural). Dönüşüm oranı yüzde olarak **bir ondalık** gösterilir;
    payda 0 ise "—".
14. **Ayna ve lisans.** Ayna modunda CRM yazma düğmeleri `write` işaretlidir ve gizlenir; lisans
    süresi dolduğunda CRM salt okunur olur (liste ve kart açılır, kaydet çalışmaz)
    (`01-ORTAK-SARTNAME.md:16-18`).

## 6. Veri modeli

**Yalnız ekleme.** Yeni tablolar:

- `Lead` — aday. `Id`, `Title`, `ContactName`, `Phone`, `Email`, `City`, `District`, `Address`,
  `TaxNumber` (varsa), `Source` (`LeadSource` enum), `Sector`, `FleetSize`, `OwnerUserId`,
  `Status` (`LeadStatus` enum), `LostReason` (`LeadLostReason?` enum), `LostNote`, `Competitor`,
  `ContactPermission` (`PermissionStatus` enum: Unknown/Granted/Denied), `LastActivityAt`,
  `NextStepAt`, `NextStepNote`, `ConvertedCustomerId` (`int?`), `ConvertedAt`, `IsArchived`.
- `LeadActivity` — aktivite. `Id`, `LeadId` (`int?`), `CustomerId` (`int?`) — **ikisinden biri dolu**;
  aktivite adaydan müşteriye taşındığında `CustomerId` dolar, `LeadId` korunur. `Kind`
  (`ActivityKind`: Phone/Visit/Email/WhatsApp/Meeting/Note), `At` (tarih+saat), `DurationMinutes`,
  `ContactPerson`, `Summary`, `Outcome` (`ActivityOutcome`), `NextStepAt`, `NextStepNote`,
  `UserId` (kaydı giren), `EmailMessageId` (`string?`, giden e-posta bağı), `EmailDelivery`
  (`EmailDeliveryState?`: Sent/Failed), `ManuallyConfirmed` (WhatsApp/telefon elle doğrulama).
- `LeadQuote` — CRM teklif takibi. `Id`, `LeadId` (`int?`), `CustomerId` (`int?`), `QuoteNo`,
  `Amount`, `Currency` (varsayılan TL), `Status` (`QuoteStatus`: Prepared/Sent/Won/Lost/Cancelled),
  `PreparedAt`, `SentAt`, `ValidUntil`, `WonAt`, `LostAt`, `LostReason` (`LeadLostReason?`),
  `LostNote`, `Competitor`, `SalesOrderId` (`int?`, `13-SIPARIS-TEKLIF.md` siparişine bağ) ,
  `SourceTripId` (`int?`), `UserId`.
- `CrmTask` — görev/hatırlatma. `Id`, `LeadId` (`int?`), `CustomerId` (`int?`), `Title`, `DueDate`,
  `DueTime` (`TimeOnly?`), `Priority` (`CrmTaskPriority`: Low/Normal/High), `Status`
  (`CrmTaskStatus`: Open/Done/Cancelled), `AssignedUserId`, `CompletedAt`, `CompletedByUserId`,
  `RelatedQuoteId` (`int?`), `Note`.
- `CrmSegment` — segment. `Id`, `Name`, `OwnerUserId`, `IsShared`, `CriteriaJson` (beyaz listeli
  ölçüt listesi), `IsActive`, `LastCountedAt`, `LastCount`.
- `CrmCampaign` — kampanya. `Id`, `Name`, `SegmentId`, `From`, `To`, `Status`
  (`CampaignStatus`: Planned/Running/Finished), `ExpectedCount`, `ExpectedAmount`, `Note`,
  `OwnerUserId`.
- `CrmContactLog` — iletişim izni geçmişi (İYS/hukuk için). `Id`, `LeadId` (`int?`),
  `CustomerId` (`int?`), `Channel` (Email/Phone/WhatsApp), `Permission` (`PermissionStatus`),
  `ChangedAt`, `ChangedByUserId`, `Note`. **Onay/ret kaydı silinmez.**

**Mevcut tablolara eklenen alanlar (hepsi boş olabilir):**

- `Customer` → `LeadId` (`int?`, adaydan dönüşen müşteri için iz), `ContactPermission`
  (`PermissionStatus`, varsayılan `Unknown`), `OwnerUserId` (`int?`).
- `NotificationPreference` → `NotificationType` listesine **`CrmTaskDue`** ve **`QuoteExpiring`**
  eklenir (`NotificationPreference.cs:5-7`); varsayılanlar `:19-26` içinde Operasyon ve Muhasebe
  için tanımlanır.
- `CustomerGroup` **değişmez** (`Customer.cs:78-83`); CRM segmenti ayrı tablodur ve raporda
  `CustomerGroup` ile **birlikte** gösterilir (grup = elle atanan alt birim, segment = ölçüt).

İlişkiler: `Lead` → `LeadActivity`, `LeadQuote`, `CrmTask` (1-N); `Lead.ConvertedCustomerId` →
`Customer.Id`; `LeadQuote.SalesOrderId` → `13-SIPARIS-TEKLIF.md` `SalesOrder.Id` (tablo gelince
bağlanır; o zamana kadar boş kalır); `CrmCampaign.SegmentId` → `CrmSegment.Id`;
`LeadActivity.EmailMessageId` yalnız gönderim günlüğü referansıdır (metin, yabancı anahtar değil).

İndeksler: `Lead(Status, OwnerUserId)`, `Lead(NextStepAt)`, `Lead(Title)`, `Lead(TaxNumber)`,
`LeadActivity(LeadId, At)`, `LeadActivity(CustomerId, At)`, `LeadQuote(Status, ValidUntil)`,
`CrmTask(AssignedUserId, Status, DueDate)`, `CrmSegment(OwnerUserId, Name)` benzersiz,
`CrmCampaign(SegmentId, From)`.

## 7. API uçları

| Metot | Yol | İstek | Yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/crm/leads` | `LeadQuery` (durum, kaynak, sahip, il, sektör, tarih, arama, sayfa, sıralama) | `PagedResult<LeadDto>` | operations + accounting (okuma) |
| GET | `/api/crm/leads/{id}` | — | `LeadDetailDto` (özet + son aktiviteler + teklifler + görevler) | operations |
| POST | `/api/crm/leads` | `LeadSaveRequest` | `LeadDto` | operations |
| PUT | `/api/crm/leads/{id}` | `LeadSaveRequest` | `LeadDto` | operations |
| DELETE | `/api/crm/leads/{id}` | — | `204` (soft) | operations |
| POST | `/api/crm/leads/{id}/convert` | `{ customerId?, createIfMissing }` | `{ customerId }` | operations |
| POST | `/api/crm/leads/{id}/status` | `{ status, note }` | `LeadDto` | operations |
| GET | `/api/crm/leads/{id}/activities` | `page,pageSize` | `PagedResult<ActivityDto>` | operations |
| POST | `/api/crm/activities` | `ActivitySaveRequest` | `ActivityDto` | operations |
| PUT | `/api/crm/activities/{id}` | `ActivitySaveRequest` | `ActivityDto` | operations (kaydı giren ya da admin) |
| DELETE | `/api/crm/activities/{id}` | — | `204` | operations (kaydı giren ya da admin) |
| GET | `/api/crm/quotes` | `LeadQuery` + durum | `PagedResult<QuoteDto>` | operations + accounting |
| POST | `/api/crm/quotes` | `QuoteSaveRequest` | `QuoteDto` | operations |
| PUT | `/api/crm/quotes/{id}` | `QuoteSaveRequest` | `QuoteDto` | operations |
| POST | `/api/crm/quotes/{id}/status` | `{ status, lostReason?, lostNote?, competitor? }` | `QuoteDto` | operations |
| POST | `/api/crm/quotes/{id}/email` | `{ to?, message? }` | `{ sentTo }` | operations |
| GET | `/api/crm/tasks` | `assignedUserId, status, from, to, priority` | `PagedResult<TaskDto>` | operations |
| POST | `/api/crm/tasks` | `TaskSaveRequest` | `TaskDto` | operations |
| PUT | `/api/crm/tasks/{id}` | `TaskSaveRequest` | `TaskDto` | operations |
| POST | `/api/crm/tasks/{id}/complete` | `{ note? }` | `TaskDto` | operations |
| GET | `/api/crm/dashboard` | `from,to` | `CrmDashboardDto` (aşama adedi/tutarı, dönüşüm oranları, ort. kazanma süresi, kaynak ve kayıp kırılımı) | operations + accounting |
| GET | `/api/crm/segments` | `page,pageSize,search` | `PagedResult<SegmentDto>` (üye sayısı dahil) | operations + accounting |
| POST/PUT/DELETE | `/api/crm/segments[/{id}]` | `SegmentSaveRequest` | `SegmentDto` | operations |
| GET | `/api/crm/segments/{id}/members` | `page,pageSize` | `PagedResult<LeadOrCustomerRowDto>` | operations + accounting |
| GET | `/api/crm/campaigns` | `page,pageSize,status` | `PagedResult<CampaignDto>` | operations + accounting |
| POST/PUT/DELETE | `/api/crm/campaigns[/{id}]` | `CampaignSaveRequest` | `CampaignDto` | operations |
| GET | `/api/crm/contact-log` | `leadId? , customerId?` | `ContactLogDto[]` | operations + admin |
| GET | `/api/crm/export` | `LeadQuery` + `entity=leads\|quotes\|tasks\|funnel` + `format=xlsx\|pdf` | dosya | operations (leads/tasks), accounting (quotes/funnel) |

Ortak zarf `PagedResult<T>` (`server/YesLojistik.Core/Dtos/Common.cs:3`); süzgeç/sıralama mevcut
`QueryExtensions.ApplySort`/`PageAsync` ile yapılır (`QueryExtensions.cs:13-31`).

## 8. Yetki, onay ve denetim izi

| İşlem | Admin | Operations | Accounting | Driver |
|---|---|---|---|---|
| Aday listesi/kartı okuma | ✓ | ✓ | ✓ (okuma) | — |
| Aday oluştur/düzenle/sil | ✓ | ✓ | — | — |
| Müşteriye dönüştür | ✓ | ✓ | — | — |
| Aktivite ekle/düzenle | ✓ | ✓ (kendi kaydı) | — | — |
| Teklif oluştur/durum değiştir | ✓ | ✓ | ✓ (okuma) | — |
| Teklif e-postası gönderme | ✓ | ✓ | — | — |
| Görev oluştur/ata/tamamla | ✓ | ✓ | ✓ (kendi görevi) | — |
| Huni ve dönüşüm raporu | ✓ | ✓ | ✓ | — |
| Segment tanımla | ✓ | ✓ | — | — |
| Kampanya tanımla/kapat | ✓ | ✓ | — | — |
| İletişim izni (İYS) kaydı | ✓ | ✓ | — | — |
| Tüm CRM denetim kayıtları | ✓ | — | — | — |

- **Onay (maker-checker).** CRM'de onay gereken tek iş: **iletişim izni "Var"** işaretlemesi.
  İzni yalnız operasyon işaretler, admin onaylar; onaysız izinle e-posta gönderilemez
  (`docs/hukuk/README.md:63` avukat onayına bağlı). Aday → müşteri dönüşümü onay gerektirmez ama
  `AuditLog`'a yazılır.
- **Denetim izi.** Şu olaylar `AuditLog`'a yazılır: aday oluşturma/düzenleme/silme/arşivleme,
  durum değişikliği (eski → yeni), dönüşüm (hangi müşteriye bağlandı), teklif durum değişikliği ve
  kaybetme nedeni, görev tamamlama, segment tanımı değişikliği, kampanya kapatma, iletişim izni
  değişikliği, e-posta gönderimi (alıcı + sonuç). Desen:
  `server/YesLojistik.Core/Entities/AuditLog.cs:4`.
- **Satır düzeyi güvenlik.** Bugün tek şirket vardır; çok şirketli yapıda tüm CRM sorguları zorunlu
  `CompanyId` süzgeci alır (`30-COK-SIRKETLI-KONSOLIDASYON.md`). Şoför rolü CRM'e erişemez
  (`Policies.cs:15` `StaffRoles` yalnız ofis rolleri).
- **Ayna ve lisans.** Ayna modunda CRM yazma düğmeleri gizlenir; lisans süresi dolduğunda CRM salt
  okunur olur (liste ve kart açılır).
- **Kişisel veri.** Aday kartında yetkili kişi adı ve iletişim bilgisi kişisel veridir; saklama ve
  imha akışı `35-DENETIM-IZI-KVKK-UYUM.md` kapsamındadır. Kaybetme notu ve görüşme özeti
  **kişisel değerlendirme** içerebilir; bu alanlar dışa aktarımda maskelenmez ama erişim yalnız
  operasyon ve admin'dir.

## 9. Kabul kriterleri

1. Aday kaydı **1 ekranda, ≤ 8 zorunlu alanla** açılır; kaydetme ≤ 2 tık.
2. Görüşme kaydı aday kartından **≤ 3 tık** ile girilir (Görüşme Kaydet → form → Kaydet).
3. Teklif durumu değiştirildiğinde aday durumu §5.4 kurallarına göre **otomatik** güncellenir ve
   `AuditLog`'a yazılır.
4. "Kaybedildi" seçilmeden kaydetme **engellenir** (kaybetme nedeni zorunlu).
5. Aday → müşteri dönüşümünde aynı VKN'li müşteri varsa **yeni kayıt açılmaz**; kullanıcıya seçim
   sunulur ve dönüşüm kaydı `AuditLog`'a yazılır.
6. Huni raporu aşama bazlı adet ve tutar verir; aşamalar arası dönüşüm oranı toplamı %100'dür
   (yuvarlama farkı en fazla 0,1 puan).
7. Ortalama kazanma süresi, `Kazanıldı` tarihi ile ilk aktivite tarihi arasındaki günlerin
   ortalamasıdır; kazanılan kayıt yoksa "—" gösterilir.
8. Gecikmiş görevler ana sayfa uyarılarında görünür ve aynı görev için **tek** uyarı üretilir
   (10 dakika arayla iki istek → 1 uyarı).
9. Segment üye listesi çalıştırma anında hesaplanır: yeni bir müşteri ölçütü sağladığında **ek
   işlem yapılmadan** listede görünür (segment elle yenilenmez).
10. Segment ölçütünde bilinmeyen alan ya da `sql` benzeri anahtar `400` döner; serbest SQL
    çalışmaz (otomatik test: 15 kötü ölçütün 15'i reddedilir).
11. İletişim izni "Yok" olan kişiye e-posta gönderme düğmesi uyarı verir ve gönderim engellenir.
12. WhatsApp aktivitesi yalnız kullanıcı onayıyla kaydedilir; sistem kendiliğinden "gönderildi"
    yazmaz.
13. 1440×900'de aday listesinde **≥12 satır** görünür; 390×844'te yatay kaydırma yok, kart görünümü
    çalışır.
14. Yeni testler yeşildir: `CrmLeadTests`, `CrmQuoteTests`, `CrmTaskTests`, `CrmSegmentTests`,
    `client/e2e/crm.spec.ts`. Mevcut test silinmez/atlanmaz.

## 10. Testler

**Sunucu (birim).**
`server/YesLojistik.Tests/Unit/CrmStageRulesTests.cs` (yeni): aday ve teklif durum geçişleri; teklif
→ aday otomatik geçişi; geri adımda neden zorunluluğu; `Kaybedildi` için neden zorunluluğu.
`server/YesLojistik.Tests/Unit/CrmConversionTests.cs` (yeni): aynı VKN'li müşteriye bağlanma; alan
taşıma listesi; dönüştürülmüş adayın silinememesi.
`server/YesLojistik.Tests/Unit/CrmSegmentCriteriaTests.cs` (yeni): beyaz liste alanları; bilinmeyen
alan ve `sql`/`raw` reddi; `contains`/`range` davranışı; boş ölçüt reddi.
`server/YesLojistik.Tests/Unit/CrmFunnelTests.cs` (yeni): dönüşüm oranı hesabı; payda 0; ortalama
kazanma süresi; 2 kuruş yuvarlama.

**Sunucu (entegrasyon).**
`server/YesLojistik.Tests/Integration/CrmLeadTests.cs` (yeni): aday CRUD, listeleme süzgeçleri,
sayfalama zarfı (`PagedResult`), yetki (accounting yazamaz), dönüşüm, denetim kaydı.
`server/YesLojistik.Tests/Integration/CrmActivityTests.cs` (yeni): aktivite kaydı, adaydan müşteriye
taşınma, e-posta aktivitesinin gönderim sonucuyla yazılması (sahte gönderici:
`server/YesLojistik.Tests/Integration/FakeEmailSender.cs:11`), WhatsApp'ın yalnız elle doğrulanması.
`server/YesLojistik.Tests/Integration/CrmQuoteTests.cs` (yeni): teklif durum akışı, kaybetme nedeni
zorunluluğu, geçerlilik süresi geçen teklifin "Süresi doldu" olması, e-posta gönderimi ve
`QuoteExpiring` uyarısı.
`server/YesLojistik.Tests/Integration/CrmTaskTests.cs` (yeni): görev CRUD, gecikme uyarısı, aynı
görev için tek uyarı (idempotent), tamamlayan kullanıcının yazılması.
`server/YesLojistik.Tests/Integration/CrmSegmentTests.cs` (yeni): ölçüt motoru, üye listesi,
önbellek süresi, paylaşılan segment yetkisi.
`server/YesLojistik.Tests/Integration/CrmPermissionTests.cs` (yeni): iletişim izni "Yok" iken
gönderimin engellenmesi; izin kaydının silinememesi.

**Panel (e2e, Playwright).**
`client/e2e/crm.spec.ts` (yeni): aday açılır, görüşme kaydedilir, teklif eklenir ve "Kaybedildi"
nedeniyle kapatılır; aday müşteriye dönüştürülür ve müşteri listesinde görünür; huni sayfası
dönüşüm oranını gösterir; görev eklenir ve tamamlanır.
`client/e2e/crm-mobile.spec.ts` (yeni): 390×844'te aday kartı sekmeleri, "Bugünün Planı" ve hızlı
görüşme kaydı çalışır; yatay kaydırma yok.
Yeni görünüm testleri `useNewUi(page)` ile yazılır (`client/e2e/helpers.ts:44-46`). Mevcut
`client/e2e/cari.spec.ts` ve `client/e2e/quick-add.spec.ts` korunur.

**Veri.** Testler uydurma veri kullanır (`01-ORTAK-SARTNAME.md` §1.3). Örnek: `ABC Nakliyat`,
`Ayşe Y.`, `0212 000 00 00`, `17.000,00 TL`.

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün | Not |
|---|---|---|
| `Lead` tablosu + servis + uçlar | 5-6 | CRUD, süzgeç, sayfalama |
| Aday listesi ve aday kartı ekranları | 6-8 | Sekmeler + form |
| Aktivite kaydı (tablo + ekran + zaman çizelgesi) | 5-6 | Tür bazlı alanlar |
| Teklif takibi + durum motoru + kaybetme nedeni | 5-6 | `13-SIPARIS-TEKLIF.md` ile bağ |
| Görev/hatırlatma + `AlertService` + bildirim türü | 4-5 | Idempotent uyarı |
| Huni ve dönüşüm raporu ekranı | 4-5 | `23-RAPORLAMA-BI.md` zarfını kullanır |
| Segment tanımı + beyaz listeli ölçüt motoru | 5-6 | `24-RAPOR-TASARIMCISI.md` yorumlayıcısı |
| Kampanya (etiket + hedef kitle + gerçekleşen) | 3-4 | Toplu mesaj yok |
| E-posta entegrasyonu (giden + aktivite bağı) | 3-4 | Mevcut `IEmailSender` |
| İletişim izni (İYS) alanı ve onay akışı | 2-3 | Avukat onayına bağlı |
| Denetim izi + testler + e2e | 8-10 | — |
| **Toplam** | **50-63** | Gelen e-posta/santral entegrasyonu **hariç** |

**Bağımlılık sırası:** (1) `05-VERI-MODELI.md` (ortak alanlar, çok şirketli zemin),
(2) `13-SIPARIS-TEKLIF.md` (teklif ve sipariş bağı; CRM teklifi oraya bağlanır),
(3) `23-RAPORLAMA-BI.md` (huni raporu zarfı, dışa aktarma), (4) `24-RAPOR-TASARIMCISI.md`
(segment ölçüt motoru ortak), (5) `33-BILDIRIM-EPOSTA-SMS-KEP.md` (gönderim günlüğü ve şablon),
(6) `35-DENETIM-IZI-KVKK-UYUM.md` (kişisel veri saklama). **Gelen e-posta ve santral entegrasyonu
bilgi beklediği için kapsam dışıdır** (§12).

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Aday kayıtları müşteri tablosuna karışır, cari/mali raporlar kirlenir | Ayrı `Lead` tablosu; dönüşüm dışında bağ yok | CRM modülü kapatılır, adaylar arşivde kalır |
| Ticari elektronik ileti izni olmadan e-posta gönderilir | `ContactPermission` alanı + onay akışı + uyarı | Toplu/grup gönderimi hiç açılmaz |
| WhatsApp "gönderildi" sanılır | Elle doğrulama işareti; sistem gönderim iddia etmez | WhatsApp alanı gizlenir |
| Segment ölçütünden SQL sızması | Beyaz listeli ölçüt motoru; 15 kötü ölçüt testi | Segment ölçütü kapatılır |
| Görev hatırlatması tekrar eder, kullanıcıyı yorar | Idempotent uyarı; görev başına tek bildirim | Bildirim türü kapatılır |
| Müşteriye dönüşümde çift kayıt (aynı VKN) | VKN eşleşmesinde mevcut müşteriye bağlama | Dönüşüm elle onaya çevrilir |
| Kaybetme nedeni girilmez, huni raporu anlamsızlaşır | "Kaybedildi" için neden zorunlu | Rapor "neden girilmemiş" satırı gösterir |
| Kampanya modülü pazarlama aracına dönüşür | Toplu gönderim ve liste dışa aktarma yok | Kampanya alanı salt etikete indirilir |
| Giden e-posta kaydı kişisel veri biriktirir | Kayıt alıcı + konu + sonuç; gövde saklanmaz | Gövde alanı hiç eklenmez |
| Gelen e-posta/santral entegrasyonu uydurulur | **Kapsam dışı**; §12 doğrulanacaklarında | Özellik açılmaz |

**doğrulanacak:** Luca'da ayrı aday/potansiyel müşteri kartı var mı, yoksa cari kartı "aday"
işaretiyle mi açılıyor — kaynak: Luca kullanım kılavuzu/demo. **doğrulanacak:** Luca'da aktivite ve
hatırlatma (görev) kapsamı — kaynak: Luca kılavuzu. **doğrulanacak:** Luca'nın teklif durum adımları
ve kaybetme nedeni listesi — kaynak: Luca demo. **doğrulanacak:** e-posta entegrasyonu: giden posta
sunucusu ayarları yeterli mi, gelen e-postanın sisteme düşmesi (IMAP/POP3 ya da Microsoft Graph)
isteniyor mu, hangi posta kutusu kullanılacak — kaynak: kullanıcı + e-posta sağlayıcısı.
**doğrulanacak:** telefon entegrasyonu: santral/CTI (çağrı kaydı, tıkla-ara) isteniyor mu, hangi
santral — kaynak: kullanıcı + operatör. **doğrulanacak:** ticari elektronik ileti izni ve İYS kaydı
gerekliliği, mesaj şablonlarında ret satırı — kaynak: avukat (`docs/hukuk/README.md:63`).
**doğrulanacak:** segment ölçütlerinde hangi alanların isteneceği (ör. "son 90 günde sevkiyatı
olmayan") — kaynak: kullanıcı. **doğrulanacak:** kampanyanın gerçekleşen adedi nasıl sayılacak
(aktivite mi, kazanılan teklif mi) — kaynak: kullanıcı. **doğrulanacak:** aday kaydında yetkili
kişinin adı/telefonu gibi kişisel verilerin saklama süresi ve imha akışı — kaynak: avukat/KVKK.
**doğrulanacak:** VKN/TCKN ile vergi dairesi ve adres otomatik sorgusunun kaynağı (Luca bu özelliği
listeliyor: `02-LUCA-ENVANTERI.md:34`) — kaynak: GİB/servis sağlayıcı.

Sonraki belgeyle bağlantı: `13-SIPARIS-TEKLIF.md` bu dokümandaki teklif kaydını sipariş ve sevkiyat
zincirine bağlar; `23-RAPORLAMA-BI.md` huni raporunun zarflama ve dışa aktarma sözleşmesini,
`24-RAPOR-TASARIMCISI.md` segment ölçüt motorunu, `35-DENETIM-IZI-KVKK-UYUM.md` kişisel veri
saklama ve imha akışını sağlar.
