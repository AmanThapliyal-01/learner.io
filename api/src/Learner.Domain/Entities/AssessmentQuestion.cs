using Learner.Domain.Common;
using Learner.Domain.Enums;

namespace Learner.Domain.Entities;

public class AssessmentQuestion : Entity
{
    public Guid AssessmentId { get; set; }
    public string Skill { get; set; } = string.Empty;
    public QuestionKind Kind { get; set; }
    public string Prompt { get; set; } = string.Empty;

    /// <summary>Answer choices for multiple-choice questions (JSON array).</summary>
    public string? Options { get; set; }

    /// <summary>Correct option or grading rubric. Server-side only; never sent to the browser.</summary>
    public string AnswerKey { get; set; } = string.Empty;
    public string? UserAnswer { get; set; }
    public decimal? Score { get; set; }
    public string? Feedback { get; set; }
    public int Order { get; set; }
}
