namespace YesLojistik.Core.Abstractions;

public interface ICurrentUser
{
    int? Id { get; }
    string? Name { get; }
}
