namespace Learner.Application.Contracts.Profiles;

public sealed record ProfileSummary(string FullName, bool OnboardingCompleted);

/// <summary>Everything the user told us about themselves, for agents that personalise their work.</summary>
public sealed record ProfileSnapshot(
    string FullName,
    string? Country,
    string? AgeRange,
    string? CurrentStatus,
    string? Profession,
    int? YearsOfExperience,
    string? Education,
    IReadOnlyList<string> Certifications,
    IReadOnlyList<string> Skills,
    IReadOnlyList<string> Hobbies,
    string? ProfessionalSummary);

/// <summary>Public API of the Profiles module. Other modules use only this, never its data directly.</summary>
public interface IProfilesModule
{
    Task CreateProfileIfMissingAsync(Guid userId, string? fullName, CancellationToken ct);

    Task<ProfileSummary?> GetSummaryAsync(Guid userId, CancellationToken ct);

    Task<ProfileSnapshot?> GetSnapshotAsync(Guid userId, CancellationToken ct);
}
