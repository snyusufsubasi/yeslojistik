using System.Net;
using System.Net.Http.Headers;
using System.Text;
using ClosedXML.Excel;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Integration;

/// <summary>Genel içe aktarma sihirbazı: önizleme (dry-run), geçerli satırları aktarma, tekrar kayıt, doğrulama mesajları, CSV, sınırlar. Sahte (uydurma) veriyle.</summary>
public class ImportWizardTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    // 9876543217 ve 1112223339 sağlama toplamı geçerli sahte VKN'lerdir; 10000000146 geçerli sahte TCKN.
    private const string Vkn1 = "9876543217";
    private const string Vkn2 = "1112223339";
    private const string Tckn = "10000000146";

    private static MultipartFormDataContent Csv(string text, Encoding? encoding = null, string name = "veri.csv")
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent((encoding ?? new UTF8Encoding(true)).GetPreamble().Concat((encoding ?? new UTF8Encoding(true)).GetBytes(text)).ToArray())
            { Headers = { ContentType = new MediaTypeHeaderValue("text/csv") } }, "file", name);
        return form;
    }

    private static string[] CustomerHeaders => ImportService.Columns["customers"];

    private static object?[] CustomerRow(string title, object? vkn = null, string? phone = null, string? city = null) =>
        [title, vkn, null, phone, null, null, null, null, null, city];

    [Fact]
    public async Task Preview_classifies_rows_and_lists_plain_reasons_without_writing()
    {
        var c = await factory.LoginAsync();
        await (await c.PostJsonAsync("/api/customers", new CustomerSaveRequest("Var Olan Nakliyat", Vkn2, null, null, null, null, null))).ReadAsync<CustomerSummaryDto>();
        var file = ImportTests.Workbook(CustomerHeaders,
            CustomerRow("Önizleme Mobilya", Vkn1, "0532 111 22 33", "İstanbul"),   // 2 ok
            CustomerRow("Önizleme VKN'siz"),                                          // 3 warning (VKN yok)
            CustomerRow("Önizleme Hatalı VKN", "12345"),                              // 4 error
            CustomerRow("Önizleme Hatalı Tel", null, "123"),                          // 5 error
            CustomerRow("", Vkn1),                                                    // 6 error (ünvan yok)
            CustomerRow("Var Olan Nakliyat", Vkn2),                                   // 7 duplicate (sistemde)
            CustomerRow("Önizleme Mobilya"),                                          // 8 duplicate (dosyada)
            CustomerRow("Önizleme Hatalı İl", null, null, "Atlantis"));              // 9 error

        var res = await (await c.PostAsync("/api/import/customers?dryRun=true&skipInvalid=true", ImportTests.Form(file))).ReadAsync<ImportResult>();
        res.DryRun.Should().BeTrue();
        res.TotalRows.Should().Be(8);
        var rows = res.Rows!.ToDictionary(r => r.Row);
        rows[2].Status.Should().Be("ok");
        rows[3].Status.Should().Be("warning");
        rows[3].Message.Should().Contain("VKN/TCKN yok");
        rows[4].Status.Should().Be("error");
        rows[4].Message.Should().Contain("VKN (10 hane)").And.Contain("TCKN (11 hane)");
        rows[5].Status.Should().Be("error");
        rows[5].Message.Should().Contain("telefon");
        rows[6].Status.Should().Be("error");
        rows[6].Message.Should().Contain("zorunlu");
        rows[7].Status.Should().Be("duplicate");
        rows[7].Message.Should().Contain("zaten kayıtlı");
        rows[8].Status.Should().Be("duplicate");
        rows[8].Message.Should().Contain("dosyada");
        rows[9].Status.Should().Be("error");
        rows[9].Label.Should().Be("Önizleme Hatalı İl");
        res.Created.Should().Be(2);      // satır 2 ve 3 aktarılabilir
        res.Skipped.Should().Be(2);
        res.Errors.Select(e => e.Row).Distinct().Should().BeEquivalentTo([4, 5, 6, 9]);

        (await (await c.GetAsync("/api/customers?search=Önizleme")).ReadAsync<PagedResult<CustomerDto>>()).Total.Should().Be(0);
    }

    [Fact]
    public async Task Apply_imports_only_valid_rows_when_skipInvalid_and_blocks_everything_otherwise()
    {
        var c = await factory.LoginAsync();
        var file = ImportTests.Workbook(CustomerHeaders,
            CustomerRow("Kısmi Aktarım A", "5550001112"),
            CustomerRow("Kısmi Aktarım B", "123"),
            CustomerRow("Kısmi Aktarım C"));

        // Eski davranış: tek hata her şeyi durdurur.
        var strict = await (await c.PostAsync("/api/import/customers?dryRun=false", ImportTests.Form(file))).ReadAsync<ImportResult>();
        strict.Created.Should().Be(0);
        strict.DryRun.Should().BeTrue();
        (await (await c.GetAsync("/api/customers?search=Kısmi")).ReadAsync<PagedResult<CustomerDto>>()).Total.Should().Be(0);

        var real = await (await c.PostAsync("/api/import/customers?dryRun=false&skipInvalid=true", ImportTests.Form(file))).ReadAsync<ImportResult>();
        real.DryRun.Should().BeFalse(System.Text.Json.JsonSerializer.Serialize(real));
        real.Created.Should().Be(2);
        real.Errors.Should().ContainSingle(e => e.Row == 3);
        var list = await (await c.GetAsync("/api/customers?search=Kısmi&sort=title")).ReadAsync<PagedResult<CustomerDto>>();
        list.Items.Select(i => i.Title).Should().Equal("Kısmi Aktarım A", "Kısmi Aktarım C");

        // Aynı dosya tekrar: geçerli satırlar sistemde var, atlanır; hatalı satır yine hata.
        var again = await (await c.PostAsync("/api/import/customers?dryRun=false&skipInvalid=true", ImportTests.Form(file))).ReadAsync<ImportResult>();
        again.Created.Should().Be(0);
        again.Skipped.Should().Be(2);
        (await (await c.GetAsync("/api/customers?search=Kısmi")).ReadAsync<PagedResult<CustomerDto>>()).Total.Should().Be(2);
    }

    [Fact]
    public async Task Vehicles_and_drivers_validate_plate_tckn_and_duplicates()
    {
        var c = await factory.LoginAsync();
        var vehicles = ImportTests.Workbook(ImportService.Columns["vehicles"],
            ["34 WZR 01", "Kamyon", null, null, null, null, null, null, null, null],
            ["34wzr01", "Kamyon", null, null, null, null, null, null, null, null],          // aynı plaka, farklı yazım
            ["99 XX 1", "Kamyon", null, null, null, null, null, null, null, null],           // geçersiz plaka
            ["06 WZR 02", "", null, null, null, null, null, null, null, null],               // araç tipi yok
            ["06 WZR 03", "Tır", null, null, null, null, null, null, null, null, "Kiralık", "Olmayan Taşeron"]);
        var vres = await (await c.PostAsync("/api/import/vehicles?dryRun=false&skipInvalid=true", ImportTests.Form(vehicles))).ReadAsync<ImportResult>();
        vres.Created.Should().Be(1);
        vres.Skipped.Should().Be(1);
        var vrows = vres.Rows!.ToDictionary(r => r.Row);
        vrows[3].Status.Should().Be("duplicate");
        vrows[4].Message.Should().Contain("plaka");
        vrows[5].Message.Should().Contain("Araç tipi zorunlu");
        vrows[6].Message.Should().Contain("Tedarikçi bulunamadı");
        (await (await c.GetAsync("/api/vehicles?search=WZR")).ReadAsync<PagedResult<VehicleDto>>()).Items.Should().ContainSingle(v => v.Plate == "34 WZR 01");

        var drivers = ImportTests.Workbook(ImportService.Columns["drivers"],
            ["Sihirbaz Şoför Bir", "0532 111 22 33", Tckn, "CE", null, null, null, null],
            ["Sihirbaz Şoför İki", null, "12345678901", null, null, null, null, null],      // geçersiz TCKN
            ["SİHİRBAZ ŞOFÖR BİR", "0533 000 00 00", null, null, null, null, null, null]);   // büyük harfle aynı ad
        var dres = await (await c.PostAsync("/api/import/drivers?dryRun=false&skipInvalid=true", ImportTests.Form(drivers))).ReadAsync<ImportResult>();
        dres.Created.Should().Be(1);
        dres.Rows!.Single(r => r.Row == 3).Message.Should().Contain("TC kimlik");
        dres.Rows!.Single(r => r.Row == 4).Status.Should().Be("duplicate");
    }

    [Fact]
    public async Task Csv_with_semicolons_turkish_codepage_and_leading_zero_vkn_is_read()
    {
        var c = await factory.LoginAsync();
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var text = "Ünvan;VKN;Telefon;E-posta;Devir Bakiyesi\r\n" +
                   "\"İşçi Çiğ Köfte, Şti\";0123456782;05321112233;;\"1.500,25\"\r\n" +   // tırnaklı virgül, baştaki sıfırlı VKN, Türkçe tutar
                   "Ğ Ü Ö Nakliyat;;;\"info@guo.example\";2500.5\r\n";                       // noktalı ondalık
        // 0123456782 sağlama toplamı geçerli olmayabilir; asıl amaç: dosya okunur, sütun adları esnek ve baştaki sıfır korunur.
        var res = await (await c.PostAsync("/api/import/customers?dryRun=true&skipInvalid=true", Csv(text, Encoding.GetEncoding(1254)))).ReadAsync<ImportResult>();
        res.TotalRows.Should().Be(2);
        res.Rows!.Select(r => r.Label).Should().Equal("İşçi Çiğ Köfte, Şti", "Ğ Ü Ö Nakliyat");
        res.Rows![1].Status.Should().Be("warning");

        var utf8 = "Unvan,Vergi No,Tel\n" + "Csv Nakliyat," + Vkn1 + ",0532 111 22 33\n";
        var ok = await (await c.PostAsync("/api/import/customers?dryRun=false&skipInvalid=true", Csv(utf8))).ReadAsync<ImportResult>();
        ok.Created.Should().Be(1);
        var saved = (await (await c.GetAsync("/api/customers?search=Csv Nakliyat")).ReadAsync<PagedResult<CustomerDto>>()).Items.Single();
        saved.TaxNumber.Should().Be(Vkn1);
        saved.Phone.Should().Be("0532 111 22 33");
    }

    [Fact]
    public async Task Amounts_in_text_cells_keep_their_meaning()
    {
        var c = await factory.LoginAsync();
        var file = ImportTests.Workbook(CustomerHeaders.Take(8).ToArray(),
            ["Tutar Bir", null, null, null, null, null, null, "1234.5"],
            ["Tutar İki", null, null, null, null, null, null, "1.234"],
            ["Tutar Üç", null, null, null, null, null, null, "1.234,56"]);
        var res = await (await c.PostAsync("/api/import/customers?dryRun=false&skipInvalid=true", ImportTests.Form(file))).ReadAsync<ImportResult>();
        res.Created.Should().Be(3);
        var items = (await (await c.GetAsync("/api/customers?search=Tutar&sort=title")).ReadAsync<PagedResult<CustomerDto>>()).Items;
        items.ToDictionary(i => i.Title, i => i.Balance).Should().Equal(new Dictionary<string, decimal> { ["Tutar Bir"] = 1234.5m, ["Tutar İki"] = 1234m, ["Tutar Üç"] = 1234.56m });
    }

    [Fact]
    public async Task Limits_are_enforced_with_plain_messages()
    {
        var c = await factory.LoginAsync();
        var many = ImportTests.Workbook(["Ünvan"], Enumerable.Range(1, ImportService.MaxRows + 1).Select(i => (object?[])[$"Çok Satır {i}"]).ToArray());
        var res = await c.PostAsync("/api/import/customers?dryRun=true", ImportTests.Form(many));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).Should().Contain("5.000").And.Contain("parçalara bölün");

        var big = new byte[ImportService.MaxFileBytes + 10];
        Array.Fill(big, (byte)'a');
        var large = await c.PostAsync("/api/import/customers?dryRun=true", ImportTests.Form(big));
        large.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await large.Content.ReadAsStringAsync()).Should().Contain("5 MB");

        var empty = ImportTests.Workbook(["Ünvan"]);
        var none = await c.PostAsync("/api/import/customers?dryRun=true", ImportTests.Form(empty));
        none.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await none.Content.ReadAsStringAsync()).Should().Contain("aktarılacak satır yok");
    }

    [Fact]
    public async Task Templates_have_two_example_rows_for_the_four_main_lists_and_a_notes_sheet()
    {
        var c = await factory.LoginAsync();
        foreach (var e in new[] { "customers", "suppliers", "vehicles", "drivers" })
        {
            using var wb = new XLWorkbook(await (await c.GetAsync($"/api/import/{e}/template")).Content.ReadAsStreamAsync());
            wb.Worksheets.Select(w => w.Name).Should().Equal("Veri", "Açıklama");
            wb.Worksheet(1).LastRowUsed()!.RowNumber().Should().Be(3);
            wb.Worksheet(2).Cell(2, 1).GetString().Should().Contain("Zorunlu");
        }

        // Şablonun kendisi yüklenince iki örnek satır da geçerlidir (sahte VKN'ler sağlama toplamından geçer).
        foreach (var e in new[] { "customers", "suppliers", "vehicles", "drivers" })
        {
            var bytes = await (await c.GetAsync($"/api/import/{e}/template")).Content.ReadAsByteArrayAsync();
            var res = await (await c.PostAsync($"/api/import/{e}?dryRun=true", ImportTests.Form(bytes))).ReadAsync<ImportResult>();
            res.Errors.Should().BeEmpty($"{e} şablonu hatasız olmalı");
            res.TotalRows.Should().Be(2);
        }
    }

    [Fact]
    public async Task Header_variants_from_other_programs_are_understood()
    {
        var c = await factory.LoginAsync();
        var file = ImportTests.Workbook(["ÜNVAN", "VERGİ NO", "TEL", "EPOSTA"],
            ["Başlık Farkı Ltd", Vkn1, "0532 111 22 33", "a@b.com"]);
        var res = await (await c.PostAsync("/api/import/customers?dryRun=true", ImportTests.Form(file))).ReadAsync<ImportResult>();
        res.Errors.Should().BeEmpty();
        res.Rows.Should().ContainSingle(r => r.Status == "ok");
    }

    [Fact]
    public async Task Nine_digit_vkn_with_lost_leading_zero_is_restored()
    {
        ImportService.TaxNo("123456789").Should().Be("0123456789");
        ImportService.TaxNo(" 987 654 3217 ").Should().Be("9876543217");
        ImportService.TaxNo("12345678901").Should().Be("12345678901");
        ImportService.TaxNo("  ").Should().BeNull();
        await Task.CompletedTask;
    }

    [Fact]
    public async Task Public_branding_is_available_without_login_and_follows_settings()
    {
        var anon = factory.CreateClient();
        var branding = await (await anon.GetAsync("/api/public/branding")).ReadAsync<Dictionary<string, string?>>();
        branding["companyName"].Should().NotBeNullOrEmpty();

        var c = await factory.LoginAsync();
        var settings = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await c.PutJsonAsync("/api/settings", settings with { CompanyName = "Örnek Taşımacılık A.Ş." })).EnsureSuccessStatusCode();
        (await (await anon.GetAsync("/api/public/branding")).ReadAsync<Dictionary<string, string?>>())["companyName"].Should().Be("Örnek Taşımacılık A.Ş.");
    }
}

/// <summary>Örnek veri yalnız boş kurulumda yüklenir; bu yüzden kendi (boş) veritabanında çalışır.</summary>
public class OnboardingSampleDataTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Sample_data_can_be_loaded_once_on_an_empty_system_by_admin_only()
    {
        var c = await factory.LoginAsync();
        await (await c.PostJsonAsync("/api/users", new UserSaveRequest("Ops", "ops-ob@test.local", UserRole.Operations, true, "Sifre1234"))).ReadAsync<UserDto>();
        var ops = await factory.LoginAsync("ops-ob@test.local", "Sifre1234");
        (await ops.PostAsync("/api/onboarding/sample-data", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var settings = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        (await c.PutJsonAsync("/api/settings", settings with { TaxNumber = "9876543217", Address = "Kendi Adresim" })).EnsureSuccessStatusCode();

        (await c.PostAsync("/api/onboarding/sample-data", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var after = await (await c.GetAsync("/api/settings")).ReadAsync<CompanySettingsDto>();
        after.TaxNumber.Should().Be("9876543217");   // kurulumda girilen gerçek bilgiler demo ile ezilmez
        after.Address.Should().Be("Kendi Adresim");
        var dash = await (await c.GetAsync("/api/dashboard")).ReadAsync<DashboardDto>();
        dash.Setup.SampleData.Should().BeTrue();
        dash.Setup.CustomerCount.Should().BeGreaterThan(0);
        // İkinci kez yüklenmez.
        (await c.PostAsync("/api/onboarding/sample-data", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
