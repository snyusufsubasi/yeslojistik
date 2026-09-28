# Kurulum ve İşletim

## 1. Sunucu

Önerilen: 2 vCPU / 4 GB RAM Ubuntu 24.04 VPS (Hetzner CX22, DigitalOcean vb. ~5–10 €/ay) + alan adı.

```bash
# Docker kur
curl -fsSL https://get.docker.com | sh

# Projeyi indir
git clone <repo-adresi> /opt/yeslojistik && cd /opt/yeslojistik

# Ayarlar
cp .env.example .env
nano .env
```

`.env` içinde mutlaka doldurun:

| Değişken | Açıklama |
|---|---|
| `POSTGRES_PASSWORD` | Uzun rastgele şifre (`openssl rand -base64 24`) |
| `JWT_KEY` | En az 32 karakter (`openssl rand -base64 48`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | İlk yönetici hesabı. İlk girişten sonra şifreyi panelden değiştirin |
| `DOMAIN` | Ör. `panel.yeslojistik.com` — DNS'te A kaydı sunucu IP'sini göstermeli |
| `SAMPLE_DATA` | Canlıda `false` |
| `PUBLIC_URL` | Müşteri takip linklerinde kullanılacak adres, ör. `https://panel.yeslojistik.com` |
| `LOCATION_RETENTION_DAYS` | GPS kayıtlarının saklanacağı gün (varsayılan 90) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | İsteğe bağlı: faturayı müşteriye e-postayla göndermek için |

## 2. Çalıştırma

```bash
# Canlı (HTTPS + gece yedeği)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Sadece yerel deneme (http://localhost:8080)
docker compose up -d --build
```

Veritabanı tabloları API ilk açıldığında otomatik oluşturulur (migration). Güncelleme için:

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Loglar: `docker compose logs -f api`

## 3. Yedekleme (zorunlu!)

`docker-compose.prod.yml` içindeki `backup` servisi her gece 03:00'te `./backups/` klasörüne veritabanı yedeğini
(`yeslojistik-*.dump`) ve yüklenen dosyaların (teslim fotoğrafları, irsaliyeler) arşivini (`uploads-*.tar.gz`) alır,
30 günden eski yedekleri siler. **Sunucu çökerse bu yedekler de gider**, bu yüzden sunucu dışına kopyalayın:

```bash
# Örnek: her gece yedekleri başka bir makineye/depolamaya kopyala (crontab -e)
30 3 * * * rsync -a /opt/yeslojistik/backups/ yedek@baska-sunucu:/yedekler/yeslojistik/
```

Alternatif: `rclone` ile Google Drive / Backblaze B2 / S3'e kopyalama.

Elle yedek: `docker compose exec backup sh /backup.sh`

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
dotnet tool install -g dotnet-ef --version 8.0.11
cd server
ASPNETCORE_ENVIRONMENT=Development dotnet ef migrations add <Ad> -p YesLojistik.Infrastructure -s YesLojistik.Api -o Data/Migrations
```

## 6. Şoför uygulaması

Derleme ve dağıtım adımları [mobile/README.md](../mobile/README.md) içinde. Uygulamadaki varsayılan sunucu adresi
`mobile/app.json` → `expo.extra.apiUrl`; canlı alan adınızla güncelleyip derleyin.

## 7. e-Fatura entegrasyonu

`YesLojistik.Core/Abstractions/IEInvoiceProvider.cs` arayüzü hazır. Seçilecek özel entegratörün (Paraşüt, Uyumsoft,
Logo vb.) API'si için bu arayüzü uygulayan bir sınıf yazılıp `DependencyInjection.cs` içinde
`NullEInvoiceProvider` yerine kaydedilmesi yeterli; fatura kesme/iptal akışları onu otomatik çağırır.
