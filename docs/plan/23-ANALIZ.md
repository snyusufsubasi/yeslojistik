# 23 — Analiz: Genel Bakış ve sekmeler

## 1. Amaç ve kapsam

"Aylık kazancı görmek" en sık 10 işin **10.** maddesi ve bugün 3-4 tık + doğru sekmeyi bulmayı
gerektiriyor. Bu belge, Raporlar ekranının ilk sekmesine **Genel Bakış** ekler: üç rakam (Toplam
Kazanç / Toplam Gider / Net Kazanç), kırılım tablosu ve 12 aylık net kazanç grafiği. Diğer
sekmeler korunur, adları sadeleşir.

Kapsam: `client/src/pages/ReportsPage.tsx` yeni ilk sekme, sekme adları, grafik ve kırılım.
Kapsam dışı: yeni rapor türleri (`24-RAPORLAR-MUHASEBE.md`), muhasebe aktarımı, KDV kuralı
(`docs/KDV-KURALLARI.md`), araç masrafı girişi (`21-OZ-MAL-ARAC-MASRAFLARI.md`).

`docs/KOLAYLASTIRMA-UYGULAMA.md` §F4.5'in şartnamesidir.

## 2. Bugünkü durum (kod kanıtıyla)

- `ReportsPage` `client/src/pages/ReportsPage.tsx`; varsayılan sekme `monthly` (satır 23).
- Dönem durumları: yıl (24), başlangıç (25), bitiş (26), gruplama (`ProfitGroupBy`, satır 27).
- Sekmeler `Tabs` bileşeniyle (satır 38); üstte Excel dışa aktarım düğmesi (satır 35) — muhasebe
  sekmesi hariç.
- Grafikler hazır: `recharts` `BarChart` (satır 126 dikey, 294 yatay), ortak `ChartTooltip`
  (satır 84), renk paleti `client/src/lib/chart.ts`.
- Alt rakamlar `Figures`/`Figure` ile (satır 11'de import).
- Muhasebe sekmesi ayrı bileşen: ay seçici (satır 390) + iki indirme (409-410:
  `/exports/accounting`, `/exports/einvoice-xml`).
- **Genel Bakış diye bir sekme bugün yok**; kullanıcı "Bu ayın kazancı" için önce doğru sekmeyi
  (kazanç raporu) ve gruplamayı seçmek zorunda.
- Sekme adları bugün teknik: `monthly`, `vehicle`, `driver`, `fuel`, `expenses`, `customer`,
  `aging`, `accounting` (kod içi anahtarlar; kullanıcıya Türkçe etiket basılıyor).

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/pages/ReportsPage.tsx:22` | `ReportsPage` bileşeni |
| `client/src/pages/ReportsPage.tsx:23` | Varsayılan sekme (`'monthly'`) |
| `client/src/pages/ReportsPage.tsx:24-27` | Yıl, dönem başı/sonu, gruplama durumları |
| `client/src/pages/ReportsPage.tsx:35` | Excel dışa aktarım düğmesi (muhasebede gizli) |
| `client/src/pages/ReportsPage.tsx:38` | Sekme listesi (`Tabs`) |
| `client/src/pages/ReportsPage.tsx:84` | Ortak `ChartTooltip` |
| `client/src/pages/ReportsPage.tsx:126` | Dikey çubuk grafik (`BarChart`) |
| `client/src/pages/ReportsPage.tsx:294` | Yatay çubuk grafik |
| `client/src/pages/ReportsPage.tsx:316` | Araç maliyetlerinin kârlılık raporunda gösterildiği notu |
| `client/src/components/ui.tsx:108-134` | `PageHeader` (yeni başlık adları, sekmeler) |

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────────────┐
│ Analiz                                                    [⋯ Diğer]  │
│ Genel Bakış   Sevkiyat Kazancı   Araç   Şoför   Mazot   Giderler      │
│ Müşteri   Yaşlandırma   Muhasebe                                     │
│ [Plaka (opsiyonel) ▾]  [01.01.2026 – 05.10.2026]                     │
│ ┌ TOPLAM KAZANÇ ────┐ ┌ TOPLAM GİDER ────┐ ┌ NET KAZANÇ ──────────┐ │
│ │ 1.965.000,00 TL   │ │ 1.421.500,00 TL  │ │ 543.500,00 TL        │ │
│ └───────────────────┘ └──────────────────┘ └──────────────────────┘ │
│ Kırılım: Piyasa sevkiyat │ Öz mal sevkiyat │ Mazot │ Diğer giderler  │
│          Personel │ Sabit ödemeler                                    │
│ 12 aylık net kazanç (çubuk grafik)                                   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Genel Bakış varsayılan sekme olur** (`useState<Tab>('overview')`, bugünkü `monthly` yerine).
- Plaka seçimi **opsiyonel**: seçilmezse tüm filo; seçilirse yalnız o aracın kazancı.
- Tarih aralığı bugünkü `from`/`to` durumunu kullanır (varsayılan: yıl başı → bugün).
- Grafik: son 12 ayın net kazancı, mevcut `BarChart` + `ChartTooltip` + `lib/chart.ts` paletiyle.
  Yeni grafik kütüphanesi eklenmez.
- ⋯ Diğer: "Tüm rapor Excel" (tüm sekmelerin özet sayfası) + "Yazdır".

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Sekmeler | `Tabs` | — | Adresle: `?sekme=genel` vb.; geri tuşu çalışır | — |
| Plaka | aranabilir seçim | — | Boş = tüm filo; seçili = şerit ve grafik o araca daralır | — |
| Tarih aralığı | `DateFilter` | — | Değişince üç rakam + grafik yenilenir | — |
| Rakam kutusu | düğme | — | Kırılım satırına kaydırır (aynı ekranda vurgular) | — |
| Grafik çubuğu | ipucu | — | Ayın kazanç/gider/net dökümü | — |
| ⋯ Diğer | menü | — | Tüm rapor Excel · Yazdır | — |
| Excel'e Aktar | düğme | — | Genel Bakış için özet sayfa (bugünkü desen, satır 35) | — |

Rakam biçimi her yerde `tl2` (iki kuruş); tarih `03.10.2026`; plaka `PlateBadge`.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş (dönemde kayıt yok):** "Bu dönemde sevkiyat yok. Tarih aralığını genişletin."
- **Yükleniyor:** üç rakam yerine `—`, grafik iskeleti.
- **Hata:** sayfa düzeyinde uyarı + "Yenile" (bugünkü `Loading`/hata deseni).
- **Yetkisiz:** rapor görüntüleme tüm ofis rollerine açık; muhasebe sekmesi yalnız `accounting`.
- **Ayna modu:** okuma serbest; rakamlar pratikortam'dan gelen kayıtları **içerir** (bugünkü
  rapor uçları aynı veriyi okuyor). Yazma düğmesi yok.
- **Lisans:** süre dolduysa görüntüleme kalır (rapor salt okunur bir işlevdir).

## 6. Metinler ve terimler

Sekmeler: "Genel Bakış · Sevkiyat Kazancı · Araç · Şoför · Mazot · Giderler · Müşteri ·
Yaşlandırma · Muhasebe". Rakam başlıkları: "TOPLAM KAZANÇ", "TOPLAM GİDER", "NET KAZANÇ".
Kırılım satırları: "Piyasa sevkiyat kazancı", "Öz mal sevkiyat kazancı", "Mazot", "Diğer giderler",
"Personel", "Sabit ödemeler". Grafik başlığı: "Son 12 ay net kazanç". Kazanç **KDV hariç**, cari
borç **KDV dahil** (`docs/KDV-KURALLARI.md`) — ekranda bu ayrım tek dipnotla belirtilir:
"Kazanç KDV hariç, borçlar KDV dahil hesaplanır."

## 7. Telefon davranışı (390×844)

- Üç rakam alt alta; grafik tam genişlik, yatay kaydırma yok.
- Sekmeler yatay kaydırılır (dokunma hedefi ≥44px); kırılım tablosu kart listesine döner.
- Tarih aralığı tek satıra sığmazsa iki satıra bölünür.

## 8. Erişilebilirlik ve klavye

- Sekmeler `role="tablist"`/`role="tab"` + `aria-selected` (bugünkü `Tabs`).
- Grafik `aria-label` + tablo alternatifi: "12 aylık net kazanç" verisi metin olarak da verilir
  (ekran okuyucu için `<table class="sr-only">`).
- Renk körlüğü: kazanç/gider çubukları renk + desen/etiketle ayrılır; ipuçları metin içerir.

## 9. Testler (e2e + birim)

- Yeni: `client/e2e/new-ui/analiz.spec.ts`
  1. `useNewUi` + `/raporlar` → ilk sekme "Genel Bakış" aktif, üç rakam görünür.
  2. Tarih aralığı daraltılır → rakamlar değişir (boş dönemde boş mesajı).
  3. Plaka seçilir → rakamlar daralır, adres `?plaka=` içerir.
  4. "Genel Bakış" Excel dışa aktarımı dosya indirir (`expectPdfOpens` benzeri indirme kontrolü).
- Mevcut rapor testleri (`workflow.spec.ts` içindeki rapor/Excel adımları) bozulmamalı.
- Sunucu tarafı yeni uç gerekirse **dur ve sor**; gerekmiyorsa mevcut `/reports/...` uçları
  kullanılır (satır 35'teki `ExportButton` deseninin gösterdiği gibi).

## 10. Uygulama adımları

1. **Sekme altyapısı (2 saat).** `Tab` tipine `'overview'` ekle, varsayılan yap, adresle
   eşle (`ReportsPage.tsx:23,38`).
2. **Veri toplama (3 saat).** Üç rakam + kırılım için mevcut uçları kullan: kazanç raporu
   (satır 150 ve sonrası), giderler, mazot, personel, sabit ödemeler. **Yeni uç gerekirse dur.**
3. **Şerit ve kırılım tablosu (3 saat).** `Figures` + tablo; plaka süzgeci (aranabilir seçim).
4. **12 aylık grafik (3 saat).** `BarChart` + `lib/chart.ts`; son 12 ay net kazanç.
5. **Sekme adları ve adres (2 saat).** Türkçe etiketler; `?sekme=` ile derin bağlantı.
6. **Telefon (2 saat).** Rakamların sarması, grafik genişliği, kırılımın kartlaşması.
7. **Testler (3 saat).** §9 spec + mevcut rapor testlerinin yeşil kalması.
8. **Belge (30 dk).** `00-DIZIN.md` + `docs/GELISTIRME-PLANI.md`.

Toplam ≈ **18,5 saat** (≈2,5 iş günü). Doğrulama: `cd client && npm.cmd run lint && npm.cmd run build`.

## 11. Kabul ölçütü

- Aylık kazanç **1 tıkla** görünür (menü → Analiz; ilk sekme Genel Bakış).
- 1440×900'de üç rakam + kırılım + grafik ilk ekranda; üst kısım ≤260px.
- Grafik mevcut kütüphaneyle çizilir (yeni bağımlılık yok).
- 390×844'te yatay kaydırma yok.
- CI yeşil; yeni spec + mevcut rapor testleri geçer.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Kırılım için veri hazır değil, yeni uç gerekir | Uç yazmadan dur, kullanıcıya sor; geçici olarak yalnız üç rakam + mevcut kazanç sekmesi |
| 12 aylık grafik yavaş (12 sorgu) | Tek uçta toplu dönem verisi; yoksa 3 aylık varsayılan |
| Varsayılan sekme değişince kullanıcı alışkanlığı bozulur | Sekme sırası korunur, "Genel Bakış" başa eklenir; eski sekmeler yerinde |
| KDV karışıklığı | Ekranda tek dipnot; `docs/KDV-KURALLARI.md` tek kaynak |

## 13. Doğrulanacaklar

- Kırılım satırlarının kesin listesi (Piyasa/Öz mal ayrımı bugünkü raporlarda var mı?) —
  kod doğrulanacak; yoksa liste kullanıcıyla netleşir.
- "Tüm rapor Excel" tek dosyada kaç sayfa olacak (sekme başına bir sayfa varsayımı).
- Grafiğin ay mı, yoksa seçilen gruplama mı olacağı (bugün `groupBy` var).

Sonraki belgeyle bağlantı: `24-RAPORLAR-MUHASEBE.md` diğer sekmeleri ve dışa aktarımları,
`30-VERI-API.md` gerekli uçları, `29-GORSEL-SISTEM.md` grafik ve rakam tipografisini tanımlar.
