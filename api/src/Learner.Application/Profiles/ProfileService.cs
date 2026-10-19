using Learner.Application.Common;
using Learner.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Profiles;

public sealed class ProfileService(IProfilesDb db, ICurrentUser currentUser, TimeProvider clock)
{
    public async Task<ProfileResponse> GetAsync(CancellationToken ct) => ToResponse(await GetOrCreateAsync(ct));

    public async Task<ProfileResponse> UpdateBasicAsync(BasicInfoRequest request, CancellationToken ct)
    {
        var profile = await GetOrCreateAsync(ct);
        profile.FullName = request.FullName.Trim();
        profile.Country = request.Country.Trim();
        profile.AgeRange = request.AgeRange.Trim();
        profile.CurrentStatus = request.CurrentStatus.Trim();
        return await SaveAsync(profile, ct);
    }

    /// <summary>Saves the optional detailed profile. During onboarding this is the last step, so it completes onboarding.</summary>
    public async Task<ProfileResponse> UpdateDetailsAsync(ProfileDetailsRequest request, CancellationToken ct)
    {
        var profile = await GetOrCreateAsync(ct);
        EnsureBasicInfo(profile);
        profile.Profession = Clean(request.Profession);
        profile.YearsOfExperience = request.YearsOfExperience;
        profile.Education = Clean(request.Education);
        profile.Certifications = CleanList(request.Certifications);
        profile.Skills = CleanList(request.Skills);
        profile.Hobbies = CleanList(request.Hobbies);
        profile.ProfessionalSummary = Clean(request.ProfessionalSummary);
        profile.OnboardingCompleted = true;
        return await SaveAsync(profile, ct);
    }

    /// <summary>Skips the optional detailed profile.</summary>
    public async Task<ProfileResponse> CompleteOnboardingAsync(CancellationToken ct)
    {
        var profile = await GetOrCreateAsync(ct);
        EnsureBasicInfo(profile);
        profile.OnboardingCompleted = true;
        return await SaveAsync(profile, ct);
    }

    private async Task<UserProfile> GetOrCreateAsync(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (profile is null)
        {
            profile = new UserProfile { UserId = userId };
            db.UserProfiles.Add(profile);
        }
        return profile;
    }

    private async Task<ProfileResponse> SaveAsync(UserProfile profile, CancellationToken ct)
    {
        profile.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return ToResponse(profile);
    }

    private static void EnsureBasicInfo(UserProfile profile)
    {
        if (!profile.HasBasicInfo)
        {
            throw ValidationFailedException.For("basicInfo", "Complete your basic info first.");
        }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> CleanList(List<string>? values) =>
        (values ?? [])
            .Select(v => v.Trim())
            .Where(v => v.Length > 0)
            .Select(v => v.Length > ProfileLimits.MaxListItemLength ? v[..ProfileLimits.MaxListItemLength] : v)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(ProfileLimits.MaxListItems)
            .ToList();

    private static ProfileResponse ToResponse(UserProfile p) => new(
        p.FullName, p.Country, p.AgeRange, p.CurrentStatus, p.Profession, p.YearsOfExperience, p.Education,
        p.Certifications, p.Skills, p.Hobbies, p.ProfessionalSummary, p.OnboardingCompleted);
}
