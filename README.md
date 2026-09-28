# YES Lojistik – Nakliye Takip Sistemi

Seferler, araçlar, şoförler, müşteri carileri, faturalar, tahsilatlar ve giderler için web paneli.
Masaüstü ve telefonda çalışır.

- **Ön yüz:** React 19 + TypeScript + Vite + Tailwind CSS (`client/`)
- **API:** .NET 8 Web API + EF Core (`server/`)
- **Veritabanı:** PostgreSQL 16
- **Kurulum:** Docker Compose + Caddy (otomatik HTTPS)

| Doküman | İçerik |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Proje planı ve kapsam (v1 / v2) |
| [docs/KURULUM.md](docs/KURULUM.md) | Geliştirme ortamı, sunucuya kurulum, yedekleme |
| [docs/KULLANIM.md](docs/KULLANIM.md) | Kullanım kılavuzu (kuzen için) |

## Hızlı başlangıç (geliştirme)

Gerekenler: .NET 8 SDK, Node 22, PostgreSQL 16 (`localhost:5432`, kullanıcı/şifre `postgres`/`postgres`).

```bash
# 1) API — ilk açılışta tabloları oluşturur, örnek veriyi yükler
createdb -U postgres yeslojistik
cd server/YesLojistik.Api
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5080

# 2) Ön yüz (ayrı terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```

Giriş: `admin@yeslojistik.com` / `Admin123!` (yalnızca geliştirme ortamı).

Swagger: http://localhost:5080/swagger

## Testler

```bash
# Backend: birim + gerçek PostgreSQL üzerinde entegrasyon testleri (geçici veritabanı açıp siler)
dotnet test server/YesLojistik.sln

# Ön yüz
cd client && npm run lint && npm run build

# Uçtan uca (API ve `npm run dev` çalışırken)
cd client && npm run test:e2e
```

## Proje yapısı

```
client/                      React uygulaması
  src/api/                   axios istemcisi (otomatik token yenileme) + tipler
  src/components/            Layout, DataTable, formlar, UI bileşenleri
  src/pages/                 Sayfalar
  e2e/                       Playwright testleri
server/
  YesLojistik.Core/          Entity'ler, DTO'lar, doğrulama, iş kuralları (fatura hesabı, sefer durumları, VKN/TCKN)
  YesLojistik.Infrastructure/ EF Core, migration'lar, servisler (fatura, bakiye, rapor, PDF, Excel)
  YesLojistik.Api/           Controller'lar, kimlik doğrulama, Program.cs
  YesLojistik.Tests/         xUnit testleri
deploy/                      Caddyfile, yedekleme/geri yükleme betikleri
```

## Lisans notu

Fatura PDF'leri [QuestPDF](https://www.questpdf.com/license/) Community lisansıyla üretilir; yıllık cirosu
1 milyon USD altındaki şirketler için ücretsizdir. Firma bu sınırı aşarsa ticari lisans gerekir.
