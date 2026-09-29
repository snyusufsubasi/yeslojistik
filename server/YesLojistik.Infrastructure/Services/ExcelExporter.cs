using ClosedXML.Excel;

namespace YesLojistik.Infrastructure.Services;

public record ExcelColumn<T>(string Header, Func<T, object?> Value, string? Format = null);

public static class ExcelExporter
{
    public const string MoneyFormat = "#,##0.00 \"TL\"";
    public const string DateFormat = "dd.mm.yyyy";

    public static byte[] Export<T>(string sheetName, IEnumerable<T> rows, params ExcelColumn<T>[] columns) =>
        new ExcelWorkbookBuilder().AddSheet(sheetName, rows, columns).Build();
}

/// <summary>Birden fazla sayfalı Excel (ör. aylık muhasebe aktarımı: satışlar, tahsilatlar, giderler...).</summary>
public sealed class ExcelWorkbookBuilder : IDisposable
{
    private readonly XLWorkbook _wb = new();

    public ExcelWorkbookBuilder AddSheet<T>(string sheetName, IEnumerable<T> rows, params ExcelColumn<T>[] columns)
    {
        var ws = _wb.Worksheets.Add(sheetName);
        for (var c = 0; c < columns.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = columns[c].Header;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A55");
        }

        var r = 2;
        foreach (var row in rows)
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
            r++;
        }

        ws.SheetView.FreezeRows(1);
        ws.Range(1, 1, Math.Max(1, r - 1), columns.Length).SetAutoFilter();
        ws.Columns().AdjustToContents(1, Math.Min(r, 200));
        return this;
    }

    public byte[] Build()
    {
        using var ms = new MemoryStream();
        _wb.SaveAs(ms);
        return ms.ToArray();
    }

    public void Dispose() => _wb.Dispose();
}
