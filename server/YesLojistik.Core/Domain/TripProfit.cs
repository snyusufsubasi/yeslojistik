namespace YesLojistik.Core.Domain;

/// <summary>
/// Seferin kazancı için tek formül. Bütün ekranlar (sefer listesi, kazanç tablosu, raporlar, ana sayfa) buradan hesaplar.
/// Tutarlar KDV hariç.
/// <para>Gelir = satış + komisyon</para>
/// <para>Doğrudan maliyet = araç/taşeron maliyeti + şoför primi + müşteriye faturalanmayan ek masraf</para>
/// <para>Kâr = gelir − doğrudan maliyet − sefere bağlı onaylı giderler</para>
/// </summary>
public static class TripProfit
{
    public static decimal Revenue(decimal sale, decimal commission) => sale + commission;

    /// <summary>Ek masraf müşteriye faturalanıyorsa firmaya yük olmaz.</summary>
    public static decimal ExtraCost(decimal extraCharge, bool extraInvoiced) => extraInvoiced ? 0 : extraCharge;

    public static decimal DirectCost(decimal vehicleCost, decimal driverBonus, decimal extraCost) => vehicleCost + driverBonus + extraCost;

    public static decimal Profit(decimal revenue, decimal directCost, decimal expenses) => revenue - directCost - expenses;

    /// <summary>Kâr yüzdesi (gelire göre, 1 hane). Gelir yoksa null.</summary>
    public static decimal? MarginPercent(decimal profit, decimal revenue) => revenue > 0 ? Math.Round(profit / revenue * 100, 1) : null;
}

/// <summary>Bir seferin kazanca giren tutarları.</summary>
public sealed record TripMoney(decimal Sale, decimal VehicleCost, decimal Commission, decimal DriverBonus,
    decimal ExtraCharge, bool ExtraChargeInvoiced, decimal Expenses)
{
    public decimal ExtraCost => TripProfit.ExtraCost(ExtraCharge, ExtraChargeInvoiced);
    public decimal Revenue => TripProfit.Revenue(Sale, Commission);
    public decimal DirectCost => TripProfit.DirectCost(VehicleCost, DriverBonus, ExtraCost);
    /// <summary>Giderler düşülmeden önceki katkı.</summary>
    public decimal Margin => Revenue - DirectCost;
    public decimal Profit => TripProfit.Profit(Revenue, DirectCost, Expenses);
}

/// <summary>Birden çok seferin toplamı; kâr yine <see cref="TripProfit"/> ile hesaplanır.</summary>
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
            commission += t.Commission;
            bonus += t.DriverBonus;
            extra += t.ExtraCost;
            expenses += t.Expenses;
        }
        return new TripMoneyTotals(count, sale, cost, commission, bonus, extra, expenses);
    }
}
