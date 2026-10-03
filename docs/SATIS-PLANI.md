# Satışa hazırlık planı

*3 Ekim 2026. Amaç: bugünkü panel, tek bir firmanın (YES Lojistik) aracı olmaktan çıkıp başka nakliye firmalarına satılabilen bir ürün olsun. Bugünkü hali prototip kabul edilir.*

> **Bu belge neye dayanıyor?** Rakiplerin internet sitelerinden ve arama sonuçlarından derlendi. Bazı rakip siteleri (Divizyon, Kiraz'ın iç sayfaları vb.) bu ortamdan açılamadı; oradaki bilgiler arama özetlerinden geldi. **Fiyatlar tahmindir, satıştan önce tek tek doğrulanmalıdır.** Pratikortam'ın kendi tanıtım bilgisi internette bulunamadı; onu sizin kullanımınızdan biliyoruz.

---

## 0. Kararlar (3 Ekim, kullanıcı "soruları kendin cevapla" dedi)
| # | Soru | Karar |
|---|---|---|
| 1 | Kim satacak? | Henüz belli değil. Sözleşme şablonlarında satıcı bilgisi boş alan olarak bırakılır; panel ve belgeler ürün/firma adını ayardan alır. |
| 2 | Ürün adı | Çalışma adı "YES Lojistik" kalır. Ad ve logo ayardan değişir (beyaz etiket), sonradan marka seçilince koda dokunulmaz. |
| 3 | A mı B mi? | **A: her müşteriye ayrı kurulum.** Lisans anahtarıyla araç sayısı ve süre kontrol edilir. 20+ müşteriden sonra B değerlendirilir. |
| 4 | Pilot firmalar | Siz bulunca devreye girer. Bu arada pilot paketi hazırlanır (kurulum betiği, sihirbaz, eğitim, sözleşme taslakları). |
| 5 | Pratikortam geçişi | Ayna yalnızca YES Lojistik'in kendi hesabı için kalır. Başka firmalar için **genel Excel/CSV içe aktarma sihirbazı** yapılır; pratikortam'dan başkasının verisi çekilmez. |
| 6 | e-Fatura ve UETDS | Entegratör/Bakanlık bilgisi gelene kadar **sağlayıcıdan bağımsız altyapı** ve "UETDS'ye hazır mı?" kontrolü yapılır. Uydurma API yazılmaz. |
| 7 | Fiyat | Bölüm 4'teki öneri geçerli, pilotta doğrulanır. |

**Bu turda yapılanlar (ajanlarla paralel):** iki adımlı doğrulama + veri indirme, lisans ve abonelik, müşteri kurulum otomasyonu, kurulum sihirbazı ve içe aktarma, hukuk taslakları + tanıtım sayfası, UETDS hazırlık kontrolü.

## 1. Özet (1 dakikalık okuma)

1. **Pazar var ama kalabalık ve ucuz.** Türkiye'de onlarca nakliye programı var. Bir kısmı tek seferlik lisans (9.000-65.000 TL), bir kısmı aylık bulut aboneliği (aylık birkaç yüz TL'den başlıyor). Fiyatla yarışmak zor; **farkla** yarışmak lazım.
2. **Bizim farkımız:**
   - Sade, hızlı, Türkçe ekran (bugünkü Otoyol tasarımı).
   - **Sevkiyat başına net kazanç** (KDV hariç, komisyon ve gider dahil).
   - Şoför mobil uygulaması + müşteri takip linki zaten var.
   - **Pratikortam'dan geçiş aracı** (ayna). Pratikortam kullanan bir firmayı "verileriniz bir günde gelir" diyerek alabiliriz.
3. **Satıştan önce eksik olan 3 büyük şey:**
   - **Çok firmalı yapı.** Panel şu an tek firma için yazıldı. Başka bir firmanın verisi aynı yerde ayrı tutulamıyor.
   - **Resmî zorunluluklar:** UETDS bildirimi ve panelden e-Fatura gönderme. Rakiplerin çoğu bunları sunuyor, bizde yok ya da yarım.
   - **Satış mekanizması:** abonelik, ödeme alma, deneme sürümü, sözleşmeler, KVKK.
4. **Önerilen yol:** önce 3-5 pilot firma (her birine ayrı kurulum, hızlı), sonra gerçek çok firmalı sürüm. Ayrıntı 5. bölümde.
5. **Tahmini süre:** pilota hazır olmak 6-8 hafta, herkese açık satış 4-5 ay. (Çalışma hızına ve sizden gelecek bilgilere bağlı.)

---

## 2. Rakipler

### 2.1 Türkiye: nakliye programları (asıl rakipler)
| Ürün | Tür | Bilinenler | Fiyat (tahmin) |
|---|---|---|---|
| **Divizyon** (Exweb, Pro, Maksi, Ultra) | Lisans | Sevkiyat, araç, şoför, cari borç/alacak, komisyon takibi; her cihazdan erişim | 9.000 / 24.000 / 36.000 / 55.000 TL (tek sefer) |
| **Ekobim** | Lisans | Nakliye + lojistik paketleri | 1.980 - 18.480 TL |
| **Nakpro** | Bulut | Nakliye, fatura, irsaliye, tahsilat, çek/senet, cari, stok, araç, hatırlatma; e-Fatura/e-Arşiv/e-İrsaliye; çok şubeli | 6 aylık 400 TL + KDV (başlangıç) |
| **Kiraz Yazılım** | Bulut ERP | 14 modül, 110+ özellik; sefer/araç/konteyner, **UETDS otomatik bildirim**, GİB e-Fatura + 10 yıl arşiv, çoklu döviz; **sınırsız kullanıcı ve araç**; çok kiracılı, bcrypt, şifreli iletişim | Sitede açık fiyat yok |
| **Lojiper** | Bulut | Web + mobil; sevk belgesi, tur raporundan otomatik kâr/zarar, hasar kaydı | Açık fiyat yok |
| **Nakliye Yazılımı (Asistan Pro)** | Lisans | Nakliye + ön muhasebe | 65.000 TL, 3 taksit |
| Diğerleri | | Kobi Kaşa, Sentigo, Evren (WinYurtiçi), Demsoft, Probilnet, Portakal (Pronakliye), Mikro nakliye modülü | Değişken |

### 2.2 Türkiye: ön muhasebe (nakliyeciler bunları da kullanıyor)
| Ürün | Fiyat (tahmin) |
|---|---|
| **Paraşüt** | 150 TL/ay'dan; e-Fatura + ön muhasebe ~940 TL/ay + KDV |
| **Logo İşbaşı** | ön muhasebe ~463 TL/ay, birleşik paket ~738 TL/ay + KDV |
| **Mikro (e-Portal/Jump)**, **KolayBi** (~1.000 TL/ay), BizimHesap, Luca | 150 - 1.000 TL/ay |

*Çıkarım: nakliyeci muhasebe için ayrıca ~500-1.000 TL/ay ödüyor. Bizim ürün cari, fatura, çek, kasa ve e-Fatura'yı kapsarsa "iki programı birden değiştirir" diyebiliriz.*

### 2.3 Türkiye: yük bulma ve takip
| Ürün | Ne yapar |
|---|---|
| **Kamyoon** | Yük borsası + TMS. 600+ lojistik firması, 150.000 günlük ilan, 30.000 sözleşmeli kamyon. Yapay zekâ ile navlun fiyat önerisi, belgeli taşıyıcı sistemi. Aracıların müşterisini korumak için yük sahibiyle doğrudan çalışmıyor. |
| Diginak, Cargopedia | Yük/araç eşleştirme |
| **Arvento** | Araç takip lideri (23.000 müşteri, 300.000 araç). API ile nakliye yazılımlarına bağlanıyor. |
| **Mobiliz** | Araç takip |
| **Enlog** ("Yüküm Nerede") | Müşterinin yükünü izlediği uygulama |

### 2.4 Yurt dışı (ilham ve fiyat çıpası)
| Ürün | Not | Fiyat |
|---|---|---|
| Datatruck | Küçük taşıyıcı TMS | 99 $ (1-6 araç), 299 $ (7-25), 499 $ (26-40) / ay |
| Truckpedia | AI destekli | 300 $/ay, 10 araca kadar |
| Axele, TruckingOffice | Basit TMS | ~149 $/ay |
| Ascend TMS | Kullanıcı başı | 49 / 99 / 149 $ |
| Samsara, Webfleet, Fleetio | Filo/telematik | Donanım + abonelik |
| Transporeon, Trans.eu | Büyük yük platformları | Kurumsal |

*Çıkarım: yurt dışında **araç sayısına göre** fiyat yaygın ve küçük firmaya daha adil. Türkiye'de aynı model henüz az.*

### 2.5 Pazar notları
- TÜİK 2025: 10-49 çalışanlı işletmelerin yalnızca %23,6'sı ERP kullanıyor. Lojistikte en yaygın teknoloji araç takip (%70), bulut/ERP çok düşük (%8-13). **Küçük nakliyecinin çoğu hâlâ Excel ve defterde. Asıl müşterimiz o.**
- Dijitalleşmenin önündeki engel en çok **maliyet**. Düşük giriş fiyatı ve kolay geçiş önemli.

---

## 3. Eksik analizi: rakiplerde olan, bizde durum

✅ var · 🟡 yarım · ❌ yok

### Operasyon
| Özellik | Durum | Not |
|---|---|---|
| Sevkiyat (sefer) oluşturma, durum, pano | ✅ | |
| İş talebi → sevkiyata çevirme | ✅ | |
| Sevk belgesi / irsaliye PDF | ✅ | |
| **UETDS bildirimi** (kara yolu yük taşımada zorunlu) | ❌ | Bakanlık sistemi; sefer başlamadan önce bildirilir. **Rakiplerin çoğunda var, bizde yok. En önemli eksik.** |
| e-İrsaliye (GİB) | 🟡 | Belge hazırlığı var, gönderim yok |
| Şoför mobil uygulaması (iş, evrak foto, masraf) | ✅ | Gerçek şoförlerle denenmedi |
| Müşteri takip linki | ✅ | |
| Araç konumu / harita | 🟡 | Konum kaydı var; **GPS cihazı (Arvento, Mobiliz) bağlantısı yok** |
| Araç, belge, bakım uyarıları | ✅ | |
| Lastik takibi | 🟡 | Yalnız gider kategorisi |
| Rota ve süre/mesafe tahmini | ❌ | |
| Teklif / fiyat teklifi hazırlama | ❌ | Rakiplerde sık |
| Sözleşme / navlun anlaşması kaydı | ❌ | |
| Konteyner / çoklu şube / depo | ❌ | Bizim hedefimiz kara yolu; şimdilik gerekmez |

### Para
| Özellik | Durum | Not |
|---|---|---|
| Cari (müşteri, tedarikçi), ekstre | ✅ | |
| Tahsilat, tedarikçi ödemesi | ✅ | |
| Çek / senet | ✅ | |
| Kasa / banka | ✅ | |
| Banka ekstresi içe aktarma | 🟡 | Doğrulanacak |
| Gider, şoför hesabı | ✅ | |
| **Sektöre göre KDV, tevkifat** | ✅ | Mali müşavir teyidi bekliyor |
| Sevkiyat başına net kazanç | ✅ | Rakiplerde "kâr/zarar" var, KDV hariç net hesap yok. **Güçlü yanımız.** |
| **e-Fatura / e-Arşiv panelden gönderme** | 🟡 | Fatura dosyası (UBL) hazır; **entegratör bağlantısı yok** |
| Gelen e-Faturayı otomatik alma | ❌ | Rakiplerde var (GİB/EDM) |
| Çoklu döviz | 🟡 | Doğrulanacak |
| Personel, maaş, sabit ödeme | ✅ | |
| Raporlar, Excel/PDF çıktı, toplu işlem | ✅ | |

### İletişim
| Özellik | Durum |
|---|---|
| E-posta gönderimi | ✅ (SMTP) |
| WhatsApp'a paylaşma | ✅ (bağlantı) |
| SMS | 🟡 |
| Müşteriye otomatik "yükünüz yolda" bildirimi | 🟡 |
| Müşteri portalı (fatura, ekstre, takip) | 🟡 Yalnız takip linki |

### Ürün olarak (satış için şart)
| Özellik | Durum | Not |
|---|---|---|
| **Çok firmalı (multi-tenant) yapı** | ❌ | Her tablo tek firmaya göre. **En büyük teknik iş.** |
| Kendi verisini içe aktarma sihirbazı (Excel) | 🟡 | Excel içe aktarma var; "ilk kurulum sihirbazı" ve pratikortam geçişi yok |
| Abonelik, ödeme alma, paketler | ❌ | |
| Deneme sürümü (14-30 gün), demo veri | 🟡 | Örnek veri var; hesap açma akışı yok |
| Rol ve yetki | ✅ | Yönetici, operasyon, muhasebe, şoför. Daha ince ayar eksik |
| İki adımlı doğrulama (2FA) | ❌ | |
| Denetim kaydı (kim ne yaptı) | ✅ | |
| Yedekleme | ✅ | Günlük yedek; müşteri kendi verisini indirebilmeli |
| Hata izleme, durum sayfası | 🟡 | |
| KVKK metinleri | 🟡 | Gizlilik sayfası var; sözleşme, aydınlatma, silme akışı eksik |
| Yardım, eğitim videosu, destek | 🟡 | Yardım sayfaları var |
| API (müşteri kendi sistemini bağlasın) | ❌ | |
| Çoklu dil | ❌ | Şimdilik gerekmez |

---

## 4. Konumlandırma ve fiyat

### Söylem
> **"Küçük ve orta nakliye firması için sade, Türkçe, sevkiyat başına net kazancı gösteren program. Muhasebeci olmadan cari, fatura ve çek takibi. Şoförünüz telefondan çalışır. Pratikortam'dan bir günde geçersiniz."**

### Fiyat önerisi (hipotez, pilotta doğrulanacak)
Rakipler: ucuz bulut 400-1.000 TL/ay, ön muhasebe ~500-1.000 TL/ay, tek seferlik lisans 9.000-65.000 TL. Yurt dışında **araç sayısına göre** aylık.

| Paket | Araç | Aylık (KDV hariç) | İçerik |
|---|---|---|---|
| Başlangıç | 5'e kadar | ~990 TL | Sevkiyat, cari, fatura, tahsilat, şoför uygulaması |
| Standart | 20'ye kadar | ~2.490 TL | + e-Fatura, UETDS, raporlar, toplu işlem |
| Profesyonel | 50'ye kadar | ~4.990 TL | + GPS entegrasyonu, müşteri portalı, öncelikli destek |
| Kurumsal | 50+ | Teklif | + özel entegrasyon, ayrı sunucu |

- Yıllık ödemede 2 ay indirim.
- e-Fatura kontörü ayrı (entegratörün fiyatı müşteriye yansıtılır).
- İlk 30 gün ücretsiz deneme.
- **Neden araç sayısı?** Küçük firma az öder, büyüyen firma daha fazla öder; rakiplerin "sınırsız kullanıcı" vaadiyle çelişmez (kullanıcı sınırı koymayız).

---

## 5. Yol haritası

### Önce bir karar: tek tek kurulum mu, gerçek çok firmalı sistem mi?
| | A) Her müşteriye ayrı kurulum | B) Gerçek çok firmalı (SaaS) |
|---|---|---|
| Nasıl | Her firmaya ayrı sunucu + ayrı veritabanı, aynı kod | Tek sistem, her kayıtta firma numarası |
| Süre | **2-3 hafta** (kurulum otomasyonu) | **4-6 hafta** (bütün tablolar ve sorgular değişir) |
| Güvenlik | Çok iyi (veriler fiziksel olarak ayrı) | Çok dikkat ister (bir hata = veri sızıntısı) |
| Maliyet | Müşteri başına ~10-25 $/ay altyapı | Çok düşük |
| Ölçek | ~20 müşteriye kadar yönetilebilir | Yüzlerce |
| Güncelleme | Her kuruluma ayrı | Tek seferde herkese |

**Önerim:** **A ile başla** (pilotlar için hızlı ve güvenli), pilotlar bittiğinde 20+ müşteri görünüyorsa **B'ye geç**. Böylece ilk müşteriyi 2 ay içinde alırız, B'nin 1,5 aylık işini gelir gelmeden yapmamış oluruz.

### Aşamalar
**S0: Hazırlık (1 hafta)** ← *ilk iş*
- Kararlar: ürün adı, alan adı, şirket/fatura bilgisi (kim satacak?), A/B kararı, pilot firmalar.
- Mevcut firma adı ve logosu koda gömülü; firma ayarlarına taşınır ("beyaz etiket": müşteri kendi logosunu koyar).
- Mali müşavire KDV tablosu gösterilir.

**S1: Rakip eşitliği, zorunlular (3-4 hafta)**
1. **UETDS:** sefer kaydından Bakanlık sistemine bildirim (Ulaştırma Bakanlığı entegrasyon dokümanı gerekli; firma yetki belgesi ve test hesabı sizden).
2. **e-Fatura entegratörü:** bir özel entegratör seçilir (Nilvera ve Kolaysoft API'si açık, aylık sabit ücretli; Uyumsoft, Foriba da var). Fatura panelden gider, durumu panelde izlenir. *Burada sizden: kullandığınız programın adı.*
3. **Gelen e-Faturaları otomatik alma** (alınan faturalar sayfasına düşer).
4. **GPS bağlantısı:** önce Arvento ve Mobiliz API'leri (pazarın büyüğü). Araç konumu harita ve müşteri takip linkinde canlı görünür.
5. **Veri geçişi sihirbazı:** Excel ile müşteri, araç, şoför, cari devir içe aktarma (hata raporlu) + pratikortam geçişi.

**S2: Ürünleştirme (3-5 hafta)**
1. Çok firmalı altyapı (seçilen yola göre: kurulum otomasyonu ya da tenant ayrımı).
2. Hesap açma akışı: kayıt → e-posta doğrulama → örnek veri ya da boş başlangıç → 30 gün deneme.
3. **Abonelik ve ödeme:** iyzico Abonelik (kart saklama ve tekrarlı ödeme hazır; ilk 3 ay ücretsiz, sonra aylık 199 TL). Paket yükseltme, iptal, fatura kesme.
4. 2FA, oturum yönetimi, şifre politikası, IP/denemeli giriş kısıtı.
5. Müşteri portalı: müşterinin kendi sevkiyatını, faturasını, ekstresini görmesi.
6. Teklif hazırlama + sözleşme kaydı.
7. Otomatik bildirimler (e-posta/SMS/WhatsApp): "yüklendi", "yolda", "teslim edildi".

**S3: Güven ve yasal (paralel, 2 hafta)**
- Kullanım şartları, mesafeli satış sözleşmesi, gizlilik, KVKK aydınlatma ve **veri işleyen sözleşmesi** (müşterinin müşteri/VKN verisini biz işliyoruz, yani "veri işleyen" oluyoruz). Bir avukata baktırılmalı.
- VERBİS kaydı (firma kendi, biz kendimiz için) ve veri saklama/silme politikası.
- Müşteri verisini tamamen indirme ve hesabı silme.
- Dışarıdan güvenlik taraması (sızma testi).
- Hizmet seviyesi (SLA) ve destek saatleri.

**S4: Altyapı (paralel, 1 hafta)**
- Ücretli veritabanı ve sunucu (Render ücretsiz planı satış için uygun değil; 28 Ekim'de siliniyor).
- Ayrı test ortamı, otomatik günlük yedek + başka yere kopya, hata izleme, durum sayfası.
- Performans testi (çok araç/sevkiyatla).

**S5: Pazarlama ve satış (S2 ile paralel)**
- Tanıtım sayfası (özellikler, fiyat, SSS, demo isteği), canlı demo hesabı.
- 5-6 kısa eğitim videosu (zaten var olan ekran görüntüleri ve `docs/egitim` temel alınır).
- Referans: önce YES Lojistik kendi hikâyesi ("pratikortam'dan geçtik").
- Satış kanalı: sektör grupları, nakliyeci dernekleri/odalar, mali müşavirler (onlar firma başı komisyon alırsa yönlendirir).

**S6: Pilot (4-6 hafta)**
- 3-5 firma, ücretsiz ya da yarı fiyat. Haftalık görüşme; her geri bildirim listelenir.
- Ölçüt: firma panelini haftada 4+ gün kullanıyor, sevkiyatlarının %80'ini panele giriyor.
- Pilot sonunda fiyat ve paketler kesinleşir.

**S7: Genel satış**

### Zaman çizelgesi (tahmin)
| Hafta | İş |
|---|---|
| 1 | S0 hazırlık |
| 2-5 | S1 (UETDS, e-Fatura, GPS, geçiş sihirbazı) |
| 4-8 | S2 + S3 + S4 (paralel) |
| 8-9 | İç test, düzeltme |
| 9-14 | S6 pilot |
| 15+ | S7 genel satış, gerekirse B'ye geçiş |

Bu, ajanlarla paralel çalışma varsayımıyla. Sizden gelecek bilgiler gecikirse (UETDS yetkisi, e-Fatura hesabı, avukat) kayar.

---

## 6. Sizden gerekenler / kararlar

| # | Karar | Neden |
|---|---|---|
| 1 | **Kim satacak?** (şahıs mı, şirket mi, ortak mı) Fatura kesecek vergi mükellefiyeti var mı? | Sözleşme, ödeme alma, fatura |
| 2 | **Ürün adı ve alan adı** ("YES Lojistik" tek firmanın adı; ürünün ayrı bir adı olmalı) | Marka, tanıtım sayfası |
| 3 | **A mı B mi?** (5. bölüm; önerim A) | Süre ve maliyet |
| 4 | **Pilot firmalar:** 3-5 nakliyeci tanıyor musunuz? | Gerçek geri bildirim |
| 5 | **Pratikortam durumu:** panelden bir firmaya "pratikortam'dan geçiş" sunacaksak, her firma yalnız **kendi hesabından kendi verisini** kendi izniyle aktarır. Pratikortam'ın kullanım şartlarına bakmak lazım. | Yasal risk |
| 6 | **e-Fatura programının adı** (zaten bekliyorduk) | S1 |
| 7 | **UETDS:** firmanızın yetki belgesi ve Bakanlık test erişimi | S1 |
| 8 | Fiyat önerisini beğeniyor musunuz? | 4. bölüm |
| 9 | Mali müşavire KDV tablosunu gösterin | Doğruluk |
| 10 | Bir **avukat** (KVKK, sözleşmeler) ve bir **mali müşavir** (abonelik faturası) bulunması | S3 |

---

## 7. Riskler
- **Tek kişi bakımı.** Müşteri sayısı artınca destek yükü büyür. Çözüm: iyi yardım sayfaları, video, ilk 6 ay az müşteri.
- **Rakip fiyatı çok düşük** (400 TL/6 ay gibi). Çözüm: onlarla fiyatla değil, geçiş kolaylığı + net kazanç + şoför uygulaması ile yarış.
- **Resmî sistemlerin değişmesi** (UETDS, e-Fatura kodları, KDV). Çözüm: izlenecek bir "mevzuat" listesi ve aylık kontrol.
- **Veri güvenliği.** Bir sızıntı itibarı bitirir. Çözüm: S3'ü atlamayız.
- **Pratikortam ile ilişki.** Tanıtımda pratikortam'ı kötülememek, veriyi yalnız müşterinin kendi izniyle almak.

---

## Kaynaklar (arama sonuçları)
- Nakliye programı fiyatları: Divizyon, Ekobim, Asistan Pro (arama özeti); Nakpro: <https://nakpro.web.tr/>
- Kiraz Yazılım: <https://www.kirazyazilim.com/>, Nakliye Yazılım: <https://www.nakliyeyazilim.com/>, Lojiper: <https://www.lojiper.com/>
- Ön muhasebe fiyatları: <https://www.parasut.com/on-muhasebe-fiyatlari>, <https://eticaretradari.com/muhasebe-programi-fiyatlari/>
- Kamyoon: <https://www.kamyoon.com/>; Arvento: <https://arvento.com/>
- UETDS: <https://uetds.uab.gov.tr/>, <https://www.kamyoon.com/blog/uetds-yuk-bildirimi>
- e-Fatura entegratörleri: <https://ozmconsultancy.com/2026-turkiyedeki-e-fatura-programlari-ve-ozel-entegratorler-karsilastirmasi/>
- iyzico Abonelik: <https://docs.iyzico.com/urunler/abonelik>
- TMS karşılaştırmaları: <https://truckpedia.io/resources/best-trucking-software-small-fleets>, <https://www.datatruck.io/blog/best-tms-software-for-carriers>
- KOBİ yazılım kullanımı: TÜİK 2025 (arama özeti), <https://www.sbb.gov.tr/wp-content/uploads/2025/08/Lojistik-Ozel-Ihtisas-Komisyonu-Raporu_01082025.pdf>
