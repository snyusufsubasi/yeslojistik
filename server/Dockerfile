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
RUN apt-get update && apt-get install -y --no-install-recommends libfontconfig1 tzdata curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    TZ=Europe/Istanbul
EXPOSE 8080
USER app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fs http://localhost:8080/api/health || exit 1
ENTRYPOINT ["dotnet", "YesLojistik.Api.dll"]
