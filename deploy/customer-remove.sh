#!/usr/bin/env bash
# Müşteriyi sunucudan çıkarır: ONAY ister, son yedeği alır, konteynerleri durdurur, alan adı kaydını kaldırır
# ve müşteri klasörünü (ayarlar + yedekler) archive/ altına TAŞIR. Hiçbir şey sessizce silinmez:
# veritabanı hacmi (volume) varsayılan olarak durur; silmek için ayrıca --purge-volumes gerekir.
#
#   ./deploy/customer-remove.sh <slug> [--purge-volumes] [--dry-run]
#
# Arşiv: archive/<slug>-<tarih>/ (izin 700). KVKK gereği saklama süresi bitince arşivi ve hacmi kalıcı silin.
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

usage() { sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

SLUG="" PURGE=false
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=true; shift;;
    --purge-volumes) PURGE=true; shift;;
    -h|--help) usage 0;;
    -*) die "Bilinmeyen seçenek: $1 (yardım: --help)";;
    *) [ -z "$SLUG" ] || die "Fazla argüman: $1"; SLUG=$1; shift;;
  esac
done
[ -n "$SLUG" ] || usage 1

if $DRY; then command -v docker >/dev/null 2>&1 || warn "docker bulunamadı (gerçek çalıştırmada gerekli)"; else need_docker; fi
load_slugs "$SLUG"
DIR=$(cdir "$SLUG")
DOMAIN=$(env_get "$(cenv "$SLUG")" DOMAIN)
DEST="$YES_ARCHIVE_DIR/$SLUG-$(date +%Y%m%d)"
[ ! -e "$DEST" ] || die "Arşiv klasörü zaten var: $DEST"

confirm_slug "$SLUG" "UYARI: $SLUG ($DOMAIN) müşterisi KALDIRILACAK: panel kapanır, alan adı yayından çıkar."
if $PURGE; then confirm_slug "SIL-$SLUG" "UYARI (2): --purge-volumes verdiniz: veritabanı hacmi KALICI SİLİNECEK."; fi

say "1/5 Son yedek"
BK=("$(dirname "${BASH_SOURCE[0]}")/customer-backup.sh" "$SLUG")
if $DRY; then BK+=(--dry-run); fi
"${BK[@]}" || die "Son yedek alınamadı; müşteri kaldırılmadı."

say "2/5 Konteynerler durduruluyor (veri hacimleri korunur)"
ccompose "$SLUG" down

say "3/5 Alan adı kaydı kaldırılıyor"
if [ -f "$YES_PROXY_DIR/conf.d/$SLUG.caddy" ] || $DRY; then
  run mkdir -p "$DEST"
  run mv "$YES_PROXY_DIR/conf.d/$SLUG.caddy" "$DEST/$SLUG.caddy"
  caddy_reload || warn "Caddy yeniden yüklenemedi: docker exec $PROXY_CONTAINER caddy reload --config /etc/caddy/Caddyfile"
fi

say "4/5 Müşteri klasörü arşive taşınıyor"
run install -d -m 700 "$YES_ARCHIVE_DIR" "$DEST"
run mv "$DIR" "$DEST/musteri"
run chmod 700 "$DEST"

say "5/5 Müşteri listesinden çıkarılıyor"
registry_remove "$SLUG"

if $PURGE; then
  say "Veritabanı hacimleri siliniyor"
  run docker volume rm "yes-${SLUG}_pgdata" "yes-${SLUG}_uploads"
else
  echo
  echo "  Veritabanı hacimleri (yes-${SLUG}_pgdata, yes-${SLUG}_uploads) SİLİNMEDİ."
  echo "  Saklama süresi bitince: docker volume rm yes-${SLUG}_pgdata yes-${SLUG}_uploads"
fi
say "Tamam: $SLUG kaldırıldı. Arşiv (ayarlar + yedekler): $DEST/musteri"
echo "  Ayrıca DNS kaydını silmeyi ve (varsa) sunucu dışı yedekleri saklama politikasına göre temizlemeyi unutmayın."
