# 03 — Kapsam ve Konumlandırma

Bu belge, Luca sınıfı ERP planının **neyi kapsayıp neyi kapsamadığını**, ürünün kime satıldığını,
sürüm paketlerinin nasıl bölündüğünü ve başarının nasıl ölçüleceğini anlatır. Kaynak: `01-ORTAK-SARTNAME.md`
(şablon ve kurallar), `02-LUCA-ENVANTERI.md` (Luca ürün aileleri ve menü yapısı), `docs/SATIS-PLANI.md`
(rakip ve fiyat tablosu), `docs/PILOT-PAKETI.md` (ölçüt alışkanlığı).

## 1. Amaç ve kapsam

**Amaç.** Bugünkü YES Lojistik panelini, tek bir nakliye firmasının aracı olmaktan çıkarıp
**muhasebe çekirdeği + ticari modüller** üzerine kurulu, Luca sınıfı bir ERP'ye genişletmek. Lojistik işi
bu yapıda **atılmaz**; bir "satış/hizmet modülü" olarak çekirdeğe bağlanır. Böylece ürün hem bugünkü
nakliye müşterisini korur hem de aynı kodu benzer KOBİ'ye satılabilir hâle gelir.

**Neden mevcut kod tabanı?**

1. Ürün çalışıyor ve canlıda. `docs/YOL-HARITASI.md:99-101` geçiş günü akışını (ayna kapatılır, panel
   kayıt girişine açılır) tarif ediyor; yani kod tabanı zaten "gerçek muhasebe kaydı tutacak" olgunlukta.
2. Lojistik dikeyi hazır: sevkiyat, şoför uygulaması, takip linki, taşeron carisi, çek/senet.
   `docs/SATIS-PLANI.md:120-127` bu maddeleri "var" olarak listeliyor.
3. Beyaz etiket ve lisans altyapısı hazır: firma adı/logosu `CompanySettings`'ten gelir
   (`server/YesLojistik.Core/Entities/CompanySettings.cs:6`), paket kodları ve araç sınırı lisans
   anahtarındadır (`client/src/lib/licenseConstants.ts:18`).
4. Sıfırdan yeni depo açmak, bugün çözülmüş yüzlerce küçük sorunu (ayna, KDV, tek formül kâr,
   mobil çevrimdışı kuyruk) yeniden çözmek demektir.

**Kapsam içi (yapacağız).**

- **Muhasebe çekirdeği:** hesap planı, yevmiye fişi, mizan/kesin mizan, muavin, muhasebe dönemi,
  fiş iptali ve ters kayıt, e-Defter dosya üretimi, BA-BS verisi, adat/faiz, FIFO cari yaşlandırma.
- **Ticari modüller:** cari (müşteri+tedarikçi tek kart), fatura/e-Fatura, tahsilat/ödeme, kasa ve banka,
  çek/senet, stok ve depo, sipariş (satış+satınalma), gider/gelir merkezi, sabit kıymet, üretim/reçete,
  analiz ve bağımsız rapor tasarımı.
- **Lojistik modülü:** bugünkü sevkiyat, şoför, araç, gider, takip; muhasebe çekirdeğine bağlanır.
- **Ortak hizmetler:** belge numara serileri, çok şirketli veri izolasyonu, ek/dosya saklama, denetim izi,
  arka plan işleri, e-posta ve entegratör bağlantı noktaları.

**Kapsam dışı (yapmayacağız).** Aşağıdaki liste §1'in devamı sayılır; gerekçe §5'te ve §12'de.

- **Tam bordro ve SGK bildirgeleri.** Aylık maaş, avans ve prim takibi var
  (`server/YesLojistik.Core/Entities/Staff.cs:30`); bordro mevzuatı ayrı bir ürün işidir.
- **e-ticaret sitesi / sanal mağaza.** Luca'da StockMount gibi bir eklenti olarak geçiyor
  (`02-LUCA-ENVANTERI.md:53`); bizde ürün kapsamı dışıdır.
- **İthalat/ihracat dosya kapama.** Luca Koza'da var (`02-LUCA-ENVANTERI.md:55`); plan bu sürümde yok.
- **Banka kredisi, leasing, faktoring, yatırım modülü.**
- **Bordro dışı İK:** performans, izin, vardiya planlama yok. Üretim modülünde vardiya bir **alan**
  olarak kalır, planlama motoru yazılmaz.
- **Üretim maliyetlendirmesinin ileri seviyesi:** standart maliyet, sapma analizi, safha maliyeti yok.
  Yalnız reçeteden malzeme düşme ve işçilik/genel gider girişi var.
- **Kendi ödeme kuruluşumuz / tahsilat aracılığı.** Abonelik tahsilatı için hazır bir sağlayıcı
  kullanılır; **doğrulanacak:** hangi sağlayıcı, komisyon oranı, sözleşme (satıcı kararı).
- **Çoklu dil.** Arayüz Türkçe kalır.

**Bu belgenin kapsamı dışında kalanlar.** Ekran ekran alan listeleri `04-HEDEF-MIMARI.md` ve
`05-VERI-MODELI.md`; fiş üretim kuralları `06-MUHASEBE-MOTORU.md` içindedir. Fiyat ve sözleşme metni
`docs/SATIS-PLANI.md`'de kalır; bu belge fiyat **vermez**, paket **içeriği** verir.

## 2. Luca'daki karşılığı

| Luca ürünü | Kaynak | Bizim karşılığımız |
|---|---|---|
| Luca Net (KOBİ ticari yazılım) | <https://www.luca.com.tr/Urun/Index/luca-net-kobi-ticari-yazilim/6> | **Hedef sınıfımız.** Cari, fatura, stok, kasa, çek, e-Fatura, BA-BS, FIFO/adat |
| Luca Koza Standart | <https://www.luca.com.tr/Urun/Index/luca-koza-kurumsal-cozumler/7> | Yönetici, Stok Yönetimi, Fatura, Finans Yönetimi |
| Luca Koza Profesyonel | aynı sayfa | + Satış Yönetimi, Satınalma Yönetimi, Analizler, Gelir-Gider Yönetimi |
| Luca Mali Müşavir | <https://www.luca.com.tr/Urun/Index/luca-ile-gelecege-hazirsiniz/5> | **Yön seçimi:** SMMM ile entegre çalışma (mizan/yevmiye dışa aktarma) |
| Luca Rota | <https://www.luca.com.tr/Urun/Index/luca-rota-yazilimi/18> | Bizim lojistik modülünün karşılığı; içerik **doğrulanacak** |
| Luca Net One | <https://www.lucanetone.com.tr> | Bulut/tek platform; içerik okunmadı → **doğrulanacak** |

**Modül omurgası.** `02-LUCA-ENVANTERI.md:20-21` Koza'nın sekiz menüsünü listeliyor. Bizim modül
listemiz bu sekize dayanır; **doğrulanacak:** bu menülerin alt ekranları ve alan seviyesi (Luca demo,
tanıtım videosu ya da kullanıcı ekran görüntüsüyle teyit edilmeli — site metni menü adından öteye
inmiyor).

**Fiyat ve paket modeli.** Luca'nın fiyat sayfası güvenli metne çevrilemedi
(`01-ORTAK-SARTNAME.md:75`); "kontör" modeli teyit edilmedi. Bu yüzden paketlerimizi Luca'nın fiyatına
göre değil, **kendi maliyetimiz + rakip tablosuna** göre kuruyoruz (`docs/SATIS-PLANI.md:66-83`).
**doğrulanacak:** Luca'nın hangi modülü hangi pakette sattığı ve kullanıcı başı mı firma başı mı
ücretlendirdiği.

## 3. Bizde bugün

Bu bölümdeki her iddia `dosya:satır` kanıtlıdır.

**Var olan çekirdek parçalar:**

- Tek firmalı ayar kaydı: `CompanySettings` tablosu `Id = 1` ile tek satır varsayar
  (`server/YesLojistik.Core/Entities/CompanySettings.cs:5`).
- Ortak kayıt temeli: `BaseEntity` (Id, CreatedAt, UpdatedAt, CreatedBy, IsDeleted)
  (`server/YesLojistik.Core/Entities/BaseEntity.cs:3`).
- Yumuşak silme otomatik süzgeç olarak kurulu; bütün `BaseEntity` türevleri sorgulardan gizlenir
  (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:54-58`).
- Cari ayrımı iki ayrı tabloda: `Customer` (`server/YesLojistik.Core/Entities/Customer.cs:3`) ve
  `Supplier` (`server/YesLojistik.Core/Entities/Supplier.cs:4`). İkisi de devir bakiyesi taşıyor
  (`Customer.cs:25`, `Supplier.cs:21`).
- Fatura ve satırı (`server/YesLojistik.Core/Entities/Invoice.cs:3`), KDV ve tevkifat alanlarıyla
  (`Invoice.cs:15-17`).
- Tahsilat (`server/YesLojistik.Core/Entities/Payment.cs:3`); kasa/banka hesabı
  (`server/YesLojistik.Core/Entities/CashAccount.cs:4`); ara hesaplar arası virman `CashTransfer`
  (`CashAccount.cs:17`).
- Gider (`server/YesLojistik.Core/Entities/Expense.cs:3`); sevkiyat (`server/YesLojistik.Core/Entities/Trip.cs:3`).
- Denetim izi `AuditLog` (`server/YesLojistik.Core/Entities/AuditLog.cs:4`) ve dosya saklama
  `StoredFile` (`server/YesLojistik.Core/Entities/StoredFile.cs:4`).
- Fatura numarası atomik artış: `company_settings.next_invoice_number` satır kilidiyle
  (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:223-227`).
- e-Fatura numara dizisi seri+yıl başına boşluksuz (`server/YesLojistik.Infrastructure/EInvoice/EInvoiceService.cs:41-46`).
- Kâr hesabı tek formülde ve KDV hariç (`server/YesLojistik.Core/Domain/TripProfit.cs:1`).
- FIFO ödeme dağıtımı ve yaşlandırma kovaları
  (`server/YesLojistik.Core/Domain/PaymentAllocator.cs:19`, `PaymentAllocator.cs:64`).
- Lisans durumları ve paket kodları: `owner/active/grace/expired/invalid`
  (`server/YesLojistik.Core/Licensing/LicenseInfo.cs:6-10`), paket listesi
  (`client/src/lib/licenseConstants.ts:19-22`).
- Ayna modu yazma koruması (`server/YesLojistik.Api/Infrastructure/MirrorWriteGuard.cs:14-18`) ve
  abonelik bitince salt okunur (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:16-20`).
- Görünüm anahtarı: `DEFAULT_UI_MODE = 'classic'` (`client/src/lib/uiMode.ts:8`).
- Menü ve bölüm sekmeleri: `classicNav`/`newNav` (`client/src/lib/nav.ts:19`, `nav.ts:72`) ve
  `sections` (`client/src/lib/sections.ts:10`).

**Eksik olanlar (bugün kodda YOK):**

| Eksik | Kanıt / durum |
|---|---|
| Muhasebe çekirdeği (hesap planı, yevmiye, mizan, muavin, dönem) | Kodda hiçbir `Account`/`JournalEntry`/`AccountingPeriod` sınıfı yok; `server/YesLojistik.Core/Entities/` altında böyle dosya bulunmuyor |
| Stok/depo | `StockItem`, `Warehouse`, `StockMovement` sınıfı yok |
| Sipariş/satınalma | `Order`, `OrderLine` sınıfı yok; satın alma yalnız `PurchaseInvoice` düzeyinde (`server/YesLojistik.Core/Entities/PurchaseInvoice.cs:3`) |
| Üretim/reçete | `ProductionOrder`, `Recipe` sınıfı yok |
| Sabit kıymet | `FixedAsset` sınıfı yok |
| Çok şirketli veri | Bütün depoda `CompanyId`/`TenantId` alanı geçmiyor; arama sonucu boş |
| Modül bazlı lisans kapısı | `LicenseInfo.Has("...")` var (`LicenseInfo.cs:27`) ama üretim kodunda **hiç çağrılmıyor**; yalnız `server/YesLojistik.Tests/Unit/LicenseTokenTests.cs:90-147` içinde test ediliyor |
| Belge numara serisi genel altyapısı | Yalnız fatura numarası (`InvoiceService.cs:223`) ve e-Fatura dizisi (`EInvoiceService.cs:41`) var; serbestçe tanımlanan seri tablosu yok |
| BA-BS verisi | Kodda BA/BS üretimi yok (arama sonucu boş) |
| e-Defter | Kodda e-Defter üretimi yok |
| Banka ekstresi çekme/mutabakat | `BankStatement` sınıfı yok; banka entegrasyonu `docs/SATIS-PLANI.md:141`'de "doğrulanacak" |
| Türkçe tam kapsama | Terim tablosu onayı bekliyor (`docs/YOL-HARITASI.md:54`) |

## 4. Hedef ekranlar ve alanlar

Bu belge ekran alanı listesi vermez (o iş `04` ve `05`te). Burada yalnız **kapsam kararının görünen
yüzü** tablo hâlinde verilir: hangi modül, hangi menü grubunda, hangi pakette.

| Modül | Menü grubu | Paket (en düşük) |
|---|---|---|
| Sevkiyat (bugünkü lojistik) | Sevkiyat | Başlangıç |
| Cari (müşteri+tedarikçi tek kart) | Cari | Başlangıç |
| Fatura / e-Fatura / e-Arşiv | Cari | Başlangıç (e-Fatura: Standart) |
| Tahsilat / Ödeme / Kasa / Banka | Cari, Banka & Çek | Başlangıç |
| Çek / Senet | Banka & Çek | Başlangıç |
| Gider / Gelir-Gider merkezi | Öz Mal | Başlangıç |
| Muhasebe (hesap planı, yevmiye, mizan, muavin) | Muhasebe | Standart |
| e-Defter, BA-BS | Muhasebe | Profesyonel |
| Stok / Depo / Sayım | Stok | Standart |
| Sipariş (satış + satınalma) | Sipariş | Profesyonel |
| Üretim / Reçete | Üretim | Profesyonel |
| Sabit Kıymet | Muhasebe | Profesyonel |
| Analiz + bağımsız rapor tasarımı | Analiz | Standart (tasarım: Profesyonel) |
| Kullanıcı/rol yönetimi, denetim izi | Yönetici | Başlangıç |

**Kapsam dışı ekranlar açıkça:** bordro fişi, sanal mağaza vitrini, ithalat dosyası, banka kredisi,
izin/vardiya planlama, çoklu dil seçici.

## 5. İş kuralları

**Kapsam kararını belirleyen üç kural.**

1. **Tek ürün, tek kod tabanı.** Yeni modüller mevcut `client/`, `server/`, `mobile/` ağacının içinde
   büyür. Ayrı depo açılmaz (§12'de alternatif senaryo). Gerekçe: ayna, lisans, beyaz etiket, KDV ve
   şoför uygulaması aynı ürünün parçalarıdır; iki kopya bu dört şeyi iki kez bakım gerektirir.
2. **Klasik görünüm bozulmaz.** `DEFAULT_UI_MODE = 'classic'` kalır (`client/src/lib/uiMode.ts:8`).
   Yeni ERP ekranları da iki görünümde çalışır (`01-ORTAK-SARTNAME.md:17-19`).
3. **Migration yalnız ekleme.** Yeni modüller yeni tablolar ve boş olabilen yeni sütunlarla gelir
   (`01-ORTAK-SARTNAME.md:22-23`). Mevcut tablo/alan silinmez, dönüştürülmez.

**Kapsam dışı kararının gerekçeleri.**

| Yapmayacağımız | Gerekçe |
|---|---|
| Tam bordro | Mevzuat ağır ve sık değişiyor; hata maliyeti yüksek. Mali müşavir/avukat onayı gerekir. Personel avans/prim takibi bugünkü hâliyle yeterli (`docs/SATIS-PLANI.md:148`) |
| e-ticaret sitesi | Hedef müşteri (nakliyeci) web mağazası işi yapmıyor; kapsam şişer |
| İthalat/ihracat dosyası | Nakliyeci ithalatçı değil. Talep gelirse ayrı paket olarak yeniden değerlendirilir |
| İleri üretim maliyetlendirmesi | Hedef müşteri imalatçı değil; yalnız reçeteden malzeme düşme yeterli |
| Çoklu dil | Kullanıcı Türkçe çalışıyor; çeviri yükü getiri getirmiyor |
| Banka kredisi/faktoring | Finans ürünü; banka sözleşmeleri ve mevzuat gerektirir |

**Paket (sürüm) mantığı.** Paketler **araç sınırı + modül kapısı** ikilisiyle çalışır. Araç sınırı
bugün lisansa gömülü (`server/YesLojistik.Core/Licensing/LicenseToken.cs:14`); modül kapısı için aynı
`Features` dizisi genişletilir (`LicenseToken.cs:15`) ve `LicenseInfo.Has()` ile okunur
(`server/YesLojistik.Core/Licensing/LicenseInfo.cs:27`). Bugün bu kapı **hiçbir üretim kodunda
kullanılmıyor**; ilk kullanımı ERP modülleridir.

| Paket | Araç | Modüller | Not |
|---|---|---|---|
| Başlangıç | 5 | Sevkiyat, cari, fatura, tahsilat, kasa/banka, çek, gider | `licenseConstants.ts:19` ile uyumlu |
| Standart | 20 | + e-Fatura, stok/depo, muhasebe çekirdeği, analiz | `licenseConstants.ts:20` |
| Profesyonel | 50 | + sipariş, üretim, sabit kıymet, e-Defter, BA-BS, rapor tasarımcısı | `licenseConstants.ts:21` |
| Kurumsal | 50+ | + özel bağlantılar, ayrı sunucu | `licenseConstants.ts:22` |

**Fiyatlandırma kuralı.** Tutar bu belgede yazılmaz; satıcı kararı ve pilot sonucu bekler
(`docs/SATIS-PLANI.md:1-10`, karar 1 ve 7). **doğrulanacak:** Luca'nın ve rakiplerin güncel liste
fiyatı; pilot firmada ödeme isteği.

## 6. Veri modeli

Yeni tabloların alan alan tanımı `05-VERI-MODELI.md` içindedir. Bu belgede kapsam kararının veri
tarafındaki üç sonucu yazılır:

1. **Cari birleşmesi.** `Customer` (`Customer.cs:3`) ve `Supplier` (`Supplier.cs:4`) tabloları
   **silinmez**; üstlerine bir `Contact` kökü eklenir ve mevcut kayıtlar tek yönlü eşlenir
   (`ContactId` boş olabilen yeni sütun). Böylece hiçbir canlı kayıt dönüştürülmez
   (`01-ORTAK-SARTNAME.md:22-23`).
2. **Muhasebe çekirdeği yeni tablolar.** `Account`, `JournalEntry`, `JournalLine`, `AccountingPeriod`,
   `LedgerBalance` ilk kez bu planda gelir.
3. **Modül kayıt defteri.** Hangi modülün açık olduğu veritabanında değil **lisans anahtarında** tutulur
   (`LicenseToken.cs:15`); böylece müşteri kendi kendine modül açamaz. Panelde yalnız gösterim ve
   "paketi yükselt" yönlendirmesi olur.

## 7. API uçları

Bu belge uç listesi vermez (`04-HEDEF-MIMARI.md` §7). Kapsamla ilgili üç karar:

- Yeni ERP uçları `/api/erp/...` kökü altında toplanır; mevcut uçlar (`/api/trips`, `/api/invoices`)
  **yerinde kalır**. Böylece `main`'e giden her adım canlıyı bozmaz (`docs/YOL-HARITASI.md:3`).
- Modül kapısı tek bir ara katmanda denetlenir: lisans `Has("stok")` false ise `/api/erp/stock/*`
  yazma istekleri 403 döner. Salt okunur kural bugünkü desenle aynıdır
  (`server/YesLojistik.Api/Infrastructure/LicenseGuard.cs:18-20`).
- Ayna modu açıkken ERP yazma uçları da kapalı olur; koruma listesine yeni kökler eklenir
  (`MirrorWriteGuard.cs:14-18`).

## 8. Yetki, onay ve denetim izi

Bugün üç rol var: `Admin`, `Operations`, `Accounting` (`server/YesLojistik.Api/Auth/Policies.cs:15-17`).
ERP ile birlikte **rol değil yetki** yaklaşımına geçilir: "Muhasebe fişi görür/ekler/onaylar",
"stok sayımı yapar", "fiyat görür". İlkeler:

- Muhasebe fişi **maker-checker**: giren kişi ile onaylayan kişi aynı olamaz. Onay izi `AuditLog`
  benzeri bir kayıtta tutulur (`server/YesLojistik.Core/Entities/AuditLog.cs:4`).
- Kâr ve maliyet görme ayrı bir yetkidir; bugün her ofis kullanıcısı kârı görüyor
  (`docs/SATIS-PLANI.md:167`).
- Silme yok, **iptal** var: fatura zaten iptal edilir, numara boşluğu oluşmaz
  (`server/YesLojistik.Infrastructure/Services/InvoiceService.cs:203`).

## 9. Kabul kriterleri

Ölçülebilir ve test edilebilir olmalı:

| # | Ölçüt | Hedef |
|---|---|---|
| 1 | Bugünkü 10 işin hiçbiri yavaşlamaz | `docs/plan/01-ORTAK-SARTNAME.md:223-237`'deki ölçütler korunur |
| 2 | Klasik görünümde kayıp | Klasik menüde 23 öğe aynı kalır (`client/src/lib/nav.ts:19-66`) |
| 3 | Yeni modül ekranı iki görünümde de çalışır | Her yeni sayfa için 1 klasik + 1 yeni görünüm e2e senaryosu |
| 4 | Paket kapısı | Kapalı modülün yazma ucu 403 döner; en az 3 test |
| 5 | Çok şirketli izolasyon | Aynı veritabanında iki şirket; hiçbir listede karşı şirketin kaydı görünmez; en az 5 test |
| 6 | Demo/örnek veri | Başka firmaya kurulumda `Seed__SampleData` kapalı gelir (`docs/GELISTIRME-PLANI.md:144`) |
| 7 | Lisanssız çalışma | Anahtar yoksa sahip modu; hiçbir ERP modülü kapanmaz (`LicenseInfo.cs:29`) |
| 8 | Süre bitimi | Salt okunur; muhasebe fişi **girilemez**, mizan görüntülenebilir |
| 9 | Belge numarası | Seri bazında boşluk yok; eşzamanlı iki kayıt çakışmaz |
| 10 | Geri dönüş | Yeni modül kapatıldığında eski ekranlar aynen çalışır; migration geri alınmaz, modül bayrağı kapanır |

**Başarı ölçütleri (ürün düzeyi, KPI).** Pilot ölçütleri `docs/PILOT-PAKETI.md:21-30`'dan alınır ve
ERP için genişletilir:

| KPI | Hedef | Nasıl ölçülür |
|---|---|---|
| Panelde geçen kayıt oranı | Sevkiyatların %80'i, faturaların %50'si panelde | Firmanın kendi sayımı ile panel sayımı |
| Haftalık kullanım | Haftada 4+ işlem günü | Kayıt oluşturulan gün sayısı |
| Muhasebe aktarımı | Ay sonunda muhasebeciye Excel/XML gönderimi 15 dakikadan kısa | `client/src/pages/ReportsPage.tsx:388` ekranındaki aktarım süresi |
| Mizan tutarlılığı | Borç = alacak, her fiş için | Otomatik test |
| Cari mutabakat | Fark < 0,05 TL | `docs/GELISTIRME-PLANI.md:124` kuralı |
| Memnuniyet | 10 üzerinden 7+ | Pilot sonu tek soru |
| Ödeme niyeti | Somut teklif talebi | Pilot sonu görüşme |

## 10. Testler

- **Birim:** hesap planı ağacı, fiş dengesi (borç=alacak), KDV/tevkifat hesabı, belge numarası artışı,
  paket kapısı. Mevcut test düzeni: `server/YesLojistik.Tests/Unit/` (ör.
  `server/YesLojistik.Tests/Unit/InvoiceCalculatorTests.cs`).
- **Entegrasyon:** fatura kesilince stok/cari/muhasebe hareketi oluşması; çok şirketli süzgeç; mizan
  toplamı. Düzen: `server/YesLojistik.Tests/Integration/`.
- **e2e:** yeni ERP sayfaları için `client/e2e/` altına spec; yeni görünüm için
  `client/e2e/new-ui/` klasörü (`docs/plan/01-ORTAK-SARTNAME.md:181`).
- **Kabul testi:** muhasebeciye aktarım (Excel + XML ZIP) uçtan uca; iki şirketli kurulumda veri
  sızıntısı testi.

## 11. Efor ve bağımlılıklar

| İş | Efor (kişi-gün) | Önce bitmeli |
|---|---|---|
| Çok şirketli temel (CompanyId + global süzgeç + yetki) | 15-25 | — |
| Belge numara serisi altyapısı | 3-5 | — |
| Muhasebe çekirdeği (hesap planı, yevmiye, mizan, muavin, dönem) | 30-45 | Çok şirketli temel |
| Otomatik fiş üretimi (fatura, tahsilat, kasa, çek, masraf) | 15-20 | Muhasebe çekirdeği |
| Cari birleşmesi (`Contact`) | 8-12 | Çok şirketli temel |
| Stok/depo | 15-25 | Belge serisi, muhasebe çekirdeği |
| Sipariş (satış+satınalma) | 15-20 | Stok |
| Üretim/reçete | 10-15 | Stok |
| Sabit kıymet | 5-8 | Muhasebe çekirdeği |
| e-Defter, BA-BS | 10-15 | Muhasebe çekirdeği |
| Modül kapısı + paket yönetimi | 5-8 | Lisans altyapısı (var) |
| Analiz + rapor tasarımcısı | 15-25 | Çekirdek modüller |

Toplam kaba büyüklük **150-230 kişi-gün**; bu, sıfırdan yazmaya göre yaklaşık **üçte bir**dir
(gerekçe §12).

**Sıra kuralı:** `06-MUHASEBE-MOTORU.md` ürün dökümünden önce bitmeli; fiş kuralları netleşmeden stok
ve sipariş modülü yazılmaz (yanlış hareket üretir).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma |
|---|---|---|
| Çok şirketli geçiş canlı veriyi bozar | Yüksek | Migration yalnız ekleme; `CompanyId` önce boş, sonra tek şirkete doldurulur; iki şirketli test |
| Muhasebe hatası mali sorumluluk doğurur | Yüksek | Fiş dengesi zorunlu; maker-checker; mali müşavir onayı gerekir |
| Kapsam şişmesi (her istek modül olur) | Orta | Bu belgedeki "kapsam dışı" listesi yazılıdır; değişiklik yeni belge ister |
| Paket kapısı yanlış kurulur da müşteri modül kaybeder | Orta | Sahip modu ve Kurumsal pakette kapı yok; kapı yalnız yazmada |
| Belge numarası boşluğu | Orta | Satır kilidi deseni (`InvoiceService.cs:223-227`) tüm serilere uygulanır |
| Terim onayı gecikir | Düşük | Ekran metinleri `docs/TERIMLER.md` onayına bağlı; toplu değişiklik yapılmaz |

**Alternatif senaryo: ayrı ürün / ayrı depo açmak.**

| Soru | Cevap |
|---|---|
| Ne zaman mantıklı? | (a) Hedef müşteri lojistik dışına tamamen çıkarsa; (b) bugünkü ürünün sürüm hızı yeni modüller yüzünden düşerse; (c) ayrı bir ekibin ayrı takvimle çalışması gerekirse; (d) lisans/dağıtım modeli taban tabana değişirse |
| Maliyeti ne? | Ortak parçaların yeniden yazımı: kimlik doğrulama + 2FA, yetki, ayna, lisans, beyaz etiket, KDV motoru, kâr formülü, sevkiyat/şoför, PDF/Excel çıktıları. Kaba tahmin **80-120 kişi-gün** yalnız "bugünkü hâle gelme" + sürekli iki kat bakım |
| Bugün neden mantıklı değil? | Aynı müşteri kitlesine iki ürün satmak destek ve satış yükünü ikiye çıkarır; `docs/SATIS-PLANI.md:1` "A: her müşteriye ayrı kurulum" kararı zaten tek kod tabanı varsayıyor |
| Hangi durumda yeniden bakılır? | 20+ müşteriden sonra (karar 3, `docs/SATIS-PLANI.md:9`) çok kiracılı mimari değerlendirmesiyle birlikte |

**doğrulanacak:** Luca fiyat/paket modeli ve kontör tanımı; Luca Koza alt ekranları (menü ötesi);
Luca Rota kapsamı; e-Defter berat/defter dosya biçimi (GİB/mali müşavir); BA-BS zorunluluk sınırları;
e-Fatura entegratör seçimi ve ücreti; abonelik ödeme sağlayıcısı ve komisyonu; pilot firmalarda ödeme
isteği. Mevzuat yorumu bu belgede yapılmaz; **mali müşavir/avukat onayı gerekir**.

Sonraki belgeyle bağlantı: `04-HEDEF-MIMARI.md` bu kapsamı katmanlara ve modül kayıt defterine çevirir;
`05-VERI-MODELI.md` tabloları, `06-MUHASEBE-MOTORU.md` fiş kurallarını tanımlar.
