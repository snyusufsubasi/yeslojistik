using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

/// <summary>
/// "Akıllı alan" önerileri: serbest yazılan bir alanda (yük cinsi, araç tipi, gider adı…) firmanın kendi kayıtlarında
/// en sık kullanılan değerler, kullanım sayısıyla. Yeni tablo yok: değerler mevcut kayıtlardan okunur.
/// İstemci bu listeyi sektör varsayılanlarıyla birleştirir (client/src/lib/sectorOptions.ts).
/// </summary>
[ApiController]
[Route("api/options")]
public class OptionsController(AppDbContext db) : ControllerBase
{
    private const int Limit = 60;
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    /// <summary>Desteklenen alanlar. Adlar istemcideki <c>SmartField field=…</c> ile aynıdır.</summary>
    public static readonly string[] Fields =
    [
        "cargoType", "cargoUnit", "paymentTerms", "customerGroup",
        "vehicleType", "fuelType", "vehicleCapacity",
        "expenseTitle", "expenseCategoryName", "expenseRejectionReason",
    ];

    [HttpGet("{field}")]
    public async Task<ActionResult<List<OptionUsageDto>>> Get(string field, CancellationToken ct)
    {
        IQueryable<string?>? source = field switch
        {
            "cargoType" => db.Trips.AsNoTracking().Select(t => t.CargoType),
            "cargoUnit" => db.Trips.AsNoTracking().Select(t => t.CargoUnit),
            "paymentTerms" => db.Trips.AsNoTracking().Select(t => t.PaymentTerms),
            "customerGroup" => db.Trips.AsNoTracking().Select(t => t.CustomerGroup),
            "vehicleType" => db.Vehicles.AsNoTracking().Select(v => (string?)v.Type),
            "vehicleCapacity" => db.Vehicles.AsNoTracking().Select(v => v.Capacity),
            "expenseTitle" => db.Expenses.AsNoTracking().Select(e => e.Title),
            "expenseCategoryName" => db.Expenses.AsNoTracking().Select(e => e.CategoryName),
            "expenseRejectionReason" => db.Expenses.AsNoTracking().Select(e => e.RejectionReason),
            _ => null,
        };
        List<(string Value, int Count)> rows;
        if (field == "fuelType")
        {
            // Yakıt türü hem araç kartında hem yakıt (mazot) giderinde yazılır: ikisi birlikte sayılır.
            var a = await Count(db.Vehicles.AsNoTracking().Select(v => v.FuelType), ct);
            var b = await Count(db.Expenses.AsNoTracking().Select(e => e.FuelType), ct);
            rows = [.. a, .. b];
        }
        else if (source is null) return NotFound(new { message = $"Bilinmeyen alan: {field}" });
        else rows = await Count(source, ct);

        // Büyük/küçük harf ve boşluk farkı aynı değer sayılır; en sık yazılan biçim gösterilir.
        return rows
            .GroupBy(r => r.Value.Trim().ToLower(Tr))
            .Select(g => new OptionUsageDto(
                g.GroupBy(r => r.Value.Trim()).OrderByDescending(x => x.Sum(r => r.Count)).First().Key,
                g.Sum(r => r.Count)))
            .OrderByDescending(o => o.Count).ThenBy(o => o.Value, StringComparer.Create(Tr, true))
            .Take(Limit)
            .ToList();
    }

    private static async Task<List<(string Value, int Count)>> Count(IQueryable<string?> source, CancellationToken ct)
    {
        var raw = await source.Where(v => v != null && v != "")
            .GroupBy(v => v!).Select(g => new { Value = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(500).ToListAsync(ct);
        return raw.Where(r => !string.IsNullOrWhiteSpace(r.Value)).Select(r => (r.Value, r.Count)).ToList();
    }
}
