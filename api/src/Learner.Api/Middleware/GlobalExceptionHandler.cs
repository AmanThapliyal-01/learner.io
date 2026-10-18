using Learner.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Middleware;

/// <summary>
/// Turns exceptions into RFC 7807 problem responses. Expected <see cref="AppException"/>s map to 4xx with
/// their message; anything else is logged and returned as a generic 500 without leaking details.
/// </summary>
public sealed class GlobalExceptionHandler(IProblemDetailsService problemDetails, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            ValidationFailedException e => new ValidationProblemDetails(e.Errors) { Title = e.Message },
            NotFoundException e => new ProblemDetails { Title = e.Message, Status = StatusCodes.Status404NotFound },
            ConflictException e => new ProblemDetails { Title = e.Message, Status = StatusCodes.Status409Conflict },
            UnauthorizedException e => new ProblemDetails { Title = e.Message, Status = StatusCodes.Status401Unauthorized },
            _ => null,
        };

        if (problem is null)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
            problem = new ProblemDetails { Title = "Something went wrong on our side.", Status = StatusCodes.Status500InternalServerError };
        }
        problem.Status ??= StatusCodes.Status400BadRequest;

        httpContext.Response.StatusCode = problem.Status.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }
}
