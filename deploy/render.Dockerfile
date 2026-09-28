# Panel + API tek konteynerde (Render gibi tek servisli platformlar için). Build context: depo kökü.
# Normal sunucu kurulumu bunu kullanmaz; o docker-compose.yml (nginx + api) ile çalışır.
FROM node:22-alpine AS web
WORKDIR /web
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY server/YesLojistik.sln ./
COPY server/YesLojistik.Api/YesLojistik.Api.csproj YesLojistik.Api/
COPY server/YesLojistik.Core/YesLojistik.Core.csproj YesLojistik.Core/
COPY server/YesLojistik.Infrastructure/YesLojistik.Infrastructure.csproj YesLojistik.Infrastructure/
COPY server/YesLojistik.Tests/YesLojistik.Tests.csproj YesLojistik.Tests/
RUN dotnet restore YesLojistik.Api/YesLojistik.Api.csproj
COPY server/ ./
RUN dotnet publish YesLojistik.Api/YesLojistik.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
# QuestPDF (PDF) için yazı tipi kütüphanesi ve saat dilimi verisi
# Yedek/geri yükleme (pg_dump, pg_restore) için PostgreSQL 16 istemcisi (PGDG deposu, Debian bookworm).
RUN apt-get update && apt-get install -y --no-install-recommends libfontconfig1 tzdata curl ca-certificates gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
COPY --from=web /web/dist ./wwwroot
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data
ENV ASPNETCORE_ENVIRONMENT=Production \
    TZ=Europe/Istanbul
USER app
# Render dinlenecek portu PORT değişkeniyle verir (varsayılan 10000).
CMD ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} exec dotnet YesLojistik.Api.dll"]
