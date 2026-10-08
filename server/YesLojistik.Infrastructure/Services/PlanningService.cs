using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Planlama panosu (araç × gün). Tek istekte araçlar, aralığa düşen sevkiyat blokları, "Atanmamış" iş talepleri ve çakışmalar gelir.
/// İptal edilen sevkiyatlar gösterilmez.
/// </summary>
public class PlanningService(AppDbContext db, TripService trips)
{
    public const int DefaultDays = 7;
    public const int MaxDays = 31;

    public async Task<PlanningDto> GetAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var today = Clock.Today;
        var start = from ?? today;
        var end = to ?? start.AddDays(DefaultDays - 1);
        if (end < start) throw new DomainException("Bitiş tarihi başlangıçtan önce olamaz.");
        if (end.DayNumber - start.DayNumber + 1 > MaxDays) throw new DomainException($"Pano en fazla {MaxDays} gün gösterebilir.");

        var vehicles = await db.Vehicles.AsNoTracking()
            .OrderBy(v => v.Ownership).ThenBy(v => v.Plate)
            .Select(v => new PlanningVehicleDto(v.Id, v.Plate, v.Type, v.TrailerPlate, v.Ownership,
                v.Supplier != null ? v.Supplier.Title : null, v.Status, v.DefaultDriverId,
                v.DefaultDriver != null ? v.DefaultDriver.FullName : null))
            .ToListAsync(ct);

        var rows = await Overlapping(db.Trips.AsNoTracking(), start, end, today)
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.LoadingTime).ThenBy(t => t.Id)
            .Select(t => new
            {
                t.Id, t.ExternalRef, t.VehicleId, t.DriverId, Driver = t.Driver.FullName, Customer = t.Customer.Title, t.LoadingCity,
                t.DeliveryCity, t.LoadingAddress, t.DeliveryAddress, t.LoadingDate, t.DeliveryDate, t.LoadingTime, t.Status, t.ProblemReason,
                t.DeliveredAt,
            })
            .ToListAsync(ct);

        var spans = rows.ToDictionary(r => r.Id, r => (r.VehicleId, r.DriverId, Start: r.LoadingDate,
            End: EndOf(r.LoadingDate, r.DeliveryDate, r.Status, r.DeliveredAt, today)));
        var conflicts = Conflicts(spans.Select(kv => (kv.Key, kv.Value.VehicleId, kv.Value.Start, kv.Value.End)));
        var driverConflicts = DriverConflicts(spans.Select(kv => (kv.Key, kv.Value.VehicleId, kv.Value.DriverId, kv.Value.Start, kv.Value.End)));

        var lastEnd = spans.Count == 0 ? end : spans.Values.Max(s => s.End);
        var limit = Max(today.AddDays(DocumentWarnDays), Max(end, lastEnd));
        var (vehicleDocs, driverDocs) = await DocumentsAsync(limit, ct);
        var warnLimit = today.AddDays(DocumentWarnDays);
        List<PlanningDocDto> Soon(Dictionary<int, List<PlanningDocDto>> map, int id) =>
            map.TryGetValue(id, out var l) ? l.Where(d => d.Expiry <= warnLimit).OrderBy(d => d.Expiry).ToList() : [];

        var plates = vehicles.ToDictionary(v => v.Id, v => v.Plate);
        var items = rows.Select(r => new PlanningTripDto(r.Id, r.ExternalRef, r.VehicleId, r.DriverId, r.Driver, r.Customer, r.LoadingCity,
            r.DeliveryCity, r.LoadingAddress, r.DeliveryAddress, r.LoadingDate, r.DeliveryDate, spans[r.Id].End, r.LoadingTime, r.Status,
            conflicts.ContainsKey(r.Id), r.ProblemReason, r.Status == TripStatus.Planned, driverConflicts.ContainsKey(r.Id),
            TripWarnings(r.Status, spans[r.Id].End, plates.GetValueOrDefault(r.VehicleId) ?? "", vehicleDocs.GetValueOrDefault(r.VehicleId),
                r.Driver, driverDocs.GetValueOrDefault(r.DriverId)))).ToList();

        var requests = await db.JobRequests.AsNoTracking()
            .Where(r => r.Status == JobRequestStatus.Pending && r.Date <= end && r.Date >= start)
            .OrderBy(r => r.Date).ThenBy(r => r.Id)
            .Select(r => new PlanningRequestDto(r.Id, r.Customer.Title, r.Date, r.LoadingAddress, r.DeliveryAddress, r.VehicleType, r.CargoType,
                r.DeliveryWindow, r.SalePrice))
            .ToListAsync(ct);

        var drivers = await db.Drivers.AsNoTracking().Where(d => d.IsActive).OrderBy(d => d.SupplierId != null).ThenBy(d => d.FullName)
            .Select(d => new { d.Id, d.FullName, d.Phone, Supplier = d.Supplier != null ? d.Supplier.Title : null }).ToListAsync(ct);
        var driverList = drivers.Select(d => new PlanningDriverDto(d.Id, d.FullName, d.Phone, d.Supplier, Soon(driverDocs, d.Id))).ToList();
        var vehicleList = vehicles.Select(v => v with { Documents = Soon(vehicleDocs, v.Id) }).ToList();

        return new PlanningDto(start, end, today, vehicleList, items, requests, conflicts.Count, driverList, driverConflicts.Count,
            items.Count(i => i.Warnings is { Count: > 0 }));
    }

    public const int DocumentWarnDays = AlertService.DocumentWarnDays;

    private static DateOnly Max(DateOnly a, DateOnly b) => a > b ? a : b;

    /// <summary>
    /// Sevkiyat bitmeden (bitiş günü dahil) dolan araç ve şoför belgeleri. Teslim edilmiş sevkiyatta uyarı yok.
    /// Metin: "34 ABC 123: Araç muayenesi bitiş 12.10.2026".
    /// </summary>
    public static List<string> TripWarnings(TripStatus status, DateOnly tripEnd, string plate, List<PlanningDocDto>? vehicleDocs,
        string driver, List<PlanningDocDto>? driverDocs)
    {
        if (status is TripStatus.Delivered or TripStatus.Cancelled) return [];
        var list = new List<(DateOnly, string)>();
        foreach (var d in vehicleDocs ?? []) if (d.Expiry <= tripEnd) list.Add((d.Expiry, $"{plate}: {d.What} bitiş {d.Expiry.ToString("dd.MM.yyyy", Formatters.Tr)}"));
        foreach (var d in driverDocs ?? []) if (d.Expiry <= tripEnd) list.Add((d.Expiry, $"{driver}: {d.What} bitiş {d.Expiry.ToString("dd.MM.yyyy", Formatters.Tr)}"));
        return list.OrderBy(x => x.Item1).Select(x => x.Item2).ToList();
    }

    /// <summary>
    /// <paramref name="limit"/> gününe kadar dolan belgeler; araç (muayene, trafik sigortası, kasko, egzoz, Belgeler sekmesi) ve
    /// kendi aktif şoförlerimiz (ehliyet, SRC, psikoteknik, Belgeler sekmesi). Uyarı çubuğu ve "Bugün" ile aynı kaynaklar.
    /// </summary>
    private async Task<(Dictionary<int, List<PlanningDocDto>> Vehicles, Dictionary<int, List<PlanningDocDto>> Drivers)> DocumentsAsync(
        DateOnly limit, CancellationToken ct)
    {
        var vd = new Dictionary<int, List<PlanningDocDto>>();
        var dd = new Dictionary<int, List<PlanningDocDto>>();
        static void Add(Dictionary<int, List<PlanningDocDto>> map, int id, DateOnly? date, string what, DateOnly limit)
        {
            if (date is not { } x || x > limit) return;
            (map.TryGetValue(id, out var l) ? l : map[id] = []).Add(new PlanningDocDto(what, x));
        }

        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => v.InspectionExpiry <= limit || v.InsuranceExpiry <= limit || v.CascoExpiry <= limit || v.EmissionExpiry <= limit)
            .Select(v => new { v.Id, v.InspectionExpiry, v.InsuranceExpiry, v.CascoExpiry, v.EmissionExpiry }).ToListAsync(ct);
        foreach (var v in vehicles)
        {
            Add(vd, v.Id, v.InspectionExpiry, "Araç muayenesi", limit);
            Add(vd, v.Id, v.InsuranceExpiry, "Trafik sigortası", limit);
            Add(vd, v.Id, v.CascoExpiry, "Kasko", limit);
            Add(vd, v.Id, v.EmissionExpiry, "Egzoz emisyon", limit);
        }

        // Taşeron şoförlerinin belgeleri taşeronun sorumluluğunda ("Bugün" ekranıyla aynı kural).
        var drivers = await db.Drivers.AsNoTracking()
            .Where(d => d.IsActive && d.SupplierId == null && (d.LicenseExpiry <= limit || d.SrcExpiry <= limit || d.PsychotechnicExpiry <= limit))
            .Select(d => new { d.Id, d.LicenseExpiry, d.SrcExpiry, d.PsychotechnicExpiry }).ToListAsync(ct);
        foreach (var d in drivers)
        {
            Add(dd, d.Id, d.LicenseExpiry, "Ehliyet", limit);
            Add(dd, d.Id, d.SrcExpiry, "SRC belgesi", limit);
            Add(dd, d.Id, d.PsychotechnicExpiry, "Psikoteknik belgesi", limit);
        }

        var docs = await db.Documents.AsNoTracking()
            .Where(d => d.ExpiryDate != null && d.ExpiryDate <= limit && d.OwnerId != null && d.OwnerType != DocumentOwnerType.Company)
            .Select(d => new { d.OwnerType, d.OwnerId, d.Type, d.ExpiryDate }).ToListAsync(ct);
        foreach (var doc in docs)
            Add(doc.OwnerType == DocumentOwnerType.Vehicle ? vd : dd, doc.OwnerId!.Value, doc.ExpiryDate, FleetService.DocumentTypeLabel(doc.Type), limit);
        return (vd, dd);
    }

    public async Task<PlanningAssignResultDto> AssignAsync(PlanningAssignRequest req, CancellationToken ct = default)
    {
        if ((req.TripId == null) == (req.JobRequestId == null))
            throw new DomainException("Atanacak sevkiyatı ya da iş talebini seçin.");
        int tripId;
        var created = false;
        if (req.TripId is { } id)
        {
            tripId = (await trips.AssignAsync(id, req.VehicleId, req.DriverId, req.Date, ct)).Id;
        }
        else
        {
            tripId = await CreateFromRequestAsync(req.JobRequestId!.Value, req, ct);
            created = true;
        }
        var (vehicleConflicts, driverConflicts, warnings) = await ConflictsForAsync(tripId, ct);
        return new PlanningAssignResultDto(tripId, created, vehicleConflicts, driverConflicts, warnings);
    }

    /// <summary>Bekleyen iş talebinden sevkiyat açar (Sevkiyatlar'daki "iş talebinden sevkiyat" ile aynı alanlar).</summary>
    private async Task<int> CreateFromRequestAsync(int requestId, PlanningAssignRequest req, CancellationToken ct)
    {
        var r = await db.JobRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == requestId, ct)
            ?? throw new NotFoundException("İş talebi bulunamadı.");
        if (r.Status != JobRequestStatus.Pending) throw new DomainException("Bu iş talebi zaten sevk edilmiş veya iptal edilmiş.");
        var vehicle = await db.Vehicles.AsNoTracking().Where(v => v.Id == req.VehicleId).Select(v => new { v.DefaultDriverId }).FirstOrDefaultAsync(ct)
            ?? throw new DomainException("Araç bulunamadı.");
        var driverId = req.DriverId ?? vehicle.DefaultDriverId
            ?? throw new DomainException("Bu aracın varsayılan şoförü yok. Atarken şoför seçin.");
        var wholeQty = r.CargoQuantity is { } q && decimal.Truncate(q) == q && q <= int.MaxValue ? (int?)q : null;
        var description = string.Join("\n", new[]
        {
            r.Description,
            r.CargoQuantity is { } fq && wholeQty == null ? $"Yük miktarı: {fq.ToString("0.##", Formatters.Tr)}" : null,
        }.Where(x => !string.IsNullOrWhiteSpace(x)));
        var save = new TripSaveRequest(r.CustomerId, req.VehicleId, driverId, r.LoadingAddress, r.DeliveryAddress, req.Date ?? r.Date, null,
            description == "" ? null : description, r.CarrierPrice ?? 0, r.SalePrice ?? 0, CargoType: r.CargoType, CargoQuantity: wholeQty,
            JobRequestId: r.Id,
            Terms: new TripTerms(Commission: r.Commission ?? 0, ExtraCharge: r.OtherExpense ?? 0, DriverBonus: r.DriverBonus ?? 0,
                CustomerPays: r.CustomerPays, DeliveryDocumentNo: r.LoadingDocumentNo, WaybillNo: r.WaybillNo, InvoiceFooterNote: r.InvoiceFooterNote,
                ShowFooterNote: r.InvoiceFooterNote != null,
                LoadingLatitude: (double?)r.LoadingLatitude, LoadingLongitude: (double?)r.LoadingLongitude,
                DeliveryLatitude: (double?)r.DeliveryLatitude, DeliveryLongitude: (double?)r.DeliveryLongitude));
        var trip = await trips.CreateAsync(save, ct);
        await trips.AddAssignedEventAsync(trip.Id, ct);
        return trip.Id;
    }

    /// <summary>Bu sevkiyatla aynı araçta / aynı şoförde çakışan (iptal edilmemiş) sevkiyatlar ve belge uyarıları.</summary>
    private async Task<(List<int> Vehicle, List<int> Driver, List<string> Warnings)> ConflictsForAsync(int tripId, CancellationToken ct)
    {
        var today = Clock.Today;
        var t = await db.Trips.AsNoTracking().Where(x => x.Id == tripId)
            .Select(x => new { x.Id, x.VehicleId, x.DriverId, x.LoadingDate, x.DeliveryDate, x.Status, x.DeliveredAt, Plate = x.Vehicle.Plate,
                Driver = x.Driver.FullName })
            .FirstAsync(ct);
        var end = EndOf(t.LoadingDate, t.DeliveryDate, t.Status, t.DeliveredAt, today);
        var others = await Overlapping(db.Trips.AsNoTracking().Where(x => x.VehicleId == t.VehicleId || x.DriverId == t.DriverId),
                t.LoadingDate, end, today)
            .Select(x => new { x.Id, x.VehicleId, x.DriverId, x.LoadingDate, x.DeliveryDate, x.Status, x.DeliveredAt }).ToListAsync(ct);
        var spans = others.Select(o => (o.Id, o.VehicleId, o.DriverId, o.LoadingDate, EndOf(o.LoadingDate, o.DeliveryDate, o.Status, o.DeliveredAt, today)))
            .ToList();
        var vehicle = Conflicts(spans.Where(s => s.VehicleId == t.VehicleId).Select(s => (s.Id, s.VehicleId, s.LoadingDate, s.Item5)))
            .TryGetValue(tripId, out var vw) ? vw.Order().ToList() : [];
        var driver = DriverConflicts(spans.Where(s => s.DriverId == t.DriverId)).TryGetValue(tripId, out var dw) ? dw.Order().ToList() : [];
        var (vehicleDocs, driverDocs) = await DocumentsAsync(Max(end, today.AddDays(DocumentWarnDays)), ct);
        var warnings = TripWarnings(t.Status, end, t.Plate, vehicleDocs.GetValueOrDefault(t.VehicleId), t.Driver, driverDocs.GetValueOrDefault(t.DriverId));
        return (vehicle, driver, warnings);
    }

    /// <summary>
    /// Aynı şoförün farklı araçlardaki zamanı çakışan sevkiyatları (aynı araçtakiler zaten araç çakışmasıdır).
    /// Kural <see cref="Conflicts"/> ile aynı: teslim günü yeni yükleme normaldir.
    /// </summary>
    public static Dictionary<int, List<int>> DriverConflicts(IEnumerable<(int Id, int VehicleId, int DriverId, DateOnly Start, DateOnly End)> spans)
    {
        var list = spans.ToList();
        var vehicleOf = list.ToDictionary(s => s.Id, s => s.VehicleId);
        var byDriver = Conflicts(list.Select(s => (s.Id, s.DriverId, s.Start, s.End)));
        var result = new Dictionary<int, List<int>>();
        foreach (var (id, with) in byDriver)
        {
            var other = with.Where(o => vehicleOf[o] != vehicleOf[id]).ToList();
            if (other.Count > 0) result[id] = other;
        }
        return result;
    }

    /// <summary>[from, to] aralığına uzanan, iptal edilmemiş sevkiyatlar (bitiş: <see cref="EndOf"/> ile aynı kural).</summary>
    private static IQueryable<Trip> Overlapping(IQueryable<Trip> q, DateOnly from, DateOnly to, DateOnly today) =>
        q.Where(t => t.Status != TripStatus.Cancelled && t.LoadingDate <= to
            && ((t.DeliveryDate ?? t.LoadingDate) >= from
                || (t.DeliveryDate == null && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad) && today >= from)));

    /// <summary>
    /// Bloğun son günü: teslim tarihi; yoksa yüklenmiş/yoldaki seferde bugün (araç hâlâ meşgul), teslim edilmişse teslim anı,
    /// diğerlerinde yükleme günü. Hiçbir zaman yükleme gününden önce değildir.
    /// </summary>
    public static DateOnly EndOf(DateOnly loading, DateOnly? delivery, TripStatus status, DateTime? deliveredAt, DateOnly today)
    {
        var end = delivery
            ?? (status is TripStatus.Loaded or TripStatus.OnRoad ? today
                : status == TripStatus.Delivered && deliveredAt is { } at ? DateOnly.FromDateTime(at) : loading);
        return end < loading ? loading : end;
    }

    /// <summary>
    /// Aynı araçta zamanı çakışan sevkiyatlar. İki sevkiyat aynı gün yükleniyorsa ya da biri, diğerinin yüklemesi ile teslimi
    /// arasında (teslim günü hariç) yükleniyorsa çakışır. Bir aracın teslim ettiği gün yeni yük alması normaldir, uyarı vermez.
    /// </summary>
    public static Dictionary<int, List<int>> Conflicts(IEnumerable<(int Id, int VehicleId, DateOnly Start, DateOnly End)> spans)
    {
        var result = new Dictionary<int, List<int>>();
        foreach (var group in spans.GroupBy(s => s.VehicleId))
        {
            var list = group.OrderBy(s => s.Start).ThenBy(s => s.Id).ToList();
            for (var i = 0; i < list.Count; i++)
                for (var j = i + 1; j < list.Count; j++)
                {
                    var (a, b) = (list[i], list[j]);
                    if (b.Start > a.End) break;
                    if (b.Start == a.Start || b.Start < a.End)
                    {
                        (result.TryGetValue(a.Id, out var la) ? la : result[a.Id] = []).Add(b.Id);
                        (result.TryGetValue(b.Id, out var lb) ? lb : result[b.Id] = []).Add(a.Id);
                    }
                }
        }
        return result;
    }
}
