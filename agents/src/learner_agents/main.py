"""FastAPI entry point for the internal agents service (Asta, assessment, planner)."""

import logging

from fastapi import FastAPI

from learner_agents.asta.router import router as asta_router
from learner_agents.core.auth import ServiceTokenMiddleware
from learner_agents.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = FastAPI(title="learner.io agents", docs_url="/docs", redoc_url=None)
    app.add_middleware(ServiceTokenMiddleware, token=settings.agent_service_token.get_secret_value())

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # Feature routers (assessment and planner are registered here as they land).
    app.include_router(asta_router)
    return app
