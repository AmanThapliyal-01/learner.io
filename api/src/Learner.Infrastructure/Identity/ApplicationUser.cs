using Microsoft.AspNetCore.Identity;

namespace Learner.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public DateTimeOffset CreatedAt { get; set; }
}
