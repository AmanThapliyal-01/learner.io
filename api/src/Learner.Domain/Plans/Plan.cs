using Learner.Domain.Common;

namespace Learner.Domain.Plans;

// Stored as a string in Postgres so the Python agents worker can read and write it.
public enum PlanStatus { Queued, Generating, Ready, Failed, Archived }

public static class PlanJobTypes
{
    public const string GeneratePlan = "generate_plan";
}

/// <summary>The generated learning plan. A user has at most one non-archived plan.</summary>
public class Plan : Entity
{
    public static readonly TimeSpan StaleAfter = TimeSpan.FromDays(30);

    public Guid UserId { get; set; }

    /// <summary>The Learning module's goal this plan was built for (referenced by id only).</summary>
    public Guid GoalId { get; set; }
    public PlanStatus Status { get; set; } = PlanStatus.Queued;

    /// <summary>Plan document produced by the planner agent (JSON).</summary>
    public string? Content { get; set; }
    public DateTimeOffset? GeneratedAt { get; set; }
    public string? Error { get; set; }

    public bool IsStale(DateTimeOffset now) =>
        Status == PlanStatus.Ready && GeneratedAt is { } generated && now - generated >= StaleAfter;
}
