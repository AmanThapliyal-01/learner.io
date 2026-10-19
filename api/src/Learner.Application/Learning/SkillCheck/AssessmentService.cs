using System.Text.Json;
using Learner.Application.Common;
using Learner.Application.Contracts.Profiles;
using Learner.Domain.Learning;
using Microsoft.EntityFrameworkCore;

namespace Learner.Application.Learning.SkillCheck;

/// <summary>Self-rating, the generated skill check, and its results. All within the user's active goal.</summary>
public sealed class AssessmentService(
    ILearningDb db,
    IAssessmentAgent agent,
    IProfilesModule profiles,
    ICurrentUser currentUser,
    TimeProvider clock)
{
    private static readonly JsonSerializerOptions SnakeCase = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<RatingFormResponse> GetRatingFormAsync(CancellationToken ct)
    {
        var goal = await GoalInStageAsync(ct, GoalStatus.Rating, GoalStatus.Assessing);
        var ratings = await db.SkillRatings.AsNoTracking().Where(r => r.GoalId == goal.Id).ToDictionaryAsync(r => r.Skill, r => r.SelfRating, ct);
        var skills = SkillsOf(goal).Select(s => new SkillToRate(s, ratings.TryGetValue(s, out var r) ? r : null)).ToList();
        return new RatingFormResponse(goal.Title ?? "Your goal", LearningModule.ToStage(goal.Status), skills);
    }

    /// <summary>Saves the self-ratings. Re-rating discards an unfinished check so the next one matches.</summary>
    public async Task SaveRatingsAsync(RateSkillsRequest request, CancellationToken ct)
    {
        var goal = await GoalInStageAsync(ct, GoalStatus.Rating, GoalStatus.Assessing);
        var skills = SkillsOf(goal);
        var bySkill = request.Ratings.ToDictionary(r => r.Skill, r => r.Rating, StringComparer.OrdinalIgnoreCase);
        var missing = skills.Where(s => !bySkill.ContainsKey(s)).ToList();
        if (missing.Count > 0)
        {
            throw ValidationFailedException.For("ratings", $"Rate every skill: {string.Join(", ", missing)}.");
        }

        await db.SkillRatings.Where(r => r.GoalId == goal.Id).ExecuteDeleteAsync(ct);
        await db.Assessments.Where(a => a.GoalId == goal.Id && a.Status != AssessmentStatus.Completed).ExecuteDeleteAsync(ct);
        db.SkillRatings.AddRange(skills.Select(s => new SkillRating { GoalId = goal.Id, Skill = s, SelfRating = bySkill[s] }));
        goal.Status = GoalStatus.Assessing;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>The open check, generated on first request (takes a few seconds).</summary>
    public async Task<AssessmentResponse> GetOrCreateAssessmentAsync(CancellationToken ct)
    {
        var goal = await GoalInStageAsync(ct, GoalStatus.Assessing);
        var ratings = await db.SkillRatings.Where(r => r.GoalId == goal.Id).ToListAsync(ct);
        var assessment = await LatestAssessmentQuery(goal.Id).FirstOrDefaultAsync(ct);

        if (assessment is null)
        {
            var generated = await agent.GenerateAsync(
                new GenerateAssessmentRequest(
                    GoalJson(goal),
                    await profiles.GetSnapshotAsync(goal.UserId, ct),
                    ratings.Select(r => new AgentRatedSkill(r.Skill, r.SelfRating)).ToList()),
                ct);

            var targets = generated.Targets.ToDictionary(t => t.Skill, t => t.TargetLevel, StringComparer.OrdinalIgnoreCase);
            foreach (var rating in ratings)
            {
                rating.TargetLevel = targets.GetValueOrDefault(rating.Skill, 3);
            }
            assessment = new Assessment { GoalId = goal.Id, Status = AssessmentStatus.InProgress };
            assessment.Questions.AddRange(generated.Questions.Select((q, i) => new AssessmentQuestion
            {
                Skill = q.Skill,
                Kind = q.Kind == "short_answer" ? QuestionKind.ShortAnswer : QuestionKind.MultipleChoice,
                Prompt = q.Prompt,
                Options = q.Options is null ? null : JsonSerializer.Serialize(q.Options),
                AnswerKey = q.AnswerKey,
                Order = i,
            }));
            db.Assessments.Add(assessment);
            await db.SaveChangesAsync(ct);
        }

        var tested = assessment.Questions.Select(q => q.Skill).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return new AssessmentResponse(
            assessment.Id,
            assessment.Status.ToString(),
            assessment.Questions.OrderBy(q => q.Order).Select(ToResponse).ToList(),
            ratings.Where(r => !tested.Contains(r.Skill)).Select(r => r.Skill).ToList());
    }

    public async Task<AssessmentResultsResponse> SubmitAsync(SubmitAnswersRequest request, CancellationToken ct)
    {
        var goal = await GoalInStageAsync(ct, GoalStatus.Assessing);
        var assessment = await LatestAssessmentQuery(goal.Id).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("There's no skill check to submit yet.");
        if (assessment.Status == AssessmentStatus.Completed)
        {
            throw new ConflictException("This skill check is already submitted.");
        }

        var answers = request.Answers.ToDictionary(a => a.QuestionId, a => a.Answer?.Trim());
        foreach (var question in assessment.Questions)
        {
            question.UserAnswer = answers.GetValueOrDefault(question.Id);
        }
        var ratings = await db.SkillRatings.Where(r => r.GoalId == goal.Id).ToListAsync(ct);

        var graded = await agent.GradeAsync(
            new GradeAssessmentRequest(
                GoalJson(goal),
                ratings.Select(r => new AgentRatedSkill(r.Skill, r.SelfRating)).ToList(),
                assessment.Questions.Select(q => new AgentAnsweredQuestion(
                    q.Id.ToString(), q.Skill, q.Kind == QuestionKind.ShortAnswer ? "short_answer" : "multiple_choice",
                    q.Prompt, OptionsOf(q), q.AnswerKey, q.UserAnswer)).ToList()),
            ct);

        var grades = graded.Grades.ToDictionary(g => g.Id);
        foreach (var question in assessment.Questions)
        {
            if (grades.TryGetValue(question.Id.ToString(), out var grade))
            {
                question.Score = (decimal)grade.Score;
                question.Feedback = grade.Feedback;
            }
        }
        var results = graded.Skills.ToDictionary(s => s.Skill, StringComparer.OrdinalIgnoreCase);
        foreach (var rating in ratings)
        {
            rating.AssessedLevel = results.TryGetValue(rating.Skill, out var result) ? result.AssessedLevel : 1;
        }
        assessment.Results = JsonSerializer.Serialize(graded.Skills, SnakeCase);
        assessment.Status = AssessmentStatus.Completed;
        assessment.CompletedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return BuildResults(goal, assessment, ratings);
    }

    public async Task<AssessmentResultsResponse> GetResultsAsync(CancellationToken ct)
    {
        var goal = await ActiveGoalQuery().AsNoTracking().FirstOrDefaultAsync(ct) ?? throw new NotFoundException("No active goal.");
        var assessment = await LatestAssessmentQuery(goal.Id).AsNoTracking().FirstOrDefaultAsync(a => a.Status == AssessmentStatus.Completed, ct)
            ?? throw new NotFoundException("You haven't finished a skill check yet.");
        var ratings = await db.SkillRatings.AsNoTracking().Where(r => r.GoalId == goal.Id).ToListAsync(ct);
        return BuildResults(goal, assessment, ratings);
    }

    internal static IReadOnlyList<AgentSkillResult> ParseResults(string? json) =>
        json is null ? [] : JsonSerializer.Deserialize<List<AgentSkillResult>>(json, SnakeCase) ?? [];

    private static AssessmentResultsResponse BuildResults(Goal goal, Assessment assessment, IReadOnlyList<SkillRating> ratings)
    {
        var results = ParseResults(assessment.Results).ToDictionary(r => r.Skill, StringComparer.OrdinalIgnoreCase);
        var skills = ratings.Select(r =>
        {
            var result = results.GetValueOrDefault(r.Skill);
            return new SkillResultResponse(
                r.Skill, r.SelfRating, r.AssessedLevel ?? 1, r.TargetLevel ?? 3, result?.Score,
                result?.Strengths ?? [], result?.Gaps ?? [], result?.Summary ?? string.Empty);
        }).ToList();
        var questions = assessment.Questions.OrderBy(q => q.Order)
            .Select(q => new QuestionFeedbackResponse(q.Id, q.Skill, q.Prompt, (double)(q.Score ?? 0), q.Feedback ?? string.Empty))
            .ToList();
        return new AssessmentResultsResponse(assessment.Id, goal.Title ?? "Your goal", skills, questions);
    }

    private async Task<Goal> GoalInStageAsync(CancellationToken ct, params GoalStatus[] stages)
    {
        var goal = await ActiveGoalQuery().FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Set a goal with Asta first.");
        if (!stages.Contains(goal.Status))
        {
            throw new ConflictException(goal.Status switch
            {
                GoalStatus.Chatting => "Confirm your goal with Asta first.",
                GoalStatus.Rating => "Rate your skills first.",
                _ => "Your skill check is already done for this goal.",
            });
        }
        return goal;
    }

    private IQueryable<Goal> ActiveGoalQuery()
    {
        var userId = currentUser.UserId;
        return db.Goals.Where(g => g.UserId == userId && g.Status != GoalStatus.Archived);
    }

    private IQueryable<Assessment> LatestAssessmentQuery(Guid goalId) =>
        db.Assessments.Include(a => a.Questions).Where(a => a.GoalId == goalId).OrderByDescending(a => a.CreatedAt);

    private static List<string> SkillsOf(Goal goal) =>
        goal.Summary is null ? [] : JsonSerializer.Deserialize<GoalSkills>(goal.Summary)?.skills ?? [];

    private static JsonElement GoalJson(Goal goal) => JsonDocument.Parse(goal.Summary ?? "{}").RootElement.Clone();

    private static IReadOnlyList<string>? OptionsOf(AssessmentQuestion q) =>
        q.Options is null ? null : JsonSerializer.Deserialize<List<string>>(q.Options);

    private static AssessmentQuestionResponse ToResponse(AssessmentQuestion q) =>
        new(q.Id, q.Skill, q.Kind == QuestionKind.ShortAnswer ? "short_answer" : "multiple_choice", q.Prompt, OptionsOf(q));

    // The goal summary is stored as the agents service produced it (snake_case).
    private sealed record GoalSkills(List<string> skills);
}
