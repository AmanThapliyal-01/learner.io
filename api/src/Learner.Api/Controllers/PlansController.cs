using Learner.Application.Plans;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

[Route("api/plans")]
public sealed class PlansController(PlanService plans) : ApiControllerBase
{
    /// <summary>Queues the first plan; the agents worker builds it in the background.</summary>
    [HttpPost]
    public Task<PlanResponse> Create(CancellationToken ct) => plans.RequestPlanAsync(ct);

    [HttpGet("current")]
    public Task<PlanResponse> Current(CancellationToken ct) => plans.GetCurrentAsync(ct);

    /// <summary>Rebuilds a stale (30+ days) or failed plan.</summary>
    [HttpPost("regenerate")]
    public Task<PlanResponse> Regenerate(CancellationToken ct) => plans.RegenerateAsync(ct);
}
