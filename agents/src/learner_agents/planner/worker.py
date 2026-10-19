"""Background worker: claims plan jobs from the queue, runs the planner graph, and writes the result."""

import asyncio
import logging
import time
from typing import Any

from langgraph.graph.state import CompiledStateGraph
from pydantic import ValidationError

from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.planner.graph import generate_plan
from learner_agents.planner.jobs import ClaimedJob, JobStore, ProgressStep
from learner_agents.planner.schemas import PlanRequest

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
PLAN_TIMEOUT_S = 300
PROGRESS_WRITE_TIMEOUT_S = 5

# The step each graph node finishes (PRD FR-24: the UI ticks only what Anbu has actually done).
NODE_STEPS: dict[str, ProgressStep] = {"assess": "reading", "outline": "outlining", "detail": "detailing", "assemble": "assembling"}


class ProgressReporter:
    """Turns planner node updates into plan progress. Best-effort: a failed write is logged, never fatal or retried."""

    def __init__(self, store: JobStore, plan_id: str) -> None:
        self._store, self._plan_id = store, plan_id
        self._done = self._total = 0

    async def __call__(self, node: str, update: dict[str, Any]) -> None:
        step = NODE_STEPS.get(node)
        if step is None:
            return
        if node == "outline":
            self._total = len(update["outline"].phases)
        elif node == "detail":
            self._done += 1  # details run in parallel, so count completions rather than trust an index
        try:
            await asyncio.wait_for(self._store.set_progress(self._plan_id, step, self._done, self._total), PROGRESS_WRITE_TIMEOUT_S)
        except Exception as error:
            logger.warning("Couldn't record progress %s for plan %s: %r", step, self._plan_id, error)


async def process_job(job: ClaimedJob, store: JobStore, planner: CompiledStateGraph) -> float | None:
    """Runs one job. Returns an epoch time to pause the worker until (all models rate-limited), else None."""
    try:
        request = PlanRequest.model_validate(job.payload)
    except ValidationError as error:
        logger.error("Plan job %s has an invalid payload: %s", job.id, error)
        await store.fail(job, job.payload.get("plan_id"), f"invalid payload: {error}")
        return None

    await store.mark_generating(request.plan_id)
    started = time.monotonic()
    try:
        document = await asyncio.wait_for(generate_plan(planner, request, ProgressReporter(store, request.plan_id)), timeout=PLAN_TIMEOUT_S)
    except AllModelsExhaustedError as error:
        # Nobody's fault: put it back without using up an attempt, and pause until a model frees up.
        logger.warning("Plan job %s paused: all models rate-limited", job.id)
        await store.retry_later(job, "rate limited", count_attempt=False)
        return error.retry_at or time.time() + 60
    except Exception as error:
        logger.exception("Plan job %s failed (attempt %s of %s)", job.id, job.attempts, MAX_ATTEMPTS)
        if job.attempts < MAX_ATTEMPTS:
            await store.retry_later(job, repr(error))
        else:
            await store.fail(job, request.plan_id, repr(error))
        return None

    await store.complete(job, request.plan_id, document.model_dump(mode="json"))
    logger.info("Plan %s ready in %.1fs (%s phases)", request.plan_id, time.monotonic() - started, len(document.phases))
    return None


async def run_worker(store: JobStore, planner: CompiledStateGraph, stop: asyncio.Event, poll_seconds: float = 2.0) -> None:
    logger.info("Plan worker started")
    while not stop.is_set():
        try:
            job = await store.claim()
        except Exception:
            logger.exception("Couldn't claim a job; retrying shortly")
            job = None
        if job is None:
            await _sleep(stop, poll_seconds)
            continue

        pause_until = await process_job(job, store, planner)
        if pause_until is not None:
            await _sleep(stop, max(0.0, pause_until - time.time()))
    logger.info("Plan worker stopped")


async def _sleep(stop: asyncio.Event, seconds: float) -> None:
    try:
        await asyncio.wait_for(stop.wait(), timeout=seconds)
    except TimeoutError:
        pass
