namespace Learner.Application.Contracts.Plans;

/// <summary>What the user can do with their plan right now.</summary>
public enum PlanPhase { Generating, Ready, Stale, Failed }

public sealed record ActivePlan(Guid Id, PlanPhase Phase, DateTimeOffset? GeneratedAt);

/// <summary>Public API of the Plans module.</summary>
public interface IPlansModule
{
    Task<ActivePlan?> GetActivePlanAsync(Guid userId, CancellationToken ct);

    /// <summary>Archives the active plan, if any. A plan still being generated is never shown afterwards.</summary>
    Task ArchiveActivePlanAsync(Guid userId, CancellationToken ct);
}
