# Pilot Paketi

*Amaç: 3–5 nakliye firmasıyla 4–6 haftalık pilot yapıp panelin gerçek kullanımda işe yaradığını, fiyatın ve paketlerin doğru olduğunu görmek (bkz. [SATIS-PLANI.md](SATIS-PLANI.md), S6). Her pilot firmaya ayrı kurulum açılır; teknik adımlar [MUSTERI-KURULUM.md](MUSTERI-KURULUM.md) içindedir.*

> Bu belgede gerçek firma, kişi ya da tutar yoktur. Pilot firmalara ait bilgileri (iletişim, geri bildirim kayıtları) **bu depoya yazmayın**; kendi gizli not defterinizde/tablonuzda tutun. Aşağıdaki tablolar boş şablondur.

---

## 1. Pilot firmayı seçerken

- 3–15 araçlı, sevkiyatlarını bugün Excel/defter ya da basit bir programla yöneten firma.
- Sahibi ya da karar vereni her hafta 30 dakika görüşmeye ayırabilen.
- Verisini (müşteri, araç, şoför listesi) Excel'e çıkarabilen.
- Dürüst geri bildirim verecek; "güzel olmuş" demekle yetinmeyecek.
- Kimsenin zorlamadığı, gönüllü bir firma. Ücretsiz ya da yarı fiyat; süre ve kapsam yazılı olsun.

## 2. Başarı ölçütleri

Pilot sonunda her firma için ölçülür:

| Ölçüt | Hedef | Nasıl ölçülür |
|---|---|---|
| **Kullanım sıklığı** | **Haftada 4+ gün** panele giriş/işlem | Hafta içi, işlem yapılan gün sayısı (sevkiyat/fatura/tahsilat kaydı oluşturulan günler) |
| **Sevkiyatların panelde olması** | **Sevkiyatların %80'i panelde** | Firmanın o hafta yaptığı sevkiyat sayısına (firmanın kendi sayımı) karşı panelde kayıtlı sayı |
| Fatura/tahsilat paneldeki oranı | Pilotun 3. haftasından sonra %50+ | Haftalık görüşmede birlikte bakılır |
| Şoför uygulaması | Şoförlerin en az yarısı kullanıyor | Panelde şoför uygulamasından gelen güncelleme/belge sayısı |
| Memnuniyet | 10 üzerinden 7+ | Son görüşmede tek soru: "Bizi bir meslektaşınıza önerir misiniz?" (1–10) |
| Ödeme niyeti | "Evet" ya da somut fiyat itirazı | Son görüşme |

Hedefi tutturan pilot "başarılı" sayılır. İlk iki ölçüt (4+ gün, %80) zorunludur; diğerleri yol göstericidir.

---

## 3. Kontrol listesi

### 3.1 Pilot başlamadan önce

- [ ] Pilot sözleşmesi/mutabakatı imzalandı (süre, ücret, veri sahipliği, KVKK; taslaklar hukuk çalışmasından gelir, avukata baktırın).
- [ ] Müşteri kodu, alan adı ve yönetici e-postası belli; DNS A kaydı girildi.
- [ ] Sunucuda yer var (`./deploy/customer-check.sh` temiz; disk ve RAM yeterli).
- [ ] Kurulum yapıldı: `./deploy/customer-new.sh <kod> <alan-adı> --plan <paket> --admin-email <e-posta>` ve `customer-check.sh <kod>` satırı `TAMAM`.
- [ ] Lisans anahtarı verildi (varsa) ya da pilot için lisanssız çalışılacağı yazıldı ([LISANS.md](LISANS.md)).
- [ ] İlk yönetici şifresi güvenli yoldan iletildi; ilk girişte değiştirildi.
- [ ] Firma bilgileri girildi (VKN, adres, IBAN, logo); fatura numarası devri ayarlandı.
- [ ] Müşteri, araç ve şoför listeleri Excel'den aktarıldı; sayılar firmayla birlikte kontrol edildi.
- [ ] Çalışan ve şoför hesapları açıldı (kişiye özel).
- [ ] Şoför uygulaması telefonlara kuruldu ([MOBIL-KURULUM.md](MOBIL-KURULUM.md)); en az bir şoförle deneme sefer yapıldı.
- [ ] 1–2 saatlik eğitim yapıldı ([KULLANIM.md](KULLANIM.md), `docs/egitim`); "hangi işler panelde yapılacak" listesi birlikte yazıldı.
- [ ] Başlangıç ölçümü alındı: firma haftada kaç sevkiyat yapıyor, bugün nasıl takip ediyor?
- [ ] Destek kanalı ve cevap süresi söylendi (ör. telefon/WhatsApp, iş günü aynı gün).
- [ ] Yedek çalıştığı doğrulandı (`customers/<kod>/backups/` içinde dosya, sunucu dışı kopya açık).

### 3.2 Pilot sırasında (her hafta)

- [ ] Haftalık görüşme yapıldı (şablon bölüm 4).
- [ ] Kullanım ölçüldü (4+ gün? sevkiyatların yüzde kaçı panelde?).
- [ ] Her geri bildirim bölüm 5'teki tabloya yazıldı; sahibi ve öncelik atandı.
- [ ] Acil hata (veri kaybı, giriş yapılamıyor, yanlış hesap) aynı gün çözüldü ya da geçici çözüm verildi.
- [ ] Haftalık `customer-check.sh`: yedek, disk, sertifika sorunsuz.
- [ ] Yeni sürümler önce pilotta denendi; güncelleme sonrası firmaya haber verildi.
- [ ] 2. haftada: kullanım hedefin altındaysa nedeni birlikte bulundu (eğitim mi, eksik özellik mi, alışkanlık mı?).
- [ ] 4. haftada ara değerlendirme: fatura/tahsilat, şoför uygulaması kullanımı.

### 3.3 Pilot bittikten sonra

- [ ] Son görüşme yapıldı; ölçütler tabloya işlendi; memnuniyet puanı ve ödeme niyeti soruldu.
- [ ] Karar: **devam (ücretli)**, **uzat (2 hafta)** ya da **bırak**.
- [ ] Devam ediyorsa: paket ve fiyat netleşti, sözleşme imzalandı, lisans anahtarı verildi/yenilendi.
- [ ] Bırakıyorsa: veri teslimi (Excel/dump) yapıldı; kaldırma: `./deploy/customer-remove.sh <kod>`; DNS kaydı silindi.
- [ ] Geri bildirim listesinin tamamı gözden geçirilip yol haritasına işlendi ([YOL-HARITASI.md](YOL-HARITASI.md)).
- [ ] Fiyat ve paket varsayımları (SATIS-PLANI bölüm 4) pilot verisiyle güncellendi.
- [ ] Referans izni alındı mı? (Firma adını tanıtımda kullanma izni yazılı olmalı.)
- [ ] Sunucu kapasitesi gerçek kullanıma göre güncellendi (`docker stats` ile ölçülen RAM/disk; MUSTERI-KURULUM maliyet tablosu).

---

## 4. Haftalık görüşme şablonu (30 dakika)

**Firma:** ______  **Hafta:** __ / __  **Katılanlar:** ______  **Tarih:** ______

| Bölüm | Süre | Not |
|---|---|---|
| 1. Sayılar (birlikte bakılır) | 5 dk | |
| 2. Geçen haftanın sorunları çözüldü mü? | 5 dk | |
| 3. Bu hafta neyi yaparken zorlandınız? | 10 dk | |
| 4. Eksik olan / "keşke olsaydı" | 5 dk | |
| 5. Önümüzdeki hafta için karar ve görev | 5 dk | |

**1. Sayılar**

| | Bu hafta | Hedef |
|---|---|---|
| Panele girilen gün sayısı | __ / 5 | 4+ |
| Firmanın yaptığı sevkiyat sayısı | __ | |
| Panelde kayıtlı sevkiyat sayısı | __ | |
| Panelde olan oran (%) | __ | %80+ |
| Kesilen fatura / yapılan tahsilat (panelde) | __ / __ | |
| Şoför uygulamasını kullanan şoför | __ / __ | |

**Sorular:** Panele girmediğiniz sevkiyatlar hangileri, neden? · Hâlâ Excel/defter tuttuğunuz bir şey var mı? · Hangi ekranı en çok kullandınız? · Sizi en çok yavaşlatan ya da şaşırtan şey neydi? · Bir şeyi değiştirebilseydiniz ne olurdu?

**Kararlar ve görevler**

| Görev | Kim | Ne zamana |
|---|---|---|
| | | |

**Not:** Kullanıcının kendi sözleriyle yazın; çözümü değil sorunu kaydedin.

---

## 5. Geri bildirim kaydı

Her satır tek bir geri bildirimdir. Bu tabloyu pilot firmaya ait bilgilerle **bu depoda doldurmayın**; kendi tablonuzda (Excel/Sheets) bu sütunlarla tutun.

| # | Tarih | Firma (kod) | Kim söyledi | Tür | Özet (kullanıcının sözleriyle) | Önem | Sıklık | Durum | Karar / sürüm |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | hata / eksik özellik / kafa karışıklığı / istek | | engelliyor / zorluyor / can sıkıcı | tek sefer / haftalık / günlük | yeni / planlandı / yapıldı / reddedildi | |
| 2 | | | | | | | | | |

**Önceliklendirme kuralı:** (1) veri kaybı/yanlış para hesabı hemen; (2) birden fazla pilotun söylediği ve günlük karşılaşılan sorunlar; (3) tek firmanın isteği, sıklığı düşükse bekletilir. "Engelliyor + günlük" olanlar bir sonraki sürüme girer.

---

## 6. Pilot sonu özet tablosu (firma başına)

| Firma (kod) | Başlangıç | Bitiş | Haftada ort. gün | Sevkiyat %'si | Memnuniyet (1–10) | Karar | Fiyat itirazı / not |
|---|---|---|---|---|---|---|---|
| | | | | | | devam / uzat / bırak | |
