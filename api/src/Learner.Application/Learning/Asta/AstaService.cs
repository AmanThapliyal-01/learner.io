using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Learner.Application.Common;
using Learner.Application.Contracts.Learning;
using Learner.Application.Contracts.Profiles;
using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Learning.Asta;

/// <summary>The Asta conversation: history, streaming replies through the agents service, and goal confirmation.</summary>
public sealed class AstaService(
    ILearningDb db,
    IAstaAgent agent,
    IProfilesModule profiles,
    ICurrentUser currentUser)
{
    /// <summary>How much history Asta sees; older turns are already reflected in the conversation's direction.</summary>
    private const int HistoryLimit = 40;

    public async Task<ConversationResponse> GetConversationAsync(CancellationToken ct)
    {
        var goal = await ActiveGoalQuery().AsNoTracking().FirstOrDefaultAsync(ct);
        if (goal is null)
        {
            return new ConversationResponse(null, null, []);
        }

        var messages = await db.ChatMessages.AsNoTracking()
            .Where(m => m.GoalId == goal.Id && m.Role != ChatRole.Tool)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
        return new ConversationResponse(goal.Id, LearningModule.ToStage(goal.Status), messages.Select(ToResponse).ToList());
    }

    /// <summary>
    /// Validates and stores the user's message before any streaming starts, so problems surface as normal
    /// HTTP errors rather than a broken stream.
    /// </summary>
    public async Task<AstaTurnContext> BeginTurnAsync(SendMessageRequest request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var goal = await ActiveGoalQuery().FirstOrDefaultAsync(ct);
        if (goal is null)
        {
            goal = new Goal { UserId = userId };
            db.Goals.Add(goal);
        }
        else if (goal.Status != GoalStatus.Chatting)
        {
            throw new ConflictException("Your goal is already confirmed. Change your goal to start a new conversation.");
        }

        var userMessage = new ChatMessage { GoalId = goal.Id, Role = ChatRole.User, Content = request.Content.Trim() };
        db.ChatMessages.Add(userMessage);
        await db.SaveChangesAsync(ct);

        var history = await db.ChatMessages.AsNoTracking()
            .Where(m => m.GoalId == goal.Id && m.Role != ChatRole.Tool)
            .OrderByDescending(m => m.CreatedAt)
            .Take(HistoryLimit)
            .ToListAsync(ct);
        history.Reverse();

        var turns = history.Select(m => new AstaTurn(
            m.Role == ChatRole.User ? "user" : "assistant",
            m.Content,
            ParseJson(m.ToolPayload))).ToList();
        var profile = await profiles.GetSnapshotAsync(userId, ct);
        return new AstaTurnContext(goal.Id, userMessage.Id, new AstaAgentRequest(profile, turns));
    }

    /// <summary>Relays Asta's reply to the browser and stores it once complete.</summary>
    public async IAsyncEnumerable<AstaStreamEvent> StreamTurnAsync(AstaTurnContext turn, [EnumeratorCancellation] CancellationToken ct)
    {
        var reply = new StringBuilder();
        JsonElement? summary = null;
        string? finalText = null;
        AstaAgentEvent? failure = null;

        await foreach (var evt in agent.StreamAsync(turn.AgentRequest, ct))
        {
            switch (evt.Type)
            {
                case AstaAgentEvent.Token when evt.Text is not null:
                    reply.Append(evt.Text);
                    yield return new AstaStreamEvent(AstaAgentEvent.Token, Text: evt.Text);
                    break;
                case AstaAgentEvent.GoalSummaryType when evt.GoalSummary is not null:
                    summary = evt.GoalSummary;
                    finalText = evt.Text;
                    yield return new AstaStreamEvent(AstaAgentEvent.GoalSummaryType, Text: evt.Text, GoalSummary: evt.GoalSummary);
                    break;
                case AstaAgentEvent.Error:
                    failure = evt;
                    break;
            }
        }

        if (failure is not null || (reply.Length == 0 && summary is null))
        {
            // Nothing usable came back: drop the user's message so resending it doesn't duplicate it.
            await db.ChatMessages.Where(m => m.Id == turn.UserMessageId).ExecuteDeleteAsync(CancellationToken.None);
            yield return new AstaStreamEvent(
                AstaAgentEvent.Error,
                Text: failure?.Text ?? "Asta couldn't reply just now. Please try again.",
                Code: failure?.Code ?? "agent_error",
                RetryAt: failure?.RetryAt);
            yield break;
        }

        var assistantMessage = new ChatMessage
        {
            GoalId = turn.GoalId,
            Role = ChatRole.Assistant,
            Content = finalText ?? reply.ToString(),
            ToolPayload = summary?.GetRawText(),
        };
        db.ChatMessages.Add(assistantMessage);
        // Store the reply even if the browser disconnected while it streamed.
        await db.SaveChangesAsync(CancellationToken.None);
        yield return new AstaStreamEvent(AstaAgentEvent.Done, MessageId: assistantMessage.Id);
    }

    /// <summary>Accepts the goal summary card from Asta's latest message and moves on to self-rating.</summary>
    public async Task<ActiveGoal> ConfirmGoalAsync(CancellationToken ct)
    {
        var goal = await ActiveGoalQuery().FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("There's no goal to confirm yet. Chat with Asta first.");
        if (goal.Status != GoalStatus.Chatting)
        {
            throw new ConflictException("This goal is already confirmed.");
        }

        // Only the card in Asta's most recent message counts; if the user replied after it, it's out of date.
        var latest = await db.ChatMessages
            .Where(m => m.GoalId == goal.Id && m.Role != ChatRole.Tool)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (latest is not { Role: ChatRole.Assistant, ToolPayload: not null })
        {
            throw new ConflictException("Asta hasn't proposed a goal summary yet, or you've asked for changes since.");
        }

        var summary = JsonSerializer.Deserialize<GoalSummaryDto>(latest.ToolPayload)
            ?? throw new ConflictException("The goal summary couldn't be read. Ask Asta to summarise again.");

        goal.Type = summary.GoalType == "personal" ? GoalType.Personal : GoalType.Professional;
        goal.Title = summary.Title.Length > 200 ? summary.Title[..200] : summary.Title;
        goal.Summary = latest.ToolPayload;
        goal.HoursPerWeek = summary.HoursPerWeek;
        goal.Timeline = summary.Timeline;
        goal.Preferences = JsonSerializer.Serialize(new { learning_style = summary.LearningStyle, budget = summary.Budget });
        goal.Status = GoalStatus.Rating;
        await db.SaveChangesAsync(ct);

        return new ActiveGoal(goal.Id, goal.Title, GoalStage.Rating);
    }

    private IQueryable<Goal> ActiveGoalQuery()
    {
        var userId = currentUser.UserId;
        return db.Goals.Where(g => g.UserId == userId && g.Status != GoalStatus.Archived);
    }

    private static ChatMessageResponse ToResponse(ChatMessage m) => new(
        m.Id, m.Role == ChatRole.User ? "user" : "assistant", m.Content, ParseJson(m.ToolPayload), m.CreatedAt);

    private static JsonElement? ParseJson(string? json) =>
        json is null ? null : JsonDocument.Parse(json).RootElement.Clone();
}
