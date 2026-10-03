using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class DriverAppTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1];

    private record Setup(HttpClient Admin, HttpClient Driver, int CustomerId, int VehicleId, int DriverId, int OtherDriverId, int TripId);

    private async Task<Setup> SetupAsync(string suffix)
    {
        var admin = await factory.LoginAsync();
        var customer = await (await admin.PostJsonAsync("/api/customers", new CustomerSaveRequest($"Şoför Testi {suffix}", null, null, "02165554433", null, null, null))).ReadAsync<CustomerSummaryDto>();
        var driver = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Şoför {suffix}", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var other = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest($"Diğer {suffix}", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await admin.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"35 DR {suffix}", "Kamyon", null, null, null, 0, null, null, null, null, VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var trip = await (await admin.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id, "İstanbul", "İzmir", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        // Başka şoföre ait sefer: görünmemeli.
        await (await admin.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Customer.Id, vehicle.Id, other.Id, "Bursa", "Ankara", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();

        var email = $"sofor{suffix}@test.local";
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest($"Şoför {suffix}", email, UserRole.Driver, true, "Sofor1234", driver.Id))).ReadAsync<UserDto>();

        var mobile = factory.CreateClient();
        var login = await (await mobile.PostAsJsonAsync("/api/auth/token", new { email, password = "Sofor1234" })).ReadAsync<TokenLoginResponse>();
        login.User.Role.Should().Be(UserRole.Driver);
        mobile.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        return new Setup(admin, mobile, customer.Customer.Id, vehicle.Id, driver.Id, other.Id, trip.Id);
    }

    [Fact]
    public async Task Driver_sees_only_own_trips_and_no_prices()
    {
        var s = await SetupAsync("101");
        var trips = await (await s.Driver.GetAsync("/api/driver/trips")).ReadAsync<List<DriverTripDto>>();
        trips.Should().ContainSingle().Which.Id.Should().Be(s.TripId);
        var raw = await (await s.Driver.GetAsync($"/api/driver/trips/{s.TripId}")).Content.ReadAsStringAsync();
        raw.Should().NotContain("salePrice").And.NotContain("vehicleCost");

        var me = await (await s.Driver.GetAsync("/api/driver/me")).ReadAsync<DriverProfileDtoView>();
        me.VehiclePlate.Should().Be("35 DR 101");
    }

    private record DriverProfileDtoView(int DriverId, string FullName, string? VehiclePlate);

    [Fact]
    public async Task Driver_cannot_access_office_endpoints()
    {
        var s = await SetupAsync("102");
        foreach (var url in new[] { "/api/customers", "/api/trips", "/api/invoices", "/api/dashboard" })
            (await s.Driver.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.Forbidden, url);
        (await s.Admin.GetAsync("/api/driver/trips")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Driver_advances_status_but_cannot_cancel()
    {
        var s = await SetupAsync("103");
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Cancelled)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var t = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<DriverTripDto>();
        t.Status.Should().Be(TripStatus.Loaded);
        t.NextStatuses.Should().Equal(TripStatus.OnRoad);
        (await (await s.Admin.GetAsync($"/api/vehicles/{s.VehicleId}")).ReadAsync<VehicleDto>()).Status.Should().Be(VehicleStatus.OnRoad);

        // Teslimden sonra şoför geri alamaz.
        await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.OnRoad))).ReadAsync<DriverTripDto>();
        var delivered = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Delivered))).ReadAsync<DriverTripDto>();
        delivered.NextStatuses.Should().BeEmpty();
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.OnRoad)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var others = await (await s.Admin.GetAsync($"/api/trips?driverId={s.OtherDriverId}")).ReadAsync<PagedResult<TripDto>>();
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{others.Items[0].Id}/status", new TripStatusRequest(TripStatus.Loaded)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Location_pings_update_vehicle_and_route()
    {
        var s = await SetupAsync("104");
        await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<DriverTripDto>();
        var pings = new[]
        {
            new LocationPing(41.00, 29.00, 60, null, 10, DateTime.UtcNow.AddMinutes(-2)),
            new LocationPing(40.90, 28.90, 80, null, 10, DateTime.UtcNow.AddMinutes(-1)),
        };
        (await s.Driver.PostJsonAsync("/api/driver/location", pings)).StatusCode.Should().Be(HttpStatusCode.OK);

        var route = await (await s.Admin.GetAsync($"/api/trips/{s.TripId}/route")).ReadAsync<List<RoutePointDto>>();
        route.Should().HaveCount(2);
        var vehicles = await (await s.Admin.GetAsync("/api/tracking/vehicles")).ReadAsync<List<VehicleLocationDto>>();
        var v = vehicles.Single(x => x.VehicleId == s.VehicleId);
        v.Latitude.Should().Be(40.90);
        v.ActiveTripId.Should().Be(s.TripId);

        (await s.Driver.PostJsonAsync("/api/driver/location", new[] { new LocationPing(123, 0, null, null, null, null) }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Pings_go_to_the_newest_on_road_trip_when_driver_has_several()
    {
        var s = await SetupAsync("107");
        var second = await (await s.Admin.PostJsonAsync("/api/trips", new TripSaveRequest(s.CustomerId, s.VehicleId, s.DriverId,
            "Ankara", "Konya", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        foreach (var id in new[] { s.TripId, second.Id })
            foreach (var st in new[] { TripStatus.Loaded, TripStatus.OnRoad })
                (await s.Admin.PostJsonAsync($"/api/trips/{id}/status", new TripStatusRequest(st))).EnsureSuccessStatusCode();

        (await s.Driver.PostJsonAsync("/api/driver/location", new[] { new LocationPing(39.9, 32.8, 50, null, null, null) })).EnsureSuccessStatusCode();
        (await (await s.Admin.GetAsync($"/api/trips/{second.Id}/route")).ReadAsync<List<RoutePointDto>>()).Should().HaveCount(1);
        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}/route")).ReadAsync<List<RoutePointDto>>()).Should().BeEmpty();
        var v = (await (await s.Admin.GetAsync("/api/tracking/vehicles")).ReadAsync<List<VehicleLocationDto>>()).Single(x => x.VehicleId == s.VehicleId);
        v.ActiveTripId.Should().Be(second.Id);
    }

    [Fact]
    public async Task Driver_uploads_photo_and_office_can_download_it()
    {
        var s = await SetupAsync("105");
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Jpeg) { Headers = { ContentType = new MediaTypeHeaderValue("image/jpeg") } }, "file", "teslim.jpg");
        form.Add(new StringContent("Photo"), "kind");
        form.Add(new StringContent("Kapıya teslim"), "note");
        var dto = await (await s.Driver.PostAsync($"/api/driver/trips/{s.TripId}/attachments", form)).ReadAsync<AttachmentDto>();
        dto.ContentType.Should().Be("image/jpeg");

        var list = await (await s.Admin.GetAsync($"/api/trips/{s.TripId}/attachments")).ReadAsync<List<AttachmentDto>>();
        list.Should().ContainSingle(a => a.Note == "Kapıya teslim");
        var file = await s.Admin.GetAsync($"/api/attachments/{dto.Id}");
        (await file.Content.ReadAsByteArrayAsync()).Should().Equal(Jpeg);

        using var bad = new MultipartFormDataContent();
        bad.Add(new ByteArrayContent("<script>"u8.ToArray()), "file", "x.jpg");
        (await s.Driver.PostAsync($"/api/driver/trips/{s.TripId}/attachments", bad)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Public_tracking_link_hides_sensitive_data()
    {
        var s = await SetupAsync("106");
        var link = await (await s.Admin.PostAsync($"/api/trips/{s.TripId}/tracking-link", null)).ReadAsync<TrackingLinkDto>();
        link.Url.Should().EndWith($"/takip/{link.Token}");
        (await (await s.Admin.PostAsync($"/api/trips/{s.TripId}/tracking-link", null)).ReadAsync<TrackingLinkDto>()).Token.Should().Be(link.Token);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync($"/api/public/track/{link.Token}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var raw = await res.Content.ReadAsStringAsync();
        raw.Should().Contain("35 DR ***").And.NotContain("salePrice").And.NotContain("2000");
        var dto = await res.ReadAsync<PublicTrackingDto>();
        dto.Latitude.Should().BeNull("sefer henüz yola çıkmadı");

        (await anon.GetAsync("/api/public/track/yok-boyle-bir-link")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await s.Admin.PostJsonAsync($"/api/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Cancelled))).EnsureSuccessStatusCode();
        (await anon.GetAsync($"/api/public/track/{link.Token}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Driver_gets_push_notifications_for_assignment_and_cancel()
    {
        var s = await SetupAsync("108");
        (await s.Driver.PostJsonAsync("/api/driver/push-token", new PushTokenRequest("gecersiz", "android")))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await s.Driver.PostJsonAsync("/api/driver/push-token", new PushTokenRequest("ExponentPushToken[sofor108]", "android")))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await s.Driver.PostJsonAsync("/api/driver/push-token", new PushTokenRequest("ExponentPushToken[silinmis108]", "ios")))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);

        var trip = await (await s.Admin.PostJsonAsync("/api/trips", new TripSaveRequest(s.CustomerId, s.VehicleId, s.DriverId,
            "Gebze", "Manisa", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        factory.Push.Sent.Should().Contain(m => m.Token == "ExponentPushToken[sofor108]" && m.Title == "Yeni sefer atandı"
            && m.Body.Contains("Gebze → Manisa") && m.Data!["tripId"] == trip.Id.ToString());

        // Silinmiş uygulamanın token'ı temizlenir; iptal bildirimi yalnızca geçerli telefona gider.
        (await s.Admin.PostJsonAsync($"/api/trips/{trip.Id}/status", new TripStatusRequest(TripStatus.Cancelled))).EnsureSuccessStatusCode();
        factory.Push.Sent.Where(m => m.Title == "Sefer iptal edildi").Select(m => m.Token).Should().Equal("ExponentPushToken[sofor108]");

        // Başka şoföre aktarma: diğer şoförün hesabı yok, eski şoföre bilgi gider.
        var t2 = await (await s.Admin.PostJsonAsync("/api/trips", new TripSaveRequest(s.CustomerId, s.VehicleId, s.DriverId,
            "Tuzla", "Sakarya", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        await (await s.Admin.PutJsonAsync($"/api/trips/{t2.Id}", new TripSaveRequest(s.CustomerId, s.VehicleId, s.OtherDriverId,
            "Tuzla", "Sakarya", Today, null, null, 1000, 2000))).ReadAsync<TripDto>();
        factory.Push.Sent.Should().Contain(m => m.Title == "Sefer başka şoföre aktarıldı" && m.Body.Contains("Tuzla → Sakarya"));

        (await s.Driver.DeleteAsync("/api/driver/push-token?token=ExponentPushToken%5Bsofor108%5D")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Mobile_refresh_token_rotates()
    {
        var admin = await factory.LoginAsync();
        var c = factory.CreateClient();
        var login = await (await c.PostAsJsonAsync("/api/auth/token", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword })).ReadAsync<TokenLoginResponse>();
        var refreshed = await (await c.PostAsJsonAsync("/api/auth/token/refresh", new { refreshToken = login.RefreshToken })).ReadAsync<TokenLoginResponse>();
        refreshed.RefreshToken.Should().NotBe(login.RefreshToken);
        // Çıkış (revoke) sonrası token tolerans olmadan geçersizdir.
        (await c.PostAsJsonAsync("/api/auth/token/revoke", new { refreshToken = refreshed.RefreshToken })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await c.PostAsJsonAsync("/api/auth/token/refresh", new { refreshToken = refreshed.RefreshToken })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        admin.Dispose();
    }

    [Fact]
    public async Task Driver_records_fuel_and_toll_on_own_trip_only()
    {
        var s = await SetupAsync("109");
        var fuel = await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses",
            new DriverExpenseRequest(ExpenseCategory.Fuel, 8_900, 200, 12_345, null))).ReadAsync<DriverExpenseDto>();
        fuel.Should().BeEquivalentTo(new { Category = ExpenseCategory.Fuel, Amount = 8_900m, Liters = 200m, Odometer = 12_345, Description = "Şoför girişi" });
        await (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses",
            new DriverExpenseRequest(ExpenseCategory.Toll, 450, null, null, "Osmangazi Köprüsü"))).ReadAsync<DriverExpenseDto>();

        // Avans şoför tarafından girilemez; başka şoförün seferine masraf yazılamaz.
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses",
            new DriverExpenseRequest(ExpenseCategory.DriverAdvance, 1_000, null, null, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var others = await (await s.Admin.GetAsync($"/api/trips?search=Ankara")).ReadAsync<PagedResult<TripDto>>();
        var otherTrip = others.Items.First(t => t.DriverId == s.OtherDriverId);
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{otherTrip.Id}/expenses",
            new DriverExpenseRequest(ExpenseCategory.Fuel, 100, 2, null, null))).StatusCode.Should().Be(HttpStatusCode.NotFound);

        var list = await (await s.Driver.GetAsync($"/api/driver/trips/{s.TripId}/expenses")).ReadAsync<List<DriverExpenseDto>>();
        list.Select(e => e.Category).Should().Equal(ExpenseCategory.Toll, ExpenseCategory.Fuel);

        // Ofiste: sefere, araca ve şoföre bağlı görünür; araç km'si güncellenir, sefer kârından düşer.
        var office = await (await s.Admin.GetAsync($"/api/expenses?tripId={s.TripId}")).ReadAsync<PagedResult<ExpenseDto>>();
        office.Items.Should().OnlyContain(e => e.VehicleId == s.VehicleId && e.DriverId == s.DriverId);
        (await (await s.Admin.GetAsync($"/api/vehicles/{s.VehicleId}")).ReadAsync<VehicleDto>()).Km.Should().Be(12_345);
        // Onay bekleyen masraf kâra girmez; onaylanınca düşer.
        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}")).ReadAsync<TripDto>()).Profit.Should().Be(2_000 - 1_000);
        foreach (var e in office.Items) (await s.Admin.PostAsync($"/api/expenses/{e.Id}/approve", null)).EnsureSuccessStatusCode();
        // Giderler kârdan KDV hariç düşer (yakıt ve otoyol %20): 8.900 → 7.416,67; 450 → 375.
        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}")).ReadAsync<TripDto>()).Profit.Should().Be(2_000 - 1_000 - 7_416.67m - 375);
    }

    [Fact]
    public async Task Offline_queue_retries_do_not_duplicate()
    {
        var s = await SetupAsync("110");
        var key = Guid.NewGuid();
        async Task<HttpResponseMessage> Post()
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/driver/trips/{s.TripId}/expenses")
            { Content = JsonContent.Create(new DriverExpenseRequest(ExpenseCategory.Toll, 300, null, null, "Köprü")) };
            req.Headers.Add("Idempotency-Key", key.ToString());
            return await s.Driver.SendAsync(req);
        }
        var first = await (await Post()).ReadAsync<DriverExpenseDto>();
        var second = await (await Post()).ReadAsync<DriverExpenseDto>();
        second.Id.Should().Be(first.Id);
        first.ApprovalStatus.Should().Be(ApprovalStatus.Pending);
        var office = await (await s.Admin.GetAsync($"/api/expenses?tripId={s.TripId}")).ReadAsync<PagedResult<ExpenseDto>>();
        office.Items.Should().ContainSingle().Which.Should().BeEquivalentTo(new { PaidBy = ExpensePaidBy.Driver, ApprovalStatus = ApprovalStatus.Pending });

        // Fotoğraf: aynı anahtarla iki yükleme tek dosya
        var photoKey = Guid.NewGuid().ToString();
        for (var i = 0; i < 2; i++)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new ByteArrayContent(Jpeg) { Headers = { ContentType = new MediaTypeHeaderValue("image/jpeg") } }, "file", "fis.jpg");
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/driver/trips/{s.TripId}/attachments") { Content = form };
            req.Headers.Add("Idempotency-Key", photoKey);
            (await s.Driver.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.OK);
        }
        (await (await s.Admin.GetAsync($"/api/trips/{s.TripId}/attachments")).ReadAsync<List<AttachmentDto>>()).Should().ContainSingle();

        // Fiş fotoğrafı
        using var receipt = new MultipartFormDataContent();
        receipt.Add(new ByteArrayContent(Jpeg) { Headers = { ContentType = new MediaTypeHeaderValue("image/jpeg") } }, "file", "fis.jpg");
        (await s.Driver.PostAsync($"/api/driver/expenses/{first.Id}/receipt", receipt)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Aynı durum iki kez gelirse 200
        var status = new TripStatusRequest(TripStatus.Loaded, DateTime.UtcNow.AddMinutes(-30));
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", status)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", status)).StatusCode.Should().Be(HttpStatusCode.OK);
        var events = await (await s.Admin.GetAsync($"/api/trips/{s.TripId}/events")).ReadAsync<List<TripEventView>>();
        events.Where(e => e.Status == TripStatus.Loaded).Should().ContainSingle()
            .Which.OccurredAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(-30), TimeSpan.FromMinutes(1));
    }

    private record TripEventView(TripStatus Status, DateTime OccurredAt);

    [Fact]
    public async Task Delivery_requires_signature_when_enabled_and_records_receiver()
    {
        var s = await SetupAsync("111");
        var settings = await (await s.Admin.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await s.Admin.PutJsonAsync("/api/settings", settings with { RequireDeliverySignature = true })).EnsureSuccessStatusCode();
        try
        {
            foreach (var st in new[] { TripStatus.Loaded, TripStatus.OnRoad })
                (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(st))).EnsureSuccessStatusCode();
            var deliver = new TripStatusRequest(TripStatus.Delivered, null, null, "Ayşe Yılmaz");
            (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", deliver)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

            byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];
            using var form = new MultipartFormDataContent();
            form.Add(new ByteArrayContent(png) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } }, "file", "imza.png");
            form.Add(new StringContent("Signature"), "kind");
            (await s.Driver.PostAsync($"/api/driver/trips/{s.TripId}/attachments", form)).EnsureSuccessStatusCode();
            (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", deliver)).EnsureSuccessStatusCode();
            var trip = await (await s.Admin.GetAsync($"/api/trips/{s.TripId}")).ReadAsync<TripDto>();
            trip.ReceivedBy.Should().Be("Ayşe Yılmaz");
            trip.Status.Should().Be(TripStatus.Delivered);
        }
        finally
        {
            (await s.Admin.PutJsonAsync("/api/settings", settings with { RequireDeliverySignature = false })).EnsureSuccessStatusCode();
        }
    }

    [Fact]
    public async Task Location_consent_is_recorded_and_visible_to_office()
    {
        var s = await SetupAsync("112");
        (await s.Driver.PostJsonAsync("/api/driver/consent", new LocationConsentRequest(true, "1"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var me = await (await s.Driver.GetAsync("/api/driver/me")).ReadAsync<DriverProfileDto>();
        me.LocationConsentAt.Should().NotBeNull();
        me.LocationConsentVersion.Should().Be("1");
        var drivers = await (await s.Admin.GetAsync("/api/drivers?search=Şoför 112")).ReadAsync<PagedResult<DriverDto>>();
        drivers.Items.Single(d => d.Id == s.DriverId).Should().BeEquivalentTo(new { HasAppAccount = true });
        drivers.Items.Single(d => d.Id == s.DriverId).LocationConsentAt.Should().NotBeNull();

        (await s.Driver.PostJsonAsync("/api/driver/consent", new LocationConsentRequest(false, "1"))).EnsureSuccessStatusCode();
        (await (await s.Driver.GetAsync("/api/driver/me")).ReadAsync<DriverProfileDto>()).LocationConsentAt.Should().BeNull();
    }

    [Fact]
    public async Task Office_users_get_push_for_driver_actions_according_to_preferences()
    {
        var s = await SetupAsync("113");
        (await s.Admin.PostJsonAsync("/api/me/push-token", new PushTokenRequest("ExponentPushToken[admin113]", "android")))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        bool Got(string title) => factory.Push.Sent.Any(m => m.Token == "ExponentPushToken[admin113]" && m.Title == title);

        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Loaded))).EnsureSuccessStatusCode();
        Got("Yüklendi: Şoför Testi 113").Should().BeTrue();

        // Yönetici "durum değişti" bildirimini kapatır; teslim bildirimi açık kalır.
        var prefs = await (await s.Admin.PutJsonAsync("/api/me/notification-preferences",
            new[] { new { type = "TripStatusChanged", push = false } })).ReadAsync<List<PrefView>>();
        prefs.Single(p => p.Type == NotificationType.TripStatusChanged).Push.Should().BeFalse();
        prefs.Single(p => p.Type == NotificationType.TripDelivered).Push.Should().BeTrue();
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.OnRoad))).EnsureSuccessStatusCode();
        Got("Yolda: Şoför Testi 113").Should().BeFalse();
        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/status", new TripStatusRequest(TripStatus.Delivered, null, null, "Ali Veli"))).EnsureSuccessStatusCode();
        factory.Push.Sent.Should().Contain(m => m.Token == "ExponentPushToken[admin113]" && m.Title == "Teslim edildi: Şoför Testi 113"
            && m.Body.Contains("Ali Veli") && m.Data!["tripId"] == s.TripId.ToString());

        (await s.Driver.PostJsonAsync($"/api/driver/trips/{s.TripId}/expenses", new DriverExpenseRequest(ExpenseCategory.Toll, 250, null, null, null))).EnsureSuccessStatusCode();
        factory.Push.Sent.Should().Contain(m => m.Token == "ExponentPushToken[admin113]" && m.Title.StartsWith("Masraf onay bekliyor"));

        // Şoförün tercih listesi boştur.
        (await (await s.Driver.GetAsync("/api/me/notification-preferences")).ReadAsync<List<PrefView>>()).Should().BeEmpty();
        (await s.Admin.PutJsonAsync("/api/me/notification-preferences", new[] { new { type = "TripStatusChanged", push = true } })).EnsureSuccessStatusCode();
        (await s.Admin.DeleteAsync("/api/me/push-token?token=ExponentPushToken%5Badmin113%5D")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private record PrefView(NotificationType Type, string Label, bool Push);
}
