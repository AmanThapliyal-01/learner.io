namespace Learner.Domain.Common;

// Stored as strings in Postgres so the Python agents service can read them without a lookup.
public enum JobStatus { Queued, Running, Succeeded, Failed }

/// <summary>
/// Background work picked up by the Python agents worker (Postgres-backed queue).
/// Shared kernel: any module may enqueue work; each module owns its own job types.
/// </summary>
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
