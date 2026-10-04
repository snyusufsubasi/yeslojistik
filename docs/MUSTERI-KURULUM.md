# Müşteri Kurulum Kılavuzu (operatör için)

*Bu belge, panelin **her müşteriye ayrı kurulum** olarak satıldığı yol içindir (karar A, bkz. [SATIS-PLANI.md](SATIS-PLANI.md)). Hedef: yeni müşteriyi yaklaşık 15 dakikada açmak. Tek bir firmanın kendi sunucusu için eski yol hâlâ [KURULUM.md](KURULUM.md) içindedir.*

> **Önce deneyin:** Bütün müşteri komutlarının sonuna `--dry-run` yazarsanız hiçbir şeyi değiştirmeden, yapacaklarını ekrana yazar. Emin olmadığınız her adımda önce böyle çalıştırın.

---

## 1. Nasıl çalışıyor? (1 dakikalık özet)

Tek bir sunucuda (VPS) birçok müşteri çalışır. Her müşterinin:

- **kendi veritabanı** (ayrı Docker hacmi), **kendi şifreleri** ve **kendi yedek klasörü** vardır; verileri birbirine karışmaz.
- Docker projesi `yes-<müşteri-kodu>` adını taşır (ör. `yes-ornek-nakliyat`). Her müşteri 4 küçük konteynerden oluşur: veritabanı, uygulama, web ve gece yedeği.
- Dışarıya hiçbir port açılmaz. Tek giriş kapısı sunucudaki **ortak Caddy** programıdır; 80 ve 443 portlarını o dinler, alan adına bakıp doğru müşteriye yollar ve HTTPS sertifikasını kendisi alır.

```
internet ──80/443──► ortak Caddy (yes-proxy)
                       ├─ panel.musteri1.com ─► yes-musteri1-web ─► api ─► db
                       ├─ panel.musteri2.com ─► yes-musteri2-web ─► api ─► db
                       └─ ...
```

Sunucuda önemli yerler (depo `/opt/yeslojistik` içine klonlanır):

| Yer | Ne var |
|---|---|
| `/opt/yeslojistik/deploy/customers.txt` | Müşteri listesi (kod, alan adı, paket, tarih). `customer-new.sh` yazar, git'e girmez |
| `/opt/yeslojistik/customers/<kod>/.env` | O müşterinin **gizli** ayarları ve şifreleri (yalnızca root okuyabilir) |
| `/opt/yeslojistik/customers/<kod>/backups/` | O müşterinin yedekleri |
| `/opt/yeslojistik/proxy/conf.d/<kod>.caddy` | Müşterinin alan adı kaydı (otomatik) |
| `/opt/yeslojistik/archive/` | Çıkan müşterilerin arşivi |

> `.env` dosyalarını kimseyle paylaşmayın, ekran görüntüsü almayın, e-postayla göndermeyin. Şifreler yalnızca sunucuda üretilir ve orada kalır.

---

## 2. Sunucu seçimi ve maliyet tahmini

> **Bunlar tahmindir.** Fiyatlar sağlayıcıya ve döneme göre değişir; sipariş vermeden sağlayıcının sitesinden güncel fiyatı kontrol edin. Gerçek ihtiyaç, ilk pilotta `docker stats` ile ölçülüp güncellenmelidir.

**Hesap mantığı (tahmin):** her aktif müşteri yaklaşık 0,6–1 GB RAM kullanır (uygulama 300–500 MB, veritabanı 150–300 MB, gerisi küçük). Sistem ve Caddy için ~1 GB ayırın. Disk: müşteri başına ilk yıl yaklaşık 2–5 GB (veri + 30 günlük yedekler); belge/foto yükleyen müşteri daha çok kullanır.

| Müşteri sayısı | Önerilen sunucu (tahmin) | Örnek sınıflar | Aylık maliyet (tahmin) |
|---|---|---|---|
| **5'e kadar** | 4 vCPU, 8 GB RAM, 80–160 GB disk | Hetzner CX/CPX "32" sınıfı, Contabo VPS M benzeri | ~8–15 € |
| **15'e kadar** | 8 vCPU, 16 GB RAM, 200 GB disk | Hetzner CPX "41/42" sınıfı, Contabo VPS L benzeri | ~15–30 € |
| **30'a kadar** | 8–16 vCPU, 32 GB RAM, 400 GB disk, **ya da iki ayrı sunucu** | Hetzner CCX/CPX büyük sınıf, Contabo VPS XL benzeri | ~30–70 € |

Ek giderler (tahmin): sunucu dışı yedek alanı (Backblaze B2, Google Drive vb.) ayda ~1–5 €, müşteri başına alan adı yıllık ~10–15 € (müşteri kendi alan adını kullanabilir).

Dikkat edilecekler:

- **Ubuntu 24.04**, en az 2 vCPU. İlk müşteriden önce **4 GB takas (swap)** ekleyin; yeni sürüm derlenirken geçici olarak 2–3 GB fazladan bellek gerekir.
- Hepsi tek sunucuda olduğu için **sunucu çökerse tüm müşteriler kapanır.** 15 müşteriyi geçince ikinci bir sunucu ve sunucu dışı yedek şarttır.
- "Kurumsal" paket için ayrı sunucu önerilir (SATIS-PLANI). Betik yine de ortak sunucuda açar ve uyarı verir.
- Türkiye'ye yakın bir bölge (Avrupa) seçin; trafik kotası bu iş için sorun olmaz, ama sağlayıcının sınırına bakın.

---

## 3. Sunucuyu hazırlama (yalnızca bir kez, ~15 dakika)

Sunucuya `root` ile SSH yapın.

```bash
# 1) Güvenlik duvarı: yalnızca SSH, 80 ve 443
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw --force enable

# 2) 4 GB takas (derleme için)
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 3) Docker
curl -fsSL https://get.docker.com | sh

# 4) Kod
git clone https://github.com/snyusufsubasi/yeslojistik.git /opt/yeslojistik
cd /opt/yeslojistik
```

> **Eski tek müşterili kurulum** (`./deploy/install.sh`) aynı sunucuda çalışıyorsa 80/443 portlarını tutar ve çok müşterili düzen başlayamaz. Çok müşterili sunucuyu temiz bir sunucuda kurun.

Hazırlığın kontrolü: `docker compose version` bir sürüm yazmalı. Sonra, `./deploy/test-scripts.sh` komutuyla betiklerin kendi testini çalıştırabilirsiniz (gerçek müşteriye dokunmaz).

---

## 4. DNS (müşteri başına, ~5 dakika + bekleme)

Müşterinin panel adresi için **A kaydı** sunucunun IP'sini göstermeli:

| Tür | Ad | Değer |
|---|---|---|
| A | `panel.ornek-nakliyat.com.tr` | sunucunun IP adresi (ör. `203.0.113.10`) |

- Alan adı müşterinindir; kaydı ya müşteri ya da (yetki verdiyse) siz girersiniz. Siz alan adı sağlıyorsanız `ornek-nakliyat.yeslojistik.com` gibi bir alt alan adı kullanın.
- **AAAA (IPv6) kaydı eklemeyin**, sunucunun IPv6 adresini de açmadıysanız sertifika alınamaz.
- DNS'in yayılması dakikalardan birkaç saate kadar sürebilir. Kontrol: `getent hosts panel.ornek-nakliyat.com.tr` sunucunun IP'sini yazmalı.
- DNS hazır değilken kurulum yine yapılır; uygulama çalışır ama HTTPS adresi DNS gelene kadar açılmaz (betik uyarı verir).

---

## 5. Yeni müşteri: adım adım (~15 dakika)

**Hazırlık (müşteriden/sizden alın):** müşteri kodu (küçük harf, tire; ör. `ornek-nakliyat`), alan adı, yönetici e-postası (müşterinin patronu/yetkilisi), paket (`baslangic`, `standart`, `profesyonel`, `kurumsal`), varsa lisans anahtarı dosyası.

1. **DNS kaydını girin** (bölüm 4).
2. **Önce deneme çalıştırması:**
   ```bash
   cd /opt/yeslojistik
   ./deploy/customer-new.sh ornek-nakliyat panel.ornek-nakliyat.com.tr --plan standart \
       --admin-email patron@ornek-nakliyat.com.tr --dry-run
   ```
   Çıktıda yapılacaklar yazar; şifreler `********` olarak gizlenir. Hata varsa burada görürsünüz.
3. **Gerçek kurulum:** aynı komutu `--dry-run` olmadan çalıştırın. Lisans anahtarı varsa ekleyin: `--license-key-file /root/lisans-ornek.txt` (bölüm 6).
   ```bash
   ./deploy/customer-new.sh ornek-nakliyat panel.ornek-nakliyat.com.tr --plan standart \
       --admin-email patron@ornek-nakliyat.com.tr
   ```
   Betiğin yaptıkları: ayarları ve rastgele şifreleri üretir → imajı derler (sunucudaki **ilk** müşteride 5–10 dakika; sonrakilerde hazır imaj kullanılır) → müşteriyi başlatır → "sağlıklı mı" diye bekler → alan adını Caddy'ye kaydeder → listeye ekler.
4. **Sonda şunu yazar:** adres, yönetici e-postası ve **ilk yönetici şifresi (yalnızca bir kez)**. Şifreyi şifre yöneticinize kaydedin.
5. **Kontrol:** `./deploy/customer-check.sh ornek-nakliyat` satırı `TAMAM` göstermeli. Tarayıcıdan adrese girin.
6. **Müşteriye teslim:** adres, e-posta ve ilk şifre güvenli bir yoldan (telefonla söylemek ya da şifreli mesaj; sıradan e-posta/WhatsApp metni değil) iletilir.
7. **Listeyi not edin:** `deploy/customers.txt` otomatik güncellenir. Sözleşme/fatura takibinizi ayrıca tutun.

Seçenekler: `--sample-data` (demo verilerle başlat), `--keep-days 60` (yedekleri 60 gün sakla; varsayılan 30), `--admin-email` verilmezse `admin@<alan-adı>` kullanılır.

**Yarıda kesilirse:** kurulum bir noktada durursa (ör. internet koptu, sağlık kontrolü zaman aşımı) betiğin verdiği hata mesajındaki komutla devam edin:
`./deploy/customer-new.sh ornek-nakliyat panel.ornek-nakliyat.com.tr --resume`. Şifreler yeniden üretilmez. **Var olan bir müşterinin üzerine asla yazılmaz**; aynı kodla ikinci kez çalıştırırsanız betik reddeder.

---

## 6. Lisans anahtarı verme

Lisans sistemi ayrıca hazırlanıyor: bkz. [LISANS.md](LISANS.md) (anahtarın nasıl üretildiği, neyi sınırladığı: araç sayısı ve süre).

- **Lisans anahtarı varsa:** anahtarı bir dosyaya tek satır olarak kaydedin ve `--license-key-file` ile verin:
  ```bash
  ./deploy/customer-new.sh ornek-nakliyat panel.ornek-nakliyat.com.tr --license-key-file /root/lisans-ornek.txt
  ```
  Anahtar yalnızca o müşterinin `.env` dosyasına (`LICENSE_KEY=`) yazılır, ekrana basılmaz. Sonra dosyayı silin: `shred -u /root/lisans-ornek.txt`.
- **Sonradan eklemek/yenilemek için:** `nano /opt/yeslojistik/customers/ornek-nakliyat/.env` içinde `LICENSE_KEY=` satırını güncelleyin, sonra `./deploy/customer-compose.sh ornek-nakliyat up -d` ile uygulayın.
- **Anahtar yoksa** (pilot ya da deneme): `--license-key-file` vermeyin; uygulama lisanssız varsayılan davranışını uygular.

> Not: Anahtar uygulamaya `License__Key` ayarı olarak iletilir. Lisans bölümü tamamlandığında ayar adı değişirse `deploy/customer-compose.yml` içindeki `License__Key` satırı ona göre düzeltilmelidir.

---

## 7. İlk giriş ve şifre değiştirme

1. Müşteri adrese girer, yönetici e-postası ve ilk şifreyle giriş yapar.
2. **Hemen** *Ayarlar → Şifre Değiştir* ile kendi şifresini belirler. İlk şifre yalnızca ilk giriş içindir; değiştirildikten sonra sunucudaki `.env` içindeki eski şifre geçersizdir.
3. *Ayarlar → Firma Bilgileri*'ni doldurur (VKN, adres, IBAN, logo).
4. *Ayarlar → Kullanıcılar*'dan çalışanlar ve şoförler için kişiye özel hesap açar.
5. Demo verilerle başladıysa, deneme bitince *Ayarlar → Veriler → Demo verilerini temizle* (bkz. [KURULUM.md](KURULUM.md) bölüm 2).
6. Veri taşımak için Excel içe aktarma: *Müşteriler/Araçlar/Şoförler → Excel'den Aktar*.

İlk şifre kaybolduysa ve kimse giriş yapmadıysa: `grep ADMIN_PASSWORD /opt/yeslojistik/customers/ornek-nakliyat/.env` ile sunucuda görebilirsiniz. Müşteri şifresini unutursa: giriş ekranındaki "Şifremi unuttum" bağlantısı (e-posta ayarlıysa) ya da yöneticinin *Ayarlar → Kullanıcılar*'dan yeni şifre vermesi (bkz. [KULLANIM.md](KULLANIM.md)).

---

## 8. Yedek ve geri yükleme

**Otomatik yedek:** her müşteri her gece kendi yedeğini alır (saat 03:00–03:59 arası, müşteriye göre dağıtılmıştır). Dosyalar `customers/<kod>/backups/` içindedir (`yeslojistik-*.dump` veritabanı, `uploads-*.tar.gz` yüklenen dosyalar). Varsayılan olarak 30 günlük tutulur; müşteri başına `.env` içindeki `BACKUP_KEEP_DAYS` ile ayarlanır (sonra `customer-compose.sh <kod> up -d`).

**Elle yedek:**
```bash
./deploy/customer-backup.sh ornek-nakliyat     # tek müşteri
./deploy/customer-backup.sh --all              # hepsi
```

**Sunucu dışına kopya (zorunlu sayın):** sunucu çökerse yedekler de gider. Önerilen yol: sunucuya `rclone` kurun (`apt install rclone`), bir hedef tanımlayın (`rclone config`; Backblaze B2, Google Drive vb.) ve her gece tüm müşteri yedeklerini kopyalayın. Örnek (hedef adı `yedek` olsun; **kendi ortamınızda deneyin**, bu kılavuzda gerçek sunucuda sınanmamıştır):
```bash
# /etc/cron.d/yes-offsite  (her gece 05:00)
0 5 * * * root rclone copy /opt/yeslojistik/customers yedek:yes-musteriler --include "*/backups/*.dump" --include "*/backups/uploads-*.tar.gz" --max-age 3d
```
Yedekler müşteri verisi içerir; hedef alanı şifreli/erişimi kısıtlı tutun. `.env` dosyaları yedeğe **dahil değildir** (şifreler içerir); sunucu kaybolursa yeni kurulumda yeni şifreler üretilir, veriler yedekten gelir.

**Geri yükleme (ayda bir deneyin!):**
```bash
./deploy/customer-restore.sh ornek-nakliyat /opt/yeslojistik/customers/ornek-nakliyat/backups/yeslojistik-20261005-031742.dump
```
Betik önce mevcut durumun güvenlik yedeğini alır, müşteri kodunu yazmanızı ister, sonra veritabanını yükler ve uygulamayı yeniden başlatır. Yüklenen dosya arşivi de varsa `--uploads <uploads-....tar.gz>` ekleyin. (Yeni sunucuya taşırken: önce `customer-new.sh` ile aynı kodla kurun, yedek dosyasını kopyalayın, sonra restore.)

---

## 9. Güncelleme

Yeni sürüm çıkınca (GitHub'daki `main`):

```bash
cd /opt/yeslojistik
./deploy/customer-update.sh --all --dry-run     # önce ne yapacağını görün
./deploy/customer-update.sh --all               # hepsini sırayla güncelle
./deploy/customer-update.sh ornek-nakliyat      # yalnızca bir müşteri (önce pilotta deneyin)
```

Betik kodu çeker, yeni imajı **bir kez** derler, sonra müşterileri **tek tek** güncellemeye başlar. Her müşteri için: yedek alır → yeni sürümü başlatır → `/api/health` yanıtını bekler → **sağlıklı değilse otomatik olarak önceki sürüme döner** ve durur (kalan müşterilere dokunmaz; hepsine devam etmek için `--continue`).

- Kısa kesinti olur (birkaç saniye); iş saatleri dışında güncelleyin.
- **Önemli sınır:** yeni sürüm veritabanını değiştirmiş (migration) ve sonra hata vermişse, otomatik dönüş yalnızca programı geri alır, veritabanını geri almaz. Hata mesajı, güncelleme öncesi alınan yedeğin adını yazar; gerekirse `customer-restore.sh` ile o yedeğe dönün.
- Müşteri başına hangi sürümde olduğu: `grep IMAGE_TAG /opt/yeslojistik/customers/*/.env`.
- Güncelleme sonrası: `./deploy/customer-check.sh`.

---

## 10. Müşteri çıkışı

```bash
./deploy/customer-remove.sh ornek-nakliyat --dry-run   # önce ne olacağına bakın
./deploy/customer-remove.sh ornek-nakliyat
```

Betik müşteri kodunu yazmanızı ister (yanlış yazarsanız hiçbir şey yapmaz). Sonra: **son yedeği alır** → konteynerleri durdurur → alan adı kaydını kaldırır → müşteri klasörünü (ayarlar + tüm yedekler) `archive/<kod>-<tarih>/` altına **taşır** → listeden çıkarır. Veritabanı hacmi **silinmez**. Silmek için (saklama süresi bitince, KVKK) `--purge-volumes` kullanılır ve ikinci bir onay istenir.

Müşteriye verisini teslim etmek istiyorsanız arşivdeki `.dump` dosyasını verin. DNS kaydını silmeyi ve sunucu dışındaki yedeklerin saklama süresini ayarlamayı unutmayın.

---

## 11. Sorun giderme

| Belirti | Olası neden / yapılacak |
|---|---|
| `customer-check.sh` HTTPS "YOK", API "ok" | DNS bu sunucuyu göstermiyor ya da sertifika henüz alınmadı. `getent hosts <alan-adı>`; Caddy kayıtları: `docker logs yes-proxy --tail 50`. 80/443 portu kapalı olabilir (`ufw status`). |
| Tarayıcı sertifika hatası veriyor | DNS yeni değiştiyse bekleyin. AAAA kaydı varsa silin. Let's Encrypt kota sınırına takılmışsa (aynı alan adı için çok deneme) 1 saat bekleyin. |
| API "YOK" | `./deploy/customer-compose.sh <kod> logs --tail 100 api` ve `... ps`. Bellek yetmiyorsa `free -h`, `docker stats --no-stream`. |
| `customer-new.sh`: "80 veya 443 portunu başka bir program kullanıyor" | Eski tek müşterili kurulum ya da başka bir web sunucusu var. Durdurun (`docker compose down` o klasörde) ya da temiz sunucu kullanın. |
| `customer-new.sh`: "API 3 dakikada ayağa kalkmadı" | Kayıtlar ekranda. Düzelince `--resume` ile devam edin (bölüm 5). |
| Yedek "YOK" ya da çok eski | `./deploy/customer-compose.sh <kod> ps` içinde `backup` çalışıyor mu? `./deploy/customer-backup.sh <kod>` ile elle alın; `customers/<kod>/backups/backup.log` dosyasına bakın. |
| Disk dolu (%85+) | Eski yedekleri sunucu dışına alıp `BACKUP_KEEP_DAYS` düşürün; `docker system df`; eski imajlar `customer-update.sh --all` ile temizlenir; `docker image prune -f`. |
| Sertifika bitmek üzere | Caddy otomatik yeniler; yenilemiyorsa DNS/80 portu sorunu vardır. `docker logs yes-proxy`. |
| Güncelleme "ÖNCEKİ SÜRÜME DÖNÜLÜYOR" | Yeni sürüm açılmadı, müşteri eski sürümle çalışıyor. Kayıt: `./deploy/customer-compose.sh <kod> logs api`. Sorunu geliştiriciye bildirin. |
| Caddy ayarı doğrulanamadı | `proxy/conf.d/` içindeki dosyayı inceleyin: `docker exec yes-proxy caddy validate --config /etc/caddy/Caddyfile`. Alan adı yazımını kontrol edin. |
| Bir müşterinin ayarını değiştirmek (SMTP vb.) | `nano customers/<kod>/.env` → `./deploy/customer-compose.sh <kod> up -d`. SMTP değişkenleri için [KURULUM.md](KURULUM.md). |
| Hiçbir komut çalışmıyor / `docker` yok | Bölüm 3'ü tekrar edin; `systemctl status docker`. |

Betiklerle çözülmeyen durumda: `docker ps`, `docker logs yes-proxy`, ilgili müşterinin `logs api` çıktısını kaydedip geliştiriciye gönderin. **`.env` dosyasını göndermeyin.**

---

## 12. Günlük kontrol listesi (~5 dakika)

- [ ] `./deploy/customer-check.sh` çalıştır: her satır `TAMAM`, çıkış kodu 0. Tablo sütunları: API, HTTPS, DİSK (%), YEDEK (son yedeğin yaşı), SERT. (sertifikanın kalan günü).
- [ ] Yedeği 36 saatten eski ya da hiç olmayan müşteri yok.
- [ ] Disk %85'in altında; RAM bol (`free -h`).
- [ ] Sunucu dışı yedek dün gece çalıştı (hedefte yeni dosya var).
- [ ] Müşteri şikâyeti/destek talebi var mı? Varsa `logs api` kontrol edilir.
- [ ] Haftalık: yeni sürüm var mı? Bir pilot müşteride dene → `customer-update.sh --all`.
- [ ] Aylık: bir yedeği **test makinesinde** geri yükleyip açılıp açılmadığına bakın; müşteri/lisans bitiş tarihlerini gözden geçirin; `apt update && apt upgrade` ve gerekirse yeniden başlatma.

Otomatik izleme için kontrolü her sabah çalıştırıp kaydı tutabilirsiniz (sorun varsa dosyanın sonunda "sorun var" yazar):
```bash
# /etc/cron.d/yes-check
0 8 * * * root /opt/yeslojistik/deploy/customer-check.sh > /var/log/yes-check.log 2>&1
```

---

## 13. Komut özeti

| Komut | Ne yapar |
|---|---|
| `customer-new.sh <kod> <alan-adı> [--plan …] [--admin-email …] [--license-key-file …] [--dry-run]` | Yeni müşteri açar |
| `customer-update.sh <kod\|--all> [--dry-run]` | Güncelleme, sağlık kontrolü, otomatik geri dönüş |
| `customer-check.sh [kod]` | Tüm müşterilerin sağlık tablosu; sorun varsa çıkış kodu 1 |
| `customer-backup.sh <kod\|--all>` | Elle yedek |
| `customer-restore.sh <kod> <yedek.dump>` | Yedekten geri yükleme |
| `customer-remove.sh <kod>` | Müşteriyi çıkarır, arşivler |
| `customer-compose.sh <kod> <docker compose komutu>` | Müşterinin konteynerlerini yönetir (`ps`, `logs -f api`, `up -d`) |
| `test-scripts.sh` | Betiklerin kendi testi (gerçek müşteriye dokunmaz) |

Tüm komutlar `/opt/yeslojistik` içinden `./deploy/…` olarak çalıştırılır.
