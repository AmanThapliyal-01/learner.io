using Learner.Domain.Common;

namespace Learner.Domain.Entities;

public class SkillRating : Entity
{
    public const int MinRating = 1;
    public const int MaxRating = 5;

    public Guid GoalId { get; set; }
    public string Skill { get; set; } = string.Empty;
    public int SelfRating { get; set; }
}
