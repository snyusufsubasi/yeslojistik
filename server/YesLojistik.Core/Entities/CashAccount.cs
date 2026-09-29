namespace YesLojistik.Core.Entities;

/// <summary>Kasa, banka, POS ya da kredi kartı hesabı. Bakiye saklanmaz, hareketlerden hesaplanır.</summary>
public class CashAccount : BaseEntity
{
    public string Name { get; set; } = "";
    public CashAccountKind Kind { get; set; }
    public string? Iban { get; set; }
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceDate { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Hesaplar arası para aktarımı (virman), ör. kasadan bankaya yatırılan nakit.</summary>
public class CashTransfer : BaseEntity
{
    public int FromAccountId { get; set; }
    public CashAccount FromAccount { get; set; } = null!;
    public int ToAccountId { get; set; }
    public CashAccount ToAccount { get; set; } = null!;
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}
