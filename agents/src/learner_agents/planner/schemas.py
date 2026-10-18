"""The planner's input (a queued job's payload) and the plan document it produces."""

from typing import Literal

from pydantic import BaseModel, Field

from learner_agents.core.context import GoalSummary, ProfileContext

SkillStatusKind = Literal["skip", "refresh", "focus"]
ResourceKind = Literal["course", "docs", "video", "book", "project", "article", "community"]


class SkillAssessment(BaseModel):
    skill: str
    self_rating: int = Field(ge=1, le=5)
    assessed_level: int = Field(ge=1, le=5)
    target_level: int = Field(ge=1, le=5)
    strengths: list[str] = []
    gaps: list[str] = []


class PlanRequest(BaseModel):
    """Everything the planner needs, captured by the API when the job is queued."""

    plan_id: str
    goal: GoalSummary
    profile: ProfileContext = ProfileContext()
    skills: list[SkillAssessment] = Field(min_length=1, max_length=6)


# ---- Model outputs ----------------------------------------------------------------------------
# No length caps here: Groq rejects a whole tool call if one field breaks the schema. Sizes are trimmed in code.


class PhaseOutline(BaseModel):
    title: str
    weeks: int = Field(ge=1, le=16)
    focus_skills: list[str] = Field(min_length=1)
    aim: str = Field(description="One sentence: what this phase achieves")


class PlanOutline(BaseModel):
    summary: str = Field(description="Two or three sentences on how the plan gets the user to their goal")
    starting_point: str = Field(description="Where the user starts, from the assessment")
    phases: list[PhaseOutline] = Field(min_length=2, description="2 to 6 phases")


class Resource(BaseModel):
    title: str = Field(description="A real, well-known resource; no URLs")
    kind: ResourceKind
    free: bool
    why: str = Field(description="Why it fits this phase")


class PhaseDetail(BaseModel):
    objectives: list[str] = Field(min_length=1, description="2 to 5 objectives")
    topics: list[str] = Field(min_length=1, description="3 to 8 topics, in order")
    practice: str = Field(description="A concrete practice task or mini-project")
    milestone: str = Field(description="'You're done with this phase when ...'")
    resources: list[Resource] = Field(min_length=1, description="2 to 4 resources")


# ---- The document stored on the plan ----------------------------------------------------------


class SkillStatus(BaseModel):
    skill: str
    current_level: int
    target_level: int
    status: SkillStatusKind
    note: str


class Phase(PhaseOutline, PhaseDetail):
    pass


class PlanDocument(BaseModel):
    summary: str
    starting_point: str
    total_weeks: int
    hours_per_week: int
    skills: list[SkillStatus]
    phases: list[Phase]
