# 00 — Dizin: Luca Benzeri ERP Geliştirme Planı

Bu klasör, YES Lojistik panelini **Luca sınıfı bir ERP'ye** genişletmek için uçtan uca geliştirme
planıdır. Referans: <https://luca.com.tr/> (envanter: `02-LUCA-ENVANTERI.md`). Kod tabanı: mevcut
depo (React 19 + Vite panel, .NET 10 API, PostgreSQL 16, Expo şoför uygulaması, GitHub Actions + Render).

**Okuma sırası:** `01-ORTAK-SARTNAME.md` (kurallar ve şablon) → `02-LUCA-ENVANTERI.md` (referans) →
`03-KAPSAM-VE-KONUMLANDIRMA.md` (ne yapıyoruz, ne yapmıyoruz) → `04-HEDEF-MIMARI.md` →
`05-VERI-MODELI.md` → `06-MUHASEBE-MOTORU.md` → modül dokümanları → `39-YOL-HARITASI-EFOR.md`.

**Nasıl kullanılır:** Her modül dokümanı kendi başına uygulanabilir bir iş paketidir (ekranlar + alanlar +
iş kuralları + veri modeli + API + testler + kabul kriterleri + efor). Kod yazmaya başlamadan önce
`01-ORTAK-SARTNAME.md` §1'deki yedi kural okunur. Uygulama sırası `39-YOL-HARITASI-EFOR.md`'deki fazlardır.

## Doküman listesi

| # | Dosya | Konu | Durum |
|---|---|---|---|
| 01 | `01-ORTAK-SARTNAME.md` | Şablon, kurallar, ölçü sözleşmesi, doğrulama | yazıldı |
| 02 | `02-LUCA-ENVANTERI.md` | Luca ürün/modül/özellik envanteri + kaynaklar | yazıldı |
| 03 | `03-KAPSAM-VE-KONUMLANDIRMA.md` | Kapsam, paketler, kime satılıyor, kapsam dışı | yazıldı |
| 04 | `04-HEDEF-MIMARI.md` | Katmanlar, çok şirketli yapı, olaylar, işler | yazıldı |
| 05 | `05-VERI-MODELI.md` | Çekirdek tablolar, ilişkiler, migration | yazıldı |
| 06 | `06-MUHASEBE-MOTORU.md` | Hesap planı, yevmiye, KDV/tevkifat, mizan, e-Defter | yazıldı |
| 07 | `07-YETKI-ONAY-NUMARALANDIRMA.md` | Rol matrisi, onay akışları, seri/numara, denetim izi | yazıldı |
| 08 | `08-E-BELGE-KATMANI.md` | e-Fatura/e-Arşiv/e-İrsaliye/e-SMM/e-Defter, entegratör | yazıldı |
| 09 | `09-CARI-YONETIMI.md` | Cari kart, hareket, mahsup, yaşlandırma, mutabakat | yazıldı |
| 10 | `10-STOK-VE-DEPO.md` | Stok kartı, çok depo, hareket, maliyet, sayım | yazıldı |
| 11 | `11-SATIS-FATURA.md` | Satış faturası, tipler, iade, iptal, akış | yazıldı |
| 12 | `12-SATIN-ALMA.md` | Talep→sipariş→mal kabul→fatura→ödeme | yazıldı |
| 13 | `13-SIPARIS-TEKLIF.md` | Teklif, sipariş, irsaliye, lojistik bağlantısı | yazıldı |
| 14 | `14-KASA.md` | Kasa tanımları, hareketler, gün sonu, virman | yazıldı |
| 15 | `15-BANKA-ENTEGRASYON.md` | Hesaplar, ekstre, eşleştirme, mutabakat | yazıldı |
| 16 | `16-CEK-SENET.md` | Portföy, vade, ciro, karşılıksız, muhasebe | yazıldı |
| 17 | `17-GIDER-GELIR-MERKEZLERI.md` | Tür/merkez, dağıtım, tekrarlayan, bütçe | yazıldı |
| 18 | `18-PERSONEL.md` | Personel, avans, puantaj sınırı, şoför bağlantısı | yazıldı |
| 19 | `19-SABIT-KIYMET.md` | Kıymet kartı, amortisman, çıkış, filo bağlantısı | yazıldı |
| 20 | `20-URETIM-RECETE.md` | Reçete, üretim emri, maliyet, akış diyagramı | yazıldı |
| 21 | `21-SAYIM-BARKOD.md` | Barkod/QR, terminal ve telefonla sayım, fark | yazıldı |
| 22 | `22-ITHALAT-IHRACAT-DOVIZ.md` | Döviz/kur farkı, ithalat dosyası, ihracat | yazıldı |
| 23 | `23-RAPORLAMA-BI.md` | Rapor envanteri, ortak rapor altyapısı | yazıldı |
| 24 | `24-RAPOR-TASARIMCISI.md` | Kullanıcı tanımlı rapor tasarımcısı | yazıldı |
| 25 | `25-CRM-TEKLIF-TAKIP.md` | Aday/müşteri, aktivite, teklif hunisi | yazıldı |
| 26 | `26-DOKUMAN-YONETIMI.md` | Belge arşivi, tarayıcı/kamera, OCR sınırı | yazıldı |
| 27 | `27-ENTEGRASYONLAR.md` | Ortak çerçeve + entegrasyon envanteri | yazıldı |
| 28 | `28-MUHASEBECI-PAKETI.md` | Mali müşavir ile entegre çalışma, aktarım | yazıldı |
| 29 | `29-MOBIL-VE-DISA-ACILIM.md` | Şoför/yönetici mobil, müşteri-tedarikçi portalı, API | yazıldı |
| 30 | `30-COK-SIRKETLI-KONSOLIDASYON.md` | Çok firma izolasyonu, konsolide raporlar | yazıldı |
| 31 | `31-AYARLAR-SIRKET-KURULUMU.md` | Şirket/mali yıl/seri/varsayılanlar, kurulum sihirbazı | yazıldı |
| 32 | `32-VERI-GOCU-EXCEL-AKTARIM.md` | Excel/CSV aktarımı, geçiş senaryoları | yazıldı |
| 33 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` | Olay→şablon→kanal, gönderim günlüğü | yazıldı |
| 34 | `34-LISANS-ABONELIK-KONTOR.md` | Paket/modül lisansı, kontör, abonelik | yazıldı |
| 35 | `35-DENETIM-IZI-KVKK-UYUM.md` | Denetim izi, saklama/imha, KVKK akışları | yazıldı |
| 36 | `36-PERFORMANS-OLCEK.md` | Hedefler, indeks, önbellek, RPO/RTO, izleme | yazıldı |
| 37 | `37-TEST-CI-GENISLETME.md` | Altın senaryolar, izolasyon testleri, CI işleri | yazıldı |
| 38 | `38-GUVENLIK.md` | Kimlik, API, dosya, sır yönetimi, olay müdahale | yazıldı |
| 39 | `39-YOL-HARITASI-EFOR.md` | Fazlar, efor, takvim, kilometre taşları | yazıldı |
| 40 | `40-UAT-KABUL-CANLIYA-GECIS.md` | UAT senaryoları, pilot, geçiş, rollback | yazıldı |
| 41 | `41-RISKLER-VE-VARSAYIMLAR.md` | Risk kaydı, varsayımlar, karar bekleyenler | yazıldı |

## Doğrulama

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp -UpdateIndex
```

Ölçülen (6 Ekim 2026): **42 belge · ~175.000 kelime · 2.474 dosya:satır referansı · kırık 0 · mojibake/BOM 0**;
her dokümanda şartnamenin 12 başlığı var, en kısa doküman 1.200 kelimenin üstünde.

## Bu plan neyi değiştirmez

- `docs/plan/` (kolaylaştırma planı: yeni görünüm, PageShell/DetailDrawer, F1-F6) **geçerlidir** ve bu
  planın görsel/ölçü temelidir.
- pratikortam aynası, lisans/sahip modu, mevcut canlı panel ve CI düzeni korunur; hiçbiri bu plan
  yüzünden bozulmaz.
- Terim değişiklikleri (`docs/TERIMLER.md`) kullanıcı onayına bağlıdır.
