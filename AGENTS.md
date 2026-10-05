# YES Lojistik: yapay zekâ ajanları için proje kılavuzu

Bu dosyayı Codex, Claude Code ve benzeri ajanlar çalışmaya başlamadan önce okur. `CLAUDE.md` ile aynı kuralları içerir; ikisi birlikte güncel tutulur.

## 1. Proje nedir?
Nakliye firması için web paneli + şoför mobil uygulaması. Şu an **YES Lojistik** adlı tek bir firma kullanıyor; hedef, aynı ürünü başka nakliye firmalarına satmak (plan: `docs/SATIS-PLANI.md`).
- **Web paneli:** React 19 + TypeScript + Vite + Tailwind v4 (`client/`)
- **API:** .NET 10 + EF Core + PostgreSQL 16 (`server/`: Core, Infrastructure, Api, Tests)
- **Şoför uygulaması:** Expo / React Native (`mobile/`, ayrı `mobile/AGENTS.md` var)
- **Dağıtım:** `main` dalına giden her şey Render'da (yeslojistik.onrender.com) otomatik yayınlanır. Müşteri kurulumları için `deploy/` ve `docs/MUSTERI-KURULUM.md`.
- **Pratikortam aynası:** firmanın eski programı (pratikortam.com). Panel şu an onun **salt okunur kopyası**; GitHub Actions (`.github/workflows/mirror.yml`) günde 4 kez veriyi çeker (`tools/legacy/`).

## 2. Kullanıcı ve iletişim
- Kullanıcı **kod yazmaz**. Cevapları **kısa, sade Türkçe** ver. İşe başlamadan önce birkaç satırla ne yapacağını söyle, sonra yap.
- Sadece geri alınamaz ya da canlı veriyi değiştiren adımlarda sor. Diğer kararları kendin ver, kararı raporda söyle.
- Kullanıcı büyük işleri **uçtan uca ve paralel** yapılmasını ister; planlanmış işi atlamamak önemli. Yarım bırakma, bitirip özetle.
- Ekran görüntüsü göstermek işe yarar (kullanıcı görsel düşünür).

## 3. Kesin kurallar (bozulmaz)
1. **pratikortam.com canlı kullanımda: orada hiçbir şey ekleme, değiştirme, silme.** Form doldurma, kaydet/sil düğmesine basma yok. Yalnızca okuma (liste, ayrıntı, dışa aktarma).
2. **Kullanıcı pratikortam'a kendisi giriş yapar.** Şifresini sen yazma.
3. **Pratikortam verisi (müşteri, VKN, tutar, dosya) depoya girmez.** Sadece kod ve doküman girer. Testlerde uydurma veri kullan.
4. **Şifre, token, anahtar hiçbir dosyaya ya da komuta yazılmaz.** Ortam değişkeni / GitHub Secret olarak girilir. Lisans **özel anahtarı** asla depoya girmez (`tools/license/.gitignore` engeller).
5. **Canlı veriyi değiştiren her işlemden önce yedek al ve kullanıcıdan onay iste.**
6. **Doğrudan `main` üzerinde çalış** (yan dal/PR yok, kullanıcı istemedikçe). Her adım sonunda sırasıyla:
   1. testleri çalıştır, 2. commit, 3. `git pull --rebase origin main`, 4. `git push origin HEAD:main`.
   - `main`'e giden her şey **canlıya çıkar**. Test edilmemiş kod gönderme.
   - Aynı depoda başka oturumlar da çalışıyor olabilir; işe başlamadan `git pull --rebase origin main`, bitirince hemen push.
7. **Migration yalnızca ekleme yapar** (yeni boş olabilen sütun/tablo). Veri silen/dönüştüren migration yazma; canlı veritabanı açılışta migrate edilir.
8. `docs/GELISTIRME-PLANI.md` ve `docs/YOL-HARITASI.md` güncel tutulur: ne bitti, ne sırada.

## 4. Çalıştırma ve test
Gerekenler: .NET 10 SDK, Node 22, PostgreSQL 16 (`localhost:5432`, kullanıcı/şifre `postgres`/`postgres`), Playwright Chromium.

```bash
# Sunucu testleri (gerçek PostgreSQL, geçici veritabanı açıp siler)
cd server && dotnet test                         # ~300 test, ~1 dk

# İstemci
cd client && npm ci && npm run lint && npm run build   # lint'te 2 eski uyarı normal (ui.tsx, InvoicesPage.tsx)

# EF modeli migration ile uyumlu mu? (model değiştiren her işten sonra)
export PATH=$PATH:$HOME/.dotnet/tools
cd server && dotnet-ef migrations has-pending-model-changes --project YesLojistik.Infrastructure --startup-project YesLojistik.Api

# Şoför uygulaması
cd mobile && npm ci && npm run typecheck
```

**Tarayıcı (e2e) testleri** (`client/e2e`, Playwright, ~47 test, ~3 dk). Sırayla:
```bash
# 1) API (yerel veritabanı e2e için ayrı olsun; --no-launch-profile ŞART, yoksa port 5080'e zorlanır)
cd server/YesLojistik.Api
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5080 \
 ConnectionStrings__Default="Host=localhost;Port=5432;Database=e2emain;Username=postgres;Password=postgres" \
 Cors__Origins__0=http://localhost:8082 RateLimit__LoginPerMinute=1000 \
 dotnet run --no-launch-profile &
# 2) Panel
cd client && npm run build && API_URL=http://localhost:5080 npx vite preview --port 5173 --strictPort &
# 3) Şoför uygulaması web önizlemesi (8082): CI'daki adımlara bak (.github/workflows/ci.yml)
# 4) Testler
E2E_BASE_URL=http://localhost:5173 E2E_API_URL=http://localhost:5080 E2E_DRIVER_URL=http://localhost:8082 \
 PW_CHROMIUM_PATH=<chromium yolu> npx playwright test
```
Geliştirme girişi (yalnızca örnek veri): `admin@yeslojistik.com` / `Admin123!`. Bu, CI/dev örnek hesabıdır, canlı şifre değildir.

**Tuzaklar**
- `pkill -f` kullanma; yalnızca kendi başlattığın süreçleri PID ile kapat. API'yi yeniden başlatmadan önce eskisinin kapandığından emin ol (port çakışması sahte e2e hatası üretir).
- Postgres kapanmış olabilir: `service postgresql start`.
- Yeni e2e testleri önce arama/süzme yapsın: birikmiş örnek veri ilk sayfayı doldurur.
- Paralel ajan çalıştırırsan her biri kendi port ve veritabanını kullansın.
- `dotnet test` bazen paylaşılan Postgres üzerinde "veritabanı silinemedi" hatası verir; tekrar çalıştır.

## 5. Mimari notlar (bilmen gerekenler)
- **Ayna modu** (`CompanySettings`/Ayarlar'dan açılır): kayıtlar pratikortam'dan gelir. `MirrorWriteGuard` sunucuda yazma isteklerini reddeder; istemcide `MirrorContext` + `Button write` yazma düğmelerini gizler. "+ Yeni" menüsü ayna açıkken görünür ama "pratikortam'a girin" der. Ayna kapanınca panel kayıt girişine açılır (geçiş günü, `docs/YOL-HARITASI.md` A9).
- **Lisans:** `LicenseService`, imzalı anahtar (ECDSA P-256). **Lisans yoksa "sahip modu"** (sınırsız; bizim kendi panelimiz ve testler). Süre dolunca salt okunur (`LicenseGuard`). Bkz. `docs/LISANS.md`.
- **İki adımlı doğrulama, hesap kilidi, veri indirme:** Ayarlar → Güvenlik / Veri ve hesap.
- **KDV:** `docs/KDV-KURALLARI.md`. Kazanç hesabı KDV **hariç** (`TripProfit`); cari ve borçlar KDV **dahil** (gerçek para). Otomatik tevkifat: KDV dahil 12.000 TL üstü ve alıcı 10 haneli VKN ise 2/10.
- **UETDS:** yalnızca "hazırlık" kontrolü var (`UetdsReadiness`). Bakanlığa gönderme yok (bilgi bekleniyor, `docs/UETDS.md`). **Uydurma API yazma.**
- **e-Fatura:** `IEInvoiceProvider` soyutlaması; varsayılan `ManualXmlProvider` (XML indir). Entegratör seçilince tek sınıf eklenir (`docs/ENTEGRATOR-EKLEME.md`).
- **Beyaz etiket:** firma adı/logosu `CompanySettings`'ten (`/api/public/branding`).
- **Para gösterimi:** her yerde 2 kuruş basamağı (`tl` = `tl2`). Tarih 03.10.2026, plaka büyük harf boşluklu.
- **Form hataları:** Türkçe, sade (`client/src/lib/zodTr.ts`).
- **Pencere (Modal):** kaydedilmemiş değişiklikte kapatırken sorar, Ctrl+Enter kaydeder.

## 6. Tasarım ("Otoyol", kullanıcı seçti)
Spec: `docs/TASARIM-OTOYOL.md`. Koyu çam yeşili sol menü, **gruplar hep açık** (katlanmaz, daraltma düğmesi yok), açık gri-yeşil zemin, neredeyse keskin köşeler, gölge yok, sarı yalnız dikkat için.
- Yazı: **Source Serif 4** (Claude yazısına benzer; kullanıcı seçti), tutar/plaka/sayı **Overpass Mono**. Taban 17,5px; yazı boyutu ayarı (Normal/Büyük/Çok büyük) üst çubuktaki **Aa** ve kullanıcı menüsünde; **bu seçenek kalmalı**.
- Renkler Tailwind `@theme` jetonlarında (`client/src/index.css`); `slate`/`brand` yeniden eşlendi, sayfalar bunları kullanır.
- Ortak parçalar: `client/src/components/ui.tsx` (Button, Card, Badge, PlateBadge, Figures, Chip, Modal), `Inputs.tsx`, `SumStrip.tsx`, `DataTable`.
- **Araçlar sayfasında öz araçlar ve taşeron (kiralık) araçları ayrı sekmelerde** (kullanıcı özellikle istedi; varsayılan: öz araçlar).
- **Terim tablosu** (`docs/TERIMLER.md`: "Sefer" yerine "Sevkiyat" vb.) **kullanıcı onayını bekliyor**. Onay gelmeden ekran yazılarını toplu değiştirme.

## 7. Dokümanlar (hangi sırayla okunur)
0. **`docs/KOLAYLASTIRMA-PLANI.md`: ŞU ANKİ ÖNCELİK.** Müşteri paneli pratikortam'a göre zor buldu; menü/sekmeler pratikortam gibi, görünüm daha sade ve şık olacak (aşamalar K0-K6). **Uygulama görev kartları: `docs/KOLAYLASTIRMA-UYGULAMA.md` (F1-F6); bölüm 11'deki oturum sırasına uy.**
1. `docs/YOL-HARITASI.md`: aşamalar (A0-A9), kullanıcı kararları, kaldığımız yer.
2. `docs/SATIS-PLANI.md`: ürünleştirme planı, rakipler, eksikler, fiyat, **4 Ekim durumu**.
3. `docs/GELISTIRME-PLANI.md`: ayrıntılı iş listesi.
4. `docs/PRATIKORTAM-HARITA.md`: eski programda olup panelde eksik olanlar (öncelikli liste).
5. `docs/TASARIM-OTOYOL.md`, `docs/KDV-KURALLARI.md`, `docs/TERIMLER.md`.
6. Satış/işletme: `docs/LISANS.md`, `docs/MUSTERI-KURULUM.md`, `docs/PILOT-PAKETI.md`, `docs/UETDS.md`, `docs/ENTEGRATOR-EKLEME.md`, `docs/hukuk/` (avukat onaylı değil: TASLAK), `docs/TANITIM-ICERIK.md`, `site/` (tanıtım sitesi).

## 8. Durum (4 Ekim 2026) ve sıradaki işler
**Canlıda:** Otoyol tasarımı bütün panelde, sektöre göre KDV, sade formlar, "+ Yeni" menüsü, pratikortam aynası (günde 4 kez), Sevkiyat süzgeçleri ve Detay görünümü, Cari sütunları/sıralama/dışa aktarma, öz/kiralık araç sekmeleri, 2FA, veri indirme, lisans/abonelik, müşteri kurulum betikleri, kurulum sihirbazı, Excel/CSV aktarma, UETDS hazırlık kontrolü, hukuk taslakları, tanıtım sitesi. CI yeşil.

**Kullanıcıdan/dışarıdan bilgi bekleyenler (bunları uydurma):**
- Terim tablosu onayı.
- e-Fatura entegratörü adı, test hesabı, API dokümanı.
- UETDS: Bakanlık yetki belgesi, kullanıcı adı, test ortamı, entegrasyon dokümanı.
- GPS (Arvento/Mobiliz) hesabı ve API anahtarı.
- Hukuk belgeleri için avukat; satıcı ünvanı/VKN/adres, ürün adı, alan adı.
- Veritabanı: Render'ın ücretsiz DB'si **28 Ekim'de silinir**. Ekim ortasında ücretli plana geçilmeli ya da yenisi açılıp ayna yeniden doldurulmalı (kullanıcı karar verir).
- Gece yedeği için GitHub secret'ları (`BACKUP_*`) ve Render `Backup__Token`.

**Öncelik (5 Ekim):** kolaylaştırma planı (`docs/KOLAYLASTIRMA-PLANI.md`). Yeni düzen "Yeni görünüm" anahtarının arkasında geliştirilir; müşteri onaylayınca varsayılan olur.

**Bilgi beklemeyen, yapılabilir işler:** tam geçmişi taşıma (fatura, tahsilat, tedarikçi ödemesi, banka hareketi; A8), müşteri portalı, otomatik "yükünüz yolda" bildirimleri, teklif hazırlama, iyzico abonelik ödemesi, Ödemeler/Giderler/Alınan Faturalar/Çekler üstündeki toplam şeritlerini `SumStrip`'e çevirme, Personel/Sabit Ödemeler `StatCard`'ları, "Kiralık" etiket rengi, `PRATIKORTAM-HARITA.md` orta öncelik 7-16.

## 9. Çalışma tarzı beklentisi
- Küçük, test edilmiş adımlarla ilerle; her adım sonunda push (kural 6).
- Bir iş bitince: ilgili test(ler) + `docs/GELISTIRME-PLANI.md` güncellemesi + kullanıcıya **kısa Türkçe özet** ("ne yaptım / ne test ettim / senden ne lazım").
- Emin olmadığın dış sistem bilgisi (API alanı, mevzuat kodu) için "doğrulanacak" yaz, uydurma.
