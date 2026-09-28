using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class DataResetTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Fact]
    public async Task Reset_removes_business_data_but_keeps_staff_and_company_settings()
    {
        var c = await factory.LoginAsync();
        var settings = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await c.PutAsync("/api/settings", JsonContent.Create(settings with { TaxNumber = DemoCompany.TaxNumber, Iban = DemoCompany.Iban, Address = "Gerçek Adres" },
            options: ApiFactory.Json))).EnsureSuccessStatusCode();
        var customer = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Demo Müşteri", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Demo Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 DMO 01", "Kamyon", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "A", "B", Today, null, null, 100, 200))).ReadAsync<TripDto>();
        await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Customer.Id, Today, null, 20, 0, null, false, [trip.Id], null))).ReadAsync<InvoiceDto>();
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Demo Şoför", "sofor@test.local", UserRole.Driver, true, "Sifre1234", driver.Id))).ReadAsync<UserDto>();
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Operasyon", "ops@test.local", UserRole.Operations, true, "Sifre1234"))).ReadAsync<UserDto>();

        // Yanlış onay metni reddedilir, hiçbir şey silinmez.
        (await c.PostJsonAsync("/api/settings/reset-data", new { confirm = "evet" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await (await c.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>()).Setup.CustomerCount.Should().Be(1);

        // Yönetici olmayan silemez.
        var ops = await factory.LoginAsync("ops@test.local", "Sifre1234");
        (await ops.PostJsonAsync("/api/settings/reset-data", new { confirm = "SİL" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        (await c.PostJsonAsync("/api/settings/reset-data", new { confirm = "sil" })).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var setup = (await (await c.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>()).Setup;
        setup.Should().BeEquivalentTo(new { CustomerCount = 0, VehicleCount = 0, DriverCount = 0, TripCount = 0, UserCount = 2, SampleData = false });
        var users = await (await c.GetAsync("/api/users")).ReadAsync<List<UserDto>>();
        users.Select(u => u.Role).Should().BeEquivalentTo([UserRole.Admin, UserRole.Operations]);

        // Sunucu SAMPLE_DATA açıkken yeniden başlasa bile demo veriler geri gelmez.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await DbSeeder.SeedSampleDataAsync(db, scope.ServiceProvider.GetRequiredService<InvoiceService>());
            (await db.Customers.CountAsync()).Should().Be(0);
        }

        // Numaralar baştan başlar.
        var fresh = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Gerçek Müşteri", null, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        fresh.Customer.CustomerNo.Should().Be("00001");
        var d2 = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Gerçek Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var v2 = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest("34 GRC 01", "Kamyon", null, null, null, 0, null, null, null, null, VehicleStatus.Available, d2.Id))).ReadAsync<VehicleDto>();
        var t2 = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(fresh.Customer.Id, v2.Id, d2.Id, "A", "B", Today, null, null, 100, 200))).ReadAsync<TripDto>();
        var inv = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(fresh.Customer.Id, Today, null, 20, 0, null, false, [t2.Id], null))).ReadAsync<InvoiceDto>();
        inv.InvoiceNo.Should().Be("F-000001");

        // Demo firma bilgileri boşaltılır, kullanıcının girdiği bilgiler kalır.
        var after = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        after.TaxNumber.Should().BeNull();
        after.Iban.Should().BeNull();
        after.Address.Should().Be("Gerçek Adres");
    }
}
