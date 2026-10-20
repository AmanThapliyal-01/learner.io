"""Request and goal schemas for Asta, the goal-clarifying chat agent."""

from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from learner_agents.core.context import Budget, GoalSummary, GoalType, LearningStyle, ProfileContext
from learner_agents.core.text import plain

__all__ = ["AstaRequest", "ChatTurn", "ChecklistItem", "GoalDraft", "GoalSummary", "ProfileContext"]


class ChecklistItem(BaseModel):
    label: str
    done: bool


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

    def _checks(self) -> list[tuple[bool, str, str]]:
        """Each item the card needs: (known, how Asta asks about it, how the user sees it), in asking order."""
        return [
            (bool(self.target_outcome and self.goal_type), "what exactly they want to achieve", "Goal"),
            (bool(self.motivation), "why they want it now", "Why now"),
            (bool(self.hours_per_week), "hours per week", "Hours a week"),
            (self.timeline_discussed, "a timeline or deadline (no deadline is fine)", "Timeline"),
            (bool(self.learning_style), "learning style: video, reading, hands-on or mixed", "Learning style"),
            (bool(self.budget), "budget: free resources only or paid is OK", "Budget"),
            (bool(self.skills), "which skills to assess (propose up to 6)", "Skills to check"),
        ]

    def missing(self) -> list[str]:
        """Plain-language names of the items Asta still has to find out, in the order it should ask."""
        return [ask for known, ask, _ in self._checks() if not known]

    def checklist(self) -> list["ChecklistItem"]:
        """What the user sees beside the chat: the same items, settled or not, so they know how close the card is."""
        return [ChecklistItem(label=label, done=known) for known, _, label in self._checks()]

    def to_summary(self) -> GoalSummary | None:
        """The card, once everything is known."""
        if self.missing():
            return None
        try:
            return GoalSummary.model_validate(
                {
                    **self.model_dump(exclude={"timeline_discussed", "user_asked_question"}),
                    "title": plain(self.title or (self.target_outcome or "")[:100]),
                    "skills": list(dict.fromkeys(plain(s) for s in self.skills if plain(s)))[:6],
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
