"""Background worker: claims plan jobs from the queue, runs the planner graph, and writes the result."""

import asyncio
import logging
import time

from langgraph.graph.state import CompiledStateGraph
from pydantic import ValidationError

from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.planner.graph import generate_plan
from learner_agents.planner.jobs import ClaimedJob, JobStore
from learner_agents.planner.schemas import PlanRequest

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
PLAN_TIMEOUT_S = 300


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
        document = await asyncio.wait_for(generate_plan(planner, request), timeout=PLAN_TIMEOUT_S)
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
