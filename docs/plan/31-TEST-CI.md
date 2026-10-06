# 31 — Test ve CI stratejisi

## 1. Amaç ve kapsam

Her adımın nasıl doğrulanacağını tek yerde tanımlar: hangi test nerede çalışır, hangi komut ne
yapar, CI'da hangi kapı vardır, belge denetimi nasıl yapılır. Bu belge olmadan "adım bitti"
iddiası kanıtsız kalır.

Kapsam: test envanteri, çalıştırma komutları (yerel ve CI), yeni görünüm testleri, ekran görüntüsü
arşivi, belge denetimi. Kapsam dışı: test içerikleri (her ekran belgesinin §9'u), CI altyapısı
kurulumu.

## 2. Bugünkü durum (kod kanıtıyla)

- **Tarayıcı (e2e):** `client/e2e` altında **20 spec**, toplam **53 `test(...)`**. Dağılım:
  `workflow.spec.ts` (16 test: uçtan uca iş akışı, rapor/Excel, bildirim, kopyalama+PDF, yakıt,
  işlem geçmişi, yedek, taşeron/kiralık, e-Fatura/XML, masraf reddi+belgeler, çek cirosu+virman,
  Ctrl+K, pano), `vehicles`, `uetds`, `trips`, `tracking`, `security`, `bulk`, `cari`,
  `driver-app`, `mobile`, `quick-add`, `office-app`, `import`, `forms`, `onboarding`, `license`.
- **Yeni görünüm spec'leri:** `client/e2e/new-ui/` → `basics.spec.ts` (görünüm anahtarı kalıcılığı,
  menü sırası + sekmeler, süzgeç paneli/çipi/satır menüsü), `cari-invoice.spec.ts` (satırdan
  tahsilat, KDV farkı uyarısı), `trip-copies.spec.ts` (kopya sayısı, formu açık tut).
- **Yardımcılar:** `client/e2e/helpers.ts` — `API_URL`/`DRIVER_APP_URL` (4-5), `login` (9-15),
  `expectPdfOpens` (24-29), `pick` (32-41), **`useNewUi`** (44-46; `localStorage: yes.uiMode='new'`).
- **Playwright yapılandırması:** `client/playwright.config.ts` — `testDir ./e2e` (5), `workers: 1`,
  `fullyParallel: false` (8-9), `baseURL` = `E2E_BASE_URL` varsayılan 5173 (12), `PW_CHROMIUM_PATH`
  (16), iki proje: masaüstü 1440×900 ve mobil 375×812 (`testMatch /mobile/`) (19-20).
- **Sunucu testleri:** `server/YesLojistik.Tests` — birim + **gerçek PostgreSQL** üzerinde
  entegrasyon testleri (geçici veritabanı açıp siler); toplam ≈311 test.
- **CI:** `.github/workflows/ci.yml` — `on: push` + `pull_request` (satır 3-5); job'lar:
  `legacy` (8-22: `tools/legacy` node+python testleri), `server` (24-48: postgres:16-alpine
  servisi, .NET 10 build+test, `dotnet-ef migrations has-pending-model-changes`), `client`
  (50-64: `npm ci`, `npm run lint`, `npm run build`), `mobile` (66-80: `typecheck`,
  `expo export --platform android`), `e2e` (82-142: `needs: [server, client]`, postgres servisi,
  API 5080 + `vite preview` 5173 + şoför web önizlemesi 8082, sağlık beklemesi 124-128, sonra
  `npx playwright test` 131, hatada `client/test-results` + `/tmp/api.log` artefaktı 136-142).
- **Süre:** CI koşusu ≈9-11 dakika (`gh run list` ile ölçüldü); `Canlı kontrol` (smoke) ≈1-2 dakika.
- **Yerel ortam gerçeği:** bu makinede .NET **8** SDK var (proje .NET 10 istiyor), PostgreSQL yok,
  Playwright Chromium yok → `dotnet test` ve e2e **yerelde çalışmıyor**; doğrulama CI'da yapılır.
  `npm` betik kısıtına takıldığı için `npm.cmd` kullanılır.

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `.github/workflows/ci.yml:3-5` | `on: push` + `pull_request` |
| `.github/workflows/ci.yml:8-22` | `legacy` job (node + python testleri) |
| `.github/workflows/ci.yml:24-48` | `server` job (postgres:16-alpine, `dotnet test`, migration kontrolü) |
| `.github/workflows/ci.yml:50-64` | `client` job (`npm ci`, lint, build) |
| `.github/workflows/ci.yml:66-80` | `mobile` job (`typecheck`, `expo export`) |
| `.github/workflows/ci.yml:82-142` | `e2e` job (API + preview + Playwright, sağlık beklemesi, artefakt) |
| `client/playwright.config.ts:5,8-9,12,16,19-20` | testDir, workers, baseURL, Chromium yolu, projeler |
| `client/e2e/helpers.ts:4-5,9-15,24-29,32-41,44-46` | API/şoför URL'leri, giriş, PDF kontrolü, `pick`, `useNewUi` |
| `docs/KOLAYLASTIRMA-UYGULAMA.md:493` | Test silme/atlama yasağı |
| `docs/KOLAYLASTIRMA-UYGULAMA.md:471-490` | F6 menü seçici eşleme tablosu |

## 3. Doğrulama akışı (dal + CI kapısı)

```
git pull --rebase origin main
git switch -c codex/<konu>
... değişiklik ...
git push -u origin codex/<konu>        → CI tetiklenir (~9-11 dk)
gh run watch <run-id>                   → legacy + server + client + mobile + e2e yeşil mi?
gh pr create / gh pr merge (veya fast-forward)
                                        → Render otomatik deploy + Canlı kontrol (smoke)
```

Kurallar:
1. **Testler yeşil değilse `main`'e alınmaz** (`AGENTS.md` §3.6).
2. **Ayna işi çalışırken `main`'e alınmaz:** `gh run list` ile "Pratikortam aynası" koşusu bitmeli;
   Render yeniden başlatması aynanın ortasında API'yi düşürür.
3. `main`'e alındıktan sonra `Canlı kontrol` koşusunun yeşil olduğu doğrulanır.
4. Test **silme/atlama/skip yasak** (`docs/KOLAYLASTIRMA-UYGULAMA.md:493`). Bir test artık
   geçersizse gerekçesiyle güncellenir.

## 4. Yeni görünüm testleri

- Yeni görünümü açmak: `await useNewUi(page)` (sayfa yüklenmeden önce `addInitScript`).
- Eski testler **klasik** görünümde çalışmaya devam eder; kırılmazlar. F6'da varsayılan `new`
  olunca eski menü seçicileri güncellenir (eşleme: "Şoförler"→"Şoför Listesi",
  "Faturalar"→"e-Fatura", "Raporlar"→"Analiz", "Ayarlar"→"Yönetici";
  `docs/KOLAYLASTIRMA-UYGULAMA.md:471-490`).
- Her ekran belgesinin §9'u kendi spec adını ve senaryolarını yazar; yeni spec dosyaları
  `client/e2e/new-ui/` altında toplanır.

## 5. Ekran görüntüsü arşivi

- `docs/ekranlar/` bugün 26 PC + 14 telefon PNG + 2 PDF görüntüsü içerir; hepsi **klasik** görünüm
  (hâlâ "Sefer" adları geçiyor).
- Her aşamada önce/sonra görüntüsü alınır (`docs/KOLAYLASTIRMA-PLANI.md:340`): klasik vs yeni,
  aynı ekran, aynı veri. F6'dan sonra `docs/ekranlar/README.md` yeni görünüm görüntüleriyle
  güncellenir.

## 6. Belge denetimi (bu plan seti)

`tools/docs/referans-denetimi.ps1` (ASCII, Windows PowerShell uyumlu):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Table
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -UpdateIndex
```

Yaptıkları: (1) `docs/plan/*.md` içindeki tüm `dosya:satır` referanslarını toplar; dosya var mı,
satır numarası dosya uzunluğunu aşıyor mu diye bakar; aynı adlı dosyalarda (`ui.tsx`, `types.ts`)
yeterince uzun olan adayı arar. (2) Mojibake/BOM kontrolü yapar. (3) Toplam kelime sayısını yazar.
(4) `-Table` markdown tablo üretir, `-UpdateIndex` `00-DIZIN.md` içindeki işaretli bloğu günceller.

Belge kuralları `docs/plan/01-ORTAK-SARTNAME.md`: 13 zorunlu başlık, 1.900+ kelime, kanıtsız iddia
yok, kod değiştirilmez. Belge yazımı PowerShell ile **yapılmaz** (Türkçe karakter bozulur: bir
belgede 1.155 mojibake oluştu ve tersine çevirmeyle onarıldı) — yalnız `write`/`edit` araçları.

## 7. Telefon davranışı (390×844)

- `mobile.spec.ts` yatay kaydırmayı kontrol eder (var olan test).
- Yeni kart görünümü (`DataTable.mobileCard`) eklendiğinde bu test genişletilir: kart başlığı
  görünür, tablo başlığı gizli.

## 8. Erişilebilirlik ve klavye testleri

- Mevcut `forms.spec.ts` klavye ve Modal korumasını sınıyor; yeni görünümde `Ctrl+Enter` ve `Esc`
  davranışı korunur.
- Yeni: sekme gezinmesi (ok tuşları) ve `:focus-visible` görünürlüğü `new-ui/basics.spec.ts`'e bir
  adım olarak eklenir.

## 9. Uygulama adımları

1. **Yerel hızlı kontrol (her adımda).** `cd client && npm.cmd run lint && npm.cmd run build`
   (yerelde çalışır). Sunucu tarafı değiştiyse doğrulama CI'ya bırakılır.
2. **Dal push + CI (her adımda).** §3 akışı; yeşil olana kadar `main`'e alım yok.
3. **Yeni spec'ler.** Ekran belgelerindeki §9 senaryoları; hepsi `new-ui/` altında.
4. **Ekran görüntüleri.** Her aşamada 2 görüntü (klasik/yeni), `docs/ekranlar/` altına.
5. **Belge denetimi.** Aşama sonunda `-UpdateIndex` çalıştırılır; kelime ve referans sayıları
   `00-DIZIN.md`'ye işlenir.
6. **Migration kontrolü.** Model değiştiyse `dotnet-ef migrations has-pending-model-changes`
   (CI'da `server` job'unda zaten koşuyor).

Toplam: her adım için ~15 dk CI + geliştirme süresi (ekran belgelerindeki tahminler).

## 10. Kabul ölçütü

- Her `main` alımı **yeşil CI** ile ve ayna koşusu beklenerek yapılır.
- `client/e2e` test sayısı **azalmaz**; yeni görünüm için en az bir spec eklenir.
- `server` job'u (≈311 test + migration kontrolü) yeşil.
- `mobile` job'u (typecheck + `expo export`) yeşil.
- Belge denetimi: 0 bozuk referans, 0 kodlama uyarısı, ≥50.000 kelime.

## 11. Kabul ölçütü (ölçüm)

| Ölçüm | Bugün | Hedef |
|---|---|---|
| e2e test sayısı | 53 | ≥60 (yeni görünüm spec'leri) |
| CI süresi | 9-11 dk | ≤15 dk |
| Bozuk referans | 0 | 0 |
| Kelime (plan seti) | ~60.000 | ≥50.000 |

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Yerelde e2e çalışmıyor → hatalar CI'da görülür | Adım küçük tutulur; CI 9-11 dk, hızlı geri bildirim |
| e2e "flaky" (paylaşılan veritabanı) | Testler önce arama/süzme yapar; `workers: 1` |
| Ayna koşusu ile çakışma | `gh run list` kontrolü; koşu bitmeden merge yok |
| Test silinip "yeşil" görünmesi | Test silme/atlama yasak; `git diff` incelemesi |
| Belge kodlamasının bozulması | Yalnız `write`/`edit`; denetleyici mojibake taraması yapar |

## 13. Doğrulanacaklar

- `mobile` job'unun yeni kart görünümünden etkilenip etkilenmediği (Expo web önizlemesi).
- CI'da `dotnet` sürümü .NET 10 mu (yerelde 8 var; CI'da `setup-dotnet` sürümü doğrulanacak).
- Ekran görüntülerinin `docs/ekranlar/` altına eklenmesinin depo boyutuna etkisi.

Sonraki belgeyle bağlantı: `32-TERMINOLOJI.md` testlerde geçen ekran adlarını, `33-K0-VE-KABUL-TESTI.md`
müşteriyle yapılacak kabul testini, `00-DIZIN.md` durum tablosunu tanımlar.
