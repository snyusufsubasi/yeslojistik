using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        e.SupplierId, e.Supplier != null ? e.Supplier.Title : null, e.IsOnCredit, e.ReceiptPath != null);

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

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] ExpenseQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        return FileResults.Excel(ExcelExporter.Export("Giderler", rows,
            new ExcelColumn<ExpenseDto>("Tarih", e => e.Date, ExcelExporter.DateFormat),
            new("Kategori", e => ReportsController.CategoryLabel(e.Category.ToString())),
            new("Plaka", e => e.VehiclePlate),
            new("Sefer", e => e.TripLabel),
            new("Şoför", e => e.DriverName),
            new("Tedarikçi", e => e.SupplierTitle),
            new("Vadeli", e => e.IsOnCredit ? "Evet" : ""),
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        e.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
