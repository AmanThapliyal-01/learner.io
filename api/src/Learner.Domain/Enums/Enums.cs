namespace Learner.Domain.Enums;

// Stored as strings in Postgres so the Python agents service can read them without a lookup.

public enum GoalType { Professional, Personal }

public enum GoalStatus { Chatting, Rating, Assessing, Confirmed, Archived }

public enum ChatRole { User, Assistant, Tool }

public enum AssessmentStatus { Pending, InProgress, Completed }

public enum QuestionKind { MultipleChoice, ShortAnswer }

public enum PlanStatus { Queued, Generating, Ready, Failed, Archived }

public enum JobStatus { Queued, Running, Succeeded, Failed }
