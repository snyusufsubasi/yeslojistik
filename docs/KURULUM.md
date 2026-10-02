# Kurulum ve İşletim

## 1. Sunucu ve kurulum (tek komut)

Gerekenler:
- 2 vCPU / 4 GB RAM Ubuntu 24.04 VPS (Hetzner CX22, DigitalOcean vb. ~5–10 €/ay)
- Bir alan adı. DNS'te A kaydı sunucunun IP'sini göstermeli, örneğin `panel.yeslojistik.com → 1.2.3.4`.
- Sunucuda 80 ve 443 portları açık olmalı.

```bash
git clone https://github.com/snyusufsubasi/yeslojistik.git /opt/yeslojistik && cd /opt/yeslojistik
sudo ./deploy/install.sh
```

Betik üç soru sorar: alan adı, yönetici e-postası ve demo verilerle başlanıp başlanmayacağı. Ardından:
- Docker yoksa kurar.
- Veritabanı şifresini, oturum anahtarını ve ilk yönetici şifresini rastgele üretip `.env` dosyasına yazar.
- Uygulamayı derleyip başlatır. HTTPS sertifikası otomatik alınır, gece yedeği kurulur.
- Sonda adresi ve **ilk yönetici şifresini bir kez** gösterir. Şifreyi not alın ve ilk girişte *Ayarlar → Şifre Değiştir*'den değiştirin.

| Komut | Ne yapar |
|---|---|
| `./deploy/check.sh` | Servisler, API, HTTPS, son yedek ve disk durumunu kontrol eder |
| `./deploy/update.sh` | Önce yedek alır, sonra yeni sürümü çekip derler; veritabanı güncellemeleri otomatik uygulanır |
| `docker compose logs -f api` | Uygulama kayıtları |

İsteğe bağlı ayarlar, `.env` dosyasını düzenledikten sonra `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` ile uygulanır:

| Değişken | Açıklama |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Faturayı müşteriye e-postayla göndermek için |
| `LOCATION_RETENTION_DAYS` | GPS kayıtlarının saklanacağı gün sayısı (varsayılan 90) |
| `BACKUP_KEEP_DAYS` | Sunucuda tutulacak yedek günü (varsayılan 30) |
| `RCLONE_REMOTE` | Yedeklerin sunucu dışına kopyalanacağı rclone hedefi (aşağıya bakın) |

Yalnızca kendi bilgisayarında denemek için (HTTPS yok, adres http://localhost:8080): `cp .env.example .env`, `.env`'i doldur, sonra `docker compose up -d --build`.

## Ücretsiz demo (Render.com)

Kuzeninin denemesi için, sunucu kiralamadan ücretsiz ve sabit bir adres (`https://…onrender.com`) almanın yolu:

1. https://render.com adresine **GitHub hesabınızla** üye olun. Kredi kartı istenmez.
2. **New → Blueprint** seçin, bu depoyu (`yeslojistik`) seçin. Render, depodaki `render.yaml` dosyasını okur.
3. Sorulan **Seed__AdminPassword** alanına ilk yönetici şifresini yazın ve **Apply** deyin.
4. İlk kurulum 5–10 dakika sürer. Bitince servis sayfasındaki adrese girin ve `admin@yeslojistik.com` ile yazdığınız şifreyle giriş yapın. Program demo verilerle açılır.

Kısıtlar (ücretsiz plan):
- 15 dakika kullanılmazsa servis uyur; ilk açılış yaklaşık 1 dakika sürer.
- Ücretsiz veritabanı 30 gün sonra silinir.
- Dosyalar (fotoğraf, irsaliye) veritabanında saklanır; servis yeniden başlasa da kaybolmaz ama 1 GB'lık alanı paylaşır.
- E-posta gönderimi için SMTP ayarlarını Render panelinden (Environment) ekleyin: `Smtp__Host`, `Smtp__Port`, `Smtp__User`, `Smtp__Password`, `Smtp__From`.

Bu kurulum panel ve API'yi tek konteynerde çalıştırır (`deploy/render.Dockerfile`). Gerçek kullanım için yukarıdaki VPS kurulumunu kullanın.

### Render'da yedekler

Render'ın ücretsiz veritabanı yedek almaz; yedekleri uygulama kendisi verir:

- **Elle:** Panel → Ayarlar → Veriler → **Tam yedeği indir**. Haftada bir indirip saklayın.
- **Otomatik (her gece 03:30):** `.github/workflows/backup.yml`. Render ortam değişkenine `Backup__Token` (en az 32 karakter rastgele) ekleyin; GitHub → Settings → Secrets and variables → Actions altına üç secret girin:
  - `BACKUP_URL`: `https://yeslojistik.onrender.com`
  - `BACKUP_TOKEN`: Render'daki `Backup__Token` ile aynı
  - `BACKUP_PASSPHRASE`: yedeklerin şifresi (kaybetmeyin, yoksa yedek açılamaz)

  İş akışı yedeği geçici bir veritabanına geri yükleyerek test eder ve şifreli olarak saklar (dosyasız yedek 30 gün; pazar günleri alınan tam yedeğin en yeni 2 kopyası). İndirmek için GitHub → Actions → Yedek → çalışma → Artifacts; açmak için `gpg -d yedek.dump.gpg > yedek.dump`.
- **Geri yükleme:** Render'da `Backup__AllowRestore=true` yapın, GitHub → Actions → **Yedekten geri yükle** iş akışını `GERİ YÜKLE` onayıyla çalıştırın, bitince `Backup__AllowRestore=false` yapın. VPS'te `./deploy/restore.sh yedek.dump`.
- **Bakım modu:** `App__MaintenanceMode=true` iken kayıt eklenemez/değiştirilemez (taşınma sırasında kullanılır); panel üstte uyarı gösterir.
- **Canlı kontrol:** main'e her birleştirmeden sonra `.github/workflows/smoke.yml` yeni sürümün yayına çıktığını doğrular (`/api/health` yanıtındaki `commit`).

## 2. Canlıya geçiş: demo verilerden gerçek verilere

1. Kurulumda demo seçildiyse, program örnek müşteri, araç ve seferlerle açılır. Ana sayfada sarı bir "demo veriler" uyarısı görünür.
2. Deneme bitince *Ayarlar → Veriler → Demo verilerini temizle* bölümüne gidin, kutuya `SİL` yazıp onaylayın.
   - Silinenler: müşteriler, araçlar, şoförler, seferler, faturalar, tahsilatlar, giderler, konum geçmişi ve şoför hesapları.
   - Kalanlar: firma bilgileri, personel hesapları ve fatura ayarları. Demo VKN, IBAN ve adres bilgileri de temizlenir.
   - Numaralar 1'den başlar. Demo veriler bir daha yüklenmez.
3. *Ayarlar → Firma Bilgileri*: VKN, vergi dairesi, adres, IBAN ve logoyu girin. Eski programda fatura numaraları devam ediyorsa *Sıradaki fatura numarası* alanına oradan devam eden numarayı yazın.
4. Araçlar, Şoförler ve Müşteriler sayfalarında **Excel'den Aktar** → **Şablonu İndir** → şablonu doldurun → yükleyin. Müşterilerin eski borçları şablondaki *Devir Bakiyesi* sütununa yazılır.
5. *Ayarlar → Kullanıcılar*: çalışanlar ve şoförler için hesap açın.

## 3. Yedekleme (zorunlu!)

`docker-compose.prod.yml` içindeki `backup` servisi her gece 03:00'te `./backups/` klasörüne veritabanı yedeğini
(`yeslojistik-*.dump`) ve yüklenen dosyaların (teslim fotoğrafları, irsaliyeler) arşivini (`uploads-*.tar.gz`) alır,
30 günden eski yedekleri siler. **Sunucu çökerse bu yedekler de gider**, bu yüzden sunucu dışına kopyalayın:

### Yedekleri sunucu dışına kopyalama (önerilir)

`offsite` servisi her gece 04:00'te yeni yedekleri [rclone](https://rclone.org) ile istediğiniz yere kopyalar. Seçenekler: Google Drive, Backblaze B2 (ayda birkaç kuruş), S3 ya da başka bir sunucu.

1. Hedefi tanımlayın. Sorulara cevap verin; Google Drive için tarayıcıdan izin istenir.
   ```bash
   docker run --rm -it -v $PWD/deploy/rclone:/config/rclone rclone/rclone:1.68 config
   ```
   Örneğin adını `gdrive` koyun.
2. `.env` dosyasına hedefi yazın: `RCLONE_REMOTE=gdrive:yeslojistik-yedek`
3. Servisi yeniden başlatın ve hemen bir kez deneyin:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d offsite
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec offsite sh /offsite.sh
   ```
4. `./deploy/check.sh` son kopyalamanın zamanını gösterir. Kayıtlar `backups/offsite.log` dosyasında durur.

Kopyalama silmez: sunucuda 30 günden eski yedekler silinse de hedefte kalır. Hedefteki saklama süresini sağlayıcının panelinden ayarlayın.

Elle yedek: `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backup sh /backup.sh`

### Geri yükleme (ayda bir deneyin!)

```bash
./deploy/restore.sh backups/yeslojistik-20260101-030000.dump
```

Dosyaları geri yüklemek için: `docker run --rm -v yeslojistik_uploads:/u -v $PWD/backups:/b alpine tar -xzf /b/uploads-<tarih>.tar.gz -C /u`

Yedeğin gerçekten açıldığını görmek için geri yüklemeyi ayrı bir makinede/test ortamında periyodik olarak deneyin.

## 4. Güvenlik notları

- Oturum: 15 dakikalık erişim token'ı + 14 günlük yenileme token'ı, ikisi de `httpOnly`, `SameSite=Strict` cookie.
  Yenileme token'ları veritabanında hash'li saklanır ve her kullanımda yenilenir.
- Giriş denemeleri IP başına dakikada 10 ile sınırlı.
- Şifreler ASP.NET Identity PBKDF2 ile hash'lenir; en az 8 karakter, harf + rakam.
- Roller: **Yönetici** (her şey), **Operasyon** (sefer/araç/şoför), **Muhasebe** (fatura/tahsilat/rapor),
  **Şoför** (yalnızca `/api/driver` uçları; ofis verilerine erişemez). Mobil uygulama cookie yerine Bearer token kullanır.
- Yüklenen dosyaların türü uzantıya değil içeriğe bakılarak doğrulanır (JPEG/PNG/WEBP/PDF), en fazla 10 MB.
- Herkese açık takip sayfası IP başına dakikada 60 istekle sınırlıdır; fiyat/şoför bilgisi içermez.
- GPS kayıtları `LOCATION_RETENTION_DAYS` gün sonra otomatik silinir.
- KVKK: Kişisel veriler (şoför TCKN, telefon) yalnızca giriş yapmış kullanıcılara açıktır. Kullanıcı hesaplarını
  kişiye özel açın, ayrılan personelin hesabını pasife alın.
- Sunucuda yalnızca 22, 80, 443 portlarını açık bırakın (`ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`).

## 5. Geliştirme

Bkz. [README](../README.md). Yeni migration:

```bash
dotnet tool update -g dotnet-ef --version 10.0.12
cd server
ASPNETCORE_ENVIRONMENT=Development dotnet ef migrations add <Ad> -p YesLojistik.Infrastructure -s YesLojistik.Api -o Data/Migrations
```

## 6. Şoför uygulaması

Derleme ve dağıtım adımları [mobile/README.md](../mobile/README.md) içinde. Uygulamadaki varsayılan sunucu adresi
`mobile/app.config.ts` → `extra.apiUrl` (ya da derlemede `API_URL`); eski adres `legacyApiUrls` listesine eklenirse
kurulu uygulamalar açılışta kendiliğinden yeni adrese geçer.

## 7. e-Fatura entegrasyonu

`YesLojistik.Core/Abstractions/IEInvoiceProvider.cs` arayüzü hazır. Seçilecek özel entegratörün (Paraşüt, Uyumsoft,
Logo vb.) API'si için bu arayüzü uygulayan bir sınıf yazılıp `DependencyInjection.cs` içinde
`NullEInvoiceProvider` yerine kaydedilmesi yeterli; fatura kesme/iptal akışları onu otomatik çağırır.
