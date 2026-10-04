#!/usr/bin/env bash
# YES Lojistik – müşteri betikleri (customer-*.sh) için ortak fonksiyonlar. Doğrudan çalıştırılmaz.
#
# Sunucu düzeni (depo /opt/yeslojistik içine klonlanır):
#   /opt/yeslojistik/deploy/customers.txt        müşteri listesi (gitignore'da): slug alan-adı paket tarih
#   /opt/yeslojistik/customers/<slug>/.env       o müşterinin gizli ayarları (izin 600)
#   /opt/yeslojistik/customers/<slug>/backups/   o müşterinin yedekleri
#   /opt/yeslojistik/proxy/conf.d/<slug>.caddy   müşterinin alan adı → ortak Caddy'ye kayıt
#   /opt/yeslojistik/archive/                    çıkan müşterilerin arşivi
# shellcheck shell=bash

[ -n "${_YES_LIB_LOADED:-}" ] && return 0
_YES_LIB_LOADED=1

YES_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
YES_CUSTOMERS_DIR="${YES_CUSTOMERS_DIR:-$YES_REPO/customers}"
YES_ARCHIVE_DIR="${YES_ARCHIVE_DIR:-$YES_REPO/archive}"
YES_PROXY_DIR="${YES_PROXY_DIR:-$YES_REPO/proxy}"
YES_REGISTRY="${YES_REGISTRY:-$YES_REPO/deploy/customers.txt}"
CUSTOMER_COMPOSE="$YES_REPO/deploy/customer-compose.yml"
PROXY_COMPOSE="$YES_REPO/deploy/proxy-compose.yml"
PROXY_CONTAINER="yes-proxy"
RESERVED_SLUGS=" proxy archive all customers deploy default "
PLANS="baslangic standart profesyonel kurumsal"

DRY=false

if [ -t 1 ]; then C_B=$'\033[1;34m'; C_R=$'\033[1;31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_0=$'\033[0m'; else C_B=""; C_R=""; C_G=""; C_Y=""; C_0=""; fi

say()  { printf '\n%s» %s%s\n' "$C_B" "$*" "$C_0"; }
ok()   { printf '  %s✓%s %s\n' "$C_G" "$C_0" "$*"; }
warn() { printf '  %s!%s %s\n' "$C_Y" "$C_0" "$*" >&2; }
die()  { printf '\n%sHATA: %s%s\n' "$C_R" "$*" "$C_0" >&2; exit 1; }
plan() { printf '  [dry-run] %s\n' "$*"; }

# Komutu çalıştırır; --dry-run'da yalnızca ne yapılacağını yazar.
run() {
  if $DRY; then
    printf '  [dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

# ---------- doğrulama ----------
valid_slug() {
  [[ "$1" =~ ^[a-z][a-z0-9-]{1,30}[a-z0-9]$ ]] && [[ "$1" != *--* ]] || return 1
  case "$RESERVED_SLUGS" in *" $1 "*) return 1;; esac
  return 0
}
valid_domain() { [[ "$1" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$ ]]; }
valid_email()  { [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; }
valid_plan()   { case " $PLANS " in *" $1 "*) return 0;; esac; return 1; }

# Paket → bellek sınırları "api db" (TAHMİN; gerçek kullanıma göre docker stats ile ayarlayın).
plan_mem() {
  case "$1" in
    baslangic)   echo "640m 384m";;
    standart)    echo "768m 512m";;
    profesyonel) echo "1g 1g";;
    kurumsal)    echo "1536m 1536m";;
    *)           echo "640m 384m";;
  esac
}

# ---------- rastgele sırlar ----------
# rand <uzunluk>: harf+rakam. head kullanmaz (pipefail altında SIGPIPE sorunu olmasın).
rand() {
  local n=$1 s=""
  while [ "${#s}" -lt "$n" ]; do s+="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9')"; done
  printf '%s' "${s:0:n}"
}
# Okunabilir ilk yönetici şifresi (0/O/1/l/I karışmaz). Büyük harf, küçük harf ve rakam içerir.
rand_password() {
  local s
  while :; do
    s=""
    while [ "${#s}" -lt 16 ]; do s+="$(openssl rand -base64 48 | tr -dc 'A-HJ-NP-Za-km-z2-9')"; done
    s=${s:0:16}
    [[ "$s" =~ [A-Z] && "$s" =~ [a-z] && "$s" =~ [2-9] ]] && { printf '%s' "$s"; return; }
  done
}

# ---------- müşteri listesi (deploy/customers.txt) ----------
# Satır: slug alan-adı paket tarih   (# ile başlayanlar yorum)
registry_rows() {
  [ -f "$YES_REGISTRY" ] || return 0
  grep -vE '^[[:space:]]*(#|$)' "$YES_REGISTRY" || true
}
registry_slugs() { registry_rows | awk '{print $1}'; }
registry_has()   { registry_rows | awk -v s="$1" '$1==s{f=1} END{exit !f}'; }
registry_domain_used() { registry_rows | awk -v d="$1" '$2==d{f=1} END{exit !f}'; }
registry_field() { registry_rows | awk -v s="$1" -v n="$2" '$1==s{print $n; exit}'; }
registry_add() { # slug domain plan date
  if $DRY; then plan "müşteri listesine eklenir ($YES_REGISTRY): $1 $2 $3 $4"; return 0; fi
  if [ ! -f "$YES_REGISTRY" ]; then
    printf '# slug  alan-adı  paket  oluşturulma-tarihi   (customer-new.sh yazar; elle düzenlemeyin)\n' > "$YES_REGISTRY"
  fi
  printf '%s %s %s %s\n' "$1" "$2" "$3" "$4" >> "$YES_REGISTRY"
}
registry_remove() { # slug  → satır yoruma çevrilir (geçmiş kalsın)
  if $DRY; then plan "müşteri listesinde '$1' satırı yoruma çevrilir"; return 0; fi
  [ -f "$YES_REGISTRY" ] || return 0
  local tmp line
  tmp=$(mktemp "$YES_REGISTRY.XXXXXX")
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "$1 "*) printf '# kaldırıldı %s: %s\n' "$(date +%F)" "$line";;
      *) printf '%s\n' "$line";;
    esac
  done < "$YES_REGISTRY" > "$tmp"
  mv "$tmp" "$YES_REGISTRY"
  chmod 644 "$YES_REGISTRY"
}

# ---------- .env yardımcıları ----------
cdir() { printf '%s/%s' "$YES_CUSTOMERS_DIR" "$1"; }
cenv() { printf '%s/%s/.env' "$YES_CUSTOMERS_DIR" "$1"; }
env_get() { # env_get <dosya> <ANAHTAR>
  local line
  line=$(grep -E "^$2=" "$1" 2>/dev/null | tail -1) || true
  printf '%s' "${line#*=}"
}
env_set() { # env_set <dosya> <ANAHTAR> <değer>   (izin 600 korunur)
  local f=$1 k=$2 v=$3 tmp line seen=0
  if $DRY; then plan "$f içinde $k=$v olarak güncellenir"; return 0; fi
  tmp=$(mktemp "$f.XXXXXX")
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "$k="*) printf '%s=%s\n' "$k" "$v"; seen=1;;
      *) printf '%s\n' "$line";;
    esac
  done < "$f" > "$tmp"
  [ "$seen" = 1 ] || printf '%s=%s\n' "$k" "$v" >> "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$f"
}

# write_file <yol> <izin> [mask]: içeriği stdin'den alır. mask verilirse dry-run'da şifre/anahtar satırları gizlenir.
write_file() {
  local path=$1 mode=$2 mask=${3:-} content
  content=$(cat)
  if $DRY; then
    plan "dosya yazılır: $path (izin $mode)"
    if [ "$mask" = mask ]; then
      printf '%s\n' "$content" | sed -E 's/^([A-Z_]*(PASSWORD|KEY|TOKEN)[A-Z_]*)=.*/\1=********/; s/^/        | /'
    else
      printf '%s\n' "$content" | sed 's/^/        | /'
    fi
    return 0
  fi
  ( umask 077; printf '%s\n' "$content" > "$path" )
  chmod "$mode" "$path"
}

# ---------- docker compose ----------
# Müşterinin compose projesi: yes-<slug>. Şablon tüm müşteriler için tektir (deploy/customer-compose.yml).
ccompose_raw() { # her zaman çalıştırır (okuma amaçlı sorgular)
  local slug=$1; shift
  local d; d=$(cdir "$slug")
  docker compose -p "yes-$slug" --project-directory "$d" --env-file "$d/.env" -f "$CUSTOMER_COMPOSE" "$@"
}
ccompose() { # --dry-run'da yalnızca yazar
  local slug=$1; shift
  local d; d=$(cdir "$slug")
  run docker compose -p "yes-$slug" --project-directory "$d" --env-file "$d/.env" -f "$CUSTOMER_COMPOSE" "$@"
}

# Uygulama sağlıklı mı? (konteyner içinden, ana makineye port açmadan)
api_healthy() { # slug
  local out
  out=$(ccompose_raw "$1" exec -T api curl -fs http://localhost:8080/api/health 2>/dev/null) || return 1
  case "$out" in *'"status":"ok"'*) return 0;; esac
  return 1
}
wait_health() { # slug [deneme sayısı; her deneme ~3 sn]
  local slug=$1 tries=${2:-60} i
  if $DRY; then plan "$slug için /api/health yanıtı beklenir (en çok $((tries * 3)) sn)"; return 0; fi
  for ((i = 0; i < tries; i++)); do
    if api_healthy "$slug"; then return 0; fi
    sleep "${YES_HEALTH_SLEEP:-3}"
  done
  return 1
}

# ---------- imajlar ----------
current_tag() {
  local t
  t=$(git -C "$YES_REPO" rev-parse --short=10 HEAD 2>/dev/null) || t=""
  if [ -z "$t" ]; then t="manual-$(date +%Y%m%d%H%M)"
  elif [ -n "$(git -C "$YES_REPO" status --porcelain --untracked-files=no 2>/dev/null)" ]; then t="$t-dirty"; fi
  printf '%s' "$t"
}
ensure_images() { # tag  → yeslojistik-api:<tag> ve yeslojistik-web:<tag> yoksa derler (tüm müşteriler paylaşır)
  local tag=$1 pair name ctx
  for pair in "api:server" "web:client"; do
    name="yeslojistik-${pair%%:*}"; ctx="$YES_REPO/${pair##*:}"
    if ! $DRY && docker image inspect "$name:$tag" >/dev/null 2>&1; then
      ok "$name:$tag zaten derlenmiş"
    else
      run docker build -t "$name:$tag" "$ctx"
    fi
  done
}

# ---------- ortak Caddy (alan adı yönlendirici) ----------
proxy_running() { [ "$(docker inspect -f '{{.State.Running}}' "$PROXY_CONTAINER" 2>/dev/null)" = true ]; }
ensure_proxy() {
  if $DRY; then
    plan "$YES_PROXY_DIR/conf.d oluşturulur; ortak Caddy ($PROXY_CONTAINER) yoksa başlatılır (80/443 portları)"
    return 0
  fi
  install -d -m 755 "$YES_PROXY_DIR" "$YES_PROXY_DIR/conf.d"
  [ -f "$YES_PROXY_DIR/conf.d/00-bos.caddy" ] || printf '# Müşteri kayıtları bu klasöre <slug>.caddy olarak eklenir.\n' > "$YES_PROXY_DIR/conf.d/00-bos.caddy"
  if ! proxy_running; then
    if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '$4 ~ /:(80|443)$/ {f=1} END{exit !f}'; then
      die "80 veya 443 portunu başka bir program kullanıyor (eski tek-müşteri kurulumu olabilir). Önce onu durdurun: docs/MUSTERI-KURULUM.md → Sorun giderme."
    fi
    say "Ortak Caddy (HTTPS yönlendirici) başlatılıyor…"
    YES_PROXY_DIR="$YES_PROXY_DIR" docker compose -p yes-proxy -f "$PROXY_COMPOSE" up -d
  fi
}
caddy_reload() {
  if $DRY; then plan "Caddy ayarı doğrulanır ve yeniden yüklenir (docker exec $PROXY_CONTAINER caddy validate / reload)"; return 0; fi
  docker exec "$PROXY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 || return 1
  docker exec "$PROXY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || return 1
}

# ---------- seçim ----------
# select_customers <slug|--all>: geçerli slug'ları satır satır yazar
select_customers() {
  local target=$1 s
  if [ "$target" = "--all" ]; then
    registry_slugs
    return 0
  fi
  valid_slug "$target" || die "Geçersiz müşteri kodu: '$target'"
  registry_has "$target" || die "'$target' müşteri listesinde yok ($YES_REGISTRY). Kayıtlılar: $(registry_slugs | tr '\n' ' ')"
  s=$(cdir "$target")
  [ -f "$s/.env" ] || die "$s/.env bulunamadı."
  printf '%s\n' "$target"
}

# load_slugs <slug|--all>: SLUGS dizisini doldurur; geçersizse betiği sonlandırır
# shellcheck disable=SC2034  # SLUGS çağıran betikte kullanılır
load_slugs() {
  local out
  out=$(select_customers "$1") || exit 1
  SLUGS=()
  [ -z "$out" ] || mapfile -t SLUGS <<< "$out"
}

newest_dump() { # dizin → en yeni yeslojistik-*.dump yolu (yoksa boş)
  local best="" f
  for f in "$1"/yeslojistik-*.dump; do
    [ -e "$f" ] || continue
    if [ -z "$best" ] || [ "$f" -nt "$best" ]; then best=$f; fi
  done
  printf '%s' "$best"
}

# Slug'ı yazarak onay (ters çevrilemez işlemler için). Girdi stdin'den okunur.
confirm_slug() { # slug [mesaj]
  local ans
  printf '%s\n   Onaylamak için müşteri kodunu yazın (%s): ' "${2:-}" "$1" >&2
  read -r ans || ans=""
  [ "$ans" = "$1" ] || die "Onaylanmadı, hiçbir şey yapılmadı."
}

need_docker() {
  command -v docker >/dev/null 2>&1 || die "docker bulunamadı. Önce ./deploy/install.sh ya da docs/MUSTERI-KURULUM.md → Sunucu hazırlığı."
  docker compose version >/dev/null 2>&1 || die "Docker Compose eklentisi bulunamadı (docker compose)."
}
