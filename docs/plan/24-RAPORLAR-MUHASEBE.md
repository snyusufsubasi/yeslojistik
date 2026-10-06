# 24 — Raporlar, yaşlandırma ve muhasebe

## 1. Amaç ve kapsam

Genel Bakış dışında kalan raporların (sevkiyat kazancı, araç, şoför, mazot, giderler, müşteri,
yaşlandırma) ve **muhasebe aktarımının** sadeleştirilmiş hâli: her sekme tek bir soruya cevap
verir, dışa aktarım kestirmesi başlıkta durur, muhasebe için dosya üretimi tek ekranda toplanır.

Kapsam: sekme düzeni, süzgeçler, Excel/PDF dışa aktarımları, yaşlandırma raporunun okunurluğu,
muhasebe ayı ve dosyaları (`/exports/accounting`, `/exports/einvoice-xml`). Kapsam dışı:
Genel Bakış'ın yeni rakamları (`23-ANALIZ.md`), KDV hesap kuralları (`docs/KDV-KURALLARI.md`),
e-Fatura entegratörü (`docs/E-FATURA.md`).

## 2. Bugünkü durum (kod kanıtıyla)

- Sekmeler `Tabs` ile tek sayfada: `monthly`, `vehicle`, `driver`, `fuel`, `expenses`, `customer`,
  `aging`, `accounting` (`client/src/pages/ReportsPage.tsx:38`, tip satır 22-27).
- Dönem/süzgeç durumları: yıl (24), başlangıç (25), bitiş (26), gruplama (27).
- Kazanç raporu tek formülle: satış, komisyon, maliyet, prim, masraf ve kâr; ay/müşteri/araç/şoför
  bazında (satır 150 açıklaması), dikey ve yatay `BarChart` (126, 294).
- Araç maliyetleri sevkiyat kârlılığı raporunda ayrıca gösteriliyor (satır 316 notu).
- Excel dışa aktarım her sekmede başlıkta: `ExportButton url={/reports/${tab}} format=xlsx`
  (satır 35); muhasebe sekmesinde gizli.
- **Muhasebe sekmesi** ayrı bileşen (satır 387+): ay seçici (390), açıklama paragrafı (402),
  "Muhasebe Excel'i" (`/exports/accounting`, satır 409) ve "e-Fatura XML (ZIP)"
  (`/exports/einvoice-xml`, satır 410) — ikincisi e-Fatura açıkken anlamlı.
- Yaşlandırma sekmesi aynı sayfa içinde; sütun/renk mantığı ortak `DataTable` + `Badge` ile.
- Grafik renkleri `client/src/lib/chart.ts`; para biçimi `tl2`.

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/pages/ReportsPage.tsx:23-27` | Sekme, yıl, dönem, gruplama durumları |
| `client/src/pages/ReportsPage.tsx:35` | `ExportButton url={/reports/${tab}} format=xlsx` |
| `client/src/pages/ReportsPage.tsx:38` | Sekme listesi |
| `client/src/pages/ReportsPage.tsx:150` | Kazanç raporu açıklaması (tek kâr formülü) |
| `client/src/pages/ReportsPage.tsx:316` | Araç maliyetleri notu |
| `client/src/pages/ReportsPage.tsx:387` | Muhasebe bileşeni (aylık aktarım) |
| `client/src/pages/ReportsPage.tsx:390` | Ay seçici |
| `client/src/pages/ReportsPage.tsx:402` | Kullanıcıya gösterilen muhasebe açıklaması |
| `client/src/pages/ReportsPage.tsx:409-410` | `/exports/accounting` ve `/exports/einvoice-xml` düğmeleri |
| `server/YesLojistik.Api/Controllers/ReportsController.cs` | 12 rapor ucu |

## 3. Hedef yerleşim

```
┌──────────────────────────────────────────────────────────────────────┐
│ Analiz                                       [Excel'e Aktar] [⋯ Diğer]│
│ Genel Bakış  Sevkiyat Kazancı  Araç  Şoför  Mazot  Giderler  Müşteri  │
│ Yaşlandırma  Muhasebe                                                │
│ [Dönem: 01.01.2026 – 05.10.2026] [Gruplama: Ay ▾] [Plaka ▾] [Süzgeç] │
│ ┌ tablo / grafik ────────────────────────────────────────────────────┐│
│ └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

- **Dönem ve gruplama tek satırda**, tüm sekmelerde ortak (bugün sekme başına dağınık).
- **Excel'e Aktar** başlıkta sağda; muhasebede "Dosyaları indir" bloğu sekme içinde kalır.
- **Yaşlandırma:** satır sonunda toplam, 0-30 / 31-60 / 61-90 / 90+ kolonları; gecikmiş tutarlar
  `Badge tone="red"`, kısa vadeli `yellow`; satırda müşteri adı + telefon kısayolu.
- **Muhasebe:** ay seçici + iki düğme + "Dosyaları muhasebecinize gönderin" notu; e-Fatura kapalıysa
  XML düğmesi gizli, açıklaması "e-Fatura açılınca görünür" (teknik sözcük yok).

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Sekmeler | `Tabs` | — | Adresle `?sekme=`; geri tuşu çalışır | — |
| Dönem | `DateFilter` | — | Tüm sekmelerde ortak | "Başlangıç bitişten sonra olamaz." |
| Gruplama | seçim | — | Ay / Müşteri / Araç / Şoför | — |
| Plaka | aranabilir seçim | — | Boş = tüm filo | — |
| Excel'e Aktar | düğme | — | Aktif sekmenin verisini `xlsx` indirir | "Rapor indirilemedi, tekrar deneyin." |
| ⋯ Diğer | menü | — | Yazdır · Tüm rapor Excel · (gerekirse) CSV | — |
| Muhasebe ayı | ay seçici | ✅ | Dosya üretimi bu aya göre | "Ay seçin." |
| Muhasebe Excel'i | düğme | ✅ | `/exports/accounting` indirir | "Dosya üretilemedi." |
| e-Fatura XML (ZIP) | düğme | — | `/exports/einvoice-xml`; e-Fatura kapalıysa gizli | — |

Yetki: raporlar `accounting` dışındaki ofis rollerine de açık; muhasebe aktarımı **yalnız**
`accounting` (bugünkü davranış `ExportButton` satır 35'te sekmeye göre gizleniyor).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş:** "Bu dönemde kayıt yok." + dönemi genişletme önerisi.
- **Yükleniyor:** tablo iskeleti / grafik yer tutucu.
- **Hata:** sekme içi uyarı + "Yenile"; dışa aktarım hatası düğme yanında.
- **Yetkisiz:** muhasebe sekmesi görünmez (rol yoksa) — bugünkü gizleme kuralı korunur.
- **Ayna modu:** okuma serbest; rakamlar pratikortam kayıtlarını içerir; yazma yok.
- **Lisans:** süre dolduysa görüntüleme serbest, dosya üretimi kalır (rapor bir okuma işidir).

## 6. Metinler ve terimler

Sekmeler: "Genel Bakış · Sevkiyat Kazancı · Araç · Şoför · Mazot · Giderler · Müşteri ·
Yaşlandırma · Muhasebe". Düğmeler: "Excel'e Aktar", "Muhasebe Excel'i", "e-Fatura XML (ZIP)",
"Yazdır". Dönem etiketi "Dönem", gruplama "Gruplama". Yaşlandırma başlıkları: "0-30 gün",
"31-60 gün", "61-90 gün", "90+ gün". Teknik sözcük yok (UBL, endpoint, dry-run ekranda görünmez).

## 7. Telefon davranışı (390×844)

- Sekmeler yatay kaydırılır; dönem/gruplama iki satıra bölünür.
- Grafikler tam genişlik; yaşlandırma tablosu kart listesine döner (müşteri + toplam + gecikme).
- Muhasebe düğmeleri tam genişlik, alt alta; yatay kaydırma yok.

## 8. Erişilebilirlik ve klavye

- `Tabs` klavye ile gezinir (ok tuşları); `aria-selected` doğru.
- Grafiklerin metin alternatifi (yaşlandırma ve kazanç için `<table class="sr-only">`).
- Dışa aktarım düğmeleri `aria-live` bildirimle sonuç verir ("Rapor indirildi.").
- Renk körlüğü: yaşlandırma renkleri metinle birlikte ("62 gün gecikti").

## 9. Testler (e2e + birim)

- Mevcut `client/e2e/workflow.spec.ts` içindeki rapor/Excel adımları korunur ve yeni görünümde de
  geçer.
- Yeni: `client/e2e/new-ui/raporlar.spec.ts`
  1. Her sekme açılır, başlık değişir, adres `?sekme=` ile eşleşir.
  2. "Excel'e Aktar" indirme olayı tetikler.
  3. Muhasebe sekmesi yalnız `accounting` rolünde görünür.
- Birim: rapor toplamlarının KDV kuralı (`docs/KDV-KURALLARI.md`) sunucu testleriyle korunur;
  test silme/atlama yasak.

## 10. Uygulama adımları

1. **Ortak süzgeç satırı (3 saat).** Dönem + gruplama + plaka tek satıra; `ReportsPage.tsx:24-27`.
2. **Sekme adları ve adres (2 saat).** `?sekme=` derin bağlantı; etiketler sadeleşir.
3. **Yaşlandırma düzeni (3 saat).** Kolonlar, toplam satırı, `Badge` renkleri, müşteri bağlantısı.
4. **Dışa aktarım birleştirme (2 saat).** Başlıkta tek "Excel'e Aktar" (satır 35 deseni), ⋯ Diğer'de
   "Tüm rapor Excel" ve "Yazdır".
5. **Muhasebe sekmesi (2 saat).** Açıklamayı sadeleştir (satır 402), e-Fatura kapalıysa XML
   düğmesini gizle (409-410).
6. **Telefon (2 saat).** Sekme kaydırma, tablo→kart, düğme genişlikleri.
7. **Testler (3 saat).** §9.
8. **Belge (30 dk).** `docs/KURULUM.md` veya `docs/GELISTIRME-PLANI.md` ilgili satır.

Toplam ≈ **17,5 saat** (≈2,5 iş günü).

## 11. Kabul ölçütü

- Her sekme **1 tıkla** açılır; dönem ve gruplama tüm sekmelerde ortak kalır.
- Excel dışa aktarımı her sekmede çalışır; muhasebe yalnız yetkiliye görünür.
- Yaşlandırmada gecikmiş tutarlar hem renk hem metinle anlaşılır.
- 1440×900'de tablo ≥12 satır; 390×844'te yatay kaydırma yok.
- CI yeşil; mevcut rapor testleri yeşil kalır.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Sekme adresi değişince eski bağlantılar kırılır | Eski `?tab=`/kod anahtarları için yönlendirme; varsayılan `overview` |
| Muhasebe dosyalarında tarih/ay karışıklığı | Ay seçici tek kaynak; sunucu testleri |
| Yeni uç gerekir (örn. yaşlandırma özeti) | Dur ve sor; mevcut uç korunur |
| e-Fatura kapalıyken XML düğmesi kafa karıştırır | Düğme gizlenir, tek satır açıklama kalır |

## 13. Doğrulanacaklar

- Muhasebe Excel'inin sayfa içerikleri (bugünkü dosya sütunları) — belgeyle birebir uyum için
  `docs/E-FATURA.md` ve sunucu kodu okunacak.
- Yaşlandırma eşikleri (30/60/90) firmanın gerçek vade alışkanlığıyla uyumlu mu.
- "Tüm rapor Excel" kapsamı (kaç sekme, hangi sütunlar).

Sonraki belgeyle bağlantı: `23-ANALIZ.md` Genel Bakış sekmesini, `30-VERI-API.md` rapor uçlarını,
`31-TEST-CI.md` test/CI kuralını, `32-TERMINOLOJI.md` sekme adlarını tanımlar.
