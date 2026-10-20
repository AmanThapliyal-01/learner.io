using Learner.Application.Identity;
using Learner.Application.Learning.SkillCheck;
using Learner.Application.Learning.Asta;
using Learner.Infrastructure.Agents;
using Learner.Application.Learning;
using Learner.Application.Plans;
using Learner.Application.Profiles;
using Learner.Infrastructure.Identity;
using Learner.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

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

        // Internal Python agents service (Asta, assessment, planner).
        // Fail at startup, not as a 401 on the first Asta message, when the shared token is missing.
        services.AddOptions<AgentServiceOptions>()
            .Bind(configuration.GetSection(AgentServiceOptions.Section))
            .Validate(o => !string.IsNullOrWhiteSpace(o.Token), "AgentService:Token is empty. In development, set AGENT_SERVICE_TOKEN in the repo-root .env (see .env.example).")
            .ValidateOnStart();
        services.AddHttpClient<IAstaAgent, AstaAgentClient>(ConfigureAgentsClient);
        services.AddHttpClient<IAssessmentAgent, AssessmentAgentClient>(ConfigureAgentsClient);

        return services;
    }

    private static void ConfigureAgentsClient(IServiceProvider sp, HttpClient http)
    {
        var options = sp.GetRequiredService<IOptions<AgentServiceOptions>>().Value;
        http.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        http.DefaultRequestHeaders.Add(AgentServiceOptions.TokenHeader, options.Token);
        // Generating a check or a streamed reply with a web search stays well under this.
        http.Timeout = TimeSpan.FromMinutes(3);
    }
}
