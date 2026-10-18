using Learner.Domain.Common;
using Learner.Domain.Enums;

namespace Learner.Domain.Entities;

/// <summary>What the user wants to learn. A user has at most one non-archived goal.</summary>
public class Goal : Entity
{
    public Guid UserId { get; set; }
    public GoalType? Type { get; set; }
    public string? Title { get; set; }

    /// <summary>Goal summary confirmed in chat with Asta (JSON).</summary>
    public string? Summary { get; set; }
    public int? HoursPerWeek { get; set; }
    public string? Timeline { get; set; }

    /// <summary>Learning style and budget preferences (JSON).</summary>
    public string? Preferences { get; set; }
    public GoalStatus Status { get; set; } = GoalStatus.Chatting;
    public DateTimeOffset? ArchivedAt { get; set; }

    public List<ChatMessage> Messages { get; set; } = [];
    public List<SkillRating> SkillRatings { get; set; } = [];
    public List<Assessment> Assessments { get; set; } = [];

    public void Archive(DateTimeOffset now)
    {
        Status = GoalStatus.Archived;
        ArchivedAt = now;
    }
}
