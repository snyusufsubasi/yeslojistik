using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Api.Controllers;

/// <summary>Faturaya eklenecek hazır notlar (banka hesabı, IBAN, açıklama); müşteri şablonunda seçilir.</summary>
[ApiController]
[Route("api/invoice-notes")]
public class InvoiceNotesController(AppDbContext db) : ControllerBase
{
    private static InvoiceNoteDto ToDto(InvoiceNoteTemplate n) => new(n.Id, n.Kind, n.Title, n.AccountName, n.Iban, n.Text);

    [HttpGet]
    public async Task<List<InvoiceNoteDto>> List(CancellationToken ct) =>
        (await db.InvoiceNotes.AsNoTracking().OrderBy(n => n.Kind).ThenBy(n => n.Title).ToListAsync(ct)).Select(ToDto).ToList();

    [Authorize(Policy = Policies.Accounting)]
    [HttpPost]
    public async Task<InvoiceNoteDto> Create(InvoiceNoteSaveRequest req, CancellationToken ct)
    {
        var n = new InvoiceNoteTemplate();
        Apply(n, req);
        db.InvoiceNotes.Add(n);
        await db.SaveChangesAsync(ct);
        return ToDto(n);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpPut("{id:int}")]
    public async Task<InvoiceNoteDto> Update(int id, InvoiceNoteSaveRequest req, CancellationToken ct)
    {
        var n = await db.InvoiceNotes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Not bulunamadı.");
        Apply(n, req);
        await db.SaveChangesAsync(ct);
        return ToDto(n);
    }

    [Authorize(Policy = Policies.Accounting)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var n = await db.InvoiceNotes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Not bulunamadı.");
        n.IsDeleted = true;
        // Bu notu kullanan müşteri şablonları boşa düşer.
        foreach (var c in await db.Customers.Where(c => c.InvoiceTemplate.SaleNoteId == id || c.InvoiceTemplate.WithholdingNoteId == id).ToListAsync(ct))
        {
            if (c.InvoiceTemplate.SaleNoteId == id) c.InvoiceTemplate.SaleNoteId = null;
            if (c.InvoiceTemplate.WithholdingNoteId == id) c.InvoiceTemplate.WithholdingNoteId = null;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(InvoiceNoteTemplate n, InvoiceNoteSaveRequest r)
    {
        n.Kind = r.Kind;
        n.Title = r.Title.Trim();
        n.AccountName = CustomersController.NullIfEmpty(r.AccountName);
        n.Iban = CustomersController.NullIfEmpty(r.Iban)?.Replace(" ", "").ToUpperInvariant();
        n.Text = CustomersController.NullIfEmpty(r.Text);
    }
}
