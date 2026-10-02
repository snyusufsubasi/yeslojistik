using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Tests.Integration;

public class LegacyMirrorTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Day = new(2026, 9, 1);

    private static MirrorSnapshot Snapshot(int tripCount = 12, decimal price = 1000, decimal? balance = 5_000) => new(
        new DateTime(2026, 10, 2, 9, 0, 0, DateTimeKind.Utc),
        [new MirrorParty("V1111111111", "Örnek Taşımacılık Ltd. Şti.", "1111111111", null, null, null, null, "İstanbul", null, null, 2_500),
         new MirrorParty("X:BILINMEYEN", "Taşeronu Belli Olmayan Araçlar", null, null, null, null, null, null, null, null, null)],
        [new MirrorParty("V1234567890", "Örnek Mobilya Tic. Ltd. Şti.", "1234567890", null, null, null, null, "Ankara", null, null, balance)],
        [new MirrorDriver("D:ALI", "Ali Veli", null, null, null, "V1111111111"),
         new MirrorDriver("D:AYSE", "Ayşe Kaya", null, null, null, null)],
        [new MirrorVehicle("34 OZM 01", "34 OZM 01", "Kapalı Kamyon", true, null, null, "Ford", 2020, null, null),
         new MirrorVehicle("34 TSR 01", "34 TSR 01", "Açık Tır", false, "V1111111111", "34 DRS 01", null, null, null, null),
         new MirrorVehicle("34 BLN 01", "34 BLN 01", "Kamyonet", false, "X:BILINMEYEN", null, null, null, null, null)],
        Enumerable.Range(1, tripCount).Select(i => new MirrorTrip($"S{i}", Day.AddDays(i), "V1234567890", i % 2 == 0 ? "34 OZM 01" : "34 TSR 01",
            i % 2 == 0 ? "D:AYSE" : "D:ALI", "İstanbul", "Ankara Çankaya", "Mobilya", 600, price, $"Sevkiyat {i}", null)).ToList(),
        [new MirrorExpense("G1", Day, "Yakıt", 1_500, "34 OZM 01", 40, 120_000, "Mazot")],
        [new MirrorCashAccount("B:ANA", "Ana Hesap")],
        [new MirrorStaff("P:MEHMET", "Mehmet Demir", null, null, Day, 30_000, null)]);

    [Fact]
    public async Task Mirror_adopts_old_import_is_idempotent_updates_removes_and_locks_editing()
    {
        var c = await factory.LoginAsync();
        // 30 Eylül'deki tek seferlik aktarımdan kalan kayıt: büyük harf, anahtarsız, devir bakiyeli; bir de devir tahsilatı.
        var old = await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("ÖRNEK MOBİLYA TİC.LTD.ŞTİ.", "1234567890", null, null, null, null, null,
            OpeningBalance: 9_999))).ReadAsync<CustomerSummaryDto>();
        (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(old.Customer.Id, null, Day, 100, PaymentMethod.BankTransfer, "Devir"))).EnsureSuccessStatusCode();

        // Ayna kapalıyken yalnız deneme yapılabilir.
        (await c.PostJsonAsync("/api/legacy/mirror", Snapshot())).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var dry = await (await c.PostJsonAsync("/api/legacy/mirror?dryRun=true", Snapshot())).ReadAsync<MirrorResult>();
        dry.DryRun.Should().BeTrue();
        (await Db(db => db.Trips.CountAsync())).Should().Be(0);

        (await (await c.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(true))).ReadAsync<MirrorStatusDto>()).MirrorMode.Should().BeTrue();
        var first = await (await c.PostJsonAsync("/api/legacy/mirror", Snapshot())).ReadAsync<MirrorResult>();
        Count(first, "Müşteri").Should().BeEquivalentTo(new { Created = 0, Updated = 1 }); // eski kayıt sahiplenildi, çift kayıt yok
        Count(first, "Sevkiyat").Created.Should().Be(12);
        Count(first, "Tahsilat").Removed.Should().Be(1);

        var customer = await Db(db => db.Customers.SingleAsync());
        customer.Id.Should().Be(old.Customer.Id);
        customer.Title.Should().Be("Örnek Mobilya Tic. Ltd. Şti.");
        customer.OpeningBalance.Should().Be(0);
        (await Db(db => db.Vehicles.CountAsync(v => v.Ownership == VehicleOwnership.Own))).Should().Be(1);
        (await Db(db => db.Trips.CountAsync(t => t.IsLegacy && t.CarrierSupplierId != null))).Should().Be(6);

        // Cari: bakiye pratikortam'daki rakam; panelin kendi hesabında borç/alacak yok.
        var cari = await (await c.GetAsync("/api/cari/customers")).ReadAsync<List<CustomerCariRow>>();
        cari.Single().Should().BeEquivalentTo(new { LegacyBalance = 5_000m, Balance = 0m, UninvoicedTripCount = 0 });

        // İkinci senkron: değişiklik yok.
        var again = await (await c.PostJsonAsync("/api/legacy/mirror", Snapshot())).ReadAsync<MirrorResult>();
        again.Counts.Should().OnlyContain(x => x.Created == 0 && x.Updated == 0 && x.Removed == 0);
        again.Summary.Should().Be("değişiklik yok");

        // Pratikortam'da fiyat ve bakiye değişti, 1 sefer silindi: güncellenir ve geri alınabilir şekilde silinir.
        var changed = await (await c.PostJsonAsync("/api/legacy/mirror", Snapshot(tripCount: 11, price: 1_250, balance: 7_000))).ReadAsync<MirrorResult>();
        Count(changed, "Sevkiyat").Should().BeEquivalentTo(new { Created = 0, Updated = 11, Removed = 1 });
        (await Db(db => db.Trips.IgnoreQueryFilters().CountAsync(t => t.IsDeleted))).Should().Be(1);
        (await (await c.GetAsync("/api/cari/customers")).ReadAsync<List<CustomerCariRow>>()).Single().LegacyBalance.Should().Be(7_000);

        // Eksik gelen veri her şeyi silmesin.
        var broken = Snapshot() with { Trips = [] };
        (await c.PostJsonAsync("/api/legacy/mirror", broken)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Db(db => db.Trips.CountAsync())).Should().Be(11);

        // Ayna açıkken aynadaki kayıtlar panelde değiştirilemez; okuma serbest.
        (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Yeni", null, null, null, null, null, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.GetAsync("/api/trips")).StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await (await c.GetAsync("/api/legacy/status")).ReadAsync<MirrorStatusDto>();
        status.LastSummary.Should().Contain("Sevkiyat");
    }

    private static MirrorCount Count(MirrorResult r, string entity) => r.Counts.Single(x => x.Entity == entity);

    private async Task<T> Db<T>(Func<AppDbContext, Task<T>> q)
    {
        using var scope = factory.Services.CreateScope();
        return await q(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
