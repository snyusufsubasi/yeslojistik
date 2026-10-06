# 01 — Ortak Şartname (Luca benzeri ERP planı)

Bu dosya `docs/plan-erp/` altındaki **bütün** dokümanların uyacağı sözleşmedir. Bir doküman burada
yazılan başlık şablonunu kullanmıyorsa eksiktir.

Kaynak: <https://luca.com.tr/> ve ürün sayfaları (bkz. `02-LUCA-ENVANTERI.md`). Bu plan **mevcut YES Lojistik
kod tabanını** (React 19 + Vite panel, .NET 10 API, PostgreSQL 16, Expo şoför uygulaması, CI + Render)
genişletir; sıfırdan yeni bir depo açmaz. Gerekçe ve alternatif: `03-KAPSAM-VE-KONUMLANDIRMA.md`.

## 1. Yazım kuralları (bozulmaz)

1. **Uydurma yok.** Dış dünyaya ait bilgi (Luca'nın ekranı, entegratör API'si, mevzuat kodu, banka
   servisi, fiyat) doğrulanmadıysa `**doğrulanacak:**` etiketiyle yazılır ve neyin doğrulanacağı
   (kimden/belgeden) belirtilir. Mevzuat yorumu yazılmaz; "mali müşavir/avukat onayı gerekir" denir.
2. **Bugünü kanıtla.** "Bizde bugün" bölümündeki her iddia `dosya:satır` referansı taşır. Referanssız
   iddia yazılmaz. Referans biçimi: `client/src/pages/TripsPage.tsx:417` (ters bölü yok, boşluk yok).
3. **Klasik görünüm korunur.** Panelde `DEFAULT_UI_MODE = 'classic'`; yeni ekranlar "Yeni görünüm"
   anahtarının arkasında gelişir (`client/src/lib/uiMode.ts:8`). Mevcut ekranların davranışı
   bozulmaz; yeni modül ekranları iki görünümde de çalışır.
4. **Veri girişi güvenliği.** pratikortam.com **salt okunur**; oraya hiçbir şey yazılmaz. Canlı veriye
   yazan iş kullanıcı onayı + yedek ister. Şifre/token/anahtar hiçbir dosyaya yazılmaz.
5. **Migration yalnız ekleme** yapar (yeni boş olabilen sütun/tablo). Veri silen/dönüştüren migration
   yazılmaz. Mevcut yaşayan veritabanı açılışta migrate edilir.
6. **Test silinmez/atlanmaz.** Her iş kalemi için en az bir otomatik test (sunucu: `dotnet test`,
   panel: Playwright `client/e2e/`) ve bir kabul kriteri yazılır.
7. **Dil.** Sade Türkçe, kısa cümle, kod yazmayan kullanıcı için anlaşılır. Terimler
   `docs/TERIMLER.md` onayına bağlıdır ("Sefer" → "Sevkiyat" gibi değişiklikler onaysız yapılmaz).
8. **Kelime alt sınırı:** her modül dokümanı en az **1.200 kelime** (tablolar ve kod blokları hariç
   değil, toplam). Şablonun 12 başlığı da dolu olur; "yok" yazmak serbest ama başlık atlanmaz.

## 2. Başlık şablonu (her modül dokümanı)

```
# NN — <Modül adı>
## 1. Amaç ve kapsam            (bu modül neyi çözer, neyi çözmez)
## 2. Luca'daki karşılığı        (hangi Luca ürünü/menüsü; kaynak URL; doğrulanacaklar)
## 3. Bizde bugün                (dosya:satır kanıtlı mevcut durum; eksik listesi)
## 4. Hedef ekranlar ve alanlar  (ekran ekran: liste, form, detay; alan adları ve tipleri)
## 5. İş kuralları               (hesap, yuvarlama, KDV/tevkifat, durum geçişleri, doğrulamalar)
## 6. Veri modeli                (tablo/alan/ilişki; ekleme mi, yeni tablo mu)
## 7. API uçları                 (metot, yol, istek/yanıt alanları, yetki)
## 8. Yetki, onay ve denetim izi  (rol matrisi, maker-checker, log)
## 9. Kabul kriterleri           (ölçülebilir, test edilebilir maddeler)
## 10. Testler                   (birim/entegrasyon/e2e; dosya adları)
## 11. Efor ve bağımlılıklar      (kişi-gün; hangi doküman/modül önce bitmeli)
## 12. Riskler ve doğrulanacaklar (risk + azaltma; doğrulanacak dış bilgiler)
```

## 3. Ortak görsel ve ölçü sözleşmesi

Mevcut kolaylaştırma planının sözleşmesi geçerlidir: `docs/plan/01-ORTAK-SARTNAME.md` (görsel jetonlar,
z-sırası: başlık 30 · menü 40 · süzgeç 45 · çekmece 50 · pencere 60, telefonda tam ekran süzgeç,
44px dokunma hedefi, `PageShell`/`DetailDrawer`/`DataTable`/`MobileCards` ortak parçaları).
ERP ekranları bu parçaları **yeniden kullanır**; yeni bir görsel dil icat edilmez.

Liste ekranı standardı: `FilterBar` + `DataTable` (masaüstü) / `MobileCards` (telefon) + sayfalama +
`Empty`/`ErrorState`/`TableSkeleton`. Form standardı: `Modal` (kaydetmeden kapatma koruması, Ctrl+Enter)
veya tam sayfa form; toplamlar `SumStrip`/`Figures`. Para 2 kuruş (`tl`/`tl2`), tarih `03.10.2026`,
plaka büyük harf boşluklu.

## 4. Doğrulama

- Referans denetimi: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp`
  → kırık `dosya:satır` referansı **0**, mojibake/BOM **0** olmalı.
- Dizin tablosu: aynı araca `-UpdateIndex` verilerek `00-DIZIN.md` yenilenir.
- Kod artımları: `client` lint + build yeşil, sunucu `dotnet test` yeşil, e2e CI'da yeşil
  (yerelde .NET 10 SDK ve PostgreSQL yok — sunucu/e2e yalnız CI'da koşar).

## 5. Kaynaklar

- Luca ana sayfa: <https://luca.com.tr/>
- Luca Net (KOBİ): <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6>
- Luca Koza (kurumsal): <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7>
- Luca Net One: <https://www.lucanetone.com.tr> · Luca Rota: <https://www.luca.com.tr/Urun/Index/luca-rota-yazilimi/18>
- Fiyat sayfası: <https://www.luca.com.tr/Sayfa/fiyat/57> (içerik güvenli dönüştürülemedi → **doğrulanacak**)
