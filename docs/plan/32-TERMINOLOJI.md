# 32 — Terim sözlüğü ve ekran metinleri

## 1. Amaç ve kapsam

Müşterinin paneli "tanıdık" bulması, büyük ölçüde **aynı şeylere aynı adı** vermekle olur. Bu belge
tek bir sözlük kurar: hangi kavram ekranda nasıl yazılır, hangi eski ad bırakılır, hangi düğme
hangi kalıpla yazılır. Kapsam: terim listesi, düğme metin kalıpları, teknik sözcüklerin sade
karşılıkları, "Sefer" kalıntılarının envanteri ve temizleme planı. Kapsam dışı: ekran yerleşimleri
(02–27), kod içi alan/rota adları (değişmez).

## 2. Bugünkü durum (ölçümle)

- **Panelde (kullanıcıya görünen metin) "Sefer" temizlendi:** F1.5 kapsamında bütün panel yazıları
  "Sevkiyat" oldu (commit `c20bfeb`, "UI text: Sefer -> Sevkiyat everywhere in the web panel
  (routes and code names unchanged)").
- **Ama kalan var:** `client/src` içinde hâlâ **78** "Sefer" eşleşmesi bulunuyor; bunlar ağırlıklı
  olarak `client/src/api/types.ts` gibi **tip/alan adları** ve kod içi tanımlayıcılar (ör.
  `types.ts:278,288,306,308,321`). Kullanıcıya görünür metin olup olmadıkları adım 1'de tek tek
  ayıklanır.
- **Sunucu:** 81 dosyada **347** "Sefer" eşleşmesi (kullanıcıya dönen mesajlar, DTO alan adları,
  test adları dahil).
- **Şoför uygulaması (mobil):** 18 dosyada **48** eşleşme; mobil ekran metinleri hâlâ "Sefer"
  diyebilir.
- Terim kararları `docs/TERIMLER.md` dosyasında tutuluyor ve **kullanıcı onayı bekliyor**
  (`AGENTS.md` §6: onay gelmeden ekran yazılarını toplu değiştirme — panelde onay alınmış sayıldı,
  sunucu ve mobilde değişiklik bu belgeye göre yapılır).
- Yeni görünümün ekran adları `client/src/lib/nav.ts` (`newNav`, satır 72-114) ve
  `client/src/lib/sections.ts` (`newTitles`, satır 41-50) içinde tanımlı.

**Doğrulanmış kaynak referansları (bu belgenin kanıt tabanı):**

| Referans | Ne olduğu |
|---|---|
| `client/src/lib/nav.ts:72-114` | Yeni menü (7 grup / 17 öğe) ve Türkçe etiketler |
| `client/src/lib/sections.ts:41-50` | `newTitles` — yeni başlık adları (9 kayıt) |
| `client/src/api/types.ts:278,288,306,308,321` | Panelde kalan "Sefer" geçen **tip/alan adları** (kullanıcıya görünmez) |
| commit `c20bfeb` | "UI text: Sefer → Sevkiyat everywhere in the web panel (routes and code names unchanged)" |
| `docs/TERIMLER.md` | Terim kararlarının tutulduğu dosya (onay bekliyor) |
| Tarama sayımı (5 Ekim 2026) | `server`: 81 dosyada 347 · `mobile`: 18 dosyada 48 · `client/src`: 78 eşleşme |

## 3. Ana sözlük (ekranda böyle yazılır)

| Kavram | Ekranda | Kodda (değişmez) | Not |
|---|---|---|---|
| Taşıma işi | **Sevkiyat** | `Trip`, `/seferler` | Rota adı korunur (eski bağlantılar) |
| Taşıma işi listesi | **Sevkiyatlar** | `TripsPage` | Menüde eski "Seferler" yok |
| Sevkiyat numarası | **Sevkiyat No** | `tripNo` | |
| Müşteri hesabı | **Cari** | `Cari`, `/cari/*` | "Müşteriler Cari", "Tedarikçiler Cari" |
| Hesap dökümü | **Ekstre** | `statement` | Satırda düğme |
| Borç/alacak kapatma | **Mahsup** | `offset` | |
| KDV kesintisi | **Tevkifat** | `withholding` | 12.000 TL üstü + 10 haneli VKN (`docs/KDV-KURALLARI.md`) |
| Kendi aracı | **Öz Mal / Öz Araç** | `Owned` | Sekme varsayılanı |
| Kiralık araç | **Kiralık Araç** | `Rented` | Rozet "Kiralık" |
| Yakıt | **Mazot** | `Fuel` | Ayrı ekran (`19-OZ-MAL-MAZOTLAR.md`) |
| Personel | **Personel** | `Staff` | Maaş/avans/prim |
| Tekrarlayan gider | **Sabit Ödeme** | `RecurringPayment` | Ay bazında durum |
| Rapor ekranı | **Analiz** | `/raporlar` | Menüde "Analiz" |
| Vade gecikmesi raporu | **Yaşlandırma** | `aging` | 0-30/31-60/61-90/90+ |
| Sistem ayarları | **Yönetici** | `/ayarlar` | |
| Kullanıcı ayarları | **Profilim** | `/ayarlar?tab=profil` | |
| pratikortam aynası | **"pratikortam'dan gelen kayıtlar"** | `mirror` | Ekranda "ayna" sözcüğü yok |
| Deneme çalıştırması | **"deneme çalıştırması"** | `dryRun` | |
| Takip bağlantısı | **Takip linki** | `tracking` | Kamusal `/takip/<kod>` |

Kısaltmalar: **KM** (kilometre), **TL** (para birimi; her zaman `tl2` ile iki kuruş).

## 4. Düğme ve başlık kalıpları

- Düğme = **fiil + nesne**: "Sevkiyat Ekle", "Fatura Kes", "Tahsilat Ekle", "Ödeme Ekle",
  "Mazot Ekle", "Araç Ekle", "Kaydet ve yeni".
- Kaçınılan kalıplar: "Yeni Sefer", "Oluştur", "İşlem Yap", "Gönder" (bağlamsız fiiller).
- Toplu işlem düğmeleri: "Seçilenleri onayla", "Seçilenleri sil".
- Sekme adları **isim** olur: "Liste · Pano · Harita", "Öz Araçlar · Kiralık Araçlar".
- Liste boş metni: "Kayıt yok." / "Aramanıza uyan kayıt yok." / "Bu dönemde kayıt yok."

## 5. Teknik sözcüklerin sade karşılıkları

| Ekranda görünmez | Yerine |
|---|---|
| ayna, mirror | "pratikortam'dan gelen kayıtlar" |
| dry-run, deneme modu | "deneme çalıştırması" |
| token, oturum anahtarı | (hiç görünmez) |
| endpoint, API | (hiç görünmez) |
| UBL, XML | "e-Fatura dosyası (XML)" |
| migration, şema | (hiç görünmez) |
| sync, senkron | "yenileme", "güncelleme" |
| deploy, build | (hiç görünmez) |
| lisans anahtarı | "abonelik anahtarı" (`docs/LISANS.md`) |
| 2FA | "iki adımlı doğrulama" |

Yazım biçimleri: para `1.234,56 TL` (`tl2`); tarih `03.10.2026`; plaka `16 KZ 528`
(`PlateBadge`, büyük harf ve boşluklu); oran `%20`; KDV "KDV hariç/dahil" sözcükleriyle belirtilir.

## 6. Durumlar ve rozet metinleri

| Durum | Metin | Renk |
|---|---|---|
| Sevkiyat planlandı | "Planlandı" | nötr |
| Yüklendi | "Yüklendi" | mavi |
| Yolda | "Yolda" | mavi |
| Teslim edildi | "Teslim edildi" | yeşil |
| Masraf onay bekliyor | "Onay bekliyor" | sarı |
| Gecikmiş vade | "62 gün gecikti" | kırmızı + metin |
| Belge yaklaşıyor | "Sigorta 12 gün içinde bitiyor" | sarı + metin |
| Ayna kaydı | "pratikortam'dan" | nötr |

Kural: bir satırda **en fazla 1 durum rozeti**; uyarı rozeti yalnız gerçek istisnada
(`docs/KOLAYLASTIRMA-PLANI.md` §3).

## 7. Telefon davranışı (390×844)

Kısa metin zorunlu: "Sevkiyat Ekle" yerine dar alanda "+ Sevkiyat"; sekme adları tek sözcük
("Liste", "Pano"); düğme yazıları 2 sözcüğü geçmez. Ekran okuyucu için `aria-label` tam metni taşır
("Sevkiyat ekle").

## 8. Erişilebilirlik ve klavye

Kısaltmalar (KM, TL) `aria-label` ile açılır: "kilometre", "Türk lirası". Rozet metinleri tam
cümledir; renk tek başına anlam taşımaz. Tarih ve plaka ekran okuyucuda olduğu gibi okunur
(03.10.2026 → "üç on iki bin yirmi altı" yerine biçim korunur).

## 9. Testler (e2e + birim)

- e2e adımları ekran metinleriyle çalışır (ör. `getByRole('button', { name: 'Sevkiyat Ekle' })`);
  bu yüzden terim değişikliği testleri kırar. Kural: metin değişikliği **aynı commit'te** testleri
  de günceller; test silme yok.
- Yeni birim testi: arayüzde "Sefer" geçmediğini doğrulayan tarama testi
  (`client/e2e/new-ui/terminoloji.spec.ts`): yeni görünümde menü/başlık/düğme metinlerinde "Sefer"
  bulunmamalı.
- Sunucu mesajları için: entegrasyon testi kullanıcıya dönen mesajlarda "Sefer" geçmediğini
  kontrol eder (ör. hata mesajı listesi).

## 10. Uygulama adımları

1. **Panel kalıntılarını ayıkla (3 saat).** `client/src` içindeki 78 eşleşmeyi incele: kullanıcıya
   görünen metinse "Sevkiyat" yap; `types.ts` alan adıysa **dokunma** (API sözleşmesi).
2. **Sunucu mesajları (4 saat).** `server` içindeki 347 eşleşmeden yalnız **kullanıcıya dönen**
   metinleri (hata/uyarı/e-posta) "Sevkiyat" yap; DTO alan adları ve test adları kalır. Migration
   yok.
3. **Mobil metinler (3 saat).** `mobile` içindeki 48 eşleşmeden ekran metinlerini güncelle;
   `npm.cmd run typecheck` (mobil) ve CI `mobile` job'u yeşil olmalı.
4. **Terim onayı (yarım gün, kullanıcı).** `docs/TERIMLER.md` tablosuna "onaylandı (tarih)" notu.
5. **Testler (3 saat).** §9 tarama testi + metne bağlı adımların güncellenmesi.
6. **Belge (30 dk).** `docs/TERIMLER.md` + `00-DIZIN.md` + `docs/GELISTIRME-PLANI.md`.

Toplam ≈ **13,5 saat** (2 iş günü) + onay.

## 11. Kabul ölçütü

- Panelde kullanıcıya görünen hiçbir yerde "Sefer" yok (tarama testi geçer).
- Sunucu ve mobilde yalnız kod içi tanımlayıcılarda kalır; kullanıcıya dönen mesajlarda yok.
- Düğme metinleri fiil + nesne kalıbına uyar (gözle kontrol + örnek liste).
- Teknik sözcük taraması: ekranda "ayna/dry-run/token/endpoint/UBL" geçmez.
- CI yeşil; metne bağlı e2e adımları güncellenmiş.

## 12. Riskler ve geri dönüş

| Risk | Önlem / geri dönüş |
|---|---|
| Alan adları değiştirilir, API/e2e kırılır | Kural: kod içi adlar sabit; yalnız kullanıcı metni değişir |
| Metin değişikliği 53 e2e testini kırar | Aynı commit'te testler güncellenir; kırık metin araması yapılır |
| Müşteri "Sevkiyat" yerine "Sefer" istiyor | `docs/TERIMLER.md` tek kaynak; geri dönüş tek toplu değişiklik |
| Çeviri tutarsızlığı (yarım kalan ekran) | Tarama testi; ekran belgelerinin §6 metin listeleri |

## 13. Doğrulanacaklar

- Müşteri "Sevkiyat" terimini onaylıyor mu (F1.5'te panelde uygulandı ama resmî onay bekliyor).
- "İş Talebi" terimi kalacak mı, "Taşıma Talebi" mi olacak.
- Şoför uygulamasında "Sefer" yerine ne kullanılacak ("Sevkiyat" mı, "İş" mi).
- İngilizce terim kullanımı gereken yer var mı (e-Fatura, UETDS).

Sonraki belgeyle bağlantı: `33-K0-VE-KABUL-TESTI.md` kabul testinde kullanılacak ekran adlarını,
`02`–`27` belgeleri kendi §6 metin listelerini, `28-ORTAK-PARCALAR.md` düğme/rozet sözleşmelerini
tanımlar.
