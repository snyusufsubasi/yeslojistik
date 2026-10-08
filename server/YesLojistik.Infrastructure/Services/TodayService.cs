using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// "Bugün" ekranının sevkiyat listeleri. Aynı tanım hem kartın sayısını hem de Sevkiyatlar listesindeki <c>?bugun=</c> süzgecini
/// verir; böylece karttaki sayı ile tıklanınca açılan liste hep aynıdır. Eski sistemden aktarılan (IsLegacy) seferler sayılmaz.
/// </summary>
public static class TripAgenda
{
    public const string Late = "late", Loading = "loading", Delivery = "delivery", Document = "document", Invoice = "invoice", Problem = "problem";

    /// <summary>Teslim edilmiş ama sorun nedeni girilmiş seferler bu kadar gün "sorunlu" listesinde kalır.</summary>
    public const int ProblemDays = 30;

    public static IQueryable<Trip> Apply(IQueryable<Trip> q, string agenda, DateOnly today)
    {
        q = q.Where(t => !t.IsLegacy);
        var problemFrom = today.AddDays(-ProblemDays);
        return agenda.Trim().ToLowerInvariant() switch
        {
            // Teslim tarihi geçmiş ve hâlâ teslim edilmemiş; ya da yükleme günü geçtiği halde yüklenmemiş.
            Late => q.Where(t => (t.Status == TripStatus.Planned || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad)
                && ((t.DeliveryDate != null && t.DeliveryDate < today) || (t.Status == TripStatus.Planned && t.LoadingDate < today))),
            Loading => q.Where(t => t.Status == TripStatus.Planned && t.LoadingDate == today),
            Delivery => q.Where(t => (t.Status == TripStatus.Planned || t.Status == TripStatus.Loaded || t.Status == TripStatus.OnRoad)
                && t.DeliveryDate == today),
            // Teslim edildi ama teslim evrakı yok: evrak no girilmemiş, belge yüklenmemiş, onaylanmamış.
            Document => q.Where(t => t.Status == TripStatus.Delivered && !t.DeliveryDocumentApproved && (t.DeliveryDocumentNo ?? "") == ""
                && !t.Attachments.Any(a => a.Kind == AttachmentKind.Document)),
            Invoice => q.Where(t => t.Status == TripStatus.Delivered && t.InvoiceId == null),
            Problem => q.Where(t => t.ProblemReason != null && t.Status != TripStatus.Cancelled
                && (t.Status != TripStatus.Delivered || t.LoadingDate >= problemFrom)),
            _ => q,
        };
    }
}

public class TodayService(AppDbContext db, BalanceService balances)
{
    public const int MaxItems = 20;
    public const int DocumentWarnDays = AlertService.DocumentWarnDays;

    public async Task<TodayDto> GetAsync(bool includeMoney, CancellationToken ct = default)
    {
        var today = Clock.Today;
        var sections = new List<TodaySectionDto>
        {
            await TripSectionAsync(TripAgenda.Late, "Geciken sevkiyatlar", today, q => q.OrderBy(t => t.DeliveryDate ?? t.LoadingDate), ct),
            await TripSectionAsync(TripAgenda.Loading, "Bugün yüklenecekler", today, q => q.OrderBy(t => t.LoadingTime).ThenBy(t => t.Id), ct),
            await TripSectionAsync(TripAgenda.Delivery, "Bugün teslim edilecekler", today, q => q.OrderBy(t => t.LoadingDate).ThenBy(t => t.Id), ct),
            await TripSectionAsync(TripAgenda.Problem, "Sorunlu sevkiyatlar", today, q => q.OrderByDescending(t => t.LoadingDate), ct),
            await TripSectionAsync(TripAgenda.Document, "Teslim evrakı eksik", today, q => q.OrderBy(t => t.DeliveryDate ?? t.LoadingDate), ct),
            await TripSectionAsync(TripAgenda.Invoice, "Faturalanmayı bekleyenler", today, q => q.OrderBy(t => t.DeliveryDate ?? t.LoadingDate), ct,
                total: true),
        };
        if (includeMoney) sections.Add(await CollectionsAsync(today, ct));
        sections.Add(await DocumentsAsync(today, ct));
        return new TodayDto(today, sections);
    }

    private async Task<TodaySectionDto> TripSectionAsync(string agenda, string title, DateOnly today,
        Func<IQueryable<Trip>, IOrderedQueryable<Trip>> order, CancellationToken ct, bool total = false)
    {
        var q = TripAgenda.Apply(db.Trips.AsNoTracking(), agenda, today);
        var count = await q.CountAsync(ct);
        if (count == 0) return new TodaySectionDto(agenda, title, 0, $"/seferler?bugun={agenda}", [], total ? 0 : null);
        var sum = total ? await q.SumAsync(t => t.SalePrice, ct) : (decimal?)null;
        var rows = await order(q).Take(MaxItems).Select(t => new
        {
            t.Id, t.ExternalRef, Customer = t.Customer.Title, Plate = t.Vehicle.Plate, t.LoadingCity, t.DeliveryCity, t.LoadingAddress,
            t.DeliveryAddress, t.LoadingDate, t.DeliveryDate, t.LoadingTime, t.Status, t.SalePrice, t.ProblemReason,
        }).ToListAsync(ct);

        var items = rows.Select(r =>
        {
            var route = $"{Place(r.LoadingCity, r.LoadingAddress)} → {Place(r.DeliveryCity, r.DeliveryAddress)}";
            var sub = $"No {r.ExternalRef ?? r.Id.ToString()} · {route} · {r.Plate}";
            string? tone = null, badge = null;
            DateOnly? date = r.LoadingDate;
            switch (agenda)
            {
                case TripAgenda.Late:
                    var due = r.DeliveryDate is { } dd && dd < today ? dd : r.LoadingDate;
                    var days = today.DayNumber - due.DayNumber;
                    tone = "danger"; date = due;
                    badge = r.DeliveryDate is { } d2 && d2 < today ? $"Teslim {days} gün gecikti" : $"Yükleme {days} gün gecikti";
                    break;
                case TripAgenda.Loading:
                    badge = r.LoadingTime is { } lt ? $"Saat {lt:HH\\:mm}" : null;
                    break;
                case TripAgenda.Delivery:
                    date = r.DeliveryDate; badge = StatusLabel(r.Status);
                    break;
                case TripAgenda.Problem:
                    tone = "warning"; badge = r.ProblemReason;
                    break;
                case TripAgenda.Document:
                case TripAgenda.Invoice:
                    date = r.DeliveryDate ?? r.LoadingDate;
                    var waited = today.DayNumber - date.Value.DayNumber;
                    if (waited > 0) badge = $"{waited} gündür";
                    if (waited > 15) tone = "warning";
                    break;
            }
            return new TodayItemDto(r.Customer, sub, $"/seferler?id={r.Id}", date, agenda == TripAgenda.Invoice ? r.SalePrice : null, tone, badge);
        }).ToList();
        return new TodaySectionDto(agenda, title, count, $"/seferler?bugun={agenda}", items, sum);
    }

    /// <summary>Vadesi geçmiş ya da bugün olan açık alacaklar (fatura ve devir kalemleri; tahsilatlar FIFO dağıtılmış haliyle).</summary>
    private async Task<TodaySectionDto> CollectionsAsync(DateOnly today, CancellationToken ct)
    {
        var all = await balances.BalancesByCustomerAsync(null, ct);
        var due = all.SelectMany(g => g.Where(b => b.Remaining > 0 && b.DueDate <= today).Select(b => (CustomerId: g.Key, Balance: b)))
            .OrderBy(x => x.Balance.DueDate).ToList();
        var top = due.Take(MaxItems).ToList();
        var customerIds = top.Select(x => x.CustomerId).Distinct().ToList();
        var invoiceIds = top.Where(x => x.Balance.InvoiceId > 0).Select(x => x.Balance.InvoiceId).ToList();
        var titles = await db.Customers.AsNoTracking().Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Title, ct);
        var numbers = await db.Invoices.AsNoTracking().Where(i => invoiceIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i.InvoiceNo, ct);
        var items = top.Select(x =>
        {
            var b = x.Balance;
            var days = today.DayNumber - b.DueDate.DayNumber;
            var isInvoice = b.InvoiceId > 0;
            return new TodayItemDto(titles.GetValueOrDefault(x.CustomerId, "?"),
                isInvoice ? $"Fatura {numbers.GetValueOrDefault(b.InvoiceId, "")}" : "Devir bakiyesi",
                isInvoice ? $"/faturalar?id={b.InvoiceId}" : $"/musteriler/{x.CustomerId}", b.DueDate, b.Remaining,
                days > 0 ? "danger" : "warning", days > 0 ? $"Vadesi {days} gün geçti" : "Bugün vadeli");
        }).ToList();
        return new TodaySectionDto("collections", "Vadesi gelen tahsilatlar", due.Count, "/faturalar?unpaid=1", items,
            Money.Round(due.Sum(x => x.Balance.Remaining)));
    }

    /// <summary>
    /// 30 gün içinde dolacak (ya da dolmuş) belgeler: araç muayene, trafik sigortası, kasko, egzoz; Belgeler sekmesindeki belgeler
    /// (K belgesi, takograf…); kendi şoförlerimizin ehliyet, SRC ve psikoteknik belgeleri. Uyarı çubuğuyla aynı kurallar.
    /// </summary>
    private async Task<TodaySectionDto> DocumentsAsync(DateOnly today, CancellationToken ct)
    {
        var limit = today.AddDays(DocumentWarnDays);
        var list = new List<(DateOnly Date, string Owner, string What, string Link)>();
        void Add(DateOnly? d, string owner, string what, string link)
        {
            if (d is { } x && x <= limit) list.Add((x, owner, what, link));
        }

        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => v.InspectionExpiry <= limit || v.InsuranceExpiry <= limit || v.CascoExpiry <= limit || v.EmissionExpiry <= limit)
            .Select(v => new { v.Id, v.Plate, v.InspectionExpiry, v.InsuranceExpiry, v.CascoExpiry, v.EmissionExpiry }).ToListAsync(ct);
        foreach (var v in vehicles)
        {
            var link = $"/araclar?id={v.Id}";
            Add(v.InspectionExpiry, v.Plate, "Araç muayenesi", link);
            Add(v.InsuranceExpiry, v.Plate, "Trafik sigortası", link);
            Add(v.CascoExpiry, v.Plate, "Kasko", link);
            Add(v.EmissionExpiry, v.Plate, "Egzoz emisyon", link);
        }

        // Taşeronun şoförlerinin belgeleri taşeronun sorumluluğunda; yalnızca kendi aktif şoförlerimiz.
        var drivers = await db.Drivers.AsNoTracking()
            .Where(d => d.IsActive && d.SupplierId == null && (d.LicenseExpiry <= limit || d.SrcExpiry <= limit || d.PsychotechnicExpiry <= limit))
            .Select(d => new { d.Id, d.FullName, d.LicenseExpiry, d.SrcExpiry, d.PsychotechnicExpiry }).ToListAsync(ct);
        foreach (var d in drivers)
        {
            var link = $"/soforler?id={d.Id}";
            Add(d.LicenseExpiry, d.FullName, "Ehliyet", link);
            Add(d.SrcExpiry, d.FullName, "SRC belgesi", link);
            Add(d.PsychotechnicExpiry, d.FullName, "Psikoteknik belgesi", link);
        }

        var docs = await db.Documents.AsNoTracking().Where(d => d.ExpiryDate != null && d.ExpiryDate <= limit)
            .Select(d => new { d.OwnerType, d.OwnerId, d.Type, d.ExpiryDate }).ToListAsync(ct);
        if (docs.Count > 0)
        {
            var vIds = docs.Where(d => d.OwnerType == DocumentOwnerType.Vehicle && d.OwnerId != null).Select(d => d.OwnerId!.Value).Distinct().ToList();
            var dIds = docs.Where(d => d.OwnerType == DocumentOwnerType.Driver && d.OwnerId != null).Select(d => d.OwnerId!.Value).Distinct().ToList();
            var plates = await db.Vehicles.AsNoTracking().Where(v => vIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Plate, ct);
            var names = await db.Drivers.AsNoTracking().Where(d => d.IsActive && dIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
            foreach (var doc in docs)
            {
                var label = FleetService.DocumentTypeLabel(doc.Type);
                switch (doc.OwnerType)
                {
                    case DocumentOwnerType.Vehicle when doc.OwnerId is { } vid && plates.TryGetValue(vid, out var plate):
                        Add(doc.ExpiryDate, plate, label, $"/araclar?id={vid}");
                        break;
                    case DocumentOwnerType.Driver when doc.OwnerId is { } did && names.TryGetValue(did, out var name):
                        Add(doc.ExpiryDate, name, label, $"/soforler?id={did}");
                        break;
                    case DocumentOwnerType.Company:
                        Add(doc.ExpiryDate, "Firma", label, "/ayarlar");
                        break;
                }
            }
        }

        var items = list.OrderBy(x => x.Date).Take(MaxItems).Select(x =>
        {
            var days = x.Date.DayNumber - today.DayNumber;
            return new TodayItemDto(x.Owner, x.What, x.Link, x.Date, null, days < 0 ? "danger" : "warning",
                days < 0 ? $"{-days} gün önce doldu" : days == 0 ? "Bugün doluyor" : $"{days} gün kaldı");
        }).ToList();
        return new TodaySectionDto("documents", "Süresi dolan belgeler", list.Count, null, items);
    }

    private static string Place(string? city, string address) =>
        !string.IsNullOrWhiteSpace(city) ? city : address.Length > 24 ? address[..24] + "…" : address;

    private static string StatusLabel(TripStatus s) => s switch
    {
        TripStatus.Planned => "Planlandı",
        TripStatus.Loaded => "Yüklendi",
        TripStatus.OnRoad => "Yolda",
        TripStatus.Delivered => "Teslim edildi",
        _ => "İptal",
    };
}
