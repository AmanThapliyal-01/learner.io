using Learner.Application.Learning.Asta;
using Learner.Application.Learning.SkillCheck;
using Learner.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Learner.Api.Tests.Infrastructure;

/// <summary>
/// The real API over its own throwaway Postgres database (on the dev server from docker-compose), with the two
/// AI agent clients replaced by programmable fakes so tests are deterministic and cost no model quota.
/// </summary>
public sealed class LearnerApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string ServerConnection = "Host=localhost;Port=5433;Username=learner;Password=learner_dev";

    private readonly string _database = $"learner_test_{Guid.NewGuid():N}";

    public FakeAstaAgent Asta { get; } = new();

    public FakeAssessmentAgent Assessment { get; } = new();

    private string ConnectionString => $"{ServerConnection};Database={_database}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not "Development": no user secrets, so nothing on this machine leaks into the tests.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("RateLimits:AuthPerMinute", "10000");
        builder.UseSetting("RateLimits:ChatPerMinute", "10000");
        builder.UseSetting("AgentService:Token", "test-token");
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IAstaAgent>(Asta);
            services.AddSingleton<IAssessmentAgent>(Assessment);
        });
    }

    public async Task InitializeAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await using (var scope = Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        }
        await DisposeAsync();
    }

    /// <summary>A client that keeps the auth cookie and sends the CSRF header the API requires on writes.</summary>
    public HttpClient CreateBrowserClient()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        client.DefaultRequestHeaders.Add("X-Requested-With", "learner-web");
        return client;
    }

    /// <summary>Runs code against the database directly, e.g. to inspect a queued job or age a plan.</summary>
    public async Task WithDbAsync(Func<AppDbContext, Task> work)
    {
        await using var scope = Services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
