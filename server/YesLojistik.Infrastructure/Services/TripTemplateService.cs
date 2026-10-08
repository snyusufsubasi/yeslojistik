using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Sevkiyat şablonları: "Şablon olarak kaydet" (bir seferden ya da alanlardan) ve "Şablondan yeni sevkiyat".
/// Şablonda tarih, durum, belge ve fatura numaraları tutulmaz; yeni sevkiyat normal sevkiyat formundan kaydedilir.
/// </summary>
public class TripTemplateService(AppDbContext db)
{
    public async Task<List<TripTemplateDto>> ListAsync(int? customerId, CancellationToken ct = default)
    {
        var q = db.TripTemplates.AsNoTracking();
        if (customerId is { } c) q = q.Where(t => t.CustomerId == c);
        var rows = await q.OrderByDescending(t => t.UseCount).ThenByDescending(t => t.LastUsedAt).ThenBy(t => t.Name)
            .Select(t => new { T = t, Customer = t.Customer != null ? t.Customer.Title : null, Plate = t.Vehicle != null ? t.Vehicle.Plate : null,
                Driver = t.Driver != null ? t.Driver.FullName : null })
            .Take(200).ToListAsync(ct);
        return rows.Select(r => ToDto(r.T, r.Customer, r.Plate, r.Driver)).ToList();
    }

    public async Task<TripTemplateDto> GetAsync(int id, CancellationToken ct = default)
    {
        var r = await db.TripTemplates.AsNoTracking().Where(t => t.Id == id)
            .Select(t => new { T = t, Customer = t.Customer != null ? t.Customer.Title : null, Plate = t.Vehicle != null ? t.Vehicle.Plate : null,
                Driver = t.Driver != null ? t.Driver.FullName : null })
            .FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Şablon bulunamadı.");
        return ToDto(r.T, r.Customer, r.Plate, r.Driver);
    }

    /// <summary>Şablon kaydeder. TripId verilirse alanlar o seferden alınır (istekteki dolu alanlar üstüne yazar).</summary>
    public async Task<TripTemplateDto> CreateAsync(TripTemplateSaveRequest req, CancellationToken ct = default)
    {
        var t = new TripTemplate();
        if (req.TripId is { } tripId)
        {
            var trip = await db.Trips.AsNoTracking().FirstOrDefaultAsync(x => x.Id == tripId, ct) ?? throw new NotFoundException("Sefer bulunamadı.");
            t.CustomerId = trip.CustomerId; t.VehicleId = trip.VehicleId; t.DriverId = trip.DriverId;
            t.LoadingCity = trip.LoadingCity; t.LoadingDistrict = trip.LoadingDistrict; t.LoadingAddress = trip.LoadingAddress; t.LoadingContact = trip.LoadingContact;
            t.DeliveryCity = trip.DeliveryCity; t.DeliveryDistrict = trip.DeliveryDistrict; t.DeliveryAddress = trip.DeliveryAddress; t.DeliveryContact = trip.DeliveryContact;
            t.CargoType = trip.CargoType; t.CargoWeightKg = trip.CargoWeightKg; t.CargoQuantity = trip.CargoQuantity; t.CargoUnit = trip.CargoUnit;
            t.TransportMode = trip.TransportMode; t.TrailerType = trip.TrailerType;
            t.SalePrice = trip.SalePrice; t.VehicleCost = trip.VehicleCost; t.PaymentTerms = trip.PaymentTerms; t.Description = trip.Description;
        }
        if (req.CustomerId is { } cid) t.CustomerId = cid;
        if (req.VehicleId is { } vid) t.VehicleId = vid;
        if (req.DriverId is { } did) t.DriverId = did;
        t.LoadingCity = Cities.Normalize(req.LoadingCity) ?? t.LoadingCity;
        t.DeliveryCity = Cities.Normalize(req.DeliveryCity) ?? t.DeliveryCity;
        t.LoadingDistrict = Clean(req.LoadingDistrict) ?? t.LoadingDistrict;
        t.DeliveryDistrict = Clean(req.DeliveryDistrict) ?? t.DeliveryDistrict;
        t.LoadingAddress = Clean(req.LoadingAddress) ?? t.LoadingAddress;
        t.DeliveryAddress = Clean(req.DeliveryAddress) ?? t.DeliveryAddress;
        t.LoadingContact = Clean(req.LoadingContact) ?? t.LoadingContact;
        t.DeliveryContact = Clean(req.DeliveryContact) ?? t.DeliveryContact;
        t.CargoType = Clean(req.CargoType) ?? t.CargoType;
        t.CargoWeightKg = req.CargoWeightKg ?? t.CargoWeightKg;
        t.CargoQuantity = req.CargoQuantity ?? t.CargoQuantity;
        t.CargoUnit = Clean(req.CargoUnit) ?? t.CargoUnit;
        t.TransportMode = Clean(req.TransportMode) ?? t.TransportMode;
        t.TrailerType = Clean(req.TrailerType) ?? t.TrailerType;
        t.SalePrice = req.SalePrice is { } sp ? Money.Round(sp) : t.SalePrice;
        t.VehicleCost = req.VehicleCost is { } vc ? Money.Round(vc) : t.VehicleCost;
        t.PaymentTerms = Clean(req.PaymentTerms) ?? t.PaymentTerms;
        t.Description = Clean(req.Description) ?? t.Description;

        if (t.CustomerId is { } c && !await db.Customers.AnyAsync(x => x.Id == c, ct)) throw new DomainException("Müşteri bulunamadı.");
        if (t.VehicleId is { } v && !await db.Vehicles.AnyAsync(x => x.Id == v, ct)) t.VehicleId = null;
        if (t.DriverId is { } d && !await db.Drivers.AnyAsync(x => x.Id == d && x.IsActive, ct)) t.DriverId = null;
        if (t.CustomerId == null && string.IsNullOrWhiteSpace(t.LoadingAddress) && string.IsNullOrWhiteSpace(t.DeliveryAddress))
            throw new DomainException("Şablon için en az müşteri ya da güzergâh girin.");

        var name = Clean(req.Name) ?? await DefaultNameAsync(t, ct);
        t.Name = name.Length > 100 ? name[..100] : name;
        db.TripTemplates.Add(t);
        await db.SaveChangesAsync(ct);
        return await GetAsync(t.Id, ct);
    }

    /// <summary>Şablon kullanıldı: sayaç artar (listede sık kullanılan önce gelir).</summary>
    public async Task<TripTemplateDto> MarkUsedAsync(int id, CancellationToken ct = default)
    {
        var t = await db.TripTemplates.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şablon bulunamadı.");
        t.UseCount++;
        t.LastUsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task RenameAsync(int id, string name, CancellationToken ct = default)
    {
        var t = await db.TripTemplates.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şablon bulunamadı.");
        var n = Clean(name) ?? throw new DomainException("Şablon adı boş olamaz.");
        t.Name = n.Length > 100 ? n[..100] : n;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var t = await db.TripTemplates.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şablon bulunamadı.");
        t.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private async Task<string> DefaultNameAsync(TripTemplate t, CancellationToken ct)
    {
        var customer = t.CustomerId is { } c ? await db.Customers.AsNoTracking().Where(x => x.Id == c).Select(x => x.Title).FirstOrDefaultAsync(ct) : null;
        var from = t.LoadingCity ?? t.LoadingAddress;
        var to = t.DeliveryCity ?? t.DeliveryAddress;
        var route = string.IsNullOrWhiteSpace(from) && string.IsNullOrWhiteSpace(to) ? null : $"{from} → {to}";
        return string.Join(" · ", new[] { customer, route }.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static TripTemplateDto ToDto(TripTemplate t, string? customer, string? plate, string? driver) => new(
        t.Id, t.Name, t.CustomerId, customer, t.VehicleId, plate, t.DriverId, driver,
        t.LoadingCity, t.LoadingDistrict, t.LoadingAddress, t.LoadingContact, t.DeliveryCity, t.DeliveryDistrict, t.DeliveryAddress, t.DeliveryContact,
        t.CargoType, t.CargoWeightKg, t.CargoQuantity, t.CargoUnit, t.TransportMode, t.TrailerType, t.SalePrice, t.VehicleCost,
        t.PaymentTerms, t.Description, t.UseCount, t.LastUsedAt, t.CreatedAt);
}
