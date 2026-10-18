"""Builds the skill check and grades it. Levels are computed in code from scores, never guessed by a model."""

import asyncio
import logging
from dataclasses import dataclass
from functools import lru_cache

from langchain_core.language_models import LanguageModelInput
from langchain_core.runnables import Runnable

from learner_agents.assessment.prompts import (
    evaluation_messages,
    questions_messages,
    replacement_messages,
    targets_messages,
    verification_messages,
)
from learner_agents.assessment.schemas import (
    Evaluation,
    GenerateRequest,
    GenerateResponse,
    GradeRequest,
    GradeResponse,
    Level,
    McqDraft,
    McqReplacements,
    McqVerdict,
    McqVerification,
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
from learner_agents.core.llm.models import rotated_chain
from learner_agents.core.llm.structured import structured_model

logger = logging.getLogger(__name__)

# Skills self-rated 1 ("never used it") aren't tested: there's nothing to check.
UNTESTED_RATING = 1
# Two skills at a time keeps a 6-skill check fast without blowing one model's tokens-per-minute budget. Drafting and
# verifying start on different models, so each gets its own two slots: verifying one skill overlaps drafting the next.
GENERATION_CONCURRENCY = 2
DEFAULT_TARGET_LEVEL = 3
# Dropping disputed questions never leaves a skill with fewer than this many multiple-choice questions.
MIN_MCQS_PER_SKILL = 2
# A slow verifier or rewrite gives up and keeps what we have, so checking keys never stalls the skill check.
VERIFY_TIMEOUT_S = 12.0


@dataclass(frozen=True)
class _Gates:
    draft: asyncio.Semaphore
    verify: asyncio.Semaphore


@dataclass(frozen=True)
class AssessmentModels:
    targets: Runnable[LanguageModelInput, SkillTargets]
    questions: Runnable[LanguageModelInput, SkillQuestionsDraft]
    verifier: Runnable[LanguageModelInput, McqVerification]
    replacements: Runnable[LanguageModelInput, McqReplacements]
    evaluation: Runnable[LanguageModelInput, Evaluation]


@lru_cache
def assessment_models() -> AssessmentModels:
    return AssessmentModels(
        targets=structured_model(SkillTargets, model_ids=["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]),
        questions=structured_model(SkillQuestionsDraft, temperature=0.5),
        # Starts on a different model than the drafter: a second opinion, on its own tokens-per-minute budget.
        verifier=structured_model(McqVerification, model_ids=rotated_chain(1), temperature=0),
        replacements=structured_model(McqReplacements, temperature=0.5),
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


async def _verify(
    goal: GoalSummary, skill: RatedSkill, mcqs: list[McqDraft], models: AssessmentModels, gates: _Gates
) -> list[McqVerdict | None] | None:
    """The verifier's verdict per question (None where it gave none), or None if the call failed."""
    try:
        async with gates.verify:
            result = await asyncio.wait_for(models.verifier.ainvoke(verification_messages(goal, skill, mcqs)), VERIFY_TIMEOUT_S)
    except Exception as error:
        logger.warning("Verifying %s questions failed (%r); keeping them unverified", skill.skill, error)
        return None
    by_number = {v.number: v for v in result.verdicts}
    return [by_number.get(n) for n in range(1, len(mcqs) + 1)]


def _dispute(mcq: McqDraft, verdict: McqVerdict | None) -> int:
    """0 = no dispute (or unverified), 1 = verifier agrees but calls it ambiguous, 2 = verifier picked another answer."""
    if verdict is None:
        return 0
    if verdict.answer_index != mcq.correct_index:
        return 2
    return 1 if verdict.flawed else 0


async def _replace(
    goal: GoalSummary, skill: RatedSkill, disputed: list[tuple[McqDraft, McqVerdict]], models: AssessmentModels, gates: _Gates
) -> list[McqDraft]:
    try:
        async with gates.draft:
            result = await asyncio.wait_for(models.replacements.ainvoke(replacement_messages(goal, skill, disputed)), VERIFY_TIMEOUT_S)
    except Exception as error:
        logger.warning("Replacing disputed %s questions failed (%r)", skill.skill, error)
        return []
    return result.multiple_choice[: len(disputed)]


async def _checked_mcqs(
    goal: GoalSummary, skill: RatedSkill, mcqs: list[McqDraft], models: AssessmentModels, gates: _Gates
) -> list[McqDraft]:
    """Keys are checked by a second model. A disputed question is rewritten once, then dropped if still disputed,
    as long as MIN_MCQS_PER_SKILL remain; any failure along the way keeps what we have rather than blocking."""
    verdicts = await _verify(goal, skill, mcqs, models, gates)
    if verdicts is None:
        return mcqs
    disputes = [_dispute(q, v) for q, v in zip(mcqs, verdicts)]
    disputed = [i for i, d in enumerate(disputes) if d]
    if not disputed:
        return mcqs
    pairs: list[tuple[McqDraft, McqVerdict]] = []
    for i in disputed:
        verdict = verdicts[i]
        assert verdict is not None  # only a verdict can dispute a question
        logger.info(
            "Disputed %s question (key %d, verifier %d): %s",
            skill.skill, mcqs[i].correct_index, verdict.answer_index, verdict.reason[:200],
        )
        pairs.append((mcqs[i], verdict))

    replacements = await _replace(goal, skill, pairs, models, gates)
    replacement_verdicts = await _verify(goal, skill, replacements, models, gates) if replacements else []
    if replacement_verdicts is None:
        # The re-check failed: keep the replacements, fresh questions are as good as any unverified draft.
        replacement_verdicts = [None] * len(replacements)

    slots: list[McqDraft | None] = [None if d else q for q, d in zip(mcqs, disputes)]
    fallbacks: list[tuple[int, int, McqDraft]] = [(disputes[i], i, mcqs[i]) for i in disputed]  # (dispute, slot, question)
    for i, replacement, verdict in zip(disputed, replacements, replacement_verdicts):
        if (dispute := _dispute(replacement, verdict)) == 0:
            slots[i] = replacement
        else:
            fallbacks.append((dispute, i, replacement))

    # Too few left: put back the least-disputed questions.
    for dispute, i, mcq in sorted(fallbacks, key=lambda f: f[0]):
        if sum(s is not None for s in slots) >= MIN_MCQS_PER_SKILL:
            break
        if slots[i] is None:
            slots[i] = mcq
    kept = [s for s in slots if s is not None]
    if len(kept) < len(mcqs):
        logger.warning("Dropped %d disputed %s question(s)", len(mcqs) - len(kept), skill.skill)
    return kept


async def _questions_for(goal: GoalSummary, skill: RatedSkill, models: AssessmentModels, gates: _Gates) -> list[Question]:
    async with gates.draft:
        draft = await models.questions.ainvoke(questions_messages(goal, skill))
    mcqs = await _checked_mcqs(goal, skill, draft.multiple_choice, models, gates)
    questions = [
        Question(skill=skill.skill, kind="multiple_choice", prompt=q.prompt, options=q.options, answer_key=str(q.correct_index))
        for q in mcqs
    ]
    questions.append(
        Question(skill=skill.skill, kind="short_answer", prompt=draft.short_answer.prompt, answer_key=draft.short_answer.rubric)
    )
    return questions


async def generate(request: GenerateRequest, models: AssessmentModels) -> GenerateResponse:
    gates = _Gates(draft=asyncio.Semaphore(GENERATION_CONCURRENCY), verify=asyncio.Semaphore(GENERATION_CONCURRENCY))
    tested = [s for s in request.skills if s.self_rating > UNTESTED_RATING]
    targets, *per_skill = await asyncio.gather(
        _targets(request, models), *(_questions_for(request.goal, s, models, gates) for s in tested)
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
