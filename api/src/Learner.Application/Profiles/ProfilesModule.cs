using Learner.Application.Contracts.Profiles;
using Learner.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Profiles;

internal sealed class ProfilesModule(IProfilesDb db) : IProfilesModule
{
    public async Task CreateProfileIfMissingAsync(Guid userId, string? fullName, CancellationToken ct)
    {
        if (await db.UserProfiles.AnyAsync(p => p.UserId == userId, ct))
        {
            return;
        }
        db.UserProfiles.Add(new UserProfile { UserId = userId, FullName = fullName?.Trim() ?? string.Empty });
        await db.SaveChangesAsync(ct);
    }

    public Task<ProfileSummary?> GetSummaryAsync(Guid userId, CancellationToken ct) =>
        db.UserProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new ProfileSummary(p.FullName, p.OnboardingCompleted))
            .FirstOrDefaultAsync(ct);
}
