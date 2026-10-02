namespace YesLojistik.Core.Domain;

public record AllocInvoice(int Id, DateOnly Date, DateOnly DueDate, decimal Total);
/// <param name="Targets">Birden çok kaleme bağlı ödeme (toplu ödeme): kalemler sırayla kapatılır, artan FIFO'ya gider.</param>
public record AllocPayment(int? InvoiceId, DateOnly Date, decimal Amount, IReadOnlyList<int>? Targets = null);
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
            if (p.Targets is { Count: > 0 } targets)
            {
                var left = p.Amount;
                foreach (var target in targets.Distinct().Where(paid.ContainsKey))
                {
                    if (left <= 0) break;
                    var inv = ordered.First(i => i.Id == target);
                    var apply = Math.Max(0, Math.Min(left, inv.Total - paid[target]));
                    paid[target] += apply;
                    left -= apply;
                }
                pool += left;
            }
            else if (p.InvoiceId is { } id && paid.ContainsKey(id))
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
