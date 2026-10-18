using System.Net.Http.Json;
using System.Net.ServerSentEvents;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Learner.Application.Learning.Asta;
using Microsoft.Extensions.Logging;

namespace Learner.Infrastructure.Agents;

/// <summary>Calls POST /asta/stream on the agents service and relays its server-sent events.</summary>
internal sealed class AstaAgentClient(HttpClient http, ILogger<AstaAgentClient> logger) : IAstaAgent
{
    // The agents service is Python: snake_case on the wire.
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private static readonly AstaAgentEvent Unavailable =
        new(AstaAgentEvent.Error, Text: "Asta is unavailable right now. Please try again in a moment.", Code: "agent_unavailable");

    public async IAsyncEnumerable<AstaAgentEvent> StreamAsync(AstaAgentRequest request, [EnumeratorCancellation] CancellationToken ct)
    {
        using var response = await SendAsync(request, ct);
        if (response is null)
        {
            yield return Unavailable;
            yield break;
        }

        await using var body = await response.Content.ReadAsStreamAsync(ct);
        var parser = SseParser.Create(body, (_, data) => JsonSerializer.Deserialize<AstaAgentEvent>(data, Json));
        await foreach (var item in parser.EnumerateAsync(ct))
        {
            if (item.Data is not null)
            {
                yield return item.Data;
            }
        }
    }

    /// <summary>Null when the agents service can't be reached or rejects the call.</summary>
    private async Task<HttpResponseMessage?> SendAsync(AstaAgentRequest request, CancellationToken ct)
    {
        try
        {
            var message = new HttpRequestMessage(HttpMethod.Post, "asta/stream") { Content = JsonContent.Create(request, options: Json) };
            var response = await http.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, ct);
            if (response.IsSuccessStatusCode)
            {
                return response;
            }
            logger.LogError("Agents service returned {Status} for Asta", (int)response.StatusCode);
            response.Dispose();
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Agents service unreachable");
        }
        return null;
    }
}
