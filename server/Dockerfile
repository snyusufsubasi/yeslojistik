FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY YesLojistik.sln ./
COPY YesLojistik.Api/YesLojistik.Api.csproj YesLojistik.Api/
COPY YesLojistik.Core/YesLojistik.Core.csproj YesLojistik.Core/
COPY YesLojistik.Infrastructure/YesLojistik.Infrastructure.csproj YesLojistik.Infrastructure/
COPY YesLojistik.Tests/YesLojistik.Tests.csproj YesLojistik.Tests/
RUN dotnet restore YesLojistik.Api/YesLojistik.Api.csproj
COPY . .
RUN dotnet publish YesLojistik.Api/YesLojistik.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
# QuestPDF (PDF) için gerekli yazı tipi/grafik kütüphaneleri ve saat dilimi verisi
# Yedek/geri yükleme (pg_dump, pg_restore) için PostgreSQL 16 istemcisi (PGDG deposu, Debian bookworm).
RUN apt-get update && apt-get install -y --no-install-recommends libfontconfig1 tzdata curl ca-certificates gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
# Yüklenen dosyalar (teslim fotoğrafları vb.) için volume dizini
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    TZ=Europe/Istanbul
EXPOSE 8080
USER app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fs http://localhost:8080/api/health || exit 1
ENTRYPOINT ["dotnet", "YesLojistik.Api.dll"]
