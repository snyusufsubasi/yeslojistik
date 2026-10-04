# e-Fatura entegratörü ekleme rehberi

*Geliştirici ve proje sahibi içindir. Bugün hiçbir gerçek entegratör bağlı DEĞİLDİR; sistem XML üretir ve elle yüklenir (`manual`).*

> Bu belgede entegratörlerin teknik ayrıntısı **bilerek yoktur**: hiçbirinin API dokümanına ya da test hesabına erişimimiz yok, uydurma uç nokta yazılmaz. Burası "elimizde ne olursa, ne yapılır" listesidir.

## 1. Bugünkü yapı (hazır olan)

| Parça | Ne yapar | Nerede |
|---|---|---|
| `IEInvoiceProvider` | Sağlayıcı arayüzü: `Key`, `Name`, `CanSend`, `SupportsStatus`, `SupportsRecipientCheck`, `SupportsDownload`, `SendAsync(fatura, UBL xml)`, `GetStatusAsync`, `CancelAsync`, `CheckRecipientAsync`, `DownloadAsync(xml/pdf)` | `server/YesLojistik.Core/Abstractions/IEInvoiceProvider.cs` |
| `ManualXmlProvider` (`manual`) | Varsayılan. Gönderemez; "XML'i indirip e-Fatura portalına yükleyin". Kullanıcı "Gönderildi olarak işaretle" der | `server/YesLojistik.Infrastructure/EInvoice/Providers.cs` |
| `MockEInvoiceProvider` (`mock`) | Yalnızca geliştirme/test: gönderimi taklit eder | aynı dosya |
| `EInvoiceProviders` | Kayıt tablosu. `EInvoice:Provider` (ortam değişkeni `EInvoice__Provider`) bir ad seçer. Eski ad `FileExport` ve `xml` de `manual` sayılır. Tanınmayan ad sunucuyu düşürmez, uyarı yazar ve `manual` kullanır | `server/YesLojistik.Infrastructure/EInvoice/EInvoiceProviders.cs` |
| `EInvoiceService` | İş kuralları: ETTN, GİB numarası, UBL XML, gönderme, durum, iptal. Sağlayıcıdan bağımsız | `server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs` |
| `UblInvoiceBuilder` | UBL-TR 1.2 XML (imzasız) | aynı klasör |
| `EInvoiceStatusWorker` | Gönderilmiş faturaların durumunu 10 dakikada bir sorar | `server/YesLojistik.Api/Infrastructure/` |

Ayar ekranı ve `GET /api/einvoice/info` aktif sağlayıcıyı (`providerKey`, ad, neleri yapabildiği) gösterir.

## 2. Entegratörden alınacak bilgiler (kontrol listesi)

Karar vermeden önce **yazılı** (e-posta/teklif/doküman) olarak isteyin:

**Erişim**
- [ ] API dokümanı (REST mi, SOAP mu?) ve **sürüm**; değişiklik/duyuru yöntemi.
- [ ] **Test ortamı**: adres, ücretsiz mi, süresiz mi, test kullanıcısı, test VKN/GB etiketi.
- [ ] **Canlı ortam** adresi; test→canlı geçiş adımları.
- [ ] Kimlik doğrulama: kullanıcı adı/şifre, API anahtarı, token (süre, yenileme).
- [ ] Hız sınırı, en büyük XML boyutu, zaman aşımı beklentisi, destek kanalı ve çalışma saatleri.

**Uç noktalar** (her biri için adres, istek ve yanıt örneği, hata kodları)
- [ ] **Gönderme**: e-Fatura ve e-Arşiv aynı uç nokta mı, ayrı mı? Gönderirken XML'i biz mi imzalıyoruz yoksa entegratör mi (mali mühür, UBLExtensions)? Gövde biçimi: ham XML mi, zip mi, Base64 mü, JSON sarmalı mı?
- [ ] **Durum sorgulama**: sorgu anahtarı nedir (ETTN, entegratör referansı, fatura no)? Durum kodları listesi ve bizim `EInvoiceStatus` ile eşleşmesi (Hazır, Gönderildi, Teslim edildi, Kabul, Ret, Hata, İptal).
- [ ] **Gelen kutusu** (taşeron faturaları): liste, indirme, kabul/ret yanıtı (Ticari senaryo).
- [ ] **Mükellef sorgulama**: VKN → e-Fatura kullanıcısı mı, PK etiketleri.
- [ ] **İptal**: e-Arşiv iptali API ile mümkün mü; e-Fatura iptal/itiraz akışı nasıl.
- [ ] **PDF/XML indirme**: imzalı XML ve PDF görünümü (XSLT) alınabiliyor mu.
- [ ] **Webhook** var mı (durum değişince bize çağrı), yoksa yalnızca sorgu mu.

**UBL ve profil gereksinimleri**
- [ ] Hangi profiller: TEMELFATURA, TICARIFATURA, EARSIVFATURA; tevkifat (`TEVKIFAT`), istisna (`ISTISNA`) tipleri.
- [ ] UBL-TR sürümü ve **şematron kuralları**; bizim XML'imizde değişiklik istiyorlar mı (ör. `cbc:ID` biçimi, ETTN, `Note` alanları, gönderici birim/PK etiketi, `Signature` düğümü)?
- [ ] Fatura numarasını biz mi veriyoruz (bizdeki seri + yıl + 9 hane) yoksa entegratör mü atıyor? **Önemli**: ikisi karışırsa numara boşluğu çıkar.
- [ ] Seri/önek tanımı, ilk numara, yıl değişiminde sıfırlama.
- [ ] **Gönderici birim (GB) etiketi** ve PK etiketleri.
- [ ] Test XML'lerini önceden doğrulatma imkânı.

**Ticari**
- [ ] **Kontör modeli**: fatura başı mı, paket mi, yıllık mı? e-Fatura ve e-Arşiv ayrı mı sayılır? Gelen faturalar kontör harcar mı? Kullanılmayan kontör devreder mi, süresi var mı?
- [ ] Yıllık/kurulum ücreti, API kullanım ücreti, test ortamı ücreti.
- [ ] e-İrsaliye ve e-Müstahsil/e-SMM aynı sözleşmede mi (ileride lazım olabilir).
- [ ] Arşivleme süresi (10 yıl yasal zorunluluk): arşiv entegratörde mi tutulur, bize dışa aktarma var mı?
- [ ] **Sözleşme/çıkış**: başka entegratöre geçerken eski faturalar ve numaralar nasıl taşınır.
- [ ] KVKK: veri nerede tutulur (Türkiye'de mi), veri işleme sözleşmesi.

## 3. Adaptör ekleme adımları

1. **Hesap**: test hesabı ve (varsa) GB etiketi alın. Anahtarlar **repoya yazılmaz**.
2. **Sınıf**: `server/YesLojistik.Infrastructure/EInvoice/<Ad>Provider.cs` içinde `IEInvoiceProvider`'ı uygulayın. `Key` küçük harfli ad olsun (ör. `nilvera`). Sadece gerçekten desteklenenleri `true` yapın (`CanSend`, `SupportsStatus`, `SupportsRecipientCheck`, `SupportsDownload`); desteklenmeyene `DomainException` değil, arayüzdeki varsayılan davranış kalsın.
3. **HTTP**: `HttpClient` fabrikası ile (zaman aşımı, yeniden deneme yok ya da yalnızca güvenli sorgularda). Yanıtları `EInvoiceResult(Status, Number, Message, ProviderRef)` biçimine çevirin. Hata mesajlarını kullanıcıya düz Türkçe ve **gizli bilgi sızdırmadan** yazın (`EInvoiceService` zaten hatayı yakalar ve "Entegratöre ulaşılamadı" der).
4. **Durum eşlemesi**: entegratör durum kodlarını `EInvoiceStatus` değerlerine tek bir `switch` ile eşleyin ve birim testle sabitleyin.
5. **Kayıt**: `EInvoiceProviders.Registry` içine **tek satır** ekleyin: `["nilvera"] = sp => new NilveraProvider(...)`. Başka dosya değişmez.
6. **Ayarlar**: sunucuda `EInvoice__Provider=<ad>`, `EInvoice__ApiKey=...` ve sağlayıcıya özel değişkenler (`EInvoice__BaseUrl`, `EInvoice__User`...). Ayar ekranında yalnızca "tanımlı mı" görünür. Render/Docker ortam değişkenleri `docs/KURULUM.md` ile aynı yöntem.
7. **ProviderRef**: entegratör kendi kimliğini veriyorsa ve ETTN yetmiyorsa `Invoice`'a `EInvoiceProviderRef` alanı açıp (migration) `EInvoiceService.Apply` içinde yazın. Yetiyorsa gerek yok.
8. **PDF/XML**: `SupportsDownload` true ise `GET /api/invoices/{id}/einvoice/...` için küçük bir uç nokta ve fatura ekranında düğme ekleyin.
9. **Testler**: eşleme birim testi; `HttpMessageHandler` sahtesiyle gönderme/durum/hata testleri. Gerçek entegratöre CI'dan **istek atılmaz**.
10. **Belgeler**: `docs/E-FATURA.md` ve bu belgedeki karşılaştırma tablosu güncellenir.

## 4. Test planı (entegratörün test ortamında)

Önce **yedek alın**; yalnızca test hesabı kullanın. Her senaryoda: XML entegratörün doğrulamasından geçmeli, fatura numarası ve ETTN panelle aynı olmalı, durum paneldeki ile aynı ilerlemeli.

| # | Senaryo | Beklenen |
|---|---|---|
| 1 | e-Arşiv, bireysel alıcı (TCKN) | Kabul edilir, durum "Teslim edildi" |
| 2 | e-Arşiv, firma (VKN, e-Fatura mükellefi değil) | Kabul edilir |
| 3 | e-Fatura Temel senaryo, mükellef alıcı | Gönderildi → Teslim edildi |
| 4 | e-Fatura Ticari, alıcı **kabul** eder | Kabul durumu panelde görünür |
| 5 | e-Fatura Ticari, alıcı **ret** eder | Ret durumu, mesaj gösterilir |
| 6 | Tevkifatlı Temel (2/10, kod 624) | Tevkifat tutarları doğru, şematron geçer |
| 7 | KDV %0, istisna kodu 311 | İstisna sebebi kabul edilir |
| 8 | Aynı faturayı iki kez gönder | Çift gönderilmez (hata ya da aynı sonuç), numara tekrarlanmaz |
| 9 | Ağ kesintisi / yanlış anahtar | Fatura "Hata" olur, mesaj düz Türkçe, fatura bozulmaz, tekrar denenebilir |
| 10 | e-Arşiv iptali | API ile iptal edilir ya da "iptal talep edildi" |
| 11 | Mükellef sorgulama (mükellef ve değil) | Alias listesi doğru |
| 12 | Gelen fatura çekme (varsa) | Taşeron faturası listelenir, eşleşir |

Canlıya geçiş: test numaraları/seri önekleri canlıdakiyle **karışmamalı**; ilk gün tek bir gerçek fatura ile deneyin; muhasebeci kontrol etsin.

## 5. Entegratör karşılaştırma tablosu (şablon)

Bu tablo **bilerek boştur**: hiçbir hücre, kaynağıyla kontrol edilmeden "var/yok" yazılmaz. Aday firmaların GİB'in "özel entegratör" listesinde olduğu da güncel listeden **doğrulanacak**. Teklif geldikçe doldurun.

| | Nilvera | Kolaysoft | Uyumsoft | Foriba / Sovos | EDM | İzibiz | Paraşüt (API) |
|---|---|---|---|---|---|---|---|
| Türü | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | Ön muhasebe yazılımı; kendi herkese açık API'si olduğu biliniyor, kapsamı (e-Fatura dahil) doğrulanacak |
| GİB özel entegratör listesinde | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| API türü (REST/SOAP) | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Herkese açık API dokümanı | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Ücretsiz test ortamı | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Kontör modeli / fiyat | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| e-Arşiv dahil mi | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Mükellef sorgulama API | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Gelen fatura API | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Numarayı kim verir | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| İmza/mali mühür | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| PDF görünümü (XSLT) | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Webhook | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| e-İrsaliye | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Destek / SLA | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Veri yeri / KVKK | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |
| Çıkış (başka firmaya geçiş) | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak | doğrulanacak |

**Seçim önerisi (karar sizin):** önce "ücretsiz test ortamı + açık REST dokümanı + mükellef sorgulama + net kontör fiyatı" dört şartını sağlayanlara bakın; aynı anda e-Fatura ve e-Arşivi tek sözleşmede veren, imzayı kendisi atan ve numarayı bizim verdiğimiz modeli destekleyen firma en az işi çıkarır.

## 6. Dikkat edilecekler

- **Çift gönderim** en pahalı hata: gönderirken durumu önce "Gönderildi"ye alıp sonra isteği atmak yerine, istek sonucu bilinmiyorsa (zaman aşımı) durumu "Hata" yapıp **önce entegratörden sorgulayın**, sonra tekrar gönderin.
- ETTN (UUID) bizde üretilir; entegratör farklı bir kimlik veriyorsa ikisini de saklayın.
- Vergi kuralları değişebilir; tevkifat/istisna kodlarını mali müşavirle teyit edin (`docs/KDV-KURALLARI.md`).
