using ClosedXML.Excel;

namespace YesLojistik.Infrastructure.Services;

public record ExcelColumn<T>(string Header, Func<T, object?> Value, string? Format = null);

public static class ExcelExporter
{
    public const string MoneyFormat = "#,##0.00 \"TL\"";
    public const string DateFormat = "dd.mm.yyyy";

    public static byte[] Export<T>(string sheetName, IEnumerable<T> rows, params ExcelColumn<T>[] columns) =>
        new ExcelWorkbookBuilder().AddSheet(sheetName, rows, columns).Build();

    /// <summary>Listenin altına kalın "Toplam" satırı (filtrenin tamamının toplamı) ekleyerek dışa aktarır.</summary>
    public static byte[] ExportWithTotal<T>(string sheetName, IReadOnlyCollection<T> rows, T total, params ExcelColumn<T>[] columns)
    {
        using var wb = new ExcelWorkbookBuilder();
        return wb.AddSheet(sheetName, rows, rows.Count == 0 ? [] : [total], [], columns).Build();
    }
}

/// <summary>Birden fazla sayfalı Excel (ör. aylık muhasebe aktarımı: satışlar, tahsilatlar, giderler...).</summary>
public sealed class ExcelWorkbookBuilder : IDisposable
{
    private readonly XLWorkbook _wb = new();

    public ExcelWorkbookBuilder AddSheet<T>(string sheetName, IEnumerable<T> rows, params ExcelColumn<T>[] columns) =>
        AddSheet(sheetName, rows, [], [], columns);

    /// <param name="footer">Tablonun altına kalın yazılan satırlar (toplamlar); süzgece girmez.</param>
    /// <param name="preface">Tablonun üstüne yazılan açıklama satırları (başlık, dönem, cari bilgisi).</param>
    public ExcelWorkbookBuilder AddSheet<T>(string sheetName, IEnumerable<T> rows, IEnumerable<T> footer, IReadOnlyList<string> preface,
        params ExcelColumn<T>[] columns)
    {
        var ws = _wb.Worksheets.Add(sheetName);
        for (var i = 0; i < preface.Count; i++)
        {
            var cell = ws.Cell(i + 1, 1);
            cell.Value = preface[i];
            if (i == 0) { cell.Style.Font.Bold = true; cell.Style.Font.FontSize = 13; }
        }
        var headerRow = preface.Count == 0 ? 1 : preface.Count + 2;
        for (var c = 0; c < columns.Length; c++)
        {
            var cell = ws.Cell(headerRow, c + 1);
            cell.Value = columns[c].Header;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A55");
        }

        var r = headerRow + 1;
        foreach (var row in rows) WriteRow(ws, r++, row, columns);
        var lastDataRow = r - 1;
        foreach (var row in footer)
        {
            WriteRow(ws, r, row, columns);
            var range = ws.Range(r, 1, r, columns.Length);
            range.Style.Font.Bold = true;
            range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            range.Style.Border.TopBorder = XLBorderStyleValues.Thin;
            r++;
        }

        ws.SheetView.FreezeRows(headerRow);
        ws.Range(headerRow, 1, Math.Max(headerRow, lastDataRow), columns.Length).SetAutoFilter();
        ws.Columns(1, columns.Length).AdjustToContents(headerRow, Math.Min(r, headerRow + 200));
        return this;
    }

    private static void WriteRow<T>(IXLWorksheet ws, int r, T row, ExcelColumn<T>[] columns)
    {
        for (var c = 0; c < columns.Length; c++)
        {
            var cell = ws.Cell(r, c + 1);
            cell.Value = columns[c].Value(row) switch
            {
                null => Blank.Value,
                decimal d => d,
                int i => i,
                DateOnly d => d.ToDateTime(TimeOnly.MinValue),
                DateTime dt => dt,
                var o => o.ToString(),
            };
            if (columns[c].Format is { } f) cell.Style.NumberFormat.Format = f;
        }
    }

    public byte[] Build()
    {
        using var ms = new MemoryStream();
        _wb.SaveAs(ms);
        return ms.ToArray();
    }

    public void Dispose() => _wb.Dispose();
}
