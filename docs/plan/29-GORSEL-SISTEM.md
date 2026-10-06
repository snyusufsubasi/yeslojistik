# 29 — Görsel sistem ve yeni görünüm jetonları

## 1. Amaç ve kapsam

Müşterinin şikâyeti "panel pratikortam'a göre zor **ve** şık değil" idi. Bugün yeni görünüm
anahtarı (`yes.uiMode`) menüyü, başlıkları ve birkaç bileşeni değiştiriyor ama **görsel dil
değişmiyor**: `client/src/lib/uiMode.ts` `html[data-ui]` niteliğini yazıyor, `client/src/index.css`
içinde bu niteliği karşılayan **tek bir seçici yok** (0 eşleşme). Bu belge o boşluğu doldurur:
yeni görünümün renk, boşluk, köşe, gölge ve yoğunluk kuralları + boş/iskelet/hata ekranları.

Kapsam: `index.css` `data-ui` katmanı, tipografi ölçeği, iskelet/boş/hata desenleri, üst kısım
≤260px kuralı, renk kullanım sınırları. Kapsam dışı: bileşen API'leri (`28-ORTAK-PARCALAR.md`),
ekran yerleşimleri (02–27), kurumsal logo/renk (beyaz etiket: `docs/SATIS-PLANI.md`).

Bu belge **P0.2 işinin şartnamesidir** ve en yüksek etkili adımdır: müşteri ilk kez farkı görür.

## 2. Bugünkü durum (kod kanıtıyla)

- `client/src/lib/uiMode.ts`: `UiMode = 'classic' | 'new'`; `DEFAULT_UI_MODE = 'classic'` (satır 8);
  `KEY = 'yes.uiMode'` (satır 9); `apply()` `document.documentElement.dataset.ui` yazar (satır 21);
  `applySavedUiMode()` açılışta (`client/src/main.tsx:19`); `useUiMode()`/`useIsNewUi()` (35-40).
- `client/src/index.css` `@theme` jetonları: yazı tipleri (9-11: Source Serif 4 + Overpass Mono),
  Otoyol renkleri (14-38: `--color-canvas`, `surface`, `surface-2`, `line`, `fg`, `muted`, `accent`,
  `accent-soft`, `side`, `side-fg`, `side-muted`, `side-active`, `hl`, `plate`, `good`, `warn`,
  `bad`, `info`, `bill`), palet yeniden eşlemesi (41-67), köşe yarıçapları 2-6px (70-76), gölgeler
  neredeyse yok (79-85).
- Tipografi: `html { font-size: 17.5px }` (91), `data-text="lg"` 19px / `xl` 21px (92-93), gövde
  `bg-canvas font-sans text-fg` (94), mono sayılar (97-99), `:focus-visible` (102-106),
  bileşen sınıfları `.input/.label/.card/.th/.td` (110-126).
- Yazı boyutu seçeneği (Normal/Büyük/Çok büyük) **kalmalı** (`AGENTS.md` §6) — bu belge onu
  bozmaz, üstüne yeni katman ekler.
- Yeni görünümde bugün değişen tek görsel şey `PageHeader`'ın alt başlığı gizlemesi ve
  `SectionTabs` eklemesi (`client/src/components/ui.tsx:113,132`).

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/index.css:9-11` | Yazı tipi jetonları (Source Serif 4, Overpass Mono) |
| `client/src/index.css:14-38` | Otoyol renk jetonları |
| `client/src/index.css:41-67` | `slate`/`navy`/`brand` yeniden eşlemesi |
| `client/src/index.css:70-76` | Köşe yarıçapları (2-6px) |
| `client/src/index.css:79-85` | Gölge jetonları (neredeyse yok) |
| `client/src/index.css:91-93` | `html { font-size: 17.5px }` ve yazı boyutu kademeleri |
| `client/src/index.css:97-99` | Mono sayı/tutar biçimi |
| `client/src/index.css:102-106` | `:focus-visible` |
| `client/src/index.css:110-126` | `.input/.label/.card/.th/.td` sınıfları |
| `client/src/lib/uiMode.ts:8,9,21,35-40` | Varsayılan mod, anahtar, `data-ui` yazımı |
| `client/src/main.tsx:19` | Açılışta mod uygulama |
| `client/src/index.css` (`data-ui` araması) | **0 eşleşme** → görsel katman gerçekten eksik |

## 3. Hedef yerleşim (jeton katmanı)

```css
/* index.css — yeni görünüm katmanı */
html[data-ui="new"] {
  --new-gap: 0.75rem;        /* klasik 1rem yerine daha sıkı dikey ritim */
  --new-pad: 0.875rem 1rem;  /* kart içi boşluk */
  --new-radius: 3px;         /* klasik 4-6px yerine daha keskin */
}
html[data-ui="new"] body { letter-spacing: 0.005em; }
html[data-ui="new"] .card { border-color: var(--color-line); box-shadow: none; }
html[data-ui="new"] .th { text-transform: none; letter-spacing: 0; }
html[data-ui="new"] .td { padding-block: 0.5rem; }   /* satır yoğunluğu: 12+ satır hedefi */
html[data-ui="new"] .page-top { max-height: 260px; } /* başlık → tablo başlığı */
```

- **Renk:** yeni jeton eklenmez; mevcut Otoyol paleti kullanılır. Sarı (`warn`) yalnız gerçek
  istisna için; satırda en fazla 1 rozet (şartname §5).
- **Yoğunluk:** yeni görünümde satır yüksekliği ~44px; 1440×900'de ≥12 satır hedefi bunu gerektirir.
- **Köşe/gölge:** keskin köşe, gölge yok; açılır pencereler (`Modal`, `DropMenu`, `FilterPanel`)
  mevcut gölgelerini korur.
- **Tipografi:** başlıklar serif (Source Serif 4), sayı/plaka/tutar Overpass Mono; tablo yazısı
  seçilebilir (Normal/Büyük/Çok büyük) ve varsayılan **Normal**.

## 4. Alanlar, düğmeler ve etkileşim (görsel sözleşme)

| Öğe | Yeni görünüm kuralı | Kanıt/bağ |
|---|---|---|
| Sayfa başlığı | 17,5px serif, alt başlık gizli | `ui.tsx:112-113` |
| Bölüm sekmeleri | 40px yüksek, aktif sekme `accent-soft` zemin | `SectionTabs.tsx` |
| Süzgeç satırı | 44px, çipler 28px | `FilterPanel.tsx:7-32` |
| Tablo başlığı | büyük harf yok, 12px, `muted` | `.th` kuralı (110-126) |
| Satır | 44px, hover `surface-2`, seçili satır `accent-soft` | yeni `.td` kuralı |
| Ana düğme | tek renk `accent`, 36px | `ui.tsx` Button |
| İkincil düğme | çerçeveli, gölgesiz | aynı |
| Rozet | 1 satırda en fazla 1 durum rozeti | şartname §5 |
| Boş ekran | ortada simge + tek cümle + varsa ana düğme | §5 |
| İskelet | tablo için 6 gri satır, grafik için blok | §5 |
| Hata | kırmızı çerçeve + "Yenile" düğmesi | §5 |

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş ekran deseni:** simge (24px, `muted`), tek cümle açıklama, varsa eylem düğmesi; ortada,
  en fazla 320px genişlik. Metinler ekran belgelerinde yazılı (ör. `21` §5).
- **İskelet:** `DataTable` yüklenirken 6 satır gri blok; grafikte 160px yüksekliğinde blok;
  yanıp sönme yok (hareket azaltma tercihi `prefers-reduced-motion` ile kapatılır).
- **Hata:** pencere ortasında kart, kısa Türkçe mesaj, "Yenile" düğmesi; teknik hata kodu yok.
- **Yetkisiz:** düğme gizlenir (kilitli gösterme yok); gerekirse tek cümle "Bu işlem için yetkiniz
  yok."
- **Ayna modu:** yazma düğmeleri gizli; sayfa iskeleti ve boş ekran metinleri **aynı** kalır
  (kullanıcı alışkanlığı bozulmaz).
- **Lisans:** süre dolduysa üst çubukta tek satır uyarı + salt okunur; görünüm değişmez.

## 6. Metinler ve terimler

Boş ekran cümleleri kısa: "Kayıt yok.", "Aramanıza uyan kayıt yok.", "Bu dönemde kayıt yok."
Hata: "Yüklenemedi. Yenile'ye basın." İskelet metni yok. Teknik sözcük yok; "ayna" yerine
"pratikortam'dan gelen kayıtlar". Terimler `32-TERMINOLOJI.md` ile uyumlu.

## 7. Telefon davranışı (390×844)

- Yeni görünümde tablo 640px altında kart olur (`27-TELEFON.md`); gölgesiz kart, 3px köşe.
- Üst kısım telefonda iki satıra bölünür; sekmeler yatay kaydırılır (dokunma ≥44px).
- Yazı boyutu ayarı telefonda da çalışır (16px altına inmez: iPhone yakınlaştırma tuzağı).

## 8. Erişilebilirlik ve klavye

- `:focus-visible` çerçevesi (102-106) korunur ve yeni görünümde de görünür kalır; gölgesizlik
  odağı zayıflatmaz (2px `accent` çerçeve).
- Kontrast: `muted` metin zemin üzerinde ≥4.5:1; sarı yalnız uyarı metniyle birlikte.
- `prefers-reduced-motion` desteklenir; animasyon yok denecek kadar az.
- Renk körlüğü: durum rozetleri metin içerir; grafik serileri etiketli.

## 9. Testler (e2e + birim)

- Yeni: `client/e2e/new-ui/ui-mode.spec.ts`
  1. `yes.uiMode = 'classic'` iken `html[data-ui]` `classic`; yeni görünüme geçince `new`.
  2. Yeni görünümde üst kısım yüksekliği ≤260px (1440×900) — ölçüm `boundingBox` ile.
  3. Yeni görünümde sevkiyat tablosunda ilk ekranda ≥12 satır görünür.
- Mevcut `client/e2e/new-ui/basics.spec.ts` (görünüm anahtarı kalıcılığı) korunur.
- Görsel doğrulama: `docs/ekranlar/` altına önce/sonra ekran görüntüleri (klasik vs yeni).

## 10. Uygulama adımları

1. **Jeton katmanı (3 saat).** `index.css` sonuna `html[data-ui="new"]` bloğu: boşluk, köşe,
   gölge, tablo yoğunluğu, `.th` normal harf. Dosya: `client/src/index.css`.
2. **Yoğunluk ölçümü (2 saat).** Sevkiyat ve cari tablolarında satır yüksekliği 44px; 12 satır
   hedefini ölç, gerekirse `--new-gap` küçült.
3. **Boş/iskelet/hata desenleri (4 saat).** Ortak bileşen: `EmptyState`, `TableSkeleton`,
   `ErrorState` (`client/src/components/ui.tsx` veya `components/shell/`); mevcut boş metinleri
   bağla.
4. **Üst kısım sınırı (2 saat).** `PageShell`/`PageHeader` + sekmeler + süzgeç toplamı ≤260px;
   alt başlık yeni görünümde gizli (`ui.tsx:113`).
5. **Ekran görüntüleri (1 saat).** Klasik/yeni karşılaştırması 3 ekran (Bugün, Sevkiyatlar, Cari).
6. **Müşteri onayı (yarım gün, kullanıcı).** Görsel yön onaylanmadan diğer ekranlara yayılmaz.
7. **Testler (3 saat).** §9 spec; `npm.cmd run lint && npm.cmd run build`.
8. **Belge (30 dk).** `docs/TASARIM-OTOYOL.md` "Otoyol 2" notu + `00-DIZIN.md`.

Toplam ≈ **15,5 saat** (2 iş günü) + müşteri onayı.

## 11. Kabul ölçütü

- Yeni görünüm ile klasik görünüm **gözle ayırt edilebilir** (boşluk/köşe/tablo yoğunluğu).
- 1440×900'de yeni görünümde ≥12 satır; üst kısım ≤260px (ölçülür).
- 390×844'te yatay kaydırma yok; yazı boyutu ayarı çalışır.
- Müşteri iki ekran görüntüsünden birini onaylar; onay `docs/TASARIM-OTOYOL.md`'ye işlenir.
- CI yeşil; yeni spec geçer.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Müşteri yeni görsel yönü beğenmez | Katman tek blok hâlinde; `git revert` ile geri alınır; klasik görünüm etkilenmez |
| Yoğunluk artınca okunurluk düşer | Yazı boyutu ayarı (Büyük/Çok büyük) ve satır sıklığı seçeneği korunur |
| Beyaz etiketli müşterilerde renk uyumsuzluğu | Jetonlar `CompanySettings`'ten türetilebilir (`docs/SATIS-PLANI.md`) |
| Görsel değişiklik e2e'yi kırar | Testler yapıya bakar, piksele değil; ölçüm toleranslı (§9.2) |

## 13. Doğrulanacaklar

- Müşterinin istediği tablo yazı boyutu varsayılanı (Normal mi, Büyük mü).
- Satır sıklığı seçeneği (Rahat/Sıkı) kullanıcıya açık mı kalacak.
- Klasik görünümün 2 hafta sonra kaldırılması onayı (`34-RISK-GUVENLIK.md`).

Sonraki belgeyle bağlantı: `28-ORTAK-PARCALAR.md` bileşen sözleşmelerini, `27-TELEFON.md` mobil
kart görünümünü, `30-VERI-API.md` iskeletlerin ihtiyaç duyduğu veriyi tanımlar.
