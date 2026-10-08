using System.Net;
using System.Security.Cryptography;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using YesLojistik.Api.Infrastructure;

namespace YesLojistik.Tests.Integration;

/// <summary>Testte GitHub yerine kendi anahtarımızla imzalanan OIDC belgeleri.</summary>
public class TestOidcValidator(IConfiguration config, ILogger<GitHubOidcValidator> log) : GitHubOidcValidator(config, log)
{
    public static readonly RsaSecurityKey Key = new(RSA.Create(2048)) { KeyId = "test" };
    protected override Task<IEnumerable<SecurityKey>> SigningKeysAsync(CancellationToken ct) => Task.FromResult<IEnumerable<SecurityKey>>([Key]);
}

public class OidcApiFactory : ApiFactory
{
    public const string Repo = "acme/yeslojistik";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Backup:GitHubRepository", Repo);
        builder.UseSetting("Backup:AllowRestore", "true");
        builder.UseSetting("Backup:RestartAfterRestore", "false");
        builder.ConfigureTestServices(s => s.AddSingleton<GitHubOidcValidator, TestOidcValidator>());
    }
}

public class BackupOidcTests(OidcApiFactory factory) : IClassFixture<OidcApiFactory>
{
    private static string Token(string repo = OidcApiFactory.Repo, string workflow = ".github/workflows/backup.yml", string branch = "refs/heads/main",
        string ev = "schedule", string audience = GitHubOidcValidator.Audience, string issuer = GitHubOidcValidator.Issuer, DateTime? expires = null,
        SecurityKey? key = null) =>
        new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            NotBefore = DateTime.UtcNow.AddMinutes(-5),
            IssuedAt = DateTime.UtcNow.AddMinutes(-5),
            Expires = expires ?? DateTime.UtcNow.AddMinutes(5),
            Claims = new Dictionary<string, object>
            {
                ["repository"] = repo, ["job_workflow_ref"] = $"{repo}/{workflow}@{branch}", ["ref"] = branch, ["event_name"] = ev,
            },
            SigningCredentials = new SigningCredentials(key ?? TestOidcValidator.Key, SecurityAlgorithms.RsaSha256),
        });

    private async Task<HttpStatusCode> StatsWith(string token)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/stats");
        req.Headers.Add(GitHubOidcValidator.Header, token);
        return (await factory.CreateClient().SendAsync(req)).StatusCode;
    }

    [Fact]
    public async Task Github_actions_token_of_backup_workflow_on_main_is_accepted()
    {
        (await StatsWith(Token())).Should().Be(HttpStatusCode.OK);
        (await StatsWith(Token(ev: "workflow_dispatch"))).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Other_repos_workflows_branches_events_audiences_expired_or_forged_tokens_are_rejected()
    {
        (await StatsWith(Token(repo: "kotu/fork"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(workflow: ".github/workflows/ci.yml"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(branch: "refs/heads/saldiri"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(ev: "pull_request"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(audience: "baska-uygulama"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(issuer: "https://sahte.example.com"))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(expires: DateTime.UtcNow.AddMinutes(-10)))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith(Token(key: new RsaSecurityKey(RSA.Create(2048)) { KeyId = "test" }))).Should().Be(HttpStatusCode.Unauthorized);
        (await StatsWith("bozuk.belge.degil")).Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Token_does_not_open_restore()
    {
        var form = new MultipartFormDataContent { { new ByteArrayContent([1, 2, 3]), "file", "yedek.dump" }, { new StringContent("GERİ YÜKLE"), "confirm" } };
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/admin/restore") { Content = form };
        req.Headers.Add(GitHubOidcValidator.Header, Token());
        (await factory.CreateClient().SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

public class BackupOidcDisabledTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Without_repository_setting_oidc_path_is_closed()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/stats");
        req.Headers.Add(GitHubOidcValidator.Header, "herhangi.bir.belge");
        (await factory.CreateClient().SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
