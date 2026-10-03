using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/expenses")]
public class ExpensesController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Expense, object?>>> SortMap = new()
    {
        ["date"] = e => e.Date,
        ["amount"] = e => e.Amount,
        ["category"] = e => e.Category,
    };

    public static readonly Expression<Func<Expense, ExpenseDto>> Projection = e => new ExpenseDto(e.Id, e.Category, e.Amount,
        e.Date, e.VehicleId, e.Vehicle != null ? e.Vehicle.Plate : null, e.TripId,
        e.Trip != null ? e.Trip.LoadingAddress + " → " + e.Trip.DeliveryAddress : null, e.Description,
        e.DriverId, e.Driver != null ? e.Driver.FullName : null, e.Liters, e.Odometer,
        e.SupplierId, e.Supplier != null ? e.Supplier.Title : null, e.IsOnCredit, e.ReceiptPath != null,
        e.PaidBy, e.ApprovalStatus, e.RejectionReason, e.CashAccountId,
        new ExpenseDetails(e.CategoryName, e.Title, e.PeriodStart, e.PeriodEnd, e.FuelStation, e.FuelType, e.UnitPrice, e.PreviousOdometer, e.ExternalRef),
        e.VatRate);

    private IQueryable<Expense> Filter(ExpenseQuery q)
    {
        var query = db.Expenses.AsNoTracking();
        if (q.Category is { } c) query = query.Where(e => e.Category == c);
        if (q.VehicleId is { } v) query = query.Where(e => e.VehicleId == v);
        if (q.TripId is { } t) query = query.Where(e => e.TripId == t);
        if (q.DriverId is { } d) query = query.Where(e => e.DriverId == d);
        if (q.SupplierId is { } sup) query = query.Where(e => e.SupplierId == sup);
        if (q.From is { } from) query = query.Where(e => e.Date >= from);
        if (q.To is { } to) query = query.Where(e => e.Date <= to);
        if (q.ApprovalStatus is { } st) query = query.Where(e => e.ApprovalStatus == st);
        if (q.PaidBy is { } pb) query = query.Where(e => e.PaidBy == pb);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(e => EF.Functions.ILike(e.Description ?? "", like) || (e.Vehicle != null && EF.Functions.ILike(e.Vehicle.Plate, like))
                || (e.Driver != null && EF.Functions.ILike(e.Driver.FullName, like))
                || (e.Supplier != null && EF.Functions.ILike(e.Supplier.Title, like)));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "date");
    }

    [HttpGet]
    public async Task<PagedResult<ExpenseDto>> List([FromQuery] ExpenseQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).Select(Projection).PageAsync(q, ct);
        return new PagedResult<ExpenseDto>(items, total, page, size);
    }

    /// <summary>Kategori analizi (eski paneldeki "Kategori Analizi"): süzgeçteki giderlerin kullanıcı kategorisine göre toplamı ve yüzdesi.</summary>
    [HttpGet("categories")]
    public async Task<List<ExpenseCategoryTotal>> Categories([FromQuery] ExpenseQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Where(e => e.ApprovalStatus == ApprovalStatus.Approved)
            .GroupBy(e => new { e.CategoryName, e.Category }).Select(g => new { g.Key.CategoryName, g.Key.Category, Total = g.Sum(e => e.Amount), Count = g.Count() })
            .ToListAsync(ct);
        var all = rows.Sum(r => r.Total);
        return rows.GroupBy(r => r.CategoryName ?? DriverLedgerService.CategoryLabel(r.Category))
            .Select(g => new ExpenseCategoryTotal(g.Key, g.Sum(r => r.Count), g.Sum(r => r.Total), all == 0 ? 0 : Math.Round(g.Sum(r => r.Total) * 100 / all, 2)))
            .OrderByDescending(r => r.Total).ToList();
    }

    /// <summary>
    /// Filtrenin tamamının toplamı (yalnızca sayfanın değil). Onay durumu seçilmediyse reddedilen giderler tutara girmez;
    /// onaylı ve onay bekleyen kısımlar ayrıca verilir.
    /// </summary>
    [HttpGet("totals")]
    public async Task<ExpenseTotalsDto> Totals([FromQuery] ExpenseQuery q, CancellationToken ct)
    {
        var rows = await Filter(q with { Sort = null }).GroupBy(e => e.ApprovalStatus)
            .Select(g => new { Status = g.Key, Count = g.Count(), Sum = g.Sum(e => e.Amount) }).ToListAsync(ct);
        return new ExpenseTotalsDto(rows.Sum(r => r.Count),
            rows.Where(r => q.ApprovalStatus != null || r.Status != ApprovalStatus.Rejected).Sum(r => r.Sum),
            rows.Where(r => r.Status == ApprovalStatus.Approved).Sum(r => r.Sum), rows.Where(r => r.Status == ApprovalStatus.Pending).Sum(r => r.Sum));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] ExpenseQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        var t = await Totals(q, ct);
        var total = new ExpenseDto(0, ExpenseCategory.Other, t.Total, default, null, null, null, null,
            t.Pending > 0 ? $"Onaylı: {Formatters.Currency(t.Approved)} · Onay bekleyen: {Formatters.Currency(t.Pending)}" : null);
        return FileResults.Excel(ExcelExporter.ExportWithTotal("Giderler", rows, total,
            new ExcelColumn<ExpenseDto>("Tarih", e => e.Id == 0 ? null : e.Date, ExcelExporter.DateFormat),
            new("Kategori", e => e.Id == 0 ? "Toplam" : ReportsController.CategoryLabel(e.Category.ToString())),
            new("Plaka", e => e.VehiclePlate),
            new("Sefer", e => e.TripLabel),
            new("Şoför", e => e.DriverName),
            new("Tedarikçi", e => e.SupplierTitle),
            new("Vadeli", e => e.IsOnCredit ? "Evet" : ""),
            new("Ödeyen", e => e.Id == 0 ? null : e.PaidBy == ExpensePaidBy.Driver ? "Şoför" : "Firma"),
            new("Onay", e => e.Id == 0 ? null : e.ApprovalStatus switch { ApprovalStatus.Pending => "Bekliyor", ApprovalStatus.Rejected => "Reddedildi", _ => "Onaylı" }),
            new("Litre", e => e.Liters),
            new("Km", e => e.Odometer),
            new("Tutar", e => e.Amount, ExcelExporter.MoneyFormat),
            new("Açıklama", e => e.Description)), "giderler");
    }

    [HttpGet("{id:int}")]
    public async Task<ExpenseDto> Get(int id, CancellationToken ct) =>
        await db.Expenses.AsNoTracking().Where(e => e.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Gider bulunamadı.");

    [HttpPost]
    public async Task<ExpenseDto> Create(ExpenseSaveRequest req, [FromServices] ExpenseService expenses, CancellationToken ct) =>
        await Get(await expenses.CreateAsync(req, ct), ct);

    [HttpPut("{id:int}")]
    public async Task<ExpenseDto> Update(int id, ExpenseSaveRequest req, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        await expenses.UpdateAsync(id, req, ct);
        return await Get(id, ct);
    }

    /// <summary>Fiş / fatura görseli (JPEG, PNG, WEBP veya PDF, en fazla 10 MB). Varsa eskisinin yerine geçer.</summary>
    [HttpPost("{id:int}/receipt")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ExpenseDto> UploadReceipt(int id, IFormFile file, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        await expenses.SaveReceiptAsync(id, stream, file.Length, ct);
        return await Get(id, ct);
    }

    [HttpGet("{id:int}/receipt")]
    public async Task<IActionResult> Receipt(int id, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        var (content, type) = await expenses.OpenReceiptAsync(id, ct);
        return File(content, type);
    }

    /// <summary>Şoförün girdiği masrafı onaylar: raporlara ve şoför hesabına girer.</summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/approve")]
    public async Task<ExpenseDto> Approve(int id, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        await expenses.ReviewAsync(id, approve: true, null, ct);
        return await Get(id, ct);
    }

    /// <summary>Masrafı gerekçeyle reddeder; raporlara girmez, şoföre bildirim gider.</summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/reject")]
    public async Task<ExpenseDto> Reject(int id, ExpenseRejectRequest req, [FromServices] ExpenseService expenses, CancellationToken ct)
    {
        await expenses.ReviewAsync(id, approve: false, req.Reason, ct);
        return await Get(id, ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        if (await db.MaintenanceRecords.AnyAsync(m => m.ExpenseId == id, ct))
            throw new DomainException("Bu gider bir bakım kaydından geliyor; aracın Bakım sekmesinden düzenleyin ya da silin.");
        e.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
