#!/usr/bin/env bash
# Sistemin durumunu kontrol eder: servisler, API, veritabanı, son yedek, disk.
set -uo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
fail=0
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$*"; fail=1; }

echo "Servisler:"
for s in db api web caddy backup; do
  if [ -n "$("${COMPOSE[@]}" ps -q --status running "$s" 2>/dev/null)" ]; then ok "$s çalışıyor"; else bad "$s çalışmıyor"; fi
done

echo "Uygulama:"
for _ in $(seq 1 20); do
  health=$("${COMPOSE[@]}" exec -T api curl -fs http://localhost:8080/api/health 2>/dev/null) && break
  sleep 3
done
case "${health:-}" in *ok*) ok "API ve veritabanı yanıt veriyor";; *) bad "API yanıt vermiyor (docker compose logs api)";; esac
DOMAIN=$(grep -E '^DOMAIN=' .env 2>/dev/null | cut -d= -f2-)
if [ -n "$DOMAIN" ] && command -v curl >/dev/null; then
  if curl -fs -m 10 -o /dev/null "https://$DOMAIN/api/health" 2>/dev/null; then ok "https://$DOMAIN erişilebilir"; else bad "https://$DOMAIN erişilemiyor (DNS/sertifika/port 443)"; fi
fi

echo "Yedek:"
last=$(ls -t backups/yeslojistik-*.dump 2>/dev/null | head -1)
if [ -z "$last" ]; then echo "  – Henüz yedek yok (ilk yedek gece 03:00'te; hemen almak için: ${COMPOSE[*]} exec backup sh /backup.sh)"
elif [ -n "$(find "$last" -mtime -2)" ]; then ok "Son yedek: $(basename "$last")"
else bad "Son yedek 2 günden eski: $(basename "$last")"; fi

echo "Disk:"
use=$(df -P . | awk 'NR==2 {gsub("%","",$5); print $5}')
if [ "$use" -lt 85 ]; then ok "Disk doluluğu %$use"; else bad "Disk doluluğu %$use – yer açın"; fi

[ $fail -eq 0 ] && echo "Her şey yolunda." || { echo "Sorun var, yukarıdaki ✗ satırlarına bakın."; exit 1; }
