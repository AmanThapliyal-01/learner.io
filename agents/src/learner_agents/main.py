"""FastAPI entry point for the internal agents service (Asta, assessment, planner)."""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from learner_agents.assessment.router import router as assessment_router
from learner_agents.asta.router import router as asta_router
from learner_agents.core.auth import ServiceTokenMiddleware
from learner_agents.core.config import Settings, get_settings
from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.planner.graph import build_planner, planner_models
from learner_agents.planner.jobs import PostgresJobStore
from learner_agents.planner.worker import run_worker


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if not settings.run_worker:
            yield
            return
        stop = asyncio.Event()
        store = PostgresJobStore(settings.database_url)
        worker = asyncio.create_task(run_worker(store, build_planner(planner_models()), stop, settings.worker_poll_seconds))
        try:
            yield
        finally:
            stop.set()
            await worker

    app = FastAPI(title="learner.io agents", docs_url="/docs", redoc_url=None, lifespan=lifespan)
    app.add_middleware(ServiceTokenMiddleware, token=settings.agent_service_token.get_secret_value())

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(AllModelsExhaustedError)
    async def rate_limited(_: Request, error: AllModelsExhaustedError) -> JSONResponse:
        retry_at = datetime.fromtimestamp(error.retry_at, UTC).isoformat() if error.retry_at else None
        return JSONResponse(status_code=503, content={"code": "rate_limited", "retry_at": retry_at})

    app.include_router(asta_router)
    app.include_router(assessment_router)
    return app
