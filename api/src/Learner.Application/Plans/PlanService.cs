using System.Text.Json;
using Learner.Application.Common;
using Learner.Application.Contracts.Learning;
using Learner.Application.Contracts.Plans;
using Learner.Application.Contracts.Profiles;
using Learner.Domain.Common;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Plans;

public sealed record PlanResponse(
    Guid Id,
    PlanPhase Phase,
    DateTimeOffset? GeneratedAt,
    DateTimeOffset? StaleAt,
    JsonElement? Content,
    string? Error,
    PlanProgress? Progress);

/// <summary>Queues plan generation for the agents worker and serves the result.</summary>
public sealed class PlanService(
    IPlansDb db,
    ILearningModule learning,
    IProfilesModule profiles,
    ICurrentUser currentUser,
    TimeProvider clock)
{
    private static readonly JsonSerializerOptions SnakeCase = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    /// <summary>Builds the first plan after the skill check.</summary>
    public async Task<PlanResponse> RequestPlanAsync(CancellationToken ct)
    {
        var current = await ActivePlanQuery().FirstOrDefaultAsync(ct);
        if (current is not null && current.Status != PlanStatus.Failed)
        {
            throw new ConflictException("You already have a plan. Regenerate it once it's out of date.");
        }
        return await QueueAsync(current, ct);
    }

    /// <summary>Rebuilds a plan that's stale (30+ days old) or failed, from the same goal and latest check.</summary>
    public async Task<PlanResponse> RegenerateAsync(CancellationToken ct)
    {
        var current = await ActivePlanQuery().FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("There's no plan to regenerate yet.");
        if (current.Status != PlanStatus.Failed && !current.IsStale(clock.GetUtcNow()))
        {
            throw new ConflictException("Your plan is still fresh. You can regenerate it once it's a month old.");
        }
        return await QueueAsync(current, ct);
    }

    public async Task<PlanResponse> GetCurrentAsync(CancellationToken ct)
    {
        var plan = await ActivePlanQuery().AsNoTracking().FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("You don't have a plan yet.");
        return ToResponse(plan);
    }

    private async Task<PlanResponse> QueueAsync(Plan? replacing, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var input = await learning.GetPlanningInputAsync(userId, ct)
            ?? throw new ConflictException("Finish the skill check first: your plan is built from it.");

        if (replacing is not null)
        {
            replacing.Archive();
            await db.SaveChangesAsync(ct); // frees the one-active-plan slot before the new plan is added
        }

        var plan = new Plan { UserId = userId, GoalId = input.GoalId, Status = PlanStatus.Queued };
        db.Plans.Add(plan);
        // The payload is a full snapshot, so the worker never reads other modules' tables.
        var payload = new
        {
            plan_id = plan.Id,
            goal = input.GoalSummary,
            profile = await profiles.GetSnapshotAsync(userId, ct),
            skills = input.Skills,
        };
        db.Jobs.Add(new Job { Type = PlanJobTypes.GeneratePlan, Payload = JsonSerializer.Serialize(payload, SnakeCase) });
        await db.SaveChangesAsync(ct);
        await learning.MarkGoalPlannedAsync(input.GoalId, ct);
        return ToResponse(plan);
    }

    private IQueryable<Plan> ActivePlanQuery()
    {
        var userId = currentUser.UserId;
        return db.Plans.Where(p => p.UserId == userId && p.Status != PlanStatus.Archived);
    }

    private PlanResponse ToResponse(Plan plan)
    {
        var phase = PlansModule.PhaseOf(plan, clock.GetUtcNow());
        return new(
            plan.Id,
            phase,
            plan.GeneratedAt,
            plan.GeneratedAt + Plan.StaleAfter,
            plan.Content is null ? null : JsonDocument.Parse(plan.Content).RootElement.Clone(),
            plan.Error,
            phase == PlanPhase.Generating ? plan.Progress : null);
    }
}
