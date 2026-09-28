namespace YesLojistik.Core.Abstractions;

public interface IFileStorage
{
    Task SaveAsync(string path, Stream content, CancellationToken ct = default);
    Task<Stream?> OpenAsync(string path, CancellationToken ct = default);
    Task DeleteAsync(string path, CancellationToken ct = default);
}
