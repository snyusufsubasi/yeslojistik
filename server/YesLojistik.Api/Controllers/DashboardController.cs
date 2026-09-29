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

    /// <summary>Önümüzdeki 4 hafta beklenen tahsilat ve ödemeler.</summary>
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = YesLojistik.Api.Auth.Policies.Accounting)]
    [HttpGet("cash-flow")]
    public Task<CashFlowDto> CashFlow([FromServices] CashService cash, CancellationToken ct) => cash.CashFlowAsync(ct);
}
