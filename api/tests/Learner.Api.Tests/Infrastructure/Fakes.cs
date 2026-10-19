using System.Runtime.CompilerServices;
using System.Text.Json;
using Learner.Application.Learning.Asta;
using Learner.Application.Learning.SkillCheck;

namespace Learner.Api.Tests.Infrastructure;

/// <summary>Stands in for Asta in the agents service. Set <see cref="Reply"/> to script the next turns.</summary>
public sealed class FakeAstaAgent : IAstaAgent
{
    public Func<AstaAgentRequest, IReadOnlyList<AstaAgentEvent>> Reply { get; set; } = _ => Says("Hi! What would you like to learn?");

    public List<AstaAgentRequest> Requests { get; } = [];

    public async IAsyncEnumerable<AstaAgentEvent> StreamAsync(AstaAgentRequest request, [EnumeratorCancellation] CancellationToken ct)
    {
        Requests.Add(request);
        foreach (var evt in Reply(request))
        {
            await Task.Yield();
            yield return evt;
        }
    }

    public static IReadOnlyList<AstaAgentEvent> Says(params string[] tokens) =>
        [.. tokens.Select(t => new AstaAgentEvent(AstaAgentEvent.Token, Text: t)), new AstaAgentEvent(AstaAgentEvent.Done)];

    public static IReadOnlyList<AstaAgentEvent> ShowsCard(JsonElement summary) =>
    [
        new AstaAgentEvent(AstaAgentEvent.GoalSummaryType, Text: "Here's your goal.", GoalSummary: summary),
        new AstaAgentEvent(AstaAgentEvent.Done),
    ];

    public static IReadOnlyList<AstaAgentEvent> Fails() =>
        [new AstaAgentEvent(AstaAgentEvent.Error, Text: "Asta is unavailable right now.", Code: "agent_unavailable")];
}

/// <summary>Stands in for skill-check generation and grading. Every question's correct answer is option 1.</summary>
public sealed class FakeAssessmentAgent : IAssessmentAgent
{
    public const string CorrectOption = "1";

    public List<GradeAssessmentRequest> GradeRequests { get; } = [];

    public Task<GenerateAssessmentResponse> GenerateAsync(GenerateAssessmentRequest request, CancellationToken ct)
    {
        var tested = request.Skills.Where(s => s.SelfRating > 1).ToList();
        var questions = tested.SelectMany(s => new[]
        {
            new AgentQuestion(s.Skill, "multiple_choice", $"Which is right about {s.Skill}?", ["a", "b", "c", "d"], CorrectOption),
            new AgentQuestion(s.Skill, "multiple_choice", $"Which else is right about {s.Skill}?", ["a", "b", "c", "d"], CorrectOption),
            new AgentQuestion(s.Skill, "short_answer", $"Explain {s.Skill}.", null, "Mentions the key idea"),
        }).ToList();
        var targets = request.Skills.Select(s => new AgentSkillTarget(s.Skill, 4)).ToList();
        return Task.FromResult(new GenerateAssessmentResponse(targets, questions));
    }

    /// <summary>Exact for multiple choice; any non-empty short answer gets full marks.</summary>
    public Task<GradeAssessmentResponse> GradeAsync(GradeAssessmentRequest request, CancellationToken ct)
    {
        GradeRequests.Add(request);
        var grades = request.Questions.Select(q => new AgentQuestionGrade(
            q.Id,
            q.Kind == "multiple_choice" ? (q.Answer == q.AnswerKey ? 1 : 0) : (string.IsNullOrWhiteSpace(q.Answer) ? 0 : 1),
            "ok")).ToList();
        var byId = grades.ToDictionary(g => g.Id);
        var skills = request.Skills.Select(s =>
        {
            var scores = request.Questions.Where(q => q.Skill == s.Skill).Select(q => byId[q.Id].Score).ToList();
            double? score = scores.Count == 0 ? null : scores.Average();
            var level = score is null ? 1 : score >= 0.75 ? s.SelfRating : Math.Max(1, s.SelfRating - 1);
            return new AgentSkillResult(s.Skill, s.SelfRating, level, score, ["A strength"], ["A gap"], "Summary.");
        }).ToList();
        return Task.FromResult(new GradeAssessmentResponse(grades, skills));
    }
}
