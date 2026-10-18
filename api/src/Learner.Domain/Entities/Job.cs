using Learner.Domain.Common;
using Learner.Domain.Enums;

namespace Learner.Domain.Entities;

/// <summary>Background work picked up by the Python agents worker (Postgres-backed queue).</summary>
public class Job : Entity
{
    public const int MaxAttempts = 3;

    public string Type { get; set; } = string.Empty;
    public string Payload { get; set; } = "{}";
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public int Attempts { get; set; }
    public DateTimeOffset? LockedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? LastError { get; set; }
}

public static class JobTypes
{
    public const string GeneratePlan = "generate_plan";
}
