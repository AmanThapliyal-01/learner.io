namespace Learner.Application.Contracts.Learning;

/// <summary>Where the user is in setting up their goal.</summary>
public enum GoalStage { Chatting, Rating, Assessing, Confirmed }

public sealed record ActiveGoal(Guid Id, string? Title, GoalStage Stage);

/// <summary>Public API of the Learning module (goals, Asta chat, assessment).</summary>
public interface ILearningModule
{
    Task<ActiveGoal?> GetActiveGoalAsync(Guid userId, CancellationToken ct);
}
