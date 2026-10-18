using Learner.Application.Contracts.Plans;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Plans;

internal sealed class PlansModule(IPlansDb db, TimeProvider clock) : IPlansModule
{
    public async Task<ActivePlan?> GetActivePlanAsync(Guid userId, CancellationToken ct)
    {
        var plan = await db.Plans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Status != PlanStatus.Archived, ct);
        return plan is null ? null : new ActivePlan(plan.Id, PhaseOf(plan), plan.GeneratedAt);
    }

    private PlanPhase PhaseOf(Plan plan) => plan.Status switch
    {
        PlanStatus.Failed => PlanPhase.Failed,
        PlanStatus.Queued or PlanStatus.Generating => PlanPhase.Generating,
        _ when plan.IsStale(clock.GetUtcNow()) => PlanPhase.Stale,
        _ => PlanPhase.Ready,
    };
}
