using Learner.Application.Common;
using Learner.Application.Contracts.Learning;
using Learner.Application.Contracts.Plans;

namespace Learner.Application.Dashboard;

/// <summary>Which single state the dashboard shows (PRD FR-11).</summary>
public static class DashboardStates
{
    public const string NoGoal = "no_goal";
    public const string GoalInProgress = "goal_in_progress";
    public const string PlanGenerating = "plan_generating";
    public const string PlanReady = "plan_ready";
    public const string PlanStale = "plan_stale";
    public const string PlanFailed = "plan_failed";
}

public sealed record DashboardResponse(string State, ActiveGoal? Goal, ActivePlan? Plan);

/// <summary>Composes the dashboard from module contracts only; it owns no data of its own.</summary>
public sealed class DashboardService(ILearningModule learning, IPlansModule plans, ICurrentUser currentUser)
{
    public async Task<DashboardResponse> GetAsync(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var goal = await learning.GetActiveGoalAsync(userId, ct);
        var plan = await plans.GetActivePlanAsync(userId, ct);
        return new DashboardResponse(StateFor(goal, plan), goal, plan);
    }

    private static string StateFor(ActiveGoal? goal, ActivePlan? plan) => (goal, plan) switch
    {
        (null, _) => DashboardStates.NoGoal,
        (_, null) => DashboardStates.GoalInProgress,
        (_, { Phase: PlanPhase.Failed }) => DashboardStates.PlanFailed,
        (_, { Phase: PlanPhase.Generating }) => DashboardStates.PlanGenerating,
        (_, { Phase: PlanPhase.Stale }) => DashboardStates.PlanStale,
        _ => DashboardStates.PlanReady,
    };
}
