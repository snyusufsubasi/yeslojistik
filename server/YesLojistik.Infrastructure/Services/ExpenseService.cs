using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Gider kaydı: panel ve şoför uygulaması aynı kuralları kullanır.</summary>
public class ExpenseService(AppDbContext db, IFileStorage storage, ICurrentUser currentUser, DriverNotifier driverNotifier)
{
    public async Task<int> CreateAsync(ExpenseSaveRequest req, CancellationToken ct = default, Action<Expense>? extra = null)
    {
        var e = new Expense();
        await ApplyAsync(e, req, ct);
        extra?.Invoke(e);
        db.Expenses.Add(e);
        await db.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateAsync(int id, ExpenseSaveRequest req, CancellationToken ct = default)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        await ApplyAsync(e, req, ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Onay bekleyen (şoförün girdiği) masrafı onaylar ya da gerekçeyle reddeder. Reddedilince şoföre bildirim gider.</summary>
    public async Task ReviewAsync(int id, bool approve, string? reason, CancellationToken ct = default)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (!approve && reason == null) throw new DomainException("Reddetme gerekçesini yazın; şoföre iletilecek.");
        if (reason is { Length: > 300 }) throw new DomainException("Gerekçe en fazla 300 karakter olabilir.");
        var target = approve ? ApprovalStatus.Approved : ApprovalStatus.Rejected;
        if (e.ApprovalStatus == target && e.ReviewedAt != null) return;
        e.ApprovalStatus = target;
        e.RejectionReason = approve ? null : reason;
        e.ReviewedAt = DateTime.UtcNow;
        e.ReviewedBy = currentUser.Name;
        await db.SaveChangesAsync(ct);
        if (!approve && e.DriverId is { } driverId)
            await driverNotifier.NotifyAsync(driverId, e.TripId, "Masrafınız reddedildi",
                $"{Formatters.Currency(e.Amount)} tutarındaki masraf reddedildi: {reason}", ct);
    }

    public async Task SaveReceiptAsync(int id, Stream content, long length, CancellationToken ct = default)
    {
        var e = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Gider bulunamadı.");
        if (length <= 0) throw new DomainException("Dosya boş.");
        if (length > AttachmentService.MaxSize) throw new DomainException("Dosya en fazla 10 MB olabilir.");
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var (type, ext) = AttachmentService.Sniff(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)))
            ?? throw new DomainException("Yalnızca JPEG, PNG, WEBP resim veya PDF yüklenebilir.");
        var old = e.ReceiptPath;
        var path = $"receipts/{id}/{Guid.NewGuid():N}{ext}";
        buffer.Position = 0;
        await storage.SaveAsync(path, buffer, ct);
        e.ReceiptPath = path;
        e.ReceiptContentType = type;
        await db.SaveChangesAsync(ct);
        if (old != null) await storage.DeleteAsync(old, ct);
    }

    public async Task<(Stream Content, string ContentType)> OpenReceiptAsync(int id, CancellationToken ct = default)
    {
        var e = await db.Expenses.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.ReceiptPath, x.ReceiptContentType })
            .FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Gider bulunamadı.");
        if (e.ReceiptPath == null) throw new NotFoundException("Bu giderin fişi yok.");
        var stream = await storage.OpenAsync(e.ReceiptPath, ct) ?? throw new NotFoundException("Fiş depolamada bulunamadı.");
        return (stream, e.ReceiptContentType ?? "application/octet-stream");
    }

    private async Task ApplyAsync(Expense e, ExpenseSaveRequest r, CancellationToken ct)
    {
        var vehicleId = r.VehicleId;
        var driverId = r.DriverId;
        if (r.TripId is { } tripId)
        {
            var trip = await db.Trips.Where(t => t.Id == tripId).Select(t => new { t.VehicleId, t.DriverId }).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Sefer bulunamadı.");
            vehicleId ??= trip.VehicleId;
            // Harcırah/avans sefere bağlıysa şoför seferden alınır.
            if (r.Category is ExpenseCategory.DriverAllowance or ExpenseCategory.DriverAdvance) driverId ??= trip.DriverId;
        }
        if (vehicleId is { } v && !await db.Vehicles.AnyAsync(x => x.Id == v, ct)) throw new DomainException("Araç bulunamadı.");
        if (driverId is { } d && !await db.Drivers.AnyAsync(x => x.Id == d, ct)) throw new DomainException("Şoför bulunamadı.");
        if (r.SupplierId is { } sup && !await db.Suppliers.AnyAsync(x => x.Id == sup, ct)) throw new DomainException("Tedarikçi bulunamadı.");
        if (r.IsOnCredit && r.SupplierId is null) throw new DomainException("Vadeli gider için tedarikçi seçin (borç ona yazılır).");
        if (r.Category == ExpenseCategory.DriverAdvance && driverId is null)
            throw new DomainException("Avans için şoför seçin.");
        var isFuel = r.Category == ExpenseCategory.Fuel;
        if (isFuel && r.Odometer is { } odo && vehicleId is { } fuelVehicle)
        {
            // Girilen kilometre araç kartındakinden büyükse araç kilometresi güncellenir.
            var vehicle = await db.Vehicles.FirstAsync(x => x.Id == fuelVehicle, ct);
            if (odo > vehicle.Km) vehicle.Km = odo;
        }
        if (r.CashAccountId is { } acc && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct)) throw new DomainException("Hesap bulunamadı.");
        e.CashAccountId = r.IsOnCredit ? null : r.CashAccountId;
        e.DriverId = driverId;
        e.SupplierId = r.SupplierId;
        e.IsOnCredit = r.IsOnCredit && r.SupplierId != null;
        e.Liters = isFuel && r.Liters is { } l ? Math.Round(l, 2) : null;
        e.Odometer = isFuel ? r.Odometer : null;
        e.Category = r.Category;
        e.Amount = Money.Round(r.Amount);
        // Kategorinin varsayılan oranı saklanmaz (boş = varsayılan); yalnız farklı seçilen oran kaydedilir.
        e.VatRate = r.VatRate is { } vat && vat != ExpenseVat.DefaultFor(r.Category) ? vat : null;
        e.Date = r.Date;
        e.VehicleId = vehicleId;
        e.TripId = r.TripId;
        e.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        if (r.Details is { } det)
        {
            static string? N(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
            e.CategoryName = N(det.CategoryName);
            e.Title = N(det.Title);
            e.PeriodStart = det.PeriodStart;
            e.PeriodEnd = det.PeriodStart == null ? null : det.PeriodEnd;
            e.FuelStation = isFuel ? N(det.FuelStation) : null;
            e.FuelType = isFuel ? N(det.FuelType) : null;
            e.UnitPrice = isFuel ? det.UnitPrice : null;
            e.PreviousOdometer = isFuel ? det.PreviousOdometer : null;
            e.ExternalRef ??= N(det.ExternalRef);
        }
    }
}
