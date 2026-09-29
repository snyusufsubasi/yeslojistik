using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Genel arama (üst çubuk / Ctrl+K): her türden en fazla 5 sonuç.</summary>
[ApiController]
[Route("api/search")]
public class SearchController(AppDbContext db) : ControllerBase
{
    private const int PerType = 5;

    [HttpGet]
    public async Task<List<SearchResult>> Search([FromQuery] string? q, CancellationToken ct)
    {
        q = q?.Trim();
        if (string.IsNullOrEmpty(q) || q.Length < 2) return [];
        var like = QueryExtensions.LikePattern(q)!;
        var plate = Formatters.NormalizePlate(q);
        var plateLike = plate != null ? QueryExtensions.LikePattern(plate)! : like;
        int? number = int.TryParse(q.TrimStart('#'), out var n) ? n : null;
        var results = new List<SearchResult>();

        var trips = await db.Trips.AsNoTracking()
            .Where(t => (number != null && t.Id == number) || EF.Functions.ILike(t.CustomerReference ?? "", like) || EF.Functions.ILike(t.Customer.Title, like)
                || EF.Functions.ILike(t.Vehicle.Plate, plateLike) || EF.Functions.ILike(t.LoadingAddress, like) || EF.Functions.ILike(t.DeliveryAddress, like))
            .OrderByDescending(t => t.LoadingDate).Take(PerType)
            .Select(t => new { t.Id, t.LoadingAddress, t.DeliveryAddress, t.LoadingDate, Customer = t.Customer.Title, t.Vehicle.Plate, t.CustomerReference })
            .ToListAsync(ct);
        results.AddRange(trips.Select(t => new SearchResult("trip", t.Id, $"{t.LoadingAddress} → {t.DeliveryAddress}",
            $"#{t.Id} · {Formatters.Date(t.LoadingDate)} · {t.Customer} · {t.Plate}{(t.CustomerReference != null ? $" · Ref {t.CustomerReference}" : "")}", $"/seferler?id={t.Id}")));

        var customers = await db.Customers.AsNoTracking()
            .Where(c => EF.Functions.ILike(c.Title, like) || EF.Functions.ILike(c.TaxNumber ?? "", like) || EF.Functions.ILike(c.Phone ?? "", like))
            .OrderBy(c => c.Title).Take(PerType).Select(c => new { c.Id, c.Title, c.City, c.TaxNumber }).ToListAsync(ct);
        results.AddRange(customers.Select(c => new SearchResult("customer", c.Id, c.Title, string.Join(" · ", new[] { c.City, c.TaxNumber }.Where(x => x != null)), $"/musteriler/{c.Id}")));

        var suppliers = await db.Suppliers.AsNoTracking()
            .Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.TaxNumber ?? "", like) || EF.Functions.ILike(s.Phone ?? "", like))
            .OrderBy(s => s.Title).Take(PerType).Select(s => new { s.Id, s.Title, s.City }).ToListAsync(ct);
        results.AddRange(suppliers.Select(s => new SearchResult("supplier", s.Id, s.Title, s.City, $"/tedarikciler/{s.Id}")));

        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => EF.Functions.ILike(v.Plate, plateLike) || EF.Functions.ILike(v.TrailerPlate ?? "", plateLike) || EF.Functions.ILike(v.Brand ?? "", like))
            .OrderBy(v => v.Plate).Take(PerType).Select(v => new { v.Id, v.Plate, v.Type, v.Brand }).ToListAsync(ct);
        results.AddRange(vehicles.Select(v => new SearchResult("vehicle", v.Id, v.Plate, string.Join(" · ", new[] { v.Type, v.Brand }.Where(x => x != null)), $"/araclar?id={v.Id}")));

        var drivers = await db.Drivers.AsNoTracking()
            .Where(d => EF.Functions.ILike(d.FullName, like) || EF.Functions.ILike(d.Phone ?? "", like))
            .OrderBy(d => d.FullName).Take(PerType).Select(d => new { d.Id, d.FullName, d.Phone }).ToListAsync(ct);
        results.AddRange(drivers.Select(d => new SearchResult("driver", d.Id, d.FullName, d.Phone, $"/soforler?id={d.Id}")));

        var invoices = await db.Invoices.AsNoTracking()
            .Where(i => EF.Functions.ILike(i.InvoiceNo, like) || EF.Functions.ILike(i.EInvoiceNo ?? "", like))
            .OrderByDescending(i => i.Date).Take(PerType).Select(i => new { i.Id, i.InvoiceNo, i.Date, i.Total, Customer = i.Customer.Title }).ToListAsync(ct);
        results.AddRange(invoices.Select(i => new SearchResult("invoice", i.Id, i.InvoiceNo, $"{Formatters.Date(i.Date)} · {i.Customer} · {Formatters.Currency(i.Total)}", $"/faturalar?id={i.Id}")));
        return results;
    }
}
