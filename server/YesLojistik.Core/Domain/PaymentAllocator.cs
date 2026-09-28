namespace YesLojistik.Core.Domain;

public record AllocInvoice(int Id, DateOnly Date, DateOnly DueDate, decimal Total);
public record AllocPayment(int? InvoiceId, DateOnly Date, decimal Amount);
public record InvoiceBalance(int InvoiceId, DateOnly DueDate, decimal Total, decimal Paid, decimal Remaining);

public record AgingBuckets(decimal NotDue, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Over90)
{
    public decimal Total => NotDue + Days1To30 + Days31To60 + Days61To90 + Over90;
}

/// <summary>
/// Bir müşterinin tahsilatlarını faturalarına dağıtır. Faturaya bağlı tahsilat önce o faturayı kapatır;
/// bağlı olmayan tahsilatlar (ve faturayı aşan kısımlar) en eski faturadan başlanarak dağıtılır (FIFO).
/// </summary>
public static class PaymentAllocator
{
    public static List<InvoiceBalance> Allocate(IEnumerable<AllocInvoice> invoices, IEnumerable<AllocPayment> payments)
    {
        var ordered = invoices.OrderBy(i => i.Date).ThenBy(i => i.Id).ToList();
        var paid = ordered.ToDictionary(i => i.Id, _ => 0m);
        var pool = 0m;

        foreach (var p in payments)
        {
            if (p.InvoiceId is { } id && paid.ContainsKey(id))
            {
                var inv = ordered.First(i => i.Id == id);
                var apply = Math.Min(p.Amount, inv.Total - paid[id]);
                paid[id] += apply;
                pool += p.Amount - apply;
            }
            else
            {
                pool += p.Amount;
            }
        }

        foreach (var inv in ordered)
        {
            if (pool <= 0) break;
            var apply = Math.Min(pool, inv.Total - paid[inv.Id]);
            paid[inv.Id] += apply;
            pool -= apply;
        }

        return ordered.Select(i => new InvoiceBalance(i.Id, i.DueDate, i.Total, paid[i.Id], i.Total - paid[i.Id])).ToList();
    }

    public static AgingBuckets Age(IEnumerable<InvoiceBalance> balances, DateOnly asOf)
    {
        decimal notDue = 0, b30 = 0, b60 = 0, b90 = 0, over = 0;
        foreach (var b in balances.Where(b => b.Remaining > 0))
        {
            var days = asOf.DayNumber - b.DueDate.DayNumber;
            switch (days)
            {
                case <= 0: notDue += b.Remaining; break;
                case <= 30: b30 += b.Remaining; break;
                case <= 60: b60 += b.Remaining; break;
                case <= 90: b90 += b.Remaining; break;
                default: over += b.Remaining; break;
            }
        }
        return new AgingBuckets(notDue, b30, b60, b90, over);
    }
}
