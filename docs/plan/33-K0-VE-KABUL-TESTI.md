# 33 — K0 dinleme, tık ölçümü ve kabul testi

## 1. Amaç ve kapsam

İşin "müşteriye göre" doğru yapıldığını ölçen tek bölüm. Bugün K0 (dinleme) **hiç yapılmadı** ve
`docs/KOLAYLASTIRMA-DINLEME.md` dosyası yok; bu yüzden öncelik sırası tahmine dayanıyor. Bu belge
görüşmenin, tık ölçümünün ve son kabul testinin protokolünü verir.

Kapsam: K0 görüşme planı, 10 iş için tık ölçüm tablosu, kabul testi adımları, sonuç kaydı biçimi,
onay mekanizması. Kapsam dışı: ekran tasarımları (02–29), kod işi, müşteri verisinin işlenmesi.

## 2. Bugünkü durum (doküman kanıtıyla)

- Planın ilk aşaması **K0** olarak tanımlı (`docs/KOLAYLASTIRMA-PLANI.md:277-284`): 30 dakikalık
  görüşme, 10 iş için tık sayımı, çıktı `docs/KOLAYLASTIRMA-DINLEME.md` (veri içermez).
- Durum tablosunda K0 "Bekliyor; uygulamayı durdurmaz, F2 sonunda müşteriye gösterilir"
  (`docs/KOLAYLASTIRMA-PLANI.md:385`).
- Kabul ölçütü iki yerde yazılı: `KOLAYLASTIRMA-PLANI.md:264-266` ve
  `KOLAYLASTIRMA-UYGULAMA.md:438-452` — müşteri **yardım almadan 10 işin en az 9'unu** yapabilmeli,
  hiçbiri pratikortam'dakinden uzun sürmemeli.
- Görsel yön onayı da müşteriye bağlı: K1'de (uygulamada F1) seçilen yön `docs/TASARIM-OTOYOL.md`
  dosyasına işleniyor; P0.2'de yeni görünüm jetonları için ikinci bir onay gerekiyor
  (`29-GORSEL-SISTEM.md` §10.6).
- Müşteri sırası: 1) K0 görüşmesi, 2) yeni görünümü kendi hesabında deneme, 3) kabul testi,
  4) "varsayılan yapılsın" onayı (`DEFAULT_UI_MODE='new'`).

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `docs/KOLAYLASTIRMA-PLANI.md:277-284` | K0 aşamasının tanımı (30 dk görüşme, tık ölçümü, çıktı dosyası) |
| `docs/KOLAYLASTIRMA-PLANI.md:251-262` | 10 iş ve hedef tık sayıları |
| `docs/KOLAYLASTIRMA-PLANI.md:264-266` | Kabul ölçütü (9/10, pratikortam'dan uzun olmama) |
| `docs/KOLAYLASTIRMA-PLANI.md:385` | Durum tablosunda K0 = "Bekliyor" |
| `docs/KOLAYLASTIRMA-UYGULAMA.md:438-452` | Müşteriyle yapılacak kabul testi adımları |
| `docs/KOLAYLASTIRMA-SIRADAKI-ISLER.md` §11 | Uygulama modu (dal + CI kapısı) ve adım büyüklüğü |
| `client/src/components/Layout.tsx:123-138` | `N` kısayolu ve Yeni menüsü (klavye testi) |

## 3. K0 görüşme protokolü (30 dakika)

**Hazırlık (5 dk, ajan/kullanıcı):** ekran kaydı aracı hazır; `docs/KOLAYLASTIRMA-DINLEME.md`
taslağı açık; tık ölçüm tablosu (§4) boş hâlde hazır.

**Konuşma akışı (20 dk):**
1. "Panelde en çok hangi ekranda zorlanıyorsunuz?" (serbest anlatım; örnek verilmez)
2. "Günde kaç kez şu işleri yapıyorsunuz: sevkiyat girmek, fatura kesmek, tahsilat, ödeme, mazot?"
3. "pratikortam'da en sevdiğiniz şey ne? Neyi birebir aynı istersiniz?"
4. Müşteri pratikortam'da **3 işi** kendisi gösterir (kayıt altına alınır: kaç tık, kaç saniye).
5. Aynı 3 iş yeni panelde yapılır (yeni görünüm açık); tık sayısı ve süre yazılır.

**Kurallar (değişmez):**
- pratikortam.com **salt okunur**: form doldurulmaz, kaydet/sil düğmesine basılmaz
  (`AGENTS.md` §3.1). Müşteri girişini **kendisi** yapar; şifre ajana verilmez (§3.2).
- Ekran kaydı **müşterinin kendi bilgisayarında** kalır; depoya girmez; görüşme notlarında müşteri
  adı, plaka, tutar, VKN geçmez (`AGENTS.md` §3.3).
- Görüşme sonunda 3-4 ekran görüntüsü istenir (karartılmış), depoya **girmez**; referans olarak
  yalnız "şu ekran, şu düğme" tarifi yazılır.

**Çıktı:** `docs/KOLAYLASTIRMA-DINLEME.md` — ölçüm tablosu, müşterinin cümleleri (veri ayıklanmış),
öncelik sırası değişikliği varsa gerekçesi, K1/P0.2 görsel seçimi.

## 4. Tık ölçüm tablosu (10 iş)

Ölçüm iki kez yapılır: pratikortam'da ve panelde (klasik + yeni görünüm). Hedef sayılar
`docs/KOLAYLASTIRMA-PLANI.md:251-262`'den alınır.

| # | İş | Pratikortam (tık/sn) | Panel klasik | Panel yeni | Hedef |
|---|---|---|---|---|---|
| 1 | Yeni sevkiyat girmek | … | … | … | Tek ekran, ≤4 tık |
| 2 | Bugünkü sevkiyatları görmek | … | … | … | 1 tık |
| 3 | Durumu ilerletmek (Yüklendi/Yolda/Teslim) | … | … | … | 1 tık (satır düğmesi) |
| 4 | Sevkiyat bulmak (plaka/firma) | … | … | … | yaz + Enter |
| 5 | Fatura kesmek | … | … | … | 3 tık |
| 6 | Müşteri bakiyesi/ekstresi | … | … | … | 2 tık |
| 7 | Tahsilat girmek | … | … | … | 2 tık + form |
| 8 | Tedarikçiye ödeme girmek | … | … | … | 2 tık + form |
| 9 | Mazot/gider girmek | … | … | … | Tek ekran |
| 10 | Aylık kazancı görmek | … | … | … | 1 tık |

Tablo doldurulurken: aynı veri, aynı tarayıcı boyutu (1440×900), aynı kullanıcı rolü; sayaç sıfırdan
başlar; "yardım" sayılmaz (müşteri kendisi yapar).

## 5. Durumlar ve karar noktaları

- **K0 yapılamıyorsa:** öncelik `docs/KOLAYLASTIRMA-PLANI.md` §2'deki tespitlere göre kalır; K0
  yapıldığında sıralama güncellenir. Kod işi bu yüzden **durmaz**.
- **Müşteri yeni görünümü beğenmezse:** `29-GORSEL-SISTEM.md` §12 — katman geri alınır, klasik
  görünüm etkilenmez.
- **Müşteri varsayılan olmasını istemezse:** `DEFAULT_UI_MODE` klasik kalır; yeni görünüm seçenek
  olarak durur (2 hafta kuralı işlemez).
- **Onay verilmezse:** `docs/TERIMLER.md` terim değişiklikleri yalnız panelde kalır (sunucu/mobil
  için §10 adım 2-3 bekletilir).
- **Ayna açıkken:** ölçüm yine yapılabilir (okuma serbest), yalnız kayıt düğmeleri kapalıdır.

## 6. Metinler ve terimler

Kabul testi adımları **ekran metinleriyle** yazılır; bu yüzden terim onayı testten **önce**
tamamlanmalı (`32-TERMINOLOJI.md`). Test kâğıdı müşteriye Türkçe verilir; teknik sözcük yok.
Örnek cümle: "Şimdi yarın için yeni bir sevkiyat girin. Ben hiçbir şey söylemeyeceğim."

## 7. Telefon davranışı (390×844)

Kabul testinin 3 işi telefonda da denenir (sevkiyat görüntüleme, durum ilerletme, tahsilat görme).
Kabul: yatay kaydırma yok, düğmeler parmakla basılabilir (≥44px). Telefon testi müşterinin kendi
telefonunda yapılır; kayıt alınıyorsa ondan izin istenir.

## 8. Erişilebilirlik ve klavye

Kabul testinde klavye kullanan kullanıcı varsa (`Tab`, `Enter`, `Esc`, `N`, `Ctrl+K`) bu yollar da
denenir: `N` + Yeni menüsü (`Layout.tsx:123-138`), `Ctrl+K` genel arama.

## 9. Testler (e2e + birim)

- Teknik kabul testi (otomatik) `31-TEST-CI.md` §10'da tanımlı; K0/kabul testi onun **insan**
  karşılığıdır.
- Kabul testi sonucu, e2e sonuçlarıyla birlikte `docs/KOLAYLASTIRMA-PLANI.md` "Durum" tablosuna
  işlenir (müşteri adı/verisi yazılmaz).

## 10. Uygulama adımları

1. **Taslak dosya (1 saat).** `docs/KOLAYLASTIRMA-DINLEME.md` boş tablo ve soru listesiyle açılır.
2. **Görüşme (30 dk, müşteriyle).** §3 akışı.
3. **Ölçüm doldurma (2 saat).** §4 tablosu; klasik ve yeni görünüm ayrı ölçülür.
4. **Öncelik güncellemesi (1 saat).** Çıkan sıraya göre `KOLAYLASTIRMA-SIRADAKI-ISLER.md` §4
   sırası ve `docs/plan` uygulama sırası güncellenir.
5. **Görsel onay (yarım gün, müşteri).** P0.2 ekran görüntüleri; seçim `docs/TASARIM-OTOYOL.md`.
6. **Kabul testi (1 saat, müşteriyle).** §11; süre ve takılma notları.
7. **Sonuç kaydı (30 dk).** Durum tablosu + `docs/GELISTIRME-PLANI.md`.

Toplam ≈ **1,5 gün** (müşteriyle 2 oturum).

## 11. Kabul testi (müşteriyle, uygulama sonunda)

Müşteriye yardım edilmeden, sırayla yaptırılır; süre ve takıldığı yer not edilir
(`docs/KOLAYLASTIRMA-UYGULAMA.md:438-452`):

1. Yarın için yeni bir sevkiyat girin.
2. Bugünkü sevkiyatları açın.
3. Bir sevkiyatı "Yüklendi" yapın.
4. Plakaya göre bir sevkiyat bulun.
5. Teslim edilmiş sevkiyatların faturasını kesin.
6. Bir müşterinin ekstresini açın.
7. Bir müşteriden tahsilat girin.
8. Bir tedarikçiye ödeme girin.
9. Mazot girin.
10. Bu ayın kazancına bakın.

**Başarı:** en az **9/10** yardımsız; hiçbiri pratikortam'dakinden uzun değil. Sonuç
`docs/KOLAYLASTIRMA-PLANI.md` "Durum" bölümüne, müşteri adı ve verisi olmadan yazılır.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Müşteri görüşmeye zaman ayırmaz | Kod işi durmaz; K0 sonradan yapılır, öncelik geçici kalır |
| Ölçüm öznelleşir (yardım sayılır, tarayıcı farklı) | Aynı boyut/rol, sayaç kuralı, iki kişi ölçer |
| pratikortam'da yanlışlıkla yazma | Yalnız okuma; kaydet/sil düğmelerine basılmaz; müşteri giriş yapar |
| Görüşmede kişisel veri kaydedilir | Not şablonunda veri alanı yok; kayıt müşteride kalır |
| Kabul testi "kısmen" geçer | Kalan 1-2 iş için ayrı iyileştirme işi açılır (`KOLAYLASTIRMA-SIRADAKI-ISLER.md`) |

## 13. Doğrulanacaklar

- Görüşme için uygun gün/saat ve müşterinin ekran kaydı izni.
- Kabul testinin canlı panelde mi, demo verisiyle mi yapılacağı (canlıda gerçek kayıt açmamak için
  demo tercih edilir; karar kullanıcıda).
- Telefon testi için müşterinin hangi telefonu kullanacağı.
- Sonuçların müşteriyle paylaşılacak biçimi (tek sayfa özet).

Sonraki belgeyle bağlantı: `34-RISK-GUVENLIK.md` geçiş ve geri dönüş planını, `31-TEST-CI.md`
otomatik doğrulamayı, `32-TERMINOLOJI.md` testte kullanılacak metinleri tanımlar.
