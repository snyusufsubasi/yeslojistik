namespace YesLojistik.Core.Dtos;

public record DashboardDto(
    int MonthTripCount, int MonthDeliveredCount, int ActiveTripCount, int ReceivableInvoiceCount, decimal ReceivableTotal,
    int VehicleCount, int VehiclesOnRoad, int PlannedTripCount, decimal MonthRevenue, decimal MonthExpenses,
    IReadOnlyList<TripDto> TodayTrips, IReadOnlyList<InvoiceDto> RecentInvoices, IReadOnlyList<VehicleDto> Vehicles,
    IReadOnlyList<MonthTrendRow> Trend, SetupStatus Setup);

/// <summary>İlk kurulum kontrol listesi (ana sayfadaki "Başlarken" kartı).</summary>
public record SetupStatus(bool CompanyInfo, int VehicleCount, int DriverCount, int CustomerCount, int TripCount, int UserCount, bool SampleData = false);

/// <summary>Ana sayfadaki son 6 ay grafiği: sefer cirosu ve maliyet (araç maliyeti + giderler).</summary>
public record MonthTrendRow(int Year, int Month, decimal Revenue, decimal Cost);

public record AlertDto(string Type, string Severity, string Title, string Message, string Link, DateOnly? Date);

public record MonthlySummaryRow(int Year, int Month, int TripCount, decimal TripRevenue, decimal VehicleCost,
    decimal Invoiced, decimal Collected, decimal Expenses, decimal NetProfit);

public record TripProfitRow(int TripId, DateOnly LoadingDate, string Customer, string Vehicle, string Route,
    string Status, decimal SalePrice, decimal VehicleCost, decimal Expenses, decimal Profit);

public record VehicleReportRow(int VehicleId, string Plate, string Type, int TripCount, decimal Revenue,
    decimal VehicleCost, decimal Expenses, decimal Net);

public record CustomerAgingRow(int CustomerId, string Customer, decimal NotDue, decimal Days1To30, decimal Days31To60,
    decimal Days61To90, decimal Over90, decimal Total);

public record DriverReportRow(int DriverId, string Driver, int TripCount, int DeliveredCount, decimal Revenue,
    decimal VehicleCost, decimal Expenses, decimal Profit, decimal Advances = 0, decimal Allowances = 0);

/// <summary>Araç başına yakıt. Tüketim "depo doldurma" yöntemiyle: ilk alımdan sonraki litreler / aradaki km.</summary>
public record FuelReportRow(int VehicleId, string Plate, int FillCount, decimal Liters, decimal Cost, decimal? PricePerLiter,
    int? Km, decimal? LitersPer100Km);

public record ExpenseCategoryRow(string Category, decimal Amount);
