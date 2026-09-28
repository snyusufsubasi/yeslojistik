using System.Net;
using System.Net.Http.Headers;
using ClosedXML.Excel;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

public class ImportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static byte[] Workbook(string[] headers, params object?[][] rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Veri");
        for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        for (var r = 0; r < rows.Length; r++)
            for (var c = 0; c < rows[r].Length; c++)
                ws.Cell(r + 2, c + 1).Value = rows[r][c] switch
                {
                    null => Blank.Value, DateTime d => d, decimal m => m, int n => n, double x => x, var o => o.ToString(),
                };
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static MultipartFormDataContent Form(byte[] bytes)
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes) { Headers = { ContentType = new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") } }, "file", "veri.xlsx");
        return form;
    }

    [Fact]
    public async Task Template_downloads()
    {
        var c = await factory.LoginAsync();
        foreach (var e in new[] { "customers", "vehicles", "drivers" })
        {
            var res = await c.GetAsync($"/api/import/{e}/template");
            res.StatusCode.Should().Be(HttpStatusCode.OK);
            using var wb = new XLWorkbook(await res.Content.ReadAsStreamAsync());
            wb.Worksheet(1).Cell(1, 1).GetString().Should().Be(ImportService.Columns[e][0]);
        }
    }

    [Fact]
    public async Task Customers_with_opening_balance_are_imported_after_dry_run()
    {
        var c = await factory.LoginAsync();
        var file = Workbook(ImportService.Columns["customers"],
            ["İthal Mobilya", 1234567890d, "Tuzla", "02165554433", "a@b.com", "İstanbul", null, 10000m, new DateTime(2026, 1, 1)],
            ["İthal İnşaat", null, null, null, null, null, null, "2.500,50", "15.01.2026"]);

        var dry = await (await c.PostAsync("/api/import/customers?dryRun=true", Form(file))).ReadAsync<ImportResult>();
        dry.Errors.Should().BeEmpty();
        dry.DryRun.Should().BeTrue();
        (await (await c.GetAsync("/api/customers?search=İthal")).ReadAsync<PagedResult<CustomerDto>>()).Total.Should().Be(0);

        var real = await (await c.PostAsync("/api/import/customers?dryRun=false", Form(file))).ReadAsync<ImportResult>();
        real.Created.Should().Be(2);
        var list = await (await c.GetAsync("/api/customers?search=İthal&sort=title")).ReadAsync<PagedResult<CustomerDto>>();
        list.Items.Should().HaveCount(2);
        var mobilya = list.Items.Single(x => x.Title == "İthal Mobilya");
        mobilya.TaxNumber.Should().Be("1234567890");
        mobilya.Phone.Should().Be("0216 555 44 33");
        mobilya.Balance.Should().Be(10000);
        list.Items.Single(x => x.Title == "İthal İnşaat").Balance.Should().Be(2500.50m);

        // Devir bakiyesi cari hareketlerde, yaşlandırmada görünür; genel tahsilat önce devri kapatır.
        var moves = await (await c.GetAsync($"/api/customers/{mobilya.Id}/movements")).ReadAsync<List<AccountMovementDto>>();
        moves.Should().ContainSingle(m => m.Type == "Devir" && m.Debit == 10000);
        var aging = await (await c.GetAsync("/api/reports/aging")).ReadAsync<List<CustomerAgingRow>>();
        aging.Single(a => a.CustomerId == mobilya.Id).Total.Should().Be(10000);

        await (await c.PostJsonAsync("/api/payments", new PaymentSaveRequest(mobilya.Id, null, new DateOnly(2026, 2, 1), 4000, PaymentMethod.Cash, null))).ReadAsync<PaymentDto>();
        var summary = await (await c.GetAsync($"/api/customers/{mobilya.Id}")).ReadAsync<CustomerSummaryDto>();
        summary.Balance.Should().Be(6000);
        summary.TotalDebit.Should().Be(10000);

        // Devir bakiyesi olan müşteri silinemez (alacak kaybolmasın).
        (await c.DeleteAsync($"/api/customers/{list.Items.Single(x => x.Title == "İthal İnşaat").Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Aynı dosya tekrar: hepsi atlanır
        var again = await (await c.PostAsync("/api/import/customers?dryRun=false", Form(file))).ReadAsync<ImportResult>();
        again.Created.Should().Be(0);
        again.Skipped.Should().Be(2);
    }

    [Fact]
    public async Task Invalid_rows_block_the_whole_import()
    {
        var c = await factory.LoginAsync();
        var file = Workbook(ImportService.Columns["vehicles"],
            ["35 IMP 01", "Kamyon", null, null, 2019, 1000, null, null, null, null],
            ["99 XX 1", "Kamyon", null, null, null, null, null, null, null, null],
            ["35 IMP 02", "", null, null, null, "çok", null, null, null, null]);
        var res = await (await c.PostAsync("/api/import/vehicles?dryRun=false", Form(file))).ReadAsync<ImportResult>();
        res.Created.Should().Be(0);
        res.Errors.Select(e => e.Row).Should().BeEquivalentTo([3, 4]);
        (await (await c.GetAsync("/api/vehicles?search=IMP")).ReadAsync<PagedResult<VehicleDto>>()).Total.Should().Be(0);
    }

    [Fact]
    public async Task Drivers_import_and_wrong_template_is_rejected()
    {
        var c = await factory.LoginAsync();
        var ok = Workbook(ImportService.Columns["drivers"], ["İthal Şoför", "5321234567", null, "ce", "01.01.2030", null, null]);
        (await (await c.PostAsync("/api/import/drivers?dryRun=false", Form(ok))).ReadAsync<ImportResult>()).Created.Should().Be(1);

        var wrong = Workbook(["Bir", "İki"], ["x", "y"]);
        (await c.PostAsync("/api/import/drivers?dryRun=true", Form(wrong))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await c.PostAsync("/api/import/drivers?dryRun=true", Form("not excel"u8.ToArray()))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
