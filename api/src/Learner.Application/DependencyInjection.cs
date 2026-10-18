using Learner.Application.Contracts.Learning;
using Learner.Application.Contracts.Plans;
using Learner.Application.Contracts.Profiles;
using Learner.Application.Dashboard;
using Learner.Application.Identity;
using Learner.Application.Learning;
using Learner.Application.Learning.Asta;
using Learner.Application.Plans;
using Learner.Application.Profiles;
using Microsoft.Extensions.DependencyInjection;

namespace Learner.Application;

public static class DependencyInjection
{
    /// <summary>Registers each module's use cases and its public contract.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);

        // Identity
        services.AddScoped<AuthService>();

        // Profiles
        services.AddScoped<IProfilesModule, ProfilesModule>();
        services.AddScoped<ProfileService>();

        // Learning
        services.AddScoped<ILearningModule, LearningModule>();
        services.AddScoped<AstaService>();

        // Plans
        services.AddScoped<IPlansModule, PlansModule>();

        // Composition across modules (contracts only)
        services.AddScoped<DashboardService>();

        return services;
    }
}
