# 10 — Tahsilat ve ödeme formları

## 1. Amaç ve kapsam

Bu belge iki formu ve onları açan iki listeyi tarif eder: müşteriden para girişini kaydeden
**"Tahsilat Ekle"** (`client/src/components/PaymentForm.tsx`) ve tedarikçiye para çıkışını kaydeden
**"Ödeme Yap"** (`client/src/components/SupplierPaymentForm.tsx`). Bunlar panelin sık işlerinden
7 ve 8'dir: "Tahsilat girmek → 2 tık + form", "Tedarikçiye ödeme girmek → 2 tık + form"
(`docs/KOLAYLASTIRMA-PLANI.md:259-260`).

Kapsam içi: iki formun alan sırası ve zorunlu/isteğe bağlı ayrımı; beş ödeme yönteminin forma
etkisi; faturaya (tahsilat) ve sevkiyata (tedarikçi ödemesi) bağlama; çek/senet vadesi ve **çek
portföyüne** giriş; kaydın **kasa/banka** ve **cari** bakiyesine etkisi; **"Kaydettikten sonra
formu açık tut"** seçeneğinin yalnız bu iki formda olması; iki liste sayfasının süzgeç, toplam
şeridi, dışa aktarma ve telefon davranışı.

Kapsam dışı: çek/senet durum yönetimi `ChecksPage` ve `12-CEKLER.md`; hesapların kendisi
`11-BANKALAR.md`; fatura kesme `05-E-FATURA.md`; iadelerin muhasebe anlatımı
`24-RAPORLAR-MUHASEBE.md` (henüz yazılmadı, `00-DIZIN.md:64`). Toplu tedarikçi ödeme uçları
`09-TEDARIKCILER-CARI.md` belgesindedir.

Bu belge **kod değiştirmez**; `docs/plan/01-ORTAK-SARTNAME.md` §2 şablonunu ve §3 ortak
gerçeklerini varsayar. `PageShell`, `DetailDrawer` ve `pages/TodayPage.tsx` kodda **yoktur**
(`01-ORTAK-SARTNAME.md:143-146`); §13'te "doğrulanacak" olarak anılır, §10'da adları geçmez.

## 2. Bugünkü durum (kod kanıtıyla)

**İki ayrı sayfa.** `/tahsilatlar` → `client/src/pages/PaymentsPage.tsx`, `/odemeler` →
`client/src/pages/SupplierPaymentsPage.tsx` (`client/src/App.tsx:102-103`). İkisi aynı iskeleti
kullanır, **`PageShell` yoktur**: `PageHeader` + `Card` + `DataTable` (`PaymentsPage.tsx:62-90`,
`SupplierPaymentsPage.tsx:57-80`).

**Tahsilatlar listesi.** Süzgeçler müşteri ve tarih aralığıdır (`PaymentsPage.tsx:70-75`); toplam
şeridi sayı, toplam ve iadeleri verir (`76-80`). Sütunlar Tarih, Müşteri, Fatura (bağlanmadıysa
"Genel"), Yöntem, Açıklama, Tutar; Düzenle/Sil düğmeleri **yalnız `can('accounting')`** ise eklenir,
satır tıklaması da aynı koşula bağlıdır (`43-58`, `82`). Sayfa `?new=1` ile formu açar (`28`;
`client/src/lib/hooks.ts:90-101`).

**Ödemeler listesi.** Aynı yapı; süzgeç "Tedarikçi" düz `Select`'tir (`SupplierPaymentsPage.tsx:66`),
toplam etiketleri "Ödeme / Toplam / Gelen iadeler (düşüldü)" (`71-75`), sütunlar Tarih, Tedarikçi,
Sevkiyat, Yöntem, Açıklama, Tutar (`38-45`). `?new=1` desteği `25`'tedir. **Onay kutulu satır seçimi
kullanmaz** (`selectable` yok); tahsilatlar listesi kullanır ve seçilenleri Excel'e aktarır
(`PaymentsPage.tsx:85-88`).

**Tahsilat formu.** Pencere `Modal`, başlık "Tahsilat Ekle"/"Tahsilat Düzenle" (`70`). Alanlar:
"Hangi müşteriden?" zorunlu, aranabilir + "Yeni müşteri olarak ekle" (`73-77`); açık fatura uyarısı
ve "Tamamını gir" (`78-83`); "Tutar (TL)" + "Müşteriye iade" onay kutusu (`84-87`); "Tarih" Bugün/
Dün/Yarın çipleriyle (`88`); "Nasıl ödedi?" 5 seçenekli kart grubu (`89-92`); çek/senet seçilirse
Çek/Senet no, Banka ve **Vade tarihi** +30/+60/+90/+120 gün kısayollarıyla (`93-98`); aksi hâlde
"Para hangi hesaba girdi?" (`99-103`); kapalı "Fatura seçimi ve açıklama" bölümü (`104-121`).
Varsayılanlar Havale/EFT ve bugündür (`40-43`). Fatura listesi o müşterinin **kesilmiş ve
kalanı > 0** kayıtlarıdır, 200'e kadar (`50-55`).

**Ödeme formu.** Başlık "Ödeme Yap"/"Ödeme Düzenle" (`64`). Alanlar: "Kime ödüyorsunuz?" (`67-71`),
borç uyarısı ve "Tamamını gir" (`72-77`), tutar + "Tedarikçiden iade" (`78-80`), tarih (`81`),
yöntem (`82-84`), "Para hangi hesaptan çıktı?" (`85-89`), kapalı "Sevkiyat seçimi ve açıklama"
bölümü (`90-100`). Sevkiyat listesi o tedarikçinin iptal ve planlı olmayan kayıtlarıdır, 100 kayıt
(`48-52`, `95-96`). **Vade alanı yoktur**; çek/senet seçilse bile kayıt portföye girmez. Bu eksik
§10'da kapatılır; ciro kaynaklı ödemede uyarı basılır (`101`).

**Kasa/banka etkisi** (`CashService.cs`). Bakiye saklanmaz. Tahsilatlar **yalnız durum boş ya da
`Collected`** iken nakit akışına girer (`21-25`); tedarikçi ödemeleri **ciro kaynaklı olanlar
hariç** çıkış yazar (`26-30`). Portföydeki çek/senet bakiyeyi değiştirmez; bakiye = devir +
girişler − çıkışlar (`64-70`).

**Cari etkisi.** Müşteri bakiyesi = devir + kesilmiş faturalar − tahsilatlar; **karşılıksız ve
iade** çek/senet sayılmaz (`CustomerAccountService.cs:14-15`, özet `31`). Tedarikçide ödemeler
borçtan düşülür (`CariService.cs:62`).

**Sunucu uçları.** `PaymentsController.cs`: liste, `totals`, `export`; yazma uçları `Accounting`
ilkesiyle korunur (`135-165`). Fatura o müşterinin ve **Issued** olmalıdır (`170-176`); iade
faturaya bağlanamaz, çek/senetle yapılamaz (`181-182`) ve eksi tutarla saklanır (`183`); çek/senet
`Portfolio` durumuyla başlar (`194`). `SupplierPaymentsController.cs` aynı desendir; sevkiyat
o tedarikçinin aracıyla yapılmış olmalıdır (`157-162`), iade sefere bağlanamaz (`168`), ciro
kaynaklı ödeme değiştirilemez (`95`, `106`).

**Çek portföyü.** `client/src/pages/ChecksPage.tsx` varsayılan olarak "Portföyde" gösterir (`38`),
`instruments: true` süzgeciyle çalışır (`44`), durum geçişlerini eşlemeyle sunar (`15-32`).

**"Formu açık tut" bugün nerede?** Yalnız sevkiyat formunda: durum `yes.tripKeepOpen` ile saklanır
(`TripForm.tsx:154-155`), onay kutusu **yalnız yeni kayıtta** görünür (`301-306`), kayıttan sonra
müşteri ve tarihler kalır, gerisi temizlenir (`167-177`). Ödeme formlarında bu seçenek **yoktur**
ve §10'da eklenecektir.

## 3. Hedef yerleşim

Amaç: çoğu kayıt 4 alanla (taraf, tutar, tarih, yöntem) girilsin, kalanı kapalı kalsın.

```
┌─ Tahsilat Ekle ────────────────────────────────── [X] ┐  672px
│ Hangi müşteriden? *  [ ABC Nakliyat | ara ......... ] │
│ ┌ Açık faturalar: 17.000,00 TL (3)  [Tamamını gir] ─┐ │  ≤40px
│ Tutar (TL) *        │ Tarih *                        │
│ [ 5.000,00 ]        │ [ 05.10.2026 ] Bugün Dün Yarın │
│ ☐ Müşteriye iade (para müşteriye gönderildi)         │
│ Nasıl ödedi? * [Nakit][Havale/EFT][Çek][Kart][Senet] │
│ Para hangi hesaba girdi?  [ — Seçilmedi — ▾ ]        │
│ ▸ Fatura seçimi ve açıklama (isteğe bağlı)           │
│ ☐ Kaydettikten sonra formu açık tut  [Vazgeç][Kaydet]│  yalnız yeni
└──────────────────────────────────────────────────────┘
```

Çek/senet seçilince hesap alanı kaybolur; yerine "Çek no / Senet no", "Banka" (yalnız Çek) ve vade
tarihi gelir. Ödeme formu aynı iskelettir; farkları: "Kime ödüyorsunuz?", "Borcunuz …", "Para hangi
hesaptan çıktı?", "Sevkiyat seçimi ve açıklama".

Listelerde üst kısım sadeleşir: başlık + bölüm sekmeleri → tek süzgeç satırı → toplam şeridi →
tablo; başlıktan tablo başlığına yükseklik **≤260px** (`01-ORTAK-SARTNAME.md:237`). Bugün süzgeç
ızgarası `Card` gövdesinin içindedir (`PaymentsPage.tsx:70-75`); yeni görünümde `FilterBar` /
`FilterPanel` (`28-ORTAK-PARCALAR.md`) kullanılır. Excel düğmeleri bugün başlıkta yan yanadır
(`63-67`); "⋯ Diğer" menüsüne taşınır.

## 4. Alanlar, düğmeler ve etkileşim

| Alan / düğme | Tip | Zorunlu | Davranış | Hata metni |
|---|---|---|---|---|
| Müşteri / Tedarikçi | Aranabilir seçim | Evet | Seçilince fatura ya da borç listesi yüklenir; alt seçim sıfırlanır (`PaymentForm.tsx:74`) | "Müşteri seçin." / "Tedarikçi seçin." |
| Tutar (TL) | Tutarlı kutu | Evet | Sıfırdan büyük; yazıyla okunuş gösterilir (`Inputs.tsx:26, 48`) | "Tutar girin." / "Tutar sıfırdan büyük olmalı." |
| Tarih | Tarih + kısayol | Evet | Bugün/Dün/Yarın | "Tarih zorunlu." |
| Yöntem | 5 kartlı grup | Evet | Çek/senet seçilince alt alanlar değişir | — |
| Çek/Senet no, Banka | Metin | Hayır | Yalnız çek/senet; yöntem değişirse sunucu temizler (`PaymentsController.cs:191`) | — |
| Vade tarihi | Tarih + 4 kısayol | Evet (çek/senet) | Kayıt "Portföyde" başlar | "Çek/senet için vade tarihini girin." |
| Hesap | Seçim | Hayır | Tahsilatta `accounting` yetkisi ve hesap varsa; ödemede hesap varsa | — |
| İade | Onay kutusu | Hayır | Bağı kaldırır, tutar eksi yazılır | "İade faturaya bağlanamaz ve çek/senetle yapılamaz." |
| Fatura / Sevkiyat | Aranabilir seçim | Hayır | Boşsa en eski açık kalemlere dağıtılır | "Seçilen fatura bu müşteriye ait değil." |
| Açıklama | Metin | Hayır | — | — |
| Formu açık tut | Onay kutusu | Hayır | **Yalnız yeni kayıtta** | — |
| Kaydet | Düğme | — | Ctrl+Enter ile de çalışır (`ui.tsx:193-196`) | — |
| Vazgeç / X / Esc | Düğme, tuş | — | Değişiklik varsa "Kaydedilmemiş değişiklikler var. Kapatılsın mı?" (`ui.tsx:222-227`) | — |

Klavye: **Ctrl+Enter kaydet**, **Esc kapat**; pencere açılınca ilk uygun alana odaklanır
(`ui.tsx:173-182`). Yöntem grubu `role="radiogroup"` / `role="radio"` ile gezilir
(`Choice.tsx:47, 51`).

## 5. Durumlar: boş · yükleniyor · hata · yetkisiz · ayna · lisans

- **Boş liste:** "Henüz tahsilat yok. Ödeme gelince “Tahsilat Ekle” ile kaydedin."
  (`PaymentsPage.tsx:89`), süzgeçliyse "Aramanıza uyan kayıt yok."; karşılığı
  `SupplierPaymentsPage.tsx:79`.
- **Yükleniyor:** tablo soluklaşır (`DataTable.tsx:126`); hedef 5 satırlık gri iskelet
  (`29-GORSEL-SISTEM.md`). **Hata:** `ErrorState` + "Tekrar dene"; sunucu uyanıyorsa "Sunucu birkaç
  saniye içinde açılıyor olabilir." (`ui.tsx:252-261`).
- **Yetkisiz:** liste herkese açıktır (rotada koruma yok, `App.tsx:102-103`); yazma düğmeleri
  `can('accounting')` ile gizlenir (`PaymentsPage.tsx:51-58`, `SupplierPaymentsPage.tsx:46-53`).
  Ödemeler listesinde satır tıklaması da aynı koşula bağlıdır (`SupplierPaymentsPage.tsx:77`,
  `PaymentsPage.tsx:82` ile aynı); bu eksik sonradan kapatıldı, §10 adım 2 kapalıdır.
- **Ayna:** `write` işaretli düğmeler gizlenir (`ui.tsx:29-32`). İki formun Kaydet düğmesi bugün
  `write` almaz (`PaymentForm.tsx:71`), yani ayna açıkken kaydedilebilir görünür; eksik budur.
- **Lisans:** süre dolunca salt okunur; yazma düğmeleri ayna kuralıyla aynı desenle kapanır
  (`docs/LISANS.md`, `01-ORTAK-SARTNAME.md:160-162`).

## 6. Metinler ve terimler

Başlıklar: "Tahsilat Ekle", "Tahsilat Düzenle", "Ödeme Yap", "Ödeme Düzenle". Etiketler: "Hangi
müşteriden?", "Kime ödüyorsunuz?", "Tutar (TL)", "Tarih", "Nasıl ödedi?", "Nasıl ödediniz?",
"Para hangi hesaba girdi?", "Para hangi hesaptan çıktı?", "Çek no", "Senet no", "Banka", "Vade
tarihi", "Fatura", "Sevkiyat", "Açıklama", "Kaydettikten sonra formu açık tut". Yöntem etiketleri
`labels.ts:32-38`'den gelir: Nakit, Havale/EFT, Çek, Kredi Kartı, Senet; çek durumları
`labels.ts:172-179`: Portföyde, Tahsilde, Tahsil edildi, Ciro edildi, Karşılıksız, İade. Bölüm
sekmeleri `/tahsilatlar` → "Tahsilatlar", `/odemeler` → "Tedarikçi Ödemeleri" (`sections.ts:19, 23`).

İpuçları sade kalır: "Boş bırakılırsa tahsilat en eski açık faturalara sırayla dağıtılır."
(`PaymentForm.tsx:107`); "Portföye girer; Çek/Senet sayfasından tahsil, ciro ya da karşılıksız
işaretlenir." (`96`). Ekranda teknik sözcük yoktur (`01-ORTAK-SARTNAME.md:75-77`), tutarlar `tl2`
ile iki kuruş, tarihler `03.10.2026`. Sütun ve sekme adları terim onayına bağlıdır (`AGENTS.md` §6).

## 7. Telefon davranışı (390×844)

Pencere alttan açılan tam genişlik olur (`ui.tsx:212-214`), alanlar tek sütuna iner
(`PaymentForm.tsx:72`), yöntem kartları iki sütun (`Choice.tsx:47`), vade kısayolları alt satıra
kayar. Listeler bugün yatay kaydırılır; `DataTable` kart desteğine sahiptir (`DataTable.tsx:78-100`,
`mobileCard`) ama bu iki sayfa kullanmaz — §10 adım 6'da eklenir. Ölçüt: `scrollWidth ≤ 390`;
`/tahsilatlar` bugün `client/e2e/mobile.spec.ts:4, 12-14` ile ölçülür. Dokunma hedefleri ≥44px,
süzgeç paneli tam ekran (`28-ORTAK-PARCALAR.md`).

## 8. Erişilebilirlik ve klavye

Pencere `role="dialog"`, `aria-modal` ve `aria-label` taşır (`ui.tsx:213`); Esc ve Ctrl+Enter üst
üste pencerelerde yalnız en üsttekini kapatır (`187-197`). Zorunlu alanlar `*` ve `title="Zorunlu
alan"` ile işaretlenir (`143`), hata metni alanın altına kırmızı yazılır (`145`). Liste başlıkları
`th`, sıralama düğmeleri başlık içinde `button`, satır onay kutuları `aria-label` taşır
(`DataTable.tsx:19, 110-113`). Renk körlüğü için tutar rengine **ek olarak** işaret/metin gerekir:
bugün tahsilat tutarı yeşil (`PaymentsPage.tsx:49`), ödeme tutarı kırmızıdır
(`SupplierPaymentsPage.tsx:44`) ve iadeler yalnız eksi işaretiyle ayrılır (`client/src/lib/format.ts:4`);
durum rozeti metni bu iki listede **yoktur**, Çek/Senet listesinde vardır (`ChecksPage.tsx:57`).

## 9. Testler (e2e + birim)

Bugünkü kapsam: `client/e2e/workflow.spec.ts` tahsilat akışını (`86-90`) ve ödeme akışını
(`296-297`) çalıştırır, çek kaydının portföye düşmesini doğrular (`415-428`);
`new-ui/cari-invoice.spec.ts:4-13` cari satırından açılan formun müşteri seçili geldiğini;
`office-app.spec.ts:50` mobil yönetici modundaki düğmeyi. Eklenecek senaryolar:

1. **Açık tut yalnız bu iki formda:** tahsilatta işaretlenir, kaydedilir, pencere kapanmaz, müşteri
   ve tarih kalır, tutar boşalır; aynı senaryo ödeme formunda.
2. **Sevkiyat formunda gerileme yok:** `yes.tripKeepOpen` davranışı aynı kalır.
3. **Çek seçilince vade zorunlu:** vade boşken Kaydet hata verir; vade girilince kayıt `/cek-senet`
   listesinin varsayılan "Portföyde" görünümünde çıkar.
4. **Ödeme formunda çek/senet:** §10 adım 3-4 sonrası vade görünür ve portföye kayıt düşer.
5. **Kasa bakiyesi:** nakit tahsilat hesabı artırır; portföydeki çek/senet artırmaz, "Tahsil edildi"
   işaretlenince artırır (sunucu testi).
6. **Yetki:** `accounting` olmayan kullanıcı düzenleme penceresi açamaz (ödemeler listesi dahil).

Sunucu testleri: fatura/müşteri eşleşmesi, iade kuralı, portföy durumu, sevkiyat-tedarikçi
eşleşmesi. **Test silme/atlama yasak** (`01-ORTAK-SARTNAME.md:178`).
## 10. Uygulama adımları (dosya:satır, sırayla)

1. **`PaymentForm.tsx:60-62, 70-71`.** "Kaydettikten sonra formu açık tut" durumunu
   `yes.paymentKeepOpen` anahtarıyla ekle (`TripForm.tsx:154-155` deseni); yalnız yeni kayıtta
   görünsün, `onSuccess` içindeki `reset` taraf/tarih/yöntem koruyup tutarı ve bağı temizlesin.
   *2 saat.* Doğrulama: `cd client && npm run build`.
2. **`SupplierPaymentsPage.tsx:77` — kapalı (kod zaten uygun).** Satır tıklaması bugün
   `can('accounting')` koşuluna bağlı (`PaymentsPage.tsx:82` ile aynı); ek iş yok, doğrulaması
   §9 senaryo 6'dır. *—*
3. **`SupplierPaymentForm.tsx:20-28, 85-89`.** Vade ve çek/senet alanlarını ekle: `instrumentNo`,
   `bank`, `instrumentDueDate` şemaya girsin, çek/senet seçilince vade bölümü çizilsin
   (`PaymentForm.tsx:93-98` düzeni ve `32`'deki kural). *4 saat.* Doğrulama: `cd server && dotnet test`.
4. **`server/.../SupplierPaymentsController.cs:154-175`.** `ApplyAsync` içinde çek/senet kaydını
   portföye düşür (`PaymentsController.cs:191-194` deseni); sözleşmeyi `30-VERI-API.md` ile uyumlu
   genişlet. *1 gün.* Doğrulama: `cd server && dotnet test`.
5. **`PaymentForm.tsx:71`, `SupplierPaymentForm.tsx:65`.** Kaydet düğmesine `write` ekle; Vazgeç
   görünür kalsın. *1 saat.* Doğrulama: `cd client && npm run lint && npm run build`.
6. **`PaymentsPage.tsx:81`, `SupplierPaymentsPage.tsx:76`.** `DataTable`'a `mobileCard` geçir; kart
   iki satır olsun (taraf + yöntem, tutar sağda). *4 saat.* Doğrulama:
   `npx playwright test e2e/mobile.spec.ts`.
7. **`PaymentsPage.tsx:63-69`, `SupplierPaymentsPage.tsx:58-64`.** Excel düğmelerini "⋯ Diğer"
   menüsüne taşı, süzgeçleri `FilterBar`/`FilterPanel` ile tek satıra al. *4-6 saat.* Doğrulama:
   `npx playwright test e2e/new-ui`.
8. **`client/src/lib/sections.ts:41-50`.** İki yol için net başlık ekle; `newTitles` bugün bu iki
   yolu içermez. *30 dakika.* Doğrulama: `npx playwright test e2e/new-ui/basics.spec.ts`.
9. **Testler.** §9'daki 6 senaryo ve 2 sunucu testi. *1 gün.* Doğrulama: `npx playwright test` ve
   `cd server && dotnet test`.
10. **Belge güncellemesi.** `docs/GELISTIRME-PLANI.md`, `docs/YOL-HARITASI.md`,
    `docs/KOLAYLASTIRMA-PLANI.md:387-388`. *1 saat.* Doğrulama: `git diff --stat`.

Toplam: **4-5 iş günü**. Her adım sonunda `01-ORTAK-SARTNAME.md:29-31`: testler → commit →
`git pull --rebase origin main` → `git push origin HEAD:main`.

## 11. Kabul ölçütü

1. Tahsilat ve ödeme **2 tık + form** ile açılır (`KOLAYLASTIRMA-PLANI.md:259-260`); ilk ekranda
   en fazla **6 etkileşimli alan** vardır, kalanı kapalı bölümdedir.
2. "Formu açık tut" **yalnız bu iki formda** ve yalnız yeni kayıtta görünür; sevkiyat formundaki
   davranış değişmez (§9 senaryo 1-2 yeşil).
3. Çek/senet seçilince vade zorunludur ve kayıt `/cek-senet` "Portföyde" görünümünde çıkar
   (senaryo 3-4); nakit/havale tahsilatı seçilen hesabın bakiyesini artırır, portföydeki çek/senet
   artırmaz (sunucu testi yeşil).
4. 1440×900'de başlıktan tablo başlığına yükseklik **≤260px**; 390×844'te yatay kaydırma yok ve
   iki liste kart görünümünde.
5. Formda en fazla **1 bilgi bandı** görünür; ekranda teknik sözcük yok, tutarlar iki kuruş.
6. Yeni e2e testi **≥6**, yeni sunucu testi **≥2**; toplam e2e sayısı 53'ün altına düşmez.

## 12. Riskler ve geri dönüş

| Risk | Önlem | Geri dönüş |
|---|---|---|
| "Açık tut" başka formlara yayılır | Durum iki formun içinde kalır, ortak yardımcıya çıkarılmaz | Onay kutusunu kaldır |
| Açık tutarken yanlış tarafa ikinci kayıt | `reset` yalnız taraf/tarih/yöntem korur; tutar ve bağ temizlenir | `reset` yerine `onClose` |
| Sunucuda yeni alan migration gerektirir | `Payment` tablosunda alanlar zaten var (`PaymentsController.cs:191-194`); yeni sütun açılmaz | Yalnız form tarafını bırak |
| Ciro kaynaklı ödemede alanlar kilitli kalır | `SupplierPaymentsController.cs:95` kuralı ve uyarı (`SupplierPaymentForm.tsx:101`) korunur | Vade bölümünü o kayıtta gizle |
| Yetki koşulu e2e'yi kırar | Testler `accounting` yetkili kullanıcıyla giriş yapar | Koşulu geri al |
| Ayna açıkken kaydetmeye basılır | Kaydet `write` alır; sunucu `MirrorWriteGuard` reddeder | İşareti kaldır |
| Excel düğmeleri menüde kaybolur | `ExportButton` aynada da görünür (`Exports.tsx:10-12`) | Düğmeleri başlığa al |

## 13. Doğrulanacaklar

- **Ödeme formunda çek/senet kullanılıyor mu?** Bugün vade alanı yoktur
  (`SupplierPaymentForm.tsx:20-28`). Kullanılıyorsa §10 adım 3-4 uygulanır; kullanılmıyorsa yöntem
  listesinden çıkarılmalı.
- **"Tamamını gir" düğmesi** iade işaretliyken de açık kalıyor (`PaymentForm.tsx:81`); iade
  senaryosunda gizlenmeli mi?
- **Tahsilat birden çok faturaya bölünüyor mu,** yoksa tek faturaya mı bağlanacak? Sunucu bugün
  bağlanmayan tutarı en eski açık kalemlere dağıtır (`PaymentForm.tsx:107`); pratikortam'daki
  "ekstreden işaretleyerek tahsilat" akışı (`KOLAYLASTIRMA-PLANI.md:177`) ayrıca doğrulanmalı.
- **Hesap alanı zorunlu olmalı mı?** Bugün isteğe bağlıdır (`PaymentForm.tsx:100`); hesap
  seçilmeyen tahsilat kasa bakiyesine hiç yansımaz (`CashService.cs:21-25`).
- **İade onay kutusunun yeri:** tutar alanının altındadır (`PaymentForm.tsx:86`) ve "indirim" gibi
  okunabilir; ayrı bölüme taşınsın mı?
- **`SupplierPaymentsPage.tsx:41`** sütun etiketi "Sevkiyat" mı "Sefer" mi olacak? `docs/TERIMLER.md`
  onayı bekleniyor (`AGENTS.md` §6); sunucu etiketi adres metni kurduğu için
  (`SupplierPaymentsController.cs:30`) terim değişikliği orayı da etkiler.
- **`TotalsStrip` yerine `SumStrip`** önerisi (`AGENTS.md` §8) hangi bileşenin kazandığı
  netleşmeli; `28-ORTAK-PARCALAR.md:20` `SumStrip`'i kapsam dışı bırakır, oysa `SumStrip.tsx`
  kodda vardır.
- **`docs/plan/29-GORSEL-SISTEM.md`, `30-VERI-API.md`, `32-TERMINOLOJI.md` ve
  `24-RAPORLAR-MUHASEBE.md`** henüz yazılmadı (`00-DIZIN.md:64, 69-72`); belge onlara ileriye dönük
  atıf yapar. `09`, `11`, `12`, `28` ve `00-DIZIN.md` artık yazıldı. `PageShell`, `DetailDrawer` ve
  `pages/TodayPage.tsx` kodda yoktur (`01-ORTAK-SARTNAME.md:143-146`).

---

Sonraki belgeyle bağlantı: `11-BANKALAR.md` bu iki formun hesap alanını ve bakiye hesabını
(`CashService.cs:21-30`) devralır; `12-CEKLER.md` vade alanıyla portföye giren kaydın durum akışını
(`ChecksPage.tsx:15-32`), `09-TEDARIKCILER-CARI.md` ise ödeme formunun açıldığı cari satırı ve
toplu ödeme uçlarını (`SupplierPaymentsController.cs:112-152`) kesinleştirir.
