using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using YesLojistik.Core.Abstractions;

namespace YesLojistik.Api.Auth;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? Id => int.TryParse(Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    public string? Name => Principal?.Identity?.IsAuthenticated == true ? Principal.FindFirstValue(ClaimTypes.Name) : null;
}
