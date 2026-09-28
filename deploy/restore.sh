#!/bin/sh
# Kullanım: ./deploy/restore.sh backups/yeslojistik-20260101-030000.dump
# DİKKAT: Mevcut veritabanının üzerine yazar. Dosyalar (fotoğraf, irsaliye) veritabanında olduğu için bu yedeğe dahildir.
# Render'dan alınan yedek de (panel → Ayarlar → Veriler → Tam yedeği indir) aynı şekilde yüklenir.
set -eu
[ $# -eq 1 ] || { echo "Kullanım: $0 <yedek-dosyası>"; exit 1; }
docker compose stop api
docker compose exec -T db pg_restore --clean --if-exists --no-owner --no-acl -U yeslojistik -d yeslojistik < "$1"
docker compose start api
echo "Geri yükleme tamamlandı."
