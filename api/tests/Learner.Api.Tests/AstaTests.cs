using System.Net;
using System.Text.Json;
using Learner.Api.Tests.Infrastructure;
using Learner.Application.Learning.Asta;
using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Api.Tests;

public class AstaTests(LearnerApiFactory factory) : IClassFixture<LearnerApiFactory>
{
    [Fact]
    public async Task Reply_streams_to_the_browser_and_both_messages_are_stored()
    {
        var journey = await new Journey(factory).OnboardedAsync();
        factory.Asta.Reply = _ => FakeAstaAgent.Says("Great goal. ", "How many hours a week?");

        var events = await journey.SendToAstaAsync("I want to become an AI engineer");

        Assert.Equal(["token", "token", "done"], events.Select(e => e.GetProperty("type").GetString()));
        var conversation = await journey.GetJsonAsync("/api/asta/conversation");
        var messages = conversation.GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(["user", "assistant"], messages.Select(m => m.GetProperty("role").GetString()));
        Assert.Equal("Great goal. How many hours a week?", messages[1].GetProperty("content").GetString());
        Assert.Equal("chatting", conversation.GetProperty("stage").GetString());
    }

    [Fact]
    public async Task Goal_checklist_streams_live_and_survives_a_reload()
    {
        var journey = await new Journey(factory).OnboardedAsync();
        var checklist = JsonSerializer.SerializeToElement(new[] { new { label = "Goal", done = true }, new { label = "Why now", done = false } });
        factory.Asta.Reply = _ => [new AstaAgentEvent(AstaAgentEvent.ProgressType, Progress: checklist), .. FakeAstaAgent.Says("Why now?")];

        var events = await journey.SendToAstaAsync("I want to become an AI engineer");

        Assert.Equal(["progress", "token", "done"], events.Select(e => e.GetProperty("type").GetString()));
        Assert.Equal("Goal", events[0].GetProperty("progress")[0].GetProperty("label").GetString());
        var conversation = await journey.GetJsonAsync("/api/asta/conversation");
        Assert.False(conversation.GetProperty("progress")[1].GetProperty("done").GetBoolean());
    }

    [Fact]
    public async Task Asta_sees_the_profile_and_the_history()
    {
        var journey = await new Journey(factory).OnboardedAsync();
        factory.Asta.Reply = _ => FakeAstaAgent.Says("Noted.");
        factory.Asta.Requests.Clear();

        await journey.SendToAstaAsync("First");
        await journey.SendToAstaAsync("Second");

        var last = factory.Asta.Requests[^1];
        Assert.Equal("India", last.Profile?.Country);
        Assert.Equal(["user", "assistant", "user"], last.Messages.Select(m => m.Role));
        Assert.Equal("Second", last.Messages[^1].Content);
    }

    [Fact]
    public async Task Failed_first_turn_leaves_no_message_and_no_empty_goal()
    {
        var journey = await new Journey(factory).OnboardedAsync();
        factory.Asta.Reply = _ => FakeAstaAgent.Fails();

        var events = await journey.SendToAstaAsync("Hello?");

        Assert.Equal("error", events.Single().GetProperty("type").GetString());
        var dashboard = await journey.GetJsonAsync("/api/dashboard");
        Assert.Equal("no_goal", dashboard.GetProperty("state").GetString());
    }

    [Fact]
    public async Task Goal_is_confirmed_only_from_Astas_latest_card()
    {
        var journey = await new Journey(factory).OnboardedAsync();
        factory.Asta.Reply = _ => FakeAstaAgent.Says("Tell me more.");
        await journey.SendToAstaAsync("AI engineer");

        await Expect.Status(await journey.Client.PostAsync("/api/asta/goal/confirm", null), HttpStatusCode.Conflict);

        factory.Asta.Reply = _ => FakeAstaAgent.ShowsCard(Journey.GoalCard());
        await journey.SendToAstaAsync("6 hours, hands-on, free only");
        await Expect.Status(await journey.Client.PostAsync("/api/asta/goal/confirm", null), HttpStatusCode.OK);

        var dashboard = await journey.GetJsonAsync("/api/dashboard");
        Assert.Equal("goal_in_progress", dashboard.GetProperty("state").GetString());
        Assert.Equal("rating", dashboard.GetProperty("goal").GetProperty("stage").GetString());
        await factory.WithDbAsync(async db =>
        {
            var goal = await db.Goals.SingleAsync(g => g.Title == "Become an AI engineer" && g.Status == GoalStatus.Rating && g.HoursPerWeek == 6);
            Assert.Contains("hands_on", goal.Preferences);
        });
    }

    [Fact]
    public async Task Confirmed_goal_does_not_accept_more_chat()
    {
        var journey = await new Journey(factory).GoalConfirmedAsync();

        var response = await journey.Client.PostAsync("/api/asta/messages", JsonContent("{\"content\":\"one more thing\"}"));

        await Expect.Status(response, HttpStatusCode.Conflict);
    }

    private static StringContent JsonContent(string json) => new(json, System.Text.Encoding.UTF8, "application/json");
}
