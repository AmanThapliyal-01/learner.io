from typing import Any

from langchain_core.runnables import RunnableLambda

from learner_agents.core.context import GoalSummary
from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.planner.graph import PlannerModels, build_planner, generate_plan, skill_statuses
from learner_agents.planner.jobs import ClaimedJob
from learner_agents.planner.schemas import PhaseDetail, PhaseOutline, PlanOutline, PlanRequest, Resource, SkillAssessment
from learner_agents.planner.worker import MAX_ATTEMPTS, process_job

GOAL = GoalSummary(
    goal_type="professional",
    title="Become an AI engineer",
    target_outcome="Ship LLM features",
    motivation="Team adopting AI",
    hours_per_week=6,
    timeline="3 months",
    learning_style="hands_on",
    budget="free_only",
    skills=["Python", "RAG", "Evals"],
)

REQUEST = PlanRequest(
    plan_id="11111111-1111-1111-1111-111111111111",
    goal=GOAL,
    skills=[
        SkillAssessment(skill="Python", self_rating=4, assessed_level=4, target_level=4),
        SkillAssessment(skill="RAG", self_rating=2, assessed_level=2, target_level=3, gaps=["Chunking"]),
        SkillAssessment(skill="Evals", self_rating=1, assessed_level=1, target_level=4),
    ],
)

OUTLINE = PlanOutline(
    summary="Build on your Python to ship RAG features with evals.",
    starting_point="Python is covered.",
    phases=[
        PhaseOutline(title="RAG basics", weeks=4, focus_skills=["RAG"], aim="Build a first RAG app"),
        PhaseOutline(title="Evals", weeks=5, focus_skills=["Evals"], aim="Measure quality"),
    ],
)


def detail(paid_too: bool = False) -> PhaseDetail:
    resources = [
        Resource(title="Official docs", kind="docs", free=True, why="Reference"),
        Resource(title="Free course", kind="course", free=True, why="Guided"),
    ]
    if paid_too:
        resources.append(Resource(title="Paid bootcamp", kind="course", free=False, why="Structured"))
    return PhaseDetail(
        objectives=["Do A", "Do B"],
        topics=["T1", "T2", "T3"],
        practice="Build a small project",
        milestone="You're done with this phase when it works",
        resources=resources,
    )


def models(outline: Any = OUTLINE, details: Any = None) -> PlannerModels:
    calls: list[int] = []

    async def run_outline(_):
        if isinstance(outline, Exception):
            raise outline
        return outline

    async def run_detail(_):
        calls.append(1)
        return details or detail(paid_too=True)

    return PlannerModels(outline=RunnableLambda(run_outline), details=(RunnableLambda(run_detail),))


def test_skill_statuses_follow_the_gap():
    assert [s.status for s in skill_statuses(REQUEST)] == ["skip", "refresh", "focus"]


async def test_planner_details_every_phase_and_assembles_the_document():
    document = await generate_plan(build_planner(models()), REQUEST)

    assert [p.title for p in document.phases] == ["RAG basics", "Evals"]
    assert document.total_weeks == 9
    assert document.hours_per_week == 6
    assert [s.status for s in document.skills] == ["skip", "refresh", "focus"]
    assert document.phases[0].objectives == ["Do A", "Do B"]


async def test_free_only_budget_drops_paid_resources():
    document = await generate_plan(build_planner(models()), REQUEST)

    assert all(r.free for phase in document.phases for r in phase.resources)


class MemoryStore:
    def __init__(self, progress_error: Exception | None = None) -> None:
        self.events: list[tuple[str, Any]] = []
        self.progress: list[tuple[str, int, int]] = []
        self._progress_error = progress_error

    async def claim(self):
        return None

    async def mark_generating(self, plan_id):
        self.events.append(("generating", plan_id))

    async def set_progress(self, plan_id, step, done, total):
        if self._progress_error:
            raise self._progress_error
        self.progress.append((step, done, total))

    async def complete(self, job, plan_id, content):
        self.events.append(("complete", content))

    async def retry_later(self, job, error, *, count_attempt=True):
        self.events.append(("retry", count_attempt))

    async def fail(self, job, plan_id, error):
        self.events.append(("fail", plan_id))


def job(attempts: int = 1, payload: dict | None = None) -> ClaimedJob:
    return ClaimedJob(id="job-1", payload=payload or REQUEST.model_dump(mode="json"), attempts=attempts)


async def test_successful_job_stores_the_plan():
    store = MemoryStore()

    assert await process_job(job(), store, build_planner(models())) is None

    kinds = [kind for kind, _ in store.events]
    assert kinds == ["generating", "complete"]
    assert store.events[1][1]["total_weeks"] == 9


async def test_job_reports_each_finished_step_in_order():
    store = MemoryStore()

    await process_job(job(), store, build_planner(models()))

    assert store.progress == [
        ("reading", 0, 0),
        ("outlining", 0, 2),
        ("detailing", 1, 2),
        ("detailing", 2, 2),
        ("assembling", 2, 2),
    ]


async def test_parallel_details_are_counted_as_they_finish():
    import asyncio

    # Phase 1 finishes before phase 0: the count still climbs 1, 2 and the phases keep their order.
    async def run_outline(_):
        return OUTLINE

    async def slow_detail(_):
        await asyncio.sleep(0.05)
        return detail()

    async def fast_detail(_):
        return detail().model_copy(update={"practice": "fast"})

    planner = build_planner(PlannerModels(outline=RunnableLambda(run_outline), details=(RunnableLambda(slow_detail), RunnableLambda(fast_detail))))
    store = MemoryStore()

    await process_job(job(), store, planner)

    assert [p for p in store.progress if p[0] == "detailing"] == [("detailing", 1, 2), ("detailing", 2, 2)]
    assert [p["practice"] for p in store.events[-1][1]["phases"]] == ["Build a small project", "fast"]


async def test_a_failed_progress_write_never_fails_the_job():
    store = MemoryStore(progress_error=RuntimeError("database down"))

    await process_job(job(), store, build_planner(models()))

    assert [kind for kind, _ in store.events] == ["generating", "complete"]


async def test_streamed_plan_matches_a_single_invoke():
    planner = build_planner(models())

    streamed = await generate_plan(planner, REQUEST)
    invoked = (await planner.ainvoke({"request": REQUEST}))["document"]

    assert streamed == invoked


async def test_failed_job_is_retried_until_attempts_run_out():
    planner = build_planner(models(outline=RuntimeError("bad output")))

    early, last = MemoryStore(), MemoryStore()
    await process_job(job(attempts=1), early, planner)
    await process_job(job(attempts=MAX_ATTEMPTS), last, planner)

    assert early.events[-1] == ("retry", True)
    assert last.events[-1] == ("fail", REQUEST.plan_id)


async def test_long_rate_limit_pauses_job_without_using_an_attempt():
    store = MemoryStore()
    # A daily-limit style wait (far beyond what a node waits out) bubbles up to the worker.
    planner = build_planner(models(outline=AllModelsExhaustedError(retry_at=1_900_000_000.0, last_error=None)))

    pause_until = await process_job(job(), store, planner)

    assert pause_until == 1_900_000_000.0
    assert store.events[-1] == ("retry", False)


async def test_invalid_payload_fails_immediately():
    store = MemoryStore()

    await process_job(job(payload={"plan_id": "p-1", "goal": {}}), store, build_planner(models()))

    assert store.events == [("fail", "p-1")]


async def test_patiently_waits_out_short_rate_limits():
    import time

    from learner_agents.core.llm.patience import patiently

    attempts, waited = [], []

    async def flaky():
        attempts.append(1)
        if len(attempts) < 3:
            raise AllModelsExhaustedError(retry_at=time.time() + 5, last_error=None)
        return "done"

    async def fake_sleep(seconds):
        waited.append(seconds)

    assert await patiently(flaky, sleep=fake_sleep) == "done"
    assert len(waited) == 2 and all(5 <= w <= 6 for w in waited)
