# 18 — Personel

## 1. Amaç ve kapsam

Bu modül, **ofis ve depo personelini** (şoförler ayrı tutulur) kayıt altına alır: kim, hangi görevde,
ne kadar ücret alıyor, hangi kesintiler var, ne kadar avans aldı, hangi ayda ne kadar ödendi.
Bugün panel bu işin yalnız **dörtte birini** yapar: ad, TC kimlik no, telefon, işe başlangıç, aylık
maaş, not ve aktiflik (`server/YesLojistik.Core/Entities/Staff.cs:4-15`) ile üç hareket türü —
avans, prim, maaş ödemesi (`server/YesLojistik.Core/Entities/Enums.cs:48`).

**Kapsam:**

1. Personel kartının zenginleştirilmesi (görev, departman, işe giriş/çıkış, IBAN, ücret tipi).
2. Görev ve rol tanımları; panel kullanıcı hesabıyla **isteğe bağlı** bağlantı.
3. Ücret ve kesinti tanımları (net/brüt ayrımı olmadan, **tanım** düzeyinde).
4. Avans, masraf ve iş avansı hareketleri; şoför avansıyla ilişki.
5. Puantaj (gün/yarım gün/devamsızlık) ve izin kaydı — **yalnız kayıt**, hesap yok.
6. Şoför uygulaması (`mobile/`) ile bağlantı: şoför kendi avans/harcırah/masrafını görür.
7. Personel giderlerinin muhasebeleştirilmesi: hangi masraf merkezine, hangi KDV ile, hangi belgeyle.

**Kapsam sınırı — açıkça yazılıdır:**

Bu plan **tam bordro yapmayız**. Yani:

- Gelir vergisi dilimleri, asgari geçim indirimi, damga vergisi, SGK işçi/işveren prim oranları
  **hesaplanmaz**.
- İş Kanunu'na göre kıdem/ihbar tazminatı **hesaplanmaz**.
- Resmî beyanname (aylık prim ve hizmet belgesi, muhtasar) **üretilmez**.
- Yıllık izin **hakediş** hesabı (kıdeme göre gün hesabı) yapılmaz; yalnız izin **kaydı** tutulur.

**Neden:** bu hesaplar mevzuata ve her yıl değişen parametrelere bağlıdır. Yanlış bir bordro, yanlış
bir vergi beyanı demektir; bunun sorumluluğu yazılımın değil mali müşavirindir. Ayrıca bu kod tabanı
bir **nakliye yönetim** panelidir; bordro, ayrı bir uzmanlık ürünüdür.

**Ne yaparız:** muhasebe çıktısı üretiriz. Yani mali müşavirin kendi programına (ör. Luca) gireceği
**hazır veriyi** üretiriz: personel listesi, aylık tahakkuk tutarı, avans ve ödeme dökümü, masraf
merkezi kırılımı, kesinti tanımları, puantaj gün sayısı. Bu çıktı bir **muhasebe aktarım dosyası**
ve ekran raporudur; beyanname değildir.

**Kapsam dışı:** bordro hesaplama, beyanname, SGK bildirgesi, tazminat hesabı, yıllık izin hakediş
hesabı, şoför belge takibi (`07` ve `22` numaralı plan belgeleri; belge altyapısı kodda mevcut:
`server/YesLojistik.Core/Entities/FleetDocument.cs`), şoför hesabı mutabakatı
(`DriverLedgerService`, ayrı modül).

## 2. Luca'daki karşılığı

Luca Koza'nın menü yapısında **Yönetici** modülü vardır (`02-LUCA-ENVANTERI.md:20`) ve Koza'nın
özellikleri arasında **"ayrıntılı yetkilendirme ile iş planı yapabilme"** sayılır
(`02-LUCA-ENVANTERI.md:51`). Ayrıca Luca ekosisteminde **BES entegrasyonu**
(`02-LUCA-ENVANTERI.md:67-68`) listelenir; bu, Luca'nın personel/ücret tarafına dokunduğunu gösterir.

Luca envanterinde **bordro** veya **personel** modülü adı geçmez. Bu yüzden:

- **doğrulanacak:** Luca Net/Koza'da personel kartı ve ücret/kesinti tanımı bulunup bulunmadığı;
  bulunuyorsa hangi menüde olduğu. Kaynak: Luca kullanım kılavuzu, demo veya Luca destek.
- **doğrulanacak:** Luca'da **puantaj** ve **izin** takibinin olup olmadığı; varsa hangi alanlarla
  tutulduğu.
- **doğrulanacak:** Luca'nın bir **bordro** ürünü/modülü olup olmadığı, yoksa mali müşavir
  programlarıyla nasıl entegre olduğu. Kaynak: <https://luca.com.tr/> ürün listesi ve
  <https://www.lucanetone.com.tr> (içerik okunmadı, `02-LUCA-ENVANTERI.md:13`).
- **doğrulanacak:** Luca'da personel avansı ve iş avansı hareketlerinin nerede tutulduğu
  (banka/kasa mı, personel kartı mı).
- **doğrulanacak:** BES entegrasyonunun teknik ayrıntısı, hangi verileri hangi yönde taşıdığı ve
  ücreti (`02-LUCA-ENVANTERI.md:71` "teknik ayrıntı doğrulanacak" notu).

## 3. Bizde bugün

**Veri modeli:**

- `Staff`: `FullName`, `NationalId`, `Phone`, `StartDate`, `MonthlySalary`, `Notes`, `IsActive`,
  `LegacyKey` (`server/YesLojistik.Core/Entities/Staff.cs:4-15`).
- `StaffTransaction`: `StaffId`, `Date`, `Kind` (`Advance`/`Bonus`/`SalaryPayment`), `Amount`, `Note`,
  `CashAccountId` (`Staff.cs:17-28`).
- Tablo adı `staff` olarak sabitlenmiştir (`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:394`);
  alan uzunlukları `AppDbContext.cs:390-399` (`FullName` 150, `NationalId` 11, `Phone` 30, `Notes` 500).
- `StaffTransaction` ilişkileri ve indeksi: `AppDbContext.cs:400-406`
  (`StaffId + Date` indeksi, hesap silme kısıtlı).
- **Yok olanlar:** görev/unvan, departman, işe çıkış tarihi, IBAN, ücret tipi, kesinti tanımı,
  puantaj, izin, personel belgesi, kullanıcı hesabı bağı, masraf merkezi.

**İş kuralları (var olan):**

- Ay hesabı: `StaffController.Month` (`server/YesLojistik.Api/Controllers/StaffController.cs:19-24`).
- **Maaş tahakkuku:** yalnız aktif personel ve işe başlangıcı dönem sonundan önce olan personel için
  maaş sayılır (`StaffController.cs:36-39`).
- **Kalan = maaş + prim − avans − ödenen** (`StaffController.cs:43-44`).
- **Prim kasadan para çıkarmaz:** `Bonus` hareketinde `CashAccountId` zorlanarak `null` yapılır
  (`StaffController.cs:88-89`).
- Hareketi olan personel silinemez; "Çalışmıyor" işaretlenir
  (`StaffController.cs:70-71`, ekran mesajı `client/src/pages/StaffPage.tsx:139`).
- Kasa/banka bakiyesine avans ve maaş ödemesi girer, prim girmez
  (`server/YesLojistik.Infrastructure/Services/CashService.cs:42-46`).

**Ekran:**

- `client/src/pages/StaffPage.tsx:27-97`. `PageShell` + `DataTable` + `MobileCards` kullanır
  (`StaffPage.tsx:13-14`), yeni görünümde "⋯ Diğer" menüsü vardır (`StaffPage.tsx:53-55`).
- Üç `StatCard`: bu ayın maaşları, verilen avans, ödenecek kalan (`StaffPage.tsx:65-69`).
- Sütunlar: Personel, Maaş, Avans, Prim, Ödenen, Kalan (`StaffPage.tsx:35-50`); mobil kart görünümü
  `StaffPage.tsx:75-89`.
- Ay seçici `<input type="month">` (`StaffPage.tsx:71-72`).
- Personel formu `StaffPage.tsx:110-142`; hareket defteri penceresi `StaffPage.tsx:154-198`
  (avans/prim/maaş seçimi, tutar, tarih, hesap, not).
- Rota `/personel` (`docs/plan/01-ORTAK-SARTNAME.md:204`); menüde "Personeller" (klasik)
  `client/src/lib/nav.ts:45` ve "Personel Listesi" (yeni) `nav.ts:95`.
- Excel aktarım şablonu: "Ad Soyad, TC Kimlik No, Telefon, İşe Başlangıç, Maaş, Not"
  (`server/YesLojistik.Infrastructure/Services/ImportService.cs:54`); zorunlu alan yalnız "Ad Soyad"
  (`ImportService.cs:71`).

**Şoför tarafı (ayrı ama bağlantılı):**

- Şoförler `Staff` değil `Driver` tablosundadır (`server/YesLojistik.Core/Entities/Driver.cs:3-28`);
  şoför belgeleri, ehliyet, SRC, psikoteknik tarihleri burada tutulur (`Driver.cs:7-11`).
- Şoför hesabı: `DriverLedgerService` (`server/YesLojistik.Infrastructure/Services/DriverLedgerService.cs:15-66`).
  Avans şoför hesabına **borç** yazar (`DriverLedgerService.cs:29-30`); şoförün kendi cebinden
  yaptığı **onaylı** masraf alacak yazar (`DriverLedgerService.cs:31-33`); onay bekleyen masraf
  bakiyeye girmez, yalnız `pending` toplamında görünür (`DriverLedgerService.cs:45`).
- Şoför avansı/harcırahı `Expense` üzerinden gider kaydıdır: kategori `DriverAdvance` veya
  `DriverAllowance` (`server/YesLojistik.Core/Entities/Expense.cs:5`), şoför zorunluluğu
  (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:93-94`).
- Şoför mutabakatı `DriverSettlement` tablosudur (yön: şoföre ödeme / şoförden alınan,
  `server/YesLojistik.Core/Entities/Enums.cs:45-46`).

**Şoför uygulaması (`mobile/`):**

- Masraf girişi: `mobile/src/components/ExpenseCard.tsx:36-60`. Kategoriler yakıt, otoyol, bakım,
  diğer (`ExpenseCard.tsx:12-17`); tutar, litre, km ve fiş fotoğrafı alınır; işlem çevrimdışı kuyruğa
  girer (`mobile/src/lib/outbox.ts:10-12`).
- Teslim ekranı: `mobile/src/app/sofor/teslim/[id].tsx:19-62` (teslim alan adı, imza, fotoğraf, not).
- Ofis tarafı onay ekranı: `mobile/src/app/yonetim/onay.tsx:28-81` (onayla veya gerekçeyle reddet;
  gerekçe şoföre bildirim olarak gider).
- Ofisten gider girişi: `mobile/src/app/yonetim/gider.tsx:19-70`; tahsilat
  `mobile/src/app/yonetim/tahsilat.tsx`, ödeme `mobile/src/app/yonetim/odeme.tsx`.
- Mobil "Daha" menüsünde gider ve onay kısayolları `mobile/src/app/yonetim/(tabs)/daha.tsx:30-31`.
- **Personel (ofis çalışanı) için mobil ekran yoktur.** Şoför avansını da göremez; yalnız masraf
  girebilir.

**Eksik listesi:** (1) görev/departman alanı yok, (2) işe çıkış tarihi yok, (3) IBAN yok,
(4) ücret/kesinti tanımı yok, (5) puantaj yok, (6) izin yok, (7) personel belgesi yok,
(8) kullanıcı hesabı bağı yok, (9) masraf merkezi bağı yok, (10) muhasebe aktarım çıktısı yok,
(11) şoför mobilinde avans/harcırah görünmüyor.

## 4. Hedef ekranlar ve alanlar

### 4.1 Personel kartı (genişletme)

Mevcut form alanları korunur (`client/src/pages/StaffPage.tsx:129-135`); eklenen alanlar:

| Alan | Tip | Zorunlu | Not |
|---|---|---|---|
| Görev | seçim (görev tanımları) | evet | Ör. Şoför değil "Depo sorumlusu" |
| Departman | seçim (tanım) | hayır | Ör. Operasyon, Muhasebe, Depo |
| İşe giriş | tarih | evet (mevcut `startDate`) | |
| İşten çıkış | tarih | hayır | Doluysa ve geçmişse maaş tahakkuk etmez |
| Ücret tipi | seçim (aylık net / aylık brüt / günlük / saatlik) | evet, varsayılan aylık net | **Yalnız tanım**; hesap yapılmaz |
| Aylık ücret | tutar | evet | Mevcut `MonthlySalary` |
| IBAN | metin (34) | hayır | Mevcut IBAN doğrulayıcı kullanılır |
| SGK işe giriş tarihi | tarih | hayır | Kayıt amaçlı |
| Personel no | metin (20) | hayır | Boşsa `Id` gösterilir |
| Kullanıcı hesabı | seçim (panel kullanıcısı) | hayır | Bağlanırsa "hesabı olan personel" rozeti |
| Masraf merkezi | seçim | hayır | `17-GIDER-GELIR-MERKEZLERI.md` |
| Uyruk / kimlik tipi | seçim | hayır | Yabancı personelde pasaport no |
| Notlar | metin (500) | hayır | Mevcut alan |

### 4.2 Sekmeli personel detayı

Personel satırına tıklanınca açılan pencere (mevcut hareket defteri genişletilir,
`StaffPage.tsx:154-198`):

**Özet** · bu ay hak ediş, avans, ödenen, kalan; yıl toplamı.
**Hareketler** · mevcut liste + yeni türler: **İş avansı**, **Masraf ödemesi**, **Kesinti**,
**İkramiye**, **İzin ücreti**. Sütunlar: tarih, tür, tutar, hesap, not, belge, işlemi yapan.
**Ücret ve kesinti** · tanım satırları (aşağıdaki 4.3).
**Puantaj** · ay seçici + gün ızgarası (aşağıdaki 4.4).
**İzin** · izin kayıtları (aşağıdaki 4.5).
**Belgeler** · sözleşme, sağlık raporu, ehliyet (varsa). Mevcut belge altyapısı kullanılır
(`DocumentOwnerType` içine `Staff` eklenir, `server/YesLojistik.Core/Entities/Enums.cs:50`).
**Devamsızlık** · puantajdan türeyen özet.

### 4.3 Ücret ve kesinti tanımları

Personel bazlı tanım satırları. **Hesap yapılmaz**; yalnız tanım ve muhasebe aktarımında kullanılacak
tutar bilgisi tutulur.

| Alan | Tip | Zorunlu | Not |
|---|---|---|---|
| Kesinti/ek adı | metin (100) | evet | Ör. "Yemek kesintisi", "Yol yardımı" |
| Tür | seçim (ek ödeme / kesinti) | evet | İşareti belirler |
| Tutar | tutar | evet | |
| Periyot | seçim (aylık / tek seferlik / oran) | evet | |
| Oran | yüzde | "oran" ise evet | Brüt ücret üzerinden **tanım** |
| Başlangıç / bitiş | tarih | evet / hayır | Dönemsel kesinti |
| Masraf merkezi | seçim | hayır | |
| Muhasebe kodu | metin (20) | hayır | Mali müşavirin hesap kodu; **doğrulanacak** |

### 4.4 Puantaj

Ay ızgarası: satır = personel, sütun = gün (1–31). Her hücre için kısa kodlar:
`T` tam gün, `Y` yarım gün, `İ` izinli, `R` raporlu, `G` gelmedi, `F` fazla mesai (saat).

Kurallar: ayın gün sayısına göre hücre sayısı değişir; toplam tam gün = gün sayısı − (yarım × 0,5) −
gelmedi. **Hakediş hesabı yapılmaz**; gün toplamı yalnız muhasebe aktarımına ve rapora gider.

Toplu doldurma düğmeleri: "Hepsini tam gün yap", "Hafta sonunu doldur", "Devral geçen aydan".

### 4.5 İzin

| Alan | Tip | Zorunlu | Not |
|---|---|---|---|
| Tür | seçim (yıllık / mazeret / hastalık / ücretsiz / doğum / askerlik) | evet | |
| Başlangıç / bitiş | tarih | evet | |
| Gün sayısı | sayı (hesaplı, düzeltilebilir) | evet | İş günü mü takvim günü mü: seçim |
| Onay durumu | seçim (bekliyor / onaylandı / reddedildi) | evet | |
| Açıklama | metin (300) | hayır | |
| Belge | dosya | hayır | Rapor vb. |

**Yıllık izin hakediş hesabı yapılmaz** (kıdem hesabı mevzuata bağlıdır; mali müşavir/İK onayı
gerekir). Yalnız kullanılan izin günleri toplanır ve ekranda gösterilir.

### 4.6 Muhasebe aktarım çıktısı

`Raporlar → Personel Muhasebe Aktarımı` sekmesi. Ay seçilir, tablo üretilir:

| Sütun | İçerik |
|---|---|
| Personel no | |
| Ad soyad | |
| Görev / departman | |
| Masraf merkezi | Kod · Ad |
| Hak ediş (tanım) | Aylık ücret + ek ödemeler |
| Kesintiler | Tanım satırları toplamı |
| Avans | Ay içindeki avans hareketleri |
| Ödenen | Ay içindeki maaş ödemeleri |
| Kalan | Hak ediş + prim − avans − ödenen (mevcut formül, `StaffController.cs:44`) |
| Puantaj günü | Tam gün toplamı |
| Muhasebe kodu | Personel/tanım bazlı kod |

Dışa aktarma: Excel (mevcut `ExportButton`/`ExcelExporter` deseni). **Beyanname değildir**; aktarım
dosyasıdır. Ekranda bu açıkça yazar: "Bu çıktı muhasebe aktarımı içindir; beyanname yerine geçmez."

## 5. İş kuralları

1. **Bordro hesabı yok.** Sunucu gelir vergisi, SGK primi, damga vergisi, AGİ hesaplamaz. Kod içinde
   oran sabiti **bulunmaz**. Bu, yanlış beyan riskini ortadan kaldırır ve mevzuat değişikliğinde
   kodun bozulmamasını sağlar.
2. **Maaş tahakkuku mevcut kuralı korur:** pasif personel ve işe başlangıcı dönem sonundan sonra olan
   personel için maaş sayılmaz (`server/YesLojistik.Api/Controllers/StaffController.cs:36-39`).
   **Yeni:** işten çıkış tarihi dönem başından önceyse de maaş sayılmaz; çıkış dönem ortasındaysa
   maaş **tam ay** sayılır, uyarı rozeti görünür ("Ay ortasında çıkış; kısmi ay elle düzeltilmeli").
   Gerekçe: kısmi ay hesabı gün/30 gibi varsayım gerektirir ve bu bir **bordro** hesabıdır.
3. **Prim kasadan para çıkarmaz.** Kural korunur (`StaffController.cs:88-89`).
4. **Kesinti tanımı hak edişi değiştirmez.** Kesinti satırı yalnız aktarım çıktısında ve ekranda
   toplanır; "Kalan" formülü mevcut hâliyle kalır (`StaffController.cs:44`). Böylece bugünkü ekran
   sayıları **değişmez** ve kullanıcı şaşırmaz. İleride kesintinin kalanı düşmesi istenirse, bu ayrı
   bir karar ve ayrı bir belge konusudur.
5. **Puantaj kilitli değil ama iz bırakır.** Puantaj hücresi değiştirilebilir; değişiklik
   `AuditLog`'a yazılır. Ay kapandıysa (aktarım dosyası üretildiyse) uyarı verilir.
6. **İzin onayı iki adımlı.** Personel talebi (veya ofis girişi) `bekliyor` doğar; yönetici
   onaylar/reddeder. Onaylanan izin puantaja **otomatik yansımaz**; kullanıcı puantajda `İ` işaretler.
   Gerekçe: otomatik yansıma, onaylanan izinle fiilî durum farklıysa veriyi bozar.
7. **Avans ve iş avansı ayrımı.** *İş avansı*: personelin iş için harcayacağı para (yol, kırtasiye,
   yakıt); harcama belgesi geldiğinde mahsup edilir. *Kişisel avans*: ücretten kesilecek avanstır.
   İkisi ayrı hareket türüdür; muhasebe aktarımında ayrı satırda görünür.
8. **Şoför avansı ayrı kalır.** Şoför avansı `DriverLedgerService` üzerinden şoför hesabına yazılır
   (`server/YesLojistik.Infrastructure/Services/DriverLedgerService.cs:29-30`); personel avansı
   `StaffTransaction` üzerinden yürür. **İki bakiye birbirine karıştırılmaz**; şoför aynı zamanda
   personel olarak kayıtlı olsa bile iki ayrı hesap görür.
9. **Kullanıcı hesabı bağı isteğe bağlı.** Personel kartına panel kullanıcısı bağlanabilir; bağ
   kurulunca personel silinemez, yalnız "Çalışmıyor" işaretlenir. Bağ, rol atamaz; rol
   `Ayarlar → Kullanıcılar` ekranından verilir (`client/src/pages/SettingsPage.tsx:26-40`).
10. **Yetki.** Personel kartı ve maaş bilgisi `Accounting` politikasındadır
    (`server/YesLojistik.Api/Controllers/StaffController.cs:16`). Operasyon rolü personel listesini
    görmez; bu bilinçlidir (ücret gizliliği).
11. **Ayna ve lisans.** Ayna modu açıkken personel yazma uçları reddedilir; lisans süresi dolmuşsa
    ekran salt okunur olur (`01-ORTAK-SARTNAME.md:20-23`).
12. **Yuvarlama.** Bütün tutarlar `Money.Round` ile 2 haneye yuvarlanır
    (`server/YesLojistik.Core/Domain/Money.cs`).

## 6. Veri modeli

**Mevcut tablolara ekleme (boş olabilen sütunlar):**

- `staff`: `position_id` (int?), `department_id` (int?), `end_date` (date?), `exit_reason` (100),
  `salary_type` (metin 20; `monthly_net`/`monthly_gross`/`daily`/`hourly`), `iban` (34),
  `staff_no` (20), `user_id` (int?), `cost_center_id` (int?), `sgk_start_date` (date?),
  `nationality` (60), `id_type` (20).
- `staff_transactions`: yeni `Kind` değerleri (`WorkAdvance` iş avansı, `ExpenseReimbursement` masraf
  ödemesi, `Deduction` kesinti, `Grant` ikramiye) ve `document_no` (50), `cost_center_id` (int?),
  `definition_id` (int?; hangi kesinti tanımından doğdu).

**Yeni tablolar:**

**`staff_roles` / `staff_positions` (görev tanımı):** `name` (100, tekil), `department_id` (int?),
`default_salary_type` (20), `note` (300), `is_active`, `sort_order`.

**`staff_departments` (departman):** `name` (100, tekil), `parent_id` (int?), `is_active`.

**`staff_definitions` (ücret ve kesinti tanımı):** `staff_id` (int?), `name` (100),
`kind` (`earning`/`deduction`), `amount` (tutar?), `rate` (yüzde?), `period`
(`monthly`/`once`/`rate`), `from_date` (date), `to_date` (date?), `cost_center_id` (int?),
`account_code` (20), `is_active`.

**`staff_timesheets` (puantaj):** `staff_id`, `date` (date), `code` (metin 2; `T`/`Y`/`I`/`R`/`G`),
`overtime_hours` (yüzde/sayı), `note` (200), `entered_by`. Kısıt: personel + tarih tekil.

**`staff_leaves` (izin):** `staff_id`, `kind` (`annual`/`excuse`/`sick`/`unpaid`/`maternity`/
`military`), `from_date`, `to_date`, `days` (sayı), `day_mode` (`workday`/`calendar`),
`status` (`pending`/`approved`/`rejected`), `note` (300), `document_path` (300),
`approved_by`, `approved_at`.

**`staff_ledger_periods` (ay kapanışı — isteğe bağlı):** `staff_id`, `year`, `month`,
`accrued` (tutar), `advance` (tutar), `paid` (tutar), `remaining` (tutar), `timesheet_days` (sayı),
`exported_at`, `exported_by`. Kapanan ay için aktarım çıktısının fotoğrafı.

**Belge sahibi:** `DocumentOwnerType` listesine `Staff` eklenir
(`server/YesLojistik.Core/Entities/Enums.cs:50`); `FleetDocument` tablosu yeniden kullanılır
(`server/YesLojistik.Core/Entities/FleetDocument.cs`).

**Migration:** yalnız ekleme; mevcut `staff` ve `staff_transactions` sütunları silinmez
(`01-ORTAK-SARTNAME.md:22-23`).

## 7. API uçları

| Metot | Yol | İstek / yanıt | Yetki |
|---|---|---|---|
| GET | `/api/staff` | mevcut: `month` → liste (genişletilir: görev, departman, çıkış tarihi) | `Accounting` |
| POST/PUT/DELETE | `/api/staff` | mevcut kart uçları + yeni alanlar | `Accounting` |
| GET | `/api/staff/{id}` | detay (kart + özet) | `Accounting` |
| GET/POST/PUT/DELETE | `/api/staff/{id}/transactions` | mevcut + yeni hareket türleri | `Accounting` |
| GET/POST/PUT/DELETE | `/api/staff/positions` | görev tanımları | `Accounting` |
| GET/POST/PUT/DELETE | `/api/staff/departments` | departman tanımları | `Accounting` |
| GET/POST/PUT/DELETE | `/api/staff/{id}/definitions` | ücret/kesinti tanımları | `Accounting` |
| GET | `/api/staff/timesheet` | `month`, `departmentId` → ızgara | `Accounting` |
| PUT | `/api/staff/timesheet` | `staffId`, `date`, `code`, `overtimeHours` | `Accounting` |
| POST | `/api/staff/timesheet/bulk` | `month`, `mode` (allFull/weekend/previous) | `Accounting` |
| GET/POST/PUT/DELETE | `/api/staff/leaves` | izin kayıtları; `status` değişimi onay akışı | `Accounting` |
| POST | `/api/staff/leaves/{id}/approve` | onay/red + gerekçe | `Accounting` |
| GET | `/api/staff/leaves/summary` | personel bazlı kullanılan izin günleri (hakediş değil) | `Accounting` |
| GET | `/api/staff/accounting-export` | `year`, `month` → aktarım tablosu | `Accounting` |
| GET | `/api/staff/accounting-export/excel` | aynı tablonun Excel'i | `Accounting` |
| POST | `/api/staff/periods/close` | ayı kapatır (aktarım fotoğrafı) | `Admin` |
| GET | `/api/driver/me/advances` | şoförün avans/harcırah/hareket özeti (mobil) | `Driver` |
| GET | `/api/lookups/staff-positions`,`/api/lookups/staff-departments` | seçim listeleri | ofis |

Mevcut `GET /api/staff` ve `/api/staff/{id}/transactions` uçları **korunur**
(`server/YesLojistik.Api/Controllers/StaffController.cs:26-34`, `:77-95`); yeni uçlar onların yerine
geçmez, genişletir. Bu, canlı panelin çalışmasını bozmaz.

## 8. Yetki, onay ve denetim izi

| İş | Admin | Muhasebe | Operasyon | Şoför |
|---|---|---|---|---|
| Personel listesi (ücret dahil) | ✔ | ✔ | — | — |
| Personel kartı oluştur/güncelle | ✔ | ✔ | — | — |
| Görev/departman tanımı | ✔ | ✔ | — | — |
| Avans / iş avansı / prim / ödeme | ✔ | ✔ | — | — |
| Kesinti tanımı | ✔ | ✔ | — | — |
| Puantaj girişi | ✔ | ✔ | — | — |
| İzin onayı | ✔ | ✔ | — | — |
| İzin talebi (kendi) | ✔ | ✔ | ✔ | — |
| Muhasebe aktarımı | ✔ | ✔ | — | — |
| Ay kapatma | ✔ | — | — | — |
| Kendi avans/harcırah görüntüleme | — | — | — | ✔ |

**Maker-checker:** kesinti tanımı ekleme/değiştirme ile ay kapatma **iki adımlıdır**; tanımı giren
kişi ayı tek başına kapatamaz. Gerekçe: kapanan ay sonradan değişirse muhasebe aktarımı ile panel
arasında fark oluşur.

**Onay akışı — şoför masrafı ile ilişki:** Mevcut akış korunur. Şoförün mobilde girdiği masraf
`ApprovalStatus.Pending` doğar (`server/YesLojistik.Core/Entities/Expense.cs:32-36`), ofiste
`ExpenseService.ReviewAsync` ile onaylanır veya gerekçeyle reddedilir ve reddedileni şoföre bildirim
gider (`server/YesLojistik.Infrastructure/Services/ExpenseService.cs:31-47`). Onaylı masraf şoför
hesabına alacak yazılır (`DriverLedgerService.cs:31-33`); onay bekleyen masraf bakiyeye **girmez**
(`DriverLedgerService.cs:45`). **Yeni:** onaylanan şoför masrafı, şoförün kartında **masraf merkezi**
bilgisiyle görünür ve personel muhasebe aktarımında ayrı satır olarak listelenir.

**Denetim izi:** `AppDbContext.SaveChangesAsync` her değişikliği işlem geçmişine yazar
(`server/YesLojistik.Infrastructure/Data/AppDbContext.cs:456-492`). Puantaj hücresi değişikliği,
izin onayı/reddi, kesinti tanımı değişikliği (eski/yeni tutar), avans iptali ve ay kapatma
işlemleri ayrıca açık etiketle loglanır.

## 9. Kabul kriterleri

1. Personel kartı; görev, departman, işe çıkış, IBAN ve ücret tipi alanlarıyla kaydedilir.
2. İşten çıkış tarihi dönem başından önce olan personel için maaş tahakkuku **0** olur (test).
3. Ay ortasında çıkışta maaş tam ay sayılır ve satırda **uyarı rozeti** görünür.
4. **Kalan** formülü değişmez: maaş + prim − avans − ödenen; mevcut testler değiştirilmeden geçer
   (`server/YesLojistik.Tests/Integration/StaffTests.cs`).
5. Prim hareketi hiçbir koşulda kasa/banka bakiyesini değiştirmez (test).
6. Puantajda ayın gün sayısı kadar hücre çizilir; toplam tam gün doğru hesaplanır
   (Şubat 28/29, 31 günlük ay testleri).
7. Puantajda **en fazla 20 personel × 31 gün** tek ekranda, 1440×900'de yatay kaydırma olmadan
   görünür; fazlası sayfalanır.
8. İzin talebi onaylandığında puantaj **kendiliğinden değişmez**; kullanıcı işaretler (test).
9. Muhasebe aktarımındaki toplamlar ekrandaki personel toplamlarıyla **birebir** aynıdır; Excel
   çıktısı ekranla eşleşir.
10. Aktarım tablosunda "beyanname değildir" uyarı metni görünür.
11. Bordro hesabı yapan **hiçbir kod yolu yoktur**: sunucuda gelir vergisi/SGK/damga sabiti
    bulunmaz (kod araması testi).
12. Şoför mobilde kendi avans/harcırah toplamını görür; 390×844'te yatay kaydırma yoktur.
13. Şoför avansı ile personel avansı iki ayrı bakiyede kalır; aynı kişi iki kayıtta olsa bile
    toplamlar karışmaz (test).

## 10. Testler

**Sunucu birim testleri** (`server/YesLojistik.Tests/Unit/`):

- `StaffAccrualTests.cs` — maaş tahakkuku: aktif/pasif, işe başlangıç sınırı, işten çıkış öncesi/sonrası,
  ay ortasında çıkış uyarısı.
- `TimesheetTests.cs` — kod toplama (T/Y/İ/R/G), yarım gün 0,5, fazla mesai saati toplamı, ay
  gün sayısı doğrulaması, toplu doldurma modları.
- `StaffLeaveTests.cs` — izin gün hesabı (iş günü/takvim günü), onay durumu geçişleri, **hakediş
  hesabı yapılmadığının** doğrulanması (fonksiyon yok).
- `StaffDefinitionTests.cs` — kesinti tanımı toplamı, dönemsel (başlangıç/bitiş) süzme, oran tanımı.
- `NoPayrollConstantsTests.cs` — kod tabanında gelir vergisi/SGK/damga oranı sabiti **bulunmadığını**
  doğrulayan koruma testi (yanlışlıkla bordro eklenmesini engeller).

**Sunucu entegrasyon testleri** (`server/YesLojistik.Tests/Integration/`):

- `StaffCardTests.cs` — yeni alanlarla oluşturma/güncelleme, IBAN doğrulaması, kullanıcı hesabı bağı,
  hesabı bağlı personelin silinememesi.
- `StaffLedgerTests.cs` — avans, iş avansı, prim, maaş ödemesi, kesinti; kasa/banka bakiyesine
  etkileri; primin bakiye değiştirmemesi.
- `StaffTimesheetApiTests.cs` — ızgara okuma, hücre güncelleme, toplu doldurma, ay kapatma sonrası
  uyarı.
- `StaffLeaveApiTests.cs` — talep → onay → red akışı, onaylayan/hazırlayan ayrımı, puantaja
  otomatik yansımama.
- `StaffAccountingExportTests.cs` — aktarım toplamları, Excel çıktısı, dönem fotoğrafı.
- `DriverAdvanceMobileTests.cs` — şoförün kendi avans/harcırah toplamını görmesi; **personel
  avansıyla karışmaması**.
- Mevcut `StaffTests.cs` ve `FuelAndAdvanceTests.cs` **bozulmadan** geçer.

**Panel e2e testleri** (`client/e2e/`):

- `client/e2e/staff.spec.ts` — kart ekle/düzenle (görev, departman, çıkış tarihi), hareket defteri,
  avans/prim/ödeme kaydı, "Kalan" değerinin değişmediğinin doğrulanması.
- `client/e2e/staff-timesheet.spec.ts` — puantaj ızgarası, toplu doldurma, ay geçişi.
- `client/e2e/staff-leave.spec.ts` — izin talebi ve onay; puantajın kendiliğinden değişmemesi.
- `client/e2e/new-ui/staff-export.spec.ts` — `useNewUi(page)` ile muhasebe aktarımı sekmesi ve
  "beyanname değildir" uyarısı.
- `client/e2e/staff-mobile.spec.ts` — 390×844'te kart görünümü ve yatay kaydırma olmaması.

**Mobil:** `mobile/src/app/yonetim/(tabs)/daha.tsx` içine personel kısayolu eklenirse
`mobile/` typecheck ve mevcut `client/e2e/driver-app.spec.ts` korunur.

**Test verisi:** uydurma personel adları ("Ayşe Yılmaz", "Depo sorumlusu"), uydurma tutarlar; gerçek
TC kimlik no, gerçek IBAN, gerçek ücret **kullanılmaz** (`01-ORTAK-SARTNAME.md:20`).

## 11. Efor ve bağımlılıklar

| İş paketi | Kişi-gün |
|---|---|
| Şema eklemeleri + 6 yeni tablo + migration | 3 |
| Personel kartı genişletmesi (ekran + API) | 3 |
| Görev/departman tanımları | 2 |
| Ücret ve kesinti tanımları | 3 |
| Hareket türleri (iş avansı, masraf ödemesi, kesinti, ikramiye) | 3 |
| Puantaj ızgarası + toplu doldurma | 5 |
| İzin modülü + onay akışı | 4 |
| Belgeler (Staff sahibi tipi) | 1 |
| Muhasebe aktarımı + Excel + ay kapatma | 4 |
| Şoför mobil avans/harcırah ekranı | 2 |
| Yetki ve denetim izi eklemeleri | 1 |
| Testler (birim + entegrasyon + e2e) | 5 |
| **Toplam** | **36 kişi-gün** |

**Bağımlılıklar:** `05-VERI-MODELI.md` (tablo adları ve ortak sütunlar),
`07-YETKI-ONAY-NUMARALANDIRMA.md` (rol matrisi, onay akışları, maker-checker),
`17-GIDER-GELIR-MERKEZLERI.md` (personel giderinin masraf merkezine yazılması ve bütçeye yansıması),
`14-KASA.md` (avans ve maaş ödemesinin hesaptan düşmesi), `06-MUHASEBE-MOTORU.md` (muhasebe kodu ve
aktarım biçimi), `28-MUHASEBECI-PAKETI.md` (aktarım dosyasının mali müşavire ulaşması),
`29-MOBIL-VE-DISA-ACILIM.md` (şoför uygulaması ve rol bazlı mobil ekranlar),
`32-VERI-GOCU-EXCEL-AKTARIM.md` (personel listesinin Excel'den aktarımı).

**Önce bitmeli:** `05-VERI-MODELI.md`, `07-YETKI-ONAY-NUMARALANDIRMA.md`,
`17-GIDER-GELIR-MERKEZLERI.md`.

**Not:** Bu modül, şoför mobil uygulamasına dokunduğu için `mobile/` tarafında ayrı typecheck
gerektirir; mobil değişiklikleri `29-MOBIL-VE-DISA-ACILIM.md` ile koordine edilir.

## 12. Riskler ve doğrulanacaklar

| Risk | Önlem | Geri dönüş |
|---|---|---|
| Kullanıcı "bordro bekliyor", sonuç almıyor | Kapsam sınırı ekranda ve bu dokümanda **açıkça** yazılı; aktarım çıktısı "beyanname değildir" der | Kapsam yeniden konuşulur; ayrı ürün/entegrasyon değerlendirilir |
| Kesinti tanımı yanlış anlaşılır, "Kalan" beklenmedik çıkar | Kesinti toplamı "Kalan" formülünü **değiştirmez**; ayrı sütunda gösterilir | Tanım satırı silinir; formül hiç değişmediği için sayılar bozulmaz |
| Puantaj ile fiilî durum farkı | Puantaj elle girilir, izin otomatik yansımaz; değişiklik denetim izinde | Hücre düzeltilir; ay kapatılmadıysa serbest |
| Ay kapatıldıktan sonra geriye dönük değişiklik | Kapanan ayda uyarı; maker-checker ile kapatma | Kapanış kaydı kaldırılır (Admin, denetim izli) |
| Ücret bilgisi yetkisiz kişiye görünür | Tüm personel uçları `Accounting` politikasında (`StaffController.cs:16`); menüde `perm` kontrolü (`client/src/lib/nav.ts:45`) | Rol ayarı düzeltilir |
| Şoför avansı ile personel avansı karışır | İki ayrı tablo ve iki ayrı bakiye; testle korunur | Kayıtlar tür bazlı ayrıştırılarak düzeltilir |
| Küçük ekipte maker-checker pratikte çalışmaz (tek muhasebeci) | "Sahip modu" ve tek kullanıcılı kurulumda onay kuralı esnetilir, gerekçe zorunlu olur | Kural ayarı geri alınır |

**Doğrulanacaklar (dış bilgi):**

- **doğrulanacak:** Luca Net/Koza'da personel, puantaj, izin ve ücret/kesinti modülünün bulunup
  bulunmadığı; bulunuyorsa menü yeri ve alanları. Kaynak: Luca kullanım kılavuzu / demo / Luca
  destek.
- **doğrulanacak:** Luca'nın bordro üretip üretmediği, üretmiyorsa hangi mali müşavir programıyla
  nasıl entegre olduğu. Kaynak: Luca ürün sayfaları, <https://www.lucanetone.com.tr>.
- **doğrulanacak:** BES entegrasyonunun teknik ayrıntısı ve kapsamı (`02-LUCA-ENVANTERI.md:67-71`).
- **doğrulanacak:** muhasebe aktarım dosyasının biçimi: hangi sütunlar, hangi hesap kodları, hangi
  program (Luca, başka bir program, Excel). Kaynak: **mali müşavir**.
- **doğrulanacak:** muhasebe kodlarının (personel, kesinti, prim, avans) listesi ve işyeri SGK sicil
  numarası. Kaynak: **mali müşavir**.
- **doğrulanacak:** puantaj kodlarının (T/Y/İ/R/G/F) mali müşavirin beklediği kodlarla uyumu.
- **doğrulanacak:** iş avansının muhasebeleşme biçimi (hangi hesap, ne zaman mahsup edilir).
- **doğrulanacak:** kullanıcının kendi görev ve departman listesi; **pratikortam verisi depoya
  girmez**, yalnız tanım **adları** kullanıcı onayıyla taşınır.
- **doğrulanacak:** kısmi ay (ay ortasında giriş/çıkış) için kullanıcının beklediği davranış; bu
  tercih bilinçli olarak hesapsız bırakıldı ve kullanıcı kararı bekleniyor.

**Mevzuat notu:** Bordro, gelir vergisi, SGK primi, damga vergisi, kıdem/ihbar tazminatı, yıllık izin
hakedişi ve resmî bildirimler **mevzuata bağlıdır**. Bu doküman **mevzuat yorumu yapmaz** ve bu
hesapları **yapmaz**. Bordro/İK mevzuatı için **uzman onayı gerekir** (mali müşavir ve İK/bordro
uzmanı); çıkacak sonuçların sorumluluğu bu yazılımın kapsamında değildir. Bu modül yalnız **kayıt ve
muhasebe aktarımı** üretir.

Sonraki belgeyle bağlantı: `17-GIDER-GELIR-MERKEZLERI.md` personel giderinin masraf merkezine ve
bütçeye yansımasını, `14-KASA.md` avans ve maaş ödemesinin kasa/banka bakiyesinden düşmesini,
`29-MOBIL-VE-DISA-ACILIM.md` şoför uygulamasındaki avans/harcırah ekranını, `28-MUHASEBECI-PAKETI.md`
ise aktarım dosyasının mali müşavire ulaşmasını bu dokümanın veri modeline bağlar.
