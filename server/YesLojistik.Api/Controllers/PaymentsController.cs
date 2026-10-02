using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(AppDbContext db) : ControllerBase
{
    private static readonly Dictionary<string, Expression<Func<Payment, object?>>> SortMap = new()
    {
        ["date"] = p => p.Date,
        ["amount"] = p => p.Amount,
        ["customer"] = p => p.Customer.Title,
        ["method"] = p => p.Method,
        ["instrumentDueDate"] = p => p.InstrumentDueDate,
    };

    private static readonly Expression<Func<Payment, PaymentDto>> Projection = p => new PaymentDto(p.Id, p.CustomerId,
        p.Customer.Title, p.InvoiceId, p.Invoice != null ? p.Invoice.InvoiceNo : null, p.Date, p.Amount, p.Method, p.Description,
        p.CashAccountId, p.CashAccount != null ? p.CashAccount.Name : null, p.InstrumentNo, p.Bank, p.InstrumentDueDate, p.InstrumentStatus,
        p.EndorsedSupplierPaymentId, null, p.Amount < 0);

    private IQueryable<Payment> Filter(PaymentQuery q)
    {
        var query = db.Payments.AsNoTracking().WhereIds(q.Ids);
        if (q.CustomerId is { } c) query = query.Where(p => p.CustomerId == c);
        if (q.From is { } from) query = query.Where(p => p.Date >= from);
        if (q.To is { } to) query = query.Where(p => p.Date <= to);
        if (q.Instruments == true) query = query.Where(p => p.InstrumentStatus != null);
        if (q.InstrumentStatus is { } st) query = query.Where(p => p.InstrumentStatus == st);
        if (q.DueTo is { } due) query = query.Where(p => p.InstrumentDueDate <= due);
        if (q.CashAccountId is { } acc) query = query.Where(p => p.CashAccountId == acc);
        if (QueryExtensions.LikePattern(q.Search) is { } like)
            query = query.Where(p => EF.Functions.ILike(p.Customer.Title, like) || EF.Functions.ILike(p.Description ?? "", like)
                || (p.Invoice != null && EF.Functions.ILike(p.Invoice.InvoiceNo, like)));
        return query.ApplySort(q.Sort, q.Desc, SortMap, "date");
    }

    [HttpGet]
    public async Task<PagedResult<PaymentDto>> List([FromQuery] PaymentQuery q, CancellationToken ct)
    {
        var (items, total, page, size) = await Filter(q).Select(Projection).PageAsync(q, ct);
        return new PagedResult<PaymentDto>(await WithEndorsementsAsync(items, ct), total, page, size);
    }

    /// <summary>Ciro edilen çek/senetlerde kime ciro edildiği.</summary>
    private async Task<List<PaymentDto>> WithEndorsementsAsync(List<PaymentDto> items, CancellationToken ct)
    {
        var ids = items.Where(p => p.EndorsedSupplierPaymentId != null).Select(p => p.EndorsedSupplierPaymentId!.Value).ToList();
        if (ids.Count == 0) return items;
        var titles = await db.SupplierPayments.AsNoTracking().Where(s => ids.Contains(s.Id)).Select(s => new { s.Id, s.Supplier.Title }).ToDictionaryAsync(s => s.Id, s => s.Title, ct);
        return items.Select(p => p.EndorsedSupplierPaymentId is { } sid ? p with { EndorsedTo = titles.GetValueOrDefault(sid) } : p).ToList();
    }

    /// <summary>Filtrenin tamamının toplamı (yalnızca sayfanın değil). Müşteriye iadeler eksi tutarla düşülür.</summary>
    [HttpGet("totals")]
    public async Task<PaymentTotalsDto> Totals([FromQuery] PaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(p => p.Amount).ToListAsync(ct);
        return new PaymentTotalsDto(rows.Count, rows.Sum(), -rows.Where(a => a < 0).Sum());
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] PaymentQuery q, CancellationToken ct)
    {
        var rows = await Filter(q).Select(Projection).Take(QueryExtensions.ExportLimit).ToListAsync(ct);
        var t = await Totals(q, ct);
        var total = new PaymentDto(0, 0, "Toplam", null, null, default, t.Total, default, null);
        return FileResults.Excel(ExcelExporter.ExportWithTotal("Tahsilatlar", rows, total,
            new ExcelColumn<PaymentDto>("Tarih", p => p.Id == 0 ? null : p.Date, ExcelExporter.DateFormat),
            new("Müşteri", p => p.CustomerTitle),
            new("Fatura", p => p.InvoiceNo),
            new("Yöntem", p => p.Id == 0 ? null : CustomerAccountService.MethodLabel(p.Method)),
            new("Hesap", p => p.CashAccountName),
            new("Çek/Senet No", p => p.InstrumentNo),
            new("Banka", p => p.Bank),
            new("Vade", p => p.InstrumentDueDate, ExcelExporter.DateFormat),
            new("Durum", p => p.InstrumentStatus is { } s ? CustomerAccountService.InstrumentStatusLabel(s) : null),
            new("Tutar", p => p.Amount, ExcelExporter.MoneyFormat),
            new("Açıklama", p => p.Description)), q.Instruments == true ? "cek-senet" : "tahsilatlar");
    }

    [HttpGet("{id:int}")]
    public async Task<PaymentDto> Get(int id, CancellationToken ct) =>
        (await WithEndorsementsAsync([await db.Payments.AsNoTracking().Where(p => p.Id == id).Select(Projection).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Tahsilat bulunamadı.")], ct))[0];

    /// <summary>
    /// Çek/senet durumu. Ciro: seçilen tedarikçiye aynı tutarda ödeme oluşur (borcu düşer). Karşılıksız/iade: tahsilat müşterinin
    /// bakiyesinden düşmez; ciro edilmişse tedarikçi ödemesi de geri alınır (çek tedarikçiden geri gelir, borç yeniden açılır).
    /// </summary>
    [Authorize(Policy = Policies.Accounting)]
    [HttpPost("{id:int}/instrument")]
    public async Task<PaymentDto> SetInstrumentStatus(int id, InstrumentStatusRequest req, CancellationToken ct)
    {
        var p = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tahsilat bulunamadı.");
        if (p.InstrumentStatus == null) throw new DomainException("Bu tahsilat çek ya da senet değil.");
        if (req.CashAccountId is { } acc && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct)) throw new DomainException("Hesap bulunamadı.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        if (p.InstrumentStatus == InstrumentStatus.Endorsed && req.Status != InstrumentStatus.Endorsed && p.EndorsedSupplierPaymentId is { } sp)
        {
            if (await db.SupplierPayments.FirstOrDefaultAsync(x => x.Id == sp, ct) is { } supplierPayment) supplierPayment.IsDeleted = true;
            p.EndorsedSupplierPaymentId = null;
        }
        if (req.Status == InstrumentStatus.Endorsed && p.InstrumentStatus != InstrumentStatus.Endorsed)
        {
            if (req.SupplierId is not { } supplierId || !await db.Suppliers.AnyAsync(s => s.Id == supplierId, ct))
                throw new DomainException("Ciro için tedarikçiyi seçin.");
            var endorsed = new SupplierPayment
            {
                SupplierId = supplierId, Date = req.Date ?? Clock.Today, Amount = p.Amount, Method = p.Method, EndorsedFromPaymentId = p.Id,
                Description = $"Ciro: {CustomerAccountService.MethodLabel(p.Method)} {p.InstrumentNo}{(p.Bank != null ? $" ({p.Bank})" : "")} vade {Formatters.Date(p.InstrumentDueDate ?? p.Date)}".Trim(),
            };
            db.SupplierPayments.Add(endorsed);
            await db.SaveChangesAsync(ct);
            p.EndorsedSupplierPaymentId = endorsed.Id;
        }
        if (req.Status is InstrumentStatus.InCollection or InstrumentStatus.Collected && req.CashAccountId != null) p.CashAccountId = req.CashAccountId;
        p.InstrumentStatus = req.Status;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<PaymentDto> Create(PaymentSaveRequest req, CancellationToken ct)
    {
        var p = new Payment();
        await ApplyAsync(p, req, ct);
        db.Payments.Add(p);
        await db.SaveChangesAsync(ct);
        return await Get(p.Id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<PaymentDto> Update(int id, PaymentSaveRequest req, CancellationToken ct)
    {
        var p = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tahsilat bulunamadı.");
        await ApplyAsync(p, req, ct);
        await db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Tahsilat bulunamadı.");
        if (p.InstrumentStatus == InstrumentStatus.Endorsed) throw new DomainException("Ciro edilmiş çek/senet silinemez; önce ciroyu geri alın.");
        p.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ApplyAsync(Payment p, PaymentSaveRequest r, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == r.CustomerId, ct)) throw new DomainException("Müşteri bulunamadı.");
        if (r.InvoiceId is { } invId)
        {
            var inv = await db.Invoices.Where(i => i.Id == invId).Select(i => new { i.CustomerId, i.Status }).FirstOrDefaultAsync(ct)
                ?? throw new DomainException("Fatura bulunamadı.");
            if (inv.CustomerId != r.CustomerId) throw new DomainException("Seçilen fatura bu müşteriye ait değil.");
            if (inv.Status != InvoiceStatus.Issued) throw new DomainException("Tahsilat yalnızca kesilmiş faturalara bağlanabilir.");
        }
        p.CustomerId = r.CustomerId;
        p.InvoiceId = r.InvoiceId;
        p.Date = r.Date;
        // Müşteriye iade (eski paneldeki "Müşteriye Yapılan EFT") eksi tutarla saklanır: bakiyede tahsilatı azaltır, kasadan çıkar.
        if (r.IsRefund && (r.InvoiceId != null || r.Method is PaymentMethod.Check or PaymentMethod.PromissoryNote))
            throw new DomainException("İade faturaya bağlanamaz ve çek/senetle yapılamaz.");
        p.Amount = r.IsRefund ? -Money.Round(r.Amount) : Money.Round(r.Amount);
        if (r.CashAccountId is { } acc && !await db.CashAccounts.AnyAsync(a => a.Id == acc, ct)) throw new DomainException("Hesap bulunamadı.");
        var isInstrument = r.Method is PaymentMethod.Check or PaymentMethod.PromissoryNote;
        if (p.InstrumentStatus == InstrumentStatus.Endorsed && (!isInstrument || Money.Round(r.Amount) != Math.Abs(p.Amount)))
            throw new DomainException("Ciro edilmiş çek/senedin tutarı ya da yöntemi değiştirilemez; önce ciroyu geri alın.");
        p.Method = r.Method;
        p.Description = CustomersController.NullIfEmpty(r.Description);
        p.CashAccountId = r.CashAccountId;
        p.InstrumentNo = isInstrument ? CustomersController.NullIfEmpty(r.InstrumentNo) : null;
        p.Bank = isInstrument ? CustomersController.NullIfEmpty(r.Bank) : null;
        p.InstrumentDueDate = isInstrument ? r.InstrumentDueDate : null;
        p.InstrumentStatus = isInstrument ? p.InstrumentStatus ?? InstrumentStatus.Portfolio : null;
    }
}
