# Lisans ve abonelik

*Her müşteriye ayrı kurulum yapılır (SATIS-PLANI karar 3: A). Müşterinin paketi, araç sınırı ve süresi bir **lisans anahtarı** ile belirlenir. Anahtar imzalıdır: müşteri içindeki rakamı değiştiremez, internet bağlantısı gerekmez.*

## Kısaca nasıl çalışır
- Satıcıda bir **özel anahtar** durur (bir dosya). Müşteri anahtarlarını bununla imzalarız.
- Müşterinin sunucusunda yalnız **genel anahtar** bulunur; anahtarın bizden geldiğini doğrular, imzalayamaz.
- Anahtar boş bırakılırsa panel **Sahip modu**nda çalışır: sınırsız, uyarısız. Bizim kendi kurulumumuz böyledir.

## Bir kez yapılır: anahtar çiftini üretmek
Bilgisayarınızda (python3 ve `cryptography` paketi gerekir):

```
python3 tools/license/license.py keygen --out ~/lisans/ozel-anahtar.pem
```

- Özel anahtar belirttiğiniz dosyaya yazılır. **Yedekleyin, kimseye vermeyin, GitHub'a koymayın.** Kaybederseniz yeni anahtar üretemezsiniz; sızarsa herkes kendine lisans yazabilir.
- Ekrana **genel anahtar** (uzun bir yazı) basılır. Bunu kaydedin; her müşteri sunucusuna `License__PublicKey` olarak verilir (ya da ilk sürümde `LicenseService.BuiltInPublicKey` sabiti bununla değiştirilir).
- Kodun içindeki yerleşik genel anahtarın özel karşılığı yoktur; `License__PublicKey` verilmezse hiçbir anahtar geçmez.

## Yeni müşteriye anahtar vermek
1. Müşterinin kurulumunu yapın (docs/KURULUM.md) ve sunucu ayarlarına genel anahtarı girin: `License__PublicKey=...`
2. Özel anahtar dosyasının yolunu bir kez tanıtıp anahtarı üretin:

```
export LICENSE_PRIVATE_KEY_FILE=~/lisans/ozel-anahtar.pem
python3 tools/license/license.py issue --customer "Örnek Nakliyat" --plan Standart --vehicles 20 --days 365 --features eFatura,uetds
```

3. Ekrana tek satırlık uzun bir anahtar çıkar (`xxxxx.yyyyy`). Müşteriye e-posta ile gönderin.
4. İki yoldan biriyle girilir:
   - **Panelden:** yönetici Ayarlar → Abonelik → "Yeni anahtar" kutusuna yapıştırır → "Anahtarı uygula".
   - **Sunucu ayarından:** `License__Key=<anahtar>` (kurulumu biz yapıyorsak). Bu varsa panelden değiştirilemez, sunucu ayarı kazanır.

Seçenekler:

| Seçenek | Anlamı |
|---|---|
| `--plan` | `Deneme`, `Baslangic`, `Standart`, `Profesyonel`, `Kurumsal` |
| `--vehicles` | Araç sınırı. `0` = sınırsız (Kurumsal için) |
| `--days` | Bugünden itibaren kaç gün geçerli (30 gün deneme için `--days 30`, yıllık için `--days 365`) |
| `--features` | Virgülle: `eFatura`, `uetds`, `gps`, `portal`. Şimdilik yalnızca bilgi olarak saklanır, mevcut özellikler kapatılmaz |
| `--instance-id` | İsteğe bağlı. Doluysa anahtar yalnız sunucu ayarında `License__InstanceId` aynı yazan kurulumda geçer (anahtar başka müşteriye kopyalanamaz) |

Paket önerileri (SATIS-PLANI bölüm 4): Başlangıç 5 araç, Standart 20, Profesyonel 50, Kurumsal teklif. Bir anahtarı kontrol etmek için: `python3 tools/license/license.py verify <anahtar> --public-key <genel anahtar>`.

## Yenileme
Süre dolmadan müşteriye **yeni bir anahtar** üretip gönderin (`issue` komutu, yeni süreyle). Müşteri aynı yerden (Ayarlar → Abonelik) yapıştırır. Yeni anahtar eskisinin yerine geçer; veri değişmez. Paket yükseltmek de aynıdır: daha yüksek `--plan` ve `--vehicles` ile yeni anahtar.

Süresi dolmuş bir anahtar uygulanamaz ("Bu anahtarın süresi dolmuş" der).

## Müşteri ne görür
| Durum | Ne zaman | Panelde |
|---|---|---|
| **Aktif** | Süre bitmedi | Normal çalışır. Bitişe 14 gün kala üstte sarı bant: "Aboneliğiniz N gün sonra bitiyor" |
| **Ek süre** | Süre bitti, 7 gün geçmedi | Her şey çalışır, sarı bant: "Aboneliğiniz bitti. N gün içinde yenilenmezse yalnızca görüntüleme yapılabilir" |
| **Süresi bitti** | Ek süre de geçti | Kırmızı bant: "Aboneliğiniz bitti: şu an yalnızca görüntüleme yapılabilir". Her şey görülür, indirilir; kayıt eklenemez/değiştirilemez (şoför uygulaması dahil). Giriş, şifre, veri indirme, yedek ve anahtar uygulama çalışır |
| **Anahtar geçersiz** | İmza bozuk, başka kuruluma ait, yanlış genel anahtar | Süresi bitmiş gibi salt okunur; bantta ve Abonelik sekmesinde sebep yazar |
| **Sahip modu** | Anahtar hiç yok | Hiçbir uyarı ve sınır yok |

Araç sınırı: etkin araç sayısı (silinmemiş tüm araçlar; kiralık dahil) sınıra ulaşınca yeni araç eklenemez ve Excel ile araç aktarımı reddedilir: "Paketinizdeki araç sınırına ulaştınız (N). Paketi yükseltmek için bize ulaşın." Var olan araçlar silinmez, çalışmaya devam eder.

Müşteri verilerini hiçbir durumda kaybetmez; abonelik yenilenince panel hemen eski haline döner. Ayarlar → Abonelik sekmesi (yalnız yönetici) paketi, araç kullanımını, bitiş tarihini, durumu, yenileme bilgisini ve paket karşılaştırma tablosunu (KDV hariç, aylık) gösterir. Destek e-postası/telefonu şimdilik **yer tutucudur**: `client/src/lib/licenseConstants.ts`.

## Teknik notlar (geliştirici için)
- Anahtar biçimi: `base64url(JSON yük).base64url(imza)`. İmza: ECDSA P-256 + SHA-256, 64 bayt (r‖s). Genel anahtar: base64 SubjectPublicKeyInfo.
- Yük: `customer, plan, vehicleLimit, features[], issuedAt, expiresAt, instanceId?`.
- Kod: `server/YesLojistik.Core/Licensing` (doğrulama, durum hesabı), `YesLojistik.Infrastructure/Services/LicenseService.cs`, `YesLojistik.Api/Controllers/LicenseController.cs` (`GET /api/license/status`, `POST /api/license/apply` yalnız yönetici), `YesLojistik.Api/Infrastructure/LicenseGuard.cs` (salt okunur kapı).
- Salt okunur modda GET dışındaki `/api` istekleri 403 döner; serbest olanlar: `/api/auth`, `/api/license`, `/api/admin` ve adresinin son bölümünde `export` geçen istekler.
- Özellik kapısı (sonraki işler için): `(await license.CurrentAsync()).Has("uetds")`. Sahip modunda hep `true`; aktif ve ek süredeyken anahtardaki listeye bakar; bitmiş/geçersizde `false`.
- Ayarlar: `License__Key` (anahtar, panelden değiştirilemez), `License__PublicKey`, `License__InstanceId`.
- Testler kendi geçici anahtar çiftini üretir; özel anahtar depoda yoktur.
