#!/bin/sh
# Yedekleri RCLONE_REMOTE hedefine kopyalar (ör. "gdrive:yeslojistik-yedek" veya "b2:bucket/yeslojistik").
# Kopyalama "copy" ile yapılır: sunucuda silinen eski yedekler hedefte kalır. Hedefteki saklama süresini sağlayıcıdan ayarlayın.
set -eu
if [ -z "${RCLONE_REMOTE:-}" ]; then
  echo "$(date '+%F %T') RCLONE_REMOTE boş, sunucu dışı yedek kapalı."
  exit 0
fi
rclone copy /backups "$RCLONE_REMOTE" --config /config/rclone/rclone.conf \
  --include 'yeslojistik-*.dump' --include 'uploads-*.tar.gz' --max-age 7d --transfers 2 --retries 5
echo "$(date '+%F %T') sunucu dışı yedek tamam: $RCLONE_REMOTE"
