using Learner.Application.Common;
using Learner.Application.Contracts.Learning;
using Learner.Application.Contracts.Plans;

namespace Learner.Application.Dashboard;

/// <summary>Starting over with a new goal (PRD FR-12, FR-29): spans modules, so it composes their contracts.</summary>
public sealed class GoalChangeService(ILearningModule learning, IPlansModule plans, ICurrentUser currentUser)
{
    public async Task ChangeGoalAsync(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        // Plan first: if the goal step fails, the user still has a consistent "no plan, goal in place" state.
        await plans.ArchiveActivePlanAsync(userId, ct);
        if (!await learning.ArchiveActiveGoalAsync(userId, ct))
        {
            throw new NotFoundException("There's no goal to change yet.");
        }
    }
}
