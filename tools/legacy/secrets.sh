#!/usr/bin/env bash
# Ayna için giriş bilgilerini hazırlar ve sonraki adımlara $GITHUB_ENV ile aktarır.
# İki yol desteklenir:
#   1) Ayrı secret'lar: PRATIK_USER, PRATIK_PASS, PANEL_EMAIL, PANEL_PASSWORD.
#   2) Tek secret (PASS): her satırda AD=değer. Örnek:
#        PRATIK_USER=kullanici_adi
#        PRATIK_PASS=sifre
#        PANEL_EMAIL=admin@ornek.com
#        PANEL_PASSWORD=sifre
# Ayrı secret doluysa o kullanılır. Değerler loglarda maskelenir, hiçbir değer ekrana yazılmaz.
set -euo pipefail

KEYS=(PRATIK_USER PRATIK_PASS PANEL_EMAIL PANEL_PASSWORD)
declare -A val=()
for k in "${KEYS[@]}"; do
  s="S_$k"
  val[$k]="${!s:-}"
done

if [ -n "${S_PASS:-}" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|\#*) continue ;; esac
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"; v="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    v="${v#"${v%%[![:space:]]*}"}"; v="${v%"${v##*[![:space:]]}"}"
    case "$key" in PRATIK_USER|PRATIK_PASS|PANEL_EMAIL|PANEL_PASSWORD) ;; *) continue ;; esac
    if [ -z "${val[$key]}" ]; then val[$key]="$v"; fi
  done <<< "$S_PASS"
fi

missing=0
for k in "${KEYS[@]}"; do
  if [ -z "${val[$k]}" ]; then
    echo "::error::$k bulunamadı. GitHub → Settings → Secrets and variables → Actions → PASS kaydına '$k=...' satırını ekleyin."
    missing=1
  fi
done
[ "$missing" = 0 ] || exit 1

for k in "${KEYS[@]}"; do
  echo "::add-mask::${val[$k]}"
  d="EOF_$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
  printf '%s<<%s\n%s\n%s\n' "$k" "$d" "${val[$k]}" "$d" >> "$GITHUB_ENV"
done
echo "Giriş bilgileri hazır (4/4)."
