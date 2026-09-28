#!/bin/sh
# Günlük PostgreSQL yedeği. Yedekler ./backups klasörüne yazılır ve KEEP_DAYS günden eskileri silinir.
# ÖNEMLİ: Bu klasörü sunucu dışına da kopyalayın (bkz. docs/KURULUM.md → Yedekleme).
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="/backups/yeslojistik-$STAMP.dump"
pg_dump -Fc -f "$FILE"
echo "$(date '+%F %T') yedek alındı: $FILE ($(du -h "$FILE" | cut -f1))"
find /backups -name 'yeslojistik-*.dump' -mtime +"${KEEP_DAYS:-30}" -delete
