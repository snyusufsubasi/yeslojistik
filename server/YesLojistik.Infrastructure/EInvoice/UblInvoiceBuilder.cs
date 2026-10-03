using System.Globalization;
using System.Xml.Linq;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.EInvoice;

/// <summary>GİB UBL-TR kod listelerinden kullanılanlar (kaynak: GİB UBL-TR Kod Listeleri). Tek yerde tutulur.</summary>
public static class EInvoiceCodes
{
    public const string UblVersion = "2.1";
    public const string Customization = "TR1.2";
    public const string VatTaxTypeCode = "0015";
    public const string VatTaxName = "KDV";
    /// <summary>Yük taşımacılığı hizmeti tevkifatı. Oran ve kod mevzuata bağlıdır; mali müşavirle teyit edilmeli.</summary>
    public const string DefaultWithholdingCode = "624";
    public const string WithholdingTaxName = "KDV TEVKİFAT";
    public const string UnitCode = "C62";
    public const string Currency = "TRY";
    /// <summary>Bireysel alıcının TCKN'si bilinmiyorsa kullanılan genel numara.</summary>
    public const string UnknownPersonTckn = "11111111111";

    public static string Profile(EInvoiceScenario s) => s switch
    {
        EInvoiceScenario.Temel => "TEMELFATURA",
        EInvoiceScenario.Ticari => "TICARIFATURA",
        _ => "EARSIVFATURA",
    };

    public static string Type(EInvoiceTypeCode t) => t == EInvoiceTypeCode.Tevkifat ? "TEVKIFAT" : "SATIS";

    /// <summary>KDV istisna kodunun açıklaması (GİB kod listesi); bilinmeyen kodda genel metin.</summary>
    public static string ExemptionReason(string code) => code switch
    {
        "311" => "14/1 Uluslararası Taşımacılık",
        "301" => "11/1-a Mal İhracatı",
        "302" => "11/1-b Hizmet İhracatı",
        _ => "KDV istisnası",
    };
}

/// <summary>
/// Faturadan UBL-TR 1.2 (UBL 2.1) XML üretir. İmza (UBLExtensions) entegratör tarafından eklenir.
/// Son şematron doğrulaması entegratörün test ortamında yapılmalıdır (docs/E-FATURA.md).
/// </summary>
public static class UblInvoiceBuilder
{
    public static readonly XNamespace Inv = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
    public static readonly XNamespace Cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    public static readonly XNamespace Cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    public static readonly XNamespace Ext = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";

    private static readonly CultureInfo Inv0 = CultureInfo.InvariantCulture;
    private static string Amt(decimal d) => YesLojistik.Core.Domain.Money.Round(d).ToString("0.00", Inv0);
    private static XElement Cur(string name, decimal value) => new(Cbc + name, new XAttribute("currencyID", EInvoiceCodes.Currency), Amt(value));

    public static string Build(Invoice invoice, Customer customer, CompanySettings company)
    {
        if (invoice.Ettn is null || invoice.EInvoiceNo is null || invoice.Scenario is null || invoice.TypeCode is null)
            throw new InvalidOperationException("Fatura e-Fatura için hazırlanmamış (ETTN / numara yok).");

        var lines = invoice.Lines.OrderBy(l => l.Id).ToList();
        var lineVat = SplitVat(lines.Select(l => l.Amount).ToList(), invoice.VatRate, invoice.VatAmount);
        var withholding = invoice.WithholdingTenths > 0;
        var withholdingPercent = invoice.WithholdingTenths * 10m;
        var lineWithholding = withholding ? SplitVat(lineVat, withholdingPercent, invoice.WithholdingAmount) : [];

        var root = new XElement(Inv + "Invoice",
            new XAttribute(XNamespace.Xmlns + "cac", Cac), new XAttribute(XNamespace.Xmlns + "cbc", Cbc), new XAttribute(XNamespace.Xmlns + "ext", Ext),
            new XElement(Ext + "UBLExtensions", new XElement(Ext + "UBLExtension", new XElement(Ext + "ExtensionContent"))),
            new XElement(Cbc + "UBLVersionID", EInvoiceCodes.UblVersion),
            new XElement(Cbc + "CustomizationID", EInvoiceCodes.Customization),
            new XElement(Cbc + "ProfileID", EInvoiceCodes.Profile(invoice.Scenario.Value)),
            new XElement(Cbc + "ID", invoice.EInvoiceNo),
            new XElement(Cbc + "CopyIndicator", "false"),
            new XElement(Cbc + "UUID", invoice.Ettn.Value.ToString().ToUpperInvariant()),
            new XElement(Cbc + "IssueDate", invoice.Date.ToString("yyyy-MM-dd", Inv0)),
            new XElement(Cbc + "IssueTime", "12:00:00"),
            new XElement(Cbc + "InvoiceTypeCode", EInvoiceCodes.Type(invoice.TypeCode.Value)),
            new XElement(Cbc + "Note", AmountInWords.Tr(invoice.Total)),
            string.IsNullOrWhiteSpace(invoice.Notes) ? null : new XElement(Cbc + "Note", invoice.Notes),
            new XElement(Cbc + "Note", $"İç fatura no: {invoice.InvoiceNo} · Vade: {invoice.DueDate:dd.MM.yyyy}"),
            new XElement(Cbc + "DocumentCurrencyCode", EInvoiceCodes.Currency),
            new XElement(Cbc + "LineCountNumeric", lines.Count),
            new XElement(Cac + "AccountingSupplierParty", Party(company.TaxNumber, company.CompanyName, company.Address, company.District, company.City,
                company.TaxOffice, company.Phone, company.Email, company.Website, company.MersisNo, company.TradeRegistryNo)),
            new XElement(Cac + "AccountingCustomerParty", Party(
                string.IsNullOrWhiteSpace(customer.TaxNumber) ? EInvoiceCodes.UnknownPersonTckn : customer.TaxNumber, customer.Title,
                customer.Address, customer.District, customer.City, customer.TaxOffice, customer.Phone, customer.Email, null, null, null)),
            new XElement(Cac + "PaymentTerms", new XElement(Cbc + "PaymentDueDate", invoice.DueDate.ToString("yyyy-MM-dd", Inv0))),
            TaxTotal(invoice.Subtotal, invoice.VatAmount, invoice.VatRate, invoice.VatExemptionCode),
            withholding ? WithholdingTotal(invoice.VatAmount, invoice.WithholdingAmount, withholdingPercent, invoice.WithholdingCode) : null,
            new XElement(Cac + "LegalMonetaryTotal",
                Cur("LineExtensionAmount", invoice.Subtotal),
                Cur("TaxExclusiveAmount", invoice.Subtotal),
                Cur("TaxInclusiveAmount", invoice.Subtotal + invoice.VatAmount),
                Cur("AllowanceTotalAmount", 0),
                Cur("PayableAmount", invoice.Total)),
            lines.Select((l, i) => new XElement(Cac + "InvoiceLine",
                new XElement(Cbc + "ID", i + 1),
                new XElement(Cbc + "InvoicedQuantity", new XAttribute("unitCode", EInvoiceCodes.UnitCode), "1"),
                Cur("LineExtensionAmount", l.Amount),
                TaxTotal(l.Amount, lineVat[i], invoice.VatRate, invoice.VatExemptionCode),
                withholding ? WithholdingTotal(lineVat[i], lineWithholding[i], withholdingPercent, invoice.WithholdingCode) : null,
                new XElement(Cac + "Item", new XElement(Cbc + "Name", l.Description)),
                new XElement(Cac + "Price", Cur("PriceAmount", l.Amount)))));

        return new XDocument(new XDeclaration("1.0", "UTF-8", null), root).Declaration + Environment.NewLine + root;
    }

    /// <summary>Toplam vergiyi satırlara oranla dağıtır; yuvarlama farkı son satıra yazılır (satırlar toplamı = belge toplamı).</summary>
    public static List<decimal> SplitVat(IReadOnlyList<decimal> bases, decimal ratePercent, decimal total)
    {
        var parts = bases.Select(b => YesLojistik.Core.Domain.Money.Round(b * ratePercent / 100m)).ToList();
        if (parts.Count > 0) parts[^1] += total - parts.Sum();
        return parts;
    }

    private static XElement TaxTotal(decimal taxable, decimal vat, decimal rate, string? exemptionCode) =>
        new(Cac + "TaxTotal",
            Cur("TaxAmount", vat),
            new XElement(Cac + "TaxSubtotal",
                Cur("TaxableAmount", taxable),
                Cur("TaxAmount", vat),
                new XElement(Cbc + "Percent", rate.ToString("0.##", Inv0)),
                new XElement(Cac + "TaxCategory",
                    rate == 0 ? new XElement(Cbc + "TaxExemptionReasonCode", exemptionCode ?? InvoiceCalculator.DefaultVatExemptionCode) : null,
                    rate == 0 ? new XElement(Cbc + "TaxExemptionReason", EInvoiceCodes.ExemptionReason(exemptionCode ?? InvoiceCalculator.DefaultVatExemptionCode)) : null,
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "Name", EInvoiceCodes.VatTaxName),
                        new XElement(Cbc + "TaxTypeCode", EInvoiceCodes.VatTaxTypeCode)))));

    private static XElement WithholdingTotal(decimal vat, decimal withheld, decimal percent, string? code) =>
        new(Cac + "WithholdingTaxTotal",
            Cur("TaxAmount", withheld),
            new XElement(Cac + "TaxSubtotal",
                Cur("TaxableAmount", vat),
                Cur("TaxAmount", withheld),
                new XElement(Cbc + "Percent", percent.ToString("0.##", Inv0)),
                new XElement(Cac + "TaxCategory",
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "Name", EInvoiceCodes.WithholdingTaxName),
                        new XElement(Cbc + "TaxTypeCode", code ?? EInvoiceCodes.DefaultWithholdingCode)))));

    private static XElement Party(string? taxNo, string title, string? address, string? district, string? city, string? taxOffice,
        string? phone, string? email, string? website, string? mersis, string? tradeRegistry)
    {
        var id = (taxNo ?? "").Trim();
        var isPerson = id.Length == 11;
        var (first, family) = SplitName(title);
        return new XElement(Cac + "Party",
            string.IsNullOrWhiteSpace(website) ? null : new XElement(Cbc + "WebsiteURI", website),
            new XElement(Cac + "PartyIdentification", new XElement(Cbc + "ID", new XAttribute("schemeID", isPerson ? "TCKN" : "VKN"), id)),
            string.IsNullOrWhiteSpace(mersis) ? null : new XElement(Cac + "PartyIdentification", new XElement(Cbc + "ID", new XAttribute("schemeID", "MERSISNO"), mersis)),
            string.IsNullOrWhiteSpace(tradeRegistry) ? null : new XElement(Cac + "PartyIdentification", new XElement(Cbc + "ID", new XAttribute("schemeID", "TICARETSICILNO"), tradeRegistry)),
            isPerson ? null : new XElement(Cac + "PartyName", new XElement(Cbc + "Name", title)),
            new XElement(Cac + "PostalAddress",
                new XElement(Cbc + "StreetName", string.IsNullOrWhiteSpace(address) ? "-" : address),
                new XElement(Cbc + "CitySubdivisionName", string.IsNullOrWhiteSpace(district) ? (city ?? "-") : district),
                new XElement(Cbc + "CityName", string.IsNullOrWhiteSpace(city) ? "-" : city),
                new XElement(Cac + "Country", new XElement(Cbc + "Name", "Türkiye"))),
            new XElement(Cac + "PartyTaxScheme", new XElement(Cac + "TaxScheme", new XElement(Cbc + "Name", string.IsNullOrWhiteSpace(taxOffice) ? "-" : taxOffice))),
            string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(email) ? null : new XElement(Cac + "Contact",
                string.IsNullOrWhiteSpace(phone) ? null : new XElement(Cbc + "Telephone", phone),
                string.IsNullOrWhiteSpace(email) ? null : new XElement(Cbc + "ElectronicMail", email)),
            isPerson ? new XElement(Cac + "Person", new XElement(Cbc + "FirstName", first), new XElement(Cbc + "FamilyName", family)) : null);
    }

    /// <summary>"Ayşe Nur Yılmaz" → ("Ayşe Nur", "Yılmaz"): son kelime soyad sayılır.</summary>
    public static (string First, string Family) SplitName(string full)
    {
        var parts = full.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length <= 1 ? (full.Trim(), "-") : (string.Join(' ', parts[..^1]), parts[^1]);
    }
}
