using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Faz 1: taşıma şekli, dorse/kasa tipi, iptal/sorun nedeni; sevkiyat şablonları; durum zaman çizelgesi.</summary>
public class TripOpsAndTemplateTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    private async Task<(HttpClient C, int Customer, int Vehicle, int Driver)> SetupAsync(string tag)
    {
        var c = await factory.LoginAsync();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Faz1 {tag} Müşteri", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Faz1 {tag} Şoför", null, null, null, null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 FZ {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        return (c, customer.Id, vehicle.Id, driver.Id);
    }

    [Fact]
    public async Task Ops_fields_are_saved_filtered_suggested_and_kept_when_client_omits_them()
    {
        var (c, cust, veh, drv) = await SetupAsync("ops");
        var ops = new TripOps("Komple (FTL)", "Tenteli", null, null);
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(cust, veh, drv, "Tuzla", "Bornova", Today, null, null, 1_000, 2_000,
            LoadingCity: "İstanbul", DeliveryCity: "İzmir", Ops: ops))).ReadAsync<TripDto>();
        trip.Ops!.TransportMode.Should().Be("Komple (FTL)");
        trip.Ops.TrailerType.Should().Be("Tenteli");
        trip.Ops.ProblemReason.Should().BeNull();

        // Eski istemci (Ops göndermeyen) kaydederse alanlar silinmez.
        trip = await (await c.PutJsonAsync($"/api/trips/{trip.Id}", new TripSaveRequest(cust, veh, drv, "Tuzla", "Bornova", Today, null, "not", 1_000, 2_000,
            LoadingCity: "İstanbul", DeliveryCity: "İzmir"))).ReadAsync<TripDto>();
        trip.Ops!.TransportMode.Should().Be("Komple (FTL)");
        trip.Ops.TrailerType.Should().Be("Tenteli");

        // Süzgeç: büyük/küçük harf farkı gözetmez; sorunsuz sefer "sorunlu" süzgecinde yok.
        var byMode = await (await c.GetAsync($"/api/trips?customerId={cust}&transportMode={Uri.EscapeDataString("komple (ftl)")}")).ReadAsync<PagedResult<TripDto>>();
        byMode.Items.Should().ContainSingle(t => t.Id == trip.Id);
        var byTrailer = await (await c.GetAsync($"/api/trips?customerId={cust}&trailerType=Frigorifik")).ReadAsync<PagedResult<TripDto>>();
        byTrailer.Items.Should().BeEmpty();
        var problems = await (await c.GetAsync($"/api/trips?customerId={cust}&hasProblem=true")).ReadAsync<PagedResult<TripDto>>();
        problems.Items.Should().BeEmpty();

        // Akıllı alan: firmanın kullandığı değerler sayılır.
        var modes = await (await c.GetAsync("/api/options/transportMode")).ReadAsync<List<OptionUsageDto>>();
        modes.Should().Contain(o => o.Value == "Komple (FTL)" && o.Count >= 1);
        (await c.GetAsync("/api/options/trailerType")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await c.GetAsync("/api/options/tripProblemReason")).StatusCode.Should().Be(HttpStatusCode.OK);

        // Çok uzun değer reddedilir.
        (await c.PutJsonAsync($"/api/trips/{trip.Id}", new TripSaveRequest(cust, veh, drv, "Tuzla", "Bornova", Today, null, null, 1_000, 2_000,
            Ops: new TripOps(new string('x', 61))))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Timeline_starts_with_creation_and_records_status_changes_and_problem_reason_with_user()
    {
        var (c, cust, veh, drv) = await SetupAsync("timeline");
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(cust, veh, drv, "Gebze", "Konya", Today, null, null, 1_000, 2_000)))
            .ReadAsync<TripDto>();

        var events = await (await c.GetAsync($"/api/trips/{trip.Id}/events")).ReadAsync<List<TripEventDto>>();
        events.Should().ContainSingle();
        events[0].Kind.Should().Be("created");
        events[0].Note.Should().Be("Kayıt oluşturuldu");
        events[0].UserName.Should().NotBeNullOrEmpty();

        // Sorun bildirimi (durum değişmeden): neden + açıklama çizelgeye düşer, "sorunlu" süzgecinde görünür.
        trip = await (await c.PutJsonAsync($"/api/trips/{trip.Id}", new TripSaveRequest(cust, veh, drv, "Gebze", "Konya", Today, null, null, 1_000, 2_000,
            Ops: new TripOps("Parsiyel (LTL)", null, "Yük hazır değil", "Müşteri yarın dedi")))).ReadAsync<TripDto>();
        trip.Ops!.ProblemReason.Should().Be("Yük hazır değil");
        trip.Ops.ProblemNote.Should().Be("Müşteri yarın dedi");
        var problems = await (await c.GetAsync($"/api/trips?customerId={cust}&hasProblem=true")).ReadAsync<PagedResult<TripDto>>();
        problems.Items.Should().ContainSingle(t => t.Id == trip.Id);

        // Aynı nedenle tekrar kaydetmek yeni olay yazmaz.
        await c.PutJsonAsync($"/api/trips/{trip.Id}", new TripSaveRequest(cust, veh, drv, "Gebze", "Konya", Today, null, "x", 1_000, 2_000,
            Ops: new TripOps("Parsiyel (LTL)", null, "Yük hazır değil", "Müşteri yarın dedi")));

        // Yüklendi, sonra neden yazılarak iptal.
        (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Loaded))).EnsureSuccessStatusCode();
        trip = await (await c.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Cancelled, ProblemReason: "Müşteri iptal etti")))
            .ReadAsync<TripDto>();
        trip.Status.Should().Be(TripStatus.Cancelled);
        trip.Ops!.ProblemReason.Should().Be("Müşteri iptal etti");

        events = await (await c.GetAsync($"/api/trips/{trip.Id}/events")).ReadAsync<List<TripEventDto>>();
        events.Select(e => e.Kind).Should().Equal("created", "problem", "status", "status");
        events[1].Note.Should().Contain("Yük hazır değil").And.Contain("Müşteri yarın dedi");
        events[2].Status.Should().Be(TripStatus.Loaded);
        events[3].Status.Should().Be(TripStatus.Cancelled);
        events[3].Note.Should().Be("Neden: Müşteri iptal etti");
        events.Should().OnlyContain(e => e.UserName != null);
        events.Select(e => e.OccurredAt).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task Template_is_saved_from_trip_without_dates_or_documents_listed_used_and_deleted()
    {
        var (c, cust, veh, drv) = await SetupAsync("şablon");
        var trip = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(cust, veh, drv, "Tuzla OSB", "Kemalpaşa", Today, Today.AddDays(1),
            "Rampa 3", 4_000, 7_500, CargoType: "Mobilya", CargoQuantity: 33, CargoUnit: "palet", LoadingCity: "İstanbul", DeliveryCity: "İzmir",
            Terms: new TripTerms(DeliveryDocumentNo: "TE-55", WaybillNo: "IRS-1"), Ops: new TripOps("Komple (FTL)", "Tenteli")))).ReadAsync<TripDto>();

        var tpl = await (await c.PostJsonAsync("/api/trip-templates", new TripTemplateSaveRequest(TripId: trip.Id))).ReadAsync<TripTemplateDto>();
        tpl.Name.Should().Be("Faz1 şablon Müşteri · İstanbul → İzmir");
        tpl.CustomerId.Should().Be(cust);
        tpl.VehicleId.Should().Be(veh);
        tpl.DriverId.Should().Be(drv);
        tpl.LoadingAddress.Should().Be("Tuzla OSB");
        tpl.CargoQuantity.Should().Be(33);
        tpl.TransportMode.Should().Be("Komple (FTL)");
        tpl.TrailerType.Should().Be("Tenteli");
        tpl.SalePrice.Should().Be(7_500);
        tpl.UseCount.Should().Be(0);

        // Elle şablon: ad verilir; ne müşteri ne güzergâh varsa reddedilir.
        var manual = await (await c.PostJsonAsync("/api/trip-templates", new TripTemplateSaveRequest("Haftalık Konya", CustomerId: cust,
            LoadingAddress: "Gebze", DeliveryAddress: "Konya OSB", DeliveryCity: "Konya"))).ReadAsync<TripTemplateDto>();
        manual.Name.Should().Be("Haftalık Konya");
        (await c.PostJsonAsync("/api/trip-templates", new TripTemplateSaveRequest("Boş"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/trip-templates", new TripTemplateSaveRequest(LoadingCity: "Atlantis", LoadingAddress: "x")))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var used = await (await c.PostAsync($"/api/trip-templates/{tpl.Id}/use", null)).ReadAsync<TripTemplateDto>();
        used.UseCount.Should().Be(1);
        used.LastUsedAt.Should().NotBeNull();

        var list = await (await c.GetAsync($"/api/trip-templates?customerId={cust}")).ReadAsync<List<TripTemplateDto>>();
        list.Select(t => t.Id).Should().Equal(tpl.Id, manual.Id); // sık kullanılan önce

        (await c.PutJsonAsync($"/api/trip-templates/{manual.Id}", new { name = "Konya her Salı" })).EnsureSuccessStatusCode();
        (await (await c.GetAsync($"/api/trip-templates/{manual.Id}")).ReadAsync<TripTemplateDto>()).Name.Should().Be("Konya her Salı");

        (await c.DeleteAsync($"/api/trip-templates/{manual.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await c.GetAsync($"/api/trip-templates/{manual.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Şablondan açılan sevkiyat normal kayıtla oluşur; şablon değerleri taşınır.
        var fromTpl = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(tpl.CustomerId!.Value, tpl.VehicleId!.Value, tpl.DriverId!.Value,
            tpl.LoadingAddress, tpl.DeliveryAddress, Today.AddDays(7), null, null, tpl.VehicleCost!.Value, tpl.SalePrice!.Value,
            LoadingCity: tpl.LoadingCity, DeliveryCity: tpl.DeliveryCity, Ops: new TripOps(tpl.TransportMode, tpl.TrailerType)))).ReadAsync<TripDto>();
        fromTpl.Terms!.DeliveryDocumentNo.Should().BeNull();
        fromTpl.Ops!.TransportMode.Should().Be("Komple (FTL)");
    }

    [Fact]
    public async Task Templates_need_operations_role_to_write()
    {
        var anon = factory.CreateClient();
        (await anon.GetAsync("/api/trip-templates")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
