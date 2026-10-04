**TASLAK: avukat onayı olmadan kullanmayın**

# Hukuk taslakları: kim ne yapacak?

*3 Ekim 2026. Bu klasördeki her belge bir **taslaktır**. Hiçbiri bir avukat görmeden müşteriye gösterilmemeli, sitede yayınlanmamalıdır. Belgelerde gerçek firma, kişi veya müşteri adı yoktur; boşluklar köşeli parantezle ([...]) bırakılmıştır.*

## 1. Belgeler

| Belge | Ne işe yarar | Kime gösterilir |
|---|---|---|
| `KULLANIM-SARTLARI.md` | Hizmeti kullanma kuralları, sorumluluk sınırları | Herkes (sitede) |
| `ABONELIK-VE-MESAFELI-SATIS-SOZLESMESI.md` | Paket, fiyat, ödeme, iptal, iade; Ek-1 hizmet kapsamı, Ek-2 fiyat | Her müşteri imzalar/onaylar |
| `KVKK-AYDINLATMA-METNI.md` | 3 metin: (A) Satıcının kendi aydınlatması, (B) müşteri firmanın şoför/çalışanları için şablon, (C) müşteri firmanın carileri için şablon | A herkese; B ve C müşteri firmaya şablon olarak verilir |
| `VERI-ISLEME-SOZLESMESI.md` | KVKK m.12: müşteri veri sorumlusu, biz veri işleyen; veri kategorileri, güvenlik, alt işleyenler, ihlal, iade/silme, denetim | Her müşteri imzalar |
| `GIZLILIK-POLITIKASI.md` | Ziyaretçi/kullanıcıya okunaklı gizlilik özeti | Herkes (sitede) |
| `CEREZ-POLITIKASI.md` | Çerez ve yerel depolama açıklaması | Herkes (sitede) |
| `HIZMET-SEVIYESI-VE-DESTEK.md` | Erişilebilirlik hedefi, destek saatleri, yanıt süreleri, yedek, bakım | Sözleşme eki |
| `VERI-SAKLAMA-VE-IMHA-POLITIKASI.md` | Hangi veri ne kadar saklanır, nasıl silinir | İç politika; özeti müşteriye verilebilir |

Tanıtım sitesindeki yasal sayfalar (`site/hukuk/*.html`), bu belgelerden `tools/site/build.py` ile üretilir. Üretilen sayfalarda "TASLAK" uyarısı kalır; avukat onayından sonra uyarı elle kaldırılır (bkz. `tools/site/build.py` başındaki açıklama).

## 2. Boşlukları kim doldurur?

| Boşluk | Kim | Not |
|---|---|---|
| [SATICI ÜNVANI], [VKN], [VERGİ DAİRESİ], [MERSİS NO], [ADRES], [KEP] | **Siz** (satıcı kararı verince) | Önce kim satacak sorusu: şahıs mı, şirket mi? (`SATIS-PLANI.md` bölüm 6, madde 1) |
| [DESTEK E-POSTASI], [DESTEK TELEFONU/WHATSAPP], [KVKK İLETİŞİM E-POSTASI] | **Siz** | Ayrı bir alan adı e-postası önerilir (ör. destek@, kvkk@) |
| [ÜRÜN ADI], [ALAN ADI] | **Siz** | Marka kontrolünden sonra |
| [BARINDIRMA SAĞLAYICISI] ve diğer alt işleyenler, ülke/bölge | **Siz** (teknik bilgi bende) | Sunucunun hangi ülkede olduğu yurt dışı aktarım kurallarını etkiler |
| Fiyatlar ve paketler (Ek-2) | **Siz** | Pilot sonunda kesinleşir |
| Destek saatleri, yanıt süreleri, kesinti hedefi (SLA) | **Siz**, gerçek kapasiteye göre | Tutamayacağınız söz yazmayın |
| Yedek saklama süresi, konum saklama süresi | **Siz + teknik ekip** | Ayar var, karar sizin |
| [YETKİLİ MAHKEME ŞEHRİ] | **Avukat** | Genellikle satıcının yerleşim yeri |
| Hukuki sebepler (özellikle şoför konumu), cayma/ön bilgilendirme, sorumluluk sınırı, saklama süreleri | **Avukat** | Metinde "avukata sorulacak" yazan her yer |
| KDV, damga vergisi, fatura türü, saklama süreleri | **Mali müşavir** | |
| Müşteri firma bilgileri ([MÜŞTERİ ...]) | **Müşteri**, sözleşme imzalanırken | |

## 3. Yasal işler kontrol listesi

Her satırda "**avukata/mali müşavire sorulacak**" yazan yerde kesin bilgi verilmemiştir. Bu liste hukuki görüş değildir.

### Şirket ve vergi
- [ ] **Kim satacak?** Şahıs işletmesi mi, limited/anonim şirket mi? Fatura kesmek için vergi mükellefiyeti şart. *(Mali müşavire sorulacak)*
- [ ] Faaliyet kodu (NACE) yazılım/abonelik satışına uygun mu? *(Mali müşavire sorulacak)*
- [ ] **Fatura kesme:** e-Fatura/e-Arşiv mükellefiyeti gerekir mi, hangi yöntemle kesilecek (kendi programı, entegratör, GİB portalı)? *(Mali müşavire sorulacak)*
- [ ] KDV oranı ve istisnalar (yazılım hizmeti). *(Mali müşavire sorulacak)*
- [ ] Abonelik sözleşmesinde **damga vergisi** doğar mı, kim öder? *(Mali müşavire/avukata sorulacak)*
- [ ] Yurt dışı ödeme kuruluşu veya yurt dışı sağlayıcı kullanılıyorsa stopaj/KDV sorumluluğu. *(Mali müşavire sorulacak)*

### KVKK
- [ ] **VERBİS gerekliliği.** Veri sorumluları siciline kayıt yükümlülüğü, çalışan sayısı ve mali bilanço eşiklerine ve faaliyet alanına bağlıdır; eşikler ve istisnalar Kurul kararlarıyla değişebilir. **Hem Satıcı hem her müşteri firma kendisi için ayrı ayrı değerlendirmelidir. Eşik ve yükümlülüğün güncel durumu bir avukata kontrol ettirilmelidir; bu belgede rakam verilmemiştir.** *(Avukata sorulacak)*
- [ ] Veri işleyen sözleşmesi, aydınlatma metinleri ve saklama/imha politikasının avukat tarafından onaylanması.
- [ ] **Yurt dışı aktarım:** sunucu, yedek veya e-posta sağlayıcısı yurt dışındaysa KVKK m.9 şartları (2024 değişikliği dahil) ve Kurum'a bildirim/standart sözleşme gerekliliği. *(Avukata sorulacak; sunucu ülkesi bilgisi gerekli)*
- [ ] Şoför konumu için hukuki sebep: açık rıza mı, başka bir sebep mi? Çalışandan alınan rızanın geçerliliği tartışmalıdır. *(Avukata sorulacak)*
- [ ] Veri ihlali bildirim süresi ve usulü (Kurul'un güncel kararı). *(Avukata sorulacak)*
- [ ] Müşteri firmalara verilecek **KVKK paketi:** Metin B-C şablonları + kısa "ne yapmalısınız?" notu (VERBİS, aydınlatma, rıza).
- [ ] Satıcı için KVKK sorumlusu/iletişim kişisinin belirlenmesi ve başvuru kayıt defteri.

### Marka, alan adı, iletişim
- [ ] **Marka tescili kontrolü:** ürün adı için TÜRKPATENT'te benzerlik/önceki tescil araştırması; ilgili sınıflar (genellikle yazılım ve bulut hizmeti sınıfları düşünülür) bir marka vekiline sorulacak. "YES Lojistik" çalışma adıdır; başka bir firmanın adı olabilir, kullanmadan önce kontrol edin. *(Marka vekiline/avukata sorulacak)*
- [ ] **Alan adı:** ürün adına uygun alan adı alınması (.com.tr alırken belge istenebilir; kontrol edin), e-posta için SPF/DKIM/DMARC kayıtları.
- [ ] **KEP adresi:** ticaret şirketleri için KEP adresi edinmek zorunludur; şahıs işletmesi için durumu kontrol edin. *(Avukata/mali müşavire sorulacak)*
- [ ] Ticari elektronik ileti: toplu e-posta/SMS/WhatsApp için izin ve **İYS** kaydı gerekliliği (tacir/esnaf alıcılarda istisnalar ve ret hakkı kuralları var). Mesaj şablonlarında "ret" satırı bulunur. *(Avukata sorulacak)*
- [ ] **E-ticaret / ETBİS:** Sitede doğrudan online satış yapılacaksa ve hizmet sağlayıcı veya aracı hizmet sağlayıcı sayılıyorsak ETBİS kaydı gerekebilir. B2B yazılım aboneliği bu kapsama girer mi? *(Avukata sorulacak)*
- [ ] **Mesafeli satış / ön bilgilendirme:** müşteri tüketici değilse uygulanmaz; şahıs işletmesi ve ticari amaç ayrımı. *(Avukata sorulacak)*
- [ ] Sitedeki **bilgilendirme zorunlulukları** (satıcı unvanı, adres, MERSİS, KEP gibi bilgilerin sitede yer alması). *(Avukata sorulacak)*
- [ ] İnternet yer sağlayıcı/içerik sorumluluğu (5651 sayılı Kanun) kapsamına girip girmediğimiz. *(Avukata sorulacak)*

### Sözleşmeler ve sigorta
- [ ] Alt işleyen sözleşmeleri: barındırma, e-posta, yedek depolama, ödeme, e-Fatura entegratörü sağlayıcılarının sözleşme/şartları, silme ve güvenlik taahhütleri.
- [ ] **Üçüncü taraf lisanslar:** kullanılan yazı tipi ve kütüphanelerin lisans metinleri (site için `site/assets/fonts` altına konmuştur), harita altlığı atıfı.
- [ ] Rakip yazılımlardan veri alma: müşteri **yalnızca kendi hesabından, kendi izniyle** aktarır; diğer programın kullanım şartları kontrol edilir. *(Avukata sorulacak)*
- [ ] **Sigorta:** mesleki sorumluluk ve siber risk (veri ihlali) sigortası seçenekleri. *(Sigorta aracısına sorulacak)*
- [ ] Hizmet seviyesi taahhüdünün (SLA) hizmet kredisi/ceza sorumluluğuna etkisi. *(Avukata sorulacak)*
- [ ] Güvenlik: dışarıdan sızma testi raporu (Veri İşleme Sözleşmesi Ek-2 buna atıf yapıyor).

## 4. Yayın kuralı

1. Avukat metni onaylar, boşluklar doldurulur.
2. Belgelerin başındaki "TASLAK" uyarısı kaldırılır (hem `docs/hukuk` hem `site/hukuk`).
3. Yeni sürüm tarihi yazılır, eski sürüm arşivlenir.
4. Müşteriye gösterilen sözleşme sürümü, müşteri kaydında saklanır.
