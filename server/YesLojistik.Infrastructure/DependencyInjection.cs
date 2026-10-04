using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using YesLojistik.Core.Abstractions;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString, string storagePath = "data/uploads", string storageProvider = "Database", string eInvoiceProvider = "FileExport")
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());
        services.AddScoped<BalanceService>();
        services.AddScoped<TripService>();
        services.AddScoped<JobRequestService>();
        services.AddScoped<InvoiceService>();
        services.AddScoped<DataResetService>();
        services.AddScoped<BackupService>();
        services.AddScoped<PayableService>();
        services.AddScoped<CariService>();
        services.AddScoped<WaybillPdfGenerator>();
        services.AddScoped<CustomerNotifier>();
        services.AddScoped<ExpenseService>();
        services.AddScoped<PurchaseInvoiceService>();
        services.AddScoped<DriverLedgerService>();
        services.AddScoped<FleetService>();
        services.AddScoped<CashService>();
        services.AddScoped<DailyDigestService>();
        services.AddScoped<StatementPdfGenerator>();
        services.AddScoped<InvoicePdfGenerator>();
        services.AddScoped<CustomerAccountService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<AlertService>();
        services.AddScoped<ReportService>();
        services.AddScoped<TripStatementService>();
        services.AddScoped<AttachmentService>();
        services.AddScoped<TrackingService>();
        services.AddScoped<DriverAppService>();
        services.AddScoped<ImportService>();
        services.AddScoped<LegacyMirrorService>();
        services.AddScoped<DriverNotifier>();
        services.AddScoped<StaffNotifier>();
        services.AddScoped<InvoiceMailer>();
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<LicenseService>();
        services.AddHttpClient<IPushSender, ExpoPushSender>(c => c.Timeout = TimeSpan.FromSeconds(5));
        // Database: dosyalar PostgreSQL'de (varsayılan, yedeğe dahil). Local: disk (Docker volume).
        if (string.Equals(storageProvider, "Local", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IFileStorage>(new LocalFileStorage(storagePath));
        else
            services.AddScoped<IFileStorage, DatabaseFileStorage>();
        // e-Fatura sağlayıcısı: FileExport (varsayılan, XML elle yüklenir) ya da Mock (yalnızca geliştirme/test).
        // Gerçek entegratör sözleşmesinden sonra buraya adaptörü eklenir (docs/E-FATURA.md).
        if (eInvoiceProvider.Equals("Mock", StringComparison.OrdinalIgnoreCase)) services.AddSingleton<IEInvoiceProvider, EInvoice.MockEInvoiceProvider>();
        else services.AddSingleton<IEInvoiceProvider, EInvoice.FileExportEInvoiceProvider>();
        services.AddScoped<EInvoice.EInvoiceService>();
        return services;
    }
}
