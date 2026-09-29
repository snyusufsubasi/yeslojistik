namespace YesLojistik.Core.Entities;

public class Trip : BaseEntity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
    public int DriverId { get; set; }
    public Driver Driver { get; set; } = null!;
    public int? JobRequestId { get; set; }
    public JobRequest? JobRequest { get; set; }
    /// <summary>
    /// Eski sistemden aktarılan geçmiş sefer: listede ve raporlarda görünür ama taşeron borcu, "kesilecek fatura" ve risk
    /// hesaplarına girmez (bu tutarlar açılış/devir bakiyesinin içindedir).
    /// </summary>
    public bool IsLegacy { get; set; }

    public string LoadingAddress { get; set; } = "";
    public string DeliveryAddress { get; set; } = "";
    public DateOnly LoadingDate { get; set; }
    public DateOnly? DeliveryDate { get; set; }
    public string? Description { get; set; }

    public decimal VehicleCost { get; set; }
    public decimal SalePrice { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Planned;

    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    /// <summary>Müşteriye gönderilen herkese açık takip linkinin anahtarı.</summary>
    public string? TrackingToken { get; set; }

    /// <summary>Müşterinin sipariş / yük numarası.</summary>
    public string? CustomerReference { get; set; }
    public string? CargoType { get; set; }
    public decimal? CargoWeightKg { get; set; }
    public int? CargoQuantity { get; set; }
    /// <summary>palet, koli, adet...</summary>
    public string? CargoUnit { get; set; }
    public string? TrailerPlate { get; set; }
    public string? LoadingCity { get; set; }
    public string? DeliveryCity { get; set; }
    /// <summary>Yüklemede / teslimde görüşülecek kişi (ad, telefon).</summary>
    public string? LoadingContact { get; set; }
    public string? DeliveryContact { get; set; }
    /// <summary>Kiralık araçta aracın sahibi (taşeron); araç maliyeti bu tedarikçiye borç yazılır.</summary>
    public int? CarrierSupplierId { get; set; }
    public Supplier? CarrierSupplier { get; set; }
    public string? CarrierInvoiceNo { get; set; }
    public DateOnly? CarrierInvoiceDate { get; set; }
    /// <summary>Teslim alan kişi ve teslim anı (şoför uygulamasından).</summary>
    public string? ReceivedBy { get; set; }
    public DateTime? DeliveredAt { get; set; }
    /// <summary>Yükü teslim eden (şoför dışında biri teslim ettiyse).</summary>
    public string? DeliveredBy { get; set; }

    // Fiyatların vergi bilgisi (tutarlar KDV hariç). Tevkifat onda bir cinsinden; null ise faturada otomatik belirlenir.
    public decimal SaleVatRate { get; set; } = 20;
    public int? SaleWithholdingTenths { get; set; }
    public decimal CostVatRate { get; set; } = 20;
    public int? CostWithholdingTenths { get; set; }

    /// <summary>Taşerondan / şoförden alınan komisyon (aracılık geliri).</summary>
    public decimal Commission { get; set; }
    /// <summary>Komisyonun girdiği kasa/banka hesabı; boşsa nakit (hesap seçilmedi).</summary>
    public int? CommissionAccountId { get; set; }
    public CashAccount? CommissionAccount { get; set; }
    public CommissionStatus CommissionStatus { get; set; } = CommissionStatus.Pending;
    public bool CommissionInvoiced { get; set; }
    public bool CommissionVatIncluded { get; set; } = true;

    /// <summary>Sefere ait ek masraf (hamaliye, bekleme vb.); faturalanırsa müşteriye yansıtılır.</summary>
    public decimal ExtraCharge { get; set; }
    public bool ExtraChargeInvoiced { get; set; }
    public bool ExtraChargeVatIncluded { get; set; } = true;
    public string? ExtraChargeTaxNo { get; set; }
    public string? ExtraChargeTitle { get; set; }
    /// <summary>Şoföre verilen sefer primi.</summary>
    public decimal DriverBonus { get; set; }
    /// <summary>Nakliye bedeli müşteri tarafından doğrudan ödenir (ödeme müşteride).</summary>
    public bool CustomerPays { get; set; }
    /// <summary>Müşterinin alt grubu / şantiyesi / proje numarası.</summary>
    public string? CustomerGroup { get; set; }

    public string? DeliveryDocumentNo { get; set; }
    public bool DeliveryDocumentApproved { get; set; }
    public string? WaybillNo { get; set; }
    public string? EWaybillNo { get; set; }
    public DateOnly? EWaybillDate { get; set; }
    public double? LoadingLatitude { get; set; }
    public double? LoadingLongitude { get; set; }
    public double? DeliveryLatitude { get; set; }
    public double? DeliveryLongitude { get; set; }
    public int? DistanceKm { get; set; }
    /// <summary>Sevk belgesinde taşeron fiyatı gösterilmesin.</summary>
    public bool HideCarrierPrice { get; set; }
    public string? InvoiceFooterNote { get; set; }
    /// <summary>Fatura altı not faturaya yansıtılsın.</summary>
    public bool ShowFooterNote { get; set; }
    public string? PaymentTerms { get; set; }
    /// <summary>Başka sistemden aktarılan kaydın oradaki numarası (ör. Pratik Ortam sevkiyat no).</summary>
    public string? ExternalRef { get; set; }

    /// <summary>Kâra katkısı: satış − maliyet + komisyon − prim − (faturalanmayan) masraf. Giderler ayrıca düşülür.</summary>
    public static decimal Margin(decimal sale, decimal cost, decimal commission, decimal bonus, decimal extra, bool extraInvoiced) =>
        sale - cost + commission - bonus - (extraInvoiced ? 0 : extra);

    public List<Expense> Expenses { get; set; } = new();
    public List<TripEvent> Events { get; set; } = new();
    public List<TripAttachment> Attachments { get; set; } = new();
}
