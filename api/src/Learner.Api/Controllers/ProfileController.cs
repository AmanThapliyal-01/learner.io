using Learner.Application.Profiles;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Controllers;

[Route("api/profile")]
public sealed class ProfileController(ProfileService profiles) : ApiControllerBase
{
    [HttpGet]
    public Task<ProfileResponse> Get(CancellationToken ct) => profiles.GetAsync(ct);

    [HttpPut("basic")]
    public Task<ProfileResponse> UpdateBasic(BasicInfoRequest request, CancellationToken ct) => profiles.UpdateBasicAsync(request, ct);

    [HttpPut("details")]
    public Task<ProfileResponse> UpdateDetails(ProfileDetailsRequest request, CancellationToken ct) => profiles.UpdateDetailsAsync(request, ct);

    [HttpPost("onboarding/complete")]
    public Task<ProfileResponse> CompleteOnboarding(CancellationToken ct) => profiles.CompleteOnboardingAsync(ct);
}
