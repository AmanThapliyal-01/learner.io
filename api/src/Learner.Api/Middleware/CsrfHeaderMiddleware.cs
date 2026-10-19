using Microsoft.AspNetCore.Mvc;

namespace Learner.Api.Middleware;

/// <summary>
/// CSRF guard for cookie-authenticated API calls. State-changing /api requests must carry a custom
/// header; browsers won't send one cross-site without a CORS preflight, which this API never grants.
/// </summary>
public sealed class CsrfHeaderMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Requested-With";
    public const string HeaderValue = "learner-web";

    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        var isSafeMethod = HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method) || HttpMethods.IsOptions(request.Method);
        if (isSafeMethod || !request.Path.StartsWithSegments("/api") || request.Headers[HeaderName] == HeaderValue)
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Missing anti-forgery header.",
        });
    }
}
