namespace Learner.Application.Contracts.Profiles;

public sealed record ProfileSummary(string FullName, bool OnboardingCompleted);

/// <summary>Public API of the Profiles module. Other modules use only this, never its data directly.</summary>
public interface IProfilesModule
{
    Task CreateProfileIfMissingAsync(Guid userId, string? fullName, CancellationToken ct);

    Task<ProfileSummary?> GetSummaryAsync(Guid userId, CancellationToken ct);
}
