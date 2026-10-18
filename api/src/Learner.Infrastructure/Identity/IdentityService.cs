using System.Security.Claims;
using Learner.Application.Common;
using Learner.Application.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;

namespace Learner.Infrastructure.Identity;

internal sealed class IdentityService(UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn) : IIdentityService
{
    public async Task<Guid> CreateUserAsync(string email, string password)
    {
        var user = new ApplicationUser { UserName = email, Email = email };
        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw ToValidationFailure(result);
        }
        return user.Id;
    }

    public async Task SignInAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString()) ?? throw new NotFoundException("User not found.");
        await signIn.SignInAsync(user, isPersistent: true);
    }

    public async Task<PasswordSignInOutcome> PasswordSignInAsync(string email, string password)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            return new PasswordSignInOutcome(null, LockedOut: false);
        }
        var result = await signIn.PasswordSignInAsync(user, password, isPersistent: true, lockoutOnFailure: true);
        return new PasswordSignInOutcome(result.Succeeded ? user.Id : null, result.IsLockedOut);
    }

    public async Task<ExternalSignInOutcome?> CompleteExternalSignInAsync()
    {
        var info = await signIn.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return null;
        }

        try
        {
            var user = await FindOrCreateExternalUserAsync(info);
            if (user is null)
            {
                return null;
            }
            await signIn.SignInAsync(user, isPersistent: true);
            return new ExternalSignInOutcome(user.Id, info.Principal.FindFirstValue(ClaimTypes.Name));
        }
        finally
        {
            await signIn.Context.SignOutAsync(IdentityConstants.ExternalScheme);
        }
    }

    public Task SignOutAsync() => signIn.SignOutAsync();

    public async Task<string?> GetEmailAsync(Guid userId) => (await users.FindByIdAsync(userId.ToString()))?.Email;

    private async Task<ApplicationUser?> FindOrCreateExternalUserAsync(ExternalLoginInfo info)
    {
        var linked = await users.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
        if (linked is not null)
        {
            return await users.IsLockedOutAsync(linked) ? null : linked;
        }

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            if (!(await users.CreateAsync(user)).Succeeded)
            {
                return null;
            }
        }
        else if (!user.EmailConfirmed)
        {
            // Google has verified this address but our password account never was. Drop the password so
            // whoever registered it (possibly not the owner) can't keep access after the owner links Google.
            await users.RemovePasswordAsync(user);
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }

        return (await users.AddLoginAsync(user, info)).Succeeded ? user : null;
    }

    private static ValidationFailedException ToValidationFailure(IdentityResult result)
    {
        var errors = result.Errors
            .GroupBy(e => e.Code switch
            {
                var code when code.StartsWith("Password", StringComparison.Ordinal) => "password",
                "DuplicateEmail" or "DuplicateUserName" or "InvalidEmail" or "InvalidUserName" => "email",
                _ => string.Empty,
            })
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.Code is "DuplicateEmail" or "DuplicateUserName"
                    ? "An account with this email already exists."
                    : e.Description).Distinct().ToArray());
        return new ValidationFailedException(errors);
    }
}
