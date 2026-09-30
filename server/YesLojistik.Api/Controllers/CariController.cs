using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YesLojistik.Api.Auth;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Api.Controllers;

/// <summary>Cari tabloları: bütün müşterilerin / tedarikçilerin bakiyesi tek listede.</summary>
[ApiController]
[Route("api/cari")]
[Authorize(Policy = Policies.Accounting)]
public class CariController(CariService cari) : ControllerBase
{
    [HttpGet("customers")]
    public Task<List<CustomerCariRow>> Customers(CancellationToken ct) => cari.CustomersAsync(ct);

    [HttpGet("suppliers")]
    public Task<List<SupplierCariRow>> Suppliers(CancellationToken ct) => cari.SuppliersAsync(ct);
}
