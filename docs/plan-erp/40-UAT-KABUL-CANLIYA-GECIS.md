# 40 — UAT, Kabul ve Canlıya Geçiş

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır.
Konusu **sınamadır**: yazdığımızı nasıl test ederiz, kim sınar, hangi sayı doğru çıkarsa "oldu" deriz,
canlıya nasıl geçeriz ve bir şey ters giderse nasıl geri döneriz. Süre ve sıra bilgisi
`39-YOL-HARITASI-EFOR.md` içindedir; burada **kabul anı** anlatılır.

## 1. Amaç ve kapsam

**Bu doküman neyi çözer?** Bugüne kadar testlerimiz **kodun kendi testleriydi** (`dotnet test`,
`npm run build`, Playwright e2e). Bunlar "kod çalışıyor mu" sorusunu cevaplar; **"iş doğru mu"**
sorusunu cevaplamaz. Bu doküman o ikinci sorunun cevabını kurar:

1. **UAT (Kullanıcı Kabul Testi):** gerçek işi yapan kişiler (yönetici, muhasebe, satış, depo, şoför,
   mali müşavir) gerçek senaryoyu kendi elleriyle dener.
2. **Veri doğruluğu kontrolü:** "ekran güzel" değil, **"mizan tutuyor"** ölçütü.
3. **Pilot:** bir firmada, sınırlı sürede, gerçek işle sınama.
4. **Canlıya geçiş:** dönem açma, devir, kullanıcı, e-belge başvurusu, destek.
5. **Geri dönüş (rollback):** ters giderse ne yaparız; panik anında düşünmeyelim diye şimdi yazılır.
6. **"Bitti" tanımı:** hangi maddeler işaretlenmeden hiçbir şey "bitti" sayılmaz.

**Kapsam içinde:** rol bazlı senaryolar, uçtan uca senaryolar, veri doğruluğu kontrolleri, pilot
firma seçimi ve süresi, eğitim materyali, geri bildirim toplama, canlıya geçiş adımları, geçiş sonrası
30 gün destek, geri dönüş planı, kabul kriterleri, "bitti" tanımı.

**Kapsam dışında:** faz sırası ve efor (`39`), risk kaydı ve varsayımlar (`41`), modül içerikleri
(`03`–`38`), fiyat ve sözleşme (`docs/SATIS-PLANI.md`, `docs/hukuk/`), mevzuat yorumu (mali
müşavir/avukat).

**Bugünkü gerçek ve değişmeyecek olan şey.** UAT ve geçiş planı üç şeyi **bozmayacak** şekilde
kurulur:

| Bugünkü gerçek | Kanıt | Bu dokümandaki yansıması |
|---|---|---|
| Canlı panel Render'da yayında ve müşteri kullanıyor | `AGENTS.md:9` | UAT **ayrı test ortamında** koşar; canlı panel sınama için kullanılmaz |
| Veri PostgreSQL'de; ücretsiz plan 28 Ekim'de silinir | `render.yaml:4`, `AGENTS.md:112` | Geçiş planının **1. adımı** veritabanı kararıdır |
| pratikortam aynası **günde 4 kez** çalışıyor (07:07, 12:07, 17:07, 22:07) | `.github/workflows/mirror.yml:10` | Yayın, migration ve geçiş adımları bu saatlerin **dışına** konur |
| Ayna açıkken panelde yazma engelli | `server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18` | UAT'ın yazma senaryoları ayna **kapalı** kurulumda koşar |
| Klasik görünüm varsayılan | `client/src/lib/uiMode.ts:8` | Her UAT senaryosu **iki görünümde** denenir |
| Yedek ve geri yükleme iş akışları var | `.github/workflows/backup.yml`, `.github/workflows/restore.yml` | Geçiş öncesi ve geri dönüş adımları bunları kullanır |

## 2. Luca'daki karşılığı

Luca'nın sitesinde bir UAT kılavuzu yayınlanmaz; okunabilen maddeler **kabulün nasıl yapıldığına**
dair dolaylı kanıttır ve senaryolarımızı bunlara dayandırdık:

- **Excel aktarım listesi** (`docs/plan-erp/02-LUCA-ENVANTERI.md:28-29`: cari, stok, çek-senet,
  fatura, yevmiye fişi, banka ekstresi) — kabul testinin **ilk adımı veri taşımadır**; biz de UAT'ta
  "önce devir verisi, sonra belge" sırasını uygularız.
- **BA-BS mutabakatı** ve **mutabakat bilgi postası** (`02-LUCA-ENVANTERI.md:31`) — cari mutabakatı
  bir **kabul ölçütüdür**, ekran süsü değil.
- **Online cari hesap mutabakatı (sınırsız/ücretsiz)** (`02-LUCA-ENVANTERI.md:50`) — karşı tarafın
  onayı da sürece girer; bizde bu, mali müşavir/karşı firma mutabakatı olarak UAT'a girer.
- **Yevmiye defterinin e-Defter standartlarına aktarımı** (`02-LUCA-ENVANTERI.md:42`) — defter
  çıktısı kabul anında **birebir** incelenir.
- **e-Fatura gönderim ve gelen e-Faturaların alınması** (`02-LUCA-ENVANTERI.md:39`) — canlıya
  geçişte **test ortamı turu** zorunludur (`docs/GELISTIRME-PLANI.md:86-87`).
- **Ayrıntılı yetkilendirme ile iş planı yapabilme** (`02-LUCA-ENVANTERI.md:51`) — UAT'ın rol bazlı
  kısmı bu maddeye dayanır.

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'nın kendi kabul/geçiş süreci (kurulum sonrası kaç gün yerinde destek veriyor,
veri taşımayı kim yapıyor, eğitim veriyor mu) — kaynak: Luca satış/teknik ekibi. **doğrulanacak:**
Luca'da "geri dönüş" (eski veriye dönme) taahhüdü var mı — kaynak: Luca sözleşme/hizmet şartları.
**doğrulanacak:** Luca'nın e-Fatura kontör ve test ortamı prosedürü — kaynak: entegratör. Bu bilgiler
bizim UAT planımızı değiştirmez; ama müşteriye "rakip ne yapıyor" diye sorulduğunda cevap uydurmayız.

## 3. Bizde bugün

**Elimizde olan kabul altyapısı (kanıtlı):**

- **Üç katmanlı otomatik test düzeni var:** sunucu birim/entegrasyon (`dotnet test`), panel lint+build,
  Playwright e2e. CI'da beş iş koşar: `legacy`, `server`, `client`, `mobile`, `e2e`
  (`.github/workflows/ci.yml:8-82`). Bugün `client/e2e` altında 24 spec ve 58 test vardır
  (`docs/GELISTIRME-PLANI.md:305`).
- **Canlı kontrol (smoke) işi var:** `.github/workflows/smoke.yml` yayın sonrası canlıyı sınar.
- **Yedek ve geri yükleme iş akışları var:** `.github/workflows/backup.yml` ve
  `.github/workflows/restore.yml`. Geri yükleme bir kez denenmiştir; `Backup:RestartAfterRestore`
  ayarı bu sırada eklenmiştir (`docs/YOL-HARITASI.md:129-132`).
- **İki adımlı doğrulama (2FA) çalışıyor:** TOTP kurulumu, kurtarma kodları, yönetici sıfırlaması ve
  hesap kilidi. Şoför rolünde 2FA sunulmaz
  (`server/YesLojistik.Api/Controllers/TwoFactorController.cs:43`). Beş hatalı denemede hesap 15 dakika
  kilitlenir (`server/YesLojistik.Api/Controllers/AuthController.cs:42`).
- **Kurulum ve aktarım araçları var:** `/kurulum` sihirbazı, `/aktar` (önizlemeli Excel/CSV),
  müşteri kurulum betikleri (`deploy/customer-*.sh`, `docs/MUSTERI-KURULUM.md`), pilot paketi
  (`docs/PILOT-PAKETI.md`).
- **UETDS hazırlık kontrolü** ve **sağlayıcıdan bağımsız e-Fatura altyapısı** var
  (`docs/UETDS.md`, `docs/ENTEGRATOR-EKLEME.md`).
- **Ayna geçişi yazılı bir akışa bağlı:** pratikortam'a kayıt girişi durur → son senkron → ayna
  kapatılır → panel kayıt girişine açılır (`docs/YOL-HARITASI.md:98-101`). Bu akış **UAT'ın
  zeminidir**: yazma senaryoları ancak ayna kapandıktan sonra mümkündür.

**Eksik olan (bu dokümanın kapatacağı):**

1. **Yazılı UAT senaryosu yok.** Testler kod odaklı; "muhasebeci sabah ne yapar" yazılı değil.
2. **Rol bazlı senaryo listesi yok** (yönetici, muhasebe, satış, depo, şoför, mali müşavir).
3. **Veri doğruluğu kontrol listesi yok.** "Mizan eşitliği" hiçbir dosyada ölçüt olarak yazılı değil;
   yalnız `06-MUHASEBE-MOTORU.md:440-443` uçtan uca bir kabul testi tarif eder (5 satış faturası,
   3 alınan fatura, 4 tahsilat, 2 ödeme, 1 kasa virmanı, 1 çek tahsili, 3 masraf → fark 0,00 TL).
4. **Pilot seçim ölçütü yok.** `docs/SATIS-PLANI.md:255-258` pilot ölçütünü ("haftada 4+ gün kullanım,
   sevkiyatların %80'i panelde") verir, ama **firma seçimini** tarif etmez.
5. **Geri dönüş planı yok.** Yedek iş akışı var; "hangi durumda geri döneriz, kim karar verir" yazılı
   değil.
6. **Eğitim materyali dağınık:** `docs/egitim` temeli ve ekran görüntüleri var
   (`docs/SATIS-PLANI.md:251`), ama UAT'a özel kısa kılavuz yok.
7. **Geri bildirim toplama düzeni yok.** `docs/YOL-HARITASI.md:23` "toplu, aşama aşama" der; kayıt
   yeri tanımlı değil.

## 4. Hedef ekranlar ve alanlar

**UAT'ta asıl "ekran" UAT kayıt defteridir.** Aşağıdaki yapı kurulur; her satır bir senaryodur ve
durumu işaretlenir. Kayıt yeri: `docs/plan-erp/UAT-KAYIT.md` (uygulama sırasında açılır; **müşteri
verisi, VKN, tutar yazılmaz**, yalnız senaryo sonucu ve ekran görüntüsü bağlantısı).

**Senaryo kaydı alanları:** `Senaryo no` · `Rol` · `Ön koşul` · `Adımlar` · `Beklenen sonuç`
(ölçülebilir) · `Gerçek sonuç` · `Durum` (geçti/kaldı/engelli) · `Kanıt` (ekran görüntüsü/test adı) ·
`Sorumlu` · `Tarih` · `Hata no`.

**UAT'ta kullanılacak ekranlar (senaryolara göre):**

| Rol | Dokunduğu ekranlar | Bugün var mı |
|---|---|---|
| Yönetici | Bugün (`DashboardPage.tsx`), Ayarlar (`SettingsPage.tsx`), Onay Merkezi (yeni), Abonelik (`LicenseTab.tsx`), Kullanıcılar | kısmen var |
| Muhasebe | Faturalar, Tahsilatlar (`PaymentsPage.tsx`), Kasa (`CashAccountsPage.tsx`), Çekler (`ChecksPage.tsx`), Alınan Faturalar (`PurchaseInvoicesPage.tsx`), Mizan (yeni) | kısmen var |
| Satış | Sevkiyatlar (`TripsPage.tsx`), Cari (`CariPage.tsx`, `CustomerDetailPage.tsx`), Fatura kesme (`InvoiceCreatePage.tsx`), Teklif/Sipariş (yeni) | kısmen var |
| Depo | Stok kartı, Hareket, Sayım (yeni), Barkod okuma | yok (F3) |
| Şoför | Mobil uygulama (sevkiyat, evrak, masraf, avans), takip linki (`PublicTrackingPage.tsx`) | var |
| Mali müşavir | Mizan/Muavin, KDV Özeti, BA-BS, Muhasebeci Paketi aktarımı | yok (F1, F6, F9) |
| Müşteri (portal) | Takip sayfası, portal (yeni) | kısmen var |

**Yeni ekran ihtiyacı:** UAT'ın kendisi için tek bir ekran gerekir: **Ayarlar → Kabul Testi** (yalnız
yönetici). Burada senaryo listesi, tamamlanma oranı ve "pilot hazır mı" göstergesi görünür. Alanlar:
`Senaryo kodu`, `Rol`, `Durum`, `Kanıt bağlantısı`, `Tamamlanma %`, `Engel notu`. Bu ekran bir
**iç araçtır**; müşteriye satılan pakete girmez (`34-LISANS-ABONELIK-KONTOR.md` paket kapısı dışında
tutulur).

## 5. İş kuralları

### 5.1 Rol bazlı UAT senaryoları

**Kural:** her senaryo **iki görünümde** (klasik + yeni) ve **tek ortamda** — yalnız **test
ortamında** — koşar. Canlı panel sınama için kullanılmaz.

#### Y1 — Yönetici (10 senaryo)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| Y1.1 | Giriş + 2FA kurulumu + kurtarma kodu ile giriş | Giriş olur; kurtarma kodu sayısı azalır; denetim izinde `LoginRecovery` görünür |
| Y1.2 | Yanlış şifreyle 5 deneme | Hesap 15 dakika kilitlenir; ekranda sade Türkçe uyarı |
| Y1.3 | Yeni kullanıcı + rol atama | Kullanıcı yalnız rolünün ekranlarını görür |
| Y1.4 | Dönem kilidi kapatma → o döneme fatura kesme denemesi | Yazma reddedilir; deneme denetim izine düşer |
| Y1.5 | Şirket seçici ile ikinci şirkete geçiş | İkinci şirketin kayıtları görünür; ilk şirketin kaydı **hiç görünmez** |
| Y1.6 | Belge serisi tanımlama + fatura kesme | Numara seriden artar; boşluk oluşmaz |
| Y1.7 | Onay Merkezi'nde bekleyen onayı onaylama/reddetme | Durum değişir; gerekçe zorunlu |
| Y1.8 | Kullanıcının 2FA'sını sıfırlama | Kullanıcı yeni cihazla giriş yapabilir; denetim izi kaydı oluşur |
| Y1.9 | Abonelik bitişini ileri alma | Panel salt okunur olur; mizan/rapor **okunur** kalır |
| Y1.10 | Modül kapısını kapatma → o modülün yazma denemesi | Yazma reddedilir, okuma açık kalır; menüde modül kapalı görünür |

#### M1 — Muhasebe (14 senaryo)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| M1.1 | Hesap planını açma, yaprak hesap ekleme | Ağaç doğru; kod tekrarı engellenir |
| M1.2 | Elle yevmiye fişi: borç ≠ alacak | Kaydetme **engellenir**, hata sade Türkçe |
| M1.3 | Elle yevmiye fişi: dengeli | Kaydedilir; fiş no seriden artar |
| M1.4 | Onaylı fişte düzeltme | Kayıt değişmez; **ters kayıt** açılır |
| M1.5 | Fatura kesilince fiş üretimi | Fiş otomatik oluşur; hesap eşlemesi doğru |
| M1.6 | Tahsilat girişi ve mahsup | Cari bakiye düşer; fiş oluşur |
| M1.7 | Kasa virmanı | İki kasa bakiyesi birlikte değişir; tek fiş |
| M1.8 | Çek tahsili | Portföy durumu değişir; banka/kasa hareketi oluşur |
| M1.9 | Mizan ve kesin mizan | Borç = alacak; toplam fişlerle aynı |
| M1.10 | Muavin (hesap ekstresi) | Hareketler tarih sırasıyla; yürüyen bakiye doğru |
| M1.11 | KDV özeti (taslak) | Hesaplanan/indirilecek KDV elle hesapla aynı |
| M1.12 | Tevkifat sınırı: KDV dahil 12.000 TL üstü + 10 haneli VKN | 2/10 tevkifat uygulanır; altındaki tutarda uygulanmaz |
| M1.13 | Dönem kapatma | Kapanmış döneme yazma reddedilir |
| M1.14 | e-Defter üretimi | **Biçim doğrulanana kadar kapalı**; açıksa çıktı "taslak" işaretlidir |

#### S1 — Satış (10 senaryo)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| S1.1 | Yeni sevkiyat kaydı (klasik + yeni görünüm) | Kayıt oluşur; kâr şeridi doğru |
| S1.2 | Sevkiyat → fatura kesme (`InvoiceCreatePage.tsx`) | Fatura ön dolu gelir; sevkiyat "faturalandı" olur |
| S1.3 | "Faturalandırılacaklar" sekmesi | Teslim edilmiş, faturasız sevkiyatlar müşteriye göre gruplanır |
| S1.4 | Satır tabanlı fatura: iskonto + satır KDV | Satır toplamı, iskonto ve KDV doğru; kuruş yuvarlaması tutarlı |
| S1.5 | Dövizli fatura | TL karşılığı ve kur görünür; kur kaynağı kayıtlı |
| S1.6 | İade faturası | Orijinal belgeye bağlanır; stok ve cari geri döner |
| S1.7 | Fatura iptali | Yalnız izinli rolde; gerekçe zorunlu; denetim izi kaydı |
| S1.8 | Cari kartı → ekstre | Ekstre bakiyeyle uyuşur; Excel alınır |
| S1.9 | Toplu işlem: birden çok sevkiyatı faturaya çevirme | Seçili kayıtlar işlenir; hata varsa satır bazında gösterilir |
| S1.10 | Telefonda (640px altı) kart görünümü | Yatay kaydırma yok; 44px dokunma hedefi |

#### D1 — Depo (8 senaryo, F3 sonrası)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| D1.1 | Stok kartı açma (birim, kategori, KDV) | Kart kaydedilir; kod tekrarı engellenir |
| D1.2 | Depo ve bölüm tanımlama | Hareket bu depoya yazılır |
| D1.3 | Mal giriş/çıkış hareketi | Bakiye anında değişir |
| D1.4 | Maliyet yöntemi (FIFO / ortalama) | Çıkan malın maliyeti elle hesapla aynı |
| D1.5 | Barkodla sayım (telefon) | Okutulan miktar sayıma düşer |
| D1.6 | Sayım farkı kapatma | Fark kaydı oluşur; onay ister |
| D1.7 | Sayım → maliyet ve fiş | Fark maliyete ve fişe yansır |
| D1.8 | Hareket iptali (ters kayıt) | Bakiye geri döner; kayıt silinmez |

#### Ş1 — Şoför (7 senaryo)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| Ş1.1 | Telefonda giriş (2FA yok) | Giriş olur; yalnız şoför ekranları görünür |
| Ş1.2 | Sevkiyat listesi ve detay | Yalnız kendi sevkiyatları |
| Ş1.3 | Teslim evrakı fotoğrafı yükleme | Yükleme tamamlanır; onay bekler |
| Ş1.4 | Masraf/harcırah girişi | Kayıt oluşur; onay bekler |
| Ş1.5 | Avans talebi | Talep oluşur; panelde görünür |
| Ş1.6 | Çevrimdışı deneme | Kayıt kuyruğa alınır; bağlantı gelince gönderilir |
| Ş1.7 | Müşteri takip linki | Link açılır; **yalnız o sevkiyatın** bilgisi görünür |

#### MM1 — Mali müşavir (6 senaryo)

| No | Senaryo | Beklenen sonuç |
|---|---|---|
| MM1.1 | Mizan/muavin çıktısı alma (Excel + PDF) | Çıktı ekrandakiyle aynı sayıyı verir |
| MM1.2 | Yevmiye defteri çıktısı | Belge no sırası boşluksuz |
| MM1.3 | KDV özeti kontrolü | Beyanla karşılaştırılabilir düzeyde |
| MM1.4 | BA-BS verisi | Sınırlar ayardan; liste tutarlı |
| MM1.5 | Muhasebeci Paketi aktarımı (XML/Excel) | Dosya iner; içerik şeması belgeli ve sürümlü |
| MM1.6 | Mutabakat | Karşı firma bakiyesi ile fark 0,00 TL |

### 5.2 Uçtan uca senaryolar (E2E)

Bunlar "tek ekran" değil **zincir** testleridir. Zincirin bir halkası koparsa senaryo **kaldı** sayılır.

**E2E-A — Satış zinciri (teklif → tahsilat → muhasebe → rapor).**

| Adım | İş | Beklenen |
|---|---|---|
| 1 | Teklif hazırla, gönder, müşteri kabul etsin | Teklif durumu "kabul"; revizyon izi var |
| 2 | Teklif → sipariş | Kalemler ve fiyat taşınır |
| 3 | Sipariş → sevkiyat (lojistik) | Sevkiyat siparişe bağlanır |
| 4 | Sevkiyat → irsaliye/e-İrsaliye | Belge no seriden; sevkiyat durumu ilerler |
| 5 | Sevkiyat → satış faturası (satır, iskonto, KDV) | Toplamlar elle hesapla aynı |
| 6 | Fatura → e-belge gönderimi (test ortamı) | Durum "gönderildi"; hata varsa kuyrukta görünür |
| 7 | Tahsilat + mahsup (FIFO) | Cari bakiye doğru; `PaymentAllocator` sonucu elle hesapla aynı (`server/YesLojistik.Core/Domain/PaymentAllocator.cs:19`) |
| 8 | Otomatik fişler | Satış, KDV, tahsilat fişleri dengeli |
| 9 | Mizan + KDV özeti | Borç = alacak; KDV tutarları faturayla tutarlı |
| 10 | Rapor: satış analizi, cari ekstre, kârlılık | Rapor sayıları zincirdeki kayıtlarla aynı |

**E2E-B — Satın alma zinciri (talep → ödeme).**

| Adım | İş | Beklenen |
|---|---|---|
| 1 | Talep + onay limiti | Limit üstü onaya düşer |
| 2 | Talep → sipariş | Fiyat listesinden fiyat önerilir |
| 3 | Mal kabul (kısmi teslim) | Kalan miktar siparişte açık kalır |
| 4 | Alış faturası (gelen e-Fatura ile doldurma) | Satırlar eşleşir; fark varsa gösterilir |
| 5 | Üç yönlü eşleştirme (sipariş–kabul–fatura) | Tolerans içinde otomatik; dışında onaya düşer |
| 6 | Ödeme (kasa/banka) + mahsup | Tedarikçi borcu düşer |
| 7 | Fişler + mizan | Alış, KDV, ödeme fişleri dengeli |
| 8 | Rapor: tedarikçi performansı, açık sipariş, fiyat geçmişi | Sayılar zincirle uyumlu |

**E2E-C — Sayım zinciri (sayım → düzeltme → maliyet).**

| Adım | İş | Beklenen |
|---|---|---|
| 1 | Sayım oturumu aç | Depo/bölüm seçilir |
| 2 | Telefonla barkod okut (eksik/fazla) | Miktarlar oturuma düşer |
| 3 | Fark paneli | Fark listesi tutar etkisiyle görünür |
| 4 | Kapatma onayı (maker-checker) | Onaysız kapanmaz |
| 5 | Fark hareketi + fiş | Bakiye düzelir; fiş dengeli |
| 6 | Maliyet yeniden hesabı | Stok değeri elle hesapla aynı |
| 7 | Envanter raporu | Sayım sonrası değer doğru |

**E2E-D — Kasa/banka/çek zinciri.** Kasa gün sonu → fark kaydı → banka ekstresi yükleme → satır
eşleştirme → mutabakat → çek portföyü → tahsil/protesto → fişler → nakit akışı raporu. Beklenen:
mutabakat farkı **0,00 TL**; nakit akışı raporu kasa/banka bakiyeleriyle tutarlı.

**E2E-E — Çok şirketli zincir.** A şirketinde fatura kes → B şirketinde aynı müşteri kodunu kullan →
her iki şirketin mizanını al → konsolide rapor (F10). Beklenen: **hiçbir kayıt karışmaz**; konsolide
toplam = iki mizanın toplamı (eliminasyon hariç).

### 5.3 Veri doğruluğu kontrolleri (UAT'ın kalbi)

Bu kontroller geçmeden UAT **geçmiş sayılmaz**; ekranların güzel olması yetmez.

| # | Kontrol | Nasıl ölçülür | Kabul sınırı |
|---|---|---|---|
| 1 | **Mizan eşitliği** | Dönem mizanında toplam borç − toplam alacak | **0,00 TL** |
| 2 | **Fiş–defter tutarlılığı** | `LedgerBalance` toplamı ile fiş satırları toplamı | 0,00 TL fark |
| 3 | **Cari mutabakat** | Müşteri/tedarikçi bakiyesi ile ekstre son bakiyesi; karşı firma bakiyesi | 0,00 TL |
| 4 | **KDV özeti** | Hesaplanan − indirilecek KDV; fatura toplamlarıyla karşılaştırma | Fark 0,00 TL ya da gerekçeli (devreden KDV) |
| 5 | **Tevkifat** | KDV dahil 12.000 TL üstü + 10 haneli VKN → 2/10 | Sınır altı/üstü testleri geçer |
| 6 | **Stok–maliyet** | Stok bakiyesi = hareket toplamı; maliyet elle hesapla | 0 fark, 0,00 TL |
| 7 | **Fatura–sevkiyat** | Faturalanan sevkiyat sayısı = fatura satırındaki sevkiyat sayısı | Eşit; yetim kayıt yok |
| 8 | **Tahsilat mahsubu** | Açık fatura toplamı + tahsil edilen = kesilen fatura toplamı | 0,00 TL |
| 9 | **Banka mutabakatı** | Ekstre son bakiye − sistem bakiyesi | 0,00 TL |
| 10 | **Devir bakiyesi** | pratikortam/eski program bakiyesi ile panel bakiyesi (kişi kişi) | < 0,05 TL (`05-VERI-MODELI.md:518-519`) |
| 11 | **Yetim kayıt taraması** | Faturasız tahsilat, carisiz hareket, hesapsız fiş satırı | **0** |
| 12 | **Numara sürekliliği** | Her seride kesilen belge numaraları | Boşluk yok |
| 13 | **Denetim izi zinciri** | `GET /api/audit/verify` | "zincir sağlam" |
| 14 | **Kişisel veri maskeleme** | Denetim kaydında TCKN/telefon/IBAN/e-posta | Ham değer görünmez |
| 15 | **Performans** | Liste/rapor yanıt süreleri | Ağır rapor 3 sn altı; aşan iş kuyruğa taşınmış |

**Kontrol sorumlusu:** 1–8 ve 11–12 muhasebe + geliştirici; 9 banka/kasa sorumlusu; 10 mali müşavir +
kullanıcı; 13–14 geliştirici; 15 geliştirici (`36-PERFORMANS-OLCEK.md` ölçütleri).

### 5.4 Pilot firma seçimi ve pilot süresi

**Pilot kim olur?** İki kaynak var: **YES Lojistik'in kendisi** (en doğal pilot; pratikortam aynası
zaten bizde) ve **dışarıdan 1–3 firma** (`docs/SATIS-PLANI.md:14`, `:256`).

| Ölçüt | Aranan | Neden |
|---|---|---|
| Büyüklük | 5–20 araç | Küçük firma hızlı karar verir; dev firma süreci kilitler |
| Kullanım isteği | Sahibi bizzat kullanacak | Geri bildirim en hızlı sahibinden gelir |
| Veri durumu | Verisi Excel'de ya da eski programda düzenli | Göç provası anlamlı olsun |
| Coğrafya | Aynı il / erişilebilir | Yerinde destek ve eğitim gerekebilir |
| İlişki | Referans olabilecek, sabırlı | Hata bulmak için şikâyet etmesi gerekir |
| Kapsam uyumu | Sevkiyat + cari + fatura kullanıyor | F0–F5 çekirdeği onun işini karşılasın |

**Pilot süresi: 6 hafta** (ölçüt `docs/SATIS-PLANI.md:255-258`). Haftalık düzen:

| Hafta | İş | Çıkış |
|---|---|---|
| 0 | Kurulum: veritabanı, şirket, kullanıcılar, devir verisi aktarımı (kuru prova + gerçek) | Devir farkı < 0,05 TL |
| 1 | Eğitim (2 oturum) + gölge kullanım: kullanıcı yapar, biz izleriz | Engel listesi |
| 2 | Gerçek işin bir kısmı panelde: sevkiyat + fatura + tahsilat | İlk 10 gerçek belge |
| 3 | Ara kontrol: mizan eşitliği, cari mutabakat, KDV özeti | Veri doğruluğu raporu |
| 4 | Tam kullanım: bütün sevkiyatlar panelde, giderler ve çek dahil | Kullanım ölçütü |
| 5 | Hata düzeltme turu + rapor/mali müşavir çıktıları | Kabul listesi |
| 6 | Pilot kapanış: kabul imzası, eksik listesi, fiyat geri bildirimi | **Pilot raporu** |

**Pilot başarı ölçütü (bitti sayılması için üçü birden):**
1. Firma panelini **haftada 4+ gün** kullanıyor.
2. Sevkiyatlarının **%80'i** panele girilmiş.
3. **Mizan eşitliği ve cari mutabakat** (§5.3'teki 1, 3 ve 4 numaralı kontroller) **0,00 TL** fark
   veriyor.

**Pilot sırasında yasak:** canlı veriyi değiştiren bir işlem **yedek + kullanıcı onayı** olmadan
yapılmaz (`AGENTS.md` §3.5); pratikortam'a **hiçbir şey** yazılmaz (`AGENTS.md` §3.1); pilot firmadan
gelen veri (müşteri, VKN, tutar) depoya **girmez** (`AGENTS.md` §3.3).

### 5.5 Eğitim materyali

| Materyal | Kime | İçerik | Biçim |
|---|---|---|---|
| 1 sayfalık "ilk gün" kartı | her rol | Giriş, 2FA, en sık 5 iş | PDF |
| Rol kılavuzu (5 ayrı) | yönetici, muhasebe, satış, depo, şoför | Ekran ekran, tıklama sırasıyla | PDF + kısa video |
| Muhasebeci kılavuzu | mali müşavir | Mizan, KDV, e-Defter, aktarım | PDF |
| 6 kısa video (3–5 dk) | herkes | Kurulum, sevkiyat, fatura, tahsilat, sayım, rapor | MP4 |
| "Eski → yeni" karşılık tablosu | mevcut kullanıcı | pratikortam'daki yer → paneldeki yer (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:166`) | PDF |
| UAT senaryo seti | sınayan kişi | Bu dokümanın §5.1–5.2 listesi | Yazdırılabilir liste |

**Kural:** eğitim materyali ekran görüntüsü içerir; **hiçbir görüntüde gerçek müşteri, plaka, VKN ya
da tutar bulunmaz**; örnek/`Seed` verisi kullanılır.

### 5.6 Geri bildirim toplama

Tek yer: **UAT kayıt defteri** (`docs/plan-erp/UAT-KAYIT.md`). Kurallar:

1. Her geri bildirim **senaryo numarası** ile ilişkilendirilir; serbest sohbet notu tek başına kayıt
   sayılmaz.
2. Her kaydın **bir sahibi** ve **bir son tarihi** olur; sahipsiz kayıt açılmaz.
3. Kayıt üç türden biridir: **hata** (beklenen ≠ gerçek), **eksik** (iş yapılamıyor), **istek**
   (iyileştirme). "İstek" kabul listesine girer ama **pilotu durdurmaz**.
4. Haftalık **tek** toplantıda (30 dk) liste gözden geçirilir; durum güncellenir.
5. Karara bağlanan her madde ya **faz içi iş** ya **sonraki faz** ya **kapsam dışı** olarak işaretlenir;
   "kapsam dışı" kararı gerekçesiyle yazılır (`41` §5.7).

## 6. Veri modeli

Bu doküman **iş verisi tablosu eklemez**. Yalnız UAT ve geçiş izini tutan **iki yardımcı tablo** önerilir
(ikisi de yalnız ekleme migration'ıdır, `CompanyId` taşır):

| Tablo | Alanlar | Amaç | Faz |
|---|---|---|---|
| `UatScenario` | `Id`, `CompanyId`, `Code` (Y1.1…), `Role`, `Title`, `Precondition`, `Expected`, `Status`, `EvidenceUrl`, `OwnerName`, `CompletedAt`, `Note` | Senaryo durumu ve kanıtı | F0 sonrası, pilot öncesi |
| `CutoverChecklist` | `Id`, `CompanyId`, `StepCode`, `Title`, `IsMandatory`, `Status`, `DoneBy`, `DoneAt`, `BackupRef`, `Note` | Canlıya geçiş adımlarının izi (yedek referansı dahil) | F11 |

**Kural:** bu iki tablo **müşteri verisi taşımaz** (senaryo başlığı ve durum dışında alan yoktur);
`EvidenceUrl` yalnız depo içi/güvenli dosya yoludur. Bu tablolar paket kapısı **dışındadır** (iç araç).

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| GET | `/api/erp/uat/scenarios` | Senaryo listesi ve durumu | yönetici |
| PUT | `/api/erp/uat/scenarios/{code}` | Durum/kanıt güncelleme | yönetici |
| GET | `/api/erp/uat/summary` | Tamamlanma yüzdesi, engelli maddeler | yönetici |
| GET | `/api/erp/data-checks/trial-balance` | Mizan eşitliği kontrolü (borç − alacak) | muhasebe |
| GET | `/api/erp/data-checks/reconciliation` | Cari mutabakat farkı listesi | muhasebe |
| GET | `/api/erp/data-checks/vat-summary` | KDV özeti kontrolü | muhasebe |
| GET | `/api/erp/data-checks/orphans` | Yetim kayıt taraması (faturasız tahsilat vb.) | yönetici |
| GET | `/api/erp/data-checks/number-gaps` | Belge numarası boşluk taraması | yönetici |
| GET | `/api/audit/verify` | Denetim izi zinciri doğrulaması | yönetici |
| POST | `/api/erp/cutover/backup` | Geçiş öncesi yedek tetikleme (mevcut yedek işini çağırır) | yönetici + onay |
| GET | `/api/erp/cutover/checklist` | Geçiş kontrol listesi durumu | yönetici |
| PUT | `/api/erp/cutover/checklist/{code}` | Adım işaretleme (yedek referansı zorunlu) | yönetici |
| POST | `/api/erp/imports/{batchId}/dry-run` | Göç kuru provası (yazmaz, rapor üretir) | yönetici |
| POST | `/api/erp/imports/{batchId}/apply` | Göç uygulama (onay + yedek şartı) | yönetici + maker-checker |

**Yetki kuralı:** veri kontrolü uçları **salt okunur**dur ve hiçbir veri değiştirmez; `cutover/*`
uçları yazma sayılır ve ayna modunda (`MirrorWriteGuard.cs:14-18`) reddedilir.

## 8. Yetki, onay ve denetim izi

| İş | Yapan | Onaylayan | Denetim izi |
|---|---|---|---|
| UAT senaryosu durumunu "geçti" işaretleme | Sınayan kişi | yönetici (kapanış) | `UatScenario` değişikliği |
| Veri kontrolü çalıştırma | muhasebe/yönetici | — | Salt okunur; isteğe bağlı kayıt |
| Göç kuru provası | yönetici | — | `ImportBatch` kaydı (yazma yok) |
| Göç uygulama | yönetici | **ikinci yetkili (maker-checker)** | Satır sayısı, yedek referansı |
| Geçiş öncesi yedek | yönetici | — | `BackupRef` (dosya adı, tarih, boyut) |
| Dönem açma/devir fişi | muhasebe | yönetici | Fiş no, dönem, onay |
| Ayna kapatma | yönetici | kullanıcı onayı | Ayna durumu değişikliği |
| Kullanıcı açma/yetki | yönetici | — | Yetki değişikliği |
| e-belge başvurusu (dış) | kullanıcı | mali müşavir teyidi | Başvuru tarihi (belge panelde) |
| Geri dönüş (rollback) kararı | **kullanıcı** | — | Karar gerekçesi + zaman damgası |

**Maker-checker kuralı:** göç uygulama ve devir fişi tek kişiyle yapılmaz; aynı kişi hem hazırlayan hem
onaylayan olamaz (`07-YETKI-ONAY-NUMARALANDIRMA.md`). **KVKK:** UAT kayıtlarında kişisel veri tutulmaz;
denetim izi ve saklama kuralları `35-DENETIM-IZI-KVKK-UYUM.md` ile ortaktır. Mevzuat yorumu bu
dokümanda yapılmaz; **mali müşavir ve avukat onayı gerekir**.

## 9. Kabul kriterleri

### 9.1 UAT kabul kriterleri

1. **Senaryo kapsaması:** her rol için yazılı senaryoların **%100'ü** en az bir kez denenmiş;
   "geçti" oranı **%95+**, kalan maddeler kabul edilmiş istisna listesinde.
2. **Kritik senaryolar zorunlu:** E2E-A adım 5–9, E2E-B adım 5–7, E2E-C adım 4–6 ve veri kontrolü
   1, 3, 4, 10 — bunlar **%100 geçmeli**; istisna kabul edilmez.
3. **İki görünüm:** her senaryo klasik **ve** yeni görünümde geçer.
4. **Rol ayrımı:** kullanıcı yalnız kendi rolünün ekranını görür; test edilir (yetkisiz erişim denemesi
   reddedilir ve kayda geçer).
5. **Veri doğruluğu:** §5.3 tablosundaki 15 kontrolün tamamı sınır içinde; 1, 3, 4, 6, 7, 8, 10
   numaralılar **0,00 TL** farkla.
6. **Kesintisizlik:** UAT boyunca mevcut canlı panel ve ayna çalışmaya devam etmiştir; ayna koşuları
   (günde 4 kez) kesintiye uğramamıştır.
7. **Kanıt:** her "geçti" maddesinde kanıt vardır (ekran görüntüsü, test adı, çıktı dosyası adı).
8. **Engel (blocker) sıfır:** "engelli" durumda madde kalmaz; engel çözülür ya da kabul edilmiş istisna
   olur.

### 9.2 Canlıya geçiş kabul kriterleri

1. §5.3 kontrolleri **canlı veride** (geçiş sonrası) yeniden koşar ve sınırlar içindedir.
2. Geçiş öncesi yedek alınmış ve **geri yükleme bir kez denenmiştir** (`.github/workflows/restore.yml`).
3. Bütün kullanıcılar giriş yapabilir; 2FA kuranlar koduyla girer.
4. e-belge/e-Defter **test ortamı turu** tamamlanmıştır; canlı gönderim ayrıca açılır.
5. `Canlı kontrol` işi yeşildir.
6. 5 rastgele cari bakiyesi eski programla **kişi kişi** karşılaştırılmıştır
   (`docs/YOL-HARITASI.md:100`).
7. Destek planı devrede: ilk 30 gün için muhatap ve yanıt süresi yazılıdır.

### 9.3 "Bitti" tanımı

Bu plan setinde bir modül **yoksa** ve bir iş **"bitti" sayılmaz**:

| Şart | Nerede kanıtlanır |
|---|---|
| 1. Modül dokümanının §9 kabul kriterleri karşılandı | Kabul kanıt listesi |
| 2. §10 testleri yeşil (birim + entegrasyon + e2e) | CI koşusu (5 iş) |
| 3. İlgili UAT senaryoları "geçti" | UAT kayıt defteri |
| 4. Veri doğruluğu kontrolleri sınır içinde | Veri kontrol raporu |
| 5. İki görünümde çalışıyor; klasik menüde kayıp yok | e2e + ekran görüntüsü |
| 6. Yetki ve onay akışı tanımlı, denetim izi yazıyor | Yetki matrisi + denetim kaydı |
| 7. Mevcut panel ve ayna bozulmadı | `Canlı kontrol` yeşil |
| 8. Eğitim materyali güncellendi | Kılavuz sürümü |
| 9. Kullanıcı gördü ve onayladı | Toplu gösterim notu (`docs/YOL-HARITASI.md:23`) |

**"Bitti" değildir:** kod yazılmış olması; testlerin "yerelde çalışmıyor ama CI'da geçer" denmesi
(CI'da **görülmüş** olması gerekir); tek kişinin "bence oldu" demesi; ekranın yalnız yeni görünümde
çalışması.

### 9.4 Canlıya geçiş adımları (sıra bozulmaz)

Her adım işaretlenir, saati yazılır; **zorunlu** adımlar atlanamaz.

| # | Adım | Zorunlu | Zamanlama | Kim |
|---|---|---|---|---|
| 1 | **Veritabanı kararı** uygulanmış (ücretli plan ya da yeni DB + ayna ile doldurma) | ✔ | Geçişten **haftalar önce** | kullanıcı |
| 2 | Test ortamında **migration provası** (canlı verinin kopyasıyla) | ✔ | Geçiş −7 gün | geliştirici |
| 3 | **Tam yedek** alınır; geri yükleme bir kez denenir | ✔ | Geçiş −1 gün | geliştirici + kullanıcı |
| 4 | pratikortam'a **kayıt girişi durur** (kullanıcı kararı) | ✔ | Geçiş günü 09:00 | kullanıcı |
| 5 | **Son ayna senkronu**; sonucu "aynı" çıkmalı | ✔ | 09:15 (ayna saatleri dışında elle) | geliştirici |
| 6 | **Ayna kapatılır**; panel yazmaya açılır | ✔ | 09:30 | yönetici |
| 7 | **Dönem açılışı:** mali yıl + dönem tanımı | ✔ | 10:00 | muhasebe |
| 8 | **Devir fişi:** açılış bakiyeleri (kasa, banka, cari, stok) | ✔ | 10:30 | muhasebe + onay |
| 9 | Veri doğruluğu kontrolleri **canlıda** koşar (§5.3) | ✔ | 11:30 | muhasebe + geliştirici |
| 10 | 5 rastgele cari bakiyesi eski programla karşılaştırılır | ✔ | 12:00 | kullanıcı + mali müşavir |
| 11 | **Kullanıcı açılışı:** roller, şifreler, 2FA; kendi şifresini kullanıcı belirler | ✔ | 13:00 | yönetici |
| 12 | **Belge serileri** ve varsayılanlar (KDV, hesap eşlemesi) gözden geçirilir | ✔ | 13:30 | muhasebe |
| 13 | **e-belge başvurusu** (GİB/entegratör) ve test ortamı turu | ✔ | geçiş ±3 gün | kullanıcı + entegratör |
| 14 | **e-Defter** üretimi: biçim doğrulanana kadar **kapalı** | — | sonra | mali müşavir |
| 15 | Pratikortam **salt okunur arşiv** olarak kalır; şifreler ortamlardan silinir | ✔ | 14:00 | kullanıcı |
| 16 | `Canlı kontrol` (smoke) koşar ve yeşil olur | ✔ | 15:00 | geliştirici |
| 17 | Kullanıcıya **tek sayfalık geçiş özeti** verilir (ne değişti, kime sorulur) | ✔ | 16:00 | geliştirici |

**Zamanlama kuralı:** 4–6 ve 16 numaralı adımlar ayna koşu saatlerinden (07:07, 12:07, 17:07, 22:07,
`.github/workflows/mirror.yml:10`) **en az 45 dakika** uzakta planlanır.

### 9.5 Geçiş sonrası 30 gün destek

| Dönem | Ne yapılır | Yanıt süresi (hedef) |
|---|---|---|
| Gün 1–3 | "Yakın takip": her gün 30 dk görüşme; mizan, KDV, cari kontrolü günlük | Aynı gün |
| Gün 4–10 | Haftada 2 görüşme; hata listesi kapanışı; eğitim tekrarı (gerekirse) | Aynı gün |
| Gün 11–30 | Haftada 1 görüşme; ay kapanışına hazırlık; mali müşavir ile ortak kontrol | 1 iş günü |
| Gün 30 | **Kapanış raporu:** açık maddeler, kabul edilmiş istisnalar, sonraki faz önerisi | — |

**Destek kanalı:** tek yer (e-posta ya da ortak liste). **Yasak:** destek sırasında canlı veriyi
değiştiren işlem **yedek + onay** olmadan yapılmaz; pratikortam'a hiçbir şey yazılmaz. **Kapsam
sınırı:** 30 gün destek, **hata düzeltme ve kullanım yardımı**dır; yeni özellik talebi sonraki faza
girer (`41` §5.7).

### 9.6 Geri dönüş (rollback) planı

**Tetikleyiciler (biri yeter):**

| # | Tetikleyici | Eşik |
|---|---|---|
| T1 | Mizan eşitliği sağlanamıyor | 2 saat içinde çözülemedi |
| T2 | Cari/stok bakiyesi eski programla uyuşmuyor | Fark > 0,05 TL ve sebebi bulunamadı |
| T3 | Veri kaybı şüphesi (kayıt sayısı düştü) | Herhangi bir düşüş |
| T4 | Panel kullanılamaz (giriş/performans) | 30 dakikadan uzun kesinti |
| T5 | e-belge yanlış gönderildi | Resmî belge hatası doğrulandı |
| T6 | Kullanıcı kararı | Kullanıcı "geri dönelim" derse |

**Geri dönüş adımları (panikte sıra atlanmaz):**

1. **Dondur:** yeni kayıt girişini durdur (bakım modu / yazma kapatma); kullanıcıya haber ver.
2. **Kanıtla:** tetikleyiciyi belgeleyin (ekran görüntüsü, sayı, zaman). Geri dönüş **kararı
   kullanıcının**dır; geliştirici tek başına karar vermez.
3. **Yedek al:** geri dönüşten **önce bile** mevcut hâlin yedeği alınır (veri kaybı olmasın).
4. **Geri yükle:** geçiş öncesi yedeği `restore.yml` ile yükle. Yükleme sonrası servis yeniden başlar
   (`Backup:RestartAfterRestore` ayarı hazır, `docs/YOL-HARITASI.md:129-132`).
5. **Doğrula:** kayıt sayıları ve 5 cari bakiyesi; `Canlı kontrol` yeşil.
6. **Ayna:** gerekirse ayna yeniden açılır (pratikortam'a giriş kullanıcıda; **biz yazmayız**).
7. **Bildir:** kullanıcıya ne olduğu, hangi verinin kaybolduğu (varsa) ve yeni takvim yazılı verilir.
8. **Ders:** hata kaydı + `41` risk kaydı güncellenir; aynı tetikleyici tekrar olursa ne yapılacağı
   yazılır.

**Geri dönüşün maliyeti (dürüst):** geri dönüş, o gün panele girilen kayıtların **kaybı** anlamına
gelir; bu yüzden geçiş **ilk gün tek başına yapılmaz** — en az 3 gün **çift kayıt** (yeni panel + eski
program) ya da geçişin hafta başı ve ay başı dışında bir güne konması önerilir. Bu, `41` §5.8'de karar
bekleyen bir maddedir.

## 10. Testler

UAT **kod testlerinin yerine geçmez**; onların üstüne eklenir.

| Katman | Ne | Yer | Ne zaman |
|---|---|---|---|
| Birim | Muhasebe, KDV/tevkifat, amortisman, maliyet, yuvarlama | `server/YesLojistik.Tests/Unit/` | her commit |
| Entegrasyon | Fatura → stok + cari + fiş; izolasyon; mutabakat; numara sürekliliği | `server/YesLojistik.Tests/Integration/` | her commit |
| e2e (panel) | Rol senaryolarının otomatik karşılığı; iki görünüm; mobil kart | `client/e2e/`, `client/e2e/new-ui/` | her push |
| e2e (mobil) | Şoför girişi, evrak, masraf, avans | `mobile/` + CI `mobile` işi | her push |
| **Veri kontrolü testi** | §5.3'teki 15 kontrolün otomatik hâli (mizan eşitliği, yetim kayıt, numara boşluğu, maskeleme) | `server/YesLojistik.Tests/Integration/` | her push |
| **UAT (insan)** | §5.1–5.2 senaryoları; iki görünüm; gerçek iş | UAT kayıt defteri | faz sonunda |
| **Göç provası** | Kuru prova + gerçek aktarım; bakiye farkı | test ortamı | pilot öncesi |
| **Yük testi** | Liste/rapor süreleri, kuyruk dayanıklılığı | `36-PERFORMANS-OLCEK.md` senaryoları | F6 sonrası |
| **Geri dönüş provası** | Yedekten yükleme + doğrulama | test ortamı | canlıya geçişten önce |

**Kural:** test silinmez/atlanmaz (`01-ORTAK-SARTNAME.md:24`); "yeşil" olmayan CI ile `main`'e
alınmaz (`docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md:157`); e2e bu makinede koşulamıyorsa **CI'da koşmuş
olması** gerekir (`docs/GELISTIRME-PLANI.md:315`).

## 11. Efor ve bağımlılıklar

Efor rakamları **`39-YOL-HARITASI-EFOR.md` ve modül dokümanlarının §11'lerinden** gelir; burada
uydurulmaz. Yalnız **UAT ve geçiş işleri** aşağıda ayrıca sayılır; bunlar modül eforunun **içinde
değildir**.

| UAT / geçiş işi | Kişi-gün | Kime yük | Önce bitmeli |
|---|---|---|---|
| UAT senaryo setinin yazılması (Y1, M1, S1, D1, Ş1, MM1 + E2E) | 5 | geliştirici + muhasebe | İlgili faz |
| `UatScenario` + `CutoverChecklist` tabloları, uçlar, ekran | 4 | geliştirici | F0 |
| Veri kontrolü uçları (15 kontrol) | 6 | geliştirici | F1, F3, F4 |
| Veri kontrolü otomatik testleri | 4 | geliştirici | Yukarıdaki |
| Eğitim materyali (5 kılavuz + 6 video + 1 tablo) | 8 | geliştirici + kullanıcı | İlgili faz |
| Pilot kurulumu (veritabanı, şirket, kullanıcı, devir aktarımı) | 3 (firma başına) | geliştirici | F0, F11 |
| Pilot eşlik ve haftalık toplantılar (6 hafta) | 8 | geliştirici | Pilot kurulumu |
| Canlıya geçiş provası (test ortamında baştan sona + geri dönüş) | 4 | geliştirici | F11 |
| Geçiş günü (17 adım, uçtan uca) | 2 | geliştirici + kullanıcı | Prova |
| Geçiş sonrası 30 gün destek | 12 | geliştirici | Geçiş |
| **Toplam (pilot başına 3 gün hariç)** | **~56 kişi-gün** | | |

**Bunun anlamı:** `39`'daki **~1.900–2.400 kişi-gün** (orta nokta ~2.150) modül eforuna ek olarak
**~56 kişi-gün** (ve her ek pilot firma için **+3 gün**) UAT/geçiş yükü vardır. Bu yük `39` §11.5'teki
A1 katsayısının **içinde sayılmamıştır**; kapsam kararı verilirken dikkate alınmalıdır.

**Bağımlılıklar:**

- UAT, ilgili **fazın** bitmiş olmasını bekler (F0 → Y1; F1 → M1 + veri kontrolü 1–4; F2 → S1; F3 → D1;
  F4 → E2E-D; F9 → MM1).
- Canlıya geçiş, **F0 + F2 + F3 + F4'ün tamamını** ve veritabanı kararının uygulanmış olmasını bekler.
- e-belge/e-Defter canlı gönderimi, **test ortamı turu** ve **biçim doğrulaması** bitmeden açılmaz
  (`06-MUHASEBE-MOTORU.md:476`, `docs/GELISTIRME-PLANI.md:86-87`).
- Pilot, **eğitim materyali** ve **UAT senaryo seti** olmadan başlamaz.
- Geri dönüş planı, **yedekten geri yükleme provası** yapılmadan "hazır" sayılmaz.

## 12. Riskler ve doğrulanacaklar

Bu bölüm yalnız **kabul ve geçiş** risklerini listeler; risk kaydının tamamı
`41-RISKLER-VE-VARSAYIMLAR.md` §5'tedir.

| Risk | Etki | Azaltma |
|---|---|---|
| UAT canlı panelde yapılır, gerçek iş bozulur | Çok yüksek | UAT **ayrı test ortamında**; canlıda yalnız okuma ve smoke; `docs/plan-erp/04-HEDEF-MIMARI.md:279-287` ortam kuralı |
| Geçiş günü ayna koşusuyla çakışır | Yüksek | Adımlar ayna saatlerinden 45 dk uzak; son ayna elle ve sonucu "aynı" (`docs/YOL-HARITASI.md:99`) |
| Devir bakiyesi yanlış girilir; mizan hiç eşitlenmez | Çok yüksek | Devir fişi maker-checker; kişi kişi karşılaştırma; fark < 0,05 TL ölçütü (`05-VERI-MODELI.md:518-519`) |
| e-belge canlıda yanlış gönderilir | Çok yüksek | Test ortamı turu zorunlu; iptal/itiraz akışı ayrıca sınanır; manuel sağlayıcı varsayılan kalır (`EInvoiceProviders.cs:18`) |
| e-Defter biçimi varsayımla üretilir | Yüksek | Biçim doğrulanana kadar **kapalı**; üretilse bile "taslak" işaretli (`06-MUHASEBE-MOTORU.md:476`) |
| Geri dönüş denenmemiş olur; panikte yedek açılmaz | Yüksek | Geçişten önce **geri yükleme provası**; `restore.yml` + `Backup:RestartAfterRestore` |
| Pilot firma gerçek verisini depoya/sohbete taşır | Yüksek (KVKK + kural) | UAT kaydında veri tutulmaz; örnek veri; `AGENTS.md` §3.3 |
| İki adımlı doğrulama kullanıcıyı kilitler, geçiş günü uzar | Orta | Kurtarma kodları önceden dağıtılır; yönetici sıfırlaması (`TwoFactorController.cs:37-42`); şoförde 2FA yok (`:43`) |
| Mali müşavir beklentisi geç karşılanır (KDV/e-Defter/BA-BS) | Orta–yüksek | MM1 senaryoları erken; mali müşavir UAT'a **davetli**; mevzuat yorumu ondan |
| Kullanıcı "bitti" tanımını kod teslimi sanır | Orta | §9.3 dokuz şart yazılı; her faz sonunda toplu gösterim |
| Geçiş sonrası 30 gün destek tek kişiyi tıkar; diğer işler durur | Orta | Destek bütçesi ayrı yazıldı (12 kişi-gün); yanıt süresi hedefleri; kapsam sınırı (yalnız hata + yardım) |
| Pilot başarısız olur, fiyat/paket varsayımı çöker | Orta | Pilot ölçütü baştan yazılı (§5.4); başarısızlık "kapsam daraltma" kararını tetikler (`39` §11.6) |

### 12.1 doğrulanacaklar

- **doğrulanacak:** Luca'nın kurulum sonrası destek süresi, eğitim ve veri taşıma pratiği — kaynak:
  Luca satış/teknik ekibi veya Luca sözleşmesi.
- **doğrulanacak:** e-Fatura entegratörünün **test ortamı** erişimi, test belgesi kuralları ve
  kontör maliyeti — kaynak: entegratör (ör. Nilvera/Kolaysoft; `docs/SATIS-PLANI.md:223`) ve
  `docs/ENTEGRATOR-EKLEME.md` §2'nin doldurulması.
- **doğrulanacak:** GİB e-belge başvurusunun kim tarafından ve hangi belgelerle yapıldığı — kaynak:
  mali müşavir + GİB başvuru sayfası.
- **doğrulanacak:** e-Defter **defter ve berat dosya biçimi**, imzalama yöntemi ve zorunluluk
  kapsamı — kaynak: GİB kılavuzu + mali müşavir (`06-MUHASEBE-MOTORU.md:483-490`).
- **doğrulanacak:** BA-BS kapsam sınırları ve gönderim yöntemi — kaynak: mali müşavir.
- **doğrulanacak:** Render ücretli plan seçenekleri ve yedek saklama süresi — kaynak: Render fiyat
  sayfası + kullanıcı kararı.
- **doğrulanacak:** pilot firma adayları ve erişilebilirliği — kaynak: **kullanıcı** (3–5 nakliyeci,
  `docs/SATIS-PLANI.md:283`).
- **doğrulanacak:** KVKK aydınlatma/rıza ve veri işleyen sözleşmesi metinlerinin avukat onayı —
  kaynak: avukat; `docs/hukuk/` metinleri "TASLAK" ibaresini korur.
- **doğrulanacak:** UAT'ta ölçülecek performans hedeflerinin (3 sn) gerçek veri hacminde tutup
  tutmadığı — kaynak: yük testi (`36-PERFORMANS-OLCEK.md`).

Mevzuat yorumu bu dokümanda yapılmaz; **mali müşavir ve hukuk danışmanı onayı gerekir**.

Sonraki belgeyle bağlantı: `41-RISKLER-VE-VARSAYIMLAR.md` bu kabul/geçiş planının **hangi varsayıma**
dayandığını (pilot firma bulunacak, mali müşavir katılacak, entegratör test ortamı verecek), hangi
riskleri taşıdığını ve **neyi yapmayacağımızı** yazar.
