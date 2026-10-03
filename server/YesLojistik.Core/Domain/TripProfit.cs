namespace YesLojistik.Core.Domain;

/// <summary>
/// Seferin kazancı için tek formül. Bütün ekranlar (sefer listesi, kazanç tablosu, raporlar, ana sayfa) buradan hesaplar.
/// Tutarlar KDV hariç (docs/KDV-KURALLARI.md): KDV dahil girilen komisyon, ek masraf ve giderlerin KDV'si düşülür.
/// <para>Gelir = satış + komisyon</para>
/// <para>Doğrudan maliyet = araç/taşeron maliyeti + şoför primi + müşteriye faturalanmayan ek masraf</para>
/// <para>Kâr = gelir − doğrudan maliyet − sefere bağlı onaylı giderler</para>
/// </summary>
public static class TripProfit
{
    /// <summary>Komisyon (aracılık hizmeti) KDV oranı.</summary>
    public const decimal CommissionVatRate = 20;

    /// <summary>KDV dahil tutarın KDV hariç karşılığı (2 hane).</summary>
    public static decimal NetOf(decimal gross, decimal vatRate) => vatRate > 0 ? Money.Round(gross * 100m / (100m + vatRate)) : gross;

    /// <summary>Komisyonun KDV hariç tutarı: KDV dahil girildiyse %20 KDV'si düşülür.</summary>
    public static decimal CommissionNet(decimal commission, bool vatIncluded) => vatIncluded ? NetOf(commission, CommissionVatRate) : commission;

    public static decimal Revenue(decimal sale, decimal commission) => sale + commission;

    /// <summary>Ek masraf müşteriye faturalanıyorsa firmaya yük olmaz; değilse KDV hariç tutarı (satış KDV oranıyla) maliyettir.</summary>
    public static decimal ExtraCost(decimal extraCharge, bool extraInvoiced, bool vatIncluded, decimal saleVatRate) =>
        extraInvoiced ? 0 : vatIncluded ? NetOf(extraCharge, saleVatRate) : extraCharge;

    public static decimal DirectCost(decimal vehicleCost, decimal driverBonus, decimal extraCost) => vehicleCost + driverBonus + extraCost;

    public static decimal Profit(decimal revenue, decimal directCost, decimal expenses) => revenue - directCost - expenses;

    /// <summary>Kâr yüzdesi (gelire göre, 1 hane). Gelir yoksa null.</summary>
    public static decimal? MarginPercent(decimal profit, decimal revenue) => revenue > 0 ? Math.Round(profit / revenue * 100, 1) : null;
}

/// <summary>
/// Bir seferin kazanca giren tutarları. Komisyon ve ek masraf girildiği gibi (KDV dahil olabilir) verilir, KDV'si burada düşülür.
/// <paramref name="Expenses"/> sefere bağlı onaylı giderlerin KDV hariç toplamıdır (bkz. <see cref="ExpenseVat"/>).
/// </summary>
public sealed record TripMoney(decimal Sale, decimal VehicleCost, decimal Commission, decimal DriverBonus,
    decimal ExtraCharge, bool ExtraChargeInvoiced, decimal Expenses,
    bool CommissionVatIncluded, bool ExtraChargeVatIncluded, decimal SaleVatRate)
{
    public decimal CommissionNet => TripProfit.CommissionNet(Commission, CommissionVatIncluded);
    public decimal ExtraCost => TripProfit.ExtraCost(ExtraCharge, ExtraChargeInvoiced, ExtraChargeVatIncluded, SaleVatRate);
    public decimal Revenue => TripProfit.Revenue(Sale, CommissionNet);
    public decimal DirectCost => TripProfit.DirectCost(VehicleCost, DriverBonus, ExtraCost);
    /// <summary>Giderler düşülmeden önceki katkı.</summary>
    public decimal Margin => Revenue - DirectCost;
    public decimal Profit => TripProfit.Profit(Revenue, DirectCost, Expenses);
}

/// <summary>Birden çok seferin toplamı (KDV hariç: komisyon ve ek masraf net); kâr yine <see cref="TripProfit"/> ile hesaplanır.</summary>
public sealed record TripMoneyTotals(int Count, decimal Sale, decimal VehicleCost, decimal Commission, decimal DriverBonus,
    decimal ExtraCost, decimal Expenses)
{
    public decimal Revenue => TripProfit.Revenue(Sale, Commission);
    public decimal DirectCost => TripProfit.DirectCost(VehicleCost, DriverBonus, ExtraCost);
    public decimal Profit => TripProfit.Profit(Revenue, DirectCost, Expenses);
    public decimal? MarginPercent => TripProfit.MarginPercent(Profit, Revenue);

    public static readonly TripMoneyTotals Empty = new(0, 0, 0, 0, 0, 0, 0);

    public static TripMoneyTotals Of(IEnumerable<TripMoney> trips)
    {
        int count = 0;
        decimal sale = 0, cost = 0, commission = 0, bonus = 0, extra = 0, expenses = 0;
        foreach (var t in trips)
        {
            count++;
            sale += t.Sale;
            cost += t.VehicleCost;
            commission += t.CommissionNet;
            bonus += t.DriverBonus;
            extra += t.ExtraCost;
            expenses += t.Expenses;
        }
        return new TripMoneyTotals(count, sale, cost, commission, bonus, extra, expenses);
    }
}
