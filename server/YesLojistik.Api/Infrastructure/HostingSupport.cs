using Microsoft.AspNetCore.StaticFiles;
using Npgsql;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// Tek konteynerde (panel + API) barındırma desteği: Render gibi platformların verdiği postgres:// adresini
/// Npgsql bağlantı cümlesine çevirir ve wwwroot varsa paneli aynı adresten sunar.
/// </summary>
public static class HostingSupport
{
    /// <summary>"postgresql://user:pass@host:5432/db" → "Host=host;Port=5432;Database=db;Username=user;Password=pass"</summary>
    public static string? NormalizeConnectionString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)) return value;
        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        }.ConnectionString;
    }

    /// <summary>wwwroot'taki paneli sunar; bilinmeyen (api dışı) yollar index.html'e düşer.</summary>
    public static void UseBundledPanel(this WebApplication app)
    {
        app.Use((ctx, next) =>
        {
            var h = ctx.Response.Headers;
            h.XContentTypeOptions = "nosniff";
            h.XFrameOptions = "DENY";
            h["Referrer-Policy"] = "strict-origin-when-cross-origin";
            h["Permissions-Policy"] = PermissionsPolicy;
            if (!ctx.Request.Path.StartsWithSegments("/api")) h.ContentSecurityPolicy = ContentSecurityPolicy;
            if (ctx.Request.IsHttps || ctx.Request.Headers["X-Forwarded-Proto"] == "https")
                h.StrictTransportSecurity = "max-age=31536000; includeSubDomains";
            return next();
        });
        app.UseDefaultFiles();
        app.UseStaticFiles(PanelFiles);
    }

    /// <summary>Panel sayfaları için içerik güvenliği: yalnızca kendi sunucumuz, harita karoları ve Google Fonts.</summary>
    public const string ContentSecurityPolicy =
        "default-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

    public const string PermissionsPolicy = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

    public static void MapBundledPanel(this WebApplication app) =>
        app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html", PanelFiles).AllowAnonymous();

    private static readonly StaticFileOptions PanelFiles = new()
    {
        ContentTypeProvider = new FileExtensionContentTypeProvider(),
        OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl =
            ctx.Context.Request.Path.StartsWithSegments("/assets") ? "public, max-age=31536000, immutable" : "no-cache",
    };
}
