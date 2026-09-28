#!/usr/bin/env bash
# YES Lojistik – tek komutla sunucu kurulumu (Ubuntu/Debian VPS).
#
#   git clone https://github.com/snyusufsubasi/yeslojistik.git && cd yeslojistik
#   sudo ./deploy/install.sh
#
# Sorular: alan adı, yönetici e-postası, demo veri. Şifreler otomatik üretilir ve sonda bir kez gösterilir.
# Soru sormadan kurmak için: DOMAIN=panel.ornek.com ADMIN_EMAIL=... SAMPLE_DATA=true ./deploy/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
NO_BUILD=false
[ "${1:-}" = "--no-build" ] && NO_BUILD=true

say() { printf '\n\033[1;34m» %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }
ask() { # ask VAR "Soru" "varsayılan"
  local var=$1 q=$2 def=${3:-} ans
  if [ -n "${!var:-}" ]; then return; fi
  if [ -t 0 ]; then read -r -p "$q${def:+ [$def]}: " ans; else ans=""; fi
  printf -v "$var" '%s' "${ans:-$def}"
}
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Docker kuruluyor…"
  [ "$(id -u)" -eq 0 ] || die "Docker kurulumu için komutu sudo ile çalıştırın."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose eklentisi bulunamadı (docker compose)."
command -v openssl >/dev/null 2>&1 || die "openssl bulunamadı (apt install openssl)."

# 2) .env (varsa dokunulmaz)
if [ -f .env ]; then
  say ".env zaten var, mevcut ayarlar kullanılıyor."
  ADMIN_PASSWORD_NEW=""
else
  say "Ayarlar"
  ask DOMAIN "Panelin alan adı (DNS kaydı bu sunucuyu göstermeli)" "panel.yeslojistik.com"
  ask ADMIN_EMAIL "Yönetici e-postası" "admin@yeslojistik.com"
  ask SAMPLE_DATA "Demo verilerle başlansın mı? (true/false)" "false"
  [ -n "$DOMAIN" ] || die "Alan adı gerekli."
  ADMIN_PASSWORD_NEW="$(rand 14)"
  umask 077
  cat > .env <<ENV
# install.sh tarafından $(date '+%F %T') tarihinde oluşturuldu. Bu dosyayı kimseyle paylaşmayın.
POSTGRES_PASSWORD=$(rand 32)
JWT_KEY=$(rand 64)
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD_NEW
SAMPLE_DATA=$SAMPLE_DATA
SECURE_COOKIES=true
DOMAIN=$DOMAIN
PUBLIC_URL=https://$DOMAIN
LOCATION_RETENTION_DAYS=90
BACKUP_KEEP_DAYS=30
RCLONE_REMOTE=
STORAGE_PROVIDER=Database
BACKUP_TOKEN=$(rand 48)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ENV
  umask 022
  echo ".env oluşturuldu."
fi
mkdir -p backups

# 3) Başlat
say "Uygulama derleniyor ve başlatılıyor (ilk seferde birkaç dakika sürer)…"
if $NO_BUILD; then "${COMPOSE[@]}" up -d --no-build; else "${COMPOSE[@]}" up -d --build; fi

# 4) Sağlık kontrolü
say "Sistem kontrol ediliyor…"
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api curl -fs http://localhost:8080/api/health >/dev/null 2>&1; then OK=1; break; fi
  sleep 3
done
[ "${OK:-}" = 1 ] || { "${COMPOSE[@]}" logs --tail 50 api; die "API başlamadı. Yukarıdaki kayıtlara bakın."; }
echo "API çalışıyor."

DOMAIN_NOW=$(grep -E '^DOMAIN=' .env | cut -d= -f2-)
say "Kurulum tamam"
cat <<MSG
  Adres     : https://$DOMAIN_NOW
  Yönetici  : $(grep -E '^ADMIN_EMAIL=' .env | cut -d= -f2-)
MSG
if [ -n "$ADMIN_PASSWORD_NEW" ]; then
  echo "  İlk şifre : $ADMIN_PASSWORD_NEW   ← bir yere not edin, ilk girişte Ayarlar → Şifre Değiştir'den değiştirin."
fi
cat <<MSG

  • HTTPS sertifikası ilk açılışta otomatik alınır (alan adının DNS kaydı bu sunucuyu göstermeli, 80/443 portları açık olmalı).
  • Her gece 03:00'te ./backups klasörüne yedek alınır. Bu klasörü sunucu dışına da kopyalayın (docs/KURULUM.md).
  • Güncelleme: ./deploy/update.sh    Durum kontrolü: ./deploy/check.sh
MSG
