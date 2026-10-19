using Learner.Application.Learning.SkillCheck;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

/// <summary>Self-rating and the skill check for the active goal.</summary>
[Route("api/learning")]
public sealed class LearningController(AssessmentService assessments) : ApiControllerBase
{
    [HttpGet("skills")]
    public Task<RatingFormResponse> Skills(CancellationToken ct) => assessments.GetRatingFormAsync(ct);

    [HttpPut("ratings")]
    public async Task<NoContentResult> Rate(RateSkillsRequest request, CancellationToken ct)
    {
        await assessments.SaveRatingsAsync(request, ct);
        return NoContent();
    }

    /// <summary>The open skill check; generated on first request, which takes a few seconds.</summary>
    [HttpGet("assessment")]
    public Task<AssessmentResponse> Assessment(CancellationToken ct) => assessments.GetOrCreateAssessmentAsync(ct);

    [HttpPost("assessment/submit")]
    public Task<AssessmentResultsResponse> Submit(SubmitAnswersRequest request, CancellationToken ct) =>
        assessments.SubmitAsync(request, ct);

    [HttpGet("assessment/results")]
    public Task<AssessmentResultsResponse> Results(CancellationToken ct) => assessments.GetResultsAsync(ct);
}
