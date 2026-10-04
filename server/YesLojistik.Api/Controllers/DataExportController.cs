using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record CloseRequestBody(string CompanyName);
public record CloseRequestStatusDto(bool Requested, DateTime? RequestedAt, DateTime? DeleteAfter, string? RequestedBy);

/// <summary>
/// Veri sahipliği (yalnızca yönetici): tüm verileri ZIP olarak indirme ve hesabı kapatma talebi.
/// Kapatma talebi veri SİLMEZ; yalnızca kayıt altına alınır. Silme işlemi destek tarafından 30 gün sonra, yedek alındıktan sonra elle yapılır.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = Policies.Admin)]
public class DataExportController(AppDbContext db, ICurrentUser current, ILogger<DataExportController> log) : ControllerBase
{
    public const int GraceDays = 30;
    public const string RequestedAction = "CloseRequested";
    public const string CancelledAction = "CloseCancelled";

    /// <summary>Tüm ana tabloları okunur başlıklı CSV dosyaları olarak ZIP içinde indirir.</summary>
    [EnableRateLimiting("backup")]
    [HttpGet("export-all")]
    public async Task<IActionResult> ExportAll(CancellationToken ct)
    {
        var zip = await new DataExportService(db).BuildAsync(ct);
        db.AuditLogs.Add(new AuditLog
        {
            At = DateTime.UtcNow, UserId = current.Id, UserName = current.Name, Action = "DataExport",
            EntityType = nameof(CompanySettings), EntityId = 1, Label = "Tüm veriler ZIP olarak indirildi",
        });
        await db.SaveChangesAsync(CancellationToken.None);
        log.LogInformation("Tüm veriler dışa aktarıldı ({Actor}).", current.Name);
        return File(zip, "application/zip", $"yeslojistik-verilerim-{Clock.Now:yyyyMMdd-HHmm}.zip");
    }

    [HttpGet("close-request")]
    public async Task<CloseRequestStatusDto> CloseRequest(CancellationToken ct)
    {
        var last = await db.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType == nameof(CompanySettings) && (a.Action == RequestedAction || a.Action == CancelledAction))
            .OrderByDescending(a => a.Id).FirstOrDefaultAsync(ct);
        return last is { Action: RequestedAction }
            ? new CloseRequestStatusDto(true, last.At, last.At.AddDays(GraceDays), last.UserName)
            : new CloseRequestStatusDto(false, null, null, null);
    }

    /// <summary>Hesabı kapatma talebi: firma adı yazılarak onaylanır. Veriler silinmez.</summary>
    [HttpPost("close-request")]
    public async Task<CloseRequestStatusDto> RequestClose(CloseRequestBody req, CancellationToken ct)
    {
        var company = await db.CompanySettings.AsNoTracking().Select(c => c.CompanyName).FirstAsync(ct);
        var tr = new System.Globalization.CultureInfo("tr-TR");
        if (tr.CompareInfo.Compare((req.CompanyName ?? "").Trim(), company.Trim(), System.Globalization.CompareOptions.IgnoreCase) != 0)
            throw new DomainException("Firma adı eşleşmiyor. Onaylamak için firma adını aynen yazın.");
        if ((await CloseRequest(ct)).Requested) throw new DomainException("Hesabı kapatma talebiniz zaten alındı.");
        db.AuditLogs.Add(new AuditLog
        {
            At = DateTime.UtcNow, UserId = current.Id, UserName = current.Name, Action = RequestedAction,
            EntityType = nameof(CompanySettings), EntityId = 1, Label = "Hesabı kapatma talebi alındı",
            Changes = $"{GraceDays} gün sonra veriler silinecek. Silme işlemi henüz yapılmadı.",
        });
        await db.SaveChangesAsync(ct);
        log.LogWarning("Hesabı kapatma talebi alındı ({Actor}).", current.Name);
        return await CloseRequest(ct);
    }

    /// <summary>Kapatma talebinden vazgeçme.</summary>
    [HttpDelete("close-request")]
    public async Task<IActionResult> CancelClose(CancellationToken ct)
    {
        if (!(await CloseRequest(ct)).Requested) throw new DomainException("Bekleyen bir kapatma talebi yok.");
        db.AuditLogs.Add(new AuditLog
        {
            At = DateTime.UtcNow, UserId = current.Id, UserName = current.Name, Action = CancelledAction,
            EntityType = nameof(CompanySettings), EntityId = 1, Label = "Hesabı kapatma talebinden vazgeçildi",
        });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
