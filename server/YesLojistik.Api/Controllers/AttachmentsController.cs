using Microsoft.AspNetCore.Mvc;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api")]
public class AttachmentsController(AttachmentService attachments) : ControllerBase
{
    [HttpGet("trips/{tripId:int}/attachments")]
    public Task<List<AttachmentDto>> List(int tripId, CancellationToken ct) => attachments.ListAsync(tripId, ct);

    [HttpPost("trips/{tripId:int}/attachments")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<AttachmentDto> Upload(int tripId, IFormFile file, [FromForm] AttachmentKind kind = AttachmentKind.Document,
        [FromForm] string? note = null, CancellationToken ct = default)
    {
        await using var stream = file.OpenReadStream();
        return await attachments.UploadAsync(tripId, stream, file.Length, file.FileName, kind, note, ct);
    }

    [HttpGet("attachments/{id:int}")]
    public async Task<IActionResult> Download(int id, [FromQuery] bool download, CancellationToken ct)
    {
        var (content, type, name) = await attachments.OpenAsync(id, ct);
        return download ? File(content, type, name) : File(content, type);
    }

    [HttpDelete("attachments/{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await attachments.DeleteAsync(id, ct);
        return NoContent();
    }
}
