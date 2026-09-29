namespace YesLojistik.Core.Entities;

/// <summary>Araç, şoför ya da firma belgesi (ruhsat, kasko, K belgesi, SRC…): numara, bitiş tarihi ve taranmış dosya.</summary>
public class FleetDocument : BaseEntity
{
    public DocumentOwnerType OwnerType { get; set; }
    /// <summary>Araç ya da şoför Id'si; firma belgesinde boş.</summary>
    public int? OwnerId { get; set; }
    public DocumentType Type { get; set; }
    public string? No { get; set; }
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public string? FilePath { get; set; }
    public string? FileContentType { get; set; }
    public string? Note { get; set; }
}
