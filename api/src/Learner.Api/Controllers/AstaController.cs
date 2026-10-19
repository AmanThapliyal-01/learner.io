using System.Net.ServerSentEvents;
using Learner.Api.Auth;
using Learner.Application.Contracts.Learning;
using Learner.Application.Learning.Asta;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Learner.Api.Controllers;

[Route("api/asta")]
public sealed class AstaController(AstaService asta) : ApiControllerBase
{
    [HttpGet("conversation")]
    public Task<ConversationResponse> Conversation(CancellationToken ct) => asta.GetConversationAsync(ct);

    /// <summary>Sends a message and streams Asta's reply as server-sent events: token*, goal_summary?, then done | error.</summary>
    [EnableRateLimiting(AuthSetup.ChatRateLimit)]
    [HttpPost("messages")]
    public async Task<IResult> SendMessage(SendMessageRequest request, CancellationToken ct)
    {
        var turn = await asta.BeginTurnAsync(request, ct);
        var events = asta.StreamTurnAsync(turn, ct).Select(e => new SseItem<AstaStreamEvent>(e, e.Type));
        return TypedResults.ServerSentEvents(events);
    }

    [HttpPost("goal/confirm")]
    public Task<ActiveGoal> ConfirmGoal(CancellationToken ct) => asta.ConfirmGoalAsync(ct);
}
