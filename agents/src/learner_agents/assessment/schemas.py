"""Assessment: questions pitched at the user's self-rating, then graded into an assessed level per skill."""

from typing import Literal

from pydantic import BaseModel, Field

from learner_agents.core.context import GoalSummary, ProfileContext

Level = int  # 1 never used, 2 beginner, 3 intermediate, 4 advanced, 5 expert
QuestionKind = Literal["multiple_choice", "short_answer"]

LEVEL_NAMES = {1: "never used it", 2: "beginner", 3: "intermediate", 4: "advanced", 5: "expert"}


class RatedSkill(BaseModel):
    skill: str = Field(max_length=120)
    self_rating: Level = Field(ge=1, le=5)


# ---- Generation -------------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    goal: GoalSummary
    profile: ProfileContext = ProfileContext()
    skills: list[RatedSkill] = Field(min_length=1, max_length=6)


class SkillTarget(BaseModel):
    skill: str
    target_level: Level = Field(ge=1, le=5, description="Level this goal needs in the skill")


class SkillTargets(BaseModel):
    """LLM output: what level the goal needs, per skill."""

    targets: list[SkillTarget]


# Model outputs carry no string length caps: Groq rejects the whole tool call if one field breaks the schema.


class McqDraft(BaseModel):
    prompt: str = Field(min_length=10)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)


class ShortAnswerDraft(BaseModel):
    prompt: str = Field(min_length=10)
    rubric: str = Field(min_length=10, description="What a full-credit answer must cover")


class SkillQuestionsDraft(BaseModel):
    """LLM output: one skill's questions."""

    multiple_choice: list[McqDraft] = Field(min_length=3, max_length=3)
    short_answer: ShortAnswerDraft


class Question(BaseModel):
    skill: str
    kind: QuestionKind
    prompt: str
    options: list[str] | None = None
    # MCQ: index of the correct option as a string. Short answer: the grading rubric. Never shown to the user.
    answer_key: str


class GenerateResponse(BaseModel):
    targets: list[SkillTarget]
    questions: list[Question]


# ---- Grading ----------------------------------------------------------------------------------


class AnsweredQuestion(Question):
    id: str
    answer: str | None = None


class GradeRequest(BaseModel):
    goal: GoalSummary
    skills: list[RatedSkill] = Field(min_length=1, max_length=6)
    questions: list[AnsweredQuestion] = Field(max_length=60)


class ShortAnswerGrade(BaseModel):
    id: str
    score: float = Field(ge=0, le=1, description="0 = wrong or empty, 0.5 = partly right, 1 = fully right")
    feedback: str = Field(description="One sentence: what was right or missing")


class SkillInsight(BaseModel):
    skill: str
    strengths: list[str] = Field(default_factory=list, description="Up to 3")
    gaps: list[str] = Field(default_factory=list, description="Up to 3")
    summary: str = Field(default="", description="One line")


class Evaluation(BaseModel):
    """LLM output: short-answer grades and per-skill strengths and gaps."""

    short_answers: list[ShortAnswerGrade]
    skills: list[SkillInsight]


class QuestionGrade(BaseModel):
    id: str
    score: float
    feedback: str


class SkillResult(BaseModel):
    skill: str
    self_rating: Level
    assessed_level: Level
    score: float | None  # share of points earned; None when the skill was skipped (self-rated 1)
    strengths: list[str]
    gaps: list[str]
    summary: str


class GradeResponse(BaseModel):
    grades: list[QuestionGrade]
    skills: list[SkillResult]
