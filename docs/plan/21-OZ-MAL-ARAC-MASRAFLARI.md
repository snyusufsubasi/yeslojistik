# 21 — Araç masrafları

## 1. Amaç ve kapsam

Belirli bir aracın (öz mal ya da kiralık) başına yapılan bütün giderleri tek ekranda, aracın
kendi bağlamında görmek. Bugün bu iş için kullanıcı **Giderler** sayfasına girip oradaki *Araç*
süzgecini elle seçmek zorunda; "Bu aracın masrafı ne kadar?" sorusu ekranda hazır bir cevaba sahip
değil.

Kapsam: yeni `/arac-masraflari` rotası, araç bağlamlı liste, araç seçilince gider özeti, "+ Gider
Ekle" düğmesinin araç ön seçili açması, telefon davranışı. Kapsam dışı: kapsamlı araç kâr analizi
(`23-ANALIZ.md`), mazot ayrıntıları (`19-OZ-MAL-MAZOTLAR.md`), araç kaydı ve belgeleri
(`22-OZ-MAL-ARACLAR.md`).

Bu belge en sık iş listesinden **9. işi** ("Mazot / gider girmek → tek ekran") ve öz mal kârlılığı
sorusunu doğrudan destekler. `docs/KOLAYLASTIRMA-UYGULAMA.md` §F4.3'ün şartnamesidir.

## 2. Bugünkü durum (kod kanıtıyla)

- Giderler sayfası `client/src/pages/ExpensesPage.tsx`; süzgeç durumları: kategori (satır 53),
  araç (satır 54), arama/tarih/sevkiyat/onay (satır 50, 63), sayfa boyu 20 (satır 65).
- Araç süzgeci **var** ama sayfanın ana ekseni değil: `Select aria-label="Araç"` (satır 116),
  sorguya `vehicleId` olarak giriyor (satır 65).
- Kategori listesi sabit: `Fuel, Maintenance, Toll, DriverAllowance, DriverAdvance, Tire,
  Insurance, Tax, Other` (`ExpensesPage.tsx:29`) — yani "araç masrafı" kategorileri zaten tanımlı.
- Araç seçilince ilgili sevkiyatlar önerilir (`ExpensesPage.tsx:191-192`) ve araç seçilince gider
  formu sevkiyatı kendiliğinden doldurur (satır 218).
- Araç kaydı `client/src/pages/VehiclesPage.tsx`; öz/kiralık ayrımı `ownership === 'Rented'`
  rozetiyle gösteriliyor (satır 61), araç sekmeleri `Chip` + `role="tab"` (satır 99).
- Menüde bu ekran **yok**: yeni menünün Öz Mal grubunda yalnız `/giderler` ve `/araclar` var
  (`client/src/lib/nav.ts:72-114`), planlanan iki sayfa için yorum satırı düşülmüş: `nav.ts:99`.
- `ExpensesPage` içinde görünüm modu (klasik/yeni) ayrımı **yok**; sayfa aynı iskeleti paylaşıyor
  ve yalnız `PageHeader` yeni başlık adını basıyor (`client/src/components/ui.tsx:108-134`).
- Toplam şeritleri için ortak bileşen var: `client/src/components/SumStrip.tsx`.

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/pages/ExpensesPage.tsx:29` | Gider kategorileri listesi (Fuel, Maintenance, Toll, Tire…) |
| `client/src/pages/ExpensesPage.tsx:53-54` | Kategori ve araç süzgeci durumları |
| `client/src/pages/ExpensesPage.tsx:63-65` | Sorgu nesnesi ve sayfalama (pageSize 20) |
| `client/src/pages/ExpensesPage.tsx:114-116` | Süzgeç seçimleri (onay, kategori, araç) |
| `client/src/pages/ExpensesPage.tsx:128` | Boş liste metni |
| `client/src/pages/ExpensesPage.tsx:168` | Kategori toplamları ucu (`/expenses/categories`) |
| `client/src/pages/ExpensesPage.tsx:191-192` | Araç seçilince ilgili sevkiyat önerisi |
| `client/src/pages/ExpensesPage.tsx:218` | Sevkiyatın gider formuna otomatik dolması |
| `client/src/pages/VehiclesPage.tsx:61` | "Kiralık" rozeti |
| `client/src/pages/VehiclesPage.tsx:99` | Araç sekmeleri (`Chip role="tab"`) |
| `client/src/lib/nav.ts:99` | "Mazotlar ve Araç Masrafları … F4'te eklenir" notu |

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────────────┐
│ Araç Masrafları                              [⋯ Diğer] [+ Gider Ekle]│
│ Öz Mal   Mazotlar   Araç Masrafları   Giderler   Araçlar            │
│ [🔍 Ara: plaka, açıklama…] [Araç ▾] [Kategori ▾] [Tarih] [Süzgeç (1)]│
│ (Araç: 16 KZ 528 ✕)  Süzgeci temizle                                 │
│ TOPLAM 128.400,00 TL │ BU AY 21.300,00 TL │ ONAY BEKLEYEN 2          │
│ ┌ tablo ─────────────────────────────────────────────────────────────┐│
│ │ Tarih  Kategori  Araç  Sevkiyat  Açıklama      Tutar   ⋯          ││
│ └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

- Araç seçilmediğinde başlık "Araç Masrafları", şerit tüm araçların toplamını gösterir; araç
  seçilince başlık altı `16 KZ 528 · Öz mal` olur ve şerit o araca daralır.
- Üst kısım ≤260px kuralına uyulur (şartname §5); liste ilk ekranda en az 12 satıra yer bırakır.
- Sütunlar: Tarih · Kategori · Araç · Sevkiyat · Açıklama · Tutar · (satır menüsü). KM/litre
  sütunları **burada yok**; onlar Mazotlar ekranının işi (`19-OZ-MAL-MAZOTLAR.md`).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Ara | metin | — | 250 ms gecikmeli; plaka, açıklama, sevkiyat no | "Aramanıza uyan kayıt yok." |
| Araç | seçim | — | Seçilince şerit ve başlık daralır; `?arac=<id>` adrese yazılır | — |
| Kategori | seçim | — | `expenseCategoryLabel` ile Türkçe adlar | — |
| Tarih | iki tarih | — | Dönem süzgeci | — |
| Süzgeç | düğme | — | `FilterPanel` sağdan açar; arama/tarih/sevkiyat/onay buraya | — |
| "+ Gider Ekle" | düğme, `write` | — | Gider formunu **araç ön seçili** açar | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar (`/aktar?tur=giderler`) | — |
| Satır | bağlantı | — | Gider ayrıntısı (bugünkü pencere korunur) | — |
| Satır ⋯ | menü, `write` | — | Düzenle · Sil · (gerekirse) Onayla | — |

Yetki: muhasebe (`accounting`) yoksa tutarlar görünür ama yazma düğmeleri gizlenir — bugünkü
davranış `ExpensesPage.tsx:85-86` ile aynı kalır.

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş (araç seçilmemiş):** "Araç masrafı yok. Bir araç seçin ya da '+ Gider Ekle' ile girin."
- **Boş (araç seçili):** "Bu araç için masraf kaydı yok." + "+ Gider Ekle".
- **Yükleniyor:** `DataTable` iskeleti (bugünkü `loading` prop'u), şeritte `—`.
- **Hata:** `DataTable` `error` + `onRetry` (bugünkü davranış).
- **Yetkisiz:** operasyon rolü görür, yazamaz; muhasebe onay düğmelerini görür.
- **Ayna modu:** `MirrorContext` açıkken yazma düğmeleri (`+ Gider Ekle`, satır menüsü) gizlenir;
  okuma ve şerit sayıları kalır.
- **Lisans:** süre dolduğunda salt okunur; yazma düğmeleri kapalı.

## 6. Metinler ve terimler

Başlık "Araç Masrafları"; sekmeler "Öz Mal · Mazotlar · Araç Masrafları · Giderler · Araçlar".
Şerit: "TOPLAM", "BU AY", "ONAY BEKLEYEN". Boş metinleri yukarıdaki gibi. Düğme fiil + nesne:
"Gider Ekle". Teknik sözcük yok ("ayna", "endpoint" ekranda görünmez). Terimler
`32-TERMINOLOJI.md` ve `docs/TERIMLER.md` ile uyumlu olmalı.

## 7. Telefon davranışı (390×844)

- Tablo yerine kart görünümü (`DataTable`'a `mobileCard` desteği eklenir; `27-TELEFON.md`).
- Kart başlığı: plaka + kategori rozeti; alt satır tarih · tutar; satır ⋯ dokunma hedefi ≥44px.
- Şerit yatay kaydırmaz: üç rakam alt alta iki satıra bölünür.
- `FilterPanel` tam ekran; yatay kaydırma yok (kabul ölçütü).

## 8. Erişilebilirlik ve klavye

- Sekmeler `role="tablist"`/`role="tab"` + `aria-selected` (`SectionTabs.tsx` ile aynı).
- Süzgeç düğmesi sayısı `aria-label`'da: "Süzgeç (2)".
- Tablo başlıkları gerçek `<th>`; sıralama düğmeleri klavyeyle çalışır (`DataTable` mevcut).
- `Ctrl+Enter` gider formunu kaydeder (`Modal` davranışı), `Esc` kapatır.
- Renk tek başına anlam taşımaz: "Onay bekliyor" rozeti metinle birlikte.

## 9. Testler (e2e + birim)

- Yeni spec: `client/e2e/new-ui/arac-masraflari.spec.ts`
  1. `useNewUi(page)` ile yeni görünüm; `/arac-masraflari` açılır, başlık "Araç Masrafları".
  2. Araç seçilir → adres `?arac=` içerir, şerit "TOPLAM" değeri değişir.
  3. "+ Gider Ekle" → formda araç alanı ön seçili gelir.
  4. Arama kutusu bir plaka yazar → liste süzülür (önce arama yapılmalı; birikmiş veri ilk sayfayı
     doldurur — `AGENTS.md` §4 tuzağı).
- Mevcut `client/e2e/workflow.spec.ts` içindeki gider akışı bozulmamalı.
- Sunucu tarafı yeni uç **gerekmez** (§10 adım 1'de doğrulanır); test silme/atlama yasak.

## 10. Uygulama adımları

1. **Veri kontrolü (30 dk).** `ExpensesPage.tsx:63-65` sorgusunun `vehicleId` + `category` ile
   yeterli olduğunu doğrula; `/expenses/categories` (satır 168) toplam ucu araç süzgecini kabul
   ediyor mu bak. Etmiyorsa **dur ve sor** (`30-VERI-API.md`).
2. **Ortak iskelet (2 saat).** `ExpensesPage`'e `mode?: 'all' | 'vehicle'` prop'u ekle; mod
   `vehicle` iken araç seçimi ekranın başlık/süzgeç eksenine alınır. Kod kopyalama yok.
3. **Rota ve menü (1 saat).** `client/src/App.tsx` rotalarına `/arac-masraflari` ekle, `lazy`
   import; `client/src/lib/nav.ts:99` yorumunun yerine gerçek menü girdisi; `sections.ts` sekmesi.
4. **Şerit (2 saat).** `SumStrip` ile TOPLAM / BU AY / ONAY BEKLEYEN; araç seçiliyken daralt.
5. **Satır menüsü (1 saat).** `RowMenu` ile Düzenle/Sil; `MoreMenu` ile Excel aktarımları.
6. **Telefon (3 saat).** `mobileCard` render'ı; şeridin iki satıra bölünmesi.
7. **Testler (3 saat).** §9'daki spec; `npm.cmd run lint`, `npm.cmd run build`.
8. **Belge (30 dk).** `docs/plan/00-DIZIN.md` durum satırı; `docs/GELISTIRME-PLANI.md` güncellemesi.

Toplam ≈ **13 saat** (2 iş günü). Doğrulama komutları: `cd client && npm.cmd run lint &&
npm.cmd run build`; dal push → CI yeşil → `main`.

## 11. Kabul ölçütü

- Menüden **1 tıkla** açılır; bir aracın masrafları **2 tıkla** (Araç ▾ + araç) görünür.
- 1440×900'de listede ≥12 satır; üst kısım ≤260px.
- Araç seçilince "+ Gider Ekle" formunda araç hazır gelir (0 tık).
- 390×844'te yatay kaydırma yok; dokunma hedefleri ≥44px.
- CI yeşil; yeni spec geçer; test silinmez.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| `ExpensesPage` iki moda bölünürken mevcut gider akışı bozulur | Mod prop'u varsayılan `all`; mevcut e2e yeşil kalmalı |
| Şerit için yeni uç gerekir | Uç yazmadan dur, kullanıcıya sor |
| Aynı sayfa iki rotada kafa karıştırır | Menüde tek giriş ("Araç Masrafları"); Giderler'de açıklama satırı |
| Araç süzgeci 100+ araçta yavaş | Arama kutusu (aranabilir seçim bileşeni) |

## 13. Doğrulanacaklar

- Araç masrafı kategorilerinin hangilerinin bu ekranda varsayılan görüneceği (Öz Mal tüm
  kategoriler mi, yalnız `Maintenance/Tire/Insurance/Tax/Toll` mu?) — kullanıcı kararı.
- Araç seçiliyken KM/litre sütunlarının da görünmesi isteniyor mu (Mazotlar ile çakışma).
- Kiralık araçlarda masrafın taşeron carisine yansıyıp yansımayacağı (bugünkü davranış gider
  kaydı + isteğe bağlı tedarikçi borcu; `ExpensesPage.tsx:223`).

Sonraki belgeyle bağlantı: `19-OZ-MAL-MAZOTLAR.md` yakıt ayrıntısını, `22-OZ-MAL-ARACLAR.md` araç
kaydını ve belge uyarılarını, `23-ANALIZ.md` araç kârlılığını, `28-ORTAK-PARCALAR.md` iskelet
parçalarını tanımlar.
