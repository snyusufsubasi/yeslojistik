using Microsoft.AspNetCore.Mvc.Filters;
using YesLojistik.Core.Domain;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Infrastructure;

/// <summary>
/// Pratikortam aynası açıkken aynadaki kayıtlar panelde değiştirilmez: bu kayıtlar her senkronda pratikortam'dan yeniden gelir,
/// panelde yapılan değişiklik kaybolurdu. Okuma serbesttir; ayarlar, kullanıcılar ve ayna senkronunun kendisi etkilenmez.
/// </summary>
public class MirrorWriteGuard(AppDbContext db) : IAsyncActionFilter
{
    private static readonly string[] Guarded =
    [
        "/api/customers", "/api/suppliers", "/api/drivers", "/api/vehicles", "/api/trips", "/api/expenses", "/api/cash-accounts",
        "/api/staff", "/api/payments", "/api/supplier-payments", "/api/invoices", "/api/purchase-invoices", "/api/import", "/api/job-requests",
        "/api/planning",
    ];

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var req = context.HttpContext.Request;
        if (!HttpMethods.IsGet(req.Method) && !HttpMethods.IsHead(req.Method)
            && Guarded.Any(p => req.Path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase))
            && LegacyMirrorService.IsMirrorMode(db))
            throw new DomainException("Pratikortam aynası açık: bu kayıtlar pratikortam'dan gelir. Değişikliği pratikortam'da yapın; " +
                "bir sonraki senkronda buraya da gelir.");
        await next();
    }
}
