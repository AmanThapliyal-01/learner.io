using System.Security.Claims;
using System.Threading.RateLimiting;
using Learner.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace Learner.Api.Auth;

public static class AuthSetup
{
    public const string AuthRateLimit = "auth";
    public const string ChatRateLimit = "chat";

    /// <summary>
    /// Cookie sessions (+ Google when configured), a global "signed in" requirement, and rate limits.
    /// Every endpoint requires a signed-in user unless it opts out with [AllowAnonymous].
    /// </summary>
    public static IServiceCollection AddLearnerAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var authentication = services.AddAuthentication(IdentityConstants.ApplicationScheme);
        authentication.AddIdentityCookies();

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "learner.auth";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.ExpireTimeSpan = TimeSpan.FromDays(14);
            options.SlidingExpiration = true;
            // An API answers with status codes; the SPA decides where to navigate.
            options.Events.OnRedirectToLogin = context => WriteStatus(context.Response, StatusCodes.Status401Unauthorized);
            options.Events.OnRedirectToAccessDenied = context => WriteStatus(context.Response, StatusCodes.Status403Forbidden);
        });
        services.ConfigureExternalCookie(options => options.Cookie.Name = "learner.external");

        var google = configuration.GetSection("Authentication:Google");
        if (!string.IsNullOrWhiteSpace(google["ClientId"]) && !string.IsNullOrWhiteSpace(google["ClientSecret"]))
        {
            authentication.AddGoogle(options =>
            {
                options.ClientId = google["ClientId"]!;
                options.ClientSecret = google["ClientSecret"]!;
                options.SignInScheme = IdentityConstants.ExternalScheme;
            });
        }

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();

        // Per minute; configurable so integration tests (many sign-ins from one address) aren't throttled.
        var authPerMinute = configuration.GetValue("RateLimits:AuthPerMinute", 10);
        var chatPerMinute = configuration.GetValue("RateLimits:ChatPerMinute", 20);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(AuthRateLimit, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = authPerMinute, Window = TimeSpan.FromMinutes(1) }));
            // Per signed-in user: protects the shared LLM quota from one runaway client.
            options.AddPolicy(ChatRateLimit, context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = chatPerMinute, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }

    private static Task WriteStatus(HttpResponse response, int statusCode)
    {
        response.StatusCode = statusCode;
        return Task.CompletedTask;
    }
}
