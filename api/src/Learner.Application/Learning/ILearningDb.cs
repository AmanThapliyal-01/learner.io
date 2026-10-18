using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Learning;

/// <summary>The Learning module's own data. Only this module may use it.</summary>
public interface ILearningDb
{
    DbSet<Goal> Goals { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    DbSet<SkillRating> SkillRatings { get; }
    DbSet<Assessment> Assessments { get; }
    DbSet<AssessmentQuestion> AssessmentQuestions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
