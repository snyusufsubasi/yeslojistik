using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

public class JobRequestService(AppDbContext db)
{
    private static IQueryable<JobRequestDto> Project(IQueryable<JobRequest> query) => query.Select(r =>
        new JobRequestDto(r.Id, r.CustomerId, r.Customer.Title, r.Date, r.LoadingAddress,
            r.DeliveryAddress, r.DeliveryWindow, r.CargoType, r.CargoQuantity, r.VehicleType,
            r.SalePrice, r.CarrierPrice, r.Commission, r.DriverBonus, r.OtherExpense,
            r.CustomerPays, r.LoadingDocumentNo, r.WaybillNo, r.InvoiceFooterNote,
            r.Description, r.LoadingLatitude, r.LoadingLongitude, r.DeliveryLatitude,
            r.DeliveryLongitude, r.Status, r.Trip != null ? r.Trip.Id : null));

    public async Task<PagedResult<JobRequestDto>> ListAsync(JobRequestQuery q, CancellationToken ct)
    {
        var query = db.JobRequests.AsNoTracking().AsQueryable();
        if (q.Status is { } status) query = query.Where(r => r.Status == status);
        if (q.From is { } from) query = query.Where(r => r.Date >= from);
        if (q.To is { } to) query = query.Where(r => r.Date <= to);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(r => EF.Functions.ILike(r.Customer.Title, like)
                || EF.Functions.ILike(r.LoadingAddress, like)
                || EF.Functions.ILike(r.DeliveryAddress, like)
                || EF.Functions.ILike(r.CargoType ?? "", like));
        var (items, total, page, size) = await Project(query.OrderByDescending(r => r.Date).ThenByDescending(r => r.Id)).PageAsync(q, ct);
        return new PagedResult<JobRequestDto>(items, total, page, size);
    }

    public async Task<JobRequestDto> GetAsync(int id, CancellationToken ct) =>
        await Project(db.JobRequests.AsNoTracking().Where(r => r.Id == id)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("İş talebi bulunamadı.");

    public async Task<JobRequestDto> CreateAsync(JobRequestSaveRequest req, CancellationToken ct)
    {
        await EnsureCustomerAsync(req.CustomerId, ct);
        var entity = new JobRequest();
        Apply(entity, req);
        db.JobRequests.Add(entity);
        await db.SaveChangesAsync(ct);
        return await GetAsync(entity.Id, ct);
    }

    public async Task<JobRequestDto> UpdateAsync(int id, JobRequestSaveRequest req, CancellationToken ct)
    {
        var entity = await FindAsync(id, ct);
        if (entity.Status != JobRequestStatus.Pending)
            throw new DomainException("Yalnızca bekleyen iş talebi düzenlenebilir.");
        await EnsureCustomerAsync(req.CustomerId, ct);
        Apply(entity, req);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<JobRequestDto> CancelAsync(int id, CancellationToken ct)
    {
        var entity = await FindAsync(id, ct);
        if (entity.Status != JobRequestStatus.Pending)
            throw new DomainException("Yalnızca bekleyen iş talebi iptal edilebilir.");
        entity.Status = JobRequestStatus.Cancelled;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var entity = await FindAsync(id, ct);
        if (entity.Status == JobRequestStatus.Converted)
            throw new DomainException("Sevk edilmiş iş talebi silinemez. Önce bağlı seferi değerlendirin.");
        entity.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private async Task<JobRequest> FindAsync(int id, CancellationToken ct) =>
        await db.JobRequests.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("İş talebi bulunamadı.");

    private async Task EnsureCustomerAsync(int id, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == id && c.IsActive, ct))
            throw new DomainException("Aktif müşteri bulunamadı.");
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Apply(JobRequest entity, JobRequestSaveRequest req)
    {
        entity.CustomerId = req.CustomerId;
        entity.Date = req.Date;
        entity.LoadingAddress = req.LoadingAddress.Trim();
        entity.DeliveryAddress = req.DeliveryAddress.Trim();
        entity.DeliveryWindow = Clean(req.DeliveryWindow);
        entity.CargoType = Clean(req.CargoType);
        entity.CargoQuantity = req.CargoQuantity;
        entity.VehicleType = Clean(req.VehicleType);
        entity.SalePrice = req.SalePrice is { } sale ? Money.Round(sale) : null;
        entity.CarrierPrice = req.CarrierPrice is { } carrier ? Money.Round(carrier) : null;
        entity.Commission = req.Commission is { } commission ? Money.Round(commission) : null;
        entity.DriverBonus = req.DriverBonus is { } bonus ? Money.Round(bonus) : null;
        entity.OtherExpense = req.OtherExpense is { } expense ? Money.Round(expense) : null;
        entity.CustomerPays = req.CustomerPays;
        entity.LoadingDocumentNo = Clean(req.LoadingDocumentNo);
        entity.WaybillNo = Clean(req.WaybillNo);
        entity.InvoiceFooterNote = Clean(req.InvoiceFooterNote);
        entity.Description = Clean(req.Description);
        entity.LoadingLatitude = req.LoadingLatitude;
        entity.LoadingLongitude = req.LoadingLongitude;
        entity.DeliveryLatitude = req.DeliveryLatitude;
        entity.DeliveryLongitude = req.DeliveryLongitude;
    }
}
