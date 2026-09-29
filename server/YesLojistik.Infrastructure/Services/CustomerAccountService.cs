using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Cari hesap: Borç = kesilmiş faturalar, Alacak = tahsilatlar, Bakiye = Borç − Alacak.</summary>
public class CustomerAccountService(AppDbContext db, BalanceService balances)
{
    public static IQueryable<CustomerDto> Project(IQueryable<Customer> query) => query.Select(c => new CustomerDto(
        c.Id, "", c.Title, c.TaxNumber, c.TaxOffice, c.Phone, c.Email, c.Address, c.Notes,
        c.OpeningBalance + (c.Invoices.Where(i => i.Status == InvoiceStatus.Issued).Sum(i => (decimal?)i.Total) ?? 0)
        - (c.Payments.Where(p => (p.InstrumentStatus == null || (p.InstrumentStatus != InstrumentStatus.Bounced && p.InstrumentStatus != InstrumentStatus.Returned))).Sum(p => (decimal?)p.Amount) ?? 0), c.OpeningBalance, c.OpeningBalanceDate, c.NotifyStatusByEmail,
        c.City, c.District, c.ContactName, c.IsEInvoiceUser, c.EInvoiceAlias, c.PaymentTermDays, c.IsActive, c.CreditLimit,
        new CustomerExtras(c.Country, c.Neighborhood, c.Street, c.BuildingName, c.BuildingNo, c.DoorNo, c.PostalCode, c.Fax, c.Website),
        new InvoiceTemplateDto(c.InvoiceTemplate.LineDate, c.InvoiceTemplate.LineLoading, c.InvoiceTemplate.LineDelivery, c.InvoiceTemplate.LinePlate,
            c.InvoiceTemplate.LineVehicleType, c.InvoiceTemplate.LineDeliveryDocumentNo, c.InvoiceTemplate.LineCargo, c.InvoiceTemplate.LineDescription,
            c.InvoiceTemplate.TripFooterNotes, c.InvoiceTemplate.Note, c.InvoiceTemplate.SaleNoteId, c.InvoiceTemplate.WithholdingNoteId, c.InvoiceTemplate.Scenario),
        c.Groups.OrderBy(g => g.Name).Select(g => g.Name).ToList()));

    public static CustomerDto WithNo(CustomerDto c) => c with { CustomerNo = c.Id.ToString("D5") };

    public async Task<CustomerSummaryDto> SummaryAsync(int id, CancellationToken ct = default)
    {
        var customer = await Project(db.Customers.AsNoTracking().Where(c => c.Id == id)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Müşteri bulunamadı.");
        var debit = customer.OpeningBalance
            + (await db.Invoices.Where(i => i.CustomerId == id && i.Status == InvoiceStatus.Issued).SumAsync(i => (decimal?)i.Total, ct) ?? 0);
        var credit = await db.Payments.Where(p => p.CustomerId == id).Where(Payment.Counts).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var bal = await balances.InvoiceBalancesAsync([id], ct);
        var today = Clock.Today;
        var overdue = bal.Values.Where(b => b.Remaining > 0 && b.DueDate < today).Sum(b => b.Remaining);
        var tripCount = await db.Trips.CountAsync(t => t.CustomerId == id, ct);
        return new CustomerSummaryDto(WithNo(customer), debit, credit, debit - credit, overdue, tripCount);
    }

    /// <summary>Fatura ve tahsilatları tarih sırasıyla, yürüyen bakiyeyle listeler.</summary>
    public async Task<List<AccountMovementDto>> MovementsAsync(int id, CancellationToken ct = default)
    {
        var opening = await db.Customers.AsNoTracking().Where(c => c.Id == id)
            .Select(c => new { c.OpeningBalance, c.OpeningBalanceDate, c.CreatedAt }).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Müşteri bulunamadı.");
        var invoices = await db.Invoices.AsNoTracking().Where(i => i.CustomerId == id && i.Status == InvoiceStatus.Issued)
            .Select(i => new { i.Date, i.CreatedAt, i.InvoiceNo, i.Notes, i.Total, i.Id }).ToListAsync(ct);
        var payments = await db.Payments.AsNoTracking().Where(p => p.CustomerId == id)
            .Select(p => new { p.Date, p.CreatedAt, p.Id, p.Method, p.Description, p.Amount, p.InstrumentStatus, p.InstrumentNo, InvoiceNo = p.Invoice != null ? p.Invoice.InvoiceNo : null })
            .ToListAsync(ct);
        var bal = await balances.InvoiceBalancesAsync([id], ct);

        var rows = invoices.Select(i => (i.Date, i.CreatedAt, Type: "Fatura", Ref: i.InvoiceNo, Desc: i.Notes, Debit: i.Total, Credit: 0m,
                Status: BalanceService.PaymentStatus(InvoiceStatus.Issued, bal.GetValueOrDefault(i.Id))))
            .Concat(payments.Select(p => (p.Date, p.CreatedAt, Type: "Tahsilat", Ref: $"T-{p.Id:D6}",
                Desc: p.Description ?? (p.InvoiceNo != null ? $"{p.InvoiceNo} tahsilatı" : null), Debit: 0m,
                Credit: p.InstrumentStatus is InstrumentStatus.Bounced or InstrumentStatus.Returned ? 0m : p.Amount,
                Status: p.InstrumentStatus switch
                {
                    InstrumentStatus.Bounced => $"{MethodLabel(p.Method)} karşılıksız ({p.Amount:N2} TL sayılmadı)",
                    InstrumentStatus.Returned => $"{MethodLabel(p.Method)} iade ({p.Amount:N2} TL sayılmadı)",
                    { } st => $"{MethodLabel(p.Method)} · {InstrumentStatusLabel(st)}",
                    _ => MethodLabel(p.Method),
                })))
            .ToList();
        if (opening.OpeningBalance > 0)
            rows.Insert(0, (opening.OpeningBalanceDate ?? DateOnly.FromDateTime(opening.CreatedAt), DateTime.MinValue, Type: "Devir", Ref: "DEVİR",
                Desc: (string?)"Açılış (devir) bakiyesi", Debit: opening.OpeningBalance, Credit: 0m,
                Status: BalanceService.PaymentStatus(InvoiceStatus.Issued, bal.GetValueOrDefault(BalanceService.OpeningBalanceId(id)))));
        var ordered = rows.OrderBy(r => r.Date).ThenBy(r => r.CreatedAt);

        var running = 0m;
        return ordered.Select(r =>
        {
            running += r.Debit - r.Credit;
            return new AccountMovementDto(r.Date, r.Type, r.Ref, r.Desc, r.Debit, r.Credit, running, r.Status);
        }).ToList();
    }

    public static string MethodLabel(PaymentMethod m) => m switch
    {
        PaymentMethod.Cash => "Nakit",
        PaymentMethod.BankTransfer => "Havale/EFT",
        PaymentMethod.Check => "Çek",
        PaymentMethod.CreditCard => "Kredi Kartı",
        PaymentMethod.PromissoryNote => "Senet",
        _ => m.ToString(),
    };

    public static string InstrumentStatusLabel(InstrumentStatus s) => s switch
    {
        InstrumentStatus.Portfolio => "Portföyde",
        InstrumentStatus.InCollection => "Tahsilde",
        InstrumentStatus.Collected => "Tahsil edildi",
        InstrumentStatus.Endorsed => "Ciro edildi",
        InstrumentStatus.Bounced => "Karşılıksız",
        InstrumentStatus.Returned => "İade",
        _ => s.ToString(),
    };
}
