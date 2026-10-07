# Seçilen tasarım: "Hark tarzı" (7 Ekim 2026)

*7 Ekim 2026'da kullanıcı "Otoyol" görünümünü bıraktı ve bu yönü onayladı ("uygula, hepsini canlıya al"). `TASARIM-OTOYOL.md` artık geçerli değil; yalnız geçmiş kaydı olarak duruyor.*

## Hava
Aydınlık, ferah, sakin; telefon uygulaması kalitesinde "premium" his.
- Sıcak kırık beyaz zemin, beyaz yüzeyler (kart, tablo, pencere).
- Bölümler 1px ince çizgiyle ayrılır; kart ve açılır pencerelerde çok hafif, yumuşak gölge.
- Köşeler yuvarlak: kart 16px, alan ve düğme 10-12px, çip ve durum etiketi tam yuvarlak.
- **Tek vurgu rengi:** sakin çivit mavisi `#4652c9`. Az ve yerinde: ana düğme, seçili menü satırı, seçili çip, bağlantı.
- Sarı yalnız dikkat isteyen yerde ("faturası kesilecek", logo kutusu).
- Geçişler kısa ve yumuşak (150-200 ms); "hareketi azalt" ayarında kapanır.

## Renkler (jetonlar `client/src/index.css` → `@theme`)
| Jeton | Değer | Kullanım |
|---|---|---|
| canvas | `#f7f7f5` | sayfa zemini |
| surface | `#ffffff` | kart, tablo, pencere, sol menü |
| surface-2 | `#f3f3f0` | satır üzeri (hover), ikincil zemin |
| line | `#e6e5e1` | ince çizgiler |
| fg | `#1c1b19` | ana yazı (neredeyse siyah) |
| muted | `#6b6a65` | ikincil yazı |
| accent / brand-600 | `#4652c9` | ana düğme, seçili menü/çip, bağlantı |
| accent-soft | `#eceefb` | seçili menü satırı zemini |
| hl (sarı) | `#f2b632` | logo kutusu, dikkat |
| good / warn / bad / info | `#157a3c` / `#9a5800` / `#c0362c` / `#0b6c99` | Teslim edildi, uyarı, hata, Planlandı (soft zeminleri `*-soft`) |
| bill / bill-soft | `#765600` / `#fdf4d5` | "Faturası kesilecek" vurgusu |

`slate-*` sıcak nötr griye, `brand-*` çivit mavisine, `navy-*` ana yazı rengine yeniden eşlendi: sayfalar aynı adları kullandığı için bütün ekranlar birlikte değişti.

## Yazı
- **Inter** (değişken, `@fontsource-variable/inter`), başlıklar dahil her yerde. Google Fonts bağlantısı yok.
- Tutar, plaka, sayaç: yine Inter, **eşit genişlikli rakamlar** (`tabular-nums`) ile alt alta hizalı. Ayrı mono yazı tipi kalktı (`font-mono` sınıfı Inter + eşit rakam demek).
- Taban 18px (yazı boyutu ayarı **Aa**: Normal / Büyük / Çok büyük; üst çubukta ve kullanıcı menüsünde, korunuyor).
- Tablo başlığı ve kart başlığı BÜYÜK HARF değil; küçük, yarı kalın, sakin gri.

## Ölçüler
- Kart: `rounded-2xl` (16px), 1px çizgi, `shadow-xs`.
- Alan (`.input`): 10px köşe, odakta çivit çerçeve + 4px açık halka.
- Düğme: 10px köşe, yazı yarı kalın; ana düğme çivit, ikincil beyaz + çizgi.
- Açılır pencere: 16px köşe, `shadow-xl`, arka plan hafif bulanık.
- Tablo: satır dikey dolgusu 10px (yeni görünümde 9px); dizüstünde 15-20 satır korunur.

## Parçalar
- **Sol menü (260px):** beyaz, sağda ince çizgi. Gruplar hep açık (kullanıcı isteği, değişmedi). Seçili satır: açık çivit "hap" zemin, çivit yazı ve ikon. Sayaç rozeti: yuvarlak, açık turuncu zemin.
- **Üst çubuk:** yarı saydam beyaz, ince alt çizgi. "+ Yeni" yuvarlak çivit düğme (kısayol N), Aa, bildirim zili, kullanıcı.
- **Durum etiketi:** tam yuvarlak hap, solda yuvarlak nokta.
- **Plaka rozeti:** ince çerçeveli kutu, solda mavi "TR" şeridi (gerçek plaka gibi).
- **Rakam şeridi / kazanç şeridi:** yan yana kutular, aralarında ince çizgi; etiket sakin, değer eşit rakamlı.
- **Bildirim (toast):** beyaz kart, renkli ikon (yeşil ✓ / kırmızı ✕), aşağıdan yumuşak giriş.
- **Boş liste:** yumuşak daire içinde simge + kısa açıklama (+ varsa ilk adım düğmesi).

## Akıllı alan (hem şıklı hem yazılı)
`client/src/components/SmartField.tsx`. Serbest yazılan alanlarda:
1. Üstte en sık 5-6 seçenek **tek dokunuşla çip** (seçili çip çivit; tekrar basınca kalkar).
2. Kutuya odaklanınca **aranabilir liste**: önce "Bu kayıt için önerilen" (ör. müşterinin yük cinsleri), sonra "Sık kullandıklarınız" (firmanın kendi kayıtları, kaç kez kullanıldığıyla), sonra "Sektörde yaygın".
3. **"Diğer…"**: listede olmayan değer yazılır ve **aynen kaydedilir** ("“…” yazdığım gibi kullan" ya da Enter).
- Sıklık: `GET /api/options/{alan}` (yeni tablo yok; mevcut kayıtlardan sayılır, büyük/küçük harf farkı birleşir).
- Sektör listeleri: `client/src/lib/sectorOptions.ts`.
- Kullanıldığı yerler: Sevkiyat (Yük Cinsi, Birim, Ödeme Şekli), Araç (Araç Tipi, Taşıma Kapasitesi, Yakıt Türü), Gider (Gider Adı, Kategori, Yakıt Türü), Sabit Ödeme (Başlık), masraf reddetme gerekçesi.
- Eski serbest yazılar olduğu gibi görünür ve kaydedilir.

## Bilerek yapılmayanlar / sırada
- Sevkiyatta "taşıma şekli", araçta "dorse/kasa tipi" ve iptal/sorun nedeni alanı **yok**; alan eklemek veritabanı değişikliği ister. Sektör listeleri hazır (`tripProblemReasonOptions` vb.), alan eklenince bağlanır.
- Karanlık tema yok.
