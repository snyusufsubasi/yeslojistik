using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Core.Abstractions;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString, string storagePath = "data/uploads")
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());
        services.AddScoped<BalanceService>();
        services.AddScoped<TripService>();
        services.AddScoped<InvoiceService>();
        services.AddScoped<InvoicePdfGenerator>();
        services.AddScoped<CustomerAccountService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<AlertService>();
        services.AddScoped<ReportService>();
        services.AddScoped<AttachmentService>();
        services.AddScoped<TrackingService>();
        services.AddScoped<DriverAppService>();
        services.AddScoped<ImportService>();
        services.AddScoped<DriverNotifier>();
        services.AddScoped<InvoiceMailer>();
        services.AddHttpClient<IPushSender, ExpoPushSender>(c => c.Timeout = TimeSpan.FromSeconds(5));
        services.AddSingleton<IFileStorage>(new LocalFileStorage(storagePath));
        services.AddSingleton<IEInvoiceProvider, NullEInvoiceProvider>();
        return services;
    }
}
