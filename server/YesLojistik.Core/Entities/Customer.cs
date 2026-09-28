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

    public List<Trip> Trips { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();

    public string CustomerNo => Id.ToString("D5");
}
