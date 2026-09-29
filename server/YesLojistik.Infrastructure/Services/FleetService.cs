using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Filo belgeleri (ruhsat, kasko, K belgesi…) ve araç bakım kayıtları.</summary>
public class FleetService(AppDbContext db, IFileStorage storage)
{
    // ---------- Belgeler ----------

    public async Task<List<DocumentDto>> DocumentsAsync(DocumentOwnerType? ownerType, int? ownerId, CancellationToken ct = default)
    {
        var q = db.Documents.AsNoTracking();
        if (ownerType is { } t) q = q.Where(d => d.OwnerType == t);
        if (ownerId is { } id) q = q.Where(d => d.OwnerId == id);
        var docs = await q.OrderBy(d => d.ExpiryDate == null).ThenBy(d => d.ExpiryDate).ToListAsync(ct);
        return await ToDtosAsync(docs, ct);
    }

    public async Task<DocumentDto> DocumentAsync(int id, CancellationToken ct = default)
    {
        var d = await db.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Belge bulunamadı.");
        return (await ToDtosAsync([d], ct))[0];
    }

    private async Task<List<DocumentDto>> ToDtosAsync(List<FleetDocument> docs, CancellationToken ct)
    {
        var vehicleIds = docs.Where(d => d.OwnerType == DocumentOwnerType.Vehicle && d.OwnerId != null).Select(d => d.OwnerId!.Value).Distinct().ToList();
        var driverIds = docs.Where(d => d.OwnerType == DocumentOwnerType.Driver && d.OwnerId != null).Select(d => d.OwnerId!.Value).Distinct().ToList();
        var plates = await db.Vehicles.IgnoreQueryFilters().Where(v => vehicleIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Plate, ct);
        var names = await db.Drivers.IgnoreQueryFilters().Where(d => driverIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var today = Clock.Today;
        return docs.Select(d => new DocumentDto(d.Id, d.OwnerType, d.OwnerId, d.OwnerType switch
        {
            DocumentOwnerType.Vehicle => d.OwnerId is { } v ? plates.GetValueOrDefault(v) : null,
            DocumentOwnerType.Driver => d.OwnerId is { } dr ? names.GetValueOrDefault(dr) : null,
            _ => "Firma",
        }, d.Type, d.No, d.IssueDate, d.ExpiryDate, d.FilePath != null, d.Note,
            d.ExpiryDate is { } e ? e.DayNumber - today.DayNumber : null)).ToList();
    }

    public async Task<int> SaveDocumentAsync(int? id, DocumentSaveRequest r, CancellationToken ct = default)
    {
        var d = id is { } existing
            ? await db.Documents.FirstOrDefaultAsync(x => x.Id == existing, ct) ?? throw new NotFoundException("Belge bulunamadı.")
            : new FleetDocument();
        switch (r.OwnerType)
        {
            case DocumentOwnerType.Vehicle when r.OwnerId is not { } v || !await db.Vehicles.AnyAsync(x => x.Id == v, ct):
                throw new DomainException("Araç bulunamadı.");
            case DocumentOwnerType.Driver when r.OwnerId is not { } dr || !await db.Drivers.AnyAsync(x => x.Id == dr, ct):
                throw new DomainException("Şoför bulunamadı.");
        }
        d.OwnerType = r.OwnerType;
        d.OwnerId = r.OwnerType == DocumentOwnerType.Company ? null : r.OwnerId;
        d.Type = r.Type;
        d.No = Trim(r.No);
        d.IssueDate = r.IssueDate;
        d.ExpiryDate = r.ExpiryDate;
        d.Note = Trim(r.Note);
        if (id == null) db.Documents.Add(d);
        await db.SaveChangesAsync(ct);
        return d.Id;
    }

    public async Task DeleteDocumentAsync(int id, CancellationToken ct = default)
    {
        var d = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Belge bulunamadı.");
        d.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task SaveDocumentFileAsync(int id, Stream content, long length, CancellationToken ct = default)
    {
        var d = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Belge bulunamadı.");
        if (length <= 0) throw new DomainException("Dosya boş.");
        if (length > AttachmentService.MaxSize) throw new DomainException("Dosya en fazla 10 MB olabilir.");
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var (type, ext) = AttachmentService.Sniff(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)))
            ?? throw new DomainException("Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir.");
        var old = d.FilePath;
        var path = $"documents/{id}/{Guid.NewGuid():N}{ext}";
        buffer.Position = 0;
        await storage.SaveAsync(path, buffer, ct);
        d.FilePath = path;
        d.FileContentType = type;
        await db.SaveChangesAsync(ct);
        if (old != null) await storage.DeleteAsync(old, ct);
    }

    public async Task<(Stream Content, string ContentType)> OpenDocumentFileAsync(int id, CancellationToken ct = default)
    {
        var d = await db.Documents.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.FilePath, x.FileContentType })
            .FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Belge bulunamadı.");
        if (d.FilePath == null) throw new NotFoundException("Bu belgenin dosyası yok.");
        var stream = await storage.OpenAsync(d.FilePath, ct) ?? throw new NotFoundException("Dosya depolamada bulunamadı.");
        return (stream, d.FileContentType ?? "application/octet-stream");
    }

    // ---------- Bakım ----------

    public IQueryable<MaintenanceDto> MaintenanceQuery(System.Linq.Expressions.Expression<Func<MaintenanceRecord, bool>> filter) =>
        db.MaintenanceRecords.AsNoTracking().Where(filter).OrderByDescending(m => m.Date).ThenByDescending(m => m.Id)
        .Select(m => new MaintenanceDto(m.Id, m.VehicleId, m.Vehicle.Plate, m.Date, m.Km, m.Type, m.Description, m.Cost,
            m.SupplierId, m.Supplier != null ? m.Supplier.Title : null, m.NextDueKm, m.NextDueDate, m.ExpenseId));

    /// <summary>
    /// Bakım kaydı: tutar "Bakım" kategorisinde gider olarak da yazılır (bağlı gider güncellenir, çift sayılmaz);
    /// araç kilometresi, son/sonraki bakım tarihi ve sonraki bakım kilometresi güncellenir.
    /// </summary>
    public async Task<int> SaveMaintenanceAsync(int vehicleId, int? id, MaintenanceSaveRequest r, CancellationToken ct = default)
    {
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct) ?? throw new NotFoundException("Araç bulunamadı.");
        if (r.SupplierId is { } sup && !await db.Suppliers.AnyAsync(x => x.Id == sup, ct)) throw new DomainException("Tedarikçi bulunamadı.");
        if (r.IsOnCredit && r.SupplierId is null) throw new DomainException("Vadeli bakım için servisi (tedarikçi) seçin.");
        if (r.NextDueKm is { } nk && r.Km is { } k && nk <= k) throw new DomainException("Sonraki bakım kilometresi, bakım kilometresinden büyük olmalı.");
        var m = id is { } existing
            ? await db.MaintenanceRecords.FirstOrDefaultAsync(x => x.Id == existing && x.VehicleId == vehicleId, ct) ?? throw new NotFoundException("Bakım kaydı bulunamadı.")
            : new MaintenanceRecord { VehicleId = vehicleId };
        m.Date = r.Date;
        m.Km = r.Km;
        m.Type = r.Type;
        m.Description = Trim(r.Description);
        m.Cost = Money.Round(r.Cost);
        m.SupplierId = r.SupplierId;
        m.NextDueKm = r.NextDueKm;
        m.NextDueDate = r.NextDueDate;

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var expense = m.ExpenseId is { } eid ? await db.Expenses.FirstOrDefaultAsync(e => e.Id == eid, ct) : null;
        if (m.Cost > 0)
        {
            if (expense == null)
            {
                expense = new Expense { Category = ExpenseCategory.Maintenance };
                db.Expenses.Add(expense);
            }
            expense.Amount = m.Cost;
            expense.Date = m.Date;
            expense.VehicleId = vehicleId;
            expense.SupplierId = m.SupplierId;
            expense.IsOnCredit = r.IsOnCredit && m.SupplierId != null;
            expense.Description = $"{TypeLabel(m.Type)} bakım" + (m.Description != null ? $" · {m.Description}" : "");
        }
        else if (expense != null)
        {
            expense.IsDeleted = true;
            m.ExpenseId = null;
            expense = null;
        }
        if (id == null) db.MaintenanceRecords.Add(m);
        await db.SaveChangesAsync(ct);
        if (expense != null && m.ExpenseId != expense.Id)
        {
            m.ExpenseId = expense.Id;
            await db.SaveChangesAsync(ct);
        }

        // Araç kartı en son bakıma göre güncellenir.
        var latest = await db.MaintenanceRecords.Where(x => x.VehicleId == vehicleId).OrderByDescending(x => x.Date).ThenByDescending(x => x.Id).FirstAsync(ct);
        if (m.Km is { } km && km > vehicle.Km) vehicle.Km = km;
        vehicle.LastMaintenanceDate = latest.Date;
        if (latest.NextDueDate != null) vehicle.NextMaintenanceDate = latest.NextDueDate;
        if (latest.NextDueKm != null) vehicle.NextMaintenanceKm = latest.NextDueKm;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return m.Id;
    }

    public async Task DeleteMaintenanceAsync(int vehicleId, int id, CancellationToken ct = default)
    {
        var m = await db.MaintenanceRecords.FirstOrDefaultAsync(x => x.Id == id && x.VehicleId == vehicleId, ct) ?? throw new NotFoundException("Bakım kaydı bulunamadı.");
        m.IsDeleted = true;
        if (m.ExpenseId is { } eid && await db.Expenses.FirstOrDefaultAsync(e => e.Id == eid, ct) is { } e) e.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public static string TypeLabel(MaintenanceType t) => t switch
    {
        MaintenanceType.Periodic => "Periyodik",
        MaintenanceType.Oil => "Yağ",
        MaintenanceType.Tire => "Lastik",
        MaintenanceType.Brake => "Fren",
        MaintenanceType.Breakdown => "Arıza",
        _ => "Diğer",
    };

    public static string DocumentTypeLabel(DocumentType t) => t switch
    {
        DocumentType.Registration => "Ruhsat",
        DocumentType.TrafficInsurance => "Trafik Sigortası",
        DocumentType.Casco => "Kasko",
        DocumentType.Inspection => "Muayene",
        DocumentType.KCertificate => "K Belgesi",
        DocumentType.TachographCalibration => "Takograf Kalibrasyonu",
        DocumentType.Emission => "Egzoz Emisyon",
        DocumentType.License => "Ehliyet",
        DocumentType.Src => "SRC",
        DocumentType.Psychotechnic => "Psikoteknik",
        DocumentType.HealthReport => "Sağlık Raporu",
        _ => "Diğer",
    };

    private static string? Trim(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
