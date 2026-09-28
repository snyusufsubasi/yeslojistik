using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Tedarikçi (taşeron) borçları. Borç saklanmaz, hesaplanır: devir + yüklenmiş/yoldaki/teslim edilmiş kiralık araç seferlerinin maliyeti.
/// </summary>
public class PayableService(AppDbContext db)
{
    /// <summary>Borç doğuran sefer durumları: planlanmış ve iptal edilmiş seferler borç doğurmaz.</summary>
    public static readonly TripStatus[] AccruingStatuses = [TripStatus.Loaded, TripStatus.OnRoad, TripStatus.Delivered];

    /// <summary>Tedarikçi başına toplam borç (firmanın ödemesi gereken).</summary>
    public async Task<Dictionary<int, decimal>> BalancesAsync(IEnumerable<int> supplierIds, CancellationToken ct = default)
    {
        var ids = supplierIds.Distinct().ToList();
        var openings = await db.Suppliers.Where(s => ids.Contains(s.Id)).Select(s => new { s.Id, s.OpeningBalance }).ToListAsync(ct);
        var trips = await db.Trips.Where(t => t.CarrierSupplierId != null && ids.Contains(t.CarrierSupplierId.Value) && AccruingStatuses.Contains(t.Status))
            .GroupBy(t => t.CarrierSupplierId!.Value).Select(g => new { Id = g.Key, Total = g.Sum(t => t.VehicleCost) }).ToListAsync(ct);
        var tripTotals = trips.ToDictionary(x => x.Id, x => x.Total);
        return openings.ToDictionary(o => o.Id, o => o.OpeningBalance + tripTotals.GetValueOrDefault(o.Id));
    }

    public async Task<bool> IsReferencedAsync(int supplierId, CancellationToken ct = default) =>
        await db.Trips.IgnoreQueryFilters().AnyAsync(t => t.CarrierSupplierId == supplierId, ct)
        || await db.Vehicles.AnyAsync(v => v.SupplierId == supplierId, ct)
        || await db.Drivers.AnyAsync(d => d.SupplierId == supplierId, ct);
}
