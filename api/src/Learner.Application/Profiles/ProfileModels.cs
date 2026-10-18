using System.ComponentModel.DataAnnotations;

namespace Learner.Application.Profiles;

public sealed record BasicInfoRequest(
    [Required, MaxLength(120)] string FullName,
    [Required, MaxLength(80)] string Country,
    [Required, MaxLength(20)] string AgeRange,
    [Required, MaxLength(40)] string CurrentStatus);

public sealed record ProfileDetailsRequest(
    [MaxLength(120)] string? Profession,
    [Range(0, 60)] int? YearsOfExperience,
    [MaxLength(400)] string? Education,
    [MaxLength(ProfileLimits.MaxListItems)] List<string>? Certifications,
    [MaxLength(ProfileLimits.MaxListItems)] List<string>? Skills,
    [MaxLength(ProfileLimits.MaxListItems)] List<string>? Hobbies,
    [MaxLength(4000)] string? ProfessionalSummary);

public sealed record ProfileResponse(
    string FullName,
    string? Country,
    string? AgeRange,
    string? CurrentStatus,
    string? Profession,
    int? YearsOfExperience,
    string? Education,
    IReadOnlyList<string> Certifications,
    IReadOnlyList<string> Skills,
    IReadOnlyList<string> Hobbies,
    string? ProfessionalSummary,
    bool OnboardingCompleted);

public static class ProfileLimits
{
    public const int MaxListItems = 30;
    public const int MaxListItemLength = 80;
}
