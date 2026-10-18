using Learner.Domain.Common;
using Learner.Domain.Enums;

namespace Learner.Domain.Entities;

public class ChatMessage : Entity
{
    public Guid GoalId { get; set; }
    public ChatRole Role { get; set; }
    public string Content { get; set; } = string.Empty;

    /// <summary>Structured tool call or result attached to the message, e.g. the goal summary card (JSON).</summary>
    public string? ToolPayload { get; set; }
}
