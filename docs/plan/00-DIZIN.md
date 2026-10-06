# 00 — Dizin: pratikortam benzerliği uygulama planı

Bu klasör (`docs/plan/`), paneli **pratikortam kadar tanıdık, ondan daha sade ve şık** hâle getirme
işini ekran ekran uygulanabilir adımlara böler. Her belge gerçek koddan `dosya:satır` kanıtıyla
yazılmıştır; hiçbiri kodu değiştirmez, yalnız ne yapılacağını tarif eder.

- **Önce oku:** [`01-ORTAK-SARTNAME.md`](01-ORTAK-SARTNAME.md) — belge şablonu, değişmez kurallar,
  ortak teknik gerçekler, rota tablosu, kabul ölçütleri.
- **Durum tablosu:** aşağıdaki tabloda her belgenin durumu ve son doğrulama tarihi tutulur.
- **Yazım kuralı:** her belge 1.800–2.300 kelime; kanıtsız iddia yok; uydurma referans yok.
- **Kapsam dışı:** kod değişikliği, test çalıştırma, pratikortam'a erişim, gerçek müşteri verisi.

## Doğrulama durumu

- `00-DIZIN.md` ve `01-ORTAK-SARTNAME.md` içindeki satır referansları 5 Ekim 2026'da **elle** kodla
  karşılaştırıldı: `uiMode.ts:8/9/21/35-40`, `main.tsx:19`, `Layout.tsx:96`, `nav.ts:19-66/72-114/106`,
  `sections.ts:10/36/50`, `index.css:9/14/41/67/79/85/91/102/126`, `Menu.tsx:11/49/52/64`,
  `FilterPanel.tsx:7/35`, `SectionTabs.tsx:8`, `ui.tsx:108/112/126/132`, `TripsPage.tsx:16/341/466`,
  `DashboardPage.tsx:26/56/93`, `TripForm.tsx:154`, `textSize.ts:4`, `App.tsx:79-114`,
  `helpers.ts:44` → tamamı doğru.
- `client/src/index.css` içinde `data-ui` seçicisi **yok** (0 eşleşme) → yeni görünümün görsel
  karşılığı gerçekten eksik (`docs/plan/29-GORSEL-SISTEM.md` konusu).
- `client/e2e` altında **53** `test(...)` var (`AGENTS.md` "~47" diyor).
- `02`–`34` numaralı belgeler yazıldıktan sonra ayrı bir doğrulama turu her belgenin referanslarını
  kodla karşılaştırır; sonuç aşağıdaki durum sütununa işlenir.

## Nasıl kullanılır

1. Uygulayıcı (ajan), sıradaki belgeyi seçer (aşağıdaki önerilen sıra).
2. Belgenin §2 "Bugünkü durum" ve §10 "Uygulama adımları" bölümlerini okur.
3. Adımları uygular; her adım sonunda belgede yazan doğrulama komutunu çalıştırır.
4. Belgenin §11 "Kabul ölçütü" sağlanınca: testler → commit → `git pull --rebase origin main` →
   `git push origin HEAD:main` (`AGENTS.md` §3.6). Push = canlı yayın.
5. Bu dizindeki durum tablosunda ilgili satır "uygulandı" olarak işaretlenir.

## Belgeler

<!-- TABLO:BASLANGIC (bu blok tools/docs/referans-denetimi.ps1 -UpdateIndex ile uretilir) -->

| # | Belge | Konu | Kelime | Referans | Bozuk | Durum |
|---|---|---|---|---|---|---|
| 00 | [00-DIZIN.md](00-DIZIN.md) | Dizin: pratikortam benzerliği uygulama planı | 1170 | 16 | 0 | dizin |
| 01 | [01-ORTAK-SARTNAME.md](01-ORTAK-SARTNAME.md) | Ortak şartname (belge şablonu, kurallar, ortak gerçekler) | 2151 | 13 | 0 | sartname |
| 02 | [02-BUGUN.md](02-BUGUN.md) | Bugün ekranı | 2793 | 82 | 0 | yazildi |
| 03 | [03-SEVKIYATLAR-LISTE.md](03-SEVKIYATLAR-LISTE.md) | Sevkiyatlar listesi | 2624 | 51 | 0 | yazildi |
| 04 | [04-SEVKIYAT-FORMU.md](04-SEVKIYAT-FORMU.md) | Sevkiyat ekle/düzenle/kopyala formu | 2538 | 64 | 0 | yazildi |
| 05 | [05-E-FATURA.md](05-E-FATURA.md) | e-Fatura: gönderilen ve e-arşiv | 2445 | 60 | 0 | yazildi |
| 06 | [06-FATURALANDIRILACAKLAR.md](06-FATURALANDIRILACAKLAR.md) | Faturalandırılacaklar ve sayaç kutuları | 2364 | 85 | 0 | yazildi |
| 07 | [07-ALINAN-FATURALAR.md](07-ALINAN-FATURALAR.md) | Alınan (satın alma) faturaları | 2859 | 48 | 0 | yazildi |
| 08 | [08-MUSTERILER-CARI.md](08-MUSTERILER-CARI.md) | Müşteriler cari ekranı ve ekstre | 2488 | 60 | 0 | yazildi |
| 09 | [09-TEDARIKCILER-CARI.md](09-TEDARIKCILER-CARI.md) | Tedarikçiler cari ekranı ve ödemeleri | 2623 | 91 | 0 | yazildi |
| 10 | [10-TAHSILAT-ODEME-FORMLARI.md](10-TAHSILAT-ODEME-FORMLARI.md) | Tahsilat ve ödeme formları | 2419 | 77 | 0 | yazildi |
| 11 | [11-BANKALAR.md](11-BANKALAR.md) | Bankalar ve kasa | 2488 | 93 | 0 | yazildi |
| 12 | [12-CEKLER.md](12-CEKLER.md) | Çekler ve senetler | 2499 | 79 | 0 | yazildi |
| 13 | [13-HARITA-TAKIP.md](13-HARITA-TAKIP.md) | Harita, araç takip ve takip linki | 2418 | 63 | 0 | yazildi |
| 14 | [14-LISTE-MUSTERILER.md](14-LISTE-MUSTERILER.md) | Müşteri listesi | 2980 | 114 | 0 | yazildi |
| 15 | [15-LISTE-TEDARIKCILER.md](15-LISTE-TEDARIKCILER.md) | Tedarikçi listesi | 2535 | 91 | 0 | yazildi |
| 16 | [16-LISTE-SOFORLER.md](16-LISTE-SOFORLER.md) | Şoför listesi | 2709 | 89 | 0 | yazildi |
| 17 | [17-LISTE-PERSONEL.md](17-LISTE-PERSONEL.md) | Personel listesi | 2540 | 99 | 0 | yazildi |
| 18 | [18-LISTE-SABIT-ODEMELER.md](18-LISTE-SABIT-ODEMELER.md) | Sabit ödemeler | 2398 | 84 | 0 | yazildi |
| 19 | [19-OZ-MAL-MAZOTLAR.md](19-OZ-MAL-MAZOTLAR.md) | Mazotlar (yeni sayfa) | 2570 | 71 | 0 | yazildi |
| 20 | [20-OZ-MAL-GIDERLER.md](20-OZ-MAL-GIDERLER.md) | Giderler | 2452 | 51 | 0 | yazildi |
| 21 | [21-OZ-MAL-ARAC-MASRAFLARI.md](21-OZ-MAL-ARAC-MASRAFLARI.md) | Araç masrafları | 1417 | 19 | 0 | yazildi |
| 22 | [22-OZ-MAL-ARACLAR.md](22-OZ-MAL-ARACLAR.md) | Araçlar (öz ve kiralık) | 1253 | 11 | 0 | yazildi |
| 23 | [23-ANALIZ.md](23-ANALIZ.md) | Analiz: Genel Bakış ve sekmeler | 1294 | 11 | 0 | yazildi |
| 24 | [24-RAPORLAR-MUHASEBE.md](24-RAPORLAR-MUHASEBE.md) | Raporlar, yaşlandırma ve muhasebe | 1184 | 10 | 0 | yazildi |
| 25 | [25-YONETICI.md](25-YONETICI.md) | Yönetici (Ayarlar) ekranı | 2655 | 86 | 0 | yazildi |
| 26 | [26-PROFILIM.md](26-PROFILIM.md) | Profilim | 2399 | 90 | 0 | yazildi |
| 27 | [27-TELEFON.md](27-TELEFON.md) | Telefon davranışı | 2626 | 93 | 0 | yazildi |
| 28 | [28-ORTAK-PARCALAR.md](28-ORTAK-PARCALAR.md) | Ortak parçalar şartnamesi | 2239 | 80 | 0 | yazildi |
| 29 | [29-GORSEL-SISTEM.md](29-GORSEL-SISTEM.md) | Görsel sistem ve yeni görünüm jetonları | 1313 | 15 | 0 | yazildi |
| 30 | [30-VERI-API.md](30-VERI-API.md) | Veri ve API sözleşmeleri | 1469 | 5 | 0 | yazildi |
| 31 | [31-TEST-CI.md](31-TEST-CI.md) | Test ve CI stratejisi | 1211 | 11 | 0 | yazildi |
| 32 | [32-TERMINOLOJI.md](32-TERMINOLOJI.md) | Terim sözlüğü ve ekran metinleri | 1333 | 4 | 0 | yazildi |
| 33 | [33-K0-VE-KABUL-TESTI.md](33-K0-VE-KABUL-TESTI.md) | K0 dinleme, tık ölçümü ve kabul testi | 1224 | 9 | 0 | yazildi |
| 34 | [34-RISK-GUVENLIK.md](34-RISK-GUVENLIK.md) | Risk, güvenlik, gizlilik ve geçiş | 1494 | 13 | 0 | yazildi |

<!-- TABLO:BITTI -->

`Kelime` ve `Referans` sütunları gerçek dosyalardan ölçülür; `Bozuk`, kodla eşleşmeyen
`dosya:satır` referansı sayısıdır. Ölçüm komutu:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Table
```

## Önerilen uygulama sırası (bağımlılıklara göre)

1. **Temel:** `29-GORSEL-SISTEM` (görsel fark olmadan diğer işlerin etkisi görünmez),
   `32-TERMINOLOJI`, `28-ORTAK-PARCALAR`, `30-VERI-API`.
2. **En sık işler:** `02-BUGUN`, `03-SEVKIYATLAR-LISTE`, `04-SEVKIYAT-FORMU`.
3. **Para akışı:** `05`–`12`.
4. **Listeler ve öz mal:** `13`–`22`.
5. **Analiz ve yönetim:** `23`–`26`.
6. **Mobil ve kalite:** `27`, `31`.
7. **Kapanış:** `33-K0-VE-KABUL-TESTI` (müşteriyle), `34-RISK-GUVENLIK`, ardından
   `DEFAULT_UI_MODE = 'new'` ve 2 hafta sonra klasik görünümün kaldırılması.

## Bu setin diğer dokümanlarla ilişkisi

| Doküman | Rolü |
|---|---|
| `docs/KOLAYLASTIRMA-PLANI.md` | Aşama planı (K0-K6) ve durum tablosu — **karar mercii** |
| `docs/KOLAYLASTIRMA-UYGULAMA.md` | Görev kartları (F1-F6) — **kısa emir listesi** |
| `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md` | Tıkanıklık analizi, öncelik ve takvim |
| `docs/plan/*` (bu set) | **Ekran ekran ayrıntılı şartname ve uygulama adımları** |
| `docs/PRATIKORTAM-HARITA.md` | Eski programdaki ekran/alan envanteri |
| `docs/TERIMLER.md` | Terim kararları |
| `docs/TASARIM-OTOYOL.md` | Seçilen görsel yön |

Çelişki olursa sıra: kullanıcı kararı → `KOLAYLASTIRMA-PLANI.md` → `KOLAYLASTIRMA-UYGULAMA.md` →
bu set. Kod ile doküman çelişirse **kod doğrudur**; çelişki ilgili belgenin "Doğrulanacaklar"
bölümüne yazılır.

## Bakım

- Yeni ekran/modül eklenirse yeni bir `NN-AD.md` açılır ve bu dizine satır eklenir.
- Bir belge uygulandığında durum sütunu "uygulandı (tarih)" olur; belge silinmez, tarihçe kalır.
- Kelime sayısı ve referans doğruluğu, büyük değişikliklerden sonra yeniden ölçülür:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1
  ```

  Betik `docs/plan/*.md` içindeki bütün `dosya:satır` referanslarını toplar; dosya var mı ve satır
  numarası dosya uzunluğunu aşıyor mu diye bakar; toplam kelime sayısını da yazar. Aynı ada sahip
  birden fazla dosya varsa (`ui.tsx`, `types.ts`) adaylar arasından yeterince uzun olanı arar.
