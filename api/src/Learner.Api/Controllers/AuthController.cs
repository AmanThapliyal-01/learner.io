using Learner.Api.Auth;
using Learner.Application.Common;
using Learner.Application.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Learner.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController(AuthService auth, ICurrentUser currentUser, IAuthenticationSchemeProvider schemes)
    : ApiControllerBase
{
    [AllowAnonymous]
    [HttpGet("providers")]
    public async Task<AuthProvidersResponse> Providers() => new(await IsGoogleEnabledAsync());

    [AllowAnonymous]
    [EnableRateLimiting(AuthSetup.AuthRateLimit)]
    [HttpPost("register")]
    public Task<MeResponse> Register(RegisterRequest request, CancellationToken ct) => auth.RegisterAsync(request, ct);

    [AllowAnonymous]
    [EnableRateLimiting(AuthSetup.AuthRateLimit)]
    [HttpPost("login")]
    public Task<MeResponse> Login(LoginRequest request, CancellationToken ct) => auth.LoginAsync(request, ct);

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<NoContentResult> Logout()
    {
        await auth.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    public Task<MeResponse> Me(CancellationToken ct) => auth.GetMeAsync(currentUser.UserId, ct);

    /// <summary>Starts Google sign-in; the browser navigates here (not fetch).</summary>
    [AllowAnonymous]
    [HttpGet("google")]
    public async Task<IActionResult> Google()
    {
        if (!await IsGoogleEnabledAsync())
        {
            return LocalRedirect("/login?error=google_unavailable");
        }
        var properties = new AuthenticationProperties { RedirectUri = Url.Action(nameof(GoogleComplete)) };
        properties.Items["LoginProvider"] = GoogleDefaults.AuthenticationScheme;
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [AllowAnonymous]
    [HttpGet("google/complete")]
    public async Task<IActionResult> GoogleComplete(CancellationToken ct) =>
        LocalRedirect(await auth.CompleteGoogleSignInAsync(ct) ? "/dashboard" : "/login?error=google");

    private async Task<bool> IsGoogleEnabledAsync() =>
        await schemes.GetSchemeAsync(GoogleDefaults.AuthenticationScheme) is not null;
}
