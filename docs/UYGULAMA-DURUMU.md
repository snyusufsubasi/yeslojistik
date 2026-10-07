# Uygulama durumu — 7 Ekim 2026: "Hark tarzı" görünüm + akıllı alanlar

Dal: `hark/redesign-1` → PR ile `main`'e (squash). Kullanıcı onayı: "uygula, hepsini canlıya al" (7 Ekim).

## Ne değişti
0. **CI kırmızıydı (yalnız e2e):** `e2e/new-ui/basics.spec.ts` menü listesini "Mazotlar" ve "Araç Masrafları" eklenmeden önceki hâliyle bekliyordu (6 Ekim "V2: complete Pratikortam navigation"). Beklenen liste güncellendi; uygulama kodu doğruydu.
1. **Tasarım "Otoyol" → "Hark tarzı"** (`TASARIM-HARK.md`): `index.css` jetonları (sıcak nötr griler, tek vurgu rengi çivit `#4652c9`, yumuşak gölgeler, 16/12/10px köşeler, 160ms geçişler), her yerde Inter (Source Serif 4 ve Overpass Mono kaldırıldı; rakamlar `tabular-nums`), beyaz sol menü + hap şeklinde seçili satır, yarı saydam üst çubuk, yuvarlak durum etiketleri/çipler, yeni bildirim (toast) ve boş liste görünümü, BÜYÜK HARF başlıklar sade başlığa döndü. Aa yazı boyutu ve klavye kısayolları aynen duruyor.
2. **Akıllı alan** (`components/SmartField.tsx`, `lib/sectorOptions.ts`, `GET /api/options/{alan}`): en sık 5-6 seçenek çip, aranabilir tam liste (bu kayıt için önerilen → sık kullandıklarınız (kaç kez) → sektörde yaygın), "Diğer…" ile serbest yazı aynen kaydedilir. Yeni tablo/migration yok; sayım mevcut kayıtlardan.
   - Uygulandığı alanlar: Sevkiyat → Yük Cinsi, Birim, Ödeme Şekli; Araç → Araç Tipi, Taşıma Kapasitesi, Yakıt Türü; Gider → Gider Adı, Kategori (kendi listeniz), Yakıt Türü; Sabit Ödeme → Başlık; Masraf reddetme gerekçesi.
   - Panelde "taşıma şekli", "dorse/kasa tipi" ve "iptal/sorun nedeni" alanı yok (eklemek ek sütun ister); sektör listeleri hazır bekliyor.
3. **Küçük kolaylıklar:** boş listelerde simgeli açıklama; bildirimler tek tip (beyaz kart, yeşil/kırmızı ikon); yazdıktan sonraki ilk Enter yazılanı onaylar, formu göndermez.

## Yerel test kanıtı (7 Ekim)
| Kontrol | Sonuç |
|---|---|
| Sunucu testleri (yeni `OptionsTests` dahil) | 313 geçti, 0 başarısız |
| EF modeli/migration uyumu | Değişiklik yok |
| Panel lint / build | 0 hata (8 eski uyarı) / geçti |
| Şoför uygulaması typecheck | Geçti |
| Tarayıcı (e2e) testleri, boş veritabanıyla | 62 geçti, 0 başarısız (yeni `smart-field.spec.ts` dahil) |
| Aktarım (Python) / dışa aktarım (Node) testleri | 16 / 3 geçti |

# Uygulama durumu — 5 Ekim 2026

Başlangıç commit'i: `41cc8898350715d454d7c4c1205ff51d0e576197`.
Yeni kapsam: `TAM-GELISTIRME-PLANI.md`.

## İlk paket: aktarım ve fatura korumaları

**Durum: ilk paket tamamlandı; test dalında bütün GitHub Actions kontrolleri geçti. Ana dala alınan kod bu test edilmiş pakettir.**

Test edilen uygulama kodu commit’i: `e7e3d5c32d1f08bebf0586dd18e98ca3b063d0b3`.
CI kanıtı: https://github.com/snyusufsubasi/yeslojistik/actions/runs/37297230879 (5 Ekim 2026, başarılı). Sonraki kapanış commit’i yalnız plan/durum belgelerini günceller; uygulama kodu ve testler aynıdır.

Canlı kontrolünde ayrıca bir eksik bulundu: `BACKUP_URL` yokken `smoke.yml` kontrolü atlıyor ve yeşil dönüyordu. Adres artık sırasıyla `APP_URL` repository variable, `BACKUP_URL` secret veya projenin bilinen Render adresinden alınır. Böylece yapılandırılmamış yedek adresi canlı kontrolünü atlatmaz. `37298458660` çalışması kontrolü atladığı için canlı yayın kanıtı değildir. Canlı commit/sağlık doğrulaması yeni smoke çalışmasının sonucuna bağlıdır.

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
