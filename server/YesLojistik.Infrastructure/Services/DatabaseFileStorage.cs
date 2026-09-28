using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Dosyaları PostgreSQL'de (stored_files) saklar. Kalıcı disk olmayan ortamlarda (Render) dosyalar kaybolmaz.</summary>
public class DatabaseFileStorage(AppDbContext db) : IFileStorage
{
    public async Task SaveAsync(string path, Stream content, CancellationToken ct = default)
    {
        if (await db.StoredFiles.AnyAsync(f => f.Path == path, ct))
            throw new InvalidOperationException("Bu yolda zaten bir dosya var.");
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        await db.StoredFiles.AddAsync(new StoredFile { Path = path, Content = bytes, Size = bytes.Length, CreatedAt = DateTime.UtcNow }, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task<Stream?> OpenAsync(string path, CancellationToken ct = default)
    {
        var bytes = await db.StoredFiles.AsNoTracking().Where(f => f.Path == path).Select(f => f.Content).FirstOrDefaultAsync(ct);
        return bytes == null ? null : new MemoryStream(bytes, writable: false);
    }

    public async Task DeleteAsync(string path, CancellationToken ct = default) =>
        await db.StoredFiles.Where(f => f.Path == path).ExecuteDeleteAsync(ct);
}
