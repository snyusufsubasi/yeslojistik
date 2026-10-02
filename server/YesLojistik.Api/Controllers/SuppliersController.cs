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

    private IQueryable<Supplier> Filter(SupplierQuery q)
    {
        var query = db.Suppliers.AsNoTracking();
        if (q.Kind is { } k) query = query.Where(s => s.Kind == k);
        if (q.Active is { } a) query = query.Where(s => s.IsActive == a);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.TaxNumber ?? "", like)
                || EF.Functions.ILike(s.Phone ?? "", like) || EF.Functions.ILike(s.ContactName ?? "", like));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "title", defaultDesc: false);
    }

    [HttpGet]
    public async Task<PagedResult<SupplierDto>> List([FromQuery] SupplierQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).PageAsync(q, ct);
        var balances = await payables.BalancesAsync(items.Select(s => s.Id), ct);
        return new PagedResult<SupplierDto>(items.Select(s => ToDto(s, balances.GetValueOrDefault(s.Id))).ToList(), total, page, size);
    }

    /// <summary>Tedarikçi listesinin Excel'i (tür, arama ve sıralamayla), altında toplam borç.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] SupplierQuery q, CancellationToken ct)
    {
        var items = await Filter(q).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        var balances = await payables.BalancesAsync(items.Select(s => s.Id), ct);
        var rows = items.Select(s => ToDto(s, balances.GetValueOrDefault(s.Id))).ToList();
        var total = new SupplierDto(0, "", "Toplam", SupplierKind.Other, null, null, null, null, null, null, null, null, null, 0, null,
            rows.Sum(s => s.OpeningBalance), null, true, rows.Sum(s => s.Balance));
        return Api.Infrastructure.FileResults.Excel(ExcelExporter.ExportWithTotal("Tedarikçiler", rows, total,
            new ExcelColumn<SupplierDto>("No", s => s.SupplierNo),
            new("Ünvan", s => s.Title),
            new("Tür", s => s.Id == 0 ? null : Api.Infrastructure.ExportLabels.SupplierKind(s.Kind)),
            new("VKN/TCKN", s => s.TaxNumber),
            new("Vergi Dairesi", s => s.TaxOffice),
            new("Telefon", s => s.Phone),
            new("E-posta", s => s.Email),
            new("Yetkili", s => s.ContactName),
            new("İl", s => s.City),
            new("İlçe", s => s.District),
            new("Adres", s => s.Address),
            new("IBAN", s => s.Iban),
            new("Vade (gün)", s => s.Id == 0 ? null : s.PaymentTermDays),
            new("Devir Bakiyesi", s => s.OpeningBalance, ExcelExporter.MoneyFormat),
            new("Borcumuz", s => s.Balance, ExcelExporter.MoneyFormat),
            new("Durum", s => s.Id == 0 ? null : Api.Infrastructure.ExportLabels.Active(s.IsActive))), "tedarikciler");
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup([FromQuery] SupplierKind? kind, CancellationToken ct) =>
        await db.Suppliers.AsNoTracking().Where(s => s.IsActive && (kind == null || s.Kind == kind)).OrderBy(s => s.Title)
            .Select(s => new LookupItem(s.Id, s.Title, s.Kind.ToString())).ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<SupplierSummaryDto> Get(int id, CancellationToken ct) => await payables.SummaryAsync(await GetDtoAsync(id, ct), ct);

    private async Task<SupplierDto> GetDtoAsync(int id, CancellationToken ct)
    {
        var s = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        var balances = await payables.BalancesAsync([id], ct);
        return ToDto(s, balances.GetValueOrDefault(id));
    }

    [HttpGet("{id:int}/movements")]
    public Task<List<AccountMovementDto>> Movements(int id, CancellationToken ct) => payables.MovementsAsync(id, ct);

    /// <summary>Tedarikçi hesap ekstresi PDF'i (mutabakat için); format=xlsx ile aynı ekstre Excel olarak iner.</summary>
    [HttpGet("{id:int}/statement")]
    public async Task<IActionResult> Statement(int id, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] bool download,
        [FromQuery] string? format, CancellationToken ct)
    {
        if (from is { } f && to is { } t && f > t) throw new DomainException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        var s = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        string?[] party = [s.Title, string.Join(", ", new[] { s.Address, s.District, s.City }.Where(x => !string.IsNullOrWhiteSpace(x))),
            string.IsNullOrWhiteSpace(s.TaxNumber) ? null : $"{s.TaxOffice} V.D. — {s.TaxNumber}", IbanValidator.Format(s.Iban) is { } iban ? $"IBAN: {iban}" : null];
        var movements = await payables.MovementsAsync(id, ct);
        if (format == "xlsx")
            return File(StatementPdfGenerator.Excel("Tedarikçi Hesap Ekstresi", $"Tedarikçi No: {s.SupplierNo}", party, movements, from, to, supplier: true),
                Infrastructure.FileResults.Xlsx, $"tedarikci-ekstre-{s.SupplierNo}.xlsx");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        var (pdf, _) = StatementPdfGenerator.Render(company, "TEDARİKÇİ HESAP EKSTRESİ", $"Tedarikçi No: {s.SupplierNo}", "TEDARİKÇİ",
            party, movements, from, to, supplier: true);
        var name = $"tedarikci-ekstre-{s.SupplierNo}.pdf";
        return download ? File(pdf, "application/pdf", name) : File(pdf, "application/pdf");
    }

    [HttpPost]
    public async Task<SupplierDto> Create(SupplierSaveRequest req, CancellationToken ct)
    {
        var s = new Supplier();
        Apply(s, req);
        db.Suppliers.Add(s);
        await db.SaveChangesAsync(ct);
        return await GetDtoAsync(s.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<SupplierDto> Update(int id, SupplierSaveRequest req, CancellationToken ct)
    {
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tedarikçi bulunamadı.");
        Apply(s, req);
        await db.SaveChangesAsync(ct);
        return await GetDtoAsync(id, ct);
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
