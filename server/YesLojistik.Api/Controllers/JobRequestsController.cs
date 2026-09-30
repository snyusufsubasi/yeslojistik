using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/job-requests")]
public class JobRequestsController(JobRequestService requests) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<JobRequestDto>> List([FromQuery] JobRequestQuery q, CancellationToken ct) => requests.ListAsync(q, ct);

    [HttpGet("{id:int}")]
    public Task<JobRequestDto> Get(int id, CancellationToken ct) => requests.GetAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost]
    public Task<JobRequestDto> Create(JobRequestSaveRequest req, CancellationToken ct) => requests.CreateAsync(req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPut("{id:int}")]
    public Task<JobRequestDto> Update(int id, JobRequestSaveRequest req, CancellationToken ct) => requests.UpdateAsync(id, req, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpPost("{id:int}/cancel")]
    public Task<JobRequestDto> Cancel(int id, CancellationToken ct) => requests.CancelAsync(id, ct);

    [Authorize(Policy = Policies.Operations)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await requests.DeleteAsync(id, ct);
        return NoContent();
    }
}
