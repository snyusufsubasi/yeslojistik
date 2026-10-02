using FluentAssertions;
using YesLojistik.Core.Domain;

namespace YesLojistik.Tests.Unit;

public class PaymentAllocatorTests
{
    private static readonly DateOnly D = new(2026, 1, 1);

    [Fact]
    public void Linked_payment_closes_its_invoice_first()
    {
        var result = PaymentAllocator.Allocate(
            [new(1, D, D.AddDays(30), 1000), new(2, D.AddDays(1), D.AddDays(31), 500)],
            [new(2, D.AddDays(5), 500)]);
        result.Single(b => b.InvoiceId == 1).Remaining.Should().Be(1000);
        result.Single(b => b.InvoiceId == 2).Remaining.Should().Be(0);
    }

    [Fact]
    public void Unlinked_payments_apply_fifo_to_oldest_invoice()
    {
        var result = PaymentAllocator.Allocate(
            [new(2, D.AddDays(10), D.AddDays(40), 500), new(1, D, D.AddDays(30), 1000)],
            [new(null, D.AddDays(5), 1200)]);
        result.Single(b => b.InvoiceId == 1).Remaining.Should().Be(0);
        result.Single(b => b.InvoiceId == 2).Remaining.Should().Be(300);
    }

    [Fact]
    public void Overpayment_on_linked_invoice_spills_to_others()
    {
        var result = PaymentAllocator.Allocate(
            [new(1, D, D, 100), new(2, D, D, 100)],
            [new(1, D, 150)]);
        result.Sum(b => b.Remaining).Should().Be(50);
        result.Single(b => b.InvoiceId == 1).Paid.Should().Be(100);
    }

    [Fact]
    public void Ages_remaining_amounts_into_buckets()
    {
        var asOf = new DateOnly(2026, 6, 1);
        var buckets = PaymentAllocator.Age(
        [
            new(1, asOf.AddDays(5), 100, 0, 100),     // vadesi gelmemiş
            new(2, asOf.AddDays(-10), 200, 0, 200),   // 1-30
            new(3, asOf.AddDays(-45), 300, 0, 300),   // 31-60
            new(4, asOf.AddDays(-75), 400, 0, 400),   // 61-90
            new(5, asOf.AddDays(-200), 500, 0, 500),  // 90+
            new(6, asOf.AddDays(-200), 600, 600, 0),  // ödenmiş
        ], asOf);
        buckets.Should().Be(new AgingBuckets(100, 200, 300, 400, 500));
        buckets.Total.Should().Be(1500);
    }

    [Fact]
    public void Bulk_payment_closes_its_targets_in_order_and_sends_the_rest_to_fifo()
    {
        var result = PaymentAllocator.Allocate(
            [new(1, D, D.AddDays(30), 1000), new(2, D.AddDays(1), D.AddDays(31), 500), new(3, D.AddDays(2), D.AddDays(32), 300)],
            [new(null, D.AddDays(5), 900, [3, 2, 99])]);
        result.Single(b => b.InvoiceId == 3).Remaining.Should().Be(0);
        result.Single(b => b.InvoiceId == 2).Remaining.Should().Be(0);
        // Hedefler 800 tutuyordu; artan 100 en eski kaleme gider.
        result.Single(b => b.InvoiceId == 1).Remaining.Should().Be(900);
    }
}
