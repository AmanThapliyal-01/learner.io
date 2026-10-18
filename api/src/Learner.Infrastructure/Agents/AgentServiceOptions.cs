namespace Learner.Infrastructure.Agents;

/// <summary>Where the internal Python agents service lives and the shared token it expects.</summary>
public sealed class AgentServiceOptions
{
    public const string Section = "AgentService";
    public const string TokenHeader = "X-Service-Token";

    public string BaseUrl { get; set; } = "http://localhost:8001";
    public string Token { get; set; } = string.Empty;
}
