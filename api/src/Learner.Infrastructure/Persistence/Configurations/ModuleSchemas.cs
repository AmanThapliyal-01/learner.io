namespace Learner.Infrastructure.Persistence.Configurations;

/// <summary>Postgres schema per module. The Python agents service reads plans.plans and queue.jobs.</summary>
internal static class ModuleSchemas
{
    public const string Identity = "identity";
    public const string Profiles = "profiles";
    public const string Learning = "learning";
    public const string Plans = "plans";
    public const string Queue = "queue";
}

internal static class ColumnTypes
{
    public const string Jsonb = "jsonb";
}
