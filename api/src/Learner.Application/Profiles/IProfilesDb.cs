using Learner.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Profiles;

/// <summary>The Profiles module's own data. Only this module may use it.</summary>
public interface IProfilesDb
{
    DbSet<UserProfile> UserProfiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
