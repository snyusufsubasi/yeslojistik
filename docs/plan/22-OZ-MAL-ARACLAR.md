# 22 — Araçlar (öz ve kiralık)

## 1. Amaç ve kapsam

Filonun tek listesi: öz araçlar ve taşeron (kiralık) araçlar ayrı sekmelerde, her araçta plaka,
sahiplik, durum ve belge/sigorta/muayene tarihleri. Kullanıcı öz araçlarla kiralık araçları
karıştırmak istemiyor (özellikle istedi: sekmeler ve varsayılanın öz araçlar olması).

Kapsam: `/araclar` ekranının yeni görünümde sadeleşmesi, belge uyarılarının tek simgeye inmesi,
araç kartı/formunun tek sayfa düzenine uyması, telefon davranışı. Kapsam dışı: araç masrafları
(`21-OZ-MAL-ARAC-MASRAFLARI.md`), harita/konum (`13-HARITA-TAKIP.md`), kiralık araç sözleşmesi
muhasebesi.

`docs/KOLAYLASTIRMA-UYGULAMA.md` §F4.4'ün şartnamesidir.

## 2. Bugünkü durum (kod kanıtıyla)

- Sayfa `client/src/pages/VehiclesPage.tsx`; durum değişkenleri: arama (satır 30), durum süzgeci
  (satır 31), sıralama (satır 32), form hedefi (satır 33), silme onayı (satır 35).
- **Öz / kiralık ayrımı zaten sekme olarak var:** `setTab` (satır 39) ve `Chip role="tab"` +
  `aria-selected` (satır 99). Kullanıcı bu yapıyı korumak istiyor.
- Kiralık araç rozeti: `ownership === 'Rented'` → `<Badge tone="purple">Kiralık</Badge>` (satır 61).
- Sayfa başlığı bugün "Araçlar" + alt başlık "Filo, bakım ve belge takibi" (satır 84); yeni
  görünümde alt başlık gizlenir (`client/src/components/ui.tsx:113`).
- Tablo `DataTable` (satır 104); boş liste metni satır 109'da ("Araçlarınız burada listelenir;
  bakım ve belge uyarıları da buradan gelir…").
- Araç formu ayrı bileşene taşınmış: `client/src/components/VehicleForm.tsx` (sevkiyat formundan
  açılabilsin diye; PR #15 notu). Yani form yeniden kullanılabilir durumda.
- `client/src/pages/VehiclesPage.tsx` içinde belge uyarıları **sütun olarak** duruyor; plan
  bunların tek simgeye inmesini istiyor (§F4.4). Ayrıntı penceresi bugün `Modal`.
- Menüde yol: `/araclar` (`client/src/lib/nav.ts` "Öz Mal" grubu); bölüm sekmesi
  `client/src/lib/sections.ts`.

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/pages/VehiclesPage.tsx:30-32` | Arama, durum süzgeci, sıralama durumları |
| `client/src/pages/VehiclesPage.tsx:33` | Form hedefi (`Vehicle \| 'new'`) |
| `client/src/pages/VehiclesPage.tsx:39` | Sekme değiştirme fonksiyonu (`setTab`) |
| `client/src/pages/VehiclesPage.tsx:61` | `ownership === 'Rented'` → "Kiralık" rozeti |
| `client/src/pages/VehiclesPage.tsx:84` | Sayfa başlığı ve alt başlık |
| `client/src/pages/VehiclesPage.tsx:99` | Sekmeler (`Chip` + `role="tab"` + `aria-selected`) |
| `client/src/pages/VehiclesPage.tsx:104` | `DataTable` kullanımı |
| `client/src/pages/VehiclesPage.tsx:109` | Boş liste metni |
| `client/src/components/ui.tsx:113` | Yeni görünümde alt başlığın gizlenmesi |
| `client/src/lib/sections.ts:10-33` | Bölüm/sekmе tanımları |

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────────────┐
│ Araçlar                                       [⋯ Diğer] [+ Araç Ekle]│
│ Öz Araçlar   Kiralık Araçlar                                        │
│ [🔍 Ara: plaka, marka…] [Durum ▾] [Süzgeç (0)]                       │
│ ÖZ ARAÇ 12 │ YOLDA 3 │ BAKIMDA 1 │ BELGESİ YAKLAŞAN 2               │
│ ┌ tablo ─────────────────────────────────────────────────────────────┐│
│ │ Plaka   Marka/Tip   Sahip     Durum    Belge    ⋯                ││
│ │ 16 KZ 528  Ford Cargo  Öz mal   Yolda    ⚠       ⋯                ││
│ └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

- **Sekmeler korunur** (kullanıcı isteği): "Öz Araçlar" (varsayılan) · "Kiralık Araçlar".
  Sekme adresle de çalışır: `?sahiplik=oz` / `?sahiplik=kiralik` (`app/…` deseni bugünkü
  `setTab` ile uyumlu).
- **Belge uyarısı tek simge:** satırda `⚠` simgesi; üzerine gelince/tıklanınca hangi belgenin
  (sigorta, muayene, kasko) kaç gün kaldığı/geciktiği tek cümleyle görünür. Bugünkü çok sütunlu
  uyarı gösterimi kaldırılır; ayrıntı pencere/drawer'a taşınır.
- Şerit: `SumStrip` ile ÖZ ARAÇ / YOLDA / BAKIMDA / BELGESİ YAKLAŞAN sayıları (bugünkü
  `StatCard` benzeri kartların yerine, `AGENTS.md` §8'deki `StatCard` → `Figures` yönü).
- Üst kısım ≤260px; ilk ekranda ≥12 satır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Ara | metin | — | Plaka, marka, sahip adı; 250 ms gecikmeli | "Aramanıza uyan araç yok." |
| Durum | seçim | — | Boşta / Yolda / Bakımda / Arızalı | — |
| Sekme | `role="tab"` | — | Öz ↔ Kiralık; varsayılan Öz; adrese yazılır | — |
| Belge simgesi | simge düğmesi | — | Belge ayrıntısını açar (sigorta/muayene/kasko tarihleri) | — |
| "+ Araç Ekle" | düğme, `write` | — | `VehicleForm` penceresi; sekme öz ise `ownership: 'Owned'` ön seçili | — |
| ⋯ Diğer | menü | — | Excel'e aktar · Excel'den aktar · (varsa) Bakım geçmişi | — |
| Satır ⋯ | menü, `write` | — | Düzenle · Sil · (kiralıkta) Sözleşme bilgisi | — |

Alan doğrulaması formda kalır (`zodTr` ile Türkçe mesajlar): plaka biçimi, zorunlu marka,
tarih sırası (muayene ≥ bugün uyarısı bilgilendiricidir, engellemez).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş (öz sekmesi):** "Öz aracınız yok. '+ Araç Ekle' ile ekleyin ya da Excel'den aktarın."
- **Boş (kiralık sekmesi):** "Kiralık araç kaydı yok."
- **Yükleniyor:** `DataTable` iskeleti; şeritte `—`.
- **Hata:** `DataTable` `error` + `onRetry` (bugünkü davranış).
- **Yetkisiz:** operasyon rolü düzenler, muhasebe yalnız görür; silme yalnız yönetici (bugünkü
  `perm` kuralı neyse korunur).
- **Ayna modu:** yazma düğmeleri gizli; liste ve belge uyarıları görünür (pratikortam aynası
  araç kayıtlarını da taşıyor).
- **Lisans:** süre dolduysa salt okunur.

## 6. Metinler ve terimler

"Sekmeler: Öz Araçlar · Kiralık Araçlar". Şerit: "ÖZ ARAÇ", "YOLDA", "BAKIMDA", "BELGESİ
YAKLAŞAN". Rozetler: "Kiralık", "Yolda", "Bakımda", "Arızalı". Düğmeler: "Araç Ekle", "Düzenle",
"Sil". Belge uyarısı metni: "Sigorta 12 gün içinde bitiyor." / "Muayene 8 gün gecikti."
Teknik sözcük yok; plaka `PlateBadge` ile, tarih `03.10.2026` biçiminde.

## 7. Telefon davranışı (390×844)

- Kart görünümü: plaka + `Kiralık` rozeti üstte, marka/şerit altta, belge simgesi sağda.
- Sekmeler yatay kaydırmaz (iki sekme sığar); şerit iki satıra bölünür.
- Satır ⋯ ve belge simgesi dokunma hedefi ≥44px; "+ Araç Ekle" alt çubukta yer alır
  (`27-TELEFON.md`).

## 8. Erişilebilirlik ve klavye

- Sekmeler `role="tablist"`/`role="tab"` + `aria-selected` (bugünkü `Chip` yapısı; satır 99).
- Belge simgesi `aria-label` taşır: "Belgeler: sigorta 12 gün"; simge tek başına renkle anlam
  taşımaz.
- Tablo sıralaması klavyeyle; `Ctrl+Enter` formda kaydeder, `Esc` kapatır.
- Odak halkası `:focus-visible` (tema).

## 9. Testler (e2e + birim)

- Mevcut `client/e2e/vehicles.spec.ts:4` öz/kiralık sekmelerini sınıyor; yeni görünümde de
  aynı senaryo geçmeli.
- Yeni: `client/e2e/new-ui/araclar.spec.ts`
  1. `useNewUi` + `/araclar` → başlık "Araçlar", sekmeler görünür, varsayılan Öz.
  2. Kiralık sekmesine geçiş → adres `?sahiplik=kiralik`, listede `Kiralık` rozeti.
  3. Belge simgesine tıkla → hangi belge/kaç gün bilgisi görünür.
  4. "+ Araç Ekle" → formda sahiplik öz seçili.
- Test silme/atlama yasak; mevcut araç testleri korunur.

## 10. Uygulama adımları

1. **Şerit ve sekmeler (3 saat).** `SumStrip` + `Figures` ile sayılar; sekmeleri adrese bağla
   (`?sahiplik=`), varsayılan `oz`. Dosya: `client/src/pages/VehiclesPage.tsx:39,99`.
2. **Belge uyarısı tek simge (3 saat).** Sütunları kaldır, `⚠` simgesi + ayrıntı drawer'ı;
   hangi belgenin eşiği kaç gün (ör. 30 gün) — §13'te soru.
3. **Form sadeleştirme (3 saat).** `client/src/components/VehicleForm.tsx`: zorunlu alanlar önce,
   tek "Diğer bilgiler" katlı bölümü, altta sabit "Kaydet" + "Kaydet ve yeni".
4. **İskelet (2 saat).** `PageShell` + `MoreMenu` + `FilterBar` (`28-ORTAK-PARCALAR.md`).
5. **Telefon (2 saat).** `mobileCard` render'ı; şerit sarma.
6. **Testler (2 saat).** §9 spec'i; `npm.cmd run lint && npm.cmd run build`.
7. **Belge (30 dk).** `docs/GELISTIRME-PLANI.md` + `00-DIZIN.md` durum güncellemesi.

Toplam ≈ **15,5 saat** (2 iş günü).

## 11. Kabul ölçütü

- Öz/kiralık ayrımı **sekme olarak** korunur, varsayılan öz araçlar (kullanıcı isteği).
- Satırda **en fazla 1 uyarı rozeti/simgesi** (alarm yorgunluğu yok, şartname §5).
- 1440×900'de ≥12 satır; üst kısım ≤260px; 390×844'te yatay kaydırma yok.
- CI yeşil; `vehicles.spec.ts` ve yeni spec geçer.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Belge uyarıları gizlenince kullanıcı kaçırır | Simge + şeritte "BELGESİ YAKLAŞAN" sayısı; eşik §13'te onaylanır |
| Sekme adının adrese bağlanması eski yer imlerini bozar | Varsayılan davranış korunur (`?sahiplik` yoksa öz) |
| Kiralık araçta "Sil" yerine "Sözleşmeyi bitir" gerekir | §13 sorusu; bugünkü silme davranışı korunur |

## 13. Doğrulanacaklar

- Belge uyarısı eşiği (kaç gün kala gösterilsin) ve hangi belgeler sayılsın (sigorta, muayene,
  kasko, egzoz).
- Kiralık araçta silme yerine sözleşme bitirme akışı isteniyor mu.
- Taşeron araç sahibinin ayrı bir "sahip" kaydı olarak mı tutulacağı (bugün `ownership` + serbest
  metin olabilir; kod doğrulanacak).

Sonraki belgeyle bağlantı: `21-OZ-MAL-ARAC-MASRAFLARI.md` bu araçların masraflarını,
`13-HARITA-TAKIP.md` konumlarını, `27-TELEFON.md` kart görünümünü tanımlar.
