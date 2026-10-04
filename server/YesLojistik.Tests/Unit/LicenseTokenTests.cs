using FluentAssertions;
using YesLojistik.Core.Licensing;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Unit;

public class LicenseTokenTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 3, 12, 0, 0, TimeSpan.Zero);
    private static readonly (string Pub, string Priv) Keys = LicenseToken.GenerateKeyPair();

    private static LicensePayload Payload(int days = 30, string? instanceId = null, int limit = 20, string[]? features = null) => new()
    {
        Customer = "Deneme Nakliyat", Plan = "Standart", VehicleLimit = limit, Features = features ?? ["eFatura", "uetds"],
        IssuedAt = Now.AddDays(-1), ExpiresAt = Now.AddDays(days), InstanceId = instanceId,
    };

    private static string Token(LicensePayload p) => LicenseToken.Sign(p, Keys.Priv);

    [Fact]
    public void Signed_token_verifies_and_keeps_every_field()
    {
        var r = LicenseToken.Verify(Token(Payload(instanceId: "musteri-1")), Keys.Pub);
        r.Ok.Should().BeTrue(r.Error);
        r.Payload!.Customer.Should().Be("Deneme Nakliyat");
        r.Payload.Plan.Should().Be("Standart");
        r.Payload.VehicleLimit.Should().Be(20);
        r.Payload.Features.Should().Equal("eFatura", "uetds");
        r.Payload.InstanceId.Should().Be("musteri-1");
        r.Payload.ExpiresAt.Should().Be(Now.AddDays(30));
    }

    [Fact]
    public void Tampered_payload_is_rejected()
    {
        var parts = Token(Payload(limit: 5)).Split('.');
        var forged = Payload(limit: 500);
        var forgedBody = LicenseToken.Sign(forged, Keys.Priv).Split('.')[0];   // başka bir yük, ama eski imza
        LicenseToken.Verify($"{forgedBody}.{parts[1]}", Keys.Pub).Ok.Should().BeFalse();
        // Tek bir bayt değiştirmek de yeter.
        var body = LicenseToken.FromBase64Url(parts[0]);
        body[^3] ^= 0x01;
        LicenseToken.Verify($"{LicenseToken.Base64Url(body)}.{parts[1]}", Keys.Pub).Error.Should().Contain("imza");
    }

    [Fact]
    public void Tampered_signature_wrong_key_and_garbage_are_rejected()
    {
        var token = Token(Payload());
        var parts = token.Split('.');
        var sig = LicenseToken.FromBase64Url(parts[1]);
        sig[0] ^= 0xFF;
        LicenseToken.Verify($"{parts[0]}.{LicenseToken.Base64Url(sig)}", Keys.Pub).Ok.Should().BeFalse();

        var other = LicenseToken.GenerateKeyPair();
        LicenseToken.Verify(token, other.PublicKey).Ok.Should().BeFalse();
        // Yerleşik genel anahtarın özel karşılığı kimsede yok: geçici anahtarla imzalanan anahtar onunla doğrulanamaz.
        LicenseToken.Verify(token, LicenseService.BuiltInPublicKey).Ok.Should().BeFalse();

        foreach (var bad in new[] { "", "   ", "abc", "a.b.c", "!!!.???", $"{parts[0]}.", null })
            LicenseToken.Verify(bad, Keys.Pub).Ok.Should().BeFalse($"'{bad}' geçersiz olmalı");
        LicenseToken.Verify(token, "bu-bir-anahtar-degil").Ok.Should().BeFalse();
        LicenseToken.Verify(token, null).Ok.Should().BeFalse();
    }

    [Fact]
    public void Whitespace_around_a_pasted_token_is_ignored()
    {
        LicenseToken.Verify($"  {Token(Payload())}\r\n", Keys.Pub).Ok.Should().BeTrue();
    }

    [Fact]
    public void Unknown_plan_or_inverted_dates_are_invalid_even_when_signed()
    {
        LicenseToken.Verify(Token(Payload() with { Plan = "Bedava" }), Keys.Pub).Ok.Should().BeFalse();
        LicenseToken.Verify(Token(Payload() with { VehicleLimit = -1 }), Keys.Pub).Ok.Should().BeFalse();
        LicenseToken.Verify(Token(Payload() with { Customer = " " }), Keys.Pub).Ok.Should().BeFalse();
        LicenseToken.Verify(Token(Payload() with { ExpiresAt = Now.AddDays(-5), IssuedAt = Now }), Keys.Pub).Ok.Should().BeFalse();
    }

    [Fact]
    public void No_key_means_owner_mode_with_everything_allowed()
    {
        foreach (var none in new string?[] { null, "", "  " })
        {
            var info = LicenseEvaluator.Evaluate(none, "db", Keys.Pub, null, Now);
            info.State.Should().Be(LicenseStates.Owner);
            info.ReadOnly.Should().BeFalse();
            info.VehicleLimit.Should().Be(0);
            info.Has("uetds").Should().BeTrue();
            info.DaysLeft.Should().BeNull();
        }
    }

    [Fact]
    public void State_moves_from_active_to_grace_to_expired_at_the_exact_boundaries()
    {
        var token = Token(Payload(days: 10));
        LicenseInfo At(DateTimeOffset t) => LicenseEvaluator.Evaluate(token, "db", Keys.Pub, null, t);
        var expires = Now.AddDays(10);

        At(Now).State.Should().Be(LicenseStates.Active);
        At(Now).DaysLeft.Should().Be(10);
        At(Now.AddDays(-13)).DaysLeft.Should().Be(23);
        At(expires.AddHours(-1)).DaysLeft.Should().Be(1);
        At(expires).State.Should().Be(LicenseStates.Active);              // bitiş anı hâlâ geçerli
        At(expires).DaysLeft.Should().Be(0);

        At(expires.AddSeconds(1)).State.Should().Be(LicenseStates.Grace);
        At(expires.AddSeconds(1)).ReadOnly.Should().BeFalse();
        At(expires.AddDays(7)).State.Should().Be(LicenseStates.Grace);     // 7 gün tamam, hâlâ ek süre
        At(expires.AddDays(7).AddSeconds(1)).State.Should().Be(LicenseStates.Expired);
        At(expires.AddDays(7).AddSeconds(1)).ReadOnly.Should().BeTrue();
        At(expires.AddDays(30)).State.Should().Be(LicenseStates.Expired);
    }

    [Fact]
    public void Features_are_available_while_active_or_in_grace_only()
    {
        var token = Token(Payload(days: 1, features: ["uetds"]));
        var active = LicenseEvaluator.Evaluate(token, "db", Keys.Pub, null, Now);
        active.Has("uetds").Should().BeTrue();
        active.Has("UETDS").Should().BeTrue();
        active.Has("gps").Should().BeFalse();
        LicenseEvaluator.Evaluate(token, "db", Keys.Pub, null, Now.AddDays(3)).Has("uetds").Should().BeTrue();   // ek süre
        LicenseEvaluator.Evaluate(token, "db", Keys.Pub, null, Now.AddDays(20)).Has("uetds").Should().BeFalse();  // bitti
    }

    [Fact]
    public void Instance_bound_key_only_works_on_the_matching_install()
    {
        var token = Token(Payload(instanceId: "firma-a"));
        LicenseEvaluator.Evaluate(token, "db", Keys.Pub, "firma-a", Now).State.Should().Be(LicenseStates.Active);
        LicenseEvaluator.Evaluate(token, "db", Keys.Pub, "firma-b", Now).State.Should().Be(LicenseStates.Invalid);
        LicenseEvaluator.Evaluate(token, "db", Keys.Pub, null, Now).State.Should().Be(LicenseStates.Invalid);
        // Anahtarda instanceId yoksa her kurulumda geçer.
        LicenseEvaluator.Evaluate(Token(Payload()), "db", Keys.Pub, "firma-b", Now).State.Should().Be(LicenseStates.Active);
    }

    [Fact]
    public void A_bad_key_is_invalid_and_read_only_not_owner()
    {
        var info = LicenseEvaluator.Evaluate("sahte.anahtar", "env", Keys.Pub, null, Now);
        info.State.Should().Be(LicenseStates.Invalid);
        info.ReadOnly.Should().BeTrue();
        info.Error.Should().NotBeNullOrEmpty();
        info.Has("uetds").Should().BeFalse();
    }
}
