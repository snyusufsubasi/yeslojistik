using Microsoft.AspNetCore.Mvc;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(DashboardService dashboard, AlertService alerts) : ControllerBase
{
    [HttpGet]
    public Task<DashboardDto> Get(CancellationToken ct) => dashboard.GetAsync(ct);

    [HttpGet("alerts")]
    public Task<List<AlertDto>> Alerts(CancellationToken ct) => alerts.GetAsync(ct);
}
