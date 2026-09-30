# pratikortam.com'dan geçiş planı

> Bu belgeye veri, şifre veya kişisel bilgi yazılmaz.
>
> **Durum (30 Eylül):** Adım 0 bitti (PR #18, #19). Ağ izni verildi; `PRATIK_USER`/`PRATIK_PASS` yeni oturumda okunacak.
> Hazır olanlar: salt okuma robotu `tools/legacy/crawl.mjs` (güvenlik testi `tools/legacy/crawl.test.mjs`, CI'da çalışır) ve
> iş talebi, fatura, tahsilat, taşeron ödemesi, gider Excel aktarımları.
>
> **Giriş yalnızca e-posta ve şifreyle** yapılır (SMS adımı atlanır; hesap SMS'i sunucu tarafında zorunlu tutuyorsa robot açık bir hata verir).
> **Ağ Node ile yapılır** (ortamın egress proxy CA'sına Node güvenir); Chromium TLS'e güvenmediği için tarayıcı yalnız
> HTML'i AĞSIZ ayrıştırmada kullanılır (setContent + route abort). Çalıştırma:
> `node tools/legacy/crawl.mjs --out <scratchpad>/pratik --max 400`.
> Çıktı (`site-map.json`, sayfa HTML'leri, `islemler/*` okuma uçlarının cevapları) repo dışında kalır; `--out` repo içi yol olursa reddedilir.
>
> **30 Eylül taraması (yapı, veri değil):** Giriş e-posta/şifreyle çalıştı, 12 örnek sayfa okundu, 182 tehlikeli adres atlandı, hiçbir şey değişmedi. Eşleşme:
> - `firma_liste.php` (≈102 firma) → **Müşteriler** (Firma, VKN/TCKN, VD, E-Posta, Telefon, İl/İlçe, Yetkili)
> - `tedarikci_liste.php` (≈42) → **Tedarikçiler** (Ünvan, VKN/TCKN, VD, IBAN, E-Posta, Telefon, İl/İlçe, Yetkili)
> - `sofor_liste.php` (≈42) → **Şoförler** (Durum, Not, Fatura Başlığı, Şoför, Plaka, Telefon, Ehliyet, TC, GSM)
> - `gecmis_new.php` → **Seferler** (Firma, Şoför, Araç, Ürün, Yükleme/İndirme Noktası, Fiyat, Komisyon, Masraf, Fatura); filtreleri iş talebi/sefer alanlarımızla birebir örtüşüyor
> - `alck_mstr.php` / `alck_tdrkc.php` → **cari bakiyeler** (kesilen/alınan/iptal fatura, faturasız sevkiyat, alınan/verilen ödeme, bakiye)
> - `tedarikci_odemeleri.php` → **taşeron ödemeleri**; `oz_arac/…` → **özmal araçlar**
>
> **Sıradaki:** tam tarama (`--max 400`) + `extract`/`transform` ile bu listeleri Excel aktarım şablonlarına dökmek.

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
