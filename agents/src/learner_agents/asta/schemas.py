"""Request and goal schemas for Asta, the goal-clarifying chat agent."""

from typing import Literal

from pydantic import BaseModel, Field, ValidationError

GoalType = Literal["professional", "personal"]
LearningStyle = Literal["video", "reading", "hands_on", "mixed"]
Budget = Literal["free_only", "paid_ok"]


class ProfileContext(BaseModel):
    """What the user told us during onboarding. Everything is optional."""

    full_name: str | None = None
    country: str | None = None
    age_range: str | None = None
    current_status: str | None = None
    profession: str | None = None
    years_of_experience: int | None = None
    education: str | None = None
    certifications: list[str] = []
    skills: list[str] = []
    hobbies: list[str] = []
    professional_summary: str | None = None


class GoalSummary(BaseModel):
    """The confirmed goal shown on the summary card and handed to the planning agent."""

    goal_type: GoalType
    title: str = Field(min_length=3, max_length=100)
    target_outcome: str = Field(min_length=3, max_length=400)
    motivation: str = Field(min_length=2, max_length=300)
    hours_per_week: int = Field(ge=1, le=60)
    timeline: str | None = Field(default=None, max_length=100)
    learning_style: LearningStyle
    budget: Budget
    skills: list[str] = Field(min_length=1, max_length=6)
    current_experience: str = Field(default="", max_length=400)


class GoalDraft(BaseModel):
    """What the conversation has established so far. A field stays null until the user has actually said it."""

    goal_type: GoalType | None = Field(default=None, description="professional for career or job goals, personal for hobbies")
    title: str | None = Field(default=None, description="Short goal title, e.g. 'Become an AI engineer'")
    target_outcome: str | None = Field(default=None, description="What success looks like, in the user's terms")
    motivation: str | None = Field(default=None, description="Why the user wants this now")
    hours_per_week: int | None = Field(default=None, description="Hours per week; for a range use the lower number")
    timeline: str | None = Field(default=None, description="Deadline or timeframe the user gave")
    timeline_discussed: bool = Field(default=False, description="True if the user gave a timeline or said there's no deadline")
    learning_style: LearningStyle | None = Field(
        default=None, description="videos=video, books/docs=reading, projects/practice=hands_on, a combination=mixed"
    )
    budget: Budget | None = Field(default=None, description="free resources only=free_only, willing to pay=paid_ok")
    skills: list[str] = Field(
        default_factory=list,
        description="Skills to assess: listed by the user, or proposed by Asta and not rejected by the user. Max 6.",
    )
    current_experience: str | None = Field(default=None, description="Relevant things the user already knows")
    user_asked_question: bool = Field(
        default=False, description="True if the user's latest message asks Asta something that needs an answer"
    )

    def missing(self) -> list[str]:
        """Plain-language names of the items Asta still has to find out, in the order it should ask."""
        checks = [
            (self.target_outcome and self.goal_type, "what exactly they want to achieve"),
            (self.motivation, "why they want it now"),
            (self.hours_per_week, "hours per week"),
            (self.timeline_discussed, "a timeline or deadline (no deadline is fine)"),
            (self.learning_style, "learning style: video, reading, hands-on or mixed"),
            (self.budget, "budget: free resources only or paid is OK"),
            (self.skills, "which skills to assess (propose up to 6)"),
        ]
        return [label for known, label in checks if not known]

    def to_summary(self) -> GoalSummary | None:
        """The card, once everything is known."""
        if self.missing():
            return None
        try:
            return GoalSummary.model_validate(
                {
                    **self.model_dump(exclude={"timeline_discussed", "user_asked_question"}),
                    "title": self.title or (self.target_outcome or "")[:100],
                    "skills": self.skills[:6],
                    "current_experience": self.current_experience or "",
                }
            )
        except ValidationError:
            return None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)
    # The goal summary card shown in this assistant turn, so the models know what the user is reacting to.
    goal_summary: GoalSummary | None = None


class AstaRequest(BaseModel):
    profile: ProfileContext = ProfileContext()
    messages: list[ChatTurn] = Field(min_length=1, max_length=80)
