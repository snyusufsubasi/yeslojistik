using System.Linq.Expressions;
using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Domain;

/// <summary>
/// Gider KDV'si (docs/KDV-KURALLARI.md). Gider tutarı KDV dahil girilir; kazanç hesabında KDV'si düşülmüş (net) tutar kullanılır,
/// çünkü KDV-mükellefi firma ödediği KDV'yi indirir. Oran girilmediyse kategoriye göre varsayılan kullanılır.
/// </summary>
public static class ExpenseVat
{
    /// <summary>Kategorinin varsayılan KDV oranı: yakıt, bakım, lastik, otoyol ve diğer %20; sigorta, vergi, harcırah ve avans %0.</summary>
    public static decimal DefaultFor(ExpenseCategory category) => category switch
    {
        ExpenseCategory.Fuel or ExpenseCategory.Maintenance or ExpenseCategory.Tire or ExpenseCategory.Toll or ExpenseCategory.Other => 20,
        _ => 0,
    };

    /// <summary>Giderin KDV oranı: girilen oran, yoksa kategorinin varsayılanı.</summary>
    public static decimal RateOf(Expense e) => e.VatRate ?? DefaultFor(e.Category);

    /// <summary>KDV dahil tutarın KDV hariç karşılığı (2 hane).</summary>
    public static decimal Net(decimal gross, decimal vatRate) => TripProfit.NetOf(gross, vatRate);

    public static decimal NetOf(Expense e) => Net(e.Amount, RateOf(e));

    /// <summary>
    /// Veritabanı sorgularında giderin KDV hariç tutarı (satır başına yuvarlanmaz; toplam sonra yuvarlanır).
    /// <see cref="DefaultFor"/> ile aynı kuralı SQL'e çevrilebilir biçimde yazar; birim testi ikisinin aynı kalmasını denetler.
    /// </summary>
    public static readonly Expression<Func<Expense, decimal>> NetAmount = e => e.Amount * 100m / (100m + (e.VatRate ??
        (e.Category == ExpenseCategory.Fuel || e.Category == ExpenseCategory.Maintenance || e.Category == ExpenseCategory.Tire
            || e.Category == ExpenseCategory.Toll || e.Category == ExpenseCategory.Other ? 20m : 0m)));
}
