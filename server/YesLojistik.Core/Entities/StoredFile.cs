namespace YesLojistik.Core.Entities;

/// <summary>Veritabanında saklanan dosya (teslim fotoğrafı, imza, belge). Yedek tek pg_dump ile her şeyi kapsasın diye.</summary>
public class StoredFile
{
    public long Id { get; set; }
    public string Path { get; set; } = "";
    public string? ContentType { get; set; }
    public long Size { get; set; }
    public byte[] Content { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}
