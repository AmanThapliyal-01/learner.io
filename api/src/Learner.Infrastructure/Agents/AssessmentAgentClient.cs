using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Learner.Application.Common;
using Learner.Application.Learning.SkillCheck;
using Microsoft.Extensions.Logging;

namespace Learner.Infrastructure.Agents;

/// <summary>Calls POST /assessment/generate and /assessment/grade on the agents service.</summary>
internal sealed class AssessmentAgentClient(HttpClient http, ILogger<AssessmentAgentClient> logger) : IAssessmentAgent
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public Task<GenerateAssessmentResponse> GenerateAsync(GenerateAssessmentRequest request, CancellationToken ct) =>
        PostAsync<GenerateAssessmentRequest, GenerateAssessmentResponse>("assessment/generate", request, ct);

    public Task<GradeAssessmentResponse> GradeAsync(GradeAssessmentRequest request, CancellationToken ct) =>
        PostAsync<GradeAssessmentRequest, GradeAssessmentResponse>("assessment/grade", request, ct);

    private async Task<TResponse> PostAsync<TRequest, TResponse>(string path, TRequest request, CancellationToken ct)
    {
        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync(path, request, Json, ct);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogError(exception, "Agents service unreachable for {Path}", path);
            throw new ServiceUnavailableException("Our AI is unavailable right now. Please try again in a moment.");
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                var busy = await response.Content.ReadFromJsonAsync<RateLimited>(Json, ct);
                throw new ServiceUnavailableException("Our AI is busy right now. Please try again shortly.", busy?.RetryAt);
            }
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Agents service returned {Status} for {Path}", (int)response.StatusCode, path);
                throw new ServiceUnavailableException("Our AI couldn't finish that. Please try again.");
            }
            return await response.Content.ReadFromJsonAsync<TResponse>(Json, ct)
                ?? throw new ServiceUnavailableException("Our AI returned an empty answer. Please try again.");
        }
    }

    private sealed record RateLimited(string? Code, DateTimeOffset? RetryAt);
}
