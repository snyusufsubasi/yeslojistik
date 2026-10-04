using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// "U-ETDS'ye hazır mı?" kontrolünü veritabanındaki seferlere uygular. Bakanlığa bir şey GÖNDERMEZ;
/// bildirim için gereken bilgilerin eksiklerini listeler (kural: <see cref="UetdsReadiness"/>).
/// </summary>
public class UetdsService(AppDbContext db)
{
    private record Row(int TripId, int DriverId, int VehicleId, int CustomerId, UetdsInput Input);

    private static readonly Expression<Func<Trip, Row>> Projection = t => new Row(t.Id, t.DriverId, t.VehicleId, t.CustomerId,
        new UetdsInput(t.LoadingDate, t.LoadingTime, t.CargoType, t.CargoWeightKg, t.CargoQuantity, t.CargoUnit,
            t.LoadingCity, t.LoadingDistrict, t.DeliveryCity, t.DeliveryDistrict, t.ConsigneeTitle, t.ConsigneeTaxNumber, t.TrailerPlate,
            t.Driver.FullName, t.Driver.NationalId, t.Driver.IsForeign, t.Driver.Nationality, t.Driver.Phone,
            t.Vehicle.Plate, t.Vehicle.Type, t.Vehicle.TrailerPlate, t.Customer.Title, t.Customer.TaxNumber));

    public async Task<UetdsReadinessDto> CheckAsync(int tripId, CancellationToken ct = default)
    {
        var row = await db.Trips.AsNoTracking().Where(t => t.Id == tripId).Select(Projection).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Sefer bulunamadı.");
        var issues = UetdsReadiness.Check(row.Input);
        var missing = UetdsReadiness.MissingCount(issues);
        return new UetdsReadinessDto(tripId, missing == 0, missing, issues.Select(x => new UetdsIssueDto(x.Code, x.Target.ToString(),
            x.Target switch { UetdsTarget.Driver => row.DriverId, UetdsTarget.Vehicle => row.VehicleId, UetdsTarget.Customer => row.CustomerId, _ => row.TripId },
            x.Message, x.Field, x.Blocking)).ToList());
    }

    private static IQueryable<Trip> Applicable(IQueryable<Trip> query) =>
        query.Where(t => !t.IsLegacy && (t.Status == TripStatus.Planned || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad));

    /// <summary>Verilen sorgudaki seferlerden (yalnızca <see cref="UetdsReadiness.AppliesTo"/> olanlar) eksiği olanların numaraları.</summary>
    public async Task<List<int>> MissingTripIdsAsync(IQueryable<Trip> query, CancellationToken ct = default)
    {
        var rows = await Applicable(query).Select(Projection).ToListAsync(ct);
        return rows.Where(r => UetdsReadiness.MissingCount(UetdsReadiness.Check(r.Input)) > 0).Select(r => r.TripId).ToList();
    }

    /// <summary>Sayfadaki seferler için eksik sayısı (uygulanmayan seferler sözlükte yoktur).</summary>
    public async Task<Dictionary<int, int>> MissingCountsAsync(IReadOnlyCollection<int> tripIds, CancellationToken ct = default)
    {
        if (tripIds.Count == 0) return [];
        var rows = await Applicable(db.Trips.AsNoTracking().Where(t => tripIds.Contains(t.Id))).Select(Projection).ToListAsync(ct);
        return rows.ToDictionary(r => r.TripId, r => UetdsReadiness.MissingCount(UetdsReadiness.Check(r.Input)));
    }

    /// <summary>Panel uyarıları için: hazırlığı eksik, henüz teslim edilmemiş sefer sayısı.</summary>
    public async Task<int> MissingCountAsync(CancellationToken ct = default) => (await MissingTripIdsAsync(db.Trips.AsNoTracking(), ct)).Count;
}
