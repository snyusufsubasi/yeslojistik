# YES Lojistik – Nakliye Takip Sistemi · Proje Planı

> **Durum:** v1'in tüm fazları (1–6) ve v2'nin şoför uygulaması, GPS takip, müşteri takip linki maddeleri uygulandı;
> ek olarak Excel'den toplu aktarım, müşteri devir bakiyesi ve şoföre anlık bildirim (Expo Push) eklendi. Kalan: GİB e-Fatura (entegratör seçimi bekliyor),
> SMS bildirimleri (sağlayıcı seçimi bekliyor; şimdilik WhatsApp paylaşım linki var). Kurulum için [KURULUM.md](KURULUM.md), kullanım için [KULLANIM.md](KULLANIM.md).
> Plandan sapmalar: tablo için TanStack Table yerine hafif özel `DataTable` bileşeni; Serilog yalnızca konsola yazar (Docker logları).

## Context
Kuzenin nakliye firması (YES Lojistik) için seferleri, araçları, şoförleri, müşteri carilerini, faturaları, tahsilatları ve giderleri tek yerden yönettiği bir web paneli istiyor. Elimizde sadece bir tasarım görseli var; repo boş (`README.md` dışında hiçbir şey yok). Bu yüzden sıfırdan, **aşamalı** kuracağız.

Kararlar:
- **Stack:** React (Vite + TypeScript) + Tailwind · .NET 10 Web API (C#) · PostgreSQL · EF Core · Docker
- **v1 kapsamı:** Sadece web panel (masaüstü + mobil uyumlu). Şoför mobil uygulaması, GPS ve GİB e-Fatura **v2**.
- **Fatura:** v1'de sistem içi fatura kaydı + PDF çıktısı. Resmi e-Fatura mevcut muhasebe programından kesilmeye devam eder; mimari sonradan entegratör eklenebilecek şekilde kurulur.

---

## 0. Başlamadan önce kuzenle netleştir (ücretlendirme öncesi!)
- [ ] Kaç kullanıcı? Roller: Yönetici / Operasyon / Muhasebe yeterli mi?
- [ ] Şu an nasıl takip ediyorlar (Excel mi)? → İlk veri aktarımı gerekir mi?
- [ ] Sefer başına birden fazla yük/durak oluyor mu? (Görselde tek yükleme–tek teslimat var; v1'de öyle varsayıyoruz)
- [ ] KDV / tevkifat oranları (taşımacılıkta 2/10 tevkifat yaygın) — fatura hesabı buna göre.
- [ ] Hosting kimde, alan adı var mı? (Öneri: Hetzner/DigitalOcean VPS ~5-10 €/ay + domain)
- [ ] Anlaşma: kapsam listesi (bu dokümanın v1 bölümü) yazılı olsun, v2 ayrı fiyatlansın. Bakım/destek ücreti ayrıca konuşulsun.

---

## 1. Modüller (görselden çıkarılan)
| Modül | v1 içeriği |
|---|---|
| **Ana Sayfa (Dashboard)** | KPI kartları: Toplam Sefer (bu ay), Teslim Edilen, Bekleyen, Tahsilat Bekleyen (adet + tutar). Günlük seferler tablosu, araç özet sayıları, hızlı butonlar (Yeni Sefer/Fatura/Müşteri) |
| **Seferler** | Liste + filtre (tarih, durum, müşteri, araç), oluştur/düzenle formu: müşteri, araç, şoför, yükleme/teslimat adresi, tarihler, açıklama, **araç maliyeti** + **müşteri satış fiyatı** (→ kâr) |
| **Araçlar** | Plaka, tip, model yılı, km, son bakım, durum (Müsait/Yolda/Bakımda); bakım tarihi yaklaşınca uyarı |
| **Şoförler** | Ad, telefon, ehliyet sınıfı, SRC/psikoteknik bitiş tarihleri, aktif/pasif |
| **Müşteriler / Cari** | Cari kartı (VKN/TCKN, vergi dairesi, iletişim, adres), sekmeler: Bilgiler / Seferler / Faturalar / Tahsilatlar / Hareketler; Toplam Borç – Alacak – Bakiye |
| **Faturalar** | Seferlerden fatura oluştur (bir veya birden çok sefer), F-000245 formatında numara, KDV/tevkifat, PDF indir, durum (Taslak/Kesildi/İptal) |
| **Tahsilatlar** | Cariye ödeme gir (nakit/havale/çek), faturayla eşleştir, bakiye otomatik güncellenir |
| **Giderler** | Yakıt, bakım, otoyol, şoför harcırahı vb.; araca/sefere bağlanabilir |
| **Raporlar** | Aylık ciro, sefer kârlılığı, araç bazlı gelir-gider, müşteri bazlı borç yaşlandırma, Excel dışa aktarma |
| **Ayarlar** | Firma bilgileri (fatura başlığı, logo), kullanıcı yönetimi, sabit listeler |

**Sefer durum akışı:** `Planlandı → Yüklendi → Yolda → Teslim Edildi` (+ `İptal`). Görseldeki "Beklemede/Yola Çıktı" bu akışa eşlenir.

---

## 2. Veri modeli (ana tablolar)
- `Users` (Id, AdSoyad, Email, ŞifreHash, Rol)
- `Customers` (Id, MusteriNo, Unvan, VknTckn, VergiDairesi, Telefon, Email, Adres)
- `Vehicles` (Id, Plaka [unique], Tip, Marka/Model, ModelYili, Km, SonBakimTarihi, Durum)
- `Drivers` (Id, AdSoyad, Telefon, EhliyetSinifi, SrcBitis, Aktif)
- `Trips` (Id, CustomerId, VehicleId, DriverId, YuklemeAdresi, TeslimatAdresi, YuklemeTarihi, TeslimTarihi, Aciklama, AracMaliyeti, SatisFiyati, Durum, InvoiceId?)
- `Invoices` (Id, FaturaNo [unique], CustomerId, Tarih, AraToplam, KdvOrani, KdvTutari, TevkifatOrani, GenelToplam, Durum) + `InvoiceLines` (TripId?, Aciklama, Tutar)
- `Payments` (Id, CustomerId, InvoiceId?, Tarih, Tutar, Yontem, Aciklama)
- `Expenses` (Id, Kategori, Tutar, Tarih, VehicleId?, TripId?, Aciklama)
- Tüm tablolarda `CreatedAt/UpdatedAt/CreatedBy` + soft delete (`IsDeleted`).

**Cari bakiye kuralı:** Borç = kesilmiş faturaların toplamı, Alacak = tahsilatların toplamı, Bakiye = Borç − Alacak. Saklanmaz, sorguyla hesaplanır (tutarsızlık olmasın). Para alanları `decimal(18,2)`.

---

## 3. Proje yapısı
```
yeslojistik/
├── client/                    # React + Vite + TS + Tailwind
│   └── src/
│       ├── api/               # axios instance + endpoint fonksiyonları
│       ├── components/        # Layout, Sidebar, DataTable, StatCard, StatusBadge, FormFields
│       ├── pages/             # Dashboard, Trips, Vehicles, Drivers, Customers, Invoices, Payments, Expenses, Reports, Settings, Login
│       ├── hooks/             # TanStack Query hook'ları
│       └── lib/               # format (TL, tarih), auth context
├── server/
│   ├── YesLojistik.Api/       # Controllers, Program.cs, auth, Swagger
│   ├── YesLojistik.Core/      # Entity'ler, DTO'lar, servis arayüzleri, iş kuralları
│   ├── YesLojistik.Infrastructure/  # EF Core DbContext, migrations, PDF üretimi
│   └── YesLojistik.Tests/     # xUnit
├── docker-compose.yml         # postgres + api + client (nginx)
└── README.md
```
**Kütüphaneler:** Frontend – React Router, TanStack Query, React Hook Form + Zod, TanStack Table, lucide-react, Recharts. Backend – EF Core + Npgsql, FluentValidation, ASP.NET Identity/JWT, QuestPDF (fatura PDF), ClosedXML (Excel), Serilog.

---

## 4. Aşamalar (her aşama sonunda kuzene demo)

### Faz 1 — Temel altyapı (≈1 hafta)
- Repo iskeleti, `docker-compose` ile Postgres, .NET çözümü, Vite projesi
- EF Core DbContext + ilk migration, seed (admin kullanıcı + örnek veri)
- JWT login (httpOnly cookie ile refresh), rol bazlı yetki
- React layout: görseldeki lacivert sidebar, üst bar (tarih, bildirim, kullanıcı), login sayfası
- Ortak bileşenler: DataTable (sayfalama/sıralama/arama), StatusBadge (renkler görseldeki gibi), para/tarih formatlayıcı (`tr-TR`)

### Faz 2 — Ana kayıtlar (≈1 hafta)
- Araçlar, Şoförler, Müşteriler: CRUD API + liste/form sayfaları
- Validasyonlar: plaka formatı, VKN (10 hane) / TCKN (11 hane + algoritma), telefon

### Faz 3 — Seferler (≈1 hafta)
- Sefer CRUD, durum geçişleri (geçersiz geçişi engelle), araç durumunu otomatik güncelle (sefer "Yolda" → araç "Yolda")
- Filtreli liste, "Bugünün Seferleri"
- Kâr = SatışFiyatı − AraçMaliyeti − bağlı giderler

### Faz 4 — Finans (≈1,5 hafta)
- Fatura: seferleri seçip fatura oluştur, otomatik numara (transaction içinde, çakışmasız), KDV + tevkifat hesabı, QuestPDF ile PDF
- Tahsilatlar ve faturayla eşleştirme
- Cari kartı: hareketler (fatura + tahsilat kronolojik, yürüyen bakiye), borç/alacak/bakiye
- Giderler CRUD

### Faz 5 — Dashboard & Raporlar (≈1 hafta)
- Dashboard KPI endpoint'i (tek sorguda özet), günlük seferler, araç özetleri
- Raporlar + grafikler (Recharts) + Excel export
- Uyarılar: yaklaşan bakım, biten SRC, vadesi geçen alacak (üst bardaki zil)

### Faz 6 — Test, güvenlik, canlıya alma (≈1 hafta)
- Backend birim testleri (bakiye, fatura hesabı, numara üretimi, durum geçişleri) + birkaç entegrasyon testi (Testcontainers Postgres)
- Güvenlik: HTTPS (Caddy/Let's Encrypt), rate limit login, CORS, şifre politikası, KVKK için yetkisiz erişim kontrolü
- VPS'e Docker ile deploy, günlük otomatik `pg_dump` yedeği (sunucu dışına kopyalı!)
- GitHub Actions: build + test her push'ta
- Kısa kullanım kılavuzu + kuzenle eğitim oturumu

**Toplam v1: ~6–7 hafta** (yarı zamanlı çalışırsan x1,5–2).

### v2 (ayrı fiyatlanır)
- Şoför mobil uygulaması (React Native / Expo): kendi seferlerini gör, durum güncelle, teslim fotoğrafı/imza yükle, bildirim
- GPS canlı takip + Google Maps harita görünümü, rota mesafe hesabı
- GİB e-Fatura/e-Arşiv — seçilecek özel entegratör API'si üzerinden (`IEInvoiceProvider` arayüzü v1'de hazır bırakılır)
- SMS/WhatsApp bildirimleri, müşteriye sefer takip linki

---

## 5. Kritik noktalar / riskler
- **Para hesapları:** her zaman `decimal`, yuvarlama kuralı tek yerde.
- **Fatura numarası:** silinen/iptal faturada numara boşluğu olmamalı → iptal = durum değişikliği, silme yok.
- **Kapsam kayması:** "şunu da ekleyelim" istekleri için v2 listesi tut; yazılı anlaşma şart.
- **Yedekleme:** muhasebe verisi kaybolursa iş biter — yedek + geri yükleme testi Faz 6'da zorunlu.

---

## 6. Doğrulama (her faz sonunda)
- `docker compose up` → uygulama `localhost`'ta açılıyor, seed admin ile giriş yapılıyor
- `dotnet test` yeşil; `npm run build` + `npm run lint` hatasız
- Swagger'dan uç noktalar elle denenir
- Uçtan uca senaryo (Faz 4 sonrası): müşteri ekle → araç + şoför ekle → sefer oluştur → durumları ilerlet → sefer(ler)den fatura kes → PDF indir → kısmi tahsilat gir → cari bakiyenin doğru düştüğünü ve dashboard'daki "Tahsilat Bekleyen" tutarının güncellendiğini kontrol et
- Playwright ile bu senaryonun otomatik testi + mobil genişlikte (375px) ekran görüntüsü kontrolü

