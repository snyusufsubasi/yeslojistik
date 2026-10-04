#!/usr/bin/env bash
# Yeni müşteri kurulumu: kendi veritabanı, ayarları ve yedek klasörü olan ayrı bir YES Lojistik paneli açar
# ve alan adını ortak HTTPS yönlendiriciye (Caddy) kaydeder. Tek VPS'te çok müşteri çalışır.
#
#   sudo ./deploy/customer-new.sh <slug> <alan-adı> [--plan baslangic|standart|profesyonel|kurumsal]
#        [--admin-email adres] [--license-key-file dosya] [--sample-data] [--keep-days 30] [--dry-run] [--resume]
#
#   Örnek: sudo ./deploy/customer-new.sh ornek-nakliyat panel.ornek-nakliyat.com.tr --plan standart --admin-email patron@ornek-nakliyat.com.tr
#   Önce denemek için: aynı komutun sonuna --dry-run ekleyin (hiçbir şey değiştirmez, yapılacakları yazar).
#
# Şifreler (veritabanı, oturum anahtarı, ilk yönetici) sunucuda rastgele üretilir ve yalnızca
# customers/<slug>/.env dosyasına (izin 600) yazılır. Tek gösterilen: ilk yönetici şifresi, sonda bir kez.
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

usage() { sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

SLUG="" DOMAIN="" PLAN_NAME="baslangic" ADMIN_EMAIL="" LICENSE_FILE="" SAMPLE_DATA=false KEEP_DAYS=30 RESUME=false
pos=0
while [ $# -gt 0 ]; do
  case "$1" in
    --plan) [ $# -ge 2 ] || die "--plan için değer gerekli"; PLAN_NAME=$2; shift 2;;
    --admin-email) [ $# -ge 2 ] || die "--admin-email için değer gerekli"; ADMIN_EMAIL=$2; shift 2;;
    --license-key-file) [ $# -ge 2 ] || die "--license-key-file için dosya yolu gerekli"; LICENSE_FILE=$2; shift 2;;
    --keep-days) [ $# -ge 2 ] || die "--keep-days için sayı gerekli"; KEEP_DAYS=$2; shift 2;;
    --sample-data) SAMPLE_DATA=true; shift;;
    --resume) RESUME=true; shift;;
    --dry-run) DRY=true; shift;;
    -h|--help) usage 0;;
    -*) die "Bilinmeyen seçenek: $1 (yardım: --help)";;
    *) pos=$((pos + 1))
       case $pos in 1) SLUG=$1;; 2) DOMAIN=$1;; *) die "Fazla argüman: $1";; esac
       shift;;
  esac
done
[ -n "$SLUG" ] && [ -n "$DOMAIN" ] || usage 1

# ---------- 1) girdi doğrulama ----------
DOMAIN=$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]')
valid_slug "$SLUG" || die "Geçersiz müşteri kodu '$SLUG'. Küçük harf/rakam/tire, 3-32 karakter, harfle başlamalı (ör. ornek-nakliyat). Ayrılmış kelimeler: $RESERVED_SLUGS"
valid_domain "$DOMAIN" || die "Geçersiz alan adı '$DOMAIN' (ör. panel.ornek.com.tr; http:// veya / yazmayın)."
valid_plan "$PLAN_NAME" || die "Bilinmeyen paket '$PLAN_NAME'. Seçenekler: $PLANS"
[ -n "$ADMIN_EMAIL" ] || ADMIN_EMAIL="admin@$DOMAIN"
valid_email "$ADMIN_EMAIL" || die "Geçersiz yönetici e-postası: $ADMIN_EMAIL"
[[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] && [ "$KEEP_DAYS" -ge 1 ] && [ "$KEEP_DAYS" -le 3650 ] || die "--keep-days 1 ile 3650 arasında bir sayı olmalı."

LICENSE_KEY=""
if [ -n "$LICENSE_FILE" ]; then
  [ -f "$LICENSE_FILE" ] || die "Lisans anahtarı dosyası bulunamadı: $LICENSE_FILE"
  LICENSE_KEY=$(tr -d '\r\n' < "$LICENSE_FILE")
  [ -n "$LICENSE_KEY" ] || die "Lisans anahtarı dosyası boş: $LICENSE_FILE"
  [[ "$LICENSE_KEY" =~ ^[A-Za-z0-9._~+/=:-]+$ ]] || die "Lisans anahtarı beklenmeyen karakter içeriyor (boşluk, \$, tırnak olmamalı). Dosyayı kontrol edin."
fi

DIR=$(cdir "$SLUG")
ENVF="$DIR/.env"
MARKER="$DIR/.kurulum-yarim"

# ---------- 2) çakışma kontrolü (mevcut müşterinin üstüne asla yazmaz) ----------
if [ -e "$DIR" ]; then
  if $RESUME && [ -f "$MARKER" ] && [ -f "$ENVF" ]; then
    [ "$(env_get "$ENVF" DOMAIN)" = "$DOMAIN" ] || die "--resume: kayıtlı alan adı ($(env_get "$ENVF" DOMAIN)) verdiğiniz alan adıyla ($DOMAIN) aynı değil."
    say "Yarım kalan kuruluma devam ediliyor: $SLUG"
  else
    die "'$SLUG' zaten var ($DIR). Üzerine yazılmaz. Yarım kalan bir kurulumsa --resume ile devam edin; müşteriyi kaldırmak için ./deploy/customer-remove.sh $SLUG"
  fi
else
  $RESUME && die "--resume verildi ama yarım kalmış '$SLUG' kurulumu yok."
fi
registry_has "$SLUG" && ! $RESUME && die "'$SLUG' müşteri listesinde zaten kayıtlı ($YES_REGISTRY)."
if registry_domain_used "$DOMAIN" && ! $RESUME; then die "'$DOMAIN' alan adı başka bir müşteriye ait ($YES_REGISTRY)."; fi
if [ -f "$YES_PROXY_DIR/conf.d/$SLUG.caddy" ] && ! $RESUME; then die "Caddy kaydı zaten var: $YES_PROXY_DIR/conf.d/$SLUG.caddy"; fi

# ---------- 3) ön kontroller ----------
say "Ön kontroller"
if $DRY; then
  command -v docker >/dev/null 2>&1 || warn "docker bulunamadı (gerçek kurulumda gerekli)"
else
  need_docker
  command -v openssl >/dev/null 2>&1 || die "openssl bulunamadı (apt install openssl)."
  command -v curl >/dev/null 2>&1 || die "curl bulunamadı (apt install curl)."
fi
if command -v getent >/dev/null 2>&1; then
  resolved=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}') || resolved=""
  mine=" $(hostname -I 2>/dev/null || true) "
  if [ -z "$resolved" ]; then warn "$DOMAIN için DNS kaydı henüz yok. A kaydını bu sunucunun IP'sine yönlendirin; yoksa HTTPS sertifikası alınamaz."
  elif [[ "$mine" != *" $resolved "* ]]; then warn "$DOMAIN şu IP'ye gidiyor: $resolved. Bu sunucunun IP'si değilse (NAT/yük dengeleyici değilse) DNS'i düzeltin."
  else ok "DNS: $DOMAIN → $resolved (bu sunucu)"; fi
fi
[ "$PLAN_NAME" = kurumsal ] && warn "Kurumsal pakette ayrı sunucu önerilir (docs/SATIS-PLANI.md). Bu kurulum yine de ortak sunucuda açılır."
read -r API_MEM DB_MEM <<< "$(plan_mem "$PLAN_NAME")"
TAG=$(current_tag)
ok "Müşteri: $SLUG  Alan adı: $DOMAIN  Paket: $PLAN_NAME  Sürüm: $TAG"

# ---------- 4) imajlar (derleme tüm müşteriler için bir kez yapılır) ----------
say "Uygulama imajları ($TAG)"
ensure_images "$TAG"

# ---------- 5) klasör ve .env ----------
say "Müşteri klasörü ve ayarlar"
ensure_proxy
ADMIN_PASSWORD_NEW=""
# Yedek saati müşteriye göre 03:00-03:59 arasına dağıtılır
BMIN=$(( $(printf '%s' "$SLUG" | cksum | cut -d' ' -f1) % 60 ))
if [ -f "$ENVF" ]; then
  ok "$ENVF zaten var, mevcut ayarlar kullanılıyor (şifreler yeniden üretilmedi)."
else
  if $DRY; then
    plan "klasörler oluşturulur: $DIR (izin 700), $DIR/backups; kurulum işareti: $MARKER"
    ADMIN_PASSWORD_NEW="<rastgele-üretilir>"
    PG_PASS="<rastgele-üretilir>"; JWT="<rastgele-üretilir>"; BTOKEN="<rastgele-üretilir>"
  else
    install -d -m 700 "$YES_CUSTOMERS_DIR" "$DIR" "$DIR/backups"
    : > "$MARKER"
    ADMIN_PASSWORD_NEW="$(rand_password)"
    PG_PASS="$(rand 32)"; JWT="$(rand 64)"; BTOKEN="$(rand 48)"
  fi
  write_file "$ENVF" 600 mask <<ENV
# customer-new.sh tarafından $(date '+%F %T') tarihinde oluşturuldu. Bu dosya gizlidir (izin 600); kimseyle paylaşmayın, git'e koymayın.
CUSTOMER_SLUG=$SLUG
DOMAIN=$DOMAIN
PLAN=$PLAN_NAME
CREATED=$(date +%F)
YES_REPO=$YES_REPO
BACKUPS_DIR=$DIR/backups
IMAGE_TAG=$TAG
PREV_IMAGE_TAG=
POSTGRES_PASSWORD=$PG_PASS
JWT_KEY=$JWT
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD_NEW
SAMPLE_DATA=$SAMPLE_DATA
PUBLIC_URL=https://$DOMAIN
LICENSE_KEY=$LICENSE_KEY
LOCATION_RETENTION_DAYS=90
STORAGE_PROVIDER=Database
BACKUP_TOKEN=$BTOKEN
BACKUP_KEEP_DAYS=$KEEP_DAYS
BACKUP_HOUR=3
BACKUP_MIN=$BMIN
API_MEM=$API_MEM
DB_MEM=$DB_MEM
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ENV
fi

# ---------- 6) başlat ve sağlık kontrolü ----------
say "Başlatılıyor ($SLUG)"
if ! $DRY; then ccompose_raw "$SLUG" config -q || die "Compose ayarı geçersiz ($ENVF)."; fi
ccompose "$SLUG" up -d
say "Sağlık kontrolü (ilk açılışta veritabanı hazırlanır, 1-2 dakika sürebilir)"
if ! wait_health "$SLUG" 60; then
  $DRY || ccompose_raw "$SLUG" logs --tail 40 api || true
  die "API 3 dakikada ayağa kalkmadı. Kayıtlar yukarıda. Düzeltince kaldığı yerden devam: ./deploy/customer-new.sh $SLUG $DOMAIN --resume"
fi
$DRY || ok "Uygulama çalışıyor"

# ---------- 7) alan adını ortak Caddy'ye kaydet ----------
say "Alan adı kaydı ($DOMAIN)"
write_file "$YES_PROXY_DIR/conf.d/$SLUG.caddy" 644 <<CADDY
# yes-$SLUG ($DOMAIN) – customer-new.sh tarafından üretildi. Elle düzenlemeyin.
$DOMAIN {
    encode gzip
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    reverse_proxy yes-$SLUG-web:80 {
        header_up X-Forwarded-Proto {scheme}
    }
}
CADDY
if ! caddy_reload; then
  $DRY || rm -f "$YES_PROXY_DIR/conf.d/$SLUG.caddy"
  die "Caddy ayarı doğrulanamadı; kayıt geri alındı. Alan adını kontrol edin. Düzeltince: ./deploy/customer-new.sh $SLUG $DOMAIN --resume"
fi

HTTPS_OK=false
if $DRY; then
  plan "https://$DOMAIN/api/health yanıtı denenir (sertifika alınması 1-2 dakika sürebilir)"
else
  for _ in $(seq 1 20); do
    if curl -fs -m 10 "https://$DOMAIN/api/health" 2>/dev/null | grep -q '"status":"ok"'; then HTTPS_OK=true; break; fi
    sleep "${YES_HEALTH_SLEEP:-3}"
  done
fi

# ---------- 8) kayıt ve bitiş ----------
registry_add "$SLUG" "$DOMAIN" "$PLAN_NAME" "$(date +%F)"
$DRY || rm -f "$MARKER"

say "Kurulum tamam: $SLUG"
cat <<MSG
  Adres     : https://$DOMAIN
  Yönetici  : $ADMIN_EMAIL
MSG
if $DRY; then
  echo "  İlk şifre : (gerçek kurulumda rastgele üretilir ve burada bir kez gösterilir)"
  echo
  echo "  [dry-run] Hiçbir şey değiştirilmedi."
elif [ -n "$ADMIN_PASSWORD_NEW" ]; then
  echo "  İlk şifre : $ADMIN_PASSWORD_NEW"
  echo "              ↑ Bir kez gösterilir. Müşteriye güvenli yoldan iletin; ilk girişte Ayarlar → Şifre Değiştir'den değiştirmesini isteyin."
  echo "              (Sunucuda yalnızca $ENVF dosyasında durur, izin 600.)"
else
  echo "  İlk şifre : daha önce üretildi; $ENVF dosyasındaki ADMIN_PASSWORD satırında (ilk giriş yapıldıysa artık geçersizdir)."
fi
if [ -z "$LICENSE_KEY" ]; then
  echo "  Lisans    : anahtar verilmedi. Sonradan eklemek için docs/MUSTERI-KURULUM.md → Lisans anahtarı."
else
  echo "  Lisans    : anahtar kaydedildi (gösterilmez)."
fi
$DRY || $HTTPS_OK || warn "https://$DOMAIN henüz yanıt vermiyor. DNS A kaydı bu sunucuyu göstermiyor olabilir ya da sertifika alınıyor; birkaç dakika sonra: ./deploy/customer-check.sh $SLUG"
cat <<MSG

  • Her gece $(printf '03:%02d' "${BMIN:-0}") civarı yedek alınır: $DIR/backups  (sunucu dışına da kopyalayın: docs/MUSTERI-KURULUM.md)
  • Durum: ./deploy/customer-check.sh $SLUG      Kayıtlar: ./deploy/customer-compose.sh $SLUG logs -f api
MSG
