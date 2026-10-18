using Learner.Application.Dashboard;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

[Route("api/goal")]
public sealed class GoalController(GoalChangeService goals) : ApiControllerBase
{
    /// <summary>Archives the current goal, its skill check and plan, so the user can start again with Asta.</summary>
    [HttpPost("change")]
    public async Task<NoContentResult> Change(CancellationToken ct)
    {
        await goals.ChangeGoalAsync(ct);
        return NoContent();
    }
}
