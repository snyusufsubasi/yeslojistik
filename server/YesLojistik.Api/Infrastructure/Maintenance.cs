using Microsoft.AspNetCore.Mvc;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// Bakım modu: açıkken GET dışındaki API istekleri reddedilir (taşınma, geri yükleme sırasında veri yazılmasın).
/// App:MaintenanceMode ayarıyla ya da geri yükleme sırasında çalışma anında açılır.
/// </summary>
public class MaintenanceState(IConfiguration config)
{
    private volatile bool _runtime;
    public bool IsOn => _runtime || config.GetValue<bool>("App:MaintenanceMode");
    public void Enable() => _runtime = true;
    public void Disable() => _runtime = false;
}

public static class MaintenanceExtensions
{
    public static void UseMaintenanceMode(this WebApplication app) => app.Use(async (ctx, next) =>
    {
        var state = ctx.RequestServices.GetRequiredService<MaintenanceState>();
        var path = ctx.Request.Path;
        if (state.IsOn && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method)
            && path.StartsWithSegments("/api")
            && !path.StartsWithSegments("/api/auth") && !path.StartsWithSegments("/api/admin"))
        {
            ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await ctx.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = 503, Title = "Bakım çalışması yapılıyor. Kısa süre sonra tekrar deneyin.",
            });
            return;
        }
        await next();
    });
}
