using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Üst bardaki bildirimler: yaklaşan bakım/muayene/sigorta, şoför belge süreleri, vadesi geçen alacaklar.</summary>
public class AlertService(AppDbContext db, BalanceService balances)
{
    public const int MaintenanceWarnDays = 15;
    public const int DocumentWarnDays = 30;

    public async Task<List<AlertDto>> GetAsync(CancellationToken ct = default)
    {
        var today = Clock.Today;
        var alerts = new List<AlertDto>();

        void Check(DateOnly? date, int warnDays, string type, string title, string what, string link)
        {
            if (date is not { } d) return;
            var days = d.DayNumber - today.DayNumber;
            if (days > warnDays) return;
            var msg = days < 0 ? $"{what} {-days} gün önce doldu ({Formatters.Date(d)})."
                : days == 0 ? $"{what} bugün doluyor." : $"{what} {days} gün sonra ({Formatters.Date(d)}).";
            alerts.Add(new AlertDto(type, days < 0 ? "danger" : "warning", title, msg, link, d));
        }

        var vehicles = await db.Vehicles.AsNoTracking().ToListAsync(ct);
        foreach (var v in vehicles)
        {
            Check(v.NextMaintenanceDate, MaintenanceWarnDays, "maintenance", v.Plate, "Periyodik bakım", $"/araclar?id={v.Id}");
            Check(v.InspectionExpiry, DocumentWarnDays, "inspection", v.Plate, "Araç muayenesi", $"/araclar?id={v.Id}");
            Check(v.InsuranceExpiry, DocumentWarnDays, "insurance", v.Plate, "Trafik sigortası", $"/araclar?id={v.Id}");
        }

        var drivers = await db.Drivers.AsNoTracking().Where(d => d.IsActive).ToListAsync(ct);
        foreach (var d in drivers)
        {
            Check(d.LicenseExpiry, DocumentWarnDays, "license", d.FullName, "Ehliyet", $"/soforler?id={d.Id}");
            Check(d.SrcExpiry, DocumentWarnDays, "src", d.FullName, "SRC belgesi", $"/soforler?id={d.Id}");
            Check(d.PsychotechnicExpiry, DocumentWarnDays, "psychotechnic", d.FullName, "Psikoteknik belgesi", $"/soforler?id={d.Id}");
        }

        var overdue = (await balances.BalancesByCustomerAsync(null, ct))
            .Select(g => (CustomerId: g.Key, Items: g.Where(b => b.Remaining > 0 && b.DueDate < today).ToList()))
            .Where(x => x.Items.Count > 0).ToList();
        if (overdue.Count > 0)
        {
            var ids = overdue.Select(x => x.CustomerId).ToList();
            var titles = await db.Customers.AsNoTracking().Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Title, ct);
            foreach (var (customerId, items) in overdue)
            {
                var what = items.Any(b => b.InvoiceId < 0) ? "fatura/devir kaleminde" : "faturada";
                alerts.Add(new AlertDto("receivable", "danger", titles.GetValueOrDefault(customerId, "?"),
                    $"{items.Count} {what} vadesi geçmiş {Formatters.Currency(items.Sum(b => b.Remaining))} alacak.",
                    $"/musteriler/{customerId}", items.Min(b => b.DueDate)));
            }
        }

        return alerts.OrderBy(a => a.Severity == "danger" ? 0 : 1).ThenBy(a => a.Date).ToList();
    }
}
