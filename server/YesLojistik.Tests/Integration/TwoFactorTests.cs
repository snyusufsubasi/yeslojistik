using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Tests.Integration;

public class TwoFactorTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Pass = "Sifre1234";

    private record Secrets(string Secret, string OtpAuthUri);
    private record Enabled(List<string> RecoveryCodes);
    private record Status(bool Available, bool Enabled, int RecoveryCodesLeft);

    /// <summary>Doğrulayıcı uygulamanın göstereceği kod. offset: 0 = şimdiki adım, 1 = bir sonraki adım (kabul penceresi içinde).</summary>
    private static string CodeFor(string secret, int offset = 0) =>
        Totp.CodeFor(Totp.FromBase32(secret), Totp.StepOf(DateTime.UtcNow) + offset);

    private async Task<(HttpClient Client, string Email, string Secret, List<string> Recovery)> NewUserWith2faAsync(string name, UserRole role = UserRole.Operations)
    {
        var admin = await factory.LoginAsync();
        var email = $"{name}@test.local";
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest(name, email, role, true, Pass))).ReadAsync<UserDto>();
        var client = await factory.LoginAsync(email, Pass);
        var setup = await (await client.PostAsync("/api/auth/2fa/setup", null)).ReadAsync<Secrets>();
        var enabled = await (await client.PostJsonAsync("/api/auth/2fa/enable", new { code = CodeFor(setup.Secret) })).ReadAsync<Enabled>();
        return (client, email, setup.Secret, enabled.RecoveryCodes);
    }

    private async Task ForgetLastStepAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Users.Where(u => u.Email == email).ExecuteUpdateAsync(s => s.SetProperty(u => u.TotpLastStep, (long?)null));
    }

    private async Task<string> ChallengeAsync(string email, string password = Pass)
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password });
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("twoFactorRequired").GetBoolean().Should().BeTrue();
        return json.GetProperty("challengeToken").GetString()!;
    }

    private async Task<List<AuditLog>> AuditAsync(string email, string action)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync();
        return await db.AuditLogs.Where(a => a.EntityType == "User" && a.EntityId == id && a.Action == action).ToListAsync();
    }

    [Fact]
    public async Task Login_without_2fa_is_unchanged()
    {
        var c = factory.CreateClient();
        var res = await c.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("\"email\"").And.NotContain("twoFactorRequired").And.NotContain("challengeToken");
        res.Headers.GetValues("Set-Cookie").Should().Contain(x => x.StartsWith("yl_at="));
        var token = await factory.CreateClient().PostAsJsonAsync("/api/auth/token", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        (await token.ReadAsync<TokenLoginResponse>()).AccessToken.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Setup_and_enable_return_uri_and_ten_recovery_codes()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Kurulum", "kurulum@test.local", UserRole.Accounting, true, Pass))).ReadAsync<UserDto>();
        var c = await factory.LoginAsync("kurulum@test.local", Pass);
        (await (await c.GetAsync("/api/auth/2fa/status")).ReadAsync<Status>()).Enabled.Should().BeFalse();

        var setup = await (await c.PostAsync("/api/auth/2fa/setup", null)).ReadAsync<Secrets>();
        setup.OtpAuthUri.Should().StartWith("otpauth://totp/").And.Contain($"secret={setup.Secret}").And.Contain("kurulum%40test.local");
        (await c.PostJsonAsync("/api/auth/2fa/enable", new { code = "000000" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await (await c.GetAsync("/api/auth/2fa/status")).ReadAsync<Status>()).Enabled.Should().BeFalse();

        var enabled = await (await c.PostJsonAsync("/api/auth/2fa/enable", new { code = CodeFor(setup.Secret) })).ReadAsync<Enabled>();
        enabled.RecoveryCodes.Should().HaveCount(10).And.OnlyHaveUniqueItems();
        var status = await (await c.GetAsync("/api/auth/2fa/status")).ReadAsync<Status>();
        status.Should().BeEquivalentTo(new Status(true, true, 10));
        (await AuditAsync("kurulum@test.local", "TwoFactorEnabled")).Should().HaveCount(1);
        // Zaten açıkken yeniden kurulum yapılamaz.
        (await c.PostAsync("/api/auth/2fa/setup", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Secret_is_encrypted_and_never_returned_by_other_endpoints()
    {
        var (_, email, secret, recovery) = await NewUserWith2faAsync("sifreli");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var u = await db.Users.FirstAsync(x => x.Email == email);
            u.TotpSecretEnc.Should().StartWith("v1.").And.NotContain(secret);
            u.TotpRecoveryHashes.Should().NotBeNullOrEmpty();
            foreach (var code in recovery) u.TotpRecoveryHashes!.Should().NotContain(code.Replace("-", ""));
        }
        var admin = await factory.LoginAsync();
        var users = await (await admin.GetAsync("/api/users")).Content.ReadAsStringAsync();
        users.Should().NotContain(secret).And.NotContain("totpSecret").And.NotContain("recovery");
        users.Should().Contain("\"twoFactorEnabled\":true");
        // Denetim kaydında gizli alanlar yok.
        using var scope2 = factory.Services.CreateScope();
        var logs = await scope2.ServiceProvider.GetRequiredService<AppDbContext>().AuditLogs.Select(a => a.Changes + " " + a.Label).ToListAsync();
        logs.Should().NotContain(l => l.Contains("v1.") || l.Contains(secret));
    }

    [Fact]
    public async Task Login_with_2fa_needs_a_code_and_does_not_open_a_session_before_it()
    {
        var (_, email, secret, _) = await NewUserWith2faAsync("ikiadim");
        await ForgetLastStepAsync(email);

        var browser = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var first = await browser.PostAsJsonAsync("/api/auth/login", new { email, password = Pass });
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        first.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeFalse($"oturum açılmamalı: {string.Join(",", cookies ?? [])}");
        var challenge = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("challengeToken").GetString()!;
        (await browser.GetAsync("/api/trips")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        (await browser.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = challenge, code = "000000" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await browser.GetAsync("/api/trips")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var ok = await browser.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = challenge, code = CodeFor(secret) });
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ok.Content.ReadAsStringAsync()).Should().Contain(email);
        (await browser.GetAsync("/api/trips")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Wrong_password_never_reaches_the_second_step()
    {
        var (_, email, _, _) = await NewUserWith2faAsync("yanlissifre");
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = "Yanlis-12345" });
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await res.Content.ReadAsStringAsync()).Should().NotContain("challengeToken");
    }

    [Fact]
    public async Task A_used_code_cannot_be_replayed()
    {
        var (_, email, secret, _) = await NewUserWith2faAsync("tekrar");
        await ForgetLastStepAsync(email);
        var code = CodeFor(secret);
        var c = factory.CreateClient();
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = await ChallengeAsync(email), code })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = await ChallengeAsync(email), code })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Recovery_code_works_once_and_is_audited()
    {
        var (_, email, _, recovery) = await NewUserWith2faAsync("kurtarma");
        var c = factory.CreateClient();
        var code = recovery[3];
        // Küçük harf ve tiresiz yazım da kabul edilir.
        var typed = code.Replace("-", "").ToLowerInvariant();
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = await ChallengeAsync(email), code = typed })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = await ChallengeAsync(email), code })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        // Başka bir kod hâlâ çalışır.
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = await ChallengeAsync(email), code = recovery[4] })).StatusCode.Should().Be(HttpStatusCode.OK);

        var client = await factory.LoginAsync(); // yönetici
        (await AuditAsync(email, "LoginRecovery")).Should().HaveCount(2);
        (await AuditAsync(email, "LoginFailed")).Should().HaveCount(1);
        client.Should().NotBeNull();
    }

    [Fact]
    public async Task Wrong_codes_lock_the_account_even_for_a_correct_code_afterwards()
    {
        var (_, email, secret, _) = await NewUserWith2faAsync("kilitli2fa");
        await ForgetLastStepAsync(email);
        var c = factory.CreateClient();
        var challenge = await ChallengeAsync(email);
        for (var i = 0; i < LoginGuard.MaxFailed; i++)
            (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = challenge, code = "000000" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = challenge, code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        // Şifre doğru olsa da giriş kilitli.
        (await c.PostAsJsonAsync("/api/auth/login", new { email, password = Pass })).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await AuditAsync(email, "AccountLocked")).Should().HaveCount(1);
        (await AuditAsync(email, "LoginFailed")).Should().HaveCount(5);
    }

    [Fact]
    public async Task Password_step_does_not_reset_the_code_attempt_counter()
    {
        var (_, email, _, _) = await NewUserWith2faAsync("sayac");
        var c = factory.CreateClient();
        // Her turda: doğru şifre + 2 hatalı kod. Sayaç sıfırlansaydı hesap hiç kilitlenmezdi.
        for (var round = 0; round < 3; round++)
        {
            var challenge = await ChallengeAsync(email);
            for (var i = 0; i < 2; i++)
                await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = challenge, code = "000000" });
        }
        (await c.PostAsJsonAsync("/api/auth/login", new { email, password = Pass })).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Tampered_or_expired_challenge_is_rejected()
    {
        var (_, email, secret, _) = await NewUserWith2faAsync("belirtec");
        await ForgetLastStepAsync(email);
        var c = factory.CreateClient();
        var good = await ChallengeAsync(email);
        var tampered = "A" + good[1..];
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = tampered, code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = "", code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var scope = factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<TwoFactorService>();
        var id = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync();
        var old = svc.CreateChallenge(id, false, DateTime.UtcNow.AddMinutes(-10));
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = old, code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        // Hiçbiri sayaç artırmadığı için gerçek belirteç hâlâ çalışır.
        (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = good, code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Mobile_token_endpoint_also_asks_for_the_code()
    {
        var (_, email, secret, _) = await NewUserWith2faAsync("mobil2fa");
        await ForgetLastStepAsync(email);
        var c = factory.CreateClient();
        var res = await c.PostAsJsonAsync("/api/auth/token", new { email, password = Pass });
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("accessToken", out _).Should().BeFalse();
        var done = await (await c.PostAsJsonAsync("/api/auth/2fa/verify", new { challengeToken = json.GetProperty("challengeToken").GetString(), code = CodeFor(secret) }))
            .ReadAsync<TokenLoginResponse>();
        done.AccessToken.Should().NotBeEmpty();
        done.RefreshToken.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Disable_needs_password_and_code_and_is_audited()
    {
        var (c, email, secret, _) = await NewUserWith2faAsync("kapat");
        await ForgetLastStepAsync(email);
        (await c.PostJsonAsync("/api/auth/2fa/disable", new { password = "Yanlis-12345", code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/auth/2fa/disable", new { password = Pass, code = "000000" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await (await c.GetAsync("/api/auth/2fa/status")).ReadAsync<Status>()).Enabled.Should().BeTrue();
        await ForgetLastStepAsync(email);
        (await c.PostJsonAsync("/api/auth/2fa/disable", new { password = Pass, code = CodeFor(secret) })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await (await c.GetAsync("/api/auth/2fa/status")).ReadAsync<Status>()).Enabled.Should().BeFalse();
        (await AuditAsync(email, "TwoFactorDisabled")).Should().HaveCount(1);
        // Artık doğrudan giriş.
        (await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = Pass })).Content.ReadAsStringAsync().Result.Should().NotContain("challengeToken");
    }

    [Fact]
    public async Task Admin_can_reset_another_users_2fa()
    {
        var (_, email, _, _) = await NewUserWith2faAsync("telefonkayip");
        var admin = await factory.LoginAsync();
        var user = (await (await admin.GetAsync("/api/users")).ReadAsync<List<UserDto>>()).Single(u => u.Email == email);
        user.TwoFactorEnabled.Should().BeTrue();
        (await admin.PostAsync($"/api/users/{user.Id}/reset-2fa", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.PostAsync($"/api/users/{user.Id}/reset-2fa", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = Pass })).Content.ReadAsStringAsync().Result.Should().NotContain("challengeToken");
    }

    [Fact]
    public async Task Driver_cannot_enable_2fa()
    {
        var admin = await factory.LoginAsync();
        var driver = await (await admin.PostJsonAsync("/api/drivers", new DriverSaveRequest("Şoför İkiAdım", null, null, "CE", null, null, null, true))).ReadAsync<DriverDto>();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Şoför İkiAdım", "sofor2fa@test.local", UserRole.Driver, true, "Sofor1234", driver.Id))).ReadAsync<UserDto>();
        var mobile = factory.CreateClient();
        var login = await (await mobile.PostAsJsonAsync("/api/auth/token", new { email = "sofor2fa@test.local", password = "Sofor1234" })).ReadAsync<TokenLoginResponse>();
        mobile.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        (await mobile.PostAsync("/api/auth/2fa/setup", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await mobile.PostJsonAsync("/api/auth/2fa/enable", new { code = "123456" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await mobile.GetAsync("/api/auth/2fa/status")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // --- Giriş sertleştirme ---
    [Fact]
    public async Task Lockout_counts_only_failures_inside_the_15_minute_window_and_is_audited()
    {
        var admin = await factory.LoginAsync();
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Pencere", "pencere@test.local", UserRole.Operations, true, Pass))).ReadAsync<UserDto>();
        var c = factory.CreateClient();
        for (var i = 0; i < 4; i++)
            (await c.PostAsJsonAsync("/api/auth/login", new { email = "pencere@test.local", password = "yanlis-1234" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        // 4 hata 20 dakika önceymiş gibi: bir yenisi sayacı 1'e indirir, kilitlemez.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.Where(u => u.Email == "pencere@test.local").ExecuteUpdateAsync(s => s.SetProperty(u => u.LastFailedLoginAt, DateTime.UtcNow.AddMinutes(-20)));
        }
        (await c.PostAsJsonAsync("/api/auth/login", new { email = "pencere@test.local", password = "yanlis-1234" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await c.PostAsJsonAsync("/api/auth/login", new { email = "pencere@test.local", password = Pass })).StatusCode.Should().Be(HttpStatusCode.OK);

        // Başarılı girişten sonra sayaç sıfır: 5 yeni hata gerekir.
        for (var i = 0; i < 5; i++)
            await c.PostAsJsonAsync("/api/auth/login", new { email = "pencere@test.local", password = "yanlis-1234" });
        (await c.PostAsJsonAsync("/api/auth/login", new { email = "pencere@test.local", password = Pass })).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await AuditAsync("pencere@test.local", "AccountLocked")).Should().HaveCount(1);
    }

    [Fact]
    public async Task Common_passwords_are_rejected_on_create_and_change()
    {
        var admin = await factory.LoginAsync();
        (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Zayıf Şifre", "zayif2@test.local", UserRole.Operations, true, "password1")))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await (await admin.PostJsonAsync("/api/users", new UserSaveRequest("Değiştiren", "degistiren@test.local", UserRole.Operations, true, Pass))).ReadAsync<UserDto>();
        var c = await factory.LoginAsync("degistiren@test.local", Pass);
        (await c.PostJsonAsync("/api/auth/change-password", new { currentPassword = Pass, newPassword = "Qwerty123" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostJsonAsync("/api/auth/change-password", new { currentPassword = Pass, newPassword = "kamyon-2026-yol" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
