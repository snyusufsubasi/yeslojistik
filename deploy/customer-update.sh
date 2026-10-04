#!/usr/bin/env bash
# Müşteri panellerini yeni sürüme günceller: kodu çeker, imajı bir kez derler, müşterileri TEK TEK günceller.
# Her müşteride: yedek → yeni imaj → sağlık kontrolü → başarısızsa otomatik olarak önceki imaja dönüş.
#
#   ./deploy/customer-update.sh <slug|--all> [--dry-run] [--no-pull] [--tag etiket] [--continue]
#
#   --no-pull   git pull yapma (kod zaten güncel)
#   --tag       belirli bir imaj etiketini kullan (varsayılan: deponun son commit'i); önceden derlenmiş olmalı ya da derlenir
#   --continue  bir müşteri başarısız olursa diğerlerine devam et (varsayılan: dur)
#
# NOT: Veritabanı değişiklikleri (migration) yeni sürüm açılırken kendiliğinden uygulanır. Otomatik dönüş imajı geri alır,
# veritabanı şemasını geri almaz; bu yüzden her güncellemeden önce yedek alınır (hata mesajında dosya adı yazar).
set -euo pipefail
# shellcheck source=lib-customers.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-customers.sh"

usage() { sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

TARGET="" PULL=true TAG="" CONTINUE=false
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=true; shift;;
    --no-pull) PULL=false; shift;;
    --tag) [ $# -ge 2 ] || die "--tag için değer gerekli"; TAG=$2; shift 2;;
    --continue) CONTINUE=true; shift;;
    -h|--help) usage 0;;
    --all) TARGET=--all; shift;;
    -*) die "Bilinmeyen seçenek: $1 (yardım: --help)";;
    *) [ -z "$TARGET" ] || die "Fazla argüman: $1"; TARGET=$1; shift;;
  esac
done
[ -n "$TARGET" ] || usage 1
[ -z "$TAG" ] || [[ "$TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,60}$ ]] || die "Geçersiz imaj etiketi: $TAG"

if $DRY; then command -v docker >/dev/null 2>&1 || warn "docker bulunamadı (gerçek çalıştırmada gerekli)"; else need_docker; fi
load_slugs "$TARGET"
[ "${#SLUGS[@]}" -gt 0 ] || die "Güncellenecek müşteri yok ($YES_REGISTRY boş)."

if $PULL; then
  say "Kod güncelleniyor"
  run git -C "$YES_REPO" pull --ff-only
fi
[ -n "$TAG" ] || TAG=$(current_tag)
say "Yeni sürüm: $TAG"
ensure_images "$TAG"   # derleme başarısız olursa (set -e) hiçbir müşteriye dokunulmadan durur

FAILED=()
update_one() { # slug → 0 başarılı/güncel, 1 başarısız (kendi durumunu geri almış)
  local slug=$1 envf old oldprev keep dump
  envf=$(cenv "$slug")
  old=$(env_get "$envf" IMAGE_TAG)
  oldprev=$(env_get "$envf" PREV_IMAGE_TAG)
  if [ "$old" = "$TAG" ]; then ok "$slug zaten $TAG sürümünde"; return 0; fi
  say "$slug: $old → $TAG"

  keep=$(env_get "$envf" BACKUP_KEEP_DAYS)
  if ! ccompose "$slug" exec -T -e "KEEP_DAYS=${keep:-30}" backup sh /backup.sh; then
    warn "$slug: güncelleme öncesi yedek alınamadı, bu müşteri atlandı (dokunulmadı)."
    return 1
  fi
  dump=$(newest_dump "$(env_get "$envf" BACKUPS_DIR)")
  $DRY || ok "Yedek: $(basename "${dump:-yok}")"

  env_set "$envf" PREV_IMAGE_TAG "$old"
  env_set "$envf" IMAGE_TAG "$TAG"
  if ccompose "$slug" up -d && wait_health "$slug" 60; then
    ok "$slug yeni sürümle çalışıyor ($TAG). Önceki sürüm geri dönüş için saklanıyor ($old)."
    return 0
  fi

  warn "$slug: yeni sürüm sağlıklı açılmadı → ÖNCEKİ SÜRÜME DÖNÜLÜYOR ($old)"
  $DRY || ccompose_raw "$slug" logs --tail 30 api || true
  env_set "$envf" IMAGE_TAG "$old"
  env_set "$envf" PREV_IMAGE_TAG "$oldprev"
  ccompose "$slug" up -d || true
  if wait_health "$slug" 40; then
    warn "$slug eski sürümle tekrar çalışıyor ($old). Yeni sürüm kayıtlarına bakın: ./deploy/customer-compose.sh $slug logs api"
  else
    printf '%sKRİTİK: %s eski sürümle de açılmadı! Veritabanı değişikliği uygulanmış olabilir. Yedekten dönün: ./deploy/customer-restore.sh %s %s%s\n' \
      "$C_R" "$slug" "$slug" "${dump:-<yedek-dosyası>}" "$C_0" >&2
  fi
  return 1
}

for slug in "${SLUGS[@]}"; do
  if ! update_one "$slug"; then
    FAILED+=("$slug")
    $CONTINUE || { warn "Güvenlik için durduruldu; kalan müşterilere dokunulmadı. Devam etmek için --continue."; break; }
  fi
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  say "Sonuç: SORUNLU müşteriler: ${FAILED[*]}"
  exit 1
fi

# Artık hiçbir müşterinin kullanmadığı eski imajları temizle (disk dolmasın). Son kullanılan/yedek etiketler kalır.
if ! $DRY && [ "$TARGET" = "--all" ]; then
  keep_tags=" $TAG "
  while read -r s _; do
    [ -n "$s" ] || continue
    keep_tags+="$(env_get "$(cenv "$s")" IMAGE_TAG) $(env_get "$(cenv "$s")" PREV_IMAGE_TAG) "
  done < <(registry_rows)
  for name in yeslojistik-api yeslojistik-web; do
    while read -r t; do
      [ -n "$t" ] && [ "$t" != "<none>" ] || continue
      case "$keep_tags" in *" $t "*) ;; *) docker rmi "$name:$t" >/dev/null 2>&1 && echo "  eski imaj silindi: $name:$t" || true;; esac
    done < <(docker images "$name" --format '{{.Tag}}' 2>/dev/null)
  done
fi
say "Güncelleme tamam (${#SLUGS[@]} müşteri). Kontrol: ./deploy/customer-check.sh"
