namespace YesLojistik.Core.Domain;

public record InvoiceTotals(decimal Subtotal, decimal VatAmount, decimal WithholdingAmount, decimal Total);

public static class InvoiceCalculator
{
    /// <param name="lineAmounts">KDV hariç satır tutarları.</param>
    /// <param name="vatRate">Yüzde olarak KDV oranı (ör. 20).</param>
    /// <param name="withholdingTenths">KDV tevkifatı, onda bir olarak (ör. 2 = 2/10).</param>
    public static InvoiceTotals Calculate(IEnumerable<decimal> lineAmounts, decimal vatRate, int withholdingTenths)
    {
        if (vatRate < 0 || vatRate > 100) throw new DomainException("KDV oranı 0 ile 100 arasında olmalı.");
        if (withholdingTenths < 0 || withholdingTenths > 10) throw new DomainException("Tevkifat oranı 0/10 ile 10/10 arasında olmalı.");

        var subtotal = Money.Round(lineAmounts.Sum(Money.Round));
        var vat = Money.Round(subtotal * vatRate / 100m);
        var withholding = Money.Round(vat * withholdingTenths / 10m);
        return new InvoiceTotals(subtotal, vat, withholding, subtotal + vat - withholding);
    }

    /// <summary>
    /// Nakliye hizmetinde KDV tevkifatı sınırı (KDV dahil). "Otomatik" tevkifatta bu tutarı aşan belgeye 2/10 uygulanır
    /// (eski paneldeki davranış: 7.500 + KDV = 9.000 tevkifatsız, 15.000 + KDV = 18.000 tevkifatlı).
    /// </summary>
    public const decimal AutoWithholdingLimit = 12_000m;
    public const int FreightWithholdingTenths = 2;

    /// <summary>Tevkifat "otomatik" (null) ise tutara göre belirlenir; aksi halde verilen oran kullanılır.</summary>
    public static int WithholdingFor(decimal subtotal, decimal vatRate, int? withholdingTenths)
    {
        if (withholdingTenths is { } w) return w;
        if (vatRate <= 0) return 0;
        var gross = Money.Round(subtotal) + Money.Round(Money.Round(subtotal) * vatRate / 100m);
        return gross > AutoWithholdingLimit ? FreightWithholdingTenths : 0;
    }

    /// <summary>Tek tutar için KDV ve tevkifat (sefer fiyatı, alınan fatura).</summary>
    public static InvoiceTotals ForAmount(decimal subtotal, decimal vatRate, int? withholdingTenths) =>
        Calculate([subtotal], vatRate, WithholdingFor(subtotal, vatRate, withholdingTenths));
}
