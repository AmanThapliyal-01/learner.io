using System.ComponentModel.DataAnnotations;

namespace Learner.Application.Identity;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8), MaxLength(128)] string Password,
    [Required, MaxLength(120)] string FullName);

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record MeResponse(Guid Id, string Email, string? FullName, bool OnboardingCompleted);

public sealed record AuthProvidersResponse(bool Google);
