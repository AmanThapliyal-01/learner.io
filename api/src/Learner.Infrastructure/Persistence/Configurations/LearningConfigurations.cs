using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Learner.Infrastructure.Persistence.Configurations;

internal sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable("goals", ModuleSchemas.Learning);
        // One active goal per user.
        builder.HasIndex(g => g.UserId).IsUnique().HasFilter($"status <> '{GoalStatus.Archived}'");
        builder.Property(g => g.Title).HasMaxLength(200);
        builder.Property(g => g.Timeline).HasMaxLength(100);
        builder.Property(g => g.Summary).HasColumnType(ColumnTypes.Jsonb);
        builder.Property(g => g.Preferences).HasColumnType(ColumnTypes.Jsonb);
        builder.HasMany(g => g.Messages).WithOne().HasForeignKey(m => m.GoalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(g => g.SkillRatings).WithOne().HasForeignKey(r => r.GoalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(g => g.Assessments).WithOne().HasForeignKey(a => a.GoalId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("chat_messages", ModuleSchemas.Learning);
        builder.HasIndex(m => new { m.GoalId, m.CreatedAt });
        builder.Property(m => m.ToolPayload).HasColumnType(ColumnTypes.Jsonb);
        builder.Property(m => m.Progress).HasColumnType(ColumnTypes.Jsonb);
    }
}

internal sealed class SkillRatingConfiguration : IEntityTypeConfiguration<SkillRating>
{
    public void Configure(EntityTypeBuilder<SkillRating> builder)
    {
        builder.ToTable("skill_ratings", ModuleSchemas.Learning, t => t.HasCheckConstraint(
            "ck_skill_ratings_self_rating",
            $"self_rating BETWEEN {SkillRating.MinRating} AND {SkillRating.MaxRating}"));
        builder.HasIndex(r => new { r.GoalId, r.Skill }).IsUnique();
        builder.Property(r => r.Skill).HasMaxLength(120);
    }
}

internal sealed class AssessmentConfiguration : IEntityTypeConfiguration<Assessment>
{
    public void Configure(EntityTypeBuilder<Assessment> builder)
    {
        builder.ToTable("assessments", ModuleSchemas.Learning);
        builder.Property(a => a.Results).HasColumnType(ColumnTypes.Jsonb);
        builder.HasMany(a => a.Questions).WithOne().HasForeignKey(q => q.AssessmentId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AssessmentQuestionConfiguration : IEntityTypeConfiguration<AssessmentQuestion>
{
    public void Configure(EntityTypeBuilder<AssessmentQuestion> builder)
    {
        builder.ToTable("assessment_questions", ModuleSchemas.Learning);
        builder.HasIndex(q => new { q.AssessmentId, q.Order });
        builder.Property(q => q.Skill).HasMaxLength(120);
        builder.Property(q => q.Options).HasColumnType(ColumnTypes.Jsonb);
        builder.Property(q => q.Score).HasPrecision(4, 2);
    }
}
