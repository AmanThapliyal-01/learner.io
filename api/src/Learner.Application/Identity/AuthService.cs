using Learner.Application.Common;
using Learner.Application.Contracts.Profiles;

namespace Learner.Application.Identity;

public sealed class AuthService(IIdentityService identity, IProfilesModule profiles)
{
    public async Task<MeResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var userId = await identity.CreateUserAsync(request.Email.Trim(), request.Password);
        await profiles.CreateProfileIfMissingAsync(userId, request.FullName, ct);
        await identity.SignInAsync(userId);
        return await GetMeAsync(userId, ct);
    }

    public async Task<MeResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var outcome = await identity.PasswordSignInAsync(request.Email.Trim(), request.Password);
        if (outcome.LockedOut)
        {
            throw new UnauthorizedException("Too many failed attempts. Try again in a few minutes.");
        }
        if (outcome.UserId is not { } userId)
        {
            throw new UnauthorizedException("Invalid email or password.");
        }
        return await GetMeAsync(userId, ct);
    }

    /// <summary>Returns false when Google sign-in could not be completed.</summary>
    public async Task<bool> CompleteGoogleSignInAsync(CancellationToken ct)
    {
        var outcome = await identity.CompleteExternalSignInAsync();
        if (outcome is null)
        {
            return false;
        }
        await profiles.CreateProfileIfMissingAsync(outcome.UserId, outcome.FullName, ct);
        return true;
    }

    public Task SignOutAsync() => identity.SignOutAsync();

    public async Task<MeResponse> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var email = await identity.GetEmailAsync(userId)
            ?? throw new UnauthorizedException("Your session has expired. Please sign in again.");
        var profile = await profiles.GetSummaryAsync(userId, ct);
        return new MeResponse(userId, email, profile?.FullName, profile?.OnboardingCompleted ?? false);
    }
}
