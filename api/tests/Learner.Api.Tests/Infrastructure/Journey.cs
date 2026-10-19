using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Learner.Api.Tests.Infrastructure;

/// <summary>Drives one signed-in user through the product's steps, so tests can start from any point.</summary>
public sealed class Journey(LearnerApiFactory factory)
{
    public static readonly string[] Skills = ["Python", "Prompt design", "RAG"];

    public HttpClient Client { get; } = factory.CreateBrowserClient();

    public string Email { get; } = $"user-{Guid.NewGuid():N}@example.test";

    public static JsonElement GoalCard(params string[] skills) => JsonSerializer.SerializeToElement(new
    {
        goal_type = "professional",
        title = "Become an AI engineer",
        target_outcome = "Ship LLM features",
        motivation = "My team is adopting AI",
        hours_per_week = 6,
        timeline = "4 months",
        learning_style = "hands_on",
        budget = "free_only",
        skills = skills.Length > 0 ? skills : Skills,
        current_experience = "Backend developer",
    });

    public async Task<Journey> SignedUpAsync()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new { email = Email, password = "password123", fullName = "Test User" });
        await Expect.Status(response, HttpStatusCode.OK);
        return this;
    }

    public async Task<Journey> OnboardedAsync()
    {
        await SignedUpAsync();
        await Expect.Status(
            await Client.PutAsJsonAsync("/api/profile/basic", new { fullName = "Test User", country = "India", ageRange = "25-34", currentStatus = "working" }),
            HttpStatusCode.OK);
        await Expect.Status(await Client.PostAsync("/api/profile/onboarding/complete", null), HttpStatusCode.OK);
        return this;
    }

    /// <summary>One Asta turn; returns the server-sent events as parsed JSON.</summary>
    public async Task<List<JsonElement>> SendToAstaAsync(string text)
    {
        var response = await Client.PostAsJsonAsync("/api/asta/messages", new { content = text });
        await Expect.Status(response, HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        return body.Split('\n')
            .Where(line => line.StartsWith("data:", StringComparison.Ordinal))
            .Select(line => JsonDocument.Parse(line[5..].Trim()).RootElement.Clone())
            .ToList();
    }

    public async Task<Journey> GoalConfirmedAsync()
    {
        await OnboardedAsync();
        factory.Asta.Reply = _ => FakeAstaAgent.ShowsCard(GoalCard());
        await SendToAstaAsync("I want to become an AI engineer");
        await Expect.Status(await Client.PostAsync("/api/asta/goal/confirm", null), HttpStatusCode.OK);
        return this;
    }

    /// <summary>Rates Python 4, Prompt design 2, RAG 1 (never used, so not tested).</summary>
    public async Task<Journey> RatedAsync()
    {
        await GoalConfirmedAsync();
        var ratings = new[] { 4, 2, 1 }.Select((r, i) => new { skill = Skills[i], rating = r });
        await Expect.Status(await Client.PutAsJsonAsync("/api/learning/ratings", new { ratings }), HttpStatusCode.NoContent);
        return this;
    }

    public async Task<JsonElement> GetJsonAsync(string path)
    {
        var response = await Client.GetAsync(path);
        await Expect.Status(response, HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>Takes the skill check and answers every question correctly; returns the results.</summary>
    public async Task<JsonElement> CheckSubmittedAsync()
    {
        await RatedAsync();
        var assessment = await GetJsonAsync("/api/learning/assessment");
        var answers = assessment.GetProperty("questions").EnumerateArray().Select(q => new
        {
            questionId = q.GetProperty("id").GetGuid(),
            answer = q.GetProperty("kind").GetString() == "multiple_choice" ? FakeAssessmentAgent.CorrectOption : "A clear explanation.",
        });
        var response = await Client.PostAsJsonAsync("/api/learning/assessment/submit", new { answers });
        await Expect.Status(response, HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public async Task<JsonElement> PlanRequestedAsync()
    {
        await CheckSubmittedAsync();
        var response = await Client.PostAsync("/api/plans", null);
        await Expect.Status(response, HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}

public static class Expect
{
    /// <summary>Asserts a status code, showing the response body when it doesn't match.</summary>
    public static async Task Status(HttpResponseMessage response, HttpStatusCode expected)
    {
        if (response.StatusCode != expected)
        {
            var body = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Expected {(int)expected} {expected} but got {(int)response.StatusCode}: {body}");
        }
    }
}
