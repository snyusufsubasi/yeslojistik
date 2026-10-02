namespace YesLojistik.Core.Dtos;

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record ListQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
    public string? Sort { get; init; }
    public bool Desc { get; init; }
    /// <summary>Yalnızca bu kayıtlar (virgülle ayrılmış numaralar). Listede seçilenleri Excel'e aktarmak için.</summary>
    public string? Ids { get; init; }
}

public record LookupItem(int Id, string Label, string? Extra = null);

public record AuditLogDto(long Id, DateTime At, string? UserName, string Action, string EntityType, int EntityId, string? Label, string? Changes);

public record AuditQuery : ListQuery
{
    public string? EntityType { get; init; }
    public int? EntityId { get; init; }
}
