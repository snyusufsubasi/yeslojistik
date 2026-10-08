using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Canlıya geçişte demo verilerini siler: müşteriler, araçlar, şoförler, seferler, faturalar, tahsilatlar, giderler,
/// konumlar, sefer dosyaları ve şoför hesapları. Firma bilgileri ile personel hesapları (yönetici, operasyon, muhasebe) kalır.
/// Fatura numarası ve kayıt numaraları baştan başlar. Gerçek veriyi korumak için yalnızca demo veriler henüz
/// temizlenmemişken çalışır; kayıt geçmişi (audit log) silinmez.
/// </summary>
public class DataResetService(AppDbContext db, IFileStorage storage, ILogger<DataResetService> log)
{
    // Silme sırası yabancı anahtarlara göre: önce bağımlı tablolar.
    private static readonly string[] Tables =
    [
        "vehicle_locations", "trip_events", "trip_templates", "trip_attachments", "payments", "supplier_payments", "invoice_lines", "maintenance_records",
        "driver_settlements", "documents", "staff_transactions", "staff", "expenses", "recurring_payments", "cash_transfers", "trips", "job_requests", "invoices",
        "purchase_invoices", "vehicles", "drivers", "customers", "customer_groups", "suppliers", "cash_accounts",
    ];

    public async Task ResetAsync(string actor, CancellationToken ct = default)
    {
        if (!await db.CompanySettings.AnyAsync(s => s.HasSampleData, ct))
            throw new DomainException("Demo veriler zaten temizlenmiş. Gerçek verileri korumak için bu işlem artık yapılamaz.");
        var files = await db.TripAttachments.IgnoreQueryFilters().Select(a => a.StoragePath).ToListAsync(ct);
        files.AddRange(await db.Documents.IgnoreQueryFilters().Where(d => d.FilePath != null).Select(d => d.FilePath!).ToListAsync(ct));

        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            var driverUsers = db.Users.IgnoreQueryFilters().Where(u => u.Role == UserRole.Driver).Select(u => u.Id);
            await db.PushTokens.IgnoreQueryFilters().Where(t => driverUsers.Contains(t.UserId)).ExecuteDeleteAsync(ct);
            await db.RefreshTokens.IgnoreQueryFilters().Where(t => driverUsers.Contains(t.UserId)).ExecuteDeleteAsync(ct);
            await db.Users.IgnoreQueryFilters().Where(u => u.Role == UserRole.Driver).ExecuteDeleteAsync(ct);
            await db.Users.IgnoreQueryFilters().Where(u => u.DriverId != null).ExecuteUpdateAsync(s => s.SetProperty(u => u.DriverId, (int?)null), ct);

            foreach (var table in Tables)
            {
#pragma warning disable EF1002 // Tablo adları yukarıdaki sabit listeden gelir.
                await db.Database.ExecuteSqlRawAsync($"DELETE FROM {table}", ct);
                await db.Database.ExecuteSqlRawAsync($"SELECT setval(pg_get_serial_sequence('{table}', 'id'), 1, false)", ct);
#pragma warning restore EF1002
            }

            var settings = await db.CompanySettings.FirstAsync(ct);
            settings.HasSampleData = false;
            settings.SampleDataClearedAt = DateTime.UtcNow;
            settings.NextInvoiceNumber = 1;
            // Demo firma bilgileri gerçek faturalara basılmasın; kullanıcının değiştirdiği alanlara dokunulmaz.
            if (settings.Address == DemoCompany.Address) settings.Address = null;
            if (settings.Phone == DemoCompany.Phone) settings.Phone = null;
            if (settings.Email == DemoCompany.Email) settings.Email = null;
            if (settings.TaxOffice == DemoCompany.TaxOffice) settings.TaxOffice = null;
            if (settings.TaxNumber == DemoCompany.TaxNumber) settings.TaxNumber = null;
            if (settings.Iban == DemoCompany.Iban) settings.Iban = null;
            await db.SaveChangesAsync(ct);
            db.AuditLogs.Add(new AuditLog { At = DateTime.UtcNow, UserName = actor, Action = "Reset", EntityType = nameof(CompanySettings), EntityId = 1,
                Label = "Demo veriler temizlendi" });
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        foreach (var path in files)
        {
            try { await storage.DeleteAsync(path, ct); }
            catch (Exception ex) { log.LogWarning(ex, "Dosya silinemedi: {Path}", path); }
        }
        log.LogWarning("Tüm iş verileri {Actor} tarafından silindi ({Files} dosya).", actor, files.Count);
    }
}
