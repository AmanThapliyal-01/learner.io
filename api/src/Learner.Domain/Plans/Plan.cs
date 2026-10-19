using Learner.Domain.Common;

namespace Learner.Domain.Plans;

// Stored as a string in Postgres so the Python agents worker can read and write it.
public enum PlanStatus { Queued, Generating, Ready, Failed, Archived }

/// <summary>Anbu's planner steps, in the order they run.</summary>
public enum PlanStep { Reading, Outlining, Detailing, Assembling }

/// <summary>
/// The last planner step the agents worker finished, so the UI can tick only real work (PRD FR-24).
/// Done and Total count detailed phases; Total is 0 until the outline exists.
/// </summary>
public sealed record PlanProgress(PlanStep Step, int Done, int Total);

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

    /// <summary>Written by the agents worker while generating; cleared once the plan is ready, failed or archived.</summary>
    public PlanProgress? Progress { get; set; }

    public void Archive()
    {
        Status = PlanStatus.Archived;
        Progress = null;
    }

    public bool IsStale(DateTimeOffset now) =>
        Status == PlanStatus.Ready && GeneratedAt is { } generated && now - generated >= StaleAfter;
}
