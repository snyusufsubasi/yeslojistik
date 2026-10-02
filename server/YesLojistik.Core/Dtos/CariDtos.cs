namespace YesLojistik.Core.Dtos;

/// <summary>Müşteriler cari tablosunun bir satırı: tüm müşteriler tek bakışta (eski paneldeki "Müşteriler Cari").</summary>
public record CustomerCariRow(int Id, string CustomerNo, string Title, string? TaxNumber, string? Phone,
    decimal Opening, decimal Invoiced, decimal Collected, decimal Balance, decimal Overdue,
    int UninvoicedTripCount, decimal UninvoicedTrips, decimal? LegacyBalance = null, DateTime? LegacyBalanceAt = null);

/// <summary>Tedarikçiler cari tablosunun bir satırı (eski paneldeki "Tedarikçiler Cari").</summary>
public record SupplierCariRow(int Id, string SupplierNo, string Title, string? TaxNumber, string? Phone,
    decimal Opening, decimal TripCost, decimal CreditExpenses, decimal Paid, decimal Balance, decimal Overdue,
    int TripCount, int MissingInvoiceCount, decimal? LegacyBalance = null, DateTime? LegacyBalanceAt = null);
