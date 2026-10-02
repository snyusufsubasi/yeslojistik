# pratikortam.com'dan geçiş planı

> Bu belgeye veri, şifre veya kişisel bilgi yazılmaz.
>
> **Durum (2 Ekim) — canlıdaki veri hatalı, yeni ücretli veritabanına düzeltilmiş hâliyle yeniden yüklenecek.**
> - 30 Eylül gecesi eski kurallarla canlıya yüklendi: 48 araç yanlışlıkla öz araç, cari devirleri ve aktif seferler borç/alacak doğurdu,
>   yer adlarında yazım hataları vardı. Render kayıtlarına göre o günden beri panelde elle kayıt girilmedi.
> - Kullanıcı kararı: eski veritabanı silinmez, **yeni ücretli Render veritabanı** açılır (Frankfurt, basic, 5 GB) ve düzeltilmiş veri oraya
>   yüklenir. Eski ücretsiz veritabanı 28 Ekim'e kadar yedek olarak kalır. Canlıda `Seed__SampleData=false` yapıldı (2 Ekim).
> - **Bekleyen (kullanıcı):** Render'a ödeme kartı eklemek (dashboard.render.com/billing) ve bulut ortamına
>   `PANEL_EMAIL`/`PANEL_PASSWORD` eklemek. Yeni veritabanında yönetici, Render'daki `Seed__AdminEmail`/`Seed__AdminPassword` ile kurulur.
> - **Sonraki oturumda sıra:** 1) `create_postgres` (yeslojistik-db-prod, basic_256mb, frankfurt, 16, 5 GB) → 2) kullanıcı Render panelinde
>   servisin `DATABASE_URL`'ini yeni veritabanından seçer (bağlantı şifresi sohbete/komuta yazılmaz) → 3) servis açılınca boş şema + yönetici
>   oluşur → 4) `extract.mjs` → `transform.py` → `prova.py --apply` (sonuç "BORÇ/ALACAK KONTROLÜ: temiz") → 5) firma bilgileri ve
>   diğer kullanıcılar yeniden girilir → 6) gece yedeği düzeltilir (4 çalışmanın dördü de başarısız; `BACKUP_*` secret'ları eksik görünüyor).
>
> **Önceki durum (30 Eylül gece):**
> - Kod bitti ve canlıda (main `e4784f8`, PR #21 ve #22). Panel eski panele benzer düzende: Sevkiyat / Cari / Listeler / Öz Mal / Banka & Çek menüsü,
>   Müşteriler Cari ve Tedarikçiler Cari tabloları, Sevkiyatlar'da kazanç şeridi ve Bugün/Gelecek/Geçmiş/Bu ay hapları, Personeller ve Sabit Ödemeler.
> - Aktarım araçları hazır ve boş veritabanında prova edildi (borç/alacak oluşmuyor, ikinci yükleme çift yazmaz):
>   `tools/legacy/extract.mjs` → `transform.py` → `prova.py`. Dosyalar 1–10: tedarikçi, müşteri, şoför, araç (öz araç bilgileriyle), sefer,
>   gider (mazot dahil), banka hesabı, personel. (6–7 devir dosyaları artık üretilmiyor.)
> - Bulut ortamının ağ izni `pratikortam.com` ve `yeslojistik.onrender.com` için açık. Ortamda `PRATIK_USER`/`PRATIK_PASS` var;
>   canlıya yüklemek için ayrıca `PANEL_EMAIL`/`PANEL_PASSWORD` (panel yönetici hesabı) gerekir, yeni oturumda okunur.
>
> **Giriş yalnızca e-posta ve şifreyle** yapılır (SMS adımı atlanır). **Ağ Node ile yapılır** (ortamın egress proxy CA'sına Node güvenir);
> tarayıcı yalnız HTML'i ağsız ayrıştırmada kullanılır. Çıktılar repo dışında (scratchpad) kalır; `--out` repo içi yol olursa reddedilir.
>
> ## Canlıya yükleme: adım adım (yeni oturumda)
> `pip install --user openpyxl` gerekir. Tüm çıktılar scratchpad'e yazılır, repoya girmez.
> 0. **Kayıt dondurma:** Kuzen pratikortam'a kayıt girmeyi bırakır ve yükleme + mutabakat bitene kadar girmez.
>    Aktarım tek seferlik bir anlık görüntüdür; indirmeden sonra eski panelde yapılan değişiklik yeni panele geçmez.
> 1. Güncel veriyi indir: `node tools/legacy/extract.mjs --out <scratchpad>/pratik`
>    (taşeron carisi dahil; `crawl.mjs` taraması artık gerekmez).
> 2. Dönüştür: `python3 tools/legacy/transform.py <scratchpad>/pratik` → `aktar/1-…10-*.xlsx` ve `rapor.txt` (mutabakat).
>    Faturası beklenen bir sefer dönüştürülemezse araç durur.
> 3. İstersen önce yerelde boş veritabanında prova: `python3 tools/legacy/prova.py <scratchpad>/pratik --api http://localhost:5090 --apply`.
> 4. Canlı: `POST /api/auth/token` ile giriş; `GET /api/admin/backup?files=true` ile tam yedeği scratchpad'e indir.
> 5. `GET /api/dashboard` → `setup.sampleData` true ise (demo veri) `POST /api/settings/reset-data {"confirm":"SİL"}` (paneldeki "Demo verilerini temizle").
>    Demo olmayan kayıt varsa **dur, kullanıcıya sor**.
> 6. Yükle: `PANEL_EMAIL=… PANEL_PASSWORD=… python3 tools/legacy/prova.py <scratchpad>/pratik --api https://yeslojistik.onrender.com --apply`
>    Her dosya önce deneme (dryRun) sonra gerçek yüklenir; sonuç "BORÇ/ALACAK KONTROLÜ: temiz, hepsi 0" olmalı.
> 7. Tekrar tam yedek al; kullanıcıya pratikortam ve panel şifrelerini ortamdan silmesini hatırlat.
>
> Elle yükleme de olur: dosyaları sırayla ilgili sayfalardaki "Excel'den Aktar" ile (9: Kasa / Banka, 10: Personeller sayfasından).
>
> **Aktarım kuralları (kullanıcı kararı, 2 Ekim).** Aynı kurallar `transform.py` başındaki açıklamada da yazılı.
> - **Borç/alacak taşınmaz, yalnız kayıtlar eklenir.** Müşteri ve tedarikçi devri 0. Bütün seferler "Eski kayıt" olarak gelir:
>   geçmişte ve raporlarda görünür, borç/alacak, "kesilecek fatura" ve risk hesabına girmez. Banka hesapları 0 bakiyeyle açılır.
>   Eski "Giderler" listesindeki taşeron ödemeleri ve mahsuplaşmalar gider sayılmaz, alınmaz.
> - **Öz araç yalnız eski panelin "Araçlar" listesindeki plakalardır** (bugün 10 araç). Diğer bütün plakalar taşeron aracıdır.
>   Eski panelde 50 "Piyasa" seferinde taşeron boş bırakılmış. Bu seferlerin araçları "Taşeronu Belli Olmayan Araçlar" adlı
>   tedarikçiye bağlanır, araç kartından gerçek taşerona çevrilebilir. Eskiden bunlar yanlışlıkla öz araç sayılıyordu (48 araç).
> - **Yazım düzeltme:** il, ilçe ve yükleme/teslim yerlerindeki yer adı hataları düzeltilir. Örnekler: ANTALAYA → ANTALYA,
>   KADİKÖY → KADIKÖY, SAKARAYA → Sakarya. Ünvanlarda noktadan sonra boşluk bırakılır (TİC.LTD.ŞTİ. → TİC. LTD. ŞTİ.).
>   Her düzeltme `rapor.txt`'de "YAZIM DÜZELTMELERİ" başlığı altında listelenir. AVM ve firma adlarına dokunulmaz.
> - **Kontrol:** `prova.py --apply` sonunda "BORÇ/ALACAK KONTROLÜ: temiz, hepsi 0" yazmalı.
>   Yerel boş veritabanında prova edildi (2 Ekim): 144 tedarikçi, 155 müşteri, 137 şoför, 137 araç, 235 sefer, 150 gider; hepsi 0.
>
> **Veri notları:**
> - Eski panel çekici ve dorseyi tek alanda tutuyor (`34ABC123-34DEF456`). Aktarımda araç ve dorse plakası olarak ayrılır.
> - Aynı gün aynı araçla aynı güzergâha yapılan seferler, açıklamadaki sevkiyat numarasıyla ayrışır.
> - Cari sayfalarının son satırı "Toplam" satırıdır, toplanmaz.

## Bağlam
Müşteri bugün pratikortam.com'daki (eski PHP paneli) sistemi kullanıyor ve içindeki verileri dışarı alamıyor. Bizim panelin görünüşünü beğendi; ekleme, düzenleme ve silme işlerinde oradaki yeteneklerin hepsini istiyor.

**Hedef:** Eski paneli birebir kopyalamak değil. Aynı işleri daha az tıkla yapabilmek, eski verinin tamamını kayıpsız taşımak ve pratikortam'ı bir günde bırakmak.

**Kullanıcı kararları (30 Eylül):**
- **Erişim:** Bulut ortamına ağ izni ve ortam değişkeninde kullanıcı bilgisi. Şifre sohbete yazılmaz.
- **Kapsam:** Tüm veri, tüm geçmiş.
- **Geçiş:** Tek seferde.

Bu arada GitHub'da iki dal bekliyor:
- `codex/legacy-parity`: kullanıcının yerelde Codex'le başladığı "İş Talebi" (JobRequest) özelliği. Alanları eski panelden alınmış.
- `claude/choice-cards-forms`: kalan formları seçim kartlarına çeviren iş.

İki dal da PR #17'den önce açıldı. `TripForm.tsx`, `VehiclesPage.tsx`, `CustomerForm.tsx` ve `SupplierForm.tsx` dosyalarında çakışma bekleniyor.

## Adım 0 — İki dalı main'e al (hemen, kullanıcı onayladı)

**0.1 `codex/legacy-parity` → PR "İş talepleri"**
1. Çalışma dalında `origin/codex/legacy-parity`'yi al, `origin/main`'i içine birleştir. Kullanıcının dalı yeniden yazılmaz.
2. Çakışmaları çöz. `TripForm`'daki öneriler ve SearchSelect korunur; iş talebinden sefere geçiş eklenir. `TripService.HintsAsync` korunur.
3. Migration kontrolü:
   - `20260929181842_JobRequests` main'deki son migration'dan sonra mı geliyor, bak.
   - Model snapshot çakışırsa migration dosyasını elle düzeltme. Snapshot'ı main'den al ve `dotnet ef migrations add` ile yeniden üret. Migration'ı oku; veri silen satır olmamalı.
4. `JobRequestsPage` formundaki müşteri ve il seçimlerini `FormSelect`/`CitySelect` ile yeni stile uydur. İl için `components/CitySelect.tsx`, arama için `lib/search.ts` kullanılır.
5. Yardımcı işler:
   - `DataResetService.Tables`'a `job_requests` eklenir.
   - `AuditTrail` adları, menü ve `quickActions` kontrol edilir.
   - e2e'ye kısa bir senaryo: talep aç → sefere çevir.

**0.2 `claude/choice-cards-forms` → PR "Formlar: seçim kartları"**
- Aynı yöntemle yeni main'in üstüne alınır.
- `TripForm`'da iki tarafın değişiklikleri birleştirilir:
  - PR #17'den gelen onCreate seçicileri, öneri hapları, `fillFromLast`, `AmountInput`.
  - Bu daldan gelen seçim kartları.
- `VehiclesPage`'de form artık `components/VehicleForm.tsx`'te duruyor; daldaki değişiklikler oraya taşınır.

**Her iki PR için:** lint, build, `dotnet test`, e2e → PR → CI yeşil → birleştir → dal main'e ileri alınır.

## Adım 1 — Kullanıcının yapacağı ayar (tek sefer, ~3 dakika)
1. Oturumun başlığındaki bulut ortamı menüsünden **Edit**'i aç.
2. **Network access → Custom:** `pratikortam.com` ekle. Mevcut izinler korunur.
3. **Ortam değişkenleri:** `PRATIK_USER` ve `PRATIK_PASS` ekle.
4. Yeni oturum aç. Bu plan `docs/PRATIKORTAM-GECIS.md` olarak repoda durur, yeni oturum oradan devam eder.
   - Bu dosyaya veri ve şifre yazılmaz.

## Adım 2 — Keşif: eski panelin haritası (salt okuma)

**Araç:** `tools/legacy/crawl.ts`, Playwright ve sistemdeki Chromium ile.

**Güvenlik kuralları (kodda zorunlu):**
- Yalnız giriş formu gönderilir.
- Giriş dışındaki bütün POST/PUT/DELETE istekleri `page.route` ile engellenir.
- Adresinde `sil`, `delete`, `kaldir`, `iptal`, `onay`, `guncelle`, `kaydet` geçen linklere gidilmez.
- Butonlara tıklanmaz; yalnız linkler ve sayfalama gezilir.
- Hız sınırı: saniyede en fazla 1 sayfa.
- Şifre loglanmaz.

**Çıktı** (repo dışında, scratchpad'de):
- Her sayfanın HTML'i ve ekran görüntüsü.
- `site-map.json`: menü ağacı; her liste için sütun adları, filtreler ve satır işlem düğmeleri (düzenle, sil, yazdır…); her form için alan etiketleri, tipleri, zorunluluk ve açılır liste seçenekleri.

**Repoya giden:** Kişisel veri içermeyen özet, `docs/PRATIKORTAM-HARITA.md`. Modül listesi, alanlar ve işlemler; örnek değerler maskelenir.

## Adım 3 — Karşılaştırma ve kolaylaştırma tablosu
`docs/PRATIKORTAM-HARITA.md`'de her eski ekran için tek bir satır:

| Eski ekran / işlem | Bizdeki karşılığı | Eksik | Bizde nasıl daha kolay olacak |
|---|---|---|---|
| Menü: Sevkiyat · Raporlar · Listeler · Öz Mal · Banka & Çek · Yönetici | Aynı gruplar: Sevkiyat, Cari, Listeler, Öz Mal, Banka & Çek, Rapor ve Yönetim | — | Her maddenin altında ne işe yaradığı yazar; bekleyen işler menüde sayaçla görünür |
| Sevkiyatlar (`gecmis_new.php`) | Sevkiyatlar (`/seferler`) | Evrak onay adımları, komisyon/prim sütunları | Bugün / Gelecek / Geçmiş / Bu ay hapları; listenin üstünde kazanç tablosu; fatura durumu satırda; tek tıkla durum ilerletme; pano görünümü |
| Kazanç Tablosu | Sevkiyatlar'daki kazanç şeridi | — | Süzgeçle birlikte değişir; "Faturası kesilecek"e tıklayınca liste süzülür |
| Müşteriler Cari (`alck_mstr.php`) | Müşteriler Cari (`/cari/musteriler`) | İptal fatura sütunu | Az ve anlaşılır sütun; vadesi geçen satırda kırmızı; tek tıkla ekstre PDF; "Bakiyesi olanlar / Vadesi geçenler / Hepsi" |
| Tedarikçiler Cari (`alck_tdrkc.php`) | Tedarikçiler Cari (`/cari/tedarikciler`) | — | Faturası gelmeyen seferler sayıyla; ekstre ve ödeme tek tıkla |
| Tedarikçi Ödemeleri | Tedarikçi Ödemeleri (`/odemeler`) | — | Ödeme seferle ya da eski borçla kendiliğinden eşleşir |
| Müşteri / Tedarikçi / Şoför Listesi | Listeler → Müşteriler, Tedarikçiler, Şoförler | Firma grupları, e-Fatura şablonu | Kartta tüm hareketler ve belgeler |
| Öz Mal: Araçlar, Mazotlar, Giderler, Araç Masrafları | Öz Mal → Araçlar, Giderler | Sabit ödemeler, personel maaş/avans | Mazot ve masraf tek gider formunda (kategori kartlarıyla); belge ve bakım uyarıları |
| Bankalar, Çekler | Banka & Çek → Kasa / Banka, Çek / Senet | — | Virman, ciro ve vadesi yaklaşan çek uyarısı |
| Ana sayfa: iş talepleri (Bugün / Gelecek / Geçmiş) | İş Talepleri + Ana Sayfa'daki bugünün işleri | Kartlı/tablo seçimi | Talep tek tıkla sefere çevrilir |

**Bilinen başlangıç maddeleri** (JobRequest alanlarından):
- Teslim zaman aralığı, araç tipi.
- Komisyon, şoför primi, diğer masraf, "müşteri öder".
- Yükleme belge no, irsaliye no.
- Fatura altı notu.
- Yükleme ve teslim konumu.

**Kolaylaştırma ilkeleri:**
- Eski panelde 3 sayfa süren iş bizde tek formda yapılır.
- Listelerde satır sonunda **Düzenle / Kopyala / Sil** menüsü olur. Silmede onay istenir; mümkünse "Geri al" seçeneği olur.
- Toplu seçim ve toplu işlemler: durum değiştirme, fatura kesme, Excel'e aktarma.
- Aranabilir seçimler ve son kullanılanlar, bütün formlarda.
- Tablo, kullanıcıya bir ekran görüntüsüyle gösterilir ve öncelikleri o belirler. Sonra her grup ayrı bir PR olur: "Eski panel farkları — N".

## Adım 4 — Veriyi çekme ve dönüştürme

**Çekme:** `tools/legacy/extract.ts` her listeyi bütün sayfalarıyla, gerekirse detay sayfalarıyla okur.
- Eski panelde "Excel'e aktar" varsa o dosya indirilir (GET ise). Bu daha güvenilirdir.
- Çıktı: scratchpad'de `raw/<modül>.json`.

**Dönüştürme:** `tools/legacy/transform.ts`, repoda. Kod repoya girer, veri girmez.
- Ham veriyi mevcut Excel aktarım şablonlarına çevirir (`ImportService.Columns`):
  - tedarikçiler, müşteriler, şoförler, araçlar, seferler
- Adlar, plakalar (`Formatters.NormalizePlate`), iller (`Cities`), tarih ve para biçimleri normalleştirilir.
- Aynı firmanın farklı yazımları raporlanır; kullanıcı onaylar.

**Eksik aktarımlar** `ImportService`'e eklenir. Her birinde deneme (dry run) ve "hata varsa hiç yazma" kuralı geçerli:

| Aktarım | Nasıl kaydedilir |
|---|---|
| İş talepleri | `JobRequest` |
| Faturalar (geçmiş) | `Issued` durumunda, eski numarasıyla. e-Fatura durumu `None`. Numara dizisi etkilenmez. |
| Tahsilatlar | Faturalara FIFO ile dağıtılır (`PaymentAllocator`). |
| Taşeron ödemeleri | — |
| Giderler | — |

**Açılış bakiyesi kuralı:**
- Geçmişin tamamı taşındığı için devir bakiyesi kullanılmaz.
- Eski panelde hareketi olmayan hesaplar sıfırdan başlar.
- Başlangıç bakiyesi olan varsa devir olarak girilir.

**Ters kontrol:** `tools/legacy/reconcile.ts`, müşteri ve tedarikçi bazında:
- eski panelin cari bakiyesi ile aktarım sonrası bizim bakiyemiz
- sefer sayısı ve fatura toplamları

Fark sıfır olmalı; farklar listelenir ve düzeltilir.

**Provalar:**
- Aktarım önce yerel veritabanında denenir.
- Sonra canlıya giden Excel dosyaları kullanıcıya dosya olarak gönderilir.
- Sandbox canlıya ulaşamadığı için yükleme panelden yapılır: Ayarlar → Veriler → Excel'den Aktar.

## Adım 5 — Geçiş günü (tek seferde)
1. Kuzen o gün pratikortam'a kayıt girmeyi bırakır (akşam saati).
2. Son çekme → dönüştürme → yerelde deneme → ters kontrol sıfır.
3. Canlıda sırasıyla:
   1. Tam yedek.
   2. Demo verisi temizlenir.
   3. Firma bilgileri girilir.
   4. Aktarım sırası: Tedarikçiler → Müşteriler → Şoförler → Araçlar → Seferler/İş talepleri → Faturalar → Tahsilatlar → Ödemeler → Giderler.
   5. Canlıya Geçiş kartı kontrol edilir.
   6. Tam yedek.
4. Rastgele 5 cari ekstresi eski panelle yan yana karşılaştırılır.
5. Ham eski veri şifreli zip olarak kullanıcıya verilir (arşiv). Scratchpad temizlenir.
6. Kullanıcıya hatırlatma: pratikortam şifresini ortam değişkenlerinden sil, ağ iznini kaldır.

## Kritik dosyalar
- **Birleştirme:** `client/src/components/TripForm.tsx`, `VehicleForm.tsx`, `CustomerForm.tsx`, `SupplierForm.tsx`, `pages/JobRequestsPage.tsx`, `server/.../Services/TripService.cs`, `Data/Migrations/*`.
- **Geçiş:** yeni `tools/legacy/{crawl,extract,transform,reconcile}.ts`, `server/YesLojistik.Infrastructure/Services/ImportService.cs` (yeni aktarım türleri), `client/src/components/ImportDialog.tsx` (sıra ve yeni türler), `docs/PRATIKORTAM-GECIS.md`, `docs/PRATIKORTAM-HARITA.md`.

## Doğrulama
- **Her PR:** lint, build, `dotnet test`, e2e yeşil. Yeni aktarımların her biri için entegrasyon testi:
  - başarılı senaryo
  - hatalı satırda hiçbir satır yazılmaz
  - fatura ve tahsilat aktarımından sonra bakiye doğru
- **Keşif robotu:** Önce tek bir sayfada çalıştırılır ve logdan hiç POST gitmediği görülür. Sonra tam tarama yapılır.
- **Geçiş:** Ters kontrol raporu sıfır farkla biter; 5 ekstre eski panelle aynı çıkar.
