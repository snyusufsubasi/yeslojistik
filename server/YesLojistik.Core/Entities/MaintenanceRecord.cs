namespace YesLojistik.Core.Entities;

/// <summary>Araç bakım kaydı. Tutarı varsa "Bakım" kategorisinde gider olarak da yazılır (ExpenseId ile bağlı, çift sayılmaz).</summary>
public class MaintenanceRecord : BaseEntity
{
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
    public DateOnly Date { get; set; }
    public int? Km { get; set; }
    public MaintenanceType Type { get; set; }
    public string? Description { get; set; }
    public decimal Cost { get; set; }
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public int? NextDueKm { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public int? ExpenseId { get; set; }
    public Expense? Expense { get; set; }
}
