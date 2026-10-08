using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

/// <summary>
/// Planlama panosu (GET /api/planning, POST /api/planning/assign): araç × gün blokları, "Atanmamış" iş talepleri,
/// çakışma uyarısı, sürükle-bırak ataması ve zaman çizelgesindeki "Araç atandı" satırı.
/// </summary>
public class PlanningTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul")));

    [Fact]
    public async Task Planning_board_lists_blocks_conflicts_and_assigns()
    {
        var c = await factory.LoginAsync();
        var u = Random.Shared.Next(100_000, 999_999).ToString();
        var today = Today;
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Plan Müşteri {u}", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        async Task<DriverDto> Driver(string name) =>
            await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"{name} {u}", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var ali = await Driver("Plan Ali");
        var veli = await Driver("Plan Veli");
        async Task<VehicleDto> Vehicle(string plate, int? defaultDriver, string? trailer = null) =>
            await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest(plate, "Tır", null, null, null, 0, null, null, null, null,
                VehicleStatus.Available, defaultDriver, TrailerPlate: trailer))).ReadAsync<VehicleDto>();
        var v1 = await Vehicle($"34 PA {u[..4]}", ali.Id);
        var v2 = await Vehicle($"34 PB {u[..4]}", veli.Id, $"34 DR {u[..4]}");
        var v3 = await Vehicle($"34 PC {u[..4]}", null);

        async Task<TripDto> Trip(int vehicleId, int driverId, DateOnly loading, DateOnly? delivery) =>
            await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicleId, driverId, "Tuzla OSB", "Gebze depo",
                loading, delivery, null, 1_000, 2_000, LoadingCity: "İstanbul", DeliveryCity: "Kocaeli"))).ReadAsync<TripDto>();

        var a = await Trip(v1.Id, ali.Id, today, today.AddDays(2));             // bugün → +2
        var b = await Trip(v1.Id, ali.Id, today.AddDays(1), null);              // +1: a'nın içinde, çakışır
        var touching = await Trip(v1.Id, ali.Id, today.AddDays(2), today.AddDays(3)); // a'nın teslim günü yükleme: çakışma değil
        var outside = await Trip(v1.Id, ali.Id, today.AddDays(10), null);       // aralık dışı
        var cancelled = await Trip(v2.Id, veli.Id, today.AddDays(3), null);
        (await c.PostJsonAsync($"/api/trips/{cancelled.Id}/status", new TripStatusRequest(TripStatus.Cancelled))).EnsureSuccessStatusCode();
        var request = await (await c.PostJsonAsync("/api/job-requests", new JobRequestSaveRequest(customer.Id, today.AddDays(1), "İstanbul / Tuzla",
            "İzmir / Bornova", null, "Mobilya", 10, "Tır", 25_000, 17_000, null, null, null, false, null, null, null, "Panodan", null, null, null, null)))
            .ReadAsync<JobRequestDto>();

        var board = await (await c.GetAsync("/api/planning")).ReadAsync<PlanningDto>();
        board.From.Should().Be(today);
        board.To.Should().Be(today.AddDays(6));
        board.Vehicles.Select(v => v.Id).Should().Contain([v1.Id, v2.Id, v3.Id]);
        var row2 = board.Vehicles.Single(v => v.Id == v2.Id);
        (row2.TrailerPlate, row2.DefaultDriverName).Should().Be(($"34 DR {u[..4]}", veli.FullName));
        var mine = board.Trips.Where(t => t.Customer == customer.Title).ToList();
        mine.Select(t => t.Id).Should().BeEquivalentTo([a.Id, b.Id, touching.Id]);
        mine.Single(t => t.Id == a.Id).EndDate.Should().Be(today.AddDays(2));
        mine.Single(t => t.Id == b.Id).EndDate.Should().Be(today.AddDays(1));
        mine.Where(t => t.Conflict).Select(t => t.Id).Should().BeEquivalentTo([a.Id, b.Id]);
        board.Unassigned.Should().ContainSingle(r => r.Id == request.Id && r.Customer == customer.Title);

        // Önceki hafta: bu sevkiyatlar görünmez; geçersiz aralık reddedilir.
        var prev = await (await c.GetAsync($"/api/planning?from={today.AddDays(-7):yyyy-MM-dd}&to={today.AddDays(-1):yyyy-MM-dd}")).ReadAsync<PlanningDto>();
        prev.Trips.Should().NotContain(t => t.Customer == customer.Title);
        (await c.GetAsync($"/api/planning?from={today:yyyy-MM-dd}&to={today.AddDays(40):yyyy-MM-dd}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Sürükle-bırak: b'yi v2'ye, iki gün sonraya taşı → şoför aracın varsayılanı (Veli), dorse araçtan, çakışma kalkar.
        var res = await (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v2.Id, TripId: b.Id, Date: today.AddDays(3))))
            .ReadAsync<PlanningAssignResultDto>();
        res.Created.Should().BeFalse();
        res.ConflictsWith.Should().BeEmpty();
        var moved = await (await c.GetAsync($"/api/trips/{b.Id}")).ReadAsync<TripDto>();
        moved.VehicleId.Should().Be(v2.Id);
        moved.DriverId.Should().Be(veli.Id);
        moved.LoadingDate.Should().Be(today.AddDays(3));
        moved.TrailerPlate.Should().Be($"34 DR {u[..4]}");
        var events = await (await c.GetAsync($"/api/trips/{b.Id}/events")).ReadAsync<List<TripEventDto>>();
        events.Should().Contain(e => e.Note!.StartsWith(TripService.AssignedNote) && e.Note.Contains(v2.Plate) && e.Note.Contains(veli.FullName)
            && e.Note.Contains(today.AddDays(3).ToString("dd.MM.yyyy")));

        // Teslim tarihi olan sevkiyat taşınınca süresi korunur; aynı güne başka araçla çakışırsa uyarı döner.
        var res2 = await (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v2.Id, TripId: a.Id, Date: today.AddDays(2))))
            .ReadAsync<PlanningAssignResultDto>();
        res2.ConflictsWith.Should().Equal(b.Id);
        var movedA = await (await c.GetAsync($"/api/trips/{a.Id}")).ReadAsync<TripDto>();
        (movedA.LoadingDate, movedA.DeliveryDate).Should().Be((today.AddDays(2), today.AddDays(4)));

        // İş talebi şoförsüz araca bırakılırsa şoför istenir; şoför seçilince sevkiyat açılır, talep "sevk edildi" olur.
        (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v3.Id, JobRequestId: request.Id)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var res3 = await (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v3.Id, JobRequestId: request.Id, Date: today.AddDays(4),
            DriverId: ali.Id))).ReadAsync<PlanningAssignResultDto>();
        res3.Created.Should().BeTrue();
        var fromRequest = await (await c.GetAsync($"/api/trips/{res3.TripId}")).ReadAsync<TripDto>();
        (fromRequest.VehicleId, fromRequest.DriverId, fromRequest.LoadingDate, fromRequest.SalePrice, fromRequest.VehicleCost, fromRequest.JobRequestId)
            .Should().Be((v3.Id, ali.Id, today.AddDays(4), 25_000m, 17_000m, (int?)request.Id));
        (await (await c.GetAsync($"/api/job-requests/{request.Id}")).ReadAsync<JobRequestDto>()).Status.Should().Be(JobRequestStatus.Converted);
        (await (await c.GetAsync($"/api/trips/{res3.TripId}/events")).ReadAsync<List<TripEventDto>>())
            .Should().Contain(e => e.Note != null && e.Note.StartsWith(TripService.AssignedNote));
        var after = await (await c.GetAsync("/api/planning")).ReadAsync<PlanningDto>();
        after.Unassigned.Should().NotContain(r => r.Id == request.Id);

        // Yüklenmiş sevkiyat panodan taşınamaz; ikisi birden ya da hiçbiri verilmezse hata.
        (await c.PostJsonAsync($"/api/trips/{touching.Id}/status", new TripStatusRequest(TripStatus.Loaded))).EnsureSuccessStatusCode();
        (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v3.Id, TripId: touching.Id)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v3.Id)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Yetki: muhasebe görür ama atayamaz (Sevkiyatlar ile aynı).
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Plan Muhasebe", $"acc-plan-{u}@test.local", UserRole.Accounting, true, "Sifre1234")))
            .ReadAsync<UserDto>();
        var acc = await factory.LoginAsync($"acc-plan-{u}@test.local", "Sifre1234");
        (await acc.GetAsync("/api/planning")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await acc.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v1.Id, TripId: outside.Id)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Planning_board_flags_driver_double_booking_and_expiring_documents()
    {
        var c = await factory.LoginAsync();
        var u = Random.Shared.Next(100_000, 999_999).ToString();
        var today = Today;
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Plan Belge {u}", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        // SRC belgesi 2 gün sonra bitiyor; araç muayenesi dün bitti.
        var hasan = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Plan Hasan {u}", null, null, null, null, today.AddDays(2), null, true)))
            .ReadAsync<DriverDto>();
        var v1 = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 PD {u[..4]}", "Tır", null, null, null, 0, null, null,
            today.AddDays(-1), null, VehicleStatus.Available, hasan.Id))).ReadAsync<VehicleDto>();
        var v2 = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 PE {u[..4]}", "Kamyon", null, null, null, 0, null, null,
            null, null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();
        async Task<TripDto> Trip(int vehicleId, DateOnly loading, DateOnly? delivery) =>
            await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicleId, hasan.Id, "Tuzla", "Gebze",
                loading, delivery, null, 1_000, 2_000))).ReadAsync<TripDto>();
        var a = await Trip(v1.Id, today.AddDays(1), today.AddDays(3));   // v1, +1 → +3
        var b = await Trip(v2.Id, today.AddDays(2), null);               // v2, aynı şoför +2: şoför çakışması
        var c3 = await Trip(v2.Id, today.AddDays(5), null);              // v2, +5: çakışma yok

        var board = await (await c.GetAsync("/api/planning")).ReadAsync<PlanningDto>();
        var mine = board.Trips.Where(t => t.Customer == customer.Title).ToDictionary(t => t.Id);
        mine[a.Id].DriverConflict.Should().BeTrue();
        mine[b.Id].DriverConflict.Should().BeTrue();
        mine[c3.Id].DriverConflict.Should().BeFalse();
        mine[a.Id].Conflict.Should().BeFalse();
        board.DriverConflictCount.Should().BeGreaterThanOrEqualTo(2);

        // a: muayene dolmuş (v1) + SRC sevkiyat bitmeden doluyor; b: yalnız SRC; c3 de SRC (bitişten sonra yükleniyor).
        mine[a.Id].Warnings.Should().HaveCount(2);
        mine[a.Id].Warnings![0].Should().Contain(v1.Plate).And.Contain("Araç muayenesi").And.Contain(today.AddDays(-1).ToString("dd.MM.yyyy"));
        mine[a.Id].Warnings![1].Should().Contain(hasan.FullName).And.Contain("SRC belgesi");
        mine[b.Id].Warnings.Should().ContainSingle().Which.Should().Contain("SRC belgesi");
        mine[c3.Id].Warnings.Should().ContainSingle();
        board.Vehicles.Single(v => v.Id == v1.Id).Documents.Should().ContainSingle(d => d.What == "Araç muayenesi");
        board.Vehicles.Single(v => v.Id == v2.Id).Documents.Should().BeEmpty();
        board.Drivers!.Single(d => d.Id == hasan.Id).Documents.Should().ContainSingle(d => d.What == "SRC belgesi" && d.Expiry == today.AddDays(2));

        // Atama sonucu şoför çakışmasını ve belge uyarısını döndürür (atama yine yapılır).
        var res = await (await c.PostJsonAsync("/api/planning/assign", new PlanningAssignRequest(v2.Id, TripId: c3.Id, Date: today.AddDays(2))))
            .ReadAsync<PlanningAssignResultDto>();
        res.ConflictsWith.Should().Equal(b.Id);
        res.DriverConflictsWith.Should().Equal(a.Id);
        res.Warnings.Should().ContainSingle().Which.Should().Contain("SRC belgesi");
    }

    [Fact]
    public void Conflicts_ignore_same_day_handover()
    {
        var d = new DateOnly(2026, 10, 10);
        var map = PlanningService.Conflicts([(1, 7, d, d.AddDays(2)), (2, 7, d.AddDays(2), d.AddDays(2)), (3, 7, d.AddDays(1), d.AddDays(1)),
            (4, 8, d, d), (5, 8, d, d.AddDays(1))]);
        map.Keys.Should().BeEquivalentTo([1, 3, 4, 5]);
        map[1].Should().Equal(3);

        // Şoför: farklı araçlarda üst üste binen sevkiyatlar; aynı araçtakiler şoför çakışması sayılmaz.
        var dmap = PlanningService.DriverConflicts([(1, 7, 99, d, d.AddDays(2)), (2, 8, 99, d.AddDays(1), d.AddDays(1)),
            (3, 7, 99, d.AddDays(1), d.AddDays(1)), (4, 9, 99, d.AddDays(2), d.AddDays(2))]);
        dmap.Keys.Should().BeEquivalentTo([1, 2, 3]);
        dmap[1].Should().Equal(2);
        dmap[3].Should().Equal(2);
    }
}
