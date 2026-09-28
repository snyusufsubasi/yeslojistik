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

    private static readonly Expression<Func<Expense, ExpenseDto>> Projection = e => new ExpenseDto(e.Id, e.Category, e.Amount,
        e.Date, e.VehicleId, e.Vehicle != null ? e.Vehicle.Plate : null, e.TripId,
        e.Trip != null ? e.Trip.LoadingAddress + " → " + e.Trip.DeliveryAddress : null, e.Description);

    private IQueryable<Expense> Filter(ExpenseQuery q)
    {
        var query = db.Expenses.AsNoTracking();
        if (q.Category is { } c) query = query.Where(e => e.Category == c);
        if (q.VehicleId is { } v) query = query.Where(e => e.VehicleId == v);
        if (q.TripId is { } t) query = query.Where(e => e.TripId == t);
        if (q.From is { } from) query = query.Where(e => e.Date >= from);
        if (q.To is { } to) query = query.Where(e => e.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(e => EF.Functions.ILike(e.Description ?? "", like) || (e.Vehicle != null && EF.Functions.ILike(e.Vehicle.Plate, like)));
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
        var rows = await Filter(q).Select(Projection).Take(5000).ToListAsync(ct);
        return FileResults.Excel(ExcelExporter.Export("Giderler", rows,
            new ExcelColumn<ExpenseDto>("Tarih", e => e.Date, ExcelExporter.DateFormat),
            new("Kategori", e => ReportsController.CategoryLabel(e.Category.ToString())),
            new("Plaka", e => e.VehiclePlate),
            new("Sefer", e => e.TripLabel),
            new("Tutar", e => e.Amount, ExcelExporter.MoneyFormat),
            new("Açıklama", e => e.Description)), "giderler");
    }

    [HttpGet("{id:int}")]
    public async Task<ExpenseDto> Get(int id, CancellationToken ct) =>
        await db.Expenses.AsNoTracking().Where(e => e.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Gider bulunamadı.");

    [HttpPost]
    public async Task<ExpenseDto> Create(ExpenseSaveRequest req, CancellationToken ct)
    {
        var e = new Expense();
        await ApplyAsync(e, req, ct);
        db.Expenses.Add(e);
        await db.SaveChangesAsync(ct);
        return await Get(e.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<ExpenseDto> Update(int id, ExpenseSaveRequest req, CancellationToken ct)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        await ApplyAsync(e, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        e.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(Expense e, ExpenseSaveRequest r, CancellationToken ct)
    {
        var vehicleId = r.VehicleId;
        if (r.TripId is { } tripId)
        {
            var tripVehicle = await db.Trips.Where(t => t.Id == tripId).Select(t => (int?)t.VehicleId).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Sefer bulunamadı.");
            vehicleId ??= tripVehicle;
        }
        if (vehicleId is { } v && !await db.Vehicles.AnyAsync(x => x.Id == v, ct)) throw new DomainException("Araç bulunamadı.");
        e.Category = r.Category;
        e.Amount = Money.Round(r.Amount);
        e.Date = r.Date;
        e.VehicleId = vehicleId;
        e.TripId = r.TripId;
        e.Description = CustomersController.NullIfEmpty(r.Description);
    }
}
