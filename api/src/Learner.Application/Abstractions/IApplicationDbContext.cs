using Learner.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Abstractions;

/// <summary>Data access for use cases. Queries are written in LINQ against these sets.</summary>
public interface IApplicationDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Goal> Goals { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    DbSet<SkillRating> SkillRatings { get; }
    DbSet<Assessment> Assessments { get; }
    DbSet<AssessmentQuestion> AssessmentQuestions { get; }
    DbSet<Plan> Plans { get; }
    DbSet<Job> Jobs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
