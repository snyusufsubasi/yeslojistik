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
| 03 | `03-KAPSAM-VE-KONUMLANDIRMA.md` | Kapsam, paketler, kime satılıyor, kapsam dışı | yazılıyor |
| 04 | `04-HEDEF-MIMARI.md` | Katmanlar, çok şirketli yapı, olaylar, işler | yazılıyor |
| 05 | `05-VERI-MODELI.md` | Çekirdek tablolar, ilişkiler, migration | yazılıyor |
| 06 | `06-MUHASEBE-MOTORU.md` | Hesap planı, yevmiye, KDV/tevkifat, mizan, e-Defter | yazılıyor |
| 07 | `07-YETKI-ONAY-NUMARALANDIRMA.md` | Rol matrisi, onay akışları, seri/numara, denetim izi | yazılıyor |
| 08 | `08-E-BELGE-KATMANI.md` | e-Fatura/e-Arşiv/e-İrsaliye/e-SMM/e-Defter, entegratör | yazılıyor |
| 09 | `09-CARI-YONETIMI.md` | Cari kart, hareket, mahsup, yaşlandırma, mutabakat | yazılıyor |
| 10 | `10-STOK-VE-DEPO.md` | Stok kartı, çok depo, hareket, maliyet, sayım | yazılıyor |
| 11 | `11-SATIS-FATURA.md` | Satış faturası, tipler, iade, iptal, akış | yazılıyor |
| 12 | `12-SATIN-ALMA.md` | Talep→sipariş→mal kabul→fatura→ödeme | yazılıyor |
| 13 | `13-SIPARIS-TEKLIF.md` | Teklif, sipariş, irsaliye, lojistik bağlantısı | yazılıyor |
| 14 | `14-KASA.md` | Kasa tanımları, hareketler, gün sonu, virman | yazılıyor |
| 15 | `15-BANKA-ENTEGRASYON.md` | Hesaplar, ekstre, eşleştirme, mutabakat | yazılıyor |
| 16 | `16-CEK-SENET.md` | Portföy, vade, ciro, karşılıksız, muhasebe | yazılıyor |
| 17 | `17-GIDER-GELIR-MERKEZLERI.md` | Tür/merkez, dağıtım, tekrarlayan, bütçe | yazılıyor |
| 18 | `18-PERSONEL.md` | Personel, avans, puantaj sınırı, şoför bağlantısı | yazılıyor |
| 19 | `19-SABIT-KIYMET.md` | Kıymet kartı, amortisman, çıkış, filo bağlantısı | yazılıyor |
| 20 | `20-URETIM-RECETE.md` | Reçete, üretim emri, maliyet, akış diyagramı | yazılıyor |
| 21 | `21-SAYIM-BARKOD.md` | Barkod/QR, terminal ve telefonla sayım, fark | yazılıyor |
| 22 | `22-ITHALAT-IHRACAT-DOVIZ.md` | Döviz/kur farkı, ithalat dosyası, ihracat | yazılıyor |
| 23 | `23-RAPORLAMA-BI.md` | Rapor envanteri, ortak rapor altyapısı | kuyrukta |
| 24 | `24-RAPOR-TASARIMCISI.md` | Kullanıcı tanımlı rapor tasarımcısı | kuyrukta |
| 25 | `25-CRM-TEKLIF-TAKIP.md` | Aday/müşteri, aktivite, teklif hunisi | kuyrukta |
| 26 | `26-DOKUMAN-YONETIMI.md` | Belge arşivi, tarayıcı/kamera, OCR sınırı | kuyrukta |
| 27 | `27-ENTEGRASYONLAR.md` | Ortak çerçeve + entegrasyon envanteri | kuyrukta |
| 28 | `28-MUHASEBECI-PAKETI.md` | Mali müşavir ile entegre çalışma, aktarım | kuyrukta |
| 29 | `29-MOBIL-VE-DISA-ACILIM.md` | Şoför/yönetici mobil, müşteri-tedarikçi portalı, API | kuyrukta |
| 30 | `30-COK-SIRKETLI-KONSOLIDASYON.md` | Çok firma izolasyonu, konsolide raporlar | kuyrukta |
| 31 | `31-AYARLAR-SIRKET-KURULUMU.md` | Şirket/mali yıl/seri/varsayılanlar, kurulum sihirbazı | kuyrukta |
| 32 | `32-VERI-GOCU-EXCEL-AKTARIM.md` | Excel/CSV aktarımı, geçiş senaryoları | kuyrukta |
| 33 | `33-BILDIRIM-EPOSTA-SMS-KEP.md` | Olay→şablon→kanal, gönderim günlüğü | kuyrukta |
| 34 | `34-LISANS-ABONELIK-KONTOR.md` | Paket/modül lisansı, kontör, abonelik | kuyrukta |
| 35 | `35-DENETIM-IZI-KVKK-UYUM.md` | Denetim izi, saklama/imha, KVKK akışları | kuyrukta |
| 36 | `36-PERFORMANS-OLCEK.md` | Hedefler, indeks, önbellek, RPO/RTO, izleme | kuyrukta |
| 37 | `37-TEST-CI-GENISLETME.md` | Altın senaryolar, izolasyon testleri, CI işleri | kuyrukta |
| 38 | `38-GUVENLIK.md` | Kimlik, API, dosya, sır yönetimi, olay müdahale | kuyrukta |
| 39 | `39-YOL-HARITASI-EFOR.md` | Fazlar, efor, takvim, kilometre taşları | kuyrukta |
| 40 | `40-UAT-KABUL-CANLIYA-GECIS.md` | UAT senaryoları, pilot, geçiş, rollback | kuyrukta |
| 41 | `41-RISKLER-VE-VARSAYIMLAR.md` | Risk kaydı, varsayımlar, karar bekleyenler | kuyrukta |

## Doğrulama

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp
powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Docs docs/plan-erp -UpdateIndex
```

Beklenen: kırık `dosya:satır` referansı **0**, mojibake/BOM **0**, her dokümanda 12 başlık, her modül
dokümanı en az 1.200 kelime.

## Bu plan neyi değiştirmez

- `docs/plan/` (kolaylaştırma planı: yeni görünüm, PageShell/DetailDrawer, F1-F6) **geçerlidir** ve bu
  planın görsel/ölçü temelidir.
- pratikortam aynası, lisans/sahip modu, mevcut canlı panel ve CI düzeni korunur; hiçbiri bu plan
  yüzünden bozulmaz.
- Terim değişiklikleri (`docs/TERIMLER.md`) kullanıcı onayına bağlıdır.
