using System.IO.Compression;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.EInvoice;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

public record EInvoiceInfoDto(string ProviderName, bool CanSend, bool SupportsStatus, bool SupportsRecipientCheck, bool ApiKeyConfigured,
    string ProviderKey = "manual", bool SupportsDownload = false);

/// <summary>e-Fatura / e-Arşiv işlemleri: XML indirme, gönderme, elle işaretleme, durum ve iptal; mükellef sorgusu.</summary>
[ApiController]
[Route("api")]
[Authorize(Policy = Policies.Accounting)]
public class EInvoiceController(EInvoiceService service, InvoiceService invoices, IEInvoiceProvider provider, IConfiguration config) : ControllerBase
{
    [HttpGet("einvoice/info")]
    public EInvoiceInfoDto Info() => new(provider.Name, provider.CanSend, provider.SupportsStatus, provider.SupportsRecipientCheck,
        !string.IsNullOrWhiteSpace(config["EInvoice:ApiKey"]), provider.Key, provider.SupportsDownload);

    [HttpGet("invoices/{id:int}/einvoice/xml")]
    public async Task<IActionResult> Xml(int id, CancellationToken ct)
    {
        var (xml, name) = await service.XmlAsync(id, ct);
        return File(xml, "application/xml", name);
    }

    [HttpPost("invoices/{id:int}/einvoice/send")]
    public async Task<InvoiceDto> Send(int id, CancellationToken ct)
    {
        await service.SendAsync(id, ct);
        return await invoices.GetAsync(id, ct);
    }

    [HttpPost("invoices/{id:int}/einvoice/mark-sent")]
    public async Task<InvoiceDto> MarkSent(int id, CancellationToken ct)
    {
        await service.MarkSentAsync(id, ct);
        return await invoices.GetAsync(id, ct);
    }

    [HttpPost("invoices/{id:int}/einvoice/status")]
    public async Task<InvoiceDto> Status(int id, CancellationToken ct)
    {
        await service.RefreshStatusAsync(id, ct);
        return await invoices.GetAsync(id, ct);
    }

    [HttpPost("invoices/{id:int}/einvoice/cancel-confirmed")]
    public async Task<InvoiceDto> CancelConfirmed(int id, CancellationToken ct)
    {
        await service.ConfirmCancelAsync(id, ct);
        return await invoices.GetAsync(id, ct);
    }

    /// <summary>Alıcının e-Fatura mükellefi olup olmadığı ve etiketleri (sağlayıcı destekliyorsa).</summary>
    [HttpGet("einvoice/recipient/{taxNumber}")]
    public async Task<ActionResult<EInvoiceRecipient>> Recipient(string taxNumber, CancellationToken ct)
    {
        if (!provider.SupportsRecipientCheck) throw new DomainException("Mükellef sorgusu için entegratör bağlantısı gerekir.");
        if (!TaxNumberValidator.IsValid(taxNumber)) throw new DomainException("Geçersiz VKN/TCKN.");
        return await provider.CheckRecipientAsync(taxNumber, ct) ?? new EInvoiceRecipient(false, []);
    }
}

/// <summary>Muhasebeciye aylık aktarım: tek Excel (satış, tahsilat, gider, taşeron) ve e-Fatura XML'lerinin ZIP'i.</summary>
[ApiController]
[Route("api/exports")]
[Authorize(Policy = Policies.Accounting)]
public class ExportsController(AppDbContext db) : ControllerBase
{
    private static (DateOnly From, DateOnly To) Range(DateOnly? from, DateOnly? to)
    {
        var f = from ?? Clock.MonthStart;
        var t = to ?? f.AddMonths(1).AddDays(-1);
        if (f > t) throw new DomainException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        return (f, t);
    }

    [HttpGet("accounting")]
    public async Task<IActionResult> Accounting([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var invoices = await db.Invoices.AsNoTracking().Where(i => i.Date >= f && i.Date <= t && i.Status != InvoiceStatus.Draft)
            .OrderBy(i => i.Date).ThenBy(i => i.InvoiceNo)
            .Select(i => new { i.InvoiceNo, i.EInvoiceNo, i.Date, i.DueDate, Customer = i.Customer.Title, i.Customer.TaxNumber, i.Subtotal, i.VatRate,
                i.VatAmount, i.WithholdingAmount, i.Total, i.Status, i.EInvoiceStatus }).ToListAsync(ct);
        var payments = await db.Payments.AsNoTracking().Where(p => p.Date >= f && p.Date <= t).OrderBy(p => p.Date)
            .Select(p => new { p.Date, Customer = p.Customer.Title, InvoiceNo = p.Invoice != null ? p.Invoice.InvoiceNo : null, p.Method, p.Amount, p.Description }).ToListAsync(ct);
        var expenses = await db.Expenses.AsNoTracking().Where(e => e.Date >= f && e.Date <= t).OrderBy(e => e.Date)
            .Select(e => new { e.Date, e.Category, Plate = e.Vehicle != null ? e.Vehicle.Plate : null, Supplier = e.Supplier != null ? e.Supplier.Title : null,
                e.IsOnCredit, e.Amount, e.Description, e.ApprovalStatus }).ToListAsync(ct);
        var carrier = await db.Trips.AsNoTracking().Where(x => !x.IsLegacy && x.CarrierSupplierId != null && x.Status != TripStatus.Cancelled && x.Status != TripStatus.Planned
                && (x.DeliveryDate ?? x.LoadingDate) >= f && (x.DeliveryDate ?? x.LoadingDate) <= t)
            .OrderBy(x => x.LoadingDate)
            .Select(x => new { x.Id, x.LoadingDate, x.DeliveryDate, Supplier = x.CarrierSupplier!.Title, x.Vehicle.Plate, x.LoadingAddress, x.DeliveryAddress,
                x.VehicleCost, x.CarrierInvoiceNo, x.CarrierInvoiceDate }).ToListAsync(ct);
        var supplierPayments = await db.SupplierPayments.AsNoTracking().Where(p => p.Date >= f && p.Date <= t).OrderBy(p => p.Date)
            .Select(p => new { p.Date, Supplier = p.Supplier.Title, p.Method, p.Amount, p.Description }).ToListAsync(ct);

        using var wb = new ExcelWorkbookBuilder();
        wb.AddSheet("Satış Faturaları", invoices,
            new ExcelColumn<dynamic>("Fatura No", r => r.InvoiceNo), new("e-Fatura No", r => r.EInvoiceNo),
            new("Tarih", r => r.Date, ExcelExporter.DateFormat), new("Vade", r => r.DueDate, ExcelExporter.DateFormat),
            new("Müşteri", r => r.Customer), new("VKN/TCKN", r => r.TaxNumber),
            new("Matrah", r => r.Subtotal, ExcelExporter.MoneyFormat), new("KDV %", r => r.VatRate),
            new("KDV", r => r.VatAmount, ExcelExporter.MoneyFormat), new("Tevkifat", r => r.WithholdingAmount, ExcelExporter.MoneyFormat),
            new("Toplam", r => r.Total, ExcelExporter.MoneyFormat), new("Durum", r => r.Status == InvoiceStatus.Cancelled ? "İptal" : "Kesildi"));
        wb.AddSheet("Tahsilatlar", payments,
            new ExcelColumn<dynamic>("Tarih", r => r.Date, ExcelExporter.DateFormat), new("Müşteri", r => r.Customer), new("Fatura", r => r.InvoiceNo),
            new("Yöntem", r => MethodLabel(r.Method)), new("Tutar", r => r.Amount, ExcelExporter.MoneyFormat), new("Açıklama", r => r.Description));
        wb.AddSheet("Giderler", expenses,
            new ExcelColumn<dynamic>("Tarih", r => r.Date, ExcelExporter.DateFormat), new("Kategori", r => r.Category.ToString()),
            new("Araç", r => r.Plate), new("Tedarikçi", r => r.Supplier), new("Vadeli", r => r.IsOnCredit ? "Evet" : ""),
            new("Tutar", r => r.Amount, ExcelExporter.MoneyFormat), new("Açıklama", r => r.Description),
            new("Onay", r => r.ApprovalStatus == ApprovalStatus.Approved ? "" : r.ApprovalStatus.ToString()));
        wb.AddSheet("Taşeron Maliyetleri", carrier,
            new ExcelColumn<dynamic>("Sefer", r => r.Id), new("Yükleme", r => r.LoadingDate, ExcelExporter.DateFormat),
            new("Teslim", r => r.DeliveryDate, ExcelExporter.DateFormat), new("Taşeron", r => r.Supplier), new("Plaka", r => r.Plate),
            new("Güzergâh", r => $"{r.LoadingAddress} → {r.DeliveryAddress}"), new("Maliyet", r => r.VehicleCost, ExcelExporter.MoneyFormat),
            new("Taşeron Fatura No", r => r.CarrierInvoiceNo), new("Fatura Tarihi", r => r.CarrierInvoiceDate, ExcelExporter.DateFormat));
        wb.AddSheet("Taşeron Ödemeleri", supplierPayments,
            new ExcelColumn<dynamic>("Tarih", r => r.Date, ExcelExporter.DateFormat), new("Tedarikçi", r => r.Supplier),
            new("Yöntem", r => MethodLabel(r.Method)), new("Tutar", r => r.Amount, ExcelExporter.MoneyFormat), new("Açıklama", r => r.Description));
        return File(wb.Build(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"muhasebe-{f:yyyy-MM-dd}_{t:yyyy-MM-dd}.xlsx");
    }

    /// <summary>Aralıktaki e-Fatura/e-Arşiv faturalarının UBL-TR XML'leri, tek ZIP.</summary>
    [HttpGet("einvoice-xml")]
    public async Task<IActionResult> EInvoiceXml([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var (f, t) = Range(from, to);
        var list = await db.Invoices.AsNoTracking().Include(i => i.Lines).Include(i => i.Customer)
            .Where(i => i.Date >= f && i.Date <= t && i.Ettn != null && i.Status == InvoiceStatus.Issued).OrderBy(i => i.EInvoiceNo).ToListAsync(ct);
        if (list.Count == 0) throw new DomainException("Bu aralıkta e-Fatura kapsamında kesilmiş fatura yok.");
        var company = await db.CompanySettings.AsNoTracking().FirstAsync(ct);
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var inv in list)
            {
                var entry = zip.CreateEntry($"{inv.EInvoiceNo}.xml", CompressionLevel.Optimal);
                await using var w = new StreamWriter(entry.Open(), new System.Text.UTF8Encoding(false));
                await w.WriteAsync(UblInvoiceBuilder.Build(inv, inv.Customer, company));
            }
        }
        return File(ms.ToArray(), "application/zip", $"efatura-xml-{f:yyyy-MM-dd}_{t:yyyy-MM-dd}.zip");
    }

    private static string MethodLabel(PaymentMethod m) => m switch
    {
        PaymentMethod.Cash => "Nakit", PaymentMethod.BankTransfer => "Havale/EFT", PaymentMethod.Check => "Çek", PaymentMethod.CreditCard => "Kredi Kartı",
        _ => m.ToString(),
    };
}
