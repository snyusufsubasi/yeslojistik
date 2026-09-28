using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using YesLojistik.Core.Domain;

namespace YesLojistik.Api.Infrastructure;

/// <summary>İş kuralı hatalarını kullanıcıya gösterilebilir ProblemDetails yanıtlarına çevirir.</summary>
public class ExceptionHandler(ILogger<ExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            DomainException => (StatusCodes.Status400BadRequest, ex.Message),
            NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } pg } =>
                (StatusCodes.Status409Conflict, UniqueMessage(pg.ConstraintName)),
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Geçersiz istek."),
            _ => (StatusCodes.Status500InternalServerError, "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."),
        };
        if (status == StatusCodes.Status500InternalServerError) logger.LogError(ex, "İşlenmeyen hata");

        http.Response.StatusCode = status;
        await http.Response.WriteAsJsonAsync(new ProblemDetails { Status = status, Title = title }, ct);
        return true;
    }

    private static string UniqueMessage(string? constraint) => constraint switch
    {
        var c when c?.Contains("plate") == true => "Bu plakayla kayıtlı bir araç zaten var.",
        var c when c?.Contains("email") == true => "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.",
        var c when c?.Contains("invoice_no") == true => "Bu fatura numarası zaten kullanılmış.",
        _ => "Bu kayıt zaten mevcut.",
    };
}
