using Learner.Domain.Common;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Plans;

/// <summary>The Plans module's own data, plus the shared job queue it enqueues plan generation on.</summary>
public interface IPlansDb
{
    DbSet<Plan> Plans { get; }
    DbSet<Job> Jobs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
