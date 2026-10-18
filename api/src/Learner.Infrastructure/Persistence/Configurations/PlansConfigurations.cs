using Learner.Domain.Common;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Learner.Infrastructure.Persistence.Configurations;

internal sealed class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.ToTable("plans", ModuleSchemas.Plans);
        // One active plan per user.
        builder.HasIndex(p => p.UserId).IsUnique().HasFilter($"status <> '{PlanStatus.Archived}'");
        builder.HasIndex(p => p.GoalId);
        builder.Property(p => p.Content).HasColumnType(ColumnTypes.Jsonb);
    }
}

internal sealed class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.ToTable("jobs", ModuleSchemas.Queue);
        builder.HasIndex(j => new { j.Status, j.CreatedAt });
        builder.Property(j => j.Type).HasMaxLength(64);
        builder.Property(j => j.Payload).HasColumnType(ColumnTypes.Jsonb);
    }
}
