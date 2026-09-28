namespace YesLojistik.Core.Dtos;

public record DashboardDto(
    int MonthTripCount, int MonthDeliveredCount, int ActiveTripCount, int ReceivableInvoiceCount, decimal ReceivableTotal,
    int VehicleCount, int VehiclesOnRoad, int PlannedTripCount, decimal MonthRevenue, decimal MonthExpenses,
    IReadOnlyList<TripDto> TodayTrips, IReadOnlyList<InvoiceDto> RecentInvoices, IReadOnlyList<VehicleDto> Vehicles);

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
    decimal VehicleCost, decimal Expenses, decimal Profit);

public record ExpenseCategoryRow(string Category, decimal Amount);
