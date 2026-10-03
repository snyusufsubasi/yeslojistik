using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController(AppDbContext db, CustomerAccountService accounts) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Customer, object?>>> SortMap = new()
    {
        ["title"] = c => c.Title,
        ["id"] = c => c.Id,
        ["balance"] = c => c.OpeningBalance + (c.Invoices.Where(i => i.Status == InvoiceStatus.Issued).Sum(i => (decimal?)i.Total) ?? 0)
            - (c.Payments.Sum(p => (decimal?)p.Amount) ?? 0),
    };

    private IQueryable<Customer> Filter(ListQuery q)
    {
        var query = db.Customers.AsNoTracking();
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(c => EF.Functions.ILike(c.Title, like) || EF.Functions.ILike(c.TaxNumber ?? "", like)
                || EF.Functions.ILike(c.Phone ?? "", like) || EF.Functions.ILike(c.Email ?? "", like));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "title", defaultDesc: false);
    }

    [HttpGet]
    public async Task<PagedResult<CustomerDto>> List([FromQuery] ListQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await CustomerAccountService.Project(Filter(q)).PageAsync(q, ct);
        return new PagedResult<CustomerDto>(items.Select(CustomerAccountService.WithNo).ToList(), total, page, size);
    }

    /// <summary>Müşteri listesinin Excel'i (arama ve sıralamayla), altında toplam bakiye.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] ListQuery q, CancellationToken ct)
    {
        var rows = (await CustomerAccountService.Project(Filter(q)).Take(QueryExtensions.ExportLimit).ToListAsync(ct))
            .Select(CustomerAccountService.WithNo).ToList();
        var total = new CustomerDto(0, "", "Toplam", null, null, null, null, null, null, rows.Sum(c => c.Balance), rows.Sum(c => c.OpeningBalance));
        return Api.Infrastructure.FileResults.Excel(ExcelExporter.ExportWithTotal("Müşteriler", rows, total,
            new ExcelColumn<CustomerDto>("No", c => c.CustomerNo),
            new("Ünvan", c => c.Title),
            new("VKN/TCKN", c => c.TaxNumber),
            new("Vergi Dairesi", c => c.TaxOffice),
            new("Telefon", c => c.Phone),
            new("E-posta", c => c.Email),
            new("Yetkili", c => c.ContactName),
            new("İl", c => c.City),
            new("İlçe", c => c.District),
            new("Adres", c => c.Address),
            new("Vade (gün)", c => c.PaymentTermDays),
            new("Risk Limiti", c => c.CreditLimit, ExcelExporter.MoneyFormat),
            new("Devir Bakiyesi", c => c.OpeningBalance, ExcelExporter.MoneyFormat),
            new("Cari Bakiye", c => c.Balance, ExcelExporter.MoneyFormat),
            new("Durum", c => c.Id == 0 ? null : Api.Infrastructure.ExportLabels.Active(c.IsActive))), "musteriler");
    }

    [HttpGet("lookup")]
    public async Task<List<LookupItem>> Lookup(CancellationToken ct) =>
        await db.Customers.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.Title).Select(c => new LookupItem(c.Id, c.Title, null)).ToListAsync(ct);

    [HttpGet("{id:int}")]
    public Task<CustomerSummaryDto> Get(int id, CancellationToken ct) => accounts.SummaryAsync(id, ct);

    /// <summary>Risk limiti kullanımı: açık bakiye + faturalanmamış (yüklenmiş/yolda/teslim) seferler.</summary>
    [HttpGet("{id:int}/risk")]
    public Task<CustomerRiskDto> Risk(int id, [FromQuery] int? excludeTripId, [FromServices] CashService cash, CancellationToken ct) =>
        cash.RiskAsync(id, excludeTripId, ct);

    [HttpGet("{id:int}/movements")]
    public Task<List<AccountMovementDto>> Movements(int id, CancellationToken ct) => accounts.MovementsAsync(id, ct);

    /// <summary>
    /// Hesap ekstresi PDF'i (isteğe bağlı tarih aralığıyla); format=xlsx ile aynı ekstre Excel olarak iner.
    /// uninvoiced=true: dönemde teslim edilmiş, faturası kesilmemiş seferler de bilgi olarak listelenir (bakiyeye girmez).
    /// </summary>
    [HttpGet("{id:int}/statement")]
    public async Task<IActionResult> Statement(int id, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] bool download,
        [FromQuery] string? format, [FromQuery] bool uninvoiced, [FromServices] StatementPdfGenerator pdf, CancellationToken ct)
    {
        if (format == "xlsx")
        {
            var (xlsx, xlsxName) = await pdf.ExcelAsync(id, from, to, uninvoiced, ct);
            return File(xlsx, YesLojistik.Api.Infrastructure.FileResults.Xlsx, xlsxName);
        }
        var (content, name, _, _) = await pdf.GenerateAsync(id, from, to, uninvoiced, ct);
        return download ? File(content, "application/pdf", name) : File(content, "application/pdf");
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/statement/email")]
    public async Task<object> EmailStatement(int id, StatementEmailRequest req, [FromServices] StatementPdfGenerator pdf, CancellationToken ct) =>
        new { sentTo = await pdf.SendAsync(id, req.From, req.To, req.Recipient, req.Message, req.Uninvoiced, ct) };

    [HttpPost]
    public async Task<ActionResult<CustomerSummaryDto>> Create(CustomerSaveRequest req, CancellationToken ct)
    {
        var c = new Customer();
        Apply(c, req);
        await SyncGroupsAsync(c, req.Groups, ct);
        db.Customers.Add(c);
        await db.SaveChangesAsync(ct);
        return await accounts.SummaryAsync(c.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerSummaryDto>> Update(int id, CustomerSaveRequest req, CancellationToken ct)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Müşteri bulunamadı.");
        Apply(c, req);
        await SyncGroupsAsync(c, req.Groups, ct);
        await db.SaveChangesAsync(ct);
        return await accounts.SummaryAsync(id, ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Müşteri bulunamadı.");
        if (await db.Trips.AnyAsync(t => t.CustomerId == id, ct) || await db.Invoices.AnyAsync(i => i.CustomerId == id, ct)
            || await db.Payments.AnyAsync(p => p.CustomerId == id, ct))
            throw new DomainException("Seferi, faturası veya tahsilatı olan müşteri silinemez.");
        if (c.OpeningBalance > 0)
            throw new DomainException("Devir bakiyesi olan müşteri silinemez. Önce devir bakiyesini sıfırlayın.");
        c.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Customer c, CustomerSaveRequest r)
    {
        c.Title = r.Title.Trim();
        c.TaxNumber = NullIfEmpty(r.TaxNumber);
        c.TaxOffice = NullIfEmpty(r.TaxOffice);
        c.Phone = Formatters.NormalizePhone(r.Phone);
        c.Email = NullIfEmpty(r.Email)?.ToLowerInvariant();
        c.Address = NullIfEmpty(r.Address);
        c.Notes = NullIfEmpty(r.Notes);
        c.OpeningBalance = Money.Round(r.OpeningBalance);
        c.OpeningBalanceDate = r.OpeningBalance > 0 ? r.OpeningBalanceDate : null;
        c.NotifyStatusByEmail = r.NotifyStatusByEmail;
        c.City = Cities.Normalize(r.City);
        c.District = NullIfEmpty(r.District);
        c.ContactName = NullIfEmpty(r.ContactName);
        c.IsEInvoiceUser = r.IsEInvoiceUser;
        c.EInvoiceAlias = r.IsEInvoiceUser ? NullIfEmpty(r.EInvoiceAlias) : null;
        c.PaymentTermDays = r.PaymentTermDays;
        c.IsActive = r.IsActive;
        c.CreditLimit = r.CreditLimit is > 0 ? Money.Round(r.CreditLimit.Value) : null;
        if (r.Extras is { } x)
        {
            c.Country = NullIfEmpty(x.Country);
            c.Neighborhood = NullIfEmpty(x.Neighborhood);
            c.Street = NullIfEmpty(x.Street);
            c.BuildingName = NullIfEmpty(x.BuildingName);
            c.BuildingNo = NullIfEmpty(x.BuildingNo);
            c.DoorNo = NullIfEmpty(x.DoorNo);
            c.PostalCode = NullIfEmpty(x.PostalCode);
            c.Fax = Formatters.NormalizePhone(x.Fax) ?? NullIfEmpty(x.Fax);
            c.Website = NullIfEmpty(x.Website);
        }
        if (r.InvoiceTemplate is { } t)
        {
            c.InvoiceTemplate ??= new InvoiceTemplate();
            var it = c.InvoiceTemplate;
            it.LineDate = t.LineDate;
            it.LineLoading = t.LineLoading;
            it.LineDelivery = t.LineDelivery;
            it.LinePlate = t.LinePlate;
            it.LineVehicleType = t.LineVehicleType;
            it.LineDeliveryDocumentNo = t.LineDeliveryDocumentNo;
            it.LineCargo = t.LineCargo;
            it.LineDescription = t.LineDescription;
            it.TripFooterNotes = t.TripFooterNotes;
            it.Note = NullIfEmpty(t.Note);
            it.SaleNoteId = t.SaleNoteId;
            it.WithholdingNoteId = t.WithholdingNoteId;
            it.Scenario = t.Scenario;
        }
    }

    /// <summary>İstekte grup listesi geldiyse müşterinin gruplarını onunla eşitler (yeni eklenir, çıkarılan silinir).</summary>
    private async Task SyncGroupsAsync(Customer c, IReadOnlyList<string>? names, CancellationToken ct)
    {
        if (names == null) return;
        var wanted = names.Select(n => n.Trim()).Where(n => n.Length > 0).Distinct(StringComparer.CurrentCultureIgnoreCase).ToList();
        var current = c.Id == 0 ? [] : await db.CustomerGroups.Where(g => g.CustomerId == c.Id).ToListAsync(ct);
        foreach (var g in current.Where(g => !wanted.Contains(g.Name, StringComparer.CurrentCultureIgnoreCase))) g.IsDeleted = true;
        foreach (var n in wanted.Where(n => !current.Any(g => string.Equals(g.Name, n, StringComparison.CurrentCultureIgnoreCase))))
            c.Groups.Add(new CustomerGroup { Name = n });
    }

    /// <summary>Yeni fatura formu için öneriler: müşterinin şablon notu, seçili hazır not ve senaryo.</summary>
    [HttpGet("{id:int}/invoice-defaults")]
    public async Task<CustomerInvoiceDefaultsDto> InvoiceDefaults(int id, [FromQuery] bool withholding, CancellationToken ct)
    {
        var c = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Müşteri bulunamadı.");
        var noteId = withholding ? c.InvoiceTemplate.WithholdingNoteId ?? c.InvoiceTemplate.SaleNoteId : c.InvoiceTemplate.SaleNoteId;
        var note = noteId is { } nid ? await db.InvoiceNotes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == nid, ct) : null;
        var parts = new[]
        {
            c.InvoiceTemplate.Note,
            note == null ? null : string.Join(" ", new[] { note.Text, note.AccountName, note.Iban is { } iban ? $"IBAN: {iban}" : null }.Where(s => !string.IsNullOrWhiteSpace(s))),
        }.Where(s => !string.IsNullOrWhiteSpace(s));
        var text = string.Join("\n", parts);
        return new CustomerInvoiceDefaultsDto(text.Length == 0 ? null : text, c.InvoiceTemplate.Scenario, c.PaymentTermDays,
            Core.Domain.InvoiceCalculator.IsCompanyTaxNumber(c.TaxNumber));
    }

    internal static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
