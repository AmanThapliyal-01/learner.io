using Learner.Domain.Common;
using Learner.Domain.Enums;

namespace Learner.Domain.Entities;

/// <summary>The generated learning plan. A user has at most one non-archived plan.</summary>
public class Plan : Entity
{
    public static readonly TimeSpan StaleAfter = TimeSpan.FromDays(30);

    public Guid UserId { get; set; }
    public Guid GoalId { get; set; }
    public PlanStatus Status { get; set; } = PlanStatus.Queued;

    /// <summary>Plan document produced by the planner agent (JSON).</summary>
    public string? Content { get; set; }
    public DateTimeOffset? GeneratedAt { get; set; }
    public string? Error { get; set; }

    public bool IsStale(DateTimeOffset now) =>
        Status == PlanStatus.Ready && GeneratedAt is { } generated && now - generated >= StaleAfter;
}
