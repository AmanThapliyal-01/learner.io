from fastapi.testclient import TestClient
from pydantic import SecretStr

from learner_agents.core.auth import SERVICE_TOKEN_HEADER
from learner_agents.core.config import Settings
from learner_agents.main import create_app

TOKEN = "test-token"


def client() -> TestClient:
    settings = Settings(
        groq_api_key=SecretStr("unused"),
        agent_service_token=SecretStr(TOKEN),
        database_url="postgresql://unused",
        run_worker=False,
    )
    app = create_app(settings)

    @app.get("/internal-probe")
    async def probe() -> dict[str, bool]:
        return {"ok": True}

    return TestClient(app)


def test_health_is_public():
    assert client().get("/health").json() == {"status": "ok"}


def test_other_routes_require_service_token():
    c = client()
    assert c.get("/internal-probe").status_code == 401
    assert c.get("/internal-probe", headers={SERVICE_TOKEN_HEADER: "wrong"}).status_code == 401
    assert c.get("/internal-probe", headers={SERVICE_TOKEN_HEADER: TOKEN}).json() == {"ok": True}
