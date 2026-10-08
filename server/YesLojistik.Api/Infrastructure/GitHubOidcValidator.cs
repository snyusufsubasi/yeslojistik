using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// Gece yedeği için gizli anahtarsız giriş: GitHub Actions'ın kendi imzalı kimlik belgesi (OIDC) doğrulanır.
/// Yalnızca ayarlarda adı yazılı deponun (<c>Backup:GitHubRepository</c>), main dalındaki yedek iş akışı
/// (<c>.github/workflows/backup.yml</c>), zamanlanmış ya da elle başlatılmış çalışması kabul edilir. Ayar boşsa bu yol kapalıdır
/// (müşteri kurulumlarında açılmaz). Belge yalnız yedek indirmeye yarar; geri yükleme ve diğer yönetici işleri açılmaz.
/// </summary>
public class GitHubOidcValidator(IConfiguration config, ILogger<GitHubOidcValidator> log)
{
    public const string Header = "X-Backup-Oidc";
    public const string Audience = "yeslojistik-backup";
    public const string Issuer = "https://token.actions.githubusercontent.com";

    private readonly ConfigurationManager<OpenIdConnectConfiguration> _oidc = new(
        $"{Issuer}/.well-known/openid-configuration", new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });

    /// <summary>GitHub'ın imza anahtarları (testlerde değiştirilir).</summary>
    protected virtual async Task<IEnumerable<SecurityKey>> SigningKeysAsync(CancellationToken ct) =>
        (await _oidc.GetConfigurationAsync(ct)).SigningKeys;

    public bool Enabled => !string.IsNullOrWhiteSpace(config["Backup:GitHubRepository"]);

    public async Task<bool> ValidateAsync(string? token, CancellationToken ct)
    {
        var repo = config["Backup:GitHubRepository"]?.Trim();
        if (string.IsNullOrEmpty(repo) || string.IsNullOrWhiteSpace(token)) return false;
        var workflow = config["Backup:GitHubWorkflow"] ?? ".github/workflows/backup.yml";
        var branch = config["Backup:GitHubRef"] ?? "refs/heads/main";
        try
        {
            var result = await new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
            {
                ValidIssuer = Issuer,
                ValidAudience = Audience,
                IssuerSigningKeys = await SigningKeysAsync(ct),
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
            });
            if (!result.IsValid) { log.LogWarning("Yedek OIDC belgesi geçersiz: {Error}", result.Exception?.Message); return false; }
            string? Claim(string type) => result.Claims.TryGetValue(type, out var v) ? v?.ToString() : null;
            var ok = string.Equals(Claim("repository"), repo, StringComparison.OrdinalIgnoreCase)
                && string.Equals(Claim("job_workflow_ref"), $"{repo}/{workflow}@{branch}", StringComparison.OrdinalIgnoreCase)
                && Claim("ref") == branch
                && Claim("event_name") is "schedule" or "workflow_dispatch";
            if (!ok) log.LogWarning("Yedek OIDC belgesi reddedildi: {Repo} {Workflow} {Event}", Claim("repository"), Claim("job_workflow_ref"), Claim("event_name"));
            return ok;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Yedek OIDC doğrulaması yapılamadı.");
            return false;
        }
    }
}
