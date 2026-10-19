namespace Learner.Domain.Common;

/// <summary>Base for every persisted domain entity: time-ordered Guid key plus creation timestamp.</summary>
public abstract class Entity
{
    public Guid Id { get; init; } = Guid.CreateVersion7();

    /// <summary>Set by the persistence layer when the entity is first saved.</summary>
    public DateTimeOffset CreatedAt { get; set; }
}
