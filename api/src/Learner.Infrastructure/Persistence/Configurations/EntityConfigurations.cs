using Learner.Domain.Entities;
using Learner.Domain.Enums;
using Learner.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Learner.Infrastructure.Persistence.Configurations;

internal static class Jsonb
{
    public const string Type = "jsonb";
}

internal sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.HasIndex(p => p.UserId).IsUnique();
        builder.HasOne<ApplicationUser>().WithOne().HasForeignKey<UserProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Property(p => p.FullName).HasMaxLength(120);
        builder.Property(p => p.Country).HasMaxLength(80);
        builder.Property(p => p.AgeRange).HasMaxLength(20);
        builder.Property(p => p.CurrentStatus).HasMaxLength(40);
        builder.Property(p => p.Profession).HasMaxLength(120);
        builder.Property(p => p.Education).HasMaxLength(400);
        builder.Property(p => p.ProfessionalSummary).HasMaxLength(4000);
    }
}

internal sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        // One active goal per user.
        builder.HasIndex(g => g.UserId).IsUnique().HasFilter($"status <> '{GoalStatus.Archived}'");
        builder.Property(g => g.Title).HasMaxLength(200);
        builder.Property(g => g.Timeline).HasMaxLength(100);
        builder.Property(g => g.Summary).HasColumnType(Jsonb.Type);
        builder.Property(g => g.Preferences).HasColumnType(Jsonb.Type);
        builder.HasMany(g => g.Messages).WithOne().HasForeignKey(m => m.GoalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(g => g.SkillRatings).WithOne().HasForeignKey(r => r.GoalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(g => g.Assessments).WithOne().HasForeignKey(a => a.GoalId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.HasIndex(m => new { m.GoalId, m.CreatedAt });
        builder.Property(m => m.ToolPayload).HasColumnType(Jsonb.Type);
    }
}

internal sealed class SkillRatingConfiguration : IEntityTypeConfiguration<SkillRating>
{
    public void Configure(EntityTypeBuilder<SkillRating> builder)
    {
        builder.HasIndex(r => new { r.GoalId, r.Skill }).IsUnique();
        builder.Property(r => r.Skill).HasMaxLength(120);
        builder.ToTable(t => t.HasCheckConstraint(
            "ck_skill_ratings_self_rating",
            $"self_rating BETWEEN {SkillRating.MinRating} AND {SkillRating.MaxRating}"));
    }
}

internal sealed class AssessmentConfiguration : IEntityTypeConfiguration<Assessment>
{
    public void Configure(EntityTypeBuilder<Assessment> builder)
    {
        builder.Property(a => a.Results).HasColumnType(Jsonb.Type);
        builder.HasMany(a => a.Questions).WithOne().HasForeignKey(q => q.AssessmentId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AssessmentQuestionConfiguration : IEntityTypeConfiguration<AssessmentQuestion>
{
    public void Configure(EntityTypeBuilder<AssessmentQuestion> builder)
    {
        builder.HasIndex(q => new { q.AssessmentId, q.Order });
        builder.Property(q => q.Skill).HasMaxLength(120);
        builder.Property(q => q.Options).HasColumnType(Jsonb.Type);
        builder.Property(q => q.Score).HasPrecision(4, 2);
    }
}

internal sealed class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Goal>().WithMany().HasForeignKey(p => p.GoalId).OnDelete(DeleteBehavior.Cascade);
        // One active plan per user.
        builder.HasIndex(p => p.UserId).IsUnique().HasFilter($"status <> '{PlanStatus.Archived}'");
        builder.Property(p => p.Content).HasColumnType(Jsonb.Type);
    }
}

internal sealed class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.HasIndex(j => new { j.Status, j.CreatedAt });
        builder.Property(j => j.Type).HasMaxLength(64);
        builder.Property(j => j.Payload).HasColumnType(Jsonb.Type);
    }
}
