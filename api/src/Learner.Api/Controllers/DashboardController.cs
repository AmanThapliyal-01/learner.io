using Learner.Application.Dashboard;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

[Route("api/dashboard")]
public sealed class DashboardController(DashboardService dashboard) : ApiControllerBase
{
    [HttpGet]
    public Task<DashboardResponse> Get(CancellationToken ct) => dashboard.GetAsync(ct);
}
