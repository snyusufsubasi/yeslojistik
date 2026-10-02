using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Dtos;

public static class BulkLimits
{
    /// <summary>Tek toplu işlemde en fazla kayıt.</summary>
    public const int MaxItems = 500;
}

/// <summary>Listede seçilen seferlere toplu işlem (en fazla <see cref="BulkLimits.MaxItems"/> kayıt).</summary>
public record BulkTripRequest(IReadOnlyList<int> TripIds);

/// <summary>Toplu işlemde değiştirilmeyen kayıt ve nedeni.</summary>
public record BulkSkippedDto(int Id, string Label, string Reason);

/// <summary>Toplu işlemin sonucu: kaç kayıt değişti, hangileri neden atlandı.</summary>
public record BulkResultDto(int Updated, IReadOnlyList<BulkSkippedDto> Skipped);

/// <summary>Toplu tedarikçi ödemesinde bir sefer ve kalan borcu.</summary>
public record BulkPaymentTripDto(int TripId, string Label, decimal Amount, string? Note);

/// <summary>Tedarikçi başına tek ödeme: seçilen seferlerin kalan borçlarının toplamı.</summary>
public record BulkPaymentSupplierDto(int SupplierId, string SupplierTitle, decimal Total, IReadOnlyList<BulkPaymentTripDto> Trips);

public record BulkPaymentPreviewDto(IReadOnlyList<BulkPaymentSupplierDto> Suppliers, IReadOnlyList<BulkSkippedDto> Skipped, decimal Total);

/// <summary>Seçilen taşeron seferleri için tedarikçi başına bir ödeme. Tutarlar sunucuda kalan borçtan hesaplanır.</summary>
public record BulkSupplierPaymentRequest(IReadOnlyList<int> TripIds, DateOnly Date, PaymentMethod Method, int? CashAccountId = null, string? Description = null);

public record BulkSupplierPaymentResultDto(IReadOnlyList<SupplierPaymentDto> Payments, decimal Total);
