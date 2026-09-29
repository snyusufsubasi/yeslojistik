using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class TripService(AppDbContext db, DriverNotifier notifier, CustomerNotifier customerNotifier, ICurrentUser? current = null)
{
    private static readonly Dictionary<string, Expression<Func<Trip, object?>>> SortMap = new()
    {
        ["loadingDate"] = t => t.LoadingDate,
        ["deliveryDate"] = t => t.DeliveryDate,
        ["customer"] = t => t.Customer.Title,
        ["vehicle"] = t => t.Vehicle.Plate,
        ["driver"] = t => t.Driver.FullName,
        ["status"] = t => t.Status,
        ["salePrice"] = t => t.SalePrice,
        ["id"] = t => t.Id,
    };

    private record Row(Trip Trip, string CustomerTitle, string Plate, string VehicleType, string DriverName,
        decimal ExpenseTotal, string? InvoiceNo, string? CarrierTitle, VehicleOwnership Ownership, string? CommissionAccountName);

    private static readonly Expression<Func<Trip, Row>> Projection = t => new Row(
        t, t.Customer.Title, t.Vehicle.Plate, t.Vehicle.Type, t.Driver.FullName,
        t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0, t.Invoice != null ? t.Invoice.InvoiceNo : null,
        t.CarrierSupplier != null ? t.CarrierSupplier.Title : null, t.Vehicle.Ownership,
        t.CommissionAccount != null ? t.CommissionAccount.Name : null);

    private static TripDto ToDto(Row r)
    {
        var t = r.Trip;
        return new TripDto(t.Id, t.CustomerId, r.CustomerTitle, t.VehicleId, r.Plate, r.VehicleType, t.DriverId,
            r.DriverName, t.LoadingAddress, t.DeliveryAddress, t.LoadingDate, t.DeliveryDate, t.Description,
            t.VehicleCost, t.SalePrice, r.ExpenseTotal,
            Trip.Margin(t.SalePrice, t.VehicleCost, t.Commission, t.DriverBonus, t.ExtraCharge, t.ExtraChargeInvoiced) - r.ExpenseTotal, t.Status,
            TripStatusRules.NextStatuses(t.Status), t.InvoiceId, r.InvoiceNo, t.CustomerReference, t.CargoType, t.CargoWeightKg,
            t.CargoQuantity, t.CargoUnit, t.TrailerPlate, t.LoadingCity, t.DeliveryCity, t.LoadingContact, t.DeliveryContact,
            t.CarrierSupplierId, r.CarrierTitle, t.CarrierInvoiceNo, t.CarrierInvoiceDate, t.ReceivedBy, t.DeliveredAt, r.Ownership,
            t.JobRequestId, t.IsLegacy, TermsOf(t), r.CommissionAccountName);
    }

    private static TripTerms TermsOf(Trip t) => new(t.SaleVatRate, t.SaleWithholdingTenths, t.CostVatRate, t.CostWithholdingTenths,
        t.Commission, t.CommissionAccountId, t.CommissionStatus, t.CommissionInvoiced, t.CommissionVatIncluded,
        t.ExtraCharge, t.ExtraChargeInvoiced, t.ExtraChargeVatIncluded, t.ExtraChargeTaxNo, t.ExtraChargeTitle,
        t.DriverBonus, t.CustomerPays, t.CustomerGroup, t.DeliveryDocumentNo, t.DeliveryDocumentApproved, t.WaybillNo,
        t.EWaybillNo, t.EWaybillDate, t.LoadingLatitude, t.LoadingLongitude, t.DeliveryLatitude, t.DeliveryLongitude,
        t.DistanceKm, t.HideCarrierPrice, t.InvoiceFooterNote, t.ShowFooterNote, t.DeliveredBy, t.PaymentTerms, t.ExternalRef);

    public IQueryable<Trip> Filter(TripQuery q)
    {
        var query = db.Trips.AsNoTracking();
        if (q.Status is { } s) query = query.Where(t => t.Status == s);
        if (q.CustomerId is { } c) query = query.Where(t => t.CustomerId == c);
        if (q.VehicleId is { } v) query = query.Where(t => t.VehicleId == v);
        if (q.DriverId is { } d) query = query.Where(t => t.DriverId == d);
        if (q.From is { } from) query = query.Where(t => t.LoadingDate >= from);
        if (q.To is { } to) query = query.Where(t => t.LoadingDate <= to);
        if (q.Invoiced is { } inv) query = inv ? query.Where(t => t.InvoiceId != null) : query.Where(t => t.InvoiceId == null && !t.IsLegacy);
        if (q.CarrierSupplierId is { } cs) query = query.Where(t => t.CarrierSupplierId == cs);
        if (q.MissingCarrierInvoice == true)
            query = query.Where(t => !t.IsLegacy && t.CarrierSupplierId != null && t.Status == TripStatus.Delivered && t.CarrierInvoiceNo == null);
        if (q.MissingPrice == true)
            query = query.Where(t => t.Status != TripStatus.Cancelled && (t.SalePrice == 0 || t.VehicleCost == 0));
        if (q.PendingDeliveryDocument == true)
            query = query.Where(t => t.Status == TripStatus.Delivered && !t.DeliveryDocumentApproved);
        if (q.CommissionStatus is { } cst) query = query.Where(t => t.Commission > 0 && t.CommissionStatus == cst);
        if (!string.IsNullOrWhiteSpace(q.CustomerGroup)) query = query.Where(t => t.CustomerGroup == q.CustomerGroup.Trim());
        if (q.CarrierInvoiced is { } ci)
            query = ci ? query.Where(t => t.CarrierInvoiceNo != null) : query.Where(t => t.CarrierSupplierId != null && t.CarrierInvoiceNo == null);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(t => EF.Functions.ILike(t.Customer.Title, like) || EF.Functions.ILike(t.Vehicle.Plate, like)
                || EF.Functions.ILike(t.Driver.FullName, like) || EF.Functions.ILike(t.LoadingAddress, like)
                || EF.Functions.ILike(t.DeliveryAddress, like) || EF.Functions.ILike(t.CustomerReference ?? "", like)
                || EF.Functions.ILike(t.LoadingCity ?? "", like) || EF.Functions.ILike(t.DeliveryCity ?? "", like)
                || EF.Functions.ILike(t.ExternalRef ?? "", like) || EF.Functions.ILike(t.WaybillNo ?? "", like)
                || EF.Functions.ILike(t.DeliveryDocumentNo ?? "", like) || EF.Functions.ILike(t.CargoType ?? "", like)
                || EF.Functions.ILike(t.CarrierSupplier != null ? t.CarrierSupplier.Title : "", like));
        return query;
    }

    /// <summary>Filtredeki seferlerin kazanç tablosu. İptal edilen seferler sayılmaz.</summary>
    public async Task<TripTotalsDto> TotalsAsync(TripQuery q, CancellationToken ct = default)
    {
        var rows = await Filter(q).Where(t => t.Status != TripStatus.Cancelled).Select(t => new
        {
            t.SalePrice, t.VehicleCost, t.Commission, CommissionToBank = t.CommissionAccount != null && t.CommissionAccount.Kind != CashAccountKind.Cash,
            t.ExtraCharge, t.ExtraChargeInvoiced, t.DriverBonus,
            Expenses = t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0,
        }).ToListAsync(ct);
        var sale = rows.Sum(r => r.SalePrice);
        var cost = rows.Sum(r => r.VehicleCost);
        var bank = rows.Where(r => r.CommissionToBank).Sum(r => r.Commission);
        var cash = rows.Where(r => !r.CommissionToBank).Sum(r => r.Commission);
        var extra = rows.Where(r => !r.ExtraChargeInvoiced).Sum(r => r.ExtraCharge);
        var bonus = rows.Sum(r => r.DriverBonus);
        var expenses = rows.Sum(r => r.Expenses);
        return new TripTotalsDto(rows.Count, sale, cost, sale - cost, bank, cash, bank + cash, extra, bonus, expenses,
            sale - cost + bank + cash - extra - bonus - expenses);
    }

    /// <param name="export">Excel için: sayfa boyutu sınırı <see cref="QueryExtensions.ExportLimit"/> olur.</param>
    public async Task<PagedResult<TripDto>> ListAsync(TripQuery q, CancellationToken ct = default, bool export = false)
    {
        var (rows, total, page, size) = await Filter(q)
            .ApplySort(q.Sort, q.Desc, SortMap, "loadingDate")
            .Select(Projection)
            .PageAsync(q, ct, export ? QueryExtensions.ExportLimit : QueryExtensions.MaxPageSize);
        return new PagedResult<TripDto>(rows.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<TripTotalsDto> TotalsAsync(TripQuery q, CancellationToken ct = default)
    {
        var rows = await Filter(q).Where(t => t.Status != TripStatus.Cancelled)
            .Select(t => new
            {
                t.SalePrice, t.VehicleCost, Uninvoiced = t.InvoiceId == null && !t.IsLegacy && t.Status == TripStatus.Delivered,
                Expenses = t.Expenses.Where(e => e.ApprovalStatus == ApprovalStatus.Approved).Sum(e => (decimal?)e.Amount) ?? 0,
            })
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(), Sale = g.Sum(x => x.SalePrice), Cost = g.Sum(x => x.VehicleCost), Exp = g.Sum(x => x.Expenses),
                UnCount = g.Count(x => x.Uninvoiced), UnTotal = g.Where(x => x.Uninvoiced).Sum(x => x.SalePrice),
            })
            .FirstOrDefaultAsync(ct);
        return rows == null ? new TripTotalsDto(0, 0, 0, 0, 0, 0, 0)
            : new TripTotalsDto(rows.Count, rows.Sale, rows.Cost, rows.Exp, rows.Sale - rows.Cost - rows.Exp, rows.UnCount, rows.UnTotal);
    }

    public async Task<List<TripDto>> QueryAsync(IQueryable<Trip> query, CancellationToken ct = default) =>
        (await query.Select(Projection).ToListAsync(ct)).Select(ToDto).ToList();

    /// <summary>
    /// Yeni sefer formundaki öneriler. Müşteri verilirse son seferi ve kullandığı adresler; iki il verilirse o güzergâhın
    /// son bir yıldaki fiyat ortalaması (tüm müşteriler). İptal edilen seferler sayılmaz.
    /// </summary>
    public async Task<TripHintsDto> HintsAsync(int? customerId, string? loadingCity, string? deliveryCity, CancellationToken ct = default)
    {
        var live = db.Trips.AsNoTracking().Where(t => t.Status != TripStatus.Cancelled);
        TripDto? last = null;
        List<TripAddressHint> loading = [], delivery = [];
        if (customerId is { } cid)
        {
            var recent = live.Where(t => t.CustomerId == cid).OrderByDescending(t => t.LoadingDate).ThenByDescending(t => t.Id);
            last = (await QueryAsync(recent.Take(1), ct)).FirstOrDefault();
            var rows = await recent.Take(300)
                .Select(t => new { t.LoadingAddress, t.LoadingCity, t.LoadingContact, t.DeliveryAddress, t.DeliveryCity, t.DeliveryContact })
                .ToListAsync(ct);
            // Aynı adres farklı yazımla (büyük/küçük harf, boşluk) tek sayılır; en son kullanılan yazım ve yetkili gösterilir.
            static List<TripAddressHint> Group(IEnumerable<(string Address, string? City, string? Contact)> items) => items
                .Where(x => !string.IsNullOrWhiteSpace(x.Address))
                .GroupBy(x => (x.Address.Trim().ToLowerInvariant(), x.City))
                .Select(g => new TripAddressHint(g.First().Address.Trim(), g.First().City, g.FirstOrDefault(x => x.Contact != null).Contact, g.Count()))
                .OrderByDescending(h => h.Count).Take(8).ToList();
            loading = Group(rows.Select(r => (r.LoadingAddress, r.LoadingCity, r.LoadingContact)));
            delivery = Group(rows.Select(r => (r.DeliveryAddress, r.DeliveryCity, r.DeliveryContact)));
        }

        var cargo = (await live.Where(t => t.CargoType != null).OrderByDescending(t => t.Id).Take(500).Select(t => t.CargoType!).ToListAsync(ct))
            .GroupBy(c => c.Trim(), StringComparer.CurrentCultureIgnoreCase).OrderByDescending(g => g.Count()).Select(g => g.Key).Take(8).ToList();

        TripRouteHint? route = null;
        if (!string.IsNullOrWhiteSpace(loadingCity) && !string.IsNullOrWhiteSpace(deliveryCity))
        {
            var since = Clock.Today.AddYears(-1);
            var onRoute = live.Where(t => t.LoadingCity == loadingCity && t.DeliveryCity == deliveryCity && t.LoadingDate >= since && t.SalePrice > 0);
            // Ortalamalar son bir yılın tamamından, "son sefer" ayrıca en yeni kayıttan.
            var stats = await onRoute.GroupBy(_ => 1)
                .Select(g => new { Count = g.Count(), Sale = g.Average(t => t.SalePrice), Cost = g.Average(t => t.VehicleCost) })
                .FirstOrDefaultAsync(ct);
            var latest = await onRoute.OrderByDescending(t => t.LoadingDate).ThenByDescending(t => t.Id)
                .Select(t => new { t.SalePrice, t.VehicleCost, t.LoadingDate }).FirstOrDefaultAsync(ct);
            if (stats != null && latest != null)
                route = new TripRouteHint(stats.Count, Money.Round(stats.Sale), Money.Round(stats.Cost),
                    latest.SalePrice, latest.VehicleCost, latest.LoadingDate);
        }
        return new TripHintsDto(last, loading, delivery, cargo, route);
    }

    public async Task<TripDto> GetAsync(int id, CancellationToken ct = default)
    {
        var row = await db.Trips.AsNoTracking().Where(t => t.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Sefer bulunamadı.");
        return ToDto(row);
    }

    public async Task<TripDto> CreateAsync(TripSaveRequest req, CancellationToken ct = default)
    {
        await ValidateReferencesAsync(req, ct);
        JobRequest? jobRequest = null;
        if (req.JobRequestId is { } requestId)
        {
            jobRequest = await db.JobRequests.FirstOrDefaultAsync(r => r.Id == requestId, ct)
                ?? throw new NotFoundException("İş talebi bulunamadı.");
            if (jobRequest.Status != JobRequestStatus.Pending)
                throw new DomainException("Bu iş talebi zaten sevk edilmiş veya iptal edilmiş.");
            if (jobRequest.CustomerId != req.CustomerId)
                throw new DomainException("Sefer müşterisi iş talebindeki müşteriyle aynı olmalı.");
        }
        var trip = new Trip();
        Apply(trip, req);
        if (jobRequest != null)
        {
            trip.JobRequestId = jobRequest.Id;
            jobRequest.Status = JobRequestStatus.Converted;
        }
        await ApplyVehicleDefaultsAsync(trip, req, ct);
        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);
        AddEvent(trip.Id, TripStatus.Planned, TripEventSource.Panel);
        await db.SaveChangesAsync(ct);
        await notifier.NotifyAsync(trip.DriverId, trip.Id, "Yeni sefer atandı",
            DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate), ct);
        return await GetAsync(trip.Id, ct);
    }

    public async Task<TripDto> UpdateAsync(int id, TripSaveRequest req, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        await ValidateReferencesAsync(req, ct);
        if (trip.InvoiceId != null && (trip.CustomerId != req.CustomerId || trip.SalePrice != req.SalePrice))
            throw new DomainException("Faturalanmış seferin müşterisi veya satış fiyatı değiştirilemez. Önce faturayı iptal edin.");

        var oldVehicleId = trip.VehicleId;
        var oldDriverId = trip.DriverId;
        var oldRoute = (trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate);
        Apply(trip, req);
        await ApplyVehicleDefaultsAsync(trip, req, ct);
        if (oldVehicleId != trip.VehicleId && TripStatusRules.OccupiesVehicle(trip.Status))
        {
            await EnsureVehicleUsableAsync(trip.VehicleId, ct);
            await db.SaveChangesAsync(ct);
            await SyncVehicleStatusAsync(oldVehicleId, ct);
            await SyncVehicleStatusAsync(trip.VehicleId, ct);
        }
        await db.SaveChangesAsync(ct);

        var route = DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate);
        if (oldDriverId != trip.DriverId)
        {
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Yeni sefer atandı", route, ct);
            await notifier.NotifyAsync(oldDriverId, trip.Id, "Sefer başka şoföre aktarıldı", route, ct);
        }
        else if (oldRoute != (trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate))
        {
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Sefer bilgileri güncellendi", route, ct);
        }
        return await GetAsync(id, ct);
    }

    public Task<TripDto> ChangeStatusAsync(int id, TripStatus status, CancellationToken ct = default) =>
        ChangeStatusAsync(id, status, TripEventSource.Panel, null, null, ct);

    /// <param name="occurredAt">Olayın gerçek zamanı (şoför çevrimdışıyken). Gelecekteki ya da 7 günden eski saatler yok sayılır.</param>
    public async Task<TripDto> ChangeStatusAsync(int id, TripStatus status, TripEventSource source, DateTime? occurredAt, string? note,
        CancellationToken ct = default, string? receivedBy = null)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        if (!TripStatusRules.CanTransition(trip.Status, status))
            throw new DomainException($"Sefer '{TripStatusRules.Label(trip.Status)}' durumundan '{TripStatusRules.Label(status)}' durumuna geçemez.");
        if (status == TripStatus.Cancelled && trip.InvoiceId != null)
            throw new DomainException("Faturalanmış sefer iptal edilemez. Önce faturayı iptal edin.");
        if (TripStatusRules.OccupiesVehicle(status))
            await EnsureVehicleUsableAsync(trip.VehicleId, ct);

        trip.Status = status;
        var at = ClampOccurredAt(occurredAt);
        if (status == TripStatus.Delivered)
        {
            trip.DeliveryDate ??= Clock.Today;
            trip.DeliveredAt = at;
            if (!string.IsNullOrWhiteSpace(receivedBy)) trip.ReceivedBy = receivedBy.Trim().Length > 150 ? receivedBy.Trim()[..150] : receivedBy.Trim();
        }
        AddEvent(trip.Id, status, source, at, note);
        await db.SaveChangesAsync(ct);
        await SyncVehicleStatusAsync(trip.VehicleId, ct);
        await db.SaveChangesAsync(ct);
        if (status == TripStatus.Cancelled)
            await notifier.NotifyAsync(trip.DriverId, trip.Id, "Sefer iptal edildi",
                DriverNotifier.Route(trip.LoadingAddress, trip.DeliveryAddress, trip.LoadingDate), ct);
        await customerNotifier.StatusChangedAsync(trip.Id, status, ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
        if (trip.InvoiceId != null) throw new DomainException("Faturalanmış sefer silinemez. Önce faturayı iptal edin.");
        if (trip.JobRequestId is { } requestId)
        {
            var request = await db.JobRequests.FirstOrDefaultAsync(r => r.Id == requestId, ct);
            if (request != null) request.Status = JobRequestStatus.Pending;
            trip.JobRequestId = null;
        }
        trip.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        await SyncVehicleStatusAsync(trip.VehicleId, ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Araç, yüklenmiş veya yoldaki bir seferde kullanılıyorsa "Yolda", değilse "Müsait" olur.
    /// "Bakımda" durumu elle yönetilir ve seferler tarafından değiştirilmez.
    /// </summary>
    private async Task SyncVehicleStatusAsync(int vehicleId, CancellationToken ct)
    {
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle == null || vehicle.Status == VehicleStatus.Maintenance) return;
        var busy = await db.Trips.AnyAsync(t => t.VehicleId == vehicleId
            && (t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad), ct);
        vehicle.Status = busy ? VehicleStatus.OnRoad : VehicleStatus.Available;
    }

    private async Task EnsureVehicleUsableAsync(int vehicleId, CancellationToken ct)
    {
        var status = await db.Vehicles.Where(v => v.Id == vehicleId).Select(v => (VehicleStatus?)v.Status).FirstOrDefaultAsync(ct);
        if (status == VehicleStatus.Maintenance)
            throw new DomainException("Araç bakımda. Seferi başlatmadan önce aracın durumunu değiştirin.");
    }

    private async Task ValidateReferencesAsync(TripSaveRequest req, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == req.CustomerId, ct)) throw new DomainException("Müşteri bulunamadı.");
        if (!await db.Vehicles.AnyAsync(v => v.Id == req.VehicleId, ct)) throw new DomainException("Araç bulunamadı.");
        var driverActive = await db.Drivers.Where(d => d.Id == req.DriverId).Select(d => (bool?)d.IsActive).FirstOrDefaultAsync(ct);
        if (driverActive == null) throw new DomainException("Şoför bulunamadı.");
        if (driverActive == false) throw new DomainException("Pasif durumdaki şoföre sefer atanamaz.");
        if (req.Terms is { Commission: > 0, CommissionAccountId: { } acc } && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct))
            throw new DomainException("Komisyon hesabı bulunamadı.");
    }

    public async Task<List<TripEventDto>> EventsAsync(int id, CancellationToken ct = default)
    {
        if (!await db.Trips.AnyAsync(t => t.Id == id, ct)) throw new NotFoundException("Sefer bulunamadı.");
        return await db.TripEvents.AsNoTracking().Where(e => e.TripId == id).OrderBy(e => e.OccurredAt).ThenBy(e => e.Id)
            .Select(e => new TripEventDto(e.Id, e.Status, e.OccurredAt, e.RecordedAt, e.UserName, e.Source, e.Note)).ToListAsync(ct);
    }

    public static DateTime ClampOccurredAt(DateTime? occurredAt)
    {
        var now = DateTime.UtcNow;
        return occurredAt is { } o && o.ToUniversalTime() <= now.AddMinutes(5) && o.ToUniversalTime() > now.AddDays(-7) ? o.ToUniversalTime() : now;
    }

    private void AddEvent(int tripId, TripStatus status, TripEventSource source, DateTime? at = null, string? note = null) =>
        db.TripEvents.Add(new TripEvent
        {
            TripId = tripId, Status = status, Source = source, OccurredAt = at ?? DateTime.UtcNow, RecordedAt = DateTime.UtcNow,
            UserId = current?.Id, UserName = current?.Name, Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        });

    /// <summary>Kiralık araçta taşeron ve dorse varsayılan olarak araçtan gelir.</summary>
    private async Task ApplyVehicleDefaultsAsync(Trip trip, TripSaveRequest req, CancellationToken ct)
    {
        var v = await db.Vehicles.AsNoTracking().Where(x => x.Id == trip.VehicleId)
            .Select(x => new { x.Ownership, x.SupplierId, x.TrailerPlate }).FirstAsync(ct);
        if (req.CarrierSupplierId is { } cs)
        {
            if (!await db.Suppliers.AnyAsync(s => s.Id == cs, ct)) throw new DomainException("Taşeron (tedarikçi) bulunamadı.");
            trip.CarrierSupplierId = cs;
        }
        else
        {
            trip.CarrierSupplierId = v.Ownership == VehicleOwnership.Rented ? v.SupplierId : null;
        }
        trip.TrailerPlate ??= v.TrailerPlate;
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static void Apply(Trip t, TripSaveRequest r)
    {
        t.CustomerReference = Clean(r.CustomerReference);
        t.CargoType = Clean(r.CargoType);
        t.CargoWeightKg = r.CargoWeightKg;
        t.CargoQuantity = r.CargoQuantity;
        t.CargoUnit = Clean(r.CargoUnit);
        t.TrailerPlate = Formatters.NormalizePlate(r.TrailerPlate) ?? Clean(r.TrailerPlate)?.ToUpper(Formatters.Tr);
        t.LoadingCity = Cities.Normalize(r.LoadingCity);
        t.DeliveryCity = Cities.Normalize(r.DeliveryCity);
        t.LoadingContact = Clean(r.LoadingContact);
        t.DeliveryContact = Clean(r.DeliveryContact);
        t.CarrierInvoiceNo = Clean(r.CarrierInvoiceNo);
        t.CarrierInvoiceDate = r.CarrierInvoiceNo == null ? null : r.CarrierInvoiceDate;
        t.CustomerId = r.CustomerId;
        t.VehicleId = r.VehicleId;
        t.DriverId = r.DriverId;
        t.LoadingAddress = r.LoadingAddress.Trim();
        t.DeliveryAddress = r.DeliveryAddress.Trim();
        t.LoadingDate = r.LoadingDate;
        t.DeliveryDate = r.DeliveryDate;
        t.Description = r.Description?.Trim();
        t.VehicleCost = Money.Round(r.VehicleCost);
        t.SalePrice = Money.Round(r.SalePrice);
        ApplyTerms(t, r.Terms ?? new TripTerms());
    }

    private static void ApplyTerms(Trip t, TripTerms x)
    {
        t.SaleVatRate = x.SaleVatRate;
        t.SaleWithholdingTenths = x.SaleWithholdingTenths;
        t.CostVatRate = x.CostVatRate;
        t.CostWithholdingTenths = x.CostWithholdingTenths;
        t.Commission = Money.Round(x.Commission);
        t.CommissionAccountId = x.Commission > 0 ? x.CommissionAccountId : null;
        t.CommissionStatus = x.CommissionStatus;
        t.CommissionInvoiced = x.CommissionInvoiced;
        t.CommissionVatIncluded = x.CommissionVatIncluded;
        t.ExtraCharge = Money.Round(x.ExtraCharge);
        t.ExtraChargeInvoiced = x.ExtraChargeInvoiced;
        t.ExtraChargeVatIncluded = x.ExtraChargeVatIncluded;
        t.ExtraChargeTaxNo = Clean(x.ExtraChargeTaxNo);
        t.ExtraChargeTitle = Clean(x.ExtraChargeTitle);
        t.DriverBonus = Money.Round(x.DriverBonus);
        t.CustomerPays = x.CustomerPays;
        t.CustomerGroup = Clean(x.CustomerGroup);
        t.DeliveryDocumentNo = Clean(x.DeliveryDocumentNo);
        t.DeliveryDocumentApproved = x.DeliveryDocumentApproved;
        t.WaybillNo = Clean(x.WaybillNo);
        t.EWaybillNo = Clean(x.EWaybillNo);
        t.EWaybillDate = t.EWaybillNo == null ? null : x.EWaybillDate;
        t.LoadingLatitude = x.LoadingLatitude;
        t.LoadingLongitude = x.LoadingLongitude;
        t.DeliveryLatitude = x.DeliveryLatitude;
        t.DeliveryLongitude = x.DeliveryLongitude;
        t.DistanceKm = x.DistanceKm;
        t.HideCarrierPrice = x.HideCarrierPrice;
        t.InvoiceFooterNote = Clean(x.InvoiceFooterNote);
        t.ShowFooterNote = x.ShowFooterNote && t.InvoiceFooterNote != null;
        t.DeliveredBy = Clean(x.DeliveredBy);
        t.PaymentTerms = Clean(x.PaymentTerms);
        // Aktarım numarası yalnızca ilk kayıtta yazılır; formdan gelen boş değer silmez.
        t.ExternalRef ??= Clean(x.ExternalRef);
    }
}
