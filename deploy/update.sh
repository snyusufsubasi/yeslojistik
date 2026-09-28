#!/usr/bin/env bash
# Yeni sürüme geçiş: önce yedek alır, sonra kodu çekip yeniden derler. Veritabanı güncellemeleri açılışta otomatik uygulanır.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
echo "» Güncelleme öncesi yedek alınıyor…"
"${COMPOSE[@]}" exec -T backup sh /backup.sh
echo "» Kod güncelleniyor…"
git pull --ff-only
echo "» Derleniyor ve yeniden başlatılıyor…"
"${COMPOSE[@]}" up -d --build
exec ./deploy/check.sh
