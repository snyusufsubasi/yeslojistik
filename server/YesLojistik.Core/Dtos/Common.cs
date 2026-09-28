namespace YesLojistik.Core.Dtos;

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record ListQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
    public string? Sort { get; init; }
    public bool Desc { get; init; }
}

public record LookupItem(int Id, string Label, string? Extra = null);
