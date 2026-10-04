#!/usr/bin/env bash
# Müşteri yedeği (veritabanı + yüklenen dosyalar). deploy/backup.sh betiğini müşterinin yedek konteynerinde çalıştırır;
# yani gece otomatik alınan yedekle birebir aynıdır. Eski yedekler müşterinin kendi BACKUP_KEEP_DAYS ayarına göre silinir.
#
#   ./deploy/customer-backup.sh <slug|--all> [--dry-run]
#
# Yedekler: customers/<slug>/backups/yeslojistik-<tarih>.dump ve uploads-<tarih>.tar.gz
# Gece yedeği zaten otomatik çalışır (müşteriye göre 03:00-03:59 arası); bu betik elle/ek yedek içindir.
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

usage() { sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

TARGET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=true; shift;;
    -h|--help) usage 0;;
    --all) TARGET=--all; shift;;
    -*) die "Bilinmeyen seçenek: $1 (yardım: --help)";;
    *) [ -z "$TARGET" ] || die "Fazla argüman: $1"; TARGET=$1; shift;;
  esac
done
[ -n "$TARGET" ] || usage 1

if $DRY; then command -v docker >/dev/null 2>&1 || warn "docker bulunamadı (gerçek çalıştırmada gerekli)"; else need_docker; fi
load_slugs "$TARGET"
[ "${#SLUGS[@]}" -gt 0 ] || die "Yedeklenecek müşteri yok ($YES_REGISTRY boş)."

FAILED=()
for slug in "${SLUGS[@]}"; do
  envf=$(cenv "$slug"); bdir=$(env_get "$envf" BACKUPS_DIR); keep=$(env_get "$envf" BACKUP_KEEP_DAYS)
  say "Yedek: $slug (saklama: ${keep:-30} gün)"
  before=$(newest_dump "$bdir")
  if ccompose "$slug" exec -T -e "KEEP_DAYS=${keep:-30}" backup sh /backup.sh; then :
  elif ccompose "$slug" run --rm --no-deps -e "KEEP_DAYS=${keep:-30}" --entrypoint sh backup /backup.sh; then :   # yedek konteyneri çalışmıyorsa
  else FAILED+=("$slug"); warn "$slug yedeği alınamadı"; continue; fi
  $DRY && continue
  after=$(newest_dump "$bdir")
  if [ -n "$after" ] && [ "$after" != "$before" ]; then
    ok "$(basename "$after") ($(du -h "$after" | cut -f1))"
  else
    FAILED+=("$slug"); warn "$slug: komut bitti ama yeni yedek dosyası görünmüyor ($bdir)"
  fi
done

if [ "${#FAILED[@]}" -gt 0 ]; then say "Yedeği ALINAMAYANLAR: ${FAILED[*]}"; exit 1; fi
say "Yedekler tamam (${#SLUGS[@]} müşteri)"
