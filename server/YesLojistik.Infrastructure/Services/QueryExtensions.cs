using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Dtos;

namespace YesLojistik.Infrastructure.Services;

public static class QueryExtensions
{
    public const int MaxPageSize = 500;
    /// <summary>Excel dışa aktarmada tek seferde en fazla satır.</summary>
    public const int ExportLimit = 20_000;

    public static IQueryable<T> ApplySort<T>(this IQueryable<T> query, string? sort, bool desc,
        IReadOnlyDictionary<string, Expression<Func<T, object?>>> map, string defaultKey, bool defaultDesc = true)
    {
        var key = sort != null && map.ContainsKey(sort) ? sort : defaultKey;
        var isDesc = sort != null && map.ContainsKey(sort) ? desc : defaultDesc;
        var ordered = isDesc ? query.OrderByDescending(map[key]) : query.OrderBy(map[key]);
        // Sayfalamanın kararlı olması için Id ile ikincil sıralama.
        return isDesc ? ordered.ThenByDescending(e => EF.Property<int>(e!, "Id")) : ordered.ThenBy(e => EF.Property<int>(e!, "Id"));
    }

    public static async Task<(List<T> Items, int Total, int Page, int PageSize)> PageAsync<T>(
        this IQueryable<T> query, ListQuery q, CancellationToken ct = default, int maxPageSize = MaxPageSize)
    {
        var pageSize = Math.Clamp(q.PageSize, 1, maxPageSize);
        var page = Math.Max(1, q.Page);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total, page, pageSize);
    }

    /// <summary>ILIKE için arama metnini hazırlar (%, _ kaçışlanır).</summary>
    public static string? LikePattern(string? search) =>
        string.IsNullOrWhiteSpace(search)
            ? null
            : "%" + search.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
}
