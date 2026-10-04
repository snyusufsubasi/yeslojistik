using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Api.Controllers;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Tests.Integration;

public class DataExportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private static string Read(ZipArchive zip, string name)
    {
        using var s = zip.GetEntry(name)!.Open();
        using var r = new StreamReader(s, new UTF8Encoding(true), detectEncodingFromByteOrderMarks: true);
        return r.ReadToEnd();
    }

    [Fact]
    public async Task Export_zip_has_every_table_with_turkish_headers_and_no_secrets()
    {
        var admin = await factory.LoginAsync();
        var customer = await (await admin.PostJsonAsync("/api/customers", new CustomerSaveRequest("Dışa Aktarım Ltd. Şti.", "1234567890", null, "+90 532 000 00 00", null, null, "=1+1"))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest("Ali Şoför", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await admin.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 EX 001", "Tır", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await admin.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "İstanbul", "İzmir", Today, null, null, 1000, 2500))).ReadAsync<TripDto>();
        // İki adımlı doğrulamalı bir hesap: sırları pakete girmemeli.
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Gizli", "gizli@test.local", UserRole.Accounting, true, "Sifre1234"))).ReadAsync<UserDto>();
        var other = await factory.LoginAsync("gizli@test.local", "Sifre1234");
        var setup = await (await other.PostAsync("/api/auth/2fa/setup", null)).Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var secret = setup.GetProperty("secret").GetString()!;
        var code = YesLojistik.Core.Domain.Totp.CodeFor(YesLojistik.Core.Domain.Totp.FromBase32(secret), YesLojistik.Core.Domain.Totp.StepOf(DateTime.UtcNow));
        (await other.PostJsonAsync("/api/auth/2fa/enable", new { code })).EnsureSuccessStatusCode();

        var res = await admin.GetAsync("/api/admin/export-all");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        res.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");
        res.Content.Headers.ContentDisposition!.FileName.Should().StartWith("yeslojistik-verilerim-");
        await using var bytes = await res.Content.ReadAsStreamAsync();
        using var zip = new ZipArchive(bytes, ZipArchiveMode.Read);

        zip.Entries.Select(e => e.FullName).Should().BeEquivalentTo(DataExportService.FileNames);

        var customers = Read(zip, "musteriler.csv");
        customers.Should().StartWith("Müşteri no;Ünvan;VKN/TCKN;");
        customers.Should().Contain("Dışa Aktarım Ltd. Şti.").And.Contain("1234567890");
        // Formül gibi başlayan not etkisizleştirilmiş.
        customers.Should().Contain("0532 000 00 00").And.Contain("'=1+1");

        Read(zip, "soforler.csv").Should().Contain("Ali Şoför");
        Read(zip, "araclar.csv").Should().Contain("34 EX 001");
        var trips = Read(zip, "sevkiyatlar.csv");
        trips.Should().StartWith("Sevkiyat no;Müşteri;").And.Contain("Dışa Aktarım Ltd. Şti.").And.Contain("2500,00").And.Contain("1000,00").And.Contain("İzmir");
        string? token;
        using (var tscope = factory.Services.CreateScope())
            token = await tscope.ServiceProvider.GetRequiredService<AppDbContext>().Trips.Where(t => t.Id == trip.Id).Select(t => t.TrackingToken).FirstAsync();
        trips.Should().NotContain("TrackingToken");
        if (token != null) trips.Should().NotContain(token);
        foreach (var name in new[] { "faturalar.csv", "fatura-satirlari.csv", "alis-faturalari.csv", "tahsilatlar.csv", "tedarikci-odemeleri.csv", "giderler.csv", "kasa-ve-bankalar.csv", "personel.csv", "tedarikciler.csv" })
            Read(zip, name).Should().Contain(";", $"{name} başlık satırı olmalı");
        Read(zip, "OKUBENI.txt").Should().Contain("UTF-8");

        // Gizli bilgi yok: şifre özeti, anahtar, kurtarma özetleri.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hashes = await db.Users.Select(u => new { u.PasswordHash, u.TotpSecretEnc, u.TotpRecoveryHashes }).ToListAsync();
        var all = string.Join("\n", zip.Entries.Select(e => Read(zip, e.FullName)));
        foreach (var h in hashes)
        {
            all.Should().NotContain(h.PasswordHash);
            if (h.TotpSecretEnc != null) all.Should().NotContain(h.TotpSecretEnc);
            if (h.TotpRecoveryHashes != null) all.Should().NotContain(h.TotpRecoveryHashes.Trim('[', ']').Split(',')[0].Trim('"'));
        }
        all.Should().NotContain(secret).And.NotContain("gizli@test.local");

        // Denetim kaydı.
        var logs = await db.AuditLogs.Where(a => a.Action == "DataExport").ToListAsync();
        logs.Should().NotBeEmpty();
        logs[0].UserName.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Export_is_admin_only()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Muhasebeci", "muh-export@test.local", UserRole.Accounting, true, "Sifre1234"))).ReadAsync<UserDto>();
        var acc = await factory.LoginAsync("muh-export@test.local", "Sifre1234");
        (await acc.GetAsync("/api/admin/export-all")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await factory.CreateClient().GetAsync("/api/admin/close-request")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await acc.PostJsonAsync("/api/admin/close-request", new { companyName = "x" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Close_request_needs_company_name_is_audited_and_deletes_nothing()
    {
        var admin = await factory.LoginAsync();
        var customer = await (await admin.PostJsonAsync("/api/customers", new CustomerSaveRequest("Silinmemeli A.Ş.", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        string company;
        using (var scope = factory.Services.CreateScope())
            company = await scope.ServiceProvider.GetRequiredService<AppDbContext>().CompanySettings.Select(c => c.CompanyName).FirstAsync();

        (await admin.GetFromJsonAsync<CloseRequestStatusDto>("/api/admin/close-request", ApiFactory.Json))!.Requested.Should().BeFalse();
        (await admin.PostJsonAsync("/api/admin/close-request", new { companyName = "Yanlış Ad" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PostJsonAsync("/api/admin/close-request", new { companyName = "" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var status = await (await admin.PostJsonAsync("/api/admin/close-request", new { companyName = "  " + company.ToLowerInvariant() + " " })).ReadAsync<CloseRequestStatusDto>();
        status.Requested.Should().BeTrue();
        status.DeleteAfter.Should().BeCloseTo(DateTime.UtcNow.AddDays(30), TimeSpan.FromMinutes(5));
        (await admin.PostJsonAsync("/api/admin/close-request", new { companyName = company })).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Veri yerinde.
        (await admin.GetAsync($"/api/customers/{customer.Customer.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        using (var scope = factory.Services.CreateScope())
            (await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditLogs.CountAsync(a => a.Action == "CloseRequested")).Should().Be(1);

        // Vazgeçme.
        (await admin.DeleteAsync("/api/admin/close-request")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.GetFromJsonAsync<CloseRequestStatusDto>("/api/admin/close-request", ApiFactory.Json))!.Requested.Should().BeFalse();
    }
}
