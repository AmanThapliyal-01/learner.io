namespace Learner.Infrastructure.Agents;

/// <summary>Where the internal Python agents service lives and the shared token it expects.</summary>
public sealed class AgentServiceOptions
{
    public const string Section = "AgentService";
    public const string TokenHeader = "X-Service-Token";

    // 127.0.0.1, not localhost: on Windows "localhost" tries IPv6 first and each refused attempt costs ~2s.
    public string BaseUrl { get; set; } = "http://127.0.0.1:8001";
    public string Token { get; set; } = string.Empty;
}
