"""Service configuration: environment variables, then agents/.env, then the repo-root .env shared with the API."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

_AGENTS_DIR = Path(__file__).resolve().parents[3]
# Absolute paths, so the service finds them from any working directory. Later files win.
ENV_FILES = (_AGENTS_DIR.parent / ".env", _AGENTS_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILES, env_file_encoding="utf-8", extra="ignore")

    groq_api_key: SecretStr
    # Comma-separated Groq model IDs, in fallback order. Empty = use DEFAULT_MODEL_CHAIN.
    groq_model_chain: str = ""
    groq_request_timeout_s: float = 60.0

    # Shared secret the C# API sends in X-Service-Token; this service is internal-only.
    agent_service_token: SecretStr
    database_url: str
    port: int = 8001
    # The plan worker runs inside the API process; tests turn it off.
    run_worker: bool = True
    worker_poll_seconds: float = 2.0

    @property
    def model_chain(self) -> list[str]:
        return [m.strip() for m in self.groq_model_chain.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
