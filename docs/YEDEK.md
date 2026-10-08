# Gece yedeği

*8 Ekim 2026 itibarıyla secret gerektirmeden çalışır.*

## Neden hiç çalışmamıştı?
1. `.github/workflows/backup.yml` her gece `BACKUP_URL`, `BACKUP_TOKEN`, `BACKUP_PASSPHRASE` secret'larını arıyordu; bunlar hiç eklenmediği için ilk adımda duruyordu (28 Eyl - 6 Eki, 8 çalışma).
2. 7 Ekim sabahki çalışma hiç başlamadı: GitHub hesabında ödeme/harcama limiti sorunu ("recent account payments have failed"). Depo sonradan herkese açık (public) yapıldığından Actions dakikaları artık ücretsiz; bu engel kalktı.

## Şimdi nasıl çalışıyor?
- **Giriş:** İş akışı GitHub'ın imzaladığı kısa ömürlü kimlik belgesini (OIDC, `audience=yeslojistik-backup`) `X-Backup-Oidc` başlığıyla gönderir.
  Sunucu (`GitHubOidcValidator`) belgeyi GitHub'ın anahtarlarıyla doğrular ve yalnız şunu kabul eder: depo = `Backup:GitHubRepository`,
  iş akışı = `.github/workflows/backup.yml`, dal = `main`, olay = `schedule` / `workflow_dispatch`. Bu belge yalnız yedek indirmeye
  (`/api/admin/backup`, `/api/admin/stats`) yarar; **geri yükleme açılmaz.**
- **Ayar:** Render'da `Backup__GitHubRepository=snyusufsubasi/yeslojistik`. Boşsa bu yol kapalıdır (müşteri kurulumları).
  `BACKUP_TOKEN` secret'ı eklenirse eski anahtar yolu da çalışır.
- **Şifreleme:** Depo herkese açık; yedek dosyası (Actions artifact) bu yüzden **mutlaka şifreli**. Açık anahtar `deploy/backup-public-key.asc`
  (cv25519). Özel anahtar depoda değil, sahibinde saklanır. `BACKUP_PASSPHRASE` secret'ı eklenirse onunla simetrik şifrelenir.
- **Tatbikat:** her gece yedek geçici bir PostgreSQL'e geri yüklenip müşteri/sefer/fatura/dosya sayıları yazdırılır.
- **Saklama:** dosyasız yedek 30 gün, tam yedek (pazar ve elle) 20 gün; tam yedeğin en yeni 2 kopyası tutulur.

## Yedeği açma
```bash
gpg --import yedek-ozel-anahtar.asc          # bir kez
gpg -d yedek-tam-20261008-0330.dump.gpg > yedek.dump
pg_restore -d <boş veritabanı> --no-owner --no-acl yedek.dump
```
Canlıya geri yükleme `restore.yml` ile yapılır ve hâlâ `BACKUP_TOKEN` + `BACKUP_PASSPHRASE` ister (bilerek: yıkıcı işlem).

## Sınırlar
- Yedek GitHub Actions artifact'ında durur (başka bir depolama yok). Canlı veritabanı 8 Eki 2026'dan beri Neon Free (PostgreSQL 18);
  Neon ücretsiz planda kısa süreli geri alma (anlık görüntü/PITR) sınırlıdır, asıl güvence bu gece yedeğidir.
  Yedek PostgreSQL 18 biçimindedir: açmak için `pg_restore` 18 (veya üstü) gerekir.
