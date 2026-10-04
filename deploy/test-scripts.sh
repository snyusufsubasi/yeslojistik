#!/usr/bin/env bash
# deploy/customer-*.sh betiklerinin testi. Gerçek docker/sunucu GEREKTİRMEZ:
#   - --dry-run senaryoları ve ret (hata) senaryoları,
#   - sahte (stub) docker/curl/openssl ile tam akış: kurulum, yedek, güncelleme + otomatik geri dönüş, kontrol tablosu, çıkarma,
#   - docker compose varsa şablonların `docker compose config` ile doğrulanması.
# Her şey geçici bir klasörde yapılır; gerçek müşteri klasörlerine/listesine dokunulmaz.
#
#   ./deploy/test-scripts.sh
# assert_true koşulları bilerek tek tırnaklı metindir (eval ile çalışır); SC2034 yanlış alarmı eval kaynaklıdır.
# shellcheck disable=SC2016,SC2034,SC2012
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0

good() { pass=$((pass + 1)); printf '  ok    %s\n' "$1"; }
bad()  { fail=$((fail + 1)); printf '  FAIL  %s\n' "$1"; [ -z "${2:-}" ] || printf '%s\n' "$2" | head -25 | sed 's/^/        | /'; }
assert_rc0()  { if [ "$2" -eq 0 ]; then good "$1"; else bad "$1 (çıkış kodu $2, 0 beklenirdi)" "$3"; fi; }
assert_fail() { if [ "$2" -ne 0 ]; then good "$1"; else bad "$1 (0 döndü, hata beklenirdi)" "$3"; fi; }
assert_has()  { if printf '%s' "$2" | grep -qF -- "$3"; then good "$1"; else bad "$1 (şu metin yok: $3)" "$2"; fi; }
assert_lacks() { if printf '%s' "$2" | grep -qF -- "$3"; then bad "$1 (olmaması gereken metin var: $3)" "$2"; else good "$1"; fi; }
assert_true() { if eval "$2"; then good "$1"; else bad "$1 (koşul sağlanmadı: $2)"; fi; }

export YES_CUSTOMERS_DIR="$TMP/customers" YES_PROXY_DIR="$TMP/proxy" YES_REGISTRY="$TMP/customers.txt" YES_ARCHIVE_DIR="$TMP/archive"
export YES_HEALTH_SLEEP=0 CHECK_DISK_MAX=101
export STUB_LOG="$TMP/docker.log"
: > "$STUB_LOG"
REAL_DOCKER="$(command -v docker || true)"; export REAL_DOCKER
REAL_OPENSSL="$(command -v openssl)"; export REAL_OPENSSL

# ---------- sahte komutlar ----------
mkdir -p "$TMP/bin"
cat > "$TMP/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
args=("$@"); envf=""
for ((i = 0; i < ${#args[@]}; i++)); do [ "${args[i]}" = --env-file ] && envf=${args[i + 1]}; done
tag=""; [ -n "$envf" ] && [ -f "$envf" ] && tag=$(grep -E '^IMAGE_TAG=' "$envf" | tail -1 | cut -d= -f2-)
case " $* " in
  *" compose version "*) exit 0;;
  *" config "*) if [ -n "$REAL_DOCKER" ]; then exec "$REAL_DOCKER" "$@"; else exit 0; fi;;
  *" image inspect "*) exit 0;;
  *" inspect -f "*) echo true; exit 0;;
  *" exec -T api curl "*)
    [ -z "${STUB_UNHEALTHY:-}" ] || exit 22
    if [ -n "$tag" ] && [ "$tag" = "${STUB_BAD_TAG:-}" ]; then exit 22; fi
    echo '{"status":"ok","version":"2.0.0"}'; exit 0;;
  *" backup sh /backup.sh "*)
    [ -z "${STUB_BACKUP_FAIL:-}" ] || exit 1
    d=$(grep -E '^BACKUPS_DIR=' "$envf" | cut -d= -f2-); touch "$d/yeslojistik-$(date +%s%N).dump"; exit 0;;
  *" ps -q "*) echo abc123; exit 0;;
esac
exit 0
STUB
cat > "$TMP/bin/curl" <<'STUB'
#!/usr/bin/env bash
[ -z "${STUB_HTTPS_FAIL:-}" ] || exit 22
echo '{"status":"ok"}'
STUB
cat > "$TMP/bin/openssl" <<'STUB'
#!/usr/bin/env bash
case "${1:-}" in
  s_client) echo "FAKE";;
  x509) cat > /dev/null; echo "notAfter=$(date -u -d "+${STUB_CERT_DAYS:-60} days" '+%b %e %H:%M:%S %Y GMT')";;
  *) exec "$REAL_OPENSSL" "$@";;
esac
STUB
chmod +x "$TMP/bin/docker" "$TMP/bin/curl" "$TMP/bin/openssl"

NEW="$HERE/customer-new.sh"; UPD="$HERE/customer-update.sh"; CHK="$HERE/customer-check.sh"
BAK="$HERE/customer-backup.sh"; REM="$HERE/customer-remove.sh"; RST="$HERE/customer-restore.sh"

echo "1) Sözdizimi ve shellcheck"
for f in "$HERE"/*.sh; do
  out=$(bash -n "$f" 2>&1); assert_rc0 "bash -n $(basename "$f")" $? "$out"
done
if command -v shellcheck >/dev/null 2>&1; then
  out=$(cd "$HERE" && shellcheck -x lib-customers.sh customer-*.sh 2>&1); assert_rc0 "shellcheck (müşteri betikleri)" $? "$out"
else
  echo "  --    shellcheck kurulu değil, atlandı"
fi

echo "2) customer-new.sh --dry-run"
printf 'ornek-lisans-anahtari-123.abc\n' > "$TMP/lisans.txt"
out=$("$NEW" acme-nakliyat Acme.Example.com.tr --plan standart --admin-email patron@acme.example.com.tr --license-key-file "$TMP/lisans.txt" --dry-run 2>&1); rc=$?
assert_rc0 "dry-run başarılı" $rc "$out"
assert_has "compose proje adı yes-<slug>" "$out" "yes-acme-nakliyat"
assert_has "alan adı küçük harfe çevrilir" "$out" "acme.example.com.tr {"
assert_has "Caddy kaydı üretilir" "$out" "conf.d/acme-nakliyat.caddy"
assert_has "Caddy iç ağdan web konteynerine yönlenir" "$out" "reverse_proxy yes-acme-nakliyat-web:80"
assert_has "Seed e-postası argümandan" "$out" "ADMIN_EMAIL=patron@acme.example.com.tr"
assert_has "paket belleği (standart)" "$out" "API_MEM=768m"
assert_has "env dosyası izni 600" "$out" "(izin 600)"
assert_has "şifreler maskeli" "$out" "POSTGRES_PASSWORD=********"
assert_lacks "lisans anahtarı çıktıya sızmaz" "$out" "ornek-lisans-anahtari"
assert_has "kayıt satırı eklenir (plan)" "$out" "müşteri listesine eklenir"
assert_has "dry-run uyarısı" "$out" "Hiçbir şey değiştirilmedi"
assert_true "dry-run müşteri klasörü oluşturmaz" '[ ! -e "$YES_CUSTOMERS_DIR" ]'
assert_true "dry-run müşteri listesi yazmaz" '[ ! -e "$YES_REGISTRY" ]'
assert_true "dry-run proxy klasörü oluşturmaz" '[ ! -e "$YES_PROXY_DIR" ]'
assert_true "dry-run docker çağırmaz" '[ ! -s "$STUB_LOG" ] || ! grep -q "up -d" "$STUB_LOG"'

out=$("$NEW" acme-nakliyat acme.example.com.tr --dry-run 2>&1); rc=$?
assert_rc0 "dry-run varsayılanlarla (paket, e-posta)" $rc "$out"
assert_has "varsayılan yönetici e-postası" "$out" "ADMIN_EMAIL=admin@acme.example.com.tr"
assert_has "varsayılan paket başlangıç" "$out" "PLAN=baslangic"
assert_has "lisans yoksa not düşülür" "$out" "anahtar verilmedi"

echo "3) Reddedilen girdiler"
out=$("$NEW" Acme_X acme.example.com --dry-run 2>&1); assert_fail "büyük harf/alt çizgili slug reddedilir" $? "$out"
out=$("$NEW" proxy acme.example.com --dry-run 2>&1); assert_fail "ayrılmış slug (proxy) reddedilir" $? "$out"
out=$("$NEW" a acme.example.com --dry-run 2>&1); assert_fail "çok kısa slug reddedilir" $? "$out"
out=$("$NEW" acme--x acme.example.com --dry-run 2>&1); assert_fail "çift tireli slug reddedilir" $? "$out"
out=$("$NEW" acme https://acme.example.com --dry-run 2>&1); assert_fail "URL biçiminde alan adı reddedilir" $? "$out"
out=$("$NEW" acme localhost --dry-run 2>&1); assert_fail "noktasız alan adı reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com --plan altin --dry-run 2>&1); assert_fail "bilinmeyen paket reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com --admin-email bozuk --dry-run 2>&1); assert_fail "geçersiz e-posta reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com --license-key-file "$TMP/yok.txt" --dry-run 2>&1); assert_fail "olmayan lisans dosyası reddedilir" $? "$out"
printf 'abc$def\n' > "$TMP/kotu.txt"
out=$("$NEW" acme acme.example.com --license-key-file "$TMP/kotu.txt" --dry-run 2>&1); assert_fail "\$ içeren lisans anahtarı reddedilir" $? "$out"
: > "$TMP/bos.txt"
out=$("$NEW" acme acme.example.com --license-key-file "$TMP/bos.txt" --dry-run 2>&1); assert_fail "boş lisans dosyası reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com --keep-days 0 --dry-run 2>&1); assert_fail "--keep-days 0 reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com fazla --dry-run 2>&1); assert_fail "fazla argüman reddedilir" $? "$out"
out=$("$NEW" acme 2>&1); assert_fail "eksik argüman reddedilir" $? "$out"
out=$("$NEW" acme acme.example.com --resume --dry-run 2>&1); assert_fail "olmayan kurulum için --resume reddedilir" $? "$out"

echo "4) Mevcut müşterinin üzerine yazılmaz"
mkdir -p "$YES_CUSTOMERS_DIR/var-olan"; echo "dokunma" > "$YES_CUSTOMERS_DIR/var-olan/.env"
out=$("$NEW" var-olan yeni.example.com --dry-run 2>&1); rc=$?
assert_fail "var olan slug reddedilir (dry-run)" $rc "$out"
assert_has "ret nedeni yazılır" "$out" "zaten var"
assert_true "var olan dosya değişmez" '[ "$(cat "$YES_CUSTOMERS_DIR/var-olan/.env")" = dokunma ]'
rm -rf "$YES_CUSTOMERS_DIR/var-olan"

echo "5) Şablonlar: docker compose config"
if [ -n "$REAL_DOCKER" ] && "$REAL_DOCKER" compose version >/dev/null 2>&1; then
  cat > "$TMP/ornek.env" <<'ENV'
CUSTOMER_SLUG=ornek
DOMAIN=panel.ornek.com
YES_REPO=/opt/yeslojistik
BACKUPS_DIR=/opt/yeslojistik/customers/ornek/backups
IMAGE_TAG=abc1234567
POSTGRES_PASSWORD=test-sifre
JWT_KEY=test-anahtar-test-anahtar-test-anahtar-12
ADMIN_EMAIL=admin@ornek.com
PUBLIC_URL=https://panel.ornek.com
BACKUP_MIN=17
ENV
  out=$("$REAL_DOCKER" compose -p yes-ornek --env-file "$TMP/ornek.env" -f "$HERE/customer-compose.yml" config 2>&1); rc=$?
  assert_rc0 "customer-compose.yml geçerli" $rc "$out"
  assert_has "web ortak ağda benzersiz takma adla" "$out" "yes-ornek-web"
  assert_has "ortak ağ yes-proxy (harici)" "$out" "name: yes-proxy"
  assert_lacks "hiçbir servis ana makineye port açmaz" "$out" "published:"
  assert_has "cron saati müşteriye göre" "$out" "17 3 * * *"
  grep -v '^JWT_KEY=' "$TMP/ornek.env" > "$TMP/eksik.env"
  out=$("$REAL_DOCKER" compose -p yes-ornek --env-file "$TMP/eksik.env" -f "$HERE/customer-compose.yml" config 2>&1); rc=$?
  assert_fail "JWT_KEY eksikse compose reddeder" $rc "$out"
  out=$(YES_PROXY_DIR="$TMP/proxy" "$REAL_DOCKER" compose -p yes-proxy -f "$HERE/proxy-compose.yml" config 2>&1); rc=$?
  assert_rc0 "proxy-compose.yml geçerli" $rc "$out"
else
  echo "  --    docker compose yok, atlandı"
fi

# Bundan sonrası sahte docker ile
export PATH="$TMP/bin:$PATH"

echo "6) Gerçek akış (sahte docker): customer-new.sh"
out=$("$NEW" acme-nakliyat acme.example.com.tr --plan standart --admin-email patron@acme.example.com.tr --license-key-file "$TMP/lisans.txt" 2>&1); rc=$?
assert_rc0 "kurulum başarılı" $rc "$out"
ENVF="$YES_CUSTOMERS_DIR/acme-nakliyat/.env"
PW=$(printf '%s\n' "$out" | sed -n 's/^  İlk şifre : \([A-Za-z0-9]*\)$/\1/p')
assert_true "ilk şifre bir kez gösterilir (16 karakter)" '[ "${#PW}" -eq 16 ]'
assert_true "şifre .env içinde ve çıktıdakiyle aynı" 'grep -qx "ADMIN_PASSWORD=$PW" "$ENVF"'
assert_true ".env izni 600" '[ "$(stat -c %a "$ENVF")" = 600 ]'
assert_true "müşteri klasörü izni 700" '[ "$(stat -c %a "$YES_CUSTOMERS_DIR/acme-nakliyat")" = 700 ]'
assert_true "yedek klasörü var" '[ -d "$YES_CUSTOMERS_DIR/acme-nakliyat/backups" ]'
assert_true "Jwt anahtarı 64 karakter" '[ "$(grep ^JWT_KEY= "$ENVF" | cut -d= -f2- | tr -d "\n" | wc -c)" -eq 64 ]'
assert_true "veritabanı şifresi 32 karakter" '[ "$(grep ^POSTGRES_PASSWORD= "$ENVF" | cut -d= -f2- | tr -d "\n" | wc -c)" -eq 32 ]'
assert_true "lisans anahtarı .env içinde" 'grep -qx "LICENSE_KEY=ornek-lisans-anahtari-123.abc" "$ENVF"'
assert_true "yönetici e-postası .env içinde" 'grep -qx "ADMIN_EMAIL=patron@acme.example.com.tr" "$ENVF"'
JWTV=$(grep ^JWT_KEY= "$ENVF" | cut -d= -f2-); PGV=$(grep ^POSTGRES_PASSWORD= "$ENVF" | cut -d= -f2-)
assert_lacks "Jwt anahtarı çıktıya sızmaz" "$out" "$JWTV"
assert_lacks "veritabanı şifresi çıktıya sızmaz" "$out" "$PGV"
assert_lacks "lisans anahtarı çıktıya sızmaz" "$out" "ornek-lisans-anahtari"
assert_true "kurulum işareti temizlendi" '[ ! -e "$YES_CUSTOMERS_DIR/acme-nakliyat/.kurulum-yarim" ]'
assert_true "müşteri listesinde kayıtlı" 'grep -q "^acme-nakliyat acme.example.com.tr standart " "$YES_REGISTRY"'
assert_true "Caddy kaydı yazıldı" 'grep -q "reverse_proxy yes-acme-nakliyat-web:80" "$YES_PROXY_DIR/conf.d/acme-nakliyat.caddy"'
assert_true "compose projesi yes-acme-nakliyat ile başlatıldı" 'grep -q "compose -p yes-acme-nakliyat .* up -d" "$STUB_LOG"'
assert_true "Caddy doğrulanıp yeniden yüklendi" 'grep -q "caddy reload" "$STUB_LOG"'
assert_has "adres yazılır" "$out" "https://acme.example.com.tr"

out=$("$NEW" acme-nakliyat acme.example.com.tr 2>&1); rc=$?
assert_fail "aynı slug ikinci kez reddedilir" $rc "$out"
assert_has "ret nedeni" "$out" "zaten var"
out=$("$NEW" baska-firma acme.example.com.tr 2>&1); rc=$?
assert_fail "başka müşterinin alan adı reddedilir" $rc "$out"
assert_has "alan adı çakışma nedeni" "$out" "başka bir müşteriye ait"

out=$("$NEW" beta-lojistik beta.example.com.tr 2>&1); assert_rc0 "ikinci müşteri kurulur" $? "$out"
PW2=$(printf '%s\n' "$out" | sed -n 's/^  İlk şifre : \([A-Za-z0-9]*\)$/\1/p')
assert_true "müşterilerin şifreleri farklı" '[ -n "$PW2" ] && [ "$PW" != "$PW2" ]'
assert_true "ikinci müşterinin Jwt anahtarı farklı" '[ "$JWTV" != "$(grep ^JWT_KEY= "$YES_CUSTOMERS_DIR/beta-lojistik/.env" | cut -d= -f2-)" ]'
assert_true "yedek saatleri dağıtılır (dakika alanı mevcut)" 'grep -q "^BACKUP_MIN=[0-9]" "$YES_CUSTOMERS_DIR/beta-lojistik/.env"'

echo "7) Yarım kalan kurulum: --resume"
out=$(STUB_UNHEALTHY=1 "$NEW" gama-tasimacilik gama.example.com.tr 2>&1); rc=$?
assert_fail "sağlıksız başlangıç hata verir" $rc "$out"
assert_true "yarım kurulum işaretli" '[ -f "$YES_CUSTOMERS_DIR/gama-tasimacilik/.kurulum-yarim" ]'
assert_true "yarım kurulum listeye yazılmaz" '! grep -q gama-tasimacilik "$YES_REGISTRY"'
out=$("$NEW" gama-tasimacilik gama.example.com.tr 2>&1); assert_fail "--resume olmadan üzerine yazılmaz" $? "$out"
GAMA_PW=$(grep ^ADMIN_PASSWORD= "$YES_CUSTOMERS_DIR/gama-tasimacilik/.env")
out=$("$NEW" gama-tasimacilik gama.example.com.tr --resume 2>&1); rc=$?
assert_rc0 "--resume ile tamamlanır" $rc "$out"
assert_true "resume şifreyi değiştirmez" '[ "$(grep ^ADMIN_PASSWORD= "$YES_CUSTOMERS_DIR/gama-tasimacilik/.env")" = "$GAMA_PW" ]'
assert_true "resume sonrası listede" 'grep -q "^gama-tasimacilik " "$YES_REGISTRY"'
out=$("$NEW" gama-tasimacilik baska.example.com.tr --resume 2>&1); assert_fail "resume farklı alan adıyla reddedilir" $? "$out"

echo "8) customer-backup.sh"
n0=$(ls "$YES_CUSTOMERS_DIR/acme-nakliyat/backups" | wc -l)
out=$("$BAK" acme-nakliyat 2>&1); rc=$?
assert_rc0 "tek müşteri yedeği" $rc "$out"
assert_true "yeni yedek dosyası oluştu" '[ "$(ls "$YES_CUSTOMERS_DIR/acme-nakliyat/backups" | wc -l)" -gt "$n0" ]'
assert_true "müşterinin kendi saklama günü iletilir" 'grep -q "KEEP_DAYS=30" "$STUB_LOG"'
out=$("$BAK" --all 2>&1); assert_rc0 "--all yedeği" $? "$out"
assert_has "--all her müşteriyi işler" "$out" "beta-lojistik"
out=$("$BAK" yok-boyle 2>&1); assert_fail "kayıtsız müşteri reddedilir" $? "$out"
out=$(STUB_BACKUP_FAIL=1 "$BAK" acme-nakliyat 2>&1); assert_fail "yedek hatası sıfırdan farklı kodla döner" $? "$out"
out=$("$BAK" acme-nakliyat --dry-run 2>&1); rc=$?
assert_rc0 "yedek --dry-run" $rc "$out"
assert_has "dry-run yedek komutunu gösterir" "$out" "/backup.sh"

echo "9) customer-check.sh"
touch "$YES_CUSTOMERS_DIR/gama-tasimacilik/backups/yeslojistik-test.dump"
out=$("$CHK" 2>&1); rc=$?
assert_rc0 "her şey sağlıklıyken çıkış 0" $rc "$out"
assert_has "tablo: acme satırı TAMAM" "$(printf '%s\n' "$out" | grep '^acme-nakliyat')" "TAMAM"
assert_true "tabloda müşteri başına tek satır" '[ "$(printf "%s\n" "$out" | grep -cE "^(acme-nakliyat|beta-lojistik|gama-tasimacilik) ")" -eq 3 ]'
out=$(STUB_HTTPS_FAIL=1 "$CHK" 2>&1); rc=$?
assert_fail "HTTPS bozukken çıkış 1" $rc "$out"
assert_has "HTTPS sorunu yazılır" "$out" "https erişilemiyor"
out=$(STUB_CERT_DAYS=5 "$CHK" acme-nakliyat 2>&1); rc=$?
assert_fail "sertifika bitmek üzereyken çıkış 1" $rc "$out"
assert_has "sertifika sorunu yazılır" "$out" "sertifika"
out=$(STUB_UNHEALTHY=1 "$CHK" acme-nakliyat 2>&1); assert_fail "API yanıtsızken çıkış 1" $? "$out"
out=$(CHECK_DISK_MAX=0 "$CHK" acme-nakliyat 2>&1); assert_fail "disk eşiği aşılınca çıkış 1" $? "$out"
find "$YES_CUSTOMERS_DIR/gama-tasimacilik/backups" -name '*.dump' -exec touch -d '3 days ago' {} +
out=$("$CHK" gama-tasimacilik 2>&1); rc=$?
assert_fail "eski yedek (3 gün) çıkış 1" $rc "$out"
assert_has "yedek sorunu yazılır" "$out" "yedek"
out=$("$CHK" yok-boyle 2>&1); assert_fail "kayıtsız müşteri için çıkış 1" $? "$out"

echo "10) customer-update.sh (sağlık kontrolü + otomatik geri dönüş)"
OLD=$(grep ^IMAGE_TAG= "$ENVF" | cut -d= -f2-)
out=$("$UPD" acme-nakliyat --no-pull --tag v2 --dry-run 2>&1); rc=$?
assert_rc0 "güncelleme --dry-run" $rc "$out"
assert_has "dry-run etiketi değiştireceğini yazar" "$out" "IMAGE_TAG=v2"
assert_true "dry-run .env'i değiştirmez" '[ "$(grep ^IMAGE_TAG= "$ENVF" | cut -d= -f2-)" = "$OLD" ]'
out=$("$UPD" acme-nakliyat --no-pull --tag v2 2>&1); rc=$?
assert_rc0 "başarılı güncelleme" $rc "$out"
assert_true "IMAGE_TAG güncellendi" '[ "$(grep ^IMAGE_TAG= "$ENVF" | cut -d= -f2-)" = v2 ]'
assert_true "önceki etiket geri dönüş için saklandı" '[ "$(grep ^PREV_IMAGE_TAG= "$ENVF" | cut -d= -f2-)" = "$OLD" ]'
assert_true ".env izni güncellemeden sonra 600" '[ "$(stat -c %a "$ENVF")" = 600 ]'
assert_true "diğer müşteri dokunulmadı" '[ "$(grep ^IMAGE_TAG= "$YES_CUSTOMERS_DIR/beta-lojistik/.env" | cut -d= -f2-)" = "$OLD" ]'
out=$("$UPD" acme-nakliyat --no-pull --tag v2 2>&1); assert_rc0 "aynı sürüm tekrar: işlem yok" $? "$out"
assert_has "zaten güncel mesajı" "$out" "zaten v2"

n1=$(ls "$YES_CUSTOMERS_DIR/acme-nakliyat/backups" | wc -l)
out=$(STUB_BAD_TAG=bozuk "$UPD" acme-nakliyat --no-pull --tag bozuk 2>&1); rc=$?
assert_fail "bozuk sürüm hata kodu verir" $rc "$out"
assert_has "otomatik geri dönüş yapılır" "$out" "ÖNCEKİ SÜRÜME DÖNÜLÜYOR"
assert_true "IMAGE_TAG önceki sürüme döndü" '[ "$(grep ^IMAGE_TAG= "$ENVF" | cut -d= -f2-)" = v2 ]'
assert_true "PREV_IMAGE_TAG korundu" '[ "$(grep ^PREV_IMAGE_TAG= "$ENVF" | cut -d= -f2-)" = "$OLD" ]'
assert_true "güncelleme öncesi yedek alınmıştı" '[ "$(ls "$YES_CUSTOMERS_DIR/acme-nakliyat/backups" | wc -l)" -gt "$n1" ]'

out=$(STUB_BACKUP_FAIL=1 "$UPD" beta-lojistik --no-pull --tag v3 2>&1); rc=$?
assert_fail "yedek alınamazsa güncellenmez" $rc "$out"
assert_true "yedeksiz güncelleme yapılmadı" '[ "$(grep ^IMAGE_TAG= "$YES_CUSTOMERS_DIR/beta-lojistik/.env" | cut -d= -f2-)" = "$OLD" ]'

out=$(STUB_BAD_TAG=v4 "$UPD" --all --no-pull --tag v4 2>&1); rc=$?
assert_fail "--all: ilk hatada durur" $rc "$out"
assert_true "--all: durduktan sonra kalan müşteriye dokunulmadı" '[ "$(grep ^IMAGE_TAG= "$YES_CUSTOMERS_DIR/gama-tasimacilik/.env" | cut -d= -f2-)" = "$OLD" ]'
out=$("$UPD" --all --no-pull --tag v5 2>&1); assert_rc0 "--all hepsini sırayla günceller" $? "$out"
assert_true "--all: gama güncellendi" '[ "$(grep ^IMAGE_TAG= "$YES_CUSTOMERS_DIR/gama-tasimacilik/.env" | cut -d= -f2-)" = v5 ]'
out=$("$UPD" yok-boyle --no-pull 2>&1); assert_fail "kayıtsız müşteri reddedilir" $? "$out"
out=$("$UPD" 2>&1); assert_fail "argümansız çağrı reddedilir" $? "$out"

echo "11) customer-restore.sh"
DUMP=$(ls "$YES_CUSTOMERS_DIR/acme-nakliyat/backups/"yeslojistik-*.dump | head -1)
out=$(printf 'yanlis\n' | "$RST" acme-nakliyat "$DUMP" 2>&1); rc=$?
assert_fail "yanlış onayda geri yükleme yapılmaz" $rc "$out"
assert_lacks "yanlış onayda pg_restore çağrılmaz" "$(cat "$STUB_LOG")" "pg_restore"
out=$(printf 'acme-nakliyat\n' | "$RST" acme-nakliyat "$DUMP" --dry-run 2>&1); rc=$?
assert_rc0 "restore --dry-run" $rc "$out"
assert_has "dry-run pg_restore gösterir" "$out" "pg_restore"
out=$("$RST" acme-nakliyat "$TMP/yok.dump" 2>&1); assert_fail "olmayan yedek dosyası reddedilir" $? "$out"

echo "12) customer-remove.sh"
out=$(printf 'yanlis\n' | "$REM" gama-tasimacilik 2>&1); rc=$?
assert_fail "yanlış slug yazılırsa kaldırılmaz" $rc "$out"
assert_true "müşteri klasörü yerinde" '[ -d "$YES_CUSTOMERS_DIR/gama-tasimacilik" ]'
out=$("$REM" gama-tasimacilik </dev/null 2>&1); assert_fail "onay girilmezse kaldırılmaz" $? "$out"
out=$(printf 'gama-tasimacilik\n' | "$REM" gama-tasimacilik --dry-run 2>&1); rc=$?
assert_rc0 "remove --dry-run" $rc "$out"
assert_true "dry-run klasörü taşımaz" '[ -d "$YES_CUSTOMERS_DIR/gama-tasimacilik" ]'
assert_has "dry-run arşive taşıyacağını yazar" "$out" "archive"
n2=$(ls "$YES_CUSTOMERS_DIR/gama-tasimacilik/backups" | wc -l)
out=$(printf 'gama-tasimacilik\n' | "$REM" gama-tasimacilik 2>&1); rc=$?
assert_rc0 "doğru onayla kaldırılır" $rc "$out"
ARC=$(ls -d "$YES_ARCHIVE_DIR"/gama-tasimacilik-* 2>/dev/null | head -1)
assert_true "klasör arşive taşındı" '[ -f "$ARC/musteri/.env" ]'
assert_true "son yedek arşivde (silinmedi)" '[ "$(ls "$ARC/musteri/backups" | wc -l)" -gt "$n2" ]'
assert_true "arşiv izni 700" '[ "$(stat -c %a "$ARC")" = 700 ]'
assert_true "müşteri klasörü yerinden kalktı" '[ ! -e "$YES_CUSTOMERS_DIR/gama-tasimacilik" ]'
assert_true "Caddy kaydı kaldırıldı" '[ ! -e "$YES_PROXY_DIR/conf.d/gama-tasimacilik.caddy" ]'
assert_true "listede satır yoruma çevrildi" 'grep -q "^# kaldırıldı .*gama-tasimacilik" "$YES_REGISTRY" && ! grep -q "^gama-tasimacilik " "$YES_REGISTRY"'
assert_has "veri hacmi varsayılan olarak silinmedi" "$out" "SİLİNMEDİ"
assert_lacks "docker volume rm çağrılmadı" "$(cat "$STUB_LOG")" "volume rm"
out=$("$NEW" gama-tasimacilik gama.example.com.tr 2>&1); assert_rc0 "kaldırılan slug yeniden kullanılabilir (yeni kurulum)" $? "$out"
out=$(printf 'beta-lojistik\n' | "$REM" beta-lojistik --purge-volumes 2>&1); rc=$?
assert_fail "--purge-volumes ikinci onay ister" $rc "$out"
assert_true "ikinci onay verilmeyince müşteri duruyor" '[ -d "$YES_CUSTOMERS_DIR/beta-lojistik" ]'
out=$(printf 'beta-lojistik\nSIL-beta-lojistik\n' | "$REM" beta-lojistik --purge-volumes 2>&1); rc=$?
assert_rc0 "iki onayla hacimler silinir" $rc "$out"
assert_true "volume rm çağrıldı" 'grep -q "volume rm yes-beta-lojistik_pgdata" "$STUB_LOG"'

echo
if [ "$fail" -eq 0 ]; then echo "TÜM TESTLER GEÇTİ ($pass)"; exit 0; fi
echo "$fail TEST BAŞARISIZ, $pass geçti"
exit 1
