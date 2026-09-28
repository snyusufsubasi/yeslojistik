namespace YesLojistik.Core.Entities;

public class Customer : BaseEntity
{
    public string Title { get; set; } = "";
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    /// <summary>Sefer durumu değişince müşteriye takip linkiyle e-posta gönderilsin mi?</summary>
    public bool NotifyStatusByEmail { get; set; }
    /// <summary>Sisteme geçişte devreden borç bakiyesi (devir). Cari bakiyeye ve alacak yaşlandırmaya dahildir.</summary>
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceDate { get; set; }

    public List<Trip> Trips { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();

    public string CustomerNo => Id.ToString("D5");
}
