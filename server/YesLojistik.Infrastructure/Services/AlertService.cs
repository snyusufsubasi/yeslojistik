using YesLojistik.Core.Entities;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Üst bardaki bildirimler: yaklaşan bakım/muayene/sigorta, şoför belge süreleri, vadesi geçen alacaklar.</summary>
public class AlertService(AppDbContext db, BalanceService balances, PayableService payables)
{
    public const int MaintenanceWarnDays = 15;
    public const int DocumentWarnDays = 30;
    public const int MaintenanceWarnKm = 1_000;
    public const int InstrumentWarnDays = 7;

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
            if (v.NextMaintenanceKm is { } dueKm && dueKm - v.Km <= MaintenanceWarnKm)
            {
                var left = dueKm - v.Km;
                alerts.Add(new AlertDto("maintenance-km", left < 0 ? "danger" : "warning", v.Plate,
                    left < 0 ? $"Bakım kilometresi {-left:N0} km geçti ({dueKm:N0} km)." : $"Bakıma {left:N0} km kaldı ({dueKm:N0} km).",
                    $"/araclar?id={v.Id}", null));
            }
        }

        // Belgeler sekmesindeki belgeler (kasko, K belgesi, takograf…). Pasif/silinmiş araç ve şoförlerin belgeleri uyarılmaz.
        var docs = await db.Documents.AsNoTracking().Where(d => d.ExpiryDate != null && d.ExpiryDate <= today.AddDays(DocumentWarnDays)).ToListAsync(ct);
        if (docs.Count > 0)
        {
            var plates = vehicles.ToDictionary(v => v.Id, v => v.Plate);
            var names = await db.Drivers.AsNoTracking().Where(d => d.IsActive).ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
            foreach (var doc in docs)
            {
                var label = FleetService.DocumentTypeLabel(doc.Type);
                switch (doc.OwnerType)
                {
                    case DocumentOwnerType.Vehicle when doc.OwnerId is { } vid && plates.TryGetValue(vid, out var plate):
                        Check(doc.ExpiryDate, DocumentWarnDays, "document", plate, label, $"/araclar?id={vid}");
                        break;
                    case DocumentOwnerType.Driver when doc.OwnerId is { } did && names.TryGetValue(did, out var name):
                        Check(doc.ExpiryDate, DocumentWarnDays, "document", name, label, $"/soforler?id={did}");
                        break;
                    case DocumentOwnerType.Company:
                        Check(doc.ExpiryDate, DocumentWarnDays, "document", "Firma", label, "/ayarlar");
                        break;
                }
            }
        }

        // Taşeronun şoförlerinin belgeleri taşeronun sorumluluğunda; yalnızca kendi şoförlerimiz uyarılır.
        var drivers = await db.Drivers.AsNoTracking().Where(d => d.IsActive && d.SupplierId == null).ToListAsync(ct);
        foreach (var d in drivers)
        {
            Check(d.LicenseExpiry, DocumentWarnDays, "license", d.FullName, "Ehliyet", $"/soforler?id={d.Id}");
            Check(d.SrcExpiry, DocumentWarnDays, "src", d.FullName, "SRC belgesi", $"/soforler?id={d.Id}");
            Check(d.PsychotechnicExpiry, DocumentWarnDays, "psychotechnic", d.FullName, "Psikoteknik belgesi", $"/soforler?id={d.Id}");
        }

        var allBalances = await balances.BalancesByCustomerAsync(null, ct);
        var overdue = allBalances
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

        // Vadesi 7 gün içinde gelen (ya da geçmiş) portföydeki çek/senetler.
        var dueInstruments = await db.Payments.AsNoTracking()
            .Where(p => (p.InstrumentStatus == InstrumentStatus.Portfolio || p.InstrumentStatus == InstrumentStatus.InCollection)
                && p.InstrumentDueDate != null && p.InstrumentDueDate <= today.AddDays(InstrumentWarnDays))
            .Select(p => new { p.Id, p.Method, p.InstrumentNo, p.InstrumentDueDate, p.Amount, Customer = p.Customer.Title }).ToListAsync(ct);
        foreach (var p in dueInstruments)
            Check(p.InstrumentDueDate, InstrumentWarnDays, "instrument", p.Customer,
                $"{CustomerAccountService.MethodLabel(p.Method)} {p.InstrumentNo} ({Formatters.Currency(p.Amount)}) vadesi", "/cek-senet");

        // Risk limiti aşılan müşteriler: açık bakiye + faturalanmamış yüklenmiş/yolda/teslim seferler.
        var limited = await db.Customers.AsNoTracking().Where(c => c.CreditLimit != null).Select(c => new { c.Id, c.Title, c.CreditLimit }).ToListAsync(ct);
        if (limited.Count > 0)
        {
            var ids = limited.Select(c => c.Id).ToList();
            var uninvoiced = await db.Trips.Where(t => ids.Contains(t.CustomerId) && t.InvoiceId == null
                    && (t.Status == TripStatus.Delivered || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad))
                .GroupBy(t => t.CustomerId).Select(g => new { g.Key, Sum = g.Sum(t => t.SalePrice) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
            foreach (var c in limited)
            {
                var used = allBalances[c.Id].Sum(b => b.Remaining) + uninvoiced.GetValueOrDefault(c.Id);
                if (used > c.CreditLimit)
                    alerts.Add(new AlertDto("credit-limit", "danger", c.Title,
                        $"Risk limiti aşıldı: {Formatters.Currency(used)} / {Formatters.Currency(c.CreditLimit!.Value)}.", $"/musteriler/{c.Id}", null));
            }
        }

        // Taşeron / tedarikçi borçları: vadesi geçmiş ödemeler.
        var payableItems = await payables.ItemsAsync(null, ct);
        var duePayables = payableItems.Where(i => i.Remaining > 0 && i.DueDate < today).GroupBy(i => i.SupplierId).ToList();
        if (duePayables.Count > 0)
        {
            var ids = duePayables.Select(g => g.Key).ToList();
            var titles = await db.Suppliers.AsNoTracking().Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Title, ct);
            foreach (var g in duePayables)
                alerts.Add(new AlertDto("payable", "warning", titles.GetValueOrDefault(g.Key, "?"),
                    $"Vadesi geçmiş {Formatters.Currency(g.Sum(i => i.Remaining))} ödeme (taşeron/tedarikçi).", $"/tedarikciler/{g.Key}", g.Min(i => i.DueDate)));
        }
        var cutoff = today.AddDays(-15);
        var missing = await db.Trips.AsNoTracking().Where(t => t.CarrierSupplierId != null && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null
                && (t.DeliveryDate ?? t.LoadingDate) < cutoff)
            .GroupBy(t => new { t.CarrierSupplierId, t.CarrierSupplier!.Title })
            .Select(g => new { g.Key.CarrierSupplierId, g.Key.Title, Count = g.Count(), FirstDate = g.Min(t => t.DeliveryDate ?? t.LoadingDate) }).ToListAsync(ct);
        foreach (var m in missing)
            alerts.Add(new AlertDto("carrier-invoice", "warning", m.Title,
                $"{m.Count} teslim edilmiş seferin taşeron faturası 15 günü geçtiği halde girilmedi.", $"/tedarikciler/{m.CarrierSupplierId}", m.FirstDate));

        return alerts.OrderBy(a => a.Severity == "danger" ? 0 : 1).ThenBy(a => a.Date).ToList();
    }
}
