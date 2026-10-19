using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using Learner.Application.Contracts.Learning;

namespace Learner.Application.Learning.Asta;

public sealed record SendMessageRequest([Required, MinLength(1), MaxLength(4000)] string Content);

public sealed record ChatMessageResponse(Guid Id, string Role, string Content, JsonElement? GoalSummary, DateTimeOffset CreatedAt);

public sealed record ConversationResponse(Guid? GoalId, GoalStage? Stage, IReadOnlyList<ChatMessageResponse> Messages);

/// <summary>What the browser receives over SSE for one Asta turn.</summary>
public sealed record AstaStreamEvent(
    string Type,
    string? Text = null,
    JsonElement? GoalSummary = null,
    string? Code = null,
    DateTimeOffset? RetryAt = null,
    Guid? MessageId = null);

/// <summary>An accepted user message, ready for Asta to answer.</summary>
public sealed record AstaTurnContext(Guid GoalId, Guid UserMessageId, AstaAgentRequest AgentRequest);

/// <summary>The goal summary card as the agents service produces it (snake_case JSON).</summary>
public sealed record GoalSummaryDto(
    [property: JsonPropertyName("goal_type")] string GoalType,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("target_outcome")] string TargetOutcome,
    [property: JsonPropertyName("motivation")] string Motivation,
    [property: JsonPropertyName("hours_per_week")] int HoursPerWeek,
    [property: JsonPropertyName("timeline")] string? Timeline,
    [property: JsonPropertyName("learning_style")] string LearningStyle,
    [property: JsonPropertyName("budget")] string Budget,
    [property: JsonPropertyName("skills")] IReadOnlyList<string> Skills,
    [property: JsonPropertyName("current_experience")] string CurrentExperience);
