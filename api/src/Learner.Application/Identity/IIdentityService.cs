namespace Learner.Application.Identity;

public sealed record PasswordSignInOutcome(Guid? UserId, bool LockedOut);

public sealed record ExternalSignInOutcome(Guid UserId, string? FullName);

/// <summary>Accounts and sign-in sessions. Implemented with ASP.NET Core Identity in Infrastructure.</summary>
public interface IIdentityService
{
    /// <summary>Creates a password account. Throws <see cref="Common.ValidationFailedException"/> on bad input.</summary>
    Task<Guid> CreateUserAsync(string email, string password);

    Task SignInAsync(Guid userId);

    Task<PasswordSignInOutcome> PasswordSignInAsync(string email, string password);

    /// <summary>Finishes an external (Google) sign-in, creating or linking the account. Null if it failed.</summary>
    Task<ExternalSignInOutcome?> CompleteExternalSignInAsync();

    Task SignOutAsync();

    Task<string?> GetEmailAsync(Guid userId);
}
