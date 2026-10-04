namespace YesLojistik.Core.Dtos;

/// <summary>Hazırlık kontrolünde bulunan madde. Target: Trip, Driver, Vehicle ya da Customer; TargetId düzeltilecek kaydın numarası.</summary>
public record UetdsIssueDto(string Code, string Target, int? TargetId, string Message, string? Field, bool Blocking);

/// <summary>
/// "U-ETDS'ye hazır mı?" sonucu. Ready: eksik (Blocking) madde yok. MissingCount: eksik madde sayısı; Issues "kontrol edin" notlarını da içerir.
/// Bu bir hazırlık kontrolüdür, Bakanlığa bildirim gönderilmez.
/// </summary>
public record UetdsReadinessDto(int TripId, bool Ready, int MissingCount, IReadOnlyList<UetdsIssueDto> Issues);
