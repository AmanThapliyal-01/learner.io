namespace Learner.Application.Common;

/// <summary>The signed-in user for the current request.</summary>
public interface ICurrentUser
{
    /// <summary>Throws <see cref="UnauthorizedException"/> when nobody is signed in.</summary>
    Guid UserId { get; }
}
