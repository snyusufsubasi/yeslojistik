# e-Fatura / e-Arşiv

Sistem, GİB'in UBL-TR 1.2 biçiminde fatura XML'i üretir. Entegratörle sözleşme yapılana kadar XML **elle** entegratör portalına ya da muhasebeciye verilir; sözleşmeden sonra yalnızca bir adaptör yazılıp ayar açılır, faturalar otomatik gider.

> Vergi kuralları (tevkifat oranı, kodlar, sınır tutarlar) mevzuata bağlıdır ve değişebilir. Sistemin önerdiği değerleri (2/10 tevkifat, kod 624) **mali müşavirinizle teyit edin.**

## e-Fatura mı, e-Arşiv mi?

| | e-Fatura | e-Arşiv |
|---|---|---|
| Alıcı | GİB'e kayıtlı e-Fatura mükellefi | Mükellef olmayan firma veya kişi |
| Nasıl gider | Entegratör → GİB → alıcının entegratörü | Alıcıya e-posta/PDF; GİB'e rapor |
| Senaryo | **Temel** (itiraz yok) ya da **Ticari** (alıcı 8 gün içinde kabul/ret) | — |
| İptal | Elektronik iptal yok: alıcının onayı ya da GİB portalından iptal talebi | Entegratör üzerinden iptal edilebilir |

Müşteri kartındaki **e-Fatura mükellefi** işareti hangisinin kullanılacağını belirler. Mükellefse **PK etiketi** de girilir.

## Sistemde nasıl çalışır?

1. **Ayarlar → Firma Bilgileri → e-Fatura / e-Arşiv**: "e-Fatura açık" işaretlenir, seri önekleri (ör. `YES` e-Fatura, `YEA` e-Arşiv) ve mükellef alıcılar için senaryo seçilir. Firma VKN, vergi dairesi ve il zorunludur.
2. Fatura **kesildiğinde** (taslak değil): senaryo ve tip (Satış / Tevkifat) belirlenir, ETTN (UUID) ve GİB biçiminde numara verilir: seri + yıl + 9 hane, ör. `YEA2026000000001`. Numara her seri ve yıl için boşluksuz artar. İç fatura numarası (F-000123) aynen kalır.
3. Fatura detayında **e-Fatura** paneli: *XML indir*, *Gönderildi olarak işaretle* (entegratör yokken), *Entegratöre gönder* / *Durumu yenile* (entegratör varken).
4. Fatura iptal edilirse: gönderilmemişse e-Fatura da iptal olur; gönderilmişse durum **İptal talep edildi** olur. İşlem portalda/alıcıyla tamamlanınca **İptal tamamlandı** denir.
5. **Raporlar → Muhasebe Aktarımı**: seçilen ayın satış, tahsilat, gider, taşeron maliyet ve ödemeleri tek Excel'de; o ayın e-Fatura XML'leri tek ZIP'te iner.

Üretilen XML: `UBLVersionID 2.1`, `CustomizationID TR1.2`, `ProfileID` (TEMELFATURA / TICARIFATURA / EARSIVFATURA), `InvoiceTypeCode` (SATIS / TEVKIFAT), tutarın yazıyla hâli (Note), satıcı ve alıcı (VKN → PartyName; TCKN → Person, son kelime soyad), KDV (0015), tevkifat (`WithholdingTaxTotal`, 2/10 → %20, kod 624), satır bazında vergi. **Mali mühür / imza** (UBLExtensions) entegratör tarafından eklenir. Son şematron doğrulaması entegratörün test ortamında yapılır.

## Entegratör seçerken

- REST API ve **ücretsiz test ortamı** var mı?
- Kontör/fatura başı fiyat, yıllık ücret; e-Arşiv dahil mi?
- PDF görünümü (XSLT) özelleştirilebiliyor mu?
- **Mükellef sorgulama** (VKN → e-Fatura kullanıcısı mı, etiketleri) API'si var mı?
- Gelen faturaları (taşeron faturaları) API ile çekmek mümkün mü?

## Sözleşmeden sonra (yaklaşık 1 gün iş)

1. Entegratörden test hesabı, **gönderici birim (GB) etiketi**, seri önekleri ve ilk numara bilgisi alınır. Ayarlara girilir.
2. `server/YesLojistik.Infrastructure/EInvoice/` altına `IEInvoiceProvider`'ı uygulayan adaptör yazılır (`SendAsync`, `GetStatusAsync`, `CancelAsync`, `CheckRecipientAsync`, `DownloadAsync`). Örnek davranış için `MockEInvoiceProvider`'a bakın.
3. `EInvoiceProviders.cs` kayıt tablosuna tek satırla eklenir; sunucuda ortam değişkenleri: `EInvoice__Provider=<ad>`, `EInvoice__ApiKey=...` (+ sağlayıcıya özel). **Anahtarlar repoya veya veritabanına yazılmaz.**

Ayrıntılı kontrol listesi, test planı ve karşılaştırma tablosu: [ENTEGRATOR-EKLEME.md](ENTEGRATOR-EKLEME.md).
4. Test ortamında 5 senaryo denenir: e-Arşiv bireysel (TCKN), e-Arşiv firma, Temel, Ticari (kabul ve ret), tevkifatlı Temel. XML'ler entegratörün doğrulamasından geçmeli.
5. Canlı hesaba geçilir. Gönderilen faturaların durumu 10 dakikada bir otomatik güncellenir.

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `EInvoice__Provider` | `manual` (varsayılan; eski adı `FileExport`, XML elle yüklenir), `mock` (yalnızca test), ya da entegratör adaptörü. Tanınmayan ad `manual` sayılır ve uyarı yazılır |
| `EInvoice__ApiKey` | Entegratör anahtarı (ayarlar ekranında yalnızca "tanımlı mı" görünür) |
