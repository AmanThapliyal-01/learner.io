using System.Text.Json;
using Learner.Application.Contracts.Profiles;

namespace Learner.Application.Learning.SkillCheck;

// Shapes exchanged with the agents service (serialised as snake_case by the client).

public sealed record AgentRatedSkill(string Skill, int SelfRating);

public sealed record GenerateAssessmentRequest(JsonElement Goal, ProfileSnapshot? Profile, IReadOnlyList<AgentRatedSkill> Skills);

public sealed record AgentSkillTarget(string Skill, int TargetLevel);

public sealed record AgentQuestion(string Skill, string Kind, string Prompt, IReadOnlyList<string>? Options, string AnswerKey);

public sealed record GenerateAssessmentResponse(IReadOnlyList<AgentSkillTarget> Targets, IReadOnlyList<AgentQuestion> Questions);

public sealed record AgentAnsweredQuestion(
    string Id, string Skill, string Kind, string Prompt, IReadOnlyList<string>? Options, string AnswerKey, string? Answer);

public sealed record GradeAssessmentRequest(JsonElement Goal, IReadOnlyList<AgentRatedSkill> Skills, IReadOnlyList<AgentAnsweredQuestion> Questions);

public sealed record AgentQuestionGrade(string Id, double Score, string Feedback);

public sealed record AgentSkillResult(
    string Skill, int SelfRating, int AssessedLevel, double? Score, IReadOnlyList<string> Strengths, IReadOnlyList<string> Gaps, string Summary);

public sealed record GradeAssessmentResponse(IReadOnlyList<AgentQuestionGrade> Grades, IReadOnlyList<AgentSkillResult> Skills);

/// <summary>Builds and grades the skill check in the Python agents service.</summary>
public interface IAssessmentAgent
{
    /// <summary>Throws <see cref="Common.ServiceUnavailableException"/> if the agents service is busy or down.</summary>
    Task<GenerateAssessmentResponse> GenerateAsync(GenerateAssessmentRequest request, CancellationToken ct);

    Task<GradeAssessmentResponse> GradeAsync(GradeAssessmentRequest request, CancellationToken ct);
}
