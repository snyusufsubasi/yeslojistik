# 37 — Test ve CI Genişletmesi

Bu doküman `docs/plan-erp/01-ORTAK-SARTNAME.md` §2 başlık şablonunu birebir ve sırayla kullanır.
"Bizde bugün" bölümündeki her iddia `dosya:satır` kanıtı taşır. Dış sistemlere (entegratör, GİB, CI
altyapısı) ait doğrulanmamış bilgi `**doğrulanacak:**` etiketiyle yazılır.

## 1. Amaç ve kapsam

Bu doküman, ERP modülleri geldiğinde **"iş doğru mu çalışıyor?"** sorusunun cevabını otomatik hâle
getirir. Bugün CI beş iş koşuyor (`legacy`, `server`, `client`, `mobile`, `e2e`), ayrıca yayın sonrası
`Canlı kontrol` ve günde dört kez `Pratikortam aynası` çalışıyor. Bu düzen sağlamdır ama muhasebe
çekirdeği için yeterli değildir: bir yevmiye fişinin tutması (borç = alacak), mizanın eşitliği, çok
şirketli izolasyon, yetki matrisi, e-belge gönderimi, göç/aktarım ve performans **ayrı ve zorunlu test
işleri** gerektirir.

Kapsam içindekiler:

1. **Mevcut CI işlerinin genişletilmesi.** `legacy`, `server`, `client`, `mobile`, `e2e` işlerine
   ERP testlerinin eklenmesi.
2. **`Canlı kontrol` ve `Pratikortam aynası` işlerinin genişletilmesi.**
3. **Muhasebe motoru altın senaryoları.** Belge → fiş → mizan eşitliği; uçtan uca.
4. **Yuvarlama testleri.** Kuruş, KDV, tevkifat, kur farkı, dağıtım artıkları.
5. **Çok şirketli izolasyon testleri.** Veri, dosya, önbellek, rapor ve numara sızıntısı.
6. **Yetki matrisi testleri.** Rol × uç × metot tablosunun otomatik doğrulanması.
7. **E-belge sahte sağlayıcı testleri.** Mevcut `mock` deseninin genişletilmesi.
8. **Göç/aktarım testleri.** Excel/CSV ve eski sistemden aktarım.
9. **Her yeni modül için en az bir e2e senaryosu.**
10. **Performans testi işi.** `36-PERFORMANS-OLCEK.md` §5.1 hedeflerinin ölçülmesi.
11. **Migration testi (boş + dolu veritabanı).**
12. **Kapsam (coverage) hedefi.**
13. **Yerelde koşulamayan testlerin CI'da koşması kuralı.**
14. **Test verisi üretme ve kırılan test politikası.**

Kapsam dışı: güvenlik testleri ve sızma testi planı (`38-GUVENLIK.md`), performans hedeflerinin
kendisi (`36`), denetim izi içeriği (`35`), test altyapısının satın alınması/ücreti. Bu doküman
**nerede, hangi komutla, hangi kapıyla** test edileceğini tanımlar.

## 2. Luca'daki karşılığı

Luca tarafında test/doğrulama ile ilişkilendirilebilecek okunabilir maddeler sınırlıdır; kaynakta
doğrudan "test" başlığı **yoktur**. Dolaylı karşılıklar şunlardır:

- **BA-BS mutabakatı**: "oluşan kayıtlardan BA-BS verisi listelenir, karşı firmanın e-postasına bilgi
  postası gider" (`docs/plan-erp/02-LUCA-ENVANTERI.md:31`) — iki tarafın kaydının tutup tutmadığını
  karşılaştıran bir doğrulama işidir; bizim **mutabakat testi** kalemimizin karşılığıdır.
- **Online cari hesap mutabakatı** (`:50`) — aynı mantık, cari bazında.
- **Excel ile veri aktarımı** (cari, stok, çek-senet, fatura, yevmiye fişi, banka ekstresi) (`:27-29`) —
  aktarımın doğrulanması ihtiyacı; bizim **göç/aktarım testleri** kalemimizin karşılığıdır.
- **Sürükle-bırak üretim akış diyagramı ve akışa göre ürün maliyetlendirme** (`:37`) — hesaplanan
  maliyetin doğruluğu bir kabul ölçütüdür; bizim **maliyet altın senaryosu** kalemimiz.
- **Yevmiye defterinin e-Defter standartlarına aktarımı** (`:42`) — biçim doğrulaması; bizim
  **e-Defter biçim testi** kalemimiz.
- **Belge üzerinden muhasebe fişi iptali** (`:46-47`) — iptal sonrası mizanın hâlâ tutması gerekir;
  bizim **iptal sonrası mizan eşitliği** senaryomuz.

Kaynak URL'ler: <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>,
<https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>.

**doğrulanacak:** Luca'nın kendi ürününde otomatik test/kabul testi yaklaşımı ve yayın öncesi
doğrulama adımları — kaynak: Luca teknik dokümanı veya bayisi (sitede bilgi yok).
**doğrulanacak:** Luca'nın Excel aktarımında zorunlu sütunlar ve hata raporu biçimi — kaynak: Luca
kullanım kılavuzu; bizim aktarım testlerinin veri biçimi buna göre uyarlanır.

## 3. Bizde bugün

**Olanlar (kanıtlı).**

- **CI her push ve PR'da koşar.** `.github/workflows/ci.yml:3-5` (`on: push` + `pull_request`).
- **Beş iş vardır.**
  - `legacy` (`ci.yml:8-22`): Playwright'sız, Node ve Python testleri — `node --test
    tools/legacy/extract.test.mjs` (`:20`) ve `python -m unittest discover -s tools/legacy -p 'test_*.py'`
    (`:22`).
  - `server` (`ci.yml:24-48`): `postgres:16-alpine` servisi (`:26-33`), `TEST_DATABASE_URL` ortam
    değişkeni (`:35`), .NET 10 kurulumu (`:38-40`), derleme (`:43`), `dotnet test` (`:44`) ve
    **EF modeli ↔ migration uyumu** kontrolü (`:45-48`).
  - `client` (`ci.yml:50-64`): `npm ci`, `npm run lint`, `npm run build`.
  - `mobile` (`ci.yml:66-80`): `typecheck` ve `expo export --platform android`.
  - `e2e` (`ci.yml:82-142`): `needs: [server, client]` (`:84`), kendi `postgres:16-alpine` servisi
    (`:85-93`), API'yi örnek veriyle başlatma (`:102-107`), panel derlemesi + `vite preview`
    (`:108-115`), şoför uygulamasının web önizlemesi (`:116-121`), üç servisin sağlığını bekleme
    (`:122-128`), `npx playwright test` (`:129-131`), hatada `client/test-results` ve `/tmp/api.log`
    artefaktı (`:136-142`).
- **Yayın sonrası `Canlı kontrol`.** `.github/workflows/smoke.yml:3`; yeni sürümün yayına çıkmasını
  bekler (`:18-28`), panelin açıldığını ve girişsiz isteğin 401 döndüğünü doğrular (`:30-37`).
- **Ayna işi.** `.github/workflows/mirror.yml:6`; günde dört kez (`:9-10`) çalışır,
  `permissions: contents: read` (`:22-23`), `concurrency: group: mirror` (`:25-27`), indirdiği veriyi
  iş bitince siler (`:60-62`).
- **Sunucu testleri gerçek PostgreSQL kullanır.** `server/YesLojistik.Tests/Integration/ApiFactory.cs:17`
  her test sınıfı için **geçici bir veritabanı** açar (`:27`, `:37`), sonunda siler (`:61-70`).
  Bugün `server/YesLojistik.Tests` altında **55 dosya**, toplam **221 `[Fact]`/`[Theory]`** vardır.
- **Mevcut kapsam örnekleri (bugünkü taban).**
  - e-belge: `server/YesLojistik.Tests/Integration/EInvoiceTests.cs:13` (5 test, `:40-125`).
  - KDV/tevkifat: `server/YesLojistik.Tests/Integration/VatRulesTests.cs:10` (5 test, `:36-123`).
  - fatura hesabı: `server/YesLojistik.Tests/Unit/InvoiceCalculatorTests.cs:6` (5 test, `:8-47`).
  - sevkiyat kazancı: `server/YesLojistik.Tests/Unit/TripProfitTests.cs:11` (5 test, `:16-74`).
  - denetim izi: `server/YesLojistik.Tests/Integration/AuditTests.cs:9-13`.
  - aktarım: `server/YesLojistik.Tests/Integration/ImportTests.cs:11` (4 test, `:36-106`).
  - lisans/salt okuma: `server/YesLojistik.Tests/Integration/LicenseTests.cs:45`, `:143`.
  - rapor ve dışa aktarma: `server/YesLojistik.Tests/Integration/ReportsAndExportsTests.cs:10`
    (5 test, `:38-193`).
  - dosya türü doğrulama: `server/YesLojistik.Tests/Unit/AttachmentSniffTests.cs:6-25`.
- **e-belge sahte sağlayıcı deseni vardır.** `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs:21-28`
  kayıt tablosu; `:26` `"mock"` anahtarı `MockEInvoiceProvider` üretir. Sınıfın kendisi
  `server/YesLojistik.Infrastructure/EInvoice/Providers.cs:30` (yanında `:10` `ManualXmlProvider`).
  Kayıtlı olmayan sağlayıcı adı sunucuyu düşürmez, `manual`'a düşer (`EInvoiceProviders.cs:39-49`).
  Yani "gerçek entegratör olmadan akışı test et" imkânı bugün **hazırdır**.
- **Migration testi (kısmen) vardır.** `server/YesLojistik.Tests/Integration/MigrationTests.cs:11`
  sunucu taşınması yönlendirmesini, `:30` ise göç kontrolü için istatistik ucunun beklenen alanları
  döndüğünü sınar. Ancak bu bir **veri göçü** testidir; **şema migration** testi (boş + dolu
  veritabanı) yoktur.
- **e2e envanteri.** `client/e2e/` altında **25 spec dosyası**, toplam **60 `test(...)`**. Playwright
  yapılandırması: `testDir ./e2e` (`client/playwright.config.ts:5`), `workers: 1` ve
  `fullyParallel: false` (`:8-9`), iki proje — masaüstü 1440×900 ve mobil 375×812 (`:19-20`).
  Yardımcılar: `client/e2e/helpers.ts:9-15` giriş, `:32-41` seçim, `:44-46` yeni görünüm anahtarı.
- **Yerel ortam gerçeği.** Bu makinede .NET **8** SDK vardır (proje .NET 10 ister), PostgreSQL ve
  Playwright Chromium yoktur; bu yüzden `dotnet test` ve e2e **yerelde koşmaz**
  (`docs/plan/31-TEST-CI.md:43-45`). Yerelde yalnız `npm run lint` + `npm run build` çalışır.
- **Test silme/atlama yasağı yazılıdır.** `docs/plan/31-TEST-CI.md:79-80` ve
  `docs/KOLAYLASTIRMA-UYGULAMA.md:498`.

**Eksikler (kanıtlı).**

1. **Muhasebe çekirdeği için hiç altın senaryo yoktur.** Yevmiye, mizan ve e-Defter henüz kodda
   olmadığı için (`docs/plan-erp/02-LUCA-ENVANTERI.md:89-92`) bu testler de yoktur.
2. **Mizan eşitliği testi yoktur.** "Borç = Alacak" kapısı yoktur; kapanmış dönem kontrolü de
   olmadığı için hatalı fiş canlıya çıkabilir.
3. **Çok şirketli izolasyon testi yoktur.** Bugün `CompanySettings` tek satırdır
   (`server/YesLojistik.Core/Entities/CompanySettings.cs:5`: `Id = 1`); çok şirketli yapı gelmeden bu
   test yazılamaz, ama **kapı** şimdiden tanımlanmalıdır.
4. **Yetki matrisi testi yoktur.** Politikalar tanımlıdır (`server/YesLojistik.Api/Program.cs:79-84`;
   `server/YesLojistik.Api/Auth/Policies.cs:7-17`) ama rol × uç tablosunu topluca doğrulayan bir test
   yoktur; yeni uç eklendiğinde yanlış politika sessizce kalabilir.
5. **Migration testi eksiktir.** Şema migration'ı yalnız "bekleyen model değişikliği var mı" diye
   denetlenir (`ci.yml:45-48`); boş veritabanına kurulum ve **dolu** veritabanında yükseltme testi
   yoktur.
6. **Kapsam (coverage) hedefi yoktur.** Hiçbir iş kapsam ölçmez; `dotnet test` ve `playwright test`
   yalnız geçti/kaldı bilgisi üretir.
7. **Performans testi işi yoktur.** CI süresi ≈9-11 dakikadır (`docs/plan/31-TEST-CI.md:42`); yük
   testi hiç koşmaz.
8. **Yuvarlama testleri sınırlıdır.** `InvoiceCalculatorTests.cs` ve `VatRulesTests.cs` vardır ama
   tevkifat artığı, satır bazlı iskonto, kur farkı ve gider dağıtım artığı için **sistematik** test
   yoktur.
9. **Göç/aktarım testleri dar kapsamlıdır.** `ImportTests.cs` bugünkü Excel/CSV akışını sınar; muhasebe
   devir (açılış fişi) aktarımı ve eski sistemden geçmiş taşıma senaryosu yoktur.
10. **`Canlı kontrol` derinlik kontrolü yapmaz.** Yalnız sayfa açılışı ve 401 denetimi vardır
    (`smoke.yml:30-37`); yeni ERP modülleri için canlıda giriş yapıp bir kayıt açma senaryosu yoktur.
11. **`Pratikortam aynası` doğrulama testi koşmaz.** `tools/legacy/prova.py` ve
    `tools/legacy/snapshot_validation.py` vardır ama `mirror.yml` bunları çağırmaz; iş yalnız
    `extract.mjs` + `mirror.py` çalıştırır (`mirror.yml:52-59`).
12. **Test verisi üretimi tek kaynaktır.** Örnek veri `Seed:SampleData` ile yüklenir
    (`server/YesLojistik.Api/Program.cs:153-154`); ölçekli/hacimli test verisi üretici yoktur.
13. **Kırılan test politikası yazılıdır ama kapı yoktur.** "Test silinmez" kuralı belgede vardır
    (`docs/plan/31-TEST-CI.md:79-80`) fakat CI, silinen/atlanan testi tespit etmez.

## 4. Hedef ekranlar ve alanlar

Bu doküman bir modül değil bir **altyapı** dokümanıdır; §4 bu yüzden iki parçadan oluşur: (a) kalite
panosu ekranı, (b) test dosyası ve CI işi envanteri ("alan" karşılığı).

**4.1. Kalite Panosu ekranı (yeni).** Yönetici ve geliştirici için salt okuma ekranı.

| Alan | Tip | Kaynak |
|---|---|---|
| Son CI koşusu | bağlantı | GitHub Actions run |
| İş durumları | liste | `legacy`, `server`, `client`, `mobile`, `e2e`, `performans`, `migration` |
| Sunucu test sayısı (geçti/kaldı/atlandı) | sayı | `TestRun` |
| e2e test sayısı | sayı | `TestRun` |
| Kapsam (satır %) | yüzde | `CoverageSnapshot` |
| Altın senaryo durumu | liste | `GoldenScenario` |
| Kırılan/atlanan test uyarısı | uyarı | Atlanan test sayısı > 0 ise kırmızı |
| Performans sonucu | tablo | §5.1 hedefleri karşılaştırması |
| Migration testi sonucu | rozet | Boş + dolu veritabanı |
| Kapsam trendi | grafik | Son 30 koşu |

**4.2. Test dosyası ve CI işi envanteri (hedef).**

| İş / dosya | Konum | Ne sınar |
|---|---|---|
| `golden-ledger.spec` | `server/YesLojistik.Tests/Golden/` | Belge → fiş → mizan eşitliği |
| `rounding.spec` | `server/YesLojistik.Tests/Unit/` | Kuruş, KDV, tevkifat, kur farkı, dağıtım |
| `isolation.spec` | `server/YesLojistik.Tests/Integration/` | Şirketler arası veri/dosya/önbellek sızıntısı |
| `permissions.spec` | `server/YesLojistik.Tests/Integration/` | Rol × uç × metot matrisi |
| `einvoice-mock.spec` | `server/YesLojistik.Tests/Integration/` | `mock` sağlayıcı akışları |
| `import-migration.spec` | `server/YesLojistik.Tests/Integration/` | Excel/CSV, devir, geçmiş taşıma |
| `migration-empty.spec` / `migration-full.spec` | `server/YesLojistik.Tests/Migration/` | Boş + dolu veritabanı |
| `coverage` işi | `.github/workflows/ci.yml` | Kapsam eşiği |
| `performance` işi | `.github/workflows/perf.yml` (yeni) | §5.1 hedefleri |
| `erp/*.spec.ts` | `client/e2e/erp/` | Her yeni modül için en az 1 senaryo |

**4.3. Altın senaryo kataloğu (veri, ekran değil).** Her senaryo için zorunlu alanlar: senaryo adı,
amaç, girdi belgeleri, beklenen fiş satırları (hesap kodu, borç, alacak), beklenen mizan toplamı,
beklenen KDV/tevkifat, yuvarlama notu, kabul toleransı (0,00 TL), ilgili doküman.

## 5. İş kuralları

**5.1. Muhasebe motoru altın senaryoları.** Her senaryo **belge → fiş → mizan** zincirini baştan sona
koşturur ve üç kapıdan geçer: (a) fiş satırlarında borç toplamı = alacak toplamı (kuruş düzeyinde,
tolerans 0,00); (b) fişteki hesaplar hesap planında vardır ve kilitli değildir; (c) mizan toplamı fiş
toplamıyla uyuşur. Zorunlu senaryolar: satış faturası (KDV dâhil/hariç, tevkifatlı/tevkifatsız),
alış faturası, iade faturası, **fatura iptali sonrası mizan eşitliği**, tahsilat ve mahsup, tedarikçi
ödemesi, kasa/banka virmanı, çek tahsili ve cirosu, karşılıksız çek, masraf gideri, şoför avansı ve
mahsubu, personel maaş/prim, sabit kıymet alımı ve amortisman, stok giriş/çıkış ve maliyet, üretim
tüketimi, dövizli işlem ve kur farkı, devir (açılış) fişi, dönem kapanışı ve yıl sonu devri. Her
senaryo `06-MUHASEBE-MOTORU.md`'deki kuralla birebir eşleşir; çelişki varsa **doküman** düzeltilir.

**5.2. Yuvarlama testleri.** Kurallar: para 2 kuruş (`docs/plan-erp/01-ORTAK-SARTNAME.md:58`); satır
tutarı yuvarlanır, **toplam satır toplamıdır** (yeniden yuvarlanmaz); KDV oran uygulaması satır
bazındadır; tevkifat, KDV dâhil toplam üzerinden hesaplanır; artık farkı **en büyük satıra** yazılır.
Zorunlu test durumları: 0,005 sınırı (banker yuvarlaması **değil**, yarım yukarı kuralı), negatif tutar
(iade), 1 kuruşluk dağıtım artığı (3 satıra bölünen 0,01), tevkifat artığı, iskonto sonrası KDV,
kur farkı yuvarlaması, çoklu para biriminde toplam farkı. Her test, sonucu kuruş kuruş yazar; "yaklaşık"
karşılaştırma **yasaktır** (tolerans 0,00).

**5.3. Çok şirketli izolasyon testleri.** Her uç için: A şirketinin kullanıcısı B şirketinin kaydını
`GET` ile **alamaz** (404), `PUT`/`DELETE` ile **değiştiremez** (404), listeler yalnız kendi şirketini
döner, toplam uçları yalnız kendi şirketini sayar, dosya indirme yolu şirket kontrolünden geçer,
önbellek anahtarı şirketle ayrılır, rapor ve dışa aktarma yalnız kendi şirketini içerir, seri/numara
sayaçları şirket bazında ayrıdır, denetim izi şirketler arası görünmez. Testler **iki şirketli**
tohum veriyle koşar; tek şirketli varsayım kabul edilmez.

**5.4. Yetki matrisi testleri.** Tek bir kaynak tablo (sunucuda sabit) rol × uç × metot için beklenen
sonucu tanımlar: `200`, `403`, `404`. Test, tablodaki **her satırı** dolaşır ve uçtan gerçek istek
atar. Tabloda olmayan yeni uç varsa test **başarısız** olur ("kapsanmamış uç"), böylece yeni uç
ekleyen geliştirici politikayı da yazmak zorunda kalır. Kapsanan politikalar:
`Policies.Operations`, `Policies.Accounting`, `Policies.Admin`, ofis varsayılanı
(`server/YesLojistik.Api/Program.cs:79-84`), ayna reddi
(`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-28`) ve lisans salt okuma
(`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:22-41`).

**5.5. E-belge sahte sağlayıcı testleri.** Mevcut `mock` deseni (`EInvoiceProviders.cs:26`,
`Providers.cs:30`) genişletilir: başarılı gönderim, geçici hata + yeniden deneme, kalıcı hata, iptal
isteği (`CancelRequested`) ve iptal onayı (`Cancelled`), durum yoklaması
(`server/YesLojistik.Api/Infrastructure/EInvoiceStatusWorker.cs`), ETTN tekilliği, aynı faturanın iki
kez gönderilmemesi (idempotency). Sahte sağlayıcı **gecikme ve hata enjeksiyonu** yapabilir (örn.
`Mock:DelayMs`, `Mock:FailFirstN`), böylece kuyruk ve yeniden deneme davranışı gerçek entegratör
olmadan sınanır. Testler `EInvoice:Provider=mock` ile koşar; **canlıya mock ile çıkılmaz** (sağlayıcı
adı `manual` veya gerçek entegratördür).

**5.6. Göç/aktarım testleri.** Senaryolar: (a) cari kart Excel'i (zorunlu sütunlar, hatalı satır
raporu, kısmi aktarım); (b) stok kartı ve açılış miktarı; (c) açılış fişi (devir) aktarımı ve mizan
eşitliği; (d) geçmiş fatura/tahsilat aktarımı ve cari bakiye mutabakatı; (e) aynı dosyanın iki kez
yüklenmesi → **çift kayıt oluşmaması**; (f) 20.000 satırlık dosya → kuyruğa alınır ve bellek taşması
olmaz; (g) hatalı/eksik başlıklı dosya → anlaşılır Türkçe hata; (h) Türkçe karakter, binlik ayracı,
tarih biçimi (`03.10.2026`) dönüşümü. Aktarım testleri `tools/legacy/` çözümleyicileriyle aynı
davranışı paylaşır; ortak kural `tools/legacy/turkce.py` ve `tools/legacy/test_turkce.py` ile korunur.

**5.7. Her yeni modül için en az bir e2e senaryosu.** Kural: `docs/plan-erp/` altındaki her modül
dokümanı (§9 ve §10) en az bir `client/e2e/erp/<modül>.spec.ts` senaryosu yazar. Senaryo; **liste
açılışı**, **kayıt oluşturma**, **kaydetme doğrulaması** ve **yetkisiz kullanıcı görmemesi** adımlarını
içerir. Yeni spec'ler önce arama/süzme yapar (`AGENTS.md:70`: birikmiş örnek veri ilk sayfayı
doldurur). Telefon davranışı için ayrı `*-mobile.spec.ts` gerekir
(`client/playwright.config.ts:19-20`).

**5.8. Performans testi işi.** `36-PERFORMANS-OLCEK.md` §5.1 hedefleri ölçülür. İş gecelik ve etiketli
dalda koşar; sonuç JSON artefaktı olarak saklanır (30 gün). Eşik aşılırsa iş başarısız olur ve
`TestRun` kaydına "regresyon" olarak işlenir. Tohum verisi hacmi: 500.000 sevkiyat, 2.000.000 gider,
200.000 fatura, 2.000.000 denetim kaydı.

**5.9. Migration testi (boş + dolu veritabanı).** İki ayrı test: (a) **boş** veritabanına sıfırdan
`MigrateAsync` → şema oluşur, uygulama ayağa kalkar, `/api/health` 200; (b) **dolu** veritabanına
(bir önceki sürümün şeması + temsili veri) yükseltme → veri kaybı olmaz, satır sayıları korunur,
yeni sütunlar boş gelir, uygulama ayağa kalkar. Kural: migration yalnız ekleme yapar
(`AGENTS.md:29`); veri silen/dönüştüren migration **CI'da reddedilir**. Dolu veritabanı görüntüsü
depoda **veri olarak değil**, şema + üretici betik olarak tutulur (kişisel veri depoya girmez,
`AGENTS.md:22`).

**5.10. Kapsam (coverage) hedefi.** Sunucu: `dotnet test --collect:"XPlat Code Coverage"` ile satır
kapsamı; **çekirdek** (muhasebe motoru, para/yuvarlama, yetki, denetim, izolasyon) için **≥ %85**,
genel çözüm için **≥ %70**. Panel: e2e senaryo kapsamı (ekran bazında) izlenir; her liste ekranı ve her
form için en az bir senaryo zorunludur. Kapsam **düşerse** CI başarısız olur (eşik altına inen
değişiklik reddedilir). Kapsam artırmak için test silme/atlama yapılamaz (bkz. §5.12).

**5.11. Yerelde koşulamayan testlerin CI'da koşması kuralı.** Kural: **bir testin koşmadığı yer,
"geçti" sayılmaz.** Bu makinede .NET 10 SDK ve PostgreSQL yoktur, Playwright Chromium yoktur
(`docs/plan/31-TEST-CI.md:43-45`); bu yüzden sunucu, migration, performans ve e2e testleri **zorunlu
olarak CI'da** koşar. Yerelde yalnız `client` lint + build (`npm.cmd` ile) ve Python/Node araç testleri
koşabilir. Yerel koşu yapılmadıysa "yerelde doğrulandı" **denmez**; rapor "CI'da doğrulanacak" der.
Yeni bir test eklendiğinde CI'da **gerçekten koştuğu** kanıtlanır (test sayısı artışı `TestRun`
kaydında görünür); sayı artmıyorsa test koşmuyordur.

**5.12. Test verisi üretme.** Kaynaklar: (a) `Seed:SampleData` (`Program.cs:153-154`) — küçük, uydurma,
geliştirme verisi; (b) **üretici betik** (`tools/testdata/` altında, yeni) — parametreli: şirket sayısı,
kullanıcı sayısı, yıl, sevkiyat/gider/fatura sayısı, dağılım; (c) **altın veri dosyaları** — muhasebe
senaryolarının beklenen çıktıları (JSON). Kurallar: **gerçek kişisel veri kullanılmaz**
(`AGENTS.md:22`, `:20`); pratikortam verisi asla kopyalanmaz; TCKN/VKN/IBAN **geçerli ama uydurma**
algoritmik değerlerdir; isimler kurgudur; tutarlar tekrarlanabilir (sabit tohum). Üretici betik
deterministiktir: aynı tohum aynı veriyi üretir; böylece test sonuçları karşılaştırılabilir. Gerçek
kişisel veriyle test **yasaktır**; istisna gerekiyorsa (ör. üretim hatasını birebir yeniden üretmek)
**hukuk danışmanı onayı gerekir** ve veri maskelenir, iş bitince silinir.

**5.13. Kırılan test politikası.** (1) Test **silinemez**, `Skip`/`Ignore` **eklenemez**
(`docs/plan/31-TEST-CI.md:79-80`, `docs/KOLAYLASTIRMA-UYGULAMA.md:498`). (2) Bir test artık geçersizse
gerekçesiyle **güncellenir**; gerekçe commit mesajında ve ilgili modül dokümanında yazılır. (3) CI,
atlanan test sayısı 0'dan büyükse **başarısız olur** (yeni kapı). (4) Test sayısı azalırsa
(`TestRun` karşılaştırması) CI **başarısız olur**. (5) Kırılan test, ilgili kod düzeltilerek geçirilir;
"testi kapatıp kod gönderme" yasaktır. (6) Geçici olarak kırılan (flaky) test işaretlenir ve **3 iş
günü içinde** düzeltilir; süre aşılırsa iş kalemi olarak yükseltilir.

**5.14. `Canlı kontrol` genişletmesi.** Yeni adımlar: (a) her ERP modülünün ana ekranı giriş yapılarak
açılır (demo değil, canlıda **yalnız okuma**; yazma yapan kontrol yapılmaz); (b) `/api/health` yanıt
süresi ölçülür ve 3 saniyeyi aşarsa uyarı; (c) sürüm numarası beklenen commit ile eşleşir
(`smoke.yml:18-28` genişletilir); (d) yeniden yönlendirme (`App:RedirectTo`) varsa 308 davranışı
doğrulanır (`server/YesLojistik.Tests/Integration/MigrationTests.cs:11`).

**5.15. `Pratikortam aynası` genişletmesi.** İş, indirdikten sonra **doğrulama** adımı koşar:
`tools/legacy/snapshot_validation.py` ve `tools/legacy/prova.py` çağrılır; beklenen/gerçek kayıt
sayıları karşılaştırılır, bir türün yarısından fazlası silinecekse uygulama **durdurulur**
(`mirror.yml:17-20` seçeneği zorunlu hâle gelir). Loga yalnız sayı yazılır
(`mirror.yml:59`); indirilen veri iş bitince silinir (`:60-62`). Ayna işi çalışırken `main`'e alım
yapılmaz (`docs/plan/31-TEST-CI.md:76-77`).

## 6. Veri modeli

Test altyapısı da veri tutar; hepsi **yeni tablo**dur ve `CompanyId` taşır
(`docs/plan-erp/05-VERI-MODELI.md:39-40`). Migration kuralı: yalnız ekleme (`AGENTS.md:29`).

1. `TestRun` — `Id`, `CompanyId`, `RunId` (CI koşu kimliği), `Workflow`, `Job`, `Commit`, `Branch`,
   `StartedAt`, `FinishedAt`, `Status` (Success/Failure/Cancelled), `TotalTests`, `Passed`, `Failed`,
   `Skipped`, `DurationMs`, `ArtifactUrl`, `Note`.
2. `CoverageSnapshot` — `Id`, `CompanyId`, `TestRunId`, `Scope` (Core/Infrastructure/Api/Client),
   `LinePercent`, `BranchPercent`, `Threshold`, `Passed`, `At`.
3. `GoldenScenario` — `Id`, `CompanyId`, `Code`, `Title`, `Document` (JSON: belge), `ExpectedLines`
   (JSON: hesap, borç, alacak), `ExpectedTotals` (JSON: KDV, tevkifat, genel toplam), `Tolerance`
   (decimal, varsayılan 0), `ModuleDoc`, `IsActive`.
4. `GoldenRun` — `Id`, `CompanyId`, `GoldenScenarioId`, `TestRunId`, `At`, `Passed`, `DiffJson`.
5. `PermissionMatrixRow` — `Id`, `CompanyId`, `Method`, `Path`, `Role`, `Expected` (200/403/404),
   `Source` (kural/istisna), `Note`.
6. `TestDataProfile` — `Id`, `CompanyId`, `Name`, `Seed`, `Companies`, `Users`, `Years`, `Trips`,
   `Expenses`, `Invoices`, `AuditRows`, `CreatedBy`, `CreatedAt`.
7. `MigrationRun` — `Id`, `CompanyId`, `FromMigration`, `ToMigration`, `Mode` (Empty/Full), `At`,
   `DurationMs`, `RowsBefore`, `RowsAfter`, `Status`, `Note`.

**İlişkiler.** `TestRun` ← `CoverageSnapshot`, `GoldenRun`, `MigrationRun`; `GoldenScenario` ←
`GoldenRun`; `TestDataProfile` → `TestRun` (hangi veriyle koşuldu). Yüksek hacimli tablolar
(`TestRun`, `GoldenRun`) 180 günden eski satırları otomatik silinir (politika: `35`); indeksler
`At` ve `(CompanyId, Workflow, Job)` üzerindedir.

## 7. API uçları

| Metot | Yol | Amaç | Yetki |
|---|---|---|---|
| POST | `/api/qa/test-runs` | CI sonucu bildir (jetonla) | Servis jetonu |
| GET | `/api/qa/test-runs` | Koşu listesi (süzgeç: iş, dal, durum, tarih) | Admin |
| GET | `/api/qa/test-runs/{id}` | Koşu ayrıntısı (kırılan test listesi) | Admin |
| GET | `/api/qa/coverage` | Kapsam anlık görüntüleri ve eşik durumu | Admin |
| GET | `/api/qa/golden` | Altın senaryo listesi ve son sonuçları | Admin, Muhasebe |
| POST | `/api/qa/golden/run` | Senaryoyu elle koştur | Admin, Muhasebe |
| GET | `/api/qa/permissions` | Yetki matrisi kapsama durumu | Admin |
| GET | `/api/qa/migrations` | Migration test sonuçları | Admin |
| POST | `/api/qa/test-data` | Test verisi profili oluştur (yalnız geliştirme ortamı) | Admin |
| GET | `/api/qa/health-report` | Haftalık kalite raporu (JSON/PDF) | Admin |

`POST /api/qa/test-runs` ucu **yalnız geliştirme/CI ortamında** açıktır ve ayrı bir jeton
(`QA:IngestToken`, ortam değişkeni) ister; sır dosyaya yazılmaz (`AGENTS.md:23`). Liste uçları
`PagedResult<T>` sözleşmesini kullanır
(`server/YesLojistik.Infrastructure/Services/QueryExtensions.cs:23-31`).

## 8. Yetki, onay ve denetim izi

| İş | Yönetici | Muhasebe | Operasyon | Şoför | CI jetonu |
|---|---|---|---|---|---|
| Kalite panosu görme | ✔ | — | — | — | — |
| Altın senaryo listesi | ✔ | ✔ | — | — | — |
| Altın senaryo elle koşma | ✔ | ✔ | — | — | — |
| Test verisi üretme | ✔ (yalnız dev) | — | — | — | — |
| CI sonucu bildirme | — | — | — | — | ✔ |
| Migration testi tetikleme | ✔ | — | — | — | — |

- **Onay.** Altın senaryo **beklenen değerini değiştirmek** ikinci onay ister: beklenen tutarı testi
  geçirmek için değiştirmek, hatayı gizlemenin en kolay yoludur. Değişiklik `GoldenScenario` sürümü ve
  denetim izi kaydıyla yapılır (`35`).
- **Denetim izi.** Test verisi üretimi, altın senaryo değişikliği, kapsam eşiği değişikliği ve CI
  jetonu kullanımı denetim iznine yazılır. `TestRun` kayıtları silinemez (append-only yaklaşımı),
  yalnız süresi dolunca silinir.
- **Sır.** CI jetonu ve sahte sağlayıcı ayarları dosyaya yazılmaz; ortam değişkeni/GitHub Secret
  olarak verilir (`AGENTS.md:23`). Test çıktıları kişisel veri içermez; test verisi uydurmadır
  (`AGENTS.md:22`).
- **Ayna ve lisans.** Testler ayna açıkken yazma denemelerinin reddedildiğini
  (`MirrorWriteGuard.cs:14-28`) ve lisans salt okumada `POST` isteklerinin 403 döndüğünü
  (`LicenseGuard.cs:22-41`) doğrular.

## 9. Kabul kriterleri

1. Altın senaryoların **tamamı** geçer; her senaryoda borç = alacak ve mizan eşitliği **0,00 TL**
   toleransla doğrulanır.
2. Yuvarlama testleri: 0,005 sınırı, negatif tutar, 1 kuruş dağıtım artığı, tevkifat artığı ve kur
   farkı durumlarının her biri için en az bir test vardır ve geçer.
3. İzolasyon testleri iki şirketli tohum veriyle koşar; hiçbir uçtan şirketler arası veri sızmaz.
4. Yetki matrisi testi **kapsanmamış uç bırakmaz**; yeni uç eklendiğinde test kırmızıya döner.
5. `mock` sağlayıcı ile gönderim, hata, yeniden deneme, iptal ve durum yoklaması senaryoları geçer.
6. Aktarım testleri: çift kayıt oluşmaz, 20.000 satır kuyruğa alınır, hatalı dosya anlaşılır Türkçe
   hata verir.
7. Her yeni ERP modülü için en az bir e2e senaryosu vardır; e2e test sayısı **azalmaz**.
8. Performans işi §5.1 hedeflerini ölçer; eşik aşılırsa iş başarısız olur.
9. Migration testi hem **boş** hem **dolu** veritabanında geçer; veri silen migration CI'da reddedilir.
10. Kapsam eşiği: çekirdek ≥ %85, genel ≥ %70; eşik altına inen değişiklik reddedilir.
11. CI, **atlanan test sayısı > 0** veya **test sayısı azaldı** durumunda başarısız olur.
12. `Canlı kontrol` her ERP modülünün ana ekranını açar ve `/api/health` süresini ölçer.
13. `Pratikortam aynası` işi doğrulama adımını koşar; toplu silme koruması çalışır.
14. Sunucu, migration, performans ve e2e testleri **CI'da** koşar; yerelde koşulmayan test "geçti"
    sayılmaz.

## 10. Testler

Bu dokümanın kendi doğrulaması "testlerin testi"dir:

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `RoundingRulesTests.cs` — 0,005 sınırı, artık dağıtımı, negatif tutar, tevkifat artığı.
- `PermissionMatrixTests.cs` — matris satırlarının tekilliği, kapsanmamış uç tespiti.
- `TestDataSeedTests.cs` — determinizm (aynı tohum = aynı veri), kişisel veri içermeme kontrolü.
- `CoverageThresholdTests.cs` — eşik hesabı, düşüş tespiti.

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `GoldenLedgerTests.cs` — §5.1 senaryolarının tamamı, belge → fiş → mizan.
- `MultiCompanyIsolationTests.cs` — §5.3 matrisi.
- `ApiPermissionTests.cs` — §5.4 matrisi; `403` ve `404` ayrımı.
- `EInvoiceMockTests.cs` — `EInvoiceProviders.cs:26` mock sağlayıcısıyla beş akış.
- `ImportMigrationTests.cs` — §5.6 senaryoları (mevcut `ImportTests.cs:11` genişletilir).
- `MirrorAndLicenseGuardTests.cs` — ayna reddi ve salt okuma 403 (mevcut `LicenseTests.cs:45`, `:143`
  genişletilir).
- `AuditImmutabilityTests.cs` — denetim kaydı silinemez (`35` ile ortak).

**Migration testleri (yeni klasör).** `server/YesLojistik.Tests/Migration/`:

- `EmptyDatabaseMigrationTests.cs` — sıfırdan kurulum, `/api/health` 200.
- `FullDatabaseMigrationTests.cs` — dolu veritabanında yükseltme, satır sayısı korunur.
- `AdditiveOnlyMigrationTests.cs` — migration'larda `DropColumn`/`DropTable`/`AlterColumn` (daraltan)
  yok; ihlal varsa başarısız.

**Performans testleri.** `server/YesLojistik.Tests/Performance/`:

- `ListPagePerfTests.cs`, `TotalsPerfTests.cs`, `ReportPerfTests.cs`, `InvoiceIssuePerfTests.cs`,
  `ConcurrencyPerfTests.cs` — §5.1 tablosunun ölçümü, JSON çıktı, eşik karşılaştırması.

**Tarayıcı testleri** (`client/e2e/erp/`, yeni klasör — mevcut desen `client/playwright.config.ts:5-9`):

- `ledger.spec.ts` — yevmiye fişi listesi ve detayı, mizan eşitliği rozeti.
- `stock.spec.ts` — stok kartı, hareket, sayım farkı.
- `contact.spec.ts` — cari kart, hareket, mahsup, yaşlandırma.
- `purchase.spec.ts` — talep → sipariş → mal kabul → fatura.
- `cash.spec.ts` — kasa hareketi, gün sonu, virman.
- `report.spec.ts` — rapor açılışı ve Excel indirme.
- `settings.spec.ts` — şirket/mali yıl/seri/varsayılanlar.
- Her biri için `*-mobile.spec.ts` (telefon 375×812, `playwright.config.ts:20`).
- Mevcut testler korunur: `client/e2e/security.spec.ts:25-47`,
  `client/e2e/new-ui/basics.spec.ts` vb.

**Kapılar (CI).** `legacy` + `server` + `client` + `mobile` + `e2e` yeşil; `migration` işi yeşil;
`coverage` eşiği geçilmiş; atlanan test 0; test sayısı azalmamış; gecelik `performans` işi yeşil
(veya bilinen bir regresyon için gerekçeli kayıt). Kural: test silinmez, atlanmaz
(`docs/plan/31-TEST-CI.md:79-80`).

## 11. Efor ve bağımlılıklar

| İş | Kişi-gün |
|---|---|
| Altın senaryo kataloğu + beklenen fiş verisi (20 senaryo) | 6 |
| `GoldenLedger` test altyapısı ve mizan eşitliği kapısı | 5 |
| Yuvarlama test paketi | 3 |
| Çok şirketli izolasyon test paketi | 4 |
| Yetki matrisi tablosu + kapsama testi + "kapsanmamış uç" kapısı | 4 |
| Sahte e-belge sağlayıcı genişletmesi + 5 akış testi | 3 |
| Aktarım/göç test paketi | 4 |
| Migration testleri (boş + dolu) + "yalnız ekleme" kapısı | 4 |
| Kapsam ölçümü, eşik, panosu | 3 |
| Performans testi işi ve eşik karşılaştırması | 5 |
| Test verisi üretici (deterministik) | 3 |
| e2e `erp/` senaryoları (8 modül × masaüstü + mobil) | 8 |
| Kalite panosu ekranı + CI sonuç bildirimi | 4 |
| `Canlı kontrol` ve `Pratikortam aynası` genişletmesi | 2 |
| 7 yeni tablo + migration + indeksler | 2 |
| **Toplam** | **≈60 kişi-gün** |

**Bağımlılıklar.** `06-MUHASEBE-MOTORU.md` (fiş ve mizan kuralları) **önce** — altın senaryolar ona
dayanır. `05-VERI-MODELI.md` (tablo/alan adları) **önce**. `07-YETKI-ONAY-NUMARALANDIRMA.md` (rol
matrisi) **önce** — yetki testleri onu doğrular. `30` (çok şirketli yapı) **önce** — izolasyon testleri
iki şirketli veri gerektirir. `36-PERFORMANS-OLCEK.md` hedefleri verir, bu doküman onları ölçer.
`38-GUVENLIK.md` güvenlik testlerini ve sızma testini üstlenir; bu doküman onların CI'da koşmasını
sağlar. `tools/docs/referans-denetimi.ps1` belge denetimini koşar
(`docs/plan-erp/01-ORTAK-SARTNAME.md:63-65`).

## 12. Riskler ve doğrulanacaklar

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | CI süresi 15 dakikayı aşar, geri bildirim yavaşlar | Yüksek | Orta | İşleri paralelleştirme, önbellek, ağır testleri gecelik işe taşıma |
| R2 | Yerelde koşulamayan testler "doğrulanmış" sanılır | Yüksek | Yüksek | §5.11 kuralı; rapor dili; `TestRun` sayı kanıtı |
| R3 | Altın senaryo beklenen değeri hatayı gizlemek için değiştirilir | Orta | Yüksek | İkinci onay + sürüm + denetim izi |
| R4 | Sahte sağlayıcı ile canlıya çıkılır | Düşük | Çok yüksek | Ortam kontrolü; `mock` yalnız Development/Test; CI kapısı |
| R5 | İzolasyon testleri tek şirketli varsayım yüzünden zayıf kalır | Orta | Çok yüksek | Zorunlu iki şirketli tohum veri; kapsama kapısı |
| R6 | Test verisi gerçek kişisel veri içerir | Düşük | Çok yüksek | Uydurma veri kuralı (`AGENTS.md:22`); üretici deterministik; tarama testi |
| R7 | Kapsam eşiği biçimsel test yazmaya iter, kalite artmaz | Orta | Orta | Çekirdek modüllerde yüksek eşik + davranış odaklı senaryolar |
| R8 | Performans testi kararsız (flaky) sonuç üretir | Orta | Orta | Sabit tohum, izole veritabanı, eşikte tolerans bandı, 3 koşu ortalaması |
| R9 | Dolu veritabanı migration testi depoyu şişirir | Orta | Düşük | Şema + üretici betik; veri depoda tutulmaz |
| R10 | `Pratikortam aynası` doğrulaması yanlış alarm üretir, ayna durur | Orta | Orta | Eşik ayarı + elle onay seçeneği; uyarı önce bildirilir |
| R11 | Yetki matrisi testi çok yavaşlar (uç × rol çarpımı) | Orta | Düşük | Matris işaretleme, yalnız değişen uçları koşma, paralel iş |
| R12 | Yeni e2e senaryoları birikmiş örnek veriyle kırılgan olur | Yüksek | Orta | Önce arama/süzme (`AGENTS.md:70`), kendi verisini üretme |

**doğrulanacak:** CI'da kapsam toplama aracının (`coverlet` vb.) .NET 10 ile uyumu ve çalışma süresi —
kaynak: araç dokümanı + deneme koşusu. **doğrulanacak:** GitHub Actions ücretsiz planının dakika
kotası ve gecelik performans işinin kotaya etkisi — kaynak: GitHub fiyat/kota sayfası.
**doğrulanacak:** dolu veritabanı migration testi için hangi sürümün (şema) temel alınacağı ve o
şemanın saklanma biçimi — kaynak: teknik ekip kararı. **doğrulanacak:** kapsam eşiklerinin (%85/%70)
gerçekçiliği — kaynak: ilk ölçüm sonucu; eşik ölçümden sonra kesinleşir. **doğrulanacak:** `mock`
sağlayıcının gerçek entegratör davranışını ne kadar temsil ettiği — kaynak: entegratör API dokümanı
(henüz elde yok; `docs/ENTEGRATOR-EKLEME.md`). **doğrulanacak:** Luca'nın Excel aktarımında zorunlu
sütunlar ve hata raporu biçimi — kaynak: Luca kılavuzu. **doğrulanacak:** `Canlı kontrol` işinin
canlıda giriş yapması için ayrı bir salt okuma hesabı gerekip gerekmediği ve şifre saklama biçimi —
kaynak: kullanıcı kararı + GitHub Secret.

Sonraki belgeyle bağlantı: `36-PERFORMANS-OLCEK.md` performans hedeflerini, `38-GUVENLIK.md` güvenlik
testleri ve sızma testi planını, `35-DENETIM-IZI-KVKK-UYUM.md` denetim izi testlerini, `00-DIZIN.md`
bütün setin durumunu tanımlar.
