"""Builds the skill check and grades it. Levels are computed in code from scores, never guessed by a model."""

import asyncio
import logging
from dataclasses import dataclass
from functools import lru_cache

from langchain_core.language_models import LanguageModelInput
from langchain_core.runnables import Runnable

from learner_agents.assessment.prompts import evaluation_messages, questions_messages, targets_messages
from learner_agents.assessment.schemas import (
    Evaluation,
    GenerateRequest,
    GenerateResponse,
    GradeRequest,
    GradeResponse,
    Level,
    Question,
    QuestionGrade,
    RatedSkill,
    SkillQuestionsDraft,
    SkillResult,
    SkillTarget,
    SkillInsight,
    SkillTargets,
)
from learner_agents.core.context import GoalSummary
from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.core.llm.structured import structured_model

logger = logging.getLogger(__name__)

# Skills self-rated 1 ("never used it") aren't tested: there's nothing to check.
UNTESTED_RATING = 1
# Two skills at a time keeps a 6-skill check fast without blowing one model's tokens-per-minute budget.
GENERATION_CONCURRENCY = 2
DEFAULT_TARGET_LEVEL = 3


@dataclass(frozen=True)
class AssessmentModels:
    targets: Runnable[LanguageModelInput, SkillTargets]
    questions: Runnable[LanguageModelInput, SkillQuestionsDraft]
    evaluation: Runnable[LanguageModelInput, Evaluation]


@lru_cache
def assessment_models() -> AssessmentModels:
    return AssessmentModels(
        targets=structured_model(SkillTargets, model_ids=["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]),
        questions=structured_model(SkillQuestionsDraft, temperature=0.5),
        evaluation=structured_model(Evaluation, temperature=0),
    )


def assessed_level(self_rating: Level, score: float | None) -> Level:
    """Questions are pitched at the self-rating: mostly right confirms it, half right drops a level, less drops two."""
    if self_rating == UNTESTED_RATING or score is None:
        return 1
    if score >= 0.75:
        return self_rating
    if score >= 0.4:
        return max(1, self_rating - 1)
    return max(1, self_rating - 2)


# ---- Generation -------------------------------------------------------------------------------


async def _targets(request: GenerateRequest, models: AssessmentModels) -> list[SkillTarget]:
    try:
        result = await models.targets.ainvoke(targets_messages(request))
        by_skill = {t.skill.lower(): t.target_level for t in result.targets}
    except Exception:
        logger.exception("Target levels failed; using the default")
        by_skill = {}
    return [SkillTarget(skill=s.skill, target_level=by_skill.get(s.skill.lower(), DEFAULT_TARGET_LEVEL)) for s in request.skills]


async def _questions_for(goal: GoalSummary, skill: RatedSkill, models: AssessmentModels, gate: asyncio.Semaphore) -> list[Question]:
    async with gate:
        draft = await models.questions.ainvoke(questions_messages(goal, skill))
    questions = [
        Question(skill=skill.skill, kind="multiple_choice", prompt=q.prompt, options=q.options, answer_key=str(q.correct_index))
        for q in draft.multiple_choice
    ]
    questions.append(
        Question(skill=skill.skill, kind="short_answer", prompt=draft.short_answer.prompt, answer_key=draft.short_answer.rubric)
    )
    return questions


async def generate(request: GenerateRequest, models: AssessmentModels) -> GenerateResponse:
    gate = asyncio.Semaphore(GENERATION_CONCURRENCY)
    tested = [s for s in request.skills if s.self_rating > UNTESTED_RATING]
    targets, *per_skill = await asyncio.gather(
        _targets(request, models), *(_questions_for(request.goal, s, models, gate) for s in tested)
    )
    return GenerateResponse(targets=targets, questions=[q for group in per_skill for q in group])


# ---- Grading ----------------------------------------------------------------------------------


def _key(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def _match(insights: dict[str, SkillInsight], skill: str) -> SkillInsight | None:
    """Models often shorten skill names ("Basic watercolor techniques" for "... (wet-on-wet, dry brush)")."""
    key = _key(skill)
    if key in insights:
        return insights[key]
    return next((v for k, v in insights.items() if k and (key.startswith(k) or k.startswith(key))), None)


async def grade(request: GradeRequest, models: AssessmentModels) -> GradeResponse:
    grades: dict[str, QuestionGrade] = {}

    # Multiple choice: exact, no model needed.
    for q in request.questions:
        if q.kind != "multiple_choice" or q.options is None:
            continue
        correct = q.answer == q.answer_key
        grades[q.id] = QuestionGrade(
            id=q.id,
            score=1.0 if correct else 0.0,
            feedback="Correct." if correct else f"The answer was: {q.options[int(q.answer_key)]}",
        )

    # Short answers and per-skill insights: one model call. Empty answers score 0 regardless.
    try:
        evaluation = await models.evaluation.ainvoke(evaluation_messages(request))
    except AllModelsExhaustedError:
        raise
    except Exception:
        logger.exception("Evaluation failed; grading without written feedback")
        evaluation = Evaluation(short_answers=[], skills=[])
    short = {g.id: g for g in evaluation.short_answers}
    for q in request.questions:
        if q.kind != "short_answer":
            continue
        if not (q.answer or "").strip():
            grades[q.id] = QuestionGrade(id=q.id, score=0.0, feedback="No answer given.")
        elif q.id in short:
            g = short[q.id]
            grades[q.id] = QuestionGrade(id=q.id, score=g.score, feedback=g.feedback)
        else:
            logger.warning("Evaluation skipped short answer %s; scoring it half", q.id)
            grades[q.id] = QuestionGrade(id=q.id, score=0.5, feedback="We couldn't grade this one in detail.")

    insights = {_key(i.skill): i for i in evaluation.skills}
    results: list[SkillResult] = []
    for skill in request.skills:
        scores = [grades[q.id].score for q in request.questions if q.skill == skill.skill and q.id in grades]
        score = sum(scores) / len(scores) if scores else None
        # Untested skills (self-rated 1) get fixed wording: there are no answers to draw insights from.
        insight = _match(insights, skill.skill) if score is not None else None
        results.append(
            SkillResult(
                skill=skill.skill,
                self_rating=skill.self_rating,
                assessed_level=assessed_level(skill.self_rating, score),
                score=None if score is None else round(score, 2),
                strengths=insight.strengths[:3] if insight else [],
                gaps=insight.gaps[:3] if insight else ([] if score is not None else ["New to this skill"]),
                summary=insight.summary if insight else ("Not tested: you said you haven't used it yet." if score is None else ""),
            )
        )
    return GradeResponse(grades=[grades[q.id] for q in request.questions if q.id in grades], skills=results)
