using Learner.Application.Identity;
using Learner.Application.Learning;
using Learner.Application.Plans;
using Learner.Application.Profiles;
using Learner.Infrastructure.Identity;
using Learner.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Learner.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddDbContext<AppDbContext>(options => options
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history", "public"))
            .UseSnakeCaseNamingConvention());
        // Each module gets its own view of the shared context.
        services.AddScoped<IProfilesDb>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ILearningDb>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<IPlansDb>(sp => sp.GetRequiredService<AppDbContext>());

        // Protects auth cookies and Identity tokens (password reset, email confirmation).
        services.AddDataProtection();
        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                // NIST SP 800-63B: require length, not character-class composition rules.
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireDigit = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();
        services.AddScoped<IIdentityService, IdentityService>();

        return services;
    }
}
