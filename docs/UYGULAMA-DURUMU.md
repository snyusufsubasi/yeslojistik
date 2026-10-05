# Uygulama durumu — 5 Ekim 2026

Başlangıç commit'i: `41cc8898350715d454d7c4c1205ff51d0e576197`.
Yeni kapsam: `TAM-GELISTIRME-PLANI.md`.

## İlk paket: aktarım ve fatura korumaları

**Durum: ilk paket tamamlandı; test dalında bütün GitHub Actions kontrolleri geçti. Ana dala alınan kod bu test edilmiş pakettir.**

Test edilen kod commit’i: `e7e3d5c32d1f08bebf0586dd18e98ca3b063d0b3`.
CI kanıtı: https://github.com/snyusufsubasi/yeslojistik/actions/runs/37297230879 (5 Ekim 2026, başarılı). Sonraki kapanış commit’i yalnız bu plan/durum belgelerini günceller; kod ve testler aynıdır.

- Eksik/başarısız dışa aktarım tamamlanmış veri gibi kabul edilmiyor. Özet, gerekli dosyalar, boyutlar, yeni özetlerde SHA-256 ve dönüşümün okuyacağı tablo başlığı doğrulanıyor. Hatalı veriyle `ayna.json` üretilmiyor.
- Aynanın toplu silme koruması 10'dan az kaydı olan grupları da kapsıyor. Yarıdan fazlasının kaldırılması açık override yoksa reddediliyor. Mevcut override davranışı korunuyor.
- Farklı satış KDV oranına sahip sevkiyatlar aynı faturaya alınamıyor. Tek sevkiyatın açıkça farklı oranla faturalanabildiği mevcut istisna davranışı korunuyor.
- Yeni aktarım testleri ayrı bir CI işine eklendi.

## Doğrulananlar

| Kontrol | Sonuç |
|---|---|
| Git çalışma kopyası | 626 dosya, blob/tree ve gerçek commit SHA doğrulandı |
| Python aktarım/Türkçe testleri | 16 geçti |
| Node dışa aktarım testleri | 3 geçti |
| Panel lint/build | Geçti; mevcut 2 lint uyarısı |
| Mobil typecheck ve Android derlemesi | GitHub Actions’ta geçti |
| Diff boşluk kontrolü | Geçti |
| Sunucu testleri (yeni C# testleri dahil) | 311 geçti, 0 başarısız, 0 atlanan |
| Tarayıcı testleri | 47 geçti |
| Eski panel robotunun güvenlik testleri | 3 geçti |
| EF modeli/migration uyumu | Değişiklik yok; geçti |

## Ortam engeli

Bu ortamın kullanıcı kimliği/namespace kısıtları PostgreSQL kurulumunu ve normal ayrı kullanıcıyla çalıştırmayı engelledi. .NET SDK kurulmuştu; NuGet restore ilk paralel denemede başarısız oldu, tek işlemli deneme başlatıldı fakat tamamlanma kanıtı alınamadı. Ara verilen sürede ortam bakımı geçici SDK ve kurulum günlüklerini kaldırdı; kaynak dosyalar ve hazırlanan değişiklikler korunuyor.

Yerelde tam test tamamlanmadığı için `AGENTS.md` kuralına uygun olarak main'e gönderilmedi. Kullanıcı 5 Ekim'de devam edilmesini istedi; hazır paket `codex/first-safety-tests` dalında gerçek PostgreSQL 16 ve gerekli araçlarla doğrulandı. CI'a EF modeli/migration uyumu kontrolü de eklendi. Yerel ortam engeli GitHub Actions kullanılarak aşıldı.

## Kalan işler

- Tam geçmiş aktarımı için önce kaynak şeması envanteri ve kayıt/bakiye mutabakat raporu hazırlanacak.
- F0 ekran incelemesi, F1 yedek/geri yükleme ve ücretli veritabanı kararı ayrıca tamamlanacak; ilk paketin geçmesi bu aşamaları bitmiş saymaz.
- Tam geçmiş aktarımı henüz yapılmadı. Kaynak fatura/tahsilat/ödeme/banka şemaları salt okuma ile doğrulanmalı.
- Mevcut ayna servisinin tahsilat/tedarikçi ödemelerini topluca temizleyen eski davranışı finansal geçmiş eklenmeden önce kaynak kimliğine bağlı hâle getirilmeli.
- Yapısal olarak geçerli ama satırları eksik bir kaynak tablo, mevcut kaynak metaverisiyle bütünüyle kanıtlanamaz; kayıt sayısı/sayfalama denetimi sonraki aktarım işidir.
- Portal, teklifler, ücretli altyapı ve dış entegrasyonlar bu ilk pakette uygulanmadı.

Pratikortam'a erişilmedi. Canlı veri, ayna ayarı, ödeme ve resmî gönderim işlemi yapılmadı.
