using Learner.Domain.Common;

namespace Learner.Domain.Learning;

public class SkillRating : Entity
{
    public const int MinRating = 1;
    public const int MaxRating = 5;

    public Guid GoalId { get; set; }
    public string Skill { get; set; } = string.Empty;
    public int SelfRating { get; set; }

    /// <summary>Level the goal needs in this skill (1-5), set when the check is generated.</summary>
    public int? TargetLevel { get; set; }

    /// <summary>Level the check showed (1-5), set when it's graded.</summary>
    public int? AssessedLevel { get; set; }
}
