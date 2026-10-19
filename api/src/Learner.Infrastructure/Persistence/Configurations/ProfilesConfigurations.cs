using Learner.Domain.Profiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Learner.Infrastructure.Persistence.Configurations;

internal sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.ToTable("user_profiles", ModuleSchemas.Profiles);
        builder.HasIndex(p => p.UserId).IsUnique();
        builder.Property(p => p.FullName).HasMaxLength(120);
        builder.Property(p => p.Country).HasMaxLength(80);
        builder.Property(p => p.AgeRange).HasMaxLength(20);
        builder.Property(p => p.CurrentStatus).HasMaxLength(40);
        builder.Property(p => p.Profession).HasMaxLength(120);
        builder.Property(p => p.Education).HasMaxLength(400);
        builder.Property(p => p.ProfessionalSummary).HasMaxLength(4000);
    }
}
