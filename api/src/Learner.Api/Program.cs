using System.Text.Json;
using System.Text.Json.Serialization;
using Learner.Api.Auth;
using Learner.Api.Configuration;
using Learner.Api.Middleware;
using Learner.Application;
using Learner.Infrastructure;
using Learner.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddRepoDotEnv(builder.Environment);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddLearnerAuth(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase; // validation error keys
    });
// Used by TypedResults, including Asta's server-sent events: keep enums like MVC's and drop null fields.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}
else
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<CsrfHeaderMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapHealthChecks("/api/health").AllowAnonymous();
app.MapControllers();

app.Run();

// Lets integration tests host the app with WebApplicationFactory<Program>.
public partial class Program;
