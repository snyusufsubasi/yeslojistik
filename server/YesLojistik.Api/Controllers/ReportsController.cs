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
public class ReportsController(ReportService reports, PayableService payables, BalanceService balances) : ControllerBase
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
            new("Taşeron Maliyeti", r => r.CarrierCost, ExcelExporter.MoneyFormat),
            new("Taşeron Ödemeleri", r => r.CarrierPaid, ExcelExporter.MoneyFormat),
            new("Net Kâr", r => r.NetProfit, ExcelExporter.MoneyFormat),
            new("Faturalanan", r => r.Invoiced, ExcelExporter.MoneyFormat),
            new("Tahsil Edilen", r => r.Collected, ExcelExporter.MoneyFormat)), "aylik-ozet");
    }

    /// <summary>Kazanç raporu: ay, müşteri, araç ya da şoför bazında satış, maliyet, komisyon, prim, masraf ve kâr.</summary>
    [HttpGet("profit")]
    public async Task<IActionResult> Profit([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] ProfitGroupBy groupBy,
        [FromQuery] string? format, [FromQuery] int? customerId, [FromQuery] int? vehicleId, [FromQuery] int? driverId, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        if (f > t) throw new Core.Domain.DomainException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        var rows = await reports.ProfitAsync(f, t, groupBy, ct, customerId, vehicleId, driverId);
        if (format != "xlsx") return Ok(rows);
        ProfitReportRow[] total = rows.Count == 0 ? [] :
        [
            new ProfitReportRow("", "Toplam", rows.Sum(r => r.TripCount), rows.Sum(r => r.Sale), rows.Sum(r => r.Commission), rows.Sum(r => r.VehicleCost),
                rows.Sum(r => r.DriverBonus), rows.Sum(r => r.ExtraCost), rows.Sum(r => r.Expenses), rows.Sum(r => r.Profit),
                Core.Domain.TripProfit.MarginPercent(rows.Sum(r => r.Profit), rows.Sum(r => r.Sale + r.Commission))),
        ];
        var caption = groupBy switch { ProfitGroupBy.Customer => "Müşteri", ProfitGroupBy.Vehicle => "Plaka", ProfitGroupBy.Driver => "Şoför", _ => "Ay" };
        using var wb = new ExcelWorkbookBuilder();
        wb.AddSheet("Kazanç", rows, total,
            [$"Kazanç raporu ({caption} bazında) · {Core.Domain.Formatters.Date(f)} – {Core.Domain.Formatters.Date(t)}",
                "Tutarlar KDV hariç. Kâr = satış + komisyon − araç/taşeron maliyeti − şoför primi − faturalanmayan ek masraf − sefer giderleri."],
            new ExcelColumn<ProfitReportRow>(caption, r => r.Label),
            new("Sefer", r => r.TripCount),
            new("Satış", r => r.Sale, ExcelExporter.MoneyFormat),
            new("Komisyon", r => r.Commission, ExcelExporter.MoneyFormat),
            new("Araç / Taşeron Maliyeti", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Şoför Primi", r => r.DriverBonus, ExcelExporter.MoneyFormat),
            new("Ek Masraf", r => r.ExtraCost, ExcelExporter.MoneyFormat),
            new("Sefer Giderleri", r => r.Expenses, ExcelExporter.MoneyFormat),
            new("Kâr", r => r.Profit, ExcelExporter.MoneyFormat),
            new("Marj %", r => r.MarginPercent));
        return FileResults.Excel(wb.Build(), "kazanc-raporu");
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

    /// <summary>Tedarikçi (taşeron) borç yaşlandırma.</summary>
    [HttpGet("payables")]
    public async Task<IActionResult> Payables([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await payables.AgingAsync(ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Borç Yaşlandırma", rows,
            new ExcelColumn<PayableAgingRow>("Tedarikçi", r => r.Supplier),
            new("Vadesi Gelmemiş", r => r.NotDue, ExcelExporter.MoneyFormat),
            new("1-30 Gün", r => r.Days1To30, ExcelExporter.MoneyFormat),
            new("31-60 Gün", r => r.Days31To60, ExcelExporter.MoneyFormat),
            new("61-90 Gün", r => r.Days61To90, ExcelExporter.MoneyFormat),
            new("90+ Gün", r => r.Over90, ExcelExporter.MoneyFormat),
            new("Toplam", r => r.Total, ExcelExporter.MoneyFormat)), "borc-yaslandirma");
    }

    /// <summary>Tedarikçi bazında sefer maliyeti, vadeli gider, ödenen ve bakiye (tüm zamanlar).</summary>
    [HttpGet("suppliers")]
    public async Task<IActionResult> Suppliers([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await payables.ReportAsync(ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Tedarikçiler", rows,
            new ExcelColumn<SupplierReportRow>("Tedarikçi", r => r.Supplier),
            new("Sefer", r => r.TripCount),
            new("Sefer Maliyeti", r => r.TripCost, ExcelExporter.MoneyFormat),
            new("Vadeli Gider", r => r.CreditExpenses, ExcelExporter.MoneyFormat),
            new("Ödenen", r => r.Paid, ExcelExporter.MoneyFormat),
            new("Bakiye", r => r.Balance, ExcelExporter.MoneyFormat)), "tedarikci-raporu");
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

    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.CustomerProfitAsync(f, t, balances, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Müşteri Kârlılığı", rows,
            new ExcelColumn<CustomerProfitRow>("Müşteri", r => r.Customer),
            new("Sefer", r => r.TripCount),
            new("Ciro", r => r.Revenue, ExcelExporter.MoneyFormat),
            new("Maliyet", r => r.Cost, ExcelExporter.MoneyFormat),
            new("Kâr", r => r.Profit, ExcelExporter.MoneyFormat),
            new("Marj %", r => r.MarginPercent),
            new("Açık Alacak", r => r.OpenReceivable, ExcelExporter.MoneyFormat),
            new("Tahsil Süresi (gün, yaklaşık)", r => r.CollectionDays)), "musteri-karliligi");
    }

    [HttpGet("routes")]
    public async Task<IActionResult> Routes([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var rows = await reports.RouteProfitAsync(f, t, ct);
        if (format != "xlsx") return Ok(rows);
        return FileResults.Excel(ExcelExporter.Export("Güzergâh Kârlılığı", rows,
            new ExcelColumn<RouteProfitRow>("Yükleme İli", r => r.From),
            new("Teslim İli", r => r.To),
            new("Sefer", r => r.TripCount),
            new("Ort. Satış", r => r.AvgRevenue, ExcelExporter.MoneyFormat),
            new("Ort. Maliyet", r => r.AvgCost, ExcelExporter.MoneyFormat),
            new("Toplam Kâr", r => r.Profit, ExcelExporter.MoneyFormat),
            new("Marj %", r => r.MarginPercent)), "guzergah-karliligi");
    }
}
