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
        return plan is null ? null : new ActivePlan(plan.Id, PhaseOf(plan, clock.GetUtcNow()), plan.GeneratedAt);
    }

    public async Task ArchiveActivePlanAsync(Guid userId, CancellationToken ct)
    {
        // The worker never writes into an archived plan, so a generation already in flight is harmlessly discarded.
        await db.Plans
            .Where(p => p.UserId == userId && p.Status != PlanStatus.Archived)
            .ExecuteUpdateAsync(set => set.SetProperty(p => p.Status, PlanStatus.Archived), ct);
    }

    internal static PlanPhase PhaseOf(Plan plan, DateTimeOffset now) => plan.Status switch
    {
        PlanStatus.Failed => PlanPhase.Failed,
        PlanStatus.Queued or PlanStatus.Generating => PlanPhase.Generating,
        _ when plan.IsStale(now) => PlanPhase.Stale,
        _ => PlanPhase.Ready,
    };
}
