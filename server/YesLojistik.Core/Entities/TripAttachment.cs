namespace YesLojistik.Core.Entities;

/// <summary>Sefere eklenen dosya: teslim fotoğrafı, irsaliye, imza vb.</summary>
public class TripAttachment : BaseEntity
{
    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public AttachmentKind Kind { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    /// <summary>Depolama içindeki göreli yol.</summary>
    public string StoragePath { get; set; } = "";
    public string? Note { get; set; }
}
