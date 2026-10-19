using System.Text.Json;
using System.Text.Json.Serialization;
using Learner.Domain.Common;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Learner.Infrastructure.Persistence.Configurations;

internal sealed class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    // The Python worker writes progress as {"step": "detailing", "done": 2, "total": 4}.
    private static readonly JsonSerializerOptions AgentJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) },
    };

    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.ToTable("plans", ModuleSchemas.Plans);
        // One active plan per user.
        builder.HasIndex(p => p.UserId).IsUnique().HasFilter($"status <> '{PlanStatus.Archived}'");
        builder.HasIndex(p => p.GoalId);
        builder.Property(p => p.Content).HasColumnType(ColumnTypes.Jsonb);
        builder.Property(p => p.Progress)
            .HasColumnType(ColumnTypes.Jsonb)
            .HasConversion(
                progress => JsonSerializer.Serialize(progress, AgentJson),
                json => JsonSerializer.Deserialize<PlanProgress>(json, AgentJson));
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
