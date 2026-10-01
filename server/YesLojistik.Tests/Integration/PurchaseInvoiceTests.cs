using System.Net;
using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

/// <summary>Alınan faturalar: seferi "fatura bekleyen" durumundan çıkarır, borç faturanın tutarından gelir.</summary>
public class PurchaseInvoiceTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

    [Theory]
    [InlineData(25_000, 20, 29_000)]   // 30.000 KDV dahil > 12.000: 2/10 tevkifat (1.000)
    [InlineData(7_500, 20, 9_000)]     // 9.000 ≤ 12.000: tevkifatsız
    [InlineData(22_000, 20, 25_520)]
    [InlineData(10_000, 0, 10_000)]    // KDV'siz (eski kayıtlar): olduğu gibi
    public void Carrier_payable_follows_old_panel_rules(decimal cost, decimal vat, decimal expected) =>
        Trip.CarrierPayable(cost, vat, null).Should().Be(expected);

    [Fact]
    public async Task Invoice_replaces_pending_trips_in_supplier_balance_and_can_be_cancelled()
    {
        var c = await factory.LoginAsync();
        var s = await (await c.PostJsonAsync("/api/suppliers", new SupplierSaveRequest("Fatura Nakliyat", SupplierKind.Carrier, "1234567890", null, null,
            null, null, null, null, null, null, 30, null))).ReadAsync<SupplierDto>();
        var customer = (await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Fatura Müşteri", null, null, null, null, null, null)))
            .ReadAsync<CustomerSummaryDto>()).Customer;
        var vehicle = await (await c.PostJsonAsync("/api/vehicles", new VehicleSaveRequest($"34 FT {Random.Shared.Next(1000, 99999)}", "Tır",
            null, null, null, 0, null, null, null, null, VehicleStatus.Available, null, VehicleOwnership.Rented, s.Id))).ReadAsync<VehicleDto>();
        var driver = await (await c.PostJsonAsync("/api/drivers", new DriverSaveRequest("Fatura Şoför", null, null, null, null, null, null, true, s.Id))).ReadAsync<DriverDto>();

        async Task<TripDto> Trip(decimal cost)
        {
            var t = await (await c.PostJsonAsync("/api/trips", new TripSaveRequest(customer.Id, vehicle.Id, driver.Id, "Ümraniye", "Gebze", Today, null, null,
                cost, cost + 5_000, Terms: new TripTerms(CostVatRate: 20)))).ReadAsync<TripDto>();
            return await (await c.PostJsonAsync($"/api/trips/{t.Id}/status", new TripStatusRequest(TripStatus.Loaded))).ReadAsync<TripDto>();
        }
        var t1 = await Trip(25_000);
        var t2 = await Trip(7_500);
        async Task<decimal> Balance() => (await (await c.GetAsync($"/api/suppliers/{s.Id}")).ReadAsync<SupplierSummaryDto>()).Balance;
        (await Balance()).Should().Be(29_000 + 9_000);

        var pending = await (await c.GetAsync($"/api/purchase-invoices/uninvoiced-trips?supplierId={s.Id}")).ReadAsync<List<UninvoicedCarrierTripDto>>();
        pending.Select(p => p.TripId).Should().BeEquivalentTo([t1.Id, t2.Id]);
        pending.Single(p => p.TripId == t1.Id).Payable.Should().Be(29_000);

        var inv = await (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(s.Id, "srt2026000000158", Today, null,
            PurchaseInvoiceKind.EInvoice, 25_000, 5_000, 1_000, null, [t1.Id]))).ReadAsync<PurchaseInvoiceDto>();
        inv.InvoiceNo.Should().Be("SRT2026000000158");
        inv.Total.Should().Be(29_000);
        inv.Trips.Should().ContainSingle(t => t.TripId == t1.Id);
        var trip = await (await c.GetAsync($"/api/trips/{t1.Id}")).ReadAsync<TripDto>();
        trip.CarrierInvoiceNo.Should().Be("SRT2026000000158");

        // Aynı numara aynı tedarikçide ikinci kez girilemez; başka tedarikçinin seferi bağlanamaz.
        (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(s.Id, "SRT2026000000158", Today, null,
            PurchaseInvoiceKind.EInvoice, 1, 0, 0, null, null))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        // Sefer bağlanamazsa fatura da kaydedilmez (yarım fatura borcu artırmaz).
        (await c.PostJsonAsync("/api/purchase-invoices", new PurchaseInvoiceSaveRequest(s.Id, "YARIM0001", Today, null,
            PurchaseInvoiceKind.EInvoice, 50_000, 0, 0, null, [t1.Id]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Balance()).Should().Be(29_000 + 9_000);

        // Fatura tutarı sefer tahmininden farklıysa borç faturadan gelir.
        inv = await (await c.PutJsonAsync($"/api/purchase-invoices/{inv.Id}", new PurchaseInvoiceSaveRequest(s.Id, inv.InvoiceNo, Today, null,
            PurchaseInvoiceKind.EInvoice, 25_000, 5_000, 0, "Tevkifatsız kesilmiş", [t1.Id]))).ReadAsync<PurchaseInvoiceDto>();
        (await Balance()).Should().Be(30_000 + 9_000);
        // Tedarikçiler cari listesi kartla aynı bakiyeyi gösterir (alınan fatura dahil).
        var cari = await (await c.GetAsync("/api/cari/suppliers")).ReadAsync<List<SupplierCariRow>>();
        cari.Single(r => r.Id == s.Id).Balance.Should().Be(30_000 + 9_000);

        // Sefere bağlı ödeme faturayı kapatır.
        await c.PostJsonAsync("/api/supplier-payments", new SupplierPaymentSaveRequest(s.Id, Today, 30_000, PaymentMethod.BankTransfer, t1.Id, null));
        var movements = await (await c.GetAsync($"/api/suppliers/{s.Id}/movements")).ReadAsync<List<AccountMovementDto>>();
        movements.Should().Contain(m => m.Type == "Alış faturası" && m.Status == "Ödendi");
        movements.Should().Contain(m => m.Type == "Fatura bekleyen sefer");
        (await Balance()).Should().Be(9_000);

        // İptal: sefer yeniden "fatura bekleyen" olur.
        inv = await (await c.PostJsonAsync($"/api/purchase-invoices/{inv.Id}/cancel", new PurchaseInvoiceCancelRequest("Hatalı"))).ReadAsync<PurchaseInvoiceDto>();
        inv.IsCancelled.Should().BeTrue();
        inv.Trips.Should().BeEmpty();
        (await Balance()).Should().Be(29_000 + 9_000 - 30_000);
        var list = await (await c.GetAsync($"/api/purchase-invoices?supplierId={s.Id}")).ReadAsync<PagedResult<PurchaseInvoiceDto>>();
        list.Items.Should().BeEmpty();
    }
}
