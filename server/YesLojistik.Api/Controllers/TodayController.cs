using Microsoft.AspNetCore.Mvc;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>"Bugün" ekranı: personelin güne başladığı istisna listesi (tek istek). Tahsilat kartı yalnız yönetici ve muhasebeye.</summary>
[ApiController]
[Route("api/today")]
public class TodayController(TodayService today) : ControllerBase
{
    [HttpGet]
    public Task<TodayDto> Get(CancellationToken ct) =>
        today.GetAsync(User.IsInRole(nameof(UserRole.Admin)) || User.IsInRole(nameof(UserRole.Accounting)), ct);
}
