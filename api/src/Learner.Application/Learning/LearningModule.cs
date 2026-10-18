using Learner.Application.Contracts.Learning;
using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Learning;

internal sealed class LearningModule(ILearningDb db) : ILearningModule
{
    public async Task<ActiveGoal?> GetActiveGoalAsync(Guid userId, CancellationToken ct)
    {
        var goal = await db.Goals.AsNoTracking()
            .Where(g => g.UserId == userId && g.Status != GoalStatus.Archived)
            .Select(g => new { g.Id, g.Title, g.Status })
            .FirstOrDefaultAsync(ct);
        return goal is null ? null : new ActiveGoal(goal.Id, goal.Title, ToStage(goal.Status));
    }

    private static GoalStage ToStage(GoalStatus status) => status switch
    {
        GoalStatus.Chatting => GoalStage.Chatting,
        GoalStatus.Rating => GoalStage.Rating,
        GoalStatus.Assessing => GoalStage.Assessing,
        GoalStatus.Confirmed => GoalStage.Confirmed,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Archived goals are never active."),
    };
}
