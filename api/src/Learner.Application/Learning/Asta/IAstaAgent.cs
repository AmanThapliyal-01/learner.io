using System.Text.Json;
using Learner.Application.Contracts.Profiles;

namespace Learner.Application.Learning.Asta;

/// <summary>One prior turn sent to Asta. GoalSummary is the card Asta proposed in that turn, if any.</summary>
public sealed record AstaTurn(string Role, string Content, JsonElement? GoalSummary);

public sealed record AstaAgentRequest(ProfileSnapshot? Profile, IReadOnlyList<AstaTurn> Messages);

/// <summary>An event streamed by the agents service: progress, token, goal_summary, done or error.</summary>
public sealed record AstaAgentEvent(
    string Type,
    string? Text = null,
    JsonElement? GoalSummary = null,
    JsonElement? Progress = null,
    string? Model = null,
    string? Code = null,
    DateTimeOffset? RetryAt = null)
{
    public const string ProgressType = "progress";
    public const string Token = "token";
    public const string GoalSummaryType = "goal_summary";
    public const string Done = "done";
    public const string Error = "error";
}

/// <summary>The Asta chat agent in the Python agents service.</summary>
public interface IAstaAgent
{
    /// <summary>Streams one reply. Never throws for agent or network failures; it yields an error event instead.</summary>
    IAsyncEnumerable<AstaAgentEvent> StreamAsync(AstaAgentRequest request, CancellationToken ct);
}
