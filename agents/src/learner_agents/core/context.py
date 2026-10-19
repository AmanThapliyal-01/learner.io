"""Shared context every agent works from: who the user is and what goal they confirmed."""

from typing import Literal

from pydantic import BaseModel, Field

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
