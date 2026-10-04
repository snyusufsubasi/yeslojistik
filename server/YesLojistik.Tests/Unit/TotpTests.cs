using System.Text;
using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Validation;

namespace YesLojistik.Tests.Unit;

public class TotpTests
{
    private static readonly byte[] Sha1Key = Encoding.ASCII.GetBytes("12345678901234567890");
    private static readonly byte[] Sha256Key = Encoding.ASCII.GetBytes("12345678901234567890123456789012");
    private static readonly byte[] Sha512Key = Encoding.ASCII.GetBytes("1234567890123456789012345678901234567890123456789012345678901234");

    // RFC 6238 Ek B: 8 haneli test vektörleri.
    [Theory]
    [InlineData(59L, "94287082")]
    [InlineData(1111111109L, "07081804")]
    [InlineData(1111111111L, "14050471")]
    [InlineData(1234567890L, "89005924")]
    [InlineData(2000000000L, "69279037")]
    [InlineData(20000000000L, "65353130")]
    public void Rfc6238_sha1_vectors(long unixSeconds, string expected) =>
        Totp.CodeFor(Sha1Key, unixSeconds / 30, 8).Should().Be(expected);

    [Fact]
    public void Rfc6238_sha256_and_sha512_vectors()
    {
        Totp.CodeFor(Sha256Key, 59 / 30, 8, "SHA256").Should().Be("46119246");
        Totp.CodeFor(Sha512Key, 59 / 30, 8, "SHA512").Should().Be("90693936");
        Totp.CodeFor(Sha256Key, 1111111109L / 30, 8, "SHA256").Should().Be("68084774");
        Totp.CodeFor(Sha512Key, 1111111109L / 30, 8, "SHA512").Should().Be("25091201");
    }

    [Fact]
    public void Six_digit_code_is_the_tail_of_the_eight_digit_one()
    {
        Totp.CodeFor(Sha1Key, 59 / 30).Should().Be("287082");
        Totp.CodeFor(Sha1Key, 1111111109L / 30).Should().Be("081804");
    }

    [Fact]
    public void Verify_accepts_one_step_either_side_but_not_two()
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1111111109).UtcDateTime;
        var step = Totp.StepOf(now);
        Totp.Verify(Sha1Key, Totp.CodeFor(Sha1Key, step), now).Should().Be(step);
        Totp.Verify(Sha1Key, Totp.CodeFor(Sha1Key, step - 1), now).Should().Be(step - 1);
        Totp.Verify(Sha1Key, Totp.CodeFor(Sha1Key, step + 1), now).Should().Be(step + 1);
        Totp.Verify(Sha1Key, Totp.CodeFor(Sha1Key, step - 2), now).Should().BeNull();
        Totp.Verify(Sha1Key, Totp.CodeFor(Sha1Key, step + 2), now).Should().BeNull();
        Totp.Verify(Sha1Key, "12345", now).Should().BeNull();
        Totp.Verify(Sha1Key, null, now).Should().BeNull();
    }

    [Fact]
    public void Verify_rejects_a_step_that_was_already_used()
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1111111109).UtcDateTime;
        var step = Totp.StepOf(now);
        var code = Totp.CodeFor(Sha1Key, step);
        Totp.Verify(Sha1Key, code, now, lastUsedStep: step).Should().BeNull();
        Totp.Verify(Sha1Key, code, now, lastUsedStep: step - 1).Should().Be(step);
    }

    [Fact]
    public void Verify_ignores_spaces_in_the_code()
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(59).UtcDateTime;
        Totp.Verify(Sha1Key, "287 082", now).Should().Be(1);
    }

    [Fact]
    public void Base32_round_trips_and_matches_known_value()
    {
        Totp.ToBase32(Sha1Key).Should().Be("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        Totp.FromBase32("gezd gnbv gy3t qojq gezd gnbv gy3t qojq").Should().Equal(Sha1Key);
        var random = Totp.NewSecret();
        random.Should().HaveCount(20);
        Totp.FromBase32(Totp.ToBase32(random)).Should().Equal(random);
    }

    [Fact]
    public void OtpAuth_uri_has_the_fields_authenticator_apps_need()
    {
        var uri = Totp.OtpAuthUri("YES Lojistik", "ali@firma.com", "ABCDEFGH");
        uri.Should().StartWith("otpauth://totp/YES%20Lojistik:ali%40firma.com?secret=ABCDEFGH")
            .And.Contain("issuer=YES%20Lojistik").And.Contain("digits=6").And.Contain("period=30");
    }

    [Theory]
    [InlineData("password1")]
    [InlineData("Password1")]
    [InlineData("QWERTY123")]
    [InlineData("YesLojistik123")]
    [InlineData("12345678")]
    [InlineData("kisa1")]
    [InlineData("sadece-harf-uzun")]
    public void Password_policy_rejects_weak_or_common_passwords(string password) =>
        PasswordPolicy.IsValid(password).Should().BeFalse();

    [Theory]
    [InlineData("Admin123!")]
    [InlineData("Sifre1234")]
    [InlineData("Yeni12345")]
    [InlineData("kamyon-2026-ankara")]
    public void Password_policy_accepts_normal_passwords(string password) =>
        PasswordPolicy.IsValid(password).Should().BeTrue();
}
