#!/usr/bin/env bash
# Bir müşterinin veritabanını yedekten geri yükler. DİKKAT: o müşterinin mevcut verisinin üzerine yazar.
# Önce mevcut durumun güvenlik yedeği alınır; müşteri kodunu yazarak onaylamanız istenir.
#
#   ./deploy/customer-restore.sh <slug> <yedek.dump> [--uploads uploads-<tarih>.tar.gz] [--dry-run]
#
# Yedek dosyaları: customers/<slug>/backups/yeslojistik-*.dump (başka sunucudan getirilen yedek de olur).
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

usage() { sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

SLUG="" DUMP="" UPLOADS=""
pos=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=true; shift;;
    --uploads) [ $# -ge 2 ] || die "--uploads için dosya gerekli"; UPLOADS=$2; shift 2;;
    -h|--help) usage 0;;
    -*) die "Bilinmeyen seçenek: $1 (yardım: --help)";;
    *) pos=$((pos + 1)); case $pos in 1) SLUG=$1;; 2) DUMP=$1;; *) die "Fazla argüman: $1";; esac; shift;;
  esac
done
[ -n "$SLUG" ] && [ -n "$DUMP" ] || usage 1

if $DRY; then command -v docker >/dev/null 2>&1 || warn "docker bulunamadı (gerçek çalıştırmada gerekli)"; else need_docker; fi
load_slugs "$SLUG"
[ -f "$DUMP" ] || die "Yedek dosyası bulunamadı: $DUMP"
[ -z "$UPLOADS" ] || [ -f "$UPLOADS" ] || die "Dosya yedeği bulunamadı: $UPLOADS"
ENVF=$(cenv "$SLUG")

confirm_slug "$SLUG" "UYARI: $SLUG müşterisinin şu anki verisi '$DUMP' yedeğiyle DEĞİŞTİRİLECEK."

say "Güvenlik yedeği (geri yüklemeden önceki durum)"
BK=("$(dirname "${BASH_SOURCE[0]}")/customer-backup.sh" "$SLUG")
if $DRY; then BK+=(--dry-run); fi
"${BK[@]}" || die "Güvenlik yedeği alınamadı; geri yükleme yapılmadı."

say "Geri yükleniyor"
ccompose "$SLUG" stop api web
ccompose "$SLUG" exec -T db pg_restore --clean --if-exists --no-owner --no-acl -U yeslojistik -d yeslojistik < "$DUMP"
if [ -n "$UPLOADS" ]; then
  run docker run --rm -v "yes-$SLUG"_uploads:/u -v "$(cd "$(dirname "$UPLOADS")" && pwd)":/b:ro alpine tar -xzf "/b/$(basename "$UPLOADS")" -C /u
fi
ccompose "$SLUG" start api web
if wait_health "$SLUG" 60; then
  say "Geri yükleme tamam: $SLUG"
else
  die "Geri yüklendi ama API açılmadı: ./deploy/customer-compose.sh $SLUG logs api"
fi
echo "  Not: $(env_get "$ENVF" DOMAIN) kullanıcıları şifrelerini yedeğin alındığı günkü haliyle kullanır."
