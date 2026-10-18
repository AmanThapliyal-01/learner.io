using Learner.Domain.Common;

namespace Learner.Domain.Entities;

public class UserProfile : Entity
{
    public Guid UserId { get; set; }

    // Basic info (required during onboarding)
    public string FullName { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? AgeRange { get; set; }
    public string? CurrentStatus { get; set; }

    // Detailed profile (optional)
    public string? Profession { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? Education { get; set; }
    public List<string> Certifications { get; set; } = [];
    public List<string> Skills { get; set; } = [];
    public List<string> Hobbies { get; set; } = [];
    public string? ProfessionalSummary { get; set; }

    public bool OnboardingCompleted { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
