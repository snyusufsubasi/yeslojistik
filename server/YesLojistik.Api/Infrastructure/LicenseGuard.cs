using Microsoft.AspNetCore.Mvc;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// Abonelik bitince (7 günlük ek süreden sonra) ya da anahtar geçersizse panel salt okunur olur: GET dışındaki API istekleri reddedilir.
/// Serbest kalanlar: giriş/çıkış/şifre (/api/auth), anahtar uygulama (/api/license), yedek ve yönetim (/api/admin) ve veri dışa aktarma
/// (adresinin son bölümünde "export" geçen her istek). Anahtar yoksa (sahip modu) hiçbir şey değişmez.
/// </summary>
public static class LicenseGuardExtensions
{
    public const string ReadOnlyMessage =
        "Aboneliğiniz bitti: şu an yalnızca görüntüleme yapılabilir. Kayıt eklemek için aboneliği yenileyin (Ayarlar → Abonelik).";

    private static readonly string[] Allowed = ["/api/auth", "/api/license", "/api/admin"];

    public static bool IsAllowedWhenReadOnly(PathString path) =>
        Allowed.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase))
        || (path.Value?.TrimEnd('/').Split('/').LastOrDefault() ?? "").Contains("export", StringComparison.OrdinalIgnoreCase);

    public static void UseLicenseGuard(this WebApplication app) => app.Use(async (ctx, next) =>
    {
        var path = ctx.Request.Path;
        if (!HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method)
            && path.StartsWithSegments("/api") && !IsAllowedWhenReadOnly(path))
        {
            var info = await ctx.RequestServices.GetRequiredService<LicenseService>().CurrentAsync(ctx.RequestAborted);
            if (info.ReadOnly)
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = 403,
                    Title = info.Error is { } err ? $"Lisans anahtarı geçersiz: {err} Ayarlar → Abonelik bölümünden geçerli anahtarı girin." : ReadOnlyMessage,
                });
                return;
            }
        }
        await next();
    });
}
