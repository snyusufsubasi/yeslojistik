using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.EInvoice;

namespace YesLojistik.Api.Infrastructure;

/// <summary>Sağlayıcı durum sorgusunu destekliyorsa, gönderilmiş e-Faturaların durumunu 10 dakikada bir günceller.</summary>
public class EInvoiceStatusWorker(IServiceScopeFactory scopes, IEInvoiceProvider provider, ILogger<EInvoiceStatusWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!provider.SupportsStatus) return;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var svc = scope.ServiceProvider.GetRequiredService<EInvoiceService>();
                var ids = await db.Invoices.Where(i => i.EInvoiceStatus == EInvoiceStatus.Sent || i.EInvoiceStatus == EInvoiceStatus.Delivered
                    || i.EInvoiceStatus == EInvoiceStatus.CancelRequested).Select(i => i.Id).Take(200).ToListAsync(ct);
                foreach (var id in ids) await svc.RefreshStatusAsync(id, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "e-Fatura durum sorgusu başarısız");
            }
            await Task.Delay(TimeSpan.FromMinutes(10), ct);
        }
    }
}
