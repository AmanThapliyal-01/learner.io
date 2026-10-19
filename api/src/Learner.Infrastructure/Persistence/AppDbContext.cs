using Learner.Application.Learning;
using Learner.Application.Plans;
using Learner.Application.Profiles;
using Learner.Domain.Common;
using Learner.Domain.Learning;
using Learner.Domain.Plans;
using Learner.Domain.Profiles;
using Learner.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Learner.Infrastructure.Persistence;

/// <summary>
/// One database, one schema per module. Each module sees only its own sets through its own interface
/// (IProfilesDb, ILearningDb, IPlansDb); there are no foreign keys across module schemas, so any
/// module can later move to its own database.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options, TimeProvider timeProvider)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IProfilesDb, ILearningDb, IPlansDb
{
    // Profiles
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    // Learning
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<SkillRating> SkillRatings => Set<SkillRating>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<AssessmentQuestion> AssessmentQuestions => Set<AssessmentQuestion>();

    // Plans + shared job queue
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Job> Jobs => Set<Job>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Enums as readable strings, shared with the Python agents service.
        configurationBuilder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(32);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow();
        foreach (var entry in ChangeTracker.Entries<Entity>().Where(e => e.State == EntityState.Added))
        {
            entry.Entity.CreatedAt = now;
        }
        foreach (var entry in ChangeTracker.Entries<ApplicationUser>().Where(e => e.State == EntityState.Added))
        {
            entry.Entity.CreatedAt = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
