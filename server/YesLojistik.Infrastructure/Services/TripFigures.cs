using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Raporlar için seferin gruplama alanları ve kazanç tutarları. Veritabanından ham tutarlar okunur, kâr bellekte
/// <see cref="TripProfit"/> ile hesaplanır; böylece formül tek yerde kalır.
/// </summary>
public sealed record TripFigures(int Id, DateOnly Date, TripStatus Status, int CustomerId, string Customer, int VehicleId, string Plate,
    string VehicleType, int DriverId, string Driver, string? LoadingCity, string? DeliveryCity, string LoadingAddress, string DeliveryAddress,
    bool HasCarrier, TripMoney Money)
{
    public static readonly Expression<Func<Trip, TripFigures>> Projection = t => new TripFigures(
        t.Id, t.LoadingDate, t.Status, t.CustomerId, t.Customer.Title, t.VehicleId, t.Vehicle.Plate, t.Vehicle.Type, t.DriverId, t.Driver.FullName,
        t.LoadingCity, t.DeliveryCity, t.LoadingAddress, t.DeliveryAddress, t.CarrierSupplierId != null,
        new TripMoney(t.SalePrice, t.VehicleCost, t.Commission, t.DriverBonus, t.ExtraCharge, t.ExtraChargeInvoiced,
            Core.Domain.Money.Round(t.Expenses.AsQueryable().Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Select(ExpenseVat.NetAmount).Sum()),
            t.CommissionVatIncluded, t.ExtraChargeVatIncluded, t.SaleVatRate));

    /// <summary>Sorgudaki iptal edilmemiş seferler (raporlarda iptaller sayılmaz).</summary>
    public static Task<List<TripFigures>> LoadAsync(IQueryable<Trip> query, CancellationToken ct) =>
        query.AsNoTracking().Where(t => t.Status != TripStatus.Cancelled)
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id)
            .Select(Projection).ToListAsync(ct);

    public static Task<List<TripFigures>> LoadAsync(IQueryable<Trip> trips, DateOnly from, DateOnly to, CancellationToken ct) =>
        LoadAsync(trips.Where(t => t.LoadingDate >= from && t.LoadingDate <= to), ct);
}

public static class TripFiguresExtensions
{
    public static TripMoneyTotals Totals(this IEnumerable<TripFigures> rows) => TripMoneyTotals.Of(rows.Select(r => r.Money));
}
