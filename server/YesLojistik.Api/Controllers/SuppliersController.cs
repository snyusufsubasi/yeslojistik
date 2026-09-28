using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Tedarikçiler: taşeron / kiralık araç sahipleri, servisler, akaryakıt istasyonları.</summary>
[ApiController]
[Route("api/suppliers")]
public class SuppliersController(AppDbContext db, PayableService payables) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Supplier, object?>>> SortMap = new()
    {
        ["title"] = s => s.Title,
        ["id"] = s => s.Id,
        ["kind"] = s => s.Kind,
        ["city"] = s => s.City,
    };

    [HttpGet]
    public async Task<PagedResult<SupplierDto>> List([FromQuery] SupplierQuery q, CancellationToken ct)
    {
        var query = db.Suppliers.AsNoTracking();
        if (q.Kind is { } k) query = query.Where(s => s.Kind == k);
        if (q.Active is { } a) query = query.Where(s => s.IsActive == a);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.TaxNumber ?? "", like)
                || EF.Functions.ILike(s.Phone ?? "", like) || EF.Functions.ILike(s.ContactName ?? "", like));
        var (items, total, page, size) = await query.ApplySort(q.Sort, q.Desc, SortMap, "title", defaultDesc: false).PageAsync(q, ct);
        var balances = await payables.BalancesAsync(items.Select(s => s.Id), ct);
        return new PagedResult<SupplierDto>(items.Select(s => ToDto(s, balances.GetValueOrDefault(s.Id))).ToList(), total, page, size);
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup([FromQuery] SupplierKind? kind, CancellationToken ct) =>
        await db.Suppliers.AsNoTracking().Where(s => s.IsActive && (kind == null || s.Kind == kind)).OrderBy(s => s.Title)
            .Select(s => new LookupItem(s.Id, s.Title, s.Kind.ToString())).ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<SupplierDto> Get(int id, CancellationToken ct)
    {
        var s = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        var balances = await payables.BalancesAsync([id], ct);
        return ToDto(s, balances.GetValueOrDefault(id));
    }

    [HttpPost]
    public async Task<SupplierDto> Create(SupplierSaveRequest req, CancellationToken ct)
    {
        var s = new Supplier();
        Apply(s, req);
        db.Suppliers.Add(s);
        await db.SaveChangesAsync(ct);
        return await Get(s.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<SupplierDto> Update(int id, SupplierSaveRequest req, CancellationToken ct)
    {
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        Apply(s, req);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        if (await payables.IsReferencedAsync(id, ct))
            throw new DomainException("Seferi, aracı, şoförü, gideri veya ödemesi olan tedarikçi silinemez. Bunun yerine pasife alın.");
        if (s.OpeningBalance > 0)
            throw new DomainException("Devir borcu olan tedarikçi silinemez. Önce devir bakiyesini sıfırlayın.");
        s.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public static SupplierDto ToDto(Supplier s, decimal balance) => new(s.Id, s.SupplierNo, s.Title, s.Kind, s.TaxNumber, s.TaxOffice,
        s.Phone, s.Email, s.Address, s.City, s.District, IbanValidator.Format(s.Iban), s.ContactName, s.PaymentTermDays, s.Notes,
        s.OpeningBalance, s.OpeningBalanceDate, s.IsActive, balance);

    private static void Apply(Supplier s, SupplierSaveRequest r)
    {
        s.Title = r.Title.Trim();
        s.Kind = r.Kind;
        s.TaxNumber = CustomersController.NullIfEmpty(r.TaxNumber);
        s.TaxOffice = CustomersController.NullIfEmpty(r.TaxOffice);
        s.Phone = Formatters.NormalizePhone(r.Phone);
        s.Email = CustomersController.NullIfEmpty(r.Email)?.ToLowerInvariant();
        s.Address = CustomersController.NullIfEmpty(r.Address);
        s.City = Cities.Normalize(r.City);
        s.District = CustomersController.NullIfEmpty(r.District);
        s.Iban = IbanValidator.Normalize(r.Iban);
        s.ContactName = CustomersController.NullIfEmpty(r.ContactName);
        s.PaymentTermDays = r.PaymentTermDays;
        s.Notes = CustomersController.NullIfEmpty(r.Notes);
        s.OpeningBalance = Money.Round(r.OpeningBalance);
        s.OpeningBalanceDate = r.OpeningBalance > 0 ? r.OpeningBalanceDate : null;
        s.IsActive = r.IsActive;
    }
}
