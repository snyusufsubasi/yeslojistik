# U-ETDS (Ulaştırma Elektronik Takip ve Denetim Sistemi)

*Durum: panel şu an yalnızca **"UETDS'ye hazır mı?"** kontrolü yapar. Bakanlığa HİÇBİR bildirim göndermez.*

> **Bu belge neye dayanıyor?** Bakanlığın teknik dokümanlarına (uetds.uab.gov.tr) bu ortamdan erişilemedi (adres engelli). Aşağıdaki bilgiler kamuya açık anlatım sayfalarından ve arama özetlerinden derlendi. Emin olunmayan her yer **doğrulanacak** diye işaretlidir. Gerçek gönderim yazılmadan önce Bakanlığın güncel kılavuzuyla tek tek karşılaştırılmalıdır.

## 1. U-ETDS nedir?

Ulaştırma ve Altyapı Bakanlığı'nın, karayolu eşya taşımacılığında **her seferi** bildirdiğiniz elektronik sistemidir. Bildirim, yükün kim tarafından, hangi araç ve şoförle, nereden nereye, ne taşındığını Bakanlığa bildirir. Amaç denetim ve kayıt dışılığı azaltmaktır.

## 2. Kim kullanmak zorunda?

Kamuya açık anlatımlara göre (doğrulanacak):

- **C2, C3, K1, K3** yetki belgeli taşıyıcılar (nakliyeciler).
- Lojistik işletmecileri (L1, L2), kargo (M1, M2), nakliyat ambarı (N1, N2), dağıtım (P1, P2) ve taşıma işleri organizatörleri (R1, R2).
- **K2** belgesi kendi malını taşıyanlar içindir; kapsamı doğrulanacak.

Firmanın hangi belgeye sahip olduğu **Yetki Belgesi**nde yazar. Müşteriye satarken "hangi belgeniz var?" sorusu sorulmalı.

## 3. Ne zaman bildirilir?

Kaynaklar birbirinden farklı anlatıyor: biri "hareket saatinden en geç 6 saat sonrasına kadar", biri "yükün kabulünden sonra, sefer başlamadan önce" diyor. **Doğrulanacak.** Panelin amacı, bu süre ne olursa olsun bilgilerin sefer oluşturulurken hazır olmasıdır.

## 4. Bildirimde hangi bilgiler istenir?

| Bilgi | Panelde nerede? | Kaynak notu |
|---|---|---|
| Çekici / kamyon plakası | Araç kartı | Açık kaynaklarda var |
| Dorse (römork) plakası, varsa | Araç kartı ya da sefer, Ayrıntılar | Açık kaynaklarda var. "Tır / çekici dorsesiz olamaz" kuralı **doğrulanacak**; panel bunu yalnızca not olarak yazar |
| Şoför adı soyadı ve **T.C. kimlik no** | Şoför kartı | Açık kaynaklarda var |
| Yabancı şoför kimliği ve uyruk | Şoför kartı (Yabancı uyruklu, Uyruk, Pasaport/Kimlik no) | **Doğrulanacak**: hangi belge numarası, uyruk için ülke kodu listesi |
| Şoför telefonu | Şoför kartı | **Doğrulanacak** (zorunlu olup olmadığı) |
| Yük cinsi | Sefer, Ayrıntılar → Yük | Açık kaynaklarda var |
| Yükün miktarı / ağırlığı (kg, adet, ton) | Sefer, Ayrıntılar → Yük | Açık kaynaklarda var. Zorunlu birim listesi **doğrulanacak** |
| Yükleme ve boşaltma **il ve ilçe** | Sefer: il güzergâh bölümünde, ilçe Ayrıntılar → U-ETDS hazırlığı | Açık kaynaklarda var |
| Yükleme tarihi **ve saati** | Sefer: tarih güzergâh bölümünde, saat Ayrıntılar → U-ETDS hazırlığı | Açık kaynaklarda var |
| Gönderici (VKN/TCKN, unvan) | **Müşteri kartı** (müşteri gönderici sayılır) | Açık kaynaklarda var. "Gönderici = müşteri" varsayımı **doğrulanacak** (müşteri bazen alıcıdır) |
| Alıcı (VKN/TCKN, unvan ya da ad soyad) | Sefer, Ayrıntılar → U-ETDS hazırlığı | Açık kaynaklarda var |

## 5. Panel bugün ne kontrol ediyor?

Sefer ekranında ve listede **"U-ETDS hazırlığı"** (kod: `UetdsReadiness`, `server/YesLojistik.Core/Domain/UetdsReadiness.cs`):

- Şoför TC kimlik no: 11 hane ve **algoritması geçerli** (kontrol hanesi). Yabancı şoförde pasaport/kimlik no (5-20 harf-rakam) ve uyruk.
- Şoför telefonu.
- Araç plakası geçerli (Türkiye plaka biçimi); dorse plakası yazılmışsa geçerli. Tır/çekicide dorse yoksa **not** (eksik sayılmaz).
- Yük cinsi; ağırlık ya da miktar (miktar varsa birim notu).
- Yükleme ve teslim: il listeden, ilçe dolu.
- Gönderici (müşteri) VKN/TCKN geçerli; alıcı VKN/TCKN ve unvanı.
- Yükleme saati.

Sonuç: **✓ Hazır** ya da **N eksik**; her madde düz Türkçe yazılır ve düzeltilecek yere bağlantı verir.

- **Sevkiyatlar → Ayrıntılı süzgeç → "U-ETDS eksik olanlar"** ve listede "UETDS hazır / N eksik" etiketi.
- Servis: `GET /api/trips/{id}/uetds-readiness`, liste süzgeci `uetdsMissing=true`.
- Yalnızca **henüz teslim edilmemiş**, iptal olmayan, eski sistemden aktarılmamış seferler sayılır.
- Özelliği gizlemek için: `client/src/lib/features.ts` içinde `UETDS_READINESS = false`.

**Bakanlığa bağlantı yoktur.** Ekranlardaki "hazırlık" sözü bu yüzdendir.

## 6. Gerçekten göndermek için neler lazım? (dış bilgi)

Hepsi **firma sahibinden** ya da Bakanlıktan gelmeli. Bizde hiçbiri yok:

1. **Yetki belgesi bilgisi** (C2/C3/K1/K3 vb.) ve belge numarası.
2. **U-ETDS kullanıcı adı ve şifresi** (firma adına; yetkili e-Devlet üzerinden de alınabilir, **doğrulanacak**).
3. **Test ortamı** erişimi ve test kullanıcısı.
4. **Entegrasyon (teknik) dokümanı**: web servis adresleri, bildirim oluşturma / güncelleme / iptal / sorgu işlemleri, alan listesi, kod listeleri (ülke, il, ilçe, yük cinsi, birim), hata kodları.
5. Bildirimin **hangi yöntemle** yapılacağı: doğrudan Bakanlık web servisi mi, yoksa onaylı bir entegratör üzerinden mi (**doğrulanacak**).
6. Sefer **iptal / güncelleme** kuralları ve süreleri; **bildirim numarası** (sefer referansı) saklama ihtiyacı.

## 7. Firma sahibi bunları nasıl ister? (adımlar)

Tam başvuru yolunun güncel hali **doğrulanacak**. Genel akış:

1. Firmanın **yetki belgesinin** fotokopisini/numarasını hazırlayın.
2. U-ETDS panelinde firma kullanıcısının tanımlı olup olmadığına bakın (Bakanlık sitesi: uetds.uab.gov.tr). Kullanıcı yoksa İl/Bölge Müdürlüğünden ya da Bakanlık destek hattından **kullanıcı tanımlama** isteyin.
3. Bakanlığa (U-ETDS destek) yazılı olarak şunları sorun: "Yazılım entegrasyonu için **teknik doküman**, **test ortamı** ve **test kullanıcısı** verir misiniz? Hangi servis yöntemi kullanılıyor?"
4. Gelen belgeleri, kullanıcı adı ve şifreyi **repoya yazmayın**. Şifreler yalnızca sunucuda ortam değişkeni olarak tutulur (bkz. `docs/ENTEGRATOR-EKLEME.md`, aynı ilke).

## 8. Belgeler gelince yapılacaklar (kesin görev listesi)

1. Teknik dokümanı `docs/` altına özetleyin (ham dosyayı müşteri verisi içeriyorsa repoya koymayın). Hazırlık kontrolündeki alan listesini dokümanla karşılaştırın: eksik/fazla alanları `UetdsReadiness` içinde düzeltin, "doğrulanacak" notlarını kapatın.
2. Gönderilecek gerçek alan listesine göre `Driver`, `Vehicle`, `Trip` alanlarını gözden geçirin (ülke kodu, birim kodu, ilçe kodu gerekiyorsa kod listesi tabloları eklenir; tek migration).
3. `IUetdsProvider` arayüzünü tanımlayın: `CreateAsync(sefer) → bildirim no`, `UpdateAsync`, `CancelAsync`, `GetAsync`. Gönderilmeden yalnızca `ManualUetdsProvider` (hiçbir şey göndermeyen) ve test için `MockUetdsProvider` olsun. (e-Fatura sağlayıcı yapısıyla aynı kalıp: `IEInvoiceProvider`, `EInvoiceProviders`.)
4. Gerçek adaptörü yazın; kullanıcı adı/şifre `Uetds__User`, `Uetds__Password`, `Uetds__BaseUrl` ortam değişkenlerinden. **Yedek alın**; ardından yalnızca **test ortamında** deneyin.
5. Sefere `UetdsReference` (bildirim no) ve `UetdsStatus` alanları açın (migration). Sefer durumu **Yüklendi**ye geçerken (ya da Bakanlığın istediği ana göre) hazırlık tamsa bildirimi gönderin; eksik varsa uyarı verin, kullanıcı karar versin.
6. İptal ve güncelleme: sefer iptal edilirse ya da şoför/araç değişirse bildirimi buna göre güncelleyin/iptal edin.
7. Testler: `UetdsReadiness` birim testleri korunur; sağlayıcı için sahte sunucu ile entegrasyon testi; test ortamında 3 senaryo (yerli şoför, yabancı şoför, dorseli çekici) elle denenir.
8. Panelde "Bildir" düğmesi, bildirim durumu, hata mesajları ve sevkiyat listesinde "Bildirildi" etiketi eklenir. Şifre ayarlarında yalnızca "tanımlı mı" görünür.
9. `docs/UETDS.md` (bu belge) ve `docs/GELISTIRME-PLANI.md` güncellenir.

## 9. Kod haritası

| Ne | Nerede |
|---|---|
| Kural (saf, testli) | `server/YesLojistik.Core/Domain/UetdsReadiness.cs` |
| Veritabanı + uç nokta | `server/YesLojistik.Infrastructure/Services/UetdsService.cs`, `TripsController` |
| Eklenen alanlar | `Driver.Nationality`; `Trip.LoadingDistrict`, `DeliveryDistrict`, `LoadingTime`, `ConsigneeTitle`, `ConsigneeTaxNumber`; `Driver.NationalId` uzunluğu 20 (pasaport için) |
| Ekran | `client/src/components/UetdsPanel.tsx`, `TripForm.tsx` (Ayrıntılar), `TripsPage.tsx`, `DriversPage.tsx` |
| Testler | `UetdsReadinessTests`, `UetdsTests` (sunucu), `client/e2e/uetds.spec.ts` |
