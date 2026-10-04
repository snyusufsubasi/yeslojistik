#!/usr/bin/env bash
# Bir müşterinin docker compose komutlarını doğru ayarlarla çalıştırır.
#   ./deploy/customer-compose.sh <slug> ps
#   ./deploy/customer-compose.sh <slug> logs -f api
#   ./deploy/customer-compose.sh <slug> up -d        (.env düzenlendikten sonra ayarı uygular)
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"
[ $# -ge 2 ] || { echo "Kullanım: $0 <slug> <docker compose komutu…>   örn: $0 ornek-nakliyat logs -f api" >&2; exit 1; }
slug=$1; shift
valid_slug "$slug" || die "Geçersiz müşteri kodu: $slug"
[ -f "$(cenv "$slug")" ] || die "Müşteri bulunamadı: $(cenv "$slug")"
need_docker
ccompose_raw "$slug" "$@"
