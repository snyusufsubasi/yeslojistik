using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public record DataStats(Dictionary<string, long> Counts, decimal CustomerBalanceTotal, decimal IssuedInvoiceTotal,
    long FileCount, long FileBytes, long DatabaseBytes, DateTime? LastBackupAt, decimal SupplierPaymentTotal = 0, decimal ExpenseTotal = 0);

/// <summary>pg_dump / pg_restore ile yedek alma ve geri yükleme. Şifre komut satırına değil ortam değişkenine yazılır.</summary>
public class BackupService(AppDbContext db, IConfiguration config)
{
    private string DumpPath => config["Backup:PgDumpPath"] is { Length: > 0 } p ? p : "pg_dump";
    private string RestorePath => config["Backup:PgRestorePath"] is { Length: > 0 } p ? p : "pg_restore";

    private ProcessStartInfo Start(string exe, IEnumerable<string> args)
    {
        var cs = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString());
        var psi = new ProcessStartInfo(exe) { RedirectStandardOutput = true, RedirectStandardError = true, RedirectStandardInput = false, UseShellExecute = false };
        foreach (var a in new[] { "-h", cs.Host!, "-p", cs.Port.ToString(), "-U", cs.Username!, "-d", cs.Database! }.Concat(args)) psi.ArgumentList.Add(a);
        psi.Environment["PGPASSWORD"] = cs.Password ?? "";
        if (cs.SslMode is SslMode.Require or SslMode.VerifyCA or SslMode.VerifyFull) psi.Environment["PGSSLMODE"] = "require";
        return psi;
    }

    /// <summary>Özel formatta (pg_restore ile açılır) yedeği hedef akışa yazar.</summary>
    public async Task DumpAsync(Stream target, bool includeFiles, CancellationToken ct = default)
    {
        var args = new List<string> { "--format=custom", "--no-owner", "--no-acl" };
        if (!includeFiles) args.Add("--exclude-table-data=stored_files");
        using var proc = Process.Start(Start(DumpPath, args)) ?? throw new InvalidOperationException("pg_dump başlatılamadı.");
        var err = proc.StandardError.ReadToEndAsync(ct);
        await proc.StandardOutput.BaseStream.CopyToAsync(target, ct);
        await proc.WaitForExitAsync(ct);
        if (proc.ExitCode != 0) throw new InvalidOperationException("Yedek alınamadı: " + (await err).Trim());

        await db.CompanySettings.ExecuteUpdateAsync(s => s.SetProperty(x => x.LastBackupAt, DateTime.UtcNow), ct);
    }

    /// <summary>Yedek dosyasını mevcut veritabanının üzerine geri yükler (tablolar silinip yeniden kurulur).</summary>
    public async Task RestoreAsync(string dumpFile, CancellationToken ct = default)
    {
        NpgsqlConnection.ClearAllPools();
        using var proc = Process.Start(Start(RestorePath, ["--clean", "--if-exists", "--no-owner", "--no-acl", "--exit-on-error", dumpFile]))
            ?? throw new InvalidOperationException("pg_restore başlatılamadı.");
        var output = proc.StandardOutput.ReadToEndAsync(ct);
        var err = proc.StandardError.ReadToEndAsync(ct);
        await proc.WaitForExitAsync(ct);
        await output;
        if (proc.ExitCode != 0) throw new DomainException("Geri yükleme başarısız: " + (await err).Trim());
        NpgsqlConnection.ClearAllPools();
    }

    public async Task<DataStats> StatsAsync(CancellationToken ct = default)
    {
        var counts = new Dictionary<string, long>
        {
            ["customers"] = await db.Customers.LongCountAsync(ct),
            ["vehicles"] = await db.Vehicles.LongCountAsync(ct),
            ["drivers"] = await db.Drivers.LongCountAsync(ct),
            ["trips"] = await db.Trips.LongCountAsync(ct),
            ["invoices"] = await db.Invoices.LongCountAsync(ct),
            ["payments"] = await db.Payments.LongCountAsync(ct),
            ["expenses"] = await db.Expenses.LongCountAsync(ct),
            ["attachments"] = await db.TripAttachments.LongCountAsync(ct),
            ["users"] = await db.Users.LongCountAsync(ct),
            ["suppliers"] = await db.Suppliers.LongCountAsync(ct),
            ["supplierPayments"] = await db.SupplierPayments.LongCountAsync(ct),
            ["tripEvents"] = await db.TripEvents.LongCountAsync(ct),
            ["storedFiles"] = await db.StoredFiles.LongCountAsync(ct),
        };
        var issued = await db.Invoices.Where(i => i.Status == InvoiceStatus.Issued).SumAsync(i => (decimal?)i.Total, ct) ?? 0;
        var paid = await db.Payments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var opening = await db.Customers.SumAsync(c => (decimal?)c.OpeningBalance, ct) ?? 0;
        var fileCount = await db.StoredFiles.LongCountAsync(ct);
        var fileBytes = await db.StoredFiles.SumAsync(f => (long?)f.Size, ct) ?? 0;
        var dbBytes = (await db.Database.SqlQuery<long>($"SELECT pg_database_size(current_database()) AS \"Value\"").ToListAsync(ct)).Single();
        var last = await db.CompanySettings.Select(s => s.LastBackupAt).FirstAsync(ct);
        var supplierPaid = await db.SupplierPayments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var expenses = await db.Expenses.SumAsync(e => (decimal?)e.Amount, ct) ?? 0;
        return new DataStats(counts, opening + issued - paid, issued, fileCount, fileBytes, dbBytes, last, supplierPaid, expenses);
    }
}
