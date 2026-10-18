using Learner.Domain.Common;

namespace Learner.Domain.Learning;

public class Assessment : Entity
{
    public Guid GoalId { get; set; }
    public AssessmentStatus Status { get; set; } = AssessmentStatus.Pending;

    /// <summary>Per-skill assessed level, strengths and gaps (JSON).</summary>
    public string? Results { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public List<AssessmentQuestion> Questions { get; set; } = [];
}
