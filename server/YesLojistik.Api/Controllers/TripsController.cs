using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/trips")]
public class TripsController(TripService trips) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<TripDto>> List([FromQuery] TripQuery q, CancellationToken ct) => trips.ListAsync(q, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] TripQuery q, CancellationToken ct)
    {
        var rows = (await trips.ListAsync(q with { Page = 1, PageSize = QueryExtensions.MaxPageSize }, ct)).Items;
        return FileResults.Excel(ExcelExporter.Export("Seferler", rows,
            new ExcelColumn<TripDto>("Yükleme Tarihi", t => t.LoadingDate, ExcelExporter.DateFormat),
            new("Teslim Tarihi", t => t.DeliveryDate, ExcelExporter.DateFormat),
            new("Müşteri", t => t.CustomerTitle),
            new("Yükleme", t => t.LoadingAddress),
            new("Teslimat", t => t.DeliveryAddress),
            new("Plaka", t => t.VehiclePlate),
            new("Şoför", t => t.DriverName),
            new("Durum", t => TripStatusRules.Label(t.Status)),
            new("Satış", t => t.SalePrice, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", t => t.VehicleCost, ExcelExporter.MoneyFormat),
            new("Giderler", t => t.ExpenseTotal, ExcelExporter.MoneyFormat),
            new("Kâr", t => t.Profit, ExcelExporter.MoneyFormat),
            new("Fatura", t => t.InvoiceNo)), "seferler");
    }

    [HttpGet("{id:int}")]
    public Task<TripDto> Get(int id, CancellationToken ct) => trips.GetAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public Task<TripDto> Create(TripSaveRequest req, CancellationToken ct) => trips.CreateAsync(req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public Task<TripDto> Update(int id, TripSaveRequest req, CancellationToken ct) => trips.UpdateAsync(id, req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost("{id:int}/status")]
    public Task<TripDto> ChangeStatus(int id, TripStatusRequest req, CancellationToken ct) => trips.ChangeStatusAsync(id, req.Status, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await trips.DeleteAsync(id, ct);
        return NoContent();
    }
}
