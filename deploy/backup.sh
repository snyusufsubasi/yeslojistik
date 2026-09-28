#!/bin/sh
# Günlük PostgreSQL yedeği. Yedekler ./backups klasörüne yazılır ve KEEP_DAYS günden eskileri silinir.
# ÖNEMLİ: Bu klasörü sunucu dışına da kopyalayın (bkz. docs/KURULUM.md → Yedekleme).
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="/backups/yeslojistik-$STAMP.dump"
pg_dump -Fc -f "$FILE"
echo "$(date '+%F %T') yedek alındı: $FILE ($(du -h "$FILE" | cut -f1))"
# Yüklenen dosyalar (teslim fotoğrafları, irsaliyeler)
if [ -d /uploads ]; then
  tar -czf "/backups/uploads-$STAMP.tar.gz" -C /uploads .
  echo "$(date '+%F %T') dosya yedeği alındı: uploads-$STAMP.tar.gz"
fi
find /backups \( -name 'yeslojistik-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"${KEEP_DAYS:-30}" -delete
