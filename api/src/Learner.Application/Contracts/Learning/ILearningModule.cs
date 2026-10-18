using System.Text.Json;

namespace Learner.Application.Contracts.Learning;

/// <summary>Where the user is in setting up their goal.</summary>
public enum GoalStage { Chatting, Rating, Assessing, Confirmed }

public sealed record ActiveGoal(Guid Id, string? Title, GoalStage Stage);

public sealed record AssessedSkill(
    string Skill, int SelfRating, int AssessedLevel, int TargetLevel, IReadOnlyList<string> Strengths, IReadOnlyList<string> Gaps);

/// <summary>Everything a plan is built from: the confirmed goal (as JSON) and the assessed skills.</summary>
public sealed record PlanningInput(Guid GoalId, JsonElement GoalSummary, IReadOnlyList<AssessedSkill> Skills);

/// <summary>Public API of the Learning module (goals, Asta chat, assessment).</summary>
public interface ILearningModule
{
    Task<ActiveGoal?> GetActiveGoalAsync(Guid userId, CancellationToken ct);

    /// <summary>Null until the user has finished a skill check for their active goal.</summary>
    Task<PlanningInput?> GetPlanningInputAsync(Guid userId, CancellationToken ct);

    /// <summary>Marks the goal as handed to the planner.</summary>
    Task MarkGoalPlannedAsync(Guid goalId, CancellationToken ct);
}
