namespace YesLojistik.Core.Dtos;

/// <summary>
/// Müşteriler cari tablosunun bir satırı: tüm müşteriler tek bakışta (eski paneldeki "Müşteriler Cari").
/// İptal faturalar ve faturasız seferler bilgi içindir, bakiyeye girmez (UninvoicedTrips KDV hariç sefer tutarıdır).
/// </summary>
public record CustomerCariRow(int Id, string CustomerNo, string Title, string? TaxNumber, string? Phone,
    decimal Opening, decimal Invoiced, decimal Collected, decimal Balance, decimal Overdue,
    int UninvoicedTripCount, decimal UninvoicedTrips, int CancelledInvoiceCount, decimal CancelledInvoices,
    decimal? LegacyBalance = null, DateTime? LegacyBalanceAt = null);

/// <summary>
/// Tedarikçiler cari tablosunun bir satırı (eski paneldeki "Tedarikçiler Cari").
/// Bakiye = Devir + Alınan Fatura + Faturasız Sevkiyatlar (taşeron borcu, KDV dahil) + vadeli gider − Verilen Ödeme.
/// TripCost (sefer borcu) = Alınan Fatura + Faturasız Sevkiyatlar. İptal faturalar bilgi içindir.
/// </summary>
public record SupplierCariRow(int Id, string SupplierNo, string Title, string? TaxNumber, string? Phone,
    decimal Opening, decimal TripCost, decimal CreditExpenses, decimal Paid, decimal Balance, decimal Overdue,
    int TripCount, int MissingInvoiceCount, decimal ReceivedInvoices, int ReceivedInvoiceCount, int CancelledInvoiceCount, decimal CancelledInvoices,
    int UninvoicedTripCount, decimal UninvoicedTrips, decimal? LegacyBalance = null, DateTime? LegacyBalanceAt = null);

/// <summary>
/// Cari tablosunun dışa aktarımı: ekrandaki süzgeç, arama ve sıralamayla aynı liste.
/// Filter: open (bakiyesi olanlar, varsayılan), overdue (vadesi geçenler), all. Sort: sütun anahtarı (ör. balance, title).
/// </summary>
public record CariExportQuery
{
    public string? Search { get; init; }
    public string? Filter { get; init; }
    public string? Sort { get; init; }
    public bool Desc { get; init; }
}
