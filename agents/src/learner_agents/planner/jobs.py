"""The Postgres job queue the API writes to (queue.jobs) and the plan rows the worker fills in (plans.plans).

The schema is owned by the API's EF Core migrations; enum values are stored as their C# names.
"""

import asyncio
import json
from dataclasses import dataclass
from typing import Any, Literal, Protocol

import psycopg
from psycopg.rows import dict_row

PLAN_JOB_TYPE = "generate_plan"
# A Running job whose lock is older than this is assumed abandoned (worker crashed) and picked up again.
STALE_LOCK = "10 minutes"

# The last planner step that finished; done/total count detailed phases (total is 0 until the outline exists).
ProgressStep = Literal["reading", "outlining", "detailing", "assembling"]


@dataclass(frozen=True)
class ClaimedJob:
    id: str
    payload: dict[str, Any]
    attempts: int


class JobStore(Protocol):
    async def claim(self) -> ClaimedJob | None: ...
    async def mark_generating(self, plan_id: str) -> None: ...
    async def set_progress(self, plan_id: str, step: ProgressStep, done: int, total: int) -> None: ...
    async def complete(self, job: ClaimedJob, plan_id: str, content: dict[str, Any]) -> None: ...
    async def retry_later(self, job: ClaimedJob, error: str, *, count_attempt: bool = True) -> None: ...
    async def fail(self, job: ClaimedJob, plan_id: str | None, error: str) -> None: ...


class PostgresJobStore:
    """Sync psycopg run in worker threads: psycopg's async mode can't use Windows' default event loop."""

    def __init__(self, database_url: str) -> None:
        self._url = database_url

    async def _run(self, sql: str, params: tuple[Any, ...] = (), *, fetch: bool = False) -> dict[str, Any] | None:
        def work() -> dict[str, Any] | None:
            with psycopg.connect(self._url, row_factory=dict_row) as conn:
                row = conn.execute(sql, params).fetchone() if fetch else (conn.execute(sql, params), None)[1]
                conn.commit()
                return row

        return await asyncio.to_thread(work)

    async def claim(self) -> ClaimedJob | None:
        row = await self._run(
            f"""
            UPDATE queue.jobs SET status = 'Running', attempts = attempts + 1, locked_at = now()
            WHERE id = (
                SELECT id FROM queue.jobs
                WHERE type = %s AND (status = 'Queued' OR (status = 'Running' AND locked_at < now() - interval '{STALE_LOCK}'))
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1)
            RETURNING id, payload, attempts
            """,
            (PLAN_JOB_TYPE,),
            fetch=True,
        )
        if row is None:
            return None
        payload = row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"])
        return ClaimedJob(id=str(row["id"]), payload=payload, attempts=row["attempts"])

    async def mark_generating(self, plan_id: str) -> None:
        await self._run(
            # Each attempt starts its steps afresh.
            "UPDATE plans.plans SET status = 'Generating', error = NULL, progress = NULL "
            "WHERE id = %s AND status IN ('Queued', 'Generating', 'Failed')",
            (plan_id,),
        )

    async def set_progress(self, plan_id: str, step: ProgressStep, done: int, total: int) -> None:
        # Only while generating, so a late write can't leave progress on a ready, failed or archived plan.
        await self._run(
            "UPDATE plans.plans SET progress = %s::jsonb WHERE id = %s AND status = 'Generating'",
            (json.dumps({"step": step, "done": done, "total": total}), plan_id),
        )

    async def complete(self, job: ClaimedJob, plan_id: str, content: dict[str, Any]) -> None:
        await self._run(
            """
            WITH plan AS (
                UPDATE plans.plans SET status = 'Ready', content = %s::jsonb, generated_at = now(), error = NULL, progress = NULL
                WHERE id = %s AND status <> 'Archived')
            UPDATE queue.jobs SET status = 'Succeeded', completed_at = now(), locked_at = NULL, last_error = NULL
            WHERE id = %s
            """,
            (json.dumps(content), plan_id, job.id),
        )

    async def retry_later(self, job: ClaimedJob, error: str, *, count_attempt: bool = True) -> None:
        await self._run(
            "UPDATE queue.jobs SET status = 'Queued', locked_at = NULL, last_error = %s, attempts = attempts - %s WHERE id = %s",
            (error[:2000], 0 if count_attempt else 1, job.id),
        )

    async def fail(self, job: ClaimedJob, plan_id: str | None, error: str) -> None:
        await self._run(
            """
            WITH plan AS (
                UPDATE plans.plans SET status = 'Failed', error = %s, progress = NULL WHERE id = %s AND status <> 'Archived')
            UPDATE queue.jobs SET status = 'Failed', completed_at = now(), locked_at = NULL, last_error = %s WHERE id = %s
            """,
            ("We couldn't build your plan this time.", plan_id, error[:2000], job.id),
        )
