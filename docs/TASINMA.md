# Sunucu taşınması (Render ücretsiz veritabanı 28 Ekim'de sona eriyor)

> **Durum (8 Eki 2026): veritabanı Neon'a taşındı.** Canlı veritabanı artık **Neon Free** (proje `yeslojistik`,
> Frankfurt, PostgreSQL 18). Render web servisi ücretsiz planda kalır ve Neon'a `ConnectionStrings__Default` ile bağlanır
> (`Host=…;SSL Mode=Require;Timeout=30;Command Timeout=60` biçiminde; `DATABASE_URL`'den önce okunur).
> Eski Render veritabanı 28 Ekim'e kadar yedek olarak durur, sonra kendiliğinden silinir; ona yazılmaz.
> Geri dönüş (yalnız 28 Ekim'den önce): Render'da `ConnectionStrings__Default` silinir → uygulama yeniden `DATABASE_URL`'e (Render) bağlanır.
> Neon ücretsiz plan: 1 GB alan, ayda 100 CU-saat; 5 dk boşta kalınca uyur (ilk sorgu birkaç saniye gecikebilir).
> Bu yüzden uyanık tutma (`keepawake.yml`) veritabanına dokunmayan `/api/ping` adresini çağırır.
> Yedek (`backup.yml`) değişmedi: sunucudan alınır; sunucu imajında PostgreSQL 18 istemcisi var, tatbikat 18 ile yapılır.

Amaç: veri kaybı olmadan yeni sunucuya geçmek. Eski adres yönlendirici olarak kalır; müşterilere gönderilmiş takip linkleri ve eski sürüm mobil uygulamalar çalışmaya devam eder.

## Hazırlık (birkaç gün önce)

1. Güncel kod canlıda olsun (`/api/health` → `version`, `commit`).
2. **Prova:** Ayarlar → Veriler → **Tam yedeği indir**. Yedeği yeni ortamdaki boş veritabanına yükleyip (aşağıdaki 4. adım) sayımları karşılaştırın. Geçen süreyi not edin.
3. Şoförlere taşınma saatini (ör. akşam 21:00) haber verin. Çekim olmayan yerdeki işlemler telefonda bekler, sonra gönderilir; kayıp olmaz.

## Plan A: Kendi sunucunuz (VPS)

1. **Kurulum:** Sunucuda `git clone …` ve `sudo SAMPLE_DATA=false ./deploy/install.sh`. Alan adı yoksa `<ip>.sslip.io` kullanılabilir (ücretsiz, HTTPS çalışır).
2. **Bakım modu:** Render'da `App__MaintenanceMode=true`. Bundan sonra veri yazılmaz; okuma ve giriş çalışır.
3. **Son yedek:** Yeni sunucudan çekin:
   `curl -H "X-Backup-Token: <Backup__Token>" "https://yeslojistik.onrender.com/api/admin/backup?files=true" -o son.dump`
4. **Geri yükleme:** `./deploy/restore.sh son.dump`
5. **Kontrol:** Eski sunucuda Ayarlar → Veriler → **Taşınma kontrolü → Sayımı kopyala**, yenisinde aynı karta yapıştırın. "Tüm sayılar ve toplamlar aynı" yazmalı. Birkaç seferin fotoğrafını ve bir müşterinin ekstresini açıp bakın. Fark varsa durun, Render'da bakım modunu kapatın, sorunu çözün.
6. **Geçiş:**
   - Render'da `App__RedirectTo=https://<yeni-adres>` ve `App__MaintenanceMode=false`. Artık eski adrese gelen her istek (health hariç) aynı yol ve parametrelerle yeni adrese 308 ile gider.
   - Mobil uygulama: `API_URL=https://<yeni-adres>` ile yeni sürüm/OTA güncellemesi; eski adres `app.config.ts` → `legacyApiUrls` listesine eklenir, kurulu telefonlar açılışta yeni adrese geçer.
   - GitHub → Settings → Secrets: `BACKUP_URL` yeni adres.
7. **İzleme:** 48 saat logları ve gece yedeğini izleyin. Render web servisi ücretsiz yönlendirici olarak kalabilir.

## Plan B: Sunucu yoksa (ücretsiz devam)

1. Bakım modu açılır, son tam yedek alınır (panelden ve `backup.yml`).
2. **B1 – Yeni ücretsiz Render Postgres:** Eski veritabanı süresi dolunca (ya da silinince) yeni ücretsiz Postgres açılır, web servisinin `DATABASE_URL`'i güncellenir. Servis açılınca şemayı kurar.
3. `Backup__AllowRestore=true` → GitHub Actions **restore.yml** çalıştırılır (ya da panelden yedek yüklenir) → `Backup__AllowRestore=false`.
4. Taşınma kontrolü kartıyla sayımlar karşılaştırılır, bakım modu kapatılır.
5. **B2 – Supabase** (B1 olmazsa): ücretsiz proje açılır; `DATABASE_URL` olarak *pooler session* adresi (port 5432, SSL zorunlu) girilir; 3. ve 4. adımlar aynı. 500 MB sınırı aşılırsa eski fotoğraflar tam yedekte arşivde kalır, canlıya dosyasız yedek yüklenir.

B yolunda ücretsiz veritabanı süreli olabilir; ilk fırsatta Plan A'ya geçilmesi önerilir.
