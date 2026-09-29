using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class AttachmentService(AppDbContext db, IFileStorage storage)
{
    public const long MaxSize = 10 * 1024 * 1024;

    public async Task<List<AttachmentDto>> ListAsync(int tripId, CancellationToken ct = default) =>
        await db.TripAttachments.AsNoTracking().Where(a => a.TripId == tripId).OrderByDescending(a => a.CreatedAt)
            .Select(a => ToDto(a)).ToListAsync(ct);

    public async Task<AttachmentDto> UploadAsync(int tripId, Stream content, long length, string fileName, AttachmentKind kind,
        string? note, CancellationToken ct = default, Guid? clientRequestId = null)
    {
        if (clientRequestId != null && await db.TripAttachments.AsNoTracking().FirstOrDefaultAsync(a => a.ClientRequestId == clientRequestId, ct) is { } same)
            return ToDto(same);
        if (!await db.Trips.AnyAsync(t => t.Id == tripId, ct)) throw new NotFoundException("Sefer bulunamadı.");
        if (length <= 0) throw new DomainException("Dosya boş.");
        if (length > MaxSize) throw new DomainException("Dosya en fazla 10 MB olabilir.");

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var (contentType, ext) = Sniff(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)))
            ?? throw new DomainException("Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir.");

        var path = $"trips/{tripId}/{Guid.NewGuid():N}{ext}";
        buffer.Position = 0;
        await storage.SaveAsync(path, buffer, ct);

        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName)) safeName = "dosya" + ext;
        var attachment = new TripAttachment
        {
            TripId = tripId, Kind = kind, ContentType = contentType, Size = buffer.Length, StoragePath = path,
            FileName = safeName.Length > 200 ? safeName[^200..] : safeName, Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            ClientRequestId = clientRequestId,
        };
        db.TripAttachments.Add(attachment);
        await db.SaveChangesAsync(ct);
        return ToDto(attachment);
    }

    public async Task<(Stream Content, string ContentType, string FileName)> OpenAsync(int id, CancellationToken ct = default)
    {
        var a = await db.TripAttachments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Dosya bulunamadı.");
        var stream = await storage.OpenAsync(a.StoragePath, ct) ?? throw new NotFoundException("Dosya depolamada bulunamadı.");
        return (stream, a.ContentType, a.FileName);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var a = await db.TripAttachments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Dosya bulunamadı.");
        a.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        await storage.DeleteAsync(a.StoragePath, ct);
    }

    /// <summary>Dosya türünü uzantıya değil içeriğin ilk baytlarına bakarak belirler.</summary>
    public static (string ContentType, string Ext)? Sniff(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF) return ("image/jpeg", ".jpg");
        if (head.Length >= 8 && head[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return ("image/png", ".png");
        if (head.Length >= 12 && head[..4].SequenceEqual("RIFF"u8) && head[8..12].SequenceEqual("WEBP"u8)) return ("image/webp", ".webp");
        if (head.Length >= 5 && head[..5].SequenceEqual("%PDF-"u8)) return ("application/pdf", ".pdf");
        return null;
    }

    private static AttachmentDto ToDto(TripAttachment a) =>
        new(a.Id, a.TripId, a.Kind, a.FileName, a.ContentType, a.Size, a.Note, a.CreatedBy, a.CreatedAt);
}
