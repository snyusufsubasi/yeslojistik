# 28 — Muhasebeci Paketi

Bu belge, panelin **mali müşavirle entegre çalışmasını** anlatır: muhasebecinin kendi hesabıyla bağlı
firmaları görmesi, fiş önerisi ve onayı, belge üzerinden fiş görme ve iptal, kayıt aktarımı, mizan ve
fiş dışa aktarma, mutabakat ve notlaşma, yetki izolasyonu. Amaç mali müşavirlik yapmak değil, mali
müşavirin kendi programına gireceği veriyi **doğru ve eksiksiz** üretmektir.

## 1. Amaç ve kapsam

**Bugünkü durum.** Ay sonunda panelden bir Excel ve bir ZIP indirilir, e-posta ile muhasebeciye
gönderilir. Aktarımın içeriği sabittir ve tek yönlüdür; muhasebecinin ne yaptığı, hangi kaydı aldığı,
hangisini reddettiği panelde görünmez. Bir hata çıktığında (eksik fatura, yanlış KDV satırı, çift
kayıt) iz sürülemez, çünkü geri bildirim yoktur.

**Bu belge neyi çözer.**

1. **Muhasebeci girişi.** Mali müşavir kendi hesabıyla girer, yalnız **yetkili olduğu firmaları** görür
   ve firma değiştirir. Başka firmanın verisine erişemez.
2. **Belge → fiş görünümü.** Her belge (satış faturası, alış faturası, tahsilat, ödeme, masraf) için
   fiş önerisi gösterilir; muhasebeci onaylar, düzeltir ya da reddeder.
3. **Fiş iptali ve ters kayıt.** Belge üzerinden fişe gidilir, gerekçeli iptal/ters kayıt yapılır
   (Luca Koza'da bu özellik var: `docs/plan-erp/02-LUCA-ENVANTERI.md:46-47`).
4. **Kayıt aktarımı.** Ay sonu aktarımı tek düğmeyle üretilir; biçim mali müşavirin programına göre
   seçilir. Aktarım, alındı bilgisi ve mutabakat durumu kayıt altına alınır.
5. **Mizan ve fiş dışa aktarma.** Mizan, muavin ve fiş listesi Excel/CSV/PDF olarak iner.
6. **Mutabakat ve notlaşma.** İki taraf aynı dönemi görür; farklar (bizde olup onlarda olmayan kayıt)
   listelenir; karşılıklı not yazılır.
7. **Yetki izolasyonu.** Firma sınırı sunucuda zorlanır; panelde gizlemek yeterli sayılmaz.

**Bu belge neyi çözmez.** Muhasebe çekirdeğinin kendisi (`06-MUHASEBE-MOTORU.md`), e-belge gönderimi
(`08-E-BELGE-KATMANI.md`), çok firma veri modeli (`30-COK-SIRKETLI-KONSOLIDASYON.md`), bordro
(`18-PERSONEL.md`). **Mali müşavirlik hizmeti verilmez**: beyanname üretilmez, vergi hesabı
sorumluluğu alınmaz (`docs/hukuk/KULLANIM-SARTLARI.md:60`). Mevzuat yorumu yapılmaz; oran, kod ve
beyan kuralları için "mali müşavir/avukat onayı gerekir" denir.

## 2. Luca'daki karşılığı

| Luca ürünü | Kaynak | Bizdeki karşılığı |
|---|---|---|
| **Luca Mali Müşavir** (SMMM ve müşterileri) | <https://www.luca.com.tr/Urun/Index/luca-ile-gelecege-hazirsiniz/5> | Muhasebeci girişi, bağlı firmalar ekranı, belge→fiş akışı |
| **Luca MMP — Kayıt Aktarımı** | <https://www.luca.com.tr/Sayfa/luca-kayit-aktarimi/64> | Ay sonu kayıt aktarımı ve aktarım kaydı |
| **Luca Koza** — SMMM'ler ve müşterilerinin entegre çalışması, tüm işlemlerin tek ekrandan muhasebeleştirilmesi, belge üzerinden muhasebe fişi iptali | `docs/plan-erp/02-LUCA-ENVANTERI.md:46-47` | Belge→fiş ekranı, fiş iptali/ters kayıt |
| **Luca Net** — Excel ile yevmiye fişi ve fatura aktarımı | `02-LUCA-ENVANTERI.md:28-29` | Dışa aktarma biçimleri |
| **Online cari hesap mutabakatı** | `02-LUCA-ENVANTERI.md:50` | Mutabakat sekmesi |

Luca, mali müşavir ile mükellefi **aynı ürün ailesi içinde** buluşturuyor: muhasebeci mükellefin
kayıtlarını kendi ekranından muhasebeleştiriyor, mükellef de aynı belgeyi görüyor. Bizde bu, çok
firmalı veri modeli (`30-COK-SIRKETLI-KONSOLIDASYON.md`) ve firma bazlı yetki üzerine kurulur.

**doğrulanacak:**

- **Luca MMP kayıt aktarımının dosya biçimi.** Alan sırası, kodlama, tarih/tutar biçimi, hesap kodu
  eşlemesi, satır sonu ve karakter kümesi. Kaynak: Luca kullanıcı kılavuzu ve **mali müşavirin kendi
  programından alacağı örnek dosya**. Bu belgede biçim **uydurulmaz**; yalnız "hedef biçim" olarak
  tarif edilir ve örnek dosya gelene kadar kendi sade biçimimiz kullanılır.
- **Luca'nın muhasebeci yetki modeli.** Bir muhasebeci kaç mükellefe bağlanabilir, firma değiştirme
  nasıl çalışır, hangi alanlar gizlenir (ör. kâr, taşeron fiyatı). Kaynak: Luca demo erişimi ve
  ürün tanıtımı.
- **Muhasebecinin beklediği asgari alanlar.** Hangi belge türünde hangi alan zorunlu (ör. tevkifat
  kodu, istisna kodu, masraf merkezi). Kaynak: **mali müşavir** yazılı listesi.
- **Aktarım biçimleri listesi.** Mikro ve Logo için hedef biçim ve varsa API. Kaynak: program satıcısı
  ve mali müşavir.
- **Mutabakat onayının hukuki değeri.** Karşı tarafın panelden onaylaması ne anlama gelir, saklama
  süresi ne olmalı. Kaynak: **avukat/mali müşavir onayı**; bu belge yorum yapmaz.

## 3. Bizde bugün

Bu bölümdeki her iddia `dosya:satır` kanıtlıdır.

**Var olan ve yeniden kullanılacak parçalar.**

| Parça | Ne yapar | Kanıt |
|---|---|---|
| Muhasebeciye aylık aktarım | Tek Excel: Satış Faturaları, Tahsilatlar, Giderler, Taşeron Maliyetleri, Taşeron Ödemeleri sayfaları | `server/YesLojistik.Api/Controllers/EInvoiceController.cs:74`, `:88-134` |
| e-Fatura XML ZIP'i | Aralıktaki faturaların UBL-TR XML'leri tek ZIP | `EInvoiceController.cs:136-149` |
| Yetki | Aktarım uçları yalnız `Accounting` politikasına açık | `EInvoiceController.cs:77`, `server/YesLojistik.Api/Auth/Policies.cs:17` |
| Panel düğmeleri | "Muhasebe Excel'i" ve "e-Fatura XML (ZIP)" düğmeleri ay seçiciyle | `client/src/pages/ReportsPage.tsx:390`, `:402`, `:409-410` |
| Muhasebe Aktarımı sekmesi | Raporlar sayfasında ayrı sekme | `client/src/pages/ReportsPage.tsx:16`, `:51`, `:74` |
| Cari ekstre | Müşteri ekstresi, tarih aralığı ve "faturasız seferleri göster" seçeneğiyle | `server/YesLojistik.Api/Controllers/CustomersController.cs:86-88` |
| Ekstre e-postası | Ekstreyi müşteriye e-posta ile gönderme | `CustomersController.cs:100-101` |
| Cari dışa aktarma | Müşteri/tedarikçi cari listesi Excel ve PDF, ekrandaki süzgeçle | `CustomersController.cs:43`, `client/src/pages/CariPage.tsx:158-159` |
| Yetki yardımcıları | `can('accounting')` panelde; `Policies.AccountingRoles` sunucuda | `client/src/lib/auth.tsx:77` civarı, `Policies.cs:17` |
| Rol kümesi | Dört rol: `Admin`, `Operations`, `Accounting`, `Driver` — ayrı "muhasebeci" rolü yok | `server/YesLojistik.Core/Entities/Enums.cs:3` |
| Denetim izi | `AuditLog` + otomatik `AuditTrail` | `server/YesLojistik.Core/Entities/AuditLog.cs:4`, `server/YesLojistik.Infrastructure/Data/AuditTrail.cs:9` |
| Excel üretimi | Ortak Excel yazıcı ve para/tarih biçimleri | `server/YesLojistik.Infrastructure/Services/ExcelExporter.cs:1-20` |
| İçe aktarma iskeleti | Sütun sözlüğü ve tür dağıtımı (yevmiye fişi türü **yok**) | `server/YesLojistik.Infrastructure/Services/ImportService.cs:36-55`, `:320-330` |
| Firma ayarı (tek satır) | `CompanySettings` `Id = 1` varsayar | `server/YesLojistik.Core/Entities/CompanySettings.cs:5` |
| Şifreli sır saklama deseni | TOTP anahtarı AES-GCM + HKDF | `server/YesLojistik.Api/Auth/TwoFactorService.cs:52-68` |

**Eksik olanlar.**

| # | Eksik | Kanıt (yokluk) |
|---|---|---|
| 1 | Muhasebeci rolü ve firma bağlantısı | Rol kümesi dört değerli (`Enums.cs:3`); kullanıcı-firma ilişkisi tablosu yok |
| 2 | Firma kavramı ve `CompanyId` | Bütün depoda `CompanyId`/`TenantId` yok (`docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md:127`); ayar tek satır (`CompanySettings.cs:5`) |
| 3 | Yevmiye fişi ve hesap planı | `Account`/`JournalEntry` sınıfı yok (`docs/plan-erp/03-KAPSAM-VE-KONUMLANDIRMA.md:122`) |
| 4 | Fiş önerisi/onayı akışı | Yalnız gider onayı var (`server/YesLojistik.Api/Controllers/ExpensesController.cs:145`); fiş onayı kavramı yok (`docs/plan-erp/07-YETKI-ONAY-NUMARALANDIRMA.md:224`) |
| 5 | Belge → fiş bağı | `Invoice`/`Expense`/`Payment` üzerinde fiş kimliği alanı yok (`docs/plan-erp/05-VERI-MODELI.md:447-453`) |
| 6 | Fiş iptali/ters kayıt | Kavram yok; `AuditTrail` yalnız veri değişikliğini yazar (`AuditTrail.cs:54-56`) |
| 7 | Mizan/muavin | Kodda yok (`docs/plan-erp/06-MUHASEBE-MOTORU.md:88`) |
| 8 | Aktarım kaydı ve alındı bilgisi | Aktarım her seferinde yeniden üretilir; "kim ne zaman indirdi" dışında kayıt yok, "muhasebeci aldı" bilgisi yok |
| 9 | Biçim seçimi | Tek biçim: kendi Excel'imiz (`EInvoiceController.cs:109-133`); Luca/Mikro/Logo hedef biçimi yok |
| 10 | Mutabakat ekranı ve notlaşma | Repoda "mutabakat" yalnız **veri aktarımı mutabakatı** anlamında geçiyor (`docs/plan-erp/09-CARI-YONETIMI.md:211-214`); çift yönlü akış yok |
| 11 | Firma değiştirme | Oturumda firma taşınmıyor; `ICurrentUser` yalnız `Id`/`Name` veriyor (`server/YesLojistik.Core/Abstractions/ICurrentUser.cs:3`) |
| 12 | Muhasebeci görünümünde alan gizleme | Süzgeç yok; kâr/taşeron fiyatı gibi alanlar için kural tanımsız |

**Özet.** Bugün elimizde **doğru veriyi üreten tek yönlü bir aktarım** var; olmayan, aktarımın
**karşı tarafı**: muhasebeci girişi, fiş akışı, mutabakat ve iz. Bu belge onu kurar.

## 4. Hedef ekranlar ve alanlar

Yeni ekranlar `docs/plan-erp/01-ORTAK-SARTNAME.md:51-59` ortak parçalarını yeniden kullanır
(`PageShell`, `DataTable`, `MobileCards`, `Modal`, `SumStrip`, `FilterBar`). Klasik görünüm korunur
(`client/src/lib/uiMode.ts:8`); yeni ekranlar iki görünümde de çalışır.

### 4.1 Ekran: Muhasebeci paneli — Bağlı firmalar (`/muhasebe`)

Muhasebeci giriş yaptığında gördüğü ilk ekran. Panelde menü öğeleri firma seçilmeden görünmez.

| Sütun | İçerik |
|---|---|
| Firma | Ticari ünvan (kısa ad) |
| VKN | Maskesiz, tam (muhasebeci için gerekli) |
| Dönem | Açık dönem (`2026`) ve kapanış durumu |
| Bekleyen iş | Onay bekleyen fiş sayısı, eksik belge sayısı |
| Son aktarım | Tarih-saat ve aktarım durumu (`Alındı` / `Bekliyor` / `Fark var`) |
| İşlem | **Aç**, **Aktarım geçmişi** |

Süzgeçler: firma adı araması, dönem, "bekleyen işi olanlar". Sayfalama zorunlu (`DataTable` deseni).

### 4.2 Ekran: Firma çalışma alanı (`/muhasebe/{firmaId}`)

Firma seçildikten sonra açılan çalışma alanı; dört sekme.

**Sekme 1 — Bekleyen belgeler.** Belge listesi: tür, tarih, no, cari, matrah, KDV, tevkifat, toplam,
fiş durumu (`Öneri yok` / `Öneri hazır` / `Onaylandı` / `Reddedildi` / `Farklı kayıt`).

**Sekme 2 — Fiş önerileri.** Fiş başlığı ve satırları; her satırda hesap kodu, hesap adı, borç, alacak,
açıklama. Toplamlar `SumStrip` ile gösterilir; borç ≠ alacak ise kaydetme kapalıdır.

**Sekme 3 — Mizan ve muavin.** Tarih aralığı, hesap kodu aralığı, "sıfır bakiyeleri gizle" seçeneği.
Dışa aktarma: Excel, CSV, PDF.

**Sekme 4 — Mutabakat ve notlar.** Dönem seçilir; iki tarafın kayıtları karşılaştırılır; farklı
satırlar üç grupta listelenir (bizde var–onlarda yok, onlarda var–bizde yok, tutar farkı). Altında
not akışı: yazan kişi, zaman, not metni, ilişkili belge.

### 4.3 Ekran: Belge → fiş (`/muhasebe/{firmaId}/belge/{tur}/{id}`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Belge özeti | salt okunur | — | Tür, no, tarih, cari, tutarlar |
| Belge kalemleri | tablo | — | Satır satır matrah, KDV oranı, tevkifat |
| Fiş önerisi | tablo (düzenlenebilir) | Evet | Hesap kodu, borç, alacak, açıklama |
| Fiş tarihi | tarih | Evet | Belge tarihi önerilir |
| Fiş no | metin (20) | Hayır | Boşsa seriden üretilir |
| Gerekçe | metin (300) | Red/iptalde evet | Onay/ret/iptal gerekçesi |
| Ek dosya | dosya | Hayır | Belge görseli, muhasebe notu |

Düğmeler: **Öneri üret**, **Onayla**, **Reddet**, **Düzelt ve onayla**, **Fişi iptal et (ters kayıt)**,
**Belgeyi PDF indir**.

### 4.4 Ekran: Kayıt aktarımı (`/muhasebe/{firmaId}/aktarim`)

| Alan | Tip | Zorunlu | Davranış |
|---|---|---|---|
| Dönem | ay/yıl | Evet | Varsayılan: geçen ay |
| Aktarım türü | çoklu seçim | Evet | Satış faturası, alış faturası, tahsilat, ödeme, masraf, yevmiye fişi, cari bakiye |
| Biçim | seçim | Evet | `Panel Excel (bugünkü)`, `Sade CSV`, `Luca MMP (doğrulanacak)`, `Mikro (doğrulanacak)`, `Logo (doğrulanacak)` |
| Fiş sayısı | salt okunur | — | Üretilecek fiş adedi |
| Eksik belge kontrolü | onay kutusu | Evet (varsayılan açık) | Eksik belge varsa uyarır, listeler |
| Not | metin (500) | Hayır | Muhasebeciye not |

Aktarım listesi: tarih, dönem, biçim, fiş adedi, dosya boyutu, indiren kişi, **alındı durumu**,
mutabakat durumu, hata notu.

### 4.5 Ekran: Notlaşma ve mutabakat onayı

| Alan | Tip | Zorunlu |
|---|---|---|
| Dönem | seçim | Evet |
| Fark listesi | tablo (salt okunur) | — |
| Fark gerekçesi | metin (500) | Fark varsa evet |
| Düzeltme kaydı | bağlantı | Hayır |
| Onay | düğme | Evet (karşı taraf) |

**Kural:** onaylanan mutabakat değiştirilemez; yeni dönem için yeni mutabakat açılır
(`docs/plan-erp/09-CARI-YONETIMI.md:429`).

## 5. İş kuralları

### 5.1 Firma izolasyonu

- Muhasebeci yalnız **bağlı olduğu firmaları** görür. Bu, sunucuda firma süzgeciyle zorlanır
  (`docs/plan-erp/04-HEDEF-MIMARI.md:164-167`), panelde gizlemekle yetinilmez.
- İstek gövdesinde başka firmaya ait kimlik gönderilirse istek **403** ile reddedilir ve denetim izine
  yazılır. Bugünkü desen: `AppDbContext` global süzgeci
  (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:54-58`).
- Rol ve firma **birlikte** değerlendirilir: `Accounting` rolü olan kullanıcı, firma bağlantısı yoksa
  hiçbir veri görmez.
- Firma değiştirme oturumda taşınır; her istek "hangi firma" bilgisini açıkça gönderir. Yanlış firma
  bağlamı **sessizce** düzeltilmez; hata verilir.
- **Alan gizleme:** muhasebeci görünümünde kâr, taşeron fiyatı, şoför primi, komisyon ve müşteriye
  yansımayan maliyet alanları **gösterilmez**. Kural sunucuda (yanıt modeli) uygulanır; yalnız ekranda
  gizlemek yasaktır. Hangi alanların gizleneceği **doğrulanacak:** mali müşavir listesi.

### 5.2 Fiş önerisi ve onayı

1. **Öneri üretimi.** Belge türüne göre eşleme tablosu kullanılır (satış faturası → 120/600/391 gibi).
   Eşleme **şirket ayarında** tutulur ve görünürdür; kodda sabit değildir
   (`docs/plan-erp/06-MUHASEBE-MOTORU.md:471` risk notu).
2. **Öneri tek başına yetmez.** Muhasebeci onaylamadan fiş kesinleşmez; taslak kalır.
3. **Maker-checker.** Fişi giren kişi (ör. panel operatörü) onaylayamaz; onay muhasebeciye aittir
   (`docs/plan-erp/06-MUHASEBE-MOTORU.md:314`).
4. **Denge zorunlu.** Borç toplamı ≠ alacak toplamı ise onay düğmesi kapalıdır ve sunucu da reddeder.
5. **Kapanmış dönem.** Kapanan döneme yeni fiş girilmez; düzeltme yeni dönemde yapılır
   (`docs/plan-erp/06-MUHASEBE-MOTORU.md:233`). Kapanmış döneme kayıt engelinin yasal dayanağı
   **doğrulanacak:** mali müşavir.
6. **Yuvarlama.** Para 2 kuruş; KDV/tevkifat hesabı mevcut motordan gelir
   (`server/YesLojistik.Core/Domain/InvoiceCalculator.cs:9`, `server/YesLojistik.Core/Domain/Money.cs:3`).
   Aktarımda satır toplamı ile belge toplamı arasındaki fark **0,05 TL**'yi geçemez
   (`docs/GELISTIRME-PLANI.md:124` kuralı).
7. **Belge değişirse.** Onaydan sonra belge düzeltilirse (ör. fatura iptali) fiş otomatik değişmez;
   "fark var" uyarısı üretilir ve muhasebeci kararı beklenir.

### 5.3 Fiş iptali ve ters kayıt

- Fiş **silinmez**. İptal, ters kayıtla yapılır: aynı tutarlar ters yönde, gerekçe ve asıl fiş bağıyla.
- İptal/ters kayıt yalnız `ledger.approve` yetkisiyle ve **gerekçe zorunlu** olarak yapılır
  (`docs/plan-erp/06-MUHASEBE-MOTORU.md:315`).
- Belge üzerinden iptal, belgenin kendi durumunu **değiştirmez** (fatura iptali ayrı bir iştir,
  `11-SATIS-FATURA.md`); yalnız muhasebe kaydını tersler ve iki yön arasında bağ kurulur.
- İptal edilen fiş listede kalır, üstü çizili gösterilir; dışa aktarımda "iptal" sütunu dolu gelir.

### 5.4 Kayıt aktarımı

- **Kaynak:** onaylanmış fişler ve belgeler. Onaysız taslak fişler aktarıma **girmez** (varsayılan).
- **Kapsam:** dönem bazlı; dönem dışına taşan belge (ör. geç gelen alış faturası) için "geç gelen
  belgeler" ayrı sayfa olarak eklenir.
- **Tekrar aktarım:** aynı dönem tekrar aktarılabilir; dosya **sürüm numarası** taşır (`v1`, `v2`) ve
  önceki aktarım silinmez. Gerekçe: muhasebeci hangi sürümü aldığını bilmeli.
- **Alındı bilgisi:** muhasebeci dosyayı panelden indirdiğinde aktarım kaydı "indirildi" olur.
  Dışa aktarılıp e-postayla gönderilen dosyada bu bilgi **yoktur**; bu yüzden panel içi indirme
  teşvik edilir.
- **Hedef biçim.** Kendi Excel'imiz bugünkü beş sayfayı korur (`EInvoiceController.cs:110-132`).
  Luca MMP/Mikro/Logo biçimleri **doğrulanacak:** örnek dosya gelmeden yazılmaz; gelene kadar
  "Sade CSV" (başlık satırı + alan adları) sunulur.
- **Numara/ETTN.** Aktarımda fatura numarası ve ETTN aynen taşınır; muhasebeci tarafında tekrar
  numaralandırma yapılmaz.
- **Gizli alanlar.** Maliyet, kâr ve taşeron fiyatı aktarım dosyasına da **yazılmaz** (dosya
  paylaşılabilir olduğu için ekran kuralıyla aynı).
- **Dosya güvenliği.** Aktarımda kimlik bilgisi, IBAN tam numarası ve şoför özel verisi bulunmaz;
  IBAN maskeli taşınır (`27-ENTEGRASYONLAR.md` §5.3).

### 5.5 Mutabakat ve notlaşma

- **Tanım.** Mutabakat, dönem sonunda iki tarafın aynı kayıtları gördüğünü **kayıt altına alan** bir
  belgedir. Fark varsa önce fark, sonra fark gerekçesi yazılır.
- **Karşı taraf onayı.** Onaylayan kişi, zaman ve IP denetim izine yazılır. API tabanlı otomatik onay
  yoktur.
- **Fark eşiği.** Toplam fark 0,05 TL'nin altındaysa "fark yok" varsayılır; üstündeyse gerekçe
  zorunludur.
- **Otomatik düzeltme yoktur.** Fark, kayıt eklenerek/silinerek kapatılmaz
  (`docs/plan-erp/09-CARI-YONETIMI.md:432`).
- **Notlaşma.** Notlar silinemez; düzeltme yeni not olarak yazılır. Not yazışması belgeyle
  ilişkilendirilebilir. Notlarda gizli alan paylaşılmaz.

### 5.6 Yetki izolasyonu (özet kurallar)

| Kural | Nasıl zorlanır |
|---|---|
| Muhasebeci yalnız bağlı firmayı görür | Sunucuda firma süzgeci + her istekte firma bağlamı denetimi |
| Firma değiştirme açık seçimle | Oturumda aktif firma; ekranda firma adı her zaman görünür |
| Başka firmaya erişim denemesi | 403 + denetim izi kaydı; kullanıcıya "Bu firmaya erişiminiz yok" |
| Alan gizleme | Yanıt modelinde alan hiç gönderilmez (ekranda gizleme yetmez) |
| Toplu dışa aktarma | Yalnız seçili firma; "tüm firmalar" seçeneği yalnız sahip/yöneticide |
| Oturum süresi | Kısa erişim belirteci + yenileme (`Program.cs:58-78` deseni) |

## 6. Veri modeli

Yeni tablolar `05-VERI-MODELI.md` kararlarına uyar; `CompanyId` taşır, migration **yalnız ekleme**.

**`CompanyUser` (Y).** Amaç: kullanıcı–firma bağlantısı ve firma içi rol. Alanlar: `Id`, `UserId`,
`CompanyId`, `RoleInCompany` (`Owner`/`Manager`/`Accountant`/`Viewer`), `IsDefault`, `CanSeeProfit`
(varsayılan `false` muhasebeci için), `CreatedAt`, `UpdatedAt`, `CreatedBy`, `IsDeleted`. İndeksler:
tekil `(user_id, company_id)`; `(company_id)`. İlişkiler: `User`, `Company`.

**`DocumentLink` (Y).** Amaç: belge → fiş bağı. Alanlar: `Id`, `CompanyId`, `DocumentType`
(`Invoice`/`PurchaseInvoice`/`Payment`/`SupplierPayment`/`Expense`/`Trip`), `DocumentId`,
`JournalEntryId`, `LinkKind` (`Proposed`/`Approved`/`Rejected`/`Reversed`), `Reason`, `CreatedBy`,
`CreatedAt`. İndeksler: tekil `(company_id, document_type, document_id, journal_entry_id)`;
`(journal_entry_id)`.

**`ExportRun` (Y).** Amaç: kayıt aktarımı kaydı ve alındı durumu. Alanlar: `Id`, `CompanyId`,
`PeriodId`, `Version` (1, 2, 3...), `Format` (`PanelExcel`/`SimpleCsv`/`LucaMmp`/`Mikro`/`Logo`),
`KindsJson` (aktarılan türler), `JournalEntryCount`, `RowCount`, `FileName`, `FileHash`,
`RequestedBy`, `RequestedAt`, `DownloadedAt`, `DownloadedBy`, `AcknowledgedAt`, `AcknowledgedBy`,
`Note`, `Status` (`Preparing`/`Ready`/`Downloaded`/`Acknowledged`/`Failed`). İndeks: `(company_id,
period_id, version)` tekil; `(company_id, requested_at)`.

**`Reconciliation` (Y).** `09-CARI-YONETIMI.md` §6.3 içinde tanımlı tablo bu belgede de kullanılır:
`Id`, `CompanyId`, `PeriodStart`, `PeriodEnd`, `PreparedAt`, `PreparedBy`, `SentAt`, `RespondedAt`,
`RespondedBy`, `DifferenceTotal`, `Status` (`Prepared`/`Sent`/`Approved`/`Disputed`), `DocumentPath`.

**`ReconciliationNote` (Y).** Alanlar: `Id`, `CompanyId`, `ReconciliationId`, `AuthorUserId`,
`AuthorSide` (`Company`/`Accountant`), `Text` (1000), `RelatedDocumentType`, `RelatedDocumentId`,
`CreatedAt`. İndeks: `(reconciliation_id, created_at)`.

**`AccountantReport` (Y).** Amaç: eksik belge uyarı listesi (mali müşavirin "bunu bekliyorum" listesi).
Alanlar: `Id`, `CompanyId`, `PeriodId`, `Kind` (`MissingInvoice`/`UnapprovedExpense`/`UnmatchedPayment`),
`Reference`, `Amount`, `Note`, `Status` (`Open`/`Closed`), `CreatedAt`, `ClosedAt`. İndeks:
`(company_id, period_id, status)`.

**Mevcut tablolara eklenenler.** `User` → `IsAccountant bool` (varsayılan `false`), `AccountantFirm`
(metin 150, boş olabilir). `AuditLog` → `CompanyId int?`, `Module string(20)?`, `CorrelationId
string(40)?` (bkz. `05-VERI-MODELI.md:419-422`). Mevcut `Invoice`, `Payment`, `Expense`,
`PurchaseInvoice`, `SupplierPayment` tablolarına **`CompanyId int?`** ve fiş bağı için
`JournalEntryId int?` eklenir (bkz. `05-VERI-MODELI.md:447-453`). Silme/dönüştürme yok.

**Migration sırası:** `Company` ve `CompanyUser` önce (çok firma temeli), sonra `DocumentLink`,
`ExportRun`, `Reconciliation`, `ReconciliationNote`, `AccountantReport`. Hepsi ekleme-only; mevcut tek
firma kaydı `Company` satırına doldurulur (`04-HEDEF-MIMARI.md` §5.3, üç aşamalı geçiş).

## 7. API uçları

| Metot | Yol | Ne yapar | İstek/yanıt | Yetki |
|---|---|---|---|---|
| GET | `/api/accountant/companies` | Bağlı firmalar | `id`, `title`, `taxNumber`, `periodStatus`, `pendingCount`, `lastExport` | Muhasebeci oturumu |
| POST | `/api/accountant/active-company` | Aktif firmayı seç | `companyId` | Muhasebeci oturumu |
| GET | `/api/accountant/{companyId}/documents` | Bekleyen belgeler | `type`, `from`, `to`, `linkStatus` | `accounting.view` + firma bağı |
| POST | `/api/accountant/{companyId}/documents/{type}/{id}/propose` | Fiş önerisi üret | Fiş taslağı (satırlar) | `ledger.edit` |
| POST | `/api/accountant/{companyId}/documents/{type}/{id}/approve` | Fişi onayla | `lines[]`, `date`, `no` | `ledger.approve` |
| POST | `/api/accountant/{companyId}/documents/{type}/{id}/reject` | Fiş önerisini reddet | `reason` | `ledger.approve` |
| POST | `/api/erp/journal-entries/{id}/reverse` | Ters kayıt | `reason` | `ledger.approve` |
| GET | `/api/accountant/{companyId}/trial-balance` | Mizan | `from`, `to`, `hideZero`, `format` | `ledger.view` |
| GET | `/api/accountant/{companyId}/ledger/{accountId}` | Muavin | `from`, `to` | `ledger.view` |
| POST | `/api/accountant/{companyId}/exports` | Aktarım üret | `period`, `kinds[]`, `format`, `note` | `accounting.view` |
| GET | `/api/accountant/{companyId}/exports` | Aktarım geçmişi | Liste (sürüm, biçim, durum) | `accounting.view` |
| GET | `/api/accountant/exports/{id}/download` | Dosyayı indir | Dosya; `DownloadedAt` yazılır | `accounting.view` |
| POST | `/api/accountant/exports/{id}/acknowledge` | "Aldım" işaretle | `note` | Muhasebeci oturumu |
| POST | `/api/accountant/{companyId}/reconciliations` | Mutabakat aç | `periodStart`, `periodEnd` | `accounting.edit` |
| GET | `/api/accountant/{companyId}/reconciliations/{id}` | Mutabakat detayı ve farklar | Fark grupları | `accounting.view` |
| POST | `/api/accountant/reconciliations/{id}/approve` | Mutabakatı onayla | `note` | Muhasebeci oturumu |
| POST | `/api/accountant/reconciliations/{id}/notes` | Not ekle | `text`, `relatedDocument` | İki taraf |
| GET | `/api/accountant/{companyId}/cari` | Cari bakiye listesi (gizli alanlar hariç) | Excel/PDF | `accounting.view` |

**Kurallar.** (a) Bütün uçlar aktif firmayı **yolda** taşır; gövdeden firma seçilmez. (b) Firma bağı
yoksa 403. (c) Muhasebeci rolü `Accounting` politikasını kullanır; ayrı bir politika eklenmez
(`Policies.cs:17`). (d) Aktarım indirmesi `ExportRun` üzerinden izlenir. (e) Mevcut
`/api/exports/accounting` ve `/api/exports/einvoice-xml` uçları **korunur**
(`EInvoiceController.cs:88`, `:137`); yeni uçlar onların yanına eklenir.

## 8. Yetki, onay ve denetim izi

| İş | Şirket kullanıcısı | Muhasebeci | Onay |
|---|---|---|---|
| Firma listesini görme | Bağlı firmalar | Bağlı firmalar | — |
| Belge listesi | Tam | Gizli alanlar hariç | — |
| Fiş önerisi görme | Görür | Görür | — |
| Fiş önerisi üretme | Hayır (varsayılan) | Evet | — |
| Fiş onaylama | Yönetici | Evet (maker-checker) | Gerekçe yok, kayıt var |
| Fiş iptali/ters kayıt | Yönetici | Evet | **Gerekçe zorunlu** |
| Dönem kapatma | Yönetici | Hayır | Onay + denetim izi |
| Aktarım üretme | Evet | Evet | — |
| Mutabakat onayı | Evet | Evet | İki taraflı |
| Kâr/maliyet görme | Yetkiye bağlı | **Hayır** (varsayılan) | Ayar ile açılabilir; denetim izi |

**Denetim izi.** Ayrı satır olarak yazılır: muhasebeci girişi, firma değiştirme, fiş önerisi üretimi,
fiş onayı/reddi, ters kayıt (gerekçesiyle), dönem kapatma, aktarım üretimi, aktarım indirmesi, "aldım"
işareti, mutabakat açma/onaylama, not ekleme, **başka firmaya erişim denemesi (403)**. Bugünkü
`AuditTrail` yalnız veri değişikliğini yazar (`AuditTrail.cs:54-56`); bu olaylar elle yazılır —
bugünkü 2FA sıfırlama örneğindeki desenle (`server/YesLojistik.Api/Controllers/UsersController.cs:42`).

## 9. Kabul kriterleri

1. **İzolasyon.** A firmasının muhasebecisi B firmasının hiçbir ucundan veri alamaz; 20 farklı uç
   denemesinde tek bir satır bile dönmez (otomatik test).
2. **Gizli alan.** Muhasebeci yanıtlarında kâr, taşeron fiyatı, komisyon ve prim alanları **hiç
   yoktur** (yanıt gövdesi şema denetiminden geçer).
3. **Maker-checker.** Fişi giren kullanıcı aynı fişi onaylayamaz.
4. **Denge.** Borç ≠ alacak olan fiş kaydedilemez; hata mesajı Türkçe ve alanı işaret eder.
5. **Belge → fiş.** Bir satış faturasından tek tıkla fiş önerisi üretilir; öneri iki saniyenin altında
   gelir.
6. **Fiş iptali.** Ters kayıt asıl fişe bağlıdır, gerekçe zorunludur ve iptal edilen fiş dışa aktarımda
   "iptal" olarak görünür.
7. **Kapanmış dönem.** Kapalı döneme fiş yazılamaz; düzeltme yeni dönemde yapılır.
8. **Aktarım sürümü.** Aynı dönem iki kez aktarıldığında iki ayrı kayıt (`v1`, `v2`) oluşur; eski
   dosya silinmez.
9. **Alındı bilgisi.** Panelden indirilen aktarım "indirildi", muhasebecinin "aldım" demesi
   "alındı" durumuna geçer; geçiş denetim izinde görünür.
10. **Fark kuralı.** Toplam fark 0,05 TL'nin altındaysa "fark yok"; üstündeyse gerekçesiz onay
    yapılamaz.
11. **Onaylanan mutabakat değişmez.** Onaydan sonra düzenleme denemesi 409/403 ile reddedilir.
12. **Aktarım içeriği.** Onaysız taslak fişler aktarıma girmez; "geç gelen belgeler" ayrı sayfadadır.
13. **Mevcut akış bozulmaz.** `/api/exports/accounting` bugünkü beş sayfayı **aynı** sütunlarla üretmeye
    devam eder (`EInvoiceController.cs:110-132`).
14. **Gizlilik.** Aktarım dosyasında IBAN tam numarası, kimlik bilgisi ve şoför özel verisi yoktur.
15. **Ayna ve lisans.** Ayna modunda (`MirrorWriteGuard.cs:14-18`) fiş üretimi ve aktarım yazma uçları
    reddedilir; lisans süresi dolduğunda ekran salt okunur kalır.

## 10. Testler

**Sunucu birim testleri (`server/YesLojistik.Tests/Unit`).**

| Dosya | Ne sınar |
|---|---|
| `AccountantMappingTests.cs` | Belge türü → hesap eşlemesi; eşleme eksikse anlaşılır hata |
| `ExportFormatTests.cs` | Kendi Excel başlıkları ve sütun sırası sabit; CSV başlık satırı; tarih/tutar biçimi |
| `ExportVersionTests.cs` | Aynı dönem iki kez → `v1`, `v2`; dosya özeti farkı |
| `AccountantMaskingTests.cs` | Kâr/maliyet alanları yanıt modelinde yok; aktarımda IBAN maskeli |

**Sunucu entegrasyon testleri (`server/YesLojistik.Tests/Integration`).** Bugünkü desen:
`WebApplicationFactory` + gerçek PostgreSQL (`server/YesLojistik.Tests/Integration/ApiFactory.cs`).

| Dosya | Senaryo |
|---|---|
| `AccountantAccessTests.cs` | Bağlı firma erişimi; bağlı olmayan firmaya 403; denetim izi satırı |
| `AccountantJournalTests.cs` | Öneri üret → onayla → mizan; giren onaylayamaz (403) |
| `AccountantReverseTests.cs` | Ters kayıt; gerekçesiz deneme reddedilir; asıl fiş bağı |
| `AccountantExportTests.cs` | Aktarım üret, indir, "aldım"; `ExportRun` durum geçişleri |
| `AccountantReconciliationTests.cs` | Mutabakat aç, fark hesapla, onayla; onaydan sonra düzenleme reddi |
| `AccountantIsolationTests.cs` | İki firma, iki muhasebeci: çapraz erişim imkânsız (parametreli uç taraması) |

**Panel uçtan uca testleri (`client/e2e`).**

| Dosya | Senaryo |
|---|---|
| `muhasebeci-paketi.spec.ts` | Firma seç → bekleyen belge → fiş onayla → mizan gör → aktarım indir |
| `muhasebeci-izolasyon.spec.ts` | Bağlı olmayan firma adresine git → 403 ekranı, veri yok |
| `new-ui/muhasebeci.spec.ts` | Aynı akış yeni görünümde (`uiMode.ts:8` anahtarının arkasında) |

**Veri.** Testler uydurma firma ve uydurma VKN kullanır (`AGENTS.md` §3.3); pratikortam verisi
kullanılmaz. İki firmalı test verisi ortak yardımcıyla kurulur.

## 11. Efor ve bağımlılıklar

| İş kalemi | Kişi-gün | Önce bitmeli |
|---|---|---|
| `CompanyUser` + firma bağlamı + izolasyon testleri | 8-12 | `30` (çok firma temeli), `07` (yetki) |
| Muhasebeci paneli: firma listesi + çalışma alanı iskeleti | 6-9 | Firma bağlamı |
| Belge → fiş ekranı ve öneri motoru (eşleme tablosu) | 12-18 | `06` (fiş altyapısı) |
| Fiş onayı, reddi, ters kayıt akışı | 6-9 | Fiş altyapısı |
| Mizan/muavin görünümü + dışa aktarma | 6-9 | `06` mizan |
| Aktarım üretimi, sürümleme, alındı bilgisi | 8-12 | Fiş altyapısı, Excel altyapısı |
| Hedef biçim adaptörleri (Luca MMP, Mikro, Logo) | 10-16 | **Örnek dosyalar (doğrulanacak)** |
| Mutabakat ve notlaşma | 8-12 | Aktarım |
| Alan gizleme (yanıt modelleri) | 3-4 | Firma bağlamı |
| Testler (birim + entegrasyon + e2e) | 10-14 | Her kalemle birlikte |
| **Toplam** | **77-115** | — |

**Sıra.** (1) `Company`/`CompanyUser` ve firma bağlamı, (2) muhasebeci paneli iskeleti, (3) belge → fiş
akışı, (4) aktarım sürümleme ve alındı bilgisi, (5) mutabakat ve notlaşma, (6) hedef biçim adaptörleri
(örnek dosya geldikçe). Üçüncü kalem bitmeden hiçbir biçim adaptörü yazılmaz: aktarılacak fiş yoksa
biçim tartışması boştur.

**Bağımlılıklar.** `30-COK-SIRKETLI-KONSOLIDASYON.md` (firma modeli ve izolasyon), `06-MUHASEBE-MOTORU.md`
(hesap planı, fiş, mizan), `08-E-BELGE-KATMANI.md` (XML ZIP), `09-CARI-YONETIMI.md` (cari ekstre,
mutabakat tablosu), `07-YETKI-ONAY-NUMARALANDIRMA.md` (yetki kodları), `27-ENTEGRASYONLAR.md`
(aktarım da bir entegrasyon işidir; kuyruk ve günlük oradan gelir), `32-VERI-GOCU-EXCEL-AKTARIM.md`
(ters yön: muhasebeciden gelen veriyi içe alma), `33-BILDIRIM-EPOSTA-SMS-KEP.md` (aktarım bildirimi).

## 12. Riskler ve doğrulanacaklar

| Risk | Etki | Azaltma | Geri alma |
|---|---|---|---|
| Çapraz firma veri sızıntısı | Çok yüksek | Sunucuda firma süzgeci; parametreli izolasyon testi; denetim izi | Özellik kapatılır, erişim kaydı incelenir |
| Mali müşavir programına uymayan biçim | Yüksek | Örnek dosya gelmeden adaptör yazılmaz; "Sade CSV" yedek yol | Biçim kapatılır |
| Yanlış hesap eşlemesi (her belge yanlış hesaba) | Yüksek | Eşleme tablosu şirket ayarında ve görünür; ilk ay elle kontrol; **mali müşavir onayı** | Eşleme düzeltilir, ters kayıt |
| Fiş onayının atlanması (taslak fişin aktarılması) | Orta | Aktarım varsayılanı yalnız onaylı fiş; uyarı listesi | Aktarım geri çekilir, yeni sürüm |
| Aktarımın iki kez muhasebeleşmesi | Yüksek | Sürüm numarası ve dosya özeti; "aldım" bilgisi | Ters kayıt + mutabakat notu |
| Onaylanan mutabakatın tartışmaya açılması | Orta | Onay sonrası kilit; yeni dönem yeni mutabakat | Yeni mutabakat açılır |
| Muhasebecinin kârı görmesi | Orta | Yanıt modelinde alan yok; `CanSeeProfit` varsayılan kapalı; denetim izi | Yetki kapatılır, kayıt incelenir |
| Küçük ekipte maker-checker çalışmaz | Orta | Tek kullanıcılı kurulumda kural esnetilir, gerekçe zorunlu olur | Kural yeniden açılır |
| Not/aktarım dosyasının e-postayla sızması | Orta | Gizli alanlar dosyaya da yazılmaz; panel içi indirme teşvik edilir | Dosya paylaşımı durdurulur |

**doğrulanacak:**

1. **Luca MMP kayıt aktarımı biçimi** — alan sırası, kodlama, tarih/tutar biçimi, hesap kodu eşlemesi.
   Kaynak: Luca kullanıcı kılavuzu + **mali müşavirin programından alınacak örnek dosya**.
2. **Mikro ve Logo hedef biçimleri** ve varsa API. Kaynak: program satıcısı, mali müşavir.
3. **Luca'nın muhasebeci yetki modeli ve firma değiştirme akışı** — hangi alanlar gizleniyor. Kaynak:
   Luca demo erişimi, tanıtım videosu.
4. **Muhasebecinin beklediği zorunlu alanlar** belge türü bazında (tevkifat kodu, istisna kodu, masraf
   merkezi). Kaynak: mali müşavir yazılı listesi.
5. **Kapanmış döneme kayıt engelinin yasal dayanağı ve süresi.** Kaynak: mali müşavir; bu belge yorum
   yapmaz.
6. **Mutabakat onayının hukuki değeri ve saklama süresi.** Kaynak: avukat/mali müşavir onayı.
7. **Kâr/maliyet alanlarının muhasebeciye açılıp açılmayacağı** — varsayılan kapalı; açılacaksa hangi
   alanlar. Kaynak: kullanıcı kararı.
8. **Eksik belge uyarı listesinin kapsamı** (hangi belge türleri, hangi süre). Kaynak: mali müşavir.
9. **Aktarımın e-posta ile mi panelden mi alınacağı** — alındı bilgisinin güvenilirliği buna bağlı.
   Kaynak: kullanıcı ve mali müşavir tercihi.
10. **Hesap planı şablonu** kimden gelecek (Luca'dan mı, mali müşavirin kendi planından mı). Kaynak:
    mali müşavir; ayrıntı `06-MUHASEBE-MOTORU.md:124`.

Sonraki belgeyle bağlantı: `29-MOBIL-VE-DISA-ACILIM.md` muhasebecinin telefonda bekleyen belge
listesini ve bildirimleri bu modüle bağlar; `30-COK-SIRKETLI-KONSOLIDASYON.md` firma izolasyonunun
temelini verir; `32-VERI-GOCU-EXCEL-AKTARIM.md` ters yönü (muhasebeciden gelen kayıtları içe alma)
tanımlar.
