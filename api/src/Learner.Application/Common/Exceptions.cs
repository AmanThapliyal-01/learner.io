namespace Learner.Application.Common;

/// <summary>Expected failures that the API turns into problem responses (see GlobalExceptionHandler).</summary>
public abstract class AppException(string message) : Exception(message);

public sealed class NotFoundException(string message) : AppException(message);

public sealed class ConflictException(string message) : AppException(message);

public sealed class UnauthorizedException(string message) : AppException(message);

/// <summary>A dependency (the AI agents service) is busy or down. RetryAt is set when we know when to try again.</summary>
public sealed class ServiceUnavailableException(string message, DateTimeOffset? retryAt = null) : AppException(message)
{
    public DateTimeOffset? RetryAt { get; } = retryAt;
}

public sealed class ValidationFailedException(IDictionary<string, string[]> errors)
    : AppException("Please fix the highlighted fields.")
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static ValidationFailedException For(string field, string error) =>
        new(new Dictionary<string, string[]> { [field] = [error] });
}
