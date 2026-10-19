using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Learner.Api.Tests.Infrastructure;
using Learner.Domain.Common;
using Learner.Domain.Learning;
using Learner.Domain.Plans;
using Microsoft.EntityFrameworkCore;

namespace Learner.Api.Tests;

public class SkillCheckAndPlanTests(LearnerApiFactory factory) : IClassFixture<LearnerApiFactory>
{
    [Fact]
    public async Task Rating_must_cover_every_skill_on_the_goal()
    {
        var journey = await new Journey(factory).GoalConfirmedAsync();

        var response = await journey.Client.PutAsJsonAsync("/api/learning/ratings", new { ratings = new[] { new { skill = "Python", rating = 3 } } });

        await Expect.Status(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Skill_check_skips_never_used_skills_and_never_sends_answer_keys()
    {
        var journey = await new Journey(factory).RatedAsync();

        var assessment = await journey.GetJsonAsync("/api/learning/assessment");

        Assert.Equal(["RAG"], assessment.GetProperty("skippedSkills").EnumerateArray().Select(s => s.GetString()));
        var questions = assessment.GetProperty("questions").EnumerateArray().ToList();
        Assert.Equal(6, questions.Count); // 3 each for the two tested skills
        Assert.DoesNotContain(questions, q => q.TryGetProperty("answerKey", out _));
        Assert.DoesNotContain("Mentions the key idea", assessment.GetRawText());
    }

    [Fact]
    public async Task Submitting_grades_the_check_and_records_levels()
    {
        var journey = new Journey(factory);

        var results = await journey.CheckSubmittedAsync();

        var skills = results.GetProperty("skills").EnumerateArray().ToDictionary(s => s.GetProperty("skill").GetString()!);
        Assert.Equal(4, skills["Python"].GetProperty("assessedLevel").GetInt32());
        Assert.Equal(1, skills["RAG"].GetProperty("assessedLevel").GetInt32());
        Assert.Equal(4, skills["RAG"].GetProperty("targetLevel").GetInt32());
        await Expect.Status(await journey.Client.PostAsJsonAsync("/api/learning/assessment/submit", new { answers = Array.Empty<object>() }), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Plan_request_queues_one_job_with_a_full_snapshot()
    {
        var journey = new Journey(factory);

        var plan = await journey.PlanRequestedAsync();

        Assert.Equal("generating", plan.GetProperty("phase").GetString());
        var planId = plan.GetProperty("id").GetGuid();
        await factory.WithDbAsync(async db =>
        {
            // Payload is jsonb, so match it after loading rather than with a SQL LIKE.
            var job = (await db.Jobs.AsNoTracking().ToListAsync()).Single(j => j.Payload.Contains(planId.ToString()));
            Assert.Equal(PlanJobTypes.GeneratePlan, job.Type);
            Assert.Equal(JobStatus.Queued, job.Status);
            using var payload = JsonDocument.Parse(job.Payload);
            Assert.Equal("Become an AI engineer", payload.RootElement.GetProperty("goal").GetProperty("title").GetString());
            Assert.Equal("India", payload.RootElement.GetProperty("profile").GetProperty("country").GetString());
            Assert.Equal(3, payload.RootElement.GetProperty("skills").GetArrayLength());
            Assert.True(payload.RootElement.GetProperty("skills")[0].TryGetProperty("assessed_level", out _));
        });
        await Expect.Status(await journey.Client.PostAsync("/api/plans", null), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Only_a_stale_plan_can_be_regenerated()
    {
        var journey = new Journey(factory);
        var planId = (await journey.PlanRequestedAsync()).GetProperty("id").GetGuid();
        await MarkReadyAsync(planId, generatedDaysAgo: 1);

        await Expect.Status(await journey.Client.PostAsync("/api/plans/regenerate", null), HttpStatusCode.Conflict);

        await MarkReadyAsync(planId, generatedDaysAgo: 31);
        Assert.Equal("plan_stale", (await journey.GetJsonAsync("/api/dashboard")).GetProperty("state").GetString());

        var regenerated = await journey.Client.PostAsync("/api/plans/regenerate", null);
        await Expect.Status(regenerated, HttpStatusCode.OK);
        var newPlan = await regenerated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotEqual(planId, newPlan.GetProperty("id").GetGuid());
        await factory.WithDbAsync(async db =>
            Assert.Equal(PlanStatus.Archived, (await db.Plans.SingleAsync(p => p.Id == planId)).Status));
    }

    [Fact]
    public async Task Changing_goal_archives_the_goal_and_its_plan()
    {
        var journey = new Journey(factory);
        var planId = (await journey.PlanRequestedAsync()).GetProperty("id").GetGuid();

        await Expect.Status(await journey.Client.PostAsync("/api/goal/change", null), HttpStatusCode.NoContent);

        Assert.Equal("no_goal", (await journey.GetJsonAsync("/api/dashboard")).GetProperty("state").GetString());
        Assert.Empty((await journey.GetJsonAsync("/api/asta/conversation")).GetProperty("messages").EnumerateArray());
        await factory.WithDbAsync(async db =>
        {
            Assert.Equal(PlanStatus.Archived, (await db.Plans.SingleAsync(p => p.Id == planId)).Status);
            var userGoals = await db.Goals.Where(g => g.Title == "Become an AI engineer" && g.Id == db.Plans.Single(p => p.Id == planId).GoalId).ToListAsync();
            Assert.All(userGoals, g => Assert.Equal(GoalStatus.Archived, g.Status));
        });
    }

    private Task MarkReadyAsync(Guid planId, int generatedDaysAgo) => factory.WithDbAsync(async db =>
    {
        var plan = await db.Plans.SingleAsync(p => p.Id == planId);
        plan.Status = PlanStatus.Ready;
        plan.Content = "{\"summary\":\"A plan\",\"phases\":[]}";
        plan.GeneratedAt = DateTimeOffset.UtcNow.AddDays(-generatedDaysAgo);
        await db.SaveChangesAsync();
    });
}
