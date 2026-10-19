using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Learner.Api.Tests.Infrastructure;

namespace Learner.Api.Tests;

public class AuthAndProfileTests(LearnerApiFactory factory) : IClassFixture<LearnerApiFactory>
{
    [Fact]
    public async Task Register_signs_the_user_in()
    {
        var journey = await new Journey(factory).SignedUpAsync();

        var me = await journey.GetJsonAsync("/api/auth/me");

        Assert.Equal(journey.Email, me.GetProperty("email").GetString());
        Assert.Equal("Test User", me.GetProperty("fullName").GetString());
        Assert.False(me.GetProperty("onboardingCompleted").GetBoolean());
    }

    [Fact]
    public async Task Duplicate_email_is_rejected_on_the_email_field()
    {
        var first = await new Journey(factory).SignedUpAsync();
        var client = factory.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new { email = first.Email, password = "password123", fullName = "Someone" });

        await Expect.Status(response, HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("An account with this email already exists.", problem.GetProperty("errors").GetProperty("email")[0].GetString());
    }

    [Fact]
    public async Task Writes_without_the_csrf_header_are_refused()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new { email = "x@example.test", password = "password123", fullName = "X" });

        await Expect.Status(response, HttpStatusCode.Forbidden);
    }

    [Theory]
    [InlineData("/api/auth/me")]
    [InlineData("/api/profile")]
    [InlineData("/api/dashboard")]
    [InlineData("/api/asta/conversation")]
    [InlineData("/api/plans/current")]
    public async Task Signed_out_requests_get_401(string path)
    {
        var response = await factory.CreateBrowserClient().GetAsync(path);

        await Expect.Status(response, HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Wrong_password_is_refused_and_logout_ends_the_session()
    {
        var journey = await new Journey(factory).SignedUpAsync();
        var other = factory.CreateBrowserClient();

        await Expect.Status(
            await other.PostAsJsonAsync("/api/auth/login", new { email = journey.Email, password = "not-the-password" }),
            HttpStatusCode.Unauthorized);
        await Expect.Status(
            await other.PostAsJsonAsync("/api/auth/login", new { email = journey.Email, password = "password123" }),
            HttpStatusCode.OK);
        await Expect.Status(await other.PostAsync("/api/auth/logout", null), HttpStatusCode.NoContent);

        await Expect.Status(await other.GetAsync("/api/auth/me"), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Details_need_basic_info_first_and_then_complete_onboarding()
    {
        var journey = await new Journey(factory).SignedUpAsync();
        var details = new { profession = "Backend developer", yearsOfExperience = 3, skills = new[] { " C# ", "c#", "SQL", "" } };

        await Expect.Status(await journey.Client.PutAsJsonAsync("/api/profile/details", details), HttpStatusCode.BadRequest);

        await Expect.Status(
            await journey.Client.PutAsJsonAsync("/api/profile/basic", new { fullName = "Test User", country = "India", ageRange = "25-34", currentStatus = "working" }),
            HttpStatusCode.OK);
        var saved = await journey.Client.PutAsJsonAsync("/api/profile/details", details);
        await Expect.Status(saved, HttpStatusCode.OK);

        var profile = await saved.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["C#", "SQL"], profile.GetProperty("skills").EnumerateArray().Select(s => s.GetString()));
        Assert.True((await journey.GetJsonAsync("/api/auth/me")).GetProperty("onboardingCompleted").GetBoolean());
    }
}
