# Uygulama durumu — 5 Ekim 2026

Başlangıç commit'i: `41cc8898350715d454d7c4c1205ff51d0e576197`.
Yeni kapsam: `TAM-GELISTIRME-PLANI.md`.

## İlk paket: aktarım ve fatura korumaları

**Durum: ilk paket hazır; kullanıcı devam onayıyla test dalında GitHub Actions doğrulamasına gönderiliyor. Ana dala yayın yalnız bütün kontroller geçtikten sonra yapılacak.**

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
| Mobil typecheck | Geçti |
| Diff boşluk kontrolü | Geçti |
| Yeni C# entegrasyon testleri | Eklendi; çalıştırılmadı |
| Tam sunucu / e2e / EF uyumu | Tamamlanmadı; geçmiş CI sonucu yeni değişikliklerin testi sayılmaz |

## Ortam engeli

Bu ortamın kullanıcı kimliği/namespace kısıtları PostgreSQL kurulumunu ve normal ayrı kullanıcıyla çalıştırmayı engelledi. .NET SDK kurulmuştu; NuGet restore ilk paralel denemede başarısız oldu, tek işlemli deneme başlatıldı fakat tamamlanma kanıtı alınamadı. Ara verilen sürede ortam bakımı geçici SDK ve kurulum günlüklerini kaldırdı; kaynak dosyalar ve hazırlanan değişiklikler korunuyor.

Yerelde tam test tamamlanmadığı için `AGENTS.md` kuralına uygun olarak main'e gönderilmedi. Kullanıcı 5 Ekim'de devam edilmesini istedi; hazır paket geçici test dalında GitHub Actions ile doğrulanacak. CI'a EF modeli/migration uyumu kontrolü de eklendi. Test dalı izni main'e test edilmemiş kod gönderme izni değildir.

## Kalan işler

- Yeni C# testlerini derle/çalıştır; ardından tam sunucu, e2e ve model uyumu kontrolü.
- Başarılı testlerden sonra güncel main ile karşılaştırma, commit/push ve canlı SHA kontrolü.
- Tam geçmiş aktarımı henüz yapılmadı. Kaynak fatura/tahsilat/ödeme/banka şemaları salt okuma ile doğrulanmalı.
- Mevcut ayna servisinin tahsilat/tedarikçi ödemelerini topluca temizleyen eski davranışı finansal geçmiş eklenmeden önce kaynak kimliğine bağlı hâle getirilmeli.
- Yapısal olarak geçerli ama satırları eksik bir kaynak tablo, mevcut kaynak metaverisiyle bütünüyle kanıtlanamaz; kayıt sayısı/sayfalama denetimi sonraki aktarım işidir.
- Portal, teklifler, ücretli altyapı ve dış entegrasyonlar bu ilk pakette uygulanmadı.

Pratikortam'a erişilmedi. Canlı veri, ayna ayarı, ödeme ve resmî gönderim işlemi yapılmadı.
