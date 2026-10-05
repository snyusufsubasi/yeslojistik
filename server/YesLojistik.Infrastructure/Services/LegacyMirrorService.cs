using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Pratikortam aynası: eski sistemin anlık görüntüsünü panele uygular (yan yana kullanım dönemi).
/// <list type="bullet">
/// <item>Her kayıt LegacyKey (sefer ve giderde ExternalRef) ile bulunur; anahtarı olmayan eski aktarım kayıtları
/// plaka, VKN, ünvan ya da adla eşleştirilip sahiplenilir. Bulunamazsa eklenir, değişmişse güncellenir.</item>
/// <item>Görüntüde olmayan kayıtlar geri alınabilir şekilde silinir (soft delete); tahsilat ve tedarikçi ödemeleri de
/// aynada tutulmaz. Bakiye pratikortam'daki rakamdır (LegacyBalance); seferler eski kayıttır, devirler 0'dır.</item>
/// <item>Yalnız ayna modu açıkken yazar. Bozuk bir görüntü (ör. boş liste) her şeyi silmesin diye, bir türde kayıtların
/// yarısından fazlası silinecekse allowLargeRemoval olmadan durur. Hepsi tek işlemdedir; dryRun geri alınır.</item>
/// </list>
/// </summary>
public partial class LegacyMirrorService(AppDbContext db)
{
    public async Task<MirrorResult> ApplyAsync(MirrorSnapshot snap, bool dryRun, bool allowLargeRemoval, string actor, CancellationToken ct = default)
    {
        var settings = await db.CompanySettings.FirstAsync(ct);
        if (!dryRun && !settings.MirrorMode)
            throw new DomainException("Pratikortam aynası kapalı. Önce Ayarlar'dan aynayı açın.");
        var at = (snap.TakenAt ?? DateTime.UtcNow).ToUniversalTime();
        var counts = new List<MirrorCount>();

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var suppliers = await SyncAsync("Tedarikçi", db.Suppliers, snap.Suppliers, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<Supplier, MirrorParty>(x => x.TaxNumber, x => x.Title, s => Tax(s.TaxNumber), s => s.Title),
            s => new Supplier { Kind = SupplierKind.Carrier },
            (x, s) =>
            {
                x.Title = Fit(s.Title, 200)!; x.TaxNumber = Tax(s.TaxNumber); x.TaxOffice = Fit(s.TaxOffice, 100); x.Phone = Phone(s.Phone);
                x.Email = Fit(s.Email, 200); x.Iban = Fit(s.Iban?.Replace(" ", ""), 34); x.City = Cities.Normalize(s.City); x.District = Fit(s.District, 50);
                x.ContactName = Fit(s.ContactName, 100); x.OpeningBalance = 0; x.OpeningBalanceDate = null; x.IsActive = true;
                SetBalance(x, s.Balance, at);
            }, allowLargeRemoval, counts, ct);

        var customers = await SyncAsync("Müşteri", db.Customers, snap.Customers, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<Customer, MirrorParty>(x => x.TaxNumber, x => x.Title, s => Tax(s.TaxNumber), s => s.Title),
            s => new Customer(),
            (x, s) =>
            {
                x.Title = Fit(s.Title, 200)!; x.TaxNumber = Tax(s.TaxNumber); x.TaxOffice = Fit(s.TaxOffice, 100); x.Phone = Phone(s.Phone);
                x.Email = Fit(s.Email, 200); x.City = Cities.Normalize(s.City); x.District = Fit(s.District, 50); x.ContactName = Fit(s.ContactName, 100);
                x.OpeningBalance = 0; x.OpeningBalanceDate = null; x.IsActive = true;
                SetBalance(x, s.Balance, at);
            }, allowLargeRemoval, counts, ct);

        var drivers = await SyncAsync("Şoför", db.Drivers, snap.Drivers, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<Driver, MirrorDriver>(null, x => x.FullName, null, s => s.FullName),
            s => new Driver(),
            (x, s) =>
            {
                x.FullName = Fit(s.FullName, 100)!; x.Phone = Phone(s.Phone); x.NationalId = Tax(s.NationalId); x.LicenseClass = Fit(s.LicenseClass, 20);
                x.SupplierId = s.SupplierKey == null ? null : Ref(suppliers, s.SupplierKey, "tedarikçi"); x.IsActive = true;
            }, allowLargeRemoval, counts, ct);

        var vehicles = await SyncAsync("Araç", db.Vehicles, snap.Vehicles, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<Vehicle, MirrorVehicle>(null, x => Formatters.NormalizePlate(x.Plate) ?? x.Plate, null,
                s => Formatters.NormalizePlate(s.Plate) ?? s.Plate),
            s => new Vehicle(),
            (x, s) =>
            {
                x.Plate = Formatters.NormalizePlate(s.Plate) ?? s.Plate.Trim(); x.Type = Fit(s.Type, 100)!;
                x.Ownership = s.Own ? VehicleOwnership.Own : VehicleOwnership.Rented;
                x.SupplierId = s.Own ? null : Ref(suppliers, s.OwnerKey ?? throw new DomainException($"{s.Plate}: kiralık aracın sahibi yok."), "tedarikçi");
                x.TrailerPlate = Formatters.NormalizePlate(s.TrailerPlate);
                if (s.Own)
                {
                    x.Brand = Fit(s.Brand, 50); x.ModelYear = s.ModelYear; x.InspectionExpiry = s.InspectionExpiry; x.InsuranceExpiry = s.InsuranceExpiry;
                }
            }, allowLargeRemoval, counts, ct);

        await SyncAsync("Kasa / Banka", db.CashAccounts, snap.CashAccounts, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<CashAccount, MirrorCashAccount>(null, x => x.Name, null, s => s.Name),
            s => new CashAccount { Kind = CashAccountKind.Bank },
            (x, s) => { x.Name = Fit(s.Name, 100)!; x.OpeningBalance = 0; x.OpeningBalanceDate = null; x.IsActive = true; },
            allowLargeRemoval, counts, ct);

        await SyncAsync("Personel", db.Staff, snap.Staff, s => s.Key,
            x => x.LegacyKey, (x, k) => x.LegacyKey = k, Adopt<Staff, MirrorStaff>(null, x => x.FullName, null, s => s.FullName),
            s => new Staff(),
            (x, s) =>
            {
                x.FullName = Fit(s.FullName, 100)!; x.NationalId = Tax(s.NationalId); x.Phone = Phone(s.Phone); x.StartDate = s.StartDate;
                x.MonthlySalary = Money.Round(s.MonthlySalary); x.Notes = Fit(s.Notes, 1000);
            }, allowLargeRemoval, counts, ct);

        var now = DateTime.UtcNow;
        var vehicleById = await db.Vehicles.AsNoTracking().ToDictionaryAsync(v => v.Id, ct);
        await SyncAsync("Sevkiyat", db.Trips, snap.Trips, s => s.Key,
            x => x.ExternalRef, (x, k) => x.ExternalRef = k,
            // Eski tek seferlik aktarımın seferleri açıklamadaki "Sevkiyat N" ile sahiplenilir.
            new Adopter<Trip, MirrorTrip>(x => SevkiyatNo().Match(x.Description ?? "") is { Success: true } m ? ["S" + m.Groups[1].Value] : [], s => [s.Key]),
            s => new Trip { IsLegacy = true, Status = TripStatus.Delivered, CostVatRate = 0, Events = [new TripEvent { Status = TripStatus.Delivered,
                Source = TripEventSource.Import, OccurredAt = now, RecordedAt = now, Note = "Pratikortam aynası" }] },
            (x, s) =>
            {
                x.CustomerId = Ref(customers, s.CustomerKey, "müşteri"); x.VehicleId = Ref(vehicles, s.VehicleKey, "araç");
                x.DriverId = Ref(drivers, s.DriverKey, "şoför");
                var v = vehicleById[x.VehicleId];
                x.CarrierSupplierId = v.Ownership == VehicleOwnership.Rented ? v.SupplierId : null; x.TrailerPlate = v.TrailerPlate;
                x.LoadingDate = s.Date; x.DeliveryDate = s.Date; x.LoadingAddress = Fit(s.LoadingAddress, 300) ?? "-"; x.DeliveryAddress = Fit(s.DeliveryAddress, 300) ?? "-";
                x.CargoType = Fit(s.CargoType, 100); x.VehicleCost = Money.Round(s.VehicleCost); x.SalePrice = Money.Round(s.SalePrice);
                x.Description = Fit(s.Description, 1000); x.DeliveryDocumentNo = Fit(s.DeliveryDocumentNo, 50);
                x.IsLegacy = true; x.Status = TripStatus.Delivered;
            }, allowLargeRemoval, counts, ct);

        await SyncAsync("Gider", db.Expenses, snap.Expenses, s => s.Key,
            x => x.ExternalRef, (x, k) => x.ExternalRef = k, null,
            s => new Expense(),
            (x, s) =>
            {
                x.Date = s.Date; x.Category = ImportService.Category(s.Category); x.Amount = Money.Round(s.Amount);
                x.VehicleId = s.VehicleKey == null ? null : Ref(vehicles, s.VehicleKey, "araç");
                x.Liters = s.Liters; x.Odometer = s.Odometer; x.Description = Fit(s.Description, 500);
            }, allowLargeRemoval, counts, ct);

        // Tahsilat ve ödemeler aynada tutulmaz (bakiye pratikortam rakamıdır); eski aktarımın devir kayıtları silinir.
        counts.Add(new MirrorCount("Tahsilat", 0, 0, await db.Payments.ExecuteUpdateAsync(p => p.SetProperty(x => x.IsDeleted, true), ct), 0));
        counts.Add(new MirrorCount("Tedarikçi ödemesi", 0, 0, await db.SupplierPayments.ExecuteUpdateAsync(p => p.SetProperty(x => x.IsDeleted, true), ct), 0));

        var changes = counts.Where(c => c.Created + c.Updated + c.Removed > 0)
            .Select(c => $"{c.Entity}: {Part(c.Created, "yeni")}{Part(c.Updated, "güncellendi")}{Part(c.Removed, "silindi")}".TrimEnd(' ', ',')).ToList();
        var text = changes.Count == 0 ? "değişiklik yok" : string.Join("; ", changes);
        if (dryRun)
        {
            await tx.RollbackAsync(ct);
            return new MirrorResult(true, counts, text);
        }
        settings.MirrorLastAt = DateTime.UtcNow;
        settings.MirrorLastSummary = text;
        var label = $"Pratikortam aynası: {text}";
        db.AuditLogs.Add(new AuditLog { At = DateTime.UtcNow, UserName = actor, Action = "Mirror", EntityType = nameof(CompanySettings), EntityId = settings.Id,
            Label = label[..Math.Min(label.Length, 200)] });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new MirrorResult(false, counts, text);
    }

    public async Task<MirrorStatusDto> StatusAsync(CancellationToken ct = default)
    {
        var s = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        return new MirrorStatusDto(s.MirrorMode, s.MirrorLastAt, s.MirrorLastSummary, Exceptions(s.SpellingExceptions));
    }

    public async Task SetModeAsync(bool enabled, CancellationToken ct = default)
    {
        var s = await db.CompanySettings.FirstAsync(ct);
        s.MirrorMode = enabled;
        await db.SaveChangesAsync(ct);
    }

    public async Task<Dictionary<string, string>> SetSpellingAsync(Dictionary<string, string> map, CancellationToken ct = default)
    {
        var clean = map.Where(kv => !string.IsNullOrWhiteSpace(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key.Trim().ToUpper(Formatters.Tr), kv => kv.Value.Trim());
        var s = await db.CompanySettings.FirstAsync(ct);
        s.SpellingExceptions = clean.Count == 0 ? null : JsonSerializer.Serialize(clean);
        await db.SaveChangesAsync(ct);
        return clean;
    }

    public static bool IsMirrorMode(AppDbContext db) => db.CompanySettings.AsNoTracking().Any(s => s.MirrorMode);

    private static Dictionary<string, string> Exceptions(string? json) =>
        string.IsNullOrEmpty(json) ? [] : JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? [];

    /// <summary>Anahtarı olmayan eski kayıtları sahiplenme kuralı: kaydın ve kaynağın doğal anahtarları (VKN, ad, plaka), sırayla denenir.</summary>
    private sealed record Adopter<TEntity, TSrc>(Func<TEntity, IEnumerable<string>> Entity, Func<TSrc, IEnumerable<string>> Source);

    private static Adopter<TEntity, TSrc> Adopt<TEntity, TSrc>(Func<TEntity, string?>? entityTax, Func<TEntity, string> entityName,
        Func<TSrc, string?>? srcTax, Func<TSrc, string> srcName) =>
        new(x => Keys(entityTax?.Invoke(x), entityName(x)), s => Keys(srcTax?.Invoke(s), srcName(s)));

    private static IEnumerable<string> Keys(string? tax, string name)
    {
        if (!string.IsNullOrEmpty(tax)) yield return "V" + tax;
        yield return "N" + Norm(name);
    }

    private async Task<Dictionary<string, int>> SyncAsync<TEntity, TSrc>(string name, DbSet<TEntity> set, IReadOnlyList<TSrc> source,
        Func<TSrc, string> key, Func<TEntity, string?> getKey, Action<TEntity, string> setKey, Adopter<TEntity, TSrc>? adopt,
        Func<TSrc, TEntity> create, Action<TEntity, TSrc> apply, bool allowLargeRemoval, List<MirrorCount> counts, CancellationToken ct)
        where TEntity : BaseEntity
    {
        var all = await set.IgnoreQueryFilters().ToListAsync(ct);
        var byKey = all.Where(x => getKey(x) != null).GroupBy(x => getKey(x)!).ToDictionary(g => g.Key, g => g.OrderBy(x => x.IsDeleted).First());
        var orphanList = adopt == null ? [] : all.Where(x => getKey(x) == null).OrderBy(x => x.IsDeleted).ToList();
        var orphans = new Dictionary<string, TEntity>();
        foreach (var x in orphanList)
            foreach (var k in adopt!.Entity(x)) orphans.TryAdd(k, x);
        var adopted = new HashSet<TEntity>(ReferenceEqualityComparer.Instance);
        var touched = new HashSet<TEntity>(ReferenceEqualityComparer.Instance);
        var result = new Dictionary<string, int>();
        var created = 0;
        foreach (var s in source)
        {
            var k = key(s);
            if (result.ContainsKey(k)) throw new DomainException($"{name}: aynı anahtar iki kez geldi ({k}).");
            if (!byKey.TryGetValue(k, out var x) && adopt != null
                && adopt.Source(s).Select(ak => orphans.GetValueOrDefault(ak)).FirstOrDefault(o => o != null && !adopted.Contains(o)) is { } o)
            {
                x = o; adopted.Add(o); setKey(x, k);
            }
            var isNew = x == null;
            if (x == null) { x = create(s); setKey(x, k); set.Add(x); }
            apply(x, s);
            x.IsDeleted = false;
            touched.Add(x);
            if (isNew) created++;
            result[k] = 0;
        }
        db.ChangeTracker.DetectChanges();
        var updated = touched.Count(x => db.Entry(x).State == EntityState.Modified);
        var remove = all.Where(x => !x.IsDeleted && !touched.Contains(x)).ToList();
        var live = all.Count(x => !x.IsDeleted);
        if (!allowLargeRemoval && live > 0 && remove.Count * 2 > live)
            throw new DomainException($"{name}: {live} kaydın {remove.Count} tanesi silinecekti. Pratikortam'dan gelen veri eksik olabilir; senkron durduruldu.");
        foreach (var x in remove) x.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        foreach (var x in touched) result[getKey(x)!] = x.Id;
        counts.Add(new MirrorCount(name, created, updated, remove.Count, source.Count - created - updated));
        return result;
    }

    /// <summary>Bakiye ve okunduğu an yalnız rakam değişince yazılır (aynı rakam her senkronda "güncellendi" sayılmasın).</summary>
    private static void SetBalance(Customer x, decimal? balance, DateTime at)
    {
        if (x.LegacyBalance == balance) return;
        x.LegacyBalance = balance; x.LegacyBalanceAt = balance == null ? null : at;
    }

    private static void SetBalance(Supplier x, decimal? balance, DateTime at)
    {
        if (x.LegacyBalance == balance) return;
        x.LegacyBalance = balance; x.LegacyBalanceAt = balance == null ? null : at;
    }

    private static int Ref(Dictionary<string, int> map, string key, string what) =>
        map.TryGetValue(key, out var id) ? id : throw new DomainException($"Aynada {what} bulunamadı: {key}");

    private static string Part(int n, string label) => n > 0 ? $"{n} {label}, " : "";
    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    private static string? Phone(string? s) => Formatters.NormalizePhone(s) ?? Fit(s, 20);
    private static string? Fit(string? s, int max) => Clean(s) is { } c ? c[..Math.Min(c.Length, max)] : null;
    /// <summary>VKN/TCKN: yalnız 10-11 haneli rakamsa saklanır (eski paneldeki hatalı numaralar boş kalır).</summary>
    private static string? Tax(string? s) => Clean(s) is { } c && c.Length is 10 or 11 && c.All(char.IsDigit) ? c : null;
    private static string Norm(string s) => new(s.ToLower(Formatters.Tr).Where(char.IsLetterOrDigit).ToArray());

    [GeneratedRegex(@"^Sevkiyat (\d+)")]
    private static partial Regex SevkiyatNo();
}
