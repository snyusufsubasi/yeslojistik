using Microsoft.AspNetCore.Mvc;

namespace YesLojistik.Api.Infrastructure;

public static class FileResults
{
    public const string Xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static FileContentResult Excel(byte[] content, string name) =>
        new(content, Xlsx) { FileDownloadName = $"{name}-{DateTime.Now:yyyyMMdd}.xlsx" };
}
