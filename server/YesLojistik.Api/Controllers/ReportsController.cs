using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.Accounting)]
public class ReportsController(ReportService reports) : ControllerBase
{
    private static readonly string[] Months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    public static string CategoryLabel(string c) => c switch
    {
        "Fuel" => "Yakıt",
        "Maintenance" => "Bakım/Onarım",
        "Toll" => "Otoyol/Köprü",
        "DriverAllowance" => "Şoför Harcırahı",
        "DriverAdvance" => "Şoför Avansı",
        "Tire" => "Lastik",
        "Insurance" => "Sigorta/Kasko",
        "Tax" => "Vergi/Harç",
        _ => "Diğer",
    };

    private static (DateOnly From, DateOnly To) Range(DateOnly? from, DateOnly? to)
    {
        var t = to ?? Clock.Today;
        return (from ?? new DateOnly(t.Year, 1, 1), t);
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly([FromQuery] int? year, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await reports.MonthlyAsync(year ?? Clock.Today.Year, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Aylık Özet", rows,
            new ExcelColumn<MonthlySummaryRow>("Ay", r => $"{Months[r.Month - 1]} {r.Year}"),
            new("Sefer", r => r.TripCount),
            new("Sefer Cirosu", r => r.TripRevenue, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Giderler", r => r.Expenses, ExcelExporter.MoneyFormat),
            new("Net Kâr", r => r.NetProfit, ExcelExporter.MoneyFormat),
            new("Faturalanan", r => r.Invoiced, ExcelExporter.MoneyFormat),
            new("Tahsil Edilen", r => r.Collected, ExcelExporter.MoneyFormat)), "aylik-ozet");
    }

    [HttpGet("trips")]
    public async Task<IActionResult> Trips([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.TripProfitAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Sefer Kârlılığı", rows,
            new ExcelColumn<TripProfitRow>("Tarih", r => r.LoadingDate, ExcelExporter.DateFormat),
            new("Müşteri", r => r.Customer),
            new("Plaka", r => r.Vehicle),
            new("Güzergah", r => r.Route),
            new("Durum", r => r.Status),
            new("Satış", r => r.SalePrice, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Giderler", r => r.Expenses, ExcelExporter.MoneyFormat),
            new("Kâr", r => r.Profit, ExcelExporter.MoneyFormat)), "sefer-karlilik");
    }

    [HttpGet("vehicles")]
    public async Task<IActionResult> Vehicles([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.VehiclesAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Araç Bazlı", rows,
            new ExcelColumn<VehicleReportRow>("Plaka", r => r.Plate),
            new("Tip", r => r.Type),
            new("Sefer", r => r.TripCount),
            new("Gelir", r => r.Revenue, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Giderler", r => r.Expenses, ExcelExporter.MoneyFormat),
            new("Net", r => r.Net, ExcelExporter.MoneyFormat)), "arac-bazli");
    }

    [HttpGet("drivers")]
    public async Task<IActionResult> Drivers([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.DriversAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Şoför Bazlı", rows,
            new ExcelColumn<DriverReportRow>("Şoför", r => r.Driver),
            new("Sefer", r => r.TripCount),
            new("Teslim Edilen", r => r.DeliveredCount),
            new("Gelir", r => r.Revenue, ExcelExporter.MoneyFormat),
            new("Araç Maliyeti", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Sefer Giderleri", r => r.Expenses, ExcelExporter.MoneyFormat),
            new("Kâr", r => r.Profit, ExcelExporter.MoneyFormat),
            new("Verilen Avans", r => r.Advances, ExcelExporter.MoneyFormat),
            new("Harcırah", r => r.Allowances, ExcelExporter.MoneyFormat)), "sofor-bazli");
    }

    [HttpGet("fuel")]
    public async Task<IActionResult> Fuel([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.FuelAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Yakıt", rows,
            new ExcelColumn<FuelReportRow>("Plaka", r => r.Plate),
            new("Alım Sayısı", r => r.FillCount),
            new("Litre", r => r.Liters),
            new("Tutar", r => r.Cost, ExcelExporter.MoneyFormat),
            new("Ort. Litre Fiyatı", r => r.PricePerLiter, ExcelExporter.MoneyFormat),
            new("Km", r => r.Km),
            new("L/100 km", r => r.LitersPer100Km)), "yakit");
    }

    [HttpGet("aging")]
    public async Task<IActionResult> Aging([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await reports.AgingAsync(ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Alacak Yaşlandırma", rows,
            new ExcelColumn<CustomerAgingRow>("Müşteri", r => r.Customer),
            new("Vadesi Gelmemiş", r => r.NotDue, ExcelExporter.MoneyFormat),
            new("1-30 Gün", r => r.Days1To30, ExcelExporter.MoneyFormat),
            new("31-60 Gün", r => r.Days31To60, ExcelExporter.MoneyFormat),
            new("61-90 Gün", r => r.Days61To90, ExcelExporter.MoneyFormat),
            new("90+ Gün", r => r.Over90, ExcelExporter.MoneyFormat),
            new("Toplam", r => r.Total, ExcelExporter.MoneyFormat)), "alacak-yaslandirma");
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> Expenses([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.ExpenseCategoriesAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Gider Dağılımı", rows,
            new ExcelColumn<ExpenseCategoryRow>("Kategori", r => CategoryLabel(r.Category)),
            new("Tutar", r => r.Amount, ExcelExporter.MoneyFormat)), "gider-dagilimi");
    }
}
