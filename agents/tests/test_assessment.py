import pytest
from langchain_core.runnables import RunnableLambda

from learner_agents.assessment.schemas import (
    AnsweredQuestion,
    Evaluation,
    GenerateRequest,
    GradeRequest,
    McqDraft,
    McqReplacements,
    McqVerdict,
    McqVerification,
    RatedSkill,
    ShortAnswerDraft,
    ShortAnswerGrade,
    SkillInsight,
    SkillQuestionsDraft,
    SkillTarget,
    SkillTargets,
)
from learner_agents.assessment.service import AssessmentModels, assessed_level, generate, grade
from learner_agents.core.context import GoalSummary

GOAL = GoalSummary(
    goal_type="professional",
    title="Become an AI engineer",
    target_outcome="Ship LLM features",
    motivation="Team adopting AI",
    hours_per_week=6,
    learning_style="hands_on",
    budget="free_only",
    skills=["Python", "RAG", "Kubernetes"],
)


def returns(value):
    async def run(_):
        if isinstance(value, Exception):
            raise value
        return value

    return RunnableLambda(run)


def in_turn(*values):
    """Returns (or raises) the values one call at a time; `.calls` counts the calls."""
    remaining = list(values)

    async def run(_):
        runnable.calls += 1
        value = remaining.pop(0)
        if isinstance(value, Exception):
            raise value
        return value

    runnable = RunnableLambda(run)
    runnable.calls = 0
    return runnable


def mcq(prompt: str = "Which option is right about x?", key: int = 2) -> McqDraft:
    return McqDraft(prompt=prompt, options=["a", "b", "c", "d"], correct_index=key)


def questions_draft(skill_hint: str = "x") -> SkillQuestionsDraft:
    return SkillQuestionsDraft(
        multiple_choice=[mcq(f"Question {n}: which option is right about {skill_hint}?") for n in (1, 2, 3)],
        short_answer=ShortAnswerDraft(prompt=f"Explain {skill_hint} in your own words.", rubric="Mentions the key idea clearly."),
    )


def verdicts(*answers: int, ambiguous: tuple[int, ...] = ()) -> McqVerification:
    """The verifier's answer per question, in order; `ambiguous` lists question numbers it flags."""
    return McqVerification(
        verdicts=[McqVerdict(number=n, answer_index=a, flawed=n in ambiguous) for n, a in enumerate(answers, start=1)]
    )


def models(targets=None, questions=None, evaluation=None, verifier=None, replacements=None) -> AssessmentModels:
    return AssessmentModels(
        targets=returns(targets or SkillTargets(targets=[])),
        questions=returns(questions or questions_draft()),
        verifier=verifier or returns(verdicts(2, 2, 2)),  # agrees with every key
        replacements=replacements or returns(McqReplacements(multiple_choice=[])),
        evaluation=returns(evaluation or Evaluation(short_answers=[], skills=[])),
    )


@pytest.mark.parametrize(
    ("rating", "score", "level"),
    [(4, 0.9, 4), (4, 0.75, 4), (4, 0.5, 3), (4, 0.2, 2), (2, 0.1, 1), (1, None, 1), (3, None, 1)],
)
def test_assessed_level_from_self_rating_and_score(rating, score, level):
    assert assessed_level(rating, score) == level


async def test_generate_skips_untested_skills_and_defaults_missing_targets():
    request = GenerateRequest(
        goal=GOAL,
        skills=[RatedSkill(skill="Python", self_rating=4), RatedSkill(skill="RAG", self_rating=2), RatedSkill(skill="Kubernetes", self_rating=1)],
    )
    targets = SkillTargets(targets=[SkillTarget(skill="python", target_level=4)])

    result = await generate(request, models(targets=targets))

    assert {t.skill: t.target_level for t in result.targets} == {"Python": 4, "RAG": 3, "Kubernetes": 3}
    assert {q.skill for q in result.questions} == {"Python", "RAG"}  # Kubernetes self-rated 1: not tested
    assert [q.kind for q in result.questions if q.skill == "Python"] == ["multiple_choice"] * 3 + ["short_answer"]
    mcq = result.questions[0]
    assert mcq.options == ["a", "b", "c", "d"] and mcq.answer_key == "2"


async def test_generate_survives_failed_target_call():
    request = GenerateRequest(goal=GOAL, skills=[RatedSkill(skill="Python", self_rating=3)])

    result = await generate(request, models(targets=RuntimeError("bad output")))

    assert result.targets[0].target_level == 3


PYTHON_ONLY = GenerateRequest(goal=GOAL, skills=[RatedSkill(skill="Python", self_rating=3)])


def mcq_prompts(result) -> list[str]:
    return [q.prompt for q in result.questions if q.kind == "multiple_choice"]


async def test_verified_questions_are_kept_as_drafted():
    replacements = in_turn()

    result = await generate(PYTHON_ONLY, models(verifier=returns(verdicts(2, 2, 2)), replacements=replacements))

    assert mcq_prompts(result) == [q.prompt for q in questions_draft().multiple_choice]
    assert [q.kind for q in result.questions][-1] == "short_answer"
    assert replacements.calls == 0


async def test_disputed_question_is_regenerated_once_in_place():
    verifier = in_turn(verdicts(2, 0, 2), verdicts(1))  # disputes question 2, then accepts its replacement
    replacement = mcq("Replacement: which option is right about x?", key=1)
    replacements = in_turn(McqReplacements(multiple_choice=[replacement]))

    result = await generate(PYTHON_ONLY, models(verifier=verifier, replacements=replacements))

    prompts = mcq_prompts(result)
    assert prompts == [questions_draft().multiple_choice[0].prompt, replacement.prompt, questions_draft().multiple_choice[2].prompt]
    assert result.questions[1].answer_key == "1"
    assert (replacements.calls, verifier.calls) == (1, 2)


async def test_still_disputed_question_is_dropped():
    verifier = in_turn(verdicts(2, 2, 2, ambiguous=(3,)), verdicts(3))  # question 3 ambiguous; replacement key wrong
    replacements = in_turn(McqReplacements(multiple_choice=[mcq("Replacement: which option is right about x?", key=1)]))

    result = await generate(PYTHON_ONLY, models(verifier=verifier, replacements=replacements))

    assert mcq_prompts(result) == [q.prompt for q in questions_draft().multiple_choice[:2]]
    assert len(result.questions) == 3  # 2 MCQs + the short answer
    assert replacements.calls == 1


async def test_dropping_keeps_the_two_least_disputed_questions():
    # Every question and replacement is disputed; flagged-but-agreeing ones beat outright disagreements.
    verifier = in_turn(verdicts(0, 2, 0, ambiguous=(2,)), verdicts(0, 0, 2, ambiguous=(3,)))
    rewrites = [mcq(f"Rewrite {n}: which option is right about x?") for n in (1, 2, 3)]
    replacements = in_turn(McqReplacements(multiple_choice=rewrites))

    result = await generate(PYTHON_ONLY, models(verifier=verifier, replacements=replacements))

    assert mcq_prompts(result) == [questions_draft().multiple_choice[1].prompt, rewrites[2].prompt]


async def test_verifier_failure_keeps_unverified_questions(caplog):
    replacements = in_turn()

    result = await generate(PYTHON_ONLY, models(verifier=returns(RuntimeError("verifier down")), replacements=replacements))

    assert mcq_prompts(result) == [q.prompt for q in questions_draft().multiple_choice]
    assert replacements.calls == 0
    assert "keeping them unverified" in caplog.text


async def test_failed_rewrite_still_drops_the_disputed_question():
    verifier = in_turn(verdicts(1, 2, 2))
    replacements = in_turn(RuntimeError("rewrite failed"))

    result = await generate(PYTHON_ONLY, models(verifier=verifier, replacements=replacements))

    assert mcq_prompts(result) == [q.prompt for q in questions_draft().multiple_choice[1:]]


def answered(id_: str, skill: str, kind: str, answer: str | None, key: str = "1") -> AnsweredQuestion:
    options = ["a", "b", "c", "d"] if kind == "multiple_choice" else None
    return AnsweredQuestion(id=id_, skill=skill, kind=kind, prompt="Question text here", options=options, answer_key=key, answer=answer)


async def test_grade_scores_choices_exactly_and_short_answers_by_model():
    request = GradeRequest(
        goal=GOAL,
        skills=[RatedSkill(skill="Python", self_rating=4), RatedSkill(skill="Kubernetes", self_rating=1)],
        questions=[
            answered("q1", "Python", "multiple_choice", "1"),
            answered("q2", "Python", "multiple_choice", "1"),
            answered("q3", "Python", "multiple_choice", "0"),
            answered("q4", "Python", "short_answer", "Generators yield lazily", key="Explains lazy evaluation"),
        ],
    )
    evaluation = Evaluation(
        short_answers=[ShortAnswerGrade(id="q4", score=1, feedback="Spot on.")],
        skills=[
            SkillInsight(skill="python", strengths=["Knows generators"], gaps=["Typing"], summary="Solid."),
            SkillInsight(skill="Kubernetes", gaps=["Invented gap"]),
        ],
    )

    result = await grade(request, models(evaluation=evaluation))

    by_id = {g.id: g for g in result.grades}
    assert [by_id[i].score for i in ("q1", "q2", "q3", "q4")] == [1, 1, 0, 1]
    assert by_id["q3"].feedback == "The answer was: b"
    python, kubernetes = result.skills
    assert (python.score, python.assessed_level, python.strengths) == (0.75, 4, ["Knows generators"])
    assert (kubernetes.score, kubernetes.assessed_level) == (None, 1)
    assert kubernetes.gaps == ["New to this skill"]


async def test_empty_short_answer_scores_zero_even_if_model_is_generous():
    request = GradeRequest(
        goal=GOAL,
        skills=[RatedSkill(skill="Python", self_rating=3)],
        questions=[answered("q1", "Python", "short_answer", "   ", key="rubric")],
    )
    evaluation = Evaluation(short_answers=[ShortAnswerGrade(id="q1", score=1, feedback="Great")], skills=[])

    result = await grade(request, models(evaluation=evaluation))

    assert result.grades[0].score == 0
    assert result.skills[0].assessed_level == 1


async def test_grade_still_works_when_evaluation_fails():
    request = GradeRequest(
        goal=GOAL,
        skills=[RatedSkill(skill="Python", self_rating=3)],
        questions=[answered("q1", "Python", "multiple_choice", "1"), answered("q2", "Python", "short_answer", "something", key="rubric")],
    )

    result = await grade(request, models(evaluation=RuntimeError("model down")))

    assert [g.score for g in result.grades] == [1, 0.5]
    assert result.skills[0].assessed_level == 3


async def test_insights_match_shortened_skill_names():
    request = GradeRequest(
        goal=GOAL,
        skills=[RatedSkill(skill="Basic watercolor techniques (wet-on-wet, dry brush)", self_rating=3)],
        questions=[answered("q1", "Basic watercolor techniques (wet-on-wet, dry brush)", "multiple_choice", "1")],
    )
    evaluation = Evaluation(short_answers=[], skills=[SkillInsight(skill="Basic watercolor techniques", gaps=["Dry brush control"])])

    result = await grade(request, models(evaluation=evaluation))

    assert result.skills[0].gaps == ["Dry brush control"]
