namespace YesLojistik.Core.Entities;

/// <summary>Ofis ve depo personeli (şoförler ayrı tutulur): aylık maaş, avans ve prim takibi.</summary>
public class Staff : BaseEntity
{
    public string FullName { get; set; } = "";
    public string? NationalId { get; set; }
    public string? Phone { get; set; }
    public DateOnly? StartDate { get; set; }
    public decimal MonthlySalary { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Personel hareketi: avans (ödeme), prim (hak ediş) ya da maaş ödemesi.</summary>
public class StaffTransaction : BaseEntity
{
    public int StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public DateOnly Date { get; set; }
    public StaffTransactionKind Kind { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public int? CashAccountId { get; set; }
    public CashAccount? CashAccount { get; set; }
}

/// <summary>Her ay tekrarlanan ödeme (kira, sigorta taksiti, muhasebe ücreti…). Ödendiğinde bir gider kaydı oluşur.</summary>
public class RecurringPayment : BaseEntity
{
    public string Title { get; set; } = "";
    public string? Detail { get; set; }
    public decimal Amount { get; set; }
    /// <summary>Ayın kaçında ödenir (1–28).</summary>
    public int DueDay { get; set; } = 1;
    public ExpenseCategory Category { get; set; } = ExpenseCategory.Other;
    public int? CashAccountId { get; set; }
    public CashAccount? CashAccount { get; set; }
    public bool IsActive { get; set; } = true;
}
