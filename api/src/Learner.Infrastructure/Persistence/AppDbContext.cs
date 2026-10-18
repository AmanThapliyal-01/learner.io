using Learner.Application.Abstractions;
using Learner.Domain.Common;
using Learner.Domain.Entities;
using Learner.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Learner.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, TimeProvider timeProvider)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IApplicationDbContext
{
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<SkillRating> SkillRatings => Set<SkillRating>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<AssessmentQuestion> AssessmentQuestions => Set<AssessmentQuestion>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Job> Jobs => Set<Job>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Identity hard-codes "AspNet*" table names; keep the schema consistently snake_case.
        builder.Entity<ApplicationUser>().ToTable("users");
        builder.Entity<IdentityRole<Guid>>().ToTable("roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
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
