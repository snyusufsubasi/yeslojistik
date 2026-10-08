using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>
/// "Bugün" ekranı (GET /api/today): geciken, bugün yüklenecek/teslim edilecek, sorunlu, teslim evrakı eksik, faturalanmayı bekleyen
/// sevkiyatlar; vadesi gelen tahsilatlar; süresi dolan belgeler. Kartın sayısı ile Sevkiyatlar listesindeki <c>agenda</c> süzgeci aynıdır.
/// </summary>
public class TodayTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul")));

    [Fact]
    public async Task Today_lists_exceptions_and_matches_trip_filters()
    {
        var c = await factory.LoginAsync();
        var u = Random.Shared.Next(100_000, 999_999).ToString();
        var today = Today;
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Bugün Müşteri {u}", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Bugün Şoför {u}", null, null, null, null,
            today.AddDays(10), null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 BG {u[..4]}", "Tır", null, null, null, 0,
            null, null, today.AddDays(-2), null, VehicleStatus.Available, null))).ReadAsync<VehicleDto>();

        async Task<TripDto> Trip(DateOnly loading, DateOnly? delivery, TripOps? ops = null) =>
            await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Tuzla OSB", "Gebze depo",
                loading, delivery, null, 1_000, 2_000, LoadingCity: "İstanbul", DeliveryCity: "Kocaeli", Ops: ops))).ReadAsync<TripDto>();
        async Task Advance(int id, params TripStatus[] steps)
        {
            foreach (var s in steps)
                (await c.PostJsonAsync($"/api/trips/{id}/status", new TripStatusRequest(s, ReceivedBy: s == TripStatus.Delivered ? "Depo" : null)))
                    .EnsureSuccessStatusCode();
        }

        var late = await Trip(today.AddDays(-3), null);                         // yüklenmesi gerekirdi
        var loading = await Trip(today, null);                                  // bugün yüklenecek
        var delivery = await Trip(today.AddDays(-1), today);                    // yolda, bugün teslim
        await Advance(delivery.Id, TripStatus.Loaded, TripStatus.OnRoad);
        var delivered = await Trip(today.AddDays(-2), today.AddDays(-1));       // teslim edildi: evrak yok, fatura yok
        await Advance(delivered.Id, TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered);
        var problem = await Trip(today.AddDays(2), null, new TripOps(ProblemReason: "Araç arızası"));
        // Faturalanmış ve vadesi 10 gün geçmiş sefer: tahsilat kartına düşer.
        var billed = await Trip(today.AddDays(-40), today.AddDays(-39));
        await Advance(billed.Id, TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered);
        var invoice = await (await c.PostJsonAsync("/api/invoices", new InvoiceCreateRequest(customer.Id, today.AddDays(-40), today.AddDays(-10), 20, 0,
            null, false, [billed.Id], null))).ReadAsync<InvoiceDto>();

        var dto = await (await c.GetAsync("/api/today")).ReadAsync<TodayDto>();
        dto.Date.Should().Be(today);
        TodaySectionDto S(string key) => dto.Sections.Single(s => s.Key == key);
        List<string> Links(string key) => S(key).Items.Select(i => i.Link).ToList();

        S("late").Count.Should().Be(1);
        Links("late").Should().Equal($"/seferler?id={late.Id}");
        S("late").Items[0].Tone.Should().Be("danger");
        S("late").Items[0].Badge.Should().Be("Yükleme 3 gün gecikti");
        S("late").Link.Should().Be("/seferler?bugun=late");
        Links("loading").Should().Equal($"/seferler?id={loading.Id}");
        Links("delivery").Should().Equal($"/seferler?id={delivery.Id}");
        Links("problem").Should().Equal($"/seferler?id={problem.Id}");
        S("problem").Items[0].Badge.Should().Be("Araç arızası");
        // Teslim evrakı: iki teslim edilmiş seferin ikisinde de evrak yok.
        Links("document").Should().BeEquivalentTo([$"/seferler?id={delivered.Id}", $"/seferler?id={billed.Id}"]);
        S("invoice").Count.Should().Be(1);
        S("invoice").Total.Should().Be(2_000);
        Links("invoice").Should().Equal($"/seferler?id={delivered.Id}");

        var collections = S("collections");
        collections.Count.Should().Be(1);
        collections.Items[0].Link.Should().Be($"/faturalar?id={invoice.Id}");
        collections.Items[0].Amount.Should().Be(invoice.Total);
        collections.Items[0].Badge.Should().Be("Vadesi 10 gün geçti");

        var docs = S("documents");
        docs.Items.Should().Contain(i => i.Link == $"/araclar?id={vehicle.Id}" && i.Subtitle == "Araç muayenesi" && i.Tone == "danger");
        docs.Items.Should().Contain(i => i.Link == $"/soforler?id={driver.Id}" && i.Subtitle == "SRC belgesi" && i.Badge == "10 gün kaldı");

        // Kartın "Tümünü gör" listesi aynı süzgeç: /api/trips?agenda=...
        async Task<List<int>> Agenda(string a) =>
            (await (await c.GetAsync($"/api/trips?customerId={customer.Id}&agenda={a}")).ReadAsync<PagedResult<TripDto>>()).Items.Select(t => t.Id).ToList();
        (await Agenda("late")).Should().Equal(late.Id);
        (await Agenda("loading")).Should().Equal(loading.Id);
        (await Agenda("delivery")).Should().Equal(delivery.Id);
        (await Agenda("problem")).Should().Equal(problem.Id);
        (await Agenda("invoice")).Should().Equal(delivered.Id);
        (await Agenda("document")).Should().BeEquivalentTo([delivered.Id, billed.Id]);

        // Teslim evrak no girilince evrak kartından düşer.
        var full = await (await c.GetAsync($"/api/trips/{delivered.Id}")).ReadAsync<TripDto>();
        (await c.PutJsonAsync($"/api/trips/{delivered.Id}", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, full.LoadingAddress,
            full.DeliveryAddress, full.LoadingDate, full.DeliveryDate, null, 1_000, 2_000, LoadingCity: "İstanbul", DeliveryCity: "Kocaeli",
            Terms: new TripTerms(DeliveryDocumentNo: $"TE-{u}")))).EnsureSuccessStatusCode();
        (await Agenda("document")).Should().Equal(billed.Id);

        // Operasyon kullanıcısı tahsilat kartını görmez.
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Bugün Ops", $"ops-today-{u}@test.local", UserRole.Operations, true, "Sifre1234")))
            .ReadAsync<UserDto>();
        var ops = await factory.LoginAsync($"ops-today-{u}@test.local", "Sifre1234");
        var opsDto = await (await ops.GetAsync("/api/today")).ReadAsync<TodayDto>();
        opsDto.Sections.Should().NotContain(s => s.Key == "collections");
        opsDto.Sections.Single(s => s.Key == "late").Count.Should().Be(1);
    }
}
