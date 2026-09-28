namespace YesLojistik.Core.Entities;

public class Expense : BaseEntity
{
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public int? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public int? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string? Description { get; set; }
}
