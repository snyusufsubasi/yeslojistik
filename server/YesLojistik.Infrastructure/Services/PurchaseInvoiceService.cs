using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>
/// Tedarikçiden alınan faturalar. Faturaya bağlanan taşeron seferleri "fatura bekleyen sefer" olmaktan çıkar ve seferin
/// taşeron fatura no/tarihi faturadan yazılır; borç artık faturanın ödenecek tutarından gelir (bkz. <see cref="PayableService"/>).
/// </summary>
public class PurchaseInvoiceService(AppDbContext db, IFileStorage storage)
{
    private static string RouteOf(string from, string to) => $"{from} → {to}";

    public async Task<PagedResult<PurchaseInvoiceDto>> ListAsync(PurchaseInvoiceQuery q, CancellationToken ct = default, bool export = false)
    {
        var (ids, total, page, size) = await Filter(q).OrderByDescending(p => p.Date).ThenByDescending(p => p.Id)
            .Select(p => p.Id).PageAsync(q, ct, export ? QueryExtensions.ExportLimit : QueryExtensions.MaxPageSize);
        var items = await LoadAsync(ids, ct);
        return new PagedResult<PurchaseInvoiceDto>(ids.Select(id => items[id]).ToList(), total, page, size);
    }

    public IQueryable<PurchaseInvoice> Filter(PurchaseInvoiceQuery q)
    {
        var query = db.PurchaseInvoices.AsNoTracking();
        if (q.IncludeCancelled != true) query = query.Where(p => !p.IsCancelled);
        if (q.SupplierId is { } s) query = query.Where(p => p.SupplierId == s);
        if (q.From is { } from) query = query.Where(p => p.Date >= from);
        if (q.To is { } to) query = query.Where(p => p.Date <= to);
        if (q.Kind is { } kind) query = query.Where(p => p.Kind == kind);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(p => EF.Functions.ILike(p.InvoiceNo, like) || EF.Functions.ILike(p.Supplier.Title, like)
                || EF.Functions.ILike(p.Notes ?? "", like) || EF.Functions.ILike(p.Supplier.TaxNumber ?? "", like));
        return query;
    }

    public async Task<PurchaseInvoiceDto> GetAsync(int id, CancellationToken ct = default) =>
        (await LoadAsync([id], ct)).GetValueOrDefault(id) ?? throw new NotFoundException("Fatura bulunamadı.");

    private async Task<Dictionary<int, PurchaseInvoiceDto>> LoadAsync(IReadOnlyCollection<int> ids, CancellationToken ct)
    {
        var rows = await db.PurchaseInvoices.AsNoTracking().Where(p => ids.Contains(p.Id)).Select(p => new
        {
            p.Id, p.SupplierId, SupplierTitle = p.Supplier.Title, p.InvoiceNo, p.Date, p.DueDate, p.Kind, p.Subtotal, p.VatAmount,
            p.WithholdingAmount, p.Total, p.Notes, p.IsCancelled, p.CancelReason, HasFile = p.FilePath != null, p.ExternalRef,
        }).ToListAsync(ct);
        var trips = await db.Trips.AsNoTracking().Where(t => t.PurchaseInvoiceId != null && ids.Contains(t.PurchaseInvoiceId.Value))
            .OrderBy(t => t.LoadingDate).Select(t => new
            {
                InvoiceId = t.PurchaseInvoiceId!.Value, t.Id, t.LoadingDate, t.LoadingAddress, t.DeliveryAddress, t.Vehicle.Plate,
                t.VehicleCost, t.CostVatRate, t.CostWithholdingTenths, t.ExternalRef,
            }).ToListAsync(ct);
        var byInvoice = trips.ToLookup(t => t.InvoiceId);
        return rows.ToDictionary(p => p.Id, p => new PurchaseInvoiceDto(p.Id, p.SupplierId, p.SupplierTitle, p.InvoiceNo, p.Date, p.DueDate, p.Kind,
            p.Subtotal, p.VatAmount, p.WithholdingAmount, p.Total, p.Notes, p.IsCancelled, p.CancelReason, p.HasFile, p.ExternalRef,
            byInvoice[p.Id].Select(t => new PurchaseInvoiceTripDto(t.Id, t.LoadingDate, RouteOf(t.LoadingAddress, t.DeliveryAddress), t.Plate,
                t.VehicleCost, Trip.CarrierPayable(t.VehicleCost, t.CostVatRate, t.CostWithholdingTenths), t.ExternalRef)).ToList()));
    }

    /// <summary>Tedarikçinin faturası gelmemiş (hiçbir alınan faturaya bağlı olmayan) taşeron seferleri.</summary>
    public async Task<List<UninvoicedCarrierTripDto>> UninvoicedTripsAsync(int supplierId, int? includeInvoiceId, CancellationToken ct = default)
    {
        var rows = await db.Trips.AsNoTracking()
            .Where(t => t.CarrierSupplierId == supplierId && t.Status != TripStatus.Cancelled
                && (t.PurchaseInvoiceId == null || t.PurchaseInvoiceId == includeInvoiceId))
            .OrderBy(t => t.LoadingDate).ThenBy(t => t.Id)
            .Select(t => new { t.Id, t.LoadingDate, t.LoadingAddress, t.DeliveryAddress, t.Vehicle.Plate, t.VehicleCost, t.CostVatRate, t.CostWithholdingTenths, t.ExternalRef })
            .ToListAsync(ct);
        return rows.Select(t => new UninvoicedCarrierTripDto(t.Id, t.LoadingDate, RouteOf(t.LoadingAddress, t.DeliveryAddress), t.Plate, t.VehicleCost,
            t.CostVatRate, Trip.CarrierPayable(t.VehicleCost, t.CostVatRate, t.CostWithholdingTenths), t.ExternalRef)).ToList();
    }

    public async Task<PurchaseInvoiceDto> CreateAsync(PurchaseInvoiceSaveRequest req, CancellationToken ct = default)
    {
        var entity = new PurchaseInvoice();
        await ApplyAsync(entity, req, ct);
        db.PurchaseInvoices.Add(entity);
        await db.SaveChangesAsync(ct);
        await LinkTripsAsync(entity, req.TripIds ?? [], ct);
        return await GetAsync(entity.Id, ct);
    }

    public async Task<PurchaseInvoiceDto> UpdateAsync(int id, PurchaseInvoiceSaveRequest req, CancellationToken ct = default)
    {
        var entity = await db.PurchaseInvoices.FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (entity.IsCancelled) throw new DomainException("İptal edilmiş fatura düzenlenemez.");
        await ApplyAsync(entity, req, ct);
        await db.SaveChangesAsync(ct);
        await LinkTripsAsync(entity, req.TripIds ?? [], ct);
        return await GetAsync(id, ct);
    }

    /// <summary>İptal edilen faturanın seferleri yeniden "fatura bekleyen" olur; kayıt geçmiş için saklanır.</summary>
    public async Task<PurchaseInvoiceDto> CancelAsync(int id, string? reason, CancellationToken ct = default)
    {
        var entity = await db.PurchaseInvoices.FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (entity.IsCancelled) throw new DomainException("Fatura zaten iptal edilmiş.");
        entity.IsCancelled = true;
        entity.CancelReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        await LinkTripsAsync(entity, [], ct);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await db.PurchaseInvoices.FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        await LinkTripsAsync(entity, [], ct);
        entity.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task SaveFileAsync(int id, Stream content, long length, CancellationToken ct = default)
    {
        var entity = await db.PurchaseInvoices.FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (length <= 0) throw new DomainException("Dosya boş.");
        if (length > AttachmentService.MaxSize) throw new DomainException("Dosya en fazla 10 MB olabilir.");
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var (type, ext) = AttachmentService.Sniff(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)))
            ?? throw new DomainException("Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir.");
        var old = entity.FilePath;
        var path = $"purchase-invoices/{id}/{Guid.NewGuid():N}{ext}";
        buffer.Position = 0;
        await storage.SaveAsync(path, buffer, ct);
        entity.FilePath = path;
        entity.FileContentType = type;
        await db.SaveChangesAsync(ct);
        if (old != null) await storage.DeleteAsync(old, ct);
    }

    public async Task<(Stream Content, string ContentType)> OpenFileAsync(int id, CancellationToken ct = default)
    {
        var p = await db.PurchaseInvoices.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.FilePath, x.FileContentType })
            .FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Fatura bulunamadı.");
        if (p.FilePath == null) throw new NotFoundException("Bu faturanın dosyası yok.");
        var stream = await storage.OpenAsync(p.FilePath, ct) ?? throw new NotFoundException("Dosya depolamada bulunamadı.");
        return (stream, p.FileContentType ?? "application/octet-stream");
    }

    private async Task ApplyAsync(PurchaseInvoice p, PurchaseInvoiceSaveRequest r, CancellationToken ct)
    {
        if (!await db.Suppliers.AnyAsync(s => s.Id == r.SupplierId, ct)) throw new DomainException("Tedarikçi bulunamadı.");
        var no = r.InvoiceNo.Trim().ToUpper(Formatters.Tr);
        if (await db.PurchaseInvoices.AnyAsync(x => x.Id != p.Id && x.SupplierId == r.SupplierId && x.InvoiceNo == no, ct))
            throw new DomainException($"Bu tedarikçinin {no} numaralı faturası zaten kayıtlı.");
        p.SupplierId = r.SupplierId;
        p.InvoiceNo = no;
        p.Date = r.Date;
        p.DueDate = r.DueDate;
        p.Kind = r.Kind;
        p.Subtotal = Money.Round(r.Subtotal);
        p.VatAmount = Money.Round(r.VatAmount);
        p.WithholdingAmount = Money.Round(r.WithholdingAmount);
        p.Total = p.Subtotal + p.VatAmount - p.WithholdingAmount;
        p.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        p.ExternalRef ??= string.IsNullOrWhiteSpace(r.ExternalRef) ? null : r.ExternalRef.Trim();
    }

    /// <summary>Faturanın sefer bağlantısını verilen listeyle eşitler ve seferlerdeki taşeron fatura no/tarihini günceller.</summary>
    private async Task LinkTripsAsync(PurchaseInvoice p, IReadOnlyCollection<int> tripIds, CancellationToken ct)
    {
        var wanted = tripIds.Distinct().ToList();
        var linked = await db.Trips.Where(t => t.PurchaseInvoiceId == p.Id).ToListAsync(ct);
        foreach (var t in linked.Where(t => !wanted.Contains(t.Id)))
        {
            t.PurchaseInvoiceId = null;
            if (t.CarrierInvoiceNo == p.InvoiceNo) { t.CarrierInvoiceNo = null; t.CarrierInvoiceDate = null; }
        }
        if (wanted.Count > 0)
        {
            var trips = await db.Trips.Where(t => wanted.Contains(t.Id)).ToListAsync(ct);
            if (trips.Count != wanted.Count) throw new DomainException("Seçilen seferlerden biri bulunamadı.");
            if (trips.Any(t => t.CarrierSupplierId != p.SupplierId)) throw new DomainException("Seçilen seferler bu tedarikçiye ait olmalı.");
            if (trips.Any(t => t.PurchaseInvoiceId != null && t.PurchaseInvoiceId != p.Id))
                throw new DomainException("Seçilen seferlerden biri başka bir faturaya bağlı.");
            foreach (var t in trips)
            {
                t.PurchaseInvoiceId = p.Id;
                t.CarrierInvoiceNo = p.InvoiceNo;
                t.CarrierInvoiceDate = p.Date;
            }
        }
        await db.SaveChangesAsync(ct);
    }
}
