#!/usr/bin/env bash
# Tüm müşterilerin sağlığı: konteynerler, API (/api/health), HTTPS, disk, son yedek yaşı, sertifika süresi.
# Müşteri başına tek satır; herhangi biri bozuksa çıkış kodu 1 (cron/izleme için).
#
#   ./deploy/customer-check.sh [slug]
#
# Eşikler (ortam değişkeniyle değiştirilebilir): CHECK_DISK_MAX=85 (%), CHECK_BACKUP_MAX_HOURS=36, CHECK_CERT_MIN_DAYS=14
set -uo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

DISK_MAX=${CHECK_DISK_MAX:-85}
BACKUP_MAX_H=${CHECK_BACKUP_MAX_HOURS:-36}
CERT_MIN_D=${CHECK_CERT_MIN_DAYS:-14}

case "${1:-}" in -h|--help) sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0;; esac
command -v docker >/dev/null 2>&1 || die "docker bulunamadı."

if [ -n "${1:-}" ]; then load_slugs "$1"; else load_slugs --all; fi
if [ "${#SLUGS[@]}" -eq 0 ]; then echo "Müşteri listesi boş ($YES_REGISTRY)."; exit 0; fi

# Disk doluluğu (%): Docker verisinin ve müşteri klasörünün bulunduğu diskler, büyük olan
disk_pct() {
  local p max=0 path
  for path in /var/lib/docker "$YES_CUSTOMERS_DIR"; do
    [ -d "$path" ] || continue
    p=$(df -P "$path" 2>/dev/null | awk 'NR==2 {gsub("%","",$5); print $5}')
    [ -n "$p" ] && [ "$p" -gt "$max" ] && max=$p
  done
  echo "$max"
}
# Sertifika bitişine kalan gün (yerel 443'e SNI ile bağlanır; DNS'e bağlı değildir). Okunamazsa boş.
cert_days() {
  local host=$1 end epoch
  end=$(echo | timeout 10 openssl s_client -servername "$host" -connect "${YES_CHECK_ADDR:-127.0.0.1}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null) || return 0
  end=${end#notAfter=}
  [ -n "$end" ] || return 0
  epoch=$(date -d "$end" +%s 2>/dev/null) || return 0
  echo $(( (epoch - $(date +%s)) / 86400 ))
}

DISK=$(disk_pct)
bad_total=0
printf '%-24s %-32s %-6s %-6s %-5s %-8s %-6s %s\n' MÜŞTERİ ALAN-ADI API HTTPS DİSK YEDEK SERT. DURUM
for slug in "${SLUGS[@]}"; do
  envf=$(cenv "$slug")
  problems=()
  if [ ! -f "$envf" ]; then
    printf '%-24s %-32s %-6s %-6s %-5s %-8s %-6s %s\n' "$slug" "?" - - - - - "SORUN: .env yok"
    bad_total=$((bad_total + 1)); continue
  fi
  domain=$(env_get "$envf" DOMAIN)

  # konteynerler (db, api, web, backup)
  running=0
  for s in db api web backup; do
    [ -n "$(ccompose_raw "$slug" ps -q --status running "$s" 2>/dev/null)" ] && running=$((running + 1))
  done
  [ "$running" -eq 4 ] || problems+=("konteyner $running/4")

  # API (iç)
  if api_healthy "$slug"; then api=ok; else api=YOK; problems+=("api yanıtsız"); fi

  # HTTPS (dış yol: DNS + Caddy + sertifika)
  if curl -fs -m 10 "https://$domain/api/health" 2>/dev/null | grep -q '"status":"ok"'; then https=ok; else https=YOK; problems+=("https erişilemiyor"); fi

  # disk
  dk="%$DISK"; [ "$DISK" -lt "$DISK_MAX" ] || problems+=("disk dolu")

  # son yedek yaşı
  last=$(newest_dump "$(env_get "$envf" BACKUPS_DIR)")
  if [ -z "$last" ]; then
    created=$(env_get "$envf" CREATED)
    if [ -n "$created" ] && [ "$(date -d "$created" +%s 2>/dev/null || echo 0)" -gt $(( $(date +%s) - 129600 )) ]; then bk="bekliyor"
    else bk="YOK"; problems+=("hiç yedek yok"); fi
  else
    age_h=$(( ($(date +%s) - $(stat -c %Y "$last")) / 3600 ))
    if [ "$age_h" -ge 48 ]; then bk="$((age_h / 24))g"; else bk="${age_h}sa"; fi
    [ "$age_h" -lt "$BACKUP_MAX_H" ] || problems+=("yedek ${bk} önce")
  fi

  # sertifika
  days=$(cert_days "$domain")
  if [ -z "$days" ]; then cert="?"; problems+=("sertifika okunamadı")
  else cert="${days}g"; [ "$days" -ge "$CERT_MIN_D" ] || problems+=("sertifika ${days}g sonra bitiyor"); fi

  if [ "${#problems[@]}" -eq 0 ]; then status=TAMAM; else status="SORUN: $(IFS=,; echo "${problems[*]}")"; bad_total=$((bad_total + 1)); fi
  printf '%-24s %-32s %-6s %-6s %-5s %-8s %-6s %s\n' "$slug" "$domain" "$api" "$https" "$dk" "$bk" "$cert" "$status"
done

echo
if [ "$bad_total" -eq 0 ]; then echo "Her şey yolunda (${#SLUGS[@]} müşteri)."; exit 0; fi
echo "$bad_total müşteride sorun var."
exit 1
