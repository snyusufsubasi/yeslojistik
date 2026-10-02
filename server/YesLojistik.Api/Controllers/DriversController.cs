using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record DriverQuery : ListQuery
{
    public bool? Active { get; init; }
    public int? SupplierId { get; init; }
}

[ApiController]
[Route("api/drivers")]
public class DriversController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Driver, object?>>> SortMap = new()
    {
        ["fullName"] = d => d.FullName,
        ["srcExpiry"] = d => d.SrcExpiry,
        ["licenseExpiry"] = d => d.LicenseExpiry,
        ["isActive"] = d => d.IsActive,
    };

    private static readonly Expression<Func<Driver, DriverDto>> Projection = Projections.Driver;

    private IQueryable<Driver> Filter(DriverQuery q)
    {
        var query = db.Drivers.AsNoTracking();
        if (q.Active is { } a) query = query.Where(d => d.IsActive == a);
        if (q.SupplierId is { } sup) query = query.Where(d => d.SupplierId == sup);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(d => EF.Functions.ILike(d.FullName, like) || EF.Functions.ILike(d.Phone ?? "", like)
                || EF.Functions.ILike(d.Plate ?? "", like) || EF.Functions.ILike(d.NationalId ?? "", like));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "fullName", defaultDesc: false);
    }

    /// <summary>Şoför listesinin Excel'i (pasif/aktif, arama ve sıralamayla).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DriverQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        return YesLojistik.Api.Infrastructure.FileResults.Excel(ExcelExporter.Export("Şoförler", rows,
            new ExcelColumn<DriverDto>("Ad Soyad", d => d.FullName),
            new("Telefon", d => d.Phone),
            new("TCKN", d => d.NationalId),
            new("Ehliyet Sınıfı", d => d.LicenseClass),
            new("Ehliyet No", d => d.LicenseNo),
            new("Ehliyet Bitiş", d => d.LicenseExpiry, ExcelExporter.DateFormat),
            new("SRC Bitiş", d => d.SrcExpiry, ExcelExporter.DateFormat),
            new("Psikoteknik Bitiş", d => d.PsychotechnicExpiry, ExcelExporter.DateFormat),
            new("Plaka", d => d.Plate),
            new("Taşeron", d => d.SupplierTitle),
            new("Değerlendirme", d => YesLojistik.Api.Infrastructure.ExportLabels.DriverRating(d.Rating)),
            new("Not", d => d.Note),
            new("Durum", d => YesLojistik.Api.Infrastructure.ExportLabels.Active(d.IsActive))), "soforler");
    }

    [HttpGet]
    public async Task<PagedResult<DriverDto>> List([FromQuery] DriverQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).Select(Projection).PageAsync(q, ct);
        // Mobil uygulama hesabı ve konum rızası (KVKK) listede görünsün.
        var ids = items.Select(d => d.Id).ToList();
        var accounts = await db.Users.AsNoTracking().Where(u => u.DriverId != null && ids.Contains(u.DriverId.Value) && u.IsActive)
            .Select(u => new { DriverId = u.DriverId!.Value, u.LocationConsentAt }).ToListAsync(ct);
        var withApp = items.Select(d => accounts.FirstOrDefault(a => a.DriverId == d.Id) is { } acc
            ? d with { HasAppAccount = true, LocationConsentAt = acc.LocationConsentAt } : d).ToList();
        return new PagedResult<DriverDto>(withApp, total, page, size);
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup(CancellationToken ct) =>
        await db.Drivers.AsNoTracking().Where(d => d.IsActive).OrderBy(d => d.FullName)
            .Select(d => new LookupItem(d.Id, d.FullName + (d.Supplier != null ? " (" + d.Supplier.Title + ")" : ""), d.SupplierId.ToString())).ToListAsync(ct);

    /// <summary>Şoför hesabı: avanslar, ödemeler, şoförün cebinden yaptığı onaylı masraflar ve yürüyen bakiye.</summary>
    [HttpGet("{id:int}/ledger")]
    public Task<DriverLedgerDto> Ledger(int id, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromServices] DriverLedgerService ledger,
        CancellationToken ct) => ledger.LedgerAsync(id, from, to, ct);

    [HttpGet("{id:int}/ledger/export")]
    public async Task<IActionResult> LedgerExport(int id, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromServices] DriverLedgerService ledger, CancellationToken ct)
    {
        var l = await ledger.LedgerAsync(id, from, to, ct);
        return YesLojistik.Api.Infrastructure.FileResults.Excel(ExcelExporter.Export("Şoför Hesabı", l.Rows,
            new ExcelColumn<DriverLedgerRow>("Tarih", r => r.Date, ExcelExporter.DateFormat),
            new("İşlem", r => r.Kind),
            new("Açıklama", r => r.Description),
            new("Onay", r => r.ApprovalStatus switch { ApprovalStatus.Pending => "Bekliyor", ApprovalStatus.Rejected => "Reddedildi", _ => "" }),
            new("Şoföre verilen", r => r.Debit, ExcelExporter.MoneyFormat),
            new("Şoförün harcadığı / geri verdiği", r => r.Credit, ExcelExporter.MoneyFormat),
            new("Bakiye", r => r.Balance, ExcelExporter.MoneyFormat)), "sofor-hesabi");
    }

    [HttpGet("{id:int}")]
    public async Task<DriverDto> Get(int id, CancellationToken ct) =>
        await db.Drivers.AsNoTracking().Where(d => d.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Şoför bulunamadı.");

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public async Task<DriverDto> Create(DriverSaveRequest req, CancellationToken ct)
    {
        var d = new Driver();
        await EnsureSupplierAsync(req.SupplierId, ct);
        Apply(d, req);
        db.Drivers.Add(d);
        await db.SaveChangesAsync(ct);
        return await Get(d.Id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public async Task<DriverDto> Update(int id, DriverSaveRequest req, CancellationToken ct)
    {
        var d = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şoför bulunamadı.");
        await EnsureSupplierAsync(req.SupplierId, ct);
        Apply(d, req);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var d = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Şoför bulunamadı.");
        if (await db.Trips.IgnoreQueryFilters().AnyAsync(t => t.DriverId == id, ct))
            throw new DomainException("Seferlerde görev almış şoför silinemez. Bunun yerine pasife alın.");
        d.IsDeleted = true;
        await db.Vehicles.Where(v => v.DefaultDriverId == id).ExecuteUpdateAsync(s => s.SetProperty(v => v.DefaultDriverId, (int?)null), ct);
        // Şoföre bağlı mobil uygulama hesabı varsa pasife al.
        await db.Users.Where(u => u.DriverId == id).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false).SetProperty(u => u.DriverId, (int?)null), ct);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task EnsureSupplierAsync(int? supplierId, CancellationToken ct)
    {
        if (supplierId is { } s && !await db.Suppliers.AnyAsync(x => x.Id == s, ct)) throw new DomainException("Tedarikçi bulunamadı.");
    }

    private static void Apply(Driver d, DriverSaveRequest r)
    {
        d.SupplierId = r.SupplierId;
        d.FullName = r.FullName.Trim();
        d.Phone = Formatters.NormalizePhone(r.Phone);
        d.NationalId = CustomersController.NullIfEmpty(r.NationalId);
        d.LicenseClass = CustomersController.NullIfEmpty(r.LicenseClass)?.ToUpperInvariant();
        d.LicenseExpiry = r.LicenseExpiry;
        d.SrcExpiry = r.SrcExpiry;
        d.PsychotechnicExpiry = r.PsychotechnicExpiry;
        d.IsActive = r.IsActive;
        d.LicenseNo = CustomersController.NullIfEmpty(r.LicenseNo);
        d.BirthYear = r.BirthYear;
        d.Address = CustomersController.NullIfEmpty(r.Address);
        d.IsForeign = r.IsForeign;
        d.Plate = Formatters.NormalizePlate(r.Plate) ?? CustomersController.NullIfEmpty(r.Plate)?.ToUpperInvariant();
        d.Rating = r.Rating;
        d.Note = CustomersController.NullIfEmpty(r.Note);
    }
}
