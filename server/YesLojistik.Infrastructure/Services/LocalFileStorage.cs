using YesLojistik.Core.Abstractions;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Dosyaları yerel diskte (Docker volume) saklar.</summary>
public class LocalFileStorage(string root) : IFileStorage
{
    private readonly string _root = Path.GetFullPath(root);

    private string Resolve(string path)
    {
        var full = Path.GetFullPath(Path.Combine(_root, path));
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new InvalidOperationException("Geçersiz dosya yolu.");
        return full;
    }

    public async Task SaveAsync(string path, Stream content, CancellationToken ct = default)
    {
        var full = Resolve(path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = new FileStream(full, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(fs, ct);
    }

    public Task<Stream?> OpenAsync(string path, CancellationToken ct = default)
    {
        var full = Resolve(path);
        return Task.FromResult<Stream?>(File.Exists(full) ? File.OpenRead(full) : null);
    }

    public Task DeleteAsync(string path, CancellationToken ct = default)
    {
        var full = Resolve(path);
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }
}
