using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Npgsql;
using YesLojistik.Core.Dtos;

namespace YesLojistik.Tests.Integration;

public class BackupApiFactory : ApiFactory
{
    public const string Token = "backup-token-0123456789-abcdefghijklmnop";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Backup:Token", Token);
        builder.UseSetting("Backup:AllowRestore", "true");
    }
}

public class BackupTests(BackupApiFactory factory) : IClassFixture<BackupApiFactory>
{
    private static bool ToolsAvailable() =>
        Environment.GetEnvironmentVariable("PATH")!.Split(Path.PathSeparator).Any(d => File.Exists(Path.Combine(d, "pg_dump")) && File.Exists(Path.Combine(d, "pg_restore")));

    [Fact]
    public async Task Backup_requires_admin_or_valid_token()
    {
        var anon = factory.CreateClient();
        (await anon.GetAsync("/api/admin/backup")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var wrong = new HttpRequestMessage(HttpMethod.Get, "/api/admin/stats");
        wrong.Headers.Add("X-Backup-Token", "yanlis-anahtar-yanlis-anahtar-yanlis-anahtar");
        (await anon.SendAsync(wrong)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var ok = new HttpRequestMessage(HttpMethod.Get, "/api/admin/stats");
        ok.Headers.Add("X-Backup-Token", BackupApiFactory.Token);
        var res = await anon.SendAsync(ok);
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        (await res.Content.ReadAsStringAsync()).Should().Contain("databaseBytes");
    }

    [Fact]
    public async Task Attachments_are_stored_in_database_and_survive_in_backup_restore()
    {
        if (!ToolsAvailable()) return; // pg_dump/pg_restore kurulu değilse (CI'da kurulur)
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Yedek Test A.Ş.", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Yedek Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 YDK 01", "Tır", null, null, null, 0, null, null, null, null, Core.Entities.VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "İstanbul", "İzmir", DateOnly.FromDateTime(DateTime.Today), null, null, 1000, 2000))).ReadAsync<TripDto>();

        var pdf = "%PDF-1.4\n%yedek testi\n"u8.ToArray();
        var form = new MultipartFormDataContent { { new ByteArrayContent(pdf) { Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") } }, "file", "irsaliye.pdf" }, { new StringContent("Document"), "kind" } };
        var att = await (await c.PostAsync($"/api/trips/{trip.Id}/attachments", form)).ReadAsync<AttachmentDto>();
        (await c.GetByteArrayAsync($"/api/attachments/{att.Id}")).Should().Equal(pdf);

        // Tam yedek al, sonra müşteriyi sil; geri yükleyince geri gelmeli.
        var dump = await c.GetByteArrayAsync("/api/admin/backup?files=true");
        dump.Length.Should().BeGreaterThan(1000);
        (await c.DeleteAsync($"/api/customers/{customer.Id}")).IsSuccessStatusCode.Should().BeFalse(); // seferi olan müşteri silinmez
        await using (var conn = new NpgsqlConnection(factory.ConnectionString))
        {
            await conn.OpenAsync();
            await new NpgsqlCommand("UPDATE customers SET title = 'Değişti'", conn).ExecuteNonQueryAsync();
        }

        var noConfirm = new MultipartFormDataContent { { new ByteArrayContent(dump), "file", "y.dump" } };
        (await c.PostAsync("/api/admin/restore", noConfirm)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var restore = new MultipartFormDataContent { { new ByteArrayContent(dump), "file", "y.dump" }, { new StringContent("geri yükle"), "confirm" } };
        (await c.PostAsync("/api/admin/restore", restore)).StatusCode.Should().Be(HttpStatusCode.OK);

        await using (var conn = new NpgsqlConnection(factory.ConnectionString))
        {
            await conn.OpenAsync();
            (await new NpgsqlCommand($"SELECT title FROM customers WHERE id = {customer.Id}", conn).ExecuteScalarAsync()).Should().Be("Yedek Test A.Ş.");
            (await new NpgsqlCommand("SELECT count(*) FROM stored_files", conn).ExecuteScalarAsync()).Should().Be(1L);
        }
    }

    [Fact]
    public async Task Maintenance_mode_blocks_writes_but_allows_reads()
    {
        var c = await factory.LoginAsync();
        var state = (Api.Infrastructure.MaintenanceState)factory.Services.GetService(typeof(Api.Infrastructure.MaintenanceState))!;
        state.Enable();
        try
        {
            (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Bakımda", null, null, null, null, null, null))).StatusCode
                .Should().Be(HttpStatusCode.ServiceUnavailable);
            (await c.GetAsync("/api/customers")).StatusCode.Should().Be(HttpStatusCode.OK);
            (await c.GetStringAsync("/api/health")).Should().Contain("\"maintenance\":true");
        }
        finally
        {
            state.Disable();
        }
    }
}
