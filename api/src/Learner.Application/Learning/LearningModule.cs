using System.Text.Json;
using Learner.Application.Contracts.Learning;
using Learner.Application.Learning.SkillCheck;
using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Learning;

internal sealed class LearningModule(ILearningDb db, TimeProvider clock) : ILearningModule
{
    public async Task<ActiveGoal?> GetActiveGoalAsync(Guid userId, CancellationToken ct)
    {
        var goal = await db.Goals.AsNoTracking()
            .Where(g => g.UserId == userId && g.Status != GoalStatus.Archived)
            .Select(g => new { g.Id, g.Title, g.Status })
            .FirstOrDefaultAsync(ct);
        return goal is null ? null : new ActiveGoal(goal.Id, goal.Title, ToStage(goal.Status));
    }

    public async Task<PlanningInput?> GetPlanningInputAsync(Guid userId, CancellationToken ct)
    {
        var goal = await db.Goals.AsNoTracking()
            .FirstOrDefaultAsync(g => g.UserId == userId && g.Status != GoalStatus.Archived, ct);
        if (goal?.Summary is null)
        {
            return null;
        }
        var assessment = await db.Assessments.AsNoTracking()
            .Where(a => a.GoalId == goal.Id && a.Status == AssessmentStatus.Completed)
            .OrderByDescending(a => a.CompletedAt)
            .FirstOrDefaultAsync(ct);
        if (assessment is null)
        {
            return null;
        }

        var insights = AssessmentService.ParseResults(assessment.Results).ToDictionary(r => r.Skill, StringComparer.OrdinalIgnoreCase);
        var ratings = await db.SkillRatings.AsNoTracking().Where(r => r.GoalId == goal.Id).ToListAsync(ct);
        var skills = ratings.Select(r =>
        {
            var insight = insights.GetValueOrDefault(r.Skill);
            return new AssessedSkill(r.Skill, r.SelfRating, r.AssessedLevel ?? 1, r.TargetLevel ?? 3, insight?.Strengths ?? [], insight?.Gaps ?? []);
        }).ToList();
        return new PlanningInput(goal.Id, JsonDocument.Parse(goal.Summary).RootElement.Clone(), skills);
    }

    public async Task MarkGoalPlannedAsync(Guid goalId, CancellationToken ct)
    {
        var goal = await db.Goals.FirstAsync(g => g.Id == goalId, ct);
        goal.Status = GoalStatus.Confirmed;
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> ArchiveActiveGoalAsync(Guid userId, CancellationToken ct)
    {
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.UserId == userId && g.Status != GoalStatus.Archived, ct);
        if (goal is null)
        {
            return false;
        }
        goal.Archive(clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return true;
    }

    internal static GoalStage ToStage(GoalStatus status) => status switch
    {
        GoalStatus.Chatting => GoalStage.Chatting,
        GoalStatus.Rating => GoalStage.Rating,
        GoalStatus.Assessing => GoalStage.Assessing,
        GoalStatus.Confirmed => GoalStage.Confirmed,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Archived goals are never active."),
    };
}
