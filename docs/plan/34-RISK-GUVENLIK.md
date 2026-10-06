# 34 — Risk, güvenlik, gizlilik ve geçiş

## 1. Amaç ve kapsam

Bu işin en büyük riski kod değil: **canlıda müşterinin gerçek verisiyle çalışan bir panel** var.
Bu belge riskleri, güvenlik ve gizlilik kurallarını, yedek/geri dönüş yolunu ve klasik görünümün
kaldırılması planını tek yerde toplar.

Kapsam: risk kaydı, güvenlik/gizlilik denetimi ve önerileri, yayın (deploy) disiplini, geri dönüş
planı, klasik görünümün kaldırılması. Kapsam dışı: ekran tasarımları, test içerikleri, hukuki
metinlerin içeriği (`docs/hukuk/` — avukat onayı bekliyor).

## 2. Bugünkü durum (kanıtla)

**Yayın (deploy)**
- `main` dalına giden her şey **Render'da otomatik yayınlanır** (`yeslojistik.onrender.com`).
- CI `on: push` + `pull_request` (`.github/workflows/ci.yml:3-5`), ~9-11 dk; `Canlı kontrol`
  (smoke) yayın sonrası çalışır (~1-2 dk).
- **Ayna işi** (`.github/workflows/mirror.yml`) günde 4 kez (`cron: 7 4,9,14,19 * * *`) çalışır ve
  panele pratikortam verisini yazar; `permissions: contents: read` (satır 22-23), `concurrency:
  group: mirror` (25-27).
- Render'ın **ücretsiz PostgreSQL'i 28 Ekim'de silinir** (`AGENTS.md` §8) — Ekim ortasında ücretli
  plana geçme ya da yeni DB açıp aynayı yeniden doldurma kararı gerekiyor.

**Güvenlik denetimi (5 Ekim 2026, yapıldı)**
- Repoda ve **tüm git geçmişinde gömülü şifre/anahtar bulunmadı**: `git log -S` ile `PRATIK_PASS`,
  `PRATIK_USER`, `PANEL_PASSWORD` arandı; commitlenmiş `.env` yok (yalnız `.env.example`).
- pratikortam + panel girişleri GitHub **Actions secret** olarak duruyor: tek `PASS` secret'ı
  (`gh secret list` → `PASS`, 2026-10-03); değerler API ile okunamaz.
- `tools/legacy/secrets.sh` değerleri `::add-mask` ile maskeliyor (satır 43) ve `GITHUB_ENV`'e
  yazıyor (45); `mirror.yml` loglara yalnız sayı basıyor (satır 59, `mirror.py` çıktısı).
- `tools/license/` özel anahtarı `.gitignore` ile engelli; kodda görünen `Admin123!` yalnız
  geliştirme/CI örnek hesabı (`appsettings.Development.json`, testler) — canlı şifre değil.
- Repo **özel (private)** yapıldı (5 Ekim). Secret scanning/push protection bu repoda **kapalı**
  (API: "Secret scanning is disabled on this repository").
- **Kendi hatamız ve dersi:** plan belgelerinden biri PowerShell ile yazıldığı için Türkçe karakterler
  bozuldu (1.155 mojibake, BOM'lu); tersine çevirmeyle onarıldı. Kural: dosya yazımı yalnız
  `write`/`edit` araçlarıyla; denetleyici mojibake taraması yapar.

**Gizlilik / KVKK**
- Konum saklama süresi ayarlanabilir: `LOCATION_RETENTION_DAYS=90` (`.env.example`).
- Hukuk metinleri `docs/hukuk/` altında **taslak** (avukat onayı yok).
- pratikortam verisi depoya girmez; ayna çıktıları iş bitince silinir (`mirror.yml:60-62`).

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `.github/workflows/ci.yml:3-5` | CI her push'ta çalışır |
| `.github/workflows/mirror.yml:22-23` | `permissions: contents: read` (ayna yalnız okur) |
| `.github/workflows/mirror.yml:25-27` | `concurrency: group: mirror` (eşzamanlı ayna yok) |
| `.github/workflows/mirror.yml:43` | `secrets.PASS` (tek secret) |
| `.github/workflows/mirror.yml:59` | Çıktı özeti (yalnız sayılar) |
| `.github/workflows/mirror.yml:60-62` | İndirilen verinin silinmesi |
| `tools/legacy/secrets.sh:4-9` | Dört ayrı secret desteği (öneri R-2) |
| `tools/legacy/secrets.sh:43,45` | `::add-mask` ve `GITHUB_ENV` aktarımı |
| `docs/KURULUM.md:47` | Canlı yönetici şifresinin kullanıcı tarafından belirlenmesi |
| `.env.example` | `LOCATION_RETENTION_DAYS=90`, `BACKUP_TOKEN`, `ADMIN_PASSWORD` alanları |
| `AGENTS.md` §3, §8 | Değişmez kurallar, yayın disiplini, bekleyen kararlar |
| `gh run list` (5 Ekim) | CI ≈9-11 dk, `Canlı kontrol` ≈1-2 dk |

## 3. Risk kaydı

| # | Risk | Olasılık | Etki | Önlem | Geri dönüş |
|---|---|---|---|---|---|
| R1 | Test edilmemiş kod canlıya çıkar | Orta | Yüksek | Dal + CI kapısı (`31-TEST-CI.md`), yeşil değilse merge yok | `gh pr revert` / önceki commit |
| R2 | Ayna çalışırken deploy, veriyi yarım bırakır | Orta | Yüksek | `gh run list` ile ayna bitmeden merge yok | Ayna koşusu yeniden tetiklenir (`workflow_dispatch`) |
| R3 | Migration canlı veriyi bozar | Düşük | Çok yüksek | Yalnız **ekleme** tipi migration (`AGENTS.md` §3.7); yedek + onay | Yedekten geri yükleme (`restore.yml`) |
| R4 | Klasik→yeni görünüm geçişi müşteriyi zorlar | Orta | Orta | Yeni görünüm 2 hafta seçenek kalır; `DEFAULT_UI_MODE` tek satır geri | `DEFAULT_UI_MODE='classic'` |
| R5 | Müşteri görsel yönü beğenmez | Orta | Orta | P0.2 onayı; katman tek blok, `git revert` | Katman geri alınır |
| R6 | Terim değişikliği e2e'yi kırar | Yüksek | Düşük | Aynı commit'te test güncellemesi; tarama testi | Metin geri alınır |
| R7 | Render ücretsiz DB 28 Ekim'de silinir | Yüksek | Çok yüksek | Ekim ortasında karar + yedek | Yeni DB + ayna ile yeniden doldurma |
| R8 | pratikortam'da yanlışlıkla yazma | Düşük | Çok yüksek | Salt okuma kuralı; robot yalnız GET; müşteri girişi | — (geri dönüşü yok, bu yüzden yasak) |
| R9 | Sır (şifre/token) depoya düşer | Düşük | Yüksek | GitHub Secret kuralı; `.gitignore`; denetim | Secret rotasyonu + geçmiş temizliği |
| R10 | Belge kodlaması bozulur | Orta | Düşük | Denetleyici mojibake taraması; yalnız `write`/`edit` | Tersine çevirme (uygulandı) |
| R11 | Paralel oturum çakışması (Claude Code Cloud + bu oturum) | Orta | Orta | İşe başlarken `git pull --rebase`, bitirince hemen push | Çakışma elle çözülür |
| R12 | Yerel ortam eksikliği (yerelde test yok) | Yüksek | Orta | Doğrulama CI'da; yerel yalnız lint+build | — |

## 4. Güvenlik ve gizlilik kuralları (uygulanacak)

1. **Sır yazma yasağı:** şifre/token/anahtar hiçbir dosyaya, komuta ya da belgeye yazılmaz —
   ortam değişkeni veya GitHub Secret (`AGENTS.md` §3.4).
2. **`PASS` secret'ını dörde böl** (önerilen): `PRATIK_USER`, `PRATIK_PASS`, `PANEL_EMAIL`,
   `PANEL_PASSWORD`. `tools/legacy/secrets.sh` ikisini de destekliyor (satır 4-9).
3. **Ayna dönemi bitince** (A9 geçişi tamamlanınca) pratikortam secret'ları GitHub'dan **silinir**;
   o şifre müşterinin canlı sistemine ait.
4. **Müşteri kendi pratikortam şifresini değiştirsin** (şifre bizim GitHub hesabımızda secret
   olarak duruyor; müşterinin bilmesi ve isterse değiştirmesi doğru).
5. **Canlı yönetici şifresi** demo şifresi olmamalı: kurulum sihirbazı kendi şifresini sorar
   (`docs/KURULUM.md:47`); demo verisi yüklendiyse panelden temizlenir.
6. **Secret scanning / push protection**: özel repolarda ücretli plana bağlı; plan uygunsa açılır.
7. **Yedekleme:** `BACKUP_URL` + `BACKUP_TOKEN` + `BACKUP_PASSPHRASE` secret'ları (GitHub) ve Render
   `Backup__Token`; `backup.yml` gece yedeği, `restore.yml` geri yükleme (`GERİ YÜKLE` onayı ister).
8. **Canlı veriye yazan her işlem öncesi yedek + kullanıcı onayı** (`AGENTS.md` §3.5).
9. **KVKK:** konum saklama süresi ayarı korunur; hukuk metinleri avukat onayına kadar "TASLAK"
   kalır; kişisel veri içeren ekran görüntüleri depoya girmez.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans (güvenlik gözüyle)

- **Yetkisiz:** menüde gizleme yeterli değil; sunucu her uçta yetki kontrolü yapar (403).
- **Ayna:** `MirrorWriteGuard` yazmayı reddeder; istemci düğmeyi gizler (çift koruma).
- **Lisans:** süre dolduğunda `LicenseGuard` yazmayı kapatır, okuma kalır.
- **Hata:** kullanıcıya teknik yığın izi gösterilmez; logda tutulur.
- **Boş/yükleniyor:** güvenlik açısından fark yok; ancak iskelet yanlış veri göstermez.

## 6. Metinler ve terimler

Yayın ve güvenlik ile ilgili kullanıcıya görünen metinler sade: "pratikortam'dan gelen kayıtlar",
"deneme çalıştırması", "abonelik anahtarı", "iki adımlı doğrulama". Teknik terim (deploy, CI,
migration, secret) **ekranda görünmez** (`32-TERMINOLOJI.md` §5).

## 7. Telefon davranışı (390×844)

Telefonda oturum ve 2FA akışı korunur; parmak izi/yüz tanıma tarayıcıda yok, şifre + kod kullanılır.
Oturum süresi dolduğunda yarım kalan form verisi kaybolmaz (bugünkü `Modal` uyarısı).

## 8. Erişilebilirlik ve klavye

Güvenlik uyarıları `role="alert"` ile duyurulur. Şifre alanlarında `autocomplete` doğru verilir
(`current-password`, `new-password`); 2FA kodu için `inputmode="numeric"`.

## 9. Testler (e2e + birim)

- Mevcut `client/e2e/security.spec.ts:25,49` veri indirme/silme talebi ve 2FA'yı sınıyor.
- Yeni/additional: ayna modunda yazma düğmelerinin **görünmediğini** doğrulayan adım
  (`quick-add.spec.ts:30` ayna senaryosunu genişletir).
- Sunucu: yetki (403) ve ayna reddi (409) entegrasyon testleri; migration kontrolü CI'da.
- Sır sızıntısı: repo dışı araçla (GitHub secret scanning ya da yerel tarama) periyodik kontrol.

## 10. Uygulama adımları

1. **Yedek doğrulaması (1 saat).** `backup.yml` son koşusu yeşil mi, `BACKUP_*` secret'ları tanımlı
   mı; değilse kullanıcıya bildir (AGENTS.md §8 "bilgi bekleyenler").
2. **Secret bölme (30 dk, kullanıcı).** `PASS` yerine dört secret; `mirror.yml` değişmez
   (`secrets.sh` okur).
3. **DB kararı (kullanıcı, Ekim ortası).** Render ücretli plan ya da yeni DB + ayna doldurma;
   karar sonrası `docs/KURULUM.md` güncellenir.
4. **Klasik görünümün kaldırılması (F6.6, 1 gün, onay sonrası).**
   `DEFAULT_UI_MODE='new'` (2 hafta geri dönüş), sonra `classicNav`, `DashboardPage` eski dalı ve
   `PageShell` klasik dalı kaldırılır; e2e menü eşlemesi güncellenir
   (`docs/KOLAYLASTIRMA-UYGULAMA.md:405-407, 471-490`).
5. **Geri dönüş denemesi (2 saat).** Bir kez `DEFAULT_UI_MODE='classic'` ile geri dönüş provası;
   ayrıca yedekten geri yükleme provası (`restore.yml` `workflow_dispatch`).
6. **Belge (1 saat).** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`, `AGENTS.md` §8 durum
   notu; `00-DIZIN.md`.

Toplam ≈ **2 iş günü** + kullanıcı kararları.

## 11. Kabul ölçütü

- Her `main` alımı: yeşil CI + ayna koşusu beklenmiş + smoke yeşil.
- Ayna modunda yazma düğmeleri görünmez (e2e kanıtı).
- Yedek alınır ve geri yükleme provası yapılır (tarih not edilir).
- Sır denetimi: repoda/geçmişte sır yok; secret'lar yalnız GitHub'da.
- Klasik görünüm kaldırıldıysa tüm e2e yeşil ve `docs/ekranlar/` yeni görünümü gösteriyor.

## 12. Riskler ve geri dönüş (özet)

Kod için geri dönüş **her zaman** mümkün: her adım tek dal + tek merge, `git revert` ile geri
alınır. Veri için geri dönüş **yalnız** yedekle mümkündür: canlıya yazan işlemden önce yedek şart.
Geri dönüşü olmayan tek şey pratikortam'daki yanlış yazmadır — bu yüzden orada yalnız okuma yapılır.

## 13. Doğrulanacaklar

- Render ücretsiz DB kararı (ücretli plan mı, yeni DB mi) ve tarihi.
- `BACKUP_*` secret'ları ile Render `Backup__Token` tanımlı mı.
- Repo için Secret Protection planı var mı (secret scanning açılabilir mi).
- Avukat onaylı hukuk metinleri ne zaman hazır olacak.
- Paralel oturumların (Claude Code Cloud) bu iş sırasında durumu; çakışmayı önlemek için iş bölümü.

Sonraki belgeyle bağlantı: `31-TEST-CI.md` doğrulama kapılarını, `33-K0-VE-KABUL-TESTI.md` müşteri
onaylarını, `29-GORSEL-SISTEM.md` geri alınabilir görsel katmanı, `00-DIZIN.md` ise bütün setin
durumunu tanımlar.
