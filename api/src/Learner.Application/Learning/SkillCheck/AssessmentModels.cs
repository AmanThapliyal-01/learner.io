using System.ComponentModel.DataAnnotations;
using Learner.Application.Contracts.Learning;

namespace Learner.Application.Learning.SkillCheck;

public sealed record SkillToRate(string Skill, int? SelfRating);

public sealed record RatingFormResponse(string GoalTitle, GoalStage Stage, IReadOnlyList<SkillToRate> Skills);

public sealed record SkillRatingInput([Required, MaxLength(120)] string Skill, [Range(1, 5)] int Rating);

public sealed record RateSkillsRequest([Required, MinLength(1), MaxLength(6)] IReadOnlyList<SkillRatingInput> Ratings);

/// <summary>A question as the browser sees it: never the answer key.</summary>
public sealed record AssessmentQuestionResponse(Guid Id, string Skill, string Kind, string Prompt, IReadOnlyList<string>? Options);

public sealed record AssessmentResponse(Guid Id, string Status, IReadOnlyList<AssessmentQuestionResponse> Questions, IReadOnlyList<string> SkippedSkills);

public sealed record AnswerInput(Guid QuestionId, [MaxLength(4000)] string? Answer);

public sealed record SubmitAnswersRequest([Required] IReadOnlyList<AnswerInput> Answers);

public sealed record SkillResultResponse(
    string Skill,
    int SelfRating,
    int AssessedLevel,
    int TargetLevel,
    double? Score,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Gaps,
    string Summary);

public sealed record QuestionFeedbackResponse(Guid Id, string Skill, string Prompt, double Score, string Feedback);

public sealed record AssessmentResultsResponse(
    Guid AssessmentId, string GoalTitle, IReadOnlyList<SkillResultResponse> Skills, IReadOnlyList<QuestionFeedbackResponse> Questions);
