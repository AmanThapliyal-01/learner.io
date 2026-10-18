using Microsoft.Extensions.DependencyInjection;

namespace Learner.Application;

public static class DependencyInjection
{
    /// <summary>Registers application use cases. Each feature adds its services here as it lands.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
